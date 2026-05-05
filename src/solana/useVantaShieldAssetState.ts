import { useCallback, useEffect, useState } from "react";
import { useSolanaClient } from "@solana/react-hooks";
import { useWalletState } from "@/data/context/WalletContext";
import {
  createUnshieldConsumedNoteReferenceHash,
  fetchLocallyReleasedSolNoteReferenceHashes,
  fetchLocallyReleasedUnshieldNoteReferenceHashes,
} from "@/solana/operatorStateClient";
import { loadRecoveredNativeSolShieldNotes } from "@/solana/recoveredNativeSolShieldNotes";
import { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";
import {
  fetchVantaShieldAccountState,
  type VantaShieldAccountState,
  type VantaShieldNote,
  type VantaShieldedSolNote,
} from "@/solana/vantaShieldState";

type VantaShieldAssetStateResult = {
  account: VantaShieldAccountState | null;
  error: string | null;
  isReady: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

export function useVantaShieldAssetState(args: {
  includeLocallyReleasedSolNotes?: boolean;
  mintAddress: string | null;
  unshieldOperatorUrl?: string | null;
  vaultOwner: string | null;
}): VantaShieldAssetStateResult {
  const client = useSolanaClient();
  const { walletAddress, walletConnected } = useWalletState();
  const viewingKey = useVantaShieldViewingKey();
  const [account, setAccount] = useState<VantaShieldAccountState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!walletConnected || !walletAddress || !args.mintAddress || !args.vaultOwner) {
      setAccount(null);
      setError(null);
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const [
        nextAccount,
        locallyReleasedSolNoteReferenceHashes,
        locallyReleasedTokenNoteReferenceHashes,
      ] = await Promise.all([
        fetchVantaShieldAccountState({
          client,
          mintAddress: args.mintAddress,
          owner: walletAddress,
          vaultOwner: args.vaultOwner,
          viewingSecretKey: viewingKey?.secretKey,
        }),
        args.includeLocallyReleasedSolNotes
          ? fetchLocallyReleasedSolNoteReferenceHashes().catch(() => new Set<string>())
          : Promise.resolve(new Set<string>()),
        args.unshieldOperatorUrl
          ? fetchLocallyReleasedUnshieldNoteReferenceHashes(args.unshieldOperatorUrl)
          : Promise.resolve(new Set<string>()),
      ]);
      const accountWithRecoveredSolNotes = mergeRecoveredNativeSolShieldNotes(
        nextAccount,
        loadRecoveredNativeSolShieldNotes({
          owner: walletAddress,
          vaultOwner: args.vaultOwner,
        }),
      );
      const accountWithReleasedTokenNotes = reconcileLocallyReleasedShieldNotes(
        accountWithRecoveredSolNotes,
        locallyReleasedTokenNoteReferenceHashes,
      );
      setAccount(
        args.includeLocallyReleasedSolNotes
          ? reconcileLocallyReleasedSolNotes(
              accountWithReleasedTokenNotes,
              locallyReleasedSolNoteReferenceHashes,
            )
          : accountWithReleasedTokenNotes,
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to load Vanta shield state from mainnet.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [
    args.includeLocallyReleasedSolNotes,
    args.mintAddress,
    args.unshieldOperatorUrl,
    args.vaultOwner,
    client,
    viewingKey?.secretKey,
    walletAddress,
    walletConnected,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    account,
    error,
    isReady: Boolean(walletConnected && walletAddress && args.mintAddress && args.vaultOwner),
    isRefreshing,
    refresh,
  };
}

function reconcileLocallyReleasedShieldNotes(
  account: VantaShieldAccountState,
  locallyReleasedNoteReferenceHashes: Set<string>,
): VantaShieldAccountState {
  if (locallyReleasedNoteReferenceHashes.size === 0) {
    return account;
  }

  const keepSpendableNote = (note: VantaShieldNote) => {
    return !locallyReleasedNoteReferenceHashes.has(createUnshieldConsumedNoteReferenceHash(note.noteId));
  };
  const spendableShieldNotes = account.spendableShieldNotes.filter(keepSpendableNote);
  const locallyReleasedNotes = account.spendableShieldNotes.filter((note) =>
    locallyReleasedNoteReferenceHashes.has(createUnshieldConsumedNoteReferenceHash(note.noteId)),
  );
  const spentShieldNotes = [...account.spentShieldNotes, ...locallyReleasedNotes].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  const noteStates = account.noteStates.map((noteState) =>
    locallyReleasedNoteReferenceHashes.has(createUnshieldConsumedNoteReferenceHash(noteState.noteId))
      ? {
          ...noteState,
          consumedByTransitionKind: "unshield" as const,
          lifecycleStatus: "consumed" as const,
        }
      : noteState,
  );
  const noteStatusSummary = {
    changeDerived: noteStates.filter((note) => note.sourceType === "change_derived").length,
    consumed: noteStates.filter((note) => note.lifecycleStatus === "consumed").length,
    swapDerived: noteStates.filter((note) => note.sourceType === "swap_derived").length,
    spendable: noteStates.filter((note) => note.lifecycleStatus === "spendable").length,
    total: noteStates.length,
  };
  const balance = Number(
    spendableShieldNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(6),
  );

  return {
    ...account,
    balance,
    noteStates,
    noteStatusSummary,
    spendableShieldNotes,
    spentShieldNotes,
  };
}

function mergeRecoveredNativeSolShieldNotes(
  account: VantaShieldAccountState,
  recoveredNotes: readonly VantaShieldedSolNote[],
): VantaShieldAccountState {
  if (recoveredNotes.length === 0) {
    return account;
  }

  const existingDepositSignatures = new Set(
    account.shieldedSolNotes
      .map((note) => note.depositSignature)
      .filter((signature): signature is string => Boolean(signature)),
  );
  const existingNoteIds = new Set(account.shieldedSolNotes.map((note) => note.noteId));
  const nextRecoveredNotes = recoveredNotes.filter(
    (note) =>
      !existingNoteIds.has(note.noteId) &&
      (!note.depositSignature || !existingDepositSignatures.has(note.depositSignature)),
  );

  if (nextRecoveredNotes.length === 0) {
    return account;
  }

  const shieldedSolNotes = [...account.shieldedSolNotes, ...nextRecoveredNotes].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  const spendableShieldedSolNotes = shieldedSolNotes.filter(
    (note) => note.lifecycleStatus === "spendable",
  );
  const consumedShieldedSolNotes = shieldedSolNotes.filter(
    (note) => note.lifecycleStatus === "consumed",
  );
  const shieldedSolBalance = Number(
    spendableShieldedSolNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(9),
  );

  return {
    ...account,
    consumedShieldedSolNotes,
    shieldedSolBalance,
    shieldedSolNotes,
    spendableShieldedSolNotes,
  };
}

function reconcileLocallyReleasedSolNotes(
  account: VantaShieldAccountState,
  locallyReleasedSolNoteReferenceHashes: Set<string>,
): VantaShieldAccountState {
  if (locallyReleasedSolNoteReferenceHashes.size === 0) {
    return account;
  }

  const keepSpendableSolNote = (note: VantaShieldedSolNote) => {
    return !locallyReleasedSolNoteReferenceHashes.has(
      createUnshieldConsumedNoteReferenceHash(note.noteId),
    );
  };
  const spendableShieldedSolNotes = account.spendableShieldedSolNotes.filter(keepSpendableSolNote);
  const consumedShieldedSolNotes = [
    ...account.consumedShieldedSolNotes,
    ...account.spendableShieldedSolNotes
      .filter((note) =>
        locallyReleasedSolNoteReferenceHashes.has(
          createUnshieldConsumedNoteReferenceHash(note.noteId),
        ),
      )
      .map((note) => ({
        ...note,
        consumedByTransitionKind: "sol_unshield" as const,
        lifecycleStatus: "consumed" as const,
      })),
  ].sort((left, right) => right.createdAt - left.createdAt);
  const shieldedSolNotes = [...spendableShieldedSolNotes, ...consumedShieldedSolNotes].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  const shieldedSolBalance = Number(
    spendableShieldedSolNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(9),
  );

  return {
    ...account,
    consumedShieldedSolNotes,
    shieldedSolBalance,
    shieldedSolNotes,
    spendableShieldedSolNotes,
  };
}

import { useCallback, useEffect, useState } from "react";
import { useSolanaClient } from "@solana/react-hooks";
import { useWalletState } from "@/data/context/WalletContext";
import { fetchLocallyReleasedSolNoteIds } from "@/solana/operatorStateClient";
import { loadRecoveredNativeSolShieldNotes } from "@/solana/recoveredNativeSolShieldNotes";
import { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";
import {
  fetchVantaShieldAccountState,
  type VantaShieldAccountState,
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
      const [nextAccount, locallyReleasedSolNoteIds] = await Promise.all([
        fetchVantaShieldAccountState({
          client,
          mintAddress: args.mintAddress,
          owner: walletAddress,
          vaultOwner: args.vaultOwner,
          viewingSecretKey: viewingKey?.secretKey,
        }),
        args.includeLocallyReleasedSolNotes
          ? fetchLocallyReleasedSolNoteIds().catch(() => new Set<string>())
          : Promise.resolve(new Set<string>()),
      ]);
      const accountWithRecoveredSolNotes = mergeRecoveredNativeSolShieldNotes(
        nextAccount,
        loadRecoveredNativeSolShieldNotes({
          owner: walletAddress,
          vaultOwner: args.vaultOwner,
        }),
      );
      setAccount(
        args.includeLocallyReleasedSolNotes
          ? reconcileLocallyReleasedSolNotes(accountWithRecoveredSolNotes, locallyReleasedSolNoteIds)
          : accountWithRecoveredSolNotes,
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
  locallyReleasedSolNoteIds: Set<string>,
): VantaShieldAccountState {
  if (locallyReleasedSolNoteIds.size === 0) {
    return account;
  }

  const keepSpendableSolNote = (note: VantaShieldedSolNote) => {
    return !locallyReleasedSolNoteIds.has(note.noteId);
  };
  const spendableShieldedSolNotes = account.spendableShieldedSolNotes.filter(keepSpendableSolNote);
  const consumedShieldedSolNotes = [
    ...account.consumedShieldedSolNotes,
    ...account.spendableShieldedSolNotes
      .filter((note) => locallyReleasedSolNoteIds.has(note.noteId))
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

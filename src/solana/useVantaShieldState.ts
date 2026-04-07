import { useCallback, useEffect, useState } from "react";
import { useSolanaClient } from "@solana/react-hooks";
import { useWalletState } from "@/context/WalletContext";
import { liveShieldAsset } from "@/solana/shieldConfig";
import { fetchLocallyReleasedSolNoteIds } from "@/solana/operatorStateClient";
import {
  fetchVantaShieldAccountState,
  type VantaShieldAccountState,
  type VantaShieldedSolNote,
} from "@/solana/vantaShieldState";

type VantaShieldStateResult = {
  account: VantaShieldAccountState | null;
  error: string | null;
  isReady: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

export function useVantaShieldState(): VantaShieldStateResult {
  const client = useSolanaClient();
  const { walletAddress, walletConnected } = useWalletState();
  const [account, setAccount] = useState<VantaShieldAccountState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (
      !walletConnected ||
      !walletAddress ||
      !liveShieldAsset.mintAddress ||
      !liveShieldAsset.vaultOwner
    ) {
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
          mintAddress: liveShieldAsset.mintAddress,
          owner: walletAddress,
          vaultOwner: liveShieldAsset.vaultOwner,
        }),
        fetchLocallyReleasedSolNoteIds().catch(() => new Set<string>()),
      ]);
      const reconciledAccount = reconcileLocallyReleasedSolNotes(
        nextAccount,
        locallyReleasedSolNoteIds,
      );
      setAccount(reconciledAccount);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to load Vanta shield state from devnet.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [client, walletAddress, walletConnected]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    account,
    error,
    isReady: Boolean(
      walletConnected &&
        walletAddress &&
        liveShieldAsset.mintAddress &&
        liveShieldAsset.vaultOwner,
    ),
    isRefreshing,
    refresh,
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

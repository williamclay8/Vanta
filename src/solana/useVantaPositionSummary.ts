import { useMemo } from "react";
import { useWalletState } from "@/data/context/WalletContext";
import { getPrimaryLiveShieldTokenAsset } from "@/solana/shieldConfig";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import type { VantaShieldedSolNote } from "@/solana/vantaShieldState";

export type VantaShieldedTokenPosition = {
  balance: number;
  noteCount: number;
  symbol: string;
};

export type VantaPositionSummary = {
  assetLabel: string;
  latestActionLabel: string;
  latestActionTimestamp: number | null;
  liveAsset: string;
  networkLabel: string;
  publicBalance: number;
  confirmedShieldedSolBalance: number;
  pendingRecoveredShieldedSolBalance: number;
  registryError: string | null;
  registryRefreshing: boolean;
  shieldedBalance: number;
  shieldedTokenPositions: VantaShieldedTokenPosition[];
  shieldedSolBalance: number;
  spendableShieldedSolNoteCount: number;
  spendableNoteCount: number;
  totalActionableNoteCount: number;
  statusLabel: string;
  swapCount: number;
  walletConnected: boolean;
};

export function useVantaPositionSummary(): VantaPositionSummary {
  const { clusterLabel, walletConnected } = useWalletState();
  const shieldRegistry = useVantaShieldAssetRegistryState();
  const primaryAsset = getPrimaryLiveShieldTokenAsset();
  const primaryEntry = shieldRegistry.byAssetKey[primaryAsset.assetKey];

  return useMemo(() => {
    const account = primaryEntry.account;
    const confirmedShieldedSolNotesByKey = new Map<string, VantaShieldedSolNote>();
    const pendingRecoveredShieldedSolNotesByKey = new Map<string, VantaShieldedSolNote>();
    for (const entry of shieldRegistry.entries) {
      for (const note of entry.account?.shieldedSolNotes ?? []) {
        const noteKey = note.depositSignature ? `deposit:${note.depositSignature}` : note.noteId;

        if (
          note.lifecycleStatus === "pending" &&
          note.stateSignature.startsWith("local-sol-recovery:") &&
          !confirmedShieldedSolNotesByKey.has(noteKey)
        ) {
          pendingRecoveredShieldedSolNotesByKey.set(noteKey, note);
        }
      }

      for (const note of entry.account?.spendableShieldedSolNotes ?? []) {
        const noteKey = note.depositSignature ? `deposit:${note.depositSignature}` : note.noteId;

        confirmedShieldedSolNotesByKey.set(noteKey, note);
        pendingRecoveredShieldedSolNotesByKey.delete(noteKey);
      }
    }
    const confirmedShieldedSolBalance = Number(
      [...confirmedShieldedSolNotesByKey.values()]
        .reduce((sum, note) => sum + note.amount, 0)
        .toFixed(9),
    );
    const pendingRecoveredShieldedSolBalance = Number(
      [...pendingRecoveredShieldedSolNotesByKey.values()]
        .reduce((sum, note) => sum + note.amount, 0)
        .toFixed(9),
    );
    const shieldedSolBalance = confirmedShieldedSolBalance;
    const spendableShieldedSolNoteCount = confirmedShieldedSolNotesByKey.size;
    const shieldedSolEntry =
      shieldRegistry.entries.find((entry) =>
        entry.account?.spendableShieldedSolNotes.some((note) =>
          confirmedShieldedSolNotesByKey.has(
            note.depositSignature ? `deposit:${note.depositSignature}` : note.noteId,
          ),
        ),
      ) ?? primaryEntry;
    const shieldedSolAccount = shieldedSolEntry.account;
    const publicBalance = primaryEntry.publicBalance;
    const registryError =
      primaryEntry.error ?? (shieldedSolEntry === primaryEntry ? null : shieldedSolEntry.error);
    const registryRefreshing = primaryEntry.isRefreshing || shieldedSolEntry.isRefreshing;
    const shieldedTokenPositions = shieldRegistry.entries
      .map((entry) => ({
        balance: entry.account?.balance ?? 0,
        noteCount: entry.account?.spendableShieldNotes.length ?? 0,
        symbol: entry.asset.symbol,
      }))
      .filter((position) => position.balance > 0 || position.noteCount > 0);
    const shieldedBalance = account?.balance ?? 0;
    const spendableNoteCount = shieldedTokenPositions.reduce(
      (sum, position) => sum + position.noteCount,
      0,
    );
    const totalActionableNoteCount = spendableNoteCount + spendableShieldedSolNoteCount;
    const swapCount = shieldRegistry.entries.reduce(
      (sum, entry) => sum + (entry.account?.swapNotes.length ?? 0),
      0,
    );
    const latestActivity =
      shieldedSolBalance > 0
        ? (shieldedSolAccount?.lifecycleActivities[0] ?? account?.lifecycleActivities[0] ?? null)
        : (account?.lifecycleActivities[0] ?? null);

    let statusLabel = `Connect a wallet to enter the live ${primaryAsset.symbol} path.`;

    if (walletConnected && !primaryAsset.configured) {
      statusLabel = `Live ${primaryAsset.symbol} path needs local mint and vault configuration.`;
    } else if (walletConnected && shieldedSolBalance > 0) {
      statusLabel =
        "Shielded SOL output is now present inside Vanta and can use the constrained SOL unshield lane.";
    } else if (walletConnected && pendingRecoveredShieldedSolBalance > 0) {
      statusLabel =
        "A recovered SOL deposit is pending shield-state reconciliation before it becomes spendable.";
    } else if (walletConnected && spendableNoteCount > 0) {
      const symbols = shieldedTokenPositions.map((position) => position.symbol).join(", ");
      statusLabel = symbols
        ? `Spendable shielded ${symbols} is available for Send, Swap, or Unshield.`
        : "Spendable shielded value is available for Send, Swap, or Unshield.";
    } else if (walletConnected && shieldedBalance > 0) {
      statusLabel = `Shielded ${primaryAsset.symbol} is present, but no spendable note is currently available.`;
    } else if (walletConnected && publicBalance > 0) {
      statusLabel = `Public ${primaryAsset.symbol} is available to Shield into Vanta.`;
    } else if (walletConnected) {
      statusLabel = `No live ${primaryAsset.symbol} is currently available in Public Wallet.`;
    }

    return {
      assetLabel: primaryAsset.name,
      latestActionLabel: latestActivity
        ? latestActivity.amountLabel
          ? `${latestActivity.title} ${latestActivity.amountLabel}`
          : `${latestActivity.title} ${latestActivity.amount.toFixed(2)} ${primaryAsset.symbol}`
        : "No resolved lifecycle activity yet",
      latestActionTimestamp: latestActivity?.createdAt ?? null,
      liveAsset: primaryAsset.symbol,
      networkLabel: clusterLabel,
      confirmedShieldedSolBalance,
      pendingRecoveredShieldedSolBalance,
      publicBalance,
      registryError,
      registryRefreshing,
      shieldedBalance,
      shieldedTokenPositions,
      shieldedSolBalance,
      spendableShieldedSolNoteCount,
      spendableNoteCount,
      statusLabel,
      swapCount,
      totalActionableNoteCount,
      walletConnected,
    } satisfies VantaPositionSummary;
  }, [clusterLabel, primaryAsset, primaryEntry, shieldRegistry.entries, walletConnected]);
}

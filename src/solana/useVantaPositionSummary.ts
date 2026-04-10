import { useMemo } from "react";
import { useSplToken } from "@solana/react-hooks";
import { useWalletState } from "@/data/context/WalletContext";
import { liveShieldAsset, SHIELD_HOOK_FALLBACK_MINT } from "@/solana/shieldConfig";
import { useVantaShieldState } from "@/solana/useVantaShieldState";

export type VantaPositionSummary = {
  assetLabel: string;
  latestActionLabel: string;
  latestActionTimestamp: number | null;
  liveAsset: "VUSD";
  networkLabel: string;
  publicBalance: number;
  shieldedBalance: number;
  shieldedSolBalance: number;
  spendableNoteCount: number;
  statusLabel: string;
  swapCount: number;
  walletConnected: boolean;
};

export function useVantaPositionSummary(): VantaPositionSummary {
  const { clusterLabel, walletConnected } = useWalletState();
  const { account } = useVantaShieldState();
  const supportedToken = useSplToken(
    liveShieldAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT,
    { config: { tokenProgram: "auto" } },
  );

  return useMemo(() => {
    const publicBalance = Number(supportedToken.balance?.uiAmount ?? "0");
    const shieldedBalance = account?.balance ?? 0;
    const shieldedSolBalance = account?.shieldedSolBalance ?? 0;
    const spendableNoteCount = account?.spendableShieldNotes.length ?? 0;
    const swapCount = account?.swapNotes.length ?? 0;
    const latestActivity = account?.lifecycleActivities[0] ?? null;

    let statusLabel = "Connect a wallet to enter the live VUSD path.";

    if (walletConnected && !liveShieldAsset.configured) {
      statusLabel = "Live VUSD path needs local mint and vault configuration.";
    } else if (walletConnected && shieldedSolBalance > 0) {
      statusLabel =
        "Shielded SOL output is now present inside Vanta and can use the constrained SOL unshield lane.";
    } else if (walletConnected && spendableNoteCount > 0) {
      statusLabel = "Spendable shielded value is available for Send, Swap, or Unshield.";
    } else if (walletConnected && shieldedBalance > 0) {
      statusLabel =
        "Shielded VUSD is present, but no spendable note is currently available.";
    } else if (walletConnected && publicBalance > 0) {
      statusLabel = "Public VUSD is available to Shield into Vanta.";
    } else if (walletConnected) {
      statusLabel = "No live VUSD is currently available in Public Wallet.";
    }

    return {
      assetLabel: liveShieldAsset.name,
      latestActionLabel: latestActivity
        ? latestActivity.amountLabel
          ? `${latestActivity.title} ${latestActivity.amountLabel}`
          : `${latestActivity.title} ${latestActivity.amount.toFixed(2)} VUSD`
        : "No resolved lifecycle activity yet",
      latestActionTimestamp: latestActivity?.createdAt ?? null,
      liveAsset: liveShieldAsset.symbol,
      networkLabel: clusterLabel,
      publicBalance,
      shieldedBalance,
      shieldedSolBalance,
      spendableNoteCount,
      statusLabel,
      swapCount,
      walletConnected,
    } satisfies VantaPositionSummary;
  }, [
    account,
    clusterLabel,
    supportedToken.balance?.uiAmount,
    walletConnected,
  ]);
}

import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getPrimaryLiveShieldTokenAsset } from "@/solana/shieldConfig";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import { useVantaPositionSummary } from "@/solana/useVantaPositionSummary";

export type VantaNextStepGuidance = {
  ctaHref: string | null;
  ctaLabel: string | null;
  emphasisLabel: string;
  message: string;
};

export function useVantaNextStepGuidance(): VantaNextStepGuidance {
  const location = useLocation();
  const summary = useVantaPositionSummary();
  const shieldRegistry = useVantaShieldAssetRegistryState();
  const primaryAsset = getPrimaryLiveShieldTokenAsset();
  const account = shieldRegistry.byAssetKey[primaryAsset.assetKey].account;

  return useMemo(() => {
    const latestActivity = account?.lifecycleActivities[0] ?? null;
    const isShieldPage = location.pathname.startsWith("/app/shield");
    const isSendPage = location.pathname.startsWith("/app/send");
    const isSwapPage = location.pathname.startsWith("/app/swap");
    const isUnshieldPage = location.pathname.startsWith("/app/unshield");

    if (!summary.walletConnected) {
      return {
        ctaHref: null,
        ctaLabel: null,
        emphasisLabel: "Wallet connection required",
        message: `Action: Connect wallet. Receipt: operator session verified.`,
      };
    }

    if (summary.publicBalance > 0 && summary.shieldedBalance === 0) {
      return {
        ctaHref: isShieldPage ? null : "/app/shield",
        ctaLabel: isShieldPage ? null : "Open Shield",
        emphasisLabel: `Shield ${summary.liveAsset} to begin`,
        message: `Action: Shield ${summary.liveAsset}. Receipt: first spendable note.`,
      };
    }

    if (summary.spendableNoteCount > 0 && latestActivity?.type === "shield") {
      return {
        ctaHref: isSwapPage ? "/app/send" : "/app/swap",
        ctaLabel: isSwapPage ? "Open Send" : "Open Swap",
        emphasisLabel: "Spendable note ready",
        message: `Action: Spend note. Receipt: Send/Swap/Unshield available.`,
      };
    }

    if (summary.spendableNoteCount > 0 && latestActivity?.type === "change_note_created") {
      return {
        ctaHref: isSwapPage ? "/app/unshield" : "/app/swap",
        ctaLabel: isSwapPage ? "Open Unshield" : "Open Swap",
        emphasisLabel: "Change note ready",
        message: `Action: Use change note. Receipt: Send/Swap/Unshield ready.`,
      };
    }

    if (latestActivity?.type === "swap") {
      return {
        ctaHref: isUnshieldPage ? "/app" : "/app/unshield",
        ctaLabel: isUnshieldPage ? "Open Home" : "Open Unshield",
        emphasisLabel: "Shielded SOL resolved",
        message: `Action: Unshield SOL. Receipt: public wallet restored.`,
      };
    }

    if (latestActivity?.type === "sol_unshield") {
      return {
        ctaHref: isShieldPage ? null : "/app/shield",
        ctaLabel: isShieldPage ? null : "Shield again",
        emphasisLabel: "SOL lane completed",
        message: `Action: SOL unshield complete. Receipt: public balance updated.`,
      };
    }

    if (summary.spendableNoteCount > 0) {
      return {
        ctaHref: isSwapPage ? "/app/unshield" : "/app/swap",
        ctaLabel: isSwapPage ? "Open Unshield" : "Open Swap",
        emphasisLabel: "Next constrained action available",
        message: `Action: Next spend. Receipt: Send/Swap/Unshield lanes open.`,
      };
    }

    if (latestActivity?.type === "unshield" && summary.publicBalance > 0) {
      return {
        ctaHref: isShieldPage ? null : "/app/shield",
        ctaLabel: isShieldPage ? null : "Shield again",
        emphasisLabel: "Public wallet restored",
        message: `Action: Public restored. Receipt: Shield to restart.`,
      };
    }

    if (summary.shieldedBalance > 0) {
      return {
        ctaHref: isUnshieldPage ? null : "/app/unshield",
        ctaLabel: isUnshieldPage ? null : "Open Unshield",
        emphasisLabel: "Shielded state present",
        message: `Action: Check notes. Receipt: no spendable note yet.`,
      };
    }

    return {
      ctaHref: isShieldPage ? null : "/app/shield",
      ctaLabel: isShieldPage ? null : "Open Shield",
      emphasisLabel: `Awaiting live ${summary.liveAsset}`,
        message: `Action: Acquire ${summary.liveAsset}. Receipt: Shield to start.`,
    };
  }, [
    account?.lifecycleActivities,
    location.pathname,
    summary.publicBalance,
    summary.shieldedBalance,
    summary.spendableNoteCount,
    summary.walletConnected,
  ]);
}

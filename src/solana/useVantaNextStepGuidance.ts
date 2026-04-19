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
        message: `Connect a wallet to begin the live constrained ${summary.liveAsset} lifecycle.`,
      };
    }

    if (summary.publicBalance > 0 && summary.shieldedBalance === 0) {
      return {
        ctaHref: isShieldPage ? null : "/app/shield",
        ctaLabel: isShieldPage ? null : "Open Shield",
        emphasisLabel: `Shield ${summary.liveAsset} to begin`,
        message: `Public ${summary.liveAsset} is available. Shield it into Vanta to create the first spendable note.`,
      };
    }

    if (summary.spendableNoteCount > 0 && latestActivity?.type === "shield") {
      return {
        ctaHref: isSwapPage ? "/app/send" : "/app/swap",
        ctaLabel: isSwapPage ? "Open Send" : "Open Swap",
        emphasisLabel: "Spendable note ready",
        message: `Shielded ${summary.liveAsset} is available from the latest Shield action and can continue into Send, Swap, or Unshield.`,
      };
    }

    if (summary.spendableNoteCount > 0 && latestActivity?.type === "change_note_created") {
      return {
        ctaHref: isSwapPage ? "/app/unshield" : "/app/swap",
        ctaLabel: isSwapPage ? "Open Unshield" : "Open Swap",
        emphasisLabel: "Change note ready",
        message: "Residual shielded value remains available. It can be sent again, swapped into SOL, or returned to Public Wallet.",
      };
    }

    if (latestActivity?.type === "swap") {
      return {
        ctaHref: isUnshieldPage ? "/app" : "/app/unshield",
        ctaLabel: isUnshieldPage ? "Open Home" : "Open Unshield",
        emphasisLabel: "Shielded SOL resolved",
        message: "The first constrained swap path completed inside Vanta. Shielded SOL output is now present and can be returned to Public Wallet through the new SOL unshield lane.",
      };
    }

    if (latestActivity?.type === "sol_unshield") {
      return {
        ctaHref: isShieldPage ? null : "/app/shield",
        ctaLabel: isShieldPage ? null : "Shield again",
        emphasisLabel: "SOL lane completed",
        message: "A shielded SOL note has been authenticated, consumed, and returned to Public Wallet through the constrained operator-backed exit path.",
      };
    }

    if (summary.spendableNoteCount > 0) {
      return {
        ctaHref: isSwapPage ? "/app/unshield" : "/app/swap",
        ctaLabel: isSwapPage ? "Open Unshield" : "Open Swap",
        emphasisLabel: "Next constrained action available",
        message: `Spendable ${summary.liveAsset} is live in shielded state and can continue through Send, Swap, or Unshield.`,
      };
    }

    if (latestActivity?.type === "unshield" && summary.publicBalance > 0) {
      return {
        ctaHref: isShieldPage ? null : "/app/shield",
        ctaLabel: isShieldPage ? null : "Shield again",
        emphasisLabel: "Public wallet restored",
        message: `${summary.liveAsset} has returned to Public Wallet. Shield can restart the constrained lifecycle when needed.`,
      };
    }

    if (summary.shieldedBalance > 0) {
      return {
        ctaHref: isUnshieldPage ? null : "/app/unshield",
        ctaLabel: isUnshieldPage ? null : "Open Unshield",
        emphasisLabel: "Shielded state present",
        message: `Shielded ${summary.liveAsset} is present, but there is no currently spendable note to move forward from this state.`,
      };
    }

    return {
      ctaHref: isShieldPage ? null : "/app/shield",
      ctaLabel: isShieldPage ? null : "Open Shield",
      emphasisLabel: `Awaiting live ${summary.liveAsset}`,
      message: `No constrained ${summary.liveAsset} action is available yet. Public Wallet needs live ${summary.liveAsset} to begin the loop.`,
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

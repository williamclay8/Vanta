import { useCallback, useRef } from "react";
import { useSolanaClient, useWalletSession } from "@solana/react-hooks";
import { useUnshieldExecution } from "@/components/unshield/useUnshieldExecution";
import { useUnshieldLaneState } from "@/components/unshield/useUnshieldLaneState";
import type { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import type { useVantaShieldState } from "@/solana/useVantaShieldState";
import type { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";

type ShieldRegistry = ReturnType<typeof useVantaShieldAssetRegistryState>;
type CanonicalShieldState = ReturnType<typeof useVantaShieldState>;
type ViewingKey = ReturnType<typeof useVantaShieldViewingKey>;

type UseUnshieldFlowArgs = {
  canonicalShieldState: CanonicalShieldState;
  setUnshieldReceiptCopyStatus: (status: "idle" | "copied" | "failed") => void;
  shieldRegistry: ShieldRegistry;
  splitFollowupRecoveryOptions: {
    viewingSecretKey: string | undefined;
  };
  splitFollowupMemoOptions: {
    viewingPublicKey: string | undefined;
  };
  splitSpentMarkerMemoOptions: {
    viewingPublicKey: string | undefined;
  };
  usdcShieldEntry: ShieldRegistry["byAssetKey"]["USDC"];
  viewingKey: ViewingKey;
  walletAddress: string | null | undefined;
  walletAddressShort: string | null | undefined;
  walletConnected: boolean;
};

export function useUnshieldFlow({
  canonicalShieldState,
  setUnshieldReceiptCopyStatus,
  shieldRegistry,
  splitFollowupRecoveryOptions,
  splitFollowupMemoOptions,
  splitSpentMarkerMemoOptions,
  usdcShieldEntry,
  viewingKey,
  walletAddress,
  walletAddressShort,
  walletConnected,
}: UseUnshieldFlowArgs) {
  const client = useSolanaClient();
  const walletSession = useWalletSession();
  const executionRef = useRef<ReturnType<typeof useUnshieldExecution> | null>(null);
  const resetFlowStatus = useCallback(() => {
    executionRef.current?.resetFlowStatus();
  }, []);

  const lane = useUnshieldLaneState({
    canonicalShieldState,
    resetFlowStatus,
    setUnshieldReceiptCopyStatus,
    shieldRegistry,
    usdcShieldEntry,
    walletAddressShort,
    walletConnected,
  });

  const execution = useUnshieldExecution({
    client,
    requestedAmountNumeric: lane.requestedAmountNumeric,
    selectedLane: lane.selectedLane,
    selectedShieldAccount: lane.selectedShieldAccount,
    selectedShieldAsset: lane.selectedShieldAsset,
    selectedShieldNote: lane.selectedShieldNote,
    selectedSolNote: lane.selectedSolNote,
    shieldRegistry,
    solShieldAccount: lane.solShieldAccount,
    splitFollowupRecoveryOptions,
    splitFollowupMemoOptions,
    splitSpentMarkerMemoOptions,
    usdcShieldEntry,
    viewingKey,
    walletAddress,
    walletSession,
  });
  executionRef.current = execution;

  return { ...lane, ...execution };
}

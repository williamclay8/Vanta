import { useMemo } from "react";
import { useSignatureStatus, useWaitForSignature } from "@solana/react-hooks";

export type RealtimeSignatureStage =
  | "idle"
  | "submitted"
  | "landed"
  | "confirmed"
  | "finalized"
  | "failed";

type RealtimeSignatureProgress = ReturnType<typeof useWaitForSignature> & {
  confirmationStatus: "processed" | "confirmed" | "finalized" | null;
  detailLabel: string | null;
  hasLanded: boolean;
  isFinalized: boolean;
  stage: RealtimeSignatureStage;
  stageLabel: string;
};

export function useRealtimeSignatureProgress(
  signature: string | undefined,
  options?: {
    commitment?: "processed" | "confirmed" | "finalized";
    disabled?: boolean;
  },
): RealtimeSignatureProgress {
  const disabled = options?.disabled ?? !signature;
  const signatureStatus = useSignatureStatus(signature, {
    config: {
      searchTransactionHistory: true,
    },
    disabled,
    swr: {
      refreshInterval: 1_000,
    },
  });
  const wait = useWaitForSignature(signature, {
    commitment: options?.commitment ?? "confirmed",
    disabled,
    subscribe: true,
  });

  const confirmationStatus = signatureStatus.confirmationStatus;

  const stage = useMemo<RealtimeSignatureStage>(() => {
    if (!signature || disabled) {
      return "idle";
    }

    if (wait.waitStatus === "error" || signatureStatus.error || signatureStatus.signatureStatus?.err) {
      return "failed";
    }

    if (confirmationStatus === "finalized") {
      return "finalized";
    }

    if (wait.waitStatus === "success" || confirmationStatus === "confirmed") {
      return "confirmed";
    }

    if (confirmationStatus === "processed") {
      return "landed";
    }

    return "submitted";
  }, [
    confirmationStatus,
    disabled,
    signature,
    signatureStatus.error,
    signatureStatus.signatureStatus?.err,
    wait.waitStatus,
  ]);

  const detailLabel = useMemo(() => {
    switch (stage) {
      case "submitted":
        return "Submitted to mainnet and waiting for landing.";
      case "landed":
        return "Landed on mainnet. Awaiting confirmed status.";
      case "confirmed":
        return "Confirmed through the websocket-backed signature watcher.";
      case "finalized":
        return "Finalized on mainnet.";
      case "failed":
        return "The submitted signature did not confirm cleanly.";
      case "idle":
        return null;
    }
  }, [stage]);

  return {
    ...wait,
    confirmationStatus,
    detailLabel,
    hasLanded:
      confirmationStatus === "processed" ||
      confirmationStatus === "confirmed" ||
      confirmationStatus === "finalized",
    isFinalized: confirmationStatus === "finalized",
    stage,
    stageLabel:
      stage === "idle"
        ? "Idle"
        : stage === "submitted"
          ? "Submitted"
          : stage === "landed"
            ? "Landed"
            : stage === "confirmed"
              ? "Confirmed"
              : stage === "finalized"
                ? "Finalized"
                : "Failed",
  };
}

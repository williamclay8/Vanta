import { useMemo } from "react";
import { useSignatureStatus, useWaitForSignature } from "@solana/react-hooks";
import { isSolanaRpcRateLimitError } from "@/solana/rpcErrors";

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
  const waitErrorIsRateLimited =
    wait.waitStatus === "error" && isSolanaRpcRateLimitError(wait.waitError);
  const signatureStatusErrorIsRateLimited =
    Boolean(signatureStatus.error) && isSolanaRpcRateLimitError(signatureStatus.error);

  const stage = useMemo<RealtimeSignatureStage>(() => {
    if (!signature || disabled) {
      return "idle";
    }

    if (
      (wait.waitStatus === "error" && !waitErrorIsRateLimited) ||
      (signatureStatus.error && !signatureStatusErrorIsRateLimited) ||
      signatureStatus.signatureStatus?.err
    ) {
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
    signatureStatusErrorIsRateLimited,
    signatureStatus.signatureStatus?.err,
    waitErrorIsRateLimited,
    wait.waitStatus,
  ]);

  const detailLabel = useMemo(() => {
    switch (stage) {
      case "submitted":
        if (waitErrorIsRateLimited || signatureStatusErrorIsRateLimited) {
          return "Submitted to mainnet; the public RPC is rate-limited, so confirmation is still being checked.";
        }

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
  }, [signatureStatusErrorIsRateLimited, stage, waitErrorIsRateLimited]);

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

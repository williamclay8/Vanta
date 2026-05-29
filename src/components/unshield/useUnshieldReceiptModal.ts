import { useCallback, useMemo, useState } from "react";
import type { UnshieldReceiptModalDetails } from "@/components/UnshieldReceiptModal";
import {
  abbreviate,
  formatUnshieldAmount,
  getSolscanTransactionUrl,
  type UnshieldLane,
} from "@/components/unshield/unshieldPanelUtils";

type UnshieldCompletion = {
  amount: number;
  asset: UnshieldLane;
  requestId?: string | null;
  transitionNoteId: string;
};

type UnshieldTransactionEvidence = {
  operator: { status: string };
  proof: { status: string };
  settlement: { status: string };
  wallet: { status: string };
};

type UseUnshieldReceiptModalArgs = {
  currentUnshieldTransactionEvidence: UnshieldTransactionEvidence;
  lastCompletion: UnshieldCompletion | null;
  lastTransitionSignature: string | null;
  operatorReleaseSignature: string | null;
};

export type UnshieldReceiptCopyStatus = "idle" | "copied" | "failed";

export function useUnshieldReceiptModal({
  currentUnshieldTransactionEvidence,
  lastCompletion,
  lastTransitionSignature,
  operatorReleaseSignature,
}: UseUnshieldReceiptModalArgs) {
  const [unshieldReceiptCopyStatus, setUnshieldReceiptCopyStatus] =
    useState<UnshieldReceiptCopyStatus>("idle");
  const [unshieldReceiptModalOpen, setUnshieldReceiptModalOpen] = useState(false);

  const completionEvidenceLabel = useMemo(
    () =>
      operatorReleaseSignature
        ? "Operator release signature returned"
        : currentUnshieldTransactionEvidence.operator.status === "recorded" &&
            currentUnshieldTransactionEvidence.proof.status === "verified"
          ? "Proof-backed release record retained"
          : currentUnshieldTransactionEvidence.wallet.status === "signature-recorded"
            ? "Transition signature captured"
            : "Pending operator release",
    [
      currentUnshieldTransactionEvidence.operator.status,
      currentUnshieldTransactionEvidence.proof.status,
      currentUnshieldTransactionEvidence.wallet.status,
      operatorReleaseSignature,
    ],
  );

  const unshieldReceiptModalDetails = useMemo<UnshieldReceiptModalDetails | null>(() => {
    if (!lastCompletion) {
      return null;
    }

    return {
      amountLabel: formatUnshieldAmount(lastCompletion.amount, lastCompletion.asset),
      evidenceLabel: completionEvidenceLabel,
      exitVisibilityLabel: "public on-chain exit",
      operatorReleaseLabel: operatorReleaseSignature
        ? abbreviate(operatorReleaseSignature)
        : "Pending",
      operatorRequestLabel: lastCompletion.requestId
        ? abbreviate(lastCompletion.requestId)
        : "Pending receipt",
      settlementScopeLabel: currentUnshieldTransactionEvidence.settlement.status,
      solscanUrl: operatorReleaseSignature
        ? getSolscanTransactionUrl(operatorReleaseSignature)
        : undefined,
      transitionNoteLabel: abbreviate(lastCompletion.transitionNoteId),
    };
  }, [
    completionEvidenceLabel,
    currentUnshieldTransactionEvidence.settlement.status,
    lastCompletion,
    operatorReleaseSignature,
  ]);

  const copyUnshieldReceipt = useCallback(async () => {
    if (!lastCompletion) {
      setUnshieldReceiptCopyStatus("failed");
      return;
    }

    const receiptLines = [
      "Vanta Unshield receipt",
      `Asset: ${lastCompletion.asset}`,
      `Amount: ${formatUnshieldAmount(lastCompletion.amount, lastCompletion.asset)}`,
      `Operator release signature: ${operatorReleaseSignature ?? "pending"}`,
      "Exit visibility: public on-chain exit",
      `Transition note: ${lastCompletion.transitionNoteId}`,
      `Operator request: ${lastCompletion.requestId ?? "pending receipt"}`,
      `Settlement scope: ${currentUnshieldTransactionEvidence.settlement.status}`,
      `Evidence: ${completionEvidenceLabel}`,
      "Verify the public exit transaction before treating funds as moved.",
    ];

    try {
      await navigator.clipboard.writeText(receiptLines.join("\n"));
      setUnshieldReceiptCopyStatus("copied");
    } catch {
      setUnshieldReceiptCopyStatus("failed");
    }
  }, [
    completionEvidenceLabel,
    currentUnshieldTransactionEvidence.settlement.status,
    lastCompletion,
    operatorReleaseSignature,
  ]);

  return {
    completionEvidenceLabel,
    copyUnshieldReceipt,
    setUnshieldReceiptCopyStatus,
    setUnshieldReceiptModalOpen,
    unshieldReceiptCopyStatus,
    unshieldReceiptModalDetails,
    unshieldReceiptModalOpen,
  };
}

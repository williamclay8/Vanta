import type { VantaTransactionSafetySummary } from "./transactionSafetySummary.mjs";

export type VantaWalletBackedTransactionSimulationGate = {
  canRequestWalletSignature: boolean;
  cluster: VantaTransactionSafetySummary["cluster"] | null;
  decision: {
    accepted: boolean;
    reason: string;
  };
  humanApprovedSummary: boolean;
  kind: "vanta-wallet-backed-transaction-simulation-gate";
  privateKeyMaterialHandled: boolean;
  requiresSimulationBeforeSignature: true;
  requiresTransactionSummaryBeforeSignature: true;
  requiresWalletSignature: true;
  summary: VantaTransactionSafetySummary | null;
  transactionFingerprint: string;
  transactionMutableAfterSummary: boolean;
  version: "vanta-wallet-backed-transaction-simulation-0.1";
  walletAddress: string;
};

export function createWalletBackedTransactionSimulationGate(input: {
  connectedWalletAddress: string;
  humanApprovedSummary: boolean;
  privateKeyMaterialHandled?: boolean;
  summary: VantaTransactionSafetySummary | null;
  transactionFingerprint: string;
  transactionMutableAfterSummary?: boolean;
}): VantaWalletBackedTransactionSimulationGate;

export function validateWalletBackedTransactionSimulationGate(gate: VantaWalletBackedTransactionSimulationGate): {
  accepted: boolean;
  canRequestWalletSignature: boolean;
  reason: string;
};

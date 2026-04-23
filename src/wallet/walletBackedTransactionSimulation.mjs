import { validateTransactionSafetySummary } from "./transactionSafetySummary.mjs";

const GATE_KIND = "vanta-wallet-backed-transaction-simulation-gate";
const GATE_VERSION = "vanta-wallet-backed-transaction-simulation-0.1";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requireText(value, fieldName) {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error(`Vanta wallet-backed transaction simulation gate requires ${fieldName}.`);
  }

  return normalized;
}

function decideGate(gate) {
  if (gate.kind !== GATE_KIND) {
    return {
      accepted: false,
      reason: "invalid-gate-kind",
    };
  }

  if (!gate.walletAddress) {
    return {
      accepted: false,
      reason: "wallet-not-connected",
    };
  }

  if (!gate.summary || typeof gate.summary !== "object") {
    return {
      accepted: false,
      reason: "transaction-summary-required",
    };
  }

  if (gate.walletAddress !== gate.summary?.feePayer) {
    return {
      accepted: false,
      reason: "wallet-fee-payer-mismatch",
    };
  }

  if (gate.privateKeyMaterialHandled) {
    return {
      accepted: false,
      reason: "private-key-material-handled",
    };
  }

  if (gate.transactionMutableAfterSummary) {
    return {
      accepted: false,
      reason: "transaction-mutated-after-summary",
    };
  }

  const summaryDecision = validateTransactionSafetySummary(gate.summary);
  if (!summaryDecision.accepted) {
    return summaryDecision;
  }

  if (!gate.humanApprovedSummary) {
    return {
      accepted: false,
      reason: "human-approval-required",
    };
  }

  return {
    accepted: true,
    reason: "wallet-signature-request-ready",
  };
}

export function createWalletBackedTransactionSimulationGate(input) {
  const walletAddress = normalizeText(input.connectedWalletAddress);
  const transactionFingerprint = requireText(input.transactionFingerprint, "transactionFingerprint");
  const transactionMutableAfterSummary = input.transactionMutableAfterSummary === true;
  const privateKeyMaterialHandled = input.privateKeyMaterialHandled === true;

  const gate = {
    cluster: input.summary?.cluster ?? null,
    humanApprovedSummary: input.humanApprovedSummary === true,
    kind: GATE_KIND,
    privateKeyMaterialHandled,
    requiresSimulationBeforeSignature: true,
    requiresTransactionSummaryBeforeSignature: true,
    requiresWalletSignature: true,
    summary: input.summary,
    transactionFingerprint,
    transactionMutableAfterSummary,
    version: GATE_VERSION,
    walletAddress,
  };
  const decision = decideGate(gate);

  return {
    ...gate,
    canRequestWalletSignature: decision.accepted,
    decision,
  };
}

export function validateWalletBackedTransactionSimulationGate(gate) {
  const decision = decideGate(gate);

  return {
    ...decision,
    canRequestWalletSignature: decision.accepted,
  };
}

import { createTransactionSafetySummary } from "./transactionSafetySummary.mjs";
import {
  createWalletBackedTransactionSimulationGate,
  validateWalletBackedTransactionSimulationGate,
} from "./walletBackedTransactionSimulation.mjs";

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(`Vanta wallet safe send boundary requires ${label}.`);
  }

  return value;
}

function requireText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta wallet safe send boundary requires ${label}.`);
  }

  return value.trim();
}

function requireTransactionInstructions(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Vanta wallet safe send boundary requires instructions.");
  }

  return value;
}

function normalizeSummaryInstructions(input) {
  const source = input.summaryInstructions ?? input.instructions;
  if (!Array.isArray(source) || source.length === 0) {
    throw new Error("Vanta wallet safe send boundary requires summaryInstructions.");
  }

  return source.map((instruction) => requireText(instruction, "summaryInstructions[]"));
}

function normalizeBlockhash(prepared) {
  return (
    prepared?.lifetime?.blockhash?.toString?.() ??
    prepared?.recentBlockhash?.toString?.() ??
    prepared?.blockhash?.toString?.() ??
    ""
  );
}

export function createWalletSafeSendBoundary(dependencies) {
  return {
    kind: "vanta-wallet-safe-send-boundary",
    prepare: requireFunction(dependencies.prepare, "prepare"),
    sendPrepared: requireFunction(dependencies.sendPrepared, "sendPrepared"),
    simulate: requireFunction(dependencies.simulate, "simulate"),
    version: "vanta-wallet-safe-send-boundary-0.1",
  };
}

export async function prepareWalletSafeSendBoundary(boundary, input) {
  if (boundary?.kind !== "vanta-wallet-safe-send-boundary") {
    throw new Error("Vanta wallet safe send boundary received an invalid boundary.");
  }

  const request = {
    feePayer: requireText(input.feePayer, "feePayer"),
    instructions: requireTransactionInstructions(input.instructions),
    label: requireText(input.label, "label"),
  };
  const summaryInstructions = normalizeSummaryInstructions(input);
  const prepared = await boundary.prepare(request);
  const simulationResult = await boundary.simulate(prepared);
  const recentBlockhash = normalizeBlockhash(prepared);

  const summary = createTransactionSafetySummary({
    amount: input.amount,
    asset: input.asset,
    cluster: input.cluster,
    estimatedFees: input.estimatedFees,
    explicitMainnetApproval: input.explicitMainnetApproval,
    feePayer: request.feePayer,
    instructions: summaryInstructions,
    recentBlockhash,
    recipient: input.recipient,
    simulationResult,
  });
  const gate = createWalletBackedTransactionSimulationGate({
    connectedWalletAddress: input.connectedWalletAddress,
    humanApprovedSummary: input.humanApprovedSummary,
    privateKeyMaterialHandled: false,
    summary,
    transactionFingerprint: input.transactionFingerprint,
    transactionMutableAfterSummary: false,
  });
  const decision = validateWalletBackedTransactionSimulationGate(gate);

  if (!decision.accepted) {
    return {
      decision,
      gate,
      reason: decision.reason,
      signature: null,
      status: "blocked",
      summary,
    };
  }

  return {
    decision,
    gate,
    prepared,
    signature: null,
    status: "prepared",
    summary,
  };
}

export async function sendPreparedWalletSafeSendBoundary(boundary, preparedApproval) {
  if (boundary?.kind !== "vanta-wallet-safe-send-boundary") {
    throw new Error("Vanta wallet safe send boundary received an invalid boundary.");
  }

  if (preparedApproval?.status !== "prepared" || !preparedApproval.prepared) {
    throw new Error("Vanta wallet safe send boundary requires a prepared approval.");
  }

  const signature = await boundary.sendPrepared(preparedApproval.prepared);

  return {
    ...preparedApproval,
    signature,
    status: "submitted",
  };
}

export async function runWalletSafeSendBoundary(boundary, input) {
  const preparedApproval = await prepareWalletSafeSendBoundary(boundary, input);

  if (preparedApproval.status === "blocked") {
    return preparedApproval;
  }

  return sendPreparedWalletSafeSendBoundary(boundary, preparedApproval);
}

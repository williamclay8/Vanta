/**
 * Phase 2 product proof request packets for real-Noir adapter bridges.
 * These are client/browser-worker request shapes only; they do not generate proofs.
 */

import { createHash } from "node:crypto";
import { VANTA_REAL_NOIR_ADAPTERS } from "../sdk/vantaPrivacySDK.mjs";

export const VANTA_PHASE2_PRODUCT_PROOF_REQUEST_SCHEMA_VERSION =
  "vanta-phase2-product-proof-request-v0.1";
export const VANTA_PHASE2_PRODUCT_BROWSER_WORKER_MESSAGE_SCHEMA_VERSION =
  "vanta-phase2-product-browser-worker-message-v0.1";
export const VANTA_PHASE2_PRODUCT_PROOF_RESULT_SCHEMA_VERSION =
  "vanta-phase2-product-proof-result-v0.1";
export const VANTA_PHASE2_PRODUCT_PROOF_REQUEST_CLAIM_BOUNDARY =
  "beta-real-noir-proof-request-shape-not-proof-generation-or-production-private";
export const VANTA_PHASE2_PRODUCT_PROOF_RESULT_CLAIM_BOUNDARY =
  "beta-real-noir-proof-result-adapter-dev-only-not-generated-proof-or-production-private";

const TARGETS = {
  selectiveDisclosure: {
    adapter: VANTA_REAL_NOIR_ADAPTERS.selectiveDisclosure,
    circuit: "vanta_selective_disclosure",
    expectedPublicInputs: ["threshold", "expected_jurisdiction", "amount_commitment"],
    target: "selective-disclosure",
    workerKind: "vanta-phase2-product-browser-worker-prove-selective-disclosure",
  },
  velocityAggregate: {
    adapter: VANTA_REAL_NOIR_ADAPTERS.velocityAggregate,
    circuit: "vanta_velocity_aggregate",
    expectedPublicInputs: [
      "threshold",
      "velocity_commitment",
      "period_start",
      "period_end",
      "expected_jurisdiction",
      "expected_accredited",
    ],
    target: "velocity-aggregate",
    workerKind: "vanta-phase2-product-browser-worker-prove-velocity-aggregate",
  },
  creditNoteTransfer: {
    adapter: VANTA_REAL_NOIR_ADAPTERS.creditNoteTransfer,
    circuitPathMarker: "zk/noir/vanta_private_credit_note_transfer",
    circuit: "vanta_private_credit_note_transfer",
    expectedPublicInputs: [
      "amount_bucket_min",
      "amount_bucket_max",
      "asset_id",
      "recipient_commitment",
      "withdraw_context",
      "deposit_commitment",
      "claim_code_commitment",
      "credit_note_commitment",
      "nullifier",
    ],
    target: "credit-note-transfer",
    workerKind: "vanta-phase2-product-browser-worker-prove-credit-note-transfer",
  },
  rwaCompliance: {
    adapter: VANTA_REAL_NOIR_ADAPTERS.rwaCompliance,
    circuit: "vanta_rwa_compliance",
    expectedPublicInputs: [
      "min_value",
      "asset_id",
      "expected_jurisdiction",
      "expected_accredited",
      "owner_commitment",
      "rwa_commitment",
    ],
    target: "rwa-compliance",
    workerKind: "vanta-phase2-product-browser-worker-prove-rwa-compliance",
  },
  privatePerpsRisk: {
    adapter: VANTA_REAL_NOIR_ADAPTERS.privatePerpsRisk,
    circuit: "vanta_private_perps_risk",
    expectedPublicInputs: [
      "market_id",
      "max_leverage",
      "maintenance_bps",
      "position_commitment",
      "liquidation_context",
    ],
    target: "private-perps-risk",
    workerKind: "vanta-phase2-product-browser-worker-prove-private-perps-risk",
  },
  agentSpendingLimit: {
    adapter: VANTA_REAL_NOIR_ADAPTERS.agentSpendingLimit,
    circuitPathMarker: "zk/noir/vanta_agent_spending_limit",
    circuit: "vanta_agent_spending_limit",
    expectedPublicInputs: [
      "agent_id",
      "spending_limit",
      "policy_epoch",
      "human_approval_commitment",
      "authorization_nullifier",
      "policy_commitment",
    ],
    target: "agent-spending-limit",
    workerKind: "vanta-phase2-product-browser-worker-prove-agent-spending-limit",
  },
};

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertExpectedPublicInputs(target, publicInputs) {
  const missing = target.expectedPublicInputs.filter((key) => publicInputs[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`Phase 2 product proof request missing public inputs: ${missing.join(", ")}`);
  }
}

function assertSupportedRequest(request) {
  const target = TARGETS[request.adapterId];
  if (!target) {
    throw new Error(`Unsupported Phase 2 product proof request adapter: ${request.adapterId}`);
  }
  if (request.claimBoundary !== VANTA_PHASE2_PRODUCT_PROOF_REQUEST_CLAIM_BOUNDARY) {
    throw new Error("Phase 2 product proof result adapter requires a claim-blocked proof request.");
  }
  if (request.circuit !== target.circuit || request.circuitPath !== target.adapter.circuitPath) {
    throw new Error("Phase 2 product proof result adapter request circuit metadata drifted.");
  }
  if (request.browserWorkerMessage?.payload?.expectedPublicInputHash !== request.publicInputHash) {
    throw new Error("Phase 2 product proof result adapter request hash binding drifted.");
  }
  return target;
}

function assertWorkerResultIsPublic(workerResult) {
  for (const key of [
    "compiledProgramBytecode",
    "compressedWitness",
    "privateInputs",
    "privateWitness",
    "proof",
    "proofBytes",
    "witness",
    "witnessInput",
  ]) {
    if (workerResult[key] !== undefined && workerResult[key] !== null) {
      throw new Error(`Phase 2 product proof result adapter must not include ${key}.`);
    }
  }
}

export function createVantaPhase2ProductProofRequest(adapterId, publicInputs, options = {}) {
  const target = TARGETS[adapterId];
  if (!target) {
    throw new Error(`Unsupported Phase 2 product proof adapter: ${adapterId}`);
  }
  assertExpectedPublicInputs(target, publicInputs);

  const publicInputHash = options.publicInputHash ?? `sha256:${sha256Hex(stableJson(publicInputs))}`;
  const requestId =
    options.requestId ?? `phase2_${target.target}_${sha256Hex(publicInputHash).slice(0, 16)}`;

  return {
    schemaVersion: VANTA_PHASE2_PRODUCT_PROOF_REQUEST_SCHEMA_VERSION,
    object: "phase2_product_real_noir_proof_request",
    requestId,
    adapterId,
    adapter: target.adapter,
    circuit: target.circuit,
    circuitPath: target.adapter.circuitPath,
    target: target.target,
    publicInputs,
    publicInputHash,
    proofRuntime: "browser-worker-noir-js-candidate",
    proofBytes: null,
    proofStatus: "request-shaped-proof-not-generated",
    privateInputsDisclosed: false,
    witnessDisclosed: false,
    claimBoundary: VANTA_PHASE2_PRODUCT_PROOF_REQUEST_CLAIM_BOUNDARY,
    verificationCommands: [
      target.adapter.verificationCommand,
      "npm run zk:phase2-product-proof-requests-check",
    ],
    browserWorkerMessage: {
      schemaVersion: VANTA_PHASE2_PRODUCT_BROWSER_WORKER_MESSAGE_SCHEMA_VERSION,
      id: requestId,
      kind: target.workerKind,
      payload: {
        adapterId,
        circuit: target.circuit,
        circuitPath: target.adapter.circuitPath,
        compiledProgramBytecode: null,
        compressedWitness: null,
        expectedPublicInputHash: publicInputHash,
        proofRuntimeVersion: "browser-worker-noir-js-candidate",
        target: target.target,
        witnessInput: null,
      },
    },
  };
}

export function createSelectiveDisclosureBrowserProofRequest(publicInputs, options = {}) {
  return createVantaPhase2ProductProofRequest("selectiveDisclosure", publicInputs, options);
}

export function createVelocityAggregateBrowserProofRequest(publicInputs, options = {}) {
  return createVantaPhase2ProductProofRequest("velocityAggregate", publicInputs, options);
}

export function createCreditNoteTransferBrowserProofRequest(publicInputs, options = {}) {
  return createVantaPhase2ProductProofRequest("creditNoteTransfer", publicInputs, options);
}

export function createRwaComplianceBrowserProofRequest(publicInputs, options = {}) {
  return createVantaPhase2ProductProofRequest("rwaCompliance", publicInputs, options);
}

export function createPrivatePerpsRiskBrowserProofRequest(publicInputs, options = {}) {
  return createVantaPhase2ProductProofRequest("privatePerpsRisk", publicInputs, options);
}

export function createAgentSpendingLimitBrowserProofRequest(publicInputs, options = {}) {
  return createVantaPhase2ProductProofRequest("agentSpendingLimit", publicInputs, options);
}

export function createVantaPhase2ProductProofResultPacket(request, workerResult = {}, options = {}) {
  const target = assertSupportedRequest(request);
  assertWorkerResultIsPublic(workerResult);

  const publicOutputs = workerResult.publicOutputs ?? options.publicOutputs ?? {};
  const publicOutputHash =
    options.publicOutputHash ?? `sha256:${sha256Hex(stableJson(publicOutputs))}`;
  const resultId =
    options.resultId ?? `phase2_result_${target.target}_${sha256Hex(publicOutputHash).slice(0, 16)}`;

  return {
    schemaVersion: VANTA_PHASE2_PRODUCT_PROOF_RESULT_SCHEMA_VERSION,
    object: "phase2_product_real_noir_proof_result_packet",
    resultId,
    requestId: request.requestId,
    adapterId: request.adapterId,
    circuit: request.circuit,
    circuitPath: request.circuitPath,
    target: request.target,
    publicInputHash: request.publicInputHash,
    publicOutputHash,
    publicOutputs,
    proofRuntime: request.proofRuntime,
    proofStatus: "dev-result-shaped-proof-not-generated",
    workerResultSummary: {
      kind: workerResult.kind ?? "dev-only-noir-worker-result-summary",
      ok: workerResult.ok === true,
      proofResultId: workerResult.proofResultId ?? null,
    },
    proofBytesPubliclyDisclosed: false,
    generatedProofClaimAllowed: false,
    privateInputsDisclosed: false,
    witnessDisclosed: false,
    productionReady: false,
    claimBoundary: VANTA_PHASE2_PRODUCT_PROOF_RESULT_CLAIM_BOUNDARY,
    verificationCommands: [
      target.adapter.verificationCommand,
      "npm run zk:phase2-product-proof-requests-check",
    ],
  };
}

export function createSelectiveDisclosureBrowserProofResultPacket(
  publicInputs,
  workerResult = {},
  options = {}
) {
  const request =
    options.request ?? createSelectiveDisclosureBrowserProofRequest(publicInputs, options.requestOptions);
  return createVantaPhase2ProductProofResultPacket(request, workerResult, options);
}

export function createVelocityAggregateBrowserProofResultPacket(
  publicInputs,
  workerResult = {},
  options = {}
) {
  const request =
    options.request ?? createVelocityAggregateBrowserProofRequest(publicInputs, options.requestOptions);
  return createVantaPhase2ProductProofResultPacket(request, workerResult, options);
}

export function createCreditNoteTransferBrowserProofResultPacket(
  publicInputs,
  workerResult = {},
  options = {},
) {
  const request =
    options.request ?? createCreditNoteTransferBrowserProofRequest(publicInputs, options.requestOptions);
  return createVantaPhase2ProductProofResultPacket(request, workerResult, options);
}

export function createRwaComplianceBrowserProofResultPacket(publicInputs, workerResult = {}, options = {}) {
  const request = options.request ?? createRwaComplianceBrowserProofRequest(publicInputs, options.requestOptions);
  return createVantaPhase2ProductProofResultPacket(request, workerResult, options);
}

export function createPrivatePerpsRiskBrowserProofResultPacket(
  publicInputs,
  workerResult = {},
  options = {},
) {
  const request =
    options.request ?? createPrivatePerpsRiskBrowserProofRequest(publicInputs, options.requestOptions);
  return createVantaPhase2ProductProofResultPacket(request, workerResult, options);
}

export function createAgentSpendingLimitBrowserProofResultPacket(publicInputs, workerResult = {}, options = {}) {
  const request =
    options.request ?? createAgentSpendingLimitBrowserProofRequest(publicInputs, options.requestOptions);
  return createVantaPhase2ProductProofResultPacket(request, workerResult, options);
}

export function assertNoPrivateProofRequestLeak(request, privateValues) {
  const serialized = JSON.stringify(request);
  for (const value of privateValues) {
    if (value && serialized.includes(String(value))) {
      throw new Error(`Phase 2 product proof request leaked private value: ${value}`);
    }
  }
  if (request.privateInputsDisclosed !== false || request.witnessDisclosed !== false) {
    throw new Error("Phase 2 product proof request must keep private inputs and witness undisclosed.");
  }
  if (request.browserWorkerMessage.payload.witnessInput !== null) {
    throw new Error("Phase 2 product proof request must not include witness input in the public packet.");
  }
}

export function assertNoPrivateProofResultLeak(result, privateValues) {
  const serialized = JSON.stringify(result);
  for (const value of privateValues) {
    if (value && serialized.includes(String(value))) {
      throw new Error(`Phase 2 product proof result leaked private value: ${value}`);
    }
  }
  if (
    result.privateInputsDisclosed !== false ||
    result.witnessDisclosed !== false ||
    result.proofBytesPubliclyDisclosed !== false
  ) {
    throw new Error("Phase 2 product proof result must keep private inputs, witness, and proof bytes undisclosed.");
  }
  if (result.generatedProofClaimAllowed !== false || result.productionReady !== false) {
    throw new Error("Phase 2 product proof result must stay claim-blocked and productionReady=false.");
  }
}

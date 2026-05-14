import { createHash } from "node:crypto";

import { validateVantaActualPrivateSettlementPlan } from "./actualPrivateSettlementPlan.mjs";

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Actual-private relayer settlement caller requires ${fieldName}.`);
  }

  return value.trim();
}

function normalizeBaseUrl(value) {
  const parsed = new URL(requireText(value, "operatorBaseUrl"));
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Actual-private relayer settlement caller requires an HTTP(S) operator URL.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Actual-private relayer settlement caller forbids credential-bearing operator URLs.");
  }
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

function isSolanaTransactionSignature(value) {
  return typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(value);
}

const productionProofSystems = new Set(["noir-bb", "groth16", "plonk"]);

function hashRef(prefix, value) {
  return `${prefix}:${createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24)}`;
}

function validateAcceptedPublicInputs({ acceptedPublicInputs, plan }) {
  if (!acceptedPublicInputs) {
    return { accepted: true, reason: "accepted-public-inputs-not-present" };
  }
  if (plan.request.action !== "send") {
    return { accepted: false, reason: "accepted-public-inputs-only-valid-for-send" };
  }

  const requiredMatches = [
    ["acceptedRoot", "acceptedRoot"],
    ["assetCohort", "assetCohort"],
    ["changeOutputCommitment", "changeOutputCommitment"],
    ["nullifierOrReplayCommitment", "nullifierOrReplayCommitment"],
    ["outputCommitment", "outputCommitment"],
    ["poolId", "poolId"],
    ["privateSpendContextHash", "privateSpendContextHash"],
    ["privateSpendPublicInputHash", "privateSpendPublicInputHash"],
  ];
  for (const [responseField, planField] of requiredMatches) {
    if (acceptedPublicInputs?.[responseField] !== plan.request?.[planField]) {
      return { accepted: false, reason: `accepted-public-input-${responseField}-mismatch` };
    }
  }
  if (acceptedPublicInputs.proofReceiptPublicInputCommitment !== plan.responseProofReceiptPublicInputCommitment) {
    return { accepted: false, reason: "accepted-public-inputs-missing-proof-commitment" };
  }

  return { accepted: true, reason: "accepted-public-inputs-match-plan" };
}

export function validateVantaActualPrivateSettlementResponse({ plan, response }) {
  if (response?.kind !== "protocol_settlement") {
    return { accepted: false, reason: "invalid-response-kind" };
  }
  if (response.protocolSettlementReceipt?.action !== plan.request.action) {
    return { accepted: false, reason: "invalid-receipt-action" };
  }
  if (response.protocolSettlementReceipt?.economicsMode !== "committed-economics") {
    return { accepted: false, reason: "invalid-receipt-economics-mode" };
  }
  if (response.protocolSettlementReceipt?.settlementId !== plan.request.settlementId) {
    return { accepted: false, reason: "settlement-id-mismatch" };
  }
  if (response.protocolSettlementReceipt?.settlementCommitment !== plan.request.settlementCommitment) {
    return { accepted: false, reason: "settlement-commitment-mismatch" };
  }
  const expectedIntent = plan.request.action === "unshield" ? "unshield" : "private-send";
  const expectedReplayKeyPrefix = plan.request.action === "unshield" ? "unshield" : "private-send";

  if (response.proofReceipt?.intent !== expectedIntent) {
    return { accepted: false, reason: "invalid-proof-intent" };
  }
  if (response.proofReceipt?.assetId !== "hidden:economic-terms") {
    return { accepted: false, reason: "invalid-hidden-asset" };
  }
  if (!productionProofSystems.has(response.proofReceipt?.proofSystem)) {
    return { accepted: false, reason: "invalid-production-proof-system" };
  }
  if (
    response.proofReceipt?.replayKey !==
    `${expectedReplayKeyPrefix}:${plan.request.nullifierOrReplayCommitment}`
  ) {
    return { accepted: false, reason: "replay-key-mismatch" };
  }
  if (
    plan.request.action === "unshield" &&
    response.protocolSettlementReceipt?.exitTermsCommitment !== plan.request.exitTermsCommitment
  ) {
    return { accepted: false, reason: "exit-terms-commitment-mismatch" };
  }
  if (
    plan.request.action === "unshield" &&
    response.protocolSettlementReceipt?.proofBoundDestinationCommitment !==
      plan.request.proofBoundDestinationCommitment
  ) {
    return { accepted: false, reason: "proof-bound-destination-commitment-mismatch" };
  }
  if (!response.protocolSettlementReceipt?.proofReceiptPublicInputCommitment) {
    return { accepted: false, reason: "missing-proof-public-input-commitment" };
  }
  const acceptedPublicInputsDecision = validateAcceptedPublicInputs({
    acceptedPublicInputs: response.acceptedPublicInputs,
    plan: {
      ...plan,
      responseProofReceiptPublicInputCommitment:
        response.protocolSettlementReceipt.proofReceiptPublicInputCommitment,
    },
  });
  if (!acceptedPublicInputsDecision.accepted) {
    return acceptedPublicInputsDecision;
  }
  if (plan.request?.relayerSerializedTransaction && !response.onChainSubmission) {
    return { accepted: false, reason: "missing-relayer-solana-submission" };
  }
  if (response.onChainSubmission) {
    if (!isSolanaTransactionSignature(response.onChainSubmission.signature)) {
      return { accepted: false, reason: "invalid-relayer-solana-signature" };
    }
    if (response.onChainSubmission.submittedBy !== "relayer") {
      return { accepted: false, reason: "invalid-relayer-submitter" };
    }
  }

  return { accepted: true, reason: "actual-private-settlement-response-ready" };
}

export function validateVantaActualPrivateOperatorCapability({ status }) {
  if (status?.protocolActionProofModes?.send !== "actual_private_spend_circuit_request") {
    return { accepted: false, reason: "operator-send-proof-mode-not-actual-private" };
  }
  if (
    status?.protocolActionProofModes?.unshield !==
    "committed_unshield_or_claim_circuit_request"
  ) {
    return { accepted: false, reason: "operator-unshield-proof-mode-not-committed" };
  }
  if (status?.proofTrustBoundary?.mockProofRealFundsAllowed !== false) {
    return { accepted: false, reason: "operator-mock-proof-boundary-not-exposed" };
  }
  if (status?.proofTrustBoundary?.productionProofSystemRequired !== true) {
    return { accepted: false, reason: "operator-production-proof-system-not-required" };
  }
  const acceptedProductionProofSystems =
    status?.proofTrustBoundary?.acceptedProductionProofSystems;
  if (
    !Array.isArray(acceptedProductionProofSystems) ||
    acceptedProductionProofSystems.length === 0 ||
    acceptedProductionProofSystems.some((proofSystem) => !productionProofSystems.has(proofSystem))
  ) {
    return { accepted: false, reason: "operator-production-proof-systems-invalid" };
  }

  return { accepted: true, reason: "actual-private-operator-capability-ready" };
}

export async function requestVantaActualPrivateSettlementViaRelayer({
  authToken,
  fetchImpl = fetch,
  operatorBaseUrl,
  plan,
}) {
  const planDecision = validateVantaActualPrivateSettlementPlan(plan);
  if (!planDecision.accepted) {
    throw new Error(`Actual-private settlement plan rejected: ${planDecision.reason}`);
  }

  const token = requireText(authToken, "authToken");
  const baseUrl = normalizeBaseUrl(operatorBaseUrl);
  const statusResponse = await fetchImpl(`${baseUrl}/state/private-pool-v2-status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: "GET",
  });
  const statusPayload = await statusResponse.json();
  if (!statusResponse.ok) {
    throw new Error(statusPayload?.error ?? `Actual-private operator status failed: ${statusResponse.status}`);
  }
  const capabilityDecision = validateVantaActualPrivateOperatorCapability({ status: statusPayload });
  if (!capabilityDecision.accepted) {
    throw new Error(`Actual-private operator capability rejected: ${capabilityDecision.reason}`);
  }

  const response = await fetchImpl(`${baseUrl}${plan.operatorEndpoint}`, {
    body: JSON.stringify(plan.request),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? `Actual-private settlement request failed: ${response.status}`);
  }

  const responseDecision = validateVantaActualPrivateSettlementResponse({ plan, response: payload });
  if (!responseDecision.accepted) {
    throw new Error(`Actual-private settlement response rejected: ${responseDecision.reason}`);
  }

  return {
    evidenceRefs: {
      operatorReceiptRef: `operator-receipt:${payload.protocolSettlementReceipt.proofReceiptId}`,
      protocolSettlementRef: `operator-protocol-settlement:${payload.protocolSettlementReceipt.id}`,
      relayerSubmittedSpendTxRef: payload.onChainSubmission?.signature
        ? `solana-tx:${payload.onChainSubmission.signature}`
        : null,
      acceptedPublicInputsRef: payload.acceptedPublicInputs
        ? hashRef("operator-accepted-public-inputs", payload.acceptedPublicInputs)
        : null,
    },
    response: payload,
    responseDecision,
  };
}

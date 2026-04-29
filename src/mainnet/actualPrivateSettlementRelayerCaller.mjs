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

export function validateVantaActualPrivateSettlementResponse({ plan, response }) {
  if (response?.kind !== "protocol_settlement") {
    return { accepted: false, reason: "invalid-response-kind" };
  }
  if (response.protocolSettlementReceipt?.action !== "send") {
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
  if (response.proofReceipt?.intent !== "private-send") {
    return { accepted: false, reason: "invalid-proof-intent" };
  }
  if (response.proofReceipt?.assetId !== "hidden:economic-terms") {
    return { accepted: false, reason: "invalid-hidden-asset" };
  }
  if (response.proofReceipt?.replayKey !== `private-send:${plan.request.nullifierOrReplayCommitment}`) {
    return { accepted: false, reason: "replay-key-mismatch" };
  }
  if (!response.protocolSettlementReceipt?.proofReceiptPublicInputCommitment) {
    return { accepted: false, reason: "missing-proof-public-input-commitment" };
  }

  return { accepted: true, reason: "actual-private-settlement-response-ready" };
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
      relayerSubmittedSpendTxRef: `operator-protocol-settlement:${payload.protocolSettlementReceipt.id}`,
    },
    response: payload,
    responseDecision,
  };
}

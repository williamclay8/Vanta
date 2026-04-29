export const VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_VERSION =
  "vanta-actual-private-settlement-plan-0.1";

const forbiddenRequestKeys = new Set([
  "amount",
  "asset",
  "destination",
  "inputCommitment",
  "inputLeafIndex",
  "merchantSettlementAddress",
  "owner",
  "payerSourceWallet",
  "rawAmount",
  "rawAsset",
  "sourceWallet",
]);

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Actual-private settlement plan requires ${fieldName}.`);
  }

  return value.trim();
}

function assertNoForbiddenKeys(value, path = "request") {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenRequestKeys.has(key)) {
      throw new Error(`Actual-private settlement plan forbids ${path}.${key}.`);
    }
    assertNoForbiddenKeys(child, `${path}.${key}`);
  }
}

export function createVantaActualPrivateSettlementPlan(input) {
  const request = {
    action: "send",
    assetCohort: requireText(input.assetCohort, "assetCohort"),
    assetIdCommitment: requireText(input.assetIdCommitment, "assetIdCommitment"),
    acceptedRoot: requireText(input.acceptedRoot, "acceptedRoot"),
    changeOutputCommitment: requireText(input.changeOutputCommitment, "changeOutputCommitment"),
    economicsCommitment: requireText(input.economicsCommitment, "economicsCommitment"),
    economicsMode: "committed-economics",
    nullifierOrReplayCommitment: requireText(input.nullifier, "nullifier"),
    outputCommitment: requireText(input.outputCommitment, "outputCommitment"),
    ownerCommitment: requireText(input.ownerCommitment, "ownerCommitment"),
    poolId: requireText(input.poolId, "poolId"),
    privateSpendContextHash: requireText(input.privateSpendContextHash, "privateSpendContextHash"),
    privateSpendPublicInputHash: requireText(input.privateSpendPublicInputHash, "privateSpendPublicInputHash"),
    routeCommitment: requireText(input.routeCommitment, "routeCommitment"),
    settlementCommitment: requireText(input.settlementCommitment, "settlementCommitment"),
    settlementId: requireText(input.settlementId, "settlementId"),
  };

  assertNoForbiddenKeys(request);

  return {
    operatorEndpoint: "/private-pool-v2/protocol-settlements",
    publicTranscriptTerms: [
      "pool-id",
      "asset-cohort",
      "asset-id-commitment",
      "accepted-root",
      "nullifier",
      "output-commitment-0",
      "output-commitment-1",
      "context-hash",
      "private-spend-public-input-hash",
    ],
    request,
    version: VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_VERSION,
  };
}

export function validateVantaActualPrivateSettlementPlan(plan) {
  if (plan?.version !== VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_VERSION) {
    return { accepted: false, reason: "invalid-plan-version" };
  }

  if (plan.operatorEndpoint !== "/private-pool-v2/protocol-settlements") {
    return { accepted: false, reason: "invalid-operator-endpoint" };
  }

  try {
    assertNoForbiddenKeys(plan.request);
  } catch (error) {
    return {
      accepted: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  if (plan.request?.action !== "send" || plan.request?.economicsMode !== "committed-economics") {
    return { accepted: false, reason: "invalid-action-or-economics-mode" };
  }

  return { accepted: true, reason: "actual-private-settlement-plan-ready" };
}

export const VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_VERSION =
  "vanta-actual-private-settlement-plan-0.1";
const PROOF_BOUND_DESTINATION_COMMITMENT_PATTERN = /^sha256:[0-9a-f]{64}$/;

const forbiddenRequestKeys = new Set([
  "amount",
  "asset",
  "destination",
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

function requireProofBoundDestinationCommitment(value) {
  const commitment = requireText(value, "proofBoundDestinationCommitment");
  if (!PROOF_BOUND_DESTINATION_COMMITMENT_PATTERN.test(commitment)) {
    throw new Error(
      "Actual-private settlement plan requires proofBoundDestinationCommitment to match sha256:<64 lowercase hex>.",
    );
  }
  return commitment;
}

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

function normalizeOptionalBase64Transaction(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const text = requireText(value, "relayerSerializedTransaction");
  const base64 = text.startsWith("base64:") ? text.slice("base64:".length) : text;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new Error("Actual-private settlement plan requires base64 relayerSerializedTransaction.");
  }
  if (Buffer.from(base64, "base64").length === 0) {
    throw new Error("Actual-private settlement plan requires non-empty relayerSerializedTransaction.");
  }

  return `base64:${base64}`;
}

function normalizeAction(value) {
  if (value === undefined || value === null || value === "") {
    return "send";
  }

  const action = requireText(value, "action");
  if (action !== "send" && action !== "unshield") {
    throw new Error("Actual-private settlement plan action must be send or unshield.");
  }

  return action;
}

export function createVantaActualPrivateSettlementPlan(input) {
  const action = normalizeAction(input.action);
  const baseRequest = {
    action,
    assetCohort: requireText(input.assetCohort, "assetCohort"),
    assetIdCommitment: requireText(input.assetIdCommitment, "assetIdCommitment"),
    economicsCommitment: requireText(input.economicsCommitment, "economicsCommitment"),
    economicsMode: "committed-economics",
    nullifierOrReplayCommitment: requireText(input.nullifier, "nullifier"),
    ownerCommitment: requireText(input.ownerCommitment, "ownerCommitment"),
    poolId: requireText(input.poolId, "poolId"),
    routeCommitment: requireText(input.routeCommitment, "routeCommitment"),
    settlementCommitment: requireText(input.settlementCommitment, "settlementCommitment"),
    settlementId: requireText(input.settlementId, "settlementId"),
  };
  const request =
    action === "unshield"
      ? {
          ...baseRequest,
          exitTermsCommitment: requireText(input.exitTermsCommitment, "exitTermsCommitment"),
          inputCommitment: requireText(input.inputCommitment, "inputCommitment"),
          inputRoot: requireText(input.inputRoot, "inputRoot"),
          proofBoundDestinationCommitment: requireProofBoundDestinationCommitment(
            input.proofBoundDestinationCommitment,
          ),
          unshieldContextTag: requireText(input.unshieldContextTag, "unshieldContextTag"),
          unshieldPublicInputHash: requireText(
            input.unshieldPublicInputHash,
            "unshieldPublicInputHash",
          ),
        }
      : {
          ...baseRequest,
          acceptedRoot: requireText(input.acceptedRoot, "acceptedRoot"),
          ...(optionalText(input.changeLeafIndex) ? { changeLeafIndex: optionalText(input.changeLeafIndex) } : {}),
          changeOutputCommitment: requireText(input.changeOutputCommitment, "changeOutputCommitment"),
          ...(optionalText(input.changeOutputRoot) ? { changeOutputRoot: optionalText(input.changeOutputRoot) } : {}),
          outputCommitment: requireText(input.outputCommitment, "outputCommitment"),
          ...(optionalText(input.outputLeafIndex) ? { outputLeafIndex: optionalText(input.outputLeafIndex) } : {}),
          ...(optionalText(input.outputRoot) ? { outputRoot: optionalText(input.outputRoot) } : {}),
          privateSpendContextHash: requireText(
            input.privateSpendContextHash,
            "privateSpendContextHash",
          ),
          privateSpendPublicInputHash: requireText(
            input.privateSpendPublicInputHash,
            "privateSpendPublicInputHash",
          ),
        };
  const relayerSerializedTransaction = normalizeOptionalBase64Transaction(input.relayerSerializedTransaction);
  if (relayerSerializedTransaction) {
    if (action !== "send") {
      throw new Error("Actual-private settlement plan only supports relayerSerializedTransaction for send.");
    }
    request.relayerSerializedTransaction = relayerSerializedTransaction;
  }

  assertNoForbiddenKeys(request);

  return {
    operatorEndpoint: "/private-pool-v2/protocol-settlements",
    publicTranscriptTerms: [
      "pool-id",
      "asset-cohort",
      "asset-id-commitment",
      "accepted-root",
      "output-leaf-index",
      "change-leaf-index",
      "output-root",
      "change-output-root",
      "nullifier",
      "output-commitment-0",
      "output-commitment-1",
      "context-hash",
      "private-spend-public-input-hash",
      "input-root-for-unshield-only",
      "input-commitment-for-unshield-only",
      "exit-terms-commitment-for-unshield-only",
      "proof-bound-destination-commitment-for-unshield-only",
      "unshield-context-tag-for-unshield-only",
      "unshield-public-input-hash-for-unshield-only",
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

  if (
    (plan.request?.action !== "send" && plan.request?.action !== "unshield") ||
    plan.request?.economicsMode !== "committed-economics"
  ) {
    return { accepted: false, reason: "invalid-action-or-economics-mode" };
  }

  const requiredFields =
    plan.request.action === "unshield"
      ? [
          "assetCohort",
          "assetIdCommitment",
          "economicsCommitment",
          "exitTermsCommitment",
          "inputCommitment",
          "inputRoot",
          "nullifierOrReplayCommitment",
          "ownerCommitment",
          "poolId",
          "proofBoundDestinationCommitment",
          "routeCommitment",
          "settlementCommitment",
          "settlementId",
          "unshieldContextTag",
          "unshieldPublicInputHash",
        ]
      : [
          "acceptedRoot",
          "assetCohort",
          "assetIdCommitment",
          "changeOutputCommitment",
          "economicsCommitment",
          "nullifierOrReplayCommitment",
          "outputCommitment",
          "ownerCommitment",
          "poolId",
          "privateSpendContextHash",
          "privateSpendPublicInputHash",
          "routeCommitment",
          "settlementCommitment",
          "settlementId",
        ];

  for (const field of requiredFields) {
    if (typeof plan.request?.[field] !== "string" || plan.request[field].trim().length === 0) {
      return { accepted: false, reason: `missing-${field}` };
    }
  }
  if (
    plan.request.action === "unshield" &&
    !PROOF_BOUND_DESTINATION_COMMITMENT_PATTERN.test(plan.request.proofBoundDestinationCommitment)
  ) {
    return { accepted: false, reason: "invalid-proofBoundDestinationCommitment" };
  }

  try {
    normalizeOptionalBase64Transaction(plan.request?.relayerSerializedTransaction);
  } catch (error) {
    return {
      accepted: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  if (plan.request?.relayerSerializedTransaction && plan.request.action !== "send") {
    return {
      accepted: false,
      reason: "relayerSerializedTransaction-only-supported-for-send",
    };
  }

  return { accepted: true, reason: "actual-private-settlement-plan-ready" };
}

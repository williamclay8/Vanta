import { createHash } from "node:crypto";

import { createVantaActualPrivateSettlementPlan } from "./actualPrivateSettlementPlan.mjs";

export const VANTA_ACTUAL_PRIVATE_SETTLEMENT_LIVE_DATA_PRODUCER_VERSION =
  "vanta-actual-private-settlement-live-data-producer-0.1";

const SUPPORTED_DENOMINATIONS = new Set(["10", "25", "100", "500", "1000"]);

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Actual-private settlement live-data producer requires ${fieldName}.`);
  }
  return value.trim();
}

function hashTerm(...parts) {
  return `0x${createHash("sha256").update(parts.join("\u001f")).digest("hex")}`;
}

function optionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function planInputFromJson(value, relayerSerializedTransaction) {
  const text = optionalText(value);
  if (!text) {
    return null;
  }
  const parsed = JSON.parse(text);
  const request = parsed?.request && typeof parsed.request === "object" ? parsed.request : parsed;
  const input = {
    ...request,
    nullifier: request.nullifier ?? request.nullifierOrReplayCommitment,
  };
  if (!input.relayerSerializedTransaction && relayerSerializedTransaction) {
    input.relayerSerializedTransaction = relayerSerializedTransaction;
  }
  return input;
}

function assertDenomination(value) {
  if (!SUPPORTED_DENOMINATIONS.has(value)) {
    throw new Error(`Actual-private settlement live-data producer requires a supported fixed denomination, received ${value}.`);
  }
}

function buildScenarioTerms({
  assetCohort = "stablecoin-usdc-v1",
  denomination = "100",
  merchantSettlementAddress,
  payerSourceWallet,
  poolAddress = "pool:stablecoin-usdc-v1:100",
  relayerFeePayer = "vanta-independent-relayer-fee-payer",
  settlementNonce = "live-candidate",
}) {
  assertDenomination(denomination);
  const normalizedPayer = requireText(payerSourceWallet, "payerSourceWallet");
  const normalizedMerchant = requireText(merchantSettlementAddress, "merchantSettlementAddress");
  const normalizedPool = requireText(poolAddress, "poolAddress");
  const normalizedRelayerFeePayer = requireText(relayerFeePayer, "relayerFeePayer");
  const normalizedNonce = requireText(settlementNonce, "settlementNonce");
  const poolEpoch = `epoch:shared-cohort:${normalizedNonce}`;
  const settlementEpoch = `epoch:settlement:${normalizedNonce}`;
  const noteSecret = hashTerm("note-secret", normalizedPayer, denomination, poolEpoch);
  const changeNoteSecret = hashTerm("change-note-secret", normalizedPayer, denomination, settlementEpoch);
  const inputCommitment = hashTerm("note-commitment", noteSecret, assetCohort, denomination);
  const acceptedRoot = hashTerm("pool-root", assetCohort, poolEpoch, inputCommitment);
  const nullifier = hashTerm("nullifier", noteSecret, settlementEpoch);
  const outputCommitment = hashTerm("merchant-output-commitment", normalizedMerchant, denomination, settlementEpoch);
  const changeOutputCommitment = hashTerm("change-output-commitment", changeNoteSecret, settlementEpoch);
  const privateSpendContextHash = hashTerm("context", outputCommitment, nullifier, settlementEpoch);
  const privateSpendPublicInputHash = hashTerm(
    "private-spend-public-input-hash",
    acceptedRoot,
    inputCommitment,
    nullifier,
    outputCommitment,
    changeOutputCommitment,
    privateSpendContextHash,
  );
  const routeCommitment = hashTerm("route", normalizedRelayerFeePayer, normalizedPool, settlementEpoch);
  const economicsCommitment = hashTerm("economics", assetCohort, denomination, outputCommitment, changeOutputCommitment);
  const settlementId = hashTerm("settlement-id", normalizedNonce, nullifier);
  const settlementCommitment = hashTerm("settlement", settlementId, routeCommitment, economicsCommitment);

  return {
    acceptedRoot,
    assetCohort,
    assetIdCommitment: hashTerm("asset-id", assetCohort),
    changeLeafIndex: "43",
    changeOutputCommitment,
    changeOutputRoot: hashTerm("output-root", acceptedRoot, changeOutputCommitment),
    economicsCommitment,
    nullifier,
    outputCommitment,
    outputLeafIndex: "42",
    outputRoot: hashTerm("output-root", acceptedRoot, outputCommitment),
    ownerCommitment: hashTerm("owner", normalizedPayer),
    poolId: normalizedPool,
    privateSpendContextHash,
    privateSpendPublicInputHash,
    routeCommitment,
    settlementCommitment,
    settlementId,
  };
}

export function createVantaActualPrivateSettlementLiveDataPacket({
  env = process.env,
  mode = "status",
} = {}) {
  const sourceRef = optionalText(env.VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF);
  const relayerSerializedTransaction = optionalText(env.VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION);
  const livePlanInput = planInputFromJson(
    env.VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON,
    relayerSerializedTransaction,
  );
  const demoRequested = mode === "demo" || env.VANTA_ACTUAL_PRIVATE_LIVE_DATA_ALLOW_DEMO === "true";
  const candidateTerms = demoRequested
    ? buildScenarioTerms({
        denomination: optionalText(env.VANTA_ACTUAL_PRIVATE_DENOMINATION) ?? "100",
        merchantSettlementAddress:
          optionalText(env.VANTA_ACTUAL_PRIVATE_MERCHANT_SETTLEMENT_ADDRESS_REF) ??
          "merchant-public-settlement-address",
        payerSourceWallet:
          optionalText(env.VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF) ??
          "payer-public-funding-wallet",
        poolAddress: optionalText(env.VANTA_ACTUAL_PRIVATE_POOL_ID) ?? "pool:stablecoin-usdc-v1:100",
        relayerFeePayer:
          optionalText(env.VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET) ??
          "vanta-independent-relayer-fee-payer",
        settlementNonce:
          optionalText(env.VANTA_ACTUAL_PRIVATE_SETTLEMENT_NONCE_REF) ??
          "demo-not-live-evidence",
      })
    : null;

  const missingLiveInputs = [
    sourceRef ? null : "VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF",
    relayerSerializedTransaction ? null : "VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION",
  ].filter(Boolean);
  const rawPlanInput = livePlanInput ?? (candidateTerms && relayerSerializedTransaction
    ? { ...candidateTerms, relayerSerializedTransaction }
    : candidateTerms);
  const plan = rawPlanInput ? createVantaActualPrivateSettlementPlan(rawPlanInput) : null;

  return {
    version: VANTA_ACTUAL_PRIVATE_SETTLEMENT_LIVE_DATA_PRODUCER_VERSION,
    checkedAt: new Date().toISOString(),
    mode,
    liveDataSourceRef: sourceRef,
    liveReady: Boolean(sourceRef && relayerSerializedTransaction && plan && !demoRequested),
    demoDerived: demoRequested,
    claimBoundary: demoRequested
      ? "demo-derived-plan-terms-not-live-settlement-evidence"
      : sourceRef
        ? plan
          ? "live-source-ref-and-plan-json-present-operator-reviewed"
          : "live-source-ref-present-plan-terms-still-operator-reviewed"
        : "no-live-data-source-ref",
    missingLiveInputs,
    planTermStatus: candidateTerms
      ? Object.fromEntries(Object.keys(candidateTerms).map((field) => [field, "derived"]))
      : {},
    relayerSerializedTransactionPresent: Boolean(relayerSerializedTransaction),
    planJsonPresent: Boolean(plan),
    plan,
    safety: {
      movesFunds: false,
      signsTransactions: false,
      submitsTransactions: false,
      printsOperatorToken: false,
      printsPrivateKeys: false,
    },
  };
}

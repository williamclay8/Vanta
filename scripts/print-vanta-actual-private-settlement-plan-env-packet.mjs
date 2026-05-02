import { readFileSync } from "node:fs";

import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const evidencePath = new URL("../ops/mainnet/actual-private-mainnet-settlement.evidence.json", import.meta.url);
const servicesPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);
const approval = createVantaMainnetRealFundsApprovalStatus();
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const services = JSON.parse(readFileSync(servicesPath, "utf8"));

const planFields = [
  ["acceptedRoot", "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT", "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_REF", true],
  ["assetCohort", "VANTA_ACTUAL_PRIVATE_ASSET_COHORT", "VANTA_ACTUAL_PRIVATE_ASSET_COHORT_REF", true],
  ["assetIdCommitment", "VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT", "VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REF", true],
  ["changeLeafIndex", "VANTA_ACTUAL_PRIVATE_CHANGE_LEAF_INDEX", "VANTA_ACTUAL_PRIVATE_CHANGE_LEAF_INDEX_REF", false],
  ["changeOutputCommitment", "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT", "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT_REF", true],
  ["changeOutputRoot", "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_ROOT", "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_ROOT_REF", false],
  ["economicsCommitment", "VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT", "VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT_REF", true],
  ["nullifier", "VANTA_ACTUAL_PRIVATE_NULLIFIER", "VANTA_ACTUAL_PRIVATE_NULLIFIER_REF", true],
  ["outputCommitment", "VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT", "VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT_REF", true],
  ["outputLeafIndex", "VANTA_ACTUAL_PRIVATE_OUTPUT_LEAF_INDEX", "VANTA_ACTUAL_PRIVATE_OUTPUT_LEAF_INDEX_REF", false],
  ["outputRoot", "VANTA_ACTUAL_PRIVATE_OUTPUT_ROOT", "VANTA_ACTUAL_PRIVATE_OUTPUT_ROOT_REF", false],
  ["ownerCommitment", "VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT", "VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT_REF", true],
  ["poolId", "VANTA_ACTUAL_PRIVATE_POOL_ID", "VANTA_ACTUAL_PRIVATE_POOL_ID_REF", true],
  ["privateSpendContextHash", "VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH", "VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH_REF", true],
  [
    "privateSpendPublicInputHash",
    "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH",
    "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF",
    true,
  ],
  ["routeCommitment", "VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT", "VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT_REF", true],
  ["settlementCommitment", "VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT", "VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT_REF", true],
  ["settlementId", "VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID", "VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID_REF", true],
];

const currentEnvStatus = Object.fromEntries(
  [
    "VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF",
    "VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON",
    "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
    "VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION",
    ...planFields.flatMap(([, rawEnv, refEnv]) => [rawEnv, refEnv]),
  ].map((name) => [
    name,
    {
      present: Boolean(process.env[name]?.trim()),
      printedValue: false,
    },
  ]),
);

const spendRefs = evidence.mainnetSpendProgramEvidence ?? {};
const output = {
  version: "vanta-actual-private-settlement-plan-env-packet-0.1",
  checkedAt: new Date().toISOString(),
  purpose:
    "Refs-only packet for preparing VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON without printing secrets, raw plan JSON, signed transactions, or private inputs.",
  approval: {
    actionRef: approval.approvalActionRef,
    approvalWindowRef: approval.approvalWindowRef,
    approvalWindowStatus: approval.approvalWindowStatus,
    liveMainnetActionsAllowedNow: approval.liveMainnetActionsAllowedNow,
    maximumFundsAtRiskRef: approval.maximumFundsAtRiskRef,
  },
  publicSolanaSpendAccounts: {
    programId: spendRefs.programId,
    poolState: spendRefs.poolState,
    nullifierSet: spendRefs.nullifierSet,
    outputQueue: spendRefs.outputQueue,
  },
  serviceSources: serviceSources(),
  currentEnvStatus,
  requiredPlanTerms: planFields.filter(([, , , required]) => required).map(([field, rawEnv, refEnv]) => ({
    field,
    rawEnv,
    refEnv,
    source:
      field === "assetCohort"
        ? "stablecoin-usdc-v1 cohort label from the selected pool"
        : "actual-private proof/operator flow output; do not invent",
  })),
  optionalPlanTerms: planFields.filter(([, , , required]) => !required).map(([field, rawEnv, refEnv]) => ({
    field,
    rawEnv,
    refEnv,
    source: "optional actual-private indexer/stateful-send lineage term; include when available, not required by the actual-private operator send contract",
  })),
  buildOrder: [
    {
      step: 1,
      action: "Keep Doppler-backed operator token in the shell; never paste it into chat.",
      check: "doppler run --config prd --project vanta -- node -e 'console.log(process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN ? \"operator token present\" : \"operator token missing\")'",
    },
    {
      step: 2,
      action: "Set the public wallet ref in the same terminal.",
      command:
        "export VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF=\"5pzJsEVARN5Ly6H1AjbbVofY6Fjr68FbkT6y8ozx3Ymi\"",
    },
    {
      step: 3,
      action: "Run the proof/settlement flow that emits the actual-private plan terms listed in requiredPlanTerms.",
      blocker:
        "The current repo has validators and executor gates, but no complete live-data producer for these terms.",
    },
    {
      step: 4,
      action: "When the plan terms are present as raw public/commitment env values, build the raw plan JSON export.",
      command: "npm run mainnet:actual-private-settlement-plan-json",
    },
    {
      step: 5,
      action: "Build relayer serialized transaction bytes without signing or sending.",
      command: "npm run private-pool-v2:solana-spend-transaction",
      note: "This prints VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION for local shell use only.",
    },
    {
      step: 6,
      action: "Run the live executor only after plan JSON, relayer transaction bytes, wallet ref, Doppler token, and ACKs are present.",
      command: "npm run mainnet:actual-private-settlement-live -- --execute",
    },
  ],
  safety: {
    printsOperatorToken: false,
    printsRawPlanJson: false,
    printsSerializedTransaction: false,
    movesFunds: false,
  },
};

console.log(JSON.stringify(output, null, 2));

function serviceSources() {
  return (services.services ?? []).map((service) => ({
    id: service.id,
    urlPresent: Boolean(service.deployedService?.url),
    authSecretRef: service.deployedService?.auth?.secretRef ?? null,
  }));
}

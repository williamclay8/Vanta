import { readFileSync } from "node:fs";

import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const packagePath = new URL("../package.json", import.meta.url);
const servicesManifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);

const approvalStatus = createVantaMainnetRealFundsApprovalStatus();
const expectedActionRef = approvalStatus.approvalActionRef;
const expectedMaximumFundsAtRisk = "0.025 SOL";
const expectedMaximumFundsAtRiskLamports = 25_000_000;
const stopConditionText =
  "stop after the first failed transaction, unexpected Solscan linkage, nullifier replay failure, or total risk cap hit";
const liveAck = "I_UNDERSTAND_THIS_RUN_CAN_MOVE_MAINNET_FUNDS";
const executeAck = "I_UNDERSTAND_THIS_WILL_REQUEST_A_MAINNET_PRIVATE_SETTLEMENT";

const planFields = [
  ["acceptedRoot", "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_REF"],
  ["assetCohort", "VANTA_ACTUAL_PRIVATE_ASSET_COHORT_REF"],
  ["assetIdCommitment", "VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REF"],
  ["changeOutputCommitment", "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT_REF"],
  ["economicsCommitment", "VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT_REF"],
  ["nullifier", "VANTA_ACTUAL_PRIVATE_NULLIFIER_REF"],
  ["outputCommitment", "VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT_REF"],
  ["ownerCommitment", "VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT_REF"],
  ["poolId", "VANTA_ACTUAL_PRIVATE_POOL_ID_REF"],
  ["privateSpendContextHash", "VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH_REF"],
  ["privateSpendPublicInputHash", "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF"],
  ["routeCommitment", "VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT_REF"],
  ["settlementCommitment", "VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT_REF"],
  ["settlementId", "VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID_REF"],
];

const serviceEnv = [
  ["operator", "VANTA_PRIVATE_POOL_V2_OPERATOR_URL_REF", "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN_REF"],
  ["indexer", "VANTA_PRIVATE_POOL_V2_INDEXER_URL_REF", "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN_REF"],
  ["relayer", "VANTA_PRIVATE_POOL_V2_RELAYER_URL_REF", "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN_REF"],
  ["prover", "VANTA_PRIVATE_POOL_V2_PROVER_URL_REF", "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN_REF"],
  ["verifier", "VANTA_PRIVATE_POOL_V2_VERIFIER_URL_REF", "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN_REF"],
];

function readManifestServices() {
  const manifest = JSON.parse(readFileSync(servicesManifestPath, "utf8"));
  return new Map((manifest.services ?? []).map((service) => [service.id, service]));
}

function serviceRefs() {
  const services = readManifestServices();
  return serviceEnv.map(([id, urlEnv, tokenRefEnv]) => {
    const service = services.get(id);
    return {
      id,
      tokenRefEnv,
      tokenRefValue: service?.deployedService?.auth?.secretRef ?? `${tokenRefEnv}_MISSING`,
      urlEnv,
      urlValue: service?.deployedService?.url ?? `${urlEnv}_MISSING`,
    };
  });
}

function shellExports(refs) {
  const planRefExports = planFields.map(([, env]) => `export ${env}="${env}"`);
  const serviceRefExports = refs.flatMap((service) => [
    `export ${service.urlEnv}="${service.urlValue}"`,
    `export ${service.tokenRefEnv}="${service.tokenRefValue}"`,
  ]);
  return [
    `export VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF="<NORMAL_VANTA_DEMO_WALLET_PUBLIC_KEY_OR_REF>"`,
    ...serviceRefExports,
    ...planRefExports,
    `export VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON='<VALIDATED_PRIVATE_SETTLEMENT_PLAN_JSON>'`,
    `export VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN="<OPERATOR_BEARER_TOKEN_VALUE_FROM_SECRET_MANAGER>"`,
    `export VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK="${liveAck}"`,
    `export VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_EXECUTE_ACK="${executeAck}"`,
  ];
}

const refs = serviceRefs();
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

const packet = {
  version: "vanta-actual-private-settlement-operator-packet-0.1",
  purpose: "refs-only operator packet for clearing the actual-private live settlement blockers without printing secrets",
  action: {
    expectedActionRef,
    currentApprovalWindowRef: approvalStatus.approvalWindowRef,
    liveMainnetActionsAllowedNow: approvalStatus.liveMainnetActionsAllowedNow,
    stopConditionStatus: approvalStatus.stopCondition,
    expectedMaximumFundsAtRisk,
    expectedMaximumFundsAtRiskLamports,
    requiresFreshBoundedApprovalWindow: true,
    stopCondition: stopConditionText,
  },
  commands: {
    preflight: "npm run mainnet:actual-private-settlement-live",
    execute: "node scripts/run-vanta-actual-private-mainnet-settlement-evidence.mjs --live --execute",
    executorCheck: packageJson.scripts["mainnet:actual-private-settlement-executor-check"],
    evidencePreview: packageJson.scripts["mainnet:actual-private-settlement-evidence-preview"],
  },
  approvalTextTemplate:
    "I approve one Vanta actual-private mainnet settlement evidence run. Max funds at risk: 0.025 SOL. Window: <fresh exact date/time range>. Fee payer: my normal Vanta demo wallet. Stop condition: stop after the first failed transaction, unexpected Solscan linkage, nullifier replay failure, or total risk cap hit. Purpose: collect refs-only evidence for the actual-private settlement packet.",
  requiredEnvironment: {
    walletPublicKeyRef: "VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF",
    serviceRefs: refs,
    planRefs: planFields.map(([field, env]) => ({ env, field })),
    rawSecretPresenceOnly: ["VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN"],
    rawPlanJsonPresenceOnly: "VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON",
    acknowledgements: {
      VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK: liveAck,
      VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_EXECUTE_ACK: executeAck,
    },
  },
  settlementPlanJsonShape: Object.fromEntries(planFields.map(([field]) => [field, `<${field}>`])),
  shellExportTemplate: shellExports(refs),
  forbiddenOutputValues: [
    "wallet private keys",
    "seed phrases",
    "raw bearer tokens",
    "raw settlement plan JSON",
    "signed transactions",
    "source wallet linkage fields",
    "raw amount/asset/destination fields",
  ],
};

console.log(JSON.stringify(packet, null, 2));

import { strict as assert } from "node:assert";

import { createVantaActualPrivateSettlementPlan } from "../src/mainnet/actualPrivateSettlementPlan.mjs";

const requiredFields = [
  ["assetCohort", "VANTA_ACTUAL_PRIVATE_ASSET_COHORT"],
  ["assetIdCommitment", "VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT"],
  ["economicsCommitment", "VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT"],
  ["nullifier", "VANTA_ACTUAL_PRIVATE_NULLIFIER"],
  ["ownerCommitment", "VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT"],
  ["poolId", "VANTA_ACTUAL_PRIVATE_POOL_ID"],
  ["routeCommitment", "VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT"],
  ["settlementCommitment", "VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT"],
  ["settlementId", "VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID"],
];
const sendFields = [
  ["acceptedRoot", "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT"],
  ["changeOutputCommitment", "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT"],
  ["outputCommitment", "VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT"],
  ["privateSpendContextHash", "VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH"],
  ["privateSpendPublicInputHash", "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH"],
];
const optionalSendFields = [
  ["changeLeafIndex", "VANTA_ACTUAL_PRIVATE_CHANGE_LEAF_INDEX"],
  ["changeOutputRoot", "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_ROOT"],
  ["outputLeafIndex", "VANTA_ACTUAL_PRIVATE_OUTPUT_LEAF_INDEX"],
  ["outputRoot", "VANTA_ACTUAL_PRIVATE_OUTPUT_ROOT"],
];
const unshieldFields = [
  ["exitTermsCommitment", "VANTA_ACTUAL_PRIVATE_EXIT_TERMS_COMMITMENT"],
  ["inputCommitment", "VANTA_ACTUAL_PRIVATE_INPUT_COMMITMENT"],
  ["inputRoot", "VANTA_ACTUAL_PRIVATE_INPUT_ROOT"],
  ["unshieldContextTag", "VANTA_ACTUAL_PRIVATE_UNSHIELD_CONTEXT_TAG"],
  ["unshieldPublicInputHash", "VANTA_ACTUAL_PRIVATE_UNSHIELD_PUBLIC_INPUT_HASH"],
];
const optionalFields = [
  ["action", "VANTA_ACTUAL_PRIVATE_ACTION"],
  ["relayerSerializedTransaction", "VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION"],
];

const forbiddenFragments = [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "signedTransaction",
];

const forbiddenFieldNames = [
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
];

const unshieldOnlyAllowedForbiddenFields = new Set(["inputCommitment"]);

function readRequiredEnv(name) {
  const value = process.env[name]?.trim() ?? "";
  assert.ok(value, `Missing required public settlement term ${name}.`);
  for (const forbidden of forbiddenFragments) {
    assert.ok(!value.includes(forbidden), `${name} must not contain ${forbidden}.`);
  }
  return value;
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const input = Object.fromEntries(requiredFields.map(([field, env]) => [field, readRequiredEnv(env)]));
const action = process.env.VANTA_ACTUAL_PRIVATE_ACTION?.trim() || "send";
assert.ok(
  action === "send" || action === "unshield",
  "VANTA_ACTUAL_PRIVATE_ACTION must be send or unshield.",
);
input.action = action;
for (const [field, env] of (action === "unshield" ? unshieldFields : sendFields)) {
  input[field] = readRequiredEnv(env);
}
if (action === "send") {
  for (const [field, env] of optionalSendFields) {
    const value = process.env[env]?.trim() ?? "";
    if (value) {
      input[field] = value;
    }
  }
}
for (const [field, env] of optionalFields) {
  const value = process.env[env]?.trim() ?? "";
  if (value) {
    input[field] = value;
  }
}
const plan = createVantaActualPrivateSettlementPlan(input);
const planJson = JSON.stringify(input);
const serializedPlan = JSON.stringify(plan);

for (const fieldName of forbiddenFieldNames) {
  const allowedForUnshield =
    action === "unshield" && unshieldOnlyAllowedForbiddenFields.has(fieldName);
  if (!allowedForUnshield) {
    assert.ok(!Object.hasOwn(input, fieldName), `Plan JSON input must not include ${fieldName}.`);
    assert.ok(!serializedPlan.includes(`"${fieldName}"`), `Plan output must not include ${fieldName}.`);
  }
}

if (process.argv.includes("--export")) {
  console.log(`export VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON=${shellQuote(planJson)}`);
} else {
  console.log(planJson);
}

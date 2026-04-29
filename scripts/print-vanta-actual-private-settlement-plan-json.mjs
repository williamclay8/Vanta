import { strict as assert } from "node:assert";

import { createVantaActualPrivateSettlementPlan } from "../src/mainnet/actualPrivateSettlementPlan.mjs";

const requiredFields = [
  ["acceptedRoot", "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT"],
  ["assetCohort", "VANTA_ACTUAL_PRIVATE_ASSET_COHORT"],
  ["changeOutputCommitment", "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT"],
  ["economicsCommitment", "VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT"],
  ["nullifier", "VANTA_ACTUAL_PRIVATE_NULLIFIER"],
  ["outputCommitment", "VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT"],
  ["ownerCommitment", "VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT"],
  ["poolId", "VANTA_ACTUAL_PRIVATE_POOL_ID"],
  ["privateSpendContextHash", "VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH"],
  ["privateSpendPublicInputHash", "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH"],
  ["routeCommitment", "VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT"],
  ["settlementCommitment", "VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT"],
  ["settlementId", "VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID"],
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
const plan = createVantaActualPrivateSettlementPlan(input);
const planJson = JSON.stringify(input);
const serializedPlan = JSON.stringify(plan);

for (const fieldName of forbiddenFieldNames) {
  assert.ok(!Object.hasOwn(input, fieldName), `Plan JSON input must not include ${fieldName}.`);
  assert.ok(!serializedPlan.includes(`"${fieldName}"`), `Plan output must not include ${fieldName}.`);
}

if (process.argv.includes("--export")) {
  console.log(`export VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON=${shellQuote(planJson)}`);
} else {
  console.log(planJson);
}

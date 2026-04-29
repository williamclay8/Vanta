import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const scriptPath = resolve(repoRoot, "scripts/print-vanta-actual-private-settlement-plan-json.mjs");
const packagePath = resolve(repoRoot, "package.json");

const env = {
  ...process.env,
  VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT: "root:actual-private-live-candidate",
  VANTA_ACTUAL_PRIVATE_ASSET_COHORT: "stablecoin-usdc-v1",
  VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT: "commitment:asset-id",
  VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT: "commitment:change-output",
  VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT: "commitment:economics",
  VANTA_ACTUAL_PRIVATE_NULLIFIER: "nullifier:actual-private-live-candidate",
  VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT: "commitment:merchant-output",
  VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT: "commitment:owner",
  VANTA_ACTUAL_PRIVATE_POOL_ID: "pool:stablecoin-usdc-v1",
  VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH: "context:actual-private-live-candidate",
  VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH: "public-input-hash:actual-private-live-candidate",
  VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT: "commitment:route",
  VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT: "commitment:settlement",
  VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID: "settlement:actual-private-live-candidate",
};

const run = spawnSync("node", [scriptPath], {
  cwd: repoRoot,
  encoding: "utf8",
  env,
});

assert.equal(run.status, 0, run.stderr || run.stdout);
assert.equal(run.stderr, "");

const planJson = JSON.parse(run.stdout);
assert.equal(planJson.acceptedRoot, env.VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT);
assert.equal(planJson.assetCohort, "stablecoin-usdc-v1");
assert.equal(planJson.assetIdCommitment, env.VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT);
assert.equal(planJson.nullifier, env.VANTA_ACTUAL_PRIVATE_NULLIFIER);
assert.equal(planJson.privateSpendPublicInputHash, env.VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH);
assert.equal(Object.keys(planJson).length, 14);

const exportRun = spawnSync("node", [scriptPath, "--export"], {
  cwd: repoRoot,
  encoding: "utf8",
  env,
});
assert.equal(exportRun.status, 0, exportRun.stderr || exportRun.stdout);
assert.match(exportRun.stdout, /^export VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON='/);

for (const forbidden of [
  "amount",
  "asset",
  "destination",
  "inputCommitment",
  "inputLeafIndex",
  "merchantSettlementAddress",
  "payerSourceWallet",
  "rawAmount",
  "rawAsset",
  "sourceWallet",
]) {
  assert.equal(Object.hasOwn(planJson, forbidden), false, `Plan JSON must not contain key ${forbidden}.`);
}

const serialized = JSON.stringify(planJson);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "privateKey",
  "seedPhrase",
  "signedTransaction",
]) {
  assert.ok(!serialized.includes(forbidden), `Plan JSON must not contain ${forbidden}.`);
  assert.ok(!exportRun.stdout.includes(forbidden), `Plan export must not contain ${forbidden}.`);
}

const missing = spawnSync("node", [scriptPath], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...env,
    VANTA_ACTUAL_PRIVATE_NULLIFIER: "",
  },
});
assert.notEqual(missing.status, 0, "Plan JSON builder must fail closed when a required term is missing.");
assert.match(missing.stderr, /VANTA_ACTUAL_PRIVATE_NULLIFIER/);

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-plan-json"],
  "node scripts/print-vanta-actual-private-settlement-plan-json.mjs --export",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-plan-json-check"],
  "node scripts/check-vanta-actual-private-settlement-plan-json.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-settlement-plan-json-check"),
);

console.log("Vanta actual-private settlement plan JSON check: PASS");

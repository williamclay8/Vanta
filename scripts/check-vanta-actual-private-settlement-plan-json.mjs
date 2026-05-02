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
  VANTA_ACTUAL_PRIVATE_CHANGE_LEAF_INDEX: "43",
  VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT: "commitment:change-output",
  VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_ROOT: "root:change-output",
  VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT: "commitment:economics",
  VANTA_ACTUAL_PRIVATE_NULLIFIER: "nullifier:actual-private-live-candidate",
  VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT: "commitment:merchant-output",
  VANTA_ACTUAL_PRIVATE_OUTPUT_LEAF_INDEX: "42",
  VANTA_ACTUAL_PRIVATE_OUTPUT_ROOT: "root:merchant-output",
  VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT: "commitment:owner",
  VANTA_ACTUAL_PRIVATE_POOL_ID: "pool:stablecoin-usdc-v1",
  VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH: "context:actual-private-live-candidate",
  VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH: "public-input-hash:actual-private-live-candidate",
  VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT: "commitment:route",
  VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT: "commitment:settlement",
  VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID: "settlement:actual-private-live-candidate",
};
const unshieldEnv = {
  ...env,
  VANTA_ACTUAL_PRIVATE_ACTION: "unshield",
  VANTA_ACTUAL_PRIVATE_EXIT_TERMS_COMMITMENT: "commitment:exit-terms",
  VANTA_ACTUAL_PRIVATE_INPUT_COMMITMENT: "commitment:input-note",
  VANTA_ACTUAL_PRIVATE_INPUT_ROOT: "root:input",
  VANTA_ACTUAL_PRIVATE_UNSHIELD_CONTEXT_TAG: "context:actual-private-unshield-live-candidate",
  VANTA_ACTUAL_PRIVATE_UNSHIELD_PUBLIC_INPUT_HASH:
    "public-input-hash:actual-private-unshield-live-candidate",
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
assert.equal(planJson.changeLeafIndex, env.VANTA_ACTUAL_PRIVATE_CHANGE_LEAF_INDEX);
assert.equal(planJson.changeOutputRoot, env.VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_ROOT);
assert.equal(planJson.nullifier, env.VANTA_ACTUAL_PRIVATE_NULLIFIER);
assert.equal(planJson.outputLeafIndex, env.VANTA_ACTUAL_PRIVATE_OUTPUT_LEAF_INDEX);
assert.equal(planJson.outputRoot, env.VANTA_ACTUAL_PRIVATE_OUTPUT_ROOT);
assert.equal(planJson.privateSpendPublicInputHash, env.VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH);
assert.equal(planJson.action, "send");
assert.equal(Object.keys(planJson).length, 19);

const unshieldRun = spawnSync("node", [scriptPath], {
  cwd: repoRoot,
  encoding: "utf8",
  env: unshieldEnv,
});
assert.equal(unshieldRun.status, 0, unshieldRun.stderr || unshieldRun.stdout);
assert.equal(unshieldRun.stderr, "");

const unshieldPlanJson = JSON.parse(unshieldRun.stdout);
assert.equal(unshieldPlanJson.action, "unshield");
assert.equal(unshieldPlanJson.exitTermsCommitment, unshieldEnv.VANTA_ACTUAL_PRIVATE_EXIT_TERMS_COMMITMENT);
assert.equal(unshieldPlanJson.inputCommitment, unshieldEnv.VANTA_ACTUAL_PRIVATE_INPUT_COMMITMENT);
assert.equal(unshieldPlanJson.inputRoot, unshieldEnv.VANTA_ACTUAL_PRIVATE_INPUT_ROOT);
assert.equal(unshieldPlanJson.unshieldContextTag, unshieldEnv.VANTA_ACTUAL_PRIVATE_UNSHIELD_CONTEXT_TAG);
assert.equal(
  unshieldPlanJson.unshieldPublicInputHash,
  unshieldEnv.VANTA_ACTUAL_PRIVATE_UNSHIELD_PUBLIC_INPUT_HASH,
);

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
  "inputLeafIndex",
  "merchantSettlementAddress",
  "payerSourceWallet",
  "rawAmount",
  "rawAsset",
  "sourceWallet",
]) {
  assert.equal(Object.hasOwn(planJson, forbidden), false, `Plan JSON must not contain key ${forbidden}.`);
  assert.equal(
    Object.hasOwn(unshieldPlanJson, forbidden),
    false,
    `Unshield plan JSON must not contain key ${forbidden}.`,
  );
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

import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packagePath = resolve(repoRoot, "package.json");
const scriptPath = resolve(repoRoot, "scripts/print-vanta-actual-private-replay-reconciliation.mjs");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const source = readFileSync(scriptPath, "utf8");

const run = spawnSync("node", [scriptPath], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "",
  },
});

assert.equal(run.status, 0, run.stderr || run.stdout);
const report = JSON.parse(run.stdout);

assert.equal(report.version, "vanta-actual-private-replay-reconciliation-0.1");
assert.equal(report.productionReady, false);
assert.equal(report.privacyClaimAllowed, false);
assert.equal(report.reconciliationStatus, "pending-authenticated-reconciliation");
assert.deepEqual(report.reconciliationBlockers, ["pending-authenticated-reconciliation"]);
assert.equal(report.authTokenEnv, "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN");
assert.equal(report.authTokenStatus, "missing");
assert.match(report.protocolSettlementRef, /^operator-protocol-settlement:[a-z0-9_]+$/);
assert.match(report.operatorReceiptRef, /^operator-receipt:[a-z0-9_]+$/);
assert.match(report.reviewedIndexerNullifierRef, /^nullifier:[a-f0-9]{20}$/);
assert.equal(
  report.authShellCommand,
  "doppler run --config prd --project vanta -- npm run mainnet:actual-private-replay-reconcile-auth",
);
assert.ok(
  report.safety.includes("No auth token values"),
  "Replay reconciliation must state the no-secret output policy.",
);

for (const forbidden of [
  "actual-private-live-candidate-2055-2220",
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "signedTransaction",
  "sendRawTransaction",
]) {
  assert.ok(!run.stdout.includes(forbidden), `Replay reconciliation output must not contain ${forbidden}.`);
}

for (const forbiddenSourceTerm of ["sendRawTransaction", "sendAndConfirmTransaction", "Keypair.fromSecretKey"]) {
  assert.ok(!source.includes(forbiddenSourceTerm), `Replay reconciliation source must not contain ${forbiddenSourceTerm}.`);
}

for (const requiredSourceTerm of [
  "/state/private-pool-v2-receipts",
  "/private-pool-v2/nullifier-replay-checks",
  "ppv2_",
  "protocolSettlement?.proofReceipt",
  "production-replay-guard-missing-reviewed-nullifier",
  "reviewed-protocol-settlement-missing-from-operator-receipts",
  "reviewed-proof-receipt-missing-from-operator-receipts",
  "operator-receipt-nullifier-mismatch",
  "mutated === false",
]) {
  assert.ok(source.includes(requiredSourceTerm), `Replay reconciliation source must include ${requiredSourceTerm}.`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-replay-reconcile"],
  "node scripts/print-vanta-actual-private-replay-reconciliation.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-replay-reconcile-auth"],
  "node scripts/print-vanta-actual-private-replay-reconciliation.mjs --require-auth",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-replay-reconcile-check"],
  "node scripts/check-vanta-actual-private-replay-reconciliation.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-replay-reconcile-check"),
  "mainnet:preflight must include actual-private replay reconciliation contract check.",
);

console.log("Vanta actual-private replay reconciliation check: PASS");

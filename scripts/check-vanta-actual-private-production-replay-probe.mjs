import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packagePath = resolve(repoRoot, "package.json");
const scriptPath = resolve(repoRoot, "scripts/print-vanta-actual-private-production-replay-probe.mjs");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const source = readFileSync(scriptPath, "utf8");

const run = spawnSync("node", [scriptPath], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "",
    VANTA_ACTUAL_PRIVATE_REPLAY_PROBE_NULLIFIER_REF: "nullifier:actual-private-live-candidate-test",
  },
});

assert.equal(run.status, 0, run.stderr || run.stdout);
const report = JSON.parse(run.stdout);

assert.equal(report.version, "vanta-actual-private-production-replay-probe-0.1");
assert.equal(report.mainnetReady, false);
assert.equal(report.productionReady, false);
assert.equal(report.status, "pending-authenticated-production-probe");
assert.equal(report.probePromotionSatisfied, false);
assert.equal(report.operatorNullifierReplayRef, null);
assert.equal(report.endpoint, "/private-pool-v2/nullifier-replay-checks");
assert.equal(report.authTokenEnv, "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN");
assert.equal(report.authTokenStatus, "missing");
assert.match(report.nullifierRef, /^nullifier:[a-f0-9]{20}$/);
assert.equal(
  report.authShellCommand,
  "doppler run --config prd --project vanta -- npm run mainnet:actual-private-replay-probe-auth",
);
assert.ok(
  report.safety.includes("No auth token values"),
  "Replay probe must state the no-secret output policy.",
);

for (const forbidden of [
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
  assert.ok(!run.stdout.includes(forbidden), `Replay probe output must not contain ${forbidden}.`);
}

for (const forbiddenSourceTerm of ["sendRawTransaction", "sendAndConfirmTransaction", "Keypair.fromSecretKey"]) {
  assert.ok(!source.includes(forbiddenSourceTerm), `Replay probe source must not contain ${forbiddenSourceTerm}.`);
}

for (const requiredSourceTerm of [
  "/private-pool-v2/nullifier-replay-checks",
  "mutated === false",
  "operator-nullifier-replay:production-duplicate-rejected-",
  "probePromotionSatisfied",
  "production-replay-guard-missing-reviewed-nullifier",
  "reconciliationRequired",
]) {
  assert.ok(source.includes(requiredSourceTerm), `Replay probe source must include ${requiredSourceTerm}.`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-replay-probe"],
  "node scripts/print-vanta-actual-private-production-replay-probe.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-replay-probe-auth"],
  "node scripts/print-vanta-actual-private-production-replay-probe.mjs --require-auth",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-replay-probe-check"],
  "node scripts/check-vanta-actual-private-production-replay-probe.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-replay-probe-check"),
  "mainnet:preflight must include actual-private replay probe contract check.",
);

console.log("Vanta actual-private production replay probe check: PASS");

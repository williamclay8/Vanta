import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/private-pool-v2-production-smoke.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/private-pool-v2-production-smoke.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-private-pool-v2-production-smoke-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.realFundsAllowed, false);
assert.ok(String(evidence.runId).startsWith("prod-smoke-"), "Evidence must record a production smoke run id.");
assert.ok(Date.parse(evidence.checkedAt), "Evidence must record a parseable checkedAt timestamp.");

for (const serviceId of ["indexer", "prover", "relayer", "verifier", "operator"]) {
  const service = evidence.services.find((candidate) => candidate.id === serviceId);
  assert.ok(service, `Missing production smoke service evidence for ${serviceId}.`);
  assert.equal(service.urlRef, `VANTA_PRIVATE_POOL_V2_${serviceId.toUpperCase()}_URL`);
  assert.equal(service.health?.ok, true, `${serviceId} health evidence must pass.`);
  assert.equal(service.health?.status, 200, `${serviceId} health evidence must be HTTP 200.`);
  assert.equal(service.readiness?.ok, true, `${serviceId} readiness evidence must pass.`);
  assert.equal(service.readiness?.status, 200, `${serviceId} readiness evidence must be HTTP 200.`);
  assert.equal(service.readiness?.productionReady, false, `${serviceId} must still report productionReady false.`);
}

for (const targetId of [
  "service-health",
  "remote-runtime-readiness",
  "proof-roundtrip-simulation",
  "nullifier-replay-simulation",
  "relayer-claim-submit-simulation",
  "operator-pay-settlement-simulation",
]) {
  const target = evidence.smokeTargets.find((candidate) => candidate.id === targetId);
  assert.ok(target, `Missing smoke target evidence for ${targetId}.`);
  assert.equal(target.status, "pass", `${targetId} must have pass status.`);
}

const replayTarget = evidence.smokeTargets.find((candidate) => candidate.id === "nullifier-replay-simulation");
assert.equal(replayTarget.replayStatus, 400, "Nullifier replay smoke must record rejected duplicate status.");

const source = JSON.stringify(evidence);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "rawSecret",
  "sk_live_",
]) {
  assert.ok(!source.includes(forbidden), `Production smoke evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:production-smoke-evidence-check"],
  "node scripts/check-vanta-private-pool-v2-production-smoke-evidence.mjs",
  "package.json must expose mainnet:production-smoke-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:production-smoke-evidence-check"),
  "mainnet:preflight must include production smoke evidence check.",
);

console.log("Vanta Private Pool v2 production smoke evidence check: PASS");

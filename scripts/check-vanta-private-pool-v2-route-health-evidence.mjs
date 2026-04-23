import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/private-pool-v2-route-health.evidence.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/private-pool-v2-route-health.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

assert.equal(evidence.version, "vanta-production-private-rail-route-health-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.secretPolicy, "sanitized-no-secret-values");
assert.equal(evidence.lastPublicHealthRef, "npm run mainnet:private-rail-route-health-check");
assert.ok(evidence.lastAuthenticatedReadinessRef, "Evidence must track authenticated readiness status.");
assert.ok(evidence.safety.includes("No auth token values"), "Evidence must state the no-secret safety policy.");
assert.equal(evidence.services.length, 5, "Evidence must cover all five Private Pool v2 production services.");

const expected = new Map([
  ["indexer", ["VANTA_PRIVATE_POOL_V2_INDEXER_URL", "VANTA_INDEXER_AUTH_TOKEN_REF"]],
  ["operator", ["VANTA_PRIVATE_POOL_V2_OPERATOR_URL", "VANTA_OPERATOR_AUTH_TOKEN_REF"]],
  ["prover", ["VANTA_PRIVATE_POOL_V2_PROVER_URL", "VANTA_PROVER_AUTH_TOKEN_REF"]],
  ["relayer", ["VANTA_PRIVATE_POOL_V2_RELAYER_URL", "VANTA_RELAYER_AUTH_TOKEN_REF"]],
  ["verifier", ["VANTA_PRIVATE_POOL_V2_VERIFIER_URL", "VANTA_VERIFIER_AUTH_TOKEN_REF"]],
]);

for (const service of evidence.services) {
  const refs = expected.get(service.id);
  assert.ok(refs, `Unexpected route-health service evidence id: ${service.id}.`);
  assert.equal(service.urlRef, refs[0], `${service.id} must use checked URL ref.`);
  assert.equal(service.authTokenRef, refs[1], `${service.id} must use checked auth-token ref.`);
  assert.ok(["passed", "pending"].includes(service.publicHealth), `${service.id} public health must be status-only.`);
  assert.ok(
    ["passed", "pending"].includes(service.authenticatedReadiness),
    `${service.id} authenticated readiness must be status-only.`,
  );
}

const serialized = JSON.stringify(evidence);
for (const forbidden of [
  "postgres://",
  "postgresql://",
  "Bearer ",
  "DATABASE_URL=",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "sk_live_",
  "whsec_",
]) {
  assert.ok(!serialized.includes(forbidden), `Route-health evidence must not contain ${forbidden}.`);
}

console.log("Vanta Private Pool v2 route health evidence check: PASS");

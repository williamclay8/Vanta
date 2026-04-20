import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(repoRoot, "ops/mainnet/private-pool-v2-services.manifest.json");

assert.ok(existsSync(manifestPath), "Missing ops/mainnet/private-pool-v2-services.manifest.json.");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

assert.equal(manifest.version, "vanta-mainnet-services-manifest-0.1");
assert.equal(manifest.mainnetReady, false);
assert.equal(manifest.productionReady, false);
assert.equal(manifest.network, "mainnet-beta");
assert.equal(manifest.secretPolicy, "names-only-no-secret-values");
assert.ok(Array.isArray(manifest.services), "Manifest services must be an array.");
assert.equal(manifest.services.length, 5, "Manifest must describe all five production services.");

for (const serviceId of ["indexer", "relayer", "prover", "verifier", "operator"]) {
  const service = manifest.services.find((candidate) => candidate.id === serviceId);
  assert.ok(service, `Missing manifest service ${serviceId}.`);
  assert.ok(service.image.includes("${"), `${serviceId} image must be templated, not hard-coded.`);
  assert.ok(service.replicas.minimum >= 1, `${serviceId} must declare minimum replicas.`);
  assert.ok(service.env.every((entry) => !("value" in entry)), `${serviceId} env must not include secret values.`);
  assert.ok(service.env.some((entry) => entry.required === true), `${serviceId} must declare required env.`);
  assert.ok(service.healthChecks.length > 0, `${serviceId} must declare health checks.`);
  assert.ok(service.persistence.required === true, `${serviceId} must require persistence.`);
}

assert.ok(manifest.releaseGates.includes("npm run mainnet:readiness-check"));
assert.ok(manifest.releaseGates.includes("npm run mainnet:service-contract-check"));
assert.ok(manifest.releaseGates.includes("npm run mainnet:deployment-manifest-check"));
assert.ok(manifest.rollback.required, "Rollback plan must be required.");

console.log("Vanta mainnet deployment manifest check: PASS");

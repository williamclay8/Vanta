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
assert.ok(
  Array.isArray(manifest.stagingDeployments),
  "Manifest must include secrets-safe staging deployment references.",
);
assert.equal(
  manifest.stagingDeployments.length,
  2,
  "Manifest must describe Pay and Private Pool v2 staging deployments.",
);
assert.ok(Array.isArray(manifest.services), "Manifest services must be an array.");
assert.equal(manifest.services.length, 5, "Manifest must describe all five production services.");

for (const stagingId of ["pay", "private-pool-v2"]) {
  const service = manifest.stagingDeployments.find((candidate) => candidate.id === stagingId);
  assert.ok(service, `Missing staging deployment ${stagingId}.`);
  assert.equal(service.provider, "render", `${stagingId} staging provider must be Render.`);
  assert.equal(service.environment, "staging", `${stagingId} must be marked staging.`);
  assert.equal(service.productionReady, false, `${stagingId} must not claim production readiness.`);
  assert.ok(service.serviceId.startsWith("srv-"), `${stagingId} must include Render service id.`);
  assert.ok(service.url.startsWith("https://"), `${stagingId} must include non-secret HTTPS URL.`);
  assert.ok(service.healthChecks.includes("/health"), `${stagingId} must include health check.`);
  assert.ok(service.auth?.secretRef?.endsWith("_REF"), `${stagingId} auth must use secret ref.`);
  assert.ok(service.storage?.secretRef?.endsWith("_REF"), `${stagingId} storage must use secret ref.`);
  assert.equal(
    service.storage?.kind,
    "postgres-jsonb-snapshot-store",
    `${stagingId} staging storage must be Postgres JSONB snapshot store.`,
  );
  assert.equal(
    service.storage?.durableStoreConfigured,
    true,
    `${stagingId} staging storage must be durable-store configured.`,
  );
}

const expectedStartCommands = {
  indexer: "npm run private-pool-v2:indexer",
  operator: "npm run private-pool-v2:operator",
  prover: "npm run private-pool-v2:prover",
  relayer: "npm run private-pool-v2:relayer",
  verifier: "npm run private-pool-v2:verifier",
};

const expectedEnvNames = {
  indexer: [
    "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
    "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL",
    "VANTA_PRIVATE_POOL_V2_INDEXER_NETWORK",
    "VANTA_PRIVATE_POOL_V2_INDEXER_RPC_URL",
  ],
  operator: [
    "VANTA_PRIVATE_POOL_V2_DATABASE_URL",
    "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
    "VANTA_PRIVATE_POOL_V2_INDEXER_URL",
    "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
    "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
    "VANTA_PRIVATE_POOL_V2_PROVER_URL",
    "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
    "VANTA_PRIVATE_POOL_V2_RELAYER_URL",
    "VANTA_PRIVATE_POOL_V2_RUNTIME_MODE",
    "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN",
    "VANTA_PRIVATE_POOL_V2_VERIFIER_URL",
  ],
  prover: [
    "VANTA_PRIVATE_POOL_V2_PROVER_ARTIFACT_PATH",
    "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
    "VANTA_PRIVATE_POOL_V2_PROVER_KEYSET",
    "VANTA_PRIVATE_POOL_V2_PROVER_WORKER_COUNT",
  ],
  relayer: [
    "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
    "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL",
    "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET",
    "VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL",
  ],
  verifier: [
    "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
    "VANTA_PRIVATE_POOL_V2_INDEXER_URL",
    "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN",
    "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL",
    "VANTA_PRIVATE_POOL_V2_VERIFIER_KEYSET",
    "VANTA_PRIVATE_POOL_V2_VERIFIER_NETWORK",
  ],
};

for (const serviceId of ["indexer", "relayer", "prover", "verifier", "operator"]) {
  const service = manifest.services.find((candidate) => candidate.id === serviceId);
  assert.ok(service, `Missing manifest service ${serviceId}.`);
  assert.ok(service.image.includes("${"), `${serviceId} image must be templated, not hard-coded.`);
  assert.equal(
    service.startCommand,
    expectedStartCommands[serviceId],
    `${serviceId} must declare the checked repo start command.`,
  );
  assert.ok(service.replicas.minimum >= 1, `${serviceId} must declare minimum replicas.`);
  assert.ok(service.env.every((entry) => !("value" in entry)), `${serviceId} env must not include secret values.`);
  assert.ok(service.env.some((entry) => entry.required === true), `${serviceId} must declare required env.`);
  for (const envName of expectedEnvNames[serviceId]) {
    assert.ok(
      service.env.some((entry) => entry.name === envName && entry.required === true),
      `${serviceId} must declare required env ${envName}.`,
    );
  }
  assert.ok(service.healthChecks.length > 0, `${serviceId} must declare health checks.`);
  assert.ok(service.persistence.required === true, `${serviceId} must require persistence.`);
}

assert.ok(manifest.releaseGates.includes("npm run mainnet:readiness-check"));
assert.ok(manifest.releaseGates.includes("npm run mainnet:service-contract-check"));
assert.ok(manifest.releaseGates.includes("npm run mainnet:deployment-manifest-check"));
assert.ok(manifest.releaseGates.includes("npm run mainnet:private-pool-v2-production-smoke-check"));
assert.ok(manifest.releaseGates.includes("npm run mainnet:approval-gates-check"));
assert.ok(manifest.rollback.required, "Rollback plan must be required.");

console.log("Vanta mainnet deployment manifest check: PASS");

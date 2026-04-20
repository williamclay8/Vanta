import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const templatePath = resolve(repoRoot, "ops/mainnet/private-pool-v2-production-smoke.template.json");

assert.ok(
  existsSync(templatePath),
  "Missing ops/mainnet/private-pool-v2-production-smoke.template.json.",
);

const template = JSON.parse(readFileSync(templatePath, "utf8"));

assert.equal(template.version, "vanta-private-pool-v2-production-smoke-template-0.1");
assert.equal(template.mainnetReady, false);
assert.equal(template.productionReady, false);
assert.equal(template.runtimeMode, "remote-services");
assert.equal(template.secretPolicy, "references-only-no-secret-values");
assert.ok(template.summary.includes("Do not store raw URLs"));

for (const serviceId of ["indexer", "prover", "relayer", "verifier", "operator"]) {
  const service = template.services.find((candidate) => candidate.id === serviceId);
  assert.ok(service, `Missing Private Pool v2 production smoke service ${serviceId}.`);
  assert.ok(service.urlRef.endsWith("_REF"), `${serviceId} URL must be represented as a ref.`);
  assert.ok(service.authTokenRef.endsWith("_REF"), `${serviceId} auth token must be represented as a ref.`);
  assert.ok(service.healthEndpoint.startsWith("/"), `${serviceId} must declare health endpoint.`);
  assert.ok(service.readinessEndpoint.startsWith("/"), `${serviceId} must declare readiness endpoint.`);
  assert.ok(service.smokeTargetRef.endsWith("_REF"), `${serviceId} smoke target must be represented as a ref.`);
}

for (const requiredEnv of [
  "VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services",
  "VANTA_PRIVATE_POOL_V2_INDEXER_URL",
  "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
  "VANTA_PRIVATE_POOL_V2_PROVER_URL",
  "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
  "VANTA_PRIVATE_POOL_V2_RELAYER_URL",
  "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
  "VANTA_PRIVATE_POOL_V2_VERIFIER_URL",
  "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN",
]) {
  assert.ok(
    template.operatorRuntimeEnvironment.some((entry) => entry.name === requiredEnv || entry.assignment === requiredEnv),
    `Missing remote runtime env mapping: ${requiredEnv}`,
  );
}

for (const target of template.smokeTargets) {
  assert.equal(target.realFundsAllowed, false, `${target.id} must not allow real funds.`);
  assert.equal(target.mainnetTransactionsAllowed, false, `${target.id} must not allow mainnet transactions.`);
  assert.ok(target.requiredEvidenceRef.endsWith("_REF"), `${target.id} must use an evidence ref.`);
}

const source = JSON.stringify(template);
for (const forbidden of ["privateKey", "seedPhrase", "mnemonic", "rawSecret", "DATABASE_URL=", "Bearer "]) {
  assert.ok(!source.includes(forbidden), `Production smoke template must not contain ${forbidden}.`);
}

assert.ok(
  template.requiredVerificationCommands.includes("npm run private-pool-v2:remote-services-check"),
  "Template must include the remote services adapter check.",
);
assert.ok(
  template.requiredVerificationCommands.includes("npm run private-pool-v2:service-network-check"),
  "Template must include the service network check.",
);
assert.ok(
  template.requiredVerificationCommands.includes("npm run mainnet:private-pool-v2-production-smoke-check"),
  "Template must include its own check command.",
);

console.log("Vanta Private Pool v2 production smoke template check: PASS");

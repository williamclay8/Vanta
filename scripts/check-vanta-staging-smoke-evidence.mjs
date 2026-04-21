import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/staging-smoke-evidence.manifest.json");
const packagePath = resolve(repoRoot, "package.json");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-staging-smoke-evidence-0.1");
assert.equal(evidence.environment, "staging");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.secretPolicy, "public-health-checks-only-no-secrets");
assert.equal(evidence.status, "operator-verified");

const requiredServices = [
  ["pay", "https://vanta-0wwi.onrender.com/health", "vanta-pay"],
  ["private-pool-v2", "https://vanta-staging-private-pool-v2.onrender.com/health", "private-pool-v2"],
];

assert.ok(Array.isArray(evidence.services), "Staging smoke evidence must include services.");
for (const [id, healthUrl, expectedService] of requiredServices) {
  const service = evidence.services.find((candidate) => candidate.id === id);
  assert.ok(service, `Missing staging smoke service: ${id}.`);
  assert.equal(service.healthUrl, healthUrl);
  assert.equal(service.expectedStatus, 200);
  assert.equal(service.result, "pass");
  assert.ok(service.evidenceRef.endsWith("_REF"), `${id} must use evidence refs.`);
  assert.ok(
    service.responseShape.ok === true || service.responseShape.service === expectedService,
    `${id} must record a safe response shape.`,
  );
}

for (const phrase of [
  "staging only",
  "not production role-service smoke evidence",
  "not mainnet funds approval",
]) {
  assert.ok(evidence.limitations.includes(phrase), `Missing staging smoke limitation: ${phrase}`);
}

const serialized = JSON.stringify(evidence);
for (const forbidden of [
  "Authorization",
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
]) {
  assert.ok(!serialized.includes(forbidden), `Staging smoke evidence must not include ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:staging-smoke-evidence-check"],
  "node scripts/check-vanta-staging-smoke-evidence.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:staging-smoke-evidence-check"),
  "mainnet:preflight must include staging smoke evidence check.",
);

console.log("Vanta staging smoke evidence check: PASS");

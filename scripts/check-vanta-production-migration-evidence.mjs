import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/production-migration-evidence.manifest.json");
const packagePath = resolve(repoRoot, "package.json");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-production-migration-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.secretPolicy, "references-only-no-credentials");
assert.equal(evidence.status, "operator-reported");
assert.equal(evidence.migrationName, "001_vanta_mainnet_storage.sql");
assert.equal(evidence.migrationPath, "ops/storage/postgres/001_vanta_mainnet_storage.sql");
assert.equal(
  evidence.checksum,
  "98dd86ab93574d38770535efdd90e6ab1eb6e0359071191e26693f0ba6a5a3d3",
);

const requiredTargets = [
  "VANTA_PAY_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_PROVER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL_REF",
  "VANTA_STRATEGY_DATABASE_URL_REF",
  "VANTA_OPERATOR_DATABASE_URL_REF",
];

assert.ok(Array.isArray(evidence.targets), "Migration evidence must include targets.");
assert.equal(evidence.targets.length, requiredTargets.length);

for (const targetRef of requiredTargets) {
  const target = evidence.targets.find((candidate) => candidate.targetRef === targetRef);
  assert.ok(target, `Missing production migration target evidence: ${targetRef}.`);
  assert.equal(target.status, "applied-operator-reported");
  assert.ok(target.appliedAtUtc, `${targetRef} must include appliedAtUtc.`);
  assert.ok(target.schemaVersionRef?.includes(targetRef), `${targetRef} must include schema version ref.`);
  assert.equal(target.commandRef, "npm run mainnet:production-db-migration-apply");
}

for (const phrase of [
  "productionReady remains false",
  "mainnetReady remains false",
  "operator-reported evidence",
  "not a backup restore drill",
]) {
  assert.ok(evidence.limitations.includes(phrase), `Migration evidence missing limitation: ${phrase}`);
}

const serialized = JSON.stringify(evidence);
for (const forbidden of [
  "postgres://",
  "postgresql://",
  "DATABASE_URL=",
  "password",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "Bearer ",
]) {
  assert.ok(!serialized.includes(forbidden), `Migration evidence must not include ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:production-migration-evidence-check"],
  "node scripts/check-vanta-production-migration-evidence.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:production-migration-evidence-check"),
  "mainnet:preflight must include production migration evidence check.",
);

console.log("Vanta production migration evidence check: PASS");

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/production-restore-drill.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/production-restore-drill.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-production-restore-drill-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.secretPolicy, "references-only-no-credentials");
assert.equal(evidence.status, "partial-operator-reported");
assert.ok(Array.isArray(evidence.targets), "Restore drill evidence must include targets.");

const privatePoolTarget = evidence.targets.find((candidate) => candidate.id === "privatePoolV2Operator");
assert.ok(privatePoolTarget, "Restore drill evidence must include Private Pool v2 operator target.");
assert.equal(privatePoolTarget.sourceDatabaseRef, "VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF");
assert.ok(
  privatePoolTarget.restoreDatabaseRef.startsWith("restore-drill/"),
  "Restore drill database evidence must be a reference, not a raw provider URL.",
);
assert.equal(privatePoolTarget.status, "restore-target-created-awaiting-readback");
assert.equal(privatePoolTarget.readbackStatus, "pending");
assert.equal(privatePoolTarget.readbackCommandRef, "npm run mainnet:production-restore-drill-readback");

for (const requiredCheck of [
  "schema-version-readback",
  "private-pool-v2-core-tables-present",
  "nullifier-unique-index-present",
  "settlement-table-present",
  "operator-event-table-present",
]) {
  assert.ok(
    privatePoolTarget.requiredReadbackChecks.includes(requiredCheck),
    `Restore drill evidence missing readback check: ${requiredCheck}.`,
  );
}

for (const blocker of [
  "readback-passed",
  "backup-policy-confirmed",
  "pitr-enabled",
  "encrypted-backups-enabled",
  "backup-access-audit-enabled",
  "least-privilege-restore-user-confirmed",
]) {
  assert.ok(privatePoolTarget.blockedUntil.includes(blocker), `Restore drill evidence missing blocker: ${blocker}.`);
}

for (const limitation of [
  "operator-reported restore target creation only",
  "readback has not been recorded in this evidence file",
  "productionReady remains false",
  "mainnetReady remains false",
  "not proof of successful recovery",
]) {
  assert.ok(evidence.limitations.includes(limitation), `Restore drill evidence missing limitation: ${limitation}.`);
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
  "sk_live_",
]) {
  assert.ok(!serialized.includes(forbidden), `Restore drill evidence must not include ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:production-restore-drill-evidence-check"],
  "node scripts/check-vanta-production-restore-drill-evidence.mjs",
  "package.json must expose mainnet:production-restore-drill-evidence-check.",
);
assert.equal(
  packageJson.scripts["mainnet:production-restore-drill-readback"],
  "node scripts/check-vanta-production-restore-drill-readback.mjs",
  "package.json must expose mainnet:production-restore-drill-readback.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:production-restore-drill-evidence-check"),
  "mainnet:preflight must include production restore drill evidence check.",
);

console.log("Vanta production restore drill evidence check: PASS");

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

const operatorTarget = evidence.targets.find((candidate) => candidate.id === "operatorControlPlane");
assert.ok(operatorTarget, "Restore drill evidence must include operator control-plane target.");
assert.equal(operatorTarget.sourceDatabaseRef, "VANTA_OPERATOR_DATABASE_URL_REF");
assert.ok(
  operatorTarget.restoreDatabaseRef.startsWith("restore-drill/"),
  "Restore drill database evidence must be a reference, not a raw provider URL.",
);
assert.equal(operatorTarget.status, "restore-readback-passed");
assert.equal(operatorTarget.readbackStatus, "passed");
assert.ok(Date.parse(operatorTarget.readbackAtUtc), "Operator restore target must record readbackAtUtc.");
assert.equal(operatorTarget.readbackCommandRef, "npm run mainnet:production-restore-drill-readback");

const privatePoolCoreTarget = evidence.targets.find((candidate) => candidate.id === "privatePoolV2Core");
assert.ok(privatePoolCoreTarget, "Restore drill evidence must include Private Pool v2 core target.");
assert.equal(privatePoolCoreTarget.sourceDatabaseRef, "VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF");
assert.equal(privatePoolCoreTarget.status, "restore-readback-passed");
assert.equal(privatePoolCoreTarget.readbackStatus, "passed");
assert.ok(Date.parse(privatePoolCoreTarget.readbackAtUtc), "Private Pool v2 core restore target must record readbackAtUtc.");
assert.ok(
  privatePoolCoreTarget.restoreDatabaseRef.startsWith("restore-drill/"),
  "Private Pool v2 core restore drill database evidence must be a reference.",
);

const privatePoolRolesTarget = evidence.targets.find((candidate) => candidate.id === "privatePoolV2Roles");
assert.ok(privatePoolRolesTarget, "Restore drill evidence must include Private Pool v2 role-service target.");
assert.deepEqual(privatePoolRolesTarget.sourceDatabaseRefs, [
  "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_PROVER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL_REF",
]);
assert.equal(privatePoolRolesTarget.status, "restore-readback-passed");
assert.equal(privatePoolRolesTarget.readbackStatus, "passed");
assert.ok(Date.parse(privatePoolRolesTarget.readbackAtUtc), "Private Pool v2 roles restore target must record readbackAtUtc.");
assert.ok(
  privatePoolRolesTarget.restoreDatabaseRef.startsWith("restore-drill/"),
  "Private Pool v2 roles restore drill database evidence must be a reference.",
);

const strategyTarget = evidence.targets.find((candidate) => candidate.id === "strategy");
assert.ok(strategyTarget, "Restore drill evidence must include Strategy target.");
assert.equal(strategyTarget.sourceDatabaseRef, "VANTA_STRATEGY_DATABASE_URL_REF");
assert.equal(strategyTarget.status, "restore-readback-passed");
assert.equal(strategyTarget.readbackStatus, "passed");
assert.ok(Date.parse(strategyTarget.readbackAtUtc), "Strategy restore target must record readbackAtUtc.");
assert.ok(
  strategyTarget.restoreDatabaseRef.startsWith("restore-drill/"),
  "Strategy restore drill database evidence must be a reference.",
);

for (const requiredCheck of [
  "schema-version-readback",
  "private-pool-v2-core-tables-present",
  "nullifier-unique-index-present",
  "settlement-table-present",
  "operator-event-table-present",
]) {
  assert.ok(
    operatorTarget.requiredReadbackChecks.includes(requiredCheck),
    `Operator restore drill evidence missing readback check: ${requiredCheck}.`,
  );
  assert.ok(
    privatePoolCoreTarget.requiredReadbackChecks.includes(requiredCheck),
    `Private Pool v2 core restore drill evidence missing readback check: ${requiredCheck}.`,
  );
}

for (const requiredCheck of [
  "schema-version-readback",
  "private-pool-v2-role-target-refs-readback",
  "role-snapshot-table-present",
  "role-snapshot-index-present",
]) {
  assert.ok(
    privatePoolRolesTarget.requiredReadbackChecks.includes(requiredCheck),
    `Private Pool v2 roles restore drill evidence missing readback check: ${requiredCheck}.`,
  );
}

for (const requiredCheck of ["schema-version-readback", "strategy-target-ref-readback"]) {
  assert.ok(
    strategyTarget.requiredReadbackChecks.includes(requiredCheck),
    `Strategy restore drill evidence missing readback check: ${requiredCheck}.`,
  );
}

for (const blocker of [
  "backup-policy-confirmed",
  "pitr-enabled",
  "encrypted-backups-enabled",
  "backup-access-audit-enabled",
  "least-privilege-restore-user-confirmed",
]) {
  assert.ok(operatorTarget.acceptedRisks.includes(blocker), `Operator restore drill evidence missing accepted risk: ${blocker}.`);
  assert.ok(
    privatePoolCoreTarget.acceptedRisks.includes(blocker),
    `Private Pool v2 core restore drill evidence missing accepted risk: ${blocker}.`,
  );
  assert.ok(
    privatePoolRolesTarget.acceptedRisks.includes(blocker),
    `Private Pool v2 roles restore drill evidence missing accepted risk: ${blocker}.`,
  );
  assert.ok(strategyTarget.acceptedRisks.includes(blocker), `Strategy restore drill evidence missing accepted risk: ${blocker}.`);
}

for (const limitation of [
  "operator control-plane restore readback passed",
  "Private Pool v2 core restore readback passed",
  "Private Pool v2 role-service restore readback passed",
  "Strategy restore readback passed",
  "Pay restore readback was skipped by operator decision",
  "productionReady remains false",
  "mainnetReady remains false",
  "backup policy, PITR, encryption, access audit, and least-privilege restore evidence were skipped by operator decision",
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

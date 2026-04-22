import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/production-backup-restore.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/production-backup-restore.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-production-backup-restore-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.secretPolicy, "references-only-no-credentials");
assert.equal(evidence.status, "partial-readback-only");
assert.equal(evidence.templateRef, "ops/mainnet/production-backup-restore.template.json");
assert.equal(evidence.migrationEvidenceRef, "ops/mainnet/production-migration-evidence.manifest.json");
assert.equal(evidence.restoreDrillEvidenceRef, "ops/mainnet/production-restore-drill.evidence.json");
assert.equal(evidence.operatorDecision?.id, "skip-provider-backup-restore-controls-for-now");
assert.ok(Date.parse(evidence.operatorDecision.decidedAtUtc), "Operator backup/restore decision must record decidedAtUtc.");
assert.ok(
  evidence.operatorDecision.effect.includes("productionReady") &&
    evidence.operatorDecision.effect.includes("mainnetReady"),
  "Operator backup/restore decision must state readiness impact.",
);
assert.ok(Array.isArray(evidence.globalEvidence), "Backup/restore evidence must include global evidence.");
assert.ok(Array.isArray(evidence.stores), "Backup/restore evidence must include stores.");

for (const id of [
  "backup-policy-confirmed",
  "pitr-enabled",
  "encrypted-backups-enabled",
  "backup-access-audit-enabled",
  "least-privilege-restore-user-confirmed",
]) {
  const gate = evidence.globalEvidence.find((candidate) => candidate.id === id);
  assert.ok(gate, `Missing backup/restore global evidence gate: ${id}.`);
  assert.equal(gate.status, "pending", `${id} must stay pending until external provider evidence exists.`);
  assert.ok(gate.requiredRefPattern, `${id} must describe the reference pattern operators need to collect.`);
}

const requiredStores = new Map([
  [
    "pay",
    {
      refs: ["VANTA_PAY_DATABASE_URL_REF"],
      readback: "pending",
    },
  ],
  ["privatePoolV2", { refs: ["VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF"], readback: "passed" }],
  [
    "privatePoolV2Roles",
    {
      refs: [
        "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL_REF",
        "VANTA_PRIVATE_POOL_V2_PROVER_DATABASE_URL_REF",
        "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL_REF",
        "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL_REF",
      ],
      readback: "passed",
    },
  ],
  ["strategy", { refs: ["VANTA_STRATEGY_DATABASE_URL_REF"], readback: "passed" }],
  ["operator", { refs: ["VANTA_OPERATOR_DATABASE_URL_REF"], readback: "passed" }],
]);

for (const [storeId, expectation] of requiredStores) {
  const store = evidence.stores.find((candidate) => candidate.id === storeId);
  assert.ok(store, `Missing backup/restore evidence store: ${storeId}.`);
  assert.deepEqual(store.databaseRefs, expectation.refs, `${storeId} database refs drifted.`);
  assert.equal(store.migrationStatus, expectation.migration ?? "applied-operator-reported");
  assert.equal(store.restoreReadbackStatus, expectation.readback, `${storeId} restore readback status drifted.`);
  assert.equal(store.backupControlStatus, "pending", `${storeId} backup controls must remain pending until provider evidence exists.`);

  for (const blocker of [
    "backup-policy-confirmed",
    "pitr-enabled",
    "encrypted-backups-enabled",
    "backup-access-audit-enabled",
    "least-privilege-restore-user-confirmed",
  ]) {
    assert.ok(store.blockedUntil.includes(blocker), `${storeId} missing blocker: ${blocker}.`);
  }

  if (expectation.readback === "pending") {
    assert.ok(store.blockedUntil.includes("restore-readback-passed"), `${storeId} must block on restore readback.`);
  } else {
    assert.ok(store.restoreDrillRef?.startsWith("restore-drill/"), `${storeId} passed readback must cite restore drill ref.`);
  }
}

for (const limitation of [
  "productionReady remains false",
  "mainnetReady remains false",
  "readback passed for Private Pool v2 core, Private Pool v2 role-service storage, Strategy, and operator/control-plane storage",
  "Pay restore readback remains pending",
  "backup policy, PITR, encrypted backup, access audit, and least-privilege restore-user evidence remain pending",
  "operator chose to skip provider backup/restore control collection for now",
]) {
  assert.ok(evidence.limitations.includes(limitation), `Backup/restore evidence missing limitation: ${limitation}.`);
}

for (const action of [
  "provider backup policy refs skipped by operator for now",
  "run restore readback for Pay",
]) {
  assert.ok(evidence.nextOperatorActions.includes(action), `Backup/restore evidence missing next action: ${action}.`);
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
  "backupDecryptionKey",
  "Bearer ",
  "sk_live_",
]) {
  assert.ok(!serialized.includes(forbidden), `Backup/restore evidence must not include ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:backup-restore-evidence-check"],
  "node scripts/check-vanta-production-backup-restore-evidence.mjs",
  "package.json must expose mainnet:backup-restore-evidence-check.",
);
assert.equal(
  packageJson.scripts["mainnet:backup-restore-status"],
  "node scripts/print-vanta-production-backup-restore-status.mjs",
  "package.json must expose mainnet:backup-restore-status.",
);
assert.equal(
  packageJson.scripts["mainnet:backup-restore-status-json"],
  "node scripts/print-vanta-production-backup-restore-status.mjs --json",
  "package.json must expose mainnet:backup-restore-status-json.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:backup-restore-evidence-check"),
  "mainnet:preflight must include backup/restore evidence check.",
);

console.log("Vanta production backup/restore evidence check: PASS");

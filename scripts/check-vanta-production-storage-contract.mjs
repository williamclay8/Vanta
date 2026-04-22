import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVantaProductionStorageContract } from "../src/readiness/productionStorageContract.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const backupRestoreTemplatePath = resolve(
  repoRoot,
  "ops/mainnet/production-backup-restore.template.json",
);
const backupRestoreEvidencePath = resolve(
  repoRoot,
  "ops/mainnet/production-backup-restore.evidence.json",
);
const contract = createVantaProductionStorageContract();

assert.equal(contract.version, "vanta-production-storage-contract-0.1");
assert.equal(contract.productionReady, false);
assert.equal(contract.mainnetReady, false);
assert.equal(contract.secretPolicy, "names-only-no-secret-values");
assert.equal(
  contract.backupRestoreTemplatePath,
  "ops/mainnet/production-backup-restore.template.json",
  "Storage contract must point at the production backup/restore template.",
);
assert.equal(
  contract.backupRestoreEvidencePath,
  "ops/mainnet/production-backup-restore.evidence.json",
  "Storage contract must point at the production backup/restore evidence surface.",
);

const requiredStores = ["pay", "privatePoolV2", "strategy", "operator"];
for (const storeId of requiredStores) {
  const store = contract.stores.find((candidate) => candidate.id === storeId);
  assert.ok(store, `Missing production storage contract for ${storeId}.`);
  assert.equal(store.status, "not-wired");
  assert.ok(store.requiredTables.length > 0, `${storeId} must declare required tables.`);
  assert.ok(store.requiredIndexes.length > 0, `${storeId} must declare required indexes.`);
  assert.ok(store.requiredMigrations.length > 0, `${storeId} must declare required migrations.`);
  assert.ok(store.restoreChecks.length > 0, `${storeId} must declare restore checks.`);
  assert.ok(store.safetyRequirements.includes("idempotent-writes"), `${storeId} must require idempotent writes.`);
  assert.ok(store.safetyRequirements.includes("replay-safe-uniqueness"), `${storeId} must require replay-safe uniqueness.`);
}

const privatePoolStore = contract.stores.find((candidate) => candidate.id === "privatePoolV2");
assert.ok(
  privatePoolStore.requiredIndexes.includes("pool_nullifiers.context,nullifier unique"),
  "Private Pool v2 storage must require context-scoped nullifier uniqueness.",
);
assert.ok(
  privatePoolStore.requiredIndexes.includes("pool_nullifiers.context,request_id unique"),
  "Private Pool v2 storage must require context-scoped idempotent request uniqueness.",
);
assert.ok(
  privatePoolStore.restoreChecks.includes("context-scoped-nullifier-replay-rejection"),
  "Private Pool v2 restore checks must include context-scoped replay rejection.",
);

assert.ok(
  contract.globalRequirements.includes("point-in-time-recovery"),
  "Missing point-in-time recovery requirement.",
);
assert.ok(contract.globalRequirements.includes("schema-version-table"), "Missing schema version table requirement.");
assert.ok(contract.globalRequirements.includes("encrypted-backups"), "Missing encrypted backup requirement.");
assert.ok(contract.globalRequirements.includes("least-privilege-db-users"), "Missing least privilege DB users requirement.");
assert.ok(contract.globalRequirements.includes("no-secret-values-in-manifests"), "Missing secret hygiene requirement.");

assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:storage-contract-check"),
  "Missing storage contract verification command.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:backup-restore-check"),
  "Missing backup/restore verification command.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:backup-restore-evidence-check"),
  "Missing backup/restore evidence verification command.",
);
assert.ok(
  contract.nextImplementationStep.includes("backup"),
  "Next implementation step should target backup/restore evidence.",
);
assert.ok(
  existsSync(backupRestoreTemplatePath),
  "Missing ops/mainnet/production-backup-restore.template.json.",
);
assert.ok(
  existsSync(backupRestoreEvidencePath),
  "Missing ops/mainnet/production-backup-restore.evidence.json.",
);

const backupRestoreTemplate = JSON.parse(readFileSync(backupRestoreTemplatePath, "utf8"));
assert.equal(backupRestoreTemplate.version, "vanta-production-backup-restore-template-0.1");
assert.equal(backupRestoreTemplate.mainnetReady, false);
assert.equal(backupRestoreTemplate.productionReady, false);
assert.equal(backupRestoreTemplate.secretPolicy, "references-only-no-credentials");

const backupRestoreEvidence = JSON.parse(readFileSync(backupRestoreEvidencePath, "utf8"));
assert.equal(backupRestoreEvidence.version, "vanta-production-backup-restore-evidence-0.1");
assert.equal(backupRestoreEvidence.mainnetReady, false);
assert.equal(backupRestoreEvidence.productionReady, false);
assert.equal(backupRestoreEvidence.secretPolicy, "references-only-no-credentials");

console.log("Vanta production storage contract check: PASS");

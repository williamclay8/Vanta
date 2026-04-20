import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(repoRoot, "ops/mainnet/production-backup-restore.template.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

assert.equal(manifest.version, "vanta-production-backup-restore-template-0.1");
assert.equal(manifest.mainnetReady, false);
assert.equal(manifest.productionReady, false);
assert.equal(manifest.secretPolicy, "references-only-no-credentials");
assert.equal(manifest.storageProvider, "render-postgres-or-production-equivalent");
assert.ok(Array.isArray(manifest.stores), "Backup/restore template must include stores.");

for (const requirement of [
  "point-in-time-recovery",
  "encrypted-backups",
  "restore-drill-before-mainnet",
  "least-privilege-db-users",
  "backup-access-audit",
]) {
  assert.ok(manifest.globalRequirements.includes(requirement), `Missing global requirement: ${requirement}.`);
}

const requiredStores = new Map([
  ["pay", "vanta-pay-production-db-pending"],
  ["privatePoolV2", "vanta-private-pool-v2-production-db-pending"],
  ["privatePoolV2Roles", "vanta-private-pool-v2-roles-production-db-pending"],
  ["strategy", "vanta-strategy-production-db-pending"],
  ["operator", "vanta-operator-production-db-pending"],
]);

for (const [storeId, databaseRef] of requiredStores) {
  const store = manifest.stores.find((candidate) => candidate.id === storeId);
  assert.ok(store, `Missing backup/restore store entry: ${storeId}.`);
  assert.equal(store.databaseRef, databaseRef);
  assert.ok(store.backupPolicyRef, `${storeId} must declare a backup policy ref.`);
  assert.ok(store.migrationAppliedRef, `${storeId} must declare a migration applied evidence ref.`);
  assert.ok(store.migrationCommandRef, `${storeId} must declare a migration command ref.`);
  assert.ok(store.schemaVersionRef, `${storeId} must declare a schema version evidence ref.`);
  assert.ok(store.pitrRef, `${storeId} must declare a PITR ref.`);
  assert.ok(store.encryptionRef, `${storeId} must declare an encryption ref.`);
  assert.ok(store.restoreDrillRef, `${storeId} must declare a restore drill ref.`);
  assert.ok(store.restoreRunbookRef, `${storeId} must declare a restore runbook ref.`);
  assert.ok(store.accessAuditLogRef, `${storeId} must declare an access audit log ref.`);
  assert.ok(store.leastPrivilegeUserRef, `${storeId} must declare a least-privilege user ref.`);
  assert.ok(store.blockedUntil.includes("restore-drill-passed"), `${storeId} must block on restore drill.`);
  assert.ok(store.blockedUntil.includes("pitr-enabled"), `${storeId} must block on PITR.`);
}

const serialized = JSON.stringify(manifest);
for (const forbidden of [
  "postgres://",
  "DATABASE_URL=",
  "password",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "backupDecryptionKey",
  "Bearer ",
  "sk_live_",
]) {
  assert.ok(!serialized.includes(forbidden), `Backup/restore template must not include ${forbidden}.`);
}

console.log("Vanta production backup/restore template check: PASS");

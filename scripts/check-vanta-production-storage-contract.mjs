import { strict as assert } from "node:assert";
import { createVantaProductionStorageContract } from "../src/readiness/productionStorageContract.mjs";

const contract = createVantaProductionStorageContract();

assert.equal(contract.version, "vanta-production-storage-contract-0.1");
assert.equal(contract.productionReady, false);
assert.equal(contract.mainnetReady, false);
assert.equal(contract.secretPolicy, "names-only-no-secret-values");

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
  contract.nextImplementationStep.includes("database adapter"),
  "Next implementation step should target database adapters.",
);

console.log("Vanta production storage contract check: PASS");

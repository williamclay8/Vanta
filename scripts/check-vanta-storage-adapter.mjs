import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createJsonSnapshotStore } from "../src/storage/vantaJsonSnapshotStore.mjs";

const tempRoot = mkdtempSync(resolve(".tmp/vanta-storage-adapter-"));
const storePath = join(tempRoot, "state.json");
const store = createJsonSnapshotStore({
  defaultSnapshot: { events: [], stateVersion: 1 },
  path: storePath,
  stateVersion: 1,
});

assert.equal(store.kind, "local-json-snapshot-store");
assert.equal(store.productionReady, false);
assert.equal(store.path, storePath);
assert.deepEqual(store.load(), { events: [], stateVersion: 1 });

store.save({ events: [{ id: "evt_1", type: "payment.completed" }], stateVersion: 1 });
const restored = store.load();
assert.deepEqual(restored.events, [{ id: "evt_1", type: "payment.completed" }]);
assert.equal(restored.stateVersion, 1);
assert.match(restored.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

const stored = JSON.parse(readFileSync(storePath, "utf8"));
assert.equal(stored.stateVersion, 1);
assert.match(stored.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

const backupPath = join(tempRoot, "backup.json");
const backup = store.createBackup(backupPath);
assert.equal(backup.kind, "local-json-snapshot-backup");
assert.equal(backup.path, backupPath);
assert.equal(backup.stateVersion, 1);

store.save({ events: [{ id: "evt_2", type: "payment.refunded" }], stateVersion: 1 });
assert.deepEqual(store.load().events, [{ id: "evt_2", type: "payment.refunded" }]);

const restoredBackup = store.restoreBackup(backupPath);
assert.equal(restoredBackup.kind, "local-json-snapshot-restore");
assert.equal(restoredBackup.path, storePath);
assert.equal(restoredBackup.stateVersion, 1);
assert.deepEqual(store.load().events, [{ id: "evt_1", type: "payment.completed" }]);

assert.throws(
  () =>
    createJsonSnapshotStore({
      allowInProduction: false,
      path: storePath,
      runtimeEnvironment: "production",
      stateVersion: 1,
    }),
  /not production storage/i,
);

console.log("Vanta storage adapter check: PASS");

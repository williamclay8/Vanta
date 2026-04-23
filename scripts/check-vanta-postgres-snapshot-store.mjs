import assert from "node:assert/strict";

import {
  createPostgresPoolOptions,
  createPostgresSnapshotStore,
} from "../src/storage/vantaPostgresSnapshotStore.mjs";

function createFakePostgresClient() {
  const calls = [];
  let row = null;

  return {
    calls,
    async query(sql, params = []) {
      calls.push({ params, sql });

      if (sql.includes("CREATE TABLE")) {
        return { rows: [] };
      }

      if (sql.includes("SELECT snapshot")) {
        return { rows: row ? [row] : [] };
      }

      if (sql.includes("INSERT INTO")) {
        row = {
          snapshot: JSON.parse(params[1]),
          state_version: params[2],
        };
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL in fake Postgres client: ${sql}`);
    },
  };
}

const defaultSnapshot = { events: [], stateVersion: 1 };

const poolOptions = createPostgresPoolOptions("postgresql://example.invalid/vanta");
assert.equal(poolOptions.connectionString, "postgresql://example.invalid/vanta");
assert.equal(poolOptions.max, 1);
assert.equal(poolOptions.connectionTimeoutMillis, 5_000);
assert.equal(poolOptions.idleTimeoutMillis, 10_000);
assert.deepEqual(poolOptions.ssl, { rejectUnauthorized: false });

const client = createFakePostgresClient();
const store = await createPostgresSnapshotStore({
  client,
  defaultSnapshot,
  stateVersion: 1,
  storeKey: "vanta-pay",
});

assert.equal(store.kind, "postgres-jsonb-snapshot-store");
assert.equal(store.path, null);
assert.equal(store.productionReady, false);

const initialSnapshot = await store.load();
assert.deepEqual(initialSnapshot, defaultSnapshot);
assert.ok(
  client.calls.some((call) => call.sql.includes("CREATE TABLE IF NOT EXISTS vanta_operator_snapshots")),
  "Expected Postgres snapshot table bootstrap.",
);

await store.save({
  events: [{ id: "evt_1", type: "payment.completed" }],
  stateVersion: 1,
});

const restoredSnapshot = await store.load();
assert.deepEqual(restoredSnapshot.events, [{ id: "evt_1", type: "payment.completed" }]);
assert.equal(restoredSnapshot.stateVersion, 1);
assert.match(restoredSnapshot.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

console.log("Vanta Postgres snapshot store check: PASS");

import assert from "node:assert/strict";

import { createPostgresSnapshotStore } from "../src/storage/vantaPostgresSnapshotStore.mjs";
import { createPrivatePoolV2ReceiptStore } from "../operator/private-pool-v2-store.mjs";

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

const client = createFakePostgresClient();
const snapshotStore = await createPostgresSnapshotStore({
  client,
  defaultSnapshot: null,
  stateVersion: 2,
  storeKey: "vanta-private-pool-v2",
});
const store = createPrivatePoolV2ReceiptStore({ snapshotStore });

assert.equal(store.kind, "postgres-jsonb-snapshot-store");
assert.equal(store.path, null);
assert.equal(store.productionReady, false);

const initialState = await store.load();
assert.deepEqual(initialState.commitments, []);
assert.deepEqual(initialState.nullifiers, []);
assert.deepEqual(initialState.paySettlements, []);
assert.deepEqual(initialState.protocolSettlements, []);
assert.deepEqual(initialState.receipts, []);
assert.equal(initialState.settlementPolicy, null);
assert.equal(initialState.stateVersion, 2);

await store.save({
  commitments: [
    {
      assetId: "USDC",
      commitment: "field:private-pool-v2-postgres-commitment",
      leafIndex: 0,
      merkleRoot: "field:private-pool-v2-postgres-root",
      treeId: "field:private-pool-v2-postgres-tree",
    },
  ],
  nullifiers: [{ nullifier: "field:private-pool-v2-postgres-nullifier", spentAtSlot: 9n }],
  paySettlements: [{ settlementFingerprint: "0xpay" }],
  protocolSettlements: [{ settlementFingerprint: "0xprotocol" }],
  receipts: [
    {
      assetId: "USDC",
      intent: "shield",
      publicInputCommitment: "0xpublic",
      receiptId: "receipt_postgres",
      recordedAtSlot: 9n,
      replayKey: "shield:receipt_postgres",
    },
  ],
  settlementPolicy: { version: "vanta-private-pool-v2-settlement-policy-0.1" },
});

const restoredState = await store.load();
assert.equal(restoredState.commitments.length, 1);
assert.equal(restoredState.nullifiers[0]?.spentAtSlot, 9n);
assert.equal(restoredState.paySettlements[0]?.settlementFingerprint, "0xpay");
assert.equal(restoredState.protocolSettlements[0]?.settlementFingerprint, "0xprotocol");
assert.equal(restoredState.receipts[0]?.recordedAtSlot, 9n);
assert.equal(
  restoredState.settlementPolicy?.version,
  "vanta-private-pool-v2-settlement-policy-0.1",
);
assert.ok(
  client.calls.some((call) => call.params[0] === "vanta-private-pool-v2"),
  "Expected Private Pool v2 store key to be used.",
);

console.log("Vanta Private Pool v2 Postgres store check: PASS");

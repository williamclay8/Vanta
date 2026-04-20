import { strict as assert } from "node:assert";
import { createPostgresNullifierReplayStore } from "../src/privacy/postgresNullifierReplayStore.mjs";

function createFakeClient() {
  const rows = [];

  return {
    rows,
    async query(sql, params = []) {
      if (
        sql.includes("CREATE TABLE IF NOT EXISTS") ||
        sql.includes("CREATE UNIQUE INDEX IF NOT EXISTS")
      ) {
        return { rows: [] };
      }

      if (sql.includes("INSERT INTO pool_nullifiers")) {
        const [context, nullifier, requestId, assetId, spentAtSlot, claimReceiptId] = params;
        const conflict = rows.find(
          (row) => row.nullifier === nullifier || (row.context === context && row.request_id === requestId),
        );

        if (conflict) {
          return { rows: [] };
        }

        const row = {
          asset_id: assetId,
          claim_receipt_id: claimReceiptId,
          context,
          nullifier,
          request_id: requestId,
          spent_at_slot: spentAtSlot,
          status: "reserved",
        };
        rows.push(row);
        return { rows: [row] };
      }

      if (sql.includes("WHERE context = $1 AND nullifier = $2")) {
        const [context, nullifier] = params;
        return {
          rows: rows.filter((row) => row.context === context && row.nullifier === nullifier),
        };
      }

      if (sql.includes("WHERE context = $1 AND request_id = $2")) {
        const [context, requestId] = params;
        return {
          rows: rows.filter((row) => row.context === context && row.request_id === requestId),
        };
      }

      if (sql.includes("ORDER BY created_at ASC")) {
        return { rows };
      }

      throw new Error(`Unexpected fake SQL: ${sql}`);
    },
  };
}

const client = createFakeClient();
const store = createPostgresNullifierReplayStore({ client });

assert.equal(store.kind, "postgres-nullifier-replay-store");
assert.equal(store.productionReady, false);
assert.equal(store.storageMode, "postgres-unique-index");

const first = await store.reserve({
  assetId: "USDC",
  context: "private-pool-v2-claim",
  nullifier: "nf_prod_001",
  requestId: "claim_001",
});
assert.equal(first.accepted, true);
assert.equal(first.replay, false);
assert.equal(first.reason, "durable-nullifier-reserved");

const idempotent = await store.reserve({
  assetId: "USDC",
  context: "private-pool-v2-claim",
  nullifier: "nf_prod_001",
  requestId: "claim_001",
});
assert.equal(idempotent.accepted, true);
assert.equal(idempotent.idempotent, true);
assert.equal(idempotent.reason, "idempotent-durable-nullifier-reservation");

const replay = await store.reserve({
  assetId: "USDC",
  context: "private-pool-v2-claim",
  nullifier: "nf_prod_001",
  requestId: "claim_002",
});
assert.equal(replay.accepted, false);
assert.equal(replay.replay, true);
assert.equal(replay.reason, "conflicting-durable-nullifier-replay");

const requestConflict = await store.reserve({
  assetId: "USDC",
  context: "private-pool-v2-claim",
  nullifier: "nf_prod_002",
  requestId: "claim_001",
});
assert.equal(requestConflict.accepted, false);
assert.equal(requestConflict.replay, true);
assert.equal(requestConflict.reason, "conflicting-durable-request-replay");

const preflight = await store.check({
  context: "private-pool-v2-claim",
  nullifier: "nf_prod_001",
  requestId: "claim_003",
});
assert.equal(preflight.accepted, false);
assert.equal(preflight.mutated, false);
assert.equal(preflight.reason, "conflicting-durable-nullifier-replay");
assert.equal((await store.snapshot()).length, 1);

console.log("Vanta Postgres nullifier replay store check: PASS");

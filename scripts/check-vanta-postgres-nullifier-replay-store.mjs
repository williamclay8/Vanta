import { strict as assert } from "node:assert";
import { createPostgresNullifierReplayStore } from "../src/privacy/postgresNullifierReplayStore.mjs";

function compactSql(sql) {
  return sql.replace(/\s+/g, " ").trim();
}

async function runFakeQuery({ calls, rows, sql, params = [] }) {
  calls.push({ params, sql });
  const compacted = compactSql(sql);

  if (["BEGIN", "COMMIT", "ROLLBACK"].includes(compacted)) {
    return { rows: [] };
  }

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

  if (sql.includes("SET claim_receipt_id = $4, status = 'accepted'")) {
    const [context, nullifier, requestId, claimReceiptId] = params;
    const row = rows.find(
      (candidate) =>
        candidate.context === context &&
        candidate.nullifier === nullifier &&
        candidate.request_id === requestId,
    );

    if (!row) {
      return { rows: [] };
    }

    row.claim_receipt_id = claimReceiptId;
    row.status = "accepted";
    return { rows: [row] };
  }

  if (sql.includes("WHERE context = $1 AND nullifier = $2")) {
    const [context, nullifier] = params;
    return {
      rows: rows.filter((row) => row.context === context && row.nullifier === nullifier),
    };
  }

  if (sql.includes("WHERE nullifier = $1")) {
    const [nullifier] = params;
    return {
      rows: rows.filter((row) => row.nullifier === nullifier),
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
}

function createFakeClient({ calls = [], rows = [] } = {}) {
  return {
    calls,
    rows,
    async query(sql, params = []) {
      return runFakeQuery({ calls, params, rows, sql });
    },
  };
}

function createFakePool() {
  const rows = [];
  const poolCalls = [];
  const transactionCalls = [];
  let released = false;
  const transactionClient = {
    async query(sql, params = []) {
      return runFakeQuery({ calls: transactionCalls, params, rows, sql });
    },
    release() {
      released = true;
    },
  };

  return {
    get released() {
      return released;
    },
    rows,
    poolCalls,
    totalCount: 0,
    transactionCalls,
    async connect() {
      return transactionClient;
    },
    async query(sql, params = []) {
      return runFakeQuery({ calls: poolCalls, params, rows, sql });
    },
  };
}

function createFailingPool() {
  const rows = [];
  const poolCalls = [];
  const transactionCalls = [];
  let released = false;
  const transactionClient = {
    async query(sql, params = []) {
      transactionCalls.push({ params, sql });

      if (sql.includes("INSERT INTO pool_nullifiers")) {
        throw new Error("forced durable nullifier insert failure");
      }

      return runFakeQuery({ calls: [], params, rows, sql });
    },
    release() {
      released = true;
    },
  };

  return {
    get released() {
      return released;
    },
    poolCalls,
    transactionCalls,
    async connect() {
      return transactionClient;
    },
    async query(sql, params = []) {
      return runFakeQuery({ calls: poolCalls, params, rows, sql });
    },
  };
}

const client = createFakeClient();
const store = createPostgresNullifierReplayStore({ client });

assert.equal(store.kind, "postgres-nullifier-replay-store");
assert.equal(store.productionReady, false);
assert.equal(store.reservationMode, "postgres-transactional-insert-on-conflict");
assert.equal(store.storageMode, "postgres-unique-index");
assert.equal(store.uniquenessScope, "global-nullifier-plus-context-request-id");

const first = await store.reserve({
  assetId: "USDC",
  context: "private-pool-v2-claim",
  nullifier: "nf_prod_001",
  requestId: "claim_001",
});
assert.equal(first.accepted, true);
assert.equal(first.replay, false);
assert.equal(first.reason, "durable-nullifier-reserved");
assert.ok(
  client.calls.some((call) => compactSql(call.sql) === "BEGIN"),
  "Expected durable nullifier reservation to begin a transaction.",
);
assert.ok(
  client.calls.some((call) => compactSql(call.sql) === "COMMIT"),
  "Expected durable nullifier reservation to commit a transaction.",
);

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

const crossContextNullifierConflict = await store.reserve({
  assetId: "USDC",
  context: "private-pool-v2-unshield",
  nullifier: "nf_prod_001",
  requestId: "claim_003",
});
assert.equal(crossContextNullifierConflict.accepted, false);
assert.equal(crossContextNullifierConflict.replay, true);
assert.equal(crossContextNullifierConflict.reason, "conflicting-durable-nullifier-replay");

const preflight = await store.check({
  context: "private-pool-v2-claim",
  nullifier: "nf_prod_001",
  requestId: "claim_003",
});
assert.equal(preflight.accepted, false);
assert.equal(preflight.mutated, false);
assert.equal(preflight.reason, "conflicting-durable-nullifier-replay");

const accepted = await store.markAccepted({
  claimReceiptId: "proof_receipt_001",
  context: "private-pool-v2-claim",
  nullifier: "nf_prod_001",
  requestId: "claim_001",
});
assert.equal(accepted.accepted, true);
assert.equal(accepted.reason, "durable-nullifier-acceptance-recorded");
assert.equal(accepted.record.claimReceiptId, "proof_receipt_001");
assert.equal(accepted.record.status, "accepted");

const snapshot = await store.snapshot();
assert.equal(snapshot.length, 1);
assert.equal(snapshot[0].claimReceiptId, "proof_receipt_001");
assert.equal(snapshot[0].status, "accepted");

const concurrentClient = createFakeClient();
const concurrentStore = createPostgresNullifierReplayStore({ client: concurrentClient });
const concurrentReservations = await Promise.all([
  concurrentStore.reserve({
    assetId: "USDC",
    context: "private-pool-v2-claim",
    nullifier: "nf_concurrent_001",
    requestId: "claim_concurrent_001",
  }),
  concurrentStore.reserve({
    assetId: "USDC",
    context: "private-pool-v2-claim",
    nullifier: "nf_concurrent_001",
    requestId: "claim_concurrent_002",
  }),
]);
assert.equal(
  concurrentReservations.filter((reservation) => reservation.accepted).length,
  1,
  "Expected exactly one concurrent duplicate nullifier reservation to win.",
);
assert.equal(
  concurrentReservations.filter((reservation) => reservation.reason === "conflicting-durable-nullifier-replay").length,
  1,
  "Expected the losing concurrent duplicate reservation to be classified as a replay.",
);
assert.equal(
  concurrentClient.calls.filter((call) => compactSql(call.sql) === "BEGIN").length,
  2,
  "Expected each concurrent reservation attempt to run inside its own transaction.",
);

const idempotentConcurrentClient = createFakeClient();
const idempotentConcurrentStore = createPostgresNullifierReplayStore({ client: idempotentConcurrentClient });
const idempotentConcurrentReservations = await Promise.all([
  idempotentConcurrentStore.reserve({
    assetId: "USDC",
    context: "private-pool-v2-claim",
    nullifier: "nf_concurrent_idempotent_001",
    requestId: "claim_concurrent_idempotent_001",
  }),
  idempotentConcurrentStore.reserve({
    assetId: "USDC",
    context: "private-pool-v2-claim",
    nullifier: "nf_concurrent_idempotent_001",
    requestId: "claim_concurrent_idempotent_001",
  }),
]);
assert.equal(
  idempotentConcurrentReservations.filter((reservation) => reservation.reason === "durable-nullifier-reserved").length,
  1,
  "Expected one concurrent idempotent reservation to create the durable row.",
);
assert.equal(
  idempotentConcurrentReservations.filter(
    (reservation) => reservation.reason === "idempotent-durable-nullifier-reservation",
  ).length,
  1,
  "Expected one concurrent duplicate request to resolve as idempotent.",
);

const pool = createFakePool();
const pooledStore = createPostgresNullifierReplayStore({ client: pool });
const pooledReservation = await pooledStore.reserve({
  assetId: "USDC",
  context: "private-pool-v2-claim",
  nullifier: "nf_pool_001",
  requestId: "claim_pool_001",
});
assert.equal(pooledReservation.accepted, true);
assert.ok(
  pool.poolCalls.some((call) => call.sql.includes("CREATE TABLE IF NOT EXISTS")),
  "Expected schema checks to use the pool-level client.",
);
assert.ok(
  pool.transactionCalls.some((call) => compactSql(call.sql) === "BEGIN"),
  "Expected pooled durable reservation to use a dedicated transaction client.",
);
assert.ok(
  pool.transactionCalls.some((call) => call.sql.includes("INSERT INTO pool_nullifiers")),
  "Expected pooled durable reservation insert to run on the transaction client.",
);
assert.ok(pool.released, "Expected pooled durable reservation client to be released.");

const failingPool = createFailingPool();
const failingStore = createPostgresNullifierReplayStore({ client: failingPool });
await assert.rejects(
  () =>
    failingStore.reserve({
      assetId: "USDC",
      context: "private-pool-v2-claim",
      nullifier: "nf_pool_failure_001",
      requestId: "claim_pool_failure_001",
    }),
  /forced durable nullifier insert failure/,
);
assert.ok(
  failingPool.transactionCalls.some((call) => compactSql(call.sql) === "ROLLBACK"),
  "Expected failed durable reservation to roll back its transaction.",
);
assert.ok(failingPool.released, "Expected failed durable reservation client to be released.");

console.log("Vanta Postgres nullifier replay store check: PASS");

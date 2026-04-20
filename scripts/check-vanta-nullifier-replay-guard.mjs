import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { join, resolve } from "node:path";
import { createNullifierReplayGuard } from "../src/privacy/nullifierReplayGuard.mjs";
import { createJsonSnapshotStore } from "../src/storage/vantaJsonSnapshotStore.mjs";

const guard = createNullifierReplayGuard();

assert.equal(guard.kind, "vanta-nullifier-replay-guard");
assert.equal(guard.productionReady, false);
assert.equal(guard.storageMode, "memory");

const first = guard.reserve({
  context: "private-pool-v2-claim",
  nullifier: "nf_001",
  requestId: "claim_001",
});

assert.equal(first.accepted, true);
assert.equal(first.replay, false);
assert.equal(first.record.nullifier, "nf_001");

const idempotentRetry = guard.reserve({
  context: "private-pool-v2-claim",
  nullifier: "nf_001",
  requestId: "claim_001",
});

assert.equal(idempotentRetry.accepted, true);
assert.equal(idempotentRetry.replay, false);
assert.equal(idempotentRetry.idempotent, true);

const conflictingReplay = guard.reserve({
  context: "private-pool-v2-claim",
  nullifier: "nf_001",
  requestId: "claim_002",
});

assert.equal(conflictingReplay.accepted, false);
assert.equal(conflictingReplay.replay, true);
assert.equal(conflictingReplay.reason, "conflicting-nullifier-replay");

const preflightConflict = guard.check({
  context: "private-pool-v2-claim",
  nullifier: "nf_001",
  requestId: "claim_003",
});

assert.equal(preflightConflict.accepted, false);
assert.equal(preflightConflict.replay, true);
assert.equal(preflightConflict.mutated, false);

const separateContext = guard.reserve({
  context: "private-core-unshield",
  nullifier: "nf_001",
  requestId: "unshield_001",
});

assert.equal(separateContext.accepted, true);
assert.equal(separateContext.replay, false);

assert.throws(
  () => guard.reserve({ context: "private-pool-v2-claim", nullifier: "", requestId: "claim_003" }),
  /nullifier/i,
);
assert.throws(
  () => guard.reserve({ context: "", nullifier: "nf_002", requestId: "claim_004" }),
  /context/i,
);

const tempRoot = mkdtempSync(resolve(".tmp/vanta-nullifier-guard-"));
const persistedStore = createJsonSnapshotStore({
  defaultSnapshot: { records: [], stateVersion: 1 },
  path: join(tempRoot, "nullifiers.json"),
  stateVersion: 1,
});
const persistedGuard = createNullifierReplayGuard({ store: persistedStore });
assert.equal(persistedGuard.storageMode, "persistent-adapter");
persistedGuard.reserve({
  context: "private-pool-v2-claim",
  nullifier: "nf_persisted",
  requestId: "claim_persisted_001",
});

const restartedGuard = createNullifierReplayGuard({ store: persistedStore });
const persistedReplay = restartedGuard.reserve({
  context: "private-pool-v2-claim",
  nullifier: "nf_persisted",
  requestId: "claim_persisted_002",
});
assert.equal(persistedReplay.accepted, false);
assert.equal(persistedReplay.replay, true);
assert.equal(persistedReplay.reason, "conflicting-nullifier-replay");

const persistedRetry = restartedGuard.reserve({
  context: "private-pool-v2-claim",
  nullifier: "nf_persisted",
  requestId: "claim_persisted_001",
});
assert.equal(persistedRetry.accepted, true);
assert.equal(persistedRetry.idempotent, true);

console.log("Vanta nullifier replay guard check: PASS");

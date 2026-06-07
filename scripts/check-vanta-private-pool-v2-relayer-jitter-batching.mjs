import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DEFAULT_VANTA_RELAYER_SEND_JITTER_MAX_MS,
  DEFAULT_VANTA_RELAYER_SEND_JITTER_MIN_MS,
  DEFAULT_VANTA_RELAYER_UNSHIELD_JITTER_MAX_MS,
  DEFAULT_VANTA_RELAYER_UNSHIELD_JITTER_MIN_MS,
  assertProductionRelayerJitterBatchingConfig,
  exportVantaPrivatePoolV2RelayerLifecycleSnapshot,
  createVantaPrivatePoolV2RelayerQueue,
  processVantaPrivatePoolV2ReadyRelayBatches,
} from "../src/privacy/privatePoolV2RelayerQueue.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const threatModel = readFileSync(resolve(repoRoot, "docs/threat-model.md"), "utf8");
const securityLimitations = readFileSync(resolve(repoRoot, "SECURITY_LIMITATIONS.md"), "utf8");
const trackerState = readFileSync(
  resolve(repoRoot, "docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml"),
  "utf8",
);

let nowMs = 1_000_000;
const randomValues = [0, 1, 0.5, 0.25, 0.75, 0.1, 0.9];
const queue = createVantaPrivatePoolV2RelayerQueue({
  nowMs: () => nowMs,
  random: () => randomValues.shift() ?? 0.5,
});

const firstSend = queue.enqueueRelaySubmission({
  idempotencyKey: "send:nullifier:0001",
  kind: "send",
  metadata: {
    expectedAccounts: {
      nullifierMarker: "marker:send-0001",
      outputQueue: "queue:send-0001",
    },
    expectedPublicInputs: {
      privateSpendPublicInputHash: "field:send-public-input-hash-0001",
    },
    proofReceiptId: "receipt:send-0001",
    publicInputCommitment: "commitment:send-0001",
    serializedTransactionRef: "sha256:" + "11".repeat(32),
    settlementId: "settlement:send-0001",
  },
});
assert.equal(firstSend.kind, "send");
assert.equal(firstSend.status, "queued");
assert.equal(firstSend.delayMs, DEFAULT_VANTA_RELAYER_SEND_JITTER_MIN_MS);
assert.equal(firstSend.readyAtMs, nowMs + DEFAULT_VANTA_RELAYER_SEND_JITTER_MIN_MS);
assert.equal(firstSend.productionReady, false);
assert.deepEqual(queue.listReady({ nowMs: firstSend.readyAtMs - 1 }), []);
assert.equal(queue.listReady({ nowMs: firstSend.readyAtMs }).length, 1);

const secondSend = queue.enqueueRelaySubmission({
  idempotencyKey: "send:nullifier:0002",
  kind: "send",
  metadata: {
    proofReceiptId: "receipt:send-0002",
    publicInputCommitment: "commitment:send-0002",
    serializedTransactionRef: "sha256:" + "22".repeat(32),
    settlementId: "settlement:send-0002",
  },
});
assert.equal(secondSend.delayMs, DEFAULT_VANTA_RELAYER_SEND_JITTER_MAX_MS);

const thirdSend = queue.enqueueRelaySubmission({
  idempotencyKey: "send:nullifier:0003",
  kind: "send",
  metadata: {
    proofReceiptId: "receipt:send-0003",
    publicInputCommitment: "commitment:send-0003",
    serializedTransactionRef: "sha256:" + "33".repeat(32),
    settlementId: "settlement:send-0003",
  },
});
assert.equal(
  thirdSend.delayMs,
  Math.floor(
    DEFAULT_VANTA_RELAYER_SEND_JITTER_MIN_MS +
      (DEFAULT_VANTA_RELAYER_SEND_JITTER_MAX_MS -
        DEFAULT_VANTA_RELAYER_SEND_JITTER_MIN_MS) *
        0.5,
  ),
);

const unshield = queue.enqueueRelaySubmission({
  idempotencyKey: "unshield:nullifier:0001",
  kind: "unshield",
  metadata: {
    proofReceiptId: "receipt:unshield-0001",
    publicInputCommitment: "commitment:unshield-0001",
    serializedTransactionRef: "sha256:" + "44".repeat(32),
    settlementId: "settlement:unshield-0001",
  },
});
assert.ok(
  unshield.delayMs >= DEFAULT_VANTA_RELAYER_UNSHIELD_JITTER_MIN_MS &&
    unshield.delayMs <= DEFAULT_VANTA_RELAYER_UNSHIELD_JITTER_MAX_MS,
  "Unshield relay delay must stay inside the 30s-1h window.",
);

assert.throws(
  () =>
    queue.enqueueRelaySubmission({
      idempotencyKey: "send:nullifier:0001",
      kind: "send",
      metadata: {
        proofReceiptId: "receipt:duplicate",
        publicInputCommitment: "commitment:duplicate",
        serializedTransactionRef: "sha256:" + "55".repeat(32),
        settlementId: "settlement:duplicate",
      },
    }),
  /already queued/,
);

for (const [fieldName, fieldValue] of [
  ["proofBytes", "base64:abcd"],
  ["witness", { amount: "1000000" }],
  ["ownerSecret", "field:owner-secret"],
  ["noteBlinding", "field:note-blinding"],
  ["authToken", "Bearer secret"],
  ["rawIpAddress", "203.0.113.10"],
  ["privateKey", "not-a-key"],
]) {
  assert.throws(
    () =>
      queue.enqueueRelaySubmission({
        idempotencyKey: `send:forbidden:${fieldName}`,
        kind: "send",
        metadata: {
          [fieldName]: fieldValue,
          proofReceiptId: `receipt:${fieldName}`,
          publicInputCommitment: `commitment:${fieldName}`,
          serializedTransactionRef: "sha256:" + "66".repeat(32),
          settlementId: `settlement:${fieldName}`,
        },
      }),
    /forbids queued relay field/,
    `Queued relayer records must reject ${fieldName}.`,
  );
}

nowMs = Math.max(firstSend.readyAtMs, secondSend.readyAtMs, thirdSend.readyAtMs);
const batches = queue.drainReadyBatches({ kind: "send", maxBatchSize: 4, nowMs });
assert.equal(batches.length, 1, "Ready Send submissions should share one batch envelope.");
assert.equal(batches[0].kind, "send");
assert.equal(batches[0].submissions.length, 3);
assert.deepEqual(
  batches[0].submissions.map((entry) => entry.idempotencyKey),
  ["send:nullifier:0001", "send:nullifier:0003", "send:nullifier:0002"],
  "Ready Send batching must preserve deadline order.",
);
assert.equal(queue.listReady({ kind: "send", nowMs }).length, 0);

const serializedBatch = JSON.stringify(batches);
for (const forbidden of [
  "proofBytes",
  "witness",
  "ownerSecret",
  "noteBlinding",
  "Bearer ",
  "rawIpAddress",
  "privateKey",
]) {
  assert.ok(!serializedBatch.includes(forbidden), `Batch envelope leaked ${forbidden}.`);
}

const lifecycleQueue = createVantaPrivatePoolV2RelayerQueue({
  nowMs: () => 3_000_000,
  random: () => 0,
});
lifecycleQueue.enqueueRelaySubmission({
  idempotencyKey: "send:lifecycle:0001",
  kind: "send",
  metadata: {
    proofReceiptId: "receipt:lifecycle-0001",
    publicInputCommitment: "commitment:lifecycle-0001",
    serializedTransactionRef: "sha256:" + "99".repeat(32),
    settlementId: "settlement:lifecycle-0001",
  },
});
lifecycleQueue.enqueueRelaySubmission({
  idempotencyKey: "send:lifecycle:0002",
  kind: "send",
  metadata: {
    proofReceiptId: "receipt:lifecycle-0002",
    publicInputCommitment: "commitment:lifecycle-0002",
    serializedTransactionRef: "sha256:" + "aa".repeat(32),
    settlementId: "settlement:lifecycle-0002",
  },
});
const lifecycleRelease = processVantaPrivatePoolV2ReadyRelayBatches(lifecycleQueue, {
  kind: "send",
  maxBatchSize: 4,
  nowMs: 3_000_000 + DEFAULT_VANTA_RELAYER_SEND_JITTER_MIN_MS,
});
assert.equal(lifecycleRelease.batches.length, 1);
assert.equal(lifecycleRelease.receipts.length, 2);
assert.equal(lifecycleRelease.summary.releasedCount, 2);
assert.equal(lifecycleRelease.summary.productionReady, false);
assert.equal(lifecycleRelease.receipts[0].settlementMode, "simulated-local-relay");
assert.ok(lifecycleRelease.receipts[0].relayTxId.startsWith("relay_tx:"));
assert.equal(lifecycleQueue.listReady({ kind: "send", nowMs: lifecycleRelease.summary.processedAtMs }).length, 0);

const lifecycleExport = exportVantaPrivatePoolV2RelayerLifecycleSnapshot({
  queue: lifecycleQueue,
  receipts: lifecycleRelease.receipts,
  exportedAtMs: lifecycleRelease.summary.processedAtMs + 1,
});
assert.equal(lifecycleExport.productionReady, false);
assert.equal(lifecycleExport.receipts.length, 2);
assert.ok(
  lifecycleExport.records.every((record) => record.status === "batched"),
  "Lifecycle export should preserve processed queue status without live submission claims.",
);
const serializedLifecycleExport = JSON.stringify(lifecycleExport);
for (const forbidden of ["proofBytes", "witness", "ownerSecret", "Bearer ", "rawIpAddress", "privateKey"]) {
  assert.ok(!serializedLifecycleExport.includes(forbidden), `Lifecycle export leaked ${forbidden}.`);
}

const mixedReadyQueue = createVantaPrivatePoolV2RelayerQueue({
  nowMs: () => 2_000_000,
  random: () => 0,
});
mixedReadyQueue.enqueueRelaySubmission({
  idempotencyKey: "send:nullifier:mixed",
  kind: "send",
  metadata: {
    proofReceiptId: "receipt:mixed-send",
    publicInputCommitment: "commitment:mixed-send",
    serializedTransactionRef: "sha256:" + "77".repeat(32),
    settlementId: "settlement:mixed-send",
  },
});
mixedReadyQueue.enqueueRelaySubmission({
  idempotencyKey: "unshield:nullifier:mixed",
  kind: "unshield",
  metadata: {
    proofReceiptId: "receipt:mixed-unshield",
    publicInputCommitment: "commitment:mixed-unshield",
    serializedTransactionRef: "sha256:" + "88".repeat(32),
    settlementId: "settlement:mixed-unshield",
  },
});
const mixedBatches = mixedReadyQueue.drainReadyBatches({
  maxBatchSize: 4,
  nowMs: 2_000_000 + DEFAULT_VANTA_RELAYER_UNSHIELD_JITTER_MIN_MS,
});
assert.deepEqual(
  mixedBatches.map((batch) => batch.kind).sort(),
  ["send", "unshield"],
  "Mixed ready drain must split Send and Unshield into kind-homogeneous batches.",
);
for (const batch of mixedBatches) {
  assert.ok(
    batch.submissions.every((submission) => submission.kind === batch.kind),
    "Relay batches must never mix Send and Unshield submissions.",
  );
}

assert.throws(
  () =>
    createVantaPrivatePoolV2RelayerQueue({
      sendJitterMinMs: 0,
      sendJitterMaxMs: DEFAULT_VANTA_RELAYER_SEND_JITTER_MAX_MS,
    }),
  /send jitter minimum/,
);
assert.throws(
  () =>
    createVantaPrivatePoolV2RelayerQueue({
      sendJitterMinMs: DEFAULT_VANTA_RELAYER_SEND_JITTER_MAX_MS,
      sendJitterMaxMs: DEFAULT_VANTA_RELAYER_SEND_JITTER_MIN_MS,
    }),
  /must be <=/,
);
assert.throws(
  () =>
    createVantaPrivatePoolV2RelayerQueue({
      unshieldJitterMinMs: -1,
      unshieldJitterMaxMs: DEFAULT_VANTA_RELAYER_UNSHIELD_JITTER_MAX_MS,
    }),
  /unshield jitter minimum/,
);

assert.throws(
  () => assertProductionRelayerJitterBatchingConfig({ NODE_ENV: "production" }),
  /requires VANTA_PRIVATE_POOL_V2_RELAYER_JITTER_BATCHING_ENABLED=true/,
);
assert.throws(
  () =>
    assertProductionRelayerJitterBatchingConfig({
      NODE_ENV: "production",
      VANTA_PRIVATE_POOL_V2_RELAYER_BATCH_MAX_SIZE: "1",
      VANTA_PRIVATE_POOL_V2_RELAYER_JITTER_BATCHING_ENABLED: "true",
      VANTA_PRIVATE_POOL_V2_RELAYER_SEND_JITTER_MAX_MS: "180000",
      VANTA_PRIVATE_POOL_V2_RELAYER_SEND_JITTER_MIN_MS: "0",
      VANTA_PRIVATE_POOL_V2_RELAYER_UNSHIELD_JITTER_MAX_MS: "3600000",
      VANTA_PRIVATE_POOL_V2_RELAYER_UNSHIELD_JITTER_MIN_MS: "30000",
    }),
  /send jitter minimum/,
);
assertProductionRelayerJitterBatchingConfig({
  NODE_ENV: "production",
  VANTA_PRIVATE_POOL_V2_RELAYER_BATCH_MAX_SIZE: "4",
  VANTA_PRIVATE_POOL_V2_RELAYER_JITTER_BATCHING_ENABLED: "true",
  VANTA_PRIVATE_POOL_V2_RELAYER_SEND_JITTER_MAX_MS: "180000",
  VANTA_PRIVATE_POOL_V2_RELAYER_SEND_JITTER_MIN_MS: "30000",
  VANTA_PRIVATE_POOL_V2_RELAYER_UNSHIELD_JITTER_MAX_MS: "3600000",
  VANTA_PRIVATE_POOL_V2_RELAYER_UNSHIELD_JITTER_MIN_MS: "30000",
});

assert.equal(
  packageJson.scripts["relayer:jitter-and-batching-check"],
  "node scripts/check-vanta-private-pool-v2-relayer-jitter-batching.mjs",
);
assert.ok(
  packageJson.scripts["private-pool-v2:verify"].includes("npm run relayer:jitter-and-batching-check"),
  "private-pool-v2:verify must include the relayer jitter/batching guard.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run relayer:jitter-and-batching-check"),
  "mainnet:preflight must include the relayer jitter/batching guard.",
);
assert.ok(
  threatModel.includes("30-180s") && threatModel.includes("30s-1h"),
  "Threat model must document the Send and Unshield relayer delay windows.",
);
assert.ok(
  securityLimitations.includes("relayer jitter and batching"),
  "Security limitations must keep the timing-control truth boundary visible.",
);
assert.ok(
  trackerState.includes("PPA-RELAYER-002") &&
    trackerState.includes("implemented-verified-local") &&
    trackerState.includes("npm run relayer:jitter-and-batching-check: PASS"),
  "Tracker must mark PPA-RELAYER-002 implemented with verification evidence.",
);

console.log("Vanta Private Pool v2 relayer jitter/batching check: PASS");

import {
  VANTA_PRIVATE_POOL_V2_RELAYER_FORBIDDEN_PERSISTENCE_FIELDS,
} from "./privatePoolV2RelayerPrivacyTransport.mjs";

export const VANTA_PRIVATE_POOL_V2_RELAYER_QUEUE_VERSION =
  "vanta-private-pool-v2-relayer-queue-0.1";

export const DEFAULT_VANTA_RELAYER_SEND_JITTER_MIN_MS = 30_000;
export const DEFAULT_VANTA_RELAYER_SEND_JITTER_MAX_MS = 180_000;
export const DEFAULT_VANTA_RELAYER_UNSHIELD_JITTER_MIN_MS = 30_000;
export const DEFAULT_VANTA_RELAYER_UNSHIELD_JITTER_MAX_MS = 3_600_000;
export const DEFAULT_VANTA_RELAYER_BATCH_MAX_SIZE = 8;

const relayerQueueClaimBoundary =
  "local relayer timing-correlation mitigation; not Tor, anonymity-set, audit, or production privacy evidence";
const supportedKinds = new Set(["send", "unshield"]);
const forbiddenQueuedRelayKeys = new Set([
  ...VANTA_PRIVATE_POOL_V2_RELAYER_FORBIDDEN_PERSISTENCE_FIELDS,
  "authorization",
  "authToken",
  "bearerToken",
  "ip",
  "ipAddress",
  "mnemonic",
  "noteBlinding",
  "note_blinding",
  "operatorKeypair",
  "ownerSecret",
  "owner_secret",
  "plaintext",
  "plaintextMemo",
  "privateInputs",
  "privateKey",
  "proof",
  "proofArtifact",
  "proofBytes",
  "rawIpAddress",
  "rawPrivateInputs",
  "rawWitness",
  "seedPhrase",
  "vaultSecretKey",
  "viewingKey",
  "walletPrivateKey",
  "witness",
]);
const forbiddenQueuedRelayValuePattern =
  /\bBearer\s+|DATABASE_URL=|postgres(?:ql)?:\/\/|-----BEGIN [A-Z ]*PRIVATE KEY-----/u;

function requireInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Vanta relayer ${fieldName} must be an integer.`);
  }
  return parsed;
}

function readIntegerEnv(env, name, fallback) {
  if (env?.[name] === undefined || env?.[name] === "") {
    return fallback;
  }
  return requireInteger(env[name], name);
}

function requirePositiveWindow({ maxMs, minMs, name }) {
  if (minMs <= 0) {
    throw new Error(`Vanta relayer ${name} jitter minimum must be greater than zero.`);
  }
  if (maxMs <= 0) {
    throw new Error(`Vanta relayer ${name} jitter maximum must be greater than zero.`);
  }
  if (minMs > maxMs) {
    throw new Error(`Vanta relayer ${name} jitter minimum must be <= maximum.`);
  }
}

function normalizeRelayerQueueConfig(input = {}) {
  const env = input.env ?? process.env;
  const sendJitterMinMs =
    input.sendJitterMinMs ??
    readIntegerEnv(
      env,
      "VANTA_PRIVATE_POOL_V2_RELAYER_SEND_JITTER_MIN_MS",
      DEFAULT_VANTA_RELAYER_SEND_JITTER_MIN_MS,
    );
  const sendJitterMaxMs =
    input.sendJitterMaxMs ??
    readIntegerEnv(
      env,
      "VANTA_PRIVATE_POOL_V2_RELAYER_SEND_JITTER_MAX_MS",
      DEFAULT_VANTA_RELAYER_SEND_JITTER_MAX_MS,
    );
  const unshieldJitterMinMs =
    input.unshieldJitterMinMs ??
    readIntegerEnv(
      env,
      "VANTA_PRIVATE_POOL_V2_RELAYER_UNSHIELD_JITTER_MIN_MS",
      DEFAULT_VANTA_RELAYER_UNSHIELD_JITTER_MIN_MS,
    );
  const unshieldJitterMaxMs =
    input.unshieldJitterMaxMs ??
    readIntegerEnv(
      env,
      "VANTA_PRIVATE_POOL_V2_RELAYER_UNSHIELD_JITTER_MAX_MS",
      DEFAULT_VANTA_RELAYER_UNSHIELD_JITTER_MAX_MS,
    );
  const batchMaxSize =
    input.batchMaxSize ??
    readIntegerEnv(
      env,
      "VANTA_PRIVATE_POOL_V2_RELAYER_BATCH_MAX_SIZE",
      DEFAULT_VANTA_RELAYER_BATCH_MAX_SIZE,
    );

  requirePositiveWindow({ maxMs: sendJitterMaxMs, minMs: sendJitterMinMs, name: "send" });
  requirePositiveWindow({
    maxMs: unshieldJitterMaxMs,
    minMs: unshieldJitterMinMs,
    name: "unshield",
  });
  if (batchMaxSize < 2) {
    throw new Error("Vanta relayer batch max size must be at least 2.");
  }

  return {
    batchMaxSize,
    claimBoundary: relayerQueueClaimBoundary,
    productionReady: false,
    sendJitterMaxMs,
    sendJitterMinMs,
    unshieldJitterMaxMs,
    unshieldJitterMinMs,
    version: VANTA_PRIVATE_POOL_V2_RELAYER_QUEUE_VERSION,
  };
}

export function assertProductionRelayerJitterBatchingConfig(env = process.env) {
  if (env.NODE_ENV !== "production") {
    return normalizeRelayerQueueConfig({ env });
  }
  if (env.VANTA_PRIVATE_POOL_V2_RELAYER_JITTER_BATCHING_ENABLED !== "true") {
    throw new Error(
      "Private Pool v2 production relayer requires VANTA_PRIVATE_POOL_V2_RELAYER_JITTER_BATCHING_ENABLED=true.",
    );
  }
  return normalizeRelayerQueueConfig({ env });
}

export function buildVantaPrivatePoolV2RelayerTimingControlsStatus(env = process.env) {
  const config = normalizeRelayerQueueConfig({ env });
  return {
    batchMaxSize: config.batchMaxSize,
    claimBoundary: config.claimBoundary,
    enabled:
      env.NODE_ENV === "production"
        ? env.VANTA_PRIVATE_POOL_V2_RELAYER_JITTER_BATCHING_ENABLED === "true"
        : env.VANTA_PRIVATE_POOL_V2_RELAYER_JITTER_BATCHING_ENABLED !== "false",
    implemented: true,
    productionReady: false,
    sendJitterWindowMs: [config.sendJitterMinMs, config.sendJitterMaxMs],
    status: "local-timing-controls-covered-production-readiness-false",
    unshieldJitterWindowMs: [config.unshieldJitterMinMs, config.unshieldJitterMaxMs],
    version: config.version,
  };
}

function assertSupportedKind(kind) {
  if (!supportedKinds.has(kind)) {
    throw new Error(`Vanta relayer queue does not support relay kind ${kind}.`);
  }
}

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta relayer queue requires ${fieldName}.`);
  }
  return value.trim();
}

function sanitizeQueuedRelayMetadata(value, path = []) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "string") {
    if (forbiddenQueuedRelayValuePattern.test(value)) {
      throw new Error(`Vanta relayer queue forbids queued relay value at ${path.join(".") || "metadata"}.`);
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => sanitizeQueuedRelayMetadata(entry, [...path, String(index)]));
  }
  if (typeof value === "object") {
    const sanitized = {};
    for (const [key, nested] of Object.entries(value)) {
      if (forbiddenQueuedRelayKeys.has(key)) {
        throw new Error(
          `Vanta relayer queue forbids queued relay field ${[...path, key].join(".")}.`,
        );
      }
      sanitized[key] = sanitizeQueuedRelayMetadata(nested, [...path, key]);
    }
    return sanitized;
  }
  throw new Error(`Vanta relayer queue does not support metadata at ${path.join(".") || "metadata"}.`);
}

function delayForKind(kind, config, random) {
  const minMs = kind === "send" ? config.sendJitterMinMs : config.unshieldJitterMinMs;
  const maxMs = kind === "send" ? config.sendJitterMaxMs : config.unshieldJitterMaxMs;
  const boundedRandom = Math.min(1, Math.max(0, Number(random())));
  return Math.floor(minMs + (maxMs - minMs) * boundedRandom);
}

function sortByDeadline(left, right) {
  return left.readyAtMs - right.readyAtMs || left.sequence - right.sequence;
}

function normalizeLifecycleReceipt(receipt) {
  return {
    batchId: requireNonEmptyString(receipt.batchId, "batchId"),
    claimBoundary: relayerQueueClaimBoundary,
    delayMs: requireInteger(receipt.delayMs, "delayMs"),
    idempotencyKey: requireNonEmptyString(receipt.idempotencyKey, "idempotencyKey"),
    kind: receipt.kind,
    metadata: sanitizeQueuedRelayMetadata(receipt.metadata ?? {}),
    processedAtMs: requireInteger(receipt.processedAtMs, "processedAtMs"),
    productionReady: false,
    queuedAtMs: requireInteger(receipt.queuedAtMs, "queuedAtMs"),
    readyAtMs: requireInteger(receipt.readyAtMs, "readyAtMs"),
    receiptId: requireNonEmptyString(receipt.receiptId, "receiptId"),
    relayTxId: requireNonEmptyString(receipt.relayTxId, "relayTxId"),
    sequence: requireInteger(receipt.sequence, "sequence"),
    settlementMode: "simulated-local-relay",
    status: "released",
    version: VANTA_PRIVATE_POOL_V2_RELAYER_QUEUE_VERSION,
  };
}

function receiptForSubmission({ batch, processedAtMs, submission }) {
  assertSupportedKind(submission.kind);
  const stableSuffix = [
    submission.kind,
    submission.sequence,
    processedAtMs,
  ].join(":");
  return normalizeLifecycleReceipt({
    batchId: batch.batchId,
    delayMs: submission.delayMs,
    idempotencyKey: submission.idempotencyKey,
    kind: submission.kind,
    metadata: submission.metadata,
    processedAtMs,
    queuedAtMs: submission.queuedAtMs,
    readyAtMs: submission.readyAtMs,
    receiptId: `relayer-receipt:${stableSuffix}`,
    relayTxId: `relay_tx:${stableSuffix}`,
    sequence: submission.sequence,
  });
}

export function processVantaPrivatePoolV2ReadyRelayBatches(queue, options = {}) {
  if (!queue || typeof queue.drainReadyBatches !== "function") {
    throw new Error("Vanta relayer lifecycle requires a relayer queue.");
  }

  const processedAtMs = requireInteger(options.nowMs ?? Date.now(), "processedAtMs");
  const batches = queue.drainReadyBatches({
    kind: options.kind,
    maxBatchSize: options.maxBatchSize,
    nowMs: processedAtMs,
  });
  const receipts = batches.flatMap((batch) =>
    batch.submissions.map((submission) =>
      receiptForSubmission({
        batch,
        processedAtMs,
        submission,
      }),
    ),
  );

  return {
    batches,
    receipts,
    summary: {
      batchCount: batches.length,
      claimBoundary: relayerQueueClaimBoundary,
      processedAtMs,
      productionReady: false,
      releasedCount: receipts.length,
      settlementMode: "simulated-local-relay",
      version: VANTA_PRIVATE_POOL_V2_RELAYER_QUEUE_VERSION,
    },
  };
}

export function exportVantaPrivatePoolV2RelayerLifecycleSnapshot({
  exportedAtMs = Date.now(),
  queue,
  receipts = [],
} = {}) {
  if (!queue || typeof queue.snapshot !== "function") {
    throw new Error("Vanta relayer lifecycle export requires a relayer queue.");
  }

  const normalizedExportedAtMs = requireInteger(exportedAtMs, "exportedAtMs");
  const records = queue.snapshot().map((record) => ({
    ...record,
    metadata: sanitizeQueuedRelayMetadata(record.metadata ?? {}),
    productionReady: false,
  }));
  const normalizedReceipts = receipts.map((receipt) => normalizeLifecycleReceipt(receipt));

  return {
    claimBoundary: relayerQueueClaimBoundary,
    exportedAtMs: normalizedExportedAtMs,
    productionReady: false,
    receiptCount: normalizedReceipts.length,
    receipts: normalizedReceipts,
    recordCount: records.length,
    records,
    version: VANTA_PRIVATE_POOL_V2_RELAYER_QUEUE_VERSION,
  };
}

export function createVantaPrivatePoolV2RelayerQueue(options = {}) {
  const config = normalizeRelayerQueueConfig(options);
  const nowMs = options.nowMs ?? (() => Date.now());
  const random = options.random ?? Math.random;
  let sequence = 0;
  let records = [];

  function normalizeRecord(record) {
    assertSupportedKind(record.kind);
    const normalized = {
      batchId: record.batchId ?? null,
      claimBoundary: relayerQueueClaimBoundary,
      delayMs: requireInteger(record.delayMs, "delayMs"),
      idempotencyKey: requireNonEmptyString(record.idempotencyKey, "idempotencyKey"),
      kind: record.kind,
      metadata: sanitizeQueuedRelayMetadata(record.metadata ?? {}),
      productionReady: false,
      queuedAtMs: requireInteger(record.queuedAtMs, "queuedAtMs"),
      readyAtMs: requireInteger(record.readyAtMs, "readyAtMs"),
      sequence: requireInteger(record.sequence ?? sequence, "sequence"),
      status: record.status === "batched" ? "batched" : "queued",
      version: VANTA_PRIVATE_POOL_V2_RELAYER_QUEUE_VERSION,
    };
    sequence = Math.max(sequence, normalized.sequence + 1);
    return normalized;
  }

  function replaceRecords(nextRecords = []) {
    records = nextRecords.map((record) => normalizeRecord(record));
  }

  replaceRecords(options.initialRecords ?? []);

  return {
    config: { ...config },
    drainReadyBatches({ kind, maxBatchSize = config.batchMaxSize, nowMs: atMs = nowMs() } = {}) {
      if (kind !== undefined) {
        assertSupportedKind(kind);
      }
      const batchSize = requireInteger(maxBatchSize, "maxBatchSize");
      if (batchSize < 2) {
        throw new Error("Vanta relayer batch max size must be at least 2.");
      }
      const ready = records
        .filter(
          (record) =>
            record.status === "queued" &&
            record.readyAtMs <= atMs &&
            (kind === undefined || record.kind === kind),
        )
        .sort(sortByDeadline);
      const readyGroups =
        kind === undefined
          ? [...supportedKinds]
              .map((relayKind) => ready.filter((record) => record.kind === relayKind))
              .filter((entries) => entries.length > 0)
          : [ready];
      const batches = [];
      for (const group of readyGroups) {
        for (let index = 0; index < group.length; index += batchSize) {
          const submissions = group.slice(index, index + batchSize);
          if (submissions.length === 0) {
            continue;
          }
          const batchId = `relayer-batch:${submissions[0].kind}:${submissions[0].sequence}:${submissions.at(-1).sequence}:${atMs}`;
          for (const submission of submissions) {
            submission.batchId = batchId;
            submission.status = "batched";
          }
          batches.push({
            batchId,
            claimBoundary: relayerQueueClaimBoundary,
            createdAtMs: atMs,
            kind: submissions[0].kind,
            productionReady: false,
            submissions: submissions.map((submission) => ({ ...submission })),
            version: VANTA_PRIVATE_POOL_V2_RELAYER_QUEUE_VERSION,
          });
        }
      }
      return batches;
    },
    enqueueRelaySubmission({ idempotencyKey, kind, metadata = {} }) {
      assertSupportedKind(kind);
      const normalizedKey = requireNonEmptyString(idempotencyKey, "idempotencyKey");
      if (records.some((record) => record.idempotencyKey === normalizedKey)) {
        throw new Error(`Vanta relayer submission ${normalizedKey} is already queued.`);
      }
      const queuedAtMs = requireInteger(nowMs(), "queuedAtMs");
      const delayMs = delayForKind(kind, config, random);
      const record = normalizeRecord({
        delayMs,
        idempotencyKey: normalizedKey,
        kind,
        metadata,
        queuedAtMs,
        readyAtMs: queuedAtMs + delayMs,
        sequence: sequence,
        status: "queued",
      });
      records.push(record);
      return { ...record };
    },
    listReady({ kind, nowMs: atMs = nowMs() } = {}) {
      if (kind !== undefined) {
        assertSupportedKind(kind);
      }
      return records
        .filter(
          (record) =>
            record.status === "queued" &&
            record.readyAtMs <= atMs &&
            (kind === undefined || record.kind === kind),
        )
        .sort(sortByDeadline)
        .map((record) => ({ ...record }));
    },
    replaceRecords,
    snapshot() {
      return records.map((record) => ({ ...record }));
    },
    status({ nowMs: atMs = nowMs() } = {}) {
      const ready = this.listReady({ nowMs: atMs });
      return {
        ...buildVantaPrivatePoolV2RelayerTimingControlsStatus(options.env ?? process.env),
        queuedCount: records.filter((record) => record.status === "queued").length,
        readyCount: ready.length,
        totalRecordCount: records.length,
      };
    },
  };
}

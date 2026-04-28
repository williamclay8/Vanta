import { createStrategyExecutionPreview } from "./strategyExecutionAdapter.mjs";
import { createStrategyPlan } from "./strategyPlanner.mjs";

const RUNTIME_VERSION = "vanta-strategy-runtime-0.1";
const LOCAL_DURABLE_STORAGE_STATUS = {
  evidenceRef: "local Strategy runtime Map state; replace with durable scheduler/storage service before live execution",
  productionReady: false,
  status: "local-in-memory-only",
};
const COMMITMENT_FIELD_PATTERN = /^0x[0-9a-f]{64}$/u;
const RAW_COMMITTED_SETTLEMENT_FIELDS = [
  "amount",
  "asset",
  "destination",
  "owner",
  "pair",
  "quote",
  "quoteHandle",
  "route",
  "routeHandle",
  "venue",
];

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashId(prefix, value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(16)}`;
}

function resolveStatus(executionPreview) {
  if (executionPreview.childJobs.some((job) => job.status === "deferred")) {
    return "waiting";
  }

  if (executionPreview.childJobs.every((job) => job.status === "skipped")) {
    return "waiting";
  }

  return "ready";
}

function assertNoRawCommittedSettlementFields(committedSettlementRequests) {
  for (const request of committedSettlementRequests?.requests ?? []) {
    for (const rawField of RAW_COMMITTED_SETTLEMENT_FIELDS) {
      if (rawField in request) {
        throw new Error(`Strategy private-rail operator run rejects raw ${rawField}.`);
      }
    }

    if (request.action !== "send" && request.action !== "swap") {
      throw new Error("Strategy private-rail operator run requires send/swap committed actions.");
    }

    if (request.economicsMode !== "committed-economics") {
      throw new Error("Strategy private-rail operator run requires committed-economics requests.");
    }

    if (typeof request.settlementId !== "string" || request.settlementId.length === 0) {
      throw new Error("Strategy private-rail operator run requires settlementId.");
    }

    for (const commitmentField of ["routeHandleCommitment", "quoteHandleCommitment"]) {
      if (!COMMITMENT_FIELD_PATTERN.test(String(request[commitmentField] ?? ""))) {
        throw new Error(`Strategy private-rail operator run requires ${commitmentField}.`);
      }
    }
  }
}

function cloneRecord(record) {
  return structuredClone(record);
}

export function createVantaStrategyRuntime() {
  const strategies = new Map();
  const operatorRuns = new Map();
  const operatorRunIndex = new Map();
  const requestIndex = new Map();

  function getRecord(strategyId) {
    const record = strategies.get(strategyId);
    if (!record) {
      throw new Error(`Unknown strategy ${strategyId}.`);
    }

    return record;
  }

  return {
    version: RUNTIME_VERSION,

    cancelStrategy(strategyId) {
      const record = getRecord(strategyId);
      record.status = "canceled";
      return cloneRecord(record);
    },

    createStrategy(input, executionOptions = {}) {
      const { clientRequestId, ...planInput } = input;
      if (typeof clientRequestId !== "string" || clientRequestId.length === 0) {
        throw new Error("Strategy creation requires clientRequestId.");
      }

      const fingerprint = stableJson({ executionOptions, planInput });
      const existingId = requestIndex.get(clientRequestId);

      if (existingId) {
        const existing = getRecord(existingId);
        if (existing.requestFingerprint !== fingerprint) {
          throw new Error(`Strategy request ${clientRequestId} conflicts with existing strategy inputs.`);
        }

        return cloneRecord(existing);
      }

      const plan = createStrategyPlan(planInput);
      const executionPreview = createStrategyExecutionPreview(plan, executionOptions);
      const id = hashId("vstrat", `${clientRequestId}:${fingerprint}`);
      const record = {
        id,
        object: "strategy",
        clientRequestId,
        createdAt: new Date(0).toISOString(),
        executionPreview,
        plan,
        requestFingerprint: fingerprint,
        status: resolveStatus(executionPreview),
      };

      strategies.set(id, record);
      requestIndex.set(clientRequestId, id);
      return cloneRecord(record);
    },

    createPrivateRailOperatorRun({ committedSettlementRequests, operatorHandoff, strategyId }) {
      const strategy = getRecord(strategyId);
      assertNoRawCommittedSettlementFields(committedSettlementRequests);

      if (operatorHandoff?.operatorPlaintextStrategyShared !== false) {
        throw new Error("Strategy private-rail operator run requires a redacted handoff.");
      }

      if (operatorHandoff?.liveSubmission !== false || committedSettlementRequests?.liveSubmission !== false) {
        throw new Error("Strategy private-rail operator run must remain queued before live execution is enabled.");
      }

      const fingerprint = stableJson({
        committedSettlementRequests,
        operatorHandoff,
        strategyId,
      });
      const existingId = operatorRunIndex.get(fingerprint);

      if (existingId) {
        return cloneRecord(operatorRuns.get(existingId));
      }

      const id = hashId("vstrun", fingerprint);
      const record = {
        blockers: [
          "live-strategy-scheduler-not-enabled",
          "live-venue-route-quote-privacy-not-production-proven",
          "production-anonymity-set-not-proven",
          "audit-and-mainnet-gates-not-cleared",
        ],
        committedSettlementRequestCount: committedSettlementRequests.requests.length,
        committedSettlementRequests,
        createdAt: new Date(0).toISOString(),
        id,
        liveSubmission: false,
        object: "strategy_private_rail_operator_run",
        operatorHandoff,
        operatorPlaintextStrategyShared: false,
        schedulerQueueStatus: "queued-local-preview",
        status: "queued",
        strategyId: strategy.id,
      };

      operatorRuns.set(id, record);
      operatorRunIndex.set(fingerprint, id);
      return cloneRecord(record);
    },

    getStrategy(strategyId) {
      return cloneRecord(getRecord(strategyId));
    },

    listStrategies() {
      return Array.from(strategies.values()).map((record) => cloneRecord(record));
    },

    listPrivateRailOperatorRuns() {
      return Array.from(operatorRuns.values()).map((record) => cloneRecord(record));
    },

    createPrivateRailSchedulerDrainPreview() {
      const queuedRuns = Array.from(operatorRuns.values()).filter((record) => record.status === "queued");
      const blockers = Array.from(new Set(queuedRuns.flatMap((record) => record.blockers)));

      return {
        blockers,
        drainPreview: queuedRuns.map((record) => ({
          blockedBy: record.blockers,
          committedSettlementRequestCount: record.committedSettlementRequestCount,
          operatorRunId: record.id,
          strategyId: record.strategyId,
          wouldSubmitLive: false,
        })),
        durableStorage: cloneRecord(LOCAL_DURABLE_STORAGE_STATUS),
        liveSubmission: false,
        object: "strategy_private_rail_scheduler_drain_preview",
        operatorRunIds: queuedRuns.map((record) => record.id),
        queueDepth: queuedRuns.length,
        status: "blocked_before_live_submission",
      };
    },

    pauseStrategy(strategyId) {
      const record = getRecord(strategyId);
      if (record.status === "canceled") {
        throw new Error("Cannot pause canceled strategy.");
      }

      record.status = "paused";
      return cloneRecord(record);
    },

    startStrategy(strategyId) {
      const record = getRecord(strategyId);
      if (record.status === "canceled") {
        throw new Error("Cannot start canceled strategy.");
      }

      record.status = "running";
      return cloneRecord(record);
    },
  };
}

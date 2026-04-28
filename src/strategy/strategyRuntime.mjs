import { createStrategyExecutionPreview } from "./strategyExecutionAdapter.mjs";
import { createStrategyPlan } from "./strategyPlanner.mjs";

const RUNTIME_VERSION = "vanta-strategy-runtime-0.1";

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
    for (const rawField of ["amount", "asset", "destination", "owner"]) {
      if (rawField in request) {
        throw new Error(`Strategy private-rail operator run rejects raw ${rawField}.`);
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
          "route-quote-privacy-not-production-proven",
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

import type { VantaStrategyExecutionPreview, VantaStrategyExecutionPreviewOptions } from "./strategyExecutionAdapter.mjs";
import type { VantaStrategyInput, VantaStrategyPlan } from "./strategyPlanner.mjs";

export type VantaStrategyRuntimeInput = VantaStrategyInput & {
  clientRequestId: string;
};

export type VantaStrategyStatus = "ready" | "waiting" | "running" | "paused" | "canceled";
export type VantaStrategyPrivateRailOperatorRun = {
  blockers: string[];
  committedSettlementRequestCount: number;
  committedSettlementRequests: unknown;
  createdAt: string;
  id: string;
  liveSubmission: false;
  object: "strategy_private_rail_operator_run";
  operatorHandoff: unknown;
  operatorPlaintextStrategyShared: false;
  schedulerQueueStatus: "queued-local-preview";
  status: "queued";
  strategyId: string;
};

export type VantaStrategyPrivateRailSchedulerDrainPreview = {
  blockers: string[];
  drainPreview: Array<{
    blockedBy: string[];
    committedSettlementRequestCount: number;
    operatorRunId: string;
    strategyId: string;
    wouldSubmitLive: false;
  }>;
  durableStorage: {
    evidenceRef: string;
    productionReady: false;
    status: "local-in-memory-only";
  };
  liveSubmission: false;
  object: "strategy_private_rail_scheduler_drain_preview";
  operatorRunIds: string[];
  queueDepth: number;
  status: "blocked_before_live_submission";
};

export type VantaStrategyRecord = {
  clientRequestId: string;
  createdAt: string;
  executionPreview: VantaStrategyExecutionPreview;
  id: string;
  object: "strategy";
  plan: VantaStrategyPlan;
  requestFingerprint: string;
  status: VantaStrategyStatus;
};

export type VantaStrategyRuntime = {
  cancelStrategy(strategyId: string): VantaStrategyRecord;
  createPrivateRailSchedulerDrainPreview(): VantaStrategyPrivateRailSchedulerDrainPreview;
  createPrivateRailOperatorRun(input: {
    committedSettlementRequests: unknown;
    operatorHandoff: unknown;
    strategyId: string;
  }): VantaStrategyPrivateRailOperatorRun;
  createStrategy(
    input: VantaStrategyRuntimeInput,
    executionOptions?: VantaStrategyExecutionPreviewOptions,
  ): VantaStrategyRecord;
  getStrategy(strategyId: string): VantaStrategyRecord;
  listPrivateRailOperatorRuns(): VantaStrategyPrivateRailOperatorRun[];
  listStrategies(): VantaStrategyRecord[];
  pauseStrategy(strategyId: string): VantaStrategyRecord;
  startStrategy(strategyId: string): VantaStrategyRecord;
  version: "vanta-strategy-runtime-0.1";
};

export function createVantaStrategyRuntime(): VantaStrategyRuntime;

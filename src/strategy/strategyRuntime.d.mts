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
  status: "queued";
  strategyId: string;
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

import type { VantaStrategyPlan } from "./strategyPlanner.mjs";

export type VantaStrategyRouteQuality = "healthy" | "poor";
export type VantaStrategyProtectedLandingPolicy = "retry" | "downgrade";

export type VantaStrategyExecutionPreviewOptions = {
  currentSlippageBps?: number;
  protectedLandingAvailable?: boolean;
  protectedLandingPolicy?: VantaStrategyProtectedLandingPolicy;
  routeQuality?: VantaStrategyRouteQuality;
};

export type VantaStrategyExecutionPreview = {
  version: "vanta-strategy-execution-adapter-0.1";
  childJobs: Array<{
    childIndex: number;
    fallback: {
      action: "execute" | "defer" | "skip" | "downgrade-landing" | "retry-protected-landing";
      reason: string;
      status: "ready" | "deferred" | "skipped";
    };
    id: string;
    landing: {
      mode: "protected" | "standard";
      transport: "Jito" | "standard-rpc";
    };
    notional: number;
    route: {
      allowRfq: boolean;
      control: string;
      engine: string;
      sourceAsset: string;
      targetAsset: string;
    };
    scheduledAtMinute: number;
    settlement: {
      destination: string;
      required: boolean;
    };
    status: "ready" | "deferred" | "skipped";
  }>;
  destinationSettlement: {
    kind: "settle-acquired-asset-private" | "settle-acquired-asset-public" | "settle-acquired-asset-treasury";
    status: string;
  };
  fundingStep: {
    kind: string;
    requiredBeforeFirstChild: boolean;
    status: "ready" | "required";
  };
  liveSubmission: false;
  planId: string;
  safety: {
    requiresWalletApprovalBeforeLiveSubmit: boolean;
    simulateBeforeSubmit: boolean;
  };
};

export function createStrategyExecutionPreview(
  plan: VantaStrategyPlan,
  options?: VantaStrategyExecutionPreviewOptions,
): VantaStrategyExecutionPreview;

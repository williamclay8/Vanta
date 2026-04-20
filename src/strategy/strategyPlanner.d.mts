export type VantaStrategyMode = "Stealth DCA" | "Private TWAP";

export type VantaStrategyInput = {
  destination: string;
  fundingSource: string;
  landingMode: string;
  maxSlippageBps: number;
  mode: VantaStrategyMode;
  pair: string;
  seed: string;
  side: "Buy" | "Sell";
  slicePolicy: string;
  timingPolicy: string;
  timeWindow: string;
  totalNotional: number;
  urgency: string;
};

export type VantaStrategyChildOrder = {
  index: number;
  notional: number;
  scheduledAtMinute: number;
};

export type VantaStrategyPlan = {
  averageChildSize: number;
  childOrders: VantaStrategyChildOrder[];
  fundingAction: string;
  guardrails: {
    deferWhenRouteQualityTooPoor: boolean;
    maxSlippageBps: number;
    skipIntervalWhenSlippageExceeded: boolean;
  };
  id: string;
  mode: VantaStrategyMode;
  pair: string;
  routingPolicy: {
    allowRfq: boolean;
    destination: string;
    protectedLanding: boolean;
    routeControl: string;
    routeEngine: string;
  };
  side: "Buy" | "Sell";
  totalNotional: number;
  windowHours: number;
};

export function createStrategyPlan(input: VantaStrategyInput): VantaStrategyPlan;

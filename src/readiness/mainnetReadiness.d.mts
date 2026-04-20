export type VantaMainnetReadinessBlocker = {
  id: string;
  severity: "critical" | "high";
  summary: string;
};

export type VantaMainnetReadinessLane = {
  readiness: number;
  status: string;
  truth: string;
};

export type VantaMainnetReadinessSnapshot = {
  blockers: VantaMainnetReadinessBlocker[];
  decision: "blocked";
  generatedAt: string;
  lanes: {
    pay: VantaMainnetReadinessLane;
    privateCore: VantaMainnetReadinessLane;
    privatePoolV2: VantaMainnetReadinessLane;
    protocolTabs: VantaMainnetReadinessLane;
    strategy: VantaMainnetReadinessLane;
  };
  mainnetReady: false;
  nextActions: string[];
  privacyRail: import("./privacyRailContract.mjs").VantaPrivacyRailContract;
  productionReady: false;
  requiredCommands: string[];
  score: number;
  version: "vanta-mainnet-readiness-0.1";
};

export function createVantaMainnetReadinessSnapshot(): VantaMainnetReadinessSnapshot;

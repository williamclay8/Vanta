export type VantaAbuseObservabilitySurface = {
  alerts: string[];
  auditEvents: string[];
  id: "pay" | "privatePoolV2" | "strategy" | "operator";
  label: string;
  metrics: string[];
  rateLimits: string[];
  status: "not-wired";
};

export type VantaAbuseObservabilityContract = {
  globalRequirements: string[];
  mainnetReady: false;
  nextImplementationStep: string;
  productionReady: false;
  requiredVerificationCommands: string[];
  surfaces: VantaAbuseObservabilitySurface[];
  version: "vanta-abuse-observability-contract-0.1";
};

export function createVantaAbuseObservabilityContract(): VantaAbuseObservabilityContract;

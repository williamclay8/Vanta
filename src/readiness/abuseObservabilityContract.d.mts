export type VantaAbuseObservabilitySurface = {
  alerts: string[];
  auditEvents: string[];
  id: "pay" | "privatePoolV2" | "strategy" | "operator";
  label: string;
  metrics: string[];
  rateLimits: string[];
  status: "not-wired" | "privacy-safe-audit-sink-only";
};

export type VantaAbuseObservabilityContract = {
  globalRequirements: string[];
  mainnetReady: false;
  nextImplementationStep: string;
  operatorEventSinkModulePath: "src/ops/vantaOperatorEventSink.mjs";
  productionObservabilityTemplatePath: "ops/mainnet/production-observability.template.json";
  productionReady: false;
  requiredVerificationCommands: string[];
  safeTelemetryModulePath: "src/ops/vantaSafeTelemetry.mjs";
  surfaces: VantaAbuseObservabilitySurface[];
  version: "vanta-abuse-observability-contract-0.1";
};

export function createVantaAbuseObservabilityContract(): VantaAbuseObservabilityContract;

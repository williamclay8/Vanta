import { readFileSync } from "node:fs";

const evidencePath = new URL("../../ops/mainnet/abuse-observability.evidence.json", import.meta.url);

export function createVantaAbuseObservabilityRuntimeStatus() {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

  return {
    checkedEvidenceRef: "ops/mainnet/abuse-observability.evidence.json",
    alertsConfigured: evidence.alertsConfigured,
    incidentWorkflowReady: evidence.incidentWorkflowReady,
    metricsDashboardsAvailable: evidence.metricsDashboardsAvailable,
    operatorEventSinkKind: evidence.operatorEventSinkKind,
    operatorEventSinkProductionReady: evidence.operatorEventSinkProductionReady,
    pendingObservabilityControls: evidence.pendingObservabilityControls,
    payRuntimeStatus: evidence.payRuntimeStatus,
    privatePoolV2PreferredRateLimiterKind: evidence.privatePoolV2RateLimiterPreferredKind,
    privatePoolV2RateLimiter: evidence.privatePoolV2Runtime?.rateLimiter ?? null,
    privatePoolV2RuntimeMatchesPreferredRateLimiter: evidence.privatePoolV2RuntimeMatchesPreferredRateLimiter,
    privatePoolV2RuntimeMode: evidence.privatePoolV2Runtime?.runtimeMode ?? null,
    privatePoolV2StorageKind: evidence.privatePoolV2Runtime?.storageKind ?? null,
    providerBackedLogSinkAvailable: evidence.providerBackedLogSinkAvailable,
    retentionPolicyConfigured: evidence.retentionPolicyConfigured,
    surfaceStatuses: evidence.surfaceStatuses,
    version: "vanta-production-abuse-observability-runtime-summary-0.1",
  };
}

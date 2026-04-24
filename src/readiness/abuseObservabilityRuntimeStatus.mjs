import { readFileSync } from "node:fs";
import { createVantaProductionObservabilityControlsSummary } from "./productionObservabilityControls.mjs";

const evidencePath = new URL("../../ops/mainnet/abuse-observability.evidence.json", import.meta.url);

export function createVantaAbuseObservabilityRuntimeStatus() {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  const controls = createVantaProductionObservabilityControlsSummary();

  return {
    checkedEvidenceRef: "ops/mainnet/abuse-observability.evidence.json",
    checkedControlsRef: controls.checkedControlsRef,
    alertsConfigured: controls.alertsConfigured,
    incidentWorkflowReady: controls.incidentWorkflowReady,
    metricsDashboardsAvailable: controls.metricsDashboardsAvailable,
    operatorEventSinkKind: evidence.operatorEventSinkKind,
    operatorEventSinkProductionReady: evidence.operatorEventSinkProductionReady,
    pendingObservabilityControls: controls.pendingObservabilityControls,
    payRuntimeStatus: evidence.payRuntimeStatus,
    privatePoolV2PreferredRateLimiterKind: evidence.privatePoolV2RateLimiterPreferredKind,
    privatePoolV2RateLimiter: evidence.privatePoolV2Runtime?.rateLimiter ?? null,
    privatePoolV2RuntimeMatchesPreferredRateLimiter: evidence.privatePoolV2RuntimeMatchesPreferredRateLimiter,
    privatePoolV2RuntimeMode: evidence.privatePoolV2Runtime?.runtimeMode ?? null,
    privatePoolV2StorageKind: evidence.privatePoolV2Runtime?.storageKind ?? null,
    renderNativeLogSinkAvailable: controls.renderNativeLogSinkAvailable,
    retentionPolicyConfigured: controls.retentionPolicyConfigured,
    surfaceStatuses: evidence.surfaceStatuses,
    version: "vanta-production-abuse-observability-runtime-summary-0.1",
  };
}

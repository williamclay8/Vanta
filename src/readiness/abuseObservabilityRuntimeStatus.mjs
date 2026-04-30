import { readFileSync } from "node:fs";
import { createVantaProductionObservabilityControlsSummary } from "./productionObservabilityControls.mjs";

const evidencePath = new URL("../../ops/mainnet/abuse-observability.evidence.json", import.meta.url);

export function createVantaAbuseObservabilityRuntimeStatus() {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  const controls = createVantaProductionObservabilityControlsSummary();
  const servicesWithVerifiedRenderNativeLogAndMetrics = controls.serviceStatuses
    .filter((service) =>
      service.configuredControlIds.includes("render-native-log-sink") &&
      service.configuredControlIds.includes("metrics-dashboards")
    )
    .map((service) => service.service);
  const servicesPendingRenderNativeLogAndMetrics = controls.serviceStatuses
    .filter((service) =>
      service.pendingControlIds.includes("render-native-log-sink") ||
      service.pendingControlIds.includes("metrics-dashboards")
    )
    .map((service) => service.service);

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
    servicesPendingRenderNativeLogAndMetrics,
    servicesWithVerifiedRenderNativeLogAndMetrics,
    surfaceStatuses: evidence.surfaceStatuses,
    version: "vanta-production-abuse-observability-runtime-summary-0.1",
  };
}

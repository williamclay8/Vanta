import { readFileSync } from "node:fs";

const controlsPath = new URL("../../ops/mainnet/production-observability.controls.json", import.meta.url);

const controlKeyToPendingId = {
  alertPolicy: "alert-policies",
  incidentWorkflow: "incident-workflow",
  logSink: "provider-backed-log-sink",
  metricsDashboard: "metrics-dashboards",
  retentionPolicy: "retention-policy",
};

const completionStatuses = new Set(["configured", "verified"]);

export function createVantaProductionObservabilityControlsSummary() {
  const controls = JSON.parse(readFileSync(controlsPath, "utf8"));
  const services = controls.services ?? [];

  function everyServiceHas(controlKey) {
    return services.length > 0 && services.every((service) => completionStatuses.has(service.controls?.[controlKey]?.status));
  }

  const providerBackedLogSinkAvailable = everyServiceHas("logSink");
  const metricsDashboardsAvailable = everyServiceHas("metricsDashboard");
  const alertsConfigured = everyServiceHas("alertPolicy");
  const retentionPolicyConfigured = everyServiceHas("retentionPolicy");
  const incidentWorkflowReady = everyServiceHas("incidentWorkflow");

  const pendingObservabilityControls = Object.entries(controlKeyToPendingId)
    .filter(([controlKey]) => !everyServiceHas(controlKey))
    .map(([, pendingId]) => pendingId);

  return {
    alertsConfigured,
    checkedControlsRef: "ops/mainnet/production-observability.controls.json",
    controls,
    incidentWorkflowReady,
    metricsDashboardsAvailable,
    pendingObservabilityControls,
    providerBackedLogSinkAvailable,
    retentionPolicyConfigured,
  };
}

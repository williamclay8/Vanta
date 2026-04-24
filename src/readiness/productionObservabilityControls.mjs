import { readFileSync } from "node:fs";

const controlsPath = new URL("../../ops/mainnet/production-observability.controls.json", import.meta.url);
const templatePath = new URL("../../ops/mainnet/production-observability.template.json", import.meta.url);

const controlKeyToPendingId = {
  alertPolicy: "alert-policies",
  incidentWorkflow: "incident-workflow",
  logSink: "render-native-log-sink",
  metricsDashboard: "metrics-dashboards",
  retentionPolicy: "retention-policy",
};

const completionStatuses = new Set(["configured", "verified"]);
const pendingServiceRefTokens = new Set(["production-service-ref-pending", "staging-service-url-pending"]);

export function createVantaProductionObservabilityControlsSummary() {
  const controls = JSON.parse(readFileSync(controlsPath, "utf8"));
  const template = JSON.parse(readFileSync(templatePath, "utf8"));
  const services = controls.services ?? [];
  const templateServices = template.services ?? [];
  const serviceControlKeys = ["logSink", "metricsDashboard", "alertPolicy", "retentionPolicy", "incidentWorkflow"];

  function everyServiceHas(controlKey) {
    return services.length > 0 && services.every((service) => completionStatuses.has(service.controls?.[controlKey]?.status));
  }

  const serviceStatuses = services.map((service) => {
    const controlsForService = service.controls ?? {};
    const templateService = templateServices.find((candidate) => candidate.service === service.service) ?? {};
    const pendingControlIds = serviceControlKeys
      .filter((controlKey) => !completionStatuses.has(controlsForService?.[controlKey]?.status))
      .map((controlKey) => controlKeyToPendingId[controlKey]);
    const configuredControlIds = serviceControlKeys
      .filter((controlKey) => completionStatuses.has(controlsForService?.[controlKey]?.status))
      .map((controlKey) => controlKeyToPendingId[controlKey]);
    const productionServiceRefPending = pendingServiceRefTokens.has(templateService.renderServiceRef)
      || pendingServiceRefTokens.has(templateService.productionUrlRef)
      || pendingServiceRefTokens.has(templateService.stagingUrlRef);

    return {
      configuredControlIds,
      pendingControlIds,
      productionServiceRefPending,
      renderServiceRef: templateService.renderServiceRef ?? null,
      service: service.service,
    };
  });

  const renderNativeLogSinkAvailable = everyServiceHas("logSink");
  const metricsDashboardsAvailable = everyServiceHas("metricsDashboard");
  const alertsConfigured = everyServiceHas("alertPolicy");
  const retentionPolicyConfigured = everyServiceHas("retentionPolicy");
  const incidentWorkflowReady = everyServiceHas("incidentWorkflow");
  const servicesMissingProductionServiceRef = serviceStatuses
    .filter((service) => service.productionServiceRefPending)
    .map((service) => service.service);
  const servicesReadyForRenderObservabilityWiring = serviceStatuses
    .filter((service) => !service.productionServiceRefPending)
    .map((service) => service.service);

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
    renderNativeLogSinkAvailable,
    retentionPolicyConfigured,
    serviceStatuses,
    servicesMissingProductionServiceRef,
    servicesReadyForRenderObservabilityWiring,
  };
}

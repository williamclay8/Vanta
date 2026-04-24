import { strict as assert } from "node:assert";
import { createVantaAbuseObservabilityContract } from "../src/readiness/abuseObservabilityContract.mjs";
import { createInMemoryRateLimiter, createVantaRateLimiterCatalog } from "../src/ops/vantaRateLimit.mjs";
import { createNoopOperatorEventSink } from "../src/ops/vantaOperatorEventSink.mjs";
import { readFileSync } from "node:fs";

const templatePath = new URL("../ops/mainnet/production-observability.template.json", import.meta.url);
const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

function buildStatus() {
  const contract = createVantaAbuseObservabilityContract();
  const rateLimiterCatalog = createVantaRateLimiterCatalog();
  const limiter = createInMemoryRateLimiter();
  const eventSink = createNoopOperatorEventSink();
  const template = JSON.parse(readFileSync(templatePath, "utf8"));

  return {
    checkedAt: new Date().toISOString(),
    globalRequirements: contract.globalRequirements,
    mainnetReady: false,
    nextImplementationStep: contract.nextImplementationStep,
    observabilityProvider: template.provider,
    providerBackedLogSinkAvailable: false,
    metricsDashboardsAvailable: false,
    alertsConfigured: false,
    retentionPolicyConfigured: false,
    incidentWorkflowReady: false,
    operatorEventSinkKind: eventSink.kind,
    operatorEventSinkProductionReady: eventSink.productionReady,
    operatorEventSinkSource: contract.operatorEventSinkModulePath,
    productionReady: false,
    preferredProductionRateLimiterKind: rateLimiterCatalog.preferredProductionKind,
    rateLimiterAvailableKinds: rateLimiterCatalog.availableKinds,
    rateLimiterKind: limiter.kind,
    rateLimiterModulePath: contract.rateLimiterModulePath,
    rateLimiterProductionReady: limiter.productionReady,
    safeTelemetrySource: contract.safeTelemetryModulePath,
    safety:
      "No provider API keys, webhook URLs, source tokens, bearer values, wallet keys, signed transaction material, or database URLs are printed.",
    services: template.services.map((service) => ({
      blockedUntil: service.blockedUntil,
      hasMetricsDashboardRef: Boolean(service.metricsDashboardRef),
      hasAlertPolicyRef: Boolean(service.alertPolicyRef),
      hasIncidentRunbookRef: Boolean(service.incidentRunbookRef),
      hasLogSourceRef: Boolean(service.logSourceRef),
      hasRetentionPolicyRef: Boolean(service.retentionPolicyRef),
      operatorDecision: service.operatorDecision,
      renderServiceRef: service.renderServiceRef,
      safeTelemetryRequired: service.safeTelemetryRequired,
      service: service.service,
    })),
    surfaceStatuses: contract.surfaces.map((surface) => ({
      auditEventCount: surface.auditEvents.length,
      alertCount: surface.alerts.length,
      id: surface.id,
      metricCount: surface.metrics.length,
      rateLimitCount: surface.rateLimits.length,
      status: surface.status,
    })),
    telemetrySource: template.telemetrySource,
    version: "vanta-production-abuse-observability-status-0.1",
  };
}

const result = buildStatus();

if (checkMode) {
  assert.equal(result.mainnetReady, false, "Abuse/observability status must not claim mainnet readiness.");
  assert.equal(result.productionReady, false, "Abuse/observability status must not claim production readiness.");
  assert.equal(result.observabilityProvider, "provider-neutral-skipped-by-operator");
  assert.equal(result.providerBackedLogSinkAvailable, false);
  assert.equal(result.metricsDashboardsAvailable, false);
  assert.equal(result.alertsConfigured, false);
  assert.equal(result.retentionPolicyConfigured, false);
  assert.equal(result.incidentWorkflowReady, false);
  assert.deepEqual(result.rateLimiterAvailableKinds, ["in-memory-rate-limiter", "postgres-rate-limiter"]);
  assert.equal(result.rateLimiterKind, "in-memory-rate-limiter");
  assert.equal(result.preferredProductionRateLimiterKind, "postgres-rate-limiter");
  assert.equal(result.rateLimiterModulePath, "src/ops/vantaRateLimit.mjs");
  assert.equal(result.rateLimiterProductionReady, false);
  assert.equal(result.safeTelemetrySource, "src/ops/vantaSafeTelemetry.mjs");
  assert.equal(result.operatorEventSinkKind, "noop-operator-event-sink");
  assert.equal(result.operatorEventSinkProductionReady, false);
  assert.equal(result.operatorEventSinkSource, "src/ops/vantaOperatorEventSink.mjs");
  assert.equal(result.telemetrySource, "src/ops/vantaSafeTelemetry.mjs");
  for (const surface of result.surfaceStatuses) {
    if (surface.id === "pay" || surface.id === "privatePoolV2") {
      assert.equal(
        surface.status,
        "privacy-safe-audit-sink-only",
        `${surface.id} must expose the narrow audit-sink wiring truth.`,
      );
    } else {
      assert.equal(surface.status, "not-wired", `${surface.id} must remain explicit about not being fully wired.`);
    }
    assert.ok(surface.rateLimitCount > 0, `${surface.id} must keep rate-limit inventory.`);
    assert.ok(surface.metricCount > 0, `${surface.id} must keep metric inventory.`);
    assert.ok(surface.alertCount > 0, `${surface.id} must keep alert inventory.`);
    assert.ok(surface.auditEventCount > 0, `${surface.id} must keep audit-event inventory.`);
  }
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta production abuse/observability status");
  console.log(`- observabilityProvider: ${result.observabilityProvider}`);
  console.log(`- providerBackedLogSinkAvailable: ${String(result.providerBackedLogSinkAvailable)}`);
  console.log(`- metricsDashboardsAvailable: ${String(result.metricsDashboardsAvailable)}`);
  console.log(`- alertsConfigured: ${String(result.alertsConfigured)}`);
  console.log(`- retentionPolicyConfigured: ${String(result.retentionPolicyConfigured)}`);
  console.log(`- incidentWorkflowReady: ${String(result.incidentWorkflowReady)}`);
  console.log(`- operatorEventSinkKind: ${result.operatorEventSinkKind}`);
  console.log(`- rateLimiterAvailableKinds: ${result.rateLimiterAvailableKinds.join(", ")}`);
  console.log(`- preferredProductionRateLimiterKind: ${result.preferredProductionRateLimiterKind}`);
  console.log(`- rateLimiterKind: ${result.rateLimiterKind}`);
  console.log(`- rateLimiterProductionReady: ${String(result.rateLimiterProductionReady)}`);
  console.log(`- safeTelemetrySource: ${result.safeTelemetrySource}`);
  console.log(`- productionReady: ${String(result.productionReady)}`);
}

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/abuse-observability.evidence.json");
const controlsPath = resolve(repoRoot, "ops/mainnet/production-observability.controls.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/abuse-observability.evidence.json.");
assert.ok(existsSync(controlsPath), "Missing ops/mainnet/production-observability.controls.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const controls = JSON.parse(readFileSync(controlsPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-production-abuse-observability-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.lastStatusRef, "npm run mainnet:abuse-observability-status-check");
assert.equal(
  evidence.privatePoolV2RuntimeRef,
  "doppler run --config prd --project vanta -- npm run mainnet:abuse-observability-runtime-status-auth",
);
assert.equal(evidence.checkedControlsRef, "ops/mainnet/production-observability.controls.json");
assert.equal(evidence.payRuntimeStatus, "staging-or-local-only");
assert.equal(evidence.contractRef, "npm run mainnet:abuse-observability-check");
assert.equal(evidence.safeTelemetryRef, "npm run ops:safe-telemetry-check");
assert.equal(evidence.rateLimitRef, "npm run ops:rate-limit-check");
assert.equal(evidence.observabilitySinkRef, "npm run mainnet:observability-sink-check");
assert.equal(evidence.observabilityProvider, "render-native-only-selected");
assert.equal(controls.version, "vanta-production-observability-controls-0.1");
assert.equal(controls.mainnetReady, false);
assert.equal(controls.productionReady, false);
assert.equal(controls.templateRef, "ops/mainnet/production-observability.template.json");
assert.deepEqual(controls.allowedStatuses, [
  "pending",
  "configured",
  "verified",
  "operator-skipped-control",
]);
const allowedStatuses = new Set(controls.allowedStatuses);
const controlIds = [
  "logSink",
  "metricsDashboard",
  "alertPolicy",
  "retentionPolicy",
  "incidentWorkflow",
];
for (const service of controls.services) {
  for (const controlId of controlIds) {
    const control = service.controls?.[controlId];
    assert.ok(control, `${service.service} must declare observability control ${controlId}.`);
    assert.ok(allowedStatuses.has(control.status), `${service.service}/${controlId} must use an allowed status.`);
    assert.ok(control.evidenceRef, `${service.service}/${controlId} must include an evidence ref.`);
    assert.ok(control.verificationRef, `${service.service}/${controlId} must include a verification ref.`);
  }
}
const isConfigured = (status) => status === "configured" || status === "verified";
const everyServiceHas = (controlId) => controls.services.every((service) => isConfigured(service.controls[controlId].status));
const derivedPendingObservabilityControls = [
  ...(everyServiceHas("logSink") ? [] : ["render-native-log-sink"]),
  ...(everyServiceHas("metricsDashboard") ? [] : ["metrics-dashboards"]),
  ...(everyServiceHas("alertPolicy") ? [] : ["alert-policies"]),
  ...(everyServiceHas("retentionPolicy") ? [] : ["retention-policy"]),
  ...(everyServiceHas("incidentWorkflow") ? [] : ["incident-workflow"]),
];
assert.equal(evidence.renderNativeLogSinkAvailable, everyServiceHas("logSink"));
assert.equal(evidence.metricsDashboardsAvailable, everyServiceHas("metricsDashboard"));
assert.equal(evidence.alertsConfigured, everyServiceHas("alertPolicy"));
assert.equal(evidence.retentionPolicyConfigured, everyServiceHas("retentionPolicy"));
assert.equal(evidence.incidentWorkflowReady, everyServiceHas("incidentWorkflow"));
assert.deepEqual(evidence.pendingObservabilityControls, derivedPendingObservabilityControls);
assert.deepEqual(evidence.servicesMissingProductionServiceRef, [
  "vanta-strategy",
  "vanta-operator-control-plane",
]);
assert.deepEqual(evidence.servicesReadyForRenderObservabilityWiring, [
  "vanta-pay",
  "vanta-private-pool-v2",
]);
assert.equal(evidence.operatorEventSinkKind, "noop-operator-event-sink");
assert.equal(evidence.operatorEventSinkProductionReady, false);
assert.equal(evidence.operatorEventSinkSource, "src/ops/vantaOperatorEventSink.mjs");
assert.equal(evidence.preferredProductionRateLimiterKind, "postgres-rate-limiter");
assert.equal(evidence.privatePoolV2RateLimiterPreferredKind, "postgres-durable-shared-window");
assert.equal(evidence.privatePoolV2RuntimeMatchesPreferredRateLimiter, true);
assert.equal(evidence.privatePoolV2Runtime.auditEventSinkKind, "postgres-operator-event-sink");
assert.equal(evidence.privatePoolV2Runtime.operatorUrlRef, "VANTA_PRIVATE_POOL_V2_OPERATOR_URL");
assert.equal(evidence.privatePoolV2Runtime.rateLimitPerMinute, 600);
assert.equal(evidence.privatePoolV2Runtime.rateLimiter, "postgres-durable-shared-window");
assert.equal(evidence.privatePoolV2Runtime.runtimeMode, "remote-services");
assert.equal(evidence.privatePoolV2Runtime.storageDurableStoreConfigured, true);
assert.equal(evidence.privatePoolV2Runtime.storageKind, "postgres-jsonb-snapshot-store");
assert.deepEqual(evidence.rateLimiterAvailableKinds, ["in-memory-rate-limiter", "postgres-rate-limiter"]);
assert.equal(evidence.rateLimiterKind, "in-memory-rate-limiter");
assert.equal(evidence.rateLimiterModulePath, "src/ops/vantaRateLimit.mjs");
assert.equal(evidence.rateLimiterProductionReady, false);
assert.equal(evidence.safeTelemetrySource, "src/ops/vantaSafeTelemetry.mjs");
assert.deepEqual(
  evidence.surfaceStatuses.map((surface) => surface.id),
  ["pay", "privatePoolV2", "strategy", "operator"],
);
for (const surface of evidence.surfaceStatuses) {
  if (surface.id === "pay" || surface.id === "privatePoolV2") {
    assert.equal(surface.status, "privacy-safe-audit-sink-only", `${surface.id} must expose the audit sink boundary.`);
  } else if (surface.id === "strategy") {
    assert.equal(surface.status, "local-safe-audit-sink-only", "Strategy must expose local safe audit-sink coverage.");
    assert.equal(surface.auditEventSinkKind, "noop-operator-event-sink");
    assert.equal(surface.productionReady, false);
  } else {
    assert.equal(surface.status, "not-wired", `${surface.id} must remain explicit about not being fully wired.`);
  }
}
assert.ok(
  evidence.safety.includes("No provider API keys"),
  "Abuse/observability evidence must state the no-secret safety policy.",
);
assert.ok(
  evidence.deploymentTruth.includes("preferred Postgres durable shared-window rate limiter"),
  "Abuse/observability evidence must record the deployed preferred rate limiter explicitly.",
);
assert.ok(
  evidence.deploymentTruth.includes("Postgres-backed rate-limit implementation"),
  "Abuse/observability evidence must record the durable rate-limit path.",
);
assert.ok(
  evidence.deploymentTruth.includes("Pay and Private Pool v2 already have production Render service refs"),
  "Abuse/observability evidence must preserve which services are ready for Render-native observability wiring now.",
);
assert.ok(
  evidence.deploymentTruth.includes("Strategy local safe telemetry plus local no-op audit-sink queue coverage"),
  "Abuse/observability evidence must preserve Strategy local audit-sink coverage.",
);
assert.ok(
  evidence.deploymentTruth.includes("configured operator-runbook incident workflow refs"),
  "Abuse/observability evidence must preserve the configured incident workflow truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("operator control plane still lacks a production service ref"),
  "Abuse/observability evidence must preserve the remaining missing operator production service ref.",
);
assert.ok(
  evidence.deploymentTruth.includes("alert policies, retention policy, and the missing-service provider controls are still pending"),
  "Abuse/observability evidence must preserve the explicit per-service pending provider-controls truth.",
);
assert.ok(
  evidence.nextOperatorAction.includes("configure alert policies and retention for vanta-pay and vanta-private-pool-v2"),
  "Abuse/observability evidence must preserve the per-service wiring order.",
);
assert.ok(
  evidence.nextOperatorAction.includes("vanta-strategy and vanta-operator-control-plane"),
  "Abuse/observability evidence must preserve the missing-service follow-up order.",
);
assert.equal(
  evidence.renderNativeObservabilityEvidenceRef,
  "ops/mainnet/render-native-observability.evidence.json",
  "Abuse/observability evidence must link the Render-native log/metrics evidence packet.",
);
assert.deepEqual(
  evidence.servicesWithVerifiedRenderNativeLogAndMetrics,
  ["vanta-pay", "vanta-private-pool-v2"],
  "Abuse/observability evidence must preserve the services with verified Render-native log and metrics evidence.",
);

const serialized = JSON.stringify(evidence);
for (const forbidden of [
  "postgres://",
  "postgresql://",
  "Bearer ",
  "DATABASE_URL=",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "sk_live_",
  "whsec_",
]) {
  assert.ok(!serialized.includes(forbidden), `Abuse/observability evidence must not contain ${forbidden}.`);
}
const controlsSerialized = JSON.stringify(controls);
for (const forbidden of [
  "postgres://",
  "postgresql://",
  "Bearer ",
  "DATABASE_URL=",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "sk_live_",
  "whsec_",
]) {
  assert.ok(!controlsSerialized.includes(forbidden), `Observability controls must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:abuse-observability-status"],
  "node scripts/print-vanta-production-abuse-observability-status.mjs",
  "package.json must expose mainnet:abuse-observability-status.",
);
assert.equal(
  packageJson.scripts["ops:operator-event-sink-check"],
  "node scripts/check-vanta-operator-event-sink.mjs",
  "package.json must expose ops:operator-event-sink-check.",
);
assert.equal(
  packageJson.scripts["mainnet:abuse-observability-status-check"],
  "node scripts/print-vanta-production-abuse-observability-status.mjs --check",
  "package.json must expose mainnet:abuse-observability-status-check.",
);
assert.equal(
  packageJson.scripts["mainnet:abuse-observability-runtime-status"],
  "node scripts/print-vanta-production-abuse-observability-runtime-status.mjs",
  "package.json must expose mainnet:abuse-observability-runtime-status.",
);
assert.equal(
  packageJson.scripts["mainnet:abuse-observability-runtime-status-check"],
  "node scripts/print-vanta-production-abuse-observability-runtime-status.mjs --check",
  "package.json must expose mainnet:abuse-observability-runtime-status-check.",
);
assert.equal(
  packageJson.scripts["mainnet:abuse-observability-runtime-status-auth"],
  "node scripts/print-vanta-production-abuse-observability-runtime-status.mjs --require-auth",
  "package.json must expose mainnet:abuse-observability-runtime-status-auth.",
);
assert.equal(
  packageJson.scripts["mainnet:abuse-observability-evidence-check"],
  "node scripts/check-vanta-abuse-observability-evidence.mjs",
  "package.json must expose mainnet:abuse-observability-evidence-check.",
);
assert.equal(
  packageJson.scripts["mainnet:render-native-observability-evidence-check"],
  "node scripts/check-vanta-render-native-observability-evidence.mjs",
  "package.json must expose mainnet:render-native-observability-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:abuse-observability-evidence-check"),
  "mainnet:preflight must include abuse/observability evidence check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run ops:operator-event-sink-check"),
  "mainnet:preflight must include operator event sink check.",
);

console.log("Vanta abuse/observability evidence check: PASS");

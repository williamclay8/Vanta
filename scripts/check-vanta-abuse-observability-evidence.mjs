import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/abuse-observability.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/abuse-observability.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-production-abuse-observability-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.lastStatusRef, "npm run mainnet:abuse-observability-status-check");
assert.equal(
  evidence.privatePoolV2RuntimeRef,
  "doppler run --config prd --project vanta -- npm run mainnet:abuse-observability-runtime-status-auth",
);
assert.equal(evidence.payRuntimeStatus, "staging-or-local-only");
assert.equal(evidence.contractRef, "npm run mainnet:abuse-observability-check");
assert.equal(evidence.safeTelemetryRef, "npm run ops:safe-telemetry-check");
assert.equal(evidence.rateLimitRef, "npm run ops:rate-limit-check");
assert.equal(evidence.observabilitySinkRef, "npm run mainnet:observability-sink-check");
assert.equal(evidence.observabilityProvider, "provider-neutral-skipped-by-operator");
assert.equal(evidence.providerBackedLogSinkAvailable, false);
assert.equal(evidence.metricsDashboardsAvailable, false);
assert.equal(evidence.alertsConfigured, false);
assert.equal(evidence.retentionPolicyConfigured, false);
assert.equal(evidence.incidentWorkflowReady, false);
assert.deepEqual(evidence.pendingObservabilityControls, [
  "provider-backed-log-sink",
  "metrics-dashboards",
  "alert-policies",
  "retention-policy",
  "incident-workflow",
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
  evidence.deploymentTruth.includes("provider-backed log sink, dashboards, alerts, retention, and incident workflow evidence are all still pending"),
  "Abuse/observability evidence must preserve the explicit pending-ops-controls truth.",
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
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:abuse-observability-evidence-check"),
  "mainnet:preflight must include abuse/observability evidence check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run ops:operator-event-sink-check"),
  "mainnet:preflight must include operator event sink check.",
);

console.log("Vanta abuse/observability evidence check: PASS");

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/render-native-observability.evidence.json");
const controlsPath = resolve(repoRoot, "ops/mainnet/production-observability.controls.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing Render-native observability evidence packet.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const controls = JSON.parse(readFileSync(controlsPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-render-native-observability-evidence-0.1");
assert.match(evidence.checkedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
assert.equal(evidence.workspaceRef, "render-workspace:tea-d7j37af7f7vs739ii8rg");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.privacyClaimAllowed, false);
assert.equal(evidence.secretPolicy, "references-only-no-provider-secrets");
assert.equal(evidence.verifiedServices.length, 2);

const expected = new Map([
  ["vanta-pay", "srv-d7j3ggqqqhas739for80"],
  ["vanta-private-pool-v2", "srv-d7jgl3d8nd3s73a9efng"],
]);

for (const service of evidence.verifiedServices) {
  assert.equal(service.renderServiceRef, expected.get(service.service));
  assert.ok(service.dashboardRef.startsWith("https://dashboard.render.com/"));
  assert.ok(service.productionUrlRef.startsWith("https://"));
  assert.ok(service.logEvidenceRef.startsWith(`render-logs:${service.service}`));
  assert.ok(service.metricEvidenceRef.startsWith(`render-metrics:${service.service}`));
  assert.deepEqual(service.verifiedControlIds, ["render-native-log-sink", "metrics-dashboards"]);
  assert.equal(service.observedSafeTelemetry.event, "operator_http_request");
  assert.equal(service.observedSafeTelemetry.queryPresent, false);
  assert.equal(service.observedSafeTelemetry.rawRemoteAddressStoredInEvidence, false);
  assert.equal(service.observedSafeTelemetry.remoteAddressShape, "sha256:<redacted-hash>");
  assert.deepEqual(service.observedMetrics, [
    "cpu_usage",
    "memory_usage",
    "http_request_count",
    "http_latency",
    "instance_count",
  ]);

  const controlService = controls.services.find((candidate) => candidate.service === service.service);
  assert.ok(controlService, `${service.service} must have an observability controls entry.`);
  assert.equal(controlService.controls.logSink.status, "verified");
  assert.equal(controlService.controls.metricsDashboard.status, "verified");
  assert.equal(controlService.controls.alertPolicy.status, "pending");
  assert.equal(controlService.controls.retentionPolicy.status, "pending");
}

for (const serviceName of ["vanta-strategy", "vanta-operator-control-plane"]) {
  const controlService = controls.services.find((candidate) => candidate.service === serviceName);
  assert.ok(controlService, `${serviceName} must remain represented.`);
  assert.equal(controlService.controls.logSink.status, "pending");
  assert.equal(controlService.controls.metricsDashboard.status, "pending");
}

for (const pending of [
  "alert-policies",
  "retention-policy",
  "strategy-production-service-ref",
  "operator-control-plane-production-service-ref",
]) {
  assert.ok(evidence.stillPendingControls.includes(pending), `Missing pending control ${pending}.`);
}

for (const command of [
  "npm run mainnet:render-native-observability-evidence-check",
  "npm run mainnet:abuse-observability-evidence-check",
  "npm run mainnet:observability-sink-check",
]) {
  assert.ok(evidence.canonicalVerificationCommands.includes(command), `Missing command ${command}.`);
}

assert.ok(evidence.nonClaims.includes("no production observability completion claim"));
assert.ok(evidence.safety.includes("No provider API keys"));

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
  "clientIP=",
]) {
  assert.ok(!serialized.includes(forbidden), `Render-native observability evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:render-native-observability-evidence-check"],
  "node scripts/check-vanta-render-native-observability-evidence.mjs",
);

console.log("Vanta Render-native observability evidence check: PASS");

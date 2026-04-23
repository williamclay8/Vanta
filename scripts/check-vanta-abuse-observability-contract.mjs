import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVantaAbuseObservabilityContract } from "../src/readiness/abuseObservabilityContract.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const stagingMonitoringManifestPath = resolve(repoRoot, "ops/mainnet/staging-monitoring.manifest.json");
const stagingSmokeEvidencePath = resolve(repoRoot, "ops/mainnet/staging-smoke-evidence.manifest.json");
const productionObservabilityTemplatePath = resolve(
  repoRoot,
  "ops/mainnet/production-observability.template.json",
);
const contract = createVantaAbuseObservabilityContract();

assert.equal(contract.version, "vanta-abuse-observability-contract-0.1");
assert.equal(contract.productionReady, false);
assert.equal(contract.mainnetReady, false);

const requiredSurfaces = ["pay", "privatePoolV2", "strategy", "operator"];
for (const surfaceId of requiredSurfaces) {
  const surface = contract.surfaces.find((candidate) => candidate.id === surfaceId);
  assert.ok(surface, `Missing abuse/observability surface: ${surfaceId}.`);
  if (surfaceId === "pay" || surfaceId === "privatePoolV2") {
    assert.equal(surface.status, "privacy-safe-audit-sink-only");
  } else {
    assert.equal(surface.status, "not-wired");
  }
  assert.ok(surface.rateLimits.length > 0, `${surfaceId} must declare rate limits.`);
  assert.ok(surface.metrics.length > 0, `${surfaceId} must declare metrics.`);
  assert.ok(surface.alerts.length > 0, `${surfaceId} must declare alerts.`);
  assert.ok(surface.auditEvents.length > 0, `${surfaceId} must declare audit events.`);
}

assert.ok(contract.globalRequirements.includes("structured-json-logs"), "Missing structured log requirement.");
assert.ok(contract.globalRequirements.includes("privacy-preserving-telemetry"), "Missing privacy telemetry requirement.");
assert.ok(contract.globalRequirements.includes("no-secret-logging"), "Missing no-secret logging requirement.");
assert.ok(contract.globalRequirements.includes("operator-alert-routing"), "Missing alert routing requirement.");
assert.ok(contract.globalRequirements.includes("abuse-response-runbook"), "Missing abuse-response runbook requirement.");
assert.equal(
  contract.safeTelemetryModulePath,
  "src/ops/vantaSafeTelemetry.mjs",
  "Abuse/observability contract must point at the shared safe telemetry helper.",
);
assert.equal(
  contract.operatorEventSinkModulePath,
  "src/ops/vantaOperatorEventSink.mjs",
  "Abuse/observability contract must point at the operator event sink helper.",
);
assert.equal(
  contract.productionObservabilityTemplatePath,
  "ops/mainnet/production-observability.template.json",
  "Abuse/observability contract must point at the production observability template.",
);

assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:abuse-observability-check"),
  "Missing abuse/observability verification command.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run ops:safe-telemetry-check"),
  "Missing safe telemetry verification command.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run ops:operator-event-sink-check"),
  "Missing operator event sink verification command.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:observability-sink-check"),
  "Missing production observability sink verification command.",
);
assert.ok(
  contract.nextImplementationStep.includes("production log sink"),
  "Next implementation step should target the production log sink.",
);

assert.ok(
  existsSync(stagingMonitoringManifestPath),
  "Missing ops/mainnet/staging-monitoring.manifest.json.",
);
assert.ok(
  existsSync(stagingSmokeEvidencePath),
  "Missing ops/mainnet/staging-smoke-evidence.manifest.json.",
);
assert.ok(
  existsSync(productionObservabilityTemplatePath),
  "Missing ops/mainnet/production-observability.template.json.",
);
const stagingMonitoringManifest = JSON.parse(readFileSync(stagingMonitoringManifestPath, "utf8"));
const stagingSmokeEvidence = JSON.parse(readFileSync(stagingSmokeEvidencePath, "utf8"));
const productionObservabilityTemplate = JSON.parse(
  readFileSync(productionObservabilityTemplatePath, "utf8"),
);

assert.equal(stagingMonitoringManifest.version, "vanta-staging-monitoring-manifest-0.1");
assert.equal(stagingMonitoringManifest.mainnetReady, false);
assert.equal(stagingMonitoringManifest.productionReady, false);
assert.equal(stagingMonitoringManifest.provider, "better-stack");
assert.equal(stagingMonitoringManifest.secretPolicy, "public-health-checks-only-no-alert-secrets");
assert.equal(stagingMonitoringManifest.alertContact, "email");
assert.ok(Array.isArray(stagingMonitoringManifest.monitors), "Monitoring manifest must include monitors.");
assert.equal(stagingSmokeEvidence.version, "vanta-staging-smoke-evidence-0.1");
assert.equal(stagingSmokeEvidence.mainnetReady, false);
assert.equal(stagingSmokeEvidence.productionReady, false);
assert.equal(stagingSmokeEvidence.secretPolicy, "public-health-checks-only-no-secrets");
assert.ok(
  stagingSmokeEvidence.limitations.includes("not production role-service smoke evidence"),
  "Staging smoke evidence must not claim production role-service smoke evidence.",
);

const requiredMonitors = new Map([
  ["Vanta Pay Staging", "https://vanta-0wwi.onrender.com/health"],
  ["Vanta Private Pool v2 Staging", "https://vanta-staging-private-pool-v2.onrender.com/health"],
]);

for (const [name, url] of requiredMonitors) {
  const monitor = stagingMonitoringManifest.monitors.find((candidate) => candidate.name === name);
  assert.ok(monitor, `Missing Better Stack monitor: ${name}.`);
  assert.equal(monitor.url, url, `${name} must monitor the public /health endpoint.`);
  assert.equal(monitor.method, "GET", `${name} must use GET.`);
  assert.equal(monitor.expectedStatus, 200, `${name} must expect HTTP 200.`);
  assert.equal(monitor.authRequired, false, `${name} must not require auth.`);
  assert.ok(monitor.publicHealthCheckOnly, `${name} must be public-health-check-only.`);
}

const serializedManifest = JSON.stringify(stagingMonitoringManifest);
for (const forbidden of ["apiKey", "webhookUrl", "Authorization", "Bearer ", "rawToken", "rawSecret"]) {
  assert.ok(
    !serializedManifest.includes(forbidden),
    `Monitoring manifest must not include secret-bearing field or value: ${forbidden}`,
  );
}

assert.equal(productionObservabilityTemplate.version, "vanta-production-observability-template-0.1");
assert.equal(productionObservabilityTemplate.mainnetReady, false);
assert.equal(productionObservabilityTemplate.productionReady, false);
assert.equal(productionObservabilityTemplate.provider, "provider-neutral-skipped-by-operator");
assert.equal(productionObservabilityTemplate.secretPolicy, "references-only-no-provider-secrets");
assert.equal(productionObservabilityTemplate.telemetrySource, "src/ops/vantaSafeTelemetry.mjs");

console.log("Vanta abuse and observability contract check: PASS");

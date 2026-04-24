import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(repoRoot, "ops/mainnet/production-observability.template.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

assert.equal(manifest.version, "vanta-production-observability-template-0.1");
assert.equal(manifest.mainnetReady, false);
assert.equal(manifest.productionReady, false);
assert.equal(manifest.provider, "render-native-only-selected");
assert.equal(manifest.secretPolicy, "references-only-no-provider-secrets");
assert.equal(manifest.telemetrySource, "src/ops/vantaSafeTelemetry.mjs");
assert.ok(Array.isArray(manifest.services), "Production observability template must include services.");

const requiredServices = new Map([
  ["vanta-pay", "srv-d7j3ggqqqhas739for80"],
  ["vanta-private-pool-v2", "srv-d7jgl3d8nd3s73a9efng"],
  ["vanta-strategy", "production-service-ref-pending"],
  ["vanta-operator-control-plane", "production-service-ref-pending"],
]);

for (const [service, renderServiceRef] of requiredServices) {
  const surface = manifest.services.find((candidate) => candidate.service === service);
  assert.ok(surface, `Missing production observability surface for ${service}.`);
  assert.equal(surface.renderServiceRef, renderServiceRef);
  assert.ok(surface.logSourceRef, `${service} must declare a log source ref.`);
  assert.ok(surface.metricsDashboardRef, `${service} must declare a metrics dashboard ref.`);
  assert.ok(surface.alertPolicyRef, `${service} must declare an alert policy ref.`);
  assert.ok(surface.incidentRunbookRef, `${service} must declare an incident runbook ref.`);
  assert.ok(surface.retentionPolicyRef, `${service} must declare a retention policy ref.`);
  assert.ok(surface.safeTelemetryRequired, `${service} must require safe telemetry.`);
  assert.ok(
    surface.operatorDecision?.includes("Render-native only selected"),
    `${service} must record the Render-native-only observability decision.`,
  );
}

const privatePoolSurface = manifest.services.find((candidate) => candidate.service === "vanta-private-pool-v2");
const roleServiceRefs = privatePoolSurface.roleServiceRefs ?? [];
for (const [role, renderServiceRef] of [
  ["indexer", "srv-d7jfqru7r5hc73b6oelg"],
  ["prover", "srv-d7jg4arbc2fs73c1449g"],
  ["relayer", "srv-d7jg9jrbc2fs73c161gg"],
  ["verifier", "srv-d7jgf7n7f7vs73ebdu40"],
  ["operator", "srv-d7jgl3d8nd3s73a9efng"],
]) {
  const roleSurface = roleServiceRefs.find((candidate) => candidate.role === role);
  assert.ok(roleSurface, `Missing Private Pool v2 production observability role ref: ${role}.`);
  assert.equal(roleSurface.renderServiceRef, renderServiceRef);
  assert.ok(
    roleSurface.productionUrlRef?.startsWith("https://vanta-prod-private-pool-v2-"),
    `${role} must include a production URL ref.`,
  );
}

for (const alert of ["service_down", "5xx_rate_high", "auth_rejection_spike", "rate_limit_spike"]) {
  assert.ok(manifest.requiredAlerts.includes(alert), `Missing required alert: ${alert}.`);
}

for (const field of [
  "request body",
  "response body",
  "query value",
  "raw ip",
  "authorization",
  "cookie",
  "api key",
  "database url",
  "private key",
  "seed phrase",
  "mnemonic",
]) {
  assert.ok(manifest.forbiddenLogData.includes(field), `Missing forbidden log data: ${field}.`);
}

const serialized = JSON.stringify(manifest);
for (const forbidden of [
  "Bearer ",
  "betterstack_token",
  "logtail_token",
  "source_token",
  "apiKey",
  "api_key",
  "webhookUrl",
  "DATABASE_URL=",
  "postgres://",
  "sk_live_",
  "whsec_",
]) {
  assert.ok(!serialized.includes(forbidden), `Observability template must not include ${forbidden}.`);
}

console.log("Vanta production observability sink template check: PASS");

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
assert.equal(evidence.contractRef, "npm run mainnet:abuse-observability-check");
assert.equal(evidence.safeTelemetryRef, "npm run ops:safe-telemetry-check");
assert.equal(evidence.rateLimitRef, "npm run ops:rate-limit-check");
assert.equal(evidence.observabilitySinkRef, "npm run mainnet:observability-sink-check");
assert.equal(evidence.observabilityProvider, "provider-neutral-skipped-by-operator");
assert.equal(evidence.rateLimiterKind, "in-memory-rate-limiter");
assert.equal(evidence.rateLimiterProductionReady, false);
assert.equal(evidence.safeTelemetrySource, "src/ops/vantaSafeTelemetry.mjs");
assert.deepEqual(
  evidence.surfaceStatuses.map((surface) => surface.id),
  ["pay", "privatePoolV2", "strategy", "operator"],
);
for (const surface of evidence.surfaceStatuses) {
  assert.equal(surface.status, "not-wired", `${surface.id} must remain explicit about not being fully wired.`);
}
assert.ok(
  evidence.safety.includes("No provider API keys"),
  "Abuse/observability evidence must state the no-secret safety policy.",
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
  packageJson.scripts["mainnet:abuse-observability-status-check"],
  "node scripts/print-vanta-production-abuse-observability-status.mjs --check",
  "package.json must expose mainnet:abuse-observability-status-check.",
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

console.log("Vanta abuse/observability evidence check: PASS");

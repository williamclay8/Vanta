import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/production-incident-workflow.evidence.json");
const controlsPath = resolve(repoRoot, "ops/mainnet/production-observability.controls.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing production incident workflow evidence.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const controls = JSON.parse(readFileSync(controlsPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-production-incident-workflow-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.status, "configured-runbook-tabletop");
assert.equal(evidence.exercisedAtRef, "operator-tabletop:2026-04-29-observability-incident-workflow");

for (const ref of [
  "docs/operator-runbook.md#pay-operator",
  "docs/operator-runbook.md#private-pool-v2-operator",
  "docs/operator-runbook.md#readiness-truth",
  "docs/mainnet-deployment-runbook.md#monitoring-and-incident-response",
  "docs/incident-response-runbook.md#stop-or-suspend",
  "docs/incident-response-runbook.md#secret-safe-debugging",
  "docs/key-custody-runbook.md#emergency-freeze",
  "runbook/disable-private-pool-v2-services-and-beta-actions",
]) {
  assert.ok(evidence.checkedRunbookRefs.includes(ref), `Missing incident workflow runbook ref: ${ref}.`);
}

for (const ref of [
  "docs/incident-response-runbook.md",
  "docs/key-custody-runbook.md",
  "docs/threat-model.md",
]) {
  assert.ok(evidence.runbookPublicationRefs?.includes(ref), `Missing incident workflow publication ref: ${ref}.`);
}

for (const service of [
  "vanta-pay",
  "vanta-private-pool-v2",
  "vanta-strategy",
  "vanta-operator-control-plane",
]) {
  assert.ok(evidence.exerciseScope.includes(service), `Missing exercised service scope: ${service}.`);
  const control = controls.services.find((entry) => entry.service === service)?.controls?.incidentWorkflow;
  assert.ok(control, `${service} must have an incidentWorkflow control.`);
  assert.equal(control.status, "configured", `${service} incident workflow must be configured.`);
  assert.equal(control.verificationRef, "npm run mainnet:production-incident-workflow-evidence-check");
}

for (const assertion of [
  "follow docs/incident-response-runbook.md for stop, preserve, debug, disclosure, recovery, and post-incident review",
  "stop bounded beta/live actions before debugging",
  "preserve logs and evidence refs without copying secrets",
  "avoid unapproved real-funds actions",
  "return readiness and approval surfaces to blocked if the bounded action/window/funds-at-risk contract drifts",
]) {
  assert.ok(evidence.exerciseAssertions.includes(assertion), `Missing incident workflow assertion: ${assertion}.`);
}

assert.deepEqual(evidence.configuredControls, ["incident-workflow"]);
assert.deepEqual(evidence.stillPendingProviderControls, [
  "render-native-log-sink",
  "metrics-dashboards",
  "alert-policies",
  "retention-policy",
]);

for (const nonClaim of [
  "not provider-backed alert routing",
  "not a Render log-sink claim",
  "not a metrics-dashboard claim",
  "not a retention-policy claim",
  "not production-ready",
  "not mainnet-ready",
]) {
  assert.ok(evidence.nonClaims.includes(nonClaim), `Missing non-claim: ${nonClaim}.`);
}

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
  assert.ok(!serialized.includes(forbidden), `Incident workflow evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:production-incident-workflow-evidence-check"],
  "node scripts/check-vanta-production-incident-workflow-evidence.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:production-incident-workflow-evidence-check"),
  "mainnet:preflight must include production incident workflow evidence check.",
);

console.log("Vanta production incident workflow evidence check: PASS");

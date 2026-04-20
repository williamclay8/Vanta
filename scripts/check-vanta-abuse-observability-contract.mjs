import { strict as assert } from "node:assert";
import { createVantaAbuseObservabilityContract } from "../src/readiness/abuseObservabilityContract.mjs";

const contract = createVantaAbuseObservabilityContract();

assert.equal(contract.version, "vanta-abuse-observability-contract-0.1");
assert.equal(contract.productionReady, false);
assert.equal(contract.mainnetReady, false);

const requiredSurfaces = ["pay", "privatePoolV2", "strategy", "operator"];
for (const surfaceId of requiredSurfaces) {
  const surface = contract.surfaces.find((candidate) => candidate.id === surfaceId);
  assert.ok(surface, `Missing abuse/observability surface: ${surfaceId}.`);
  assert.equal(surface.status, "not-wired");
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

assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:abuse-observability-check"),
  "Missing abuse/observability verification command.",
);
assert.ok(
  contract.nextImplementationStep.includes("middleware"),
  "Next implementation step should target middleware.",
);

console.log("Vanta abuse and observability contract check: PASS");

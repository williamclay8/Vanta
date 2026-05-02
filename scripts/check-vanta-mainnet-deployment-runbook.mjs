import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const runbookPath = resolve(repoRoot, "docs/mainnet-deployment-runbook.md");

assert.ok(existsSync(runbookPath), "Missing docs/mainnet-deployment-runbook.md.");

const source = readFileSync(runbookPath, "utf8");

for (const phrase of [
  "# Mainnet Deployment Runbook",
  "mainnetReady: false",
  "productionReady: false",
  "Do not paste secrets into chat",
  "Render Workspace Rule",
  "William's workspace",
  "tea-d7j37af7f7vs739ii8rg",
  "Do not continue Render provider work while the selected workspace is empty or different",
  "npm run mainnet:render-workspace-check",
  "npm run mainnet:render-api-workspace-check",
  "npm run mainnet:render-api-services-check",
  "ops/mainnet/private-pool-v2-services.manifest.json",
  "docs/production-private-pool-v2-service-setup.md",
  "docs/production-db-refs-runbook.md",
  "ops/mainnet/production-observability.template.json",
  "ops/mainnet/production-backup-restore.evidence.json",
  "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
  "ops/mainnet/mainnet-approval-gates.evidence.json",
  "ops/mainnet/mainnet-real-funds-approval.evidence.json",
  "VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services",
  "npm run mainnet:production-service-setup-check",
  "npm run mainnet:deployment-manifest-check",
  "npm run mainnet:deployment-runbook-check",
  "npm run mainnet:private-rail-route-health-auth",
  "npm run mainnet:private-pool-v2-production-smoke-write",
  "npm run mainnet:production-smoke-evidence-check",
  "npm run mainnet:observability-sink-check",
  "npm run ops:rate-limit-check",
  "npm run mainnet:approval-gates-check",
  "npm run mainnet:real-funds-approval-check",
  "npm run mainnet:preflight",
  "runbook/disable-private-pool-v2-services-and-beta-actions",
  "launch-runbook/vanta-mainnet-beta-001",
  "Incident response",
  "Rollback",
  "no-real-funds",
]) {
  assert.ok(source.includes(phrase), `Mainnet deployment runbook missing required phrase: ${phrase}`);
}

for (const forbidden of ["Bearer ", "DATABASE_URL=", "PRIVATE KEY"]) {
  assert.ok(!source.includes(forbidden), `Mainnet deployment runbook must not include ${forbidden}.`);
}

console.log("Vanta mainnet deployment runbook check: PASS");

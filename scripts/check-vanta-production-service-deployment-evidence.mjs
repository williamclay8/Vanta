import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/service-deployment.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/service-deployment.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-production-service-deployment-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.lastStatusRef, "npm run mainnet:service-deployment-status-check");
assert.match(
  evidence.routeHealthLastCheckedAt,
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
  "Service deployment evidence must record a sanitized route-health check timestamp.",
);
assert.equal(evidence.manifestRef, "ops/mainnet/private-pool-v2-services.manifest.json");
assert.equal(
  evidence.roleServiceReplayEvidenceRef,
  "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
);
assert.equal(evidence.roleServiceNetworkRef, "npm run private-pool-v2:service-network-check");
assert.equal(evidence.roleServiceReplayVerified, true);
assert.equal(evidence.productionSmokeEvidenceRef, "ops/mainnet/private-pool-v2-production-smoke.evidence.json");
assert.equal(evidence.productionSmokeHealthPassed, true);
assert.equal(evidence.productionSmokeTargetsPassed, true);
assert.equal(evidence.observabilityControlsPending, true);
assert.equal(evidence.backupRestoreMaturityPending, false);
assert.equal(evidence.backupRestoreControlMode, "operator-skipped-controls-with-partial-readback-passed");
assert.equal(evidence.backupRestoreEvidenceRef, "ops/mainnet/production-backup-restore.evidence.json");
assert.deepEqual(evidence.restoreReadbackCoverage, {
  pay: "operator-skipped-control",
  privatePoolV2: "passed",
  privatePoolV2Roles: "passed",
  strategy: "passed",
  operator: "passed",
});
assert.equal(evidence.realFundsReadinessPending, true);
assert.deepEqual(evidence.pendingProductionControls, [
  "observability-provider-controls",
  "real-funds-readiness",
]);
assert.equal(evidence.routeHealthEvidenceRef, "ops/mainnet/private-pool-v2-route-health.evidence.json");
assert.equal(evidence.routeHealthPublicPassed, true);
assert.equal(evidence.routeHealthAuthenticatedPassed, true);
assert.equal(evidence.services.length, 5);
for (const service of evidence.services) {
  assert.equal(service.deploymentStatus, "deployed-render-verified-pending-controls");
}
assert.ok(
  evidence.deploymentTruth.includes("deployed on Render"),
  "Service deployment evidence must preserve the deployed Render truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("authenticated route-health is green"),
  "Service deployment evidence must preserve the green route-health truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("checked role-service replay barrier evidence is green"),
  "Service deployment evidence must preserve the checked role-service replay barrier truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("no-real-funds production smoke is green"),
  "Service deployment evidence must preserve the green production-smoke truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("Restore readback is already recorded as passed"),
  "Service deployment evidence must preserve the narrower backup/restore readback truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("Pay/provider backup controls remain explicitly operator-skipped"),
  "Service deployment evidence must preserve the operator-skipped backup-control truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("Incident workflow evidence is configured"),
  "Service deployment evidence must preserve configured incident workflow truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("Render-native log sink, metrics dashboards, alert policies, retention policy, and real-funds readiness"),
  "Service deployment evidence must preserve the exact remaining pending controls.",
);
assert.ok(
  evidence.deploymentTruth.includes("Render-native log sink and metrics dashboards are verified for Pay and Private Pool v2"),
  "Service deployment evidence must preserve the verified Pay/Private Pool v2 Render-native log and metrics truth.",
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
  assert.ok(!serialized.includes(forbidden), `Service deployment evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:service-deployment-status"],
  "node scripts/print-vanta-production-service-deployment-status.mjs",
  "package.json must expose mainnet:service-deployment-status.",
);
assert.equal(
  packageJson.scripts["mainnet:service-deployment-status-check"],
  "node scripts/print-vanta-production-service-deployment-status.mjs --check",
  "package.json must expose mainnet:service-deployment-status-check.",
);
assert.equal(
  packageJson.scripts["mainnet:service-deployment-evidence-check"],
  "node scripts/check-vanta-production-service-deployment-evidence.mjs",
  "package.json must expose mainnet:service-deployment-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:service-deployment-evidence-check"),
  "mainnet:preflight must include service deployment evidence check.",
);

console.log("Vanta production service deployment evidence check: PASS");

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/private-pool-v2-role-service-replay.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/private-pool-v2-role-service-replay.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-production-role-service-replay-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.lastStatusRef, "npm run mainnet:role-service-replay-status-check");
assert.equal(evidence.roleServiceNetworkRef, "npm run private-pool-v2:service-network-check");
assert.equal(evidence.roleStorageRef, "npm run private-pool-v2:role-storage-check");
assert.equal(evidence.serviceTopologyRef, "npm run mainnet:service-topology-check");
assert.equal(evidence.serviceDeploymentEvidenceRef, "ops/mainnet/service-deployment.evidence.json");
assert.equal(evidence.remoteRuntimeMode, "remote-services");
assert.equal(
  evidence.barrierKind,
  "verifier-receipt-idempotency-indexer-nullifier-registration-and-private-send-output-append",
);
assert.equal(evidence.localOnlyVerification, true);
assert.equal(evidence.operatorRemoteServicesSettlementSmokeCovered, true);
assert.deepEqual(evidence.restartRestorationCoveredRoles, ["indexer", "prover", "relayer", "verifier"]);
assert.deepEqual(evidence.verifierToIndexerRequiredChecks, [
  "root-currentness-smoke",
  "nullifier-replay-smoke",
  "private-send-output-append-smoke",
  "private-send-atomic-rejection-smoke",
]);
assert.ok(
  evidence.deploymentTruth.includes("duplicate verifier receipts"),
  "Role-service replay evidence must record duplicate receipt rejection.",
);
assert.ok(
  evidence.deploymentTruth.includes("nullifier registration"),
  "Role-service replay evidence must record nullifier registration.",
);
assert.ok(
  evidence.deploymentTruth.includes("private-send nullifier plus recipient/change output append"),
  "Role-service replay evidence must record private-send output append.",
);
assert.ok(
  evidence.deploymentTruth.includes("tampered private-send root rejection"),
  "Role-service replay evidence must record private-send atomic rejection.",
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
  assert.ok(!serialized.includes(forbidden), `Role-service replay evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:role-service-replay-status"],
  "node scripts/print-vanta-production-role-service-replay-status.mjs",
  "package.json must expose mainnet:role-service-replay-status.",
);
assert.equal(
  packageJson.scripts["mainnet:role-service-replay-status-check"],
  "node scripts/print-vanta-production-role-service-replay-status.mjs --check",
  "package.json must expose mainnet:role-service-replay-status-check.",
);
assert.equal(
  packageJson.scripts["mainnet:role-service-replay-evidence-check"],
  "node scripts/check-vanta-private-pool-v2-role-service-replay-evidence.mjs",
  "package.json must expose mainnet:role-service-replay-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:role-service-replay-evidence-check"),
  "mainnet:preflight must include role-service replay evidence check.",
);

console.log("Vanta role-service replay evidence check: PASS");

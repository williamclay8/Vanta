import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createVantaProductionServiceTopology } from "../src/readiness/productionServiceTopology.mjs";

const deploymentEvidencePath = new URL("../ops/mainnet/service-deployment.evidence.json", import.meta.url);
const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

function buildStatus() {
  const topology = createVantaProductionServiceTopology();
  const deploymentEvidence = JSON.parse(readFileSync(deploymentEvidencePath, "utf8"));
  const replayEdge = topology.serviceEdges.find((edge) => edge.from === "verifier" && edge.to === "indexer");

  return {
    barrierKind:
      "verifier-receipt-idempotency-indexer-nullifier-registration-and-private-send-output-append",
    checkedAt: new Date().toISOString(),
    localOnlyVerification: true,
    localOnlyWarning:
      "This packet is based on the deterministic local/staging role-service network check, not on authenticated live production settlement traffic.",
    mainnetReady: false,
    operatorRemoteServicesSettlementSmokeCovered: true,
    productionReady: false,
    remoteRuntimeMode: "remote-services",
    restartRestorationCoveredRoles: ["indexer", "prover", "relayer", "verifier"],
    roleServiceNetworkCommand: "npm run private-pool-v2:service-network-check",
    roleStorageCommand: "npm run private-pool-v2:role-storage-check",
    safety:
      "No auth token values, database URLs, bearer values, wallet keys, or signed transaction material are printed.",
    serviceDeploymentEvidenceRef: "ops/mainnet/service-deployment.evidence.json",
    serviceEdgesCovered: [
      "prover-to-verifier-proof-roundtrip",
      "verifier-to-indexer-commitment-append",
      "verifier-to-indexer-private-send-nullifier-and-output-append",
      "verifier-to-indexer-private-send-tampered-root-rejection",
      "verifier-duplicate-receipt-rejection",
      "relayer-quote-and-submit-after-restart",
      "operator-remote-services-pay-settlement-smoke",
    ],
    serviceTopologyRef: "npm run mainnet:service-topology-check",
    servicesDeployedCount: deploymentEvidence.services?.length ?? 0,
    verifierToIndexerEdge: replayEdge
      ? {
          auth: replayEdge.auth,
          failurePolicy: replayEdge.failurePolicy,
          requiredChecks: replayEdge.requiredChecks,
        }
      : null,
    version: "vanta-production-role-service-replay-status-0.1",
  };
}

const result = buildStatus();

if (checkMode) {
  assert.equal(result.mainnetReady, false);
  assert.equal(result.productionReady, false);
  assert.equal(result.localOnlyVerification, true);
  assert.equal(result.remoteRuntimeMode, "remote-services");
  assert.equal(
    result.barrierKind,
    "verifier-receipt-idempotency-indexer-nullifier-registration-and-private-send-output-append",
  );
  assert.equal(result.roleServiceNetworkCommand, "npm run private-pool-v2:service-network-check");
  assert.equal(result.roleStorageCommand, "npm run private-pool-v2:role-storage-check");
  assert.equal(result.serviceTopologyRef, "npm run mainnet:service-topology-check");
  assert.deepEqual(result.restartRestorationCoveredRoles, ["indexer", "prover", "relayer", "verifier"]);
  assert.equal(result.operatorRemoteServicesSettlementSmokeCovered, true);
  assert.equal(result.servicesDeployedCount, 5);
  assert.ok(result.serviceEdgesCovered.includes("verifier-duplicate-receipt-rejection"));
  assert.ok(
    result.serviceEdgesCovered.includes(
      "verifier-to-indexer-private-send-nullifier-and-output-append",
    ),
  );
  assert.ok(
    result.serviceEdgesCovered.includes("verifier-to-indexer-private-send-tampered-root-rejection"),
  );
  assert.ok(result.serviceEdgesCovered.includes("operator-remote-services-pay-settlement-smoke"));
  assert.equal(result.verifierToIndexerEdge?.auth, "mutual-service-auth");
  assert.equal(result.verifierToIndexerEdge?.failurePolicy, "fail-closed");
  assert.deepEqual(result.verifierToIndexerEdge?.requiredChecks, [
    "root-currentness-smoke",
    "nullifier-replay-smoke",
    "private-send-output-append-smoke",
    "private-send-atomic-rejection-smoke",
  ]);
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta production role-service replay status");
  console.log(`- barrierKind: ${result.barrierKind}`);
  console.log(`- remoteRuntimeMode: ${result.remoteRuntimeMode}`);
  console.log(`- localOnlyVerification: ${String(result.localOnlyVerification)}`);
  console.log(`- restartRestorationCoveredRoles: ${result.restartRestorationCoveredRoles.join(", ")}`);
  console.log(`- roleServiceNetworkCommand: ${result.roleServiceNetworkCommand}`);
  console.log(`- productionReady: ${String(result.productionReady)}`);
}

import { strict as assert } from "node:assert";
import { createVantaProductionServiceTopology } from "../src/readiness/productionServiceTopology.mjs";

const topology = createVantaProductionServiceTopology();

assert.equal(topology.version, "vanta-production-service-topology-0.1");
assert.equal(topology.mainnetReady, false);
assert.equal(topology.productionReady, false);
assert.equal(topology.network, "mainnet-beta");
assert.equal(topology.services.length, 5);

const requiredServices = ["indexer", "relayer", "prover", "verifier", "operator"];
for (const serviceId of requiredServices) {
  const service = topology.services.find((candidate) => candidate.id === serviceId);
  assert.ok(service, `Missing service topology for ${serviceId}.`);
  assert.ok(service.requiredStorage.length > 0, `${serviceId} must declare required storage.`);
  assert.ok(service.health.length > 0, `${serviceId} must declare health surfaces.`);
  assert.ok(service.readiness.length > 0, `${serviceId} must declare readiness surfaces.`);
  assert.ok(service.requiredSecrets.length > 0, `${serviceId} must declare required secret names.`);
  assert.ok(
    service.deploymentGuards.includes("no-secret-values-in-manifest"),
    `${serviceId} must keep secret values out of manifests.`,
  );
  assert.ok(
    service.deploymentGuards.includes("durable-store-required"),
    `${serviceId} must require durable storage.`,
  );
}

const requiredEdges = [
  ["operator", "indexer"],
  ["operator", "prover"],
  ["operator", "verifier"],
  ["operator", "relayer"],
  ["verifier", "indexer"],
  ["relayer", "indexer"],
];

for (const [from, to] of requiredEdges) {
  const edge = topology.serviceEdges.find((candidate) => candidate.from === from && candidate.to === to);
  assert.ok(edge, `Missing service edge ${from} -> ${to}.`);
  assert.ok(edge.auth === "mutual-service-auth", `${from} -> ${to} must use mutual-service-auth.`);
  assert.ok(edge.failurePolicy === "fail-closed", `${from} -> ${to} must fail closed.`);
  assert.ok(edge.requiredChecks.length > 0, `${from} -> ${to} must declare smoke checks.`);
}

assert.ok(
  topology.requiredVerificationCommands.includes("npm run mainnet:service-topology-check"),
  "Topology check command must be part of its own contract.",
);
assert.ok(
  topology.requiredVerificationCommands.includes("npm run mainnet:deployment-manifest-check"),
  "Topology must depend on deployment manifest checks.",
);
assert.ok(
  topology.releaseGates.includes("all-service-edges-authenticated"),
  "Topology release gates must require authenticated service edges.",
);
assert.ok(
  topology.releaseGates.includes("all-service-health-surfaces-green"),
  "Topology release gates must require healthy service surfaces.",
);
assert.ok(
  topology.blockers.includes("fresh-deployed-service-health-and-readiness-required"),
  "Topology must keep deployed service health/readiness freshness explicit.",
);

console.log("Vanta production service topology check: PASS");

import { strict as assert } from "node:assert";
import { createVantaProductionServiceContract } from "../src/readiness/productionServiceContract.mjs";

const contract = createVantaProductionServiceContract();

assert.equal(contract.version, "vanta-production-service-contract-0.1");
assert.equal(contract.productionReady, false);
assert.equal(contract.mainnetReady, false);
assert.equal(contract.services.length, 5);

const requiredServices = ["indexer", "relayer", "prover", "verifier", "operator"];
for (const serviceId of requiredServices) {
  const service = contract.services.find((candidate) => candidate.id === serviceId);
  assert.ok(service, `Missing production service contract for ${serviceId}.`);
  assert.equal(service.deploymentStatus, "deployed-render-verified-pending-controls");
  assert.ok(service.requiredEnv.length > 0, `${serviceId} must declare required environment variables.`);
  assert.ok(service.requiredEndpoints.length > 0, `${serviceId} must declare required endpoints.`);
  assert.ok(service.requiredChecks.length > 0, `${serviceId} must declare required checks.`);
  assert.ok(service.securityRequirements.includes("auth-required"), `${serviceId} must require auth.`);
  assert.ok(service.securityRequirements.includes("durable-storage-required"), `${serviceId} must require durable storage.`);
}

const relayer = contract.services.find((candidate) => candidate.id === "relayer");
const operator = contract.services.find((candidate) => candidate.id === "operator");
for (const envName of [
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_ROOT_HISTORY",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY",
]) {
  assert.ok(relayer.requiredEnv.includes(envName), `relayer must require ${envName}.`);
  assert.ok(operator.requiredEnv.includes(envName), `operator must require ${envName}.`);
}

assert.ok(
  contract.crossServiceRequirements.includes("mutual-service-authentication"),
  "Missing mutual service authentication requirement.",
);
assert.ok(
  contract.crossServiceRequirements.includes("centralized-observability"),
  "Missing centralized observability requirement.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:service-contract-check"),
  "Missing service contract check command.",
);
assert.ok(
  contract.nextImplementationStep.includes("deployed Render production role services"),
  "Next implementation step should preserve the deployed production service truth.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:service-deployment-status"),
  "Missing service deployment status command.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:service-deployment-evidence-check"),
  "Missing service deployment evidence command.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:role-service-replay-status"),
  "Missing role-service replay status command.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:role-service-replay-evidence-check"),
  "Missing role-service replay evidence command.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run private-pool-v2:service-network-check"),
  "Missing underlying service-network harness command.",
);

console.log("Vanta production service contract check: PASS");

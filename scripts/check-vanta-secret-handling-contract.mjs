import { strict as assert } from "node:assert";
import { createVantaSecretHandlingContract } from "../src/readiness/secretHandlingContract.mjs";

const contract = createVantaSecretHandlingContract();

assert.equal(contract.version, "vanta-secret-handling-contract-0.1");
assert.equal(contract.productionReady, false);
assert.equal(contract.mainnetReady, false);
assert.equal(contract.privateKeyHandling, "never-request-store-or-load-private-keys");

const requiredScopes = ["pay", "privatePoolV2", "strategy", "operator", "wallet"];
for (const scopeId of requiredScopes) {
  const scope = contract.scopes.find((candidate) => candidate.id === scopeId);
  assert.ok(scope, `Missing secret handling scope: ${scopeId}.`);
  assert.equal(scope.status, "contracted-not-provisioned");
  assert.ok(scope.allowedSecretRefs.length > 0, `${scopeId} must declare allowed secret references.`);
  assert.ok(scope.forbiddenValues.includes("private-key"), `${scopeId} must forbid private keys.`);
  assert.ok(scope.rotationRequirements.length > 0, `${scopeId} must declare rotation requirements.`);
}

assert.ok(contract.globalRequirements.includes("secret-manager-required"), "Missing secret manager requirement.");
assert.ok(contract.globalRequirements.includes("least-privilege-service-identities"), "Missing least privilege requirement.");
assert.ok(contract.globalRequirements.includes("no-secrets-in-repo"), "Missing no-secrets-in-repo requirement.");
assert.ok(contract.globalRequirements.includes("rotation-runbook-required"), "Missing rotation runbook requirement.");
assert.ok(contract.globalRequirements.includes("incident-revocation-required"), "Missing incident revocation requirement.");

assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:secret-handling-check"),
  "Missing secret handling verification command.",
);

console.log("Vanta secret handling contract check: PASS");

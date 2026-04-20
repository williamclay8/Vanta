import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVantaSecretHandlingContract } from "../src/readiness/secretHandlingContract.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const secretReferencesManifestPath = resolve(repoRoot, "ops/mainnet/secret-references.manifest.json");
const contract = createVantaSecretHandlingContract();

assert.equal(contract.version, "vanta-secret-handling-contract-0.1");
assert.equal(contract.productionReady, false);
assert.equal(contract.mainnetReady, false);
assert.equal(contract.privateKeyHandling, "never-request-store-or-load-private-keys");
assert.equal(
  contract.secretReferenceManifestPath,
  "ops/mainnet/secret-references.manifest.json",
  "Secret handling contract must point at the checked references-only manifest.",
);

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

assert.ok(
  existsSync(secretReferencesManifestPath),
  "Missing ops/mainnet/secret-references.manifest.json.",
);
const manifest = JSON.parse(readFileSync(secretReferencesManifestPath, "utf8"));

assert.equal(manifest.version, "vanta-secret-references-manifest-0.1");
assert.equal(manifest.secretPolicy, "references-only-no-secret-values");
assert.equal(manifest.mainnetReady, false);
assert.equal(manifest.productionReady, false);
assert.ok(Array.isArray(manifest.secrets), "Secret references manifest must include secrets array.");

const allowedRefs = new Set(contract.scopes.flatMap((scope) => scope.allowedSecretRefs));
for (const secret of manifest.secrets) {
  assert.ok(allowedRefs.has(secret.ref), `Secret ref is not allowed by contract: ${secret.ref}`);
  assert.ok(secret.ref.endsWith("_REF"), `Secret ref must be a reference name: ${secret.ref}`);
  assert.ok(secret.scope, `${secret.ref} must declare scope.`);
  assert.ok(secret.owner, `${secret.ref} must declare owner.`);
  assert.ok(secret.provider, `${secret.ref} must declare provider.`);
  assert.ok(secret.environment, `${secret.ref} must declare environment.`);
  assert.ok(secret.rotation?.cadenceDays > 0, `${secret.ref} must declare rotation cadence.`);
  assert.ok(secret.rotation?.runbookRef, `${secret.ref} must declare rotation runbook ref.`);
  assert.ok(secret.revocation?.runbookRef, `${secret.ref} must declare revocation runbook ref.`);
  assert.ok(secret.audit?.accessLogRef, `${secret.ref} must declare access log ref.`);
  assert.ok(!("value" in secret), `${secret.ref} must not include raw value.`);
  assert.ok(!("rawSecret" in secret), `${secret.ref} must not include rawSecret.`);
}

for (const requiredRef of [
  "VANTA_PAY_SECRET_KEY_REF",
  "VANTA_PAY_WEBHOOK_SECRET_REF",
  "VANTA_PAY_DATABASE_URL_REF",
  "VANTA_PAY_PRIVATE_POOL_OPERATOR_TOKEN_REF",
  "VANTA_PRIVATE_POOL_V2_OPERATOR_TOKEN_REF",
  "VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF",
]) {
  assert.ok(
    manifest.secrets.some((secret) => secret.ref === requiredRef),
    `Missing required staging/production secret reference: ${requiredRef}`,
  );
}

console.log("Vanta secret handling contract check: PASS");

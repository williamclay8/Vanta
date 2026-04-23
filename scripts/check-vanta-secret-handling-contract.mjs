import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVantaSecretHandlingContract } from "../src/readiness/secretHandlingContract.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const secretReferencesManifestPath = resolve(repoRoot, "ops/mainnet/secret-references.manifest.json");
const productionSecretManagerTemplatePath = resolve(repoRoot, "ops/mainnet/production-secret-manager.template.json");
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
  contract.globalRequirements.includes("tracked-repo-secret-exposure-scan-required"),
  "Missing tracked repo secret exposure scan requirement.",
);

assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:secret-handling-check"),
  "Missing secret handling verification command.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run mainnet:secret-exposure-check"),
  "Missing secret exposure verification command.",
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
const rawSecretValuePatterns = [
  /postgres(?:ql)?:\/\//i,
  /mysql:\/\//i,
  /mongodb(?:\+srv)?:\/\//i,
  /redis:\/\//i,
  /sk_live_/i,
  /sk_test_/i,
  /whsec_/i,
  /bearer\s+[a-z0-9._-]+/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /seed phrase/i,
];

function scanForRawSecretValues(value, path = "manifest") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForRawSecretValues(entry, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assert.ok(
        !["value", "rawSecret", "privateKey", "seedPhrase", "keypair", "mnemonic"].includes(key),
        `Secret references manifest must not contain raw secret key field ${path}.${key}.`,
      );
      scanForRawSecretValues(entry, `${path}.${key}`);
    }
    return;
  }

  if (typeof value !== "string") {
    return;
  }

  for (const pattern of rawSecretValuePatterns) {
    assert.ok(!pattern.test(value), `Secret references manifest contains raw-looking secret value at ${path}.`);
  }
}

scanForRawSecretValues(manifest);

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
  "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_PROVER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL_REF",
]) {
  assert.ok(
    manifest.secrets.some((secret) => secret.ref === requiredRef),
    `Missing required staging/production secret reference: ${requiredRef}`,
  );
}

assert.ok(
  existsSync(productionSecretManagerTemplatePath),
  "Missing ops/mainnet/production-secret-manager.template.json.",
);
const productionSecretManager = JSON.parse(readFileSync(productionSecretManagerTemplatePath, "utf8"));

assert.equal(productionSecretManager.version, "vanta-production-secret-manager-template-0.1");
assert.equal(productionSecretManager.provider, "doppler");
assert.equal(productionSecretManager.secretPolicy, "references-only-no-secret-values");
assert.equal(productionSecretManager.mainnetReady, false);
assert.equal(productionSecretManager.productionReady, false);
assert.equal(productionSecretManager.secretManagerRef, "VANTA_SECRET_MANAGER_REF");
assert.ok(productionSecretManager.projectRef, "Production secret manager template must include Doppler project ref.");
assert.ok(productionSecretManager.productionConfigRef, "Production secret manager template must include Doppler production config ref.");
assert.ok(
  Array.isArray(productionSecretManager.serviceIdentities) &&
    productionSecretManager.serviceIdentities.length >= 2,
  "Production secret manager template must include service identities.",
);
assert.ok(Array.isArray(productionSecretManager.secretMappings), "Production secret manager template must include mappings.");

scanForRawSecretValues(productionSecretManager, "productionSecretManager");

const mappedRefs = new Set(productionSecretManager.secretMappings.map((mapping) => mapping.ref));
for (const secret of manifest.secrets) {
  assert.ok(mappedRefs.has(secret.ref), `Production secret manager template must map ${secret.ref}.`);
}

const requiredDopplerSecretNamesByRef = new Map([
  ["VANTA_PAY_PRIVATE_POOL_OPERATOR_TOKEN_REF", "VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN"],
  ["VANTA_PRIVATE_POOL_V2_OPERATOR_TOKEN_REF", "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN"],
]);

for (const mapping of productionSecretManager.secretMappings) {
  assert.ok(allowedRefs.has(mapping.ref), `Production secret manager maps unknown ref: ${mapping.ref}`);
  assert.ok(mapping.dopplerSecretName, `${mapping.ref} must include Doppler secret name.`);
  if (requiredDopplerSecretNamesByRef.has(mapping.ref)) {
    assert.equal(
      mapping.dopplerSecretName,
      requiredDopplerSecretNamesByRef.get(mapping.ref),
      `${mapping.ref} must map to the exact runtime env var name.`,
    );
  }
  assert.ok(mapping.owner, `${mapping.ref} must include owner.`);
  assert.ok(mapping.rotation?.cadenceDays > 0, `${mapping.ref} must include production rotation cadence.`);
  assert.ok(mapping.revocation?.runbookRef, `${mapping.ref} must include production revocation runbook.`);
  assert.ok(mapping.audit?.accessLogRef, `${mapping.ref} must include production access log ref.`);
}

console.log("Vanta secret handling contract check: PASS");

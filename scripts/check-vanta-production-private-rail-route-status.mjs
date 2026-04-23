import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const servicesManifestPath = resolve(repoRoot, "ops/mainnet/private-pool-v2-services.manifest.json");
const secretRefsManifestPath = resolve(repoRoot, "ops/mainnet/secret-references.manifest.json");

assert.ok(existsSync(servicesManifestPath), "Missing ops/mainnet/private-pool-v2-services.manifest.json.");
assert.ok(existsSync(secretRefsManifestPath), "Missing ops/mainnet/secret-references.manifest.json.");

const servicesManifest = JSON.parse(readFileSync(servicesManifestPath, "utf8"));
const secretRefsManifest = JSON.parse(readFileSync(secretRefsManifestPath, "utf8"));

const serviceById = new Map(servicesManifest.services.map((service) => [service.id, service]));
const secretRefs = new Set(secretRefsManifest.secrets.map((secret) => secret.ref));

const requiredRoleRefs = {
  indexer: {
    authRef: "VANTA_INDEXER_AUTH_TOKEN_REF",
    runtimeUrlEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_URL",
    runtimeTokenEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
    urlRef: "VANTA_INDEXER_URL_REF",
  },
  prover: {
    authRef: "VANTA_PROVER_AUTH_TOKEN_REF",
    runtimeUrlEnv: "VANTA_PRIVATE_POOL_V2_PROVER_URL",
    runtimeTokenEnv: "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
    urlRef: "VANTA_PROVER_URL_REF",
  },
  relayer: {
    authRef: "VANTA_RELAYER_AUTH_TOKEN_REF",
    runtimeUrlEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_URL",
    runtimeTokenEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
    urlRef: "VANTA_RELAYER_URL_REF",
  },
  verifier: {
    authRef: "VANTA_VERIFIER_AUTH_TOKEN_REF",
    runtimeUrlEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_URL",
    runtimeTokenEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN",
    urlRef: "VANTA_VERIFIER_URL_REF",
  },
};

function envNamesFor(service) {
  return new Set(service.env.map((entry) => entry.name));
}

function assertNoInlineValues(container, label) {
  const stack = [container];
  while (stack.length > 0) {
    const value = stack.pop();
    if (!value || typeof value !== "object") continue;
    for (const [key, entryValue] of Object.entries(value)) {
      assert.notEqual(key, "value", `${label} must not include inline value fields.`);
      if (entryValue && typeof entryValue === "object") {
        stack.push(entryValue);
      }
    }
  }
}

assert.equal(servicesManifest.secretPolicy, "names-only-no-secret-values");
assert.equal(secretRefsManifest.secretPolicy, "references-only-no-secret-values");

const pay = servicesManifest.stagingDeployments.find((deployment) => deployment.id === "pay");
const stagingPrivatePool = servicesManifest.stagingDeployments.find((deployment) => deployment.id === "private-pool-v2");

assert.ok(pay, "Missing Pay staging deployment.");
assert.ok(stagingPrivatePool, "Missing Private Pool v2 staging deployment.");
assert.equal(
  pay.privatePool?.operatorUrl,
  stagingPrivatePool.url,
  "Pay staging must route private settlement to the checked Private Pool v2 operator URL.",
);
assert.equal(
  pay.privatePool?.operatorTokenRef,
  "VANTA_PAY_PRIVATE_POOL_OPERATOR_TOKEN_REF",
  "Pay staging must use the checked Private Pool v2 operator token ref.",
);
assert.ok(
  secretRefs.has(pay.privatePool.operatorTokenRef),
  "Pay private-pool operator token ref must be inventoried in secret references.",
);
assertNoInlineValues(pay.privatePool, "Pay private-pool route");

for (const [roleId, refs] of Object.entries(requiredRoleRefs)) {
  const roleService = serviceById.get(roleId);
  assert.ok(roleService, `Missing production Private Pool v2 role service: ${roleId}.`);
  assert.ok(roleService.deployedService.url.startsWith("https://"), `${roleId} must use HTTPS deployed URL.`);
  assert.equal(
    roleService.deployedService.auth?.secretRef,
    refs.authRef,
    `${roleId} deployed service must use the checked auth-token ref.`,
  );
  assert.ok(secretRefs.has(refs.authRef), `${roleId} auth-token ref must be inventoried in secret references.`);
  assertNoInlineValues(roleService.deployedService.auth, `${roleId} auth route`);
}

const operator = serviceById.get("operator");
assert.ok(operator, "Missing production Private Pool v2 operator service.");
assert.equal(operator.deployedService.runtimeMode, "remote-services", "Operator must run through remote role services.");
assert.equal(
  operator.deployedService.auth?.secretRef,
  "VANTA_OPERATOR_AUTH_TOKEN_REF",
  "Operator deployed service must use the checked operator auth-token ref.",
);
assert.ok(secretRefs.has("VANTA_OPERATOR_AUTH_TOKEN_REF"), "Operator auth-token ref must be inventoried.");

const operatorEnv = envNamesFor(operator);
assert.ok(operatorEnv.has("VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN"), "Operator must require its auth token env.");
for (const refs of Object.values(requiredRoleRefs)) {
  assert.ok(operatorEnv.has(refs.runtimeUrlEnv), `Operator must require role URL env ${refs.runtimeUrlEnv}.`);
  assert.ok(operatorEnv.has(refs.runtimeTokenEnv), `Operator must require role token env ${refs.runtimeTokenEnv}.`);
}

assert.deepEqual(operator.deployedService.remoteServices, {
  indexerUrlRef: requiredRoleRefs.indexer.urlRef,
  proverUrlRef: requiredRoleRefs.prover.urlRef,
  relayerUrlRef: requiredRoleRefs.relayer.urlRef,
  verifierUrlRef: requiredRoleRefs.verifier.urlRef,
});
assertNoInlineValues(operator.deployedService.remoteServices, "Operator remote-service route");

const verifier = serviceById.get("verifier");
const verifierEnv = envNamesFor(verifier);
assert.deepEqual(verifier.deployedService.indexer, {
  urlRef: requiredRoleRefs.indexer.urlRef,
  authTokenRef: requiredRoleRefs.indexer.authRef,
});
assert.ok(verifierEnv.has(requiredRoleRefs.indexer.runtimeUrlEnv), "Verifier must require indexer URL env.");
assert.ok(verifierEnv.has(requiredRoleRefs.indexer.runtimeTokenEnv), "Verifier must require indexer token env.");
assertNoInlineValues(verifier.deployedService.indexer, "Verifier indexer route");

assert.ok(
  servicesManifest.releaseGates.includes("npm run mainnet:private-rail-route-status-check"),
  "Release gates must include the production private rail route-status check.",
);

console.log("Vanta production private rail route status check: PASS");

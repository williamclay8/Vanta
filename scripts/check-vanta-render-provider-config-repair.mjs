import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/render-provider-config-repair.evidence.json");
const manifestPath = resolve(repoRoot, "ops/mainnet/private-pool-v2-services.manifest.json");
const envExamplePath = resolve(repoRoot, ".env.example");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing Render provider config repair evidence.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const envExample = readFileSync(envExamplePath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

function assertNoSecretMaterial(value, path = "evidence") {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    for (const forbidden of [
      /postgres(?:ql)?:\/\//iu,
      /DATABASE_URL=/u,
      /Bearer\s+/u,
      /\brnd_[A-Za-z0-9_]+/u,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    ]) {
      assert.ok(!forbidden.test(value), `${path} includes forbidden secret-bearing material.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecretMaterial(entry, `${path}.${index}`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      assertNoSecretMaterial(nested, `${path}.${key}`);
    }
  }
}

assert.equal(evidence.version, "vanta-render-provider-config-repair-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.privacyClaimAllowed, false);
assert.equal(evidence.secretPolicy, "references-only-no-secret-values");
assert.equal(evidence.renderWorkspace?.workspaceId, "tea-d7j37af7f7vs739ii8rg");
assert.equal(evidence.renderWorkspace?.workspaceName, "William's workspace");
assert.match(evidence.commitUnderTest, /^[0-9a-f]{40}$/u);
assertNoSecretMaterial(evidence);

const repairById = new Map(evidence.repairs.map((repair) => [repair.id, repair]));
const relayerRepair = repairById.get("relayer-jitter-batching-enabled");
const stagingRepair = repairById.get("staging-private-pool-postgres-host-repaired");
assert.ok(relayerRepair, "Missing relayer jitter repair receipt.");
assert.ok(stagingRepair, "Missing staging Postgres repair receipt.");

assert.equal(relayerRepair.serviceId, "srv-d7jg9jrbc2fs73c161gg");
assert.deepEqual(relayerRepair.envRefsUpdated, [
  "VANTA_PRIVATE_POOL_V2_RELAYER_JITTER_BATCHING_ENABLED",
]);
assert.equal(relayerRepair.before.jitterBatchingEnabled, false);
assert.equal(relayerRepair.after.jitterBatchingEnabled, true);
assert.equal(relayerRepair.deployTest.deployId, "dep-d8iedt8jo6nc73d6m7eg");
assert.equal(relayerRepair.deployTest.status, "update_failed");
assert.equal(relayerRepair.deployTest.jitterBatchingErrorObservedAfterRepair, false);
assert.ok(
  relayerRepair.deployTest.nextFailClosedBlocker.includes(
    "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED=true",
  ),
  "Relayer repair must preserve the privacy-transport fail-closed blocker.",
);
assert.equal(relayerRepair.deployTest.currentLiveHealthOk, true);
assert.ok(relayerRepair.truthBoundary.includes("no live Tor"));
assert.ok(relayerRepair.truthBoundary.includes("no live"));

assert.equal(stagingRepair.serviceId, "srv-d7j4aod7vvec73ahsqlg");
assert.deepEqual(stagingRepair.envRefsUpdated, ["VANTA_PRIVATE_POOL_V2_DATABASE_URL"]);
assert.equal(stagingRepair.before.databaseHostRef, "dpg-d7j3st8sfn5c73efg2bg-a");
assert.equal(stagingRepair.before.knownRenderPostgres, null);
assert.equal(stagingRepair.after.databaseHostRef, "dpg-d7jahiaqqhas738dmgag-a");
assert.equal(stagingRepair.after.knownRenderPostgres, "vanta-production-core-db");
assert.equal(stagingRepair.deployTest.deployId, "dep-d8ieckr7uimc73alvnh0");
assert.equal(stagingRepair.deployTest.status, "live");
assert.equal(stagingRepair.deployTest.healthOk, true);
assert.equal(stagingRepair.deployTest.staleHostErrorObservedAfterRepair, false);

const relayer = manifest.services.find((service) => service.id === "relayer");
assert.ok(relayer, "Production services manifest must include relayer.");
const relayerEnvNames = new Set(relayer.env.map((entry) => entry.name));
for (const envName of [
  "VANTA_PRIVATE_POOL_V2_RELAYER_JITTER_BATCHING_ENABLED",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODE",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_DEPLOYMENT_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_LOG_REDACTION_REVIEW_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_RETENTION_POLICY_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_REVIEWER_ACCEPTANCE_REF",
]) {
  assert.ok(relayerEnvNames.has(envName), `Relayer manifest missing ${envName}.`);
  assert.ok(envExample.includes(`${envName}=`), `.env.example missing ${envName}.`);
}
assert.ok(
  relayer.env.every((entry) => !("value" in entry)),
  "Relayer manifest must never record env values.",
);

const blocker = evidence.remainingBlockers.find(
  (candidate) => candidate.id === "relayer-privacy-transport-evidence-missing",
);
assert.ok(blocker, "Evidence must preserve the relayer privacy-transport blocker.");
assert.equal(blocker.status, "blocked");
assert.ok(blocker.truthBoundary.includes("Do not set placeholder privacy-transport refs"));
assert.ok(blocker.truthBoundary.includes("reviewer acceptance"));

for (const command of [
  "node /private/tmp/vanta-render-env-audit.mjs",
  "npm run mainnet:render-api-services-check",
  "node /private/tmp/vanta-render-provider-fix.mjs",
  "render deploys create srv-d7j4aod7vvec73ahsqlg",
  "render deploys create srv-d7jg9jrbc2fs73c161gg",
]) {
  assert.ok(
    evidence.verification.some((entry) => entry.includes(command)),
    `Evidence missing verification command ${command}.`,
  );
}

assert.equal(
  packageJson.scripts["mainnet:render-provider-config-repair-check"],
  "node scripts/check-vanta-render-provider-config-repair.mjs",
);

console.log("Vanta Render provider config repair check: PASS");

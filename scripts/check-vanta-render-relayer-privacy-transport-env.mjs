import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  readFileSync(resolve(repoRoot, "ops/mainnet/private-pool-v2-services.manifest.json"), "utf8"),
);
const closure = JSON.parse(
  readFileSync(
    resolve(repoRoot, "ops/mainnet/private-pool-v2-relayer-privacy-transport-closure.evidence.json"),
    "utf8",
  ),
);

const requireReady = process.argv.includes("--require-ready");
const token = process.env.RENDER_API_KEY;
const relayerService = manifest.services.find((service) => service.id === "relayer");

assert.ok(relayerService, "Production services manifest must include relayer.");
assert.equal(manifest.renderWorkspace?.workspaceId, "tea-d7j37af7f7vs739ii8rg");
assert.equal(relayerService.deployedService?.serviceId, "srv-d7jg9jrbc2fs73c161gg");
assert.equal(closure.relayerService?.serviceId, relayerService.deployedService.serviceId);
assert.equal(closure.renderProviderPreflight?.printsSecretValues, false);

const commonEnvNames = [
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODE",
  ...closure.requiredCommonRefs.map((entry) => entry.envVar),
];
const modeEnvNames = {
  "blinded-token": closure.modeSpecificRefs["blinded-token"].map((entry) => entry.envVar),
  "tor-onion": closure.modeSpecificRefs["tor-onion"].map((entry) => entry.envVar),
};
const allPrivacyTransportEnvNames = [
  ...new Set([...commonEnvNames, ...modeEnvNames["tor-onion"], ...modeEnvNames["blinded-token"]]),
];

function extractEnvVar(row) {
  const envVar = row?.envVar ?? row;
  const key = envVar?.key ?? envVar?.name;
  const value = envVar?.value;
  return {
    hasValue: typeof value === "string" && value.length > 0,
    key,
    value,
  };
}

function buildStaticStatus() {
  const manifestEnvNames = new Set(relayerService.env.map((entry) => entry.name));
  const missingFromManifest = allPrivacyTransportEnvNames.filter((name) => !manifestEnvNames.has(name));
  assert.deepEqual(missingFromManifest, [], "Relayer manifest missing privacy-transport env names.");
  return {
    liveProviderChecked: false,
    missingFromManifest,
    ok: true,
    privacyTransportReady: false,
    providerMutationAllowed: false,
    renderApiKeyPresent: false,
    serviceId: relayerService.deployedService.serviceId,
    status: "static-manifest-covered-render-api-key-not-provided",
    valueDisclosure: "env-values-not-read-or-printed",
    workspaceId: manifest.renderWorkspace.workspaceId,
  };
}

async function buildLiveProviderStatus() {
  const response = await fetch(
    `https://api.render.com/v1/services/${relayerService.deployedService.serviceId}/env-vars?limit=100`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  assert.equal(response.status, 200, `Render env vars API must return 200, got ${response.status}.`);

  const rows = await response.json();
  assert.ok(Array.isArray(rows), "Render env vars API must return an array.");

  const envByName = new Map(
    rows
      .map(extractEnvVar)
      .filter((entry) => typeof entry.key === "string")
      .map((entry) => [entry.key, entry]),
  );

  const activeModeEntry = envByName.get("VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODE");
  const activeMode = ["tor-onion", "blinded-token"].includes(activeModeEntry?.value)
    ? activeModeEntry.value
    : null;
  const modeSpecificNames = activeMode ? modeEnvNames[activeMode] : [];
  const requiredNames = [...commonEnvNames, ...modeSpecificNames];
  const missingRequiredEnvNames = requiredNames.filter((name) => !envByName.get(name)?.hasValue);
  const presentPrivacyTransportEnvNames = allPrivacyTransportEnvNames.filter(
    (name) => envByName.get(name)?.hasValue,
  );

  const privacyTransportReady =
    activeMode !== null &&
    envByName.get("VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED")?.value === "true" &&
    missingRequiredEnvNames.length === 0;

  return {
    activeMode,
    checkedEnvKeyCount: allPrivacyTransportEnvNames.length,
    liveProviderChecked: true,
    missingRequiredEnvNames,
    ok: true,
    presentPrivacyTransportEnvNames,
    privacyTransportReady,
    providerMutationAllowed: false,
    renderApiKeyPresent: true,
    serviceId: relayerService.deployedService.serviceId,
    status: privacyTransportReady
      ? "render-relayer-privacy-transport-env-present-claim-blocked"
      : "render-relayer-privacy-transport-env-missing-reviewed-refs",
    valueDisclosure: "env-values-read-only-for-booleans/mode-and-never-printed-for-refs-or-secrets",
    workspaceId: manifest.renderWorkspace.workspaceId,
  };
}

const status = token ? await buildLiveProviderStatus() : buildStaticStatus();

if (requireReady) {
  assert.equal(
    status.privacyTransportReady,
    true,
    "Relayer privacy-transport Render env is not ready.",
  );
}

console.log(JSON.stringify(status, null, 2));

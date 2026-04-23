import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const productionServicesManifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);
const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

function productionOperatorUrl() {
  const manifest = JSON.parse(readFileSync(productionServicesManifestPath, "utf8"));
  const operator = manifest.services.find((service) => service.id === "operator");
  return operator?.deployedService?.url ?? null;
}

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}

function operatorConfig() {
  const url = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL?.trim() || productionOperatorUrl();
  if (!url) {
    throw new Error("Missing VANTA_PRIVATE_POOL_V2_OPERATOR_URL and no production operator URL is recorded in the services manifest.");
  }

  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("VANTA_PRIVATE_POOL_V2_OPERATOR_URL must be an HTTP(S) service URL.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("VANTA_PRIVATE_POOL_V2_OPERATOR_URL must not include credentials.");
  }

  return {
    authToken: readRequiredEnv("VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN"),
    url: url.replace(/\/+$/, ""),
    urlHost: parsed.host,
    urlSource: process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL?.trim() ? "env" : "manifest",
  };
}

async function requestJson({ authToken, url }) {
  const response = await fetch(new URL("/state/private-pool-v2-status", `${url}/`), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  return {
    ok: response.ok,
    parsed,
    status: response.status,
    statusText: response.statusText,
    text,
  };
}

function summarize(config, payload, status) {
  return {
    checkedAt: new Date().toISOString(),
    mainnetReady: false,
    operatorStatusProductionReady: payload.productionReady ?? false,
    operatorUrlHost: config.urlHost,
    operatorUrlRef: "VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
    operatorUrlSource: config.urlSource,
    productionReady: false,
    rateLimitPerMinute: payload.trafficControls?.rateLimitPerMinute ?? null,
    rateLimiter: payload.trafficControls?.rateLimiter ?? null,
    runtimeMode: payload.runtime?.mode ?? null,
    runtimeProductionReady: payload.runtime?.productionReady ?? false,
    safety:
      "No auth token values, database URLs, bearer values, wallet keys, or signed transaction material are printed.",
    status,
    storageDurableStoreConfigured: payload.storage?.durableStoreConfigured ?? false,
    storageKind: payload.storage?.kind ?? null,
    storageProductionReady: payload.storage?.productionReady ?? false,
    storageRef: "VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF",
    nullifierReplayGuardMode: payload.nullifierReplayGuard?.mode ?? null,
    nullifierReplayGuardStorageMode: payload.nullifierReplayGuard?.storageMode ?? null,
    nullifierReplayGuardProductionReady: payload.nullifierReplayGuard?.productionReady ?? false,
    protocolEnforcementFinalLayerImplemented: payload.protocolEnforcement?.finalLayerImplemented ?? false,
    protocolEnforcementFinalLayerProductionReady: payload.protocolEnforcement?.finalLayerProductionReady ?? false,
    protocolEnforcementLayer: payload.protocolEnforcement?.layer ?? null,
    version: "vanta-production-nullifier-replay-status-0.1",
  };
}

const config = operatorConfig();
const response = await requestJson(config);
assert.ok(response.ok, `Operator nullifier replay status HTTP ${response.status}: ${response.text || response.statusText}`);
assert.ok(response.parsed, "Operator nullifier replay status must return JSON.");

const result = summarize(config, response.parsed, response.status);

if (checkMode) {
  assert.equal(result.runtimeMode, "remote-services", "Operator must run in remote-services mode.");
  assert.equal(result.storageDurableStoreConfigured, true, "Operator must expose durable storage for replay enforcement.");
  assert.equal(result.storageKind, "postgres-jsonb-snapshot-store", "Operator must expose Postgres-backed storage kind.");
  assert.equal(
    result.nullifierReplayGuardMode,
    "postgres-durable-claim-preflight-and-accepted-reservation",
    "Operator must expose deployed durable nullifier replay mode.",
  );
  assert.equal(
    result.nullifierReplayGuardStorageMode,
    "postgres-unique-index",
    "Operator must expose Postgres unique-index replay storage mode.",
  );
  assert.equal(
    result.protocolEnforcementLayer,
    "operator-claim-preflight-and-accepted-reservation-only",
    "Operator must expose the current protocol enforcement layer truth.",
  );
  assert.equal(
    result.protocolEnforcementFinalLayerImplemented,
    false,
    "Final protocol replay enforcement layer must remain incomplete.",
  );
  assert.equal(
    result.protocolEnforcementFinalLayerProductionReady,
    false,
    "Final protocol replay enforcement layer must remain productionReady false.",
  );
  assert.equal(result.operatorStatusProductionReady, false, "Operator status must remain productionReady false.");
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta production nullifier replay status");
  console.log(`- status: ${result.status}`);
  console.log(`- runtimeMode: ${result.runtimeMode}`);
  console.log(`- storageKind: ${result.storageKind}`);
  console.log(`- durableStoreConfigured: ${String(result.storageDurableStoreConfigured)}`);
  console.log(`- nullifierReplayGuardMode: ${result.nullifierReplayGuardMode}`);
  console.log(`- nullifierReplayGuardStorageMode: ${result.nullifierReplayGuardStorageMode}`);
  console.log(`- protocolEnforcementLayer: ${result.protocolEnforcementLayer}`);
  console.log(`- finalProtocolLayerImplemented: ${String(result.protocolEnforcementFinalLayerImplemented)}`);
  console.log(`- rateLimiter: ${result.rateLimiter}`);
  console.log(`- productionReady: ${String(result.productionReady)}`);
}

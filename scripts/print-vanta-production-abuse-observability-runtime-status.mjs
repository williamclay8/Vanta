import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const manifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);
const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

function readManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function envValue(name) {
  return process.env[name]?.trim() ?? "";
}

function resolveOperatorBaseUrl() {
  const envUrl = envValue("VANTA_PRIVATE_POOL_V2_OPERATOR_URL");
  const manifest = readManifest();
  const manifestUrl =
    manifest.services.find((service) => service.id === "operator")?.deployedService?.url?.trim() ?? "";
  const value = envUrl || manifestUrl;

  if (!value) {
    throw new Error(
      "Missing VANTA_PRIVATE_POOL_V2_OPERATOR_URL and no production operator URL is recorded in the services manifest.",
    );
  }

  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Private Pool v2 operator URL must use http(s).");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Private Pool v2 operator URL must not include credentials.");
  }

  return {
    host: parsed.host,
    source: envUrl ? "env" : "manifest",
    value: value.replace(/\/+$/, ""),
  };
}

async function requestJson({ authToken, baseUrl, path }) {
  const response = await fetch(new URL(path, `${baseUrl}/`), {
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

const operatorBaseUrl = resolveOperatorBaseUrl();
const operatorAuthToken = envValue("VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN");
assert.ok(operatorAuthToken, "Missing VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN.");

const operatorResponse = await requestJson({
  authToken: operatorAuthToken,
  baseUrl: operatorBaseUrl.value,
  path: "/state/private-pool-v2-status",
});

assert.ok(
  operatorResponse.ok,
  `Private Pool v2 operator abuse/observability status HTTP ${operatorResponse.status}: ${operatorResponse.text || operatorResponse.statusText}`,
);
assert.ok(operatorResponse.parsed, "Private Pool v2 operator abuse/observability status must return JSON.");

const operatorPayload = operatorResponse.parsed;
const result = {
  checkedAt: new Date().toISOString(),
  mainnetReady: false,
  payRuntimeRef: "not-configured-for-production-runtime-check",
  payRuntimeStatus: "staging-or-local-only",
  privatePoolV2Runtime: {
    auditEventSinkKind: operatorPayload.observability?.auditEventSinkKind ?? null,
    operatorUrlHost: operatorBaseUrl.host,
    operatorUrlRef: "VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
    operatorUrlSource: operatorBaseUrl.source,
    rateLimitPerMinute: operatorPayload.trafficControls?.rateLimitPerMinute ?? null,
    rateLimiter: operatorPayload.trafficControls?.rateLimiter ?? null,
    runtimeMode: operatorPayload.runtime?.mode ?? null,
    status: operatorResponse.status,
    storageDurableStoreConfigured: operatorPayload.storage?.durableStoreConfigured ?? false,
    storageKind: operatorPayload.storage?.kind ?? null,
  },
  privatePoolV2RuntimeRef:
    "doppler run --config prd --project vanta -- npm run mainnet:abuse-observability-runtime-status-check",
  productionReady: false,
  safety:
    "No provider API keys, webhook URLs, source tokens, bearer values, wallet keys, signed transaction material, or database URLs are printed.",
  version: "vanta-production-abuse-observability-runtime-status-0.1",
};

if (checkMode) {
  assert.equal(result.payRuntimeStatus, "staging-or-local-only");
  assert.equal(result.privatePoolV2Runtime.runtimeMode, "remote-services");
  assert.equal(result.privatePoolV2Runtime.auditEventSinkKind, "postgres-operator-event-sink");
  assert.equal(result.privatePoolV2Runtime.rateLimiter, "in-memory-per-process");
  assert.equal(result.privatePoolV2Runtime.storageDurableStoreConfigured, true);
  assert.equal(result.privatePoolV2Runtime.storageKind, "postgres-jsonb-snapshot-store");
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta production abuse/observability runtime status");
  console.log(`- payRuntimeStatus: ${result.payRuntimeStatus}`);
  console.log(`- privatePoolV2RuntimeMode: ${result.privatePoolV2Runtime.runtimeMode}`);
  console.log(`- privatePoolV2AuditEventSinkKind: ${result.privatePoolV2Runtime.auditEventSinkKind}`);
  console.log(`- privatePoolV2RateLimiter: ${result.privatePoolV2Runtime.rateLimiter}`);
  console.log(`- privatePoolV2StorageKind: ${result.privatePoolV2Runtime.storageKind}`);
}

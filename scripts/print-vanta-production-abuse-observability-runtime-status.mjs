import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const manifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);
const jsonMode = process.argv.includes("--json");
const requireAuth = process.argv.includes("--require-auth") || process.argv.includes("--check");
const checkMode = process.argv.includes("--check");
const authShellCommand =
  "doppler run --config prd --project vanta -- npm run mainnet:abuse-observability-runtime-status-auth";

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
const operatorResponse = operatorAuthToken
  ? await requestJson({
      authToken: operatorAuthToken,
      baseUrl: operatorBaseUrl.value,
      path: "/state/private-pool-v2-status",
    })
  : {
      ok: false,
      parsed: null,
      skipped: true,
      status: 0,
      text: "",
    };

if (requireAuth) {
  assert.ok(operatorAuthToken, "Missing VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN.");
  assert.ok(
    operatorResponse.ok,
    `Private Pool v2 operator abuse/observability status HTTP ${operatorResponse.status}: ${operatorResponse.text || operatorResponse.statusText}`,
  );
  assert.ok(operatorResponse.parsed, "Private Pool v2 operator abuse/observability status must return JSON.");
}

const result = operatorResponse.parsed
  ? {
      authenticatedStatusCommand: authShellCommand,
      authTokenEnv: "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
      authTokenStatus: operatorAuthToken ? "set" : "missing",
      checkedAt: new Date().toISOString(),
      mainnetReady: false,
      nextAction: requireAuth
        ? "Authenticated abuse/observability runtime status was attempted."
        : "Run the authenticated abuse/observability runtime status command from a secret-manager shell when you want live operator proof.",
      payRuntimeRef: "not-configured-for-production-runtime-check",
      payRuntimeStatus: "staging-or-local-only",
      privatePoolV2PreferredRateLimiter: "postgres-durable-shared-window",
      privatePoolV2Runtime: {
        auditEventSinkKind: operatorResponse.parsed.observability?.auditEventSinkKind ?? null,
        operatorUrlHost: operatorBaseUrl.host,
        operatorUrlRef: "VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
        operatorUrlSource: operatorBaseUrl.source,
        rateLimitPerMinute: operatorResponse.parsed.trafficControls?.rateLimitPerMinute ?? null,
        rateLimiter: operatorResponse.parsed.trafficControls?.rateLimiter ?? null,
        runtimeMode: operatorResponse.parsed.runtime?.mode ?? null,
        status: operatorResponse.status,
        storageDurableStoreConfigured: operatorResponse.parsed.storage?.durableStoreConfigured ?? false,
        storageKind: operatorResponse.parsed.storage?.kind ?? null,
      },
      privatePoolV2RuntimeMatchesPreferredRateLimiter:
        (operatorResponse.parsed.trafficControls?.rateLimiter ?? null) === "postgres-durable-shared-window",
      privatePoolV2RuntimeRef: authShellCommand,
      productionReady: false,
      safety:
        "No provider API keys, webhook URLs, source tokens, bearer values, wallet keys, signed transaction material, or database URLs are printed.",
      status: operatorResponse.status,
      version: "vanta-production-abuse-observability-runtime-status-0.1",
    }
  : {
      authenticatedStatusCommand: authShellCommand,
      authTokenEnv: "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
      authTokenStatus: operatorAuthToken ? "set" : "missing",
      checkedAt: new Date().toISOString(),
      mainnetReady: false,
      nextAction: `Load the production operator auth token in a secret-manager shell and rerun: ${authShellCommand}`,
      payRuntimeRef: "not-configured-for-production-runtime-check",
      payRuntimeStatus: "staging-or-local-only",
      privatePoolV2PreferredRateLimiter: "postgres-durable-shared-window",
      privatePoolV2Runtime: {
        auditEventSinkKind: null,
        operatorUrlHost: operatorBaseUrl.host,
        operatorUrlRef: "VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
        operatorUrlSource: operatorBaseUrl.source,
        rateLimitPerMinute: null,
        rateLimiter: null,
        runtimeMode: null,
        status: 0,
        storageDurableStoreConfigured: false,
        storageKind: null,
      },
      privatePoolV2RuntimeMatchesPreferredRateLimiter: false,
      privatePoolV2RuntimeRef: authShellCommand,
      productionReady: false,
      safety:
        "No provider API keys, webhook URLs, source tokens, bearer values, wallet keys, signed transaction material, or database URLs are printed.",
      status: 0,
      version: "vanta-production-abuse-observability-runtime-status-0.1",
    };

if (checkMode) {
  assert.equal(result.payRuntimeStatus, "staging-or-local-only");
  assert.equal(result.privatePoolV2Runtime.runtimeMode, "remote-services");
  assert.equal(result.privatePoolV2Runtime.auditEventSinkKind, "postgres-operator-event-sink");
  assert.ok(
    ["in-memory-per-process", "postgres-durable-shared-window"].includes(result.privatePoolV2Runtime.rateLimiter),
    `Unexpected deployed Private Pool v2 rate limiter: ${result.privatePoolV2Runtime.rateLimiter}.`,
  );
  assert.equal(result.privatePoolV2PreferredRateLimiter, "postgres-durable-shared-window");
  assert.equal(
    result.privatePoolV2RuntimeMatchesPreferredRateLimiter,
    result.privatePoolV2Runtime.rateLimiter === "postgres-durable-shared-window",
  );
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
  console.log(`- privatePoolV2PreferredRateLimiter: ${result.privatePoolV2PreferredRateLimiter}`);
  console.log(`- privatePoolV2RuntimeMatchesPreferredRateLimiter: ${String(result.privatePoolV2RuntimeMatchesPreferredRateLimiter)}`);
  console.log(`- privatePoolV2StorageKind: ${result.privatePoolV2Runtime.storageKind}`);
}

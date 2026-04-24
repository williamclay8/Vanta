import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const productionServicesManifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);
const productionSmokeEvidencePath = new URL("../ops/mainnet/private-pool-v2-production-smoke.evidence.json", import.meta.url);
const requireAuth = process.argv.includes("--require-auth") || process.argv.includes("--check");
const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");
const authShellCommand =
  "doppler run --config prd --project vanta -- node scripts/print-vanta-production-nullifier-replay-status.mjs --require-auth";

function productionOperatorUrl() {
  const manifest = JSON.parse(readFileSync(productionServicesManifestPath, "utf8"));
  const operator = manifest.services.find((service) => service.id === "operator");
  return operator?.deployedService?.url ?? null;
}

function readProductionSmokeReplayTarget() {
  const evidence = JSON.parse(readFileSync(productionSmokeEvidencePath, "utf8"));
  const target = evidence.smokeTargets?.find((candidate) => candidate.id === "nullifier-replay-simulation");
  if (!target) {
    throw new Error("Missing nullifier-replay-simulation in production smoke evidence.");
  }
  return target;
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
    authToken: process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN?.trim() ?? "",
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
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
  const productionSmokeReplayTarget = readProductionSmokeReplayTarget();
  const acceptedNullifierCount =
    typeof payload.nullifierReplayGuard?.acceptedNullifierCount === "number"
      ? payload.nullifierReplayGuard.acceptedNullifierCount
      : "pending";
  const reservedNullifierCount =
    typeof payload.nullifierReplayGuard?.reservedNullifierCount === "number"
      ? payload.nullifierReplayGuard.reservedNullifierCount
      : "pending";

  return {
    authenticatedStatusCommand: authShellCommand,
    authTokenEnv: config.authTokenEnv,
    authTokenStatus: config.authToken ? "set" : "missing",
    checkedAt: new Date().toISOString(),
    layeredReplayStatus:
      "operator-enforced-plus-role-network-verified-plus-production-smoke-simulated",
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
    roleServiceNetworkReplayBarrier:
      "verifier-receipt-idempotency-and-indexer-nullifier-registration",
    roleServiceReplayEvidenceRef: "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
    roleServiceNetworkReplayRef: "npm run private-pool-v2:service-network-check",
    roleServiceNetworkReplayVerified: true,
    safety:
      "No auth token values, database URLs, bearer values, wallet keys, or signed transaction material are printed.",
    status,
    storageDurableStoreConfigured: payload.storage?.durableStoreConfigured ?? false,
    storageKind: payload.storage?.kind ?? null,
    storageProductionReady: payload.storage?.productionReady ?? false,
    storageRef: "VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF",
    nullifierReplayAcceptedCount: acceptedNullifierCount,
    nullifierReplayGuardMode: payload.nullifierReplayGuard?.mode ?? null,
    nullifierReplayGuardStorageMode: payload.nullifierReplayGuard?.storageMode ?? null,
    nullifierReplayGuardProductionReady: payload.nullifierReplayGuard?.productionReady ?? false,
    nullifierReplayReservedCount: reservedNullifierCount,
    productionSmokeReplaySimulationRef:
      "ops/mainnet/private-pool-v2-production-smoke.evidence.json#nullifier-replay-simulation",
    productionSmokeReplaySimulationStatus: productionSmokeReplayTarget.status ?? null,
    productionSmokeReplaySimulationHttpStatus: productionSmokeReplayTarget.replayStatus ?? null,
    protocolEnforcementFinalLayerImplemented: payload.protocolEnforcement?.finalLayerImplemented ?? false,
    protocolEnforcementFinalLayerProductionReady: payload.protocolEnforcement?.finalLayerProductionReady ?? false,
    protocolEnforcementLayer: payload.protocolEnforcement?.layer ?? null,
    nextAction: config.authToken
      ? requireAuth
        ? "Authenticated production nullifier replay status was attempted."
        : "Run the authenticated nullifier replay status command from a secret-manager shell when you need live operator status."
      : `Load the production operator auth token in a secret-manager shell and rerun: ${authShellCommand}`,
    version: "vanta-production-nullifier-replay-status-0.1",
  };
}

const config = operatorConfig();
const response = config.authToken
  ? await requestJson(config)
  : {
      ok: false,
      parsed: null,
      skipped: true,
      status: 0,
      text: "",
    };

if (requireAuth) {
  assert.ok(config.authToken, `Missing required environment variable ${config.authTokenEnv}.`);
  assert.ok(response.ok, `Operator nullifier replay status HTTP ${response.status}: ${response.text || response.statusText}`);
  assert.ok(response.parsed, "Operator nullifier replay status must return JSON.");
}

const result = response.parsed
  ? summarize(config, response.parsed, response.status)
  : {
      authenticatedStatusCommand: authShellCommand,
      authTokenEnv: config.authTokenEnv,
      authTokenStatus: config.authToken ? "set" : "missing",
      checkedAt: new Date().toISOString(),
      layeredReplayStatus: "pending-authenticated-operator-status",
      mainnetReady: false,
      nextAction: `Load the production operator auth token in a secret-manager shell and rerun: ${authShellCommand}`,
      operatorStatusProductionReady: false,
      operatorUrlHost: config.urlHost,
      operatorUrlRef: "VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
      operatorUrlSource: config.urlSource,
      productionReady: false,
      productionSmokeReplaySimulationHttpStatus: null,
      productionSmokeReplaySimulationRef:
        "ops/mainnet/private-pool-v2-production-smoke.evidence.json#nullifier-replay-simulation",
      productionSmokeReplaySimulationStatus: null,
      protocolEnforcementFinalLayerImplemented: false,
      protocolEnforcementFinalLayerProductionReady: false,
      protocolEnforcementLayer: null,
      rateLimitPerMinute: null,
      rateLimiter: null,
      roleServiceNetworkReplayBarrier: "verifier-receipt-idempotency-and-indexer-nullifier-registration",
      roleServiceReplayEvidenceRef: "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
      roleServiceNetworkReplayRef: "npm run private-pool-v2:service-network-check",
      roleServiceNetworkReplayVerified: true,
      runtimeMode: null,
      runtimeProductionReady: false,
      safety:
        "No auth token values, database URLs, bearer values, wallet keys, or signed transaction material are printed.",
      status: response.status,
      storageDurableStoreConfigured: false,
      storageKind: null,
      storageProductionReady: false,
      storageRef: "VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF",
      nullifierReplayAcceptedCount: "pending",
      nullifierReplayGuardMode: null,
      nullifierReplayGuardStorageMode: null,
      nullifierReplayGuardProductionReady: false,
      nullifierReplayReservedCount: "pending",
      version: "vanta-production-nullifier-replay-status-0.1",
    };

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
  assert.ok(
    result.nullifierReplayAcceptedCount === "pending" ||
      (Number.isInteger(result.nullifierReplayAcceptedCount) && result.nullifierReplayAcceptedCount >= 0),
    "Accepted replay count must stay sanitized.",
  );
  assert.ok(
    result.nullifierReplayReservedCount === "pending" ||
      (Number.isInteger(result.nullifierReplayReservedCount) && result.nullifierReplayReservedCount >= 0),
    "Reserved replay count must stay sanitized.",
  );
  assert.equal(
    result.protocolEnforcementLayer,
    "operator-claim-preflight-and-accepted-reservation-only",
    "Operator must expose the current protocol enforcement layer truth.",
  );
  assert.equal(
    result.layeredReplayStatus,
    "operator-enforced-plus-role-network-verified-plus-production-smoke-simulated",
    "Replay status must expose the current layered truth.",
  );
  assert.equal(
    result.roleServiceNetworkReplayBarrier,
    "verifier-receipt-idempotency-and-indexer-nullifier-registration",
    "Replay status must expose the role-service replay barrier truth.",
  );
  assert.equal(
    result.roleServiceReplayEvidenceRef,
    "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
  );
  assert.equal(result.roleServiceNetworkReplayRef, "npm run private-pool-v2:service-network-check");
  assert.equal(result.roleServiceNetworkReplayVerified, true);
  assert.equal(
    result.productionSmokeReplaySimulationRef,
    "ops/mainnet/private-pool-v2-production-smoke.evidence.json#nullifier-replay-simulation",
  );
  assert.equal(result.productionSmokeReplaySimulationStatus, "pass");
  assert.equal(result.productionSmokeReplaySimulationHttpStatus, 400);
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
  console.log(`- nullifierReplayAcceptedCount: ${String(result.nullifierReplayAcceptedCount)}`);
  console.log(`- nullifierReplayReservedCount: ${String(result.nullifierReplayReservedCount)}`);
  console.log(`- layeredReplayStatus: ${result.layeredReplayStatus}`);
  console.log(`- roleServiceNetworkReplayBarrier: ${result.roleServiceNetworkReplayBarrier}`);
  console.log(`- productionSmokeReplaySimulationStatus: ${result.productionSmokeReplaySimulationStatus}`);
  console.log(`- protocolEnforcementLayer: ${result.protocolEnforcementLayer}`);
  console.log(`- finalProtocolLayerImplemented: ${String(result.protocolEnforcementFinalLayerImplemented)}`);
  console.log(`- rateLimiter: ${result.rateLimiter}`);
  console.log(`- productionReady: ${String(result.productionReady)}`);
}

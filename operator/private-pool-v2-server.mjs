import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createInMemoryRateLimiter,
  createPostgresRateLimiterFromDatabaseUrl,
} from "../src/ops/vantaRateLimit.mjs";
import {
  createOperatorStartupTelemetryEvent,
  createSafeTelemetryRequestContext,
  observeSafeTelemetryResponse,
  writeSafeTelemetryEvent,
} from "../src/ops/vantaSafeTelemetry.mjs";
import {
  createNoopOperatorEventSink,
  createPostgresOperatorEventSinkFromDatabaseUrl,
} from "../src/ops/vantaOperatorEventSink.mjs";
import { createVantaPrivatePoolV2AnonymitySetReadiness } from "../src/readiness/privatePoolV2AnonymitySetReadiness.mjs";
import { createNullifierReplayGuard } from "../src/privacy/nullifierReplayGuard.mjs";
import { createPostgresNullifierReplayStoreFromDatabaseUrl } from "../src/privacy/postgresNullifierReplayStore.mjs";
import {
  deriveVantaPrivatePoolV2NullifierMarkerAddress,
  deriveVantaPrivatePoolV2OutputRecordAddress,
  validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction,
} from "../src/privacy/privatePoolV2SolanaSpendTransaction.mjs";
import { createPostgresSnapshotStore } from "../src/storage/vantaPostgresSnapshotStore.mjs";
import {
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial,
  verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact,
  verifyVantaPrivatePoolV2ClaimProofArtifact,
  verifyVantaPrivatePoolV2SendProofArtifact,
  verifyVantaPrivatePoolV2ShieldProofArtifact,
  verifyVantaPrivatePoolV2SwapToShieldedProofArtifact,
} from "./private-pool-v2-proof-artifact.mjs";
import { createPrivatePoolV2ReceiptStore } from "./private-pool-v2-store.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const host = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_HOST ?? process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_PORT ?? "8797");
const operatorAuthToken = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN;
const rateLimitPerMinute = Number(process.env.VANTA_PRIVATE_POOL_V2_RATE_LIMIT_PER_MINUTE ?? "600");
const databaseUrl = process.env.VANTA_PRIVATE_POOL_V2_DATABASE_URL;
const runtimeMode = process.env.VANTA_PRIVATE_POOL_V2_RUNTIME_MODE ?? "local-benchmark";
const browserShieldDepositEvidenceMode =
  process.env.VANTA_PRIVATE_POOL_V2_PUBLIC_SHIELD_RECEIPT_DEPOSIT_EVIDENCE_MODE ??
  (process.env.NODE_ENV === "production" ? "required" : "local-skip");
const browserShieldDepositEvidenceRpcUrl =
  process.env.VANTA_PRIVATE_POOL_V2_PUBLIC_SHIELD_RECEIPT_RPC_URL ??
  process.env.SOLANA_RPC_URL ??
  "https://solana-rpc.publicnode.com";
const tempParent = resolve(repoRoot, ".tmp");
mkdirSync(tempParent, { recursive: true });
const tempRoot = mkdtempSync(resolve(tempParent, "vanta-private-pool-v2-operator-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFiles = [
  "protocolAdapter.ts",
  "umbraCapabilityProfile.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2CapabilityProfile.ts",
  "privatePoolV2LocalIndexer.ts",
  "privatePoolV2LocalProver.ts",
  "privatePoolV2LocalRelayer.ts",
  "privatePoolV2LocalVerifierRegistry.ts",
  "privatePoolV2MockRuntime.ts",
  "privatePoolV2ProtocolSettlementClient.ts",
  "privatePoolV2RemoteServices.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2ShieldCapabilityAdapter.ts",
  "privatePoolV2SettlementPolicy.ts",
  "vantaShieldCommittedSettlement.ts",
];

function assertProductionAuthToken() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (!operatorAuthToken || operatorAuthToken === "vanta-private-pool-v2-dev-token") {
    throw new Error(
      "Private Pool v2 production mode requires VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN.",
    );
  }

  if (!databaseUrl) {
    throw new Error(
      "Private Pool v2 production mode requires VANTA_PRIVATE_POOL_V2_DATABASE_URL for durable nullifier replay enforcement.",
    );
  }

  if (runtimeMode !== "remote-services") {
    throw new Error(
      "Private Pool v2 production mode requires VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services so local mock proofs cannot back live settlement.",
    );
  }
}

assertProductionAuthToken();

const allowLegacyPaySettlements =
  process.env.VANTA_PRIVATE_POOL_V2_ALLOW_LEGACY_PAY_SETTLEMENTS === "true" &&
  process.env.NODE_ENV !== "production";

function copySource(relativePath) {
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src/privacy", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "\.\/([A-Za-z0-9]+)"/g,
    'from "./$1.js"',
  );
  writeFileSync(filePath, source);
}

function normalizeForJson(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Uint8Array) {
    return [...value];
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForJson(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeForJson(nestedValue)]),
    );
  }

  return value;
}

function readRequestBody(request) {
  return new Promise((resolvePromise, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString("utf8");
    });
    request.on("end", () => {
      try {
        resolvePromise(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(`${JSON.stringify(normalizeForJson(payload), null, 2)}\n`);
}

function writeBrowserCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function writePublicShieldReceiptHeaders(response) {
  writeBrowserCorsHeaders(response);
  response.setHeader(
    "X-Vanta-Shield-Receipt-Deposit-Evidence",
    browserShieldDepositEvidenceMode,
  );
}

function isPublicUnshieldRoute(request) {
  return (
    request.url === "/unshield" ||
    request.url === "/unshield/sol" ||
    request.url === "/health/sol-unshield" ||
    request.url === "/state/unshield-records" ||
    request.url === "/state/sol-unshield-records"
  );
}

function isPublicBrowserShieldReceiptRoute(request) {
  return request.url === "/private-pool-v2/public/shield-receipts";
}

function isPublicBrowserCorsRoute(request) {
  return isPublicUnshieldRoute(request) || isPublicBrowserShieldReceiptRoute(request);
}

let unshieldOperatorHandlerPromise = null;

async function handlePublicUnshieldRoute(request, response) {
  try {
    unshieldOperatorHandlerPromise ??= import("./unshield-server.mjs").then(
      (module) => module.handleUnshieldOperatorRequest,
    );
    const handleUnshieldOperatorRequest = await unshieldOperatorHandlerPromise;
    await handleUnshieldOperatorRequest(request, response);
  } catch (error) {
    writeBrowserCorsHeaders(response);
    response.writeHead(503, { "Content-Type": "application/json" });
    response.end(
      `${JSON.stringify(
        {
          error: error instanceof Error ? error.message : "Unshield operator route is not available.",
          ok: false,
        },
        null,
        2,
      )}\n`,
    );
  }
}

async function handlePublicBrowserShieldReceiptRoute(request, response) {
  writePublicShieldReceiptHeaders(response);

  if (request.method !== "POST") {
    sendJson(response, 405, {
      error: "Browser committed Shield receipt route only accepts POST.",
      ok: false,
    });
    return;
  }

  const body = await readRequestBody(request);
  const settlementRequest = await validateBrowserShieldReceiptBody(body);
  sendJson(response, 200, await proveAndAcceptProtocolSettlement(settlementRequest));
}

const rateLimiter = databaseUrl
  ? await createPostgresRateLimiterFromDatabaseUrl({
      databaseUrl,
      limit: rateLimitPerMinute,
      service: "vanta-private-pool-v2",
    })
  : createInMemoryRateLimiter({ limit: rateLimitPerMinute });
const operatorEventSink = databaseUrl
  ? await createPostgresOperatorEventSinkFromDatabaseUrl({
      databaseUrl,
      service: "vanta-private-pool-v2",
    })
  : createNoopOperatorEventSink({ service: "vanta-private-pool-v2" });

async function appendOperatorEvent(input) {
  try {
    await operatorEventSink.append(input);
  } catch {
    // Observability must never widen request failure scope.
  }
}

function rateLimitKey(request) {
  return `${request.socket.remoteAddress ?? "unknown"}:${request.method}:${request.url ?? "/"}`;
}

async function enforceRateLimit(request, response, telemetryContext) {
  if (request.method === "GET" && request.url === "/health") {
    return true;
  }

  const decision = await rateLimiter.check(rateLimitKey(request));
  if (decision.allowed) {
    return true;
  }

  response.writeHead(429, {
    "Content-Type": "application/json",
    "Retry-After": String(Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000))),
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
  });
  response.end(
    `${JSON.stringify(
      {
        error: "Private Pool v2 operator rate limit exceeded.",
        ok: false,
        resetAt: new Date(decision.resetAt).toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  await appendOperatorEvent({
    eventRef: `${telemetryContext.requestId}:${telemetryContext.path}`,
    eventType: "rate_limit_rejected",
    payload: {
      limit: decision.limit,
      method: request.method,
      path: telemetryContext.path,
      remaining: decision.remaining,
      requestId: telemetryContext.requestId,
      service: "vanta-private-pool-v2",
    },
    severity: "warning",
  });
  return false;
}

async function requireAuth(request, response, telemetryContext) {
  if (request.url === "/health" || !operatorAuthToken) {
    return true;
  }

  if (request.headers.authorization !== `Bearer ${operatorAuthToken}`) {
    await appendOperatorEvent({
      eventRef: `${telemetryContext.requestId}:${telemetryContext.path}`,
      eventType: "auth_rejected",
      payload: {
        method: request.method,
        path: telemetryContext.path,
        requestId: telemetryContext.requestId,
        service: "vanta-private-pool-v2",
      },
      severity: "warning",
    });
    sendJson(response, 401, {
      error: "Missing or invalid Private Pool v2 operator token.",
      ok: false,
    });
    return false;
  }

  return true;
}

function toProofResult(proof) {
  return {
    ...proof,
    proofBytes: new Uint8Array(proof.proofBytes ?? []),
  };
}

function toProofRequest(request) {
  return {
    ...request,
    amountBaseUnits: BigInt(request.amountBaseUnits),
  };
}

function readProofRequestInput(request, prefix) {
  return request.publicInputs?.find((input) => String(input).startsWith(prefix))?.slice(prefix.length) ?? null;
}

function proofRequestReplayContext(request) {
  if (request.intent === "private-send") {
    return "private-pool-v2-private-send";
  }

  if (request.intent === "swap-to-shielded") {
    return "private-pool-v2-swap-to-shielded";
  }

  if (request.intent === "unshield") {
    return "private-pool-v2-unshield";
  }

  if (request.intent === "claim") {
    return "private-pool-v2-claim";
  }

  return null;
}

function replayContextFromReplayKey(replayKey) {
  if (typeof replayKey !== "string") {
    return null;
  }

  if (replayKey.startsWith("private-send:")) {
    return "private-pool-v2-private-send";
  }

  if (replayKey.startsWith("swap-to-shielded:")) {
    return "private-pool-v2-swap-to-shielded";
  }

  if (replayKey.startsWith("unshield:")) {
    return "private-pool-v2-unshield";
  }

  if (replayKey.startsWith("claim:")) {
    return "private-pool-v2-claim";
  }

  return null;
}

function nullifierFromReplayKey(replayKey) {
  if (typeof replayKey !== "string" || !replayKey.includes(":")) {
    return null;
  }

  return replayKey.slice(replayKey.indexOf(":") + 1);
}

function replayNullifierFromProofRequest(request) {
  const context = proofRequestReplayContext(request);
  if (!context) {
    return null;
  }

  return request.intent === "claim"
    ? readProofRequestInput(request, "nullifier:")
    : readProofRequestInput(request, "nullifier:") ??
        readProofRequestInput(request, "nullifier-or-replay-commitment:");
}

function serializeReplayGuardSnapshot(snapshot) {
  return JSON.stringify(snapshot, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

function compileRuntime() {
  mkdirSync(tempTsDir, { recursive: true });

  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }
}

compileRuntime();

const receiptStore = databaseUrl
  ? createPrivatePoolV2ReceiptStore({
      snapshotStore: await createPostgresSnapshotStore({
        databaseUrl,
        defaultSnapshot: null,
        stateVersion: 2,
        storeKey: "vanta-private-pool-v2",
      }),
    })
  : createPrivatePoolV2ReceiptStore({
      path: process.env.VANTA_PRIVATE_POOL_V2_STORE_PATH,
    });

const { createVantaPrivatePoolV2MockRuntime } = await import(
  pathToFileURL(join(tempJsDir, "privatePoolV2MockRuntime.js")).href
);
const {
  createVantaPrivatePoolV2RemoteIndexer,
  createVantaPrivatePoolV2RemoteProver,
  createVantaPrivatePoolV2RemoteRelayer,
  createVantaPrivatePoolV2RemoteRuntime,
  createVantaPrivatePoolV2RemoteVerifierRegistry,
} = await import(pathToFileURL(join(tempJsDir, "privatePoolV2RemoteServices.js")).href);
const {
  createVantaPrivatePoolV2ClaimProofRequest,
  createVantaPrivatePoolV2ActualPrivateSpendProofRequest,
  createVantaPrivatePoolV2HiddenEconomicsProofRequest,
  createVantaPrivatePoolV2SendProofRequest,
  createVantaPrivatePoolV2ShieldProofRequest,
  createVantaPrivatePoolV2SwapToShieldedProofRequest,
  createVantaPrivatePoolV2UnshieldProofRequest,
} = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href);
const { createPrivatePoolV2ShieldProofRequestFromCapability } = await import(
  pathToFileURL(join(tempJsDir, "privatePoolV2ShieldCapabilityAdapter.js")).href
);
const { VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY } = await import(
  pathToFileURL(join(tempJsDir, "privatePoolV2SettlementPolicy.js")).href
);
const { getVantaPrivatePoolV2CapabilityProfile } = await import(
  pathToFileURL(join(tempJsDir, "privatePoolV2CapabilityProfile.js")).href
);
const {
  parseVantaShieldCommittedEconomicsSettlementOpening,
  verifyVantaShieldCommittedEconomicsSettlementOpening,
} = await import(pathToFileURL(join(tempJsDir, "vantaShieldCommittedSettlement.js")).href);
const persistedState = await receiptStore.load();
const persistedCommitments = [...persistedState.commitments];
const runtimeProfile = getVantaPrivatePoolV2CapabilityProfile();

function requireRuntimeEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Private Pool v2 ${runtimeMode} runtime requires ${name}.`);
  }

  return value;
}

function createRuntime() {
  if (runtimeMode === "remote-services") {
    const allowInsecureLoopback =
      process.env.VANTA_PRIVATE_POOL_V2_ALLOW_INSECURE_LOOPBACK_REMOTE_SERVICES === "true";
    const indexer = createVantaPrivatePoolV2RemoteIndexer({
      allowInsecureLoopback,
      authToken: requireRuntimeEnv("VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN"),
      baseUrl: requireRuntimeEnv("VANTA_PRIVATE_POOL_V2_INDEXER_URL"),
    });
    const prover = createVantaPrivatePoolV2RemoteProver({
      allowInsecureLoopback,
      authToken: requireRuntimeEnv("VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN"),
      baseUrl: requireRuntimeEnv("VANTA_PRIVATE_POOL_V2_PROVER_URL"),
    });
    const relayer = createVantaPrivatePoolV2RemoteRelayer({
      allowInsecureLoopback,
      authToken: requireRuntimeEnv("VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN"),
      baseUrl: requireRuntimeEnv("VANTA_PRIVATE_POOL_V2_RELAYER_URL"),
    });
    const verifierRegistry = createVantaPrivatePoolV2RemoteVerifierRegistry({
      allowInsecureLoopback,
      authToken: requireRuntimeEnv("VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN"),
      baseUrl: requireRuntimeEnv("VANTA_PRIVATE_POOL_V2_VERIFIER_URL"),
    });

    return createVantaPrivatePoolV2RemoteRuntime({
      assets: runtimeProfile.assets,
      indexer,
      network: runtimeProfile.network,
      prover,
      relayer,
      verifierRegistry,
    });
  }

  if (runtimeMode !== "local-benchmark") {
    throw new Error("Private Pool v2 runtime mode must be local-benchmark or remote-services.");
  }

  return createVantaPrivatePoolV2MockRuntime({
    commitments: persistedCommitments,
    nullifiers: persistedState.nullifiers,
    receipts: persistedState.receipts,
  });
}

const runtime = createRuntime();
const restoredNullifierRecords = (persistedState.nullifiers ?? []).map((record) => ({
  assetId: "restored-private-pool-v2-claim",
  context:
    record.context ??
    (record.intent === "private-send"
      ? "private-pool-v2-private-send"
      : record.intent === "swap-to-shielded"
        ? "private-pool-v2-swap-to-shielded"
        : record.intent === "unshield"
          ? "private-pool-v2-unshield"
          : "private-pool-v2-claim"),
  nullifier: record.nullifier,
  recordedAt: new Date(Number(record.spentAtSlot ?? 0n)).toISOString(),
  requestId: `restored:${record.nullifier}`,
  spentAtSlot: record.spentAtSlot,
}));
const nullifierReplayGuard = databaseUrl
  ? await createPostgresNullifierReplayStoreFromDatabaseUrl({ databaseUrl })
  : createNullifierReplayGuard({
      initialRecords: restoredNullifierRecords,
    });
if (databaseUrl) {
  for (const record of restoredNullifierRecords) {
    await nullifierReplayGuard.reserve(record);
  }
}
const paySettlementReceipts = [...(persistedState.paySettlements ?? [])];
const protocolSettlementReceipts = [...(persistedState.protocolSettlements ?? [])];
for (const settlement of protocolSettlementReceipts) {
  await ensureProofReceiptReplayGuarded(
    settlement.proofReceipt,
    `startup-protocol-settlement-backfill:${settlement.protocolSettlementReceipt?.id ?? "unknown"}`,
  );
}

const textEncoder = new TextEncoder();
const VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION =
  "vanta-pay-private-settlement-adapter-0.1";
const VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID = "hidden:economic-terms";
const settlementPolicy = VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY;
const protocolActionProofModes = {
  send: "actual_private_spend_circuit_request",
  shield: "committed_shield_circuit_request",
  swap: "swap_to_shielded_circuit_request",
  unshield: "committed_unshield_or_claim_circuit_request",
};
const productionProofSystems = ["noir-bb", "groth16", "plonk"];
const productionProofSystemSet = new Set(productionProofSystems);
const productionProofBackends = ["remote-service"];
const productionProofBackendSet = new Set(productionProofBackends);
const localProofBackends = [
  "local-mock",
  "local-bb-fixture-artifact",
  "local-bb-derived-artifact",
];
const localBenchmarkProofSystem = "mock";
const shieldProofArtifactCircuit = "vanta_private_pool_v2_shield_entry";
const claimProofArtifactCircuit = "vanta_private_pool_v2_claim_entry";
const sendProofArtifactCircuit = "vanta_private_pool_v2_send_entry";
const swapToShieldedProofArtifactCircuit = "vanta_private_pool_v2_swap_to_shielded_entry";
const actualPrivateSpendProofArtifactCircuit =
  "vanta_private_pool_v2_actual_private_spend_entry";

function hashHex(...parts) {
  return `0x${bytesToHex(sha256(textEncoder.encode(parts.join("\u001f"))))}`;
}

function hashId(prefix, ...parts) {
  return `${prefix}_${bytesToHex(sha256(textEncoder.encode(parts.join("\u001f")))).slice(0, 24)}`;
}

function productionProofSystemRequiredNow() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VANTA_PRIVATE_POOL_V2_REQUIRE_PRODUCTION_PROOF_SYSTEM === "true" ||
    process.env.VANTA_PRIVATE_POOL_V2_REAL_FUNDS_SETTLEMENT_ENABLED === "true"
  );
}

function proofTrustBoundaryPayload() {
  return {
    acceptedProductionProofBackends: productionProofBackends,
    acceptedProductionProofSystems: productionProofSystems,
    localProofBackends,
    localBenchmarkProofSystem,
    mockProofRealFundsAllowed: false,
    mockProofsAcceptedOnlyFor: [
      "local-benchmark receipts",
      "deterministic no-real-funds smoke checks",
    ],
    productionProofSystemRequired: true,
    productionProofSystemRequiredNow: productionProofSystemRequiredNow(),
  };
}

function assertProofSystemCanBackConfiguredSettlement(proof) {
  if (!productionProofSystemRequiredNow()) {
    return;
  }

  if (!productionProofSystemSet.has(proof?.proofSystem)) {
    throw new Error(
      `Private Pool v2 real-funds settlement requires a production ZK proof system (${productionProofSystems.join(", ")}); ${proof?.proofSystem ?? "missing"} proofs are local-benchmark only.`,
    );
  }

  if (!productionProofBackendSet.has(proof?.proofBackend)) {
    throw new Error(
      `Private Pool v2 real-funds settlement requires a remote production proof backend (${productionProofBackends.join(", ")}); ${proof?.proofBackend ?? "missing"} proofs are local-only or untrusted.`,
    );
  }
}

function assertStrictPrivatePoolV2ProofArtifactBody(body) {
  if (!body?.proofArtifact) {
    throw new Error("Private Pool v2 proof artifact verification requires proofArtifact.");
  }

  for (const forbiddenField of [
    "noteSecret",
    "privateInputs",
    "private_inputs",
    "privateWitness",
    "proof",
    "request",
    "secret",
    "sourceArtifacts",
    "sourcePublicInputs",
    "witness",
    "witnessPackage",
  ]) {
    if (Object.hasOwn(body, forbiddenField)) {
      throw new Error(
        `Private Pool v2 strict no-witness proof-artifact mode rejects ${forbiddenField} material.`,
      );
    }
  }

  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
    body,
    "Private Pool v2 proof artifact verification body",
  );

  if (productionProofSystemRequiredNow() && body.proofArtifact.proofBackend !== "remote-service") {
    throw new Error(
      "Private Pool v2 production proof-artifact verification requires proofBackend=remote-service.",
    );
  }
}

function requiresRemoteProofArtifactVerification(body) {
  return productionProofSystemRequiredNow() || body?.proofArtifact?.proofBackend === "remote-service";
}

function assertExpectedPublicInputKeyAllowlist(body, allowedKey, artifactLabel) {
  const expectedPublicInputs = body?.expectedPublicInputs;
  if (expectedPublicInputs === undefined || expectedPublicInputs === null) {
    return;
  }

  if (typeof expectedPublicInputs !== "object" || Array.isArray(expectedPublicInputs)) {
    throw new Error(
      `Private Pool v2 ${artifactLabel} proof artifact verification requires expectedPublicInputs to be an object.`,
    );
  }

  for (const key of Object.keys(expectedPublicInputs)) {
    if (key !== allowedKey) {
      throw new Error(
        `Private Pool v2 ${artifactLabel} proof artifact verification rejects unexpected expectedPublicInputs.${key}; only expectedPublicInputs.${allowedKey} is bound.`,
      );
    }
  }
}

function assertActualPrivateSpendExpectedPublicInputMatches(body, verifiedReceipt) {
  const expectedPrivateSpendPublicInputHash =
    body?.expectedPublicInputs?.privateSpendPublicInputHash;
  if (
    typeof expectedPrivateSpendPublicInputHash !== "string" ||
    !expectedPrivateSpendPublicInputHash.trim()
  ) {
    throw new Error(
      "Private Pool v2 Actual Private Spend proof artifact verification requires expectedPublicInputs.privateSpendPublicInputHash.",
    );
  }

  const actualPrivateSpendPublicInputHash =
    verifiedReceipt?.verifiedPublicInputs?.privateSpendPublicInputHash;
  if (actualPrivateSpendPublicInputHash !== expectedPrivateSpendPublicInputHash.trim()) {
    throw new Error(
      `Private Pool v2 Actual Private Spend proof artifact privateSpendPublicInputHash mismatch: expected ${expectedPrivateSpendPublicInputHash.trim()}, received ${actualPrivateSpendPublicInputHash ?? "missing"}.`,
    );
  }
}

function assertShieldExpectedPublicInputMatches(body, verifiedReceipt) {
  const expectedShieldPublicInputHash = body?.expectedPublicInputs?.shieldPublicInputHash;
  if (typeof expectedShieldPublicInputHash !== "string" || !expectedShieldPublicInputHash.trim()) {
    throw new Error(
      "Private Pool v2 Shield proof artifact verification requires expectedPublicInputs.shieldPublicInputHash.",
    );
  }

  const actualShieldPublicInputHash = verifiedReceipt?.verifiedPublicInputs?.shieldPublicInputHash;
  if (actualShieldPublicInputHash !== expectedShieldPublicInputHash.trim()) {
    throw new Error(
      `Private Pool v2 Shield proof artifact shieldPublicInputHash mismatch: expected ${expectedShieldPublicInputHash.trim()}, received ${actualShieldPublicInputHash ?? "missing"}.`,
    );
  }
}

function assertSendExpectedPublicInputMatches(body, verifiedReceipt) {
  const expectedSendPublicInputHash = body?.expectedPublicInputs?.sendPublicInputHash;
  if (typeof expectedSendPublicInputHash !== "string" || !expectedSendPublicInputHash.trim()) {
    throw new Error(
      "Private Pool v2 Send proof artifact verification requires expectedPublicInputs.sendPublicInputHash.",
    );
  }

  const actualSendPublicInputHash = verifiedReceipt?.verifiedPublicInputs?.sendPublicInputHash;
  if (actualSendPublicInputHash !== expectedSendPublicInputHash.trim()) {
    throw new Error(
      `Private Pool v2 Send proof artifact sendPublicInputHash mismatch: expected ${expectedSendPublicInputHash.trim()}, received ${actualSendPublicInputHash ?? "missing"}.`,
    );
  }
}

function assertClaimExpectedPublicInputMatches(body, verifiedReceipt) {
  const expectedClaimPublicInputHash = body?.expectedPublicInputs?.claimPublicInputHash;
  if (typeof expectedClaimPublicInputHash !== "string" || !expectedClaimPublicInputHash.trim()) {
    throw new Error(
      "Private Pool v2 Claim proof artifact verification requires expectedPublicInputs.claimPublicInputHash.",
    );
  }

  const actualClaimPublicInputHash = verifiedReceipt?.verifiedPublicInputs?.claimPublicInputHash;
  if (actualClaimPublicInputHash !== expectedClaimPublicInputHash.trim()) {
    throw new Error(
      `Private Pool v2 Claim proof artifact claimPublicInputHash mismatch: expected ${expectedClaimPublicInputHash.trim()}, received ${actualClaimPublicInputHash ?? "missing"}.`,
    );
  }
}

function assertSwapToShieldedExpectedPublicInputMatches(body, verifiedReceipt) {
  const expectedSwapPublicInputHash = body?.expectedPublicInputs?.swapPublicInputHash;
  if (typeof expectedSwapPublicInputHash !== "string" || !expectedSwapPublicInputHash.trim()) {
    throw new Error(
      "Private Pool v2 Swap-to-shielded proof artifact verification requires expectedPublicInputs.swapPublicInputHash.",
    );
  }

  const actualSwapPublicInputHash = verifiedReceipt?.verifiedPublicInputs?.swapPublicInputHash;
  if (actualSwapPublicInputHash !== expectedSwapPublicInputHash.trim()) {
    throw new Error(
      `Private Pool v2 Swap-to-shielded proof artifact swapPublicInputHash mismatch: expected ${expectedSwapPublicInputHash.trim()}, received ${actualSwapPublicInputHash ?? "missing"}.`,
    );
  }
}

async function verifyPrivatePoolV2ProofArtifactWithBoundary(
  body,
  { assertExpectedPublicInputMatches, localVerify },
) {
  if (requiresRemoteProofArtifactVerification(body)) {
    if (typeof runtime.verifierRegistry?.verifyProofArtifact !== "function") {
      throw new Error(
        "Private Pool v2 remote proof-artifact verification requires a remote verifier registry.",
      );
    }

    const verifiedReceipt = await runtime.verifierRegistry.verifyProofArtifact({
      expectedPublicInputs: body.expectedPublicInputs,
      proofArtifact: body.proofArtifact,
    });
    assertExpectedPublicInputMatches(body, verifiedReceipt);
    return verifiedReceipt;
  }

  const verifiedReceipt = await localVerify({
    proofArtifact: body.proofArtifact,
  });
  assertExpectedPublicInputMatches(body, verifiedReceipt);
  return verifiedReceipt;
}

async function verifyPrivatePoolV2ProofArtifactForOperator(body) {
  const circuit = body?.proofArtifact?.circuit;

  if (circuit === actualPrivateSpendProofArtifactCircuit) {
    if (body?.expectedPublicInputs?.shieldPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Actual Private Spend proof artifact verification cannot satisfy expectedPublicInputs.shieldPublicInputHash; use a Shield proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.swapPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Actual Private Spend proof artifact verification cannot satisfy expectedPublicInputs.swapPublicInputHash; use a Swap-to-shielded proof artifact.",
      );
    }

    assertExpectedPublicInputKeyAllowlist(
      body,
      "privateSpendPublicInputHash",
      "Actual Private Spend",
    );

    const verifiedReceipt = await verifyPrivatePoolV2ProofArtifactWithBoundary(body, {
      assertExpectedPublicInputMatches: assertActualPrivateSpendExpectedPublicInputMatches,
      localVerify: verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact,
    });
    return {
      kind: "Private Pool V2 Actual Private Spend proof artifact verification",
      verifiedReceipt,
    };
  }

  if (circuit === shieldProofArtifactCircuit) {
    if (body?.expectedPublicInputs?.sendPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Shield proof artifact verification cannot satisfy expectedPublicInputs.sendPublicInputHash; use a Send proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.claimPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Shield proof artifact verification cannot satisfy expectedPublicInputs.claimPublicInputHash; use a Claim proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.swapPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Shield proof artifact verification cannot satisfy expectedPublicInputs.swapPublicInputHash; use a Swap-to-shielded proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.privateSpendPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Shield proof artifact verification cannot satisfy expectedPublicInputs.privateSpendPublicInputHash; use an Actual Private Spend proof artifact.",
      );
    }

    assertExpectedPublicInputKeyAllowlist(body, "shieldPublicInputHash", "Shield");

    const verifiedReceipt = await verifyPrivatePoolV2ProofArtifactWithBoundary(body, {
      assertExpectedPublicInputMatches: assertShieldExpectedPublicInputMatches,
      localVerify: verifyVantaPrivatePoolV2ShieldProofArtifact,
    });

    return {
      kind: "Private Pool V2 Shield proof artifact verification",
      verifiedReceipt,
    };
  }

  if (circuit === claimProofArtifactCircuit) {
    if (body?.expectedPublicInputs?.shieldPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Claim proof artifact verification cannot satisfy expectedPublicInputs.shieldPublicInputHash; use a Shield proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.swapPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Claim proof artifact verification cannot satisfy expectedPublicInputs.swapPublicInputHash; use a Swap-to-shielded proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.sendPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Claim proof artifact verification cannot satisfy expectedPublicInputs.sendPublicInputHash; use a Send proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.privateSpendPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Claim proof artifact verification cannot satisfy expectedPublicInputs.privateSpendPublicInputHash; use an Actual Private Spend proof artifact.",
      );
    }

    assertExpectedPublicInputKeyAllowlist(body, "claimPublicInputHash", "Claim");

    const verifiedReceipt = await verifyPrivatePoolV2ProofArtifactWithBoundary(body, {
      assertExpectedPublicInputMatches: assertClaimExpectedPublicInputMatches,
      localVerify: verifyVantaPrivatePoolV2ClaimProofArtifact,
    });

    return {
      kind: "Private Pool V2 Claim proof artifact verification",
      verifiedReceipt,
    };
  }

  if (circuit === sendProofArtifactCircuit) {
    if (body?.expectedPublicInputs?.shieldPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Send proof artifact verification cannot satisfy expectedPublicInputs.shieldPublicInputHash; use a Shield proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.swapPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Send proof artifact verification cannot satisfy expectedPublicInputs.swapPublicInputHash; use a Swap-to-shielded proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.privateSpendPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Send proof artifact verification cannot satisfy expectedPublicInputs.privateSpendPublicInputHash; use an Actual Private Spend proof artifact.",
      );
    }

    assertExpectedPublicInputKeyAllowlist(body, "sendPublicInputHash", "Send");

    const verifiedReceipt = await verifyPrivatePoolV2ProofArtifactWithBoundary(body, {
      assertExpectedPublicInputMatches: assertSendExpectedPublicInputMatches,
      localVerify: verifyVantaPrivatePoolV2SendProofArtifact,
    });

    return {
      kind: "Private Pool V2 Send proof artifact verification",
      verifiedReceipt,
    };
  }

  if (circuit === swapToShieldedProofArtifactCircuit) {
    if (body?.expectedPublicInputs?.shieldPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Swap-to-shielded proof artifact verification cannot satisfy expectedPublicInputs.shieldPublicInputHash; use a Shield proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.sendPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Swap-to-shielded proof artifact verification cannot satisfy expectedPublicInputs.sendPublicInputHash; use a Send proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.claimPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Swap-to-shielded proof artifact verification cannot satisfy expectedPublicInputs.claimPublicInputHash; use a Claim proof artifact.",
      );
    }

    if (body?.expectedPublicInputs?.privateSpendPublicInputHash !== undefined) {
      throw new Error(
        "Private Pool v2 Swap-to-shielded proof artifact verification cannot satisfy expectedPublicInputs.privateSpendPublicInputHash; use an Actual Private Spend proof artifact.",
      );
    }

    assertExpectedPublicInputKeyAllowlist(body, "swapPublicInputHash", "Swap-to-shielded");

    const verifiedReceipt = await verifyPrivatePoolV2ProofArtifactWithBoundary(body, {
      assertExpectedPublicInputMatches: assertSwapToShieldedExpectedPublicInputMatches,
      localVerify: verifyVantaPrivatePoolV2SwapToShieldedProofArtifact,
    });

    return {
      kind: "Private Pool V2 Swap-to-shielded proof artifact verification",
      verifiedReceipt,
    };
  }

  throw new Error(
    `Private Pool v2 proof artifact verification does not support circuit ${circuit ?? "missing"}.`,
  );
}

async function ensureProofReceiptReplayGuarded(proofReceipt, sourceRef) {
  const context = replayContextFromReplayKey(proofReceipt?.replayKey);
  const nullifier = nullifierFromReplayKey(proofReceipt?.replayKey);
  if (!context || !nullifier) {
    return null;
  }

  const requestId = `restored:${sourceRef}:${proofReceipt.receiptId ?? nullifier}`;
  const decision = await nullifierReplayGuard.reserve({
    assetId: proofReceipt.assetId ?? "unknown",
    claimReceiptId: proofReceipt.receiptId ?? null,
    context,
    nullifier,
    requestId,
  });

  if (decision.accepted) {
    try {
      await nullifierReplayGuard.markAccepted({
        claimReceiptId: proofReceipt.receiptId ?? requestId,
        context,
        nullifier,
        requestId,
      });
    } catch {
      // Existing durable replay rows still make duplicate replay probes reject.
    }
  }

  return decision;
}

for (const receipt of runtime.verifierRegistry?.receipts ?? []) {
  await ensureProofReceiptReplayGuarded(receipt, "startup-proof-receipt-backfill");
}

function isSolanaTransactionSignature(value) {
  return typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(value);
}

function isBase64SerializedTransaction(value) {
  return typeof value === "string" && /^(?:base64:)?[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length >= 16;
}

function normalizeAmount(value, asset) {
  const normalized = requireNonEmptyString(value, "amount");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error("Settlement amount must be a positive decimal string.");
  }

  const decimals = asset === "SOL" ? 9 : 6;
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Settlement amount exceeds supported ${asset} precision of ${decimals} decimals.`);
  }

  const baseUnits =
    BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0"));
  if (baseUnits <= 0n) {
    throw new Error("Settlement amount must be a positive decimal string.");
  }

  const scale = 10n ** BigInt(decimals);
  const normalizedWhole = (baseUnits / scale).toString(10);
  const normalizedFraction = (baseUnits % scale).toString(10).padStart(decimals, "0");
  const trimmedFraction = normalizedFraction.replace(/0+$/, "");
  const displayFraction =
    trimmedFraction.length === 0
      ? "00"
      : trimmedFraction.padEnd(Math.max(trimmedFraction.length, 2), "0");
  return `${normalizedWhole}.${displayFraction}`;
}

function amountToBaseUnits(amount, asset) {
  const [whole = "0", fraction = ""] = normalizeAmount(amount, asset).split(".");
  const decimals = asset === "SOL" ? 9 : 6;
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(`${whole}${paddedFraction}`);
}

function treeIdForAsset(asset) {
  return hashHex(VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION, "tree", asset).slice(0, 34);
}

function assetIdForAsset(asset) {
  return hashHex(VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION, "asset", asset);
}

function assertMatches(value, expected, message) {
  if (String(value) !== String(expected)) {
    throw new Error(message);
  }
}

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Private Pool v2 settlement requires ${fieldName}.`);
  }

  return value;
}

function optionalNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function hasActualPrivateSendFields(body) {
  return Boolean(
    optionalNonEmptyString(body.acceptedRoot) &&
      optionalNonEmptyString(body.assetCohort) &&
      optionalNonEmptyString(body.poolId) &&
      optionalNonEmptyString(body.privateSpendContextHash) &&
      optionalNonEmptyString(body.outputCommitment),
  );
}

function hasStatefulSendFields(body) {
  const changeOutputCommitment = optionalNonEmptyString(body.changeOutputCommitment);
  const hasNonzeroChangeOutput = Boolean(
    changeOutputCommitment && changeOutputCommitment !== "0",
  );

  return Boolean(
    optionalNonEmptyString(body.assetIdCommitment) &&
      optionalNonEmptyString(body.changeLeafIndex) &&
      changeOutputCommitment &&
      optionalNonEmptyString(body.changeOutputRoot) &&
      optionalNonEmptyString(body.inputRoot) &&
      optionalNonEmptyString(body.inputCommitment) &&
      optionalNonEmptyString(body.outputCommitment) &&
      optionalNonEmptyString(body.outputLeafIndex) &&
      optionalNonEmptyString(body.outputRoot) &&
      optionalNonEmptyString(body.recipientMemoCiphertextBodyHash) &&
      (!hasNonzeroChangeOutput || optionalNonEmptyString(body.changeMemoCiphertextBodyHash)) &&
      optionalNonEmptyString(body.sendContextTag) &&
      optionalNonEmptyString(body.validUntilSlot),
  );
}

function validatePayCheckoutSession(session) {
  if (!session || typeof session !== "object") {
    throw new Error("Private Pool v2 Pay checkout settlement requires session.");
  }

  const currency = requireNonEmptyString(session.currency, "session.currency");
  return {
    amount: normalizeAmount(session.amount, currency),
    clientToken: requireNonEmptyString(session.clientToken, "session.clientToken"),
    currency,
    id: requireNonEmptyString(session.id, "session.id"),
    merchantId: requireNonEmptyString(session.merchantId, "session.merchantId"),
  };
}

function validatePayWithdrawalBody(body) {
  const asset = requireNonEmptyString(body.asset, "asset");
  return {
    amount: normalizeAmount(body.amount, asset),
    asset,
    destination: requireNonEmptyString(body.destination, "destination"),
    merchantId: requireNonEmptyString(body.merchantId, "merchantId"),
  };
}

function validateProtocolSettlementBody(body) {
  const action = requireNonEmptyString(body.action, "action");
  const settlementId = requireNonEmptyString(body.settlementId, "settlementId");
  const economicsMode = body.economicsMode
    ? requireNonEmptyString(body.economicsMode, "economicsMode")
    : "raw-operator-visible";
  if (economicsMode === "committed-economics") {
    if (action !== "shield" && action !== "send" && action !== "swap" && action !== "unshield") {
      throw new Error("Committed economics protocol settlement only supports shield, send, swap, and unshield.");
    }
    for (const rawField of ["amount", "asset", "destination", "owner"]) {
      if (body[rawField] !== undefined && body[rawField] !== null) {
        throw new Error(`Committed economics protocol settlement rejects raw ${rawField}.`);
      }
    }
    if (action === "send" && !hasActualPrivateSendFields(body) && !hasStatefulSendFields(body)) {
      throw new Error(
        "Private Pool v2 settlement requires actual-private send fields or full stateful send terms.",
      );
    }
    if (action === "shield") {
      requireNonEmptyString(body.outputCommitment, "outputCommitment");
    }
    if (action === "swap") {
      requireNonEmptyString(body.inputRoot, "inputRoot");
      requireNonEmptyString(body.inputCommitment, "inputCommitment");
      requireNonEmptyString(body.minOutputAmount, "minOutputAmount");
      requireNonEmptyString(body.outputAmount, "outputAmount");
      requireNonEmptyString(body.outputCommitment, "outputCommitment");
      requireNonEmptyString(body.outputLeafIndex, "outputLeafIndex");
      requireNonEmptyString(body.outputRoot, "outputRoot");
      requireNonEmptyString(body.slippageBps, "slippageBps");
      requireNonEmptyString(body.swapContextTag, "swapContextTag");
      requireNonEmptyString(body.validUntilSlot, "validUntilSlot");
    }
    if (action === "unshield") {
      requireNonEmptyString(body.inputRoot, "inputRoot");
      requireNonEmptyString(body.inputCommitment, "inputCommitment");
      requireNonEmptyString(body.exitTermsCommitment, "exitTermsCommitment");
      requireNonEmptyString(body.proofBoundDestinationCommitment, "proofBoundDestinationCommitment");
      requireNonEmptyString(body.unshieldContextTag, "unshieldContextTag");
    }

    return {
      action,
      acceptedRoot: optionalNonEmptyString(body.acceptedRoot),
      assetIdCommitment:
        typeof body.assetIdCommitment === "string" && body.assetIdCommitment.trim().length > 0
          ? body.assetIdCommitment
          : undefined,
      assetCohort: optionalNonEmptyString(body.assetCohort),
      changeLeafIndex:
        typeof body.changeLeafIndex === "string" && body.changeLeafIndex.trim().length > 0
          ? body.changeLeafIndex
          : undefined,
      changeMemoCiphertextBodyHash: optionalNonEmptyString(body.changeMemoCiphertextBodyHash),
      changeOutputCommitment:
        typeof body.changeOutputCommitment === "string" &&
        body.changeOutputCommitment.trim().length > 0
          ? body.changeOutputCommitment
          : undefined,
      changeOutputRoot:
        typeof body.changeOutputRoot === "string" && body.changeOutputRoot.trim().length > 0
          ? body.changeOutputRoot
          : undefined,
      economicsCommitment: requireNonEmptyString(body.economicsCommitment, "economicsCommitment"),
      economicsMode,
      exitTermsCommitment:
        typeof body.exitTermsCommitment === "string" && body.exitTermsCommitment.trim().length > 0
          ? body.exitTermsCommitment
          : undefined,
      inputRoot:
        typeof body.inputRoot === "string" && body.inputRoot.trim().length > 0
          ? body.inputRoot
          : undefined,
      inputCommitment:
        typeof body.inputCommitment === "string" && body.inputCommitment.trim().length > 0
          ? body.inputCommitment
          : undefined,
      minOutputAmount: optionalNonEmptyString(body.minOutputAmount),
      nullifierOrReplayCommitment: requireNonEmptyString(
        body.nullifierOrReplayCommitment,
        "nullifierOrReplayCommitment",
      ),
      outputAmount: optionalNonEmptyString(body.outputAmount),
      outputCommitment:
        typeof body.outputCommitment === "string" && body.outputCommitment.trim().length > 0
          ? body.outputCommitment
          : undefined,
      outputLeafIndex:
        typeof body.outputLeafIndex === "string" && body.outputLeafIndex.trim().length > 0
          ? body.outputLeafIndex
          : undefined,
      outputRoot:
        typeof body.outputRoot === "string" && body.outputRoot.trim().length > 0
          ? body.outputRoot
          : undefined,
      previousRoot:
        typeof body.previousRoot === "string" && body.previousRoot.trim().length > 0
          ? body.previousRoot
          : undefined,
      ownerCommitment: requireNonEmptyString(body.ownerCommitment, "ownerCommitment"),
      poolId: optionalNonEmptyString(body.poolId),
      privateSpendContextHash: optionalNonEmptyString(body.privateSpendContextHash),
      privateSpendPublicInputHash: optionalNonEmptyString(body.privateSpendPublicInputHash),
      proofBoundDestinationCommitment: optionalNonEmptyString(
        body.proofBoundDestinationCommitment,
      ),
      recipientMemoCiphertextBodyHash: optionalNonEmptyString(body.recipientMemoCiphertextBodyHash),
      relayerSerializedTransaction: optionalNonEmptyString(body.relayerSerializedTransaction),
      routeCommitment: requireNonEmptyString(body.routeCommitment, "routeCommitment"),
      sendContextTag:
        typeof body.sendContextTag === "string" && body.sendContextTag.trim().length > 0
          ? body.sendContextTag
          : undefined,
      sendPublicInputHash:
        typeof body.sendPublicInputHash === "string" &&
        body.sendPublicInputHash.trim().length > 0
          ? body.sendPublicInputHash
          : undefined,
      settlementCommitment: requireNonEmptyString(body.settlementCommitment, "settlementCommitment"),
      slippageBps: optionalNonEmptyString(body.slippageBps),
      swapContextTag:
        typeof body.swapContextTag === "string" && body.swapContextTag.trim().length > 0
          ? body.swapContextTag
          : undefined,
      swapPublicInputHash:
        typeof body.swapPublicInputHash === "string" &&
        body.swapPublicInputHash.trim().length > 0
          ? body.swapPublicInputHash
          : undefined,
      validUntilSlot: optionalNonEmptyString(body.validUntilSlot),
      unshieldContextTag:
        typeof body.unshieldContextTag === "string" && body.unshieldContextTag.trim().length > 0
          ? body.unshieldContextTag
          : undefined,
      unshieldPublicInputHash:
        typeof body.unshieldPublicInputHash === "string" &&
        body.unshieldPublicInputHash.trim().length > 0
          ? body.unshieldPublicInputHash
          : undefined,
      settlementId,
    };
  }

  if (economicsMode !== "raw-operator-visible") {
    throw new Error(`Unknown protocol settlement economics mode ${economicsMode}.`);
  }

  if (action === "send") {
    throw new Error(
      "Private Pool v2 Send protocol settlement requires committed-economics; raw operator-visible Send terms are blocked.",
    );
  }

  const asset = requireNonEmptyString(body.asset, "asset");
  const owner = requireNonEmptyString(body.owner, "owner");
  const shieldCapability = normalizeProtocolShieldCapability(body.shieldCapability, body.asset);
  return {
    action,
    amount: normalizeAmount(body.amount, asset),
    asset,
    destination: requireNonEmptyString(body.destination, "destination"),
    economicsMode,
    owner,
    settlementId,
    shieldCapability,
    shieldSettlementEvidence:
      action === "shield"
        ? normalizeProtocolShieldSettlementEvidence(body.shieldSettlementEvidence, owner, settlementId)
        : undefined,
    shieldRouteEvidence: normalizeProtocolShieldRouteEvidence(
      body.shieldRouteEvidence,
      shieldCapability,
    ),
  };
}

function requireCommitmentHex(value, label) {
  const normalized = requireNonEmptyString(value, label);
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(`Browser committed Shield receipt requires ${label} as a 32-byte hex commitment.`);
  }

  return normalized;
}

function assertOpeningFieldShape(opening, field, tag, length) {
  const preimageParts = opening[field]?.preimageParts;
  if (!Array.isArray(preimageParts) || preimageParts.length !== length || preimageParts[0] !== tag) {
    throw new Error(`Browser committed Shield receipt opening has invalid ${field} preimage shape.`);
  }

  for (const part of preimageParts) {
    if (typeof part !== "string") {
      throw new Error(`Browser committed Shield receipt opening has invalid ${field} preimage part.`);
    }
  }

  return preimageParts;
}

function assertBrowserCommittedShieldOpeningShape(opening) {
  const source = assertOpeningFieldShape(opening, "source", "source", 4);
  const route = assertOpeningFieldShape(opening, "route", "route", 9);
  const output = assertOpeningFieldShape(opening, "output", "output", 5);
  const economics = assertOpeningFieldShape(opening, "economics", "economics", 4);
  const owner = assertOpeningFieldShape(opening, "owner", "owner", 3);
  const replay = assertOpeningFieldShape(opening, "replay", "replay", 3);
  const settlement = assertOpeningFieldShape(opening, "settlement", "settlement", 4);

  if (opening.settlementIdPreimageParts.length !== 1 || !opening.settlementIdPreimageParts[0]) {
    throw new Error("Browser committed Shield receipt opening requires one settlement id preimage.");
  }

  for (const [value, label] of [
    [source[1], "opening.source.sourceAsset"],
    [source[2], "opening.source.sourceMintAddress"],
    [source[3], "opening.source.amount"],
    [route[1], "opening.route.provider"],
    [route[3], "opening.route.sourceAmount"],
    [route[4], "opening.route.sourceAsset"],
    [route[5], "opening.route.sourceMintAddress"],
    [route[6], "opening.route.targetAmount"],
    [route[7], "opening.route.targetAsset"],
    [route[8], "opening.route.targetMintAddress"],
    [output[1], "opening.output.targetAsset"],
    [output[2], "opening.output.targetMintAddress"],
    [output[4], "opening.output.depositSignature"],
    [owner[1], "opening.owner.owner"],
    [owner[2], "opening.owner.vaultOwner"],
  ]) {
    requireNonEmptyString(value, label);
  }

  const rawSettlementId = opening.settlementIdPreimageParts[0];
  if (output[3] !== rawSettlementId || replay[1] !== rawSettlementId || settlement[1] !== rawSettlementId) {
    throw new Error("Browser committed Shield receipt opening settlement ids do not match.");
  }

  if (output[4] !== replay[2]) {
    throw new Error("Browser committed Shield receipt opening deposit signatures do not match.");
  }

  if (source[1] !== route[4] || source[2] !== route[5] || source[3] !== route[3]) {
    throw new Error("Browser committed Shield receipt opening source terms do not match route terms.");
  }

  if (output[1] !== route[7] || output[2] !== route[8]) {
    throw new Error("Browser committed Shield receipt opening output terms do not match route terms.");
  }

  requireCommitmentHex(economics[1], "opening.economics.sourceCommitment");
  requireCommitmentHex(economics[2], "opening.economics.routeCommitment");
  requireCommitmentHex(economics[3], "opening.economics.outputCommitment");
  requireCommitmentHex(settlement[2], "opening.settlement.sourceCommitment");
  requireCommitmentHex(settlement[3], "opening.settlement.outputCommitment");
}

function decimalAmountToBaseUnits(amount, decimals) {
  if (typeof amount !== "string" || !/^\d+(?:\.\d+)?$/.test(amount)) {
    throw new Error("Browser committed Shield receipt deposit evidence requires a decimal amount.");
  }

  const [wholePart, fractionalPart = ""] = amount.split(".");
  if (fractionalPart.length > decimals) {
    throw new Error("Browser committed Shield receipt deposit evidence amount has too many decimals.");
  }

  return BigInt(`${wholePart}${fractionalPart.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "") || "0");
}

function parsedAccountKeyAddress(accountKey) {
  if (typeof accountKey === "string") {
    return accountKey;
  }

  const publicKey = accountKey?.pubkey;
  if (typeof publicKey === "string") {
    return publicKey;
  }

  if (publicKey && typeof publicKey.toBase58 === "function") {
    return publicKey.toBase58();
  }

  return null;
}

function parsedTransactionHasSigner(transaction, signer) {
  const accountKeys = transaction?.transaction?.message?.accountKeys;
  if (!Array.isArray(accountKeys)) {
    return false;
  }

  return accountKeys.some(
    (accountKey) => accountKey?.signer === true && parsedAccountKeyAddress(accountKey) === signer,
  );
}

function readNativeSolTransferLamports(instruction, owner, vaultOwner) {
  const parsed = instruction?.parsed;
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  if (parsed.type !== "transfer") {
    return null;
  }

  if (parsed.info?.source !== owner || parsed.info?.destination !== vaultOwner) {
    return null;
  }

  const lamports = Number(parsed.info?.lamports);
  if (!Number.isSafeInteger(lamports) || lamports <= 0) {
    return null;
  }

  return BigInt(lamports);
}

function readNativeSolDepositTransferLamports(transaction, owner, vaultOwner) {
  const instructions = transaction?.transaction?.message?.instructions;
  if (!Array.isArray(instructions)) {
    return null;
  }

  return instructions
    .map((instruction) => readNativeSolTransferLamports(instruction, owner, vaultOwner))
    .find((lamports) => typeof lamports === "bigint") ?? null;
}

async function assertBrowserShieldDepositEvidence(opening) {
  if (browserShieldDepositEvidenceMode !== "required") {
    return;
  }

  const source = opening.source.preimageParts;
  const output = opening.output.preimageParts;
  const owner = opening.owner.preimageParts;
  const sourceAsset = source[1];
  const sourceMintAddress = source[2];
  const amount = source[3];
  const depositSignature = output[4];
  const ownerAddress = owner[1];
  const vaultOwner = owner[2];
  const nativeSolMints = new Set(["SOL", "So11111111111111111111111111111111111111112"]);

  if (sourceAsset !== "SOL" && !nativeSolMints.has(sourceMintAddress)) {
    throw new Error("Browser committed Shield receipt currently requires native SOL deposit evidence.");
  }

  const connection = new Connection(browserShieldDepositEvidenceRpcUrl, "confirmed");
  const transaction = await connection.getParsedTransaction(depositSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!transaction) {
    throw new Error("Browser committed Shield receipt deposit signature was not found on Solana.");
  }

  if (transaction.meta?.err) {
    throw new Error("Browser committed Shield receipt deposit transaction failed on Solana.");
  }

  if (!parsedTransactionHasSigner(transaction, ownerAddress)) {
    throw new Error("Browser committed Shield receipt deposit transaction signer does not match owner.");
  }

  const expectedLamports = decimalAmountToBaseUnits(amount, 9);
  if (expectedLamports <= 0n || expectedLamports > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Browser committed Shield receipt deposit amount is outside native SOL bounds.");
  }

  const transferLamports = readNativeSolDepositTransferLamports(
    transaction,
    ownerAddress,
    vaultOwner,
  );
  if (transferLamports !== expectedLamports) {
    throw new Error("Browser committed Shield receipt deposit transfer does not match owner, vault, and amount.");
  }
}

async function validateBrowserShieldReceiptBody(body) {
  if (!body || typeof body !== "object" || !body.request || !body.opening) {
    throw new Error("Browser committed Shield receipt route requires a committed Shield request and opening.");
  }

  if (typeof body.request !== "object" || Array.isArray(body.request)) {
    throw new Error("Browser committed Shield receipt route requires request to be an object.");
  }

  const allowedRequestFields = new Set([
    "action",
    "economicsCommitment",
    "economicsMode",
    "nullifierOrReplayCommitment",
    "outputCommitment",
    "ownerCommitment",
    "routeCommitment",
    "settlementCommitment",
    "settlementId",
  ]);
  for (const field of Object.keys(body.request)) {
    if (!allowedRequestFields.has(field)) {
      throw new Error(`Browser committed Shield receipt route rejects request.${field}.`);
    }
  }

  const forbiddenFields = [
    "amount",
    "asset",
    "destination",
    "owner",
    "shieldCapability",
    "shieldSettlementEvidence",
    "shieldRouteEvidence",
    "inputRoot",
    "exitTermsCommitment",
    "swapContextTag",
    "sendContextTag",
    "unshieldContextTag",
    "relayerSerializedTransaction",
  ];
  for (const field of forbiddenFields) {
    if (body.request[field] !== undefined && body.request[field] !== null) {
      throw new Error(`Browser committed Shield receipt route rejects ${field}.`);
    }
  }

  if (body.request.action !== "shield" || body.request.economicsMode !== "committed-economics") {
    throw new Error("Browser receipt route only accepts committed Shield receipt requests.");
  }

  const settlementRequest = validateProtocolSettlementBody(body.request);

  for (const field of [
    "economicsCommitment",
    "nullifierOrReplayCommitment",
    "outputCommitment",
    "ownerCommitment",
    "routeCommitment",
    "settlementCommitment",
    "settlementId",
  ]) {
    requireCommitmentHex(body.request[field], `request.${field}`);
  }

  const opening = parseVantaShieldCommittedEconomicsSettlementOpening(body.opening);
  assertBrowserCommittedShieldOpeningShape(opening);
  await assertBrowserShieldDepositEvidence(opening);

  if (
    !verifyVantaShieldCommittedEconomicsSettlementOpening({
      opening,
      request: settlementRequest,
    })
  ) {
    throw new Error("Browser committed Shield receipt opening does not match the committed Shield request.");
  }

  return settlementRequest;
}

function normalizeProtocolShieldCapability(rawCapability, fallbackAsset) {
  if (!rawCapability) {
    return {
      blockers: [],
      mode: fallbackAsset === "SOL" ? "direct-native-sol" : "direct-configured-token",
      requiresPublicRoute: false,
      sourceAsset: {
        mintAddress: fallbackAsset,
        symbol: fallbackAsset,
      },
      supportsDirectShield: true,
      targetShieldAsset: {
        assetKey: fallbackAsset,
        label: `Shielded ${fallbackAsset}`,
        mintAddress: fallbackAsset,
        name: fallbackAsset,
      },
    };
  }

  const sourceAsset = rawCapability.sourceAsset;
  const targetShieldAsset = rawCapability.targetShieldAsset;

  return {
    blockers: Array.isArray(rawCapability.blockers) ? rawCapability.blockers.map(String) : [],
    mode: requireNonEmptyString(rawCapability.mode, "shieldCapability.mode"),
    requiresPublicRoute: Boolean(rawCapability.requiresPublicRoute),
    sourceAsset: {
      mintAddress: requireNonEmptyString(
        sourceAsset?.mintAddress,
        "shieldCapability.sourceAsset.mintAddress",
      ),
      symbol: requireNonEmptyString(sourceAsset?.symbol, "shieldCapability.sourceAsset.symbol"),
    },
    supportsDirectShield: Boolean(rawCapability.supportsDirectShield),
    targetShieldAsset: {
      assetKey: requireNonEmptyString(
        targetShieldAsset?.assetKey,
        "shieldCapability.targetShieldAsset.assetKey",
      ),
      label: requireNonEmptyString(
        targetShieldAsset?.label,
        "shieldCapability.targetShieldAsset.label",
      ),
      mintAddress: requireNonEmptyString(
        targetShieldAsset?.mintAddress,
        "shieldCapability.targetShieldAsset.mintAddress",
      ),
      name: requireNonEmptyString(
        targetShieldAsset?.name,
        "shieldCapability.targetShieldAsset.name",
      ),
    },
  };
}

function normalizeProtocolShieldRouteEvidence(rawEvidence, shieldCapability) {
  if (!shieldCapability.requiresPublicRoute) {
    return null;
  }

  if (!rawEvidence) {
    throw new Error("Private Pool v2 routed shield settlement requires shieldRouteEvidence.");
  }

  const targetAsset = requireNonEmptyString(rawEvidence.targetAsset, "shieldRouteEvidence.targetAsset");
  assertMatches(
    targetAsset,
    shieldCapability.targetShieldAsset.assetKey,
    "Routed shield evidence target asset conflicts with shield capability target.",
  );
  const sourceAsset =
    typeof rawEvidence.sourceAsset === "string" && rawEvidence.sourceAsset.trim().length > 0
      ? rawEvidence.sourceAsset
      : undefined;
  if (sourceAsset) {
    assertMatches(
      sourceAsset,
      shieldCapability.sourceAsset.symbol,
      "Routed shield evidence source asset conflicts with shield capability source.",
    );
  }
  const sourceMintAddress =
    typeof rawEvidence.sourceMintAddress === "string" &&
    rawEvidence.sourceMintAddress.trim().length > 0
      ? rawEvidence.sourceMintAddress
      : undefined;
  if (sourceMintAddress) {
    assertMatches(
      sourceMintAddress,
      shieldCapability.sourceAsset.mintAddress,
      "Routed shield evidence source mint conflicts with shield capability source.",
    );
  }
  const targetMintAddress =
    typeof rawEvidence.targetMintAddress === "string" &&
    rawEvidence.targetMintAddress.trim().length > 0
      ? rawEvidence.targetMintAddress
      : undefined;
  if (targetMintAddress) {
    assertMatches(
      targetMintAddress,
      shieldCapability.targetShieldAsset.mintAddress,
      "Routed shield evidence target mint conflicts with shield capability target.",
    );
  }

  return {
    provider: requireNonEmptyString(rawEvidence.provider, "shieldRouteEvidence.provider"),
    routeSignature: requireNonEmptyString(
      rawEvidence.routeSignature,
      "shieldRouteEvidence.routeSignature",
    ),
    sourceAmount:
      typeof rawEvidence.sourceAmount === "string" && rawEvidence.sourceAmount.trim().length > 0
        ? normalizeAmount(rawEvidence.sourceAmount, rawEvidence.sourceAsset ?? shieldCapability.sourceAsset.symbol)
        : undefined,
    sourceAsset,
    sourceMintAddress,
    targetAmount: normalizeAmount(rawEvidence.targetAmount, targetAsset),
    targetAsset,
    targetMintAddress,
  };
}

function normalizeProtocolShieldSettlementEvidence(rawEvidence, owner, settlementId) {
  if (!rawEvidence) {
    throw new Error("Private Pool v2 shield settlement requires shieldSettlementEvidence.");
  }

  const stateSignature = requireNonEmptyString(
    rawEvidence.stateSignature,
    "shieldSettlementEvidence.stateSignature",
  );
  assertMatches(
    stateSignature,
    settlementId,
    "Shield settlement state signature conflicts with settlement id.",
  );

  const evidenceOwner = requireNonEmptyString(rawEvidence.owner, "shieldSettlementEvidence.owner");
  assertMatches(evidenceOwner, owner, "Shield settlement owner evidence conflicts with owner.");

  return {
    depositSignature: requireNonEmptyString(
      rawEvidence.depositSignature,
      "shieldSettlementEvidence.depositSignature",
    ),
    owner: evidenceOwner,
    stateSignature,
    vaultOwner: requireNonEmptyString(rawEvidence.vaultOwner, "shieldSettlementEvidence.vaultOwner"),
  };
}

function assertPayCheckoutReplayMatches(existingSettlement, session, amount, asset) {
  const existingReceipt = existingSettlement.privateRailReceipt;

  assertMatches(
    existingReceipt?.amount,
    amount,
    `Pay checkout settlement ${String(session.id)} conflicts with an existing settlement amount.`,
  );
  assertMatches(
    existingReceipt?.asset,
    asset,
    `Pay checkout settlement ${String(session.id)} conflicts with an existing settlement asset.`,
  );
  assertMatches(
    existingReceipt?.checkoutSessionId,
    session.id,
    `Pay checkout settlement ${String(session.id)} conflicts with an existing settlement session.`,
  );
  assertMatches(
    existingSettlement.settlementFingerprint,
    hashHex(
      "pay-checkout-settlement",
      session.id,
      session.clientToken,
      session.merchantId,
      amount,
      asset,
    ),
    `Pay checkout settlement ${String(session.id)} conflicts with existing settlement inputs.`,
  );
}

function protocolSettlementFingerprint({
  action,
  amount,
  acceptedRoot,
  assetIdCommitment,
  assetCohort,
  asset,
  changeLeafIndex,
  changeMemoCiphertextBodyHash,
  changeOutputCommitment,
  changeOutputRoot,
  destination,
  economicsCommitment,
  economicsMode,
  exitTermsCommitment,
  inputRoot,
  inputCommitment,
  minOutputAmount,
  nullifierOrReplayCommitment,
  outputAmount,
  outputCommitment,
  outputLeafIndex,
  outputRoot,
  previousRoot,
  owner,
  ownerCommitment,
  poolId,
  privateSpendContextHash,
  privateSpendPublicInputHash,
  proofBoundDestinationCommitment,
  recipientMemoCiphertextBodyHash,
  relayerSerializedTransaction,
  routeCommitment,
  sendContextTag,
  sendPublicInputHash,
  settlementId,
  settlementCommitment,
  slippageBps,
  swapContextTag,
  swapPublicInputHash,
  validUntilSlot,
  unshieldContextTag,
  unshieldPublicInputHash,
  shieldCapability,
  shieldSettlementEvidence,
  shieldRouteEvidence,
}) {
  if ((economicsMode ?? "raw-operator-visible") === "raw-operator-visible") {
    return hashHex(
      "protocol-settlement",
      action,
      settlementId,
      destination,
      owner,
      amount,
      asset,
      shieldCapability?.mode ?? "",
      shieldCapability?.sourceAsset?.mintAddress ?? "",
      shieldCapability?.targetShieldAsset?.assetKey ?? "",
      shieldCapability?.targetShieldAsset?.mintAddress ?? "",
      shieldSettlementEvidence?.depositSignature ?? "",
      shieldSettlementEvidence?.owner ?? "",
      shieldSettlementEvidence?.stateSignature ?? "",
      shieldSettlementEvidence?.vaultOwner ?? "",
      shieldRouteEvidence?.provider ?? "",
      shieldRouteEvidence?.routeSignature ?? "",
      shieldRouteEvidence?.sourceAmount ?? "",
      shieldRouteEvidence?.sourceAsset ?? "",
      shieldRouteEvidence?.sourceMintAddress ?? "",
      shieldRouteEvidence?.targetAmount ?? "",
      shieldRouteEvidence?.targetAsset ?? "",
      shieldRouteEvidence?.targetMintAddress ?? "",
    );
  }

  return hashHex(
    "protocol-settlement",
    action,
    settlementId,
    economicsMode,
    acceptedRoot,
    assetIdCommitment,
    assetCohort,
    changeLeafIndex,
    changeMemoCiphertextBodyHash,
    changeOutputCommitment,
    changeOutputRoot,
    economicsCommitment,
    exitTermsCommitment,
    inputRoot,
    inputCommitment,
    minOutputAmount,
    nullifierOrReplayCommitment,
    outputAmount,
    outputCommitment,
    outputLeafIndex,
    outputRoot,
    previousRoot,
    ownerCommitment,
    poolId,
    privateSpendContextHash,
    privateSpendPublicInputHash,
    proofBoundDestinationCommitment,
    recipientMemoCiphertextBodyHash,
    relayerSerializedTransaction ? hashHex("relayer-serialized-transaction", relayerSerializedTransaction) : "",
    routeCommitment,
    sendContextTag,
    sendPublicInputHash,
    settlementCommitment,
    slippageBps,
    swapContextTag,
    swapPublicInputHash,
    validUntilSlot,
    unshieldContextTag,
    unshieldPublicInputHash,
  );
}

function assertProtocolReplayMatches(
  existingSettlement,
  {
    destination,
    acceptedRoot,
    economicsCommitment,
    economicsMode,
    exitTermsCommitment,
    assetIdCommitment,
    assetCohort,
    changeLeafIndex,
    changeMemoCiphertextBodyHash,
    changeOutputCommitment,
    changeOutputRoot,
    inputRoot,
    inputCommitment,
    nullifierOrReplayCommitment,
    outputCommitment,
    outputLeafIndex,
    outputRoot,
    previousRoot,
    owner,
    ownerCommitment,
    poolId,
    privateSpendContextHash,
    privateSpendPublicInputHash,
    proofBoundDestinationCommitment,
    recipientMemoCiphertextBodyHash,
    relayerSerializedTransaction,
    routeCommitment,
    sendContextTag,
    sendPublicInputHash,
    settlementCommitment,
    swapContextTag,
    swapPublicInputHash,
    validUntilSlot,
    unshieldContextTag,
    unshieldPublicInputHash,
    shieldCapability,
    shieldSettlementEvidence,
    shieldRouteEvidence,
  },
  action,
  amount,
  asset,
  settlementId,
) {
  const existingReceipt = existingSettlement.protocolSettlementReceipt;

  assertMatches(
    existingReceipt?.amount,
    amount,
    `Protocol settlement ${settlementId} conflicts with an existing settlement amount.`,
  );
  assertMatches(
    existingReceipt?.asset,
    asset,
    `Protocol settlement ${settlementId} conflicts with an existing settlement asset.`,
  );
  assertMatches(
    existingReceipt?.economicsMode ?? "raw-operator-visible",
    economicsMode ?? "raw-operator-visible",
    `Protocol settlement ${settlementId} conflicts with an existing settlement economics mode.`,
  );
  assertMatches(
    existingReceipt?.action,
    action,
    `Protocol settlement ${settlementId} conflicts with an existing settlement action.`,
  );
  assertMatches(
    existingReceipt?.settlementId,
    settlementId,
    `Protocol settlement ${settlementId} conflicts with an existing settlement id.`,
  );
  assertMatches(
    existingSettlement.settlementFingerprint,
    protocolSettlementFingerprint({
      action,
      amount,
      acceptedRoot,
      assetIdCommitment,
      assetCohort,
      asset,
      changeLeafIndex,
      changeMemoCiphertextBodyHash,
      changeOutputCommitment,
      changeOutputRoot,
      destination,
      economicsCommitment,
      economicsMode,
      exitTermsCommitment,
      inputRoot,
      inputCommitment,
      nullifierOrReplayCommitment,
      outputCommitment,
      outputLeafIndex,
      outputRoot,
      previousRoot,
      owner,
      ownerCommitment,
      poolId,
      privateSpendContextHash,
      privateSpendPublicInputHash,
      recipientMemoCiphertextBodyHash,
      relayerSerializedTransaction,
      routeCommitment,
      sendContextTag,
      sendPublicInputHash,
      settlementId,
      settlementCommitment,
      swapContextTag,
      swapPublicInputHash,
      validUntilSlot,
      unshieldContextTag,
      unshieldPublicInputHash,
      shieldCapability,
      shieldSettlementEvidence,
      shieldRouteEvidence,
    }),
    `Protocol settlement ${settlementId} conflicts with existing settlement inputs.`,
  );
}

function assertPayWithdrawalReplayMatches(existingSettlement, body, amount, asset, destination, merchantId) {
  const existingReceipt = existingSettlement.privateExitReceipt;

  assertMatches(
    existingReceipt?.amount,
    amount,
    `Pay withdrawal settlement for ${destination} conflicts with an existing settlement amount.`,
  );
  assertMatches(
    existingReceipt?.asset,
    asset,
    `Pay withdrawal settlement for ${destination} conflicts with an existing settlement asset.`,
  );
  assertMatches(
    existingReceipt?.destination,
    destination,
    `Pay withdrawal settlement for ${destination} conflicts with an existing settlement destination.`,
  );
  assertMatches(
    existingSettlement.settlementFingerprint,
    hashHex("pay-withdrawal-settlement", merchantId, destination, amount, asset),
    `Pay withdrawal settlement for ${destination} conflicts with existing settlement inputs.`,
  );
}

function hashLeaf(record) {
  return hashHex(
    "sha256-append-only-private-pool-v2-local-indexer-0.1",
    "leaf",
    record.treeId,
    String(record.leafIndex),
    record.assetId,
    record.commitment,
  );
}

function hashNode(treeId, depth, left, right) {
  return hashHex(
    "sha256-append-only-private-pool-v2-local-indexer-0.1",
    "node",
    treeId,
    String(depth),
    left,
    right,
  );
}

function emptyRoot(treeId) {
  return hashHex("sha256-append-only-private-pool-v2-local-indexer-0.1", "empty-root", treeId);
}

function merkleRootFor(treeId, records) {
  if (records.length === 0) {
    return emptyRoot(treeId);
  }

  let layer = records.map((record) => hashLeaf(record));
  let depth = 0;

  while (layer.length > 1) {
    const nextLayer = [];

    for (let index = 0; index < layer.length; index += 2) {
      const left = layer[index];
      const right = layer[index + 1] ?? left;
      nextLayer.push(hashNode(treeId, depth, left, right));
    }

    layer = nextLayer;
    depth += 1;
  }

  return layer[0] ?? emptyRoot(treeId);
}

function readPublicInput(proofRequest, prefix) {
  const input = proofRequest.publicInputs.find((candidate) => candidate.startsWith(prefix));
  return input?.slice(prefix.length) ?? null;
}

function commitmentFromShieldRequest(proofRequest) {
  if (proofRequest.intent !== "shield") {
    return null;
  }

  const assetId = readPublicInput(proofRequest, "target-asset:") ?? proofRequest.assetId;
  const commitment = readPublicInput(proofRequest, "output-commitment:");
  const leafIndex = readPublicInput(proofRequest, "leaf-index:");
  const merkleRoot = readPublicInput(proofRequest, "output-root:");
  const treeId = readPublicInput(proofRequest, "tree-id:");

  if (!assetId || !commitment || !leafIndex || !merkleRoot || !treeId) {
    return null;
  }

  return {
    assetId,
    commitment,
    leafIndex: Number(leafIndex),
    merkleRoot,
    treeId,
  };
}

function commitmentsFromStatefulRequest(proofRequest) {
  if (proofRequest.intent !== "private-send" && proofRequest.intent !== "swap-to-shielded") {
    return [];
  }

  const inputCommitment = readPublicInput(proofRequest, "input-commitment:");
  const inputRecord = persistedCommitments.find(
    (commitment) => commitment.commitment === inputCommitment,
  );
  if (!inputRecord) {
    return [];
  }

  if (proofRequest.intent === "private-send") {
    const recipientOutputCommitment = readPublicInput(proofRequest, "recipient-output-commitment:");
    const recipientLeafIndex = readPublicInput(proofRequest, "recipient-leaf-index:");
    const recipientOutputRoot = readPublicInput(proofRequest, "recipient-output-root:");
    const changeOutputCommitment = readPublicInput(proofRequest, "change-output-commitment:");
    const changeLeafIndex = readPublicInput(proofRequest, "change-leaf-index:");
    const changeOutputRoot = readPublicInput(proofRequest, "change-output-root:");

    if (
      !recipientOutputCommitment ||
      !recipientLeafIndex ||
      !recipientOutputRoot ||
      !changeOutputCommitment ||
      !changeLeafIndex ||
      !changeOutputRoot
    ) {
      return [];
    }

    return [
      {
        assetId: inputRecord.assetId,
        commitment: recipientOutputCommitment,
        leafIndex: Number(recipientLeafIndex),
        merkleRoot: recipientOutputRoot,
        treeId: inputRecord.treeId,
      },
      {
        assetId: inputRecord.assetId,
        commitment: changeOutputCommitment,
        leafIndex: Number(changeLeafIndex),
        merkleRoot: changeOutputRoot,
        treeId: inputRecord.treeId,
      },
    ];
  }

  const outputCommitment = readPublicInput(proofRequest, "output-commitment:");
  const outputLeafIndex = readPublicInput(proofRequest, "output-leaf-index:");
  const outputRoot = readPublicInput(proofRequest, "output-root:");
  if (!outputCommitment || !outputLeafIndex || !outputRoot) {
    return [];
  }

  return [
    {
      assetId: inputRecord.assetId,
      commitment: outputCommitment,
      leafIndex: Number(outputLeafIndex),
      merkleRoot: outputRoot,
      treeId: inputRecord.treeId,
    },
  ];
}

function nullifiersFromReceipts(receipts) {
  return receipts
    .map((receipt) => {
      for (const prefix of ["claim:", "private-send:", "swap-to-shielded:", "unshield:"]) {
        if (receipt.replayKey.startsWith(prefix)) {
          return {
            context:
              prefix === "private-send:"
                ? "private-pool-v2-private-send"
                : prefix === "swap-to-shielded:"
                  ? "private-pool-v2-swap-to-shielded"
                  : prefix === "unshield:"
                    ? "private-pool-v2-unshield"
                    : "private-pool-v2-claim",
            intent: prefix.slice(0, -1),
            nullifier: receipt.replayKey.slice(prefix.length),
            spentAtSlot: receipt.recordedAtSlot,
          };
        }
      }
      return null;
    })
    .filter(Boolean);
}

function shadowCommitmentsFromReceipts(receipts) {
  return receipts
    .map((receipt) => receipt.shadowCommitments)
    .filter(Boolean);
}

async function persistReceipts(acceptedRequest) {
  const receipts = runtime.verifierRegistry?.receipts ?? [];
  const acceptedCommitments = [
    commitmentFromShieldRequest(acceptedRequest),
    ...commitmentsFromStatefulRequest(acceptedRequest),
  ].filter(Boolean);

  for (const acceptedCommitment of acceptedCommitments) {
    if (
      !persistedCommitments.some(
        (commitment) =>
          commitment.treeId === acceptedCommitment.treeId &&
          commitment.leafIndex === acceptedCommitment.leafIndex &&
          commitment.commitment === acceptedCommitment.commitment,
      )
    ) {
      persistedCommitments.push(acceptedCommitment);
    }
  }

  await receiptStore.save({
    commitments: persistedCommitments,
    nullifiers: nullifiersFromReceipts(receipts),
    paySettlements: paySettlementReceipts,
    protocolSettlements: protocolSettlementReceipts,
    receipts,
    settlementPolicy,
  });
}

async function enforceClaimNullifierPreflight(request, requestId) {
  const context = proofRequestReplayContext(request);
  if (!context) {
    return;
  }

  const nullifier = replayNullifierFromProofRequest(request);
  if (!nullifier) {
    throw new Error("Private-pool proof requires a nullifier replay guard input.");
  }

  const decision = await nullifierReplayGuard.check({
    context,
    nullifier,
    requestId,
  });

  if (!decision.accepted) {
    throw new Error(`Private-pool nullifier replay rejected: ${decision.reason}.`);
  }
}

async function reserveAcceptedClaimNullifier(request, requestId) {
  const context = proofRequestReplayContext(request);
  if (!context) {
    return null;
  }

  const nullifier = replayNullifierFromProofRequest(request);
  if (!nullifier) {
    throw new Error("Accepted private-pool proof requires a nullifier replay guard input.");
  }

  const assetId = request.assetId ?? readProofRequestInput(request, "asset-id:") ?? "unknown";
  const decision = await nullifierReplayGuard.reserve({
    assetId,
    context,
    nullifier,
    requestId,
  });

  if (!decision.accepted) {
    throw new Error(`Private-pool nullifier replay rejected: ${decision.reason}.`);
  }

  return decision;
}

async function recordAcceptedClaimNullifier(request, requestId, claimReceiptId) {
  const context = proofRequestReplayContext(request);
  if (!context) {
    return null;
  }

  const nullifier = replayNullifierFromProofRequest(request);
  if (!nullifier) {
    throw new Error("Accepted private-pool proof requires a nullifier replay guard input.");
  }

  return await nullifierReplayGuard.markAccepted({
    claimReceiptId,
    context,
    nullifier,
    requestId,
  });
}

async function checkProofRequestNullifierReplay(request, requestId) {
  const context = proofRequestReplayContext(request);
  if (!context) {
    throw new Error("Private-pool replay check requires a guarded proof intent.");
  }

  const nullifier = replayNullifierFromProofRequest(request);
  if (!nullifier) {
    throw new Error("Private-pool replay check requires a nullifier replay guard input.");
  }

  const before = await nullifierReplayGuard.snapshot();
  const decision = await nullifierReplayGuard.check({
    context,
    nullifier,
    requestId,
  });
  const after = await nullifierReplayGuard.snapshot();

  return {
    accepted: decision.accepted,
    context,
    decision,
    kind: "Private Pool V2 nullifier replay check",
    mutated: serializeReplayGuardSnapshot(before) !== serializeReplayGuardSnapshot(after),
    nullifierRef: `nullifier:${hashHex("nullifier-replay-check-ref", context, nullifier).slice(2, 18)}`,
    requestId,
  };
}

function actualPrivateSpendSolanaExpectedAccounts(expectedPublicInputs = {}) {
  const expectedAccounts = {
    nullifierSet: process.env.VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET,
    operatorAuthority:
      process.env.VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET ??
      process.env.VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OPERATOR_AUTHORITY,
    outputQueue: process.env.VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE,
    poolState: process.env.VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE,
    programId: process.env.VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID,
    relayerFeePayer:
      process.env.VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET ??
      process.env.VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OPERATOR_AUTHORITY,
    rootHistory: process.env.VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_ROOT_HISTORY,
    systemProgram: process.env.VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_SYSTEM_PROGRAM,
  };

  if (
    expectedAccounts.programId &&
    expectedAccounts.poolState &&
    (expectedPublicInputs.nullifier || expectedPublicInputs.nullifierOrReplayCommitment)
  ) {
    expectedAccounts.nullifierMarker = deriveVantaPrivatePoolV2NullifierMarkerAddress({
      nullifierHex: expectedPublicInputs.nullifier ?? expectedPublicInputs.nullifierOrReplayCommitment,
      poolState: expectedAccounts.poolState,
      programId: expectedAccounts.programId,
    });
  }
  if (
    expectedAccounts.programId &&
    expectedAccounts.poolState &&
    expectedPublicInputs.privateSpendPublicInputHash
  ) {
    expectedAccounts.outputRecord = deriveVantaPrivatePoolV2OutputRecordAddress({
      poolState: expectedAccounts.poolState,
      programId: expectedAccounts.programId,
      publicInputHashHex: expectedPublicInputs.privateSpendPublicInputHash,
    });
  }

  return Object.fromEntries(
    Object.entries(expectedAccounts).filter(([, value]) => typeof value === "string" && value.trim().length > 0),
  );
}

function assertActualPrivateSpendSolanaExpectedAccounts(expectedAccounts) {
  const missing = [
    "programId",
    "poolState",
    "nullifierSet",
    "nullifierMarker",
    "outputQueue",
    "outputRecord",
    "rootHistory",
    "relayerFeePayer",
  ].filter((field) => !expectedAccounts[field]);

  if (missing.length > 0) {
    throw new Error(
      `Actual-private live relayer submission requires expected Solana spend account refs: ${missing.join(", ")}.`,
    );
  }
}

function actualPrivateSpendSolanaExpectedPublicInputs({
  acceptedRoot,
  action,
  changeOutputCommitment,
  economicsMode,
  nullifierOrReplayCommitment,
  outputCommitment,
  privateSpendPublicInputHash,
  sendPublicInputHash,
}) {
  const resolvedPublicInputHash = privateSpendPublicInputHash || sendPublicInputHash;
  if (
    action !== "send" ||
    economicsMode !== "committed-economics" ||
    !acceptedRoot ||
    !nullifierOrReplayCommitment ||
    !outputCommitment ||
    !changeOutputCommitment ||
    !resolvedPublicInputHash
  ) {
    return null;
  }

  return {
    acceptedRoot,
    changeOutputCommitment,
    nullifierOrReplayCommitment,
    outputCommitment,
    privateSpendPublicInputHash: resolvedPublicInputHash,
  };
}

function validateActualPrivateSpendRelayerSerializedTransaction({
  expectedPublicInputs,
  relayerSerializedTransaction,
}) {
  if (!relayerSerializedTransaction) {
    return null;
  }

  const expectedAccounts = actualPrivateSpendSolanaExpectedAccounts(expectedPublicInputs);
  const requireExpectedAccounts =
    process.env.VANTA_PRIVATE_POOL_V2_REQUIRE_RELAYER_SERIALIZED_TRANSACTION === "true";
  if (requireExpectedAccounts) {
    assertActualPrivateSpendSolanaExpectedAccounts(expectedAccounts);
  }

  return validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction({
    expectedAccounts,
    expectedPublicInputs,
    requireExpectedAccounts,
    requireExpectedPublicInputs: true,
    serializedTransaction: relayerSerializedTransaction,
  });
}

async function submitActualPrivateSpendToRelayer({
  expectedPublicInputs,
  proofReceipt,
  protocolSettlementReceipt,
  relayerSerializedTransaction,
  request,
}) {
  if (request.intent !== "private-send" || typeof runtime.relayer?.submitPrivateSpend !== "function") {
    return null;
  }

  if (process.env.VANTA_PRIVATE_POOL_V2_REQUIRE_RELAYER_SERIALIZED_TRANSACTION === "true") {
    if (!isBase64SerializedTransaction(relayerSerializedTransaction)) {
      throw new Error("Actual-private live relayer submission requires relayerSerializedTransaction base64 bytes.");
    }
  }

  const expectedAccounts = actualPrivateSpendSolanaExpectedAccounts(expectedPublicInputs);
  if (relayerSerializedTransaction) {
    validateActualPrivateSpendRelayerSerializedTransaction({
      expectedPublicInputs,
      relayerSerializedTransaction,
    });
  }

  const submission = await runtime.relayer.submitPrivateSpend({
    expectedAccounts,
    expectedPublicInputs,
    proofReceiptId: protocolSettlementReceipt.proofReceiptId,
    publicInputCommitment: proofReceipt.publicInputCommitment,
    serializedTransaction:
      relayerSerializedTransaction ??
      JSON.stringify({
        action: protocolSettlementReceipt.action,
        proofReceiptPublicInputCommitment: protocolSettlementReceipt.proofReceiptPublicInputCommitment,
        settlementCommitment: protocolSettlementReceipt.settlementCommitment,
        settlementId: protocolSettlementReceipt.settlementId,
      }),
    settlementId: protocolSettlementReceipt.settlementId,
  });
  const solanaSignatureAccepted = isSolanaTransactionSignature(submission.signature);
  if (process.env.VANTA_PRIVATE_POOL_V2_REQUIRE_RELAYER_SERIALIZED_TRANSACTION === "true" && !solanaSignatureAccepted) {
    throw new Error("Actual-private live relayer submission did not return a Solana transaction signature.");
  }

  return {
    relayerId: submission.relayerId,
    signature: submission.signature,
    submittedBy: submission.submittedBy,
    solanaSignatureAccepted,
  };
}

async function statusPayload() {
  const anonymitySetReadiness = createVantaPrivatePoolV2AnonymitySetReadiness();
  const readiness = runtime.readiness();
  const receipts = runtime.verifierRegistry?.receipts ?? [];
  const shadowCommitments = shadowCommitmentsFromReceipts(receipts);
  const guardedNullifiers = await nullifierReplayGuard.snapshot();
  const acceptedGuardedNullifiers = guardedNullifiers.filter((record) => record.status === "accepted");
  const reservedGuardedNullifiers = guardedNullifiers.filter((record) => record.status !== "accepted");

  return {
    contractVersion: runtime.contractVersion,
    kind: "Private Pool V2 operator status",
    anonymitySetReadiness,
    ok: readiness.ready,
    operatorEconomicsExposure: {
      committedSettlementCount: protocolSettlementReceipts.filter(
        (settlement) =>
          settlement.protocolSettlementReceipt?.economicsMode === "committed-economics",
      ).length,
      hiddenEconomicsActions: ["shield", "send", "swap", "unshield"],
      legacyRawPaySettlementEndpointEnabled: allowLegacyPaySettlements,
      operatorStillSeesRawActions: ["raw-shield", "raw-unshield", "swap"],
      rawSettlementCount: protocolSettlementReceipts.filter(
        (settlement) =>
          (settlement.protocolSettlementReceipt?.economicsMode ?? "raw-operator-visible") ===
          "raw-operator-visible",
      ).length,
    },
    productionReady: false,
    protocolActionProofModes,
    proofTrustBoundary: proofTrustBoundaryPayload(),
    readiness,
    receiptCount: receipts.length,
    receiptStorePath: receiptStore.path,
    sendDiscoveryHandoff: {
      blockerIds: [
        "send-memo-indexer-body-hash-handoff-not-deployed",
      ],
      claimBoundary:
        "local encrypted-view-tag index only; not production recipient discovery",
      freshV2OnlyClaimScoped: true,
      indexerEndpoint: "/v1/send-discovery-packets",
      legacyHistoryScope: {
        freshV2OnlyClaimScoped: true,
        legacyV1EligibleForProductionPrivacyClaims: false,
        legacyV1ParseCompatible: true,
        migrated: false,
        productionReady: false,
        scopeBoundary:
          "production Send privacy claims are scoped to fresh v2 AEAD sends unless legacy v1 plaintext history is migrated or segregated with reviewed evidence",
        status: "fresh-v2-only-production-claim-scope",
        version: "vanta-send-history-privacy-scope-0.1",
      },
      localRoleServiceEndpointImplemented: true,
      localVerifierMirroredDiscoveryHandoff: true,
      productionReady: false,
      statusEndpoint: "/v1/send-discovery/status",
      version: "vanta-private-pool-v2-send-discovery-packet-0.1",
    },
    shadowCommitmentCount: shadowCommitments.length,
    shadowCommitmentScheme:
      shadowCommitments[0]?.scheme ??
      "vanta-private-pool-v2-shadow-operator-visible-terms-sha256-0.1",
    settlementPolicy,
    storage: {
      durableStoreConfigured: Boolean(
        process.env.VANTA_PRIVATE_POOL_V2_STORE_PATH || databaseUrl,
      ),
      kind: receiptStore.kind,
      productionReady: receiptStore.productionReady,
      storePath: receiptStore.path,
    },
    runtime: {
      mode: runtimeMode,
      productionReady: false,
    },
    nullifierReplayGuard: {
      acceptedNullifierCount: acceptedGuardedNullifiers.length,
      guardedNullifierCount: guardedNullifiers.length,
      mode: databaseUrl
        ? "postgres-durable-claim-preflight-and-accepted-reservation"
        : "claim-preflight-and-accepted-reservation",
      productionReady: false,
      reservationMode: nullifierReplayGuard.reservationMode ?? "single-process-memory-reservation",
      reservedNullifierCount: reservedGuardedNullifiers.length,
      storageMode: nullifierReplayGuard.storageMode,
      uniquenessScope: nullifierReplayGuard.uniquenessScope ?? "context-nullifier",
    },
    observability: {
      auditEventSinkKind: operatorEventSink.kind,
      productionReady: false,
    },
    protocolEnforcement: {
      finalLayerImplemented: true,
      finalLayerProductionReady: false,
      layer:
        "operator-claim-preflight-plus-verifier-receipt-idempotency-plus-indexer-nullifier-registration",
    },
    trafficControls: {
      rateLimitPerMinute,
      rateLimiter: rateLimiter.kind === "postgres-rate-limiter" ? "postgres-durable-shared-window" : "in-memory-per-process",
    },
    supportedAssets: runtime.assets.map((asset) => asset.symbol),
    surfaces: {
      indexer: runtime.indexer ? "ready" : "missing",
      prover: runtime.prover ? "ready" : "missing",
      relayer: runtime.relayer ? "ready" : "missing",
      verifierRegistry: runtime.verifierRegistry ? "ready" : "missing",
    },
  };
}

async function proveAndAcceptPayCheckoutSettlement(rawSession) {
  if (!runtime.indexer || !runtime.prover || !runtime.verifierRegistry) {
    throw new Error("Private Pool v2 Pay settlement requires indexer, prover, and verifier.");
  }

  const session = validatePayCheckoutSession(rawSession);
  const amount = session.amount;
  const asset = session.currency;
  const existingSettlement = paySettlementReceipts.find(
    (settlement) =>
      settlement.kind === "pay_checkout_settlement" &&
      settlement.privateRailReceipt?.checkoutSessionId === session.id,
  );
  if (existingSettlement) {
    assertPayCheckoutReplayMatches(existingSettlement, session, amount, asset);
    return existingSettlement;
  }

  const assetId = assetIdForAsset(asset);
  const treeId = treeIdForAsset(asset);
  const existingCommitments = await runtime.indexer.listCommitments({ treeId });
  const leaf = {
    assetId: VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    commitment: hashHex(
      VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION,
      "checkout-output",
      session.id,
      session.clientToken,
      amount,
      asset,
    ),
    leafIndex: existingCommitments.length,
    treeId,
  };
  const request = createVantaPrivatePoolV2ShieldProofRequest({
    amountBaseUnits: amountToBaseUnits(amount, asset),
    economicsCommitment: hashHex("checkout-economics", session.id, session.clientToken, amount, asset, leaf.commitment),
    ownerCommitment: hashHex("merchant", session.merchantId),
    previousRoot: await runtime.indexer.getCurrentRoot(treeId),
    sourceMintAddress: asset,
    targetAssetId: assetId,
    targetMintAddress: asset,
    treeCommitment: {
      ...leaf,
      merkleRoot: merkleRootFor(treeId, [...existingCommitments, leaf]),
    },
  });
  const proof = await runtime.prover.prove(request);
  assertProofSystemCanBackConfiguredSettlement(proof);
  const proofReceipt = await runtime.verifierRegistry.acceptProof({ proof, request });
  await persistReceipts(request);

  const privateRailReceipt = {
    amount,
    asset,
    auditDisclosureId: hashId("aud", session.id, proofReceipt.receiptId),
    checkoutSessionId: session.id,
    createdAt: new Date().toISOString(),
    id: hashId("prail", session.id, proofReceipt.receiptId),
    object: "private_rail_receipt",
    proofReceiptId: `ppv2_${proofReceipt.receiptId.slice(2, 26)}`,
    rail: "umbra",
    status: "confirmed",
  };
  const settlement = {
    kind: "pay_checkout_settlement",
    privateRailReceipt,
    proofReceipt,
    settlementFingerprint: hashHex(
      "pay-checkout-settlement",
      session.id,
      session.clientToken,
      session.merchantId,
      amount,
      asset,
    ),
  };

  paySettlementReceipts.push(settlement);
  await persistReceipts(request);
  return settlement;
}

async function proveAndAcceptPayWithdrawalSettlement(body) {
  if (!runtime.indexer || !runtime.prover || !runtime.relayer || !runtime.verifierRegistry) {
    throw new Error("Private Pool v2 Pay withdrawal settlement requires full operator surfaces.");
  }

  const { amount, asset, destination, merchantId } = validatePayWithdrawalBody(body);
  const existingSettlement = paySettlementReceipts.find(
    (settlement) =>
      settlement.kind === "pay_withdrawal_settlement" &&
      settlement.privateExitReceipt?.asset === asset &&
      settlement.privateExitReceipt?.destination === destination,
  );
  if (existingSettlement) {
    assertPayWithdrawalReplayMatches(
      existingSettlement,
      body,
      amount,
      asset,
      destination,
      merchantId,
    );
    return existingSettlement;
  }

  const treeId = treeIdForAsset(asset);
  const commitments = [
    ...(await runtime.indexer.listCommitments({
      assetId: VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
      treeId,
    })),
    ...(await runtime.indexer.listCommitments({ assetId: assetIdForAsset(asset), treeId })),
    ...(await runtime.indexer.listCommitments({ assetId: asset, treeId })),
  ];
  const sourceCommitment = commitments[0];
  if (!sourceCommitment) {
    throw new Error(`No private settlement commitment available for ${asset}.`);
  }

  const quote = await runtime.relayer.quoteClaim({
    amountBaseUnits: amountToBaseUnits(amount, asset),
    assetId: sourceCommitment.assetId,
    destinationAddress: destination,
  });
  const merkleProof = await runtime.indexer.getMerkleProof(sourceCommitment.commitment);
  const request = createVantaPrivatePoolV2ClaimProofRequest({
    amountBaseUnits: amountToBaseUnits(amount, asset),
    destinationAddress: destination,
    merkleProof,
    nullifier: hashHex(
      VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION,
      "withdrawal-nullifier",
      merchantId,
      destination,
      amount,
      asset,
      sourceCommitment.commitment,
    ),
    ownerCommitment: hashHex("merchant", merchantId),
    quote,
  });
  const proof = await runtime.prover.prove(request);
  assertProofSystemCanBackConfiguredSettlement(proof);
  const requestId = hashHex("pay-withdrawal-claim", merchantId, destination, amount, asset, sourceCommitment.commitment);
  await reserveAcceptedClaimNullifier(request, requestId);
  const proofReceipt = await runtime.verifierRegistry.acceptProof({ proof, request });
  await recordAcceptedClaimNullifier(request, requestId, proofReceipt.receiptId);
  await persistReceipts(request);

  const privateExitReceipt = {
    amount,
    asset,
    createdAt: new Date().toISOString(),
    destination,
    id: hashId("pexit", proofReceipt.receiptId, destination),
    object: "private_exit_receipt",
    rail: "umbra",
    status: "confirmed",
  };
  const settlement = {
    kind: "pay_withdrawal_settlement",
    privateExitReceipt,
    proofReceipt,
    settlementFingerprint: hashHex("pay-withdrawal-settlement", merchantId, destination, amount, asset),
  };

  paySettlementReceipts.push(settlement);
  await persistReceipts(request);
  return settlement;
}

async function proveAndAcceptProtocolSettlement(body) {
  if (!runtime.indexer || !runtime.prover || !runtime.relayer || !runtime.verifierRegistry) {
    throw new Error("Private Pool v2 protocol settlement requires full operator surfaces.");
  }

  const {
    action,
    amount,
    acceptedRoot,
    assetIdCommitment,
    assetCohort,
    asset,
    changeLeafIndex,
    changeMemoCiphertextBodyHash,
    changeOutputCommitment,
    changeOutputRoot,
    destination,
    economicsCommitment,
    economicsMode,
    exitTermsCommitment,
    inputRoot,
    inputCommitment,
    minOutputAmount,
    nullifierOrReplayCommitment,
    outputAmount,
    outputCommitment,
    outputLeafIndex,
    outputRoot,
    previousRoot,
    owner,
    ownerCommitment,
    poolId,
    privateSpendContextHash,
    privateSpendPublicInputHash,
    proofBoundDestinationCommitment,
    recipientMemoCiphertextBodyHash,
    relayerSerializedTransaction,
    routeCommitment,
    sendContextTag,
    sendPublicInputHash,
    settlementId,
    settlementCommitment,
    slippageBps,
    swapContextTag,
    swapPublicInputHash,
    validUntilSlot,
    unshieldContextTag,
    unshieldPublicInputHash,
    shieldCapability,
    shieldSettlementEvidence,
    shieldRouteEvidence,
  } = validateProtocolSettlementBody(body);
  const existingSettlement = protocolSettlementReceipts.find(
    (settlement) =>
      settlement.protocolSettlementReceipt?.action === action &&
      settlement.protocolSettlementReceipt?.settlementId === settlementId,
  );
  if (existingSettlement) {
    assertProtocolReplayMatches(
      existingSettlement,
      {
        destination,
        acceptedRoot,
        assetIdCommitment,
        assetCohort,
        changeLeafIndex,
        changeMemoCiphertextBodyHash,
        changeOutputCommitment,
        changeOutputRoot,
        economicsCommitment,
        economicsMode,
        exitTermsCommitment,
        inputRoot,
        inputCommitment,
        minOutputAmount,
        nullifierOrReplayCommitment,
        outputAmount,
        outputCommitment,
        outputLeafIndex,
        outputRoot,
        previousRoot,
        owner,
        ownerCommitment,
        poolId,
        privateSpendContextHash,
        privateSpendPublicInputHash,
        proofBoundDestinationCommitment,
        recipientMemoCiphertextBodyHash,
        relayerSerializedTransaction,
        routeCommitment,
        sendContextTag,
        sendPublicInputHash,
        settlementCommitment,
        slippageBps,
        swapContextTag,
        swapPublicInputHash,
        validUntilSlot,
        unshieldContextTag,
        unshieldPublicInputHash,
        shieldCapability,
        shieldSettlementEvidence,
        shieldRouteEvidence,
      },
      action,
      amount,
      asset,
      settlementId,
    );
    await ensureProofReceiptReplayGuarded(
      existingSettlement.proofReceipt,
      `protocol-settlement:${existingSettlement.protocolSettlementReceipt?.id ?? settlementId}`,
    );
    return existingSettlement;
  }

  let request;

  if (action === "shield" && economicsMode === "committed-economics") {
    const targetAsset = VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID;
    const treeId = treeIdForAsset(targetAsset);
    const existingCommitments = await runtime.indexer.listCommitments({ treeId });
    const computedPreviousRoot = merkleRootFor(treeId, existingCommitments);
    const leaf = {
      assetId: VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
      commitment: outputCommitment,
      leafIndex: existingCommitments.length,
      treeId,
    };
    const computedOutputRoot = merkleRootFor(treeId, [...existingCommitments, leaf]);
    if (previousRoot && previousRoot !== computedPreviousRoot) {
      throw new Error("Committed Shield previous root does not match verifier indexer root.");
    }
    if (outputLeafIndex && Number(outputLeafIndex) !== leaf.leafIndex) {
      throw new Error("Committed Shield output leaf index does not match next verifier leaf.");
    }
    if (outputRoot && outputRoot !== computedOutputRoot) {
      throw new Error("Committed Shield output root does not match verifier indexer root.");
    }
    request = createVantaPrivatePoolV2ShieldProofRequest({
      amountBaseUnits: 1n,
      economicsCommitment,
      ownerCommitment,
      previousRoot: computedPreviousRoot,
      routeCommitment,
      sourceMintAddress: "hidden:economic-terms",
      targetAssetId: targetAsset,
      targetMintAddress: "hidden:economic-terms",
      treeCommitment: {
        ...leaf,
        merkleRoot: computedOutputRoot,
      },
    });
  } else if (action === "shield") {
    const targetAsset = shieldCapability.targetShieldAsset.assetKey;
    const treeId = treeIdForAsset(targetAsset);
    const existingCommitments = await runtime.indexer.listCommitments({ treeId });
    const leaf = {
      assetId: VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
      commitment: hashHex(
        VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION,
        "protocol-shield-output",
        settlementId,
        amount,
        asset,
      ),
      leafIndex: existingCommitments.length,
      treeId,
    };
    request = createPrivatePoolV2ShieldProofRequestFromCapability({
      amountBaseUnits: amountToBaseUnits(amount, asset),
      capability: shieldCapability,
      economicsCommitment: hashHex("protocol-shield-economics", settlementId, asset, amount, leaf.commitment),
      ownerCommitment: hashHex("owner", owner),
      previousRoot: await runtime.indexer.getCurrentRoot(treeId),
      routeCommitment: shieldRouteEvidence
        ? hashHex(
            "shield-route-evidence",
            shieldRouteEvidence.provider,
            shieldRouteEvidence.routeSignature,
            shieldRouteEvidence.sourceAmount ?? "",
            shieldRouteEvidence.sourceAsset ?? "",
            shieldRouteEvidence.sourceMintAddress ?? "",
            shieldRouteEvidence.targetAmount,
            shieldRouteEvidence.targetAsset,
            shieldRouteEvidence.targetMintAddress ?? "",
          )
        : undefined,
      treeCommitment: {
        ...leaf,
        merkleRoot: merkleRootFor(treeId, [...existingCommitments, leaf]),
      },
    });
  } else if (action === "unshield" && economicsMode === "committed-economics") {
    request = createVantaPrivatePoolV2UnshieldProofRequest({
      economicsCommitment,
      exitTermsCommitment,
      inputCommitment,
      inputRoot,
      nullifierOrReplayCommitment,
      ownerCommitment,
      proofBoundDestinationCommitment,
      routeCommitment,
      settlementCommitment,
      unshieldContextTag,
      unshieldPublicInputHash,
    });
  } else if (action === "unshield") {
    const targetAsset = asset;
    const treeId = treeIdForAsset(targetAsset);
    const assetId = assetIdForAsset(targetAsset);
    const commitments = [
      ...(await runtime.indexer.listCommitments({
        assetId: VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
        treeId,
      })),
      ...(await runtime.indexer.listCommitments({ assetId: asset, treeId })),
      ...(await runtime.indexer.listCommitments({ assetId, treeId })),
    ];
    const sourceCommitment = commitments[0];
    if (!sourceCommitment) {
      throw new Error(`No private settlement commitment available for ${asset}.`);
    }

    const quote = await runtime.relayer.quoteClaim({
      amountBaseUnits: amountToBaseUnits(amount, asset),
      assetId: sourceCommitment.assetId,
      destinationAddress: destination,
    });
    request = createVantaPrivatePoolV2ClaimProofRequest({
      amountBaseUnits: amountToBaseUnits(amount, asset),
      destinationAddress: destination,
      merkleProof: await runtime.indexer.getMerkleProof(sourceCommitment.commitment),
      nullifier: hashHex(
        VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION,
        "protocol-unshield-nullifier",
        settlementId,
        destination,
        amount,
        asset,
        sourceCommitment.commitment,
      ),
      ownerCommitment: hashHex("owner", owner),
      quote,
    });
  } else if (action === "send" && economicsMode === "committed-economics") {
    if (poolId && assetCohort && acceptedRoot && privateSpendContextHash) {
      request = createVantaPrivatePoolV2ActualPrivateSpendProofRequest({
        acceptedRoot,
        assetCohort,
        contextHash: privateSpendContextHash,
        nullifier: nullifierOrReplayCommitment,
        outputCommitments: [outputCommitment, changeOutputCommitment].filter(Boolean),
        poolId,
        ...(privateSpendPublicInputHash
          ? { privateSpendPublicInputHash }
          : sendPublicInputHash
            ? { privateSpendPublicInputHash: sendPublicInputHash }
            : {}),
      });
    } else {
      request = createVantaPrivatePoolV2SendProofRequest({
        assetIdCommitment,
        changeLeafIndex,
        ...(changeMemoCiphertextBodyHash ? { changeMemoCiphertextBodyHash } : {}),
        ...(changeOutputCommitment ? { changeOutputCommitment } : {}),
        changeOutputRoot,
        economicsCommitment,
        inputCommitment,
        inputRoot,
        nullifier: nullifierOrReplayCommitment,
        ownerCommitment,
        recipientLeafIndex: outputLeafIndex,
        ...(recipientMemoCiphertextBodyHash ? { recipientMemoCiphertextBodyHash } : {}),
        recipientOutputCommitment: outputCommitment,
        recipientOutputRoot: outputRoot,
        sendContextTag,
        ...(sendPublicInputHash ? { sendPublicInputHash } : {}),
        validUntilSlot,
      });
    }
  } else if (action === "swap" && economicsMode === "committed-economics") {
    request = createVantaPrivatePoolV2SwapToShieldedProofRequest({
      economicsCommitment,
      inputCommitment,
      inputRoot,
      minOutputAmount,
      nullifierOrReplayCommitment,
      outputAmount,
      outputCommitment,
      outputLeafIndex,
      outputRoot,
      ownerCommitment,
      routeCommitment,
      settlementCommitment,
      slippageBps,
      swapContextTag,
      swapPublicInputHash,
      validUntilSlot,
    });
  } else if (action === "send" || action === "swap") {
    const targetAsset = asset;
    const assetId = assetIdForAsset(targetAsset);
    const rawSettlementCommitment = hashHex(
      "protocol-hidden-economics-settlement",
      action,
      settlementId,
      owner,
    );
    const rawRouteCommitment = hashHex("route", action, settlementId, asset, amount);
    request = createVantaPrivatePoolV2HiddenEconomicsProofRequest({
      economicsCommitment: hashHex(
        "protocol-hidden-economics",
        action,
        settlementId,
        destination,
        assetId,
        amountToBaseUnits(amount, asset).toString(),
      ),
      intent: action === "send" ? "private-send" : "swap-to-shielded",
      nullifierOrReplayCommitment: hashHex(
        "protocol-hidden-economics-replay",
        action,
        settlementId,
        destination,
      ),
      outputCommitment: hashHex("protocol-hidden-economics-output", action, settlementId, owner),
      ownerCommitment: hashHex("owner", owner),
      routeCommitment: rawRouteCommitment,
      settlementCommitment: rawSettlementCommitment,
    });
  } else {
    throw new Error(`Unknown protocol settlement action ${action}.`);
  }

  const actualPrivateSpendRelayerExpectedPublicInputs =
    actualPrivateSpendSolanaExpectedPublicInputs({
      acceptedRoot,
      action,
      changeOutputCommitment,
      economicsMode,
      nullifierOrReplayCommitment,
      outputCommitment,
      privateSpendPublicInputHash,
      sendPublicInputHash,
    });
  validateActualPrivateSpendRelayerSerializedTransaction({
    expectedPublicInputs: actualPrivateSpendRelayerExpectedPublicInputs,
    relayerSerializedTransaction,
  });

  const proof = await runtime.prover.prove(request);
  assertProofSystemCanBackConfiguredSettlement(proof);
  const requestId =
    economicsMode === "committed-economics"
      ? hashHex(
          "protocol-claim-committed-economics",
          action,
          settlementId,
          settlementCommitment,
          nullifierOrReplayCommitment,
        )
      : hashHex("protocol-claim", action, settlementId, destination, amount, asset);
  await reserveAcceptedClaimNullifier(request, requestId);
  const proofReceipt = await runtime.verifierRegistry.acceptProof({ proof, request });
  await recordAcceptedClaimNullifier(request, requestId, proofReceipt.receiptId);
  await persistReceipts(request);

  const protocolSettlementReceipt = {
    action,
    ...(economicsMode === "committed-economics"
      ? {
          economicsCommitment,
          economicsMode,
          ...(exitTermsCommitment ? { exitTermsCommitment } : {}),
          ...(proofBoundDestinationCommitment ? { proofBoundDestinationCommitment } : {}),
          settlementCommitment,
        }
      : {
          amount,
          asset,
        }),
    id: hashId("proto", action, settlementId, proofReceipt.receiptId),
    object: "protocol_settlement_receipt",
    ...(proofReceipt.shadowCommitments?.operatorVisibleTermsCommitment
      ? {
          operatorVisibleTermsCommitment:
            proofReceipt.shadowCommitments.operatorVisibleTermsCommitment,
        }
      : {}),
    proofReceiptId: `ppv2_${proofReceipt.receiptId.slice(2, 26)}`,
    proofReceiptPublicInputCommitment: proofReceipt.publicInputCommitment,
    settlementId,
    ...(action === "shield"
      ? {
          shieldReceiptBindingHash: hashHex(
            "shield-receipt-binding",
            settlementId,
            proofReceipt.receiptId,
            proofReceipt.publicInputCommitment,
            proofReceipt.shadowCommitments?.operatorVisibleTermsCommitment ?? "",
            economicsMode === "committed-economics" ? economicsCommitment : shieldSettlementEvidence.depositSignature,
            economicsMode === "committed-economics" ? settlementCommitment : shieldSettlementEvidence.stateSignature,
            economicsMode === "committed-economics" ? ownerCommitment : shieldSettlementEvidence.owner,
            economicsMode === "committed-economics" ? routeCommitment : shieldSettlementEvidence.vaultOwner,
          ),
          ...(economicsMode === "committed-economics"
            ? {
                committedOutputRoot: readProofRequestInput(request, "output-root:"),
              }
            : {
                shieldCapabilityMode: shieldCapability.mode,
                depositSignature: shieldSettlementEvidence.depositSignature,
                owner: shieldSettlementEvidence.owner,
                sourceAsset: shieldCapability.sourceAsset.symbol,
                sourceMintAddress: shieldCapability.sourceAsset.mintAddress,
                stateSignature: shieldSettlementEvidence.stateSignature,
                targetAsset: shieldCapability.targetShieldAsset.assetKey,
                targetMintAddress: shieldCapability.targetShieldAsset.mintAddress,
                vaultOwner: shieldSettlementEvidence.vaultOwner,
                ...(shieldRouteEvidence
                  ? {
                      routeProvider: shieldRouteEvidence.provider,
                      routeSignature: shieldRouteEvidence.routeSignature,
                      routeSourceAmount: shieldRouteEvidence.sourceAmount,
                      routeSourceAsset: shieldRouteEvidence.sourceAsset,
                      routeSourceMintAddress: shieldRouteEvidence.sourceMintAddress,
                      routeTargetAmount: shieldRouteEvidence.targetAmount,
                    }
                  : {}),
              }),
        }
      : {}),
    status: "confirmed",
  };
  const onChainSubmission = await submitActualPrivateSpendToRelayer({
    expectedPublicInputs: actualPrivateSpendRelayerExpectedPublicInputs,
    proofReceipt,
    protocolSettlementReceipt,
    relayerSerializedTransaction,
    request,
  });
  const acceptedPublicInputs =
    action === "send" && economicsMode === "committed-economics" && hasActualPrivateSendFields({
      acceptedRoot,
      assetCohort,
      outputCommitment,
      poolId,
      privateSpendContextHash,
    })
      ? {
          acceptedRoot,
          assetCohort,
          changeOutputCommitment,
          nullifierOrReplayCommitment,
          outputCommitment,
          poolId,
          privateSpendContextHash,
          privateSpendPublicInputHash: privateSpendPublicInputHash || sendPublicInputHash,
          proofReceiptPublicInputCommitment: proofReceipt.publicInputCommitment,
          version: "vanta-actual-private-accepted-public-inputs-0.1",
        }
      : null;
  const settlement = {
    kind: "protocol_settlement",
    ...(acceptedPublicInputs ? { acceptedPublicInputs } : {}),
    ...(onChainSubmission?.solanaSignatureAccepted
      ? {
          onChainSubmission: {
            relayerId: onChainSubmission.relayerId,
            signature: onChainSubmission.signature,
            submittedBy: onChainSubmission.submittedBy,
          },
        }
      : {}),
    ...(onChainSubmission && !onChainSubmission.solanaSignatureAccepted
      ? {
          relayerSubmissionAttempt: {
            relayerId: onChainSubmission.relayerId,
            signatureRef: `non-solana-signature:${hashHex("relayer-submission-attempt", onChainSubmission.signature).slice(2, 18)}`,
            status: "not-solscan-evidence",
            submittedBy: onChainSubmission.submittedBy,
          },
        }
      : {}),
    proofReceipt,
    protocolSettlementReceipt,
    settlementFingerprint: protocolSettlementFingerprint({
      action,
      amount,
      acceptedRoot,
      assetIdCommitment,
      assetCohort,
      asset,
      changeLeafIndex,
      changeMemoCiphertextBodyHash,
      changeOutputCommitment,
      changeOutputRoot,
      destination,
      economicsCommitment,
      economicsMode,
      exitTermsCommitment,
      inputRoot,
      inputCommitment,
      nullifierOrReplayCommitment,
      outputCommitment,
      outputLeafIndex,
      outputRoot,
      previousRoot,
      owner,
      ownerCommitment,
      poolId,
      privateSpendContextHash,
      privateSpendPublicInputHash,
      recipientMemoCiphertextBodyHash,
      relayerSerializedTransaction,
      routeCommitment,
      sendContextTag,
      sendPublicInputHash,
      settlementId,
      settlementCommitment,
      swapContextTag,
      swapPublicInputHash,
      validUntilSlot,
      unshieldContextTag,
      unshieldPublicInputHash,
      shieldCapability,
      shieldSettlementEvidence,
      shieldRouteEvidence,
    }),
  };

  protocolSettlementReceipts.push(settlement);
  await persistReceipts(request);
  return settlement;
}

const server = createServer(async (request, response) => {
  const telemetryContext = createSafeTelemetryRequestContext({
    request,
    service: "vanta-private-pool-v2",
  });
  observeSafeTelemetryResponse({
    context: telemetryContext,
    response,
  });

  try {
    if (request.method === "OPTIONS" && isPublicBrowserCorsRoute(request)) {
      if (isPublicBrowserShieldReceiptRoute(request)) {
        writePublicShieldReceiptHeaders(response);
      } else {
        writeBrowserCorsHeaders(response);
      }
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (!(await enforceRateLimit(request, response, telemetryContext))) {
      return;
    }

    if (isPublicUnshieldRoute(request)) {
      await handlePublicUnshieldRoute(request, response);
      return;
    }

    if (isPublicBrowserShieldReceiptRoute(request)) {
      await handlePublicBrowserShieldReceiptRoute(request, response);
      return;
    }

    if (!(await requireAuth(request, response, telemetryContext))) {
      return;
    }

    if (request.method === "GET" && request.url === "/state/private-pool-v2-status") {
      sendJson(response, 200, await statusPayload());
      return;
    }

    if (request.method === "GET" && request.url === "/state/private-pool-v2-receipts") {
      const receipts = runtime.verifierRegistry?.receipts ?? [];
      sendJson(response, 200, {
        kind: "Private Pool V2 receipts",
        paySettlementCount: paySettlementReceipts.length,
        paySettlements: paySettlementReceipts,
        protocolSettlementCount: protocolSettlementReceipts.length,
        protocolSettlements: protocolSettlementReceipts,
        receipts,
        receiptCount: receipts.length,
        shadowCommitmentCount: shadowCommitmentsFromReceipts(receipts).length,
      });
      return;
    }

    if (request.method === "POST" && request.url === "/private-pool-v2/proof-artifacts/verify") {
      const body = await readRequestBody(request);
      assertStrictPrivatePoolV2ProofArtifactBody(body);
      const verifiedProofArtifact = await verifyPrivatePoolV2ProofArtifactForOperator(body);
      sendJson(response, 200, {
        kind: verifiedProofArtifact.kind,
        proofTrustBoundary: proofTrustBoundaryPayload(),
        verifiedReceipt: verifiedProofArtifact.verifiedReceipt,
      });
      return;
    }

    if (request.method === "POST" && request.url === "/private-pool-v2/proofs") {
      const body = await readRequestBody(request);
      const proofRequest = toProofRequest(body.request);
      const requestId = body.requestId ?? body.proof?.publicInputCommitment ?? proofRequest.publicInputs?.join("|");
      const proof = toProofResult(body.proof);
      assertProofSystemCanBackConfiguredSettlement(proof);
      await enforceClaimNullifierPreflight(proofRequest, requestId);
      await reserveAcceptedClaimNullifier(proofRequest, requestId);
      const receipt = await runtime.verifierRegistry.acceptProof({
        proof,
        request: proofRequest,
      });
      await recordAcceptedClaimNullifier(proofRequest, requestId, receipt.receiptId);
      await persistReceipts(proofRequest);
      sendJson(response, 200, {
        kind: "Private Pool V2 proof receipt",
        receipt,
        status: await statusPayload(),
      });
      return;
    }

    if (request.method === "POST" && request.url === "/private-pool-v2/nullifier-replay-checks") {
      const body = await readRequestBody(request);
      const proofRequest = body.request
        ? toProofRequest(body.request)
        : {
            amountBaseUnits: 1n,
            assetId: body.assetId ?? VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
            intent: requireNonEmptyString(body.intent, "intent"),
            publicInputs: [
              `intent:${requireNonEmptyString(body.intent, "intent")}`,
              `nullifier:${requireNonEmptyString(body.nullifier, "nullifier")}`,
            ],
          };
      const requestId =
        body.requestId ??
        body.proof?.publicInputCommitment ??
        proofRequest.publicInputs?.join("|");
      sendJson(response, 200, await checkProofRequestNullifierReplay(proofRequest, requestId));
      return;
    }

    if (request.method === "POST" && request.url === "/private-pool-v2/decoy-commitments") {
      const body = await readRequestBody(request);
      requireNonEmptyString(body.commitment, "commitment");
      sendJson(response, 204, {});
      return;
    }

    if (request.method === "POST" && request.url === "/private-pool-v2/pay-settlements") {
      if (!allowLegacyPaySettlements) {
        sendJson(response, 410, {
          error:
            "Legacy raw Pay settlements are disabled. Use /private-pool-v2/protocol-settlements with committed economics.",
          ok: false,
        });
        return;
      }

      const body = await readRequestBody(request);

      if (body.kind === "checkout") {
        sendJson(response, 200, await proveAndAcceptPayCheckoutSettlement(body.session));
        return;
      }

      if (body.kind === "withdrawal") {
        sendJson(response, 200, await proveAndAcceptPayWithdrawalSettlement(body));
        return;
      }

      sendJson(response, 400, { error: "Unknown Pay settlement kind." });
      return;
    }

    if (request.method === "POST" && request.url === "/private-pool-v2/protocol-settlements") {
      const body = await readRequestBody(request);
      sendJson(response, 200, await proveAndAcceptProtocolSettlement(body));
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    if (isPublicBrowserCorsRoute(request)) {
      if (isPublicBrowserShieldReceiptRoute(request)) {
        writePublicShieldReceiptHeaders(response);
      } else {
        writeBrowserCorsHeaders(response);
      }
    }
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    });
  }
});

server.listen(port, host, () => {
  writeSafeTelemetryEvent(
    createOperatorStartupTelemetryEvent({
      service: "vanta-private-pool-v2",
      storageKind: receiptStore.kind,
    }),
  );
  void appendOperatorEvent({
    eventRef: `startup:${port}`,
    eventType: "operator_started",
    payload: {
      rateLimiterKind: rateLimiter.kind,
      runtimeMode,
      service: "vanta-private-pool-v2",
      storageKind: receiptStore.kind,
    },
    severity: "info",
  });
});

async function closeOperator() {
  try {
    await receiptStore.close();
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
    process.exit(0);
  }
}

process.on("SIGTERM", () => {
  server.close(() => {
    void closeOperator();
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    void closeOperator();
  });
});

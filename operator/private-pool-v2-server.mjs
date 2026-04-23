import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
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
import { createNullifierReplayGuard } from "../src/privacy/nullifierReplayGuard.mjs";
import { createPostgresNullifierReplayStoreFromDatabaseUrl } from "../src/privacy/postgresNullifierReplayStore.mjs";
import { createPostgresSnapshotStore } from "../src/storage/vantaPostgresSnapshotStore.mjs";
import { createPrivatePoolV2ReceiptStore } from "./private-pool-v2-store.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const host = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_HOST ?? process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_PORT ?? "8797");
const operatorAuthToken = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN;
const rateLimitPerMinute = Number(process.env.VANTA_PRIVATE_POOL_V2_RATE_LIMIT_PER_MINUTE ?? "600");
const databaseUrl = process.env.VANTA_PRIVATE_POOL_V2_DATABASE_URL;
const runtimeMode = process.env.VANTA_PRIVATE_POOL_V2_RUNTIME_MODE ?? "local-benchmark";
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
  "privatePoolV2RemoteServices.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2ShieldCapabilityAdapter.ts",
  "privatePoolV2SettlementPolicy.ts",
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
}

assertProductionAuthToken();

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
  createVantaPrivatePoolV2ShieldProofRequest,
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
  context: "private-pool-v2-claim",
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

const textEncoder = new TextEncoder();
const VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION =
  "vanta-pay-private-settlement-adapter-0.1";
const settlementPolicy = VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY;
const protocolActionProofModes = {
  send: "operator_local_transfer_request",
  shield: "shield_circuit_request",
  swap: "operator_local_swap_request",
  unshield: "claim_circuit_request",
};

function hashHex(...parts) {
  return `0x${bytesToHex(sha256(textEncoder.encode(parts.join("\u001f"))))}`;
}

function hashId(prefix, ...parts) {
  return `${prefix}_${bytesToHex(sha256(textEncoder.encode(parts.join("\u001f")))).slice(0, 24)}`;
}

function normalizeAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Settlement amount must be a positive decimal string.");
  }

  return parsed.toFixed(2);
}

function assetDecimals(asset) {
  return asset === "SOL" ? 9 : 6;
}

function amountToBaseUnits(amount, asset) {
  const [whole = "0", fraction = ""] = normalizeAmount(amount).split(".");
  const decimals = assetDecimals(asset);
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

function validatePayCheckoutSession(session) {
  if (!session || typeof session !== "object") {
    throw new Error("Private Pool v2 Pay checkout settlement requires session.");
  }

  return {
    amount: normalizeAmount(session.amount),
    clientToken: requireNonEmptyString(session.clientToken, "session.clientToken"),
    currency: requireNonEmptyString(session.currency, "session.currency"),
    id: requireNonEmptyString(session.id, "session.id"),
    merchantId: requireNonEmptyString(session.merchantId, "session.merchantId"),
  };
}

function validatePayWithdrawalBody(body) {
  return {
    amount: normalizeAmount(body.amount),
    asset: requireNonEmptyString(body.asset, "asset"),
    destination: requireNonEmptyString(body.destination, "destination"),
    merchantId: requireNonEmptyString(body.merchantId, "merchantId"),
  };
}

function validateProtocolSettlementBody(body) {
  return {
    action: requireNonEmptyString(body.action, "action"),
    amount: normalizeAmount(body.amount),
    asset: requireNonEmptyString(body.asset, "asset"),
    destination: requireNonEmptyString(body.destination, "destination"),
    owner: requireNonEmptyString(body.owner, "owner"),
    settlementId: requireNonEmptyString(body.settlementId, "settlementId"),
    shieldCapability: normalizeProtocolShieldCapability(body.shieldCapability, body.asset),
    shieldRouteEvidence: normalizeProtocolShieldRouteEvidence(
      body.shieldRouteEvidence,
      normalizeProtocolShieldCapability(body.shieldCapability, body.asset),
    ),
  };
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

  return {
    provider: requireNonEmptyString(rawEvidence.provider, "shieldRouteEvidence.provider"),
    routeSignature: requireNonEmptyString(
      rawEvidence.routeSignature,
      "shieldRouteEvidence.routeSignature",
    ),
    targetAmount: normalizeAmount(rawEvidence.targetAmount),
    targetAsset,
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
  asset,
  destination,
  owner,
  settlementId,
  shieldCapability,
  shieldRouteEvidence,
}) {
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
    shieldRouteEvidence?.provider ?? "",
    shieldRouteEvidence?.routeSignature ?? "",
    shieldRouteEvidence?.targetAmount ?? "",
    shieldRouteEvidence?.targetAsset ?? "",
  );
}

function assertProtocolReplayMatches(
  existingSettlement,
  { destination, owner, shieldCapability, shieldRouteEvidence },
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
      asset,
      destination,
      owner,
      settlementId,
      shieldCapability,
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

  const assetId = readPublicInput(proofRequest, "target-asset:");
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

function nullifiersFromReceipts(receipts) {
  return receipts
    .filter((receipt) => receipt.replayKey.startsWith("claim:"))
    .map((receipt) => ({
      nullifier: receipt.replayKey.slice("claim:".length),
      spentAtSlot: receipt.recordedAtSlot,
    }));
}

async function persistReceipts(acceptedRequest) {
  const receipts = runtime.verifierRegistry?.receipts ?? [];
  const acceptedCommitment = commitmentFromShieldRequest(acceptedRequest);

  if (
    acceptedCommitment &&
    !persistedCommitments.some(
      (commitment) =>
        commitment.treeId === acceptedCommitment.treeId &&
        commitment.leafIndex === acceptedCommitment.leafIndex &&
        commitment.commitment === acceptedCommitment.commitment,
    )
  ) {
    persistedCommitments.push(acceptedCommitment);
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
  if (request.intent !== "claim") {
    return;
  }

  const nullifier = readProofRequestInput(request, "nullifier:");
  if (!nullifier) {
    throw new Error("Claim proof requires a nullifier replay guard input.");
  }

  const decision = await nullifierReplayGuard.check({
    context: "private-pool-v2-claim",
    nullifier,
    requestId,
  });

  if (!decision.accepted) {
    throw new Error(`Private-pool nullifier replay rejected: ${decision.reason}.`);
  }
}

async function reserveAcceptedClaimNullifier(request, requestId) {
  if (request.intent !== "claim") {
    return null;
  }

  const nullifier = readProofRequestInput(request, "nullifier:");
  if (!nullifier) {
    throw new Error("Accepted claim proof requires a nullifier replay guard input.");
  }

  const assetId = request.assetId ?? readProofRequestInput(request, "asset-id:") ?? "unknown";
  const decision = await nullifierReplayGuard.reserve({
    assetId,
    context: "private-pool-v2-claim",
    nullifier,
    requestId,
  });

  if (!decision.accepted) {
    throw new Error(`Private-pool nullifier replay rejected: ${decision.reason}.`);
  }

  return decision;
}

async function statusPayload() {
  const readiness = runtime.readiness();
  const guardedNullifiers = await nullifierReplayGuard.snapshot();

  return {
    contractVersion: runtime.contractVersion,
    kind: "Private Pool V2 operator status",
    ok: readiness.ready,
    productionReady: false,
    protocolActionProofModes,
    readiness,
    receiptCount: runtime.verifierRegistry?.receipts?.length ?? 0,
    receiptStorePath: receiptStore.path,
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
      guardedNullifierCount: guardedNullifiers.length,
      mode: databaseUrl
        ? "postgres-durable-claim-preflight-and-accepted-reservation"
        : "claim-preflight-and-accepted-reservation",
      productionReady: false,
      storageMode: nullifierReplayGuard.storageMode,
    },
    observability: {
      auditEventSinkKind: operatorEventSink.kind,
      productionReady: false,
    },
    protocolEnforcement: {
      finalLayerImplemented: false,
      finalLayerProductionReady: false,
      layer: "operator-claim-preflight-and-accepted-reservation-only",
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
    assetId,
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
  const commitments = await runtime.indexer.listCommitments({ assetId: assetIdForAsset(asset), treeId });
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
  await reserveAcceptedClaimNullifier(
    request,
    hashHex("pay-withdrawal-claim", merchantId, destination, amount, asset, sourceCommitment.commitment),
  );
  const proofReceipt = await runtime.verifierRegistry.acceptProof({ proof, request });
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
    asset,
    destination,
    owner,
    settlementId,
    shieldCapability,
    shieldRouteEvidence,
  } =
    validateProtocolSettlementBody(body);
  const existingSettlement = protocolSettlementReceipts.find(
    (settlement) =>
      settlement.protocolSettlementReceipt?.action === action &&
      settlement.protocolSettlementReceipt?.settlementId === settlementId,
  );
  if (existingSettlement) {
    assertProtocolReplayMatches(
      existingSettlement,
      { destination, owner, shieldCapability, shieldRouteEvidence },
      action,
      amount,
      asset,
      settlementId,
    );
    return existingSettlement;
  }

  const targetAsset = action === "shield" ? shieldCapability.targetShieldAsset.assetKey : asset;
  const treeId = treeIdForAsset(targetAsset);
  const assetId = action === "shield" ? targetAsset : assetIdForAsset(targetAsset);
  let request;

  if (action === "shield") {
    const existingCommitments = await runtime.indexer.listCommitments({ treeId });
    const leaf = {
      assetId,
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
      ownerCommitment: hashHex("owner", owner),
      previousRoot: await runtime.indexer.getCurrentRoot(treeId),
      routeCommitment: shieldRouteEvidence
        ? hashHex(
            "shield-route-evidence",
            shieldRouteEvidence.provider,
            shieldRouteEvidence.routeSignature,
            shieldRouteEvidence.targetAmount,
            shieldRouteEvidence.targetAsset,
          )
        : undefined,
      treeCommitment: {
        ...leaf,
        merkleRoot: merkleRootFor(treeId, [...existingCommitments, leaf]),
      },
    });
  } else if (action === "unshield") {
    const commitments = await runtime.indexer.listCommitments({ assetId, treeId });
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
  } else if (action === "send" || action === "swap") {
    request = {
      amountBaseUnits: amountToBaseUnits(amount, asset),
      assetId,
      intent: action === "send" ? "private-send" : "swap-to-shielded",
      publicInputs: [
        "vanta-private-pool-v2-protocol-settlement-0.1:version",
        `action:${action}`,
        `settlement-id:${settlementId}`,
        `asset:${asset}`,
        `asset-id:${assetId}`,
        `amount:${amountToBaseUnits(amount, asset).toString()}`,
        `owner-commitment:${hashHex("owner", owner)}`,
        `destination:${destination}`,
        `route-commitment:${hashHex("route", action, settlementId, asset, amount)}`,
      ],
    };
  } else {
    throw new Error(`Unknown protocol settlement action ${action}.`);
  }

  const proof = await runtime.prover.prove(request);
  await reserveAcceptedClaimNullifier(
    request,
    hashHex("protocol-claim", action, settlementId, destination, amount, asset),
  );
  const proofReceipt = await runtime.verifierRegistry.acceptProof({ proof, request });
  await persistReceipts(request);

  const protocolSettlementReceipt = {
    action,
    amount,
    asset,
    id: hashId("proto", action, settlementId, proofReceipt.receiptId),
    object: "protocol_settlement_receipt",
    proofReceiptId: `ppv2_${proofReceipt.receiptId.slice(2, 26)}`,
    settlementId,
    ...(action === "shield"
      ? {
          shieldCapabilityMode: shieldCapability.mode,
          sourceAsset: shieldCapability.sourceAsset.symbol,
          sourceMintAddress: shieldCapability.sourceAsset.mintAddress,
          targetAsset: shieldCapability.targetShieldAsset.assetKey,
          targetMintAddress: shieldCapability.targetShieldAsset.mintAddress,
          ...(shieldRouteEvidence
            ? {
                routeProvider: shieldRouteEvidence.provider,
                routeSignature: shieldRouteEvidence.routeSignature,
                routeTargetAmount: shieldRouteEvidence.targetAmount,
              }
            : {}),
        }
      : {}),
    status: "confirmed",
  };
  const settlement = {
    kind: "protocol_settlement",
    proofReceipt,
    protocolSettlementReceipt,
    settlementFingerprint: protocolSettlementFingerprint({
      action,
      amount,
      asset,
      destination,
      owner,
      settlementId,
      shieldCapability,
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
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (!(await enforceRateLimit(request, response, telemetryContext))) {
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
      sendJson(response, 200, {
        kind: "Private Pool V2 receipts",
        paySettlementCount: paySettlementReceipts.length,
        paySettlements: paySettlementReceipts,
        protocolSettlementCount: protocolSettlementReceipts.length,
        protocolSettlements: protocolSettlementReceipts,
        receipts: runtime.verifierRegistry?.receipts ?? [],
        receiptCount: runtime.verifierRegistry?.receipts?.length ?? 0,
      });
      return;
    }

    if (request.method === "POST" && request.url === "/private-pool-v2/proofs") {
      const body = await readRequestBody(request);
      const proofRequest = toProofRequest(body.request);
      const requestId = body.requestId ?? body.proof?.publicInputCommitment ?? proofRequest.publicInputs?.join("|");
      await enforceClaimNullifierPreflight(proofRequest, requestId);
      await reserveAcceptedClaimNullifier(proofRequest, requestId);
      const receipt = await runtime.verifierRegistry.acceptProof({
        proof: toProofResult(body.proof),
        request: proofRequest,
      });
      await persistReceipts(proofRequest);
      sendJson(response, 200, {
        kind: "Private Pool V2 proof receipt",
        receipt,
        status: await statusPayload(),
      });
      return;
    }

    if (request.method === "POST" && request.url === "/private-pool-v2/pay-settlements") {
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

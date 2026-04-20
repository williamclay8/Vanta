import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-http-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const storePath = join(tempRoot, "private-pool-v2-receipts.json");
const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2LocalIndexer.ts",
  "privatePoolV2LocalProver.ts",
];
const port = 9880 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let parsed = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return { ok: response.ok, parsed, status: response.status, text };
}

async function requestJsonAt(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let parsed = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return { ok: response.ok, parsed, status: response.status, text };
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await requestJson("/health");
      if (response.ok) {
        return;
      }
    } catch {
      // Server still booting.
    }

    await sleep(250);
  }

  throw new Error("Private Pool V2 operator did not become healthy.");
}

async function waitForExit(child, timeoutMs = 1_000) {
  if (child.exitCode !== null) {
    return child.exitCode;
  }

  return await new Promise((resolvePromise) => {
    const timer = setTimeout(() => resolvePromise(null), timeoutMs);
    child.once("close", (code) => {
      clearTimeout(timer);
      resolvePromise(code);
    });
  });
}

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

async function loadFixtureRuntime() {
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

  const [
    { createVantaPrivatePoolV2ClaimProofRequest, createVantaPrivatePoolV2ShieldProofRequest },
    { createVantaPrivatePoolV2LocalIndexer },
    { createVantaPrivatePoolV2LocalProver },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalIndexer.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalProver.js")).href),
  ]);

  const indexer = createVantaPrivatePoolV2LocalIndexer();
  const previousRoot = await indexer.getCurrentRoot("vanta-http-tree");
  const commitment = indexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:http-shield-output-commitment",
    treeId: "vanta-http-tree",
  });
  const merkleProof = await indexer.getMerkleProof(commitment.commitment);
  const prover = createVantaPrivatePoolV2LocalProver();
  const shieldRequest = createVantaPrivatePoolV2ShieldProofRequest({
    amountBaseUnits: 1_000_000n,
    ownerCommitment: "field:owner",
    previousRoot,
    routeCommitment: "field:route",
    sourceMintAddress: "mint:public-usdc",
    targetAssetId: "USDC",
    targetMintAddress: "mint:shielded-usdc",
    treeCommitment: commitment,
  });
  const quote = {
    estimatedFeeBaseUnits: 100n,
    expiresAtSlot: 1_000_150n,
    relayerId: "relayer:http",
  };
  const claimRequest = createVantaPrivatePoolV2ClaimProofRequest({
    amountBaseUnits: 1_000_000n,
    destinationAddress: "recipient-public-address",
    merkleProof,
    nullifier: "field:http-nullifier",
    ownerCommitment: "field:owner",
    quote,
  });

  return {
    claimProof: await prover.prove(claimRequest),
    claimRequest,
    shieldProof: await prover.prove(shieldRequest),
    shieldRequest,
  };
}

function encodePayload({ proof, request }) {
  return JSON.stringify({
    proof: {
      ...proof,
      proofBytes: [...proof.proofBytes],
    },
    request: {
      ...request,
      amountBaseUnits: request.amountBaseUnits.toString(),
    },
  });
}

const fixture = await loadFixtureRuntime();
const insecureProductionServer = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    NODE_ENV: "production",
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port + 1_000),
    VANTA_PRIVATE_POOL_V2_STORE_PATH: join(tempRoot, "insecure-production-store.json"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let insecureProductionStderr = "";
insecureProductionServer.stderr.on("data", (chunk) => {
  insecureProductionStderr += chunk.toString("utf8");
});
const insecureProductionExitCode = await waitForExit(insecureProductionServer);
if (insecureProductionExitCode === null) {
  insecureProductionServer.kill("SIGTERM");
  throw new Error("Expected insecure production Private Pool V2 operator to exit.");
}
assert(
  insecureProductionStderr.includes("VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN"),
  "Expected missing Private Pool V2 production auth token error.",
);
console.log("private-pool-v2 production auth guard: PASS");

const storelessProductionServer = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    NODE_ENV: "production",
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "vanta-private-pool-v2-live-token",
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port + 1_002),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let storelessProductionStderr = "";
storelessProductionServer.stderr.on("data", (chunk) => {
  storelessProductionStderr += chunk.toString("utf8");
});
const storelessProductionExitCode = await waitForExit(storelessProductionServer);
if (storelessProductionExitCode === null) {
  storelessProductionServer.kill("SIGTERM");
  throw new Error("Expected production Private Pool V2 operator without durable store to exit.");
}
assert(
  storelessProductionStderr.includes("VANTA_PRIVATE_POOL_V2_STORE_PATH"),
  "Expected missing Private Pool V2 production store path error.",
);
console.log("private-pool-v2 production store guard: PASS");

const authPort = port + 1_001;
const authBaseUrl = `http://127.0.0.1:${authPort}`;
const authenticatedServer = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "vanta-private-pool-v2-test-token",
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(authPort),
    VANTA_PRIVATE_POOL_V2_STORE_PATH: join(tempRoot, "authenticated-store.json"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await requestJsonAt(authBaseUrl, "/health");
      if (response.ok) {
        break;
      }
    } catch {
      // Server still booting.
    }
    await sleep(250);
  }

  const unauthenticatedStatus = await requestJsonAt(authBaseUrl, "/state/private-pool-v2-status");
  assert(unauthenticatedStatus.status === 401, "Expected auth-protected status endpoint.");
  const authenticatedStatus = await requestJsonAt(authBaseUrl, "/state/private-pool-v2-status", {
    headers: { Authorization: "Bearer vanta-private-pool-v2-test-token" },
  });
  assert(authenticatedStatus.ok, authenticatedStatus.text || "Expected authenticated status.");
  console.log("private-pool-v2 bearer auth: PASS");
} finally {
  if (authenticatedServer.exitCode === null) {
    await new Promise((resolvePromise) => {
      authenticatedServer.once("close", resolvePromise);
      authenticatedServer.kill("SIGTERM");
    });
  }
}

const server = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port),
    VANTA_PRIVATE_POOL_V2_STORE_PATH: storePath,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
let stdout = "";
server.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
server.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

try {
  await waitForHealth();

  const status = await requestJson("/state/private-pool-v2-status");
  assert(status.ok, status.text || "Expected operator status response.");
  assert(status.parsed?.productionReady === false, "Expected operator status to be explicit about production readiness.");
  assert(status.parsed?.surfaces?.verifierRegistry === "ready", "Expected verifierRegistry ready.");
  assert(
    status.parsed?.storage?.durableStoreConfigured === true,
    "Expected operator status to expose configured durable storage.",
  );
  assert(
    status.parsed?.settlementPolicy?.failClosedValidation === true,
    "Expected fail-closed settlement validation policy.",
  );
  assert(
    status.parsed?.settlementPolicy?.identicalReplayIdempotency === true,
    "Expected identical settlement replay idempotency policy.",
  );
  assert(
    status.parsed?.settlementPolicy?.conflictingReplayRejection === true,
    "Expected conflicting settlement replay rejection policy.",
  );
  assert(
    status.parsed?.settlementPolicy?.restartSafeSettlementReceipts === true,
    "Expected restart-safe settlement receipt policy.",
  );
  assert(
    status.parsed?.settlementPolicy?.productionDurableStoreRequired === true,
    "Expected production durable-store settlement policy.",
  );
  assert(
    status.parsed?.protocolActionProofModes?.shield === "shield_circuit_request",
    "Expected shield protocol action proof mode.",
  );
  assert(
    status.parsed?.protocolActionProofModes?.unshield === "claim_circuit_request",
    "Expected unshield protocol action proof mode.",
  );
  assert(
    status.parsed?.protocolActionProofModes?.send === "operator_local_transfer_request",
    "Expected send protocol action proof mode.",
  );
  assert(
    status.parsed?.protocolActionProofModes?.swap === "operator_local_swap_request",
    "Expected swap protocol action proof mode.",
  );
  console.log("private-pool-v2 http status: PASS");

  const emptyReceipts = await requestJson("/state/private-pool-v2-receipts");
  assert(emptyReceipts.ok, emptyReceipts.text || "Expected receipts response.");
  assert(emptyReceipts.parsed?.receiptCount === 0, "Expected empty receipt state.");
  console.log("private-pool-v2 http empty receipts: PASS");

  const malformedPaySettlement = await requestJson("/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      kind: "checkout",
      session: {
        amount: "1.00",
        currency: "USDC",
        id: "vcs_malformed_missing_client_token",
        merchantId: "mrc_123",
      },
    }),
    method: "POST",
  });
  assert(!malformedPaySettlement.ok, "Expected malformed Pay settlement to be rejected.");
  assert(
    String(malformedPaySettlement.parsed?.error ?? "").includes("clientToken"),
    malformedPaySettlement.text || "Expected malformed Pay settlement validation error.",
  );

  const malformedProtocolSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "1.00",
      asset: "USDC",
      owner: "owner-public-key",
      settlementId: "protocol-malformed-missing-destination",
    }),
    method: "POST",
  });
  assert(!malformedProtocolSettlement.ok, "Expected malformed protocol settlement to be rejected.");
  assert(
    String(malformedProtocolSettlement.parsed?.error ?? "").includes("destination"),
    malformedProtocolSettlement.text || "Expected malformed protocol settlement validation error.",
  );

  const shieldReceipt = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.shieldProof, request: fixture.shieldRequest }),
    method: "POST",
  });
  assert(shieldReceipt.ok, shieldReceipt.text || "Expected shield proof receipt.");
  assert(shieldReceipt.parsed?.receipt?.intent === "shield", "Expected shield receipt intent.");
  console.log("private-pool-v2 http shield proof: PASS");

  const claimReceipt = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.claimProof, request: fixture.claimRequest }),
    method: "POST",
  });
  assert(claimReceipt.ok, claimReceipt.text || "Expected claim proof receipt.");
  assert(claimReceipt.parsed?.receipt?.intent === "claim", "Expected claim receipt intent.");
  console.log("private-pool-v2 http claim proof: PASS");

  const replay = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.claimProof, request: fixture.claimRequest }),
    method: "POST",
  });
  assert(!replay.ok, "Expected claim replay rejection.");
  assert(
    String(replay.parsed?.error ?? replay.text).includes("already been accepted") ||
      String(replay.parsed?.error ?? replay.text).includes("already registered"),
    replay.text || "Expected replay error.",
  );
  console.log("private-pool-v2 http claim replay rejection: PASS");

  const finalReceipts = await requestJson("/state/private-pool-v2-receipts");
  assert(finalReceipts.ok, finalReceipts.text || "Expected final receipts response.");
  assert(finalReceipts.parsed?.receiptCount === 2, "Expected two accepted receipts.");
  console.log("private-pool-v2 http final receipts: PASS");

  const payCheckoutSettlement = await requestJson("/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      kind: "checkout",
      session: {
        amount: "125.00",
        clientToken: "vtok_operator_http",
        currency: "USDC",
        id: "vcs_operator_http",
        merchantId: "mrc_123",
      },
    }),
    method: "POST",
  });
  assert(payCheckoutSettlement.ok, payCheckoutSettlement.text || "Expected Pay checkout settlement.");
  assert(
    payCheckoutSettlement.parsed?.privateRailReceipt?.proofReceiptId?.startsWith("ppv2_"),
    "Expected Pay checkout private rail proof receipt.",
  );
  assert(
    String(payCheckoutSettlement.parsed?.settlementFingerprint ?? "").startsWith("0x"),
    "Expected Pay checkout settlement fingerprint.",
  );
  console.log("private-pool-v2 http pay checkout settlement: PASS");

  const repeatedPayCheckoutSettlement = await requestJson("/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      kind: "checkout",
      session: {
        amount: "125.00",
        clientToken: "vtok_operator_http",
        currency: "USDC",
        id: "vcs_operator_http",
        merchantId: "mrc_123",
      },
    }),
    method: "POST",
  });
  assert(
    repeatedPayCheckoutSettlement.ok,
    repeatedPayCheckoutSettlement.text || "Expected repeated Pay checkout settlement to be idempotent.",
  );
  assert(
    repeatedPayCheckoutSettlement.parsed?.privateRailReceipt?.id ===
      payCheckoutSettlement.parsed?.privateRailReceipt?.id,
    "Expected repeated Pay checkout settlement to return the existing receipt.",
  );
  const conflictingPayCheckoutSettlement = await requestJson("/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      kind: "checkout",
      session: {
        amount: "126.00",
        clientToken: "vtok_operator_http_conflict",
        currency: "USDC",
        id: "vcs_operator_http",
        merchantId: "mrc_123",
      },
    }),
    method: "POST",
  });
  assert(
    !conflictingPayCheckoutSettlement.ok,
    "Expected conflicting Pay checkout settlement replay to be rejected.",
  );
  assert(
    String(conflictingPayCheckoutSettlement.parsed?.error ?? "").includes("conflicts"),
    conflictingPayCheckoutSettlement.text || "Expected conflicting Pay checkout error.",
  );

  const payWithdrawalSettlement = await requestJson("/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      amount: "25.00",
      asset: "USDC",
      destination: "Treasury",
      kind: "withdrawal",
      merchantId: "mrc_123",
    }),
    method: "POST",
  });
  assert(payWithdrawalSettlement.ok, payWithdrawalSettlement.text || "Expected Pay withdrawal settlement.");
  assert(
    payWithdrawalSettlement.parsed?.privateExitReceipt?.id?.startsWith("pexit_"),
    "Expected Pay withdrawal private exit receipt.",
  );
  assert(
    String(payWithdrawalSettlement.parsed?.settlementFingerprint ?? "").startsWith("0x"),
    "Expected Pay withdrawal settlement fingerprint.",
  );
  const repeatedPayWithdrawalSettlement = await requestJson("/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      amount: "25.00",
      asset: "USDC",
      destination: "Treasury",
      kind: "withdrawal",
      merchantId: "mrc_123",
    }),
    method: "POST",
  });
  assert(
    repeatedPayWithdrawalSettlement.ok,
    repeatedPayWithdrawalSettlement.text || "Expected repeated Pay withdrawal to be idempotent.",
  );
  assert(
    repeatedPayWithdrawalSettlement.parsed?.settlementFingerprint ===
      payWithdrawalSettlement.parsed?.settlementFingerprint,
    "Expected repeated Pay withdrawal to return the existing fingerprint.",
  );
  const conflictingPayWithdrawalSettlement = await requestJson("/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      amount: "26.00",
      asset: "USDC",
      destination: "Treasury",
      kind: "withdrawal",
      merchantId: "mrc_123",
    }),
    method: "POST",
  });
  assert(
    !conflictingPayWithdrawalSettlement.ok,
    "Expected conflicting Pay withdrawal replay to be rejected.",
  );
  assert(
    String(conflictingPayWithdrawalSettlement.parsed?.error ?? "").includes("conflicts"),
    conflictingPayWithdrawalSettlement.text || "Expected conflicting Pay withdrawal error.",
  );
  console.log("private-pool-v2 http pay withdrawal settlement: PASS");

  const paySettlementReceipts = await requestJson("/state/private-pool-v2-receipts");
  assert(paySettlementReceipts.ok, paySettlementReceipts.text || "Expected Pay settlement receipts.");
  assert(paySettlementReceipts.parsed?.receiptCount === 4, "Expected four accepted receipts.");
  assert(
    paySettlementReceipts.parsed?.paySettlementCount === 2,
    "Expected two operator-owned Pay settlement receipts.",
  );
  console.log("private-pool-v2 http pay settlement receipts: PASS");

  for (const action of ["shield", "send", "swap", "unshield"]) {
    const isShield = action === "shield";
    const protocolSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
      body: JSON.stringify({
        action,
        amount: action === "swap" ? "10.00" : "5.00",
        asset: isShield ? "BONK" : "USDC",
        destination: action === "unshield" ? "Treasury" : "recipient-public-key",
        owner: "owner-public-key",
        settlementId: `protocol-${action}-settlement`,
        ...(isShield
          ? {
              shieldCapability: {
                blockers: [],
                mode: "route-to-configured-shield-token",
                requiresPublicRoute: true,
                sourceAsset: {
                  mintAddress: "mint:bonk",
                  symbol: "BONK",
                },
                supportsDirectShield: false,
                targetShieldAsset: {
                  assetKey: "USDC",
                  label: "Shielded USDC",
                  mintAddress: "mint:usdc",
                  name: "USD Coin",
                },
              },
              shieldRouteEvidence: {
                provider: "jupiter",
                routeSignature: "route-sig-bonk-to-usdc",
                targetAmount: "5.00",
                targetAsset: "USDC",
              },
            }
          : {}),
      }),
      method: "POST",
    });
    assert(protocolSettlement.ok, protocolSettlement.text || `Expected ${action} protocol settlement.`);
    assert(
      protocolSettlement.parsed?.protocolSettlementReceipt?.action === action,
      `Expected ${action} protocol settlement receipt.`,
    );
    assert(
      String(protocolSettlement.parsed?.settlementFingerprint ?? "").startsWith("0x"),
      `Expected ${action} protocol settlement fingerprint.`,
    );

    if (isShield) {
      assert(
        protocolSettlement.parsed?.protocolSettlementReceipt?.sourceAsset === "BONK",
        "Expected shield protocol receipt to preserve source asset.",
      );
      assert(
        protocolSettlement.parsed?.protocolSettlementReceipt?.targetAsset === "USDC",
        "Expected shield protocol receipt to preserve target shield asset.",
      );
      assert(
        protocolSettlement.parsed?.protocolSettlementReceipt?.shieldCapabilityMode ===
          "route-to-configured-shield-token",
        "Expected shield protocol receipt to preserve capability mode.",
      );
      assert(
        protocolSettlement.parsed?.proofReceipt?.assetId === "USDC",
        "Expected routed shield proof receipt to bind target shield asset.",
      );
      assert(
        protocolSettlement.parsed?.protocolSettlementReceipt?.routeProvider === "jupiter",
        "Expected shield protocol receipt to preserve route evidence provider.",
      );
    }
  }
  const missingRouteEvidenceShieldSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "5.00",
      asset: "BONK",
      destination: "recipient-public-key",
      owner: "owner-public-key",
      settlementId: "protocol-shield-missing-route-evidence",
      shieldCapability: {
        blockers: [],
        mode: "route-to-configured-shield-token",
        requiresPublicRoute: true,
        sourceAsset: {
          mintAddress: "mint:bonk",
          symbol: "BONK",
        },
        supportsDirectShield: false,
        targetShieldAsset: {
          assetKey: "USDC",
          label: "Shielded USDC",
          mintAddress: "mint:usdc",
          name: "USD Coin",
        },
      },
    }),
    method: "POST",
  });
  assert(
    !missingRouteEvidenceShieldSettlement.ok,
    "Expected routed shield settlement without route evidence to be rejected.",
  );
  assert(
    String(missingRouteEvidenceShieldSettlement.parsed?.error ?? "").includes("shieldRouteEvidence"),
    missingRouteEvidenceShieldSettlement.text || "Expected missing route evidence error.",
  );
  const repeatedProtocolShieldSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "5.00",
      asset: "BONK",
      destination: "recipient-public-key",
      owner: "owner-public-key",
      settlementId: "protocol-shield-settlement",
      shieldCapability: {
        blockers: [],
        mode: "route-to-configured-shield-token",
        requiresPublicRoute: true,
        sourceAsset: {
          mintAddress: "mint:bonk",
          symbol: "BONK",
        },
        supportsDirectShield: false,
        targetShieldAsset: {
          assetKey: "USDC",
          label: "Shielded USDC",
          mintAddress: "mint:usdc",
          name: "USD Coin",
        },
      },
      shieldRouteEvidence: {
        provider: "jupiter",
        routeSignature: "route-sig-bonk-to-usdc",
        targetAmount: "5.00",
        targetAsset: "USDC",
      },
    }),
    method: "POST",
  });
  assert(
    repeatedProtocolShieldSettlement.ok,
    repeatedProtocolShieldSettlement.text || "Expected repeated protocol settlement to be idempotent.",
  );
  assert(
    repeatedProtocolShieldSettlement.parsed?.protocolSettlementReceipt?.settlementId ===
      "protocol-shield-settlement",
    "Expected repeated protocol settlement to return the existing receipt.",
  );
  const conflictingProtocolShieldSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "6.00",
      asset: "BONK",
      destination: "recipient-public-key",
      owner: "owner-public-key",
      settlementId: "protocol-shield-settlement",
      shieldCapability: {
        blockers: [],
        mode: "route-to-configured-shield-token",
        requiresPublicRoute: true,
        sourceAsset: {
          mintAddress: "mint:bonk",
          symbol: "BONK",
        },
        supportsDirectShield: false,
        targetShieldAsset: {
          assetKey: "USDC",
          label: "Shielded USDC",
          mintAddress: "mint:usdc",
          name: "USD Coin",
        },
      },
      shieldRouteEvidence: {
        provider: "jupiter",
        routeSignature: "route-sig-bonk-to-usdc",
        targetAmount: "5.00",
        targetAsset: "USDC",
      },
    }),
    method: "POST",
  });
  assert(
    !conflictingProtocolShieldSettlement.ok,
    "Expected conflicting protocol settlement replay to be rejected.",
  );
  assert(
    String(conflictingProtocolShieldSettlement.parsed?.error ?? "").includes("conflicts"),
    conflictingProtocolShieldSettlement.text || "Expected conflicting protocol settlement error.",
  );
  const protocolSettlementReceipts = await requestJson("/state/private-pool-v2-receipts");
  assert(protocolSettlementReceipts.ok, protocolSettlementReceipts.text || "Expected protocol receipts.");
  assert(protocolSettlementReceipts.parsed?.receiptCount === 8, "Expected no duplicate proof receipts.");
  assert(
    protocolSettlementReceipts.parsed?.protocolSettlementCount === 4,
    "Expected four operator-owned protocol settlement receipts.",
  );
  console.log("private-pool-v2 http protocol settlements: PASS");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  if (stdout.trim()) {
    console.error(stdout.trim());
  }
  if (stderr.trim()) {
    console.error(stderr.trim());
  }
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  rmSync(tempRoot, { recursive: true, force: true });
}

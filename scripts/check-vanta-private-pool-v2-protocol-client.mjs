import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-protocol-client-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const storePath = join(tempRoot, "private-pool-v2-protocol-client.json");
const port = 10780 + Math.floor(Math.random() * 300);
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

async function assertRejects(operation, expectedMessage, message) {
  try {
    await operation();
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes(expectedMessage),
      `${message} Expected error to include "${expectedMessage}", received "${
        error instanceof Error ? error.message : String(error)
      }".`,
    );
    return;
  }

  throw new Error(`${message} Expected request to be rejected.`);
}

function compileClient() {
  mkdirSync(tempTsDir, { recursive: true });
  writeFileSync(
    join(tempTsDir, "privatePoolV2ProtocolSettlementClient.ts"),
    readFileSync(resolve(repoRoot, "src/privacy/privatePoolV2ProtocolSettlementClient.ts"), "utf8"),
  );
  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      join(tempTsDir, "privatePoolV2ProtocolSettlementClient.ts"),
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
}

compileClient();

const server = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "vanta-private-pool-v2-client-test-token",
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

  const {
    fetchVantaPrivatePoolV2OperatorStatus,
    fetchVantaPrivatePoolV2ProtocolSettlementStatus,
    requestVantaPrivatePoolV2ProtocolSettlement,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProtocolSettlementClient.js")).href);

  const authToken = "vanta-private-pool-v2-client-test-token";
  const operatorStatus = await fetchVantaPrivatePoolV2OperatorStatus({ authToken, baseUrl });
  assert(
    operatorStatus?.settlementPolicy?.conflictingReplayRejection === true,
    "Expected typed client to read conflicting replay rejection policy.",
  );

  const emptyStatus = await fetchVantaPrivatePoolV2ProtocolSettlementStatus({ authToken, baseUrl });
  assert(emptyStatus?.protocolSettlementCount === 0, "Expected empty protocol settlement status.");

  const settlementRequests = [
    {
      action: "shield",
      amount: "12.00",
      asset: "BONK",
      authToken,
      baseUrl,
      destination: "protocol-client-destination",
      owner: "protocol-client-owner",
      settlementId: "protocol-client-shield",
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
        routeSignature: "typed-client-route-sig-bonk-to-usdc",
        targetAmount: "12.00",
        targetAsset: "USDC",
      },
    },
    {
      action: "send",
      amount: "4.00",
      asset: "USDC",
      authToken,
      baseUrl,
      destination: "protocol-client-send-destination",
      owner: "protocol-client-owner",
      settlementId: "protocol-client-send",
    },
    {
      action: "swap",
      amount: "5.00",
      asset: "USDC",
      authToken,
      baseUrl,
      destination: "protocol-client-swap-destination",
      owner: "protocol-client-owner",
      settlementId: "protocol-client-swap",
    },
    {
      action: "unshield",
      amount: "3.00",
      asset: "USDC",
      authToken,
      baseUrl,
      destination: "protocol-client-unshield-destination",
      owner: "protocol-client-owner",
      settlementId: "protocol-client-unshield",
    },
  ];
  const settlements = [];

  for (const settlementRequest of settlementRequests) {
    const settlement = await requestVantaPrivatePoolV2ProtocolSettlement(settlementRequest);
    assert(
      settlement?.protocolSettlementReceipt?.proofReceiptId?.startsWith("ppv2_"),
      `Expected ${settlementRequest.action} settlement to return a ppv2 proof receipt.`,
    );
    assert(
      settlement?.protocolSettlementReceipt?.action === settlementRequest.action,
      `Expected ${settlementRequest.action} settlement receipt to preserve action.`,
    );
    assert(
      settlement?.protocolSettlementReceipt?.settlementId === settlementRequest.settlementId,
      `Expected ${settlementRequest.action} settlement receipt to preserve settlement id.`,
    );
    assert(
      settlement?.protocolSettlementReceipt?.status === "confirmed",
      `Expected ${settlementRequest.action} settlement receipt to be confirmed.`,
    );
    assert(
      settlement?.proofReceipt?.receiptId,
      `Expected ${settlementRequest.action} settlement to include an operator proof receipt.`,
    );
    if (settlementRequest.action === "shield" || settlementRequest.action === "unshield") {
      assert(
        settlement?.proofReceipt?.shadowCommitments?.scheme ===
          "vanta-private-pool-v2-shadow-operator-visible-terms-sha256-0.1",
        `Expected ${settlementRequest.action} settlement proof receipt to include shadow commitment scheme.`,
      );
      assert(
        settlement?.proofReceipt?.shadowCommitments?.operatorVisibleTermsCommitment?.startsWith("0x"),
        `Expected ${settlementRequest.action} settlement proof receipt to include operator-visible terms shadow commitment.`,
      );
    }

    const idempotentSettlement = await requestVantaPrivatePoolV2ProtocolSettlement(settlementRequest);
    assert(
      idempotentSettlement?.protocolSettlementReceipt?.id === settlement.protocolSettlementReceipt.id,
      `Expected repeated ${settlementRequest.action} settlement to return the same receipt id.`,
    );
    assert(
      idempotentSettlement?.protocolSettlementReceipt?.proofReceiptId ===
        settlement.protocolSettlementReceipt.proofReceiptId,
      `Expected repeated ${settlementRequest.action} settlement to return the same proof receipt id.`,
    );

    await assertRejects(
      () =>
        requestVantaPrivatePoolV2ProtocolSettlement({
          ...settlementRequest,
          amount: "99.00",
        }),
      "conflicts with an existing settlement amount",
      `Expected conflicting ${settlementRequest.action} replay to be rejected.`,
    );

    settlements.push(settlement);
  }

  const shieldSettlement = settlements.find(
    (settlement) => settlement.protocolSettlementReceipt.action === "shield",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.sourceAsset === "BONK",
    "Expected typed protocol settlement client to preserve source asset.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.targetAsset === "USDC",
    "Expected typed protocol settlement client to preserve target shield asset.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.routeProvider === "jupiter",
    "Expected typed protocol settlement client to preserve route evidence.",
  );

  const finalStatus = await fetchVantaPrivatePoolV2ProtocolSettlementStatus({ authToken, baseUrl });
  assert(
    finalStatus?.protocolSettlementCount === settlementRequests.length,
    "Expected typed status to report every protocol settlement.",
  );
  assert(
    finalStatus?.protocolSettlements?.length === settlementRequests.length,
    "Expected typed status to include every protocol settlement.",
  );
  assert(
    finalStatus?.receiptCount === settlementRequests.length,
    "Expected one accepted proof receipt per protocol settlement in typed status.",
  );
  assert(
    finalStatus?.receipts?.length === settlementRequests.length,
    "Expected typed status receipts to include every protocol proof receipt.",
  );

  const statusSettlementIds = new Set(
    finalStatus.protocolSettlements.map(
      (settlement) => settlement.protocolSettlementReceipt?.settlementId,
    ),
  );
  const statusProofReceiptIds = new Set(
    finalStatus.receipts.map((receipt) => `ppv2_${receipt.receiptId.slice(2, 26)}`),
  );

  for (const settlementRequest of settlementRequests) {
    const settlement = settlements.find(
      (candidate) =>
        candidate.protocolSettlementReceipt.settlementId === settlementRequest.settlementId,
    );
    assert(
      statusSettlementIds.has(settlementRequest.settlementId),
      `Expected typed status to include ${settlementRequest.action} settlement.`,
    );
    assert(
      statusProofReceiptIds.has(settlement.protocolSettlementReceipt.proofReceiptId),
      `Expected typed status receipts to include ${settlementRequest.action} proof receipt.`,
    );
    if (settlementRequest.action === "shield" || settlementRequest.action === "unshield") {
      const statusReceipt = finalStatus.receipts.find(
        (receipt) =>
          `ppv2_${receipt.receiptId.slice(2, 26)}` ===
          settlement.protocolSettlementReceipt.proofReceiptId,
      );
      assert(
        statusReceipt?.shadowCommitments?.operatorVisibleTermsCommitment ===
          settlement.proofReceipt.shadowCommitments.operatorVisibleTermsCommitment,
        `Expected typed status receipts to preserve ${settlementRequest.action} shadow commitment.`,
      );
    }
  }

  const finalOperatorStatus = await fetchVantaPrivatePoolV2OperatorStatus({ authToken, baseUrl });
  assert(
    finalOperatorStatus?.receiptCount === settlementRequests.length,
    "Expected typed operator status to report every protocol proof receipt.",
  );
  assert(
    finalOperatorStatus?.shadowCommitmentCount === 2,
    "Expected typed operator status to report shield and claim shadow commitments.",
  );

  console.log("private-pool-v2 protocol settlement client: PASS");
} finally {
  if (server.exitCode === null) {
    await new Promise((resolvePromise) => {
      server.once("close", resolvePromise);
      server.kill("SIGTERM");
    });
  }
  rmSync(tempRoot, { force: true, recursive: true });

  if (server.exitCode && server.exitCode !== 0) {
    process.stderr.write(stdout);
    process.stderr.write(stderr);
  }
}

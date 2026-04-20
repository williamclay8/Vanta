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

  const shieldSettlement = await requestVantaPrivatePoolV2ProtocolSettlement({
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
  });
  assert(
    shieldSettlement?.protocolSettlementReceipt?.proofReceiptId?.startsWith("ppv2_"),
    "Expected typed protocol settlement client to return a ppv2 proof receipt.",
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
  assert(finalStatus?.receiptCount === 1, "Expected one accepted proof receipt in typed status.");
  assert(
    finalStatus?.protocolSettlements?.[0]?.protocolSettlementReceipt?.settlementId ===
      "protocol-client-shield",
    "Expected typed status to include the protocol settlement receipt.",
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

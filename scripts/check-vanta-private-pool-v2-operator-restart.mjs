import { execFileSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-restart-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const storePath = join(tempRoot, "private-pool-v2-receipts.json");
const port = 10180 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;
const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2LocalIndexer.ts",
  "privatePoolV2LocalProver.ts",
];

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
  const previousRoot = await indexer.getCurrentRoot("vanta-restart-tree");
  const firstCommitment = indexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:restart-shield-output-commitment",
    treeId: "vanta-restart-tree",
  });
  const secondPreviousRoot = await indexer.getCurrentRoot("vanta-restart-tree");
  const secondCommitment = indexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:restart-second-shield-output-commitment",
    treeId: "vanta-restart-tree",
  });
  const merkleProof = await indexer.getMerkleProof(firstCommitment.commitment);
  const prover = createVantaPrivatePoolV2LocalProver();
  const shieldRequest = createVantaPrivatePoolV2ShieldProofRequest({
    amountBaseUnits: 2_000_000n,
    ownerCommitment: "field:restart-owner",
    previousRoot,
    routeCommitment: "field:restart-route",
    sourceMintAddress: "mint:restart-public-usdc",
    targetAssetId: "USDC",
    targetMintAddress: "mint:restart-shielded-usdc",
    treeCommitment: firstCommitment,
  });
  const secondShieldRequest = createVantaPrivatePoolV2ShieldProofRequest({
    amountBaseUnits: 3_000_000n,
    ownerCommitment: "field:restart-second-owner",
    previousRoot: secondPreviousRoot,
    routeCommitment: "field:restart-second-route",
    sourceMintAddress: "mint:restart-public-usdc",
    targetAssetId: "USDC",
    targetMintAddress: "mint:restart-shielded-usdc",
    treeCommitment: secondCommitment,
  });
  const quote = {
    estimatedFeeBaseUnits: 100n,
    expiresAtSlot: 1_000_150n,
    relayerId: "relayer:restart",
  };
  const claimRequest = createVantaPrivatePoolV2ClaimProofRequest({
    amountBaseUnits: 2_000_000n,
    destinationAddress: "restart-recipient-public-address",
    merkleProof,
    nullifier: "field:restart-nullifier",
    ownerCommitment: "field:restart-owner",
    quote,
  });

  return {
    claimProof: await prover.prove(claimRequest),
    claimRequest,
    secondShieldProof: await prover.prove(secondShieldRequest),
    secondShieldRequest,
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

function startServer() {
  const child = spawn("node", ["operator/private-pool-v2-server.mjs"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port),
      VANTA_PRIVATE_POOL_V2_STORE_PATH: storePath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logs = { stderr: "", stdout: "" };
  child.stdout.on("data", (chunk) => {
    logs.stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    logs.stderr += chunk.toString("utf8");
  });

  return { child, logs };
}

async function stopServer(server) {
  if (server.child.exitCode !== null) {
    return;
  }

  await new Promise((resolvePromise) => {
    server.child.once("close", resolvePromise);
    server.child.kill("SIGTERM");
  });
}

const fixture = await loadFixtureRuntime();
let server = startServer();

try {
  await waitForHealth();

  const shieldReceipt = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.shieldProof, request: fixture.shieldRequest }),
    method: "POST",
  });
  assert(shieldReceipt.ok, shieldReceipt.text || "Expected shield proof receipt.");

  const claimReceipt = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.claimProof, request: fixture.claimRequest }),
    method: "POST",
  });
  assert(claimReceipt.ok, claimReceipt.text || "Expected claim proof receipt.");

  const payCheckoutSettlement = await requestJson("/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      kind: "checkout",
      session: {
        amount: "42.00",
        clientToken: "vtok_restart",
        currency: "USDC",
        id: "vcs_restart",
        merchantId: "mrc_restart",
      },
    }),
    method: "POST",
  });
  assert(
    payCheckoutSettlement.ok,
    payCheckoutSettlement.text || "Expected Pay checkout settlement before restart.",
  );

  const protocolShieldSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "7.00",
      asset: "USDC",
      destination: "restart-protocol-destination",
      owner: "restart-protocol-owner",
      settlementId: "protocol-restart-shield",
    }),
    method: "POST",
  });
  assert(
    protocolShieldSettlement.ok,
    protocolShieldSettlement.text || "Expected protocol shield settlement before restart.",
  );
  assert(existsSync(storePath), "Expected private-pool-v2 receipt store to be written.");
  const writtenStore = JSON.parse(readFileSync(storePath, "utf8"));
  assert(writtenStore.stateVersion === 2, "Expected private-pool-v2 receipt store schema v2.");
  assert(
    writtenStore.settlementPolicy?.version === "vanta-private-pool-v2-settlement-policy-0.1",
    "Expected private-pool-v2 receipt store settlement policy version.",
  );
  assert(
    writtenStore.paySettlements?.[0]?.settlementFingerprint?.startsWith("0x"),
    "Expected persisted Pay settlement fingerprint.",
  );
  assert(
    writtenStore.protocolSettlements?.[0]?.settlementFingerprint?.startsWith("0x"),
    "Expected persisted protocol settlement fingerprint.",
  );
  console.log("private-pool-v2 restart store write: PASS");

  await stopServer(server);
  server = startServer();
  await waitForHealth();

  const restoredReceipts = await requestJson("/state/private-pool-v2-receipts");
  assert(restoredReceipts.ok, restoredReceipts.text || "Expected restored receipts response.");
  assert(restoredReceipts.parsed?.receiptCount === 4, "Expected four restored receipts.");
  assert(
    restoredReceipts.parsed?.paySettlementCount === 1,
    "Expected one restored Pay settlement receipt.",
  );
  assert(
    restoredReceipts.parsed?.protocolSettlementCount === 1,
    "Expected one restored protocol settlement receipt.",
  );
  console.log("private-pool-v2 restart receipts restored: PASS");

  const repeatedPayCheckoutSettlement = await requestJson("/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      kind: "checkout",
      session: {
        amount: "42.00",
        clientToken: "vtok_restart",
        currency: "USDC",
        id: "vcs_restart",
        merchantId: "mrc_restart",
      },
    }),
    method: "POST",
  });
  assert(
    repeatedPayCheckoutSettlement.ok,
    repeatedPayCheckoutSettlement.text ||
      "Expected restored Pay checkout settlement to be idempotent.",
  );

  const conflictingProtocolSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "8.00",
      asset: "USDC",
      destination: "restart-protocol-destination",
      owner: "restart-protocol-owner",
      settlementId: "protocol-restart-shield",
    }),
    method: "POST",
  });
  assert(
    !conflictingProtocolSettlement.ok,
    "Expected restored protocol settlement conflict to be rejected.",
  );
  assert(
    String(conflictingProtocolSettlement.parsed?.error ?? "").includes("conflicts"),
    conflictingProtocolSettlement.text || "Expected restored settlement conflict error.",
  );

  const restoredStatus = await requestJson("/state/private-pool-v2-status");
  assert(restoredStatus.ok, restoredStatus.text || "Expected restored status response.");
  assert(restoredStatus.parsed?.receiptCount === 4, "Expected restored status receipt count.");
  assert(
    restoredStatus.parsed?.nullifierReplayGuard?.mode ===
      "claim-preflight-and-accepted-reservation",
    "Expected restored status to expose nullifier replay guard mode.",
  );
  console.log("private-pool-v2 restart status restored: PASS");

  const secondShieldReceipt = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({
      proof: fixture.secondShieldProof,
      request: fixture.secondShieldRequest,
    }),
    method: "POST",
  });
  assert(
    secondShieldReceipt.ok,
    secondShieldReceipt.text || "Expected second shield proof receipt after restart.",
  );
  assert(
    secondShieldReceipt.parsed?.receipt?.intent === "shield",
    "Expected second shield receipt intent.",
  );
  console.log("private-pool-v2 restart commitment tree restored: PASS");

  const replay = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.claimProof, request: fixture.claimRequest }),
    method: "POST",
  });
  assert(!replay.ok, "Expected restarted operator to reject claim replay.");
  assert(
    String(replay.parsed?.error ?? replay.text).includes("already been accepted") ||
      String(replay.parsed?.error ?? replay.text).includes("already registered") ||
      String(replay.parsed?.error ?? replay.text).includes("nullifier replay rejected"),
    replay.text || "Expected restarted replay error.",
  );
  console.log("private-pool-v2 restart claim replay rejection: PASS");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  if (server.logs.stdout.trim()) {
    console.error(server.logs.stdout.trim());
  }
  if (server.logs.stderr.trim()) {
    console.error(server.logs.stderr.trim());
  }
  process.exitCode = 1;
} finally {
  await stopServer(server);
  rmSync(tempRoot, { recursive: true, force: true });
}

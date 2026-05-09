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
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

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
const textEncoder = new TextEncoder();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function hashHex(...parts) {
  return `0x${bytesToHex(sha256(textEncoder.encode(parts.join("\u001f"))))}`;
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
    {
      createVantaPrivatePoolV2ClaimProofRequest,
      createVantaPrivatePoolV2SendProofRequest,
      createVantaPrivatePoolV2ShieldProofRequest,
      createVantaPrivatePoolV2SwapToShieldedProofRequest,
      createVantaPrivatePoolV2UnshieldProofRequest,
    },
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
  const sendRecipientCommitment = indexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:restart-send-recipient-output-commitment",
    treeId: "vanta-restart-tree",
  });
  const sendChangeCommitment = indexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:restart-send-change-output-commitment",
    treeId: "vanta-restart-tree",
  });
  const swapOutputCommitment = indexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:restart-swap-output-commitment",
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
  const sendRequest = createVantaPrivatePoolV2SendProofRequest({
    assetIdCommitment: "field:restart-send-asset-id-commitment",
    changeLeafIndex: String(sendChangeCommitment.leafIndex),
    changeOutputCommitment: sendChangeCommitment.commitment,
    changeOutputRoot: sendChangeCommitment.merkleRoot,
    economicsCommitment: "field:restart-send-economics-commitment",
    inputCommitment: secondCommitment.commitment,
    inputRoot: secondCommitment.merkleRoot,
    nullifier: "field:restart-send-nullifier",
    ownerCommitment: "field:restart-second-owner",
    recipientLeafIndex: String(sendRecipientCommitment.leafIndex),
    recipientOutputCommitment: sendRecipientCommitment.commitment,
    recipientOutputRoot: sendRecipientCommitment.merkleRoot,
    sendContextTag: "field:restart-send-context-tag",
    sendPublicInputHash: "field:restart-send-public-input-hash",
  });
  const swapRequest = createVantaPrivatePoolV2SwapToShieldedProofRequest({
    economicsCommitment: "field:restart-swap-economics-commitment",
    inputCommitment: sendRecipientCommitment.commitment,
    inputRoot: sendChangeCommitment.merkleRoot,
    nullifierOrReplayCommitment: "field:restart-swap-nullifier",
    outputCommitment: swapOutputCommitment.commitment,
    outputLeafIndex: String(swapOutputCommitment.leafIndex),
    outputRoot: swapOutputCommitment.merkleRoot,
    ownerCommitment: "field:restart-swap-owner-commitment",
    routeCommitment: "field:restart-swap-route-commitment",
    settlementCommitment: "field:restart-swap-settlement-commitment",
    swapContextTag: "field:restart-swap-context-tag",
    swapPublicInputHash: "field:restart-swap-public-input-hash",
  });
  const unshieldRequest = createVantaPrivatePoolV2UnshieldProofRequest({
    economicsCommitment: "field:restart-unshield-economics-commitment",
    exitTermsCommitment: "field:restart-unshield-exit-terms-commitment",
    inputCommitment: swapOutputCommitment.commitment,
    inputRoot: swapOutputCommitment.merkleRoot,
    nullifierOrReplayCommitment: "field:restart-unshield-nullifier",
    ownerCommitment: "field:restart-unshield-owner-commitment",
    routeCommitment: "field:restart-unshield-route-commitment",
    settlementCommitment: "field:restart-unshield-settlement-commitment",
    unshieldContextTag: "field:restart-unshield-context-tag",
    unshieldPublicInputHash: "field:restart-unshield-public-input-hash",
  });

  return {
    claimProof: await prover.prove(claimRequest),
    claimRequest,
    sendProof: await prover.prove(sendRequest),
    sendRequest,
    secondShieldProof: await prover.prove(secondShieldRequest),
    secondShieldRequest,
    shieldProof: await prover.prove(shieldRequest),
    shieldRequest,
    swapProof: await prover.prove(swapRequest),
    swapRequest,
    unshieldProof: await prover.prove(unshieldRequest),
    unshieldRequest,
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

  const secondShieldReceipt = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({
      proof: fixture.secondShieldProof,
      request: fixture.secondShieldRequest,
    }),
    method: "POST",
  });
  assert(
    secondShieldReceipt.ok,
    secondShieldReceipt.text || "Expected second shield proof receipt before restart.",
  );
  assert(
    secondShieldReceipt.parsed?.receipt?.intent === "shield",
    "Expected second shield receipt intent.",
  );

  const sendReceipt = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.sendProof, request: fixture.sendRequest }),
    method: "POST",
  });
  assert(sendReceipt.ok, sendReceipt.text || "Expected private-send proof receipt before restart.");

  const swapReceipt = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.swapProof, request: fixture.swapRequest }),
    method: "POST",
  });
  assert(
    swapReceipt.ok,
    swapReceipt.text || "Expected swap-to-shielded proof receipt before restart.",
  );

  const unshieldReceipt = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.unshieldProof, request: fixture.unshieldRequest }),
    method: "POST",
  });
  assert(
    unshieldReceipt.ok,
    unshieldReceipt.text || "Expected unshield proof receipt before restart.",
  );
  console.log("private-pool-v2 restart committed transitions accepted: PASS");

  const rejectedPayCheckoutSettlement = await requestJson("/private-pool-v2/pay-settlements", {
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
    !rejectedPayCheckoutSettlement.ok &&
      rejectedPayCheckoutSettlement.status === 410 &&
      String(rejectedPayCheckoutSettlement.parsed?.error ?? "").includes(
        "Legacy raw Pay settlements are disabled",
      ),
    rejectedPayCheckoutSettlement.text || "Expected raw Pay checkout settlement to fail closed.",
  );

  const protocolShieldSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "7.00",
      asset: "USDC",
      destination: "restart-protocol-destination",
      owner: "restart-protocol-owner",
      settlementId: "protocol-restart-shield",
      shieldSettlementEvidence: {
        depositSignature: "restart-protocol-deposit-signature",
        owner: "restart-protocol-owner",
        stateSignature: "protocol-restart-shield",
        vaultOwner: "restart-protocol-vault-owner",
      },
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
  assert(writtenStore.paySettlements?.length === 0, "Expected no persisted raw Pay settlements.");
  assert(
    writtenStore.protocolSettlements?.[0]?.settlementFingerprint?.startsWith("0x"),
    "Expected persisted protocol settlement fingerprint.",
  );
  assert(
    writtenStore.commitments?.some(
      (commitment) =>
        commitment.commitment === "field:restart-send-recipient-output-commitment",
    ),
    "Expected persisted private-send recipient output commitment.",
  );
  assert(
    writtenStore.commitments?.some(
      (commitment) => commitment.commitment === "field:restart-send-change-output-commitment",
    ),
    "Expected persisted private-send change output commitment.",
  );
  assert(
    writtenStore.commitments?.some(
      (commitment) => commitment.commitment === "field:restart-swap-output-commitment",
    ),
    "Expected persisted swap-to-shielded output commitment.",
  );
  assert(
    writtenStore.nullifiers?.some((record) => record.nullifier === "field:restart-send-nullifier"),
    "Expected persisted private-send nullifier.",
  );
  assert(
    writtenStore.nullifiers?.some((record) => record.nullifier === "field:restart-swap-nullifier"),
    "Expected persisted swap-to-shielded nullifier.",
  );
  assert(
    writtenStore.nullifiers?.some(
      (record) => record.nullifier === "field:restart-unshield-nullifier",
    ),
    "Expected persisted unshield nullifier.",
  );
  writtenStore.protocolSettlements.push({
    kind: "protocol_settlement",
    proofReceipt: {
      assetId: "USDC",
      intent: "private-send",
      proofSystem: "mock",
      publicInputCommitment: "field:restored-protocol-only-public-input-commitment",
      receiptId: "0xrestoredprotocolonlyprivatesendreceipt",
      recordedAtSlot: "90210",
      replayKey: "private-send:field:restored-protocol-only-send-nullifier",
    },
    protocolSettlementReceipt: {
      action: "send",
      id: "proto_restored_protocol_only_send",
      object: "protocol_settlement_receipt",
      proofReceiptId: "ppv2_restoredprotocolonly",
      proofReceiptPublicInputCommitment: "field:restored-protocol-only-public-input-commitment",
      settlementId: "protocol-restored-only-send",
      status: "confirmed",
    },
    settlementFingerprint: "0xrestoredprotocolonlysendfingerprint",
  });
  writeFileSync(storePath, JSON.stringify(writtenStore, null, 2));
  console.log("private-pool-v2 restart store write: PASS");

  await stopServer(server);
  server = startServer();
  await waitForHealth();

  const restoredReceipts = await requestJson("/state/private-pool-v2-receipts");
  assert(restoredReceipts.ok, restoredReceipts.text || "Expected restored receipts response.");
  assert(restoredReceipts.parsed?.receiptCount === 7, "Expected seven restored receipts.");
  assert(
    restoredReceipts.parsed?.paySettlementCount === 0,
    "Expected zero restored raw Pay settlement receipts.",
  );
  assert(
    restoredReceipts.parsed?.protocolSettlementCount === 2,
    "Expected two restored protocol settlement receipts.",
  );
  console.log("private-pool-v2 restart receipts restored: PASS");

  const restoredProtocolOnlyReplay = await requestJson("/private-pool-v2/nullifier-replay-checks", {
    body: JSON.stringify({
      intent: "private-send",
      nullifier: "field:restored-protocol-only-send-nullifier",
      requestId: "protocol-restored-only-send-review-probe",
    }),
    method: "POST",
  });
  assert(
    restoredProtocolOnlyReplay.ok,
    restoredProtocolOnlyReplay.text ||
      "Expected restored protocol-only nullifier replay check response.",
  );
  assert(
    restoredProtocolOnlyReplay.parsed?.accepted === false &&
      restoredProtocolOnlyReplay.parsed?.decision?.replay === true,
    restoredProtocolOnlyReplay.text ||
      "Expected protocol-only restored proof receipt nullifier to reject duplicate replay.",
  );
  console.log("private-pool-v2 restart protocol settlement replay guard backfill: PASS");

  const repeatedProtocolShieldSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "7.00",
      asset: "USDC",
      destination: "restart-protocol-destination",
      owner: "restart-protocol-owner",
      settlementId: "protocol-restart-shield",
      shieldSettlementEvidence: {
        depositSignature: "restart-protocol-deposit-signature",
        owner: "restart-protocol-owner",
        stateSignature: "protocol-restart-shield",
        vaultOwner: "restart-protocol-vault-owner",
      },
    }),
    method: "POST",
  });
  assert(
    repeatedProtocolShieldSettlement.ok,
    repeatedProtocolShieldSettlement.text ||
      "Expected restored legacy raw protocol settlement fingerprint to stay idempotent.",
  );

  const conflictingProtocolSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "8.00",
      asset: "USDC",
      destination: "restart-protocol-destination",
      owner: "restart-protocol-owner",
      settlementId: "protocol-restart-shield",
      shieldSettlementEvidence: {
        depositSignature: "restart-protocol-deposit-signature",
        owner: "restart-protocol-owner",
        stateSignature: "protocol-restart-shield",
        vaultOwner: "restart-protocol-vault-owner",
      },
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
  assert(restoredStatus.parsed?.receiptCount === 7, "Expected restored status receipt count.");
  assert(
    restoredStatus.parsed?.nullifierReplayGuard?.mode ===
      "claim-preflight-and-accepted-reservation",
    "Expected restored status to expose nullifier replay guard mode.",
  );
  console.log("private-pool-v2 restart status restored: PASS");

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

  for (const { label, proof, request } of [
    {
      label: "private-send",
      proof: fixture.sendProof,
      request: fixture.sendRequest,
    },
    {
      label: "swap-to-shielded",
      proof: fixture.swapProof,
      request: fixture.swapRequest,
    },
    {
      label: "unshield",
      proof: fixture.unshieldProof,
      request: fixture.unshieldRequest,
    },
  ]) {
    const transitionReplay = await requestJson("/private-pool-v2/proofs", {
      body: encodePayload({ proof, request }),
      method: "POST",
    });
    assert(!transitionReplay.ok, `Expected restarted operator to reject ${label} replay.`);
    assert(
      String(transitionReplay.parsed?.error ?? transitionReplay.text).includes(
        "already been accepted",
      ) ||
        String(transitionReplay.parsed?.error ?? transitionReplay.text).includes(
          "already registered",
        ) ||
        String(transitionReplay.parsed?.error ?? transitionReplay.text).includes(
          "nullifier replay rejected",
        ),
      transitionReplay.text || `Expected restarted ${label} replay error.`,
    );
  }
  console.log("private-pool-v2 restart committed transition replay rejection: PASS");
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

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { PublicKey } from "@solana/web3.js";

const serverSource = readFileSync("operator/jupiter-sol-to-shielded-route-adapter.mjs", "utf8");

assert.match(serverSource, /https:\/\/api\.jup\.ag\/swap\/v1\/quote/);
assert.match(serverSource, /https:\/\/api\.jup\.ag\/swap\/v1\/swap/);
assert.match(serverSource, /VANTA_SOL_TO_SHIELDED_EXECUTION_MODE/);
assert.match(serverSource, /VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR/);
assert.match(serverSource, /VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF/);
assert.match(serverSource, /assertLiquiditySignerPolicy/);
assert.match(serverSource, /raw-keypair-local-only/);
assert.match(serverSource, /wrapped-external-signer/);
assert.match(serverSource, /NODE_ENV === "production"/);
assert.match(serverSource, /executionMode === "live" && cluster === "mainnet-beta"/);
assert.match(serverSource, /raw liquidity keypairs are local-only/);
assert.match(serverSource, /Production or live mainnet execution must use VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF/);
assert.match(serverSource, /liquiditySignerMode/);
assert.match(serverSource, /liquiditySignerWrapped/);
assert.match(serverSource, /getTurnkeyLiveSignerReadiness/);
assert.match(serverSource, /signJupiterTransactionWithTurnkey/);
assert.match(serverSource, /getLiquiditySignerRuntime/);
assert.match(serverSource, /getAdapterAuthRequirement/);
assert.match(serverSource, /VANTA_SOL_TO_SHIELDED_ADAPTER_AUTH_TOKEN/);
assert.match(serverSource, /userPublicKey: liquiditySigner\.liquidityPublicKey/);
assert.match(serverSource, /signedTransaction\.serialize\(\)/);
assert.match(serverSource, /turnkeySignerReview/);
assert.match(serverSource, /transactionFingerprint/);
assert.match(serverSource, /VANTA_PRIVATE_POOL_V2_OPERATOR_URL/);
assert.match(serverSource, /maxInputSol/);
assert.match(serverSource, /routeAdapter: "sol-to-shielded-v1"/);
assert.match(serverSource, /intent: "swap-to-shielded"/);
assert.match(serverSource, /economicsMode: "committed-economics"/);
assert.match(serverSource, /sendRawTransaction/);
assert.match(serverSource, /routePlanHash/);
assert.match(serverSource, /slippageBps/);
assert.match(serverSource, /inputMintAddress/);
assert.match(serverSource, /outputMintAddress/);
assert.match(serverSource, /quoteExpiresAt/);
assert.match(serverSource, /quoteTimestamp/);
assert.match(serverSource, /const mainnetReady =/);
assert.match(serverSource, /hidden:economic-terms/);
assert.match(serverSource, /outputLeafIndex/);
assert.match(serverSource, /publicSwapSignature/);
assert.match(serverSource, /validateCommittedSwapSettlementResponse/);
assert.match(serverSource, /return validateCommittedSwapSettlementResponse/);
assert.match(
  serverSource,
  /allowMockProofs/,
  "Jupiter adapter settlement validation must make mock-proof acceptance an explicit local-mode choice.",
);
assert.match(
  serverSource,
  /assertLivePrivatePoolProofBoundary/,
  "Jupiter adapter live execution must preflight the Private Pool proof boundary before signing a mainnet swap.",
);
assert.match(
  serverSource,
  /proofTrustBoundary\.mockProofRealFundsAllowed !== false/,
  "Jupiter adapter live preflight must require the remote operator to block mock proofs from real-funds settlement.",
);
assert.match(
  serverSource,
  /proofReceipt\?\.proofSystem === "mock"/,
  "Jupiter adapter live settlement validation must explicitly reject mock proof receipts.",
);
assert.match(serverSource, /receipt\.economicsCommitment === request\.economicsCommitment/);
assert.doesNotMatch(serverSource, /mainnetReady: false/);
const liveSettlementValidationIndex = serverSource.indexOf(
  "return validateCommittedSwapSettlementResponse",
  serverSource.indexOf("const payload = await response.json()"),
);
const executionStateMutationIndex = serverSource.indexOf(
  "state.consumedInputSol =",
  serverSource.indexOf("async function handleExecute"),
);
assert.ok(
  liveSettlementValidationIndex !== -1 && liveSettlementValidationIndex < executionStateMutationIndex,
  "Jupiter adapter must validate committed settlement before mutating adapter state.",
);

function hashHex(...parts) {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(String(part));
    hash.update("\0");
  }
  return `0x${hash.digest("hex")}`;
}

function publicKeyFromByte(value) {
  return new PublicKey(Uint8Array.from({ length: 32 }, () => value)).toBase58();
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 10_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw lastError ?? new Error("Jupiter SOL-to-shielded adapter did not become healthy.");
}

async function waitForExit(child) {
  let stderr = "";
  let stdout = "";

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Jupiter adapter raw production keypair check did not exit."));
    }, 10_000);

    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal, stderr, stdout });
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function assertRawProductionKeypairRefused() {
  const child = spawn(process.execPath, ["operator/jupiter-sol-to-shielded-route-adapter.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "0",
      VANTA_SOL_TO_SHIELDED_EXECUTION_MODE: "live",
      VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_JSON: "[1,2,3]",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const result = await waitForExit(child);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /raw liquidity keypairs are local-only/);
  assert.match(result.stderr, /VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF/);
}

async function assertRawLiveMainnetKeypairRefusedWithoutNodeEnv() {
  const child = spawn(process.execPath, ["operator/jupiter-sol-to-shielded-route-adapter.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: "",
      PORT: "0",
      VANTA_SOL_TO_SHIELDED_EXECUTION_MODE: "live",
      VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_PATH:
        "/tmp/vanta-raw-liquidity-keypair-live-mainnet-forbidden.json",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const result = await waitForExit(child);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /raw liquidity keypairs are local-only/);
  assert.match(result.stderr, /live mainnet execution/);
  assert.match(result.stderr, /VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF/);
}

async function assertLiveWrappedSignerBootsWithoutRawKeypair() {
  const port = 19_798 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const liquidityPublicKey = publicKeyFromByte(41);
  const child = spawn(process.execPath, ["operator/jupiter-sol-to-shielded-route-adapter.mjs"], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      NODE_ENV: "production",
      PORT: String(port),
      VANTA_SOL_TO_SHIELDED_ADAPTER_AUTH_TOKEN: "test-adapter-auth-token",
      VANTA_SOL_TO_SHIELDED_EXECUTION_MODE: "live",
      VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY: liquidityPublicKey,
      VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF:
        "test-ref:VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF",
      VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF:
        "test-ref:VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF",
      VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVED: "true",
      VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVAL_REF:
        "test-ref:turnkey-liquidity-live-signing-approval",
      VANTA_SOL_TO_SHIELDED_TURNKEY_REVIEW_PACKET_REF:
        "test-ref:turnkey-liquidity-signer-review",
      VANTA_TURNKEY_API_PRIVATE_KEY: "tk-test-credential-placeholder",
      VANTA_TURNKEY_API_PRIVATE_KEY_REF: "test-ref:VANTA_TURNKEY_API_PRIVATE_KEY_REF",
      VANTA_TURNKEY_API_PUBLIC_KEY: "tk-test-public-credential-placeholder",
      VANTA_TURNKEY_API_PUBLIC_KEY_REF: "test-ref:VANTA_TURNKEY_API_PUBLIC_KEY_REF",
      VANTA_TURNKEY_ORGANIZATION_ID: "org_test_vanta_liquidity",
      VANTA_TURNKEY_ORGANIZATION_ID_REF: "test-ref:VANTA_TURNKEY_ORGANIZATION_ID_REF",
      VANTA_TURNKEY_POLICY_ID: "policy_test_vanta_liquidity",
      VANTA_TURNKEY_POLICY_ID_REF: "test-ref:VANTA_TURNKEY_POLICY_ID_REF",
      VANTA_TURNKEY_SIGN_WITH: liquidityPublicKey,
      VANTA_TURNKEY_SIGN_WITH_REF: "test-ref:VANTA_TURNKEY_SIGN_WITH_REF",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    const health = await waitForHealth(baseUrl);
    assert.equal(health.ok, true);
    assert.equal(health.adapterAuthConfigured, true);
    assert.equal(health.adapterAuthReady, true);
    assert.equal(health.adapterAuthRequired, true);
    assert.equal(health.executionMode, "live");
    assert.equal(health.liquiditySignerMode, "wrapped-external-signer");
    assert.equal(health.liquiditySignerPolicyReady, true);
    assert.equal(health.liquiditySignerRefConfigured, true);
    assert.equal(health.liquiditySignerWrapped, true);
    assert.equal(health.liquiditySignerLiveReady, true);
    assert.equal(health.liquidityWalletConfigured, true);
    assert.equal(health.turnkeyLiveSignerReadiness.ready, true);
    assert.equal(health.turnkeyLiveSignerReadiness.apiPrivateKeyConfigured, true);
    assert.ok(
      !JSON.stringify(health).includes("tk-test-credential-placeholder"),
      "Health output must not print Turnkey credential values.",
    );
    assert.ok(
      !JSON.stringify(health).includes("test-adapter-auth-token"),
      "Health output must not print adapter auth token values.",
    );
  } finally {
    child.kill("SIGTERM");
  }
}

async function assertLiveAdapterRejectsMissingAuthToken() {
  const port = 20_798 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["operator/jupiter-sol-to-shielded-route-adapter.mjs"], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      NODE_ENV: "production",
      PORT: String(port),
      VANTA_SOL_TO_SHIELDED_EXECUTION_MODE: "live",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    const health = await waitForHealth(baseUrl);
    assert.equal(health.adapterAuthConfigured, false);
    assert.equal(health.adapterAuthReady, false);
    assert.equal(health.adapterAuthRequired, true);
    const response = await fetch(`${baseUrl}/execute`, {
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.match(payload.error, /VANTA_SOL_TO_SHIELDED_ADAPTER_AUTH_TOKEN/);
  } finally {
    child.kill("SIGTERM");
  }
}

async function main() {
  const port = 18_798 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["operator/jupiter-sol-to-shielded-route-adapter.mjs"], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      VANTA_SOL_TO_SHIELDED_EXECUTION_MODE: "mock",
      VANTA_SOL_TO_SHIELDED_MAX_INPUT_SOL: "1",
      VANTA_SOL_TO_SHIELDED_SUPPORTED_ASSETS: "USDC",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    const health = await waitForHealth(baseUrl);
    assert.equal(health.ok, true);
    assert.equal(health.service, "vanta-sol-to-shielded-jupiter-route-adapter");
    assert.equal(health.executionMode, "mock");
    assert.equal(health.liquiditySignerMode, "unconfigured");
    assert.equal(health.liquiditySignerPolicyReady, true);
    assert.equal(health.liquiditySignerRefConfigured, false);
    assert.equal(health.liquiditySignerWrapped, false);
    assert.deepEqual(health.supportedOutputAssets, ["USDC"]);

    const quoteResponse = await fetch(`${baseUrl}/quote`, {
      body: JSON.stringify({
        inputAmount: "0.001",
        inputAsset: "SOL",
        outputAsset: "USDC",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const quote = await quoteResponse.json();

    assert.equal(quoteResponse.ok, true, quote.error);
    assert.equal(quote.routeAdapter, "sol-to-shielded-v1");
    assert.equal(quote.inputAsset, "SOL");
    assert.equal(quote.outputAsset, "USDC");
    assert.equal(quote.venueName, "Jupiter");
    assert.equal(quote.venueFamily, "Aggregator");
    assert.equal(quote.inputMintAddress, "So11111111111111111111111111111111111111112");
    assert.equal(typeof quote.outputMintAddress, "string");
    assert.equal(typeof quote.routeProvider, "string");
    assert.equal(typeof quote.routePlanHash, "string");
    assert.equal(typeof quote.slippageBps, "number");
    assert.equal(typeof quote.quoteTimestamp, "number");
    assert.equal(typeof quote.quoteExpiresAt, "number");
    assert.match(quote.quoteId, /^0x[0-9a-f]+$/);

    const executeResponse = await fetch(`${baseUrl}/execute`, {
      body: JSON.stringify({
        consumedNoteId: "note_sol_demo",
        inputAmount: quote.inputAmount,
        inputAsset: "SOL",
        inputMintAddress: quote.inputMintAddress,
        outputAmount: quote.outputAmount,
        outputAsset: "USDC",
        outputMintAddress: quote.outputMintAddress,
        outputNoteId: "note_usdc_output_demo",
        owner: "DemoOwner111111111111111111111111111111111",
        quoteExpiresAt: quote.quoteExpiresAt,
        quoteId: quote.quoteId,
        quoteTimestamp: quote.quoteTimestamp,
        requester: "DemoRequester1111111111111111111111111111",
        routeAdapter: "sol-to-shielded-v1",
        routePlanHash: quote.routePlanHash,
        routeProvider: quote.routeProvider,
        slippageBps: quote.slippageBps,
        transitionNoteId: "swap_transition_demo",
        transitionStateSignature: "demo_transition_signature",
        vaultOwner: "DemoVault11111111111111111111111111111111",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const receipt = await executeResponse.json();

    assert.equal(executeResponse.ok, true, receipt.error);
    assert.equal(receipt.routeAdapter, "sol-to-shielded-v1");
    assert.equal(receipt.inputAsset, "SOL");
    assert.equal(receipt.inputMintAddress, quote.inputMintAddress);
    assert.equal(receipt.outputAsset, "USDC");
    assert.equal(receipt.outputMintAddress, quote.outputMintAddress);
    assert.equal(typeof receipt.outputLeafIndex, "string");
    assert.equal(receipt.outputNoteId, "note_usdc_output_demo");
    assert.equal(typeof receipt.publicSwapSignature, "string");
    assert.equal(receipt.quoteExpiresAt, quote.quoteExpiresAt);
    assert.equal(receipt.quoteTimestamp, quote.quoteTimestamp);
    assert.equal(receipt.routePlanHash, quote.routePlanHash);
    assert.equal(receipt.routeProvider, quote.routeProvider);
    assert.equal(receipt.slippageBps, quote.slippageBps);
    assert.equal(receipt.protocolSettlementReceipt.action, "swap");
    assert.equal(receipt.protocolSettlementReceipt.economicsMode, "committed-economics");
    assert.equal(
      receipt.protocolSettlementReceipt.proofReceiptPublicInputCommitment,
      receipt.proofReceipt.publicInputCommitment,
    );
    assert.equal(receipt.proofReceipt.assetId, "hidden:economic-terms");
    assert.equal(receipt.proofReceipt.intent, "swap-to-shielded");
    assert.equal(receipt.proofReceipt.proofSystem, "mock");
    assert.equal(
      receipt.proofReceipt.replayKey,
      `swap-to-shielded:${hashHex(
        "nullifier",
        "note_sol_demo",
        "swap_transition_demo",
        "demo_transition_signature",
      )}`,
    );
    assert.ok(receipt.proofReceipt.publicInputCommitment);
  } finally {
    child.kill("SIGTERM");
  }

  await assertRawProductionKeypairRefused();
  await assertRawLiveMainnetKeypairRefusedWithoutNodeEnv();
  await assertLiveAdapterRejectsMissingAuthToken();
  await assertLiveWrappedSignerBootsWithoutRawKeypair();

  console.log("Vanta Jupiter SOL-to-shielded route adapter check: PASS");
}

await main();

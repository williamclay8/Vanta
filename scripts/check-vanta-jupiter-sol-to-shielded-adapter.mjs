import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const serverSource = readFileSync("operator/jupiter-sol-to-shielded-route-adapter.mjs", "utf8");

assert.match(serverSource, /https:\/\/api\.jup\.ag\/swap\/v1\/quote/);
assert.match(serverSource, /https:\/\/api\.jup\.ag\/swap\/v1\/swap/);
assert.match(serverSource, /VANTA_SOL_TO_SHIELDED_EXECUTION_MODE/);
assert.match(serverSource, /VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR/);
assert.match(serverSource, /VANTA_PRIVATE_POOL_V2_OPERATOR_URL/);
assert.match(serverSource, /maxInputSol/);
assert.match(serverSource, /routeAdapter: "sol-to-shielded-v1"/);
assert.match(serverSource, /intent: "swap-to-shielded"/);
assert.match(serverSource, /economicsMode: "committed-economics"/);
assert.match(serverSource, /sendRawTransaction/);

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
    assert.match(quote.quoteId, /^0x[0-9a-f]+$/);

    const executeResponse = await fetch(`${baseUrl}/execute`, {
      body: JSON.stringify({
        consumedNoteId: "note_sol_demo",
        inputAmount: quote.inputAmount,
        inputAsset: "SOL",
        outputAmount: quote.outputAmount,
        outputAsset: "USDC",
        outputNoteId: "note_usdc_output_demo",
        owner: "DemoOwner111111111111111111111111111111111",
        quoteId: quote.quoteId,
        requester: "DemoRequester1111111111111111111111111111",
        routeAdapter: "sol-to-shielded-v1",
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
    assert.equal(receipt.outputAsset, "USDC");
    assert.equal(receipt.outputNoteId, "note_usdc_output_demo");
    assert.equal(receipt.protocolSettlementReceipt.action, "swap");
    assert.equal(receipt.protocolSettlementReceipt.economicsMode, "committed-economics");
    assert.equal(receipt.proofReceipt.intent, "swap-to-shielded");
    assert.ok(receipt.proofReceipt.publicInputCommitment);
  } finally {
    child.kill("SIGTERM");
  }

  console.log("Vanta Jupiter SOL-to-shielded route adapter check: PASS");
}

await main();

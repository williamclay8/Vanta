import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import {
  assertNoRawProductionLiquidityKeypair,
  assertReviewPacketSanitized,
  fingerprintVersionedTransactionMessage,
  runTurnkeyLiquiditySignerDryRun,
  turnkeyLiquiditySignerDryRunReviewVersion,
} from "../operator/turnkey-sol-to-shielded-liquidity-signer.mjs";

const adapterSource = readFileSync("operator/jupiter-sol-to-shielded-route-adapter.mjs", "utf8");
const signerSource = readFileSync("operator/turnkey-sol-to-shielded-liquidity-signer.mjs", "utf8");
const checkerSource = readFileSync("scripts/check-vanta-turnkey-liquidity-signer-dry-run.mjs", "utf8");

assert.match(adapterSource, /VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF/);
assert.match(adapterSource, /raw liquidity keypairs are local-only/);
assert.match(adapterSource, /wrapped-external-signer/);
assert.doesNotMatch(signerSource, /\bfetch\s*\(/u, "Turnkey dry-run signer must not call fetch.");
assert.doesNotMatch(signerSource, /\bConnection\b/u, "Turnkey dry-run signer must not create RPC connections.");
assert.doesNotMatch(
  signerSource,
  /\bsendRawTransaction\b/u,
  "Turnkey dry-run signer must not broadcast transactions.",
);
assert.doesNotMatch(
  signerSource,
  /process\.env\.(?:VANTA_TURNKEY|VANTA_SOL_TO_SHIELDED_LIQUIDITY)/u,
  "Turnkey dry-run signer must not read live Turnkey or liquidity env values.",
);
assert.doesNotMatch(
  signerSource,
  /\bprocess\.env\b/u,
  "Turnkey dry-run signer must not read process env; it consumes injected refs only.",
);
assert.doesNotMatch(
  signerSource,
  /\b(?:readFileSync|writeFileSync|createReadStream)\b/u,
  "Turnkey dry-run signer must not read or write secret-bearing files.",
);
assert.doesNotMatch(
  signerSource,
  /\b(?:window|document|localStorage|sessionStorage)\b|import\.meta\.env|VITE_/u,
  "Turnkey dry-run signer must remain server-only and out of browser/client env surfaces.",
);
for (const source of [signerSource, checkerSource]) {
  assert.doesNotMatch(source, /VersionedTransaction\.deserialize/u);
  assert.doesNotMatch(source, /Keypair\.fromSecretKey/u);
  assert.doesNotMatch(source, /\bbs58\.decode/u);
  assert.doesNotMatch(source, /\bsendAndConfirmTransaction\b/u);
  assert.doesNotMatch(source, /\bconfirmTransaction\b/u);
  assert.doesNotMatch(source, /\bsimulateTransaction\b/u);
  assert.doesNotMatch(source, /@turnkey\/sdk-browser/u);
  assert.doesNotMatch(source, /\.sendRawTransaction\s*\(/u);
  assert.doesNotMatch(source, /\.sendTransaction\s*\(/u);
}

const jupiterProgramId = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
const nativeSolMint = "So11111111111111111111111111111111111111112";
const usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function publicKeyFromByte(value) {
  return new PublicKey(Uint8Array.from({ length: 32 }, () => value));
}

function hashBuffer(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

function createFixtureJupiterTransaction() {
  const liquidityPublicKey = publicKeyFromByte(11);
  const destinationPublicKey = publicKeyFromByte(12);
  const outputMintPublicKey = new PublicKey(usdcMint);
  const recentBlockhash = publicKeyFromByte(13).toBase58();
  const data = Buffer.from("vanta-offline-jupiter-swap-fixture-v0", "utf8");
  const instruction = new TransactionInstruction({
    data,
    keys: [
      {
        isSigner: true,
        isWritable: true,
        pubkey: liquidityPublicKey,
      },
      {
        isSigner: false,
        isWritable: true,
        pubkey: destinationPublicKey,
      },
      {
        isSigner: false,
        isWritable: false,
        pubkey: outputMintPublicKey,
      },
    ],
    programId: jupiterProgramId,
  });
  const message = new TransactionMessage({
    instructions: [instruction],
    payerKey: liquidityPublicKey,
    recentBlockhash,
  }).compileToV0Message();
  const transaction = new VersionedTransaction(message);

  return {
    destinationPublicKey,
    instruction,
    liquidityPublicKey,
    transaction,
  };
}

function assertNoSecretLikeOutput(value, label) {
  const serialized = JSON.stringify(value);
  for (const forbidden of [
    "-----BEGIN",
    "privateKey",
    "secretKey",
    "seedPhrase",
    "mnemonic",
    "signedTransaction",
    "swapTransaction",
    "serializedTransaction",
    "[1,2,3]",
  ]) {
    assert.ok(!serialized.includes(forbidden), `${label} must not include ${forbidden}.`);
  }
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
      reject(new Error("Raw production keypair rejection check did not exit."));
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

async function assertExistingAdapterRejectsRawProductionOrLiveKeypair({ nodeEnv, rawEnv }) {
  const child = spawn(process.execPath, ["operator/jupiter-sol-to-shielded-route-adapter.mjs"], {
    env: {
      NODE_ENV: nodeEnv,
      PATH: process.env.PATH ?? "",
      PORT: "0",
      VANTA_SOL_TO_SHIELDED_EXECUTION_MODE: "live",
      VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF: "test-ref:VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF",
      ...rawEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const result = await waitForExit(child);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /raw liquidity keypairs are local-only/);
  assert.match(result.stderr, /VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF/);
  assert.equal(result.stdout.trim(), "");
  assertNoSecretLikeOutput(result, "raw production keypair rejection output");
}

assert.throws(
  () =>
    assertNoRawProductionLiquidityKeypair({
      nodeEnv: "production",
      rawLiquidityKeypairJsonConfigured: true,
      rawLiquidityKeypairPathConfigured: false,
    }),
  /raw liquidity keypairs are local-only/u,
);
assert.doesNotThrow(() =>
  assertNoRawProductionLiquidityKeypair({
    nodeEnv: "production",
    rawLiquidityKeypairJsonConfigured: false,
    rawLiquidityKeypairPathConfigured: false,
  }),
);

const { destinationPublicKey, instruction, liquidityPublicKey, transaction } =
  createFixtureJupiterTransaction();
const transactionFingerprint = fingerprintVersionedTransactionMessage(transaction);
let networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  networkCalls += 1;
  throw new Error("Network calls are forbidden in the Turnkey liquidity signer dry run.");
};

let mockTurnkeyClientCalls = 0;
const mockTurnkeyClient = {
  mockTurnkeyClient: true,
  async signTransaction(request) {
    mockTurnkeyClientCalls += 1;
    assert.equal(request.dryRun, true);
    assert.equal(request.transaction, transaction);
    assert.equal(request.transactionFingerprint, transactionFingerprint);
    assert.equal(request.signerRef, "test-ref:VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF");
    assert.equal(request.signWithRef, "test-ref:VANTA_TURNKEY_SIGN_WITH_REF");
    assert.equal(request.policyIdRef, "test-ref:VANTA_TURNKEY_POLICY_ID_REF");
    return {
      ok: true,
      transactionFingerprint: request.transactionFingerprint,
    };
  },
};

try {
  const result = await runTurnkeyLiquiditySignerDryRun({
    amount: {
      input: "0.025",
      inputAtomic: "25000000",
      maxInput: "0.025",
      minOutput: "3.40",
      slippageBps: 50,
    },
    approvalState: "review-required-not-approved",
    asset: {
      input: "SOL",
      inputMint: nativeSolMint,
      output: "USDC",
      outputMint: usdcMint,
    },
    destination: {
      outputMint: usdcMint,
      publicSettlementDestination: destinationPublicKey.toBase58(),
      shieldedOutputCommitmentRef: "test-ref:private-pool-v2-output-commitment-fixture",
    },
    instructionSummary: [
      {
        dataFingerprint: hashBuffer(instruction.data),
        index: 0,
        label: "jupiter-swap-fixture",
        programId: instruction.programId.toBase58(),
        signerCount: instruction.keys.filter((key) => key.isSigner).length,
        writableAccountCount: instruction.keys.filter((key) => key.isWritable).length,
      },
    ],
    liquidityPublicKey: liquidityPublicKey.toBase58(),
    policyIdRef: "test-ref:VANTA_TURNKEY_POLICY_ID_REF",
    signWithRef: "test-ref:VANTA_TURNKEY_SIGN_WITH_REF",
    signerRef: "test-ref:VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF",
    simulationRef: "test-ref:offline-jupiter-fixture-simulation-no-rpc",
    transaction,
    turnkeyClient: mockTurnkeyClient,
  });

  assert.equal(result.mode, "dry-run-no-live-call");
  assert.equal(result.mockTurnkeyClientCalled, true);
  assert.equal(mockTurnkeyClientCalls, 1);
  assert.equal(networkCalls, 0);

  const packet = result.reviewPacket;
  assert.equal(packet.version, turnkeyLiquiditySignerDryRunReviewVersion);
  assert.equal(packet.mode, "dry-run-no-live-call");
  assert.equal(packet.routeProvider, "Jupiter");
  assert.equal(packet.signer.signerRef, "test-ref:VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF");
  assert.equal(packet.signer.signWithRef, "test-ref:VANTA_TURNKEY_SIGN_WITH_REF");
  assert.equal(packet.signer.policyIdRef, "test-ref:VANTA_TURNKEY_POLICY_ID_REF");
  assert.equal(packet.signer.keyMaterialObserved, false);
  assert.equal(packet.gate.command, "npm run swap:turnkey-liquidity-signer-dry-run-check");
  assert.equal(packet.gate.requiredBeforeLiveMode, true);
  assert.equal(packet.serverOnlyAdapter.browserExposureAllowed, false);
  assert.equal(packet.serverOnlyAdapter.clientBundleAllowed, false);
  assert.equal(packet.serverOnlyAdapter.signerRefSource, "server-secret-manager-reference");
  assert.equal(packet.serverOnlyAdapter.turnkeyClient, "mock-injected-server-client");
  assert.equal(packet.transaction.fixture, "offline-jupiter-versioned-transaction-v0");
  assert.equal(packet.transaction.fingerprint, transactionFingerprint);
  assert.equal(packet.transaction.instructionSummary.length, 1);
  assert.equal(packet.transaction.instructionSummary[0].label, "jupiter-swap-fixture");
  assert.equal(packet.transaction.instructionSummary[0].programId, jupiterProgramId.toBase58());
  assert.equal(packet.transaction.instructionSummary[0].dataFingerprint, hashBuffer(instruction.data));
  assert.equal(packet.transaction.instructionSummary[0].signerCount, 1);
  assert.equal(packet.transaction.instructionSummary[0].writableAccountCount, 2);
  assert.equal(packet.simulation.simulationRef, "test-ref:offline-jupiter-fixture-simulation-no-rpc");
  assert.equal(packet.amount.input, "0.025");
  assert.equal(packet.amount.inputAtomic, "25000000");
  assert.equal(packet.amount.maxInput, "0.025");
  assert.equal(packet.amount.minOutput, "3.40");
  assert.equal(packet.amount.slippageBps, 50);
  assert.equal(packet.asset.input, "SOL");
  assert.equal(packet.asset.inputMint, nativeSolMint);
  assert.equal(packet.asset.output, "USDC");
  assert.equal(packet.asset.outputMint, usdcMint);
  assert.equal(packet.destination.outputMint, usdcMint);
  assert.equal(packet.destination.publicSettlementDestination, destinationPublicKey.toBase58());
  assert.equal(
    packet.destination.shieldedOutputCommitmentRef,
    "test-ref:private-pool-v2-output-commitment-fixture",
  );
  assert.equal(packet.approval.state, "review-required-not-approved");
  assert.equal(packet.approval.liveModeAllowed, false);
  assert.equal(packet.controls.noLiveCall, true);
  assert.equal(packet.controls.noNetwork, true);
  assert.equal(packet.controls.noBroadcast, true);
  assert.equal(packet.controls.broadcastAttempted, false);
  assert.equal(packet.controls.liveTurnkeyCalls, 0);
  assert.equal(packet.controls.liveCallsAttempted, false);
  assert.equal(packet.controls.broadcastCalls, 0);
  assert.equal(packet.controls.networkCalls, 0);
  assert.equal(packet.controls.mockTurnkeyClientCalls, 1);
  assert.equal(packet.controls.movesFunds, false);
  assert.equal(packet.controls.noSecretValueReads, true);
  assert.equal(packet.controls.noSecretValuePrints, true);
  assert.equal(packet.controls.rawProductionKeypairAccepted, false);
  assert.equal(packet.controls.signedPayloadProduced, false);
  assert.equal(packet.controls.turnkeyActivityCreated, false);
  assert.equal(packet.controls.liquiditySignerMode, "wrapped-external-signer");
  assertReviewPacketSanitized(packet);
  assertNoSecretLikeOutput(packet, "Turnkey liquidity signer dry-run review packet");

  console.log(
    JSON.stringify(
      {
        ok: true,
        reviewPacket: packet,
      },
      null,
      2,
    ),
  );
} finally {
  globalThis.fetch = originalFetch;
}

await assertExistingAdapterRejectsRawProductionOrLiveKeypair({
  nodeEnv: "production",
  rawEnv: {
    VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_JSON: "[1,2,3]",
  },
});
await assertExistingAdapterRejectsRawProductionOrLiveKeypair({
  nodeEnv: "",
  rawEnv: {
    VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_PATH: "/tmp/vanta-raw-liquidity-keypair-forbidden.json",
  },
});

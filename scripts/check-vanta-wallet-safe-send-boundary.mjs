import { strict as assert } from "node:assert";
import {
  createWalletSafeSendBoundary,
  runWalletSafeSendBoundary,
} from "../src/wallet/walletSafeSendBoundary.mjs";

const calls = [];
const boundary = createWalletSafeSendBoundary({
  async prepare(request) {
    calls.push(["prepare", request.label]);
    return {
      feePayer: request.feePayer,
      instructions: request.instructions,
      lifetime: {
        blockhash: "blockhash_safe_send_001",
      },
    };
  },
  async simulate(prepared) {
    calls.push(["simulate", prepared.instructions.join(",")]);
    return {
      error: null,
      logs: ["Program log: simulation ok"],
      ok: true,
    };
  },
  async sendPrepared(prepared) {
    calls.push(["sendPrepared", prepared.feePayer]);
    return "sig_safe_send_001";
  },
});

const accepted = await runWalletSafeSendBoundary(boundary, {
  amount: "0.05",
  asset: "SOL",
  cluster: "devnet",
  connectedWalletAddress: "payer1111111111111111111111111111111111111",
  estimatedFees: "0.000005 SOL",
  feePayer: "payer1111111111111111111111111111111111111",
  humanApprovedSummary: true,
  instructions: ["compute-budget", "private-pool-v2-shield"],
  label: "safe-send-devnet",
  recipient: "vantaPool111111111111111111111111111111111",
  transactionFingerprint: "txfp_safe_send_devnet_001",
});

assert.equal(accepted.status, "submitted");
assert.equal(accepted.signature, "sig_safe_send_001");
assert.equal(accepted.gate.canRequestWalletSignature, true);
assert.deepEqual(calls, [
  ["prepare", "safe-send-devnet"],
  ["simulate", "compute-budget,private-pool-v2-shield"],
  ["sendPrepared", "payer1111111111111111111111111111111111111"],
]);

const failedSimulationBoundary = createWalletSafeSendBoundary({
  async prepare(request) {
    return {
      feePayer: request.feePayer,
      instructions: request.instructions,
      lifetime: {
        blockhash: "blockhash_failed_sim_001",
      },
    };
  },
  async simulate() {
    return {
      error: "insufficient funds",
      logs: [],
      ok: false,
    };
  },
  async sendPrepared() {
    throw new Error("sendPrepared must not be called after failed simulation");
  },
});

const rejected = await runWalletSafeSendBoundary(failedSimulationBoundary, {
  amount: "0.05",
  asset: "SOL",
  cluster: "devnet",
  connectedWalletAddress: "payer1111111111111111111111111111111111111",
  estimatedFees: "0.000005 SOL",
  feePayer: "payer1111111111111111111111111111111111111",
  humanApprovedSummary: true,
  instructions: ["private-pool-v2-shield"],
  label: "safe-send-failed-simulation",
  recipient: "vantaPool111111111111111111111111111111111",
  transactionFingerprint: "txfp_safe_send_failed_001",
});

assert.equal(rejected.status, "blocked");
assert.equal(rejected.reason, "simulation-failed");
assert.equal(rejected.signature, null);

const wrongWallet = await runWalletSafeSendBoundary(boundary, {
  amount: "0.05",
  asset: "SOL",
  cluster: "devnet",
  connectedWalletAddress: "otherWallet111111111111111111111111111111",
  estimatedFees: "0.000005 SOL",
  feePayer: "payer1111111111111111111111111111111111111",
  humanApprovedSummary: true,
  instructions: ["private-pool-v2-shield"],
  label: "safe-send-wallet-mismatch",
  recipient: "vantaPool111111111111111111111111111111111",
  transactionFingerprint: "txfp_safe_send_wallet_mismatch_001",
});

assert.equal(wrongWallet.status, "blocked");
assert.equal(wrongWallet.reason, "wallet-fee-payer-mismatch");
assert.equal(wrongWallet.signature, null);

const objectInstructionCalls = [];
const objectInstructionBoundary = createWalletSafeSendBoundary({
  async prepare(request) {
    objectInstructionCalls.push(["prepare-instruction-count", request.instructions.length]);
    return {
      feePayer: request.feePayer,
      instructions: request.instructions,
      lifetime: {
        blockhash: "blockhash_object_instruction_001",
      },
    };
  },
  async simulate() {
    return {
      error: null,
      logs: ["Program log: object instruction simulation ok"],
      ok: true,
    };
  },
  async sendPrepared() {
    objectInstructionCalls.push(["sendPrepared", "called"]);
    return "sig_object_instruction_001";
  },
});

const objectInstructionResult = await runWalletSafeSendBoundary(objectInstructionBoundary, {
  amount: "1",
  asset: "USDC",
  cluster: "devnet",
  connectedWalletAddress: "payer1111111111111111111111111111111111111",
  estimatedFees: "0.000005 SOL",
  feePayer: "payer1111111111111111111111111111111111111",
  humanApprovedSummary: true,
  instructions: [
    {
      programAddress: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    },
  ],
  label: "safe-send-object-instruction",
  recipient: "vantaPool111111111111111111111111111111111",
  summaryInstructions: ["memo"],
  transactionFingerprint: "txfp_safe_send_object_instruction_001",
});

assert.equal(objectInstructionResult.status, "submitted");
assert.deepEqual(objectInstructionResult.summary.instructions, ["memo"]);
assert.deepEqual(objectInstructionCalls, [
  ["prepare-instruction-count", 1],
  ["sendPrepared", "called"],
]);

try {
  await runWalletSafeSendBoundary(objectInstructionBoundary, {
    amount: "1",
    asset: "USDC",
    cluster: "devnet",
    connectedWalletAddress: "payer1111111111111111111111111111111111111",
    estimatedFees: "0.000005 SOL",
    feePayer: "payer1111111111111111111111111111111111111",
    humanApprovedSummary: true,
    instructions: [
      {
        programAddress: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
      },
    ],
    label: "safe-send-invalid-summary",
    recipient: "vantaPool111111111111111111111111111111111",
    summaryInstructions: [{}],
    transactionFingerprint: "txfp_safe_send_invalid_summary_001",
  });
  throw new Error("Expected malformed summary instructions to fail.");
} catch (error) {
  assert(
    String(error instanceof Error ? error.message : error).includes("summaryInstructions[]"),
    "Expected malformed summary instructions to fail closed.",
  );
}

console.log("Vanta wallet safe send boundary check: PASS");

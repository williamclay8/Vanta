import { strict as assert } from "node:assert";

import {
  createVantaPrivatePoolV2SolanaRelayerSubmitter,
  isVantaSolanaTransactionSignature,
} from "../src/privacy/privatePoolV2SolanaRelayerSubmission.mjs";

const validSignature = "4".repeat(88);
const calls = [];
const fakeTransaction = {
  serialize() {
    calls.push("serialize");
    return Uint8Array.from([1, 2, 3]);
  },
  sign(signers) {
    calls.push(`sign:${signers[0].publicKey.toBase58()}`);
  },
};
const fakeRelayerKeypair = {
  publicKey: {
    toBase58() {
      return "Relayer111111111111111111111111111111111111";
    },
  },
};
const fakeConnection = {
  async sendRawTransaction(bytes, options) {
    calls.push(`send:${Buffer.from(bytes).toString("hex")}:${options.skipPreflight}`);
    return validSignature;
  },
  async simulateTransaction(transaction, options) {
    assert.equal(transaction, fakeTransaction);
    calls.push(`simulate:${options.sigVerify}`);
    return { value: { err: null } };
  },
};

const submitter = createVantaPrivatePoolV2SolanaRelayerSubmitter({
  connection: fakeConnection,
  deserializeTransaction(bytes) {
    calls.push(`deserialize:${Buffer.from(bytes).toString("hex")}`);
    return fakeTransaction;
  },
  relayerKeypair: fakeRelayerKeypair,
});

const submission = await submitter.submitPrivateSpend({
  proofReceiptId: "ppv2_test",
  publicInputCommitment: "0xpublic-input",
  serializedTransaction: `base64:${Buffer.from([9, 8, 7]).toString("base64")}`,
  settlementId: "settlement:test",
});

assert.equal(submission.signature, validSignature);
assert.equal(submission.submittedBy, "relayer");
assert.equal(submission.relayerId, "solana-relayer:Relayer111111111111111111111111111111111111");
assert.deepEqual(calls, [
  "deserialize:090807",
  "sign:Relayer111111111111111111111111111111111111",
  "serialize",
  "simulate:true",
  "send:010203:false",
]);
assert.equal(isVantaSolanaTransactionSignature(validSignature), true);
assert.equal(isVantaSolanaTransactionSignature("0xnot-a-solana-signature"), false);

const simulationFailureSubmitter = createVantaPrivatePoolV2SolanaRelayerSubmitter({
  connection: {
    async sendRawTransaction() {
      throw new Error("send must not run after simulation failure");
    },
    async simulateTransaction() {
      return { value: { err: { InstructionError: [0, "Custom"] } } };
    },
  },
  deserializeTransaction() {
    return fakeTransaction;
  },
  relayerKeypair: fakeRelayerKeypair,
});
await assert.rejects(
  () =>
    simulationFailureSubmitter.submitPrivateSpend({
      proofReceiptId: "ppv2_test",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: Buffer.from([1]).toString("base64"),
      settlementId: "settlement:test",
    }),
  /simulation failed/,
);

const badSignatureSubmitter = createVantaPrivatePoolV2SolanaRelayerSubmitter({
  connection: {
    async sendRawTransaction() {
      return "0xmock";
    },
    async simulateTransaction() {
      return { value: { err: null } };
    },
  },
  deserializeTransaction() {
    return fakeTransaction;
  },
  relayerKeypair: fakeRelayerKeypair,
});
await assert.rejects(
  () =>
    badSignatureSubmitter.submitPrivateSpend({
      proofReceiptId: "ppv2_test",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: Buffer.from([1]).toString("base64"),
      settlementId: "settlement:test",
    }),
  /non-Solana transaction signature/,
);

console.log("Vanta Private Pool v2 Solana relayer submission check: PASS");

import { strict as assert } from "node:assert";

import { Keypair, SystemProgram, VersionedTransaction } from "@solana/web3.js";

import {
  createVantaPrivatePoolV2SolanaRelayerSubmitter,
  isVantaSolanaTransactionSignature,
} from "../src/privacy/privatePoolV2SolanaRelayerSubmission.mjs";
import {
  buildVantaPrivatePoolV2ActualPrivateSpendTransaction,
  deriveVantaPrivatePoolV2NullifierMarkerAddress,
} from "../src/privacy/privatePoolV2SolanaSpendTransaction.mjs";

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

const relayerKeypair = Keypair.generate();
const spendProgramId = Keypair.generate().publicKey.toBase58();
const poolState = Keypair.generate().publicKey.toBase58();
const nullifierSet = Keypair.generate().publicKey.toBase58();
const outputQueue = Keypair.generate().publicKey.toBase58();
const rootHistory = Keypair.generate().publicKey.toBase58();
const nullifierMarker = deriveVantaPrivatePoolV2NullifierMarkerAddress({
  nullifierHex: "0x" + "11".repeat(32),
  poolState,
  programId: spendProgramId,
});
const operatorAuthority = relayerKeypair.publicKey.toBase58();
let submittedSpendTransaction = null;
const builtSpendTransaction = buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
  accounts: [
    { isSigner: false, isWritable: true, pubkey: poolState },
    { isSigner: false, isWritable: false, pubkey: nullifierSet },
    { isSigner: false, isWritable: true, pubkey: outputQueue },
    { isSigner: false, isWritable: false, pubkey: rootHistory },
    { isSigner: false, isWritable: true, pubkey: nullifierMarker },
    { isSigner: true, isWritable: true, pubkey: operatorAuthority },
    { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
  ],
  instructionDataBase64: Buffer.concat([
    Buffer.from([1]),
    Buffer.from("11".repeat(32), "hex"),
    Buffer.from("22".repeat(32), "hex"),
    Buffer.from("33".repeat(32), "hex"),
    Buffer.from("44".repeat(32), "hex"),
    Buffer.from("55".repeat(32), "hex"),
  ]).toString("base64"),
  programId: spendProgramId,
  recentBlockhash: "11111111111111111111111111111111",
  relayerFeePayer: relayerKeypair.publicKey.toBase58(),
});
const builderIntegratedSubmitter = createVantaPrivatePoolV2SolanaRelayerSubmitter({
  connection: {
    async sendRawTransaction(bytes, options) {
      submittedSpendTransaction = VersionedTransaction.deserialize(bytes);
      assert.equal(options.skipPreflight, false);
      return validSignature;
    },
    async simulateTransaction(transaction, options) {
      assert.equal(transaction.message.staticAccountKeys[0].toBase58(), relayerKeypair.publicKey.toBase58());
      assert.equal(options.sigVerify, true);
      return { value: { err: null } };
    },
  },
  relayerKeypair,
});
const builderIntegratedSubmission = await builderIntegratedSubmitter.submitPrivateSpend({
  proofReceiptId: "ppv2_builder_integrated",
  publicInputCommitment: "0xpublic-input-builder",
  serializedTransaction: builtSpendTransaction.serializedTransaction,
  settlementId: "settlement:builder-integrated",
});
assert.equal(builderIntegratedSubmission.signature, validSignature);
assert.equal(builderIntegratedSubmission.submittedBy, "relayer");
assert.equal(builderIntegratedSubmission.relayerId, `solana-relayer:${relayerKeypair.publicKey.toBase58()}`);
assert.equal(submittedSpendTransaction.message.staticAccountKeys[0].toBase58(), relayerKeypair.publicKey.toBase58());
assert.notDeepEqual([...submittedSpendTransaction.signatures[0]], new Array(64).fill(0));

const malformedBase64Submitter = createVantaPrivatePoolV2SolanaRelayerSubmitter({
  connection: fakeConnection,
  deserializeTransaction() {
    throw new Error("deserialize must not run for malformed base64");
  },
  relayerKeypair: fakeRelayerKeypair,
});
await assert.rejects(
  () =>
    malformedBase64Submitter.submitPrivateSpend({
      proofReceiptId: "ppv2_bad_base64",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: "not base64",
      settlementId: "settlement:bad-base64",
    }),
  /requires base64 serializedTransaction/,
);

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

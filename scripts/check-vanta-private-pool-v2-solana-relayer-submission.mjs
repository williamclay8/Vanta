import { strict as assert } from "node:assert";

import { Keypair, SystemProgram, VersionedTransaction } from "@solana/web3.js";

import {
  createVantaPrivatePoolV2SolanaRelayerSubmitter,
  isVantaSolanaTransactionSignature,
} from "../src/privacy/privatePoolV2SolanaRelayerSubmission.mjs";
import {
  VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_MAX_SERIALIZED_TRANSACTION_BYTES,
  buildVantaPrivatePoolV2ActualPrivateSpendTransaction,
  deriveVantaPrivatePoolV2NullifierMarkerAddress,
  deriveVantaPrivatePoolV2OutputRecordAddress,
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

const bindingRequiredSubmitter = createVantaPrivatePoolV2SolanaRelayerSubmitter({
  connection: fakeConnection,
  deserializeTransaction() {
    throw new Error("deserialize must not run before expected binding validation");
  },
  relayerKeypair: fakeRelayerKeypair,
  requireExpectedBindings: true,
});
await assert.rejects(
  () =>
    bindingRequiredSubmitter.submitPrivateSpend({
      proofReceiptId: "ppv2_requires_bindings",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: `base64:${Buffer.from([9, 8, 7]).toString("base64")}`,
      settlementId: "settlement:requires-bindings",
    }),
  /requires expectedAccounts and expectedPublicInputs/,
);
const callsBeforeSemanticReject = calls.length;
await assert.rejects(
  () =>
    submitter.submitPrivateSpend({
      expectedPublicInputs: {
        acceptedRoot: "0x" + "44".repeat(32),
        nullifierOrReplayCommitment: "0x" + "11".repeat(32),
        outputCommitments: ["0x" + "22".repeat(32), "0x" + "33".repeat(32)],
        privateSpendPublicInputHash: "0x" + "55".repeat(32),
      },
      proofReceiptId: "ppv2_semantic_reject",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: `base64:${Buffer.from([9, 8, 7]).toString("base64")}`,
      settlementId: "settlement:semantic-reject",
    }),
  /Reached end of buffer|invalid|Transaction|version/i,
);
assert.deepEqual(
  calls.slice(callsBeforeSemanticReject),
  [],
  "Relayer semantic validation must reject before deserialize, sign, simulate, or send.",
);

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
const outputRecord = deriveVantaPrivatePoolV2OutputRecordAddress({
  poolState,
  programId: spendProgramId,
  publicInputHashHex: "0x" + "55".repeat(32),
});
const operatorAuthority = relayerKeypair.publicKey.toBase58();
let submittedSpendTransaction = null;
const expectedSpendPublicInputs = {
  acceptedRoot: "0x" + "44".repeat(32),
  nullifierOrReplayCommitment: "0x" + "11".repeat(32),
  outputCommitments: ["0x" + "22".repeat(32), "0x" + "33".repeat(32)],
  privateSpendPublicInputHash: "0x" + "55".repeat(32),
};
const expectedSpendAccounts = {
  nullifierSet,
  nullifierMarker,
  operatorAuthority,
  outputQueue,
  outputRecord,
  poolState,
  programId: spendProgramId,
  relayerFeePayer: relayerKeypair.publicKey.toBase58(),
  rootHistory,
  systemProgram: SystemProgram.programId.toBase58(),
};
const builtSpendTransaction = buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
  accounts: [
    { isSigner: false, isWritable: true, pubkey: poolState },
    { isSigner: false, isWritable: false, pubkey: nullifierSet },
    { isSigner: false, isWritable: true, pubkey: outputQueue },
    { isSigner: false, isWritable: false, pubkey: rootHistory },
    { isSigner: false, isWritable: true, pubkey: nullifierMarker },
    { isSigner: false, isWritable: true, pubkey: outputRecord },
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
  requireExpectedBindings: true,
});
const builderIntegratedSubmission = await builderIntegratedSubmitter.submitPrivateSpend({
  expectedAccounts: expectedSpendAccounts,
  expectedPublicInputs: expectedSpendPublicInputs,
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

await assert.rejects(
  () =>
    builderIntegratedSubmitter.submitPrivateSpend({
      expectedAccounts: expectedSpendAccounts,
      expectedPublicInputs: {
        ...expectedSpendPublicInputs,
        acceptedRoot: "0x" + "66".repeat(32),
      },
      proofReceiptId: "ppv2_builder_integrated_bad_root",
      publicInputCommitment: "0xpublic-input-builder",
      serializedTransaction: builtSpendTransaction.serializedTransaction,
      settlementId: "settlement:builder-integrated-bad-root",
    }),
  /expectedPublicInputs\.acceptedRoot mismatch/,
);

await assert.rejects(
  () =>
    builderIntegratedSubmitter.submitPrivateSpend({
      expectedAccounts: {
        ...expectedSpendAccounts,
        programId: Keypair.generate().publicKey.toBase58(),
      },
      expectedPublicInputs: expectedSpendPublicInputs,
      proofReceiptId: "ppv2_builder_integrated_bad_program",
      publicInputCommitment: "0xpublic-input-builder",
      serializedTransaction: builtSpendTransaction.serializedTransaction,
      settlementId: "settlement:builder-integrated-bad-program",
    }),
  /expectedAccounts\.programId mismatch/,
);

await assert.rejects(
  () =>
    builderIntegratedSubmitter.submitPrivateSpend({
      expectedAccounts: {},
      expectedPublicInputs: expectedSpendPublicInputs,
      proofReceiptId: "ppv2_builder_integrated_missing_accounts",
      publicInputCommitment: "0xpublic-input-builder",
      serializedTransaction: builtSpendTransaction.serializedTransaction,
      settlementId: "settlement:builder-integrated-missing-accounts",
    }),
  /requires expected account refs/,
);

await assert.rejects(
  () =>
    builderIntegratedSubmitter.submitPrivateSpend({
      expectedAccounts: {
        ...expectedSpendAccounts,
        nullifierMarker: Keypair.generate().publicKey.toBase58(),
      },
      expectedPublicInputs: expectedSpendPublicInputs,
      proofReceiptId: "ppv2_builder_integrated_bad_marker",
      publicInputCommitment: "0xpublic-input-builder",
      serializedTransaction: builtSpendTransaction.serializedTransaction,
      settlementId: "settlement:builder-integrated-bad-marker",
    }),
  /expectedAccounts\.nullifierMarker mismatch/,
);

await assert.rejects(
  () =>
    builderIntegratedSubmitter.submitPrivateSpend({
      expectedAccounts: {
        ...expectedSpendAccounts,
        outputRecord: Keypair.generate().publicKey.toBase58(),
      },
      expectedPublicInputs: expectedSpendPublicInputs,
      proofReceiptId: "ppv2_builder_integrated_bad_output_record",
      publicInputCommitment: "0xpublic-input-builder",
      serializedTransaction: builtSpendTransaction.serializedTransaction,
      settlementId: "settlement:builder-integrated-bad-output-record",
    }),
  /expectedAccounts\.outputRecord mismatch/,
);

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

await assert.rejects(
  () =>
    malformedBase64Submitter.submitPrivateSpend({
      proofReceiptId: "ppv2_oversized",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: `base64:${Buffer.alloc(
        VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_MAX_SERIALIZED_TRANSACTION_BYTES + 1,
      ).toString("base64")}`,
      settlementId: "settlement:oversized",
    }),
  /serializedTransaction exceeds 1232 bytes/,
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

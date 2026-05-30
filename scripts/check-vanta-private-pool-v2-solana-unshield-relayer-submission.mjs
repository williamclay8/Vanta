import { strict as assert } from "node:assert";

import { Keypair, SystemProgram, VersionedTransaction } from "@solana/web3.js";

import {
  createVantaPrivatePoolV2SolanaRelayerSubmitter,
  isVantaSolanaTransactionSignature,
} from "../src/privacy/privatePoolV2SolanaRelayerSubmission.mjs";
import {
  VANTA_PRIVATE_POOL_V2_SOLANA_UNSHIELD_MAX_SERIALIZED_TRANSACTION_BYTES,
  SPL_TOKEN_PROGRAM_ID,
  buildVantaPrivatePoolV2TagUnshieldTransaction,
  deriveVantaPrivatePoolV2UnshieldNullifierMarkerAddress,
  deriveVantaPrivatePoolV2UnshieldRootRecordAddress,
  deriveVantaPrivatePoolV2UnshieldVaultAssetAddress,
  deriveVantaPrivatePoolV2UnshieldVaultAuthorityAddress,
  deriveVantaPrivatePoolV2UnshieldVerifierKeyAddress,
} from "../src/privacy/privatePoolV2SolanaUnshieldTransaction.mjs";

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

const submission = await submitter.submitPrivateUnshield({
  proofReceiptId: "ppv2_unshield_test",
  publicInputCommitment: "0xpublic-input",
  serializedTransaction: `base64:${Buffer.from([9, 8, 7]).toString("base64")}`,
  settlementId: "settlement:unshield-test",
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
    bindingRequiredSubmitter.submitPrivateUnshield({
      proofReceiptId: "ppv2_unshield_requires_bindings",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: `base64:${Buffer.from([9, 8, 7]).toString("base64")}`,
      settlementId: "settlement:unshield-requires-bindings",
    }),
  /requires expectedAccounts and expectedPublicInputs/,
);

const callsBeforeSemanticReject = calls.length;
await assert.rejects(
  () =>
    submitter.submitPrivateUnshield({
      expectedPublicInputs: {
        acceptedRoot: "0x" + "44".repeat(32),
        exitAmountLeHex: "0x0100000000000000",
        exitAssetId: "0x" + "33".repeat(32),
        exitDestination: "0x" + "22".repeat(32),
        nullifierOrReplayCommitment: "0x" + "11".repeat(32),
        unshieldPublicInputHash: "0x" + "55".repeat(32),
        verifierKeyHash: "0x" + "66".repeat(32),
      },
      proofReceiptId: "ppv2_unshield_semantic_reject",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: `base64:${Buffer.from([9, 8, 7]).toString("base64")}`,
      settlementId: "settlement:unshield-semantic-reject",
    }),
  /Reached end of buffer|invalid|Transaction|version/i,
);
assert.deepEqual(
  calls.slice(callsBeforeSemanticReject),
  [],
  "Relayer semantic validation must reject before deserialize, sign, simulate, or send.",
);

for (const [fieldName, fieldValue] of [
  ["proofBytes", "base64:abcd"],
  ["proofArtifact", { proofHex: "abcd" }],
  ["verifierProgramId", "Verifier1111111111111111111111111111111111"],
  ["verifyingKeyHash", "sha256:production-vk"],
]) {
  const callsBeforeProofFieldReject = calls.length;
  await assert.rejects(
    () =>
      submitter.submitPrivateUnshield({
        [fieldName]: fieldValue,
        proofReceiptId: `ppv2_unshield_forbidden_${fieldName}`,
        publicInputCommitment: "0xpublic-input",
        serializedTransaction: `base64:${Buffer.from([9, 8, 7]).toString("base64")}`,
        settlementId: `settlement:unshield-forbidden-${fieldName}`,
      }),
    new RegExp(`forbids transaction\\.${fieldName}`),
  );
  assert.deepEqual(
    calls.slice(callsBeforeProofFieldReject),
    [],
    `Relayer proof-field rejection for ${fieldName} must happen before deserialize, sign, simulate, or send.`,
  );
}

const relayerKeypair = Keypair.generate();
const programId = Keypair.generate().publicKey.toBase58();
const poolState = Keypair.generate().publicKey.toBase58();
const rootHistory = Keypair.generate().publicKey.toBase58();
const vaultTokenAccount = Keypair.generate().publicKey.toBase58();
const destinationTokenAccount = Keypair.generate().publicKey.toBase58();
const mint = Keypair.generate().publicKey.toBase58();
const verifierProgram = Keypair.generate().publicKey.toBase58();
const recentBlockhash = "11111111111111111111111111111111";

const nullifierHex = "0x" + "11".repeat(32);
const acceptedRootHex = "0x" + "44".repeat(32);
const exitDestinationHex = "0x" + "22".repeat(32);
const exitAssetIdHex = "0x" + "33".repeat(32);
const exitAmountLeHex = "0x" + "0100000000000000";
const unshieldPublicInputHashHex = "0x" + "55".repeat(32);
const verifierKeyHashHex = "0x" + "66".repeat(32);

const instructionDataBase64 = Buffer.concat([
  Buffer.from([6]),
  Buffer.from("11".repeat(32), "hex"),
  Buffer.from("44".repeat(32), "hex"),
  Buffer.from("22".repeat(32), "hex"),
  Buffer.from("33".repeat(32), "hex"),
  Buffer.from("0100000000000000", "hex"),
  Buffer.from("55".repeat(32), "hex"),
  Buffer.from("66".repeat(32), "hex"),
  Buffer.alloc(324, 6),
  (() => {
    const witness = Buffer.alloc(44);
    witness.subarray(0, 12).set([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1]);
    Buffer.from("55".repeat(32), "hex").copy(witness, 12);
    return witness;
  })(),
]).toString("base64");

const nullifierMarker = deriveVantaPrivatePoolV2UnshieldNullifierMarkerAddress({
  nullifierHex,
  poolState,
  programId,
});
const rootRecord = deriveVantaPrivatePoolV2UnshieldRootRecordAddress({
  acceptedRootHex,
  poolState,
  programId,
});
const vaultAuthority = deriveVantaPrivatePoolV2UnshieldVaultAuthorityAddress({
  exitAssetIdHex,
  poolState,
  programId,
});
const vaultAsset = deriveVantaPrivatePoolV2UnshieldVaultAssetAddress({
  exitAssetIdHex,
  poolState,
  programId,
});
const verifierKey = deriveVantaPrivatePoolV2UnshieldVerifierKeyAddress({
  poolState,
  programId,
  verifierKeyHashHex,
});

const expectedUnshieldPublicInputs = {
  acceptedRoot: acceptedRootHex,
  exitAmountLeHex,
  exitAssetId: exitAssetIdHex,
  exitDestination: exitDestinationHex,
  nullifierOrReplayCommitment: nullifierHex,
  unshieldPublicInputHash: unshieldPublicInputHashHex,
  verifierKeyHash: verifierKeyHashHex,
};
const expectedUnshieldAccounts = {
  destinationTokenAccount,
  mint,
  nullifierMarker,
  poolState,
  programId,
  relayer: relayerKeypair.publicKey.toBase58(),
  relayerFeePayer: relayerKeypair.publicKey.toBase58(),
  rootHistory,
  rootRecord,
  systemProgram: SystemProgram.programId.toBase58(),
  tokenProgram: SPL_TOKEN_PROGRAM_ID,
  vaultAsset,
  vaultAuthority,
  vaultTokenAccount,
  verifierKey,
  verifierProgram,
};

const builtUnshieldTransaction = buildVantaPrivatePoolV2TagUnshieldTransaction({
  accounts: [
    { isSigner: false, isWritable: false, pubkey: poolState },
    { isSigner: false, isWritable: false, pubkey: rootHistory },
    { isSigner: false, isWritable: false, pubkey: rootRecord },
    { isSigner: false, isWritable: true, pubkey: nullifierMarker },
    { isSigner: false, isWritable: false, pubkey: vaultAuthority },
    { isSigner: false, isWritable: false, pubkey: vaultAsset },
    { isSigner: false, isWritable: true, pubkey: vaultTokenAccount },
    { isSigner: false, isWritable: true, pubkey: destinationTokenAccount },
    { isSigner: false, isWritable: false, pubkey: mint },
    { isSigner: false, isWritable: false, pubkey: SPL_TOKEN_PROGRAM_ID },
    { isSigner: false, isWritable: false, pubkey: verifierKey },
    { isSigner: false, isWritable: false, pubkey: verifierProgram },
    { isSigner: true, isWritable: true, pubkey: relayerKeypair.publicKey.toBase58() },
    { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
  ],
  instructionDataBase64,
  programId,
  recentBlockhash,
  relayerFeePayer: relayerKeypair.publicKey.toBase58(),
});

let submittedUnshieldTransaction = null;
const builderIntegratedSubmitter = createVantaPrivatePoolV2SolanaRelayerSubmitter({
  connection: {
    async sendRawTransaction(bytes, options) {
      submittedUnshieldTransaction = VersionedTransaction.deserialize(bytes);
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

const builderIntegratedSubmission = await builderIntegratedSubmitter.submitPrivateUnshield({
  expectedAccounts: expectedUnshieldAccounts,
  expectedPublicInputs: expectedUnshieldPublicInputs,
  proofReceiptId: "ppv2_unshield_builder_integrated",
  publicInputCommitment: "0xpublic-input-builder",
  serializedTransaction: builtUnshieldTransaction.serializedTransaction,
  settlementId: "settlement:unshield-builder-integrated",
});
assert.equal(builderIntegratedSubmission.signature, validSignature);
assert.equal(builderIntegratedSubmission.submittedBy, "relayer");
assert.equal(
  builderIntegratedSubmission.relayerId,
  `solana-relayer:${relayerKeypair.publicKey.toBase58()}`,
);
assert.equal(
  submittedUnshieldTransaction.message.staticAccountKeys[0].toBase58(),
  relayerKeypair.publicKey.toBase58(),
);
assert.notDeepEqual([...submittedUnshieldTransaction.signatures[0]], new Array(64).fill(0));

await assert.rejects(
  () =>
    builderIntegratedSubmitter.submitPrivateUnshield({
      expectedAccounts: expectedUnshieldAccounts,
      expectedPublicInputs: {
        ...expectedUnshieldPublicInputs,
        acceptedRoot: "0x" + "66".repeat(32),
      },
      proofReceiptId: "ppv2_unshield_builder_integrated_bad_root",
      publicInputCommitment: "0xpublic-input-builder",
      serializedTransaction: builtUnshieldTransaction.serializedTransaction,
      settlementId: "settlement:unshield-builder-integrated-bad-root",
    }),
  /expectedPublicInputs\.acceptedRoot mismatch/,
);

await assert.rejects(
  () =>
    builderIntegratedSubmitter.submitPrivateUnshield({
      expectedAccounts: {
        ...expectedUnshieldAccounts,
        programId: Keypair.generate().publicKey.toBase58(),
      },
      expectedPublicInputs: expectedUnshieldPublicInputs,
      proofReceiptId: "ppv2_unshield_builder_integrated_bad_program",
      publicInputCommitment: "0xpublic-input-builder",
      serializedTransaction: builtUnshieldTransaction.serializedTransaction,
      settlementId: "settlement:unshield-builder-integrated-bad-program",
    }),
  /expectedAccounts\.programId mismatch/,
);

await assert.rejects(
  () =>
    builderIntegratedSubmitter.submitPrivateUnshield({
      expectedAccounts: {},
      expectedPublicInputs: expectedUnshieldPublicInputs,
      proofReceiptId: "ppv2_unshield_builder_integrated_missing_accounts",
      publicInputCommitment: "0xpublic-input-builder",
      serializedTransaction: builtUnshieldTransaction.serializedTransaction,
      settlementId: "settlement:unshield-builder-integrated-missing-accounts",
    }),
  /requires expected account refs/,
);

await assert.rejects(
  () =>
    builderIntegratedSubmitter.submitPrivateUnshield({
      expectedAccounts: {
        ...expectedUnshieldAccounts,
        nullifierMarker: Keypair.generate().publicKey.toBase58(),
      },
      expectedPublicInputs: expectedUnshieldPublicInputs,
      proofReceiptId: "ppv2_unshield_builder_integrated_bad_marker",
      publicInputCommitment: "0xpublic-input-builder",
      serializedTransaction: builtUnshieldTransaction.serializedTransaction,
      settlementId: "settlement:unshield-builder-integrated-bad-marker",
    }),
  /expectedAccounts\.nullifierMarker mismatch/,
);

await assert.rejects(
  () =>
    builderIntegratedSubmitter.submitPrivateUnshield({
      expectedAccounts: {
        ...expectedUnshieldAccounts,
        rootRecord: Keypair.generate().publicKey.toBase58(),
      },
      expectedPublicInputs: expectedUnshieldPublicInputs,
      proofReceiptId: "ppv2_unshield_builder_integrated_bad_root_record",
      publicInputCommitment: "0xpublic-input-builder",
      serializedTransaction: builtUnshieldTransaction.serializedTransaction,
      settlementId: "settlement:unshield-builder-integrated-bad-root-record",
    }),
  /expectedAccounts\.rootRecord mismatch/,
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
    malformedBase64Submitter.submitPrivateUnshield({
      proofReceiptId: "ppv2_unshield_bad_base64",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: "not base64",
      settlementId: "settlement:unshield-bad-base64",
    }),
  /requires base64 serializedTransaction/,
);

await assert.rejects(
  () =>
    malformedBase64Submitter.submitPrivateUnshield({
      proofReceiptId: "ppv2_unshield_oversized",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: `base64:${Buffer.alloc(
        VANTA_PRIVATE_POOL_V2_SOLANA_UNSHIELD_MAX_SERIALIZED_TRANSACTION_BYTES + 1,
      ).toString("base64")}`,
      settlementId: "settlement:unshield-oversized",
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
    simulationFailureSubmitter.submitPrivateUnshield({
      proofReceiptId: "ppv2_unshield_test",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: Buffer.from([1]).toString("base64"),
      settlementId: "settlement:unshield-test",
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
    badSignatureSubmitter.submitPrivateUnshield({
      proofReceiptId: "ppv2_unshield_test",
      publicInputCommitment: "0xpublic-input",
      serializedTransaction: Buffer.from([1]).toString("base64"),
      settlementId: "settlement:unshield-test",
    }),
  /non-Solana transaction signature/,
);

console.log("Vanta Private Pool v2 Solana unshield relayer submission check: PASS");

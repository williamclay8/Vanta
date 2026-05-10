import { strict as assert } from "node:assert";

import { Keypair, SystemProgram, VersionedTransaction } from "@solana/web3.js";

import {
  SOLANA_MEMO_PROGRAM_ID,
  VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_MAX_SERIALIZED_TRANSACTION_BYTES,
  VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_TRANSACTION_VERSION,
  buildVantaPrivatePoolV2ActualPrivateSpendTransaction,
  deriveVantaPrivatePoolV2NullifierMarkerAddress,
  deriveVantaPrivatePoolV2OutputRecordAddress,
  validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction,
} from "../src/privacy/privatePoolV2SolanaSpendTransaction.mjs";

const relayerFeePayer = Keypair.generate().publicKey.toBase58();
const programId = Keypair.generate().publicKey.toBase58();
const poolState = Keypair.generate().publicKey.toBase58();
const nullifierSet = Keypair.generate().publicKey.toBase58();
const outputQueue = Keypair.generate().publicKey.toBase58();
const rootHistory = Keypair.generate().publicKey.toBase58();
const nullifierHex = "0x" + "11".repeat(32);
const publicInputHashHex = "0x" + "55".repeat(32);
const nullifierMarker = deriveVantaPrivatePoolV2NullifierMarkerAddress({
  nullifierHex,
  poolState,
  programId,
});
const outputRecord = deriveVantaPrivatePoolV2OutputRecordAddress({
  poolState,
  programId,
  publicInputHashHex,
});
const operatorAuthority = relayerFeePayer;
const recentBlockhash = "11111111111111111111111111111111";
const instructionDataBase64 = Buffer.concat([
  Buffer.from([1]),
  Buffer.from("11".repeat(32), "hex"),
  Buffer.from("22".repeat(32), "hex"),
  Buffer.from("33".repeat(32), "hex"),
  Buffer.from("44".repeat(32), "hex"),
  Buffer.from("55".repeat(32), "hex"),
]).toString("base64");
const expectedPublicInputs = {
  acceptedRoot: "0x" + "44".repeat(32),
  nullifierOrReplayCommitment: nullifierHex,
  outputCommitments: ["0x" + "22".repeat(32), "0x" + "33".repeat(32)],
  privateSpendPublicInputHash: publicInputHashHex,
};
const expectedAccounts = {
  nullifierSet,
  nullifierMarker,
  operatorAuthority,
  outputQueue,
  outputRecord,
  poolState,
  programId,
  relayerFeePayer,
  rootHistory,
  systemProgram: SystemProgram.programId.toBase58(),
};

function spendAccounts(overrides = {}) {
  return [
    { isSigner: false, isWritable: true, pubkey: overrides.poolState ?? poolState },
    { isSigner: false, isWritable: false, pubkey: overrides.nullifierSet ?? nullifierSet },
    { isSigner: false, isWritable: true, pubkey: overrides.outputQueue ?? outputQueue },
    { isSigner: false, isWritable: false, pubkey: overrides.rootHistory ?? rootHistory },
    { isSigner: false, isWritable: true, pubkey: overrides.nullifierMarker ?? nullifierMarker },
    { isSigner: false, isWritable: true, pubkey: overrides.outputRecord ?? outputRecord },
    { isSigner: true, isWritable: true, pubkey: overrides.operatorAuthority ?? operatorAuthority },
    {
      isSigner: false,
      isWritable: false,
      pubkey: overrides.systemProgram ?? SystemProgram.programId.toBase58(),
    },
  ];
}

function build(overrides = {}) {
  return buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
    accounts: overrides.accounts ?? spendAccounts(overrides.accountOverrides),
    instructionDataBase64: overrides.instructionDataBase64 ?? instructionDataBase64,
    programId: overrides.programId ?? programId,
    recentBlockhash,
    relayerFeePayer: overrides.relayerFeePayer ?? relayerFeePayer,
    ...(overrides.extra ?? {}),
  });
}

const built = build();

assert.equal(built.version, VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_TRANSACTION_VERSION);
assert.equal(built.evidencePolicy, "real-solana-versioned-transaction-bytes-required");
assert.equal(built.programId, programId);
assert.equal(built.relayerFeePayer, relayerFeePayer);
assert.equal(built.accountCount, 8);
assert.match(built.serializedTransaction, /^base64:[A-Za-z0-9+/]+=*$/);

const validated = validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction({
  expectedAccounts,
  expectedPublicInputs,
  serializedTransaction: built.serializedTransaction,
});
assert.equal(validated.nullifier, expectedPublicInputs.nullifierOrReplayCommitment);
assert.deepEqual(validated.outputCommitments, expectedPublicInputs.outputCommitments);
assert.equal(validated.acceptedRoot, expectedPublicInputs.acceptedRoot);
assert.equal(validated.privateSpendPublicInputHash, expectedPublicInputs.privateSpendPublicInputHash);
assert.equal(validated.outputRecord, outputRecord);
assert.equal(validated.programId, programId);
assert.equal(validated.relayerFeePayer, relayerFeePayer);

const decoded = VersionedTransaction.deserialize(
  Buffer.from(built.serializedTransaction.slice("base64:".length), "base64"),
);
assert.equal(decoded.version, 0);
for (const expectedKey of [
  relayerFeePayer,
  programId,
  poolState,
  nullifierSet,
  outputQueue,
  rootHistory,
  nullifierMarker,
  outputRecord,
  operatorAuthority,
  SystemProgram.programId.toBase58(),
]) {
  assert.ok(decoded.message.staticAccountKeys.some((key) => key.toBase58() === expectedKey));
}
assert.equal(
  deriveVantaPrivatePoolV2NullifierMarkerAddress({ instructionDataBase64, poolState, programId }),
  nullifierMarker,
);
assert.equal(
  deriveVantaPrivatePoolV2OutputRecordAddress({ instructionDataBase64, poolState, programId }),
  outputRecord,
);

assert.throws(
  () =>
    validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction({
      expectedAccounts,
      expectedPublicInputs: {
        ...expectedPublicInputs,
        privateSpendPublicInputHash: "0x" + "66".repeat(32),
      },
      serializedTransaction: built.serializedTransaction,
    }),
  /expectedPublicInputs\.privateSpendPublicInputHash mismatch/,
);
assert.throws(
  () =>
    validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction({
      expectedAccounts: {
        ...expectedAccounts,
        outputQueue: Keypair.generate().publicKey.toBase58(),
      },
      expectedPublicInputs,
      serializedTransaction: built.serializedTransaction,
    }),
  /expectedAccounts\.outputQueue mismatch/,
);
assert.throws(
  () =>
    validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction({
      expectedAccounts: {
        ...expectedAccounts,
        outputRecord: Keypair.generate().publicKey.toBase58(),
      },
      expectedPublicInputs,
      serializedTransaction: built.serializedTransaction,
    }),
  /expectedAccounts\.outputRecord mismatch/,
);
assert.throws(
  () =>
    validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction({
      expectedAccounts: {
        ...expectedAccounts,
        nullifierMarker: Keypair.generate().publicKey.toBase58(),
      },
      expectedPublicInputs,
      serializedTransaction: built.serializedTransaction,
    }),
  /expectedAccounts\.nullifierMarker mismatch/,
);
assert.throws(
  () =>
    validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction({
      expectedAccounts: {
        ...expectedAccounts,
        outputRecord: undefined,
      },
      expectedPublicInputs,
      requireExpectedAccounts: true,
      serializedTransaction: built.serializedTransaction,
    }),
  /requires expected account refs: outputRecord/,
);
assert.throws(
  () =>
    validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction({
      expectedAccounts,
      expectedPublicInputs: {
        acceptedRoot: expectedPublicInputs.acceptedRoot,
        nullifierOrReplayCommitment: expectedPublicInputs.nullifierOrReplayCommitment,
        outputCommitment: expectedPublicInputs.outputCommitments[0],
        privateSpendPublicInputHash: expectedPublicInputs.privateSpendPublicInputHash,
      },
      requireExpectedPublicInputs: true,
      serializedTransaction: built.serializedTransaction,
    }),
  /requires expected public inputs: outputCommitments/,
);
assert.throws(
  () =>
    validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction({
      expectedAccounts,
      expectedPublicInputs,
      serializedTransaction: `base64:${Buffer.from("not-a-solana-v0-transaction").toString("base64")}`,
    }),
  /Reached end of buffer|invalid|Transaction|version/i,
);
assert.throws(
  () =>
    validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction({
      expectedAccounts,
      expectedPublicInputs,
      serializedTransaction: `base64:${Buffer.alloc(
        VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_MAX_SERIALIZED_TRANSACTION_BYTES + 1,
      ).toString("base64")}`,
    }),
  /serializedTransaction exceeds 1232 bytes/,
);

assert.throws(() => build({ accounts: spendAccounts().slice(0, 7) }), /requires exactly 8 spend accounts/);
assert.throws(
  () => build({ accounts: [...spendAccounts(), { isSigner: false, isWritable: false, pubkey: Keypair.generate().publicKey.toBase58() }] }),
  /requires exactly 8 spend accounts/,
);
assert.throws(
  () => build({ accounts: [{ isSigner: false, isWritable: false, pubkey: poolState }], programId: SOLANA_MEMO_PROGRAM_ID }),
  /cannot use the Memo program/,
);
assert.throws(() => build({ accounts: [] }), /non-empty accounts/);
assert.throws(() => build({ accounts: [{ isSigner: false, isWritable: false, pubkey: poolState }], extra: { amount: "1000000" } }), /forbids transaction.amount/);
assert.throws(() => build({ instructionDataBase64: "not base64" }), /requires base64 instructionDataBase64/);
assert.throws(
  () =>
    build({
      instructionDataBase64: Buffer.concat([
        Buffer.from([0]),
        Buffer.from("11".repeat(32), "hex"),
        Buffer.from("22".repeat(32), "hex"),
        Buffer.from("33".repeat(32), "hex"),
        Buffer.from("44".repeat(32), "hex"),
        Buffer.from("55".repeat(32), "hex"),
      ]).toString("base64"),
    }),
  /requires tag=1 and 161-byte spend instruction data/,
);
assert.throws(
  () => build({ accountOverrides: { nullifierMarker: Keypair.generate().publicKey.toBase58() } }),
  /requires accounts\[4\] to match the spend nullifier PDA marker/,
);
assert.throws(
  () => build({ accountOverrides: { outputRecord: Keypair.generate().publicKey.toBase58() } }),
  /requires accounts\[5\] to match the spend output record PDA/,
);
assert.throws(
  () => build({ accounts: spendAccounts().map((account, index) => index === 5 ? { ...account, isWritable: false } : account) }),
  /requires accounts\[5\] to be the writable output record PDA/,
);
assert.throws(
  () => build({ accounts: spendAccounts().map((account, index) => index === 3 ? { ...account, isWritable: true } : account) }),
  /requires accounts\[3\] to be the read-only root history account/,
);
assert.throws(
  () => build({ accounts: spendAccounts().map((account, index) => index === 4 ? { ...account, isWritable: false } : account) }),
  /requires accounts\[4\] to be the writable nullifier marker PDA/,
);
assert.throws(
  () => build({ accountOverrides: { operatorAuthority: Keypair.generate().publicKey.toBase58() } }),
  /requires relayerFeePayer to equal operatorAuthority/,
);
assert.throws(
  () => build({ accounts: spendAccounts().map((account, index) => index === 1 ? { ...account, isWritable: true } : account) }),
  /requires accounts\[1\] to be the read-only nullifier set header account/,
);
assert.throws(
  () => build({ accounts: spendAccounts().map((account, index) => index === 6 ? { ...account, isWritable: false } : account) }),
  /requires accounts\[6\] to be the writable operator authority signer/,
);
assert.throws(
  () => build({ accountOverrides: { systemProgram: Keypair.generate().publicKey.toBase58() } }),
  /requires accounts\[7\] to be the read-only System Program/,
);

const publicBuilderResult = JSON.stringify(built);
for (const forbiddenTerm of [
  "sourceWallet",
  "payerSourceWallet",
  "merchantSettlementAddress",
  "rawAmount",
  "rawAsset",
  "inputCommitment",
  "inputLeafIndex",
]) {
  assert.equal(
    publicBuilderResult.includes(forbiddenTerm),
    false,
    `builder result must not expose ${forbiddenTerm}`,
  );
}

console.log("Vanta Private Pool v2 Solana spend transaction builder check: PASS");

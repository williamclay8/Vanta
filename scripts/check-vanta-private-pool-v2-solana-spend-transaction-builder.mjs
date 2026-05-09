import { strict as assert } from "node:assert";

import { Keypair, SystemProgram, VersionedTransaction } from "@solana/web3.js";

import {
  SOLANA_MEMO_PROGRAM_ID,
  VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_TRANSACTION_VERSION,
  buildVantaPrivatePoolV2ActualPrivateSpendTransaction,
  deriveVantaPrivatePoolV2NullifierMarkerAddress,
} from "../src/privacy/privatePoolV2SolanaSpendTransaction.mjs";

const relayerFeePayer = Keypair.generate().publicKey.toBase58();
const programId = Keypair.generate().publicKey.toBase58();
const poolState = Keypair.generate().publicKey.toBase58();
const nullifierSet = Keypair.generate().publicKey.toBase58();
const outputQueue = Keypair.generate().publicKey.toBase58();
const rootHistory = Keypair.generate().publicKey.toBase58();
const nullifierHex = "0x" + "11".repeat(32);
const nullifierMarker = deriveVantaPrivatePoolV2NullifierMarkerAddress({
  nullifierHex,
  poolState,
  programId,
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

const built = buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
  accounts: [
    { isSigner: false, isWritable: true, pubkey: poolState },
    { isSigner: false, isWritable: false, pubkey: nullifierSet },
    { isSigner: false, isWritable: true, pubkey: outputQueue },
    { isSigner: false, isWritable: false, pubkey: rootHistory },
    { isSigner: false, isWritable: true, pubkey: nullifierMarker },
    { isSigner: true, isWritable: true, pubkey: operatorAuthority },
    { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
  ],
  instructionDataBase64,
  programId,
  recentBlockhash,
  relayerFeePayer,
});

assert.equal(built.version, VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_TRANSACTION_VERSION);
assert.equal(built.evidencePolicy, "real-solana-versioned-transaction-bytes-required");
assert.equal(built.programId, programId);
assert.equal(built.relayerFeePayer, relayerFeePayer);
assert.equal(built.accountCount, 7);
assert.match(built.serializedTransaction, /^base64:[A-Za-z0-9+/]+=*$/);

const decoded = VersionedTransaction.deserialize(
  Buffer.from(built.serializedTransaction.slice("base64:".length), "base64"),
);
assert.equal(decoded.version, 0);
assert.equal(decoded.message.staticAccountKeys[0].toBase58(), relayerFeePayer);
assert.ok(decoded.message.staticAccountKeys.some((key) => key.toBase58() === programId));
assert.ok(decoded.message.staticAccountKeys.some((key) => key.toBase58() === poolState));
assert.ok(decoded.message.staticAccountKeys.some((key) => key.toBase58() === nullifierSet));
assert.ok(decoded.message.staticAccountKeys.some((key) => key.toBase58() === outputQueue));
assert.ok(decoded.message.staticAccountKeys.some((key) => key.toBase58() === rootHistory));
assert.ok(decoded.message.staticAccountKeys.some((key) => key.toBase58() === nullifierMarker));
assert.ok(decoded.message.staticAccountKeys.some((key) => key.toBase58() === operatorAuthority));
assert.ok(decoded.message.staticAccountKeys.some((key) => key.toBase58() === SystemProgram.programId.toBase58()));
assert.equal(
  deriveVantaPrivatePoolV2NullifierMarkerAddress({
    instructionDataBase64,
    poolState,
    programId,
  }),
  nullifierMarker,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [
        { isSigner: false, isWritable: true, pubkey: poolState },
        { isSigner: false, isWritable: true, pubkey: nullifierSet },
        { isSigner: false, isWritable: true, pubkey: outputQueue },
      ],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires exactly 7 spend accounts/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [
        { isSigner: false, isWritable: true, pubkey: poolState },
        { isSigner: false, isWritable: false, pubkey: nullifierSet },
        { isSigner: false, isWritable: true, pubkey: outputQueue },
        { isSigner: false, isWritable: false, pubkey: rootHistory },
        { isSigner: false, isWritable: true, pubkey: nullifierMarker },
        { isSigner: true, isWritable: true, pubkey: operatorAuthority },
        { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
        { isSigner: false, isWritable: false, pubkey: Keypair.generate().publicKey.toBase58() },
      ],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires exactly 7 spend accounts/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [{ isSigner: false, isWritable: false, pubkey: poolState }],
      instructionDataBase64,
      programId: SOLANA_MEMO_PROGRAM_ID,
      recentBlockhash,
      relayerFeePayer,
    }),
  /cannot use the Memo program/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /non-empty accounts/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [{ isSigner: false, isWritable: false, pubkey: poolState }],
      amount: "1000000",
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /forbids transaction.amount/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [{ isSigner: false, isWritable: false, pubkey: poolState }],
      instructionDataBase64: "not base64",
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires base64 instructionDataBase64/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
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
        Buffer.from([0]),
        Buffer.from("11".repeat(32), "hex"),
        Buffer.from("22".repeat(32), "hex"),
        Buffer.from("33".repeat(32), "hex"),
        Buffer.from("44".repeat(32), "hex"),
        Buffer.from("55".repeat(32), "hex"),
      ]).toString("base64"),
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires tag=1 and 161-byte spend instruction data/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [
        { isSigner: false, isWritable: true, pubkey: poolState },
        { isSigner: false, isWritable: false, pubkey: nullifierSet },
        { isSigner: false, isWritable: true, pubkey: outputQueue },
        { isSigner: false, isWritable: false, pubkey: rootHistory },
        { isSigner: false, isWritable: true, pubkey: Keypair.generate().publicKey.toBase58() },
        { isSigner: true, isWritable: true, pubkey: operatorAuthority },
        { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
      ],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires accounts\[4\] to match the spend nullifier PDA marker/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [
        { isSigner: false, isWritable: true, pubkey: poolState },
        { isSigner: false, isWritable: false, pubkey: nullifierSet },
        { isSigner: false, isWritable: true, pubkey: outputQueue },
        { isSigner: false, isWritable: true, pubkey: rootHistory },
        { isSigner: false, isWritable: true, pubkey: nullifierMarker },
        { isSigner: true, isWritable: true, pubkey: operatorAuthority },
        { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
      ],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires accounts\[3\] to be the read-only root history account/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [
        { isSigner: false, isWritable: true, pubkey: poolState },
        { isSigner: false, isWritable: false, pubkey: nullifierSet },
        { isSigner: false, isWritable: true, pubkey: outputQueue },
        { isSigner: false, isWritable: false, pubkey: rootHistory },
        { isSigner: false, isWritable: false, pubkey: nullifierMarker },
        { isSigner: true, isWritable: true, pubkey: operatorAuthority },
        { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
      ],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires accounts\[4\] to be the writable nullifier marker PDA/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [
        { isSigner: false, isWritable: true, pubkey: poolState },
        { isSigner: false, isWritable: false, pubkey: nullifierSet },
        { isSigner: false, isWritable: true, pubkey: outputQueue },
        { isSigner: false, isWritable: false, pubkey: rootHistory },
        { isSigner: false, isWritable: true, pubkey: nullifierMarker },
        { isSigner: true, isWritable: true, pubkey: Keypair.generate().publicKey.toBase58() },
        { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
      ],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires relayerFeePayer to equal operatorAuthority/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [
        { isSigner: false, isWritable: true, pubkey: poolState },
        { isSigner: false, isWritable: false, pubkey: nullifierSet },
        { isSigner: false, isWritable: true, pubkey: outputQueue },
        { isSigner: false, isWritable: true, pubkey: rootHistory },
        { isSigner: false, isWritable: true, pubkey: nullifierMarker },
        { isSigner: true, isWritable: true, pubkey: operatorAuthority },
        { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
      ],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires accounts\[3\] to be the read-only root history account/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [
        { isSigner: false, isWritable: true, pubkey: poolState },
        { isSigner: false, isWritable: false, pubkey: nullifierSet },
        { isSigner: false, isWritable: true, pubkey: outputQueue },
        { isSigner: false, isWritable: false, pubkey: rootHistory },
        { isSigner: false, isWritable: false, pubkey: nullifierMarker },
        { isSigner: true, isWritable: true, pubkey: operatorAuthority },
        { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
      ],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires accounts\[4\] to be the writable nullifier marker PDA/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [
        { isSigner: false, isWritable: true, pubkey: poolState },
        { isSigner: false, isWritable: true, pubkey: nullifierSet },
        { isSigner: false, isWritable: true, pubkey: outputQueue },
        { isSigner: false, isWritable: false, pubkey: rootHistory },
        { isSigner: false, isWritable: true, pubkey: nullifierMarker },
        { isSigner: true, isWritable: true, pubkey: operatorAuthority },
        { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
      ],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires accounts\[1\] to be the read-only nullifier set header account/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [
        { isSigner: false, isWritable: true, pubkey: poolState },
        { isSigner: false, isWritable: false, pubkey: nullifierSet },
        { isSigner: false, isWritable: true, pubkey: outputQueue },
        { isSigner: false, isWritable: false, pubkey: rootHistory },
        { isSigner: false, isWritable: true, pubkey: nullifierMarker },
        { isSigner: true, isWritable: false, pubkey: operatorAuthority },
        { isSigner: false, isWritable: false, pubkey: SystemProgram.programId.toBase58() },
      ],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires accounts\[5\] to be the writable operator authority signer/,
);

assert.throws(
  () =>
    buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
      accounts: [
        { isSigner: false, isWritable: true, pubkey: poolState },
        { isSigner: false, isWritable: false, pubkey: nullifierSet },
        { isSigner: false, isWritable: true, pubkey: outputQueue },
        { isSigner: false, isWritable: false, pubkey: rootHistory },
        { isSigner: false, isWritable: true, pubkey: nullifierMarker },
        { isSigner: true, isWritable: true, pubkey: operatorAuthority },
        { isSigner: false, isWritable: false, pubkey: Keypair.generate().publicKey.toBase58() },
      ],
      instructionDataBase64,
      programId,
      recentBlockhash,
      relayerFeePayer,
    }),
  /requires accounts\[6\] to be the read-only System Program/,
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

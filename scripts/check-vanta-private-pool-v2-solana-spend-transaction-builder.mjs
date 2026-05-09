import { strict as assert } from "node:assert";

import { Keypair, VersionedTransaction } from "@solana/web3.js";

import {
  SOLANA_MEMO_PROGRAM_ID,
  VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_TRANSACTION_VERSION,
  buildVantaPrivatePoolV2ActualPrivateSpendTransaction,
} from "../src/privacy/privatePoolV2SolanaSpendTransaction.mjs";

const relayerFeePayer = Keypair.generate().publicKey.toBase58();
const programId = Keypair.generate().publicKey.toBase58();
const poolState = Keypair.generate().publicKey.toBase58();
const nullifierSet = Keypair.generate().publicKey.toBase58();
const outputQueue = Keypair.generate().publicKey.toBase58();
const operatorAuthority = Keypair.generate().publicKey.toBase58();
const recentBlockhash = "11111111111111111111111111111111";
const instructionDataBase64 = Buffer.from(
  JSON.stringify({
    acceptedRoot: "root:reviewed",
    nullifierCommitment: "nf:reviewed",
    publicInputHash: "pub:reviewed",
  }),
).toString("base64");

const built = buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
  accounts: [
    { isSigner: false, isWritable: true, pubkey: poolState },
    { isSigner: false, isWritable: true, pubkey: nullifierSet },
    { isSigner: false, isWritable: true, pubkey: outputQueue },
    { isSigner: true, isWritable: false, pubkey: operatorAuthority },
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
assert.equal(built.accountCount, 4);
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
assert.ok(decoded.message.staticAccountKeys.some((key) => key.toBase58() === operatorAuthority));

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
  /requires the fourth account to be the read-only operator authority signer/,
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

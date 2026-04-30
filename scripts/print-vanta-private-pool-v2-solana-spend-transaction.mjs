import { Connection } from "@solana/web3.js";

import { buildVantaPrivatePoolV2ActualPrivateSpendTransaction } from "../src/privacy/privatePoolV2SolanaSpendTransaction.mjs";

function readRequiredEnv(name) {
  const value = process.env[name]?.trim() ?? "";
  if (!value) {
    throw new Error(`Missing required public Solana spend transaction input ${name}.`);
  }
  return value;
}

function readOptionalEnv(name) {
  return process.env[name]?.trim() ?? "";
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function commitmentBytes(fieldName) {
  const text = readRequiredEnv(fieldName);
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`${fieldName} must be a 32-byte hex commitment.`);
  }
  return Buffer.from(hex, "hex");
}

function instructionDataBase64FromEnv() {
  const explicit = readOptionalEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_INSTRUCTION_DATA_BASE64");
  if (explicit) {
    return explicit;
  }

  return Buffer.concat([
    Buffer.from([1]),
    commitmentBytes("VANTA_ACTUAL_PRIVATE_NULLIFIER_REF"),
    commitmentBytes("VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT_REF"),
    commitmentBytes("VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT_REF"),
    commitmentBytes("VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF"),
  ]).toString("base64");
}

const rpcUrl = readRequiredEnv("VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL");
const relayerFeePayer = readRequiredEnv("VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET");
const explicitRecentBlockhash = readOptionalEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_RECENT_BLOCKHASH");
const latestBlockhash = explicitRecentBlockhash
  ? { blockhash: explicitRecentBlockhash, lastValidBlockHeight: null }
  : await new Connection(rpcUrl, "confirmed").getLatestBlockhash("confirmed");

const built = buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
  accounts: [
    {
      isSigner: false,
      isWritable: true,
      pubkey: readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE"),
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET"),
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE"),
    },
  ],
  instructionDataBase64: instructionDataBase64FromEnv(),
  programId: readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID"),
  recentBlockhash: latestBlockhash.blockhash,
  relayerFeePayer,
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({
    accountCount: built.accountCount,
    evidencePolicy: built.evidencePolicy,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    programId: built.programId,
    relayerFeePayer: built.relayerFeePayer,
    transactionVersion: built.transactionVersion,
    version: built.version,
  }, null, 2));
} else {
  console.log(`export VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION=${shellQuote(built.serializedTransaction)}`);
}

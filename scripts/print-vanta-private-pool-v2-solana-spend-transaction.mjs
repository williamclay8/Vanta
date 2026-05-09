import { Connection, SystemProgram } from "@solana/web3.js";

import {
  buildVantaPrivatePoolV2ActualPrivateSpendTransaction,
  deriveVantaPrivatePoolV2NullifierMarkerAddress,
} from "../src/privacy/privatePoolV2SolanaSpendTransaction.mjs";

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

function readRequiredCommitmentEnv(...fieldNames) {
  for (const fieldName of fieldNames) {
    const value = readOptionalEnv(fieldName);
    if (value) {
      return { fieldName, value };
    }
  }
  throw new Error(`Missing required public Solana spend transaction input ${fieldNames.join(" or ")}.`);
}

function commitmentBytes(...fieldNames) {
  const { fieldName, value: text } = readRequiredCommitmentEnv(...fieldNames);
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
    commitmentBytes("VANTA_ACTUAL_PRIVATE_NULLIFIER", "VANTA_ACTUAL_PRIVATE_NULLIFIER_REF"),
    commitmentBytes("VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT", "VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT_REF"),
    commitmentBytes(
      "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT",
      "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT_REF",
    ),
    commitmentBytes("VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT", "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_REF"),
    commitmentBytes(
      "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH",
      "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF",
    ),
  ]).toString("base64");
}

const rpcUrl = readRequiredEnv("VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL");
const relayerFeePayer = readRequiredEnv("VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET");
const explicitRecentBlockhash = readOptionalEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_RECENT_BLOCKHASH");
const latestBlockhash = explicitRecentBlockhash
  ? { blockhash: explicitRecentBlockhash, lastValidBlockHeight: null }
  : await new Connection(rpcUrl, "confirmed").getLatestBlockhash("confirmed");
const instructionDataBase64 = instructionDataBase64FromEnv();
const programId = readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID");
const poolState = readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE");
const nullifierMarker =
  readOptionalEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_MARKER")
  || deriveVantaPrivatePoolV2NullifierMarkerAddress({
    instructionDataBase64,
    poolState,
    programId,
  });

const built = buildVantaPrivatePoolV2ActualPrivateSpendTransaction({
  accounts: [
    {
      isSigner: false,
      isWritable: true,
      pubkey: poolState,
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET"),
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE"),
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_ROOT_HISTORY"),
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: nullifierMarker,
    },
    {
      isSigner: true,
      isWritable: true,
      pubkey: readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY"),
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: readOptionalEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_SYSTEM_PROGRAM")
        || SystemProgram.programId.toBase58(),
    },
  ],
  instructionDataBase64,
  programId,
  recentBlockhash: latestBlockhash.blockhash,
  relayerFeePayer,
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({
    accountCount: built.accountCount,
    evidencePolicy: built.evidencePolicy,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    nullifierMarker,
    operatorAuthority: readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY"),
    programId: built.programId,
    relayerFeePayer: built.relayerFeePayer,
    rootHistory: readRequiredEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_ROOT_HISTORY"),
    transactionVersion: built.transactionVersion,
    version: built.version,
  }, null, 2));
} else {
  console.log(`export VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION=${shellQuote(built.serializedTransaction)}`);
}

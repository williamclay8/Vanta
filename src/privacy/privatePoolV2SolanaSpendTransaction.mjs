import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export const VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_TRANSACTION_VERSION =
  "vanta-private-pool-v2-solana-spend-transaction-0.2";

export const SOLANA_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const SPEND_INSTRUCTION_TAG = 1;
const SPEND_INSTRUCTION_LEN = 161;
const HASH_LEN = 32;
const NULLIFIER_MARKER_SEED = Buffer.from("vanta2nul", "utf8");

const forbiddenPublicSpendTerms = [
  "amount",
  "asset",
  "destination",
  "inputCommitment",
  "inputLeafIndex",
  "merchantSettlementAddress",
  "owner",
  "payerSourceWallet",
  "rawAmount",
  "rawAsset",
  "sourceWallet",
];

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires ${fieldName}.`);
  }

  return value.trim();
}

function requirePublicKey(value, fieldName) {
  try {
    return new PublicKey(requireText(value, fieldName));
  } catch (error) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires valid ${fieldName}.`);
  }
}

function requireBase64Bytes(value, fieldName) {
  const text = requireText(value, fieldName);
  const base64 = text.startsWith("base64:") ? text.slice("base64:".length) : text;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires base64 ${fieldName}.`);
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== base64) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires base64 ${fieldName}.`);
  }

  return bytes;
}

function requireSpendInstructionData(bytes) {
  if (bytes.length !== SPEND_INSTRUCTION_LEN || bytes[0] !== SPEND_INSTRUCTION_TAG) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires tag=1 and 161-byte spend instruction data.",
    );
  }
}

function requireHex32(value, fieldName) {
  const text = requireText(value, fieldName);
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires 32-byte hex ${fieldName}.`);
  }
  return Buffer.from(hex, "hex");
}

function spendNullifierBytes(data) {
  return data.subarray(1, 1 + HASH_LEN);
}

function deriveNullifierMarkerPubkey({ programId, poolState, nullifier }) {
  return PublicKey.findProgramAddressSync(
    [NULLIFIER_MARKER_SEED, poolState.toBuffer(), Buffer.from(nullifier)],
    programId,
  )[0];
}

export function deriveVantaPrivatePoolV2NullifierMarkerAddress(input = {}) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  let nullifier;
  if (input.instructionDataBase64) {
    const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
    requireSpendInstructionData(data);
    nullifier = spendNullifierBytes(data);
  } else {
    nullifier = requireHex32(input.nullifierHex, "nullifierHex");
  }
  if (nullifier.length !== HASH_LEN) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction requires a 32-byte nullifier.");
  }
  return deriveNullifierMarkerPubkey({ programId, poolState, nullifier }).toBase58();
}

function assertNotMemoProgram(programId) {
  if (programId.toBase58() === SOLANA_MEMO_PROGRAM_ID) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction cannot use the Memo program as spend evidence.");
  }
}

function assertNoForbiddenPublicTerms(value, path = "transaction") {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenPublicSpendTerms.includes(key)) {
      throw new Error(`Vanta Private Pool v2 Solana spend transaction forbids ${path}.${key}.`);
    }
    assertNoForbiddenPublicTerms(child, `${path}.${key}`);
  }
}

function normalizeAccountMeta(account, index) {
  if (!account || typeof account !== "object") {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires accounts[${index}].`);
  }

  return {
    isSigner: Boolean(account.isSigner),
    isWritable: Boolean(account.isWritable),
    pubkey: requirePublicKey(account.pubkey, `accounts[${index}].pubkey`),
  };
}

function assertSpendProgramAccountLayout(accounts, data, programId) {
  if (accounts.length !== 7) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires exactly 7 spend accounts: pool, nullifier set, output queue, root history, nullifier marker, operator authority, and system program.",
    );
  }
  if (!accounts[0].isWritable || accounts[0].isSigner) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction requires accounts[0] to be the writable pool state.");
  }
  if (accounts[1].isSigner || accounts[1].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[1] to be the read-only nullifier set header account.",
    );
  }
  if (!accounts[2].isWritable || accounts[2].isSigner) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction requires accounts[2] to be the writable output queue.");
  }
  if (accounts[3].isSigner || accounts[3].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[3] to be the read-only root history account.",
    );
  }
  if (!accounts[4].isWritable || accounts[4].isSigner) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[4] to be the writable nullifier marker PDA.",
    );
  }
  const expectedMarker = deriveNullifierMarkerPubkey({
    nullifier: spendNullifierBytes(data),
    poolState: accounts[0].pubkey,
    programId,
  });
  if (!accounts[4].pubkey.equals(expectedMarker)) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[4] to match the spend nullifier PDA marker.",
    );
  }
  if (!accounts[5].isSigner || !accounts[5].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[5] to be the writable operator authority signer.",
    );
  }
  if (accounts[6].isSigner || accounts[6].isWritable || !accounts[6].pubkey.equals(SystemProgram.programId)) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[6] to be the read-only System Program.",
    );
  }
}

export function createVantaPrivatePoolV2ActualPrivateSpendInstruction(input = {}) {
  assertNoForbiddenPublicTerms(input);
  const programId = requirePublicKey(input.programId, "programId");
  assertNotMemoProgram(programId);

  if (!Array.isArray(input.accounts) || input.accounts.length === 0) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction requires non-empty accounts.");
  }

  const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
  requireSpendInstructionData(data);
  const accounts = input.accounts.map(normalizeAccountMeta);
  assertSpendProgramAccountLayout(accounts, data, programId);
  return new TransactionInstruction({
    data,
    keys: accounts,
    programId,
  });
}

export function buildVantaPrivatePoolV2ActualPrivateSpendTransaction(input = {}) {
  assertNoForbiddenPublicTerms(input);
  const relayerFeePayer = requirePublicKey(input.relayerFeePayer, "relayerFeePayer");
  const recentBlockhash = requireText(input.recentBlockhash, "recentBlockhash");
  const instruction = createVantaPrivatePoolV2ActualPrivateSpendInstruction(input);
  const operatorAuthority = instruction.keys[5]?.pubkey;
  if (!operatorAuthority || !operatorAuthority.equals(relayerFeePayer)) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction currently requires relayerFeePayer to equal operatorAuthority until operator co-signing is implemented.",
    );
  }
  const message = new TransactionMessage({
    instructions: [instruction],
    payerKey: relayerFeePayer,
    recentBlockhash,
  }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  const serializedTransaction = `base64:${Buffer.from(transaction.serialize()).toString("base64")}`;

  return {
    accountCount: instruction.keys.length,
    evidencePolicy: "real-solana-versioned-transaction-bytes-required",
    programId: instruction.programId.toBase58(),
    relayerFeePayer: relayerFeePayer.toBase58(),
    serializedTransaction,
    transactionVersion: "v0",
    version: VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_TRANSACTION_VERSION,
  };
}

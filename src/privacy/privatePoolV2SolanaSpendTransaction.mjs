import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export const VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_TRANSACTION_VERSION =
  "vanta-private-pool-v2-solana-spend-transaction-0.1";

export const SOLANA_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

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

function assertSpendProgramAccountLayout(accounts) {
  if (accounts.length < 4) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires the fourth account to be the read-only operator authority signer.",
    );
  }
  for (let index = 0; index < 3; index += 1) {
    if (!accounts[index].isWritable) {
      throw new Error(`Vanta Private Pool v2 Solana spend transaction requires accounts[${index}] to be writable.`);
    }
  }
  if (!accounts[3].isSigner || accounts[3].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires the fourth account to be the read-only operator authority signer.",
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
  const accounts = input.accounts.map(normalizeAccountMeta);
  assertSpendProgramAccountLayout(accounts);
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

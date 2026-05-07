import { toAddress, type TransactionInstructionInput } from "@solana/client";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";
import { readRpcFallbackEndpoints } from "@/solana/client";
import { isSolanaRpcRateLimitError } from "@/solana/rpcErrors";

export type NativeSolShieldDepositCandidate = {
  amount: number;
  amountDisplay: string;
  createdAt: number;
  signature: string;
  vaultOwner: string;
};

export const VANTA_NATIVE_SOL_SOURCE_ACCOUNT_NOT_READY_CODE =
  "VANTA_NATIVE_SOL_SOURCE_ACCOUNT_NOT_READY";
export const VANTA_NATIVE_SOL_ACCOUNT_NOT_ACTIVE_MESSAGE =
  "Vanta could not confirm a spendable mainnet SOL balance for this wallet. Refresh balances or try another browser-compatible mainnet RPC; Shield needs a small SOL reserve for network fees.";
export const VANTA_NATIVE_SOL_BALANCE_UNAVAILABLE_MESSAGE =
  "Vanta could not check this wallet's mainnet SOL balance through the configured RPC endpoints. Your wallet may still have SOL; refresh balances or try another browser-compatible mainnet RPC.";

export class VantaNativeSolSourceAccountNotReadyError extends Error {
  readonly code = VANTA_NATIVE_SOL_SOURCE_ACCOUNT_NOT_READY_CODE;

  constructor(message = VANTA_NATIVE_SOL_ACCOUNT_NOT_ACTIVE_MESSAGE) {
    super(message);
    this.name = "VantaNativeSolSourceAccountNotReadyError";
  }
}

export function isNativeSolSourceAccountNotReadyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === VANTA_NATIVE_SOL_SOURCE_ACCOUNT_NOT_READY_CODE
  );
}

const cachedBalanceReadConnections = new Map<string, Connection>();
const cachedVaultLamportsReads = new Map<string, {
  expiresAt: number;
  promise: Promise<bigint>;
}>();
const NATIVE_SOL_SHIELD_RPC_RETRY_DELAYS_MS = [250, 750, 1_500] as const;
const NATIVE_SOL_SHIELD_PARSED_TRANSACTION_RETRY_DELAYS_MS = [500, 1_500, 3_000, 5_000, 8_000] as const;
const VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIXES = [
  "vanta:native-sol-shield-note:v1:",
  "vanta:native-sol-shield-note:v2:",
] as const;

function getNativeSolShieldBalanceReadEndpoints() {
  return readRpcFallbackEndpoints;
}

function getBalanceReadConnection(readEndpoint: string) {
  const cachedConnection = cachedBalanceReadConnections.get(readEndpoint);

  if (cachedConnection) {
    return cachedConnection;
  }

  const connection = new Connection(readEndpoint, "confirmed");
  cachedBalanceReadConnections.set(readEndpoint, connection);
  return connection;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function retryNativeSolShieldRpcRead<T>(
  operation: (connection: Connection) => Promise<T>,
) {
  let lastError: unknown = null;

  for (const readEndpoint of getNativeSolShieldBalanceReadEndpoints()) {
    const connection = getBalanceReadConnection(readEndpoint);

    for (const delayMs of [0, ...NATIVE_SOL_SHIELD_RPC_RETRY_DELAYS_MS]) {
      if (delayMs > 0) {
        await wait(delayMs);
      }

      try {
        return await operation(connection);
      } catch (error) {
        lastError = error;

        if (!isSolanaRpcRateLimitError(error)) {
          break;
        }
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Native SOL Shield browser RPC read failed.");
}

function normalizeKnownLamportsBalance(value: bigint | number | null | undefined) {
  if (typeof value === "bigint") {
    return value >= 0n ? value : null;
  }

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return BigInt(Math.floor(value));
  }

  return null;
}

async function fetchNativeSolShieldLamports(ownerPublicKey: PublicKey) {
  let firstZeroBalance: bigint | null = null;

  for (const readEndpoint of getNativeSolShieldBalanceReadEndpoints()) {
    try {
      const lamports = BigInt(
        await getBalanceReadConnection(readEndpoint).getBalance(ownerPublicKey, "confirmed"),
      );

      if (lamports > 0n) {
        return lamports;
      }

      firstZeroBalance ??= lamports;
    } catch (error) {
      void error;
    }
  }

  if (firstZeroBalance !== null) {
    return firstZeroBalance;
  }

  throw new Error(VANTA_NATIVE_SOL_BALANCE_UNAVAILABLE_MESSAGE);
}

export function fetchNativeSolShieldVaultLamports(vaultOwner: string) {
  const now = Date.now();
  const cachedRead = cachedVaultLamportsReads.get(vaultOwner);

  if (cachedRead && cachedRead.expiresAt > now) {
    return cachedRead.promise;
  }

  const promise = fetchNativeSolShieldLamports(new PublicKey(vaultOwner));
  cachedVaultLamportsReads.set(vaultOwner, {
    expiresAt: now + 5_000,
    promise,
  });

  void promise.catch(() => {
    cachedVaultLamportsReads.delete(vaultOwner);
  });

  return promise;
}

function toInstructionInput(instruction: TransactionInstruction): TransactionInstructionInput {
  return {
    accounts: instruction.keys.map((account) => ({
      address: toAddress(account.pubkey.toBase58()),
      role: account.isWritable
        ? account.isSigner
          ? 3
          : 1
        : account.isSigner
          ? 2
          : 0,
    })),
    data: instruction.data,
    programAddress: toAddress(instruction.programId.toBase58()),
  };
}

export function solToLamports(amount: string) {
  const normalized = amount.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid SOL amount.");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  if (fractionPart.length > 9) {
    throw new Error("SOL supports up to 9 decimal places.");
  }

  const lamports = BigInt(wholePart || "0") * BigInt(LAMPORTS_PER_SOL) +
    BigInt(`${fractionPart}${"0".repeat(9)}`.slice(0, 9) || "0");

  if (lamports <= 0n) {
    throw new Error("SOL shield amount must be greater than zero.");
  }

  if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("SOL shield amount is too large for the current transaction builder.");
  }

  return lamports;
}

export function buildNativeSolShieldTransferInstructions(args: {
  amount: string;
  owner: string;
  vaultOwner: string;
}) {
  const lamports = solToLamports(args.amount);
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(args.owner),
    lamports: Number(lamports),
    toPubkey: new PublicKey(args.vaultOwner),
  });

  return [toInstructionInput(transferInstruction)];
}

function formatLamportsAsSol(lamports: number) {
  const whole = Math.floor(lamports / LAMPORTS_PER_SOL);
  const fractional = String(lamports % LAMPORTS_PER_SOL).padStart(9, "0");

  return `${whole}.${fractional}`.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
}

export function readNativeSolShieldTransferLamports(
  instruction: unknown,
  owner: string,
  vaultOwner: string,
) {
  if (typeof instruction !== "object" || instruction === null) {
    return null;
  }

  const parsed = (instruction as { parsed?: unknown }).parsed;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const typedParsed = parsed as {
    info?: {
      destination?: unknown;
      lamports?: unknown;
      source?: unknown;
    };
    type?: unknown;
  };

  if (typedParsed.type !== "transfer") {
    return null;
  }

  if (typedParsed.info?.source !== owner || typedParsed.info.destination !== vaultOwner) {
    return null;
  }

  const lamports = Number(typedParsed.info.lamports);
  return Number.isFinite(lamports) && lamports > 0 ? lamports : null;
}

async function fetchParsedTransactionsOneAtATime(
  connection: Connection,
  signatures: string[],
) {
  void connection;
  return readNativeSolShieldParsedTransactions(signatures);
}

async function readNativeSolShieldSignatures(ownerPublicKey: PublicKey, limit: number) {
  return retryNativeSolShieldRpcRead((connection) =>
    connection.getSignaturesForAddress(ownerPublicKey, { limit }),
  );
}

async function readNativeSolShieldParsedTransactions(signatures: string[]) {
  const transactions = [];

  for (const signature of signatures) {
    transactions.push(await readNativeSolShieldParsedTransactionAttempt(signature));
  }

  return transactions;
}

async function readNativeSolShieldParsedTransaction(signature: string) {
  for (const delayMs of [0, ...NATIVE_SOL_SHIELD_PARSED_TRANSACTION_RETRY_DELAYS_MS]) {
    if (delayMs > 0) {
      await wait(delayMs);
    }

    const transaction = await readNativeSolShieldParsedTransactionAttempt(signature);

    if (transaction !== null) {
      return transaction;
    }
  }

  return null;
}

async function readNativeSolShieldParsedTransactionAttempt(signature: string) {
  const [transaction] = await retryNativeSolShieldRpcRead((connection) =>
    connection.getParsedTransactions([signature], {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    }),
  );

  return transaction ?? null;
}

function amountDisplayToLamports(amountDisplay: string) {
  return Number(solToLamports(amountDisplay));
}

function readParsedMemoPayloadText(
  value: unknown,
  options: { allowBareString?: boolean } = {},
): string | null {
  if (typeof value === "string") {
    return options.allowBareString ? value : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as Record<string, unknown>;

  for (const key of ["memo", "data", "message", "text", "info"]) {
    const field = parsed[key];

    if (typeof field === "string") {
      return field;
    }

    if (field && typeof field === "object") {
      const memo = readParsedMemoPayloadText(field, { allowBareString: false });

      if (memo) {
        return memo;
      }
    }
  }

  for (const [key, field] of Object.entries(parsed)) {
    if (["memo", "data", "message", "text", "info"].includes(key)) {
      continue;
    }

    const memo = readParsedMemoPayloadText(field, { allowBareString: false });

    if (memo) {
      return memo;
    }
  }

  return null;
}

function readParsedMemoText(instruction: unknown) {
  if (!instruction || typeof instruction !== "object") {
    return null;
  }

  const parsedInstruction = instruction as {
    parsed?: unknown;
    program?: unknown;
    programId?: { toBase58?: () => string } | string;
  };
  const programId =
    typeof parsedInstruction.programId === "string"
      ? parsedInstruction.programId
      : parsedInstruction.programId?.toBase58?.();
  const isMemoInstruction =
    parsedInstruction.program === "spl-memo" || programId === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

  if (!isMemoInstruction) {
    return null;
  }

  return readParsedMemoPayloadText(parsedInstruction.parsed, { allowBareString: true });
}

function transactionContainsNativeSolShieldMemo(transaction: unknown) {
  const instructions =
    typeof transaction === "object" && transaction !== null
      ? (transaction as {
          transaction?: { message?: { instructions?: unknown } };
        }).transaction?.message?.instructions
      : null;

  if (!Array.isArray(instructions)) {
    return false;
  }

  return instructions.some((instruction) => {
    const memo = readParsedMemoText(instruction);
    return VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIXES.some((prefix) => memo?.includes(prefix));
  });
}

export function readNativeSolShieldTransactionTransferLamports(args: {
  owner: string;
  transaction: unknown;
  vaultOwner: string;
}) {
  const instructions =
    typeof args.transaction === "object" && args.transaction !== null
      ? (args.transaction as {
          transaction?: { message?: { instructions?: unknown } };
        }).transaction?.message?.instructions
      : null;

  if (!Array.isArray(instructions)) {
    return null;
  }

  return instructions
    .map((instruction) =>
      readNativeSolShieldTransferLamports(instruction, args.owner, args.vaultOwner),
    )
    .find((lamports): lamports is number => typeof lamports === "number") ?? null;
}

export function hasMatchingNativeSolShieldTransfer(args: {
  amountDisplay: string;
  owner: string;
  transaction: unknown;
  vaultOwner: string;
}) {
  const transferLamports = readNativeSolShieldTransactionTransferLamports({
    owner: args.owner,
    transaction: args.transaction,
    vaultOwner: args.vaultOwner,
  });

  if (!transferLamports) {
    return false;
  }

  return transferLamports === amountDisplayToLamports(args.amountDisplay);
}

export async function verifyNativeSolShieldDepositSignature(args: {
  amountDisplay: string;
  owner: string;
  signature: string;
  vaultOwner: string;
}) {
  const transaction = await readNativeSolShieldParsedTransaction(args.signature);

  if (!transaction) {
    throw new Error(
      "Confirmed native SOL Shield transaction was not yet available from the browser RPC. Wait a moment and use balance recovery; Vanta did not ask for another transfer.",
    );
  }

  return hasMatchingNativeSolShieldTransfer({
    amountDisplay: args.amountDisplay,
    owner: args.owner,
    transaction,
    vaultOwner: args.vaultOwner,
  });
}

export async function assertNativeSolShieldSourceAccountReady(args: {
  amountDisplay: string;
  knownLamportsBalance?: bigint | number | null;
  owner: string;
}) {
  const lamports = solToLamports(args.amountDisplay);
  const ownerPublicKey = new PublicKey(args.owner);
  const knownLamportsBalance = normalizeKnownLamportsBalance(args.knownLamportsBalance);
  const availableLamports =
    knownLamportsBalance ?? await fetchNativeSolShieldLamports(ownerPublicKey);

  if (availableLamports <= 0n) {
    throw new VantaNativeSolSourceAccountNotReadyError();
  }

  if (availableLamports <= lamports) {
    throw new Error(
      "The connected wallet does not have enough mainnet SOL left for both the shield amount and network fees.",
    );
  }
}

export async function fetchNativeSolShieldDepositCandidates(args: {
  existingDepositSignatures?: ReadonlySet<string>;
  limit?: number;
  owner: string;
  vaultOwner: string;
}) {
  const ownerPublicKey = new PublicKey(args.owner);
  const vaultOwner = new PublicKey(args.vaultOwner).toBase58();
  const existingDepositSignatures = args.existingDepositSignatures ?? new Set<string>();
  const signatures = await readNativeSolShieldSignatures(ownerPublicKey, args.limit ?? 30);
  const candidateSignatures = signatures
    .filter((signature) => signature.err === null && !existingDepositSignatures.has(signature.signature))
    .map((signature) => signature.signature);

  if (candidateSignatures.length === 0) {
    return [];
  }

  const transactions = await fetchParsedTransactionsOneAtATime(
    getBalanceReadConnection(getNativeSolShieldBalanceReadEndpoints()[0]),
    candidateSignatures,
  );

  return transactions.flatMap((transaction, index): NativeSolShieldDepositCandidate[] => {
    if (!transaction) {
      return [];
    }

    if (transactionContainsNativeSolShieldMemo(transaction)) {
      return [];
    }

    const signature = candidateSignatures[index];
    const transferLamports = transaction.transaction.message.instructions
      .map((instruction) => readNativeSolShieldTransferLamports(instruction, args.owner, vaultOwner))
      .find((lamports): lamports is number => typeof lamports === "number");

    if (!transferLamports) {
      return [];
    }

    const amountDisplay = formatLamportsAsSol(transferLamports);

    return [
      {
        amount: transferLamports / LAMPORTS_PER_SOL,
        amountDisplay,
        createdAt: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
        signature,
        vaultOwner,
      },
    ];
  });
}

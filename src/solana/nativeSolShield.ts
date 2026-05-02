import { toAddress, type TransactionInstructionInput } from "@solana/client";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";
import { endpoint } from "@/solana/client";

export type NativeSolShieldDepositCandidate = {
  amount: number;
  amountDisplay: string;
  createdAt: number;
  signature: string;
  vaultOwner: string;
};

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
  const transactions = [];

  for (const signature of signatures) {
    const [transaction] = await connection.getParsedTransactions([signature], {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    transactions.push(transaction);
  }

  return transactions;
}

function amountDisplayToLamports(amountDisplay: string) {
  return Number(solToLamports(amountDisplay));
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
  const connection = new Connection(endpoint, "confirmed");
  const transaction = await connection.getParsedTransaction(args.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  return hasMatchingNativeSolShieldTransfer({
    amountDisplay: args.amountDisplay,
    owner: args.owner,
    transaction,
    vaultOwner: args.vaultOwner,
  });
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
  const connection = new Connection(endpoint, "confirmed");
  const signatures = await connection.getSignaturesForAddress(ownerPublicKey, {
    limit: args.limit ?? 30,
  });
  const candidateSignatures = signatures
    .filter((signature) => signature.err === null && !existingDepositSignatures.has(signature.signature))
    .map((signature) => signature.signature);

  if (candidateSignatures.length === 0) {
    return [];
  }

  const transactions = await fetchParsedTransactionsOneAtATime(connection, candidateSignatures);

  return transactions.flatMap((transaction, index): NativeSolShieldDepositCandidate[] => {
    if (!transaction) {
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

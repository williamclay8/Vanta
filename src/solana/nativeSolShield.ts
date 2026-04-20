import { toAddress, type TransactionInstructionInput } from "@solana/client";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";

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

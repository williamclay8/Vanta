import { toAddress, type TransactionInstructionInput } from "@solana/client";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  type TransactionInstruction,
} from "@solana/web3.js";
import { endpoint } from "@/solana/client";

const SUPPORTED_TOKEN_PROGRAM_IDS = [
  TOKEN_PROGRAM_ID.toBase58(),
  TOKEN_2022_PROGRAM_ID.toBase58(),
] as const;

let cachedConnection: Connection | null = null;

function getConnection() {
  if (!cachedConnection) {
    cachedConnection = new Connection(endpoint, "confirmed");
  }

  return cachedConnection;
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

function tokenAmountToBaseUnits(amount: string, decimals: number) {
  const normalized = amount.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid token amount.");
  }

  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error("Token decimals are not configured.");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  if (fractionPart.length > decimals) {
    throw new Error(`This asset supports up to ${decimals} decimal places.`);
  }

  const baseUnits =
    BigInt(wholePart || "0") * 10n ** BigInt(decimals) +
    BigInt(`${fractionPart}${"0".repeat(decimals)}`.slice(0, decimals) || "0");

  if (baseUnits <= 0n) {
    throw new Error("Shield amount must be greater than zero.");
  }

  return baseUnits;
}

async function resolveTokenProgramId(mintAddress: PublicKey) {
  const accountInfo = await getConnection().getAccountInfo(mintAddress, "confirmed");
  const owner = accountInfo?.owner.toBase58();

  if (!owner) {
    throw new Error("Token mint account could not be found.");
  }

  if (!SUPPORTED_TOKEN_PROGRAM_IDS.includes(owner as (typeof SUPPORTED_TOKEN_PROGRAM_IDS)[number])) {
    throw new Error("Shielding currently supports SPL Token and Token-2022 mints.");
  }

  return new PublicKey(owner);
}

export async function buildSplTokenShieldTransferInstructions(args: {
  amount: string;
  decimals: number;
  mintAddress: string;
  owner: string;
  vaultOwner: string;
}) {
  const owner = new PublicKey(args.owner);
  const vaultOwner = new PublicKey(args.vaultOwner);
  const mint = new PublicKey(args.mintAddress);
  const tokenProgramId = await resolveTokenProgramId(mint);
  const amountBaseUnits = tokenAmountToBaseUnits(args.amount, args.decimals);
  const sourceAta = getAssociatedTokenAddressSync(
    mint,
    owner,
    false,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const destinationAta = getAssociatedTokenAddressSync(
    mint,
    vaultOwner,
    true,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  return [
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      destinationAta,
      vaultOwner,
      mint,
      tokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    createTransferCheckedInstruction(
      sourceAta,
      mint,
      destinationAta,
      owner,
      amountBaseUnits,
      args.decimals,
      [],
      tokenProgramId,
    ),
  ].map(toInstructionInput);
}

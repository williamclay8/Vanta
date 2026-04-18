import { BN } from "@coral-xyz/anchor";
import { toAddress, type TransactionInstructionInput } from "@solana/client";
import DLMM from "@meteora-ag/dlmm";
import {
  Connection,
  PublicKey,
  type TransactionInstruction,
} from "@solana/web3.js";
import { endpoint } from "@/solana/client";
import { liveShieldAsset, liveSwapPair } from "@/solana/shieldConfig";

export type PublicSwapAssetKey = "VUSD" | "SOL";
export type ShieldedSwapAssetKey = "VUSD" | "SOL";

export type ExecutableSourceAsset = {
  decimals: number;
  kind: "native" | "spl";
  label: string;
  mintAddress: string;
  symbol: PublicSwapAssetKey;
};

export type ExecutableShieldedAsset = {
  label: string;
  symbol: ShieldedSwapAssetKey;
};

export type PublicToVusdQuote = {
  inputAmount: string;
  inputAsset: PublicSwapAssetKey;
  inputMint: string;
  minOutputAmount: string;
  outputAmount: string;
  outputAsset: "VUSD";
  outputMint: string;
  venueFamily: "DLMM";
  venueName: "Meteora";
  venueNetwork: "Devnet";
  venuePoolAddress: string;
  binArraysPubkey: string[];
};

const DEFAULT_VUSD_DECIMALS = 6;
const DEFAULT_SOL_DECIMALS = 9;
const DEFAULT_ALLOWED_SLIPPAGE_BPS = 50;

const executableSourceAssets: ExecutableSourceAsset[] = [
  {
    decimals: DEFAULT_VUSD_DECIMALS,
    kind: "spl",
    label: "VUSD",
    mintAddress: liveShieldAsset.mintAddress ?? "",
    symbol: "VUSD",
  },
  {
    decimals: DEFAULT_SOL_DECIMALS,
    kind: "native",
    label: "SOL",
    mintAddress: liveSwapPair.solAssetId,
    symbol: "SOL",
  },
];

const executableShieldedAssets: ExecutableShieldedAsset[] = [
  {
    label: "Shielded VUSD",
    symbol: "VUSD",
  },
  {
    label: "Shielded SOL",
    symbol: "SOL",
  },
];

let cachedConnection: Connection | null = null;
let cachedPool: Awaited<ReturnType<typeof DLMM.create>> | null = null;
let cachedPoolAddress: string | null = null;

function getConnection() {
  if (!cachedConnection) {
    cachedConnection = new Connection(endpoint, "confirmed");
  }

  return cachedConnection;
}

async function getDlmmPool() {
  if (!liveSwapPair.venuePoolAddress) {
    throw new Error("Swap requires one configured Meteora DLMM devnet pool.");
  }

  if (!cachedPool || cachedPoolAddress !== liveSwapPair.venuePoolAddress) {
    cachedPool = await DLMM.create(
      getConnection(),
      new PublicKey(liveSwapPair.venuePoolAddress),
    );
    cachedPoolAddress = liveSwapPair.venuePoolAddress;
  }

  return cachedPool;
}

function formatAtomicAmount(value: BN, decimals: number) {
  const raw = value.toString(10);

  if (decimals === 0) {
    return raw;
  }

  const padded = raw.padStart(decimals + 1, "0");
  const wholePart = padded.slice(0, -decimals);
  const fractionPart = padded.slice(-decimals).replace(/0+$/, "");

  return fractionPart ? `${wholePart}.${fractionPart}` : wholePart;
}

function toAtomicAmount(value: string, decimals: number) {
  const normalized = value.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid amount.");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const scaledFraction = `${fractionPart}${"0".repeat(decimals)}`.slice(0, decimals);

  return new BN(`${wholePart}${scaledFraction}`.replace(/^0+(?=\d)/, "") || "0");
}

function getExecutableSourceAsset(symbol: PublicSwapAssetKey) {
  const asset = executableSourceAssets.find((candidate) => candidate.symbol === symbol);

  if (!asset) {
    throw new Error("Unsupported public source asset.");
  }

  if (asset.symbol === "VUSD" && !asset.mintAddress) {
    throw new Error("VUSD mint is not configured.");
  }

  return asset;
}

export function listExecutableSourceAssets() {
  return executableSourceAssets.filter((asset) =>
    asset.symbol === "SOL" ? true : Boolean(asset.mintAddress),
  );
}

export function listExecutableShieldedAssets() {
  return executableShieldedAssets;
}

export function formatAssetAmount(value: number, symbol: PublicSwapAssetKey | ShieldedSwapAssetKey) {
  const decimals = symbol === "SOL" ? 4 : 2;

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: symbol === "SOL" ? 6 : 2,
  })} ${symbol}`;
}

export async function fetchPublicToVusdQuote(args: {
  amount: string;
  inputAsset: PublicSwapAssetKey;
}) {
  if (!liveShieldAsset.mintAddress) {
    throw new Error("VUSD mint is not configured.");
  }

  if (args.inputAsset === "VUSD") {
    return {
      inputAmount: args.amount,
      inputAsset: "VUSD",
      inputMint: liveShieldAsset.mintAddress,
      minOutputAmount: args.amount,
      outputAmount: args.amount,
      outputAsset: "VUSD",
      outputMint: liveShieldAsset.mintAddress,
      venueFamily: "DLMM" as const,
      venueName: "Meteora" as const,
      venueNetwork: "Devnet" as const,
      venuePoolAddress: liveSwapPair.venuePoolAddress ?? "",
      binArraysPubkey: [],
    } satisfies PublicToVusdQuote;
  }

  const inputAsset = getExecutableSourceAsset(args.inputAsset);
  const pool = await getDlmmPool();
  const swapForY = pool.tokenX.publicKey.equals(new PublicKey(inputAsset.mintAddress))
    ? pool.tokenY.publicKey.equals(new PublicKey(liveShieldAsset.mintAddress))
    : false;
  const reverseMatches =
    pool.tokenY.publicKey.equals(new PublicKey(inputAsset.mintAddress)) &&
    pool.tokenX.publicKey.equals(new PublicKey(liveShieldAsset.mintAddress));

  if (!swapForY && !reverseMatches) {
    throw new Error("The configured pool does not support this public route.");
  }

  const inAmount = toAtomicAmount(args.amount, inputAsset.decimals);
  const binArrays = await pool.getBinArrayForSwap(swapForY || !reverseMatches);
  const quote = await pool.swapQuote(
    inAmount,
    swapForY || !reverseMatches,
    new BN(DEFAULT_ALLOWED_SLIPPAGE_BPS),
    binArrays,
  );

  return {
    inputAmount: args.amount,
    inputAsset: args.inputAsset,
    inputMint: inputAsset.mintAddress,
    minOutputAmount: formatAtomicAmount(quote.minOutAmount, DEFAULT_VUSD_DECIMALS),
    outputAmount: formatAtomicAmount(quote.outAmount, DEFAULT_VUSD_DECIMALS),
    outputAsset: "VUSD",
    outputMint: liveShieldAsset.mintAddress,
    venueFamily: "DLMM" as const,
    venueName: "Meteora" as const,
    venueNetwork: "Devnet" as const,
    venuePoolAddress: liveSwapPair.venuePoolAddress ?? "",
    binArraysPubkey: quote.binArraysPubkey.map((pubkey) => pubkey.toBase58()),
  } satisfies PublicToVusdQuote;
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

export async function buildPublicToVusdSwapInstructions(args: {
  quote: PublicToVusdQuote;
  userPublicKey: string;
}) {
  if (args.quote.inputAsset === "VUSD") {
    throw new Error("A public swap transaction is not required for VUSD input.");
  }

  if (!liveSwapPair.venuePoolAddress || !liveShieldAsset.mintAddress) {
    throw new Error("Live swap pair is not configured.");
  }

  const pool = await getDlmmPool();
  const inputAsset = getExecutableSourceAsset(args.quote.inputAsset);
  const user = new PublicKey(args.userPublicKey);
  const transaction = await pool.swap({
    binArraysPubkey: args.quote.binArraysPubkey.map((pubkey) => new PublicKey(pubkey)),
    inAmount: toAtomicAmount(args.quote.inputAmount, inputAsset.decimals),
    inToken: new PublicKey(inputAsset.mintAddress),
    lbPair: new PublicKey(liveSwapPair.venuePoolAddress),
    minOutAmount: toAtomicAmount(args.quote.minOutputAmount, DEFAULT_VUSD_DECIMALS),
    outToken: new PublicKey(liveShieldAsset.mintAddress),
    user,
  });
  return transaction.instructions.map(toInstructionInput);
}

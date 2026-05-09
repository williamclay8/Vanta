import { BN } from "@coral-xyz/anchor";
import { toAddress, type TransactionInstructionInput } from "@solana/client";
import DLMM from "@meteora-ag/dlmm";
import {
  Connection,
  PublicKey,
  type TransactionInstruction,
} from "@solana/web3.js";
import { endpoint } from "@/solana/client";
import {
  ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS,
  getLiveShieldTokenAsset,
  listLiveShieldTokenAssets,
  liveSwapPair,
  type LiveShieldTokenAssetConfig,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import type { WalletPublicAsset } from "@/solana/useWalletPublicAssets";

export type ShieldedSwapAssetKey = LiveShieldTokenAssetKey | "SOL";

export type ExecutableShieldedAsset = {
  label: string;
  symbol: ShieldedSwapAssetKey;
};

type JupiterQuoteResponse = {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpactPct?: string;
  routePlan?: unknown[];
};

type JupiterInstructionPayload = {
  data: string;
  programId: string;
  accounts: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
};

export type PublicToUsdcQuote = {
  inputAmount: string;
  inputAssetLabel: string;
  inputAssetSymbol: string;
  inputMint: string;
  minOutputAmount: string;
  outputAmount: string;
  outputAsset: LiveShieldTokenAssetKey;
  outputMint: string;
  venueFamily: "Aggregator" | "DLMM";
  venueName: "Jupiter" | "Meteora";
  venueNetwork: "Mainnet";
  venuePoolAddress: string;
  binArraysPubkey: string[];
  jupiterQuoteResponse?: JupiterQuoteResponse;
};

export type PublicShieldRouteEvidence = {
  provider: "jupiter" | "meteora";
  sourceAmount: string;
  sourceAsset: string;
  sourceMintAddress: string;
  routeSignature: string;
  targetAmount: string;
  targetAsset: LiveShieldTokenAssetKey;
  targetMintAddress: string;
};

const DEFAULT_ALLOWED_SLIPPAGE_BPS = 50;
const DEFAULT_SOL_DECIMALS = 9;
const JUPITER_QUOTE_URL = "https://api.jup.ag/swap/v1/quote";
const JUPITER_SWAP_INSTRUCTIONS_URL = "https://api.jup.ag/swap/v1/swap-instructions";

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
    throw new Error("Swap requires one configured Meteora DLMM mainnet pool.");
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

function getShieldRouteAsset(asset: ShieldedSwapAssetKey): LiveShieldTokenAssetConfig {
  return getLiveShieldTokenAsset(asset === "SOL" ? "USDC" : asset);
}

function getShieldRouteDecimals(asset: LiveShieldTokenAssetKey) {
  return getLiveShieldTokenAsset(asset).decimals;
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

function toJupiterInstructionInput(
  instruction: JupiterInstructionPayload,
): TransactionInstructionInput {
  const binary = atob(instruction.data);
  const data = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return {
    accounts: instruction.accounts.map((account) => ({
      address: toAddress(account.pubkey),
      role: account.isWritable ? (account.isSigner ? 3 : 1) : account.isSigner ? 2 : 0,
    })),
    data,
    programAddress: toAddress(instruction.programId),
  };
}

async function fetchJupiterQuote(args: {
  amountAtomic: string;
  inputMint: string;
  outputMint: string;
}) {
  const routeVariants = [
    { restrictIntermediateTokens: "true" },
    { restrictIntermediateTokens: "false" },
  ] as const;
  let lastError: Error | null = null;

  for (const variant of routeVariants) {
    const searchParams = new URLSearchParams({
      amount: args.amountAtomic,
      inputMint: args.inputMint,
      outputMint: args.outputMint,
      slippageBps: String(DEFAULT_ALLOWED_SLIPPAGE_BPS),
      restrictIntermediateTokens: variant.restrictIntermediateTokens,
    });

    try {
      const response = await fetch(`${JUPITER_QUOTE_URL}?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Jupiter quote failed with status ${String(response.status)}.`);
      }

      const parsed = (await response.json()) as JupiterQuoteResponse;

      if (
        typeof parsed.outAmount !== "string" ||
        typeof parsed.otherAmountThreshold !== "string" ||
        typeof parsed.inputMint !== "string" ||
        typeof parsed.outputMint !== "string"
      ) {
        throw new Error("Jupiter quote response was invalid.");
      }

      return parsed;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Jupiter quote could not be loaded.");
    }
  }

  throw lastError ?? new Error("Jupiter quote could not be loaded.");
}

export function listExecutableShieldedAssets() {
  return [
    ...listLiveShieldTokenAssets().map((asset) => ({
      label: `Shielded ${asset.symbol}`,
      symbol: asset.symbol,
    })),
    {
      label: "Shielded SOL",
      symbol: "SOL" as const,
    },
  ];
}

export function formatAssetAmount(value: number, symbol: string) {
  const isKnownShieldToken = (ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS as readonly string[]).includes(symbol);
  const tokenDecimals =
    symbol === "SOL" || !isKnownShieldToken
      ? null
      : getLiveShieldTokenAsset(symbol as LiveShieldTokenAssetKey).decimals;
  const decimals = symbol === "SOL" ? 4 : tokenDecimals ? Math.min(tokenDecimals, 4) : 2;

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: symbol === "SOL" ? 6 : tokenDecimals ? Math.min(tokenDecimals, 6) : 2,
  })} ${symbol}`;
}

export async function fetchPublicToUsdcQuote(args: {
  amount: string;
  inputAsset: WalletPublicAsset;
  outputAsset: ShieldedSwapAssetKey;
}) {
  const outputShieldAsset = getShieldRouteAsset(args.outputAsset);

  if (!outputShieldAsset.mintAddress) {
    throw new Error(`Shield target ${args.outputAsset} is not configured.`);
  }

  const outputDecimals = getShieldRouteDecimals(outputShieldAsset.assetKey);
  const isCanonicalShieldInput = args.inputAsset.mintAddress === outputShieldAsset.mintAddress;

  if (isCanonicalShieldInput) {
    return {
      inputAmount: args.amount,
      inputAssetLabel: args.inputAsset.label,
      inputAssetSymbol: args.inputAsset.symbol,
      inputMint: outputShieldAsset.mintAddress,
      minOutputAmount: args.amount,
      outputAmount: args.amount,
      outputAsset: outputShieldAsset.assetKey,
      outputMint: outputShieldAsset.mintAddress,
      venueFamily: "DLMM" as const,
      venueName: "Meteora" as const,
      venueNetwork: "Mainnet" as const,
      venuePoolAddress: liveSwapPair.venuePoolAddress ?? "",
      binArraysPubkey: [],
    } satisfies PublicToUsdcQuote;
  }

  if (args.inputAsset.symbol === "SOL" && outputShieldAsset.assetKey === "USDC" && liveSwapPair.venuePoolAddress) {
    try {
      const pool = await getDlmmPool();
      const swapForY = pool.tokenX.publicKey.equals(new PublicKey(args.inputAsset.mintAddress))
        ? pool.tokenY.publicKey.equals(new PublicKey(outputShieldAsset.mintAddress))
        : false;
      const reverseMatches =
        pool.tokenY.publicKey.equals(new PublicKey(args.inputAsset.mintAddress)) &&
        pool.tokenX.publicKey.equals(new PublicKey(outputShieldAsset.mintAddress));

      if (swapForY || reverseMatches) {
        const inAmount = toAtomicAmount(args.amount, DEFAULT_SOL_DECIMALS);
        const binArrays = await pool.getBinArrayForSwap(swapForY || !reverseMatches);
        const quote = await pool.swapQuote(
          inAmount,
          swapForY || !reverseMatches,
          new BN(DEFAULT_ALLOWED_SLIPPAGE_BPS),
          binArrays,
        );

        return {
          inputAmount: args.amount,
          inputAssetLabel: args.inputAsset.label,
          inputAssetSymbol: args.inputAsset.symbol,
          inputMint: args.inputAsset.mintAddress,
          minOutputAmount: formatAtomicAmount(quote.minOutAmount, outputDecimals),
          outputAmount: formatAtomicAmount(quote.outAmount, outputDecimals),
          outputAsset: outputShieldAsset.assetKey,
          outputMint: outputShieldAsset.mintAddress,
          venueFamily: "DLMM" as const,
          venueName: "Meteora" as const,
          venueNetwork: "Mainnet" as const,
          venuePoolAddress: liveSwapPair.venuePoolAddress ?? "",
          binArraysPubkey: quote.binArraysPubkey.map((pubkey) => pubkey.toBase58()),
        } satisfies PublicToUsdcQuote;
      }
    } catch {
      // Fall through to Jupiter below so broader routes still work.
    }
  }

  const amountAtomic = toAtomicAmount(args.amount, args.inputAsset.decimals).toString(10);
  const parsed = await fetchJupiterQuote({
    amountAtomic,
    inputMint: args.inputAsset.mintAddress,
    outputMint: outputShieldAsset.mintAddress,
  });

  return {
    inputAmount: args.amount,
    inputAssetLabel: args.inputAsset.label,
    inputAssetSymbol: args.inputAsset.symbol,
    inputMint: args.inputAsset.mintAddress,
    minOutputAmount: Number(parsed.otherAmountThreshold) > 0
      ? (Number(parsed.otherAmountThreshold) / 10 ** outputDecimals).toFixed(outputDecimals)
      : "0",
    outputAmount: (Number(parsed.outAmount) / 10 ** outputDecimals).toFixed(outputDecimals),
    outputAsset: outputShieldAsset.assetKey,
    outputMint: outputShieldAsset.mintAddress,
    venueFamily: "Aggregator" as const,
    venueName: "Jupiter" as const,
    venueNetwork: "Mainnet" as const,
    venuePoolAddress: "aggregated-route",
    binArraysPubkey: [],
    jupiterQuoteResponse: parsed,
  } satisfies PublicToUsdcQuote;
}

export async function buildPublicToUsdcSwapInstructions(args: {
  quote: PublicToUsdcQuote;
  userPublicKey: string;
}) {
  if (!args.quote.outputMint) {
    throw new Error("Shield target mint is not configured.");
  }

  if (args.quote.venueName === "Meteora") {
    if (args.quote.inputMint === args.quote.outputMint) {
      throw new Error("A public swap transaction is not required for USDC input.");
    }

    const pool = await getDlmmPool();
    const inputDecimals = DEFAULT_SOL_DECIMALS;
    const outputDecimals = getShieldRouteDecimals(args.quote.outputAsset);
    const user = new PublicKey(args.userPublicKey);
    const transaction = await pool.swap({
      binArraysPubkey: args.quote.binArraysPubkey.map((pubkey) => new PublicKey(pubkey)),
      inAmount: toAtomicAmount(args.quote.inputAmount, inputDecimals),
      inToken: new PublicKey(args.quote.inputMint),
      lbPair: new PublicKey(liveSwapPair.venuePoolAddress!),
      minOutAmount: toAtomicAmount(args.quote.minOutputAmount, outputDecimals),
      outToken: new PublicKey(args.quote.outputMint),
      user,
    });

    return transaction.instructions.map(toInstructionInput);
  }

  if (!args.quote.jupiterQuoteResponse) {
    throw new Error("Jupiter route execution requires a Jupiter quote response.");
  }

  const response = await fetch(JUPITER_SWAP_INSTRUCTIONS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      dynamicComputeUnitLimit: true,
      quoteResponse: args.quote.jupiterQuoteResponse,
      userPublicKey: args.userPublicKey,
      wrapAndUnwrapSol: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Jupiter instruction build failed with status ${String(response.status)}.`);
  }

  const parsed = (await response.json()) as {
    cleanupInstruction?: JupiterInstructionPayload | null;
    computeBudgetInstructions?: JupiterInstructionPayload[];
    otherInstructions?: JupiterInstructionPayload[];
    setupInstructions?: JupiterInstructionPayload[];
    swapInstruction?: JupiterInstructionPayload | null;
  };

  if (!parsed.swapInstruction) {
    throw new Error("Jupiter did not return a swap instruction.");
  }

  return [
    ...(parsed.computeBudgetInstructions ?? []).map(toJupiterInstructionInput),
    ...(parsed.setupInstructions ?? []).map(toJupiterInstructionInput),
    ...(parsed.otherInstructions ?? []).map(toJupiterInstructionInput),
    toJupiterInstructionInput(parsed.swapInstruction),
    ...(parsed.cleanupInstruction ? [toJupiterInstructionInput(parsed.cleanupInstruction)] : []),
  ];
}

export function createPublicShieldRouteEvidence(args: {
  quote: PublicToUsdcQuote;
  routeSignature: string;
  targetAmount?: string | null;
}): PublicShieldRouteEvidence {
  const targetAmount = args.targetAmount?.trim() || args.quote.outputAmount;

  if (!args.routeSignature.trim()) {
    throw new Error("Shield route evidence requires a route signature.");
  }

  if (!targetAmount.trim()) {
    throw new Error("Shield route evidence requires a target amount.");
  }

  return {
    provider: args.quote.venueName === "Jupiter" ? "jupiter" : "meteora",
    routeSignature: args.routeSignature,
    sourceAmount: args.quote.inputAmount,
    sourceAsset: args.quote.inputAssetSymbol,
    sourceMintAddress: args.quote.inputMint,
    targetAmount,
    targetAsset: args.quote.outputAsset,
    targetMintAddress: args.quote.outputMint,
  };
}

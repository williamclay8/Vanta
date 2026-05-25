import { createRequire } from "node:module";
import { Connection, PublicKey } from "@solana/web3.js";

const require = createRequire(import.meta.url);
const { BN } = require("@coral-xyz/anchor");
const dlmmModule = require("@meteora-ag/dlmm");
const DLMM = dlmmModule.default ?? dlmmModule;

const DEFAULT_QUOTE_TTL_MS = 60_000;
const DEFAULT_MAX_EXECUTION_DRIFT_BPS = 150;
const DEFAULT_PRICE_SIDE = "y_per_x";
const DEFAULT_HEALTH_INPUT_AMOUNT = "1.000000";
const DEFAULT_MAX_SOURCE_AGE_MS = 120_000;
const DEFAULT_CONTEXT_SOURCE = "api_then_sdk";
const DEFAULT_SDK_BIN_ARRAY_COUNT = 16;
const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";

export const SWAP_LANE = "USDC->SOL";
export const SWAP_VENUE_NAME = "Meteora";
export const SWAP_VENUE_FAMILY = "DLMM";
export const SWAP_NETWORK = "Mainnet";

function getOptionalEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function getNumberEnv(name, fallback) {
  const raw = getOptionalEnv(name);

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return parsed;
}

function getStringCandidate(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getNumberCandidate(...values) {
  for (const value of values) {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function getTimestampCandidate(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value > 10_000_000_000 ? Math.round(value) : Math.round(value * 1000);
    }

    if (typeof value === "string" && value.trim()) {
      const timestamp = Date.parse(value);

      if (!Number.isNaN(timestamp)) {
        return timestamp;
      }

      const numericValue = Number(value);

      if (Number.isFinite(numericValue) && numericValue > 0) {
        return numericValue > 10_000_000_000
          ? Math.round(numericValue)
          : Math.round(numericValue * 1000);
      }
    }
  }

  return null;
}

function getNestedObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function collectCandidateObjects(root) {
  const queue = [root];
  const candidates = [];
  const seen = new Set();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || typeof current !== "object" || seen.has(current)) {
      continue;
    }

    seen.add(current);

    if (!Array.isArray(current)) {
      candidates.push(current);
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }
      continue;
    }

    for (const key of [
      "data",
      "pair",
      "pairs",
      "pool",
      "pools",
      "lbPair",
      "lbPairs",
      "result",
      "items",
      "rows",
    ]) {
      if (key in current) {
        queue.push(current[key]);
      }
    }
  }

  return candidates;
}

function createSwapQuoteId(args) {
  return `swap_quote_${Buffer.from(
    [
      args.inputAmount,
      args.minOutputAmount,
      args.outputAmount,
      args.slippageBps,
      args.venueFamily,
      args.venuePoolAddress,
      args.quoteTimestamp,
    ].join("|"),
    "utf8",
  )
    .toString("base64url")
    .slice(0, 32)}`;
}

function bpsDifference(left, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right) || left <= 0 || right <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (Math.abs(left - right) / right) * 10_000;
}

function buildHealthResult(overrides) {
  return {
    checkedAt: Date.now(),
    lane: SWAP_LANE,
    message: overrides.message,
    network: SWAP_NETWORK,
    poolAddress: overrides.poolAddress ?? null,
    reason: overrides.reason ?? null,
    status: overrides.status,
    venueFamily: SWAP_VENUE_FAMILY,
    venueName: SWAP_VENUE_NAME,
    ...("details" in overrides ? { details: overrides.details } : {}),
  };
}

function getRpcEndpoint() {
  return (
    getOptionalEnv("SOLANA_RPC_URL") ??
    getOptionalEnv("VITE_SOLANA_RPC_URL") ??
    DEFAULT_RPC_URL
  );
}

let cachedDlmmConnection = null;
let cachedDlmmConnectionEndpoint = null;

function getDlmmConnection() {
  const endpoint = getRpcEndpoint();

  if (!cachedDlmmConnection || cachedDlmmConnectionEndpoint !== endpoint) {
    cachedDlmmConnection = new Connection(endpoint, "confirmed");
    cachedDlmmConnectionEndpoint = endpoint;
  }

  return cachedDlmmConnection;
}

function validateContextSource(value) {
  return value === "api_only" || value === "api_then_sdk" || value === "sdk_only";
}

function getMintLabel(mintAddress) {
  if (mintAddress === "So11111111111111111111111111111111111111112") {
    return "SOL";
  }

  const usdcMint =
    getOptionalEnv("VANTA_MAINNET_TOKEN_MINT") ?? getOptionalEnv("VITE_VANTA_MAINNET_TOKEN_MINT");

  if (usdcMint && mintAddress === usdcMint) {
    return "USDC";
  }

  return `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`;
}

function getMintDecimals(mintAddress) {
  return getMintLabel(mintAddress) === "SOL" ? 9 : 6;
}

function decimalAmountToBn(amount, decimals) {
  const normalized = String(amount).trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Invalid decimal amount for Meteora quote inference.");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const scaledFraction = (fractionPart + "0".repeat(decimals)).slice(0, decimals);
  const lamports = `${wholePart}${scaledFraction}`.replace(/^0+(?=\d)/, "");

  return new BN(lamports || "0");
}

function bnToDecimalString(value, decimals) {
  const raw = value.toString(10);

  if (decimals === 0) {
    return raw;
  }

  const padded = raw.padStart(decimals + 1, "0");
  const wholePart = padded.slice(0, -decimals);
  const fractionPart = padded.slice(-decimals).replace(/0+$/, "");

  return fractionPart ? `${wholePart}.${fractionPart}` : wholePart;
}

function isInsufficientSdkLiquidityError(error) {
  return (
    error instanceof Error &&
    typeof error.message === "string" &&
    error.message.toLowerCase().includes("insufficient liquidity")
  );
}

export function readSwapLaneConfig() {
  const poolAddress = getOptionalEnv("VANTA_METEORA_DLMM_POOL_ADDRESS");
  const contextUrlTemplate = getOptionalEnv("VANTA_METEORA_DLMM_POOL_CONTEXT_URL");
  const priceSide = getOptionalEnv("VANTA_METEORA_DLMM_PRICE_SIDE") ?? DEFAULT_PRICE_SIDE;
  const contextSource = getOptionalEnv("VANTA_METEORA_DLMM_CONTEXT_SOURCE") ?? DEFAULT_CONTEXT_SOURCE;

  return {
    contextSource,
    contextUrlTemplate,
    healthInputAmount: getOptionalEnv("VANTA_METEORA_DLMM_HEALTH_INPUT_AMOUNT") ?? DEFAULT_HEALTH_INPUT_AMOUNT,
    maxExecutionDriftBps: getNumberEnv(
      "VANTA_METEORA_DLMM_MAX_EXECUTION_DRIFT_BPS",
      DEFAULT_MAX_EXECUTION_DRIFT_BPS,
    ),
    maxSourceAgeMs: getNumberEnv(
      "VANTA_METEORA_DLMM_MAX_SOURCE_AGE_MS",
      DEFAULT_MAX_SOURCE_AGE_MS,
    ),
    poolAddress,
    priceSide,
    quoteTtlMs: getNumberEnv("VANTA_METEORA_DLMM_QUOTE_TTL_MS", DEFAULT_QUOTE_TTL_MS),
    sdkBinArrayCount: getNumberEnv(
      "VANTA_METEORA_DLMM_SDK_BIN_ARRAY_COUNT",
      DEFAULT_SDK_BIN_ARRAY_COUNT,
    ),
  };
}

export function validateSwapLaneConfig() {
  const config = readSwapLaneConfig();
  const issues = [];

  if (!config.poolAddress) {
    issues.push("VANTA_METEORA_DLMM_POOL_ADDRESS is missing.");
  }

  if (config.contextSource !== "sdk_only" && !config.contextUrlTemplate) {
    issues.push("VANTA_METEORA_DLMM_POOL_CONTEXT_URL is missing.");
  } else if (
    config.contextSource !== "sdk_only" &&
    !config.contextUrlTemplate.includes("{poolAddress}")
  ) {
    issues.push("VANTA_METEORA_DLMM_POOL_CONTEXT_URL must include {poolAddress}.");
  }

  if (config.priceSide !== "y_per_x" && config.priceSide !== "x_per_y") {
    issues.push("VANTA_METEORA_DLMM_PRICE_SIDE must be y_per_x or x_per_y.");
  }

  if (!validateContextSource(config.contextSource)) {
    issues.push("VANTA_METEORA_DLMM_CONTEXT_SOURCE must be api_only, api_then_sdk, or sdk_only.");
  }

  return {
    config,
    issues,
    valid: issues.length === 0,
  };
}

function parsePoolSnapshot(rawSnapshot, poolAddress, priceSide) {
  const candidates = collectCandidateObjects(rawSnapshot);
  const matchedCandidate =
    candidates.find((candidate) => {
      const candidateAddress = getStringCandidate(
        candidate.address,
        candidate.poolAddress,
        candidate.lbPair,
        candidate.pubkey,
        candidate.id,
      );

      return candidateAddress === poolAddress;
    }) ?? candidates[0];

  if (!matchedCandidate) {
    throw new Error("Meteora pool context response did not contain a usable pool object.");
  }

  const tokenX = getNestedObject(matchedCandidate.tokenX) ?? getNestedObject(matchedCandidate.token_x);
  const tokenY = getNestedObject(matchedCandidate.tokenY) ?? getNestedObject(matchedCandidate.token_y);
  const activeBin = getNestedObject(matchedCandidate.activeBin) ?? getNestedObject(matchedCandidate.active_bin);
  const resolvedPoolAddress = getStringCandidate(
    matchedCandidate.address,
    matchedCandidate.poolAddress,
    matchedCandidate.lbPair,
    matchedCandidate.pubkey,
    matchedCandidate.id,
  );

  if (resolvedPoolAddress && resolvedPoolAddress !== poolAddress) {
    const error = new Error("Meteora returned a different pool than the configured DLMM venue.");
    error.cause = "venue_mismatch";
    throw error;
  }

  const tokenXMint = getStringCandidate(
    matchedCandidate.tokenXMint,
    matchedCandidate.mintX,
    matchedCandidate.xMint,
    tokenX?.mint,
    tokenX?.address,
  );
  const tokenYMint = getStringCandidate(
    matchedCandidate.tokenYMint,
    matchedCandidate.mintY,
    matchedCandidate.yMint,
    tokenY?.mint,
    tokenY?.address,
  );
  const price = getNumberCandidate(
    matchedCandidate.price,
    matchedCandidate.spotPrice,
    matchedCandidate.currentPrice,
    matchedCandidate.priceYPerX,
    matchedCandidate.tokenYPerTokenX,
    activeBin?.price,
    activeBin?.spotPrice,
    activeBin?.pricePerTokenX,
  );

  if (!tokenXMint || !tokenYMint || !price) {
    const error = new Error("Meteora DLMM pool context is missing pair or pricing information.");
    error.cause = "quote_failed";
    throw error;
  }

  const directQuoteInputAmount = getNumberCandidate(
    matchedCandidate.quoteInputAmount,
    matchedCandidate.sdkQuoteInputAmount,
  );
  const directQuoteOutputAmount = getNumberCandidate(
    matchedCandidate.quoteOutputAmount,
    matchedCandidate.sdkQuoteOutputAmount,
  );

  return {
    observedAt: Date.now(),
    pairLabel: `${tokenX?.symbol ?? "Token X"} / ${tokenY?.symbol ?? "Token Y"}`,
    poolAddress,
    price,
    priceSide,
    quoteInputAmount: directQuoteInputAmount,
    quoteOutputAmount: directQuoteOutputAmount,
    rawSnapshot: matchedCandidate,
    sourceTimestamp: getTimestampCandidate(
      matchedCandidate.updatedAt,
      matchedCandidate.updated_at,
      matchedCandidate.slotTime,
      matchedCandidate.slot_time,
      activeBin?.updatedAt,
      activeBin?.updated_at,
    ),
    tokenXMint,
    tokenYMint,
    venueFamily: getStringCandidate(
      matchedCandidate.venueFamily,
      matchedCandidate.type,
      matchedCandidate.poolType,
      matchedCandidate.protocol,
    ),
  };
}

function resolveOutputAmountFromPool(args) {
  const normalizedInputAmount = Number(args.inputAmount);
  const outputDecimals = getMintDecimals(args.outputMint);

  if (!Number.isFinite(normalizedInputAmount) || normalizedInputAmount <= 0) {
    throw new Error("Invalid swap input amount for Meteora quote inference.");
  }

  const inputIsTokenX = args.inputMint === args.pool.tokenXMint;
  const outputIsTokenY = args.outputMint === args.pool.tokenYMint;
  const inputIsTokenY = args.inputMint === args.pool.tokenYMint;
  const outputIsTokenX = args.outputMint === args.pool.tokenXMint;

  if (!((inputIsTokenX && outputIsTokenY) || (inputIsTokenY && outputIsTokenX))) {
    const error = new Error("Configured Meteora DLMM pool does not match the USDC -> SOL lane.");
    error.cause = "pair_mismatch";
    throw error;
  }

  if (
    Number.isFinite(args.pool.quoteInputAmount) &&
    Number.isFinite(args.pool.quoteOutputAmount) &&
    Math.abs(args.pool.quoteInputAmount - normalizedInputAmount) < 0.000001
  ) {
    return Number(args.pool.quoteOutputAmount.toFixed(outputDecimals));
  }

  const priceRepresentsYPerX = args.pool.priceSide !== "x_per_y";
  const outputAmount =
    inputIsTokenX && outputIsTokenY
      ? priceRepresentsYPerX
        ? normalizedInputAmount * args.pool.price
        : normalizedInputAmount / args.pool.price
      : priceRepresentsYPerX
        ? normalizedInputAmount / args.pool.price
        : normalizedInputAmount * args.pool.price;

  const roundedOutputAmount = Number(outputAmount.toFixed(outputDecimals));

  if (!Number.isFinite(roundedOutputAmount) || roundedOutputAmount <= 0) {
    const error = new Error("Meteora DLMM pool context did not produce a valid constrained quote.");
    error.cause = "quote_failed";
    throw error;
  }

  return roundedOutputAmount;
}

async function fetchApiPoolSnapshot(config) {
  const snapshotUrl = config.contextUrlTemplate.replaceAll("{poolAddress}", config.poolAddress);
  const response = await fetch(snapshotUrl, {
    headers: {
      Accept: "application/json",
    },
    method: "GET",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const error = new Error(`Meteora DLMM mainnet context request failed with ${response.status}.`);
    error.cause = "pool_unreachable";
    throw error;
  }

  return response.json();
}

async function fetchSdkPoolSnapshot(config, quoteArgs) {
  const connection = getDlmmConnection();
  let dlmmPool;

  try {
    dlmmPool = await DLMM.create(connection, new PublicKey(config.poolAddress));
  } catch (error) {
    const wrappedError = new Error("Meteora DLMM on-chain pool context request failed.");
    wrappedError.cause = "pool_unreachable";
    throw wrappedError;
  }

  const tokenXMint = dlmmPool.lbPair.tokenXMint.toBase58();
  const tokenYMint = dlmmPool.lbPair.tokenYMint.toBase58();
  const activeBin = await dlmmPool.getActiveBin();
  const pairMatchesForward = quoteArgs.inputMint === tokenXMint && quoteArgs.outputMint === tokenYMint;
  const pairMatchesReverse = quoteArgs.inputMint === tokenYMint && quoteArgs.outputMint === tokenXMint;

  if (!pairMatchesForward && !pairMatchesReverse) {
    const error = new Error("Configured Meteora DLMM pool does not match the USDC -> SOL lane.");
    error.cause = "pair_mismatch";
    throw error;
  }

  const swapForY = pairMatchesForward;
  const inputDecimals = swapForY ? dlmmPool.tokenX.mint.decimals : dlmmPool.tokenY.mint.decimals;
  const outputDecimals = swapForY ? dlmmPool.tokenY.mint.decimals : dlmmPool.tokenX.mint.decimals;
  const inAmount = decimalAmountToBn(quoteArgs.inputAmount, inputDecimals);
  let quote;

  try {
    const binArrays = await dlmmPool.getBinArrayForSwap(swapForY, config.sdkBinArrayCount);
    quote = dlmmPool.swapQuote(inAmount, swapForY, new BN(0), binArrays, false, 0);
  } catch (error) {
    if (!isInsufficientSdkLiquidityError(error)) {
      throw error;
    }

    const allBinArrays = await dlmmPool.getBinArrays();
    quote = dlmmPool.swapQuote(inAmount, swapForY, new BN(0), allBinArrays, false, 0);
  }

  return {
    activeBin: {
      price: activeBin.pricePerToken,
    },
    address: config.poolAddress,
    observedAt: Date.now(),
    price: Number(activeBin.pricePerToken),
    quoteInputAmount: Number(quoteArgs.inputAmount),
    quoteOutputAmount: Number(bnToDecimalString(quote.outAmount, outputDecimals)),
    sourceTimestamp: Date.now(),
    tokenX: {
      mint: tokenXMint,
      symbol: getMintLabel(tokenXMint),
    },
    tokenXMint,
    tokenY: {
      mint: tokenYMint,
      symbol: getMintLabel(tokenYMint),
    },
    tokenYMint,
    venueFamily: "Meteora DLMM SDK",
  };
}

async function fetchPoolSnapshot(config, quoteArgs) {
  const prefersApi = config.contextSource === "api_only" || config.contextSource === "api_then_sdk";
  const allowsSdk = config.contextSource === "sdk_only" || config.contextSource === "api_then_sdk";

  if (prefersApi) {
    try {
      return await fetchApiPoolSnapshot(config);
    } catch (error) {
      if (!allowsSdk) {
        throw error;
      }
    }
  }

  if (allowsSdk) {
    return fetchSdkPoolSnapshot(config, quoteArgs);
  }

  const error = new Error("Meteora DLMM pool context source could not be resolved.");
  error.cause = "pool_unreachable";
  throw error;
}

export async function fetchMeteoraDlmmQuote(args) {
  const validation = validateSwapLaneConfig();

  if (!validation.valid) {
    throw new Error(validation.issues.join(" "));
  }

  const rawSnapshot = await fetchPoolSnapshot(validation.config, args);
  const pool = parsePoolSnapshot(
    rawSnapshot,
    validation.config.poolAddress,
    validation.config.priceSide,
  );
  const outputAmount = resolveOutputAmountFromPool({
    inputAmount: args.inputAmount,
    inputMint: args.inputMint,
    outputMint: args.outputMint,
    pool,
  });
  const quoteTimestamp = pool.observedAt;
  const inputDecimals = getMintDecimals(args.inputMint);
  const outputDecimals = getMintDecimals(args.outputMint);
  const formattedInputAmount = Number(args.inputAmount).toFixed(inputDecimals);
  const formattedOutputAmount = outputAmount.toFixed(outputDecimals);
  const slippageBps = validation.config.maxExecutionDriftBps;
  const minOutputAmount = outputAmount * Math.max(0, 10_000 - slippageBps) / 10_000;
  const formattedMinOutputAmount = minOutputAmount.toFixed(outputDecimals);

  return {
    inputAmount: formattedInputAmount,
    minOutputAmount: formattedMinOutputAmount,
    outputAmount: formattedOutputAmount,
    outputMint: args.outputMint,
    pairLabel: pool.pairLabel,
    poolAddress: pool.poolAddress,
    quoteExpiresAt: quoteTimestamp + validation.config.quoteTtlMs,
    quoteId: createSwapQuoteId({
      inputAmount: formattedInputAmount,
      minOutputAmount: formattedMinOutputAmount,
      outputAmount: formattedOutputAmount,
      quoteTimestamp,
      slippageBps,
      venueFamily: SWAP_VENUE_FAMILY,
      venuePoolAddress: pool.poolAddress,
    }),
    quoteTimestamp,
    sourceTimestamp: pool.sourceTimestamp,
    slippageBps,
    venueFamily: SWAP_VENUE_FAMILY,
    venueName: SWAP_VENUE_NAME,
    venueNetwork: SWAP_NETWORK,
  };
}

export function assertFreshMeteoraQuote(quote, now = Date.now()) {
  if (
    typeof quote.quoteTimestamp !== "number" ||
    typeof quote.quoteExpiresAt !== "number" ||
    !Number.isFinite(quote.quoteTimestamp) ||
    !Number.isFinite(quote.quoteExpiresAt)
  ) {
    throw new Error("The Meteora-aware swap quote is missing freshness metadata.");
  }

  if (now > quote.quoteExpiresAt || now < quote.quoteTimestamp) {
    throw new Error("The Meteora-aware swap quote expired. Refresh and try again.");
  }
}

export function assertMeteoraExecutionDrift(args) {
  const maxDriftBps = getNumberEnv(
    "VANTA_METEORA_DLMM_MAX_EXECUTION_DRIFT_BPS",
    DEFAULT_MAX_EXECUTION_DRIFT_BPS,
  );
  const quotedOutputAmount = Number(args.quotedOutputAmount);
  const latestOutputAmount = Number(args.latestOutputAmount);

  if (bpsDifference(latestOutputAmount, quotedOutputAmount) > maxDriftBps) {
    throw new Error(
      "Meteora DLMM mainnet context moved outside the constrained execution tolerance. Refresh the quote and try again.",
    );
  }
}

function mapHealthFailure(error, poolAddress) {
  const message = error instanceof Error ? error.message : "Swap lane health evaluation failed.";
  const cause = error instanceof Error && typeof error.cause === "string" ? error.cause : null;

  switch (cause) {
    case "pair_mismatch":
      return buildHealthResult({
        status: "misconfigured",
        reason: "pair_mismatch",
        message,
        poolAddress,
      });
    case "venue_mismatch":
      return buildHealthResult({
        status: "unavailable",
        reason: "venue_mismatch",
        message,
        poolAddress,
      });
    case "quote_failed":
      return buildHealthResult({
        status: "unavailable",
        reason: "quote_failed",
        message,
        poolAddress,
      });
    case "pool_unreachable":
      return buildHealthResult({
        status: "unavailable",
        reason: "pool_unreachable",
        message,
        poolAddress,
      });
    default:
      return buildHealthResult({
        status: "unavailable",
        reason: "quote_failed",
        message,
        poolAddress,
      });
  }
}

export async function evaluateSwapLaneHealth(args) {
  const validation = validateSwapLaneConfig();
  const inputMint = args.inputMint;
  const outputMint = args.outputMint;
  const checkedAt = Date.now();

  if (!validation.valid) {
    return {
      ...buildHealthResult({
        checkedAt,
        status: "misconfigured",
        reason: "config_error",
        message: validation.issues.join(" "),
        poolAddress: validation.config.poolAddress,
      }),
      details: {
        executionReady: false,
      },
    };
  }

  const config = validation.config;

  try {
    const firstSnapshot = await fetchPoolSnapshot(config, {
      inputAmount: config.healthInputAmount,
      inputMint,
      outputMint,
    });
    const firstPool = parsePoolSnapshot(firstSnapshot, config.poolAddress, config.priceSide);
    const firstOutputAmount = resolveOutputAmountFromPool({
      inputAmount: config.healthInputAmount,
      inputMint,
      outputMint,
      pool: firstPool,
    });

    if (
      firstPool.venueFamily &&
      !firstPool.venueFamily.toLowerCase().includes("dlmm") &&
      !firstPool.venueFamily.toLowerCase().includes("meteora")
    ) {
      return buildHealthResult({
        checkedAt,
        status: "unavailable",
        reason: "venue_mismatch",
        message: "Configured pool context did not identify as Meteora DLMM.",
        poolAddress: config.poolAddress,
        details: {
          executionReady: false,
          quoteOutputAmount: firstOutputAmount.toFixed(6),
          quoteTimestamp: firstPool.observedAt,
        },
      });
    }

    const quoteTimestamp = firstPool.observedAt;
    const quoteExpiresAt = quoteTimestamp + config.quoteTtlMs;
    const freshnessCheckedAt = Date.now();
    const ageMs =
      typeof firstPool.sourceTimestamp === "number"
        ? Math.max(freshnessCheckedAt - firstPool.sourceTimestamp, 0)
        : null;

    if (freshnessCheckedAt > quoteExpiresAt || quoteTimestamp > freshnessCheckedAt) {
      return buildHealthResult({
        checkedAt: freshnessCheckedAt,
        status: "degraded",
        reason: "quote_stale",
        message: "Derived quote freshness is outside the expected Meteora lane window.",
        poolAddress: config.poolAddress,
        details: {
          executionReady: false,
          quoteExpiresAt,
          quoteOutputAmount: firstOutputAmount.toFixed(6),
          quoteTimestamp,
        },
      });
    }

    if (ageMs !== null && ageMs > config.maxSourceAgeMs) {
      return buildHealthResult({
        checkedAt: freshnessCheckedAt,
        status: "degraded",
        reason: "quote_stale",
        message: "Meteora pool context is reachable but older than the configured freshness window.",
        poolAddress: config.poolAddress,
        details: {
          executionReady: false,
          quoteAgeMs: ageMs,
          quoteExpiresAt,
          quoteOutputAmount: firstOutputAmount.toFixed(6),
          quoteTimestamp,
        },
      });
    }

    const secondSnapshot = await fetchPoolSnapshot(config, {
      inputAmount: config.healthInputAmount,
      inputMint,
      outputMint,
    });
    const secondPool = parsePoolSnapshot(secondSnapshot, config.poolAddress, config.priceSide);
    const secondOutputAmount = resolveOutputAmountFromPool({
      inputAmount: config.healthInputAmount,
      inputMint,
      outputMint,
      pool: secondPool,
    });
    const driftBps = bpsDifference(secondOutputAmount, firstOutputAmount);

    if (driftBps > config.maxExecutionDriftBps) {
      return buildHealthResult({
        checkedAt,
        status: "degraded",
        reason: "drift_exceeded",
        message: "Meteora pool context is reachable, but execution drift is above the constrained tolerance.",
        poolAddress: config.poolAddress,
        details: {
          driftBps: Number(driftBps.toFixed(2)),
          executionReady: false,
          latestOutputAmount: secondOutputAmount.toFixed(6),
          quoteOutputAmount: firstOutputAmount.toFixed(6),
          quoteTimestamp,
        },
      });
    }

    return buildHealthResult({
      checkedAt,
      status: "healthy",
      message: "Meteora-aware USDC -> SOL swap lane is healthy and execution-ready.",
      poolAddress: config.poolAddress,
      details: {
        driftBps: Number(driftBps.toFixed(2)),
        executionReady: true,
        latestOutputAmount: secondOutputAmount.toFixed(6),
        quoteAgeMs: ageMs,
        quoteExpiresAt,
        quoteOutputAmount: firstOutputAmount.toFixed(6),
        quoteTimestamp,
      },
    });
  } catch (error) {
    return mapHealthFailure(error, config.poolAddress);
  }
}

export function logSwapLaneHealth(result, source) {
  if (result.status === "healthy") {
    return;
  }

  const payload = {
    checkedAt: result.checkedAt,
    expectedPair: SWAP_LANE,
    message: result.message,
    poolAddress: result.poolAddress,
    reason: result.reason,
    source,
    status: result.status,
    venueFamily: result.venueFamily,
    venueName: result.venueName,
  };

  console.warn("[vanta.swap.health]", JSON.stringify(payload));
}

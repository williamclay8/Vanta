import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  Connection,
  Keypair,
  VersionedTransaction,
} from "@solana/web3.js";

const host = process.env.HOST ?? process.env.VANTA_SOL_TO_SHIELDED_ADAPTER_HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? process.env.VANTA_SOL_TO_SHIELDED_ADAPTER_PORT ?? "8798");
const cluster = "mainnet-beta";
const venueNetwork = "Mainnet";
const rpcUrl =
  process.env.VANTA_SOLANA_RPC_URL ??
  process.env.VITE_SOLANA_RPC_URL ??
  "https://api.mainnet-beta.solana.com";
const jupiterQuoteUrl =
  process.env.VANTA_JUPITER_QUOTE_URL ?? "https://api.jup.ag/swap/v1/quote";
const jupiterSwapUrl =
  process.env.VANTA_JUPITER_SWAP_URL ?? "https://api.jup.ag/swap/v1/swap";
const jupiterApiKey = process.env.JUPITER_API_KEY ?? process.env.VITE_JUPITER_API_KEY ?? "";
const authToken = process.env.VANTA_SOL_TO_SHIELDED_ADAPTER_AUTH_TOKEN ?? "";
const privatePoolOperatorUrl = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL ?? "";
const privatePoolAuthToken = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN ?? "";
const executionMode = process.env.VANTA_SOL_TO_SHIELDED_EXECUTION_MODE ?? "quote-only";
const maxInputSol = Number(process.env.VANTA_SOL_TO_SHIELDED_MAX_INPUT_SOL ?? "1");
const statePath = resolve(
  process.env.VANTA_SOL_TO_SHIELDED_ADAPTER_STATE_PATH ??
    ".tmp/vanta-sol-to-shielded-jupiter-adapter-state.json",
);
const liquidityKeypairJson = process.env.VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_JSON ?? "";
const liquidityKeypairPath = process.env.VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_PATH ?? "";
const slippageBps = Number(process.env.VANTA_SOL_TO_SHIELDED_SLIPPAGE_BPS ?? "50");
const quoteTtlMs = Number(process.env.VANTA_SOL_TO_SHIELDED_QUOTE_TTL_MS ?? "30000");
const nativeSolMint = "So11111111111111111111111111111111111111112";
const routeProvider = "Jupiter";
const privatePoolV2HiddenEconomicsAssetId = "hidden:economic-terms";
const privatePoolV2LocalProverScheme = "sha256-private-pool-v2-local-prover-0.1";
const privatePoolV2SwapToShieldedProofRequestVersion =
  "vanta-private-pool-v2-swap-to-shielded-proof-request-0.1";

const defaultMainnetAssets = {
  BONK: {
    decimals: 5,
    mintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  },
  JTO: {
    decimals: 9,
    mintAddress: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  },
  JUP: {
    decimals: 6,
    mintAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  },
  KMNO: {
    decimals: 6,
    mintAddress: "KMNo3nJmVd6VnGrXQd76cGmBvi6X3pCk8rZP2QEVhkP",
  },
  PYUSD: {
    decimals: 6,
    mintAddress: "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM",
  },
  USDC: {
    decimals: 6,
    mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  WIF: {
    decimals: 6,
    mintAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzL262im2EgJgP",
  },
};

const defaultSupportedAssets = process.env.VANTA_SOL_TO_SHIELDED_SUPPORTED_ASSETS ??
  (cluster === "mainnet-beta" ? "USDC,PYUSD" : "USDC");
const connection = new Connection(rpcUrl, "confirmed");
const quoteStore = new Map();

function hashHex(...parts) {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(String(part));
    hash.update("\0");
  }
  return `0x${hash.digest("hex")}`;
}

function hashProtocolSettlementParts(...parts) {
  return `0x${createHash("sha256").update(parts.join("\u001f")).digest("hex")}`;
}

function localSwapProofPublicInputCommitment({
  economicsCommitment,
  inputCommitment,
  inputRoot,
  nullifierOrReplayCommitment,
  outputCommitment,
  outputLeafIndex,
  outputRoot,
  ownerCommitment,
  routeCommitment,
  settlementCommitment,
  swapContextTag,
  swapPublicInputHash,
}) {
  const serializedRequest = JSON.stringify({
    amountBaseUnits: "1",
    assetId: privatePoolV2HiddenEconomicsAssetId,
    circuitPublicInputs: [`swap-public-input-hash:${swapPublicInputHash}`],
    intent: "swap-to-shielded",
  });

  return hashProtocolSettlementParts(
    privatePoolV2LocalProverScheme,
    "public-inputs",
    serializedRequest,
  );
}

function requireSettlementCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateCommittedSwapSettlementResponse({ request, response }) {
  const receipt = response?.protocolSettlementReceipt;
  const proofReceipt = response?.proofReceipt;
  const expectedProofPublicInputCommitment = localSwapProofPublicInputCommitment(request);

  requireSettlementCondition(
    response?.kind === "protocol_settlement",
    "Private Pool v2 settlement response kind is invalid.",
  );
  requireSettlementCondition(
    receipt?.object === "protocol_settlement_receipt",
    "Private Pool v2 settlement receipt object is invalid.",
  );
  requireSettlementCondition(
    receipt.action === "swap",
    "Private Pool v2 settlement receipt action does not match the SOL route request.",
  );
  requireSettlementCondition(
    receipt.economicsMode === "committed-economics",
    "Private Pool v2 settlement receipt must use committed economics.",
  );
  requireSettlementCondition(
    receipt.economicsCommitment === request.economicsCommitment,
    "Private Pool v2 settlement receipt economics commitment does not match the SOL route request.",
  );
  requireSettlementCondition(
    receipt.settlementId === request.settlementId,
    "Private Pool v2 settlement receipt id does not match the SOL route request.",
  );
  requireSettlementCondition(
    receipt.settlementCommitment === request.settlementCommitment,
    "Private Pool v2 settlement receipt commitment does not match the SOL route request.",
  );
  requireSettlementCondition(
    receipt.status === "confirmed",
    "Private Pool v2 settlement receipt is not confirmed.",
  );
  requireSettlementCondition(
    proofReceipt?.intent === "swap-to-shielded",
    "Private Pool v2 proof receipt intent is not swap-to-shielded.",
  );
  requireSettlementCondition(
    proofReceipt?.assetId === privatePoolV2HiddenEconomicsAssetId,
    "Private Pool v2 proof receipt must use the hidden-economics asset sentinel.",
  );
  requireSettlementCondition(
    proofReceipt?.proofSystem === "noir-bb" ||
      proofReceipt?.proofSystem === "groth16" ||
      proofReceipt?.proofSystem === "plonk" ||
      proofReceipt?.proofSystem === "mock",
    "Private Pool v2 proof receipt must expose a recognized proof system.",
  );
  requireSettlementCondition(
    proofReceipt?.replayKey === `swap-to-shielded:${request.nullifierOrReplayCommitment}`,
    "Private Pool v2 proof receipt replay key does not match the SOL route request.",
  );
  requireSettlementCondition(
    proofReceipt?.publicInputCommitment === expectedProofPublicInputCommitment,
    "Private Pool v2 proof receipt public input commitment does not match the SOL route request.",
  );
  requireSettlementCondition(
    receipt.proofReceiptId === `ppv2_${proofReceipt.receiptId.slice(2, 26)}`,
    "Private Pool v2 settlement receipt proof id does not match the proof receipt.",
  );
  requireSettlementCondition(
    receipt.proofReceiptPublicInputCommitment === proofReceipt.publicInputCommitment,
    "Private Pool v2 settlement receipt public input commitment does not match the proof receipt.",
  );

  for (const rawField of ["amount", "asset", "destination", "owner"]) {
    requireSettlementCondition(
      !(rawField in receipt),
      `Private Pool v2 committed settlement receipt leaked raw ${rawField}.`,
    );
  }

  return response;
}

function readState() {
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return {
      consumedInputSol: 0,
      executions: [],
      version: "vanta-sol-to-shielded-jupiter-adapter-state-0.1",
    };
  }
}

function writeState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function jupiterHeaders() {
  return {
    ...(jupiterApiKey ? { "x-api-key": jupiterApiKey } : {}),
  };
}

function parseJsonKeypair(value) {
  if (!value.trim()) {
    return null;
  }

  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error("VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_JSON must be a Solana secret-key array.");
  }

  return Keypair.fromSecretKey(Uint8Array.from(parsed));
}

function loadLiquidityKeypair() {
  if (liquidityKeypairJson.trim()) {
    return parseJsonKeypair(liquidityKeypairJson);
  }

  if (liquidityKeypairPath.trim()) {
    return parseJsonKeypair(readFileSync(liquidityKeypairPath, "utf8"));
  }

  return null;
}

function decimalToAtomic(value, decimals) {
  const normalized = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Amount must be a positive decimal string.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const atomic = `${whole}${fraction.padEnd(decimals, "0").slice(0, decimals)}`.replace(
    /^0+(?=\d)/,
    "",
  );
  return atomic || "0";
}

function atomicToDecimal(value, decimals) {
  const raw = String(value);
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function getEnvAssetConfig(symbol) {
  const upper = symbol.toUpperCase();
  const mintAddress =
    process.env[`VANTA_SOL_TO_SHIELDED_${upper}_MINT`] ??
    process.env[`VITE_VANTA_MAINNET_${upper}_MINT`] ??
    defaultMainnetAssets[upper]?.mintAddress ??
    "";
  const decimals = Number(
    process.env[`VANTA_SOL_TO_SHIELDED_${upper}_DECIMALS`] ??
      defaultMainnetAssets[upper]?.decimals ??
      "6",
  );

  if (!mintAddress || !Number.isInteger(decimals) || decimals < 0) {
    return null;
  }

  return {
    decimals,
    mintAddress,
    symbol: upper,
  };
}

function configuredAssets() {
  return defaultSupportedAssets
    .split(",")
    .map((asset) => asset.trim().toUpperCase())
    .filter(Boolean)
    .map(getEnvAssetConfig)
    .filter(Boolean);
}

function getMainnetReadiness({ liquidityKeypair }) {
  const supportedOutputAssets = configuredAssets().map((asset) => asset.symbol);
  const mainnetReady =
    cluster === "mainnet-beta" &&
    executionMode === "live" &&
    Boolean(jupiterQuoteUrl) &&
    Boolean(jupiterSwapUrl) &&
    Boolean(liquidityKeypair) &&
    Boolean(privatePoolOperatorUrl) &&
    Number.isFinite(maxInputSol) &&
    maxInputSol > 0 &&
    supportedOutputAssets.length > 0;

  return {
    mainnetReady,
    supportedOutputAssets,
  };
}

function getAsset(symbol) {
  const asset = configuredAssets().find((entry) => entry.symbol === String(symbol).toUpperCase());
  if (!asset) {
    throw new Error(`Output asset ${String(symbol)} is not enabled for the Jupiter route adapter.`);
  }

  return asset;
}

function readRequestBody(request) {
  return new Promise((resolvePromise, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString("utf8");
    });
    request.on("end", () => {
      try {
        resolvePromise(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function requireAuth(request, response) {
  if (!authToken) {
    return true;
  }

  if (request.headers.authorization === `Bearer ${authToken}`) {
    return true;
  }

  sendJson(response, 401, {
    error: "Jupiter SOL-to-shielded adapter request is not authorized.",
    ok: false,
  });
  return false;
}

async function requestJupiterQuote({ inputAmount, outputAsset }) {
  const asset = getAsset(outputAsset);
  const amountAtomic = decimalToAtomic(inputAmount, 9);
  const searchParams = new URLSearchParams({
    amount: amountAtomic,
    inputMint: nativeSolMint,
    outputMint: asset.mintAddress,
    restrictIntermediateTokens: "true",
    slippageBps: String(slippageBps),
  });
  const response = await fetch(`${jupiterQuoteUrl}?${searchParams.toString()}`, {
    headers: jupiterHeaders(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Jupiter quote failed with HTTP ${response.status}.`);
  }

  const quoteResponse = await response.json();
  if (
    quoteResponse.inputMint !== nativeSolMint ||
    quoteResponse.outputMint !== asset.mintAddress ||
    typeof quoteResponse.inAmount !== "string" ||
    typeof quoteResponse.outAmount !== "string"
  ) {
    throw new Error("Jupiter returned an invalid SOL-to-shielded quote.");
  }

  const quoteTimestamp = Date.now();
  const quoteExpiresAt = quoteTimestamp + quoteTtlMs;
  const routePlanHash = hashHex(
    "jupiter-route-plan",
    JSON.stringify(quoteResponse.routePlan ?? []),
  );
  const quoteId = hashHex(
    "jupiter-sol-to-shielded-quote",
    "sol-to-shielded-v1",
    routeProvider,
    nativeSolMint,
    asset.mintAddress,
    outputAsset,
    quoteResponse.inAmount,
    quoteResponse.outAmount,
    slippageBps,
    routePlanHash,
    quoteTimestamp,
    quoteExpiresAt,
  );
  const outputAmount = atomicToDecimal(quoteResponse.outAmount, asset.decimals);
  const quote = {
    inputAmount,
    inputAsset: "SOL",
    inputMintAddress: nativeSolMint,
    outputAmount,
    outputAsset: asset.symbol,
    outputMintAddress: asset.mintAddress,
    quoteExpiresAt,
    quoteId,
    quoteTimestamp,
    routeAdapter: "sol-to-shielded-v1",
    routePlanHash,
    routeProvider,
    slippageBps,
    venueFamily: "Aggregator",
    venueName: routeProvider,
    venueNetwork,
    venuePoolAddress: "jupiter-metis",
  };
  quoteStore.set(quoteId, {
    asset,
    quote,
    quoteResponse,
  });

  return quote;
}

function assertExecutionAllowed(inputAmount) {
  if (executionMode !== "live" && executionMode !== "mock") {
    throw new Error("Jupiter SOL-to-shielded adapter is quote-only until execution mode is explicitly enabled.");
  }

  const state = readState();
  const nextConsumed = Number(state.consumedInputSol ?? 0) + Number(inputAmount);
  if (!Number.isFinite(nextConsumed) || nextConsumed > maxInputSol) {
    throw new Error(`Jupiter SOL-to-shielded adapter cap exceeded. Max input is ${maxInputSol} SOL.`);
  }

  return state;
}

async function executeJupiterSwap({ quoteEntry }) {
  const liquidityKeypair = loadLiquidityKeypair();
  if (!liquidityKeypair) {
    throw new Error("Jupiter SOL-to-shielded live execution requires a liquidity keypair env var.");
  }

  const response = await fetch(jupiterSwapUrl, {
    body: JSON.stringify({
      dynamicComputeUnitLimit: true,
      quoteResponse: quoteEntry.quoteResponse,
      userPublicKey: liquidityKeypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
    }),
    headers: {
      "Content-Type": "application/json",
      ...jupiterHeaders(),
    },
    method: "POST",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Jupiter swap build failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (typeof payload.swapTransaction !== "string") {
    throw new Error("Jupiter swap response did not include a serialized transaction.");
  }

  const transaction = VersionedTransaction.deserialize(
    Buffer.from(payload.swapTransaction, "base64"),
  );
  transaction.sign([liquidityKeypair]);
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    maxRetries: 2,
    skipPreflight: false,
  });
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const confirmation = await connection.confirmTransaction(
    {
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature,
    },
    "confirmed",
  );

  if (confirmation.value.err) {
    throw new Error(`Jupiter swap failed to confirm: ${JSON.stringify(confirmation.value.err)}`);
  }

  return signature;
}

async function requestProtocolSettlement({ body, outputLeafIndex, publicSwapSignature, quoteEntry }) {
  const settlementId = hashHex(
    "jupiter-sol-to-shielded-settlement",
    body.quoteId,
    body.transitionNoteId,
    publicSwapSignature,
  );
  const economicsCommitment = hashHex(
    "economics",
    quoteEntry.quote.inputAmount,
    quoteEntry.quote.outputAmount,
    "SOL",
    body.outputAsset,
    body.inputMintAddress,
    body.outputMintAddress,
    body.quoteId,
    body.quoteExpiresAt,
    body.slippageBps,
  );
  const inputCommitment = hashHex("input", body.consumedNoteId, body.inputAmount, "SOL");
  const inputRoot = hashHex("input-root", body.consumedNoteId, body.vaultOwner);
  const nullifierOrReplayCommitment = hashHex(
    "nullifier",
    body.consumedNoteId,
    body.transitionNoteId,
    body.transitionStateSignature,
  );
  const outputCommitment = hashHex(
    "output",
    body.outputNoteId,
    body.outputAsset,
    body.outputAmount,
    body.owner,
  );
  const outputRoot = hashHex("output-root", outputCommitment, body.vaultOwner);
  const ownerCommitment = hashHex("owner", body.owner, body.vaultOwner);
  const routeCommitment = hashHex(
    "route",
    routeProvider,
    publicSwapSignature,
    body.quoteId,
    body.routePlanHash,
    body.slippageBps,
    body.inputMintAddress,
    body.outputMintAddress,
    body.quoteExpiresAt,
  );
  const settlementCommitment = hashHex(
    "settlement",
    settlementId,
    economicsCommitment,
    inputCommitment,
    outputCommitment,
    routeCommitment,
  );
  const swapContextTag = hashHex("swap-context", body.transitionNoteId, body.outputNoteId);
  const swapPublicInputHash = hashHex(
    "swap-public-input",
    inputRoot,
    inputCommitment,
    nullifierOrReplayCommitment,
    outputCommitment,
    outputRoot,
    routeCommitment,
    economicsCommitment,
    settlementCommitment,
    ownerCommitment,
    swapContextTag,
  );
  const expectedSettlementRequest = {
    action: "swap",
    economicsCommitment,
    economicsMode: "committed-economics",
    inputCommitment,
    inputRoot,
    nullifierOrReplayCommitment,
    outputCommitment,
    outputLeafIndex,
    outputRoot,
    ownerCommitment,
    routeCommitment,
    settlementCommitment,
    settlementId,
    swapContextTag,
    swapPublicInputHash,
  };

  if (executionMode === "mock") {
    const proofPublicInputCommitment = localSwapProofPublicInputCommitment(expectedSettlementRequest);
    const proofReceipt = {
      assetId: privatePoolV2HiddenEconomicsAssetId,
      intent: "swap-to-shielded",
      proofSystem: "mock",
      publicInputCommitment: proofPublicInputCommitment,
      receiptId: hashHex("mock-proof-receipt", settlementId),
      recordedAtSlot: "mock",
      replayKey: `swap-to-shielded:${nullifierOrReplayCommitment}`,
    };
    return validateCommittedSwapSettlementResponse({
      request: expectedSettlementRequest,
      response: {
        kind: "protocol_settlement",
        proofReceipt,
        protocolSettlementReceipt: {
          action: "swap",
          economicsCommitment,
          economicsMode: "committed-economics",
          id: hashHex("mock-protocol-receipt", settlementId),
          object: "protocol_settlement_receipt",
          proofReceiptId: `ppv2_${proofReceipt.receiptId.slice(2, 26)}`,
          proofReceiptPublicInputCommitment: proofReceipt.publicInputCommitment,
          settlementCommitment,
          settlementId,
          status: "confirmed",
        },
      },
    });
  }

  if (!privatePoolOperatorUrl) {
    throw new Error("Live execution requires VANTA_PRIVATE_POOL_V2_OPERATOR_URL for proof-backed settlement.");
  }

  const response = await fetch(`${privatePoolOperatorUrl}/private-pool-v2/protocol-settlements`, {
    body: JSON.stringify({
      action: "swap",
      economicsCommitment,
      economicsMode: "committed-economics",
      inputCommitment,
      inputRoot,
      nullifierOrReplayCommitment,
      outputCommitment,
      outputLeafIndex,
      outputRoot,
      ownerCommitment,
      routeCommitment,
      settlementCommitment,
      settlementId,
      swapContextTag,
      swapPublicInputHash,
    }),
    headers: {
      "Content-Type": "application/json",
      ...(privatePoolAuthToken ? { Authorization: `Bearer ${privatePoolAuthToken}` } : {}),
    },
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? `Private Pool v2 settlement failed with HTTP ${response.status}.`);
  }

  return validateCommittedSwapSettlementResponse({
    request: expectedSettlementRequest,
    response: payload,
  });
}

async function handleQuote(body) {
  if (body.inputAsset !== "SOL") {
    throw new Error("Jupiter SOL-to-shielded adapter only supports SOL input.");
  }

  return requestJupiterQuote({
    inputAmount: String(body.inputAmount ?? ""),
    outputAsset: String(body.outputAsset ?? ""),
  });
}

async function handleExecute(body) {
  if (body.routeAdapter !== "sol-to-shielded-v1" || body.inputAsset !== "SOL") {
    throw new Error("Invalid SOL-to-shielded execution request.");
  }

  const quoteEntry = quoteStore.get(body.quoteId);
  if (!quoteEntry) {
    throw new Error("Execution quote is missing or expired. Refresh the quote and try again.");
  }

  if (Date.now() >= quoteEntry.quote.quoteExpiresAt) {
    quoteStore.delete(body.quoteId);
    throw new Error("Execution quote expired. Refresh the quote and try again.");
  }

  if (
    quoteEntry.quote.outputAsset !== body.outputAsset ||
    quoteEntry.quote.inputMintAddress !== body.inputMintAddress ||
    quoteEntry.quote.outputMintAddress !== body.outputMintAddress ||
    quoteEntry.quote.inputAmount !== body.inputAmount ||
    quoteEntry.quote.outputAmount !== body.outputAmount ||
    quoteEntry.quote.quoteTimestamp !== body.quoteTimestamp ||
    quoteEntry.quote.quoteExpiresAt !== body.quoteExpiresAt ||
    quoteEntry.quote.routeProvider !== body.routeProvider ||
    quoteEntry.quote.routePlanHash !== body.routePlanHash ||
    quoteEntry.quote.slippageBps !== body.slippageBps
  ) {
    throw new Error("Execution request does not match the active Jupiter quote.");
  }

  const state = assertExecutionAllowed(body.inputAmount);
  const outputLeafIndex = String((state.executions ?? []).length);
  const publicSwapSignature =
    executionMode === "mock"
      ? hashHex("mock-jupiter-swap", body.quoteId, body.transitionNoteId)
      : await executeJupiterSwap({ quoteEntry });
  const settlement = await requestProtocolSettlement({
    body,
    outputLeafIndex,
    publicSwapSignature,
    quoteEntry,
  });
  const receipt = {
    adapterReceiptId: hashHex("adapter-receipt", body.quoteId, publicSwapSignature),
    inputAsset: "SOL",
    inputMintAddress: body.inputMintAddress,
    outputLeafIndex,
    outputAsset: body.outputAsset,
    outputMintAddress: body.outputMintAddress,
    outputNoteId: body.outputNoteId,
    proofReceipt: settlement.proofReceipt,
    protocolSettlementReceipt: settlement.protocolSettlementReceipt,
    publicSwapSignature,
    quoteExpiresAt: body.quoteExpiresAt,
    quoteId: body.quoteId,
    quoteTimestamp: body.quoteTimestamp,
    requestId: hashHex("adapter-request", body.quoteId, body.transitionNoteId),
    routeAdapter: "sol-to-shielded-v1",
    routePlanHash: body.routePlanHash,
    routeProvider: body.routeProvider,
    slippageBps: body.slippageBps,
    transitionNoteId: body.transitionNoteId,
  };

  state.consumedInputSol = Number(state.consumedInputSol ?? 0) + Number(body.inputAmount);
  state.executions = [
    ...(state.executions ?? []),
    {
      adapterReceiptId: receipt.adapterReceiptId,
      inputAmount: body.inputAmount,
      outputAmount: body.outputAmount,
      outputAsset: body.outputAsset,
      publicSwapSignature,
      quoteId: body.quoteId,
      recordedAt: new Date().toISOString(),
      transitionNoteId: body.transitionNoteId,
    },
  ];
  writeState(state);

  return receipt;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/health") {
      const liquidityKeypair = loadLiquidityKeypair();
      const readiness = getMainnetReadiness({ liquidityKeypair });
      sendJson(response, 200, {
        cluster,
        executionMode,
        jupiterQuoteConfigured: Boolean(jupiterQuoteUrl),
        jupiterSwapConfigured: Boolean(jupiterSwapUrl),
        liquidityWalletConfigured: Boolean(liquidityKeypair),
        mainnetReady: readiness.mainnetReady,
        maxInputSol,
        ok: true,
        privatePoolSettlementConfigured: Boolean(privatePoolOperatorUrl),
        service: "vanta-sol-to-shielded-jupiter-route-adapter",
        supportedOutputAssets: readiness.supportedOutputAssets,
      });
      return;
    }

    if (!requireAuth(request, response)) {
      return;
    }

    if (request.method === "POST" && url.pathname === "/quote") {
      sendJson(response, 200, await handleQuote(await readRequestBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/execute") {
      sendJson(response, 200, await handleExecute(await readRequestBody(request)));
      return;
    }

    sendJson(response, 404, {
      error: "Not found.",
      ok: false,
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Jupiter SOL-to-shielded adapter request failed.",
      ok: false,
    });
  }
});

server.listen(port, host, () => {
  console.log(
    JSON.stringify({
      cluster,
      executionMode,
      maxInputSol,
      port,
      service: "vanta-sol-to-shielded-jupiter-route-adapter",
      supportedOutputAssets: configuredAssets().map((asset) => asset.symbol),
    }),
  );
});

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { liveSolToShieldedSwapRouteAdapter } from "@/solana/shieldConfig";
import type { ShieldedSwapAssetKey } from "@/solana/publicSwapRoute";
import {
  validateVantaPrivatePoolV2ProtocolSettlementResponse,
  type VantaCommittedEconomicsProtocolSettlementRequest,
  type VantaPrivatePoolV2ProofReceipt,
  type VantaProtocolSettlementReceipt,
} from "@/privacy/privatePoolV2ProtocolSettlementClient";

export type SolToShieldedRouteQuote = {
  inputAmount: string;
  inputAsset: "SOL";
  inputMintAddress: string;
  minOutputAmount: string;
  outputAmount: string;
  outputAsset: Exclude<ShieldedSwapAssetKey, "SOL">;
  outputMintAddress: string;
  quoteExpiresAt: number;
  quoteId: string;
  quoteTimestamp: number;
  routeAdapter: "sol-to-shielded-v1";
  routePlanHash: string;
  routeProvider: string;
  slippageBps: number;
  venueFamily: "Aggregator" | "DLMM";
  venueName: string;
  venueNetwork: "Mainnet";
  venuePoolAddress: string | null;
};

export type SolToShieldedRouteReceipt = {
  adapterReceiptId: string;
  inputAsset: "SOL";
  inputMintAddress: string;
  minOutputAmount: string;
  outputAmount: string;
  outputLeafIndex: string;
  outputAsset: Exclude<ShieldedSwapAssetKey, "SOL">;
  outputMintAddress: string;
  outputNoteId: string;
  protocolSettlementReceipt: VantaProtocolSettlementReceipt;
  proofReceipt: VantaPrivatePoolV2ProofReceipt;
  publicSwapSignature: string;
  quoteExpiresAt: number;
  quoteId: string;
  quoteTimestamp: number;
  requestId: string;
  routeAdapter: "sol-to-shielded-v1";
  routePlanHash: string;
  routeProvider: string;
  slippageBps: number;
  transitionNoteId: string;
};

export type SolToShieldedRouteExecutionRequest = {
  consumedNoteId: string;
  inputAmount: string;
  inputMintAddress: string;
  minOutputAmount: string;
  outputAmount: string;
  outputAsset: Exclude<ShieldedSwapAssetKey, "SOL">;
  outputMintAddress: string;
  outputNoteId: string;
  owner: string;
  quoteExpiresAt: number;
  quoteId: string;
  quoteTimestamp: number;
  requester: string;
  routePlanHash: string;
  routeProvider: string;
  slippageBps: number;
  transitionNoteId: string;
  transitionStateSignature: string;
  vaultOwner: string;
};

export function getSolToShieldedRouteAdapterStatus() {
  return {
    configured: liveSolToShieldedSwapRouteAdapter.configured,
    operatorUrl: liveSolToShieldedSwapRouteAdapter.operatorUrl,
    supportedOutputAssets: liveSolToShieldedSwapRouteAdapter.supportedOutputAssets,
  };
}

function hashSolToShieldedRouteParts(...parts: readonly unknown[]) {
  return `0x${bytesToHex(
    sha256(new TextEncoder().encode(`${parts.map(String).join("\0")}\0`)),
  )}`;
}

function createExpectedSolToShieldedProtocolSettlementRequest(args: {
  publicSwapSignature: string;
  request: SolToShieldedRouteExecutionRequest;
  outputLeafIndex: string;
}): VantaCommittedEconomicsProtocolSettlementRequest {
  const settlementId = hashSolToShieldedRouteParts(
    "jupiter-sol-to-shielded-settlement",
    args.request.quoteId,
    args.request.transitionNoteId,
    args.publicSwapSignature,
  );
  const economicsCommitment = hashSolToShieldedRouteParts(
    "economics",
    args.request.inputAmount,
    args.request.outputAmount,
    "SOL",
    args.request.outputAsset,
    args.request.inputMintAddress,
    args.request.outputMintAddress,
    args.request.minOutputAmount,
    args.request.quoteId,
    args.request.quoteExpiresAt,
    args.request.slippageBps,
  );
  const inputCommitment = hashSolToShieldedRouteParts(
    "input",
    args.request.consumedNoteId,
    args.request.inputAmount,
    "SOL",
  );
  const inputRoot = hashSolToShieldedRouteParts(
    "input-root",
    args.request.consumedNoteId,
    args.request.vaultOwner,
  );
  const nullifierOrReplayCommitment = hashSolToShieldedRouteParts(
    "nullifier",
    args.request.consumedNoteId,
    args.request.transitionNoteId,
    args.request.transitionStateSignature,
  );
  const outputCommitment = hashSolToShieldedRouteParts(
    "output",
    args.request.outputNoteId,
    args.request.outputAsset,
    args.request.outputAmount,
    args.request.owner,
  );
  const outputRoot = hashSolToShieldedRouteParts(
    "output-root",
    outputCommitment,
    args.request.vaultOwner,
  );
  const ownerCommitment = hashSolToShieldedRouteParts(
    "owner",
    args.request.owner,
    args.request.vaultOwner,
  );
  const routeCommitment = hashSolToShieldedRouteParts(
    "route",
    args.request.routeProvider,
    args.publicSwapSignature,
    args.request.quoteId,
    args.request.routePlanHash,
    args.request.slippageBps,
    args.request.inputMintAddress,
    args.request.outputMintAddress,
    args.request.quoteExpiresAt,
  );
  const settlementCommitment = hashSolToShieldedRouteParts(
    "settlement",
    settlementId,
    economicsCommitment,
    inputCommitment,
    outputCommitment,
    routeCommitment,
  );
  const swapContextTag = hashSolToShieldedRouteParts(
    "swap-context",
    args.request.transitionNoteId,
    args.request.outputNoteId,
  );
  const validUntilSlot = String(args.request.quoteExpiresAt);
  const swapPublicInputHash = hashSolToShieldedRouteParts(
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
    validUntilSlot,
  );

  return {
    action: "swap",
    economicsCommitment,
    economicsMode: "committed-economics",
    inputCommitment,
    inputRoot,
    minOutputAmount: args.request.minOutputAmount,
    nullifierOrReplayCommitment,
    outputAmount: args.request.outputAmount,
    outputCommitment,
    outputLeafIndex: args.outputLeafIndex,
    outputRoot,
    ownerCommitment,
    routeCommitment,
    settlementCommitment,
    settlementId,
    slippageBps: String(args.request.slippageBps),
    swapContextTag,
    swapPublicInputHash,
    validUntilSlot,
  };
}

function parseSolToShieldedRouteReceipt(
  value: unknown,
): SolToShieldedRouteReceipt {
  const parsed = value as Partial<SolToShieldedRouteReceipt>;

  if (
    parsed.routeAdapter !== "sol-to-shielded-v1" ||
    parsed.inputAsset !== "SOL" ||
    typeof parsed.inputMintAddress !== "string" ||
    typeof parsed.minOutputAmount !== "string" ||
    typeof parsed.outputAmount !== "string" ||
    typeof parsed.outputLeafIndex !== "string" ||
    typeof parsed.outputAsset !== "string" ||
    typeof parsed.outputMintAddress !== "string" ||
    typeof parsed.outputNoteId !== "string" ||
    typeof parsed.quoteId !== "string" ||
    typeof parsed.quoteTimestamp !== "number" ||
    typeof parsed.quoteExpiresAt !== "number" ||
    typeof parsed.requestId !== "string" ||
    typeof parsed.adapterReceiptId !== "string" ||
    typeof parsed.routePlanHash !== "string" ||
    typeof parsed.routeProvider !== "string" ||
    typeof parsed.slippageBps !== "number" ||
    typeof parsed.transitionNoteId !== "string" ||
    !parsed.protocolSettlementReceipt ||
    typeof parsed.publicSwapSignature !== "string" ||
    !parsed.proofReceipt
  ) {
    throw new Error("The shielded SOL route adapter returned an invalid receipt.");
  }

  return parsed as SolToShieldedRouteReceipt;
}

export function assertSolToShieldedRouteReceipt(args: {
  request: SolToShieldedRouteExecutionRequest;
  receipt: SolToShieldedRouteReceipt;
}) {
  const { request, receipt } = args;

  if (receipt.routeAdapter !== "sol-to-shielded-v1") {
    throw new Error("SOL route adapter receipt has the wrong adapter identity.");
  }

  if (receipt.inputAsset !== "SOL") {
    throw new Error("SOL route adapter receipt must consume shielded SOL.");
  }

  if (receipt.inputMintAddress !== request.inputMintAddress) {
    throw new Error("SOL route adapter receipt input mint does not match the active quote.");
  }

  if (receipt.outputAsset !== request.outputAsset) {
    throw new Error("SOL route adapter receipt output asset does not match the requested shielded asset.");
  }

  if (receipt.outputAmount !== request.outputAmount) {
    throw new Error("SOL route adapter receipt output amount does not match the active quote.");
  }

  if (receipt.minOutputAmount !== request.minOutputAmount) {
    throw new Error("SOL route adapter receipt minimum output amount does not match the active quote.");
  }

  if (receipt.outputMintAddress !== request.outputMintAddress) {
    throw new Error("SOL route adapter receipt output mint does not match the active quote.");
  }

  if (receipt.outputNoteId !== request.outputNoteId) {
    throw new Error("SOL route adapter receipt output note does not match the request.");
  }

  if (receipt.transitionNoteId !== request.transitionNoteId) {
    throw new Error("SOL route adapter receipt transition note does not match the request.");
  }

  if (receipt.quoteId !== request.quoteId) {
    throw new Error("SOL route adapter receipt quote id does not match the active quote.");
  }

  if (receipt.quoteTimestamp !== request.quoteTimestamp) {
    throw new Error("SOL route adapter receipt quote timestamp does not match the active quote.");
  }

  if (receipt.quoteExpiresAt !== request.quoteExpiresAt) {
    throw new Error("SOL route adapter receipt quote expiry does not match the active quote.");
  }

  if (receipt.slippageBps !== request.slippageBps) {
    throw new Error("SOL route adapter receipt slippage does not match the active quote.");
  }

  if (receipt.routeProvider !== request.routeProvider) {
    throw new Error("SOL route adapter receipt provider does not match the active quote.");
  }

  if (receipt.routePlanHash !== request.routePlanHash) {
    throw new Error("SOL route adapter receipt route plan hash does not match the active quote.");
  }

  if (receipt.protocolSettlementReceipt.action !== "swap") {
    throw new Error("SOL route adapter settlement receipt action must be swap.");
  }

  if (receipt.protocolSettlementReceipt.economicsMode !== "committed-economics") {
    throw new Error("SOL route adapter settlement receipt must use committed economics.");
  }

  if (receipt.proofReceipt.intent !== "swap-to-shielded") {
    throw new Error("SOL route adapter proof receipt must prove swap-to-shielded.");
  }

  if (receipt.proofReceipt.assetId !== "hidden:economic-terms") {
    throw new Error("SOL route adapter proof receipt must use the hidden-economics asset sentinel.");
  }

  if (
    receipt.proofReceipt.proofSystem !== "noir-bb" &&
    receipt.proofReceipt.proofSystem !== "groth16" &&
    receipt.proofReceipt.proofSystem !== "plonk" &&
    receipt.proofReceipt.proofSystem !== "mock"
  ) {
    throw new Error("SOL route adapter proof receipt must expose a recognized proof system.");
  }

  if (!receipt.proofReceipt.publicInputCommitment) {
    throw new Error("SOL route adapter proof receipt must include a public input commitment.");
  }

  const expectedSettlementRequest = createExpectedSolToShieldedProtocolSettlementRequest({
    outputLeafIndex: receipt.outputLeafIndex,
    publicSwapSignature: receipt.publicSwapSignature,
    request,
  });
  const expectedReplayKey = `swap-to-shielded:${expectedSettlementRequest.nullifierOrReplayCommitment}`;

  if (receipt.proofReceipt.replayKey !== expectedReplayKey) {
    throw new Error("SOL route adapter proof receipt replay key does not match the request.");
  }

  validateVantaPrivatePoolV2ProtocolSettlementResponse({
    request: expectedSettlementRequest,
    response: {
      kind: "protocol_settlement",
      proofReceipt: receipt.proofReceipt,
      protocolSettlementReceipt: receipt.protocolSettlementReceipt,
    },
  });

  return receipt;
}

export async function fetchSolToShieldedRouteQuote(args: {
  inputAmount: string;
  outputAsset: Exclude<ShieldedSwapAssetKey, "SOL">;
}): Promise<SolToShieldedRouteQuote> {
  if (!liveSolToShieldedSwapRouteAdapter.operatorUrl) {
    throw new Error("Shielded SOL route adapter is not configured.");
  }

  const response = await fetch(`${liveSolToShieldedSwapRouteAdapter.operatorUrl}/quote`, {
    body: JSON.stringify({
      inputAmount: args.inputAmount,
      inputAsset: "SOL",
      outputAsset: args.outputAsset,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The shielded SOL route adapter could not provide a quote.");
  }

  const parsed = (await response.json()) as Partial<SolToShieldedRouteQuote>;

  if (
    parsed.routeAdapter !== "sol-to-shielded-v1" ||
    parsed.inputAsset !== "SOL" ||
    parsed.outputAsset !== args.outputAsset ||
    typeof parsed.inputMintAddress !== "string" ||
    typeof parsed.outputMintAddress !== "string" ||
    typeof parsed.inputAmount !== "string" ||
    typeof parsed.minOutputAmount !== "string" ||
    typeof parsed.outputAmount !== "string" ||
    typeof parsed.quoteId !== "string" ||
    typeof parsed.quoteTimestamp !== "number" ||
    typeof parsed.quoteExpiresAt !== "number" ||
    typeof parsed.routePlanHash !== "string" ||
    typeof parsed.routeProvider !== "string" ||
    typeof parsed.slippageBps !== "number" ||
    (parsed.venueFamily !== "Aggregator" && parsed.venueFamily !== "DLMM") ||
    typeof parsed.venueName !== "string" ||
    parsed.venueNetwork !== "Mainnet"
  ) {
    throw new Error("The shielded SOL route adapter returned an invalid quote.");
  }

  return {
    inputAmount: parsed.inputAmount,
    inputAsset: "SOL",
    inputMintAddress: parsed.inputMintAddress,
    minOutputAmount: parsed.minOutputAmount,
    outputAmount: parsed.outputAmount,
    outputAsset: parsed.outputAsset,
    outputMintAddress: parsed.outputMintAddress,
    quoteExpiresAt: parsed.quoteExpiresAt,
    quoteId: parsed.quoteId,
    quoteTimestamp: parsed.quoteTimestamp,
    routeAdapter: "sol-to-shielded-v1",
    routePlanHash: parsed.routePlanHash,
    routeProvider: parsed.routeProvider,
    slippageBps: parsed.slippageBps,
    venueFamily: parsed.venueFamily,
    venueName: parsed.venueName,
    venueNetwork: parsed.venueNetwork,
    venuePoolAddress:
      typeof parsed.venuePoolAddress === "string" ? parsed.venuePoolAddress : null,
  };
}

export async function requestSolToShieldedRouteExecution(
  args: SolToShieldedRouteExecutionRequest,
): Promise<SolToShieldedRouteReceipt> {
  if (!liveSolToShieldedSwapRouteAdapter.operatorUrl) {
    throw new Error("Shielded SOL route adapter is not configured.");
  }

  const response = await fetch(`${liveSolToShieldedSwapRouteAdapter.operatorUrl}/execute`, {
    body: JSON.stringify({
      consumedNoteId: args.consumedNoteId,
      inputAmount: args.inputAmount,
      inputAsset: "SOL",
      inputMintAddress: args.inputMintAddress,
      minOutputAmount: args.minOutputAmount,
      outputAmount: args.outputAmount,
      outputAsset: args.outputAsset,
      outputMintAddress: args.outputMintAddress,
      outputNoteId: args.outputNoteId,
      owner: args.owner,
      quoteExpiresAt: args.quoteExpiresAt,
      quoteId: args.quoteId,
      quoteTimestamp: args.quoteTimestamp,
      requester: args.requester,
      routeAdapter: "sol-to-shielded-v1",
      routePlanHash: args.routePlanHash,
      routeProvider: args.routeProvider,
      slippageBps: args.slippageBps,
      transitionNoteId: args.transitionNoteId,
      transitionStateSignature: args.transitionStateSignature,
      vaultOwner: args.vaultOwner,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The shielded SOL route adapter rejected the execution request.");
  }

  return assertSolToShieldedRouteReceipt({
    request: args,
    receipt: parseSolToShieldedRouteReceipt(await response.json()),
  });
}

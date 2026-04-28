import { liveSolToShieldedSwapRouteAdapter } from "@/solana/shieldConfig";
import type { ShieldedSwapAssetKey } from "@/solana/publicSwapRoute";
import type {
  VantaPrivatePoolV2ProofReceipt,
  VantaProtocolSettlementReceipt,
} from "@/privacy/privatePoolV2ProtocolSettlementClient";

export type SolToShieldedRouteQuote = {
  inputAmount: string;
  inputAsset: "SOL";
  outputAmount: string;
  outputAsset: Exclude<ShieldedSwapAssetKey, "SOL">;
  quoteExpiresAt: number;
  quoteId: string;
  quoteTimestamp: number;
  routeAdapter: "sol-to-shielded-v1";
  venueFamily: "Aggregator" | "DLMM";
  venueName: string;
  venueNetwork: "Mainnet" | "Devnet";
  venuePoolAddress: string | null;
};

export type SolToShieldedRouteReceipt = {
  adapterReceiptId: string;
  inputAsset: "SOL";
  outputAsset: Exclude<ShieldedSwapAssetKey, "SOL">;
  outputNoteId: string;
  protocolSettlementReceipt: VantaProtocolSettlementReceipt;
  proofReceipt: VantaPrivatePoolV2ProofReceipt;
  quoteId: string;
  requestId: string;
  routeAdapter: "sol-to-shielded-v1";
  transitionNoteId: string;
};

export function getSolToShieldedRouteAdapterStatus() {
  return {
    configured: liveSolToShieldedSwapRouteAdapter.configured,
    operatorUrl: liveSolToShieldedSwapRouteAdapter.operatorUrl,
    supportedOutputAssets: liveSolToShieldedSwapRouteAdapter.supportedOutputAssets,
  };
}

export function assertSolToShieldedRouteReceipt(args: {
  expectedOutputAsset: Exclude<ShieldedSwapAssetKey, "SOL">;
  expectedQuoteId: string;
  receipt: SolToShieldedRouteReceipt;
}) {
  if (args.receipt.routeAdapter !== "sol-to-shielded-v1") {
    throw new Error("SOL route adapter receipt has the wrong adapter identity.");
  }

  if (args.receipt.inputAsset !== "SOL") {
    throw new Error("SOL route adapter receipt must consume shielded SOL.");
  }

  if (args.receipt.outputAsset !== args.expectedOutputAsset) {
    throw new Error("SOL route adapter receipt output asset does not match the requested shielded asset.");
  }

  if (args.receipt.quoteId !== args.expectedQuoteId) {
    throw new Error("SOL route adapter receipt quote id does not match the active quote.");
  }

  if (args.receipt.protocolSettlementReceipt.action !== "swap") {
    throw new Error("SOL route adapter settlement receipt action must be swap.");
  }

  if (args.receipt.protocolSettlementReceipt.economicsMode !== "committed-economics") {
    throw new Error("SOL route adapter settlement receipt must use committed economics.");
  }

  if (args.receipt.proofReceipt.intent !== "swap-to-shielded") {
    throw new Error("SOL route adapter proof receipt must prove swap-to-shielded.");
  }

  if (!args.receipt.proofReceipt.publicInputCommitment) {
    throw new Error("SOL route adapter proof receipt must include a public input commitment.");
  }

  return args.receipt;
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
    typeof parsed.inputAmount !== "string" ||
    typeof parsed.outputAmount !== "string" ||
    typeof parsed.quoteId !== "string" ||
    typeof parsed.quoteTimestamp !== "number" ||
    typeof parsed.quoteExpiresAt !== "number" ||
    (parsed.venueFamily !== "Aggregator" && parsed.venueFamily !== "DLMM") ||
    typeof parsed.venueName !== "string" ||
    (parsed.venueNetwork !== "Mainnet" && parsed.venueNetwork !== "Devnet")
  ) {
    throw new Error("The shielded SOL route adapter returned an invalid quote.");
  }

  return {
    inputAmount: parsed.inputAmount,
    inputAsset: "SOL",
    outputAmount: parsed.outputAmount,
    outputAsset: parsed.outputAsset,
    quoteExpiresAt: parsed.quoteExpiresAt,
    quoteId: parsed.quoteId,
    quoteTimestamp: parsed.quoteTimestamp,
    routeAdapter: "sol-to-shielded-v1",
    venueFamily: parsed.venueFamily,
    venueName: parsed.venueName,
    venueNetwork: parsed.venueNetwork,
    venuePoolAddress:
      typeof parsed.venuePoolAddress === "string" ? parsed.venuePoolAddress : null,
  };
}

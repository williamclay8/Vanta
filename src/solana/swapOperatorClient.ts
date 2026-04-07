import { liveSwapPair } from "@/solana/shieldConfig";
import type { SignedSwapIntent } from "@/solana/swapAuth";

export type SwapQuote = {
  inputAmount: string;
  inputAsset: "VUSD";
  outputAmount: string;
  outputAsset: "SOL";
  pairLabel: string;
  quoteExpiresAt: number;
  quoteId: string;
  quoteTimestamp: number;
  venueFamily: "DLMM";
  venueName: "Meteora";
  venueNetwork: "Devnet";
  venuePoolAddress: string;
};

export type SwapLaneHealth = {
  checkedAt: number;
  lane: "VUSD->SOL";
  message: string;
  network: "Devnet";
  poolAddress: string | null;
  reason:
    | "config_error"
    | "pool_unreachable"
    | "pair_mismatch"
    | "venue_mismatch"
    | "quote_failed"
    | "quote_stale"
    | "drift_exceeded"
    | null;
  status: "healthy" | "degraded" | "unavailable" | "misconfigured";
  venueFamily: "DLMM";
  venueName: "Meteora";
};

type SwapExecutionResponse = {
  quoteId: string;
  requestId: string;
};

export async function fetchSwapLaneHealth(): Promise<SwapLaneHealth> {
  const healthUrl = new URL("../health/swap", `${liveSwapPair.operatorUrl}/`).toString();
  const response = await fetch(healthUrl, {
    method: "GET",
    signal: AbortSignal.timeout(10_000),
  });

  const parsed = (await response.json()) as Partial<SwapLaneHealth>;

  if (
    (parsed.status !== "healthy" &&
      parsed.status !== "degraded" &&
      parsed.status !== "unavailable" &&
      parsed.status !== "misconfigured") ||
    parsed.lane !== "VUSD->SOL" ||
    parsed.venueName !== "Meteora" ||
    parsed.venueFamily !== "DLMM" ||
    parsed.network !== "Devnet" ||
    typeof parsed.message !== "string" ||
    typeof parsed.checkedAt !== "number"
  ) {
    throw new Error("The swap operator returned an invalid swap-lane health response.");
  }

  return {
    checkedAt: parsed.checkedAt,
    lane: "VUSD->SOL",
    message: parsed.message,
    network: "Devnet",
    poolAddress: typeof parsed.poolAddress === "string" ? parsed.poolAddress : null,
    reason: parsed.reason ?? null,
    status: parsed.status,
    venueFamily: "DLMM",
    venueName: "Meteora",
  };
}

export async function fetchSwapQuote(inputAmount: string): Promise<SwapQuote> {
  const response = await fetch(`${liveSwapPair.operatorUrl}/quote`, {
    body: JSON.stringify({
      inputAmount,
      inputAsset: liveSwapPair.inputAsset,
      outputAsset: liveSwapPair.outputAsset,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The swap operator could not provide a quote.");
  }

  const parsed = (await response.json()) as Partial<SwapQuote>;

  if (
    typeof parsed.quoteId !== "string" ||
    typeof parsed.inputAmount !== "string" ||
    typeof parsed.outputAmount !== "string" ||
    typeof parsed.quoteTimestamp !== "number" ||
    typeof parsed.quoteExpiresAt !== "number" ||
    typeof parsed.venuePoolAddress !== "string" ||
    typeof parsed.pairLabel !== "string" ||
    parsed.venueName !== "Meteora" ||
    parsed.venueFamily !== "DLMM" ||
    parsed.venueNetwork !== "Devnet"
  ) {
    throw new Error("The swap operator returned an invalid quote.");
  }

  return {
    inputAmount: parsed.inputAmount,
    inputAsset: "VUSD",
    outputAmount: parsed.outputAmount,
    outputAsset: "SOL",
    pairLabel: parsed.pairLabel,
    quoteExpiresAt: parsed.quoteExpiresAt,
    quoteId: parsed.quoteId,
    quoteTimestamp: parsed.quoteTimestamp,
    venueFamily: "DLMM",
    venueName: "Meteora",
    venueNetwork: "Devnet",
    venuePoolAddress: parsed.venuePoolAddress,
  };
}

export async function requestOperatorSwap(
  payload: SignedSwapIntent,
): Promise<SwapExecutionResponse> {
  const response = await fetch(liveSwapPair.operatorUrl, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The swap operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<SwapExecutionResponse>;

  if (typeof parsed.requestId !== "string" || typeof parsed.quoteId !== "string") {
    throw new Error("The swap operator did not return a valid execution receipt.");
  }

  return {
    quoteId: parsed.quoteId,
    requestId: parsed.requestId,
  };
}

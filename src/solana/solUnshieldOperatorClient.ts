import { liveSwapPair } from "@/solana/shieldConfig";
import type { SignedSolUnshieldIntent } from "@/solana/solUnshieldAuth";

type SolUnshieldOperatorResponse = {
  requestId: string;
  signature: string;
};

export async function requestOperatorSolUnshield(
  payload: SignedSolUnshieldIntent,
): Promise<SolUnshieldOperatorResponse> {
  const response = await fetch(liveSwapPair.solUnshieldOperatorUrl, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The SOL unshield operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<SolUnshieldOperatorResponse>;

  if (typeof parsed.signature !== "string" || parsed.signature.length === 0) {
    throw new Error("The SOL unshield operator did not return a valid signature.");
  }

  if (typeof parsed.requestId !== "string" || parsed.requestId.length === 0) {
    throw new Error("The SOL unshield operator did not return a valid request id.");
  }

  if (parsed.requestId !== payload.requestId) {
    throw new Error("The SOL unshield operator returned a mismatched request id.");
  }

  return {
    requestId: parsed.requestId,
    signature: parsed.signature,
  };
}

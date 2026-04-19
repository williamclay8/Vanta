import type { SignedUnshieldIntent } from "@/solana/unshieldAuth";

type UnshieldOperatorResponse = {
  requestId: string;
  signature: string;
};

export async function requestOperatorUnshield(
  payload: SignedUnshieldIntent,
  operatorUrl: string,
): Promise<UnshieldOperatorResponse> {
  const response = await fetch(operatorUrl, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The unshield operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<UnshieldOperatorResponse>;

  if (typeof parsed.signature !== "string" || parsed.signature.length === 0) {
    throw new Error("The unshield operator did not return a valid signature.");
  }

  if (typeof parsed.requestId !== "string" || parsed.requestId.length === 0) {
    throw new Error("The unshield operator did not return a valid request id.");
  }

  return {
    requestId: parsed.requestId,
    signature: parsed.signature,
  };
}

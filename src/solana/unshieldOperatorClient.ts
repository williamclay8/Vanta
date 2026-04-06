import { liveShieldAsset } from "@/solana/shieldConfig";

type UnshieldOperatorRequest = {
  amount: string;
  destinationOwner: string;
  mintAddress: string;
  noteId: string;
  owner: string;
  vaultOwner: string;
};

type UnshieldOperatorResponse = {
  signature: string;
};

export async function requestOperatorUnshield(
  payload: UnshieldOperatorRequest,
): Promise<UnshieldOperatorResponse> {
  const response = await fetch(liveShieldAsset.unshieldOperatorUrl, {
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

  return {
    signature: parsed.signature,
  };
}

export const VANTA_SWAP_INTENT_TTL_MS = 5 * 60 * 1000;

const VANTA_SWAP_INTENT_VERSION = "v2";

export type SwapIntentPayload = {
  consumedNoteId: string;
  inputAmount: string;
  inputAsset: "USDC";
  issuedAt: number;
  mintAddress: string;
  outputAmount: string;
  outputAsset: "SOL";
  outputNoteId: string;
  owner: string;
  quoteExpiresAt: number;
  quoteId: string;
  quoteTimestamp: number;
  requestId: string;
  requester: string;
  transitionNoteId: string;
  transitionStateSignature: string;
  vaultOwner: string;
  venueFamily: "DLMM";
  venueName: "Meteora";
  venueNetwork: "Devnet";
  venuePoolAddress: string;
};

export type SignedSwapIntent = SwapIntentPayload & {
  signature: string;
  version: typeof VANTA_SWAP_INTENT_VERSION;
};

export function createSwapIntentPayload(
  payload: Omit<SwapIntentPayload, "issuedAt" | "requestId">,
): SwapIntentPayload {
  return {
    ...payload,
    issuedAt: Date.now(),
    requestId: crypto.randomUUID(),
  };
}

export function formatSwapIntentMessage(payload: SwapIntentPayload) {
  return [
    `vanta:swap-intent:${VANTA_SWAP_INTENT_VERSION}`,
    `requestId:${payload.requestId}`,
    `issuedAt:${payload.issuedAt}`,
    `requester:${payload.requester}`,
    `owner:${payload.owner}`,
    `mintAddress:${payload.mintAddress}`,
    `vaultOwner:${payload.vaultOwner}`,
    `consumedNoteId:${payload.consumedNoteId}`,
    `transitionNoteId:${payload.transitionNoteId}`,
    `transitionStateSignature:${payload.transitionStateSignature}`,
    `outputNoteId:${payload.outputNoteId}`,
    `inputAsset:${payload.inputAsset}`,
    `inputAmount:${payload.inputAmount}`,
    `outputAsset:${payload.outputAsset}`,
    `outputAmount:${payload.outputAmount}`,
    `quoteId:${payload.quoteId}`,
    `quoteTimestamp:${payload.quoteTimestamp}`,
    `quoteExpiresAt:${payload.quoteExpiresAt}`,
    `venueName:${payload.venueName}`,
    `venueFamily:${payload.venueFamily}`,
    `venueNetwork:${payload.venueNetwork}`,
    `venuePoolAddress:${payload.venuePoolAddress}`,
  ].join("\n");
}

export async function signSwapIntent(
  payload: SwapIntentPayload,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<SignedSwapIntent> {
  const messageBytes = new TextEncoder().encode(formatSwapIntentMessage(payload));
  const signatureBytes = await signMessage(messageBytes);

  return {
    ...payload,
    signature: encodeBase64(signatureBytes),
    version: VANTA_SWAP_INTENT_VERSION,
  };
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

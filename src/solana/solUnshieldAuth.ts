export const VANTA_SOL_UNSHIELD_INTENT_TTL_MS = 5 * 60 * 1000;

const VANTA_SOL_UNSHIELD_INTENT_VERSION = "v1";

export type SolUnshieldIntentPayload = {
  amount: string;
  asset: "SOL";
  assetId: string;
  consumedNoteId: string;
  destinationOwner: string;
  issuedAt: number;
  owner: string;
  requestId: string;
  requester: string;
  transitionNoteId: string;
  transitionStateSignature?: string;
  vaultOwner: string;
};

export type SignedSolUnshieldIntent = SolUnshieldIntentPayload & {
  signature: string;
  version: typeof VANTA_SOL_UNSHIELD_INTENT_VERSION;
};

export function createTransitionAuthorizedSolUnshieldIntent(
  payload: SolUnshieldIntentPayload,
): SignedSolUnshieldIntent {
  if (!payload.transitionStateSignature) {
    throw new Error("Transition-authorized SOL Unshield requires a transition state signature.");
  }

  return {
    ...payload,
    signature: "transition-authorized",
    version: VANTA_SOL_UNSHIELD_INTENT_VERSION,
  };
}

export function createOperatorDirectSolUnshieldIntent(
  payload: SolUnshieldIntentPayload,
): SignedSolUnshieldIntent {
  if (!payload.transitionNoteId.startsWith("direct:")) {
    throw new Error("Operator-direct SOL Unshield requires a direct transition reference.");
  }

  return {
    ...payload,
    signature: "operator-direct",
    version: VANTA_SOL_UNSHIELD_INTENT_VERSION,
  };
}

export function createSolUnshieldIntentPayload(
  payload: Omit<SolUnshieldIntentPayload, "issuedAt" | "requestId">,
): SolUnshieldIntentPayload {
  return {
    ...payload,
    issuedAt: Date.now(),
    requestId: crypto.randomUUID(),
  };
}

export function formatSolUnshieldIntentMessage(payload: SolUnshieldIntentPayload) {
  return [
    `vanta:sol-unshield-intent:${VANTA_SOL_UNSHIELD_INTENT_VERSION}`,
    `requestId:${payload.requestId}`,
    `issuedAt:${payload.issuedAt}`,
    `requester:${payload.requester}`,
    `owner:${payload.owner}`,
    `destinationOwner:${payload.destinationOwner}`,
    `asset:${payload.asset}`,
    `assetId:${payload.assetId}`,
    `consumedNoteId:${payload.consumedNoteId}`,
    `transitionNoteId:${payload.transitionNoteId}`,
    `transitionStateSignature:${payload.transitionStateSignature ?? "pending"}`,
    `amount:${payload.amount}`,
    `vaultOwner:${payload.vaultOwner}`,
  ].join("\n");
}

export async function signSolUnshieldIntent(
  payload: SolUnshieldIntentPayload,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<SignedSolUnshieldIntent> {
  const messageBytes = new TextEncoder().encode(formatSolUnshieldIntentMessage(payload));
  const signatureBytes = await signMessage(messageBytes);

  return {
    ...payload,
    signature: encodeBase64(signatureBytes),
    version: VANTA_SOL_UNSHIELD_INTENT_VERSION,
  };
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

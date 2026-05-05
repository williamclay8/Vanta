const UNHIELD_INTENT_VERSION = "v1";

export const VANTA_UNSHIELD_INTENT_TTL_MS = 5 * 60 * 1000;

export type UnshieldIntentPayload = {
  amount: string;
  destinationOwner: string;
  issuedAt: number;
  mintAddress: string;
  noteId: string;
  owner: string;
  requestId: string;
  requester: string;
  transitionNoteId: string;
  transitionStateSignature?: string;
  vaultOwner: string;
};

export type SignedUnshieldIntent = UnshieldIntentPayload & {
  signature: string;
  version: typeof UNHIELD_INTENT_VERSION;
};

export function createTransitionAuthorizedUnshieldIntent(
  payload: UnshieldIntentPayload,
): SignedUnshieldIntent {
  if (!payload.transitionStateSignature) {
    throw new Error("Transition-authorized Unshield requires a transition state signature.");
  }

  return {
    ...payload,
    signature: "transition-authorized",
    version: UNHIELD_INTENT_VERSION,
  };
}

export function createUnshieldIntentPayload(
  payload: Omit<UnshieldIntentPayload, "issuedAt" | "requestId">,
): UnshieldIntentPayload {
  return {
    ...payload,
    issuedAt: Date.now(),
    requestId: crypto.randomUUID(),
  };
}

export function formatUnshieldIntentMessage(payload: UnshieldIntentPayload) {
  return [
    `vanta:unshield-intent:${UNHIELD_INTENT_VERSION}`,
    `requestId:${payload.requestId}`,
    `issuedAt:${payload.issuedAt}`,
    `requester:${payload.requester}`,
    `owner:${payload.owner}`,
    `destinationOwner:${payload.destinationOwner}`,
    `mintAddress:${payload.mintAddress}`,
    `vaultOwner:${payload.vaultOwner}`,
    `noteId:${payload.noteId}`,
    `transitionNoteId:${payload.transitionNoteId}`,
    `transitionStateSignature:${payload.transitionStateSignature ?? "pending"}`,
    `amount:${payload.amount}`,
  ].join("\n");
}

export async function signUnshieldIntent(
  payload: UnshieldIntentPayload,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<SignedUnshieldIntent> {
  const messageBytes = new TextEncoder().encode(formatUnshieldIntentMessage(payload));
  const signatureBytes = await signMessage(messageBytes);

  return {
    ...payload,
    signature: encodeBase64(signatureBytes),
    version: UNHIELD_INTENT_VERSION,
  };
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

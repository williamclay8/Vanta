import { createPublicKey, verify as verifySignature } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

export const VANTA_UNSHIELD_INTENT_VERSION = "v1";
export const VANTA_UNSHIELD_INTENT_TTL_MS = 5 * 60 * 1000;

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function parseSignedUnshieldIntent(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid authenticated unshield request.");
  }

  const {
    amount,
    destinationOwner,
    issuedAt,
    mintAddress,
    noteId,
    owner,
    requestId,
    requester,
    signature,
    transitionNoteId,
    transitionStateSignature,
    vaultOwner,
    version,
  } = body;

  if (
    typeof amount !== "string" ||
    typeof destinationOwner !== "string" ||
    typeof mintAddress !== "string" ||
    typeof noteId !== "string" ||
    typeof owner !== "string" ||
    typeof requestId !== "string" ||
    typeof requester !== "string" ||
    typeof signature !== "string" ||
    typeof transitionNoteId !== "string" ||
    (transitionStateSignature !== undefined &&
      typeof transitionStateSignature !== "string") ||
    typeof vaultOwner !== "string" ||
    version !== VANTA_UNSHIELD_INTENT_VERSION ||
    typeof issuedAt !== "number" ||
    !Number.isFinite(issuedAt)
  ) {
    throw new Error("Invalid authenticated unshield request.");
  }

  return {
    amount,
    destinationOwner,
    issuedAt,
    mintAddress,
    noteId,
    owner,
    requestId,
    requester,
    signature,
    transitionNoteId,
    transitionStateSignature,
    vaultOwner,
    version,
  };
}

export function formatUnshieldIntentMessage(payload) {
  return [
    `vanta:unshield-intent:${VANTA_UNSHIELD_INTENT_VERSION}`,
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

export function assertFreshUnshieldIntent(payload, now = Date.now()) {
  if (Math.abs(now - payload.issuedAt) > VANTA_UNSHIELD_INTENT_TTL_MS) {
    throw new Error("Unshield request expired. Sign a fresh wallet intent and try again.");
  }
}

export function verifySignedUnshieldIntent(payload) {
  const message = new TextEncoder().encode(formatUnshieldIntentMessage(payload));
  const signature = Buffer.from(payload.signature, "base64");
  const publicKeyBytes = new PublicKey(payload.requester).toBytes();
  const keyObject = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
    format: "der",
    type: "spki",
  });

  return verifySignature(null, message, keyObject, signature);
}

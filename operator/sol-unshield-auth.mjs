import { createPublicKey, verify as verifySignature } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

export const VANTA_SOL_UNSHIELD_INTENT_VERSION = "v1";
export const VANTA_SOL_UNSHIELD_INTENT_TTL_MS = 5 * 60 * 1000;

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function parseSignedSolUnshieldIntent(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid authenticated SOL unshield request.");
  }

  if (Object.prototype.hasOwnProperty.call(body, "transitionStateSignature")) {
    throw new Error("Invalid authenticated SOL unshield request.");
  }

  const {
    amount,
    asset,
    assetId,
    consumedNoteId,
    destinationOwner,
    issuedAt,
    owner,
    requestId,
    requester,
    signature,
    transitionNoteId,
    vaultOwner,
    version,
  } = body;

  if (
    typeof amount !== "string" ||
    asset !== "SOL" ||
    typeof assetId !== "string" ||
    typeof consumedNoteId !== "string" ||
    typeof destinationOwner !== "string" ||
    typeof owner !== "string" ||
    typeof requestId !== "string" ||
    typeof requester !== "string" ||
    typeof signature !== "string" ||
    typeof transitionNoteId !== "string" ||
    typeof vaultOwner !== "string" ||
    version !== VANTA_SOL_UNSHIELD_INTENT_VERSION ||
    typeof issuedAt !== "number" ||
    !Number.isFinite(issuedAt)
  ) {
    throw new Error("Invalid authenticated SOL unshield request.");
  }

  return {
    amount,
    asset,
    assetId,
    consumedNoteId,
    destinationOwner,
    issuedAt,
    owner,
    requestId,
    requester,
    signature,
    transitionNoteId,
    vaultOwner,
    version,
  };
}

export function formatSolUnshieldIntentMessage(payload) {
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
    `amount:${payload.amount}`,
    `vaultOwner:${payload.vaultOwner}`,
  ].join("\n");
}

export function assertFreshSolUnshieldIntent(payload, now = Date.now()) {
  if (Math.abs(now - payload.issuedAt) > VANTA_SOL_UNSHIELD_INTENT_TTL_MS) {
    throw new Error("SOL unshield request expired. Sign a fresh wallet intent and try again.");
  }
}

export function verifySignedSolUnshieldIntent(payload) {
  const message = new TextEncoder().encode(formatSolUnshieldIntentMessage(payload));
  const signature = Buffer.from(payload.signature, "base64");
  const publicKeyBytes = new PublicKey(payload.requester).toBytes();
  const keyObject = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
    format: "der",
    type: "spki",
  });

  return verifySignature(null, message, keyObject, signature);
}

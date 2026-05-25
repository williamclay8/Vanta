import { createPublicKey, verify as verifySignature } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

export const VANTA_SWAP_INTENT_VERSION = "v3";
export const VANTA_SWAP_INTENT_TTL_MS = 5 * 60 * 1000;

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function parseSignedSwapIntent(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid authenticated swap request.");
  }

  const {
    consumedNoteId,
    inputAmount,
    inputAsset,
    issuedAt,
    mintAddress,
    minOutputAmount,
    outputAmount,
    outputAsset,
    outputNoteId,
    owner,
    quoteExpiresAt,
    quoteId,
    quoteTimestamp,
    requestId,
    requester,
    signature,
    slippageBps,
    transitionNoteId,
    transitionStateSignature,
    venueFamily,
    venueName,
    venueNetwork,
    venuePoolAddress,
    vaultOwner,
    version,
  } = body;

  if (
    typeof consumedNoteId !== "string" ||
    typeof inputAmount !== "string" ||
    inputAsset !== "USDC" ||
    typeof mintAddress !== "string" ||
    typeof minOutputAmount !== "string" ||
    typeof outputAmount !== "string" ||
    outputAsset !== "SOL" ||
    typeof outputNoteId !== "string" ||
    typeof owner !== "string" ||
    typeof quoteExpiresAt !== "number" ||
    typeof quoteId !== "string" ||
    typeof quoteTimestamp !== "number" ||
    typeof requestId !== "string" ||
    typeof requester !== "string" ||
    typeof signature !== "string" ||
    typeof slippageBps !== "number" ||
    typeof transitionNoteId !== "string" ||
    typeof transitionStateSignature !== "string" ||
    venueFamily !== "DLMM" ||
    venueName !== "Meteora" ||
    venueNetwork !== "Mainnet" ||
    typeof venuePoolAddress !== "string" ||
    typeof vaultOwner !== "string" ||
    version !== VANTA_SWAP_INTENT_VERSION ||
    typeof issuedAt !== "number" ||
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(slippageBps) ||
    !Number.isFinite(quoteTimestamp) ||
    !Number.isFinite(quoteExpiresAt)
  ) {
    throw new Error("Invalid authenticated swap request.");
  }

  return {
    consumedNoteId,
    inputAmount,
    inputAsset,
    issuedAt,
    mintAddress,
    minOutputAmount,
    outputAmount,
    outputAsset,
    outputNoteId,
    owner,
    quoteExpiresAt,
    quoteId,
    quoteTimestamp,
    requestId,
    requester,
    signature,
    slippageBps,
    transitionNoteId,
    transitionStateSignature,
    venueFamily,
    venueName,
    venueNetwork,
    venuePoolAddress,
    vaultOwner,
    version,
  };
}

export function formatSwapIntentMessage(payload) {
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
    `minOutputAmount:${payload.minOutputAmount}`,
    `outputAmount:${payload.outputAmount}`,
    `quoteId:${payload.quoteId}`,
    `quoteTimestamp:${payload.quoteTimestamp}`,
    `quoteExpiresAt:${payload.quoteExpiresAt}`,
    `slippageBps:${payload.slippageBps}`,
    `venueName:${payload.venueName}`,
    `venueFamily:${payload.venueFamily}`,
    `venueNetwork:${payload.venueNetwork}`,
    `venuePoolAddress:${payload.venuePoolAddress}`,
  ].join("\n");
}

export function assertFreshSwapIntent(payload, now = Date.now()) {
  if (Math.abs(now - payload.issuedAt) > VANTA_SWAP_INTENT_TTL_MS) {
    throw new Error("Swap request expired. Sign a fresh wallet intent and try again.");
  }
}

export function verifySignedSwapIntent(payload) {
  const message = new TextEncoder().encode(formatSwapIntentMessage(payload));
  const signature = Buffer.from(payload.signature, "base64");
  const publicKeyBytes = new PublicKey(payload.requester).toBytes();
  const keyObject = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
    format: "der",
    type: "spki",
  });

  return verifySignature(null, message, keyObject, signature);
}

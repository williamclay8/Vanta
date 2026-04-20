import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type {
  VantaPrivatePoolV2ClaimQuote,
  VantaPrivatePoolV2Commitment,
  VantaPrivatePoolV2MerkleProof,
  VantaPrivatePoolV2ProofRequest,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_SHIELD_PROOF_REQUEST_VERSION =
  "vanta-private-pool-v2-shield-proof-request-0.1" as const;

export const VANTA_PRIVATE_POOL_V2_CLAIM_PROOF_REQUEST_VERSION =
  "vanta-private-pool-v2-claim-proof-request-0.1" as const;

export type VantaPrivatePoolV2ShieldProofRequestArgs = {
  amountBaseUnits: bigint;
  ownerCommitment: string;
  previousRoot?: string;
  routeCommitment?: string;
  sourceMintAddress: string;
  targetAssetId: string;
  targetMintAddress: string;
  treeCommitment: VantaPrivatePoolV2Commitment;
};

export type VantaPrivatePoolV2ClaimProofRequestArgs = {
  amountBaseUnits: bigint;
  destinationAddress: string;
  merkleProof: VantaPrivatePoolV2MerkleProof;
  nullifier: string;
  ownerCommitment: string;
  quote: VantaPrivatePoolV2ClaimQuote;
};

function hashParts(...parts: readonly string[]) {
  return `0x${bytesToHex(
    sha256(new TextEncoder().encode(parts.join("\u001f"))),
  )}`;
}

function bindRouteCommitment(args: {
  amountBaseUnits: bigint;
  routeCommitment?: string;
  sourceMintAddress: string;
  targetMintAddress: string;
}) {
  return (
    args.routeCommitment ??
    hashParts(
      VANTA_PRIVATE_POOL_V2_SHIELD_PROOF_REQUEST_VERSION,
      "route",
      args.sourceMintAddress,
      args.targetMintAddress,
      args.amountBaseUnits.toString(),
    )
  );
}

export function createVantaPrivatePoolV2ShieldProofRequest({
  amountBaseUnits,
  ownerCommitment,
  previousRoot = "0",
  routeCommitment,
  sourceMintAddress,
  targetAssetId,
  targetMintAddress,
  treeCommitment,
}: VantaPrivatePoolV2ShieldProofRequestArgs): VantaPrivatePoolV2ProofRequest {
  if (amountBaseUnits <= 0n) {
    throw new Error("Shield proof amount must be positive.");
  }

  if (!ownerCommitment.trim()) {
    throw new Error("Shield proof requires an owner commitment.");
  }

  const resolvedRouteCommitment = bindRouteCommitment({
    amountBaseUnits,
    routeCommitment,
    sourceMintAddress,
    targetMintAddress,
  });

  return {
    amountBaseUnits,
    assetId: targetAssetId,
    intent: "shield",
    publicInputs: [
      `${VANTA_PRIVATE_POOL_V2_SHIELD_PROOF_REQUEST_VERSION}:version`,
      `source-mint:${sourceMintAddress}`,
      `target-mint:${targetMintAddress}`,
      `target-asset:${targetAssetId}`,
      `amount:${amountBaseUnits.toString()}`,
      `owner-commitment:${ownerCommitment}`,
      `route-commitment:${resolvedRouteCommitment}`,
      `tree-id:${treeCommitment.treeId}`,
      `leaf-index:${treeCommitment.leafIndex}`,
      `output-commitment:${treeCommitment.commitment}`,
      `previous-root:${previousRoot}`,
      `output-root:${treeCommitment.merkleRoot}`,
    ],
  };
}

export function createVantaPrivatePoolV2ClaimProofRequest({
  amountBaseUnits,
  destinationAddress,
  merkleProof,
  nullifier,
  ownerCommitment,
  quote,
}: VantaPrivatePoolV2ClaimProofRequestArgs): VantaPrivatePoolV2ProofRequest {
  if (amountBaseUnits <= 0n) {
    throw new Error("Claim proof amount must be positive.");
  }

  if (!destinationAddress.trim()) {
    throw new Error("Claim proof requires a destination address.");
  }

  if (!nullifier.trim()) {
    throw new Error("Claim proof requires a nullifier.");
  }

  if (!ownerCommitment.trim()) {
    throw new Error("Claim proof requires an owner commitment.");
  }

  return {
    amountBaseUnits,
    assetId: merkleProof.leaf.assetId,
    intent: "claim",
    publicInputs: [
      `${VANTA_PRIVATE_POOL_V2_CLAIM_PROOF_REQUEST_VERSION}:version`,
      `asset:${merkleProof.leaf.assetId}`,
      `amount:${amountBaseUnits.toString()}`,
      `owner-commitment:${ownerCommitment}`,
      `tree-id:${merkleProof.leaf.treeId}`,
      `leaf-index:${merkleProof.leaf.leafIndex}`,
      `input-commitment:${merkleProof.leaf.commitment}`,
      `input-root:${merkleProof.root}`,
      `nullifier:${nullifier}`,
      `destination:${destinationAddress}`,
      `relayer:${quote.relayerId}`,
      `relayer-fee:${quote.estimatedFeeBaseUnits.toString()}`,
      `quote-expires-at-slot:${quote.expiresAtSlot.toString()}`,
    ],
  };
}

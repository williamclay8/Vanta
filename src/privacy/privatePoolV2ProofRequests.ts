import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type {
  VantaPrivatePoolV2ClaimQuote,
  VantaPrivatePoolV2Commitment,
  VantaPrivatePoolV2MerkleProof,
  VantaPrivatePoolV2ProofRequest,
  VantaPrivatePoolV2ShadowCommitments,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_SHIELD_PROOF_REQUEST_VERSION =
  "vanta-private-pool-v2-shield-proof-request-0.1" as const;

export const VANTA_PRIVATE_POOL_V2_CLAIM_PROOF_REQUEST_VERSION =
  "vanta-private-pool-v2-claim-proof-request-0.1" as const;

export const VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_PROOF_REQUEST_VERSION =
  "vanta-private-pool-v2-hidden-economics-proof-request-0.1" as const;

export const VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID =
  "hidden:economic-terms" as const;

export const VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS = 1n;

export const VANTA_PRIVATE_POOL_V2_SHADOW_COMMITMENT_SCHEME =
  "vanta-private-pool-v2-shadow-operator-visible-terms-sha256-0.1" as const;

export type VantaPrivatePoolV2ShieldProofRequestArgs = {
  amountBaseUnits: bigint;
  ownerCommitment: string;
  previousRoot?: string;
  routeCommitment?: string;
  shieldPublicInputHash?: string;
  sourceMintAddress: string;
  targetAssetId: string;
  targetMintAddress: string;
  treeCommitment: VantaPrivatePoolV2Commitment;
};

export type VantaPrivatePoolV2ClaimProofRequestArgs = {
  amountBaseUnits: bigint;
  destinationAddress: string;
  merkleProof: VantaPrivatePoolV2MerkleProof;
  claimPublicInputHash?: string;
  nullifier: string;
  ownerCommitment: string;
  quote: VantaPrivatePoolV2ClaimQuote;
};

export type VantaPrivatePoolV2HiddenEconomicsProofIntent =
  | "private-send"
  | "swap-to-shielded";

export type VantaPrivatePoolV2HiddenEconomicsProofRequestArgs = {
  economicsCommitment?: string;
  inputCommitment?: string;
  intent: VantaPrivatePoolV2HiddenEconomicsProofIntent;
  nullifierOrReplayCommitment: string;
  outputCommitment?: string;
  ownerCommitment: string;
  routeCommitment: string;
  settlementCommitment: string;
};

function hashParts(...parts: readonly string[]) {
  return `0x${bytesToHex(
    sha256(new TextEncoder().encode(parts.join("\u001f"))),
  )}`;
}

export function createVantaPrivatePoolV2ShadowCommitments(args: {
  intent: "shield" | "claim";
  operatorVisibleTerms: readonly string[];
}): VantaPrivatePoolV2ShadowCommitments {
  const operatorVisibleTermsCommitment = hashParts(
    VANTA_PRIVATE_POOL_V2_SHADOW_COMMITMENT_SCHEME,
    args.intent,
    ...args.operatorVisibleTerms,
  );

  return {
    economicsCommitment: operatorVisibleTermsCommitment,
    operatorVisibleTermsCommitment,
    scheme: VANTA_PRIVATE_POOL_V2_SHADOW_COMMITMENT_SCHEME,
  };
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
  shieldPublicInputHash,
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
  const publicInputs = [
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
  ] as const;

  return {
    amountBaseUnits,
    assetId: targetAssetId,
    ...(shieldPublicInputHash
      ? { circuitPublicInputs: [`shield-public-input-hash:${shieldPublicInputHash}`] }
      : {}),
    intent: "shield",
    operatorVisibleTerms: publicInputs,
    publicInputs,
    shadowCommitments: createVantaPrivatePoolV2ShadowCommitments({
      intent: "shield",
      operatorVisibleTerms: publicInputs,
    }),
  };
}

export function createVantaPrivatePoolV2ClaimProofRequest({
  amountBaseUnits,
  claimPublicInputHash,
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

  const publicInputs = [
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
  ] as const;

  return {
    amountBaseUnits,
    assetId: merkleProof.leaf.assetId,
    ...(claimPublicInputHash
      ? { circuitPublicInputs: [`claim-public-input-hash:${claimPublicInputHash}`] }
      : {}),
    intent: "claim",
    operatorVisibleTerms: publicInputs,
    publicInputs,
    shadowCommitments: createVantaPrivatePoolV2ShadowCommitments({
      intent: "claim",
      operatorVisibleTerms: publicInputs,
    }),
  };
}

export function createVantaPrivatePoolV2HiddenEconomicsProofRequest({
  economicsCommitment,
  inputCommitment,
  intent,
  nullifierOrReplayCommitment,
  outputCommitment,
  ownerCommitment,
  routeCommitment,
  settlementCommitment,
}: VantaPrivatePoolV2HiddenEconomicsProofRequestArgs): VantaPrivatePoolV2ProofRequest {
  if (intent !== "private-send" && intent !== "swap-to-shielded") {
    throw new Error("Hidden economics proof request only supports private-send and swap-to-shielded.");
  }

  if (!settlementCommitment.trim()) {
    throw new Error("Hidden economics proof request requires a settlement commitment.");
  }

  if (!ownerCommitment.trim()) {
    throw new Error("Hidden economics proof request requires an owner commitment.");
  }

  if (!nullifierOrReplayCommitment.trim()) {
    throw new Error("Hidden economics proof request requires a nullifier or replay commitment.");
  }

  if (!routeCommitment.trim()) {
    throw new Error("Hidden economics proof request requires a route commitment.");
  }

  const resolvedEconomicsCommitment =
    economicsCommitment ??
    hashParts(
      VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_PROOF_REQUEST_VERSION,
      "economics",
      intent,
      settlementCommitment,
      routeCommitment,
    );

  return {
    amountBaseUnits: VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
    assetId: VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    intent,
    publicInputs: [
      `${VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_PROOF_REQUEST_VERSION}:version`,
      `intent:${intent}`,
      `settlement-commitment:${settlementCommitment}`,
      `owner-commitment:${ownerCommitment}`,
      `nullifier-or-replay-commitment:${nullifierOrReplayCommitment}`,
      `route-commitment:${routeCommitment}`,
      `economics-commitment:${resolvedEconomicsCommitment}`,
      ...(inputCommitment ? [`input-commitment:${inputCommitment}`] : []),
      ...(outputCommitment ? [`output-commitment:${outputCommitment}`] : []),
    ],
  };
}

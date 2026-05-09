import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  VANTA_PRIVATE_POOL_V2_SHIELD_PROOF_REQUEST_VERSION,
  createVantaPrivatePoolV2ShieldProofRequest,
  type VantaPrivatePoolV2ShieldProofRequestArgs,
} from "./privatePoolV2ProofRequests";
import type { VantaPrivatePoolV2Commitment, VantaPrivatePoolV2ProofRequest } from "./privatePoolV2Types";

type PrivatePoolV2ShieldCapabilityInput = {
  blockers: readonly string[];
  mode:
    | "direct-native-sol"
    | "direct-configured-token"
    | "route-to-configured-shield-token"
    | "unsupported";
  requiresPublicRoute: boolean;
  sourceAsset: {
    mintAddress: string;
    symbol: string;
  } | null;
  supportsDirectShield: boolean;
  targetShieldAsset: {
    assetKey: string;
    label: string;
    mintAddress: string | null;
    name: string;
  } | null;
};

type SupportedPrivatePoolV2ShieldCapability = PrivatePoolV2ShieldCapabilityInput & {
  sourceAsset: NonNullable<PrivatePoolV2ShieldCapabilityInput["sourceAsset"]>;
  targetShieldAsset: NonNullable<PrivatePoolV2ShieldCapabilityInput["targetShieldAsset"]> & {
    mintAddress: string;
  };
};

export type PrivatePoolV2ShieldCapabilityProofRequestArgs = {
  amountBaseUnits: bigint;
  capability: PrivatePoolV2ShieldCapabilityInput;
  economicsCommitment?: string;
  ownerCommitment: string;
  previousRoot?: string;
  routeCommitment?: string;
  treeCommitment: VantaPrivatePoolV2Commitment;
};

function assertSupportedCapability(
  capability: PrivatePoolV2ShieldCapabilityInput,
): asserts capability is SupportedPrivatePoolV2ShieldCapability {
  if (capability.mode === "unsupported" || capability.blockers.length > 0) {
    throw new Error(
      `Shield capability is not supported: ${capability.blockers.join(" ") || capability.mode}.`,
    );
  }

  if (!capability.sourceAsset?.mintAddress) {
    throw new Error("Shield capability requires a source asset mint.");
  }

  if (!capability.targetShieldAsset?.assetKey || !capability.targetShieldAsset.mintAddress) {
    throw new Error("Shield capability requires a target shield asset.");
  }
}

function createCapabilityRouteCommitment(capability: PrivatePoolV2ShieldCapabilityInput) {
  return `capability:${capability.mode}:${capability.requiresPublicRoute ? "routed" : "direct"}`;
}

function hashParts(...parts: readonly string[]) {
  return `0x${bytesToHex(new Uint8Array(sha256(new TextEncoder().encode(parts.join("\u001f")))))}`;
}

function createCapabilityEconomicsCommitment({
  amountBaseUnits,
  capability,
  treeCommitment,
}: {
  amountBaseUnits: bigint;
  capability: SupportedPrivatePoolV2ShieldCapability;
  treeCommitment: VantaPrivatePoolV2Commitment;
}) {
  return hashParts(
    VANTA_PRIVATE_POOL_V2_SHIELD_PROOF_REQUEST_VERSION,
    "economics",
    capability.sourceAsset.mintAddress,
    capability.targetShieldAsset.assetKey,
    capability.targetShieldAsset.mintAddress,
    amountBaseUnits.toString(),
    treeCommitment.commitment,
  );
}

export function createPrivatePoolV2ShieldProofRequestFromCapability({
  amountBaseUnits,
  capability,
  economicsCommitment,
  ownerCommitment,
  previousRoot,
  routeCommitment,
  treeCommitment,
}: PrivatePoolV2ShieldCapabilityProofRequestArgs): VantaPrivatePoolV2ProofRequest {
  assertSupportedCapability(capability);

  const proofArgs: VantaPrivatePoolV2ShieldProofRequestArgs = {
    amountBaseUnits,
    economicsCommitment:
      economicsCommitment ??
      createCapabilityEconomicsCommitment({
        amountBaseUnits,
        capability,
        treeCommitment,
      }),
    ownerCommitment,
    previousRoot,
    routeCommitment: routeCommitment ?? createCapabilityRouteCommitment(capability),
    sourceMintAddress: capability.sourceAsset.mintAddress,
    targetAssetId: capability.targetShieldAsset.assetKey,
    targetMintAddress: capability.targetShieldAsset.mintAddress,
    treeCommitment,
  };

  return createVantaPrivatePoolV2ShieldProofRequest(proofArgs);
}

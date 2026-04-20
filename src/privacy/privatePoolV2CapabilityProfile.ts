import {
  createUnsupportedRouteAssessment,
  EMPTY_PRIVACY_FLAGS,
  findCapabilityAsset,
  mergePrivacyFlags,
  type VantaPrivacyCapabilityProfile,
  type VantaPrivacyProtocolAdapter,
  type VantaPrivacyRouteAssessment,
  type VantaPrivacyRouteCapability,
  type VantaPrivacyRouteIntent,
} from "./protocolAdapter";
import { UMBRA_MAINNET_SUPPORTED_ASSETS } from "./umbraCapabilityProfile";
import {
  VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION,
  type VantaPrivatePoolV2Asset,
  type VantaPrivatePoolV2Readiness,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_BENCHMARK_ASSETS = UMBRA_MAINNET_SUPPORTED_ASSETS.map(
  (asset) =>
    ({
      ...asset,
      poolMintAddress: asset.mintAddress,
      poolStatus: "benchmark",
      routeablePublicEntry: true,
    }) satisfies VantaPrivatePoolV2Asset,
);

const privatePoolV2ShieldRoute: VantaPrivacyRouteCapability = {
  description:
    "Public wallet assets route into a Vanta-owned pool-backed private asset, append a commitment, and hide future movement behind indexer, nullifier, prover, and relayer seams.",
  id: "vanta-private-pool-v2-public-wallet-to-pool-commitment",
  inputDomain: "public-wallet",
  outputDomain: "anonymous-utxo",
  privacy: mergePrivacyFlags({
    accountBalanceConfidentiality: true,
    amountPrivacy: true,
    broadPublicAssetEntry: true,
    hiddenChangeOutputs: true,
    indexerBackedUtxoDiscovery: true,
    relayedClaims: true,
    selectiveTransparency: true,
    sharedAnonymitySet: true,
    unlinkableTransfers: true,
  }),
  status: "planned",
};

const privatePoolV2SwapRoute: VantaPrivacyRouteCapability = {
  description:
    "Any routeable public asset swaps into a pool-backed target mint before entering Vanta Private Pool v2 as an anonymous commitment.",
  id: "vanta-private-pool-v2-public-swap-to-pool-commitment",
  inputDomain: "public-wallet",
  outputDomain: "anonymous-utxo",
  privacy: privatePoolV2ShieldRoute.privacy,
  status: "planned",
};

const privatePoolV2UnshieldRoute: VantaPrivacyRouteCapability = {
  description:
    "Anonymous pool commitments exit through a nullifier-bound proof and optional relayer quote, preserving exact-amount exits with hidden change.",
  id: "vanta-private-pool-v2-pool-commitment-to-public-wallet",
  inputDomain: "anonymous-utxo",
  outputDomain: "public-wallet",
  privacy: privatePoolV2ShieldRoute.privacy,
  status: "planned",
};

export function getVantaPrivatePoolV2Readiness(): VantaPrivatePoolV2Readiness {
  return {
    blockers: [
      "No Vanta-owned append-only commitment tree/indexer is live yet.",
      "No Vanta-owned nullifier set or relayer submission API is live yet.",
      "No production prover/verifier key boundary is wired for private-pool v2.",
    ],
    ready: false,
    warnings: [
      "This is the Option B target contract and benchmark profile, not a live execution lane.",
      "Public asset breadth still comes from routing into pool-backed target mints before privacy begins.",
    ],
  };
}

export function getVantaPrivatePoolV2CapabilityProfile(): VantaPrivacyCapabilityProfile {
  return {
    assets: VANTA_PRIVATE_POOL_V2_BENCHMARK_ASSETS,
    flags: mergePrivacyFlags(EMPTY_PRIVACY_FLAGS, privatePoolV2ShieldRoute.privacy),
    infrastructure: ["wallet", "rpc", "rpc-subscriptions", "indexer", "relayer", "web-zk-prover"],
    network: "mainnet",
    protocolId: "vanta-private-pool-v2",
    routes: [privatePoolV2ShieldRoute, privatePoolV2SwapRoute, privatePoolV2UnshieldRoute],
    summary:
      "Vanta Private Pool v2 target: Vanta-owned shared UTXO pool semantics with routeable public entry, commitment indexing, nullifier spends, relayed exits, selective viewing, and exact-amount hidden change.",
    trustBoundary:
      "Vanta-owned pool program, commitment indexer, nullifier set, relayer, prover/verifying-key delivery, configured RPC, and the user's wallet signer.",
  };
}

function assessVantaPrivatePoolV2Route(
  intent: VantaPrivacyRouteIntent,
): VantaPrivacyRouteAssessment {
  const profile = getVantaPrivatePoolV2CapabilityProfile();
  const readiness = getVantaPrivatePoolV2Readiness();
  const outputAsset = findCapabilityAsset(profile, intent.toMintAddress);

  if (!outputAsset) {
    return createUnsupportedRouteAssessment({
      blockers: ["target mint is not in the current Private Pool v2 benchmark pool set"],
      intent,
      profile,
      warnings: readiness.warnings,
    });
  }

  return {
    blockers: readiness.blockers,
    capability: privatePoolV2SwapRoute,
    profile,
    supported: readiness.ready,
    warnings: [
      ...readiness.warnings,
      `Contract version: ${VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION}.`,
    ],
  };
}

export function createVantaPrivatePoolV2PrivacyAdapter(): VantaPrivacyProtocolAdapter {
  return {
    assessRoute: assessVantaPrivatePoolV2Route,
    getCapabilityProfile: getVantaPrivatePoolV2CapabilityProfile,
  };
}

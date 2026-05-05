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
    "Public wallet assets route into a Vanta-owned pool-backed private asset, append a commitment, and move future activity behind deployed no-real-funds indexer, nullifier, prover, verifier, and relayer seams while audited production privacy remains blocked.",
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
    "Any routeable public asset swaps into a pool-backed target mint before entering Vanta Private Pool v2 as a private-pool commitment; live anonymity claims remain blocked until the anonymity, relayer, audit, and reviewer gates pass.",
  id: "vanta-private-pool-v2-public-swap-to-pool-commitment",
  inputDomain: "public-wallet",
  outputDomain: "anonymous-utxo",
  privacy: privatePoolV2ShieldRoute.privacy,
  status: "planned",
};

const privatePoolV2UnshieldRoute: VantaPrivacyRouteCapability = {
  description:
    "Private-pool commitments exit through a nullifier-bound proof and optional relayer quote, preserving exact-amount exits with hidden change without claiming audited production anonymity.",
  id: "vanta-private-pool-v2-pool-commitment-to-public-wallet",
  inputDomain: "anonymous-utxo",
  outputDomain: "public-wallet",
  privacy: privatePoolV2ShieldRoute.privacy,
  status: "planned",
};

const privatePoolV2TargetPrivacyFlags = mergePrivacyFlags(
  EMPTY_PRIVACY_FLAGS,
  privatePoolV2ShieldRoute.privacy,
);

const privatePoolV2CurrentVerifiedPrivacyFlags = mergePrivacyFlags(EMPTY_PRIVACY_FLAGS);

const PRIVATE_POOL_V2_REQUIRED_BLOCKING_EVIDENCE = [
  "VANTA_PRIVATE_POOL_V2_ANONYMITY_SET_REF",
  "VANTA_PRIVATE_POOL_V2_PRODUCTION_ANONYMITY_METRICS_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_SEPARATION_REF",
  "VANTA_PRIVATE_POOL_V2_AUDIT_REF",
  "npm run private-pool-v2:anonymity-set-readiness-check",
  "npm run private-pool-v2:relayer-separation-evidence-check",
  "npm run mainnet:private-settlement-check",
];

export function getVantaPrivatePoolV2Readiness(): VantaPrivatePoolV2Readiness {
  return {
    blockers: [
      "Deployed role-service and no-real-funds smoke evidence exists, but audited production privacy is not proven.",
      "Mainnet spend-program evidence exists, but shared-cohort deposit and live duplicate-nullifier replay rejection refs remain blocked.",
      "No independent reviewer or third-party audit has accepted the anonymity set, relayer separation, or production prover/verifier boundary.",
    ],
    ready: false,
    warnings: [
      "This is the Private Pool v2 capability target plus deployed no-real-funds evidence, not a production privacy claim.",
      "Public asset breadth still comes from routing into pool-backed target mints before privacy begins.",
    ],
  };
}

export function getVantaPrivatePoolV2CapabilityProfile(): VantaPrivacyCapabilityProfile {
  return {
    assets: VANTA_PRIVATE_POOL_V2_BENCHMARK_ASSETS,
    claimScope:
      "target-capability-only; current verified production privacy flags stay false until evidence gates pass",
    currentVerifiedPrivacyFlags: privatePoolV2CurrentVerifiedPrivacyFlags,
    flags: privatePoolV2CurrentVerifiedPrivacyFlags,
    infrastructure: ["wallet", "rpc", "rpc-subscriptions", "indexer", "relayer", "web-zk-prover"],
    network: "mainnet",
    privacyClaimAllowed: false,
    productionPrivateReady: false,
    protocolId: "vanta-private-pool-v2",
    requiredBlockingEvidence: PRIVATE_POOL_V2_REQUIRED_BLOCKING_EVIDENCE,
    routes: [privatePoolV2ShieldRoute, privatePoolV2SwapRoute, privatePoolV2UnshieldRoute],
    summary:
      "Vanta Private Pool v2 target: Vanta-owned shared UTXO pool semantics with routeable public entry, commitment indexing, nullifier spends, relayed exits, selective viewing, and exact-amount hidden change.",
    targetPrivacyFlags: privatePoolV2TargetPrivacyFlags,
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

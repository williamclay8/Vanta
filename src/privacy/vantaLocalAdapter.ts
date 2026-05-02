import {
  listLiveShieldTokenAssets,
  liveSwapPair,
  type LiveShieldTokenAssetConfig,
} from "@/solana/shieldConfig";
import {
  createUnsupportedRouteAssessment,
  EMPTY_PRIVACY_FLAGS,
  findCapabilityAsset,
  mergePrivacyFlags,
  type VantaPrivacyAsset,
  type VantaPrivacyCapabilityProfile,
  type VantaPrivacyProtocolAdapter,
  type VantaPrivacyRouteAssessment,
  type VantaPrivacyRouteCapability,
  type VantaPrivacyRouteIntent,
} from "./protocolAdapter";

function mapLiveShieldAsset(asset: LiveShieldTokenAssetConfig): VantaPrivacyAsset {
  return {
    decimals: asset.decimals,
    mintAddress: asset.mintAddress ?? "",
    name: asset.name,
    symbol: asset.symbol,
    tokenProgram: "SPL",
  };
}

const vantaShieldRoute: VantaPrivacyRouteCapability = {
  description:
    "Public wallet assets can route into configured Vanta shield-token lanes, then become app/operator-recognized shielded state.",
  id: "vanta-public-wallet-to-local-shielded-state",
  inputDomain: "public-wallet",
  outputDomain: "confidential-balance",
  privacy: mergePrivacyFlags({
    broadPublicAssetEntry: true,
    hiddenChangeOutputs: true,
  }),
  status: "available",
};

const vantaConstrainedSwapRoute: VantaPrivacyRouteCapability = {
  description:
    "Current constrained private-core swap lane consumes a USDC predecessor and emits shielded SOL successor state.",
  id: "vanta-local-usdc-to-shielded-sol",
  inputDomain: "confidential-balance",
  outputDomain: "confidential-balance",
  privacy: mergePrivacyFlags({
    hiddenChangeOutputs: true,
  }),
  status: liveSwapPair.configured ? "available" : "planned",
};

const vantaUnshieldRoute: VantaPrivacyRouteCapability = {
  description:
    "Configured shield-token lanes can exit through the local operator; USDC supports hidden exact-amount split before exit.",
  id: "vanta-local-shielded-state-to-public-wallet",
  inputDomain: "confidential-balance",
  outputDomain: "public-wallet",
  privacy: mergePrivacyFlags({
    hiddenChangeOutputs: true,
  }),
  status: "available",
};

export function getVantaLocalCapabilityProfile(): VantaPrivacyCapabilityProfile {
  const configuredAssets = listLiveShieldTokenAssets({ configuredOnly: true })
    .filter((asset) => asset.mintAddress)
    .map(mapLiveShieldAsset);

  return {
    assets: configuredAssets,
    flags: mergePrivacyFlags(EMPTY_PRIVACY_FLAGS, {
      broadPublicAssetEntry: true,
      hiddenChangeOutputs: true,
    }),
    infrastructure: ["wallet", "rpc", "operator"],
    network: "mainnet",
    protocolId: "vanta-local-private-core",
    routes: [vantaShieldRoute, vantaConstrainedSwapRoute, vantaUnshieldRoute],
    summary:
      "Current Vanta lane: minimal UX over local private-core/operator state, broad public routing into configured shield-token lanes, and constrained proof-backed send/swap/unshield flows.",
    trustBoundary:
      "Vanta app, configured mainnet vaults, local operator, current proof lanes, and browser-local shielded state reconstruction.",
  };
}

function assessVantaLocalRoute(intent: VantaPrivacyRouteIntent): VantaPrivacyRouteAssessment {
  const profile = getVantaLocalCapabilityProfile();
  const outputAsset = findCapabilityAsset(profile, intent.toMintAddress);

  if (!outputAsset) {
    return createUnsupportedRouteAssessment({
      blockers: ["target shielded mint is not configured in the current Vanta shield-token registry"],
      intent,
      profile,
    });
  }

  return {
    blockers: [],
    capability: vantaShieldRoute,
    profile,
    supported: true,
    warnings: [
      "This is Vanta-local shielded state, not yet a shared UTXO mixer with Umbra-level anonymity.",
      "Public entry routing can broaden source assets, but private output support remains limited to configured shield-token lanes.",
    ],
  };
}

export function createVantaLocalPrivacyAdapter(): VantaPrivacyProtocolAdapter {
  return {
    assessRoute: assessVantaLocalRoute,
    getCapabilityProfile: getVantaLocalCapabilityProfile,
  };
}

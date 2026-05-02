export type VantaPrivacyProtocolId =
  | "vanta-local-private-core"
  | "umbra-external"
  | "vanta-private-pool-v2";

export type VantaPrivacyNetwork = "mainnet" | "localnet";

export type VantaPrivacyAsset = {
  decimals: number;
  mintAddress: string;
  name: string;
  symbol: string;
  tokenProgram?: "SPL" | "Token-2022";
};

export type VantaPrivacyInfrastructureRequirement =
  | "wallet"
  | "rpc"
  | "rpc-subscriptions"
  | "indexer"
  | "relayer"
  | "mpc"
  | "web-zk-prover"
  | "operator";

export type VantaPrivacyCapabilityFlags = {
  accountBalanceConfidentiality: boolean;
  amountPrivacy: boolean;
  broadPublicAssetEntry: boolean;
  hiddenChangeOutputs: boolean;
  indexerBackedUtxoDiscovery: boolean;
  relayedClaims: boolean;
  selectiveTransparency: boolean;
  sharedAnonymitySet: boolean;
  unlinkableTransfers: boolean;
};

export type VantaPrivacyRouteCapability = {
  description: string;
  id: string;
  inputDomain: "public-wallet" | "confidential-balance" | "anonymous-utxo";
  outputDomain: "public-wallet" | "confidential-balance" | "anonymous-utxo";
  privacy: VantaPrivacyCapabilityFlags;
  status: "available" | "planned" | "external";
};

export type VantaPrivacyCapabilityProfile = {
  assets: readonly VantaPrivacyAsset[];
  flags: VantaPrivacyCapabilityFlags;
  infrastructure: readonly VantaPrivacyInfrastructureRequirement[];
  network: VantaPrivacyNetwork;
  protocolId: VantaPrivacyProtocolId;
  routes: readonly VantaPrivacyRouteCapability[];
  summary: string;
  trustBoundary: string;
};

export type VantaPrivacyRouteIntent = {
  amountBaseUnits: bigint;
  fromMintAddress: string;
  network: VantaPrivacyNetwork;
  toMintAddress: string;
};

export type VantaPrivacyRouteAssessment = {
  blockers: readonly string[];
  capability: VantaPrivacyRouteCapability | null;
  profile: VantaPrivacyCapabilityProfile;
  supported: boolean;
  warnings: readonly string[];
};

export type VantaPrivacyProtocolAdapter = {
  assessRoute(intent: VantaPrivacyRouteIntent): VantaPrivacyRouteAssessment;
  getCapabilityProfile(): VantaPrivacyCapabilityProfile;
};

export const EMPTY_PRIVACY_FLAGS: VantaPrivacyCapabilityFlags = {
  accountBalanceConfidentiality: false,
  amountPrivacy: false,
  broadPublicAssetEntry: false,
  hiddenChangeOutputs: false,
  indexerBackedUtxoDiscovery: false,
  relayedClaims: false,
  selectiveTransparency: false,
  sharedAnonymitySet: false,
  unlinkableTransfers: false,
};

export function mergePrivacyFlags(
  ...flags: readonly Partial<VantaPrivacyCapabilityFlags>[]
): VantaPrivacyCapabilityFlags {
  return flags.reduce<VantaPrivacyCapabilityFlags>(
    (merged, next) => ({
      accountBalanceConfidentiality:
        merged.accountBalanceConfidentiality || Boolean(next.accountBalanceConfidentiality),
      amountPrivacy: merged.amountPrivacy || Boolean(next.amountPrivacy),
      broadPublicAssetEntry: merged.broadPublicAssetEntry || Boolean(next.broadPublicAssetEntry),
      hiddenChangeOutputs: merged.hiddenChangeOutputs || Boolean(next.hiddenChangeOutputs),
      indexerBackedUtxoDiscovery:
        merged.indexerBackedUtxoDiscovery || Boolean(next.indexerBackedUtxoDiscovery),
      relayedClaims: merged.relayedClaims || Boolean(next.relayedClaims),
      selectiveTransparency: merged.selectiveTransparency || Boolean(next.selectiveTransparency),
      sharedAnonymitySet: merged.sharedAnonymitySet || Boolean(next.sharedAnonymitySet),
      unlinkableTransfers: merged.unlinkableTransfers || Boolean(next.unlinkableTransfers),
    }),
    EMPTY_PRIVACY_FLAGS,
  );
}

export function findCapabilityAsset(
  profile: VantaPrivacyCapabilityProfile,
  mintAddress: string,
): VantaPrivacyAsset | null {
  return profile.assets.find((asset) => asset.mintAddress === mintAddress) ?? null;
}

export function hasPrivateAssetSupport(
  profile: VantaPrivacyCapabilityProfile,
  mintAddress: string,
) {
  return Boolean(findCapabilityAsset(profile, mintAddress));
}

export function createUnsupportedRouteAssessment(args: {
  blockers: readonly string[];
  intent: VantaPrivacyRouteIntent;
  profile: VantaPrivacyCapabilityProfile;
  warnings?: readonly string[];
}): VantaPrivacyRouteAssessment {
  return {
    blockers: args.blockers,
    capability: null,
    profile: args.profile,
    supported: false,
    warnings: [
      ...((args.warnings ?? []).length > 0 ? args.warnings ?? [] : []),
      `No ${args.profile.protocolId} route currently supports ${args.intent.fromMintAddress} -> ${args.intent.toMintAddress}.`,
    ],
  };
}

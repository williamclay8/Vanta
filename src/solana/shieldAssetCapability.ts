import type { LiveShieldTokenAssetConfig } from "@/solana/shieldConfig";
import type { WalletPublicAsset } from "@/solana/useWalletPublicAssets";

export type ShieldAssetCapabilityMode =
  | "direct-native-sol"
  | "direct-configured-token"
  | "route-to-configured-shield-token"
  | "unsupported";

export type ShieldAssetCapability = {
  blockers: readonly string[];
  mode: ShieldAssetCapabilityMode;
  privacyNote: string;
  requiresPublicRoute: boolean;
  routeLabel: string;
  sourceAsset: WalletPublicAsset | null;
  supportsDirectShield: boolean;
  targetShieldAsset: {
    assetKey: LiveShieldTokenAssetConfig["assetKey"] | "SOL";
    label: string;
    mintAddress: string | null;
    name: string;
  } | null;
};

export function createShieldAssetCapability(args: {
  isNativeSolShield: boolean;
  selectedShieldAsset: LiveShieldTokenAssetConfig | null;
  selectedSourceAsset: WalletPublicAsset | null;
}): ShieldAssetCapability {
  const sourceAsset = args.selectedSourceAsset;
  const selectedShieldAsset = args.selectedShieldAsset;

  if (!sourceAsset) {
    return createUnsupportedCapability({
      blocker: "No source asset is selected.",
      routeLabel: "Select a source asset to continue.",
      sourceAsset,
      targetShieldAsset: null,
    });
  }

  if (!selectedShieldAsset?.vaultOwner || !selectedShieldAsset.mintAddress) {
    return createUnsupportedCapability({
      blocker: "No configured shield target is available for this asset.",
      routeLabel: "This asset cannot enter shielded state until a shield target is configured.",
      sourceAsset,
      targetShieldAsset: null,
    });
  }

  if (args.isNativeSolShield) {
    return {
      blockers: [],
      mode: "direct-native-sol",
      privacyNote: "direct Vanta shield route",
      requiresPublicRoute: false,
      routeLabel: "Shield SOL directly into Vanta.",
      sourceAsset,
      supportsDirectShield: true,
      targetShieldAsset: {
        assetKey: "SOL",
        label: "Shielded SOL",
        mintAddress: selectedShieldAsset.mintAddress,
        name: "Solana",
      },
    };
  }

  const targetShieldAsset = {
    assetKey: selectedShieldAsset.assetKey,
    label: `Shielded ${selectedShieldAsset.symbol}`,
    mintAddress: selectedShieldAsset.mintAddress,
    name: selectedShieldAsset.name,
  };

  if (sourceAsset.mintAddress === selectedShieldAsset.mintAddress) {
    return {
      blockers: [],
      mode: "direct-configured-token",
      privacyNote: "direct Vanta shield route",
      requiresPublicRoute: false,
      routeLabel: `Shield ${selectedShieldAsset.symbol} directly into Vanta.`,
      sourceAsset,
      supportsDirectShield: true,
      targetShieldAsset,
    };
  }

  return {
    blockers: [],
    mode: "route-to-configured-shield-token",
    privacyNote: "route required before Shield",
    requiresPublicRoute: true,
    routeLabel: `Route ${sourceAsset.symbol} into ${selectedShieldAsset.symbol} before Shield.`,
    sourceAsset,
    supportsDirectShield: false,
    targetShieldAsset,
  };
}

function createUnsupportedCapability(args: {
  blocker: string;
  routeLabel: string;
  sourceAsset: WalletPublicAsset | null;
  targetShieldAsset: ShieldAssetCapability["targetShieldAsset"];
}): ShieldAssetCapability {
  return {
    blockers: [args.blocker],
    mode: "unsupported",
    privacyNote: "This asset needs a configured Shield target first.",
    requiresPublicRoute: false,
    routeLabel: args.routeLabel,
    sourceAsset: args.sourceAsset,
    supportsDirectShield: false,
    targetShieldAsset: args.targetShieldAsset,
  };
}

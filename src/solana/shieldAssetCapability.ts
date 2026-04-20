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
      privacyNote: "asset can enter shielded state as itself",
      requiresPublicRoute: false,
      routeLabel: "Vanta will shield SOL directly so it remains SOL in shielded state.",
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
      privacyNote: "asset can enter shielded state as itself",
      requiresPublicRoute: false,
      routeLabel: `Vanta will shield ${selectedShieldAsset.symbol} directly.`,
      sourceAsset,
      supportsDirectShield: true,
      targetShieldAsset,
    };
  }

  return {
    blockers: [],
    mode: "route-to-configured-shield-token",
    privacyNote: "source asset must be routed into a configured shield asset before shielding",
    requiresPublicRoute: true,
    routeLabel: `Vanta will route ${sourceAsset.symbol} into ${selectedShieldAsset.symbol}, then shield it automatically.`,
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
    privacyNote: "asset cannot enter shielded state until a supported shield target exists",
    requiresPublicRoute: false,
    routeLabel: args.routeLabel,
    sourceAsset: args.sourceAsset,
    supportsDirectShield: false,
    targetShieldAsset: args.targetShieldAsset,
  };
}

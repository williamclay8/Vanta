import {
  listAllLiveShieldTokenAssets,
  liveShieldAsset,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";

export type ShieldedSendAssetKey = LiveShieldTokenAssetKey | "SOL";

export type ShieldedSendAssetOption = {
  configured: boolean;
  label: string;
  symbol: ShieldedSendAssetKey;
};

export type ShieldedSendAssetCapability = {
  asset: ShieldedSendAssetKey;
  blockers: readonly string[];
  executionMode: "operator-usdc-send" | "unsupported-private-send-asset";
  status: "live" | "blocked";
};

const SHIELDED_SEND_ASSET_LABELS = {
  BONK: "Shielded BONK",
  JTO: "Shielded JTO",
  JUP: "Shielded JUP",
  KMNO: "Shielded KMNO",
  PYUSD: "Shielded PYUSD",
  USDC: "Shielded USDC",
  WIF: "Shielded WIF",
  SOL: "Shielded SOL",
} as const satisfies Record<ShieldedSendAssetKey, string>;

export function listShieldedSendAssetOptions(): ShieldedSendAssetOption[] {
  const tokenOptions = listAllLiveShieldTokenAssets().map((asset) => ({
    configured: asset.configured && Boolean(asset.mintAddress && asset.vaultOwner),
    label: SHIELDED_SEND_ASSET_LABELS[asset.symbol],
    symbol: asset.symbol,
  }));

  return [
    ...tokenOptions,
    {
      configured: true,
      label: SHIELDED_SEND_ASSET_LABELS.SOL,
      symbol: "SOL" as const,
    },
  ];
}

export function getShieldedSendAssetCapability(
  asset: ShieldedSendAssetKey,
): ShieldedSendAssetCapability {
  if (asset === liveShieldAsset.assetKey && liveShieldAsset.configured) {
    return {
      asset,
      blockers: [],
      executionMode: "operator-usdc-send",
      status: "live",
    };
  }

  if (asset === liveShieldAsset.assetKey) {
    return {
      asset,
      blockers: ["Configure the USDC shield asset before live private send can execute."],
      executionMode: "unsupported-private-send-asset",
      status: "blocked",
    };
  }

  if (asset === "SOL") {
    return {
      asset,
      blockers: ["Private send currently supports shielded USDC. Shielded SOL can stay held here until the SOL send lane is implemented."],
      executionMode: "unsupported-private-send-asset",
      status: "blocked",
    };
  }

  return {
    asset,
    blockers: ["Private send currently supports shielded USDC. This asset can stay held here until its send lane is implemented."],
    executionMode: "unsupported-private-send-asset",
    status: "blocked",
  };
}

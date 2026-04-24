import {
  listAllLiveShieldTokenAssets,
  liveShieldAsset,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";

export type ShieldedSendAssetOption = {
  configured: boolean;
  label: string;
  symbol: LiveShieldTokenAssetKey;
};

export type ShieldedSendAssetCapability = {
  asset: LiveShieldTokenAssetKey;
  blockers: readonly string[];
  executionMode: "operator-vusd-send" | "needs-private-send-adapter";
  status: "live" | "blocked";
};

const SHIELDED_SEND_ASSET_LABELS = {
  BONK: "Shielded BONK",
  JTO: "Shielded JTO",
  JUP: "Shielded JUP",
  KMNO: "Shielded KMNO",
  PYUSD: "Shielded PYUSD",
  USDC: "Shielded USDC",
  VUSD: "Shielded VUSD",
  WIF: "Shielded WIF",
} as const satisfies Record<LiveShieldTokenAssetKey, string>;

export function listShieldedSendAssetOptions(): ShieldedSendAssetOption[] {
  return listAllLiveShieldTokenAssets().map((asset) => ({
    configured: asset.configured && Boolean(asset.mintAddress && asset.vaultOwner),
    label: SHIELDED_SEND_ASSET_LABELS[asset.symbol],
    symbol: asset.symbol,
  }));
}

export function getShieldedSendAssetCapability(
  asset: LiveShieldTokenAssetKey,
): ShieldedSendAssetCapability {
  if (asset === liveShieldAsset.assetKey && liveShieldAsset.configured) {
    return {
      asset,
      blockers: [],
      executionMode: "operator-vusd-send",
      status: "live",
    };
  }

  if (asset === liveShieldAsset.assetKey) {
    return {
      asset,
      blockers: ["Configure the VUSD shield asset before live private send can execute."],
      executionMode: "needs-private-send-adapter",
      status: "blocked",
    };
  }

  return {
    asset,
    blockers: ["This shielded asset needs a private send adapter before it can execute."],
    executionMode: "needs-private-send-adapter",
    status: "blocked",
  };
}

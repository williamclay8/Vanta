import type { PrivacySummaryItem } from "@/components/PrivacySummary";
import {
  getLiveShieldTokenAsset,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import type { ShieldedSwapAssetKey } from "@/solana/publicSwapRoute";

export const SWAP_PRIVACY_SUMMARY_ITEMS: readonly PrivacySummaryItem[] = [
  {
    label: "Chain sees",
    value: "a transaction happened plus encrypted swap memo packets",
  },
  {
    label: "Venue sees",
    value: "operator-visible route settlement terms; Swap production privacy is not enabled",
  },
  {
    label: "You see",
    value: "a shielded output note after settlement finalizes",
  },
];

export function formatQuoteTimestamp(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return "Pending";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatExactSwapInputAmount(value: number, asset: ShieldedSwapAssetKey) {
  const decimals = asset === "SOL" ? 9 : getLiveShieldTokenAsset(asset).decimals;

  return value.toFixed(decimals).replace(/\.?0+$/, "");
}

export function formatShortSwapId(value: string) {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export function formatSwapSlippage(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Route adapter default";
  }

  return `${(value / 100).toFixed(2).replace(/\.?0+$/, "")}% max`;
}

export function isLiveShieldTokenAssetKey(asset: ShieldedSwapAssetKey): asset is LiveShieldTokenAssetKey {
  return asset !== "SOL";
}

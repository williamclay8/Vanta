import type { PrivacySummaryItem } from "@/components/PrivacySummary";
import {
  getLiveShieldTokenAsset,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";

export type UnshieldLane = LiveShieldTokenAssetKey | "SOL";

export const UNSHIELD_PRIVACY_SUMMARY_ITEMS: readonly PrivacySummaryItem[] = [
  {
    label: "Chain sees",
    value: "a public exit transaction to your connected wallet",
  },
  {
    label: "Recipient (you) sees",
    value: "full amount, asset, and release receipt",
  },
  {
    label: "Operator sees",
    value: "exit terms and release status, not your full shielded history",
  },
];

function formatShieldTokenAmount(value: number, asset: LiveShieldTokenAssetKey) {
  const decimals = Math.min(getLiveShieldTokenAsset(asset).decimals, 6);
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(decimals, 2),
    maximumFractionDigits: decimals,
  })} ${asset}`;
}

function formatSolAmount(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} SOL`;
}

export function abbreviate(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

export function getSolscanTransactionUrl(signature: string) {
  return `https://solscan.io/tx/${encodeURIComponent(signature)}`;
}

export function formatUnshieldAmount(value: number, asset: UnshieldLane) {
  return asset === "SOL" ? formatSolAmount(value) : formatShieldTokenAmount(value, asset);
}

function formatShieldedLaneLabel(asset: UnshieldLane) {
  return `Shielded ${asset}`;
}

export function formatAvailableLaneOptionLabel(option: {
  amount: number;
  lane: UnshieldLane;
}) {
  return `${formatShieldedLaneLabel(option.lane)} - ${formatUnshieldAmount(option.amount, option.lane)} ledger spendable`;
}

import type { VantaPaymentSuiteTokenSymbol } from "@/tokens/vantaTokenCatalog";
import { getVantaTokenCatalogEntry } from "@/tokens/vantaTokenCatalog";

type AssetChipProps = {
  symbol: string;
  className?: string;
};

const assetToneClass: Partial<Record<VantaPaymentSuiteTokenSymbol, string>> = {
  SOL: "v-asset-chip--sol",
  USDC: "v-asset-chip--usdc",
  USDT: "v-asset-chip--usdt",
  BONK: "v-asset-chip--bonk",
  JUP: "v-asset-chip--jup",
};

export function AssetChip({ symbol, className }: AssetChipProps) {
  let toneClass = "v-asset-chip--default";

  try {
    const entry = getVantaTokenCatalogEntry(symbol as VantaPaymentSuiteTokenSymbol);
    toneClass = assetToneClass[entry.symbol] ?? "v-asset-chip--default";
  } catch {
    toneClass = symbol === "SOL" ? "v-asset-chip--sol" : "v-asset-chip--default";
  }

  return (
    <span className={["v-asset-chip", toneClass, className].filter(Boolean).join(" ")}>
      {symbol}
    </span>
  );
}

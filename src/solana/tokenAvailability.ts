import {
  getVantaTokenCatalogEntry,
  listVantaTokenCatalogEntries,
  type VantaPaymentSuiteTokenSymbol,
} from "@/tokens/vantaTokenCatalog";
import {
  getLiveShieldTokenAsset,
  liveSwapPair,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import { VANTA_PAY_ASSET_SYMBOLS } from "@/pay/vantaPayAssets";

export type VantaTokenActionMode =
  | "direct-shield"
  | "route-to-shield"
  | "operator-vusd-send"
  | "operator-vusd-sol"
  | "beta-local-pay"
  | "not-configured"
  | "adapter-required";

export type VantaTokenActionAvailability = {
  ariaLabel: string;
  executable: boolean;
  label: string;
  mode: VantaTokenActionMode;
  reason: string | null;
  visible: boolean;
};

export type VantaTokenAvailability = {
  configured: boolean;
  decimals: number;
  kind: "spl-shield-token" | "native-sol" | "pay-symbol";
  name: string;
  pay: VantaTokenActionAvailability;
  reason: string | null;
  send: VantaTokenActionAvailability;
  shield: VantaTokenActionAvailability;
  swapFrom: VantaTokenActionAvailability;
  swapTo: VantaTokenActionAvailability;
  symbol: VantaPaymentSuiteTokenSymbol;
  walletVisible: boolean;
};

function action(args: {
  executable: boolean;
  label: string;
  mode: VantaTokenActionMode;
  reason: string | null;
  visible?: boolean;
}): VantaTokenActionAvailability {
  return {
    ariaLabel: args.reason ? `${args.label}. ${args.reason}` : args.label,
    executable: args.executable,
    label: args.label,
    mode: args.mode,
    reason: args.reason,
    visible: args.visible ?? true,
  };
}

function isLiveShieldToken(symbol: VantaPaymentSuiteTokenSymbol): symbol is LiveShieldTokenAssetKey {
  return symbol !== "SOL" && symbol !== "USDT";
}

function configuredForShield(symbol: VantaPaymentSuiteTokenSymbol) {
  if (symbol === "SOL") {
    return liveSwapPair.configured;
  }

  if (!isLiveShieldToken(symbol)) {
    return false;
  }

  const asset = getLiveShieldTokenAsset(symbol);
  return asset.configured && Boolean(asset.mintAddress && asset.vaultOwner);
}

export function listVantaTokenAvailability(): VantaTokenAvailability[] {
  return listVantaTokenCatalogEntries().map((entry) => {
    const configured = configuredForShield(entry.symbol);
    const isPayAsset = (VANTA_PAY_ASSET_SYMBOLS as readonly string[]).includes(entry.symbol);
    const isVusd = entry.symbol === "VUSD";
    const isSol = entry.symbol === "SOL";

    return {
      configured,
      decimals: entry.decimals,
      kind: entry.kind,
      name: entry.name,
      pay: action({
        executable: isPayAsset,
        label: isPayAsset ? `Pay with ${entry.symbol}` : `${entry.symbol} is not accepted by Pay`,
        mode: isPayAsset ? "beta-local-pay" : "adapter-required",
        reason: isPayAsset ? null : "Not accepted by the current Pay beta asset set.",
        visible: isPayAsset,
      }),
      reason: configured || entry.symbol === "USDT" ? null : "Configure this asset before live execution.",
      send: action({
        executable: isVusd && configured,
        label: `Send ${entry.symbol} from shielded balance`,
        mode: isVusd && configured ? "operator-vusd-send" : "adapter-required",
        reason:
          isVusd && configured
            ? null
            : "Private send for this asset needs a private send adapter.",
      }),
      shield: action({
        executable: configured,
        label: `Shield ${entry.symbol}`,
        mode: configured ? "direct-shield" : entry.shieldFamily ? "not-configured" : "route-to-shield",
        reason: configured
          ? null
          : entry.shieldFamily
            ? "Configure this shield asset before live shielding."
            : "This asset must route into a configured shield target before shielding.",
        visible: entry.shieldFamily || isPayAsset,
      }),
      swapFrom: action({
        executable: isVusd && liveSwapPair.configured,
        label: `Swap from shielded ${entry.symbol}`,
        mode: isVusd && liveSwapPair.configured ? "operator-vusd-sol" : "adapter-required",
        reason:
          isVusd && liveSwapPair.configured
            ? null
            : "Route not ready yet for this shielded asset.",
      }),
      swapTo: action({
        executable: isSol && liveSwapPair.configured,
        label: `Swap to shielded ${entry.symbol}`,
        mode: isSol && liveSwapPair.configured ? "operator-vusd-sol" : "adapter-required",
        reason:
          isSol && liveSwapPair.configured
            ? null
            : "Route not ready yet for this shielded asset.",
      }),
      symbol: entry.symbol,
      walletVisible: entry.shieldFamily || isPayAsset,
    };
  });
}

export function getVantaTokenAvailability(symbol: VantaPaymentSuiteTokenSymbol) {
  const availability = listVantaTokenAvailability().find(
    (candidate) => candidate.symbol === symbol,
  );

  if (!availability) {
    getVantaTokenCatalogEntry(symbol);
    throw new Error(`Missing token availability for ${symbol}.`);
  }

  return availability;
}

import {
  getVantaTokenCatalogEntry,
  listVantaTokenCatalogEntries,
  type VantaPaymentSuiteTokenSymbol,
} from "@/tokens/vantaTokenCatalog";
import {
  getLiveShieldTokenAsset,
  getPrimaryLiveShieldTokenAsset,
  isNativeSolShieldConfigured,
  liveSwapPair,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import { VANTA_PAY_ASSET_SYMBOLS } from "@/pay/vantaPayAssets";

export type VantaTokenActionMode =
  | "direct-shield"
  | "route-to-shield"
  | "operator-usdc-send"
  | "operator-usdc-sol"
  | "operator-token-unshield"
  | "operator-sol-unshield"
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

export type VantaTokenCapabilityLane = {
  boundary:
    | "routeable-public-input"
    | "configured-shield-target"
    | "pool-backed-private-asset";
  reason: string | null;
  ready: boolean;
  status: "ready" | "blocked" | "not-applicable";
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
  publicInput: VantaTokenCapabilityLane;
  shieldTarget: VantaTokenCapabilityLane;
  poolBackedPrivateAsset: VantaTokenCapabilityLane;
  swapFrom: VantaTokenActionAvailability;
  swapTo: VantaTokenActionAvailability;
  unshield: VantaTokenActionAvailability;
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

function capabilityLane(args: VantaTokenCapabilityLane): VantaTokenCapabilityLane {
  return args;
}

function isLiveShieldToken(symbol: VantaPaymentSuiteTokenSymbol): symbol is LiveShieldTokenAssetKey {
  return symbol !== "SOL" && symbol !== "USDT";
}

function configuredForShield(symbol: VantaPaymentSuiteTokenSymbol) {
  if (symbol === "SOL") {
    return isNativeSolShieldConfigured();
  }

  if (!isLiveShieldToken(symbol)) {
    return false;
  }

  const asset = getLiveShieldTokenAsset(symbol);
  return asset.configured && Boolean(asset.mintAddress && asset.vaultOwner);
}

function configuredForUnshield(symbol: VantaPaymentSuiteTokenSymbol) {
  if (symbol === "SOL") {
    return liveSwapPair.configured && Boolean(liveSwapPair.solUnshieldOperatorUrl);
  }

  if (!isLiveShieldToken(symbol)) {
    return false;
  }

  return getLiveShieldTokenAsset(symbol).unshieldConfigured;
}

export function listVantaTokenAvailability(): VantaTokenAvailability[] {
  return listVantaTokenCatalogEntries().map((entry) => {
    const configured = configuredForShield(entry.symbol);
    const unshieldConfigured = configuredForUnshield(entry.symbol);
    const isPayAsset = (VANTA_PAY_ASSET_SYMBOLS as readonly string[]).includes(entry.symbol);
    const isUsdc = entry.symbol === "USDC";
    const isSol = entry.symbol === "SOL";
    const routeablePublicInput = entry.shieldFamily || isPayAsset;
    const routeableShieldConfigured = Boolean(
      routeablePublicInput && getPrimaryLiveShieldTokenAsset().executable,
    );
    const configuredShieldTarget = configured && entry.shieldFamily;
    const shieldExecutable = configured || (!entry.shieldFamily && routeableShieldConfigured);

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
        executable: isUsdc && configured,
        label: `Send ${entry.symbol} from shielded balance`,
        mode: isUsdc && configured ? "operator-usdc-send" : "adapter-required",
        reason:
          isUsdc && configured
            ? null
            : "Private send currently supports shielded USDC.",
      }),
      publicInput: capabilityLane({
        boundary: "routeable-public-input",
        ready: routeablePublicInput,
        status: routeablePublicInput ? "ready" : "not-applicable",
        reason: routeablePublicInput
          ? entry.shieldFamily
            ? "This asset can enter Shield directly when configured, or serve as a route target."
            : "This asset can route into a configured shield target before privacy begins."
          : "This asset is not part of the current wallet-routeable token surface.",
      }),
      shield: action({
        executable: shieldExecutable,
        label: `Shield ${entry.symbol}`,
        mode: configured ? "direct-shield" : entry.shieldFamily ? "not-configured" : "route-to-shield",
        reason: shieldExecutable
          ? null
          : entry.shieldFamily
            ? "Configure this shield asset before live shielding."
            : "This asset must route into a configured shield target before shielding.",
        visible: entry.shieldFamily || isPayAsset,
      }),
      shieldTarget: capabilityLane({
        boundary: "configured-shield-target",
        ready: configuredShieldTarget,
        status: configuredShieldTarget ? "ready" : entry.shieldFamily ? "blocked" : "not-applicable",
        reason: configuredShieldTarget
          ? null
          : entry.shieldFamily
            ? "Configure this shield asset before it can be a direct Shield target."
            : "This token is routeable only; it is not a configured Shield target.",
      }),
      poolBackedPrivateAsset: capabilityLane({
        boundary: "pool-backed-private-asset",
        ready: false,
        status: "blocked",
        reason:
          "Private Pool v2 production anonymity-set readiness is still blocked; do not claim this asset is fully private.",
      }),
      swapFrom: action({
        executable: isUsdc && liveSwapPair.configured,
        label: `Swap from shielded ${entry.symbol}`,
        mode: isUsdc && liveSwapPair.configured ? "operator-usdc-sol" : "adapter-required",
        reason:
          isUsdc && liveSwapPair.configured
            ? null
            : "Route not ready yet for this shielded asset.",
      }),
      swapTo: action({
        executable: isSol && liveSwapPair.configured,
        label: `Swap to shielded ${entry.symbol}`,
        mode: isSol && liveSwapPair.configured ? "operator-usdc-sol" : "adapter-required",
        reason:
          isSol && liveSwapPair.configured
            ? null
            : "Route not ready yet for this shielded asset.",
      }),
      unshield: action({
        executable: unshieldConfigured,
        label: `Unshield ${entry.symbol}`,
        mode: unshieldConfigured
          ? isSol
            ? "operator-sol-unshield"
            : "operator-token-unshield"
          : entry.shieldFamily
            ? "not-configured"
            : "adapter-required",
        reason: unshieldConfigured
          ? null
          : entry.shieldFamily
            ? "Configure this asset's unshield operator before it can return to a public wallet."
            : "This token is not a current shielded Unshield lane.",
        visible: entry.shieldFamily,
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

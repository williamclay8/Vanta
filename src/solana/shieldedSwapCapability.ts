import {
  isNativeSolShieldConfigured,
  liveSolToShieldedSwapRouteAdapter,
  liveSwapPair,
} from "@/solana/shieldConfig";
import type { ShieldedSwapAssetKey } from "@/solana/publicSwapRoute";
import {
  abbreviateMintAddress,
  listMainnetSwapAssetCatalog,
} from "@/solana/swapAssetCatalog";

export type ShieldedSwapAssetOption = {
  configured: boolean;
  label: string;
  mainnetMintAddress: string;
  name: string;
  symbol: ShieldedSwapAssetKey;
};

export type ShieldedSwapPairCapability = {
  actionLabel: string;
  blockers: readonly string[];
  custodyModel:
    | "operator-custodial-liquidity"
    | "private-route-adapter-required"
    | "not-applicable";
  executionMode:
    | "operator-usdc-sol"
    | "operator-sol-to-shielded"
    | "needs-private-route-adapter";
  inputAsset: ShieldedSwapAssetKey;
  outputAsset: ShieldedSwapAssetKey;
  programmaticPrivateSwapReady: false;
  settlementVisibility: "operator-visible" | "not-executable";
  status: "live" | "blocked";
  targetModel:
    | "target-c-operator-visible-beta"
    | "target-a-private-route-required"
    | "not-applicable";
  userFacingRouteTruth: string;
};

const SHIELDED_SWAP_ASSET_LABELS = {
  BONK: "Shielded BONK",
  EURC: "Shielded EURC",
  JTO: "Shielded JTO",
  JUP: "Shielded JUP",
  JupUSD: "Shielded JupUSD",
  KMNO: "Shielded KMNO",
  PYUSD: "Shielded PYUSD",
  SOL: "Shielded SOL",
  USD1: "Shielded USD1",
  USDC: "Shielded USDC",
  USDS: "Shielded USDS",
  USDT: "Shielded USDT",
  USX: "Shielded USX",
  WIF: "Shielded WIF",
} as const satisfies Record<ShieldedSwapAssetKey, string>;

export function listShieldedSwapAssetOptions(): ShieldedSwapAssetOption[] {
  return listMainnetSwapAssetCatalog().map((entry) => ({
    configured:
      entry.symbol === "SOL"
        ? isNativeSolShieldConfigured()
        : entry.configured,
    label: `${SHIELDED_SWAP_ASSET_LABELS[entry.symbol]} (${abbreviateMintAddress(
      entry.mainnetMintAddress,
    )})`,
    mainnetMintAddress: entry.mainnetMintAddress,
    name: entry.name,
    symbol: entry.symbol,
  }));
}

export function getShieldedSwapPairCapability(args: {
  inputAsset: ShieldedSwapAssetKey;
  outputAsset: ShieldedSwapAssetKey;
}): ShieldedSwapPairCapability {
  if (args.inputAsset === args.outputAsset) {
    return {
      actionLabel: "Choose another pair",
      blockers: ["Choose two different shielded assets."],
      custodyModel: "not-applicable",
      executionMode: "needs-private-route-adapter",
      inputAsset: args.inputAsset,
      outputAsset: args.outputAsset,
      programmaticPrivateSwapReady: false,
      settlementVisibility: "not-executable",
      status: "blocked",
      targetModel: "not-applicable",
      userFacingRouteTruth:
        "No swap route is selected because the source and target assets match.",
    };
  }

  if (
    args.inputAsset === liveSwapPair.inputAsset &&
    args.outputAsset === liveSwapPair.outputAsset &&
    liveSwapPair.configured
  ) {
    return {
      actionLabel: "Authorize operator-visible swap",
      blockers: [],
      custodyModel: "operator-custodial-liquidity",
      executionMode: "operator-usdc-sol",
      inputAsset: args.inputAsset,
      outputAsset: args.outputAsset,
      programmaticPrivateSwapReady: false,
      settlementVisibility: "operator-visible",
      status: "live",
      targetModel: "target-c-operator-visible-beta",
      userFacingRouteTruth:
        "Target C beta: this USDC to SOL route uses operator-custodial liquidity and operator-visible settlement evidence; it is not a production-private or programmatic swap.",
    };
  }

  if (args.inputAsset === "SOL" && args.outputAsset !== "SOL") {
    if (
      liveSolToShieldedSwapRouteAdapter.configured &&
      liveSolToShieldedSwapRouteAdapter.supportedOutputAssets.includes(args.outputAsset)
    ) {
      return {
        actionLabel: "Authorize operator-visible swap",
        blockers: [],
        custodyModel: "operator-custodial-liquidity",
        executionMode: "operator-sol-to-shielded",
        inputAsset: args.inputAsset,
        outputAsset: args.outputAsset,
        programmaticPrivateSwapReady: false,
        settlementVisibility: "operator-visible",
        status: "live",
        targetModel: "target-c-operator-visible-beta",
        userFacingRouteTruth:
          "Target C beta: this SOL to shielded-asset route uses an operator route adapter with operator-visible settlement evidence; it is not a production-private or programmatic swap.",
      };
    }

    return {
      actionLabel: "Route unavailable",
      blockers: [
        "Shielded SOL to shielded asset needs a SOL route adapter with committed settlement evidence before it can execute.",
      ],
      custodyModel: "private-route-adapter-required",
      executionMode: "needs-private-route-adapter",
      inputAsset: args.inputAsset,
      outputAsset: args.outputAsset,
      programmaticPrivateSwapReady: false,
      settlementVisibility: "not-executable",
      status: "blocked",
      targetModel: "target-a-private-route-required",
      userFacingRouteTruth:
        "Blocked: this pair needs a private route adapter, rebalance contract, and verifier-backed settlement evidence before Vanta can frame it as a programmatic private swap.",
    };
  }

  return {
    actionLabel: "Route unavailable",
    blockers: [
      "This shielded pair needs a route adapter with committed settlement evidence before it can execute.",
    ],
    custodyModel: "private-route-adapter-required",
    executionMode: "needs-private-route-adapter",
    inputAsset: args.inputAsset,
    outputAsset: args.outputAsset,
    programmaticPrivateSwapReady: false,
    settlementVisibility: "not-executable",
    status: "blocked",
    targetModel: "target-a-private-route-required",
    userFacingRouteTruth:
      "Blocked: this pair needs a private route adapter, rebalance contract, and verifier-backed settlement evidence before Vanta can frame it as a programmatic private swap.",
  };
}

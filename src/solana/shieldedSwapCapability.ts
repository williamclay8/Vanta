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
  blockers: readonly string[];
  executionMode:
    | "operator-usdc-sol"
    | "operator-sol-to-shielded"
    | "needs-private-route-adapter";
  inputAsset: ShieldedSwapAssetKey;
  outputAsset: ShieldedSwapAssetKey;
  status: "live" | "blocked";
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
      blockers: ["Choose two different shielded assets."],
      executionMode: "needs-private-route-adapter",
      inputAsset: args.inputAsset,
      outputAsset: args.outputAsset,
      status: "blocked",
    };
  }

  if (
    args.inputAsset === liveSwapPair.inputAsset &&
    args.outputAsset === liveSwapPair.outputAsset &&
    liveSwapPair.configured
  ) {
    return {
      blockers: [],
      executionMode: "operator-usdc-sol",
      inputAsset: args.inputAsset,
      outputAsset: args.outputAsset,
      status: "live",
    };
  }

  if (args.inputAsset === "SOL" && args.outputAsset !== "SOL") {
    if (
      liveSolToShieldedSwapRouteAdapter.configured &&
      liveSolToShieldedSwapRouteAdapter.supportedOutputAssets.includes(args.outputAsset)
    ) {
      return {
        blockers: [],
        executionMode: "operator-sol-to-shielded",
        inputAsset: args.inputAsset,
        outputAsset: args.outputAsset,
        status: "live",
      };
    }

    return {
      blockers: [
        "Shielded SOL to shielded asset needs a SOL route adapter with committed settlement evidence before it can execute.",
      ],
      executionMode: "needs-private-route-adapter",
      inputAsset: args.inputAsset,
      outputAsset: args.outputAsset,
      status: "blocked",
    };
  }

  return {
    blockers: [
      "This shielded pair needs a route adapter with committed settlement evidence before it can execute.",
    ],
    executionMode: "needs-private-route-adapter",
    inputAsset: args.inputAsset,
    outputAsset: args.outputAsset,
    status: "blocked",
  };
}

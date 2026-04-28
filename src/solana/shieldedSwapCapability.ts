import {
  listAllLiveShieldTokenAssets,
  liveSolToShieldedSwapRouteAdapter,
  liveSwapPair,
} from "@/solana/shieldConfig";
import type { ShieldedSwapAssetKey } from "@/solana/publicSwapRoute";

export type ShieldedSwapAssetOption = {
  configured: boolean;
  label: string;
  symbol: ShieldedSwapAssetKey;
};

export type ShieldedSwapPairCapability = {
  blockers: readonly string[];
  executionMode:
    | "operator-vusd-sol"
    | "operator-sol-to-shielded"
    | "needs-private-route-adapter";
  inputAsset: ShieldedSwapAssetKey;
  outputAsset: ShieldedSwapAssetKey;
  status: "live" | "blocked";
};

const SHIELDED_SWAP_ASSET_LABELS = {
  BONK: "Shielded BONK",
  JTO: "Shielded JTO",
  JUP: "Shielded JUP",
  KMNO: "Shielded KMNO",
  PYUSD: "Shielded PYUSD",
  SOL: "Shielded SOL",
  USDC: "Shielded USDC",
  VUSD: "Shielded VUSD",
  WIF: "Shielded WIF",
} as const satisfies Record<ShieldedSwapAssetKey, string>;

export function listShieldedSwapAssetOptions(): ShieldedSwapAssetOption[] {
  return [
    ...listAllLiveShieldTokenAssets().map((asset) => ({
      configured: asset.configured && Boolean(asset.mintAddress && asset.vaultOwner),
      label: SHIELDED_SWAP_ASSET_LABELS[asset.symbol],
      symbol: asset.symbol,
    })),
    {
      configured: liveSwapPair.configured,
      label: SHIELDED_SWAP_ASSET_LABELS.SOL,
      symbol: "SOL" as const,
    },
  ];
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
      executionMode: "operator-vusd-sol",
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
        blockers: ["Shielded SOL route adapter is configured, but execution is blocked until the UI submits and verifies the SOL-to-shielded settlement receipt."],
        executionMode: "operator-sol-to-shielded",
        inputAsset: args.inputAsset,
        outputAsset: args.outputAsset,
        status: "blocked",
      };
    }

    return {
      blockers: ["Shielded SOL to shielded asset needs the SOL route adapter before it can execute."],
      executionMode: "needs-private-route-adapter",
      inputAsset: args.inputAsset,
      outputAsset: args.outputAsset,
      status: "blocked",
    };
  }

  return {
    blockers: ["This shielded pair needs a private route adapter before it can execute."],
    executionMode: "needs-private-route-adapter",
    inputAsset: args.inputAsset,
    outputAsset: args.outputAsset,
    status: "blocked",
  };
}

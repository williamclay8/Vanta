import {
  listAllLiveShieldTokenAssets,
  liveSwapPair,
  type LiveShieldTokenAssetConfig,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import type { ShieldedSwapAssetKey } from "@/solana/publicSwapRoute";

export type SwapAssetCatalogEntry = {
  asset: LiveShieldTokenAssetConfig | null;
  configured: boolean;
  decimals: number;
  executable: boolean;
  label: string;
  mainnetMintAddress: string;
  name: string;
  symbol: ShieldedSwapAssetKey;
};

export function abbreviateMintAddress(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

const MAINNET_SWAP_TOKEN_MINTS = {
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JTO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  KMNO: "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS",
  PYUSD: "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
} as const satisfies Partial<Record<LiveShieldTokenAssetKey, string>>;

function getMainnetSwapTokenMint(symbol: LiveShieldTokenAssetKey) {
  return MAINNET_SWAP_TOKEN_MINTS[symbol as keyof typeof MAINNET_SWAP_TOKEN_MINTS] ?? null;
}

export function listMainnetSwapAssetCatalog(): SwapAssetCatalogEntry[] {
  return [
    ...listAllLiveShieldTokenAssets()
      .flatMap((asset) => {
        const mainnetMintAddress = getMainnetSwapTokenMint(asset.symbol);

        if (!mainnetMintAddress) {
          return [];
        }

        return [{
          asset,
          configured: asset.configured && Boolean(asset.vaultOwner),
          decimals: asset.decimals,
          executable: asset.executable,
          label: `${asset.symbol} - ${asset.name}`,
          mainnetMintAddress,
          name: asset.name,
          symbol: asset.symbol,
        }];
      }),
    {
      asset: null,
      configured: true,
      decimals: 9,
      executable: true,
      label: "SOL - Solana",
      mainnetMintAddress: liveSwapPair.solAssetId,
      name: "Solana",
      symbol: "SOL" as const,
    },
  ].sort((left, right) => {
    if (left.symbol === "SOL") {
      return 1;
    }

    if (right.symbol === "SOL") {
      return -1;
    }

    return (left.asset?.priority ?? 100) - (right.asset?.priority ?? 100);
  });
}

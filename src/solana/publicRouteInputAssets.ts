export type PublicRouteInputAssetSymbol = "USDT" | "EURC" | "USDS" | "CBBTC";

export type PublicRouteInputAssetConfig = {
  decimals: number;
  mintAddress: string;
  name: string;
  symbol: PublicRouteInputAssetSymbol;
};

export const PUBLIC_ROUTE_INPUT_ASSETS = [
  {
    decimals: 6,
    mintAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    name: "Tether USD",
    symbol: "USDT",
  },
  {
    decimals: 6,
    mintAddress: "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr",
    name: "Euro Coin",
    symbol: "EURC",
  },
  {
    decimals: 6,
    mintAddress: "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA",
    name: "USDS",
    symbol: "USDS",
  },
  {
    decimals: 8,
    mintAddress: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
    name: "Coinbase Wrapped BTC",
    symbol: "CBBTC",
  },
] as const satisfies readonly PublicRouteInputAssetConfig[];

export function listPublicRouteInputAssets() {
  return PUBLIC_ROUTE_INPUT_ASSETS;
}

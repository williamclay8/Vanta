import { useMemo } from "react";
import { useSplToken } from "@solana/react-hooks";
import {
  ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS,
  getLiveShieldTokenAsset,
  SHIELD_HOOK_FALLBACK_MINT,
  type LiveShieldTokenAssetConfig,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import { useVantaShieldAssetState } from "@/solana/useVantaShieldAssetState";

export type VantaShieldAssetRegistryEntry = {
  account: ReturnType<typeof useVantaShieldAssetState>["account"];
  asset: LiveShieldTokenAssetConfig;
  error: string | null;
  isReady: boolean;
  isRefreshing: boolean;
  publicBalance: number;
  refresh: ReturnType<typeof useVantaShieldAssetState>["refresh"];
  token: ReturnType<typeof useSplToken>;
};

function useVantaShieldAssetRegistryEntry(
  assetKey: LiveShieldTokenAssetKey,
): VantaShieldAssetRegistryEntry {
  const asset = getLiveShieldTokenAsset(assetKey);
  const accountState = useVantaShieldAssetState({
    includeLocallyReleasedSolNotes: true,
    mintAddress: asset.mintAddress,
    unshieldOperatorUrl: asset.unshieldOperatorUrl,
    vaultOwner: asset.vaultOwner,
  });
  const token = useSplToken(asset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });

  return useMemo(() => ({
    account: accountState.account,
    asset,
    error: accountState.error,
    isReady: accountState.isReady,
    isRefreshing: accountState.isRefreshing,
    publicBalance: Number(token.balance?.uiAmount ?? "0"),
    refresh: accountState.refresh,
    token,
  }), [
    accountState.account,
    accountState.error,
    accountState.isReady,
    accountState.isRefreshing,
    accountState.refresh,
    asset,
    token,
  ]);
}

export function useVantaShieldAssetRegistryState() {
  const usdcEntry = useVantaShieldAssetRegistryEntry("USDC");
  const usdtEntry = useVantaShieldAssetRegistryEntry("USDT");
  const eurcEntry = useVantaShieldAssetRegistryEntry("EURC");
  const usdsEntry = useVantaShieldAssetRegistryEntry("USDS");
  const usxEntry = useVantaShieldAssetRegistryEntry("USX");
  const usd1Entry = useVantaShieldAssetRegistryEntry("USD1");
  const jupusdEntry = useVantaShieldAssetRegistryEntry("JupUSD");
  const jtoEntry = useVantaShieldAssetRegistryEntry("JTO");
  const bonkEntry = useVantaShieldAssetRegistryEntry("BONK");
  const jupEntry = useVantaShieldAssetRegistryEntry("JUP");
  const pyusdEntry = useVantaShieldAssetRegistryEntry("PYUSD");
  const wifEntry = useVantaShieldAssetRegistryEntry("WIF");
  const kmnoEntry = useVantaShieldAssetRegistryEntry("KMNO");

  return useMemo(() => {
    const entries = [
      usdcEntry,
      usdtEntry,
      eurcEntry,
      usdsEntry,
      usxEntry,
      usd1Entry,
      jupusdEntry,
      jtoEntry,
      bonkEntry,
      jupEntry,
      pyusdEntry,
      wifEntry,
      kmnoEntry,
    ] satisfies VantaShieldAssetRegistryEntry[];

    const byAssetKey = Object.fromEntries(
      entries.map((entry) => [entry.asset.assetKey, entry]),
    ) as Record<LiveShieldTokenAssetKey, VantaShieldAssetRegistryEntry>;

    return {
      byAssetKey,
      configuredEntries: entries.filter((entry) => entry.asset.executable),
      entries,
      orderedAssetKeys: ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS,
    };
  }, [
    bonkEntry,
    eurcEntry,
    jtoEntry,
    jupEntry,
    jupusdEntry,
    kmnoEntry,
    pyusdEntry,
    usd1Entry,
    usdcEntry,
    usdsEntry,
    usdtEntry,
    usxEntry,
    wifEntry,
  ]);
}

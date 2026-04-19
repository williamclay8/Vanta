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
  refresh: () => Promise<void>;
  token: ReturnType<typeof useSplToken>;
};

export function useVantaShieldAssetRegistryState() {
  const vusdAsset = getLiveShieldTokenAsset("VUSD");
  const usdcAsset = getLiveShieldTokenAsset("USDC");
  const jtoAsset = getLiveShieldTokenAsset("JTO");
  const bonkAsset = getLiveShieldTokenAsset("BONK");

  const vusdAccountState = useVantaShieldAssetState({
    includeLocallyReleasedSolNotes: true,
    mintAddress: vusdAsset.mintAddress,
    vaultOwner: vusdAsset.vaultOwner,
  });
  const usdcAccountState = useVantaShieldAssetState({
    mintAddress: usdcAsset.mintAddress,
    vaultOwner: usdcAsset.vaultOwner,
  });
  const jtoAccountState = useVantaShieldAssetState({
    mintAddress: jtoAsset.mintAddress,
    vaultOwner: jtoAsset.vaultOwner,
  });
  const bonkAccountState = useVantaShieldAssetState({
    mintAddress: bonkAsset.mintAddress,
    vaultOwner: bonkAsset.vaultOwner,
  });

  const vusdToken = useSplToken(vusdAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const usdcToken = useSplToken(usdcAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const jtoToken = useSplToken(jtoAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const bonkToken = useSplToken(bonkAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });

  return useMemo(() => {
    const entries = [
      {
        account: vusdAccountState.account,
        asset: vusdAsset,
        error: vusdAccountState.error,
        isReady: vusdAccountState.isReady,
        isRefreshing: vusdAccountState.isRefreshing,
        publicBalance: Number(vusdToken.balance?.uiAmount ?? "0"),
        refresh: vusdAccountState.refresh,
        token: vusdToken,
      },
      {
        account: usdcAccountState.account,
        asset: usdcAsset,
        error: usdcAccountState.error,
        isReady: usdcAccountState.isReady,
        isRefreshing: usdcAccountState.isRefreshing,
        publicBalance: Number(usdcToken.balance?.uiAmount ?? "0"),
        refresh: usdcAccountState.refresh,
        token: usdcToken,
      },
      {
        account: jtoAccountState.account,
        asset: jtoAsset,
        error: jtoAccountState.error,
        isReady: jtoAccountState.isReady,
        isRefreshing: jtoAccountState.isRefreshing,
        publicBalance: Number(jtoToken.balance?.uiAmount ?? "0"),
        refresh: jtoAccountState.refresh,
        token: jtoToken,
      },
      {
        account: bonkAccountState.account,
        asset: bonkAsset,
        error: bonkAccountState.error,
        isReady: bonkAccountState.isReady,
        isRefreshing: bonkAccountState.isRefreshing,
        publicBalance: Number(bonkToken.balance?.uiAmount ?? "0"),
        refresh: bonkAccountState.refresh,
        token: bonkToken,
      },
    ] satisfies VantaShieldAssetRegistryEntry[];

    const byAssetKey = Object.fromEntries(
      entries.map((entry) => [entry.asset.assetKey, entry]),
    ) as Record<LiveShieldTokenAssetKey, VantaShieldAssetRegistryEntry>;

    return {
      byAssetKey,
      configuredEntries: entries.filter((entry) => entry.asset.configured && entry.asset.mintAddress),
      entries,
      orderedAssetKeys: ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS,
    };
  }, [
    bonkAccountState.account,
    bonkAccountState.error,
    bonkAccountState.isReady,
    bonkAccountState.isRefreshing,
    bonkAccountState.refresh,
    bonkAsset,
    bonkToken,
    jtoAccountState.account,
    jtoAccountState.error,
    jtoAccountState.isReady,
    jtoAccountState.isRefreshing,
    jtoAccountState.refresh,
    jtoAsset,
    jtoToken,
    usdcAccountState.account,
    usdcAccountState.error,
    usdcAccountState.isReady,
    usdcAccountState.isRefreshing,
    usdcAccountState.refresh,
    usdcAsset,
    usdcToken,
    vusdAccountState.account,
    vusdAccountState.error,
    vusdAccountState.isReady,
    vusdAccountState.isRefreshing,
    vusdAccountState.refresh,
    vusdAsset,
    vusdToken,
  ]);
}

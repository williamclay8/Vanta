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
  const usdcAsset = getLiveShieldTokenAsset("USDC");
  const jtoAsset = getLiveShieldTokenAsset("JTO");
  const bonkAsset = getLiveShieldTokenAsset("BONK");
  const jupAsset = getLiveShieldTokenAsset("JUP");
  const pyusdAsset = getLiveShieldTokenAsset("PYUSD");
  const wifAsset = getLiveShieldTokenAsset("WIF");
  const kmnoAsset = getLiveShieldTokenAsset("KMNO");

  const usdcAccountState = useVantaShieldAssetState({
    includeLocallyReleasedSolNotes: true,
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
  const jupAccountState = useVantaShieldAssetState({
    mintAddress: jupAsset.mintAddress,
    vaultOwner: jupAsset.vaultOwner,
  });
  const pyusdAccountState = useVantaShieldAssetState({
    mintAddress: pyusdAsset.mintAddress,
    vaultOwner: pyusdAsset.vaultOwner,
  });
  const wifAccountState = useVantaShieldAssetState({
    mintAddress: wifAsset.mintAddress,
    vaultOwner: wifAsset.vaultOwner,
  });
  const kmnoAccountState = useVantaShieldAssetState({
    mintAddress: kmnoAsset.mintAddress,
    vaultOwner: kmnoAsset.vaultOwner,
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
  const jupToken = useSplToken(jupAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const pyusdToken = useSplToken(pyusdAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const wifToken = useSplToken(wifAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const kmnoToken = useSplToken(kmnoAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });

  return useMemo(() => {
    const entries = [
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
      {
        account: jupAccountState.account,
        asset: jupAsset,
        error: jupAccountState.error,
        isReady: jupAccountState.isReady,
        isRefreshing: jupAccountState.isRefreshing,
        publicBalance: Number(jupToken.balance?.uiAmount ?? "0"),
        refresh: jupAccountState.refresh,
        token: jupToken,
      },
      {
        account: pyusdAccountState.account,
        asset: pyusdAsset,
        error: pyusdAccountState.error,
        isReady: pyusdAccountState.isReady,
        isRefreshing: pyusdAccountState.isRefreshing,
        publicBalance: Number(pyusdToken.balance?.uiAmount ?? "0"),
        refresh: pyusdAccountState.refresh,
        token: pyusdToken,
      },
      {
        account: wifAccountState.account,
        asset: wifAsset,
        error: wifAccountState.error,
        isReady: wifAccountState.isReady,
        isRefreshing: wifAccountState.isRefreshing,
        publicBalance: Number(wifToken.balance?.uiAmount ?? "0"),
        refresh: wifAccountState.refresh,
        token: wifToken,
      },
      {
        account: kmnoAccountState.account,
        asset: kmnoAsset,
        error: kmnoAccountState.error,
        isReady: kmnoAccountState.isReady,
        isRefreshing: kmnoAccountState.isRefreshing,
        publicBalance: Number(kmnoToken.balance?.uiAmount ?? "0"),
        refresh: kmnoAccountState.refresh,
        token: kmnoToken,
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
    jupAccountState.account,
    jupAccountState.error,
    jupAccountState.isReady,
    jupAccountState.isRefreshing,
    jupAccountState.refresh,
    jupAsset,
    jupToken,
    kmnoAccountState.account,
    kmnoAccountState.error,
    kmnoAccountState.isReady,
    kmnoAccountState.isRefreshing,
    kmnoAccountState.refresh,
    kmnoAsset,
    kmnoToken,
    pyusdAccountState.account,
    pyusdAccountState.error,
    pyusdAccountState.isReady,
    pyusdAccountState.isRefreshing,
    pyusdAccountState.refresh,
    pyusdAsset,
    pyusdToken,
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
    wifAccountState.account,
    wifAccountState.error,
    wifAccountState.isReady,
    wifAccountState.isRefreshing,
    wifAccountState.refresh,
    wifAsset,
    wifToken,
  ]);
}

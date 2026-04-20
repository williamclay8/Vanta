type UniversalShieldSourceAsset = {
  kind: "native" | "spl";
  mintAddress: string;
  symbol: string;
};

type UniversalShieldTargetAsset = {
  assetKey: string;
  configured: boolean;
  mintAddress: string | null;
  priority: number;
  symbol: string;
  vaultOwner: string | null;
};

type UniversalShieldTargetEntry<TAsset extends UniversalShieldTargetAsset> = {
  asset: TAsset;
};

const ROUTED_SPL_TARGET_PREFERENCE = ["USDC", "USDT", "VUSD", "SOL", "JUP", "JTO", "PYUSD"] as const;

function isExecutableTarget<TAsset extends UniversalShieldTargetAsset>(
  entry: UniversalShieldTargetEntry<TAsset>,
) {
  return Boolean(entry.asset.configured && entry.asset.mintAddress && entry.asset.vaultOwner);
}

export function selectUniversalShieldTarget<TEntry extends UniversalShieldTargetEntry<UniversalShieldTargetAsset>>({
  configuredEntries,
  sourceAsset,
}: {
  configuredEntries: readonly TEntry[];
  sourceAsset: UniversalShieldSourceAsset | null;
}): TEntry | null {
  const executableEntries = configuredEntries.filter(isExecutableTarget);

  if (!sourceAsset || executableEntries.length === 0) {
    return null;
  }

  const directMatch =
    executableEntries.find(
      (entry) =>
        entry.asset.mintAddress === sourceAsset.mintAddress ||
        entry.asset.assetKey === sourceAsset.symbol ||
        entry.asset.symbol === sourceAsset.symbol,
    ) ?? null;

  if (directMatch) {
    return directMatch;
  }

  for (const preferredAssetKey of ROUTED_SPL_TARGET_PREFERENCE) {
    const preferredEntry =
      executableEntries.find((entry) => entry.asset.assetKey === preferredAssetKey) ?? null;

    if (preferredEntry) {
      return preferredEntry;
    }
  }

  return [...executableEntries].sort((left, right) => left.asset.priority - right.asset.priority)[0] ?? null;
}

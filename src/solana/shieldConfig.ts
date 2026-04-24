export const SHIELD_HOOK_FALLBACK_MINT =
  "So11111111111111111111111111111111111111112";

function getOptionalEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getOptionalIntegerEnvValue(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

const configuredMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_DEVNET_TOKEN_MINT,
);
const configuredUsdcMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_DEVNET_USDC_MINT,
);
const configuredJtoMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_DEVNET_JTO_MINT,
);
const configuredBonkMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_DEVNET_BONK_MINT,
);
const configuredJupMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_DEVNET_JUP_MINT,
);
const configuredPyusdMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_DEVNET_PYUSD_MINT,
);
const configuredWifMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_DEVNET_WIF_MINT,
);
const configuredKmnoMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_DEVNET_KMNO_MINT,
);
const configuredVaultOwner = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_DEVNET_VAULT_OWNER,
);
const configuredUnshieldOperatorUrl = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_UNSHIELD_OPERATOR_URL,
);
const configuredSwapOperatorUrl = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_SWAP_OPERATOR_URL,
);
const configuredSolUnshieldOperatorUrl = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_SOL_UNSHIELD_OPERATOR_URL,
);
const configuredMeteoraDlmmPoolAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_METEORA_DLMM_POOL_ADDRESS,
);

const allowLocalOperatorFallback = import.meta.env.DEV;
const localUnshieldOperatorUrl = allowLocalOperatorFallback
  ? "http://127.0.0.1:8789/unshield"
  : "";
const localSwapOperatorUrl = allowLocalOperatorFallback ? "http://127.0.0.1:8789/swap" : "";
const localSolUnshieldOperatorUrl = allowLocalOperatorFallback
  ? "http://127.0.0.1:8789/unshield/sol"
  : "";
const effectiveUnshieldOperatorUrl = configuredUnshieldOperatorUrl ?? localUnshieldOperatorUrl;
const effectiveSwapOperatorUrl = configuredSwapOperatorUrl ?? localSwapOperatorUrl;
const effectiveSolUnshieldOperatorUrl =
  configuredSolUnshieldOperatorUrl ?? localSolUnshieldOperatorUrl;

export type LiveShieldTokenAssetKey =
  | "VUSD"
  | "USDC"
  | "JTO"
  | "BONK"
  | "JUP"
  | "PYUSD"
  | "WIF"
  | "KMNO";

export type LiveShieldTokenAssetConfig = {
  assetKey: LiveShieldTokenAssetKey;
  cluster: "Devnet";
  configured: boolean;
  decimals: number;
  mintAddress: string | null;
  name: string;
  priority: number;
  symbol: LiveShieldTokenAssetKey;
  unshieldConfigured: boolean;
  unshieldOperatorUrl: string;
  vaultOwner: string | null;
};

function createLiveShieldTokenAssetConfig(args: {
  assetKey: LiveShieldTokenAssetKey;
  configuredMintAddress: string | null;
  decimals: number;
  defaultName: string;
  nameEnvValue?: string;
  priority: number;
}): LiveShieldTokenAssetConfig {
  return {
    assetKey: args.assetKey,
    cluster: "Devnet",
    configured: Boolean(args.configuredMintAddress && configuredVaultOwner),
    decimals: args.decimals,
    mintAddress: args.configuredMintAddress,
    name: getOptionalEnvValue(args.nameEnvValue) ?? args.defaultName,
    priority: args.priority,
    symbol: args.assetKey,
    unshieldConfigured: Boolean(
      args.configuredMintAddress && configuredVaultOwner && effectiveUnshieldOperatorUrl,
    ),
    unshieldOperatorUrl: effectiveUnshieldOperatorUrl,
    vaultOwner: configuredVaultOwner,
  };
}

export const liveShieldAsset = {
  assetKey: "VUSD" as const,
  cluster: "Devnet" as const,
  configured: Boolean(configuredMintAddress && configuredVaultOwner),
  decimals: getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_DEVNET_TOKEN_DECIMALS) ?? 6,
  mintAddress: configuredMintAddress,
  name:
    getOptionalEnvValue(import.meta.env.VITE_VANTA_DEVNET_TOKEN_NAME) ??
    "Vanta Devnet Test Dollar",
  priority: 0,
  symbol: "VUSD" as const,
  unshieldConfigured: Boolean(
    configuredMintAddress && configuredVaultOwner && effectiveUnshieldOperatorUrl,
  ),
  unshieldOperatorUrl: effectiveUnshieldOperatorUrl,
  vaultOwner: configuredVaultOwner,
};

export const liveUsdcShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "USDC",
    configuredMintAddress: configuredUsdcMintAddress,
    decimals: getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_DEVNET_USDC_DECIMALS) ?? 6,
    defaultName: "USD Coin",
    nameEnvValue: import.meta.env.VITE_VANTA_DEVNET_USDC_NAME,
    priority: 1,
  }),
};

export const liveJtoShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "JTO",
    configuredMintAddress: configuredJtoMintAddress,
    decimals: getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_DEVNET_JTO_DECIMALS) ?? 9,
    defaultName: "Jito",
    nameEnvValue: import.meta.env.VITE_VANTA_DEVNET_JTO_NAME,
    priority: 2,
  }),
};

export const liveBonkShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "BONK",
    configuredMintAddress: configuredBonkMintAddress,
    decimals: getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_DEVNET_BONK_DECIMALS) ?? 5,
    defaultName: "Bonk",
    nameEnvValue: import.meta.env.VITE_VANTA_DEVNET_BONK_NAME,
    priority: 3,
  }),
};

export const liveJupShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "JUP",
    configuredMintAddress: configuredJupMintAddress,
    decimals: getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_DEVNET_JUP_DECIMALS) ?? 6,
    defaultName: "Jupiter",
    nameEnvValue: import.meta.env.VITE_VANTA_DEVNET_JUP_NAME,
    priority: 4,
  }),
};

export const livePyusdShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "PYUSD",
    configuredMintAddress: configuredPyusdMintAddress,
    decimals: getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_DEVNET_PYUSD_DECIMALS) ?? 6,
    defaultName: "PayPal USD",
    nameEnvValue: import.meta.env.VITE_VANTA_DEVNET_PYUSD_NAME,
    priority: 5,
  }),
};

export const liveWifShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "WIF",
    configuredMintAddress: configuredWifMintAddress,
    decimals: getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_DEVNET_WIF_DECIMALS) ?? 6,
    defaultName: "dogwifhat",
    nameEnvValue: import.meta.env.VITE_VANTA_DEVNET_WIF_NAME,
    priority: 6,
  }),
};

export const liveKmnoShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "KMNO",
    configuredMintAddress: configuredKmnoMintAddress,
    decimals: getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_DEVNET_KMNO_DECIMALS) ?? 6,
    defaultName: "Kamino",
    nameEnvValue: import.meta.env.VITE_VANTA_DEVNET_KMNO_NAME,
    priority: 7,
  }),
};

export const ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS = [
  "VUSD",
  "USDC",
  "JTO",
  "BONK",
  "JUP",
  "PYUSD",
  "WIF",
  "KMNO",
] as const satisfies readonly LiveShieldTokenAssetKey[];

const liveShieldTokenAssetMap: Record<LiveShieldTokenAssetKey, LiveShieldTokenAssetConfig> = {
  BONK: liveBonkShieldAsset,
  JTO: liveJtoShieldAsset,
  JUP: liveJupShieldAsset,
  KMNO: liveKmnoShieldAsset,
  PYUSD: livePyusdShieldAsset,
  USDC: liveUsdcShieldAsset,
  VUSD: liveShieldAsset,
  WIF: liveWifShieldAsset,
};

export function getLiveShieldTokenAsset(
  assetKey: LiveShieldTokenAssetKey,
): LiveShieldTokenAssetConfig {
  return liveShieldTokenAssetMap[assetKey];
}

export function getLiveShieldTokenAssetByMint(mintAddress: string | null | undefined) {
  if (!mintAddress) {
    return null;
  }

  return (
    listAllLiveShieldTokenAssets().find((asset) => asset.mintAddress === mintAddress) ?? null
  );
}

export function listAllLiveShieldTokenAssets() {
  return ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS.map((assetKey) => getLiveShieldTokenAsset(assetKey));
}

export function listLiveShieldTokenAssets(args?: { configuredOnly?: boolean }) {
  const configuredOnly = args?.configuredOnly ?? true;
  const assets = listAllLiveShieldTokenAssets().sort((left, right) => left.priority - right.priority);

  if (!configuredOnly) {
    return assets;
  }

  return assets.filter((asset) => asset.configured && asset.mintAddress);
}

export function getPrimaryLiveShieldTokenAsset() {
  return listLiveShieldTokenAssets()[0] ?? liveShieldAsset;
}

export function getLiveShieldTokenAssetPriority(assetKey: LiveShieldTokenAssetKey) {
  return getLiveShieldTokenAsset(assetKey).priority;
}

export const liveSwapPair = {
  cluster: "Devnet" as const,
  configured: Boolean(configuredMintAddress && configuredVaultOwner),
  inputAsset: "VUSD" as const,
  outputAsset: "SOL" as const,
  outputMintAddress: SHIELD_HOOK_FALLBACK_MINT,
  outputName: "Solana" as const,
  outputSymbol: "SOL" as const,
  operatorUrl: effectiveSwapOperatorUrl,
  solAssetId: SHIELD_HOOK_FALLBACK_MINT,
  solUnshieldOperatorUrl: effectiveSolUnshieldOperatorUrl,
  venueFamily: "DLMM" as const,
  venueName: "Meteora" as const,
  venueNetwork: "Devnet" as const,
  venuePoolAddress: configuredMeteoraDlmmPoolAddress,
};

export const SHIELD_HOOK_FALLBACK_MINT =
  "So11111111111111111111111111111111111111112";

export type VantaSolanaCluster = "mainnet-beta";
export type VantaSolanaClusterLabel = "Mainnet";

const isMainnetCluster = true;
export const vantaSolanaCluster: VantaSolanaCluster = "mainnet-beta";
export const vantaSolanaClusterLabel: VantaSolanaClusterLabel = "Mainnet";
export const vantaExplicitMainnetApproval = true;

const MAINNET_RECOGNIZED_MINTS = {
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  EURC: "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr",
  JTO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  JupUSD: "JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD",
  KMNO: "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS",
  PYUSD: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
  USD1: "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDS: "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  USX: "6FrrzDk5mQARGc1TDYoyVnSyRdds1t4PbtohCD6p3tgG",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
} as const;

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
  import.meta.env.VITE_VANTA_MAINNET_TOKEN_MINT,
);
const configuredUsdcMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_USDC_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.USDC : null);
const configuredUsdtMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_USDT_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.USDT : null);
const configuredEurcMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_EURC_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.EURC : null);
const configuredUsdsMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_USDS_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.USDS : null);
const configuredUsxMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_USX_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.USX : null);
const configuredUsd1MintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_USD1_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.USD1 : null);
const configuredJupusdMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_JUPUSD_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.JupUSD : null);
const configuredJtoMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_JTO_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.JTO : null);
const configuredBonkMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_BONK_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.BONK : null);
const configuredJupMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_JUP_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.JUP : null);
const configuredPyusdMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_PYUSD_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.PYUSD : null);
const configuredWifMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_WIF_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.WIF : null);
const configuredKmnoMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_KMNO_MINT,
) ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.KMNO : null);
const configuredVaultOwner = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_MAINNET_VAULT_OWNER,
);
const configuredVaultDerivationProgramId = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_VAULT_DERIVATION_PROGRAM_ID,
);
const configuredUnshieldOperatorUrl = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_UNSHIELD_OPERATOR_URL,
);
const configuredBonkUnshieldOperatorUrl = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_BONK_UNSHIELD_OPERATOR_URL,
);
const configuredSwapOperatorUrl = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_SWAP_OPERATOR_URL,
);
const configuredSolToShieldedSwapOperatorUrl = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_SOL_TO_SHIELDED_SWAP_OPERATOR_URL,
);
const configuredSolUnshieldOperatorUrl = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_SOL_UNSHIELD_OPERATOR_URL,
);
const configuredMeteoraDlmmPoolAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_METEORA_DLMM_POOL_ADDRESS,
);

const allowLocalOperatorFallback = import.meta.env.DEV;
const productionUnshieldOperatorUrlFallback =
  !allowLocalOperatorFallback && isMainnetCluster
    ? "https://vanta-prod-private-pool-v2-operator.onrender.com/unshield"
    : "";
const productionSolUnshieldOperatorUrlFallback =
  !allowLocalOperatorFallback && isMainnetCluster
    ? "https://vanta-prod-private-pool-v2-operator.onrender.com/unshield/sol"
    : "";
const localUnshieldOperatorUrl = allowLocalOperatorFallback
  ? "http://127.0.0.1:8789/unshield"
  : "";
const localSwapOperatorUrl = allowLocalOperatorFallback ? "http://127.0.0.1:8789/swap" : "";
const localSolUnshieldOperatorUrl = allowLocalOperatorFallback
  ? "http://127.0.0.1:8789/unshield/sol"
  : "";
const effectiveUnshieldOperatorUrl =
  configuredUnshieldOperatorUrl ||
  productionUnshieldOperatorUrlFallback ||
  localUnshieldOperatorUrl;
const effectiveBonkUnshieldOperatorUrl =
  configuredBonkUnshieldOperatorUrl ?? effectiveUnshieldOperatorUrl;
const effectiveSwapOperatorUrl = configuredSwapOperatorUrl ?? localSwapOperatorUrl;
function resolveSolUnshieldOperatorUrl(args: {
  configuredSolUnshieldOperatorUrl: string | null;
  sharedUnshieldOperatorUrl: string;
  localSolUnshieldOperatorUrl: string;
}) {
  if (args.configuredSolUnshieldOperatorUrl) {
    return args.configuredSolUnshieldOperatorUrl;
  }

  if (args.sharedUnshieldOperatorUrl) {
    return new URL("sol", `${args.sharedUnshieldOperatorUrl.replace(/\/+$/, "")}/`).toString();
  }

  return productionSolUnshieldOperatorUrlFallback || args.localSolUnshieldOperatorUrl;
}

const effectiveSolUnshieldOperatorUrl =
  resolveSolUnshieldOperatorUrl({
    configuredSolUnshieldOperatorUrl,
    localSolUnshieldOperatorUrl,
    sharedUnshieldOperatorUrl: effectiveUnshieldOperatorUrl,
  });

export type LiveShieldTokenAssetKey =
  | "USDC"
  | "USDT"
  | "EURC"
  | "USDS"
  | "USX"
  | "USD1"
  | "JupUSD"
  | "JTO"
  | "BONK"
  | "JUP"
  | "PYUSD"
  | "WIF"
  | "KMNO";

export type LiveShieldTokenAssetConfig = {
  assetKey: LiveShieldTokenAssetKey;
  cluster: VantaSolanaClusterLabel;
  configured: boolean;
  directShieldPolicy: "plain-spl-token" | "token-2022-adapter-required";
  executable: boolean;
  executionBlocker: string | null;
  decimals: number;
  mintAddress: string | null;
  name: string;
  priority: number;
  symbol: LiveShieldTokenAssetKey;
  unshieldConfigured: boolean;
  unshieldOperatorUrl: string;
  vaultOwner: string | null;
  custodyModel:
    | "operator-configured-wallet"
    | "program-derived-vault-pda-blocked"
    | "token-2022-adapter-required"
    | "unconfigured";
  productionCustodyReady: false;
};

const hasVaultOwnerPath = Boolean(configuredVaultOwner || configuredVaultDerivationProgramId);

export function isNativeSolShieldConfigured() {
  return Boolean(configuredVaultOwner);
}

export function isNativeSolUnshieldConfigured() {
  return Boolean(configuredVaultOwner && effectiveSolUnshieldOperatorUrl);
}

function createLiveShieldTokenAssetConfig(args: {
  assetKey: LiveShieldTokenAssetKey;
  configuredMintAddress: string | null;
  decimals: number;
  defaultName: string;
  directShieldPolicy?: LiveShieldTokenAssetConfig["directShieldPolicy"];
  nameEnvValue?: string;
  priority: number;
  unshieldOperatorUrl?: string;
}): LiveShieldTokenAssetConfig {
  const unshieldOperatorUrl = args.unshieldOperatorUrl ?? effectiveUnshieldOperatorUrl;
  const directShieldPolicy = args.directShieldPolicy ?? "plain-spl-token";
  const adapterRequired = directShieldPolicy === "token-2022-adapter-required";
  const custodyModel = adapterRequired
    ? "token-2022-adapter-required"
    : configuredVaultOwner
      ? "operator-configured-wallet"
      : configuredVaultDerivationProgramId
        ? "program-derived-vault-pda-blocked"
        : "unconfigured";
  const executionBlocker = adapterRequired
    ? "token-2022-adapter-required"
    : !args.configuredMintAddress
      ? "mainnet-lane-not-configured"
      : configuredVaultOwner
        ? null
        : configuredVaultDerivationProgramId
          ? "program-vault-init-release-not-deployed"
          : "mainnet-vault-owner-not-configured";

  return {
    assetKey: args.assetKey,
    cluster: vantaSolanaClusterLabel,
    configured: Boolean(args.configuredMintAddress && hasVaultOwnerPath && !adapterRequired),
    custodyModel,
    directShieldPolicy,
    executable: Boolean(args.configuredMintAddress && configuredVaultOwner && !adapterRequired),
    executionBlocker,
    decimals: args.decimals,
    mintAddress: args.configuredMintAddress,
    name: getOptionalEnvValue(args.nameEnvValue) ?? args.defaultName,
    priority: args.priority,
    productionCustodyReady: false,
    symbol: args.assetKey,
    unshieldConfigured: Boolean(
      args.configuredMintAddress && configuredVaultOwner && unshieldOperatorUrl && !adapterRequired,
    ),
    unshieldOperatorUrl,
    vaultOwner: configuredVaultOwner,
  };
}

export const liveUsdcShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "USDC",
    configuredMintAddress: configuredUsdcMintAddress,
    decimals:
      getOptionalIntegerEnvValue(
        isMainnetCluster
          ? import.meta.env.VITE_VANTA_MAINNET_USDC_DECIMALS
          : import.meta.env.VITE_VANTA_MAINNET_USDC_DECIMALS,
      ) ?? 6,
    defaultName: "USD Coin",
    nameEnvValue: isMainnetCluster
      ? import.meta.env.VITE_VANTA_MAINNET_USDC_NAME
      : import.meta.env.VITE_VANTA_MAINNET_USDC_NAME,
    priority: 1,
  }),
};

export const liveShieldAsset = liveUsdcShieldAsset;

export const liveUsdtShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "USDT",
    configuredMintAddress: configuredUsdtMintAddress,
    decimals:
      getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_MAINNET_USDT_DECIMALS) ?? 6,
    defaultName: "Tether USD",
    nameEnvValue: import.meta.env.VITE_VANTA_MAINNET_USDT_NAME,
    priority: 2,
  }),
};

export const liveEurcShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "EURC",
    configuredMintAddress: configuredEurcMintAddress,
    decimals:
      getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_MAINNET_EURC_DECIMALS) ?? 6,
    defaultName: "Euro Coin",
    nameEnvValue: import.meta.env.VITE_VANTA_MAINNET_EURC_NAME,
    priority: 3,
  }),
};

export const liveUsdsShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "USDS",
    configuredMintAddress: configuredUsdsMintAddress,
    decimals:
      getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_MAINNET_USDS_DECIMALS) ?? 6,
    defaultName: "USDS",
    nameEnvValue: import.meta.env.VITE_VANTA_MAINNET_USDS_NAME,
    priority: 4,
  }),
};

export const liveUsxShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "USX",
    configuredMintAddress: configuredUsxMintAddress,
    decimals:
      getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_MAINNET_USX_DECIMALS) ?? 6,
    defaultName: "USX",
    nameEnvValue: import.meta.env.VITE_VANTA_MAINNET_USX_NAME,
    priority: 5,
  }),
};

export const liveUsd1ShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "USD1",
    configuredMintAddress: configuredUsd1MintAddress,
    decimals:
      getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_MAINNET_USD1_DECIMALS) ?? 6,
    defaultName: "USD1",
    nameEnvValue: import.meta.env.VITE_VANTA_MAINNET_USD1_NAME,
    priority: 6,
  }),
};

export const liveJupusdShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "JupUSD",
    configuredMintAddress: configuredJupusdMintAddress,
    decimals:
      getOptionalIntegerEnvValue(import.meta.env.VITE_VANTA_MAINNET_JUPUSD_DECIMALS) ?? 6,
    defaultName: "Jupiter USD",
    nameEnvValue: import.meta.env.VITE_VANTA_MAINNET_JUPUSD_NAME,
    priority: 7,
  }),
};

export const liveJtoShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "JTO",
    configuredMintAddress: configuredJtoMintAddress,
    decimals:
      getOptionalIntegerEnvValue(
        isMainnetCluster
          ? import.meta.env.VITE_VANTA_MAINNET_JTO_DECIMALS
          : import.meta.env.VITE_VANTA_MAINNET_JTO_DECIMALS,
      ) ?? 9,
    defaultName: "Jito",
    nameEnvValue: isMainnetCluster
      ? import.meta.env.VITE_VANTA_MAINNET_JTO_NAME
      : import.meta.env.VITE_VANTA_MAINNET_JTO_NAME,
    priority: 20,
  }),
};

export const liveBonkShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "BONK",
    configuredMintAddress: configuredBonkMintAddress,
    decimals:
      getOptionalIntegerEnvValue(
        isMainnetCluster
          ? import.meta.env.VITE_VANTA_MAINNET_BONK_DECIMALS
          : import.meta.env.VITE_VANTA_MAINNET_BONK_DECIMALS,
      ) ?? 5,
    defaultName: "Bonk",
    nameEnvValue: isMainnetCluster
      ? import.meta.env.VITE_VANTA_MAINNET_BONK_NAME
      : import.meta.env.VITE_VANTA_MAINNET_BONK_NAME,
    priority: 21,
    unshieldOperatorUrl: effectiveBonkUnshieldOperatorUrl,
  }),
};

export const liveJupShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "JUP",
    configuredMintAddress: configuredJupMintAddress,
    decimals:
      getOptionalIntegerEnvValue(
        isMainnetCluster
          ? import.meta.env.VITE_VANTA_MAINNET_JUP_DECIMALS
          : import.meta.env.VITE_VANTA_MAINNET_JUP_DECIMALS,
      ) ?? 6,
    defaultName: "Jupiter",
    nameEnvValue: isMainnetCluster
      ? import.meta.env.VITE_VANTA_MAINNET_JUP_NAME
      : import.meta.env.VITE_VANTA_MAINNET_JUP_NAME,
    priority: 22,
  }),
};

export const livePyusdShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "PYUSD",
    configuredMintAddress: configuredPyusdMintAddress,
    decimals:
      getOptionalIntegerEnvValue(
        isMainnetCluster
          ? import.meta.env.VITE_VANTA_MAINNET_PYUSD_DECIMALS
          : import.meta.env.VITE_VANTA_MAINNET_PYUSD_DECIMALS,
      ) ?? 6,
    defaultName: "PayPal USD",
    directShieldPolicy: "token-2022-adapter-required",
    nameEnvValue: isMainnetCluster
      ? import.meta.env.VITE_VANTA_MAINNET_PYUSD_NAME
      : import.meta.env.VITE_VANTA_MAINNET_PYUSD_NAME,
    priority: 30,
  }),
};

export const liveWifShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "WIF",
    configuredMintAddress: configuredWifMintAddress,
    decimals:
      getOptionalIntegerEnvValue(
        isMainnetCluster
          ? import.meta.env.VITE_VANTA_MAINNET_WIF_DECIMALS
          : import.meta.env.VITE_VANTA_MAINNET_WIF_DECIMALS,
      ) ?? 6,
    defaultName: "dogwifhat",
    nameEnvValue: isMainnetCluster
      ? import.meta.env.VITE_VANTA_MAINNET_WIF_NAME
      : import.meta.env.VITE_VANTA_MAINNET_WIF_NAME,
    priority: 23,
  }),
};

export const liveKmnoShieldAsset: LiveShieldTokenAssetConfig = {
  ...createLiveShieldTokenAssetConfig({
    assetKey: "KMNO",
    configuredMintAddress: configuredKmnoMintAddress,
    decimals:
      getOptionalIntegerEnvValue(
        isMainnetCluster
          ? import.meta.env.VITE_VANTA_MAINNET_KMNO_DECIMALS
          : import.meta.env.VITE_VANTA_MAINNET_KMNO_DECIMALS,
      ) ?? 6,
    defaultName: "Kamino",
    nameEnvValue: isMainnetCluster
      ? import.meta.env.VITE_VANTA_MAINNET_KMNO_NAME
      : import.meta.env.VITE_VANTA_MAINNET_KMNO_NAME,
    priority: 24,
  }),
};

export const ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS = [
  "USDC",
  "USDT",
  "EURC",
  "USDS",
  "USX",
  "USD1",
  "JupUSD",
  "JTO",
  "BONK",
  "JUP",
  "PYUSD",
  "WIF",
  "KMNO",
] as const satisfies readonly LiveShieldTokenAssetKey[];

const liveShieldTokenAssetMap: Record<LiveShieldTokenAssetKey, LiveShieldTokenAssetConfig> = {
  BONK: liveBonkShieldAsset,
  EURC: liveEurcShieldAsset,
  JTO: liveJtoShieldAsset,
  JUP: liveJupShieldAsset,
  JupUSD: liveJupusdShieldAsset,
  KMNO: liveKmnoShieldAsset,
  PYUSD: livePyusdShieldAsset,
  USD1: liveUsd1ShieldAsset,
  USDC: liveUsdcShieldAsset,
  USDS: liveUsdsShieldAsset,
  USDT: liveUsdtShieldAsset,
  USX: liveUsxShieldAsset,
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
  cluster: vantaSolanaClusterLabel,
  configured: Boolean(liveShieldAsset.mintAddress && configuredVaultOwner && effectiveSwapOperatorUrl),
  inputAsset: "USDC" as const,
  outputAsset: "SOL" as const,
  outputMintAddress: SHIELD_HOOK_FALLBACK_MINT,
  outputName: "Solana" as const,
  outputSymbol: "SOL" as const,
  operatorUrl: effectiveSwapOperatorUrl,
  solAssetId: SHIELD_HOOK_FALLBACK_MINT,
  solUnshieldOperatorUrl: effectiveSolUnshieldOperatorUrl,
  venueFamily: "DLMM" as const,
  venueName: "Meteora" as const,
  venueNetwork: vantaSolanaClusterLabel,
  venuePoolAddress: configuredMeteoraDlmmPoolAddress,
};

export const liveSolToShieldedSwapRouteAdapter = {
  configured: Boolean(configuredSolToShieldedSwapOperatorUrl),
  inputAsset: "SOL" as const,
  operatorUrl: configuredSolToShieldedSwapOperatorUrl,
  supportedOutputAssets: listLiveShieldTokenAssets()
    .filter((asset) => Boolean(asset.configured && asset.mintAddress && asset.vaultOwner))
    .map((asset) => asset.assetKey),
};

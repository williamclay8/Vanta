export const SHIELD_HOOK_FALLBACK_MINT =
  "So11111111111111111111111111111111111111112";

function getOptionalEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const configuredMintAddress = getOptionalEnvValue(
  import.meta.env.VITE_VANTA_DEVNET_TOKEN_MINT,
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

export const liveShieldAsset = {
  assetKey: "VUSD" as const,
  cluster: "Devnet" as const,
  configured: Boolean(configuredMintAddress && configuredVaultOwner),
  mintAddress: configuredMintAddress,
  name:
    getOptionalEnvValue(import.meta.env.VITE_VANTA_DEVNET_TOKEN_NAME) ??
    "Vanta Devnet Test Dollar",
  symbol: "VUSD" as const,
  unshieldConfigured: Boolean(configuredMintAddress && configuredVaultOwner),
  unshieldOperatorUrl:
    configuredUnshieldOperatorUrl ?? "http://127.0.0.1:8789/unshield",
  vaultOwner: configuredVaultOwner,
};

export const liveSwapPair = {
  cluster: "Devnet" as const,
  configured: Boolean(configuredMintAddress && configuredVaultOwner),
  inputAsset: "VUSD" as const,
  outputAsset: "SOL" as const,
  outputMintAddress: SHIELD_HOOK_FALLBACK_MINT,
  outputName: "Solana" as const,
  outputSymbol: "SOL" as const,
  operatorUrl: configuredSwapOperatorUrl ?? "http://127.0.0.1:8789/swap",
  solAssetId: SHIELD_HOOK_FALLBACK_MINT,
  solUnshieldOperatorUrl:
    configuredSolUnshieldOperatorUrl ?? "http://127.0.0.1:8789/unshield/sol",
  venueFamily: "DLMM" as const,
  venueName: "Meteora" as const,
  venueNetwork: "Devnet" as const,
  venuePoolAddress: configuredMeteoraDlmmPoolAddress,
};

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

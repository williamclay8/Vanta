import { PublicKey } from "@solana/web3.js";

export const NATIVE_SOL_VAULT_PDA_ASSET_ID_SENTINEL_HEX =
  "0000000000000000000000000000000000000000000000000000000000000000" as const;

export const VANTA_PRIVATE_POOL_V2_VAULT_PDA_DERIVATION_VERSION =
  "vanta-private-pool-v2-vault-pda-derivation-0.1" as const;

export const VANTA_PRIVATE_POOL_V2_VAULT_ASSET_SEED = "vanta2asset" as const;
export const VANTA_PRIVATE_POOL_V2_SPL_VAULT_AUTHORITY_SEED = "vanta2vault" as const;
export const VANTA_PRIVATE_POOL_V2_SOL_VAULT_HOLDING_SEED = "vanta2solvault" as const;

export type VantaPrivatePoolV2VaultPdaDerivationInput = {
  assetIdHex?: string;
  poolState: string;
  programId: string;
};

export type VantaPrivatePoolV2VaultPdaBundle = {
  assetIdHex: string;
  poolState: string;
  programId: string;
  solVaultHolding: {
    address: string;
    bump: number;
    seeds: readonly string[];
  };
  splVaultAuthority: {
    address: string;
    bump: number;
    seeds: readonly string[];
  };
  vaultAssetRegistry: {
    address: string;
    bump: number;
    seeds: readonly string[];
  };
  version: typeof VANTA_PRIVATE_POOL_V2_VAULT_PDA_DERIVATION_VERSION;
};

function requirePublicKey(value: string, label: string) {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`Vanta Private Pool v2 vault PDA derivation requires valid ${label}.`);
  }
}

function utf8Seed(value: string) {
  return new TextEncoder().encode(value);
}

function hexToBytes(hex: string) {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function assetIdBytes(assetIdHex: string = NATIVE_SOL_VAULT_PDA_ASSET_ID_SENTINEL_HEX) {
  const hex = assetIdHex.startsWith("0x") ? assetIdHex.slice(2) : assetIdHex;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("Vanta Private Pool v2 vault PDA derivation requires a 32-byte asset id hex.");
  }
  return hexToBytes(hex);
}

export function deriveVantaPrivatePoolV2VaultAssetRegistryPda(
  input: VantaPrivatePoolV2VaultPdaDerivationInput,
) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  const assetId = assetIdBytes(input.assetIdHex);
  const [address, bump] = PublicKey.findProgramAddressSync(
    [utf8Seed(VANTA_PRIVATE_POOL_V2_VAULT_ASSET_SEED), poolState.toBuffer(), assetId],
    programId,
  );
  return { address: address.toBase58(), bump };
}

export function deriveVantaPrivatePoolV2SolVaultHoldingPda(
  input: VantaPrivatePoolV2VaultPdaDerivationInput,
) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  const assetId = assetIdBytes(input.assetIdHex);
  const [address, bump] = PublicKey.findProgramAddressSync(
    [
      utf8Seed(VANTA_PRIVATE_POOL_V2_SOL_VAULT_HOLDING_SEED),
      poolState.toBuffer(),
      assetId,
    ],
    programId,
  );
  return { address: address.toBase58(), bump };
}

export function deriveVantaPrivatePoolV2SplVaultAuthorityPda(
  input: VantaPrivatePoolV2VaultPdaDerivationInput,
) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  const assetId = assetIdBytes(input.assetIdHex);
  const [address, bump] = PublicKey.findProgramAddressSync(
    [
      utf8Seed(VANTA_PRIVATE_POOL_V2_SPL_VAULT_AUTHORITY_SEED),
      poolState.toBuffer(),
      assetId,
    ],
    programId,
  );
  return { address: address.toBase58(), bump };
}

export function deriveVantaPrivatePoolV2VaultPdaBundle(
  input: VantaPrivatePoolV2VaultPdaDerivationInput,
): VantaPrivatePoolV2VaultPdaBundle {
  const assetIdHex = input.assetIdHex ?? NATIVE_SOL_VAULT_PDA_ASSET_ID_SENTINEL_HEX;
  const poolState = requirePublicKey(input.poolState, "poolState").toBase58();
  const programId = requirePublicKey(input.programId, "programId").toBase58();
  const vaultAssetRegistry = deriveVantaPrivatePoolV2VaultAssetRegistryPda(input);
  const solVaultHolding = deriveVantaPrivatePoolV2SolVaultHoldingPda(input);
  const splVaultAuthority = deriveVantaPrivatePoolV2SplVaultAuthorityPda(input);

  return {
    version: VANTA_PRIVATE_POOL_V2_VAULT_PDA_DERIVATION_VERSION,
    assetIdHex,
    poolState,
    programId,
    vaultAssetRegistry: {
      address: vaultAssetRegistry.address,
      bump: vaultAssetRegistry.bump,
      seeds: [VANTA_PRIVATE_POOL_V2_VAULT_ASSET_SEED, poolState, assetIdHex],
    },
    solVaultHolding: {
      address: solVaultHolding.address,
      bump: solVaultHolding.bump,
      seeds: [VANTA_PRIVATE_POOL_V2_SOL_VAULT_HOLDING_SEED, poolState, assetIdHex],
    },
    splVaultAuthority: {
      address: splVaultAuthority.address,
      bump: splVaultAuthority.bump,
      seeds: [VANTA_PRIVATE_POOL_V2_SPL_VAULT_AUTHORITY_SEED, poolState, assetIdHex],
    },
  };
}

export function getVantaPrivatePoolV2VaultPdaPolicy() {
  return {
    version: VANTA_PRIVATE_POOL_V2_VAULT_PDA_DERIVATION_VERSION,
    productionCustodyReady: false,
    programOwnedVaultReady: false,
    privacyClaimAllowed: false,
    nativeSolAssetIdSentinel: NATIVE_SOL_VAULT_PDA_ASSET_ID_SENTINEL_HEX,
    guardCommand: "npm run private-pool-v2:vault-pda-derivation-check",
    truthBoundary:
      "Typed PDA derivation matches spend-program seeds. Production custody remains blocked until TAG_SHIELD/TAG_UNSHIELD release from program-owned vaults is live with reviewed evidence.",
  };
}

import { PublicKey } from "@solana/web3.js";

export type UserVaultOwnerResolution =
  | {
      kind: "configured";
      liveDepositEnabled: true;
      vaultOwner: string;
    }
  | {
      blocker: string;
      kind: "derived-pda";
      liveDepositEnabled: false;
      programId: string;
      vaultOwner: string;
    }
  | {
      blocker: string;
      kind: "unavailable";
      liveDepositEnabled: false;
      vaultOwner: null;
    };

const USER_VAULT_SEED_PREFIX = "vanta";
const USER_VAULT_SEED_SCOPE = "shield-vault";

function optionalEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const configuredUserVaultDerivationProgramId = optionalEnvValue(
  import.meta.env.VITE_VANTA_VAULT_DERIVATION_PROGRAM_ID,
);

export function deriveUserVaultOwner(args: {
  programId: string;
  walletAddress: string;
}) {
  const [vaultOwner] = PublicKey.findProgramAddressSync(
    [
      new TextEncoder().encode(USER_VAULT_SEED_PREFIX),
      new TextEncoder().encode(USER_VAULT_SEED_SCOPE),
      new PublicKey(args.walletAddress).toBuffer(),
    ],
    new PublicKey(args.programId),
  );

  return vaultOwner.toBase58();
}

export function resolveUserVaultOwner(args: {
  configuredVaultOwner: string | null;
  walletAddress: string | null;
}): UserVaultOwnerResolution {
  if (args.configuredVaultOwner) {
    return {
      kind: "configured",
      liveDepositEnabled: true,
      vaultOwner: args.configuredVaultOwner,
    };
  }

  if (!configuredUserVaultDerivationProgramId) {
    return {
      blocker: "No mainnet vault owner is configured.",
      kind: "unavailable",
      liveDepositEnabled: false,
      vaultOwner: null,
    };
  }

  if (!args.walletAddress) {
    return {
      blocker: "Connect a wallet to derive a user vault.",
      kind: "unavailable",
      liveDepositEnabled: false,
      vaultOwner: null,
    };
  }

  return {
    blocker:
      "User vault derivation is configured, but live deposits need a deployed vault init/release program before funds can be sent safely.",
    kind: "derived-pda",
    liveDepositEnabled: false,
    programId: configuredUserVaultDerivationProgramId,
    vaultOwner: deriveUserVaultOwner({
      programId: configuredUserVaultDerivationProgramId,
      walletAddress: args.walletAddress,
    }),
  };
}

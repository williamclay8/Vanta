import { PublicKey } from "@solana/web3.js";

export type UserVaultOwnerResolution =
  | {
      custodyModel: "operator-configured-wallet";
      kind: "configured";
      liveDepositEnabled: true;
      productionCustodyReady: false;
      productionCustodyBlocker: "program-owned-vault-pda-not-deployed";
      vaultOwner: string;
    }
  | {
      blocker: string;
      custodyModel: "program-derived-vault-pda-blocked";
      kind: "derived-pda";
      liveDepositEnabled: false;
      productionCustodyReady: false;
      programId: string;
      vaultOwner: string;
    }
  | {
      blocker: string;
      custodyModel: "unconfigured";
      kind: "unavailable";
      liveDepositEnabled: false;
      productionCustodyReady: false;
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
      custodyModel: "operator-configured-wallet",
      kind: "configured",
      liveDepositEnabled: true,
      productionCustodyBlocker: "program-owned-vault-pda-not-deployed",
      productionCustodyReady: false,
      vaultOwner: args.configuredVaultOwner,
    };
  }

  if (!configuredUserVaultDerivationProgramId) {
    return {
      blocker: "No mainnet vault owner is configured.",
      custodyModel: "unconfigured",
      kind: "unavailable",
      liveDepositEnabled: false,
      productionCustodyReady: false,
      vaultOwner: null,
    };
  }

  if (!args.walletAddress) {
    return {
      blocker: "Connect a wallet to derive a user vault.",
      custodyModel: "unconfigured",
      kind: "unavailable",
      liveDepositEnabled: false,
      productionCustodyReady: false,
      vaultOwner: null,
    };
  }

  return {
    blocker:
      "User vault derivation is configured, but live deposits need a deployed vault init/release program before funds can be sent safely.",
    custodyModel: "program-derived-vault-pda-blocked",
    kind: "derived-pda",
    liveDepositEnabled: false,
    productionCustodyReady: false,
    programId: configuredUserVaultDerivationProgramId,
    vaultOwner: deriveUserVaultOwner({
      programId: configuredUserVaultDerivationProgramId,
      walletAddress: args.walletAddress,
    }),
  };
}

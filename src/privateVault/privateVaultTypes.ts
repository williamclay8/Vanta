export type PrivateVaultRecord = {
  vaultId: string;
  createdAt: string;
  custody: "browser-generated" | "imported";
  derivationVersion: "v1";
  encryptedPayload: string;
  recoveryFileVersion: "vanta-private-vault-recovery-v1";
  status: "locked" | "unlocked" | "recovery-required";
  capabilityLabels: string[];
};

export type ActiveWalletTopology = {
  fundingWallet: {
    kind: "connected-wallet";
    address: string | null;
    connected: boolean;
  };
  privateVault: {
    vaultId: string;
    status: "locked" | "unlocked" | "missing";
  } | null;
};

export type PrivateVaultSessionState = {
  privateModeEnabled: boolean;
  vaultReady: boolean;
  vaultRecoveryDownloaded: boolean;
  vaultUnlocked: boolean;
  oneClickPromptEligible: boolean;
};

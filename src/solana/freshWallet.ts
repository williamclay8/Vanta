import { Keypair } from "@solana/web3.js";

const RECOVERY_FILE_VERSION = "vanta-fresh-wallet-recovery-v1";

export type FreshWalletRecord = {
  publicAddress: string;
  publicAddressShort: string;
  createdAt: string;
  recoveryFileName: string;
  recoveryFileContents: string;
};

function abbreviateAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function normalizeFileTimestamp(timestamp: string) {
  return timestamp.replace(/[:.]/g, "-");
}

export function createFreshWalletRecord(clusterLabel: string): FreshWalletRecord {
  const keypair = Keypair.generate();
  const publicAddress = keypair.publicKey.toBase58();
  const createdAt = new Date().toISOString();
  const recovery = {
    version: RECOVERY_FILE_VERSION,
    createdAt,
    clusterLabel,
    publicAddress,
    keyFormat: "solana-keypair-secret-key-byte-array",
    secretKey: Array.from(keypair.secretKey),
    warning:
      "This recovery file controls the wallet. Keep it offline, never upload it, and import it into a wallet app only when you are ready to sign.",
  };

  return {
    publicAddress,
    publicAddressShort: abbreviateAddress(publicAddress),
    createdAt,
    recoveryFileName: `vanta-fresh-wallet-${publicAddress.slice(0, 8)}-${normalizeFileTimestamp(createdAt)}.json`,
    recoveryFileContents: JSON.stringify(recovery, null, 2),
  };
}

export function exportFreshWalletRecoveryFile(wallet: FreshWalletRecord) {
  const blob = new Blob([wallet.recoveryFileContents], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = wallet.recoveryFileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

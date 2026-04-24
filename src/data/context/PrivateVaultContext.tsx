import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { encryptPrivateVaultPayload } from "@/privateVault/privateVaultCrypto";
import { createPrivateVaultRecoveryFile } from "@/privateVault/privateVaultRecovery";
import { loadPrivateVaultRecord, savePrivateVaultRecord } from "@/privateVault/privateVaultStorage";
import type {
  ActiveWalletTopology,
  PrivateVaultRecord,
  PrivateVaultSessionState,
} from "@/privateVault/privateVaultTypes";

type PrivateVaultContextValue = {
  privateModeEnabled: boolean;
  vaultRecord: PrivateVaultRecord | null;
  activeWalletTopology: ActiveWalletTopology;
  sessionState: PrivateVaultSessionState;
  enablePrivateMode: () => void;
  disablePrivateMode: () => void;
  createPrivateVault: (password: string) => Promise<void>;
  downloadPrivateVaultRecoveryFile: () => void;
};

const PrivateVaultContext = createContext<PrivateVaultContextValue | null>(null);

const PRIVATE_VAULT_CAPABILITY_LABELS = [
  "Encrypted on this device",
  "Recovery file required",
  "Funds still originate from a connected wallet",
] as const;

function getInitialVaultRecord() {
  const result = loadPrivateVaultRecord();
  return result.kind === "success" ? result.record : null;
}

function createPrivateVaultId() {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return randomUuid ?? `private-vault-${Date.now()}`;
}

function downloadRecoveryFile(fileName: string, contents: string) {
  if (typeof document === "undefined") {
    return;
  }

  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function PrivateVaultProvider({ children }: { children: ReactNode }) {
  const { connected: walletConnected, wallet } = useWalletConnection();
  const walletAddress = wallet?.account.address?.toString() ?? null;
  const [vaultRecord, setVaultRecord] = useState<PrivateVaultRecord | null>(
    () => getInitialVaultRecord(),
  );
  const [privateModeEnabled, setPrivateModeEnabled] = useState(
    () => getInitialVaultRecord() !== null,
  );
  const [vaultRecoveryDownloaded, setVaultRecoveryDownloaded] = useState(false);

  const activeWalletTopology = useMemo<ActiveWalletTopology>(
    () => ({
      fundingWallet: {
        kind: "connected-wallet",
        address: walletAddress,
        connected: walletConnected,
      },
      privateVault: vaultRecord
        ? {
            vaultId: vaultRecord.vaultId,
            status: vaultRecord.status === "unlocked" ? "unlocked" : "locked",
          }
        : null,
    }),
    [vaultRecord, walletAddress, walletConnected],
  );

  const sessionState = useMemo<PrivateVaultSessionState>(
    () => ({
      privateModeEnabled,
      vaultReady: vaultRecord !== null,
      vaultRecoveryDownloaded,
      vaultUnlocked: vaultRecord?.status === "unlocked",
      oneClickPromptEligible:
        privateModeEnabled &&
        walletConnected &&
        walletAddress !== null &&
        vaultRecord !== null &&
        vaultRecoveryDownloaded,
    }),
    [
      privateModeEnabled,
      vaultRecord,
      vaultRecoveryDownloaded,
      walletAddress,
      walletConnected,
    ],
  );

  const value = useMemo<PrivateVaultContextValue>(
    () => ({
      privateModeEnabled,
      vaultRecord,
      activeWalletTopology,
      sessionState,
      enablePrivateMode: () => {
        setPrivateModeEnabled(true);
      },
      disablePrivateMode: () => {
        setPrivateModeEnabled(false);
      },
      createPrivateVault: async (password: string) => {
        const createdAt = new Date().toISOString();
        const vaultId = createPrivateVaultId();
        const encryptedPayload = await encryptPrivateVaultPayload(
          JSON.stringify({
            vaultId,
            createdAt,
            fundingWalletAddress: walletAddress,
          }),
          password,
        );
        const nextVaultRecord: PrivateVaultRecord = {
          vaultId,
          createdAt,
          custody: "browser-generated",
          derivationVersion: "v1",
          encryptedPayload,
          recoveryFileVersion: "vanta-private-vault-recovery-v1",
          status: "locked",
          capabilityLabels: [...PRIVATE_VAULT_CAPABILITY_LABELS],
        };
        const saveResult = savePrivateVaultRecord(nextVaultRecord);

        if (saveResult.kind !== "saved") {
          throw new Error(`Private vault record could not be persisted: ${saveResult.kind}`);
        }

        setVaultRecord(nextVaultRecord);
        setPrivateModeEnabled(true);
        setVaultRecoveryDownloaded(false);
      },
      downloadPrivateVaultRecoveryFile: () => {
        if (!vaultRecord) {
          return;
        }

        downloadRecoveryFile(
          `${vaultRecord.vaultId}-recovery.json`,
          createPrivateVaultRecoveryFile(vaultRecord),
        );
        setVaultRecoveryDownloaded(true);
      },
    }),
    [activeWalletTopology, privateModeEnabled, sessionState, vaultRecord, walletAddress],
  );

  return <PrivateVaultContext.Provider value={value}>{children}</PrivateVaultContext.Provider>;
}

export function usePrivateVaultState() {
  const context = useContext(PrivateVaultContext);

  if (!context) {
    throw new Error("usePrivateVaultState must be used within PrivateVaultProvider");
  }

  return context;
}

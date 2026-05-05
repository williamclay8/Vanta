import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useBalance, useWalletConnection } from "@solana/react-hooks";
import type { WalletConnector } from "@solana/client";
import type { ActiveWalletTopology } from "@/privateVault/privateVaultTypes";
import { readRpcFallbackEndpoints, solanaClusterLabel } from "@/solana/client";
import {
  createFreshWalletRecord,
  exportFreshWalletRecoveryFile,
  type FreshWalletRecord,
} from "@/solana/freshWallet";

export type ConnectedWalletTopologyState = ActiveWalletTopology["fundingWallet"];

type WalletContextValue = {
  walletAddress: string | null;
  walletAddressShort: string | null;
  walletConnected: boolean;
  walletConnecting: boolean;
  walletReady: boolean;
  walletStatus: string;
  currentConnectorName: string | null;
  preferredWalletConnector: WalletConnector | null;
  walletConnectors: readonly WalletConnector[];
  connectWallet: (connectorId: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  connectedWalletTopology: ConnectedWalletTopologyState;
  freshWalletAddress: string | null;
  freshWalletAddressShort: string | null;
  freshWalletCreatedAt: string | null;
  freshWalletRecoveryFileName: string | null;
  createFreshWallet: () => FreshWalletRecord;
  downloadFreshWalletRecoveryFile: () => void;
  clearFreshWallet: () => void;
  lamportsBalance: bigint | null;
  solBalance: number | null;
  solBalanceError: string | null;
  solBalanceFetching: boolean;
  balanceFetching: boolean;
  clusterLabel: string;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function abbreviateAddress(address: string | null) {
  if (!address) {
    return null;
  }

  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function getConnectorPreferenceScore(connector: WalletConnector) {
  const normalizedId = connector.id.toLowerCase();
  const normalizedName = connector.name.toLowerCase();

  if (normalizedId.includes("phantom") || normalizedName.includes("phantom")) {
    return 0;
  }

  if (normalizedId.includes("solflare") || normalizedName.includes("solflare")) {
    return 1;
  }

  if (normalizedId.includes("backpack") || normalizedName.includes("backpack")) {
    return 2;
  }

  return 10;
}

function pickPreferredWalletConnector(connectors: readonly WalletConnector[]) {
  if (connectors.length === 0) {
    return null;
  }

  return [...connectors].sort((left, right) => {
    const scoreDifference =
      getConnectorPreferenceScore(left) - getConnectorPreferenceScore(right);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.name.localeCompare(right.name);
  })[0];
}

const walletBalanceFallbackConnections = new Map<string, Connection>();
const walletBalanceRetryDelaysMs = [250, 750, 1_500] as const;
function getConfiguredWalletBalanceReadEndpoints() {
  return readRpcFallbackEndpoints;
}

function getWalletBalanceFallbackConnection(fallbackEndpoint: string) {
  const cachedConnection = walletBalanceFallbackConnections.get(fallbackEndpoint);

  if (cachedConnection) {
    return cachedConnection;
  }

  const connection = new Connection(fallbackEndpoint, "confirmed");
  walletBalanceFallbackConnections.set(fallbackEndpoint, connection);

  return connection;
}

function waitForWalletBalanceRetry(delayMs: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

async function fetchWalletLamportsFallback(address: string) {
  const publicKey = new PublicKey(address);
  let firstZeroBalance: bigint | null = null;
  let lastError: unknown = null;

  for (const retryDelayMs of [0, ...walletBalanceRetryDelaysMs]) {
    if (retryDelayMs > 0) {
      await waitForWalletBalanceRetry(retryDelayMs);
    }

    for (const fallbackEndpoint of getConfiguredWalletBalanceReadEndpoints()) {
      try {
        const nextBalance = BigInt(
          await getWalletBalanceFallbackConnection(fallbackEndpoint).getBalance(
            publicKey,
            "confirmed",
          ),
        );

        if (nextBalance > 0n) {
          return nextBalance;
        }

        firstZeroBalance ??= nextBalance;
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (firstZeroBalance !== null) {
    return firstZeroBalance;
  }

  throw lastError ?? new Error("Wallet SOL balance could not be loaded.");
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [freshWallet, setFreshWallet] = useState<FreshWalletRecord | null>(null);
  const [fallbackLamportsValue, setFallbackLamportsValue] = useState<bigint | null>(null);
  const [fallbackBalanceError, setFallbackBalanceError] = useState<string | null>(null);
  const [fallbackBalanceFetching, setFallbackBalanceFetching] = useState(false);
  const {
    connect,
    connected,
    connecting,
    connectors,
    currentConnector,
    disconnect,
    isReady,
    status,
    wallet,
  } = useWalletConnection();
  const address = wallet?.account.address?.toString() ?? null;
  const balance = useBalance(address ?? undefined);
  const hookLamportsValue =
    typeof balance.lamports === "bigint" ? balance.lamports : null;
  const shouldVerifyHookZeroBalance = hookLamportsValue === 0n;
  const lamportsValue =
    fallbackLamportsValue ??
    (fallbackBalanceFetching && shouldVerifyHookZeroBalance ? null : hookLamportsValue);
  const solBalance =
    lamportsValue !== null ? Number(lamportsValue) / 1_000_000_000 : null;

  useEffect(() => {
    if (!address) {
      setFallbackLamportsValue(null);
      setFallbackBalanceError(null);
      setFallbackBalanceFetching(false);
      return;
    }

    if (hookLamportsValue !== null && hookLamportsValue > 0n) {
      setFallbackLamportsValue(null);
      setFallbackBalanceError(null);
      setFallbackBalanceFetching(false);
      return;
    }

    let cancelled = false;
    setFallbackLamportsValue(null);
    setFallbackBalanceFetching(true);
    setFallbackBalanceError(null);

    fetchWalletLamportsFallback(address)
      .then((nextLamportsValue) => {
        if (!cancelled) {
          setFallbackLamportsValue(nextLamportsValue);
          setFallbackBalanceError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFallbackLamportsValue(null);
          setFallbackBalanceError("Wallet SOL balance could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFallbackBalanceFetching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, hookLamportsValue]);
  const preferredWalletConnector = useMemo(
    () => pickPreferredWalletConnector(connectors),
    [connectors],
  );
  const connectedWalletTopology = useMemo<ConnectedWalletTopologyState>(
    () => ({
      kind: "connected-wallet",
      address,
      connected,
    }),
    [address, connected],
  );

  const value = useMemo(
    () => ({
      walletAddress: address,
      walletAddressShort: abbreviateAddress(address),
      walletConnected: connected,
      walletConnecting: connecting,
      walletReady: isReady,
      walletStatus: status,
      currentConnectorName: currentConnector?.name ?? null,
      preferredWalletConnector,
      walletConnectors: connectors,
      connectedWalletTopology,
      connectWallet: async (connectorId: string) => {
        await connect(connectorId);
      },
      disconnectWallet: async () => {
        await disconnect();
      },
      freshWalletAddress: freshWallet?.publicAddress ?? null,
      freshWalletAddressShort: freshWallet?.publicAddressShort ?? null,
      freshWalletCreatedAt: freshWallet?.createdAt ?? null,
      freshWalletRecoveryFileName: freshWallet?.recoveryFileName ?? null,
      createFreshWallet: () => {
        const nextFreshWallet = createFreshWalletRecord(solanaClusterLabel);
        setFreshWallet(nextFreshWallet);
        return nextFreshWallet;
      },
      downloadFreshWalletRecoveryFile: () => {
        if (freshWallet) {
          exportFreshWalletRecoveryFile(freshWallet);
        }
      },
      clearFreshWallet: () => {
        setFreshWallet(null);
      },
      lamportsBalance: lamportsValue,
      solBalance,
      solBalanceError: fallbackBalanceError,
      solBalanceFetching: fallbackBalanceFetching,
      balanceFetching: balance.fetching || fallbackBalanceFetching,
      clusterLabel: solanaClusterLabel,
    }),
    [
      address,
      balance.fetching,
      connect,
      connectedWalletTopology,
      connected,
      connecting,
      connectors,
      currentConnector?.name,
      disconnect,
      freshWallet,
      fallbackBalanceFetching,
      fallbackBalanceError,
      isReady,
      lamportsValue,
      preferredWalletConnector,
      solBalance,
      status,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWalletState() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWalletState must be used within WalletProvider");
  }

  return context;
}

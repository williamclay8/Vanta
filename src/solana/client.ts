import { autoDiscover, createClient, type WalletConnector } from "@solana/client";

const configuredSolanaCluster = import.meta.env.VITE_SOLANA_CLUSTER?.trim();
const effectiveSolanaCluster = configuredSolanaCluster === "mainnet" ? "mainnet-beta" : "mainnet-beta";
const defaultSolanaRpcEndpoint = "https://api.mainnet-beta.solana.com";

export const endpoint =
  import.meta.env.VITE_SOLANA_BROWSER_RPC_URL ??
  defaultSolanaRpcEndpoint;

export const websocketEndpoint =
  import.meta.env.VITE_SOLANA_BROWSER_WS_URL ??
  endpoint.replace("https://", "wss://").replace("http://", "ws://");

export function discoverWalletConnectors() {
  return autoDiscover();
}

export function createSolanaClient(
  walletConnectors: readonly WalletConnector[] = discoverWalletConnectors(),
) {
  return createClient({
    endpoint,
    websocketEndpoint,
    walletConnectors,
  });
}

export const solanaClusterLabel = "Mainnet";

import { autoDiscover, createClient, type WalletConnector } from "@solana/client";

const configuredSolanaCluster = import.meta.env.VITE_SOLANA_CLUSTER?.trim();
const effectiveSolanaCluster = configuredSolanaCluster || (import.meta.env.PROD ? "mainnet-beta" : "devnet");

export const endpoint =
  import.meta.env.VITE_SOLANA_RPC_URL ??
  (effectiveSolanaCluster === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com");

export const websocketEndpoint =
  import.meta.env.VITE_SOLANA_WS_URL ??
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

export const solanaClusterLabel =
  effectiveSolanaCluster === "mainnet-beta" ? "Mainnet" : "Devnet";

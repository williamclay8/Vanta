import { autoDiscover, createClient, type WalletConnector } from "@solana/client";

export const endpoint =
  import.meta.env.VITE_SOLANA_RPC_URL ??
  (import.meta.env.VITE_SOLANA_CLUSTER === "mainnet-beta"
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
  import.meta.env.VITE_SOLANA_CLUSTER === "mainnet-beta" ? "Mainnet" : "Devnet";

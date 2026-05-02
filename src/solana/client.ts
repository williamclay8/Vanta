import { autoDiscover, createClient, type WalletConnector } from "@solana/client";

const defaultSolanaRpcEndpoint = "https://api.mainnet-beta.solana.com";
const configuredSolanaRpcEndpoint =
  import.meta.env.VITE_SOLANA_BROWSER_RPC_URL?.trim() ||
  import.meta.env.VITE_SOLANA_RPC_URL?.trim() ||
  "";
const configuredSolanaWebsocketEndpoint =
  import.meta.env.VITE_SOLANA_BROWSER_WS_URL?.trim() ||
  import.meta.env.VITE_SOLANA_WS_URL?.trim() ||
  "";

export const endpoint = configuredSolanaRpcEndpoint || defaultSolanaRpcEndpoint;

export const websocketEndpoint =
  configuredSolanaWebsocketEndpoint ||
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

import { autoDiscover, createClient, type WalletConnector } from "@solana/client";

const defaultSolanaRpcEndpoint = "https://api.mainnet-beta.solana.com";

export const endpoint = defaultSolanaRpcEndpoint;

export const websocketEndpoint = endpoint.replace("https://", "wss://").replace("http://", "ws://");

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

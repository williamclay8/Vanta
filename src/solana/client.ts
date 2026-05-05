import { autoDiscover, createClient, type WalletConnector } from "@solana/client";

const defaultSolanaRpcEndpoint = "https://solana-rpc.publicnode.com";
const defaultSolanaWebsocketEndpoint = "wss://solana-rpc.publicnode.com";
const browserBlockedMainnetRpcHosts = new Set(["api.mainnet-beta.solana.com"]);

export function isBrowserBlockedMainnetRpcEndpoint(value: string) {
  try {
    return browserBlockedMainnetRpcHosts.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isForbiddenMainnetRpcEndpoint(value: string) {
  const normalized = value.toLowerCase();

  return (
    /(^|\b)(devnet|testnet)(\b|\.|-)|localhost|127\.0\.0\.1|0\.0\.0\.0/u.test(
      normalized,
    ) || isBrowserBlockedMainnetRpcEndpoint(value)
  );
}

export function resolveMainnetBrowserRpcEndpoint(value: string) {
  const trimmed = value.trim();

  if (!trimmed || isForbiddenMainnetRpcEndpoint(trimmed)) {
    return defaultSolanaRpcEndpoint;
  }

  return trimmed;
}

export function resolveMainnetBrowserWebsocketEndpoint(value: string, rpcEndpoint: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return rpcEndpoint.replace("https://", "wss://").replace("http://", "ws://");
  }

  if (isForbiddenMainnetRpcEndpoint(trimmed)) {
    return defaultSolanaWebsocketEndpoint;
  }

  return trimmed;
}

function parseMainnetReadRpcFallbackEndpoints(value: string | undefined) {
  return value?.split(",")
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate && !isForbiddenMainnetRpcEndpoint(candidate)) ?? [];
}

const configuredSolanaRpcEndpoint = resolveMainnetBrowserRpcEndpoint(
  import.meta.env.VITE_SOLANA_BROWSER_RPC_URL?.trim() ||
  import.meta.env.VITE_SOLANA_RPC_URL?.trim() ||
  "",
);
const configuredSolanaWebsocketEndpoint = resolveMainnetBrowserWebsocketEndpoint(
  import.meta.env.VITE_SOLANA_BROWSER_WS_URL?.trim() ||
  import.meta.env.VITE_SOLANA_WS_URL?.trim() ||
  "",
  configuredSolanaRpcEndpoint,
);

export const endpoint = configuredSolanaRpcEndpoint;

export const websocketEndpoint =
  configuredSolanaWebsocketEndpoint || defaultSolanaWebsocketEndpoint;

export const readRpcFallbackEndpoints = [
  endpoint,
  ...parseMainnetReadRpcFallbackEndpoints(import.meta.env.VITE_SOLANA_READ_RPC_FALLBACK_URLS),
].filter((value, index, values) => values.indexOf(value) === index);

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

const defaultSolanaRpcEndpoint = "https://solana-rpc.publicnode.com";
const defaultSolanaWebsocketEndpoint = "wss://solana-rpc.publicnode.com";
const browserBlockedMainnetRpcHosts = new Set(["api.mainnet-beta.solana.com"]);
const ignoredBrowserRpcEnvKeys = [
  "VITE_SOLANA_BROWSER_RPC_URL",
  "VITE_SOLANA_RPC_URL",
  "VITE_SOLANA_BROWSER_WS_URL",
  "VITE_SOLANA_WS_URL",
  "VITE_SOLANA_READ_RPC_FALLBACK_URLS",
] as const;

export const browserRpcEnvContract = {
  ignoredBrowserRpcEnvKeys,
  reason:
    "Browser RPC env values are intentionally ignored by the SPA build so paid/provider RPC URLs are not inlined into public JS bundles.",
  runtimeConfigPath: "/config",
  serverRpcEnvKey: "SOLANA_RPC_URL",
} as const;

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

export function parseMainnetReadRpcFallbackEndpoints(value: string | undefined) {
  return value?.split(",")
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate && !isForbiddenMainnetRpcEndpoint(candidate)) ?? [];
}

export const mainnetBrowserRpcEndpoint = defaultSolanaRpcEndpoint;
export const mainnetBrowserWebsocketEndpoint = defaultSolanaWebsocketEndpoint;

export const mainnetReadRpcFallbackEndpoints = [
  mainnetBrowserRpcEndpoint,
].filter((value, index, values) => values.indexOf(value) === index);

export const defaultMainnetBrowserWebsocketEndpoint = defaultSolanaWebsocketEndpoint;

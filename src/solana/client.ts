import { getWallets } from "@wallet-standard/app";
import { autoDiscover, createClient, type WalletConnector } from "@solana/client";

const defaultSolanaRpcEndpoint = "https://solana-rpc.publicnode.com";
const defaultSolanaWebsocketEndpoint = "wss://solana-rpc.publicnode.com";
const browserBlockedMainnetRpcHosts = new Set(["api.mainnet-beta.solana.com"]);
const vantaSolanaMainnetChain = "solana:mainnet-beta";
const vantaSolanaSigningFeatures = [
  "solana:signTransaction",
  "solana:signAndSendTransaction",
] as const;

type VantaWalletStandardAccountLike = {
  chains?: readonly string[];
  features?: readonly string[];
};

type VantaWalletStandardLike = {
  accounts?: readonly VantaWalletStandardAccountLike[];
  features?: Record<string, unknown>;
};

function hasAnyFeature(featureNames: Iterable<string>, expectedFeatures: readonly string[]) {
  const featureSet = new Set(featureNames);

  return expectedFeatures.some((featureName) => featureSet.has(featureName));
}

function walletAccountSupportsVantaSolanaSigning(account: VantaWalletStandardAccountLike) {
  const accountChains = account.chains ?? [];
  const supportsSolanaChain =
    accountChains.length === 0 ||
    accountChains.some((chain) => chain === vantaSolanaMainnetChain || chain.startsWith("solana:"));
  const accountFeatures = account.features ?? [];
  const supportsSigning =
    accountFeatures.length === 0 ||
    hasAnyFeature(accountFeatures, vantaSolanaSigningFeatures);

  return supportsSolanaChain && supportsSigning;
}

export function walletSupportsVantaSolanaSigning(wallet: VantaWalletStandardLike) {
  if (!hasAnyFeature(Object.keys(wallet.features ?? {}), vantaSolanaSigningFeatures)) {
    return false;
  }

  const accounts = wallet.accounts ?? [];
  if (accounts.length === 0) {
    return true;
  }

  return accounts.some(walletAccountSupportsVantaSolanaSigning);
}

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
  return autoDiscover({
    filter: walletSupportsVantaSolanaSigning,
    overrides: () => ({
      defaultChain: vantaSolanaMainnetChain,
    }),
  });
}

export function watchVantaWalletStandardConnectors(
  onChange: (connectors: readonly WalletConnector[]) => void,
) {
  const wallets = getWallets();
  const emit = () => {
    onChange(discoverWalletConnectors());
  };

  emit();
  const stopRegister = wallets.on("register", emit);
  const stopUnregister = wallets.on("unregister", emit);

  return () => {
    stopRegister();
    stopUnregister();
  };
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

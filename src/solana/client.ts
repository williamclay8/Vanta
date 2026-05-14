import { getWallets } from "@wallet-standard/app";
import { autoDiscover, createClient, type WalletConnector } from "@solana/client";
import {
  defaultMainnetBrowserWebsocketEndpoint,
  isBrowserBlockedMainnetRpcEndpoint,
  isForbiddenMainnetRpcEndpoint,
  mainnetBrowserRpcEndpoint,
  mainnetBrowserWebsocketEndpoint,
  mainnetReadRpcFallbackEndpoints,
  resolveMainnetBrowserRpcEndpoint,
  resolveMainnetBrowserWebsocketEndpoint,
} from "@/solana/browserRpcEndpoint";

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

export {
  isBrowserBlockedMainnetRpcEndpoint,
  isForbiddenMainnetRpcEndpoint,
  resolveMainnetBrowserRpcEndpoint,
  resolveMainnetBrowserWebsocketEndpoint,
};

export const endpoint = mainnetBrowserRpcEndpoint;

export const websocketEndpoint =
  mainnetBrowserWebsocketEndpoint || defaultMainnetBrowserWebsocketEndpoint;

export const readRpcFallbackEndpoints = mainnetReadRpcFallbackEndpoints;

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

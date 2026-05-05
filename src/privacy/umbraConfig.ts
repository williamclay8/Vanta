import type { VantaPrivacyNetwork } from "./protocolAdapter";
import {
  endpoint,
  resolveMainnetBrowserRpcEndpoint,
  resolveMainnetBrowserWebsocketEndpoint,
} from "@/solana/client";

export type UmbraRuntimeConfig = {
  enabled: boolean;
  indexerApiEndpoint: string;
  network: VantaPrivacyNetwork;
  relayerApiEndpoint: string;
  rpcSubscriptionsUrl: string;
  rpcUrl: string;
};

function optionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeUmbraNetwork(value: string | undefined): VantaPrivacyNetwork {
  const normalized = optionalEnv(value)?.toLowerCase();

  if (normalized === "mainnet" || normalized === "localnet") {
    return normalized;
  }

  return "mainnet";
}

function defaultIndexerEndpoint(network: VantaPrivacyNetwork) {
  if (network === "mainnet") {
    return "https://utxo-indexer.api.umbraprivacy.com";
  }

  return import.meta.env.DEV ? "http://127.0.0.1:8899" : "";
}

function defaultRelayerEndpoint(network: VantaPrivacyNetwork) {
  if (network === "mainnet") {
    return "https://relayer.api.umbraprivacy.com";
  }

  return import.meta.env.DEV ? "http://127.0.0.1:8788" : "";
}

const network = normalizeUmbraNetwork(import.meta.env.VITE_UMBRA_NETWORK);
const configuredUmbraRpcUrl = optionalEnv(import.meta.env.VITE_UMBRA_RPC_URL);
const rpcUrl = network === "mainnet"
  ? resolveMainnetBrowserRpcEndpoint(configuredUmbraRpcUrl ?? endpoint)
  : configuredUmbraRpcUrl ?? (import.meta.env.DEV ? "http://127.0.0.1:8899" : "");
const configuredUmbraRpcSubscriptionsUrl = optionalEnv(
  import.meta.env.VITE_UMBRA_RPC_SUBSCRIPTIONS_URL,
);
const rpcSubscriptionsUrl = network === "mainnet"
  ? resolveMainnetBrowserWebsocketEndpoint(configuredUmbraRpcSubscriptionsUrl ?? "", rpcUrl)
  : configuredUmbraRpcSubscriptionsUrl ??
    rpcUrl.replace("https://", "wss://").replace("http://", "ws://");

export const umbraRuntimeConfig: UmbraRuntimeConfig = {
  enabled: optionalEnv(import.meta.env.VITE_VANTA_ENABLE_UMBRA) === "true",
  indexerApiEndpoint:
    optionalEnv(import.meta.env.VITE_UMBRA_INDEXER_URL) ?? defaultIndexerEndpoint(network),
  network,
  relayerApiEndpoint:
    optionalEnv(import.meta.env.VITE_UMBRA_RELAYER_URL) ?? defaultRelayerEndpoint(network),
  rpcSubscriptionsUrl,
  rpcUrl,
};

export function getUmbraRuntimeReadiness(config = umbraRuntimeConfig) {
  const blockers: string[] = [];

  if (!config.enabled) {
    blockers.push("Umbra adapter is disabled. Set VITE_VANTA_ENABLE_UMBRA=true to enable.");
  }

  if (!config.rpcUrl) {
    blockers.push("Umbra RPC URL is not configured.");
  }

  if (!config.rpcSubscriptionsUrl) {
    blockers.push("Umbra RPC websocket URL is not configured.");
  }

  if (!config.indexerApiEndpoint) {
    blockers.push("Umbra indexer URL is not configured.");
  }

  return {
    blockers,
    ready: blockers.length === 0,
  };
}

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");

loadEnvFile(".env.local");
loadEnvFile(".env.operator.local");

const requiredSdkExports = [
  "getUmbraClient",
  "getUserRegistrationFunction",
  "getEncryptedBalanceQuerierFunction",
  "getPublicBalanceToEncryptedBalanceDirectDepositorFunction",
  "getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction",
  "getClaimableUtxoScannerFunction",
  "getPublicBalanceToSelfClaimableUtxoCreatorFunction",
  "getPublicBalanceToReceiverClaimableUtxoCreatorFunction",
  "getSelfClaimableUtxoToEncryptedBalanceClaimerFunction",
  "getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction",
  "getUmbraRelayer",
];

const supportedPools = [
  {
    decimals: 6,
    mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    name: "USD Coin",
    symbol: "USDC",
  },
  {
    decimals: 6,
    mintAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    name: "Tether USD",
    symbol: "USDT",
  },
  {
    decimals: 9,
    mintAddress: "So11111111111111111111111111111111111111112",
    name: "Wrapped SOL",
    symbol: "wSOL",
  },
  {
    decimals: 6,
    mintAddress: "PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta",
    name: "Umbra",
    symbol: "UMBRA",
  },
];

try {
  const sdk = await import("@umbra-privacy/sdk");
  const sdkPackage = require("@umbra-privacy/sdk/package.json");
  const missingExports = requiredSdkExports.filter((key) => typeof sdk[key] !== "function");
  const proverPackage = readOptionalPackage("@umbra-privacy/web-zk-prover/package.json");
  const runtime = buildRuntimeDefaults();
  const snapshot = {
    benchmark: "vanta-umbra-adapter-benchmark-v1",
    ok: missingExports.length === 0,
    runtime,
    sdk: {
      installedVersion: sdkPackage.version,
      missingExports,
      requiredExports: requiredSdkExports,
    },
    supportedPools,
    prover: {
      installedVersion: proverPackage?.version ?? null,
      ready: false,
      reason:
        "Mixer proving is intentionally gated until Vanta confirms a web prover package that is compatible with @umbra-privacy/sdk@4.x.",
    },
    recommendedNextStep:
      missingExports.length === 0
        ? "Use this benchmark as Option A: Umbra encrypted-balance registration/query/deposit/withdraw behind explicit wallet approval, then wire mixer create/claim once prover compatibility is confirmed."
        : "Resolve missing Umbra SDK exports before wiring runtime routes.",
  };

  if (jsonMode) {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    printSnapshot(snapshot);
  }

  if (!snapshot.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Umbra adapter benchmark failed.");
  process.exitCode = 1;
}

function buildRuntimeDefaults() {
  const network = normalizeNetwork(process.env.VITE_UMBRA_NETWORK);
  const rpcUrl =
    optionalEnv(process.env.VITE_UMBRA_RPC_URL) ??
    optionalEnv(process.env.VITE_SOLANA_RPC_URL) ??
    "https://api.devnet.solana.com";

  return {
    enabled: optionalEnv(process.env.VITE_VANTA_ENABLE_UMBRA) === "true",
    indexerApiEndpoint:
      optionalEnv(process.env.VITE_UMBRA_INDEXER_URL) ?? defaultIndexerEndpoint(network),
    network,
    relayerApiEndpoint:
      optionalEnv(process.env.VITE_UMBRA_RELAYER_URL) ?? defaultRelayerEndpoint(network),
    rpcSubscriptionsUrl:
      optionalEnv(process.env.VITE_UMBRA_RPC_SUBSCRIPTIONS_URL) ??
      optionalEnv(process.env.VITE_SOLANA_WS_URL) ??
      rpcUrl.replace("https://", "wss://").replace("http://", "ws://"),
    rpcUrl,
  };
}

function defaultIndexerEndpoint(network) {
  if (network === "mainnet") {
    return "https://utxo-indexer.api.umbraprivacy.com";
  }

  if (network === "devnet") {
    return "https://utxo-indexer.api-devnet.umbraprivacy.com";
  }

  return "http://127.0.0.1:8899";
}

function defaultRelayerEndpoint(network) {
  if (network === "mainnet") {
    return "https://relayer.api.umbraprivacy.com";
  }

  if (network === "devnet") {
    return "https://relayer.api-devnet.umbraprivacy.com";
  }

  return "http://127.0.0.1:8788";
}

function loadEnvFile(relativePath) {
  const filePath = resolve(repoRoot, relativePath);

  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function normalizeNetwork(value) {
  const normalized = optionalEnv(value)?.toLowerCase();

  if (normalized === "mainnet" || normalized === "devnet" || normalized === "localnet") {
    return normalized;
  }

  return "devnet";
}

function optionalEnv(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function printSnapshot(snapshot) {
  console.log(`Benchmark: ${snapshot.benchmark}`);
  console.log(`Status: ${snapshot.ok ? "PASS" : "FAIL"}`);
  console.log(`Umbra SDK: ${snapshot.sdk.installedVersion}`);
  console.log(`Runtime enabled: ${snapshot.runtime.enabled ? "yes" : "no"}`);
  console.log(`Runtime network: ${snapshot.runtime.network}`);
  console.log(`RPC: ${snapshot.runtime.rpcUrl}`);
  console.log(`Indexer: ${snapshot.runtime.indexerApiEndpoint}`);
  console.log(`Relayer: ${snapshot.runtime.relayerApiEndpoint}`);
  console.log(
    `SDK exports: ${
      snapshot.sdk.missingExports.length === 0
        ? "all required exports present"
        : `missing ${snapshot.sdk.missingExports.join(", ")}`
    }`,
  );
  console.log(
    `Mixer prover: ${snapshot.prover.ready ? "ready" : `gated (${snapshot.prover.reason})`}`,
  );
  console.log(`Supported private pools: ${snapshot.supportedPools.map((pool) => pool.symbol).join(", ")}`);
  console.log(`Next: ${snapshot.recommendedNextStep}`);
}

function readOptionalPackage(packagePath) {
  try {
    return require(packagePath);
  } catch {
    return null;
  }
}

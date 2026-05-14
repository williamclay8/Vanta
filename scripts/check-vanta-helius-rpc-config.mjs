import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const envFiles = [".env", ".env.local"];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const env = {};
  const source = readFileSync(filePath, "utf8");

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function effectiveEnv() {
  return Object.assign(
    {},
    ...envFiles.map((fileName) => parseEnvFile(resolve(repoRoot, fileName))),
    process.env,
  );
}

function getHostname(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function parseCsv(value) {
  return value?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? [];
}

function hasApiKeyQuery(value) {
  try {
    return new URL(value).searchParams.has("api-key");
  } catch {
    return false;
  }
}

function assertHeliusUrl(label, value, options = {}) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    if (options.optional) {
      return;
    }

    throw new Error(`${label} must be set to a Helius mainnet RPC URL.`);
  }

  const hostname = getHostname(trimmed);
  assert.ok(hostname, `${label} must be a valid URL.`);
  assert.ok(
    hostname === "mainnet.helius-rpc.com" ||
      hostname === "beta.helius-rpc.com" ||
      hostname.endsWith(".helius-rpc.com"),
    `${label} must use helius-rpc.com, received ${hostname}.`,
  );
  assert.ok(!/publicnode\.com/u.test(hostname), `${label} must not use PublicNode.`);
  assert.ok(
    hostname !== "api.mainnet-beta.solana.com",
    `${label} must not use the browser-blocked Solana public endpoint.`,
  );
}

function assertBrowserSafeHeliusUrl(label, value, options = {}) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed && options.optional) {
    return;
  }

  assertHeliusUrl(label, value, options);
  assert.ok(
    !hasApiKeyQuery(trimmed),
    `${label} is browser-exposed and must use a Helius Secure RPC URL, not a raw api-key URL.`,
  );
}

const env = effectiveEnv();
const clientSource = readFileSync(resolve(repoRoot, "src/solana/client.ts"), "utf8");
const browserRpcEndpointSource = readFileSync(resolve(repoRoot, "src/solana/browserRpcEndpoint.ts"), "utf8");
const envExampleSource = readFileSync(resolve(repoRoot, ".env.example"), "utf8");
const gitignoreSource = readFileSync(resolve(repoRoot, ".gitignore"), "utf8");

assert.ok(
  browserRpcEndpointSource.indexOf("VITE_SOLANA_BROWSER_RPC_URL") <
    browserRpcEndpointSource.indexOf("VITE_SOLANA_RPC_URL"),
  "browser-specific RPC env must take precedence over the generic VITE_SOLANA_RPC_URL.",
);
assert.ok(
  browserRpcEndpointSource.includes("VITE_SOLANA_READ_RPC_FALLBACK_URLS"),
  "read RPC fallback env must stay wired into the browser client.",
);
assert.ok(
  browserRpcEndpointSource.includes("api.mainnet-beta.solana.com") &&
    browserRpcEndpointSource.includes("isBrowserBlockedMainnetRpcEndpoint"),
  "browser RPC resolver must keep rejecting the browser-blocked Solana public endpoint.",
);
assert.ok(
  clientSource.includes('from "@/solana/browserRpcEndpoint"') &&
    clientSource.includes("export const endpoint = mainnetBrowserRpcEndpoint"),
  "Solana client must keep using the shared browser RPC resolver.",
);
assert.ok(
  envExampleSource.includes("VITE_SOLANA_BROWSER_RPC_URL=https://your-secure-url.helius-rpc.com"),
  ".env.example must document the frontend-safe Helius Secure RPC URL.",
);
assert.ok(
  envExampleSource.includes("VITE_SOLANA_RPC_URL=https://your-secure-url.helius-rpc.com"),
  ".env.example must keep browser-exposed VITE_SOLANA_RPC_URL on a Secure RPC URL.",
);
assert.ok(
  envExampleSource.includes("SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<helius-api-key>"),
  ".env.example must document the paid Helius mainnet RPC URL for server/scripts.",
);
assert.ok(
  gitignoreSource.includes("env*.local"),
  ".gitignore must ignore launch/local env files that can contain provider tokens.",
);

assertBrowserSafeHeliusUrl("VITE_SOLANA_BROWSER_RPC_URL", env.VITE_SOLANA_BROWSER_RPC_URL);
assertBrowserSafeHeliusUrl("VITE_SOLANA_RPC_URL", env.VITE_SOLANA_RPC_URL, {
  optional: true,
});
assertBrowserSafeHeliusUrl("VITE_SOLANA_BROWSER_WS_URL", env.VITE_SOLANA_BROWSER_WS_URL, {
  optional: true,
});
assertBrowserSafeHeliusUrl("VITE_SOLANA_WS_URL", env.VITE_SOLANA_WS_URL, { optional: true });

for (const [index, fallback] of parseCsv(env.VITE_SOLANA_READ_RPC_FALLBACK_URLS).entries()) {
  assertBrowserSafeHeliusUrl(`VITE_SOLANA_READ_RPC_FALLBACK_URLS[${index}]`, fallback);
}

assertHeliusUrl("SOLANA_RPC_URL", env.SOLANA_RPC_URL);
assertHeliusUrl(
  "VANTA_PRIVATE_POOL_V2_PUBLIC_SHIELD_RECEIPT_RPC_URL",
  env.VANTA_PRIVATE_POOL_V2_PUBLIC_SHIELD_RECEIPT_RPC_URL,
);

console.log("Vanta Helius RPC config check: PASS");

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

// Per the 2026-05-19 audit (H5), the browser RPC env vars are allowed to be EITHER:
//   (a) empty — production default; the SPA falls back to solana-rpc.publicnode.com and
//       no Helius URL is leaked to scrapers, OR
//   (b) a Helius Secure RPC subdomain URL with NO `?api-key=` query — slower-to-rotate
//       leak but documented and accepted.
// What is forbidden in either case is a raw `?api-key=` URL or PublicNode being set
// here explicitly (publicnode is reached only via the resolver fallback in
// browserRpcEndpoint.ts so the policy stays single-sourced).
function assertBrowserSafeHeliusUrl(label, value, options = {}) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    // Empty is now the recommended default for browser RPC env vars — fall through to
    // the publicnode resolver. Skip the Helius-format assertions but keep the api-key
    // assertion below redundant.
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

for (const forbiddenStaticRead of [
  "import.meta.env.VITE_SOLANA_BROWSER_RPC_URL",
  "import.meta.env.VITE_SOLANA_RPC_URL",
  "import.meta.env.VITE_SOLANA_BROWSER_WS_URL",
  "import.meta.env.VITE_SOLANA_WS_URL",
  "import.meta.env.VITE_SOLANA_READ_RPC_FALLBACK_URLS",
]) {
  assert.ok(
    !browserRpcEndpointSource.includes(forbiddenStaticRead),
    `Browser RPC resolver must not statically read ${forbiddenStaticRead}; Vite would inline the value into the public bundle.`,
  );
}
assert.ok(
  browserRpcEndpointSource.includes("browserRpcEnvContract") &&
    browserRpcEndpointSource.includes("ignoredBrowserRpcEnvKeys") &&
    browserRpcEndpointSource.includes("SOLANA_RPC_URL"),
  "browser RPC resolver must document ignored VITE RPC env keys and point paid RPC to server-side SOLANA_RPC_URL.",
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
  envExampleSource.includes("The SPA intentionally ignores these VITE_* browser RPC values"),
  ".env.example must explain that browser RPC VITE_* values are intentionally ignored by the SPA build.",
);
assert.ok(
  /VITE_SOLANA_BROWSER_RPC_URL=\s*(?:\n|$)/u.test(envExampleSource) &&
    /VITE_SOLANA_RPC_URL=\s*(?:\n|$)/u.test(envExampleSource),
  ".env.example must leave browser RPC VITE_* values blank.",
);
assert.ok(
  envExampleSource.includes("SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<helius-api-key>"),
  ".env.example must document the paid Helius mainnet RPC URL for server/scripts.",
);
assert.ok(
  gitignoreSource.includes("env*.local"),
  ".gitignore must ignore launch/local env files that can contain provider tokens.",
);

for (const [label, value] of [
  ["VITE_SOLANA_BROWSER_RPC_URL", env.VITE_SOLANA_BROWSER_RPC_URL],
  ["VITE_SOLANA_RPC_URL", env.VITE_SOLANA_RPC_URL],
  ["VITE_SOLANA_BROWSER_WS_URL", env.VITE_SOLANA_BROWSER_WS_URL],
  ["VITE_SOLANA_WS_URL", env.VITE_SOLANA_WS_URL],
]) {
  assert.ok(
    !hasApiKeyQuery(value ?? ""),
    `${label} is ignored by the SPA but must still never contain a raw api-key URL.`,
  );
}

for (const [index, fallback] of parseCsv(env.VITE_SOLANA_READ_RPC_FALLBACK_URLS).entries()) {
  assert.ok(
    !hasApiKeyQuery(fallback),
    `VITE_SOLANA_READ_RPC_FALLBACK_URLS[${index}] is ignored by the SPA but must still never contain a raw api-key URL.`,
  );
}

assertHeliusUrl("SOLANA_RPC_URL", env.SOLANA_RPC_URL);
assertHeliusUrl(
  "VANTA_PRIVATE_POOL_V2_PUBLIC_SHIELD_RECEIPT_RPC_URL",
  env.VANTA_PRIVATE_POOL_V2_PUBLIC_SHIELD_RECEIPT_RPC_URL,
);

console.log("Vanta Helius RPC config check: PASS");

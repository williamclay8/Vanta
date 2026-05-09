import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const viteEnvSource = readFileSync(new URL("../src/vite-env.d.ts", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const envKeyMatches = [...viteEnvSource.matchAll(/readonly\s+(VITE_[A-Z0-9_]+)\??:/g)];
const envKeys = envKeyMatches.map((match) => match[1]);
const duplicatedEnvKeys = [...new Set(envKeys.filter((key, index) => envKeys.indexOf(key) !== index))];

assert.deepEqual(
  duplicatedEnvKeys,
  [],
  `src/vite-env.d.ts must declare each VITE env key once. Duplicates: ${duplicatedEnvKeys.join(", ")}`,
);

for (const key of [
  "VITE_VANTA_MAINNET_USDT_MINT",
  "VITE_VANTA_MAINNET_EURC_MINT",
  "VITE_VANTA_MAINNET_USDS_MINT",
  "VITE_VANTA_MAINNET_USX_MINT",
  "VITE_VANTA_MAINNET_USD1_MINT",
  "VITE_VANTA_MAINNET_JUPUSD_MINT",
]) {
  assert.ok(envKeys.includes(key), `src/vite-env.d.ts must declare ${key}.`);
}

const browserPublicEnvKeys = collectBrowserPublicEnvKeys();
const forbiddenBrowserEnvKeys = browserPublicEnvKeys.filter(isForbiddenBrowserSecretEnvKey);

assert.deepEqual(
  forbiddenBrowserEnvKeys,
  [],
  `Browser VITE env keys must not look like secrets or operator bearer tokens. Move these to server-only env: ${forbiddenBrowserEnvKeys.join(", ")}`,
);

assert.equal(
  packageJson.scripts["vite-env:contract-check"],
  "node scripts/check-vanta-vite-env-contract.mjs",
  "package.json must expose vite-env:contract-check.",
);
assert.equal(
  packageJson.scripts["frontend:operator-env-exposure-check"],
  "node scripts/check-vanta-frontend-operator-env-exposure.mjs",
  "package.json must expose frontend:operator-env-exposure-check.",
);
assert.ok(
  packageJson.scripts["token-availability:check"].includes("npm run vite-env:contract-check"),
  "token-availability:check must include vite-env:contract-check.",
);
assert.ok(
  packageJson.scripts["mainnet:secret-handling-check"].includes("npm run vite-env:contract-check"),
  "mainnet:secret-handling-check must include vite-env:contract-check.",
);
assert.ok(
  packageJson.scripts["mainnet:secret-handling-check"].includes(
    "npm run frontend:operator-env-exposure-check",
  ),
  "mainnet:secret-handling-check must include frontend:operator-env-exposure-check.",
);

console.log("Vanta Vite env contract check: PASS");

function collectBrowserPublicEnvKeys() {
  const keys = new Set(envKeys);

  for (const { label, source } of collectBrowserEnvSources()) {
    for (const match of source.matchAll(/\b(VITE_[A-Z0-9_]+)\b/g)) {
      keys.add(match[1]);
    }

    for (const match of source.matchAll(/import\.meta\.env\.([A-Z0-9_]+)/g)) {
      if (match[1].startsWith("VITE_")) {
        keys.add(match[1]);
      }
    }

    assert.ok(
      !source.includes("VITE_JUPITER_API_KEY"),
      `${label} must not use browser-exposed Jupiter API keys; route privileged Jupiter calls through a server env if needed.`,
    );
  }

  return [...keys].sort();
}

function collectBrowserEnvSources() {
  const sources = [
    {
      label: "src/vite-env.d.ts",
      source: viteEnvSource,
    },
  ];
  const envExamplePath = resolve(repoRoot, ".env.example");

  if (existsSync(envExamplePath)) {
    sources.push({
      label: ".env.example",
      source: readFileSync(envExamplePath, "utf8"),
    });
  }

  for (const filePath of walkSourceFiles(resolve(repoRoot, "src"))) {
    sources.push({
      label: relative(repoRoot, filePath),
      source: readFileSync(filePath, "utf8"),
    });
  }

  return sources;
}

function walkSourceFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...walkSourceFiles(fullPath));
      continue;
    }

    if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function isForbiddenBrowserSecretEnvKey(key) {
  if (isAllowedBrowserPublicTokenMetadataKey(key)) {
    return false;
  }

  return /(?:^|_)(?:AUTH_TOKEN|ACCESS_TOKEN|API_KEY|API_TOKEN|BEARER|DATABASE_URL|JWT|PASSWORD|PRIVATE_KEY|SECRET|SESSION|SIGNER_SECRET|WALLET_KEY|WEBHOOK_SECRET)(?:_|$)/.test(
    key,
  ) || /(?:^|_)OPERATOR_TOKEN(?:_|$)/.test(key);
}

function isAllowedBrowserPublicTokenMetadataKey(key) {
  return /^VITE_VANTA_(?:MAINNET|DEVNET)(?:_[A-Z0-9]+)?_(?:TOKEN_)?(?:MINT|NAME|DECIMALS)$/.test(
    key,
  );
}

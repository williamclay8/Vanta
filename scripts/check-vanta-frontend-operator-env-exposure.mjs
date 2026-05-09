import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = resolve(repoRoot, "dist");

const browserSecretCanaries = {
  VITE_JUPITER_API_KEY: "__VANTA_FORBIDDEN_JUPITER_API_KEY_CANARY__",
  VITE_OPERATOR_AUTH_TOKEN: "__VANTA_FORBIDDEN_OPERATOR_AUTH_TOKEN_CANARY__",
  VITE_VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN:
    "__VANTA_FORBIDDEN_PRIVATE_POOL_OPERATOR_TOKEN_CANARY__",
  VITE_VANTA_PRIVATE_POOL_V2_OPERATOR_SECRET:
    "__VANTA_FORBIDDEN_PRIVATE_POOL_OPERATOR_SECRET_CANARY__",
};

const allowedBrowserOperatorUrlKeys = new Set([
  "VITE_VANTA_BONK_UNSHIELD_OPERATOR_URL",
  "VITE_VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
  "VITE_VANTA_SOL_TO_SHIELDED_SWAP_OPERATOR_URL",
  "VITE_VANTA_SOL_UNSHIELD_OPERATOR_URL",
  "VITE_VANTA_SWAP_OPERATOR_URL",
  "VITE_VANTA_UNSHIELD_OPERATOR_URL",
]);

runProductionBuildWithCanaries();
assertBrowserEnvSourceContract();
assertDistDoesNotExposeForbiddenEnv();

console.log("Vanta frontend operator env exposure check: PASS");

function runProductionBuildWithCanaries() {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

  execFileSync(npmExecutable, ["run", "build"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...browserSecretCanaries,
    },
    stdio: "inherit",
  });
}

function assertBrowserEnvSourceContract() {
  const discoveredKeys = new Set();

  for (const { label, source } of collectBrowserEnvSources()) {
    for (const match of source.matchAll(/\b(VITE_[A-Z0-9_]+)\b/g)) {
      discoveredKeys.add(match[1]);
    }

    for (const match of source.matchAll(/import\.meta\.env\.([A-Z0-9_]+)/g)) {
      if (match[1].startsWith("VITE_")) {
        discoveredKeys.add(match[1]);
      }
    }

    assert.ok(
      !source.includes("VITE_JUPITER_API_KEY"),
      `${label} must not use browser-exposed Jupiter API keys; privileged Jupiter calls need a server-only proxy env.`,
    );
  }

  const forbiddenKeys = [...discoveredKeys].sort().filter(isForbiddenBrowserSecretEnvKey);
  assert.deepEqual(
    forbiddenKeys,
    [],
    `Browser VITE env keys must not look like secrets or operator bearer tokens: ${forbiddenKeys.join(", ")}`,
  );
}

function collectBrowserEnvSources() {
  const sources = [];
  const viteEnvPath = resolve(repoRoot, "src/vite-env.d.ts");
  const envExamplePath = resolve(repoRoot, ".env.example");

  sources.push({
    label: relative(repoRoot, viteEnvPath),
    source: readFileSync(viteEnvPath, "utf8"),
  });

  if (existsSync(envExamplePath)) {
    sources.push({
      label: relative(repoRoot, envExamplePath),
      source: readFileSync(envExamplePath, "utf8"),
    });
  }

  for (const filePath of walkFiles(resolve(repoRoot, "src"), /\.(ts|tsx|js|jsx|mjs)$/)) {
    sources.push({
      label: relative(repoRoot, filePath),
      source: readFileSync(filePath, "utf8"),
    });
  }

  return sources;
}

function assertDistDoesNotExposeForbiddenEnv() {
  assert.ok(existsSync(distRoot), "dist must exist after the production build.");

  const distFiles = walkFiles(distRoot, /\.(html|js|css|json|map|txt)$/);
  assert.ok(distFiles.length > 0, "dist must include assets to scan.");

  const forbiddenCanaryValues = Object.values(browserSecretCanaries);
  const forbiddenCanaryKeys = Object.keys(browserSecretCanaries);

  for (const filePath of distFiles) {
    const source = readFileSync(filePath, "utf8");
    const label = relative(repoRoot, filePath);

    for (const canary of forbiddenCanaryValues) {
      assert.ok(
        !source.includes(canary),
        `${label} exposed browser secret canary ${canary}.`,
      );
    }

    for (const key of forbiddenCanaryKeys) {
      assert.ok(
        !source.includes(key),
        `${label} retained forbidden browser secret env key ${key}.`,
      );
    }

    for (const match of source.matchAll(/\b(VITE_[A-Z0-9_]+)\b/g)) {
      const key = match[1];
      assert.ok(
        !isForbiddenBrowserSecretEnvKey(key),
        `${label} retained forbidden browser secret env key ${key}.`,
      );
    }
  }
}

function walkFiles(dir, filePattern) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...walkFiles(fullPath, filePattern));
      continue;
    }

    if (filePattern.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function isForbiddenBrowserSecretEnvKey(key) {
  if (allowedBrowserOperatorUrlKeys.has(key)) {
    return false;
  }

  if (isAllowedBrowserPublicTokenMetadataKey(key)) {
    return false;
  }

  if (/(?:^|_)OPERATOR(?:_|$)/.test(key) && !key.endsWith("_URL")) {
    return true;
  }

  return /(?:^|_)(?:ACCESS_TOKEN|API_KEY|API_TOKEN|AUTH_TOKEN|BEARER|DATABASE_URL|JWT|PASSWORD|PRIVATE_KEY|SECRET|SESSION|SIGNER_SECRET|WALLET_KEY|WEBHOOK_SECRET)(?:_|$)/.test(
    key,
  );
}

function isAllowedBrowserPublicTokenMetadataKey(key) {
  return /^VITE_VANTA_(?:MAINNET|DEVNET)(?:_[A-Z0-9]+)?_(?:TOKEN_)?(?:MINT|NAME|DECIMALS)$/.test(
    key,
  );
}

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-token-availability-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function copySource(relativePath) {
  const targetPath = join(tempTsDir, relativePath);
  mkdirSync(join(targetPath, ".."), { recursive: true });
  writeFileSync(targetPath, readFileSync(resolve(repoRoot, "src", relativePath), "utf8"));
}

function compileSources() {
  const sourceFiles = ["tokens/vantaTokenCatalog.ts", "pay/vantaPayAssets.ts"];
  for (const sourceFile of sourceFiles) {
    copySource(sourceFile);
  }
  const payAssetsTsPath = join(tempTsDir, "pay/vantaPayAssets.ts");
  writeFileSync(
    payAssetsTsPath,
    readFileSync(payAssetsTsPath, "utf8")
      .replace(
        "// @ts-expect-error - Node-side Pay contract checks import sibling TypeScript sources directly.\n",
        "",
      )
      .replace('from "../tokens/vantaTokenCatalog.ts"', 'from "../tokens/vantaTokenCatalog"'),
  );

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((sourceFile) => join(tempTsDir, sourceFile)),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  const payAssetsPath = join(tempJsDir, "pay/vantaPayAssets.js");
  writeFileSync(
    payAssetsPath,
    readFileSync(payAssetsPath, "utf8").replace(
      'from "../tokens/vantaTokenCatalog"',
      'from "../tokens/vantaTokenCatalog.js"',
    ),
  );
}

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

try {
  compileSources();
  const catalog = await import(
    pathToFileURL(join(tempJsDir, "tokens/vantaTokenCatalog.js")).href
  );
  const payAssets = await import(pathToFileURL(join(tempJsDir, "pay/vantaPayAssets.js")).href);

  const symbols = catalog.listVantaTokenCatalogEntries().map((entry) => entry.symbol);
  assert(
    symbols.join("|") === "USDC|JTO|BONK|JUP|PYUSD|WIF|KMNO|SOL|USDT",
    "Expected canonical payment-suite token catalog order.",
  );

  const shieldSymbols = catalog.listVantaShieldFamilySymbols();
  assert(
    shieldSymbols.join("|") === "USDC|JTO|BONK|JUP|PYUSD|WIF|KMNO|SOL",
    "Expected shield family to contain the 8 shield tokens plus SOL.",
  );

  assert(
    payAssets.VANTA_PAY_ASSET_SYMBOLS.join("|") === "USDC|SOL|USDT",
    "Expected Pay accepted assets to be USDC, SOL, USDT.",
  );
  assert(payAssets.getVantaPayAssetDecimals("USDC") === 6, "Expected USDC Pay decimals.");
  assert(payAssets.getVantaPayAssetDecimals("USDT") === 6, "Expected USDT Pay decimals.");
  assert(payAssets.getVantaPayAssetDecimals("SOL") === 9, "Expected SOL Pay decimals.");

  const payTypes = readRepoFile("src/pay/vantaPayTypes.ts");
  assert(
    payTypes.includes('import type { VantaPayAsset } from "./vantaPayAssets.ts"'),
    "Expected VantaPayAsset to derive from shared Pay asset helper.",
  );

  const payRuntime = readRepoFile("src/pay/vantaPayRuntime.ts");
  assert(
    payRuntime.includes("VANTA_PAY_ASSET_SYMBOLS") &&
      payRuntime.includes("getVantaPayAssetDecimals"),
    "Expected Pay runtime to use shared Pay asset symbols and decimals.",
  );
  assert(
    !payRuntime.includes('acceptedAssets: ["USDC", "SOL", "USDT"]'),
    "Pay runtime must not hardcode accepted assets.",
  );

  const payOperator = readRepoFile("operator/pay-server.mjs");
  assert(
    payOperator.includes('"tokens/vantaTokenCatalog.ts"') &&
      payOperator.includes('"pay/vantaPayAssets.ts"') &&
      payOperator.includes("VANTA_PAY_ASSET_SYMBOLS") &&
      payOperator.includes("getVantaPayAssetDecimals"),
    "Expected Pay operator to compile and use shared Pay asset helper.",
  );
  assert(
    !payOperator.includes('new Set(["SOL", "USDC", "USDT"])') &&
      !payOperator.includes('new Set(["USDC", "SOL", "USDT"])'),
    "Pay operator must not hardcode supported assets.",
  );

  const payPage = readRepoFile("src/pages/PayPage.tsx");
  assert(
    payPage.includes("VANTA_PAY_ASSET_SYMBOLS") &&
      !payPage.includes('options={["USDC", "SOL", "USDT"]}'),
    "Pay page must use shared Pay asset options.",
  );

  const availability = readRepoFile("src/solana/tokenAvailability.ts");
  assert(
    availability.includes("operator-usdc-send") &&
      availability.includes("operator-usdc-sol") &&
      availability.includes("Route not ready yet"),
    "Expected token availability to preserve current live send/swap truth.",
  );
  assert(
    availability.includes("publicInput: VantaTokenCapabilityLane") &&
      availability.includes("shieldTarget: VantaTokenCapabilityLane") &&
      availability.includes("poolBackedPrivateAsset: VantaTokenCapabilityLane") &&
      availability.includes("unshield: VantaTokenActionAvailability"),
    "Expected token availability to expose the canonical routeable public input, configured shield target, pool-backed private asset, and unshield map.",
  );
  assert(
    availability.includes('"routeable-public-input"') &&
      availability.includes('"configured-shield-target"') &&
      availability.includes('"pool-backed-private-asset"'),
    "Expected token availability to name each canonical token capability boundary.",
  );
  assert(
    availability.includes("routeableShieldConfigured") &&
      availability.includes("const shieldExecutable = configured || (!entry.shieldFamily && routeableShieldConfigured)") &&
      availability.includes('mode: configured ? "direct-shield" : entry.shieldFamily ? "not-configured" : "route-to-shield"'),
    "Expected routeable public inputs such as USDT to be live Shield executable through a configured shield target.",
  );
  assert(
    availability.includes("operator-sol-unshield") &&
      availability.includes("operator-token-unshield"),
    "Expected token availability to distinguish SOL and token unshield operator lanes.",
  );

  console.log("token availability: PASS");
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}

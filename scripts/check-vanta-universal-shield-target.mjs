import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-universal-shield-target-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFile = "universalShieldTarget.ts";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const entries = [
  {
    asset: {
      assetKey: "VUSD",
      configured: true,
      mintAddress: "mint:vusd",
      priority: 0,
      symbol: "VUSD",
      vaultOwner: "vault",
    },
  },
  {
    asset: {
      assetKey: "USDC",
      configured: true,
      mintAddress: "mint:usdc",
      priority: 1,
      symbol: "USDC",
      vaultOwner: "vault",
    },
  },
  {
    asset: {
      assetKey: "BONK",
      configured: true,
      mintAddress: "mint:bonk",
      priority: 3,
      symbol: "BONK",
      vaultOwner: "vault",
    },
  },
];

try {
  mkdirSync(tempTsDir, { recursive: true });
  writeFileSync(
    join(tempTsDir, sourceFile),
    readFileSync(resolve(repoRoot, "src/solana", sourceFile), "utf8"),
  );

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      join(tempTsDir, sourceFile),
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

  const { selectUniversalShieldTarget } = await import(
    pathToFileURL(join(tempJsDir, "universalShieldTarget.js")).href
  );

  assert(
    selectUniversalShieldTarget({
      configuredEntries: entries,
      sourceAsset: { kind: "spl", mintAddress: "mint:bonk", symbol: "BONK" },
    })?.asset.assetKey === "BONK",
    "Expected configured SPL source to shield directly as itself.",
  );
  console.log("universal shield target direct SPL: PASS");

  assert(
    selectUniversalShieldTarget({
      configuredEntries: entries,
      sourceAsset: { kind: "spl", mintAddress: "mint:any-spl", symbol: "ANY" },
    })?.asset.assetKey === "USDC",
    "Expected arbitrary SPL source to route into USDC when USDC is configured.",
  );
  console.log("universal shield target arbitrary SPL: PASS");

  assert(
    selectUniversalShieldTarget({
      configuredEntries: entries.filter((entry) => entry.asset.assetKey !== "USDC"),
      sourceAsset: { kind: "spl", mintAddress: "mint:any-spl", symbol: "ANY" },
    })?.asset.assetKey === "VUSD",
    "Expected arbitrary SPL source to fall back to VUSD.",
  );
  console.log("universal shield target fallback: PASS");

  assert(
    selectUniversalShieldTarget({
      configuredEntries: [],
      sourceAsset: { kind: "spl", mintAddress: "mint:any-spl", symbol: "ANY" },
    }) === null,
    "Expected no target when no configured shield target exists.",
  );
  console.log("universal shield target unsupported: PASS");
} catch (error) {
  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

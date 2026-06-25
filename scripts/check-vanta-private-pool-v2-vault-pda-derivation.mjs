import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.equal(
  packageJson.scripts["private-pool-v2:vault-pda-derivation-check"],
  "node scripts/check-vanta-private-pool-v2-vault-pda-derivation.mjs",
);

const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-vault-pda-derivation-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFiles = ["vantaPrivatePoolV2VaultPdaDerivation.ts"];

try {
  mkdirSync(tempTsDir, { recursive: true });
  for (const file of sourceFiles) {
    writeFileSync(
      join(tempTsDir, file),
      readFileSync(resolve(repoRoot, "src/solana", file), "utf8"),
    );
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
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

  const {
    deriveVantaPrivatePoolV2VaultPdaBundle,
    getVantaPrivatePoolV2VaultPdaPolicy,
    NATIVE_SOL_VAULT_PDA_ASSET_ID_SENTINEL_HEX,
  } = await import(pathToFileURL(join(tempJsDir, "vantaPrivatePoolV2VaultPdaDerivation.js")).href);

  const poolState = "11111111111111111111111111111112";
  const programId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const bundle = deriveVantaPrivatePoolV2VaultPdaBundle({ poolState, programId });
  assert.equal(bundle.assetIdHex, NATIVE_SOL_VAULT_PDA_ASSET_ID_SENTINEL_HEX);
  assert.match(bundle.solVaultHolding.address, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  assert.match(bundle.vaultAssetRegistry.address, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  assert.match(bundle.splVaultAuthority.address, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

  const policy = getVantaPrivatePoolV2VaultPdaPolicy();
  assert.equal(policy.productionCustodyReady, false);
  assert.equal(policy.programOwnedVaultReady, false);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Vanta Private Pool v2 vault PDA derivation check: PASS");

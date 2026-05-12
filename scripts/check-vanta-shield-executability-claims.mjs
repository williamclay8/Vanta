import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const shieldConfig = readFileSync(new URL("../src/solana/shieldConfig.ts", import.meta.url), "utf8");
const shieldRegistry = readFileSync(
  new URL("../src/solana/useVantaShieldAssetRegistryState.ts", import.meta.url),
  "utf8",
);
const shieldPage = readFileSync(new URL("../src/pages/ShieldPage.tsx", import.meta.url), "utf8");
const solanaClient = readFileSync(new URL("../src/solana/client.ts", import.meta.url), "utf8");
const tokenAvailability = readFileSync(
  new URL("../src/solana/tokenAvailability.ts", import.meta.url),
  "utf8",
);
const walletAssets = readFileSync(
  new URL("../src/solana/useWalletPublicAssets.ts", import.meta.url),
  "utf8",
);
const publicRouteInputs = readFileSync(
  new URL("../src/solana/publicRouteInputAssets.ts", import.meta.url),
  "utf8",
);
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const shieldFamilyAssets = [
  "USDC",
  "USDT",
  "EURC",
  "USDS",
  "USX",
  "USD1",
  "JupUSD",
  "JTO",
  "BONK",
  "JUP",
  "PYUSD",
  "WIF",
  "KMNO",
];
const routeablePublicInputAssets = [
  "USDT",
  "EURC",
  "USDS",
  "USX",
  "USD1",
  "JupUSD",
  "CBBTC",
];

assert.ok(
  !shieldConfig.includes("MAINNET_SHIELD_VAULT_OWNER_FALLBACK") &&
    !shieldConfig.includes("7yUfwUmZMYLg95xJGR762z4WpqfR6hBRqt9mcgNArtdi"),
  "Mainnet shield deposits must not silently fall back to a hard-coded regular-wallet vault owner.",
);
assert.ok(
  (
    shieldConfig.includes('import.meta.env.PROD\n  ? "mainnet-beta"') ||
    shieldConfig.includes('export const vantaSolanaCluster: VantaSolanaCluster = "mainnet-beta"')
  ) &&
    (
      solanaClient.includes('import.meta.env.PROD\n  ? "mainnet-beta"') ||
      solanaClient.includes('export const solanaClusterLabel = "Mainnet"')
    ),
  "Production static builds must force mainnet so stale Render mainnet env cannot block real-wallet assets.",
);
assert.ok(
  shieldConfig.includes("VITE_VANTA_MAINNET_VAULT_OWNER") &&
    shieldConfig.includes("operator-configured-wallet") &&
    shieldConfig.includes("productionCustodyReady: false"),
  "Mainnet vault-owner env must be explicit and marked as beta operator-wallet custody.",
);
assert.ok(
  shieldConfig.includes("executable: Boolean(args.configuredMintAddress && configuredVaultOwner && !adapterRequired)"),
  "Shield token executable status must require both mint and concrete vault owner.",
);
assert.ok(
  shieldConfig.includes("program-vault-init-release-not-deployed") &&
    shieldConfig.includes("mainnet-vault-owner-not-configured"),
  "Shield execution blockers must distinguish missing vault owners from undeployed program-vault paths.",
);

for (const symbol of shieldFamilyAssets) {
  assert.ok(
    shieldConfig.includes(`assetKey: "${symbol}"`),
    `${symbol} must have a live shield token asset config.`,
  );
}

assert.ok(
  walletAssets.includes("listLiveShieldTokenAssets({ configuredOnly: false })"),
  "Wallet labels may recognize shield-family assets even before executable status.",
);
for (const symbol of routeablePublicInputAssets) {
  assert.ok(
    publicRouteInputs.includes(`symbol: "${symbol}"`),
    `${symbol} must be a recognized routeable public Shield input.`,
  );
}
assert.ok(
  walletAssets.includes("isKnownDirectShieldMint"),
  "Shield source options must stay limited to direct shield-family mints rather than arbitrary route inputs.",
);
assert.ok(
  shieldRegistry.includes("configuredEntries: entries.filter((entry) => entry.asset.executable)"),
  "Shield registry configured entries must expose only executable deposit targets to the Shield page.",
);
assert.ok(
  shieldPage.includes("(entry) => entry.asset.executable"),
  "Shield page target selection must filter by executable, not merely configured plus mint.",
);
assert.ok(
  !shieldPage.includes("(entry) => entry.asset.configured && entry.asset.mintAddress"),
  "Shield page must not treat configured-plus-mint as sufficient for live Shield execution.",
);
assert.ok(
  tokenAvailability.includes("asset.configured && Boolean(asset.mintAddress && asset.vaultOwner)"),
  "Token availability must keep Shield executable claims aligned to concrete mint plus vault owner.",
);
assert.equal(
  packageJson.scripts["shield:executability-claims-check"],
  "node scripts/check-vanta-shield-executability-claims.mjs",
  "package.json must expose shield:executability-claims-check.",
);
assert.equal(
  packageJson.scripts["shield:production-assets-check"],
  "node scripts/check-vanta-production-shield-assets.mjs",
  "package.json must expose shield:production-assets-check.",
);
assert.ok(
  packageJson.scripts["shield:verify"].includes("npm run shield:executability-claims-check"),
  "shield:verify must include shield:executability-claims-check.",
);
assert.ok(
  packageJson.scripts["shield:verify"].includes("npm run shield:production-assets-check"),
  "shield:verify must include shield:production-assets-check.",
);
assert.ok(
  packageJson.scripts["private-core:verify"].includes("npm run shield:executability-claims-check"),
  "private-core:verify must include shield:executability-claims-check.",
);
assert.ok(
  packageJson.scripts["private-core:verify"].includes("npm run shield:production-assets-check"),
  "private-core:verify must include shield:production-assets-check.",
);
assert.ok(
  packageJson.scripts["token-availability:check"].includes("npm run shield:executability-claims-check"),
  "token-availability:check must include shield:executability-claims-check.",
);

console.log("Vanta shield executability claims check: PASS");

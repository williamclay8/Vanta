import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const walletAssetsSource = readFileSync(
  resolve(repoRoot, "src/solana/useWalletPublicAssets.ts"),
  "utf8",
);
const shieldPageSource = readFileSync(resolve(repoRoot, "src/pages/ShieldPage.tsx"), "utf8");

const failures = [];

if (!walletAssetsSource.includes("listLiveShieldTokenAssets({ configuredOnly: false })")) {
  failures.push("Wallet public assets must label every known shield asset, even before it is executable.");
}

if (!walletAssetsSource.includes("formatUnknownWalletAssetLabel")) {
  failures.push("Wallet public assets must format unknown SPL tokens with a clear unknown-token label.");
}

if (walletAssetsSource.includes("label: known?.label ?? abbreviateMint(mintAddress)")) {
  failures.push("Unknown wallet token labels must not fall back to mint-only text.");
}

if (walletAssetsSource.includes("symbol: known?.symbol ?? abbreviateMint(mintAddress)")) {
  failures.push("Unknown wallet token symbols must not fall back to mint-only text.");
}

if (!shieldPageSource.includes("formatShieldSourceAssetOptionLabel")) {
  failures.push("Shield page must format source asset options through the human-readable label helper.");
}

if (!shieldPageSource.includes("asset.label")) {
  failures.push("Shield source asset options must include the asset name/label, not only the mint-derived symbol.");
}

if (shieldPageSource.includes("{asset.symbol}\n                      </option>")) {
  failures.push("Shield source asset options must not render only asset.symbol.");
}

if (failures.length > 0) {
  console.error("Vanta shield asset label check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta shield asset label check: PASS");

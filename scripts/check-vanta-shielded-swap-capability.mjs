import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const capabilitySource = readFileSync(
  resolve(repoRoot, "src/solana/shieldedSwapCapability.ts"),
  "utf8",
);
const swapPageSource = readFileSync(resolve(repoRoot, "src/pages/SwapPage.tsx"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

const requiredCapabilityMarkers = [
  "listShieldedSwapAssetOptions",
  "getShieldedSwapPairCapability",
  "operator-vusd-sol",
  "needs-private-route-adapter",
  "Shielded VUSD",
  "Shielded USDC",
  "Shielded JTO",
  "Shielded BONK",
  "Shielded JUP",
  "Shielded PYUSD",
  "Shielded WIF",
  "Shielded KMNO",
  "Shielded SOL",
];

const requiredPageMarkers = [
  "selectedSourceAsset",
  "selectedTargetAsset",
  "getShieldedSwapPairCapability",
  "listShieldedSwapAssetOptions",
  "sourcePairCapability",
  "This shielded pair needs a private route adapter before it can execute.",
];

const forbiddenPageMarkers = [
  'listExecutableShieldedAssets().filter((asset) => asset.symbol === "SOL")',
  "selectedShieldedSourceAsset",
  "disabled\n                      onChange",
];

const failures = [];

for (const marker of requiredCapabilityMarkers) {
  if (!capabilitySource.includes(marker)) {
    failures.push(`shieldedSwapCapability.ts missing marker: ${marker}`);
  }
}

for (const marker of requiredPageMarkers) {
  if (!swapPageSource.includes(marker)) {
    failures.push(`SwapPage.tsx missing marker: ${marker}`);
  }
}

for (const marker of forbiddenPageMarkers) {
  if (swapPageSource.includes(marker)) {
    failures.push(`SwapPage.tsx must not retain VUSD/SOL-only marker: ${marker}`);
  }
}

if (!packageSource.includes('"swap:capability-check"')) {
  failures.push("package.json must expose swap:capability-check.");
}

if (!packageSource.includes("npm run swap:capability-check")) {
  failures.push("private-core verification must include swap:capability-check.");
}

if (failures.length > 0) {
  console.error("Vanta shielded swap capability check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta shielded swap capability check: PASS");

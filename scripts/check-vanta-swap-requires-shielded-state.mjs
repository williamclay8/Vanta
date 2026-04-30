import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const swapPageSource = readFileSync(resolve(repoRoot, "src/pages/SwapPage.tsx"), "utf8");
const capabilitySource = readFileSync(
  resolve(repoRoot, "src/solana/shieldedSwapCapability.ts"),
  "utf8",
);
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

const forbiddenMarkers = [
  "PendingImplicitShieldSwap",
  "PendingPublicRoute",
  "pendingImplicitShieldSwap",
  "pendingPublicRoute",
  "publicRouteTransaction",
  "publicRouteWait",
  "implicitShieldStateTransaction",
  "implicit shield",
  "startImplicitShield",
  "buildPublicToUsdcSwapInstructions",
  "fetchPublicToUsdcQuote",
  "useWalletPublicAssets",
  "recordCanonicalShieldFromLiveShield",
  "createShieldMemoInstruction",
  "Vanta will shield",
  "automatically",
  "Routing public swap",
];

const requiredMarkers = [
  "From shielded asset",
  "Shield the exact",
  "selectedSourceAsset",
  "sourcePairCapability",
  "exactSpendableNote",
  "!isReady ||",
];

const failures = [];

for (const marker of forbiddenMarkers) {
  if (swapPageSource.includes(marker)) {
    failures.push(`Swap page must not contain auto-shield/public-route marker: ${marker}`);
  }
}

for (const marker of requiredMarkers) {
  if (!swapPageSource.includes(marker)) {
    failures.push(`Swap page missing shield-first marker: ${marker}`);
  }
}

if (!packageSource.includes('"swap:requires-shielded-state-check"')) {
  failures.push("package.json must expose swap:requires-shielded-state-check.");
}

if (!capabilitySource.includes("Shielded USDC")) {
  failures.push("Swap capability boundary must expose Shielded USDC.");
}

if (failures.length > 0) {
  console.error("Vanta swap shield-first check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta swap shield-first check: PASS");

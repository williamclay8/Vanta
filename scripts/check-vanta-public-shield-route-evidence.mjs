import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const publicSwapRouteSource = readFileSync(resolve(repoRoot, "src/solana/publicSwapRoute.ts"), "utf8");
const shieldPageSource = readFileSync(resolve(repoRoot, "src/pages/ShieldPage.tsx"), "utf8");

const requiredMarkers = [
  "createPublicShieldRouteEvidence",
  "provider: args.quote.venueName === \"Jupiter\" ? \"jupiter\" : \"meteora\"",
  "routeSignature",
  "targetAmount",
  "targetAsset: args.quote.outputAsset",
  "requestVantaPrivatePoolV2ProtocolSettlement",
  "shieldRouteEvidence: pendingProtocolSettlement.routeEvidence",
  "selectUniversalShieldTarget",
];

const failures = [];

for (const marker of requiredMarkers) {
  if (!publicSwapRouteSource.includes(marker) && !shieldPageSource.includes(marker)) {
    failures.push(`Missing public shield route evidence marker: ${marker}`);
  }
}

if (failures.length > 0) {
  console.error("Vanta public shield route evidence check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta public shield route evidence check: PASS");

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const activeCopyFiles = [
  "index.html",
  "src/pages/HomePage.tsx",
  "src/pages/DocsHomePage.tsx",
  "src/pages/DocsTrustPage.tsx",
  "src/pages/DocsSecurityPage.tsx",
  "src/pages/AppDashboardPage.tsx",
  "src/pages/ShieldPage.tsx",
  "src/pages/RecoverySettingsPage.tsx",
  "src/pages/SwapPage.tsx",
  "src/pages/SendPage.tsx",
  "src/pages/ReceiptVerificationPage.tsx",
  "src/components/AnonymityDepthDisclosure.tsx",
  "src/components/SendReceiptModal.tsx",
  "src/components/SwapReceiptModal.tsx",
  "src/components/UnshieldReceiptModal.tsx",
  "src/docs/docsContent.ts",
  "src/data/site.ts",
  "src/solana/swapTrustContract.ts",
  "src/solana/tokenAvailability.ts",
  "src/solana/shieldedSwapCapability.ts",
];

const avoidedPhrases = [
  "claims stay locked",
  "fully private",
  "production-private",
  "live mainnet-private",
  "live mainnet private",
  "production-ready",
];

const preferredPattern = /production privacy is not enabled/iu;

const failures = [];
let preferredPhraseCount = 0;

for (const file of activeCopyFiles) {
  const source = readFileSync(resolve(repoRoot, file), "utf8");
  const lowerSource = source.toLowerCase();

  for (const phrase of avoidedPhrases) {
    if (lowerSource.includes(phrase)) {
      failures.push(`${file}: contains avoided limitation phrase "${phrase}"`);
    }
  }

  if (preferredPattern.test(source)) {
    preferredPhraseCount += 1;
  }
}

if (preferredPhraseCount < 12) {
  failures.push(
    `Expected promoted caveat phrase in at least 12 active surfaces; found ${preferredPhraseCount}.`,
  );
}

if (failures.length > 0) {
  console.error("Vanta limitation-language caveat check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta limitation-language caveat check: PASS");
console.log(
  JSON.stringify(
    {
      scannedFiles: activeCopyFiles.length,
      avoidedPhraseCount: 0,
      preferredPhraseCount,
    },
    null,
    2,
  ),
);

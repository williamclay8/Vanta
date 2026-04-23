import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const sendPageSource = readFileSync(resolve(repoRoot, "src/pages/SendPage.tsx"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

const forbiddenMarkers = [
  "PendingImplicitShieldSend",
  "pendingImplicitShieldSend",
  "isImplicitShieldSendReady",
  "implicitShieldStateTransaction",
  "implicit shield",
  "You send shielded",
  "Vanta will shield the exact amount first, then send.",
  "supportedToken.send({",
];

const requiredMarkers = [
  "Shielded balance:",
  "<span>You send</span>",
  "Shielded VUSD",
  "Shielded USDC",
  'aria-label="Send shielded asset"',
  "Shield the asset first",
  "selectedSpendableNote",
  "disabled={isBetaMode || !isRealSendReady",
];

const failures = [];

for (const marker of forbiddenMarkers) {
  if (sendPageSource.includes(marker)) {
    failures.push(`Send page must not contain auto-shield marker: ${marker}`);
  }
}

for (const marker of requiredMarkers) {
  if (!sendPageSource.includes(marker)) {
    failures.push(`Send page missing shield-first marker: ${marker}`);
  }
}

if (!packageSource.includes('"send:requires-shielded-state-check"')) {
  failures.push("package.json must expose send:requires-shielded-state-check.");
}

if (failures.length > 0) {
  console.error("Vanta send shield-first check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta send shield-first check: PASS");

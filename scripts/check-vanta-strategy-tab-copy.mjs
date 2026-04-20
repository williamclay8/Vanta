import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const pageSource = readFileSync(resolve(repoRoot, "src/pages/StrategyPage.tsx"), "utf8");
const appSource = readFileSync(resolve(repoRoot, "src/App.tsx"), "utf8");
const layoutSource = readFileSync(resolve(repoRoot, "src/components/AppLayout.tsx"), "utf8");

const requiredCopy = [
  "Strategy",
  "Stealth DCA",
  "Private TWAP",
  "Create strategy",
  "You want to",
  "Asset",
  "Amount",
  "Duration",
  "Custom duration",
  "Advanced settings",
  "Slice policy",
  "Timing policy",
  "Urgency",
  "Max slippage",
  "Landing mode",
  "Destination",
  "Fund from",
  "Active Strategies",
  "Recent Fills",
  "Private Holdings",
  "Execution preview",
  "Live submission off",
  "Jupiter",
  "Jito",
  "Protected landing",
  "Private balance",
  "reduced on-chain observability",
];

const bannedCopy = [
  "ETA",
  "confidential pending balance",
  "note commitment",
  "ownership metadata leakage",
  "UTXO",
  "ZK",
  "obfuscation",
  "completely invisible whale buying",
];

const failures = [];

for (const text of requiredCopy) {
  if (!pageSource.includes(text)) {
    failures.push(`Missing Strategy tab copy: ${text}`);
  }
}

if (!appSource.includes('path="strategy"')) {
  failures.push('Missing /app/strategy route in src/App.tsx');
}

if (!layoutSource.includes('/app/strategy') || !layoutSource.includes('label: "Strategy"')) {
  failures.push("Missing Strategy tab in src/components/AppLayout.tsx");
}

for (const text of bannedCopy) {
  if (pageSource.includes(text)) {
    failures.push(`Banned Strategy tab copy found: ${text}`);
  }
}

if (failures.length > 0) {
  console.error("Strategy tab copy check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Strategy tab copy check: PASS");

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(repoRoot, "src/pages/PayPage.tsx"), "utf8");

const requiredCopy = [
  "Create payment link",
  "Send invoice",
  "Checkout",
  "Withdraw",
  "Payment Link",
  "Invoice",
  "Amount",
  "Asset",
  "Pay with Vanta",
  "Privacy rail in review",
  "Receipt included",
];

const bannedCopy = [
  "$800.00",
  "$8,420.50",
  "R-1052",
  "vanta.link/design-retainer",
  "Vanta Studio",
  "Private payments with a familiar interface",
  "Pay Dashboard",
  "Install Vanta Pay",
  "Hosted checkout",
  "Embedded checkout",
  "API-driven checkout",
  "Payments Dashboard",
  "Payments Landing Page",
  "Pay Privately",
  "Private by default",
  "Shield",
  "Unshield",
  "Note commitment",
  "ZK",
  "UTXO",
  "Private state",
  "Obfuscation",
  "Confidential execution",
];

const failures = [];

for (const text of requiredCopy) {
  if (!source.includes(text)) {
    failures.push(`Missing Pay tab copy: ${text}`);
  }
}

for (const text of bannedCopy) {
  if (source.includes(text)) {
    failures.push(`Banned Pay tab copy found: ${text}`);
  }
}

if (failures.length > 0) {
  console.error("Pay tab commerce-copy check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Pay tab commerce-copy check: PASS");

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const copySourcePaths = [
  "src/pages/PayPage.tsx",
  "src/pay/vantaPayMerchantCommandCenter.ts",
];
const source = copySourcePaths
  .filter((path) => existsSync(resolve(repoRoot, path)))
  .map((path) => readFileSync(resolve(repoRoot, path), "utf8"))
  .join("\n");

const requiredPageCopy = [
  "Vanta Pay preview",
  "Create a payment request",
  "Build a checkout preview, review the transaction, and copy a test link.",
  "Beta preview",
  "No funds move in beta mode",
  "Production privacy claims are not enabled yet.",
  "Request builder",
  "Payment details",
  "Create a test checkout session before any live approval or settlement.",
  "Description",
  "Amount",
  "Asset",
  "Customer email",
  "Checkout type",
  "Hosted checkout",
  "Embedded checkout",
  "Modal checkout",
  "Create preview request",
  "Private rail receipt required before completion.",
  "Review payment",
  "Test link",
  "Preview ready",
  "Receipt path preview pending",
  "Transaction status",
  "Preview",
  "Approve",
  "Execute",
  "Settle",
  "Approval, execution, and settlement are locked in beta.",
  "Local operator preview",
  "Payment record",
  "Next actions",
  "Copy test link",
  "Preview checkout",
  "View receipt",
  "Prepare refund",
  "Prepare withdrawal",
  "Payment records",
  "No preview checkout created yet.",
  "Payment links",
  "Invoices",
  "Refunds",
  "Withdrawals",
  "Reconciliation",
  "Subscriptions",
  "Trust rail",
  "Operations",
  "Vanta Pay is a preview.",
  "It is not a production payment processor",
  "privacy guarantee.",
];

const bannedCopy = [
  "0 monthly fee",
  "0.25%",
  "Success fee",
  "Monthly fee",
  "Network fees",
  "Off-ramp fees",
  "No hidden platform fee",
  "monthly SaaS",
  "Platform fee",
  "All fees buy back the token",
  "All fees go to VANTA",
  "$800.00",
  "$8,420.50",
  "R-1052",
  "vanta.link/design-retainer",
  "Vanta Studio",
  "Private payments with a familiar interface",
  "Pay Dashboard",
  "Install Vanta Pay",
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
  "Merchant settlement operations",
  "Merchant control plane",
  "Merchant operations",
  "Merchant balances and pending work",
  "Policy-legible settlement preview",
  "Approval boundary",
  "Trust packet",
  "What is private",
  "What is visible",
  "Policy mode",
  "Available balances",
  "Refund queue",
  "Withdrawal queue",
  "Reconciliation export",
  "Open workflow",
  "Create a shareable payment link",
  "Send invoice",
  "Withdraw funds",
  "Pay with Vanta",
  "Payment submitted",
  "Payment completed",
  "Funds settled",
  "funds available",
  "mainnet-ready",
  "production processor",
  "live settlement",
  "audited privacy",
  "Pricing",
  "No billing starts from checkout preview alone.",
];

const bannedCopyPatterns = [
  /\bfee(s)?\b/i,
  /\bbilling\b/i,
  /\bpricing\b/i,
];

const failures = [];

for (const text of requiredPageCopy) {
  if (!source.includes(text)) {
    failures.push(`Missing Pay tab copy: ${text}`);
  }
}

for (const text of bannedCopy) {
  if (source.includes(text)) {
    failures.push(`Banned Pay tab copy found: ${text}`);
  }
}

for (const pattern of bannedCopyPatterns) {
  if (pattern.test(source)) {
    failures.push(`Banned Pay tab copy pattern found: ${pattern}`);
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

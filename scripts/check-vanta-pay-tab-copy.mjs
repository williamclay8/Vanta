import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const copySourcePaths = [
  "src/pages/PayPage.tsx",
  "src/components/PayReceiptPacketCard.tsx",
  "src/pay/vantaPayMerchantCommandCenter.ts",
];
const source = copySourcePaths
  .filter((path) => existsSync(resolve(repoRoot, path)))
  .map((path) => readFileSync(resolve(repoRoot, path), "utf8"))
  .join("\n");

const requiredPageCopy = [
  "Vanta Pay",
  "Test mode",
  "Pay",
  "Create payment request",
  "Checkout session created",
  "Generate test receipt",
  "Payment record completed",
  "Local test private-rail receipt generated",
  "No production funds moved.",
  "Test receipt only.",
  "Request builder",
  "Payment details",
  "Create a test payment request before live approval or production settlement.",
  "Description",
  "Amount",
  "Asset",
  "Advanced payment settings",
  "Customer email",
  "Checkout type",
  "Hosted checkout",
  "Embedded checkout",
  "Modal checkout",
  "Creates a test payment request. Completion generates a local receipt packet for review.",
  "Review payment",
  "Buyer preview link",
  "Checkout mode",
  "Checkout session",
  "Client token",
  "TransactionStatusToast",
  "Transaction status",
  "Preview",
  "Approve",
  "Execute",
  "Settle",
  "Live approval and execution are locked in beta.",
  "Local operator harness",
  "Payment record",
  "Next actions",
  "Copy test link",
  "Preview checkout",
  "View receipt",
  "Issue test refund",
  "Create test withdrawal",
  "Local test refund prepared",
  "Local test withdrawal prepared",
  "Payment records",
  "Receipt packet",
  "Receipt packet ready",
  "Receipt packet pending",
  "Visible to merchant",
  "Visible to buyer",
  "Kept private",
  "Verified by",
  "Proof receipt ID",
  "No test payment request created yet.",
  "Buyer preview links",
  "Invoices",
  "Refunds",
  "Withdrawals",
  "Reconciliation",
  "Subscriptions",
  "Trust rail",
  "Production privacy is not enabled.",
  "Operations",
  "Vanta Pay is in test mode.",
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
  "Production-ready",
  "Mainnet-ready",
  "Live mainnet private settlement",
  "Paid privately",
  "Private transaction complete",
  "Fully private",
  "Anonymous payments",
  "Untraceable settlement",
  "Safe for real user funds",
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

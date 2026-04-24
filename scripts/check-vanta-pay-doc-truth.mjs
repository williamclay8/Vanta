import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const docChecks = [
  {
    path: "docs/pay-merchant-trust-surface.md",
    required: [
      "Current truth: `/app/pay` is a test-mode merchant checkout cockpit, not a finished production payments network.",
      "show receipt-backed test payment records when the local/operator harness records a private rail receipt",
      "Production privacy claims are not enabled yet. Test-mode completion is not the same as live mainnet private payment readiness.",
      "test-mode checkout session handling",
      "receipt-backed test payment records from the local/operator harness",
      "`Payment details`, `Description`, `Amount`, `Asset`, `Customer email`, `Checkout type`, and `Review payment`",
      "subscriptions, refunds, withdrawals, reconciliation, developer controls",
      "keys, and signed webhooks",
      "Checkout session, client token, receipt-backed test payment record, and locked",
      "merchant API, status, approval packet, refunds, withdrawals, reconciliation, payment links, invoices, and webhook delivery still live in the Pay backend and verification commands",
    ],
  },
  {
    path: "README.md",
    required: [
      "a `/app/pay` Vanta Pay Suite preview focused on payment creation, hosted/embedded/modal checkout modes, payment links, invoices, subscriptions, refunds, withdrawals, reconciliation, developer controls, route preview, receipt preview, transaction evidence, and beta state",
      "Pay with Vanta",
      "0 monthly fee",
      "0.25%` only when a supported action completes successfully",
      "network, off-ramp, and third-party execution costs stay separate when they apply",
      "Net Vanta-collected fees are reserved for ecosystem growth, including supply buybacks, marketing, operator infrastructure, security, and product development.",
    ],
  },
  {
    path: "SUBMISSION.md",
    required: [
      "The Pay demo focuses on a simple merchant question",
      "payment creation, checkout modes, payment links, invoices, subscriptions, refunds, withdrawals, reconciliation, developer controls, route preview, receipt preview, transaction evidence, and beta disabled state",
      "0 monthly fee",
      "0.25%` only when a supported action completes successfully",
      "utility-first",
      "Net Vanta-collected fees are reserved for ecosystem growth, including supply buybacks, marketing, operator infrastructure, security, and product development.",
    ],
  },
];

const failures = [];

for (const doc of docChecks) {
  const source = readFileSync(resolve(repoRoot, doc.path), "utf8");
  for (const text of doc.required) {
    if (!source.includes(text)) {
      failures.push(`Missing doc truth marker in ${doc.path}: ${text}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Vanta Pay doc truth check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta Pay doc truth check: PASS");

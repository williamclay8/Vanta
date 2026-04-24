import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const docChecks = [
  {
    path: "docs/pay-merchant-trust-surface.md",
    required: [
      "the default `/app/pay` surface is now a Vanta Pay Suite preview",
      "`Payment details`, `What are you collecting for?`, `Amount`, `Asset`, `Customer email`, and `Review payment`",
      "hosted checkout, embedded checkout, modal checkout, payment links, invoices, subscriptions, refunds, withdrawals, reconciliation, developer controls, API keys, and signed webhooks",
      "payment route preview, receipt path preview, transaction evidence, and beta disabled state remain visible",
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
    ],
  },
  {
    path: "SUBMISSION.md",
    required: [
      "The Pay demo now opens on a Vanta Pay Suite preview",
      "payment creation, checkout modes, payment links, invoices, subscriptions, refunds, withdrawals, reconciliation, developer controls, route preview, receipt preview, transaction evidence, and beta disabled state",
      "0 monthly fee",
      "0.25%` only when a supported action completes successfully",
      "utility-first",
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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const docChecks = [
  {
    path: "docs/pay-merchant-trust-surface.md",
    required: [
      "default `/app/pay` surface",
      "a trust packet with `What is private`, `What is visible`, `Policy mode`, and `Approval boundary`",
      "workflow entry points for creating links, sending invoices, previewing checkout, and withdrawing funds",
      "fresh Pay runtime state",
      "merchant operations and approval boundary copy",
      "refund / withdrawal / reconciliation detail states",
      "runtime-backed empty-state console cards for balances, refund queue, withdrawal queue, and reconciliation export",
    ],
  },
  {
    path: "README.md",
    required: [
      "runtime-backed empty-state cards for balances, refund queue, withdrawal queue, and reconciliation export",
      "preview -> approve -> execute -> settle",
      "Pay with Vanta",
      "0 monthly fee",
      "0.25%` only when a supported action completes successfully",
      "network, off-ramp, and third-party execution costs stay separate when they apply",
    ],
  },
  {
    path: "SUBMISSION.md",
    required: [
      "runtime-backed empty-state console cards for balances, refund queue, withdrawal queue, and reconciliation export",
      "preview -> approve -> execute -> settle",
      "Merchant pilot",
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

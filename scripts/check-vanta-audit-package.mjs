import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const auditPath = resolve(repoRoot, "docs/audit-package.md");

if (!existsSync(auditPath)) {
  throw new Error("Missing docs/audit-package.md.");
}

const source = readFileSync(auditPath, "utf8");
const requiredPhrases = [
  "# Vanta Audit Package",
  "Scope",
  "Actual-private settlement",
  "Intake Packets",
  "ops/mainnet/audit-review.packet.template.json",
  "ops/mainnet/legal-compliance-custody.packet.template.json",
  "ops/mainnet/production-key-custody.template.json",
  "Out of scope",
  "Circuit review",
  "actual-private spend public transcripts include the asset-id commitment",
  "Operator review",
  "Browser and wallet review",
  "Custody and key-management review",
  "Known non-production boundaries",
  "npm run audit:handoff-check",
  "npm run audit:package-check",
  "npm run mainnet:preflight",
  "npm run mainnet:external-gates-check",
  "npm run mainnet:storage-contract-check",
  "npm run mainnet:storage-migration-check",
  "npm run storage:adapter-check",
  "npm run mainnet:abuse-observability-check",
  "npm run ops:rate-limit-check",
  "npm run nullifier:replay-guard-check",
  "npm run private-core:verify",
  "npm run private-pool-v2:verify",
  "npm run pay:verify",
  "npm run wallet:transaction-safety-check",
  "npm run mainnet:secret-handling-check",
  "Production database",
  "external mainnet gates packet",
  "references-only launch evidence",
  "privacy-preserving telemetry",
  "No audit claim",
  "No mainnet funds",
];

for (const phrase of requiredPhrases) {
  if (!source.includes(phrase)) {
    throw new Error(`docs/audit-package.md is missing required phrase: ${phrase}`);
  }
}

console.log("Vanta audit package check: PASS");

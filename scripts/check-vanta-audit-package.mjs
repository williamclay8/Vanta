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
  "Public discovery",
  "/.well-known/vanta-audit.json",
  "refs-only public discovery",
  "auditClaimAllowed: false",
  "productionReady: false",
  "mainnetReady: false",
  "npm run public:audit-discovery-check",
  "Out of scope",
  "Circuit review",
  "C01 verifier/backend review",
  "docs/zk/c01-production-verifier-backend-decision.md",
  "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
  "proof-format, production verifying-key, verifier-adapter, positive/negative test, SBF/live-lineage, and audit/reviewer evidence",
  "offchain-remote-proof-artifact-only",
  "solana-c01-groth16-verifier-ready",
  "Groth16 tag-3 Solana verifier path",
  "Noir/bb.js/UltraHonk adaptation path",
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
  "npm run zk:feedback-loop-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "npm run zk:c01-verifier-backend-decision-check",
  "npm run private-pool-v2:remote-proof-artifact-boundary-check",
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

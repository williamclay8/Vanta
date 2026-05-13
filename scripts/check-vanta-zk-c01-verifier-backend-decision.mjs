import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(relativePath) {
  const path = resolve(repoRoot, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Missing ${relativePath}.`);
  }

  return readFileSync(path, "utf8");
}

function fail(message) {
  console.error(`Vanta ZK C01 verifier backend decision: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function includes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

function rejects(source, marker, label) {
  assert(!source.includes(marker), `${label} still contains stale marker: ${marker}`);
}

const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const runbookPath = "docs/operator-runbook.md";
const auditPath = "docs/audit-package.md";
const decision = read(decisionPath);
const review = read(reviewPath);
const runbook = read(runbookPath);
const audit = read(auditPath);
const packageJson = JSON.parse(read("package.json"));
const ledger = JSON.parse(read("VANTA_ZK_REVIEW.findings.json"));
const c01 = ledger.findings.find((finding) => finding.id === "VANTA-ZK-2026-05-09-C01");

assert(c01, "missing C01 finding");
assert(c01.status === "partial", "C01 must stay partial while no production verifier backend is selected");

for (const marker of [
  "# C01 Production Verifier Backend Decision",
  "Status: no production verifier backend selected yet",
  "Groth16 Tag-3 Solana Verifier Path",
  "Noir/bb.js/UltraHonk Adaptation Path",
  "offchain-remote-proof-artifact-only",
  "solana-c01-groth16-verifier-ready",
  "solana-c01-tag3-groth16-v0",
  "verifierKeyHash:32",
  "groth16Proof:256",
  "custom error `14`",
  "ERR_PROOF_VERIFIER_NOT_WIRED",
  "production-verifying-key-hash",
  "local-acir-bytecode-hash-not-production-vk",
  "not proof that the root transition is correct",
  "program-owned shared Merkle tree",
  "Do not mark C01 verified-local",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "npm run zk:c01-verifier-backend-options-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run private-pool-v2:remote-proof-artifact-boundary-check",
  "Backend Options Evidence",
  "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json",
  "Groth16 Proof-Format Candidate packet",
  "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json",
  "blocked-no-groth16-production-proof-format-artifact",
  "Production Verifying-Key Candidate packet",
  "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json",
  "blocked-no-production-verifying-key-hash-artifact",
  "groth16-tag3-solana-v0",
  "noir-bb-ultrahonk-adaptation",
]) {
  includes(decision, marker, decisionPath);
}

for (const marker of [
  "docs/zk/c01-production-verifier-backend-decision.md",
  "no production verifier backend is selected yet",
  "Groth16 tag-3 Solana verifier path",
  "Noir/bb.js/UltraHonk adaptation path",
  "npm run zk:c01-verifier-backend-decision-check",
  "TAG_INIT = 0",
  "TAG_SPEND = 1",
  "TAG_REGISTER_ROOT = 2",
  "TAG_SPEND_WITH_PROOF = 3",
  "TAG_REGISTER_PROVENANCED_ROOT = 4",
  "TAG_UNSHIELD = 6",
  "custom error `14`",
  "custom error `15`",
]) {
  includes(review, marker, reviewPath);
}
rejects(review, "only exposes `TAG_INIT` and `TAG_SPEND`", reviewPath);

for (const source of [runbook, audit]) {
  includes(source, decisionPath, "C01 verifier backend handoff docs");
  includes(source, "npm run zk:feedback-loop-check", "C01 feedback-loop command handoff");
  includes(
    source,
    "npm run zk:c01-production-verifier-backend-candidate-check",
    "C01 verifier-ready candidate guard handoff",
  );
  includes(
    source,
    "npm run zk:c01-production-verifying-key-candidate-check",
    "C01 production verifying-key candidate guard handoff",
  );
  includes(source, "offchain-remote-proof-artifact-only", "C01 offchain-only truth handoff");
  includes(source, "solana-c01-groth16-verifier-ready", "C01 verifier-ready overclaim handoff");
}

assert(
  packageJson.scripts?.["zk:c01-verifier-backend-decision-check"] ===
    "node scripts/check-vanta-zk-c01-verifier-backend-decision.mjs",
  "package.json must expose zk:c01-verifier-backend-decision-check",
);
assert(
  packageJson.scripts?.["zk:c01-verifier-backend-options-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-backend-options.mjs",
  "package.json must expose zk:c01-verifier-backend-options-check",
);
assert(
  packageJson.scripts?.["zk:c01-groth16-proof-format-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-groth16-proof-format-candidate.mjs",
  "package.json must expose zk:c01-groth16-proof-format-candidate-check",
);
assert(
  packageJson.scripts?.["zk:c01-production-verifying-key-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-verifying-key-candidate.mjs",
  "package.json must expose zk:c01-production-verifying-key-candidate-check",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes("npm run zk:c01-verifier-backend-decision-check"),
  "zk:review-guards-check must include the C01 verifier backend decision guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes("npm run zk:c01-verifier-backend-options-check"),
  "zk:review-guards-check must include the C01 verifier backend-options guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-groth16-proof-format-candidate-check",
  ),
  "zk:review-guards-check must include the C01 Groth16 proof-format candidate guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-production-verifying-key-candidate-check",
  ),
  "zk:review-guards-check must include the C01 production verifying-key candidate guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes("npm run zk:c01-verifier-backend-decision-check"),
  "zk:feedback-loop-check must include the C01 verifier backend decision guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes("npm run zk:c01-verifier-backend-options-check"),
  "zk:feedback-loop-check must include the C01 verifier backend-options guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-groth16-proof-format-candidate-check",
  ),
  "zk:feedback-loop-check must include the C01 Groth16 proof-format candidate guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-production-verifying-key-candidate-check",
  ),
  "zk:feedback-loop-check must include the C01 production verifying-key candidate guard",
);

console.log("Vanta ZK C01 verifier backend decision: PASS");

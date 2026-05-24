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

function sectionBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  assert(start >= 0, `${label} missing start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(end > start, `${label} missing end marker: ${endMarker}`);
  return source.slice(start, end);
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
assert(c01.status === "partial", "C01 must stay partial while selected backend production evidence is absent");

for (const marker of [
  "# C01 Production Verifier Backend Decision",
  "Status: `groth16-tag3-solana-v0` is selected as the C01 production verifier backend direction.",
  "Groth16 Tag-3 Solana Verifier Path",
  "Noir/bb.js/UltraHonk Adaptation Path",
  "offchain-remote-proof-artifact-only",
  "solana-c01-groth16-verifier-ready", // blocked promotion marker
  "solana-c01-tag3-groth16-v0",
  "verifierKeyHash:32",
  "gnarkProof:324",
  "gnarkPublicWitness:44",
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
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "npm run private-pool-v2:remote-proof-artifact-boundary-check",
  "Backend Options Evidence",
  "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json",
  "Groth16 Proof-Format Candidate packet",
  "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json",
  "blocked-no-groth16-production-proof-format-artifact",
  "Production Groth16 Toolchain Preflight packet",
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json",
  "blocked-local-toolchain-no-groth16-scheme",
  "npm run zk:c01-production-groth16-toolchain-preflight-check",
  "Sunspot/Gnark Route packet",
  "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json",
  "blocked-sunspot-toolchain-not-installed-and-no-production-trusted-setup",
  "blocked-local-nargo-version-mismatch-and-sunspot-missing",
  "Sunspot's upstream README requires Noir/Nargo `1.0.0-beta.18`",
  "nargo 1.0.0-beta.19",
  "compatible pinned/reviewed toolchain",
  "npm run zk:c01-sunspot-groth16-route-check",
  "C01 Sunspot/Gnark artifact acquisition packet",
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json",
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "C01 production verifier artifact request packet",
  "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json",
  "ready-for-external-production-verifier-artifact-request-blocked",
  "npm run zk:c01-production-verifier-artifact-request-check",
  "artifact producer",
  "production proof-format/VK/public-witness",
  "mutation/no-mutation",
  "C01 beta18 source-migration candidate packet",
  "ops/mainnet/private-pool-v2-c01-beta18-source-migration-candidate.evidence.json",
  "npm run zk:c01-beta18-source-migration-candidate-check",
  "blocked-no-reviewed-beta18-source-migration",
  "pre-H6 and comparison-only",
  "reviewed source migration",
  "computed_context_hash == context_hash",
  "C01 beta18 H6 migration probe packet",
  "ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json",
  "npm run zk:c01-beta18-h6-migration-probe-check",
  "local-h6-beta18-migration-probe-succeeded-nonproduction-unsafe-setup",
  "public witness matches the current H6 proof receipt",
  "C01 beta18 H6 source-migration review packet",
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json",
  "npm run zk:c01-beta18-h6-source-migration-review-check",
  "reviewable-beta18-h6-source-migration-candidate-local-only",
  "poseidon-import-path-only",
  "C01 beta18 H6 source-review acceptance gate",
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance.template.json",
  "npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
  "VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-refs-only-json>",
  "blocked-no-external-source-review-acceptance",
  "C01 verifier-adapter acceptance gate",
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json",
  "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json>",
  "blocked-no-production-verifier-adapter-acceptance",
  "Production Artifact Acceptance Gate packet",
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json",
  "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-refs-only-json> npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "blocked-no-reviewed-production-artifact-bundle",
  "current source ACIR hash",
  "external source-review acceptance",
  "current H6 proof receipt public input and commitment",
  "rather than passing by byte lengths alone",
  "C01 SBF/live lineage candidate packet",
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json",
  "npm run zk:c01-sbf-live-lineage-candidate-check",
  "blocked-no-rebuilt-redeployed-reinitialized-live-lineage",
  "C01 SBF/live lineage acceptance gate",
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json",
  "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json>",
  "blocked-no-sbf-live-lineage-acceptance",
  "not SBF/live lineage",
  "C01 audit/reviewer acceptance gate",
  "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json",
  "npm run zk:c01-audit-reviewer-acceptance-gate-check",
  "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json>",
  "blocked-no-audit-reviewer-acceptance",
  "C01 verifier evidence closure gate",
  "ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json",
  "npm run zk:c01-verifier-evidence-closure-gate-check",
  "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-bundle-json>",
  "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-adapter-json>",
  "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-lineage-json>",
  "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-audit-json>",
  "blocked-no-complete-c01-verifier-evidence-chain",
  "C01 external reviewer handoff packet",
  "ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json",
  "npm run zk:c01-external-review-handoff-check",
  "ready-for-external-c01-verifier-review-handoff-blocked",
  "source-review acceptance",
  "deterministic production artifact build",
  "production artifact bundle",
  "verifier-adapter acceptance",
  "SBF/live lineage acceptance",
  "audit/reviewer acceptance",
  "composite evidence-chain closure",
  "C01 Sunspot/Gnark local dev probe",
  "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json",
  "npm run zk:c01-sunspot-groth16-dev-probe-check",
  "local-dev-probe-succeeded-nonproduction-unsafe-setup-and-beta18-source-shim",
  "generated standalone Solana verifier",
  "324-byte proof plus 44-byte public witness",
  "gnark-solana-native-proof-and-public-witness-v0",
  "rejects the legacy 256-byte proof-only shape",
  "one public input",
  "zero public and zero secret inputs",
  "C01 local public-witness binding observation",
  "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json",
  "npm run zk:c01-public-witness-binding-check",
  "local-public-witness-decoded-stale-against-current-proof-receipt",
  "stale against the current H6 Noir/bb receipt",
  "local beta18 compiled ACIR does not match the current source ACIR hash",
  "current H6 proof receipt public input and commitment before production public-input binding can promote",
  "not production public-input binding evidence",
  "Production Verifying-Key Candidate packet",
  "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json",
  "blocked-no-production-verifying-key-hash-artifact",
  "Verifier Adapter Acceptance-Test Candidate packet",
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "blocked-no-verifier-adapter-acceptance-tests",
  "local fail-closed verifier adapter seam harness",
  "npm run zk:c01-verifier-adapter-seam-check",
  "separate tag-3 preflight, default adapter rejection, and verified-commit helper boundaries",
  "368-byte proof-plus-public-witness verifier instruction-data assembly",
  "source public-witness binding precheck against `publicInputHash`",
  "dedicated read-only executable verifier-program account",
  "generated Solana verifier CPI instruction with no account metas",
  "data equal to `gnarkProof || gnarkPublicWitness`",
  "on-chain-only verifier CPI hook",
  "host-side Solana syscall stubs remain fail-closed",
  "test-only selected-Gnark valid-mutation / invalid-proof / wrong-public-input / wrong-verifying-key no-mutation shape coverage",
  "324-byte proof plus 44-byte public-witness tuple",
  "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
  "local unsafe generated-verifier CPI harness",
  "accepts the local unsafe H6 proof/public-witness tuple",
  "rejects a tampered proof without mutation",
  "rejects a wrong public input hash without mutation",
  "rejects a wrong executable verifier program without mutation",
  "rejects a wrong-verifying-key local unsafe path",
  "not tag-3 production proof acceptance",
  "local drift-prevention only",
  "not verifier-adapter acceptance",
  "valid-proof mutation",
  "invalid-proof no-mutation",
  "wrong-public-input no-mutation",
  "wrong-verifying-key no-mutation",
  "Positive Proof-Verified Claim Gate packet",
  "ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json",
  "npm run zk:c01-positive-proof-verified-claim-gate-check",
  "groth16-tag3-solana-v0",
  "noir-bb-ultrahonk-adaptation",
]) {
  includes(decision, marker, decisionPath);
}

for (const marker of [
  "docs/zk/c01-production-verifier-backend-decision.md",
  "groth16-tag3-solana-v0",
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

const w6ReviewSection = sectionBetween(
  review,
  "### W6. The proof verifier on Solana",
  "### W7. Replace the local prover",
  "VANTA_ZK_REVIEW W6 section",
);
for (const marker of [
  "Groth16 + Light is now the selected backend direction, not verifier readiness",
  "docs/zk/c01-production-verifier-backend-decision.md",
  "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json",
  "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json",
  "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json",
  "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json",
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "npm run zk:c01-sbf-live-lineage-candidate-check",
  "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "npm run zk:c01-verifier-adapter-seam-check",
  "local fail-closed verifier adapter seam harness",
  "not verifier-adapter acceptance",
  "selectedBackend: \"groth16-tag3-solana-v0\"",
  "local-acir-bytecode-hash-not-production-vk",
  "not production proof-format evidence",
  "blocked-local-toolchain-no-groth16-scheme",
  "blocked-sunspot-toolchain-not-installed-and-no-production-trusted-setup",
  "blocked-local-nargo-version-mismatch-and-sunspot-missing",
  "local-dev-probe-succeeded-nonproduction-unsafe-setup-and-beta18-source-shim",
  "Sunspot/Nargo compatibility blocker",
  "nargo 1.0.0-beta.19",
  "C01 production artifact H6 binding gate",
    "current source ACIR hash",
    "cannot promote by byte lengths alone",
    "ops/mainnet/private-pool-v2-c01-beta18-source-migration-candidate.evidence.json",
    "ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json",
    "npm run zk:c01-beta18-h6-migration-probe-check",
    "local-h6-beta18-migration-probe-succeeded-nonproduction-unsafe-setup",
    "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json",
    "npm run zk:c01-beta18-h6-source-migration-review-check",
    "reviewable-beta18-h6-source-migration-candidate-local-only",
    "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json",
    "npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
    "blocked-no-external-source-review-acceptance",
    "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json",
    "npm run zk:c01-deterministic-production-artifact-build-check",
    "blocked-no-deterministic-production-artifact-build-receipt",
    "C01 verifier-adapter acceptance gate",
    "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json",
    "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json",
    "npm run zk:c01-verifier-adapter-acceptance-gate-check",
    "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json>",
    "blocked-no-production-verifier-adapter-acceptance",
    "C01 SBF/live lineage acceptance gate",
    "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json",
    "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json",
    "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
    "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json>",
    "blocked-no-sbf-live-lineage-acceptance",
    "C01 audit/reviewer acceptance gate",
    "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json",
    "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json",
    "npm run zk:c01-audit-reviewer-acceptance-gate-check",
    "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json>",
    "blocked-no-audit-reviewer-acceptance",
    "C01 verifier evidence closure gate",
    "ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json",
    "npm run zk:c01-verifier-evidence-closure-gate-check",
    "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-bundle-json>",
    "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-adapter-json>",
    "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-lineage-json>",
    "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-audit-json>",
    "blocked-no-complete-c01-verifier-evidence-chain",
    "C01 external reviewer handoff packet",
    "ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json",
    "npm run zk:c01-external-review-handoff-check",
    "ready-for-external-c01-verifier-review-handoff-blocked",
    "C01 production verifier artifact request packet",
    "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json",
    "npm run zk:c01-production-verifier-artifact-request-check",
    "ready-for-external-production-verifier-artifact-request-blocked",
    "artifact producer",
    "production proof-format/VK/public-witness",
    "mutation/no-mutation",
    "source-review acceptance",
    "deterministic production artifact build",
    "production artifact bundle",
    "verifier-adapter acceptance",
    "SBF/live lineage acceptance",
    "audit/reviewer acceptance",
    "composite evidence-chain closure",
  ]) {
  includes(w6ReviewSection, marker, "VANTA_ZK_REVIEW W6 C01 decision pointer");
}

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
  includes(
    source,
    "npm run zk:c01-sbf-live-lineage-candidate-check",
    "C01 SBF/live lineage candidate guard handoff",
  );
  includes(
    source,
    "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
    "C01 SBF/live lineage acceptance gate handoff",
  );
  includes(
    source,
    "npm run zk:c01-verifier-adapter-test-candidate-check",
    "C01 verifier adapter-test candidate guard handoff",
  );
  includes(
    source,
    "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
    "C01 Sunspot/Gnark artifact acquisition guard handoff",
  );
  includes(
    source,
    "npm run zk:c01-production-artifact-acceptance-gate-check",
    "C01 production artifact acceptance gate guard handoff",
  );
  includes(
    source,
    "npm run zk:c01-deterministic-production-artifact-build-check",
    "C01 deterministic production artifact build guard handoff",
  );
  includes(
    source,
    "npm run zk:c01-verifier-adapter-acceptance-gate-check",
    "C01 verifier-adapter acceptance gate guard handoff",
  );
  includes(
    source,
    "npm run zk:c01-audit-reviewer-acceptance-gate-check",
    "C01 audit/reviewer acceptance gate guard handoff",
  );
  includes(
    source,
    "npm run zk:c01-verifier-evidence-closure-gate-check",
    "C01 verifier evidence closure gate guard handoff",
  );
  includes(
    source,
    "npm run zk:c01-external-review-handoff-check",
    "C01 external reviewer handoff guard handoff",
  );
  includes(
    source,
    "npm run zk:c01-production-verifier-artifact-request-check",
    "C01 production verifier artifact request guard handoff",
  );
  includes(
    source,
    "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json",
    "C01 production verifier artifact request packet handoff",
  );
  includes(source, "artifact producer", "C01 production verifier artifact request audience handoff");
  includes(
    source,
    "production proof-format/VK/public-witness",
    "C01 production verifier artifact request proof/VK/public-witness handoff",
  );
  includes(source, "mutation/no-mutation", "C01 production verifier artifact request mutation handoff");
  includes(
    source,
    "npm run zk:c01-sunspot-groth16-dev-probe-check",
    "C01 Sunspot/Gnark dev-probe guard handoff",
  );
  includes(source, "temporary beta18 source shim", "C01 Sunspot/Gnark dev-probe truth handoff");
  includes(source, "324-byte proof plus 44-byte public witness", "C01 Sunspot/Gnark proof-length truth handoff");
  includes(source, "rejects the legacy 256-byte proof-only shape", "C01 Sunspot/Gnark tag-3 shape truth handoff");
  includes(
    source,
    "gnark-solana-native-proof-and-public-witness-v0",
    "C01 selected Gnark-native proof format handoff",
  );
  includes(source, "zero public and zero secret inputs", "C01 Sunspot/Gnark input-binding truth handoff");
  includes(source, "one public input", "C01 Sunspot/Gnark generated verifier input-count truth handoff");
  includes(
    source,
    "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json",
    "C01 public-witness binding observation handoff",
  );
  includes(
    source,
    "npm run zk:c01-public-witness-binding-check",
    "C01 public-witness binding guard handoff",
  );
  includes(source, "not production public-input binding evidence", "C01 public-witness binding truth handoff");
  includes(
    source,
    "ops/mainnet/private-pool-v2-c01-beta18-source-migration-candidate.evidence.json",
    "C01 beta18 source-migration candidate handoff",
  );
  includes(
    source,
    "npm run zk:c01-beta18-source-migration-candidate-check",
    "C01 beta18 source-migration candidate guard handoff",
  );
  includes(
    source,
    "ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json",
    "C01 beta18 H6 migration probe handoff",
  );
  includes(
    source,
    "npm run zk:c01-beta18-h6-migration-probe-check",
    "C01 beta18 H6 migration probe guard handoff",
  );
  includes(
    source,
    "local-h6-beta18-migration-probe-succeeded-nonproduction-unsafe-setup",
    "C01 beta18 H6 migration probe status handoff",
  );
  includes(
    source,
    "public witness matches the current H6 proof receipt",
    "C01 beta18 H6 public-witness truth handoff",
  );
  includes(
    source,
    "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json",
    "C01 beta18 H6 source-migration review handoff",
  );
  includes(
    source,
    "npm run zk:c01-beta18-h6-source-migration-review-check",
    "C01 beta18 H6 source-migration review guard handoff",
  );
  includes(
    source,
    "reviewable-beta18-h6-source-migration-candidate-local-only",
    "C01 beta18 H6 source-migration review status handoff",
  );
  includes(source, "poseidon-import-path-only", "C01 beta18 H6 source-migration delta handoff");
  includes(source, "reviewed source migration", "C01 source-migration truth handoff");
  includes(
    source,
    "npm run zk:c01-positive-proof-verified-claim-gate-check",
    "C01 positive proof-verified claim gate handoff",
  );
  includes(
    source,
    "npm run zk:c01-verifier-adapter-seam-check",
    "C01 local verifier adapter seam guard handoff",
  );
  includes(
    source,
    "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
    "C01 local unsafe generated verifier CPI guard handoff",
  );
  includes(source, "local fail-closed verifier adapter seam harness", "C01 local seam handoff");
  includes(source, "not production", "C01 local seam truth handoff");
  includes(source, "offchain-remote-proof-artifact-only", "C01 offchain-only truth handoff");
  includes(source, "solana-c01-groth16-verifier-ready", "C01 verifier-ready overclaim handoff");
  includes(
    source,
    "blocked-local-nargo-version-mismatch-and-sunspot-missing",
    "C01 Sunspot/Nargo compatibility blocker handoff",
  );
  includes(source, "nargo 1.0.0-beta.19", "C01 local nargo compatibility handoff");
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
  packageJson.scripts?.["zk:c01-production-groth16-toolchain-preflight-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-groth16-toolchain-preflight.mjs",
  "package.json must expose zk:c01-production-groth16-toolchain-preflight-check",
);
assert(
  packageJson.scripts?.["zk:c01-sunspot-groth16-route-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sunspot-groth16-route.mjs",
  "package.json must expose zk:c01-sunspot-groth16-route-check",
);
assert(
  packageJson.scripts?.["zk:c01-sunspot-gnark-artifact-acquisition-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sunspot-gnark-artifact-acquisition.mjs",
  "package.json must expose zk:c01-sunspot-gnark-artifact-acquisition-check",
);
assert(
  packageJson.scripts?.["zk:c01-beta18-source-migration-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-beta18-source-migration-candidate.mjs",
  "package.json must expose zk:c01-beta18-source-migration-candidate-check",
);
assert(
  packageJson.scripts?.["zk:c01-beta18-h6-migration-probe-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-beta18-h6-migration-probe.mjs",
  "package.json must expose zk:c01-beta18-h6-migration-probe-check",
);
assert(
  packageJson.scripts?.["zk:c01-beta18-h6-source-migration-review-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-beta18-h6-source-migration-review.mjs",
  "package.json must expose zk:c01-beta18-h6-source-migration-review-check",
);
assert(
  packageJson.scripts?.["zk:c01-production-artifact-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-artifact-acceptance-gate.mjs",
  "package.json must expose zk:c01-production-artifact-acceptance-gate-check",
);
assert(
  packageJson.scripts?.["zk:c01-verifier-adapter-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-adapter-acceptance-gate.mjs",
  "package.json must expose zk:c01-verifier-adapter-acceptance-gate-check",
);
assert(
  packageJson.scripts?.["zk:c01-sunspot-groth16-dev-probe-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sunspot-groth16-dev-probe.mjs",
  "package.json must expose zk:c01-sunspot-groth16-dev-probe-check",
);
assert(
  packageJson.scripts?.["zk:c01-public-witness-binding-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-public-witness-binding.mjs",
  "package.json must expose zk:c01-public-witness-binding-check",
);
assert(
  packageJson.scripts?.["zk:c01-production-verifying-key-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-verifying-key-candidate.mjs",
  "package.json must expose zk:c01-production-verifying-key-candidate-check",
);
assert(
  packageJson.scripts?.["zk:c01-sbf-live-lineage-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sbf-live-lineage-candidate.mjs",
  "package.json must expose zk:c01-sbf-live-lineage-candidate-check",
);
assert(
  packageJson.scripts?.["zk:c01-sbf-live-lineage-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sbf-live-lineage-acceptance-gate.mjs",
  "package.json must expose zk:c01-sbf-live-lineage-acceptance-gate-check",
);
assert(
  packageJson.scripts?.["zk:c01-verifier-adapter-test-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-adapter-test-candidate.mjs",
  "package.json must expose zk:c01-verifier-adapter-test-candidate-check",
);
assert(
  packageJson.scripts?.["zk:c01-positive-proof-verified-claim-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-positive-proof-verified-claim-gate.mjs",
  "package.json must expose zk:c01-positive-proof-verified-claim-gate-check",
);
assert(
  packageJson.scripts?.["zk:c01-audit-reviewer-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-audit-reviewer-acceptance-gate.mjs",
  "package.json must expose zk:c01-audit-reviewer-acceptance-gate-check",
);
assert(
  packageJson.scripts?.["zk:c01-verifier-evidence-closure-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-evidence-closure-gate.mjs",
  "package.json must expose zk:c01-verifier-evidence-closure-gate-check",
);
assert(
  packageJson.scripts?.["zk:c01-external-review-handoff-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-external-review-handoff.mjs",
  "package.json must expose zk:c01-external-review-handoff-check",
);
assert(
  packageJson.scripts?.["zk:c01-production-verifier-artifact-request-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-verifier-artifact-request.mjs",
  "package.json must expose zk:c01-production-verifier-artifact-request-check",
);
assert(
  packageJson.scripts?.["zk:c01-verifier-adapter-seam-check"]?.includes(
    "proof_carrying_spend_default_adapter_rejects_before_commit",
  ) &&
    packageJson.scripts?.["zk:c01-verifier-adapter-seam-check"]?.includes(
      "proof_carrying_spend_preflights_accounts_before_fail_closed_verifier",
    ) &&
    packageJson.scripts?.["zk:c01-verifier-adapter-seam-check"]?.includes(
      "proof_carrying_spend_verifier_instruction_data_matches_gnark_tuple",
    ) &&
    packageJson.scripts?.["zk:c01-verifier-adapter-seam-check"]?.includes(
      "proof_carrying_spend_verifier_cpi_instruction_matches_generated_solana_verifier_shape",
    ) &&
    packageJson.scripts?.["zk:c01-verifier-adapter-seam-check"]?.includes(
      "proof_carrying_spend_requires_readonly_executable_verifier_program_account",
    ) &&
    packageJson.scripts?.["zk:c01-verifier-adapter-seam-check"]?.includes(
      "proof_carrying_spend_public_witness_binding_",
    ) &&
    packageJson.scripts?.["zk:c01-verifier-adapter-seam-check"]?.includes(
      "verified_spend_commit_mutates_only_after_adapter_acceptance",
    ) &&
    packageJson.scripts?.["zk:c01-verifier-adapter-seam-check"]?.includes("selected_gnark_fixture_adapter_"),
  "package.json must expose the C01 verifier adapter seam guard",
);
assert(
  packageJson.scripts?.["private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check"]?.includes(
    "spend_with_proof_local_unsafe_generated_verifier_cpi_acceptance_and_no_mutation",
  ),
  "package.json must expose the C01 local unsafe generated verifier CPI acceptance guard",
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
    "npm run zk:c01-production-groth16-toolchain-preflight-check",
  ),
  "zk:review-guards-check must include the C01 production Groth16 toolchain preflight guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes("npm run zk:c01-sunspot-groth16-route-check"),
  "zk:review-guards-check must include the C01 Sunspot Groth16 route guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  ),
  "zk:review-guards-check must include the C01 Sunspot/Gnark artifact acquisition guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-beta18-source-migration-candidate-check",
  ),
  "zk:review-guards-check must include the C01 beta18 source-migration candidate guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-beta18-h6-migration-probe-check",
  ),
  "zk:review-guards-check must include the C01 beta18 H6 migration probe guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-beta18-h6-source-migration-review-check",
  ),
  "zk:review-guards-check must include the C01 beta18 H6 source-migration review guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-deterministic-production-artifact-build-check",
  ),
  "zk:review-guards-check must include the C01 deterministic production artifact build guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-production-artifact-acceptance-gate-check",
  ),
  "zk:review-guards-check must include the C01 production artifact acceptance gate guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  ),
  "zk:review-guards-check must include the C01 verifier-adapter acceptance gate guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  ),
  "zk:review-guards-check must include the C01 SBF/live lineage acceptance gate",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-audit-reviewer-acceptance-gate-check",
  ),
  "zk:review-guards-check must include the C01 audit/reviewer acceptance gate guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-verifier-evidence-closure-gate-check",
  ),
  "zk:review-guards-check must include the C01 verifier evidence closure gate guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-external-review-handoff-check",
  ),
  "zk:review-guards-check must include the C01 external reviewer handoff guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-production-verifier-artifact-request-check",
  ),
  "zk:review-guards-check must include the C01 production verifier artifact request guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes("npm run zk:c01-sunspot-groth16-dev-probe-check"),
  "zk:review-guards-check must include the C01 Sunspot Groth16 dev-probe guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes("npm run zk:c01-public-witness-binding-check"),
  "zk:review-guards-check must include the C01 public-witness binding guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-production-verifying-key-candidate-check",
  ),
  "zk:review-guards-check must include the C01 production verifying-key candidate guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-verifier-adapter-test-candidate-check",
  ),
  "zk:review-guards-check must include the C01 verifier adapter-test candidate guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes("npm run zk:c01-verifier-adapter-seam-check"),
  "zk:review-guards-check must include the C01 verifier adapter seam guard",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes(
    "npm run zk:c01-positive-proof-verified-claim-gate-check",
  ),
  "zk:review-guards-check must include the C01 positive proof-verified claim gate",
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
    "npm run zk:c01-production-groth16-toolchain-preflight-check",
  ),
  "zk:feedback-loop-check must include the C01 production Groth16 toolchain preflight guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes("npm run zk:c01-sunspot-groth16-route-check"),
  "zk:feedback-loop-check must include the C01 Sunspot Groth16 route guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  ),
  "zk:feedback-loop-check must include the C01 Sunspot/Gnark artifact acquisition guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-beta18-source-migration-candidate-check",
  ),
  "zk:feedback-loop-check must include the C01 beta18 source-migration candidate guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-beta18-h6-migration-probe-check",
  ),
  "zk:feedback-loop-check must include the C01 beta18 H6 migration probe guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-beta18-h6-source-migration-review-check",
  ),
  "zk:feedback-loop-check must include the C01 beta18 H6 source-migration review guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-deterministic-production-artifact-build-check",
  ),
  "zk:feedback-loop-check must include the C01 deterministic production artifact build guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-production-artifact-acceptance-gate-check",
  ),
  "zk:feedback-loop-check must include the C01 production artifact acceptance gate guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  ),
  "zk:feedback-loop-check must include the C01 verifier-adapter acceptance gate guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  ),
  "zk:feedback-loop-check must include the C01 SBF/live lineage acceptance gate",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-audit-reviewer-acceptance-gate-check",
  ),
  "zk:feedback-loop-check must include the C01 audit/reviewer acceptance gate guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-verifier-evidence-closure-gate-check",
  ),
  "zk:feedback-loop-check must include the C01 verifier evidence closure gate guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-external-review-handoff-check",
  ),
  "zk:feedback-loop-check must include the C01 external reviewer handoff guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-production-verifier-artifact-request-check",
  ),
  "zk:feedback-loop-check must include the C01 production verifier artifact request guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes("npm run zk:c01-sunspot-groth16-dev-probe-check"),
  "zk:feedback-loop-check must include the C01 Sunspot Groth16 dev-probe guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes("npm run zk:c01-public-witness-binding-check"),
  "zk:feedback-loop-check must include the C01 public-witness binding guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-production-verifying-key-candidate-check",
  ),
  "zk:feedback-loop-check must include the C01 production verifying-key candidate guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-verifier-adapter-test-candidate-check",
  ),
  "zk:feedback-loop-check must include the C01 verifier adapter-test candidate guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes("npm run zk:c01-verifier-adapter-seam-check"),
  "zk:feedback-loop-check must include the C01 verifier adapter seam guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes(
    "npm run zk:c01-positive-proof-verified-claim-gate-check",
  ),
  "zk:feedback-loop-check must include the C01 positive proof-verified claim gate",
);

console.log("Vanta ZK C01 verifier backend decision: PASS");

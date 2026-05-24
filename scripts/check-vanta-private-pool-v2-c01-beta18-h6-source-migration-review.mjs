import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath =
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json";
const sourceMigrationPath =
  "ops/mainnet/private-pool-v2-c01-beta18-source-migration-candidate.evidence.json";
const h6ProbePath = "ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json";
const sourceReviewAcceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json";
const acceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const runbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const currentSourcePath = "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/src/main.nr";
const currentProverPath = "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/Prover.toml";
const candidateDir =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry_sunspot_beta18_h6_candidate";
const candidateSourcePath = `${candidateDir}/src/main.nr`;
const candidateNargoPath = `${candidateDir}/Nargo.toml`;
const candidateProverPath = `${candidateDir}/Prover.toml`;
const candidateReadmePath = `${candidateDir}/README.md`;
const currentSourceSha256 =
  "sha256:363d7dffa7ba03698a8bdbe2d48a6f13cf32ddeb7326fb997ff9cff63db8bf96";
const candidateSourceSha256 =
  "sha256:caaeb2c2767965bd5d6c68c3043b8be10b43b345f017e32c6aa67658e927d430";
const currentAcirSha256 =
  "sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9";
const reviewedBeta18H6SourceAcirSha256 =
  "sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde";
const proverSha256 = "sha256:2c62fa9b0a7bfb32c98fb89fc5fbc90211d67b017066eb5555da8f0da20d890e";
const currentH6PublicInput =
  "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b";
const currentH6Commitment =
  "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2";
const h6Fields = [
  "context_preimage_merchant_address_hi",
  "context_preimage_merchant_address_lo",
  "context_preimage_denomination",
  "context_preimage_settlement_epoch_hi",
  "context_preimage_settlement_epoch_lo",
];

function fail(message) {
  console.error(`private-pool-v2 C01 beta18 H6 source-migration review: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function includes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

function sha256(path) {
  return `sha256:${createHash("sha256").update(readFileSync(resolve(repoRoot, path))).digest("hex")}`;
}

function assertStringArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  for (const [index, entry] of value.entries()) {
    assert(typeof entry === "string", `${label}[${index}] must be a string`);
  }
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};

assert(
  scripts["zk:c01-beta18-h6-source-migration-review-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-beta18-h6-source-migration-review.mjs",
  "package.json must expose zk:c01-beta18-h6-source-migration-review-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-beta18-h6-source-migration-review-check"),
    `${aggregate} must include the beta18 H6 source-migration review guard`,
  );
}

const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const sourceMigration = readJson(sourceMigrationPath);
const h6Probe = readJson(h6ProbePath);
const acceptanceGate = readJson(acceptanceGatePath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);
const runbook = read(runbookPath);
const review = read(reviewPath);
const currentSource = read(currentSourcePath);
const candidateSource = read(candidateSourcePath);
const currentProver = read(currentProverPath);
const candidateProver = read(candidateProverPath);
const candidateNargo = read(candidateNargoPath);
const candidateReadme = read(candidateReadmePath);

for (const forbidden of [
  "proofBytes",
  "proofHex",
  "verifyingKeyBytes",
  "vkBytes",
  "witnessBytes",
  "provingKeyBytes",
  "keypairBytes",
  "signedTransactionBytes",
  "-----BEGIN",
  "bearer ",
  "postgres://",
  "postgresql://",
]) {
  assert(!packetText.includes(forbidden), `packet must not contain forbidden marker ${forbidden}`);
}

assert(
  packet.version === "vanta-private-pool-v2-c01-beta18-h6-source-migration-review-evidence-0.1",
  "schema mismatch",
);
assert(
  packet.status === "reviewable-beta18-h6-source-migration-candidate-local-only",
  "status mismatch",
);
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route id mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "sourceMigrationReady",
  "reviewedSourceMigration",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(packet.sourceMigrationCandidateRef === sourceMigrationPath, "source migration ref mismatch");
assert(packet.localH6MigrationProbeRef === h6ProbePath, "H6 probe ref mismatch");
assert(packet.sourceReviewAcceptanceGateRef === sourceReviewAcceptanceGatePath, "source-review acceptance gate ref mismatch");
assert(packet.productionArtifactAcceptanceGateRef === acceptanceGatePath, "acceptance gate ref mismatch");
assert(packet.decisionPacketRef === decisionPath, "decision ref mismatch");
assert(
  sourceMigration.beta18H6SourceMigrationReviewCandidateRef === packetPath,
  "source migration packet must reference source-review candidate",
);
assert(h6Probe.localH6Beta18Probe?.sourceSha256 === candidateSourceSha256, "H6 probe source hash mismatch");
assert(
  h6Probe.observedArtifacts?.publicWitness?.decodedPublicInputValue === currentH6PublicInput,
  "H6 probe public witness value mismatch",
);
assert(
  acceptanceGate.requiredProductionBundleShape?.referenceCurrentSourceAcirSha256 === currentAcirSha256,
  "acceptance gate reference current-source ACIR hash mismatch",
);
assert(
  acceptanceGate.requiredProductionBundleShape?.productionSourceLineageMode ===
    "reviewed-beta18-h6-source-migration",
  "acceptance gate source lineage mode mismatch",
);
assert(
  acceptanceGate.requiredProductionBundleShape?.sourceAcirSha256 === reviewedBeta18H6SourceAcirSha256,
  "acceptance gate production source ACIR hash mismatch",
);

const current = packet.currentSource ?? {};
assert(current.sourceRef === currentSourcePath, "current source ref mismatch");
assert(current.sourceByteLength === statSync(resolve(repoRoot, currentSourcePath)).size, "current source byte length mismatch");
assert(current.sourceSha256 === sha256(currentSourcePath), "current source hash mismatch");
assert(current.sourceSha256 === currentSourceSha256, "expected current source hash mismatch");
assert(current.proverRef === currentProverPath, "current prover ref mismatch");
assert(current.proverSha256 === sha256(currentProverPath), "current prover hash mismatch");
assert(current.proverSha256 === proverSha256, "expected current prover hash mismatch");
assert(current.compiledAcirSha256 === currentAcirSha256, "current ACIR hash mismatch");
assert(current.proofReceiptPublicInput === currentH6PublicInput, "current H6 public input mismatch");
assert(current.proofReceiptPublicInputCommitment === currentH6Commitment, "current H6 commitment mismatch");

const candidate = packet.candidateSource ?? {};
assert(candidate.sourceRef === candidateSourcePath, "candidate source ref mismatch");
assert(candidate.sourceByteLength === statSync(resolve(repoRoot, candidateSourcePath)).size, "candidate source byte length mismatch");
assert(candidate.sourceSha256 === sha256(candidateSourcePath), "candidate source hash mismatch");
assert(candidate.sourceSha256 === candidateSourceSha256, "expected candidate source hash mismatch");
assert(candidate.nargoRef === candidateNargoPath, "candidate Nargo ref mismatch");
assert(candidate.proverRef === candidateProverPath, "candidate Prover ref mismatch");
assert(candidate.readmeRef === candidateReadmePath, "candidate README ref mismatch");
assert(candidate.proverSha256 === sha256(candidateProverPath), "candidate prover hash mismatch");
assert(candidate.proverSha256 === proverSha256, "expected candidate prover hash mismatch");
assert(candidate.compatibilityDelta === "poseidon-import-path-only", "compatibility delta mismatch");
assert(candidate.currentImport === "use ::poseidon::poseidon::bn254;", "current import mismatch");
assert(candidate.candidateImport === "use dep::poseidon::poseidon::bn254;", "candidate import mismatch");
assert(currentSource.startsWith(`${candidate.currentImport}\n`), "current source import mismatch");
assert(candidateSource.startsWith(`${candidate.candidateImport}\n`), "candidate source import mismatch");
assert(
  candidateSource.replace(candidate.candidateImport, candidate.currentImport) === currentSource,
  "candidate source must normalize to current source after import-path replacement",
);
assert(currentProver === candidateProver, "candidate Prover.toml must match current Prover.toml exactly");
for (const field of h6Fields) {
  includes(candidateSource, `${field}: Field`, "candidate source H6 input");
  includes(candidateProver, `${field} =`, "candidate Prover.toml H6 input");
}
for (const marker of [
  "derive_actual_private_spend_context_tag",
  "bn254::hash_6",
  "assert(computed_context_hash == context_hash);",
  "private_spend_public_input_hash: pub Field",
]) {
  includes(candidateSource, marker, "candidate source");
}
for (const marker of [
  'name = "vanta_private_pool_v2_actual_private_spend_entry"',
  'poseidon = { tag = "v0.1.1"',
]) {
  includes(candidateNargo, marker, "candidate Nargo.toml");
}
for (const marker of [
  "review candidate",
  "not the production source of truth",
  "one compatibility delta",
  "Production acceptance still requires",
]) {
  includes(candidateReadme, marker, "candidate README");
}
for (const [field, expected] of [
  ["normalizedSourceMatchesCurrent", true],
  ["proverMatchesCurrent", true],
  ["h6ContextPreimageInputsPresent", true],
  ["h6Poseidon6ContextAssertionPresent", true],
  ["matchesLocalH6ProbeSourceHash", true],
  ["matchesCurrentH6PublicInputViaProbe", true],
  ["matchesCurrentSourceAcir", false],
  ["satisfiesReviewedSourceMigration", false],
  ["satisfiesProductionSourceLineage", false],
]) {
  assert(candidate[field] === expected, `candidate ${field} mismatch`);
}

const localValidation = packet.localValidation ?? {};
assert(localValidation.status === "passed-local-beta18-nargo-check", "local validation status mismatch");
assert(localValidation.command === "noirup -v 1.0.0-beta.18 && nargo check", "local validation command mismatch");
assert(localValidation.workDir === candidateDir, "local validation workDir mismatch");
assert(localValidation.observedVersion === "nargo version = 1.0.0-beta.18", "local validation observed version mismatch");
assert(localValidation.restoredVersion === "nargo version = 1.0.0-beta.19", "local validation restored version mismatch");
assert(localValidation.satisfiesReviewedSourceMigration === false, "local validation reviewed-migration flag mismatch");
assert(localValidation.satisfiesProductionSourceLineage === false, "local validation production-lineage flag mismatch");
for (const marker of [
  "locally accepted by Nargo beta18",
  "not a reviewed compatible toolchain",
  "not production source lineage",
  "not audit acceptance",
]) {
  includes(localValidation.truthBoundary ?? "", marker, "local validation truth boundary");
}

const requirements = packet.reviewRequirements ?? {};
assert(requirements.status === "awaiting-external-review-and-production-artifact-intake", "review status mismatch");
assert(
  requirements.requiredSourceReviewAcceptanceGateRef === sourceReviewAcceptanceGatePath,
  "review requirement source-review acceptance gate ref mismatch",
);
for (const field of [
  "requiredReviewerRef",
  "requiredSourceReviewRef",
  "requiredToolchainReviewRef",
  "requiredTrustedSetupOrToxicWasteMitigationRef",
  "requiredDeterministicArtifactBuildRef",
  "requiredProductionBundleRef",
  "requiredAdapterAcceptanceRef",
  "requiredSbfLiveLineageRef",
  "requiredAuditReviewerAcceptanceRef",
]) {
  assert(requirements[field] === null, `review requirement ${field} must be null`);
}
assert(requirements.satisfiesReviewedSourceMigration === false, "reviewed migration flag mismatch");
assert(requirements.satisfiesProductionSourceLineage === false, "production lineage flag mismatch");

for (const [field, expected] of [
  ["backendSelection", true],
  ["reviewableSourceMigrationCandidate", true],
  ["localH6Beta18MigrationProbe", true],
  ["reviewedSourceMigration", false],
  ["actualPrivateSpendProductionProofFormat", false],
  ["privateSpendPublicInputHashBinding", false],
  ["productionVerifyingKeyHash", false],
  ["verifierAdapter", false],
  ["acceptedProofMutatesStateTest", false],
  ["invalidProofLeavesAccountsUnchangedTest", false],
  ["wrongPublicInputHashLeavesAccountsUnchangedTest", false],
  ["wrongVerifyingKeyLeavesAccountsUnchangedTest", false],
  ["sbfLiveLineage", false],
  ["auditReviewerAcceptance", false],
]) {
  assert(packet.satisfiesRequiredPositiveEvidence?.[field] === expected, `${field} mismatch`);
}
assertStringArray(packet.remainingBlockers, "remainingBlockers");
for (const blocker of [
  "no external source reviewer acceptance",
  "no production setup or toxic-waste mitigation",
  "no deterministic reviewed production artifact build",
  "no audit/reviewer acceptance",
]) {
  assert(packet.remainingBlockers.includes(blocker), `missing blocker ${blocker}`);
}
assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-beta18-h6-source-migration-review-check",
  "npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
  "npm run zk:c01-beta18-h6-migration-probe-check",
  "npm run zk:c01-beta18-source-migration-candidate-check",
  "npm run zk:review-guards-check",
]) {
  assert(packet.canonicalCommands.includes(command), `missing canonical command ${command}`);
}
for (const marker of [
  "in-repo reviewable source-migration candidate only",
  "not reviewed source migration",
  "not production source lineage",
  "not production proof-format evidence",
  "not audit/reviewer acceptance",
  "not C01 closure",
]) {
  includes(packet.truthBoundary ?? "", marker, "truth boundary");
}

for (const marker of [
  "C01 beta18 H6 source-migration review packet",
  packetPath,
  "npm run zk:c01-beta18-h6-source-migration-review-check",
  "reviewable-beta18-h6-source-migration-candidate-local-only",
  "poseidon-import-path-only",
  candidateSourcePath,
]) {
  includes(decision, marker, decisionPath);
  includes(auditPackage, marker, auditPackagePath);
  includes(runbook, marker, runbookPath);
  includes(review, marker, reviewPath);
}

console.log("private-pool-v2 C01 beta18 H6 source-migration review: PASS");

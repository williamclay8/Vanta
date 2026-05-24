import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath =
  "ops/mainnet/private-pool-v2-c01-beta18-source-migration-candidate.evidence.json";
const currentSourcePath = "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/src/main.nr";
const currentProverPath = "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/Prover.toml";
const currentAcirPath =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.json";
const currentProofReceiptPath =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json";
const currentSourceCompileAttemptPath =
  "ops/mainnet/private-pool-v2-c01-current-source-sunspot-compile-attempt.evidence.json";
const routePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const acceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const devProbePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json";
const localInventoryPath =
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-local-artifact-inventory.evidence.json";
const publicWitnessPath = "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json";
const h6ProbePath = "ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json";
const h6SourceReviewPath =
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const beta18MainSourcePath = "/private/tmp/vanta-c01-sunspot-lane/work/beta18-circuit/src/main.nr";
const beta18ProverPath = "/private/tmp/vanta-c01-sunspot-lane/work/beta18-circuit/Prover.toml";
const expectedCurrentSourceSha256 =
  "sha256:363d7dffa7ba03698a8bdbe2d48a6f13cf32ddeb7326fb997ff9cff63db8bf96";
const expectedBeta18SourceSha256 =
  "sha256:fc53c7f1624a2bb1f1af1bedd3126438924f4954c71ac060c453ba16620d6b27";
const expectedCurrentAcirSha256 =
  "sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9";
const expectedBeta18AcirSha256 =
  "sha256:5e0e27752ff1c0f01d318323083b168c1309c0c84521401531b42d07033c68bf";
const currentH6PublicInputValue =
  "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b";
const currentH6PublicInputCommitment =
  "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2";
const h6Fields = [
  "context_preimage_merchant_address_hi",
  "context_preimage_merchant_address_lo",
  "context_preimage_denomination",
  "context_preimage_settlement_epoch_hi",
  "context_preimage_settlement_epoch_lo",
];

function fail(message) {
  console.error(`private-pool-v2 C01 beta18 source-migration candidate: FAIL - ${message}`);
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

function readAbsolute(path) {
  return readFileSync(path, "utf8");
}

function includes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

function excludes(source, marker, label) {
  assert(!source.includes(marker), `${label} must not contain marker: ${marker}`);
}

function sha256Buffer(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

function sha256RepoFile(path) {
  return sha256Buffer(readFileSync(resolve(repoRoot, path)));
}

function sha256AbsoluteFile(path) {
  return sha256Buffer(readFileSync(path));
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
  scripts["zk:c01-beta18-source-migration-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-beta18-source-migration-candidate.mjs",
  "package.json must expose zk:c01-beta18-source-migration-candidate-check",
);
assert(
  scripts["zk:c01-beta18-h6-migration-probe-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-beta18-h6-migration-probe.mjs",
  "package.json must expose zk:c01-beta18-h6-migration-probe-check",
);
assert(
  scripts["zk:c01-beta18-h6-source-migration-review-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-beta18-h6-source-migration-review.mjs",
  "package.json must expose zk:c01-beta18-h6-source-migration-review-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-beta18-source-migration-candidate-check"),
    `${aggregate} must include the beta18 source-migration candidate guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-beta18-h6-migration-probe-check"),
    `${aggregate} must include the beta18 H6 migration probe guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-beta18-h6-source-migration-review-check"),
    `${aggregate} must include the beta18 H6 source-migration review guard`,
  );
}

const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const currentSourceCompileAttempt = readJson(currentSourceCompileAttemptPath);
const route = readJson(routePath);
const acquisition = readJson(acquisitionPath);
const acceptanceGate = readJson(acceptanceGatePath);
const devProbe = readJson(devProbePath);
const localInventory = readJson(localInventoryPath);
const publicWitness = readJson(publicWitnessPath);
const h6Probe = readJson(h6ProbePath);
const h6SourceReview = readJson(h6SourceReviewPath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);

assert(
  packet.version === "vanta-private-pool-v2-c01-beta18-source-migration-candidate-evidence-0.1",
  "schema mismatch",
);
assert(packet.status === "blocked-no-reviewed-beta18-source-migration", "status mismatch");
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(
  packet.selectedBackendStatus === "selected-pending-production-evidence",
  "selected backend status mismatch",
);
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route id mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "sourceMigrationReady",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(
  packet.secretPolicy ===
    "metadata-only-no-raw-proof-vk-witness-pk-keypair-secret-or-signed-transaction-bytes",
  "secret policy mismatch",
);
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

for (const [field, expected] of [
  ["currentSourceSunspotCompileAttemptRef", currentSourceCompileAttemptPath],
  ["routePacketRef", routePath],
  ["artifactAcquisitionPacketRef", acquisitionPath],
  ["productionArtifactAcceptanceGateRef", acceptanceGatePath],
  ["localSunspotGroth16DevProbeRef", devProbePath],
  ["localSunspotGnarkLocalArtifactInventoryRef", localInventoryPath],
  ["localPublicWitnessBindingObservationRef", publicWitnessPath],
  ["localH6Beta18MigrationProbeRef", h6ProbePath],
  ["beta18H6SourceMigrationReviewCandidateRef", h6SourceReviewPath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(packet[field] === expected, `${field} mismatch`);
}

assert(currentSourceCompileAttempt.status.includes("blocked-current-beta19"), "compile attempt status mismatch");
assert(route.routeId === packet.routeId, "route id linkage mismatch");
assert(acquisition.routeId === packet.routeId, "acquisition route id mismatch");
assert(acceptanceGate.requiredProductionBundleShape?.sourceAcirSha256 === expectedCurrentAcirSha256, "acceptance gate source hash mismatch");
assert(devProbe.sourceCircuit?.temporarySourceShimCommitted === false, "dev probe must record temp shim only");
assert(localInventory.sourceLineageComparison?.matchesCurrentSourceAcir === false, "local inventory must record source mismatch");
assert(publicWitness.satisfiesRequiredPositiveEvidence?.privateSpendPublicInputHashBinding === false, "public witness must remain nonproduction");
assert(h6Probe.sourceMigrationCandidateRef === packetPath, "H6 probe source-migration linkage mismatch");
assert(
  h6Probe.status === "local-h6-beta18-migration-probe-succeeded-nonproduction-unsafe-setup",
  "H6 probe status mismatch",
);
assert(
  h6Probe.localH6Beta18Probe?.matchesCurrentH6PublicInput === true,
  "H6 probe must match the current H6 public input",
);
assert(h6SourceReview.sourceMigrationCandidateRef === packetPath, "H6 source review linkage mismatch");
assert(
  h6SourceReview.status === "reviewable-beta18-h6-source-migration-candidate-local-only",
  "H6 source review status mismatch",
);
assert(
  h6SourceReview.candidateSource?.normalizedSourceMatchesCurrent === true,
  "H6 source review normalized-source flag mismatch",
);

const currentSource = read(currentSourcePath);
const currentProver = read(currentProverPath);
const currentProofReceipt = readJson(currentProofReceiptPath);
const currentCircuit = packet.currentRepoCircuit ?? {};
assert(currentCircuit.path === "zk/noir/vanta_private_pool_v2_actual_private_spend_entry", "current circuit path mismatch");
assert(currentCircuit.nargoVersion === "1.0.0-beta.19", "current circuit nargo version mismatch");
assert(currentCircuit.mainSourceRef === currentSourcePath, "current source ref mismatch");
assert(currentCircuit.mainSourceByteLength === statSync(resolve(repoRoot, currentSourcePath)).size, "current source byte length mismatch");
assert(currentCircuit.mainSourceSha256 === sha256RepoFile(currentSourcePath), "current source sha mismatch");
assert(currentCircuit.mainSourceSha256 === expectedCurrentSourceSha256, "expected current source sha mismatch");
assert(currentCircuit.compiledAcirRef === currentAcirPath, "current ACIR ref mismatch");
assert(currentCircuit.compiledAcirByteLength === statSync(resolve(repoRoot, currentAcirPath)).size, "current ACIR byte length mismatch");
assert(currentCircuit.compiledAcirSha256 === sha256RepoFile(currentAcirPath), "current ACIR sha mismatch");
assert(currentCircuit.compiledAcirSha256 === expectedCurrentAcirSha256, "expected current ACIR sha mismatch");
assert(currentCircuit.poseidonImport === "use ::poseidon::poseidon::bn254;", "current poseidon import mismatch");
assert(currentCircuit.publicInputLabel === "private-spend-public-input-hash", "current public input label mismatch");
includes(currentSource, "use ::poseidon::poseidon::bn254;", "current source");
includes(currentSource, "derive_actual_private_spend_context_tag", "current source");
includes(currentSource, "bn254::hash_6", "current source");
includes(currentSource, "assert(computed_context_hash == context_hash);", "current source");
for (const field of h6Fields) {
  includes(currentSource, `${field}: Field`, "current source H6 input");
  includes(currentProver, `${field} =`, "current Prover.toml H6 input");
}

const currentH6 = currentCircuit.h6ContextBinding ?? {};
assert(currentH6.status === "required-current-source-semantics", "current H6 status mismatch");
assert(currentH6.contextHashWasOpaque === false, "current H6 context hash must not be opaque");
assert(JSON.stringify(currentH6.contextPreimageInputs) === JSON.stringify(h6Fields), "current H6 field list mismatch");
assert(currentH6.deriveFunction === "derive_actual_private_spend_context_tag", "current H6 derive function mismatch");
includes(currentH6.poseidonShape ?? "", "bn254::hash_6", "current H6 poseidon shape");
assert(currentH6.assertion === "computed_context_hash == context_hash", "current H6 assertion mismatch");
assert(currentH6.proofReceiptPublicInput === currentH6PublicInputValue, "current proof receipt public input mismatch");
assert(currentH6.proofReceiptPublicInputCommitment === currentH6PublicInputCommitment, "current proof receipt commitment mismatch");
assert(currentH6.satisfiesRequiredProductionSourceSemantics === true, "current H6 semantics flag mismatch");
assert(currentProofReceipt.publicInputs?.[0] === currentH6PublicInputValue, "proof receipt public input mismatch");
assert(currentProofReceipt.publicInputCommitment === currentH6PublicInputCommitment, "proof receipt commitment mismatch");

const beta18 = packet.beta18TempShimObservation ?? {};
assert(beta18.status === "local-beta18-temp-shim-observed-comparison-only", "beta18 observation status mismatch");
assert(beta18.localPath === "/private/tmp/vanta-c01-sunspot-lane/work/beta18-circuit", "beta18 local path mismatch");
assert(beta18.mainSourceRef === beta18MainSourcePath, "beta18 source ref mismatch");
assert(beta18.nargoVersion === "1.0.0-beta.18", "beta18 nargo version mismatch");
assert(beta18.mainSourceSha256 === expectedBeta18SourceSha256, "beta18 source sha packet mismatch");
assert(beta18.compiledAcirSha256 === expectedBeta18AcirSha256, "beta18 ACIR hash mismatch");
assert(beta18.poseidonImport === "use dep::poseidon::poseidon::bn254;", "beta18 poseidon import mismatch");
assert(beta18.publicInputBindingShape === "same Poseidon11 public input hash over context_hash", "beta18 public binding mismatch");
assert(beta18.contextHashSemantics === "opaque private Field input included in the public-input hash only", "beta18 context semantics mismatch");
for (const field of [
  "h6ContextPreimageInputsPresent",
  "h6Poseidon6ContextAssertionPresent",
  "matchesCurrentSourceAcir",
  "satisfiesProductionSourceLineage",
  "satisfiesReviewedSourceMigration",
]) {
  assert(beta18[field] === false, `beta18 ${field} must remain false`);
}
for (const marker of [
  "omits the H6 context preimage fields",
  "comparison-only",
  "cannot satisfy reviewed source migration",
]) {
  includes(beta18.truthBoundary ?? "", marker, "beta18 truth boundary");
}

if (existsSync(beta18MainSourcePath)) {
  const beta18Source = readAbsolute(beta18MainSourcePath);
  assert(beta18.mainSourceByteLength === statSync(beta18MainSourcePath).size, "beta18 source byte length mismatch");
  assert(beta18.mainSourceSha256 === sha256AbsoluteFile(beta18MainSourcePath), "beta18 source sha mismatch");
  includes(beta18Source, "use dep::poseidon::poseidon::bn254;", "beta18 source");
  includes(beta18Source, "context_hash: Field", "beta18 source context_hash");
  excludes(beta18Source, "derive_actual_private_spend_context_tag", "beta18 source");
  excludes(beta18Source, "bn254::hash_6", "beta18 source");
  excludes(beta18Source, "computed_context_hash", "beta18 source");
  for (const field of h6Fields) {
    excludes(beta18Source, field, "beta18 source H6 fields");
  }
}

if (existsSync(beta18ProverPath)) {
  const beta18Prover = readAbsolute(beta18ProverPath);
  for (const field of h6Fields) {
    excludes(beta18Prover, `${field} =`, "beta18 Prover.toml H6 fields");
  }
}

const h6LocalProbe = packet.localH6Beta18MigrationProbe ?? {};
assert(
  h6LocalProbe.status === "passed-local-h6-beta18-migration-probe-nonproduction-unsafe-setup",
  "local H6 migration probe status mismatch",
);
assert(h6LocalProbe.artifactRef === h6ProbePath, "local H6 migration probe artifact ref mismatch");
assert(h6LocalProbe.command === "npm run zk:c01-beta18-h6-migration-probe-check", "local H6 probe command mismatch");
assert(
  h6LocalProbe.rawValidationCommand ===
    "VANTA_C01_BETA18_H6_PROBE_RAW=1 npm run zk:c01-beta18-h6-migration-probe-check",
  "local H6 probe raw-validation command mismatch",
);
assert(h6LocalProbe.publicWitnessMatchesCurrentH6ProofReceipt === true, "local H6 probe public witness flag mismatch");
assert(h6LocalProbe.satisfiesReviewedSourceMigration === false, "local H6 probe reviewed-migration flag mismatch");
assert(h6LocalProbe.satisfiesProductionSourceLineage === false, "local H6 probe production-lineage flag mismatch");
for (const marker of [
  "preserves the H6 context preimage fields",
  "public witness matching the current H6 proof receipt",
  "not reviewed source migration",
  "not audit acceptance",
]) {
  includes(h6LocalProbe.truthBoundary ?? "", marker, "local H6 migration probe truth boundary");
}

const h6SourceReviewCandidate = packet.beta18H6SourceMigrationReviewCandidate ?? {};
assert(
  h6SourceReviewCandidate.status === "reviewable-beta18-h6-source-migration-candidate-local-only",
  "H6 source review candidate status mismatch",
);
assert(h6SourceReviewCandidate.artifactRef === h6SourceReviewPath, "H6 source review artifact ref mismatch");
assert(
  h6SourceReviewCandidate.candidateSourceRef ===
    "zk/noir/vanta_private_pool_v2_actual_private_spend_entry_sunspot_beta18_h6_candidate/src/main.nr",
  "H6 source review candidate source ref mismatch",
);
assert(
  h6SourceReviewCandidate.command === "npm run zk:c01-beta18-h6-source-migration-review-check",
  "H6 source review command mismatch",
);
assert(h6SourceReviewCandidate.compatibilityDelta === "poseidon-import-path-only", "H6 source review delta mismatch");
for (const [field, expected] of [
  ["normalizedSourceMatchesCurrent", true],
  ["proverMatchesCurrent", true],
  ["satisfiesReviewedSourceMigration", false],
  ["satisfiesProductionSourceLineage", false],
]) {
  assert(h6SourceReviewCandidate[field] === expected, `H6 source review ${field} mismatch`);
}
for (const marker of [
  "differs from current source only by the beta18-compatible Poseidon import path",
  "not reviewed source migration",
  "not production source lineage",
  "not audit acceptance",
]) {
  includes(h6SourceReviewCandidate.truthBoundary ?? "", marker, "H6 source review truth boundary");
}

const required = packet.requiredReviewedMigrationShape ?? {};
assert(required.status === "required-before-beta18-source-can-promote", "required migration status mismatch");
assert(required.target === "solana-c01-tag3-groth16-v0", "required migration target mismatch");
assert(required.circuit === "vanta_private_pool_v2_actual_private_spend_entry", "required migration circuit mismatch");
assert(required.sourceSemantics === "post-H6 actual-private-spend context_hash preimage binding", "required migration source semantics mismatch");
assertStringArray(required.acceptableResolutionPaths, "acceptableResolutionPaths");
assertStringArray(required.mustPreserve, "mustPreserve");
for (const marker of [
  "current Noir 1.0.0-beta.19 ACIR bytecode format",
  "beta18-compatible source migration preserving the current H6 context preimage binding",
  "five private context preimage fields",
  "Poseidon6 derive_actual_private_spend_context_tag",
  "current H6 proof receipt public input and commitment",
  "SBF/live lineage and audit/reviewer acceptance",
]) {
  includes([...required.acceptableResolutionPaths, ...required.mustPreserve].join("\n"), marker, "required migration shape");
}

const reviewed = packet.currentReviewedMigration ?? {};
assert(reviewed.status === "absent", "reviewed migration status mismatch");
for (const field of ["returnedSourceRef", "reviewedMigrationRef", "returnedSourceAcirSha256"]) {
  assert(reviewed[field] === null, `reviewed migration ${field} must be null`);
}
for (const field of [
  "matchesCurrentH6Semantics",
  "matchesAcceptedProductionBundle",
  "satisfiesReviewedSourceMigration",
]) {
  assert(reviewed[field] === false, `reviewed migration ${field} must remain false`);
}

assertStringArray(packet.promotionRules, "promotionRules");
for (const marker of [
  "existing beta18 temp shim cannot fill production source-lineage",
  "protocol change",
  "current H6 proof receipt public input and commitment",
  "generated from the accepted source lineage",
]) {
  includes(packet.promotionRules.join("\n"), marker, "promotion rules");
}

for (const [field, expected] of [
  ["backendSelection", true],
  ["sourceMigrationGapRecorded", true],
  ["localH6Beta18MigrationProbe", true],
  ["reviewableSourceMigrationCandidate", true],
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

assertStringArray(packet.forbiddenPromotions, "forbiddenPromotions");
for (const marker of [
  "reviewed beta18 source migration accepted",
  "production source lineage accepted",
  "solana-c01-groth16-verifier-ready",
]) {
  assert(packet.forbiddenPromotions.includes(marker), `missing forbidden promotion ${marker}`);
}
assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-beta18-source-migration-candidate-check",
  "npm run zk:c01-beta18-h6-migration-probe-check",
  "npm run zk:c01-beta18-h6-source-migration-review-check",
  "VANTA_C01_BETA18_H6_PROBE_RAW=1 npm run zk:c01-beta18-h6-migration-probe-check",
  "npm run zk:c01-current-source-sunspot-compile-attempt-check",
  "npm run zk:c01-sunspot-groth16-dev-probe-check",
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-public-witness-binding-check",
  "npm run zk:review-guards-check",
]) {
  assert(packet.canonicalCommands.includes(command), `missing canonical command ${command}`);
}
for (const marker of [
  "source-migration blocker evidence only",
  "current beta18 shim is pre-H6",
  "not a reviewed source migration",
  "not production source lineage",
  "not production proof-format evidence",
  "not verifier-adapter acceptance",
  "not SBF/live lineage",
  "not C01 closure",
]) {
  includes(packet.truthBoundary ?? "", marker, "truth boundary");
}

for (const marker of [
  "C01 beta18 source-migration candidate packet",
  packetPath,
  "npm run zk:c01-beta18-source-migration-candidate-check",
  "ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json",
  "npm run zk:c01-beta18-h6-migration-probe-check",
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json",
  "npm run zk:c01-beta18-h6-source-migration-review-check",
  "pre-H6 and comparison-only",
  "public witness matches the current H6 proof receipt",
  "reviewed source migration",
]) {
  includes(decision, marker, decisionPath);
  includes(auditPackage, marker, auditPackagePath);
}

console.log("private-pool-v2 C01 beta18 source-migration candidate: PASS");

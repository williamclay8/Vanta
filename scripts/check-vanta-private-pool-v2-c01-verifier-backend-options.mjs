import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 C01 verifier backend options: FAIL - ${message}`);
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

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const options = JSON.parse(read("ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json"));
const candidate = JSON.parse(read("ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json"));
const localProofFormat = JSON.parse(read("ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json"));
const groth16ProofFormatCandidate = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json"),
);
const productionVerifyingKeyCandidate = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json"),
);
const verifierAdapterTestCandidate = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json"),
);
const registry = JSON.parse(read("ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json"));
const decision = read("docs/zk/c01-production-verifier-backend-decision.md");

assert(
  scripts["zk:c01-verifier-backend-options-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-backend-options.mjs",
  "package.json must expose zk:c01-verifier-backend-options-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-backend-options-check"),
    `${aggregate} must include the backend-options guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-groth16-proof-format-candidate-check"),
    `${aggregate} must include the Groth16 proof-format candidate guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-production-verifying-key-candidate-check"),
    `${aggregate} must include the production verifying-key candidate guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-adapter-test-candidate-check"),
    `${aggregate} must include the verifier adapter-test candidate guard`,
  );
}

assert(
  options.version === "vanta-private-pool-v2-c01-verifier-backend-options-evidence-0.1",
  "backend-options evidence must use the checked schema",
);
assert(options.status === "blocked-backend-options-unselected", "backend-options status must stay blocked");
assert(options.selectedBackend === null, "backend-options must not select a backend");
assert(options.selectedBackendStatus === "not-selected", "backend-options selectedBackendStatus must stay not-selected");
for (const [field, expected] of [
  ["productionReady", false],
  ["mainnetReady", false],
  ["privacyClaimAllowed", false],
  ["c01VerifierReady", false],
  ["solanaC01Groth16VerifierReady", false],
]) {
  assert(options[field] === expected, `backend-options ${field} must be ${expected}`);
}

assert(
  options.decisionPacketRef === "docs/zk/c01-production-verifier-backend-decision.md",
  "backend-options must reference the C01 decision packet",
);
assert(
  options.candidatePacketRef === "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
  "backend-options must reference the C01 candidate packet",
);
assert(
  options.localProofFormatRef === "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json",
  "backend-options must reference the local proof-format observation",
);
assert(
  options.verifierKeyRegistryRef === "ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json",
  "backend-options must reference the verifier-key registry evidence",
);
assert(
  options.productionVerifyingKeyCandidateRef ===
    "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json",
  "backend-options must reference the production verifying-key candidate evidence",
);
assert(
  options.verifierAdapterTestCandidateRef ===
    "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "backend-options must reference the verifier adapter-test candidate evidence",
);

assert(options.currentTargetContract?.tag === 3, "backend-options must preserve tag 3 as current target");
assert(
  options.currentTargetContract?.target === "solana-c01-tag3-groth16-v0",
  "backend-options must preserve the current Groth16 tag-3 target",
);
assert(
  options.currentTargetContract?.proofSystem === "groth16",
  "backend-options current target must stay Groth16-shaped",
);
assert(
  options.currentTargetContract?.proofByteLength === 256,
  "backend-options current target must stay 256-byte Groth16 proof shaped",
);
assert(
  options.currentTargetContract?.verifyingKeyHashKind === "production-verifying-key-hash",
  "backend-options current target must require production VK hash kind",
);
assert(
  options.currentTargetContract?.status === "reserved-fail-closed",
  "backend-options current target must remain fail closed",
);

assert(
  options.currentLocalObservation?.proofSystem === localProofFormat.localProofObservation?.proofSystem,
  "backend-options local proof system must match local proof-format observation",
);
assert(
  options.currentLocalObservation?.backend === localProofFormat.localProofObservation?.backend,
  "backend-options local backend must match local proof-format observation",
);
assert(
  options.currentLocalObservation?.proofByteLength === localProofFormat.localProofObservation?.proofByteLength,
  "backend-options local proof length must match local proof-format observation",
);
assert(
  options.currentLocalObservation?.verifyingKeyHashKind ===
    localProofFormat.localProofObservation?.verifyingKeyHashKind,
  "backend-options local VK hash kind must match local proof-format observation",
);
assert(
  registry.status === "source-only-verifier-key-registry-scaffold",
  "registry evidence must stay source-only while backend options are unselected",
);

const optionById = new Map((options.backendOptions ?? []).map((entry) => [entry.id, entry]));
const groth16 = optionById.get("groth16-tag3-solana-v0");
const ultrahonk = optionById.get("noir-bb-ultrahonk-adaptation");
assert(groth16, "backend-options must include groth16-tag3-solana-v0");
assert(ultrahonk, "backend-options must include noir-bb-ultrahonk-adaptation");
assert(groth16.status === "blocked", "Groth16 option must stay blocked");
assert(ultrahonk.status === "blocked", "UltraHonk option must stay blocked");
assert(groth16.selectsCurrentTag3Contract === true, "Groth16 option must select the current tag-3 contract");
assert(ultrahonk.selectsCurrentTag3Contract === false, "UltraHonk option must require a new target or boundary");
assert(groth16.proofSystem === "groth16", "Groth16 option must name Groth16");
assert(ultrahonk.proofSystem === "noir-bb", "UltraHonk option must name noir-bb");
assert(ultrahonk.backend === "barretenberg-ultrahonk", "UltraHonk option must name barretenberg-ultrahonk");
assert(
  groth16.proofFormatCandidateRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json",
  "Groth16 option must reference the blocked proof-format candidate packet",
);
assert(
  groth16.proofFormatCandidateRef?.command === "npm run zk:c01-groth16-proof-format-candidate-check",
  "Groth16 option must record the proof-format candidate guard",
);
assert(
  groth16.proofFormatCandidateRef?.status === "blocked-no-groth16-production-proof-format-artifact",
  "Groth16 proof-format candidate ref must remain blocked",
);
assert(
  groth16ProofFormatCandidate.status === "blocked-no-groth16-production-proof-format-artifact",
  "Groth16 proof-format candidate packet must remain blocked",
);
assert(
  groth16ProofFormatCandidate.currentCandidateArtifact?.artifactRef === null,
  "Groth16 proof-format candidate packet must not carry a current artifact ref",
);
assert(
  groth16ProofFormatCandidate.satisfiesRequiredPositiveEvidence?.actualPrivateSpendProductionProofFormat === false,
  "Groth16 proof-format candidate packet must not satisfy production proof-format evidence",
);
assert(
  groth16.productionVerifyingKeyCandidateRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json",
  "Groth16 option must reference the blocked production verifying-key candidate packet",
);
assert(
  groth16.productionVerifyingKeyCandidateRef?.command ===
    "npm run zk:c01-production-verifying-key-candidate-check",
  "Groth16 option must record the production verifying-key candidate guard",
);
assert(
  groth16.productionVerifyingKeyCandidateRef?.status ===
    "blocked-no-production-verifying-key-hash-artifact",
  "Groth16 production verifying-key candidate ref must remain blocked",
);
assert(
  productionVerifyingKeyCandidate.status === "blocked-no-production-verifying-key-hash-artifact",
  "production verifying-key candidate packet must remain blocked",
);
assert(
  productionVerifyingKeyCandidate.currentProductionVerifyingKeyArtifact?.artifactRef === null,
  "production verifying-key candidate packet must not carry a current artifact ref",
);
assert(
  productionVerifyingKeyCandidate.satisfiesRequiredPositiveEvidence?.productionVerifyingKeyHash === false,
  "production verifying-key candidate packet must not satisfy production verifying-key evidence",
);
assert(
  groth16.verifierAdapterTestCandidateRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "Groth16 option must reference the blocked verifier adapter-test candidate packet",
);
assert(
  groth16.verifierAdapterTestCandidateRef?.command ===
    "npm run zk:c01-verifier-adapter-test-candidate-check",
  "Groth16 option must record the verifier adapter-test guard",
);
assert(
  groth16.verifierAdapterTestCandidateRef?.status === "blocked-no-verifier-adapter-acceptance-tests",
  "Groth16 verifier adapter-test candidate ref must remain blocked",
);
assert(
  verifierAdapterTestCandidate.status === "blocked-no-verifier-adapter-acceptance-tests",
  "verifier adapter-test candidate packet must remain blocked",
);
assert(
  verifierAdapterTestCandidate.currentAdapterArtifact?.artifactRef === null,
  "verifier adapter-test candidate packet must not carry a current adapter artifact ref",
);
assert(
  verifierAdapterTestCandidate.satisfiesRequiredPositiveEvidence?.verifierAdapter === false,
  "verifier adapter-test candidate packet must not satisfy verifier adapter evidence",
);

for (const required of [
  "actual-private-spend-groth16-production-proof-format",
  "production-verifying-key-hash",
  "tag3-verifier-adapter-or-verifier-cpi",
  "valid-proof-mutates-nullifier-output-state",
  "invalid-proof-leaves-account-bytes-unchanged",
  "rebuilt-redeployed-reinitialized-sbf-lineage",
  "audit-or-reviewer-acceptance",
]) {
  assert(groth16.requires?.includes(required), `Groth16 option missing requirement ${required}`);
}
for (const required of [
  "production-ultrahonk-verifier-target-or-service-boundary",
  "production-verifying-key-evidence-not-local-acir",
  "new-proof-byte-layout-or-service-contract",
  "private-spend-public-input-hash-binding-test",
  "verifier-adapter-or-production-service-acceptance",
  "valid-proof-mutates-or-production-service-acceptance-evidence",
  "invalid-proof-rejection-no-mutation-or-service-rejection-evidence",
  "live-lineage-and-audit-or-reviewer-acceptance",
]) {
  assert(ultrahonk.requires?.includes(required), `UltraHonk option missing requirement ${required}`);
}
includes(groth16.truthBoundary ?? "", "blocked until", "Groth16 option truth boundary");
includes(ultrahonk.truthBoundary ?? "", "not compatible", "UltraHonk option truth boundary");

for (const [field, expected] of [
  ["localProofFormatObservation", true],
  ["verifierKeyRegistryScaffold", true],
  ["productionVerifyingKeyCandidate", true],
  ["verifierAdapterTestCandidate", true],
  ["candidateEvidencePacket", true],
]) {
  assert(options.intermediateEvidenceOnly?.[field] === expected, `${field} must be intermediate-only`);
}
for (const [field, expected] of [
  ["backendSelection", false],
  ["actualPrivateSpendProductionProofFormat", false],
  ["privateSpendPublicInputHashBinding", false],
  ["productionVerifyingKeyHash", false],
  ["verifierAdapter", false],
  ["acceptedProofMutatesStateTest", false],
  ["invalidProofLeavesAccountsUnchangedTest", false],
  ["sbfLiveLineage", false],
  ["auditReviewerAcceptance", false],
]) {
  assert(options.satisfiesRequiredPositiveEvidence?.[field] === expected, `${field} must be ${expected}`);
}
for (const phrase of [
  "backend selection",
  "production proof-format acceptance",
  "production verifying-key evidence",
  "tag-3 proof acceptance",
]) {
  includes(options.truthBoundary ?? "", phrase, "backend-options truth boundary");
}
assert(
  options.canonicalCommands?.includes("npm run zk:c01-verifier-backend-options-check"),
  "backend-options must record its canonical guard",
);
assert(
  options.canonicalCommands?.includes("npm run zk:c01-groth16-proof-format-candidate-check"),
  "backend-options must record the Groth16 proof-format candidate guard",
);
assert(
  options.canonicalCommands?.includes("npm run zk:c01-production-verifying-key-candidate-check"),
  "backend-options must record the production verifying-key candidate guard",
);
assert(
  options.canonicalCommands?.includes("npm run zk:c01-verifier-adapter-test-candidate-check"),
  "backend-options must record the verifier adapter-test candidate guard",
);

const optionsRef = candidate.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-verifier-backend-options-matrix",
);
assert(
  optionsRef?.artifactRef === "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json",
  "candidate packet must reference the backend-options evidence packet",
);
assert(
  optionsRef?.command === "npm run zk:c01-verifier-backend-options-check",
  "candidate packet must record the backend-options guard",
);
includes(optionsRef?.truthBoundary ?? "", "does not select a backend", "candidate backend-options truth boundary");
assert(
  candidate.selectedBackend === null && candidate.selectedBackendStatus === "not-selected",
  "candidate packet must remain backend-unselected",
);
assert(
  candidate.requiredPositiveEvidence?.every((entry) => entry.status === "blocked" && entry.currentArtifactRef === null),
  "candidate packet positive evidence must remain blocked and unreferenced",
);

for (const marker of [
  "Backend Options Evidence",
  "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json",
  "npm run zk:c01-verifier-backend-options-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "groth16-tag3-solana-v0",
  "noir-bb-ultrahonk-adaptation",
  "does not select a backend",
]) {
  includes(decision, marker, "C01 backend decision docs");
}

console.log("private-pool-v2 C01 verifier backend options: PASS");

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
const productionGroth16ToolchainPreflight = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json"),
);
const productionVerifyingKeyCandidate = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json"),
);
const productionArtifactAcceptanceGate = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json"),
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
    scripts[aggregate]?.includes("npm run zk:c01-production-groth16-toolchain-preflight-check"),
    `${aggregate} must include the production Groth16 toolchain preflight guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-adapter-test-candidate-check"),
    `${aggregate} must include the verifier adapter-test candidate guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-production-artifact-acceptance-gate-check"),
    `${aggregate} must include the production artifact acceptance gate guard`,
  );
}

assert(
  options.version === "vanta-private-pool-v2-c01-verifier-backend-options-evidence-0.1",
  "backend-options evidence must use the checked schema",
);
assert(
  options.status === "blocked-selected-groth16-tag3-solana-v0-production-evidence",
  "backend-options status must stay blocked while selected-backend evidence is absent",
);
assert(options.selectedBackend === "groth16-tag3-solana-v0", "backend-options must select the tag-3 backend");
assert(
  options.selectedBackendStatus === "selected-pending-production-evidence",
  "backend-options selectedBackendStatus must stay selected but evidence-blocked",
);
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
  options.productionGroth16ToolchainPreflightRef ===
    "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json",
  "backend-options must reference the production Groth16 toolchain preflight evidence",
);
assert(
  options.productionVerifyingKeyCandidateRef ===
    "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json",
  "backend-options must reference the production verifying-key candidate evidence",
);
assert(
  options.productionArtifactAcceptanceGateRef ===
    "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json",
  "backend-options must reference the production artifact acceptance gate evidence",
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
  options.currentTargetContract?.proofFormatId === "gnark-solana-native-proof-and-public-witness-v0",
  "backend-options current target must select the Gnark-native proof/public-witness tuple",
);
assert(
  options.currentTargetContract?.proofByteLength === 324,
  "backend-options current target must use the selected 324-byte Gnark proof",
);
assert(
  options.currentTargetContract?.publicWitnessByteLength === 44,
  "backend-options current target must use the selected 44-byte public witness",
);
assert(
  options.currentTargetContract?.verifierInstructionDataByteLength === 368,
  "backend-options current target must use the selected 368-byte verifier instruction data",
);
assert(
  options.currentTargetContract?.verifyingKeyHashKind === "production-verifying-key-hash",
  "backend-options current target must require production VK hash kind",
);
assert(
  options.currentTargetContract?.currentProgramReservedProofByteLength === 324,
  "backend-options current target must record the current source ABI Gnark proof length",
);
assert(
  options.currentTargetContract?.currentProgramReservedPublicWitnessByteLength === 44,
  "backend-options current target must record the current source ABI public witness length",
);
assert(
  options.currentTargetContract?.currentProgramReservedVerifierInputByteLength === 368,
  "backend-options current target must record the current source ABI verifier input length",
);
assert(
  options.currentTargetContract?.adapterBoundaryStatus ===
    "spend-program-tag3-abi-reserves-selected-gnark-tuple-and-dedicated-verifier-cpi-account-fail-closed",
  "backend-options current target must preserve the adapter boundary blocker",
);
assert(
  options.currentTargetContract?.status === "selected-candidate-format-pending-production-evidence",
  "backend-options current target must remain selected but production-evidence blocked",
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
  "registry evidence must stay source-only while selected-backend production evidence is absent",
);

const optionById = new Map((options.backendOptions ?? []).map((entry) => [entry.id, entry]));
const groth16 = optionById.get("groth16-tag3-solana-v0");
const ultrahonk = optionById.get("noir-bb-ultrahonk-adaptation");
assert(groth16, "backend-options must include groth16-tag3-solana-v0");
assert(ultrahonk, "backend-options must include noir-bb-ultrahonk-adaptation");
assert(groth16.status === "selected-production-evidence-blocked", "Groth16 option must stay selected but blocked");
assert(ultrahonk.status === "not-selected", "UltraHonk option must stay not selected");
assert(groth16.selectsCurrentTag3Contract === true, "Groth16 option must select the current tag-3 contract");
assert(ultrahonk.selectsCurrentTag3Contract === false, "UltraHonk option must require a new target or boundary");
assert(groth16.proofSystem === "groth16", "Groth16 option must name Groth16");
assert(groth16.proofFormatId === "gnark-solana-native-proof-and-public-witness-v0", "Groth16 option proof format mismatch");
assert(groth16.proofByteLength === 324, "Groth16 option proof length mismatch");
assert(groth16.publicWitnessByteLength === 44, "Groth16 option public witness length mismatch");
assert(groth16.verifierInstructionDataByteLength === 368, "Groth16 option verifier instruction-data length mismatch");
assert(groth16.currentProgramReservedProofByteLength === 324, "Groth16 option current proof length mismatch");
assert(groth16.currentProgramReservedPublicWitnessByteLength === 44, "Groth16 option current public witness length mismatch");
assert(groth16.currentProgramReservedVerifierInputByteLength === 368, "Groth16 option current verifier input length mismatch");
assert(
  groth16.adapterBoundaryStatus ===
    "spend-program-tag3-abi-reserves-selected-gnark-tuple-and-dedicated-verifier-cpi-account-fail-closed",
  "Groth16 option adapter boundary status mismatch",
);
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
  groth16.toolchainPreflightRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json",
  "Groth16 option must reference the blocked production Groth16 toolchain preflight packet",
);
assert(
  groth16.toolchainPreflightRef?.command ===
    "npm run zk:c01-production-groth16-toolchain-preflight-check",
  "Groth16 option must record the production Groth16 toolchain preflight guard",
);
assert(
  groth16.toolchainPreflightRef?.status === "blocked-local-toolchain-no-groth16-scheme",
  "Groth16 option production Groth16 toolchain preflight ref must remain blocked",
);
assert(
  productionGroth16ToolchainPreflight.status === "blocked-local-toolchain-no-groth16-scheme",
  "production Groth16 toolchain preflight packet must remain blocked",
);
assert(
  productionGroth16ToolchainPreflight.satisfiesRequiredPositiveEvidence
    ?.actualPrivateSpendProductionProofFormat === false,
  "production Groth16 toolchain preflight packet must not satisfy production proof-format evidence",
);
assert(
  groth16.productionArtifactAcceptanceGateRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json",
  "Groth16 option must reference the production artifact acceptance gate packet",
);
assert(
  groth16.productionArtifactAcceptanceGateRef?.command ===
    "npm run zk:c01-production-artifact-acceptance-gate-check",
  "Groth16 option must record the production artifact acceptance gate guard",
);
assert(
  groth16.productionArtifactAcceptanceGateRef?.status === "blocked-no-reviewed-production-artifact-bundle",
  "Groth16 production artifact acceptance gate ref must remain blocked",
);
assert(
  productionArtifactAcceptanceGate.status === "blocked-no-reviewed-production-artifact-bundle",
  "production artifact acceptance gate packet must remain blocked",
);
assert(
  productionArtifactAcceptanceGate.currentAcceptedProductionBundle?.bundleRef === null,
  "production artifact acceptance gate must not carry a bundle ref",
);
assert(
  productionArtifactAcceptanceGate.satisfiesRequiredPositiveEvidence?.productionArtifactAcceptance === false,
  "production artifact acceptance gate must not satisfy production artifact acceptance",
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
  groth16.localFailClosedVerifierAdapterSeamHarnessRef?.status === "local-fail-closed-harness-only",
  "Groth16 option must record the local fail-closed adapter seam harness",
);
assert(
  groth16.localFailClosedVerifierAdapterSeamHarnessRef?.command ===
    "npm run zk:c01-verifier-adapter-seam-check",
  "Groth16 option must record the local adapter seam guard",
);
assert(
  groth16.localFailClosedVerifierAdapterSeamHarnessRef?.sourceRef ===
    "programs/vanta_private_pool_v2_spend/src/lib.rs",
  "Groth16 option local adapter seam source ref mismatch",
);
includes(
  groth16.localFailClosedVerifierAdapterSeamHarnessRef?.truthBoundary ?? "",
  "does not satisfy verifier-adapter acceptance",
  "Groth16 local seam truth boundary",
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
assert(
  verifierAdapterTestCandidate.localFailClosedVerifierAdapterSeamHarness?.satisfiesVerifierAdapterAcceptance ===
    false,
  "local seam harness must not satisfy verifier adapter acceptance",
);
assert(
  groth16.currentBlockedBy?.includes(
    "local fail-closed verifier adapter seam harness exists with a reserved verifier-program CPI account, verifier-key/program binding, and instruction shape, but no production adapter acceptance or positive/negative proof evidence exists",
  ),
  "Groth16 option must keep local seam blocked-by language",
);

for (const required of [
  "actual-private-spend-groth16-production-proof-format",
  "reviewed-production-artifact-bundle",
  "production-verifying-key-hash",
  "tag3-verifier-adapter-or-verifier-cpi",
  "valid-proof-mutates-nullifier-output-state",
  "invalid-proof-leaves-account-bytes-unchanged",
  "wrong-public-input-hash-leaves-account-bytes-unchanged",
  "wrong-verifying-key-leaves-account-bytes-unchanged",
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
  ["groth16ProofFormatCandidate", true],
  ["verifierKeyRegistryScaffold", true],
  ["productionVerifyingKeyCandidate", true],
  ["productionArtifactAcceptanceGate", true],
  ["verifierAdapterTestCandidate", true],
  ["localFailClosedVerifierAdapterSeamHarness", true],
  ["candidateEvidencePacket", true],
]) {
  assert(options.intermediateEvidenceOnly?.[field] === expected, `${field} must be intermediate-only`);
}
for (const [field, expected] of [
  ["backendSelection", true],
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
  assert(options.satisfiesRequiredPositiveEvidence?.[field] === expected, `${field} must be ${expected}`);
}
for (const phrase of [
  "selected C01 backend direction",
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
assert(
  options.canonicalCommands?.includes("npm run zk:c01-production-artifact-acceptance-gate-check"),
  "backend-options must record the production artifact acceptance gate guard",
);
assert(
  options.canonicalCommands?.includes("npm run zk:c01-verifier-adapter-seam-check"),
  "backend-options must record the verifier adapter seam guard",
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
includes(optionsRef?.truthBoundary ?? "", "selected backend direction", "candidate backend-options truth boundary");
assert(
  candidate.selectedBackend === "groth16-tag3-solana-v0" &&
    candidate.selectedBackendStatus === "selected-pending-production-evidence",
  "candidate packet must record selected backend while evidence stays blocked",
);
assert(
  candidate.requiredPositiveEvidence?.every((entry) =>
    entry.id === "backend-selection"
      ? entry.status === "satisfied-local-selection" &&
        entry.currentArtifactRef === "docs/zk/c01-production-verifier-backend-decision.md"
      : entry.status === "blocked" && entry.currentArtifactRef === null,
  ),
  "candidate packet must satisfy only backend selection while production evidence remains blocked",
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
  "records `groth16-tag3-solana-v0` as the selected direction",
]) {
  includes(decision, marker, "C01 backend decision docs");
}

console.log("private-pool-v2 C01 verifier backend options: PASS");

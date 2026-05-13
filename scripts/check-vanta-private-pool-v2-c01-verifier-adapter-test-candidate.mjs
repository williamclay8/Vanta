import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const optionsPath = "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json";
const proofFormatPath = "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const productionVkPath = "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json";
const registryPath = "ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json";
const localProofPath = "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const programPath = "programs/vanta_private_pool_v2_spend/src/lib.rs";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 C01 verifier adapter-test candidate: FAIL - ${message}`);
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

function assertAllowedKeys(value, label, allowedKeys) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  const allowed = new Set(allowedKeys);

  for (const key of Object.keys(value)) {
    assert(allowed.has(key), `${label} has unexpected key ${key}`);
  }

  for (const key of allowedKeys) {
    assert(Object.hasOwn(value, key), `${label} missing key ${key}`);
  }
}

function assertStringArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  for (const [index, entry] of value.entries()) {
    assert(typeof entry === "string", `${label}[${index}] must be a string`);
  }
}

function findRequiredEvidence(candidate, id) {
  const evidence = candidate.requiredPositiveEvidence?.find((entry) => entry.id === id);
  assert(evidence, `candidate missing required positive evidence id ${id}`);
  return evidence;
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const candidate = JSON.parse(read(candidatePath));
const options = JSON.parse(read(optionsPath));
const proofFormat = JSON.parse(read(proofFormatPath));
const productionVk = JSON.parse(read(productionVkPath));
const registry = JSON.parse(read(registryPath));
const localProof = JSON.parse(read(localProofPath));
const decision = read(decisionPath);
const program = read(programPath);

assert(
  scripts["zk:c01-verifier-adapter-test-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-adapter-test-candidate.mjs",
  "package.json must expose zk:c01-verifier-adapter-test-candidate-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-adapter-test-candidate-check"),
    `${aggregate} must include the verifier adapter-test candidate guard`,
  );
}

assert(
  packet.version === "vanta-private-pool-v2-c01-verifier-adapter-test-candidate-evidence-0.1",
  "adapter-test packet must use the checked schema",
);
assert(
  packet.status === "blocked-no-verifier-adapter-acceptance-tests",
  "adapter-test packet must stay blocked until acceptance tests exist",
);
assert(packet.backendOptionId === "groth16-tag3-solana-v0", "packet must bind to the Groth16 tag-3 option");
assert(packet.selectedBackend === null, "packet must not select a backend");
assert(packet.selectedBackendStatus === "not-selected", "packet backend status must remain not-selected");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]) {
  assert(packet[field] === false, `adapter-test packet ${field} must be false`);
}
assert(
  packet.secretPolicy ===
    "references-and-metadata-only-no-verifying-key-bytes-no-proof-bytes-no-witness-values-no-signed-transactions",
  "packet must forbid raw verifier/proof/witness/transaction material",
);
assertAllowedKeys(packet, "adapter-test packet", [
  "version",
  "checkedAt",
  "status",
  "backendOptionId",
  "selectedBackend",
  "selectedBackendStatus",
  "mainnetReady",
  "productionReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "secretPolicy",
  "purpose",
  "candidatePacketRef",
  "backendOptionsRef",
  "groth16ProofFormatCandidateRef",
  "productionVerifyingKeyCandidateRef",
  "verifierKeyRegistryRef",
  "localProofFormatRef",
  "decisionPacketRef",
  "requiredAdapterTestShape",
  "currentAdapterArtifact",
  "currentAcceptanceTests",
  "currentFailClosedObservation",
  "blockedPrerequisiteRefs",
  "satisfiesRequiredPositiveEvidence",
  "candidatePacketMustRemain",
  "forbiddenPromotions",
  "canonicalCommands",
  "truthBoundary",
]);

for (const phrase of [
  "verifyingKeyBytes",
  "verifying_key_bytes",
  "vkBytes",
  "proofBytes",
  "proofHex",
  "rawProof",
  "raw proof",
  "witnessBytes",
  "raw witness",
  "private key",
  "seed phrase",
  "bearer ",
  "database url",
  "signed transaction",
]) {
  assert(!packetText.includes(phrase), `packet must not contain secret-bearing or byte-bearing phrase ${phrase}`);
}

for (const [field, expected] of [
  ["candidatePacketRef", candidatePath],
  ["backendOptionsRef", optionsPath],
  ["groth16ProofFormatCandidateRef", proofFormatPath],
  ["productionVerifyingKeyCandidateRef", productionVkPath],
  ["verifierKeyRegistryRef", registryPath],
  ["localProofFormatRef", localProofPath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(packet[field] === expected, `packet ${field} mismatch`);
}

const required = packet.requiredAdapterTestShape ?? {};
assertAllowedKeys(required, "required adapter-test shape", [
  "target",
  "tag",
  "circuit",
  "proofSystem",
  "proofByteLength",
  "publicInputLabel",
  "verifyingKeyHashKind",
  "adapterKind",
  "status",
]);
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["proofByteLength", 256],
  ["publicInputLabel", "private-spend-public-input-hash"],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["adapterKind", "in-program-verifier-or-dedicated-verifier-cpi"],
  ["status", "required-after-production-proof-format-and-verifying-key-evidence"],
]) {
  assert(required[field] === expected, `required adapter-test shape ${field} mismatch`);
}

const adapter = packet.currentAdapterArtifact ?? {};
assertAllowedKeys(adapter, "current adapter artifact", [
  "status",
  "artifactRef",
  "adapterKind",
  "verifierProgramRef",
  "satisfiesVerifierAdapterEvidence",
]);
assert(adapter.status === "absent", "current adapter artifact must be absent");
assert(adapter.artifactRef === null, "current adapter artifact ref must remain null");
assert(adapter.adapterKind === null, "current adapter kind must remain null");
assert(adapter.verifierProgramRef === null, "current verifier program ref must remain null");
assert(adapter.satisfiesVerifierAdapterEvidence === false, "absent adapter must not satisfy verifier evidence");

assertAllowedKeys(packet.currentAcceptanceTests, "current acceptance tests", [
  "validProofMutatesNullifierAndOutputState",
  "invalidProofLeavesAccountsUnchanged",
  "wrongPublicInputHashLeavesAccountsUnchanged",
  "wrongVerifyingKeyLeavesAccountsUnchanged",
]);
for (const [field, satisfiesField] of [
  ["validProofMutatesNullifierAndOutputState", "satisfiesAcceptedProofMutatesStateTest"],
  ["invalidProofLeavesAccountsUnchanged", "satisfiesInvalidProofLeavesAccountsUnchangedTest"],
  ["wrongPublicInputHashLeavesAccountsUnchanged", "satisfiesPrivateSpendPublicInputHashBinding"],
  ["wrongVerifyingKeyLeavesAccountsUnchanged", "satisfiesProductionVerifyingKeyBinding"],
]) {
  const test = packet.currentAcceptanceTests[field] ?? {};
  assertAllowedKeys(test, `acceptance test ${field}`, ["status", "artifactRef", satisfiesField]);
  assert(test.status === "absent", `${field} must be absent`);
  assert(test.artifactRef === null, `${field} artifact ref must remain null`);
  assert(test[satisfiesField] === false, `${field} must not satisfy positive evidence`);
}

const failClosed = packet.currentFailClosedObservation ?? {};
assertAllowedKeys(failClosed, "current fail-closed observation", [
  "tag",
  "status",
  "customError",
  "errorName",
  "failsBeforeProofVerification",
  "failsBeforeAccountCreation",
  "failsBeforeNullifierMutation",
  "failsBeforeOutputMutation",
  "failsBeforeSpendAcceptance",
  "truthBoundary",
]);
assert(failClosed.tag === 3, "fail-closed observation must lock tag 3");
assert(failClosed.status === "reserved-fail-closed", "tag 3 must remain reserved fail-closed");
assert(failClosed.customError === 14, "tag 3 must still return custom error 14");
assert(failClosed.errorName === "ERR_PROOF_VERIFIER_NOT_WIRED", "tag 3 error name mismatch");
for (const field of [
  "failsBeforeProofVerification",
  "failsBeforeAccountCreation",
  "failsBeforeNullifierMutation",
  "failsBeforeOutputMutation",
  "failsBeforeSpendAcceptance",
]) {
  assert(failClosed[field] === true, `tag 3 must preserve ${field}`);
}
includes(
  failClosed.truthBoundary ?? "",
  "not positive verifier acceptance",
  "adapter-test fail-closed truth boundary",
);

assertAllowedKeys(packet.blockedPrerequisiteRefs, "blocked prerequisite refs", [
  "groth16ProofFormatCandidate",
  "productionVerifyingKeyCandidate",
  "verifierKeyRegistry",
]);
assert(
  packet.blockedPrerequisiteRefs.groth16ProofFormatCandidate?.status ===
    "blocked-no-groth16-production-proof-format-artifact",
  "proof-format prerequisite must remain blocked",
);
assert(
  packet.blockedPrerequisiteRefs.groth16ProofFormatCandidate?.artifactRef === proofFormatPath,
  "proof-format prerequisite ref mismatch",
);
assert(
  packet.blockedPrerequisiteRefs.groth16ProofFormatCandidate?.satisfiesProductionProofFormatEvidence === false,
  "proof-format prerequisite must not satisfy production proof-format evidence",
);
assert(
  packet.blockedPrerequisiteRefs.productionVerifyingKeyCandidate?.status ===
    "blocked-no-production-verifying-key-hash-artifact",
  "production VK prerequisite must remain blocked",
);
assert(
  packet.blockedPrerequisiteRefs.productionVerifyingKeyCandidate?.artifactRef === productionVkPath,
  "production VK prerequisite ref mismatch",
);
assert(
  packet.blockedPrerequisiteRefs.productionVerifyingKeyCandidate?.satisfiesProductionVerifyingKeyEvidence === false,
  "production VK prerequisite must not satisfy production VK evidence",
);
assert(
  packet.blockedPrerequisiteRefs.verifierKeyRegistry?.status === "source-only-verifier-key-registry-scaffold",
  "verifier-key registry prerequisite must remain source-only",
);
assert(
  packet.blockedPrerequisiteRefs.verifierKeyRegistry?.artifactRef === registryPath,
  "verifier-key registry prerequisite ref mismatch",
);
assert(
  packet.blockedPrerequisiteRefs.verifierKeyRegistry?.satisfiesProductionVerifyingKeyEvidence === false,
  "verifier-key registry metadata must not satisfy production VK evidence",
);

assertAllowedKeys(packet.satisfiesRequiredPositiveEvidence, "required positive evidence map", [
  "backendSelection",
  "actualPrivateSpendProductionProofFormat",
  "privateSpendPublicInputHashBinding",
  "productionVerifyingKeyHash",
  "verifierAdapter",
  "acceptedProofMutatesStateTest",
  "invalidProofLeavesAccountsUnchangedTest",
  "sbfLiveLineage",
  "auditReviewerAcceptance",
]);
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
  assert(packet.satisfiesRequiredPositiveEvidence?.[field] === expected, `${field} must remain ${expected}`);
}

assertAllowedKeys(packet.candidatePacketMustRemain, "candidate packet invariant", [
  "selectedBackend",
  "selectedBackendStatus",
  "verifierAdapterCurrentArtifactRef",
  "acceptedProofMutatesStateTestCurrentArtifactRef",
  "invalidProofLeavesAccountsUnchangedTestCurrentArtifactRef",
  "privateSpendPublicInputHashBindingCurrentArtifactRef",
  "allRequiredPositiveEvidenceStatus",
]);
assert(packet.candidatePacketMustRemain.selectedBackend === null, "candidate invariant selectedBackend mismatch");
assert(
  packet.candidatePacketMustRemain.selectedBackendStatus === "not-selected",
  "candidate invariant selected backend status mismatch",
);
for (const field of [
  "verifierAdapterCurrentArtifactRef",
  "acceptedProofMutatesStateTestCurrentArtifactRef",
  "invalidProofLeavesAccountsUnchangedTestCurrentArtifactRef",
  "privateSpendPublicInputHashBindingCurrentArtifactRef",
]) {
  assert(packet.candidatePacketMustRemain[field] === null, `${field} must remain null`);
}
assertStringArray(packet.forbiddenPromotions, "packet forbiddenPromotions");
assertStringArray(packet.canonicalCommands, "packet canonicalCommands");

assert(candidate.selectedBackend === null, "candidate packet must keep selectedBackend null");
assert(candidate.selectedBackendStatus === "not-selected", "candidate packet must keep backend unselected");
for (const id of [
  "private-spend-public-input-hash-binding",
  "production-verifying-key-hash",
  "verifier-adapter",
  "accepted-proof-mutates-state-test",
  "invalid-proof-leaves-accounts-unchanged-test",
]) {
  const evidence = findRequiredEvidence(candidate, id);
  assert(evidence.status === "blocked", `candidate ${id} must remain blocked`);
  assert(evidence.currentArtifactRef === null, `candidate ${id} currentArtifactRef must stay null`);
}
const intermediate = candidate.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-verifier-adapter-acceptance-test-candidate",
);
assert(
  intermediate?.status === "blocked-no-verifier-adapter-acceptance-tests",
  "candidate adapter-test ref status mismatch",
);
assert(intermediate?.artifactRef === packetPath, "candidate must reference adapter-test packet");
assert(
  intermediate?.command === "npm run zk:c01-verifier-adapter-test-candidate-check",
  "candidate must record adapter-test guard",
);
includes(
  intermediate?.truthBoundary ?? "",
  "does not satisfy verifier-adapter evidence",
  "candidate adapter-test truth boundary",
);

const groth16Option = options.backendOptions?.find((entry) => entry.id === "groth16-tag3-solana-v0");
assert(groth16Option, "backend options must include Groth16 tag-3 option");
assert(groth16Option.status === "blocked", "Groth16 backend option must remain blocked");
assert(
  groth16Option.verifierAdapterTestCandidateRef?.artifactRef === packetPath,
  "Groth16 option must reference adapter-test packet",
);
assert(
  groth16Option.verifierAdapterTestCandidateRef?.status ===
    "blocked-no-verifier-adapter-acceptance-tests",
  "Groth16 option adapter-test ref must stay blocked",
);
assert(
  options.satisfiesRequiredPositiveEvidence?.verifierAdapter === false,
  "backend options must not satisfy verifier adapter evidence",
);
assert(
  options.satisfiesRequiredPositiveEvidence?.acceptedProofMutatesStateTest === false,
  "backend options must not satisfy accepted-proof mutation evidence",
);
assert(
  options.satisfiesRequiredPositiveEvidence?.invalidProofLeavesAccountsUnchangedTest === false,
  "backend options must not satisfy invalid-proof no-mutation evidence",
);

assert(
  proofFormat.status === "blocked-no-groth16-production-proof-format-artifact",
  "proof-format packet must remain blocked while adapter tests are absent",
);
assert(
  proofFormat.satisfiesRequiredPositiveEvidence?.actualPrivateSpendProductionProofFormat === false,
  "proof-format packet must not satisfy production proof-format evidence",
);
assert(
  productionVk.status === "blocked-no-production-verifying-key-hash-artifact",
  "production VK packet must remain blocked while adapter tests are absent",
);
assert(
  productionVk.currentProductionVerifyingKeyArtifact?.artifactRef === null,
  "production VK packet artifact ref must remain null",
);
assert(
  registry.status === "source-only-verifier-key-registry-scaffold",
  "registry packet must remain source-only",
);
assert(
  registry.satisfiesRequiredPositiveEvidence?.productionVerifyingKeyHash === false,
  "registry packet must not satisfy production VK evidence",
);
assert(
  localProof.status === "local-proof-format-observed-not-production",
  "local proof-format packet must remain local observation only",
);

for (const marker of [
  "const TAG_SPEND_WITH_PROOF: u8 = 3;",
  "const TAG_REGISTER_VERIFIER_KEY: u8 = 5;",
  "const ERR_PROOF_VERIFIER_NOT_WIRED: u32 = 14;",
  "require_verifier_key_hash(program_id, pool_state, verifier_key, verifier_key_hash)?;",
  "proof-carrying spend ABI is reserved; verifier not wired after root/nullifier/output/verifier-key preflight",
  "Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))",
]) {
  includes(program, marker, programPath);
}

for (const marker of [
  "Verifier Adapter Acceptance-Test Candidate packet",
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "blocked-no-verifier-adapter-acceptance-tests",
  "does not satisfy verifier-adapter evidence",
  "does not prove tag-3 proof acceptance",
]) {
  includes(decision, marker, decisionPath);
}

for (const command of [
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
]) {
  assert(packet.canonicalCommands?.includes(command), `packet must record canonical command ${command}`);
}
for (const phrase of [
  "blocked verifier-adapter acceptance-test candidate packet only",
  "not verifier-adapter acceptance",
  "not tag-3 proof acceptance",
  "not production proof-format evidence",
  "not production verifying-key evidence",
]) {
  includes(packet.truthBoundary ?? "", phrase, "adapter-test packet truth boundary");
}

console.log("private-pool-v2 C01 verifier adapter-test candidate: PASS");

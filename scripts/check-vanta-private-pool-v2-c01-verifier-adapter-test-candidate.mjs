import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const optionsPath = "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json";
const proofFormatPath = "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const productionVkPath = "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json";
const acceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const adapterAcceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json";
const registryPath = "ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json";
const localProofPath = "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json";
const localSunspotGroth16DevProbePath =
  "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const programPath = "programs/vanta_private_pool_v2_spend/src/lib.rs";
const crucibleHarnessPath = "fuzz/vanta_private_pool_v2_spend/src/main.rs";

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
const acceptanceGate = JSON.parse(read(acceptanceGatePath));
const adapterAcceptanceGate = JSON.parse(read(adapterAcceptanceGatePath));
const registry = JSON.parse(read(registryPath));
const localProof = JSON.parse(read(localProofPath));
const localSunspotGroth16DevProbe = JSON.parse(read(localSunspotGroth16DevProbePath));
const decision = read(decisionPath);
const program = read(programPath);
const crucibleHarness = read(crucibleHarnessPath);

assert(
  scripts["zk:c01-verifier-adapter-test-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-adapter-test-candidate.mjs",
  "package.json must expose zk:c01-verifier-adapter-test-candidate-check",
);
assert(
  scripts["zk:c01-verifier-adapter-seam-check"]?.includes(
    "proof_carrying_spend_default_adapter_rejects_before_commit",
  ),
  "package.json must expose focused C01 verifier adapter seam Rust guard",
);
for (const marker of [
  "proof_carrying_spend_preflights_accounts_before_fail_closed_verifier",
  "proof_carrying_spend_verifier_instruction_data_matches_gnark_tuple",
  "proof_carrying_spend_verifier_cpi_instruction_matches_generated_solana_verifier_shape",
  "proof_carrying_spend_requires_readonly_executable_verifier_program_account",
  "proof_carrying_spend_public_witness_binding_",
  "verified_spend_commit_mutates_only_after_adapter_acceptance",
  "proof_carrying_spend_commit_capable_account_list_mutates_after_fixture_adapter_acceptance",
  "proof_carrying_spend_rejects_legacy_256_byte_payload_shape",
  "selected_gnark_fixture_adapter_",
]) {
  assert(
    scripts["zk:c01-verifier-adapter-seam-check"]?.includes(marker),
    `C01 verifier adapter seam guard must include ${marker}`,
  );
}
assert(
  scripts["private-pool-v2:c01-sbf-verifier-cpi-rejection-check"] ===
    "cargo test --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml --features invariant_test spend_with_proof_sbf_verifier_cpi_rejection_no_mutation -- --nocapture",
  "package.json must expose private-pool-v2:c01-sbf-verifier-cpi-rejection-check",
);
assert(
  scripts["private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check"]?.includes(
    "spend_with_proof_local_unsafe_generated_verifier_cpi_acceptance_and_no_mutation",
  ),
  "package.json must expose the local unsafe C01 generated verifier CPI acceptance check",
);
for (const marker of [
  "beta18-h6-circuit/target",
  "VANTA_C01_LOCAL_GNARK_VK_SHA256=5e0a6f08503f534cbb462f43fbf0b247e8aa2ce75d1fa58c2350f815817948b4",
  "VANTA_C01_LOCAL_GNARK_WRONG_VERIFIER_SBF=/private/tmp/vanta-c01-sunspot-lane/work/beta18-circuit/target/vanta_private_pool_v2_actual_private_spend_entry.so",
  "VANTA_C01_LOCAL_GNARK_WRONG_VK_SHA256=fbd6ba8ce64cc0b0320a0d8080fca15d79ca6ca2f732381a9550092f645f0e1d",
]) {
  assert(
    scripts["private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check"]?.includes(marker),
    `local unsafe C01 generated verifier CPI acceptance check must include ${marker}`,
  );
}
assert(
  scripts["private-pool-v2:crucible-check"]?.includes(
    "npm run private-pool-v2:c01-sbf-verifier-cpi-rejection-check",
  ),
  "private-pool-v2:crucible-check must include the C01 SBF verifier CPI rejection check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-adapter-test-candidate-check"),
    `${aggregate} must include the verifier adapter-test candidate guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-adapter-seam-check"),
    `${aggregate} must include the verifier adapter seam guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-production-artifact-acceptance-gate-check"),
    `${aggregate} must include the C01 production artifact acceptance gate guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-adapter-acceptance-gate-check"),
    `${aggregate} must include the C01 verifier adapter acceptance gate guard`,
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
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "packet must bind to the selected backend");
assert(
  packet.selectedBackendStatus === "selected-pending-production-evidence",
  "packet backend status must remain selected but evidence-blocked",
);
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
  "verifierAdapterAcceptanceGateRef",
  "verifierKeyRegistryRef",
  "localProofFormatRef",
  "localSunspotGroth16DevProbeRef",
  "decisionPacketRef",
  "requiredAdapterTestShape",
  "currentAdapterArtifact",
  "currentAcceptanceTests",
  "currentFailClosedObservation",
  "localFailClosedVerifierAdapterSeamHarness",
  "localSbfVerifierCpiRejectionHarness",
  "localUnsafeGeneratedVerifierCpiAcceptanceHarness",
  "localSunspotGroth16DevProbeAdapterBlockers",
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
  ["verifierAdapterAcceptanceGateRef", adapterAcceptanceGatePath],
  ["verifierKeyRegistryRef", registryPath],
  ["localProofFormatRef", localProofPath],
  ["localSunspotGroth16DevProbeRef", localSunspotGroth16DevProbePath],
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
  "proofFormatId",
  "proofEncoding",
  "proofByteLength",
  "publicWitnessEncoding",
  "publicWitnessByteLength",
  "verifierInstructionDataByteLength",
  "generatedVerifierNrPubinputs",
  "generatedVerifierCommitmentKeys",
  "publicInputLabel",
  "verifyingKeyHashKind",
  "currentProgramReservedProofByteLength",
  "currentProgramReservedPublicWitnessByteLength",
  "currentProgramReservedVerifierInputByteLength",
  "adapterBoundaryStatus",
  "adapterKind",
  "status",
]);
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["proofFormatId", "gnark-solana-native-proof-and-public-witness-v0"],
  ["proofEncoding", "gnark WriteRawTo proof"],
  ["proofByteLength", 324],
  ["publicWitnessEncoding", "gnark public witness WriteTo"],
  ["publicWitnessByteLength", 44],
  ["verifierInstructionDataByteLength", 368],
  ["generatedVerifierNrPubinputs", 1],
  ["generatedVerifierCommitmentKeys", 0],
  ["publicInputLabel", "private-spend-public-input-hash"],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["currentProgramReservedProofByteLength", 324],
  ["currentProgramReservedPublicWitnessByteLength", 44],
  ["currentProgramReservedVerifierInputByteLength", 368],
  [
    "adapterBoundaryStatus",
    "spend-program-tag3-abi-reserves-selected-gnark-tuple-and-dedicated-verifier-cpi-account-fail-closed",
  ],
  ["adapterKind", "in-program-verifier-or-dedicated-verifier-cpi"],
  ["status", "selected-candidate-format-required-after-production-proof-format-and-verifying-key-evidence"],
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
  "wrongVerifierProgramLeavesAccountsUnchanged",
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

const seam = packet.localFailClosedVerifierAdapterSeamHarness ?? {};
assertAllowedKeys(seam, "local fail-closed verifier adapter seam harness", [
  "status",
  "sourceRef",
  "command",
  "defaultAdapterRejectsBeforeCommit",
  "publicTag3DefaultRejectLeavesAccountsUnchanged",
  "verifierInstructionDataHelperExists",
  "publicWitnessBindingPrecheckExists",
  "publicWitnessWrongHashRejectsBeforeNotWired",
  "publicWitnessBadHeaderRejectsBeforeNotWired",
  "dedicatedVerifierProgramAccountReserved",
  "verifierProgramAccountReadonlyExecutablePrecheck",
  "verifierProgramIdBoundToVerifierKeyRecord",
  "wrongVerifierProgramRejectedBeforeNotWired",
  "verifierCpiInstructionShapeExists",
  "verifierCpiInstructionHasNoAccounts",
  "verifierCpiInstructionDataMatchesGeneratedVerifier",
  "onChainVerifierCpiHookExists",
  "verifierProgramAccountPassedToCpi",
  "hostCpiStubCannotAcceptProof",
  "verifiedCommitHelperExists",
  "verifiedCommitHelperMutatesOnlyAfterAdapterAcceptance",
  "commitCapableTag3AccountListExists",
  "publicTag3FixtureAcceptedAdapterMutatesViaAccountList",
  "selectedGnarkFixtureAdapterHarnessExists",
  "selectedGnarkFixtureValidProofMutatesState",
  "selectedGnarkFixtureInvalidProofNoMutation",
  "selectedGnarkFixtureWrongPublicInputNoMutation",
  "selectedGnarkFixtureWrongVerifyingKeyNoMutation",
  "satisfiesVerifierAdapterEvidence",
  "satisfiesVerifierAdapterAcceptance",
  "satisfiesTag3ProofAcceptance",
  "satisfiesProductionProofFormatEvidence",
  "satisfiesProductionVerifyingKeyEvidence",
  "truthBoundary",
]);
assert(seam.status === "local-fail-closed-harness-only", "local seam harness must be local-only");
assert(seam.sourceRef === programPath, "local seam harness source ref mismatch");
assert(seam.command === "npm run zk:c01-verifier-adapter-seam-check", "local seam harness command mismatch");
for (const field of [
  "defaultAdapterRejectsBeforeCommit",
  "publicTag3DefaultRejectLeavesAccountsUnchanged",
  "verifierInstructionDataHelperExists",
  "publicWitnessBindingPrecheckExists",
  "publicWitnessWrongHashRejectsBeforeNotWired",
  "publicWitnessBadHeaderRejectsBeforeNotWired",
  "dedicatedVerifierProgramAccountReserved",
  "verifierProgramAccountReadonlyExecutablePrecheck",
  "verifierProgramIdBoundToVerifierKeyRecord",
  "wrongVerifierProgramRejectedBeforeNotWired",
  "verifierCpiInstructionShapeExists",
  "verifierCpiInstructionHasNoAccounts",
  "verifierCpiInstructionDataMatchesGeneratedVerifier",
  "verifiedCommitHelperExists",
  "verifiedCommitHelperMutatesOnlyAfterAdapterAcceptance",
  "commitCapableTag3AccountListExists",
  "publicTag3FixtureAcceptedAdapterMutatesViaAccountList",
  "selectedGnarkFixtureAdapterHarnessExists",
  "selectedGnarkFixtureValidProofMutatesState",
  "selectedGnarkFixtureInvalidProofNoMutation",
  "selectedGnarkFixtureWrongPublicInputNoMutation",
  "selectedGnarkFixtureWrongVerifyingKeyNoMutation",
]) {
  assert(seam[field] === true, `local seam harness ${field} must be true`);
}
for (const field of [
  "satisfiesVerifierAdapterEvidence",
  "satisfiesVerifierAdapterAcceptance",
  "satisfiesTag3ProofAcceptance",
  "satisfiesProductionProofFormatEvidence",
  "satisfiesProductionVerifyingKeyEvidence",
]) {
  assert(seam[field] === false, `local seam harness ${field} must be false`);
}
for (const marker of [
  "source has a preflight/default-adapter/verified-commit split",
  "source assembles the 368-byte proof-plus-public-witness verifier instruction-data tuple",
  "source prechecks the one-field Gnark public witness against private-spend-public-input-hash",
  "public tag-3 account list now reserves a dedicated readonly executable verifier-program account",
  "tag 5 binds that verifier program id into the verifier-key record",
  "tag 3 rejects a different executable verifier program before the not-wired boundary",
  "source constructs the generated Solana verifier CPI instruction with no account metas",
  "source has an on-chain-only verifier CPI hook",
  "host-side Solana syscall stubs cannot turn CPI construction into proof acceptance",
  "data equal to proof||publicWitness",
  "public tag-3 account list is commit-capable after adapter success",
  "test-only selected Gnark fixture adapter shape covers valid mutation",
  "invalid-proof, wrong-public-input, wrong-verifying-key, and wrong-verifier-program no-mutation cases",
  "324-byte proof plus 44-byte public-witness tuple",
  "not verifier-adapter acceptance",
  "not tag-3 proof acceptance",
  "not production proof-format evidence",
  "not production verifying-key evidence",
]) {
  includes(seam.truthBoundary ?? "", marker, "local seam harness truth boundary");
}

for (const marker of [
  "fn selected_gnark_fixture_adapter_accepts",
  "fn verifier_instruction_data",
  "fn spend_with_proof_verifier_cpi_instruction",
  "fn spend_with_proof_verifier_program_account",
  "fn require_spend_with_proof_verifier_program",
  "fn require_spend_with_proof_public_witness_binding",
  "fn commit_verified_spend_from_spend_with_proof_accounts",
  "#[cfg(target_os = \"solana\")]",
  "#[cfg(not(target_os = \"solana\"))]",
  "invoke_signed(&verifier_cpi_instruction, &[verifier_program.clone()], &[])",
  "GNARK_PUBLIC_WITNESS_ONE_PUBLIC_INPUT_HEADER",
  "fn commit_after_selected_gnark_fixture_adapter",
  "proof_carrying_spend_commit_capable_account_list_mutates_after_fixture_adapter_acceptance",
  "proof_carrying_spend_verifier_instruction_data_matches_gnark_tuple",
  "proof_carrying_spend_verifier_cpi_instruction_matches_generated_solana_verifier_shape",
  "proof_carrying_spend_requires_readonly_executable_verifier_program_account",
  "proof_carrying_spend_rejects_wrong_registered_verifier_program_before_not_wired",
  "proof_carrying_spend_public_witness_binding_rejects_wrong_hash_before_not_wired",
  "proof_carrying_spend_public_witness_binding_rejects_bad_header_before_not_wired",
  "selected_gnark_fixture_adapter_valid_proof_mutates_state",
  "selected_gnark_fixture_adapter_invalid_proof_no_mutation",
  "selected_gnark_fixture_adapter_wrong_public_input_no_mutation",
  "selected_gnark_fixture_adapter_wrong_verifying_key_no_mutation",
]) {
  includes(program, marker, programPath);
}

for (const marker of [
  "fn spend_with_proof_sbf_verifier_cpi_rejection_no_mutation",
  "action_spend_with_proof_sbf_verifier_cpi_rejects_before_commit",
  "fn spend_with_proof_local_unsafe_generated_verifier_cpi_acceptance_and_no_mutation",
  "install_c01_verifier_program_from_path",
  "action_spend_with_proof_local_unsafe_generated_verifier_accepts_and_mutates",
  "action_spend_with_proof_local_unsafe_generated_verifier_rejects_without_mutation",
  "action_spend_with_proof_local_unsafe_wrong_public_input_rejects_without_mutation",
  "action_spend_with_proof_local_unsafe_wrong_verifier_program_rejects_without_mutation",
  "action_spend_with_proof_local_unsafe_wrong_verifying_key_rejects_without_mutation",
  "register_verifier_key_for_hash_with_program",
  "env_hash_or",
]) {
  includes(crucibleHarness, marker, crucibleHarnessPath);
}

const localSbfCpiHarness = packet.localSbfVerifierCpiRejectionHarness ?? {};
assertAllowedKeys(localSbfCpiHarness, "local SBF verifier CPI rejection harness", [
  "status",
  "scope",
  "harnessPath",
  "testName",
  "spendProgramSbf",
  "verifierProgramSbf",
  "verifierProgramBehavior",
  "sbfVerifierCpiRejectsBeforeCommit",
  "noMutationAfterVerifierCpiFailure",
  "validMutationStillBlockedWithoutAcceptingProductionVerifier",
  "canonicalCommands",
  "truthBoundary",
]);
assert(
  localSbfCpiHarness.status === "local-sbf-cpi-rejection-no-mutation-harness-required",
  "local SBF CPI harness status must require the local rejection/no-mutation harness",
);
assert(localSbfCpiHarness.harnessPath === crucibleHarnessPath, "local SBF CPI harness path mismatch");
assert(
  localSbfCpiHarness.testName === "spend_with_proof_sbf_verifier_cpi_rejection_no_mutation",
  "local SBF CPI harness test name mismatch",
);
assert(
  localSbfCpiHarness.spendProgramSbf ===
    "programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so",
  "local SBF CPI harness must pin the spend SBF binary",
);
assert(
  localSbfCpiHarness.verifierProgramSbf ===
    "programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so",
  "local SBF CPI harness must pin the executable verifier SBF binary used for rejection",
);
for (const field of [
  "sbfVerifierCpiRejectsBeforeCommit",
  "noMutationAfterVerifierCpiFailure",
  "validMutationStillBlockedWithoutAcceptingProductionVerifier",
]) {
  assert(localSbfCpiHarness[field] === true, `local SBF CPI harness ${field} must be true`);
}
assertStringArray(localSbfCpiHarness.canonicalCommands, "local SBF CPI harness canonical commands");
for (const command of [
  "npm run private-pool-v2:c01-sbf-verifier-cpi-rejection-check",
  "cargo test --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml --features invariant_test spend_with_proof_sbf_verifier_cpi_rejection_no_mutation -- --nocapture",
  "npm run private-pool-v2:crucible-check",
]) {
  assert(
    localSbfCpiHarness.canonicalCommands.includes(command),
    `local SBF CPI harness canonical commands must include ${command}`,
  );
}
for (const marker of [
  "SBF CPI rejection/no-mutation only",
  "not valid production mutation",
  "not accepted production verifier",
  "not production proof-format evidence",
  "not SBF/live lineage",
]) {
  includes(localSbfCpiHarness.truthBoundary ?? "", marker, "local SBF CPI harness truth boundary");
}

const localUnsafeAcceptance = packet.localUnsafeGeneratedVerifierCpiAcceptanceHarness ?? {};
assertAllowedKeys(localUnsafeAcceptance, "local unsafe generated verifier CPI acceptance harness", [
  "status",
  "scope",
  "harnessPath",
  "testName",
  "command",
  "artifactRoot",
  "verifierProgramSbf",
  "wrongVerifierProgramSbf",
  "proofSha256",
  "publicWitnessSha256",
  "verifyingKeySha256",
  "wrongVerifyingKeySha256",
  "verifyingKeyHashKind",
  "spendProgramCpiAcceptsLocalUnsafeProof",
  "validProofMutatesNullifierAndOutputState",
  "invalidProofLeavesAccountsUnchanged",
  "wrongPublicInputHashLeavesAccountsUnchanged",
  "wrongVerifierProgramLeavesAccountsUnchanged",
  "wrongVerifyingKeyLeavesAccountsUnchanged",
  "satisfiesProductionVerifierAdapterEvidence",
  "satisfiesProductionProofFormatEvidence",
  "satisfiesProductionVerifyingKeyEvidence",
  "satisfiesSbfLiveLineage",
  "canonicalCommands",
  "truthBoundary",
]);
assert(
  localUnsafeAcceptance.status === "local-unsafe-h6-generated-verifier-cpi-acceptance-and-no-mutation",
  "local unsafe generated verifier CPI harness status mismatch",
);
assert(localUnsafeAcceptance.harnessPath === crucibleHarnessPath, "local unsafe harness path mismatch");
assert(
  localUnsafeAcceptance.testName ===
    "spend_with_proof_local_unsafe_generated_verifier_cpi_acceptance_and_no_mutation",
  "local unsafe harness test name mismatch",
);
assert(
  localUnsafeAcceptance.command ===
    "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
  "local unsafe harness command mismatch",
);
assert(
  localUnsafeAcceptance.artifactRoot ===
    "/private/tmp/vanta-c01-sunspot-lane/work/beta18-h6-circuit/target",
  "local unsafe harness artifact root mismatch",
);
assert(
  localUnsafeAcceptance.verifierProgramSbf ===
    "/private/tmp/vanta-c01-sunspot-lane/work/beta18-h6-circuit/target/vanta_private_pool_v2_actual_private_spend_entry.so",
  "local unsafe harness verifier SBF mismatch",
);
assert(
  localUnsafeAcceptance.wrongVerifierProgramSbf ===
    "/private/tmp/vanta-c01-sunspot-lane/work/beta18-circuit/target/vanta_private_pool_v2_actual_private_spend_entry.so",
  "local unsafe harness wrong verifier SBF mismatch",
);
for (const [field, expected] of [
  ["proofSha256", "sha256:afde2c07683c4262b5b9ae72c66e559e857a9fd7a529b980b34a45bf2374d186"],
  ["publicWitnessSha256", "sha256:19e42b6e34a5861d8804565476d72f8835c81d30cfc66bd598a236d26e1baa60"],
  ["verifyingKeySha256", "sha256:5e0a6f08503f534cbb462f43fbf0b247e8aa2ce75d1fa58c2350f815817948b4"],
  ["wrongVerifyingKeySha256", "sha256:fbd6ba8ce64cc0b0320a0d8080fca15d79ca6ca2f732381a9550092f645f0e1d"],
  ["verifyingKeyHashKind", "local-unsafe-h6-sunspot-vk-hash-not-production"],
]) {
  assert(localUnsafeAcceptance[field] === expected, `local unsafe harness ${field} mismatch`);
}
for (const field of [
  "spendProgramCpiAcceptsLocalUnsafeProof",
  "validProofMutatesNullifierAndOutputState",
  "invalidProofLeavesAccountsUnchanged",
  "wrongPublicInputHashLeavesAccountsUnchanged",
  "wrongVerifierProgramLeavesAccountsUnchanged",
  "wrongVerifyingKeyLeavesAccountsUnchanged",
]) {
  assert(localUnsafeAcceptance[field] === true, `local unsafe harness ${field} must be true`);
}
for (const field of [
  "satisfiesProductionVerifierAdapterEvidence",
  "satisfiesProductionProofFormatEvidence",
  "satisfiesProductionVerifyingKeyEvidence",
  "satisfiesSbfLiveLineage",
]) {
  assert(localUnsafeAcceptance[field] === false, `local unsafe harness ${field} must stay false`);
}
assertStringArray(localUnsafeAcceptance.canonicalCommands, "local unsafe harness canonical commands");
assert(
  localUnsafeAcceptance.canonicalCommands.includes(
    "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
  ),
  "local unsafe harness canonical commands must include the npm command",
);
for (const marker of [
  "local unsafe H6-preserving Sunspot/Gnark artifact lane only",
  "wrong-verifying-key local unsafe no-mutation",
  "not production verifier-adapter acceptance",
  "not production proof-format evidence",
  "not production verifying-key evidence",
  "not production wrong-verifying-key or wrong-verifier-program no-mutation evidence",
  "not SBF/live lineage",
]) {
  includes(localUnsafeAcceptance.truthBoundary ?? "", marker, "local unsafe harness truth boundary");
}

const sunspotDevProbe = packet.localSunspotGroth16DevProbeAdapterBlockers ?? {};
assertAllowedKeys(sunspotDevProbe, "local Sunspot Groth16 dev-probe adapter blockers", [
  "status",
  "artifactRef",
  "command",
  "proofSystem",
  "proofFormatId",
  "proofByteLength",
  "selectedCandidateProofByteLength",
  "currentTag3ProofByteLength",
  "currentTag3PublicWitnessByteLength",
  "legacyRejectedTag3ProofByteLength",
  "publicWitnessByteLength",
  "generatedVerifierInstructionDataByteLength",
  "generatedVerifierNrPubinputs",
  "generatedVerifierCommitmentKeys",
  "standaloneLocalSvmVerificationPassed",
  "standaloneLocalSvmComputeUnits",
  "sunspotReportedPublicInputs",
  "sunspotReportedSecretInputs",
  "localVerifierSbfBuiltOnly",
  "adapterAcceptanceStatus",
  "validMutationTestStatus",
  "invalidNoMutationTestStatus",
  "wrongPublicInputNoMutationTestStatus",
  "wrongVerifyingKeyNoMutationTestStatus",
  "satisfiesVerifierAdapterEvidence",
  "satisfiesVerifierAdapterAcceptance",
  "satisfiesTag3ProofAcceptance",
  "satisfiesPrivateSpendPublicInputHashBinding",
  "satisfiesProductionProofFormatEvidence",
  "satisfiesProductionVerifyingKeyEvidence",
  "satisfiesSbfLiveLineage",
  "truthBoundary",
]);
assert(
  sunspotDevProbe.status === "local-dev-probe-only-not-adapter-acceptance",
  "local Sunspot dev-probe adapter blocker status mismatch",
);
assert(
  sunspotDevProbe.artifactRef === localSunspotGroth16DevProbePath,
  "local Sunspot dev-probe adapter blocker artifact ref mismatch",
);
assert(
  sunspotDevProbe.command === "npm run zk:c01-sunspot-groth16-dev-probe-check",
  "local Sunspot dev-probe adapter blocker command mismatch",
);
assert(sunspotDevProbe.proofSystem === "groth16", "local Sunspot dev-probe proof system mismatch");
assert(
  sunspotDevProbe.proofFormatId === required.proofFormatId,
  "local Sunspot dev-probe proof format id must match adapter shape",
);
assert(
  sunspotDevProbe.proofByteLength === localSunspotGroth16DevProbe.observedArtifacts?.proof?.byteLength,
  "local Sunspot dev-probe proof length must match dev-probe packet",
);
assert(
  sunspotDevProbe.proofByteLength === required.proofByteLength,
  "local Sunspot dev-probe proof length must match selected adapter shape",
);
assert(
  sunspotDevProbe.selectedCandidateProofByteLength === required.proofByteLength,
  "local Sunspot dev-probe selected proof length must match adapter shape",
);
assert(
  sunspotDevProbe.currentTag3ProofByteLength === required.currentProgramReservedProofByteLength,
  "local Sunspot dev-probe current tag-3 proof length mismatch",
);
assert(
  sunspotDevProbe.currentTag3PublicWitnessByteLength ===
    required.currentProgramReservedPublicWitnessByteLength,
  "local Sunspot dev-probe current tag-3 public witness length mismatch",
);
assert(
  sunspotDevProbe.legacyRejectedTag3ProofByteLength === 256,
  "local Sunspot dev-probe rejected legacy proof length mismatch",
);
assert(
  sunspotDevProbe.publicWitnessByteLength ===
    localSunspotGroth16DevProbe.observedArtifacts?.publicWitness?.byteLength,
  "local Sunspot dev-probe public witness length must match dev-probe packet",
);
assert(
  sunspotDevProbe.generatedVerifierInstructionDataByteLength ===
    localSunspotGroth16DevProbe.observedArtifacts?.generatedVerifierInstructionData?.totalByteLength,
  "local Sunspot dev-probe generated verifier instruction-data length mismatch",
);
assert(
  sunspotDevProbe.generatedVerifierNrPubinputs ===
    localSunspotGroth16DevProbe.observedArtifacts?.generatedVerifierInstructionData?.generatedVerifierNrPubinputs,
  "local Sunspot dev-probe generated verifier public input count mismatch",
);
assert(
  sunspotDevProbe.generatedVerifierCommitmentKeys ===
    localSunspotGroth16DevProbe.observedArtifacts?.generatedVerifierInstructionData
      ?.generatedVerifierCommitmentKeys,
  "local Sunspot dev-probe generated verifier commitment key count mismatch",
);
assert(
  sunspotDevProbe.standaloneLocalSvmVerificationPassed ===
    localSunspotGroth16DevProbe.observedArtifacts?.generatedVerifierInstructionData?.standaloneLocalSvmAccepted,
  "local Sunspot dev-probe standalone LiteSVM verifier status mismatch",
);
assert(
  sunspotDevProbe.standaloneLocalSvmComputeUnits ===
    localSunspotGroth16DevProbe.observedArtifacts?.generatedVerifierInstructionData?.computeUnitsConsumed,
  "local Sunspot dev-probe standalone LiteSVM compute units mismatch",
);
const sunspotCompileStep = localSunspotGroth16DevProbe.observedProbeFlow?.find(
  (entry) => entry.step === "sunspot-compile",
);
assert(
  sunspotDevProbe.sunspotReportedPublicInputs === sunspotCompileStep?.sunspotReportedPublicInputs,
  "local Sunspot dev-probe public input count mismatch",
);
assert(
  sunspotDevProbe.sunspotReportedSecretInputs === sunspotCompileStep?.sunspotReportedSecretInputs,
  "local Sunspot dev-probe secret input count mismatch",
);
assert(sunspotDevProbe.localVerifierSbfBuiltOnly === true, "local Sunspot dev-probe must be SBF-build-only");
for (const field of [
  "adapterAcceptanceStatus",
  "validMutationTestStatus",
  "invalidNoMutationTestStatus",
  "wrongPublicInputNoMutationTestStatus",
  "wrongVerifyingKeyNoMutationTestStatus",
]) {
  assert(sunspotDevProbe[field] === "absent", `local Sunspot dev-probe ${field} must remain absent`);
}
for (const field of [
  "satisfiesVerifierAdapterEvidence",
  "satisfiesVerifierAdapterAcceptance",
  "satisfiesTag3ProofAcceptance",
  "satisfiesPrivateSpendPublicInputHashBinding",
  "satisfiesProductionProofFormatEvidence",
  "satisfiesProductionVerifyingKeyEvidence",
  "satisfiesSbfLiveLineage",
]) {
  assert(sunspotDevProbe[field] === false, `local Sunspot dev-probe ${field} must remain false`);
}
for (const marker of [
  "standalone verifier route feasibility only",
  "standalone Solana verifier accepted",
  "no Vanta spend-program adapter consumed",
  "324-byte proof",
  "44-byte public witness",
  "rejecting the legacy 256-byte proof-only shape",
  "zero public and zero secret inputs",
  "one public input",
  "does not satisfy verifier-adapter acceptance",
]) {
  includes(sunspotDevProbe.truthBoundary ?? "", marker, "local Sunspot dev-probe adapter blocker truth boundary");
}

assertAllowedKeys(packet.blockedPrerequisiteRefs, "blocked prerequisite refs", [
  "groth16ProofFormatCandidate",
  "productionArtifactAcceptanceGate",
  "verifierAdapterAcceptanceGate",
  "productionVerifyingKeyCandidate",
  "verifierKeyRegistry",
  "localSunspotGroth16DevProbe",
]);
assert(
  packet.blockedPrerequisiteRefs.productionArtifactAcceptanceGate?.status ===
    "blocked-no-reviewed-production-artifact-bundle",
  "production artifact acceptance gate prerequisite must remain blocked",
);
assert(
  packet.blockedPrerequisiteRefs.productionArtifactAcceptanceGate?.artifactRef === acceptanceGatePath,
  "production artifact acceptance gate prerequisite ref mismatch",
);
assert(
  packet.blockedPrerequisiteRefs.productionArtifactAcceptanceGate?.command ===
    "npm run zk:c01-production-artifact-acceptance-gate-check",
  "production artifact acceptance gate prerequisite command mismatch",
);
assert(
  packet.blockedPrerequisiteRefs.productionArtifactAcceptanceGate?.satisfiesProductionArtifactAcceptance ===
    false,
  "production artifact acceptance gate prerequisite must not satisfy artifact acceptance",
);
assert(
  acceptanceGate.satisfiesRequiredPositiveEvidence?.productionArtifactAcceptance === false,
  "acceptance gate must not satisfy production artifact acceptance",
);
assert(
  packet.blockedPrerequisiteRefs.verifierAdapterAcceptanceGate?.status ===
    "blocked-no-production-verifier-adapter-acceptance",
  "verifier adapter acceptance gate prerequisite must remain blocked",
);
assert(
  packet.blockedPrerequisiteRefs.verifierAdapterAcceptanceGate?.artifactRef === adapterAcceptanceGatePath,
  "verifier adapter acceptance gate prerequisite ref mismatch",
);
assert(
  packet.blockedPrerequisiteRefs.verifierAdapterAcceptanceGate?.command ===
    "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "verifier adapter acceptance gate prerequisite command mismatch",
);
assert(
  packet.blockedPrerequisiteRefs.verifierAdapterAcceptanceGate?.satisfiesVerifierAdapterAcceptance === false,
  "verifier adapter acceptance gate prerequisite must not satisfy adapter acceptance",
);
assert(
  adapterAcceptanceGate.satisfiesRequiredPositiveEvidence?.verifierAdapter === false,
  "adapter acceptance gate must not satisfy verifier adapter evidence",
);
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
assert(
  packet.blockedPrerequisiteRefs.localSunspotGroth16DevProbe?.status ===
    "local-dev-probe-only-not-adapter-acceptance",
  "local Sunspot dev-probe prerequisite status mismatch",
);
assert(
  packet.blockedPrerequisiteRefs.localSunspotGroth16DevProbe?.artifactRef ===
    localSunspotGroth16DevProbePath,
  "local Sunspot dev-probe prerequisite artifact ref mismatch",
);
assert(
  packet.blockedPrerequisiteRefs.localSunspotGroth16DevProbe?.command ===
    "npm run zk:c01-sunspot-groth16-dev-probe-check",
  "local Sunspot dev-probe prerequisite command mismatch",
);
for (const field of [
  "satisfiesVerifierAdapterEvidence",
  "satisfiesPrivateSpendPublicInputHashBinding",
  "satisfiesSbfLiveLineage",
]) {
  assert(
    packet.blockedPrerequisiteRefs.localSunspotGroth16DevProbe?.[field] === false,
    `local Sunspot dev-probe prerequisite ${field} must remain false`,
  );
}

assertAllowedKeys(packet.satisfiesRequiredPositiveEvidence, "required positive evidence map", [
  "backendSelection",
  "actualPrivateSpendProductionProofFormat",
  "privateSpendPublicInputHashBinding",
  "productionVerifyingKeyHash",
  "verifierAdapter",
  "acceptedProofMutatesStateTest",
  "invalidProofLeavesAccountsUnchangedTest",
  "wrongPublicInputHashLeavesAccountsUnchangedTest",
  "wrongVerifyingKeyLeavesAccountsUnchangedTest",
  "wrongVerifierProgramLeavesAccountsUnchangedTest",
  "sbfLiveLineage",
  "auditReviewerAcceptance",
]);
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
  ["wrongVerifierProgramLeavesAccountsUnchangedTest", false],
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
  "wrongPublicInputHashLeavesAccountsUnchangedTestCurrentArtifactRef",
  "wrongVerifyingKeyLeavesAccountsUnchangedTestCurrentArtifactRef",
  "wrongVerifierProgramLeavesAccountsUnchangedTestCurrentArtifactRef",
  "privateSpendPublicInputHashBindingCurrentArtifactRef",
  "allRequiredPositiveEvidenceStatus",
]);
assert(
  packet.candidatePacketMustRemain.selectedBackend === "groth16-tag3-solana-v0",
  "candidate invariant selectedBackend mismatch",
);
assert(
  packet.candidatePacketMustRemain.selectedBackendStatus === "selected-pending-production-evidence",
  "candidate invariant selected backend status mismatch",
);
for (const field of [
  "verifierAdapterCurrentArtifactRef",
  "acceptedProofMutatesStateTestCurrentArtifactRef",
  "invalidProofLeavesAccountsUnchangedTestCurrentArtifactRef",
  "wrongPublicInputHashLeavesAccountsUnchangedTestCurrentArtifactRef",
  "wrongVerifyingKeyLeavesAccountsUnchangedTestCurrentArtifactRef",
  "wrongVerifierProgramLeavesAccountsUnchangedTestCurrentArtifactRef",
  "privateSpendPublicInputHashBindingCurrentArtifactRef",
]) {
  assert(packet.candidatePacketMustRemain[field] === null, `${field} must remain null`);
}
assertStringArray(packet.forbiddenPromotions, "packet forbiddenPromotions");
assertStringArray(packet.canonicalCommands, "packet canonicalCommands");

assert(candidate.selectedBackend === "groth16-tag3-solana-v0", "candidate packet must keep selectedBackend");
assert(
  candidate.selectedBackendStatus === "selected-pending-production-evidence",
  "candidate packet must keep backend selected but evidence-blocked",
);
for (const id of [
  "private-spend-public-input-hash-binding",
  "production-verifying-key-hash",
  "verifier-adapter",
  "accepted-proof-mutates-state-test",
  "invalid-proof-leaves-accounts-unchanged-test",
  "wrong-public-input-hash-leaves-accounts-unchanged-test",
  "wrong-verifying-key-leaves-accounts-unchanged-test",
  "wrong-verifier-program-leaves-accounts-unchanged-test",
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
assert(
  groth16Option.status === "selected-production-evidence-blocked",
  "Groth16 backend option must remain selected but blocked",
);
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
  options.satisfiesRequiredPositiveEvidence?.wrongPublicInputHashLeavesAccountsUnchangedTest === false,
  "backend options must not satisfy wrong-public-input no-mutation evidence",
);
assert(
  options.satisfiesRequiredPositiveEvidence?.wrongVerifyingKeyLeavesAccountsUnchangedTest === false,
  "backend options must not satisfy wrong-verifying-key no-mutation evidence",
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
  "struct VerifiedSpendPreflight",
  "fn preflight_spend_with_proof",
  "fn verify_spend_with_proof_adapter",
  "fn commit_verified_spend",
  "require_verifier_key_hash_for_program(",
  "proof_carrying_spend_rejects_wrong_registered_verifier_program_before_not_wired",
  "proof-carrying spend ABI is reserved; verifier not wired after root/nullifier/output/verifier-key/verifier-program preflight",
  "Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))",
  "proof_carrying_spend_default_adapter_rejects_before_commit",
  "verified_spend_commit_mutates_only_after_adapter_acceptance",
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
  "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
  "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-sunspot-groth16-dev-probe-check",
  "npm run zk:c01-verifier-adapter-seam-check",
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
]) {
  assert(packet.canonicalCommands?.includes(command), `packet must record canonical command ${command}`);
}
for (const phrase of [
  "blocked verifier-adapter acceptance-test candidate packet for the selected C01 backend",
  "not verifier-adapter acceptance",
  "not tag-3 proof acceptance",
  "not production proof-format evidence",
  "not production verifying-key evidence",
]) {
  includes(packet.truthBoundary ?? "", phrase, "adapter-test packet truth boundary");
}

console.log("private-pool-v2 C01 verifier adapter-test candidate: PASS");

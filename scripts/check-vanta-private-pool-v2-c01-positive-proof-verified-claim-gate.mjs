import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const adapterPath = "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const programPath = "programs/vanta_private_pool_v2_spend/src/lib.rs";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 C01 positive proof-verified claim gate: FAIL - ${message}`);
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

if (!existsSync(resolve(repoRoot, packetPath))) {
  fail(`missing ${packetPath}`);
}

const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const candidate = JSON.parse(read(candidatePath));
const adapter = JSON.parse(read(adapterPath));
const packageJson = JSON.parse(read("package.json"));
const program = read(programPath);
const decision = read(decisionPath);
const findings = read("VANTA_ZK_REVIEW.findings.json");

const scripts = packageJson.scripts ?? {};
assert(
  scripts["zk:c01-positive-proof-verified-claim-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-positive-proof-verified-claim-gate.mjs",
  "package.json must expose zk:c01-positive-proof-verified-claim-gate-check",
);
for (const aggregate of ["truth:privacy-claim-gate", "zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-positive-proof-verified-claim-gate-check"),
    `${aggregate} must include the positive proof-verified claim gate`,
  );
}
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-adapter-seam-check"),
    `${aggregate} must include the local C01 verifier adapter seam guard`,
  );
}

assert(
  packet.version === "vanta-private-pool-v2-c01-positive-proof-verified-claim-gate-0.1",
  "packet must use the checked schema",
);
assert(packet.status === "blocked-no-tag3-valid-proof-success", "packet must stay blocked until tag 3 succeeds");
assert(packet.tag === 3, "packet must bind to tag 3");
for (const field of [
  "proofVerifiedClaimAllowed",
  "proofVerifiedSpendClaimAllowed",
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]) {
  assert(packet[field] === false, `packet ${field} must be false`);
}

assertAllowedKeys(packet, "positive proof-verified claim gate packet", [
  "version",
  "checkedAt",
  "status",
  "tag",
  "proofVerifiedClaimAllowed",
  "proofVerifiedSpendClaimAllowed",
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "purpose",
  "candidatePacketRef",
  "verifierAdapterTestCandidateRef",
  "decisionPacketRef",
  "positiveClaimRequires",
  "currentTag3Observation",
  "positiveEvidenceRefs",
  "localFailClosedVerifierAdapterSeamHarnessRef",
  "localSbfVerifierCpiRejectionHarnessRef",
  "localUnsafeGeneratedVerifierCpiAcceptanceHarnessRef",
  "sourceCopyFindingsGate",
  "forbiddenPromotions",
  "canonicalCommands",
  "truthBoundary",
]);

for (const [field, expected] of [
  ["candidatePacketRef", candidatePath],
  ["verifierAdapterTestCandidateRef", adapterPath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(packet[field] === expected, `packet ${field} mismatch`);
}

assertAllowedKeys(packet.currentTag3Observation, "current tag-3 observation", [
  "status",
  "customError",
  "errorName",
  "validProofSuccessArtifactRef",
  "acceptedProofMutatesState",
  "invalidProofLeavesAccountsUnchanged",
  "wrongPublicInputHashLeavesAccountsUnchanged",
  "wrongVerifyingKeyLeavesAccountsUnchanged",
  "truthBoundary",
]);
assert(packet.currentTag3Observation.status === "reserved-fail-closed", "tag 3 must remain fail-closed");
assert(packet.currentTag3Observation.customError === 14, "tag 3 custom error must remain 14");
assert(
  packet.currentTag3Observation.errorName === "ERR_PROOF_VERIFIER_NOT_WIRED",
  "tag 3 error name mismatch",
);
for (const field of [
  "validProofSuccessArtifactRef",
  "acceptedProofMutatesState",
  "invalidProofLeavesAccountsUnchanged",
  "wrongPublicInputHashLeavesAccountsUnchanged",
  "wrongVerifyingKeyLeavesAccountsUnchanged",
]) {
  const expected = field.endsWith("ArtifactRef") ? null : false;
  assert(packet.currentTag3Observation[field] === expected, `current tag-3 observation ${field} mismatch`);
}
includes(
  packet.currentTag3Observation.truthBoundary ?? "",
  "not positive proof-verified claim evidence",
  "current tag-3 truth boundary",
);

assertAllowedKeys(packet.positiveClaimRequires, "positive claim requirements", [
  "backendSelection",
  "productionProofFormat",
  "productionVerifyingKeyHash",
  "verifierAdapter",
  "privateSpendPublicInputHashBinding",
  "validProofSuccess",
  "acceptedProofMutatesState",
  "invalidProofNoMutation",
  "wrongPublicInputHashNoMutation",
  "wrongVerifyingKeyNoMutation",
  "sbfLiveLineage",
  "auditReviewerAcceptance",
]);
for (const [field, value] of Object.entries(packet.positiveClaimRequires)) {
  const expected = field === "backendSelection" ? true : false;
  assert(value === expected, `positive claim requirement ${field} must remain ${expected}`);
}

assertAllowedKeys(packet.positiveEvidenceRefs, "positive evidence refs", [
  "candidatePacketStatus",
  "adapterTestCandidateStatus",
  "tag3ValidProofSuccessArtifactRef",
  "tag3AcceptedProofMutationArtifactRef",
  "tag3InvalidProofNoMutationArtifactRef",
  "tag3WrongPublicInputHashNoMutationArtifactRef",
  "tag3WrongVerifyingKeyNoMutationArtifactRef",
]);
assert(
  packet.positiveEvidenceRefs.candidatePacketStatus ===
    "blocked-selected-groth16-tag3-solana-v0-production-evidence",
  "candidate packet status mismatch",
);
assert(
  packet.positiveEvidenceRefs.adapterTestCandidateStatus === "blocked-no-verifier-adapter-acceptance-tests",
  "adapter-test packet status mismatch",
);
for (const field of [
  "tag3ValidProofSuccessArtifactRef",
  "tag3AcceptedProofMutationArtifactRef",
  "tag3InvalidProofNoMutationArtifactRef",
  "tag3WrongPublicInputHashNoMutationArtifactRef",
  "tag3WrongVerifyingKeyNoMutationArtifactRef",
]) {
  assert(packet.positiveEvidenceRefs[field] === null, `${field} must stay null`);
}

assertAllowedKeys(packet.localFailClosedVerifierAdapterSeamHarnessRef, "local seam harness ref", [
  "status",
  "artifactRef",
  "command",
  "provesDefaultRejectsBeforeMutation",
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
  "provesTestOnlyValidMutationShape",
  "provesTestOnlyPublicTag3AccountListMutationShape",
  "provesTestOnlyInvalidProofNoMutationShape",
  "provesTestOnlyWrongPublicInputNoMutationShape",
  "provesTestOnlyWrongVerifyingKeyNoMutationShape",
  "satisfiesValidProofSuccess",
  "satisfiesAcceptedProofMutation",
  "satisfiesInvalidProofNoMutation",
  "satisfiesWrongPublicInputHashNoMutation",
  "satisfiesWrongVerifyingKeyNoMutation",
  "satisfiesVerifierAdapterAcceptance",
  "truthBoundary",
]);
assert(
  packet.localFailClosedVerifierAdapterSeamHarnessRef.status === "local-fail-closed-harness-only",
  "local seam harness ref must stay local-only",
);
assert(
  packet.localFailClosedVerifierAdapterSeamHarnessRef.artifactRef === adapterPath,
  "local seam harness ref must point at the adapter-test candidate packet",
);
assert(
  packet.localFailClosedVerifierAdapterSeamHarnessRef.command === "npm run zk:c01-verifier-adapter-seam-check",
  "local seam harness ref command mismatch",
);
assert(
  packet.localFailClosedVerifierAdapterSeamHarnessRef.provesDefaultRejectsBeforeMutation === true,
  "local seam harness must prove default no-mutation rejection",
);
for (const field of [
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
  "provesTestOnlyValidMutationShape",
  "provesTestOnlyPublicTag3AccountListMutationShape",
  "provesTestOnlyInvalidProofNoMutationShape",
  "provesTestOnlyWrongPublicInputNoMutationShape",
  "provesTestOnlyWrongVerifyingKeyNoMutationShape",
]) {
  assert(packet.localFailClosedVerifierAdapterSeamHarnessRef[field] === true, `local seam harness ${field} must be true`);
}
for (const field of [
  "satisfiesValidProofSuccess",
  "satisfiesAcceptedProofMutation",
  "satisfiesInvalidProofNoMutation",
  "satisfiesWrongPublicInputHashNoMutation",
  "satisfiesWrongVerifyingKeyNoMutation",
  "satisfiesVerifierAdapterAcceptance",
]) {
  assert(packet.localFailClosedVerifierAdapterSeamHarnessRef[field] === false, `local seam harness ${field} must stay false`);
}
for (const phrase of [
  "drift-prevention only",
  "test-only selected Gnark fixture adapter shape can mutate through the public commit-capable tag-3 account list",
  "dedicated read-only executable verifier-program account",
  "binds that verifier program id into the tag-5 verifier-key record",
  "rejects a different executable verifier program before the not-wired boundary",
  "generated Solana verifier CPI instruction with no account metas",
  "data equal to proof||publicWitness",
  "on-chain-only verifier CPI hook",
  "prevents host-side Solana syscall stubs from turning CPI construction into proof acceptance",
  "invalid-proof, wrong-public-input, and wrong-verifying-key no-mutation cases",
  "not tag-3 valid-proof success evidence",
  "not accepted-proof mutation evidence",
  "not invalid/wrong-input/wrong-key production no-mutation evidence",
  "not verifier-adapter acceptance",
]) {
  includes(packet.localFailClosedVerifierAdapterSeamHarnessRef.truthBoundary ?? "", phrase, "local seam truth boundary");
}

assertAllowedKeys(packet.localSbfVerifierCpiRejectionHarnessRef, "local SBF verifier CPI rejection harness ref", [
  "status",
  "artifactRef",
  "command",
  "provesExecutableVerifierCpiRejectsBeforeCommit",
  "provesNoMutationAfterVerifierCpiFailure",
  "satisfiesValidProofSuccess",
  "satisfiesAcceptedProofMutation",
  "satisfiesInvalidProofNoMutation",
  "satisfiesWrongPublicInputHashNoMutation",
  "satisfiesWrongVerifyingKeyNoMutation",
  "satisfiesSbfLiveLineage",
  "satisfiesVerifierAdapterAcceptance",
  "truthBoundary",
]);
assert(
  packet.localSbfVerifierCpiRejectionHarnessRef.status === "local-sbf-cpi-rejection-no-mutation-only",
  "local SBF CPI harness ref must stay rejection/no-mutation only",
);
assert(
  packet.localSbfVerifierCpiRejectionHarnessRef.artifactRef === adapterPath,
  "local SBF CPI harness ref must point at the adapter-test candidate packet",
);
assert(
  packet.localSbfVerifierCpiRejectionHarnessRef.command ===
    "npm run private-pool-v2:c01-sbf-verifier-cpi-rejection-check",
  "local SBF CPI harness ref command mismatch",
);
for (const field of [
  "provesExecutableVerifierCpiRejectsBeforeCommit",
  "provesNoMutationAfterVerifierCpiFailure",
]) {
  assert(packet.localSbfVerifierCpiRejectionHarnessRef[field] === true, `local SBF CPI harness ${field} must be true`);
}
for (const field of [
  "satisfiesValidProofSuccess",
  "satisfiesAcceptedProofMutation",
  "satisfiesInvalidProofNoMutation",
  "satisfiesWrongPublicInputHashNoMutation",
  "satisfiesWrongVerifyingKeyNoMutation",
  "satisfiesSbfLiveLineage",
  "satisfiesVerifierAdapterAcceptance",
]) {
  assert(packet.localSbfVerifierCpiRejectionHarnessRef[field] === false, `local SBF CPI harness ${field} must stay false`);
}
for (const phrase of [
  "SBF CPI rejection/no-mutation only",
  "not tag-3 valid-proof success evidence",
  "not accepted-proof mutation evidence",
  "not production no-mutation evidence",
  "not SBF/live lineage",
  "not verifier-adapter acceptance",
]) {
  includes(packet.localSbfVerifierCpiRejectionHarnessRef.truthBoundary ?? "", phrase, "local SBF CPI truth boundary");
}

assertAllowedKeys(
  packet.localUnsafeGeneratedVerifierCpiAcceptanceHarnessRef,
  "local unsafe generated verifier CPI acceptance harness ref",
  [
    "status",
    "artifactRef",
    "command",
    "provesLocalUnsafeValidProofMutatesState",
    "provesLocalUnsafeInvalidProofNoMutation",
    "provesLocalUnsafeWrongPublicInputNoMutation",
    "provesLocalUnsafeWrongVerifierProgramNoMutation",
    "provesWrongVerifyingKeyNoMutation",
    "satisfiesValidProofSuccess",
    "satisfiesAcceptedProofMutation",
    "satisfiesInvalidProofNoMutation",
    "satisfiesWrongPublicInputHashNoMutation",
    "satisfiesWrongVerifyingKeyNoMutation",
    "satisfiesVerifierAdapterAcceptance",
    "satisfiesSbfLiveLineage",
    "truthBoundary",
  ],
);
assert(
  packet.localUnsafeGeneratedVerifierCpiAcceptanceHarnessRef.status ===
    "local-unsafe-generated-verifier-cpi-acceptance-and-no-mutation",
  "local unsafe generated verifier CPI harness ref status mismatch",
);
assert(
  packet.localUnsafeGeneratedVerifierCpiAcceptanceHarnessRef.artifactRef === adapterPath,
  "local unsafe generated verifier CPI harness ref must point at the adapter-test candidate packet",
);
assert(
  packet.localUnsafeGeneratedVerifierCpiAcceptanceHarnessRef.command ===
    "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
  "local unsafe generated verifier CPI harness ref command mismatch",
);
for (const field of [
  "provesLocalUnsafeValidProofMutatesState",
  "provesLocalUnsafeInvalidProofNoMutation",
  "provesLocalUnsafeWrongPublicInputNoMutation",
  "provesLocalUnsafeWrongVerifierProgramNoMutation",
]) {
  assert(
    packet.localUnsafeGeneratedVerifierCpiAcceptanceHarnessRef[field] === true,
    `local unsafe generated verifier CPI harness ${field} must be true`,
  );
}
assert(
  packet.localUnsafeGeneratedVerifierCpiAcceptanceHarnessRef.provesWrongVerifyingKeyNoMutation === false,
  "local unsafe generated verifier CPI harness must not claim wrong-verifying-key no-mutation",
);
for (const field of [
  "satisfiesValidProofSuccess",
  "satisfiesAcceptedProofMutation",
  "satisfiesInvalidProofNoMutation",
  "satisfiesWrongPublicInputHashNoMutation",
  "satisfiesWrongVerifyingKeyNoMutation",
  "satisfiesVerifierAdapterAcceptance",
  "satisfiesSbfLiveLineage",
]) {
  assert(
    packet.localUnsafeGeneratedVerifierCpiAcceptanceHarnessRef[field] === false,
    `local unsafe generated verifier CPI harness ${field} must stay false`,
  );
}
for (const phrase of [
  "local unsafe Sunspot/Gnark artifact lane only",
  "not tag-3 production valid-proof success evidence",
  "not accepted-proof production mutation evidence",
  "not production no-mutation evidence",
  "not verifier-adapter acceptance",
  "not SBF/live lineage",
]) {
  includes(
    packet.localUnsafeGeneratedVerifierCpiAcceptanceHarnessRef.truthBoundary ?? "",
    phrase,
    "local unsafe generated verifier CPI truth boundary",
  );
}

assertAllowedKeys(packet.sourceCopyFindingsGate, "source/copy/findings gate", [
  "status",
  "scannedSurfaces",
  "claimPattern",
  "safeContextRequirement",
  "proofVerifiedClaimAllowed",
]);
assert(packet.sourceCopyFindingsGate.status === "fail-closed", "source/copy/findings gate must fail closed");
assert(packet.sourceCopyFindingsGate.proofVerifiedClaimAllowed === false, "source gate must keep claims false");
assertStringArray(packet.sourceCopyFindingsGate.scannedSurfaces, "source/copy/findings scanned surfaces");
assertStringArray(packet.forbiddenPromotions, "forbidden promotions");
assertStringArray(packet.canonicalCommands, "canonical commands");
for (const command of [
  "npm run zk:c01-positive-proof-verified-claim-gate-check",
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "npm run zk:c01-verifier-adapter-seam-check",
  "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
  "npm run zk:c01-onchain-proof-boundary-check",
  "npm run truth:privacy-claim-gate",
]) {
  assert(packet.canonicalCommands.includes(command), `packet must record canonical command ${command}`);
}
for (const phrase of [
  "proof-verified claim gate",
  "not tag-3 valid-proof success evidence",
  "not proof-verified spend evidence",
  "not on-chain proof verification",
]) {
  includes(packet.truthBoundary ?? "", phrase, "packet truth boundary");
}

assert(
  candidate.status === "blocked-selected-groth16-tag3-solana-v0-production-evidence",
  "candidate must remain blocked",
);
assert(adapter.status === "blocked-no-verifier-adapter-acceptance-tests", "adapter candidate must remain blocked");
assert(
  adapter.currentFailClosedObservation?.errorName === "ERR_PROOF_VERIFIER_NOT_WIRED",
  "adapter fail-closed observation must preserve error 14",
);
assert(
  adapter.localFailClosedVerifierAdapterSeamHarness?.status === "local-fail-closed-harness-only",
  "adapter packet must expose the local fail-closed seam harness",
);
assert(
  adapter.localFailClosedVerifierAdapterSeamHarness?.satisfiesVerifierAdapterAcceptance === false,
  "adapter seam harness must not satisfy verifier adapter acceptance",
);
assert(
  adapter.localFailClosedVerifierAdapterSeamHarness?.satisfiesTag3ProofAcceptance === false,
  "adapter seam harness must not satisfy tag-3 proof acceptance",
);
assert(
  adapter.localUnsafeGeneratedVerifierCpiAcceptanceHarness?.status ===
    "local-unsafe-generated-verifier-cpi-acceptance-and-no-mutation",
  "adapter packet must expose the local unsafe generated verifier CPI acceptance harness",
);
assert(
  adapter.localUnsafeGeneratedVerifierCpiAcceptanceHarness?.satisfiesProductionVerifierAdapterEvidence === false,
  "adapter local unsafe generated verifier CPI harness must not satisfy production verifier adapter evidence",
);
for (const id of [
  "accepted-proof-mutates-state-test",
  "invalid-proof-leaves-accounts-unchanged-test",
  "wrong-public-input-hash-leaves-accounts-unchanged-test",
  "wrong-verifying-key-leaves-accounts-unchanged-test",
]) {
  const evidence = candidate.requiredPositiveEvidence?.find((entry) => entry.id === id);
  assert(evidence?.status === "blocked", `candidate ${id} must remain blocked`);
  assert(evidence?.currentArtifactRef === null, `candidate ${id} artifact must stay null`);
}

for (const marker of [
  "const TAG_SPEND_WITH_PROOF: u8 = 3;",
  "const ERR_PROOF_VERIFIER_NOT_WIRED: u32 = 14;",
  "struct VerifiedSpendPreflight",
  "fn preflight_spend_with_proof",
  "fn verify_spend_with_proof_adapter",
  "fn spend_with_proof_verifier_cpi_instruction",
  "fn require_spend_with_proof_verifier_program",
  "fn verifier_instruction_data",
  "fn require_spend_with_proof_public_witness_binding",
  "fn commit_verified_spend",
  "proof_carrying_spend_default_adapter_rejects_before_commit",
  "proof_carrying_spend_verifier_instruction_data_matches_gnark_tuple",
  "proof_carrying_spend_verifier_cpi_instruction_matches_generated_solana_verifier_shape",
  "proof_carrying_spend_requires_readonly_executable_verifier_program_account",
  "proof_carrying_spend_public_witness_binding_rejects_wrong_hash_before_not_wired",
  "verified_spend_commit_mutates_only_after_adapter_acceptance",
  "proof-carrying spend ABI is reserved; verifier not wired after root/nullifier/output/verifier-key/verifier-program preflight",
  "Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))",
]) {
  includes(program, marker, programPath);
}
for (const marker of [
  "Verifier Adapter Acceptance-Test Candidate packet",
  "local fail-closed verifier adapter seam harness",
  "npm run zk:c01-verifier-adapter-seam-check",
  "does not prove tag-3 proof acceptance",
  "Do not mark C01 verified-local",
]) {
  includes(decision, marker, decisionPath);
}
for (const marker of [
  "proof-verified TAG_UNSHIELD release",
  "doesNotProve",
  "valid-proof mutation evidence",
]) {
  includes(findings, marker, "VANTA_ZK_REVIEW.findings.json");
}

const proofVerifiedClaimPatterns = [
  /\bproof-verified\b/iu,
  /\bon-chain proof verified\b/iu,
  /\bproof-enforced-spend\b/iu,
  /\bproduction verifier accepted\b/iu,
  /\btag-3 proof acceptance\b/iu,
  /\bsolana-c01-groth16-verifier-ready\b/iu,
];
const safeContextPatterns = [
  /\bnot\b/iu,
  /\bno\b/iu,
  /\bblocked\b/iu,
  /\bfail[-\s]?closed\b/iu,
  /\buntil\b/iu,
  /\bbefore\b/iu,
  /\brequires?\b/iu,
  /\brequired\b/iu,
  /\babsent\b/iu,
  /\bforbidden\b/iu,
  /\bdoes not\b/iu,
  /\bdo not\b/iu,
  /\bcannot\b/iu,
  /\bexcluded from\b/iu,
  /\btruthBoundary\b/u,
  /\bdoesNotProve\b/u,
  /\bcurrentFailClosedObservation\b/u,
  /\bforbiddenPromotions\b/u,
  /\bcanonicalCommands\b/u,
  /\bclaim gate\b/iu,
  /\bnpm run\b/u,
  /\bnode scripts\//u,
  /\bnotes\/20\d{2}-/u,
  /\bc01PositiveProofVerifiedClaimGateEvidence\b/u,
  /\.well-known\/vanta-audit\.json/u,
  /private-pool-v2-c01-positive-proof-verified-claim-gate\.evidence\.json/u,
  /positive-proof-verified-claim-gate\\\.evidence/u,
  /check-vanta-private-pool-v2-c01-positive-proof-verified-claim-gate\.mjs/u,
  /\boverclaim\b/iu,
  /\bguard\b/iu,
  /\bmarker\b/iu,
  /\bassert\b/u,
  /\bincludes\(/u,
  /\bas const\b/u,
  /\btype\b/u,
  /\bonChainVerifierEvidence\b/u,
  /\bverifiedReceipt\b/u,
  /\bpositive\/negative test\b/iu,
  /\breviewer evidence\b/iu,
];

function lineHasProofVerifiedClaim(line) {
  return proofVerifiedClaimPatterns.some((pattern) => pattern.test(line));
}

function lineHasSafeContext(line, lines, index) {
  const context = [
    lines[index - 5],
    lines[index - 4],
    lines[index - 3],
    lines[index - 2],
    lines[index - 1],
    line,
    lines[index + 1],
    lines[index + 2],
    lines[index + 3],
    lines[index + 4],
    lines[index + 5],
  ]
    .filter(Boolean)
    .join("\n");
  return safeContextPatterns.some((pattern) => pattern.test(context));
}

const trackedFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((path) => {
    return (
      (path.endsWith(".html") ||
        path.endsWith(".json") ||
        path.endsWith(".md") ||
        path.endsWith(".mjs") ||
        path.endsWith(".ts") ||
        path.endsWith(".tsx")) &&
      !path.startsWith("node_modules/") &&
      !path.startsWith("dist/") &&
      !path.startsWith("docs/superpowers/")
    );
  });

const unguardedClaims = [];
for (const file of trackedFiles) {
  const lines = read(file).split(/\r?\n/u);
  for (const [index, line] of lines.entries()) {
    if (!lineHasProofVerifiedClaim(line) || lineHasSafeContext(line, lines, index)) {
      continue;
    }
    unguardedClaims.push(`${file}:${index + 1}: ${line.trim()}`);
  }
}

if (packet.proofVerifiedClaimAllowed !== true && unguardedClaims.length > 0) {
  fail(`unguarded proof-verified claim language found:\n${unguardedClaims.join("\n")}`);
}

console.log("private-pool-v2 C01 positive proof-verified claim gate: PASS");

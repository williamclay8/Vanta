import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const gatePath =
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json";
const templatePath =
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json";
const adapterCandidatePath =
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json";
const productionGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const deterministicBuildGatePath =
  "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json";
const productionVkPath = "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json";
const proofFormatPath = "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const publicWitnessPath = "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json";
const productionBundleTemplatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const runbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const acceptanceEnvVar = "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH";
const currentProofReceiptRef =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json";
const currentH6PublicInputValue =
  "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b";
const currentH6PublicInputCommitment =
  "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2";

function fail(message) {
  console.error(`private-pool-v2 C01 verifier-adapter acceptance gate: FAIL - ${message}`);
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

function readJsonPath(path, label) {
  const resolved = resolve(repoRoot, path);
  assert(existsSync(resolved), `${label} missing at ${path}`);
  return JSON.parse(readFileSync(resolved, "utf8"));
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

function mapById(entries, label) {
  assert(Array.isArray(entries), `${label} must be an array`);
  const map = new Map();
  for (const entry of entries) {
    assert(typeof entry?.id === "string", `${label} entry missing id`);
    assert(!map.has(entry.id), `${label} has duplicate id ${entry.id}`);
    map.set(entry.id, entry);
  }
  return map;
}

function assertNullRefs(value, label, fields) {
  for (const field of fields) {
    assert(value[field] === null, `${label}.${field} must stay null`);
  }
}

function assertRef(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty ref`);
  assert(!value.includes("://"), `${label} must be a refs-only local/review handle, not a URL`);
  assert(!value.includes("-----BEGIN"), `${label} must not contain key material`);
}

function assertSha256(value, label) {
  assert(typeof value === "string", `${label} must be a sha256 string`);
  assert(/^sha256:[0-9a-f]{64}$/u.test(value), `${label} must be sha256:<64 lowercase hex>`);
}

function assertEvidenceFlags(value, expected, label) {
  assertAllowedKeys(value, label, Object.keys(expected));
  for (const [field, expectedValue] of Object.entries(expected)) {
    assert(value[field] === expectedValue, `${label}.${field} mismatch`);
  }
}

function assertTemplate(template) {
  assertAllowedKeys(template, "verifier adapter acceptance template", [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "purpose",
    "prerequisites",
    "publicInputBinding",
    "adapterAcceptance",
    "mutationEvidence",
    "acceptanceReviewAttestation",
    "downstreamRequired",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(
    template.version === "vanta-private-pool-v2-c01-verifier-adapter-acceptance-template-0.1",
    "template version mismatch",
  );
  assert(template.status === "template-not-verifier-adapter-acceptance", "template status mismatch");
  assert(template.selectedBackend === gate.selectedBackend, "template selected backend mismatch");
  assert(template.routeId === gate.routeId, "template route mismatch");
  assert(template.secretPolicy === gate.secretPolicy, "template secret policy mismatch");
  assertNullRefs(template.prerequisites, "template prerequisites", [
    "deterministicArtifactBuildRef",
    "productionProofFormatArtifactRef",
    "productionVerifyingKeyArtifactRef",
    "productionVerifyingKeyHash",
    "publicWitnessArtifactRef",
  ]);
  for (const [field, expected] of [
    ["verifyingKeyHashKind", shape.verifyingKeyHashKind],
    ["proofFormatId", shape.proofFormatId],
    ["proofByteLength", shape.proofByteLength],
    ["publicWitnessByteLength", shape.publicWitnessByteLength],
    ["verifierInstructionDataByteLength", shape.verifierInstructionDataByteLength],
    ["generatedVerifierNrPubinputs", shape.generatedVerifierNrPubinputs],
    ["generatedVerifierCommitmentKeys", shape.generatedVerifierCommitmentKeys],
  ]) {
    assert(template.prerequisites?.[field] === expected, `template prerequisites.${field} mismatch`);
  }
  assert(template.publicInputBinding?.publicWitnessArtifactRef === null, "template public witness ref must stay null");
  assert(
    template.publicInputBinding?.decodedPublicInputLabel === shape.publicInputLabel,
    "template public input label mismatch",
  );
  assert(
    template.publicInputBinding?.decodedPublicInputValue === currentH6PublicInputValue,
    "template public input value mismatch",
  );
  assert(
    template.publicInputBinding?.publicInputCommitment === currentH6PublicInputCommitment,
    "template public input commitment mismatch",
  );
  assert(
    template.publicInputBinding?.matchesCurrentH6ProofReceipt === false,
    "template must not claim current H6 binding",
  );
  assert(
    template.publicInputBinding?.satisfiesProductionPublicInputBinding === false,
    "template must not claim production public-input binding",
  );
  assert(
    template.adapterAcceptance?.verifierAdapterAcceptanceGateRef === gatePath,
    "template adapter acceptance gate ref mismatch",
  );
  assertNullRefs(template.adapterAcceptance, "template adapter acceptance", [
    "verifierAdapterAcceptanceRef",
    "verifierAdapterOrProgramRef",
    "acceptedVerifierBoundary",
    "verifierProgramRef",
  ]);
  assert(template.adapterAcceptance?.adapterKind === shape.adapterKind, "template adapter kind mismatch");
  assert(
    template.adapterAcceptance?.satisfiesVerifierAdapterAcceptance === false,
    "template must not claim verifier adapter acceptance",
  );
  assertNullRefs(template.mutationEvidence, "template mutation evidence", [
    "validProofMutationTestRef",
    "invalidProofNoMutationTestRef",
    "wrongPublicInputNoMutationTestRef",
    "wrongVerifyingKeyNoMutationTestRef",
  ]);
  for (const field of [
    "validProofMutatesState",
    "invalidProofLeavesAccountsUnchanged",
    "wrongPublicInputLeavesAccountsUnchanged",
    "wrongVerifyingKeyLeavesAccountsUnchanged",
  ]) {
    assert(template.mutationEvidence?.[field] === false, `template mutationEvidence.${field} must be false`);
  }
  assertNullRefs(template.acceptanceReviewAttestation, "template acceptance review attestation", [
    "reviewerIdentityRef",
    "reviewScopeRef",
    "verifierAdapterAcceptanceRef",
    "deterministicArtifactBuildRef",
    "productionVerifyingKeyArtifactRef",
  ]);
  assert(
    template.acceptanceReviewAttestation?.acceptedForC01VerifierAdapter === false,
    "template must not claim verifier-adapter review attestation",
  );
  assertNullRefs(template.downstreamRequired, "template downstream required", [
    "productionBundleRef",
    "sbfLiveLineageRef",
    "auditReviewerAcceptanceRef",
  ]);
  assertEvidenceFlags(
    template.satisfiesRequiredPositiveEvidence,
    {
      deterministicArtifactBuild: false,
      actualPrivateSpendProductionProofFormat: false,
      privateSpendPublicInputHashBinding: false,
      productionVerifyingKeyHash: false,
      verifierAdapter: false,
      acceptedProofMutatesStateTest: false,
      invalidProofLeavesAccountsUnchangedTest: false,
      wrongPublicInputHashLeavesAccountsUnchangedTest: false,
      wrongVerifyingKeyLeavesAccountsUnchangedTest: false,
      sbfLiveLineage: false,
      auditReviewerAcceptance: false,
    },
    "template evidence flags",
  );
  includes(template.truthBoundary ?? "", "not verifier-adapter acceptance", "template truth boundary");
  includes(template.truthBoundary ?? "", "does not close C01", "template truth boundary");
}

function assertReviewedAdapterAcceptance(acceptance, label) {
  assertAllowedKeys(acceptance, label, [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "prerequisites",
    "publicInputBinding",
    "adapterAcceptance",
    "mutationEvidence",
    "acceptanceReviewAttestation",
    "downstreamRequired",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(
    acceptance.version === "vanta-private-pool-v2-c01-verifier-adapter-acceptance-0.1",
    `${label} version mismatch`,
  );
  assert(acceptance.status === "reviewed-verifier-adapter-acceptance-candidate", `${label} status mismatch`);
  assert(acceptance.selectedBackend === gate.selectedBackend, `${label} selected backend mismatch`);
  assert(acceptance.routeId === gate.routeId, `${label} route mismatch`);
  assert(acceptance.secretPolicy === gate.secretPolicy, `${label} secret policy mismatch`);

  const prerequisites = acceptance.prerequisites ?? {};
  for (const field of [
    "deterministicArtifactBuildRef",
    "productionProofFormatArtifactRef",
    "productionVerifyingKeyArtifactRef",
    "publicWitnessArtifactRef",
  ]) {
    assertRef(prerequisites[field], `${label} prerequisites.${field}`);
  }
  assertSha256(prerequisites.productionVerifyingKeyHash, `${label} production VK hash`);
  for (const [field, expected] of [
    ["verifyingKeyHashKind", shape.verifyingKeyHashKind],
    ["proofFormatId", shape.proofFormatId],
    ["proofByteLength", shape.proofByteLength],
    ["publicWitnessByteLength", shape.publicWitnessByteLength],
    ["verifierInstructionDataByteLength", shape.verifierInstructionDataByteLength],
    ["generatedVerifierNrPubinputs", shape.generatedVerifierNrPubinputs],
    ["generatedVerifierCommitmentKeys", shape.generatedVerifierCommitmentKeys],
  ]) {
    assert(prerequisites[field] === expected, `${label} prerequisites.${field} mismatch`);
  }

  const binding = acceptance.publicInputBinding ?? {};
  assertRef(binding.publicWitnessArtifactRef, `${label} public input binding public witness ref`);
  assert(
    binding.publicWitnessArtifactRef === prerequisites.publicWitnessArtifactRef,
    `${label} public witness binding ref must equal prerequisite public witness ref`,
  );
  assert(binding.decodedPublicInputLabel === shape.publicInputLabel, `${label} public input label mismatch`);
  assert(binding.decodedPublicInputValue === currentH6PublicInputValue, `${label} public input value mismatch`);
  assert(binding.publicInputCommitment === currentH6PublicInputCommitment, `${label} public input commitment mismatch`);
  assert(binding.matchesCurrentH6ProofReceipt === true, `${label} must match current H6 proof receipt`);
  assert(binding.satisfiesProductionPublicInputBinding === true, `${label} public-input binding must be true`);

  const adapter = acceptance.adapterAcceptance ?? {};
  assertRef(adapter.verifierAdapterAcceptanceRef, `${label} verifier adapter acceptance ref`);
  assert(adapter.verifierAdapterAcceptanceGateRef === gatePath, `${label} gate ref mismatch`);
  assertRef(adapter.verifierAdapterOrProgramRef, `${label} verifier adapter/program ref`);
  assertRef(adapter.acceptedVerifierBoundary, `${label} accepted verifier boundary`);
  assertRef(adapter.verifierProgramRef, `${label} verifier program ref`);
  assert(adapter.adapterKind === shape.adapterKind, `${label} adapter kind mismatch`);
  assert(adapter.satisfiesVerifierAdapterAcceptance === true, `${label} verifier adapter acceptance must be true`);

  const mutation = acceptance.mutationEvidence ?? {};
  for (const field of [
    "validProofMutationTestRef",
    "invalidProofNoMutationTestRef",
    "wrongPublicInputNoMutationTestRef",
    "wrongVerifyingKeyNoMutationTestRef",
  ]) {
    assertRef(mutation[field], `${label} mutationEvidence.${field}`);
  }
  for (const field of [
    "validProofMutatesState",
    "invalidProofLeavesAccountsUnchanged",
    "wrongPublicInputLeavesAccountsUnchanged",
    "wrongVerifyingKeyLeavesAccountsUnchanged",
  ]) {
    assert(mutation[field] === true, `${label} mutationEvidence.${field} must be true`);
  }
  const reviewAttestation = acceptance.acceptanceReviewAttestation ?? {};
  for (const field of [
    "reviewerIdentityRef",
    "reviewScopeRef",
    "verifierAdapterAcceptanceRef",
    "deterministicArtifactBuildRef",
    "productionVerifyingKeyArtifactRef",
  ]) {
    assertRef(reviewAttestation[field], `${label} acceptanceReviewAttestation.${field}`);
  }
  assert(
    reviewAttestation.verifierAdapterAcceptanceRef === adapter.verifierAdapterAcceptanceRef,
    `${label} review attestation adapter acceptance ref must match adapter ref`,
  );
  assert(
    reviewAttestation.deterministicArtifactBuildRef === prerequisites.deterministicArtifactBuildRef,
    `${label} review attestation deterministic build ref must match prerequisite build ref`,
  );
  assert(
    reviewAttestation.productionVerifyingKeyArtifactRef === prerequisites.productionVerifyingKeyArtifactRef,
    `${label} review attestation VK ref must match prerequisite VK ref`,
  );
  assert(
    reviewAttestation.acceptedForC01VerifierAdapter === true,
    `${label} review attestation must accept C01 verifier adapter`,
  );
  for (const field of ["productionBundleRef", "sbfLiveLineageRef", "auditReviewerAcceptanceRef"]) {
    assertRef(acceptance.downstreamRequired?.[field], `${label} downstreamRequired.${field}`);
  }
  assertEvidenceFlags(
    acceptance.satisfiesRequiredPositiveEvidence,
    {
      deterministicArtifactBuild: true,
      actualPrivateSpendProductionProofFormat: true,
      privateSpendPublicInputHashBinding: true,
      productionVerifyingKeyHash: true,
      verifierAdapter: true,
      acceptedProofMutatesStateTest: true,
      invalidProofLeavesAccountsUnchangedTest: true,
      wrongPublicInputHashLeavesAccountsUnchangedTest: true,
      wrongVerifyingKeyLeavesAccountsUnchangedTest: true,
      sbfLiveLineage: false,
      auditReviewerAcceptance: false,
    },
    `${label} evidence flags`,
  );
  includes(acceptance.truthBoundary ?? "", "reviewed verifier-adapter acceptance", `${label} truth boundary`);
  includes(acceptance.truthBoundary ?? "", "not SBF/live lineage", `${label} truth boundary`);
  includes(acceptance.truthBoundary ?? "", "not C01 closure", `${label} truth boundary`);
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const gateText = read(gatePath);
const gate = JSON.parse(gateText);
const template = readJson(templatePath);
const adapterCandidate = readJson(adapterCandidatePath);
const productionGate = readJson(productionGatePath);
const deterministicBuildGate = readJson(deterministicBuildGatePath);
const productionVk = readJson(productionVkPath);
const proofFormat = readJson(proofFormatPath);
const publicWitness = readJson(publicWitnessPath);
const productionBundleTemplate = readJson(productionBundleTemplatePath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);
const runbook = read(runbookPath);
const review = read(reviewPath);

assert(
  scripts["zk:c01-verifier-adapter-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-adapter-acceptance-gate.mjs",
  "package.json must expose zk:c01-verifier-adapter-acceptance-gate-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-adapter-acceptance-gate-check"),
    `${aggregate} must include the verifier adapter acceptance gate`,
  );
}
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
  assert(!gateText.includes(forbidden), `gate must not contain forbidden marker ${forbidden}`);
}

assertAllowedKeys(gate, "verifier adapter acceptance gate", [
  "version",
  "checkedAt",
  "status",
  "selectedBackend",
  "selectedBackendStatus",
  "routeId",
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "verifierAdapterAcceptanceReady",
  "secretPolicy",
  "purpose",
  "verifierAdapterTestCandidateRef",
  "productionArtifactAcceptanceGateRef",
  "deterministicProductionArtifactBuildGateRef",
  "verifierAdapterAcceptanceTemplateRef",
  "productionVerifyingKeyCandidateRef",
  "groth16ProofFormatCandidateRef",
  "publicWitnessBindingObservationRef",
  "decisionPacketRef",
  "requiredAcceptanceShape",
  "currentAcceptedVerifierAdapter",
  "externalVerifierAdapterAcceptanceValidation",
  "acceptanceCriteria",
  "promotionRules",
  "satisfiesRequiredPositiveEvidence",
  "remainingBlockers",
  "canonicalCommands",
  "truthBoundary",
]);
assert(gate.version === "vanta-private-pool-v2-c01-verifier-adapter-acceptance-gate-0.1", "gate version mismatch");
assert(gate.status === "blocked-no-production-verifier-adapter-acceptance", "gate status mismatch");
assert(gate.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(gate.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(gate.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "verifierAdapterAcceptanceReady",
]) {
  assert(gate[field] === false, `${field} must remain false`);
}
assert(gate.secretPolicy === "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-or-signed-transaction-bytes", "secret policy mismatch");
for (const [field, expected] of [
  ["verifierAdapterTestCandidateRef", adapterCandidatePath],
  ["productionArtifactAcceptanceGateRef", productionGatePath],
  ["deterministicProductionArtifactBuildGateRef", deterministicBuildGatePath],
  ["verifierAdapterAcceptanceTemplateRef", templatePath],
  ["productionVerifyingKeyCandidateRef", productionVkPath],
  ["groth16ProofFormatCandidateRef", proofFormatPath],
  ["publicWitnessBindingObservationRef", publicWitnessPath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(gate[field] === expected, `${field} mismatch`);
}
assert(adapterCandidate.verifierAdapterAcceptanceGateRef === gatePath, "adapter candidate must reference gate");
assert(productionGate.verifierAdapterAcceptanceGateRef === gatePath, "production gate must reference adapter acceptance gate");
assert(deterministicBuildGate.status === "blocked-no-deterministic-production-artifact-build-receipt", "deterministic build gate status mismatch");

const shape = gate.requiredAcceptanceShape ?? {};
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["routeId", gate.routeId],
  ["proofFormatId", "gnark-solana-native-proof-and-public-witness-v0"],
  ["proofByteLength", 324],
  ["publicWitnessByteLength", 44],
  ["verifierInstructionDataByteLength", 368],
  ["generatedVerifierNrPubinputs", 1],
  ["generatedVerifierCommitmentKeys", 0],
  ["publicInputLabel", "private-spend-public-input-hash"],
  ["currentProofReceiptRef", currentProofReceiptRef],
  ["requiredPublicInputValue", currentH6PublicInputValue],
  ["requiredPublicInputCommitment", currentH6PublicInputCommitment],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["adapterKind", "in-program-verifier-or-dedicated-verifier-cpi"],
  ["deterministicArtifactBuildRequired", true],
  ["deterministicArtifactBuildGateRef", deterministicBuildGatePath],
  ["validMutationRequired", true],
  ["invalidProofNoMutationRequired", true],
  ["wrongPublicInputNoMutationRequired", true],
  ["wrongVerifyingKeyNoMutationRequired", true],
  ["status", "required-before-production-bundle-adapter-promotion"],
]) {
  assert(shape[field] === expected, `required acceptance shape ${field} mismatch`);
}
assert(publicWitness.localProofReceiptObservation?.publicInputValue === currentH6PublicInputValue, "public input value mismatch");
assert(publicWitness.localProofReceiptObservation?.publicInputCommitment === currentH6PublicInputCommitment, "public input commitment mismatch");
assert(proofFormat.requiredCandidateShape?.proofFormatId === shape.proofFormatId, "proof format id mismatch");
assert(productionVk.requiredVerifyingKeyShape?.verifyingKeyHashKind === shape.verifyingKeyHashKind, "VK hash kind mismatch");

const accepted = gate.currentAcceptedVerifierAdapter ?? {};
assertAllowedKeys(accepted, "current accepted verifier adapter", [
  "status",
  "adapterAcceptanceRef",
  "deterministicArtifactBuildRef",
  "productionProofFormatArtifactRef",
  "productionVerifyingKeyArtifactRef",
  "productionVerifyingKeyHash",
  "publicWitnessArtifactRef",
  "verifierAdapterOrProgramRef",
  "acceptedVerifierBoundary",
  "validProofMutationTestRef",
  "invalidProofNoMutationTestRef",
  "wrongPublicInputNoMutationTestRef",
  "wrongVerifyingKeyNoMutationTestRef",
  "acceptanceReviewAttestationRef",
  "satisfiesVerifierAdapterAcceptance",
]);
assert(accepted.status === "absent", "accepted verifier adapter must be absent");
assertNullRefs(accepted, "accepted verifier adapter", [
  "adapterAcceptanceRef",
  "deterministicArtifactBuildRef",
  "productionProofFormatArtifactRef",
  "productionVerifyingKeyArtifactRef",
  "productionVerifyingKeyHash",
  "publicWitnessArtifactRef",
  "verifierAdapterOrProgramRef",
  "acceptedVerifierBoundary",
  "validProofMutationTestRef",
  "invalidProofNoMutationTestRef",
  "wrongPublicInputNoMutationTestRef",
  "wrongVerifyingKeyNoMutationTestRef",
  "acceptanceReviewAttestationRef",
]);
assert(accepted.satisfiesVerifierAdapterAcceptance === false, "accepted verifier adapter must remain false");

const external = gate.externalVerifierAdapterAcceptanceValidation ?? {};
assert(external.status === "ready-for-reviewed-refs-only-verifier-adapter-acceptance-validation", "external validation status mismatch");
assert(external.envVar === acceptanceEnvVar, "external validation env var mismatch");
assert(external.templateRef === templatePath, "external validation template ref mismatch");
assert(
  external.command ===
    "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "external validation command mismatch",
);
assert(external.defaultGuardRequiresExternalAcceptance === false, "external acceptance must be optional by default");
assert(external.validatedWhenEnvVarPresent === true, "external acceptance must validate when env var is present");
assertStringArray(external.validates, "external validation validates");
for (const marker of [
  "deterministic production artifact build ref",
  "production proof-format artifact ref",
  "production verifying-key artifact and hash kind",
  "current H6 private-spend-public-input-hash binding",
  "accepted verifier adapter or verifier program ref",
  "valid-proof mutation evidence",
  "invalid-proof no-mutation evidence",
  "wrong-public-input no-mutation evidence",
  "wrong-verifying-key no-mutation evidence",
  "verifier-adapter reviewer identity/scope attestation",
  "refs-only secret policy",
  "SBF/live lineage and audit blockers remain separate",
]) {
  assert(external.validates.includes(marker), `external validation missing ${marker}`);
}
assert(external.satisfiesVerifierAdapterAcceptance === false, "external validation must not satisfy acceptance by itself");
for (const marker of [
  "verifier-adapter acceptance intake executable",
  "does not supply acceptance",
  "accepted verifier-adapter refs null",
]) {
  includes(external.truthBoundary ?? "", marker, "external validation truth boundary");
}
assertTemplate(template);

const criteria = mapById(gate.acceptanceCriteria, "acceptance criteria");
for (const [id, shapeRef] of [
  ["deterministic-production-artifact-build-receipt", "build:<reviewed-deterministic-production-artifact-build-receipt-ref>"],
  ["production-proof-format-artifact", "artifact:<actual-private-spend-production-groth16-proof-format-ref>"],
  ["production-verifying-key-artifact-and-hash", "artifact+sha256:<actual-private-spend-production-vk-ref-and-hash>"],
  ["current-h6-public-input-binding", "artifact:<public-witness-values-ref-bound-to-current-h6-private-spend-public-input-hash>"],
  ["accepted-verifier-adapter-or-program", "adapter:<accepted-solana-groth16-verifier-adapter-or-program-ref>"],
  ["valid-proof-mutates-nullifier-output-state", "test:<valid-proof-mutates-nullifier-output-state-ref>"],
  ["invalid-proof-leaves-account-bytes-unchanged", "test:<invalid-proof-leaves-account-bytes-unchanged-ref>"],
  ["wrong-public-input-leaves-account-bytes-unchanged", "test:<wrong-public-input-hash-leaves-account-bytes-unchanged-ref>"],
  ["wrong-verifying-key-leaves-account-bytes-unchanged", "test:<wrong-verifying-key-leaves-account-bytes-unchanged-ref>"],
  ["verifier-adapter-review-attestation", "review:<verifier-adapter-reviewer-identity-scope-attestation-ref>"],
]) {
  const criterion = criteria.get(id);
  assert(criterion, `missing criterion ${id}`);
  assert(criterion.requiredRefShape === shapeRef, `${id} ref shape mismatch`);
  assert(criterion.currentRef === null, `${id} currentRef must stay null`);
  assert(criterion.satisfiesC01PositiveEvidence === false, `${id} must not satisfy C01 evidence`);
}
for (const rule of [
  "verifier-adapter acceptance refs must be references only; raw proof, verifying-key, proving-key, witness, keypair, secret, and signed transaction bytes stay out of git",
  "adapter acceptance can promote only after reviewed deterministic production artifact build evidence exists for the exact proof/VK/public-witness tuple",
  "valid mutation and invalid/wrong-input/wrong-key no-mutation evidence must run under the accepted verifier boundary",
  "wrong-verifying-key no-mutation must bind to production verifying-key hash semantics, not only wrong verifier-program id",
  "verifier-adapter acceptance must include reviewer identity, review scope, and cross-refs to the accepted adapter, deterministic build, and production verifying-key artifact",
  "verifier-adapter acceptance does not by itself prove rebuilt/redeployed/reinitialized/live SBF lineage or audit/reviewer acceptance",
]) {
  assert(gate.promotionRules?.includes(rule), `missing promotion rule ${rule}`);
}
assertEvidenceFlags(
  gate.satisfiesRequiredPositiveEvidence,
  {
    backendSelection: true,
    deterministicArtifactBuild: false,
    actualPrivateSpendProductionProofFormat: false,
    privateSpendPublicInputHashBinding: false,
    productionVerifyingKeyHash: false,
    verifierAdapter: false,
    acceptedProofMutatesStateTest: false,
    invalidProofLeavesAccountsUnchangedTest: false,
    wrongPublicInputHashLeavesAccountsUnchangedTest: false,
    wrongVerifyingKeyLeavesAccountsUnchangedTest: false,
    sbfLiveLineage: false,
    auditReviewerAcceptance: false,
  },
  "gate evidence flags",
);
assertStringArray(gate.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
]) {
  assert(gate.canonicalCommands.includes(command), `missing canonical command ${command}`);
}
assert(
  productionBundleTemplate.adapterAcceptance?.verifierAdapterAcceptanceGateRef === gatePath,
  "production bundle template must reference adapter acceptance gate",
);
assert(
  productionBundleTemplate.satisfiesRequiredPositiveEvidence?.verifierAdapter === false,
  "production bundle template must not claim verifier adapter acceptance",
);
for (const marker of [
  "C01 verifier-adapter acceptance gate",
  gatePath,
  templatePath,
  "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json>",
  "blocked-no-production-verifier-adapter-acceptance",
]) {
  includes(decision, marker, decisionPath);
  includes(auditPackage, marker, auditPackagePath);
  includes(runbook, marker, runbookPath);
  includes(review, marker, reviewPath);
}
for (const marker of [
  "blocked production verifier-adapter acceptance gate",
  "not verifier-adapter acceptance",
  "not tag-3 proof acceptance",
  "not SBF/live lineage",
  "not C01 closure",
]) {
  includes(gate.truthBoundary ?? "", marker, "gate truth boundary");
}

const externalAcceptancePath = process.env[acceptanceEnvVar];
if (externalAcceptancePath) {
  const externalAcceptance = readJsonPath(externalAcceptancePath, "external verifier-adapter acceptance");
  assertReviewedAdapterAcceptance(externalAcceptance, "external verifier-adapter acceptance");
}

console.log("private-pool-v2 C01 verifier-adapter acceptance gate: PASS");

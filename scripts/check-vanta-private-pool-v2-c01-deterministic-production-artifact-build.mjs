import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const gatePath =
  "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json";
const templatePath =
  "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const productionGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const sourceReviewAcceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json";
const sourceReviewPath =
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json";
const preflightPath =
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json";
const routePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json";
const publicWitnessPath = "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json";
const bundleTemplatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const runbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const buildReceiptEnvVar = "VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH";
const currentSourceAcirRef =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.json";
const currentSourceAcirSha256 =
  "sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9";
const reviewedBeta18H6SourceAcirSha256 =
  "sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde";
const currentProofReceiptRef =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json";
const currentH6PublicInputValue =
  "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b";
const currentH6PublicInputCommitment =
  "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2";
const candidateSourceRef =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry_sunspot_beta18_h6_candidate/src/main.nr";
const candidateSourceSha256 =
  "sha256:caaeb2c2767965bd5d6c68c3043b8be10b43b345f017e32c6aa67658e927d430";

function fail(message) {
  console.error(`private-pool-v2 C01 deterministic production artifact build gate: FAIL - ${message}`);
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

const forbiddenExternalMaterialMarkers = [
  "proofBytes",
  "proofHex",
  "verifyingKeyBytes",
  "verifying_key_bytes",
  "vkBytes",
  "witnessBytes",
  "provingKeyBytes",
  "keypairBytes",
  "privateKey",
  "secretKey",
  "signedTransactionBytes",
  "-----BEGIN",
  "bearer ",
  "postgres://",
  "postgresql://",
];

function assertNoForbiddenExternalMaterial(source, label) {
  for (const marker of forbiddenExternalMaterialMarkers) {
    assert(!source.includes(marker), `${label} must not contain forbidden marker ${marker}`);
  }
}

function readJsonPath(path, label) {
  const resolved = path.startsWith("/") ? path : resolve(repoRoot, path);
  assert(existsSync(resolved), `${label} missing at ${path}`);
  const source = readFileSync(resolved, "utf8");
  assertNoForbiddenExternalMaterial(source, label);
  return JSON.parse(source);
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
  assertAllowedKeys(template, "deterministic build template", [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "purpose",
    "sourceLineage",
    "toolchainAndSetup",
    "productionOutputs",
    "publicInputBinding",
    "reproducibilityReview",
    "artifactProducerAttestation",
    "downstreamRequired",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(
    template.version === "vanta-private-pool-v2-c01-deterministic-production-artifact-build-template-0.1",
    "template version mismatch",
  );
  assert(template.status === "template-not-production-evidence", "template status mismatch");
  assert(template.selectedBackend === gate.selectedBackend, "template selected backend mismatch");
  assert(template.routeId === gate.routeId, "template route mismatch");
  assert(template.secretPolicy === gate.secretPolicy, "template secret policy mismatch");
  assert(template.sourceLineage?.sourceReviewAcceptanceRef === null, "template source review ref must stay null");
  assert(template.sourceLineage?.frozenSourceCommitRef === null, "template frozen source commit ref must stay null");
  assert(template.sourceLineage?.sourceTreeStatusRef === null, "template source tree status ref must stay null");
  assert(template.sourceLineage?.sourceFreezeReviewRef === null, "template source freeze review ref must stay null");
  assert(template.sourceLineage?.sourceFreezeAccepted === false, "template must not claim source freeze acceptance");
  assert(
    template.sourceLineage?.reviewedSourceMigrationAccepted === false,
    "template must not claim reviewed source migration",
  );
  assert(
    template.sourceLineage?.requiredCurrentSourceAcirRef === currentSourceAcirRef,
    "template source ACIR ref mismatch",
  );
  assert(
    template.sourceLineage?.requiredCurrentSourceAcirSha256 === currentSourceAcirSha256,
    "template source ACIR hash mismatch",
  );
  assert(template.sourceLineage?.candidateSourceRef === candidateSourceRef, "template candidate source ref mismatch");
  assert(
    template.sourceLineage?.candidateSourceSha256 === candidateSourceSha256,
    "template candidate source hash mismatch",
  );
  assert(
    template.sourceLineage?.requiredProductionSourceLineageMode === "reviewed-beta18-h6-source-migration",
    "template production source lineage mode mismatch",
  );
  assert(
    template.sourceLineage?.requiredProductionSourceAcirSha256 === reviewedBeta18H6SourceAcirSha256,
    "template production source ACIR hash mismatch",
  );
  assert(template.sourceLineage?.returnedSourceAcirRef === null, "template returned source ref must stay null");
  assert(template.sourceLineage?.returnedSourceAcirSha256 === null, "template returned source hash must stay null");
  assert(
    template.sourceLineage?.matchesRequiredCurrentSourceAcir === false,
    "template must not claim current source match",
  );
  assert(
    template.sourceLineage?.matchesRequiredProductionSourceLineage === false,
    "template must not claim production source lineage",
  );
  assertNullRefs(template.toolchainAndSetup, "template toolchain and setup", [
    "pinnedToolchainSourceRef",
    "reviewedToolchainBuildRef",
    "trustedSetupOrMitigationRef",
    "buildEnvironmentRef",
    "buildCommandManifestRef",
  ]);
  assert(
    template.toolchainAndSetup?.deterministicRebuildObserved === false,
    "template must not claim deterministic rebuild",
  );
  assert(template.productionOutputs?.proofArtifactRef === null, "template proof ref must stay null");
  assert(template.productionOutputs?.proofFormatId === shape.proofFormatId, "template proof format id mismatch");
  assert(template.productionOutputs?.proofByteLength === shape.proofByteLength, "template proof length mismatch");
  assert(
    template.productionOutputs?.publicWitnessArtifactRef === null,
    "template public witness ref must stay null",
  );
  assert(
    template.productionOutputs?.publicWitnessByteLength === shape.publicWitnessByteLength,
    "template public witness length mismatch",
  );
  assert(
    template.productionOutputs?.verifierInstructionDataByteLength === shape.verifierInstructionDataByteLength,
    "template verifier instruction-data length mismatch",
  );
  assert(
    template.productionOutputs?.generatedVerifierNrPubinputs === shape.generatedVerifierNrPubinputs,
    "template verifier public input count mismatch",
  );
  assert(
    template.productionOutputs?.generatedVerifierCommitmentKeys === shape.generatedVerifierCommitmentKeys,
    "template verifier commitment key count mismatch",
  );
  assert(
    template.productionOutputs?.productionVerifyingKeyArtifactRef === null,
    "template VK ref must stay null",
  );
  assert(template.productionOutputs?.productionVerifyingKeyHash === null, "template VK hash must stay null");
  assert(
    template.productionOutputs?.verifyingKeyHashKind === shape.verifyingKeyHashKind,
    "template VK hash kind mismatch",
  );
  assert(template.productionOutputs?.outputManifestRef === null, "template output manifest ref must stay null");
  assert(
    template.productionOutputs?.satisfiesDeterministicBuildOutputs === false,
    "template must not claim deterministic outputs",
  );
  assert(
    template.publicInputBinding?.publicWitnessArtifactRef === null,
    "template binding public witness ref must stay null",
  );
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
  assertNullRefs(template.reproducibilityReview, "template reproducibility review", [
    "reproducibilityReviewRef",
    "secondBuilderOrVerifierRef",
  ]);
  assert(
    template.reproducibilityReview?.reviewerAcceptedDeterministicBuild === false,
    "template must not claim reviewer accepted build",
  );
  assertNullRefs(template.artifactProducerAttestation, "template artifact producer attestation", [
    "artifactProducerIdentityRef",
    "reviewerIdentityRef",
    "reviewScopeRef",
    "sourceReviewAcceptanceRef",
    "buildCommandManifestRef",
    "outputManifestRef",
  ]);
  assert(
    template.artifactProducerAttestation?.acceptedForC01DeterministicBuild === false,
    "template must not claim C01 deterministic build attestation",
  );
  assertNullRefs(template.downstreamRequired, "template downstream required", [
    "productionBundleRef",
    "adapterAcceptanceRef",
    "sbfLiveLineageRef",
    "auditReviewerAcceptanceRef",
  ]);
  assertEvidenceFlags(
    template.satisfiesRequiredPositiveEvidence,
    {
      sourceReviewAcceptance: false,
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
  includes(template.truthBoundary ?? "", "not production evidence", "template truth boundary");
  includes(template.truthBoundary ?? "", "does not close C01", "template truth boundary");
}

function assertReviewedDeterministicBuildReceipt(receipt, label) {
  assertAllowedKeys(receipt, label, [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "sourceLineage",
    "toolchainAndSetup",
    "productionOutputs",
    "publicInputBinding",
    "reproducibilityReview",
    "artifactProducerAttestation",
    "downstreamRequired",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(
    receipt.version === "vanta-private-pool-v2-c01-deterministic-production-artifact-build-0.1",
    `${label} version mismatch`,
  );
  assert(
    receipt.status === "reviewed-deterministic-production-artifact-build-candidate",
    `${label} status mismatch`,
  );
  assert(receipt.selectedBackend === gate.selectedBackend, `${label} selected backend mismatch`);
  assert(receipt.routeId === gate.routeId, `${label} route mismatch`);
  assert(receipt.secretPolicy === gate.secretPolicy, `${label} secret policy mismatch`);

  const sourceLineage = receipt.sourceLineage ?? {};
  assertRef(sourceLineage.frozenSourceCommitRef, `${label} frozen source commit ref`);
  assertRef(sourceLineage.sourceTreeStatusRef, `${label} source tree status ref`);
  assertRef(sourceLineage.sourceFreezeReviewRef, `${label} source freeze review ref`);
  assert(sourceLineage.sourceFreezeAccepted === true, `${label} source freeze acceptance must be true`);
  assertRef(sourceLineage.sourceReviewAcceptanceRef, `${label} source review acceptance ref`);
  assert(
    sourceLineage.reviewedSourceMigrationAccepted === true,
    `${label} reviewed source migration acceptance must be true`,
  );
  assert(
    sourceLineage.requiredCurrentSourceAcirRef === currentSourceAcirRef,
    `${label} source ACIR ref mismatch`,
  );
  assert(
    sourceLineage.requiredCurrentSourceAcirSha256 === currentSourceAcirSha256,
    `${label} source ACIR hash mismatch`,
  );
  assert(sourceLineage.candidateSourceRef === candidateSourceRef, `${label} candidate source ref mismatch`);
  assert(sourceLineage.candidateSourceSha256 === candidateSourceSha256, `${label} candidate source hash mismatch`);
  assert(
    sourceLineage.requiredProductionSourceLineageMode === "reviewed-beta18-h6-source-migration",
    `${label} production source lineage mode mismatch`,
  );
  assert(
    sourceLineage.requiredProductionSourceAcirSha256 === reviewedBeta18H6SourceAcirSha256,
    `${label} production source ACIR hash mismatch`,
  );
  assertRef(sourceLineage.returnedSourceAcirRef, `${label} returned source ACIR ref`);
  assertSha256(sourceLineage.returnedSourceAcirSha256, `${label} returned source ACIR hash`);
  assert(
    sourceLineage.returnedSourceAcirSha256 === reviewedBeta18H6SourceAcirSha256,
    `${label} returned source ACIR hash must match reviewed beta18 H6 production source ACIR hash`,
  );
  assert(
    sourceLineage.matchesRequiredCurrentSourceAcir === false,
    `${label} beta18 H6 source migration must not claim beta19 current ACIR identity`,
  );
  assert(
    sourceLineage.matchesRequiredProductionSourceLineage === true,
    `${label} must match reviewed beta18 H6 production source lineage`,
  );

  const toolchain = receipt.toolchainAndSetup ?? {};
  for (const field of [
    "pinnedToolchainSourceRef",
    "reviewedToolchainBuildRef",
    "trustedSetupOrMitigationRef",
    "buildEnvironmentRef",
    "buildCommandManifestRef",
  ]) {
    assertRef(toolchain[field], `${label} ${field}`);
  }
  assert(toolchain.deterministicRebuildObserved === true, `${label} deterministic rebuild must be true`);

  const outputs = receipt.productionOutputs ?? {};
  assertRef(outputs.proofArtifactRef, `${label} proof artifact ref`);
  assert(outputs.proofFormatId === shape.proofFormatId, `${label} proof format id mismatch`);
  assert(outputs.proofByteLength === shape.proofByteLength, `${label} proof length mismatch`);
  assertRef(outputs.publicWitnessArtifactRef, `${label} public witness artifact ref`);
  assert(outputs.publicWitnessByteLength === shape.publicWitnessByteLength, `${label} public witness length mismatch`);
  assert(
    outputs.verifierInstructionDataByteLength === shape.verifierInstructionDataByteLength,
    `${label} verifier instruction-data length mismatch`,
  );
  assert(
    outputs.generatedVerifierNrPubinputs === shape.generatedVerifierNrPubinputs,
    `${label} generated verifier public input count mismatch`,
  );
  assert(
    outputs.generatedVerifierCommitmentKeys === shape.generatedVerifierCommitmentKeys,
    `${label} generated verifier commitment key count mismatch`,
  );
  assertRef(outputs.productionVerifyingKeyArtifactRef, `${label} production VK artifact ref`);
  assertSha256(outputs.productionVerifyingKeyHash, `${label} production VK hash`);
  assert(outputs.verifyingKeyHashKind === shape.verifyingKeyHashKind, `${label} VK hash kind mismatch`);
  assertRef(outputs.outputManifestRef, `${label} output manifest ref`);
  assert(outputs.satisfiesDeterministicBuildOutputs === true, `${label} deterministic outputs must be true`);

  const binding = receipt.publicInputBinding ?? {};
  assertRef(binding.publicWitnessArtifactRef, `${label} binding public witness ref`);
  assert(
    binding.publicWitnessArtifactRef === outputs.publicWitnessArtifactRef,
    `${label} binding public witness ref must equal production output public witness ref`,
  );
  assert(binding.decodedPublicInputLabel === shape.publicInputLabel, `${label} public input label mismatch`);
  assert(binding.decodedPublicInputValue === currentH6PublicInputValue, `${label} public input value mismatch`);
  assert(binding.publicInputCommitment === currentH6PublicInputCommitment, `${label} public input commitment mismatch`);
  assert(binding.matchesCurrentH6ProofReceipt === true, `${label} must match current H6 proof receipt`);
  assert(binding.satisfiesProductionPublicInputBinding === true, `${label} public-input binding must be true`);

  const review = receipt.reproducibilityReview ?? {};
  assertRef(review.reproducibilityReviewRef, `${label} reproducibility review ref`);
  assertRef(review.secondBuilderOrVerifierRef, `${label} second builder or verifier ref`);
  assert(review.reviewerAcceptedDeterministicBuild === true, `${label} reviewer accepted build must be true`);

  const attestation = receipt.artifactProducerAttestation ?? {};
  for (const field of [
    "artifactProducerIdentityRef",
    "reviewerIdentityRef",
    "reviewScopeRef",
    "sourceReviewAcceptanceRef",
    "buildCommandManifestRef",
    "outputManifestRef",
  ]) {
    assertRef(attestation[field], `${label} artifactProducerAttestation.${field}`);
  }
  assert(
    attestation.sourceReviewAcceptanceRef === sourceLineage.sourceReviewAcceptanceRef,
    `${label} attestation source review ref must match source lineage ref`,
  );
  assert(
    attestation.buildCommandManifestRef === toolchain.buildCommandManifestRef,
    `${label} attestation build command manifest ref must match toolchain manifest ref`,
  );
  assert(
    attestation.outputManifestRef === outputs.outputManifestRef,
    `${label} attestation output manifest ref must match production output manifest ref`,
  );
  assert(
    attestation.acceptedForC01DeterministicBuild === true,
    `${label} attestation must accept C01 deterministic build`,
  );

  for (const field of [
    "productionBundleRef",
    "adapterAcceptanceRef",
    "sbfLiveLineageRef",
    "auditReviewerAcceptanceRef",
  ]) {
    assertRef(receipt.downstreamRequired?.[field], `${label} downstreamRequired.${field}`);
  }
  assertEvidenceFlags(
    receipt.satisfiesRequiredPositiveEvidence,
    {
      sourceReviewAcceptance: true,
      deterministicArtifactBuild: true,
      actualPrivateSpendProductionProofFormat: true,
      privateSpendPublicInputHashBinding: true,
      productionVerifyingKeyHash: true,
      verifierAdapter: false,
      acceptedProofMutatesStateTest: false,
      invalidProofLeavesAccountsUnchangedTest: false,
      wrongPublicInputHashLeavesAccountsUnchangedTest: false,
      wrongVerifyingKeyLeavesAccountsUnchangedTest: false,
      sbfLiveLineage: false,
      auditReviewerAcceptance: false,
    },
    `${label} evidence flags`,
  );
  includes(receipt.truthBoundary ?? "", "reviewed deterministic production artifact build receipt", `${label} truth boundary`);
  includes(receipt.truthBoundary ?? "", "not verifier-adapter acceptance", `${label} truth boundary`);
  includes(receipt.truthBoundary ?? "", "not C01 closure", `${label} truth boundary`);
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const gateText = read(gatePath);
const gate = JSON.parse(gateText);
const template = readJson(templatePath);
const acquisition = readJson(acquisitionPath);
const productionGate = readJson(productionGatePath);
const sourceReviewAcceptanceGate = readJson(sourceReviewAcceptanceGatePath);
const sourceReview = readJson(sourceReviewPath);
const preflight = readJson(preflightPath);
const route = readJson(routePath);
const publicWitness = readJson(publicWitnessPath);
const bundleTemplate = readJson(bundleTemplatePath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);
const runbook = read(runbookPath);
const review = read(reviewPath);

assert(
  scripts["zk:c01-deterministic-production-artifact-build-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-deterministic-production-artifact-build.mjs",
  "package.json must expose zk:c01-deterministic-production-artifact-build-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-deterministic-production-artifact-build-check"),
    `${aggregate} must include the deterministic production artifact build guard`,
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

assertAllowedKeys(gate, "deterministic build gate", [
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
  "deterministicArtifactBuildReady",
  "secretPolicy",
  "purpose",
  "artifactAcquisitionPacketRef",
  "productionArtifactAcceptanceGateRef",
  "deterministicArtifactBuildTemplateRef",
  "sourceReviewAcceptanceGateRef",
  "sourceReviewCandidateRef",
  "productionGroth16ToolchainPreflightRef",
  "routePacketRef",
  "publicWitnessBindingObservationRef",
  "decisionPacketRef",
  "requiredBuildReceiptShape",
  "currentAcceptedDeterministicBuildReceipt",
  "externalDeterministicBuildReceiptValidation",
  "acceptanceCriteria",
  "promotionRules",
  "satisfiesRequiredPositiveEvidence",
  "remainingBlockers",
  "canonicalCommands",
  "truthBoundary",
]);
assert(
  gate.version === "vanta-private-pool-v2-c01-deterministic-production-artifact-build-gate-0.1",
  "gate version mismatch",
);
assert(gate.status === "blocked-no-deterministic-production-artifact-build-receipt", "gate status mismatch");
assert(gate.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(gate.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(gate.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "deterministicArtifactBuildReady",
]) {
  assert(gate[field] === false, `${field} must remain false`);
}
assert(
  gate.secretPolicy === "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-or-signed-transaction-bytes",
  "secret policy mismatch",
);
for (const [field, expected] of [
  ["artifactAcquisitionPacketRef", acquisitionPath],
  ["productionArtifactAcceptanceGateRef", productionGatePath],
  ["deterministicArtifactBuildTemplateRef", templatePath],
  ["sourceReviewAcceptanceGateRef", sourceReviewAcceptanceGatePath],
  ["sourceReviewCandidateRef", sourceReviewPath],
  ["productionGroth16ToolchainPreflightRef", preflightPath],
  ["routePacketRef", routePath],
  ["publicWitnessBindingObservationRef", publicWitnessPath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(gate[field] === expected, `${field} mismatch`);
}
assert(
  acquisition.deterministicProductionArtifactBuildGateRef === gatePath,
  "artifact acquisition packet must reference deterministic build gate",
);
assert(
  productionGate.deterministicProductionArtifactBuildGateRef === gatePath,
  "production artifact acceptance gate must reference deterministic build gate",
);
assert(
  sourceReviewAcceptanceGate.status === "blocked-no-external-source-review-acceptance",
  "source-review acceptance gate status mismatch",
);
assert(sourceReview.sourceReviewAcceptanceGateRef === sourceReviewAcceptanceGatePath, "source-review candidate ref mismatch");
assert(preflight.sunspotGroth16RouteRef === routePath, "preflight route ref mismatch");
assert(route.artifactAcquisitionPacketRef === acquisitionPath, "route acquisition ref mismatch");

const shape = gate.requiredBuildReceiptShape ?? {};
assertAllowedKeys(shape, "required build receipt shape", [
  "target",
  "tag",
  "circuit",
  "proofSystem",
  "routeId",
  "proofFormatId",
  "proofEncoding",
  "proofByteLength",
  "publicWitnessEncoding",
  "publicWitnessByteLength",
  "verifierInstructionDataByteLength",
  "generatedVerifierNrPubinputs",
  "generatedVerifierCommitmentKeys",
  "publicInputLabel",
  "currentProofReceiptRef",
  "requiredPublicInputValue",
  "requiredPublicInputCommitment",
  "currentSourceAcirRef",
  "currentSourceAcirSha256",
  "candidateSourceRef",
  "candidateSourceSha256",
  "requiredProductionSourceLineageMode",
  "requiredProductionSourceAcirSha256",
  "sourceReviewAcceptanceRequired",
  "sourceReviewAcceptanceGateRef",
  "sourceFreezeRequired",
  "frozenSourceCommitRefShape",
  "toolchainReviewRequired",
  "trustedSetupOrMitigationRequired",
  "deterministicRebuildRequired",
  "outputManifestRequired",
  "verifyingKeyHashKind",
  "status",
]);
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["routeId", gate.routeId],
  ["proofFormatId", "gnark-solana-native-proof-and-public-witness-v0"],
  ["proofEncoding", "gnark WriteRawTo proof"],
  ["proofByteLength", 324],
  ["publicWitnessEncoding", "gnark public witness WriteTo"],
  ["publicWitnessByteLength", 44],
  ["verifierInstructionDataByteLength", 368],
  ["generatedVerifierNrPubinputs", 1],
  ["generatedVerifierCommitmentKeys", 0],
  ["publicInputLabel", "private-spend-public-input-hash"],
  ["currentProofReceiptRef", currentProofReceiptRef],
  ["requiredPublicInputValue", currentH6PublicInputValue],
  ["requiredPublicInputCommitment", currentH6PublicInputCommitment],
  ["currentSourceAcirRef", currentSourceAcirRef],
  ["currentSourceAcirSha256", currentSourceAcirSha256],
  ["candidateSourceRef", candidateSourceRef],
  ["candidateSourceSha256", candidateSourceSha256],
  ["requiredProductionSourceLineageMode", "reviewed-beta18-h6-source-migration"],
  ["requiredProductionSourceAcirSha256", reviewedBeta18H6SourceAcirSha256],
  ["sourceReviewAcceptanceRequired", true],
  ["sourceReviewAcceptanceGateRef", sourceReviewAcceptanceGatePath],
  ["sourceFreezeRequired", true],
  ["frozenSourceCommitRefShape", "git:<reviewed-immutable-production-source-commit-ref>"],
  ["toolchainReviewRequired", true],
  ["trustedSetupOrMitigationRequired", true],
  ["deterministicRebuildRequired", true],
  ["outputManifestRequired", true],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["status", "required-before-production-proof-vk-public-witness-promotion"],
]) {
  assert(shape[field] === expected, `required build receipt shape ${field} mismatch`);
}
assert(publicWitness.localProofReceiptObservation?.publicInputValue === shape.requiredPublicInputValue, "public input value mismatch");
assert(
  publicWitness.localProofReceiptObservation?.publicInputCommitment === shape.requiredPublicInputCommitment,
  "public input commitment mismatch",
);

const accepted = gate.currentAcceptedDeterministicBuildReceipt ?? {};
assertAllowedKeys(accepted, "current accepted deterministic build receipt", [
  "status",
  "buildReceiptRef",
  "frozenSourceCommitRef",
  "sourceTreeStatusRef",
  "sourceFreezeReviewRef",
  "sourceReviewAcceptanceRef",
  "pinnedToolchainSourceRef",
  "reviewedToolchainBuildRef",
  "trustedSetupOrMitigationRef",
  "buildEnvironmentRef",
  "buildCommandManifestRef",
  "outputManifestRef",
  "proofFormatArtifactRef",
  "productionVerifyingKeyArtifactRef",
  "productionVerifyingKeyHash",
  "publicWitnessArtifactRef",
  "reproducibilityReviewRef",
  "artifactProducerAttestationRef",
  "satisfiesDeterministicArtifactBuild",
]);
assert(accepted.status === "absent", "accepted deterministic build receipt must be absent");
assertNullRefs(accepted, "accepted deterministic build receipt", [
  "buildReceiptRef",
  "frozenSourceCommitRef",
  "sourceTreeStatusRef",
  "sourceFreezeReviewRef",
  "sourceReviewAcceptanceRef",
  "pinnedToolchainSourceRef",
  "reviewedToolchainBuildRef",
  "trustedSetupOrMitigationRef",
  "buildEnvironmentRef",
  "buildCommandManifestRef",
  "outputManifestRef",
  "proofFormatArtifactRef",
  "productionVerifyingKeyArtifactRef",
  "productionVerifyingKeyHash",
  "publicWitnessArtifactRef",
  "reproducibilityReviewRef",
  "artifactProducerAttestationRef",
]);
assert(accepted.satisfiesDeterministicArtifactBuild === false, "accepted build receipt must remain false");

const external = gate.externalDeterministicBuildReceiptValidation ?? {};
assertAllowedKeys(external, "external deterministic build validation", [
  "status",
  "envVar",
  "templateRef",
  "command",
  "defaultGuardRequiresExternalReceipt",
  "validatedWhenEnvVarPresent",
  "validates",
  "satisfiesDeterministicArtifactBuild",
  "truthBoundary",
]);
assert(
  external.status === "ready-for-reviewed-refs-only-deterministic-build-validation",
  "external build validation status mismatch",
);
assert(external.envVar === buildReceiptEnvVar, "external build validation env var mismatch");
assert(external.templateRef === templatePath, "external build validation template ref mismatch");
assert(
  external.command ===
    "VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=<reviewed-refs-only-json> npm run zk:c01-deterministic-production-artifact-build-check",
  "external build validation command mismatch",
);
assert(external.defaultGuardRequiresExternalReceipt === false, "external build receipt must be optional by default");
assert(external.validatedWhenEnvVarPresent === true, "external build receipt must validate when env var is present");
assertStringArray(external.validates, "external build validation validates");
for (const marker of [
  "external source-review acceptance ref",
  "reviewed frozen source commit and source tree status refs",
  "pinned reviewed Sunspot/Gnark toolchain source",
  "reviewed reproducible toolchain build",
  "trusted setup or toxic-waste mitigation ref",
  "deterministic build environment and command manifest",
  "reviewed beta18 H6 production source ACIR lineage",
  "Groth16 production proof-format output tuple",
  "production verifying-key artifact and hash kind",
  "current H6 private-spend-public-input-hash binding",
  "artifact producer and reviewer identity/scope attestation",
  "refs-only secret policy",
  "no raw proof/VK/witness/key/secret/transaction material in env-supplied JSON",
  "downstream adapter, live lineage, and audit blockers remain separate",
]) {
  assert(external.validates.includes(marker), `external build validation missing ${marker}`);
}
assert(
  external.satisfiesDeterministicArtifactBuild === false,
  "external build validation must not satisfy acceptance by itself",
);
for (const marker of [
  "deterministic production artifact build receipt intake executable",
  "does not supply a receipt",
  "accepted deterministic build refs null",
]) {
  includes(external.truthBoundary ?? "", marker, "external build validation truth boundary");
}
assertTemplate(template);

const criteria = mapById(gate.acceptanceCriteria, "acceptance criteria");
for (const [id, shapeRef] of [
  ["external-source-review-acceptance", "review:<external-beta18-h6-source-migration-acceptance-ref>"],
  ["frozen-production-source-commit", "git:<reviewed-immutable-production-source-commit-ref>"],
  ["source-freeze-review", "review:<reviewed-source-freeze-acceptance-ref>"],
  ["pinned-reviewed-toolchain-source", "source:<pinned-reviewed-sunspot-gnark-source-or-release-ref>"],
  ["reproducible-toolchain-build-review", "review:<reproducible-toolchain-build-review-ref>"],
  ["trusted-setup-or-toxic-waste-mitigation", "setup:<reviewed-ceremony-or-toxic-waste-mitigation-ref>"],
  ["deterministic-build-environment", "build:<pinned-deterministic-build-environment-ref>"],
  ["deterministic-build-command-manifest", "build:<deterministic-production-artifact-command-manifest-ref>"],
  ["deterministic-output-manifest", "artifact:<deterministic-output-manifest-proof-vk-public-witness-refs>"],
  ["production-proof-format-artifact", "artifact:<actual-private-spend-production-groth16-proof-format-ref>"],
  ["production-verifying-key-artifact-and-hash", "artifact+sha256:<actual-private-spend-production-vk-ref-and-hash>"],
  ["public-witness-current-h6-binding", "artifact:<public-witness-values-ref-bound-to-current-h6-private-spend-public-input-hash>"],
  ["deterministic-build-reproducibility-review", "review:<deterministic-production-artifact-build-reproducibility-review-ref>"],
  ["artifact-producer-review-attestation", "review:<artifact-producer-and-reviewer-identity-scope-attestation-ref>"],
]) {
  const criterion = criteria.get(id);
  assert(criterion, `missing criterion ${id}`);
  assert(criterion.requiredRefShape === shapeRef, `${id} requiredRefShape mismatch`);
  assert(criterion.currentRef === null, `${id} currentRef must stay null`);
  assert(criterion.satisfiesC01PositiveEvidence === false, `${id} must not satisfy C01 evidence`);
}

assertStringArray(gate.promotionRules, "promotionRules");
for (const rule of [
  "deterministic build receipt refs must be references only; raw proof, verifying-key, proving-key, witness, keypair, secret, and signed transaction bytes stay out of git",
  "the production verifier lane must freeze a reviewed immutable source commit and source tree status before deterministic artifact refs can promote",
  "source-review acceptance is required before a beta18 H6 source-migration build receipt can promote source lineage",
  "production setup or equivalent toxic-waste mitigation must be reviewed before proof/VK output refs can promote",
  "deterministic build output refs must agree on circuit, reviewed beta18 H6 production source ACIR hash, proof format id, proof byte length, public-witness byte length, generated verifier public input count, and public input label",
  "the public-witness output must decode one private-spend-public-input-hash equal to the current H6 proof receipt public input and commitment",
  "deterministic build receipts must include artifact producer identity, reviewer identity, review scope, and cross-refs to the source acceptance, build manifest, and output manifest",
  "deterministic artifact build evidence does not by itself accept the verifier adapter, mutation/no-mutation tests, SBF/live lineage, or audit/reviewer acceptance",
]) {
  assert(gate.promotionRules.includes(rule), `missing promotion rule ${rule}`);
}
assertEvidenceFlags(
  gate.satisfiesRequiredPositiveEvidence,
  {
    backendSelection: true,
    sourceReviewAcceptance: false,
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
assertStringArray(gate.remainingBlockers, "remainingBlockers");
for (const blocker of [
  "no external source reviewer acceptance",
  "no reviewed frozen source commit",
  "no reviewed compatible Sunspot/Noir/Gnark toolchain provenance",
  "no production setup or toxic-waste mitigation",
  "no deterministic reviewed production artifact build receipt",
  "no reviewed production artifact bundle accepted",
  "no production verifier adapter acceptance",
  "no production valid mutation or invalid/wrong-input/wrong-key no-mutation evidence",
  "no rebuilt/redeployed/reinitialized/live SBF lineage",
  "no audit/reviewer acceptance",
]) {
  assert(gate.remainingBlockers.includes(blocker), `missing blocker ${blocker}`);
}
assertStringArray(gate.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-deterministic-production-artifact-build-check",
  "VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=<reviewed-refs-only-json> npm run zk:c01-deterministic-production-artifact-build-check",
  "npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
]) {
  assert(gate.canonicalCommands.includes(command), `missing canonical command ${command}`);
}
for (const marker of [
  "blocked deterministic production artifact build gate",
  "not a receipt",
  "not production artifact bundle acceptance",
  "not production verifier-adapter acceptance",
  "not C01 closure",
]) {
  includes(gate.truthBoundary ?? "", marker, "gate truth boundary");
}

assert(bundleTemplate.satisfiesRequiredPositiveEvidence?.deterministicArtifactBuild === false, "bundle template deterministic build flag mismatch");
assert(
  bundleTemplate.deterministicArtifactBuild?.deterministicArtifactBuildGateRef === gatePath,
  "production bundle template must reference deterministic build gate",
);

for (const marker of [
  "C01 deterministic production artifact build gate",
  gatePath,
  templatePath,
  "npm run zk:c01-deterministic-production-artifact-build-check",
  "VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=<reviewed-refs-only-json>",
  "blocked-no-deterministic-production-artifact-build-receipt",
  "not verifier-adapter acceptance",
]) {
  includes(decision, marker, decisionPath);
  includes(auditPackage, marker, auditPackagePath);
  includes(runbook, marker, runbookPath);
  includes(review, marker, reviewPath);
}

const externalBuildReceiptPath = process.env[buildReceiptEnvVar];
if (externalBuildReceiptPath) {
  const externalBuildReceipt = readJsonPath(externalBuildReceiptPath, "external deterministic build receipt");
  assertReviewedDeterministicBuildReceipt(externalBuildReceipt, "external deterministic build receipt");
}

console.log("private-pool-v2 C01 deterministic production artifact build gate: PASS");

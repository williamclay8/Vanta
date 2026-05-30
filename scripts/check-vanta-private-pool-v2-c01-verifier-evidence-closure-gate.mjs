import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const gatePath = "ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const productionGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const deterministicBuildGatePath =
  "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json";
const outputManifestPreflightPath =
  "ops/mainnet/private-pool-v2-c01-production-output-manifest-preflight.evidence.json";
const adapterGatePath = "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json";
const lineageGatePath = "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json";
const auditGatePath = "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json";
const positiveClaimGatePath = "ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const runbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";

const envVars = {
  productionArtifactBundle: "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH",
  verifierAdapterAcceptance: "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH",
  sbfLiveLineageAcceptance: "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH",
  auditReviewerAcceptance: "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH",
};

function fail(message) {
  console.error(`private-pool-v2 C01 verifier evidence closure gate: FAIL - ${message}`);
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

function assertRef(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty ref`);
  assert(value === value.trim(), `${label} must not have surrounding whitespace`);
  assert(!value.includes("://"), `${label} must be a refs-only local/review handle, not a URL`);
  assert(!value.includes("-----BEGIN"), `${label} must not contain key material`);
}

function assertDistinctRefs(value, label, fields) {
  const seen = new Map();
  for (const field of fields) {
    const ref = value[field];
    assertRef(ref, `${label}.${field}`);
    const normalizedRef = ref.trim();
    assert(!seen.has(normalizedRef), `${label}.${field} must be distinct from ${label}.${seen.get(normalizedRef)}`);
    seen.set(normalizedRef, field);
  }
}

function assertSha256(value, label) {
  assert(typeof value === "string", `${label} must be a sha256 string`);
  assert(/^sha256:[0-9a-f]{64}$/u.test(value), `${label} must be sha256:<64 lowercase hex>`);
}

function assertNullRefs(value, label, fields) {
  for (const field of fields) {
    assert(value[field] === null, `${label}.${field} must stay null`);
  }
}

function assertEvidenceFlags(value, expected, label) {
  assertAllowedKeys(value, label, Object.keys(expected));
  for (const [field, expectedValue] of Object.entries(expected)) {
    assert(value[field] === expectedValue, `${label}.${field} mismatch`);
  }
}

function assertSame(a, b, label) {
  assert(a === b, `${label} mismatch`);
}

function assertExternalHeader(packet, version, status, secretPolicy, label) {
  assert(packet.version === version, `${label} version mismatch`);
  assert(packet.status === status, `${label} status mismatch`);
  assert(packet.selectedBackend === gate.selectedBackend, `${label} selected backend mismatch`);
  assert(packet.routeId === gate.routeId, `${label} route mismatch`);
  assert(packet.secretPolicy === secretPolicy, `${label} secret policy mismatch`);
}

function assertReviewedClosure(bundle, adapter, lineage, audit) {
  assertExternalHeader(
    bundle,
    "vanta-private-pool-v2-c01-production-artifact-bundle-0.1",
    "reviewed-production-artifact-bundle-candidate",
    "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-or-signed-transaction-bytes",
    "production artifact bundle",
  );
  assertExternalHeader(
    adapter,
    "vanta-private-pool-v2-c01-verifier-adapter-acceptance-0.1",
    "reviewed-verifier-adapter-acceptance-candidate",
    "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-or-signed-transaction-bytes",
    "verifier-adapter acceptance",
  );
  assertExternalHeader(
    lineage,
    "vanta-private-pool-v2-c01-sbf-live-lineage-acceptance-0.1",
    "reviewed-sbf-live-lineage-acceptance-candidate",
    "refs-only-no-keypairs-secrets-signed-transactions-or-live-private-data",
    "SBF/live lineage acceptance",
  );
  assertExternalHeader(
    audit,
    "vanta-private-pool-v2-c01-audit-reviewer-acceptance-0.1",
    "reviewed-audit-reviewer-acceptance-candidate",
    "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-or-signed-transaction-bytes",
    "audit/reviewer acceptance",
  );

  const shape = gate.requiredClosureShape;
  const proof = bundle.proofFormat ?? {};
  for (const [field, expected] of [
    ["target", shape.target],
    ["tag", shape.tag],
    ["circuit", shape.circuit],
    ["proofSystem", shape.proofSystem],
    ["proofFormatId", shape.proofFormatId],
    ["proofByteLength", shape.proofByteLength],
    ["publicWitnessByteLength", shape.publicWitnessByteLength],
    ["verifierInstructionDataByteLength", shape.verifierInstructionDataByteLength],
    ["generatedVerifierNrPubinputs", shape.generatedVerifierNrPubinputs],
    ["generatedVerifierCommitmentKeys", shape.generatedVerifierCommitmentKeys],
  ]) {
    assert(proof[field] === expected, `production bundle proofFormat.${field} mismatch`);
  }
  assertRef(proof.proofArtifactRef, "production bundle proof artifact ref");
  assert(proof.satisfiesProductionProofFormatEvidence === true, "production proof-format evidence must be true");

  const sourceLineage = bundle.sourceLineage ?? {};
  assertRef(sourceLineage.frozenSourceCommitRef, "production bundle frozen source commit ref");
  assertRef(sourceLineage.sourceTreeStatusRef, "production bundle source tree status ref");
  assertRef(sourceLineage.sourceFreezeReviewRef, "production bundle source freeze review ref");
  assert(sourceLineage.sourceFreezeAccepted === true, "production bundle source freeze acceptance must be true");
  assert(
    sourceLineage.requiredCurrentSourceAcirSha256 === shape.referenceCurrentSourceAcirSha256,
    "current-source ACIR requirement mismatch",
  );
  assert(
    sourceLineage.requiredProductionSourceLineageMode === shape.productionSourceLineageMode,
    "production source lineage mode mismatch",
  );
  assert(
    sourceLineage.requiredProductionSourceAcirSha256 === shape.sourceAcirSha256,
    "production source ACIR requirement mismatch",
  );
  assertRef(sourceLineage.sourceReviewAcceptanceRef, "production bundle source-review acceptance ref");
  assert(sourceLineage.returnedSourceAcirSha256 === shape.sourceAcirSha256, "returned source ACIR mismatch");
  assert(sourceLineage.reviewedSourceMigrationAccepted === true, "source migration must be accepted");
  assert(
    sourceLineage.matchesRequiredCurrentSourceAcir === false,
    "reviewed beta18 H6 source migration must not claim beta19 current ACIR identity",
  );
  assert(
    sourceLineage.matchesRequiredProductionSourceLineage === true,
    "source ACIR must match reviewed beta18 H6 production source lineage",
  );

  const bundleBuild = bundle.deterministicArtifactBuild ?? {};
  assertRef(bundleBuild.buildReceiptRef, "production bundle deterministic build receipt ref");
  assert(
    bundleBuild.deterministicArtifactBuildGateRef === deterministicBuildGatePath,
    "production bundle deterministic build gate ref mismatch",
  );
  assert(
    bundleBuild.outputManifestPreflightGateRef === outputManifestPreflightPath,
    "production bundle output manifest preflight gate ref mismatch",
  );
  for (const field of [
    "pinnedToolchainSourceRef",
    "reviewedToolchainBuildRef",
    "trustedSetupOrMitigationRef",
    "outputManifestRef",
    "reproducibilityReviewRef",
  ]) {
    assertRef(bundleBuild[field], `production bundle deterministic build ${field}`);
  }
  assert(
    bundleBuild.satisfiesDeterministicArtifactBuild === true,
    "production bundle deterministic artifact build must be true",
  );

  const vk = bundle.verifyingKey ?? {};
  assertRef(vk.productionVerifyingKeyArtifactRef, "production bundle VK artifact ref");
  assertSha256(vk.productionVerifyingKeyHash, "production bundle VK hash");
  assert(vk.verifyingKeyHashKind === shape.verifyingKeyHashKind, "production bundle VK kind mismatch");
  assert(vk.satisfiesProductionVerifyingKeyEvidence === true, "production VK evidence must be true");

  const binding = bundle.publicInputBinding ?? {};
  assertRef(binding.publicWitnessArtifactRef, "production bundle public witness artifact ref");
  assert(binding.decodedPublicInputLabel === shape.publicInputLabel, "production bundle public input label mismatch");
  assert(binding.decodedPublicInputValue === shape.requiredPublicInputValue, "production bundle public input mismatch");
  assert(
    binding.publicInputCommitment === shape.requiredPublicInputCommitment,
    "production bundle public input commitment mismatch",
  );
  assert(binding.matchesCurrentH6ProofReceipt === true, "production bundle must bind current H6 receipt");
  assert(binding.satisfiesProductionPublicInputBinding === true, "production public-input binding must be true");

  const adapterPrereq = adapter.prerequisites ?? {};
  assertSame(adapterPrereq.productionProofFormatArtifactRef, proof.proofArtifactRef, "adapter proof artifact ref");
  assertSame(adapterPrereq.productionVerifyingKeyArtifactRef, vk.productionVerifyingKeyArtifactRef, "adapter VK ref");
  assertSame(adapterPrereq.productionVerifyingKeyHash, vk.productionVerifyingKeyHash, "adapter VK hash");
  assertSame(adapterPrereq.publicWitnessArtifactRef, binding.publicWitnessArtifactRef, "adapter public witness ref");
  assertSame(adapterPrereq.proofFormatId, shape.proofFormatId, "adapter proof format");
  assertSame(adapterPrereq.proofByteLength, shape.proofByteLength, "adapter proof byte length");
  assertSame(adapterPrereq.publicWitnessByteLength, shape.publicWitnessByteLength, "adapter public witness length");
  assertSame(
    adapterPrereq.verifierInstructionDataByteLength,
    shape.verifierInstructionDataByteLength,
    "adapter verifier instruction length",
  );

  const adapterBinding = adapter.publicInputBinding ?? {};
  assertSame(adapterBinding.publicWitnessArtifactRef, binding.publicWitnessArtifactRef, "adapter binding witness ref");
  assertSame(adapterBinding.decodedPublicInputLabel, shape.publicInputLabel, "adapter public input label");
  assertSame(adapterBinding.decodedPublicInputValue, shape.requiredPublicInputValue, "adapter public input");
  assertSame(
    adapterBinding.publicInputCommitment,
    shape.requiredPublicInputCommitment,
    "adapter public input commitment",
  );
  assert(adapterBinding.matchesCurrentH6ProofReceipt === true, "adapter must bind current H6 receipt");
  assert(
    adapterBinding.satisfiesProductionPublicInputBinding === true,
    "adapter public-input binding must satisfy production binding",
  );

  const bundleAdapter = bundle.adapterAcceptance ?? {};
  const adapterAcceptance = adapter.adapterAcceptance ?? {};
  assertRef(adapterAcceptance.verifierAdapterAcceptanceRef, "adapter acceptance ref");
  assertSame(
    bundleAdapter.verifierAdapterAcceptanceRef,
    adapterAcceptance.verifierAdapterAcceptanceRef,
    "bundle/adapter acceptance ref",
  );
  assertSame(bundleAdapter.verifierAdapterOrProgramRef, adapterAcceptance.verifierAdapterOrProgramRef, "adapter program ref");
  assertSame(bundleAdapter.acceptedVerifierBoundary, adapterAcceptance.acceptedVerifierBoundary, "accepted boundary ref");
  assert(adapterAcceptance.adapterKind === shape.adapterKind, "adapter kind mismatch");
  assert(adapterAcceptance.satisfiesVerifierAdapterAcceptance === true, "adapter acceptance must be true");
  assert(bundleAdapter.satisfiesVerifierAdapterAcceptance === true, "bundle adapter acceptance must be true");

  const bundleMutation = bundle.mutationEvidence ?? {};
  const adapterMutation = adapter.mutationEvidence ?? {};
  const mutationRefFields = [
    "validProofMutationTestRef",
    "invalidProofNoMutationTestRef",
    "wrongPublicInputNoMutationTestRef",
    "wrongVerifyingKeyNoMutationTestRef",
    "wrongVerifierProgramNoMutationTestRef",
  ];
  assertDistinctRefs(bundleMutation, "bundle mutation", mutationRefFields);
  for (const field of mutationRefFields) {
    assertRef(bundleMutation[field], `bundle mutation ${field}`);
    assertSame(adapterMutation[field], bundleMutation[field], `adapter mutation ${field}`);
  }
  for (const field of [
    "validProofMutatesState",
    "invalidProofLeavesAccountsUnchanged",
    "wrongPublicInputLeavesAccountsUnchanged",
    "wrongVerifyingKeyLeavesAccountsUnchanged",
    "wrongVerifierProgramLeavesAccountsUnchanged",
  ]) {
    assert(bundleMutation[field] === true, `bundle mutation ${field} must be true`);
    assert(adapterMutation[field] === true, `adapter mutation ${field} must be true`);
  }

  const lineagePrereq = lineage.prerequisites ?? {};
  const auditPrereq = audit.prerequisites ?? {};
  for (const [field, expected] of [
    ["productionProofFormatArtifactRef", proof.proofArtifactRef],
    ["productionVerifyingKeyArtifactRef", vk.productionVerifyingKeyArtifactRef],
    ["productionVerifyingKeyHash", vk.productionVerifyingKeyHash],
    ["verifyingKeyHashKind", shape.verifyingKeyHashKind],
    ["currentH6PublicInputBindingRef", binding.publicWitnessArtifactRef],
    ["verifierAdapterAcceptanceRef", adapterAcceptance.verifierAdapterAcceptanceRef],
  ]) {
    assertSame(lineagePrereq[field], expected, `lineage prerequisite ${field}`);
    assertSame(auditPrereq[field], expected, `audit prerequisite ${field}`);
  }

  const productionBundleRef = adapter.downstreamRequired?.productionBundleRef;
  assertRef(productionBundleRef, "adapter downstream production bundle ref");
  assertSame(lineagePrereq.productionArtifactBundleRef, productionBundleRef, "lineage production bundle ref");
  assertSame(auditPrereq.productionArtifactBundleRef, productionBundleRef, "audit production bundle ref");

  assertDistinctRefs(auditPrereq, "audit prerequisite", mutationRefFields);
  for (const field of mutationRefFields) {
    assertSame(auditPrereq[field], bundleMutation[field], `audit prerequisite ${field}`);
  }

  const bundleLineage = bundle.sbfLiveLineage ?? {};
  const lineageProgram = lineage.programLineage ?? {};
  const lineageLive = lineage.liveEvidence ?? {};
  const lineageAcceptance = lineage.lineageAcceptance ?? {};
  assert(lineageProgram.sourceAcirSha256 === shape.sourceAcirSha256, "lineage source ACIR mismatch");
  assert(lineageProgram.verifierProgramKind === shape.verifierProgramKind, "lineage verifier program kind mismatch");
  assertSha256(bundleLineage.rebuiltSpendSbfSha256, "bundle rebuilt spend SBF hash");
  assertSha256(bundleLineage.acceptedVerifierSbfSha256, "bundle accepted verifier SBF hash");
  assertSame(lineageProgram.spendProgramSbfHash, bundleLineage.rebuiltSpendSbfSha256, "lineage spend SBF hash");
  assertSame(lineageProgram.acceptedVerifierProgramSbfHash, bundleLineage.acceptedVerifierSbfSha256, "lineage verifier SBF hash");
  assertSame(lineageProgram.spendProgramId, bundleLineage.deployedSpendProgramId, "lineage spend program id");
  assertSame(lineageProgram.verifierProgramId, bundleLineage.deployedVerifierProgramId, "lineage verifier program id");
  assertSha256(lineageProgram.acceptedVerifierProgramSbfHash, "lineage deployed verifier SBF hash");
  assertSame(
    lineageLive.verifierKeyRegistrationRef,
    bundleLineage.tag5ProductionVerifierKeyRegistrationRef,
    "lineage verifier-key registration ref",
  );
  assertSame(
    lineageProgram.verifierKeyRecordRef,
    bundleLineage.verifierKeyRecordBindingRef,
    "lineage verifier-key record binding ref",
  );
  assertSame(
    lineageLive.verifierProgramUpgradeAuthorityStatusRef,
    bundleLineage.verifierProgramUpgradeAuthorityStatusRef,
    "lineage verifier program upgrade-authority status ref",
  );
  assertSame(
    lineageLive.poolReinitializationOrMigrationRef,
    bundleLineage.reinitializationOrMigrationReceiptRef,
    "lineage reinitialization/migration ref",
  );
  assert(
    lineageLive.liveProofEnforcedSpendRef === bundleLineage.liveProofEnforcedTag3ReceiptRef ||
      lineageLive.reviewerAcceptedDryRunRef === bundleLineage.liveProofEnforcedTag3ReceiptRef,
    "lineage live or reviewer dry-run receipt must match bundle tag-3 receipt ref",
  );
  assert(lineageLive.sameSourceVkAdapterLineage === true, "lineage must bind same source/VK/adapter lineage");
  assert(lineageProgram.verifierKeyRecordBindsProductionVkHash === true, "lineage must bind production VK hash");
  assert(lineageProgram.verifierKeyRecordBindsVerifierProgramId === true, "lineage must bind verifier program id");
  assert(lineageAcceptance.acceptedForC01 === true, "lineage must be accepted for C01");
  assert(lineageAcceptance.satisfiesSbfLiveLineage === true, "lineage acceptance must satisfy SBF/live lineage");
  assertSame(bundleLineage.sbfLiveLineageRef, lineageAcceptance.sbfLiveLineageRef, "bundle/lineage ref");
  assertSame(adapter.downstreamRequired?.sbfLiveLineageRef, bundleLineage.sbfLiveLineageRef, "adapter downstream lineage ref");
  assertSame(auditPrereq.sbfLiveLineageRef, bundleLineage.sbfLiveLineageRef, "audit lineage ref");

  const bundleAudit = bundle.auditReviewerAcceptance ?? {};
  const auditReview = audit.auditReview ?? {};
  assertSame(bundleAudit.auditReviewerAcceptanceRef, auditReview.auditReviewerAcceptanceRef, "audit acceptance ref");
  assertSame(adapter.downstreamRequired?.auditReviewerAcceptanceRef, auditReview.auditReviewerAcceptanceRef, "adapter audit ref");
  assert(auditReview.reviewerAccepted === true, "audit reviewerAccepted must be true");
  assert(auditReview.acceptedForC01 === true, "audit acceptedForC01 must be true");
  assert(auditReview.satisfiesAuditReviewerAcceptance === true, "audit acceptance must satisfy audit/reviewer acceptance");

  const bundleReview = bundle.artifactReviewAttestation ?? {};
  for (const field of [
    "artifactProducerIdentityRef",
    "reviewerIdentityRef",
    "reviewScopeRef",
    "productionArtifactBundleReviewRef",
    "deterministicBuildReceiptRef",
    "verifierAdapterAcceptanceRef",
    "sbfLiveLineageRef",
    "auditReviewerAcceptanceRef",
  ]) {
    assertRef(bundleReview[field], `bundle artifact review ${field}`);
  }
  assertSame(bundleReview.deterministicBuildReceiptRef, bundleBuild.buildReceiptRef, "bundle review build receipt ref");
  assertSame(
    bundleReview.verifierAdapterAcceptanceRef,
    adapterAcceptance.verifierAdapterAcceptanceRef,
    "bundle review adapter acceptance ref",
  );
  assertSame(bundleReview.sbfLiveLineageRef, bundleLineage.sbfLiveLineageRef, "bundle review lineage ref");
  assertSame(
    bundleReview.auditReviewerAcceptanceRef,
    auditReview.auditReviewerAcceptanceRef,
    "bundle review audit acceptance ref",
  );
  assert(bundleReview.acceptedForC01ProductionBundle === true, "bundle review must accept C01 production bundle");

  const adapterReview = adapter.acceptanceReviewAttestation ?? {};
  for (const field of [
    "reviewerIdentityRef",
    "reviewScopeRef",
    "verifierAdapterAcceptanceRef",
    "deterministicArtifactBuildRef",
    "productionVerifyingKeyArtifactRef",
  ]) {
    assertRef(adapterReview[field], `adapter review ${field}`);
  }
  assertSame(
    adapterReview.verifierAdapterAcceptanceRef,
    adapterAcceptance.verifierAdapterAcceptanceRef,
    "adapter review acceptance ref",
  );
  assertSame(
    adapterReview.deterministicArtifactBuildRef,
    adapterPrereq.deterministicArtifactBuildRef,
    "adapter review build ref",
  );
  assertSame(
    adapterReview.productionVerifyingKeyArtifactRef,
    adapterPrereq.productionVerifyingKeyArtifactRef,
    "adapter review VK ref",
  );
  assert(adapterReview.acceptedForC01VerifierAdapter === true, "adapter review must accept C01 verifier adapter");

  assertEvidenceFlags(bundle.satisfiesRequiredPositiveEvidence, fullPositiveFlags, "bundle positive evidence flags");
  assertEvidenceFlags(
    adapter.satisfiesRequiredPositiveEvidence,
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
      wrongVerifierProgramLeavesAccountsUnchangedTest: true,
      sbfLiveLineage: false,
      auditReviewerAcceptance: false,
    },
    "adapter positive evidence flags",
  );
  assertEvidenceFlags(
    lineage.satisfiesRequiredPositiveEvidence,
    {
      productionArtifactAcceptance: true,
      actualPrivateSpendProductionProofFormat: true,
      privateSpendPublicInputHashBinding: true,
      productionVerifyingKeyHash: true,
      verifierAdapter: true,
      acceptedProofMutatesStateTest: true,
      invalidProofLeavesAccountsUnchangedTest: true,
      wrongPublicInputHashLeavesAccountsUnchangedTest: true,
      wrongVerifyingKeyLeavesAccountsUnchangedTest: true,
      wrongVerifierProgramLeavesAccountsUnchangedTest: true,
      sbfLiveLineage: true,
      auditReviewerAcceptance: false,
    },
    "lineage positive evidence flags",
  );
  assertEvidenceFlags(
    audit.satisfiesRequiredPositiveEvidence,
    {
      productionArtifactAcceptance: true,
      actualPrivateSpendProductionProofFormat: true,
      privateSpendPublicInputHashBinding: true,
      productionVerifyingKeyHash: true,
      verifierAdapter: true,
      acceptedProofMutatesStateTest: true,
      invalidProofLeavesAccountsUnchangedTest: true,
      wrongPublicInputHashLeavesAccountsUnchangedTest: true,
      wrongVerifyingKeyLeavesAccountsUnchangedTest: true,
      wrongVerifierProgramLeavesAccountsUnchangedTest: true,
      sbfLiveLineage: true,
      auditReviewerAcceptance: true,
    },
    "audit positive evidence flags",
  );
}

const fullPositiveFlags = {
  sourceReviewAcceptance: true,
  deterministicArtifactBuild: true,
  productionArtifactAcceptance: true,
  actualPrivateSpendProductionProofFormat: true,
  privateSpendPublicInputHashBinding: true,
  productionVerifyingKeyHash: true,
  verifierAdapter: true,
  acceptedProofMutatesStateTest: true,
  invalidProofLeavesAccountsUnchangedTest: true,
  wrongPublicInputHashLeavesAccountsUnchangedTest: true,
  wrongVerifyingKeyLeavesAccountsUnchangedTest: true,
  wrongVerifierProgramLeavesAccountsUnchangedTest: true,
  sbfLiveLineage: true,
  auditReviewerAcceptance: true,
};

const gateText = read(gatePath);
const gate = JSON.parse(gateText);
const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const candidate = readJson(candidatePath);
const productionGate = readJson(productionGatePath);
const adapterGate = readJson(adapterGatePath);
const lineageGate = readJson(lineageGatePath);
const auditGate = readJson(auditGatePath);
const positiveClaimGate = readJson(positiveClaimGatePath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);
const runbook = read(runbookPath);
const review = read(reviewPath);

assert(
  scripts["zk:c01-verifier-evidence-closure-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-evidence-closure-gate.mjs",
  "package.json must expose zk:c01-verifier-evidence-closure-gate-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-evidence-closure-gate-check"),
    `${aggregate} must include the C01 verifier evidence closure gate`,
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

assertAllowedKeys(gate, "C01 verifier evidence closure gate", [
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
  "proofVerifiedClaimAllowed",
  "secretPolicy",
  "purpose",
  "candidatePacketRef",
  "productionArtifactAcceptanceGateRef",
  "verifierAdapterAcceptanceGateRef",
  "sbfLiveLineageAcceptanceGateRef",
  "auditReviewerAcceptanceGateRef",
  "positiveProofVerifiedClaimGateRef",
  "decisionPacketRef",
  "requiredClosureShape",
  "currentAcceptedClosureEvidence",
  "externalClosureValidation",
  "crossPacketInvariants",
  "satisfiesRequiredPositiveEvidence",
  "remainingBlockers",
  "operatorSkippedBlockers",
  "canonicalCommands",
  "truthBoundary",
]);
assert(gate.version === "vanta-private-pool-v2-c01-verifier-evidence-closure-gate-0.1", "gate version mismatch");
assert(gate.status === "blocked-no-complete-c01-verifier-evidence-chain", "gate status mismatch");
assert(gate.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(gate.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(gate.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "proofVerifiedClaimAllowed",
]) {
  assert(gate[field] === false, `${field} must remain false`);
}
for (const [field, expected] of [
  ["candidatePacketRef", candidatePath],
  ["productionArtifactAcceptanceGateRef", productionGatePath],
  ["verifierAdapterAcceptanceGateRef", adapterGatePath],
  ["sbfLiveLineageAcceptanceGateRef", lineageGatePath],
  ["auditReviewerAcceptanceGateRef", auditGatePath],
  ["positiveProofVerifiedClaimGateRef", positiveClaimGatePath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(gate[field] === expected, `${field} mismatch`);
}
assert(candidate.status === "blocked-selected-groth16-tag3-solana-v0-production-evidence", "candidate status mismatch");
assert(productionGate.status === "blocked-no-reviewed-production-artifact-bundle", "production gate status mismatch");
assert(adapterGate.status === "blocked-no-production-verifier-adapter-acceptance", "adapter gate status mismatch");
assert(lineageGate.status === "blocked-no-sbf-live-lineage-acceptance", "lineage gate status mismatch");
assert(auditGate.status === "operator-skipped-control", "audit gate status mismatch");
assert(positiveClaimGate.status === "blocked-no-tag3-valid-proof-success", "positive claim gate status mismatch");

const shape = gate.requiredClosureShape ?? {};
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
  ["requiredPublicInputValue", "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b"],
  ["requiredPublicInputCommitment", "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2"],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["referenceCurrentSourceAcirSha256", "sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9"],
  ["productionSourceLineageMode", "reviewed-beta18-h6-source-migration"],
  ["sourceAcirSha256", "sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde"],
  ["sourceFreezeRequired", true],
  ["frozenSourceCommitRefShape", "git:<reviewed-immutable-production-source-commit-ref>"],
  ["deterministicArtifactBuildGateRef", deterministicBuildGatePath],
  ["productionOutputManifestPreflightGateRef", outputManifestPreflightPath],
  ["adapterKind", "in-program-verifier-or-dedicated-verifier-cpi"],
  ["verifierProgramKind", "dedicated-verifier-cpi-or-reviewed-in-program-verifier"],
  ["status", "required-before-c01-verifier-evidence-closure"],
]) {
  assert(shape[field] === expected, `required closure shape ${field} mismatch`);
}

const current = gate.currentAcceptedClosureEvidence ?? {};
assert(current.status === "absent", "current closure evidence must be absent");
assertNullRefs(current, "current closure evidence", [
  "productionArtifactBundleRef",
  "verifierAdapterAcceptanceRef",
  "sbfLiveLineageRef",
  "auditReviewerAcceptanceRef",
  "productionProofFormatArtifactRef",
  "frozenSourceCommitRef",
  "productionVerifyingKeyArtifactRef",
  "productionVerifyingKeyHash",
  "currentH6PublicInputBindingRef",
  "validProofMutationTestRef",
  "invalidProofNoMutationTestRef",
  "wrongPublicInputNoMutationTestRef",
  "wrongVerifyingKeyNoMutationTestRef",
  "wrongVerifierProgramNoMutationTestRef",
  "deployedVerifierProgramId",
  "deployedVerifierProgramSbfHash",
  "verifierProgramUpgradeAuthorityStatusRef",
  "tag5VerifierKeyRecordBindingRef",
]);
assert(current.satisfiesC01VerifierEvidenceClosure === false, "current closure must remain false");

const external = gate.externalClosureValidation ?? {};
assert(
  external.status === "ready-for-reviewed-refs-only-c01-verifier-evidence-chain-validation",
  "external closure status mismatch",
);
for (const [field, expected] of Object.entries(envVars)) {
  assert(external.envVars?.[field] === expected, `external env var ${field} mismatch`);
}
includes(external.command ?? "", "npm run zk:c01-verifier-evidence-closure-gate-check", "external closure command");
assert(external.defaultGuardRequiresExternalEvidence === false, "external closure must be optional by default");
assert(external.requiresAllEnvVarsWhenAnyEnvVarPresent === true, "external closure must require all env vars together");
assertStringArray(external.validates, "external closure validates");
for (const marker of [
  "same selected backend and route across all reviewed packets",
  "source-review acceptance and deterministic build/output-manifest prerequisite refs are present in the reviewed production bundle",
  "reviewed frozen source commit and source tree status refs are present in the reviewed production bundle",
  "same production verifying-key artifact and production verifying-key hash",
  "adapter public-input label/value/commitment and production binding flag match the production bundle",
  "same deployed verifier program id/hash and verifier-key record binding across production bundle and SBF/live lineage acceptance",
  "same verifier program upgrade-authority status ref across production bundle and SBF/live lineage acceptance",
  "same valid mutation and invalid/wrong-input/wrong-key/wrong-program no-mutation refs",
  "five trim-normalized distinct mutation/no-mutation evidence refs",
  "same SBF/live lineage ref",
  "same audit/reviewer acceptance ref",
  "no raw proof/VK/witness/key/secret/transaction material in env-supplied JSON",
]) {
  assert(external.validates.includes(marker), `external closure validates missing ${marker}`);
}
assert(external.satisfiesC01VerifierEvidenceClosure === false, "external closure must not satisfy by itself");
assertStringArray(gate.crossPacketInvariants, "crossPacketInvariants");
for (const invariant of [
  "closure must reject a production bundle that sets positive flags without a reviewed frozen source commit and source freeze review refs",
  "deployed verifier program id and accepted/deployed verifier SBF hash must match across production bundle and SBF/live lineage acceptance",
  "verifier program upgrade-authority status ref must match across production bundle and SBF/live lineage acceptance",
  "verifier-key record binding must bind the production VK hash to the accepted deployed verifier program id",
  "valid mutation and invalid/wrong-input/wrong-key/wrong-program no-mutation evidence refs must be distinct across the closure chain",
]) {
  assert(gate.crossPacketInvariants.includes(invariant), `cross-packet invariant missing ${invariant}`);
}
assertStringArray(gate.remainingBlockers, "remainingBlockers");
for (const blocker of [
  "no reviewed frozen source commit",
  "no deployed verifier program id/hash",
  "no verifier program upgrade-authority status ref",
  "no verifier-key record binding production VK hash to verifier program id",
]) {
  assert(gate.remainingBlockers.includes(blocker), `remaining blocker missing ${blocker}`);
}
assert(
  !gate.remainingBlockers.includes("no reviewed audit/reviewer acceptance"),
  "audit wait must be operator-skipped",
);
assert(
  !gate.remainingBlockers.includes("no external source-review acceptance"),
  "Reilabs/external producer wait must be operator-skipped",
);
assert(
  Array.isArray(gate.operatorSkippedBlockers) && gate.operatorSkippedBlockers.length >= 2,
  "operatorSkippedBlockers must record declined external producer and audit waits",
);
assertStringArray(gate.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-verifier-evidence-closure-gate-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "npm run zk:c01-audit-reviewer-acceptance-gate-check",
]) {
  assert(gate.canonicalCommands.includes(command), `canonical command missing ${command}`);
}
assertEvidenceFlags(
  gate.satisfiesRequiredPositiveEvidence,
  {
    backendSelection: true,
    sourceReviewAcceptance: false,
    deterministicArtifactBuild: false,
    productionArtifactAcceptance: false,
    actualPrivateSpendProductionProofFormat: false,
    privateSpendPublicInputHashBinding: false,
    productionVerifyingKeyHash: false,
    verifierAdapter: false,
    acceptedProofMutatesStateTest: false,
    invalidProofLeavesAccountsUnchangedTest: false,
    wrongPublicInputHashLeavesAccountsUnchangedTest: false,
    wrongVerifyingKeyLeavesAccountsUnchangedTest: false,
    wrongVerifierProgramLeavesAccountsUnchangedTest: false,
    sbfLiveLineage: false,
    auditReviewerAcceptance: false,
    c01VerifierEvidenceClosure: false,
  },
  "gate evidence flags",
);

for (const marker of [
  "C01 verifier evidence closure gate",
  gatePath,
  "blocked-no-complete-c01-verifier-evidence-chain",
  "npm run zk:c01-verifier-evidence-closure-gate-check",
  "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-bundle-json>",
  "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-adapter-json>",
  "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-lineage-json>",
  "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-audit-json>",
  "source-review acceptance and deterministic build/output-manifest prerequisite refs",
  "reviewed frozen source commit",
  "adapter public-input binding flag",
  "trim-normalized distinct mutation/no-mutation refs",
]) {
  includes(decision, marker, decisionPath);
  includes(auditPackage, marker, auditPackagePath);
  includes(runbook, marker, runbookPath);
  includes(review, marker, reviewPath);
}
for (const marker of [
  "not production proof-format evidence",
  "not production verifying-key evidence",
  "not verifier-adapter acceptance",
  "not SBF/live lineage",
  "not audit/reviewer acceptance",
  "not C01 closure",
]) {
  includes(gate.truthBoundary ?? "", marker, "gate truth boundary");
}

const provided = Object.values(envVars).filter((envVar) => process.env[envVar]);
if (provided.length > 0) {
  assert(provided.length === Object.keys(envVars).length, "all C01 closure env vars must be supplied together");
  const bundle = readJsonPath(process.env[envVars.productionArtifactBundle], "production artifact bundle");
  const adapter = readJsonPath(process.env[envVars.verifierAdapterAcceptance], "verifier-adapter acceptance");
  const lineage = readJsonPath(process.env[envVars.sbfLiveLineageAcceptance], "SBF/live lineage acceptance");
  const audit = readJsonPath(process.env[envVars.auditReviewerAcceptance], "audit/reviewer acceptance");
  assertReviewedClosure(bundle, adapter, lineage, audit);
}

console.log("private-pool-v2 C01 verifier evidence closure gate: PASS");

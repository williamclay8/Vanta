import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const handoffPath = "ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const sourceReviewPath = "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json";
const outputManifestPreflightPath =
  "ops/mainnet/private-pool-v2-c01-production-output-manifest-preflight.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const runbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const ledgerPath = "VANTA_ZK_REVIEW.findings.json";

const currentH6PublicInputValue =
  "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b";
const currentH6PublicInputCommitment =
  "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2";
const currentSourceAcirSha256 = "sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9";
const reviewedBeta18H6SourceAcirSha256 =
  "sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fail(message) {
  console.error(`private-pool-v2 C01 production verifier artifact request: FAIL - ${message}`);
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

function assertStringArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  for (const [index, entry] of value.entries()) {
    assert(typeof entry === "string", `${label}[${index}] must be a string`);
  }
}

function assertRepoLocalPathShape(path, label) {
  assert(typeof path === "string" && path.length > 0, `${label} must be a non-empty path`);
  assert(!path.includes("://"), `${label} must be repo-local, not a URL`);
  assert(!path.startsWith("../") && !path.includes("/../"), `${label} must stay inside repo`);
}

function assertRefPath(path, label) {
  assertRepoLocalPathShape(path, label);
  assert(existsSync(resolve(repoRoot, path)), `${label} missing referenced file ${path}`);
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

const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const acquisition = readJson(acquisitionPath);
const handoff = readJson(handoffPath);
const candidate = readJson(candidatePath);
const sourceReview = readJson(sourceReviewPath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);
const runbook = read(runbookPath);
const review = read(reviewPath);
const ledger = readJson(ledgerPath);
const c01 = ledger.findings.find((finding) => finding.id === "VANTA-ZK-2026-05-09-C01");

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
  assert(!packetText.includes(forbidden), `request packet must not contain forbidden marker ${forbidden}`);
}

assert(packet.version === "vanta-private-pool-v2-c01-production-verifier-artifact-request-0.1", "version mismatch");
assert(packet.status === "operator-skipped-external-artifact-producer", "status mismatch");
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(packet.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "productionArtifactsReady",
  "verifierAdapterReady",
  "sbfLiveLineageReady",
  "auditReviewerAccepted",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(
  packet.secretPolicy ===
    "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-live-private-data-or-signed-transaction-bytes",
  "secret policy mismatch",
);

for (const [field, expected] of [
  ["artifactAcquisitionPacketRef", acquisitionPath],
  ["externalReviewHandoffRef", handoffPath],
  ["candidatePacketRef", candidatePath],
  ["sourceReviewPacketRef", sourceReviewPath],
  ["sourceReviewAcceptanceGateRef", "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json"],
  ["productionOutputManifestPreflightRef", outputManifestPreflightPath],
  [
    "deterministicProductionArtifactBuildGateRef",
    "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json",
  ],
  ["productionArtifactAcceptanceGateRef", "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json"],
  ["verifierAdapterAcceptanceGateRef", "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json"],
  ["sbfLiveLineageAcceptanceGateRef", "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json"],
  ["auditReviewerAcceptanceGateRef", "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json"],
  ["closureGateRef", "ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json"],
]) {
  assert(packet[field] === expected, `${field} mismatch`);
  assertRefPath(expected, field);
}

assert(acquisition.productionVerifierArtifactRequestRef === packetPath, "artifact acquisition must reference request packet");
assert(handoff.productionVerifierArtifactRequestRef === packetPath, "external handoff must reference request packet");
const requestRef = candidate.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "production-verifier-artifact-request",
);
assert(requestRef?.artifactRef === packetPath, "candidate packet must reference request packet");
assert(
  requestRef?.command === "npm run zk:c01-production-verifier-artifact-request-check",
  "candidate packet must record request guard",
);
includes(requestRef?.truthBoundary ?? "", "not production proof-format evidence", "candidate request truth boundary");

const shape = packet.currentRequiredShape ?? {};
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["proofFormatId", "gnark-solana-native-proof-and-public-witness-v0"],
  ["proofByteLength", 324],
  ["publicWitnessByteLength", 44],
  ["verifierInstructionDataByteLength", 368],
  ["publicInputLabel", "private-spend-public-input-hash"],
  ["requiredPublicInputValue", currentH6PublicInputValue],
  ["requiredPublicInputCommitment", currentH6PublicInputCommitment],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["referenceCurrentSourceAcirSha256", currentSourceAcirSha256],
  ["productionSourceLineageMode", "reviewed-beta18-h6-source-migration"],
  ["sourceAcirSha256", reviewedBeta18H6SourceAcirSha256],
]) {
  assert(shape[field] === expected, `currentRequiredShape.${field} mismatch`);
}

const sourceInputs = packet.sourceReviewInputs ?? {};
for (const [packetField, sourceReviewField] of [
  ["currentSourceRef", "sourceRef"],
  ["currentSourceSha256", "sourceSha256"],
  ["currentProverRef", "proverRef"],
  ["currentProverSha256", "proverSha256"],
  ["currentCompiledAcirRef", "compiledAcirRef"],
  ["currentCompiledAcirSha256", "compiledAcirSha256"],
]) {
  assert(
    sourceInputs[packetField] === sourceReview.currentSource?.[sourceReviewField],
    `sourceReviewInputs.${packetField} mismatch`,
  );
}
assert(sourceInputs.currentH6ProofReceiptPublicInput === currentH6PublicInputValue, "current H6 public input mismatch");
assert(
  sourceInputs.currentH6ProofReceiptPublicInputCommitment === currentH6PublicInputCommitment,
  "current H6 public input commitment mismatch",
);
for (const [packetField, sourceReviewField] of [
  ["candidateSourceRef", "sourceRef"],
  ["candidateSourceSha256", "sourceSha256"],
  ["candidateNargoRef", "nargoRef"],
  ["candidateProverRef", "proverRef"],
  ["candidateReadmeRef", "readmeRef"],
  ["compatibilityDelta", "compatibilityDelta"],
  ["normalizedSourceMatchesCurrent", "normalizedSourceMatchesCurrent"],
  ["proverMatchesCurrent", "proverMatchesCurrent"],
  ["h6ContextPreimageInputsPresent", "h6ContextPreimageInputsPresent"],
  ["h6Poseidon6ContextAssertionPresent", "h6Poseidon6ContextAssertionPresent"],
  ["satisfiesReviewedSourceMigration", "satisfiesReviewedSourceMigration"],
  ["satisfiesProductionSourceLineage", "satisfiesProductionSourceLineage"],
]) {
  assert(
    sourceInputs[packetField] === sourceReview.candidateSource?.[sourceReviewField],
    `sourceReviewInputs.${packetField} mismatch`,
  );
}

for (const ref of [
  sourceInputs.currentSourceRef,
  sourceInputs.currentProverRef,
  sourceInputs.currentCompiledAcirRef,
  sourceInputs.candidateSourceRef,
  sourceInputs.candidateNargoRef,
  sourceInputs.candidateProverRef,
  sourceInputs.candidateReadmeRef,
]) {
  assertRefPath(ref, `source review input ${ref}`);
}

const buildInputs = packet.artifactBuildInputs ?? {};
for (const [field, expected] of [
  ["sourceReviewAcceptanceTemplateRef", "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance.template.json"],
  ["productionOutputManifestPreflightRef", outputManifestPreflightPath],
  ["deterministicBuildTemplateRef", "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json"],
  ["productionArtifactBundleTemplateRef", "ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json"],
  ["verifierAdapterAcceptanceTemplateRef", "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json"],
  ["sbfLiveLineageAcceptanceTemplateRef", "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json"],
  ["auditReviewerAcceptanceTemplateRef", "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json"],
  ["requiredNargoVersion", "1.0.0-beta.18"],
  ["selectedProofFormatId", "gnark-solana-native-proof-and-public-witness-v0"],
  ["requiresReviewedSunspotGnarkSource", true],
  ["requiresReviewedToolchainBuild", true],
  ["requiresTrustedSetupOrMitigation", true],
  ["requiresCurrentH6PublicInputBinding", true],
  ["requiresDeployedVerifierProgramIdAndHash", true],
  ["requiresVerifierProgramUpgradeAuthorityStatus", true],
  ["requiresVerifierKeyRecordBinding", true],
  ["requiresRefsOnlyReturnedEvidence", true],
]) {
  assert(buildInputs[field] === expected, `artifactBuildInputs.${field} mismatch`);
  if (typeof expected === "string" && expected.startsWith("ops/")) {
    assertRefPath(expected, `artifactBuildInputs.${field}`);
  }
}

const laneFreeze = packet.laneFreezeRequirements ?? {};
for (const [field, expected] of [
  ["status", "blocked-no-reviewed-frozen-source-commit"],
  ["requiredFrozenSourceCommitRefShape", "git:<reviewed-immutable-production-source-commit-ref>"],
  ["requiredSourceTreeStatusRefShape", "review:<clean-source-tree-or-reviewed-diff-status-ref>"],
  ["requiredSourceFreezeReviewRefShape", "review:<reviewed-source-freeze-acceptance-ref>"],
  ["requiresFrozenSourceCommit", true],
  ["requiresSourceTreeStatus", true],
  ["requiresSourceFreezeReview", true],
  ["requiresCircuitSourceAndAcirHashes", true],
  ["requiresPublicInputLayoutFreeze", true],
  ["requiresProofTupleFreeze", true],
  ["requiresProductionVerifyingKeyHash", true],
  ["currentFrozenSourceCommitRef", null],
  ["currentSourceTreeStatusRef", null],
  ["currentSourceFreezeReviewRef", null],
  ["satisfiesLaneFreeze", false],
]) {
  assert(laneFreeze[field] === expected, `laneFreezeRequirements.${field} mismatch`);
}

const precursor = packet.reviewerLocalPrecursorRefs ?? {};
for (const [field, expected] of [
  ["status", "comparison-only-reviewer-starting-point"],
  ["repoRemote", "https://github.com/williamclay8/Vanta.git"],
  ["branch", "main"],
  ["reviewStartCommitRef", "git:c2a0e693fbb1975244dc42f57cb561c17bc6d574"],
  ["treeStatusAtCollection", "clean"],
  ["selectedBackend", packet.selectedBackend],
  ["routeId", packet.routeId],
  ["currentSourceRef", sourceInputs.currentSourceRef],
  ["currentSourceSha256", sourceInputs.currentSourceSha256],
  ["currentProverRef", sourceInputs.currentProverRef],
  ["currentProverSha256", sourceInputs.currentProverSha256],
  ["currentCompiledAcirRef", sourceInputs.currentCompiledAcirRef],
  ["currentCompiledAcirSha256", sourceInputs.currentCompiledAcirSha256],
  ["candidateSourceRef", sourceInputs.candidateSourceRef],
  ["candidateSourceSha256", sourceInputs.candidateSourceSha256],
  ["currentH6ProofReceiptPublicInput", currentH6PublicInputValue],
  ["currentH6ProofReceiptPublicInputCommitment", currentH6PublicInputCommitment],
  ["localSpendSbfRef", "programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so"],
  ["localSpendSbfSha256", "sha256:a30be245fa0b00ea703f077b2f67463132556a3ee20a6efe9364297f7b08e9ad"],
  ["localSpendSbfIsIgnoredBuildArtifact", true],
  ["satisfiesLaneFreeze", false],
  ["satisfiesC01PositiveEvidence", false],
]) {
  assert(precursor[field] === expected, `reviewerLocalPrecursorRefs.${field} mismatch`);
}
for (const ref of [
  precursor.currentSourceRef,
  precursor.currentProverRef,
  precursor.currentCompiledAcirRef,
  precursor.candidateSourceRef,
  precursor.localSpendSbfRef,
]) {
  assertRepoLocalPathShape(ref, `reviewerLocalPrecursorRefs local ref ${ref}`);
}
assertStringArray(precursor.requiredExternalFreezeRefs, "reviewerLocalPrecursorRefs.requiredExternalFreezeRefs");
for (const expected of [
  "git:<reviewed-immutable-production-source-commit-ref>",
  "review:<clean-source-tree-or-reviewed-diff-status-ref>",
  "review:<reviewed-source-freeze-acceptance-ref>",
]) {
  assert(
    precursor.requiredExternalFreezeRefs.includes(expected),
    `reviewerLocalPrecursorRefs.requiredExternalFreezeRefs missing ${expected}`,
  );
}
for (const marker of [
  "reviewer starting point only",
  "not reviewed frozen source",
  "not production proof/VK/public-witness evidence",
  "not verifier-adapter acceptance",
  "not deployed verifier evidence",
  "not SBF/live lineage",
  "not audit/reviewer acceptance",
  "not C01 closure",
]) {
  includes(precursor.truthBoundary ?? "", marker, "reviewerLocalPrecursorRefs truth boundary");
}

const outputs = mapById(packet.requiredProductionOutputs, "requiredProductionOutputs");
for (const [id, shape] of [
  ["frozen-source-commit", "git:<reviewed-immutable-production-source-commit-ref>"],
  ["source-freeze-review", "review:<reviewed-source-freeze-acceptance-ref>"],
  ["source-review-acceptance", "review:<external-beta18-h6-source-migration-acceptance-ref>"],
  ["deterministic-production-artifact-build-receipt", "build:<reviewed-deterministic-production-artifact-build-receipt-ref>"],
  ["production-output-manifest-preflight", "manifest:<refs-only-production-output-manifest-preflight-ref>"],
  [
    "deterministic-build-artifact-producer-attestation",
    "review:<artifact-producer-and-reviewer-identity-scope-attestation-ref>",
  ],
  ["production-artifact-bundle", "bundle:<reviewed-production-proof-vk-public-witness-adapter-test-lineage-audit-refs>"],
  ["production-artifact-bundle-review-attestation", "review:<production-artifact-bundle-reviewer-attestation-ref>"],
  ["production-proof-format-artifact", "artifact:<actual-private-spend-groth16-proof-format-ref>"],
  ["production-verifying-key-artifact", "artifact:<actual-private-spend-production-vk-ref>"],
  ["production-verifying-key-hash", "sha256:<production-verifying-key-hash>"],
  ["current-h6-public-witness-artifact", "artifact:<current-h6-public-witness-values-ref-no-private-witness>"],
  ["verifier-adapter-acceptance", "adapter:<accepted-solana-groth16-verifier-adapter-or-program-ref>"],
  ["verifier-adapter-review-attestation", "review:<verifier-adapter-reviewer-identity-scope-attestation-ref>"],
  ["deployed-verifier-program-id", "program:<deployed-verifier-program-id>"],
  ["deployed-verifier-program-sbf-hash", "sha256:<deployed-verifier-program-sbf-hash>"],
  ["verifier-program-upgrade-authority-status", "authority:<deployed-verifier-program-upgrade-authority-status-ref>"],
  [
    "tag5-verifier-key-record-binding",
    "record:<tag5-verifier-key-record-binds-production-vk-hash-and-verifier-program-id-ref>",
  ],
  ["valid-proof-mutation-test", "test:<valid-proof-mutates-nullifier-output-state-ref>"],
  ["invalid-proof-no-mutation-test", "test:<invalid-proof-leaves-account-bytes-unchanged-ref>"],
  ["wrong-public-input-no-mutation-test", "test:<wrong-public-input-hash-leaves-account-bytes-unchanged-ref>"],
  ["wrong-verifying-key-no-mutation-test", "test:<wrong-verifying-key-leaves-account-bytes-unchanged-ref>"],
  ["wrong-verifier-program-no-mutation-test", "test:<wrong-verifier-program-leaves-account-bytes-unchanged-ref>"],
  ["sbf-live-lineage-acceptance", "lineage:<rebuilt-redeployed-reinitialized-sbf-and-live-or-reviewer-dry-run-ref>"],
  ["audit-reviewer-acceptance", "audit-or-review:<selected-verifier-backend-accepted-for-c01-ref>"],
]) {
  const output = outputs.get(id);
  assert(output, `missing required output ${id}`);
  assert(output.requiredRefShape === shape, `${id} requiredRefShape mismatch`);
  assert(output.currentRef === null, `${id} currentRef must remain null`);
  assert(output.satisfiesC01PositiveEvidence === false, `${id} must not satisfy positive evidence`);
}

const expectedLocalAuditContextRefs = [
  ["production-privacy-audit-source", "PRODUCTION_PRIVACY_AUDIT.md", "npm run privacy-audit:tracker-check"],
  ["prior-audit-context", "AUDIT_2026-05-19.md", "npm run truth:privacy-claim-gate"],
  ["security-limitations-context", "SECURITY_LIMITATIONS.md", "npm run truth:privacy-claim-gate"],
  ["zk-findings-ledger-c01-source-refs", "VANTA_ZK_REVIEW.findings.json", "npm run zk:review-findings-ledger-check"],
];
const localAuditContextRefs = mapById(packet.localAuditContextRefs, "localAuditContextRefs");
for (const [id, ref, command] of expectedLocalAuditContextRefs) {
  const entry = localAuditContextRefs.get(id);
  assert(entry, `missing local audit context ref ${id}`);
  assert(entry.ref === ref, `${id} ref mismatch`);
  assertRefPath(entry.ref, `${id} ref`);
  assert(entry.command === command, `${id} command mismatch`);
  includes(entry.truthBoundary, "not", `${id} truth boundary`);
  includes(entry.truthBoundary, "not C01 closure", `${id} truth boundary`);
}

const comparisonOnlyLocalEvidence = mapById(packet.comparisonOnlyLocalEvidence, "comparisonOnlyLocalEvidence");
for (const [id, ref, command] of [
  ["h6-beta18-migration-probe", "ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json", "npm run zk:c01-beta18-h6-migration-probe-check"],
  ["h6-source-migration-review-candidate", "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json", "npm run zk:c01-beta18-h6-source-migration-review-check"],
  ["local-unsafe-generated-verifier-cpi", "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json", "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check"],
  ["fresh-local-sbf-abi", "programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so", "npm run private-pool-v2:sbf-abi-check"],
  ...expectedLocalAuditContextRefs,
]) {
  const entry = comparisonOnlyLocalEvidence.get(id);
  assert(entry, `missing comparison-only local evidence ${id}`);
  assert(entry.ref === ref, `${id} comparison ref mismatch`);
  if (id === "fresh-local-sbf-abi") {
    assertRepoLocalPathShape(entry.ref, `${id} comparison ref`);
    assert(entry.refIsIgnoredBuildArtifact === true, `${id} must mark the SBF ref as an ignored build artifact`);
    assert(entry.cleanCiMayMissRef === true, `${id} must mark clean CI as allowed to miss the local SBF ref`);
    includes(entry.truthBoundary, "ignored local build artifact", `${id} comparison truth boundary`);
  } else {
    assertRefPath(entry.ref, `${id} comparison ref`);
  }
  assert(entry.command === command, `${id} comparison command mismatch`);
  includes(entry.truthBoundary, "not", `${id} comparison truth boundary`);
}

const refAcquisitionPlan = mapById(packet.refAcquisitionPlan, "refAcquisitionPlan");
const expectedRefAcquisitionPlanIds = [
  "lane-freeze-and-source-review",
  "deterministic-build-and-output-manifest",
  "production-proof-vk-public-witness-bundle",
  "verifier-adapter-and-mutation-matrix",
  "deployed-verifier-and-tag5-binding",
  "sbf-live-lineage",
  "audit-reviewer-acceptance",
];
assert(refAcquisitionPlan.size === expectedRefAcquisitionPlanIds.length, "refAcquisitionPlan length mismatch");
const plannedOutputIds = new Set();
for (const id of expectedRefAcquisitionPlanIds) {
  const entry = refAcquisitionPlan.get(id);
  assert(entry, `missing ref acquisition plan ${id}`);
  assert(entry.status === "external-ref-required", `${id} status mismatch`);
  assert(typeof entry.externalProducer === "string" && entry.externalProducer.length > 0, `${id} producer missing`);
  assertStringArray(entry.requiredOutputIds, `${id}.requiredOutputIds`);
  assertStringArray(entry.localSourceRefs, `${id}.localSourceRefs`);
  assertStringArray(entry.fillTargets, `${id}.fillTargets`);
  for (const outputId of entry.requiredOutputIds) {
    assert(outputs.has(outputId), `${id} references unknown required output ${outputId}`);
    assert(!plannedOutputIds.has(outputId), `${outputId} appears in multiple ref acquisition plans`);
    plannedOutputIds.add(outputId);
  }
  for (const ref of entry.localSourceRefs) {
    assertRefPath(ref, `${id}.localSourceRefs ${ref}`);
  }
  for (const ref of entry.fillTargets) {
    assertRefPath(ref, `${id}.fillTargets ${ref}`);
  }
  assert(typeof entry.howToGet === "string" && entry.howToGet.length > 0, `${id} howToGet missing`);
  includes(entry.truthBoundary, "not", `${id} truth boundary`);
}
for (const outputId of outputs.keys()) {
  assert(plannedOutputIds.has(outputId), `required output ${outputId} missing from refAcquisitionPlan`);
}

const commands = mapById(packet.validationCommands, "validationCommands");
for (const [id, command] of [
  ["request-packet", "npm run zk:c01-production-verifier-artifact-request-check"],
  [
    "source-review-acceptance",
    "VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
  ],
  [
    "deterministic-production-artifact-build",
    "VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=<reviewed-refs-only-json> npm run zk:c01-deterministic-production-artifact-build-check",
  ],
  [
    "production-output-manifest-preflight",
    "VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_ROOT=<returned-artifact-dir> npm run zk:c01-production-output-manifest-check",
  ],
  [
    "production-artifact-bundle",
    "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-refs-only-json> npm run zk:c01-production-artifact-acceptance-gate-check",
  ],
  [
    "verifier-adapter-acceptance",
    "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-verifier-adapter-acceptance-gate-check",
  ],
  [
    "sbf-live-lineage-acceptance",
    "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  ],
  [
    "audit-reviewer-acceptance",
    "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-audit-reviewer-acceptance-gate-check",
  ],
  [
    "composite-evidence-closure",
    "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-bundle-json> VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-adapter-json> VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-lineage-json> VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-audit-json> npm run zk:c01-verifier-evidence-closure-gate-check",
  ],
]) {
  assert(commands.get(id)?.command === command, `${id} validation command mismatch`);
}

const expectedPromotionOrder = [
  "source-review-acceptance",
  "production-output-manifest-preflight",
  "deterministic-production-artifact-build",
  "production-artifact-bundle",
  "verifier-adapter-acceptance",
  "sbf-live-lineage-acceptance",
  "audit-reviewer-acceptance",
  "composite-evidence-closure",
];
assert(
  JSON.stringify(packet.promotionOrder) === JSON.stringify(expectedPromotionOrder),
  "promotionOrder mismatch",
);

assertStringArray(packet.forbiddenPacketContents, "forbiddenPacketContents");
for (const marker of [
  "raw proof bytes",
  "raw verifying-key bytes",
  "raw witness bytes",
  "private keys",
  "signed transaction bytes",
  "provider credentials",
]) {
  assert(packet.forbiddenPacketContents.includes(marker), `forbidden packet marker missing ${marker}`);
}
assertStringArray(packet.remainingBlockers, "remainingBlockers");
for (const blocker of [
  "no reviewed frozen source commit",
  "no source freeze review acceptance",
  "no reviewed production output manifest",
  "no deterministic reviewed production artifact build receipt",
  "no reviewed production artifact bundle",
  "no production verifier-adapter acceptance",
  "no production valid mutation or invalid/wrong-input/wrong-key/wrong-program no-mutation refs",
  "no deployed verifier program id/hash",
  "no verifier program upgrade-authority status ref",
  "no tag-5 verifier-key record binding production VK hash to verifier program id",
  "no SBF/live lineage acceptance",
  "no composite C01 verifier evidence closure validation",
]) {
  assert(packet.remainingBlockers.includes(blocker), `remaining blocker missing ${blocker}`);
}
assert(
  !packet.remainingBlockers.includes("no external source-review acceptance"),
  "Reilabs/external producer wait must be operator-skipped",
);
assert(
  !packet.remainingBlockers.includes("no audit/reviewer acceptance"),
  "audit wait must be operator-skipped",
);
assert(
  Array.isArray(packet.operatorSkippedBlockers) && packet.operatorSkippedBlockers.length >= 2,
  "operatorSkippedBlockers must record declined external producer and audit waits",
);
assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-production-verifier-artifact-request-check",
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "npm run zk:c01-external-review-handoff-check",
  "npm run zk:c01-production-output-manifest-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "npm run zk:c01-audit-reviewer-acceptance-gate-check",
  "npm run zk:c01-verifier-evidence-closure-gate-check",
]) {
  assert(packet.canonicalCommands.includes(command), `canonical command missing ${command}`);
}

for (const marker of [
  "refs-only outbound production verifier artifact request packet",
  "not production proof-format evidence",
  "not production verifying-key evidence",
  "not verifier-adapter acceptance",
  "not valid mutation evidence",
  "not invalid/wrong-input/wrong-key/wrong-program no-mutation evidence",
  "not SBF/live lineage",
  "not audit/reviewer acceptance",
  "not C01 closure",
]) {
  includes(packet.truthBoundary, marker, "request packet truth boundary");
}

assert(
  scripts["zk:c01-production-verifier-artifact-request-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-verifier-artifact-request.mjs",
  "package.json must expose zk:c01-production-verifier-artifact-request-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  includes(
    scripts[aggregate] ?? "",
    "npm run zk:c01-production-verifier-artifact-request-check",
    `${aggregate} script`,
  );
}

for (const marker of [
  "C01 production verifier artifact request packet",
  packetPath,
  "operator-skipped-external-artifact-producer",
  "npm run zk:c01-production-verifier-artifact-request-check",
  "artifact producer",
  "frozen source commit",
  "production proof-format/VK/public-witness",
  "npm run zk:c01-production-output-manifest-check",
  "verifier-adapter acceptance",
  "verifier program upgrade-authority status",
  "mutation/no-mutation",
  "SBF/live lineage",
  "audit/reviewer acceptance",
]) {
  includes(decision, marker, decisionPath);
  includes(auditPackage, marker, auditPackagePath);
  includes(runbook, marker, runbookPath);
  includes(review, marker, reviewPath);
}

assert(c01, "missing C01 finding");
for (const ref of [
  packetPath,
  "npm run zk:c01-production-verifier-artifact-request-check",
]) {
  assert(c01.evidenceRefs.includes(ref), `C01 evidenceRefs missing ${ref}`);
  assert(c01.staleControl.watchFiles.includes(packetPath), `C01 watchFiles missing ${packetPath}`);
  assert(
    c01.staleControl.watchCommands.includes("npm run zk:c01-production-verifier-artifact-request-check"),
    "C01 watchCommands missing request guard",
  );
}
for (const marker of [
  "C01 production verifier artifact request packet",
  "operator-skipped-external-artifact-producer",
  "production proof-format/VK/public-witness",
  "not production proof-format evidence",
]) {
  includes(JSON.stringify(c01), marker, "C01 ledger entry");
}

console.log("private-pool-v2 C01 production verifier artifact request: PASS");

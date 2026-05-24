import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const handoffPath = "ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const sourceReviewPath = "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json";
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

function assertRefPath(path, label) {
  assert(typeof path === "string" && path.length > 0, `${label} must be a non-empty path`);
  assert(!path.includes("://"), `${label} must be repo-local, not a URL`);
  assert(!path.startsWith("../") && !path.includes("/../"), `${label} must stay inside repo`);
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
assert(packet.status === "ready-for-external-production-verifier-artifact-request-blocked", "status mismatch");
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
  ["sourceAcirSha256", currentSourceAcirSha256],
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
  ["requiresRefsOnlyReturnedEvidence", true],
]) {
  assert(buildInputs[field] === expected, `artifactBuildInputs.${field} mismatch`);
  if (typeof expected === "string" && expected.startsWith("ops/")) {
    assertRefPath(expected, `artifactBuildInputs.${field}`);
  }
}

const outputs = mapById(packet.requiredProductionOutputs, "requiredProductionOutputs");
for (const [id, shape] of [
  ["source-review-acceptance", "review:<external-beta18-h6-source-migration-acceptance-ref>"],
  ["deterministic-production-artifact-build-receipt", "build:<reviewed-deterministic-production-artifact-build-receipt-ref>"],
  ["production-artifact-bundle", "bundle:<reviewed-production-proof-vk-public-witness-adapter-test-lineage-audit-refs>"],
  ["production-proof-format-artifact", "artifact:<actual-private-spend-groth16-proof-format-ref>"],
  ["production-verifying-key-artifact", "artifact:<actual-private-spend-production-vk-ref>"],
  ["production-verifying-key-hash", "sha256:<production-verifying-key-hash>"],
  ["current-h6-public-witness-artifact", "artifact:<current-h6-public-witness-values-ref-no-private-witness>"],
  ["verifier-adapter-acceptance", "adapter:<accepted-solana-groth16-verifier-adapter-or-program-ref>"],
  ["valid-proof-mutation-test", "test:<valid-proof-mutates-nullifier-output-state-ref>"],
  ["invalid-proof-no-mutation-test", "test:<invalid-proof-leaves-account-bytes-unchanged-ref>"],
  ["wrong-public-input-no-mutation-test", "test:<wrong-public-input-hash-leaves-account-bytes-unchanged-ref>"],
  ["wrong-verifying-key-no-mutation-test", "test:<wrong-verifying-key-leaves-account-bytes-unchanged-ref>"],
  ["sbf-live-lineage-acceptance", "lineage:<rebuilt-redeployed-reinitialized-sbf-and-live-or-reviewer-dry-run-ref>"],
  ["audit-reviewer-acceptance", "audit-or-review:<selected-verifier-backend-accepted-for-c01-ref>"],
]) {
  const output = outputs.get(id);
  assert(output, `missing required output ${id}`);
  assert(output.requiredRefShape === shape, `${id} requiredRefShape mismatch`);
  assert(output.currentRef === null, `${id} currentRef must remain null`);
  assert(output.satisfiesC01PositiveEvidence === false, `${id} must not satisfy positive evidence`);
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
  "no external source-review acceptance",
  "no deterministic reviewed production artifact build receipt",
  "no reviewed production artifact bundle",
  "no production verifier-adapter acceptance",
  "no production valid mutation or invalid/wrong-input/wrong-key no-mutation refs",
  "no SBF/live lineage acceptance",
  "no audit/reviewer acceptance",
  "no composite C01 verifier evidence closure validation",
]) {
  assert(packet.remainingBlockers.includes(blocker), `remaining blocker missing ${blocker}`);
}
assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-production-verifier-artifact-request-check",
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "npm run zk:c01-external-review-handoff-check",
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
  "not invalid/wrong-input/wrong-key no-mutation evidence",
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
  "ready-for-external-production-verifier-artifact-request-blocked",
  "npm run zk:c01-production-verifier-artifact-request-check",
  "artifact producer",
  "production proof-format/VK/public-witness",
  "verifier-adapter acceptance",
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
  "ready-for-external-production-verifier-artifact-request-blocked",
  "production proof-format/VK/public-witness",
  "not production proof-format evidence",
]) {
  includes(JSON.stringify(c01), marker, "C01 ledger entry");
}

console.log("private-pool-v2 C01 production verifier artifact request: PASS");

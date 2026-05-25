import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const runbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const artifactRequestPath =
  "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json";
const humanHandoffPath = "ops/mainnet/private-pool-v2-c01-external-evidence-request.md";

function fail(message) {
  console.error(`private-pool-v2 C01 external review handoff: FAIL - ${message}`);
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

const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);
const runbook = read(runbookPath);
const review = read(reviewPath);
const humanHandoff = read(humanHandoffPath);
const closureGate = readJson(packet.closureGateRef);
const candidate = readJson(packet.candidatePacketRef);
const artifactRequest = readJson(artifactRequestPath);

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
  assert(!packetText.includes(forbidden), `handoff must not contain forbidden marker ${forbidden}`);
}

assert(packet.version === "vanta-private-pool-v2-c01-external-review-handoff-0.1", "version mismatch");
assert(packet.status === "ready-for-external-c01-verifier-review-handoff-blocked", "status mismatch");
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(packet.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "proofVerifiedClaimAllowed",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(packet.decisionPacketRef === decisionPath, "decision ref mismatch");
assert(packet.candidatePacketRef === "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json", "candidate ref mismatch");
assert(
  packet.productionVerifierArtifactRequestRef ===
    "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json",
  "production verifier artifact request ref mismatch",
);
assert(packet.humanHandoffRef === humanHandoffPath, "human handoff ref mismatch");
assertRefPath(packet.humanHandoffRef, "human handoff ref");
assert(packet.closureGateRef === "ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json", "closure gate ref mismatch");
assert(candidate.status === "blocked-selected-groth16-tag3-solana-v0-production-evidence", "candidate must remain blocked");
assert(closureGate.status === "blocked-no-complete-c01-verifier-evidence-chain", "closure gate must remain blocked");

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
  ["requiredPublicInputValue", "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b"],
  ["requiredPublicInputCommitment", "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2"],
  ["referenceCurrentSourceAcirSha256", "sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9"],
  ["productionSourceLineageMode", "reviewed-beta18-h6-source-migration"],
  ["sourceAcirSha256", "sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde"],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
]) {
  assert(shape[field] === expected, `current required shape ${field} mismatch`);
}

const expectedReviewOrder = [
  [
    "source-review-acceptance",
    "external-review-required",
    "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance.template.json",
    "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json",
    "VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH",
    "npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
  ],
  [
    "production-output-manifest-preflight",
    "artifact-producer-preflight-required",
    null,
    "ops/mainnet/private-pool-v2-c01-production-output-manifest-preflight.evidence.json",
    "VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_ROOT|VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_PATH",
    "npm run zk:c01-production-output-manifest-check",
  ],
  [
    "deterministic-production-artifact-build",
    "external-review-required",
    "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json",
    "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json",
    "VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH",
    "npm run zk:c01-deterministic-production-artifact-build-check",
  ],
  [
    "production-artifact-bundle",
    "external-review-required",
    "ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json",
    "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json",
    "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH",
    "npm run zk:c01-production-artifact-acceptance-gate-check",
  ],
  [
    "verifier-adapter-acceptance",
    "external-review-required",
    "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json",
    "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json",
    "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH",
    "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  ],
  [
    "sbf-live-lineage-acceptance",
    "external-review-required",
    "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json",
    "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json",
    "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH",
    "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  ],
  [
    "audit-reviewer-acceptance",
    "external-review-required",
    "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json",
    "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json",
    "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH",
    "npm run zk:c01-audit-reviewer-acceptance-gate-check",
  ],
  [
    "composite-evidence-closure",
    "external-review-required",
    null,
    "ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json",
    "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH+VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH+VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH+VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH",
    "npm run zk:c01-verifier-evidence-closure-gate-check",
  ],
];

assert(Array.isArray(packet.reviewOrder), "reviewOrder must be an array");
assert(packet.reviewOrder.length === expectedReviewOrder.length, "reviewOrder length mismatch");
assert(
  JSON.stringify(packet.reviewOrder.map((entry) => entry.id)) === JSON.stringify(artifactRequest.promotionOrder),
  "handoff reviewOrder must match artifact request promotionOrder",
);
for (const [index, [id, status, templateRef, gateRef, envVar, command]] of expectedReviewOrder.entries()) {
  const entry = packet.reviewOrder[index];
  assert(entry.id === id, `reviewOrder[${index}].id mismatch`);
  assert(entry.status === status, `reviewOrder[${index}].status mismatch`);
  assert(entry.templateRef === templateRef, `reviewOrder[${index}].templateRef mismatch`);
  if (templateRef) {
    assertRefPath(templateRef, `${id} template`);
  }
  assert(entry.gateRef === gateRef, `reviewOrder[${index}].gateRef mismatch`);
  assertRefPath(gateRef, `${id} gate`);
  assert(entry.envVar === envVar, `reviewOrder[${index}].envVar mismatch`);
  includes(entry.validationCommand, command, `${id} validation command`);
  assert(typeof entry.requiredReturn === "string" && entry.requiredReturn.length > 0, `${id} requiredReturn missing`);
  includes(entry.truthBoundary, "not", `${id} truth boundary`);
}

assert(Array.isArray(packet.comparisonOnlyLocalEvidence), "comparisonOnlyLocalEvidence must be an array");
const requestComparisonIds = new Set(
  (artifactRequest.comparisonOnlyLocalEvidence ?? []).map((entry) => entry.id),
);
for (const entry of packet.comparisonOnlyLocalEvidence) {
  assert(requestComparisonIds.has(entry.id), `${entry.id} comparison ref must also be mirrored in artifact request`);
  if (entry.id === "fresh-local-sbf-abi") {
    assertRepoLocalPathShape(entry.ref, `${entry.id} comparison ref`);
    assert(entry.refIsIgnoredBuildArtifact === true, `${entry.id} must mark the SBF ref as an ignored build artifact`);
    assert(entry.cleanCiMayMissRef === true, `${entry.id} must mark clean CI as allowed to miss the local SBF ref`);
    includes(entry.truthBoundary, "ignored local build artifact", `${entry.id} comparison truth boundary`);
  } else {
    assertRefPath(entry.ref, `${entry.id} comparison ref`);
  }
  includes(entry.truthBoundary, "not", `${entry.id} comparison truth boundary`);
}
assertStringArray(packet.forbiddenReviewerPacketContents, "forbiddenReviewerPacketContents");
for (const marker of [
  "raw proof bytes",
  "private keys",
  "signed transaction bytes",
  "provider credentials",
]) {
  assert(packet.forbiddenReviewerPacketContents.includes(marker), `forbidden reviewer marker missing ${marker}`);
}
assertStringArray(packet.remainingBlockers, "remainingBlockers");
for (const blocker of [
  "no reviewed frozen source commit",
  "no source freeze review acceptance",
  "no reviewed production output manifest",
  "no reviewed production artifact bundle",
  "no production verifier-adapter acceptance",
  "no SBF/live lineage acceptance",
  "no deployed verifier program id/hash",
  "no verifier program upgrade-authority status ref",
  "no verifier-key record binding production VK hash to verifier program id",
  "no audit/reviewer acceptance",
  "no composite C01 verifier evidence closure validation",
]) {
  assert(packet.remainingBlockers.includes(blocker), `remaining blocker missing ${blocker}`);
}
assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-external-review-handoff-check",
  "npm run zk:c01-production-verifier-artifact-request-check",
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
  "not external review",
  "not production proof-format evidence",
  "not production verifying-key evidence",
  "not verifier-adapter acceptance",
  "not SBF/live lineage",
  "not audit/reviewer acceptance",
  "not C01 closure",
]) {
  includes(packet.truthBoundary, marker, "handoff truth boundary");
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
  assert(!humanHandoff.includes(forbidden), `human handoff must not contain forbidden marker ${forbidden}`);
}

for (const marker of [
  "# C01 External Evidence Request",
  "Status: request packet only.",
  "selectedBackend: `groth16-tag3-solana-v0`",
  "routeId: `sunspot-noir-acir-gnark-groth16-solana-v0`",
  "target: `solana-c01-tag3-groth16-v0`",
  "proofFormatId: `gnark-solana-native-proof-and-public-witness-v0`",
  "requiredPublicInputValue: `0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b`",
  "requiredPublicInputCommitment: `sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2`",
  "## Frozen Lane Requirement",
  "frozen source commit",
  "source freeze review",
  "ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json",
  "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json",
  "## Local Source/Comparison Refs Already Filled",
  "PRODUCTION_PRIVACY_AUDIT.md",
  "AUDIT_2026-05-19.md",
  "SECURITY_LIMITATIONS.md",
  "VANTA_ZK_REVIEW.findings.json",
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json",
  "Keep every `requiredProductionOutputs[].currentRef` null",
  "## Ref Source Map",
  "Use this map to collect returned refs.",
  "Local commands may produce candidate values, but only reviewer-returned refs can be copied into the acceptance packets.",
  "`git:<reviewed-immutable-production-source-commit-ref>`",
  "`review:<clean-source-tree-or-reviewed-diff-status-ref>`",
  "`review:<reviewed-source-freeze-acceptance-ref>`",
  "`manifest:<refs-only-production-output-manifest-preflight-ref>`",
  "`build:<reviewed-deterministic-production-artifact-build-receipt-ref>`",
  "`bundle:<reviewed-production-proof-vk-public-witness-adapter-test-lineage-audit-refs>`",
  "`adapter:<accepted-solana-groth16-verifier-adapter-or-program-ref>`",
  "`program:<deployed-verifier-program-id>`",
  "`sha256:<deployed-verifier-program-sbf-hash>`",
  "`authority:<deployed-verifier-program-upgrade-authority-status-ref>`",
  "`record:<tag5-verifier-key-record-binds-production-vk-hash-and-verifier-program-id-ref>`",
  "`tx-or-review:<live-proof-enforced-tag3-or-reviewer-dry-run-ref>`",
  "`audit-or-review:<selected-verifier-backend-accepted-for-c01-ref>`",
  "Do not fill accepted refs from current repo-local command output alone.",
  "raw proof bytes",
  "raw verifying-key bytes",
  "signed transaction bytes",
  "VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
  "VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_ROOT=<returned-artifact-dir> npm run zk:c01-production-output-manifest-check",
  "VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=<reviewed-refs-only-json> npm run zk:c01-deterministic-production-artifact-build-check",
  "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-refs-only-json> npm run zk:c01-production-artifact-acceptance-gate-check",
  "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-audit-reviewer-acceptance-gate-check",
  "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-adapter-json>",
  "verifier program upgrade-authority status ref",
  "verifier-key record binding production VK hash to verifier program id",
  "proofVerifiedClaimAllowed",
  "Do not wire `TAG_SPEND_WITH_PROOF` mutation",
]) {
  includes(humanHandoff, marker, humanHandoffPath);
}

assert(
  scripts["zk:c01-external-review-handoff-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-external-review-handoff.mjs",
  "package.json must expose zk:c01-external-review-handoff-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  includes(scripts[aggregate] ?? "", "npm run zk:c01-external-review-handoff-check", `${aggregate} script`);
}

for (const marker of [
  "C01 external reviewer handoff packet",
  packetPath,
  "ready-for-external-c01-verifier-review-handoff-blocked",
  "npm run zk:c01-external-review-handoff-check",
  "C01 production verifier artifact request packet",
  "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json",
  "npm run zk:c01-production-verifier-artifact-request-check",
  "npm run zk:c01-production-output-manifest-check",
  "source-review acceptance",
  "source-review acceptance, production output-manifest preflight, deterministic production artifact build",
  "deterministic production artifact build",
  "production output-manifest preflight",
  "production artifact bundle",
  "frozen source commit",
  "verifier-adapter acceptance",
  "verifier program upgrade-authority status",
  "SBF/live lineage acceptance",
  "audit/reviewer acceptance",
  "composite evidence-chain closure",
]) {
  includes(decision, marker, decisionPath);
  includes(auditPackage, marker, auditPackagePath);
  includes(runbook, marker, runbookPath);
  includes(review, marker, reviewPath);
}

console.log("private-pool-v2 C01 external review handoff: PASS");

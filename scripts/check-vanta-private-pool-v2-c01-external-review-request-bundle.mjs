import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-external-review-request-bundle.evidence.json";
const artifactRequestPath = "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json";
const handoffPath = "ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json";
const humanHandoffPath = "ops/mainnet/private-pool-v2-c01-external-evidence-request.md";
const closureGatePath = "ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json";

function fail(message) {
  console.error(`private-pool-v2 C01 external review request bundle: FAIL - ${message}`);
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

function sha256Ref(path) {
  const bytes = readFileSync(resolve(repoRoot, path));
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
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
const artifactRequest = readJson(artifactRequestPath);
const handoff = readJson(handoffPath);
const closureGate = readJson(closureGatePath);
const humanHandoff = read(humanHandoffPath);
const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};

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
  assert(!packetText.includes(forbidden), `bundle packet must not contain forbidden marker ${forbidden}`);
}

assert(
  packet.version === "vanta-private-pool-v2-c01-external-review-request-bundle-0.1",
  "version mismatch",
);
assert(packet.status === "ready-for-external-c01-review-request-bundle-blocked", "status mismatch");
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
  "productionArtifactsReady",
  "verifierAdapterReady",
  "sbfLiveLineageReady",
  "auditReviewerAccepted",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(packet.bundleHashPolicy?.hashAlgorithm === "sha256", "hash algorithm mismatch");
assert(packet.bundleHashPolicy?.selfHashOmitted === true, "bundle must omit self hash");
assert(packet.bundleHashPolicy?.rawArtifactStorageAllowed === false, "raw artifact storage must stay false");
assert(packet.bundleHashPolicy?.acceptedExternalRefsStillNull === true, "accepted external refs must stay null");

for (const [field, expected] of [
  ["humanHandoffRef", humanHandoffPath],
  ["artifactRequestRef", artifactRequestPath],
  ["externalReviewHandoffRef", handoffPath],
  ["closureGateRef", closureGatePath],
]) {
  assert(packet[field] === expected, `${field} mismatch`);
  assertRefPath(expected, field);
}
assert(artifactRequest.externalReviewRequestBundleRef === packetPath, "artifact request must point at request bundle");
assert(handoff.requestBundleRef === packetPath, "external handoff must point at request bundle");
assert(closureGate.status === "blocked-no-complete-c01-verifier-evidence-chain", "closure gate must remain blocked");
includes(humanHandoff, packetPath, "human handoff");
includes(humanHandoff, "npm run zk:c01-external-review-request-bundle-check", "human handoff");

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
  assert(shape[field] === expected, `currentRequiredShape.${field} mismatch`);
}

const expectedFiles = new Map([
  ["human-evidence-request", humanHandoffPath],
  ["artifact-request", artifactRequestPath],
  ["external-review-handoff", handoffPath],
  ["source-review-acceptance-template", "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance.template.json"],
  ["deterministic-build-template", "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json"],
  ["production-artifact-bundle-template", "ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json"],
  ["verifier-adapter-acceptance-template", "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json"],
  ["sbf-live-lineage-template", "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json"],
  ["audit-reviewer-acceptance-template", "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json"],
  ["source-review-acceptance-gate", "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json"],
  ["production-output-manifest-preflight", "ops/mainnet/private-pool-v2-c01-production-output-manifest-preflight.evidence.json"],
  ["deterministic-build-gate", "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json"],
  ["production-artifact-acceptance-gate", "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json"],
  ["verifier-adapter-acceptance-gate", "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json"],
  ["sbf-live-lineage-acceptance-gate", "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json"],
  ["audit-reviewer-acceptance-gate", "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json"],
  ["verifier-evidence-closure-gate", closureGatePath],
  ["production-privacy-audit", "PRODUCTION_PRIVACY_AUDIT.md"],
  ["prior-audit-context", "AUDIT_2026-05-19.md"],
  ["security-limitations", "SECURITY_LIMITATIONS.md"],
  ["zk-findings-ledger", "VANTA_ZK_REVIEW.findings.json"],
  ["verifier-backend-decision", "docs/zk/c01-production-verifier-backend-decision.md"],
  ["audit-package", "docs/audit-package.md"],
]);
const outboundFiles = mapById(packet.outboundFiles, "outboundFiles");
assert(outboundFiles.size === expectedFiles.size, "outboundFiles size mismatch");
for (const [id, path] of expectedFiles.entries()) {
  const entry = outboundFiles.get(id);
  assert(entry, `missing outbound file ${id}`);
  assert(entry.path === path, `${id} path mismatch`);
  assert(entry.path !== packetPath, `${id} must not hash the bundle packet itself`);
  assertRefPath(path, `${id} path`);
  assert(entry.sha256 === sha256Ref(path), `${id} sha256 mismatch`);
  assert(typeof entry.group === "string" && entry.group.length > 0, `${id} group missing`);
  assert(typeof entry.requiredFor === "string" && entry.requiredFor.length > 0, `${id} requiredFor missing`);
  includes(entry.truthBoundary ?? "", "not", `${id} truth boundary`);
}

const requiredRefs = mapById(packet.requiredReturnedExternalRefs, "requiredReturnedExternalRefs");
for (const id of [
  "reviewed-frozen-source-commit",
  "source-tree-status",
  "source-freeze-review",
  "production-artifact-bundle",
  "production-proof-format-artifact",
  "production-verifying-key-hash",
  "verifier-adapter-program-acceptance",
  "deployed-verifier-program-id",
  "deployed-verifier-program-sbf-hash",
  "verifier-program-upgrade-authority-status",
  "tag5-verifier-key-record-binding",
  "proof-enforced-tag3-or-reviewer-dry-run",
  "audit-reviewer-acceptance",
]) {
  const entry = requiredRefs.get(id);
  assert(entry, `missing required external ref ${id}`);
  assert(typeof entry.requiredRefShape === "string" && entry.requiredRefShape.includes("<"), `${id} ref shape missing`);
  assert(typeof entry.expectedSource === "string" && entry.expectedSource.length > 0, `${id} expected source missing`);
  assert(Array.isArray(entry.fillTargets) && entry.fillTargets.length > 0, `${id} fill targets missing`);
  assert(entry.currentRef === null, `${id} currentRef must stay null`);
  assert(entry.satisfiesC01PositiveEvidence === false, `${id} must not satisfy C01 positive evidence`);
}

assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-external-review-request-bundle-check",
  "npm run zk:c01-production-verifier-artifact-request-check",
  "npm run zk:c01-external-review-handoff-check",
  "npm run zk:c01-verifier-evidence-closure-gate-check",
  "npm run private-pool-v2:groth16-verifier-cpi-check",
]) {
  assert(packet.canonicalCommands.includes(command), `canonicalCommands missing ${command}`);
}
assertStringArray(packet.forbiddenReviewerPacketContents, "forbiddenReviewerPacketContents");
for (const marker of [
  "raw proof bytes",
  "raw verifying-key bytes",
  "raw witness bytes",
  "proving key bytes",
  "keypair material",
  "signed transaction bytes",
  "authorization-token material",
]) {
  assert(packet.forbiddenReviewerPacketContents.includes(marker), `forbidden contents missing ${marker}`);
}
assert(packet.promotionBoundary?.doNotWireCallableMutationPathFromThisBundle === true, "callable mutation boundary missing");
assert(packet.promotionBoundary?.doNotFillAcceptedRefsFromRepoLocalHashes === true, "local hash promotion boundary missing");
assert(packet.promotionBoundary?.requiresReviewedReturnedPackets === true, "reviewed returned packet boundary missing");
assert(packet.promotionBoundary?.requiresCompositeClosureGate === true, "closure boundary missing");
assert(packet.promotionBoundary?.productionReadyMustRemainFalse === true, "productionReady boundary missing");
assert(packet.promotionBoundary?.privacyClaimAllowedMustRemainFalse === true, "privacy claim boundary missing");
for (const marker of [
  "not reviewed frozen source",
  "not production proof-format evidence",
  "not production verifying-key evidence",
  "not verifier-adapter acceptance",
  "not deployed verifier evidence",
  "not tag-5 verifier-key binding",
  "not SBF/live lineage",
  "not audit/reviewer acceptance",
  "not C01 closure",
  "not a callable mutation path",
]) {
  includes(packet.truthBoundary ?? "", marker, "truth boundary");
}

assert(
  scripts["zk:c01-external-review-request-bundle-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-external-review-request-bundle.mjs",
  "package.json must expose zk:c01-external-review-request-bundle-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  includes(
    scripts[aggregate] ?? "",
    "npm run zk:c01-external-review-request-bundle-check",
    `package script ${aggregate}`,
  );
}

console.log("Vanta private-pool-v2 C01 external review request bundle check: PASS");

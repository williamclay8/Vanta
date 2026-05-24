import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const optionsPath = "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const acceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const proofFormatPath = "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const productionVkPath = "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json";
const adapterPath = "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json";
const localInventoryPath =
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-local-artifact-inventory.evidence.json";
const lineageAcceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json";
const lineageAcceptanceTemplatePath =
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const operatorRunbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const ledgerPath = "VANTA_ZK_REVIEW.findings.json";
const currentSourceAcirSha256 =
  "sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9";
const reviewedBeta18H6SourceAcirSha256 =
  "sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fail(message) {
  console.error(`private-pool-v2 C01 SBF/live lineage candidate: FAIL - ${message}`);
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

function resolveMaybeAbsolute(path) {
  return path.startsWith("/") ? path : resolve(repoRoot, path);
}

function assertFileSha256IfPresent(path, expected, label) {
  const absolutePath = resolveMaybeAbsolute(path);
  if (!existsSync(absolutePath)) {
    return;
  }
  const actual = `sha256:${createHash("sha256").update(readFileSync(absolutePath)).digest("hex")}`;
  assert(actual === expected, `${label} hash mismatch: expected ${expected}, got ${actual}`);
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

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};

assert(
  scripts["zk:c01-sbf-live-lineage-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sbf-live-lineage-candidate.mjs",
  "package.json must expose zk:c01-sbf-live-lineage-candidate-check",
);
assert(
  scripts["zk:c01-sbf-live-lineage-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sbf-live-lineage-acceptance-gate.mjs",
  "package.json must expose zk:c01-sbf-live-lineage-acceptance-gate-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sbf-live-lineage-candidate-check"),
    `${aggregate} must include the C01 SBF/live lineage candidate guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sbf-live-lineage-acceptance-gate-check"),
    `${aggregate} must include the C01 SBF/live lineage acceptance gate`,
  );
}

const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const candidate = readJson(candidatePath);
const options = readJson(optionsPath);
const acquisition = readJson(acquisitionPath);
const acceptanceGate = readJson(acceptanceGatePath);
const proofFormat = readJson(proofFormatPath);
const productionVk = readJson(productionVkPath);
const adapter = readJson(adapterPath);
const localInventory = readJson(localInventoryPath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);
const operatorRunbook = read(operatorRunbookPath);
const review = read(reviewPath);
const ledger = readJson(ledgerPath);

assert(
  packet.version === "vanta-private-pool-v2-c01-sbf-live-lineage-candidate-evidence-0.1",
  "schema mismatch",
);
assert(
  packet.status === "blocked-no-rebuilt-redeployed-reinitialized-live-lineage",
  "lineage packet must stay blocked until live lineage refs exist",
);
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(
  packet.selectedBackendStatus === "selected-pending-production-evidence",
  "selected backend status mismatch",
);
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route id mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "sbfLiveLineageReady",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(
  packet.secretPolicy === "refs-only-no-keypairs-secrets-signed-transactions-or-live-private-data",
  "secret policy mismatch",
);
for (const marker of [
  "proofHex",
  "proofBytes",
  "verifyingKeyBytes",
  "verifying_key_bytes",
  "vkBytes",
  "witnessBytes",
  "provingKeyBytes",
  "keypairBytes",
  "privateKey",
  "seed phrase",
  "signedTransactionBytes",
  "bearer ",
  "postgres://",
  "postgresql://",
  "-----BEGIN",
]) {
  assert(!packetText.includes(marker), `packet must not contain forbidden marker ${marker}`);
}

assertAllowedKeys(packet, "SBF/live lineage packet", [
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
  "sbfLiveLineageReady",
  "secretPolicy",
  "purpose",
  "candidatePacketRef",
  "backendOptionsRef",
  "artifactAcquisitionPacketRef",
  "productionArtifactAcceptanceGateRef",
  "groth16ProofFormatCandidateRef",
  "productionVerifyingKeyCandidateRef",
  "verifierAdapterTestCandidateRef",
  "localSunspotGnarkLocalArtifactInventoryRef",
  "sbfLiveLineageAcceptanceGateRef",
  "sbfLiveLineageAcceptanceTemplateRef",
  "localSbfAbiStatusRef",
  "decisionPacketRef",
  "requiredLineageShape",
  "currentLiveLineage",
  "localComparisonOnly",
  "localH6SbfLineageRehearsal",
  "blockedPrerequisiteRefs",
  "lineageAcceptanceCriteria",
  "promotionRules",
  "satisfiesRequiredPositiveEvidence",
  "forbiddenPromotions",
  "canonicalCommands",
  "truthBoundary",
]);

for (const [field, expected] of [
  ["candidatePacketRef", candidatePath],
  ["backendOptionsRef", optionsPath],
  ["artifactAcquisitionPacketRef", acquisitionPath],
  ["productionArtifactAcceptanceGateRef", acceptanceGatePath],
  ["groth16ProofFormatCandidateRef", proofFormatPath],
  ["productionVerifyingKeyCandidateRef", productionVkPath],
  ["verifierAdapterTestCandidateRef", adapterPath],
  ["localSunspotGnarkLocalArtifactInventoryRef", localInventoryPath],
  ["sbfLiveLineageAcceptanceGateRef", lineageAcceptanceGatePath],
  ["sbfLiveLineageAcceptanceTemplateRef", lineageAcceptanceTemplatePath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(packet[field] === expected, `${field} mismatch`);
}

const shape = packet.requiredLineageShape ?? {};
assertAllowedKeys(shape, "required lineage shape", [
  "target",
  "tag",
  "circuit",
  "proofSystem",
  "routeId",
  "proofFormatId",
  "proofByteLength",
  "publicWitnessByteLength",
  "verifierInstructionDataByteLength",
  "publicInputLabel",
  "verifyingKeyHashKind",
  "referenceCurrentSourceAcirSha256",
  "productionSourceLineageMode",
  "sourceAcirSha256",
  "spendProgramSbfPath",
  "verifierProgramKind",
  "requiredProgramLineage",
  "requiredLiveEvidence",
  "status",
]);
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["routeId", "sunspot-noir-acir-gnark-groth16-solana-v0"],
  ["proofFormatId", "gnark-solana-native-proof-and-public-witness-v0"],
  ["proofByteLength", 324],
  ["publicWitnessByteLength", 44],
  ["verifierInstructionDataByteLength", 368],
  ["publicInputLabel", "private-spend-public-input-hash"],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["referenceCurrentSourceAcirSha256", currentSourceAcirSha256],
  ["productionSourceLineageMode", "reviewed-beta18-h6-source-migration"],
  ["sourceAcirSha256", reviewedBeta18H6SourceAcirSha256],
  ["spendProgramSbfPath", "programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so"],
  ["verifierProgramKind", "dedicated-verifier-cpi-or-reviewed-in-program-verifier"],
  ["status", "required-before-sbf-live-lineage-acceptance"],
]) {
  assert(shape[field] === expected, `required lineage shape ${field} mismatch`);
}
assertStringArray(shape.requiredProgramLineage, "required lineage shape requiredProgramLineage");
assertStringArray(shape.requiredLiveEvidence, "required lineage shape requiredLiveEvidence");
for (const marker of [
  "rebuilt spend SBF hash for the exact accepted source",
  "deployed spend program id and verifier program id",
  "reinitialization or migration transaction signatures",
  "live proof-enforced tag-3 transaction or reviewer-accepted dry-run receipt",
]) {
  includes(
    [...shape.requiredProgramLineage, ...shape.requiredLiveEvidence].join("\n"),
    marker,
    "required lineage shape",
  );
}

const current = packet.currentLiveLineage ?? {};
assertAllowedKeys(current, "current live lineage", [
  "status",
  "spendProgramSbfHash",
  "verifierProgramSbfHash",
  "spendProgramId",
  "verifierProgramId",
  "deploymentSignatureRef",
  "reinitializationSignatureRef",
  "verifierKeyRegistrationSignatureRef",
  "liveProofEnforcedSpendSignatureRef",
  "operatorPacketRef",
  "auditReviewerAcceptanceRef",
  "satisfiesSbfLiveLineage",
]);
assert(current.status === "absent", "current live lineage must stay absent");
for (const field of [
  "spendProgramSbfHash",
  "verifierProgramSbfHash",
  "spendProgramId",
  "verifierProgramId",
  "deploymentSignatureRef",
  "reinitializationSignatureRef",
  "verifierKeyRegistrationSignatureRef",
  "liveProofEnforcedSpendSignatureRef",
  "operatorPacketRef",
  "auditReviewerAcceptanceRef",
]) {
  assert(current[field] === null, `current live lineage ${field} must stay null`);
}
assert(current.satisfiesSbfLiveLineage === false, "current live lineage must not satisfy SBF/live lineage");

assert(
  packet.localSbfAbiStatusRef?.artifactRef === "scripts/check-vanta-private-pool-v2-sbf-abi-status.mjs",
  "packet must reference the local SBF ABI status guard",
);
assert(
  packet.localSbfAbiStatusRef?.command === "npm run private-pool-v2:sbf-abi-check",
  "packet must record the local SBF ABI status guard command",
);
assert(
  packet.localSbfAbiStatusRef?.satisfiesSbfLiveLineage === false,
  "local SBF ABI freshness must not satisfy live lineage",
);
includes(
  packet.localSbfAbiStatusRef?.truthBoundary ?? "",
  "local bytecode freshness",
  "local SBF ABI status truth boundary",
);

const localComparison = packet.localComparisonOnly ?? {};
assert(
  localComparison.localUnsafeVerifierSbfSha256 === localInventory.artifacts?.solanaVerifierSbf?.sha256,
  "local comparison verifier SBF hash must match the local inventory metadata",
);
assert(localComparison.satisfiesSbfLiveLineage === false, "local comparison must not satisfy live lineage");
includes(localComparison.truthBoundary ?? "", "/private/tmp", "local comparison truth boundary");

const localUnsafeHarness = adapter.localUnsafeGeneratedVerifierCpiAcceptanceHarness ?? {};
const localRehearsal = packet.localH6SbfLineageRehearsal ?? {};
assertAllowedKeys(localRehearsal, "local H6 SBF lineage rehearsal", [
  "status",
  "scope",
  "command",
  "sbfAbiCommand",
  "spendProgramSbf",
  "generatedVerifierProgramSbf",
  "wrongGeneratedVerifierProgramSbf",
  "verifierKeyBinding",
  "proofTuple",
  "mutationMatrix",
  "canonicalCommands",
  "satisfiesProductionVerifierAdapterAcceptance",
  "satisfiesProductionMutationNoMutationEvidence",
  "satisfiesDeploymentLineage",
  "satisfiesSbfLiveLineage",
  "satisfiesAuditReviewerAcceptance",
  "truthBoundary",
]);
assert(
  localRehearsal.status === "local-h6-sbf-lineage-rehearsal-only",
  "local H6 rehearsal status mismatch",
);
assert(
  localRehearsal.command === "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
  "local H6 rehearsal command mismatch",
);
assert(localRehearsal.command === localUnsafeHarness.command, "local H6 rehearsal must use the local unsafe harness command");
assert(localRehearsal.sbfAbiCommand === "npm run private-pool-v2:sbf-abi-check", "local H6 rehearsal SBF ABI command mismatch");
assertStringArray(localRehearsal.canonicalCommands, "local H6 rehearsal canonical commands");
for (const command of [
  "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
  "npm run private-pool-v2:sbf-abi-check",
]) {
  assert(localRehearsal.canonicalCommands.includes(command), `local H6 rehearsal canonical commands missing ${command}`);
}

const rehearsalSpendSbf = localRehearsal.spendProgramSbf ?? {};
assertAllowedKeys(rehearsalSpendSbf, "local H6 rehearsal spend SBF", [
  "path",
  "sha256",
  "rebuiltLocally",
  "deployedProgramId",
  "deploymentSignatureRef",
  "satisfiesSbfLiveLineage",
]);
assert(rehearsalSpendSbf.path === shape.spendProgramSbfPath, "local H6 rehearsal spend SBF path mismatch");
assert(
  rehearsalSpendSbf.sha256 === "sha256:fe314c80b2dc15d13aca8a82b4baad894ee6817213ef05d9b91b9891ac636ed4",
  "local H6 rehearsal spend SBF hash mismatch",
);
assert(rehearsalSpendSbf.rebuiltLocally === true, "local H6 rehearsal spend SBF must be rebuilt locally");
assert(rehearsalSpendSbf.deployedProgramId === null, "local H6 rehearsal spend program id must stay null");
assert(rehearsalSpendSbf.deploymentSignatureRef === null, "local H6 rehearsal spend deployment ref must stay null");
assert(
  rehearsalSpendSbf.satisfiesSbfLiveLineage === false,
  "local H6 rehearsal spend SBF must not satisfy live lineage",
);
assertFileSha256IfPresent(rehearsalSpendSbf.path, rehearsalSpendSbf.sha256, "local H6 rehearsal spend SBF");

const rehearsalVerifierSbf = localRehearsal.generatedVerifierProgramSbf ?? {};
assertAllowedKeys(rehearsalVerifierSbf, "local H6 rehearsal verifier SBF", [
  "path",
  "sha256",
  "source",
  "deployedProgramId",
  "deploymentSignatureRef",
  "satisfiesAcceptedVerifierProgramSbf",
  "satisfiesSbfLiveLineage",
]);
assert(rehearsalVerifierSbf.path === localUnsafeHarness.verifierProgramSbf, "local H6 rehearsal verifier SBF path mismatch");
assert(
  rehearsalVerifierSbf.sha256 === "sha256:91fc2db5e06ebfb72bee120ebbcd51698684216598ec50f046d62fcf64928ac0",
  "local H6 rehearsal verifier SBF hash mismatch",
);
assert(rehearsalVerifierSbf.deployedProgramId === null, "local H6 rehearsal verifier program id must stay null");
assert(rehearsalVerifierSbf.deploymentSignatureRef === null, "local H6 rehearsal verifier deployment ref must stay null");
assert(
  rehearsalVerifierSbf.satisfiesAcceptedVerifierProgramSbf === false,
  "local H6 rehearsal verifier SBF must not satisfy accepted verifier SBF",
);
assert(
  rehearsalVerifierSbf.satisfiesSbfLiveLineage === false,
  "local H6 rehearsal verifier SBF must not satisfy live lineage",
);
assertFileSha256IfPresent(rehearsalVerifierSbf.path, rehearsalVerifierSbf.sha256, "local H6 rehearsal verifier SBF");

const rehearsalWrongVerifierSbf = localRehearsal.wrongGeneratedVerifierProgramSbf ?? {};
assertAllowedKeys(rehearsalWrongVerifierSbf, "local H6 rehearsal wrong verifier SBF", [
  "path",
  "sha256",
  "source",
  "satisfiesAcceptedVerifierProgramSbf",
  "satisfiesSbfLiveLineage",
]);
assert(
  rehearsalWrongVerifierSbf.path === localUnsafeHarness.wrongVerifierProgramSbf,
  "local H6 rehearsal wrong verifier SBF path mismatch",
);
assert(
  rehearsalWrongVerifierSbf.sha256 === localComparison.localUnsafeVerifierSbfSha256,
  "local H6 rehearsal wrong verifier SBF hash must match the pre-H6 local inventory hash",
);
assert(
  rehearsalWrongVerifierSbf.satisfiesAcceptedVerifierProgramSbf === false,
  "local H6 rehearsal wrong verifier SBF must not satisfy accepted verifier SBF",
);
assert(
  rehearsalWrongVerifierSbf.satisfiesSbfLiveLineage === false,
  "local H6 rehearsal wrong verifier SBF must not satisfy live lineage",
);
assertFileSha256IfPresent(
  rehearsalWrongVerifierSbf.path,
  rehearsalWrongVerifierSbf.sha256,
  "local H6 rehearsal wrong verifier SBF",
);

const rehearsalVkBinding = localRehearsal.verifierKeyBinding ?? {};
assertAllowedKeys(rehearsalVkBinding, "local H6 rehearsal verifier-key binding", [
  "verifyingKeySha256",
  "wrongVerifyingKeySha256",
  "verifyingKeyHashKind",
  "verifierKeyRecordRegisteredLocally",
  "productionVerifierKeyRecordRef",
  "satisfiesProductionVerifyingKeyEvidence",
  "satisfiesSbfLiveLineage",
]);
for (const field of ["verifyingKeySha256", "wrongVerifyingKeySha256", "verifyingKeyHashKind"]) {
  assert(
    rehearsalVkBinding[field] === localUnsafeHarness[field],
    `local H6 rehearsal verifier-key binding ${field} mismatch`,
  );
}
assert(
  rehearsalVkBinding.verifierKeyRecordRegisteredLocally === true,
  "local H6 rehearsal must record local verifier-key registration",
);
assert(
  rehearsalVkBinding.productionVerifierKeyRecordRef === null,
  "local H6 rehearsal production verifier-key record ref must stay null",
);
assert(
  rehearsalVkBinding.satisfiesProductionVerifyingKeyEvidence === false,
  "local H6 rehearsal verifier-key binding must not satisfy production VK evidence",
);
assert(
  rehearsalVkBinding.satisfiesSbfLiveLineage === false,
  "local H6 rehearsal verifier-key binding must not satisfy live lineage",
);

const rehearsalProofTuple = localRehearsal.proofTuple ?? {};
assertAllowedKeys(rehearsalProofTuple, "local H6 rehearsal proof tuple", [
  "proofSystem",
  "proofFormatId",
  "proofByteLength",
  "publicWitnessByteLength",
  "verifierInstructionDataByteLength",
  "proofSha256",
  "publicWitnessSha256",
  "satisfiesProductionProofFormatEvidence",
  "satisfiesSbfLiveLineage",
]);
for (const [field, expected] of [
  ["proofSystem", shape.proofSystem],
  ["proofFormatId", shape.proofFormatId],
  ["proofByteLength", shape.proofByteLength],
  ["publicWitnessByteLength", shape.publicWitnessByteLength],
  ["verifierInstructionDataByteLength", shape.verifierInstructionDataByteLength],
  ["proofSha256", localUnsafeHarness.proofSha256],
  ["publicWitnessSha256", localUnsafeHarness.publicWitnessSha256],
]) {
  assert(rehearsalProofTuple[field] === expected, `local H6 rehearsal proof tuple ${field} mismatch`);
}
assert(
  rehearsalProofTuple.satisfiesProductionProofFormatEvidence === false,
  "local H6 rehearsal proof tuple must not satisfy production proof-format evidence",
);
assert(
  rehearsalProofTuple.satisfiesSbfLiveLineage === false,
  "local H6 rehearsal proof tuple must not satisfy live lineage",
);

const rehearsalMutation = localRehearsal.mutationMatrix ?? {};
assertAllowedKeys(rehearsalMutation, "local H6 rehearsal mutation matrix", [
  "validProofMutatesNullifierAndOutputState",
  "invalidProofLeavesAccountsUnchanged",
  "wrongPublicInputHashLeavesAccountsUnchanged",
  "wrongVerifierProgramLeavesAccountsUnchanged",
  "wrongVerifyingKeyLeavesAccountsUnchanged",
  "satisfiesProductionMutationNoMutationEvidence",
  "satisfiesSbfLiveLineage",
]);
for (const field of [
  "validProofMutatesNullifierAndOutputState",
  "invalidProofLeavesAccountsUnchanged",
  "wrongPublicInputHashLeavesAccountsUnchanged",
  "wrongVerifierProgramLeavesAccountsUnchanged",
  "wrongVerifyingKeyLeavesAccountsUnchanged",
]) {
  assert(rehearsalMutation[field] === true, `local H6 rehearsal mutation matrix ${field} must be true`);
  assert(
    rehearsalMutation[field] === localUnsafeHarness[field],
    `local H6 rehearsal mutation matrix ${field} must match the local unsafe harness`,
  );
}
assert(
  rehearsalMutation.satisfiesProductionMutationNoMutationEvidence === false,
  "local H6 rehearsal mutation matrix must not satisfy production mutation/no-mutation evidence",
);
assert(
  rehearsalMutation.satisfiesSbfLiveLineage === false,
  "local H6 rehearsal mutation matrix must not satisfy live lineage",
);

for (const field of [
  "satisfiesProductionVerifierAdapterAcceptance",
  "satisfiesProductionMutationNoMutationEvidence",
  "satisfiesDeploymentLineage",
  "satisfiesSbfLiveLineage",
  "satisfiesAuditReviewerAcceptance",
]) {
  assert(localRehearsal[field] === false, `local H6 rehearsal ${field} must stay false`);
}
for (const marker of [
  "refs-only local H6 SBF lineage rehearsal",
  "local rebuilt spend SBF hash",
  "local unsafe generated verifier SBF hash",
  "not a deployed spend program",
  "not a deployed verifier program",
  "not production verifier-adapter acceptance",
  "not production mutation/no-mutation evidence",
  "not SBF/live lineage",
]) {
  includes(localRehearsal.truthBoundary ?? "", marker, "local H6 rehearsal truth boundary");
}

const blocked = packet.blockedPrerequisiteRefs ?? {};
for (const [key, expected] of [
  ["productionArtifactAcceptanceGate", acceptanceGatePath],
  ["productionProofFormat", proofFormatPath],
  ["productionVerifyingKey", productionVkPath],
  ["verifierAdapterAcceptance", adapterPath],
]) {
  assert(blocked[key]?.artifactRef === expected, `blocked prerequisite ${key} artifact ref mismatch`);
  assert(blocked[key]?.satisfiesSbfLiveLineage === false, `blocked prerequisite ${key} must not satisfy live lineage`);
}

const criteria = mapById(packet.lineageAcceptanceCriteria, "lineage acceptance criteria");
for (const id of [
  "reviewed-production-artifact-bundle",
  "fresh-rebuilt-spend-sbf",
  "accepted-verifier-program-sbf",
  "spend-program-deploy",
  "verifier-program-deploy",
  "pool-reinitialization-or-migration",
  "verifier-key-registration",
  "live-proof-enforced-path-receipt",
  "audit-reviewer-acceptance",
]) {
  const entry = criteria.get(id);
  assert(entry, `lineage acceptance criteria missing ${id}`);
  assert(entry.currentRef === null, `lineage acceptance criteria ${id} currentRef must stay null`);
  assert(entry.satisfiesSbfLiveLineage === false, `lineage acceptance criteria ${id} must not satisfy live lineage`);
}

for (const [field, expected] of [
  ["backendSelection", true],
  ["productionArtifactAcceptance", false],
  ["actualPrivateSpendProductionProofFormat", false],
  ["productionVerifyingKeyHash", false],
  ["verifierAdapter", false],
  ["acceptedProofMutatesStateTest", false],
  ["invalidProofLeavesAccountsUnchangedTest", false],
  ["wrongPublicInputHashLeavesAccountsUnchangedTest", false],
  ["wrongVerifyingKeyLeavesAccountsUnchangedTest", false],
  ["sbfLiveLineage", false],
  ["auditReviewerAcceptance", false],
]) {
  assert(packet.satisfiesRequiredPositiveEvidence?.[field] === expected, `${field} evidence mismatch`);
}

const candidateLineage = candidate.requiredPositiveEvidence?.find((entry) => entry.id === "sbf-live-lineage");
assert(candidateLineage?.currentArtifactRef === null, "candidate SBF/live lineage ref must remain null");
assert(candidateLineage?.status === "blocked", "candidate SBF/live lineage must remain blocked");
includes(
  candidateLineage?.truthBoundary ?? "",
  "Fresh local SBF ABI status is not live redeploy or reinitialization evidence",
  "candidate SBF/live lineage truth boundary",
);
const acceptanceLineage = acceptanceGate.acceptanceCriteria?.find((entry) => entry.id === "sbf-live-lineage");
assert(acceptanceLineage?.currentRef === null, "acceptance gate SBF/live lineage currentRef must remain null");
assert(
  acceptanceGate.satisfiesRequiredPositiveEvidence?.sbfLiveLineage === false,
  "acceptance gate must not satisfy SBF/live lineage",
);
assert(
  adapter.satisfiesRequiredPositiveEvidence?.sbfLiveLineage === false,
  "adapter packet must not satisfy SBF/live lineage",
);
assert(
  localInventory.artifacts?.solanaVerifierSbf?.satisfiesSbfLiveLineage === false,
  "local inventory verifier SBF must not satisfy live lineage",
);

for (const command of [
  "npm run zk:c01-sbf-live-lineage-candidate-check",
  "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "npm run private-pool-v2:sbf-abi-check",
  "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-verifier-adapter-test-candidate-check",
]) {
  assert(packet.canonicalCommands?.includes(command), `packet canonical commands missing ${command}`);
}
for (const marker of [
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json",
  "npm run zk:c01-sbf-live-lineage-candidate-check",
  "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "blocked-no-rebuilt-redeployed-reinitialized-live-lineage",
  "blocked-no-sbf-live-lineage-acceptance",
  "local-h6-sbf-lineage-rehearsal-only",
  "not SBF/live lineage",
]) {
  includes(decision, marker, "C01 backend decision");
  includes(auditPackage, marker, "audit package");
  includes(operatorRunbook, marker, "operator runbook");
  includes(review, marker, "VANTA_ZK_REVIEW");
}

const c01 = ledger.findings.find((finding) => finding.id === "VANTA-ZK-2026-05-09-C01");
assert(c01, "missing C01 finding");
includes(c01.codexRemediation.summary, "SBF/live lineage candidate packet", "C01 finding summary");
includes(c01.truthBoundary, "not SBF/live lineage", "C01 finding truth boundary");
includes(c01.verification.commands.join("\n"), "npm run zk:c01-sbf-live-lineage-candidate-check", "C01 verification commands");

console.log("private-pool-v2 C01 SBF/live lineage candidate: PASS");

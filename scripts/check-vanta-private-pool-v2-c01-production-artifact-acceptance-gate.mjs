import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const optionsPath = "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const routePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json";
const preflightPath =
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json";
const proofFormatPath = "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const productionVkPath = "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json";
const adapterTestPath = "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json";
const localInventoryPath =
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-local-artifact-inventory.evidence.json";
const publicWitnessPath = "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";

function fail(message) {
  console.error(`private-pool-v2 C01 production artifact acceptance gate: FAIL - ${message}`);
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

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const candidate = readJson(candidatePath);
const options = readJson(optionsPath);
const acquisition = readJson(acquisitionPath);
const route = readJson(routePath);
const preflight = readJson(preflightPath);
const proofFormat = readJson(proofFormatPath);
const productionVk = readJson(productionVkPath);
const adapterTest = readJson(adapterTestPath);
const localInventory = readJson(localInventoryPath);
const publicWitness = readJson(publicWitnessPath);
const decision = read(decisionPath);

assert(
  scripts["zk:c01-production-artifact-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-artifact-acceptance-gate.mjs",
  "package.json must expose zk:c01-production-artifact-acceptance-gate-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-production-artifact-acceptance-gate-check"),
    `${aggregate} must include the production artifact acceptance gate guard`,
  );
}

assert(
  packet.version === "vanta-private-pool-v2-c01-production-artifact-acceptance-gate-0.1",
  "schema mismatch",
);
assert(packet.status === "blocked-no-reviewed-production-artifact-bundle", "status mismatch");
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(packet.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route id mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(
  packet.secretPolicy ===
    "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-or-signed-transaction-bytes",
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
  "signedTransactionBytes",
  "bearer ",
  "postgres://",
  "postgresql://",
  "-----BEGIN",
]) {
  assert(!packetText.includes(marker), `packet must not contain forbidden marker ${marker}`);
}

assertAllowedKeys(packet, "acceptance gate packet", [
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
  "secretPolicy",
  "purpose",
  "candidatePacketRef",
  "backendOptionsRef",
  "artifactAcquisitionPacketRef",
  "routePacketRef",
  "productionGroth16ToolchainPreflightRef",
  "groth16ProofFormatCandidateRef",
  "productionVerifyingKeyCandidateRef",
  "verifierAdapterTestCandidateRef",
  "localSunspotGnarkLocalArtifactInventoryRef",
  "publicWitnessBindingObservationRef",
  "decisionPacketRef",
  "requiredProductionBundleShape",
  "currentAcceptedProductionBundle",
  "localArtifactInventoryPolicy",
  "acceptanceCriteria",
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
  ["routePacketRef", routePath],
  ["productionGroth16ToolchainPreflightRef", preflightPath],
  ["groth16ProofFormatCandidateRef", proofFormatPath],
  ["productionVerifyingKeyCandidateRef", productionVkPath],
  ["verifierAdapterTestCandidateRef", adapterTestPath],
  ["localSunspotGnarkLocalArtifactInventoryRef", localInventoryPath],
  ["publicWitnessBindingObservationRef", publicWitnessPath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(packet[field] === expected, `${field} mismatch`);
}

const shape = packet.requiredProductionBundleShape ?? {};
assertAllowedKeys(shape, "required production bundle shape", [
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
  "verifyingKeyHashKind",
  "sourceAcirSha256",
  "status",
]);
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["routeId", "sunspot-noir-acir-gnark-groth16-solana-v0"],
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
  ["sourceAcirSha256", acquisition.sourceCircuit?.compiledAcirSha256],
  ["status", "required-before-production-acceptance"],
]) {
  assert(shape[field] === expected, `required production bundle shape ${field} mismatch`);
}
assert(route.routeId === shape.routeId, "route packet route id mismatch");
assert(preflight.sunspotGroth16RouteRef === routePath, "preflight must reference route packet");
assert(proofFormat.requiredCandidateShape?.proofFormatId === shape.proofFormatId, "proof format id mismatch");
assert(
  productionVk.requiredVerifyingKeyShape?.verifyingKeyHashKind === shape.verifyingKeyHashKind,
  "production VK hash kind mismatch",
);
assert(publicWitness.observedPublicWitness?.decodedPublicInputs?.[0]?.label === shape.publicInputLabel, "public input label mismatch");

const accepted = packet.currentAcceptedProductionBundle ?? {};
assertAllowedKeys(accepted, "current accepted production bundle", [
  "status",
  "bundleRef",
  "pinnedToolchainSourceRef",
  "reviewedToolchainBuildRef",
  "trustedSetupOrMitigationRef",
  "proofFormatArtifactRef",
  "productionVerifyingKeyArtifactRef",
  "productionVerifyingKeyHash",
  "publicWitnessArtifactRef",
  "verifierAdapterOrProgramRef",
  "validProofMutationTestRef",
  "invalidProofNoMutationTestRef",
  "wrongPublicInputNoMutationTestRef",
  "wrongVerifyingKeyNoMutationTestRef",
  "sbfLiveLineageRef",
  "auditReviewerAcceptanceRef",
  "satisfiesProductionArtifactAcceptance",
]);
assert(accepted.status === "absent", "accepted production bundle must be absent");
assertNullRefs(accepted, "accepted production bundle", [
  "bundleRef",
  "pinnedToolchainSourceRef",
  "reviewedToolchainBuildRef",
  "trustedSetupOrMitigationRef",
  "proofFormatArtifactRef",
  "productionVerifyingKeyArtifactRef",
  "productionVerifyingKeyHash",
  "publicWitnessArtifactRef",
  "verifierAdapterOrProgramRef",
  "validProofMutationTestRef",
  "invalidProofNoMutationTestRef",
  "wrongPublicInputNoMutationTestRef",
  "wrongVerifyingKeyNoMutationTestRef",
  "sbfLiveLineageRef",
  "auditReviewerAcceptanceRef",
]);
assert(accepted.satisfiesProductionArtifactAcceptance === false, "accepted bundle must not satisfy acceptance");

const local = packet.localArtifactInventoryPolicy ?? {};
assertAllowedKeys(local, "local artifact inventory policy", [
  "status",
  "artifactRef",
  "command",
  "proofSha256",
  "publicWitnessSha256",
  "verifyingKeySha256",
  "verifyingKeyHashKind",
  "solanaVerifierSbfSha256",
  "promotableToProductionEvidence",
  "comparisonOnly",
  "truthBoundary",
]);
assert(local.status === localInventory.status, "local inventory status mismatch");
assert(local.artifactRef === localInventoryPath, "local inventory artifact ref mismatch");
assert(local.command === "npm run zk:c01-sunspot-gnark-local-artifact-inventory-check", "local inventory command mismatch");
assert(local.proofSha256 === localInventory.artifacts?.proof?.sha256, "local proof hash mismatch");
assert(local.publicWitnessSha256 === localInventory.artifacts?.publicWitness?.sha256, "local public witness hash mismatch");
assert(local.verifyingKeySha256 === localInventory.artifacts?.verifyingKey?.sha256, "local VK hash mismatch");
assert(local.verifyingKeyHashKind === "local-unsafe-sunspot-vk-hash-not-production", "local VK hash kind mismatch");
assert(local.solanaVerifierSbfSha256 === localInventory.artifacts?.solanaVerifierSbf?.sha256, "local SBF hash mismatch");
assert(local.promotableToProductionEvidence === false, "local inventory must not be promotable");
assert(local.comparisonOnly === true, "local inventory must be comparison-only");
for (const marker of [
  "local inventory can be used only to compare expected C01 shapes",
  "cannot satisfy production proof-format",
  "production verifying-key",
  "verifier-adapter",
]) {
  includes(local.truthBoundary ?? "", marker, "local inventory policy truth boundary");
}

const criteria = mapById(packet.acceptanceCriteria, "acceptance criteria");
for (const [id, shapeRef] of [
  ["pinned-reviewed-toolchain-source", "source:<pinned-reviewed-sunspot-gnark-source-or-release-ref>"],
  ["reproducible-toolchain-build-review", "review:<reproducible-toolchain-build-review-ref>"],
  ["trusted-setup-or-toxic-waste-mitigation", "setup:<reviewed-ceremony-or-toxic-waste-mitigation-ref>"],
  ["deterministic-production-proof-format-artifact", "artifact:<actual-private-spend-production-groth16-proof-format-ref>"],
  ["production-verifying-key-artifact-and-hash", "artifact+sha256:<actual-private-spend-production-vk-ref-and-hash>"],
  ["public-witness-binding-artifact", "artifact:<public-witness-values-ref-bound-to-private-spend-public-input-hash>"],
  ["accepted-verifier-adapter-or-program", "adapter:<accepted-solana-groth16-verifier-adapter-or-program-ref>"],
  ["valid-proof-mutates-nullifier-output-state", "test:<valid-proof-mutates-nullifier-output-state-ref>"],
  ["invalid-proof-leaves-account-bytes-unchanged", "test:<invalid-proof-leaves-account-bytes-unchanged-ref>"],
  ["wrong-public-input-leaves-account-bytes-unchanged", "test:<wrong-public-input-hash-leaves-account-bytes-unchanged-ref>"],
  ["wrong-verifying-key-leaves-account-bytes-unchanged", "test:<wrong-verifying-key-leaves-account-bytes-unchanged-ref>"],
  ["sbf-live-lineage", "lineage:<rebuilt-redeployed-reinitialized-sbf-and-account-evidence-ref>"],
  ["audit-reviewer-acceptance", "audit-or-review:<selected-verifier-backend-accepted-for-c01-ref>"],
]) {
  const criterion = criteria.get(id);
  assert(criterion, `missing criterion ${id}`);
  assert(criterion.requiredRefShape === shapeRef, `${id} ref shape mismatch`);
  assert(criterion.currentRef === null, `${id} currentRef must stay null`);
  assert(criterion.satisfiesC01PositiveEvidence === false, `${id} must not satisfy C01 evidence`);
}

assertStringArray(packet.promotionRules, "promotionRules");
for (const rule of [
  "production bundle refs must be references only; raw proof, verifying-key, proving-key, witness, keypair, secret, and signed transaction bytes stay out of git",
  "local /private/tmp Sunspot/Gnark outputs are comparison metadata only and cannot fill production currentRef fields",
  "production proof-format and production verifying-key refs must agree on circuit, source ACIR hash, proof format id, proof byte length, public-witness byte length, generated verifier public input count, and public input label",
  "verifier adapter acceptance can promote only after production proof-format and production verifying-key evidence exist",
  "valid mutation and invalid/wrong-input/wrong-key no-mutation evidence must run under the accepted verifier boundary",
  "SBF/live lineage and audit/reviewer acceptance remain separate required refs",
]) {
  assert(packet.promotionRules.includes(rule), `missing promotion rule ${rule}`);
}

assertAllowedKeys(packet.satisfiesRequiredPositiveEvidence, "satisfiesRequiredPositiveEvidence", [
  "backendSelection",
  "productionArtifactAcceptance",
  "actualPrivateSpendProductionProofFormat",
  "privateSpendPublicInputHashBinding",
  "productionVerifyingKeyHash",
  "verifierAdapter",
  "acceptedProofMutatesStateTest",
  "invalidProofLeavesAccountsUnchangedTest",
  "wrongPublicInputHashLeavesAccountsUnchangedTest",
  "wrongVerifyingKeyLeavesAccountsUnchangedTest",
  "sbfLiveLineage",
  "auditReviewerAcceptance",
]);
assert(packet.satisfiesRequiredPositiveEvidence.backendSelection === true, "backend selection must remain true");
for (const field of [
  "productionArtifactAcceptance",
  "actualPrivateSpendProductionProofFormat",
  "privateSpendPublicInputHashBinding",
  "productionVerifyingKeyHash",
  "verifierAdapter",
  "acceptedProofMutatesStateTest",
  "invalidProofLeavesAccountsUnchangedTest",
  "wrongPublicInputHashLeavesAccountsUnchangedTest",
  "wrongVerifyingKeyLeavesAccountsUnchangedTest",
  "sbfLiveLineage",
  "auditReviewerAcceptance",
]) {
  assert(packet.satisfiesRequiredPositiveEvidence[field] === false, `${field} must remain false`);
}
assertStringArray(packet.forbiddenPromotions, "forbiddenPromotions");
assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "npm run zk:c01-sunspot-gnark-local-artifact-inventory-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
]) {
  assert(packet.canonicalCommands.includes(command), `missing canonical command ${command}`);
}

assert(acquisition.productionArtifactAcceptanceGateRef === packetPath, "acquisition packet must reference gate");
assert(
  proofFormat.productionArtifactAcceptanceGateRef?.artifactRef === packetPath,
  "proof-format packet must reference gate",
);
assert(
  productionVk.productionArtifactAcceptanceGateRef?.artifactRef === packetPath,
  "production VK packet must reference gate",
);
assert(
  adapterTest.blockedPrerequisiteRefs?.productionArtifactAcceptanceGate?.artifactRef === packetPath,
  "adapter-test packet must reference gate",
);
assert(
  options.backendOptions
    ?.find((entry) => entry.id === "groth16-tag3-solana-v0")
    ?.productionArtifactAcceptanceGateRef?.artifactRef === packetPath,
  "backend options must reference gate",
);
const candidateGateRef = candidate.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-production-artifact-acceptance-gate",
);
assert(candidateGateRef?.status === "blocked-no-reviewed-production-artifact-bundle", "candidate gate status mismatch");
assert(candidateGateRef?.artifactRef === packetPath, "candidate gate artifact ref mismatch");
assert(
  candidateGateRef?.command === "npm run zk:c01-production-artifact-acceptance-gate-check",
  "candidate gate command mismatch",
);
includes(
  candidateGateRef?.truthBoundary ?? "",
  "does not satisfy production proof-format, production verifying-key, verifier-adapter, mutation/no-mutation, SBF/live-lineage, or audit evidence",
  "candidate gate truth boundary",
);
for (const id of [
  "actual-private-spend-production-proof-format",
  "private-spend-public-input-hash-binding",
  "production-verifying-key-hash",
  "verifier-adapter",
  "accepted-proof-mutates-state-test",
  "invalid-proof-leaves-accounts-unchanged-test",
  "wrong-public-input-hash-leaves-accounts-unchanged-test",
  "wrong-verifying-key-leaves-accounts-unchanged-test",
  "sbf-live-lineage",
  "audit-reviewer-acceptance",
]) {
  const evidence = candidate.requiredPositiveEvidence?.find((entry) => entry.id === id);
  assert(evidence?.status === "blocked", `candidate ${id} must stay blocked`);
  assert(evidence?.currentArtifactRef === null, `candidate ${id} currentArtifactRef must stay null`);
}

for (const marker of [
  "Production Artifact Acceptance Gate packet",
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "blocked-no-reviewed-production-artifact-bundle",
  "does not satisfy production proof-format evidence",
]) {
  includes(decision, marker, decisionPath);
}
for (const phrase of [
  "blocked production artifact acceptance gate for the selected C01 backend",
  "local unsafe Sunspot/Gnark artifacts cannot be promoted",
  "not production proof-format evidence",
  "not verifier-adapter acceptance",
  "not C01 closure",
]) {
  includes(packet.truthBoundary ?? "", phrase, "acceptance gate truth boundary");
}

console.log("private-pool-v2 C01 production artifact acceptance gate: PASS");

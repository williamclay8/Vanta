import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json";
const devProbePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json";
const proofFormatCandidatePath =
  "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const artifactAcquisitionPath =
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const verifierCandidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const beta18H6MigrationProbePath = "ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json";
const localArtifactInventoryPath =
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-local-artifact-inventory.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const localProofReceiptPath =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json";

const publicWitnessByteLength = 44;
const publicWitnessHeaderHex = "000000010000000000000001";
const decodedPublicInputValue =
  "0x0421d1c89c8353818f26d6efcd44b4222a2de2b1f14b8287c59728573a90dd32";
const currentLocalProofReceiptPublicInputValue =
  "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b";
const decodedPublicInputLabel = "private-spend-public-input-hash";
const publicWitnessSha256 =
  "sha256:885351f63518202c4fcd120af8ffc296a8706edae14ed4795c11795dfd7f90e3";
const h6PublicWitnessSha256 =
  "sha256:19e42b6e34a5861d8804565476d72f8835c81d30cfc66bd598a236d26e1baa60";
const publicInputCommitment =
  "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2";

function read(relativePath) {
  const path = resolve(repoRoot, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Missing ${relativePath}.`);
  }

  return readFileSync(path, "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function fail(message) {
  console.error(`private-pool-v2 C01 public-witness binding: FAIL - ${message}`);
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

function sha256(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

function assertFalseProductionEvidence(value, label) {
  for (const field of [
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
    assert(value?.[field] === false, `${label}.${field} must remain false`);
  }
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const devProbe = readJson(devProbePath);
const proofFormatCandidate = readJson(proofFormatCandidatePath);
const artifactAcquisition = readJson(artifactAcquisitionPath);
const verifierCandidate = readJson(verifierCandidatePath);
const beta18H6MigrationProbe = readJson(beta18H6MigrationProbePath);
const localArtifactInventory = readJson(localArtifactInventoryPath);
const localProofReceipt = readJson(localProofReceiptPath);
const decision = read(decisionPath);

assert(
  scripts["zk:c01-public-witness-binding-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-public-witness-binding.mjs",
  "package.json must expose zk:c01-public-witness-binding-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-public-witness-binding-check"),
    `${aggregate} must include the C01 public-witness binding guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-adapter-seam-check"),
    `${aggregate} must include the C01 verifier adapter seam guard`,
  );
}

assert(packet.version === "vanta-private-pool-v2-c01-public-witness-binding-evidence-0.1", "schema mismatch");
assert(
  packet.status === "local-public-witness-decoded-stale-against-current-proof-receipt",
  "status mismatch",
);
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(packet.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route id mismatch");
for (const field of [
  "mainnetReady",
  "productionReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(
  packet.secretPolicy ===
    "metadata-and-public-input-binding-only-no-raw-proof-vk-private-witness-keypair-or-signed-transaction-bytes",
  "secret policy mismatch",
);
for (const forbidden of [
  "proofBytes",
  "proofHex",
  "rawProof",
  "verifyingKeyBytes",
  "vkBytes",
  "witnessBytes",
  "seed phrase",
  "private key",
  "signed transaction",
  "bearer ",
  "postgres://",
  "postgresql://",
  "-----BEGIN",
]) {
  assert(!packetText.includes(forbidden), `packet must not contain forbidden byte/secret marker ${forbidden}`);
}

for (const [field, expected] of [
  ["devProbePacketRef", devProbePath],
  ["proofFormatCandidateRef", proofFormatCandidatePath],
  ["artifactAcquisitionPacketRef", artifactAcquisitionPath],
  ["verifierCandidatePacketRef", verifierCandidatePath],
  ["decisionPacketRef", decisionPath],
  ["localProofReceiptRef", localProofReceiptPath],
]) {
  assert(packet[field] === expected, `${field} mismatch`);
}
assert(devProbe.artifactAcquisitionPacketRef === artifactAcquisitionPath, "dev probe acquisition ref mismatch");
assert(proofFormatCandidate.localSunspotGroth16DevProbeRef === devProbePath, "proof-format dev-probe ref mismatch");
assert(artifactAcquisition.localSunspotGroth16DevProbeRef === devProbePath, "artifact acquisition dev-probe ref mismatch");
assert(
  artifactAcquisition.localSunspotPublicWitnessBindingObservationRef?.artifactRef === packetPath,
  "artifact acquisition packet must reference the public-witness binding observation",
);
assert(
  proofFormatCandidate.localSunspotPublicWitnessBindingObservation?.artifactRef === packetPath,
  "proof-format packet must reference the public-witness binding observation",
);
const publicWitnessRef = verifierCandidate.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "local-sunspot-public-witness-binding-observation",
);
assert(publicWitnessRef?.artifactRef === packetPath, "verifier candidate must reference public-witness binding packet");
assert(
  publicWitnessRef?.command === "npm run zk:c01-public-witness-binding-check",
  "verifier candidate must record public-witness binding guard",
);

const observed = packet.observedPublicWitness ?? {};
assert(observed.storedInRepo === false, "public witness must not be stored in the repo");
assert(observed.byteLength === publicWitnessByteLength, "public witness byte length mismatch");
assert(observed.sha256 === publicWitnessSha256, "public witness hash mismatch");
assert(observed.encoding === "gnark public witness WriteTo", "public witness encoding mismatch");
assert(
  observed.layout === "12-byte header + 1 * 32-byte big-endian BN254 field",
  "public witness layout mismatch",
);
assert(observed.header?.hex === publicWitnessHeaderHex, "public witness header mismatch");
assert(observed.header?.byteLength === 12, "public witness header byte length mismatch");
assert(observed.header?.publicInputs === 1, "public witness header public input count mismatch");
assert(observed.header?.privateInputs === 0, "public witness header private input count mismatch");
assert(observed.header?.vectorEntries === 1, "public witness header vector entry count mismatch");
assert(Array.isArray(observed.decodedPublicInputs), "decoded public inputs must be an array");
assert(observed.decodedPublicInputs.length === 1, "decoded public input count mismatch");
const decoded = observed.decodedPublicInputs[0] ?? {};
assert(decoded.index === 0, "decoded public input index mismatch");
assert(decoded.label === decodedPublicInputLabel, "decoded public input label mismatch");
assert(decoded.value === decodedPublicInputValue, "decoded public input value mismatch");
assert(decoded.byteOffset === 12, "decoded public input byte offset mismatch");
assert(decoded.byteLength === 32, "decoded public input byte length mismatch");
assert(decoded.endian === "big", "decoded public input endian mismatch");
assert(
  observed.matchesLocalProofReceiptPublicInput === false,
  "stale beta18 public witness must not claim it matches the current local proof receipt public input",
);
assert(observed.matchesGeneratedVerifierNrPubinputs === true, "must match generated verifier public input count");
assert(observed.staleAgainstCurrentProofReceipt === true, "public witness must record stale receipt boundary");
assert(observed.satisfiesProductionPublicInputBinding === false, "must not satisfy production binding");

const receiptObservation = packet.localProofReceiptObservation ?? {};
assert(receiptObservation.circuit === "vanta_private_pool_v2_actual_private_spend_entry", "receipt circuit mismatch");
assert(receiptObservation.proofSystem === "noir-bb", "receipt proof system mismatch");
assert(receiptObservation.proofBackend === "local-bb-fixture-artifact", "receipt proof backend mismatch");
assert(receiptObservation.publicInputLabel === decodedPublicInputLabel, "receipt public input label mismatch");
assert(
  receiptObservation.publicInputValue === currentLocalProofReceiptPublicInputValue,
  "receipt public input value mismatch",
);
assert(receiptObservation.publicInputCommitment === publicInputCommitment, "receipt public input commitment mismatch");
assert(receiptObservation.verified === true, "receipt must be verified");
assert(receiptObservation.satisfiesProductionPublicInputBinding === false, "receipt must not satisfy production binding");

assert(localProofReceipt.circuit === receiptObservation.circuit, "local proof receipt circuit mismatch");
assert(localProofReceipt.proofSystem === receiptObservation.proofSystem, "local proof receipt proof system mismatch");
assert(localProofReceipt.proofBackend === receiptObservation.proofBackend, "local proof receipt proof backend mismatch");
assert(localProofReceipt.publicInputLabels?.[0] === decodedPublicInputLabel, "local proof receipt public input label mismatch");
assert(
  localProofReceipt.publicInputs?.[0] === currentLocalProofReceiptPublicInputValue,
  "local proof receipt public input mismatch",
);
assert(localProofReceipt.publicInputCommitment === publicInputCommitment, "local proof receipt commitment mismatch");
assert(localProofReceipt.publicInputCount === 1, "local proof receipt public input count mismatch");
assert(localProofReceipt.verified === true, "local proof receipt must remain verified");

const h6PublicWitness = packet.localH6ProbePublicWitness ?? {};
assert(h6PublicWitness.storedInRepo === false, "H6 public witness must not be stored in the repo");
assert(h6PublicWitness.byteLength === publicWitnessByteLength, "H6 public witness byte length mismatch");
assert(h6PublicWitness.sha256 === h6PublicWitnessSha256, "H6 public witness hash mismatch");
assert(h6PublicWitness.encoding === "gnark public witness WriteTo", "H6 public witness encoding mismatch");
assert(
  h6PublicWitness.layout === "12-byte header + 1 * 32-byte big-endian BN254 field",
  "H6 public witness layout mismatch",
);
assert(h6PublicWitness.header?.hex === publicWitnessHeaderHex, "H6 public witness header mismatch");
assert(h6PublicWitness.header?.byteLength === 12, "H6 public witness header byte length mismatch");
assert(h6PublicWitness.header?.publicInputs === 1, "H6 public witness header public input count mismatch");
assert(h6PublicWitness.header?.privateInputs === 0, "H6 public witness header private input count mismatch");
assert(h6PublicWitness.header?.vectorEntries === 1, "H6 public witness header vector entry count mismatch");
assert(Array.isArray(h6PublicWitness.decodedPublicInputs), "H6 decoded public inputs must be an array");
assert(h6PublicWitness.decodedPublicInputs.length === 1, "H6 decoded public input count mismatch");
const h6Decoded = h6PublicWitness.decodedPublicInputs[0] ?? {};
assert(h6Decoded.index === 0, "H6 decoded public input index mismatch");
assert(h6Decoded.label === decodedPublicInputLabel, "H6 decoded public input label mismatch");
assert(
  h6Decoded.value === currentLocalProofReceiptPublicInputValue,
  "H6 decoded public input value mismatch",
);
assert(h6Decoded.byteOffset === 12, "H6 decoded public input byte offset mismatch");
assert(h6Decoded.byteLength === 32, "H6 decoded public input byte length mismatch");
assert(h6Decoded.endian === "big", "H6 decoded public input endian mismatch");
assert(
  h6PublicWitness.matchesLocalProofReceiptPublicInput === true,
  "H6 public witness must match the current local proof receipt public input",
);
assert(
  h6PublicWitness.matchesGeneratedVerifierNrPubinputs === true,
  "H6 public witness must match generated verifier public input count",
);
assert(
  h6PublicWitness.staleAgainstCurrentProofReceipt === false,
  "H6 public witness must not be stale against the current proof receipt",
);
assert(h6PublicWitness.comparisonOnly === true, "H6 public witness must remain comparison-only");
assert(
  h6PublicWitness.sourcePacketRef === beta18H6MigrationProbePath,
  "H6 public witness source packet ref mismatch",
);
assert(
  h6PublicWitness.localArtifactInventoryRef === localArtifactInventoryPath,
  "H6 public witness local artifact inventory ref mismatch",
);
assert(
  h6PublicWitness.satisfiesProductionPublicInputBinding === false,
  "H6 public witness must not satisfy production binding",
);
for (const marker of [
  "matches the current H6 actual-private-spend local proof receipt",
  "local unsafe comparison evidence only",
  "not reviewed production public-input binding evidence",
  "not verifier-adapter acceptance",
  "not SBF/live lineage",
]) {
  includes(h6PublicWitness.truthBoundary ?? "", marker, "H6 public witness truth boundary");
}
const inventoryPublicWitness = localArtifactInventory.artifacts?.publicWitness ?? {};
assert(inventoryPublicWitness.sha256 === h6PublicWitnessSha256, "inventory H6 public witness hash mismatch");
assert(
  inventoryPublicWitness.decodedPublicInputValue === currentLocalProofReceiptPublicInputValue,
  "inventory H6 public witness decoded value mismatch",
);
assert(
  inventoryPublicWitness.matchesLocalProofReceiptPublicInput === true,
  "inventory H6 public witness must match the current proof receipt",
);
assert(
  inventoryPublicWitness.staleAgainstCurrentProofReceipt === false,
  "inventory H6 public witness must not be stale",
);
assert(
  inventoryPublicWitness.satisfiesProductionPublicInputBindingEvidence === false,
  "inventory H6 public witness must not satisfy production binding",
);
assert(
  beta18H6MigrationProbe.localArtifacts?.publicWitness?.sha256 === h6PublicWitnessSha256 ||
    beta18H6MigrationProbe.observedArtifacts?.publicWitness?.sha256 === h6PublicWitnessSha256,
  "H6 migration probe must reference the H6 public witness hash",
);

const sourcePrecheck = packet.sourcePublicWitnessBindingPrecheck ?? {};
assert(sourcePrecheck.status === "source-preadapter-guard-local-only", "source precheck status mismatch");
assert(
  sourcePrecheck.sourceRef === "programs/vanta_private_pool_v2_spend/src/lib.rs",
  "source precheck source ref mismatch",
);
assert(
  sourcePrecheck.command === "npm run zk:c01-verifier-adapter-seam-check",
  "source precheck command mismatch",
);
assert(sourcePrecheck.publicWitnessHeaderHex === publicWitnessHeaderHex, "source precheck header mismatch");
assert(sourcePrecheck.publicWitnessByteLength === publicWitnessByteLength, "source precheck witness length mismatch");
assert(sourcePrecheck.verifierInstructionDataByteLength === 368, "source precheck verifier input length mismatch");
assert(sourcePrecheck.publicInputLabel === decodedPublicInputLabel, "source precheck public input label mismatch");
assert(
  sourcePrecheck.rejectsWrongPublicWitnessBeforeNotWired === true,
  "source precheck must reject wrong public witness before not-wired boundary",
);
assert(
  sourcePrecheck.rejectsBadPublicWitnessHeaderBeforeNotWired === true,
  "source precheck must reject bad public witness header before not-wired boundary",
);
assert(
  sourcePrecheck.satisfiesProductionPublicInputBinding === false,
  "source precheck must not satisfy production public input binding",
);
assert(
  sourcePrecheck.satisfiesVerifierAdapterAcceptance === false,
  "source precheck must not satisfy verifier adapter acceptance",
);
for (const marker of [
  "local preadapter guard",
  "one 32-byte field to equal publicInputHash",
  "source-level drift prevention only",
  "not production public-input binding evidence",
  "not verifier-adapter acceptance",
]) {
  includes(sourcePrecheck.truthBoundary ?? "", marker, "source public-witness precheck truth boundary");
}

assert(devProbe.observedArtifacts?.publicWitness?.byteLength === publicWitnessByteLength, "dev probe witness length mismatch");
assert(devProbe.observedArtifacts?.publicWitness?.sha256 === publicWitnessSha256, "dev probe witness hash mismatch");
assert(
  devProbe.observedArtifacts?.publicWitness?.decodedPublicInputValue === decodedPublicInputValue,
  "dev probe decoded public input mismatch",
);
assert(
  devProbe.observedArtifacts?.publicWitness?.decodedPublicInputLabel === decodedPublicInputLabel,
  "dev probe decoded public input label mismatch",
);
assert(
  devProbe.observedArtifacts?.publicWitness?.matchesLocalProofReceiptPublicInput === false,
  "dev probe must not claim the stale beta18 public witness matches the current local receipt",
);
assert(
  devProbe.observedArtifacts?.generatedVerifierInstructionData?.generatedVerifierNrPubinputs === 1,
  "dev probe generated verifier public input count mismatch",
);
assert(
  proofFormatCandidate.localSunspotPublicWitnessBindingObservation?.publicInputValueRef === packetPath,
  "proof-format public witness value ref mismatch",
);
assert(
  proofFormatCandidate.localSunspotPublicWitnessBindingObservation
    ?.satisfiesPrivateSpendPublicInputHashBinding === false,
  "proof-format public witness observation must not satisfy production binding",
);

assert(packet.satisfiesRequiredPositiveEvidence?.backendSelection === true, "backend selection must stay true");
assert(
  packet.satisfiesRequiredPositiveEvidence?.routeFeasibilityLocalDevProbe === true,
  "route feasibility must stay true",
);
assert(
  packet.satisfiesRequiredPositiveEvidence?.localPreH6PublicWitnessDecoded === true,
  "local pre-H6 public witness decoding observation must be true",
);
assert(
  packet.satisfiesRequiredPositiveEvidence?.localPreH6PublicWitnessBindingObserved === false,
  "stale beta18 public witness must not satisfy local proof-receipt binding observation",
);
assert(
  packet.satisfiesRequiredPositiveEvidence?.localH6ProbePublicWitnessDecoded === true,
  "local H6 probe public witness decoding observation must be true",
);
assert(
  packet.satisfiesRequiredPositiveEvidence?.localH6ProbePublicWitnessBindingObserved === true,
  "local H6 probe public witness must match the current proof receipt as comparison evidence",
);
assert(
  packet.satisfiesRequiredPositiveEvidence?.localH6ProbeComparisonOnly === true,
  "local H6 probe public witness must remain comparison-only",
);
assertFalseProductionEvidence(packet.satisfiesRequiredPositiveEvidence, "satisfiesRequiredPositiveEvidence");
for (const command of [
  "npm run zk:c01-public-witness-binding-check",
  "npm run zk:c01-verifier-adapter-seam-check",
  "npm run zk:c01-sunspot-groth16-dev-probe-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
]) {
  assert(packet.canonicalCommands?.includes(command), `missing canonical command ${command}`);
}

const optional = packet.optionalRawArtifactValidation ?? {};
assert(optional.envVar === "VANTA_C01_GNARK_PUBLIC_WITNESS_PATH", "optional env var mismatch");
assert(optional.status === "optional-not-required-for-default-guard", "optional validation status mismatch");
includes(optional.command ?? "", "npm run zk:c01-public-witness-binding-check", "optional validation command");

for (const marker of [
  "local nonproduction public-witness decoding observation",
  "private-spend-public-input-hash",
  "stale against the current H6 actual-private-spend Noir/bb receipt",
  "H6-preserving local probe public witness matches the current local proof receipt public input as comparison-only evidence",
  "not production proof-format evidence",
  "not production private-spend-public-input-hash binding evidence",
  "not verifier-adapter acceptance",
  "not C01 closure",
]) {
  includes(packet.truthBoundary ?? "", marker, "packet truth boundary");
}
for (const marker of [
  "C01 local public-witness binding observation",
  packetPath,
  "npm run zk:c01-public-witness-binding-check",
  "44-byte public witness",
  decodedPublicInputLabel,
  "not production public-input binding evidence",
]) {
  includes(decision, marker, decisionPath);
}

const rawPublicWitnessPath = process.env.VANTA_C01_GNARK_PUBLIC_WITNESS_PATH;
if (rawPublicWitnessPath) {
  assert(existsSync(rawPublicWitnessPath), `raw public witness path missing: ${rawPublicWitnessPath}`);
  const bytes = readFileSync(rawPublicWitnessPath);
  assert(bytes.byteLength === publicWitnessByteLength, "raw public witness byte length mismatch");
  assert(sha256(bytes) === publicWitnessSha256, "raw public witness hash mismatch");
  assert(bytes.subarray(0, 12).toString("hex") === publicWitnessHeaderHex, "raw public witness header mismatch");
  assert(
    `0x${bytes.subarray(12, 44).toString("hex")}` === decodedPublicInputValue,
    "raw public witness decoded public input mismatch",
  );
}

console.log("private-pool-v2 C01 public-witness binding: PASS");

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const optionsPath = "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json";
const productionVerifyingKeyPath = "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json";
const productionGroth16ToolchainPreflightPath =
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json";
const localSunspotGroth16DevProbePath =
  "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json";
const localSunspotGnarkLocalArtifactInventoryPath =
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-local-artifact-inventory.evidence.json";
const acceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const localSunspotPublicWitnessBindingPath =
  "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json";
const localProofPath = "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 C01 Groth16 proof-format candidate: FAIL - ${message}`);
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

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const candidate = JSON.parse(read(candidatePath));
const options = JSON.parse(read(optionsPath));
const productionVerifyingKey = JSON.parse(read(productionVerifyingKeyPath));
const productionGroth16ToolchainPreflight = JSON.parse(read(productionGroth16ToolchainPreflightPath));
const localSunspotGroth16DevProbe = JSON.parse(read(localSunspotGroth16DevProbePath));
const localSunspotGnarkLocalArtifactInventory = JSON.parse(
  read(localSunspotGnarkLocalArtifactInventoryPath),
);
const acceptanceGate = JSON.parse(read(acceptanceGatePath));
const localSunspotPublicWitnessBinding = JSON.parse(read(localSunspotPublicWitnessBindingPath));
const localProof = JSON.parse(read(localProofPath));
const decision = read(decisionPath);

assert(
  scripts["zk:c01-groth16-proof-format-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-groth16-proof-format-candidate.mjs",
  "package.json must expose zk:c01-groth16-proof-format-candidate-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-groth16-proof-format-candidate-check"),
    `${aggregate} must include the Groth16 proof-format candidate guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-production-verifying-key-candidate-check"),
    `${aggregate} must include the production verifying-key candidate guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-production-groth16-toolchain-preflight-check"),
    `${aggregate} must include the production Groth16 toolchain preflight guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-public-witness-binding-check"),
    `${aggregate} must include the C01 public-witness binding guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sunspot-gnark-local-artifact-inventory-check"),
    `${aggregate} must include the C01 local artifact inventory guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-production-artifact-acceptance-gate-check"),
    `${aggregate} must include the C01 production artifact acceptance gate guard`,
  );
}

assert(
  packet.version === "vanta-private-pool-v2-c01-groth16-proof-format-candidate-evidence-0.1",
  "Groth16 proof-format packet must use the checked schema",
);
assert(
  packet.status === "blocked-no-groth16-production-proof-format-artifact",
  "Groth16 proof-format packet must stay blocked until the artifact exists",
);
assertAllowedKeys(packet, "Groth16 proof-format packet", [
  "version",
  "checkedAt",
  "status",
  "backendOptionId",
  "selectedBackend",
  "selectedBackendStatus",
  "mainnetReady",
  "productionReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "secretPolicy",
  "purpose",
  "candidatePacketRef",
  "backendOptionsRef",
  "productionVerifyingKeyCandidateRef",
  "productionGroth16ToolchainPreflightRef",
  "localSunspotGroth16DevProbeRef",
  "localSunspotGnarkLocalArtifactInventoryRef",
  "productionArtifactAcceptanceGateRef",
  "localProofFormatRef",
  "decisionPacketRef",
  "requiredCandidateShape",
  "currentCandidateArtifact",
  "currentLocalObservation",
  "localSunspotPublicWitnessBindingObservation",
  "localSunspotGroth16DevProbeObservation",
  "mismatch",
  "blockedBy",
  "satisfiesRequiredPositiveEvidence",
  "candidatePacketMustRemain",
  "forbiddenPromotions",
  "canonicalCommands",
  "truthBoundary",
]);
assert(packet.backendOptionId === "groth16-tag3-solana-v0", "packet must bind to the Groth16 tag-3 option");
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "packet must bind to the selected backend");
assert(
  packet.selectedBackendStatus === "selected-pending-production-evidence",
  "packet backend status must remain selected but evidence-blocked",
);
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]) {
  assert(packet[field] === false, `Groth16 proof-format packet ${field} must be false`);
}
assert(
  packet.secretPolicy === "references-and-metadata-only-no-proof-bytes-no-witness-values",
  "packet must forbid proof bytes and witness values",
);
assert(!packetText.includes("proofHex"), "packet must not store raw proof bytes");
for (const phrase of ["raw witness", "private key", "seed phrase", "bearer ", "database url", "signed transaction"]) {
  assert(!packetText.toLowerCase().includes(phrase), `packet must not contain secret-bearing phrase ${phrase}`);
}

for (const [field, expected] of [
  ["candidatePacketRef", candidatePath],
  ["backendOptionsRef", optionsPath],
  ["localProofFormatRef", localProofPath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(packet[field] === expected, `packet ${field} mismatch`);
}
assert(
  packet.localSunspotGroth16DevProbeRef === localSunspotGroth16DevProbePath,
  "packet must reference the local Sunspot Groth16 dev-probe packet",
);
assert(
  packet.localSunspotGnarkLocalArtifactInventoryRef?.artifactRef ===
    localSunspotGnarkLocalArtifactInventoryPath,
  "packet must reference the local Sunspot/Gnark artifact inventory packet",
);
assert(
  packet.localSunspotGnarkLocalArtifactInventoryRef?.command ===
    "npm run zk:c01-sunspot-gnark-local-artifact-inventory-check",
  "packet must record the local artifact inventory guard",
);
assert(
  packet.localSunspotGnarkLocalArtifactInventoryRef?.status ===
    "local-artifact-inventory-observed-nonproduction-unsafe-setup",
  "packet local artifact inventory ref must stay nonproduction",
);
assert(
  packet.localSunspotGnarkLocalArtifactInventoryRef?.satisfiesProductionProofFormatEvidence === false,
  "local artifact inventory ref must not satisfy production proof-format evidence",
);
assert(
  localSunspotGnarkLocalArtifactInventory.status ===
    "local-artifact-inventory-observed-nonproduction-unsafe-setup",
  "local artifact inventory packet status mismatch",
);
assert(
  localSunspotGnarkLocalArtifactInventory.artifacts?.proof?.byteLength === 324,
  "local artifact inventory proof length mismatch",
);
assert(
  localSunspotGnarkLocalArtifactInventory.artifacts?.publicWitness?.byteLength === 44,
  "local artifact inventory public witness length mismatch",
);
assert(
  localSunspotGnarkLocalArtifactInventory.satisfiesRequiredPositiveEvidence
    ?.actualPrivateSpendProductionProofFormat === false,
  "local artifact inventory must not satisfy production proof-format evidence",
);
assert(
  packet.productionArtifactAcceptanceGateRef?.artifactRef === acceptanceGatePath,
  "packet must reference the production artifact acceptance gate packet",
);
assert(
  packet.productionArtifactAcceptanceGateRef?.command ===
    "npm run zk:c01-production-artifact-acceptance-gate-check",
  "packet must record the production artifact acceptance gate guard",
);
assert(
  packet.productionArtifactAcceptanceGateRef?.status === "blocked-no-reviewed-production-artifact-bundle",
  "packet production artifact acceptance gate ref must stay blocked",
);
assert(
  packet.productionArtifactAcceptanceGateRef?.satisfiesProductionProofFormatEvidence === false,
  "production artifact acceptance gate must not satisfy production proof-format evidence",
);
assert(acceptanceGate.status === "blocked-no-reviewed-production-artifact-bundle", "acceptance gate status mismatch");
assert(
  acceptanceGate.groth16ProofFormatCandidateRef === packetPath,
  "acceptance gate must reference proof-format candidate packet",
);
assert(
  acceptanceGate.satisfiesRequiredPositiveEvidence?.actualPrivateSpendProductionProofFormat === false,
  "acceptance gate must not satisfy production proof-format evidence",
);
assert(
  packet.productionVerifyingKeyCandidateRef?.artifactRef === productionVerifyingKeyPath,
  "packet must reference the production verifying-key candidate packet",
);
assert(
  packet.productionVerifyingKeyCandidateRef?.command ===
    "npm run zk:c01-production-verifying-key-candidate-check",
  "packet must record the production verifying-key candidate guard",
);
assert(
  packet.productionVerifyingKeyCandidateRef?.status ===
    "blocked-no-production-verifying-key-hash-artifact",
  "packet production verifying-key ref must stay blocked",
);
assert(
  productionVerifyingKey.status === "blocked-no-production-verifying-key-hash-artifact",
  "production verifying-key candidate packet must remain blocked",
);
assert(
  productionVerifyingKey.satisfiesRequiredPositiveEvidence?.productionVerifyingKeyHash === false,
  "production verifying-key candidate packet must not satisfy production verifying-key evidence",
);
assert(
  packet.productionGroth16ToolchainPreflightRef?.artifactRef === productionGroth16ToolchainPreflightPath,
  "packet must reference the production Groth16 toolchain preflight packet",
);
assert(
  packet.productionGroth16ToolchainPreflightRef?.command ===
    "npm run zk:c01-production-groth16-toolchain-preflight-check",
  "packet must record the production Groth16 toolchain preflight guard",
);
assert(
  packet.productionGroth16ToolchainPreflightRef?.status ===
    "blocked-local-toolchain-no-groth16-scheme",
  "packet production Groth16 toolchain preflight ref must stay blocked",
);
assert(
  productionGroth16ToolchainPreflight.status === "blocked-local-toolchain-no-groth16-scheme",
  "production Groth16 toolchain preflight packet must remain blocked",
);
assert(
  productionGroth16ToolchainPreflight.satisfiesRequiredPositiveEvidence
    ?.actualPrivateSpendProductionProofFormat === false,
  "production Groth16 toolchain preflight packet must not satisfy production proof-format evidence",
);

const required = packet.requiredCandidateShape ?? {};
assertAllowedKeys(required, "required candidate shape", [
  "target",
  "tag",
  "circuit",
  "proofSystem",
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
  "currentProgramReservedProofByteLength",
  "currentProgramReservedPublicWitnessByteLength",
  "currentProgramReservedVerifierInputByteLength",
  "adapterBoundaryStatus",
  "status",
]);
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
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
  ["currentProgramReservedProofByteLength", 324],
  ["currentProgramReservedPublicWitnessByteLength", 44],
  ["currentProgramReservedVerifierInputByteLength", 368],
  [
    "adapterBoundaryStatus",
    "spend-program-tag3-abi-reserves-selected-gnark-tuple-and-dedicated-verifier-cpi-account-fail-closed",
  ],
  ["status", "selected-candidate-format-pending-production-artifact-and-adapter-acceptance"],
]) {
  assert(required[field] === expected, `required candidate shape ${field} mismatch`);
}

const artifact = packet.currentCandidateArtifact ?? {};
assert(artifact.status === "absent", "current Groth16 proof-format artifact must be absent");
assert(artifact.artifactRef === null, "current Groth16 artifact ref must remain null");
assert(artifact.proofFormatId === null, "current Groth16 proof-format id must remain null");
assert(artifact.proofSystem === null, "current Groth16 proof system must remain null");
assert(artifact.proofByteLength === null, "current Groth16 proof length must remain null");
assert(artifact.publicWitnessByteLength === null, "current Groth16 public witness length must remain null");
assert(
  artifact.verifierInstructionDataByteLength === null,
  "current Groth16 verifier instruction-data length must remain null",
);
assert(artifact.verifyingKeyHashKind === null, "current Groth16 VK hash kind must remain null");
assert(artifact.satisfiesProductionProofFormat === false, "absent artifact must not satisfy production format");

const observed = packet.currentLocalObservation ?? {};
const localObserved = localProof.localProofObservation ?? {};
for (const [field, expected] of [
  ["proofSystem", localObserved.proofSystem],
  ["backend", localObserved.backend],
  ["proofByteLength", localObserved.proofByteLength],
  ["proofFieldCount", localObserved.proofFieldCount],
  ["verifyingKeyHashKind", localObserved.verifyingKeyHashKind],
]) {
  assert(observed[field] === expected, `current local observation ${field} must match local proof-format packet`);
}
assert(observed.publicInputLabel === "private-spend-public-input-hash", "local observation must bind private spend input");
assert(observed.status === "local-observation-only", "local observation must remain local-only");
assert(observed.proofSystem !== required.proofSystem, "local proof system must mismatch required Groth16 proof system");
assert(observed.proofByteLength !== required.proofByteLength, "local proof length must mismatch required Groth16 length");
assert(
  observed.verifyingKeyHashKind !== required.verifyingKeyHashKind,
  "local VK hash kind must mismatch production VK hash kind",
);

const publicWitnessBinding = packet.localSunspotPublicWitnessBindingObservation ?? {};
assertAllowedKeys(publicWitnessBinding, "local Sunspot public-witness binding observation", [
  "status",
  "artifactRef",
  "command",
  "publicWitnessByteLength",
  "publicWitnessHeaderHex",
  "decodedPublicInputLabel",
  "publicInputValueRef",
  "matchesLocalProofReceiptPublicInput",
  "matchesGeneratedVerifierNrPubinputs",
  "staleAgainstCurrentProofReceipt",
  "satisfiesPrivateSpendPublicInputHashBinding",
  "satisfiesProductionProofFormatEvidence",
  "truthBoundary",
]);
assert(
  publicWitnessBinding.status === localSunspotPublicWitnessBinding.status,
  "local public-witness binding status mismatch",
);
assert(
  publicWitnessBinding.artifactRef === localSunspotPublicWitnessBindingPath,
  "local public-witness binding artifact ref mismatch",
);
assert(
  publicWitnessBinding.command === "npm run zk:c01-public-witness-binding-check",
  "local public-witness binding command mismatch",
);
assert(publicWitnessBinding.publicWitnessByteLength === 44, "local public-witness binding length mismatch");
assert(
  publicWitnessBinding.publicWitnessHeaderHex === "000000010000000000000001",
  "local public-witness binding header mismatch",
);
assert(
  publicWitnessBinding.decodedPublicInputLabel === "private-spend-public-input-hash",
  "local public-witness binding decoded label mismatch",
);
assert(
  publicWitnessBinding.publicInputValueRef === localSunspotPublicWitnessBindingPath,
  "local public-witness binding value ref mismatch",
);
assert(
  publicWitnessBinding.matchesLocalProofReceiptPublicInput === false,
  "stale beta18 public-witness binding must not claim it matches the current local proof receipt public input",
);
assert(
  publicWitnessBinding.matchesGeneratedVerifierNrPubinputs === true,
  "local public-witness binding must match generated verifier public input count",
);
assert(
  publicWitnessBinding.staleAgainstCurrentProofReceipt === true,
  "local public-witness binding must record stale current-receipt boundary",
);
assert(
  publicWitnessBinding.satisfiesPrivateSpendPublicInputHashBinding === false,
  "local public-witness binding must not satisfy production binding",
);
assert(
  publicWitnessBinding.satisfiesProductionProofFormatEvidence === false,
  "local public-witness binding must not satisfy production proof-format evidence",
);
for (const marker of [
  "local beta18 public-witness file decodes",
  "private-spend-public-input-hash",
  "stale against the current H6 local proof receipt",
  "does not satisfy production private-spend-public-input-hash binding evidence",
]) {
  includes(publicWitnessBinding.truthBoundary ?? "", marker, "local public-witness binding truth boundary");
}

const sunspotDevProbe = packet.localSunspotGroth16DevProbeObservation ?? {};
assertAllowedKeys(sunspotDevProbe, "local Sunspot Groth16 dev-probe observation", [
  "status",
  "artifactRef",
  "command",
  "proofSystem",
  "proofFormatId",
  "proofByteLength",
  "selectedCandidateProofByteLength",
  "currentTag3ProofByteLength",
  "currentTag3PublicWitnessByteLength",
  "legacyRejectedTag3ProofByteLength",
  "publicWitnessByteLength",
  "generatedVerifierInstructionDataByteLength",
  "generatedVerifierExpectedProofByteLength",
  "generatedVerifierNrPubinputs",
  "generatedVerifierCommitmentKeys",
  "standaloneLocalSvmVerificationPassed",
  "standaloneLocalSvmComputeUnits",
  "sunspotReportedPublicInputs",
  "sunspotReportedSecretInputs",
  "setupBoundary",
  "temporarySourceShimCommitted",
  "localVerifierSbfBuilt",
  "satisfiesProductionProofFormatEvidence",
  "satisfiesPrivateSpendPublicInputHashBinding",
  "satisfiesProductionVerifyingKeyEvidence",
  "satisfiesVerifierAdapterEvidence",
  "satisfiesSbfLiveLineage",
  "truthBoundary",
]);
assert(
  sunspotDevProbe.status === localSunspotGroth16DevProbe.status,
  "local Sunspot dev-probe status must match dev-probe packet",
);
assert(
  sunspotDevProbe.artifactRef === localSunspotGroth16DevProbePath,
  "local Sunspot dev-probe artifact ref mismatch",
);
assert(
  sunspotDevProbe.command === "npm run zk:c01-sunspot-groth16-dev-probe-check",
  "local Sunspot dev-probe command mismatch",
);
assert(sunspotDevProbe.proofSystem === "groth16", "local Sunspot dev-probe proof system mismatch");
assert(
  sunspotDevProbe.proofFormatId === required.proofFormatId,
  "local Sunspot dev-probe proof format id must match selected candidate shape",
);
assert(
  sunspotDevProbe.proofByteLength === localSunspotGroth16DevProbe.observedArtifacts?.proof?.byteLength,
  "local Sunspot dev-probe proof length must match dev-probe packet",
);
assert(
  sunspotDevProbe.proofByteLength === required.proofByteLength,
  "local Sunspot dev-probe proof length must match selected candidate shape",
);
assert(
  sunspotDevProbe.selectedCandidateProofByteLength === required.proofByteLength,
  "local Sunspot dev-probe selected proof length must match required shape",
);
assert(
  sunspotDevProbe.currentTag3ProofByteLength === required.currentProgramReservedProofByteLength,
  "local Sunspot dev-probe current tag-3 proof length mismatch",
);
assert(
  sunspotDevProbe.currentTag3PublicWitnessByteLength === required.currentProgramReservedPublicWitnessByteLength,
  "local Sunspot dev-probe current tag-3 public witness length mismatch",
);
assert(
  sunspotDevProbe.legacyRejectedTag3ProofByteLength === 256,
  "local Sunspot dev-probe rejected legacy proof length mismatch",
);
assert(
  sunspotDevProbe.publicWitnessByteLength ===
    localSunspotGroth16DevProbe.observedArtifacts?.publicWitness?.byteLength,
  "local Sunspot dev-probe public witness length must match dev-probe packet",
);
assert(
  sunspotDevProbe.generatedVerifierInstructionDataByteLength ===
    localSunspotGroth16DevProbe.observedArtifacts?.generatedVerifierInstructionData?.totalByteLength,
  "local Sunspot dev-probe generated verifier instruction-data length mismatch",
);
assert(
  sunspotDevProbe.generatedVerifierExpectedProofByteLength ===
    localSunspotGroth16DevProbe.observedArtifacts?.generatedVerifierInstructionData?.proofByteLength,
  "local Sunspot dev-probe generated verifier proof length mismatch",
);
assert(
  sunspotDevProbe.generatedVerifierNrPubinputs ===
    localSunspotGroth16DevProbe.observedArtifacts?.generatedVerifierInstructionData?.generatedVerifierNrPubinputs,
  "local Sunspot dev-probe generated verifier public input count mismatch",
);
assert(
  sunspotDevProbe.generatedVerifierCommitmentKeys ===
    localSunspotGroth16DevProbe.observedArtifacts?.generatedVerifierInstructionData
      ?.generatedVerifierCommitmentKeys,
  "local Sunspot dev-probe generated verifier commitment key count mismatch",
);
assert(
  sunspotDevProbe.standaloneLocalSvmVerificationPassed ===
    localSunspotGroth16DevProbe.observedArtifacts?.generatedVerifierInstructionData?.standaloneLocalSvmAccepted,
  "local Sunspot dev-probe standalone LiteSVM verifier status mismatch",
);
assert(
  sunspotDevProbe.standaloneLocalSvmComputeUnits ===
    localSunspotGroth16DevProbe.observedArtifacts?.generatedVerifierInstructionData?.computeUnitsConsumed,
  "local Sunspot dev-probe standalone LiteSVM compute units mismatch",
);
const sunspotCompileStep = localSunspotGroth16DevProbe.observedProbeFlow?.find(
  (entry) => entry.step === "sunspot-compile",
);
assert(
  sunspotDevProbe.sunspotReportedPublicInputs === sunspotCompileStep?.sunspotReportedPublicInputs,
  "local Sunspot dev-probe public input count mismatch",
);
assert(
  sunspotDevProbe.sunspotReportedSecretInputs === sunspotCompileStep?.sunspotReportedSecretInputs,
  "local Sunspot dev-probe secret input count mismatch",
);
assert(
  sunspotDevProbe.temporarySourceShimCommitted === false,
  "local Sunspot dev-probe temporary source shim must not be committed",
);
assert(sunspotDevProbe.localVerifierSbfBuilt === true, "local Sunspot dev-probe must record local SBF build");
for (const field of [
  "satisfiesProductionProofFormatEvidence",
  "satisfiesPrivateSpendPublicInputHashBinding",
  "satisfiesProductionVerifyingKeyEvidence",
  "satisfiesVerifierAdapterEvidence",
  "satisfiesSbfLiveLineage",
]) {
  assert(sunspotDevProbe[field] === false, `local Sunspot dev-probe ${field} must remain false`);
}
for (const marker of [
  "route feasibility only",
  "standalone verifier accepted",
  "324-byte proof",
  "44-byte public witness",
  "rejects the legacy 256-byte proof-only shape",
  "accepted adapter",
  "zero public and zero secret inputs",
  "one public input",
  "does not satisfy production proof-format evidence",
]) {
  includes(sunspotDevProbe.truthBoundary ?? "", marker, "local Sunspot dev-probe truth boundary");
}

for (const marker of [
  "noir-bb",
  "groth16",
  "16000 bytes",
  "selected Gnark-native candidate proof length is 324 bytes",
  "rejects the legacy 256-byte proof-only payload shape",
  "324-byte proof",
  "44-byte public witness",
  "one public input",
  "zero public and zero secret inputs",
  "local-acir-bytecode-hash-not-production-vk",
  "local beta18 public-witness bytes decode to private-spend-public-input-hash",
  "stale against the current H6 local proof receipt",
]) {
  includes(JSON.stringify(packet.mismatch ?? {}), marker, "Groth16 proof-format mismatch evidence");
}

for (const blocker of [
  "no Groth16 production proof artifact exists for vanta_private_pool_v2_actual_private_spend_entry",
  "local @aztec/bb.js 4.1.3 exposes chonk, avm, and ultra_honk schemes but no Groth16 scheme",
  "local Sunspot/Gnark dev probe used unsafe local setup and a beta18-only temporary source shim",
  "local Sunspot/Gnark dev probe produced the selected Gnark-native 324-byte proof plus 44-byte public witness accepted by a generated standalone verifier",
  "current spend-program tag 3 now reserves the selected Gnark-native 324-byte proof plus 44-byte public-witness tuple fail-closed and rejects the legacy 256-byte proof-only shape, but still needs an accepted adapter shape",
  "local Sunspot/Gnark beta18 public-witness bytes decode to private-spend-public-input-hash but are stale against the current H6 local proof receipt; the observation is local/nonproduction, Sunspot compile output still reported zero public and zero secret inputs, and production private-spend-public-input-hash binding is not accepted",
  "current local proof observation is noir-bb / barretenberg-ultrahonk / 16000 bytes",
  "no production verifying-key hash artifact exists",
  "host-side reserved tag 3 still returns ERR_PROOF_VERIFIER_NOT_WIRED before mutation while SBF has an unaccepted verifier CPI hook",
]) {
  assert(packet.blockedBy?.includes(blocker), `packet missing blocker: ${blocker}`);
}

for (const [field, expected] of [
  ["backendSelection", true],
  ["actualPrivateSpendProductionProofFormat", false],
  ["privateSpendPublicInputHashBinding", false],
  ["productionVerifyingKeyHash", false],
  ["verifierAdapter", false],
  ["acceptedProofMutatesStateTest", false],
  ["invalidProofLeavesAccountsUnchangedTest", false],
  ["sbfLiveLineage", false],
  ["auditReviewerAcceptance", false],
]) {
  assert(packet.satisfiesRequiredPositiveEvidence?.[field] === expected, `${field} must remain ${expected}`);
}
assertStringArray(packet.blockedBy, "packet blockedBy");
assertStringArray(packet.forbiddenPromotions, "packet forbiddenPromotions");
for (const promotion of [
  "solana-c01-groth16-verifier-ready",
  "production-private",
  "mainnet-private",
  "proof-enforced-spend",
  "on-chain proof verified",
  "production verifier accepted",
]) {
  assert(packet.forbiddenPromotions.includes(promotion), `packet must forbid promotion ${promotion}`);
}
assertStringArray(packet.canonicalCommands, "packet canonicalCommands");

assert(candidate.selectedBackend === "groth16-tag3-solana-v0", "candidate packet must keep selectedBackend");
assert(
  candidate.selectedBackendStatus === "selected-pending-production-evidence",
  "candidate packet must keep backend selected but evidence-blocked",
);
const productionFormat = candidate.requiredPositiveEvidence?.find(
  (entry) => entry.id === "actual-private-spend-production-proof-format",
);
assert(productionFormat?.status === "blocked", "candidate production proof-format evidence must remain blocked");
assert(
  productionFormat?.currentArtifactRef === null,
  "candidate production proof-format evidence must not point at the blocked packet",
);
const intermediate = candidate.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-groth16-proof-format-candidate",
);
assert(intermediate?.status === "blocked-no-groth16-production-proof-format-artifact", "candidate ref status mismatch");
assert(intermediate?.artifactRef === packetPath, "candidate must reference Groth16 proof-format packet");
assert(
  intermediate?.command === "npm run zk:c01-groth16-proof-format-candidate-check",
  "candidate must record Groth16 proof-format guard",
);
includes(
  intermediate?.truthBoundary ?? "",
  "does not satisfy production proof-format evidence",
  "candidate Groth16 proof-format truth boundary",
);

const groth16Option = options.backendOptions?.find((entry) => entry.id === "groth16-tag3-solana-v0");
assert(groth16Option, "backend options must include the Groth16 tag-3 option");
assert(
  groth16Option.status === "selected-production-evidence-blocked",
  "Groth16 backend option must remain selected but blocked",
);
assert(groth16Option.proofFormatCandidateRef?.artifactRef === packetPath, "Groth16 option must reference packet");
assert(
  groth16Option.proofFormatCandidateRef?.command === "npm run zk:c01-groth16-proof-format-candidate-check",
  "Groth16 option must record proof-format guard",
);
assert(
  groth16Option.proofFormatCandidateRef?.status ===
    "blocked-no-groth16-production-proof-format-artifact",
  "Groth16 option proof-format ref must stay blocked",
);
assert(
  groth16Option.toolchainPreflightRef?.artifactRef === productionGroth16ToolchainPreflightPath,
  "Groth16 option must reference the production Groth16 toolchain preflight packet",
);
assert(
  groth16Option.toolchainPreflightRef?.status === "blocked-local-toolchain-no-groth16-scheme",
  "Groth16 option toolchain preflight ref must stay blocked",
);
assert(
  options.satisfiesRequiredPositiveEvidence?.actualPrivateSpendProductionProofFormat === false,
  "backend options must not satisfy production proof-format evidence",
);

for (const marker of [
  "Groth16 Proof-Format Candidate packet",
  "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "blocked-no-groth16-production-proof-format-artifact",
  "does not satisfy production proof-format evidence",
]) {
  includes(decision, marker, decisionPath);
}

for (const command of [
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-sunspot-groth16-dev-probe-check",
  "npm run zk:c01-public-witness-binding-check",
  "npm run zk:c01-sunspot-gnark-local-artifact-inventory-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-production-groth16-toolchain-preflight-check",
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run zk:c01-verifier-backend-options-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
]) {
  assert(packet.canonicalCommands?.includes(command), `packet must record canonical command ${command}`);
}
for (const phrase of [
  "blocked Groth16 tag-3 proof-format candidate packet for the selected C01 backend",
  "selected C01 backend",
  "not production proof-format evidence",
  "not tag-3 proof acceptance",
]) {
  includes(packet.truthBoundary ?? "", phrase, "Groth16 proof-format packet truth boundary");
}

console.log("private-pool-v2 C01 Groth16 proof-format candidate: PASS");

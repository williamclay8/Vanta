import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const optionsPath = "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json";
const proofFormatPath = "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const productionGroth16ToolchainPreflightPath =
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json";
const localSunspotGnarkLocalArtifactInventoryPath =
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-local-artifact-inventory.evidence.json";
const acceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const registryPath = "ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json";
const localProofPath = "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 C01 production verifying-key candidate: FAIL - ${message}`);
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
const proofFormat = JSON.parse(read(proofFormatPath));
const productionGroth16ToolchainPreflight = JSON.parse(read(productionGroth16ToolchainPreflightPath));
const localSunspotGnarkLocalArtifactInventory = JSON.parse(
  read(localSunspotGnarkLocalArtifactInventoryPath),
);
const acceptanceGate = JSON.parse(read(acceptanceGatePath));
const registry = JSON.parse(read(registryPath));
const localProof = JSON.parse(read(localProofPath));
const decision = read(decisionPath);

assert(
  scripts["zk:c01-production-verifying-key-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-verifying-key-candidate.mjs",
  "package.json must expose zk:c01-production-verifying-key-candidate-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-production-verifying-key-candidate-check"),
    `${aggregate} must include the production verifying-key candidate guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-production-groth16-toolchain-preflight-check"),
    `${aggregate} must include the production Groth16 toolchain preflight guard`,
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
  packet.version === "vanta-private-pool-v2-c01-production-verifying-key-candidate-evidence-0.1",
  "production verifying-key packet must use the checked schema",
);
assert(
  packet.status === "blocked-no-production-verifying-key-hash-artifact",
  "production verifying-key packet must stay blocked until the artifact exists",
);
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
  assert(packet[field] === false, `production verifying-key packet ${field} must be false`);
}
assert(
  packet.secretPolicy === "references-and-metadata-only-no-verifying-key-bytes-no-proof-bytes-no-witness-values",
  "packet must forbid verifying-key bytes, proof bytes, and witness values",
);
assertAllowedKeys(packet, "production verifying-key packet", [
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
  "groth16ProofFormatCandidateRef",
  "productionGroth16ToolchainPreflightRef",
  "localSunspotGnarkLocalArtifactInventoryRef",
  "productionArtifactAcceptanceGateRef",
  "verifierKeyRegistryRef",
  "localProofFormatRef",
  "decisionPacketRef",
  "requiredVerifyingKeyShape",
  "currentProductionVerifyingKeyArtifact",
  "currentRegistryObservation",
  "currentLocalObservation",
  "mismatch",
  "blockedBy",
  "satisfiesRequiredPositiveEvidence",
  "candidatePacketMustRemain",
  "forbiddenPromotions",
  "canonicalCommands",
  "truthBoundary",
]);
for (const phrase of [
  "verifyingKeyBytes",
  "verifying_key_bytes",
  "vkBytes",
  "proofBytes",
  "proofHex",
  "rawProof",
  "raw proof",
  "witnessBytes",
  "raw witness",
  "private key",
  "seed phrase",
  "bearer ",
  "database url",
  "signed transaction",
]) {
  assert(!packetText.includes(phrase), `packet must not contain secret-bearing or byte-bearing phrase ${phrase}`);
}

for (const [field, expected] of [
  ["candidatePacketRef", candidatePath],
  ["backendOptionsRef", optionsPath],
  ["groth16ProofFormatCandidateRef", proofFormatPath],
  ["verifierKeyRegistryRef", registryPath],
  ["localProofFormatRef", localProofPath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(packet[field] === expected, `packet ${field} mismatch`);
}
assert(
  packet.productionGroth16ToolchainPreflightRef?.artifactRef ===
    productionGroth16ToolchainPreflightPath,
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
  productionGroth16ToolchainPreflight.satisfiesRequiredPositiveEvidence?.productionVerifyingKeyHash ===
    false,
  "production Groth16 toolchain preflight packet must not satisfy production verifying-key evidence",
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
  packet.localSunspotGnarkLocalArtifactInventoryRef?.verifyingKeySha256 ===
    "sha256:5e0a6f08503f534cbb462f43fbf0b247e8aa2ce75d1fa58c2350f815817948b4",
  "packet local unsafe VK hash mismatch",
);
assert(
  packet.localSunspotGnarkLocalArtifactInventoryRef?.verifyingKeyHashKind ===
    "local-unsafe-h6-beta18-sunspot-vk-hash-not-production",
  "packet local unsafe VK hash kind mismatch",
);
assert(
  packet.localSunspotGnarkLocalArtifactInventoryRef?.satisfiesProductionVerifyingKeyEvidence ===
    false,
  "local artifact inventory ref must not satisfy production verifying-key evidence",
);
assert(
  localSunspotGnarkLocalArtifactInventory.artifacts?.verifyingKey?.sha256 ===
    "sha256:5e0a6f08503f534cbb462f43fbf0b247e8aa2ce75d1fa58c2350f815817948b4",
  "local artifact inventory VK hash mismatch",
);
assert(
  localSunspotGnarkLocalArtifactInventory.satisfiesRequiredPositiveEvidence
    ?.productionVerifyingKeyHash === false,
  "local artifact inventory must not satisfy production verifying-key evidence",
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
  packet.productionArtifactAcceptanceGateRef?.satisfiesProductionVerifyingKeyEvidence === false,
  "production artifact acceptance gate must not satisfy production verifying-key evidence",
);
assert(acceptanceGate.status === "blocked-no-reviewed-production-artifact-bundle", "acceptance gate status mismatch");
assert(
  acceptanceGate.productionVerifyingKeyCandidateRef === packetPath,
  "acceptance gate must reference production verifying-key candidate packet",
);
assert(
  acceptanceGate.satisfiesRequiredPositiveEvidence?.productionVerifyingKeyHash === false,
  "acceptance gate must not satisfy production verifying-key evidence",
);

const required = packet.requiredVerifyingKeyShape ?? {};
assertAllowedKeys(required, "required verifying-key shape", [
  "target",
  "tag",
  "circuit",
  "proofSystem",
  "proofFormatId",
  "proofByteLength",
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
  ["proofByteLength", 324],
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
  ["status", "required-before-production-acceptance"],
]) {
  assert(required[field] === expected, `required verifying-key shape ${field} mismatch`);
}

const artifact = packet.currentProductionVerifyingKeyArtifact ?? {};
assertAllowedKeys(artifact, "current production verifying-key artifact", [
  "status",
  "artifactRef",
  "verifyingKeyHash",
  "verifyingKeyHashKind",
  "verifyingKeyId",
  "satisfiesProductionVerifyingKeyEvidence",
]);
assert(artifact.status === "absent", "current production verifying-key artifact must be absent");
assert(artifact.artifactRef === null, "current production verifying-key artifact ref must remain null");
assert(artifact.verifyingKeyHash === null, "current production verifying-key hash must remain null");
assert(artifact.verifyingKeyHashKind === null, "current production verifying-key hash kind must remain null");
assert(artifact.verifyingKeyId === null, "current production verifying-key id must remain null");
assert(
  artifact.satisfiesProductionVerifyingKeyEvidence === false,
  "absent artifact must not satisfy production verifying-key evidence",
);

const registryObservation = packet.currentRegistryObservation ?? {};
assertAllowedKeys(registryObservation, "current registry observation", [
  "status",
  "artifactRef",
  "tag",
  "payloadLayout",
  "recordByteLength",
  "bindsVerifierProgramId",
  "pdaSeed",
  "recordMagic",
  "stillFailsClosedWith",
  "satisfiesProductionVerifyingKeyEvidence",
]);
assert(registryObservation.status === "source-only-registry-metadata", "registry observation must stay source-only");
assert(registryObservation.artifactRef === registryPath, "registry observation must reference registry evidence");
assert(registryObservation.tag === 5, "registry observation must lock tag 5");
assert(
  registryObservation.payloadLayout === "[5, verifierKeyHash:32, verifierProgramId:32]",
  "registry observation payload mismatch",
);
assert(registryObservation.recordByteLength === 112, "registry observation record length mismatch");
assert(registryObservation.bindsVerifierProgramId === true, "registry observation must bind verifier program id");
assert(
  registryObservation.pdaSeed === "[\"vanta2vkey\", pool_state, verifierKeyHash]",
  "registry observation PDA seed mismatch",
);
assert(registryObservation.recordMagic === "VNTA2VKY", "registry observation record magic mismatch");
assert(
  registryObservation.stillFailsClosedWith === "ERR_PROOF_VERIFIER_NOT_WIRED",
  "registry observation must preserve tag-3 fail-closed truth",
);
assert(
  registryObservation.satisfiesProductionVerifyingKeyEvidence === false,
  "registry metadata must not satisfy production verifying-key evidence",
);
assert(registry.status === "source-only-verifier-key-registry-scaffold", "registry packet must stay source-only");
assert(
  registry.satisfiesRequiredPositiveEvidence?.productionVerifyingKeyHash === false,
  "registry packet must not satisfy production verifying-key hash evidence",
);

const observed = packet.currentLocalObservation ?? {};
const localObserved = localProof.localProofObservation ?? {};
assertAllowedKeys(observed, "current local observation", [
  "proofSystem",
  "backend",
  "verifyingKeyHashKind",
  "status",
  "satisfiesProductionVerifyingKeyEvidence",
]);
assert(observed.proofSystem === localObserved.proofSystem, "local proof system must match local proof packet");
assert(observed.backend === localObserved.backend, "local backend must match local proof packet");
assert(
  observed.verifyingKeyHashKind === localObserved.verifyingKeyHashKind,
  "local VK hash kind must match local proof packet",
);
assert(
  observed.verifyingKeyHashKind === "local-acir-bytecode-hash-not-production-vk",
  "local VK hash kind must remain non-production",
);
assert(observed.status === "local-observation-only", "local observation must remain local-only");
assert(
  observed.satisfiesProductionVerifyingKeyEvidence === false,
  "local observation must not satisfy production verifying-key evidence",
);

for (const marker of [
  "source-only tag 5 verifier-key registry metadata",
  "production verifying-key hash artifact",
  "local-acir-bytecode-hash-not-production-vk",
  "Gnark-native Groth16 proof/public-witness artifact is still absent",
]) {
  includes(JSON.stringify(packet.mismatch ?? {}), marker, "production verifying-key mismatch evidence");
}

assertAllowedKeys(packet.mismatch, "production verifying-key mismatch evidence", [
  "registryMetadata",
  "localMetadata",
  "proofFormat",
]);
for (const blocker of [
  "no production verifying-key hash artifact exists for vanta_private_pool_v2_actual_private_spend_entry",
  "local @aztec/bb.js 4.1.3 exposes chonk, avm, and ultra_honk schemes but no Groth16 scheme",
  "source-only tag 5 registry metadata is not production verifying-key evidence",
  "current local proof observation uses local-acir-bytecode-hash-not-production-vk metadata",
  "Groth16 proof-format candidate packet is blocked with no current artifact ref",
  "host-side reserved tag 3 still returns ERR_PROOF_VERIFIER_NOT_WIRED before mutation while SBF has an unaccepted verifier CPI hook",
]) {
  assert(packet.blockedBy?.includes(blocker), `packet missing blocker: ${blocker}`);
}

assertAllowedKeys(packet.satisfiesRequiredPositiveEvidence, "required positive evidence map", [
  "backendSelection",
  "actualPrivateSpendProductionProofFormat",
  "privateSpendPublicInputHashBinding",
  "productionVerifyingKeyHash",
  "verifierAdapter",
  "acceptedProofMutatesStateTest",
  "invalidProofLeavesAccountsUnchangedTest",
  "sbfLiveLineage",
  "auditReviewerAcceptance",
]);
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

assertAllowedKeys(packet.candidatePacketMustRemain, "candidate packet invariant", [
  "selectedBackend",
  "selectedBackendStatus",
  "productionVerifyingKeyHashCurrentArtifactRef",
  "allRequiredPositiveEvidenceStatus",
]);
assertStringArray(packet.blockedBy, "packet blockedBy");
assertStringArray(packet.forbiddenPromotions, "packet forbiddenPromotions");
assertStringArray(packet.canonicalCommands, "packet canonicalCommands");

assert(candidate.selectedBackend === "groth16-tag3-solana-v0", "candidate packet must keep selectedBackend");
assert(
  candidate.selectedBackendStatus === "selected-pending-production-evidence",
  "candidate packet must keep backend selected but evidence-blocked",
);
const productionVk = candidate.requiredPositiveEvidence?.find(
  (entry) => entry.id === "production-verifying-key-hash",
);
assert(productionVk?.status === "blocked", "candidate production verifying-key evidence must remain blocked");
assert(
  productionVk?.currentArtifactRef === null,
  "candidate production verifying-key evidence must not point at the blocked packet",
);
const intermediate = candidate.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-production-verifying-key-candidate",
);
assert(
  intermediate?.status === "blocked-no-production-verifying-key-hash-artifact",
  "candidate production verifying-key ref status mismatch",
);
assert(intermediate?.artifactRef === packetPath, "candidate must reference production verifying-key packet");
assert(
  intermediate?.command === "npm run zk:c01-production-verifying-key-candidate-check",
  "candidate must record production verifying-key guard",
);
includes(
  intermediate?.truthBoundary ?? "",
  "does not satisfy production verifying-key evidence",
  "candidate production verifying-key truth boundary",
);

const groth16Option = options.backendOptions?.find((entry) => entry.id === "groth16-tag3-solana-v0");
assert(groth16Option, "backend options must include the Groth16 tag-3 option");
assert(
  groth16Option.status === "selected-production-evidence-blocked",
  "Groth16 backend option must remain selected but blocked",
);
assert(
  groth16Option.productionVerifyingKeyCandidateRef?.artifactRef === packetPath,
  "Groth16 option must reference production verifying-key packet",
);
assert(
  groth16Option.productionVerifyingKeyCandidateRef?.command ===
    "npm run zk:c01-production-verifying-key-candidate-check",
  "Groth16 option must record production verifying-key guard",
);
assert(
  groth16Option.productionVerifyingKeyCandidateRef?.status ===
    "blocked-no-production-verifying-key-hash-artifact",
  "Groth16 option production verifying-key ref must stay blocked",
);
assert(
  options.satisfiesRequiredPositiveEvidence?.productionVerifyingKeyHash === false,
  "backend options must not satisfy production verifying-key evidence",
);

assert(
  proofFormat.status === "blocked-no-groth16-production-proof-format-artifact",
  "proof-format packet must remain blocked while production VK is absent",
);
assert(
  proofFormat.productionVerifyingKeyCandidateRef?.artifactRef === packetPath,
  "proof-format packet must reference production verifying-key packet",
);
assert(
  proofFormat.productionGroth16ToolchainPreflightRef?.artifactRef ===
    productionGroth16ToolchainPreflightPath,
  "proof-format packet must reference the production Groth16 toolchain preflight packet",
);
assert(
  proofFormat.satisfiesRequiredPositiveEvidence?.productionVerifyingKeyHash === false,
  "proof-format packet must not satisfy production verifying-key evidence",
);

for (const marker of [
  "Production Verifying-Key Candidate packet",
  "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json",
  "npm run zk:c01-production-verifying-key-candidate-check",
  "blocked-no-production-verifying-key-hash-artifact",
  "does not satisfy production verifying-key evidence",
]) {
  includes(decision, marker, decisionPath);
}

for (const command of [
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run zk:c01-production-groth16-toolchain-preflight-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-sunspot-gnark-local-artifact-inventory-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-verifier-key-registry-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
]) {
  assert(packet.canonicalCommands?.includes(command), `packet must record canonical command ${command}`);
}
for (const phrase of [
  "blocked production verifying-key candidate packet for the selected C01 backend",
  "selected C01 backend",
  "not production verifying-key evidence",
  "not tag-3 proof acceptance",
]) {
  includes(packet.truthBoundary ?? "", phrase, "production verifying-key packet truth boundary");
}

console.log("private-pool-v2 C01 production verifying-key candidate: PASS");

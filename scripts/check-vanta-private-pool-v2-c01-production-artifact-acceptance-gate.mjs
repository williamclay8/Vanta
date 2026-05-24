import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const bundleTemplatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const optionsPath = "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const routePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json";
const preflightPath =
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json";
const sourceReviewAcceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json";
const deterministicBuildGatePath =
  "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json";
const adapterAcceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json";
const proofFormatPath = "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const productionVkPath = "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json";
const adapterTestPath = "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json";
const localInventoryPath =
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-local-artifact-inventory.evidence.json";
const publicWitnessPath = "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const currentH6LocalProofReceiptRef =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json";
const currentH6PublicInputValue =
  "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b";
const currentH6PublicInputCommitment =
  "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2";
const staleBeta18PublicWitnessValue =
  "0x0421d1c89c8353818f26d6efcd44b4222a2de2b1f14b8287c59728573a90dd32";
const localBeta18CompiledAcirSha256 =
  "sha256:5e0e27752ff1c0f01d318323083b168c1309c0c84521401531b42d07033c68bf";
const currentSourceAcirRef =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.json";
const productionBundleEnvVar = "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH";

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

function readJsonPath(path, label) {
  const resolved = resolve(repoRoot, path);
  assert(existsSync(resolved), `${label} missing at ${path}`);
  return JSON.parse(readFileSync(resolved, "utf8"));
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

function assertRef(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty ref`);
  assert(!value.includes("://"), `${label} must be a refs-only local/review handle, not a URL`);
  assert(!value.includes("-----BEGIN"), `${label} must not contain key material`);
}

function assertSha256(value, label) {
  assert(typeof value === "string", `${label} must be a sha256 string`);
  assert(/^sha256:[0-9a-f]{64}$/u.test(value), `${label} must be sha256:<64 lowercase hex>`);
}

function assertEvidenceFlags(value, expected, label) {
  assertAllowedKeys(value, label, Object.keys(expected));
  for (const [field, expectedValue] of Object.entries(expected)) {
    assert(value[field] === expectedValue, `${label}.${field} mismatch`);
  }
}

function assertBundleTemplate(template) {
  assertAllowedKeys(template, "production artifact bundle template", [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "purpose",
    "sourceLineage",
    "deterministicArtifactBuild",
    "proofFormat",
    "verifyingKey",
    "publicInputBinding",
    "adapterAcceptance",
    "mutationEvidence",
    "sbfLiveLineage",
    "auditReviewerAcceptance",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(
    template.version === "vanta-private-pool-v2-c01-production-artifact-bundle-template-0.1",
    "production artifact bundle template version mismatch",
  );
  assert(template.status === "template-not-production-evidence", "template status mismatch");
  assert(template.selectedBackend === "groth16-tag3-solana-v0", "template selected backend mismatch");
  assert(template.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "template route mismatch");
  assert(template.sourceLineage?.requiredCurrentSourceAcirRef === currentSourceAcirRef, "template ACIR ref mismatch");
  assert(
    template.sourceLineage?.requiredCurrentSourceAcirSha256 === shape.sourceAcirSha256,
    "template ACIR hash mismatch",
  );
  assert(template.sourceLineage?.sourceReviewAcceptanceRef === null, "template source review acceptance ref must stay null");
  assert(
    template.sourceLineage?.reviewedSourceMigrationAccepted === false,
    "template must not claim source migration acceptance",
  );
  assert(template.sourceLineage?.matchesRequiredCurrentSourceAcir === false, "template must not claim source match");
  assert(
    template.deterministicArtifactBuild?.deterministicArtifactBuildGateRef === deterministicBuildGatePath,
    "template deterministic build gate ref mismatch",
  );
  assertNullRefs(template.deterministicArtifactBuild, "template deterministic artifact build", [
    "buildReceiptRef",
    "pinnedToolchainSourceRef",
    "reviewedToolchainBuildRef",
    "trustedSetupOrMitigationRef",
    "outputManifestRef",
    "reproducibilityReviewRef",
  ]);
  assert(
    template.deterministicArtifactBuild?.satisfiesDeterministicArtifactBuild === false,
    "template must not claim deterministic artifact build",
  );
  assert(template.adapterAcceptance?.verifierAdapterAcceptanceRef === null, "template adapter acceptance ref must stay null");
  assert(
    template.adapterAcceptance?.verifierAdapterAcceptanceGateRef === adapterAcceptanceGatePath,
    "template adapter acceptance gate ref mismatch",
  );
  assert(template.proofFormat?.proofByteLength === shape.proofByteLength, "template proof length mismatch");
  assert(
    template.proofFormat?.publicWitnessByteLength === shape.publicWitnessByteLength,
    "template public witness length mismatch",
  );
  assert(template.verifyingKey?.productionVerifyingKeyHash === null, "template VK hash must stay null");
  assert(
    template.publicInputBinding?.decodedPublicInputValue === currentH6PublicInputValue,
    "template public input mismatch",
  );
  assert(
    template.publicInputBinding?.publicInputCommitment === currentH6PublicInputCommitment,
    "template public input commitment mismatch",
  );
  assert(
    template.publicInputBinding?.matchesCurrentH6ProofReceipt === false,
    "template must not claim H6 binding",
  );
  assertEvidenceFlags(
    template.satisfiesRequiredPositiveEvidence,
    {
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
      sbfLiveLineage: false,
      auditReviewerAcceptance: false,
    },
    "template evidence flags",
  );
  includes(template.truthBoundary ?? "", "not production evidence", "template truth boundary");
}

function assertReviewedProductionBundle(bundle, label) {
  assertAllowedKeys(bundle, label, [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "sourceLineage",
    "deterministicArtifactBuild",
    "proofFormat",
    "verifyingKey",
    "publicInputBinding",
    "adapterAcceptance",
    "mutationEvidence",
    "sbfLiveLineage",
    "auditReviewerAcceptance",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(bundle.version === "vanta-private-pool-v2-c01-production-artifact-bundle-0.1", `${label} version mismatch`);
  assert(bundle.status === "reviewed-production-artifact-bundle-candidate", `${label} status mismatch`);
  assert(bundle.selectedBackend === packet.selectedBackend, `${label} selected backend mismatch`);
  assert(bundle.routeId === packet.routeId, `${label} route mismatch`);
  assert(
    bundle.secretPolicy === "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-or-signed-transaction-bytes",
    `${label} secret policy mismatch`,
  );

  const sourceLineage = bundle.sourceLineage ?? {};
  assert(sourceLineage.requiredCurrentSourceAcirRef === currentSourceAcirRef, `${label} source ACIR ref mismatch`);
  assert(sourceLineage.requiredCurrentSourceAcirSha256 === shape.sourceAcirSha256, `${label} source ACIR hash mismatch`);
  assertRef(sourceLineage.sourceReviewAcceptanceRef, `${label} source review acceptance ref`);
  assert(sourceLineage.reviewedSourceMigrationAccepted === true, `${label} reviewed source migration acceptance must be true`);
  assertRef(sourceLineage.returnedSourceAcirRef, `${label} returned source ACIR ref`);
  assertSha256(sourceLineage.returnedSourceAcirSha256, `${label} returned source ACIR hash`);
  assert(
    sourceLineage.returnedSourceAcirSha256 === shape.sourceAcirSha256,
    `${label} returned source ACIR hash must equal required current source ACIR hash`,
  );
  assert(sourceLineage.matchesRequiredCurrentSourceAcir === true, `${label} must match current source ACIR`);

  const deterministicBuild = bundle.deterministicArtifactBuild ?? {};
  assertRef(deterministicBuild.buildReceiptRef, `${label} deterministic build receipt ref`);
  assert(deterministicBuild.deterministicArtifactBuildGateRef === deterministicBuildGatePath, `${label} deterministic build gate ref mismatch`);
  for (const field of [
    "pinnedToolchainSourceRef",
    "reviewedToolchainBuildRef",
    "trustedSetupOrMitigationRef",
    "outputManifestRef",
    "reproducibilityReviewRef",
  ]) {
    assertRef(deterministicBuild[field], `${label} deterministicArtifactBuild.${field}`);
  }
  assert(
    deterministicBuild.satisfiesDeterministicArtifactBuild === true,
    `${label} deterministic artifact build must be true`,
  );

  const proof = bundle.proofFormat ?? {};
  assertRef(proof.proofArtifactRef, `${label} proof artifact ref`);
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
    assert(proof[field] === expected, `${label} proofFormat.${field} mismatch`);
  }
  assert(proof.satisfiesProductionProofFormatEvidence === true, `${label} proof format evidence must be true`);

  const vk = bundle.verifyingKey ?? {};
  assertRef(vk.productionVerifyingKeyArtifactRef, `${label} production VK artifact ref`);
  assertSha256(vk.productionVerifyingKeyHash, `${label} production VK hash`);
  assert(vk.verifyingKeyHashKind === shape.verifyingKeyHashKind, `${label} VK hash kind mismatch`);
  assert(vk.satisfiesProductionVerifyingKeyEvidence === true, `${label} VK evidence must be true`);

  const binding = bundle.publicInputBinding ?? {};
  assertRef(binding.publicWitnessArtifactRef, `${label} public witness artifact ref`);
  assert(binding.decodedPublicInputLabel === shape.publicInputLabel, `${label} public input label mismatch`);
  assert(binding.decodedPublicInputValue === currentH6PublicInputValue, `${label} public input value mismatch`);
  assert(binding.publicInputCommitment === currentH6PublicInputCommitment, `${label} public input commitment mismatch`);
  assert(binding.matchesCurrentH6ProofReceipt === true, `${label} must match current H6 proof receipt`);
  assert(binding.satisfiesProductionPublicInputBinding === true, `${label} public-input binding must be true`);

  const adapter = bundle.adapterAcceptance ?? {};
  assertRef(adapter.verifierAdapterAcceptanceRef, `${label} verifier adapter acceptance ref`);
  assert(adapter.verifierAdapterAcceptanceGateRef === adapterAcceptanceGatePath, `${label} verifier adapter acceptance gate ref mismatch`);
  assertRef(adapter.verifierAdapterOrProgramRef, `${label} verifier adapter/program ref`);
  assertRef(adapter.acceptedVerifierBoundary, `${label} accepted verifier boundary ref`);
  assert(adapter.satisfiesVerifierAdapterAcceptance === true, `${label} verifier adapter acceptance must be true`);

  const mutation = bundle.mutationEvidence ?? {};
  for (const field of [
    "validProofMutationTestRef",
    "invalidProofNoMutationTestRef",
    "wrongPublicInputNoMutationTestRef",
    "wrongVerifyingKeyNoMutationTestRef",
  ]) {
    assertRef(mutation[field], `${label} ${field}`);
  }
  for (const field of [
    "validProofMutatesState",
    "invalidProofLeavesAccountsUnchanged",
    "wrongPublicInputLeavesAccountsUnchanged",
    "wrongVerifyingKeyLeavesAccountsUnchanged",
  ]) {
    assert(mutation[field] === true, `${label} mutationEvidence.${field} must be true`);
  }

  const lineage = bundle.sbfLiveLineage ?? {};
  for (const field of [
    "sbfLiveLineageRef",
    "deployedSpendProgramId",
    "deployedVerifierProgramId",
    "tag5ProductionVerifierKeyRegistrationRef",
    "reinitializationOrMigrationReceiptRef",
    "liveProofEnforcedTag3ReceiptRef",
  ]) {
    assertRef(lineage[field], `${label} ${field}`);
  }
  assertSha256(lineage.rebuiltSpendSbfSha256, `${label} rebuilt spend SBF hash`);
  assertSha256(lineage.acceptedVerifierSbfSha256, `${label} accepted verifier SBF hash`);
  assert(lineage.satisfiesSbfLiveLineage === true, `${label} SBF/live lineage must be true`);

  const audit = bundle.auditReviewerAcceptance ?? {};
  assertRef(audit.auditReviewerAcceptanceRef, `${label} audit/reviewer acceptance ref`);
  assert(audit.reviewerAccepted === true, `${label} reviewerAccepted must be true`);

  assertEvidenceFlags(
    bundle.satisfiesRequiredPositiveEvidence,
    {
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
      sbfLiveLineage: true,
      auditReviewerAcceptance: true,
    },
    `${label} evidence flags`,
  );
  includes(bundle.truthBoundary ?? "", "reviewed refs-only production artifact bundle", `${label} truth boundary`);
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const bundleTemplate = readJson(bundleTemplatePath);
const candidate = readJson(candidatePath);
const options = readJson(optionsPath);
const acquisition = readJson(acquisitionPath);
const route = readJson(routePath);
const preflight = readJson(preflightPath);
const sourceReviewAcceptanceGate = readJson(sourceReviewAcceptanceGatePath);
const deterministicBuildGate = readJson(deterministicBuildGatePath);
const adapterAcceptanceGate = readJson(adapterAcceptanceGatePath);
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
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-deterministic-production-artifact-build-check"),
    `${aggregate} must include the deterministic production artifact build guard`,
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
  "sourceReviewAcceptanceGateRef",
  "deterministicProductionArtifactBuildGateRef",
  "verifierAdapterAcceptanceGateRef",
  "groth16ProofFormatCandidateRef",
  "productionVerifyingKeyCandidateRef",
  "verifierAdapterTestCandidateRef",
  "localSunspotGnarkLocalArtifactInventoryRef",
  "publicWitnessBindingObservationRef",
  "decisionPacketRef",
  "requiredProductionBundleShape",
  "currentAcceptedProductionBundle",
  "localArtifactInventoryPolicy",
  "currentH6PublicInputBindingRequirement",
  "externalProductionBundleValidation",
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
  ["sourceReviewAcceptanceGateRef", sourceReviewAcceptanceGatePath],
  ["deterministicProductionArtifactBuildGateRef", deterministicBuildGatePath],
  ["verifierAdapterAcceptanceGateRef", adapterAcceptanceGatePath],
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
  "currentProofReceiptRef",
  "requiredPublicInputValue",
  "requiredPublicInputCommitment",
  "requiresCurrentProofReceiptPublicInputBinding",
  "verifyingKeyHashKind",
  "sourceAcirSha256",
  "sourceReviewAcceptanceRequired",
  "sourceReviewAcceptanceGateRef",
  "deterministicArtifactBuildRequired",
  "deterministicArtifactBuildGateRef",
  "verifierAdapterAcceptanceRequired",
  "verifierAdapterAcceptanceGateRef",
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
  ["currentProofReceiptRef", currentH6LocalProofReceiptRef],
  ["requiredPublicInputValue", currentH6PublicInputValue],
  ["requiredPublicInputCommitment", currentH6PublicInputCommitment],
  ["requiresCurrentProofReceiptPublicInputBinding", true],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["sourceAcirSha256", acquisition.sourceCircuit?.compiledAcirSha256],
  ["sourceReviewAcceptanceRequired", true],
  ["sourceReviewAcceptanceGateRef", sourceReviewAcceptanceGatePath],
  ["deterministicArtifactBuildRequired", true],
  ["deterministicArtifactBuildGateRef", deterministicBuildGatePath],
  ["verifierAdapterAcceptanceRequired", true],
  ["verifierAdapterAcceptanceGateRef", adapterAcceptanceGatePath],
  ["status", "required-before-production-acceptance"],
]) {
  assert(shape[field] === expected, `required production bundle shape ${field} mismatch`);
}
assert(route.routeId === shape.routeId, "route packet route id mismatch");
assert(preflight.sunspotGroth16RouteRef === routePath, "preflight must reference route packet");
assert(sourceReviewAcceptanceGate.status === "blocked-no-external-source-review-acceptance", "source-review acceptance gate status mismatch");
assert(
  deterministicBuildGate.status === "blocked-no-deterministic-production-artifact-build-receipt",
  "deterministic build gate status mismatch",
);
assert(
  adapterAcceptanceGate.status === "blocked-no-production-verifier-adapter-acceptance",
  "verifier adapter acceptance gate status mismatch",
);
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
  "sourceReviewAcceptanceRef",
  "deterministicArtifactBuildRef",
  "proofFormatArtifactRef",
  "productionVerifyingKeyArtifactRef",
  "productionVerifyingKeyHash",
  "publicWitnessArtifactRef",
  "verifierAdapterAcceptanceRef",
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
  "sourceReviewAcceptanceRef",
  "deterministicArtifactBuildRef",
  "proofFormatArtifactRef",
  "productionVerifyingKeyArtifactRef",
  "productionVerifyingKeyHash",
  "publicWitnessArtifactRef",
  "verifierAdapterAcceptanceRef",
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
  "requiredSourceAcirSha256",
  "localBeta18CompiledAcirSha256",
  "matchesRequiredSourceAcir",
  "satisfiesProductionSourceLineage",
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
assert(local.requiredSourceAcirSha256 === shape.sourceAcirSha256, "local required source ACIR hash mismatch");
assert(local.localBeta18CompiledAcirSha256 === localBeta18CompiledAcirSha256, "local beta18 ACIR hash mismatch");
assert(
  local.localBeta18CompiledAcirSha256 === localInventory.artifacts?.compiledAcir?.sha256,
  "local beta18 ACIR inventory hash mismatch",
);
assert(local.matchesRequiredSourceAcir === false, "local inventory must not match required source ACIR");
assert(local.satisfiesProductionSourceLineage === false, "local inventory must not satisfy source lineage");
assert(
  localInventory.sourceLineageComparison?.requiredCurrentSourceAcirSha256 === local.requiredSourceAcirSha256,
  "local inventory source lineage current ACIR mismatch",
);
assert(
  localInventory.sourceLineageComparison?.localBeta18CompiledAcirSha256 ===
    local.localBeta18CompiledAcirSha256,
  "local inventory source lineage beta18 ACIR mismatch",
);
assert(
  localInventory.sourceLineageComparison?.matchesCurrentSourceAcir === false,
  "local inventory source lineage must reject beta18 ACIR",
);
assert(local.solanaVerifierSbfSha256 === localInventory.artifacts?.solanaVerifierSbf?.sha256, "local SBF hash mismatch");
assert(local.promotableToProductionEvidence === false, "local inventory must not be promotable");
assert(local.comparisonOnly === true, "local inventory must be comparison-only");
for (const marker of [
  "local inventory can be used only to compare expected C01 shapes",
  "beta18 compiled ACIR does not match the required current source ACIR",
  "stale against the current H6 local proof receipt",
  "production source lineage",
  "cannot satisfy production proof-format",
  "production verifying-key",
  "verifier-adapter",
]) {
  includes(local.truthBoundary ?? "", marker, "local inventory policy truth boundary");
}

const currentH6Binding = packet.currentH6PublicInputBindingRequirement ?? {};
assertAllowedKeys(currentH6Binding, "current H6 public-input binding requirement", [
  "status",
  "publicWitnessBindingObservationRef",
  "localProofReceiptRef",
  "requiredPublicInputLabel",
  "requiredPublicInputValue",
  "requiredPublicInputCommitment",
  "observedLocalSunspotPublicWitnessValue",
  "observedLocalSunspotPublicWitnessSha256",
  "observedLocalSunspotPublicWitnessMatchesCurrentReceipt",
  "acceptedProductionBundleMustBindCurrentReceipt",
  "satisfiesProductionPublicInputBinding",
  "truthBoundary",
]);
assert(
  currentH6Binding.status === "blocked-local-sunspot-public-witness-stale-against-current-h6-receipt",
  "current H6 binding status mismatch",
);
assert(
  currentH6Binding.publicWitnessBindingObservationRef === publicWitnessPath,
  "current H6 binding observation ref mismatch",
);
assert(
  currentH6Binding.localProofReceiptRef === currentH6LocalProofReceiptRef,
  "current H6 binding proof receipt ref mismatch",
);
assert(
  currentH6Binding.requiredPublicInputLabel === shape.publicInputLabel,
  "current H6 binding public input label mismatch",
);
assert(
  currentH6Binding.requiredPublicInputValue === currentH6PublicInputValue,
  "current H6 binding required public input mismatch",
);
assert(
  currentH6Binding.requiredPublicInputCommitment === currentH6PublicInputCommitment,
  "current H6 binding commitment mismatch",
);
assert(
  currentH6Binding.observedLocalSunspotPublicWitnessValue === staleBeta18PublicWitnessValue,
  "current H6 binding stale local public witness mismatch",
);
assert(
  currentH6Binding.observedLocalSunspotPublicWitnessSha256 === publicWitness.observedPublicWitness?.sha256,
  "current H6 binding public witness hash mismatch",
);
assert(
  currentH6Binding.observedLocalSunspotPublicWitnessMatchesCurrentReceipt === false,
  "current H6 binding must record the stale local public witness mismatch",
);
assert(
  currentH6Binding.acceptedProductionBundleMustBindCurrentReceipt === true,
  "current H6 binding must require production bundle binding",
);
assert(
  currentH6Binding.satisfiesProductionPublicInputBinding === false,
  "current H6 binding must not satisfy production public-input binding",
);
assert(
  publicWitness.localProofReceiptObservation?.publicInputValue === currentH6Binding.requiredPublicInputValue,
  "public-witness packet current public input mismatch",
);
assert(
  publicWitness.localProofReceiptObservation?.publicInputCommitment ===
    currentH6Binding.requiredPublicInputCommitment,
  "public-witness packet current public input commitment mismatch",
);
assert(
  publicWitness.observedPublicWitness?.decodedPublicInputs?.[0]?.value ===
    currentH6Binding.observedLocalSunspotPublicWitnessValue,
  "public-witness packet stale beta18 value mismatch",
);
assert(
  publicWitness.observedPublicWitness?.matchesLocalProofReceiptPublicInput === false,
  "public-witness packet must reject the stale beta18 value",
);
for (const marker of [
  "cannot promote by byte lengths alone",
  "current H6 local proof receipt public input and commitment",
  "production public-input binding",
  "verifier-adapter",
]) {
  includes(currentH6Binding.truthBoundary ?? "", marker, "current H6 binding truth boundary");
}

const externalValidation = packet.externalProductionBundleValidation ?? {};
assertAllowedKeys(externalValidation, "external production bundle validation", [
  "status",
  "envVar",
  "templateRef",
  "command",
  "defaultGuardRequiresExternalBundle",
  "validatedWhenEnvVarPresent",
  "validates",
  "satisfiesProductionArtifactAcceptance",
  "truthBoundary",
]);
assert(
  externalValidation.status === "ready-for-reviewed-refs-only-bundle-validation",
  "external bundle validation status mismatch",
);
assert(externalValidation.envVar === productionBundleEnvVar, "external bundle validation env var mismatch");
assert(externalValidation.templateRef === bundleTemplatePath, "external bundle validation template ref mismatch");
assert(
  externalValidation.command ===
    "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-refs-only-json> npm run zk:c01-production-artifact-acceptance-gate-check",
  "external bundle validation command mismatch",
);
assert(externalValidation.defaultGuardRequiresExternalBundle === false, "external bundle must be optional by default");
assert(externalValidation.validatedWhenEnvVarPresent === true, "external bundle must validate when env var is present");
assertStringArray(externalValidation.validates, "external bundle validation validates");
for (const marker of [
  "current source ACIR hash lineage",
  "external source-review acceptance",
  "deterministic production artifact build receipt",
  "Groth16 production proof-format tuple",
  "production verifying-key artifact and hash kind",
  "current H6 private-spend-public-input-hash binding",
  "production verifier-adapter acceptance receipt",
  "accepted verifier adapter or verifier program",
  "valid-proof mutation evidence",
  "invalid-proof no-mutation evidence",
  "wrong-public-input no-mutation evidence",
  "wrong-verifying-key no-mutation evidence",
  "SBF/live lineage evidence",
  "audit/reviewer acceptance",
]) {
  assert(externalValidation.validates.includes(marker), `external bundle validation missing ${marker}`);
}
assert(
  externalValidation.satisfiesProductionArtifactAcceptance === false,
  "external bundle validation must not satisfy acceptance by itself",
);
for (const marker of [
  "external reviewed-bundle intake executable",
  "does not supply a bundle",
  "accepted production refs null",
]) {
  includes(externalValidation.truthBoundary ?? "", marker, "external bundle validation truth boundary");
}
assertBundleTemplate(bundleTemplate);

const criteria = mapById(packet.acceptanceCriteria, "acceptance criteria");
for (const [id, shapeRef] of [
  ["external-source-review-acceptance", "review:<external-beta18-h6-source-migration-acceptance-ref>"],
  ["deterministic-production-artifact-build-receipt", "build:<reviewed-deterministic-production-artifact-build-receipt-ref>"],
  ["pinned-reviewed-toolchain-source", "source:<pinned-reviewed-sunspot-gnark-source-or-release-ref>"],
  ["reproducible-toolchain-build-review", "review:<reproducible-toolchain-build-review-ref>"],
  ["trusted-setup-or-toxic-waste-mitigation", "setup:<reviewed-ceremony-or-toxic-waste-mitigation-ref>"],
  ["deterministic-production-proof-format-artifact", "artifact:<actual-private-spend-production-groth16-proof-format-ref>"],
  ["production-verifying-key-artifact-and-hash", "artifact+sha256:<actual-private-spend-production-vk-ref-and-hash>"],
  ["public-witness-binding-artifact", "artifact:<public-witness-values-ref-bound-to-private-spend-public-input-hash>"],
  ["current-h6-public-input-binding", "artifact:<public-witness-values-ref-bound-to-current-h6-private-spend-public-input-hash>"],
  ["accepted-verifier-adapter-or-program", "adapter:<accepted-solana-groth16-verifier-adapter-or-program-ref>"],
  ["production-verifier-adapter-acceptance-receipt", "adapter:<reviewed-production-verifier-adapter-acceptance-ref>"],
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
  "production public-witness evidence must decode one private-spend-public-input-hash equal to the current H6 proof receipt public input and commitment before adapter or mutation evidence can promote",
  "reviewed source migration acceptance is required before a beta18 source-migration production bundle can promote source lineage",
  "reviewed deterministic production artifact build receipt is required before proof/VK/public-witness refs can promote into the production bundle",
  "reviewed production verifier-adapter acceptance receipt is required before adapter and mutation/no-mutation refs can promote into the production bundle",
  "verifier adapter acceptance can promote only after production proof-format and production verifying-key evidence exist",
  "valid mutation and invalid/wrong-input/wrong-key no-mutation evidence must run under the accepted verifier boundary",
  "SBF/live lineage and audit/reviewer acceptance remain separate required refs",
]) {
  assert(packet.promotionRules.includes(rule), `missing promotion rule ${rule}`);
}

assertAllowedKeys(packet.satisfiesRequiredPositiveEvidence, "satisfiesRequiredPositiveEvidence", [
  "backendSelection",
  "sourceReviewAcceptance",
  "deterministicArtifactBuild",
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
  "sourceReviewAcceptance",
  "deterministicArtifactBuild",
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
  "npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
  "npm run zk:c01-deterministic-production-artifact-build-check",
  "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-refs-only-json> npm run zk:c01-production-artifact-acceptance-gate-check",
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
  "ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json",
  "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-refs-only-json> npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "blocked-no-reviewed-production-artifact-bundle",
  "current source ACIR hash",
  "current H6 proof receipt public input and commitment",
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

const externalBundlePath = process.env[productionBundleEnvVar];
if (externalBundlePath) {
  const externalBundle = readJsonPath(externalBundlePath, "external production artifact bundle");
  assertReviewedProductionBundle(externalBundle, "external production artifact bundle");
}

console.log("private-pool-v2 C01 production artifact acceptance gate: PASS");

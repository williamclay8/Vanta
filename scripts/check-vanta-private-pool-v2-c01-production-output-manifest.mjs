import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath =
  "ops/mainnet/private-pool-v2-c01-production-output-manifest-preflight.evidence.json";
const deterministicBuildGatePath =
  "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json";
const productionArtifactGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const artifactRequestPath =
  "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json";
const externalHandoffPath = "ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const runbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const artifactRootEnvVar = "VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_ROOT";
const artifactRootRefEnvVar = "VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_ROOT_REF";
const manifestPathEnvVar = "VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_PATH";

const expectedFiles = {
  sourceAcir: "vanta_private_pool_v2_actual_private_spend_entry.json",
  proof: "vanta_private_pool_v2_actual_private_spend_entry.proof",
  publicWitness: "vanta_private_pool_v2_actual_private_spend_entry.pw",
  productionVerifyingKey: "vanta_private_pool_v2_actual_private_spend_entry.vk",
  generatedVerifierSbf: "vanta_private_pool_v2_actual_private_spend_entry.so",
};

const expectedShape = {
  target: "solana-c01-tag3-groth16-v0",
  tag: 3,
  circuit: "vanta_private_pool_v2_actual_private_spend_entry",
  proofSystem: "groth16",
  proofFormatId: "gnark-solana-native-proof-and-public-witness-v0",
  proofByteLength: 324,
  publicWitnessByteLength: 44,
  publicWitnessHeaderHex: "000000010000000000000001",
  verifierInstructionDataByteLength: 368,
  generatedVerifierNrPubinputs: 1,
  generatedVerifierCommitmentKeys: 0,
  publicInputLabel: "private-spend-public-input-hash",
  requiredPublicInputValue: "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b",
  requiredPublicInputCommitment: "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2",
  verifyingKeyHashKind: "production-verifying-key-hash",
  referenceCurrentSourceAcirSha256: "sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9",
  productionSourceLineageMode: "reviewed-beta18-h6-source-migration",
  requiredProductionSourceAcirSha256: "sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde",
};

function fail(message) {
  console.error(`private-pool-v2 C01 production output manifest preflight: FAIL - ${message}`);
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
  const resolved = resolve(path);
  assert(existsSync(resolved), `${label} missing at ${path}`);
  return JSON.parse(readFileSync(resolved, "utf8"));
}

function readArtifact(root, filename, label) {
  const path = join(root, filename);
  assert(existsSync(path), `${label} artifact missing at ${path}`);
  const stat = statSync(path);
  assert(stat.isFile(), `${label} artifact must be a file`);
  return readFileSync(path);
}

function sha256(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
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

function assertRef(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty ref`);
  assert(!value.includes("://"), `${label} must be refs-only, not a URL`);
  assert(!value.includes("-----BEGIN"), `${label} must not contain key material`);
  assert(!value.includes("proofBytes"), `${label} must not embed raw proof bytes`);
  assert(!value.includes("witnessBytes"), `${label} must not embed raw witness bytes`);
}

function assertSha256(value, label) {
  assert(typeof value === "string", `${label} must be a sha256 string`);
  assert(/^sha256:[0-9a-f]{64}$/u.test(value), `${label} must be sha256:<64 lowercase hex>`);
}

function includes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

function decodePublicWitness(buffer, label) {
  assert(buffer.length === expectedShape.publicWitnessByteLength, `${label} public witness length mismatch`);
  const headerHex = buffer.subarray(0, 12).toString("hex");
  assert(headerHex === expectedShape.publicWitnessHeaderHex, `${label} public witness header mismatch`);
  return `0x${buffer.subarray(12).toString("hex")}`;
}

function detectRawArtifacts(root) {
  const candidates = [
    `${expectedShape.circuit}.pk`,
    `${expectedShape.circuit}-keypair.json`,
    `${expectedShape.circuit}.keypair.json`,
    `${expectedShape.circuit}.wtns`,
    `${expectedShape.circuit}.witness`,
  ];
  return candidates.filter((filename) => existsSync(join(root, filename)));
}

function manifestFromArtifactRoot(root) {
  const resolvedRoot = resolve(root);
  assert(existsSync(resolvedRoot), `${artifactRootEnvVar} must point to an existing artifact directory`);
  assert(statSync(resolvedRoot).isDirectory(), `${artifactRootEnvVar} must point to a directory`);

  const sourceAcir = readArtifact(resolvedRoot, expectedFiles.sourceAcir, "source ACIR");
  const proof = readArtifact(resolvedRoot, expectedFiles.proof, "Groth16 proof");
  const publicWitness = readArtifact(resolvedRoot, expectedFiles.publicWitness, "public witness");
  const verifyingKey = readArtifact(resolvedRoot, expectedFiles.productionVerifyingKey, "production verifying key");
  const verifierSbf = readArtifact(resolvedRoot, expectedFiles.generatedVerifierSbf, "generated verifier SBF");
  const decodedPublicInput = decodePublicWitness(publicWitness, "artifact root");
  const sourceAcirSha256 = sha256(sourceAcir);

  assert(sourceAcirSha256 === expectedShape.requiredProductionSourceAcirSha256, "source ACIR hash must match reviewed beta18 H6 production source hash");
  assert(proof.length === expectedShape.proofByteLength, "proof byte length mismatch");
  assert(publicWitness.length === expectedShape.publicWitnessByteLength, "public witness byte length mismatch");
  assert(decodedPublicInput === expectedShape.requiredPublicInputValue, "public witness value must match current H6 proof receipt");

  const artifactRootRef = process.env[artifactRootRefEnvVar] ?? `artifact-root:${basename(resolvedRoot)}`;
  const rawArtifactsExcluded = detectRawArtifacts(resolvedRoot);

  return {
    version: "vanta-private-pool-v2-c01-production-output-manifest-0.1",
    checkedAt: new Date().toISOString(),
    status: "production-output-manifest-preflight-candidate",
    selectedBackend: "groth16-tag3-solana-v0",
    routeId: "sunspot-noir-acir-gnark-groth16-solana-v0",
    secretPolicy: "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-live-private-data-or-signed-transaction-bytes",
    artifactRootRef,
    sourceLineage: {
      requiredCurrentSourceAcirSha256: expectedShape.referenceCurrentSourceAcirSha256,
      requiredProductionSourceLineageMode: expectedShape.productionSourceLineageMode,
      requiredProductionSourceAcirSha256: expectedShape.requiredProductionSourceAcirSha256,
      returnedSourceAcirRef: `${artifactRootRef}/${expectedFiles.sourceAcir}`,
      returnedSourceAcirSha256: sourceAcirSha256,
      matchesRequiredCurrentSourceAcir: false,
      matchesRequiredProductionSourceLineage: true,
    },
    productionOutputs: {
      target: expectedShape.target,
      tag: expectedShape.tag,
      circuit: expectedShape.circuit,
      proofSystem: expectedShape.proofSystem,
      proofFormatId: expectedShape.proofFormatId,
      proofArtifactRef: `${artifactRootRef}/${expectedFiles.proof}`,
      proofArtifactSha256: sha256(proof),
      proofByteLength: proof.length,
      publicWitnessArtifactRef: `${artifactRootRef}/${expectedFiles.publicWitness}`,
      publicWitnessArtifactSha256: sha256(publicWitness),
      publicWitnessByteLength: publicWitness.length,
      verifierInstructionDataSha256: sha256(Buffer.concat([proof, publicWitness])),
      verifierInstructionDataByteLength: proof.length + publicWitness.length,
      generatedVerifierNrPubinputs: expectedShape.generatedVerifierNrPubinputs,
      generatedVerifierCommitmentKeys: expectedShape.generatedVerifierCommitmentKeys,
      productionVerifyingKeyArtifactRef: `${artifactRootRef}/${expectedFiles.productionVerifyingKey}`,
      productionVerifyingKeyHash: sha256(verifyingKey),
      productionVerifyingKeyByteLength: verifyingKey.length,
      verifyingKeyHashKind: expectedShape.verifyingKeyHashKind,
      generatedVerifierSbfArtifactRef: `${artifactRootRef}/${expectedFiles.generatedVerifierSbf}`,
      generatedVerifierSbfSha256: sha256(verifierSbf),
      generatedVerifierSbfByteLength: verifierSbf.length,
    },
    publicInputBinding: {
      publicWitnessArtifactRef: `${artifactRootRef}/${expectedFiles.publicWitness}`,
      decodedPublicInputLabel: expectedShape.publicInputLabel,
      decodedPublicInputValue: decodedPublicInput,
      publicInputCommitment: expectedShape.requiredPublicInputCommitment,
      matchesCurrentH6ProofReceipt: true,
      satisfiesProductionPublicInputBindingPreflight: true,
    },
    rawMaterialExclusion: {
      rawProofBytesIncludedInManifest: false,
      rawWitnessBytesIncludedInManifest: false,
      rawVerifyingKeyBytesIncludedInManifest: false,
      provingKeyBytesIncludedInManifest: false,
      keypairBytesIncludedInManifest: false,
      signedTransactionBytesIncludedInManifest: false,
      rawArtifactsPresentInSourceRootButExcludedFromManifest: rawArtifactsExcluded,
    },
    satisfiesOutputManifestPreflight: true,
    satisfiesRequiredPositiveEvidence: {
      sourceReviewAcceptance: false,
      deterministicArtifactBuild: false,
      productionOutputManifest: false,
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
    truthBoundary:
      "This refs-only output manifest is preflight evidence only. It is not source-review acceptance, not deterministic production artifact build acceptance, not production proof-format acceptance, not production verifying-key acceptance, not verifier-adapter acceptance, not mutation/no-mutation evidence, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.",
  };
}

function assertEvidenceFlags(value, expected, label) {
  assertAllowedKeys(value, label, Object.keys(expected));
  for (const [field, expectedValue] of Object.entries(expected)) {
    assert(value[field] === expectedValue, `${label}.${field} mismatch`);
  }
}

function assertOutputManifest(manifest, label) {
  assertAllowedKeys(manifest, label, [
    "version",
    "checkedAt",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "artifactRootRef",
    "sourceLineage",
    "productionOutputs",
    "publicInputBinding",
    "rawMaterialExclusion",
    "satisfiesOutputManifestPreflight",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(manifest.version === "vanta-private-pool-v2-c01-production-output-manifest-0.1", `${label} version mismatch`);
  assert(manifest.status === "production-output-manifest-preflight-candidate", `${label} status mismatch`);
  assert(manifest.selectedBackend === "groth16-tag3-solana-v0", `${label} selected backend mismatch`);
  assert(manifest.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", `${label} route mismatch`);
  assert(
    manifest.secretPolicy ===
      "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-live-private-data-or-signed-transaction-bytes",
    `${label} secret policy mismatch`,
  );
  assertRef(manifest.artifactRootRef, `${label} artifact root ref`);

  const source = manifest.sourceLineage ?? {};
  assert(
    source.requiredCurrentSourceAcirSha256 === expectedShape.referenceCurrentSourceAcirSha256,
    `${label} current-source ACIR hash mismatch`,
  );
  assert(
    source.requiredProductionSourceLineageMode === expectedShape.productionSourceLineageMode,
    `${label} production source lineage mode mismatch`,
  );
  assert(
    source.requiredProductionSourceAcirSha256 === expectedShape.requiredProductionSourceAcirSha256,
    `${label} production source ACIR hash mismatch`,
  );
  assertRef(source.returnedSourceAcirRef, `${label} returned source ACIR ref`);
  assertSha256(source.returnedSourceAcirSha256, `${label} returned source ACIR hash`);
  assert(
    source.returnedSourceAcirSha256 === expectedShape.requiredProductionSourceAcirSha256,
    `${label} returned source ACIR must match reviewed beta18 H6 source hash`,
  );
  assert(source.matchesRequiredCurrentSourceAcir === false, `${label} must not claim beta19 ACIR identity`);
  assert(source.matchesRequiredProductionSourceLineage === true, `${label} production source lineage flag mismatch`);

  const outputs = manifest.productionOutputs ?? {};
  for (const [field, expected] of [
    ["target", expectedShape.target],
    ["tag", expectedShape.tag],
    ["circuit", expectedShape.circuit],
    ["proofSystem", expectedShape.proofSystem],
    ["proofFormatId", expectedShape.proofFormatId],
    ["proofByteLength", expectedShape.proofByteLength],
    ["publicWitnessByteLength", expectedShape.publicWitnessByteLength],
    ["verifierInstructionDataByteLength", expectedShape.verifierInstructionDataByteLength],
    ["generatedVerifierNrPubinputs", expectedShape.generatedVerifierNrPubinputs],
    ["generatedVerifierCommitmentKeys", expectedShape.generatedVerifierCommitmentKeys],
    ["verifyingKeyHashKind", expectedShape.verifyingKeyHashKind],
  ]) {
    assert(outputs[field] === expected, `${label} productionOutputs.${field} mismatch`);
  }
  for (const field of [
    "proofArtifactRef",
    "publicWitnessArtifactRef",
    "productionVerifyingKeyArtifactRef",
    "generatedVerifierSbfArtifactRef",
  ]) {
    assertRef(outputs[field], `${label} ${field}`);
  }
  for (const field of [
    "proofArtifactSha256",
    "publicWitnessArtifactSha256",
    "verifierInstructionDataSha256",
    "productionVerifyingKeyHash",
    "generatedVerifierSbfSha256",
  ]) {
    assertSha256(outputs[field], `${label} ${field}`);
  }
  assert(outputs.productionVerifyingKeyByteLength > 0, `${label} VK byte length must be positive`);
  assert(outputs.generatedVerifierSbfByteLength > 0, `${label} verifier SBF byte length must be positive`);

  const binding = manifest.publicInputBinding ?? {};
  assert(binding.publicWitnessArtifactRef === outputs.publicWitnessArtifactRef, `${label} binding witness ref mismatch`);
  assert(binding.decodedPublicInputLabel === expectedShape.publicInputLabel, `${label} public input label mismatch`);
  assert(binding.decodedPublicInputValue === expectedShape.requiredPublicInputValue, `${label} public input value mismatch`);
  assert(binding.publicInputCommitment === expectedShape.requiredPublicInputCommitment, `${label} public input commitment mismatch`);
  assert(binding.matchesCurrentH6ProofReceipt === true, `${label} must match current H6 proof receipt`);
  assert(binding.satisfiesProductionPublicInputBindingPreflight === true, `${label} public-input preflight flag mismatch`);

  const raw = manifest.rawMaterialExclusion ?? {};
  assert(raw.rawProofBytesIncludedInManifest === false, `${label} must not include raw proof bytes`);
  assert(raw.rawWitnessBytesIncludedInManifest === false, `${label} must not include raw witness bytes`);
  assert(raw.rawVerifyingKeyBytesIncludedInManifest === false, `${label} must not include raw VK bytes`);
  assert(raw.provingKeyBytesIncludedInManifest === false, `${label} must not include proving key bytes`);
  assert(raw.keypairBytesIncludedInManifest === false, `${label} must not include keypair bytes`);
  assert(raw.signedTransactionBytesIncludedInManifest === false, `${label} must not include signed transaction bytes`);
  assert(Array.isArray(raw.rawArtifactsPresentInSourceRootButExcludedFromManifest), `${label} excluded raw artifact list must be an array`);
  for (const entry of raw.rawArtifactsPresentInSourceRootButExcludedFromManifest) {
    assert(typeof entry === "string", `${label} excluded raw artifact entries must be strings`);
  }

  assert(manifest.satisfiesOutputManifestPreflight === true, `${label} output manifest preflight flag mismatch`);
  assertEvidenceFlags(
    manifest.satisfiesRequiredPositiveEvidence,
    {
      sourceReviewAcceptance: false,
      deterministicArtifactBuild: false,
      productionOutputManifest: false,
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
    `${label} evidence flags`,
  );
  includes(manifest.truthBoundary ?? "", "preflight evidence only", `${label} truth boundary`);
  includes(manifest.truthBoundary ?? "", "not C01 closure", `${label} truth boundary`);
}

function assertDefaultPacket() {
  const packageJson = readJson("package.json");
  const scripts = packageJson.scripts ?? {};
  const packetText = read(packetPath);
  const packet = JSON.parse(packetText);
  const deterministicBuildGate = readJson(deterministicBuildGatePath);
  const productionArtifactGate = readJson(productionArtifactGatePath);
  const artifactRequest = readJson(artifactRequestPath);
  const externalHandoff = readJson(externalHandoffPath);
  const decision = read(decisionPath);
  const auditPackage = read(auditPackagePath);
  const runbook = read(runbookPath);
  const review = read(reviewPath);

  assert(
    scripts["zk:c01-production-output-manifest-check"] ===
      "node scripts/check-vanta-private-pool-v2-c01-production-output-manifest.mjs",
    "package.json must expose zk:c01-production-output-manifest-check",
  );
  for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
    assert(
      scripts[aggregate]?.includes("npm run zk:c01-production-output-manifest-check"),
      `${aggregate} must include the production output manifest preflight guard`,
    );
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
    assert(!packetText.includes(forbidden), `packet must not contain forbidden marker ${forbidden}`);
  }

  assertAllowedKeys(packet, "output manifest preflight packet", [
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
    "productionOutputManifestReady",
    "secretPolicy",
    "purpose",
    "deterministicProductionArtifactBuildGateRef",
    "productionArtifactAcceptanceGateRef",
    "productionVerifierArtifactRequestRef",
    "externalReviewHandoffRef",
    "requiredOutputShape",
    "expectedArtifactFiles",
    "externalOutputManifestValidation",
    "currentAcceptedOutputManifest",
    "promotionRules",
    "satisfiesRequiredPositiveEvidence",
    "remainingBlockers",
    "canonicalCommands",
    "truthBoundary",
  ]);
  assert(packet.version === "vanta-private-pool-v2-c01-production-output-manifest-preflight-0.1", "packet version mismatch");
  assert(packet.status === "blocked-no-reviewed-production-output-manifest", "packet status mismatch");
  assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
  assert(packet.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
  assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route mismatch");
  for (const field of [
    "productionReady",
    "mainnetReady",
    "privacyClaimAllowed",
    "c01VerifierReady",
    "solanaC01Groth16VerifierReady",
    "productionOutputManifestReady",
  ]) {
    assert(packet[field] === false, `${field} must remain false`);
  }
  assert(
    packet.secretPolicy ===
      "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-live-private-data-or-signed-transaction-bytes",
    "packet secret policy mismatch",
  );
  for (const [field, expected] of [
    ["deterministicProductionArtifactBuildGateRef", deterministicBuildGatePath],
    ["productionArtifactAcceptanceGateRef", productionArtifactGatePath],
    ["productionVerifierArtifactRequestRef", artifactRequestPath],
    ["externalReviewHandoffRef", externalHandoffPath],
  ]) {
    assert(packet[field] === expected, `${field} mismatch`);
  }

  assert(deterministicBuildGate.status === "blocked-no-deterministic-production-artifact-build-receipt", "deterministic build gate status mismatch");
  assert(productionArtifactGate.status === "blocked-no-reviewed-production-artifact-bundle", "production artifact gate status mismatch");
  assert(artifactRequest.status === "ready-for-external-production-verifier-artifact-request-blocked", "artifact request status mismatch");
  assert(externalHandoff.status === "ready-for-external-c01-verifier-review-handoff-blocked", "external handoff status mismatch");

  assertAllowedKeys(packet.requiredOutputShape, "required output shape", Object.keys(expectedShape));
  for (const [field, expected] of Object.entries(expectedShape)) {
    assert(packet.requiredOutputShape[field] === expected, `requiredOutputShape.${field} mismatch`);
  }
  assertAllowedKeys(packet.expectedArtifactFiles, "expected artifact files", Object.keys(expectedFiles));
  for (const [field, expected] of Object.entries(expectedFiles)) {
    assert(packet.expectedArtifactFiles[field] === expected, `expectedArtifactFiles.${field} mismatch`);
  }

  const validation = packet.externalOutputManifestValidation ?? {};
  assert(validation.artifactRootEnvVar === artifactRootEnvVar, "artifact root env var mismatch");
  assert(validation.manifestPathEnvVar === manifestPathEnvVar, "manifest path env var mismatch");
  assert(validation.artifactRootRefEnvVar === artifactRootRefEnvVar, "artifact root ref env var mismatch");
  assert(validation.command === "npm run zk:c01-production-output-manifest-check", "validation command mismatch");
  includes(validation.artifactRootCommand ?? "", artifactRootEnvVar, "artifact root validation command");
  includes(validation.manifestPathCommand ?? "", manifestPathEnvVar, "manifest path validation command");
  assert(validation.generatedManifestStatus === "production-output-manifest-preflight-candidate", "generated manifest status mismatch");
  assert(validation.storesRawArtifactsInRepo === false, "validation must not store raw artifacts in repo");
  assert(packet.currentAcceptedOutputManifest === null, "current accepted output manifest must stay null");
  assert(Array.isArray(packet.promotionRules) && packet.promotionRules.length >= 3, "promotion rules must be present");
  assert(Array.isArray(packet.remainingBlockers) && packet.remainingBlockers.length >= 7, "remaining blockers must be present");
  for (const blocker of [
    "no external source-review acceptance",
    "no reviewed production output manifest",
    "no reviewed deterministic production artifact build receipt",
    "no reviewed production artifact bundle",
    "no production verifier-adapter acceptance",
    "no SBF/live lineage acceptance",
    "no audit/reviewer acceptance",
  ]) {
    assert(packet.remainingBlockers.includes(blocker), `remaining blockers missing ${blocker}`);
  }
  assert(packet.canonicalCommands.includes("npm run zk:c01-production-output-manifest-check"), "canonical commands missing output manifest check");
  assertEvidenceFlags(
    packet.satisfiesRequiredPositiveEvidence,
    {
      sourceReviewAcceptance: false,
      deterministicArtifactBuild: false,
      productionOutputManifest: false,
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
    "packet evidence flags",
  );
  includes(packet.truthBoundary ?? "", "output-manifest preflight", "packet truth boundary");
  includes(packet.truthBoundary ?? "", "not C01 closure", "packet truth boundary");

  for (const [text, label] of [
    [decision, "decision doc"],
    [auditPackage, "audit package"],
    [runbook, "operator runbook"],
    [review, "ZK review"],
  ]) {
    includes(text, packetPath, label);
    includes(text, "npm run zk:c01-production-output-manifest-check", label);
    includes(text, artifactRootEnvVar, label);
    includes(text, manifestPathEnvVar, label);
    includes(text, "not production proof-format evidence", label);
  }
}

const artifactRoot = process.env[artifactRootEnvVar];
const manifestPath = process.env[manifestPathEnvVar];

assertDefaultPacket();

if (artifactRoot) {
  const manifest = manifestFromArtifactRoot(artifactRoot);
  assertOutputManifest(manifest, "generated output manifest");
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  process.exit(0);
}

if (manifestPath) {
  const manifest = readJsonPath(manifestPath, "external output manifest");
  assertOutputManifest(manifest, "external output manifest");
}

console.log("private-pool-v2 C01 production output manifest preflight: PASS");

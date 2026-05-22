import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath =
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-local-artifact-inventory.evidence.json";
const devProbePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json";
const publicWitnessPath = "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const proofFormatPath = "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const productionVkPath = "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";

function fail(message) {
  console.error(`private-pool-v2 C01 Sunspot/Gnark local artifact inventory: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
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

function assertFalsePositiveEvidence(value, label) {
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

function sha256File(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return `sha256:${hash.digest("hex")}`;
}

function verifyRawArtifact(root, artifact, label, { checkHash = true } = {}) {
  const path = join(root, artifact.fileName);
  assert(existsSync(path), `${label} missing raw artifact at ${path}`);
  assert(statSync(path).size === artifact.byteLength, `${label} byteLength mismatch at ${path}`);
  if (checkHash) {
    assert(sha256File(path) === artifact.sha256, `${label} sha256 mismatch at ${path}`);
  }
}

const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const devProbe = readJson(devProbePath);
const publicWitness = readJson(publicWitnessPath);
const acquisition = readJson(acquisitionPath);
const proofFormat = readJson(proofFormatPath);
const productionVk = readJson(productionVkPath);
const decision = read(decisionPath);
const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};

assert(
  scripts["zk:c01-sunspot-gnark-local-artifact-inventory-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sunspot-gnark-local-artifact-inventory.mjs",
  "package.json must expose zk:c01-sunspot-gnark-local-artifact-inventory-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sunspot-gnark-local-artifact-inventory-check"),
    `${aggregate} must include the local artifact inventory guard`,
  );
}

assert(
  packet.version === "vanta-private-pool-v2-c01-sunspot-gnark-local-artifact-inventory-0.1",
  "schema mismatch",
);
assert(
  packet.status === "local-artifact-inventory-observed-nonproduction-unsafe-setup",
  "status mismatch",
);
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route id mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "externalArtifactsReady",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(
  packet.secretPolicy ===
    "metadata-hashes-and-local-path-refs-only-no-raw-proof-vk-witness-pk-keypair-or-signed-transaction-bytes",
  "secret policy mismatch",
);
for (const forbidden of [
  "proofHex",
  "verifyingKeyBytes",
  "vkBytes",
  "proofBytes",
  "witnessBytes",
  "seed phrase",
  "private key",
  "signedTransactionBytes",
  "bearer ",
  "postgres://",
  "postgresql://",
  "-----BEGIN",
]) {
  assert(!packetText.includes(forbidden), `packet must not contain forbidden marker ${forbidden}`);
}

assert(packet.localSunspotGroth16DevProbeRef === devProbePath, "dev-probe ref mismatch");
assert(packet.publicWitnessBindingObservationRef === publicWitnessPath, "public-witness ref mismatch");
assert(packet.artifactAcquisitionPacketRef === acquisitionPath, "acquisition ref mismatch");
assert(packet.groth16ProofFormatCandidateRef === proofFormatPath, "proof-format ref mismatch");
assert(packet.productionVerifyingKeyCandidateRef === productionVkPath, "production VK ref mismatch");
assert(packet.decisionPacketRef === decisionPath, "decision ref mismatch");
assert(
  acquisition.localSunspotGnarkLocalArtifactInventoryRef === packetPath,
  "acquisition packet must reference local artifact inventory",
);
assert(
  proofFormat.localSunspotGnarkLocalArtifactInventoryRef?.artifactRef === packetPath,
  "proof-format candidate must reference local artifact inventory",
);
assert(
  productionVk.localSunspotGnarkLocalArtifactInventoryRef?.artifactRef === packetPath,
  "production VK candidate must reference local artifact inventory",
);

assert(packet.artifactRoot?.envVar === "VANTA_C01_SUNSPOT_LOCAL_ARTIFACT_ROOT", "env var mismatch");
includes(
  packet.artifactRoot?.rawPathValidationCommand ?? "",
  "npm run zk:c01-sunspot-gnark-local-artifact-inventory-check",
  "raw path validation command",
);
assert(
  packet.artifactRoot?.localPathRefsAreProductionEvidence === false,
  "local path refs must not be production evidence",
);

assert(packet.toolchainBoundary?.sunspotCommit === "3a260ebe4edb36ab52e497aa383a2bac71525577", "Sunspot commit mismatch");
assert(packet.toolchainBoundary?.sunspotWorktreeCleanAtObservation === true, "Sunspot worktree clean flag mismatch");
assert(packet.toolchainBoundary?.requiredNargoVersion === "1.0.0-beta.18", "required nargo mismatch");
assert(packet.toolchainBoundary?.repoNargoVersion === "1.0.0-beta.19", "repo nargo mismatch");
assert(packet.toolchainBoundary?.temporarySourceShimCommitted === false, "temporary source shim must not be committed");
includes(packet.toolchainBoundary?.setupBoundary ?? "", "unsafe-local-single-operator-setup", "setup boundary");
assert(packet.toolchainBoundary?.satisfiesProductionToolchainReview === false, "toolchain review must remain false");

const artifacts = packet.artifacts ?? {};
for (const [field, expected] of [
  ["proof", 324],
  ["publicWitness", 44],
  ["verifyingKey", 716],
  ["ccs", 2565732],
  ["provingKey", 15168269],
  ["solanaVerifierSbf", 86216],
]) {
  assert(artifacts[field]?.byteLength === expected, `${field} byteLength mismatch`);
  assert(artifacts[field]?.rawBytesStoredInRepo === false, `${field} raw bytes must not be stored in repo`);
}
assert(artifacts.proof?.sha256 === "sha256:e76c6d47052ecdb743b894a5413de62dca556f25546c1dd4a842403532281a85", "proof hash mismatch");
assert(artifacts.proof?.proofFormatId === "gnark-solana-native-proof-and-public-witness-v0", "proof format mismatch");
assert(artifacts.proof?.satisfiesProductionProofFormatEvidence === false, "proof must not satisfy production evidence");
assert(artifacts.publicWitness?.sha256 === "sha256:885351f63518202c4fcd120af8ffc296a8706edae14ed4795c11795dfd7f90e3", "public witness hash mismatch");
assert(artifacts.publicWitness?.headerHex === "000000010000000000000001", "public witness header mismatch");
assert(artifacts.publicWitness?.matchesLocalProofReceiptPublicInput === true, "public witness must match local receipt");
assert(
  artifacts.publicWitness?.satisfiesProductionPublicInputBindingEvidence === false,
  "public witness must not satisfy production binding",
);
assert(artifacts.verifyingKey?.sha256 === "sha256:fbd6ba8ce64cc0b0320a0d8080fca15d79ca6ca2f732381a9550092f645f0e1d", "VK hash mismatch");
assert(
  artifacts.verifyingKey?.verifyingKeyHashKind === "local-unsafe-sunspot-vk-hash-not-production",
  "VK hash kind mismatch",
);
assert(
  artifacts.verifyingKey?.satisfiesProductionVerifyingKeyEvidence === false,
  "VK must not satisfy production evidence",
);
assert(artifacts.ccs?.sha256 === "sha256:9c4cdf4858a5b180c27a9343c767598b515f71ec0a2a1b78f8069d4e309ccd53", "CCS hash mismatch");
assert(artifacts.provingKey?.sha256Stored === false, "PK hash must not be stored");
assert(artifacts.provingKey?.satisfiesProductionEvidence === false, "PK must not satisfy production evidence");
assert(artifacts.solanaVerifierSbf?.sha256 === "sha256:222ca0869212f455331933b5b6751a04449b5d7bd7387e72ae7f5702a3bf2e58", "SBF hash mismatch");
assert(artifacts.solanaVerifierSbf?.satisfiesSbfLiveLineage === false, "SBF must not satisfy live lineage");
assert(artifacts.solanaVerifierKeypair?.generatedInPrivateTmp === true, "keypair private tmp flag mismatch");
assert(artifacts.solanaVerifierKeypair?.byteLength === 243, "keypair byteLength mismatch");
assert(artifacts.solanaVerifierKeypair?.localRefStored === false, "keypair local ref must not be stored");
assert(artifacts.solanaVerifierKeypair?.sha256Stored === false, "keypair hash must not be stored");
assert(artifacts.solanaVerifierKeypair?.rawBytesStoredInRepo === false, "keypair bytes must not be stored");

assert(packet.satisfiesRequiredPositiveEvidence?.backendSelection === true, "backend selection must remain true");
assert(
  packet.satisfiesRequiredPositiveEvidence?.localNonproductionArtifactInventory === true,
  "local inventory observation must be true",
);
assertFalsePositiveEvidence(packet.satisfiesRequiredPositiveEvidence, "satisfiesRequiredPositiveEvidence");
assertStringArray(packet.productionPromotionStillRequires, "productionPromotionStillRequires");
for (const requirement of [
  "trusted setup ceremony or equivalent toxic-waste mitigation",
  "production verifying-key artifact and production verifying-key hash",
  "accepted verifier adapter or verifier CPI wired to Vanta tag 3",
  "invalid-proof, wrong-public-input, and wrong-verifying-key no-mutation under the accepted verifier",
  "audit/reviewer acceptance",
]) {
  assert(packet.productionPromotionStillRequires.includes(requirement), `missing requirement ${requirement}`);
}
assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-sunspot-gnark-local-artifact-inventory-check",
  "npm run zk:c01-sunspot-groth16-dev-probe-check",
  "npm run zk:c01-public-witness-binding-check",
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-production-verifying-key-candidate-check",
]) {
  assert(packet.canonicalCommands.includes(command), `missing canonical command ${command}`);
}
for (const marker of [
  "local nonproduction artifact inventory only",
  "not production proof-format evidence",
  "not production verifying-key evidence",
  "not verifier-adapter acceptance",
  "not SBF/live lineage",
  "not C01 closure",
]) {
  includes(packet.truthBoundary ?? "", marker, "truth boundary");
}
for (const marker of [
  "Local route-feasibility probe for C01",
  "satisfiesProductionProofFormatEvidence",
]) {
  includes(JSON.stringify(devProbe), marker, "dev-probe linkage");
}
assert(
  publicWitness.satisfiesRequiredPositiveEvidence?.privateSpendPublicInputHashBinding === false,
  "public-witness packet must remain nonproduction",
);
includes(decision, "C01 Sunspot/Gnark artifact acquisition packet", "decision packet");

const rawRoot = process.env.VANTA_C01_SUNSPOT_LOCAL_ARTIFACT_ROOT;
if (rawRoot) {
  for (const field of ["proof", "publicWitness", "verifyingKey", "ccs", "solanaVerifierSbf"]) {
    verifyRawArtifact(rawRoot, artifacts[field], field);
  }
  verifyRawArtifact(rawRoot, artifacts.provingKey, "provingKey", { checkHash: false });
}

console.log("private-pool-v2 C01 Sunspot/Gnark local artifact inventory: PASS");

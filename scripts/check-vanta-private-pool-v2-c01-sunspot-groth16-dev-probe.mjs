import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json";
const routePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const preflightPath =
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";

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
  console.error(`private-pool-v2 C01 Sunspot Groth16 dev probe: FAIL - ${message}`);
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

function assertFalseEvidence(value, label) {
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

const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const route = readJson(routePath);
const acquisition = readJson(acquisitionPath);
const preflight = readJson(preflightPath);
const decision = read(decisionPath);
const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};

assert(
  scripts["zk:c01-sunspot-groth16-dev-probe-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sunspot-groth16-dev-probe.mjs",
  "package.json must expose zk:c01-sunspot-groth16-dev-probe-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sunspot-groth16-dev-probe-check"),
    `${aggregate} must include the C01 Sunspot Groth16 dev-probe guard`,
  );
}

assert(packet.version === "vanta-private-pool-v2-c01-sunspot-groth16-dev-probe-evidence-0.1", "schema mismatch");
assert(
  packet.status === "local-dev-probe-succeeded-nonproduction-unsafe-setup-and-beta18-source-shim",
  "status mismatch",
);
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route id mismatch");
for (const field of [
  "mainnetReady",
  "productionReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "externalArtifactsReady",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(
  packet.secretPolicy ===
    "metadata-and-hashes-only-no-raw-proof-vk-witness-keypair-or-signed-transaction-bytes",
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

assert(packet.routePacketRef === routePath, "route packet ref mismatch");
assert(packet.productionGroth16ToolchainPreflightRef === preflightPath, "preflight packet ref mismatch");
assert(packet.artifactAcquisitionPacketRef === acquisitionPath, "acquisition packet ref mismatch");
assert(packet.decisionPacketRef === decisionPath, "decision packet ref mismatch");
assert(route.localSunspotGroth16DevProbeRef === packetPath, "route packet must reference the dev probe");
assert(preflight.localSunspotGroth16DevProbeRef === packetPath, "preflight packet must reference the dev probe");
assert(acquisition.localSunspotGroth16DevProbeRef === packetPath, "acquisition packet must reference the dev probe");

assert(packet.sourceCircuit?.temporarySourceShimCommitted === false, "temp shim must not be committed");
includes(packet.sourceCircuit?.temporarySourceShim ?? "", "dep::poseidon::poseidon::bn254", "temporary shim");
includes(packet.sourceCircuit?.repoPoseidonImport ?? "", "::poseidon::poseidon::bn254", "repo import");
assert(packet.sunspotSource?.clonedCommit === "3a260ebe4edb36ab52e497aa383a2bac71525577", "Sunspot commit mismatch");
assert(packet.sunspotSource?.requiredNoirVersion === "1.0.0-beta.18", "Sunspot Noir requirement mismatch");
includes(packet.sunspotSource?.securityBoundary ?? "", "unaudited", "Sunspot security boundary");
includes(packet.sunspotSource?.securityBoundary ?? "", "toxic-waste mitigation", "Sunspot setup boundary");

const flow = new Map((packet.observedProbeFlow ?? []).map((entry) => [entry.step, entry]));
for (const [step, status] of [
  ["build-sunspot-cli", "passed"],
  ["current-beta19-acir-through-sunspot", "failed-expected"],
  ["beta18-repo-source-compile", "failed-expected-before-temp-shim"],
  ["beta18-temp-shim-compile", "passed"],
  ["beta18-temp-shim-witness", "passed"],
  ["sunspot-compile", "passed"],
  ["sunspot-setup", "passed-nonproduction-unsafe"],
  ["sunspot-prove", "passed"],
  ["sunspot-verify", "passed"],
  ["sunspot-build-solana-verifier-sbf", "passed-local-build-only"],
  ["sunspot-generated-verifier-litesvm-positive", "passed-local-svm-only"],
  ["restore-global-nargo", "passed"],
]) {
  assert(flow.get(step)?.status === status, `${step} status mismatch`);
}
includes(flow.get("current-beta19-acir-through-sunspot")?.failure ?? "", "makeslice: len out of range", "beta19 failure");
includes(flow.get("beta18-repo-source-compile")?.failure ?? "", "Could not resolve", "beta18 source failure");
assert(flow.get("sunspot-compile")?.nbConstraints === 26794, "Sunspot constraint count mismatch");
assert(flow.get("sunspot-compile")?.sunspotReportedPublicInputs === 0, "Sunspot public input report mismatch");
includes(flow.get("sunspot-compile")?.truthBoundary ?? "", "public-input binding claim", "public input truth boundary");
includes(flow.get("sunspot-build-solana-verifier-sbf")?.warning ?? "", "undefined functions", "SBF warning boundary");
const litesvmStep = flow.get("sunspot-generated-verifier-litesvm-positive");
assert(litesvmStep?.generatedVerifierNrPubinputs === 1, "generated verifier public input count mismatch");
assert(litesvmStep?.generatedVerifierCommitmentKeys === 0, "generated verifier commitment key count mismatch");
assert(litesvmStep?.instructionDataByteLength === 368, "generated verifier instruction-data length mismatch");
assert(litesvmStep?.proofByteLength === 324, "generated verifier proof length mismatch");
assert(litesvmStep?.publicWitnessByteLength === 44, "generated verifier public witness length mismatch");
assert(litesvmStep?.computeUnitsConsumed === 163841, "generated verifier LiteSVM compute unit count mismatch");
for (const marker of [
  "standalone Solana verifier accepted",
  "not Vanta spend-program adapter acceptance",
  "not live deploy/reinit lineage",
  "not production reviewer acceptance",
]) {
  includes(litesvmStep?.truthBoundary ?? "", marker, "generated verifier LiteSVM truth boundary");
}
includes(flow.get("restore-global-nargo")?.restoredVersion ?? "", "1.0.0-beta.19", "restored nargo version");

const artifacts = packet.observedArtifacts ?? {};
for (const [field, byteLength] of [
  ["beta18Acir", 1828305],
  ["ccs", 2565732],
  ["provingKey", 15168269],
  ["verifyingKey", 716],
  ["proof", 324],
  ["publicWitness", 44],
  ["solanaVerifierSbf", 86216],
]) {
  assert(artifacts[field]?.byteLength === byteLength, `${field} byteLength mismatch`);
}
assert(artifacts.beta18Acir?.sha256 === "sha256:5e0e27752ff1c0f01d318323083b168c1309c0c84521401531b42d07033c68bf", "ACIR hash mismatch");
assert(artifacts.ccs?.sha256 === "sha256:9c4cdf4858a5b180c27a9343c767598b515f71ec0a2a1b78f8069d4e309ccd53", "CCS hash mismatch");
assert(artifacts.verifyingKey?.sha256 === "sha256:fbd6ba8ce64cc0b0320a0d8080fca15d79ca6ca2f732381a9550092f645f0e1d", "VK hash mismatch");
assert(artifacts.proof?.sha256 === "sha256:e76c6d47052ecdb743b894a5413de62dca556f25546c1dd4a842403532281a85", "proof hash mismatch");
assert(artifacts.publicWitness?.sha256 === "sha256:885351f63518202c4fcd120af8ffc296a8706edae14ed4795c11795dfd7f90e3", "public witness hash mismatch");
assert(artifacts.publicWitness?.encoding === "gnark public witness WriteTo", "public witness encoding mismatch");
assert(
  artifacts.publicWitness?.layout === "12-byte header + 1 * 32-byte big-endian BN254 field",
  "public witness layout mismatch",
);
assert(artifacts.publicWitness?.headerHex === "000000010000000000000001", "public witness header mismatch");
assert(
  artifacts.publicWitness?.decodedPublicInputLabel === "private-spend-public-input-hash",
  "public witness decoded public input label mismatch",
);
assert(
  artifacts.publicWitness?.decodedPublicInputValue ===
    "0x0421d1c89c8353818f26d6efcd44b4222a2de2b1f14b8287c59728573a90dd32",
  "public witness decoded public input value mismatch",
);
assert(
  artifacts.publicWitness?.matchesLocalProofReceiptPublicInput === true,
  "public witness must match local proof receipt public input",
);
assert(
  artifacts.publicWitness?.matchesGeneratedVerifierNrPubinputs === true,
  "public witness must match generated verifier public input count",
);
assert(artifacts.solanaVerifierSbf?.sha256 === "sha256:222ca0869212f455331933b5b6751a04449b5d7bd7387e72ae7f5702a3bf2e58", "SBF hash mismatch");
assert(artifacts.generatedVerifierInstructionData?.proofByteLength === 324, "generated verifier proof length mismatch");
assert(
  artifacts.generatedVerifierInstructionData?.publicWitnessByteLength === 44,
  "generated verifier public witness length mismatch",
);
assert(artifacts.generatedVerifierInstructionData?.totalByteLength === 368, "generated verifier total length mismatch");
assert(
  artifacts.generatedVerifierInstructionData?.generatedVerifierNrPubinputs === 1,
  "generated verifier nr_pubinputs mismatch",
);
assert(
  artifacts.generatedVerifierInstructionData?.generatedVerifierCommitmentKeys === 0,
  "generated verifier commitment key count mismatch",
);
assert(
  artifacts.generatedVerifierInstructionData?.standaloneLocalSvmAccepted === true,
  "generated verifier standalone LiteSVM acceptance must be recorded",
);
assert(
  artifacts.generatedVerifierInstructionData?.computeUnitsConsumed === 163841,
  "generated verifier LiteSVM compute units mismatch",
);
assert(
  artifacts.generatedVerifierInstructionData?.satisfiesVerifierAdapterEvidence === false,
  "standalone generated verifier must not satisfy Vanta adapter evidence",
);
assert(
  artifacts.generatedVerifierInstructionData?.satisfiesSbfLiveLineage === false,
  "standalone generated verifier must not satisfy SBF/live lineage",
);
assert(artifacts.provingKey?.hashStored === false, "proving key hash must not be stored");
assert(artifacts.solanaVerifierKeypair?.storedInRepo === false, "Solana verifier keypair must not be stored in repo");
assert(artifacts.solanaVerifierKeypair?.hashStored === false, "Solana verifier keypair hash must not be stored");
assert(
  artifacts.proof?.proofFormatId === "gnark-solana-native-proof-and-public-witness-v0",
  "proof must record the selected Gnark-native proof format id",
);
assert(artifacts.proof?.selectedCandidateProofByteLength === 324, "selected candidate proof length mismatch");
assert(artifacts.proof?.expectedTag3ProofByteLength === 324, "tag-3 expected proof length mismatch");
assert(artifacts.proof?.expectedTag3PublicWitnessByteLength === 44, "tag-3 expected public witness length mismatch");
assert(artifacts.proof?.expectedTag3VerifierInputByteLength === 368, "tag-3 expected verifier input length mismatch");
assert(artifacts.proof?.satisfiesProductionProofFormatEvidence === false, "proof must not satisfy production evidence");
assert(artifacts.verifyingKey?.satisfiesProductionVerifyingKeyEvidence === false, "VK must not satisfy production evidence");
assert(artifacts.solanaVerifierSbf?.satisfiesSbfLiveLineage === false, "SBF must not satisfy live lineage");

for (const blocker of [
  "beta18-only temporary import shim",
  "makeslice len out of range",
  "toxic-waste mitigation",
  "zero public and zero secret inputs",
  "selected Gnark-native 324-byte proof plus 44-byte public witness",
  "rejects the legacy 256-byte proof-only shape",
  "generated standalone Solana verifier accepts the 324-byte proof plus 44-byte public witness",
  "not wired into the spend program",
  "no valid-proof mutation",
  "no audit or reviewer accepted",
]) {
  assert(packet.remainingBlockers?.some((entry) => entry.includes(blocker)), `missing remaining blocker ${blocker}`);
}
assert(packet.satisfiesRequiredPositiveEvidence?.backendSelection === true, "backend selection should stay true");
assert(packet.satisfiesRequiredPositiveEvidence?.routeFeasibilityLocalDevProbe === true, "route feasibility probe should be true");
assertFalseEvidence(packet.satisfiesRequiredPositiveEvidence, "satisfiesRequiredPositiveEvidence");
for (const marker of [
  "not production proof-format evidence",
  "not production verifying-key evidence",
  "not private-spend-public-input-hash binding acceptance",
  "not verifier-adapter acceptance",
  "not valid-proof mutation evidence",
  "not SBF/live lineage",
  "not audit/reviewer acceptance",
  "not C01 closure",
]) {
  includes(packet.truthBoundary ?? "", marker, "packet truth boundary");
}
for (const command of [
  "npm run zk:c01-sunspot-groth16-dev-probe-check",
  "npm run zk:c01-sunspot-groth16-route-check",
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "npm run zk:c01-public-witness-binding-check",
]) {
  assert(packet.canonicalCommands?.includes(command), `missing canonical command ${command}`);
}
for (const marker of [
  "C01 Sunspot/Gnark local dev probe",
  packetPath,
  "local-dev-probe-succeeded-nonproduction-unsafe-setup-and-beta18-source-shim",
  "generated standalone Solana verifier",
  "324-byte proof plus 44-byte public witness",
  "rejects the legacy 256-byte proof-only shape",
  "one public input",
  "zero public and zero secret inputs",
]) {
  includes(decision, marker, decisionPath);
}

console.log("private-pool-v2 C01 Sunspot Groth16 dev probe: PASS");

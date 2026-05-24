import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json";
const sourceMigrationPath =
  "ops/mainnet/private-pool-v2-c01-beta18-source-migration-candidate.evidence.json";
const currentSourceCompileAttemptPath =
  "ops/mainnet/private-pool-v2-c01-current-source-sunspot-compile-attempt.evidence.json";
const routePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const acceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const adapterPath = "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const runbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const currentProofReceiptPath =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json";
const currentH6PublicInputValue =
  "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b";
const currentH6PublicInputCommitment =
  "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2";
const currentSourceAcirSha256 =
  "sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9";
const reviewedBeta18H6SourceAcirSha256 =
  "sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde";
const rawValidationEnv = "VANTA_C01_BETA18_H6_PROBE_RAW";

function fail(message) {
  console.error(`private-pool-v2 C01 beta18 H6 migration probe: FAIL - ${message}`);
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

function sha256File(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return `sha256:${hash.digest("hex")}`;
}

function decodePublicWitness(path) {
  const bytes = readFileSync(path);
  return {
    byteLength: bytes.byteLength,
    headerHex: bytes.subarray(0, 12).toString("hex"),
    value: `0x${bytes.subarray(12).toString("hex")}`,
    decimal: BigInt(`0x${bytes.subarray(12).toString("hex")}`).toString(),
  };
}

function assertRawArtifact(path, expected, label, { hash = true } = {}) {
  assert(existsSync(path), `${label} missing at ${path}`);
  assert(statSync(path).size === expected.byteLength, `${label} byte length mismatch`);
  if (hash) {
    assert(sha256File(path) === expected.sha256, `${label} sha256 mismatch`);
  }
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};

assert(
  scripts["zk:c01-beta18-h6-migration-probe-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-beta18-h6-migration-probe.mjs",
  "package.json must expose zk:c01-beta18-h6-migration-probe-check",
);
assert(
  scripts["private-pool-v2:c01-local-unsafe-h6-verifier-cpi-acceptance-check"]?.includes(
    "/private/tmp/vanta-c01-sunspot-lane/work/beta18-h6-circuit/target",
  ),
  "package.json must expose the local unsafe H6 generated-verifier CPI command",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-beta18-h6-migration-probe-check"),
    `${aggregate} must include the beta18 H6 migration probe guard`,
  );
}

const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const sourceMigration = readJson(sourceMigrationPath);
const currentSourceCompileAttempt = readJson(currentSourceCompileAttemptPath);
const route = readJson(routePath);
const acquisition = readJson(acquisitionPath);
const acceptanceGate = readJson(acceptanceGatePath);
const adapter = readJson(adapterPath);
const receipt = readJson(currentProofReceiptPath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);
const runbook = read(runbookPath);
const review = read(reviewPath);

assert(
  packet.version === "vanta-private-pool-v2-c01-beta18-h6-migration-probe-evidence-0.1",
  "schema mismatch",
);
assert(
  packet.status === "local-h6-beta18-migration-probe-succeeded-nonproduction-unsafe-setup",
  "status mismatch",
);
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(packet.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route id mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "sourceMigrationReady",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(
  packet.secretPolicy ===
    "metadata-and-hashes-only-no-raw-proof-vk-witness-pk-keypair-or-signed-transaction-bytes",
  "secret policy mismatch",
);
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

for (const [field, expected] of [
  ["sourceMigrationCandidateRef", sourceMigrationPath],
  ["currentSourceSunspotCompileAttemptRef", currentSourceCompileAttemptPath],
  ["routePacketRef", routePath],
  ["artifactAcquisitionPacketRef", acquisitionPath],
  ["productionArtifactAcceptanceGateRef", acceptanceGatePath],
  ["verifierAdapterTestCandidateRef", adapterPath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(packet[field] === expected, `${field} mismatch`);
}
assert(sourceMigration.localH6Beta18MigrationProbeRef === packetPath, "source migration packet must reference H6 probe");
assert(currentSourceCompileAttempt.status.includes("blocked-current-beta19"), "current-source compile attempt status mismatch");
assert(route.routeId === packet.routeId, "route linkage mismatch");
assert(acquisition.routeId === packet.routeId, "acquisition linkage mismatch");
assert(
  acceptanceGate.requiredProductionBundleShape?.referenceCurrentSourceAcirSha256 === currentSourceAcirSha256,
  "acceptance reference current-source hash mismatch",
);
assert(
  acceptanceGate.requiredProductionBundleShape?.productionSourceLineageMode ===
    "reviewed-beta18-h6-source-migration",
  "acceptance source lineage mode mismatch",
);
assert(
  acceptanceGate.requiredProductionBundleShape?.sourceAcirSha256 === reviewedBeta18H6SourceAcirSha256,
  "acceptance production source hash mismatch",
);
assert(adapter.selectedBackend === packet.selectedBackend, "adapter selected backend mismatch");

const current = packet.currentRepoCircuit ?? {};
assert(current.nargoVersion === "1.0.0-beta.19", "current nargo mismatch");
assert(current.compiledAcirSha256 === currentSourceAcirSha256, "current ACIR hash mismatch");
assert(current.publicInputLabel === "private-spend-public-input-hash", "public input label mismatch");
assert(current.proofReceiptRef === currentProofReceiptPath, "proof receipt ref mismatch");
assert(current.proofReceiptPublicInput === currentH6PublicInputValue, "proof receipt public input mismatch");
assert(current.proofReceiptPublicInputCommitment === currentH6PublicInputCommitment, "proof receipt commitment mismatch");
assert(receipt.publicInputs?.[0] === currentH6PublicInputValue, "current receipt public input mismatch");
assert(receipt.publicInputCommitment === currentH6PublicInputCommitment, "current receipt commitment mismatch");
for (const marker of [
  "five context_preimage_* private inputs",
  "derive_actual_private_spend_context_tag",
  "bn254::hash_6",
  "assert computed_context_hash == context_hash",
]) {
  includes(current.h6RequiredSemantics?.join("\n") ?? "", marker, "current H6 required semantics");
}

const probe = packet.localH6Beta18Probe ?? {};
assert(probe.status === "passed-local-unsafe", "probe status mismatch");
assert(probe.workDir === "/private/tmp/vanta-c01-sunspot-lane/work/beta18-h6-circuit", "probe workDir mismatch");
assert(probe.targetDir === "/private/tmp/vanta-c01-sunspot-lane/work/beta18-h6-circuit/target", "probe targetDir mismatch");
assert(probe.sourceSha256 === "sha256:caaeb2c2767965bd5d6c68c3043b8be10b43b345f017e32c6aa67658e927d430", "probe source hash mismatch");
assert(probe.nargoVersion === "1.0.0-beta.18", "probe nargo mismatch");
assert(probe.poseidonImport === "use dep::poseidon::poseidon::bn254;", "probe import mismatch");
for (const field of [
  "h6ContextPreimageInputsPresent",
  "h6Poseidon6ContextAssertionPresent",
  "matchesCurrentH6PublicInput",
]) {
  assert(probe[field] === true, `probe ${field} must be true`);
}
for (const field of [
  "matchesCurrentSourceAcir",
  "satisfiesReviewedSourceMigration",
  "satisfiesProductionSourceLineage",
]) {
  assert(probe[field] === false, `probe ${field} must remain false`);
}
for (const marker of [
  "preserves the H6 context preimage binding",
  "not reviewed",
  "does not match the current beta19 source ACIR hash",
]) {
  includes(probe.truthBoundary ?? "", marker, "probe truth boundary");
}

const flow = new Map((packet.observedProbeFlow ?? []).map((entry) => [entry.step, entry]));
for (const [step, status] of [
  ["switch-nargo-beta18", "passed"],
  ["nargo-check", "passed-after-cache-access"],
  ["nargo-compile", "passed"],
  ["nargo-execute", "passed"],
  ["sunspot-compile", "passed"],
  ["sunspot-setup", "passed-nonproduction-unsafe"],
  ["sunspot-prove", "passed"],
  ["sunspot-verify", "passed"],
  ["sunspot-build-solana-verifier-sbf", "passed-local-build-only"],
  ["sunspot-generated-verifier-litesvm-positive", "passed-local-svm-only"],
  ["vanta-local-unsafe-generated-verifier-cpi-harness", "passed-local-unsafe-only"],
  ["restore-nargo-beta19", "passed"],
]) {
  assert(flow.get(step)?.status === status, `flow ${step} status mismatch`);
}
assert(flow.get("sunspot-compile")?.nbConstraints === 27614, "Sunspot H6 constraint count mismatch");
assert(flow.get("sunspot-compile")?.sunspotReportedPublicInputs === 0, "Sunspot public input report mismatch");
assert(flow.get("sunspot-generated-verifier-litesvm-positive")?.computeUnitsConsumed === 163841, "LiteSVM CU mismatch");
includes(flow.get("sunspot-build-solana-verifier-sbf")?.warning ?? "", "undefined functions", "SBF warning");

const artifacts = packet.observedArtifacts ?? {};
assert(artifacts.compiledAcir?.byteLength === 1906902, "compiled ACIR byte length mismatch");
assert(artifacts.compiledAcir?.sha256 === "sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde", "compiled ACIR hash mismatch");
assert(artifacts.compiledAcir?.matchesCurrentSourceAcir === false, "compiled ACIR must not match current source hash");
assert(artifacts.compressedWitness?.byteLength === 541233, "compressed witness byte length mismatch");
assert(artifacts.compressedWitness?.rawValuesStoredInRepo === false, "witness values must not be stored");
assert(artifacts.ccs?.sha256 === "sha256:b32de5a9a88c630ff4dd158b3f11e2dd9b40877e40aaff4e723b8ffde18fa71e", "CCS hash mismatch");
assert(artifacts.provingKey?.byteLength === 15587553, "PK byte length mismatch");
assert(artifacts.provingKey?.hashStored === false, "PK hash must not be stored");
assert(artifacts.verifyingKey?.byteLength === 716, "VK byte length mismatch");
assert(artifacts.verifyingKey?.sha256 === "sha256:5e0a6f08503f534cbb462f43fbf0b247e8aa2ce75d1fa58c2350f815817948b4", "VK hash mismatch");
assert(
  artifacts.verifyingKey?.verifyingKeyHashKind === "local-unsafe-h6-beta18-sunspot-vk-hash-not-production",
  "VK hash kind mismatch",
);
assert(artifacts.proof?.byteLength === 324, "proof byte length mismatch");
assert(artifacts.proof?.sha256 === "sha256:afde2c07683c4262b5b9ae72c66e559e857a9fd7a529b980b34a45bf2374d186", "proof hash mismatch");
assert(artifacts.proof?.proofFormatId === "gnark-solana-native-proof-and-public-witness-v0", "proof format mismatch");
assert(artifacts.publicWitness?.byteLength === 44, "public witness byte length mismatch");
assert(artifacts.publicWitness?.sha256 === "sha256:19e42b6e34a5861d8804565476d72f8835c81d30cfc66bd598a236d26e1baa60", "public witness hash mismatch");
assert(artifacts.publicWitness?.headerHex === "000000010000000000000001", "public witness header mismatch");
assert(artifacts.publicWitness?.decodedPublicInputValue === currentH6PublicInputValue, "public witness decoded value mismatch");
assert(artifacts.publicWitness?.matchesCurrentH6ProofReceiptPublicInput === true, "public witness H6 match mismatch");
assert(artifacts.publicWitness?.matchesCurrentH6ProofReceiptCommitment === true, "public witness H6 commitment flag mismatch");
assert(artifacts.publicWitness?.satisfiesProductionPublicInputBindingEvidence === false, "public witness production flag mismatch");
assert(artifacts.solanaVerifierSbf?.byteLength === 86216, "SBF byte length mismatch");
assert(artifacts.solanaVerifierSbf?.sha256 === "sha256:91fc2db5e06ebfb72bee120ebbcd51698684216598ec50f046d62fcf64928ac0", "SBF hash mismatch");
assert(artifacts.solanaVerifierSbf?.standaloneLocalSvmAccepted === true, "SBF standalone flag mismatch");
assert(artifacts.solanaVerifierSbf?.satisfiesSbfLiveLineage === false, "SBF lineage flag mismatch");
assert(artifacts.solanaVerifierKeypair?.storedInRepo === false, "keypair must not be stored in repo");
assert(artifacts.solanaVerifierKeypair?.hashStored === false, "keypair hash must not be stored");

const adapterProbe = packet.localUnsafeVantaAdapterProbe ?? {};
assert(
  adapterProbe.status === "passed-local-unsafe-h6-generated-verifier-cpi-harness",
  "local unsafe Vanta adapter probe status mismatch",
);
assert(adapterProbe.satisfiesVerifierAdapterAcceptance === false, "local adapter probe must not satisfy production adapter acceptance");
assert(
  adapterProbe.satisfiesProductionMutationNoMutationEvidence === false,
  "local adapter probe must not satisfy production mutation/no-mutation evidence",
);
for (const marker of [
  "local Vanta spend SBF can CPI",
  "local unsafe H6-preserving generated verifier",
  "wrong-verifying-key local unsafe no-mutation",
  "not production verifier-adapter acceptance",
]) {
  includes(adapterProbe.truthBoundary ?? "", marker, "local adapter probe truth boundary");
}

for (const [field, expected] of [
  ["backendSelection", true],
  ["localH6Beta18MigrationProbe", true],
  ["privateSpendPublicInputHashBindingLocalH6Probe", true],
  ["reviewedSourceMigration", false],
  ["actualPrivateSpendProductionProofFormat", false],
  ["privateSpendPublicInputHashBinding", false],
  ["productionVerifyingKeyHash", false],
  ["verifierAdapter", false],
  ["acceptedProofMutatesStateTest", false],
  ["invalidProofLeavesAccountsUnchangedTest", false],
  ["wrongPublicInputHashLeavesAccountsUnchangedTest", false],
  ["wrongVerifyingKeyLeavesAccountsUnchangedTest", false],
  ["sbfLiveLineage", false],
  ["auditReviewerAcceptance", false],
]) {
  assert(packet.satisfiesRequiredPositiveEvidence?.[field] === expected, `${field} mismatch`);
}
assertStringArray(packet.remainingBlockers, "remainingBlockers");
for (const blocker of [
  "no reviewed beta18-compatible source migration",
  "Sunspot setup used unsafe local single-operator setup with no toxic-waste mitigation",
  "no production verifier adapter acceptance",
  "no audit/reviewer acceptance",
]) {
  assert(packet.remainingBlockers.includes(blocker), `missing blocker ${blocker}`);
}
assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-beta18-h6-migration-probe-check",
  "VANTA_C01_BETA18_H6_PROBE_RAW=1 npm run zk:c01-beta18-h6-migration-probe-check",
  "npm run zk:c01-beta18-source-migration-candidate-check",
  "npm run zk:c01-current-source-sunspot-compile-attempt-check",
  "npm run zk:review-guards-check",
]) {
  assert(packet.canonicalCommands.includes(command), `missing canonical command ${command}`);
}
for (const marker of [
  "local H6-preserving beta18 migration probe evidence only",
  "public witness matches the current H6 proof receipt",
  "not a reviewed source migration",
  "not production proof-format evidence",
  "not production verifier-adapter acceptance",
  "not C01 closure",
]) {
  includes(packet.truthBoundary ?? "", marker, "truth boundary");
}

for (const marker of [
  "C01 beta18 H6 migration probe packet",
  packetPath,
  "npm run zk:c01-beta18-h6-migration-probe-check",
  "local-h6-beta18-migration-probe-succeeded-nonproduction-unsafe-setup",
  "public witness matches the current H6 proof receipt",
]) {
  includes(decision, marker, decisionPath);
  includes(auditPackage, marker, auditPackagePath);
  includes(runbook, marker, runbookPath);
  includes(review, marker, reviewPath);
}

if (process.env[rawValidationEnv] === "1") {
  const targetDir = packet.localH6Beta18Probe.targetDir;
  assertRawArtifact(`${targetDir}/vanta_private_pool_v2_actual_private_spend_entry.json`, artifacts.compiledAcir, "compiled ACIR");
  assertRawArtifact(`${targetDir}/vanta_private_pool_v2_actual_private_spend_entry.gz`, {
    byteLength: artifacts.compressedWitness.byteLength,
    sha256: "sha256:f1af35a8f0425583712933ff49fb5707dcb888defad3c9c9a6ed4da1755f51a1",
  }, "compressed witness");
  assertRawArtifact(`${targetDir}/vanta_private_pool_v2_actual_private_spend_entry.ccs`, artifacts.ccs, "CCS");
  assertRawArtifact(`${targetDir}/vanta_private_pool_v2_actual_private_spend_entry.pk`, artifacts.provingKey, "proving key", {
    hash: false,
  });
  assertRawArtifact(`${targetDir}/vanta_private_pool_v2_actual_private_spend_entry.vk`, artifacts.verifyingKey, "verifying key");
  assertRawArtifact(`${targetDir}/vanta_private_pool_v2_actual_private_spend_entry.proof`, artifacts.proof, "proof");
  assertRawArtifact(`${targetDir}/vanta_private_pool_v2_actual_private_spend_entry.pw`, artifacts.publicWitness, "public witness");
  assertRawArtifact(`${targetDir}/vanta_private_pool_v2_actual_private_spend_entry.so`, artifacts.solanaVerifierSbf, "verifier SBF");

  const decoded = decodePublicWitness(`${targetDir}/vanta_private_pool_v2_actual_private_spend_entry.pw`);
  assert(decoded.headerHex === artifacts.publicWitness.headerHex, "raw public witness header mismatch");
  assert(decoded.value === currentH6PublicInputValue, "raw public witness value mismatch");
  assert(decoded.decimal === artifacts.publicWitness.decodedPublicInputDecimal, "raw public witness decimal mismatch");
}

console.log("private-pool-v2 C01 beta18 H6 migration probe: PASS");

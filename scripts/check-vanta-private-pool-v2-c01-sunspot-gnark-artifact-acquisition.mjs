import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const routePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json";
const devProbePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json";
const currentSourceCompileAttemptPath =
  "ops/mainnet/private-pool-v2-c01-current-source-sunspot-compile-attempt.evidence.json";
const localArtifactInventoryPath =
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-local-artifact-inventory.evidence.json";
const productionVerifierArtifactRequestPath =
  "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json";
const acceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const deterministicBuildGatePath =
  "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json";
const publicWitnessBindingPath =
  "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json";
const preflightPath =
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const sunspotSourceRef = "https://github.com/reilabs/sunspot";
const sunspotRequiredNargoVersion = "1.0.0-beta.18";
const localObservedNargoVersion = "1.0.0-beta.19";
const sunspotCompatibilityStatus = "blocked-local-nargo-version-mismatch-and-sunspot-missing";
const currentH6LocalProofReceiptRef =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json";
const currentH6PublicInputValue =
  "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b";
const currentH6PublicInputCommitment =
  "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2";
const staleBeta18PublicWitnessValue =
  "0x0421d1c89c8353818f26d6efcd44b4222a2de2b1f14b8287c59728573a90dd32";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fail(message) {
  console.error(`private-pool-v2 C01 Sunspot/Gnark artifact acquisition: FAIL - ${message}`);
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

function assertSunspotCompatibility(value, label) {
  assert(value && typeof value === "object", `${label} must be an object`);
  assert(value.sourceRef === sunspotSourceRef, `${label} sourceRef mismatch`);
  assert(
    value.sourceRequirement === "Sunspot README requires Noir 1.0.0-beta.18",
    `${label} source requirement mismatch`,
  );
  assert(value.requiredNoirVersion === sunspotRequiredNargoVersion, `${label} Noir version mismatch`);
  assert(value.requiredNargoVersion === sunspotRequiredNargoVersion, `${label} nargo version mismatch`);
  assert(value.observedNargoVersion === localObservedNargoVersion, `${label} observed nargo mismatch`);
  assert(value.status === sunspotCompatibilityStatus, `${label} status mismatch`);
  assert(value.sunspotInstalled === false, `${label} must record Sunspot as not installed`);
  assert(value.gnarkVerifierBinConfigured === false, `${label} must record GNARK_VERIFIER_BIN as unconfigured`);
  assert(
    value.satisfiesProductionArtifactGeneration === false,
    `${label} must not satisfy production artifact generation`,
  );
  for (const marker of [
    "required Noir/Nargo version",
    "Sunspot binary",
    "GNARK verifier binary",
    "reviewer acceptance",
  ]) {
    includes(value.truthBoundary ?? "", marker, `${label} truthBoundary`);
  }
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};

assert(
  scripts["zk:c01-sunspot-gnark-artifact-acquisition-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sunspot-gnark-artifact-acquisition.mjs",
  "package.json must expose zk:c01-sunspot-gnark-artifact-acquisition-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sunspot-gnark-artifact-acquisition-check"),
    `${aggregate} must include the C01 Sunspot/Gnark artifact acquisition guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sunspot-groth16-dev-probe-check"),
    `${aggregate} must include the C01 Sunspot Groth16 dev-probe guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-current-source-sunspot-compile-attempt-check"),
    `${aggregate} must include the C01 current-source Sunspot compile-attempt guard`,
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
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-deterministic-production-artifact-build-check"),
    `${aggregate} must include the C01 deterministic production artifact build guard`,
  );
}

assert(existsSync(resolve(repoRoot, packetPath)), `missing ${packetPath}`);

const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const route = readJson(routePath);
const currentSourceCompileAttempt = readJson(currentSourceCompileAttemptPath);
const localArtifactInventory = readJson(localArtifactInventoryPath);
const acceptanceGate = readJson(acceptanceGatePath);
const deterministicBuildGate = readJson(deterministicBuildGatePath);
const preflight = readJson(preflightPath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);

assert(packet.version === "vanta-private-pool-v2-c01-sunspot-gnark-artifact-acquisition-0.1", "schema mismatch");
assert(packet.status === "blocked-awaiting-reviewed-external-artifact-intake", "packet status mismatch");
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(packet.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route id mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "externalArtifactsReady",
]) {
  assert(packet[field] === false, `${field} must be false`);
}
assert(
  packet.secretPolicy ===
    "refs-only-no-raw-proof-vk-witness-secret-or-signed-transaction-bytes",
  "secret policy mismatch",
);
for (const phrase of [
  "proofBytes",
  "proofHex",
  "rawProof",
  "verifyingKeyBytes",
  "verifying_key_bytes",
  "vkBytes",
  "witnessBytes",
  "bearer ",
  "postgres://",
  "postgresql://",
  "-----BEGIN",
]) {
  assert(!packetText.includes(phrase), `packet must not contain byte-bearing or secret-bearing phrase ${phrase}`);
}

assert(packet.routePacketRef === routePath, "route packet ref mismatch");
assert(
  packet.currentSourceSunspotCompileAttemptRef === currentSourceCompileAttemptPath,
  "current-source compile-attempt ref mismatch",
);
assert(packet.localSunspotGroth16DevProbeRef === devProbePath, "local dev-probe ref mismatch");
assert(
  packet.localSunspotGnarkLocalArtifactInventoryRef === localArtifactInventoryPath,
  "local artifact inventory ref mismatch",
);
assert(
  packet.productionVerifierArtifactRequestRef === productionVerifierArtifactRequestPath,
  "production verifier artifact request ref mismatch",
);
assert(packet.productionArtifactAcceptanceGateRef === acceptanceGatePath, "acceptance gate ref mismatch");
assert(
  packet.deterministicProductionArtifactBuildGateRef === deterministicBuildGatePath,
  "deterministic build gate ref mismatch",
);
assert(
  localArtifactInventory.status === "local-artifact-inventory-observed-nonproduction-unsafe-setup",
  "local artifact inventory status mismatch",
);
assert(acceptanceGate.status === "blocked-no-reviewed-production-artifact-bundle", "acceptance gate status mismatch");
assert(
  deterministicBuildGate.status === "blocked-no-deterministic-production-artifact-build-receipt",
  "deterministic build gate status mismatch",
);
assert(
  acceptanceGate.artifactAcquisitionPacketRef === packetPath,
  "acceptance gate must reference the artifact acquisition packet",
);
assert(
  deterministicBuildGate.artifactAcquisitionPacketRef === packetPath,
  "deterministic build gate must reference the artifact acquisition packet",
);
assert(
  acceptanceGate.currentAcceptedProductionBundle?.satisfiesProductionArtifactAcceptance === false,
  "acceptance gate must not satisfy production artifact acceptance",
);
assert(
  localArtifactInventory.satisfiesRequiredPositiveEvidence?.actualPrivateSpendProductionProofFormat ===
    false,
  "local artifact inventory must not satisfy production proof-format evidence",
);
assert(
  localArtifactInventory.satisfiesRequiredPositiveEvidence?.productionVerifyingKeyHash === false,
  "local artifact inventory must not satisfy production verifying-key evidence",
);
assert(
  packet.localSunspotPublicWitnessBindingObservationRef?.artifactRef === publicWitnessBindingPath,
  "public-witness binding observation ref mismatch",
);
assert(
  packet.localSunspotPublicWitnessBindingObservationRef?.command ===
    "npm run zk:c01-public-witness-binding-check",
  "public-witness binding command mismatch",
);
assert(
  packet.localSunspotPublicWitnessBindingObservationRef?.status ===
    "local-public-witness-decoded-stale-against-current-proof-receipt",
  "public-witness binding status mismatch",
);
for (const marker of [
  "decodes the /private/tmp beta18 public witness",
  "private-spend-public-input-hash",
  "stale against the current H6 local proof receipt",
  "does not satisfy production public-input binding evidence",
]) {
  includes(
    packet.localSunspotPublicWitnessBindingObservationRef?.truthBoundary ?? "",
    marker,
    "public-witness binding truth boundary",
  );
}
const productionWitnessBinding = packet.requiredProductionPublicWitnessBinding ?? {};
assert(
  productionWitnessBinding.status === "blocked-current-h6-public-input-binding-required",
  "production public-witness binding status mismatch",
);
assert(
  productionWitnessBinding.publicWitnessBindingObservationRef === publicWitnessBindingPath,
  "production public-witness binding observation ref mismatch",
);
assert(
  productionWitnessBinding.localProofReceiptRef === currentH6LocalProofReceiptRef,
  "production public-witness binding proof receipt ref mismatch",
);
assert(
  productionWitnessBinding.requiredPublicInputLabel === "private-spend-public-input-hash",
  "production public-witness binding label mismatch",
);
assert(
  productionWitnessBinding.requiredPublicInputValue === currentH6PublicInputValue,
  "production public-witness binding required public input mismatch",
);
assert(
  productionWitnessBinding.requiredPublicInputCommitment === currentH6PublicInputCommitment,
  "production public-witness binding commitment mismatch",
);
assert(
  productionWitnessBinding.localBeta18PublicWitnessValue === staleBeta18PublicWitnessValue,
  "production public-witness binding stale beta18 value mismatch",
);
assert(
  productionWitnessBinding.localBeta18PublicWitnessMatchesCurrentReceipt === false,
  "production public-witness binding must reject stale beta18 public witness",
);
assert(
  productionWitnessBinding.satisfiesProductionPublicInputBinding === false,
  "production public-witness binding must remain unsatisfied",
);
for (const marker of [
  "bind to the current H6 local proof receipt public input and commitment",
  "local beta18 public witness is stale",
  "comparison-only",
]) {
  includes(
    productionWitnessBinding.truthBoundary ?? "",
    marker,
    "production public-witness binding truth boundary",
  );
}
assert(packet.productionGroth16ToolchainPreflightRef === preflightPath, "preflight packet ref mismatch");
assert(route.artifactAcquisitionPacketRef === packetPath, "route packet must reference artifact acquisition packet");
assert(route.localSunspotGroth16DevProbeRef === devProbePath, "route packet must reference local dev probe");
assert(
  route.currentSourceSunspotCompileAttemptRef === currentSourceCompileAttemptPath,
  "route packet must reference current-source compile attempt",
);
assert(
  currentSourceCompileAttempt.artifactAcquisitionPacketRef === packetPath,
  "current-source compile-attempt packet must reference artifact acquisition",
);
assert(
  currentSourceCompileAttempt.status ===
    "blocked-current-beta19-acir-bytecode-format-unsupported-by-sunspot-beta18-reader",
  "current-source compile-attempt status mismatch",
);
assert(preflight.sunspotGroth16RouteRef === routePath, "preflight packet must reference route packet");
assert(
  preflight.currentSourceSunspotCompileAttemptRef === currentSourceCompileAttemptPath,
  "preflight packet must reference current-source compile attempt",
);
assert(preflight.localSunspotGroth16DevProbeRef === devProbePath, "preflight packet must reference local dev probe");
assert(route.routeId === packet.routeId, "route packet route id mismatch");
assert(route.status === "blocked-sunspot-toolchain-not-installed-and-no-production-trusted-setup", "route status mismatch");
assertSunspotCompatibility(packet.sunspotCompatibility, "artifact acquisition sunspotCompatibility");
assertSunspotCompatibility(route.sunspotCompatibility, "route sunspotCompatibility");
assertSunspotCompatibility(preflight.sunspotCompatibility, "preflight sunspotCompatibility");

const sourceCircuit = packet.sourceCircuit ?? {};
assert(sourceCircuit.path === route.sourceCircuit?.path, "source circuit path mismatch");
assert(sourceCircuit.compiledAcirRef === route.sourceCircuit?.compiledAcirRef, "compiled ACIR ref mismatch");
assert(sourceCircuit.compiledAcirSha256 === route.sourceCircuit?.compiledAcirSha256, "compiled ACIR hash mismatch");
assert(sourceCircuit.compressedWitnessRef === route.sourceCircuit?.compressedWitnessRef, "compressed witness ref mismatch");
assert(sourceCircuit.compressedWitnessHashStored === false, "packet must not store witness hash");
assert(sourceCircuit.compressedWitnessValuesStored === false, "packet must not store witness values");

const artifacts = mapById(packet.requiredReturnedArtifacts, "required returned artifacts");
for (const [id, shape] of [
  ["pinned-sunspot-gnark-toolchain-source", "source:<pinned-sunspot-gnark-source-or-release-ref>"],
  ["reviewed-toolchain-build", "review:<reproducible-toolchain-build-review-ref>"],
  ["trusted-setup-or-toxic-waste-mitigation", "setup:<reviewed-ceremony-or-toxic-waste-mitigation-ref>"],
  ["deterministic-production-artifact-build-receipt", "build:<reviewed-deterministic-production-artifact-build-receipt-ref>"],
  ["deterministic-groth16-proof-format-artifact", "artifact:<actual-private-spend-groth16-proof-format-ref>"],
  ["production-verifying-key-artifact", "artifact:<actual-private-spend-production-vk-ref>"],
  ["production-verifying-key-hash", "sha256:<production-verifying-key-hash>"],
  ["public-witness-artifact", "artifact:<current-h6-public-witness-values-ref-no-private-witness>"],
  ["solana-verifier-adapter-or-program", "adapter:<solana-groth16-verifier-adapter-or-program-ref>"],
  ["valid-proof-mutation-test", "test:<valid-proof-mutates-nullifier-output-state-ref>"],
  ["invalid-proof-no-mutation-test", "test:<invalid-proof-leaves-account-bytes-unchanged-ref>"],
  ["wrong-public-input-no-mutation-test", "test:<wrong-public-input-hash-leaves-account-bytes-unchanged-ref>"],
  ["wrong-verifying-key-no-mutation-test", "test:<wrong-verifying-key-leaves-account-bytes-unchanged-ref>"],
  ["sbf-live-lineage", "lineage:<rebuilt-redeployed-reinitialized-sbf-and-account-evidence-ref>"],
  ["audit-reviewer-acceptance", "audit-or-review:<selected-verifier-backend-accepted-for-c01-ref>"],
]) {
  const artifact = artifacts.get(id);
  assert(artifact, `missing required returned artifact ${id}`);
  assert(artifact.requiredRefShape === shape, `${id} requiredRefShape mismatch`);
  assert(artifact.currentRef === null, `${id} currentRef must stay null`);
  assert(artifact.satisfiesC01PositiveEvidence === false, `${id} must not satisfy C01 evidence yet`);
}

for (const requirement of [
  "pinned and reviewed Sunspot/Gnark source or release",
  "reproducible toolchain build review",
  "reviewed Sunspot/Gnark support for the current beta19 source ACIR bytecode format or a reviewed source migration with accepted source lineage; latest observed upstream Sunspot main e29fd6586f9a9f936ace0d71c103f5a4e9d9db76 still does not support the current beta19 bytecode format",
  "production trusted setup ceremony or equivalent toxic-waste mitigation",
  "deterministic reviewed production artifact build receipt",
  "deterministic Groth16 proof-format artifact for vanta_private_pool_v2_actual_private_spend_entry",
  "production verifying-key artifact and hash",
  "public witness artifact separated from private witness values",
  "public witness artifact bound to the current H6 private-spend-public-input-hash receipt",
  "Solana verifier adapter or verifier CPI acceptance",
  "valid-proof mutation and invalid/wrong-public-input/wrong-verifying-key no-mutation tests",
  "rebuilt SBF, redeploy/reinit/live lineage, and audit/reviewer acceptance",
]) {
  assert(packet.productionAcceptanceRequires?.includes(requirement), `missing acceptance requirement ${requirement}`);
}

assertStringArray(packet.forbiddenInRepo, "forbiddenInRepo");
for (const forbidden of [
  "raw proof bytes",
  "raw verifying-key bytes",
  "raw witness values",
  "private keys",
  "seed phrases",
  "signed transactions",
  "auth tokens",
  "database URLs",
]) {
  assert(packet.forbiddenInRepo.includes(forbidden), `missing forbidden item ${forbidden}`);
}

for (const [field, expected] of [
  ["backendSelection", true],
  ["routeFeasibilityLocalDevProbe", true],
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

assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "npm run zk:c01-sunspot-groth16-route-check",
  "npm run zk:c01-current-source-sunspot-compile-attempt-check",
  "VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-latest-e29fd658/go/sunspot VANTA_C01_SUNSPOT_COMPILE_ATTEMPT=latest VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check",
  "npm run zk:c01-production-groth16-toolchain-preflight-check",
  "npm run zk:c01-public-witness-binding-check",
  "npm run zk:c01-sunspot-gnark-local-artifact-inventory-check",
  "npm run zk:c01-production-verifier-artifact-request-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-deterministic-production-artifact-build-check",
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
]) {
  assert(packet.canonicalCommands.includes(command), `missing canonical command ${command}`);
}
for (const marker of [
  "refs-only external artifact acquisition packet",
  "not production proof-format evidence",
  "not production verifying-key evidence",
  "not verifier-adapter acceptance",
  "not SBF/live lineage",
]) {
  includes(packet.truthBoundary ?? "", marker, "packet truth boundary");
}
for (const marker of [
  "C01 Sunspot/Gnark artifact acquisition packet",
  packetPath,
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json",
  "npm run zk:c01-production-verifier-artifact-request-check",
  "current source ACIR hash",
  "current H6 proof receipt public input and commitment",
]) {
  includes(decision, marker, decisionPath);
  includes(auditPackage, marker, auditPackagePath);
}
assert(!auditPackage.includes("no backend is selected yet"), "audit package must not claim no backend is selected");

console.log("private-pool-v2 C01 Sunspot/Gnark artifact acquisition: PASS");

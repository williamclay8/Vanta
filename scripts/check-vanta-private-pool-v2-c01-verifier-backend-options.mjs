import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 C01 verifier backend options: FAIL - ${message}`);
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

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const options = JSON.parse(read("ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json"));
const candidate = JSON.parse(read("ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json"));
const localProofFormat = JSON.parse(read("ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json"));
const registry = JSON.parse(read("ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json"));
const decision = read("docs/zk/c01-production-verifier-backend-decision.md");

assert(
  scripts["zk:c01-verifier-backend-options-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-backend-options.mjs",
  "package.json must expose zk:c01-verifier-backend-options-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-backend-options-check"),
    `${aggregate} must include the backend-options guard`,
  );
}

assert(
  options.version === "vanta-private-pool-v2-c01-verifier-backend-options-evidence-0.1",
  "backend-options evidence must use the checked schema",
);
assert(options.status === "blocked-backend-options-unselected", "backend-options status must stay blocked");
assert(options.selectedBackend === null, "backend-options must not select a backend");
assert(options.selectedBackendStatus === "not-selected", "backend-options selectedBackendStatus must stay not-selected");
for (const [field, expected] of [
  ["productionReady", false],
  ["mainnetReady", false],
  ["privacyClaimAllowed", false],
  ["c01VerifierReady", false],
  ["solanaC01Groth16VerifierReady", false],
]) {
  assert(options[field] === expected, `backend-options ${field} must be ${expected}`);
}

assert(
  options.decisionPacketRef === "docs/zk/c01-production-verifier-backend-decision.md",
  "backend-options must reference the C01 decision packet",
);
assert(
  options.candidatePacketRef === "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
  "backend-options must reference the C01 candidate packet",
);
assert(
  options.localProofFormatRef === "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json",
  "backend-options must reference the local proof-format observation",
);
assert(
  options.verifierKeyRegistryRef === "ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json",
  "backend-options must reference the verifier-key registry evidence",
);

assert(options.currentTargetContract?.tag === 3, "backend-options must preserve tag 3 as current target");
assert(
  options.currentTargetContract?.target === "solana-c01-tag3-groth16-v0",
  "backend-options must preserve the current Groth16 tag-3 target",
);
assert(
  options.currentTargetContract?.proofSystem === "groth16",
  "backend-options current target must stay Groth16-shaped",
);
assert(
  options.currentTargetContract?.proofByteLength === 256,
  "backend-options current target must stay 256-byte Groth16 proof shaped",
);
assert(
  options.currentTargetContract?.verifyingKeyHashKind === "production-verifying-key-hash",
  "backend-options current target must require production VK hash kind",
);
assert(
  options.currentTargetContract?.status === "reserved-fail-closed",
  "backend-options current target must remain fail closed",
);

assert(
  options.currentLocalObservation?.proofSystem === localProofFormat.localProofObservation?.proofSystem,
  "backend-options local proof system must match local proof-format observation",
);
assert(
  options.currentLocalObservation?.backend === localProofFormat.localProofObservation?.backend,
  "backend-options local backend must match local proof-format observation",
);
assert(
  options.currentLocalObservation?.proofByteLength === localProofFormat.localProofObservation?.proofByteLength,
  "backend-options local proof length must match local proof-format observation",
);
assert(
  options.currentLocalObservation?.verifyingKeyHashKind ===
    localProofFormat.localProofObservation?.verifyingKeyHashKind,
  "backend-options local VK hash kind must match local proof-format observation",
);
assert(
  registry.status === "source-only-verifier-key-registry-scaffold",
  "registry evidence must stay source-only while backend options are unselected",
);

const optionById = new Map((options.backendOptions ?? []).map((entry) => [entry.id, entry]));
const groth16 = optionById.get("groth16-tag3-solana-v0");
const ultrahonk = optionById.get("noir-bb-ultrahonk-adaptation");
assert(groth16, "backend-options must include groth16-tag3-solana-v0");
assert(ultrahonk, "backend-options must include noir-bb-ultrahonk-adaptation");
assert(groth16.status === "blocked", "Groth16 option must stay blocked");
assert(ultrahonk.status === "blocked", "UltraHonk option must stay blocked");
assert(groth16.selectsCurrentTag3Contract === true, "Groth16 option must select the current tag-3 contract");
assert(ultrahonk.selectsCurrentTag3Contract === false, "UltraHonk option must require a new target or boundary");
assert(groth16.proofSystem === "groth16", "Groth16 option must name Groth16");
assert(ultrahonk.proofSystem === "noir-bb", "UltraHonk option must name noir-bb");
assert(ultrahonk.backend === "barretenberg-ultrahonk", "UltraHonk option must name barretenberg-ultrahonk");

for (const required of [
  "actual-private-spend-groth16-production-proof-format",
  "production-verifying-key-hash",
  "tag3-verifier-adapter-or-verifier-cpi",
  "valid-proof-mutates-nullifier-output-state",
  "invalid-proof-leaves-account-bytes-unchanged",
  "rebuilt-redeployed-reinitialized-sbf-lineage",
  "audit-or-reviewer-acceptance",
]) {
  assert(groth16.requires?.includes(required), `Groth16 option missing requirement ${required}`);
}
for (const required of [
  "production-ultrahonk-verifier-target-or-service-boundary",
  "production-verifying-key-evidence-not-local-acir",
  "new-proof-byte-layout-or-service-contract",
  "private-spend-public-input-hash-binding-test",
  "verifier-adapter-or-production-service-acceptance",
  "valid-proof-mutates-or-production-service-acceptance-evidence",
  "invalid-proof-rejection-no-mutation-or-service-rejection-evidence",
  "live-lineage-and-audit-or-reviewer-acceptance",
]) {
  assert(ultrahonk.requires?.includes(required), `UltraHonk option missing requirement ${required}`);
}
includes(groth16.truthBoundary ?? "", "blocked until", "Groth16 option truth boundary");
includes(ultrahonk.truthBoundary ?? "", "not compatible", "UltraHonk option truth boundary");

for (const [field, expected] of [
  ["localProofFormatObservation", true],
  ["verifierKeyRegistryScaffold", true],
  ["candidateEvidencePacket", true],
]) {
  assert(options.intermediateEvidenceOnly?.[field] === expected, `${field} must be intermediate-only`);
}
for (const [field, expected] of [
  ["backendSelection", false],
  ["actualPrivateSpendProductionProofFormat", false],
  ["privateSpendPublicInputHashBinding", false],
  ["productionVerifyingKeyHash", false],
  ["verifierAdapter", false],
  ["acceptedProofMutatesStateTest", false],
  ["invalidProofLeavesAccountsUnchangedTest", false],
  ["sbfLiveLineage", false],
  ["auditReviewerAcceptance", false],
]) {
  assert(options.satisfiesRequiredPositiveEvidence?.[field] === expected, `${field} must be ${expected}`);
}
for (const phrase of [
  "backend selection",
  "production proof-format acceptance",
  "production verifying-key evidence",
  "tag-3 proof acceptance",
]) {
  includes(options.truthBoundary ?? "", phrase, "backend-options truth boundary");
}
assert(
  options.canonicalCommands?.includes("npm run zk:c01-verifier-backend-options-check"),
  "backend-options must record its canonical guard",
);

const optionsRef = candidate.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-verifier-backend-options-matrix",
);
assert(
  optionsRef?.artifactRef === "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json",
  "candidate packet must reference the backend-options evidence packet",
);
assert(
  optionsRef?.command === "npm run zk:c01-verifier-backend-options-check",
  "candidate packet must record the backend-options guard",
);
includes(optionsRef?.truthBoundary ?? "", "does not select a backend", "candidate backend-options truth boundary");
assert(
  candidate.selectedBackend === null && candidate.selectedBackendStatus === "not-selected",
  "candidate packet must remain backend-unselected",
);
assert(
  candidate.requiredPositiveEvidence?.every((entry) => entry.status === "blocked" && entry.currentArtifactRef === null),
  "candidate packet positive evidence must remain blocked and unreferenced",
);

for (const marker of [
  "Backend Options Evidence",
  "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json",
  "npm run zk:c01-verifier-backend-options-check",
  "groth16-tag3-solana-v0",
  "noir-bb-ultrahonk-adaptation",
  "does not select a backend",
]) {
  includes(decision, marker, "C01 backend decision docs");
}

console.log("private-pool-v2 C01 verifier backend options: PASS");

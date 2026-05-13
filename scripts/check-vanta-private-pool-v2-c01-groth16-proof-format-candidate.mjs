import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const optionsPath = "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json";
const productionVerifyingKeyPath = "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json";
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

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const candidate = JSON.parse(read(candidatePath));
const options = JSON.parse(read(optionsPath));
const productionVerifyingKey = JSON.parse(read(productionVerifyingKeyPath));
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
}

assert(
  packet.version === "vanta-private-pool-v2-c01-groth16-proof-format-candidate-evidence-0.1",
  "Groth16 proof-format packet must use the checked schema",
);
assert(
  packet.status === "blocked-no-groth16-production-proof-format-artifact",
  "Groth16 proof-format packet must stay blocked until the artifact exists",
);
assert(packet.backendOptionId === "groth16-tag3-solana-v0", "packet must bind to the Groth16 tag-3 option");
assert(packet.selectedBackend === null, "packet must not select a backend");
assert(packet.selectedBackendStatus === "not-selected", "packet backend status must remain not-selected");
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

const required = packet.requiredCandidateShape ?? {};
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["proofByteLength", 256],
  ["publicInputLabel", "private-spend-public-input-hash"],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["status", "required-before-groth16-tag3-selection"],
]) {
  assert(required[field] === expected, `required candidate shape ${field} mismatch`);
}

const artifact = packet.currentCandidateArtifact ?? {};
assert(artifact.status === "absent", "current Groth16 proof-format artifact must be absent");
assert(artifact.artifactRef === null, "current Groth16 artifact ref must remain null");
assert(artifact.proofSystem === null, "current Groth16 proof system must remain null");
assert(artifact.proofByteLength === null, "current Groth16 proof length must remain null");
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
for (const marker of ["noir-bb", "groth16", "16000 bytes", "256 bytes", "local-acir-bytecode-hash-not-production-vk"]) {
  includes(JSON.stringify(packet.mismatch ?? {}), marker, "Groth16 proof-format mismatch evidence");
}

for (const blocker of [
  "no Groth16 production proof artifact exists for vanta_private_pool_v2_actual_private_spend_entry",
  "current local proof observation is noir-bb / barretenberg-ultrahonk / 16000 bytes",
  "no production verifying-key hash artifact exists",
  "reserved tag 3 still returns ERR_PROOF_VERIFIER_NOT_WIRED before proof verification or mutation",
]) {
  assert(packet.blockedBy?.includes(blocker), `packet missing blocker: ${blocker}`);
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
  assert(packet.satisfiesRequiredPositiveEvidence?.[field] === expected, `${field} must remain ${expected}`);
}

assert(candidate.selectedBackend === null, "candidate packet must keep selectedBackend null");
assert(candidate.selectedBackendStatus === "not-selected", "candidate packet must keep backend unselected");
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
assert(groth16Option.status === "blocked", "Groth16 backend option must remain blocked");
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
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run zk:c01-verifier-backend-options-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
]) {
  assert(packet.canonicalCommands?.includes(command), `packet must record canonical command ${command}`);
}
for (const phrase of [
  "blocked Groth16 tag-3 proof-format candidate packet only",
  "not backend selection",
  "not production proof-format evidence",
  "not tag-3 proof acceptance",
]) {
  includes(packet.truthBoundary ?? "", phrase, "Groth16 proof-format packet truth boundary");
}

console.log("private-pool-v2 C01 Groth16 proof-format candidate: PASS");

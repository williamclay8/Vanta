import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeVantaPrivatePoolV2ActualPrivateSpendProofArtifact } from "../operator/private-pool-v2-proof-artifact.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const proofReceiptPath =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 C01 local proof-format evidence: FAIL - ${message}`);
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

function runProofCommand() {
  try {
    execFileSync("npm", ["run", "private-pool-v2:actual-private-spend-prove"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    const stdout = String(error.stdout ?? "").trim();
    const stderr = String(error.stderr ?? "").trim();
    if (stdout) {
      console.error(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }
    fail("actual-private-spend local proof generation failed");
  }
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const evidenceText = read(evidencePath);
const evidence = JSON.parse(evidenceText);
const candidate = JSON.parse(read(candidatePath));
const decisionPacket = read(decisionPath);

runProofCommand();

const proofReceipt = JSON.parse(read(proofReceiptPath));
const normalizedProof = normalizeVantaPrivatePoolV2ActualPrivateSpendProofArtifact(proofReceipt);

assert(
  evidence.version === "vanta-private-pool-v2-c01-local-proof-format-evidence-0.1",
  "local proof-format evidence must use the checked v0.1 schema",
);
assert(
  evidence.status === "local-proof-format-observed-not-production",
  "local proof-format evidence must stay non-production",
);
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]) {
  assert(evidence[field] === false, `local proof-format evidence ${field} must be false`);
}
assert(
  evidence.secretPolicy === "references-and-metadata-only-no-proof-bytes-no-witness-values",
  "local proof-format evidence must forbid proof bytes and witness values",
);
assert(
  evidence.candidatePacketRef === candidatePath,
  "local proof-format evidence must point at the C01 candidate packet",
);
assert(
  evidence.decisionPacketRef === decisionPath,
  "local proof-format evidence must point at the C01 decision packet",
);
assert(
  evidence.proofGenerationCommand === "npm run private-pool-v2:actual-private-spend-prove",
  "local proof-format evidence must record the proof generation command",
);
assert(
  evidence.proofReceiptRef === proofReceiptPath,
  "local proof-format evidence must record the generated proof receipt path",
);
assert(
  !evidenceText.includes("proofHex"),
  "local proof-format evidence must not store raw proof bytes",
);
for (const phrase of [
  "raw witness",
  "private key",
  "seed phrase",
  "bearer ",
  "database url",
  "signed transaction",
]) {
  assert(
    !evidenceText.toLowerCase().includes(phrase),
    `local proof-format evidence must not contain secret-bearing phrase ${phrase}`,
  );
}

const observed = evidence.localProofObservation ?? {};
for (const [field, expected] of [
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "noir-bb"],
  ["backend", "barretenberg-ultrahonk"],
  ["proofBackend", "local-bb-fixture-artifact"],
  ["proofByteLength", 16000],
  ["publicInputCount", 1],
  ["publicInputCommitment", "sha256:6ddff90b0ed71dd1d35400c11b2dce54d70eae73d9179f1442da700ead121aa7"],
  ["verified", true],
  ["acirBytecodeHash", "sha256:27e841db5262f2b381cdc9836b0bdb963aa95ef5bf0a09842448412180a9cca2"],
  ["verifyingKeyHash", "sha256:27e841db5262f2b381cdc9836b0bdb963aa95ef5bf0a09842448412180a9cca2"],
  ["verifyingKeyHashKind", "local-acir-bytecode-hash-not-production-vk"],
  [
    "verifyingKeyId",
    "local-acir-bytecode:vanta_private_pool_v2_actual_private_spend_entry:sha256:27e841db5262f2b381cdc9836b0bdb963aa95ef5bf0a09842448412180a9cca2",
  ],
  ["proofRuntimePackage", "@aztec/bb.js"],
  ["proofRuntimeVersion", "^4.1.3"],
]) {
  assert(observed[field] === expected, `local proof-format observation ${field} mismatch`);
  if (typeof expected === "string" || typeof expected === "number" || typeof expected === "boolean") {
    assert(normalizedProof[field] === expected || proofReceipt[field] === expected, `proof receipt ${field} mismatch`);
  }
}
assert(observed.proofFieldCount === 500, "local proof-format observation proofFieldCount mismatch");
assert(
  observed.onChainVerifierEvidence === "offchain-remote-proof-artifact-only",
  "local proof-format observation must remain offchain-only",
);
assert(observed.onChainVerifierTarget === "none", "local proof-format observation must not target an on-chain verifier");
assert(
  JSON.stringify(observed.publicInputLabels) === JSON.stringify(["private-spend-public-input-hash"]),
  "local proof-format evidence must record the private-spend public input label",
);
assert(
  JSON.stringify(normalizedProof.publicInputLabels) === JSON.stringify(observed.publicInputLabels),
  "proof receipt public input labels must match local proof-format evidence",
);
assert(
  proofReceipt.proofHex.length === observed.proofByteLength * 2,
  "proof receipt proofHex length must match the observed proof byte length",
);
assert(
  Math.floor(proofReceipt.proofByteLength / 32) === observed.proofFieldCount,
  "proof receipt field count must match local proof-format evidence",
);

const tag3 = evidence.reservedTag3FormatComparison ?? {};
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["proofByteLength", 256],
  ["publicInputLabel", "private-spend-public-input-hash"],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["status", "mismatch-blocked"],
]) {
  assert(tag3[field] === expected, `reserved tag-3 comparison ${field} mismatch`);
}
assert(
  observed.proofSystem !== tag3.proofSystem,
  "local proof evidence must remain proof-system-mismatched with the reserved tag-3 format",
);
assert(
  observed.proofByteLength !== tag3.proofByteLength,
  "local proof evidence must remain byte-length-mismatched with the reserved tag-3 format",
);
assert(
  observed.verifyingKeyHashKind !== tag3.verifyingKeyHashKind,
  "local proof evidence must remain verifying-key-kind-mismatched with the reserved tag-3 format",
);

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
  assert(
    evidence.satisfiesRequiredPositiveEvidence?.[field] === expected,
    `local proof-format evidence must keep ${field} unsatisfied`,
  );
}

assert(candidate.selectedBackend === null, "candidate packet must keep selectedBackend null");
assert(
  candidate.selectedBackendStatus === "not-selected",
  "candidate packet must keep backend status not-selected",
);
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]) {
  assert(candidate[field] === false, `candidate packet ${field} must stay false`);
}
assert(
  candidate.requiredPositiveEvidence.every((entry) => entry.status === "blocked"),
  "candidate packet required positive evidence must remain blocked",
);
assert(
  candidate.requiredPositiveEvidence.every((entry) => entry.currentArtifactRef === null),
  "candidate packet required positive evidence must not attach local proof-format refs",
);
const intermediateRef = candidate.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "local-actual-private-spend-proof-format-observation",
);
assert(intermediateRef, "candidate packet must reference the local proof-format observation");
assert(intermediateRef.artifactRef === evidencePath, "candidate intermediate evidence ref path mismatch");
assert(
  intermediateRef.command === "npm run zk:c01-local-proof-format-evidence-check",
  "candidate intermediate evidence ref command mismatch",
);
includes(
  intermediateRef.truthBoundary,
  "does not satisfy required production proof-format evidence",
  "candidate intermediate evidence truth boundary",
);

for (const marker of [
  "Local proof-format observation",
  "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json",
  "noir-bb / barretenberg-ultrahonk",
  "16000-byte local proof",
  "256-byte Groth16 tag-3 proof",
  "local-acir-bytecode-hash-not-production-vk",
  "production-verifying-key-hash",
  "not backend selection",
  "not production proof-format acceptance",
]) {
  includes(decisionPacket, marker, decisionPath);
}

assert(
  scripts["zk:c01-local-proof-format-evidence-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-local-proof-format-evidence.mjs",
  "package.json must expose zk:c01-local-proof-format-evidence-check",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-local-proof-format-evidence-check"),
  "zk:review-guards-check must include the local proof-format evidence guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-local-proof-format-evidence-check"),
  "zk:feedback-loop-check must include the local proof-format evidence guard",
);

for (const marker of evidence.forbiddenPromotions ?? []) {
  assert(
    [
      "solana-c01-groth16-verifier-ready",
      "production-private",
      "mainnet-private",
      "proof-enforced-spend",
      "on-chain proof verified",
      "production verifier accepted",
    ].includes(marker),
    `unexpected forbidden promotion marker ${marker}`,
  );
}
includes(evidence.truthBoundary, "not backend selection", "local proof-format evidence truth boundary");
includes(evidence.truthBoundary, "not production proof-format acceptance", "local proof-format evidence truth boundary");
includes(evidence.truthBoundary, "not tag-3 proof acceptance", "local proof-format evidence truth boundary");
includes(evidence.truthBoundary, "not on-chain proof verification", "local proof-format evidence truth boundary");
includes(evidence.truthBoundary, "not real-funds readiness", "local proof-format evidence truth boundary");

console.log("private-pool-v2 C01 local proof-format evidence: PASS");

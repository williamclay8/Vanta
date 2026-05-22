import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 C01 verifier-key registry: FAIL - ${message}`);
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
const program = read("programs/vanta_private_pool_v2_spend/src/lib.rs");
const fuzzHarness = read("fuzz/vanta_private_pool_v2_spend/src/main.rs");
const readme = read("programs/vanta_private_pool_v2_spend/README.md");
const decision = read("docs/zk/c01-production-verifier-backend-decision.md");
const candidate = JSON.parse(read("ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json"));
const registryEvidence = JSON.parse(read("ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json"));

assert(
  scripts["zk:c01-verifier-key-registry-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-key-registry.mjs",
  "package.json must expose zk:c01-verifier-key-registry-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-verifier-key-registry-check"),
    `${aggregate} must include the verifier-key registry guard`,
  );
}

for (const marker of [
  "const TAG_REGISTER_VERIFIER_KEY: u8 = 5;",
  "const REGISTER_VERIFIER_KEY_PAYLOAD_LEN: usize = 1 + HASH_LEN * 2;",
  "const VERIFIER_KEY_PROGRAM_ID_OFFSET: usize = VERIFIER_KEY_HASH_OFFSET + HASH_LEN;",
  "TAG_REGISTER_VERIFIER_KEY => process_register_verifier_key(program_id, accounts, rest)",
  "fn process_register_verifier_key",
  "fn ensure_verifier_key",
  "fn require_verifier_key_record_data",
  "fn require_verifier_key_hash_for_program",
  "fn write_verifier_key_account",
  "VERIFIER_KEY_SEED",
  "VERIFIER_KEY_MAGIC",
  "zero_verifier_key_hash",
  "register_verifier_key_writes_source_only_key_registry_record",
  "register_verifier_key_records_verifier_program_id",
  "proof_carrying_spend_rejects_wrong_registered_verifier_program_before_not_wired",
  "register_verifier_key_rejects_zero_hash_and_wrong_pda",
]) {
  includes(program, marker, "spend program verifier-key registry source");
}

for (const marker of [
  "const TAG_REGISTER_VERIFIER_KEY: u8 = 5;",
  "action_register_verifier_key",
  "register_verifier_key_data",
  "verifier_key_registration_accounts_for_hash",
  "VERIFIER_KEY_PROGRAM_ID_OFFSET",
  "registered_verifier_keys",
  "assert_verifier_key_account",
  "idempotent verifier-key replay mutated state",
  "ERR_VERIFIER_KEY_MISMATCH",
]) {
  includes(fuzzHarness, marker, "Crucible verifier-key registry harness");
}

for (const marker of [
  "`5` - register verifier key",
  "[5, verifierKeyHash:32, verifierProgramId:32]",
  "[\"vanta2vkey\", pool_state, verifierKeyHash]",
  "source-only verifier-key registry scaffold",
  "not production verifying-key evidence",
  "Guard: `npm run zk:c01-verifier-key-registry-check`",
]) {
  includes(readme, marker, "spend program README verifier-key registry docs");
}

for (const marker of [
  "Verifier-Key Registry Scaffold",
  "source-only verifier-key registry scaffold",
  "ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json",
  "npm run zk:c01-verifier-key-registry-check",
  "not production verifying-key evidence",
]) {
  includes(decision, marker, "C01 backend decision packet verifier-key registry docs");
}

assert(
  registryEvidence.version === "vanta-private-pool-v2-c01-verifier-key-registry-evidence-0.1",
  "registry evidence must use the checked schema",
);
assert(
  registryEvidence.status === "source-only-verifier-key-registry-scaffold",
  "registry evidence must stay source-only",
);
for (const [field, expected] of [
  ["productionReady", false],
  ["mainnetReady", false],
  ["privacyClaimAllowed", false],
  ["c01VerifierReady", false],
  ["solanaC01Groth16VerifierReady", false],
]) {
  assert(registryEvidence[field] === expected, `registry evidence ${field} must be ${expected}`);
}
assert(registryEvidence.instruction?.tag === 5, "registry evidence must lock tag 5");
assert(
  registryEvidence.instruction?.payloadLayout === "[5, verifierKeyHash:32, verifierProgramId:32]",
  "registry evidence must lock the tag-5 payload layout",
);
assert(
  registryEvidence.instruction?.payloadByteLength === 65,
  "registry evidence must lock the tag-5 byte length",
);
assert(
  registryEvidence.instruction?.recordByteLength === 112,
  "registry evidence must lock the verifier-key record byte length",
);
assert(
  registryEvidence.instruction?.pdaSeed === "[\"vanta2vkey\", pool_state, verifierKeyHash]",
  "registry evidence must lock the verifier-key PDA seed",
);
assert(
  registryEvidence.instruction?.zeroVerifierKeyHashRejected === true,
  "registry evidence must require zero verifier-key hash rejection",
);
assert(
  registryEvidence.instruction?.zeroVerifierProgramIdRejected === true,
  "registry evidence must require zero verifier-program id rejection",
);
assert(
  registryEvidence.instruction?.spendProgramIdAsVerifierProgramRejected === true,
  "registry evidence must reject the spend program id as verifier program id",
);
assert(
  registryEvidence.instruction?.wrongVerifierKeyPdaRejected === true,
  "registry evidence must require wrong verifier-key PDA rejection",
);
assert(
  registryEvidence.instruction?.wrongVerifierProgramRejectedBeforeAdapter === true,
  "registry evidence must require wrong verifier-program rejection before adapter",
);
assert(
  registryEvidence.reservedTag3Relationship?.requiresBoundVerifierProgramId === true,
  "registry evidence must require tag-3 verifier-program binding",
);
assert(
  registryEvidence.instruction?.idempotentSameRecordReplay === true,
  "registry evidence must record idempotent same-record replay",
);
assert(
  registryEvidence.reservedTag3Relationship?.stillFailsClosedWith === "ERR_PROOF_VERIFIER_NOT_WIRED",
  "registry evidence must preserve tag-3 fail-closed truth",
);
assert(
  registryEvidence.satisfiesRequiredPositiveEvidence?.productionVerifyingKeyHash === false,
  "registry evidence must not satisfy production verifying-key hash evidence",
);
assert(
  registryEvidence.satisfiesRequiredPositiveEvidence?.acceptedProofMutatesStateTest === false,
  "registry evidence must not satisfy accepted-proof mutation evidence",
);
assert(
  registryEvidence.canonicalCommands?.includes("npm run zk:c01-verifier-key-registry-check"),
  "registry evidence must record its guard command",
);
includes(
  registryEvidence.truthBoundary ?? "",
  "not production verifying-key evidence",
  "registry evidence truth boundary",
);

const registryRef = candidate.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "source-only-verifier-key-registry-scaffold",
);
assert(
  registryRef?.artifactRef === "ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json",
  "candidate packet must reference the verifier-key registry evidence packet",
);
assert(
  registryRef?.command === "npm run zk:c01-verifier-key-registry-check",
  "candidate packet must record the verifier-key registry guard",
);
includes(
  registryRef?.truthBoundary ?? "",
  "does not satisfy production verifying-key evidence",
  "candidate verifier-key registry truth boundary",
);
assert(
  candidate.requiredPositiveEvidence?.find((entry) => entry.id === "production-verifying-key-hash")
    ?.status === "blocked",
  "production-verifying-key-hash must remain blocked",
);
assert(
  candidate.requiredPositiveEvidence?.find((entry) => entry.id === "production-verifying-key-hash")
    ?.currentArtifactRef === null,
  "production-verifying-key-hash currentArtifactRef must remain null",
);

console.log("private-pool-v2 C01 verifier-key registry: PASS");

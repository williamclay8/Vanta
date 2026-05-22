import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`Vanta ZK C01 on-chain proof boundary: FAIL - ${message}`);
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

const programPath = "programs/vanta_private_pool_v2_spend/src/lib.rs";
const readmePath = "programs/vanta_private_pool_v2_spend/README.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const ledgerPath = "VANTA_ZK_REVIEW.findings.json";
const transactionBuilderPath = "src/privacy/privatePoolV2SolanaSpendTransaction.mjs";
const transactionBuilderCheckPath =
  "scripts/check-vanta-private-pool-v2-solana-spend-transaction-builder.mjs";
const relayerSubmissionPath = "src/privacy/privatePoolV2SolanaRelayerSubmission.mjs";
const serviceNetworkPath = "operator/private-pool-v2-service-network.mjs";
const operatorPacketPath = "scripts/print-vanta-actual-private-settlement-operator-packet.mjs";
const operatorPacketCheckPath = "scripts/check-vanta-actual-private-settlement-operator-packet.mjs";

const program = read(programPath);
const readme = read(readmePath);
const review = read(reviewPath);
const transactionBuilder = read(transactionBuilderPath);
const transactionBuilderCheck = read(transactionBuilderCheckPath);
const relayerSubmission = read(relayerSubmissionPath);
const serviceNetwork = read(serviceNetworkPath);
const operatorPacket = read(operatorPacketPath);
const operatorPacketCheck = read(operatorPacketCheckPath);
const ledger = JSON.parse(read(ledgerPath));
const packageJson = JSON.parse(read("package.json"));
const c01 = ledger.findings.find((finding) => finding.id === "VANTA-ZK-2026-05-09-C01");

assert(c01, "missing C01 finding");
assert(c01.status === "partial", "C01 must remain partial until real on-chain proof verification is wired");
includes(c01.failureMode, "no verifier enforces a real proof or verifying-key hash on chain", "C01 failureMode");
includes(c01.failureMode, "current 161-byte spend ABI carries no proof bytes", "C01 failureMode");
includes(c01.verification.doesNotProve, "On-chain proof verification", "C01 doesNotProve");
includes(c01.verification.doesNotProve, "program-owned tree state", "C01 doesNotProve");

for (const marker of [
  "const TAG_REGISTER_ROOT: u8 = 2;",
  "const TAG_SPEND_WITH_PROOF: u8 = 3;",
  "const TAG_REGISTER_PROVENANCED_ROOT: u8 = 4;",
  "const VERIFIER_KEY_MAGIC",
  "const VERIFIER_KEY_SEED",
  "const ROOT_MAGIC",
  "const ROOT_RECORD_MAGIC",
  "const ROOT_RECORD_SEED",
  "const SPEND_PAYLOAD_LEN: usize = 1 + HASH_LEN * 5;",
  "const PROVENANCED_ROOT_PAYLOAD_LEN",
  "const SPEND_WITH_PROOF_GNARK_PROOF_LEN: usize = 324;",
  "const SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN: usize = 44;",
  "const SPEND_WITH_PROOF_PAYLOAD_LEN",
  "const ERR_PROOF_VERIFIER_NOT_WIRED: u32 = 14;",
  "const ERR_OUTPUT_QUEUE_FULL: u32 = 3;",
  "const ERR_VERIFIER_KEY_MISMATCH: u32 = 17;",
  "const ERR_ROOT_RECORD_MISMATCH: u32 = 18;",
  "fn process_register_root",
  "fn process_register_provenanced_root",
  "fn process_spend_with_proof",
  "fn preflight_spend_with_proof",
  "fn verify_spend_with_proof_adapter",
  "fn spend_with_proof_verifier_cpi_instruction",
  "fn require_spend_with_proof_verifier_program",
  "fn require_spend_with_proof_public_witness_binding",
  "fn commit_verified_spend_from_spend_with_proof_accounts",
  "fn commit_verified_spend",
  "fn require_previous_root_matches_history",
  "fn require_root_record",
  "fn ensure_root_record",
  "fn require_verifier_key_hash",
  "proof-carrying spend ABI is reserved; verifier not wired",
  "fixed_slot_contains(&root_data, HASH_LEN, accepted_root)?",
  "require_root_record(program_id, pool_state, root_record, accepted_root)?;",
  "ensure_nullifier_marker(",
  "proof_carrying_spend_preflights_accounts_before_fail_closed_verifier",
  "proof_carrying_spend_default_adapter_rejects_before_commit",
  "verified_spend_commit_mutates_only_after_adapter_acceptance",
  "proof_carrying_spend_verifier_instruction_data_matches_gnark_tuple",
  "proof_carrying_spend_verifier_cpi_instruction_matches_generated_solana_verifier_shape",
  "proof_carrying_spend_requires_readonly_executable_verifier_program_account",
  "proof_carrying_spend_public_witness_binding_rejects_wrong_hash_before_not_wired",
  "proof_carrying_spend_public_witness_binding_rejects_bad_header_before_not_wired",
  "proof_carrying_spend_commit_capable_account_list_mutates_after_fixture_adapter_acceptance",
  "proof_carrying_spend_rejects_legacy_256_byte_payload_shape",
  "selected_gnark_fixture_adapter_valid_proof_mutates_state",
  "selected_gnark_fixture_adapter_invalid_proof_no_mutation",
  "selected_gnark_fixture_adapter_wrong_public_input_no_mutation",
  "selected_gnark_fixture_adapter_wrong_verifying_key_no_mutation",
  "proof_carrying_spend_rejects_duplicate_nullifier_before_fail_closed_verifier",
  "Err(ProgramError::Custom(ERR_OUTPUT_QUEUE_FULL))",
  "Err(ProgramError::Custom(ERR_DUPLICATE_NULLIFIER))",
]) {
  includes(program, marker, programPath);
}

const spendWithProofStart = program.indexOf("fn preflight_spend_with_proof");
const spendWithProofEnd = program.indexOf("fn verify_spend_with_proof_adapter", spendWithProofStart);
assert(spendWithProofStart >= 0 && spendWithProofEnd > spendWithProofStart, "missing tag 3 spend-with-proof preflight section");
const spendWithProofSection = program.slice(spendWithProofStart, spendWithProofEnd);
for (const marker of [
  "if output_count == u32::MAX as usize",
  "return Err(ProgramError::Custom(ERR_OUTPUT_QUEUE_FULL));",
  "require_nullifier_marker_available",
  "require_output_record_available",
  "require_verifier_key_hash",
  "require_spend_with_proof_verifier_program",
]) {
  includes(spendWithProofSection, marker, "tag 3 spend-with-proof preflight");
}
assert(
  spendWithProofSection.indexOf("ERR_OUTPUT_QUEUE_FULL") <
    spendWithProofSection.indexOf("require_output_record_available"),
  "tag 3 must reject a full output counter before output-record preflight",
);

for (const marker of [
  "no proof verification",
  "proof-unverified, operator-submitted Vanta actual-private spend metadata",
  "records the public transcript",
  "it still does not verify proofs",
  "accepted root",
  "program-owned root provenance record",
  "verifies `previousRoot` is zero for the first provenanced root",
  "Roots already registered through legacy tag `2` cannot be backfilled with tag `4`",
  "root_history",
  "root_record",
  "nullifier_marker",
  "proof-carrying spend (reserved, fail closed)",
  "verifier instruction-data tuple",
  "commit-capable tag-3 account list",
  "public witness against `publicInputHash`",
  "returns custom error `14`",
  "npm run zk:c01-verifier-adapter-seam-check",
  "local drift-prevention only",
  "full output-counter rejection with custom error `3`",
  "[\"vanta2vkey\", pool_state, verifierKeyHash]",
  "[\"vanta2root\", pool_state, acceptedRoot]",
]) {
  includes(readme, marker, readmePath);
}

for (const marker of [
  "no Groth16/PLONK/Honk verifier",
  "no production verifying-key acceptance",
  "current 161-byte spend ABI carries no proof bytes",
  "returns custom error `14` before proof verification",
  "local fail-closed verifier adapter seam harness",
  "dedicated read-only executable verifier-program account",
  "generated Solana verifier CPI instruction",
  "on-chain-only verifier CPI hook",
  "host-side Solana syscall stubs remain fail-closed",
  "not verifier-adapter acceptance",
  "proofCarryingSpendStatus: \"sbf-verifier-cpi-hook-host-fail-closed-production-blocked\"",
  "verifierKeyAccountLen: 112",
  "registerVerifierKeyInstructionLen: 65",
  "spendWithProofAccountCount: 11",
  "TAG_REGISTER_PROVENANCED_ROOT = 4",
  "program-owned root provenance record",
  "not proof that the root transition is correct",
  "program-owned shared tree state",
]) {
  includes(review, marker, reviewPath);
}

for (const forbiddenPhrase of [
  "proof_bytes field in the spend payload",
  "Closing it moves the protocol from Target B to Target A in one step",
  "moves the protocol from Target B to Target A",
  "the cryptographic claims become cryptographic facts",
  "Vanta is most of the way to Target A",
  "the cryptographic claims and the code agree",
]) {
  assert(
    !review.includes(forbiddenPhrase),
    `${reviewPath} must not use ${JSON.stringify(forbiddenPhrase)} while C01 remains partial`,
  );
}

for (const marker of [
  "onChainVerifier",
  "proofBytes",
  "proofArtifact",
  "verifierProgramId",
  "verifyingKeyHash",
]) {
  includes(transactionBuilder, marker, transactionBuilderPath);
  includes(relayerSubmission, marker, relayerSubmissionPath);
  includes(serviceNetwork, marker, serviceNetworkPath);
}
includes(transactionBuilder, "forbiddenProofSpendTerms", transactionBuilderPath);
includes(relayerSubmission, "forbiddenProofSpendTerms", relayerSubmissionPath);
includes(serviceNetwork, "forbiddenPrivateSpendProofTerms", serviceNetworkPath);

for (const marker of [
  "forbids transaction.proofBytes",
  "forbids transaction.onChainVerifier",
  "forbids transaction.proofArtifact",
  "forbids transaction.expectedPublicInputs.verifyingKeyHash",
  "proof-carrying tag remains fail-closed",
]) {
  includes(transactionBuilderCheck, marker, transactionBuilderCheckPath);
}

for (const marker of [
  "currentSolanaSpendAbiCarriesProofData",
  "proofCarryingVerifierAbiRequired",
  "forbiddenProofLikeOutputFields",
]) {
  includes(operatorPacket, marker, operatorPacketPath);
}

for (const marker of [
  "forbiddenProofLikeOutputKeys",
  "onChainVerifier",
  "proofBytes",
  "proofArtifact",
  "verifierProgramId",
  "verifyingKeyHash",
]) {
  includes(operatorPacketCheck, marker, operatorPacketCheckPath);
}

const possibleVerifierArtifacts = [
  "programs/vanta_private_pool_v2_spend/src/verifier.rs",
  "programs/vanta_private_pool_v2_spend/src/verifying_key.rs",
  "programs/vanta_private_pool_v2_spend/verifying_key.hash",
  "programs/vanta_private_pool_v2_spend/verifying_key.bin",
].filter((path) => existsSync(resolve(repoRoot, path)));

const verifierMarkers = ["groth16_verify", "verify_proof", "VERIFYING_KEY_HASH", "VERIFIER_PROGRAM_ID"];
const programHasVerifierMarker = verifierMarkers.some((marker) => program.includes(marker));

assert(
  possibleVerifierArtifacts.length === 0 && !programHasVerifierMarker,
  "verifier-like artifacts detected; replace this partial-boundary guard with positive verifier/key/tree checks before moving C01",
);

assert(
  packageJson.scripts?.["zk:c01-onchain-proof-boundary-check"] ===
    "node scripts/check-vanta-zk-c01-onchain-proof-boundary.mjs",
  "package.json must expose zk:c01-onchain-proof-boundary-check",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes("npm run zk:c01-onchain-proof-boundary-check"),
  "zk:review-guards-check must include the C01 boundary guard",
);

console.log("Vanta ZK C01 on-chain proof boundary: PASS");

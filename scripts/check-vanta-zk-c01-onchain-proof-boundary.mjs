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
  "const ROOT_MAGIC",
  "const SPEND_PAYLOAD_LEN: usize = 1 + HASH_LEN * 5;",
  "fn process_register_root",
  "fixed_slot_contains(&root_data, HASH_LEN, accepted_root)?",
  "ensure_nullifier_marker(",
]) {
  includes(program, marker, programPath);
}

for (const marker of [
  "no proof verification",
  "proof-unverified, operator-submitted Vanta actual-private spend metadata",
  "records the public transcript",
  "it still does not verify proofs",
  "accepted root",
  "root_history",
  "nullifier_marker",
]) {
  includes(readme, marker, readmePath);
}

for (const marker of [
  "no Groth16/PLONK/Honk verifier",
  "no verifying-key hash enforcement",
  "current 161-byte spend ABI carries no proof bytes",
  "root history is only a local operator-authorized fixed-slot scaffold",
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

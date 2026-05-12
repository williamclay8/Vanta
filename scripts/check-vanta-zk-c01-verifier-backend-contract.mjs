import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`Vanta ZK C01 verifier backend contract: FAIL - ${message}`);
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
const typesPath = "src/privacy/privatePoolV2Types.ts";
const proofArtifactPath = "operator/private-pool-v2-proof-artifact.mjs";
const remoteServicesPath = "src/privacy/privatePoolV2RemoteServices.ts";
const c01BoundaryPath = "scripts/check-vanta-zk-c01-onchain-proof-boundary.mjs";

const program = read(programPath);
const readme = read(readmePath);
const review = read(reviewPath);
const ledger = JSON.parse(read(ledgerPath));
const types = read(typesPath);
const proofArtifact = read(proofArtifactPath);
const remoteServices = read(remoteServicesPath);
const c01Boundary = read(c01BoundaryPath);
const packageJson = JSON.parse(read("package.json"));
const c01 = ledger.findings.find((finding) => finding.id === "VANTA-ZK-2026-05-09-C01");

assert(c01, "missing C01 finding");
assert(c01.status === "partial", "C01 must remain partial until a positive verifier backend is wired");

for (const marker of [
  "const TAG_SPEND_WITH_PROOF: u8 = 3;",
  "const VERIFIER_KEY_MAGIC",
  "const VERIFIER_KEY_SEED",
  "const RESERVED_GROTH16_PROOF_LEN: usize = 256;",
  "const SPEND_WITH_PROOF_PAYLOAD_LEN",
  "const ERR_PROOF_VERIFIER_NOT_WIRED: u32 = 14;",
  "const ERR_VERIFIER_KEY_MISMATCH: u32 = 17;",
  "let verifier_key_hash = &rest[160..192];",
  "let proof = &rest[192..448];",
  "fn require_verifier_key_hash",
  "proof-carrying spend ABI is reserved; verifier not wired",
]) {
  includes(program, marker, programPath);
}

for (const marker of [
  "C01 verifier backend contract",
  "Groth16-compatible Solana verifier path",
  "verifierKeyHash:32",
  "groth16Proof:256",
  "[\"vanta2vkey\", pool_state, verifierKeyHash]",
  "local bb.js/UltraHonk artifacts are not on-chain verifier evidence",
  "local-acir-bytecode-hash-not-production-vk",
  "production-verifying-key-hash",
  "returns custom error `14`",
]) {
  includes(readme, marker, readmePath);
}

for (const marker of [
  "verifier-backend contract",
  "Groth16-compatible Solana verifier path",
  "backend mismatch",
  "local bb.js/UltraHonk artifacts are not on-chain verifier evidence",
  "local-acir-bytecode-hash-not-production-vk",
  "production-verifying-key-hash",
  "npm run zk:c01-verifier-backend-contract-check",
]) {
  includes(review, marker, reviewPath);
}

for (const marker of [
  "proofSystem: \"noir-bb\"",
  "backend: \"barretenberg-ultrahonk\"",
  "verifyingKeyHashKind: \"local-acir-bytecode-hash-not-production-vk\"",
  "production-verifying-key-hash",
]) {
  includes(types, marker, typesPath);
}

for (const marker of [
  "proofArtifact.backend === \"barretenberg-ultrahonk\"",
  "proofArtifact.proofSystem === \"noir-bb\"",
  "proofArtifact.verifyingKeyHashKind === \"local-acir-bytecode-hash-not-production-vk\"",
]) {
  includes(proofArtifact, marker, proofArtifactPath);
}

for (const marker of [
  "\"groth16\"",
  "\"noir-bb\"",
  "PRODUCTION_VERIFYING_KEY_HASH_KIND",
  "VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_ARTIFACT_VERIFYING_KEY_ID_PREFIX",
  "Private Pool v2 remote proof-artifact verification requires a production verifying-key hash.",
]) {
  includes(remoteServices, marker, remoteServicesPath);
}

for (const marker of [
  "no Groth16/PLONK/Honk verifier",
  "verifier-like artifacts detected",
]) {
  includes(c01Boundary, marker, c01BoundaryPath);
}

includes(c01.requiredFix.join("\n"), "verifier-backend contract", "C01 requiredFix");
includes(c01.codexRemediation.summary, "verifier-backend contract guard", "C01 remediation summary");
includes(
  c01.verification.commands.join("\n"),
  "npm run zk:c01-verifier-backend-contract-check",
  "C01 verification commands",
);

assert(
  packageJson.scripts?.["zk:c01-verifier-backend-contract-check"] ===
    "node scripts/check-vanta-zk-c01-verifier-backend-contract.mjs",
  "package.json must expose zk:c01-verifier-backend-contract-check",
);
assert(
  packageJson.scripts?.["zk:review-guards-check"]?.includes("npm run zk:c01-verifier-backend-contract-check"),
  "zk:review-guards-check must include the C01 verifier backend contract guard",
);
assert(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes("npm run zk:c01-verifier-backend-contract-check"),
  "zk:feedback-loop-check must include the C01 verifier backend contract guard",
);

const possibleVerifierArtifacts = [
  "programs/vanta_private_pool_v2_spend/src/verifier.rs",
  "programs/vanta_private_pool_v2_spend/src/verifying_key.rs",
  "programs/vanta_private_pool_v2_spend/verifying_key.hash",
  "programs/vanta_private_pool_v2_spend/verifying_key.bin",
].filter((path) => existsSync(resolve(repoRoot, path)));
assert(
  possibleVerifierArtifacts.length === 0,
  "positive verifier artifacts exist; replace this backend-contract guard with verifier acceptance checks",
);

console.log("Vanta ZK C01 verifier backend contract: PASS");

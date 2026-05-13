import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 production verifier backend candidate: FAIL - ${message}`);
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
const types = read("src/privacy/privatePoolV2Types.ts");
const remoteServices = read("src/privacy/privatePoolV2RemoteServices.ts");
const proofArtifact = read("operator/private-pool-v2-proof-artifact.mjs");
const remoteProofArtifactBoundary = read(
  "scripts/check-vanta-private-pool-v2-remote-proof-artifact-boundary.mjs",
);
const proofBackendBoundary = read(
  "scripts/check-vanta-private-pool-v2-proof-backend-boundary.mjs",
);
const c01BackendContract = read("scripts/check-vanta-zk-c01-verifier-backend-contract.mjs");
const spendReadme = read("programs/vanta_private_pool_v2_spend/README.md");
const review = read("VANTA_ZK_REVIEW.md");
const securityLimitations = read("SECURITY_LIMITATIONS.md");
const ledger = JSON.parse(read("VANTA_ZK_REVIEW.findings.json"));
const c01 = ledger.findings.find((finding) => finding.id === "VANTA-ZK-2026-05-09-C01");

assert(c01, "missing C01 finding");
assert(c01.status === "partial", "C01 must remain partial until positive on-chain verifier acceptance exists");

for (const marker of [
  "export type VantaPrivatePoolV2OnChainVerifierEvidence",
  "\"offchain-remote-proof-artifact-only\"",
  "\"solana-c01-groth16-verifier-ready\"",
  "export type VantaPrivatePoolV2OnChainVerifierTarget",
  "\"solana-c01-tag3-groth16-v0\"",
  "onChainVerifierEvidence: VantaPrivatePoolV2OnChainVerifierEvidence;",
  "onChainVerifierTarget: VantaPrivatePoolV2OnChainVerifierTarget;",
]) {
  includes(types, marker, "privatePoolV2Types C01 verifier-evidence contract");
}

for (const marker of [
  "VANTA_PRIVATE_POOL_V2_OFFCHAIN_REMOTE_PROOF_ARTIFACT_EVIDENCE",
  "VANTA_PRIVATE_POOL_V2_SOLANA_C01_GROTH16_VERIFIER_READY",
  "VANTA_PRIVATE_POOL_V2_SOLANA_C01_TAG3_GROTH16_TARGET",
  "VANTA_PRIVATE_POOL_V2_C01_ACTUAL_PRIVATE_SPEND_CIRCUIT",
  "VANTA_PRIVATE_POOL_V2_C01_PRIVATE_SPEND_PUBLIC_INPUT_LABEL",
  "VANTA_PRIVATE_POOL_V2_C01_GROTH16_PROOF_BYTE_LENGTH = 256",
  "normalizeOnChainVerifierEvidenceFields",
  "assertNoC01VerifierReadyOverclaim",
  "proofSystem=groth16, proofBackend=remote-service, circuit=vanta_private_pool_v2_actual_private_spend_entry",
  "wire the Solana tag3 Groth16 verifier adapter before enabling this claim",
]) {
  includes(remoteServices, marker, "remote services C01 verifier-ready overclaim guard");
}

for (const marker of [
  "onChainVerifierEvidence: \"offchain-remote-proof-artifact-only\"",
  "onChainVerifierTarget: \"none\"",
]) {
  includes(proofArtifact, marker, "local proof artifact offchain-only receipt marker");
}
assert(
  !proofArtifact.includes("solana-c01-groth16-verifier-ready"),
  "local bb.js/UltraHonk proof artifact verifier must not emit the Solana C01 verifier-ready marker",
);

for (const marker of [
  "Expected offchain-only verifier evidence for remote proof-artifact handoff.",
  "production C01-ready request overclaim rejection",
  "C01-ready proof-artifact request overclaim should reject before remote verifier call.",
  "production C01-ready remote receipt overclaim rejection",
]) {
  includes(remoteProofArtifactBoundary, marker, "remote proof-artifact C01 overclaim test");
}

for (const marker of [
  "VantaPrivatePoolV2OnChainVerifierEvidence",
  "assertNoC01VerifierReadyOverclaim",
  "production C01-ready request overclaim rejection",
  "production C01-ready remote receipt overclaim rejection",
]) {
  includes(proofBackendBoundary, marker, "proof-backend boundary C01 candidate guard");
}

for (const marker of [
  "zk:c01-production-verifier-backend-candidate-check",
  "offchain-remote-proof-artifact-only",
  "solana-c01-groth16-verifier-ready",
]) {
  includes(c01BackendContract, marker, "C01 verifier backend contract guard");
}

for (const marker of [
  "offchain-remote-proof-artifact-only",
  "solana-c01-groth16-verifier-ready",
  "proofSystem: `groth16`",
  "groth16Proof:256",
  "custom error `14`",
  "npm run zk:c01-production-verifier-backend-candidate-check",
]) {
  includes(spendReadme, marker, "Private Pool v2 spend README C01 candidate truth");
}

for (const marker of [
  "offchain-remote-proof-artifact-only",
  "solana-c01-groth16-verifier-ready",
  "Solana tag `3` Groth16 verifier-ready evidence",
  "npm run zk:c01-production-verifier-backend-candidate-check",
]) {
  includes(review, marker, "VANTA_ZK_REVIEW C01 candidate truth");
  includes(securityLimitations, marker, "SECURITY_LIMITATIONS C01 candidate truth");
}

includes(
  c01.requiredFix.join("\n"),
  "solana-c01-groth16-verifier-ready",
  "C01 requiredFix candidate marker",
);
includes(
  c01.codexRemediation.summary,
  "production verifier backend candidate guard",
  "C01 remediation summary candidate marker",
);
includes(
  c01.verification.commands.join("\n"),
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "C01 verification commands candidate guard",
);

assert(
  scripts["zk:c01-production-verifier-backend-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-production-verifier-backend-candidate.mjs",
  "package.json must expose zk:c01-production-verifier-backend-candidate-check",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-production-verifier-backend-candidate-check"),
  "zk:review-guards-check must include the C01 production verifier backend candidate guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-production-verifier-backend-candidate-check"),
  "zk:feedback-loop-check must include the C01 production verifier backend candidate guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run zk:review-guards-check"),
  "private-pool-v2:verify must run review guards, including the C01 production verifier backend candidate guard",
);

console.log("private-pool-v2 production verifier backend candidate: PASS");

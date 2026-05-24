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
const c01DecisionPacket = read("docs/zk/c01-production-verifier-backend-decision.md");
const verifierCandidateEvidence = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json"),
);
const backendOptionsEvidence = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json"),
);
const groth16ProofFormatCandidateEvidence = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json"),
);
const publicWitnessBindingEvidence = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json"),
);
const productionGroth16ToolchainPreflightEvidence = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json"),
);
const productionVerifyingKeyCandidateEvidence = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json"),
);
const sbfLiveLineageCandidateEvidence = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json"),
);
const productionArtifactAcceptanceGateEvidence = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json"),
);
const externalReviewHandoffEvidence = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json"),
);
const verifierAdapterTestCandidateEvidence = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json"),
);
const localProofFormatEvidence = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json"),
);
const spendReadme = read("programs/vanta_private_pool_v2_spend/README.md");
const review = read("VANTA_ZK_REVIEW.md");
const securityLimitations = read("SECURITY_LIMITATIONS.md");
const ledger = JSON.parse(read("VANTA_ZK_REVIEW.findings.json"));
const c01 = ledger.findings.find((finding) => finding.id === "VANTA-ZK-2026-05-09-C01");

assert(c01, "missing C01 finding");
assert(c01.status === "partial", "C01 must remain partial until positive on-chain verifier acceptance exists");

assert(
  verifierCandidateEvidence.version === "vanta-private-pool-v2-c01-verifier-candidate-evidence-0.1",
  "C01 verifier candidate evidence must use the checked v0.1 schema",
);
assert(
  verifierCandidateEvidence.status === "blocked-selected-groth16-tag3-solana-v0-production-evidence",
  "C01 verifier candidate evidence must remain blocked until selected-backend production evidence exists",
);
for (const [field, expected] of [
  ["productionReady", false],
  ["mainnetReady", false],
  ["privacyClaimAllowed", false],
  ["c01VerifierReady", false],
  ["solanaC01Groth16VerifierReady", false],
]) {
  assert(
    verifierCandidateEvidence[field] === expected,
    `C01 verifier candidate evidence ${field} must be ${expected}`,
  );
}
assert(
  verifierCandidateEvidence.selectedBackend === "groth16-tag3-solana-v0",
  "C01 verifier candidate evidence must select the Groth16 tag-3 backend direction",
);
assert(
  verifierCandidateEvidence.selectedBackendStatus === "selected-pending-production-evidence",
  "C01 verifier candidate evidence must mark backend status selected but evidence-blocked",
);
assert(
  verifierCandidateEvidence.currentOnChainVerifierTarget === "solana-c01-tag3-groth16-v0",
  "C01 verifier candidate evidence must name the current tag-3 Groth16 target",
);
assert(
  verifierCandidateEvidence.currentReservedProofLayout?.tag === 3,
  "C01 verifier candidate evidence must lock the reserved proof tag at 3",
);
assert(
  verifierCandidateEvidence.currentReservedProofLayout?.target === "solana-c01-tag3-groth16-v0",
  "C01 verifier candidate evidence must bind the reserved proof layout to the tag-3 target",
);
assert(
  verifierCandidateEvidence.currentReservedProofLayout?.circuit ===
    "vanta_private_pool_v2_actual_private_spend_entry",
  "C01 verifier candidate evidence must bind the reserved proof layout to actual-private-spend",
);
assert(
  verifierCandidateEvidence.currentReservedProofLayout?.proofSystem === "groth16",
  "C01 verifier candidate evidence must name Groth16 only as the reserved tag-3 target system",
);
assert(
  verifierCandidateEvidence.currentReservedProofLayout?.proofByteLength === 324,
  "C01 verifier candidate evidence must keep the reserved Gnark proof byte length at 324",
);
assert(
  verifierCandidateEvidence.currentReservedProofLayout?.publicWitnessByteLength === 44,
  "C01 verifier candidate evidence must keep the reserved Gnark public witness byte length at 44",
);
assert(
  verifierCandidateEvidence.currentReservedProofLayout?.verifierInstructionDataByteLength === 368,
  "C01 verifier candidate evidence must keep the reserved Gnark verifier input length at 368",
);
assert(
  verifierCandidateEvidence.currentReservedProofLayout?.publicInputLabel ===
    "private-spend-public-input-hash",
  "C01 verifier candidate evidence must bind the reserved layout to the private-spend public input hash",
);
assert(
  verifierCandidateEvidence.currentReservedProofLayout?.verifyingKeyHashKind ===
    "production-verifying-key-hash",
  "C01 verifier candidate evidence must require a production verifying-key hash for the reserved layout",
);
assert(
  verifierCandidateEvidence.currentReservedProofLayout?.status === "reserved-fail-closed",
  "C01 verifier candidate evidence must keep the reserved proof layout fail-closed",
);
assert(
  verifierCandidateEvidence.currentLocalProofEvidence?.onChainVerifierEvidence ===
    "offchain-remote-proof-artifact-only",
  "C01 verifier candidate evidence must keep current local proof evidence offchain-only",
);
assert(
  verifierCandidateEvidence.currentLocalProofEvidence?.verifyingKeyHashKind ===
    "local-acir-bytecode-hash-not-production-vk",
  "C01 verifier candidate evidence must not promote local ACIR hashes to production VK evidence",
);
const proofFormatReadinessBoundary =
  verifierCandidateEvidence.proofFormatVsProductionReadinessBoundary ?? {};
assert(
  proofFormatReadinessBoundary.localProofFormatEvidence?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json",
  "C01 verifier candidate evidence must name the local proof-format observation in the readiness boundary",
);
assert(
  proofFormatReadinessBoundary.localProofFormatEvidence?.satisfiesProductionVerifierReadiness === false,
  "C01 local proof-format observation must not satisfy production verifier readiness",
);
assert(
  proofFormatReadinessBoundary.localProofFormatEvidence?.satisfiesProductionProofFormatEvidence === false,
  "C01 local proof-format observation must not satisfy production proof-format evidence",
);
assert(
  proofFormatReadinessBoundary.localProofFormatEvidence?.satisfiesProductionVerifyingKeyEvidence === false,
  "C01 local proof-format observation must not satisfy production verifying-key evidence",
);
assert(
  proofFormatReadinessBoundary.productionVerifierReadiness?.selectedBackend === "groth16-tag3-solana-v0",
  "C01 production verifier readiness boundary must record the selected backend",
);
assert(
  proofFormatReadinessBoundary.productionVerifierReadiness?.selectedBackendStatus ===
    "selected-pending-production-evidence",
  "C01 production verifier readiness boundary must keep backend selected but evidence-blocked",
);
assert(
  proofFormatReadinessBoundary.productionVerifierReadiness?.c01VerifierReady === false,
  "C01 production verifier readiness boundary must keep c01VerifierReady false",
);
assert(
  proofFormatReadinessBoundary.productionVerifierReadiness?.solanaC01Groth16VerifierReady === false,
  "C01 production verifier readiness boundary must keep Solana Groth16 verifier readiness false",
);
assert(
  proofFormatReadinessBoundary.productionVerifierReadiness?.requiredPositiveEvidenceStatus ===
    "blocked-with-selected-backend-and-null-positive-artifact-refs",
  "C01 production verifier readiness boundary must keep positive evidence blocked with null refs",
);
includes(
  proofFormatReadinessBoundary.truthBoundary ?? "",
  "local proof-format observation is not production verifier readiness",
  "C01 proof-format versus verifier-readiness truth boundary",
);
const localProofFormatRef = verifierCandidateEvidence.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "local-actual-private-spend-proof-format-observation",
);
assert(
  localProofFormatRef?.artifactRef === "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json",
  "C01 verifier candidate evidence must reference the local proof-format observation packet",
);
assert(
  localProofFormatRef?.command === "npm run zk:c01-local-proof-format-evidence-check",
  "C01 verifier candidate evidence must record the local proof-format observation guard",
);
includes(
  localProofFormatRef?.truthBoundary ?? "",
  "does not satisfy required production proof-format evidence",
  "C01 verifier candidate intermediate evidence truth boundary",
);
const backendOptionsRef = verifierCandidateEvidence.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-verifier-backend-options-matrix",
);
assert(
  backendOptionsRef?.artifactRef === "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json",
  "C01 verifier candidate evidence must reference the backend-options matrix packet",
);
assert(
  backendOptionsRef?.command === "npm run zk:c01-verifier-backend-options-check",
  "C01 verifier candidate evidence must record the backend-options matrix guard",
);
includes(
  backendOptionsRef?.truthBoundary ?? "",
  "selected backend direction",
  "C01 verifier candidate backend-options truth boundary",
);
const groth16ProofFormatRef = verifierCandidateEvidence.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-groth16-proof-format-candidate",
);
assert(
  groth16ProofFormatRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json",
  "C01 verifier candidate evidence must reference the blocked Groth16 proof-format packet",
);
assert(
  groth16ProofFormatRef?.command === "npm run zk:c01-groth16-proof-format-candidate-check",
  "C01 verifier candidate evidence must record the blocked Groth16 proof-format guard",
);
includes(
  groth16ProofFormatRef?.truthBoundary ?? "",
  "does not satisfy production proof-format evidence",
  "C01 verifier candidate Groth16 proof-format truth boundary",
);
const productionGroth16ToolchainPreflightRef = verifierCandidateEvidence.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-production-groth16-toolchain-preflight",
);
assert(
  productionGroth16ToolchainPreflightRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json",
  "C01 verifier candidate evidence must reference the blocked production Groth16 toolchain preflight packet",
);
assert(
  productionGroth16ToolchainPreflightRef?.command ===
    "npm run zk:c01-production-groth16-toolchain-preflight-check",
  "C01 verifier candidate evidence must record the blocked production Groth16 toolchain preflight guard",
);
includes(
  productionGroth16ToolchainPreflightRef?.truthBoundary ?? "",
  "does not satisfy production proof-format evidence",
  "C01 verifier candidate production Groth16 toolchain truth boundary",
);
const productionVerifyingKeyRef = verifierCandidateEvidence.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-production-verifying-key-candidate",
);
assert(
  productionVerifyingKeyRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json",
  "C01 verifier candidate evidence must reference the blocked production verifying-key packet",
);
assert(
  productionVerifyingKeyRef?.command === "npm run zk:c01-production-verifying-key-candidate-check",
  "C01 verifier candidate evidence must record the blocked production verifying-key guard",
);
includes(
  productionVerifyingKeyRef?.truthBoundary ?? "",
  "does not satisfy production verifying-key evidence",
  "C01 verifier candidate production verifying-key truth boundary",
);
const productionArtifactAcceptanceGateRef = verifierCandidateEvidence.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-production-artifact-acceptance-gate",
);
assert(
  productionArtifactAcceptanceGateRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json",
  "C01 verifier candidate evidence must reference the blocked production artifact acceptance gate packet",
);
assert(
  productionArtifactAcceptanceGateRef?.command ===
    "npm run zk:c01-production-artifact-acceptance-gate-check",
  "C01 verifier candidate evidence must record the production artifact acceptance gate guard",
);
includes(
  productionArtifactAcceptanceGateRef?.truthBoundary ?? "",
  "does not satisfy production proof-format",
  "C01 verifier candidate production artifact acceptance gate truth boundary",
);
const externalReviewHandoffRef = verifierCandidateEvidence.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-external-review-handoff",
);
assert(
  externalReviewHandoffRef?.status === "ready-for-external-c01-verifier-review-handoff-blocked",
  "C01 verifier candidate evidence must record the blocked external review handoff packet status",
);
assert(
  externalReviewHandoffRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json",
  "C01 verifier candidate evidence must reference the external review handoff packet",
);
assert(
  externalReviewHandoffRef?.command === "npm run zk:c01-external-review-handoff-check",
  "C01 verifier candidate evidence must record the external review handoff guard",
);
for (const marker of [
  "source-review acceptance",
  "deterministic production artifact build",
  "production artifact bundle",
  "verifier-adapter acceptance",
  "SBF/live lineage acceptance",
  "audit/reviewer acceptance",
  "composite evidence-chain closure",
  "does not satisfy production proof-format",
]) {
  includes(
    externalReviewHandoffRef?.truthBoundary ?? "",
    marker,
    "C01 verifier candidate external review handoff truth boundary",
  );
}
const sbfLiveLineageRef = verifierCandidateEvidence.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-sbf-live-lineage-candidate",
);
assert(
  sbfLiveLineageRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json",
  "C01 verifier candidate evidence must reference the blocked SBF/live lineage candidate packet",
);
assert(
  sbfLiveLineageRef?.command === "npm run zk:c01-sbf-live-lineage-candidate-check",
  "C01 verifier candidate evidence must record the SBF/live lineage candidate guard",
);
includes(
  sbfLiveLineageRef?.truthBoundary ?? "",
  "does not satisfy SBF/live lineage",
  "C01 verifier candidate SBF/live lineage truth boundary",
);
const verifierAdapterTestRef = verifierCandidateEvidence.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-verifier-adapter-acceptance-test-candidate",
);
assert(
  verifierAdapterTestRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "C01 verifier candidate evidence must reference the blocked verifier adapter-test packet",
);
assert(
  verifierAdapterTestRef?.command === "npm run zk:c01-verifier-adapter-test-candidate-check",
  "C01 verifier candidate evidence must record the blocked verifier adapter-test guard",
);
includes(
  verifierAdapterTestRef?.truthBoundary ?? "",
  "does not satisfy verifier-adapter evidence",
  "C01 verifier candidate adapter-test truth boundary",
);
const publicWitnessBindingRef = verifierCandidateEvidence.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "local-sunspot-public-witness-binding-observation",
);
assert(
  publicWitnessBindingRef?.status ===
    "local-public-witness-decoded-stale-against-current-proof-receipt",
  "C01 verifier candidate evidence must record the local public-witness binding observation",
);
assert(
  publicWitnessBindingRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json",
  "C01 verifier candidate public-witness binding ref mismatch",
);
assert(
  publicWitnessBindingRef?.command === "npm run zk:c01-public-witness-binding-check",
  "C01 verifier candidate public-witness binding command mismatch",
);
for (const marker of [
  "local nonproduction Sunspot/Gnark beta18 public witness",
  "private-spend-public-input-hash",
  "stale against the current H6 local proof receipt",
  "does not satisfy production private-spend-public-input-hash binding evidence",
]) {
  includes(publicWitnessBindingRef?.truthBoundary ?? "", marker, "C01 public-witness binding truth boundary");
}
const localAdapterSeamRef = verifierCandidateEvidence.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "local-fail-closed-verifier-adapter-seam-harness",
);
assert(
  localAdapterSeamRef?.status === "local-fail-closed-harness-only",
  "C01 verifier candidate evidence must record the local fail-closed adapter seam harness",
);
assert(
  localAdapterSeamRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "C01 verifier candidate local seam must reference the adapter-test candidate packet",
);
assert(
  localAdapterSeamRef?.sourceRef === "programs/vanta_private_pool_v2_spend/src/lib.rs",
  "C01 verifier candidate local seam source ref mismatch",
);
assert(
  localAdapterSeamRef?.command === "npm run zk:c01-verifier-adapter-seam-check",
  "C01 verifier candidate evidence must record the local adapter seam guard",
);
for (const marker of [
  "source-only preflight/default-adapter/verified-commit seam",
  "does not satisfy verifier-adapter evidence",
  "does not satisfy verifier-adapter acceptance",
  "does not satisfy tag-3 proof acceptance",
]) {
  includes(localAdapterSeamRef?.truthBoundary ?? "", marker, "C01 verifier candidate local seam truth boundary");
}
assert(
  backendOptionsEvidence.status === "blocked-selected-groth16-tag3-solana-v0-production-evidence",
  "C01 backend-options evidence must remain blocked while selected-backend evidence is absent",
);
assert(
  backendOptionsEvidence.selectedBackend === "groth16-tag3-solana-v0",
  "C01 backend-options evidence must record the selected backend",
);
assert(
  backendOptionsEvidence.backendOptions?.some((entry) => entry.id === "groth16-tag3-solana-v0"),
  "C01 backend-options evidence must record the Groth16 tag-3 option",
);
const groth16BackendOption = backendOptionsEvidence.backendOptions?.find(
  (entry) => entry.id === "groth16-tag3-solana-v0",
);
assert(
  groth16BackendOption?.proofFormatCandidateRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json",
  "C01 backend-options evidence must reference the Groth16 proof-format candidate packet",
);
assert(
  groth16BackendOption?.toolchainPreflightRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json",
  "C01 backend-options evidence must reference the production Groth16 toolchain preflight packet",
);
assert(
  groth16BackendOption?.productionVerifyingKeyCandidateRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json",
  "C01 backend-options evidence must reference the production verifying-key candidate packet",
);
assert(
  groth16BackendOption?.productionArtifactAcceptanceGateRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json",
  "C01 backend-options evidence must reference the production artifact acceptance gate packet",
);
assert(
  groth16BackendOption?.verifierAdapterTestCandidateRef?.artifactRef ===
    "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "C01 backend-options evidence must reference the verifier adapter-test candidate packet",
);
assert(
  backendOptionsEvidence.backendOptions?.some((entry) => entry.id === "noir-bb-ultrahonk-adaptation"),
  "C01 backend-options evidence must record the UltraHonk adaptation option",
);
assert(
  groth16ProofFormatCandidateEvidence.status === "blocked-no-groth16-production-proof-format-artifact",
  "C01 Groth16 proof-format candidate evidence must remain blocked",
);
assert(
  groth16ProofFormatCandidateEvidence.currentCandidateArtifact?.artifactRef === null,
  "C01 Groth16 proof-format candidate evidence must not attach a current artifact ref",
);
assert(
  groth16ProofFormatCandidateEvidence.satisfiesRequiredPositiveEvidence
    ?.actualPrivateSpendProductionProofFormat === false,
  "C01 Groth16 proof-format candidate evidence must not satisfy production proof-format evidence",
);
assert(
  publicWitnessBindingEvidence.status ===
    "local-public-witness-decoded-stale-against-current-proof-receipt",
  "C01 public-witness binding evidence status mismatch",
);
assert(
  publicWitnessBindingEvidence.observedPublicWitness?.decodedPublicInputs?.[0]?.label ===
    "private-spend-public-input-hash",
  "C01 public-witness binding evidence must decode the private spend public input label",
);
assert(
  publicWitnessBindingEvidence.observedPublicWitness?.matchesLocalProofReceiptPublicInput === false,
  "C01 public-witness binding evidence must not claim the stale beta18 witness matches the current local receipt public input",
);
assert(
  publicWitnessBindingEvidence.observedPublicWitness?.staleAgainstCurrentProofReceipt === true,
  "C01 public-witness binding evidence must record stale current-receipt boundary",
);
assert(
  publicWitnessBindingEvidence.satisfiesRequiredPositiveEvidence?.privateSpendPublicInputHashBinding === false,
  "C01 public-witness binding evidence must not satisfy production public-input binding",
);
assert(
  productionGroth16ToolchainPreflightEvidence.status === "blocked-local-toolchain-no-groth16-scheme",
  "C01 production Groth16 toolchain preflight evidence must remain blocked",
);
assert(
  productionGroth16ToolchainPreflightEvidence.observedToolchain?.bb?.missingRequiredScheme ===
    "groth16",
  "C01 production Groth16 toolchain preflight evidence must record the missing Groth16 scheme",
);
assert(
  productionGroth16ToolchainPreflightEvidence.satisfiesRequiredPositiveEvidence
    ?.actualPrivateSpendProductionProofFormat === false,
  "C01 production Groth16 toolchain preflight evidence must not satisfy production proof-format evidence",
);
assert(
  productionGroth16ToolchainPreflightEvidence.satisfiesRequiredPositiveEvidence
    ?.productionVerifyingKeyHash === false,
  "C01 production Groth16 toolchain preflight evidence must not satisfy production verifying-key evidence",
);
assert(
  productionVerifyingKeyCandidateEvidence.status === "blocked-no-production-verifying-key-hash-artifact",
  "C01 production verifying-key candidate evidence must remain blocked",
);
assert(
  productionVerifyingKeyCandidateEvidence.currentProductionVerifyingKeyArtifact?.artifactRef === null,
  "C01 production verifying-key candidate evidence must not attach a current artifact ref",
);
assert(
  productionVerifyingKeyCandidateEvidence.currentRegistryObservation
    ?.satisfiesProductionVerifyingKeyEvidence === false,
  "C01 production verifying-key candidate evidence must not promote tag-5 registry metadata",
);
assert(
  productionVerifyingKeyCandidateEvidence.satisfiesRequiredPositiveEvidence?.productionVerifyingKeyHash === false,
  "C01 production verifying-key candidate evidence must not satisfy production verifying-key evidence",
);
assert(
  productionArtifactAcceptanceGateEvidence.status === "blocked-no-reviewed-production-artifact-bundle",
  "C01 production artifact acceptance gate evidence must remain blocked",
);
assert(
  productionArtifactAcceptanceGateEvidence.currentAcceptedProductionBundle?.bundleRef === null,
  "C01 production artifact acceptance gate evidence must not attach a production bundle ref",
);
assert(
  productionArtifactAcceptanceGateEvidence.satisfiesRequiredPositiveEvidence?.productionArtifactAcceptance ===
    false,
  "C01 production artifact acceptance gate evidence must not satisfy production artifact acceptance",
);
assert(
  externalReviewHandoffEvidence.status === "ready-for-external-c01-verifier-review-handoff-blocked",
  "C01 external review handoff evidence must remain blocked until reviewed refs are returned",
);
assert(
  externalReviewHandoffEvidence.reviewOrder?.length === 7,
  "C01 external review handoff evidence must enumerate the full reviewer evidence order",
);
assert(
  externalReviewHandoffEvidence.c01VerifierReady === false,
  "C01 external review handoff evidence must not mark C01 verifier readiness true",
);
assert(
  sbfLiveLineageCandidateEvidence.status === "blocked-no-rebuilt-redeployed-reinitialized-live-lineage",
  "C01 SBF/live lineage candidate evidence must remain blocked",
);
assert(
  sbfLiveLineageCandidateEvidence.currentLiveLineage?.satisfiesSbfLiveLineage === false,
  "C01 SBF/live lineage candidate evidence must not satisfy live lineage",
);
assert(
  sbfLiveLineageCandidateEvidence.currentLiveLineage?.deploymentSignatureRef === null,
  "C01 SBF/live lineage candidate evidence must not attach a deployment signature ref",
);
assert(
  sbfLiveLineageCandidateEvidence.localSbfAbiStatusRef?.command ===
    "npm run private-pool-v2:sbf-abi-check",
  "C01 SBF/live lineage candidate evidence must reference the local SBF ABI guard",
);
assert(
  sbfLiveLineageCandidateEvidence.localSbfAbiStatusRef?.satisfiesSbfLiveLineage === false,
  "local SBF ABI freshness must not satisfy C01 SBF/live lineage",
);
assert(
  sbfLiveLineageCandidateEvidence.localH6SbfLineageRehearsal?.status ===
    "local-h6-sbf-lineage-rehearsal-only",
  "C01 SBF/live lineage candidate evidence must record the local H6 SBF lineage rehearsal",
);
assert(
  sbfLiveLineageCandidateEvidence.localH6SbfLineageRehearsal?.command ===
    "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
  "C01 SBF/live lineage local rehearsal must reference the local unsafe verifier CPI command",
);
assert(
  sbfLiveLineageCandidateEvidence.localH6SbfLineageRehearsal?.satisfiesSbfLiveLineage === false,
  "C01 local H6 SBF lineage rehearsal must not satisfy SBF/live lineage",
);
assert(
  sbfLiveLineageCandidateEvidence.sbfLiveLineageAcceptanceGateRef ===
    "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json",
  "C01 SBF/live lineage candidate evidence must reference the SBF/live acceptance gate",
);
assert(
  sbfLiveLineageCandidateEvidence.sbfLiveLineageAcceptanceTemplateRef ===
    "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json",
  "C01 SBF/live lineage candidate evidence must reference the SBF/live acceptance template",
);
assert(
  verifierAdapterTestCandidateEvidence.status === "blocked-no-verifier-adapter-acceptance-tests",
  "C01 verifier adapter-test candidate evidence must remain blocked",
);
assert(
  verifierAdapterTestCandidateEvidence.currentAdapterArtifact?.artifactRef === null,
  "C01 verifier adapter-test candidate evidence must not attach a current adapter artifact ref",
);
assert(
  verifierAdapterTestCandidateEvidence.currentAcceptanceTests?.validProofMutatesNullifierAndOutputState
    ?.artifactRef === null,
  "C01 verifier adapter-test candidate evidence must not attach a valid-proof mutation test ref",
);
assert(
  verifierAdapterTestCandidateEvidence.currentAcceptanceTests?.invalidProofLeavesAccountsUnchanged
    ?.artifactRef === null,
  "C01 verifier adapter-test candidate evidence must not attach an invalid-proof no-mutation test ref",
);
assert(
  verifierAdapterTestCandidateEvidence.currentAcceptanceTests?.wrongPublicInputHashLeavesAccountsUnchanged
    ?.artifactRef === null,
  "C01 verifier adapter-test candidate evidence must not attach a wrong-public-input no-mutation test ref",
);
assert(
  verifierAdapterTestCandidateEvidence.currentAcceptanceTests?.wrongVerifyingKeyLeavesAccountsUnchanged
    ?.artifactRef === null,
  "C01 verifier adapter-test candidate evidence must not attach a wrong-verifying-key no-mutation test ref",
);
assert(
  verifierAdapterTestCandidateEvidence.satisfiesRequiredPositiveEvidence?.verifierAdapter === false,
  "C01 verifier adapter-test candidate evidence must not satisfy verifier adapter evidence",
);
assert(
  verifierAdapterTestCandidateEvidence.satisfiesRequiredPositiveEvidence?.acceptedProofMutatesStateTest === false,
  "C01 verifier adapter-test candidate evidence must not satisfy valid-proof mutation evidence",
);
assert(
  verifierAdapterTestCandidateEvidence.satisfiesRequiredPositiveEvidence
    ?.invalidProofLeavesAccountsUnchangedTest === false,
  "C01 verifier adapter-test candidate evidence must not satisfy invalid-proof no-mutation evidence",
);
assert(
  verifierAdapterTestCandidateEvidence.satisfiesRequiredPositiveEvidence
    ?.wrongPublicInputHashLeavesAccountsUnchangedTest === false,
  "C01 verifier adapter-test candidate evidence must not satisfy wrong-public-input no-mutation evidence",
);
assert(
  verifierAdapterTestCandidateEvidence.satisfiesRequiredPositiveEvidence
    ?.wrongVerifyingKeyLeavesAccountsUnchangedTest === false,
  "C01 verifier adapter-test candidate evidence must not satisfy wrong-verifying-key no-mutation evidence",
);
assert(
  verifierAdapterTestCandidateEvidence.satisfiesRequiredPositiveEvidence
    ?.privateSpendPublicInputHashBinding === false,
  "C01 verifier adapter-test candidate evidence must not satisfy public input binding evidence",
);
assert(
  verifierAdapterTestCandidateEvidence.localFailClosedVerifierAdapterSeamHarness?.status ===
    "local-fail-closed-harness-only",
  "C01 verifier adapter-test candidate evidence must record local seam harness as local-only",
);
assert(
  verifierAdapterTestCandidateEvidence.localFailClosedVerifierAdapterSeamHarness
    ?.satisfiesVerifierAdapterAcceptance === false,
  "C01 local seam harness must not satisfy adapter acceptance",
);
assert(
  localProofFormatEvidence.status === "local-proof-format-observed-not-production",
  "C01 local proof-format evidence must remain non-production",
);
assert(
  localProofFormatEvidence.localProofObservation?.proofSystem === "noir-bb",
  "C01 local proof-format evidence must record current local noir-bb proof evidence",
);
assert(
  localProofFormatEvidence.localProofObservation?.backend === "barretenberg-ultrahonk",
  "C01 local proof-format evidence must record current local UltraHonk backend evidence",
);
assert(
  localProofFormatEvidence.localProofObservation?.proofByteLength === 16000,
  "C01 local proof-format evidence must record the current local proof byte length",
);
assert(
  localProofFormatEvidence.localProofObservation?.verifyingKeyHashKind ===
    "local-acir-bytecode-hash-not-production-vk",
  "C01 local proof-format evidence must keep local ACIR metadata out of production VK evidence",
);
assert(
  localProofFormatEvidence.reservedTag3FormatComparison?.proofSystem === "groth16",
  "C01 local proof-format evidence must compare the local proof to the reserved Groth16 target",
);
assert(
  localProofFormatEvidence.reservedTag3FormatComparison?.proofByteLength === 324,
  "C01 local proof-format evidence must preserve the selected Gnark proof byte length",
);
assert(
  localProofFormatEvidence.reservedTag3FormatComparison?.publicWitnessByteLength === 44,
  "C01 local proof-format evidence must preserve the selected Gnark public witness byte length",
);
assert(
  localProofFormatEvidence.satisfiesRequiredPositiveEvidence?.actualPrivateSpendProductionProofFormat === false,
  "C01 local proof-format evidence must not satisfy production proof-format evidence",
);
const requiredEvidenceIds = new Set(
  (verifierCandidateEvidence.requiredPositiveEvidence ?? []).map((entry) => entry.id),
);
for (const id of [
  "backend-selection",
  "actual-private-spend-production-proof-format",
  "private-spend-public-input-hash-binding",
  "production-verifying-key-hash",
  "verifier-adapter",
  "accepted-proof-mutates-state-test",
  "invalid-proof-leaves-accounts-unchanged-test",
  "wrong-public-input-hash-leaves-accounts-unchanged-test",
  "wrong-verifying-key-leaves-accounts-unchanged-test",
  "sbf-live-lineage",
  "audit-reviewer-acceptance",
]) {
  assert(requiredEvidenceIds.has(id), `C01 verifier candidate evidence missing required evidence id ${id}`);
}
assert(
  verifierCandidateEvidence.requiredPositiveEvidence.every((entry) =>
    entry.id === "backend-selection" ? entry.status === "satisfied-local-selection" : entry.status === "blocked",
  ),
  "C01 verifier candidate evidence must only satisfy backend selection while all production evidence stays blocked",
);
assert(
  verifierCandidateEvidence.requiredPositiveEvidence.every((entry) =>
    entry.id === "backend-selection"
      ? entry.currentArtifactRef === "docs/zk/c01-production-verifier-backend-decision.md"
      : entry.currentArtifactRef === null,
  ),
  "C01 verifier candidate evidence must attach only the backend-selection decision ref",
);
assert(
  verifierCandidateEvidence.requiredPositiveEvidence.every((entry) =>
    String(entry.truthBoundary ?? "").trim(),
  ),
  "C01 verifier candidate evidence must explain the truth boundary for every required positive evidence item",
);
for (const phrase of [
  "raw proof witness",
  "private key",
  "seed phrase",
  "bearer ",
  "database url",
  "signed transaction",
]) {
  assert(
    !JSON.stringify(verifierCandidateEvidence).toLowerCase().includes(phrase),
    `C01 verifier candidate evidence must not contain secret-bearing phrase ${phrase}`,
  );
}
assert(
  verifierCandidateEvidence.canonicalCommands?.includes(
    "npm run zk:c01-production-verifier-backend-candidate-check",
  ),
  "C01 verifier candidate evidence must record its canonical guard",
);
assert(
  verifierCandidateEvidence.canonicalCommands?.includes(
    "npm run zk:c01-verifier-backend-options-check",
  ),
  "C01 verifier candidate evidence must record the backend-options guard",
);
assert(
  verifierCandidateEvidence.canonicalCommands?.includes(
    "npm run zk:c01-groth16-proof-format-candidate-check",
  ),
  "C01 verifier candidate evidence must record the Groth16 proof-format candidate guard",
);
assert(
  verifierCandidateEvidence.canonicalCommands?.includes(
    "npm run zk:c01-production-groth16-toolchain-preflight-check",
  ),
  "C01 verifier candidate evidence must record the production Groth16 toolchain preflight guard",
);
assert(
  verifierCandidateEvidence.canonicalCommands?.includes(
    "npm run zk:c01-production-artifact-acceptance-gate-check",
  ),
  "C01 verifier candidate evidence must record the production artifact acceptance gate guard",
);
assert(
  verifierCandidateEvidence.canonicalCommands?.includes(
    "npm run zk:c01-external-review-handoff-check",
  ),
  "C01 verifier candidate evidence must record the external review handoff guard",
);
assert(
  verifierCandidateEvidence.canonicalCommands?.includes("npm run zk:c01-public-witness-binding-check"),
  "C01 verifier candidate evidence must record the public-witness binding guard",
);
assert(
  verifierCandidateEvidence.canonicalCommands?.includes(
    "npm run zk:c01-production-verifying-key-candidate-check",
  ),
  "C01 verifier candidate evidence must record the production verifying-key candidate guard",
);
assert(
  verifierCandidateEvidence.canonicalCommands?.includes(
    "npm run zk:c01-sbf-live-lineage-candidate-check",
  ),
  "C01 verifier candidate evidence must record the SBF/live lineage candidate guard",
);
assert(
  verifierCandidateEvidence.canonicalCommands?.includes(
    "npm run zk:c01-verifier-adapter-test-candidate-check",
  ),
  "C01 verifier candidate evidence must record the verifier adapter-test candidate guard",
);
assert(
  verifierCandidateEvidence.canonicalCommands?.includes("npm run zk:c01-verifier-adapter-seam-check"),
  "C01 verifier candidate evidence must record the verifier adapter seam guard",
);
assert(
  localProofFormatEvidence.canonicalCommands?.includes(
    "npm run zk:c01-local-proof-format-evidence-check",
  ),
  "C01 local proof-format evidence must record its canonical guard",
);

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
  "VANTA_PRIVATE_POOL_V2_C01_GNARK_PROOF_BYTE_LENGTH = 324",
  "VANTA_PRIVATE_POOL_V2_C01_GNARK_PUBLIC_WITNESS_BYTE_LENGTH = 44",
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
  "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json",
  "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json",
  "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json",
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json",
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "proof-format, production verifying-key, verifier-adapter, positive/negative test",
  "blocked-no-rebuilt-redeployed-reinitialized-live-lineage",
  "blocked-local-toolchain-no-groth16-scheme",
  "groth16-tag3-solana-v0",
  "noir-bb-ultrahonk-adaptation",
  "solana-c01-groth16-verifier-ready",
  "not production proof-format acceptance",
]) {
  includes(c01DecisionPacket, marker, "C01 verifier backend decision packet evidence ref");
}

for (const marker of [
  "offchain-remote-proof-artifact-only",
  "solana-c01-groth16-verifier-ready",
  "proofSystem: `groth16`",
  "gnarkProof:324",
  "gnarkPublicWitness:44",
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
  scripts["zk:c01-local-proof-format-evidence-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-local-proof-format-evidence.mjs",
  "package.json must expose zk:c01-local-proof-format-evidence-check",
);
assert(
  scripts["zk:c01-verifier-backend-options-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-backend-options.mjs",
  "package.json must expose zk:c01-verifier-backend-options-check",
);
assert(
  scripts["zk:c01-groth16-proof-format-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-groth16-proof-format-candidate.mjs",
  "package.json must expose zk:c01-groth16-proof-format-candidate-check",
);
assert(
  scripts["zk:c01-production-groth16-toolchain-preflight-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-groth16-toolchain-preflight.mjs",
  "package.json must expose zk:c01-production-groth16-toolchain-preflight-check",
);
assert(
  scripts["zk:c01-production-artifact-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-artifact-acceptance-gate.mjs",
  "package.json must expose zk:c01-production-artifact-acceptance-gate-check",
);
assert(
  scripts["zk:c01-public-witness-binding-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-public-witness-binding.mjs",
  "package.json must expose zk:c01-public-witness-binding-check",
);
assert(
  scripts["zk:c01-production-verifying-key-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-verifying-key-candidate.mjs",
  "package.json must expose zk:c01-production-verifying-key-candidate-check",
);
assert(
  scripts["zk:c01-sbf-live-lineage-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sbf-live-lineage-candidate.mjs",
  "package.json must expose zk:c01-sbf-live-lineage-candidate-check",
);
assert(
  scripts["zk:c01-sbf-live-lineage-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sbf-live-lineage-acceptance-gate.mjs",
  "package.json must expose zk:c01-sbf-live-lineage-acceptance-gate-check",
);
assert(
  scripts["zk:c01-verifier-adapter-test-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-verifier-adapter-test-candidate.mjs",
  "package.json must expose zk:c01-verifier-adapter-test-candidate-check",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-production-verifier-backend-candidate-check"),
  "zk:review-guards-check must include the C01 production verifier backend candidate guard",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-local-proof-format-evidence-check"),
  "zk:review-guards-check must include the C01 local proof-format evidence guard",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-verifier-backend-options-check"),
  "zk:review-guards-check must include the C01 backend-options guard",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-groth16-proof-format-candidate-check"),
  "zk:review-guards-check must include the C01 Groth16 proof-format candidate guard",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-production-groth16-toolchain-preflight-check"),
  "zk:review-guards-check must include the C01 production Groth16 toolchain preflight guard",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-production-artifact-acceptance-gate-check"),
  "zk:review-guards-check must include the C01 production artifact acceptance gate guard",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-public-witness-binding-check"),
  "zk:review-guards-check must include the C01 public-witness binding guard",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-production-verifying-key-candidate-check"),
  "zk:review-guards-check must include the C01 production verifying-key candidate guard",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-sbf-live-lineage-candidate-check"),
  "zk:review-guards-check must include the C01 SBF/live lineage candidate guard",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-sbf-live-lineage-acceptance-gate-check"),
  "zk:review-guards-check must include the C01 SBF/live lineage acceptance gate",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:c01-verifier-adapter-test-candidate-check"),
  "zk:review-guards-check must include the C01 verifier adapter-test candidate guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-production-verifier-backend-candidate-check"),
  "zk:feedback-loop-check must include the C01 production verifier backend candidate guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-local-proof-format-evidence-check"),
  "zk:feedback-loop-check must include the C01 local proof-format evidence guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-verifier-backend-options-check"),
  "zk:feedback-loop-check must include the C01 backend-options guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-groth16-proof-format-candidate-check"),
  "zk:feedback-loop-check must include the C01 Groth16 proof-format candidate guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-production-groth16-toolchain-preflight-check"),
  "zk:feedback-loop-check must include the C01 production Groth16 toolchain preflight guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-production-artifact-acceptance-gate-check"),
  "zk:feedback-loop-check must include the C01 production artifact acceptance gate guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-public-witness-binding-check"),
  "zk:feedback-loop-check must include the C01 public-witness binding guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-production-verifying-key-candidate-check"),
  "zk:feedback-loop-check must include the C01 production verifying-key candidate guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-sbf-live-lineage-candidate-check"),
  "zk:feedback-loop-check must include the C01 SBF/live lineage candidate guard",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-sbf-live-lineage-acceptance-gate-check"),
  "zk:feedback-loop-check must include the C01 SBF/live lineage acceptance gate",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:c01-verifier-adapter-test-candidate-check"),
  "zk:feedback-loop-check must include the C01 verifier adapter-test candidate guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run zk:review-guards-check"),
  "private-pool-v2:verify must run review guards, including the C01 production verifier backend candidate guard",
);

console.log("private-pool-v2 production verifier backend candidate: PASS");

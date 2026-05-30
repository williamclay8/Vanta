import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const scriptName = "private-pool-v2:groth16-verifier-cpi-check";
const scriptCommand = "node scripts/check-vanta-private-pool-v2-groth16-verifier-cpi.mjs";
const programPath = "programs/vanta_private_pool_v2_spend/src/lib.rs";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const adapterTestPath = "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json";
const productionArtifactGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const adapterAcceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json";
const sbfLiveLineageGatePath =
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json";
const auditReviewerGatePath =
  "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json";
const closureGatePath = "ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json";
const positiveClaimGatePath =
  "ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json";
const externalHandoffPath = "ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json";
const humanHandoffPath = "ops/mainnet/private-pool-v2-c01-external-evidence-request.md";
const productionAuditPath = "PRODUCTION_PRIVACY_AUDIT.md";

function fail(message) {
  console.error(`private-pool-v2 Groth16 verifier CPI check: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  assert(existsSync(resolve(repoRoot, path)), `missing ${path}`);
  return JSON.parse(read(path));
}

function includes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

function assertOrdered(source, label, markers) {
  let lastIndex = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker, lastIndex + 1);
    assert(index > lastIndex, `${label} order missing marker: ${marker}`);
    lastIndex = index;
  }
}

function assertAllFalse(value, label, fields) {
  for (const field of fields) {
    assert(value[field] === false, `${label}.${field} must remain false`);
  }
}

function assertAllNull(value, label, fields) {
  for (const field of fields) {
    assert(value[field] === null, `${label}.${field} must remain null`);
  }
}

function assertBlockers(value, label, blockers) {
  assert(Array.isArray(value.remainingBlockers), `${label}.remainingBlockers must be an array`);
  for (const blocker of blockers) {
    assert(value.remainingBlockers.includes(blocker), `${label} missing blocker: ${blocker}`);
  }
}

function assertCanonicalCommand(value, label, command) {
  assert(Array.isArray(value.canonicalCommands), `${label}.canonicalCommands must be an array`);
  assert(value.canonicalCommands.includes(command), `${label} missing canonical command: ${command}`);
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const program = read(programPath);
const productionAudit = read(productionAuditPath);
const candidate = readJson(candidatePath);
const adapterTest = readJson(adapterTestPath);
const productionArtifactGate = readJson(productionArtifactGatePath);
const adapterAcceptanceGate = readJson(adapterAcceptanceGatePath);
const sbfLiveLineageGate = readJson(sbfLiveLineageGatePath);
const auditReviewerGate = readJson(auditReviewerGatePath);
const closureGate = readJson(closureGatePath);
const positiveClaimGate = readJson(positiveClaimGatePath);
const externalHandoff = readJson(externalHandoffPath);
const humanHandoff = read(humanHandoffPath);

assert(scripts[scriptName] === scriptCommand, `package.json must expose ${scriptName}`);
includes(productionAudit, `npm run ${scriptName}`, productionAuditPath);

assert(candidate.selectedBackend === "groth16-tag3-solana-v0", "candidate selected backend mismatch");
assert(
  candidate.status === "blocked-selected-groth16-tag3-solana-v0-production-evidence",
  "candidate must remain blocked on production evidence",
);
assertAllFalse(candidate, "candidate", [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]);

assert(
  adapterTest.status === "blocked-no-verifier-adapter-acceptance-tests",
  "adapter test candidate must remain blocked",
);
assertAllFalse(adapterTest, "adapter test candidate", [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]);
for (const command of [
  "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
  "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "npm run zk:c01-verifier-adapter-seam-check",
]) {
  assertCanonicalCommand(adapterTest, "adapter test candidate", command);
}

assert(
  productionArtifactGate.status === "blocked-no-reviewed-production-artifact-bundle",
  "production artifact gate must remain blocked",
);
assertAllFalse(productionArtifactGate, "production artifact gate", [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]);

assert(
  adapterAcceptanceGate.status === "blocked-no-production-verifier-adapter-acceptance",
  "adapter acceptance gate must remain blocked",
);
assertBlockers(adapterAcceptanceGate, "adapter acceptance gate", [
  "no production verifier adapter acceptance",
  "no production valid mutation evidence",
  "no production invalid/wrong-input/wrong-key/wrong-program no-mutation evidence",
  "no rebuilt/redeployed/reinitialized/live SBF lineage",
]);

assert(
  sbfLiveLineageGate.status === "blocked-no-sbf-live-lineage-acceptance",
  "SBF/live lineage gate must remain blocked",
);
assertBlockers(sbfLiveLineageGate, "SBF/live lineage gate", [
  "no reviewed production artifact bundle",
  "no production verifier-adapter acceptance",
  "no deployed spend/verifier program ids",
  "no deployed verifier program id/hash",
  "no verifier-key record binding production VK hash to verifier program id",
  "no deployment, reinitialization/migration, verifier-key registration, or proof-enforced path receipts",
]);

assert(
  auditReviewerGate.status === "operator-skipped-control",
  "audit reviewer gate must be operator-skipped-control",
);
assertBlockers(auditReviewerGate, "audit reviewer gate", [
  "no reviewed production artifact bundle",
  "no production verifier-adapter acceptance",
  "no production valid mutation evidence",
  "no production invalid/wrong-input/wrong-key/wrong-program no-mutation evidence",
  "no rebuilt/redeployed/reinitialized/live SBF lineage",
  "no reviewer identity and C01 scope ref",
]);

assert(
  closureGate.status === "blocked-no-complete-c01-verifier-evidence-chain",
  "closure gate must remain blocked",
);
assertAllFalse(closureGate, "closure gate", [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "proofVerifiedClaimAllowed",
]);
assert(closureGate.requiredClosureShape?.tag === 3, "closure must bind tag 3");
assert(closureGate.requiredClosureShape?.proofSystem === "groth16", "closure must bind Groth16");
assert(
  closureGate.requiredClosureShape?.proofByteLength === 324,
  "closure must bind 324-byte Gnark proof",
);
assert(
  closureGate.requiredClosureShape?.publicWitnessByteLength === 44,
  "closure must bind 44-byte public witness",
);
assert(
  closureGate.requiredClosureShape?.verifierInstructionDataByteLength === 368,
  "closure must bind 368-byte verifier instruction data",
);
assert(
  closureGate.requiredClosureShape?.adapterKind === "in-program-verifier-or-dedicated-verifier-cpi",
  "closure must preserve verifier adapter kind",
);
assert(closureGate.currentAcceptedClosureEvidence?.status === "absent", "accepted closure evidence must be absent");
assertAllNull(closureGate.currentAcceptedClosureEvidence, "accepted closure evidence", [
  "productionArtifactBundleRef",
  "verifierAdapterAcceptanceRef",
  "sbfLiveLineageRef",
  "auditReviewerAcceptanceRef",
  "productionProofFormatArtifactRef",
  "productionVerifyingKeyArtifactRef",
  "productionVerifyingKeyHash",
  "validProofMutationTestRef",
  "invalidProofNoMutationTestRef",
  "wrongPublicInputNoMutationTestRef",
  "wrongVerifyingKeyNoMutationTestRef",
  "wrongVerifierProgramNoMutationTestRef",
  "deployedVerifierProgramId",
  "deployedVerifierProgramSbfHash",
  "tag5VerifierKeyRecordBindingRef",
]);
assert(
  closureGate.currentAcceptedClosureEvidence?.satisfiesC01VerifierEvidenceClosure === false,
  "closure evidence must not satisfy C01 closure",
);
for (const [field, value] of Object.entries(closureGate.satisfiesRequiredPositiveEvidence ?? {})) {
  const expected = field === "backendSelection";
  assert(value === expected, `closure positive-evidence flag ${field} must remain ${expected}`);
}
assertBlockers(closureGate, "closure gate", [
  "no reviewed production artifact bundle",
  "no reviewed production verifier-adapter acceptance",
  "no deployed verifier program id/hash",
  "no verifier-key record binding production VK hash to verifier program id",
  "no reviewed SBF/live lineage acceptance",
  "no complete cross-packet C01 verifier evidence-chain validation",
]);

assert(
  positiveClaimGate.status === "blocked-no-tag3-valid-proof-success",
  "positive proof-verified claim gate must remain blocked",
);
assertAllFalse(positiveClaimGate, "positive proof-verified claim gate", [
  "proofVerifiedClaimAllowed",
  "proofVerifiedSpendClaimAllowed",
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]);
assert(
  positiveClaimGate.currentTag3Observation?.status === "reserved-fail-closed",
  "tag-3 observation must remain fail-closed",
);
assert(positiveClaimGate.currentTag3Observation?.customError === 14, "tag-3 custom error must remain 14");
assert(
  positiveClaimGate.currentTag3Observation?.errorName === "ERR_PROOF_VERIFIER_NOT_WIRED",
  "tag-3 error must remain ERR_PROOF_VERIFIER_NOT_WIRED",
);
assertAllNull(positiveClaimGate.positiveEvidenceRefs, "positive evidence refs", [
  "tag3ValidProofSuccessArtifactRef",
  "tag3AcceptedProofMutationArtifactRef",
  "tag3InvalidProofNoMutationArtifactRef",
  "tag3WrongPublicInputHashNoMutationArtifactRef",
  "tag3WrongVerifyingKeyNoMutationArtifactRef",
  "tag3WrongVerifierProgramNoMutationArtifactRef",
]);
for (const field of [
  "satisfiesValidProofSuccess",
  "satisfiesAcceptedProofMutation",
  "satisfiesInvalidProofNoMutation",
  "satisfiesWrongPublicInputHashNoMutation",
  "satisfiesWrongVerifyingKeyNoMutation",
  "satisfiesWrongVerifierProgramNoMutation",
  "satisfiesVerifierAdapterAcceptance",
]) {
  assert(
    positiveClaimGate.localFailClosedVerifierAdapterSeamHarnessRef?.[field] === false,
    `local seam harness ${field} must remain false`,
  );
}
assert(
  positiveClaimGate.localFailClosedVerifierAdapterSeamHarnessRef?.onChainVerifierCpiHookExists === true,
  "local seam harness must continue to prove the on-chain verifier CPI hook exists",
);
assert(
  positiveClaimGate.localFailClosedVerifierAdapterSeamHarnessRef?.hostCpiStubCannotAcceptProof === true,
  "local seam harness must keep host CPI stubs non-accepting",
);

assert(
  externalHandoff.status === "operator-skipped-external-artifact-producer",
  "external handoff must be operator-skipped for external artifact producer",
);
assertBlockers(externalHandoff, "external handoff", [
  "no reviewed production artifact bundle",
  "no production verifier-adapter acceptance",
  "no production valid mutation or invalid/wrong-input/wrong-key/wrong-program no-mutation refs",
  "no deployed verifier program id/hash",
  "no verifier-key record binding production VK hash to verifier program id",
  "no SBF/live lineage acceptance",
  "no composite C01 verifier evidence closure validation",
]);
assert(
  !externalHandoff.remainingBlockers.includes("no external source-review acceptance"),
  "Reilabs/external producer wait must be operator-skipped",
);
assert(
  !externalHandoff.remainingBlockers.includes("no audit/reviewer acceptance"),
  "audit wait must be operator-skipped",
);
for (const marker of [
  "VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-refs-only-json> npm run zk:c01-production-artifact-acceptance-gate-check",
  "VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-audit-reviewer-acceptance-gate-check",
  "verifier-key record binding production VK hash to verifier program id",
  "Do not wire `TAG_SPEND_WITH_PROOF` mutation",
]) {
  includes(humanHandoff, marker, humanHandoffPath);
}

for (const marker of [
  "const TAG_SPEND_WITH_PROOF: u8 = 3;",
  "const TAG_REGISTER_VERIFIER_KEY: u8 = 5;",
  "const SPEND_WITH_PROOF_GNARK_PROOF_LEN: usize = 324;",
  "const SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN: usize = 44;",
  "const SPEND_WITH_PROOF_VERIFIER_INPUT_LEN: usize",
  "const SPEND_WITH_PROOF_VERIFIER_PROGRAM_ACCOUNT_INDEX: usize = 8;",
  "const ERR_PROOF_VERIFIER_NOT_WIRED: u32 = 14;",
  "GNARK_PUBLIC_WITNESS_ONE_PUBLIC_INPUT_HEADER",
  "fn preflight_spend_with_proof",
  "fn verify_spend_with_proof_adapter",
  "fn spend_with_proof_verifier_cpi_instruction",
  "fn commit_verified_spend_from_spend_with_proof_accounts",
]) {
  includes(program, marker, programPath);
}
assertOrdered(program, "process_spend_with_proof", [
  "let verified = preflight_spend_with_proof(program_id, accounts, rest)?;",
  "verify_spend_with_proof_adapter(&verified, verifier_program)?;",
  "commit_verified_spend_from_spend_with_proof_accounts(program_id, accounts, &verified)",
]);
includes(program, "require_spend_with_proof_public_witness_binding(verified)?;", programPath);
assert(
  /require_verifier_key_hash_for_program\([\s\S]*verifier_program\.key[\s\S]*\)\?;/u.test(program),
  "tag-3 preflight must bind verifier key hash to verifier program id",
);
includes(program, "if verifier_program.is_writable || verifier_program.is_signer", programPath);
includes(program, "if verifier_program.key == program_id || !verifier_program.executable", programPath);
includes(program, "invoke_signed(&verifier_cpi_instruction, &[verifier_program.clone()], &[])?;", programPath);
includes(program, "Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))", programPath);
assertOrdered(program, "spend_with_proof_verifier_cpi_instruction", [
  "fn spend_with_proof_verifier_cpi_instruction(verified: &VerifiedSpendPreflight) -> Instruction {",
  "program_id: verified.verifier_program_id,",
  "accounts: Vec::new(),",
  "data: verified.verifier_instruction_data().to_vec(),",
]);

console.log("private-pool-v2 Groth16 verifier CPI check: PASS");
console.log(
  "status=blocked-fail-closed selectedBackend=groth16-tag3-solana-v0 proofVerifiedClaimAllowed=false c01VerifierReady=false",
);

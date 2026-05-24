import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const gatePath =
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json";
const templatePath =
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance.template.json";
const sourceReviewPath =
  "ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json";
const sourceMigrationPath =
  "ops/mainnet/private-pool-v2-c01-beta18-source-migration-candidate.evidence.json";
const productionGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const runbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const acceptanceEnvVar = "VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH";
const candidateSourceRef =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry_sunspot_beta18_h6_candidate/src/main.nr";
const candidateSourceSha256 =
  "sha256:caaeb2c2767965bd5d6c68c3043b8be10b43b345f017e32c6aa67658e927d430";
const currentSourceRef = "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/src/main.nr";
const currentSourceSha256 =
  "sha256:363d7dffa7ba03698a8bdbe2d48a6f13cf32ddeb7326fb997ff9cff63db8bf96";

function fail(message) {
  console.error(`private-pool-v2 C01 beta18 H6 source-review acceptance gate: FAIL - ${message}`);
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
  return JSON.parse(read(path));
}

const forbiddenExternalMaterialMarkers = [
  "proofBytes",
  "proofHex",
  "verifyingKeyBytes",
  "verifying_key_bytes",
  "vkBytes",
  "witnessBytes",
  "provingKeyBytes",
  "keypairBytes",
  "privateKey",
  "secretKey",
  "signedTransactionBytes",
  "-----BEGIN",
  "bearer ",
  "postgres://",
  "postgresql://",
];

function assertNoForbiddenExternalMaterial(source, label) {
  for (const marker of forbiddenExternalMaterialMarkers) {
    assert(!source.includes(marker), `${label} must not contain forbidden marker ${marker}`);
  }
}

function readJsonPath(path, label) {
  const resolved = path.startsWith("/") ? path : resolve(repoRoot, path);
  assert(existsSync(resolved), `${label} missing at ${path}`);
  const source = readFileSync(resolved, "utf8");
  assertNoForbiddenExternalMaterial(source, label);
  return JSON.parse(source);
}

function includes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

function assertAllowedKeys(value, label, allowedKeys) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    assert(allowed.has(key), `${label} has unexpected key ${key}`);
  }
  for (const key of allowedKeys) {
    assert(Object.hasOwn(value, key), `${label} missing key ${key}`);
  }
}

function assertStringArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  for (const [index, entry] of value.entries()) {
    assert(typeof entry === "string", `${label}[${index}] must be a string`);
  }
}

function assertNullRefs(value, label, fields) {
  for (const field of fields) {
    assert(value[field] === null, `${label}.${field} must stay null`);
  }
}

function assertRef(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty ref`);
  assert(!value.includes("://"), `${label} must be a refs-only local/review handle, not a URL`);
  assert(!value.includes("-----BEGIN"), `${label} must not contain key material`);
}

function assertEvidenceFlags(value, expected, label) {
  assertAllowedKeys(value, label, Object.keys(expected));
  for (const [field, expectedValue] of Object.entries(expected)) {
    assert(value[field] === expectedValue, `${label}.${field} mismatch`);
  }
}

function assertTemplate(template) {
  assertAllowedKeys(template, "source-review acceptance template", [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "purpose",
    "candidate",
    "reviewerAcceptance",
    "sourceFindings",
    "downstreamRequired",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(
    template.version === "vanta-private-pool-v2-c01-beta18-h6-source-review-acceptance-template-0.1",
    "template version mismatch",
  );
  assert(template.status === "template-not-review-acceptance", "template status mismatch");
  assert(template.selectedBackend === gate.selectedBackend, "template selected backend mismatch");
  assert(template.routeId === gate.routeId, "template route mismatch");
  assert(template.secretPolicy === gate.secretPolicy, "template secret policy mismatch");
  assert(template.candidate?.sourceReviewPacketRef === sourceReviewPath, "template source-review packet ref mismatch");
  assert(template.candidate?.candidateSourceRef === candidateSourceRef, "template candidate source ref mismatch");
  assert(template.candidate?.candidateSourceSha256 === candidateSourceSha256, "template candidate source hash mismatch");
  assert(template.candidate?.currentSourceRef === currentSourceRef, "template current source ref mismatch");
  assert(template.candidate?.currentSourceSha256 === currentSourceSha256, "template current source hash mismatch");
  assert(template.candidate?.compatibilityDelta === "poseidon-import-path-only", "template delta mismatch");
  assert(template.reviewerAcceptance?.reviewerAcceptedSourceMigration === false, "template must not claim review acceptance");
  assertNullRefs(template.reviewerAcceptance, "template reviewer acceptance", [
    "acceptanceRef",
    "reviewerRef",
    "reviewerRole",
    "acceptedAt",
  ]);
  for (const [field, expected] of [
    ["normalizedSourceMatchesCurrent", true],
    ["importPathOnlyDelta", true],
    ["h6SemanticsPreserved", true],
    ["proverFixtureMatchesCurrent", true],
    ["beta18NargoCheckObserved", true],
    ["noRawSecretsOrWitnessMaterial", true],
  ]) {
    assert(template.sourceFindings?.[field] === expected, `template sourceFindings.${field} mismatch`);
  }
  assertNullRefs(template.downstreamRequired, "template downstream required", [
    "toolchainReviewRef",
    "trustedSetupOrMitigationRef",
    "deterministicArtifactBuildRef",
    "productionBundleRef",
    "adapterAcceptanceRef",
    "sbfLiveLineageRef",
    "auditReviewerAcceptanceRef",
  ]);
  assertEvidenceFlags(
    template.satisfiesRequiredPositiveEvidence,
    {
      sourceReviewAcceptance: false,
      reviewedSourceMigration: false,
      productionSourceLineage: false,
      actualPrivateSpendProductionProofFormat: false,
      privateSpendPublicInputHashBinding: false,
      productionVerifyingKeyHash: false,
      verifierAdapter: false,
      acceptedProofMutatesStateTest: false,
      invalidProofLeavesAccountsUnchangedTest: false,
      wrongPublicInputHashLeavesAccountsUnchangedTest: false,
      wrongVerifyingKeyLeavesAccountsUnchangedTest: false,
      sbfLiveLineage: false,
      auditReviewerAcceptance: false,
    },
    "template evidence flags",
  );
  includes(template.truthBoundary ?? "", "not reviewer acceptance", "template truth boundary");
  includes(template.truthBoundary ?? "", "does not close C01", "template truth boundary");
}

function assertAcceptedSourceReview(acceptance, label) {
  assertAllowedKeys(acceptance, label, [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "candidate",
    "reviewerAcceptance",
    "sourceFindings",
    "downstreamRequired",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(
    acceptance.version === "vanta-private-pool-v2-c01-beta18-h6-source-review-acceptance-0.1",
    `${label} version mismatch`,
  );
  assert(acceptance.status === "external-source-review-accepted-candidate", `${label} status mismatch`);
  assert(acceptance.selectedBackend === gate.selectedBackend, `${label} selected backend mismatch`);
  assert(acceptance.routeId === gate.routeId, `${label} route mismatch`);
  assert(acceptance.secretPolicy === gate.secretPolicy, `${label} secret policy mismatch`);

  const candidate = acceptance.candidate ?? {};
  assert(candidate.sourceReviewPacketRef === sourceReviewPath, `${label} source-review packet ref mismatch`);
  assert(candidate.candidateSourceRef === candidateSourceRef, `${label} candidate source ref mismatch`);
  assert(candidate.candidateSourceSha256 === candidateSourceSha256, `${label} candidate source hash mismatch`);
  assert(candidate.currentSourceRef === currentSourceRef, `${label} current source ref mismatch`);
  assert(candidate.currentSourceSha256 === currentSourceSha256, `${label} current source hash mismatch`);
  assert(candidate.compatibilityDelta === "poseidon-import-path-only", `${label} compatibility delta mismatch`);
  assert(candidate.localValidationCommand === "noirup -v 1.0.0-beta.18 && nargo check", `${label} validation command mismatch`);

  const reviewer = acceptance.reviewerAcceptance ?? {};
  assertRef(reviewer.acceptanceRef, `${label} acceptance ref`);
  assertRef(reviewer.reviewerRef, `${label} reviewer ref`);
  assertRef(reviewer.reviewerRole, `${label} reviewer role`);
  assertRef(reviewer.acceptedAt, `${label} acceptedAt ref`);
  assert(reviewer.scope === "source-migration-only", `${label} scope mismatch`);
  assert(reviewer.reviewerAcceptedSourceMigration === true, `${label} reviewer acceptance must be true`);

  for (const [field, expected] of [
    ["normalizedSourceMatchesCurrent", true],
    ["importPathOnlyDelta", true],
    ["h6SemanticsPreserved", true],
    ["proverFixtureMatchesCurrent", true],
    ["beta18NargoCheckObserved", true],
    ["noRawSecretsOrWitnessMaterial", true],
  ]) {
    assert(acceptance.sourceFindings?.[field] === expected, `${label} sourceFindings.${field} mismatch`);
  }
  for (const field of [
    "toolchainReviewRef",
    "trustedSetupOrMitigationRef",
    "deterministicArtifactBuildRef",
    "productionBundleRef",
    "adapterAcceptanceRef",
    "sbfLiveLineageRef",
    "auditReviewerAcceptanceRef",
  ]) {
    assertRef(acceptance.downstreamRequired?.[field], `${label} downstreamRequired.${field}`);
  }
  assertEvidenceFlags(
    acceptance.satisfiesRequiredPositiveEvidence,
    {
      sourceReviewAcceptance: true,
      reviewedSourceMigration: true,
      productionSourceLineage: false,
      actualPrivateSpendProductionProofFormat: false,
      privateSpendPublicInputHashBinding: false,
      productionVerifyingKeyHash: false,
      verifierAdapter: false,
      acceptedProofMutatesStateTest: false,
      invalidProofLeavesAccountsUnchangedTest: false,
      wrongPublicInputHashLeavesAccountsUnchangedTest: false,
      wrongVerifyingKeyLeavesAccountsUnchangedTest: false,
      sbfLiveLineage: false,
      auditReviewerAcceptance: false,
    },
    `${label} evidence flags`,
  );
  includes(acceptance.truthBoundary ?? "", "external source-review acceptance", `${label} truth boundary`);
  includes(acceptance.truthBoundary ?? "", "not production source lineage", `${label} truth boundary`);
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const gateText = read(gatePath);
const gate = JSON.parse(gateText);
const template = readJson(templatePath);
const sourceReview = readJson(sourceReviewPath);
const sourceMigration = readJson(sourceMigrationPath);
const productionGate = readJson(productionGatePath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);
const runbook = read(runbookPath);
const review = read(reviewPath);

assert(
  scripts["zk:c01-beta18-h6-source-review-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.mjs",
  "package.json must expose zk:c01-beta18-h6-source-review-acceptance-gate-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-beta18-h6-source-review-acceptance-gate-check"),
    `${aggregate} must include the source-review acceptance gate`,
  );
}

for (const forbidden of [
  "proofBytes",
  "proofHex",
  "verifyingKeyBytes",
  "vkBytes",
  "witnessBytes",
  "provingKeyBytes",
  "keypairBytes",
  "signedTransactionBytes",
  "-----BEGIN",
  "bearer ",
  "postgres://",
  "postgresql://",
]) {
  assert(!gateText.includes(forbidden), `gate must not contain forbidden marker ${forbidden}`);
}

assertAllowedKeys(gate, "source-review acceptance gate", [
  "version",
  "checkedAt",
  "status",
  "selectedBackend",
  "selectedBackendStatus",
  "routeId",
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "sourceReviewAcceptanceReady",
  "reviewedSourceMigration",
  "productionSourceLineage",
  "secretPolicy",
  "purpose",
  "sourceReviewCandidateRef",
  "sourceReviewAcceptanceTemplateRef",
  "sourceMigrationCandidateRef",
  "productionArtifactAcceptanceGateRef",
  "decisionPacketRef",
  "requiredAcceptanceShape",
  "currentAcceptedSourceReview",
  "externalSourceReviewValidation",
  "promotionRules",
  "satisfiesRequiredPositiveEvidence",
  "remainingBlockers",
  "canonicalCommands",
  "truthBoundary",
]);
assert(gate.version === "vanta-private-pool-v2-c01-beta18-h6-source-review-acceptance-gate-0.1", "gate version mismatch");
assert(gate.status === "blocked-no-external-source-review-acceptance", "gate status mismatch");
assert(gate.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(gate.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(gate.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "sourceReviewAcceptanceReady",
  "reviewedSourceMigration",
  "productionSourceLineage",
]) {
  assert(gate[field] === false, `${field} must remain false`);
}
assert(
  gate.secretPolicy === "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-or-signed-transaction-bytes",
  "secret policy mismatch",
);
assert(gate.sourceReviewCandidateRef === sourceReviewPath, "source-review candidate ref mismatch");
assert(gate.sourceReviewAcceptanceTemplateRef === templatePath, "template ref mismatch");
assert(gate.sourceMigrationCandidateRef === sourceMigrationPath, "source-migration ref mismatch");
assert(gate.productionArtifactAcceptanceGateRef === productionGatePath, "production gate ref mismatch");
assert(gate.decisionPacketRef === decisionPath, "decision ref mismatch");
assert(sourceReview.sourceReviewAcceptanceGateRef === gatePath, "source-review packet must reference this gate");
assert(productionGate.sourceReviewAcceptanceGateRef === gatePath, "production gate must reference source-review acceptance gate");
assert(sourceMigration.beta18H6SourceMigrationReviewCandidateRef === sourceReviewPath, "source-migration packet ref mismatch");

const shape = gate.requiredAcceptanceShape ?? {};
assert(shape.candidateSourceRef === candidateSourceRef, "shape candidate source ref mismatch");
assert(shape.candidateSourceSha256 === candidateSourceSha256, "shape candidate source hash mismatch");
assert(shape.currentSourceRef === currentSourceRef, "shape current source ref mismatch");
assert(shape.currentSourceSha256 === currentSourceSha256, "shape current source hash mismatch");
assert(shape.compatibilityDelta === "poseidon-import-path-only", "shape delta mismatch");
assert(shape.status === "required-before-production-source-lineage", "shape status mismatch");
assertStringArray(shape.requiredConclusions, "shape required conclusions");
for (const conclusion of [
  "normalized source equals current H6 source after Poseidon import-path normalization",
  "H6 context preimage fields and Poseidon6 assertion are preserved",
  "Prover.toml fixture matches current H6 source fixture",
  "beta18 nargo check was reviewed",
  "source review did not inspect or require raw witness, proof, VK, PK, keypair, secret, or signed transaction bytes",
]) {
  assert(shape.requiredConclusions.includes(conclusion), `missing required conclusion ${conclusion}`);
}

const accepted = gate.currentAcceptedSourceReview ?? {};
assert(accepted.status === "absent", "accepted source review must be absent");
assertNullRefs(accepted, "accepted source review", [
  "acceptanceRef",
  "reviewerRef",
  "sourceReviewAcceptanceRef",
  "reviewedSourceMigrationRef",
]);
assert(accepted.satisfiesSourceReviewAcceptance === false, "source-review acceptance must remain false");
assert(accepted.satisfiesReviewedSourceMigration === false, "reviewed source migration must remain false");
assert(accepted.satisfiesProductionSourceLineage === false, "production source lineage must remain false");

const external = gate.externalSourceReviewValidation ?? {};
assert(external.status === "ready-for-reviewed-refs-only-source-review-validation", "external validation status mismatch");
assert(external.envVar === acceptanceEnvVar, "external validation env var mismatch");
assert(external.templateRef === templatePath, "external validation template ref mismatch");
assert(
  external.command ===
    "VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
  "external validation command mismatch",
);
assert(external.defaultGuardRequiresExternalAcceptance === false, "external acceptance must be optional by default");
assert(external.validatedWhenEnvVarPresent === true, "external acceptance must validate when env var is present");
assertStringArray(external.validates, "external validation validates");
for (const marker of [
  "external reviewer acceptance ref",
  "candidate source hash",
  "current source hash",
  "poseidon-import-path-only delta",
  "H6 context preimage and Poseidon6 preservation",
  "beta18 nargo check review",
  "refs-only secret policy",
  "no raw proof/VK/witness/key/secret/transaction material in env-supplied JSON",
  "downstream production blockers remain separate",
]) {
  assert(external.validates.includes(marker), `external validation missing ${marker}`);
}
assert(external.satisfiesSourceReviewAcceptance === false, "external validation must not satisfy acceptance by itself");
for (const marker of [
  "external source-review acceptance intake executable",
  "does not supply acceptance",
  "accepted source-review refs null",
]) {
  includes(external.truthBoundary ?? "", marker, "external validation truth boundary");
}
assertTemplate(template);

assertStringArray(gate.promotionRules, "promotionRules");
for (const rule of [
  "source-review acceptance refs must be references only; raw proof, verifying-key, proving-key, witness, keypair, secret, and signed transaction bytes stay out of git",
  "source-review acceptance can cover only the beta18 H6 source migration delta, not production setup, proof-format, VK, adapter, mutation/no-mutation, SBF/live-lineage, or audit evidence",
  "production artifact acceptance must require a sourceReviewAcceptanceRef before it can promote a beta18 source-migration bundle",
  "reviewed source migration is a prerequisite to production source lineage but does not by itself close C01",
]) {
  assert(gate.promotionRules.includes(rule), `missing promotion rule ${rule}`);
}
assertEvidenceFlags(
  gate.satisfiesRequiredPositiveEvidence,
  {
    backendSelection: true,
    reviewableSourceMigrationCandidate: true,
    sourceReviewAcceptance: false,
    reviewedSourceMigration: false,
    productionSourceLineage: false,
    actualPrivateSpendProductionProofFormat: false,
    privateSpendPublicInputHashBinding: false,
    productionVerifyingKeyHash: false,
    verifierAdapter: false,
    acceptedProofMutatesStateTest: false,
    invalidProofLeavesAccountsUnchangedTest: false,
    wrongPublicInputHashLeavesAccountsUnchangedTest: false,
    wrongVerifyingKeyLeavesAccountsUnchangedTest: false,
    sbfLiveLineage: false,
    auditReviewerAcceptance: false,
  },
  "gate evidence flags",
);
assertStringArray(gate.remainingBlockers, "remainingBlockers");
for (const blocker of [
  "no external source reviewer acceptance",
  "no production setup or toxic-waste mitigation",
  "no reviewed production artifact bundle accepted",
  "no audit/reviewer acceptance",
]) {
  assert(gate.remainingBlockers.includes(blocker), `missing blocker ${blocker}`);
}
assertStringArray(gate.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
  "VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
  "npm run zk:c01-beta18-h6-source-migration-review-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
]) {
  assert(gate.canonicalCommands.includes(command), `missing canonical command ${command}`);
}
for (const marker of [
  "blocked external source-review acceptance gate",
  "not reviewer acceptance",
  "not production source lineage",
  "not production proof-format evidence",
  "not C01 closure",
]) {
  includes(gate.truthBoundary ?? "", marker, "gate truth boundary");
}

for (const marker of [
  "C01 beta18 H6 source-review acceptance gate",
  gatePath,
  templatePath,
  "npm run zk:c01-beta18-h6-source-review-acceptance-gate-check",
  "VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-refs-only-json>",
  "blocked-no-external-source-review-acceptance",
]) {
  includes(decision, marker, decisionPath);
  includes(auditPackage, marker, auditPackagePath);
  includes(runbook, marker, runbookPath);
  includes(review, marker, reviewPath);
}

const externalAcceptancePath = process.env[acceptanceEnvVar];
if (externalAcceptancePath) {
  const externalAcceptance = readJsonPath(externalAcceptancePath, "external source-review acceptance");
  assertAcceptedSourceReview(externalAcceptance, "external source-review acceptance");
}

console.log("private-pool-v2 C01 beta18 H6 source-review acceptance gate: PASS");

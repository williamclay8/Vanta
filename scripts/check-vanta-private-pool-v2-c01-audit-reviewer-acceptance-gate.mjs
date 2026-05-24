import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const gatePath = "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json";
const templatePath = "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const productionGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const adapterAcceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json";
const sbfLiveLineagePath = "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json";
const sbfLiveLineageAcceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json";
const positiveClaimGatePath = "ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json";
const productionBundleTemplatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const runbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const acceptanceEnvVar = "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH";
const currentH6PublicInputValue =
  "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b";
const currentH6PublicInputCommitment =
  "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2";

function fail(message) {
  console.error(`private-pool-v2 C01 audit/reviewer acceptance gate: FAIL - ${message}`);
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

function mapById(entries, label) {
  assert(Array.isArray(entries), `${label} must be an array`);
  const map = new Map();
  for (const entry of entries) {
    assert(typeof entry?.id === "string", `${label} entry missing id`);
    assert(!map.has(entry.id), `${label} has duplicate id ${entry.id}`);
    map.set(entry.id, entry);
  }
  return map;
}

function assertNullRefs(value, label, fields) {
  for (const field of fields) {
    assert(value[field] === null, `${label}.${field} must stay null`);
  }
}

function assertRef(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty ref`);
  assert(value === value.trim(), `${label} must not have surrounding whitespace`);
  assert(!value.includes("://"), `${label} must be a refs-only local/review handle, not a URL`);
  assert(!value.includes("-----BEGIN"), `${label} must not contain key material`);
}

function assertDistinctRefs(value, label, fields) {
  const seen = new Map();
  for (const field of fields) {
    const ref = value[field];
    assertRef(ref, `${label}.${field}`);
    const normalizedRef = ref.trim();
    assert(!seen.has(normalizedRef), `${label}.${field} must be distinct from ${label}.${seen.get(normalizedRef)}`);
    seen.set(normalizedRef, field);
  }
}

function assertSha256(value, label) {
  assert(typeof value === "string", `${label} must be a sha256 string`);
  assert(/^sha256:[0-9a-f]{64}$/u.test(value), `${label} must be sha256:<64 lowercase hex>`);
}

function assertEvidenceFlags(value, expected, label) {
  assertAllowedKeys(value, label, Object.keys(expected));
  for (const [field, expectedValue] of Object.entries(expected)) {
    assert(value[field] === expectedValue, `${label}.${field} mismatch`);
  }
}

function assertTemplate(template) {
  assertAllowedKeys(template, "audit/reviewer acceptance template", [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "purpose",
    "prerequisites",
    "auditReview",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(
    template.version === "vanta-private-pool-v2-c01-audit-reviewer-acceptance-template-0.1",
    "template version mismatch",
  );
  assert(template.status === "template-not-audit-reviewer-acceptance", "template status mismatch");
  assert(template.selectedBackend === gate.selectedBackend, "template selected backend mismatch");
  assert(template.routeId === gate.routeId, "template route mismatch");
  assert(template.secretPolicy === gate.secretPolicy, "template secret policy mismatch");

  assertAllowedKeys(template.prerequisites, "template prerequisites", [
    "productionArtifactBundleRef",
    "productionArtifactAcceptanceGateRef",
    "verifierAdapterAcceptanceRef",
    "verifierAdapterAcceptanceGateRef",
    "sbfLiveLineageRef",
    "sbfLiveLineageCandidateRef",
    "sbfLiveLineageAcceptanceGateRef",
    "positiveProofVerifiedClaimGateRef",
    "productionProofFormatArtifactRef",
    "productionVerifyingKeyArtifactRef",
    "productionVerifyingKeyHash",
    "verifyingKeyHashKind",
    "currentH6PublicInputBindingRef",
    "validProofMutationTestRef",
    "invalidProofNoMutationTestRef",
    "wrongPublicInputNoMutationTestRef",
    "wrongVerifyingKeyNoMutationTestRef",
  ]);
  assertNullRefs(template.prerequisites, "template prerequisites", [
    "productionArtifactBundleRef",
    "verifierAdapterAcceptanceRef",
    "sbfLiveLineageRef",
    "productionProofFormatArtifactRef",
    "productionVerifyingKeyArtifactRef",
    "productionVerifyingKeyHash",
    "currentH6PublicInputBindingRef",
    "validProofMutationTestRef",
    "invalidProofNoMutationTestRef",
    "wrongPublicInputNoMutationTestRef",
    "wrongVerifyingKeyNoMutationTestRef",
  ]);
  for (const [field, expected] of [
    ["productionArtifactAcceptanceGateRef", productionGatePath],
    ["verifierAdapterAcceptanceGateRef", adapterAcceptanceGatePath],
    ["sbfLiveLineageCandidateRef", sbfLiveLineagePath],
    ["sbfLiveLineageAcceptanceGateRef", sbfLiveLineageAcceptanceGatePath],
    ["positiveProofVerifiedClaimGateRef", positiveClaimGatePath],
    ["verifyingKeyHashKind", shape.verifyingKeyHashKind],
  ]) {
    assert(template.prerequisites?.[field] === expected, `template prerequisites.${field} mismatch`);
  }

  assertAllowedKeys(template.auditReview, "template audit review", [
    "auditReviewerAcceptanceRef",
    "reviewerIdentityRef",
    "auditScopeRef",
    "findingsDispositionRef",
    "acceptanceKind",
    "reviewerAccepted",
    "acceptedForC01",
    "satisfiesAuditReviewerAcceptance",
  ]);
  assertNullRefs(template.auditReview, "template audit review", [
    "auditReviewerAcceptanceRef",
    "reviewerIdentityRef",
    "auditScopeRef",
    "findingsDispositionRef",
  ]);
  assert(template.auditReview?.acceptanceKind === "audit-or-reviewer-acceptance", "template acceptance kind mismatch");
  assert(template.auditReview?.reviewerAccepted === false, "template reviewerAccepted must stay false");
  assert(template.auditReview?.acceptedForC01 === false, "template acceptedForC01 must stay false");
  assert(
    template.auditReview?.satisfiesAuditReviewerAcceptance === false,
    "template must not claim audit/reviewer acceptance",
  );
  assertEvidenceFlags(
    template.satisfiesRequiredPositiveEvidence,
    {
      productionArtifactAcceptance: false,
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
  includes(template.truthBoundary ?? "", "not audit/reviewer acceptance", "template truth boundary");
  includes(template.truthBoundary ?? "", "does not close C01", "template truth boundary");
}

function assertReviewedAuditAcceptance(acceptance, label) {
  assertAllowedKeys(acceptance, label, [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "prerequisites",
    "auditReview",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(
    acceptance.version === "vanta-private-pool-v2-c01-audit-reviewer-acceptance-0.1",
    `${label} version mismatch`,
  );
  assert(acceptance.status === "reviewed-audit-reviewer-acceptance-candidate", `${label} status mismatch`);
  assert(acceptance.selectedBackend === gate.selectedBackend, `${label} selected backend mismatch`);
  assert(acceptance.routeId === gate.routeId, `${label} route mismatch`);
  assert(acceptance.secretPolicy === gate.secretPolicy, `${label} secret policy mismatch`);

  const prerequisites = acceptance.prerequisites ?? {};
  for (const field of [
    "productionArtifactBundleRef",
    "verifierAdapterAcceptanceRef",
    "sbfLiveLineageRef",
    "productionProofFormatArtifactRef",
    "productionVerifyingKeyArtifactRef",
    "currentH6PublicInputBindingRef",
    "validProofMutationTestRef",
    "invalidProofNoMutationTestRef",
    "wrongPublicInputNoMutationTestRef",
    "wrongVerifyingKeyNoMutationTestRef",
  ]) {
    assertRef(prerequisites[field], `${label} prerequisites.${field}`);
  }
  assert(prerequisites.productionArtifactAcceptanceGateRef === productionGatePath, `${label} production gate ref mismatch`);
  assert(
    prerequisites.verifierAdapterAcceptanceGateRef === adapterAcceptanceGatePath,
    `${label} adapter acceptance gate ref mismatch`,
  );
  assert(prerequisites.sbfLiveLineageCandidateRef === sbfLiveLineagePath, `${label} SBF/live gate ref mismatch`);
  assert(
    prerequisites.sbfLiveLineageAcceptanceGateRef === sbfLiveLineageAcceptanceGatePath,
    `${label} SBF/live acceptance gate ref mismatch`,
  );
  assert(
    prerequisites.positiveProofVerifiedClaimGateRef === positiveClaimGatePath,
    `${label} positive claim gate ref mismatch`,
  );
  assertSha256(prerequisites.productionVerifyingKeyHash, `${label} production VK hash`);
  assert(prerequisites.verifyingKeyHashKind === shape.verifyingKeyHashKind, `${label} VK hash kind mismatch`);
  assertDistinctRefs(prerequisites, `${label} prerequisites`, [
    "validProofMutationTestRef",
    "invalidProofNoMutationTestRef",
    "wrongPublicInputNoMutationTestRef",
    "wrongVerifyingKeyNoMutationTestRef",
  ]);

  const auditReview = acceptance.auditReview ?? {};
  for (const field of [
    "auditReviewerAcceptanceRef",
    "reviewerIdentityRef",
    "auditScopeRef",
    "findingsDispositionRef",
  ]) {
    assertRef(auditReview[field], `${label} auditReview.${field}`);
  }
  assert(auditReview.acceptanceKind === "audit-or-reviewer-acceptance", `${label} acceptance kind mismatch`);
  assert(auditReview.reviewerAccepted === true, `${label} reviewerAccepted must be true`);
  assert(auditReview.acceptedForC01 === true, `${label} acceptedForC01 must be true`);
  assert(
    auditReview.satisfiesAuditReviewerAcceptance === true,
    `${label} must satisfy audit/reviewer acceptance`,
  );
  assertEvidenceFlags(
    acceptance.satisfiesRequiredPositiveEvidence,
    {
      productionArtifactAcceptance: true,
      actualPrivateSpendProductionProofFormat: true,
      privateSpendPublicInputHashBinding: true,
      productionVerifyingKeyHash: true,
      verifierAdapter: true,
      acceptedProofMutatesStateTest: true,
      invalidProofLeavesAccountsUnchangedTest: true,
      wrongPublicInputHashLeavesAccountsUnchangedTest: true,
      wrongVerifyingKeyLeavesAccountsUnchangedTest: true,
      sbfLiveLineage: true,
      auditReviewerAcceptance: true,
    },
    `${label} evidence flags`,
  );
  includes(acceptance.truthBoundary ?? "", "reviewed audit/reviewer acceptance", `${label} truth boundary`);
  includes(acceptance.truthBoundary ?? "", "refs-only", `${label} truth boundary`);
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const gateText = read(gatePath);
const gate = JSON.parse(gateText);
const template = readJson(templatePath);
const candidate = readJson(candidatePath);
const productionGate = readJson(productionGatePath);
const adapterAcceptanceGate = readJson(adapterAcceptanceGatePath);
const sbfLiveLineage = readJson(sbfLiveLineagePath);
const sbfLiveLineageAcceptanceGate = readJson(sbfLiveLineageAcceptanceGatePath);
const positiveClaimGate = readJson(positiveClaimGatePath);
const productionBundleTemplate = readJson(productionBundleTemplatePath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);
const runbook = read(runbookPath);
const review = read(reviewPath);

assert(
  scripts["zk:c01-audit-reviewer-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-audit-reviewer-acceptance-gate.mjs",
  "package.json must expose zk:c01-audit-reviewer-acceptance-gate-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-audit-reviewer-acceptance-gate-check"),
    `${aggregate} must include the C01 audit/reviewer acceptance gate`,
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

assertAllowedKeys(gate, "audit/reviewer acceptance gate", [
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
  "auditReviewerAcceptanceReady",
  "secretPolicy",
  "purpose",
  "candidatePacketRef",
  "productionArtifactAcceptanceGateRef",
  "verifierAdapterAcceptanceGateRef",
  "sbfLiveLineageCandidateRef",
  "sbfLiveLineageAcceptanceGateRef",
  "positiveProofVerifiedClaimGateRef",
  "auditReviewerAcceptanceTemplateRef",
  "productionArtifactBundleTemplateRef",
  "decisionPacketRef",
  "requiredAcceptanceShape",
  "currentAcceptedAuditReviewerAcceptance",
  "externalAuditReviewerAcceptanceValidation",
  "acceptanceCriteria",
  "promotionRules",
  "satisfiesRequiredPositiveEvidence",
  "remainingBlockers",
  "canonicalCommands",
  "truthBoundary",
]);
assert(gate.version === "vanta-private-pool-v2-c01-audit-reviewer-acceptance-gate-0.1", "gate version mismatch");
assert(gate.status === "blocked-no-audit-reviewer-acceptance", "gate status mismatch");
assert(gate.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(gate.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(gate.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "auditReviewerAcceptanceReady",
]) {
  assert(gate[field] === false, `${field} must remain false`);
}
assert(gate.secretPolicy === "refs-only-no-raw-proof-vk-witness-pk-keypair-secret-or-signed-transaction-bytes", "secret policy mismatch");
for (const [field, expected] of [
  ["candidatePacketRef", candidatePath],
  ["productionArtifactAcceptanceGateRef", productionGatePath],
  ["verifierAdapterAcceptanceGateRef", adapterAcceptanceGatePath],
  ["sbfLiveLineageCandidateRef", sbfLiveLineagePath],
  ["sbfLiveLineageAcceptanceGateRef", sbfLiveLineageAcceptanceGatePath],
  ["positiveProofVerifiedClaimGateRef", positiveClaimGatePath],
  ["auditReviewerAcceptanceTemplateRef", templatePath],
  ["productionArtifactBundleTemplateRef", productionBundleTemplatePath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(gate[field] === expected, `${field} mismatch`);
}
assert(candidate.selectedBackend === gate.selectedBackend, "candidate selected backend mismatch");
assert(productionGate.status === "blocked-no-reviewed-production-artifact-bundle", "production gate status mismatch");
assert(
  adapterAcceptanceGate.status === "blocked-no-production-verifier-adapter-acceptance",
  "adapter acceptance gate status mismatch",
);
assert(
  sbfLiveLineage.status === "blocked-no-rebuilt-redeployed-reinitialized-live-lineage",
  "SBF/live lineage status mismatch",
);
assert(
  sbfLiveLineageAcceptanceGate.status === "blocked-no-sbf-live-lineage-acceptance",
  "SBF/live lineage acceptance gate status mismatch",
);
assert(positiveClaimGate.status === "blocked-no-tag3-valid-proof-success", "positive claim gate status mismatch");

const shape = gate.requiredAcceptanceShape ?? {};
assertAllowedKeys(shape, "required acceptance shape", [
  "target",
  "tag",
  "circuit",
  "proofSystem",
  "routeId",
  "proofFormatId",
  "proofByteLength",
  "publicWitnessByteLength",
  "verifierInstructionDataByteLength",
  "publicInputLabel",
  "requiredPublicInputValue",
  "requiredPublicInputCommitment",
  "verifyingKeyHashKind",
  "requiredPrerequisites",
  "status",
]);
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["routeId", gate.routeId],
  ["proofFormatId", "gnark-solana-native-proof-and-public-witness-v0"],
  ["proofByteLength", 324],
  ["publicWitnessByteLength", 44],
  ["verifierInstructionDataByteLength", 368],
  ["publicInputLabel", "private-spend-public-input-hash"],
  ["requiredPublicInputValue", currentH6PublicInputValue],
  ["requiredPublicInputCommitment", currentH6PublicInputCommitment],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["status", "required-before-audit-reviewer-acceptance"],
]) {
  assert(shape[field] === expected, `required acceptance shape ${field} mismatch`);
}
assertStringArray(shape.requiredPrerequisites, "required acceptance prerequisites");
for (const marker of [
  "reviewed production artifact bundle",
  "production verifier-adapter acceptance",
  "wrong-verifying-key no-mutation evidence",
  "SBF/live lineage evidence",
  "reviewed SBF/live lineage acceptance",
  "audit/reviewer acceptance ref",
]) {
  assert(shape.requiredPrerequisites.includes(marker), `required acceptance prerequisites missing ${marker}`);
}

const accepted = gate.currentAcceptedAuditReviewerAcceptance ?? {};
assertAllowedKeys(accepted, "current accepted audit/reviewer acceptance", [
  "status",
  "auditReviewerAcceptanceRef",
  "reviewerIdentityRef",
  "auditScopeRef",
  "findingsDispositionRef",
  "productionArtifactBundleRef",
  "verifierAdapterAcceptanceRef",
  "sbfLiveLineageRef",
  "reviewerAccepted",
  "acceptedForC01",
  "satisfiesAuditReviewerAcceptance",
]);
assert(accepted.status === "absent", "accepted audit/reviewer acceptance must be absent");
assertNullRefs(accepted, "current accepted audit/reviewer acceptance", [
  "auditReviewerAcceptanceRef",
  "reviewerIdentityRef",
  "auditScopeRef",
  "findingsDispositionRef",
  "productionArtifactBundleRef",
  "verifierAdapterAcceptanceRef",
  "sbfLiveLineageRef",
]);
assert(accepted.reviewerAccepted === false, "reviewerAccepted must remain false");
assert(accepted.acceptedForC01 === false, "acceptedForC01 must remain false");
assert(accepted.satisfiesAuditReviewerAcceptance === false, "accepted audit/reviewer acceptance must remain false");

const external = gate.externalAuditReviewerAcceptanceValidation ?? {};
assert(external.status === "ready-for-reviewed-refs-only-audit-reviewer-acceptance-validation", "external validation status mismatch");
assert(external.envVar === acceptanceEnvVar, "external validation env var mismatch");
assert(external.templateRef === templatePath, "external validation template ref mismatch");
assert(
  external.command ===
    "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-audit-reviewer-acceptance-gate-check",
  "external validation command mismatch",
);
assert(external.defaultGuardRequiresExternalAcceptance === false, "external acceptance must be optional by default");
assert(external.validatedWhenEnvVarPresent === true, "external acceptance must validate when env var is present");
assertStringArray(external.validates, "external validation validates");
for (const marker of [
  "reviewed production artifact bundle ref",
  "production verifier-adapter acceptance ref",
  "valid-proof mutation and invalid/wrong-input/wrong-key no-mutation refs",
  "four trim-normalized distinct mutation/no-mutation evidence refs",
  "SBF/live lineage acceptance gate ref",
  "SBF/live lineage ref",
  "reviewer identity and scope refs",
  "findings disposition ref",
  "audit/reviewer acceptance ref",
  "refs-only secret policy",
  "no raw proof/VK/witness/key/secret/transaction material in env-supplied JSON",
]) {
  assert(external.validates.includes(marker), `external validation missing ${marker}`);
}
assert(external.satisfiesAuditReviewerAcceptance === false, "external validation must not satisfy acceptance by itself");
for (const marker of [
  "audit/reviewer acceptance intake executable",
  "does not supply acceptance",
  "accepted audit/reviewer refs remain null",
]) {
  includes(external.truthBoundary ?? "", marker, "external validation truth boundary");
}
assertTemplate(template);

const criteria = mapById(gate.acceptanceCriteria, "acceptance criteria");
for (const [id, shapeRef] of [
  ["reviewed-production-artifact-bundle", "bundle:<reviewed-production-artifact-bundle-ref>"],
  ["production-verifier-adapter-acceptance", "adapter:<reviewed-production-verifier-adapter-acceptance-ref>"],
  ["valid-proof-mutates-nullifier-output-state", "test:<valid-proof-mutates-nullifier-output-state-ref>"],
  ["invalid-proof-leaves-account-bytes-unchanged", "test:<invalid-proof-leaves-account-bytes-unchanged-ref>"],
  ["wrong-public-input-leaves-account-bytes-unchanged", "test:<wrong-public-input-hash-leaves-account-bytes-unchanged-ref>"],
  ["wrong-verifying-key-leaves-account-bytes-unchanged", "test:<wrong-verifying-key-leaves-account-bytes-unchanged-ref>"],
  ["sbf-live-lineage", "lineage:<rebuilt-redeployed-reinitialized-live-lineage-ref>"],
  ["reviewer-identity-and-scope", "review:<reviewer-identity-and-c01-scope-ref>"],
  ["findings-disposition", "review:<all-c01-findings-accepted-or-remediated-ref>"],
  ["audit-reviewer-acceptance", "audit-or-review:<selected-verifier-backend-accepted-for-c01-ref>"],
]) {
  const criterion = criteria.get(id);
  assert(criterion, `missing criterion ${id}`);
  assert(criterion.requiredRefShape === shapeRef, `${id} ref shape mismatch`);
  assert(criterion.currentRef === null, `${id} currentRef must stay null`);
  assert(criterion.satisfiesC01PositiveEvidence === false, `${id} must not satisfy C01 evidence`);
}
for (const rule of [
  "audit/reviewer acceptance refs must be references only; raw proof, verifying-key, proving-key, witness, keypair, secret, and signed transaction bytes stay out of git",
  "audit/reviewer acceptance can promote only after a reviewed production artifact bundle exists for the selected backend",
  "audit/reviewer acceptance can promote only after production verifier-adapter acceptance and mutation/no-mutation refs exist",
  "audit/reviewer acceptance requires distinct refs for valid mutation and each invalid/wrong-input/wrong-key no-mutation case",
  "audit/reviewer acceptance can promote only after SBF/live lineage ties the deployed spend/verifier programs, verifier-key record, and tag-3 proof-enforced path to the accepted production proof/VK lineage",
  "audit/reviewer acceptance must identify reviewer scope and findings disposition; generic approval language is not enough",
]) {
  assert(gate.promotionRules?.includes(rule), `missing promotion rule ${rule}`);
}
assertEvidenceFlags(
  gate.satisfiesRequiredPositiveEvidence,
  {
    backendSelection: true,
    productionArtifactAcceptance: false,
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
  "no reviewed production artifact bundle",
  "no production verifier-adapter acceptance",
  "no rebuilt/redeployed/reinitialized/live SBF lineage",
  "no C01 findings disposition ref",
  "no audit/reviewer acceptance ref",
]) {
  assert(gate.remainingBlockers.includes(blocker), `missing blocker ${blocker}`);
}
assertStringArray(gate.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-audit-reviewer-acceptance-gate-check",
  "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-audit-reviewer-acceptance-gate-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "npm run zk:c01-sbf-live-lineage-candidate-check",
  "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "npm run zk:c01-positive-proof-verified-claim-gate-check",
]) {
  assert(gate.canonicalCommands.includes(command), `missing canonical command ${command}`);
}
assert(productionBundleTemplate.auditReviewerAcceptance?.auditReviewerAcceptanceRef === null, "production bundle template must keep audit ref null");
assert(productionBundleTemplate.auditReviewerAcceptance?.reviewerAccepted === false, "production bundle template must not claim reviewer acceptance");
assert(productionGate.satisfiesRequiredPositiveEvidence?.auditReviewerAcceptance === false, "production gate must keep audit evidence false");
assert(sbfLiveLineage.satisfiesRequiredPositiveEvidence?.auditReviewerAcceptance === false, "SBF/live gate must keep audit evidence false");
assert(positiveClaimGate.positiveClaimRequires?.auditReviewerAcceptance === false, "positive claim gate must keep audit evidence false");

for (const marker of [
  "C01 audit/reviewer acceptance gate",
  gatePath,
  templatePath,
  "npm run zk:c01-audit-reviewer-acceptance-gate-check",
  "VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json>",
  "blocked-no-audit-reviewer-acceptance",
]) {
  includes(decision, marker, decisionPath);
  includes(auditPackage, marker, auditPackagePath);
  includes(runbook, marker, runbookPath);
  includes(review, marker, reviewPath);
}
for (const marker of [
  "blocked audit/reviewer acceptance gate",
  "not audit/reviewer acceptance",
  "not SBF/live lineage",
  "not tag-3 proof acceptance",
  "not C01 closure",
]) {
  includes(gate.truthBoundary ?? "", marker, "gate truth boundary");
}

const externalAcceptancePath = process.env[acceptanceEnvVar];
if (externalAcceptancePath) {
  const externalAcceptance = readJsonPath(externalAcceptancePath, "external audit/reviewer acceptance");
  assertReviewedAuditAcceptance(externalAcceptance, "external audit/reviewer acceptance");
}

console.log("private-pool-v2 C01 audit/reviewer acceptance gate: PASS");

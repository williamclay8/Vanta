import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const gatePath =
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json";
const templatePath =
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json";
const candidatePath =
  "ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json";
const productionGatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json";
const adapterAcceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json";
const productionBundleTemplatePath =
  "ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json";
const auditAcceptanceGatePath =
  "ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const auditPackagePath = "docs/audit-package.md";
const runbookPath = "docs/operator-runbook.md";
const reviewPath = "VANTA_ZK_REVIEW.md";
const acceptanceEnvVar = "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH";

function fail(message) {
  console.error(`private-pool-v2 C01 SBF/live lineage acceptance gate: FAIL - ${message}`);
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

function readJsonPath(path, label) {
  const resolved = path.startsWith("/") ? path : resolve(repoRoot, path);
  assert(existsSync(resolved), `${label} missing at ${path}`);
  return JSON.parse(readFileSync(resolved, "utf8"));
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
  assert(!value.includes("://"), `${label} must be a refs-only local/review handle, not a URL`);
  assert(!value.includes("-----BEGIN"), `${label} must not contain key material`);
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
  assertAllowedKeys(template, "SBF/live lineage acceptance template", [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "purpose",
    "prerequisites",
    "programLineage",
    "liveEvidence",
    "lineageAcceptance",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(
    template.version === "vanta-private-pool-v2-c01-sbf-live-lineage-acceptance-template-0.1",
    "template version mismatch",
  );
  assert(template.status === "template-not-sbf-live-lineage", "template status mismatch");
  assert(template.selectedBackend === gate.selectedBackend, "template selected backend mismatch");
  assert(template.routeId === gate.routeId, "template route mismatch");
  assert(template.secretPolicy === gate.secretPolicy, "template secret policy mismatch");

  assertAllowedKeys(template.prerequisites, "template prerequisites", [
    "productionArtifactBundleRef",
    "productionArtifactAcceptanceGateRef",
    "verifierAdapterAcceptanceRef",
    "verifierAdapterAcceptanceGateRef",
    "productionProofFormatArtifactRef",
    "productionVerifyingKeyArtifactRef",
    "productionVerifyingKeyHash",
    "verifyingKeyHashKind",
    "currentH6PublicInputBindingRef",
  ]);
  assertNullRefs(template.prerequisites, "template prerequisites", [
    "productionArtifactBundleRef",
    "verifierAdapterAcceptanceRef",
    "productionProofFormatArtifactRef",
    "productionVerifyingKeyArtifactRef",
    "productionVerifyingKeyHash",
    "currentH6PublicInputBindingRef",
  ]);
  assert(
    template.prerequisites.productionArtifactAcceptanceGateRef === productionGatePath,
    "template production gate ref mismatch",
  );
  assert(
    template.prerequisites.verifierAdapterAcceptanceGateRef === adapterAcceptanceGatePath,
    "template adapter acceptance gate ref mismatch",
  );
  assert(
    template.prerequisites.verifyingKeyHashKind === shape.verifyingKeyHashKind,
    "template VK hash kind mismatch",
  );

  assertAllowedKeys(template.programLineage, "template program lineage", [
    "sourceAcirSha256",
    "spendProgramSbfHash",
    "acceptedVerifierProgramSbfHash",
    "spendProgramId",
    "verifierProgramId",
    "verifierProgramKind",
    "acceptedVerifierProgramRef",
    "verifierKeyRecordRef",
    "verifierKeyRecordBindsProductionVkHash",
    "verifierKeyRecordBindsVerifierProgramId",
  ]);
  assert(template.programLineage.sourceAcirSha256 === shape.sourceAcirSha256, "template source ACIR mismatch");
  assert(template.programLineage.verifierProgramKind === shape.verifierProgramKind, "template verifier kind mismatch");
  assertNullRefs(template.programLineage, "template program lineage", [
    "spendProgramSbfHash",
    "acceptedVerifierProgramSbfHash",
    "spendProgramId",
    "verifierProgramId",
    "acceptedVerifierProgramRef",
    "verifierKeyRecordRef",
  ]);
  assert(
    template.programLineage.verifierKeyRecordBindsProductionVkHash === false,
    "template VK binding flag must be false",
  );
  assert(
    template.programLineage.verifierKeyRecordBindsVerifierProgramId === false,
    "template verifier-program binding flag must be false",
  );

  assertAllowedKeys(template.liveEvidence, "template live evidence", [
    "spendProgramDeploymentRef",
    "verifierProgramDeploymentRef",
    "poolReinitializationOrMigrationRef",
    "verifierKeyRegistrationRef",
    "liveProofEnforcedSpendRef",
    "reviewerAcceptedDryRunRef",
    "evidenceKind",
    "sameSourceVkAdapterLineage",
  ]);
  assertNullRefs(template.liveEvidence, "template live evidence", [
    "spendProgramDeploymentRef",
    "verifierProgramDeploymentRef",
    "poolReinitializationOrMigrationRef",
    "verifierKeyRegistrationRef",
    "liveProofEnforcedSpendRef",
    "reviewerAcceptedDryRunRef",
  ]);
  assert(
    template.liveEvidence.evidenceKind === "tx-or-reviewer-accepted-dry-run",
    "template evidence kind mismatch",
  );
  assert(template.liveEvidence.sameSourceVkAdapterLineage === false, "template lineage flag must be false");

  assertAllowedKeys(template.lineageAcceptance, "template lineage acceptance", [
    "sbfLiveLineageRef",
    "sbfLiveLineageAcceptanceGateRef",
    "acceptedForC01",
    "satisfiesSbfLiveLineage",
  ]);
  assert(template.lineageAcceptance.sbfLiveLineageRef === null, "template lineage ref must stay null");
  assert(template.lineageAcceptance.sbfLiveLineageAcceptanceGateRef === gatePath, "template gate ref mismatch");
  assert(template.lineageAcceptance.acceptedForC01 === false, "template acceptedForC01 must stay false");
  assert(
    template.lineageAcceptance.satisfiesSbfLiveLineage === false,
    "template must not claim SBF/live lineage",
  );
  assertEvidenceFlags(template.satisfiesRequiredPositiveEvidence, defaultFalseEvidenceFlags, "template evidence flags");
  includes(template.truthBoundary ?? "", "not SBF/live lineage", "template truth boundary");
  includes(template.truthBoundary ?? "", "does not close C01", "template truth boundary");
}

function assertReviewedLineageAcceptance(acceptance, label) {
  assertAllowedKeys(acceptance, label, [
    "version",
    "status",
    "selectedBackend",
    "routeId",
    "secretPolicy",
    "prerequisites",
    "programLineage",
    "liveEvidence",
    "lineageAcceptance",
    "satisfiesRequiredPositiveEvidence",
    "truthBoundary",
  ]);
  assert(
    acceptance.version === "vanta-private-pool-v2-c01-sbf-live-lineage-acceptance-0.1",
    `${label} version mismatch`,
  );
  assert(acceptance.status === "reviewed-sbf-live-lineage-acceptance-candidate", `${label} status mismatch`);
  assert(acceptance.selectedBackend === gate.selectedBackend, `${label} selected backend mismatch`);
  assert(acceptance.routeId === gate.routeId, `${label} route mismatch`);
  assert(acceptance.secretPolicy === gate.secretPolicy, `${label} secret policy mismatch`);

  const prerequisites = acceptance.prerequisites ?? {};
  for (const field of [
    "productionArtifactBundleRef",
    "verifierAdapterAcceptanceRef",
    "productionProofFormatArtifactRef",
    "productionVerifyingKeyArtifactRef",
    "currentH6PublicInputBindingRef",
  ]) {
    assertRef(prerequisites[field], `${label} prerequisites.${field}`);
  }
  assert(prerequisites.productionArtifactAcceptanceGateRef === productionGatePath, `${label} production gate ref mismatch`);
  assert(
    prerequisites.verifierAdapterAcceptanceGateRef === adapterAcceptanceGatePath,
    `${label} adapter acceptance gate ref mismatch`,
  );
  assertSha256(prerequisites.productionVerifyingKeyHash, `${label} production VK hash`);
  assert(prerequisites.verifyingKeyHashKind === shape.verifyingKeyHashKind, `${label} VK hash kind mismatch`);

  const programLineage = acceptance.programLineage ?? {};
  assert(programLineage.sourceAcirSha256 === shape.sourceAcirSha256, `${label} source ACIR mismatch`);
  assertSha256(programLineage.spendProgramSbfHash, `${label} spend SBF hash`);
  assertSha256(programLineage.acceptedVerifierProgramSbfHash, `${label} verifier SBF hash`);
  for (const field of [
    "spendProgramId",
    "verifierProgramId",
    "acceptedVerifierProgramRef",
    "verifierKeyRecordRef",
  ]) {
    assertRef(programLineage[field], `${label} programLineage.${field}`);
  }
  assert(programLineage.verifierProgramKind === shape.verifierProgramKind, `${label} verifier kind mismatch`);
  assert(
    programLineage.verifierKeyRecordBindsProductionVkHash === true,
    `${label} verifier-key record must bind production VK hash`,
  );
  assert(
    programLineage.verifierKeyRecordBindsVerifierProgramId === true,
    `${label} verifier-key record must bind verifier program id`,
  );

  const liveEvidence = acceptance.liveEvidence ?? {};
  for (const field of [
    "spendProgramDeploymentRef",
    "verifierProgramDeploymentRef",
    "poolReinitializationOrMigrationRef",
    "verifierKeyRegistrationRef",
  ]) {
    assertRef(liveEvidence[field], `${label} liveEvidence.${field}`);
  }
  assert(
    liveEvidence.liveProofEnforcedSpendRef !== null || liveEvidence.reviewerAcceptedDryRunRef !== null,
    `${label} must provide live proof-enforced spend ref or reviewer accepted dry-run ref`,
  );
  if (liveEvidence.liveProofEnforcedSpendRef !== null) {
    assertRef(liveEvidence.liveProofEnforcedSpendRef, `${label} live proof-enforced spend ref`);
  }
  if (liveEvidence.reviewerAcceptedDryRunRef !== null) {
    assertRef(liveEvidence.reviewerAcceptedDryRunRef, `${label} reviewer accepted dry-run ref`);
  }
  assert(
    liveEvidence.evidenceKind === "tx-or-reviewer-accepted-dry-run",
    `${label} evidence kind mismatch`,
  );
  assert(liveEvidence.sameSourceVkAdapterLineage === true, `${label} must bind same source/VK/adapter lineage`);

  const lineageAcceptance = acceptance.lineageAcceptance ?? {};
  assertRef(lineageAcceptance.sbfLiveLineageRef, `${label} SBF/live lineage ref`);
  assert(lineageAcceptance.sbfLiveLineageAcceptanceGateRef === gatePath, `${label} gate ref mismatch`);
  assert(lineageAcceptance.acceptedForC01 === true, `${label} acceptedForC01 must be true`);
  assert(lineageAcceptance.satisfiesSbfLiveLineage === true, `${label} must satisfy SBF/live lineage`);
  assertEvidenceFlags(
    acceptance.satisfiesRequiredPositiveEvidence,
    {
      ...defaultFalseEvidenceFlags,
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
    },
    `${label} evidence flags`,
  );
  includes(acceptance.truthBoundary ?? "", "reviewed SBF/live lineage acceptance", `${label} truth boundary`);
  includes(acceptance.truthBoundary ?? "", "not audit/reviewer acceptance", `${label} truth boundary`);
  includes(acceptance.truthBoundary ?? "", "not C01 closure", `${label} truth boundary`);
}

const defaultFalseEvidenceFlags = {
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
};

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const gateText = read(gatePath);
const gate = JSON.parse(gateText);
const template = readJson(templatePath);
const candidate = readJson(candidatePath);
const productionGate = readJson(productionGatePath);
const adapterGate = readJson(adapterAcceptanceGatePath);
const productionBundleTemplate = readJson(productionBundleTemplatePath);
const auditGate = readJson(auditAcceptanceGatePath);
const decision = read(decisionPath);
const auditPackage = read(auditPackagePath);
const runbook = read(runbookPath);
const review = read(reviewPath);

assert(
  scripts["zk:c01-sbf-live-lineage-acceptance-gate-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sbf-live-lineage-acceptance-gate.mjs",
  "package.json must expose zk:c01-sbf-live-lineage-acceptance-gate-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sbf-live-lineage-acceptance-gate-check"),
    `${aggregate} must include the C01 SBF/live lineage acceptance gate`,
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
  "privateKey",
  "signedTransactionBytes",
  "-----BEGIN",
  "bearer ",
  "postgres://",
  "postgresql://",
]) {
  assert(!gateText.includes(forbidden), `gate must not contain forbidden marker ${forbidden}`);
}

assertAllowedKeys(gate, "SBF/live lineage acceptance gate", [
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
  "sbfLiveLineageReady",
  "secretPolicy",
  "purpose",
  "sbfLiveLineageCandidateRef",
  "sbfLiveLineageAcceptanceTemplateRef",
  "productionArtifactAcceptanceGateRef",
  "verifierAdapterAcceptanceGateRef",
  "productionArtifactBundleTemplateRef",
  "auditReviewerAcceptanceGateRef",
  "decisionPacketRef",
  "requiredAcceptanceShape",
  "currentAcceptedSbfLiveLineage",
  "externalSbfLiveLineageAcceptanceValidation",
  "acceptanceCriteria",
  "promotionRules",
  "satisfiesRequiredPositiveEvidence",
  "remainingBlockers",
  "canonicalCommands",
  "truthBoundary",
]);
assert(gate.version === "vanta-private-pool-v2-c01-sbf-live-lineage-acceptance-gate-0.1", "gate version mismatch");
assert(gate.status === "blocked-no-sbf-live-lineage-acceptance", "gate status mismatch");
assert(gate.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(gate.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(gate.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route mismatch");
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "sbfLiveLineageReady",
]) {
  assert(gate[field] === false, `${field} must remain false`);
}
assert(
  gate.secretPolicy === "refs-only-no-keypairs-secrets-signed-transactions-or-live-private-data",
  "secret policy mismatch",
);
for (const [field, expected] of [
  ["sbfLiveLineageCandidateRef", candidatePath],
  ["sbfLiveLineageAcceptanceTemplateRef", templatePath],
  ["productionArtifactAcceptanceGateRef", productionGatePath],
  ["verifierAdapterAcceptanceGateRef", adapterAcceptanceGatePath],
  ["productionArtifactBundleTemplateRef", productionBundleTemplatePath],
  ["auditReviewerAcceptanceGateRef", auditAcceptanceGatePath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(gate[field] === expected, `${field} mismatch`);
}
assert(candidate.sbfLiveLineageAcceptanceGateRef === gatePath, "candidate must reference SBF/live acceptance gate");
assert(
  candidate.sbfLiveLineageAcceptanceTemplateRef === templatePath,
  "candidate must reference SBF/live acceptance template",
);
assert(productionGate.status === "blocked-no-reviewed-production-artifact-bundle", "production gate status mismatch");
assert(adapterGate.status === "blocked-no-production-verifier-adapter-acceptance", "adapter gate status mismatch");

const shape = gate.requiredAcceptanceShape ?? {};
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
  ["sourceAcirSha256", candidate.requiredLineageShape?.sourceAcirSha256],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["verifierProgramKind", "dedicated-verifier-cpi-or-reviewed-in-program-verifier"],
  ["status", "required-before-sbf-live-lineage-acceptance"],
]) {
  assert(shape[field] === expected, `required acceptance shape ${field} mismatch`);
}
assertStringArray(shape.requiredPrerequisites, "required prerequisites");
assertStringArray(shape.requiredLineageRefs, "required lineage refs");
for (const marker of [
  "reviewed production artifact bundle",
  "production verifier-adapter acceptance",
  "production proof-format artifact",
  "production verifying-key artifact and hash",
  "valid mutation and invalid/wrong-input/wrong-key no-mutation evidence",
  "rebuilt spend SBF hash",
  "accepted verifier SBF hash",
  "deployed spend program id",
  "deployed verifier program id",
  "live proof-enforced tag-3 receipt or reviewer-accepted dry-run receipt",
]) {
  includes([...shape.requiredPrerequisites, ...shape.requiredLineageRefs].join("\n"), marker, "required shape");
}

const accepted = gate.currentAcceptedSbfLiveLineage ?? {};
assertAllowedKeys(accepted, "current accepted SBF/live lineage", [
  "status",
  "sbfLiveLineageRef",
  "productionArtifactBundleRef",
  "verifierAdapterAcceptanceRef",
  "spendProgramSbfHash",
  "acceptedVerifierProgramSbfHash",
  "spendProgramId",
  "verifierProgramId",
  "verifierKeyRecordRef",
  "spendProgramDeploymentRef",
  "verifierProgramDeploymentRef",
  "poolReinitializationOrMigrationRef",
  "verifierKeyRegistrationRef",
  "liveProofEnforcedSpendRef",
  "reviewerAcceptedDryRunRef",
  "acceptedForC01",
  "satisfiesSbfLiveLineage",
]);
assert(accepted.status === "absent", "accepted SBF/live lineage must be absent");
assertNullRefs(accepted, "accepted SBF/live lineage", [
  "sbfLiveLineageRef",
  "productionArtifactBundleRef",
  "verifierAdapterAcceptanceRef",
  "spendProgramSbfHash",
  "acceptedVerifierProgramSbfHash",
  "spendProgramId",
  "verifierProgramId",
  "verifierKeyRecordRef",
  "spendProgramDeploymentRef",
  "verifierProgramDeploymentRef",
  "poolReinitializationOrMigrationRef",
  "verifierKeyRegistrationRef",
  "liveProofEnforcedSpendRef",
  "reviewerAcceptedDryRunRef",
]);
assert(accepted.acceptedForC01 === false, "acceptedForC01 must stay false");
assert(accepted.satisfiesSbfLiveLineage === false, "accepted lineage must stay false");

const external = gate.externalSbfLiveLineageAcceptanceValidation ?? {};
assert(external.status === "ready-for-reviewed-refs-only-sbf-live-lineage-validation", "external status mismatch");
assert(external.envVar === acceptanceEnvVar, "external env var mismatch");
assert(external.templateRef === templatePath, "external template ref mismatch");
assert(
  external.command ===
    "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "external command mismatch",
);
assert(external.defaultGuardRequiresExternalAcceptance === false, "external acceptance must be optional by default");
assert(external.validatedWhenEnvVarPresent === true, "external acceptance must validate when env var is present");
assertStringArray(external.validates, "external validation validates");
for (const marker of [
  "reviewed production artifact bundle ref",
  "production verifier-adapter acceptance ref",
  "rebuilt spend SBF hash",
  "accepted verifier SBF hash",
  "deployed spend and verifier program ids",
  "verifier-key record binding production VK hash to verifier program id",
  "deployment, migration, verifier-key registration, and proof-enforced path refs",
  "refs-only secret policy",
]) {
  assert(external.validates.includes(marker), `external validation missing ${marker}`);
}
assert(external.satisfiesSbfLiveLineage === false, "external validation must not satisfy lineage by itself");
for (const marker of [
  "SBF/live lineage intake executable",
  "does not supply lineage",
  "accepted SBF/live refs remain null",
]) {
  includes(external.truthBoundary ?? "", marker, "external validation truth boundary");
}
assertTemplate(template);

const criteria = mapById(gate.acceptanceCriteria, "acceptance criteria");
for (const id of [
  "reviewed-production-artifact-bundle",
  "production-verifier-adapter-acceptance",
  "rebuilt-spend-sbf-hash",
  "accepted-verifier-sbf-hash",
  "deployed-spend-program-id",
  "deployed-verifier-program-id",
  "verifier-key-record-binding",
  "spend-and-verifier-deployment-receipts",
  "pool-reinitialization-or-migration",
  "verifier-key-registration",
  "proof-enforced-path-or-reviewer-dry-run",
]) {
  const criterion = criteria.get(id);
  assert(criterion, `missing criterion ${id}`);
  assert(typeof criterion.requiredRefShape === "string", `${id} ref shape missing`);
  assert(criterion.currentRef === null, `${id} currentRef must stay null`);
  assert(criterion.satisfiesC01PositiveEvidence === false, `${id} must not satisfy C01 evidence`);
}
for (const rule of [
  "SBF/live lineage refs must be references only; keypairs, secrets, signed transactions, raw proof bytes, raw VK bytes, raw witness bytes, and live private data stay out of git",
  "SBF/live lineage can promote only after reviewed production artifact bundle and production verifier-adapter acceptance refs exist",
  "accepted lineage must tie the rebuilt spend SBF hash, accepted verifier SBF hash, deployed program ids, verifier-key record, and tag-3 proof-enforced path to the same production proof/VK lineage",
  "SBF/live lineage does not by itself prove audit/reviewer acceptance or C01 closure",
]) {
  assert(gate.promotionRules?.includes(rule), `missing promotion rule ${rule}`);
}
assertEvidenceFlags(
  gate.satisfiesRequiredPositiveEvidence,
  { backendSelection: true, ...defaultFalseEvidenceFlags },
  "gate evidence flags",
);
assertStringArray(gate.remainingBlockers, "remaining blockers");
for (const blocker of [
  "no reviewed production artifact bundle",
  "no production verifier-adapter acceptance",
  "no rebuilt spend SBF hash accepted for deployed lineage",
  "no accepted verifier SBF hash or reviewed in-program verifier hash",
  "no deployed spend/verifier program ids",
  "no verifier-key record binding production VK hash to verifier program id",
  "no deployment, reinitialization/migration, verifier-key registration, or proof-enforced path receipts",
  "no audit/reviewer acceptance",
]) {
  assert(gate.remainingBlockers.includes(blocker), `missing blocker ${blocker}`);
}
assertStringArray(gate.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "npm run zk:c01-sbf-live-lineage-candidate-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
  "npm run zk:c01-verifier-adapter-acceptance-gate-check",
  "npm run zk:review-guards-check",
]) {
  assert(gate.canonicalCommands.includes(command), `missing canonical command ${command}`);
}
assert(
  productionBundleTemplate.satisfiesRequiredPositiveEvidence?.sbfLiveLineage === false,
  "production bundle template must not claim SBF/live lineage",
);
assert(
  auditGate.satisfiesRequiredPositiveEvidence?.sbfLiveLineage === false,
  "audit gate must not claim SBF/live lineage",
);
for (const marker of [
  gatePath,
  templatePath,
  "blocked-no-sbf-live-lineage-acceptance",
  "VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json>",
  "not SBF/live lineage",
]) {
  includes(decision, marker, "C01 backend decision");
  includes(auditPackage, marker, "audit package");
  includes(runbook, marker, "operator runbook");
  includes(review, marker, "VANTA_ZK_REVIEW");
}

const externalAcceptancePath = process.env[acceptanceEnvVar];
if (externalAcceptancePath) {
  const reviewedAcceptance = readJsonPath(externalAcceptancePath, "reviewed SBF/live lineage acceptance");
  assertReviewedLineageAcceptance(reviewedAcceptance, "reviewed SBF/live lineage acceptance");
}

console.log("private-pool-v2 C01 SBF/live lineage acceptance gate: PASS");

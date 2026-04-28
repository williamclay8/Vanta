import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVantaPrivatePoolV2AnonymitySetReadiness } from "../src/readiness/privatePoolV2AnonymitySetReadiness.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/private-pool-v2-anonymity-set.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/private-pool-v2-anonymity-set.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const readiness = createVantaPrivatePoolV2AnonymitySetReadiness();

assert.equal(evidence.version, "vanta-private-pool-v2-anonymity-set-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.privacyClaimAllowed, false);
assert.equal(evidence.meaningfulPrivacyReady, false);
assert.equal(evidence.secretPolicy, "references-only-no-secret-values");
assert.equal(evidence.minimumDistinctCommitments, readiness.minimumDistinctCommitments);
assert.equal(evidence.measurementPolicy.cohortBasis, "per-asset-pool");
assert.equal(evidence.measurementPolicy.excludeTestFixtures, true);
assert.equal(evidence.measurementPolicy.excludeNoRealFundsSmokeReceipts, true);
assert.equal(evidence.measurementPolicy.excludeOperatorSeededDemoNotes, true);
assert.equal(evidence.measurementPolicy.requireLiveMainnetCommitments, true);
assert.equal(evidence.measurementPolicy.requireIndependentReview, true);

for (const ref of [
  "VANTA_PRIVATE_POOL_V2_ANONYMITY_SET_REF",
  "VANTA_PRIVATE_POOL_V2_PRODUCTION_ANONYMITY_METRICS_REF",
  "VANTA_PRIVATE_POOL_V2_AUDIT_REF",
  "VANTA_PRIVATE_POOL_V2_LIVE_MAINNET_SETTLEMENT_REF",
]) {
  assert.ok(evidence.requiredRefs.includes(ref), `Missing required anonymity-set ref: ${ref}.`);
  assert.ok(readiness.requiredEvidenceRefs.includes(ref) || ref === "VANTA_PRIVATE_POOL_V2_LIVE_MAINNET_SETTLEMENT_REF");
}

assert.ok(Array.isArray(evidence.cohorts) && evidence.cohorts.length > 0, "Anonymity evidence must list cohorts.");
for (const cohort of evidence.cohorts) {
  assert.ok(cohort.id, "Cohort must have id.");
  assert.ok(cohort.assetCohort, `${cohort.id} must have asset cohort.`);
  assert.ok(String(cohort.poolRef).endsWith("_REF"), `${cohort.id} poolRef must be a ref.`);
  assert.equal(Number.isInteger(cohort.distinctCommitmentCount), true, `${cohort.id} count must be integer.`);
  assert.equal(cohort.meetsMinimumDistinctCommitments, false, `${cohort.id} must not claim minimum is met.`);
  assert.ok(String(cohort.metricsRef).endsWith("_REF"), `${cohort.id} metricsRef must be a ref.`);
  assert.ok(String(cohort.measurementWindowRef).endsWith("_REF"), `${cohort.id} window ref must be a ref.`);
  assert.ok(String(cohort.reviewerRef).endsWith("_REF"), `${cohort.id} reviewer ref must be a ref.`);
  assert.equal(cohort.status, "not-measured");
}

for (const blocker of [
  "No live mainnet production cohort metrics are recorded.",
  "No asset cohort has at least 1024 distinct live commitments.",
  "No independent reviewer has accepted the anonymity-set measurement.",
  "No audited shared anonymity set exists.",
]) {
  assert.ok(evidence.productionBlockers.includes(blocker), `Missing anonymity blocker: ${blocker}`);
}

const serialized = JSON.stringify(evidence);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "rawSecret",
  "signedTransaction",
]) {
  assert.ok(!serialized.includes(forbidden), `Anonymity-set evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["private-pool-v2:anonymity-set-evidence-check"],
  "node scripts/check-vanta-private-pool-v2-anonymity-set-evidence.mjs",
  "package.json must expose private-pool-v2:anonymity-set-evidence-check.",
);
assert.ok(
  packageJson.scripts["private-pool-v2:verify"].includes("npm run private-pool-v2:anonymity-set-evidence-check"),
  "private-pool-v2:verify must include anonymity-set evidence check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run private-pool-v2:anonymity-set-evidence-check"),
  "mainnet:preflight must include anonymity-set evidence check.",
);

console.log("Vanta Private Pool v2 anonymity-set evidence check: PASS");

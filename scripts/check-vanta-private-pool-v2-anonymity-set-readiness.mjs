import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { filterActiveBlockers } from "../src/readiness/operatorExternalGateSkips.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const readinessPath = resolve(repoRoot, "src/readiness/privatePoolV2AnonymitySetReadiness.mjs");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(readinessPath), "Missing src/readiness/privatePoolV2AnonymitySetReadiness.mjs.");

const { createVantaPrivatePoolV2AnonymitySetReadiness } = await import(`file://${readinessPath}`);
const result = createVantaPrivatePoolV2AnonymitySetReadiness();
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const evidence = JSON.parse(
  readFileSync(resolve(repoRoot, "ops/mainnet/private-pool-v2-anonymity-set.evidence.json"), "utf8"),
);

assert.equal(result.version, "vanta-private-pool-v2-anonymity-set-readiness-0.1");
assert.equal(result.railId, "vanta-private-pool-v2");
assert.equal(result.mainnetReady, false);
assert.equal(result.productionReady, false);
assert.equal(result.meaningfulPrivacyReady, false);
assert.equal(result.privacyClaimAllowed, false);
assert.equal(result.auditedSharedAnonymitySetAvailable, false);
assert.equal(result.liveAnonymitySetAvailable, false);
assert.equal(result.liveMainnetPrivateSettlementAvailable, false);
assert.equal(result.productionAnonymityMetricsAvailable, true);
assert.equal(
  result.currentDistinctCommitmentCount,
  evidence.currentMeasurement.distinctCommitmentCount,
  "Readiness must derive current distinct commitment count from anonymity-set evidence.",
);
assert.equal(
  result.currentAnonymityMeasurementStatus,
  evidence.currentMeasurement.status,
  "Readiness must derive measurement status from anonymity-set evidence.",
);
assert.equal(result.anonymitySetReadiness, "blocked");
assert.equal(
  result.minimumDistinctCommitments,
  evidence.currentMeasurement.minimumDistinctCommitments,
  "Readiness must derive minimum distinct commitments from anonymity-set evidence.",
);

assert.deepEqual(result.assetCohortRules.required, [
  "single asset cohort per pool",
  "stable target pool mint per cohort",
  "no cross-asset anonymity-set claims",
  "cohort metrics must exclude test fixtures and no-real-funds smoke receipts",
]);
assert.deepEqual(result.relayerSeparation.requiredEvidenceRefs, [
  "VANTA_PRIVATE_POOL_V2_RELAYER_SEPARATION_REF",
  "ops/mainnet/private-pool-v2-relayer-separation.evidence.json",
  "npm run private-pool-v2:relayer-separation-evidence-check",
]);
assert.ok(
  result.relayerSeparation.currentTruth.includes("local safe-telemetry and service manifest checks cover parts"),
  "Relayer separation truth must reflect local and manifest coverage.",
);
assert.ok(
  result.relayerSeparation.currentTruth.includes("the mainnet relayer-submitted spend transaction is recorded"),
  "Relayer separation truth must reflect observed mainnet relayer spend evidence.",
);
assert.ok(
  result.relayerSeparation.currentTruth.includes("independent production review is still required"),
  "Relayer separation truth must keep independent production review blocked.",
);
assert.deepEqual(result.nullifierUniqueness.requiredEvidenceRefs, [
  "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json",
  "npm run mainnet:nullifier-replay-evidence-check",
]);
assert.deepEqual(result.safeLogging.required, [
  "no auth tokens",
  "no database URLs",
  "no wallet keys",
  "no signed transaction material",
  "no customer private inputs",
  "no raw hidden-economics terms in committed-economics receipts",
]);

for (const ref of [
  "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
  "ops/mainnet/actual-private-production-evidence.packet.json",
  "ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
  "npm run private-pool-v2:anonymity-set-metrics-check",
  "ops/mainnet/private-pool-v2-relayer-separation.evidence.json",
  "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json",
  "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
  "ops/mainnet/private-pool-v2-route-health.evidence.json",
  "ops/mainnet/service-deployment.evidence.json",
]) {
  assert.ok(result.currentEvidenceRefs.includes(ref), `Missing current evidence ref: ${ref}`);
}

for (const ref of [
  "VANTA_PRIVATE_POOL_V2_AUDIT_REF",
  "VANTA_PRIVATE_POOL_V2_ANONYMITY_SET_REF",
  "VANTA_PRIVATE_POOL_V2_PRODUCTION_ANONYMITY_METRICS_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_SEPARATION_REF",
]) {
  assert.ok(result.requiredEvidenceRefs.includes(ref), `Missing required evidence ref: ${ref}`);
}

for (const blocker of filterActiveBlockers([
  "no-proven-audited-shared-anonymity-set",
  "no-proven-live-mainnet-private-settlement-evidence",
  "no-third-party-audit",
  "production-anonymity-set-measured-below-threshold",
  "no-independent-anonymity-set-measurement-review",
  "no-independent-production-relayer-separation-review",
])) {
  assert.ok(result.blockers.includes(blocker), `Missing blocker: ${blocker}`);
}
assert.ok(!result.blockers.includes("no-third-party-audit"), "third-party audit blocker must be operator-skipped");

for (const nonClaim of [
  "no anonymity guarantee",
  "no audited hidden-economics privacy claim",
  "no production mainnet privacy claim",
  "no legal, compliance, custody, or security certification claim",
]) {
  assert.ok(result.nonClaims.includes(nonClaim), `Missing non-claim: ${nonClaim}`);
}

assert.ok(
  result.userFacingRule.includes("Do not claim live anonymity"),
  "Expected user-facing rule to block live anonymity claims.",
);
assert.equal(
  packageJson.scripts["private-pool-v2:anonymity-set-readiness"],
  "node scripts/print-vanta-private-pool-v2-anonymity-set-readiness.mjs",
  "package.json must expose private-pool-v2:anonymity-set-readiness.",
);
assert.equal(
  packageJson.scripts["private-pool-v2:anonymity-set-readiness-json"],
  "node scripts/print-vanta-private-pool-v2-anonymity-set-readiness.mjs --json",
  "package.json must expose private-pool-v2:anonymity-set-readiness-json.",
);
assert.equal(
  packageJson.scripts["private-pool-v2:anonymity-set-readiness-check"],
  "node scripts/check-vanta-private-pool-v2-anonymity-set-readiness.mjs",
  "package.json must expose private-pool-v2:anonymity-set-readiness-check.",
);
assert.equal(
  packageJson.scripts["private-pool-v2:anonymity-set-evidence-check"],
  "node scripts/check-vanta-private-pool-v2-anonymity-set-evidence.mjs",
  "package.json must expose private-pool-v2:anonymity-set-evidence-check.",
);
assert.equal(
  packageJson.scripts["private-pool-v2:relayer-separation-evidence-check"],
  "node scripts/check-vanta-private-pool-v2-relayer-separation-evidence.mjs",
  "package.json must expose private-pool-v2:relayer-separation-evidence-check.",
);
assert.ok(
  packageJson.scripts["private-pool-v2:verify"].includes(
    "npm run private-pool-v2:anonymity-set-readiness-check",
  ),
  "private-pool-v2:verify must include anonymity-set readiness check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes(
    "npm run private-pool-v2:anonymity-set-readiness-check",
  ),
  "mainnet:preflight must include anonymity-set readiness check.",
);

console.log("Vanta Private Pool v2 anonymity-set readiness check: PASS");

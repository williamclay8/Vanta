import { strict as assert } from "node:assert";

import { createVantaPrivatePoolV2AnonymitySetReadiness } from "../src/readiness/privatePoolV2AnonymitySetReadiness.mjs";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

const result = createVantaPrivatePoolV2AnonymitySetReadiness();

if (checkMode) {
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
  assert.equal(result.currentDistinctCommitmentCount, 2);
  assert.equal(result.currentAnonymityMeasurementStatus, "measured-below-threshold");
  assert.equal(result.anonymitySetReadiness, "blocked");
  assert.ok(result.blockers.includes("no-proven-audited-shared-anonymity-set"));
  assert.ok(result.nonClaims.includes("no anonymity guarantee"));
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta Private Pool v2 anonymity-set readiness");
  console.log(`- rail: ${result.railId}`);
  console.log(`- anonymitySetReadiness: ${result.anonymitySetReadiness}`);
  console.log(`- minimumDistinctCommitments: ${result.minimumDistinctCommitments}`);
  console.log(`- auditedSharedAnonymitySetAvailable: ${String(result.auditedSharedAnonymitySetAvailable)}`);
  console.log(`- liveAnonymitySetAvailable: ${String(result.liveAnonymitySetAvailable)}`);
  console.log(`- liveMainnetPrivateSettlementAvailable: ${String(result.liveMainnetPrivateSettlementAvailable)}`);
  console.log(`- productionAnonymityMetricsAvailable: ${String(result.productionAnonymityMetricsAvailable)}`);
  console.log(`- privacyClaimAllowed: ${String(result.privacyClaimAllowed)}`);
  console.log(`- blockers: ${result.blockers.join(", ")}`);
  console.log("- canonical verification: npm run private-pool-v2:anonymity-set-readiness-check");
}

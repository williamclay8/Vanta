import { strict as assert } from "node:assert";

import { createVantaMainnetPrivateSettlementStatus } from "../src/readiness/mainnetPrivateSettlementStatus.mjs";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

const result = createVantaMainnetPrivateSettlementStatus();

if (checkMode) {
  assert.equal(result.version, "vanta-mainnet-private-settlement-status-0.1");
  assert.equal(result.activePrivacyRailId, "vanta-private-pool-v2");
  assert.equal(result.mainnetReady, false);
  assert.equal(result.productionReady, false);
  assert.equal(result.meaningfulPrivacyReady, false);
  assert.equal(result.privacyClaimAllowed, false);
  assert.equal(result.privacyRailCanClaimMeaningfulPrivacy, false);
  assert.equal(result.settlementReadiness, "no-real-funds-production-smoke-only");
  assert.equal(result.routeHealthPublicPassed, true);
  assert.equal(result.routeHealthAuthenticatedPassed, true);
  assert.equal(result.productionSmokeHealthPassed, true);
  assert.equal(result.productionSmokeTargetsPassed, true);
  assert.equal(result.replayProtocolLayerImplemented, true);
  assert.equal(result.realFundsApprovalRecorded, true);
  assert.equal(result.realFundsAllowedNow, false);
  assert.ok(
    ["scheduled", "active", "expired"].includes(result.realFundsApprovalWindowStatus),
    "Private settlement status must expose a bounded approval-window status.",
  );
  assert.equal(result.noRealFundsSmokeOnly, true);
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta mainnet private settlement status");
  console.log(`- rail: ${result.activePrivacyRailId}`);
  console.log(`- settlementReadiness: ${result.settlementReadiness}`);
  console.log(`- routeHealthPublicPassed: ${String(result.routeHealthPublicPassed)}`);
  console.log(`- routeHealthAuthenticatedPassed: ${String(result.routeHealthAuthenticatedPassed)}`);
  console.log(`- productionSmokeHealthPassed: ${String(result.productionSmokeHealthPassed)}`);
  console.log(`- productionSmokeTargetsPassed: ${String(result.productionSmokeTargetsPassed)}`);
  console.log(`- replayProtocolLayerImplemented: ${String(result.replayProtocolLayerImplemented)}`);
  console.log(`- realFundsApprovalRecorded: ${String(result.realFundsApprovalRecorded)}`);
  console.log(`- realFundsAllowedNow: ${String(result.realFundsAllowedNow)}`);
  console.log(`- realFundsApprovalWindowStatus: ${result.realFundsApprovalWindowStatus}`);
  console.log(`- privacyClaimAllowed: ${String(result.privacyClaimAllowed)}`);
  console.log(`- productionReady: ${String(result.productionReady)}`);
}

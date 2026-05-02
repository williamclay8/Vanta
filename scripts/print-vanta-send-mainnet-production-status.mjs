import { strict as assert } from "node:assert";

import { createVantaSendMainnetProductionStatus } from "../src/readiness/sendMainnetProductionStatus.mjs";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

const status = createVantaSendMainnetProductionStatus();

if (checkMode) {
  assert.equal(status.version, "vanta-send-mainnet-production-status-0.1");
  assert.equal(status.activePrivacyRailId, "vanta-private-pool-v2");
  assert.equal(status.status, "blocked");
  assert.equal(status.mainnetReady, false);
  assert.equal(status.productionReady, false);
  assert.equal(status.privacyClaimAllowed, false);
  assert.equal(status.localLaneCovered, true);
  assert.equal(status.actualPrivateSpendCircuitCovered, true);
  assert.equal(status.noFundsOperatorEndpointCovered, true);
  assert.equal(status.liveSettlementProven, false);
  assert.equal(status.boundedApprovalActive, false);
  assert.ok(
    status.blockers.includes("no-reviewed-live-mainnet-send-settlement-evidence"),
    "Send production status must expose the missing reviewed live settlement blocker.",
  );
  assert.ok(
    status.blockers.includes("bounded-approval-window-expired") ||
      status.blockers.includes("bounded-approval-window-scheduled") ||
      status.blockers.includes("stop-condition-already-fired-for-approval-window") ||
      status.boundedApprovalActive,
    "Send production status must expose current bounded approval truth.",
  );
  assert.ok(
    status.blockers.includes("no-proven-audited-shared-anonymity-set"),
    "Send production status must preserve audited/shared anonymity-set truth.",
  );
  assert.equal(status.evidenceRefs.actualPrivateSpendCircuit, "npm run private-pool-v2:actual-private-spend-circuit-check");
  assert.equal(status.evidenceRefs.privatePoolV2Verify, "npm run private-pool-v2:verify");
  assert.ok(status.truth.includes("must not be called mainnet-production-private"));
  assert.ok(status.safety.includes("No auth tokens"));
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(status, null, 2));
} else {
  console.log("Vanta Send mainnet production status");
  console.log(`- status: ${status.status}`);
  console.log(`- localLaneCovered: ${String(status.localLaneCovered)}`);
  console.log(`- actualPrivateSpendCircuitCovered: ${String(status.actualPrivateSpendCircuitCovered)}`);
  console.log(`- noFundsOperatorEndpointCovered: ${String(status.noFundsOperatorEndpointCovered)}`);
  console.log(`- liveSettlementProven: ${String(status.liveSettlementProven)}`);
  console.log(`- boundedApprovalActive: ${String(status.boundedApprovalActive)}`);
  console.log(`- productionReady: ${String(status.productionReady)}`);
  console.log(`- blockers: ${status.blockers.join(", ")}`);
}

import { strict as assert } from "node:assert";

import { createVantaSwapMainnetProductionStatus } from "../src/readiness/swapMainnetProductionStatus.mjs";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

const status = createVantaSwapMainnetProductionStatus();

if (checkMode) {
  assert.equal(status.version, "vanta-swap-mainnet-production-status-0.1");
  assert.equal(status.activePrivacyRailId, "vanta-private-pool-v2");
  assert.equal(status.status, "blocked");
  assert.equal(status.mainnetReady, false);
  assert.equal(status.productionReady, false);
  assert.equal(status.privacyClaimAllowed, false);
  assert.equal(status.localLaneCovered, true);
  assert.equal(status.localSwapProofBoundaryCovered, true);
  assert.equal(status.committedSettlementCovered, true);
  assert.equal(status.localAtomicMutationCovered, true);
  assert.equal(status.noFundsOperatorEndpointCovered, true);
  assert.equal(status.turnkeyLiquiditySignerDryRunCovered, true);
  assert.equal(status.quoteRoutePrivacyProven, false);
  assert.equal(status.liveVenuePrivacyProven, false);
  assert.equal(status.liveSettlementProven, false);
  assert.equal(status.boundedApprovalActive, false);
  assert.ok(
    status.blockers.includes("swap-quote-route-privacy-not-production-proven"),
    "Swap production status must expose the quote/route privacy blocker.",
  );
  assert.ok(
    status.blockers.includes("swap-live-venue-privacy-not-production-proven"),
    "Swap production status must expose the live venue privacy blocker.",
  );
  assert.ok(
    status.blockers.includes("no-reviewed-live-mainnet-swap-settlement-evidence"),
    "Swap production status must expose the missing reviewed live settlement blocker.",
  );
  assert.ok(
    status.blockers.includes("bounded-approval-window-expired") ||
      status.blockers.includes("bounded-approval-window-scheduled") ||
      status.blockers.includes("stop-condition-already-fired-for-approval-window") ||
      status.boundedApprovalActive,
    "Swap production status must expose current bounded approval truth.",
  );
  assert.ok(
    status.blockers.includes("no-proven-audited-shared-anonymity-set"),
    "Swap production status must preserve audited/shared anonymity-set truth.",
  );
  assert.equal(status.evidenceRefs.swapCommittedSettlement, "npm run swap:committed-settlement-check");
  assert.equal(status.evidenceRefs.swapTrustPacket, "npm run swap:trust-packet-check");
  assert.equal(
    status.evidenceRefs.turnkeyLiquiditySignerDryRun,
    "npm run swap:turnkey-liquidity-signer-dry-run-check",
  );
  assert.equal(status.evidenceRefs.swapCircuit, "npm run private-pool-v2:swap-to-shielded-circuit-check");
  assert.equal(status.evidenceRefs.privatePoolV2Verify, "npm run private-pool-v2:verify");
  assert.ok(status.truth.includes("must not be called mainnet-production-ready"));
  assert.ok(status.safety.includes("No auth tokens"));
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(status, null, 2));
} else {
  console.log("Vanta Swap mainnet production status");
  console.log(`- status: ${status.status}`);
  console.log(`- localLaneCovered: ${String(status.localLaneCovered)}`);
  console.log(`- localSwapProofBoundaryCovered: ${String(status.localSwapProofBoundaryCovered)}`);
  console.log(`- committedSettlementCovered: ${String(status.committedSettlementCovered)}`);
  console.log(`- localAtomicMutationCovered: ${String(status.localAtomicMutationCovered)}`);
  console.log(`- noFundsOperatorEndpointCovered: ${String(status.noFundsOperatorEndpointCovered)}`);
  console.log(`- turnkeyLiquiditySignerDryRunCovered: ${String(status.turnkeyLiquiditySignerDryRunCovered)}`);
  console.log(`- quoteRoutePrivacyProven: ${String(status.quoteRoutePrivacyProven)}`);
  console.log(`- liveVenuePrivacyProven: ${String(status.liveVenuePrivacyProven)}`);
  console.log(`- liveSettlementProven: ${String(status.liveSettlementProven)}`);
  console.log(`- boundedApprovalActive: ${String(status.boundedApprovalActive)}`);
  console.log(`- productionReady: ${String(status.productionReady)}`);
  console.log(`- blockers: ${status.blockers.join(", ")}`);
}

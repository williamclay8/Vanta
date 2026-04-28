import { strict as assert } from "node:assert";
import { createStrategyPrivateRailPrivacyReadiness } from "../src/strategy/strategyPrivateRailReadiness.mjs";

const readiness = createStrategyPrivateRailPrivacyReadiness({
  committedSettlementRequestReady: true,
  durableProductionServicesReady: false,
  independentAuditReady: false,
  liveMainnetSettlementReady: false,
  liveStrategySchedulerReady: false,
  productionAnonymitySetReady: false,
  redactedHandoffReady: true,
  relayerSeparationReady: false,
  routeQuotePrivacyReady: false,
});

assert.equal(readiness.version, "vanta-strategy-private-rail-readiness-0.1");
assert.equal(readiness.kind, "vanta-strategy-private-rail-readiness");
assert.equal(readiness.failClosed, true);
assert.equal(readiness.gateCommand, "npm run strategy:privacy-readiness-check");
assert.equal(readiness.localRedactedHandoffReady, true);
assert.equal(readiness.localCommittedRequestReady, true);
assert.equal(readiness.localCapabilities.redactedHandoffReady, true);
assert.equal(readiness.localCapabilities.committedSettlementRequestReady, true);
assert.equal(readiness.strictReady, false);
assert.equal(readiness.fullyPrivateStrategyClaimAllowed, false);
assert.equal(readiness.livePrivateStrategyExecutionClaimAllowed, false);
assert.equal(readiness.liveProductionClaimAllowed, false);
assert.equal(readiness.mainnetReady, false);
assert.ok(readiness.blockers.includes("live-strategy-scheduler"));
assert.ok(readiness.blockers.includes("route-quote-privacy"));
assert.ok(readiness.blockers.includes("production-anonymity-set"));
assert.ok(readiness.blockers.includes("independent-audit"));
assert.ok(readiness.blockers.includes("live-mainnet-settlement"));
assert.ok(readiness.blockers.includes("durable-production-services"));
assert.ok(readiness.blockers.includes("relayer-separation"));

console.log("Vanta Strategy privacy readiness check: PASS");

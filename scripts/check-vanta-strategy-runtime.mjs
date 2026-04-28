import { strict as assert } from "node:assert";
import { createVantaStrategyRuntime } from "../src/strategy/strategyRuntime.mjs";

const runtime = createVantaStrategyRuntime();

const input = {
  clientRequestId: "strategy-runtime-check-1",
  destination: "Vanta private balance",
  fundingSource: "Vanta private balance",
  landingMode: "Protected landing",
  maxSlippageBps: 50,
  mode: "Stealth DCA",
  pair: "USDC -> SOL",
  seed: "runtime-check",
  side: "Buy",
  slicePolicy: "Randomized sizing",
  timingPolicy: "Randomized cadence",
  timeWindow: "6 hours",
  totalNotional: 60000,
  urgency: "Low footprint",
};

const created = runtime.createStrategy(input);
assert.equal(created.object, "strategy");
assert.equal(created.status, "ready");
assert.equal(created.executionPreview.liveSubmission, false);
assert.equal(created.executionPreview.childJobs.length, created.plan.childOrders.length);
assert.equal(created.executionPreview.childJobs[0].landing.transport, "Jito");

const operatorRun = runtime.createPrivateRailOperatorRun({
  committedSettlementRequests: {
    liveSubmission: false,
    requests: [
      {
        action: "send",
        economicsMode: "committed-economics",
        quoteHandleCommitment: "0x3333333333333333333333333333333333333333333333333333333333333333",
        routeHandleCommitment: "0x1111111111111111111111111111111111111111111111111111111111111111",
        settlementId: "strategy-runtime-check-send",
      },
      {
        action: "swap",
        economicsMode: "committed-economics",
        quoteHandleCommitment: "0x2222222222222222222222222222222222222222222222222222222222222222",
        routeHandleCommitment: "0x4444444444444444444444444444444444444444444444444444444444444444",
        settlementId: "strategy-runtime-check-swap",
      },
    ],
    version: "vanta-strategy-private-rail-committed-settlement-0.1",
  },
  operatorHandoff: {
    liveSubmission: false,
    operatorPackets: [{ privateCoreBoundary: "local-private-core-send-swap-composition-v0" }],
    operatorPlaintextStrategyShared: false,
    privateRailBoundary: "local-private-core-send-swap-composition-v0",
    trustContract: {
      claimControls: {
        fullyPrivateStrategyClaim: false,
        productionPrivacyClaimsLocked: true,
      },
      currentTruth: "hash-bound proof-public Strategy rail preview",
      operatorPacketFields: [],
      redactedFields: [],
      verificationSurfaces: [],
      version: "vanta-strategy-private-rail-trust-contract-0.1",
    },
    version: "vanta-strategy-private-rail-operator-handoff-0.1",
  },
  strategyId: created.id,
});
assert.equal(operatorRun.object, "strategy_private_rail_operator_run");
assert.equal(operatorRun.status, "queued");
assert.equal(operatorRun.liveSubmission, false);
assert.equal(operatorRun.operatorPlaintextStrategyShared, false);
assert.equal(operatorRun.committedSettlementRequestCount, 2);
assert.equal(operatorRun.schedulerQueueStatus, "queued-local-preview");
assert.deepEqual(operatorRun.blockers, [
  "live-strategy-scheduler-not-enabled",
  "live-venue-route-quote-privacy-not-production-proven",
  "production-anonymity-set-not-proven",
  "audit-and-mainnet-gates-not-cleared",
]);

const drainPreview = runtime.createPrivateRailSchedulerDrainPreview();
assert.equal(drainPreview.object, "strategy_private_rail_scheduler_drain_preview");
assert.equal(drainPreview.liveSubmission, false);
assert.equal(drainPreview.status, "blocked_before_live_submission");
assert.equal(drainPreview.queueDepth, 1);
assert.deepEqual(drainPreview.operatorRunIds, [operatorRun.id]);
assert.deepEqual(drainPreview.blockers, operatorRun.blockers);
assert.equal(drainPreview.durableStorage.status, "local-in-memory-only");
assert.equal(drainPreview.durableStorage.productionReady, false);
assert.equal(drainPreview.drainPreview[0].wouldSubmitLive, false);
assert.equal(drainPreview.drainPreview[0].operatorRunId, operatorRun.id);

const replayedOperatorRun = runtime.createPrivateRailOperatorRun({
  committedSettlementRequests: operatorRun.committedSettlementRequests,
  operatorHandoff: operatorRun.operatorHandoff,
  strategyId: created.id,
});
assert.equal(replayedOperatorRun.id, operatorRun.id, "identical private-rail operator run should be idempotent");
assert.equal(runtime.listPrivateRailOperatorRuns().length, 1);
assert.throws(
  () =>
    runtime.createPrivateRailOperatorRun({
      committedSettlementRequests: {
        ...operatorRun.committedSettlementRequests,
        requests: [
          {
            action: "send",
            amount: "1.00",
            economicsMode: "committed-economics",
            settlementId: "raw-leak",
          },
        ],
      },
      operatorHandoff: operatorRun.operatorHandoff,
      strategyId: created.id,
    }),
  /rejects raw amount/u,
);

const replay = runtime.createStrategy(input);
assert.equal(replay.id, created.id, "identical clientRequestId replay should return existing strategy");
assert.equal(runtime.listStrategies().length, 1, "idempotent replay should not duplicate strategy records");

assert.throws(
  () =>
    runtime.createStrategy({
      ...input,
      pair: "USDC -> JUP",
    }),
  /conflicts with existing strategy inputs/u,
  "mutated idempotent retry should reject",
);

const started = runtime.startStrategy(created.id);
assert.equal(started.status, "running");
assert.equal(started.executionPreview.childJobs[0].status, "ready");

const paused = runtime.pauseStrategy(created.id);
assert.equal(paused.status, "paused");

const canceled = runtime.cancelStrategy(created.id);
assert.equal(canceled.status, "canceled");
assert.throws(() => runtime.startStrategy(created.id), /Cannot start canceled strategy/u);

const poorRoute = runtime.createStrategy(
  {
    ...input,
    clientRequestId: "strategy-runtime-check-2",
    seed: "runtime-check-poor-route",
  },
  {
    routeQuality: "poor",
  },
);
assert.equal(poorRoute.status, "waiting");
assert.equal(poorRoute.executionPreview.childJobs[0].fallback.action, "defer");

assert.throws(() => runtime.getStrategy("missing"), /Unknown strategy/u);

console.log("Vanta strategy runtime check: PASS");

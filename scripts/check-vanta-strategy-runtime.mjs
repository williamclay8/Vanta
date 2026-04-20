import { strict as assert } from "node:assert";
import { createVantaStrategyRuntime } from "../src/strategy/strategyRuntime.mjs";

const runtime = createVantaStrategyRuntime();

const input = {
  clientRequestId: "strategy-runtime-check-1",
  destination: "Private balance",
  fundingSource: "Private balance",
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

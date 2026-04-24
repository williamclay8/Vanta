import { strict as assert } from "node:assert";
import { createStrategyExecutionPreview } from "../src/strategy/strategyExecutionAdapter.mjs";
import { createStrategyPlan } from "../src/strategy/strategyPlanner.mjs";

const basePlan = createStrategyPlan({
  destination: "Vanta private balance",
  fundingSource: "Public wallet balance",
  landingMode: "Protected landing",
  maxSlippageBps: 50,
  mode: "Stealth DCA",
  pair: "USDC -> SOL",
  seed: "vanta-strategy-execution-check",
  side: "Buy",
  slicePolicy: "Randomized sizing",
  timingPolicy: "Randomized cadence",
  timeWindow: "6 hours",
  totalNotional: 60000,
  urgency: "Low footprint",
});

const preview = createStrategyExecutionPreview(basePlan, {
  currentSlippageBps: 42,
  protectedLandingAvailable: true,
  routeQuality: "healthy",
});

assert.equal(preview.version, "vanta-strategy-execution-adapter-0.1");
assert.equal(preview.liveSubmission, false, "strategy adapter must not live-submit in local preview mode");
assert.equal(preview.fundingStep.kind, "deposit-to-private-before-live-run");
assert.equal(preview.destinationSettlement.kind, "settle-acquired-asset-private");
assert.equal(preview.childJobs.length, basePlan.childOrders.length);
assert.equal(preview.childJobs[0].route.engine, "Jupiter");
assert.equal(preview.childJobs[0].route.control, "quote-build-submit");
assert.equal(preview.childJobs[0].landing.mode, "protected");
assert.equal(preview.childJobs[0].landing.transport, "Jito");
assert.equal(preview.childJobs[0].fallback.action, "execute");
assert.ok(preview.childJobs.every((job) => job.status === "ready"), "healthy preview jobs should be ready");

const poorRoutePreview = createStrategyExecutionPreview(basePlan, {
  currentSlippageBps: 42,
  protectedLandingAvailable: true,
  routeQuality: "poor",
});
assert.equal(poorRoutePreview.childJobs[0].status, "deferred");
assert.equal(poorRoutePreview.childJobs[0].fallback.action, "defer");

const slippagePreview = createStrategyExecutionPreview(basePlan, {
  currentSlippageBps: 75,
  protectedLandingAvailable: true,
  routeQuality: "healthy",
});
assert.equal(slippagePreview.childJobs[0].status, "skipped");
assert.equal(slippagePreview.childJobs[0].fallback.action, "skip");

const downgradedPreview = createStrategyExecutionPreview(basePlan, {
  currentSlippageBps: 42,
  protectedLandingAvailable: false,
  protectedLandingPolicy: "downgrade",
  routeQuality: "healthy",
});
assert.equal(downgradedPreview.childJobs[0].landing.mode, "standard");
assert.equal(downgradedPreview.childJobs[0].fallback.action, "downgrade-landing");

const retryPreview = createStrategyExecutionPreview(basePlan, {
  currentSlippageBps: 42,
  protectedLandingAvailable: false,
  protectedLandingPolicy: "retry",
  routeQuality: "healthy",
});
assert.equal(retryPreview.childJobs[0].status, "deferred");
assert.equal(retryPreview.childJobs[0].fallback.action, "retry-protected-landing");

console.log("Vanta strategy execution adapter check: PASS");

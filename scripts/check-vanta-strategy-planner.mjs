import { strict as assert } from "node:assert";
import { createStrategyPlan } from "../src/strategy/strategyPlanner.mjs";

const baseInput = {
  destination: "Vanta private balance",
  fundingSource: "Vanta private balance",
  landingMode: "Protected landing",
  maxSlippageBps: 50,
  mode: "Stealth DCA",
  pair: "USDC -> SOL",
  seed: "vanta-strategy-smoke",
  side: "Buy",
  slicePolicy: "Randomized sizing",
  timingPolicy: "Randomized cadence",
  timeWindow: "24 hours",
  totalNotional: 250000,
  urgency: "Low footprint",
};

const firstPlan = createStrategyPlan(baseInput);
const secondPlan = createStrategyPlan(baseInput);

assert.deepEqual(firstPlan, secondPlan, "strategy plans must be deterministic for the same seed");
assert.equal(firstPlan.routingPolicy.protectedLanding, true, "protected landing must stay enabled");
assert.equal(firstPlan.routingPolicy.destination, "Vanta private balance", "default destination should remain private");
assert.equal(firstPlan.fundingAction, "use-private-balance", "private funding should not add extra steps");
assert.ok(firstPlan.childOrders.length >= 6, "DCA should create multiple child orders");
assert.ok(
  new Set(firstPlan.childOrders.map((order) => order.notional.toFixed(2))).size > 1,
  "randomized sizing should not produce identical child order sizes",
);

const totalChildren = firstPlan.childOrders.reduce((sum, order) => sum + order.notional, 0);
assert.ok(
  Math.abs(totalChildren - baseInput.totalNotional) < 0.01,
  "child order notional should reconcile to total size",
);

const publicFundedPlan = createStrategyPlan({
  ...baseInput,
  fundingSource: "Public wallet balance",
});
assert.equal(
  publicFundedPlan.fundingAction,
  "deposit-to-private-before-live-run",
  "public wallet funding should require a private-balance deposit before a live run",
);

const twapPlan = createStrategyPlan({
  ...baseInput,
  mode: "Private TWAP",
  slicePolicy: "Fixed count",
  timingPolicy: "Evenly spaced",
  urgency: "Balanced",
});
assert.equal(twapPlan.routingPolicy.allowRfq, true, "Private TWAP should allow RFQ-style routing");
assert.equal(twapPlan.childOrders.length, 24, "24 hour TWAP should create hourly child orders");

const customWindowPlan = createStrategyPlan({
  ...baseInput,
  timeWindow: "36 hours",
});
assert.equal(customWindowPlan.windowHours, 36, "custom hour windows should drive the strategy duration");

const customDayWindowPlan = createStrategyPlan({
  ...baseInput,
  timeWindow: "3 days",
});
assert.equal(customDayWindowPlan.windowHours, 72, "custom day windows should drive the strategy duration");

for (const slicePolicy of ["Min/max child size", "Venue threshold"]) {
  assert.throws(
    () => createStrategyPlan({ ...baseInput, slicePolicy }),
    /not selectable until Y4 lands/u,
    `${slicePolicy} must not silently fall through to the default strategy planner.`,
  );
}

for (const timingPolicy of ["Volatility-aware", "Liquidity-aware"]) {
  assert.throws(
    () => createStrategyPlan({ ...baseInput, timingPolicy }),
    /not selectable until Y4 lands/u,
    `${timingPolicy} must not silently fall through to the default strategy planner.`,
  );
}

assert.throws(
  () => createStrategyPlan({ ...baseInput, totalNotional: 0 }),
  /totalNotional must be positive/u,
  "invalid notional should fail before execution",
);

console.log("Vanta strategy planner check: PASS");

import assert from "node:assert/strict";
import {
  VANTA_PRICING_COPY,
  VANTA_PRICING_CONTRACT,
  describePricingForSurface,
  shouldChargeVantaFee,
} from "../src/pricing/vantaPricing.ts";

assert.equal(VANTA_PRICING_CONTRACT.monthlyFeeUsd, 0);
assert.equal(VANTA_PRICING_CONTRACT.successFeeBps, 25);
assert.equal(VANTA_PRICING_CONTRACT.successFeeRateDisplay, "0.25%");
assert.deepEqual(VANTA_PRICING_CONTRACT.passThroughCostLabels, [
  "Network fees",
  "Off-ramp fees",
  "Third-party execution costs",
]);

assert.equal(
  VANTA_PRICING_COPY.headline,
  "0 monthly fee. 0.25% only when a supported action completes successfully.",
);
assert.equal(
  VANTA_PRICING_COPY.supporting,
  "Vanta only charges when a supported product action completes successfully.",
);
assert.equal(
  VANTA_PRICING_COPY.passThrough,
  "Network, off-ramp, and third-party execution costs are shown separately when they apply.",
);
assert.equal(
  VANTA_PRICING_COPY.tokenRoadmap,
  "$VANTA should be utility-first. Any later buyback policy should use a defined share of Vanta-collected net transaction fees rather than all gross fees.",
);

assert.equal(shouldChargeVantaFee({ surface: "pay", status: "settled" }), true);
assert.equal(shouldChargeVantaFee({ surface: "pay", status: "preview_only" }), false);
assert.equal(shouldChargeVantaFee({ surface: "strategy", status: "preview_only" }), false);
assert.equal(shouldChargeVantaFee({ surface: "strategy", status: "submitted" }), false);
assert.equal(shouldChargeVantaFee({ surface: "strategy", status: "settled" }), false);
assert.equal(shouldChargeVantaFee({ surface: "strategy", status: "executed" }), false);
assert.equal(shouldChargeVantaFee({ surface: "strategy", status: "completed" }), false);
assert.equal(shouldChargeVantaFee({ surface: "dashboard", status: "read_only" }), false);

assert.deepEqual(describePricingForSurface("pay"), {
  feeLabel: "0.25% on verified supported payment actions after preview",
  passThroughLabel: "Network, off-ramp, and third-party execution costs stay separate.",
  shouldShowLiveFeeCopy: true,
});

assert.deepEqual(describePricingForSurface("strategy"), {
  feeLabel: "No fee while Strategy remains preview-only.",
  passThroughLabel: "If live execution ships later, external execution costs should stay separate.",
  shouldShowLiveFeeCopy: false,
});

console.log("Vanta pricing contract check: PASS");

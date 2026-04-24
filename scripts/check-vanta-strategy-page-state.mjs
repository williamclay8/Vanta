import { strict as assert } from "node:assert";
import { createVantaStrategyRuntime } from "../src/strategy/strategyRuntime.mjs";
import {
  STRATEGY_CUSTOM_TIME_WINDOW,
  createStrategyCapabilityCopy,
  createStrategyCapabilityState,
  createStrategyClientRequestId,
  createStrategyFormErrors,
  createStrategyResultState,
  parseStrategyAmount,
  parseStrategyCustomDuration,
  parseStrategySlippageBps,
  strategyFundingSources,
} from "../src/strategy/strategyPageState.ts";

assert.equal(STRATEGY_CUSTOM_TIME_WINDOW, "Custom");
assert.deepEqual(strategyFundingSources, ["Private balance", "Public balance", "External wallet"]);

assert.equal(parseStrategyAmount("250000").value, 250000);
assert.equal(parseStrategyAmount("").error, "Enter an amount to preview this strategy.");
assert.equal(parseStrategyAmount("").value, null);

assert.equal(parseStrategySlippageBps("0.50%").value, 50);
assert.equal(parseStrategySlippageBps("oops").error, "Enter a valid max slippage percentage.");
assert.equal(parseStrategySlippageBps("oops").value, null);
assert.equal(parseStrategySlippageBps("").error, "Enter a valid max slippage percentage.");
assert.equal(parseStrategySlippageBps("").value, null);
assert.equal(parseStrategySlippageBps("0%").error, "Enter a valid max slippage percentage.");
assert.equal(parseStrategySlippageBps("0%").value, null);

assert.equal(parseStrategyCustomDuration("12 hours").value, "12 hours");
assert.equal(parseStrategyCustomDuration("12h").value, "12 hours");
assert.equal(parseStrategyCustomDuration("36 hr").value, "36 hours");
assert.equal(parseStrategyCustomDuration("3d").value, "3 days");
assert.equal(parseStrategyCustomDuration("later").error, "Use a duration like 12 hours or 3 days.");
assert.equal(parseStrategyCustomDuration("later").value, null);

assert.deepEqual(
  createStrategyFormErrors({
    amount: "",
    customTimeWindow: "later",
    maxSlippage: "oops",
    timeWindow: STRATEGY_CUSTOM_TIME_WINDOW,
  }),
  {
    amount: "Enter an amount to preview this strategy.",
    customTimeWindow: "Use a duration like 12 hours or 3 days.",
    maxSlippage: "Enter a valid max slippage percentage.",
  },
);

assert.deepEqual(
  createStrategyCapabilityState({
    destination: "Public wallet",
    fundingSource: strategyFundingSources[1],
    hasErrors: false,
    isBetaMode: true,
  }),
  {
    blockingIssues: [
      "Live execution is unavailable in this environment.",
      "Move funds into your private balance before execution.",
    ],
    ctaLabel: "Review strategy plan",
    destination: "Public wallet",
    fundingSource: strategyFundingSources[1],
    livePrerequisitesMet: false,
    mode: "preview_only",
    requiresPrivateFunding: true,
    submitDisabled: false,
  },
);

assert.equal(
  createStrategyCapabilityState({
    destination: "Treasury vault",
    fundingSource: "Private balance",
    hasErrors: true,
    isBetaMode: true,
  }).mode,
  "preview_only",
);
assert.equal(
  createStrategyCapabilityState({
    destination: "Treasury vault",
    fundingSource: "Private balance",
    hasErrors: true,
    isBetaMode: true,
  }).submitDisabled,
  true,
);
assert.deepEqual(
  createStrategyCapabilityState({
    destination: "Private balance",
    fundingSource: strategyFundingSources[2],
    hasErrors: false,
    isBetaMode: false,
  }),
  {
    blockingIssues: ["Connect and fund the required wallet before execution."],
    ctaLabel: "Review strategy plan",
    destination: "Private balance",
    fundingSource: strategyFundingSources[2],
    livePrerequisitesMet: false,
    mode: "preview_only",
    requiresPrivateFunding: false,
    submitDisabled: false,
  },
);
assert.deepEqual(
  createStrategyCapabilityState({
    destination: "Private balance",
    fundingSource: strategyFundingSources[0],
    hasErrors: false,
    isBetaMode: false,
  }),
  {
    blockingIssues: [],
    ctaLabel: "Schedule strategy",
    destination: "Private balance",
    fundingSource: strategyFundingSources[0],
    livePrerequisitesMet: true,
    mode: "eligible_to_create",
    requiresPrivateFunding: false,
    submitDisabled: false,
  },
);

assert.deepEqual(createStrategyResultState({ capabilityMode: "preview_only" }), {
  kind: "local_plan_ready",
  summary: "This plan was created locally for review. Live execution is still off.",
  title: "Strategy plan ready",
});
assert.deepEqual(createStrategyResultState({ capabilityMode: "eligible_to_create" }), {
  kind: "scheduled_strategy",
  summary: "Your strategy was scheduled locally and is ready for execution.",
  title: "Strategy scheduled",
});

const strategyRuntime = createVantaStrategyRuntime();
const baseStrategyInput = {
  destination: "Private balance",
  fundingSource: "Private balance",
  landingMode: "Protected landing",
  maxSlippageBps: 50,
  mode: "Private TWAP",
  pair: "USDC -> SOL",
  seed: "vanta-strategy-ui",
  side: "Buy",
  slicePolicy: "Randomized sizing",
  timingPolicy: "Randomized cadence",
  timeWindow: "24 hours",
  totalNotional: 250000,
  urgency: "Low footprint",
};
const updatedStrategyInput = {
  ...baseStrategyInput,
  landingMode: "Bundle-preferred",
  slicePolicy: "Fixed count",
  timeWindow: "7 days",
  timingPolicy: "Evenly spaced",
};
const baseRequestId = createStrategyClientRequestId(baseStrategyInput);
const updatedRequestId = createStrategyClientRequestId(updatedStrategyInput);

assert.notEqual(baseRequestId, updatedRequestId);
assert.match(baseRequestId, /^strategy_v3_/u);
assert.equal(
  baseRequestId,
  'strategy_v3_{"destination":"Private balance","fundingSource":"Private balance","landingMode":"Protected landing","maxSlippageBps":50,"mode":"Private TWAP","pair":"USDC -> SOL","side":"Buy","slicePolicy":"Randomized sizing","timeWindow":"24 hours","timingPolicy":"Randomized cadence","totalNotional":250000,"urgency":"Low footprint"}',
);
assert.equal(
  updatedRequestId,
  'strategy_v3_{"destination":"Private balance","fundingSource":"Private balance","landingMode":"Bundle-preferred","maxSlippageBps":50,"mode":"Private TWAP","pair":"USDC -> SOL","side":"Buy","slicePolicy":"Fixed count","timeWindow":"7 days","timingPolicy":"Evenly spaced","totalNotional":250000,"urgency":"Low footprint"}',
);

strategyRuntime.createStrategy({
  ...baseStrategyInput,
  clientRequestId: baseRequestId,
});
assert.doesNotThrow(() =>
  strategyRuntime.createStrategy({
    ...updatedStrategyInput,
    clientRequestId: updatedRequestId,
  }),
);

assert.equal(
  createStrategyCapabilityCopy({ capabilityMode: "preview_only" }).actionHint,
  "Preview routing, funding, and landing behavior before any live execution is available.",
);
assert.equal(
  createStrategyCapabilityCopy({ capabilityMode: "eligible_to_create" }).actionHint,
  "Review routing, funding, and landing behavior before you schedule live execution.",
);

console.log("Vanta strategy page state check: PASS");

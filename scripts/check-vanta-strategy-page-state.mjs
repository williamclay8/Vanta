import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createStrategyPlan } from "../src/strategy/strategyPlanner.mjs";
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

const strategyPageSource = readFileSync(new URL("../src/pages/StrategyPage.tsx", import.meta.url), "utf8");
const strategyAdvancedPanelSource = readFileSync(
  new URL("../src/components/StrategyAdvancedPanel.tsx", import.meta.url),
  "utf8",
);
const comingSoonSlicePolicies = ["Min/max child size", "Venue threshold"];
const comingSoonTimingPolicies = ["Volatility-aware", "Liquidity-aware"];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function assertComingSoonDisabledOption(policy) {
  const disabledOptionPattern = new RegExp(
    `value:\\s*"${escapeRegExp(policy)}"[\\s\\S]{0,180}disabled:\\s*true[\\s\\S]{0,180}Coming soon`,
    "u",
  );
  assert.ok(disabledOptionPattern.test(strategyPageSource), `${policy} must render as a disabled Coming soon option.`);
}

assert.equal(STRATEGY_CUSTOM_TIME_WINDOW, "Custom");
assert.deepEqual(strategyFundingSources, ["Vanta private balance", "Public wallet"]);
assert.ok(
  !strategyFundingSources.includes("Connected wallet"),
  "Connected wallet must not remain as a separate funding source; use Public wallet.",
);
assert.ok(
  !strategyFundingSources.includes("Public wallet balance"),
  "Funding source copy must consolidate Public wallet balance into Public wallet.",
);
for (const policy of [...comingSoonSlicePolicies, ...comingSoonTimingPolicies]) {
  assertComingSoonDisabledOption(policy);
}
assert.ok(
  strategyAdvancedPanelSource.includes("disabled={option.disabled}") &&
    strategyAdvancedPanelSource.includes("{formatStrategySelectOptionLabel(option)}"),
  "Strategy selects must keep unimplemented policy options disabled with visible Coming soon labels.",
);

assert.equal(parseStrategyAmount("250000").value, 250000);
assert.equal(parseStrategyAmount("").error, "Enter an amount to review this strategy.");
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
    amount: "Enter an amount to review this strategy.",
    customTimeWindow: "Use a duration like 12 hours or 3 days.",
    maxSlippage: "Enter a valid max slippage percentage.",
  },
);

assert.deepEqual(
  createStrategyCapabilityState({
    destination: "Connected wallet",
    fundingSource: strategyFundingSources[1],
    hasErrors: false,
    isBetaMode: true,
  }),
  {
    blockingIssues: [
      "Live execution is unavailable in this environment.",
      "Shield funds from your public wallet into your Vanta private balance before live execution.",
    ],
    ctaLabel: "Preview strategy",
    destination: "Connected wallet",
    fundingSource: strategyFundingSources[1],
    livePrerequisitesMet: false,
    mode: "preview_only",
    requiresPrivateFunding: true,
    submitDisabled: false,
  },
);

assert.equal(
  createStrategyCapabilityState({
    destination: "Treasury wallet",
    fundingSource: "Vanta private balance",
    hasErrors: true,
    isBetaMode: true,
  }).mode,
  "preview_only",
);
assert.equal(
  createStrategyCapabilityState({
    destination: "Treasury wallet",
    fundingSource: "Vanta private balance",
    hasErrors: true,
    isBetaMode: true,
  }).submitDisabled,
  true,
);
assert.deepEqual(
  createStrategyCapabilityState({
    destination: "Vanta private balance",
    fundingSource: strategyFundingSources[0],
    hasErrors: false,
    isBetaMode: false,
  }),
  {
    blockingIssues: [],
    ctaLabel: "Preview strategy",
    destination: "Vanta private balance",
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
  summary: "Your strategy settings were saved locally. Live trading still needs a separate launch flow.",
  title: "Strategy settings saved",
});

const strategyRuntime = createVantaStrategyRuntime();
const baseStrategyInput = {
  destination: "Vanta private balance",
  fundingSource: "Vanta private balance",
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
for (const slicePolicy of comingSoonSlicePolicies) {
  assert.throws(
    () => createStrategyPlan({ ...baseStrategyInput, slicePolicy }),
    /not selectable until Y4 lands/u,
    `${slicePolicy} must fail before creating a silent inert strategy plan.`,
  );
}
for (const timingPolicy of comingSoonTimingPolicies) {
  assert.throws(
    () => createStrategyPlan({ ...baseStrategyInput, timingPolicy }),
    /not selectable until Y4 lands/u,
    `${timingPolicy} must fail before creating a silent inert strategy plan.`,
  );
}
assert.throws(
  () => createStrategyPlan({ ...baseStrategyInput, fundingSource: "Connected wallet" }),
  /consolidated into Public wallet/u,
  "Connected wallet must not survive as a direct planner funding source.",
);
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
assert.match(baseRequestId, /^strategy_v4_/u);
assert.equal(
  baseRequestId,
  'strategy_v4_{"destination":"Vanta private balance","fundingSource":"Vanta private balance","landingMode":"Protected landing","maxSlippageBps":50,"mode":"Private TWAP","pair":"USDC -> SOL","side":"Buy","slicePolicy":"Randomized sizing","timeWindow":"24 hours","timingPolicy":"Randomized cadence","totalNotional":250000,"urgency":"Low footprint"}',
);
assert.equal(
  updatedRequestId,
  'strategy_v4_{"destination":"Vanta private balance","fundingSource":"Vanta private balance","landingMode":"Bundle-preferred","maxSlippageBps":50,"mode":"Private TWAP","pair":"USDC -> SOL","side":"Buy","slicePolicy":"Fixed count","timeWindow":"7 days","timingPolicy":"Evenly spaced","totalNotional":250000,"urgency":"Low footprint"}',
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
  "Keep settings editable before any live execution is available.",
);
assert.equal(
  createStrategyCapabilityCopy({ capabilityMode: "eligible_to_create" }).actionHint,
  "Review source, route, and proceeds destination before any live run.",
);

console.log("Vanta strategy page state check: PASS");

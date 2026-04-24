# Strategy User Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/app/strategy` honest and useful by preserving the simple intent-first flow while adding truthful preview-only messaging, prerequisite guidance, inline validation, and stronger verification.

**Architecture:** Keep the existing Strategy page and planner/runtime seams, but introduce a small product-facing state layer for validation and capability truth. Drive CTA copy, prerequisite copy, preview language, and result-state language from that state instead of from ad hoc inline strings. Tighten both copy checks and browser checks so the page cannot drift back toward dead-end or overclaiming UX.

**Tech Stack:** React + TypeScript, existing Strategy planner/runtime `.mjs` modules, Vite, repo-native copy/browser check scripts

---

## File Structure

### New files

- `src/strategy/strategyPageState.ts`
  - Product-facing parsing, validation, prerequisite text, capability state, CTA copy, and result-state helpers for `/app/strategy`.
- `scripts/check-vanta-strategy-browser.mjs`
  - Narrow browser-backed verification for Strategy-specific flow outcomes and truthful result messaging.

### Files to modify

- `src/pages/StrategyPage.tsx`
  - Replace silent normalization with explicit validation, render prerequisite guidance, switch CTA/result-state wording to truthful preview-first language, and consume `strategyPageState` helpers.
- `src/styles.css`
  - Style inline validation, prerequisite panel, execution-availability messaging, and the new result-state panel while preserving Strategy visual language.
- `scripts/check-vanta-strategy-tab-copy.mjs`
  - Update required/banned copy to enforce the new truthful Strategy language.
- `scripts/check-vanta-protocol-browser.mjs`
  - Remove stale Strategy assertions and delegate Strategy-specific flow verification to the dedicated check or update expectations inline.
- `package.json`
  - Add `strategy:browser-check` and wire it into the stronger verification flow.

---

### Task 1: Add a product-facing Strategy state helper and lock its behavior with a check

**Files:**
- Create: `src/strategy/strategyPageState.ts`
- Create: `scripts/check-vanta-strategy-page-state.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing state check**

```js
import assert from "node:assert/strict";
import {
  createStrategyCapabilityState,
  createStrategyFormErrors,
  createStrategyResultState,
  parseStrategyAmount,
  parseStrategyCustomDuration,
  parseStrategySlippageBps,
} from "../src/strategy/strategyPageState.ts";

assert.equal(parseStrategyAmount("250000").value, 250000);
assert.equal(parseStrategyAmount("").error, "Enter an amount to preview this strategy.");
assert.equal(parseStrategySlippageBps("0.50%").value, 50);
assert.equal(parseStrategySlippageBps("oops").error, "Enter a valid max slippage percentage.");
assert.equal(parseStrategyCustomDuration("12 hours").value, "12 hours");
assert.equal(
  parseStrategyCustomDuration("later").error,
  "Use a duration like 12 hours or 3 days.",
);

const errors = createStrategyFormErrors({
  amount: "",
  customTimeWindow: "later",
  maxSlippage: "oops",
  timeWindow: "Custom",
});
assert.equal(errors.amount, "Enter an amount to preview this strategy.");
assert.equal(errors.maxSlippage, "Enter a valid max slippage percentage.");
assert.equal(errors.customTimeWindow, "Use a duration like 12 hours or 3 days.");

const previewOnly = createStrategyCapabilityState({
  destination: "Public wallet",
  fundingSource: "Public balance",
  hasErrors: false,
  isBetaMode: true,
});
assert.equal(previewOnly.mode, "preview_only");
assert.equal(previewOnly.requiresPrivateFunding, true);
assert.deepEqual(previewOnly.blockingIssues, [
  "Live execution is unavailable in this environment.",
  "Move funds into your private balance before execution.",
]);
assert.equal(previewOnly.ctaLabel, "Review strategy plan");

const invalidInput = createStrategyCapabilityState({
  destination: "Treasury vault",
  fundingSource: "Private balance",
  hasErrors: true,
  isBetaMode: true,
});
assert.equal(invalidInput.mode, "preview_only");
assert.equal(invalidInput.submitDisabled, true);

const localResult = createStrategyResultState({
  capabilityMode: "preview_only",
});
assert.deepEqual(localResult, {
  kind: "local_plan_ready",
  summary: "This plan was created locally for review. Live execution is still off.",
  title: "Strategy plan ready",
});

console.log("Vanta strategy page state check: PASS");
```

- [ ] **Step 2: Run the check to verify it fails**

Run: `node scripts/check-vanta-strategy-page-state.mjs`
Expected: FAIL because `src/strategy/strategyPageState.ts` does not exist yet.

- [ ] **Step 3: Add the minimal Strategy state helper**

```ts
export type StrategyCapabilityMode = "preview_only" | "eligible_to_create";

export type StrategyCapabilityState = {
  blockingIssues: string[];
  ctaLabel: string;
  destinationLabel: "Private balance" | "Public wallet" | "Treasury vault";
  fundingLabel: "Private balance" | "Public balance" | "External wallet";
  mode: StrategyCapabilityMode;
  requiresPrivateFunding: boolean;
  submitDisabled: boolean;
};

export type StrategyResultState =
  | {
      kind: "local_plan_ready";
      summary: string;
      title: string;
    }
  | {
      kind: "scheduled_strategy";
      summary: string;
      title: string;
    };

const DURATION_ERROR = "Use a duration like 12 hours or 3 days.";
const AMOUNT_ERROR = "Enter an amount to preview this strategy.";
const SLIPPAGE_ERROR = "Enter a valid max slippage percentage.";

function parseNumeric(rawValue: string, pattern: RegExp) {
  const parsed = Number(rawValue.replace(pattern, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseStrategyAmount(rawValue: string) {
  const parsed = parseNumeric(rawValue, /[$,\s]/gu);
  if (parsed === null || parsed <= 0) {
    return { error: AMOUNT_ERROR, value: null };
  }
  return { error: null, value: parsed };
}

export function parseStrategySlippageBps(rawValue: string) {
  const parsed = parseNumeric(rawValue, /[%\s]/gu);
  if (parsed === null || parsed <= 0) {
    return { error: SLIPPAGE_ERROR, value: null };
  }
  return { error: null, value: Math.round(parsed * 100) };
}

export function parseStrategyCustomDuration(rawValue: string) {
  const normalized = rawValue.trim().toLowerCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|d|day|days)$/u);
  if (!match) {
    return { error: DURATION_ERROR, value: null };
  }
  return { error: null, value: rawValue.trim() };
}

export function createStrategyFormErrors(input: {
  amount: string;
  customTimeWindow: string;
  maxSlippage: string;
  timeWindow: string;
}) {
  return {
    amount: parseStrategyAmount(input.amount).error,
    customTimeWindow:
      input.timeWindow === "Custom" ? parseStrategyCustomDuration(input.customTimeWindow).error : null,
    maxSlippage: parseStrategySlippageBps(input.maxSlippage).error,
  };
}

export function createStrategyCapabilityState(input: {
  destination: "Private balance" | "Public wallet" | "Treasury vault";
  fundingSource: "Private balance" | "Public balance" | "External wallet";
  hasErrors: boolean;
  isBetaMode: boolean;
}): StrategyCapabilityState {
  const blockingIssues = [];
  if (input.isBetaMode) {
    blockingIssues.push("Live execution is unavailable in this environment.");
  }
  if (input.fundingSource === "Public balance") {
    blockingIssues.push("Move funds into your private balance before execution.");
  }
  if (input.fundingSource === "External wallet") {
    blockingIssues.push("Connect and fund the required wallet before execution.");
  }

  return {
    blockingIssues,
    ctaLabel: input.isBetaMode ? "Review strategy plan" : "Create strategy",
    destinationLabel: input.destination,
    fundingLabel: input.fundingSource,
    mode: input.isBetaMode ? "preview_only" : "eligible_to_create",
    requiresPrivateFunding: input.fundingSource === "Public balance",
    submitDisabled: input.hasErrors,
  };
}

export function createStrategyResultState(input: {
  capabilityMode: StrategyCapabilityMode;
}): StrategyResultState {
  if (input.capabilityMode === "eligible_to_create") {
    return {
      kind: "scheduled_strategy",
      summary: "Vanta saved the strategy and will wait for eligible execution conditions.",
      title: "Strategy scheduled",
    };
  }

  return {
    kind: "local_plan_ready",
    summary: "This plan was created locally for review. Live execution is still off.",
    title: "Strategy plan ready",
  };
}
```

- [ ] **Step 4: Add the package script**

```json
{
  "scripts": {
    "strategy:browser-check": "node scripts/check-vanta-strategy-browser.mjs",
    "strategy:page-state-check": "node scripts/check-vanta-strategy-page-state.mjs"
  }
}
```

- [ ] **Step 5: Run the new state check**

Run: `npm run strategy:page-state-check`
Expected: PASS with `Vanta strategy page state check: PASS`

- [ ] **Step 6: Commit**

```bash
git add package.json src/strategy/strategyPageState.ts scripts/check-vanta-strategy-page-state.mjs
git commit -m "feat: add strategy page state helpers"
```

---

### Task 2: Update the Strategy page to use truthful capability, validation, and result-state messaging

**Files:**
- Modify: `src/pages/StrategyPage.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add a failing copy expectation for the new truthful language**

```js
const requiredCopy = [
  "Review strategy plan",
  "Strategy plan ready",
  "Live execution is unavailable in this environment.",
  "Move funds into your private balance before execution.",
];

const bannedCopy = [
  "Strategy queued",
  "Create strategy",
  "destination: private",
];
```

- [ ] **Step 2: Run the copy check to verify it fails**

Run: `npm run strategy-tab:copy-check`
Expected: FAIL because the current page still contains `Create strategy` and does not yet contain the new truthful copy.

- [ ] **Step 3: Refactor `StrategyPage.tsx` to consume the state helpers**

```tsx
import {
  createStrategyCapabilityState,
  createStrategyFormErrors,
  createStrategyResultState,
  parseStrategyAmount,
  parseStrategyCustomDuration,
  parseStrategySlippageBps,
} from "@/strategy/strategyPageState";

const formErrors = useMemo(
  () =>
    createStrategyFormErrors({
      amount: form.totalSize,
      customTimeWindow: form.customTimeWindow,
      maxSlippage: form.maxSlippage,
      timeWindow: form.timeWindow,
    }),
  [form.customTimeWindow, form.maxSlippage, form.timeWindow, form.totalSize],
);

const hasErrors = Object.values(formErrors).some(Boolean);
const capabilityState = useMemo(
  () =>
    createStrategyCapabilityState({
      destination: form.destination as "Private balance" | "Public wallet" | "Treasury vault",
      fundingSource: form.fundingSource as "Private balance" | "Public balance" | "External wallet",
      hasErrors,
      isBetaMode,
    }),
  [form.destination, form.fundingSource, hasErrors],
);

const parsedAmount = parseStrategyAmount(form.totalSize);
const parsedSlippage = parseStrategySlippageBps(form.maxSlippage);
const parsedDuration =
  form.timeWindow === "Custom"
    ? parseStrategyCustomDuration(form.customTimeWindow)
    : { error: null, value: effectiveTimeWindow };
```

- [ ] **Step 4: Replace silent fallbacks in plan creation with validation-aware values**

```tsx
const strategyPlan = useMemo<VantaStrategyPlan | null>(() => {
  if (!parsedAmount.value || !parsedSlippage.value || !parsedDuration.value) {
    return null;
  }

  return createStrategyPlan({
    destination: form.destination,
    fundingSource: form.fundingSource,
    landingMode: form.landingMode,
    maxSlippageBps: parsedSlippage.value,
    mode: form.mode,
    pair: strategyPair,
    seed: "vanta-strategy-preview",
    side: form.side,
    slicePolicy: form.slicePolicy,
    timingPolicy: form.timingPolicy,
    timeWindow: parsedDuration.value,
    totalNotional: parsedAmount.value,
    urgency: form.urgency,
  });
}, [form, parsedAmount.value, parsedDuration.value, parsedSlippage.value, strategyPair]);
```

- [ ] **Step 5: Render prerequisite and validation messaging before the CTA**

```tsx
<div className="strategy-prereq-card" role="status">
  <div className="strategy-funding-line">
    <span>Fund from</span>
    <strong>{capabilityState.fundingLabel}</strong>
  </div>
  <div className="strategy-funding-line">
    <span>Destination</span>
    <strong>{capabilityState.destinationLabel}</strong>
  </div>
  {capabilityState.blockingIssues.map((issue) => (
    <p className="strategy-inline-note" key={issue}>
      {issue}
    </p>
  ))}
</div>
```

- [ ] **Step 6: Replace the CTA and result panel with truthful preview-first copy**

```tsx
<button
  className="button button-primary strategy-primary-action"
  disabled={capabilityState.submitDisabled}
  type="submit"
>
  {capabilityState.ctaLabel}
</button>

<span>
  {capabilityState.mode === "preview_only"
    ? "Preview routing, funding, and landing behavior before any live execution is available."
    : `${strategyPair} · ${form.landingMode} · destination: ${capabilityState.destinationLabel}`}
</span>
```

```tsx
const resultState = createdStrategy
  ? createStrategyResultState({ capabilityMode: capabilityState.mode })
  : null;

{resultState ? (
  <section className="strategy-card strategy-card--secondary" role="status">
    <div className="strategy-card__header">
      <div>
        <span className="strategy-kicker">Result</span>
        <h2>{resultState.title}</h2>
      </div>
    </div>
    <p className="strategy-inline-note">{resultState.summary}</p>
  </section>
) : null}
```

- [ ] **Step 7: Add field-level error and prerequisite styles**

```css
.strategy-prereq-card {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
}

.strategy-inline-note {
  margin: 0;
  color: rgba(232, 250, 248, 0.76);
  font-size: 0.92rem;
}

.strategy-field-error {
  margin-top: 0.35rem;
  color: #f3a6a6;
  font-size: 0.82rem;
}
```

- [ ] **Step 8: Run verification**

Run:
- `npm run strategy-tab:copy-check`
- `npm run build`

Expected:
- copy check passes with the truthful CTA and result-state wording
- build passes

- [ ] **Step 9: Commit**

```bash
git add src/pages/StrategyPage.tsx src/styles.css scripts/check-vanta-strategy-tab-copy.mjs
git commit -m "feat: make strategy flow truthful and validation-aware"
```

---

### Task 3: Strengthen Strategy browser verification and stop relying on stale protocol-browser assertions

**Files:**
- Create: `scripts/check-vanta-strategy-browser.mjs`
- Modify: `scripts/check-vanta-protocol-browser.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing dedicated Strategy browser check**

```js
import { execFileSync, spawn } from "node:child_process";

const port = 4510;
const baseUrl = `http://127.0.0.1:${port}`;

const steps = [
  { action: "navigate", url: `${baseUrl}/app/strategy` },
  { action: "wait_for", condition: "network_idle" },
  {
    action: "assert",
    checks: [
      { kind: "url_contains", text: "/app/strategy" },
      { kind: "text_visible", text: "Review strategy plan" },
      { kind: "text_visible", text: "Live execution is unavailable in this environment." },
      { kind: "text_visible", text: "Fund from" },
      { kind: "text_visible", text: "Destination" },
      { kind: "no_console_errors" },
    ],
  },
  { action: "click", selector: ".strategy-primary-action" },
  {
    action: "assert",
    checks: [
      { kind: "text_visible", text: "Strategy plan ready" },
      {
        kind: "text_visible",
        text: "This plan was created locally for review. Live execution is still off.",
      },
      { kind: "no_console_errors" },
    ],
  },
];
```

- [ ] **Step 2: Run the browser check to verify it fails**

Run: `npm run strategy:browser-check`
Expected: FAIL because the current Strategy page still uses the older CTA/result-state wording.

- [ ] **Step 3: Implement the dedicated Strategy browser check and wire it into package scripts**

```json
{
  "scripts": {
    "strategy:browser-check": "node scripts/check-vanta-strategy-browser.mjs"
  }
}
```

- [ ] **Step 4: Remove stale Strategy assertions from the broad protocol browser check**

```js
{
  action: "assert",
  checks: [
    { kind: "url_contains", text: "/app/strategy" },
    { kind: "text_visible", text: "Strategy" },
    { kind: "text_visible", text: "Stealth DCA" },
    { kind: "text_visible", text: "Advanced settings" },
    { kind: "no_console_errors" },
  ],
},
```

Delete the stale assertions for:

```js
{ kind: "text_visible", text: "Create strategy" },
{ kind: "text_visible", text: "Active Strategies" },
{ kind: "text_visible", text: "Strategy queued" },
{ kind: "text_visible", text: "ready" },
```

- [ ] **Step 5: Run verification**

Run:
- `npm run strategy:browser-check`
- `npm run protocol:browser-check`

Expected:
- dedicated Strategy browser check passes against the truthful preview-first flow
- broad protocol browser check still passes without stale Strategy assertions

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/check-vanta-strategy-browser.mjs scripts/check-vanta-protocol-browser.mjs
git commit -m "test: harden strategy browser verification"
```

---

### Task 4: Tighten copy protections and run the full Strategy verification set

**Files:**
- Modify: `scripts/check-vanta-strategy-tab-copy.mjs`
- Modify: `package.json`

- [ ] **Step 1: Update the Strategy copy contract**

```js
const requiredCopy = [
  "Strategy",
  "Stealth DCA",
  "Private TWAP",
  "Review strategy plan",
  "Strategy plan ready",
  "Live execution is unavailable in this environment.",
  "Fund from",
  "Destination",
  "Move funds into your private balance before execution.",
  "Preview routing, funding, and landing behavior before any live execution is available.",
  "reduced on-chain observability",
];

const bannedCopy = [
  "Strategy queued",
  "Create strategy",
  "Active Strategies",
  "destination: private",
  "UTXO",
  "ZK",
  "completely invisible whale buying",
];
```

- [ ] **Step 2: Add the dedicated Strategy browser check to the stronger verification path**

```json
{
  "scripts": {
    "strategy:verify": "npm run strategy:page-state-check && npm run strategy-tab:copy-check && npm run strategy:browser-check"
  }
}
```

- [ ] **Step 3: Run the full Strategy verification set**

Run:
- `npm run strategy:verify`
- `npm run build`

Expected:
- all Strategy-specific checks pass
- build passes

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/check-vanta-strategy-tab-copy.mjs
git commit -m "test: add strategy verification bundle"
```

---

## Self-Review

### Spec coverage

- Preserve the simple intent-first flow: covered by Task 2.
- Add prerequisite guidance: covered by Task 2.
- Make preview-only truth explicit: covered by Tasks 1 and 2.
- Replace misleading CTA/result-state language: covered by Task 2.
- Add validation instead of silent fallback: covered by Tasks 1 and 2.
- Strengthen copy/browser verification: covered by Tasks 3 and 4.
- Keep Strategy secondary and non-protocol-heavy: enforced through Task 4 copy contract.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every code-changing step includes exact files and concrete snippets.
- Every verification step includes exact commands and expected outcomes.

### Type consistency

- `StrategyCapabilityState` and `StrategyResultState` are defined in Task 1 and used consistently in Task 2.
- The truthful preview-first labels in the spec match the required/banned copy in Task 4.

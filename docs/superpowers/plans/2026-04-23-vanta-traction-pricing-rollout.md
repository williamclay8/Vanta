# Vanta Traction Pricing Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roll out Vanta's launch-stage pricing contract across code, copy, and verification so the app truthfully presents `0 monthly fee` and `0.25%` only on successful supported actions.

**Architecture:** Introduce one small shared pricing contract module and one contract-check script, then drive Pay, landing, and Strategy pricing language from that shared source instead of ad hoc inline copy. Strengthen browser and doc-truth checks so preview-only surfaces cannot imply live billing or monthly SaaS packaging.

**Tech Stack:** React + TypeScript, existing Vite app pages, Node `.mjs` contract/doc/browser checks, package.json verification scripts, markdown docs

---

## File Structure

### New files

- `src/pricing/vantaPricing.ts`
  - Shared traction-pricing contract, copy helpers, action eligibility map, and `$VANTA` roadmap-safe wording.
- `scripts/check-vanta-pricing-contract.mjs`
  - Verifies the shared pricing module and high-risk copy markers stay aligned with the spec.
- `docs/superpowers/plans/2026-04-23-vanta-traction-pricing-rollout.md`
  - This implementation plan.

### Files to modify

- `src/pages/PayPage.tsx`
  - Render the pricing contract on the real Pay surface with pass-through clarification and preview-only billing truth.
- `src/pages/StrategyPage.tsx`
  - Render pricing language that stays honest in preview-only mode and never implies current live billing for planning.
- `src/pages/HomePage.tsx`
  - Add a concise pricing/value block to the landing page using the shared pricing contract.
- `src/data/site.ts`
  - Keep top-level product and roadmap copy aligned with the pricing contract and utility-first token roadmap.
- `scripts/check-vanta-pay-browser.mjs`
  - Assert pricing copy and pass-through language on `/app/pay`.
- `scripts/check-vanta-strategy-browser.mjs`
  - Assert preview-safe pricing language on `/app/strategy`.
- `scripts/check-vanta-landing-browser.mjs`
  - Assert the landing page shows the new pricing/value language and keeps it readable on desktop/mobile.
- `scripts/check-vanta-pay-doc-truth.mjs`
  - Extend doc truth requirements to include the pricing contract where Pay-facing docs mention product economics.
- `scripts/check-vanta-pay-tab-copy.mjs`
  - Add required pricing copy and ban monthly-fee/token-first language on the Pay page.
- `scripts/check-vanta-strategy-tab-copy.mjs`
  - Require preview-safe pricing copy and ban live-billing implication on Strategy.
- `README.md`
  - Add the canonical pricing sentence and pass-through clarification.
- `package.json`
  - Add a dedicated `pricing:contract-check` command and wire it into the relevant verification path.

---

### Task 1: Centralize the pricing contract and lock it with a dedicated check

**Files:**
- Create: `src/pricing/vantaPricing.ts`
- Create: `scripts/check-vanta-pricing-contract.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing pricing contract check**

```js
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
  VANTA_PRICING_COPY.passThrough,
  "Network, off-ramp, and third-party execution costs are shown separately when they apply.",
);

assert.equal(shouldChargeVantaFee({ surface: "pay", status: "settled" }), true);
assert.equal(shouldChargeVantaFee({ surface: "pay", status: "preview_only" }), false);
assert.equal(shouldChargeVantaFee({ surface: "strategy", status: "preview_only" }), false);
assert.equal(shouldChargeVantaFee({ surface: "strategy", status: "executed" }), true);
assert.equal(shouldChargeVantaFee({ surface: "dashboard", status: "read_only" }), false);

assert.deepEqual(describePricingForSurface("pay"), {
  feeLabel: "0.25% on successful settled payments",
  passThroughLabel: "Network, off-ramp, and third-party execution costs stay separate.",
  shouldShowLiveFeeCopy: true,
});

assert.deepEqual(describePricingForSurface("strategy"), {
  feeLabel: "No fee while Strategy remains preview-only.",
  passThroughLabel: "If live execution ships later, external execution costs should stay separate.",
  shouldShowLiveFeeCopy: false,
});

console.log("Vanta pricing contract check: PASS");
```

- [ ] **Step 2: Run the check to verify it fails**

Run: `node scripts/check-vanta-pricing-contract.mjs`
Expected: FAIL because `src/pricing/vantaPricing.ts` does not exist yet.

- [ ] **Step 3: Add the shared pricing contract module**

```ts
export type VantaPricedSurface =
  | "pay"
  | "shield"
  | "send"
  | "swap"
  | "unshield"
  | "strategy"
  | "dashboard";

export type VantaActionStatus =
  | "preview_only"
  | "submitted"
  | "settled"
  | "executed"
  | "completed"
  | "failed"
  | "read_only";

export const VANTA_PRICING_CONTRACT = {
  monthlyFeeUsd: 0,
  successFeeBps: 25,
  successFeeRateDisplay: "0.25%",
  passThroughCostLabels: ["Network fees", "Off-ramp fees", "Third-party execution costs"],
} as const;

export const VANTA_PRICING_COPY = {
  headline: "0 monthly fee. 0.25% only when a supported action completes successfully.",
  supporting:
    "Vanta only charges when a supported product action completes successfully.",
  passThrough:
    "Network, off-ramp, and third-party execution costs are shown separately when they apply.",
  tokenRoadmap:
    "$VANTA` should be utility-first. Any later buyback policy should use a defined share of Vanta-collected net transaction fees rather than all gross fees.",
} as const;

const LIVE_FEE_SURFACES = new Set<VantaPricedSurface>(["pay", "shield", "send", "swap", "unshield"]);

export function shouldChargeVantaFee(input: {
  surface: VantaPricedSurface;
  status: VantaActionStatus;
}) {
  if (input.surface === "dashboard") {
    return false;
  }
  if (input.surface === "strategy" && input.status === "preview_only") {
    return false;
  }
  if (!LIVE_FEE_SURFACES.has(input.surface) && input.surface !== "strategy") {
    return false;
  }
  return ["settled", "executed", "completed"].includes(input.status);
}

export function describePricingForSurface(surface: VantaPricedSurface) {
  if (surface === "strategy") {
    return {
      feeLabel: "No fee while Strategy remains preview-only.",
      passThroughLabel:
        "If live execution ships later, external execution costs should stay separate.",
      shouldShowLiveFeeCopy: false,
    };
  }

  if (surface === "dashboard") {
    return {
      feeLabel: "No monthly fee for dashboard access during the traction phase.",
      passThroughLabel: "No billing is attached to passive dashboard usage.",
      shouldShowLiveFeeCopy: false,
    };
  }

  const labelMap: Record<Exclude<VantaPricedSurface, "strategy" | "dashboard">, string> = {
    pay: "0.25% on successful settled payments",
    send: "0.25% on successful service-backed sends",
    shield: "0.25% on successful service-backed shield actions",
    swap: "0.25% on completed swaps routed through Vanta",
    unshield: "0.25% on successful exits when Vanta executes the release path",
  };

  return {
    feeLabel: labelMap[surface],
    passThroughLabel: "Network, off-ramp, and third-party execution costs stay separate.",
    shouldShowLiveFeeCopy: true,
  };
}
```

- [ ] **Step 4: Add the package script and verification hook**

```json
{
  "scripts": {
    "pricing:contract-check": "node scripts/check-vanta-pricing-contract.mjs",
    "pay:verify": "npm run pricing:contract-check && npm run pay:contract-check && npm run pay:status && npm run pay:status-json && npm run pay:merchant-trust-status-check && npm run pay:approval-packet-check && npm run pay-tab:copy-check && npm run pay:doc-truth-check && npm run pay:merchant-api-check && npm run pay:production-private-rail-guard-check && npm run pay:browser-check && npm run security:limitations-check && npm run operator:runbook-check && npm run build"
  }
}
```

- [ ] **Step 5: Run the new check**

Run: `npm run pricing:contract-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pricing/vantaPricing.ts scripts/check-vanta-pricing-contract.mjs package.json
git commit -m "feat: add shared traction pricing contract"
```

---

### Task 2: Put the pricing contract on the real Pay surface and lock it with browser/copy checks

**Files:**
- Modify: `src/pages/PayPage.tsx`
- Modify: `scripts/check-vanta-pay-browser.mjs`
- Modify: `scripts/check-vanta-pay-tab-copy.mjs`

- [ ] **Step 1: Extend the Pay browser check with failing pricing assertions**

```js
{
  action: "assert",
  checks: [
    { kind: "text_visible", text: "0 monthly fee" },
    { kind: "text_visible", text: "0.25% only when a supported action completes successfully." },
    {
      kind: "text_visible",
      text: "Network, off-ramp, and third-party execution costs are shown separately when they apply.",
    },
    { kind: "text_visible", text: "No billing starts from checkout preview alone." },
  ],
}
```

- [ ] **Step 2: Run the browser check to verify it fails**

Run: `npm run pay:browser-check`
Expected: FAIL because the current Pay surface does not render the pricing contract yet.

- [ ] **Step 3: Add required and banned Pay copy markers**

```js
const requiredCopy = [
  "Create payment link",
  "Send invoice",
  "Checkout",
  "Withdraw",
  "Pay with Vanta",
  "0 monthly fee",
  "0.25% only when a supported action completes successfully.",
  "Network, off-ramp, and third-party execution costs are shown separately when they apply.",
  "No billing starts from checkout preview alone.",
];

const bannedCopy = [
  "monthly SaaS",
  "Platform fee",
  "All fees buy back the token",
  "All fees go to VANTA",
];
```

- [ ] **Step 4: Render the pricing card in `src/pages/PayPage.tsx`**

```tsx
import { VANTA_PRICING_COPY, describePricingForSurface } from "@/pricing/vantaPricing";

const payPricing = describePricingForSurface("pay");

<aside className="pay-pricing-card" aria-label="Vanta pricing">
  <span className="pay-kicker">Pricing</span>
  <h3>{VANTA_PRICING_COPY.headline}</h3>
  <p>{payPricing.passThroughLabel}</p>
  <small>No billing starts from checkout preview alone.</small>
</aside>
```

- [ ] **Step 5: Place the pricing card next to the checkout and merchant console**

```tsx
<div className="pay-view pay-view--checkout">
  <article className="pay-checkout-card">{/* existing checkout card */}</article>
  <aside className="pay-merchant-console-panel" aria-label="Merchant control plane">
    {/* existing merchant panel */}
  </aside>
  <aside className="pay-pricing-card" aria-label="Vanta pricing">
    <span className="pay-kicker">Pricing</span>
    <h3>{VANTA_PRICING_COPY.headline}</h3>
    <p>{payPricing.passThroughLabel}</p>
    <small>No billing starts from checkout preview alone.</small>
  </aside>
</div>
```

- [ ] **Step 6: Run Pay verification**

Run:
- `npm run pay-tab:copy-check`
- `npm run pay:browser-check`

Expected:
- copy check passes
- browser check passes with the new pricing block

- [ ] **Step 7: Commit**

```bash
git add src/pages/PayPage.tsx scripts/check-vanta-pay-browser.mjs scripts/check-vanta-pay-tab-copy.mjs
git commit -m "feat: add traction pricing to pay surface"
```

---

### Task 3: Add pricing truth to Strategy and prevent preview-only billing drift

**Files:**
- Modify: `src/pages/StrategyPage.tsx`
- Modify: `scripts/check-vanta-strategy-browser.mjs`
- Modify: `scripts/check-vanta-strategy-tab-copy.mjs`

- [ ] **Step 1: Extend the Strategy browser check with failing pricing assertions**

```js
{
  action: "assert",
  checks: [
    { kind: "text_visible", text: "No fee while Strategy remains preview-only." },
    {
      kind: "text_visible",
      text: "If live execution ships later, external execution costs should stay separate.",
    },
    { kind: "text_hidden", text: "0.25% on successful strategy execution" },
  ],
}
```

- [ ] **Step 2: Run the Strategy browser check to verify it fails**

Run: `npm run strategy:browser-check`
Expected: FAIL because the Strategy page does not yet show preview-safe pricing language.

- [ ] **Step 3: Add required and banned Strategy copy markers**

```js
const requiredSharedCopy = [
  "Review strategy plan",
  "Strategy plan ready",
  "Live execution is unavailable in this environment.",
  "Move funds into your private balance before execution.",
  "Private balance",
  "No fee while Strategy remains preview-only.",
  "If live execution ships later, external execution costs should stay separate.",
];

const bannedSharedCopy = [
  "Create strategy",
  "0.25% on successful strategy execution",
];
```

- [ ] **Step 4: Render a Strategy pricing note from the shared contract**

```tsx
import { describePricingForSurface } from "@/pricing/vantaPricing";

const strategyPricing = describePricingForSurface("strategy");

<div className="strategy-pricing-note" aria-label="Strategy pricing">
  <strong>{strategyPricing.feeLabel}</strong>
  <span>{strategyPricing.passThroughLabel}</span>
</div>
```

- [ ] **Step 5: Place the note below prerequisite guidance and above the preview**

```tsx
<section className="strategy-prerequisites">
  {/* existing prerequisite content */}
</section>
<div className="strategy-pricing-note" aria-label="Strategy pricing">
  <strong>{strategyPricing.feeLabel}</strong>
  <span>{strategyPricing.passThroughLabel}</span>
</div>
<section className="strategy-preview">
  {/* existing preview content */}
</section>
```

- [ ] **Step 6: Run Strategy verification**

Run:
- `npm run strategy-tab:copy-check`
- `npm run strategy:browser-check`

Expected:
- copy check passes
- browser check passes and still shows preview-only truthful flow

- [ ] **Step 7: Commit**

```bash
git add src/pages/StrategyPage.tsx scripts/check-vanta-strategy-browser.mjs scripts/check-vanta-strategy-tab-copy.mjs
git commit -m "feat: add preview-safe pricing to strategy"
```

---

### Task 4: Add the pricing contract to the landing and top-level product copy

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/data/site.ts`
- Modify: `scripts/check-vanta-landing-browser.mjs`

- [ ] **Step 1: Add failing landing-browser assertions**

```js
if (!document.body.innerText.includes("0 monthly fee")) {
  throw new Error("Landing page must include the traction pricing headline.");
}

if (!document.body.innerText.includes("0.25% only when a supported action completes successfully.")) {
  throw new Error("Landing page must include the 0.25% success-fee contract.");
}

if (!document.body.innerText.includes("Network, off-ramp, and third-party execution costs are shown separately when they apply.")) {
  throw new Error("Landing page must clarify pass-through costs.");
}
```

- [ ] **Step 2: Run the landing browser check to verify it fails**

Run: `npm run landing:browser-check`
Expected: FAIL because the landing page does not show pricing yet.

- [ ] **Step 3: Add shared pricing/value content to `src/data/site.ts`**

```ts
export const tractionPricing = {
  headline: "0 monthly fee",
  rate: "0.25% only when a supported action completes successfully.",
  passThrough:
    "Network, off-ramp, and third-party execution costs are shown separately when they apply.",
  tokenRoadmap:
    "$VANTA is utility-first. Any later buyback policy should use a defined share of Vanta-collected net transaction fees.",
} as const;
```

- [ ] **Step 4: Render a pricing panel on the landing page**

```tsx
import { tractionPricing } from "@/data/site";

<section className="landing-minimal__panel" aria-label="Vanta pricing">
  <div className="landing-minimal__section-header">
    <span>Pricing</span>
    <h2>{tractionPricing.headline}</h2>
  </div>
  <div className="landing-minimal__points">
    <article className="landing-minimal__point">
      <strong>{tractionPricing.rate}</strong>
      <p>{tractionPricing.passThrough}</p>
    </article>
  </div>
</section>
```

- [ ] **Step 5: Run landing verification**

Run: `npm run landing:browser-check`
Expected: PASS on both desktop and mobile viewports.

- [ ] **Step 6: Commit**

```bash
git add src/pages/HomePage.tsx src/data/site.ts scripts/check-vanta-landing-browser.mjs
git commit -m "feat: add traction pricing to landing copy"
```

---

### Task 5: Align docs and verification commands with the pricing contract

**Files:**
- Modify: `README.md`
- Modify: `scripts/check-vanta-pay-doc-truth.mjs`
- Modify: `package.json`

- [ ] **Step 1: Extend the doc-truth check with failing pricing markers**

```js
const docChecks = [
  {
    path: "README.md",
    required: [
      "0 monthly fee",
      "0.25% only when a supported action completes successfully.",
      "Network, off-ramp, and third-party execution costs are shown separately when they apply.",
    ],
  },
];
```

- [ ] **Step 2: Run the doc-truth check to verify it fails**

Run: `npm run pay:doc-truth-check`
Expected: FAIL because the docs do not yet include the new pricing markers.

- [ ] **Step 3: Add the canonical pricing paragraph to `README.md`**

```md
## Launch pricing

Vanta's traction-stage pricing is simple:

- `0 monthly fee`
- `0.25%` only when a supported action completes successfully
- network, off-ramp, and third-party execution costs stay separate when they apply
```

- [ ] **Step 4: Add a compact pricing verify script**

```json
{
  "scripts": {
    "pricing:verify": "npm run pricing:contract-check && npm run pay:doc-truth-check && npm run landing:browser-check && npm run strategy:browser-check && npm run pay:browser-check && npm run build"
  }
}
```

- [ ] **Step 6: Run the full pricing verification**

Run: `npm run pricing:verify`
Expected:
- pricing contract check passes
- doc truth check passes
- landing, strategy, and pay browser checks pass
- build passes

- [ ] **Step 7: Commit**

```bash
git add README.md scripts/check-vanta-pay-doc-truth.mjs package.json
git commit -m "docs: align pricing contract across docs and verification"
```

---

## Self-Review

### Spec coverage

- One public launch pricing rule: covered by Task 1.
- Product-by-product fee truth for Pay and Strategy: covered by Tasks 2 and 3.
- Landing/product narrative alignment: covered by Task 4.
- Docs and verification-command-backed truth: covered by Task 5.
- Utility-first `$VANTA` roadmap restraint: covered by Tasks 1 and 5.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task includes exact files, commands, and concrete code snippets.
- Verification commands are explicit and repo-native.

### Type consistency

- Shared pricing names stay consistent across the plan:
  - `VANTA_PRICING_CONTRACT`
  - `VANTA_PRICING_COPY`
  - `describePricingForSurface`
  - `shouldChargeVantaFee`
- Surface names stay consistent:
  - `pay`
  - `shield`
  - `send`
  - `swap`
  - `unshield`
  - `strategy`
  - `dashboard`

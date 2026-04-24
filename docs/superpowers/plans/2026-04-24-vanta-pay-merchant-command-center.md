# Vanta Pay Merchant Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/app/pay` into a Merchant Command Center preview that combines payment creation, trust/privacy status, and read-only merchant operations without claiming production readiness.

**Architecture:** Add one typed UI summary module for command-center preview data, render it inside the existing Pay page, and strengthen browser/docs/copy checks so the visible product remains aligned with current Pay privacy and operability truth. Keep backend contracts untouched.

**Tech Stack:** React + TypeScript, existing Vite app, CSS in `src/styles.css`, Node `.mjs` browser/copy/doc checks, canonical Pay verification commands.

---

## File Structure

### New files

- `src/pay/vantaPayMerchantCommandCenter.ts`
  - Typed UI summary for trust rail, operations strip, privacy limitation, and beta posture.

### Files to modify

- `src/pages/PayPage.tsx`
  - Render the Merchant Command Center layout and form validation.
- `src/styles.css`
  - Style the command-center layout, trust rail, operations cards, validation states, and responsive behavior.
- `scripts/check-vanta-pay-browser.mjs`
  - Assert the new visible `/app/pay` product truth.
- `scripts/check-vanta-pay-tab-copy.mjs`
  - Keep commerce-first copy guardrails aligned with the new command-center language.
- `src/pages/DocsPayPage.tsx`
  - Update docs page truth for the new preview surface.
- `docs/pay-merchant-trust-surface.md`
  - Document the command-center preview and explicit limitations.
- `README.md`
  - Update the Pay summary if it still describes only the older minimal form.

## Task 1: Add Command Center Summary Contract

**Files:**
- Create: `src/pay/vantaPayMerchantCommandCenter.ts`
- Modify: `scripts/check-vanta-pay-contract.mjs`

- [ ] **Step 1: Add failing contract assertions**

In `scripts/check-vanta-pay-contract.mjs`, add checks that read `src/pay/vantaPayMerchantCommandCenter.ts` and require these exact strings:

```js
assertFileContains("src/pay/vantaPayMerchantCommandCenter.ts", [
  "vanta-pay-merchant-command-center-0.1",
  "Privacy readiness",
  "Production privacy claims are not enabled yet.",
  "No funds move in beta mode.",
  "Operator status",
  "Settlement queue",
  "Reconciliation",
]);
```

- [ ] **Step 2: Run the contract check to verify it fails**

Run: `npm run pay:contract-check`

Expected: FAIL because `src/pay/vantaPayMerchantCommandCenter.ts` does not exist yet.

- [ ] **Step 3: Create the typed command-center summary**

Create `src/pay/vantaPayMerchantCommandCenter.ts`:

```ts
export type VantaPayCommandCenterTone = "ready" | "preview" | "blocked";

export type VantaPayCommandCenterItem = {
  label: string;
  value: string;
  detail: string;
  tone: VantaPayCommandCenterTone;
};

export type VantaPayMerchantCommandCenter = {
  version: "vanta-pay-merchant-command-center-0.1";
  betaNotice: string;
  trustRail: readonly VantaPayCommandCenterItem[];
  operations: readonly VantaPayCommandCenterItem[];
};

export const VANTA_PAY_MERCHANT_COMMAND_CENTER = {
  version: "vanta-pay-merchant-command-center-0.1",
  betaNotice: "No funds move in beta mode.",
  trustRail: [
    {
      label: "Route preview",
      value: "Payment path preview",
      detail: "The merchant sees the payment route before execution.",
      tone: "preview",
    },
    {
      label: "Receipt preview",
      value: "Receipt path preview",
      detail: "Receipt state stays visible before any live settlement claim.",
      tone: "preview",
    },
    {
      label: "Privacy readiness",
      value: "Claims blocked",
      detail: "Production privacy claims are not enabled yet.",
      tone: "blocked",
    },
  ],
  operations: [
    {
      label: "Operator status",
      value: "Local operator preview",
      detail: "Pay status and merchant API checks remain the source of truth.",
      tone: "preview",
    },
    {
      label: "Settlement queue",
      value: "Awaiting approval packet",
      detail: "Preview, approve, execute, and settle stay separate.",
      tone: "preview",
    },
    {
      label: "Reconciliation",
      value: "Receipt records preview",
      detail: "Exports remain a checked backend surface in this beta.",
      tone: "preview",
    },
  ],
} as const satisfies VantaPayMerchantCommandCenter;
```

- [ ] **Step 4: Run the contract check**

Run: `npm run pay:contract-check`

Expected: PASS.

## Task 2: Render The Merchant Command Center UI

**Files:**
- Modify: `src/pages/PayPage.tsx`
- Modify: `src/styles.css`
- Modify: `scripts/check-vanta-pay-browser.mjs`

- [ ] **Step 1: Add failing browser assertions**

In `scripts/check-vanta-pay-browser.mjs`, update the first assertion group so the Pay page must show:

```js
{ kind: "text_visible", text: "Merchant command center" },
{ kind: "text_visible", text: "Create a payment request" },
{ kind: "text_visible", text: "Trust rail" },
{ kind: "text_visible", text: "Privacy readiness" },
{ kind: "text_visible", text: "Production privacy claims are not enabled yet." },
{ kind: "text_visible", text: "Operations" },
{ kind: "text_visible", text: "Operator status" },
{ kind: "text_visible", text: "Settlement queue" },
{ kind: "text_visible", text: "Reconciliation" },
```

Keep the existing assertions for `Vanta Beta`, `No funds move in this mode`, disabled CTA, route preview, and receipt path preview.

- [ ] **Step 2: Run the browser check to verify it fails**

Run: `npm run pay:browser-check`

Expected: FAIL because the new command-center sections are not rendered yet.

- [ ] **Step 3: Import the summary and add validation state**

In `src/pages/PayPage.tsx`, add:

```tsx
import { VANTA_PAY_MERCHANT_COMMAND_CENTER } from "@/pay/vantaPayMerchantCommandCenter";
```

Inside `PayPage`, add:

```tsx
const parsedAmount = Number(amount);
const titleError = title.trim() ? "" : "Add a short payment description.";
const amountError =
  amount.trim() && Number.isFinite(parsedAmount) && parsedAmount > 0
    ? ""
    : "Enter an amount greater than 0.";
const emailError =
  customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
    ? "Enter a valid customer email or leave it blank."
    : "";
const formHasErrors = Boolean(titleError || amountError || emailError);
```

- [ ] **Step 4: Render the command-center sections**

Replace the top header copy and add trust/operations sections around the existing form:

```tsx
<span className="pay-kicker product-intro__eyebrow">Merchant command center</span>
<h1 id="pay-title">Create a payment request</h1>
<p>Create, preview, and verify a payment path without presenting Vanta Pay as a live production processor.</p>
```

Below the review card, render:

```tsx
<section className="pay-command-center__trust" aria-label="Trust rail">
  <div className="pay-section-mini-header">
    <span className="pay-kicker">Trust rail</span>
    <strong>{VANTA_PAY_MERCHANT_COMMAND_CENTER.betaNotice}</strong>
  </div>
  <div className="pay-command-card-grid">
    {VANTA_PAY_MERCHANT_COMMAND_CENTER.trustRail.map((item) => (
      <article className={`pay-command-card pay-command-card--${item.tone}`} key={item.label}>
        <span>{item.label}</span>
        <strong>{item.value}</strong>
        <small>{item.detail}</small>
      </article>
    ))}
  </div>
</section>

<section className="pay-command-center__operations" aria-label="Operations">
  <div className="pay-section-mini-header">
    <span className="pay-kicker">Operations</span>
    <strong>Read-only beta posture</strong>
  </div>
  <div className="pay-command-card-grid">
    {VANTA_PAY_MERCHANT_COMMAND_CENTER.operations.map((item) => (
      <article className={`pay-command-card pay-command-card--${item.tone}`} key={item.label}>
        <span>{item.label}</span>
        <strong>{item.value}</strong>
        <small>{item.detail}</small>
      </article>
    ))}
  </div>
</section>
```

- [ ] **Step 5: Show validation helper text**

Update `PayField` so it accepts `error?: string`, sets `aria-invalid`, and renders:

```tsx
{error ? <small className="pay-field__error">{error}</small> : null}
```

Pass `titleError`, `amountError`, and `emailError` to the relevant fields. Keep the CTA disabled in beta mode, and use helper copy near the button:

```tsx
<small className="pay-submit-note">
  {isBetaMode ? "Beta mode keeps this present but disabled. No funds move in this mode." : "Review before submitting."}
</small>
```

- [ ] **Step 6: Add command-center styles**

In `src/styles.css`, add:

```css
.pay-command-center__trust,
.pay-command-center__operations {
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
}

.pay-section-mini-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
}

.pay-section-mini-header strong {
  color: var(--muted-strong);
  font-size: 0.82rem;
  font-weight: 600;
  text-align: right;
}

.pay-command-card-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pay-command-card {
  display: grid;
  gap: 0.4rem;
  min-height: 132px;
  padding: 0.9rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.035);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.pay-command-card span {
  color: var(--muted-strong);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.pay-command-card strong {
  color: var(--text);
  font-size: 0.95rem;
  line-height: 1.35;
}

.pay-command-card small,
.pay-submit-note,
.pay-field__error {
  color: var(--muted);
  line-height: 1.5;
}

.pay-command-card--blocked {
  background: rgba(255, 176, 97, 0.07);
  box-shadow: inset 0 0 0 1px rgba(255, 176, 97, 0.2);
}

.pay-field__error {
  color: #ffb061;
  font-size: 0.78rem;
}

.pay-form--minimal input[aria-invalid="true"] {
  box-shadow: inset 0 0 0 1px rgba(255, 176, 97, 0.55);
}

@media (max-width: 860px) {
  .pay-command-card-grid {
    grid-template-columns: 1fr;
  }

  .pay-section-mini-header {
    align-items: start;
    flex-direction: column;
  }

  .pay-section-mini-header strong {
    text-align: left;
  }
}
```

- [ ] **Step 7: Run browser check and build**

Run:

```bash
npm run pay:browser-check
npm run build
```

Expected: both PASS.

## Task 3: Align Pay Copy And Docs Truth

**Files:**
- Modify: `scripts/check-vanta-pay-tab-copy.mjs`
- Modify: `src/pages/DocsPayPage.tsx`
- Modify: `docs/pay-merchant-trust-surface.md`
- Modify: `README.md`

- [ ] **Step 1: Add copy/doc assertions**

Update `scripts/check-vanta-pay-tab-copy.mjs` so required Pay page copy includes:

```js
"Merchant command center",
"Create a payment request",
"Trust rail",
"Operations",
"Production privacy claims are not enabled yet.",
```

Keep banned vocabulary checks that prevent protocol-heavy merchant copy.

- [ ] **Step 2: Run copy and docs checks to verify they fail if docs are stale**

Run:

```bash
npm run pay-tab:copy-check
npm run pay:doc-truth-check
```

Expected: copy check may pass after Task 2, docs check may fail until docs are updated.

- [ ] **Step 3: Update docs page**

In `src/pages/DocsPayPage.tsx`, replace the current status paragraph with copy that says:

```tsx
The current Pay experience opens as a Merchant Command Center preview. It keeps payment creation first, then adds a trust rail and read-only operations context for route preview, receipt preview, privacy readiness, operator posture, settlement queue, and reconciliation.
```

Keep explicit language that Pay is not a finished production payments network.

- [ ] **Step 4: Update merchant trust markdown**

In `docs/pay-merchant-trust-surface.md`, update the current surface section to say:

```md
The Pay tab is now a Merchant Command Center preview. It is still beta and still not a production payment processor. The visible surface combines payment creation, live review, trust rail, beta/no-funds disclosure, privacy-readiness limitation, and read-only operations context.
```

Also state:

```md
Production privacy claims are not enabled yet. The backend can require private rail receipts before payment completion, but that is not the same as live mainnet private payment readiness.
```

- [ ] **Step 5: Update README Pay summary**

In `README.md`, update the Pay bullets that say the real `/app/pay` tab is only a minimal payment-entry surface. Replace with:

```md
- the real `/app/pay` tab is a Merchant Command Center preview: payment creation first, with trust rail, beta/no-funds disclosure, privacy-readiness limitation, and read-only operations context
```

- [ ] **Step 6: Run copy/docs checks**

Run:

```bash
npm run pay-tab:copy-check
npm run pay:doc-truth-check
```

Expected: both PASS.

## Task 4: Full Pay Verification And Vault Memory

**Files:**
- Modify: `/Users/clay/Desktop/Vanta Vault/02 Projects/Vanta ZK Phase 1.md`
- Modify: `/Users/clay/Desktop/Vanta Vault/01 Daily/2026-04-24.md`
- Modify: `/Users/clay/Desktop/Vanta Vault/wiki/meta/log.md`
- Create or modify: `/Users/clay/Desktop/Vanta Vault/wiki/analyses/vanta-pay-merchant-command-center-2026-04-24.md`

- [ ] **Step 1: Run full Pay verification**

Run:

```bash
npm run pay:verify
```

Expected: PASS. If it fails for unrelated environment reasons, capture the failing command and run the narrow commands from Tasks 1-3.

- [ ] **Step 2: Run git status**

Run:

```bash
git status --short
```

Expected: only planned repo files plus `.superpowers/` brainstorming artifacts if they are not ignored.

- [ ] **Step 3: Write vault analysis**

Create `/Users/clay/Desktop/Vanta Vault/wiki/analyses/vanta-pay-merchant-command-center-2026-04-24.md`:

```md
# Vanta Pay Merchant Command Center - 2026-04-24

## Current state

`/app/pay` is now a Merchant Command Center preview: payment creation first, with trust rail, beta/no-funds disclosure, privacy-readiness limitation, and read-only operations context.

## Product decision

Vanta Pay should feel premier by being simple, truthful, operationally legible, and privacy-aware. It should not claim production processor status or live mainnet privacy readiness until canonical readiness commands support that claim.

## Verification

- `npm run pay:verify`

## Key limitation

Production privacy claims are not enabled yet. The backend can require private rail receipts before payment completion, but that is not the same as live mainnet private payment readiness.
```

- [ ] **Step 4: Update project and daily notes**

Append concise entries to:

- `/Users/clay/Desktop/Vanta Vault/02 Projects/Vanta ZK Phase 1.md`
- `/Users/clay/Desktop/Vanta Vault/01 Daily/2026-04-24.md`

Use this wording:

```md
- Upgraded Vanta Pay direction to Merchant Command Center: payment creation first, with trust rail, beta/no-funds disclosure, privacy-readiness limitation, and read-only operations context. Verification: `npm run pay:verify`.
```

- [ ] **Step 5: Update vault wiki log**

Append to `/Users/clay/Desktop/Vanta Vault/wiki/meta/log.md`:

```md
- 2026-04-24: Added `wiki/analyses/vanta-pay-merchant-command-center-2026-04-24.md` for the Pay Merchant Command Center product/verification decision.
```

## Self-Review

- Spec coverage: Task 1 creates typed UI data; Task 2 renders the command center; Task 3 aligns checks and docs; Task 4 verifies and syncs durable memory.
- Placeholder scan: no placeholder steps are intentionally left.
- Type consistency: `VANTA_PAY_MERCHANT_COMMAND_CENTER` is imported by the page and guarded by Pay contract checks.

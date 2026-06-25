# Vanta Pay Merchant Settlement Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the real Pay checkout feel like a merchant settlement console with balances, payout state, receipts, and reconciliation records while preserving the existing merchant-trust story.

**Architecture:** Introduce one typed merchant-console summary module in `src/pay/` and render it directly on the real Pay checkout surface. Strengthen the browser-backed verification against the new console copy and records, then align the merchant trust doc, README, and public product messaging so they describe the same product truth.

**Tech Stack:** React + TypeScript, existing Pay page/components, Vite, Node `.mjs` browser checks, markdown docs

---

## File Structure

### New files

- `src/pay/vantaPayMerchantConsoleSummary.ts`
  - Typed merchant-console snapshot for balances, payout state, recent receipts, and reconciliation exports used by the real Pay UI.

### Files to modify

- `src/pages/PayPage.tsx`
  - Render the merchant settlement console sections from the typed summary.
- `src/styles.css`
  - Style the console sections and tables/cards while preserving the existing Pay look.
- `scripts/check-vanta-pay-browser.mjs`
  - Assert the richer merchant-console surfaces on the real `/app/pay` page.
- `docs/pay-merchant-trust-surface.md`
  - Document the merchant settlement console and its typed summary.
- `README.md`
  - Mention the richer merchant settlement console in the Pay story.

---

### Task 1: Add A Typed Merchant Settlement Console Summary

**Files:**
- Create: `src/pay/vantaPayMerchantConsoleSummary.ts`
- Modify: `src/pages/PayPage.tsx`

- [x] **Step 1: Add the typed merchant console summary module**

```ts
export const VANTA_PAY_MERCHANT_CONSOLE_SUMMARY = {
  balances: [
    { asset: "USDC", available: "248,420.18", pending: "18,200.00", reserved: "4,000.00" },
    { asset: "SOL", available: "92.48", pending: "0.00", reserved: "1.25" },
  ],
  payoutQueue: {
    nextWindow: "Next approved payout window · 16:00 UTC",
    destination: "Treasury settlement wallet",
    state: "Awaiting operator approval packet",
  },
  receipts: [
    { id: "rcpt_1842", merchant: "Northstar Labs", amount: "4,820.00 USDC", state: "settled" },
    { id: "rcpt_1841", merchant: "Northstar Labs", amount: "1,250.00 USDC", state: "review" },
  ],
  reconciliation: {
    exportWindow: "Demo export window · 00:00-12:00 UTC",
    records: "128 matched receipts",
    delta: "0 unresolved deltas",
  },
} as const;
```

- [x] **Step 2: Import the summary into `src/pages/PayPage.tsx`**

```tsx
import { VANTA_PAY_MERCHANT_CONSOLE_SUMMARY } from "@/pay/vantaPayMerchantConsoleSummary";
```

- [x] **Step 3: Run the build to verify the new module is wired safely**

Run: `npm run build`
Expected: PASS because the new summary module is typed and imported cleanly.

---

### Task 2: Render The Merchant Settlement Console On The Real Pay Page

**Files:**
- Modify: `src/pages/PayPage.tsx`
- Modify: `src/styles.css`
- Modify: `scripts/check-vanta-pay-browser.mjs`

- [x] **Step 1: Add the failing browser assertions**

```js
{ kind: "text_visible", text: "Settlement console" },
{ kind: "text_visible", text: "Available balances" },
{ kind: "text_visible", text: "Payout queue" },
{ kind: "text_visible", text: "Recent receipts" },
{ kind: "text_visible", text: "Reconciliation export" },
```

- [x] **Step 2: Run the browser check to verify it fails**

Run: `npm run pay:browser-check`
Expected: FAIL because the current Pay checkout does not yet render the settlement console sections.

- [x] **Step 3: Render the settlement console in `src/pages/PayPage.tsx`**

```tsx
<section className="pay-settlement-console" aria-label="Settlement console">
  <div className="pay-settlement-console__header">
    <span className="pay-kicker">Settlement console</span>
    <h3>Merchant-visible balances and payout state</h3>
  </div>

  <div className="pay-console-grid">
    <article className="pay-console-card">
      <span>Available balances</span>
      {VANTA_PAY_MERCHANT_CONSOLE_SUMMARY.balances.map((balance) => (
        <div key={balance.asset}>
          <strong>{balance.asset}</strong>
          <small>{balance.available} available</small>
        </div>
      ))}
    </article>
    <article className="pay-console-card">
      <span>Payout queue</span>
      <strong>{VANTA_PAY_MERCHANT_CONSOLE_SUMMARY.payoutQueue.nextWindow}</strong>
      <small>{VANTA_PAY_MERCHANT_CONSOLE_SUMMARY.payoutQueue.state}</small>
    </article>
  </div>
  <div className="pay-console-grid">
    <article className="pay-console-card">
      <span>Recent receipts</span>
      {VANTA_PAY_MERCHANT_CONSOLE_SUMMARY.receipts.map((receipt) => (
        <div key={receipt.id}>
          <strong>{receipt.id}</strong>
          <small>{receipt.amount} · {receipt.state}</small>
        </div>
      ))}
    </article>
    <article className="pay-console-card">
      <span>Reconciliation export</span>
      <strong>{VANTA_PAY_MERCHANT_CONSOLE_SUMMARY.reconciliation.records}</strong>
      <small>{VANTA_PAY_MERCHANT_CONSOLE_SUMMARY.reconciliation.delta}</small>
    </article>
  </div>
</section>
```

- [x] **Step 4: Add the minimal styles in `src/styles.css`**

```css
.pay-settlement-console {
  display: grid;
  gap: 0.9rem;
  margin-top: 1rem;
}

.pay-console-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.pay-console-card {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.025);
}
```

- [x] **Step 5: Run verification**

Run:
- `npm run pay:browser-check`
- `npm run build`

Expected:
- browser check passes against the richer settlement console
- build passes

---

### Task 3: Align Merchant Trust Docs With The Settlement Console

**Files:**
- Modify: `docs/pay-merchant-trust-surface.md`
- Modify: `README.md`

- [x] **Step 1: Update the docs to describe the live console truth**

```md
The real Pay surface now exposes:

- merchant operations and approval boundary copy
- refund / withdrawal / reconciliation detail states
- settlement console cards for balances, payout queue, receipts, and reconciliation export
```

- [x] **Step 2: Run the canonical Pay verification**

Run: `npm run pay:verify`
Expected: PASS, confirming the broader Pay control-plane surface still verifies.

---

### Task 4: Capture More Legible Merchant Records In The Real Pay UI

**Files:**
- Modify: `src/pages/PayPage.tsx`
- Modify: `src/styles.css`
- Modify: `scripts/check-vanta-pay-browser.mjs`

- [x] **Step 1: Add the failing browser assertions for receipt and export details**

```js
{ kind: "text_visible", text: "rcpt_1842" },
{ kind: "text_visible", text: "Awaiting operator approval packet" },
{ kind: "text_visible", text: "128 matched receipts" },
{ kind: "text_visible", text: "0 unresolved deltas" },
```

- [x] **Step 2: Run the browser check to verify it fails**

Run: `npm run pay:browser-check`
Expected: FAIL because the current UI does not yet expose the concrete receipt/export records.

- [x] **Step 3: Render the concrete merchant record lines**

```tsx
<small>{VANTA_PAY_MERCHANT_CONSOLE_SUMMARY.payoutQueue.destination}</small>
<small>{VANTA_PAY_MERCHANT_CONSOLE_SUMMARY.reconciliation.exportWindow}</small>
```

Keep the receipt IDs, payout state, and reconciliation records visible on the real checkout surface rather than hidden in comments or data attributes.

- [x] **Step 4: Strengthen styles only as needed**

```css
.pay-console-card small {
  color: var(--muted);
}
```

- [x] **Step 5: Run verification**

Run:
- `npm run pay:browser-check`
- `npm run pay:verify`

Expected:
- browser check passes with the concrete merchant records visible
- full Pay verification passes

---

## Self-Review

### Spec coverage

- More realistic merchant settlement console: covered by Tasks 1 and 2.
- Concrete balances, payout state, receipts, and reconciliation records: covered by Tasks 1, 2, and 4.
- Product-truth alignment across Pay UI, docs, README, and public product messaging: covered by Task 3.

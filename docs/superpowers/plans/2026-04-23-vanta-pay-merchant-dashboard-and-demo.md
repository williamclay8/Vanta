# Vanta Pay Merchant Dashboard And Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Pay product from a thin checkout demo into a stronger merchant settlement dashboard with richer operational detail and in-product design-partner/demo framing.

**Architecture:** Extend the real Pay page and its existing trust/lifecycle surfaces instead of creating a separate dashboard product. First strengthen the merchant operations summary, then deepen refund/withdraw/reconciliation detail states, then add a design-partner/demo layer that reuses shared content across the Pay UI and supporting docs.

**Tech Stack:** React + TypeScript, existing Pay page/components, Node `.mjs` browser/status checks, Vite build, docs/readme/submission markdown

---

## File Structure

### New files

- `src/pay/vantaPayMerchantDemoContent.ts`
  - Shared design-partner/demo copy so UI and docs do not drift.

### Files to modify

- `src/pages/PayPage.tsx`
  - Add merchant operations dashboard, richer detail cards, and design-partner/demo card.
- `src/styles.css`
  - Style new dashboard/detail/demo blocks while preserving Pay visual language.
- `scripts/check-vanta-pay-browser.mjs`
  - Assert the new dashboard, detail, and design-partner text on the real `/app/pay` surface.
- `docs/pay-merchant-trust-surface.md`
  - Reflect the stronger merchant dashboard and detail state story.
- `README.md`
  - Mention the richer Pay demo/control-plane surface.
- `SUBMISSION.md`
  - Keep the hackathon story aligned with the upgraded Pay experience.

---

### Task 1: Upgrade The Real Pay UI Into A Merchant Operations Dashboard

**Files:**
- Modify: `src/pages/PayPage.tsx`
- Modify: `src/styles.css`
- Modify: `scripts/check-vanta-pay-browser.mjs`

- [ ] **Step 1: Add the failing browser assertions**

```js
{ kind: "text_visible", text: "Merchant operations" },
{ kind: "text_visible", text: "Policy-legible settlement" },
{ kind: "text_visible", text: "Private checkout" },
{ kind: "text_visible", text: "Approval boundary" },
```

- [ ] **Step 2: Run the browser check to verify it fails**

Run: `npm run pay:browser-check`
Expected: FAIL because the current Pay page does not render the new merchant operations dashboard copy.

- [ ] **Step 3: Add the merchant operations dashboard to `src/pages/PayPage.tsx`**

```tsx
<section className="pay-merchant-ops" aria-label="Merchant operations">
  <div className="pay-merchant-ops__header">
    <span className="pay-kicker">Merchant operations</span>
    <h3>Policy-legible settlement</h3>
  </div>
  <div className="pay-merchant-ops__grid">
    <div className="pay-ops-card">
      <span>Private checkout</span>
      <strong>Merchant-facing payment intake</strong>
    </div>
    <div className="pay-ops-card">
      <span>Approval boundary</span>
      <strong>Preview - approve - execute - settle</strong>
    </div>
    <div className="pay-ops-card">
      <span>Trust surface</span>
      <strong>Controlled privacy + legible trust</strong>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Add the minimal styles in `src/styles.css`**

```css
.pay-merchant-ops {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.pay-merchant-ops__grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.pay-ops-card {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 0.9rem 1rem;
}
```

- [ ] **Step 5: Run verification**

Run:
- `npm run pay:browser-check`
- `npm run build`

Expected:
- browser check passes against the real Pay page
- build passes

---

### Task 2: Deepen Refund, Withdrawal, And Reconciliation Detail Surfaces

**Files:**
- Modify: `src/pages/PayPage.tsx`
- Modify: `src/styles.css`
- Modify: `scripts/check-vanta-pay-browser.mjs`

- [ ] **Step 1: Add failing browser assertions for the detail surfaces**

```js
{ kind: "text_visible", text: "Refund review" },
{ kind: "text_visible", text: "Withdrawal review" },
{ kind: "text_visible", text: "Reconciliation snapshot" },
{ kind: "text_visible", text: "merchant-visible" },
```

- [ ] **Step 2: Run the browser check to verify it fails**

Run: `npm run pay:browser-check`
Expected: FAIL because the real Pay UI does not yet show the richer merchant detail surfaces.

- [ ] **Step 3: Add the detail cards**

```tsx
<div className="pay-detail-grid">
  <div className="pay-detail-card">
    <span>Refund review</span>
    <strong>Merchant-visible refund state</strong>
    <small>Receipt-linked refund controls stay inside the Pay rail.</small>
  </div>
  <div className="pay-detail-card">
    <span>Withdrawal review</span>
    <strong>Merchant-visible withdrawal state</strong>
    <small>Destination and settlement state stay policy-bound before action.</small>
  </div>
  <div className="pay-detail-card">
    <span>Reconciliation snapshot</span>
    <strong>Merchant-visible reconciliation state</strong>
    <small>Receipts, balances, and settlement state remain legible.</small>
  </div>
</div>
```

- [ ] **Step 4: Add the minimal styles**

```css
.pay-detail-grid {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.pay-detail-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.85rem 1rem;
}
```

- [ ] **Step 5: Run verification**

Run:
- `npm run pay:browser-check`
- `npm run build`

Expected:
- browser check passes with the richer detail-state copy
- build passes

---

### Task 3: Add Design-Partner And Demo Layer To The Product Surface

**Files:**
- Create: `src/pay/vantaPayMerchantDemoContent.ts`
- Modify: `src/pages/PayPage.tsx`
- Modify: `docs/pay-merchant-trust-surface.md`
- Modify: `README.md`
- Modify: `SUBMISSION.md`
- Modify: `scripts/check-vanta-pay-browser.mjs`

- [ ] **Step 1: Add the failing browser assertions**

```js
{ kind: "text_visible", text: "Design partner preview" },
{ kind: "text_visible", text: "Merchant pilot" },
{ kind: "text_visible", text: "Private settlement without protocol overhead" },
```

- [ ] **Step 2: Run the browser check to verify it fails**

Run: `npm run pay:browser-check`
Expected: FAIL because the current Pay UI does not yet render the design-partner/demo panel.

- [ ] **Step 3: Add the shared demo content module**

```ts
export const VANTA_PAY_MERCHANT_DEMO_CONTENT = {
  eyebrow: "Design partner preview",
  title: "Merchant pilot",
  body: "Private settlement without protocol overhead.",
} as const;
```

- [ ] **Step 4: Render the design-partner/demo panel in `src/pages/PayPage.tsx`**

```tsx
<aside className="pay-demo-card">
  <span className="pay-kicker">{VANTA_PAY_MERCHANT_DEMO_CONTENT.eyebrow}</span>
  <h3>{VANTA_PAY_MERCHANT_DEMO_CONTENT.title}</h3>
  <p>{VANTA_PAY_MERCHANT_DEMO_CONTENT.body}</p>
</aside>
```

- [ ] **Step 5: Align docs and submission language**

```md
The real Pay demo now shows:

- merchant operations
- approval boundary
- refund / withdrawal / reconciliation detail states
- design-partner-facing settlement framing
```

- [ ] **Step 6: Run verification**

Run:
- `npm run pay:browser-check`
- `npm run pay:verify`

Expected:
- browser check passes with the design-partner/demo panel
- full Pay verification still passes

---

## Self-Review

### Spec coverage

- Richer Pay dashboard UX: covered by Task 1.
- Refund/withdraw/reconciliation detail surfaces: covered by Task 2.
- Design-partner-facing artifacts in the product/demo flow: covered by Task 3.

### Placeholder scan

- No `TODO`, `TBD`, or vague placeholders remain.
- Each task contains exact files and commands.

### Type consistency

- Shared design-partner/demo copy lives in one export.
- Dashboard/detail/demo copy is consistent between UI and docs.

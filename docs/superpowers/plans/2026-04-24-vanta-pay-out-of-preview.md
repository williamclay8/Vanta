# Vanta Pay Out Of Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Vanta Pay from a local preview request into a truthful test-mode checkout lifecycle, then define the hard gates required before production Pay claims are allowed.

**Architecture:** Split the work into two lanes. Lane A is buildable now: `/app/pay` creates real test checkout-session/payment/receipt objects through the Pay runtime or operator harness, shows a completed receipt-backed test payment record, and keeps production/live claims locked. Lane B is the production-release lane: deployed durable Pay operator, real Private Pool v2 settlement, evidence artifacts, audit/legal/custody gates, and strict readiness commands must turn green before preview/production blockers can be removed.

**Tech Stack:** React/TypeScript Pay page, Vanta Pay runtime in `src/pay/*`, Node Pay operator in `operator/pay-server.mjs`, existing `npm run pay:*` and `npm run mainnet:*` gates, Vanta Vault for durable project memory.

---

## Current Truth

`npm run pay:production-readiness-json` currently reports:

- `productionReady: false`
- `mainnetReady: false`
- blockers:
  - `pay-durable-store-not-configured`
  - `pay-private-pool-operator-not-configured`
  - `private-settlement-not-live-mainnet`
  - `private-settlement-privacy-claim-not-allowed`
  - `real-funds-approval-window-not-active`
  - `audited-shared-anonymity-set-not-recorded`
  - `pay-status-production-ready-false`

The only honest near-term “out of preview” step is test-mode completion: create a real checkout session, run a guarded test settlement path, and show a receipt-backed payment record while still saying no production funds or production privacy claims are enabled.

## File Map

- Modify: `src/pages/PayPage.tsx`
  - Replace synthetic `PreviewRequest` state with a real test-mode checkout lifecycle state.
  - Render checkout session, payment, receipt, private rail receipt, and audit disclosure IDs.
- Modify: `src/pay/vantaPayRuntime.ts`
  - Add or expose a browser-safe/test-safe helper only if existing runtime calls cannot be reused cleanly.
  - Preserve private rail receipt requirement before completed payment state.
- Modify: `src/pay/vantaPayTypes.ts`
  - Add UI-facing test lifecycle types only if needed.
- Modify: `operator/pay-server.mjs`
  - Add missing test-mode endpoints only if the UI must call the operator instead of local runtime.
  - Do not weaken production guards.
- Modify: `scripts/check-vanta-pay-browser.mjs`
  - Verify the test-mode lifecycle creates a checkout session, completes test settlement, and shows receipt-backed record.
- Modify: `scripts/check-vanta-pay-tab-copy.mjs`
  - Require test-mode transaction copy and continue banning production/live/privacy overclaims.
- Modify: `scripts/check-vanta-pay-doc-truth.mjs`
  - Keep docs aligned with test-mode completion and production blocker truth.
- Modify: `docs/pay-merchant-trust-surface.md`
  - Update from “preview request only” to “test-mode checkout lifecycle,” while keeping production-ready false.
- Modify: `docs/mainnet-launch-worksheet.md`
  - Add a Pay production-release checklist section if missing.
- Modify: `/Users/clay/Desktop/Vanta Vault/wiki/analyses/vanta-pay-tab-simplification-2026-04-24.md`
  - Preserve the product decision and remaining production blockers.

## Task 1: Freeze The Two-Mode Contract

**Files:**
- Modify: `docs/pay-merchant-trust-surface.md`
- Modify: `scripts/check-vanta-pay-doc-truth.mjs`
- Modify: `scripts/check-vanta-pay-tab-copy.mjs`

- [ ] **Step 1: Add the contract language to docs**

Update `docs/pay-merchant-trust-surface.md` so the current truth says:

```md
Current truth: `/app/pay` is a test-mode merchant checkout cockpit, not a finished production payments network. It should create and review checkout sessions, show receipt-backed test payment records when the local/operator harness confirms a private rail receipt, and keep production limits visible before anything sounds live.

Production privacy claims are not enabled yet. Test-mode completion is not the same as live mainnet private payment readiness.
```

- [ ] **Step 2: Add source-copy requirements**

In `scripts/check-vanta-pay-tab-copy.mjs`, require these strings:

```js
"Vanta Pay",
"Test mode",
"Create checkout session",
"Checkout session created",
"Complete test settlement",
"Payment record completed",
"Private rail receipt confirmed",
"No production funds moved.",
"Production privacy claims remain locked.",
```

Keep banning:

```js
"Production-ready",
"Mainnet-ready",
"Live mainnet private settlement",
"Paid privately",
"Private transaction complete",
"Fully private",
"Anonymous payments",
"Untraceable settlement",
"Safe for real user funds",
```

- [ ] **Step 3: Run red/green copy checks**

Run:

```bash
npm run pay-tab:copy-check
npm run pay:doc-truth-check
```

Expected after doc/check edits but before UI edits: `pay-tab:copy-check` may fail because the Pay page does not yet contain the new required strings. `pay:doc-truth-check` should pass once the doc truth script is aligned.

- [ ] **Step 4: Commit**

```bash
git add docs/pay-merchant-trust-surface.md scripts/check-vanta-pay-doc-truth.mjs scripts/check-vanta-pay-tab-copy.mjs
git commit -m "Define Pay test-mode completion contract"
```

## Task 2: Build Real Test-Mode Checkout State

**Files:**
- Modify: `src/pages/PayPage.tsx`
- Modify: `src/pay/vantaPayRuntime.ts` only if needed
- Modify: `src/pay/vantaPayTypes.ts` only if needed

- [ ] **Step 1: Write the failing browser expectation**

In `scripts/check-vanta-pay-browser.mjs`, change the Pay journey to:

```js
{ action: "type", selector: 'input[name="payment-title"]', text: "Design retainer" },
{ action: "type", selector: 'input[name="payment-amount"]', text: "2400" },
{ action: "type", selector: 'input[name="customer-email"]', text: "customer@example.com" },
{ action: "click", selector: 'form[aria-label="Payment form"] .button-primary' },
{
  action: "assert",
  checks: [
    { kind: "text_visible", text: "Checkout session created" },
    { kind: "text_visible", text: "checkout_session" },
    { kind: "text_visible", text: "client_token" },
    { kind: "text_visible", text: "Complete test settlement" },
  ],
},
{ action: "click", selector: 'button[data-pay-action="complete-test-settlement"]' },
{
  action: "assert",
  checks: [
    { kind: "text_visible", text: "Payment record completed" },
    { kind: "text_visible", text: "Private rail receipt confirmed" },
    { kind: "text_visible", text: "receipt_" },
    { kind: "text_visible", text: "private_rail_" },
    { kind: "text_visible", text: "No production funds moved." },
    { kind: "text_visible", text: "Production privacy claims remain locked." },
  ],
}
```

- [ ] **Step 2: Run the browser check and confirm it fails**

Run:

```bash
npm run pay:browser-check
```

Expected: fail because the UI still creates a synthetic preview request and has no complete-test-settlement action.

- [ ] **Step 3: Replace synthetic preview state with test lifecycle state**

In `src/pages/PayPage.tsx`, replace `PreviewRequest` with:

```ts
type PayLifecyclePhase = "draft" | "checkout_created" | "settlement_complete";

type TestCheckoutRecord = {
  amount: string;
  asset: VantaPayAsset;
  auditDisclosureId?: string;
  checkoutSessionId: string;
  checkoutUrl: string;
  clientToken: string;
  createdAt: string;
  customer: string;
  paymentId?: string;
  privateRailReceiptId?: string;
  receiptId?: string;
  title: string;
};
```

Generate IDs with stable prefixes:

```ts
checkoutSessionId: `checkout_session_test_${slug}_${timestamp}`,
clientToken: `client_token_test_${timestamp}`,
paymentId: `payment_test_${slug}_${timestamp}`,
receiptId: `receipt_test_${slug}_${timestamp}`,
privateRailReceiptId: `private_rail_test_${slug}_${timestamp}`,
auditDisclosureId: `audit_disclosure_test_${slug}_${timestamp}`,
```

- [ ] **Step 4: Rename the primary action**

Change:

```tsx
Create preview request
```

to:

```tsx
Create checkout session
```

The submit note becomes:

```tsx
Creates a test checkout session. Completion requires a confirmed private rail receipt.
```

- [ ] **Step 5: Add the settlement action**

Add a button after checkout creation:

```tsx
<button
  className="pay-workflow-action"
  data-pay-action="complete-test-settlement"
  disabled={phase !== "checkout_created"}
  onClick={completeTestSettlement}
  type="button"
>
  <span>Complete test settlement</span>
</button>
```

The `completeTestSettlement` function sets `phase` to `settlement_complete` and fills `paymentId`, `receiptId`, `privateRailReceiptId`, and `auditDisclosureId`.

- [ ] **Step 6: Render a receipt-backed record**

After settlement completion, the record panel must show:

```tsx
<strong>Payment record completed</strong>
<dd>{record.paymentId}</dd>
<dd>{record.receiptId}</dd>
<dd>{record.privateRailReceiptId}</dd>
<dd>{record.auditDisclosureId}</dd>
<p>No production funds moved. Production privacy claims remain locked.</p>
```

- [ ] **Step 7: Run Pay UI verification**

Run:

```bash
npm run pay-tab:copy-check
npm run pay:browser-check
npm run build
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/pages/PayPage.tsx src/styles.css scripts/check-vanta-pay-browser.mjs scripts/check-vanta-pay-tab-copy.mjs
git commit -m "Add Pay test-mode checkout lifecycle"
```

## Task 3: Connect UI To The Pay Operator Harness

**Files:**
- Modify: `operator/pay-server.mjs`
- Modify: `src/pages/PayPage.tsx`
- Modify: `scripts/check-vanta-pay-merchant-api.mjs`
- Modify: `scripts/check-vanta-pay-browser.mjs`

- [ ] **Step 1: Add a failing API assertion**

In `scripts/check-vanta-pay-merchant-api.mjs`, assert the operator can create a checkout session and complete it through the existing private settlement guard, returning:

```js
assert.equal(session.object, "checkout_session");
assert.match(session.id, /^cs_/);
assert.ok(session.clientToken);
assert.ok(session.checkoutUrl);
assert.equal(completed.payment.status, "completed");
assert.ok(completed.payment.privateRailReceiptId);
assert.ok(completed.receipt.id);
```

- [ ] **Step 2: Run the API check**

Run:

```bash
npm run pay:merchant-api-check
```

Expected: if existing coverage already passes this shape, do not duplicate it. If it fails, implement the missing response field or test harness assertion.

- [ ] **Step 3: Add UI operator fallback decision**

Choose one:

- If browser can call a same-origin Pay operator in dev/staging, add `VITE_VANTA_PAY_OPERATOR_URL` and call `POST /v1/checkout/sessions`.
- If static frontend cannot safely call the operator yet, keep local test-mode UI but add a visible `Local operator harness` label and do not claim operator-created checkout.

Do not expose `VANTA_PAY_SECRET_KEY`, `VANTA_PAY_WEBHOOK_SECRET`, private-pool operator tokens, database URLs, or bearer values in the browser.

- [ ] **Step 4: Verify**

Run:

```bash
npm run pay:merchant-api-check
npm run pay:browser-check
npm run pay:verify
```

Expected: all pass. `npm run pay:production-readiness-check` is still expected to fail until production gates are real.

- [ ] **Step 5: Commit**

```bash
git add operator/pay-server.mjs src/pages/PayPage.tsx scripts/check-vanta-pay-merchant-api.mjs scripts/check-vanta-pay-browser.mjs
git commit -m "Wire Pay checkout lifecycle to operator harness"
```

## Task 4: Production Readiness Gate Work

**Files:**
- Modify: `scripts/print-vanta-pay-status.mjs`
- Modify: `scripts/print-vanta-pay-production-readiness.mjs`
- Modify: `docs/mainnet-launch-worksheet.md`
- Modify: `ops/mainnet/secret-references.manifest.json`
- Modify: `ops/mainnet/private-pool-v2-production-smoke.evidence.json`
- Modify: `ops/mainnet/mainnet-real-funds-approval.evidence.json`

- [ ] **Step 1: Keep strict production gate red**

Run:

```bash
npm run pay:production-readiness-check
```

Expected now: fail with the current blocker list. This is correct until production gates are satisfied.

- [ ] **Step 2: Add production checklist to launch worksheet**

Append this checklist to `docs/mainnet-launch-worksheet.md`:

```md
## Pay Production Release Checklist

- [ ] Pay operator deployed with `NODE_ENV=production`.
- [ ] Pay operator uses secret-manager refs for `VANTA_PAY_SECRET_KEY`, `VANTA_PAY_WEBHOOK_SECRET`, `VANTA_PAY_DATABASE_URL`, `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL`, and `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN`.
- [ ] `npm run pay:status-json` reports `durableStoreConfigured: true`.
- [ ] `npm run pay:status-json` reports `privatePoolOperatorConfigured: true`.
- [ ] `npm run mainnet:private-settlement-status -- --json` reports `liveMainnetPrivateSettlementAvailable: true`.
- [ ] `npm run mainnet:private-settlement-status -- --json` reports `privacyClaimAllowed: true`.
- [ ] Active bounded real-funds approval exists for the exact Pay action.
- [ ] Third-party security audit evidence is recorded.
- [ ] Legal/compliance/custody review is recorded.
- [ ] Pay restore readback and provider backup controls are either completed evidence or explicitly accepted launch risk.
```

- [ ] **Step 3: Do not flip `productionReady` manually**

Only update `scripts/print-vanta-pay-status.mjs` so `productionReady` can derive from real gates after the evidence exists. Do not replace:

```js
productionReady: false,
```

with `true`.

The safe future shape is:

```js
productionReady:
  result.capabilities.durableStoreConfigured &&
  result.capabilities.privatePoolOperatorConfigured &&
  process.env.VANTA_PAY_PRODUCTION_LAUNCH_APPROVED === "true",
```

That still must be combined with `mainnet:private-settlement-status` in `scripts/print-vanta-pay-production-readiness.mjs`.

- [ ] **Step 4: Verify production gate behavior**

Run:

```bash
npm run pay:production-readiness-json
npm run pay:production-readiness-contract-check
npm run mainnet:private-settlement-status -- --json
```

Expected: readiness remains false until real evidence changes.

- [ ] **Step 5: Commit**

```bash
git add scripts/print-vanta-pay-status.mjs scripts/print-vanta-pay-production-readiness.mjs docs/mainnet-launch-worksheet.md
git commit -m "Document Pay production readiness gates"
```

## Task 5: Vault Sync And Final Verification

**Files:**
- Modify: `/Users/clay/Desktop/Vanta Vault/wiki/analyses/vanta-pay-tab-simplification-2026-04-24.md`
- Modify: `/Users/clay/Desktop/Vanta Vault/01 Daily/2026-04-24.md`
- Modify: `/Users/clay/Desktop/Vanta Vault/wiki/meta/log.md`

- [ ] **Step 1: Record durable product decision**

Record:

```md
Pay has two readiness levels:

1. Test-mode completion: checkout session, private rail receipt, payment record, receipt panel, no production funds.
2. Production Pay: durable production operator, live mainnet private settlement, active real-funds approval, audit/legal/custody evidence, and strict production readiness checks green.

Do not remove production/live/privacy disclaimers until level 2 is complete.
```

- [ ] **Step 2: Run final verification**

Run:

```bash
npm run pay:verify
npm run pay:production-readiness-json
```

Expected:

- `pay:verify` passes.
- `pay:production-readiness-json` remains false unless production gates have actually been completed.

- [ ] **Step 3: Commit repo changes**

Commit only repo files, not external vault files:

```bash
git status --short
git add docs/pay-merchant-trust-surface.md docs/mainnet-launch-worksheet.md scripts/check-vanta-pay-doc-truth.mjs scripts/check-vanta-pay-tab-copy.mjs scripts/check-vanta-pay-browser.mjs src/pages/PayPage.tsx src/styles.css
git commit -m "Plan Pay out-of-preview path"
```

## Self-Review

- Spec coverage: covers backend/runtime/API, product/UI, deployment/ops/security, and risk-review findings from the subagents.
- Placeholder scan: no `TBD`, `TODO`, or undefined future-only steps are used as required actions.
- Type consistency: `TestCheckoutRecord`, `PayLifecyclePhase`, and visible copy are repeated consistently across tasks.


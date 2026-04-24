# Vanta Top 3 Merchant-First Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved merchant-first roadmap into one coherent product increment by making the Pay surface runtime-driven, exposing a visible approval packet UX, and adding a dedicated trust/readiness center.

**Architecture:** Build on the existing `src/pay/`, `src/readiness/`, and route/page seams instead of creating a parallel product stack. First introduce typed view-model snapshots for the merchant control plane and trust center, then render them into the real app surfaces, then tighten verification and docs so the same product truth holds across UI, scripts, and runbooks.

**Tech Stack:** React, TypeScript, existing Vanta Pay runtime, Node `.mjs` contract/browser checks, Vite app routes, markdown docs, npm script-based verification

---

## File Structure

### New files

- `src/pay/vantaPayMerchantControlPlane.ts`
  - Typed view-model builder that derives balances, payout queue, receipts, refunds, withdrawals, reconciliation, and lifecycle state from the real Pay runtime.
- `src/components/VantaPayApprovalPacketCard.tsx`
  - Reusable product-facing approval packet panel for `preview -> approve -> execute -> settle`.
- `src/readiness/vantaTrustCenterSnapshot.ts`
  - UI-facing summary that combines merchant trust status, mainnet readiness truth, security limitations truth, and reviewer commands.
- `src/pages/TrustCenterPage.tsx`
  - Dedicated trust/readiness center route for merchants, partners, and reviewers.
- `scripts/check-vanta-pay-trust-center-browser.mjs`
  - Browser-backed verification for the new trust/readiness center route.

### Files to modify

- `package.json`
  - Add trust-center browser script and wire it into the stronger Pay verification path.
- `src/App.tsx`
  - Register the new trust-center route.
- `src/components/AppLayout.tsx`
  - Add navigation to the trust center without displacing the existing product surfaces.
- `src/pages/PayPage.tsx`
  - Replace local demo-only checkout state with a runtime-driven merchant control plane and approval packet UX.
- `src/pay/vantaPayTypes.ts`
  - Add exact types for the merchant control plane and trust-center view models.
- `src/pay/vantaPayRuntime.ts`
  - Expose the minimal runtime-derived data the merchant control plane needs.
- `src/pay/vantaPayApprovalPacket.ts`
  - Extend the approval packet with merchant-visible copy and state metadata instead of only static contract fields.
- `src/pay/vantaPayMerchantTrustStatus.ts`
  - Add review-command refs and status notes needed by the trust center.
- `src/readiness/mainnetReadiness.mjs`
  - Ensure the trust center can read canonical readiness truths without inventing a second truth source.
- `src/styles.css`
  - Style the control-plane, approval-packet, and trust-center surfaces while preserving the current Vanta language.
- `scripts/check-vanta-pay-contract.mjs`
  - Assert the new trust-center/browser-check wiring and new typed surface files.
- `scripts/check-vanta-pay-browser.mjs`
  - Verify the runtime-driven control plane and approval packet on `/app/pay`.
- `scripts/check-vanta-mainnet-readiness.mjs`
  - Keep top-level readiness truth aligned with the trust center surface if new fields are added.
- `docs/pay-merchant-trust-surface.md`
  - Document the merchant control-plane, approval-packet, and trust-center story together.
- `docs/operator-runbook.md`
  - Point operators/reviewers to the new in-product trust center.
- `README.md`
  - Update the product framing to match the new merchant-first control-plane surface.

### Existing commands to keep using

- `npm run pay:contract-check`
- `npm run pay:merchant-trust-status-check`
- `npm run pay:approval-packet-check`
- `npm run pay:browser-check`
- `npm run mainnet:readiness-check`
- `npm run security:limitations-check`
- `npm run pay:verify`
- `npm run build`

---

### Task 1: Add Typed Merchant Control Plane View Model

**Files:**
- Create: `src/pay/vantaPayMerchantControlPlane.ts`
- Modify: `src/pay/vantaPayTypes.ts`
- Modify: `src/pay/vantaPayRuntime.ts`
- Modify: `scripts/check-vanta-pay-contract.mjs`

- [ ] **Step 1: Add the failing Pay contract assertions for the new control-plane file**

```js
{
  path: "src/pay/vantaPayMerchantControlPlane.ts",
  markers: [
    "createVantaPayMerchantControlPlane",
    "merchantControlPlaneVersion",
    "approvalPhase",
    "reconciliation",
  ],
},
```

```js
if (!source.includes("VantaPayMerchantControlPlane")) {
  failures.push("Missing VantaPayMerchantControlPlane type in src/pay/vantaPayTypes.ts");
}
```

- [ ] **Step 2: Run the contract check to verify it fails**

Run: `npm run pay:contract-check`
Expected: FAIL with a missing `src/pay/vantaPayMerchantControlPlane.ts` or missing `VantaPayMerchantControlPlane` type marker.

- [ ] **Step 3: Add the control-plane types to `src/pay/vantaPayTypes.ts`**

```ts
export type VantaPayMerchantControlPlaneSectionState =
  | "visible"
  | "empty"
  | "beta_blocked";

export type VantaPayApprovalPhase = "preview" | "approve" | "execute" | "settle";

export type VantaPayMerchantControlPlane = {
  merchantControlPlaneVersion: "vanta-pay-merchant-control-plane-0.1";
  approvalPhase: VantaPayApprovalPhase;
  balances: VantaPayBalances;
  receipts: readonly VantaPayReceipt[];
  refunds: readonly VantaPayRefund[];
  withdrawals: readonly VantaPayWithdrawal[];
  payoutQueue: {
    destination: string;
    nextWindow: string;
    state: "merchant-visible";
  };
  reconciliation: {
    exportWindow: string;
    recordsLabel: string;
    state: "merchant-visible";
  };
  sections: {
    balances: VantaPayMerchantControlPlaneSectionState;
    receipts: VantaPayMerchantControlPlaneSectionState;
    refunds: VantaPayMerchantControlPlaneSectionState;
    withdrawals: VantaPayMerchantControlPlaneSectionState;
    reconciliation: VantaPayMerchantControlPlaneSectionState;
  };
};
```

- [ ] **Step 4: Add the merchant control-plane builder in `src/pay/vantaPayMerchantControlPlane.ts`**

```ts
import { createVantaPayRuntime } from "./vantaPayRuntime";
import type { VantaPayMerchantControlPlane } from "./vantaPayTypes";

export function createVantaPayMerchantControlPlane(): VantaPayMerchantControlPlane {
  const runtime = createVantaPayRuntime();
  const balances = runtime.getBalances();
  const receipts = runtime.listReceipts();
  const refunds = runtime.listRefunds();
  const withdrawals = runtime.listWithdrawals();

  return {
    merchantControlPlaneVersion: "vanta-pay-merchant-control-plane-0.1",
    approvalPhase: "preview",
    balances,
    receipts,
    refunds,
    withdrawals,
    payoutQueue: {
      destination: "Treasury settlement wallet",
      nextWindow: "Today · 16:00 UTC",
      state: "merchant-visible",
    },
    reconciliation: {
      exportWindow: "2026-04-23 · 00:00-12:00 UTC",
      recordsLabel: `${receipts.length} receipt records`,
      state: "merchant-visible",
    },
    sections: {
      balances: balances.available.length > 0 ? "visible" : "empty",
      receipts: receipts.length > 0 ? "visible" : "empty",
      refunds: refunds.length > 0 ? "visible" : "empty",
      withdrawals: withdrawals.length > 0 ? "visible" : "empty",
      reconciliation: "visible",
    },
  };
}
```

- [ ] **Step 5: Expose the minimal runtime getters needed by the control plane**

```ts
return {
  completeCheckoutSession,
  createCheckoutSession,
  createInvoice,
  createPaymentLink,
  createRefund,
  createWithdrawal,
  getBalances,
  getMerchant() {
    return merchant;
  },
  listReceipts() {
    return [...receipts.values()];
  },
  listRefunds() {
    return [...refunds.values()];
  },
  listWithdrawals() {
    return [...withdrawals.values()];
  },
  listWebhookDeliveries() {
    return [...webhookDeliveries.values()];
  },
  snapshot,
};
```

- [ ] **Step 6: Run verification**

Run:
- `npm run pay:contract-check`
- `npm run build`

Expected:
- Pay contract check passes with the new file/type markers.
- Build passes with the new typed view-model and runtime getters.

- [ ] **Step 7: Commit**

```bash
git add src/pay/vantaPayTypes.ts src/pay/vantaPayRuntime.ts src/pay/vantaPayMerchantControlPlane.ts scripts/check-vanta-pay-contract.mjs
git commit -m "feat: add merchant control plane snapshot"
```

### Task 2: Make The Real Pay Surface Runtime-Driven

**Files:**
- Modify: `src/pages/PayPage.tsx`
- Modify: `src/styles.css`
- Modify: `scripts/check-vanta-pay-browser.mjs`

- [ ] **Step 1: Add failing browser assertions for the runtime-driven merchant sections**

```js
{ kind: "text_visible", text: "Merchant control plane" },
{ kind: "text_visible", text: "Available balances" },
{ kind: "text_visible", text: "Refund queue" },
{ kind: "text_visible", text: "Withdrawal queue" },
{ kind: "text_visible", text: "Reconciliation export" },
```

```js
{
  kind: "selector_visible",
  selector: '[data-pay-surface="merchant-control-plane"][data-approval-phase="preview"]',
},
```

- [ ] **Step 2: Run the browser check to verify it fails**

Run: `npm run pay:browser-check`
Expected: FAIL because `/app/pay` does not yet render a `Merchant control plane` surface or a `data-approval-phase="preview"` marker.

- [ ] **Step 3: Replace the seeded demo summary in `src/pages/PayPage.tsx` with the control-plane builder**

```tsx
import { createVantaPayMerchantControlPlane } from "@/pay/vantaPayMerchantControlPlane";

const controlPlane = createVantaPayMerchantControlPlane();
```

```tsx
<aside
  className="pay-merchant-console-panel"
  aria-label="Merchant control plane"
  data-pay-surface="merchant-control-plane"
  data-approval-phase={controlPlane.approvalPhase}
>
  <section className="pay-merchant-ops" aria-label="Merchant control plane">
    <div className="pay-merchant-ops__header">
      <span className="pay-kicker">Merchant control plane</span>
      <h3>Policy-legible settlement</h3>
      <p className="pay-merchant-ops__note">
        Runtime-driven merchant state for balances, receipts, refunds, withdrawals, and reconciliation.
      </p>
    </div>
  </section>
```

```tsx
<article className="pay-console-card" data-console-section="refunds">
  <span>Refund queue</span>
  {controlPlane.refunds.length === 0 ? (
    <small>No refunds recorded yet</small>
  ) : (
    controlPlane.refunds.map((refund) => (
      <div key={refund.id}>
        <strong>{refund.id}</strong>
        <small>{refund.amount} {refund.asset} · {refund.status}</small>
      </div>
    ))
  )}
</article>
```

```tsx
<article className="pay-console-card" data-console-section="withdrawals">
  <span>Withdrawal queue</span>
  {controlPlane.withdrawals.length === 0 ? (
    <small>No withdrawals recorded yet</small>
  ) : (
    controlPlane.withdrawals.map((withdrawal) => (
      <div key={withdrawal.id}>
        <strong>{withdrawal.id}</strong>
        <small>{withdrawal.amount} {withdrawal.asset} · {withdrawal.status}</small>
      </div>
    ))
  )}
</article>
```

- [ ] **Step 4: Add the minimal styles for the new runtime sections**

```css
.pay-merchant-console-panel[data-pay-surface="merchant-control-plane"] {
  display: grid;
  gap: 1rem;
}

.pay-console-card[data-console-section="refunds"],
.pay-console-card[data-console-section="withdrawals"] {
  min-height: 9rem;
}
```

- [ ] **Step 5: Run verification**

Run:
- `npm run pay:browser-check`
- `npm run build`

Expected:
- Browser check passes against the runtime-driven merchant control plane.
- Build passes with the new control-plane rendering.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PayPage.tsx src/styles.css scripts/check-vanta-pay-browser.mjs
git commit -m "feat: render runtime-driven merchant control plane"
```

### Task 3: Add The Visible Approval Packet UX

**Files:**
- Create: `src/components/VantaPayApprovalPacketCard.tsx`
- Modify: `src/pay/vantaPayApprovalPacket.ts`
- Modify: `src/pay/vantaPayTypes.ts`
- Modify: `src/pages/PayPage.tsx`
- Modify: `scripts/check-vanta-pay-approval-packet.mjs`
- Modify: `scripts/check-vanta-pay-browser.mjs`

- [ ] **Step 1: Strengthen the approval-packet contract with the first visible UX fields**

```js
assert.equal(packet.summary.heading, "Approval packet");
assert.equal(packet.summary.currentPhase, "preview");
assert.equal(packet.summary.policyBoundary, "legible-trust");
assert.equal(packet.summary.simulationNote, "Simulation required before wallet approval.");
```

- [ ] **Step 2: Run the approval-packet check to verify it fails**

Run: `npm run pay:approval-packet-check`
Expected: FAIL because `buildVantaPayApprovalPacket()` does not yet return `summary.heading`, `summary.currentPhase`, `summary.policyBoundary`, or `summary.simulationNote`.

- [ ] **Step 3: Extend the approval-packet type and builder**

```ts
export type VantaPayApprovalPacket = {
  version: "vanta-pay-approval-packet-0.1";
  phaseOrder: ["preview", "approve", "execute", "settle"];
  policyMode: "legible-trust";
  simulationRequired: true;
  walletApprovalRequired: true;
  summary: {
    heading: "Approval packet";
    currentPhase: "preview";
    policyBoundary: "legible-trust";
    simulationNote: "Simulation required before wallet approval.";
    privacyNote: "Controlled privacy with merchant-visible receipts.";
  };
};
```

```ts
export function buildVantaPayApprovalPacket(): VantaPayApprovalPacket {
  return {
    version: "vanta-pay-approval-packet-0.1",
    phaseOrder: ["preview", "approve", "execute", "settle"],
    policyMode: "legible-trust",
    simulationRequired: true,
    walletApprovalRequired: true,
    summary: {
      heading: "Approval packet",
      currentPhase: "preview",
      policyBoundary: "legible-trust",
      simulationNote: "Simulation required before wallet approval.",
      privacyNote: "Controlled privacy with merchant-visible receipts.",
    },
  };
}
```

- [ ] **Step 4: Add the reusable approval packet card**

```tsx
import { buildVantaPayApprovalPacket } from "@/pay/vantaPayApprovalPacket";

export function VantaPayApprovalPacketCard() {
  const packet = buildVantaPayApprovalPacket();

  return (
    <section className="pay-approval-packet" aria-label="Approval packet">
      <span className="pay-kicker">{packet.summary.heading}</span>
      <h3>{packet.summary.currentPhase.toUpperCase()}</h3>
      <p>{packet.summary.simulationNote}</p>
      <div className="pay-approval-packet__rows">
        <div><span>Policy boundary</span><strong>{packet.summary.policyBoundary}</strong></div>
        <div><span>Privacy</span><strong>{packet.summary.privacyNote}</strong></div>
        <div><span>Phase order</span><strong>{packet.phaseOrder.join(" -> ")}</strong></div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Render the approval packet on `/app/pay` before the buyer checkout form**

```tsx
import { VantaPayApprovalPacketCard } from "@/components/VantaPayApprovalPacketCard";
```

```tsx
<div className="pay-view pay-view--checkout">
  <VantaPayApprovalPacketCard />
  <article className="pay-checkout-card">
```

- [ ] **Step 6: Add failing browser assertions for the visible approval packet and make them pass**

```js
{ kind: "text_visible", text: "Approval packet" },
{ kind: "text_visible", text: "Simulation required before wallet approval." },
{ kind: "text_visible", text: "Controlled privacy with merchant-visible receipts." },
{ kind: "text_visible", text: "preview -> approve -> execute -> settle" },
```

- [ ] **Step 7: Run verification**

Run:
- `npm run pay:approval-packet-check`
- `npm run pay:browser-check`
- `npm run build`

Expected:
- Approval packet check passes with the richer product-facing fields.
- Browser check passes with the visible approval packet on `/app/pay`.
- Build passes.

- [ ] **Step 8: Commit**

```bash
git add src/components/VantaPayApprovalPacketCard.tsx src/pay/vantaPayApprovalPacket.ts src/pay/vantaPayTypes.ts src/pages/PayPage.tsx scripts/check-vanta-pay-approval-packet.mjs scripts/check-vanta-pay-browser.mjs
git commit -m "feat: add visible pay approval packet"
```

### Task 4: Add The Dedicated Trust/Readiness Center

**Files:**
- Create: `src/readiness/vantaTrustCenterSnapshot.ts`
- Create: `src/pages/TrustCenterPage.tsx`
- Create: `scripts/check-vanta-pay-trust-center-browser.mjs`
- Modify: `src/App.tsx`
- Modify: `src/components/AppLayout.tsx`
- Modify: `package.json`
- Modify: `src/pay/vantaPayMerchantTrustStatus.ts`
- Modify: `scripts/check-vanta-pay-contract.mjs`

- [ ] **Step 1: Add the failing package and contract assertions**

```js
if (packageJson.scripts?.["pay:trust-center-browser-check"] !== "node scripts/check-vanta-pay-trust-center-browser.mjs") {
  failures.push("Missing package script pay:trust-center-browser-check");
}
```

```js
{
  path: "src/readiness/vantaTrustCenterSnapshot.ts",
  markers: [
    "createVantaTrustCenterSnapshot",
    "trustCenterVersion",
    "reviewCommands",
    "limitations",
  ],
},
```

- [ ] **Step 2: Run the contract check to verify it fails**

Run: `npm run pay:contract-check`
Expected: FAIL because the new trust-center files and script are not wired yet.

- [ ] **Step 3: Add the trust-center snapshot builder**

```ts
import { getVantaPayMerchantTrustStatus } from "@/pay/vantaPayMerchantTrustStatus";
import { createVantaMainnetReadinessSnapshot } from "@/readiness/mainnetReadiness.mjs";

export function createVantaTrustCenterSnapshot() {
  const merchantTrust = getVantaPayMerchantTrustStatus();
  const readiness = createVantaMainnetReadinessSnapshot();

  return {
    trustCenterVersion: "vanta-trust-center-0.1",
    merchantTrust,
    readiness: {
      decision: readiness.decision,
      mainnetReady: readiness.mainnetReady,
      productionReady: readiness.productionReady,
      score: readiness.score,
    },
    limitations: [
      "Not production-ready.",
      "No live funds move in beta mode.",
      "Do not claim audited or trustless operation.",
    ],
    reviewCommands: [
      "npm run pay:merchant-trust-status",
      "npm run mainnet:readiness",
      "npm run security:limitations-check",
    ],
  } as const;
}
```

- [ ] **Step 4: Add the dedicated route page**

```tsx
import { createVantaTrustCenterSnapshot } from "@/readiness/vantaTrustCenterSnapshot";

export function TrustCenterPage() {
  const snapshot = createVantaTrustCenterSnapshot();

  return (
    <section className="privacy-review-page" aria-labelledby="trust-center-title">
      <div className="privacy-review-hero">
        <div>
          <span className="eyebrow">Merchant trust</span>
          <h2 id="trust-center-title">Trust and readiness center</h2>
          <p>
            Review merchant trust status, beta truth, readiness blockers, and the canonical commands that back them.
          </p>
        </div>
        <div className="privacy-review-status" aria-label="Trust center status">
          <span>Readiness decision</span>
          <strong>{snapshot.readiness.decision}</strong>
          <small>Score: {snapshot.readiness.score}</small>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Register the route and nav entry**

```tsx
const TrustCenterPage = lazy(() =>
  import("@/pages/TrustCenterPage").then((m) => ({ default: m.TrustCenterPage })),
);
```

```tsx
<Route path="trust-center" element={<TrustCenterPage />} />
```

```ts
const appLinks = [
  { to: "/app/shield", label: "Shield", end: false },
  { to: "/app/send", label: "Send", end: false },
  { to: "/app/swap", label: "Swap", end: false },
  { to: "/app/strategy", label: "Strategy", end: false },
  { to: "/app/unshield", label: "Unshield", end: false },
  { to: "/app/pay", label: "Pay", end: false },
  { to: "/app/trust-center", label: "Trust", end: false },
];
```

- [ ] **Step 6: Add the trust-center browser check and package script**

```js
// package.json
"pay:trust-center-browser-check": "node scripts/check-vanta-pay-trust-center-browser.mjs"
```

```js
// scripts/check-vanta-pay-trust-center-browser.mjs
const steps = [
  { action: "navigate", url: `${baseUrl}/app/trust-center` },
  { action: "wait_for", condition: "network_idle" },
  {
    action: "assert",
    checks: [
      { kind: "url_contains", text: "/app/trust-center" },
      { kind: "text_visible", text: "Trust and readiness center" },
      { kind: "text_visible", text: "Not production-ready." },
      { kind: "text_visible", text: "npm run pay:merchant-trust-status" },
      { kind: "text_visible", text: "npm run mainnet:readiness" },
      { kind: "no_console_errors" },
    ],
  },
];
```

- [ ] **Step 7: Run verification**

Run:
- `npm run pay:contract-check`
- `npm run pay:trust-center-browser-check`
- `npm run build`

Expected:
- Pay contract check passes with the new trust-center files and script wiring.
- Browser check passes against `/app/trust-center`.
- Build passes with the new route.

- [ ] **Step 8: Commit**

```bash
git add package.json src/readiness/vantaTrustCenterSnapshot.ts src/pages/TrustCenterPage.tsx src/App.tsx src/components/AppLayout.tsx scripts/check-vanta-pay-contract.mjs scripts/check-vanta-pay-trust-center-browser.mjs src/pay/vantaPayMerchantTrustStatus.ts
git commit -m "feat: add trust and readiness center"
```

### Task 5: Align Verification And Docs Around The New Control Plane

**Files:**
- Modify: `package.json`
- Modify: `docs/pay-merchant-trust-surface.md`
- Modify: `docs/operator-runbook.md`
- Modify: `README.md`
- Modify: `scripts/check-vanta-mainnet-readiness.mjs`

- [ ] **Step 1: Wire the new trust-center browser check into the canonical Pay verification**

```json
{
  "pay:verify": "npm run pay:contract-check && npm run pay:status && npm run pay:status-json && npm run pay:merchant-trust-status-check && npm run pay:approval-packet-check && npm run pay-tab:copy-check && npm run pay:merchant-api-check && npm run pay:production-private-rail-guard-check && npm run pay:browser-check && npm run pay:trust-center-browser-check && npm run security:limitations-check && npm run operator:runbook-check && npm run build"
}
```

- [ ] **Step 2: Update the merchant trust doc**

```md
The real merchant-facing control-plane story now includes:

- a runtime-driven merchant control plane on `/app/pay`
- a visible approval packet for `preview -> approve -> execute -> settle`
- a dedicated `/app/trust-center` route for merchant trust, readiness truth, and limitations
```

- [ ] **Step 3: Update the operator runbook**

```md
In-product trust review now lives at:

- `/app/trust-center`

Use it as the product-facing entry point, then confirm the backing command surfaces with:

- `npm run pay:merchant-trust-status`
- `npm run mainnet:readiness`
- `npm run security:limitations-check`
```

- [ ] **Step 4: Update the README**

```md
Vanta's merchant-first control plane now exposes:

- runtime-driven merchant settlement state on the Pay surface
- a visible approval packet before execution
- a dedicated trust/readiness center for merchants and reviewers
```

- [ ] **Step 5: Keep readiness truth aligned if any trust-center fields were added**

```js
assert.equal(snapshot.mainnetReady, false);
assert.equal(snapshot.productionReady, false);
assert.equal(snapshot.decision, "blocked");
assert.ok(snapshot.requiredCommands.includes("npm run pay:verify"));
assert.ok(snapshot.requiredCommands.includes("npm run security:limitations-check"));
```

- [ ] **Step 6: Run full verification**

Run:
- `npm run mainnet:readiness-check`
- `npm run pay:verify`

Expected:
- mainnet readiness still reports blocked/non-production-ready truthfully.
- Pay verification passes with the control plane, approval packet, trust-center browser check, and docs aligned.

- [ ] **Step 7: Commit**

```bash
git add package.json docs/pay-merchant-trust-surface.md docs/operator-runbook.md README.md scripts/check-vanta-mainnet-readiness.mjs
git commit -m "docs: align merchant control plane trust surfaces"
```

---

## Self-Review

### Spec coverage

- Merchant control plane:
  Covered by Task 1 and Task 2 through the typed control-plane snapshot and runtime-driven Pay surface.
- Approval packet UX:
  Covered by Task 3 through the richer approval packet contract and visible approval packet card.
- Trust/readiness center:
  Covered by Task 4 and Task 5 through the new route, trust-center snapshot, browser check, and docs/runbook alignment.
- Verification discipline:
  Covered across all tasks and finalized in Task 5 by wiring the trust-center browser check into `pay:verify` and preserving `mainnet:readiness-check`.

### Placeholder scan

- No `TBD`, `TODO`, or “implement later” placeholders remain.
- Every task includes exact files, exact commands, and concrete code snippets.

### Type consistency

- `VantaPayApprovalPhase` is used consistently across the control-plane and approval-packet surfaces.
- `VantaPayMerchantControlPlane` is introduced before the Pay page renders it.
- `createVantaTrustCenterSnapshot()` is introduced before the Trust Center route imports it.

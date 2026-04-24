# Vanta Merchant Settlement Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Vanta's current Pay and trust infrastructure into a merchant-first settlement control plane with legible trust, merchant-facing status surfaces, and an explicit payment approval packet.

**Architecture:** Build on the existing `Pay`, readiness, and wallet-safety surfaces rather than introducing a parallel product stack. Add merchant-facing derived status modules and printers first, then tighten payment lifecycle semantics and approval packets so the product promise is visible in both human-readable UI copy and machine-readable status/evidence outputs.

**Tech Stack:** TypeScript, Node `.mjs` status/check scripts, Vite app, existing Vanta Pay runtime, readiness/status surfaces, browser-backed verification, npm script-based regression checks

---

## File Structure

### New files

- `src/pay/vantaPayMerchantTrustStatus.ts`
  - Derived merchant-facing settlement/trust summary built from existing Pay runtime and readiness truths.
- `src/pay/vantaPayApprovalPacket.ts`
  - Typed payment approval packet describing preview -> approve -> execute boundaries for merchant settlement actions.
- `scripts/print-vanta-pay-merchant-trust-status.mjs`
  - Human and JSON printer for the merchant trust surface.
- `scripts/check-vanta-pay-merchant-trust-status.mjs`
  - Contract check for the new merchant trust surface and package wiring.
- `scripts/check-vanta-pay-approval-packet.mjs`
  - Contract check for the payment approval packet shape and required fields.
- `docs/pay-merchant-trust-surface.md`
  - Merchant/operator-facing explanation of what the trust surface proves and what it does not claim.

### Files to modify

- `package.json`
  - Add new Pay trust and approval-packet commands and wire them into stronger Pay verification.
- `src/pay/vantaPayTypes.ts`
  - Add explicit merchant trust and approval packet types.
- `src/pay/vantaPayRuntime.ts`
  - Expose the derived merchant settlement lifecycle inputs needed by the new trust surface.
- `src/pay/vantaPayPrivateSettlementAdapter.ts`
  - Surface enough payment execution truth to build approval packet and merchant settlement state summaries.
- `scripts/print-vanta-pay-status.mjs`
  - Reference the merchant trust surface and keep Pay status aligned with the new language.
- `scripts/check-vanta-pay-contract.mjs`
  - Assert the new status surface and approval packet commands are part of the Pay contract.
- `scripts/check-vanta-pay-merchant-api.mjs`
  - Assert the merchant API reflects the new lifecycle and trust semantics.
- `scripts/check-vanta-pay-browser.mjs`
  - Verify merchant-facing lifecycle/trust language in the browser.
- `README.md`
  - Add the merchant settlement control-plane framing and commands.
- `docs/operator-runbook.md`
  - Document the new merchant trust and approval-packet surfaces.
- `SUBMISSION.md`
  - Tighten the public story around merchant-first private stablecoin settlement.

### Existing commands to keep using

- `npm run pay:contract-check`
- `npm run pay:status`
- `npm run pay:merchant-api-check`
- `npm run pay:browser-check`
- `npm run pay:verify`
- `npm run build`

---

### Task 1: Add Merchant Trust Status Surface

**Files:**
- Create: `src/pay/vantaPayMerchantTrustStatus.ts`
- Create: `scripts/print-vanta-pay-merchant-trust-status.mjs`
- Create: `scripts/check-vanta-pay-merchant-trust-status.mjs`
- Modify: `src/pay/vantaPayTypes.ts`
- Modify: `package.json`
- Modify: `scripts/check-vanta-pay-contract.mjs`

- [ ] **Step 1: Write the failing contract assertion for the new command wiring**

```js
assert.equal(
  packageJson.scripts["pay:merchant-trust-status"],
  "node scripts/print-vanta-pay-merchant-trust-status.mjs",
  "package.json must expose pay:merchant-trust-status.",
);

assert.equal(
  packageJson.scripts["pay:merchant-trust-status-check"],
  "node scripts/print-vanta-pay-merchant-trust-status.mjs --check",
  "package.json must expose pay:merchant-trust-status-check.",
);
```

- [ ] **Step 2: Run the failing check**

Run: `npm run pay:contract-check`
Expected: FAIL with a missing `pay:merchant-trust-status` or `pay:merchant-trust-status-check` script assertion.

- [ ] **Step 3: Add the minimal merchant trust types and derived status module**

```ts
export type VantaPayMerchantTrustStatus = {
  version: "vanta-pay-merchant-trust-status-0.1";
  checkoutSurface: "hosted-or-embedded";
  settlementModel: "private-settlement-adapter";
  refundSupport: "supported";
  withdrawalSupport: "supported";
  privacyMode: "controlled-privacy";
  policyMode: "legible-trust";
  productionReady: false;
};

export function getVantaPayMerchantTrustStatus(): VantaPayMerchantTrustStatus {
  return {
    version: "vanta-pay-merchant-trust-status-0.1",
    checkoutSurface: "hosted-or-embedded",
    settlementModel: "private-settlement-adapter",
    refundSupport: "supported",
    withdrawalSupport: "supported",
    privacyMode: "controlled-privacy",
    policyMode: "legible-trust",
    productionReady: false,
  };
}
```

- [ ] **Step 4: Add the printer and package wiring**

```js
const status = getVantaPayMerchantTrustStatus();

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(status, null, 2));
  process.exit(0);
}

console.log("Vanta Pay Merchant Trust Status");
console.log(`- privacy mode: ${status.privacyMode}`);
console.log(`- policy mode: ${status.policyMode}`);
console.log(`- settlement model: ${status.settlementModel}`);
```

```json
{
  "pay:merchant-trust-status": "node scripts/print-vanta-pay-merchant-trust-status.mjs",
  "pay:merchant-trust-status-check": "node scripts/print-vanta-pay-merchant-trust-status.mjs --check"
}
```

- [ ] **Step 5: Add the minimal check script**

```js
const result = JSON.parse(execFileSync("npm", ["run", "--silent", "pay:merchant-trust-status", "--", "--json"], { encoding: "utf8" }));
assert.equal(result.version, "vanta-pay-merchant-trust-status-0.1");
assert.equal(result.privacyMode, "controlled-privacy");
assert.equal(result.policyMode, "legible-trust");
assert.equal(result.productionReady, false);
```

- [ ] **Step 6: Run the checks to verify they pass**

Run:
- `npm run pay:merchant-trust-status`
- `npm run pay:merchant-trust-status-check`
- `npm run pay:contract-check`

Expected:
- status command prints the merchant trust summary
- check command exits successfully
- Pay contract check passes with the new script assertions

- [ ] **Step 7: Commit**

```bash
git add package.json src/pay/vantaPayTypes.ts src/pay/vantaPayMerchantTrustStatus.ts scripts/print-vanta-pay-merchant-trust-status.mjs scripts/check-vanta-pay-merchant-trust-status.mjs scripts/check-vanta-pay-contract.mjs
git commit -m "feat: add pay merchant trust status surface"
```

### Task 2: Make Merchant Settlement Lifecycle States Legible

**Files:**
- Modify: `src/pay/vantaPayRuntime.ts`
- Modify: `src/pay/vantaPayPrivateSettlementAdapter.ts`
- Modify: `scripts/print-vanta-pay-status.mjs`
- Modify: `scripts/check-vanta-pay-merchant-api.mjs`
- Modify: `scripts/check-vanta-pay-browser.mjs`

- [ ] **Step 1: Write the failing merchant API assertions for explicit lifecycle fields**

```js
assert.ok(
  status.privateSettlement,
  "Merchant API status must expose privateSettlement summary.",
);
assert.equal(
  status.privateSettlement.lifecycleModel,
  "preview-approve-execute-settle",
  "Merchant API must expose the payment lifecycle model.",
);
assert.equal(
  status.privateSettlement.refundState,
  "merchant-visible",
  "Merchant API must expose merchant-visible refund state.",
);
```

- [ ] **Step 2: Run the merchant API check to verify it fails**

Run: `npm run pay:merchant-api-check`
Expected: FAIL because `privateSettlement.lifecycleModel` or `refundState` is missing.

- [ ] **Step 3: Add the minimal lifecycle fields in the Pay runtime / adapter outputs**

```ts
const privateSettlement = {
  lifecycleModel: "preview-approve-execute-settle" as const,
  refundState: "merchant-visible" as const,
  withdrawalState: "merchant-visible" as const,
  reconciliationState: "merchant-visible" as const,
};
```

- [ ] **Step 4: Surface the lifecycle language in the Pay status printer**

```js
console.log(`- settlement lifecycle: ${status.privateSettlement.lifecycleModel}`);
console.log(`- refunds: ${status.privateSettlement.refundState}`);
console.log(`- withdrawals: ${status.privateSettlement.withdrawalState}`);
console.log(`- reconciliation: ${status.privateSettlement.reconciliationState}`);
```

- [ ] **Step 5: Extend the browser-backed check for the new merchant-facing text**

```js
await expectText("settlement lifecycle");
await expectText("preview");
await expectText("refunds");
await expectText("reconciliation");
```

- [ ] **Step 6: Run verification**

Run:
- `npm run pay:status`
- `npm run pay:merchant-api-check`
- `npm run pay:browser-check`

Expected:
- Pay status prints merchant settlement lifecycle fields
- merchant API check passes
- browser check finds the new lifecycle/trust copy

- [ ] **Step 7: Commit**

```bash
git add src/pay/vantaPayRuntime.ts src/pay/vantaPayPrivateSettlementAdapter.ts scripts/print-vanta-pay-status.mjs scripts/check-vanta-pay-merchant-api.mjs scripts/check-vanta-pay-browser.mjs
git commit -m "feat: expose merchant settlement lifecycle states"
```

### Task 3: Add Payment Approval Packet Contract

**Files:**
- Create: `src/pay/vantaPayApprovalPacket.ts`
- Create: `scripts/check-vanta-pay-approval-packet.mjs`
- Modify: `src/pay/vantaPayTypes.ts`
- Modify: `package.json`
- Modify: `scripts/check-vanta-pay-contract.mjs`
- Modify: `docs/operator-runbook.md`

- [ ] **Step 1: Write the failing contract assertions for the approval packet command**

```js
assert.equal(
  packageJson.scripts["pay:approval-packet-check"],
  "node scripts/check-vanta-pay-approval-packet.mjs",
  "package.json must expose pay:approval-packet-check.",
);
assert.ok(
  packageJson.scripts["pay:verify"].includes("npm run pay:approval-packet-check"),
  "pay:verify must include pay:approval-packet-check.",
);
```

- [ ] **Step 2: Run the failing check**

Run: `npm run pay:contract-check`
Expected: FAIL because `pay:approval-packet-check` is not wired.

- [ ] **Step 3: Add the approval packet type and builder**

```ts
export type VantaPayApprovalPacket = {
  version: "vanta-pay-approval-packet-0.1";
  phaseOrder: ["preview", "approve", "execute", "settle"];
  policyMode: "legible-trust";
  simulationRequired: true;
  walletApprovalRequired: true;
};

export function buildVantaPayApprovalPacket(): VantaPayApprovalPacket {
  return {
    version: "vanta-pay-approval-packet-0.1",
    phaseOrder: ["preview", "approve", "execute", "settle"],
    policyMode: "legible-trust",
    simulationRequired: true,
    walletApprovalRequired: true,
  };
}
```

- [ ] **Step 4: Add the check script and package wiring**

```js
const packet = buildVantaPayApprovalPacket();
assert.equal(packet.version, "vanta-pay-approval-packet-0.1");
assert.deepEqual(packet.phaseOrder, ["preview", "approve", "execute", "settle"]);
assert.equal(packet.simulationRequired, true);
assert.equal(packet.walletApprovalRequired, true);
console.log("Vanta Pay approval packet check: PASS");
```

```json
{
  "pay:approval-packet-check": "node scripts/check-vanta-pay-approval-packet.mjs"
}
```

- [ ] **Step 5: Document the packet in the operator runbook**

```md
The Pay approval packet freezes the payment approval boundary as:

- `preview`
- `approve`
- `execute`
- `settle`

It is intentionally policy-legible and must remain simulation-bound before any wallet approval.
```

- [ ] **Step 6: Run verification**

Run:
- `npm run pay:approval-packet-check`
- `npm run pay:contract-check`
- `npm run pay:verify`

Expected:
- approval packet check passes
- Pay contract check passes
- `pay:verify` includes and passes the new approval-packet contract

- [ ] **Step 7: Commit**

```bash
git add package.json src/pay/vantaPayTypes.ts src/pay/vantaPayApprovalPacket.ts scripts/check-vanta-pay-approval-packet.mjs scripts/check-vanta-pay-contract.mjs docs/operator-runbook.md
git commit -m "feat: add pay approval packet contract"
```

### Task 4: Add Merchant-Facing Trust Documentation and Repo Story

**Files:**
- Create: `docs/pay-merchant-trust-surface.md`
- Modify: `README.md`
- Modify: `SUBMISSION.md`
- Modify: `docs/operator-runbook.md`

- [ ] **Step 1: Write the failing documentation assertions in the runbook check**

```js
assert.ok(
  runbook.includes("pay:merchant-trust-status"),
  "Operator runbook must document pay:merchant-trust-status.",
);
assert.ok(
  runbook.includes("pay:approval-packet-check"),
  "Operator runbook must document pay:approval-packet-check.",
);
```

- [ ] **Step 2: Run the failing runbook check**

Run: `npm run operator:runbook-check`
Expected: FAIL because the new Pay trust commands are undocumented.

- [ ] **Step 3: Add the merchant trust document**

```md
# Pay Merchant Trust Surface

This surface explains:

- what Vanta keeps private
- which steps are policy-bound
- how refunds, withdrawals, and reconciliation remain merchant-visible
- which commands prove the current trust surface
```

- [ ] **Step 4: Update README and SUBMISSION category language**

```md
Vanta is building the merchant-first control plane for private, policy-legible stablecoin settlement.
```

```md
The premium merchant wedge is:

- private checkout
- clear approval boundaries
- merchant-visible settlement, refund, withdrawal, and reconciliation states
```

- [ ] **Step 5: Run verification**

Run:
- `npm run operator:runbook-check`
- `npm run pay:verify`

Expected:
- runbook check passes with the new Pay trust command references
- Pay verification passes with docs and code aligned

- [ ] **Step 6: Commit**

```bash
git add docs/pay-merchant-trust-surface.md README.md SUBMISSION.md docs/operator-runbook.md
git commit -m "docs: add merchant trust surface framing"
```

### Task 5: Tighten Pay Verification Into a Merchant Control-Plane Checkpoint

**Files:**
- Modify: `package.json`
- Modify: `scripts/check-vanta-pay-contract.mjs`
- Modify: `scripts/print-vanta-pay-status.mjs`
- Modify: `docs/operator-runbook.md`

- [ ] **Step 1: Write the failing assertions that `pay:verify` includes the new merchant trust command set**

```js
assert.ok(
  packageJson.scripts["pay:verify"].includes("npm run pay:merchant-trust-status-check"),
  "pay:verify must include merchant trust status check.",
);
assert.ok(
  packageJson.scripts["pay:verify"].includes("npm run pay:approval-packet-check"),
  "pay:verify must include approval packet check.",
);
```

- [ ] **Step 2: Run the failing Pay contract check**

Run: `npm run pay:contract-check`
Expected: FAIL because `pay:verify` does not yet include the new checks.

- [ ] **Step 3: Update the verification chain and status printer**

```json
{
  "pay:verify": "npm run pay:contract-check && npm run pay:status && npm run pay:status-json && npm run pay:merchant-trust-status-check && npm run pay:approval-packet-check && npm run pay-tab:copy-check && npm run pay:merchant-api-check && npm run pay:production-private-rail-guard-check && npm run pay:browser-check && npm run security:limitations-check && npm run operator:runbook-check && npm run build"
}
```

```js
console.log("- merchant trust surface: npm run pay:merchant-trust-status");
console.log("- approval packet contract: npm run pay:approval-packet-check");
```

- [ ] **Step 4: Run full verification**

Run:
- `npm run pay:contract-check`
- `npm run pay:verify`
- `npm run build`

Expected:
- Pay contract check passes
- full Pay verify passes
- build passes with the merchant settlement control-plane checkpoint in place

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/check-vanta-pay-contract.mjs scripts/print-vanta-pay-status.mjs docs/operator-runbook.md
git commit -m "chore: promote pay verify into merchant control-plane checkpoint"
```

---

## Self-Review

### Spec coverage

- Merchant-first trust surface: covered by Task 1.
- Merchant-visible settlement lifecycle: covered by Task 2.
- Typed approval / permission packet: covered by Task 3.
- Public/docs/submission alignment: covered by Task 4.
- Canonical verification chain: covered by Task 5.

### Placeholder scan

- No `TODO`, `TBD`, or "implement later" markers remain.
- Each task names exact files and exact commands.
- Each code-changing step includes concrete code snippets.

### Type consistency

- Merchant trust status uses `vanta-pay-merchant-trust-status-0.1` consistently.
- Approval packet uses `vanta-pay-approval-packet-0.1` consistently.
- Lifecycle model is consistently `preview-approve-execute-settle`.

Plan complete and saved to `docs/superpowers/plans/2026-04-23-vanta-merchant-settlement-control-plane.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

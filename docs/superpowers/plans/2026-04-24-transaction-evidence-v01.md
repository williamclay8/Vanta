# Transaction Evidence v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first canonical transaction evidence contract so Vanta can distinguish preview, proof, operator record, wallet transaction, and production settlement claims.

**Architecture:** The first slice adds a shared TypeScript contract in `src/transactions/`, a static reviewer-facing artifact under `ops/mainnet/`, and a Node checker that enforces the artifact shape, package script, preflight inclusion, and Unshield UI adoption. Unshield is the first attached flow because private-core already has proof and operator-release state without requiring a live mainnet funds transaction.

**Tech Stack:** TypeScript, React, Node assertion scripts, existing npm verification scripts, existing `ops/mainnet/*.evidence.json` conventions.

---

### Task 1: Failing Evidence Contract Check

**Files:**
- Create: `scripts/check-vanta-transaction-evidence.mjs`
- Modify: `package.json`
- Later create: `ops/mainnet/transaction-evidence.v0.1.json`
- Later create: `src/transactions/vantaTransactionEvidence.ts`
- Later modify: `src/pages/UnshieldPage.tsx`

- [ ] **Step 1: Write the failing check**

Create `scripts/check-vanta-transaction-evidence.mjs` that requires:
- `ops/mainnet/transaction-evidence.v0.1.json`
- `version: "vanta-transaction-evidence-0.1"`
- `productionReady: false`
- `mainnetReady: false`
- Unshield evidence with `scope: "local-operator-harness"`
- proof status `verified`
- wallet status `not-required-for-local-proof-record`
- settlement status `not-live-mainnet-settlement`
- operator release status `pending-or-recorded`
- no secret-bearing strings
- `package.json` script `transaction:evidence-check`
- `mainnet:preflight` includes the check
- `src/pages/UnshieldPage.tsx` references the shared transaction evidence contract

- [ ] **Step 2: Run the check to verify it fails**

Run: `node scripts/check-vanta-transaction-evidence.mjs`

Expected: FAIL because the evidence artifact and package script do not exist yet.

### Task 2: Minimal Evidence Contract and Artifact

**Files:**
- Create: `src/transactions/vantaTransactionEvidence.ts`
- Create: `ops/mainnet/transaction-evidence.v0.1.json`
- Modify: `package.json`

- [ ] **Step 1: Add the shared TypeScript contract**

Create a focused module with Vanta Transaction Evidence v0.1 types and a small Unshield builder.

- [ ] **Step 2: Add the static reviewer-facing artifact**

Create `ops/mainnet/transaction-evidence.v0.1.json` with explicit non-production truth and current Unshield proof/operator scope.

- [ ] **Step 3: Add npm script and preflight inclusion**

Expose `npm run transaction:evidence-check` and include it in `mainnet:preflight`.

- [ ] **Step 4: Run the check to verify it passes**

Run: `npm run transaction:evidence-check`

Expected: PASS.

### Task 3: Unshield Adoption and Verification

**Files:**
- Modify: `src/pages/UnshieldPage.tsx`

- [ ] **Step 1: Import and use the Unshield evidence builder**

Use the builder to derive a local evidence snapshot from current Unshield completion, proof diagnostics, and operator release signature state.

- [ ] **Step 2: Surface concise evidence state in the completion panel**

Show proof, wallet, operator release, and settlement scope without claiming live mainnet settlement.

- [ ] **Step 3: Run focused and canonical verification**

Run:
- `npm run transaction:evidence-check`
- `npm run truth:transaction-check`
- `npm run private-core:check`
- `npm run build`

Expected: all commands exit 0.


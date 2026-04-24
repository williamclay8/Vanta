# Vanta Top 3 Merchant-First Roadmap Design

**Date:** 2026-04-23

## Goal

Define the three highest-leverage product additions that move Vanta closer to becoming the premier merchant-first private stablecoin settlement app:

1. merchant control plane
2. approval packet UX
3. trust/readiness center

These three additions should work as one coherent control-plane product rather than three disconnected features.

## Product thesis

Vanta should become premier by making private settlement operationally legible.

The product should feel:

- calm instead of noisy
- precise instead of magical
- merchant-usable instead of protocol-centric
- trustworthy because it shows its boundaries clearly

This roadmap is explicitly merchant-first. It does not optimize for broad consumer-wallet expansion. It does not widen the product into generic crypto utility. It strengthens the part of Vanta that already has the strongest repo and strategy support: private settlement with typed trust and machine-checkable operator truth.

## Why these three

### 1. Merchant control plane

This is the primary product surface.

Vanta already has Pay, merchant-trust work, refunds, withdrawals, receipts, and reconciliation concepts in the repo. What is still missing is a first-class merchant operating surface that makes those capabilities feel like one system.

Without this, Vanta reads as promising infrastructure with a thin demo layer.

### 2. Approval packet UX

This is the core trust interaction.

Vanta already values typed approval boundaries and simulation-before-signing, but the moat is weaker if those ideas live only in checks, types, and scripts. The product should show merchants and users exactly what is being approved, what is private, what policy applies, and what happens next.

Without this, Vanta risks feeling like a normal crypto payment UI with hidden complexity.

### 3. Trust/readiness center

This is the proof layer.

Vanta already has unusually strong readiness, operator, and status surfaces. The product should package that truth into one dedicated place that merchants, partners, and reviewers can understand quickly.

Without this, Vanta's strongest trust advantage stays fragmented across scripts, panels, and docs.

## Non-goals

- building a broad consumer wallet
- expanding into many new asset or chain surfaces before the merchant wedge is strong
- adding generic AI-agent features before approval and policy packets are productized
- presenting privacy as total anonymity
- claiming production readiness before readiness surfaces actually support that claim

## Recommended packaging

Use one unified merchant-first control-plane roadmap rather than three separate mini-roadmaps.

Recommended sequencing:

1. merchant control plane
2. approval packet UX
3. trust/readiness center

Reason:

- the merchant control plane makes Vanta feel useful
- the approval packet UX makes Vanta feel differentiated
- the trust/readiness center makes Vanta feel credible

This order preserves the product wedge while still exposing Vanta's trust model early.

## Surface 1: Merchant Control Plane

### Purpose

Give merchants one primary operating surface for payment intake, balances, payout state, refunds, withdrawals, receipts, and reconciliation.

### Product behavior

The merchant control plane should:

- extend the real Pay surface instead of creating a disconnected product
- show balances, payout queue, receipt history, refund state, withdrawal state, and reconciliation state together
- make settlement lifecycle states visible in plain language
- keep one dominant action per panel
- support design-partner/demo framing while `productionReady: false`

### Key states

- `intake_visible`
- `balances_visible`
- `payout_queue_visible`
- `receipts_visible`
- `refunds_visible`
- `withdrawals_visible`
- `reconciliation_visible`

These states do not need to become one single enum immediately, but each must have clear rendering conditions and stable copy.

### Repo alignment

Primary existing seams:

- `src/pages/PayPage.tsx`
- `src/pay/`
- `docs/superpowers/plans/2026-04-23-vanta-pay-merchant-dashboard-and-demo.md`
- `docs/superpowers/plans/2026-04-23-vanta-pay-merchant-settlement-console.md`

### Canonical user-facing promise

Vanta should feel like a merchant settlement operating surface, not just a checkout demo.

## Surface 2: Approval Packet UX

### Purpose

Turn Vanta's typed approval model into a visible product experience.

### Product behavior

Before any meaningful payment execution step, Vanta should present a reusable approval packet that shows:

- what action is being requested
- what amount and asset are involved
- what is private
- what is visible to the merchant or operator
- what policy boundary applies
- what state comes next
- what fallback or retry path exists if execution does not complete

This should map to Vanta's existing `preview -> approve -> execute -> settle` framing.

### Design rules

- use plain language before protocol language
- do not collapse preview and execution into one implied action
- do not hide policy boundaries inside tooltips or docs
- do not overclaim finality when execution is still pending

### Key states

- `preview`
- `approve`
- `execute`
- `settle`
- `pending`
- `error`

The approval packet should always make clear which of these states the user is currently in.

### Repo alignment

Primary existing seams:

- `src/pay/` approval-packet work
- `src/wallet/`
- Pay status and approval packet checks in `package.json`

### Canonical user-facing promise

Vanta should show exactly what is being approved and why, before money movement continues.

## Surface 3: Trust/Readiness Center

### Purpose

Expose Vanta's current trust, readiness, and limitation surfaces in one dedicated place for merchants, partners, and reviewers.

### Product behavior

The trust/readiness center should aggregate:

- merchant trust status
- operator status and evidence summaries
- beta-mode truth
- security limitations
- production-readiness truth
- canonical reviewer commands where helpful

This surface should answer:

1. What does Vanta currently prove?
2. What does it not yet prove?
3. Which boundaries are operator-controlled or policy-bound?
4. What commands or evidence back those claims?

### Design rules

- trust language must stay simple
- machine-readable truth should remain available underneath
- limitations must be visible, not buried
- beta-mode truth must remain explicit
- do not present internal detail as marketing copy

### Key states

- `beta`
- `limited`
- `verifiable`
- `not_production_ready`
- `operator_visible`

These labels may evolve, but the surface must keep honest readiness framing and explicit limitations.

### Repo alignment

Primary existing seams:

- `src/readiness/`
- merchant trust status surfaces in `src/pay/`
- private-core and mainnet readiness commands in `package.json`
- `security:limitations-check`

### Canonical user-facing promise

Vanta should make trust review faster, not harder.

## Cross-surface principles

These three additions must share one product language:

- controlled privacy
- legible trust
- merchant-visible settlement states
- simulation and approval before execution
- explicit pending/error states
- truthful readiness and limitations

These additions should not feel like separate modules owned by separate philosophies. They should read as one coherent merchant control plane.

## Priority order

### First priority: Merchant control plane

This is the clearest path to product usefulness and design-partner relevance.

### Second priority: Approval packet UX

This is the clearest path to turning Vanta's typed trust into visible product differentiation.

### Third priority: Trust/readiness center

This is the clearest path to making Vanta's proof layer legible to merchants and partners.

## Delivery phases

### Phase 1: Merchant control plane

Upgrade the Pay experience into a real merchant operating surface.

Expected outcomes:

- richer merchant dashboard
- visible balances and payout queue
- receipts, refunds, withdrawals, and reconciliation made legible
- tighter design-partner framing while still in preview

### Phase 2: Approval packet UX

Add a reusable approval packet surface to the real payment lifecycle.

Expected outcomes:

- visible preview/approve/execute/settle flow
- clearer policy boundaries
- better simulation-before-signing visibility
- less ambiguity around action and outcome

### Phase 3: Trust/readiness center

Add a dedicated proof and limitations surface.

Expected outcomes:

- one obvious place for trust review
- explicit readiness and limitation language
- easier partner diligence
- tighter alignment between UI, docs, and command-backed truth

## Verification expectations

Any implementation derived from this roadmap should preserve Vanta's existing verification discipline.

Minimum expected commands:

- `npm run build`
- `npm run pay:verify`

When work touches trust, readiness, or operator claims, implementations should also use the relevant existing status/check commands already exposed in `package.json` rather than inventing weaker ad hoc summaries.

## Risks

- the merchant control plane could become a prettier demo if it is not connected to real runtime seams
- the approval packet UX could become copy-only if it is not grounded in the typed approval contract
- the trust/readiness center could become doc duplication if it is not tied to existing command-backed surfaces
- the roadmap could drift into broad wallet expansion if merchant-first discipline is not preserved

## Recommendation

Treat these three additions as the next coherent merchant-first roadmap for Vanta:

1. make the merchant operating surface real
2. make approval and policy boundaries visible
3. make readiness and limitations reviewable in-product

This is the shortest path from promising infrastructure to a premium private settlement product.

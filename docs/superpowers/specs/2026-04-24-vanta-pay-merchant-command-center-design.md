# Vanta Pay Merchant Command Center Design

## Product Direction

Vanta Pay should become a Merchant Command Center: a payment-action surface surrounded by clear trust, privacy, and operator context. The first screen still starts with "create a payment" because that is the merchant's primary task, but the page should feel like the front door to a serious payment suite rather than a demo form.

This direction intentionally avoids claiming that Vanta Pay is a finished production processor or a live mainnet privacy network. Premier quality here means that the product is simple, truthful, operationally legible, and privacy-aware.

## Goals

- Make `/app/pay` feel like a premium merchant payment suite while keeping the primary task fast.
- Show enough operational context that a merchant can understand settlement, receipts, readiness, and beta limitations.
- Surface privacy truth explicitly: private-settlement receipts are required by the backend, but production/mainnet privacy claims are not allowed yet.
- Keep Pay copy commerce-first and avoid leaking protocol vocabulary into the buyer/merchant action flow.
- Preserve canonical verification through `pay:browser-check`, `pay-tab:copy-check`, `pay:doc-truth-check`, and `pay:verify`.

## Non-Goals

- Do not make Pay look production-ready.
- Do not move real funds, require secrets, or connect to live infrastructure.
- Do not broaden into a full merchant dashboard with mutable refunds, invoices, withdrawals, or webhooks in this iteration.
- Do not remove beta/no-funds language.
- Do not claim meaningful private payment semantics until the readiness commands allow it.

## Current Truth

The current visible `/app/pay` surface is a minimal payment-entry preview with payment description, amount, asset, customer email, review, route preview, receipt preview, and a beta-disabled CTA.

The backend and operator layers are richer than the visible UI. They include typed checkout, payment, receipt, refund, withdrawal, invoice, payment link, webhook, private rail receipt, merchant trust status, approval packet, readiness, and status surfaces.

Current production readiness remains blocked by missing durable Pay store configuration, missing Pay Private Pool v2 operator configuration, no live mainnet private settlement, no active real-funds approval window, no audited shared anonymity set, and `productionReady: false`.

## Experience Model

The Merchant Command Center uses a three-zone layout:

1. Collect
   - The payment form remains the main action.
   - Labels clearly frame the actor as the merchant creating a request.
   - The review card updates live.
   - Beta mode explains why the CTA is disabled.

2. Trust Rail
   - Compact status cards show route preview, receipt preview, beta/no-funds mode, and privacy readiness.
   - The privacy card must say that private settlement is required by the Pay backend but production privacy claims are not yet allowed.
   - The language should be plain merchant language, not protocol internals.

3. Operations Strip
   - Read-only cards show settlement queue, operator status, recent receipt, refund/withdrawal posture, and reconciliation readiness.
   - These cards should feel like a merchant command surface without implying live operational control.
   - The data may come from typed static summary modules for now, as long as docs and checks describe it as preview/read-only.

## UI Principles

- Keep the first viewport dense but calm: no oversized marketing hero.
- Use existing Vanta visual language, with improved spacing, focus states, tabular numbers, and clear card hierarchy.
- Keep cards at restrained radii and avoid nested card clutter.
- Use one primary action.
- Keep all interactive targets at least 44px tall.
- Provide visible focus states and disabled explanations.
- Use tabular numbers for payment amounts and operational counts.
- Keep mobile layout single-column, with the trust rail and operations strip below the payment action.

## Data And Boundaries

Add a small typed Pay command-center summary module for UI-only preview data. It should contain:

- trust rail items
- operator/readiness posture
- settlement queue details
- recent receipt summary
- reconciliation summary
- explicit privacy/readiness limitation copy

This module should not replace the real runtime or status commands. It is a UI-facing summary for a beta product surface.

## Error And Disabled States

The payment form should handle:

- missing title
- missing amount
- non-positive amount
- invalid customer email when an email is entered
- beta mode disabled CTA

The page should display concise inline helper text near the affected field and keep the live review stable.

## Verification

Minimum verification after implementation:

- `npm run pay:browser-check`
- `npm run pay-tab:copy-check`
- `npm run pay:doc-truth-check`
- `npm run pay:verify`

If the full Pay gate is too slow or fails for an unrelated environmental reason, record the failure honestly and run the narrow commands that match the touched surfaces.

## Documentation

Update the Pay merchant trust docs and public Pay docs to say:

- `/app/pay` is now a Merchant Command Center preview.
- The page combines payment creation, trust rail, and read-only operations context.
- It is still not a production payment processor.
- It does not allow meaningful production/mainnet privacy claims yet.

## Implementation Shape

The implementation should touch:

- `src/pages/PayPage.tsx`
- `src/styles.css`
- a new `src/pay/vantaPayMerchantCommandCenter.ts`
- `scripts/check-vanta-pay-browser.mjs`
- `scripts/check-vanta-pay-tab-copy.mjs` if new commerce-first copy needs guardrail updates
- `src/pages/DocsPayPage.tsx`
- `docs/pay-merchant-trust-surface.md`
- `README.md` only if the existing Pay section drifts from the new surface

## Self-Review

- No placeholders remain.
- The design keeps production and privacy limitations explicit.
- The scope is one coherent UI/docs/verification iteration, not a full merchant dashboard rewrite.
- The implementation can be verified with existing Pay commands.

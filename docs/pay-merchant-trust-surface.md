# Pay Merchant Trust Surface

Vanta Pay is the merchant side of Vanta.

The simple version: merchants and customers should not need to understand the
privacy system before they can understand a payment.

Current truth: `/app/pay` is a merchant preview, not a finished production
payments network. It shows the work a business would expect around a payment:
create and review a request, preview checkout, inspect records, understand
refunds and withdrawals, and see the limits before anything sounds live.

Production privacy claims are not enabled yet. The backend can require private rail receipts before payment completion, but that is not the same as live mainnet private payment readiness.

## What stays private

The payment flow keeps sensitive settlement mechanics inside the Pay backend
instead of asking merchants or customers to reason about protocol internals.

Today, that means:

- checkout preview handling
- settlement receipts from the private settlement adapter when an operator rail is configured
- simulation-bound approval before wallet action
- typed status surfaces instead of implicit assumptions

## What stays legible

The Pay tab should stay action-first. On `/app/pay`, the visible inputs and
review fields are:

- `Payment details`, `What are you collecting for?`, `Amount`, `Asset`, `Customer email`, and `Review payment`

The visible suite inventory can include checkout, payment links, invoices,
subscriptions, refunds, withdrawals, reconciliation, developer controls, API
keys, and signed webhooks, but the page should keep the payment request path
first.

Route preview, receipt path preview, transaction evidence, and beta disabled
state remain visible alongside trust and privacy-readiness limits so the tab
does not imply live funds.

The merchant API, status, approval packet, refunds, withdrawals, reconciliation, payment links, invoices, and webhook delivery still live in the Pay backend and verification commands. The default Pay tab may show read-only operations context, but it must not claim live production processing.

The approval packet keeps the action boundary fixed as:

- `preview`
- `approve`
- `execute`
- `settle`

In one line: Pay should feel like a merchant tool for previewing private
payment work, not a protocol console or production processor.

## What the commands prove

Use these commands to check the current trust surface:

```bash
npm run pay:merchant-trust-status
npm run pay:merchant-trust-status-check
npm run pay:approval-packet-check
npm run pay:verify
```

`pay:merchant-trust-status` prints the current merchant trust summary.
`pay:merchant-trust-status-check` verifies the status surface contract.
`pay:approval-packet-check` verifies the payment approval boundary.
`pay:verify` runs the broader Pay verification chain that includes both checks.

## What this does not claim

This surface is a trust-and-readability guide, not a claim that Vanta Pay is a fully audited, mainnet-production payment processor.

The current status remains `productionReady: false`.

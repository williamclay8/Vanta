# Pay Merchant Trust Surface

Vanta Pay is the merchant side of Vanta.

The simple version: merchants and customers should not need to understand the
privacy protocol before they can understand a payment. Current truth: the default `/app/pay` surface is now a simple payment-entry flow, not a dashboard.

The current Pay surface is a narrow preview for creating and reviewing one
payment request. It is not a production payment processor.

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

The payment route preview, receipt path preview, beta disabled state, and pricing truth remain visible so the tab does not imply live funds or active billing.

The merchant API, status, approval packet, refunds, withdrawals, and reconciliation still live in the Pay backend and verification commands. They should not make the default Pay tab feel like an operations console.

The approval packet keeps the action boundary fixed as:

- `preview`
- `approve`
- `execute`
- `settle`

In one line: Pay should feel like a simple payment action, not a protocol console or merchant dashboard.

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

This surface is a trust-and-readability control plane, not a claim that Vanta Pay is a fully audited, mainnet-production payment processor.

The current status remains `productionReady: false`.

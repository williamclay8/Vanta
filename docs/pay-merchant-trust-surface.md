# Pay Merchant Trust Surface

Vanta Pay is the merchant side of Vanta.

The simple version: merchants should not need to understand the privacy protocol before they can understand a payment. Pay turns the system into business tasks:

- create a link
- send an invoice
- preview checkout
- approve execution
- track settlement
- handle refunds and withdrawals
- keep receipts and reconciliation records

The current Pay surface is a control plane for policy-legible stablecoin settlement previews. It is not a production payment processor.

## What stays private

The payment flow keeps sensitive settlement mechanics inside the Pay control plane instead of asking merchants to reason about protocol internals.

Today, that means:

- checkout preview handling
- settlement receipts from the private settlement adapter when an operator rail is configured
- simulation-bound approval before wallet action
- typed status surfaces instead of implicit assumptions

## What stays legible

Merchants still need a clear business record. They should be able to see the important lifecycle states without learning words like note, nullifier, or proof.

Current merchant-visible states include:

- settlement lifecycle
- refund state
- withdrawal state
- reconciliation state

The real Pay demo now shows:

- the merchant control plane as the default `/app/pay` surface
- a trust packet with `What is private`, `What is visible`, `Policy mode`, and `Approval boundary`
- workflow entry points for creating links, sending invoices, previewing checkout, and withdrawing funds
- merchant operations and approval boundary copy
- refund / withdrawal / reconciliation detail states
- runtime-backed empty-state console cards for balances, refund queue, withdrawal queue, and reconciliation export
  - those console records currently reflect the fresh Pay runtime state rendered on the real Pay page
- design-partner-facing settlement framing

The design-partner layer currently uses this shared UI copy on the real Pay page:

- eyebrow: `Design partner preview`
- title: `Merchant pilot`
- body: `Settlement control-plane preview without protocol overhead.`

The approval packet keeps the action boundary fixed as:

- `preview`
- `approve`
- `execute`
- `settle`

In one line: Pay should feel like a merchant dashboard, not a protocol console.

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

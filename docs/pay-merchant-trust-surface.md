# Pay Merchant Trust Surface

Vanta Pay is the merchant-first control plane for private, policy-legible stablecoin settlement.

This page explains the current trust surface in simple terms:

- what Vanta keeps private
- which payment steps are policy-bound
- how refunds, withdrawals, and reconciliation remain merchant-visible
- how the real Pay demo now frames the merchant control plane for design partners
- which commands prove the current trust surface

## What stays private

The payment flow is built to keep sensitive settlement mechanics inside the Pay control plane rather than exposing them as loose UI state or ad hoc merchant logic.

That means the current surface is designed around:

- private checkout handling
- settlement receipts from the private settlement adapter
- simulation-bound approval before wallet action
- typed status surfaces instead of implicit assumptions

## What stays legible

The merchant-facing boundary is intentionally explicit. Merchants should be able to see the important payment lifecycle states without learning protocol internals.

Current merchant-visible states include:

- settlement lifecycle
- refund state
- withdrawal state
- reconciliation state

The real Pay demo now shows:

- merchant operations
- approval boundary
- refund / withdrawal / reconciliation detail states
- design-partner-facing settlement framing

The shared design-partner layer is currently:

- eyebrow: `Design partner preview`
- title: `Merchant pilot`
- body: `Private settlement without protocol overhead.`

The approval packet keeps the action boundary fixed as:

- `preview`
- `approve`
- `execute`
- `settle`

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

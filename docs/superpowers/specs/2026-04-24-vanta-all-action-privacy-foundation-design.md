# Vanta All-Action Privacy Foundation Design

## Purpose

Move Vanta toward proof-backed, operator-verifiable private-settlement foundations across Shield, Send, Swap, Unshield, and Pay without overclaiming the current protocol. This design lands the first approved foundation slices:

- a machine-readable privacy disclosure contract
- a unified token availability model
- a stronger all-action Private Pool v2 settlement smoke

It does not claim that Vanta is fully private or production-ready.

## Current Truth

Private Core proves note membership and transitions. Its Send, Swap, and Unshield proof-public economic terms have since been upgraded to hash-bound fields:

- Send exposes `send_economic_terms_hash`, nullifier, root, recipient commitment, and change commitment, not raw proof-public asset/send amount/change amount.
- Swap exposes `swap_economic_terms_hash`, nullifier, root, and output commitment, not raw proof-public input/output assets or amounts.
- Unshield exposes `unshield_economic_terms_hash`, nullifier, root, note version, and consume context, not raw proof-public destination/asset/amount.
- Source boundary, private witness, request/operator, and exit-settlement layers still carry raw economic terms where current local execution needs them.

Private Pool v2 shield/claim circuits hash-bind request terms in-circuit, but the request/operator layer still sees asset, amount, destination, route, roots, commitments, and nullifiers.

## Design

### Slice 1: Privacy Boundary Contract

Add a pure contract module that classifies every current lane by privacy tier:

- `v1.5-hash-bound-public-request-terms`: Private Core send, swap, unshield, plus Private Pool v2 shield and claim.
- `v2-hidden-economic-terms`: reserved future target.

Each descriptor lists public disclosures, hidden witness material, and future blockers. A checker fails if the current lanes drift into false hidden-economic claims.

### Slice 2: Unified Token Availability

Add a server-safe token catalog for:

`USDC`, `USDC`, `JTO`, `BONK`, `JUP`, `PYUSD`, `WIF`, `KMNO`, `SOL`, `USDT`.

Add an app availability adapter layered on `shieldConfig` that exposes per-action availability for Shield, Send, Swap, and Pay. Execution remains gated by existing capability checks. The shared catalog prevents Pay, Send, Swap, and Shield from silently diverging.

### Slice 3: All-Action Private Pool v2 Smoke

Harden the existing Private Pool v2 protocol-settlement endpoint for `shield`, `send`, `swap`, and `unshield`:

- accepts each action
- preserves idempotency
- rejects conflicting replay
- exposes honest proof mode/status
- does not claim hidden economic terms

Send/swap remain typed smoke requests until real hidden-asset/amount conservation circuits exist.

## Verification

Minimum verification for this foundation:

- `npm run private-core:privacy-boundary-check`
- `npm run token-availability:check`
- `npm run private-pool-v2:protocol-client-check`
- `npm run private-core:contract-smoke`
- `npm run privacy-rail:contract-check`
- `npm run truth:transaction-check`
- `npm run build`

Stronger follow-up verification:

- `npm run pay:verify`
- `npm run private-core:verify`
- `npm run private-pool-v2:verify`

## Non-Goals

- no mainnet funds
- no production privacy claim
- no audit claim
- no claim that asset, amount, or destination are hidden today
- no broad Pay UI rewrite while the working tree has in-flight Pay edits

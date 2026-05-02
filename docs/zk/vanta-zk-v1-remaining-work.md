# Vanta ZK v1 Remaining Work

## Current estimate

There are two different finish lines in the repo right now:

- `Vanta Private Core zk foundation`
- `Full Vanta zk v1 product`

Current estimate:

- Narrow Vanta zk v1 lane frozen in the repo: `100/100`
- Broader Vanta zk v1 product: `70/100`

That split matters because the repo now has real:
- unshield
- private send
- constrained swap

proof lanes with operator-backed seams and restart coverage, but the broader product-level `v1` definition is still larger than the currently frozen narrow lane.

## Already done

- frozen `NoteV0`, `NoteType`, field widths, encoding order, and domain tags
- deterministic note commitments
- ordered Merkle roots and proofs
- encrypted payload recovery for held private notes
- deterministic nullifier derivation
- replay rejection
- first executable fixed-depth Noir circuit for single-note unshield
- Poseidon proving lane for the first unshield circuit
- local regression guard via `npm run private-core:check`
- local proof generation and verification via `npm run private-core:prove`
- operator-backed consume seam check via `npm run private-core:consume-check`
- operator HTTP smoke test via `npm run private-core:http-smoke`
- full-stack private-core verification via `npm run private-core:verify`
- operator-backed proof execution and verification for the current narrow unshield lane
- operator-backed proof execution and verification for the current narrow send lane
- operator-summary versioning for the supported narrow:
  - send lane
  - unshield lane
  - release lane
- proof-backed root registration for the current narrow operator lane
- operator-side registered-root and latest-root enforcement for the current narrow consume lane
- explicit operator state contracts for:
  - `currentRoot`
  - `latestConsume`
  - empty-state summaries for both endpoints
- explicit supported-lane, v1-decision, and assumption contracts in the operator summary for:
  - send lane
  - unshield lane
  - release lane
  - owner auth mode
  - nullifier key mode
  - proving hash lane
- app-side Shield, Hold, Unshield, and replay demo integration
- operator-backed private send transitions from shielded state
- recipient-output downstream continuity:
  - register
  - consume
  - replay rejection
  - restart persistence
  - tamper detection
- change-output downstream continuity:
  - register
  - consume
  - replay rejection
  - restart persistence
  - tamper detection
- internal diagnostics that expose the source-layer and proving-lane split honestly

## Shipping decision

The narrow frozen lane is now the accepted shipping definition of `zk v1`.

That decision is recorded explicitly in:

- `docs/zk/vanta-zk-v1-shipping-decision.md`

The current repo truth should now be read as:

- narrow private-core `zk v1` lane: shipped definition accepted
- broader Vanta privacy/product vision: still in progress

The shipping definition remains:

- exact scope: narrow private-core lane
- required lanes: `send|unshield|release`
- canonical exact candidate lane: `primary-send-unshield-only`
- constrained swap: adjacent support, not minimum finish-line scope

## Can slip to v1.1

These look important, but they are no longer blocking for the accepted narrow shipping definition.

- in-circuit owner authorization, if off-circuit owner auth is explicitly frozen for `v1`
- multi-note proofs
- joins and splits
- generalized private swap beyond the constrained current lane
- recursive proofs
- broader multi-asset generality
- production-grade relayer architecture
- total elimination of all transitional source-layer hash surfaces

## What is actually left

For the accepted narrow shipping definition, what remains is mostly:

1. optional presentation and demo polish
2. optional stronger protocol hardening beyond the accepted `v1` assumptions
3. broader product work outside the narrow finish line

For the broader Vanta product vision, the next meaningful work is:

1. stronger owner-auth semantics if off-circuit auth should no longer be accepted
2. stronger release execution semantics beyond the current operator-recorded mainnet model
3. broader private payment and privacy-suite workflows
4. deciding whether swap ever graduates from support-only to minimum-finish-line scope

## Honest summary

If the question is "are the first Vanta zk lanes real yet?", the answer is yes.

If the question is "is Vanta zk v1 finished?", the honest answer is no.

The current repo is much closer to:
- `first real zk consume + send + constrained swap lanes`

than to:
- `finished Vanta zk v1 product`

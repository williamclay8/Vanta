# Vanta ZK v1 Shipping Decision

## Decision

Vanta should now treat the **narrow private-core `zk v1` lane** frozen in this repo as the
accepted shipping definition of `zk v1`.

That shipping definition is:

`Shield -> Hold -> Private Send -> Register Resulting Root -> Unshield -> Release -> Replay Guard`

with the **canonical exact release-candidate lane** frozen as:

`primary-send-unshield-only`

## What is being called shipped

This decision applies to the narrow operator-backed private-core lane already frozen across:

- operator contract
- operator status
- operator snapshot
- shipping decision
- shipping artifact
- exact release candidate
- release package
- final release-readiness surface
- shared app/runtime release workflow

The supported minimum required lanes remain:

- `send`
- `unshield`
- `release`

Constrained swap remains:

- supported infrastructure
- adjacent to the finish line
- not required for the minimum shipping definition

## Why this is now enough

The repo now has:

- executable unshield, send, and constrained swap proof lanes
- local proof generation for all three
- operator-backed proof, send, consume, release, and restart persistence seams
- exact release-candidate lineage on the canonical primary lane
- operator-owned release package and final release-readiness surfaces
- product/runtime visibility for:
  - exact candidate
  - release workflow
  - release handoff
  - release package
  - final reviewer/download flow
- canonical verification and reviewer commands that stay green:
  - `npm run private-core:verify`
  - `npm run private-core:demo-preflight`
  - `npm run private-core:release-readiness`
  - `npm run private-core:release-readiness-check`

This means the narrow lane is no longer just a proving foundation.
It is now a coherent, reviewable, operator-backed shipping lane.

## What this decision does not mean

This decision does **not** mean the broader Vanta privacy suite is finished.

It does **not** upgrade the current assumptions into final-form protocol claims.
The following still remain explicit limitations of the shipped narrow `v1`:

- owner authorization remains off-circuit
- release remains the accepted operator-recorded mainnet release model
- nullifier-key choice remains the accepted temporary `v1` choice
- swap is not part of the minimum finish line
- broader privacy-suite/product scope remains future work

So the correct external reading is:

- **narrow private-core zk v1 lane:** shipped definition accepted
- **broader Vanta privacy/product vision:** not finished

## Canonical reviewer commands

Use these when a reviewer wants the shipping answer directly:

- `npm run private-core:release-readiness`
- `npm run private-core:release-readiness-check`
- `npm run private-core:demo-preflight`

Use these when a reviewer wants the underlying supporting surfaces:

- `npm run private-core:shipping-status`
- `npm run private-core:release-candidate`
- `npm run private-core:release-package`

## Practical product language

The repo should now describe the narrow lane as:

- shipped in narrow `zk v1` form
- operator-backed
- proof-backed
- intentionally constrained
- explicitly not the broader final privacy-suite endpoint

It should not describe the narrow lane as:

- still only foundational
- merely modeled
- missing a real shipping boundary

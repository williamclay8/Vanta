# R6 Fresh-Address Exit Approved Path - 2026-05-14

## Status

Approved owner decision.

Clay approved proof-bound fresh-address exit on 2026-05-14.

## Approved Direction

Allow `destinationOwner != requester` only when the destination is proof-bound.

Plain-language guard phrase for future checks: destinationOwner != requester only when the destination is proof-bound.

The current operator-keypair public-exit path must keep rejecting fresh-address exit until the release destination is bound by proof and the release path is wired through program-owned custody. Local committed Unshield proof/protocol/plan surfaces now require `proofBoundDestinationCommitment`, but that is only a fail-closed contract scaffold.

## Current Local Truth

- The current Unshield operator still rejects `destinationOwner !== requester`.
- `src/privacy/privatePoolV2ProofRequests.ts` requires `proofBoundDestinationCommitment` shaped as `sha256:<64 lowercase hex>` and binds it into committed Unshield public inputs.
- `operator/private-pool-v2-server.mjs` requires, fingerprints, replays, and receipts `proofBoundDestinationCommitment` for committed Unshield protocol settlements.
- `src/mainnet/actualPrivateSettlementPlan.mjs` and `scripts/print-vanta-actual-private-settlement-plan-json.mjs` require the proof-bound destination commitment for actual-private Unshield plans.
- `TAG_UNSHIELD` remains reserved and returns `ERR_UNSHIELD_RELEASE_NOT_WIRED` before release.
- The beta release path still depends on operator-keypair public exit.
- program-owned vault PDA release is not implemented.

## Implementation Requirements

- Destination address bound in the Unshield proof public inputs or an equivalent audited authorization transcript.
- `TAG_UNSHIELD` verifies the destination-bound proof before release.
- Program-owned vault PDA custody and CPI release.
- Nullifier consume before release.
- Operator accepts `destinationOwner != requester` only when the destination is proof-bound.
- Fresh-address exit UX and beta-truthful copy.
- Negative tests for unbound destinations, forged destinations, duplicate nullifiers, and invalid proofs.

## Verification

- `npm run unshield:public-exit-surface-check`
- `npm run private-pool-v2:unshield-proof-request-check`
- `npm run private-pool-v2:protocol-client-check`
- `npm run private-pool-v2:onchain-unshield-custody-check`
- `npm run zk:c01-onchain-proof-boundary-check`

## Truth Boundary

This note records an approved design direction and a local proof-bound destination commitment contract. It is not fresh-address exit privacy, not proof-verified release, not program-owned custody, not deployed `TAG_UNSHIELD`, not audit acceptance, not production privacy, and not real-funds readiness.

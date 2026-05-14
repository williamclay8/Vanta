# R6A Proof-Bound Destination Contract - 2026-05-14

## Status

Local implemented, fail-closed.

This is the first local contract slice for Clay's approved proof-bound fresh-address exit direction. It does not enable fresh-address exit.

## What Changed

- `src/privacy/privatePoolV2ProofRequests.ts` requires committed Unshield `proofBoundDestinationCommitment` to match `sha256:<64 lowercase hex>` and binds it into public inputs as `proof-bound-destination-commitment`.
- `operator/private-pool-v2-server.mjs` requires the proof-bound destination commitment for committed Unshield protocol settlements, includes it in fingerprints and replay checks, and preserves it in `protocolSettlementReceipt`.
- `src/privacy/privatePoolV2ProtocolSettlementClient.ts` validates committed Unshield receipts against the requested proof-bound destination commitment.
- `src/mainnet/actualPrivateSettlementPlan.mjs` and `scripts/print-vanta-actual-private-settlement-plan-json.mjs` require `proofBoundDestinationCommitment` for actual-private Unshield plans.
- `src/data/context/PrivacyFlowContext.tsx` and `src/pay/vantaPayPrivateSettlementAdapter.ts` derive `sha256:` proof-bound destination commitments without sending raw destination as a committed Unshield protocol field.

## Verification

- Red-first: `npm run private-pool-v2:unshield-proof-request-check` failed before missing and raw destination commitments were rejected.
- `npm run private-pool-v2:unshield-proof-request-check`
- `npm run private-pool-v2:hidden-economics-request-check`
- `npm run private-pool-v2:public-input-hash-alignment-check`
- `npm run private-pool-v2:protocol-client-check`
- `npm run private-pool-v2:http-smoke`
- `npm run private-pool-v2:restart-check`
- `npm run mainnet:actual-private-settlement-plan-check`
- `npm run mainnet:actual-private-settlement-plan-json-check`
- `npm run mainnet:actual-private-settlement-relayer-caller-check`
- `npm run mainnet:unshield-production-status-check`
- `npm run private-core:unshield-committed-settlement-check`
- `npm run unshield:public-exit-surface-check`
- `npm run private-pool-v2:onchain-unshield-custody-check`
- `npm run zk:c01-onchain-proof-boundary-check`

## Truth Boundary

This is not fresh-address exit privacy, not proof-verified release, not program-owned custody, not deployed `TAG_UNSHIELD`, not on-chain destination binding, not production privacy, and not real-funds readiness. The current operator-keypair public-exit path must keep rejecting `destinationOwner != requester`.

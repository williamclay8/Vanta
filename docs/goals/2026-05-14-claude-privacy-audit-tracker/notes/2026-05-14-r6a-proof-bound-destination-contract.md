# R6A Proof-Bound Destination Contract - 2026-05-14

**Phase 2 Full Blast update + surfaces lane (TAG6 toolkit integration)**: Added explicit closure path for "native-sol-sentinel-asset-id-not-indexed-in-v2-tree" (R6A / native-SOL-second-class) via one-time legacy WSOL migration flow (helper + UI panel + policy). Native SOL now addressable in v2 unified tree locally; future proof-bound fresh exit for SOL will use same sentinel notes + TAG6 system CPI path (per design doc §11). **TAG6 toolkit (scripts/native-sol-tag6/run-tag6-full-predeploy-checklist.mjs master checklist, scripts/verify-full-tag6-release-evidence.mjs verifier, scripts/probe-production-native-sol-sentinel-snapshot.mjs probe, scripts/scan-onchain-tag6-sol-releases.mjs scanner, scripts/native-sol-tag6/generate-tag6-external-gate-request-package.mjs generator) marked as the official, cited implementation of the §12 gates** (pre-deploy + live evidence) in architecture blocker map (R6A / A1-TAG6 / native-SOL-second-class Post-Deployment Phase), state.yaml, completion-audit, R notes, VANTA_ZK_REVIEW.findings.json, unshieldMainnetProductionStatus.mjs + unshieldTrustContract.ts (nativeSolOnchainBoundary, nativeSolLongTermBoundary, visibleStatusCopy, monitoringRefs now explicitly point to toolkit paths as the way to satisfy Post-Deployment Monitoring Checklist). Updated architecture blocker map, findings ledger, state.yaml, completion-audit. All surfaces reference design doc §12 + status note heavily; production flags remain false. Implications noted for /.well-known/vanta-audit.json.

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
- **TAG6 toolkit verification (canonical for §12 Post-Deployment Monitoring Checklist per design §12 + status note)**: `npm run private-pool-v2:tag6-full-predeploy-checklist`, `npm run private-pool-v2:native-sol-tag6-full-verify`, `npm run private-pool-v2:native-sol-live-evidence-probe`, `npm run private-pool-v2:native-sol-tag6-scan`, `npm run private-pool-v2:generate-tag6-external-gate-request-package` (exact paths in scripts/ + scripts/native-sol-tag6/; evidence in examples/evidence-bundle-*/ )
- `npm run mainnet:unshield-production-status-check`
- `npm run private-core:unshield-committed-settlement-check`
- `npm run unshield:public-exit-surface-check`
- `npm run private-pool-v2:onchain-unshield-custody-check`
- `npm run zk:c01-onchain-proof-boundary-check`

## Truth Boundary

This is not fresh-address exit privacy, not proof-verified release, not program-owned custody, not deployed `TAG_UNSHIELD`, not on-chain destination binding, not production privacy, and not real-funds readiness. The current operator-keypair public-exit path must keep rejecting `destinationOwner != requester`.

# PPA-SWAP-001 - Swap Economics Binding

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 1 - circuit fixes
- Recommended remediation order: 5
- Finding: Swap output amount, minimum output amount, slippage, and economics terms are not derived in-circuit.
- Primary circuit: `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr`

## Status

`implemented-verified-local`

Approved by Clay in-thread on 2026-05-25 with `approved PPA-SWAP-001`.

The local implementation now binds Swap economics terms into the Swap-to-shielded circuit and adjacent proof/operator/client surfaces.

## Planned Files

- `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr`
- `src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts`
- `src/privacy/privatePoolV2ProofRequests.ts`
- `src/privacy/privatePoolV2Types.ts`
- `src/privacy/privatePoolV2LocalProver.ts`
- `src/privacy/privatePoolV2ProtocolSettlementClient.ts`
- `operator/jupiter-sol-to-shielded-route-adapter.mjs`
- `src/solana/solToShieldedRouteAdapter.ts`
- `src/solana/publicSwapRoute.ts`
- `src/solana/swapOperatorClient.ts`
- `src/solana/swapAuth.ts`
- `src/strategy/strategyPrivateRailSettlement.ts`
- `src/pages/SwapPage.tsx`
- `src/zk/liveSwapBridge.ts`
- `operator/private-pool-v2-server.mjs`
- `scripts/write-vanta-private-pool-v2-swap-to-shielded-fixture.mjs`
- `scripts/check-vanta-private-pool-v2-swap-to-shielded-circuit.mjs`
- `scripts/check-vanta-private-pool-v2-swap-to-shielded-proof-request.mjs`
- `scripts/check-vanta-private-pool-v2-swap-to-shielded-browser-worker-prover.mjs`
- `scripts/check-vanta-private-pool-v2-public-input-hash-alignment.mjs`
- `scripts/check-vanta-private-pool-v2-contract.mjs`
- `scripts/check-vanta-circuit-soundness-lint.mjs`
- `PRODUCTION_PRIVACY_AUDIT.md`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-swap-001-economics-binding.md`

## Planned Fixtures

- Swap invalid `economics_commitment` preimage fixture where the witness economics terms are changed without recomputing `economics_commitment`.
- Swap invalid `min_output_amount` public/economics binding fixture where the committed terms differ from the witness terms.
- Swap invalid `slippage_bps` public/economics binding fixture where the committed terms differ from the witness terms.
- Swap invalid `output_amount` below `min_output_amount` fixture.
- Swap valid edge fixture where `output_amount == min_output_amount`.

## Planned Script

- `npm run swap:economics-binding-check`

The audit appendix names `swap:output-commitment-binding-check`, which already covers the prior output-note preimage item. This item needs a new fail-closed guard for the remaining Swap quote/economics terms.

## Implementation Summary

- Added private Swap witness inputs for `economics_blinding`, `min_output_amount`, and `slippage_bps`.
- Added circuit-side `compute_swap_economics_commitment` using arity-safe BN254 packing and asserted it equals `economics_commitment`.
- Added `output_amount >= min_output_amount`.
- Kept raw output/min/slippage terms out of proof-request `publicInputs`; `swap-public-input-hash` remains the public binding.
- Threaded output/min/slippage through proof request validation, local/browser prover witness input, protocol settlement client, operator replay/fingerprint handling, Jupiter/SOL-to-shielded route adapters, signed swap intent v3, swap memo payloads, live swap bridge records, and strategy committed-settlement handles.
- Added `npm run swap:economics-binding-check` and wired it into `private-pool-v2:verify` and the audit appendix.

## Test Cases

- Valid Swap-to-shielded with `economics_commitment` derived from input asset, output asset, input amount, output amount, minimum output amount, slippage bps, and an economics blinding value.
- Invalid Swap-to-shielded where `economics_commitment` is stale after an economics witness field changes.
- Invalid Swap-to-shielded where `min_output_amount` differs between the witness and the economics commitment preimage.
- Invalid Swap-to-shielded where `slippage_bps` differs between the witness and the economics commitment preimage.
- Invalid Swap-to-shielded where `output_amount < min_output_amount`.
- Valid Swap-to-shielded where `output_amount == min_output_amount`.

## Red/Green Evidence

- Red-first: before the circuit assertion existed, `npm run swap:economics-binding-check` failed because the invalid economics preimage fixture solved successfully.
- Green: `npm run swap:economics-binding-check` passed after implementation.
- Green: `npm run private-pool-v2:swap-to-shielded-circuit-check` passed, including invalid output amount, min output, slippage, and output-below-min fixtures plus the `output_amount == min_output_amount` edge.
- Green: `npm run private-pool-v2:swap-to-shielded-proof-request-check`, `npm run private-pool-v2:swap-to-shielded-browser-worker-prover-check`, `npm run private-pool-v2:public-input-hash-alignment-check`, `npm run zk:circuit-soundness-lint`, `npm run private-pool-v2:contract-check`, `npm run private-pool-v2:protocol-client-check`, `npm run private-pool-v2:restart-check`, and `npm run build`.
- Green: `npm run private-pool-v2:verify` passed after the browser-worker witness-input adapter was updated for the new Swap witness ABI.
- Green/fail-closed: `npm run truth:privacy-claim-gate` passed with privacy/mainnet/production claim flags still false.
- Green/fail-closed: `npm run private-pool-v2:live-anonymity-set-probe-check` passed with `currentDistinctCommitments=2`, `minimumDistinctCommitments=1024`, and `depthBelowThreshold=true`.

## Plan Notes From Read-Only Review

- `output_amount` already exists and is bound through `output_commitment`, but it is not bound into `economics_commitment`.
- `min_output_amount` is absent from the Noir ABI, fixture types, Prover TOML writer, proof request args, operator settlement request, and client quote/execution settlement terms.
- `slippage_bps` exists in some route/client/operator code, but not in the Noir-aligned Swap proof terms.
- `economics_commitment` is still opaque in the Swap circuit; implementation should add a `compute_swap_economics_commitment` helper and assertion.
- Current Swap public-input hash already uses `hash_12`/`poseidon12`; implementation should use arity-safe packing rather than casually expanding the top-level public hash.
- Operator-side SHA/hex commitment handles are not the same thing as BN254 Noir public inputs; this Band 1 item should keep those domains explicit and avoid implying live proof of venue output.

## Truth Boundary

This item is local circuit/fixture/proof-request/operator/client binding only. It does not prove Jupiter's actual output on chain, enforce on-chain slippage, prevent MEV/sandwich exposure, rotate liquidity signers, prove live anonymity, lift privacy claims, or make Swap production-private, audited, trustless, mainnet-ready, or proof-verified on chain.

## Lumi

- Local: PPA-SWAP-001 implementation, fixtures, npm wiring, tracker/audit notes, and verification evidence passed locally.
- Committed: `995b24ba9a5615e435ee638b0b139ea84ef2d446` (`Harden privacy audit remediation gates`).
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` and `origin/main` on 2026-05-25.
- Deployed/live: website/status evidence live via Render deploy `dep-d8a876kt8o5s73etj9d0` for commit `995b24ba`; on-chain spend/verifier programs, TAG5/TAG6, SBF/live lineage, and production privacy remain not deployed/live.

# PPA-SEND-SWAP-002 - Send/Swap valid_until_slot Binding

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 1 - circuit fixes
- Recommended remediation order: 4
- Finding: Send and Swap proofs do not bind a freshness/expiry slot in the circuit public-input hash.
- Primary circuits:
  - `zk/noir/vanta_private_pool_v2_send_entry/src/main.nr`
  - `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr`

## Status

`implemented-verified-local`

Clay approved the posted plan in-thread before implementation. The PR-sized local diff has been implemented and verified.

## Planned Files

- `zk/noir/vanta_private_pool_v2_send_entry/src/main.nr`
- `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr`
- `src/privacy/privatePoolV2SendCircuitFixture.ts`
- `src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts`
- `scripts/write-vanta-private-pool-v2-send-fixture.mjs`
- `scripts/write-vanta-private-pool-v2-swap-to-shielded-fixture.mjs`
- `scripts/check-vanta-private-pool-v2-send-circuit.mjs`
- `scripts/check-vanta-private-pool-v2-swap-to-shielded-circuit.mjs`
- `scripts/check-vanta-private-pool-v2-public-input-hash-alignment.mjs`
- `scripts/check-vanta-circuit-soundness-lint.mjs`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-send-swap-002-valid-until-slot.md`

## Planned Fixtures

- Send invalid `valid_until_slot` public-binding fixture.
- Swap invalid `valid_until_slot` public-binding fixture.

Zero-slot rejection was not added because this item can bind a freshness value into the proof but cannot compare it against runtime `Clock::get()` inside the circuit. Runtime expiry enforcement remains a later on-chain program item.

## Planned Script

- `npm run send-swap:valid-until-slot-bound-check`

The audit appendix does not name a dedicated command for this Band 1 item, so this stable script name is proposed for the new fail-closed regression guard.

## Test Cases

- Valid Send with `valid_until_slot` bound into the single public-input hash.
- Invalid Send where the public-input hash is computed over a tampered `valid_until_slot` while the witness carries the original slot.
- Valid Swap-to-shielded with `valid_until_slot` bound into the single public-input hash.
- Invalid Swap-to-shielded where the public-input hash is computed over a tampered `valid_until_slot` while the witness carries the original slot.

## Implemented Changes

- Send fixture ABI, proof-request plumbing, operator/client runtime paths, and Noir circuit now carry `valid_until_slot`.
- Send public-input hash folds `valid_until_slot` into `economics_terms` alongside `economics_commitment` and `relayer_fee`.
- Swap-to-shielded fixture ABI, proof-request plumbing, operator/client runtime paths, and Noir circuit now carry `valid_until_slot`.
- Swap-to-shielded public-input hash now includes `valid_until_slot` after packing the output leaf index/root transition into an output transition hash.
- Send/Swap fixture writers and circuit checks include invalid `valid_until_slot` public-binding modes.
- Browser-worker/witness prover fixtures were updated so the expanded Send, Claim, and Swap witnesses still satisfy the stricter local proving boundary.
- New npm script `send-swap:valid-until-slot-bound-check` is exposed and wired into `private-pool-v2:verify`.

## Evidence

### Red-first

- `npm run send-swap:valid-until-slot-bound-check` failed before the Noir hash binding with: `invalid-valid-until-slot-public-binding fixture unexpectedly succeeded`.

### Green

- `npm run send-swap:valid-until-slot-bound-check`: PASS
- `npm run private-pool-v2:send-circuit-check`: PASS
- `npm run private-pool-v2:swap-to-shielded-circuit-check`: PASS
- `npm run zk:circuit-soundness-lint`: PASS
- `npm run build`: PASS
- `npm run private-pool-v2:send-prove`: PASS
- `npm run private-pool-v2:swap-to-shielded-prove`: PASS
- `npm run private-pool-v2:send-witness-prover-check`: PASS
- `npm run private-pool-v2:browser-worker-prover-check`: PASS
- `npm run private-pool-v2:claim-browser-worker-prover-check`: PASS
- `npm run private-pool-v2:swap-to-shielded-browser-worker-prover-check`: PASS
- `npm run private-pool-v2:protocol-client-check`: PASS
- `npm run private-pool-v2:restart-check`: PASS
- `npm run private-pool-v2:verify`: PASS
- `npm run truth:privacy-claim-gate`: PASS; `privacyClaimsAllowed=false`, `mainnetReady=false`, `productionReady=false`, `privateSettlementPrivacyClaimAllowed=false`, and `shieldPrivacyClaimAllowed=false` remain fail-closed.
- `npm run private-pool-v2:live-anonymity-set-probe-check`: PASS; `currentDistinctCommitments=2`, `minimumDistinctCommitments=1024`, and `depthBelowThreshold=true` remain fail-closed.

Some Noir-backed npm commands required execution outside the Codex sandbox because child `nargo` processes could not lock the Noir git dependency cache inside the sandbox; reruns passed.

## Truth Boundary

This item binds freshness data into local Send/Swap circuits, proof requests, and fixtures. It does not enforce runtime slot expiry on chain, does not prove live anonymity, does not lift privacy claims, and does not make Vanta production-private, audited, trustless, mainnet-ready, or proof-verified on chain.

## Blockers Discovered

- No new product/privacy blocker for this item. Existing wider audit blockers still apply.

## Lumi

- Local: implementation, fixture, npm wiring, and verification evidence passed locally.
- Committed: `995b24ba9a5615e435ee638b0b139ea84ef2d446` (`Harden privacy audit remediation gates`).
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` and `origin/main` on 2026-05-25.
- Deployed/live: website/status evidence live via Render deploy `dep-d8a876kt8o5s73etj9d0` for commit `995b24ba`; on-chain spend/verifier programs, TAG5/TAG6, SBF/live lineage, and production privacy remain not deployed/live.

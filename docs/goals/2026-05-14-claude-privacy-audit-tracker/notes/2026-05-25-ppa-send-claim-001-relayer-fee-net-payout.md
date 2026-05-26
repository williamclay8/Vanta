# PPA-SEND-CLAIM-001 - Relayer Fee and Net Payout Binding

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 1 - circuit fixes
- Recommended remediation order: 3
- Finding: Send does not include `relayer_fee`, and Claim binds `relayer_fee` into the public-input hash but does not assert `relayer_fee <= amount` or bind a net payout.
- Primary circuits:
  - `zk/noir/vanta_private_pool_v2_send_entry/src/main.nr`
  - `zk/noir/vanta_private_pool_v2_claim_entry/src/main.nr`

## Status

`implemented-verified-local`

Clay approved the posted plan in-thread. Implementation proceeded red-first: the new `claim:relayer-fee-bound-check` failed before the circuit fix because the Send invalid relayer-fee conservation fixture unexpectedly succeeded; after the fix, the same guard and the appendix suite passed locally.

## Planned Files

- `zk/noir/vanta_private_pool_v2_send_entry/src/main.nr`
- `zk/noir/vanta_private_pool_v2_claim_entry/src/main.nr`
- `src/privacy/privatePoolV2SendCircuitFixture.ts`
- `src/privacy/privatePoolV2ClaimCircuitFixture.ts`
- `scripts/write-vanta-private-pool-v2-send-fixture.mjs`
- `scripts/write-vanta-private-pool-v2-claim-fixture.mjs`
- `scripts/check-vanta-private-pool-v2-send-circuit.mjs`
- `scripts/check-vanta-private-pool-v2-claim-circuit.mjs`
- `scripts/check-vanta-circuit-soundness-lint.mjs`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-send-claim-001-relayer-fee-net-payout.md`

## Planned Fixtures

- Send invalid relayer-fee/net-payout conservation fixture.
- Send invalid relayer fee greater than input amount fixture.
- Claim invalid relayer fee greater than amount fixture.
- Claim invalid net_payout fixture.

The fixtures should fail against the current fee-unconstrained construction and pass only after the circuits constrain fee and net payout.

## Planned Script

- `npm run claim:relayer-fee-bound-check`

This script should fail closed if either Send or Claim loses the fee/net-payout constraints.

## Implemented Changes

- Send fixture ABI carries `relayer_fee`; the valid fixture uses a nonzero fee and preserves `input_amount == recipient_amount + change_amount + relayer_fee`.
- Send circuit asserts `relayer_fee <= input_amount`, conserves input/recipient/change/fee, includes `relayer_fee` in the economics commitment, and folds `relayer_fee` into the single public-input hash through `economics_terms`.
- Claim fixture ABI carries `net_payout`.
- Claim circuit asserts `relayer_fee <= amount` and `amount == net_payout + relayer_fee`.
- Claim public-input hash binds `net_payout` in `claim_terms`.
- `claim:relayer-fee-bound-check` is added to `package.json` and wired into `private-pool-v2:verify`.
- `scripts/check-vanta-circuit-soundness-lint.mjs` now fails if Send/Claim fee or net-payout constraints/hash bindings are removed.

## Evidence

Red-first:

- `npm run claim:relayer-fee-bound-check` failed before the fix with `invalid-relayer-fee-conservation fixture unexpectedly succeeded`.

Green:

- `npm run claim:relayer-fee-bound-check`: PASS
- `npm run private-pool-v2:send-circuit-check`: PASS
- `npm run private-pool-v2:claim-circuit-check`: PASS
- `npm run zk:circuit-soundness-lint`: PASS
- `npm run build`: PASS
- `npm run private-pool-v2:send-prove`: PASS
- `npm run private-pool-v2:claim-prove`: PASS
- `npm run private-pool-v2:public-input-hash-alignment-check`: PASS
- `npm run private-pool-v2:send-witness-prover-check`: PASS
- Full `PRODUCTION_PRIVACY_AUDIT.md` appendix pre-deploy suite plus Band 1 added scripts: PASS, including `npm run truth:privacy-claim-gate` and `npm run private-pool-v2:live-anonymity-set-probe-check`.

Note: some Noir-backed npm commands required execution outside the Codex sandbox because child `nargo` processes could not lock the Noir git dependency cache inside the sandbox; reruns passed.

## Test Cases

- Valid Send with `input_amount == recipient_amount + change_amount + relayer_fee`.
- Invalid Send where the public-hash-bound fee is omitted from conservation and the current circuit would accept.
- Invalid Send where `relayer_fee > input_amount`.
- Valid Claim with `amount == net_payout + relayer_fee`.
- Invalid Claim where `relayer_fee > amount`.
- Invalid Claim where `net_payout` does not match `amount - relayer_fee`.

## Approval Gate

Clay approved the posted implementation plan in-thread before code edits.

## Truth Boundary

This item is a local circuit/fixture correctness fix. It does not make Vanta production-private, audited, trustless, mainnet-ready, or proof-verified on chain. Existing fail-closed gates must remain fail-closed, including `npm run truth:privacy-claim-gate` and `npm run private-pool-v2:live-anonymity-set-probe-check`.

## Lumi

- Local: implementation, fixture, npm wiring, and verification evidence passed locally.
- Committed: `995b24ba9a5615e435ee638b0b139ea84ef2d446` (`Harden privacy audit remediation gates`).
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` and `origin/main` on 2026-05-25.
- Deployed/live: website/status evidence live via Render deploy `dep-d8a876kt8o5s73etj9d0` for commit `995b24ba`; on-chain spend/verifier programs, TAG5/TAG6, SBF/live lineage, and production privacy remain not deployed/live.

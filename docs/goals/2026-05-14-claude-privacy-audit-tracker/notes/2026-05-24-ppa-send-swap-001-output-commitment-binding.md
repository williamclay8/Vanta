# PPA-SEND-SWAP-001 - Send/Swap Output Commitment Binding

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 1 - circuit fixes
- Recommended remediation order: 2
- Finding: Send and Swap circuits append opaque output commitments without proving the commitments match note preimages.
- Primary circuits:
  - `zk/noir/vanta_private_pool_v2_send_entry/src/main.nr`
  - `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr`

## Status

`implemented-verified-local`

Clay approved the posted plan in-thread before code edits. The change has been implemented and locally verified.

## Planned Files

- `zk/noir/vanta_private_pool_v2_send_entry/src/main.nr`
- `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr`
- `src/privacy/privatePoolV2SendCircuitFixture.ts`
- `src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts`
- `scripts/write-vanta-private-pool-v2-send-fixture.mjs`
- `scripts/write-vanta-private-pool-v2-swap-to-shielded-fixture.mjs`
- `scripts/check-vanta-private-pool-v2-send-circuit.mjs`
- `scripts/check-vanta-private-pool-v2-swap-to-shielded-circuit.mjs`
- `scripts/check-vanta-circuit-soundness-lint.mjs`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-24-ppa-send-swap-001-output-commitment-binding.md`

## Planned Fixtures

- Send invalid recipient output-commitment preimage fixture.
- Send invalid change output-commitment preimage fixture.
- Swap invalid output-commitment preimage fixture.

Each fixture should fail against the current opaque-commitment construction and pass only after the circuits recompute the output commitment from its preimage.

## Planned Scripts

- `npm run send:output-commitment-binding-check`
- `npm run swap:output-commitment-binding-check`

These scripts should fail closed if Send or Swap output commitments become opaque private inputs again.

## Implementation

- Send now recomputes recipient and change output commitments from private output note preimages before append-root and public-input-hash binding.
- Swap-to-shielded now recomputes the output commitment from owner/output-asset/amount/blinding/derivation-tag witness fields before append-root and public-input-hash binding.
- Fixture builders and TOML writers include invalid output preimage modes:
  - `invalid-recipient-output-commitment-preimage`
  - `invalid-change-output-commitment-preimage`
  - `invalid-output-commitment-preimage`
- `scripts/check-vanta-circuit-soundness-lint.mjs` now fails if the Send/Swap output preimage helper/assertions are removed.
- `package.json` exposes `send:output-commitment-binding-check` and `swap:output-commitment-binding-check`, and wires both into `private-pool-v2:verify`.

## Evidence

Red-first:

- `npm run send:output-commitment-binding-check` failed before the Noir output assertions with `invalid-recipient-output-commitment-preimage fixture unexpectedly succeeded`.
- `npm run swap:output-commitment-binding-check` failed before the Noir output assertion with `invalid-output-commitment-preimage fixture unexpectedly succeeded`.

Green:

- `npm run send:output-commitment-binding-check`: PASS
- `npm run swap:output-commitment-binding-check`: PASS
- `npm run private-pool-v2:send-circuit-check`: PASS
- `npm run private-pool-v2:swap-to-shielded-circuit-check`: PASS
- `npm run zk:circuit-soundness-lint`: PASS
- `npm run build`: PASS
- `npm run private-pool-v2:send-prove`: PASS
- `npm run private-pool-v2:swap-to-shielded-prove`: PASS
- Implemented `PRODUCTION_PRIVACY_AUDIT.md` appendix pre-deploy suite for this PR-sized diff: PASS, including `truth:privacy-claim-gate` and `private-pool-v2:live-anonymity-set-probe-check`.

Notes:

- Some Noir-backed commands required execution outside the Codex sandbox because child `nargo` processes could not lock the Noir git dependency cache inside the sandbox; reruns passed.
- At the time of PPA-SEND-SWAP-001 verification, future-item appendix scripts such as `claim:relayer-fee-bound-check` were not implemented or run because Band 1 item 3 had not started.

## Approval Gate

Clay approved the posted implementation plan in-thread before code edits.

## Truth Boundary

This item is a local circuit/fixture correctness fix. It does not make Vanta production-private, audited, trustless, mainnet-ready, or proof-verified on chain. Existing fail-closed gates must remain fail-closed, including `npm run truth:privacy-claim-gate` and `npm run private-pool-v2:live-anonymity-set-probe-check`.

## Lumi

- Local: implementation, fixture, npm wiring, and verification evidence passed locally.
- Committed: `995b24ba9a5615e435ee638b0b139ea84ef2d446` (`Harden privacy audit remediation gates`).
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` and `origin/main` on 2026-05-25.
- Deployed/live: website/status evidence live via Render deploy `dep-d8a876kt8o5s73etj9d0` for commit `995b24ba`; on-chain spend/verifier programs, TAG5/TAG6, SBF/live lineage, and production privacy remain not deployed/live.

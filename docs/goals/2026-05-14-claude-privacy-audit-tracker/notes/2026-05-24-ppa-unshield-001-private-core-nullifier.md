# PPA-UNSHIELD-001 - Private Core Unshield Nullifier

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 1 - circuit fixes
- Recommended remediation order: 1
- Finding: Private Core single-note Unshield derives the nullifier from `state_root` and `merkle_leaf`, so the same note can produce different nullifiers under different accepted historic roots.
- Primary circuit: `zk/noir/vanta_private_core_single_note_unshield/src/main.nr`

## Status

`implemented-verified-local`

Clay approved the posted plan before implementation. The PR-sized diff was implemented and verified locally, then included in commit `995b24ba9a5615e435ee638b0b139ea84ef2d446` and pushed to `origin/codex/ppa-program-004-runtime-verifier-wired` and `origin/main` on 2026-05-25. Website/status surfaces later went live through Render deploy `dep-d8a876kt8o5s73etj9d0` for that commit; on-chain spend/verifier programs, TAG5/TAG6, SBF/live lineage, and production privacy remain not deployed/live for this item.

## Planned Files

- `zk/noir/vanta_private_core_single_note_unshield/src/main.nr`
- `src/zk/vantaPrivateCore.ts`
- `src/zk/vantaPrivateCoreUnshieldProof.ts`
- `scripts/write-vanta-private-core-unshield-fixture.mjs`
- `scripts/check-vanta-private-core-unshield-circuit.mjs`
- `scripts/check-vanta-private-core-nullifier-binding.mjs`
- `scripts/check-vanta-circuit-soundness-lint.mjs`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-24-ppa-unshield-001-private-core-nullifier.md`

## Planned Fixture

Add a fixture/check that constructs one note with two different valid membership paths / historic roots and asserts the derived nullifier is stable across both. This fixture should fail against the current root-bound construction and pass after the nullifier preimage drops `state_root` and `merkle_leaf`.

## Planned Script

- `npm run private-core-unshield:nullifier-binding-fixture-check`

The script should fail closed if `state_root` or `merkle_leaf` is reintroduced into the Private Core Unshield nullifier preimage.

## Implementation

- `zk/noir/vanta_private_core_single_note_unshield/src/main.nr` now derives the Unshield nullifier with `bn254::hash_6` over proof-owner key, note secret, and note nonce limbs only.
- `src/zk/vantaPrivateCore.ts`, `src/zk/vantaPrivateCoreUnshieldProof.ts`, and `scripts/write-vanta-private-core-unshield-fixture.mjs` now mirror the root-independent `poseidon6` shape.
- `scripts/check-vanta-private-core-nullifier-binding.mjs` now builds the same note under two distinct accepted roots, asserts source and Noir nullifier stability, executes both Noir witness packages, and rejects a tampered nullifier.
- `scripts/check-vanta-circuit-soundness-lint.mjs` now fails if `state_root` or `merkle_leaf` re-enters the Private Core Unshield nullifier preimage.
- `package.json` adds `npm run private-core-unshield:nullifier-binding-fixture-check`, preserves `private-core:nullifier-binding-check` as an alias, and routes `private-core:check` through the new script.

## Evidence

- Red-first: `npm run private-core-unshield:nullifier-binding-fixture-check` failed before the fix because the same note produced different nullifiers under two accepted roots.
- Green: `npm run private-core-unshield:nullifier-binding-fixture-check`
- Green: `npm run private-core:check`
- Green: `npm run private-core:nullifier-binding-check`
- Green: `npm run zk:circuit-soundness-lint`
- Green: `npm run private-core:prove`
- Green: `npm run private-core:consume-check`
- Green: `npm run truth:privacy-claim-gate`; `privacyClaimsAllowed=false` remains fail-closed.
- Green: `npm run private-pool-v2:live-anonymity-set-probe-check`; `currentDistinctCommitments=2` and `depthBelowThreshold=true` remain fail-closed.
- Green: PRODUCTION_PRIVACY_AUDIT appendix base suite commands run for this PR-sized diff, plus the new item-specific `npm run private-core-unshield:nullifier-binding-fixture-check`.

Some Noir-backed npm commands needed reruns outside the Codex sandbox because child `nargo` processes could not lock the Noir git dependency cache inside the sandbox. The outside-sandbox reruns passed.

## Approval Gate

Approved by Clay before implementation.

## Truth Boundary

This item is a local circuit/nullifier correctness fix. It does not make Vanta production-private, audited, trustless, mainnet-ready, or proof-verified on chain. Existing fail-closed gates must remain fail-closed, including `npm run truth:privacy-claim-gate` and `npm run private-pool-v2:live-anonymity-set-probe-check`.

## Lumi

- Local: implementation, fixture, npm wiring, and verification evidence passed locally.
- Committed: `995b24ba9a5615e435ee638b0b139ea84ef2d446` (`Harden privacy audit remediation gates`).
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` and `origin/main` on 2026-05-25.
- Deployed/live: website/status evidence live via Render deploy `dep-d8a876kt8o5s73etj9d0` for commit `995b24ba`; on-chain spend/verifier programs, TAG5/TAG6, SBF/live lineage, and production privacy remain not deployed/live.

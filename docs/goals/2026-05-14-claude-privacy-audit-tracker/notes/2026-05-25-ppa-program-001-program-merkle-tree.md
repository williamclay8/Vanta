# PPA-PROGRAM-001 - Program-Owned Poseidon Merkle Tree

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 2 - on-chain program
- Recommended remediation order: 6
- Finding: the spend program had operator-fed root provenance scaffolding, but not a program-owned depth-20 Poseidon Merkle tree with in-program append and root history.
- Primary program: `programs/vanta_private_pool_v2_spend/src/lib.rs`

## Status

`implemented-verified-local`

Clay approved implementation in-thread on 2026-05-25 with `Approved` after the PPA-PROGRAM-001 plan was posted.

## Implemented

- Added a program-owned `tree_state` account initialized during tag `0`, bound from `pool_state` at `POOL_TREE_STATE_OFFSET`, with a depth-20 frontier, next leaf index, and current root.
- Added `TAG_APPEND_TREE_LEAF = 9` with payload `[9, outputCommitment:32, expectedPreviousRoot:32, expectedNewRoot:32, transitionPublicInputHash:32, transitionKind:1]`.
- Computes leaf and internal node hashes in-program with `solana-poseidon` BN254 X5 / big-endian hashing.
- Rejects stale previous roots, expected-new-root drift, wrong tree-state accounts, duplicate leaves, duplicate roots, and full tree capacity without mutating state.
- Writes the recomputed root into bound root history, writes root-record provenance for the new root, and creates a duplicate-leaf marker at `["vanta2leaf", pool_state, outputCommitment]`.
- Added `npm run private-pool-v2:program-merkle-tree-check` and wired it into `private-pool-v2:verify`, `zk:review-guards-check`, `zk:feedback-loop-check`, contract checks, root provenance checks, SBF ABI status, README, and package scripts.
- Extended the Crucible harness with tree-state setup, append-tree actions, wrong-root/wrong-tree/duplicate-leaf paths, and tree/leaf marker assertions.
- Rebuilt the local SBF artifact after the source change so `private-pool-v2:sbf-abi-check` reports `abiFresh=true`.

## Verification

Red-first:

- `npm run private-pool-v2:program-merkle-tree-check` initially failed because tag `9` and the program-owned tree markers did not exist.
- Full `cargo test` exposed one stale vault-asset assertion expecting generic error `19`; the existing source taxonomy now returns dedicated error `24`, so the test assertion was updated.

Green:

- `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`: PASS with existing deprecation/dead-code warnings.
- `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`: PASS, 39 tests.
- `cargo check --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml --features invariant_test`: PASS with existing harness warnings.
- `/Users/clay/.local/share/solana/install/active_release/bin/cargo-build-sbf --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`: PASS; local SBF refreshed.
- `npm run private-pool-v2:sbf-abi-check`: PASS; `abiFresh=true`.
- `npm run private-pool-v2:program-merkle-tree-check`: PASS.
- `npm run private-pool-v2:root-provenance-check`: PASS.
- `npm run private-pool-v2:contract-check`: PASS.
- `npm run private-pool-v2:crucible-check`: PASS; dry-run harness validation passed.
- `npm run build`: PASS.
- `npm run truth:privacy-claim-gate`: PASS; `privacyClaimsAllowed=false`, `mainnetReady=false`, `productionReady=false`, `privateSettlementPrivacyClaimAllowed=false`, and `shieldPrivacyClaimAllowed=false` remain fail-closed.
- `npm run private-pool-v2:live-anonymity-set-probe-check`: PASS; `currentDistinctCommitments=2`, `minimumDistinctCommitments=1024`, and `depthBelowThreshold=true` remain fail-closed.

## Runtime Caution

The SBF build succeeded, but `cargo-build-sbf` post-processing warned that `sol_poseidon` is an unknown runtime symbol alongside other syscall symbols. Do not treat this as production deploy evidence. A real runtime/deploy smoke or toolchain confirmation is still required before relying on the Poseidon syscall in production.

## Truth Boundary

This implements local program-owned tree append/root-history correctness for a one-leaf append lane. It does not wire Shield deposits into the tree, Send two-output appends, verifier CPI acceptance, program-owned vault custody, tag `6` release, live anonymity, external audit, production deployment, or any privacy/mainnet-ready claim.

## Lumi

- Local: PPA-PROGRAM-001 implementation, local SBF rebuild, guard wiring, docs, tracker evidence, and local verification are local only.
- Committed: not committed.
- Pushed: not pushed.
- Deployed/live: not deployed or live verified.

# PPA-PROGRAM-004 - Runtime verifier_wired Gate

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 2 - on-chain program
- Recommended remediation order: 10
- Finding: `cfg!(test)` / `cfg!(not(test))` controls TAG_UNSHIELD helper behavior. The production SBF path is currently fail-closed when built normally, but the audit requires this to become runtime state so a wrong build flag cannot expose a helper release path.
- Primary program: `programs/vanta_private_pool_v2_spend/src/lib.rs`

## Status

`implemented-verified-local`

Clay approved the plan on 2026-05-25. The local implementation is complete and verified, but it is not deployed/live/audited.

## Current Truth

- `pool_state` is now 224 bytes. Byte offset `216` stores `verifier_wired`, initialized to `0` by `TAG_INIT`.
- TAG_SHIELD and TAG_UNSHIELD no longer use `cfg!` release gates.
- `require_vault_asset_record` no longer has a native SOL sentinel test bypass; local tests use full registered vault-asset records.
- TAG_UNSHIELD still returns `ERR_UNSHIELD_NOT_WIRED` before nullifier consume or SOL/SPL CPI. `verifier_wired == 1` is not sufficient for release in this slice.
- This item reduces build-flag risk only; it does not enable proof-verified release or lift claims.

## Changed Files

- `programs/vanta_private_pool_v2_spend/src/lib.rs`
- `programs/vanta_private_pool_v2_spend/README.md`
- `fuzz/vanta_private_pool_v2_spend/src/main.rs`
- `scripts/check-vanta-private-pool-v2-runtime-verifier-wired-gate.mjs`
- `scripts/check-vanta-private-pool-v2-pda-vault-custody.mjs`
- `scripts/check-vanta-private-pool-v2-onchain-unshield-custody.mjs`
- `scripts/check-vanta-private-pool-v2-contract.mjs`
- `scripts/check-vanta-private-pool-v2-sbf-abi-status.mjs`
- `scripts/check-vanta-private-pool-v2-program-merkle-tree.mjs`
- `package.json`
- `SECURITY_LIMITATIONS.md`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`

## Implementation

1. Added a `verifier_wired` byte to `pool_state`, initialized to `0` in `TAG_INIT`.
2. Replaced TAG_SHIELD and TAG_UNSHIELD compile-time release gates with runtime `require_pool_verifier_wired` checks.
3. Removed the native SOL sentinel test bypass from `require_vault_asset_record`; tests now provide full registered vault-asset records.
4. Did not add a public setter. No live instruction can set `verifier_wired = 1` in this slice.
5. Kept `releaseEnabled = 0` fail-closed semantics from PPA-PROGRAM-002.
6. Added source/package guards so release-path `cfg!` gates cannot return.

## Fixtures

- Source guard fails if `cfg!(test)` or `cfg!(not(test))` returns to program release gates.
- Program unit: `TAG_INIT` initializes `verifier_wired` to `0`.
- Program unit: `TAG_UNSHIELD` with `verifier_wired = 0` rejects before nullifier consume or SOL/SPL CPI.
- Program unit: `TAG_UNSHIELD` with a manually set `verifier_wired = 1` still rejects until item 9 verifier acceptance exists.
- Program unit: native SOL preflight in tests uses a full registered vault-asset record and no sentinel bypass.
- Program/Crucible: failed TAG_UNSHIELD paths leave nullifier marker and vault/destination lamports unchanged.

## Script

- `npm run private-pool-v2:runtime-verifier-wired-gate-check`

This script fails closed if release-path `cfg!` gates return or if `verifier_wired` is not initialized and enforced.

## Verification

- `npm run private-pool-v2:runtime-verifier-wired-gate-check`
- `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`
- `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml -- --nocapture`
- `cargo check --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml --features invariant_test`
- `/Users/clay/.local/share/solana/install/active_release/bin/cargo-build-sbf --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`
- `npm run private-pool-v2:sbf-abi-check`
- `npm run private-pool-v2:pda-vault-custody-check`
- `npm run private-pool-v2:onchain-unshield-custody-check`
- `npm run private-pool-v2:crucible-check`
- `npm run private-pool-v2:contract-check`
- `npm run private-pool-v2:program-merkle-tree-check`
- `npm run private-pool-v2:native-sol-tag6-wiring-check`
- `npm run zk:c01-positive-proof-verified-claim-gate-check`
- `npm run truth:privacy-claim-gate`
- `npm run security:limitations-check`
- `npm run privacy-audit:tracker-check`
- `git diff --check`

## Truth Boundary

This local runtime-gate hardening slice does not implement proof verification, SOL release, SPL release, production custody, production privacy, mainnet readiness, anonymity evidence, or audit acceptance. It does include a fresh local SBF rebuild/ABI check only.

## Approval Gate

Approved by Clay on 2026-05-25 and implemented locally.

## Lumi

- Local: implemented and verified locally.
- Committed: not committed.
- Pushed: not pushed.
- Deployed/live: not deployed or live verified.

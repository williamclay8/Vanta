# PPA-UNSHIELD-002 - TAG_UNSHIELD SPL Release and SOL Proof Verification

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 2 - on-chain program
- Recommended remediation order: 9
- Finding: `TAG_UNSHIELD` still fails closed before proof verification and release; SPL release is only a reserved `transfer_checked` shape, and SOL release still needs proof/root/public-input/nullifier verification before PDA-signed CPI can be callable.
- Primary program: `programs/vanta_private_pool_v2_spend/src/lib.rs`

## Status

`blocked-on-verifier-root-nullifier-evidence`

This is a tracker-only blocker entry. No protocol code was changed for this item. Implementation must not begin until the verifier program, proof/public-witness format, production verifying-key hash, verifier adapter acceptance evidence, root/public-input binding, nullifier consume path, SBF/live lineage, and reviewer acceptance exist.

## Current Truth

- Local source carries canonical SOL PDA custody and a reserved SPL `transfer_checked` PDA-signed release shape.
- Production `TAG_UNSHIELD` still returns `ERR_UNSHIELD_NOT_WIRED` before proof verification, nullifier consume, token/system CPI, custody transfer, account mutation, or fund release.
- The operator endpoint emits a fail-closed `TAG_UNSHIELD` relay receipt shape with `programTxSignature: null`; this is not proof-verified release evidence.
- Native SOL TAG6 live evidence remains pending under design doc §12 and the Native SOL TAG6 Post-Deployment Monitoring Checklist.

## Planned Files After Unblock

- `programs/vanta_private_pool_v2_spend/src/lib.rs`
- `programs/vanta_private_pool_v2_spend/README.md`
- `fuzz/vanta_private_pool_v2_spend/src/main.rs`
- `scripts/check-vanta-private-pool-v2-pda-vault-custody.mjs`
- `scripts/check-vanta-private-pool-v2-onchain-unshield-custody.mjs`
- `scripts/check-vanta-private-pool-v2-native-sol-tag6-wiring-check.mjs`
- `scripts/native-sol-tag6/run-tag6-full-predeploy-checklist.mjs`
- `scripts/probe-production-native-sol-sentinel-snapshot.mjs`
- `scripts/scan-onchain-tag6-sol-releases.mjs`
- `scripts/verify-full-tag6-release-evidence.mjs`
- `operator/unshield-server.mjs`
- `src/readiness/unshieldMainnetProductionStatus.mjs`
- `src/solana/unshieldTrustContract.ts`
- `SECURITY_LIMITATIONS.md`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`

## Blocker Before Implementation

Implementation is blocked until all of these exist:

- A selected production verifier program and accepted verifier ABI.
- A pinned production proof format and public-witness layout for the active Claim/Unshield circuit.
- A production verifying-key hash registered through the verifier-key registry path.
- Positive verifier evidence for valid proof acceptance and release mutation.
- Negative verifier evidence for invalid proof, wrong public input, wrong verifying key, wrong verifier program, duplicate nullifier, wrong vault, wrong token program, and wrong mint no-release/no-mutation behavior.
- Root/public-input binding and nullifier consume ordering accepted by review.
- Native SOL TAG6 live-evidence package satisfying design doc §12 and the status-note Post-Deployment Monitoring Checklist before any claim elevation.

## Plan After Blocker Clears

1. Keep all account, root-record, verifier-key, vault-asset, token-account, destination, and nullifier preflights before proof acceptance.
2. Verify the Claim/Unshield proof and public witness against the selected verifier program and registered verifying-key hash.
3. Bind `exit_destination`, `exit_asset_id`, `exit_amount`, and `nullifier` through the proof public-input contract before release.
4. Order nullifier consume and release so failed SOL/SPL CPI cannot burn a note without a documented recovery or revert path.
5. For SOL, release with `system_instruction::transfer` signed by `[vanta2solvault, pool_state, NATIVE_SOL_ASSET_ID_SENTINEL, bump]`.
6. For SPL, release with `spl_token::instruction::transfer_checked` signed by `[vanta2vault, pool_state, exit_asset_id, vault_bump]`.
7. Keep all production custody/privacy/proof-verified claim gates fail-closed until SBF/live lineage, TAG6 §12 live evidence, anonymity evidence, and external review are complete.

## Planned Fixtures

- Valid SOL proof-verified release consumes the nullifier exactly once and emits the expected event after PDA-signed system transfer.
- Valid SPL proof-verified release consumes the nullifier exactly once and emits the expected event after PDA-signed `transfer_checked`.
- Invalid proof, wrong public input, wrong verifier key, wrong verifier program, duplicate nullifier, wrong SOL vault PDA, wrong SPL vault authority, wrong token program, wrong mint, wrong destination token account, and stale/missing root all reject with no mutation and no release.
- Release failure ordering test proves failed SOL/SPL CPI cannot leave a consumed nullifier without a documented recovery/revert path.
- Native SOL TAG6 post-deploy evidence verifier cross-checks real tx signature plus receipt for PDA derivation, public-input hash, nullifier consume, system CPI, event, and indexer state per design doc §12.

## Planned Scripts

- `npm run private-pool-v2:groth16-verifier-cpi-check`
- `npm run private-pool-v2:pda-vault-custody-check`
- `npm run private-pool-v2:native-sol-tag6-wiring-check`
- `npm run private-pool-v2:tag6-full-predeploy-checklist -- --dry-run --json`
- `npm run private-pool-v2:native-sol-tag6-full-verify -- --production --tx <signature> --receipt <receipt.json> --json`
- `npm run private-pool-v2:crucible-check`

## Verification After Approval And Unblock

- `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`
- `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml -- --nocapture`
- `cargo check --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml --features invariant_test`
- `/Users/clay/.local/share/solana/install/active_release/bin/cargo-build-sbf --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`
- `npm run private-pool-v2:groth16-verifier-cpi-check`
- `npm run private-pool-v2:pda-vault-custody-check`
- `npm run private-pool-v2:native-sol-tag6-wiring-check`
- `npm run private-pool-v2:tag6-full-predeploy-checklist -- --dry-run --json`
- `npm run private-pool-v2:crucible-check`
- `npm run private-pool-v2:verify`
- `npm run truth:privacy-claim-gate`
- `npm run private-pool-v2:live-anonymity-set-probe-check`
- `npm run privacy-audit:tracker-check`
- `git diff --check`

## Truth Boundary

This plan does not implement proof-verified `TAG_UNSHIELD` release. It is not SOL release evidence, not SPL release evidence, not production custody, not SBF/live lineage, not audit acceptance, not anonymity evidence, and not production-private readiness.

## Lumi

- Local: tracker-only blocker entry is local only.
- Committed: not committed.
- Pushed: not pushed.
- Deployed/live: not deployed or live verified.

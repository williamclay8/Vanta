# PPA-PROGRAM-002 - PDA Vault Custody Registry, Shield Ingress, and Fail-Closed Release

Status: locally implemented, fail-closed. Program/operator implementation is local only and not deployed/live/audited.

## Clay Direction

Clay's 2026-05-25 build direction sets the canonical custody authorities:

- SOL lamports vault PDA: `[b"vanta2solvault", pool_state.key.as_ref(), &NATIVE_SOL_ASSET_ID_SENTINEL]`.
- SPL vault authority PDA: `[b"vanta2vault", pool_state.key.as_ref(), asset_id]`.
- For SPL, the PDA is the token-account authority. The SPL token account itself remains owned by the Token Program.
- `TAG_REGISTER_VAULT_ASSET` must initialize or verify `[b"vanta2asset", pool_state, asset_id]`, storing `kind = 1` for SPL or `kind = 2` for SOL, mint, vault authority PDA, vault token account/holding account, token program, and `releaseEnabled`.
- Production should eventually require `releaseEnabled == 1`, but the current production path must stay fail-closed until the on-chain verifier, root, public-input binding, and nullifier consume path is real.
- Shield deposits must move native SOL into the SOL vault PDA and SPL into a vault token account whose authority is the `vanta2vault` PDA.
- Once this path is deployed, `VITE_VANTA_MAINNET_VAULT_OWNER` must no longer be treated as the live custody owner.
- Release belongs in `process_unshield`, after root/proof/public-input verification, proof binding of `exit_destination`, `exit_asset_id`, `exit_amount`, and `nullifier`, and nullifier consumption, then a PDA-signed CPI.
- The operator endpoint must stop loading a vault keypair or directly issuing System Program / SPL token transfers for release. It should build or relay `TAG_UNSHIELD` and record the program transaction signature and receipt.

Critical gate: do not remove the current fail-closed production guard until the on-chain verifier/root/nullifier path is real. Otherwise this would replace operator custody with an unaudited program-drain path, which is not privacy.

## Current Repo Truth After Local Implementation

- `TAG_REGISTER_VAULT_ASSET` verifies the canonical SOL and SPL PDA authorities and still writes/verifies disabled registry records with `releaseEnabled = 0`.
- `TAG_SHIELD` / `process_shield` exists with SOL lamports ingress to `vanta2solvault` and SPL ingress to the registered vault token account, but production acceptance is fail-closed before custody movement until the Shield verifier/tree append path is real.
- `process_unshield` keeps the production release guard before fund movement. The source now carries the SOL system CPI and SPL `transfer_checked` PDA-signed CPI release shapes for the future proof-enabled transition.
- `operator/unshield-server.mjs` no longer loads the configured vault signer or calls direct `SystemProgram.transfer` / SPL `sendTransfer` for release. It returns a fail-closed `TAG_UNSHIELD` relay receipt shape with `programTxSignature: null` until a real program transaction exists.
- `VITE_VANTA_MAINNET_VAULT_OWNER` is legacy-only in Shield config and is not treated as live PDA custody.

## Proposed Scope After Approval

1. Add a red-first `npm run private-pool-v2:pda-vault-custody-check` that proves the new source contract and operator boundary.
2. Tighten `TAG_REGISTER_VAULT_ASSET` around the exact SOL and SPL PDA authorities, including registry drift/no-mutation tests.
3. Add `TAG_SHIELD` / `process_shield` account validation and custody movement shape for native SOL and SPL, while keeping production proof acceptance fail-closed until the Shield verifier/tree append path is real.
4. Preserve the `process_unshield` production guard, but make the source contract explicit: proof/root/public-input binding first, nullifier consume second, PDA-signed SOL/SPL CPI release only after verifier/root/nullifier are real.
5. Change the operator endpoint source contract so the future path builds or relays `TAG_UNSHIELD` and records program tx signature/receipt instead of treating the vault keypair as the release authority.
6. Update README/status/trust/audit surfaces so they say exactly what is local, fail-closed, not deployed, and not production-private.

## Planned Verification

- `npm run private-pool-v2:pda-vault-custody-check`
- `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`
- `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`
- `cargo check --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml --features invariant_test`
- `/Users/clay/.local/share/solana/install/active_release/bin/cargo-build-sbf --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`
- `npm run private-pool-v2:sbf-abi-check`
- `npm run private-pool-v2:onchain-unshield-custody-check`
- `npm run private-pool-v2:contract-check`
- `npm run private-pool-v2:crucible-check`
- `npm run private-pool-v2:verify`
- `npm run build`
- `npm run truth:privacy-claim-gate`
- `npm run private-pool-v2:live-anonymity-set-probe-check`
- `npm run privacy-audit:tracker-check`
- `npm run docs:source-of-truth-check`
- `git diff --check`

## Truth Boundary

This slice is not allowed to claim production privacy, mainnet readiness, audited custody, live PDA custody, live Shield, or live TAG_UNSHIELD release. The fail-closed production guard stays in place until verifier/root/nullifier correctness is real and reviewed.

## Verification Completed

- Red-first `npm run private-pool-v2:pda-vault-custody-check`: failed before implementation on missing `TAG_SHIELD`, then passed after implementation.
- `npm run private-pool-v2:pda-vault-custody-check`: PASS.
- `npm run private-pool-v2:onchain-unshield-custody-check`: PASS.
- `npm run private-pool-v2:native-sol-tag6-wiring-check`: PASS.
- `npm run unshield:direct-release-auth-check`: PASS.
- `npm run operator:keypair-env-lockdown-check`: PASS.
- `npm run unshield:sol-operator-endpoint-check`: PASS after allowing a local 127.0.0.1 test port; health is intentionally 503/fail-closed for TAG_UNSHIELD relay.
- `npm run lanes:trust-contract-check`: PASS after updating the Unshield trust-contract guard to the new fail-closed relay truth.
- `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`: PASS with existing warnings.
- `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml -- --nocapture`: PASS, 39 tests.
- `/Users/clay/.local/share/solana/install/active_release/bin/cargo-build-sbf --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`: PASS; warning remains for undefined runtime symbols including `sol_poseidon` and Solana syscalls, so deploy/runtime validation is still required.
- `npm run private-pool-v2:sbf-abi-check`: PASS after local SBF rebuild; ABI status fresh.
- `npm run private-pool-v2:contract-check`: PASS.
- `npm run private-pool-v2:root-provenance-check`: PASS.
- `npm run private-pool-v2:crucible-check`: PASS; dry-run harness validation passed.
- `npm run build`: PASS.
- `npm run docs:source-of-truth-check`: PASS.
- `git diff --check`: PASS.
- `npm run truth:privacy-claim-gate`: PASS; privacy/mainnet/production booleans remain false.
- `npm run private-pool-v2:live-anonymity-set-probe-check`: PASS; `currentDistinctCommitments=2`, `minimumDistinctCommitments=1024`, `depthBelowThreshold=true`.

## Lumi

- Local: PPA-PROGRAM-002 source, guard wiring, status/trust/security limitations, and local verification are committed and pushed on this branch; on-chain deployment/live/audit evidence remains absent.
- Committed: `995b24ba9a5615e435ee638b0b139ea84ef2d446` (`Harden privacy audit remediation gates`).
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` and `origin/main` at `995b24ba9a5615e435ee638b0b139ea84ef2d446` on 2026-05-25.
- Deployed/live: Render Vanta website service `srv-d7j3ggqqqhas739for80` live deploy `dep-d8a876kt8o5s73etj9d0` at commit `995b24ba` on 2026-05-25; on-chain spend/verifier programs, tag `5`/tag `6`, SBF/live lineage, and production privacy remain not deployed/live.

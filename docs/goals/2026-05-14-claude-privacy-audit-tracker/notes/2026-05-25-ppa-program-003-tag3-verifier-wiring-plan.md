# PPA-PROGRAM-003 - TAG_SPEND_WITH_PROOF Verifier Wiring Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 2 - on-chain program
- Recommended remediation order: 8
- Finding: `TAG_SPEND_WITH_PROOF` remains a fail-closed verifier boundary and cannot become a production mutation path until a real verifier program, proof format, public-witness layout, verifier-key hash, SBF/live lineage, and external review exist.
- Primary program: `programs/vanta_private_pool_v2_spend/src/lib.rs`

## Status

`blocked-on-verifier-program-evidence`

This is a tracker-only planning entry. No protocol code was changed for this item. Clay approved the plan on 2026-05-25, but implementation must not begin until the verifier-program/proof-format/verifying-key evidence exists.

## Current Truth

- `TAG_SPEND_WITH_PROOF` must remain fail-closed before proof verification or account mutation.
- The current C01 evidence points at `groth16-tag3-solana-v0`, but the production proof artifact, public-witness layout, production verifying-key hash, verifier adapter acceptance tests, deployed verifier program, SBF/live lineage, and external review are still absent.
- The positive proof-verified claim gate must stay blocked until valid-proof mutation and invalid-proof no-mutation evidence is real.

## Planned Files After Unblock

- `programs/vanta_private_pool_v2_spend/src/lib.rs`
- `programs/vanta_private_pool_v2_spend/README.md`
- `fuzz/vanta_private_pool_v2_spend/src/main.rs`
- `scripts/check-vanta-private-pool-v2-c01-verifier-adapter-seam.mjs`
- `scripts/check-vanta-private-pool-v2-c01-verifier-adapter-test-candidate.mjs`
- `scripts/check-vanta-private-pool-v2-c01-positive-proof-verified-claim-gate.mjs`
- `scripts/check-vanta-private-pool-v2-contract.mjs`
- `scripts/check-vanta-private-pool-v2-sbf-abi-status.mjs`
- `package.json`
- `PRODUCTION_PRIVACY_AUDIT.md`
- `SECURITY_LIMITATIONS.md`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`

## Blocker Before Implementation

Implementation is blocked until all of these exist:

- A selected production verifier program id and accepted verifier ABI.
- A pinned production proof format and public-witness layout for the active spend circuit.
- A production verifying-key hash registered through the verifier-key registry path.
- Positive verifier evidence for valid-proof mutation.
- Negative verifier evidence for invalid proof, wrong public input, wrong verifying key, and wrong verifier program no-mutation behavior.
- External ZK/Solana review acceptance of the verifier adapter boundary.

## Plan After Blocker Clears

1. Add a red-first verifier acceptance fixture that currently proves `TAG_SPEND_WITH_PROOF` cannot mutate from a valid proof because the verifier path is still fail-closed.
2. Wire the verifier CPI only after the account preflights, root-record check, verifier-key check, output-capacity check, and duplicate-nullifier check pass.
3. Bind proof bytes and public witness to the selected verifier program and registered verifier-key hash.
4. Mutate nullifier marker, output records, and tree/root state only after verifier acceptance.
5. Add no-mutation tests for invalid proof, wrong public input, wrong verifier key, wrong verifier program, duplicate nullifier, full output capacity, and wrong tree/root accounts.
6. Rebuild local SBF, refresh ABI evidence, and keep production privacy/proof-verified claim gates fail-closed until live lineage and external review exist.

## Verification After Approval And Unblock

- `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`
- `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml -- --nocapture`
- `cargo check --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml --features invariant_test`
- `/Users/clay/.local/share/solana/install/active_release/bin/cargo-build-sbf --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`
- `npm run zk:c01-verifier-adapter-test-candidate-check`
- `npm run zk:c01-positive-proof-verified-claim-gate-check`
- `npm run zk:c01-verifier-adapter-seam-check`
- `npm run private-pool-v2:contract-check`
- `npm run private-pool-v2:sbf-abi-check`
- `npm run private-pool-v2:crucible-check`
- `npm run private-pool-v2:verify`
- `npm run truth:privacy-claim-gate`
- `npm run private-pool-v2:live-anonymity-set-probe-check`
- `npm run privacy-audit:tracker-check`
- `git diff --check`

## Truth Boundary

This plan does not implement proof verification. It is not a production verifier, not production proof-format evidence, not production verifying-key evidence, not SBF/live lineage, not audit acceptance, and not production-private readiness.

## Lumi

- Local: tracker-only plan and blocker entry are local only.
- Committed: not committed.
- Pushed: not pushed.
- Deployed/live: not deployed or live verified.

# R4A TAG_UNSHIELD verifier-key preflight

Date: 2026-05-14

## Decision

Use the next local, additive hardening seam in the audit backlog: bind the reserved `TAG_UNSHIELD = 6` source preflight to a registered verifier-key record before any future release path can pass vault/nullifier checks. This keeps the release lane fail-closed while making the future proof-verified ABI shape more explicit.

## Local implementation

- `TAG_UNSHIELD` instruction data is now a 457-byte shape:
  `[6, nullifier:32, acceptedRoot:32, exitDestination:32, exitAssetId:32, exitAmountLeU64:8, publicInputHash:32, verifierKeyHash:32, groth16Proof:256]`.
- The source rejects all-zero `verifierKeyHash` and requires an 11th read-only verifier-key PDA.
- The verifier-key PDA must match `["vanta2vkey", pool_state, verifierKeyHash]` and the program-owned registry record created or verified by `TAG_REGISTER_VERIFIER_KEY = 5`.
- The fail-closed boundary remains `ERR_UNSHIELD_RELEASE_NOT_WIRED` after root/root-record/verifier-key/nullifier/vault-asset/token-account preflight.
- Truth/status surfaces now expose `sourceOnlyVerifierKeyPreflightReady: true` while keeping production custody/readiness false.

## What this proves

This proves only a local source/SBF ABI preflight shape: malformed or unregistered verifier-key metadata cannot glide through the reserved Unshield release preflight before the intentionally unwired release boundary.

## What this does not prove

This is not proof verification, not a production verifying key, not nullifier consume, not token/system CPI, not program-owned custody, not proof-verified Unshield release, not deployed/live bytecode evidence, not audit acceptance, and not production privacy.

## Verification

- `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`
- `npm run private-pool-v2:onchain-unshield-custody-check`
- `npm run private-pool-v2:sbf-abi-check`
- `npm run private-pool-v2:crucible-check`
- `npm run private-pool-v2:root-provenance-check`
- `npm run private-pool-v2:contract-check`
- `npm run lanes:trust-contract-check`
- `npm run unshield:trust-packet-check`
- `npm run mainnet:unshield-production-status-check`
- `npm run privacy-audit:tracker-check`

## Lumi hygiene

- Local: implemented in source, docs, status surfaces, and guards.
- Committed: pending this R4A changeset.
- Pushed: not pushed.
- Deployed/live: not deployed or live-verified.

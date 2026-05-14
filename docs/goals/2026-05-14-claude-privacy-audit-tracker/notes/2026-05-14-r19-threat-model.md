# R19 Threat Model - 2026-05-14

Status: local implemented.

## What Changed

- Added `docs/threat-model.md` as the canonical pre-mainnet threat model for current Vanta privacy boundaries.
- Added `docs/threat-model.md` to `docs/docs-source-of-truth.md`.
- Extended `npm run docs:source-of-truth-check` so the threat model cannot disappear or lose the required blocked-state phrases.

## Boundaries Preserved

- Vanta production privacy is not enabled.
- The threat model names users, merchants, relayers, operators, counterparties, provers, verifiers, indexers, wallet providers, RPC providers, auditors, and reviewers.
- It keeps tag-3 and tag-6 explicit: `ERR_PROOF_VERIFIER_NOT_WIRED` and `ERR_UNSHIELD_RELEASE_NOT_WIRED` remain expected until real verifier/release work lands.
- It preserves the A2 custody boundary: current Unshield is an operator-keypair public exit through `loadKeypairFromEnv(vaultSignerSecretKeyEnvName)`.
- It preserves the self-wallet exit blocker: `destinationOwner !== requester` is still rejected.
- It records that browser localStorage records are diagnostics and continuity aids only.
- It records that recipient discovery, program-owned shared-tree state, service separation, and legacy v1 plaintext memo quarantine remain unresolved.

## Verification

- `npm run docs:source-of-truth-check`
- `npm run privacy-audit:tracker-check`
- `npm run zk:feedback-loop-check`

This is a documentation and guard closure only. It is not production-private proof, not program-owned custody, not live anonymity, and not deployment evidence.

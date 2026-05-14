# R8A Prover Relay Privacy Trade-Off - 2026-05-14

## Status

Local implemented.

## What This Closes

This closes the local documentation and guard part of R8A from the Claude privacy audit: Vanta now has a source-of-truth note for opt-in remote prover and prover-relay privacy trade-offs before any remote proof fallback can become user-facing production evidence.

## Files

- `docs/zk/prover-relay-privacy-tradeoffs.md`
- `scripts/check-vanta-private-pool-v2-h08-production-prover-runtime-options.mjs`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-14-completion-audit.md`

## Guarded Content

- Remote proving must be explicit opt-in.
- User-facing copy must say whether proof material stays local or is sent to a remote service.
- Remote provers can receive privacy-sensitive proof inputs and metadata.
- Browser-worker proving remains dev-only evidence until production runtime, device, timeout, route-wiring, C01 compatibility, and audit/reviewer gates exist.
- Relay separation alone is not anonymity.
- Production-private proof infrastructure remains disallowed while `selectedProverRuntime` is `null`.

## Verification

- `npm run zk:h08-production-prover-runtime-options-check`

## Truth Boundary

This is documentation and guard hardening only. It is not a selected production prover runtime, not live route wiring, not C01 verifier compatibility, not remote prover deployment evidence, not production privacy, and not real-funds readiness.

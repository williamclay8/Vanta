# PPA-RELAYER-002 - Relayer Jitter And Batching Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 5 - relayer maturity
- Recommended remediation order: 17
- Item: randomized jitter + batching

## Status

`plan-open-awaiting-approval`

## Planned Files

- `operator/private-pool-v2-service-network.mjs`
- `operator/private-pool-v2-relayer-server.mjs`
- `src/privacy/privatePoolV2RelayerQueue.mjs`
- `scripts/check-vanta-private-pool-v2-relayer-jitter-batching.mjs`
- `docs/threat-model.md`
- `SECURITY_LIMITATIONS.md`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-relayer-002-jitter-batching-plan.md`

## Planned Fixtures

- Deterministic fake-clock scheduler proves Send submissions are queued for a randomized delay inside the configured 30-180s window before relayer submission.
- Deterministic fake-clock scheduler proves Unshield release relay requests are queued for a randomized delay inside the configured 30s-1h window before relay.
- Batching fixture proves multiple ready Send submissions are grouped into a single batch envelope when load and account limits allow.
- No-secret fixture proves queued/batched records reject or redact proof bytes, witness material, owner secrets, note blindings, auth tokens, raw IP addresses, and private keys.
- Fail-closed production fixture proves jitter/batching cannot be disabled in production without an explicit env guard and tracker-visible status.

## Planned Script

- `npm run relayer:jitter-and-batching-check`

## Planned Test Cases

- Default local/test mode can use deterministic jitter for reproducible checks.
- Production mode requires nonzero jitter windows for Send and Unshield.
- Invalid window configuration rejects zero, negative, inverted, or out-of-policy windows.
- Ready queue drains in deadline order and preserves request idempotency/replay keys.
- Batch envelopes contain account/proof-reference metadata only and do not persist witness/secret/plaintext payloads.
- Threat model documents timing-correlation limits and delay-window distribution without claiming anonymity.

## Verification After Approval

- `npm run relayer:jitter-and-batching-check`
- `npm run private-pool-v2:service-network-check`
- `npm run mainnet:secret-handling-check`
- `npm run truth:privacy-claim-gate`
- `npm run privacy-audit:tracker-check`
- `npm run build`
- `git diff --check`

## Approval Gate

Implementation is pending Clay approval before code edits.

## Truth Boundary

This plan would reduce timing-correlation risk locally, but it would not by itself prove anonymity, Tor/blinded-token protection, live relayer maturity, production-private readiness, audit acceptance, or mainnet readiness.

## Lumi

- Local: tracker plan entry added locally; implementation not started.
- Committed: latest branch head after this tracker-only slice; use `git log` for the exact commit.
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` after this tracker-only slice; use `git status` for sync.
- Deployed/live: not deployed/live.

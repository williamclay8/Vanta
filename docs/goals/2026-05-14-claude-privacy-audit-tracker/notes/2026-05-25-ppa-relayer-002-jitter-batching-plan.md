# PPA-RELAYER-002 - Relayer Jitter And Batching Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 5 - relayer maturity
- Recommended remediation order: 17
- Item: randomized jitter + batching

## Status

`implemented-verified-local`

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

- `npm run relayer:jitter-and-batching-check` - PASS
- `npm run private-pool-v2:service-network-check` - PASS
- `npm run mainnet:secret-handling-check` - PASS
- `npm run truth:privacy-claim-gate` - PASS
- `npm run privacy-audit:tracker-check` - PASS
- `npm run build` - PASS
- `git diff --check` - PASS

## Implementation Evidence

- `src/privacy/privatePoolV2RelayerQueue.mjs` implements deterministic Send/Unshield jitter windows, deadline-ordered ready queues, Send batch envelopes, idempotency-key replay rejection, production nonzero-window guards, and no-secret queued metadata validation.
- `operator/private-pool-v2-service-network.mjs` exposes relayer timing controls on readiness, persists relay queue metadata with the relayer snapshot, and adds relay-queue status/drain endpoints while keeping `productionReady: false`.
- `scripts/check-vanta-private-pool-v2-relayer-jitter-batching.mjs` covers jitter windows, batching, idempotency, no-secret queued records, production fail-closed config, docs, package wiring, and tracker evidence.
- `docs/threat-model.md` and `SECURITY_LIMITATIONS.md` document timing-correlation limits without lifting privacy, anonymity, production, audit, or mainnet claims.

## Approval Gate

Clay approved the plan in thread on 2026-05-25 before implementation.

## Truth Boundary

This local implementation reduces source-level timing-correlation risk and guards production config shape, but it does not by itself prove anonymity, Tor/blinded-token protection, live relayer maturity, production-private readiness, audit acceptance, or mainnet readiness.

## Lumi

- Local: relayer jitter/batching source, docs, npm script, and tracker evidence are implemented locally in this slice.
- Committed: not committed in current slice yet.
- Pushed: not pushed in current slice yet.
- Deployed/live: not deployed/live.

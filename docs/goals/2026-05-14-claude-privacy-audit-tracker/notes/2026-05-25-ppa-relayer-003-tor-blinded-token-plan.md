# PPA-RELAYER-003 - Tor / Blinded-Token Relayer Path Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 5 - relayer maturity
- Recommended remediation order: 18
- Item: Tor / blinded-token relayer path

## Status

`implemented-verified-local`

## Planned Files

- `src/privacy/privatePoolV2RelayerPrivacyTransport.mjs`
- `operator/private-pool-v2-service-network.mjs`
- `operator/private-pool-v2-relayer-server.mjs`
- `scripts/check-vanta-private-pool-v2-relayer-privacy-transport.mjs`
- `docs/threat-model.md`
- `SECURITY_LIMITATIONS.md`
- `docs/operator-runbook.md`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-relayer-003-tor-blinded-token-plan.md`

## Planned Fixtures

- Production config fixture proves a relayer cannot report `privacyTransportReady` unless exactly one approved ingress mode is configured: `tor-onion` or `blinded-token`.
- Tor-onion evidence fixture accepts refs-only onion service evidence, onion host fingerprint, reverse-proxy redaction evidence, and reviewer acceptance refs while rejecting raw secrets, bearer tokens, private keys, and onion private-key material.
- Blinded-token evidence fixture accepts refs-only issuer/verifier/token-family/replay-cache evidence and rejects raw token preimages, bearer tokens, and wallet/user identifiers.
- No-IP-persistence fixture proves relay queue/status/receipt metadata cannot store `ip`, `x-forwarded-for`, `cf-connecting-ip`, `rawIpAddress`, user agent, auth token, or raw token fields.
- Fail-closed local status fixture proves source surfaces say local privacy-transport contract only and keep `productionReady: false` until external deployment/reviewer evidence is present.

## Planned Script

- `npm run relayer:privacy-transport-check`

## Planned Test Cases

- Default local/test mode reports `privacyTransportReady: false` and does not claim Tor or blinded-token protection.
- Production mode rejects missing privacy transport configuration.
- Production mode rejects ambiguous configuration where both Tor and blinded-token paths are marked active.
- Production mode rejects evidence packets without deployment refs, log-redaction refs, retention-policy refs, and reviewer acceptance refs.
- Status and runbook surfaces expose only refs and redacted handles, never raw IPs, blinded token preimages, onion private keys, auth tokens, proof bytes, witnesses, owner secrets, or note blindings.
- Threat model documents that the local gate is not live Tor, not live blinded-token submission, not anonymity-set evidence, not audit acceptance, and not production privacy.

## Verification After Approval

- `npm run relayer:privacy-transport-check`
- `npm run relayer:jitter-and-batching-check`
- `npm run private-pool-v2:service-network-check`
- `npm run mainnet:secret-handling-check`
- `npm run truth:privacy-claim-gate`
- `npm run privacy-audit:tracker-check`
- `npm run build`
- `git diff --check`

## Approval Gate

Clay approved this plan in thread on 2026-05-25 before code edits.

## Delivered

- Added `src/privacy/privatePoolV2RelayerPrivacyTransport.mjs` for the refs-only Tor/blinded-token privacy-transport evidence contract.
- Wired production relayer startup to require `VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED=true`, exactly one mode (`tor-onion` or `blinded-token`), and refs-only deployment/log-redaction/retention/reviewer evidence.
- Exposed fail-closed `relayerPrivacyTransport` status on the relayer role service.
- Extended relay queue metadata rejection to cover raw IP, `x-forwarded-for`, `cf-connecting-ip`, user-agent, auth-token, raw-token, token-preimage, and blinded-token-preimage fields.
- Updated threat-model, security-limitations, operator-runbook, package, and tracker surfaces.

## Verified

- `npm run relayer:privacy-transport-check: PASS`
- `npm run relayer:jitter-and-batching-check: PASS`
- `npm run private-pool-v2:service-network-check: PASS`
- `npm run mainnet:secret-handling-check: PASS`
- `npm run truth:privacy-claim-gate: PASS`
- `npm run privacy-audit:tracker-check: PASS`
- `npm run build: PASS`
- `npm run security:limitations-check: PASS`
- `npm run operator:runbook-check: PASS`
- `git diff --check: PASS`

## External Blockers

- Live Tor hidden-service deployment or blinded-token issuer/verifier infrastructure requires external provider/deployment approval.
- Reviewer acceptance is required before any Tor/blinded-token protection claim can move beyond local source/evidence-contract status.

## Truth Boundary

This local gate makes the relayer privacy-transport requirement executable and fail-closed, but it does not deploy Tor, implement Privacy Pass/blinded-token cryptography, prove IP privacy, prove anonymity, provide audit acceptance, or make any lane production-private/mainnet-ready.

## Lumi

- Local: relayer privacy-transport source, docs, npm script, and tracker evidence are implemented locally in this slice.
- Committed: `8db388d8b49558ba8fda45c482ef7f4336c1f47c` (`Add relayer privacy transport gate`) plus `d1de01d8` (`Record relayer privacy transport status`).
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` includes `d1de01d8` on 2026-05-25.
- Deployed/live: not deployed/live.

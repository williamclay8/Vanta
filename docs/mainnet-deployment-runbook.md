# Mainnet Deployment Runbook

This runbook is the checked deployment and rollback handoff for Vanta mainnet-beta infrastructure.

It does not make Vanta mainnet-ready or production-ready. Keep `mainnetReady: false` and `productionReady: false` until the remaining private-settlement, replay-enforcement, wallet-signing, observability, and external approval gates are actually cleared.

## Safety Rule

Do not paste secrets into chat, git, screenshots, docs, issue comments, or shell history snippets.

Only refs, service names, public URLs, evidence IDs, and non-secret hostnames belong in the repo. Never commit raw bearer tokens, API keys, raw database URLs, wallet keys, seed phrases, or signed transaction material.

## Canonical Deployment Inputs

The checked production service inventory is:

```text
ops/mainnet/private-pool-v2-services.manifest.json
```

The production service setup guide is:

```text
docs/production-private-pool-v2-service-setup.md
```

The production database handoff is:

```text
docs/production-db-refs-runbook.md
```

The production observability contract/template is:

```text
ops/mainnet/production-observability.template.json
```

The backup/restore evidence surface is:

```text
ops/mainnet/production-backup-restore.evidence.json
```

The no-real-funds production smoke evidence surface is:

```text
ops/mainnet/private-pool-v2-production-smoke.evidence.json
```

The approval-gates evidence surface is:

```text
ops/mainnet/mainnet-approval-gates.evidence.json
ops/mainnet/mainnet-real-funds-approval.evidence.json
```

## Deployment Scope

The current deployment shape is:

- static app at the public website
- production Private Pool v2 indexer
- production Private Pool v2 prover
- production Private Pool v2 relayer
- production Private Pool v2 verifier
- production Private Pool v2 operator

The operator must continue to run with `VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services` for the production remote-service topology.

## Pre-Deploy Verification

Run these before treating a deploy as healthy:

```bash
npm run build
npm run mainnet:production-service-setup-check
npm run mainnet:deployment-manifest-check
npm run mainnet:deployment-runbook-check
npm run mainnet:private-rail-route-status-check
npm run mainnet:private-rail-route-health-auth
npm run mainnet:private-pool-v2-production-smoke-write
npm run mainnet:production-smoke-evidence-check
npm run mainnet:observability-sink-check
npm run ops:rate-limit-check
npm run mainnet:approval-gates-check
npm run mainnet:real-funds-approval-check
npm run mainnet:preflight
```

The route-health auth command and the smoke-write command must be run from a Doppler-backed production shell so the checked repo never stores token values.

## Ordered Deployment Flow

1. Confirm the checked repo state on `main` has passed `npm run mainnet:preflight`.
2. Confirm the production service inventory in `ops/mainnet/private-pool-v2-services.manifest.json` still matches the live Render service names and URLs.
3. Confirm the database refs and migration evidence in `docs/production-db-refs-runbook.md` and `ops/mainnet/production-migration-evidence.manifest.json`.
4. Confirm production role URLs and auth tokens are available only through the secret manager.
5. Run `npm run mainnet:private-rail-route-health-auth` from a Doppler-backed shell.
6. Run `npm run mainnet:private-pool-v2-production-smoke-write` from the same Doppler-backed shell.
7. Re-run `npm run mainnet:preflight` so the checked surfaces agree with the fresh smoke evidence.
8. Keep all live actions bounded by the current approval record in `ops/mainnet/mainnet-real-funds-approval.evidence.json`.

## Rollback

The checked rollback plan reference for the bounded beta path is:

```text
runbook/disable-private-pool-v2-services-and-beta-actions
```

The approved bounded action reference remains:

```text
launch-runbook/vanta-mainnet-beta-001
```

If the production route-health command fails, the smoke path fails, or service readiness drifts:

1. stop new beta actions immediately
2. disable or suspend the affected Private Pool v2 services
3. return approval-gate posture to blocked if the bounded action/window/funds-at-risk contract is no longer true
4. refresh route-health and smoke evidence only after the deployment has been corrected

Do not widen the live scope during rollback. Restore the last known-good no-real-funds state first.

## Monitoring And Incident Response

Vanta keeps production observability provider-neutral in the checked repo. The checked contract is still:

```text
ops/mainnet/production-observability.template.json
```

Production deployment must preserve:

- public health checks
- authenticated readiness checks
- privacy-preserving telemetry
- rate-limit evidence
- incident response refs
- audit-event retention refs

The main checked commands on this lane are:

```bash
npm run mainnet:observability-sink-check
npm run ops:safe-telemetry-check
npm run ops:rate-limit-check
```

Incident response on this repo means:

- stop the bounded beta action
- preserve logs and evidence refs
- do not leak secrets while debugging
- do not run unapproved real-funds actions
- refresh sanitized evidence only after the incident state is understood

## Backup And Restore

Deployment is not separate from storage safety. Before expanding live scope, use the checked backup/restore surfaces:

```bash
npm run mainnet:backup-restore-check
npm run mainnet:backup-restore-evidence-check
npm run mainnet:backup-restore-status
npm run mainnet:production-restore-drill-evidence-check
```

The repo currently records operator-skipped controls for some provider backup items. Keep that truth visible; do not rewrite skipped controls as completed deployment evidence.

## Real-Funds Boundary

The currently checked production smoke path is explicitly no-real-funds. The current approval surface allows only the already-recorded bounded beta action and does not authorize general mainnet settlement expansion.

Any live action outside that bounded approval must be treated as blocked until the approval packet is updated and rechecked.

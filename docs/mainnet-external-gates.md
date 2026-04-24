# Vanta Mainnet External Gates

This packet turns the remaining external launch blockers into a concrete handoff. It does not make Vanta production-ready or mainnet-ready.

Canonical packet:

```text
ops/mainnet/external-gates.packet.json
```

Canonical check:

```bash
npm run mainnet:external-gates-check
npm run mainnet:preflight
```

Plain-English worksheet:

```text
docs/mainnet-launch-worksheet.md
```

## Safety Rule

Do not paste secrets into chat, commits, docs, issue comments, or screenshots.

Use references only. A safe handoff says `VANTA_SECRET_MANAGER_REF=prod/vanta/mainnet`, not the value stored inside that secret manager.

Never commit or share:

- private keys
- seed phrases
- wallet keypair files
- raw RPC credentials
- raw database URLs
- raw API tokens
- raw webhook secrets
- raw bearer tokens
- customer private inputs

## What Can Be Shared

Safe launch handoff values are names, references, and non-secret public metadata:

- deployed service names and non-secret service URL references
- secret manager reference names
- database reference names
- monitoring dashboard references
- audit report references
- legal/compliance/custody review references
- explicit approval before mainnet funds, recorded as a reference to the approval artifact

If a value authenticates, decrypts, signs, spends, or grants access, do not put it in this repo and do not paste it into chat.

## Current Staging Evidence

The current checked packet includes non-secret Render staging references for:

- Pay service `srv-d7j3ggqqqhas739for80` at `https://vanta-0wwi.onrender.com`
- Private Pool v2 service `srv-d7j4aod7vvec73ahsqlg` at `https://vanta-staging-private-pool-v2.onrender.com`
- `postgres-jsonb-snapshot-store` storage for both services through secret reference names, not raw database URLs
- Better Stack staging monitors for both public `/health` endpoints, recorded in `ops/mainnet/staging-monitoring.manifest.json`

This is staging evidence only. It does not clear production service, secret-manager, monitoring, audit, legal, custody, or mainnet-funds gates.

## External Gate Checklist

### Deployed services

Purpose: deploy durable indexer, relayer, prover, verifier, and operator services.

Evidence needed:

- `VANTA_INDEXER_URL_REF`
- `VANTA_RELAYER_URL_REF`
- `VANTA_PROVER_URL_REF`
- `VANTA_VERIFIER_URL_REF`
- `VANTA_OPERATOR_URL_REF`
- `ops/mainnet/service-deployment.evidence.json`
- `ops/mainnet/private-pool-v2-route-health.evidence.json`
- `ops/mainnet/private-pool-v2-role-service-replay.evidence.json`
- `ops/mainnet/private-pool-v2-production-smoke.evidence.json`
- service-to-service auth references
- health/readiness endpoint evidence
- rollback target reference

Verification:

```bash
npm run mainnet:service-contract-check
npm run mainnet:service-topology-check
npm run mainnet:service-deployment-evidence-check
npm run mainnet:private-rail-route-health-evidence-check
npm run mainnet:role-service-replay-evidence-check
npm run mainnet:deployment-manifest-check
npm run mainnet:private-pool-v2-production-smoke-check
npm run mainnet:production-smoke-evidence-check
```

The sanitized deployment status evidence manifest is:

```text
ops/mainnet/service-deployment.evidence.json
```

The sanitized authenticated route-health evidence manifest is:

```text
ops/mainnet/private-pool-v2-route-health.evidence.json
```

The checked role-service replay barrier evidence manifest is:

```text
ops/mainnet/private-pool-v2-role-service-replay.evidence.json
```

The Private Pool v2 production smoke target template is:

```text
ops/mainnet/private-pool-v2-production-smoke.template.json
```

It records references for deployed indexer, prover, relayer, verifier, and operator URLs, auth-token refs, and no-real-funds smoke evidence.

The sanitized production smoke evidence manifest is:

```text
ops/mainnet/private-pool-v2-production-smoke.evidence.json
```

The production service setup guide is:

```text
docs/production-private-pool-v2-service-setup.md
```

It records the current Render inventory, deployed production indexer/prover/relayer/verifier/operator services, the `VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services` wiring, and the smoke evidence that has been captured. Vanta still remains blocked because observability controls, backup/restore maturity, and real-funds readiness are still pending, and separate audit and legal/compliance/custody gates also remain blocked.

### Production storage

Purpose: move Pay, Private Pool v2, Strategy, and Operator state behind durable storage.

Evidence needed:

- `VANTA_PRODUCTION_DATABASE_REF`
- migration application evidence
- point-in-time recovery evidence
- encrypted backup policy
- restore drill result
- least-privilege role evidence

Verification:

```bash
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run storage:adapter-check
```

### Secret manager

Purpose: keep production credentials out of the repo and out of browser bundles.

Evidence needed:

- `VANTA_SECRET_MANAGER_REF`
- Doppler project/config references
- service identity references
- `ops/mainnet/secret-references.manifest.json` references-only inventory
- `ops/mainnet/production-secret-manager.template.json` Doppler mapping template
- service secret refs for Pay, Private Pool v2, Strategy, and Operator scopes
- rotation runbook reference
- incident revocation runbook reference
- secret access audit log reference

Verification:

```bash
npm run mainnet:secret-handling-check
```

Current state: Doppler has been created and selected as the production secret-manager target. The checked manifest and Doppler template inventory refs only and store no secret values. This still does not clear the production secret-manager gate until service tokens, access logs, and production deployment wiring are externally verified.

### Wallet signing safety

Purpose: prevent blind signing and prevent accidental mainnet transactions.

Evidence needed:

- `ops/mainnet/wallet-signing-safety.evidence.json`
- browser-backed simulation evidence
- transaction-summary evidence
- explicit approval evidence for any mainnet signature path
- blind-signing rejection evidence
- deployed production browser-backed verification evidence for:
  - Shield
  - Send
  - Swap
  - Unshield

Verification:

```bash
npm run mainnet:wallet-signing-status
npm run mainnet:wallet-production-browser-check
npm run mainnet:wallet-signing-evidence-check
npm run wallet:signing-safety-check
npm run wallet:browser-signing-safety-check
npm run wallet:transaction-safety-check
npm run protocol:browser-check
npm run pay:browser-check
```

Current checked truth: the local/browser wallet-signing boundary is green, deployed production browser-backed verification is now recorded for Shield, Send, Swap, and Unshield at `https://vantaprivacy.xyz`, live mainnet submission remains explicitly blocked, and the remaining blocker is that the public app still serves the beta-mode and private-settlement-offline banners.

### Third-party security audit

Purpose: independent review of proof boundaries, operators, custody assumptions, browser flows, and runbooks.

Evidence needed:

- `ops/mainnet/mainnet-approval-gates.template.json` audit evidence refs
- `VANTA_AUDIT_REPORT_REF`
- audit scope agreement reference
- critical/high finding disposition
- fix verification reference
- final security review decision

Verification:

```bash
npm run audit:package-check
npm run mainnet:preflight
npm run private-core:verify
npm run private-pool-v2:verify
npm run pay:verify
```

### Legal, compliance, and custody

Purpose: review launch scope before real user funds, merchant processing, or custody-like flows.

Evidence needed:

- `ops/mainnet/mainnet-approval-gates.template.json` legal/compliance/custody evidence refs
- `VANTA_LEGAL_REVIEW_REF`
- `VANTA_CUSTODY_REVIEW_REF`
- compliance review reference
- merchant-processing policy reference
- jurisdiction and sanctions-screening decision reference

Verification:

```bash
npm run security:limitations-check
```

### Mainnet funds approval

Purpose: keep real funds blocked until there is explicit approval for the exact action.

Evidence needed:

- `ops/mainnet/mainnet-approval-gates.template.json` explicit mainnet approval evidence refs
- `ops/mainnet/mainnet-real-funds-approval.evidence.json` checked bounded real-funds approval packet
- `VANTA_MAINNET_APPROVAL_RECORD_REF`
- approved launch window
- approved wallet and fee-payer reference
- approved runbook step or transaction class
- rollback and stop-loss plan reference

Verification:

```bash
npm run mainnet:readiness-check
npm run mainnet:approval-gates-status
npm run mainnet:approval-gates-check
npm run mainnet:approval-gates-evidence-check
npm run mainnet:real-funds-approval-status
npm run mainnet:real-funds-approval-check
npm run wallet:transaction-safety-check
```

The approval gates template is:

```text
ops/mainnet/mainnet-approval-gates.template.json
```

The current approval-gate evidence surface is:

```text
ops/mainnet/mainnet-approval-gates.evidence.json
```

It records the difference between technical evidence already captured, operator-skipped controls, and bounded approval. It is references-only and must remain `mainnetReady: false` and `productionReady: false`; `realFundsAllowed` is true only for the bounded beta private-pool smoke approval. Do not store legal advice text, under-NDA audit contents, wallet keys, pre-signed transactions, or credential values in this repo.

Operator decision on April 22, 2026: third-party security audit, legal/compliance/custody review, secret-manager audit/rotation evidence, Pay restore readback, and provider backup/PITR/encryption/access-audit/least-privilege evidence were skipped. This is not approval and not evidence that those controls passed.

The real-funds approval packet is:

```text
ops/mainnet/mainnet-real-funds-approval.evidence.json
```

It now records bounded approval for one action: beta mainnet private-pool smoke with maximum `0.05 SOL` at risk during `2026-04-22T14:30:00-15:30:00 America/Chicago`, approved by Clay. That recorded window is now expired. This is not blanket production readiness and does not allow any other mainnet action. It must never contain private keys, seed phrases, signed transactions, bearer tokens, or raw database URLs.

### Monitoring and incident response

Purpose: make production operation observable without logging secrets or private inputs.

Evidence needed:

- `VANTA_MONITORING_DASHBOARD_REF`
- provider-backed log sink reference
- alert routing reference
- on-call owner reference
- `VANTA_INCIDENT_RUNBOOK_REF`
- abuse response workflow reference
- retention policy reference
- privacy-preserving telemetry review reference
- staging Better Stack monitor references from `ops/mainnet/staging-monitoring.manifest.json`
- production Better Stack monitors are intentionally skipped by operator decision; use provider-neutral observability evidence instead

Verification:

```bash
npm run mainnet:abuse-observability-check
npm run ops:rate-limit-check
npm run ops:safe-telemetry-check
npm run mainnet:observability-sink-check
npm run operator:runbook-check
```

Current checked truth: the deployed operator already uses the preferred Postgres durable shared-window rate limiter, but provider-backed log sink, dashboards, alerts, retention, and incident workflow controls are all still pending.

## How To Hand This Back Safely

When external providers are chosen, provide only:

- provider names
- non-secret service endpoints when they are meant to be public
- secret reference names
- dashboard/report/runbook links that do not expose credentials
- approval artifact references

Do not provide raw token values, wallet material, database passwords, seed phrases, or private keys.

## Current Truth

This packet is a launch checklist and evidence contract, not a production claim.

Vanta remains not production-ready. The current packet records a bounded real-funds approval plus operator-skipped audit, legal/compliance/custody, secret-manager audit/rotation, Pay restore readback, and provider backup controls.

The current approval status lives in `ops/mainnet/mainnet-approval-gates.evidence.json`. It links completed technical evidence without turning that evidence into audit, legal, custody, backup, or unrestricted funds approval.

External reviewers must treat legal, compliance, and custody as a separate launch gate, not as an engineering-only checklist item.

# Vanta Audit Package

This document is the starting audit handoff for Vanta. It is not an audit report and it does not make Vanta mainnet-ready.

## Scope

Initial review scope should cover:

- Vanta Private Core proof boundaries
- Private Pool v2 benchmark contracts and local runtime seams
- Pay private-settlement adapter and merchant API harness
- Strategy planner, execution-preview, and local runtime boundaries
- operator runbooks and mainnet-readiness gates
- production storage contract, migration, backup, and restore requirements
- abuse control, rate-limit, metrics, alert, and audit-event requirements
- external mainnet gates packet for deployed services, secret-manager refs, audit/legal/custody refs, and explicit mainnet-funds approval
- browser wallet and signing safety policy

## Out of scope

The current repo is not asking reviewers to sign off on:

- deployed mainnet infrastructure
- real custody of user funds
- production merchant processing
- legal or compliance readiness
- production anonymity-set guarantees

## Circuit review

Primary circuit and proof commands:

```bash
npm run private-core:verify
npm run private-pool-v2:verify
```

Reviewers should inspect:

- fixed-depth Vanta Private Core unshield, send, and swap lanes
- Private Pool v2 shield and claim circuits
- public input binding
- nullifier construction and replay assumptions
- fixture validity and invalid-fixture failure behavior
- proof artifact reproducibility

## Operator review

Primary operator commands:

```bash
npm run operator:runbook-check
npm run mainnet:preflight
npm run mainnet:external-gates-check
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run storage:adapter-check
npm run mainnet:abuse-observability-check
npm run ops:rate-limit-check
npm run nullifier:replay-guard-check
npm run private-pool-v2:verify
npm run pay:verify
```

Reviewers should inspect:

- local operator authentication assumptions
- durable-store requirements
- idempotency and conflicting replay rejection
- settlement receipt fingerprints
- restart-safe local persistence
- production database, migration, backup, and restore requirements
- baseline Postgres migration coverage for Pay, Private Pool v2, Strategy, and Operator state
- abuse controls, rate limits, privacy-preserving telemetry, alerts, and audit-event requirements
- fail-closed request validation
- production service contract and deployment manifest shape
- external gates packet and references-only launch evidence model
- checked `ops/mainnet/secret-references.manifest.json` reference inventory

## Browser and wallet review

Primary browser and wallet commands:

```bash
npm run protocol:browser-check
npm run pay:browser-check
npm run wallet:signing-safety-check
npm run wallet:transaction-safety-check
npm run mainnet:secret-handling-check
```

Reviewers should inspect:

- wallet connection boundaries
- transaction-summary requirements
- simulation-before-signature requirements
- absence of blind signing
- absence of private-key, seed-phrase, or keypair-file handling
- live mainnet submission gating
- executable transaction safety summaries before wallet approval
- secret-manager, rotation, least-privilege, and no-private-key handling boundaries
- secret-reference manifest entries for owner, provider, environment, rotation, revocation, and access-log refs

## Custody and key-management review

Vanta needs a dedicated custody and key-management review before real funds.

Reviewers should inspect:

- secret storage requirements
- key rotation expectations
- no private-key, seed-phrase, or keypair-file handling
- service-to-service authentication
- operator token handling
- relayer fee wallet assumptions
- incident response requirements

## Known non-production boundaries

No audit claim is made today.

No mainnet funds should be used with this repo today.

Known blockers:

- Private Pool v2 is a Render staging operator with Postgres snapshot persistence, but not a deployed shared anonymity set or audited mainnet privacy pool.
- Pay is a Render staging merchant API with Postgres snapshot persistence and Private Pool v2 operator wiring, but not a production payment processor.
- Strategy is a local planning/runtime lane, not live autonomous execution.
- The mainnet service manifest uses placeholders only and contains no real secrets.
- The secret-reference manifest uses refs only and still requires a production secret manager before mainnet.
- The external mainnet gates packet is blocked until real deployed-service, secret-manager, audit, legal/compliance/custody, monitoring, and explicit approval references exist.
- Production database adapters, migrations, backup jobs, and restore drills are contracted but not wired.
- Live mainnet submission remains disabled.
- Legal, compliance, custody, and third-party security review remain incomplete.

## Required verification bundle

Run this bundle before audit handoff:

```bash
npm run mainnet:preflight
npm run mainnet:external-gates-check
npm run private-core:verify
npm run private-pool-v2:verify
npm run pay:verify
npm run build
```

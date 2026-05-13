# Vanta Audit Package

This document is the starting handoff for future reviewers.

It is not an audit report. It does not make Vanta mainnet-ready.

Plain-English goal: help a reviewer find the important proof, operator, wallet, Pay, storage, and readiness surfaces without reading the whole repo first.

## Scope

Initial review should cover:

- Proofs: Vanta Private Core and Private Pool v2.
- Actual-private settlement: the Solscan-resistant Private Pool v2 spend lane, including pool/cohort/root/nullifier/output/context transcript boundaries.
- Pay: merchant API, checkout, approval packet, and private-settlement adapter.
- Wallet safety: transaction summaries, simulation before signing, and no private-key handling.
- Operators: runbooks, readiness gates, storage requirements, replay protection, and production blockers.
- Production controls: database migrations, backup and restore, abuse controls, rate limits, metrics, alerts, audit events, secret-manager refs, and mainnet-funds approval gates.

## Intake Packets

Refs-only packets for making the remaining external gates real:

- `ops/mainnet/audit-review.packet.template.json`
- `ops/mainnet/legal-compliance-custody.packet.template.json`
- `ops/mainnet/production-key-custody.template.json`

These are intake templates, not approvals. They must contain reference names and decisions only, never secrets, private keys, privileged legal text, under-NDA report bodies, signed transactions, or customer private inputs.

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
npm run zk:c01-production-verifier-backend-candidate-check
npm run zk:c01-verifier-backend-decision-check
```

Reviewers should inspect:

- whether public inputs bind to the thing being proved
- whether actual-private spend public transcripts include the asset-id commitment while excluding source wallet, merchant settlement address, raw amount, raw asset, note secret, input commitment, input leaf index, deposit signature, plaintext memo, and same-fee-payer linkage
- whether nullifiers and replay checks prevent the same private state from being reused
- whether valid fixtures pass and invalid fixtures fail
- whether proof artifacts can be reproduced
- whether the current fixed-depth and narrow-lane assumptions are explicit

## C01 verifier/backend review

Current C01 status is partial. Read `docs/zk/c01-production-verifier-backend-decision.md` before accepting any verifier-ready claim.

Reviewers should verify that current remote proof-artifact receipts stay `offchain-remote-proof-artifact-only`, that any `solana-c01-groth16-verifier-ready` overclaim fails closed, and that no backend is selected yet between the Groth16 tag-3 Solana verifier path and the Noir/bb.js/UltraHonk adaptation path.

Focused commands:

```bash
npm run zk:feedback-loop-check
npm run zk:c01-onchain-proof-boundary-check
npm run zk:c01-verifier-backend-contract-check
npm run zk:c01-production-verifier-backend-candidate-check
npm run zk:c01-verifier-backend-decision-check
npm run private-pool-v2:remote-proof-artifact-boundary-check
```

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

- who the operator is trusted to be today
- what happens after restart
- how duplicate or conflicting requests are rejected
- what evidence is stored for settlement receipts
- which production database, migration, backup, and restore requirements are still incomplete
- whether abuse controls, rate limits, privacy-preserving telemetry, alerts, and audit events fail closed
- whether the external mainnet gates packet and references-only launch evidence are still honest
- whether `ops/mainnet/secret-references.manifest.json` names refs without storing secret values

## Browser and wallet review

Primary browser and wallet commands:

```bash
npm run protocol:browser-check
npm run pay:browser-check
npm run wallet:signing-safety-check
npm run wallet:transaction-safety-check
npm run truth:transaction-check
npm run mainnet:transaction-evidence-check
npm run mainnet:secret-handling-check
```

Reviewers should inspect:

- whether the user sees a clear summary before signing
- whether transactions simulate before signature
- whether blind signing is avoided
- whether the app avoids private keys, seed phrases, and keypair files
- whether live mainnet submission stays behind explicit gates
- whether Transaction Evidence v0.1 redacts private inputs and uses honest completion language
- whether secret-manager and rotation refs exist without exposing secret values

## Custody and key-management review

Vanta needs a dedicated custody and key-management review before real funds.

Reviewers should inspect:

- where secrets would live
- how keys would rotate
- how service-to-service authentication works
- how operator tokens are handled
- how relayer fee wallets are controlled
- what the incident response process is
- whether the repo still avoids private-key, seed-phrase, and keypair-file handling

## Known non-production boundaries

No audit claim is made today.

No mainnet funds should be used with this repo today.

Known beta limits and blockers:

- Private Pool v2 is a Render staging operator with Postgres snapshot persistence, but not a deployed shared anonymity set or audited mainnet privacy pool.
- Pay is a Render staging merchant API with Postgres snapshot persistence and Private Pool v2 operator wiring, but not a production payment processor.
- Strategy is a local planning/runtime lane, not live autonomous execution.
- The mainnet service manifest uses placeholders only and contains no real secrets.
- Secret-manager audit/rotation evidence was skipped by operator decision; this is not a secret-handling maturity claim.
- Audit and legal/compliance/custody review were skipped by operator decision; this is not audit, legal, compliance, or custody approval.
- Pay restore readback plus provider backup/PITR/encryption/access-audit/least-privilege evidence were skipped by operator decision.
- Production database adapters, migrations, backup jobs, and restore drills have partial evidence and operator-skipped controls, not full production recovery proof.
- Live mainnet submission mode can be enabled in bounded operator windows, but real-funds actions remain explicitly approval-gated and still do not make Vanta mainnet-ready.
- Legal, compliance, custody, and third-party security review remain incomplete.

## Required verification bundle

Run the single root handoff command before audit handoff:

```bash
npm run audit:handoff-check
```

It expands to the current canonical bundle:

```bash
npm run audit:package-check
npm run mainnet:preflight
npm run private-core:verify
npm run private-pool-v2:verify
npm run pay:verify
npm run build
```

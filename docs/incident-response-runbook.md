# Vanta Incident Response Runbook

Status: operator-trusted beta runbook. Launch status unchanged. This is a repo-local operational source of truth, not external reviewer acceptance, legal advice, custody approval, or permission to move claim gates.

Publication ref: `docs/incident-response-runbook.md`.

Use this runbook when a Vanta operator, reviewer, or maintainer sees drift in service health, proof/custody boundaries, evidence refs, secret handling, rate limits, wallet signing, or any user-funds-adjacent flow.

## Scope

This runbook covers:

- Pay, Private Pool v2, Strategy, operator-control-plane, indexer, relayer, prover, and verifier-adjacent services.
- Service health, readiness drift, evidence drift, secret exposure risk, suspicious transaction behavior, route-health failures, rate-limit failures, replay/nullifier failures, and proof-boundary failures.
- Incidents discovered through local checks, provider dashboards, logs, user reports, reviewer reports, or public-chain monitoring.

It does not authorize live expansion, real-funds actions, legal/compliance decisions, disclosure commitments, or custody claims.

## Severity

- Sev 1: funds-at-risk, key exposure, signed-transaction misuse, proof/release path mutation that bypasses a fail-closed gate, or evidence that a live operator path can release funds without the required program/proof checks.
- Sev 2: service auth bypass, replay/nullifier drift, route-health drift, wallet signing summary bypass, secret-like material in logs or evidence, or provider outage affecting bounded beta actions.
- Sev 3: docs/status drift, stale evidence refs, non-secret telemetry drift, checker failure without live user impact, or missing reviewer-facing runbook refs.

When severity is unclear, treat it as the higher severity until evidence proves otherwise.

## Stop Or Suspend

1. Stop or suspend the affected bounded beta action.
2. Disable the affected operator route, queue, webhook, or scheduled drain path if it can mutate state or submit transactions.
3. Return readiness, approval, and claim surfaces to blocked posture if their assumptions no longer hold.
4. Do not widen scope while debugging. Restore the last known good no-new-action state first.

## No Secret Material In Incident Records

Incident records must use refs and redacted summaries only. Do not store credential values, wallet material, proof witnesses, note secrets, owner secrets, viewing-key plaintext, note blindings, signed transactions, customer data, provider tokens, bearer tokens, webhook secrets, or raw database URLs in docs, evidence JSON, chat, screenshots, GitHub, or tickets.

## Preserve Evidence

Preserve refs, not secrets:

- command output summaries and exit codes
- deployment ids, transaction signatures, receipt ids, incident ticket ids, and provider dashboard links
- redacted log ranges with request ids, service names, status codes, and timestamps
- config key names and secret-manager reference names
- reviewer notes that do not expose exploit payloads or credential values

Do not paste raw customer data, proof witnesses, note secrets, owner secrets, viewing-key plaintext, note blindings, signed transactions, private keys, seed phrases, bearer tokens, database URLs, webhook secrets, or provider tokens into incident records.

## Secret-Safe Debugging

- Check secret presence by name, boolean status, or masked provider UI only.
- Prefer commands that redact by default.
- Do not run diagnostics that print environment values.
- Do not pass credential values to agents, chat, GitHub issues, screenshots, or evidence JSON.
- If a secret may have been exposed, rotate or revoke first, then debug from sanitized refs.

## External Notification And Disclosure

External disclosure is a decision gate, not an automatic repo-local action.

Before any public, customer, merchant, exchange, provider, legal, or reviewer notification:

- identify the impacted service, time window, and data/funds-at-risk category
- confirm whether the issue is live, local-only, stale-evidence-only, or unverified
- confirm the notification owner and approved channel
- preserve an incident record ref
- keep public wording limited to verified facts and current limitations

## Recovery And Post-Incident Review

Recovery is complete only when:

- the affected service or path is stopped, fixed, or intentionally left blocked
- claim, readiness, approval, and evidence surfaces match the corrected state
- relevant refs are updated without storing secret values
- tests and checker commands pass or their failures are explicitly recorded
- a post-incident note records root cause, blast radius, prevention, owner, and follow-up commands

## Claim Gates Stay Locked

Incident handling does not unlock privacy, custody, audit, legal, launch, or live-settlement claims. The claim gates move only after the matching external refs, deployed evidence, and reviewer acceptance exist and the executable guards pass.

## External Refs Required Before Claim Movement

- external incident review ref
- legal/compliance notification decision ref, if applicable
- custody reviewer decision ref, if custody or key material was involved
- provider incident report ref, if provider infrastructure was involved
- post-incident verification command refs
- updated `ops/mainnet/production-incident-workflow.evidence.json` ref

## Verification Commands

```bash
npm run compliance:ops-publication-check
npm run mainnet:production-incident-workflow-evidence-check
npm run mainnet:external-gates-production-claim-check
npm run privacy-audit:tracker-check
```

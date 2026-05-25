# PPA-COMPLIANCE-002 - Threat, Incident, And Key-Custody Publication Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 8 - compliance + ops
- Recommended remediation order: 25
- Finding: Threat model published. Incident-response runbook published. Key-custody runbook published.
- Status: plan-open-approval-pending on 2026-05-25.

## Current Evidence

- `docs/threat-model.md` exists and was last validated against repo-local code on 2026-05-25.
- `docs/mainnet-deployment-runbook.md` has a `Monitoring And Incident Response` section.
- `docs/operator-runbook.md` references monitoring and incident-response expectations.
- `ops/mainnet/production-incident-workflow.evidence.json` exists as a refs-only incident workflow evidence surface.
- `ops/mainnet/production-key-custody.template.json` exists as a refs-only key-custody intake template.
- The audit specifically calls for `docs/key-custody-runbook.md`; that file is not present.
- A dedicated public incident-response runbook file is not present; incident response is currently embedded in broader deployment/operator docs.

## Planned Files After Approval

- `docs/threat-model.md`
- `docs/incident-response-runbook.md`
- `docs/key-custody-runbook.md`
- `docs/mainnet-deployment-runbook.md`
- `docs/operator-runbook.md`
- `docs/mainnet-external-gates.md`
- `SECURITY_LIMITATIONS.md`
- `ops/mainnet/production-incident-workflow.evidence.json`
- `ops/mainnet/production-key-custody.template.json`
- `scripts/check-vanta-band8-ops-publication.mjs`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`

## Planned New Script

- `npm run compliance:ops-publication-check`

## Planned Test Cases

- Fails if `docs/threat-model.md` is missing, stale, or loses current no-overclaim boundaries.
- Fails if `docs/incident-response-runbook.md` is missing or omits stop/suspend, preserve evidence, secret-safe debugging, disclosure, recovery, and post-incident review steps.
- Fails if `docs/key-custody-runbook.md` is missing or omits key roles, multisig/HSM/Turnkey custody refs, rotation, revocation, access audit, emergency freeze, break-glass controls, and no-secret handling.
- Fails if runbooks claim audit acceptance, production custody, live privacy, or launch readiness without matching refs.
- Fails if runbooks contain private keys, seed phrases, signed transaction material, bearer credentials, owner secrets, viewing key plaintext, or note blindings.
- Fails if `SECURITY_LIMITATIONS.md`, `docs/mainnet-external-gates.md`, and runbooks disagree on external refs required before claim-gate movement.

## Verification After Approval

- `npm run compliance:ops-publication-check`
- `npm run docs:source-of-truth-check`
- `npm run operator:runbook-check`
- `npm run security:limitations-check`
- `npm run mainnet:external-gates-production-claim-check`
- `npm run privacy-audit:tracker-check`
- `npm run truth:privacy-claim-gate`
- `npm run build`
- `git diff --check`

## Approval Gate

This plan requires Clay approval before adding or publishing the incident-response and key-custody runbook docs, wiring the new guard script, or changing public/docs source-of-truth surfaces.

## Truth Boundary

This tracker plan does not publish final incident-response or key-custody runbooks, prove legal/compliance/custody review, create production custody, satisfy audit acceptance, move claim gates, deploy services, or change launch status.

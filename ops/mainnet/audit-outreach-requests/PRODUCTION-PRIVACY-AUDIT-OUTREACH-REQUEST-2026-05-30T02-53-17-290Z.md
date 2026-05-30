# Production Privacy Audit Outreach Request

Status: draft outbound send-list
Production privacy claim: blocked
Audit claim: blocked
Band 7 item: 21 — contract two independent audit firms

## Repo Starting Point

- repo: https://github.com/williamclay8/Vanta.git
- branch: `main`
- reviewStartCommitRef: `git:05e6209914cfc5405f3caaa0b53e15690a798938`
- treeStatusAtCollection: `dirty`

## Human Work Order

- `ops/mainnet/audit-outreach-requests/production-privacy-audit-external-evidence-request.md`
- `ops/mainnet/production-privacy-audit-outreach.evidence.json`

Validate locally before sending:

```bash
npm run audit:outreach-prep-check
npm run audit:outreach-send-package-generate
npm run audit:package-check
```

## Required Reviewer Lanes

- **zk-specialist**: Vanta Private Core and Private Pool v2 proof lanes, public-input binding, nullifier/replay checks, Send/Swap output-commitment binding gaps before closure
- **solana-program-specialist**: Private Pool v2 spend program, cfg-test to runtime-flag migration, PDA vault transition, CPI verifier seam, native SOL TAG6 wiring

## Sha256-Pinned Outbound Files

- `PRODUCTION_PRIVACY_AUDIT.md` (scope-and-band7-roadmap) — sha256:faa986ad998ab893abf32c9b44428afc6228df28dc5a6a26e7ba5f5b95f22709
- `docs/audit-package.md` (reviewer-handoff) — sha256:bd5dfe969c0a72fb2ade455bcd69ee7bedad7bcc43cb144e892c2088444f4faf
- `ops/mainnet/audit-review.packet.template.json` (intake-template) — sha256:9cfe6582c94cde7e05b8ef87f178883a04b151b2002284882458ca410117eecd
- `ops/mainnet/mainnet-approval-gates.evidence.json` (gate-blocker-context) — sha256:0550d223b0671a2722276dad02f3cc9863ee12a13ee134ea5f909d3155d1d551
- `AUDIT_2026-05-19.md` (prior-findings-context) — sha256:3251048a8c8406f2f1e04ea87b9d58eaf5b1139af3e03358c77f1413194dec85
- `ops/mainnet/audit-outreach-requests/production-privacy-audit-external-evidence-request.md` (human-work-order) — sha256:566c29c78434e628feef22e61a4d0581ca4a6a34f126f29c12bd43c2ea7a0304
- `ops/mainnet/production-privacy-audit-outreach.evidence.json` (machine-readable-prep) — sha256:723a7aae1790aa7691e965a41291091a81a568e3ce32387b6f54dfeb375170a2

## Required Returned Refs (Refs-Only Intake)

Use `ops/mainnet/audit-review.packet.template.json` as the intake shape:

- `VANTA_AUDIT_REVIEWER_REF`
- `VANTA_AUDIT_SCOPE_REF`
- `VANTA_AUDIT_REPORT_REF`
- `VANTA_AUDIT_FINDINGS_DISPOSITION_REF`
- `VANTA_AUDIT_FIX_VERIFICATION_REF`
- `VANTA_AUDIT_FINAL_DECISION_REF`

## Separation From Other External Lanes

- C01 external production verifier artifact review is a separate lane.
- TAG6 native SOL live evidence collection is a separate post-deploy lane.

## Non-Claims

This package is not reviewer selection, not an audit report, not audit acceptance, not C01 closure, not TAG6 live evidence, and not fund-release approval.

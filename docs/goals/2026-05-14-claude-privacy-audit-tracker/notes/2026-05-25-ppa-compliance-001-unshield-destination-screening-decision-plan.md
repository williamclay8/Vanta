# PPA-COMPLIANCE-001 - Unshield Destination Screening Decision Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 8 - compliance + ops
- Recommended remediation order: 24
- Finding: OFAC sanctions screening on unshield destinations; decision is implement screening or accept jurisdiction limits.
- Status: blocked-on-compliance-decision on 2026-05-25.

## Current Truth

The audit calls sanctions screening on unshield destinations a launch blocker for any US-tied operator posture. The repo does not have an accepted legal/compliance decision proving whether Vanta should implement destination screening or accept jurisdiction limits.

This is not a purely technical choice. It affects product availability, user promises, public documentation, operations, and incident response.

## Decision Needed

Clay must choose one of two externally reviewable directions:

- Implement destination screening for unshield destinations.
- Accept documented jurisdiction limits and record what product, operator, and launch scope those limits impose.

Either path needs legal/compliance review before any launch-status or public-claim change.

## Required External Refs

- Legal/compliance decision ref naming the selected path.
- Jurisdiction/operator posture ref.
- If implementing screening: sanctioned-address data source/provider ref, update cadence ref, failure-mode policy ref, false-positive review process ref, retention/logging policy ref, and reviewer acceptance ref.
- If accepting jurisdiction limits: documented jurisdiction exclusion/refusal policy ref, user-facing scope ref, operator runbook ref, and reviewer acceptance ref.
- Public-copy/status-surface review ref if any user-facing limitation wording changes.

## Planned Files

- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-compliance-001-unshield-destination-screening-decision-plan.md`

No screening code or public-copy change is planned for this tracker slice.

## Planned Acceptance Checks After Direction Approval

- Missing legal/compliance decision ref fails.
- Missing jurisdiction/operator posture ref fails.
- If screening is selected, missing provider/source refs, update cadence, fail-closed behavior, false-positive process, retention/logging policy, or reviewer acceptance fails.
- If jurisdiction limits are selected, missing exclusion/refusal policy, public scope wording, operator runbook, or reviewer acceptance fails.
- Evidence packets with raw private data, owner secrets, viewing key plaintext, note blindings, private keys, or credential-bearing URLs fail.
- Truth gates remain locked unless all prior audit, verifier, SBF/live, bounty, anonymity, and compliance refs exist.

## Blocker Before Implementation

This item is blocked on Clay/legal/compliance direction. Implementing a sanctions-screening path, choosing a provider, storing screening results, changing user-facing scope, or accepting jurisdiction limits all need explicit approval before code or public-copy edits.

## Verification For This Tracker Slice

- `npm run privacy-audit:tracker-check`
- `git diff --check`

## Truth Boundary

This is a tracker-only decision plan. It does not implement sanctions screening, select a provider, create legal approval, change user-facing jurisdiction scope, move a claim gate, deploy services, or change launch status.

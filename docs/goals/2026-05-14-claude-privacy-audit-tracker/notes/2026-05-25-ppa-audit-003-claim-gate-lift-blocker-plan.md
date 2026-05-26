# PPA-AUDIT-003 - Claim Gate Lift Blocker Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 7 - audit + launch
- Recommended remediation order: 23
- Finding: Lift the privacy-claim gate only after audits and anonymity-set threshold evidence.
- Status: blocked-external-plan-open on 2026-05-25.

## Current Truth

The claim gates must remain locked. Current repo/local evidence does not include accepted independent audit refs, complete verifier evidence closure, SBF/live lineage, deployed verifier program id/hash, tag-5 verifier-key binding, live proof-enforced receipt, reviewer acceptance, or live anonymity-set evidence at the required threshold.

The live anonymity-set probe has historically reported `currentDistinctCommitments=2` against `minimumDistinctCommitments=1024`. The gate must not move from local tracker/docs work.

## Required External Refs

- Accepted ZK audit refs and accepted Solana program audit refs.
- Bug bounty live refs from `PPA-AUDIT-002`.
- Complete C01 verifier evidence closure refs: reviewed production artifact bundle, verifier adapter/program acceptance, SBF/live lineage, deployed verifier program id/hash, verifier program upgrade-authority status, tag-5 verifier-key binding, proof-enforced tag-3 receipt or reviewer-accepted dry-run, and audit/reviewer acceptance.
- Live anonymity-set evidence proving the active cohort meets or exceeds 1024 distinct commitments with fresh measurement metadata.
- Claim-gate reviewer signoff tying the exact public copy, manifest booleans, operator status, and readiness surfaces to the accepted evidence refs.
- Public manifest re-attestation ref if any public claim flag changes.

## Planned Files

- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-audit-003-claim-gate-lift-blocker-plan.md`

No claim-gate code change is planned for this tracker slice.

## Existing Guards To Keep Locked

- `npm run truth:privacy-claim-gate`
- `npm run private-pool-v2:live-anonymity-set-probe-check`
- `npm run zk:c01-positive-proof-verified-claim-gate-check`
- `npm run zk:c01-verifier-evidence-closure-gate-check`

## Planned Acceptance Checks After Future Approval

- Claim-gate lift fails if either independent audit lane is missing.
- Claim-gate lift fails if bug bounty live refs are missing.
- Claim-gate lift fails if C01 verifier evidence closure is incomplete.
- Claim-gate lift fails if live distinct commitments are below 1024, stale, unreviewed, or not scoped to the active cohort.
- Claim-gate lift fails if public manifest, status surfaces, and user-facing copy drift from the accepted evidence refs.
- Claim-gate lift fails if any required evidence packet contains raw proof, witness, private key, signed transaction material, credential-bearing URL, owner secret, viewing key plaintext, or note blinding.

## Blocker Before Completion

This item cannot complete until independent audit acceptance, bug bounty live evidence, verifier/SBF/live lineage, and live anonymity-set threshold evidence all exist and are reviewed. Any claim-gate change requires explicit Clay approval after those refs exist.

## Verification For This Tracker Slice

- `npm run privacy-audit:tracker-check`
- `npm run truth:privacy-claim-gate`
- `git diff --check`

## Truth Boundary

This is a tracker-only blocker plan. It does not lift any claim gate, re-attest the public manifest, change public copy, accept audit evidence, accept verifier evidence, create live anonymity evidence, deploy programs, or change launch status.

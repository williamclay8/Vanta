# PPA-AUDIT-002 - Bug Bounty Launch Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 7 - audit + launch
- Recommended remediation order: 22
- Finding: Bug bounty live from launch.
- Status: blocked-external-plan-open on 2026-05-25.

## Current Truth

The repo has no accepted external refs proving a bug bounty is live, funded, scoped, triaged, or legally approved.

Band 7 item 22 depends on external program facts: platform or hosted intake, scope, rules, payout budget, safe harbor, triage ownership, disclosure policy, severity matrix, and public launch URL. A repo-local plan can define the evidence contract, but it cannot make the bounty live.

## Required External Refs

- Bug bounty platform or public intake URL ref.
- Scope ref covering Vanta web/app, operator services, Private Pool v2 programs, verifier/adaptor evidence, proof lanes, custody/release paths, relayer/indexer/prover/verifier services, and relevant infrastructure.
- Out-of-scope/refusal policy ref for spam, social engineering, physical attacks, denial-of-service, public data scraping, and duplicate reports.
- Safe-harbor/legal approval ref.
- Payout budget and severity matrix ref.
- Triage owner/on-call/SLA ref.
- Report handling, disclosure, duplicate, embargo, and fix-verification policy refs.
- Launch timing ref proving the bounty is live no later than the launch event it is meant to cover.
- Reviewer acceptance ref that the bounty scope matches the audit blockers and does not imply audit acceptance by itself.

## Planned Files

- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-audit-002-bug-bounty-launch-plan.md`

After Clay approves a follow-up implementation slice, add a refs-only bug bounty evidence gate under `ops/mainnet/` and `scripts/`.

## Planned Acceptance Checks After Follow-Up Approval

- Missing platform/public intake URL fails.
- Missing scope fails.
- Scope that excludes ZK/proof, Solana program, custody/release, relayer/indexer/prover/verifier, or web/app surfaces fails.
- Missing safe-harbor/legal approval fails.
- Missing payout budget or severity matrix fails.
- Missing triage owner/SLA fails.
- Missing disclosure and duplicate-report policy fails.
- Launch timing after the covered launch event fails.
- Reviewer acceptance missing or generic fails.
- Secret-bearing packet markers fail.
- Truth gates remain fail-closed until independent audit refs, bounty live refs, verifier evidence, SBF/live lineage, and live anonymity evidence all exist.

## Blocker Before Completion

Clay must approve the bounty provider/intake path, budget, legal/safe-harbor posture, triage owners, scope, and public launch timing. If a third-party platform is used, provider-side setup and public URL evidence are external facts.

This repo can prepare request packets and fail-closed intake gates. It cannot create the external bounty launch facts.

## Verification For This Tracker Slice

- `npm run privacy-audit:tracker-check`
- `git diff --check`

## Truth Boundary

This is a tracker-only plan. It does not open a live bounty, allocate payout budget, create a safe-harbor policy, publish a public intake URL, accept reports, move a claim gate, deploy programs, or change launch status.

# PPA-ANON-002 - Public Beta Anonymity Threshold Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 4 - anonymity set bootstrap
- Recommended remediation order: 15
- Item: public beta gated on the anonymity-set probe staying `>= 1024`

## Status

`blocked-on-ppa-anon-001-and-live-threshold-evidence`

The live probe exists and must remain fail-closed while the public manifest reports depth below threshold. Current tracker evidence records `currentDistinctCommitments = 2` and `minimumDistinctCommitments = 1024`.

## Planned Files After Unblock

- `public/.well-known/vanta-audit.json`
- `scripts/check-vanta-live-anonymity-set-probe.mjs`
- `scripts/check-vanta-privacy-claim-gate.mjs`
- `src/readiness/mainnetPrivateSettlementStatus.mjs`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`

## Planned Fixtures After Unblock

- Probe rejects depth below `1024`.
- Probe rejects stale threshold evidence, missing measurement window, non-public manifest refs, or `anonymityClaimAllowed=true` without matching verifier/custody/audit refs.
- Truth gate rejects public beta readiness if any Band 1-4 dependency is missing.

## Verification Plan

- `npm run private-pool-v2:live-anonymity-set-probe-check`
- `npm run truth:privacy-claim-gate`
- `npm run privacy-audit:tracker-check`

## Blockers

- PPA-ANON-001 closed-alpha fixed-cohort depth is not live.
- Live distinct commitment count remains below `1024`.
- Bands 1-3 accepted production evidence remains absent.

## Truth Boundary

This entry does not mark public beta ready, does not lift anonymity claims, and does not alter the live manifest. It only records the Band 4 item 15 blocker chain.

## Lumi

- Local: tracker-only blocked entry added and verified locally.
- Committed: latest branch head after this tracker-only slice; use `git log` for the exact commit.
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` after this tracker-only slice; use `git status` for sync.
- Deployed/live: not deployed/live.

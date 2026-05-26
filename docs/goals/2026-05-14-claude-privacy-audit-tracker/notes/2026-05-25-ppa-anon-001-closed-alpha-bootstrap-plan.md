# PPA-ANON-001 - Closed Alpha Anonymity Bootstrap Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 4 - anonymity set bootstrap
- Recommended remediation order: 14
- Item: closed alpha with operator-bonded shield deposits in one fixed-denomination cohort until `currentDistinctCommitments >= 1024`

## Status

`blocked-on-band-1-3-external-acceptance`

Band 4 is gated on Bands 1-3 having externally accepted production evidence. That evidence is not present: production artifact bundle acceptance, verifier adapter/program acceptance, deployed verifier program id/hash, verifier-key binding, SBF/live lineage, proof-enforced receipts, and reviewer acceptance are still missing.

## Planned Files After Unblock

- `ops/mainnet/closed-alpha-anonymity-bootstrap.evidence.json`
- `scripts/check-vanta-private-pool-v2-anonymity-set-readiness.mjs`
- `scripts/check-vanta-live-anonymity-set-probe.mjs`
- `public/.well-known/vanta-audit.json`
- `src/readiness/mainnetPrivateSettlementStatus.mjs`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`

## Planned Fixtures After Unblock

- Refs-only closed-alpha cohort packet rejects missing verifier/artifact/SBF-live/audit refs.
- Fixed-denomination cohort packet rejects mixed denomination, mixed asset, unbonded operator deposits, and non-program-owned custody deposits.
- Live probe evidence rejects `currentDistinctCommitments < 1024` or non-fail-closed claim flags.

## Verification Plan

- `npm run private-pool-v2:anonymity-set-readiness-check`
- `npm run private-pool-v2:live-anonymity-set-probe-check`
- `npm run private-pool-v2:production-privacy-reviewer-packet-check`
- `npm run truth:privacy-claim-gate`
- `npm run privacy-audit:tracker-check`

## Blockers

- Externally accepted Band 1-3 production evidence is absent.
- No deployed verifier program id/hash, tag-5 verifier-key binding, SBF/live lineage, proof-enforced tag-3 receipt, or reviewer acceptance refs exist.
- No approval exists to perform live/operator-bonded shield deposits or any real-funds/mainnet action.

## Truth Boundary

This entry does not start a closed alpha, generate deposits, prove anonymity, lift claims, or create production-private readiness. It only records that Band 4 item 14 is blocked until verifier/custody/live/audit evidence exists.

## Lumi

- Local: tracker-only blocked entry added and verified locally.
- Committed: latest branch head after this tracker-only slice; use `git log` for the exact commit.
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` after this tracker-only slice; use `git status` for sync.
- Deployed/live: not deployed/live.

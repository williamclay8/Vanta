# R11A Live Anonymity-Set Probe - 2026-05-14

## Status

Local implemented, live-read verified.

## What This Closes

This closes the local/live-read guard part of R11A from the Claude privacy audit: Vanta now has a command that probes the public live audit discovery manifest and fails closed if the live manifest allows anonymity/privacy claims while commitment depth is below the published threshold.

## Files

- `scripts/check-vanta-live-anonymity-set-probe.mjs`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-14-completion-audit.md`

## Live Evidence

On 2026-05-14, `npm run private-pool-v2:live-anonymity-set-probe-check` fetched `https://vantaprivacy.xyz/.well-known/vanta-audit.json` and observed:

- `currentDistinctCommitments: 2`
- `minimumDistinctCommitments: 1024`
- `depthBelowThreshold: true`

The live manifest kept `anonymityClaimAllowed`, `privacyClaimAllowed`, `productionReady`, and `mainnetReady` false.

## Verification

- `npm run private-pool-v2:live-anonymity-set-probe-check`

## Truth Boundary

This is a live read-only probe and fail-closed claim guard. It is not anonymity-set growth, not an independent measurement review, not a production privacy claim, not live mainnet private settlement, and not deploy evidence for local commits.

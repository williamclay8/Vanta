# R13A Live Meta-Description Scrape - 2026-05-14

## Status

Local implemented, live-read verified.

## What This Closes

This closes the local/live-read guard part of R13A from the Claude privacy audit: Vanta now has a command that scrapes the live crawler-visible meta description and fails if it regresses to the old unqualified privacy wording.

## Files

- `scripts/check-vanta-live-meta-description.mjs`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-14-completion-audit.md`

## Live Evidence

On 2026-05-14, `npm run public:live-meta-description-check` fetched `https://vantaprivacy.xyz` and observed:

`Vanta is alpha-stage zk research toward a Solana privacy layer. Not audited. Production privacy is not enabled; live anonymity set blocked. See /.well-known/vanta-audit.json.`

The guard rejects the old unqualified `zk-powered privacy layer`, `built for private send`, `private swap`, and `private payment flows` crawler copy.

## Verification

- `npm run public:live-meta-description-check`

## Truth Boundary

This is a read-only live crawler-copy probe. By itself it is not deployment evidence for a commit; the separate live website deployment receipt now proves website/audit-copy deploy for commit `7635c9b`. It is not production privacy, not an audit claim, not a live anonymity claim, and not private-settlement/SBF/proof-verifier evidence.

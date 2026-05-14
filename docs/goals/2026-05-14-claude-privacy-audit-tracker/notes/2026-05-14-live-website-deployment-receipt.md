# 2026-05-14 Live Website Deployment Receipt

## Scope

This note records the website deployment receipt for the Claude privacy-audit hardening branch. It updates Lumi state only; it does not promote any privacy, SBF, verifier, custody, anonymity, or real-funds readiness claim.

## Evidence

- Commit: `7635c9b641a505379b82e74a6679986dbabc55fe` (`Add TAG_UNSHIELD verifier key preflight`).
- Git: `origin/codex/vanta-zk-review-hardening` and `origin/main` both point to `7635c9b641a505379b82e74a6679986dbabc55fe`.
- GitHub Actions: `Vanta Privacy Audit Gates` passed on `main` run `25888198149` and on `codex/vanta-zk-review-hardening` run `25888193053`.
- Render workspace: `William's workspace` (`tea-d7j37af7f7vs739ii8rg`).
- Render service: `srv-d7j3ggqqqhas739for80` / `Vanta`.
- Render deploy: `dep-d834ce4vikkc73fb2ep0`, status `live`, commit `7635c9b641a505379b82e74a6679986dbabc55fe`, finished `2026-05-14T22:04:22.74556Z`.
- Public URL: `https://vantaprivacy.xyz` returned HTTP 200 and served live main asset `assets/index-C5gkBpDx.js` with HTTP 200.
- Live meta check: `node scripts/check-vanta-live-meta-description.mjs` passed with the alpha/not-audited/production-privacy-disabled description.
- Live anonymity check: `node scripts/check-vanta-live-anonymity-set-probe.mjs` passed with `currentDistinctCommitments: 2`, `minimumDistinctCommitments: 1024`, and `depthBelowThreshold: true`.

## Truth Boundary

This is website deployment proof for audit/copy/status surfaces. It is not live spend-program SBF evidence, not on-chain proof verification, not proof-verified Unshield release, not program-owned custody, not production privacy, not anonymity, not audit acceptance, and not real-funds readiness.

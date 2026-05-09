# Vanta Docs Source Of Truth

Decision date: 2026-05-09.

Markdown docs are the canonical source of truth for security, privacy-model, operator, audit, and readiness claims:

- `SECURITY_LIMITATIONS.md`
- `docs/privacy-model.md`
- `docs/privacy-rail-contract.md`
- `docs/operator-runbook.md`
- `docs/audit-package.md`
- `LANE_STATUS.md`

The in-app `/docs` pages may summarize these documents for users, but they must stay conservative and point back to the checked command or markdown surface when a claim depends on production readiness, privacy guarantees, proof status, or operator evidence. If copy diverges, prefer the markdown plus executable check until the in-app docs are regenerated or manually reconciled.

Current implementation choice: keep markdown as canonical and use executable checks (`security:limitations-check`, `truth:privacy-claim-gate`, `privacy-rail:contract-check`, `operator:runbook-check`, and the lane/source checks) to catch drift before a release.

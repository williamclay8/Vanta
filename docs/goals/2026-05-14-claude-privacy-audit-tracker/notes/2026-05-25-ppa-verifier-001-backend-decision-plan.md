# PPA-VERIFIER-001 - Verifier Backend Decision Evidence

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 3 - verifier + ceremony
- Recommended remediation order: 11
- Finding: Pick Groth16 vs UltraHonk-on-Solana once and for all, then document the decision.
- Status: accepted-noop/evidence-local after Clay plan approval on 2026-05-25.

## Accepted Evidence

The current repo already records `groth16-tag3-solana-v0` as the selected backend direction in:

- `docs/zk/c01-production-verifier-backend-decision.md`
- `ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json`
- `ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json`

This is an evidence-only / accepted-noop closure for Band 3 item 11, not a code implementation item. The decision does not satisfy production proof-format, production verifying-key, verifier-adapter, SBF/live lineage, or audit evidence.

## Files

- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-verifier-001-backend-decision-plan.md`
- `docs/zk/c01-production-verifier-backend-decision.md`
- `ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json`
- `ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json`
- `package.json`

Only the tracker state and this note changed for this item. The decision docs/evidence packets/package scripts above are existing evidence surfaces and were not edited as part of this accepted-noop update.

## Fixtures

None for this item. Band 3 item 11 is a backend-selection documentation/evidence item. Production proof-format, ceremony, verifying-key, verifier-adapter, and mutation/no-mutation fixtures belong to later Band 3 items 12 and 13.

## Scripts

No new npm script if the existing C01 guards prove the decision packet. Use:

- `npm run zk:c01-verifier-backend-decision-check`
- `npm run zk:c01-verifier-backend-options-check`
- `npm run zk:c01-production-groth16-toolchain-preflight-check`
- `npm run zk:c01-sunspot-groth16-route-check`
- `npm run zk:c01-production-verifier-backend-candidate-check`
- `npm run truth:privacy-claim-gate`
- `npm run privacy-audit:tracker-check`

## Verification Cases

- Decision guard proves `selectedBackend = groth16-tag3-solana-v0`.
- Options guard proves `noir-bb-ultrahonk-adaptation` remains not selected for the current tag 3 contract.
- Toolchain and route guards prove local UltraHonk evidence is not promoted into production Groth16 proof-format or verifying-key evidence.
- Truth gate proves `privacyClaimsAllowed=false` remains fail-closed.
- Tracker guard proves Band 3 item 11 is recorded without closing production verifier readiness.

## Verification Evidence

- `npm run zk:c01-verifier-backend-decision-check`: PASS.
- `npm run zk:c01-verifier-backend-options-check`: PASS.
- `npm run zk:c01-production-groth16-toolchain-preflight-check`: PASS.
- `npm run zk:c01-sunspot-groth16-route-check`: PASS.
- `npm run zk:c01-production-verifier-backend-candidate-check`: PASS.
- `npm run truth:privacy-claim-gate`: PASS; `privacyClaimsAllowed=false` remains fail-closed.
- `npm run privacy-audit:tracker-check`: PASS.
- `git diff --check`: PASS.

## Approval Gate

Plan opened and approved by Clay on 2026-05-25. After approval, the tracker was updated to accepted-noop/evidence-local without editing custody, release, verifier, program, proof, or operator runtime surfaces.

## Truth Boundary

This item records backend direction only. It does not create a production proof artifact, production verifying-key hash, ceremony output, verifier program, verifier-adapter acceptance, tag 3 proof acceptance, SBF/live lineage, audit acceptance, or production-private readiness.

## Lumi

- Local: accepted-noop/evidence-local tracker status recorded locally only.
- Committed: not committed.
- Pushed: not pushed.
- Deployed/live: not deployed or live verified.

# C01 and H08 Promotability Map (2026-05-20)

## Objective

Figure out how `VANTA-ZK-2026-05-09-C01` and `VANTA-ZK-2026-05-09-H08` can become promotable without weakening Vanta's fail-closed privacy truth.

## Current Result

C01 and H08 are not promotable today. They are intentionally `partial` in `VANTA_ZK_REVIEW.findings.json`, and `npm run zk:review-findings-ledger-check` reports:

- findings: 13
- live verified findings: 0
- accepted closed findings: 0

This is correct. The ledger's live count only increases when a finding status is exactly `live-verified`, and the checker rejects promoted findings whose promotion evidence still contains local-only or not-live wording.

## Promotion Principle

Do not promote C01 or H08 by editing status text first. Promote only after the implementation, live evidence, and audit/reviewer evidence exist.

The safe order is:

1. Land positive production evidence.
2. Verify valid-success and invalid-no-mutation behavior.
3. Deploy or otherwise produce live lineage evidence.
4. Obtain audit/reviewer acceptance for the boundary.
5. Patch the ledger to `live-verified` with exact commit, push, live/deploy, and verification refs.

## Why C01 Comes First

H08 depends on a production-compatible C01 verifier boundary. A production prover that emits proof artifacts still cannot be promoted if the Solana verifier path, proof format, verifying-key evidence, adapter tests, SBF/live lineage, and audit acceptance are absent.

## Canonical Board

Machine state lives at:

`docs/goals/2026-05-20-c01-h08-promotability/state.yaml`

Detailed promotion map lives at:

`docs/goals/2026-05-20-c01-h08-promotability/notes/promotability-map.md`

If this charter and `state.yaml` disagree, `state.yaml` wins.

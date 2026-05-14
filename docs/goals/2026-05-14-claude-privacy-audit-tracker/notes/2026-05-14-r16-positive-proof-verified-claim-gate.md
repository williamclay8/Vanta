# R16 Positive Proof-Verified Claim Gate - 2026-05-14

## Status

Local implemented, fail-closed; blocked on tag-3 valid-proof success.

R16 now has a dedicated positive claim gate instead of relying only on the C01 negative boundary checks. The gate keeps proof-verified spend wording locked unless the repo has explicit evidence that tag `3` accepts a real proof and that the matching invalid-proof, wrong-public-input, and wrong-verifying-key paths leave account state unchanged.

## What Changed

- Added `ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json` as a blocked refs/status packet.
- Added `npm run zk:c01-positive-proof-verified-claim-gate-check`.
- Wired the gate into `truth:privacy-claim-gate`, `zk:review-guards-check`, and `zk:feedback-loop-check`.
- Updated the C01 verifier-backend decision doc, audit package, and review handoff to name the gate.

## Verification

- Red-first: `npm run zk:c01-positive-proof-verified-claim-gate-check` failed before the blocked evidence packet existed.
- `npm run zk:c01-positive-proof-verified-claim-gate-check`

## Truth Boundary

This is a local fail-closed claim gate only. It is not tag-3 valid-proof success evidence, not proof-verified spend evidence, not verifier-adapter acceptance, not production verifying-key evidence, not SBF/live lineage, not audit acceptance, not production privacy, and not deployed/live evidence for the current branch.

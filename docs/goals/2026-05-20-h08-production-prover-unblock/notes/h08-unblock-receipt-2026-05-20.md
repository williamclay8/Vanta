# H08 Unblock Receipt - 2026-05-20

## Result

H08 now has a selected local runtime direction: `remote-service-production-prover`.

This is deliberately not a production runtime acceptance. The guarded truth remains:

- `selectedProverRuntime: null`
- `productionReady: false`
- `mainnetReady: false`
- C01 compatibility still blocked on production verifier backend/proof format/VK/adapter/live-lineage/audit evidence
- deployed prover health, artifact-store refs, job-log refs, valid proof roundtrip, and invalid proof rejection are still absent

## Added Evidence

- `ops/mainnet/private-pool-v2-h08-remote-service-production-prover-contract.evidence.json`
- `scripts/check-vanta-private-pool-v2-h08-remote-service-prover-contract.mjs`

The new packet defines the remote-service production prover contract shape for Shield, Claim, Swap-to-shielded, Send, and actual-private-spend, including required refs and public-input labels, while keeping all production/mainnet/privacy readiness booleans false.

## Verification

Passed locally:

- `npm run zk:h08-remote-service-prover-contract-check`
- `npm run zk:h08-production-prover-runtime-options-check`
- `npm run zk:h08-production-prover-candidate-check`
- `npm run zk:c01-verifier-backend-decision-check`
- `npm run zk:c01-verifier-backend-options-check`
- `npm run zk:c01-production-verifier-backend-candidate-check`
- `npm run privacy-audit:tracker-check`
- `npm run security:limitations-check`
- `npm run zk:review-findings-ledger-check`
- `npm run private-pool-v2:browser-worker-prover-check`
- `npm run private-pool-v2:browser-worker-proof-result-adapter-check`
- `npm run private-pool-v2:proof-backend-boundary-check`
- `npm run zk:review-guards-check`
- `npm run zk:feedback-loop-check`
- `npm run build`
- `git diff --check`

The Nargo-backed checks require local cache access outside the Codex sandbox. Sandboxed attempts fail at Nargo's git dependency cache lock before exercising repo logic.

## Harness Note

While rerunning the aggregate proof-backend gate, the browser-worker proof-result adapter assertions passed but cleanup failed with `ENOTEMPTY` on its temp directory. The harness now uses Node `rmSync` retry options for that temp cleanup. The focused adapter check and aggregate proof-backend boundary check both pass after the harness fix.

## Lumi

Repo changes are local only. They are not committed, not pushed, and not deployed/live. The working tree remains broadly dirty from pre-existing audit/Grok/Claude changes plus this H08 slice.

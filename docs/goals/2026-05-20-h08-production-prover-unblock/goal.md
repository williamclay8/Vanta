# H08 Production Prover Unblock Path (2026-05-20)

## Objective

Follow the recommended H08 unblock path by formalizing the production prover runtime direction, creating the next truthful production prover contract/evidence surfaces, preserving C01/proof-format/deployment/audit blockers, and verifying the result with canonical H08/C01 commands.

## Constraints

- Do not deploy, spend funds, touch provider secrets, create production infrastructure, or claim production/mainnet/private readiness.
- Preserve the dirty tree; do not revert or discard existing Claude/Grok/Codex changes.
- Keep browser-worker and local bb evidence dev/local unless a new reviewed production runtime contract says otherwise.
- Treat C01 verifier backend/proof-format compatibility as a hard dependency for any H08 promotion.
- Keep all evidence packets secret-free: references and metadata only, no proof bytes, witness values, service secrets, private keys, or signed transactions.

## Oracle

The tranche is complete when local evidence names the selected H08 runtime direction and next production contract shape, canonical H08/C01 checks pass, and remaining blockers are explicit enough that the next implementation slice is unambiguous without weakening truth boundaries.

## Canonical Board

Machine truth lives at:

`docs/goals/2026-05-20-h08-production-prover-unblock/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins.

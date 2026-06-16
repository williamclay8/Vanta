# vanta_clean_provenance_disclosure

Privacy-Pools-brief-inspired clean-provenance selective disclosure circuit for Vanta Phase 2.

The circuit sketches how institutional/RWA counterparties could verify a clean-provenance predicate without receiving account graph, raw wallet history, identity, or witness data.

## Predicate

Private witness:

- `provenance_score`
- `risk_bucket`
- `account_graph_secret`
- `pool_membership_secret`
- `provenance_blinding`

Public inputs:

- `min_provenance_score`
- `max_risk_bucket`
- `policy_hash`
- `verifier_id`
- `disclosure_purpose_hash`
- `provenance_commitment`
- `membership_nullifier`
- `expiry_slot`
- `current_slot_floor`

The circuit binds:

- `provenance_score >= min_provenance_score`
- `risk_bucket <= max_risk_bucket`
- `expiry_slot >= current_slot_floor`
- provenance commitment to score, risk bucket, account graph secret, and blinding
- membership nullifier to pool membership secret, policy hash, and purpose hash

## Claim Boundary

This is not Privacy Pools integration, not sanction screening, not clean-funds certification, not legal/compliance approval, not regulator acceptance, and not production institutional readiness.

## Verification

```bash
nargo test
node scripts/check-twitter-pass-2026-06-16-research-artifacts.mjs
```

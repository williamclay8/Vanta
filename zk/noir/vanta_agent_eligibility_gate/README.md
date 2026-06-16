# vanta_agent_eligibility_gate

Medusa/xona-agent-brief-inspired local eligibility gate for Vanta Phase 2.

The circuit sketches a one-proof eligibility header shape: the app can prove a user or agent satisfies a policy while keeping wallet-history, score inputs, and policy secrets local.

## Predicate

Private witness:

- `reputation_score`
- `account_age_bucket`
- `tx_count_bucket`
- `risk_flag`
- `passport_secret`
- `policy_secret`

Public inputs:

- `policy_id`
- `policy_hash`
- `verifier_id`
- `min_reputation_score`
- `min_account_age_bucket`
- `min_tx_count_bucket`
- `agent_id_commitment`
- `eligibility_commitment`
- `eligibility_nullifier`
- `settlement_policy_hash`

The circuit binds:

- reputation score, account age bucket, and tx-count bucket above public thresholds
- `risk_flag == 0`
- nonzero policy, verifier, and settlement policy hashes
- eligibility commitment to private policy/passport inputs
- nullifier to passport secret, policy id, and settlement policy hash

## Claim Boundary

This is not live x402 support, not a Xona integration, not a Medusa integration, not live USDC settlement, not wallet authorization, not signing, and not production agent privacy.

## Verification

```bash
nargo test
node scripts/check-twitter-pass-2026-06-16-research-artifacts.mjs
```

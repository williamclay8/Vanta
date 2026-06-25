# vanta_private_credit_note_transfer

DarkDrop-inspired credit-note / dead-drop circuit for Vanta Phase 2.

This circuit proves a private deposit can be converted into a credit-note transfer primitive without disclosing the exact amount or claim secret in the public proof request.

## Predicate

Private witness:

- `amount`
- `deposit_secret`
- `claim_secret`
- `deposit_blinding`
- `credit_blinding`

Public inputs:

- `amount_bucket_min`
- `amount_bucket_max`
- `asset_id`
- `recipient_commitment`
- `withdraw_context`
- `deposit_commitment`
- `claim_code_commitment`
- `credit_note_commitment`
- `nullifier`

The circuit binds:

- `hash_deposit_commitment(asset_id, amount, deposit_secret, deposit_blinding)`
- `hash_claim_code_commitment(claim_secret, recipient_commitment)`
- `hash_credit_note_commitment(asset_id, amount, claim_code_commitment, credit_blinding)`
- `hash_withdraw_nullifier(deposit_secret, claim_secret, withdraw_context)`
- `amount_bucket_min <= amount <= amount_bucket_max`

## Claim Boundary

This is not a production private transfer claim. It does not move SOL or USDC, does not perform direct lamport manipulation, does not prove trusted setup/audit status, and does not imply mainnet readiness.

## Verification

```bash
npm run zk:credit-note-transfer-circuit-check
npm run credit-note-transfer-primitive-check
```

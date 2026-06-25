# vanta_unlinkable_transfer_plus

Voidral-brief-inspired anonymity-pool / unlinkable-wallet starter circuit for Vanta Phase 2.

This circuit extends the existing `vanta_private_credit_note_transfer` idea with explicit anonymity-root, relayer-context, spend-context, and nullifier bindings.

## Predicate

Private witness:

- `amount`
- `sender_note_secret`
- `recipient_secret`
- `recipient_blinding`
- `note_blinding`
- `transfer_blinding`

Public inputs:

- `amount_bucket_min`
- `amount_bucket_max`
- `asset_id`
- `anonymity_root`
- `relayer_context`
- `spend_context`
- `recipient_commitment`
- `deposit_commitment`
- `transfer_commitment`
- `nullifier`

The circuit binds:

- `amount_bucket_min <= amount <= amount_bucket_max`
- `hash_deposit_commitment(asset_id, amount, sender_note_secret, note_blinding)`
- `hash_recipient_commitment(recipient_secret, recipient_blinding)`
- `hash_transfer_commitment(deposit_commitment, recipient_commitment, relayer_context, transfer_blinding)`
- `hash_unlinkable_nullifier(sender_note_secret, spend_context, anonymity_root)`

## Claim Boundary

This is not a production private transfer claim. It does not create a live anonymity pool, hide relayer metadata, move SOL/USDC, prove MEV resistance, verify on-chain, or establish mainnet readiness.

## Verification

```bash
nargo test
node scripts/check-twitter-pass-2026-06-16-research-artifacts.mjs
```

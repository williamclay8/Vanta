# 2026-05-14 N2 Design Blockers

## Purpose

This note records the two protocol decisions that originally prevented the Claude privacy audit tracker from treating N2 as locally complete.

N2 is now locally implemented across the tracked circuit lanes, but this note remains useful because it explains the approval path and the truth boundary: local N2 closure is not production privacy, not an on-chain verifier, and not in-circuit X25519 ownership.

## N2-PPV2-SWAP-INPUT-PREIMAGE

Status: `local-implemented`

Decision: Clay approved this path on 2026-05-14.

Closure evidence:

- `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr` binds `owner_commitment = poseidon1([owner_secret])`.
- The same circuit now recomputes `input_commitment = poseidon5(owner_commitment, input_asset_id_commitment, input_amount, input_blinding, input_derivation_tag)`.
- `settlement_commitment`, `route_commitment`, and `economics_commitment` remain separate opaque swap commitments.
- `scripts/check-vanta-private-pool-v2-swap-to-shielded-circuit.mjs` includes `invalid-input-commitment-preimage`.

Implemented decision:

- Use the PPv2 Send/Claim-style consumed-note preimage for Swap-to-shielded input ownership and leave route/settlement/economics commitments separate.

Completion evidence:

- The circuit recomputes `input_commitment` from the chosen preimage.
- The `invalid-input-commitment-preimage` fixture fails.
- Prover/browser/operator witness paths carry the new fields without leaking witness material.
- The focused swap-to-shielded proof/request/browser/operator checks passed locally.

## N2-PRIVATE-CORE-SENDER-AUTH

Status: `local-implemented`

Decision: Clay approved this path on 2026-05-14.

Closure evidence:

- `zk/noir/vanta_private_core_single_note_send/src/main.nr` derives `sender_proving_owner_key_lo = poseidon2([sender_secret_key_hi, sender_secret_key_lo])`.
- `zk/noir/vanta_private_core_single_note_swap/src/main.nr` derives the same proof-owner key relation.
- Both circuits assert `sender_proving_owner_key_hi == 0` and bind the consumed-note commitment/nullifier to the proof-owner key.
- `src/zk/vantaPrivateCoreSendProof.ts` and `src/zk/vantaPrivateCoreSwapProof.ts` preserve `ownerAuthorizationMode = x25519-secret-prechecked-off-circuit` and add `provingOwnerKeyMode = poseidon-proof-owner-key-v0`.
- The current note commitment no longer treats `sender_secret_key` as a nonzero liveness witness.

Implemented decision:

- Private Core keeps X25519 source-layer compatibility and adds a separate Poseidon proof-owner key for the Noir proving lane.

Completion evidence:

- The selected key model is documented in the tracker and proof metadata.
- Send and Swap circuits enforce the chosen in-circuit proof-owner relation.
- `invalid-owner-auth` fixtures fail for both Send and Swap; invalid-owner-auth fixtures remain a required guard before any future N2 closure edit.
- `npm run private-core:send-check` and `npm run private-core:swap-check` pass with updated proof metadata.

## Tracker Rule

N2 may remain `local-implemented` only while both blocker IDs above keep their local closure evidence and the source preserves the proof-owner truth boundary.

Required completion guard:

```yaml
completion_guard:
  status_must_remain: "local-implemented"
  residual_truth_boundary:
    - "Private Core Send/Swap still keep source-layer X25519 owner authorization prechecked off-circuit; Noir proves a Poseidon proof-owner key relation only."
    - "N2 local implementation is not production privacy, on-chain verifier readiness, custody readiness, shared-tree readiness, fresh-exit privacy, or audit acceptance."
  forbidden_completion_claim:
    - "Do not claim Private Core Send/Swap prove X25519 ownership in circuit."
    - "Do not treat N2 local implementation as proof-verified on-chain privacy."
```

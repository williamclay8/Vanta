# 2026-05-14 N2 Design Blockers

## Purpose

This note prevents the Claude privacy audit tracker from treating N2 as complete while two protocol decisions are still unresolved.

N2 is partially implemented locally: Private Pool v2 Send, Claim, Swap owner binding, and actual-private-spend input preimage now have circuit constraints and verification receipts. The remaining work is not a safe one-line Noir assertion; it requires choosing the canonical protocol shape first.

## N2-PPV2-SWAP-INPUT-PREIMAGE

Status: `blocked-architecture-decision`

Current evidence:

- `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr` binds `owner_commitment = poseidon1([owner_secret])`.
- The same circuit still accepts `input_commitment`, `settlement_commitment`, `route_commitment`, and `economics_commitment` as opaque fields.
- The current ABI does not expose an explicit raw input asset, raw input amount, fee/routing preimage, or derivation/blinding tuple that can unambiguously recompute `input_commitment`.

Decision required:

- Choose the canonical swap-to-shielded input commitment preimage before adding an in-circuit input assertion.

Completion evidence required:

- The circuit recomputes `input_commitment` from the chosen preimage.
- A negative fixture such as `invalid-input-commitment-preimage` fails.
- Prover/browser/operator witness paths carry the new fields without leaking witness material.
- `npm run private-pool-v2:swap-to-shielded-circuit-check` and the swap-to-shielded proof/request/browser/operator checks pass.

## N2-PRIVATE-CORE-SENDER-AUTH

Status: `blocked-architecture-decision`

Current evidence:

- `zk/noir/vanta_private_core_single_note_send/src/main.nr` states that sender secret ownership is prechecked off-circuit for v0.1 and only rejects an all-zero placeholder secret.
- `zk/noir/vanta_private_core_single_note_swap/src/main.nr` states that owner authorization remains prechecked off-circuit and only rejects an all-zero placeholder secret.
- `src/zk/vantaPrivateCoreSendProof.ts` and `src/zk/vantaPrivateCoreSwapProof.ts` label the current authorization relation as `x25519-secret-prechecked-off-circuit`.
- The current note commitment binds X25519 owner public-key limbs, but Noir cannot prove the X25519 secret-to-public relation with the current simple Poseidon-only pattern.

Decision required:

- Choose whether Private Core keeps X25519 notes with off-circuit authorization, adds a separate Poseidon proof-owner key, or migrates note ownership to an in-circuit-friendly key model.

Completion evidence required:

- The selected key model is documented in the tracker and proof metadata.
- Send and Swap circuits enforce the chosen in-circuit owner authorization relation.
- `invalid-owner-auth` fixtures fail for both Send and Swap; in plain tracker language, invalid-owner-auth fixtures must be required before completion.
- `npm run private-core:send-check` and `npm run private-core:swap-check` pass with updated proof metadata.

## Tracker Rule

Do not mark N2 `local-implemented` unless both blocker IDs above are either implemented with the required evidence or explicitly superseded by a later architecture decision note.

Required completion guard:

```yaml
completion_guard:
  status_must_remain: "partial-local-implemented"
  hard_blockers:
    - "N2 is not complete while Private Pool v2 Swap-to-shielded lacks a documented canonical input commitment preimage, in-circuit recomputation, and invalid-input-commitment-preimage fixture."
    - "N2 is not complete while Private Core Send/Swap use x25519-secret-prechecked-off-circuit owner authorization; a nonzero sender_secret_key assertion is not sender authorization."
  forbidden_completion_claim:
    - "Do not mark N2 complete based only on owner_secret -> owner_commitment binding in Swap-to-shielded."
    - "Do not mark N2 complete based only on keeping Private Core sender_secret_key live/nonzero."
```

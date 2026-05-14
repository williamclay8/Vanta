# N2 Private Core Proof-Owner Closure - 2026-05-14

Clay approved the Private Core Send/Swap owner decision on 2026-05-14.

## Implemented Path

Private Core Send/Swap now extend the existing Unshield hybrid owner model:

- Source-layer ownership remains `x25519-secret-prechecked-off-circuit` for payload compatibility and operator/source checks.
- Proof metadata preserves `ownerAuthorizationMode = x25519-secret-prechecked-off-circuit`.
- The Noir proving lane declares `provingOwnerKeyMode = poseidon-proof-owner-key-v0`.
- The circuit witness carries distinct `sender_proving_owner_key_hi` and `sender_proving_owner_key_lo` fields.
- Noir derives `sender_proving_owner_key_lo = poseidon2([sender_secret_key_hi, sender_secret_key_lo])` and asserts `sender_proving_owner_key_hi == 0`.
- Send/Swap consumed-note commitments and nullifiers now bind to the Poseidon proof-owner key instead of treating `sender_secret_key` as a nonzero liveness witness.

## Files

- `zk/noir/vanta_private_core_single_note_send/src/main.nr`
- `zk/noir/vanta_private_core_single_note_swap/src/main.nr`
- `src/zk/vantaPrivateCoreSendProof.ts`
- `src/zk/vantaPrivateCoreSwapProof.ts`
- `operator/private-core-proof.mjs`
- `scripts/check-vanta-private-core-send-circuit.mjs`
- `scripts/check-vanta-private-core-swap-circuit.mjs`
- `scripts/write-vanta-private-core-send-fixture.mjs`
- `scripts/write-vanta-private-core-swap-fixture.mjs`
- `scripts/check-vanta-circuit-soundness-lint.mjs`

## Guarded Behavior

The red-first `npm run zk:circuit-soundness-lint` failure required the new proof-owner relation and rejected the old `sender_secret_key_hi + sender_secret_key_lo != 0` liveness check.

The Private Core Send and Swap circuit checks now include `invalid-owner-auth` fixtures. Those fixtures preserve the proof-owner key but mutate the sender secret limb, so the circuit fails at:

```text
assert(computed_sender_proving_owner_key == sender_proving_owner_key_lo)
```

Operator-side proof serialization now writes `sender_proving_owner_key_hi` and `sender_proving_owner_key_lo` into the temporary Noir `Prover.toml`, and `operator/private-core-proof.mjs` rejects packages whose proof-owner key does not match the sender secret before proving.

## Verification

Local verification passed:

- `npm run zk:circuit-soundness-lint` red-first failure before implementation
- `npx tsc --noEmit --pretty false`
- `npm run private-core:send-check`
- `npm run private-core:swap-check`
- `node --check operator/private-core-proof.mjs`
- `npm run private-core:send-proof-artifact-consistency-check`
- `npm run private-core:send-operator-no-witness-check`
- `npm run private-core:swap-boundary-check`
- `npm run private-core:swap-live-path-check`
- `npm run private-core:send-prove`
- `npm run private-core:swap-prove`

## Truth Boundary

This locally closes the Private Core Send/Swap slice of N2. It does not prove X25519 ownership in circuit. It does not imply production privacy, on-chain proof verification, program-owned custody, shared-tree correctness, fresh-address exit privacy, audit acceptance, pushed status, or deployed/live status.

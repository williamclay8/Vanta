# N2 PPv2 Swap Input Preimage Closure - 2026-05-14

## Decision

Clay approved the PPv2 Swap-to-shielded owner decision on 2026-05-14.

Swap-to-shielded now consumes the same canonical note preimage convention as PPv2 Send/Claim:

```text
input_commitment = poseidon5(owner_commitment, input_asset_id_commitment, input_amount, input_blinding, input_derivation_tag)
```

`settlement_commitment`, `route_commitment`, and `economics_commitment` remain separate commitments. This slice binds ownership of the consumed input note; it does not claim full swap economics correctness or production privacy.

## Implementation

- `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr` adds `compute_input_commitment` and asserts `computed_input_commitment == input_commitment`.
- `src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts` adds `input_asset_id_commitment`, `input_amount`, `input_blinding`, and `input_derivation_tag` to the witness ABI.
- `scripts/check-vanta-private-pool-v2-swap-to-shielded-circuit.mjs` adds `invalid-input-commitment-preimage` and proves it fails at the new Noir assertion.
- Browser-worker typed witness input and contract/soundness guards were updated for the new ABI.

## Verification Receipts

- Red-first: `npm run zk:circuit-soundness-lint` failed before implementation because Swap lacked `compute_input_commitment`, raw consumed-note fields, and `assert(computed_input_commitment == input_commitment)`.
- `npm run private-pool-v2:swap-to-shielded-circuit-check`
- `npm run zk:circuit-soundness-lint`
- `npm run private-pool-v2:swap-to-shielded-proof-request-check`
- `npm run private-pool-v2:public-input-hash-alignment-check`
- `npm run private-pool-v2:contract-check`
- `npm run private-pool-v2:swap-to-shielded-prove`
- `npm run private-pool-v2:swap-to-shielded-proof-artifact-consistency-check`
- `npm run private-pool-v2:swap-to-shielded-operator-no-witness-check`
- `npm run private-pool-v2:swap-to-shielded-browser-worker-prover-check`
- `npm run private-pool-v2:local-bb-fixture-prover-check`
- `npx tsc --noEmit --pretty false`
- `npm run build`

## Remaining N2 Boundary

N2 remains partial because Private Core Send/Swap still need the approved explicit Poseidon proof-owner authorization model. Do not mark N2 complete based on this PPv2 Swap slice alone.

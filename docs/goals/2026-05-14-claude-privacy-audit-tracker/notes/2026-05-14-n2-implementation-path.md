# 2026-05-14 N2 Implementation Path

## Purpose

This packet turns the two remaining N2 blockers into implementable paths without silently choosing a protocol fork.

Status: `proposed-requires-architecture-approval`

## Path 1: Private Pool v2 Swap-To-Shielded Input Preimage

Recommendation: extend the current Private Pool v2 Send/Claim input-preimage pattern to Swap-to-shielded.

Proposed preimage:

```text
input_commitment = poseidon5([
  owner_commitment,
  input_asset_id_commitment,
  input_amount,
  input_blinding,
  input_derivation_tag
])
```

Why this path:

- It mirrors the already-implemented PPv2 Send shape: owner binding plus input asset/amount/blinding/derivation preimage.
- It keeps raw swap route and venue details outside the consumed-note preimage; `settlement_commitment`, `route_commitment`, and `economics_commitment` remain their own transcript commitments.
- It gives the circuit a clear negative test: tamper any input-preimage field while leaving `input_commitment` fixed and the proof must fail.

Implementation files:

- `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr`
- `src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts`
- `scripts/write-vanta-private-pool-v2-swap-to-shielded-fixture.mjs`
- `scripts/check-vanta-private-pool-v2-swap-to-shielded-circuit.mjs`
- Swap-to-shielded proof request, browser-worker prover, proof-artifact, operator-no-witness, and public-input hash checks.

Red-first fixture:

- `invalid-input-commitment-preimage`

Verification:

- `npm run private-pool-v2:swap-to-shielded-circuit-check`
- `npm run zk:circuit-soundness-lint`
- `npm run private-pool-v2:swap-to-shielded-proof-request-check`
- `npm run private-pool-v2:swap-to-shielded-browser-worker-prover-check`
- `npm run private-pool-v2:swap-to-shielded-proof-artifact-consistency-check`
- `npm run private-pool-v2:swap-to-shielded-operator-no-witness-check`
- `npm run private-pool-v2:swap-to-shielded-prove`
- `npm run private-pool-v2:public-input-hash-alignment-check`
- `npm run privacy-audit:tracker-check`
- `npm run build`

Approval question:

- Should Swap-to-shielded consume the same owner/asset/amount/blinding/derivation note preimage convention as PPv2 Send/Claim, with route/settlement/economics commitments remaining separate transcript commitments?

## Path 2: Private Core Send/Swap Sender Authorization

Recommendation: extend the existing Private Core Unshield hybrid proof-owner model to Send and Swap.

Proposed model:

- Keep source-layer X25519 owner keys for payload compatibility and app-side recipient/viewing-key flows.
- Add explicit Send/Swap proof metadata such as `provingOwnerKeyMode = poseidon-proof-owner-key-v0`.
- In the Noir proving package, derive a Poseidon proof-owner public key from the supplied owner secret limbs.
- Prefer distinct proving-owner fields instead of silently treating source `sender_public_key_*` as X25519 and Poseidon at the same time.
- The in-circuit relation should be `sender_proving_owner_key_hi = 0`, `sender_proving_owner_key_lo = poseidon2([sender_secret_key_hi, sender_secret_key_lo])`.
- Bind the proof-owner key into the Poseidon proving-lane consumed-note commitment/nullifier while preserving source X25519 owner metadata for operator truth reporting.

Why this path:

- It reuses the only Private Core lane that already moved beyond off-circuit owner authorization.
- It avoids trying to prove X25519 secret-to-public derivation inside Noir.
- It preserves X25519 source compatibility while making the proving lane explicit about which key relation it actually proves.
- It prevents reviewers from reading the updated circuit as in-circuit X25519 authorization; the proof proves a Poseidon proof-owner relation.

Implementation files:

- `zk/noir/vanta_private_core_single_note_send/src/main.nr`
- `zk/noir/vanta_private_core_single_note_swap/src/main.nr`
- `src/zk/vantaPrivateCoreSendProof.ts`
- `src/zk/vantaPrivateCoreSwapProof.ts`
- `src/zk/vantaPrivateCoreOperatorClient.ts`
- Private Core Send/Swap fixture writers and checks.
- Owner-key hierarchy and circuit soundness guards.

Red-first fixtures:

- `invalid-owner-auth` for Private Core Send.
- `invalid-owner-auth` for Private Core Swap.

Verification:

- `npm run private-core:send-check`
- `npm run private-core:swap-check`
- `npm run private-core:send-prove`
- `npm run private-core:swap-prove`
- `npm run zk:owner-key-hierarchy-contract-check`
- `npm run zk:circuit-soundness-lint`
- `npm run privacy-audit:tracker-check`
- `npm run build`

Approval question:

- Should Private Core Send/Swap adopt an explicit version of the existing Unshield hybrid proof-owner convention, where X25519 remains source-layer compatibility and distinct Poseidon proof-owner keys become the in-circuit authorization relation?

## Stop Rule

Do not implement either path until the relevant approval question is answered or superseded by a newer architecture decision. These paths are recommended because they align with existing Vanta patterns, but they still change protocol witness/metadata contracts.

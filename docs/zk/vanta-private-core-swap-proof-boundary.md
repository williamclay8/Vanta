# Vanta Private Core Swap Proof Boundary v0.1

## Purpose

This note freezes the first zk-facing proof boundary for the constrained Vanta Private Core swap lane.

The repo already has:

- a real unshield proof lane
- a real send proof lane
- a frozen supported swap contract in the operator layer

What this note adds is the next concrete bridge:

- the first proving-boundary contract for narrow private swap
- the first executable fixed-depth swap circuit target

## Scope

This boundary remains intentionally narrow:

- one input note
- one shielded output note
- fixed Merkle membership proof for the input note
- constrained asset change from input asset to output asset
- owner authorization still prechecked off-circuit for `v0.1`
- quote, venue, and execution semantics still remain outside the circuit

It does **not** yet attempt:

- arbitrary multi-hop swaps
- multi-input or multi-output swaps
- in-circuit venue validation
- in-circuit pricing guarantees
- recursive composition
- in-circuit owner authorization

## Repo contract

The boundary now lives in:

- `src/zk/vantaPrivateCoreSwapProof.ts`

Primary types:

- `SwapPublicInputsV0`
- `SwapPrivateWitnessV0`
- `VantaPrivateCoreNoirSwapWitnessPackageV0`
- `VantaPrivateCoreSwapProofBoundaryV0`

Primary entry points:

- `buildVantaPrivateCoreSwapProofBoundary(...)`
- `createVantaPrivateCoreNoirSwapWitnessPackage(...)`
- `deriveVantaPrivateCoreSwapContextTag(...)`

## Public-input shape

The current narrow swap proving boundary binds:

- `stateRoot`
- `inputNullifier`
- `outputCommitment`
- `swapEconomicTermsHash`
- `inputNoteVersion`
- `outputNoteVersion`
- optional `swapContextTag`

The raw input asset, output asset, input amount, and output amount are no longer
Noir-public inputs. They remain part of the source boundary and private witness
material so the circuit can recompute and bind `swapEconomicTermsHash`. This is
a proof-public privacy boundary only: current request/operator settlement layers
still see the raw terms needed to execute and verify the local lane.

## Private-witness shape

The current private witness includes:

- canonical input note
- recomputed input commitment
- input Merkle leaf and Merkle proof
- sender secret key witness
- sender derived public key
- nullifier key witness
- input/output asset and amount field encodings
- canonical output note and commitment
- fixed field encodings for input and output notes
- fixed-depth Merkle path encoding

## Current assumptions

For this frozen `v0.1` boundary:

- source-layer owner authorization remains off-circuit; unlike the current Unshield proving lane, Swap does not yet add a separate Poseidon proof-owner binding
- proving validity is Poseidon-lane truth
- source-layer swap artifacts remain distinct from proving-lane artifacts
- pricing, quote freshness, and venue execution remain operator-backed and off-circuit
- the first swap circuit should target:
  - one input note
  - one output note
  - input nullifier correctness
  - input membership correctness
  - explicit asset change binding

## Current executable target

The repo now also has the first executable fixed-depth swap circuit lane under:

- `zk/noir/vanta_private_core_single_note_swap`

with:

- deterministic valid and invalid-direction fixtures
- `npm run private-core:swap-fixture -- valid`
- `npm run private-core:swap-check`

The current executable circuit remains intentionally narrow:

- one input note
- one output note
- fixed `MERKLE_DEPTH = 20`
- off-circuit owner auth for `v0.1`

## Immediate next implementation target

The next real zk swap step after this boundary and circuit freeze should be:

1. add local swap proof generation equivalent to `private-core:prove` and `private-core:send-prove`
2. decide how much quote and venue context remains verifier-side versus circuit-bound for the first lane
3. decide whether the constrained swap lane belongs in the canonical operator summary the same way send and unshield do today
4. add operator-backed swap proof execution if the lane remains in current `v1` scope

## Practical interpretation

This note does not mean private swap is already final-form.

It means the repo now has:

- a constrained supported swap lane in the operator contract
- a source-layer swap transition contract
- a zk-facing swap proving contract
- an executable fixed-depth swap circuit regression lane

That is the disciplined setup needed before swap proof generation and operator-backed swap proving can become real.

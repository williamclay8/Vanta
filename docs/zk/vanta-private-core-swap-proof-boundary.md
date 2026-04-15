# Vanta Private Core Swap Proof Boundary v0.1

## Purpose

This note freezes the first zk-facing proof boundary for the constrained Vanta Private Core swap lane.

The repo already has:

- a real unshield proof lane
- a real send proof lane
- a frozen supported swap contract in the operator layer

What this note adds is the next concrete bridge:

- the first proving-boundary contract for narrow private swap

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
- `inputAssetId`
- `outputAssetId`
- `inputAmount`
- `outputAmount`
- `inputNoteVersion`
- `outputNoteVersion`
- optional `swapContextTag`

## Private-witness shape

The current private witness includes:

- canonical input note
- recomputed input commitment
- input Merkle leaf and Merkle proof
- sender secret key witness
- sender derived public key
- nullifier key witness
- canonical output note and commitment
- fixed field encodings for input and output notes
- fixed-depth Merkle path encoding

## Current assumptions

For this frozen `v0.1` boundary:

- owner authorization remains off-circuit, matching the current send and unshield lanes
- proving validity is Poseidon-lane truth
- source-layer swap artifacts remain distinct from proving-lane artifacts
- pricing, quote freshness, and venue execution remain operator-backed and off-circuit
- the first swap circuit should target:
  - one input note
  - one output note
  - input nullifier correctness
  - input membership correctness
  - explicit asset change binding

## Immediate next implementation target

The next real zk swap step after this boundary freeze should be:

1. choose whether the first swap circuit deserves its own dedicated Noir workspace now
2. add a deterministic constrained swap fixture
3. decide how much of quote and venue context remains verifier-side versus circuit-bound for the first lane
4. add a regression wrapper equivalent to the current send and unshield lanes

## Practical interpretation

This note does not mean private swap is already final-form.

It means the repo now has:

- a constrained supported swap lane in the operator contract
- a source-layer swap transition contract
- a zk-facing swap proving contract

That is the disciplined setup needed before the first executable swap circuit becomes real.

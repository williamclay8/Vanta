# Vanta Private Core Send Proof Boundary v0.1

## Purpose

This note freezes the first zk-facing proof boundary for Vanta Private Core send.

The repo already has:

- a real unshield proof lane
- a frozen source-layer send boundary

What this note adds is the next concrete step:

- the first proving-boundary contract for narrow private send

## Scope

This boundary remains intentionally narrow:

- one input note
- one recipient output note
- optional one change output note
- fixed Merkle membership proof for the input note
- owner authorization still prechecked off-circuit for `v0.1`

It does **not** yet attempt:

- multi-input send
- joins
- arbitrary fan-out
- swap semantics
- recursive composition
- in-circuit owner authorization

## Repo contract

The boundary now lives in:

- `src/zk/vantaPrivateCoreSendProof.ts`

Primary types:

- `SendPublicInputsV0`
- `SendPrivateWitnessV0`
- `VantaPrivateCoreNoirSendWitnessPackageV0`
- `VantaPrivateCoreSendProofBoundaryV0`

Primary entry points:

- `buildVantaPrivateCoreSendProofBoundary(...)`
- `createVantaPrivateCoreNoirSendWitnessPackage(...)`
- `deriveVantaPrivateCoreSendContextTag(...)`

## Public-input shape

The current narrow send proving boundary binds:

- `stateRoot`
- `inputNullifier`
- `recipientCommitment`
- `changeCommitment`
- `assetId`
- `sendAmount`
- `changeAmount`
- `noteVersion`
- optional `sendContextTag`

## Private-witness shape

The current private witness includes:

- canonical input note
- recomputed input commitment
- input Merkle leaf and Merkle proof
- sender secret key witness
- sender derived public key
- nullifier key witness
- canonical recipient note and commitment
- optional change note and commitment
- fixed field encodings for input, recipient, and optional change notes
- fixed-depth Merkle path encoding

## Current assumptions

For this frozen `v0.1` boundary:

- owner authorization remains off-circuit, matching the current unshield lane
- proving validity is Poseidon-lane truth
- source-layer send artifacts remain distinct from proving-lane artifacts
- the first send circuit should target:
  - one input
  - recipient output
  - optional change output
  - value conservation
  - input nullifier correctness

## Immediate next implementation target

The next real zk send step after this boundary freeze should be:

1. add a fixed deterministic send fixture
2. choose the first send circuit Merkle depth
3. implement the first Noir send circuit under a dedicated workspace
4. add a regression wrapper equivalent to the current unshield lane

## Practical interpretation

This note does not mean private send is already live.

It means the repo now has:

- a source-layer send contract
- a zk-facing send proving contract

That is the minimum disciplined setup needed to make the first `zk v1` send circuit real next.

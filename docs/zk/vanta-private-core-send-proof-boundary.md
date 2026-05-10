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
- `sendEconomicTermsHash`
- `noteVersion`
- optional `sendContextTag`

The raw send asset, send amount, and change amount are no longer Noir-public
inputs. They remain part of the source boundary and private witness material so
the circuit can recompute and bind `sendEconomicTermsHash`. This is a
proof-public privacy boundary only: current request/operator settlement layers
still see the raw terms needed to execute and verify the local lane.

## Private-witness shape

The current private witness includes:

- canonical input note
- recomputed input commitment
- input Merkle leaf and Merkle proof
- sender secret key witness
- sender derived public key
- nullifier key witness
- send asset, send amount, and change amount field encodings
- canonical recipient note and commitment
- optional change note and commitment
- fixed field encodings for input, recipient, and optional change notes
- fixed-depth Merkle path encoding

## Current assumptions

For this frozen `v0.1` boundary:

- source-layer owner authorization remains off-circuit; unlike the current Unshield proving lane, Send does not yet add a separate Poseidon proof-owner binding
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

This note does not mean private send is already final-form.

It means the repo now has:

- a source-layer send contract
- a zk-facing send proving contract
- an executable narrow send lane in the repo

That is the disciplined setup that made the first `zk v1` send circuit real and now anchors the supported narrow send lane.

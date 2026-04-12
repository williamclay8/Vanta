# Vanta Private Core Single-Note Unshield Proof Boundary v0.1

## Purpose

This document defines the first real zk boundary for Vanta Private Core:

- one note
- one unshield consume action
- one release destination
- one nullifier
- one committed state root

The goal is not to prove the full protocol.
The goal is to freeze the first honest proof-facing boundary that the app can construct today.

## Current Reusable Artifacts

The current app-side source of truth remains:
- `src/zk/vantaPrivateCore.ts`

Reusable directly:
- `NoteV0`
- note commitment derivation
- Merkle leaf and node hashing
- witness request / response
- Merkle proof path with explicit sibling direction
- deterministic nullifier derivation
- one-time nullifier consumption enforcement

## First Unshield Proof Statement

The first single-note unshield proof should establish:

1. the prover knows one valid `NoteV0`
2. the note commitment recomputes correctly
3. the note commitment maps to the Merkle leaf correctly
4. the Merkle path yields the public `state_root`
5. the prover presents the owner-side authorization witness required for consume
6. the derived nullifier matches the public nullifier
7. the public `asset_id`, `amount`, `note_version`, and `release_destination` are correctly bound
8. the proof is specific to that consume action through `consume_context_tag`

## Public Inputs

- `state_root`
- `nullifier`
- `release_destination`
- `asset_id`
- `amount`
- `note_version`
- optional `consume_context_tag`

## Private Witness

- serialized canonical note fields
- note commitment
- Merkle leaf
- Merkle proof
- leaf index
- owner secret witness
- derived owner public key
- nullifier key witness
- release destination witness copy
- optional consume context tag witness copy
- fixed witness encodings for note fields and Merkle path

## Current Blockers

### 1. Owner authorization is not yet proven in-circuit

The current boundary can precheck that the supplied X25519 secret key derives the note owner public key.
That is honest and useful, but it is still outside the circuit.

### 2. Merkle depth is not yet globally frozen

The current app tree is variable-depth.
The first Groth16 circuit should pin one exact depth and reject mismatched witness depth.

### 3. Current demo fixtures can be too trivial

A one-leaf tree yields a zero-depth proof path.
That is valid for the current app seam, but not a strong first proving fixture.

## Repo Artifacts

App-side proof boundary:
- `src/zk/vantaPrivateCoreUnshieldProof.ts`

Recommended first circuit workspace:
- `zk/noir/vanta_private_core_single_note_unshield`

## Fixed-Depth v0.1 Choice

The first fixed-depth circuit path uses:

- `MERKLE_DEPTH = 3`

Why:
- depth `0` is trivial and not acceptable
- depth `1` is still too small to feel like a real retained-state path
- depth `3` is still easy to inspect while forcing:
  - multiple Merkle rounds
  - deterministic sibling ordering
  - a nontrivial retained fixture
  - exercise of odd-leaf duplication through a five-leaf fixture

The deterministic fixture helper is:
- `getVantaPrivateCoreFixedDepthUnshieldFixtureV0()`

It produces:
- one valid fixed-depth witness package
- one invalid direction-bit witness package for a failure case

## Current Proving Hash Lane

The first fixed-depth circuit path now uses a Poseidon-based proving lane:

- `poseidon-bn254-proving-lane-v0`

This is the first real proving-hash contract for the unshield circuit path.
It still lives alongside transitional app-side SHA-256 seams, but the Noir lane now uses circuit-friendly hashing while preserving:

- note field structure
- fixed-depth Merkle witness structure
- nullifier semantics
- release-destination binding
- consume-context binding

The app-side witness package continues to preserve the original source public inputs separately from the Noir proving-lane field values.

## Recommended Next Implementation Step

Implement the first Noir circuit against the exact public/private witness package emitted by:

- `buildVantaPrivateCoreUnshieldProofBoundary(...)`

Then choose one nontrivial retained fixture whose Merkle path depth matches the selected circuit constant.

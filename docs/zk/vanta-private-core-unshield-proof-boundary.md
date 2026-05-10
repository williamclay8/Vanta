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
5. the witness package prechecks source-layer X25519 owner authorization off-circuit for consume
6. the circuit derives a Poseidon proof-owner key from the owner secret and binds it into the proving note
7. the derived nullifier matches the public nullifier
8. the public `unshield_economic_terms_hash` binds `release_destination`, `asset_id`, `amount`, and `note_version`
9. the proof is specific to that consume action through `consume_context_tag`

## Public Inputs

- `state_root`
- `nullifier`
- `unshield_economic_terms_hash`
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
- asset and amount witness copy
- optional consume context tag witness copy
- fixed witness encodings for note fields and Merkle path

## Current Blockers

### 1. Source-layer X25519 owner identity is not proven inside Noir

The current Unshield circuit no longer has a no-op owner witness.
It derives `owner_public_key_lo = poseidon2(owner_secret_key_hi, owner_secret_key_lo)`, requires `owner_public_key_hi = 0`, and uses that proof-owner key in the proving note commitment and nullifier.

The source note owner key remains the X25519 key used by the app payloads and is still prechecked outside Noir.
That means the circuit proves knowledge of the current Poseidon proof-owner secret, but it does not prove the X25519 source-owner relation inside Noir.
Strict no-witness operator mode therefore still fails closed for proof-artifact consume until Vanta has a validated source-owner authorization artifact or a final spending-key model that removes the split.

Machine-readable surfaces should keep this split explicit:
- `ownerAuthorizationMode = x25519-secret-prechecked-off-circuit`
- `provingOwnerKeyMode = poseidon-proof-owner-key-v0`

### 2. Merkle depth is fixed for this lane, but global state is still operator-backed

The current Unshield proving lane pins `MERKLE_DEPTH = 20` and rejects malformed direction bits, leaf indices, and siblings.
The broader live state model is still operator-backed and not an on-chain shared commitment tree.

### 3. Current demo fixtures can be too trivial

The current fixed-depth fixture is intentionally nontrivial and includes negative cases for direction bits, leaf index, consume-context split, sibling tampering, amount range, and owner-secret mismatch.
Future fixtures should keep adding negative cases as the boundary grows.

## Repo Artifacts

App-side proof boundary:
- `src/zk/vantaPrivateCoreUnshieldProof.ts`

Recommended first circuit workspace:
- `zk/noir/vanta_private_core_single_note_unshield`

## Fixed-Depth v0.1 Choice

The first fixed-depth circuit path uses:

- `MERKLE_DEPTH = 20`

Why:
- depth `0` is trivial and not acceptable
- depth `1` is still too small to feel like a real retained-state path
- depth `20` matches the minimum active-lane anonymity target while still forcing:
  - full fixed-depth Merkle rounds
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
- release-destination, asset, and amount binding through `unshield_economic_terms_hash`
- consume-context binding

The app-side witness package continues to preserve the original source public inputs separately from the Noir proving-lane field values.
The source artifact bundle binds source-layer `stateRoot` / `nullifier` to the retained source root / source nullifier, while the verified proof transcript binds the Poseidon proving-lane `state_root` / `nullifier`.
Those two hash lanes are intentionally explicit and not treated as implicitly equal.

As of 2026-04-24, Unshield matches Send and Swap's hash-bound proof posture: raw destination, asset, and amount are no longer Noir public inputs. They remain visible at the operator/request and exit-settlement layer, so this is not a `v2-hidden-economic-terms` claim.

## Current Maintenance Step

Preserve the implemented Unshield Noir lane against the exact public/private witness package emitted by:

- `buildVantaPrivateCoreUnshieldProofBoundary(...)`

Keep the X25519 source-owner authorization precheck and Poseidon proof-owner key binding explicit as separate source/operator and proving-lane facts. Guard the lane with:

- `npm run private-core:check`
- `npm run private-core:prove`
- `npm run private-core:consume-check`
- `npm run private-core:verify`

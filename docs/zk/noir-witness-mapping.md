# Noir Witness Mapping For First Proof Target

## Purpose

This document defines the exact witness mapping contract for Vanta’s first executable Noir proof target.

It translates existing Vanta artifacts into a Noir/Barretenberg witness assignment for the first circuit:
- `canonical_note_membership`

This mapping is intentionally narrow.
It exists to make one real proof run possible.

## First Circuit Reminder

The first circuit proves:

> the prover knows a valid canonical note and owner-side private note material such that the note commitment is correctly derived and included in the retained shielded-state membership root represented by the provided path.

## Source Artifacts

The Noir witness mapping draws from these Vanta sources:

- canonical note schema and commitment encoding:
  - `src/zk/canonicalNote.ts`
- lifecycle witness package:
  - `src/zk/canonicalWitnessPackage.ts`
- retained membership context:
  - `src/zk/canonicalMembership.ts`
- proving-side artifact scaffolding:
  - `src/zk/backendEncoderStub.ts`

## Mapping Principle

The first Noir backend witness package must not invent new semantics.
It should only normalize and encode data already established by:
- canonical note construction
- canonical witness package assembly
- retained membership path context

If the required proof input cannot be derived from those sources, the witness package should be marked blocked rather than silently fabricating values.

## Circuit Shape

Recommended Noir circuit interface:

```rust
fn main(
    pub commitment: Field,
    pub membership_root: Field,
    version: Field,
    asset_id: [Field; 2],
    amount_lo: Field,
    amount_hi: Field,
    owner_public_key: Field,
    note_nonce: Field,
    note_secret: Field,
    blinding: Field,
    derivation_tag: Field,
    leaf_index: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_index_bits: [Field; MERKLE_DEPTH],
) {
    // commitment derivation + membership verification
}
```

This is a recommended contract, not yet a locked final circuit signature.

## Public Inputs

### `commitment`
Source:
- `CanonicalLifecycleWitnessPackage.membership.commitment`

Requirement:
- must exist
- must be a valid bytes32 hex value

Encoding:
- convert bytes32 hex into one Noir field if the selected hash/path implementation accepts a full field representation
- otherwise split consistently according to the circuit hash contract

### `membership_root`
Source:
- prefer `CanonicalLifecycleWitnessPackage.futureRootSeam.value`
- fallback only if the backend contract explicitly decides to use `membership.snapshotRoot`

Requirement:
- first executable target should lock this to one root meaning
- recommendation: use the retained future-root seam value when present, because it reflects the proof-facing retained state contract

Encoding:
- bytes32 hex to field or split-field representation matching the circuit hash contract

## Private Witness Inputs

### `version`
Source:
- canonical note `version`

Encoding:
- direct scalar field

### `asset_id`
Source:
- canonical note `assetId`

Encoding recommendation:
- if asset identifiers remain bytes32-like, encode as two field limbs or another fixed-width backend-safe representation
- do not use variable-length strings directly inside Noir witness assignment

Rule:
- backend witness package must pin one exact asset-id encoding strategy and use it consistently

### `amount_lo`, `amount_hi`
Source:
- canonical note `amount: u128`

Encoding:
- split `u128` into two `u64` limbs or another fixed-width two-limb encoding compatible with Noir

Rule:
- limb ordering must be explicit and stable
- recommendation: little-endian limb order

### `owner_public_key`
Source:
- canonical note `ownerPublicKey`

Encoding:
- bytes32-like owner key representation mapped into one field or a fixed limb array

Note:
- for the first proof target, this is ownership-bound note identity material, not yet a full separate spend-authority circuit

### `note_nonce`
Source:
- canonical note `noteNonce`

Encoding:
- bytes32 hex to field or fixed limb array

### `note_secret`
Source:
- canonical note `noteSecret`

Encoding:
- bytes32 hex to field or fixed limb array

### `blinding`
Source:
- canonical note `blinding`

Encoding:
- bytes32 hex to field or fixed limb array

### `derivation_tag`
Source:
- canonical note `derivationTag`

Encoding:
- bytes32 hex to field or fixed limb array

### `leaf_index`
Source:
- `CanonicalLifecycleWitnessPackage.membership.insertionIndex`

Requirement:
- must exist
- must be non-negative

Encoding:
- scalar field

### `membership_path`
Source:
- `CanonicalLifecycleWitnessPackage.candidateMerklePath.path`

Requirement:
- must exist
- path length must match the selected Noir circuit constant `MERKLE_DEPTH`

Encoding:
- each sibling node becomes one field or one fixed limb array depending on the chosen hash representation

### `membership_path_index_bits`
Source:
- derived from `leaf_index` or from explicit path orientation if the path artifact already contains direction semantics

Rule:
- the witness package must choose one source of truth for branch direction
- recommendation: derive path index bits from `leaf_index` and declared tree depth for the first implementation

## Canonical Commitment Mapping

The commitment must be derived in-circuit from the same logical field order used by Vanta’s current canonical note commitment encoding.

Current commitment preimage order in Vanta:
1. commitment domain separator
2. `version`
3. `assetId`
4. `amount`
5. `ownerPublicKey`
6. `noteNonce`
7. `noteSecret`
8. `blinding`
9. `derivationTag`

Source of truth:
- `encodeCanonicalNoteForCommitment` in `src/zk/canonicalNote.ts`

Critical rule:
- the Noir circuit must match this semantic order exactly, even if the backend-specific byte or field packing differs

## Required Backend Witness Package Fields

The backend witness package for this first proof target should contain at minimum:

```text
BackendWitnessPackageV1 {
  backend: "noir-barretenberg"
  circuit: "canonical_note_membership"
  lifecycleId: string
  commitmentHex: bytes32
  membershipRootHex: bytes32
  version: u8
  assetIdEncoding: { strategy, limbs }
  amountEncoding: { lo, hi, endianness }
  ownerPublicKeyEncoding: { strategy, limbs }
  noteNonceEncoding: { strategy, limbs }
  noteSecretEncoding: { strategy, limbs }
  blindingEncoding: { strategy, limbs }
  derivationTagEncoding: { strategy, limbs }
  leafIndex: number
  membershipPathEncoding: {
    depth: number
    siblings: []
    directionBits: []
  }
}
```

This can be represented however the TypeScript proving layer prefers, but these semantics need to exist explicitly.

## Readiness Rules

The backend witness package should be marked `ready` only if all of the following are true:
- canonical note fields are available in backend-encodable form
- commitment is present
- leaf index is present
- membership root is present
- candidate Merkle path is present
- path depth matches the selected Noir circuit contract
- no encoding step requires guessing

The backend witness package should be `blocked` if:
- note fields cannot yet be reconstructed from the current lifecycle source
- Merkle path depth is inconsistent
- root source is ambiguous
- asset encoding is not yet pinned
- commitment construction cannot be matched cleanly in Noir

## Root Source Decision

For the first executable target, Vanta should pin one exact membership-root source.

Recommendation:
- use `futureRootSeam.value` when present

Why:
- it better matches the proof-facing retained state narrative already emerging in Vanta’s lifecycle machinery

Fallback behavior:
- if `futureRootSeam.value` is unavailable, the witness package should be blocked rather than silently switching root semantics unless an explicit alternative circuit contract is declared

## Path Depth Decision

The first Noir circuit should use one fixed Merkle depth constant.

Recommendation:
- derive the first depth directly from the retained candidate path length in the selected golden lifecycle fixture
- freeze that depth for the first live proof

Do not make the first executable target dynamically polymorphic over path depth.

## What Is Not In The First Witness Mapping

The first Noir witness mapping should not yet include:
- transition outputs
- successor notes
- nullifier publication
- multi-note balancing
- venue execution artifacts
- operator settlement artifacts

Those belong to later circuits.

## Golden Fixture Requirements

The first golden lifecycle fixture used with this mapping must provide:
- one retained lifecycle ID
- one commitment
- one insertion index
- one candidate Merkle path
- one future-root seam value
- one reconstructable canonical note

If any of those are missing, the first live proof target is not ready.

## Acceptance Criteria

This witness mapping is complete when:

1. Vanta can derive all required Noir witness inputs from one retained lifecycle fixture.
2. No witness field depends on ad hoc manual editing.
3. Public input order is explicitly fixed.
4. The resulting backend witness package can be serialized into a Noir runner input file without ambiguity.
5. The same fixture yields the same witness package deterministically.

## Immediate Next Implementation Step

After this document, the next implementation step should be:
- define the concrete backend witness package shape for Noir in code
- choose the exact bytes32-to-field encoding strategy
- choose the exact Merkle hash/path contract for the first circuit

That is the point where zk v1 stops being a conceptual proving chain and becomes a runnable backend proof target.


## Poseidon Proving Lane

This first executable proof target uses a Poseidon-based proving contract for:
- note commitment derivation inside the circuit
- membership leaf and node hashing inside the circuit
- public commitment/root identity exposed by the Noir lane

Current TypeScript SHA-256-oriented artifacts remain transitional app-side seams and must not be treated as the same contract automatically.

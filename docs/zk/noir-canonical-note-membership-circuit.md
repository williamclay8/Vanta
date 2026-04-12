# Noir Circuit Contract: Canonical Note Membership

## Purpose

This document defines the contract for Vanta’s first executable Noir circuit.

Circuit name:
- `canonical_note_membership`

Backend target:
- Noir + Barretenberg
- **Proving hash lane:** Poseidon

This circuit is the first real proof target for ZK v1.
It is intentionally narrow.
It exists to force one real backend proof to run end to end.

## Statement

The circuit proves:

> the prover knows a valid canonical note and private owner-side note material such that the canonical note commitment is correctly derived and that commitment is included in the declared retained membership root.

In short:
- knowledge of note witness
- correct commitment derivation
- correct Merkle inclusion

## Scope

### In scope
- canonical note field witness intake
- commitment recomputation inside the circuit
- Merkle inclusion proof against one declared root
- public input exposure for commitment and root

### Out of scope
- nullifier publication
- spentness enforcement
- multi-note balancing
- successor note creation
- send/swap/unshield semantics
- venue correctness
- recursive proof composition

## Circuit Identifier

Recommended stable identifiers:

- Noir package name: `vanta_noir_membership`
- Noir circuit name: `canonical_note_membership`
- Vanta contract label: `vanta-zk-v1-noir-canonical-note-membership`

## Public Inputs

The circuit should expose exactly these public inputs in this order:

1. `commitment`
2. `membership_root`

Optional future extension:
3. `nullifier_basis`

For the first executable version, keep the public interface to two public inputs unless the backend contract needs the third immediately.

## Private Inputs

The circuit should take these private witness inputs:

1. `version`
2. `asset_id`
3. `amount_lo`
4. `amount_hi`
5. `owner_public_key`
6. `note_nonce`
7. `note_secret`
8. `blinding`
9. `derivation_tag`
10. `leaf_index`
11. `membership_path`
12. `membership_path_index_bits`

## Semantic Source Of Truth

The semantic source of truth for note commitment construction is:
- `encodeCanonicalNoteForCommitment` in `src/zk/canonicalNote.ts`

The circuit must preserve this logical field order exactly.

Logical commitment preimage order:
1. domain separator
2. `version`
3. `assetId`
4. `amount`
5. `ownerPublicKey`
6. `noteNonce`
7. `noteSecret`
8. `blinding`
9. `derivationTag`

The circuit may use a backend-specific encoding representation, but it must not alter the semantic order.

## Required Circuit Invariants

### 1. Canonical note field well-formedness
The witness must respect the expected fixed-width field contract used by the backend witness mapping.

This includes:
- fixed width for bytes32-like fields
- fixed limb representation for `amount`
- fixed Merkle path depth

### 2. Commitment derivation correctness
The circuit must derive `computed_commitment` from the witness note fields and require:

```text
computed_commitment == public.commitment
```

### 3. Membership inclusion correctness
The circuit must derive the Merkle root from:
- `computed_commitment`
- `membership_path`
- `membership_path_index_bits`

and require:

```text
computed_root == public.membership_root
```

### 4. Owner-bound private witness usage
The circuit must actually consume the owner-bound private note material as part of commitment derivation.

At minimum, these private values must influence the proof:
- `owner_public_key`
- `note_nonce`
- `note_secret`
- `blinding`
- `derivation_tag`

This prevents the first proof from collapsing into a mere public Merkle inclusion proof.

## Hash Contract Decision

This first circuit needs one explicit hash contract for both:
- note commitment derivation inside the circuit
- Merkle path hashing inside the circuit

Recommendation for the contract document:
- define one backend-local hash strategy for the first Noir implementation
- keep the Vanta TypeScript side explicit about whether the backend hash matches current placeholder SHA-256 semantics exactly or whether this first circuit introduces a backend-local proving hash lane for the first live proof

Important truth:
- if the current TypeScript commitment derivation and the first Noir circuit cannot share the same hash contract directly, Vanta must say so explicitly and label the first proof as a backend-local proving contract rather than pretending full protocol-final hash alignment already exists

## Merkle Contract Decision

The first circuit must fix:
- one tree depth constant
- one sibling ordering rule
- one index-bit direction rule
- one node hashing rule

Recommended first-pass constraints:
- fixed `MERKLE_DEPTH`
- left/right branch choice derived from `membership_path_index_bits`
- one deterministic node-hash function throughout the tree

Do not make the first executable circuit polymorphic over tree depth or hash family.

## Witness Encoding Contract

The circuit depends on the backend witness mapping document:
- `docs/zk/noir-witness-mapping.md`

This circuit contract assumes that document fixes:
- bytes32 encoding strategy
- `u128` split strategy
- Merkle path encoding strategy
- public input order

If that document changes, this circuit contract must be reviewed for compatibility.

## Failure Conditions

The proof must fail if any of the following are false:
- note fields do not reconstruct the declared commitment
- membership path does not reconstruct the declared root
- path bits do not match the intended branch directions
- witness field widths or encodings violate the backend contract

## Fixture Expectations

The first circuit should be tested against one golden retained lifecycle fixture with:
- one canonical note
- one commitment
- one retained root
- one insertion index
- one candidate Merkle path
- deterministic backend witness package material

The circuit should not be considered live until this fixture proves and verifies successfully.

## Relationship To Current Artifact Chain

This circuit is the backend execution target for the current proving-side artifact chain.

Recommended mapping:
- `constraint-system package`
  - names this circuit and its structural assumptions
- `proving-input package`
  - names the lifecycle and normalized proof job inputs
- `backend witness package`
  - carries the exact Noir witness assignment
- `backend proving session`
  - executes Noir/Barretenberg proof generation
- `proof receipt`
  - captures the produced proof artifact
- `proof verification receipt`
  - captures verifier success/failure for the same public inputs

## Acceptance Criteria

This circuit contract is satisfied only when:

1. the circuit is implemented in Noir
2. the backend witness package can populate the circuit deterministically
3. one real proof is generated for the golden fixture
4. verification succeeds for the declared public inputs
5. Vanta records the result through its proving-session, proof-receipt, and verification-receipt artifacts

## Follow-On Circuit

Once this circuit is real, the next recommended circuit should be:
- note spend authorization with nullifier-oriented private binding

That is the right next level of zk v1 difficulty after canonical note membership.


## Poseidon Proving Lane

This first executable proof target uses a Poseidon-based proving contract for:
- note commitment derivation inside the circuit
- membership leaf and node hashing inside the circuit
- public commitment/root identity exposed by the Noir lane

Current TypeScript SHA-256-oriented artifacts remain transitional app-side seams and must not be treated as the same contract automatically.

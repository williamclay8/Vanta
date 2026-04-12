# Noir First Proof Target

## Purpose

This document defines the first executable ZK v1 proving target for Vanta.

The goal is not to prove the full protocol. The goal is to force one real backend proof to exist end to end using Noir and Barretenberg.

This first target should be small, honest, and directly connected to the canonical note and witness work already present in the codebase.

## Backend Choice

Phase 1 proving backend target:
- **Circuit language:** Noir
- **Backend / proving stack:** Barretenberg

This is the first concrete proving backend for ZK v1.

## First Statement

The first statement Vanta should prove is:

> I know a valid canonical note and owner-side private material such that the note commitment is correctly derived and the note is included in the retained shielded-state commitment context represented by the provided membership root and path.

Plainly:
- the prover knows the note
- the prover knows the private owner-side secret material for that note
- the commitment is recomputed inside the circuit
- the commitment is proven to belong to a retained membership root

This is the first live proving target because it exercises the real cryptographic core without prematurely taking on full send, swap, or unshield semantics.

## Why This Target

This target is the right first proof because it already matches the current Vanta foundation:
- canonical note schema exists
- canonical note commitment derivation exists
- witness package assembly exists
- retained lifecycle membership context exists
- candidate membership path logic exists
- nullifier-ready and spend-oriented context already exists, even if final spend proof semantics are not yet complete

This proof is intentionally smaller than:
- a full send proof
- a full swap proof
- a full unshield release proof
- multi-note balance constraints
- full nullifier enforcement

## Scope

This first Noir proof **does** cover:
- canonical note field witness intake
- deterministic note commitment recomputation
- owner-side private material being part of the witness
- membership root/path verification for the note commitment
- public exposure of a stable proof-facing commitment/root identity

This first Noir proof **does not yet** cover:
- final nullifier formula
- note consumption correctness across transitions
- multi-input or multi-output balance constraints
- send/swap/unshield flow semantics
- venue execution semantics
- proof aggregation
- recursive proof composition

## Proposed Circuit Name

Recommended working circuit name:
- `canonical_note_membership`

Recommended proof package label:
- `vanta-zk-v1-noir-canonical-note-membership`

## Private Witness Inputs

The first circuit should take the following as private witness inputs.

### Canonical note fields
- `version`
- `asset_id`
- `amount`
- `owner_public_key`
- `note_nonce`
- `note_secret`
- `blinding`
- `derivation_tag`

These correspond to `CanonicalNoteV1` from `docs/zk/canonical-note-schema.md`.

### Membership witness inputs
- `membership_path`
- `leaf_index`
- optional path orientation bits if not implied by index

### Owner-side proof material
For the first proof target, the circuit should bind owner-side private control through the note’s private ownership material already present in the canonical note model.

This means the first proof should treat at least these as witness-private spend material:
- `owner_public_key` as committed note identity
- `note_secret`
- `note_nonce`
- `derivation_tag`

If Vanta later introduces a dedicated private spend key distinct from recovery identity, that should be a later refinement, not a blocker for this first target.

## Public Inputs

The first circuit should expose the smallest stable public surface needed to verify the statement.

Recommended public inputs:
- `commitment`
- `membership_root`

Optional third public input if useful in the first backend contract:
- `nullifier_basis`

### Public input rationale
- `commitment` proves which note is being spoken about
- `membership_root` proves which retained shielded-state context the note belongs to
- `nullifier_basis` is optional for the first pass, but including it can make later spend-proof continuity easier

## In-Circuit Invariants

The first Noir circuit should enforce all of the following.

### 1. Canonical note encoding agreement
The witness fields must map to the exact canonical note field order used by Vanta’s commitment construction.

This must match the protocol ordering already defined in the canonical note implementation, not an ad hoc Noir-local ordering.

### 2. Commitment correctness
The circuit must recompute the note commitment from the canonical note witness fields and require that it equals the public `commitment` input.

### 3. Membership correctness
The circuit must verify that the provided membership path and index derive the provided public `membership_root` from the recomputed note commitment.

### 4. Owner-side private control binding
The private owner-side note material must actually participate in the circuit’s commitment derivation rather than appearing as unused witness baggage.

This matters because the proof should establish knowledge of a real private note, not just a public commitment/path pair.

## Out of Scope Invariants For This First Proof

The circuit should explicitly not attempt to enforce these yet:
- note was not previously spent
- nullifier uniqueness on chain
- conservation across multiple notes
- source/target asset transformation correctness
- venue settlement correctness
- operator execution correctness

Those belong to later proofs.

## Mapping From Current Vanta Artifacts

The current proving artifact chain should map into this first Noir target as follows.

### Constraint-system package
This should become the first backend-shaped circuit package describing:
- selected Noir circuit identity
- field schema
- Merkle path depth assumptions
- commitment hash contract assumptions
- public/private input partition

For this first target, the constraint-system package should name the circuit as the canonical note membership circuit.

### Proving-input package
This should become the normalized proof-job payload describing:
- lifecycle being proven
- selected note witness package source
- resolved public inputs
- resolved private witness material needed for the circuit

### Backend witness package
This should become the backend-specific Noir witness payload describing:
- exact witness field names
- exact scalar/field encodings
- exact membership path encoding
- exact public input ordering expected by Barretenberg verification

### Backend proving session
This should become the real invocation contract for:
- compiling or loading the Noir circuit
- constructing witness assignments
- generating one proof
- capturing the proof artifact and verifier result

## Recommended Encoding Contract

The first executable target should define a strict mapping document from existing TypeScript artifacts into Noir inputs.

At minimum, the spec should pin:
- how `bytes32` values from the canonical note become Noir field elements or arrays
- how `u128 amount` is represented in Noir
- how the membership path is represented
- how leaf index is represented
- exact public input order

This mapping must be explicit. Do not leave it implicit in adapter code.

## Data Sources In Existing Code

The first executable target should consume these existing Vanta foundations.

### Canonical note source
- `src/zk/canonicalNote.ts`

### Witness package source
- `src/zk/canonicalWitnessPackage.ts`

### Membership source
- `src/zk/canonicalMembership.ts`

### Proving-side artifact scaffolding
- `src/zk/backendEncoderStub.ts`

## First Golden Path

The first live proving path should operate on exactly one retained lifecycle fixture.

Recommended golden path:
- choose one retained canonical lifecycle with:
  - valid canonical note commitment
  - retained membership root
  - candidate Merkle path available
  - no legacy-only missing components
- derive the witness package
- derive the proving-input package
- derive the backend witness package
- run one Noir proof
- verify the proof successfully
- emit proof receipt and verification receipt

No batching.
No multiple notes.
No transition proof.
Just one real success path.

## Acceptance Criteria

The first Noir target is complete only when all of the following are true:

1. Vanta can deterministically construct the first backend witness package for one retained lifecycle.
2. Noir witness inputs are populated from Vanta data without manual editing.
3. Barretenberg produces one real proof artifact.
4. Verification succeeds against the declared public inputs.
5. Vanta records a real backend proving session, proof receipt, and verification receipt for that run.

## Recommended Next Files To Create

To operationalize this target, the next docs/artifacts should be:

- `docs/zk/noir-witness-mapping.md`
- `docs/zk/noir-canonical-note-membership-circuit.md`
- first Noir circuit workspace under a dedicated zk backend directory

## What Comes After This Proof

Once this first proof is real, the next proof target should likely be:
- note spend authorization with nullifier-oriented binding

After that:
- one-input / two-output transition proof for send or change

That sequence is more grounded than jumping straight to a full swap or full unshield circuit.

## Decision

Vanta ZK v1 should treat this document as the first executable proving target:

**Noir proof of canonical note ownership-bound commitment membership in retained shielded state.**


## Poseidon Proving Lane

This first executable proof target uses a Poseidon-based proving contract for:
- note commitment derivation inside the circuit
- membership leaf and node hashing inside the circuit
- public commitment/root identity exposed by the Noir lane

Current TypeScript SHA-256-oriented artifacts remain transitional app-side seams and must not be treated as the same contract automatically.

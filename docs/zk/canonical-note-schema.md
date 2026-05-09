# Canonical Note Schema

## Purpose

This document defines the first implementation-facing cryptographic artifact for Vanta ZK Phase 1: the canonical note schema.

Vanta already has a proven constrained mainnet lifecycle for `Shield`, `Send`, constrained one-way `USDC -> SOL` swap, and operator-backed `USDC` and `SOL` unshield. That lifecycle is real, but it is not yet the final zk-private protocol. The canonical note schema is the first step in changing that. It defines the protocol object that future shielded state, commitment insertion, owner recovery, and spend-readiness work should build around.

This is not a frontend note model. It is a protocol-level schema for a shielded value object that can later support commitments, encrypted owner recovery, and nullifier-safe spend semantics.

## Scope

This document is for `ZK Phase 1 = Private Note Foundation + Shielded State Structure`.

It defines:
- the role of a canonical Vanta note
- the recommended Phase 1 note field set
- the intended privacy and recovery semantics of each field
- what the note must support for commitments, encrypted payloads, and future nullifiers
- how current product-visible Vanta notes should map onto the canonical cryptographic note foundation

It does not finalize:
- full send proof construction
- full swap proof construction
- full unshield proof construction
- the final proving system
- the final commitment hash or curve choice
- the final nullifier formula
- the final encrypted payload cipher suite

## Canonical Note Role

The canonical note is the core private value object in Vanta's future zk system.

At minimum, a canonical note must represent:
- asset identity
- amount
- owner or recipient key material
- note secret material
- blinding or randomness
- unique nonce or derivation material
- enough structured data to derive a canonical note commitment
- enough structured data to support later nullifier derivation
- enough structured data to be encoded into an encrypted payload that the intended owner can recover

The note should be designed once and reused across product workflows. `Shield`, `Send`, `Swap`, and `Unshield` are protocol flows that create, consume, transform, or release notes. They should not each invent their own incompatible private value representation.

## Recommended Schema: V1

Phase 1 should adopt the following conceptual note shape:

```text
CanonicalNoteV1 {
  version: u8
  assetId: bytes32
  amount: u128
  ownerPublicKey: bytes32
  noteNonce: bytes32
  noteSecret: bytes32
  blinding: bytes32
  derivationTag: bytes32
  creationHint: NoteCreationHint?
}
```

With the following derived artifacts:

```text
CanonicalNoteArtifactsV1 {
  commitment: bytes32              // legacy SHA-256 display/audit handle
  provingCommitment: Field + metadata // Poseidon/BN254 circuit-facing commitment
  nullifierBasis: bytes32
  encryptedPayload: bytes
}
```

Recommended supporting metadata:

```text
NoteCreationHint {
  sourceKind: enum { shield, send, swap, change, unshield_change, unknown }
  sourceAssetHint: bytes32?
  sourceTxSignatureHint: bytes64?
  sourceTransitionIdHint: bytes32?
}
```

`NoteCreationHint` is optional, non-canonical metadata used only for recovery and operator or wallet UX support. It must not be required for commitment correctness.

## Field Semantics

### `version`

Meaning:
- schema version for serialization, hashing domain separation, and migration safety

Visibility:
- public inside the note payload and commitment preimage

Contribution:
- prevents cross-version ambiguity
- enables future schema upgrades without silent interpretation drift

### `assetId`

Meaning:
- canonical identifier for the represented asset
- in Phase 1 this should map to a normalized protocol asset identifier, not a UI label

Visibility:
- private in the encrypted payload
- committed inside the note commitment

Contribution:
- binds the note to exactly one asset type
- prevents a note from being reinterpreted across assets
- will later inform spend and release logic

Recommended Phase 1 representation:
- fixed-width normalized identifier derived from the supported asset namespace
- for Solana-backed assets this may eventually be derived from mint identity plus domain separation

### `amount`

Meaning:
- exact value represented by the note in base units

Visibility:
- private in the encrypted payload
- committed inside the note commitment

Contribution:
- binds the value represented by the note
- must be available to later witness construction and balance constraints

Recommended Phase 1 representation:
- unsigned fixed-width integer
- `u128` is preferred over `u64` to avoid unnecessary future migration pressure

### `ownerPublicKey`

Meaning:
- the shielded owner recovery key or recipient key material that identifies who can decrypt and later spend the note

Visibility:
- private in the encrypted payload
- committed inside the note commitment

Contribution:
- binds ownership to the note
- supports encrypted owner recovery
- forms part of the future nullifier-safe spend model

Phase 1 expectation:
- this should be a dedicated note ownership key, not a direct reuse of a public wallet address as the final design

### `noteNonce`

Meaning:
- unique per-note nonce material

Visibility:
- private in the encrypted payload
- committed inside the note commitment

Contribution:
- ensures notes for the same owner, asset, and amount can still be distinct
- supports uniqueness and future nullifier derivation structure

Phase 1 expectation:
- generated randomly or derived through a domain-separated construction that guarantees uniqueness per note

### `noteSecret`

Meaning:
- primary secret material associated with the note

Visibility:
- private only
- never published outside encrypted owner recovery paths

Contribution:
- part of the private note identity
- intended to support later spend witness construction
- intended to support natural nullifier derivation in a later phase

Phase 1 expectation:
- generated as high-entropy secret material per note
- should not be reused across notes

### `blinding`

Meaning:
- commitment blinding randomness

Visibility:
- private only
- committed as part of the note preimage

Contribution:
- ensures hiding
- ensures that otherwise identical notes produce distinct commitments
- prevents deterministic leakage from repeated amounts or assets

Phase 1 expectation:
- independent high-entropy randomness
- separate from `noteSecret`

### `derivationTag`

Meaning:
- domain-separated uniqueness material used to anchor deterministic downstream derivations without overloading the main secret fields

Visibility:
- private in the encrypted payload
- committed inside the note commitment

Contribution:
- supports stable future derivation structure
- gives the protocol a dedicated place to bind note-family or future nullifier basis material without mutating owner or amount semantics

Phase 1 expectation:
- derive as domain-separated random or pseudorandom material
- do not treat as display metadata

### `creationHint`

Meaning:
- optional reconstruction metadata describing how the note came into existence

Visibility:
- private if encrypted with the note payload
- not required for the canonical commitment

Contribution:
- helps wallets and recovery tooling map notes back to product actions
- useful for debugging, migration, and state reconstruction

Non-goal:
- this field must not be required for spend correctness
- this field must not become a hidden consensus dependency

## Derived Artifacts

### `commitment`

Meaning:
- canonical insertion object for shielded state

Construction expectation:
- derived from the canonical note fields under explicit domain separation
- should bind at least:
  - `version`
  - `assetId`
  - `amount`
  - `ownerPublicKey`
  - `noteNonce`
  - `noteSecret`
  - `blinding`
  - `derivationTag`

Phase 1 does not lock the final hash construction, but it does require the schema to support the following properties.

### `nullifierBasis`

Meaning:
- derived internal artifact that makes future nullifier construction straightforward

Construction expectation:
- should be derivable from note-owned secret material plus ownership-bound material
- should not itself reveal spendability to outsiders

Phase 1 note:
- this is a readiness target, not a finalized public nullifier output

### `encryptedPayload`

Meaning:
- owner-recoverable serialized note payload

Construction expectation:
- contains enough data for the intended owner to reconstruct the note and later build spend witnesses
- should include the canonical private note fields and any optional recovery hints

## Commitment Expectations

The canonical note schema must support commitments with the following properties:

### Binding

Different semantic notes must not map to the same valid interpretation under the same commitment construction except with negligible collision probability.

At minimum, the commitment must bind:
- asset identity
- amount
- owner key material
- note uniqueness material
- secret and blinding material

### Hiding

The commitment must not reveal the underlying asset, amount, or owner to observers who do not possess the encrypted recovery payload or private spend material.

### Distinctness Under Randomness

Two notes with the same visible semantics must still produce distinct commitments when their randomness differs.

That property matters for:
- repeat shielding of the same amount
- change note creation
- repeated swap outputs with identical amounts

### Canonical Shielded State Compatibility

The commitment must be suitable for insertion into a canonical shielded state structure, likely a global append-only tree or set. The schema should not assume a local or per-user state container as the long-term design.

### Transitional Hash Surface Today

The current implementation deliberately labels two commitment surfaces instead of pretending there is only one:

- `commitment` uses `sha256-canonical-note-v1`. It is retained as a browser/operator display and audit handle for existing local state.
- `provingCommitment` uses `poseidon-bn254-canonical-note-proving-commitment-v1` over `vanta.canonical-note.proving-fields.poseidon-bn254.v1`. It is the circuit-facing note commitment surface.
- Live Shield records store both through `CanonicalNoteArtifacts`; Live Send successor records preserve `provingCommitment` while redacting encrypted payload bytes from browser storage.
- The local `AppendOnlyShieldedState` root is still the legacy SHA-256 browser index, not the production shared Poseidon Merkle tree. Production privacy still requires the shared tree, depth migration, live verifier/root enforcement, and audit gates tracked in `SECURITY_LIMITATIONS.md`.

Guard command: `npm run zk:canonical-note-proving-commitment-check`. For the broader Noir hash migration decision, see `docs/zk/noir-hash-contract-decision.md`.

## Encrypted Payload Expectations

The note schema must support an encrypted payload with the following properties:

### Owner Recovery

The intended owner or recipient must be able to recover the full note from the encrypted payload using their corresponding recovery key material.

### Non-owner Privacy

Parties without the intended recovery keys must not be able to recover private note contents.

### Spend Witness Readiness

The recovered payload must contain enough information for later witness construction, including:
- canonical note fields
- note-specific secret material
- ownership-bound recovery data
- any required versioning information

### Serialization Discipline

The encrypted payload format should be defined over a canonical serialization, not ad hoc JSON. Phase 1 can prototype with a practical representation, but the protocol target is a fixed, stable, byte-level encoding.

## Nullifier Readiness

Phase 1 does not yet implement final spend proofs or publish a final nullifier design.

However, the note schema must be designed so that later nullifier derivation is natural and safe. That means:
- the note contains dedicated secret material that is not reused across notes
- ownership is bound into the note structure
- uniqueness material is explicit
- the commitment preimage and encrypted payload retain the fields future spend logic will need

The note schema should avoid designs where nullifiers require retrofitted hidden assumptions or cross-note hacks.

## Canonical State Compatibility

This note schema is designed for insertion into a canonical shielded state structure, likely a global append-only tree or set of note commitments.

That means the note must support:
- canonical serialization
- deterministic commitment derivation
- stable versioning
- later inclusion proofs
- later spend witness construction against a shared shielded state

The current product-visible note model is a transitional application state model. The canonical note schema is the protocol object that future canonical state insertion should center on.

## Mapping From Current Vanta Note Concepts

Current Vanta note concepts should be understood as product and protocol variants that will eventually map onto the same canonical cryptographic note foundation.

### Shield note

Current meaning:
- value entering Vanta from a public wallet flow

Future canonical view:
- creation of one or more canonical notes whose commitments are inserted into shielded state

### Send note

Current meaning:
- note transition representing private movement inside Vanta's state model

Future canonical view:
- consumption of one or more canonical notes and creation of one or more successor canonical notes under new ownership or change semantics

### Swap note

Current meaning:
- constrained product flow turning shielded `USDC` state into shielded `SOL` state through a venue-backed path

Future canonical view:
- protocol-level consumption and creation of canonical notes across asset types, with venue execution and proof semantics layered around the same canonical note object

### Shielded SOL note

Current meaning:
- product-visible shielded `SOL` balance unit

Future canonical view:
- canonical note with `assetId = SOL-domain-identifier`, no special schema fork required

The important rule is that workflow names should not imply schema fragmentation. One canonical note family should support multiple Vanta flows.

## Explicit Non-goals

This document does not finalize:
- the exact commitment hash construction
- the exact nullifier formula
- the exact proving backend
- the exact Merkle tree or accumulator structure
- multi-note batching semantics
- fee note semantics
- relayer semantics
- cross-asset proof composition
- final recipient privacy UX
- final wallet key hierarchy

It also does not claim that Vanta is already zk-private today. The current live mainnet lifecycle remains a constrained real protocol loop, not the final privacy core.

## Recommended Immediate Next Steps

After this document lands, the immediate engineering tasks should be:

1. Choose the Phase 1 commitment construction.
   - Define domain separation.
   - Define the canonical commitment preimage order.
   - Define exact byte-level field encoding.

2. Implement canonical note serialization.
   - Add a stable byte encoding for `CanonicalNoteV1`.
   - Add test vectors for serialization determinism.

3. Implement the encrypted payload format.
   - Define payload contents.
   - Define versioning.
   - Define owner recovery encryption and authentication rules.

4. Implement owner recovery utilities.
   - Recover a canonical note from encrypted payload bytes.
   - Validate schema version and field integrity after decryption.

5. Implement canonical shielded state insertion.
   - Derive commitments from canonical notes.
   - Insert them into the chosen append-only state structure.
   - Add inclusion-path plumbing for later witness work.

6. Define the nullifier-ready basis concretely.
   - Specify which private fields future nullifier derivation will bind.
   - Ensure the design does not require schema churn later.

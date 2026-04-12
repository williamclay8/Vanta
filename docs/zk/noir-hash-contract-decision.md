# Noir Hash Contract Decision

## Decision

For the first executable Vanta ZK v1 proof lane:

- **Canonical note proving commitment hash:** Poseidon
- **Merkle node hash for proving membership:** Poseidon
- **Backend target:** Noir + Barretenberg

## Status Label

This is the **first executable proving contract** for zk v1.

It is **not yet** the final forever protocol-wide hash lock for every Vanta surface.

Current truth:
- existing TypeScript note/state machinery still uses transitional SHA-256-oriented seams in places
- the new Noir proof lane needs a circuit-friendly hash contract now
- Poseidon is the right choice for the first real backend proof

## Why Poseidon

Poseidon is the right first proving hash because:
- it is circuit-friendly
- it is a better fit than SHA-256 for Noir/Barretenberg proof performance and implementation simplicity
- it lets Vanta force one real proof run sooner
- it avoids wasting zk v1 momentum on SHA-256-in-circuit friction

## Why Not SHA-256 For The First Noir Proof

We should not force the first Noir proof around SHA-256 because:
- it adds unnecessary circuit weight
- it complicates the first proving target
- it increases the chance of getting stuck in backend plumbing before one real proof exists

For zk v1 right now, the priority is:
- one real proof
- one real verifier result
- one honest backend contract

Poseidon serves that better.

## Contract Boundaries

### Proving lane contract
The first Noir proving lane should treat these as Poseidon-based:
- canonical note proving commitment
- membership tree leaf hashing
- membership tree internal node hashing
- membership root derivation used by the circuit
- any first-pass nullifier-basis-compatible proving derivation that depends on the same proof lane

### Transitional app-side contract
The current application-side TypeScript artifacts may remain transitional while the proving lane is being forced real.

That means:
- current SHA-256-oriented note/state seams do not need to be immediately rewritten everywhere
- the proving contract can be introduced as a clearly labeled backend proof lane
- adapter logic or parallel artifact derivation can bridge current app-side objects into the Poseidon proving lane

## Honest Product Label

The product should describe this accurately as:

> Vanta zk v1 now has a concrete executable proving lane built on Noir/Barretenberg with Poseidon-based proving commitments and membership hashing.

It should **not** claim yet that:
- every app-visible commitment already uses final proving hashes
- the entire protocol is fully hash-finalized
- the current transitional TypeScript state artifacts are already the final zk contract

## Immediate Implementation Consequences

This decision means the next implementation work should be:

1. define Poseidon-based canonical note proving commitment derivation for the Noir lane
2. define Poseidon-based membership tree hashing for the Noir lane
3. pin the bytes32-to-field encoding contract used by Noir witness generation
4. update the Noir circuit contract docs to reference Poseidon explicitly
5. update the backend witness package to produce Poseidon-lane inputs rather than pretending SHA-256 and Noir are already the same lane

## Operational Rule

Going forward, the first Noir proof target should assume:
- **proof commitment identity = Poseidon proving commitment**
- **proof membership root = Poseidon proving root**

If app-side SHA-256 state still exists in parallel, that is transitional and must be documented as such.

## Next Required Docs / Code Changes

After this decision, the immediate next files to update are:
- `docs/zk/noir-first-proof-target.md`
- `docs/zk/noir-witness-mapping.md`
- `docs/zk/noir-canonical-note-membership-circuit.md`
- Noir circuit scaffold under `zk/noir/canonical_note_membership/`

Those should all treat Poseidon as the proving hash contract.

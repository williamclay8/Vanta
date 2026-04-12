# Vanta Private Core First Unshield Circuit Milestone

## Summary

Vanta Private Core now has its first executable zk circuit for a single-note unshield consume path.

This milestone is intentionally narrow:
- one retained private note
- one fixed-depth Merkle inclusion proof
- one nullifier-producing consume action
- one bound public release outcome

The goal of this milestone is not to prove the full protocol.
The goal is to make the first honest proof lane real, repeatable, and inspectable.

## What is now true

The repo contains a fixed-depth Noir circuit for the first Vanta Private Core single-note unshield path, and that circuit has been validated with both a passing and failing witness.

Current circuit scope:
- fixed `MERKLE_DEPTH = 3`
- note commitment recomputation
- note commitment to Merkle leaf mapping
- fixed-depth Merkle root recomputation
- nullifier recomputation
- public binding of `asset_id`, `amount`, and `note_version`
- public binding of `release_destination`
- public binding of `consume_context_tag`

## Validation status

The first circuit lane is now repeatable locally.

Fixture switching is exposed as:

```bash
npm run private-core:fixture -- valid
npm run private-core:fixture -- invalid-direction
```

Observed behavior:
- `valid` writes a passing `Prover.toml`, and `nargo execute` succeeds
- `invalid-direction` writes a malformed Merkle witness, and `nargo execute` fails at the circuit root-check assertion in `zk/noir/vanta_private_core_single_note_unshield/src/main.nr`
- `Prover.toml` was restored to the valid fixture after validation

This means the first Vanta Private Core unshield circuit is no longer just a typed boundary or witness shape.
It is now an executable proof lane with a confirmed happy path and a confirmed negative path.

## Supporting repo artifacts

Updated or added:
- `src/zk/vantaPrivateCoreUnshieldProof.ts`
- `zk/noir/vanta_private_core_single_note_unshield/src/main.nr`
- `zk/noir/vanta_private_core_single_note_unshield/README.md`
- `scripts/write-vanta-private-core-unshield-fixture.mjs`
- `package.json`

Related boundary document:
- `docs/zk/vanta-private-core-unshield-proof-boundary.md`

## Important v0.1 limitations

This remains an explicitly narrow v0.1 proving lane.

Known limitations:
- the circuit currently uses a temporary additive proving lane, `field-additive-test-lane-v0`, instead of the final protocol hash lane
- owner authorization remains prevalidated off-circuit
- this milestone covers only the first single-note unshield consume proof, not send, swap, batching, recursion, or full product integration

These are known follow-up items, not blockers to the milestone itself.

## Why this milestone matters

This is the first point where Vanta Private Core becomes cryptographically real in the narrowest useful sense:
- one retained private note
- one inclusion proof against committed state
- one deterministic nullifier for consume
- one bound public release result

That is the correct first zk milestone for the current architecture.

## Recommended next step

Freeze this milestone before broadening scope:
1. preserve the current fixed-depth unshield lane as the baseline executable proof path
2. add lightweight regression coverage around fixture writing and expected `nargo execute` success and failure behavior
3. then replace the temporary additive proving lane with the final protocol-facing hash lane

## Reproduction commands

From the repo root:

```bash
npm run private-core:fixture -- valid
cd zk/noir/vanta_private_core_single_note_unshield
nargo check
nargo execute
```

Negative path:

```bash
npm run private-core:fixture -- invalid-direction
cd zk/noir/vanta_private_core_single_note_unshield
nargo execute
```

Restore valid fixture:

```bash
npm run private-core:fixture -- valid
```

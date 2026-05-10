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
- fixed `MERKLE_DEPTH = 20`
- note commitment recomputation
- note commitment to Merkle leaf mapping
- fixed-depth Merkle root recomputation
- nullifier recomputation
- public binding of `unshield_economic_terms_hash` and `note_version`
- private witness copies of `release_destination`, `asset_id`, and `amount` recompute that economic-terms hash
- public binding of `consume_context_tag`

## Validation status

The first circuit lane is now repeatable locally.

Canonical regression command:

```bash
npm run private-core:check
```

That wrapper:
- writes the valid fixture
- runs `nargo check`
- requires the valid proving path to succeed
- requires the invalid-direction proving path to fail
- restores `Prover.toml` to the valid fixture before exit

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

The repo now also has a first real local proof-generation and verification path:

```bash
npm run private-core:prove
```

That command:
- writes the valid fixture
- compiles the circuit
- generates the witness
- generates a real UltraHonk proof using `@aztec/bb.js`
- verifies that proof locally
- writes an ignored proof receipt into `target/`
- restores the repo to the valid fixture state

This is an important step beyond witness solving alone, but it should still be read honestly as:
- a real local backend-style proof path
- a narrow operator-backed integration path for local proof execution and consume checks
- not production or mainnet settlement readiness

The repo now also has an operator-backed consume seam check:

```bash
npm run private-core:consume-check
```

That command confirms:
- the current fixed-depth witness still generates and verifies a real proof
- operator-side consume now depends on the root already being known as current private-core state
- the root-currentness basis can advance and then be restored
- operator-side one-time-use semantics can record the first consume
- the same helper-level seam now also proves the first release record basis is retained correctly
- the same nullifier is then seen as consumed for replay purposes

The repo now also has a real operator HTTP smoke test:

```bash
npm run private-core:http-smoke
```

That command confirms the current lane through the actual server surface:
- root, consume, and release state endpoints start with explicit empty-state summaries
- private-core status endpoints expose `stateVersion = 1`
- state endpoints advertise `GET` correctly through CORS preflight across:
  - `/state/private-core-roots`
  - `/state/private-core-consumes`
  - `/state/private-core-releases`
- proof endpoint succeeds
- consume endpoint rejects before root registration
- root registration now requires the same proof-backed witness material as the current operator proof lane
- operator proof execution now asserts the verified proving-lane public input vector matches the witness package public input vector exactly
- tampered root registration is rejected without mutating root state across the full validated public surface:
  - `releaseDestination`
  - `assetId`
  - `amount`
  - `noteVersion`
- missing source note commitments, Merkle leaves, and witness roots are rejected at root registration
- tampered source note commitments, Merkle leaves, and witness roots are also rejected at root registration
- registered root state retains the witness-backed note commitment, Merkle leaf, and witness root metadata
- root registration endpoint succeeds
- the registered root remains the explicit current root
- tampered consume is rejected without mutating consume state across the full validated public surface:
  - `releaseDestination`
  - `assetId`
  - `amount`
  - `noteVersion`
- missing source note commitments, Merkle leaves, and witness roots are rejected at consume time
- tampered source note commitments, Merkle leaves, and witness roots are also rejected at consume time
- consume succeeds once after root registration
- replay is rejected
- successful consume records an explicit private-core release outcome carrying:
  - `nullifier`
  - `releaseDestination`
  - `releasedAssetId`
  - `releasedAmount`
  - deterministic `requestId`
  - deterministic `transitionNoteId`
- replay rejection leaves the private-core release state unchanged
- root state returns the explicit `currentRoot`
- consume state returns the explicit `latestConsume`
- release state returns the explicit `latestRelease`
- operator state endpoints reflect the registered root, consumed nullifier, and recorded release outcome

The repo now also has one canonical stack verification command:

```bash
npm run private-core:verify
```

That wrapper runs, in order:
- the app build
- the fixed-depth circuit regression
- the operator consume regression
- the operator HTTP smoke test
- one real local proof generation and verification pass

## Supporting repo artifacts

Updated or added:
- `src/zk/vantaPrivateCoreUnshieldProof.ts`
- `zk/noir/vanta_private_core_single_note_unshield/src/main.nr`
- `zk/noir/vanta_private_core_single_note_unshield/README.md`
- `scripts/write-vanta-private-core-unshield-fixture.mjs`
- `scripts/prove-vanta-private-core-unshield.mjs`
- `package.json`

Related boundary document:
- `docs/zk/vanta-private-core-unshield-proof-boundary.md`

## Important v0.1 limitations

This remains an explicitly narrow v0.1 proving lane.

Known limitations:
- the circuit now uses a dedicated Poseidon proving lane, `poseidon-bn254-proving-lane-v0`, while the broader app-side hash surfaces remain transitional
- source-layer X25519 owner authorization remains prevalidated off-circuit; the Unshield lane now additionally binds a Poseidon proof-owner key inside Noir, which is not the same as proving source X25519 ownership in-circuit
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
2. keep lightweight regression coverage around fixture writing and expected `nargo execute` success and failure behavior
3. align more of the broader app-side hash surfaces with the new Poseidon proving lane without breaking the current executable path

## Reproduction commands

From the repo root:

```bash
npm run private-core:verify
npm run private-core:check
npm run private-core:http-smoke
npm run private-core:prove
npm run private-core:consume-check
```

Manual path:

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

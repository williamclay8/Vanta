# Vanta Private Core Single-Note Unshield Circuit

## Fixed v0.1 circuit choice

- `MERKLE_DEPTH = 20`
- proving lane: `poseidon-bn254-proving-lane-v0`
- owner authorization: source-layer X25519 prechecked off-circuit; Noir proof lane binds a Poseidon proof-owner key

## Deterministic fixture source

Use:

- `getVantaPrivateCoreFixedDepthUnshieldFixtureV0()`

from:

- `src/zk/vantaPrivateCoreUnshieldProof.ts`

That helper yields:

- one valid boundary and Noir witness package
- one invalid witness package with a flipped direction bit

## Local exercise path

1. Ensure `nargo` is installed locally.
2. Run the full-stack verification wrapper when you want one canonical pass across build, circuit regression, operator consume semantics, and real proof generation:

```bash
npm run private-core:verify
```

This command:
- builds the app
- runs the fixed-depth circuit regression wrapper
- runs the operator consume regression wrapper
- runs a real HTTP smoke test against the private-core operator server endpoints
- generates and verifies one real local proof for the current lane

3. Run the canonical circuit regression wrapper when you only want the Noir-lane happy-path and negative-path check:

```bash
npm run private-core:check
```

This command:
- writes the valid fixture
- runs `nargo check`
- verifies the valid proving path succeeds
- verifies the invalid-direction witness fails
- verifies the invalid-owner-secret witness fails against the proof-owner key constraint
- restores the repo to the valid fixture state

4. Run the canonical local proof-generation command when you want one real proof and verification pass for the current lane:

```bash
npm run private-core:prove
```

This command:
- writes the valid fixture
- runs `nargo compile`
- runs `nargo execute`
- generates a real UltraHonk proof with `@aztec/bb.js`
- verifies that proof locally
- writes a proof receipt to `target/vanta_private_core_single_note_unshield.proof.json`
- restores the repo to the valid fixture state

5. Run the operator-backed consume seam check when you want to verify the first proof-plus-consume semantics for the current lane:

```bash
npm run private-core:consume-check
```

This command:
- generates and verifies a real local proof for the fixed-depth witness package
- confirms consume requires a root already known to the operator-side state view
- confirms the latest-root currentness rule can advance and be restored
- registers the fixture root for the current check
- records the first consume in a temporary operator-side nullifier store
- confirms the same nullifier is then seen as already consumed for replay purposes

6. Run the operator endpoint smoke test when you want to verify the same lane through the real HTTP server surface:

```bash
npm run private-core:http-smoke
```

This command:
- starts a temporary local operator server
- verifies the root, consume, and release state endpoints start with explicit empty-state summaries
- verifies the private-core status endpoints expose `stateVersion = 1`
- verifies the state endpoints advertise `GET` through CORS preflight for:
  - `/state/private-core-roots`
  - `/state/private-core-consumes`
  - `/state/private-core-releases`
- verifies `/private-core/unshield-proof`
- verifies `/private-core/unshield-consume` is rejected before root registration
- registers the root through `/private-core/register-root` using the full witness-backed source artifact bundle:
  - `noteCommitment`
  - `merkleLeaf`
  - `witnessRoot`
- verifies root registration is itself proof-backed through the current operator proof lane
- verifies the operator proof seam binds the verified proving-lane public input vector to the witness package public input vector
- verifies tampered root registration is rejected without mutating root state for the full validated public surface:
  - `releaseDestination`
  - `assetId`
  - `amount`
  - `noteVersion`
- verifies root registration also rejects missing source note commitments, Merkle leaves, and witness roots
- verifies tampered source note commitments, Merkle leaves, and witness roots are rejected at root registration
- verifies the registered root state retains the witness-backed note commitment, Merkle leaf, and witness root metadata
- verifies the registered root remains current after registration
- verifies tampered consume is rejected without mutating consume state for the full validated public surface:
  - `releaseDestination`
  - `assetId`
  - `amount`
  - `noteVersion`
- verifies consume also rejects missing source note commitments, Merkle leaves, and witness roots
- verifies tampered source note commitments, Merkle leaves, and witness roots are rejected at consume time too
- verifies consume succeeds once and replay is rejected
- verifies successful consume records an explicit private-core release outcome including:
  - `nullifier`
  - `releaseDestination`
  - `releasedAssetId`
  - `releasedAmount`
  - deterministic `requestId`
  - deterministic `transitionNoteId`
- verifies replay rejection leaves release state unchanged
- verifies the operator root state endpoint returns the explicit `currentRoot`
- verifies the operator consume state endpoint returns the explicit `latestConsume`
- verifies the operator release state endpoint returns the explicit `latestRelease`
- verifies the operator state endpoints reflect the registered root, consumed nullifier, and recorded release outcome

7. If you want to exercise fixture modes manually, materialize the fixture from the TypeScript helper into a Noir input file.
   Recommended helper:
   - `serializeVantaPrivateCoreNoirUnshieldWitnessPackageToToml(...)`
   Repo command:
   - `npm run private-core:fixture -- valid`
   - `npm run private-core:fixture -- invalid-direction`
8. Run:

```bash
nargo check
nargo execute
```

9. Use the invalid direction-bit witness package as the negative case and confirm execution fails.

## Important v0.1 note

This circuit path now uses a real Poseidon-based proving lane for the Noir boundary.
It is still a narrow v0.1 path, but it is no longer using the earlier additive placeholder hash lane.
The owner witness is no longer a liveness placeholder: the circuit derives the proof-owner key from the owner secret and binds that key into the proving note commitment and nullifier.
The source note owner key remains X25519 and is still prechecked outside Noir, so do not describe this lane as proving X25519 ownership in-circuit.

The new proof-generation command is a real local proving path, but it is not yet the same thing as product-path proof generation and verification inside the live app or operator flow.

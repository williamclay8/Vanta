# Vanta Private Core Single-Note Unshield Circuit

## Fixed v0.1 circuit choice

- `MERKLE_DEPTH = 3`
- proving lane: `poseidon-bn254-proving-lane-v0`
- owner authorization: prechecked off-circuit

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
2. Run the canonical regression wrapper:

```bash
npm run private-core:check
```

This command:
- writes the valid fixture
- runs `nargo check`
- verifies the valid proving path succeeds
- verifies the invalid-direction witness fails
- restores the repo to the valid fixture state

3. Run the canonical local proof-generation command when you want one real proof and verification pass for the current lane:

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

4. If you want to exercise fixture modes manually, materialize the fixture from the TypeScript helper into a Noir input file.
   Recommended helper:
   - `serializeVantaPrivateCoreNoirUnshieldWitnessPackageToToml(...)`
   Repo command:
   - `npm run private-core:fixture -- valid`
   - `npm run private-core:fixture -- invalid-direction`
5. Run:

```bash
nargo check
nargo execute
```

6. Use the invalid direction-bit witness package as the negative case and confirm execution fails.

## Important v0.1 note

This circuit path now uses a real Poseidon-based proving lane for the Noir boundary.
It is still a narrow v0.1 path, but it is no longer using the earlier additive placeholder hash lane.

The new proof-generation command is a real local proving path, but it is not yet the same thing as product-path proof generation and verification inside the live app or operator flow.

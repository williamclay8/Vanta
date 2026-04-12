# Vanta Private Core Single-Note Unshield Circuit

## Fixed v0.1 circuit choice

- `MERKLE_DEPTH = 3`
- proving lane: `field-additive-test-lane-v0`
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
2. Materialize the fixture from the TypeScript helper into a Noir input file.
   Recommended helper:
   - `serializeVantaPrivateCoreNoirUnshieldWitnessPackageToToml(...)`
   Repo command:
   - `npm run private-core:fixture -- valid`
   - `npm run private-core:fixture -- invalid-direction`
3. Run:

```bash
nargo check
nargo execute
```

4. Use the invalid direction-bit witness package as the negative case and confirm execution fails.

## Important v0.1 note

This circuit path is intentionally not the final protocol hash lane.
It is the first fixed-depth proving path that stays compatible with the current Vanta Private Core boundary while the final in-circuit hash and owner-auth contracts are still pending.

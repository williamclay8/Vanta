# Vanta Private Core Single-Note Swap Circuit

This workspace holds the first fixed-depth Noir circuit for the constrained Vanta Private Core swap lane.

## Scope

The current circuit stays intentionally narrow:

- one input note
- one output note
- fixed `MERKLE_DEPTH = 3`
- off-circuit owner auth for `v0.1`

It enforces:

- input note commitment recomputation
- input note -> Merkle leaf mapping
- fixed-depth Merkle root recomputation
- input nullifier recomputation
- output note commitment recomputation
- input/output asset binding
- input/output amount binding
- swap-context binding

## Commands

Write fixtures:

```bash
npm run private-core:swap-fixture -- valid
npm run private-core:swap-fixture -- invalid-direction
```

Run the regression wrapper:

```bash
npm run private-core:swap-check
```

Generate and verify a local proof:

```bash
npm run private-core:swap-prove
```

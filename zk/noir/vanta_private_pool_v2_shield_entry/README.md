# Vanta Private Pool v2 Shield Entry

This is the first narrow Noir lane for Option B.

It does **not** claim to be the full production private-pool circuit. It only proves that the route-specific shield-entry witness fields bind to one public Poseidon hash. That gives the TypeScript `createVantaPrivatePoolV2ShieldProofRequest` boundary a concrete Noir target before membership, nullifier, and on-chain append semantics are added.

## Current Binding

The circuit binds:

- request version
- source mint
- target mint
- target asset id
- amount
- owner commitment
- route commitment
- tree id
- leaf index
- output commitment
- output Merkle root

## Check

From the repo root:

```bash
npm run private-pool-v2:shield-circuit-check
```

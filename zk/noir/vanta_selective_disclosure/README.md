# vanta_selective_disclosure Noir Circuit (Phase 2 Starter)

This is the first real Noir circuit for Vanta's selective disclosure primitive, transitioning from the JS commitment simulations in the 5 Products (Products 1 Compliance Gateway, etc.).

## Purpose
- Prove `amount > threshold` (for "amountAboveThreshold" selective disclosure)
- Prove `jurisdiction == expected_jurisdiction` (for "jurisdictionMatch")
- Bind private amount to a public `amount_commitment` (hash(amount, blinding)) for verifiability without revealing the amount.
- Client-side provable, regulator-verifiable.
- Fail-closed: beta, not production private or regulator-approved. See claimBoundary in related artifacts.

## Files
- Nargo.toml: package + poseidon dep (matching other Vanta Noir circuits)
- Prover.toml: example witness (amount=150, threshold=100, jurisdiction=1 for US)
- src/main.nr: the circuit logic + test
- (target/ will be generated on `nargo build` / `nargo test`)

## Usage (after noirup / nargo in PATH)
```bash
cd zk/noir/vanta_selective_disclosure
nargo build
nargo test
nargo prove --oracle_hash sha256  # or appropriate
nargo verify
```

Public inputs for proof: threshold, expected_jurisdiction, amount_commitment

## Integration Plan (Phase 2)
- Wire proof generation in src/zk or browser worker (extend existing private-pool adapters).
- On-chain: add verifier program or CPI to vanta_private_pool_v2_spend for selective disclosure proofs (alongside existing Groth16/C01).
- Client SDK (Product 4): add real proving path using this circuit + WASM.
- Use in Compliance Gateway (Product 1), Velocity (Product 5), RWA (Product 3), Perps (Product 2) for institutional selective facts.
- Update dashboard/UI to request/verify disclosures.
- Reference: Selective-Disclosure-Primitive-Spec-*.md, Institutional-Settlement-Lane-Plan-Updated-2026-06-07.md

## Verification
- From repo root: `npm run zk:selective-disclosure-circuit-check`
- Phase 2 aggregate: `npm run zk:phase2-product-circuits-check`
- Matches the JS simulation in scripts/demo-*-compliance-gateway.mjs and vantaComplianceGateway.ts (amountAboveThreshold, jurisdictionMatch).
- Extends to all 5 products via SDK primitives.

**Claim boundary**: beta-selective-disclosure-not-production-private-or-regulator-approved

**Lumi**: Local files only. No builds/pushes yet. Vault synced.

Next: full Phase 2 plan, more circuits (velocity aggregate, RWA ownership, perps position), Solana verifier integration, client proving.

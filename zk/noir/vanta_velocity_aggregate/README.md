# vanta_velocity_aggregate Noir Circuit (Phase 2)

Second real Noir circuit starter for Vanta Private Velocity Intelligence Platform (Product 5) and composable use across the 5 products.

## Purpose
- Prove private `velocity_sum` (aggregate volume/transfers in a period) > `threshold` without revealing exact sum or history.
- Bind to `velocity_commitment` (poseidon hash) for verifiability.
- Support time-bound periods (public for audit, private details hidden).
- Optional compliance facts (jurisdiction, accredited) for selective disclosure / institutional use.
- Enables redacted dashboards ("velocity in range X-Y"), SDK predicate composer, velocity intelligence flows.

## Relation to 5 Products
- Core for Product 5: Private Velocity Intelligence (aggregates, periods, nullifier rollovers, compliance facts).
- Extends Product 4 SDK (composable primitives, marketplace).
- Used in Product 1 Compliance Gateway (velocityAboveThreshold disclosures).
- Foundation for RWA (private ownership velocity), Perps (position velocity/liquidation risk).

## Files
- Nargo.toml (poseidon bn254, matching Vanta pattern)
- Prover.toml (example: sum 450k > 300k, US jurisdiction, accredited, 24h period)
- src/main.nr (circuit + test)
- README (this)

## Build / Test (after noir in PATH)
```bash
cd zk/noir/vanta_velocity_aggregate
nargo build
nargo test
nargo prove
```

From repo root:
```bash
npm run zk:velocity-aggregate-circuit-check
npm run zk:phase2-product-circuits-check
```

Public inputs: threshold, velocity_commitment, period_start, period_end, (optional expected_*)

## Phase 2 Integration
- Reuse patterns from vanta_selective_disclosure and existing Vanta Noir (poseidon, commitments).
- Client: noir-wasm or equivalent in browser worker / SDK.
- On-chain: verifier CPI in private_pool_v2_spend or dedicated.
- Wire with existing velocity JS (src/velocity/vantaPrivateVelocityIntelligence.mjs) for hybrid sim/real.
- Update gates, dashboards, institutional flows per Institutional-Settlement-Lane-Plan.

**Claim boundary**: beta-private-velocity-not-production-private-analytics-or-dashboards

**Lumi**: Local source only. Vault plan and roadmap updated. Root-level package check is wired for local `nargo` validation.

Next in Phase 2: more circuits (RWA ownership, perps position), Solana integration, client proving, full evidence.

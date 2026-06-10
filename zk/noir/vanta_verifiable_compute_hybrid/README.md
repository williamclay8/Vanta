# vanta_verifiable_compute_hybrid

**Purpose**: T6 Verifiable Compute Layer (SP1 + Nova Folding / Veria Integration) hybrid extension for Phase 2 Noir circuits. Combines velocity aggregate predicates (Product 5) with verifiable compute (off-chain RISC-V zkVM + recursive aggregation + on-chain verification at low cost). Enables hybrid ZK proofs for velocity intelligence, disclosure, and oracles while maintaining client-side proving (Noir blindness) and institutional confidential execution.

Ties to:
- T1 Usage Velocity (encrypted compute metrics: computations, folding depth, cost savings).
- T2 Local/Client-Side Proving (Noir blindness + hybrid compute).
- T3 Institutional Lane (confidential execution + time-bound audit).
- T4 Hybrid ZK (SP1/Nova folding + MPC+ZKP from Arcium signals; verifiable compute as non-ZK complement).
- T6 Verifiable Compute (direct implementation target from 2026-06-08 X research pass).

**Nargo Commands** (when noirup/nargo available):
- `npm run zk:verifiable-compute-hybrid-circuit-check`
- `cd zk/noir/vanta_verifiable_compute_hybrid && nargo build`
- `nargo test`
- `nargo prove` / `nargo verify` (with Prover.toml witnesses)

**Public Inputs**: threshold, period_start, period_end, velocity_commitment, expected_jurisdiction, compute_cost, folding_depth.

**Integration Notes**:
- Client: Extend vanta-client-sdk or src/zk with noir-wasm/bb.js path; hybrid with sim until real proofs. Use @veria/sdk or sp1-solana crate for SP1 folding.
- On-chain: Extend programs/vanta_private_pool_v2_spend with CPI for hybrid proof verification (Anchor verifier pattern from Veria).
- SDK Composer (Product 4/5): Add composeVerifiableCompute(velocityCommitment, computeCost, foldingDepth) for selective + velocity facts.
- Benchmarks: Arcium ~258k computations / 25+ dApps as velocity signal; Veria 99.98% cost savings as hybrid target.

**ClaimBoundary**: beta-verifiable-compute-hybrid-not-production-private-or-onchain-verified. Pre-circuit validation bridge only. No regulator approval, live deployment, or production privacy claims.

**Evidence (2026-06-08 autonomous chunk)**: Full boilerplate created + ls/cat/grep verification + T6 wiring in state.yaml + guard PASS + cadence note. Integrates Veria/SP1 patterns into Noir for Phase 2 velocity/disclosure.

References: Veria repo (veria-la/veria-core), sp1-solana, Arcium explorer, 2026-06-08 Twitter-Pass-Cadence note, phase-2-real-zk-noir-pattern.md.

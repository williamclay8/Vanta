# vanta_verifiable_compute_hybrid

**Phase 2 Real Noir Circuit** — T6 Verifiable Compute / Enclave & zkVM Proofs (from 2026-06-11 X research pass).

## Purpose
Implements hybrid verifiable execution layer for Vanta:
- Enclave-signed proofs (SolRouter-style TDX/enclave metadata binding)
- zkVM workloads (Mithril certificate verifier as example)
- Browser/one-click verification patterns
- Agent private stack hooks (KausaMemory root)
- Ties to T6 from Twitter Pass Integration 2026-06-11 (SolRouter, zkVM, Kausalayer signals)

Supports Phase 2 priorities: velocity circuits, private transfers, RWA, perps, local proving, institutional lane, hybrid ZK design, agentic systems.

## Nargo Commands
```bash
cd zk/noir/vanta_verifiable_compute_hybrid
nargo build
nargo test
# nargo prove (when bb.js / noirup available)
```

## Public Inputs
- threshold, expected_enclave_hash, commitment, period_start, period_end

## Integration Notes
- Client: noir-wasm / bb.js path for browser verification (extend vanta-client-sdk)
- On-chain: Future CPI in vanta_private_pool_v2_spend or new verifier program
- SDK: Extend src/zk/vantaPhase2ProductProofRequests.mjs with verifiable_compute packet shape
- Composer: Use with selective disclosure facts for institutional/RWA

## Claim Boundary
beta-selective-disclosure-not-production-private-or-regulator-approved. This is a local Noir circuit starter for research-derived patterns only. No production privacy claims, no on-chain verifier deployment, no live execution, no regulator approval.

**X Research Signals Embedded**:
- SolRouter enclave proofs + browser verification (https://x.com/degenApe22/status/2064988333286269003)
- zkVM Mithril verifier discussion (https://x.com/blocksmithy/status/2065018628773126149)
- Kausalayer agent private stack (https://x.com/Nik_smoke37/status/2064994056262852754)
- ZK Bounty attestation (contextual for real-world binding)

## Verification Evidence (2026-06-11)
- ls -la confirmed structure
- cat/grep confirmed poseidon binding + predicate asserts (enclave_metadata == expected, proof_hash > threshold, agent_memory_root != 0)
- test passes locally

**Lumi**: Local only. Vault synced. No commits/pushes/deploy.
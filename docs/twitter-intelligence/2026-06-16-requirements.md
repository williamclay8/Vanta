# Twitter Intelligence Requirements - 2026-06-16

This file turns the June 16 2026 SuperGrok/Hermes ZK + Solana research brief into repo-local Vanta Phase 2 work. It is a claim-control artifact, not a marketing page and not proof of Vanta adoption.

Source surfaces:

- Local momentum bank checked: `/Users/clay/.hermes/skills/supergrok-research/references/zk-solana-momentum-2026-06.md`.
- Recovered cron receipt: `/Users/clay/.hermes/cron/output/f056aad8568e/2026-06-16_00-20-41.md`.
- Local source status: the checked momentum bank initially had sections through the June 13 run plus an escaped June 14 append, but no June 16 section. The June 16 cron receipt was recovered locally and restored into the momentum bank after implementation started.
- Pasted implementation brief: `/Users/clay/.codex/attachments/88ba8940-def7-46c4-9302-d09dc356d0d9/pasted-text.txt`.
- Prior repo/vault baseline: June 10-13 Vanta Twitter intelligence requirements, Phase 2 Noir starter circuits, Medusa reputation plan, selective-disclosure v0.3 spec, and Phase 2 product proof request packet code.

Source boundary: the named June 16 momentum-bank section was not present locally when implementation began; the June 16 items labeled below as cron-backed are backed by recovered cron output, not by the initially checked momentum-bank file.

Claim labels used here:

- `prior momentum-bank-backed support`: present in the local momentum bank available during this pass before the recovered cron output was restored.
- `cron-output-backed`: present in the recovered Hermes June 16 cron receipt and restored into the local momentum bank for future freshness checks.
- `pasted-brief-backed`: requested by Clay's pasted June 16 brief, but not present in the recovered June 16 cron receipt.
- `Vanta design inference`: Vanta-specific implementation design derived from the source item, not a claim about the external project.

## Current Scope

The June 16 packet adds eight mandatory T22-T29 requirements, ordered by Vanta Phase 2 priority:

1. Voidral-style anonymity pools and unlinkable wallet private transfers.
2. Medusa x xona-style agent eligibility gating with one-line x402 proof-header UX.
3. Arcium-scale confidential compute benchmarks for hybrid ZK.
4. Privacy Pools-style clean provenance selective disclosure.
5. FHE and quantum-resistant encrypted-compute comparison lanes.
6. Ecosystem tailwinds and token/traction notes that sharpen positioning without lifting claims.
7. Helius LaserStream compressed-account-stream benchmark for privacy monitoring and sybil resistance.
8. Noir profiler cost discipline for Vanta Noir starter circuits before maturity claims.

## T22 - Anonymity Pools / Unlinkable Wallet Private Transfers

Source label: `pasted-brief-backed`, with `prior momentum-bank-backed support` from DarkDrop credit-note/private-transfer work and Noir amount-hiding/stealth/selective-disclosure patterns in the local bank.

Voidral is called out in the pasted brief as a high-signal source for anonymity pool and unlinkable-wallet primitives. Vanta should treat this as the cleanest extension of existing `vanta_private_credit_note_transfer`: build a transfer proof that binds amount bucket, recipient commitment, relayer context, anonymity root, and one-time nullifier without exposing sender wallet history or exact amount.

Required fields:

- `anonymity_pool_unlinkable_wallet_details`
- `Voidral`
- `anonymity pool`
- `unlinkable wallet`
- `amount-hiding`
- `relayer context`
- `MEV resistance`
- `nullifier`
- `receipt-bound private transfer`

Implementation targets:

- `zk/noir/vanta_unlinkable_transfer_plus`
- `docs/zk/phase2-june16-research-circuit-specs.md`
- future TS proof request target: `unlinkableTransferPlus`

Limitation: this is not a live mixer, not Voidral integration, not a production private transfer, not anonymity-set evidence, not relayer privacy evidence, and not mainnet settlement.

## T23 - Agentic Eligibility Gating / x402-Style Proof Headers

Source label: `pasted-brief-backed`, with `prior momentum-bank-backed support` from June 12 zkRune/Xona and June 13 Medusa client-side reputation/eligibility signals.

The brief asks for Medusa x xona_agent integration patterns: local eligibility proofs, one-line x402-style UX, and on-chain USDC settlement. Vanta should convert this into a local proof-header contract: the app proves an agent or user satisfies a policy, sends only a proof receipt/header across the boundary, and keeps eligibility inputs local.

Required fields:

- `agentic_eligibility_gate_details`
- `Medusa`
- `xona_agent`
- `x402`
- `client-side Groth16`
- `eligibility proof header`
- `on-chain settlement policy`
- `USDC settlement`
- `fail closed`

Implementation targets:

- `zk/noir/vanta_agent_eligibility_gate`
- `docs/zk/phase2-june16-research-circuit-specs.md`
- future TS proof request target: `agentEligibilityGate`

Limitation: this is not live x402 endpoint support, not Xona integration, not Medusa integration, not real USDC settlement, not wallet authorization, not signing, and not production agent privacy.

## T24 - MPC / Confidential Compute Benchmark for Hybrid ZK

Source label: `pasted-brief-backed` for the `224M MPC rounds` detail, with `cron-output-backed` support for June 16 Arcium/Solana Summit privacy-infra interest and `prior momentum-bank-backed support` from Arcium/ZINC production-traction and encrypted-compute entries in the local bank.

The brief says the Arcium scale update should benchmark confidential/MPC execution for Vanta's hybrid ZK lane and mentions 224M MPC rounds. The recovered cron receipt supports Arcium as a June 16 privacy/encrypted-computation benchmark but does not contain the 224M detail, so Vanta must keep the scale number source-labeled as pasted-brief-only. The reusable benchmark discipline still applies: every hybrid design claim must state what is proven by ZK, what is asserted by MPC/confidential compute, what is signed or verified on-chain, and what remains an external trust boundary.

Required fields:

- `mpc_confidential_compute_benchmark_details`
- `Arcium`
- `224M MPC rounds`
- `confidential execution`
- `hybrid ZK`
- `on-chain verification primitive`
- `verifier registry`
- `external trust boundary`

Implementation targets:

- `docs/zk/hybrid-zk-confidential-compute-benchmark-2026-06-16.md`
- future extension to `zk/noir/vanta_verifiable_compute_hybrid`
- future TS proof request target: `confidentialComputeBenchmark`

Limitation: this is not proof that Vanta runs MPC, not Arcium integration, not live confidential compute, not TEE safety evidence, not FHE support, and not production verifier readiness.

## T25 - Compliance-Aware Clean Provenance Selective Disclosure

Source label: `pasted-brief-backed`, with `prior momentum-bank-backed support` from June 13 Midnight/Concordium selective disclosure and June 12 institutional privacy signals.

Privacy Pools is called out as the source pattern for clean-provenance disclosure. Vanta should add an institutional and RWA-friendly predicate that proves a provenance score or membership fact without revealing the account graph or raw transaction history. This extends selective disclosure v0.3 rather than replacing it.

Required fields:

- `clean_provenance_selective_disclosure_details`
- `Privacy Pools`
- `0xbow`
- `clean provenance`
- `compliance-aware selective disclosure`
- `institutional lane`
- `RWA`
- `account graph stays private`

Implementation targets:

- `zk/noir/vanta_clean_provenance_disclosure`
- `docs/zk/phase2-june16-research-circuit-specs.md`
- future TS proof request target: `cleanProvenanceDisclosure`

Limitation: this is not Privacy Pools integration, not legal/compliance approval, not regulator acceptance, not sanction-screening support, not live clean-funds scoring, and not production institutional readiness.

## T26 - FHE / Quantum-Resistant Encrypted Compute Comparison

Source label: `pasted-brief-backed`.

Nulla Network, Fhenix, and RedactMoney are requested as comparison items for Vanta's hybrid ZK and confidential-compute lane. The implementation action is not to add FHE or quantum-resistant cryptography into Vanta immediately. The action is to record a decision matrix that separates:

- ZK: succinct predicate proof and verifier-friendly receipts.
- MPC/confidential compute: private execution and shared-state computation with external trust and availability boundaries.
- FHE: encrypted-state computation with heavier runtime and key-management tradeoffs.
- Quantum-resistant encrypted compute: research/watch item only until primitives, libraries, threat model, and chain verification path are concrete.

Required fields:

- `fhe_quantum_resistant_compute_comparison_details`
- `Nulla Network`
- `Fhenix`
- `RedactMoney`
- `FHE vs ZK`
- `quantum-resistant encrypted compute`
- `watch item only`

Implementation targets:

- `docs/zk/hybrid-zk-confidential-compute-benchmark-2026-06-16.md`
- `02 Projects/Hybrid-ZK-Confidential-Compute-Benchmark-2026-06-16.md`

Limitation: this is not FHE implementation, not post-quantum security, not quantum-resistant Vanta, not audited cryptographic migration, and not production hybrid privacy.

## T27 - Ecosystem Tailwinds, Competitive Positioning, and Token/Traction Discipline

Source label: `pasted-brief-backed` plus `cron-output-backed` Helius/ZkMedusa context and `prior momentum-bank-backed support` from Helius/Light, Arcium/ZINC, Zcash/privacy narrative, Privacy Cash volume, and fair-launch/revenue-recycle items.

The supporting items are useful as positioning and prioritization signals, not as Vanta proof. Helius/Light, Arcium, Zcash/privacy narratives, hackathons, Privacy Cash traction, Streamflow locks, fair launch mechanics, and revenue recycle patterns should sharpen Vanta's roadmap discipline:

- ship real proof artifacts before narrative expansion
- keep local proving and receipts as the differentiator
- treat traction benchmarks as external comparators, not Vanta usage
- keep token mechanics secondary to product utility and verifiable receipts

Required fields:

- `ecosystem_tailwinds_positioning_details`
- `Helius`
- `Light`
- `Privacy Cash`
- `Zcash`
- `Streamflow locks`
- `fair launch`
- `revenue recycle`
- `external comparator not Vanta usage`

Implementation targets:

- `docs/twitter-intelligence/2026-06-16-requirements.md`
- `02 Projects/Twitter-Pass-Integration-2026-06-16.md`

Limitation: this is not Vanta token guidance, not launch approval, not fundraising advice, not adoption evidence, not public posting approval, and not a claim that Vanta has comparable volume or partnerships.

## T28 - Helius LaserStream Privacy Monitoring Benchmark

Source label: `cron-output-backed`.

The recovered June 16 cron receipt surfaces `Helius LaserStream Upgrade` as the strongest build-leverage item in that window: compressed/cuckoo filters for tracking very large Solana account sets with 3-4 bytes per account and up to 10x wire reduction. Vanta should treat this as an observability benchmark for privacy-system monitoring, sybil resistance, large-account-set scanning, and bandwidth-aware agent tooling.

Required fields:

- `helius_laserstream_privacy_monitoring_details`
- `Helius LaserStream`
- `compressed filters`
- `cuckoo filters`
- `3-4 bytes/account`
- `10x wire reduction`
- `privacy monitoring`
- `sybil detection`
- `large account set monitoring`
- `external comparator not Vanta throughput`

Implementation targets:

- `docs/twitter-intelligence/2026-06-16-requirements.md`
- future monitoring design target: `privacyMonitoringAccountStreamBenchmark`

Limitation: this is not Helius integration, not LaserStream usage by Vanta, not throughput evidence, not surveillance approval, not account deanonymization, and not production monitoring.

## T29 - Noir Profiler Circuit Cost Discipline

Source label: `cron-output-backed`.

The recovered June 16 cron receipt surfaces `Noir profiler tool` as a concrete tool for measuring opcode, ACIR, gate, and proving-cost hotspots. Vanta should require profiler discipline before upgrading any starter Noir circuit from design sketch to mature proof primitive.

Required fields:

- `noir_profiler_circuit_cost_discipline_details`
- `Noir profiler`
- `interactive flamegraphs`
- `ACIR opcodes`
- `gates`
- `real proving cost`
- `unconstrained hotspots`
- `dynamic array writes`
- `not circuit maturity proof`

Implementation targets:

- `docs/zk/phase2-june16-research-circuit-specs.md`
- future circuit-hardening target: `noirProfilerReceipt`

Limitation: this is not proof generation, not audited optimization, not circuit soundness, not production proving performance, and not a claim that current Vanta starter circuits are mature.

## Priority Map

| ID | Vanta priority | Item | Priority | Effort | First artifact |
| --- | --- | --- | --- | --- | --- |
| T22 | T5 private transfers, T1 velocity | Anonymity pools / unlinkable wallets | P0 | M | `zk/noir/vanta_unlinkable_transfer_plus` |
| T23 | T2 local proving, agentic systems | Agentic eligibility gating | P0 | M | `zk/noir/vanta_agent_eligibility_gate` |
| T24 | T4 hybrid ZK | MPC/confidential compute benchmarks | P1 | S | hybrid benchmark doc |
| T25 | T3 institutional, RWA | Clean provenance disclosure | P1 | M | `zk/noir/vanta_clean_provenance_disclosure` |
| T26 | T4 hybrid ZK | FHE / QR encrypted compute comparison | P2 | S | decision matrix |
| T27 | T1 velocity/PMF, positioning | Ecosystem/token/traction discipline | P2 | S | integration note |
| T28 | T1 velocity/PMF, T4 hybrid ZK | Helius LaserStream observability benchmark | P1 | S | requirements addendum |
| T29 | T2 local proving, Phase 2 circuits | Noir profiler cost discipline | P1 | S | circuit-spec addendum |

## Verification

Run the local standalone check added for this slice:

```bash
node scripts/check-twitter-pass-2026-06-16-research-artifacts.mjs
npm run twitter-pass-2026-06-16-research-artifacts-check
```

Circuit-level checks:

```bash
nargo test --package vanta_unlinkable_transfer_plus
nargo test --package vanta_agent_eligibility_gate
nargo test --package vanta_clean_provenance_disclosure
```

The standalone checker runs `nargo test` in each new circuit directory when `nargo` is available. These commands prove repo-local artifacts and toy circuit predicates only. They do not prove generated browser proofs, Solana verifier programs, live endpoints, production privacy, live adoption, legal/compliance approval, audit acceptance, mainnet readiness, signing, broadcast, deployment, or real-funds movement.

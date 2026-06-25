# Twitter Intelligence Requirements - 2026-06-13

This file turns the June 13 2026 Supergrok/Hermes X research run into repo-local product gates. It is a claim-control artifact, not a marketing page and not external proof of Vanta adoption.

Source section: `/Users/clay/.hermes/skills/supergrok-research/references/zk-solana-momentum-2026-06.md`, "June 13, 2026 Run (Primary Window: since 2026-06-12)".

## Current Scope

The June 13 run adds five mandatory T17-T21 requirements, ordered by Vanta Phase 2 priority:

1. Medusa-style client-side reputation and eligibility attestation.
2. Midnight-style selective disclosure for agents and institutional compliance.
3. Concordium-style identity plus ZK compliance without full disclosure.
4. Noir-on-Solana integration and cross-chain verifier opportunity.
5. Sedna lightweight hybrid privacy benchmark.

## T17 - Medusa Client-Side Reputation Attestation

Medusa is the strongest new local-proving signal from the run: a Solana privacy layer for wallet reputation, eligibility, allowlists, and credibility using ZK proofs. The benchmark UX is: "Generate proof -> Verify on-chain -> Keep wallet private." Vanta should convert this into a client-side eligibility/reputation primitive for velocity, RWA, private transfers, perps access, and agentic receipts.

Required fields:

- `medusa_client_side_reputation_attestation_details`
- `Generate proof -> Verify on-chain -> Keep wallet private`
- private eligibility gating
- wallet reputation without exposing full transaction history
- passport-style claim wallet pattern
- X refs: `https://x.com/ZkMedusa/status/2065551465771585854`, `https://x.com/i/status/2065497636246028770`

Limitation: this is not Vanta Medusa integration, wallet-history scoring, production allowlist enforcement, live eligibility gating, or token evidence.

## T18 - Midnight Selective Disclosure for Agents and Compliance

Midnight surfaced programmable privacy with rational/selective disclosure: users and agents choose what remains private and what is disclosed for compliance or verification. For Vanta, this sharpens the institutional lane from amount/jurisdiction proofs into policy-scoped, time-bound disclosure packets for AI agents, RWA counterparties, and compliance reviewers.

Required fields:

- `midnight_selective_disclosure_agent_compliance_details`
- rational/selective disclosure
- private-by-default on-chain AI agent interactions
- user data and agent behavior disclosure scopes
- compliance-aware proof packets
- X ref: `https://x.com/CardanoAftrDark/status/2065576650461659270`

Limitation: this is not Midnight integration, legal/compliance approval, private smart contract support, or production agent privacy evidence.

## T19 - Concordium Identity + ZK Agent/Institutional Pattern

Concordium is tracked as an identity-plus-ZK benchmark: protocol-level identity combined with privacy for humans and AI agents, avoiding the false choice between privacy and compliance. Vanta should study this as a selective-disclosure identity envelope, not as a reason to expose identity publicly.

Required fields:

- `concordium_identity_zk_agent_institutional_details`
- protocol-level identity
- ZK privacy for humans and AI agents
- privacy or compliance false choice
- identity envelope for institutional selective disclosure
- X ref: `https://x.com/barondickson/status/2065566719855235083`

Limitation: this is not Vanta identity-provider integration, KYC/compliance approval, regulator acceptance, or production identity proof evidence.

## T20 - Noir on Solana Integration Opportunity

Noir is now directly available on Solana according to the run, validating Vanta's existing Noir-first Phase 2 starter and creating an integration watch lane for verifier programs, examples, client proving, and cross-chain Noir usage.

Required fields:

- `noir_on_solana_integration_details`
- Noir directly available on Solana
- Aztec / NoirLang / Solana payments watch
- verifier program examples
- cross-chain Noir opportunity
- X refs: `https://x.com/aztecnetwork/status/2065488233627365572`, `https://x.com/i/status/2065488221195341869`, `https://x.com/i/status/2064424103369666848`

Limitation: this is not Vanta production Noir verifier readiness, generated Groth16/Solana verifier evidence, audit acceptance, or deployed on-chain proof verification.

## T21 - Sedna Lightweight Hybrid Privacy Benchmark

Sedna is tracked as a lightweight hybrid privacy benchmark: a multi-proposer design described as solving most privacy leakage with a tiny fraction of the engineering effort of full ZK. Vanta should benchmark this class of lighter mechanisms against full ZK and use it to sharpen hybrid design decisions around sequencing, spam resistance, relayers, batching, jitter, state channels, and metadata leakage.

Required fields:

- `sedna_lightweight_hybrid_privacy_benchmark_details`
- 90% of privacy problem
- 0.01% engineering effort
- lightweight privacy primitives
- hybrid ZK benchmark
- X ref: `https://x.com/jayendra_jog/status/2065508685657567452`

Limitation: this is not a reason to weaken Vanta proof requirements. It is a benchmark for metadata privacy, sequencing, and UX cost, while production privacy claims remain locked behind Vanta's existing proof, verifier, custody, anonymity, and review gates.

## Verification

Run:

```bash
npm run twitter-pass-2026-06-13-medusa-reputation-check
npm run twitter-pass-2026-06-13-midnight-selective-disclosure-check
npm run twitter-pass-2026-06-13-concordium-identity-zk-check
npm run twitter-pass-2026-06-13-noir-solana-integration-check
npm run twitter-pass-2026-06-13-sedna-hybrid-privacy-check
npm run twitter-intelligence:check
```

These commands prove repo-local wiring only. They do not prove live adoption, production privacy, audit acceptance, legal/compliance approval, institutional customers, public API access, hardware support, mainnet readiness, exchange listings, partnerships, signing, broadcast, deployment, or real-funds movement.

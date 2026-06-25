# Twitter Intelligence Requirements - 2026-06-17

This file turns the June 17 2026 SuperGrok/Hermes ZK + Solana research pass into repo-local Vanta Phase 2 work. It is a claim-control artifact, not a marketing page and not proof of Vanta adoption.

Source surfaces:

- Required momentum bank checked: `/Users/clay/.hermes/skills/supergrok-research/references/zk-solana-momentum-2026-06.md`.
- Local source limitation: the checked momentum bank did not expose a retrievable `## June 17` heading during implementation.
- June 17 Hermes cron receipts used: `/Users/clay/.hermes/cron/output/f056aad8568e/2026-06-17_02-05-51.md`, `/Users/clay/.hermes/cron/output/706e494b5d35/2026-06-17_07-03-34.md`, and `/Users/clay/.hermes/cron/output/ef4569b9417c/2026-06-17_14-03-26.md`.
- Targeted deep-read receipt: `credential_source=xai-oauth`, `provider=xai`, `tool=x_search`, `model=grok-4.20-reasoning`, `social_write_performed=false`.
- Public corroborating artifacts: Helius Privacy page, Helius/Light acquisition blog, Light Protocol GitHub repo, and NIST FIPS 203 ML-KEM.

Claim labels used here:

- `june17-hermes-backed`: present in June 17 Hermes cron or targeted x_search output.
- `public-web-backed`: present in the public Helius/Light/NIST pages inspected during implementation.
- `Vanta design inference`: Vanta-specific implementation design derived from the source item, not a claim about the external project.

## Current Scope

The June 17 pass adds five mandatory T30-T34 requirements, ordered by Vanta Phase 2 priority:

1. ZkMedusa-style local passport reputation and eligibility gating.
2. Fail-closed proof-header SDK wrapper for passport/reputation predicates.
3. Arcium-style post-quantum resilience roadmap for hybrid ZK/confidential compute.
4. Helius-style delegated privacy-ring capability metadata.
5. VeerTx / Privacy Cash private bridge-intent watch item.

## T30 - Passport Reputation Gate

Source label: `june17-hermes-backed`.

ZkMedusa's June 17 signal centered on local passport verification, tier gating, allowlists, private access control, and "no surveillance" framing. Stock npm could not install the surfaced `solana:` package spec, so Vanta should adopt the pattern as a Vanta-owned circuit and wrapper, not as an external SDK dependency.

Required fields:

- `passport_reputation_gate_details`
- `ZkMedusa`
- `passport-sdk`
- `local verification`
- `tier gating`
- `allowlists`
- `claim wallet`
- `no surveillance`
- `private reputation`
- `fail closed`

Implementation targets:

- `zk/noir/vanta_passport_reputation_gate`
- `src/zk/vantaPassportEligibility.ts`
- `docs/zk/vanta-phase2-update-2026-06-17-signals.md`

Limitation: this is not a ZkMedusa integration, not a verified SDK import, not a production allowlist, not live Solana verification, not wallet authorization, and not production private reputation.

## T31 - Passport Proof Header Wrapper

Source label: `Vanta design inference`.

Vanta should expose a one-call local proof-header path that resolves an active policy, derives public inputs, generates and verifies the proof locally, checks verifier registry status, checks nullifier reuse, and returns only the redacted proof header.

Required fields:

- `passport_proof_header_wrapper_details`
- `passportReputationGate`
- `vanta-passport-eligibility-header-v0.1`
- `publicInputHash`
- `eligibilityNullifier`
- `redactedFields`
- `local-proof-header-candidate`
- `unknown policy`
- `stale verifier`
- `duplicate nullifier`

Implementation target:

- `src/zk/vantaPassportEligibility.ts`

Limitation: this is not browser-worker wiring, not generated proof evidence, not a Solana mutation path, not a wallet connection, and not production private access control.

## T32 - Post-Quantum Resilience Plan

Source label: `june17-hermes-backed` plus `public-web-backed`.

Arcium's June 17 post-quantum thread identifies a modular path: hash/LPN-heavy core assumptions, replace ECDH with ML-KEM/Kyber in base OTs, and use session-key caching to reduce expensive cryptographic operations. NIST FIPS 203 is the public ML-KEM reference.

Required fields:

- `post_quantum_resilience_plan_details`
- `Arcium`
- `post-quantum`
- `LPN`
- `ML-KEM`
- `Kyber`
- `base OTs`
- `session key caching`
- `crypto-suite registry`
- `no PQ claims`

Implementation target:

- `docs/zk/vanta-phase2-update-2026-06-17-signals.md`
- future verifier registry metadata

Limitation: this is not post-quantum Vanta, not proof-system migration, not audited cryptography, not production encrypted compute, and not a claim that Groth16/BN254 is quantum-resistant.

## T33 - Delegated Privacy Ring Capabilities

Source label: `public-web-backed`.

Helius Privacy exposes a delegate shape with owner, optional ring id, delegate endpoint, capabilities, expiry, and owner signature. Vanta should mirror the capability idea for verifier/delegate registry metadata without adding a dependency on Helius until APIs and SDKs are public.

Required fields:

- `delegated_privacy_ring_capability_details`
- `HeliusPrivacy`
- `Light Protocol`
- `setDelegate`
- `privacy rings`
- `capabilities`
- `view`
- `sync`
- `proof`
- `relay`
- `ownerSignature`

Implementation target:

- future verifier/delegate registry spec

Limitation: this is not Helius integration, not private transfer API access, not a ring deployment, not live relay, and not institutional compliance approval.

## T34 - Private Bridge-Intent Watch Item

Source label: `june17-hermes-backed`.

The VeerTx / Privacy Cash June 17 signal confirmed private ZEC bridging demand and fast UX iteration, but no repo, contract, proof format, relayer design, or MEV mechanism surfaced. Vanta should treat it as a watch item and only add a bridge-intent receipt placeholder if needed for future design work.

Required fields:

- `private_bridge_intent_watch_details`
- `VeerTx`
- `Privacy Cash`
- `private ZEC bridging`
- `private payments`
- `Solana`
- `Base`
- `bridgeIntentHash`
- `destinationReceiptCommitment`
- `watch item`

Implementation target:

- `docs/zk/vanta-phase2-update-2026-06-17-signals.md`

Limitation: this is not a bridge, not ZEC support, not cross-chain settlement, not MEV resistance, not a relayer design, and not production private transfers.

## Priority Map

| ID | Vanta priority | Item | Priority | Effort | First artifact |
| --- | --- | --- | --- | --- | --- |
| T30 | T2 local proving, agentic systems | Passport reputation gate | P0 | M | `zk/noir/vanta_passport_reputation_gate` |
| T31 | T2 local proving, SDK proof boundary | Passport proof header wrapper | P0 | S | `src/zk/vantaPassportEligibility.ts` |
| T32 | T4 hybrid ZK, long-term resilience | Post-quantum resilience metadata | P1 | S | June 17 synthesis doc |
| T33 | T3 institutional, delegated disclosure | Privacy-ring capability metadata | P1 | S | future registry spec |
| T34 | T5 private transfers | Private bridge-intent watch item | P2 | S | June 17 synthesis doc |

## Verification

Run the local standalone check added for this slice:

```bash
npm run twitter-pass-2026-06-17-research-artifacts-check
```

Circuit-level check:

```bash
nargo test --package vanta_passport_reputation_gate
```

These commands prove repo-local artifacts and the starter circuit predicate only. They do not prove generated browser proofs, Solana verifier programs, live endpoints, production privacy, live adoption, legal/compliance approval, audit acceptance, mainnet readiness, signing, broadcast, deployment, or real-funds movement.

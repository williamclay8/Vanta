# PPA-PQC-002 - Lattice / hash-based SNARK research tracking

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT_DELTA.md`
- Cycle: 2026-05-25 post-merge follow-up (long-horizon PQC residual)
- Band: cross-cutting cryptographic hardening (long-horizon, not currently sequenced)
- Item: research tracking for post-quantum-resistant SNARK / STARK migration of the Noir circuit suite
- Companion: `PPA-PQC-001` (hybrid viewing-key memo) — different concern, different horizon

## Status

`tracking-only-no-migration-today`

This is a **research tracker**, not an implementation plan. No source change is made under this tracker; no circuits are migrated; no Crucible fixtures are touched. The purpose is to:

1. Document why a future migration off Groth16-over-BN254 is foreseeable.
2. Enumerate the candidate replacement systems and their current maturity.
3. Define the trigger conditions that should move this from `tracking-only` to `migration-design`.
4. Make it impossible for Vanta to be the last project still on a quantum-vulnerable SNARK because nobody was watching the field.

## Why this exists

The 2026-05-25 production-privacy audit delta confirmed `groth16-tag3-solana-v0` as the production verifier backend choice (per `docs/zk/c01-production-verifier-backend-decision.md`). Groth16 soundness relies on the discrete-log assumption on the BN254 elliptic curve. A cryptographically relevant quantum computer (CRQC) running Shor's algorithm can in principle forge Groth16 proofs.

This is **not** a today-risk. CRQC arrival is plausibly 10-20 years out per NIST guidance, every production ZK system in deployment today shares this exposure, and the bigger risk to Vanta right now is the operator-trusted beta posture and the absence of an on-chain verifier at all. But it is a foreseeable risk on a timescale that overlaps Vanta's plausible product lifetime, and the migration path is non-trivial.

Unlike `PPA-PQC-001` (which addresses harvest-now-decrypt-later exposure on encrypted memos and *should* be designed now), `PPA-PQC-002` does not have an HNDL component: an attacker recording today's on-chain proofs cannot "decrypt" them later — Groth16 proofs are sound, not confidential. A future CRQC could only forge *new* proofs, not retroactively rewrite history. So the urgency profile is different from PPA-PQC-001.

## Candidate replacement systems to watch

The field is moving. As of 2026-05, the candidate systems for a post-quantum-resistant SNARK / STARK replacement are:

### Lattice-based SNARKs

- **Aztec Hyper-K** (lattice-based PLONK variant, under research as of 2024-2025). Status to watch: production-ready lattice PLONK proving system with reasonable proof sizes and verification cost. Aztec has signaled this is on their long-term roadmap.
- **Lattice PLONK / Lattice-Bulletproofs** lines of research from Boneh, Bünz, Halo / Halo2-on-lattices, etc. Active academic, not yet production.
- **Greyhound** (Block et al., 2024) — lattice-based SNARK with poly-log proof sizes. Research stage.
- **LatticeFold** (Boneh & Chen, 2024) — folding for lattice-based proofs. Research stage.

### Hash-based STARKs (Grover-safe, no trusted setup)

- **RISC Zero zkVM** — production hash-based STARK system. Proof sizes ~200KB, much larger than Groth16's 192-256 bytes. Verification cost on Solana would be substantially higher than Groth16; would likely require a hash-based STARK verifier program with multiple instructions per proof. Maturity: production for general-purpose zkVM, not yet a drop-in for application-specific circuits like Vanta's Noir lanes.
- **Polygon Miden / Plonky3** — hash-based, smaller-than-RISC-Zero proofs. Polygon's roadmap includes Solana-style chain deployments.
- **StarkWare Stone / Cairo STARK** — production hash-based STARK. Verification cost still high relative to Groth16.

### Hybrid approaches

- **PLONK with post-quantum-secure polynomial commitments** (FRI-based instead of KZG). Active research line; PLONK verifier becomes STARK-shaped at the price of proof size.
- **Hybrid SNARK-of-STARK** constructions: wrap a STARK in a SNARK for shorter on-chain proofs. Recursive systems like Halo2 + STARK make this plausible.

### Out of scope

- **Mina's recursive Pickles** — Pickles uses Pallas/Vesta curves, also discrete-log-based, not post-quantum.
- **Pure Groth16 with PQ-secure curves** — there is no widely accepted "PQ-secure pairing-friendly curve" candidate today; this is not a path forward.

## Trigger conditions for promotion to migration-design

This tracker stays in `tracking-only` until at least one of these is true. When any becomes true, the next privacy-audit cycle should open a `PPA-PQC-003` (or rename this entry) and produce an actual migration plan.

1. **CRQC progress.** Public, peer-reviewed demonstrations of factoring or discrete-log on integers / curves larger than ~256 bits using a fault-tolerant quantum computer. As of 2026-05 the public state of the art is still small-integer-factoring demonstrations on the order of 35 bits with substantial classical pre-processing — far from threat-level.
2. **NIST or equivalent body lists Groth16-style pairing-based SNARKs as deprecated** in any public guidance. This has not happened as of 2026-05.
3. **A peer ZK system on Solana migrates** off pairing-based SNARKs in production. Strong signal that the migration is tractable for application-specific circuits.
4. **A production-ready lattice-PLONK or hash-based STARK Solana verifier program** is deployed and audited by a third party. Removes the deployment-feasibility blocker.
5. **A formal Vanta audit recommends migration** as part of a multi-year roadmap. Most likely trigger.

## What to monitor in the meantime

A quarterly research scan should review:

- The `eprint.iacr.org` "lattice" tag for new SNARK / commitment-scheme constructions.
- Aztec's monthly engineering updates for Hyper-K progress.
- RISC Zero, Polygon, StarkWare release notes for Solana-targeted verifier programs.
- NIST FIPS / SP publications for any post-quantum SNARK standardization activity (none today; would be a significant signal if it starts).
- The Open Quantum Safe project (`liboqs`, `oqs-provider`) for new KEM / signature algorithm acceptance.
- CRQC progress: IBM, Google, IonQ, PsiQuantum, Atom Computing, etc. roadmaps for fault-tolerant logical qubit milestones.

This scan does not need to produce code. It produces a short status update appended to this tracker entry, dated, with refs to any new evidence. Default cadence: every six months.

## No files modified

This tracker intentionally produces zero source-tree changes. The deliverables are:

- This tracker note (committed under `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/`).
- A pointer in `docs/threat-model.md` "Post-Quantum Cryptographic Exposure" section (already added under `PPA-PQC-001`'s migration order).
- No new npm scripts, no new contract modules, no live-code changes.

Future cycles that activate this tracker must produce their own migration plan and Promotion criteria; this file is the entry point for that work.

## References

- Boneh, Bünz, Fisch — `Bulletproofs: Short Proofs for Confidential Transactions and More` (2018)
- Aztec Network, "The future of private DeFi: Hyper-K" announcements (2024-2025)
- RISC Zero, "ZK Verifiable Compute" technical whitepaper
- Polygon Miden documentation
- NIST IR 8413 — Status Report on Round 3 of the NIST PQC Standardization Process
- NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA)
- `docs/threat-model.md` "Post-Quantum Cryptographic Exposure" section
- `PPA-PQC-001` companion tracker (different concern, near-term HNDL)

# Hybrid ZK / Confidential Compute Benchmark - 2026-06-16

Status: benchmark and decision matrix only. No Arcium integration, MPC runtime, FHE runtime, quantum-resistant implementation, TEE safety evidence, production verifier, deployment, or live privacy claim is moved.

## Why This Exists

The June 16 pasted brief asks Vanta to incorporate:

- Arcium-scale confidential/MPC execution, including a cited `224M MPC rounds` scale signal.
- Nulla Network quantum-resistant encrypted compute as a hybrid-design consideration.
- Fhenix / RedactMoney FHE-vs-ZK tradeoffs.

the named June 16 momentum-bank section was not present locally when implementation started. A Hermes cron receipt was later recovered from `/Users/clay/.hermes/cron/output/f056aad8568e/2026-06-16_00-20-41.md` and restored into the bank. That recovered cron output supports a June 16 Arcium/Solana Summit privacy-infra signal, Helius LaserStream observability, and Noir profiler tooling; it does not include the `224M MPC rounds`, Nulla Network, Fhenix, or RedactMoney details. Those exact details remain `pasted-brief-backed`. Earlier local bank entries still provide `prior momentum-bank-backed support` for Arcium/ZINC as an important confidential-compute benchmark and Vanta's existing T4 hybrid ZK lane.

## Decision Rule

Hybrid privacy claims must identify which mechanism proves which property:

| Property | ZK proof | MPC/confidential compute | FHE | Quantum-resistant encrypted compute |
| --- | --- | --- | --- | --- |
| Predicate truth | Strong fit | Depends on transcript/attestation | Possible, heavy | Watch item |
| Private execution | Limited to witness secrecy | Stronger fit | Stronger fit | Watch item |
| Verifier-friendly receipt | Strong fit | Needs signed/attested bridge | Needs bridge | Unknown |
| On-chain verification | Strong fit for succinct proof | Needs registry/attestation adapter | Needs bridge/proof | Unknown |
| Runtime cost | Moderate to high | Depends on network | High today | Unknown |
| Trust boundary | Circuit/prover/verifier assumptions | Network, nodes, attestation, availability | Key management, runtime, circuit | Library/threat-model maturity |

## Vanta Hybrid Contract

Every hybrid ZK artifact must state:

- `zkProvedProperty`: the exact predicate proven by a local or generated proof.
- `confidentialComputeAssertedProperty`: any property asserted by MPC/TEE/encrypted compute.
- `externalTrustBoundary`: external network, enclave, key, committee, sequencer, verifier, or oracle dependency.
- `onChainVerificationPrimitive`: how Solana sees the result, such as verifier registry, proof receipt, attested transcript hash, or signed result commitment.
- `redactedInputs`: witness, wallet history, identity, account graph, private agent memory, raw amount, or private execution trace.
- `claimBoundary`: what the artifact does not prove.

## Arcium-Scale Benchmark

Source boundary:

- `cron-output-backed`: Arcium as a June 16 Solana Summit privacy/encrypted-computation benchmark.
- `pasted-brief-backed`: Arcium scale update and `224M MPC rounds`.

Vanta action:

- Treat Arcium as a benchmark for throughput, developer UX, and encrypted execution market traction.
- Do not claim Vanta has comparable scale.
- Extend `vanta_verifiable_compute_hybrid` later only if the receipt can bind:
  - workload commitment
  - attestation/transcript hash
  - verifier id
  - policy hash
  - result commitment
  - time window
  - external trust boundary

## FHE Comparison

FHE is useful as a comparison lane, not a default implementation lane.

Use FHE when:

- computation over encrypted state is the actual product requirement
- runtime cost is tolerable
- key management and result-verification story is explicit
- chain verifier can inspect a proof/receipt rather than blindly trusting a server

Prefer ZK when:

- Vanta needs a counterparty-readable predicate receipt
- the private computation can be represented as a bounded witness predicate
- Solana verification and nullifier/replay behavior matter
- browser/local proving is the UX goal

## Quantum-Resistant Encrypted Compute

Nulla Network is tracked as a watch item only until Vanta has:

- primary sources and implementation artifacts
- a concrete threat model
- a library/toolchain candidate
- Solana verification or receipt bridge design
- audit/review posture
- migration story for existing Poseidon/Groth16/Noir assumptions

No Vanta artifact should say or imply post-quantum privacy, quantum resistance, or quantum-safe private settlement.

## On-Chain Verification Primitive

Candidate registry record:

```json
{
  "schemaVersion": "vanta-hybrid-verifier-registry-candidate-v0.1",
  "mechanism": "zk | mpc | tee | fhe | hybrid",
  "circuitOrWorkloadId": "vanta_verifiable_compute_hybrid",
  "verifierId": "poseidon:<verifier>",
  "verifierProgramId": "<solana-program-id-ref>",
  "attestationVerifierRef": "<reviewed-ref-or-null>",
  "verifyingKeyHash": "sha256:<vk-or-null>",
  "policyHash": "poseidon:<policy>",
  "externalTrustBoundary": ["network", "enclave", "committee"],
  "status": "blocked-until-generated-proof-and-review"
}
```

Candidate receipt record:

```json
{
  "schemaVersion": "vanta-hybrid-compute-receipt-candidate-v0.1",
  "workloadCommitment": "poseidon:<workload>",
  "resultCommitment": "poseidon:<result>",
  "attestationOrTranscriptHash": "sha256:<redacted>",
  "policyHash": "poseidon:<policy>",
  "publicInputHash": "sha256:<stable-json>",
  "externalTrustBoundary": ["mpc-network-or-tee"],
  "claimBoundary": "benchmark-only-not-live-confidential-compute"
}
```

## Verification

Current artifact check:

```bash
node scripts/check-twitter-pass-2026-06-16-research-artifacts.mjs
```

Future checks:

```bash
npm run zk:verifiable-compute-hybrid-circuit-check
npm run verifiable-compute-check
npm run zk:c01-verifier-key-registry-check
```

These checks cannot lift production privacy, hybrid execution, confidential compute, FHE, post-quantum, verifier, audit, deployment, or live claims.

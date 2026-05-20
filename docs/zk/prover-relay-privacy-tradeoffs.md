# Prover Relay Privacy Trade-Offs

Vanta production privacy is not enabled. This note defines the disclosure boundary that must exist before any remote prover, prover relay, or remote proof fallback is offered as a user-facing production path.

## Current State

- `selectedProverRuntime` is `null`.
- `selectedRuntimeDirection` is `remote-service-production-prover`.
- The selected runtime direction is a local architecture decision, not a selected production prover runtime.
- It is not a production prover runtime.
- deployed prover health, artifact-store refs, job-log refs, valid proof roundtrip, and invalid proof rejection are still absent.
- Browser-worker proving is dev-only local evidence, not a production browser runtime.
- Remote proof-artifact handoff evidence is off-chain handoff hardening, not production remote proving.
- C01 on-chain verifier compatibility is absent.
- Live route wiring for a production prover is absent.
- Real-funds and production-private claims remain disallowed.

## Opt-In Requirement

A remote prover or prover relay must be explicit opt-in. The product must not silently move witness generation or proof construction from the user's device to a remote service. The user-facing copy must say whether proof material stays local or is sent to a remote service.

## Remote Prover Privacy Cost

A remote prover can receive sensitive proof inputs needed to construct the proof, including note secrets, ownership witnesses, amount or asset witnesses, blinding material, and request metadata. Even when public inputs are hash-bound, the remote service can observe timing, target circuit, request size, network metadata, and retry behavior.

Remote proving can reduce device load and make proofs more reliable on weaker browsers, but it introduces a trust boundary: the prover service, its logs, its queues, its artifact store, and any relay in front of it must be treated as privacy-sensitive infrastructure.

## Browser Prover Privacy Cost

Browser-worker proving can keep witness material on the user's device, but the current implementation is dev-only evidence. A production browser runtime would still need a compiled-circuit distribution policy, timeout and device coverage, route wiring, no-witness operator acceptance, C01 verifier compatibility, and external audit or reviewer acceptance.

## Relay Separation

A prover relay can reduce direct operator coupling only if it has a separate service identity, separate storage, authenticated requests, no shared logs with the operator, and a no-witness receipt contract. Separation alone is not anonymity: IP address, timing, circuit target, and request cadence can still link actions unless the architecture adds a reviewed privacy transport and batching policy.

## Product Rule

Do not present remote proving, prover relay, or browser-worker proving as production privacy until all of these are true:

- the selected prover runtime is non-null and reviewed;
- the remote-service contract packet has deployed service health, artifact-store refs, job-log refs, valid and invalid proof evidence, and operator no-witness production acceptance;
- C01 verifier compatibility is selected and verified;
- proof format and verifying-key evidence are production-bound;
- live route wiring is verified without witness leakage;
- remote prover logs, queues, artifact storage, and service auth are reviewed;
- users can choose local proving vs remote proving with clear trade-off copy;
- external audit or reviewer acceptance exists.

Until then, the only allowed wording is that these are local or blocked runtime options, not production-private proof infrastructure.

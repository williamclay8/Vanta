# C01 Production Verifier Backend Decision

Status: no production verifier backend selected yet.

This packet exists so reviewers do not confuse local proof-artifact hardening with C01 closure. C01 remains partial until Vanta chooses a production verifier backend and wires positive verifier acceptance for the exact deployed lineage.

Current refs-only candidate evidence packet: `ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json`. It is intentionally blocked and exists to name the exact backend, proof-format, production verifying-key, verifier-adapter, positive/negative test, SBF/live-lineage, and audit/reviewer artifacts required before any `solana-c01-groth16-verifier-ready` claim can promote.

Backend Options Evidence packet: `ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json`. It is checked by `npm run zk:c01-verifier-backend-options-check` and records the `groth16-tag3-solana-v0` and `noir-bb-ultrahonk-adaptation` paths as blocked options. This packet does not select a backend, does not satisfy production proof-format evidence, and does not promote local proof or verifier-key registry evidence.

Groth16 Proof-Format Candidate packet: `ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json`. It is checked by `npm run zk:c01-groth16-proof-format-candidate-check` and records `blocked-no-groth16-production-proof-format-artifact` for the current `groth16-tag3-solana-v0` path. This packet does not satisfy production proof-format evidence; it records that the exact 256-byte Groth16 production artifact for `vanta_private_pool_v2_actual_private_spend_entry` is still absent.

Production Verifying-Key Candidate packet: `ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json`. It is checked by `npm run zk:c01-production-verifying-key-candidate-check` and records `blocked-no-production-verifying-key-hash-artifact` for the current `groth16-tag3-solana-v0` path. This packet does not satisfy production verifying-key evidence; it records that the exact production verifying-key hash artifact for the reserved tag-3 Groth16 path is still absent.

Verifier Adapter Acceptance-Test Candidate packet: `ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json`. It is checked by `npm run zk:c01-verifier-adapter-test-candidate-check` and records `blocked-no-verifier-adapter-acceptance-tests` for the current `groth16-tag3-solana-v0` path. This packet does not satisfy verifier-adapter evidence and does not prove tag-3 proof acceptance; it records that adapter acceptance, `private-spend-public-input-hash` binding, valid-proof mutation, and invalid-proof no-mutation evidence are still absent.

## Current Truth

- The current Solana tag `3` path is a reserved `TAG_SPEND_WITH_PROOF` preflight, not proof support.
- Tag `3` is Groth16-shaped: `verifierKeyHash:32`, `groth16Proof:256`, and `onChainVerifierTarget: solana-c01-tag3-groth16-v0`.
- Tag `3` requires root/root-record/nullifier/output/verifier-key account shape, then returns custom error `14` / `ERR_PROOF_VERIFIER_NOT_WIRED` before proof verification, account creation, nullifier/output mutation, or spend acceptance.
- Current bb.js / UltraHonk proof artifacts remain off-chain evidence only. Accepted remote proof-artifact receipts must stay `offchain-remote-proof-artifact-only`.
- Any `solana-c01-groth16-verifier-ready` request or receipt overclaim must fail closed until a real Solana tag-3 Groth16 verifier candidate exists.
- Root provenance records at `["vanta2root", pool_state, acceptedRoot]` are lineage metadata, not proof that the root transition is correct, and not a program-owned shared Merkle tree.

## Local Proof-Format Observation

Local proof-format observation is now recorded at `ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json` and checked by `npm run zk:c01-local-proof-format-evidence-check`.

The packet records that the active local actual-private-spend proof receipt for `vanta_private_pool_v2_actual_private_spend_entry` is `noir-bb / barretenberg-ultrahonk`, carries one `private-spend-public-input-hash`, uses a 16000-byte local proof, and labels its verifying-key metadata as `local-acir-bytecode-hash-not-production-vk`.

That observation is useful for the backend decision because it makes the mismatch explicit: the current reserved Solana tag `3` target expects a 256-byte Groth16 tag-3 proof and `production-verifying-key-hash` evidence for `solana-c01-tag3-groth16-v0`. This is not backend selection, not production proof-format acceptance, not production verifying-key evidence, not tag-3 proof acceptance, and not on-chain proof verification.

## Verifier-Key Registry Scaffold

Source-only verifier-key registry evidence is now recorded at `ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json` and checked by `npm run zk:c01-verifier-key-registry-check`.

Tag `5` (`TAG_REGISTER_VERIFIER_KEY`) creates or idempotently verifies the program-owned verifier-key PDA derived from `["vanta2vkey", pool_state, verifierKeyHash]`. The record stores the pool and verifier-key hash that reserved tag `3` preflights before returning `ERR_PROOF_VERIFIER_NOT_WIRED`.

This source-only verifier-key registry scaffold is useful because tag `3` no longer depends on tests hand-writing verifier-key accounts. It is still not backend selection, not production verifying-key evidence, not verifier-adapter acceptance, not tag-3 proof acceptance, and not on-chain proof verification.

## Production Verifying-Key Candidate

The blocked production verifying-key candidate packet is the human-review companion for the `production-verifying-key-hash` evidence gate.

Current candidate status: `blocked-no-production-verifying-key-hash-artifact`.

The required candidate shape is narrow: circuit `vanta_private_pool_v2_actual_private_spend_entry`, target `solana-c01-tag3-groth16-v0`, tag `3`, `proofSystem: "groth16"`, `groth16Proof:256`, one `private-spend-public-input-hash`, and `verifyingKeyHashKind: "production-verifying-key-hash"`.

The current production verifying-key artifact is absent. The source-only tag `5` registry metadata records a caller-supplied `verifierKeyHash` PDA at `["vanta2vkey", pool_state, verifierKeyHash]`, and the current local proof observation still uses `local-acir-bytecode-hash-not-production-vk`. Therefore the packet is useful feasibility evidence, but it does not satisfy production verifying-key evidence, production proof-format evidence, backend selection, verifier-adapter acceptance, tag-3 proof acceptance, or on-chain proof verification.

## Groth16 Proof-Format Candidate

The blocked Groth16 proof-format candidate packet is the human-review companion for the `groth16-tag3-solana-v0` option.

Current candidate status: `blocked-no-groth16-production-proof-format-artifact`.

The required candidate shape is narrow: circuit `vanta_private_pool_v2_actual_private_spend_entry`, target `solana-c01-tag3-groth16-v0`, tag `3`, `proofSystem: "groth16"`, `groth16Proof:256`, one `private-spend-public-input-hash`, and `verifyingKeyHashKind: "production-verifying-key-hash"`.

The current artifact is absent. The current local proof observation is still `noir-bb / barretenberg-ultrahonk`, 16000 bytes, and `local-acir-bytecode-hash-not-production-vk`. Therefore the packet is useful feasibility evidence, but it does not satisfy production proof-format evidence, production verifying-key evidence, backend selection, verifier-adapter acceptance, tag-3 proof acceptance, or on-chain proof verification.

## Verifier Adapter Acceptance-Test Candidate

The blocked verifier adapter acceptance-test candidate packet is the human-review companion for the verifier-adapter, public-input binding, valid-proof mutation, and invalid-proof no-mutation evidence gates.

Current candidate status: `blocked-no-verifier-adapter-acceptance-tests`.

The required candidate shape is narrow: circuit `vanta_private_pool_v2_actual_private_spend_entry`, target `solana-c01-tag3-groth16-v0`, tag `3`, `proofSystem: "groth16"`, `groth16Proof:256`, one `private-spend-public-input-hash`, `verifyingKeyHashKind: "production-verifying-key-hash"`, and an in-program verifier or dedicated verifier CPI adapter.

The current adapter artifact is absent. The current acceptance-test evidence is also absent: no valid-proof mutation test, no invalid-proof no-mutation test, no wrong-public-input-hash no-mutation test, and no wrong-verifying-key no-mutation test. Reserved tag `3` still returns `ERR_PROOF_VERIFIER_NOT_WIRED` before proof verification, account creation, nullifier/output mutation, or spend acceptance. Therefore the packet is useful feasibility evidence, but it does not satisfy verifier-adapter evidence, public-input hash binding, proof acceptance, backend selection, production proof-format evidence, production verifying-key evidence, tag-3 proof acceptance, or on-chain proof verification; it does not prove tag-3 proof acceptance.

## Backend Options

The machine-readable options matrix lives in `ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json`; this section is its human review companion.

### Groth16 Tag-3 Solana Verifier Path

Choose this if Vanta wants the current tag `3` ABI to become the production on-chain proof path.

Required positive evidence:

- Compile the active `vanta_private_pool_v2_actual_private_spend_entry` circuit to a Groth16-compatible proof/public-witness format.
- Commit a production verifying-key hash with `verifyingKeyHashKind: production-verifying-key-hash`.
- Replace the source-only tag `5` registry scaffold with reviewed production verifying-key evidence for the selected backend.
- Wire in-program verification or a dedicated verifier CPI for `solana-c01-tag3-groth16-v0`.
- Replace custom error `14` only after positive verifier tests prove accepted proofs mutate state and invalid proofs leave accounts unchanged.
- Keep proof bytes at the reviewed `groth16Proof:256` layout unless a new ABI and guard replace it.

### Noir/bb.js/UltraHonk Adaptation Path

Choose this if Vanta wants to preserve the current Noir/bb.js/UltraHonk proof system as the production backend.

Required positive evidence:

- Define how `proofSystem: "noir-bb"` and `backend: "barretenberg-ultrahonk"` become production-verifiable for Solana, or explicitly change the on-chain target away from the current Groth16 tag-3 contract.
- Replace local ACIR metadata with production verifying-key evidence; `local-acir-bytecode-hash-not-production-vk` must not be promoted.
- Define the new proof byte layout, public input labels, verifier target, and acceptance tests before any receipt can claim on-chain verifier readiness.
- Preserve remote receipts as `offchain-remote-proof-artifact-only` until that production verifier evidence exists.

## Decision Gate

Do not mark C01 verified-local, production-ready, or `solana-c01-groth16-verifier-ready` until one backend is selected and the matching proof format, verifying-key commitment, verifier adapter, positive tests, SBF/live evidence, and audit/reviewer acceptance exist.

The next implementation after selection should name the chosen backend in a new commit, update `VANTA_ZK_REVIEW.findings.json`, and replace this packet's "no backend selected yet" status only after the matching guard proves the positive path.

## Reviewer Commands

```bash
npm run zk:c01-onchain-proof-boundary-check
npm run zk:c01-verifier-backend-contract-check
npm run zk:c01-production-verifier-backend-candidate-check
npm run zk:c01-verifier-backend-decision-check
npm run zk:c01-verifier-backend-options-check
npm run zk:c01-groth16-proof-format-candidate-check
npm run zk:c01-production-verifying-key-candidate-check
npm run zk:c01-verifier-adapter-test-candidate-check
npm run zk:c01-verifier-key-registry-check
npm run private-pool-v2:proof-backend-boundary-check
npm run private-pool-v2:remote-proof-artifact-boundary-check
```

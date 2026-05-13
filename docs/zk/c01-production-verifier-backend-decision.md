# C01 Production Verifier Backend Decision

Status: no production verifier backend selected yet.

This packet exists so reviewers do not confuse local proof-artifact hardening with C01 closure. C01 remains partial until Vanta chooses a production verifier backend and wires positive verifier acceptance for the exact deployed lineage.

Current refs-only candidate evidence packet: `ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json`. It is intentionally blocked and exists to name the exact backend, proof-format, production verifying-key, verifier-adapter, positive/negative test, SBF/live-lineage, and audit/reviewer artifacts required before any `solana-c01-groth16-verifier-ready` claim can promote.

## Current Truth

- The current Solana tag `3` path is a reserved `TAG_SPEND_WITH_PROOF` preflight, not proof support.
- Tag `3` is Groth16-shaped: `verifierKeyHash:32`, `groth16Proof:256`, and `onChainVerifierTarget: solana-c01-tag3-groth16-v0`.
- Tag `3` requires root/root-record/nullifier/output/verifier-key account shape, then returns custom error `14` / `ERR_PROOF_VERIFIER_NOT_WIRED` before proof verification, account creation, nullifier/output mutation, or spend acceptance.
- Current bb.js / UltraHonk proof artifacts remain off-chain evidence only. Accepted remote proof-artifact receipts must stay `offchain-remote-proof-artifact-only`.
- Any `solana-c01-groth16-verifier-ready` request or receipt overclaim must fail closed until a real Solana tag-3 Groth16 verifier candidate exists.
- Root provenance records at `["vanta2root", pool_state, acceptedRoot]` are lineage metadata, not proof that the root transition is correct, and not a program-owned shared Merkle tree.

## Backend Options

### Groth16 Tag-3 Solana Verifier Path

Choose this if Vanta wants the current tag `3` ABI to become the production on-chain proof path.

Required positive evidence:

- Compile the active `vanta_private_pool_v2_actual_private_spend_entry` circuit to a Groth16-compatible proof/public-witness format.
- Commit a production verifying-key hash with `verifyingKeyHashKind: production-verifying-key-hash`.
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
npm run private-pool-v2:proof-backend-boundary-check
npm run private-pool-v2:remote-proof-artifact-boundary-check
```

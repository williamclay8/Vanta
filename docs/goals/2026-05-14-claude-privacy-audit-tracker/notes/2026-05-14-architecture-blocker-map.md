# 2026-05-14 Architecture Blocker Map

## Purpose

This note consolidates the non-N1/N2/N3 blockers from the Claude privacy audit so future work can check implementation progress without blurring scaffolding with production privacy.

These blockers are intentionally fail-closed or truth-gated today. Do not promote any production-private, proof-verified, program-owned custody, fresh-exit, or shared-tree claim until the matching positive evidence exists.

## A1-TAG3-PROOF-VERIFIER-NOT-WIRED

Status: `blocked-architecture-audit-deploy`

Current truth:

- `TAG_SPEND_WITH_PROOF = 3` is reserved.
- The source preflights accounts, root records, nullifier markers, output records, and verifier-key metadata.
- It still returns `ERR_PROOF_VERIFIER_NOT_WIRED` / custom error `14` before proof verification or mutation.

Guard:

- `npm run zk:c01-onchain-proof-boundary-check`

Completion evidence required:

- Valid proof acceptance test.
- Invalid proof rejection test.
- Wrong public-input hash and wrong verifying-key no-mutation tests.
- Registered verifying-key hash enforcement.
- On-chain verifier implementation and reviewed SBF/live receipts after approval.

## A1-TAG6-UNSHIELD-RELEASE-NOT-WIRED

Status: `blocked-architecture-audit-deploy`

Current truth:

- `TAG_UNSHIELD = 6` is reserved.
- The source preflights root/root-record/nullifier/vault-authority/vault-asset/token-account shape.
- It still returns `ERR_UNSHIELD_RELEASE_NOT_WIRED` / custom error `15` before proof verification, nullifier consume, token/system CPI, account mutation, or fund release.

Guard:

- `npm run private-pool-v2:onchain-unshield-custody-check`

Completion evidence required:

- Proof-verified TAG_UNSHIELD release.
- Nullifier consume before release.
- Token/system CPI release from a program-owned vault.
- Invalid-proof and duplicate-nullifier no-release tests.
- Reviewed deploy/live receipts after approval.

## A2-OPERATOR-KEYPAIR-CUSTODY

Status: `blocked-architecture-audit-deploy`

Current truth:

- The Unshield operator still loads the vault signer with `loadKeypairFromEnv(vaultSignerSecretKeyEnvName)`.
- The current release model is `operator-keypair-public-exit`.
- Whoever controls the operator vault signer controls beta release custody.

Guard:

- `npm run private-pool-v2:onchain-unshield-custody-check`

Completion evidence required:

- Program-owned vault PDA custody.
- No production release path that signs from an env-loaded vault keypair.
- Migration/runbook evidence for existing custody state.
- Reviewed deploy/live receipts after approval.

## A2-SELF-WALLET-EXIT-ONLY

Status: `blocked-product-protocol-design`

Current truth:

- The Unshield operator rejects `destinationOwner !== requester`.
- Fresh-address exit privacy is not available.
- The current product copy must keep the self-wallet exit limitation visible.

Guard:

- `npm run unshield:public-exit-surface-check`

Completion evidence required:

- Destination address bound in the proof or equivalent audited authorization.
- Operator accepts `destinationOwner != requester` only when the destination is proof-bound.
- Fresh-address exit UX and product copy.
- Negative tests for unbound or forged destinations.

## A3-ROOTS-NOT-PROGRAM-OWNED-SHARED-TREE

Status: `blocked-architecture`

Current truth:

- Root provenance records exist.
- Tag `4` root provenance is still not proof that the root transition is correct.
- Root state is not yet a program-owned shared Merkle tree.

Guard:

- `npm run private-pool-v2:root-provenance-check`

Completion evidence required:

- Program-owned shared tree state or equivalent verified root transition mechanism.
- Positive append/root transition tests.
- Invalid transition rejection tests.
- Updated operator/indexer handoff and public depth evidence.

## Tracker Rule

Do not claim A1/A2/A3 complete, proof-verified settlement, program-owned custody, fresh-address exit privacy, or shared-tree privacy until every blocker above has positive implementation evidence and the named guard has been replaced or augmented with the matching positive checks.

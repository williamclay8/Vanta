# PPA-VERIFIER-002 - Groth16 Ceremony And Verifier-Key Registration Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 3 - verifier + ceremony
- Recommended remediation order: 12
- Finding: If Groth16, run public powers-of-tau ceremony with at least 50 contributors and register verifier keys.
- Status: plan-approved-blocked-before-implementation on 2026-05-25.

## Current Evidence

Band 3 item 11 selected `groth16-tag3-solana-v0` as the backend direction only. The repo still records item 12 as blocked:

- `ops/mainnet/private-pool-v2-c01-production-output-manifest-preflight.evidence.json`: `blocked-no-reviewed-production-output-manifest`
- `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json`: `blocked-no-deterministic-production-artifact-build-receipt`
- `ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json`: `blocked-no-production-verifying-key-hash-artifact`
- `ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json`: `source-only-verifier-key-registry-scaffold`

No local-only edit can satisfy a public ceremony, production verifying-key artifact, or live tag-5 registration receipt.

## Planned Files

- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-verifier-002-groth16-ceremony-verifier-keys-plan.md`
- `ops/mainnet/private-pool-v2-c01-production-output-manifest-preflight.evidence.json`
- `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json`
- `ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json`
- `ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json`
- `ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json`
- `package.json`

This doc-only approval marker changes only the tracker state and this note. The evidence gates above remain planned later surfaces if external ceremony/build inputs exist and the implementation path is separately safe to execute.

## Planned Fixtures

- No local fixture can satisfy the `>= 50` contributor ceremony requirement.
- After external evidence exists, add refs-only acceptance fixtures that reject:
  - contributor count below 50 or missing reviewed setup/mitigation ref
  - raw proof, verifying-key, proving-key, witness, keypair, or signed-transaction bytes in committed evidence
  - mismatched `groth16-tag3-solana-v0` proof/VK/public-witness tuple
  - wrong production verifying-key hash kind
  - wrong tag-5 verifier-key PDA
  - verifier-key registration not bound to the expected verifier program id

## Planned Scripts

Use existing gates first:

- `npm run zk:c01-production-output-manifest-check`
- `npm run zk:c01-deterministic-production-artifact-build-check`
- `npm run zk:c01-production-verifying-key-candidate-check`
- `npm run zk:c01-verifier-key-registry-check`
- `npm run zk:c01-production-artifact-acceptance-gate-check`
- `npm run zk:c01-production-verifier-backend-candidate-check`
- `npm run truth:privacy-claim-gate`
- `npm run privacy-audit:tracker-check`

If external inputs exist, tighten or add refs-only intake checks rather than storing raw artifacts in git.

## Planned Test Cases

- Default C01 gates prove no production output manifest, deterministic artifact build receipt, production VK hash, or production artifact bundle is accepted.
- Refs-only external receipt validation rejects secret-bearing or raw artifact bytes.
- A future reviewed build packet must bind `proofSystem=groth16`, `proofByteLength=324`, `publicWitnessByteLength=44`, `verifierInstructionDataByteLength=368`, and `verifyingKeyHashKind=production-verifying-key-hash`.
- A future tag-5 receipt must bind the production verifier-key hash to the expected verifier program id at `["vanta2vkey", pool_state, verifierKeyHash]`.
- `npm run truth:privacy-claim-gate` must continue to report `privacyClaimsAllowed=false`.

## Plan Verification Evidence

- `npm run zk:c01-production-output-manifest-check`: PASS; remains `blocked-no-reviewed-production-output-manifest`.
- `npm run zk:c01-deterministic-production-artifact-build-check`: PASS; remains `blocked-no-deterministic-production-artifact-build-receipt`.
- `npm run zk:c01-production-verifying-key-candidate-check`: PASS; remains `blocked-no-production-verifying-key-hash-artifact`.
- `npm run zk:c01-verifier-key-registry-check`: PASS; remains `source-only-verifier-key-registry-scaffold`.
- `npm run zk:c01-production-artifact-acceptance-gate-check`: PASS; remains `blocked-no-reviewed-production-artifact-bundle`.
- `npm run zk:c01-production-verifier-backend-candidate-check`: PASS; selected backend remains pending production evidence.
- `npm run truth:privacy-claim-gate`: PASS; `privacyClaimsAllowed=false` remains fail-closed.
- `npm run privacy-audit:tracker-check`: PASS.
- `git diff --check`: PASS.

## Blocker Before Implementation

Implementation needs an external public ceremony/setup with at least 50 contributors or a reviewed equivalent mitigation, reviewed Sunspot/Gnark toolchain/source lineage, deterministic production artifact build receipt, refs-only output manifest, production verifying-key hash, and tag-5 registration receipt. On-chain registration or live deployment work needs explicit approval and must not be attempted from this doc-only approval marker.

## Approval Gate

Clay approved the doc-only plan marker on 2026-05-25. This does not approve or unblock ceremony/build/tag-5 registration, verifier wiring, release, evidence acceptance, or claim-lift work; those remain blocked until the external ceremony/setup, production artifact/VK refs, registration receipts, SBF/live lineage, and review evidence exist.

## Truth Boundary

This plan does not run a ceremony, create production proof/VK artifacts, register verifier keys, wire proof acceptance, enable release, lift privacy claims, or establish production-private/mainnet/audit readiness.

## Lumi

- Local: tracker plan approval marker recorded locally only; implementation remains blocked before ceremony/build/registration work.
- Committed: not committed.
- Pushed: not pushed.
- Deployed/live: not deployed or live verified.

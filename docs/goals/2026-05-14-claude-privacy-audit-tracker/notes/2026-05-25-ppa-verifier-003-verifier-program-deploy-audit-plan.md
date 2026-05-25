# PPA-VERIFIER-003 - Verifier Program Deployment And Audit Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 3 - verifier + ceremony
- Recommended remediation order: 13
- Finding: Deploy and audit the verifier program.
- Status: evidence-contract-tightened-local-blocked-external on 2026-05-25.

## Current Evidence

Band 3 item 11 selected `groth16-tag3-solana-v0` as the backend direction only. Band 3 item 12 is approved as a doc-only blocker marker, but the required production ceremony/setup, deterministic artifact bundle, production proof/VK/public-witness refs, production verifying-key hash, and tag-5 registration receipt remain absent.

Existing C01 gates already model the blocked deploy/audit intake path:

- `ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json`: `blocked-no-production-verifier-adapter-acceptance`
- `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json`: `blocked-no-sbf-live-lineage-acceptance`
- `ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json`: `blocked-no-audit-reviewer-acceptance`
- `ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json`: closure still blocked until production artifact, adapter, lineage, and review refs exist
- `ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json`: external review handoff remains refs-only

No local-only edit can deploy or audit the verifier program. Live deployment, tag-5 registration, proof-enforced receipt collection, and audit/reviewer acceptance require external reviewed evidence and explicit approval.

After Clay's explicit 2026-05-25 request to work on external Band 3 evidence, the local evidence contract was tightened without accepting any production refs:

- The C01 lane now requires a reviewed frozen production source commit, reviewed source tree status or reviewed diff status, and source-freeze review acceptance before deterministic production artifacts, production bundles, SBF/live lineage, or composite closure can promote.
- `ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json` now lists deployed verifier program id, deployed verifier program SBF hash, verifier program upgrade-authority status ref, and tag-5 verifier-key record binding as required positive outputs.
- `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json` and `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json` now require refs-only source-lineage fields for `frozenSourceCommitRef`, `sourceTreeStatusRef`, and `sourceFreezeReviewRef`; local templates keep them null and `sourceFreezeAccepted=false`.
- `ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json` now includes `verifierProgramUpgradeAuthorityStatusRef` and `verifierKeyRecordBindingRef` in the SBF/live lineage section.
- `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json`, `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json`, and `ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json` now explicitly require deployed verifier program id/hash, verifier program upgrade-authority status ref, and verifier-key record binding.
- `ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json` now rejects promotion without the reviewed frozen source commit and source-freeze review refs.
- `ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json` now cross-checks deployed verifier program id/hash, verifier program upgrade-authority status ref, verifier-key binding, and frozen source commit evidence across the returned production bundle and SBF/live lineage acceptance packet.
- `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json` now records the fresh local comparison-only spend SBF hash `sha256:36ada2f6ec79932a4958a71f57caf44209db09459eb2de4efa503aac6b72bc55`; this still has `satisfiesSbfLiveLineage=false`.
- `ops/mainnet/private-pool-v2-c01-external-evidence-request.md` now gives external producers/reviewers a concise refs-only work order for the same handoff without changing accepted refs or promotion rules.
- `ops/mainnet/private-pool-v2-c01-external-evidence-request.md` now includes a guarded Ref Source Map that names where each required returned ref comes from and which reviewed packet field it fills. The map explicitly says current repo-local command output is comparison evidence only and must not populate accepted refs without a reviewed returned packet.

## Planned Files

- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-verifier-003-verifier-program-deploy-audit-plan.md`
- `ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json`
- `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json`
- `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json`
- `ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json`
- `ops/mainnet/private-pool-v2-c01-external-evidence-request.md`
- `ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json`
- `ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json`
- `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json`
- `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json`
- `ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json`
- `ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json`
- `ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json`
- `scripts/check-vanta-private-pool-v2-c01-production-artifact-acceptance-gate.mjs`
- `scripts/check-vanta-private-pool-v2-c01-production-verifier-artifact-request.mjs`
- `scripts/check-vanta-private-pool-v2-c01-sbf-live-lineage-candidate.mjs`
- `scripts/check-vanta-private-pool-v2-c01-sbf-live-lineage-acceptance-gate.mjs`
- `scripts/check-vanta-private-pool-v2-c01-external-review-handoff.mjs`
- `scripts/check-vanta-private-pool-v2-c01-verifier-evidence-closure-gate.mjs`
- `scripts/check-vanta-private-pool-v2-groth16-verifier-cpi.mjs`
- `package.json`

This local step changes evidence contracts and tracker notes only. Accepted external refs remain null. The verifier deploy/audit implementation path remains separately blocked.

## Planned Fixtures

- No local fixture can satisfy verifier deployment or audit acceptance.
- After item 12 external artifact/VK evidence exists, add or tighten refs-only acceptance fixtures that reject:
  - missing reviewed production artifact bundle
  - missing accepted verifier adapter or verifier program ref
  - missing rebuilt verifier SBF hash or reviewed in-program verifier hash
  - missing deployed verifier program id
  - missing verifier program upgrade-authority status ref
  - missing verifier-key record binding production VK hash to verifier program id
  - missing deployment, pool migration/reinit, tag-5 registration, and proof-enforced path receipts
  - missing reviewed frozen source commit, reviewed source tree status, or source-freeze acceptance
  - missing reviewer identity, review scope, finding disposition, or acceptance ref
  - raw proof, VK, witness, proving-key, keypair, secret, signed-transaction, or live private data bytes
  - mismatched spend/verifier/VK/public-witness lineage

## Planned Scripts

Use existing gates:

- `npm run zk:c01-production-verifier-artifact-request-check`
- `npm run zk:c01-production-artifact-acceptance-gate-check`
- `npm run zk:c01-verifier-adapter-acceptance-gate-check`
- `npm run zk:c01-sbf-live-lineage-acceptance-gate-check`
- `npm run zk:c01-audit-reviewer-acceptance-gate-check`
- `npm run zk:c01-verifier-evidence-closure-gate-check`
- `npm run zk:c01-external-review-handoff-check`
- `npm run zk:c01-positive-proof-verified-claim-gate-check`
- `npm run private-pool-v2:groth16-verifier-cpi-check`
- `npm run truth:privacy-claim-gate`
- `npm run privacy-audit:tracker-check`

If future external inputs exist, keep tightening refs-only intake checks rather than storing raw artifacts or secrets in git.

## Planned Test Cases

- Default gates prove deterministic artifact build, production artifact bundle, verifier-adapter acceptance, SBF/live lineage, audit/reviewer acceptance, and verifier evidence closure remain blocked with refs null.
- Refs-only artifact validation rejects absent frozen source commit, source tree status, and source-freeze review acceptance before any production bundle or closure promotion.
- Refs-only lineage validation rejects absent deployed verifier program id/hash, verifier-key record binding, tag-5 receipt, deployment/migration receipt, and live proof-enforced tag-3 receipt or reviewer-accepted dry-run.
- Refs-only audit validation rejects generic approval without reviewer identity, review scope, finding disposition, SBF/live lineage, valid mutation evidence, and invalid/wrong-input/wrong-key/wrong-program no-mutation evidence.
- Secret-policy validation rejects raw proof, VK, witness, keypair, secret, signed transaction, or live private data in committed or env-supplied evidence.
- `npm run truth:privacy-claim-gate` must continue to report `privacyClaimsAllowed=false`.

## Blocker Before Implementation

Implementation needs item 12 external ceremony/setup, reviewed frozen source commit, reviewed source tree or diff status, source-freeze review acceptance, deterministic production artifact bundle, production proof/VK/public-witness refs, production verifying-key hash, production verifier-adapter/program acceptance, valid mutation evidence, invalid/wrong-input/wrong-key/wrong-program no-mutation evidence, rebuilt spend/verifier SBF hashes, deployed program ids, verifier program upgrade-authority status ref, verifier-key record binding, deployment/reinit/tag-5 receipts, live proof-enforced tag-3 receipt or reviewer-accepted dry-run, and audit/reviewer acceptance.

Any live deployment, mainnet transaction, tag-5 registration, or real-funds/provider mutation requires explicit approval and reviewed receipt handling.

## Evidence Contract Hardening

- Outbound artifact request requires `deployed-verifier-program-id`, `deployed-verifier-program-sbf-hash`, `verifier-program-upgrade-authority-status`, and `tag5-verifier-key-record-binding`.
- Deterministic build and production bundle intake require a reviewed frozen source commit, reviewed source tree status or reviewed diff status, and source-freeze review acceptance before external refs can promote.
- Production bundle template includes `verifierProgramUpgradeAuthorityStatusRef` and `verifierKeyRecordBindingRef` alongside deployed program ids and SBF hashes.
- Local comparison-only SBF/live candidate rehearsal now matches the fresh local SBF ABI binary hash and remains non-promotional.
- SBF/live lineage and handoff packets spell out deployed verifier program id/hash, verifier program upgrade-authority status ref, and verifier-key record binding instead of relying on shorthand lineage wording.
- Composite closure validates that bundle, lineage, adapter, and audit packets cannot drift on the deployed verifier program id/hash, verifier program upgrade-authority status ref, production VK hash, verifier-key record binding, mutation/no-mutation refs, or audit refs.
- The human-readable external evidence request is required by `npm run zk:c01-external-review-handoff-check` and scanned for forbidden raw proof/VK/witness/key/secret/transaction material markers.

## Approval Gate

Clay approved this plan in-thread on 2026-05-25 with "Plan approved" and then explicitly asked to work on external Band 3 evidence. Clay then approved the frozen-lane slice with "slice approved." This local change is refs-only evidence-contract hardening. Implementation remains blocked before verifier deployment, tag-5 registration, proof-enforced receipts, audit/reviewer acceptance, verifier wiring, release, or claim-lift work until reviewed frozen source commit/source tree status/source-freeze acceptance, reviewed production artifact bundle, accepted verifier adapter/program evidence, SBF/live lineage, deployed verifier program id/hash, verifier program upgrade-authority status ref, verifier-key binding, and reviewer acceptance refs exist.

## Truth Boundary

This plan does not deploy a verifier program, audit a verifier, accept production artifacts, accept SBF/live lineage, register verifier keys on chain, wire proof acceptance, enable release, lift privacy claims, or establish production-private/mainnet/audit readiness.

All accepted external refs remain null.

The frozen source commit, source tree status, and source-freeze review refs are also null; this slice only makes them required before promotion.

## Verification After Approval

- Frozen lane slice recheck, 2026-05-25:
  - `npm run zk:c01-production-verifier-artifact-request-check`: PASS; request packet now requires reviewed frozen source commit, source tree status, and source-freeze review acceptance alongside deployed verifier program id/hash, verifier program upgrade-authority status ref, and tag-5 verifier-key binding.
  - `npm run zk:c01-deterministic-production-artifact-build-check`: PASS; default template remains non-evidence with frozen-source refs null and `sourceFreezeAccepted=false`.
  - `npm run zk:c01-production-artifact-acceptance-gate-check`: PASS; production artifact bundle promotion now requires reviewed frozen source commit/source tree status/source-freeze review refs.
  - `npm run zk:c01-external-review-handoff-check`: PASS; human handoff requires the frozen lane evidence and stays refs-only.
  - `npm run zk:c01-verifier-evidence-closure-gate-check`: PASS after aligning reviewer-facing docs with the exact `reviewed frozen source commit` marker; closure remains blocked with accepted refs null.
  - `npm run privacy-audit:tracker-check`: PASS.
  - `npm run truth:privacy-claim-gate`: PASS; `privacyClaimsAllowed=false`, `mainnetReady=false`, `productionReady=false`.
  - `npm run audit:package-check`: PASS.
  - `npm run operator:runbook-check`: PASS.
  - `npm run zk:review-findings-ledger-check`: PASS.
  - `npm run zk:review-guards-check`: PASS.
  - `git diff --check`: PASS.
  - `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json npm run zk:c01-production-artifact-acceptance-gate-check`: expected FAIL; template rejected as external production artifact bundle.
  - `VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json npm run zk:c01-deterministic-production-artifact-build-check`: expected FAIL; template rejected as external deterministic build receipt.
- `npm run zk:c01-production-verifier-artifact-request-check`: PASS; request packet now explicitly requires deployed verifier program id/hash, verifier program upgrade-authority status ref, and tag-5 verifier-key binding.
- `npm run zk:c01-production-artifact-acceptance-gate-check`: PASS; production bundle template stays non-evidence and includes the verifier program upgrade-authority status ref and verifier-key binding ref.
- `npm run zk:c01-verifier-adapter-acceptance-gate-check`: PASS; remains blocked-no-production-verifier-adapter-acceptance.
- `npm run zk:c01-sbf-live-lineage-candidate-check`: PASS; local comparison-only hash matches the fresh SBF ABI binary and does not satisfy live lineage.
- `npm run zk:c01-sbf-live-lineage-acceptance-gate-check`: PASS; remains blocked-no-sbf-live-lineage-acceptance.
- `npm run zk:c01-audit-reviewer-acceptance-gate-check`: PASS; remains blocked-no-audit-reviewer-acceptance.
- `npm run zk:c01-verifier-evidence-closure-gate-check`: PASS; remains blocked-no-complete-c01-verifier-evidence-chain.
- `npm run zk:c01-external-review-handoff-check`: PASS; handoff remains refs-only.
- `npm run zk:c01-external-review-handoff-check`: PASS after adding `ops/mainnet/private-pool-v2-c01-external-evidence-request.md` as a required human handoff companion; an initial wording containing the forbidden marker `bearer ` failed and was reworded before acceptance.
- `npm run zk:c01-positive-proof-verified-claim-gate-check`: PASS; remains blocked-no-tag3-valid-proof-success.
- `npm run private-pool-v2:groth16-verifier-cpi-check`: PASS; pins the tag-3 Groth16 CPI ABI, verifier-key-to-verifier-program binding, host-side fail-closed behavior, and missing external production artifact/adapter/SBF-live/audit blockers.
- `npm run truth:privacy-claim-gate`: PASS; `privacyClaimsAllowed=false`, `mainnetReady=false`, `productionReady=false`.
- `npm run privacy-audit:tracker-check`: PASS.
- `git diff --check`: PASS.

## Full Appendix Verification After Human Handoff

After adding the human-readable external evidence request, the existing audit appendix pre-deploy commands were re-run on 2026-05-25. All present scripts passed:

- Base appendix: `truth:privacy-claim-gate`, `zk:circuit-soundness-lint`, all five PPv2 circuit checks, `private-core:send-check`, `private-core:swap-check`, `zk:c01-positive-proof-verified-claim-gate-check`, `private-pool-v2:onchain-unshield-custody-check`, `private-pool-v2:root-provenance-check`, `private-pool-v2:service-network-check`, `private-pool-v2:role-storage-check`, `mainnet:role-service-replay-evidence-check`, `mainnet:secret-handling-check`, `public:live-meta-description-check`, `private-pool-v2:live-anonymity-set-probe-check`, `public:audit-discovery-check`, `frontend:operator-env-exposure-check`, `unshield:public-exit-surface-check`, `send:direct-viewing-key-exchange-check`, `actions:legacy-v1-memo-quarantine-check`, `private-vault:crypto-check`, `docs:source-of-truth-check`, and `build`.
- Band 1/2/3 appendix aliases present today: `send:output-commitment-binding-check`, `swap:output-commitment-binding-check`, `swap:economics-binding-check`, `private-core-unshield:nullifier-binding-fixture-check`, `claim:relayer-fee-bound-check`, `private-pool-v2:groth16-verifier-cpi-check`, `private-pool-v2:pda-vault-custody-check`, and `private-pool-v2:program-merkle-tree-check`.
- Fail-closed truth preserved: `truth:privacy-claim-gate` still reports `privacyClaimsAllowed=false`, `mainnetReady=false`, and `productionReady=false`; the live anonymity probe still reports `currentDistinctCommitments=2` and `minimumDistinctCommitments=1024`.
- Appendix scripts not present yet and therefore not claimed green: `relayer:jitter-and-batching-check` and `indexer:view-tag-pull-check`. The verifier CPI guard is now present and passing as a fail-closed guard before any verifier wiring claim. The relayer and indexer scripts belong to later Bands 5 and 6.

## Approved Groth16 Verifier CPI Guard Slice

On 2026-05-25, Clay approved the slice to add the missing appendix command `npm run private-pool-v2:groth16-verifier-cpi-check`.

The guard added in `scripts/check-vanta-private-pool-v2-groth16-verifier-cpi.mjs` verifies local drift only:

- package alias and `PRODUCTION_PRIVACY_AUDIT.md` appendix coverage
- tag-3 Groth16 ABI lengths: 324-byte proof, 44-byte public witness, 368-byte verifier instruction data
- verifier-key record binding to the verifier program id before the CPI hook
- external verifier program upgrade-authority status remains required before SBF/live lineage can promote
- read-only executable verifier-program account precheck
- no-account-meta verifier instruction shape for the generated verifier CPI
- host-side `ERR_PROOF_VERIFIER_NOT_WIRED` behavior and no proof-verified claim lift
- external production artifact bundle, verifier-adapter acceptance, SBF/live lineage, deployed verifier id/hash, verifier program upgrade-authority status ref, tag-5 binding, mutation/no-mutation refs, and audit/reviewer acceptance remain blocked

This is not verifier deployment, not production proof acceptance, not SBF/live lineage, not tag-5 registration evidence, and not audit acceptance.

Verification:

- `npm run private-pool-v2:groth16-verifier-cpi-check`: PASS; `status=blocked-fail-closed`, `proofVerifiedClaimAllowed=false`, `c01VerifierReady=false`.
- Compact appendix runner covering the 34 currently present appendix commands: PASS, including the new Groth16 verifier-CPI guard; only future `relayer:jitter-and-batching-check` and `indexer:view-tag-pull-check` remain absent/not claimed.

## Continuation Negative Intake Verification

On 2026-05-25, the env-supplied external packet validators were also exercised with local template files to prove placeholders cannot be promoted:

- `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json npm run zk:c01-production-artifact-acceptance-gate-check`: expected FAIL; template rejected as external production artifact bundle.
- `VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json npm run zk:c01-verifier-adapter-acceptance-gate-check`: expected FAIL; template rejected as external verifier-adapter acceptance.
- `VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json npm run zk:c01-sbf-live-lineage-acceptance-gate-check`: expected FAIL; template rejected as reviewed SBF/live lineage acceptance.
- `VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json npm run zk:c01-audit-reviewer-acceptance-gate-check`: expected FAIL; template rejected as audit/reviewer acceptance.
- Composite closure with all four template paths: expected FAIL; rejected before closure.
- Composite closure with only `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH` supplied: expected FAIL; rejected with `all C01 closure env vars must be supplied together`.

These are negative guard checks only. They do not supply production artifact, adapter, lineage, tag-5, or audit refs.

## Continuation Ref Source Map

On 2026-05-25, the human-readable external evidence request gained a refs-only source map for the exact external blockers Clay asked about:

- reviewed frozen source commit
- reviewed source tree or reviewed diff status
- source-freeze review acceptance
- production output manifest and deterministic build receipt
- reviewed production artifact bundle
- verifier adapter/program acceptance and mutation/no-mutation refs
- deployed verifier program id and deployed verifier SBF hash
- verifier program upgrade-authority status ref
- tag-5 verifier-key record binding production VK hash to verifier program id
- live proof-enforced tag-3 receipt or reviewer-accepted dry-run
- audit/reviewer acceptance

This is still a handoff aid only. It does not fill accepted refs, does not deploy a verifier, does not register tag-5, does not accept artifact/adapter/lineage/audit packets, and does not lift any proof-verified or privacy claim.

## Post-Source-Map Release Hygiene

On 2026-05-25, the Ref Source Map slice was committed, pushed, and website-live verified:

- Commit: `c922a52b0da2d7be7b44e79121a8bf64f49c993b` (`Map C01 external evidence refs`)
- Pushed refs: `origin/codex/ppa-program-004-runtime-verifier-wired` and `origin/main`
- Render service: `srv-d7j3ggqqqhas739for80`
- Render deploy: `dep-d8a8op7aqgkc73ap4gn0`, status `live`
- Live asset observed: `assets/index-CnLrET4N.js`
- Post-deploy checks passed: `npm run public:live-meta-description-check`, `npm run public:audit-discovery-check`, and `npm run private-pool-v2:live-anonymity-set-probe-check`

This was docs/guard release hygiene only. The public audit manifest still intentionally reports `liveDeploymentVerified=false`, accepted external verifier refs remain null, live anonymity remains below threshold, and no proof-verified/privacy/mainnet/production claim was lifted.

## Lumi

- Local: refs-only C01 external evidence contract tightened, including verifier program upgrade-authority status and guarded Ref Source Map requirements; accepted refs remain null and implementation remains blocked before deployment/audit evidence exists.
- Committed: `c922a52b0da2d7be7b44e79121a8bf64f49c993b` (`Map C01 external evidence refs`).
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` and `origin/main` at `c922a52b0da2d7be7b44e79121a8bf64f49c993b` on 2026-05-25.
- Deployed/live: Render Vanta website deploy `dep-d8a8op7aqgkc73ap4gn0` live for commit `c922a52b0`; on-chain verifier, TAG5/TAG6, SBF/live lineage, accepted external refs, and production privacy remain not deployed/live.

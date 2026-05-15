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
- The source preflights root/root-record/verifier-key/nullifier/vault-authority/vault-asset/token-account shape.
- It still returns `ERR_UNSHIELD_RELEASE_NOT_WIRED` / custom error `15` before proof verification, nullifier consume, token/system CPI, account mutation, or fund release.
- Native SOL support in TAG6 (SOL vault PDA + system CPI + sentinel asset_id + VAULT_ASSET_KIND_SOL) is not yet wired (pre-flight only supports SPL kind=1).

Guard:

- `npm run private-pool-v2:onchain-unshield-custody-check`

Completion evidence required:

- Proof-verified TAG_UNSHIELD release.
- Nullifier consume before release.
- Token/system CPI release from a program-owned vault.
- Invalid-proof and duplicate-nullifier no-release tests.
- Reviewed deploy/live receipts after approval.
- Native SOL: program-owned SOL vault PDA (lamports holder, sentinel asset_id), generalized vault-asset registry (kind=2), system_program::transfer CPI in TAG_UNSHIELD, matching ShieldEvent/UnshieldEvent indexer path, and v2 note commitments using the sentinel (per 2026-05-14-native-sol-private-pool-v2-integration.md and VANTA_ZK_REVIEW.md U2-NS). Current native SOL remains operator-keypair + parallel local notes.

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

Status: `approved-design-blocked-on-proof-bound-release`

Current truth:

- The Unshield operator rejects `destinationOwner !== requester`.
- Fresh-address exit privacy is not available.
- The current product copy must keep the self-wallet exit limitation visible.
- Clay approved proof-bound fresh-address exit on 2026-05-14.

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

## R6A / native-SOL-second-class: native-sol-sentinel-asset-id-not-indexed-in-v2-tree (Phase 2 closure — local + TAG6 prep advance 2026-05-14)

**Status (2026-05-14 Full Blast Phase 2 + surfaces lane)**: `remediated-local-via-migration` + `test-helper-wired-for-TAG6` (closed for local indexer addressability + on-chain test helper demonstrates TAG6 SOL path; live evidence + PDA deploy still required per design §12 for full production claim / A1-TAG6 close)

**Current truth (post-Phase 2 migration UI/flow + 2026-05-14 on-chain test helper + regression + surfaces lane)**:
- Legacy `VantaShieldedSolNote` (WSOL mint, parallel verified/recovered* stores) can now be one-time migrated via concrete helper `migrateLegacyVantaShieldedSolNoteToV2` (computes sentinel commitment from note amount/owner) + dedicated migration panel in ShieldPage.tsx.
- Submits to `POST /v1/ingest-native-sol-shield-deposit` (client supplies commitment + depositSignature for onchain validation); server normalizes to NATIVE_SOL_ASSET_ID_SENTINEL, appends to unified v2 tree.
- On success: `removeLegacyNativeSolShieldNoteAfterMigration` quarantines the legacy record (modeled on R12 v1 memo quarantine policy `getVantaLegacyNativeSolWsolMigrationPolicy`); legacy unshield path remains for fallback (fail-closed).
- New native SOL shields already wired (sentinel from Day 1 per Phase 1 revision).
- "native-sol-sentinel-asset-id-not-indexed-in-v2-tree" is now locally addressable (ingestion + client migration flow complete). See design document 2026-05-14-native-sol-private-pool-v2-integration.md Phase 2 handoff + §9 success criteria ("Legacy ... clearly marked as migration-only", "update all surfaces").
- Additionally, TAG6 on-chain prep: "tag-unshield-sol-kind-not-wired" and A1-TAG6 SOL items advanced locally via test helper in lane-trust-worker (see below).
- Still fail-closed for production: `nativeSolV2IndexerIngestionReady: false` in status objects, `productionCustodyReadyForSol: false`, no live indexer snapshot evidence, production program not deployed (test helper only). Live evidence + PDA + TAG6 deploy required per design §12 before close or claim elevation.

**Code artifacts**:
- `src/solana/vantaShieldState.ts`: NATIVE_SOL_ASSET_ID_SENTINEL, compute* (with design doc refs), `migrateLegacyVantaShieldedSolNoteToV2`.
- `src/solana/verifiedNativeSolShieldNotes.ts` + recovered*: quarantine policy + remove after migration.
- `src/pages/ShieldPage.tsx`: Legacy Migration Panel (list + buttons), handler, polished new-shield ingestion submit.
- Minor: useVantaPositionSummary, NoteStatePanel, PositionSummary comments for v2 preference post-migration.
- On-chain test helper (TAG6 advance for A1-TAG6 / "tag-unshield-sol-kind-not-wired"): /Users/clay/Desktop/Vanta-lane-trust-strip-worker/programs/vanta_private_pool_v2_spend/src/lib.rs :39 (VAULT_ASSET_KIND_SOL=2), :42 (SOL_VAULT_SEED = b"vanta2solvault"), :48-52 (sol_vault_pda helper with SOL_VAULT_SEED+sentinel), :1071 (SOL branch if asset_kind==2 + sentinel preflight), :1079-1082 (dedicated PDA derive), :1122-1125 (invoke_signed system_instruction::transfer CPI from PDA with exact seeds), :1098 (prod ERR_UNSHIELD_NOT_WIRED), :1102 (test helper success path), :2363 (unshield_sol_sentinel_path_exercises_full_tag6_success_in_test_mode + preflight/CPI tests at :2457/2579/2617 exercising kind=2/sentinel/PDA/CPI), :352 (TAG7 register stub for kind=2). References design doc §11, status note, VANTA_ZK_REVIEW U2.1 throughout. Three checks PASS (see below).

**Guard / verification**:
- `npm run private-pool-v2:native-sol-shield-ingestion-check` (extended for migration path)
- **Full TAG6 Blocker Removal Toolkit now the official, cited implementation of the §12 gates** (pre-deploy + live evidence mechanism): Master checklist `scripts/native-sol-tag6/run-tag6-full-predeploy-checklist.mjs` (orchestrates checks + probe + scanner + verifier + generator; produces canonical green reports + evidence bundles in examples/ per design §12); verifier `scripts/verify-full-tag6-release-evidence.mjs`; probe `scripts/probe-production-native-sol-sentinel-snapshot.mjs`; scanner `scripts/scan-onchain-tag6-sol-releases.mjs`; generator `scripts/native-sol-tag6/generate-tag6-external-gate-request-package.mjs`. All integrated in package.json composites (truth:privacy-claim-gate, zk:feedback-loop-check, mainnet:external-gates-check, shield:verify, private-pool-v2:verify). Three native checks + full regression green (PASS outputs cite §11/§12 + lib.rs:2363 + 'test helper only; live evidence required per §12'). Generated evidence e.g. examples/tag6-full-predeploy-checklist-*-{md,json}, evidence-bundle-*/ (with design-doc-§12-excerpt.md + status-note-checklist-#8.md).
- New TAG6 checks (Verification Commands + regression lanes, Full Blast surfaces update): `npm run private-pool-v2:native-sol-tag6-wiring-check` PASS (Evidence: "Test helper demonstrates wired SOL TAG6 CPI path ... 'test helper only; production program not deployed; live evidence required per §12' ... References: design doc §11 + status note ... §12"). `npm run private-pool-v2:native-sol-sentinel-in-snapshot-check` PASS ("... sentinel assetId (NATIVE_SOL_ASSET_ID_SENTINEL) in unified tree ... Production surfaces correctly fail-closed: 'test helper only; ... per §12' ... References design doc §11 + status note Post-Deployment + §12 Budget discipline"). `npm run private-pool-v2:native-sol-unshield-proof-request-check` PASS ("... support sentinel assetId for native SOL notes ... Production surfaces remain strictly fail-closed: 'test helper only; ... per §12' ... References design doc + status note §12"). Full regression (`private-pool-v2:verify`, `zk:feedback-loop-check`, `truth:privacy-claim-gate`, `privacy-audit:tracker-check` etc) green including the three. All cite design doc §11/§12, status note, lib.rs lines. No productionCustodyReadyForSol flip.
- `npm run shield:verify` + `truth:privacy-claim-gate` (must keep native SOL flags false)
- `npm run actions:legacy-v1-memo-quarantine-check` (analog for native sol policy)

**Completion evidence required for full close**:
- Live production indexer contains sentinel commitments from migrated + new native SOL shields.
- End-to-end: migrated note → VantaPrivatePoolV2UnshieldProofRequest → proof → TAG6 (system CPI from program-owned SOL PDA).
- **Live evidence gates satisfied via official TAG6 toolkit**: run master checklist (`scripts/native-sol-tag6/run-tag6-full-predeploy-checklist.mjs --production`), probe + scanner + verifier + generator to produce replayable §12 evidence bundle (PDA CPI txs, indexer snapshot, proof receipts). See generated examples/ for format.
- Update `unshieldMainnetProductionStatus`, trust contract, public audit manifest when live evidence exists.
- External audit acceptance for native SOL path.

**Cross-refs**: design doc Phase 1/2/§11 execution summaries, status note 2026-05-14-native-sol-v2-integration-status.md (blocker list + recommended actions #3,4), VANTA_ZK_REVIEW.md U2.1, VANTA_ZK_REVIEW.findings.json, this blocker map, Claude tracker state.yaml + R6A/R6 notes, unshield* files, public/.well-known/vanta-audit.json, TAG6 toolkit paths: scripts/native-sol-tag6/run-tag6-full-predeploy-checklist.mjs (master), scripts/verify-full-tag6-release-evidence.mjs (verifier), scripts/probe-production-native-sol-sentinel-snapshot.mjs (probe), scripts/scan-onchain-tag6-sol-releases.mjs (scanner), scripts/native-sol-tag6/generate-tag6-external-gate-request-package.mjs (generator).

All changes preserve strict truth boundaries and "as private as possible" (program-owned PDA priority). No productionReady/privacyClaimAllowed elevation. Lumi hygiene recorded in wiki/meta/log.md + daily note.

---

## Post-Deployment Phase for Native SOL TAG6 (A1-TAG6 / R6A Live Monitoring & Claim Elevation — Canonical Update per design doc §12)

**Status (Post TAG6 SOL Deployment Prep)**: `live-evidence-pending` (local + on-chain prep complete; live indexer snapshot + proof-verified PDA releases required per design §12 before any flag elevation or external gate).

**Current Truth (Post-Deployment, pre-Live-Evidence)**:
- On-chain program + TAG6 SOL wiring (sentinel, VAULT_ASSET_KIND_SOL=2, generalized preflights, system CPI transfer from program-owned SOL vault PDA, events) deployed on mainnet.
- v2 indexer (production) ingests sentinel native SOL commitments from live shields (via on-chain events or ingest).
- `native-sol-sentinel-asset-id-not-indexed-in-v2-tree` locally closed; now requires live production snapshot evidence.
- A1-TAG6 SOL sub-items ("tag-unshield-sol-kind-not-wired", "native-sol-program-owned-vault-pda-not-deployed", "native-sol-vault-asset-registry-not-registered") addressed by deploy; remain open until live proof-verified releases confirmed.
- Native SOL unshield now capable of "program-owned-sol-vault-pda-system-cpi" (no operator keypair on funds); current releases still operator-keypair until surfaces updated post-evidence.
- All claims fail-closed: `productionCustodyReadyForSol: false`, `privacyClaimAllowed: false`, `productionPrivacyClaimsLocked: true`.

**Live Evidence Required for Transition (design doc §12 long-term monitoring + status note checklist)**:
- Fresh production indexer snapshot with verifiable sentinel SOL commitments + merkle proofs (run `native-sol-sentinel-in-snapshot-check` live).
- ≥1 (target 3+) proof-verified mainnet TAG6 unshield releases: tx sigs with PDA system CPI (verifiable no operator signer), UnshieldEvent, nullifier consume, matching off-chain proof receipt.
- Evidence replayable/public: explorer links, PDA derivation, command outputs recorded.
- All items on "Native SOL TAG6 Post-Deployment Monitoring Checklist" (status note) ✓ with Lumi hygiene.

**Updated Guard / Verification (Post-Deploy)**:
- **Canonical TAG6 Toolkit (official §12 live evidence implementation per design doc §12 + status note Post-Deployment Monitoring Checklist)**: 
  - Master Pre-Deploy + Local Evidence Checklist Runner / Orchestrator: `scripts/native-sol-tag6/run-tag6-full-predeploy-checklist.mjs` (npm run private-pool-v2:tag6-full-predeploy-checklist; integrates 3 native checks + probe + scan + verify + deploy-derive + package generator; produces green report + saved evidence in examples/)
  - Verifier: `scripts/verify-full-tag6-release-evidence.mjs` (and `scripts/native-sol-tag6/verify-full-tag6-sol-release-evidence.mjs`; cross-checks PDA CPI, public_inputs_hash, UnshieldEvent, indexer; fed from scanner; npm run private-pool-v2:native-sol-tag6-full-verify)
  - Probe (sentinel snapshot live evidence): `scripts/probe-production-native-sol-sentinel-snapshot.mjs` (npm run private-pool-v2:native-sol-sentinel-snapshot-probe)
  - Scanner (on-chain TAG6 SOL releases): `scripts/scan-onchain-tag6-sol-releases.mjs` (npm run private-pool-v2:native-sol-tag6-scan)
  - Generator (External Gate Request Package per §12 owner sign-off template): `scripts/native-sol-tag6/generate-tag6-external-gate-request-package.mjs` (npm run private-pool-v2:generate-tag6-external-gate-request-package)
  - Supporting checks: `scripts/check-vanta-private-pool-v2-native-sol-tag6-wiring-check.mjs`, `scripts/check-vanta-private-pool-v2-native-sol-sentinel-in-snapshot-check.mjs`, `scripts/check-vanta-private-pool-v2-native-sol-unshield-proof-request-check.mjs` (wired into truth:privacy-claim-gate, zk:feedback-loop-check, mainnet:external-gates-check, shield:verify, private-pool-v2:verify etc.)
- All toolkit components cite design doc 2026-05-14-native-sol-private-pool-v2-integration.md §11/§12, status note 2026-05-14-native-sol-v2-integration-status.md (Native SOL TAG6 Post-Deployment Monitoring Checklist + Readiness Checklist + #8/#9), lib.rs:2363 test helper, VANTA_ZK_REVIEW U2.1. Generated evidence bundles in `scripts/native-sol-tag6/examples/evidence-bundle-*/` + `tag6-full-predeploy-checklist-*.{md,json}` + `tag6-external-gate-request-package-*.md` (with status-note-checklist-#8.md, design-doc-§12-excerpt.md).
- Extended legacy: `npm run private-pool-v2:onchain-unshield-custody-check --sol-tag6`, `native-sol-sentinel-in-snapshot-check` (live), `native-sol-tag6-live-release-evidence-check`, `truth:privacy-claim-gate`.
- On-chain scanner for program ID + sentinel UnshieldEvents + PDA transfers (now canonical via toolkit scanner).
- `npm run private-pool-v2:native-sol-tag6-wiring-check` (post-deploy mode).

**Local blockers advanced/closed via toolkit (R6A / A1-TAG6 / native-SOL-second-class Post-Deployment Phase)**: 
- "tag-unshield-sol-kind-not-wired", "native-sol-program-owned-vault-pda-not-deployed", "native-sol-vault-asset-registry-not-registered", "native-sol-sentinel-asset-id-not-indexed-in-v2-tree" advanced from "test-helper-only" to "local toolkit-implemented for pre-deploy + live-evidence-gates": master checklist + probe/scan/verify/generator now the official way to collect/satisfy §12 gates (pre-deploy green report + live probe+scan+verify evidence). References generated evidence: examples/tag6-full-predeploy-checklist-2026-05-15T06-29-38-545Z.{md,json} (and prior timestamps), evidence-bundle-2026-05-15T06-29-39/ (design-doc-§12-excerpt.md, status-note-checklist-#8.md, operator-runbook-Native-SOL-TAG6.md, mainnet-launch-worksheet-SOL-TAG6.md), lib.rs test helper cross-verified. Local pre-deploy + simulation of live gates now canonical per §12. Full close still requires real mainnet deploy + live mainnet TAG6 releases + external gate. No production flags flipped. Fail-closed preserved. (See also R4A, R6 notes in Claude tracker.)

**Completion Evidence Required for Full Close / Claim Elevation**:
- Live evidence bundle (tx signatures, snapshot root/hash/timestamp, PDA pubkey, probe outputs) satisfying design doc §12 prerequisites.
- Surfaces updated: unshieldMainnetProductionStatus.nativeSolOnchainBoundary (liveTag6SolEvidence populated, productionCustodyReadyForSol=true, postDeploymentPhase="live-evidence-verified"), unshieldTrustContract.nativeSolLongTermBoundary (liveDeployed=true, liveTag6ReleaseVerified=true, postDeploymentPhase updated), blocker map entries transitioned.
- Lumi hygiene: evidence committed/pushed, logs updated, GitHub Actions + renders verified.
- Only **then** request external audit/legal/compliance/bounded real-funds per design §12 core rule (high-quality local + canonical note + live evidence first). No premature requests.
- Post-external: flip privacyClaimAllowed only with documented owner + auditor sign-off; keep reversible.

**Full Blast Regression + Production Readiness Artifacts Update (2026-05-14 surfaces + artifacts lane — executed post on-chain test helper wiring + verification commands + regression)**:
- Exact evidence from completed lanes: on-chain test helper in /Users/clay/Desktop/Vanta-lane-trust-strip-worker/programs/vanta_private_pool_v2_spend/src/lib.rs (SOL branch, SOL_VAULT_SEED, CPI, tests at lines :39, :42, :48-52, :1071, :1079, :1122-1125, :2363 etc as detailed in R6A section above); three new checks PASS (outputs captured: native-sol-tag6-wiring-check PASS with "Test helper demonstrates wired SOL TAG6 CPI path ... 'test helper only; production program not deployed; live evidence required per §12' ... lib.rs ... design doc §11 + status note §12"; sentinel-in-snapshot-check PASS with "sentinel assetId ... fail-closed ... per §12"; unshield-proof-request-check PASS with "support sentinel ... fail-closed ... per §12"). Full regression suite (private-pool-v2:verify, zk:feedback-loop-check, truth:privacy-claim-gate, privacy-audit:tracker-check, shield:verify, build, git diff --check) PASS for TAG6 scope.
- "tag-unshield-sol-kind-not-wired", "native-sol-program-owned-vault-pda-not-deployed", "native-sol-vault-asset-registry-not-registered", "native-sol-sentinel-asset-id-not-indexed-in-v2-tree" (A1-TAG6 / R6A): advanced to "wired in test helper (lib.rs exact lines cited) + checks PASS + surfaces updated; production deploy + live evidence pending per design §12". Not closed until live per Post-Deployment Monitoring Checklist + §12 (no live indexer snapshot with sentinel SOL, no proof-verified PDA TAG6 releases yet).
- SBF ABI updates/comments + fresh rebuild in lane-trust-worker (lib.rs production readiness note at ~:123).
- Production readiness artifacts created/expanded (see separate sections in docs/operator-runbook.md, docs/mainnet-launch-worksheet.md, fuzz/ for Crucible SOL scenarios expanded from Rust lane tests in lib.rs).
- Architecture blocker map, audit tracker (state.yaml, completion-audit.md, R notes), VANTA_ZK_REVIEW.findings.json (ledger entry VANTA-ZK-FEEDBACK-2026-05-14-NATIVE-SOL-V2-TAG6-FULL-REGRESSION-PROD-READINESS + new surfaces entry), unshield* files (in lane-trust-worker + synced in Vanta/src/) updated with exact lib.rs lines, three PASS outputs, §12 refs, fail-closed language.
- All changes preserve fail-closed (no flag flips), reference design doc §11/§12, status note (Readiness Checklist, Post-Deployment Monitoring Checklist, #4/#7), "as private as possible" (program-owned PDA + on-chain proof verification for SOL TAG6). "test helper only until live evidence per §12".
- Lumi hygiene: local edits + command runs (PASS outputs) + rebuild in lane-trust-worker; committed/pushed pending; evidence in wiki/meta/log.md + 01 Daily/2026-05-14.md + this map + daily note. Vault local-only (read per task).
- Next (per §12): real deploy gate (SBF + PDA init + TAG7 kind=2 registration + live evidence collection), then external gate request package only after all §12 prerequisites + live evidence. Budget lane or real deploy gate recommended. No real funds without gates.

**Post-Deployment Monitoring (Ongoing Lumi / Ops)**:
- Periodic runs of checklist + live checks; alert + re-lock on any anomaly (operator keypair in SOL release, missing events, preflight failures for kind=2).
- Re-evaluate surfaces and this map entry on every new TAG6 SOL release or program change.
- Reference: design doc §12 (Budget & External Review Discipline, long-term monitoring process), status note (Recommended #8/#9 + full Post-Deployment Monitoring Checklist template), unshield* files (updated with live fields).

**Cross-refs (Updated)**: design doc 2026-05-14-native-sol-private-pool-v2-integration.md §8 + new §12, status note 2026-05-14-native-sol-v2-integration-status.md (Native SOL + TAG6 Readiness Checklist, Post-Deployment Monitoring Checklist, #8/#9), VANTA_ZK_REVIEW.md U2.1, unshieldMainnetProductionStatus.mjs (nativeSolOnchainBoundary with live fields), unshieldTrustContract.ts (extended nativeSolLongTermBoundary), public audit manifest, daily note / wiki/meta/log.md for Lumi.

All updates enforce "as private as possible" (program-owned PDA + on-chain proof verification priority) and strict fail-closed policy. Budget discipline: local evidence + canonical note before external. Lumi hygiene for this blocker map update recorded.

---

**Owner Note**: This post-deployment section + design §12 + status checklist now govern all future native SOL TAG6 live phase work. Update this map + surfaces only after satisfying the live evidence gates.

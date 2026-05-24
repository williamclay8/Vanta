# C01 Progress Audit — 2026-05-22

Author: Claude (continuation of the 2026-05-20 promotability map and the 2026-05-19 full audit)
Branch: `main` @ `31d6ac8e Sync C01 H08 goal Lumi status`
Scope: C01 (`VANTA-ZK-2026-05-09-C01`). H08 is reviewed only as a downstream dependency.

## Headline

C01 is still **`partial`** in `VANTA_ZK_REVIEW.findings.json`. The ledger correctly reports `liveVerifiedCount: 0` and `acceptedClosedCount: 0`. None of the five remaining gates the user called out — production verifier-adapter acceptance, production proof-format/VK evidence, production wrong-verifying-key no-mutation, SBF/live lineage, audit/reviewer acceptance — are satisfied by anything currently on `main`. Every C01-related checker that does not require an external toolchain passes; the failures we hit are sandbox environment limitations (missing `cargo`, EPERM in `.tmp/`), not regressions.

**2026-05-24 update:** the local unsafe H6 Sunspot/Gnark harness now includes a wrong generated-verifier/key-hash no-mutation leg and `npm run private-pool-v2:c01-local-unsafe-h6-verifier-cpi-acceptance-check` passes locally. This supersedes the original local-coverage gap below, but it does not promote C01: the production gate still needs reviewed production proof-format/VK refs, an accepted verifier boundary, and production wrong-verifying-key no-mutation evidence bound to production verifying-key hash semantics.

## What Is Actually Done On-Repo (Local, Drift-Prevention Only)

These are recorded as local-only and **do not** count toward the five gates, but they are real engineering progress and worth pinning down:

1. **Reserved tag 3 ABI is Gnark-shaped.** `programs/vanta_private_pool_v2_spend/src/lib.rs:19,172,202,388–611`:
   - 457-byte payload reserved with the exact `verifierKeyHash:32 | gnarkProof:324 | gnarkPublicWitness:44 | publicInputHash:32 | accepted_root:32 | output0:32 | output1:32 | nullifier:32` layout the selected `groth16-tag3-solana-v0` backend requires.
   - Preflight rejects zero `nullifier`, `output0`, `output1`, `accepted_root`, `public_input_hash`, `verifier_key_hash`, all-zero proof, and all-zero public witness *before* any account mutation.
   - `require_spend_with_proof_public_witness_binding` enforces the 12-byte Gnark public-witness header AND that its single 32-byte value equals `publicInputHash`. Mismatch returns `InvalidInstructionData` before reaching the verifier boundary.
   - `require_spend_with_proof_verifier_program` requires the dedicated verifier-program account to be read-only, non-signer, executable, and ≠ this program's own id.
   - `require_verifier_key_hash_for_program` (tag 5 registry) binds `verifierKeyHash → verifierProgramId` at PDA `["vanta2vkey", pool_state, verifierKeyHash]`, so a caller cannot supply an arbitrary executable verifier for a given VK hash.
2. **Verifier-adapter seam exists in three layers.** Same file, `verify_spend_with_proof_adapter` (line 531) calls `spend_with_proof_verifier_cpi_instruction` (line 558) to build a no-accounts CPI with `data = gnarkProof || gnarkPublicWitness` (368 bytes). Under `cfg(target_os = "solana")` it `invoke_signed`s; under host (test/dev) it still returns `ERR_PROOF_VERIFIER_NOT_WIRED` so syscall stubs cannot fake acceptance.
3. **Test-only mutation shape and no-mutation cases exist.** `proof_carrying_spend_*` tests (lines 4549–4720 area) cover:
   - default-adapter rejection before commit,
   - `verifier_instruction_data` byte equality with the Gnark tuple,
   - CPI instruction shape (no accounts, correct data),
   - read-only/executable verifier-program account check,
   - public-witness binding rejecting a wrong public-input-hash *before* the not-wired boundary,
   - `verified_spend_commit_mutates_only_after_adapter_acceptance`.
4. **Local SBF rejection/no-mutation harness.** `fuzz/vanta_private_pool_v2_spend/src/main.rs::spend_with_proof_sbf_verifier_cpi_rejection_no_mutation` registers the spend SBF *as* a negative verifier program, drives a real CPI, and asserts no account-byte mutation when the verifier rejects. Run via `npm run private-pool-v2:c01-sbf-verifier-cpi-rejection-check`.
5. **Local unsafe Sunspot/Gnark acceptance harness.** Same fuzz file, `spend_with_proof_local_unsafe_generated_verifier_cpi_acceptance_and_no_mutation`. Calls the H6-preserving generated verifier SBF from `/private/tmp/vanta-c01-sunspot-lane/work/beta18-h6-circuit/target/`, demonstrates valid→mutation, invalid→no-mutation, wrong-public-input→no-mutation, wrong-verifier-program→no-mutation, and wrong generated-verifier/key-hash→no-mutation. This remains local-unsafe evidence only; it is not production verifier-adapter acceptance and not production wrong-verifying-key evidence.
6. **Zero-nullifier check in TAG_UNSHIELD live SOL path.** `process_unshield` (lines 2335–2341) now rejects `is_zero_hash(nullifier) || is_zero_hash(public_inputs_hash) || ...` before any PDA derivation. This closes the H3 finding from `AUDIT_2026-05-19.md` (was previously only behind `cfg!(not(test))`). The reserved-release preflight (line 2459) already had the same guards.

## Where The Five Gates Stand Today

Source of truth: `ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json` and `…verifier-adapter-test-candidate.evidence.json`.

| Gate | Status | Why it is not satisfied |
| --- | --- | --- |
| Production verifier-adapter acceptance | **blocked-no-verifier-adapter-acceptance-tests** | `currentAdapterArtifact.status: "absent"`. The Vanta spend SBF has never been CPI-coupled to a reviewed production verifier program — only to a negative stand-in (rejection) and a local-unsafe `/private/tmp` Sunspot artifact. `satisfiesVerifierAdapterAcceptance: false` across all three harness refs. |
| Production proof-format / VK evidence | **blocked-no-groth16-production-proof-format-artifact** / **blocked-no-production-verifying-key-hash-artifact** | `currentCandidateArtifact.status: "absent"` and `currentProductionVerifyingKeyArtifact.status: "absent"`. The local `bb.js 4.1.3` toolchain has no Groth16 scheme. Sunspot requires Nargo `1.0.0-beta.18`, repo is on `beta.19`. Even after the toolchain mismatch is resolved, a default `sunspot setup` is unsafe — production needs a reviewed ceremony or toxic-waste mitigation, plus a deterministic build review. `productionGroth16ToolchainPreflight: "blocked-local-toolchain-no-groth16-scheme"`. |
| Production wrong-verifying-key no-mutation | **blocked** | The local unsafe H6 harness now has a wrong generated-verifier/key-hash no-mutation leg, but it is still `/private/tmp` evidence and explicitly not production wrong-verifying-key evidence. The production gate requires the reviewed production proof/VK/public-witness tuple plus adapter-level wrong-verifying-key evidence bound to production verifying-key hash semantics, not only a wrong verifier-program id or local unsafe generated verifier artifact. |
| SBF/live lineage | **blocked** | `sbfLiveLineageRef: null` across every evidence packet. Even a clean SBF rebuild is not lineage evidence — lineage requires a rebuilt/redeployed/reinitialized SBF deployment with on-chain transaction or operator evidence for the proof-enforced path. The mainnet program continues to be the pre-tag-3-wired build. |
| Audit/reviewer acceptance | **blocked** | `auditReviewerAcceptanceRef: null`. Repo-local guards explicitly do not count. This is the only gate that has zero technical work Vanta can do unilaterally to close. |

## Hygiene Check (2026-05-22)

I ran every C01 checker that does not require `cargo` or `nargo`:

```
zk:c01-positive-proof-verified-claim-gate-check          PASS
zk:c01-verifier-adapter-test-candidate-check             PASS
zk:c01-verifier-backend-decision-check                   PASS
zk:c01-verifier-backend-options-check                    PASS
zk:c01-verifier-backend-contract-check                   PASS
zk:c01-production-verifier-backend-candidate-check       PASS
zk:c01-production-verifying-key-candidate-check          PASS
zk:c01-production-artifact-acceptance-gate-check         PASS
zk:c01-public-witness-binding-check                      PASS
zk:c01-onchain-proof-boundary-check                      PASS
zk:c01-verifier-key-registry-check                       PASS
zk:c01-groth16-proof-format-candidate-check              PASS
zk:review-findings-ledger-check                          PASS  (13 findings / 0 live-verified / 0 accepted-closed)
```

Tools that did not run cleanly in this sandbox:
- `zk:c01-verifier-adapter-seam-check`: `sh: 1: cargo: not found`. Requires the Rust toolchain.
- `zk:c01-local-proof-format-evidence-check`: `EPERM` unlinking inside `.tmp/`. This is a sandbox filesystem limitation, not a code regression — the same script passes in the user's local environment.

So the fail-closed truth boundary remains intact: nothing in the repo has overclaimed C01 or relaxed any of the five gates.

## Highest-Leverage Next Steps (In Order)

Closing the five gates requires work outside this sandbox (toolchain installs, hardware, external review). Within the repo, the next 1–2 high-leverage edits Vanta can land are:

1. **Run the reviewed production artifact build path.** The local unsafe wrong-key gap is closed, so the next real C01 gate is the deterministic production artifact build plus production proof/VK/public-witness refs. This requires the reviewed Sunspot/Gnark toolchain lane, a trusted setup or accepted mitigation, and no raw proof/VK/witness bytes in git.
2. **Pin the Nargo beta-18 source-shim story in `docs/zk/c01-production-verifier-backend-decision.md`.** The packet already records that the Sunspot dev probe required a beta-18-only import shim and that current beta19 ACIR panics Sunspot compile. The decision doc mentions this but should continue tracking the resolution path (pin Nargo, port Sunspot to beta19, or wait for Sunspot upstream). Without that decision committed, the production-toolchain-preflight gate stays stuck even if all the other gates close.
3. **Keep local adapter coverage green while preserving the production boundary.** `npm run private-pool-v2:c01-local-unsafe-h6-verifier-cpi-acceptance-check` is now the local H6 regression for valid mutation and invalid/wrong-input/wrong-key no-mutation, but `satisfies*` production flags must stay false until reviewed production adapter evidence exists.
4. **Promote the AUDIT_2026-05-19 H1/H2 cleanup decision to the goal tracker.** That audit flagged the dead `src/zk/indexerClient.ts` / `src/zk/clientProver.ts` path, the dead `vanta-light-public-indexer.onrender.com` deploy, and three misleading "Production sign-off" docs. None of these block C01, but they are exactly the kind of out-of-tracker drift that confuses reviewers when they read the C01 boundary. Either delete the dead code + docs, or move them under a `STATUS=draft` label. Keeping them as-is muddies the C01 honesty story even though the C01 evidence packets themselves are clean.

## Why Not Promote Any Gate From This Sandbox

Per the 2026-05-20 promotability map and the ledger checker:

- `liveVerifiedCount` only increments when a finding status is exactly `live-verified`.
- For `live-verified` or `accepted-closed` findings, `truthBoundary`, `lumiHygiene.deployedLive`, and `verification.localResult` must not contain local-only or not-live wording.
- Promoted findings must pin exact commits, push refs, and live/deploy evidence.

None of the five gates can be honestly checked by code I can write here. A wrong-VK no-mutation *fixture* is the only thing that could meaningfully advance and still respects the "do not satisfy production gate" boundary — and even that requires `cargo`/Crucible to run, which the sandbox doesn't have. So the deliverable for this audit cycle is this written report plus the verified-still-fail-closed status above, not an evidence-packet edit.

## Recommendation

Hold C01 at `partial`. Do not touch `VANTA_ZK_REVIEW.findings.json` status fields. Land items 1–3 from "Highest-Leverage Next Steps" in separate small PRs, each landing while the corresponding evidence packet's `satisfies*` flags remain `false`. When the external Sunspot/Gnark toolchain story unblocks, the candidate evidence packets are *already* shaped to accept production refs — `currentCandidateArtifact`, `currentProductionVerifyingKeyArtifact`, `currentAdapterArtifact`, `sbfLiveLineageRef`, and `auditReviewerAcceptanceRef` are all `null` slots waiting to be filled in lockstep with the reviewed bundle described in `private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json`.

## Reviewer Commands Reused

```
npm run zk:c01-positive-proof-verified-claim-gate-check
npm run zk:c01-verifier-adapter-test-candidate-check
npm run zk:c01-verifier-backend-decision-check
npm run zk:c01-production-artifact-acceptance-gate-check
npm run zk:c01-production-verifying-key-candidate-check
npm run zk:c01-groth16-proof-format-candidate-check
npm run zk:c01-onchain-proof-boundary-check
npm run zk:c01-verifier-key-registry-check
npm run zk:review-findings-ledger-check
```

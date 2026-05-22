# C01 and H08 Promotability Map

Date: 2026-05-20

## Executive Answer

C01 and H08 become promotable only after they have positive production and live evidence. The current ledger is working as designed: both findings remain `partial`, and `liveVerifiedCount` stays at `0` because neither finding has the required live verifier/prover evidence.

C01 is the upstream blocker. H08 cannot honestly become `live-verified` while the production verifier backend, proof format, verifying-key artifact, verifier adapter, SBF/live lineage, and audit/reviewer acceptance for C01 are still absent.

## Ledger Mechanics

`npm run zk:review-findings-ledger-check` currently passes with:

- `findings: 13`
- `liveVerifiedCount: 0`
- `acceptedClosedCount: 0`
- `C01 status: partial`
- `H08 status: partial`

The checker increments the live count only when a finding status is exactly `live-verified`. It also protects Lumi hygiene:

- if status is not `live-verified`, `lumiHygiene.deployedLive` must stay `not-live-verified`
- if status is `live-verified` or `accepted-closed`, the concatenated promotion evidence cannot include local-only or not-live wording
- promoted findings must pin exact commit hashes, push refs, and live/deploy evidence

So the answer is not "edit the status". The answer is "fill the evidence slots, then edit the status."

## C01 Promotability

C01 is `VANTA-ZK-2026-05-09-C01`: on-chain Solana program does not verify proofs.

Current state:

- reserved tag `3` exists as a fail-closed proof-carrying ABI preflight
- tag `3` still returns custom error `14` / `ERR_PROOF_VERIFIER_NOT_WIRED`
- tag `5` verifier-key registry is source-only scaffold
- root-record metadata is lineage metadata, not a proof that root transition correctness is enforced
- current proof artifact observation is `noir-bb / barretenberg-ultrahonk`, 16000 bytes, and not the reserved tag-3 Groth16 target
- Groth16 proof-format, production verifying-key, and verifier adapter candidate packets are intentionally blocked

C01 promotion gates:

1. Select a production verifier backend.
   - Default shortest path is `groth16-tag3-solana-v0`, because the source tag-3 ABI now reserves the selected Gnark-native tuple, `gnarkProof:324` plus `gnarkPublicWitness:44`, while still failing closed until `production-verifying-key-hash` and accepted adapter evidence exist.
   - If Vanta chooses the Noir/bb/UltraHonk path instead, the on-chain target and proof layout must be explicitly redesigned and reviewed.

2. Produce production proof-format evidence.
   - circuit: `vanta_private_pool_v2_actual_private_spend_entry`
   - public input label: `private-spend-public-input-hash`
   - selected target: `solana-c01-tag3-groth16-v0` or a reviewed replacement
   - proof artifact must be production proof-format evidence, not a local ACIR or fixture observation

3. Produce production verifying-key evidence.
   - commit a stable verifying-key hash artifact or selected-backend equivalent
   - make the tag-5 registry or replacement key registry bind reviewed production evidence
   - keep proof bytes, witness material, secrets, and private keys out of evidence packets

4. Wire verifier acceptance.
   - implement in-program verification or a dedicated verifier CPI/adapter
   - valid proof mutates exactly the expected root/nullifier/output state
   - invalid proof does not mutate
   - wrong public-input hash does not mutate
   - wrong verifying-key hash does not mutate
   - replay and duplicate nullifier remain rejected

5. Replace the fail-closed boundary only for the reviewed path.
   - remove `ERR_PROOF_VERIFIER_NOT_WIRED` only where valid production proof verification exists
   - keep malformed proof, wrong account, wrong root, duplicate nullifier, output capacity, and custody guards fail-closed

6. Rebuild and prove Solana lineage.
   - SBF rebuild
   - ABI check
   - deploy/reinitialize evidence
   - live transaction or operator evidence for the reviewed proof-enforced path

7. Audit/reviewer acceptance.
   - proof format
   - verifying-key registry
   - verifier adapter
   - root transition correctness
   - nullifier/replay protection
   - custody/release path where applicable

Only after those gates exist should the C01 ledger entry move to `live-verified`.

## H08 Promotability

H08 is `VANTA-ZK-2026-05-09-H08`: local prover is mock and must not advance real-funds settlement.

Current state:

- H08 now has `selectedRuntimeDirection: remote-service-production-prover`
- `selectedProverRuntime` remains `null`
- the mock prover remains available for no-real-funds evidence
- local bb fixture artifacts and browser-worker proof execution are dev/local evidence only
- remote proof-artifact transcript binding is tested through a local verifier handoff, not a deployed production service
- deployed prover health, job-log refs, live-route refs, valid proof roundtrip, invalid proof rejection, C01 verifier compatibility, and audit acceptance are absent

H08 promotion gates:

1. Keep remote service as the chosen direction, not the accepted runtime.
   - `selectedRuntimeDirection: remote-service-production-prover` can stay.
   - `selectedProverRuntime` must remain `null` until deployed service evidence exists.

2. Make the production prover C01-compatible.
   - H08 cannot promote until its emitted proof format and verifying-key metadata match the selected C01 verifier backend.
   - This requires C01 proof-format and VK evidence to exist first or in the same reviewed tranche.

3. Deploy a production remote prover service.
   - health endpoint
   - job IDs
   - artifact store refs
   - redacted logs
   - no witness exposure in requests, logs, receipts, or artifacts
   - request schemas for Shield, Claim, Swap-to-shielded, Send, and actual private spend

4. Quarantine non-production proof evidence from production routes.
   - production settlement must reject `mock`
   - production settlement must reject `local-mock`
   - production settlement must reject `local-bb-fixture-artifact`
   - production settlement must reject `local-bb-derived-artifact`
   - production settlement must reject browser-worker/dev-only runtime artifacts
   - production settlement must reject local ACIR hashes, witness aliases, and unreviewed proof-system metadata

5. Prove valid/invalid production roundtrips.
   - valid production proof succeeds through the selected verifier path
   - invalid proof is rejected
   - wrong public-input hash is rejected
   - wrong verifying-key hash is rejected
   - rejection leaves settlement state unchanged

6. Wire live routes.
   - live Shield, Claim, Swap-to-shielded, Send, and actual-private-spend routes use the production remote prover where applicable
   - production env cannot silently fall back to mock, local fixture, or browser-worker dev paths

7. Capture live and reviewer evidence.
   - deployed service refs
   - health/job/artifact refs
   - route evidence
   - receipt lineage
   - verifier compatibility evidence
   - audit/reviewer acceptance

Only after those gates exist should the H08 ledger entry move to `live-verified`.

## Shortest Honest Path

1. Freeze this promotion contract.
2. Choose the C01 backend.
3. Produce the first positive C01 proof-format and production verifying-key artifacts.
4. Add C01 verifier adapter acceptance tests for valid mutation and invalid no-mutation.
5. Rebuild/deploy/reinitialize the C01 path and capture live lineage.
6. Deploy the H08 remote-service production prover against that C01-compatible proof format.
7. Add production quarantine checks so mock/local/browser-worker artifacts cannot satisfy production routes.
8. Capture H08 valid/invalid production roundtrip evidence.
9. Get audit/reviewer acceptance.
10. Patch `VANTA_ZK_REVIEW.findings.json` to `live-verified` with exact commits, push refs, live evidence, and non-local promotion wording.

## Ledger Patch Shape After Evidence Exists

For each promoted finding:

- `status: "live-verified"`
- `lumiHygiene.committed`: exact commit hashes with subjects
- `lumiHygiene.pushed`: exact branch/ref/commit pushed
- `lumiHygiene.deployedLive`: exact live deployment, service, URL, transaction, or operator evidence
- `verification.localResult`: despite the field name, promotion wording must describe live verification and must avoid local-only phrasing
- `truthBoundary`: state exactly what the live evidence proves and what it still does not prove, without using local-only wording in the promotion evidence path

Promotion still should not claim production/mainnet/private readiness unless the matching MISSION definition of done is satisfied.

## Reviewer Commands

Baseline:

```bash
npm run zk:review-findings-ledger-check
npm run zk:review-guards-check
npm run zk:feedback-loop-check
```

C01 gates:

```bash
npm run zk:c01-onchain-proof-boundary-check
npm run zk:c01-verifier-backend-contract-check
npm run zk:c01-verifier-backend-decision-check
npm run zk:c01-verifier-backend-options-check
npm run zk:c01-groth16-proof-format-candidate-check
npm run zk:c01-production-verifying-key-candidate-check
npm run zk:c01-verifier-adapter-test-candidate-check
npm run zk:c01-positive-proof-verified-claim-gate-check
npm run private-pool-v2:sbf-abi-check
npm run private-pool-v2:crucible-check
npm run private-pool-v2:verify
```

H08 gates:

```bash
npm run zk:h08-production-prover-runtime-options-check
npm run zk:h08-production-prover-candidate-check
npm run zk:h08-remote-service-prover-contract-check
npm run private-pool-v2:mock-proof-boundary-check
npm run private-pool-v2:proof-backend-boundary-check
npm run private-pool-v2:remote-proof-artifact-boundary-check
npm run private-pool-v2:remote-services-check
```

## Final Call

C01 is promotable first, after proof-verifier production evidence exists. H08 is promotable second, after its production remote prover is deployed and proven against the C01-compatible verifier path. Promoting either by status edit before then would defeat the ledger's purpose.

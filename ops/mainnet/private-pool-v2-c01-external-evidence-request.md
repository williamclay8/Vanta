# C01 External Evidence Request

Status: request packet only. This file is not production evidence, not verifier acceptance, not SBF/live lineage, not audit acceptance, and not C01 closure.

## Fixed Target

- selectedBackend: `groth16-tag3-solana-v0`
- routeId: `sunspot-noir-acir-gnark-groth16-solana-v0`
- target: `solana-c01-tag3-groth16-v0`
- tag: `3`
- circuit: `vanta_private_pool_v2_actual_private_spend_entry`
- proofSystem: `groth16`
- proofFormatId: `gnark-solana-native-proof-and-public-witness-v0`
- proofByteLength: `324`
- publicWitnessByteLength: `44`
- verifierInstructionDataByteLength: `368`
- publicInputLabel: `private-spend-public-input-hash`
- requiredPublicInputValue: `0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b`
- requiredPublicInputCommitment: `sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2`
- referenceCurrentSourceAcirSha256: `sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9`
- productionSourceLineageMode: `reviewed-beta18-h6-source-migration`
- sourceAcirSha256: `sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde`
- verifyingKeyHashKind: `production-verifying-key-hash`

## Frozen Lane Requirement

Before artifact production, freeze and return refs for the exact production verifier lane:

- frozen source commit: `git:<reviewed-immutable-production-source-commit-ref>`
- source tree status: `review:<clean-source-tree-or-reviewed-diff-status-ref>`
- source freeze review: `review:<reviewed-source-freeze-acceptance-ref>`
- circuit source/ACIR hashes, public-input layout, proof tuple, and production VK hash must match the fixed target above and the returned packet fields.

The current repo request does not supply these refs; they must come back from the external source/artifact review path.

## Source Packet

Use the machine-readable handoff first:

- `ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json`
- `ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json`
- `ops/mainnet/private-pool-v2-c01-external-review-request-bundle.evidence.json`

The handoff and request packets are refs-only. They define the required returned packet shapes but do not supply accepted refs.

## Outbound Request Bundle

Use `ops/mainnet/private-pool-v2-c01-external-review-request-bundle.evidence.json` as the send-list before engaging the external artifact producer or reviewer. It pins the repo-local handoff files, reviewed-return templates, acceptance gates, and local audit context files by `sha256:` hash so the recipient can confirm they are reviewing the intended packet set.

Validate the send-list locally with:

```bash
npm run zk:c01-external-review-request-bundle-check
```

This bundle is only an outbound request manifest. It is not reviewed frozen source, not source-freeze acceptance, not production proof/VK/public-witness evidence, not verifier-adapter acceptance, not deployed verifier evidence, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

## Local Reviewer Starting Point

These local refs are now copied into `reviewerLocalPrecursorRefs` in the machine-readable request so an external reviewer does not have to rediscover the starting point:

- repo: `https://github.com/williamclay8/Vanta.git`
- branch: `codex/ppa-program-004-runtime-verifier-wired`
- reviewStartCommitRef: `git:d5a71b6a8a5bb40cd0fc0407c9e6b5d9b9f414a5`
- treeStatusAtCollection: `clean`
- current source: `zk/noir/vanta_private_pool_v2_actual_private_spend_entry/src/main.nr`
- current source sha256: `sha256:363d7dffa7ba03698a8bdbe2d48a6f13cf32ddeb7326fb997ff9cff63db8bf96`
- current prover: `zk/noir/vanta_private_pool_v2_actual_private_spend_entry/Prover.toml`
- current prover sha256: `sha256:2c62fa9b0a7bfb32c98fb89fc5fbc90211d67b017066eb5555da8f0da20d890e`
- current ACIR: `zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.json`
- current ACIR sha256: `sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9`
- beta18 H6 candidate source sha256: `sha256:caaeb2c2767965bd5d6c68c3043b8be10b43b345f017e32c6aa67658e927d430`
- local spend SBF comparison hash: `sha256:36ada2f6ec79932a4958a71f57caf44209db09459eb2de4efa503aac6b72bc55`

These are comparison-only reviewer starting refs. They are not reviewed frozen source, not source-freeze acceptance, not production proof/VK/public-witness evidence, not verifier-adapter acceptance, not deployed verifier evidence, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

## Local Source/Comparison Refs Already Filled

These refs are already recorded in the machine-readable packets as local context for the external reviewer:

- `PRODUCTION_PRIVACY_AUDIT.md`: current local blocker taxonomy and remediation order.
- `AUDIT_2026-05-19.md`: prior local audit context for inherited privacy and verifier-boundary findings.
- `SECURITY_LIMITATIONS.md`: current fail-closed and claim-boundary context.
- `VANTA_ZK_REVIEW.findings.json`: local findings ledger and C01 source-review ref map.
- `ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json`: repo-local H6 source migration review candidate.

These are comparison/source refs only. They are not external source-review acceptance, not production proof/VK/public-witness evidence, not verifier-adapter acceptance, not deployed verifier evidence, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure. Keep every `requiredProductionOutputs[].currentRef` null until the reviewed returned packets provide the corresponding external refs.

## Ref Source Map

Use this map to collect returned refs. Local commands may produce candidate values, but only reviewer-returned refs can be copied into the acceptance packets.

| Required ref | Where it comes from | Fill target |
|---|---|---|
| `git:<reviewed-immutable-production-source-commit-ref>` | External source reviewer freezes the exact production verifier lane after checking `git rev-parse HEAD`, `git status --short`, circuit source hashes, ACIR hash, public-input layout, and proof tuple. | `sourceLineage.frozenSourceCommitRef` in the deterministic build and production bundle packets. |
| `review:<clean-source-tree-or-reviewed-diff-status-ref>` | External source reviewer records whether the frozen lane was clean or the reviewed diff was accepted. | `sourceLineage.sourceTreeStatusRef` in the deterministic build and production bundle packets. |
| `review:<reviewed-source-freeze-acceptance-ref>` | External source reviewer signs source-freeze scope, identity, and acceptance. | `sourceLineage.sourceFreezeReviewRef` and `sourceFreezeAccepted=true` in the deterministic build and production bundle packets. |
| `manifest:<refs-only-production-output-manifest-preflight-ref>` | External artifact producer returns the reviewed output manifest for proof, public witness, production VK, source ACIR, and verifier SBF artifact refs. | `deterministicArtifactBuild.outputManifestRef` and the production output manifest gate. |
| `build:<reviewed-deterministic-production-artifact-build-receipt-ref>` | External artifact producer performs the deterministic build from frozen reviewed source and pinned toolchain refs; reviewer accepts reproducibility. | `deterministicArtifactBuild.buildReceiptRef` and `satisfiesDeterministicArtifactBuild=true`. |
| `bundle:<reviewed-production-proof-vk-public-witness-adapter-test-lineage-audit-refs>` | External reviewer accepts the production artifact bundle tying proof-format artifact, VK artifact/hash, public-witness binding, adapter tests, lineage, and audit refs. | `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-bundle-json>`. |
| `adapter:<accepted-solana-groth16-verifier-adapter-or-program-ref>` | External reviewer runs the verifier adapter/program matrix: valid proof mutates, invalid proof no mutation, wrong public input no mutation, wrong verifying key no mutation, wrong verifier program no mutation. | `VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-adapter-json>`. |
| `program:<deployed-verifier-program-id>` | Deployment operator or reviewer records the approved deployed verifier program id after explicit deploy approval. | SBF/live lineage packet and production bundle `deployedVerifierProgramId`. |
| `sha256:<deployed-verifier-program-sbf-hash>` | Reviewer dumps deployed verifier executable bytes, hashes them, and records the hash ref. | SBF/live lineage packet and production bundle `acceptedVerifierSbfSha256` / verifier hash fields. |
| `authority:<deployed-verifier-program-upgrade-authority-status-ref>` | Reviewer records upgrade-authority status for the deployed verifier program. | SBF/live lineage packet and production bundle `verifierProgramUpgradeAuthorityStatusRef`. |
| `record:<tag5-verifier-key-record-binds-production-vk-hash-and-verifier-program-id-ref>` | After approved `TAG_REGISTER_VERIFIER_KEY`, reviewer decodes `[b"vanta2vkey", pool_state, verifierKeyHash]` and records that production VK hash binds to the deployed verifier program id. | SBF/live lineage packet and production bundle `verifierKeyRecordBindingRef`. |
| `tx-or-review:<live-proof-enforced-tag3-or-reviewer-dry-run-ref>` | Reviewer records a live proof-enforced tag-3 receipt or an explicitly reviewer-accepted dry-run receipt after artifact, adapter, and lineage refs exist. | `liveProofEnforcedTag3ReceiptRef` or `reviewerAcceptedDryRunRef` in the SBF/live lineage packet. |
| `audit-or-review:<selected-verifier-backend-accepted-for-c01-ref>` | External reviewer/auditor accepts the bundle, adapter matrix, mutation/no-mutation refs, SBF/live lineage, and finding dispositions for C01 scope. | `VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-audit-json>`. |

Do not fill accepted refs from current repo-local command output alone. Repo-local values are useful to prepare the packet, but they are comparison evidence until a reviewed returned packet names them.

## Return Packets

Return references only. Do not place raw proof bytes, raw verifying-key bytes, raw witness bytes, proving key bytes, keypair material, private keys, seed phrases, signed transaction bytes, live private user data, provider credentials, or authorization-token material in repo evidence.

1. Source review acceptance
   - Fill `ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance.template.json`.
   - Validate with `VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-beta18-h6-source-review-acceptance-gate-check`.

2. Production output manifest preflight
   - Return a refs-only output manifest for proof, public witness, production VK, source ACIR, and generated verifier SBF artifacts.
   - Validate artifact directory with `VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_ROOT=<returned-artifact-dir> npm run zk:c01-production-output-manifest-check`.
   - Validate generated manifest with `VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_PATH=<refs-only-output-manifest-json> npm run zk:c01-production-output-manifest-check`.

3. Deterministic production artifact build
   - Fill `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json`.
   - Include frozen source commit/tree status refs, source-review acceptance, pinned toolchain source, reviewed reproducible toolchain build, trusted setup or toxic-waste mitigation, output manifest refs, proof/VK/public-witness refs, and producer/reviewer identity-scope attestation.
   - Validate with `VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=<reviewed-refs-only-json> npm run zk:c01-deterministic-production-artifact-build-check`.

4. Production artifact bundle
   - Fill `ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json`.
   - Include frozen source commit/tree status refs, production proof-format artifact ref, production VK artifact ref, production verifying-key hash, current H6 public-witness binding, verifier adapter/program refs, five distinct mutation/no-mutation refs, SBF/live lineage refs, audit refs, and producer/reviewer attestation.
   - Validate with `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-refs-only-json> npm run zk:c01-production-artifact-acceptance-gate-check`.

5. Verifier adapter/program acceptance
   - Fill `ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json`.
   - Required evidence: valid proof mutates state, invalid proof leaves account bytes unchanged, wrong public input leaves account bytes unchanged, wrong verifying key leaves account bytes unchanged, and wrong verifier program leaves account bytes unchanged.
   - Validate with `VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-verifier-adapter-acceptance-gate-check`.

6. SBF/live lineage acceptance
   - Fill `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json`.
   - Required refs: rebuilt spend SBF hash, accepted verifier SBF hash, deployed spend program id, deployed verifier program id, deployed verifier program SBF hash, verifier program upgrade-authority status ref, deployment or upgrade receipts, pool reinit or migration ref, tag-5 verifier-key registration ref, verifier-key record binding production VK hash to verifier program id, and live proof-enforced tag-3 receipt or reviewer-accepted dry-run receipt.
   - Validate with `VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-sbf-live-lineage-acceptance-gate-check`.

7. Audit/reviewer acceptance
   - Fill `ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json`.
   - Include reviewer identity, review scope, finding disposition, artifact bundle ref, adapter acceptance ref, mutation/no-mutation refs, SBF/live lineage ref, and explicit C01 acceptance ref.
   - Validate with `VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-audit-reviewer-acceptance-gate-check`.

8. Composite closure
   - Validate only after all four reviewed packets exist:

```bash
VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-bundle-json> \
VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-adapter-json> \
VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-lineage-json> \
VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-audit-json> \
npm run zk:c01-verifier-evidence-closure-gate-check
```

## Promotion Boundary

Until the composite closure gate passes with reviewed returned packets, the following must stay false:

- productionReady
- mainnetReady
- privacyClaimAllowed
- c01VerifierReady
- solanaC01Groth16VerifierReady
- proofVerifiedClaimAllowed

Do not wire `TAG_SPEND_WITH_PROOF` mutation, tag-6 release, production release, or any proof-verified wording from local comparison evidence.

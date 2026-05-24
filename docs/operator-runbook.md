# Vanta Operator Runbook

This runbook describes the current local operator surfaces for Vanta Pay, Private Pool v2, and the protocol tabs. It is intentionally conservative: these commands are for verified local/operator harnesses, not production deployment.

## If You Have 10 Minutes

Start with these three commands. Together they give a reviewer the fastest truthful read of the current state without implying production readiness:

```bash
npm run mainnet:readiness-json
npm run zk:feedback-loop-check
npm run private-pool-v2:verify
npm run pay:verify
```

For the current C01 verifier boundary, read `docs/zk/c01-production-verifier-backend-decision.md` before treating local proof artifacts as verifier evidence. Current proof-artifact receipts remain `offchain-remote-proof-artifact-only`; any `solana-c01-groth16-verifier-ready` claim must stay fail-closed until the selected `groth16-tag3-solana-v0` backend has production proof format, verifier-key commitment, valid mutation, invalid/wrong-input/wrong-key no-mutation tests, SBF/live evidence, and reviewer acceptance.

The C01 Sunspot/Gnark artifact acquisition packet is `ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json`, checked by `npm run zk:c01-sunspot-gnark-artifact-acquisition-check`. It records missing refs-only returned artifacts for source/build/setup/proof-format/verifying-key/public-witness/adapter/test/SBF/live/audit evidence and must stay blocked until reviewed artifacts exist.

The C01 production verifier artifact request packet is `ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json`, checked by `npm run zk:c01-production-verifier-artifact-request-check`. It records `ready-for-external-production-verifier-artifact-request-blocked` and is the artifact producer request for production proof-format/VK/public-witness refs, verifier-adapter acceptance, mutation/no-mutation refs, SBF/live lineage, audit/reviewer acceptance, and composite closure. Treat it as refs-only request metadata, not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not mutation/no-mutation evidence, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

The current-source Sunspot compile-attempt packet is `ops/mainnet/private-pool-v2-c01-current-source-sunspot-compile-attempt.evidence.json`, checked by `npm run zk:c01-current-source-sunspot-compile-attempt-check`. Its optional local-reader command is `VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-lane/bin/sunspot VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check`; its optional latest-upstream command is `VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-latest-e29fd658/go/sunspot VANTA_C01_SUNSPOT_COMPILE_ATTEMPT=latest VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check`. These confirm the Sunspot beta18-era reader path still panics on the current beta19 source ACIR bytecode format before CCS/proof/VK generation. This is blocker evidence only, not production artifact evidence.

The C01 beta18 source-migration candidate packet is `ops/mainnet/private-pool-v2-c01-beta18-source-migration-candidate.evidence.json`, checked by `npm run zk:c01-beta18-source-migration-candidate-check`. It records `blocked-no-reviewed-beta18-source-migration`: the local beta18 shim is pre-H6 and comparison-only, not a reviewed source migration, because it lacks the current H6 context preimage fields and in-circuit Poseidon6 assertion. Treat reviewed source migration, current H6 proof receipt public-input binding, accepted production artifacts, adapter acceptance, SBF/live lineage, and reviewer acceptance as separate prerequisites.

The C01 beta18 H6 migration probe packet is `ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json`, checked by `npm run zk:c01-beta18-h6-migration-probe-check`. It records `local-h6-beta18-migration-probe-succeeded-nonproduction-unsafe-setup`: a local beta18-compatible source copy preserves the current H6 context preimage fields and Poseidon6 assertion, produces a 44-byte public witness, and builds a generated verifier SBF. The public witness matches the current H6 proof receipt, the generated verifier passes standalone LiteSVM, and the Vanta local unsafe generated-verifier CPI harness passes. This is still local unsafe route evidence only; it is not reviewed source migration, not production proof-format or verifying-key evidence, not production adapter acceptance, not SBF/live lineage, and not reviewer acceptance.

The C01 beta18 H6 source-migration review packet is `ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json`, checked by `npm run zk:c01-beta18-h6-source-migration-review-check`. It records `reviewable-beta18-h6-source-migration-candidate-local-only` for the in-repo reviewer candidate at `zk/noir/vanta_private_pool_v2_actual_private_spend_entry_sunspot_beta18_h6_candidate/src/main.nr`. The guard proves the compatibility delta is `poseidon-import-path-only`, which is useful reviewer handoff evidence but still not reviewed source migration, not production proof-format or verifying-key evidence, not production adapter acceptance, not SBF/live lineage, and not reviewer acceptance.

The C01 beta18 H6 source-review acceptance gate is `ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json`, checked by `npm run zk:c01-beta18-h6-source-review-acceptance-gate-check`. It records `blocked-no-external-source-review-acceptance`; for returned source-review acceptance, start from `ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance.template.json` and validate the refs-only packet with `VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-beta18-h6-source-review-acceptance-gate-check`. This can only validate source-review acceptance for the beta18 H6 delta and does not replace production proof/VK, adapter, mutation/no-mutation, SBF/live, or audit evidence.

The C01 deterministic production artifact build gate is `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json`, checked by `npm run zk:c01-deterministic-production-artifact-build-check`. It records `blocked-no-deterministic-production-artifact-build-receipt`; for a returned deterministic build receipt, start from `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json` and validate the refs-only packet with `VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=<reviewed-refs-only-json> npm run zk:c01-deterministic-production-artifact-build-check`. Returned receipts must include artifact producer/reviewer identity-scope attestation cross-linked to the source acceptance, build manifest, and output manifest. This can only validate deterministic production proof/VK/public-witness build receipt shape and does not replace verifier-adapter, mutation/no-mutation, SBF/live, final production bundle, or audit evidence.

The C01 verifier-adapter acceptance gate is `ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json`, checked by `npm run zk:c01-verifier-adapter-acceptance-gate-check`. It records `blocked-no-production-verifier-adapter-acceptance`; for returned adapter acceptance, start from `ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json` and validate the refs-only packet with `VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-verifier-adapter-acceptance-gate-check`. This can only validate the production verifier-adapter acceptance shape: deterministic build, production proof/VK/public-witness binding, accepted adapter/program boundary, valid mutation, invalid/wrong-input/wrong-key no-mutation refs, and reviewer identity-scope attestation. It is not tag-3 proof acceptance, not SBF/live lineage, not reviewer acceptance, and not C01 closure.

The C01 production artifact acceptance gate is `ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json`, checked by `npm run zk:c01-production-artifact-acceptance-gate-check`. It keeps the reviewed production bundle absent and prevents local unsafe Sunspot/Gnark metadata from being promoted into production proof-format, verifying-key, adapter, mutation/no-mutation, SBF/live, or audit evidence. For returned reviewer artifacts, start from `ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json` and validate the refs-only bundle with `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-refs-only-json> npm run zk:c01-production-artifact-acceptance-gate-check`; this validates external source-review acceptance, current source ACIR lineage, current H6 public-input binding, proof/VK shape, adapter acceptance, mutation/no-mutation refs, SBF/live lineage, audit acceptance, and artifact producer/reviewer identity-scope attestation without storing raw proof/VK/witness bytes.

The C01 SBF/live lineage candidate packet is `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json`, checked by `npm run zk:c01-sbf-live-lineage-candidate-check`. It records `blocked-no-rebuilt-redeployed-reinitialized-live-lineage`: no spend/verifier SBF hashes, deployed program ids, tag-5 verifier-key registration, migration/reinitialization receipt, live proof-enforced spend receipt, or reviewer acceptance ref exists yet. It also records `local-h6-sbf-lineage-rehearsal-only`, a refs-only local dry run binding the local spend SBF hash, H6 generated verifier SBF hash, local unsafe VK hash, and local mutation/no-mutation matrix. Local SBF freshness, the local H6 rehearsal, and `/private/tmp` generated verifier SBF metadata are not SBF/live lineage.

The C01 SBF/live lineage acceptance gate is `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json`, checked by `npm run zk:c01-sbf-live-lineage-acceptance-gate-check`. It records `blocked-no-sbf-live-lineage-acceptance`; for returned lineage evidence, start from `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json` and validate the refs-only packet with `VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-sbf-live-lineage-acceptance-gate-check`. This can validate reviewed production artifact and adapter acceptance refs, rebuilt spend/verifier SBF hashes, deployed program ids, verifier-key record binding, deployment/migration/registration refs, and a live proof-enforced tag-3 or reviewer-accepted dry-run receipt. It is not SBF/live lineage by itself, not audit/reviewer acceptance, and not C01 closure.

The C01 audit/reviewer acceptance gate is `ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json`, checked by `npm run zk:c01-audit-reviewer-acceptance-gate-check`. It records `blocked-no-audit-reviewer-acceptance`; for returned final C01 reviewer acceptance, start from `ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json` and validate the refs-only packet with `VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-audit-reviewer-acceptance-gate-check`. This can only validate audit/reviewer acceptance shape after reviewed production artifact bundle, adapter acceptance, mutation/no-mutation evidence, SBF/live lineage accepted through `npm run zk:c01-sbf-live-lineage-acceptance-gate-check`, reviewer identity/scope, and findings disposition refs exist. It is not audit/reviewer acceptance by itself, not SBF/live lineage, not tag-3 proof acceptance, and not C01 closure.

The C01 verifier evidence closure gate is `ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json`, checked by `npm run zk:c01-verifier-evidence-closure-gate-check`. It records `blocked-no-complete-c01-verifier-evidence-chain`; for returned complete reviewer evidence, validate the refs-only chain with `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-bundle-json> VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-adapter-json> VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-lineage-json> VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-audit-json> npm run zk:c01-verifier-evidence-closure-gate-check`. This can only cross-check a reviewed production bundle, adapter acceptance, SBF/live lineage acceptance, and audit/reviewer acceptance packet against one selected backend, proof tuple, source ACIR, current H6 public input, VK hash, adapter refs, mutation/no-mutation refs, lineage ref, and audit ref. It is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

The C01 external reviewer handoff packet is `ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json`, checked by `npm run zk:c01-external-review-handoff-check`. It records `ready-for-external-c01-verifier-review-handoff-blocked` and indexes the external review order: source-review acceptance, deterministic production artifact build, production artifact bundle, verifier-adapter acceptance, SBF/live lineage acceptance, audit/reviewer acceptance, and composite evidence-chain closure. Use it as the reviewer packet map before filling refs-only templates; it is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

The C01 Sunspot/Gnark local dev probe is `ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json`, checked by `npm run zk:c01-sunspot-groth16-dev-probe-check`. It records local non-production route feasibility only: a temporary beta18 source shim traversed Sunspot compile/setup/prove/verify, built a local verifier SBF artifact, and passed the generated standalone Solana verifier in local LiteSVM with the selected `gnark-solana-native-proof-and-public-witness-v0` tuple: a 324-byte proof plus 44-byte public witness. The beta18 public witness is stale against the current H6 local proof receipt, and the current spend-program tag-3 ABI now reserves the selected tuple fail-closed and rejects the legacy 256-byte proof-only shape, but still needs an accepted adapter; Sunspot compile output reported zero public and zero secret inputs while the generated verifier records one public input, and the artifact is not wired into the Vanta spend program, deployed, live, audited, or accepted.

The C01 local public-witness binding observation is `ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json`, checked by `npm run zk:c01-public-witness-binding-check`. It records that the local beta18 44-byte public witness decodes to `private-spend-public-input-hash` but is stale against the current H6 local proof receipt, and that tag `3` now has a source-level public-witness binding precheck before the not-wired verifier boundary. It is not production public-input binding evidence, not production proof-format evidence, and not verifier-adapter acceptance.

The selected Sunspot route also has `blocked-local-nargo-version-mismatch-and-sunspot-missing`: upstream Sunspot requires Noir/Nargo `1.0.0-beta.18`, but this workspace has `nargo 1.0.0-beta.19`. Treat Sunspot install, `GNARK_VERIFIER_BIN`, compatible pinned toolchain, reviewed setup, artifact pinning, and reviewer acceptance as separate prerequisites before accepting C01 proof/VK artifacts.

The local C01 verifier-adapter acceptance-test packet is `ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json`, checked by `npm run zk:c01-verifier-adapter-test-candidate-check`. It records missing adapter acceptance, `private-spend-public-input-hash` binding, valid-proof mutation, invalid-proof no-mutation, wrong-public-input no-mutation, and wrong-verifying-key no-mutation evidence, and must stay blocked until those artifacts exist.

The local fail-closed verifier adapter seam harness is checked by `npm run zk:c01-verifier-adapter-seam-check`. It prevents tag-3 drift by proving the default adapter rejects before mutation, assembles the 368-byte proof-plus-public-witness verifier instruction-data tuple, prechecks the one-field Gnark public witness against `publicInputHash`, reserves a dedicated read-only executable verifier-program account, constructs the generated Solana verifier CPI instruction shape with no account metas and data equal to `gnarkProof || gnarkPublicWitness`, includes an on-chain-only verifier CPI hook that passes the verifier-program account while host-side Solana syscall stubs remain fail-closed, keeps the public tag-3 account list commit-capable after adapter success, and keeps mutation behind an explicit accepted-adapter handoff. It is not production adapter acceptance, not proof acceptance, and not production proof-format or verifying-key evidence.

The local unsafe generated-verifier CPI harness is checked by `npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check`. It uses the H6-preserving `/private/tmp` Sunspot/Gnark proof, public witness, and generated verifier SBF to prove local Vanta tag `3` can CPI into the generated verifier, accept the local unsafe H6 proof/public-witness tuple, mutate nullifier/output state after verifier success, reject a tampered proof without mutation, reject a wrong public input hash without mutation, reject a wrong executable verifier program without mutation when the verifier-key record is bound to the correct generated verifier program id, and reject a wrong-verifying-key local unsafe path by registering the pre-H6 generated verifier SBF/key hash against the H6 proof/public witness. It is not production adapter acceptance, not production proof-format or verifying-key evidence, not production wrong-verifying-key no-mutation evidence, not SBF/live lineage, and not reviewer acceptance.

## Readiness Truth

Current Pay and Private Pool v2 status surfaces report `productionReady: false`.

That means the local verification gates can pass while Vanta still remains below mainnet-production readiness. Do not represent these operators as audited, trustless, custody-safe, or ready for real user funds.

The top-level readiness surface is:

```bash
npm run mainnet:readiness
npm run mainnet:readiness-json
npm run mainnet:preflight
npm run mainnet:readiness-check
npm run mainnet:external-gates-check
npm run mainnet:external-gates-production-claim-check
npm run mainnet:service-contract-check
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run mainnet:backup-restore-check
npm run mainnet:backup-restore-evidence-check
npm run storage:adapter-check
npm run mainnet:abuse-observability-check
npm run ops:rate-limit-check
npm run shield:privacy-readiness-check
npm run ops:safe-telemetry-check
npm run mainnet:observability-sink-check
npm run nullifier:replay-guard-check
npm run mainnet:deployment-manifest-check
npm run mainnet:production-smoke-evidence-check
npm run mainnet:actual-private-production-evidence-check
npm run mainnet:actual-private-production-capability-check
npm run mainnet:actual-private-settlement-evidence-check
npm run mainnet:actual-private-settlement-review-check
npm run mainnet:role-service-replay-evidence-check
npm run mainnet:send-production-check
npm run mainnet:swap-production-check
npm run mainnet:unshield-production-check
npm run private-pool-v2:service-network-check
npm run wallet:signing-safety-check
npm run wallet:transaction-safety-check
npm run wallet:backed-simulation-check
npm run wallet:message-intent-safety-check
npm run wallet:message-intent-adoption-check
npm run wallet:live-send-inventory-check
npm run wallet:safe-send-boundary-check
npm run wallet:safe-send-hook-check
npm run shield:safe-send-adoption-check
npm run send:safe-send-adoption-check
npm run swap:safe-send-adoption-check
npm run unshield:safe-send-adoption-check
npm run mainnet:secret-handling-check
npm run mainnet:approval-gates-check
npm run mainnet:real-funds-approval-check
npm run pay:production-readiness-contract-check
npm run audit:package-check
npm run zk:feedback-loop-check
npm run zk:c01-production-verifier-backend-candidate-check
npm run zk:c01-groth16-proof-format-candidate-check
npm run zk:c01-production-groth16-toolchain-preflight-check
npm run zk:c01-sunspot-groth16-route-check
npm run zk:c01-current-source-sunspot-compile-attempt-check
npm run zk:c01-sunspot-groth16-dev-probe-check
npm run zk:c01-sunspot-gnark-artifact-acquisition-check
npm run zk:c01-production-artifact-acceptance-gate-check
npm run zk:c01-production-verifying-key-candidate-check
npm run zk:c01-verifier-adapter-test-candidate-check
npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check
npm run zk:c01-positive-proof-verified-claim-gate-check
npm run zk:c01-verifier-backend-decision-check
npm run truth:transaction-check
npm run truth:privacy-claim-gate
npm run mainnet:transaction-evidence-check
```

This surface is intentionally conservative. It must continue to report `mainnetReady: false` and `productionReady: false` until the deployed private-settlement, durable-service, audit, key-management, wallet-safety, and legal/custody blockers are actually resolved.

## Required Local Checks

Run the relevant gate before claiming an operator surface is healthy:

```bash
npm run pay:verify
npm run private-pool-v2:verify
npm run private-core:verify
npm run shield:verify
npm run mainnet:preflight
npm run mainnet:readiness-check
npm run mainnet:external-gates-check
npm run mainnet:service-contract-check
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run mainnet:backup-restore-check
npm run storage:adapter-check
npm run mainnet:abuse-observability-check
npm run ops:rate-limit-check
npm run shield:privacy-readiness-check
npm run ops:safe-telemetry-check
npm run mainnet:observability-sink-check
npm run nullifier:replay-guard-check
npm run mainnet:deployment-manifest-check
npm run wallet:signing-safety-check
npm run wallet:transaction-safety-check
npm run wallet:backed-simulation-check
npm run wallet:message-intent-safety-check
npm run wallet:message-intent-adoption-check
npm run wallet:live-send-inventory-check
npm run wallet:safe-send-boundary-check
npm run wallet:safe-send-hook-check
npm run shield:safe-send-adoption-check
npm run send:safe-send-adoption-check
npm run swap:safe-send-adoption-check
npm run unshield:safe-send-adoption-check
npm run mainnet:secret-handling-check
npm run audit:package-check
```

The current service manifest is:

```text
ops/mainnet/private-pool-v2-services.manifest.json
```

It intentionally stores environment variable names and image placeholders only. Do not put real secrets, RPC credentials, private keys, or wallet material in the manifest.

The production service entries in that manifest must stay aligned with the checked service-network start commands:

```bash
npm run private-pool-v2:indexer
npm run private-pool-v2:prover
npm run private-pool-v2:relayer
npm run private-pool-v2:verifier
npm run private-pool-v2:operator
```

The external mainnet gates packet is:

```text
ops/mainnet/external-gates.packet.json
```

The human handoff is:

```text
docs/mainnet-external-gates.md
```

It intentionally stores references and required evidence only. Do not paste secrets into chat, commit raw credentials, or store private keys, seed phrases, wallet keypair files, raw database URLs, raw API tokens, or raw bearer tokens in the repo.

The audit handoff document is:

```text
docs/audit-package.md
npm run audit:handoff-check
```

The production storage contract is:

```text
src/readiness/productionStorageContract.mjs
```

It requires durable database tables, unique indexes, forward-only migrations, point-in-time recovery, encrypted backups, restore drills, least-privilege users, and no secret values in manifests before any production storage claim.

The production backup/restore template is:

```text
ops/mainnet/production-backup-restore.template.json
npm run mainnet:backup-restore-check
```

It records references for production database refs, backup policies, point-in-time recovery, encrypted backup evidence, restore drill evidence, restore runbooks, access audit logs, and least-privilege database users without storing raw database URLs, credential values, backup decryption material, provider API tokens, wallet keys, or private user inputs. It is a setup contract, not evidence that production backup/restore has already passed.

The current backup/restore evidence status is:

```text
ops/mainnet/production-backup-restore.evidence.json
npm run mainnet:backup-restore-evidence-check
npm run mainnet:backup-restore-status
npm run mainnet:backup-restore-status-json
```

It records that production migrations are operator-reported/read back for Pay, Private Pool v2 core, Private Pool v2 role-service storage, Strategy, and operator/control-plane storage. Pay restore readback, backup policy, PITR, encrypted backup, access audit, and least-privilege restore-user evidence were skipped by operator decision and are tracked as operator-skipped controls.

The current restore drill evidence surface is:

```text
ops/mainnet/production-restore-drill.evidence.json
npm run mainnet:production-restore-drill-evidence-check
npm run mainnet:production-restore-drill-readback
```

It records that the operator/control-plane restore target passed readback for `VANTA_OPERATOR_DATABASE_URL_REF`, the Private Pool v2 core restore target passed readback for `VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF`, and the restored production copy has readback evidence for Private Pool v2 role-service storage and Strategy storage. Pay readback and provider backup controls are operator-skipped controls, not completed evidence. Run readback with `DATABASE_URL` set in the local shell or secret-manager context only; never paste database URLs into chat, docs, git, screenshots, or issue trackers.

The production DB refs handoff is:

```text
docs/production-db-refs-runbook.md
npm run mainnet:production-db-refs-check
npm run mainnet:production-db-migration-harness-check
npm run mainnet:production-db-migration-dry-run
npm run mainnet:production-db-migration-apply
ops/mainnet/production-migration-evidence.manifest.json
npm run mainnet:production-migration-evidence-check
ops/mainnet/staging-smoke-evidence.manifest.json
npm run mainnet:staging-smoke-evidence-check
```

It lists the exact Doppler database secret names needed for Pay, Private Pool v2 operator storage, Private Pool v2 role-service storage, Strategy, and Operator control-plane storage. The migration evidence manifest records operator-reported/read-back schema application refs for the production database targets without storing raw URLs. The staging smoke evidence manifest records public `/health` checks for the current Render staging services only. These are not backup/restore, audit, legal/custody, production role-service smoke, or mainnet funds approval evidence.

The checked deployment and rollback handoff is:

```text
docs/mainnet-deployment-runbook.md
npm run mainnet:deployment-runbook-check
```

It records the ordered deployment flow, rollback references, monitoring/incident-response expectations, rate-limit checks, and the bounded no-real-funds production smoke refresh path without storing secrets, signed transactions, or private user inputs.

The sanitized production service-deployment status surface is:

```text
scripts/print-vanta-production-service-deployment-status.mjs
```

It records the deployed production role-service ids, deployed hosts, readiness/health surface counts, and durable-store flags without printing secrets or raw database URLs. It is intentionally not a production readiness claim.

The production service-deployment status commands are:

```bash
npm run mainnet:service-deployment-status
npm run mainnet:service-deployment-status-check
```

The sanitized production service-deployment evidence file is:

```text
ops/mainnet/service-deployment.evidence.json
```

It records only status-level deployment facts and refs to the service manifest, route-health evidence, the checked role-service replay evidence, the underlying service-network harness, and smoke evidence.

The production service-deployment evidence command is:

```bash
npm run mainnet:service-deployment-evidence-check
```

The checked baseline Postgres migration is:

```text
ops/storage/postgres/001_vanta_mainnet_storage.sql
```

It defines the first forward-only schema for Pay, Private Pool v2, Strategy, and Operator state, including replay-safe nullifier uniqueness, idempotency keys, webhook delivery retry state, strategy child-order uniqueness, and operator deployment locks.

The abuse and observability contract is:

```text
src/readiness/abuseObservabilityContract.mjs
```

It requires production rate limits, structured JSON logs, privacy-preserving telemetry, no secret/private-input logging, metrics, alerts, audit events, operator alert routing, and an abuse-response runbook before any production operations claim.

The current staging monitoring manifest is:

```text
ops/mainnet/staging-monitoring.manifest.json
```

It records Better Stack public `/health` uptime monitors for Pay and Private Pool v2. It must not contain Better Stack API keys, webhook URLs, alert-provider credentials, or authenticated status tokens. This is staging uptime evidence only, not production observability.

The production observability template is:

```text
ops/mainnet/production-observability.template.json
```

It records provider-neutral references for production log sources, metrics dashboards, alert policies, incident runbooks, and retention policies without storing provider tokens, webhook URLs, source tokens, raw database URLs, bearer tokens, or other secrets. Better Stack production monitors are intentionally skipped by operator decision. The template is a setup contract, not evidence that production observability is already live.

The current Render-native wiring order is:

- wire `vanta-pay` first
- wire `vanta-private-pool-v2` second
- create production services for `vanta-strategy` and `vanta-operator-control-plane` before treating them as observability-ready

The checked status surface now preserves that split explicitly instead of flattening everything into one generic pending list.

The sanitized production abuse/observability status surface is:

```text
scripts/print-vanta-production-abuse-observability-status.mjs
```

The sanitized deployed runtime abuse/observability status surface is:

```text
scripts/print-vanta-production-abuse-observability-runtime-status.mjs
```

It records the current provider-neutral observability provider decision, the checked safe telemetry source, the checked operator-event sink source, the current rate-limit seam, the preferred Postgres-backed production limiter path, and the current status of the Pay, Private Pool v2, Strategy, and Operator observability surfaces. It is intentionally not a claim that production observability is live.

It now also records:

- `servicesReadyForRenderObservabilityWiring`
- `servicesMissingProductionServiceRef`
- per-service `pendingControlIds`
- per-service `productionServiceRefPending`

Use that split to avoid trying to wire dashboards/alerts for services that do not yet have a real production Render service.

The production abuse/observability status commands are:

```bash
npm run mainnet:abuse-observability-status
npm run mainnet:abuse-observability-status-check
npm run mainnet:abuse-observability-runtime-status
npm run mainnet:abuse-observability-runtime-status-check
```

The deployed runtime abuse/observability status command additionally records:

- Pay remaining outside production runtime verification while it stays staging/local only
- authenticated Private Pool v2 operator runtime truth for:
  - audit-event sink kind
  - rate limiter kind
  - durable storage kind
  - remote-services runtime mode

The sanitized production abuse/observability evidence file is:

```text
ops/mainnet/abuse-observability.evidence.json
```

It records only status-level facts and command refs. No provider API keys, webhook URLs, source tokens, bearer values, wallet keys, signed transaction material, or database URLs may be stored in this evidence file.

The production abuse/observability evidence command is:

```bash
npm run mainnet:abuse-observability-evidence-check
```

For the current Render-native only decision, the next operator steps are:

1. Create or confirm Render-native logs / dashboards / alerts / retention for `vanta-pay`
2. Create or confirm the same provider controls for `vanta-private-pool-v2`
3. Create production service refs for `vanta-strategy` and `vanta-operator-control-plane`
4. Only then record equivalent observability refs for those last two services

Pay and Private Pool v2 also have a shared rate-limit seam at:

```text
src/ops/vantaRateLimit.mjs
```

The current fallback limiter is intentionally marked `productionReady: false`; it provides a fail-closed operator control point when no database is configured. The same module now also exposes a Postgres-backed durable shared-window limiter that the Pay and Private Pool v2 operator services prefer when their production database URL is configured. Incident workflow evidence is now checked through `npm run mainnet:production-incident-workflow-evidence-check`; production observability is still not complete until deployed runtime evidence plus provider log sink, metrics, alerts, dashboards, and retention evidence are all fresh.

Pay and Private Pool v2 also emit shared privacy-safe JSON telemetry through:

```text
src/ops/vantaSafeTelemetry.mjs
```

The helper records startup and HTTP request envelopes with service name, method, path, status code, duration, request id, query-present flag, and a short hash of the remote address. It intentionally excludes request bodies, response bodies, query values, raw IP addresses, auth headers, cookies, API keys, database URLs, tokens, private keys, seed phrases, and mnemonic material. This stdout JSON is staging/operator evidence only; before mainnet it must be connected to a production log sink, metrics, alert routing, audit-event retention, and incident-response workflow.

Pay and Private Pool v2 now also share a privacy-safe append-only operator event sink at:

```text
src/ops/vantaOperatorEventSink.mjs
```

Verify the sink contract with:

```bash
npm run ops:operator-event-sink-check
```

When a Postgres-backed operator database is configured, the sink records startup, auth rejection, and rate-limit rejection events into `pool_operator_events` with redacted payload fields. This is intentionally a narrow audit-event boundary only; it does not claim provider-backed dashboards, alert routing, incident workflow, or full production observability.

The reusable nullifier replay guard is:

```text
src/privacy/nullifierReplayGuard.mjs
src/privacy/postgresNullifierReplayStore.mjs
```

Private Pool v2 uses the in-process guard for local claim preflight and accepted-claim reservation. In production, the operator now refuses to boot unless `VANTA_PRIVATE_POOL_V2_DATABASE_URL` is configured, so accepted-claim reservation goes through the Postgres nullifier replay store behind a checked transaction plus `INSERT ... ON CONFLICT DO NOTHING RETURNING ...` boundary. The store uses global nullifier uniqueness plus context-scoped idempotent request uniqueness; preflight remains a non-mutating preview, not the atomic barrier. It is still marked `productionReady: false` until production database refs, backup/restore evidence, live private-settlement evidence, external review, and audit gates are complete.

Shield proof requests now have a local committed-economics boundary: the Noir Shield circuit/fixture binds raw source mint, target mint, target asset, and amount to a Poseidon economics commitment, while operator/capability request paths carry `economics-commitment` handles and hidden-economics asset/amount sentinels instead of raw proof inputs. This is a reviewer-visible proof/request hardening step only; route timing, deposit evidence, anonymity-set, relayer-separation, live settlement, and audit gates still block production-private Shield claims.

The sanitized deployed replay-status surface is:

```bash
npm run mainnet:nullifier-replay-status
npm run mainnet:nullifier-replay-status-auth
npm run mainnet:nullifier-replay-status-check
```

Run `npm run mainnet:nullifier-replay-status` for a sanitized status packet that stays operable outside a secret-manager shell. Use `npm run mainnet:nullifier-replay-status-auth` from a Doppler-backed shell when you want authenticated live operator replay status, and keep `npm run mainnet:nullifier-replay-status-check` as the checked production command.

The checked replay-evidence surface is:

```text
ops/mainnet/private-pool-v2-nullifier-replay.evidence.json
npm run mainnet:nullifier-replay-evidence-check
```

It records the deployed operator replay mode, replay storage mode, durable-store status, runtime mode, the verified role-service replay barrier, the no-real-funds production smoke replay rejection, and the explicit current protocol enforcement layer. The current checked layered protocol boundary is `operator-claim-preflight-plus-verifier-receipt-idempotency-plus-indexer-nullifier-registration`, and the evidence keeps `finalLayerImplemented: true` while `finalLayerProductionReady: false` until the missing live private-settlement conditions are cleared.

The checked role-service replay barrier surface is:

```bash
npm run mainnet:role-service-replay-status
npm run mainnet:role-service-replay-status-check
```

```text
ops/mainnet/private-pool-v2-role-service-replay.evidence.json
npm run mainnet:role-service-replay-evidence-check
```

It records the deterministic local/staging barrier proven by `npm run private-pool-v2:service-network-check`: authenticated role-service readiness, prover-to-verifier proof roundtrip, verifier-to-indexer commitment append, duplicate verifier receipt rejection, nullifier registration through the verifier-to-indexer edge, restart restoration across indexer/prover/relayer/verifier, and a no-real-funds operator remote-services settlement smoke. It is an explicit role-service barrier packet, not live production settlement evidence.

For a faster focused check:

```bash
npm run pay:merchant-api-check
npm run private-pool-v2:http-smoke
npm run private-pool-v2:service-network-check
npm run nullifier:replay-guard-check
npm run protocol:browser-check
```

## Private Pool v2 Operator

Start the local Private Pool v2 operator:

```bash
npm run private-pool-v2:operator
```

Start the separated Private Pool v2 service-network entrypoints:

```bash
npm run private-pool-v2:indexer
npm run private-pool-v2:prover
npm run private-pool-v2:relayer
npm run private-pool-v2:verifier
npm run private-pool-v2:service-network-check
npm run private-pool-v2:role-storage-check
```

These services expose the deployable remote-service contract for `remote-services` mode. They still report `productionReady: false` and `mainnetReady: false`; the current implementation is deterministic no-real-funds harness infrastructure until audited production proving, durable production storage, secret-manager-backed refs, production smoke evidence, and mainnet approvals exist.

`npm run private-pool-v2:service-network-check` also starts the operator in `remote-services` mode against the four local role services and routes a deterministic no-real-funds Pay settlement through the network. The local-only flag for this smoke is:

```bash
VANTA_PRIVATE_POOL_V2_ALLOW_INSECURE_LOOPBACK_REMOTE_SERVICES=true
```

Do not use that flag for production. Production remote services must stay HTTPS-only.

The role services have local/staging restart-safe snapshot paths:

```bash
VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH=<local-json-snapshot-path>
VANTA_PRIVATE_POOL_V2_PROVER_STORE_PATH=<local-json-snapshot-path>
VANTA_PRIVATE_POOL_V2_RELAYER_STORE_PATH=<local-json-snapshot-path>
VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH=<local-json-snapshot-path>
```

`npm run private-pool-v2:service-network-check` verifies that accepted commitments, proof artifacts, relayer quotes, and verifier receipts survive role-service restarts through these paths. Treat this as local/staging evidence only; production still requires managed durable database storage and restore evidence.

The per-role production storage adapter check is:

```bash
npm run private-pool-v2:role-storage-check
```

It verifies the role snapshot boundary can use a role-specific database URL such as `VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL`, or the shared fallback `VANTA_PRIVATE_POOL_V2_DATABASE_URL`, as a `postgres-jsonb-snapshot-store` and refuses local JSON snapshot stores in production. This is a code-level contract, not production evidence that the external database refs, backup/restore drills, or audit gates are complete.

When `NODE_ENV=production`, every role service refuses to boot without its role bearer token and restart storage configuration. This prevents accidental stateless or unauthenticated production startup, but does not replace the production database/restore evidence gate.

Important environment variables:

```bash
VANTA_PRIVATE_POOL_V2_OPERATOR_PORT=8797
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=
VANTA_PRIVATE_POOL_V2_STORE_PATH=.vanta-private-pool-v2-receipts.json
VANTA_PRIVATE_POOL_V2_DATABASE_URL=
VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=local-benchmark
```

Production mode guardrails:

```bash
NODE_ENV=production
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=<operator-token>
VANTA_PRIVATE_POOL_V2_DATABASE_URL=<postgres-url-from-secret-manager>
```

When `NODE_ENV=production`, the operator refuses to boot without `VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN` and `VANTA_PRIVATE_POOL_V2_DATABASE_URL`. File/JSON stores are allowed for local and staging-style checks, but production nullifier replay enforcement must use the Postgres-backed store.

For free Render staging, prefer `VANTA_PRIVATE_POOL_V2_DATABASE_URL` from a free Render Postgres database because free web services cannot attach persistent disks and lose local filesystem writes on restart/redeploy. Treat free Render Postgres as staging-only because free databases expire.

The deployed-service client boundary is:

```text
src/privacy/privatePoolV2RemoteServices.ts
```

It defines HTTPS clients for the Private Pool v2 indexer, relayer, prover, verifier registry, and remote runtime assembly. Verify it with:

```bash
npm run private-pool-v2:remote-services-check
npm run mainnet:private-pool-v2-production-smoke-check
```

This is the replacement seam for moving away from the local benchmark runtime once real deployed service URLs, mutual-auth credentials, production smoke targets, audit, and mainnet approval exist.

The references-only smoke target template is:

```text
ops/mainnet/private-pool-v2-production-smoke.template.json
```

The production service setup guide is:

```text
docs/production-private-pool-v2-service-setup.md
```

It records the current Render inventory and the deployed production indexer, prover, relayer, verifier, and operator services. Verify the references-only contract with:

```bash
npm run mainnet:production-service-setup-check
npm run mainnet:private-rail-route-status-check
npm run mainnet:private-rail-route-health
npm run mainnet:private-rail-route-health-auth
npm run mainnet:private-rail-route-health-evidence-check
npm run mainnet:private-pool-v2-production-smoke-check
```

The production private-rail route-status check verifies the checked service refs only. It proves Pay points at the Private Pool v2 operator ref, the production operator runs in `remote-services` mode with indexer/prover/relayer/verifier URL refs, and role auth-token refs are inventoried in the secret-reference manifest. It must not print bearer-token values, database URLs, wallet keys, or signed transaction material.

The route-health command prints a sanitized live status report for the deployed route hosts. By default it is status-only. Use `npm run mainnet:private-rail-route-health-check` to require public `/health` success, and run `npm run mainnet:private-rail-route-health-auth` from a secret-manager shell when you need authenticated readiness without submitting proofs or moving funds.

The canonical secret-manager form is:

```bash
doppler run --config prd --project vanta -- npm run mainnet:private-rail-route-health-auth
```

The sanitized route-health evidence file is:

```text
ops/mainnet/private-pool-v2-route-health.evidence.json
```

It stores status labels and refs only. Verify it with `npm run mainnet:private-rail-route-health-evidence-check`.

When the role-service URLs and auth tokens are present in the shell from the secret manager, run the live no-real-funds production smoke with:

```bash
npm run mainnet:private-pool-v2-production-smoke-env
npm run mainnet:private-pool-v2-production-smoke-live
```

To update the checked sanitized evidence file after a successful live no-real-funds smoke, run:

```bash
npm run mainnet:private-pool-v2-production-smoke-write
npm run mainnet:production-smoke-evidence-check
```

The environment precheck prints only set/missing status and service URL hosts. It must be used instead of ad hoc shell loops so zsh/bash differences do not cause operator confusion and so auth token values are never printed.

If the `VANTA_PRIVATE_POOL_V2_*_URL` values are not present in the shell, the precheck and live smoke runner use the checked production service URLs from:

```text
ops/mainnet/private-pool-v2-services.manifest.json
```

Auth token values still must come from the operator shell or secret manager and are never read from Git.

The sanitized production smoke evidence manifest is:

```text
ops/mainnet/private-pool-v2-production-smoke.evidence.json
npm run mainnet:production-smoke-evidence-check
```

To select deployed services in an approved non-mainnet or production-like environment, set:

```bash
VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services
VANTA_PRIVATE_POOL_V2_INDEXER_URL=<https-indexer-url>
VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN=<secret-manager-value>
VANTA_PRIVATE_POOL_V2_PROVER_URL=<https-prover-url>
VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN=<secret-manager-value>
VANTA_PRIVATE_POOL_V2_RELAYER_URL=<https-relayer-url>
VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN=<secret-manager-value>
VANTA_PRIVATE_POOL_V2_VERIFIER_URL=<https-verifier-url>
VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN=<secret-manager-value>
```

Store the token values only in the secret manager or deployment environment, never in Git or chat.

### Relayer Serialized Transaction Bytes

Use the checked Solana spend-transaction helper when an approved operator needs real
`VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION` bytes for evidence input.
The helper builds and prints transaction bytes only; it does not sign, send,
broadcast, or initialize mainnet state.

Required public/operator inputs:

```bash
VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL=<rpc-url-from-secret-manager-or-approved-shell>
VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET=<relayer-fee-payer-public-key>
VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID=<private-pool-v2-program-id>
VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE=<pool-state-account>
VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET=<nullifier-set-account>
VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE=<output-queue-account>
VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_ROOT_HISTORY=<root-history-account>
VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY=<operator-authority-public-key>
```

The spend program stores `VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY`
during init and requires that same writable authority signer plus the bound
root-history account for every spend evidence append. The helper only builds
transaction bytes; the relayer must sign as that configured authority before
submission.

Provide either explicit instruction bytes:

```bash
VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_INSTRUCTION_DATA_BASE64=<base64-instruction-bytes>
```

or the reviewed evidence refs used to construct the instruction payload:

```bash
VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_REF=<reviewed-root-ref>
VANTA_ACTUAL_PRIVATE_NULLIFIER_REF=<reviewed-nullifier-ref>
VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF=<reviewed-public-input-hash-ref>
VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT_REF=<reviewed-settlement-commitment-ref>
VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID_REF=<reviewed-settlement-id-ref>
```

Optional no-network-blockhash input:

```bash
VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_RECENT_BLOCKHASH=<recent-blockhash>
```

Safe no-send command:

```bash
npm run private-pool-v2:solana-spend-transaction
```

The command prints:

```bash
export VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION='base64:...'
```

For a metadata-only preview, use:

```bash
npm run private-pool-v2:solana-spend-transaction -- --json
```

Do not paste RPC credentials, private keys, seed phrases, signing material, bearer
tokens, or the resulting serialized transaction into chat, docs, Git, screenshots,
or issue trackers. Mainnet deploy/init, transaction signing, transaction
submission, and any real-funds movement remain blocked until Clay gives separate
explicit approval for that exact action and window.

The external approval template is:

```text
ops/mainnet/mainnet-approval-gates.template.json
```

Verify it with:

```bash
npm run mainnet:approval-gates-check
```

It stores refs for secret-manager-backed credentials, production smoke evidence, third-party audit, legal/compliance/custody review, and explicit mainnet funds approval. It must never store legal advice text, under-NDA audit contents, exploit details, credential values, wallet keys, or signed transactions.

The current approval-gate evidence surface is:

```text
ops/mainnet/mainnet-approval-gates.evidence.json
```

Verify it with:

```bash
npm run mainnet:approval-gates-status
npm run mainnet:approval-gates-status-json
npm run mainnet:approval-gates-evidence-check
```

This file records which technical evidence has been captured, which controls were skipped by operator decision, and which bounded real-funds action is approved. It must keep `mainnetReady: false` and `productionReady: false`; any real-funds allowance is scoped only to the currently recorded bounded approval. Verify current status with `npm run mainnet:real-funds-approval-status`.

Operator decision on April 22, 2026: audit, legal/compliance/custody review, secret-manager audit/rotation evidence, Pay restore readback, and provider backup/PITR/encryption/access-audit/least-privilege evidence were skipped. This is not approval and not evidence that those controls passed.

The real-funds approval packet is:

```text
ops/mainnet/mainnet-real-funds-approval.evidence.json
```

Verify it with:

```bash
npm run mainnet:real-funds-approval-check
```

This packet records the currently bounded approval action, launch window, fee-payer ref, rollback ref, stop-loss ref, funds cap, and approver ref. It does not approve any other mainnet action and does not make Vanta production-ready. It must never include wallet keys, seed phrases, raw signing credentials, bearer tokens, raw database URLs, or signed transactions.

The live real-funds approval status surface is:

```bash
npm run mainnet:real-funds-approval-status
npm run mainnet:real-funds-approval-status-check
```

It evaluates the current bounded approval record against the approved launch window and prints whether live mainnet actions are allowed now. This keeps `approval recorded` separate from `approval window active` so expired windows do not get mistaken for current permission.

The status surface also reports a `stopCondition` block from:

```text
ops/mainnet/actual-private-mainnet-settlement-stop-condition.evidence.json
```

This stop-condition is a **one-shot guard**: when `stopCondition.appliesToCurrentApproval` is true and `stopCondition.status` is `fired`, the approval window is treated as consumed and `liveMainnetActionsAllowedNow` stays false even if the launch window is active. If a stop-condition evidence file exists but `appliesToCurrentApproval` is false, treat it as historical evidence for a different approval identity, not proof that the current approval was consumed or safe to reuse.

## Pay Operator

Start the local Pay merchant API operator:

```bash
npm run pay:operator
```

Important environment variables:

```bash
VANTA_PAY_OPERATOR_PORT=8798
VANTA_PAY_SECRET_KEY=sk_test_vanta
VANTA_PAY_WEBHOOK_SECRET=whsec_test_vanta
VANTA_PAY_STORE_PATH=.vanta-pay-store.json
VANTA_PAY_DATABASE_URL=
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL=http://127.0.0.1:8797
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=
```

Production mode guardrails:

```bash
NODE_ENV=production
VANTA_PAY_SECRET_KEY=<live-secret-key>
VANTA_PAY_WEBHOOK_SECRET=<live-webhook-secret>
VANTA_PAY_DATABASE_URL=<postgres-url-if-using-managed-postgres>
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL=<private-pool-v2-url>
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=<operator-token-required-in-production>
```

When `NODE_ENV=production`, Pay refuses to boot without `VANTA_PAY_SECRET_KEY`, `VANTA_PAY_WEBHOOK_SECRET`, `VANTA_PAY_DATABASE_URL`, `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL`, and `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN`. File-backed JSON storage remains valid for local and staging-style checks, but production Pay must use the Postgres-backed storage and rate-limit path.

The Pay production private-rail guard command is:

```bash
npm run pay:production-private-rail-guard-check
```

The Pay approval packet freezes the payment approval boundary as:

- `preview`
- `approve`
- `execute`
- `settle`

It is intentionally policy-legible and must remain simulation-bound before any wallet approval.

Verify the packet contract with:

```bash
npm run pay:approval-packet-check
```

Checkout completion evidence boundary:

- `POST /v1/checkout/sessions/{id}/complete` defaults to `completionBasis: "local-test-harness"` for local/operator harness verification.
- The `/complete` route is internal-chain-subscriber only and requires `VANTA_PAY_INTERNAL_SETTLEMENT_TOKEN`; merchant Bearer auth alone must not complete a checkout.
- Production Pay must not treat that endpoint as customer-paid unless the completion carries a typed customer payment evidence reference, such as `solana:signature:<base58-signature>`, from the customer-side wallet/payment flow.
- `npm run pay:production-readiness-json` must keep `pay-customer-payment-evidence-not-wired` blocked until that flow is wired and verified.

The merchant trust surface is documented in `docs/pay-merchant-trust-surface.md`. Use these commands to inspect and verify it:

```bash
npm run pay:merchant-trust-status
npm run pay:merchant-trust-status-check
```

Those commands are part of the current Pay operator story alongside `npm run pay:approval-packet-check`, which verifies the merchant-facing approval boundary.

The canonical Pay verification checkpoint is:

```bash
npm run pay:verify
```

It includes both `npm run pay:merchant-trust-status-check` and `npm run pay:approval-packet-check` so the merchant trust surface and approval packet contract stay wired into the same operator gate.

For free Render staging, prefer `VANTA_PAY_DATABASE_URL` from a free Render Postgres database because free web services cannot attach persistent disks and lose local filesystem writes on restart/redeploy. Treat free Render Postgres as staging-only because free databases expire.

Production webhook delivery also requires HTTPS merchant endpoints.

## Render Staging References

Current secrets-safe staging refs:

- Pay Render service id: `srv-d7j3ggqqqhas739for80`
- Pay URL: `https://vanta-0wwi.onrender.com`
- Pay start command: `npm run pay:operator`
- Pay storage: `postgres-jsonb-snapshot-store` through `VANTA_PAY_DATABASE_URL`
- Private Pool v2 Render service id: `srv-d7j4aod7vvec73ahsqlg`
- Private Pool v2 URL: `https://vanta-staging-private-pool-v2.onrender.com`
- Private Pool v2 start command: `npm run private-pool-v2:operator`
- Private Pool v2 storage: `postgres-jsonb-snapshot-store` through `VANTA_PRIVATE_POOL_V2_DATABASE_URL`

These refs are staging evidence only. They do not clear production secret-manager, monitoring, audit, legal, custody, or mainnet-funds gates.

## Browser Client Operator Settings

For local or controlled test environments:

```bash
VITE_VANTA_PRIVATE_POOL_V2_RECEIPT_API_URL=http://127.0.0.1:8797
```

Production browser builds default to `https://vanta-prod-private-pool-v2-operator.onrender.com` for the public Shield receipt route when `VITE_VANTA_PRIVATE_POOL_V2_RECEIPT_API_URL` is unset.

Production operator builds default `VANTA_PRIVATE_POOL_V2_PUBLIC_SHIELD_RECEIPT_DEPOSIT_EVIDENCE_MODE` to `required`, which verifies native SOL deposit signatures against Solana before issuing public browser Shield receipts. Local runs default to `local-skip`; set `VANTA_PRIVATE_POOL_V2_PUBLIC_SHIELD_RECEIPT_RPC_URL` when the operator should use a specific Solana RPC for that evidence check.

Do not use browser-exposed operator tokens as production secrets. Do not put operator bearer tokens in `VITE_...` variables; any `VITE_...` value is bundled into the client and must be treated as public.
Run `npm run frontend:operator-env-exposure-check` before any production browser handoff; it builds with forbidden operator-token canaries and scans `dist/` for token/auth/secret-shaped browser env exposure.

## Wallet Signing Safety

Never request, store, or handle private keys, seed phrases, or keypair files.

Before any future live transaction path can request a wallet signature, it must:

- default to mainnet or localnet unless mainnet is explicitly selected and approved
- simulate the transaction before signature
- show cluster, fee payer, recipient, amount, asset, estimated fees, instructions, recent blockhash, and simulation result
- require explicit human approval before signature
- block blind signing and mutation after the summary is shown
- keep live mainnet submission disabled until the mainnet readiness gate is updated truthfully

The executable transaction safety summary boundary is:

```text
src/wallet/transactionSafetySummary.mjs
```

It requires cluster, fee payer, recipient, amount, asset, estimated fees, instructions, recent blockhash, simulation result, and explicit mainnet approval before a mainnet summary can be accepted for wallet approval.

The executable wallet-backed pre-signature gate is:

```text
src/wallet/walletBackedTransactionSimulation.mjs
```

It refuses wallet signature requests unless the connected wallet matches the fee payer, the transaction safety summary has a passing simulation result, the transaction fingerprint remains frozen after summary review, no private key material is handled, and the user has explicitly approved the shown summary.

The wallet-backed simulation gate command is:

```bash
npm run wallet:backed-simulation-check
```

The executable wallet message-intent safety boundary is:

```text
src/wallet/walletMessageIntentSafety.mjs
```

It creates a typed summary for signed operator intents, requires a request id, issue and expiry timestamps, connected-wallet/requester alignment, no private-key material handling, and explicit human approval before calling `signMessage`.

The wallet message-intent safety command is:

```bash
npm run wallet:message-intent-safety-check
```

The checked page adoption seam for Swap and Unshield signed operator intents is:

```text
scripts/check-vanta-message-intent-adoption.mjs
```

It verifies that Swap, SPL Unshield, and SOL Unshield do not hand `signMessage` directly to operator intent signers. Those paths must route through `signWalletMessageIntentWithSafety`, bind a request id and expiry, check the connected wallet/requester, and require a wallet-approval-ready decision before returning signature bytes.

The wallet message-intent adoption command is:

```bash
npm run wallet:message-intent-adoption-check
```

The Umbra wallet adapter gate is:

```text
src/privacy/umbraClient.ts
```

It keeps the external Umbra SDK signer fail-closed behind an explicit adapter gate before message or transaction signing. The gate requires issued and expiry timestamps, connected-wallet/requester alignment, no private-key material handling, explicit human approval, and separate message and transaction approval flags before the SDK can call the wallet signer.

The Umbra wallet adapter gate command is:

```text
scripts/check-vanta-umbra-wallet-adapter-gate.mjs
```

```bash
npm run umbra:wallet-adapter-gate-check
```

The Umbra operation gate adoption seam is:

```text
src/privacy/umbraOperations.ts
```

Operation helpers that create an Umbra wallet-session client must pass a typed adapter gate into `createUmbraClientFromWalletSession`. Callers can build the gate with `createUmbraOperationWalletAdapterGate` after showing an operation-specific human summary. The gate is intentionally short-lived and separates message approvals from transaction approvals.

The Umbra operation gate adoption command is:

```text
scripts/check-vanta-umbra-operation-gate-adoption.mjs
```

```bash
npm run umbra:operation-gate-adoption-check
```

The Umbra operation approval summary seam is:

```text
src/privacy/umbraOperations.ts
```

Before building an operation adapter gate, callers should create a `vanta-umbra-operation-approval-summary` with `createUmbraOperationApprovalSummary`, validate it with `validateUmbraOperationApprovalSummary`, then convert it into a gate with `createUmbraOperationWalletAdapterGateFromSummary`. The summary records the operation kind, requester, mint, amount, destination, expiry, and whether the wallet approval is message-only or transaction-signing.

The Umbra operation summary command is:

```text
scripts/check-vanta-umbra-operation-summary.mjs
```

```bash
npm run umbra:operation-summary-check
```

The Umbra operation client summary gate seam is:

```text
src/privacy/umbraOperations.ts
```

Each operation helper must resolve its Umbra wallet-session client through an operation-aware gate. If a caller does not provide an already-built adapter gate, the helper must require a matching `vanta-umbra-operation-approval-summary` and derive the gate from that summary before any Umbra SDK signing path can run.

The Umbra operation client summary gate command is:

```text
scripts/check-vanta-umbra-operation-client-summary-gate.mjs
```

```bash
npm run umbra:operation-client-summary-gate-check
```

The Umbra operation summary builders are:

```text
src/privacy/umbraOperations.ts
```

UI and operator callers should use the operation-specific summary builders instead of hand-assembling summary fields. Those helpers keep approval summaries aligned with the operation client summary gate.

The Umbra operation summary builders command is:

```text
scripts/check-vanta-umbra-operation-summary-builders.mjs
```

```bash
npm run umbra:operation-summary-builders-check
```

The Umbra operation approval display formatter is:

```text
src/privacy/umbraOperations.ts
```

It turns raw operation approval summaries into display-safe titles, rows, signing mode, and wallet prompt copy for user-facing review surfaces.

The Umbra operation approval display command is:

```text
scripts/check-vanta-umbra-operation-summary-display.mjs
```

```bash
npm run umbra:operation-summary-display-check
```

The Umbra benchmark approval samples are:

```text
src/privacy/umbraBenchmark.ts
```

The benchmark snapshot includes display-safe examples for private balance lookup, shield, withdraw, and claimable-funds scan approvals. These samples are review surfaces only; they do not enable signing or replace the short-lived operation approval gates.

The Umbra benchmark approval samples command is:

```text
scripts/check-vanta-umbra-benchmark-approval-samples.mjs
```

```bash
npm run umbra:benchmark-approval-samples-check
```

The Umbra approval review page is:

```text
src/pages/PrivacyReviewPage.tsx
```

It mounts the benchmark approval samples at `/app/privacy-review` as a non-executing review surface for operators and reviewers. It is deliberately outside the primary action tabs and repeats that the page does not enable signing.

The Umbra approval review page command is:

```text
scripts/check-vanta-umbra-approval-review-page.mjs
```

```bash
npm run umbra:approval-review-page-check
```

The browser-backed Umbra approval review page command is:

```text
scripts/check-vanta-umbra-approval-review-page-browser.mjs
```

```bash
npm run umbra:approval-review-page-browser-check
```

The Shield Umbra action review seam is:

```text
src/privacy/umbraShieldActionReview.ts
```

Shield now builds the same display-safe approval object before a shield action asks the wallet to approve. This does not enable an Umbra settlement path by itself; it keeps the Shield lane aligned with the short-lived approval-summary gate.

The Shield Umbra action review command is:

```text
scripts/check-vanta-umbra-shield-action-review.mjs
```

```bash
npm run umbra:shield-action-review-check
```

The Unshield Umbra action review seam is:

```text
src/privacy/umbraUnshieldActionReview.ts
```

Unshield now builds the same display-safe approval object before a shielded asset exit asks the wallet to approve. This does not enable an Umbra settlement path by itself; it keeps the Unshield lane aligned with the short-lived approval-summary gate.

The Unshield Umbra action review command is:

```text
scripts/check-vanta-umbra-unshield-action-review.mjs
```

```bash
npm run umbra:unshield-action-review-check
```

The frozen live wallet send/sign inventory is:

```text
src/readiness/walletLiveSendInventory.mjs
```

It records Umbra adapter call sites that are now fail-closed behind the adapter gate and the Shield, Send, Swap, and Unshield call sites that have adopted safe-send or message-intent safety boundaries so reviewers can see which live-signing paths have moved. The inventory is deliberately not a readiness claim; it is a guardrail to keep every live signing path visible until replaced.

The live wallet send inventory command is:

```bash
npm run wallet:live-send-inventory-check
```

The pure safe-send boundary is:

```text
src/wallet/walletSafeSendBoundary.mjs
```

It is the checked prepare, simulate, transaction-summary, wallet-backed gate, and submit boundary for replacing raw transaction sends. It must block failed simulation, wallet/fee-payer mismatch, missing approval, and mutable-after-summary transactions before calling `sendPrepared`.

The safe-send boundary command is:

```bash
npm run wallet:safe-send-boundary-check
```

The browser/app hook adapter for the safe-send boundary is:

```text
src/wallet/useVantaSafeSendTransaction.ts
```

It uses the connected Solana wallet session, prepares through `client.transaction.prepare`, simulates the prepared wire transaction through RPC, and submits through `client.transaction.send` only after the shared safe-send boundary accepts.

The safe-send hook command is:

```bash
npm run wallet:safe-send-hook-check
```

The Shield safe-send adoption check is:

```text
scripts/check-vanta-shield-safe-send-adoption.mjs
```

It verifies Shield no longer uses raw generic `useSendTransaction` sends or the opaque SPL token `send` shortcut for SPL deposits, native SOL, shield-state, or public-route transactions, and that those paths route through `useVantaSafeSendTransaction` with summary instructions and transaction fingerprints.

The Shield safe-send adoption command is:

```bash
npm run shield:safe-send-adoption-check
```

The Send safe-send adoption check is:

```text
scripts/check-vanta-send-safe-send-adoption.mjs
```

It verifies Send no longer uses raw generic `useSendTransaction` sends for the send-note transition or spent-marker transaction, and that those paths route through `useVantaSafeSendTransaction` with summary instructions and transaction fingerprints.

The Send safe-send adoption command is:

```bash
npm run send:safe-send-adoption-check
```

The Swap safe-send adoption check is:

```text
scripts/check-vanta-swap-safe-send-adoption.mjs
```

It verifies Swap no longer uses raw generic `useSendTransaction` sends for the swap transition or spent-marker transaction. The signed swap intent is checked separately by the wallet message-intent adoption command.

The Swap safe-send adoption command is:

```bash
npm run swap:safe-send-adoption-check
```

The Unshield safe-send adoption check is:

```text
scripts/check-vanta-unshield-safe-send-adoption.mjs
```

It verifies Unshield no longer uses raw generic `useSendTransaction` sends for transition, spent-marker, split-transition, or split-spent-marker transactions. The signed unshield intents are checked separately by the wallet message-intent adoption command.

The Unshield safe-send adoption command is:

```bash
npm run unshield:safe-send-adoption-check
```

The browser-backed safe-environment signing gate is:

```bash
npm run wallet:browser-signing-safety-check
```

It starts the app with mainnet configuration, verifies the Shield, Send, Swap, and Unshield browser surfaces do not expose mainnet submission or secret-key language, and verifies the Shield, Swap, and Unshield actions do not advance into wallet-confirmation state when no wallet is connected.

The deployed public-app browser-backed verification gate is:

```bash
npm run mainnet:wallet-production-browser-check
```

It probes `https://vantaprivacy.xyz` directly with `gsd-browser`, verifies Shield, Send, Swap, and Unshield all render on the live public app, and fails if the public site shows the beta-mode banner, private-settlement-offline banner, or `Beta mode` action copy.

The sanitized production wallet-signing status surface is:

```text
scripts/print-vanta-production-wallet-signing-status.mjs
```

It records the current protocol pages covered by the live wallet-signing boundary, the pages that have adopted safe-send, the pages verified by the local and deployed browser-backed signing checks, the pages still using typed message intents, and the Umbra adapter gate status. It is intentionally not a production-ready claim; it freezes the current adopted boundary and live deployment-mode truth so readiness can fail loudly if the wallet lane drifts.

The production wallet-signing status commands are:

```bash
npm run mainnet:wallet-signing-status
npm run mainnet:wallet-signing-status-check
```

The sanitized production wallet-signing evidence file is:

```text
ops/mainnet/wallet-signing-safety.evidence.json
```

It records only status-level facts and command refs. No wallet keys, seed phrases, signed transaction material, signed intent payloads, bearer values, or database URLs may be stored in this evidence file.

The production wallet-signing evidence command is:

```bash
npm run mainnet:wallet-signing-evidence-check
```

## Secret Handling

The checked secret-handling contract is:

```text
src/readiness/secretHandlingContract.mjs
```

The checked secret-reference manifest is:

```text
ops/mainnet/secret-references.manifest.json
```

It stores reference names only. It must never contain raw secret values, raw database URLs, bearer tokens, webhook secrets, private keys, seed phrases, or wallet keypair files.

Current staging refs use `render-env-var-staging` for the verified Render Pay and Private Pool v2 services. Production secret-manager audit and rotation evidence were skipped by operator decision; keep this visible and do not present it as a completed secret-handling maturity control.

Doppler has been selected as the production secret-manager target. The checked Doppler mapping template is:

```text
ops/mainnet/production-secret-manager.template.json
```

The template is references-only. It records the intended Doppler project/config refs, service identities, secret names, owners, rotation cadence, revocation runbook refs, and access-log refs. It must not contain Doppler service tokens or secret values.

Before claiming production secret-handling maturity, an operator still needs to create least-privilege Doppler service tokens outside git, verify Doppler access logs, and wire deployment services to read from Doppler rather than staging Render env vars.

The beginner-safe staging Doppler guide is:

```text
docs/doppler-staging-setup.md
```

If the existing operator token cannot be found, create a new strong token and put the same value into `VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN` and `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN`, then redeploy Pay and Private Pool v2 together.

Secret handling is checked by:

```bash
npm run mainnet:secret-handling-check
npm run mainnet:secret-exposure-check
```

The contract requires a production secret manager, least-privilege service identities, no secrets in the repo, no secrets in client bundles, names-only manifests, a tracked-repo secret exposure scan, rotation runbooks, incident revocation, and audit logs for secret access. Vanta must never request, store, or load private keys, seed phrases, or keypair files.

The exposure check scans tracked repo files only. It intentionally does not scan ignored local env files such as `.env.local` and `.env.operator.local`, because those can contain local operator secrets. It must pass before committing docs, manifests, scripts, or evidence files that mention API keys, bearer tokens, database URLs, webhook secrets, or wallet material.

If a Render API key, service auth token, database URL, webhook secret, or any other credential appears in chat, a screenshot, terminal history, logs, or another surface outside the secret manager:

1. Revoke or rotate the value in the source provider first.
2. Update the new value only in Doppler or the Render environment variable UI.
3. Redeploy the affected Render service if the provider does not hot-reload environment variables.
4. Run `npm run mainnet:private-pool-v2-production-smoke-env` to confirm status without printing values.
5. Run `npm run mainnet:secret-exposure-check` before committing any follow-up docs or evidence.

For Render API keys, create a new API key in the Render dashboard, update the local shell or secret manager reference, then delete the old key. Do not put `RENDER_API_KEY=<value>` into docs, Git, chat, screenshots, or shell snippets that will be shared.

For Private Pool v2 role tokens, rotate all five role tokens together when practical:

```text
VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN
VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN
VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN
VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN
```

Pay must also be able to reach the operator with:

```text
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN
```

The Pay operator token and Private Pool v2 operator token should match only when Pay is intentionally allowed to call that operator. If either value is rotated, update Pay and the Private Pool v2 operator together, then run the production smoke env check and the no-real-funds smoke before relying on the route.

## Startup Order

For local Pay + Private Pool integration:

1. Start Private Pool v2:

```bash
npm run private-pool-v2:operator
```

2. Start Pay with `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL` pointed at the Private Pool operator:

```bash
npm run pay:operator
```

3. Run app/browser checks separately:

```bash
npm run pay:browser-check
npm run protocol:browser-check
```

## Current Persistent State

The current local/staging operators can use JSON-backed durable stores:

- Private Pool v2: `VANTA_PRIVATE_POOL_V2_STORE_PATH`
- Pay: `VANTA_PAY_STORE_PATH`
- Private Pool v2 role services: `VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH`, `VANTA_PRIVATE_POOL_V2_PROVER_STORE_PATH`, `VANTA_PRIVATE_POOL_V2_RELAYER_STORE_PATH`, `VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH`

These stores prove restart-safe local behavior in the verifier, but they are not a production database, replicated log, or on-chain source of truth.

Pay, Private Pool v2, and the Private Pool v2 role services now use checked snapshot-store seams that can select `postgres-jsonb-snapshot-store` when database URL refs are configured. Local JSON remains supported for local/staging restart checks only, and every storage seam stays `productionReady: false` until real production database refs, backup/restore evidence, and approval gates exist.

The local JSON and Private Pool v2 role seams live at:

```text
src/storage/vantaJsonSnapshotStore.mjs
src/storage/vantaPrivatePoolV2RoleSnapshotStore.mjs
```

Before mainnet, Pay, Private Pool v2, Strategy, and Operator state must be attached to production database refs behind the checked production storage contract and pass:

```bash
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run mainnet:backup-restore-check
npm run storage:adapter-check
npm run nullifier:replay-guard-check
npm run private-pool-v2:role-storage-check
```

## Production Backup/Restore Drill

Do not treat the production storage gate as cleared until every store in `ops/mainnet/production-backup-restore.template.json` has references-only evidence for backup policy, point-in-time recovery, encrypted backup evidence, restore-drill evidence, restore runbook, access audit logs, and least-privilege database users.

Safe evidence to record:

- database reference name
- backup policy reference
- point-in-time recovery reference
- restore-drill result reference
- access audit log reference
- least-privilege database user reference

Never paste or commit:

- raw database URLs
- credential values
- backup decryption material
- provider API tokens
- wallet keys
- private user inputs

Minimum restore-drill flow:

1. Create a disposable restore target outside production.
2. Restore from the most recent encrypted backup or point-in-time recovery target.
3. Run schema and state readback checks against the restored target.
4. Verify nullifier uniqueness, Pay idempotency keys, webhook retry state, strategy child-order uniqueness, and operator deployment locks survive restore.
5. Destroy the disposable restore target after recording references-only evidence.
6. Update `ops/mainnet/production-backup-restore.template.json` refs without adding secret material.

## Before Mainnet

Do not move this runbook to mainnet operation until Vanta has:

- deployed durable operator/indexer/relayer/prover services
- completed external-gates packet with references-only evidence
- final append/nullifier enforcement for the chosen architecture
- secret storage and key rotation
- observability, backups, migrations, and incident runbooks
- rate limits, metrics, alerts, audit events, and abuse-response controls
- third-party security review and audit signoff
- legal, compliance, and custody review where applicable
- `npm run mainnet:readiness-check` updated to prove those blockers are resolved instead of truthfully blocking launch

## Native SOL v2 + TAG6 Operator Notes (Production Readiness Prep — Full Blast 2026-05-14)

**Authoritative references**: 
- Design document: `wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md` (Phase 1/2 complete locally, Phase B TAG6 prep, success criteria, risks, verification requirements).
- Status note: `wiki/analyses/2026-05-14-native-sol-v2-integration-status.md` (Recommended Next Actions #5 full regression, #6 Lumi hygiene, #7 production readiness artifacts: SBF ABI/comments, operator runbook extensions, Crucible SOL scenarios, mainnet worksheet for SOL vault PDA + TAG6).
- VANTA_ZK_REVIEW.md U2.1 (native SOL data model, PDA seeds, VAULT_ASSET_KIND_SOL=2, system CPI in TAG_UNSHIELD=6, events, no re-shield guarantee).
- Architecture blocker map (R6A / native-SOL-second-class remediated locally via sentinel migration + ingestion; A1-TAG6, A2-Operator-Keypair-Custody still active for SOL).

**Current Operator Surfaces for Native SOL v2**:
- Ingestion: `POST /v1/ingest-native-sol-shield-deposit` in private-pool-v2-service-network.mjs — client supplies sentinel-based commitment + depositSignature; server validates on-chain transfer, normalizes to sentinel, appends to unified VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID via appendCommitment.
- Client migration: migrateLegacyVantaShieldedSolNoteToV2 in vantaShieldState.ts (one-time for legacy WSOL notes); new shields use sentinel from Day 1.
- Status surfaces: unshieldMainnetProductionStatus.mjs (nativeSolV2IndexerIngestionReady: false, productionCustodyReadyForSol: false), unshieldTrustContract.ts (nativeSolLongTermBoundary with target "program-owned-sol-vault-pda-system-cpi").
- Verification commands (run in regression): `npm run private-pool-v2:native-sol-shield-ingestion-check`, `npm run private-pool-v2:native-sol-tag6-wiring-check`, `npm run private-pool-v2:native-sol-unshield-proof-request-check`, `npm run private-pool-v2:native-sol-sentinel-in-snapshot-check`, `npm run private-pool-v2:onchain-unshield-custody-check`, `npm run truth:privacy-claim-gate`, `npm run shield:verify`, `npm run private-pool-v2:verify`.

**TAG6 / On-Chain Native SOL Path (Operator Prep)**:
- Future: TAG_UNSHIELD = 6 generalized for SOL (accounts include system_program; vault_holding_pda for lamports instead of token account).
- Program logic: asset_kind branch → system_instruction::transfer(sol_vault_pda, destination, lamports) CPI, PDA-signed by seeds ["vanta2solvault", pool_state, sentinel] (or generalized vault seed + kind=2).
- Vault asset registry: ["vanta2asset", pool_state, sentinel] registered with VAULT_ASSET_KIND_SOL via TAG_REGISTER_VAULT_ASSET=7.
- Events: ShieldEvent / UnshieldEvent {nullifier, root} for indexer ingestion of on-chain transfer log.
- No operator keypair on funds movement (closes A2 for SOL).
- Operator monitoring: watch for on-chain program deploy with SOL support, live indexer ingesting sentinel commitments, proof-verified TAG6 releases.
- Fail-closed: ERR_UNSHIELD_RELEASE_NOT_WIRED until proof verification + nullifier + CPI wired. productionCustodyReadyForSol remains false until live evidence + external gates.

**Crucible / SBF / Mainnet Deployment Notes**:
- SBF ABI updated with expanded comments for VAULT_ASSET_KIND_SOL, sentinel bypass, system CPI path (see programs/.../lib.rs). Fresh rebuild performed in regression.
- Crucible harness (fuzz/vanta_private_pool_v2_spend): extend with SOL-specific invariant scenarios (system transfer from PDA, sentinel asset_id registration, kind=2 preflight bypass, duplicate nullifier no-release for SOL) once on-chain impl complete. Current harness SPL-only.
- Mainnet deployment worksheet (docs/mainnet-launch-worksheet.md + mainnet-deployment-runbook.md): add entries for SOL vault PDA deployment, TAG_REGISTER_VAULT_ASSET (kind=2), TAG6 SOL wiring test vectors, indexer cross-ref of on-chain transfer logs, native SOL note recovery post-TAG6.
- Operator runbook extension: add monitoring for native SOL deposit signatures (already in public Shield receipts), sentinel commitment ingestion health, future TAG6 SOL release logs.

**Lumi Hygiene & Strict Boundaries**: All local (edits + rebuild + regression runs), committed (pending this Full Blast), pushed (pending), evidence in design doc/status note + daily/wiki/meta/log. No privacyClaimAllowed or productionCustodyReadyForSol flip. References this status note + design doc required for any future claim elevation. "As private as possible" (program-owned PDA + on-chain proof verification) prioritized over operator-keypair shortcuts.

Run `npm run private-pool-v2:verify` (expect SBF gate) + `npm run truth:privacy-claim-gate` after changes. Update blocker map, findings ledger, audit tracker with this runbook extension.

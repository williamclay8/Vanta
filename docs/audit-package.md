# Vanta Audit Package

This document is the starting handoff for future reviewers.

It is not an audit report. It does not make Vanta mainnet-ready.

Plain-English goal: help a reviewer find the important proof, operator, wallet, Pay, storage, and readiness surfaces without reading the whole repo first.

## Scope

Initial review should cover:

- Proofs: Vanta Private Core and Private Pool v2.
- Actual-private settlement: the Solscan-resistant Private Pool v2 spend lane, including pool/cohort/root/nullifier/output/context transcript boundaries.
- Pay: merchant API, checkout, approval packet, and private-settlement adapter.
- Wallet safety: transaction summaries, simulation before signing, and no private-key handling.
- Operators: runbooks, readiness gates, storage requirements, replay protection, and production blockers.
- Production controls: database migrations, backup and restore, abuse controls, rate limits, metrics, alerts, audit events, secret-manager refs, and mainnet-funds approval gates.

## Intake Packets

Refs-only packets for making the remaining external gates real:

- `ops/mainnet/audit-review.packet.template.json`
- `ops/mainnet/legal-compliance-custody.packet.template.json`
- `ops/mainnet/production-key-custody.template.json`

These are intake templates, not approvals. They must contain reference names and decisions only, never secrets, private keys, privileged legal text, under-NDA report bodies, signed transactions, or customer private inputs.

## Public discovery

`/.well-known/vanta-audit.json` is a refs-only public discovery surface for reviewers and counterparties who need to find the current Vanta audit handoff without reading the whole repo first.

`/.well-known/audit` is a short JSON alias for the same public discovery surface. It points to `/.well-known/vanta-audit.json` instead of duplicating audit evidence, so reviewers get a memorable URL while the canonical refs-only packet remains the source of truth.

This public discovery file is not an audit report, not third-party approval, and not production readiness. It must preserve `auditClaimAllowed: false`, `productionReady: false`, and `mainnetReady: false` until the matching external gates actually clear.

The file may point to source-of-truth docs, packet templates, finding ledgers, proof-boundary decisions, and blocker evidence. It must not include secrets, private keys, seed phrases, privileged legal text, under-NDA report bodies, signed transaction bytes, customer private inputs, witness material, or live provider credentials.

Focused guard:

```bash
npm run public:audit-discovery-check
```

## Out of scope

The current repo is not asking reviewers to sign off on:

- deployed mainnet infrastructure
- real custody of user funds
- production merchant processing
- legal or compliance readiness
- production anonymity-set guarantees

## Circuit review

Primary circuit and proof commands:

```bash
npm run private-core:verify
npm run private-pool-v2:verify
npm run zk:c01-production-verifier-backend-candidate-check
npm run zk:c01-verifier-backend-decision-check
```

Reviewers should inspect:

- whether public inputs bind to the thing being proved
- whether actual-private spend public transcripts include the asset-id commitment while excluding source wallet, merchant settlement address, raw amount, raw asset, note secret, input commitment, input leaf index, deposit signature, plaintext memo, and same-fee-payer linkage
- whether nullifiers and replay checks prevent the same private state from being reused
- whether valid fixtures pass and invalid fixtures fail
- whether proof artifacts can be reproduced
- whether the current fixed-depth and narrow-lane assumptions are explicit

## C01 verifier/backend review

Current C01 status is partial. Read `docs/zk/c01-production-verifier-backend-decision.md` and `ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json` before accepting any verifier-ready claim.

Reviewers should verify that current remote proof-artifact receipts stay `offchain-remote-proof-artifact-only`, that any `solana-c01-groth16-verifier-ready` overclaim fails closed, that `groth16-tag3-solana-v0` is selected only as a pending-evidence backend direction, and that the refs-only candidate evidence packet still marks every required positive artifact as blocked until proof-format, production verifying-key, verifier-adapter, valid-proof mutation, invalid/wrong-public-input/wrong-verifying-key no-mutation, SBF/live-lineage, and audit/reviewer evidence exists.

In short, do not accept C01 until proof-format, production verifying-key, verifier-adapter, positive/negative test, SBF/live-lineage, and audit/reviewer evidence exists.

The selected C01 direction is the Groth16 tag-3 Solana verifier path. The Noir/bb.js/UltraHonk adaptation path remains not selected for C01 production acceptance.

The C01 Sunspot/Gnark artifact acquisition packet is `ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json`, guarded by `npm run zk:c01-sunspot-gnark-artifact-acquisition-check`. It is a refs-only external artifact acquisition packet for returned Sunspot/Gnark source, build, setup, proof-format, verifying-key, public-witness, adapter, mutation/no-mutation, SBF/live, and audit/reviewer refs; it is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, and not C01 closure.

The current-source Sunspot compile-attempt packet is `ops/mainnet/private-pool-v2-c01-current-source-sunspot-compile-attempt.evidence.json`, guarded by `npm run zk:c01-current-source-sunspot-compile-attempt-check`. Optional live validation with `VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-lane/bin/sunspot VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check` confirms the local Sunspot beta18-era reader cannot compile the current beta19 source ACIR. Optional latest-upstream validation with `VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-latest-e29fd658/go/sunspot VANTA_C01_SUNSPOT_COMPILE_ATTEMPT=latest VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check` confirms latest observed upstream Sunspot main commit `e29fd6586f9a9f936ace0d71c103f5a4e9d9db76` still fails the same way: the current bytecode is version-prefixed MessagePack-like data, while Sunspot expects the old beta18 binary function-count layout and panics before CCS/proof/VK generation. This is current-source blocker evidence only.

The C01 beta18 source-migration candidate packet is `ops/mainnet/private-pool-v2-c01-beta18-source-migration-candidate.evidence.json`, guarded by `npm run zk:c01-beta18-source-migration-candidate-check`. It records `blocked-no-reviewed-beta18-source-migration`: the local beta18 shim is pre-H6 and comparison-only because it lacks the current H6 context preimage fields and in-circuit Poseidon6 assertion. It is not a reviewed source migration, not production source lineage, not production proof-format evidence, and not C01 closure.

The C01 beta18 H6 migration probe packet is `ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json`, guarded by `npm run zk:c01-beta18-h6-migration-probe-check`. It records `local-h6-beta18-migration-probe-succeeded-nonproduction-unsafe-setup`: a local beta18-compatible source copy preserves the current H6 context preimage fields and Poseidon6 assertion, completes Sunspot compile/setup/prove/verify, and produces a 44-byte public witness. The public witness matches the current H6 proof receipt before the local standalone generated verifier and Vanta local unsafe generated-verifier CPI harness pass. This is still local unsafe evidence only; it is not a reviewed source migration, not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, and not audit acceptance.

The C01 beta18 H6 source-migration review packet is `ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json`, guarded by `npm run zk:c01-beta18-h6-source-migration-review-check`. It records `reviewable-beta18-h6-source-migration-candidate-local-only` and makes `zk/noir/vanta_private_pool_v2_actual_private_spend_entry_sunspot_beta18_h6_candidate/src/main.nr` the in-repo reviewer candidate. The guard proves the compatibility delta is `poseidon-import-path-only`; it is not a reviewed source migration, not production source lineage, not production setup evidence, not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, and not audit acceptance.

The C01 beta18 H6 source-review acceptance gate is `ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json`, guarded by `npm run zk:c01-beta18-h6-source-review-acceptance-gate-check`. It records `blocked-no-external-source-review-acceptance` and validates the refs-only template `ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance.template.json` through `VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-beta18-h6-source-review-acceptance-gate-check`. This is source-review intake only; it is not production source lineage, not production proof/VK evidence, not adapter acceptance, not SBF/live lineage, and not audit acceptance.

The C01 deterministic production artifact build gate is `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json`, guarded by `npm run zk:c01-deterministic-production-artifact-build-check`. It records `blocked-no-deterministic-production-artifact-build-receipt` and validates the refs-only template `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json` through `VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=<reviewed-refs-only-json> npm run zk:c01-deterministic-production-artifact-build-check`. Returned build receipts must include artifact producer/reviewer identity-scope attestation cross-linked to the source acceptance, build manifest, and output manifest. This is deterministic proof/VK/public-witness build receipt intake only; it is not verifier-adapter acceptance, not mutation/no-mutation evidence, not SBF/live lineage, not audit acceptance, and not C01 closure.

The C01 production output-manifest preflight is `ops/mainnet/private-pool-v2-c01-production-output-manifest-preflight.evidence.json`, guarded by `npm run zk:c01-production-output-manifest-check`. It can hash and shape-check returned proof, public-witness, VK, source-ACIR, and generated verifier-SBF artifacts with `VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_ROOT=<returned-artifact-dir> npm run zk:c01-production-output-manifest-check`, then revalidate the refs-only manifest with `VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_PATH=<refs-only-output-manifest-json> npm run zk:c01-production-output-manifest-check`. This is an output-manifest preflight only; it is not production proof-format evidence, not production verifying-key evidence, not deterministic build acceptance, not verifier-adapter acceptance, and not C01 closure.

The C01 verifier-adapter acceptance gate is `ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json`, guarded by `npm run zk:c01-verifier-adapter-acceptance-gate-check`. It records `blocked-no-production-verifier-adapter-acceptance` and validates the refs-only template `ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json` through `VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-verifier-adapter-acceptance-gate-check`. This is production verifier-adapter acceptance intake only; it requires deterministic build, production proof/VK/public-witness binding, accepted adapter/program boundary, valid mutation, invalid/wrong-input/wrong-key no-mutation refs, and reviewer identity-scope attestation before promotion. It is not tag-3 proof acceptance, not SBF/live lineage, not audit acceptance, and not C01 closure.

The C01 production artifact acceptance gate is `ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json`, guarded by `npm run zk:c01-production-artifact-acceptance-gate-check`. It keeps the reviewed production bundle absent, makes local unsafe Sunspot/Gnark inventory comparison-only, requires external source-review acceptance, requires returned artifacts to bind the reviewed beta18 H6 production source ACIR while preserving the reference current source ACIR hash for beta19 semantic equivalence, and now requires any returned public witness to bind to the current H6 proof receipt public input and commitment before production public-input binding can promote. Reviewed artifact intake should use `ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json` and `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-refs-only-json> npm run zk:c01-production-artifact-acceptance-gate-check`; returned bundles must include `productionSourceLineageMode: reviewed-beta18-h6-source-migration`, artifact producer/reviewer identity-scope attestation cross-linked to deterministic build, adapter, lineage, and audit refs. The gate is refs-only and stores no raw proof/VK/witness bytes. The current gate is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not mutation/no-mutation evidence, not SBF/live lineage, and not audit acceptance.

The C01 SBF/live lineage candidate packet is `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json`, guarded by `npm run zk:c01-sbf-live-lineage-candidate-check`. It records `blocked-no-rebuilt-redeployed-reinitialized-live-lineage` and keeps all deployed/reinitialized/live refs null until a reviewer can tie the rebuilt spend SBF, accepted verifier SBF, deployed program ids, tag-5 verifier-key registration, migration/reinit receipts, live proof-enforced path receipt, and reviewer acceptance to the same production proof/VK lineage. It also records `local-h6-sbf-lineage-rehearsal-only`, a refs-only local dry run binding the local spend SBF hash, H6 generated verifier SBF hash, local unsafe VK hash, and local mutation/no-mutation matrix. Local SBF freshness, the local H6 rehearsal, and `/private/tmp` verifier SBF hashes are not SBF/live lineage.

The C01 SBF/live lineage acceptance gate is `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json`, guarded by `npm run zk:c01-sbf-live-lineage-acceptance-gate-check`. It records `blocked-no-sbf-live-lineage-acceptance` and validates the refs-only template `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json` through `VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-sbf-live-lineage-acceptance-gate-check`. The external packet must bind reviewed production artifact and verifier-adapter acceptance refs to rebuilt spend/verifier SBF hashes, deployed program ids, verifier-key record binding, deployment/migration/registration refs, and either a live proof-enforced tag-3 receipt or reviewer-accepted dry-run receipt. This is SBF/live lineage intake only; it is not lineage by itself, not audit/reviewer acceptance, and not C01 closure.

The C01 audit/reviewer acceptance gate is `ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json`, guarded by `npm run zk:c01-audit-reviewer-acceptance-gate-check`. It records `blocked-no-audit-reviewer-acceptance` and validates the refs-only template `ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json` through `VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-audit-reviewer-acceptance-gate-check`. This is final C01 audit/reviewer intake only; it requires reviewed production artifact bundle, adapter acceptance, valid mutation, invalid/wrong-input/wrong-key no-mutation, SBF/live lineage accepted through `npm run zk:c01-sbf-live-lineage-acceptance-gate-check`, reviewer identity/scope, findings disposition, and acceptance refs before promotion. It is not audit/reviewer acceptance, not SBF/live lineage, not tag-3 proof acceptance, and not C01 closure.

The C01 verifier evidence closure gate is `ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json`, guarded by `npm run zk:c01-verifier-evidence-closure-gate-check`. It records `blocked-no-complete-c01-verifier-evidence-chain` and validates a complete refs-only chain through `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-bundle-json> VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-adapter-json> VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-lineage-json> VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-audit-json> npm run zk:c01-verifier-evidence-closure-gate-check`. This is composite intake only: it cross-checks reviewed production artifact bundle, adapter acceptance, SBF/live lineage acceptance, and audit/reviewer acceptance packets against the same backend, proof tuple, reviewed beta18 H6 production source ACIR, reference current source ACIR hash, current H6 public input, VK hash, adapter refs, mutation/no-mutation refs, lineage ref, and audit ref. It is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

The C01 external reviewer handoff packet is `ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json`, guarded by `npm run zk:c01-external-review-handoff-check`. It records `ready-for-external-c01-verifier-review-handoff-blocked` and is the outbound refs-only package for source-review acceptance, deterministic production artifact build, production artifact bundle, verifier-adapter acceptance, SBF/live lineage acceptance, audit/reviewer acceptance, and composite evidence-chain closure. Reviewers should treat it as the index of templates, commands, required current H6 binding, and comparison-only local evidence boundaries; it is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

The C01 production verifier artifact request packet is `ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json`, guarded by `npm run zk:c01-production-verifier-artifact-request-check`. It records `ready-for-external-production-verifier-artifact-request-blocked` and turns the C01 handoff into an artifact producer request for source-review acceptance, deterministic production artifact build, production proof-format/VK/public-witness refs, verifier-adapter acceptance, mutation/no-mutation refs, SBF/live lineage, audit/reviewer acceptance, and composite closure. This request is refs-only and stores no raw proof/VK/witness bytes; it is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not mutation/no-mutation evidence, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

The C01 Sunspot/Gnark local dev probe is `ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json`, guarded by `npm run zk:c01-sunspot-groth16-dev-probe-check`. It records local non-production route feasibility only: a temporary beta18 source shim traversed Sunspot compile/setup/prove/verify, built a local Solana verifier SBF artifact, and passed the generated standalone Solana verifier in local LiteSVM with the selected `gnark-solana-native-proof-and-public-witness-v0` tuple: a 324-byte proof plus 44-byte public witness. The current beta19 ACIR still panics Sunspot compile, the setup is unsafe/unaudited, the beta18 public witness is stale against the current H6 local proof receipt, the current spend-program tag-3 ABI now reserves the selected tuple fail-closed and rejects the legacy 256-byte proof-only shape, but still needs an accepted adapter; Sunspot compile output reported zero public and zero secret inputs while the generated verifier records one public input, and no production proof/VK/Vanta-adapter/mutation/no-mutation/live/audit evidence is accepted.

The C01 local public-witness binding observation is `ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json`, guarded by `npm run zk:c01-public-witness-binding-check`. It records that the local beta18 44-byte public witness decodes to `private-spend-public-input-hash` but is stale against the current H6 local proof receipt, and that the source-level tag-3 default adapter now prechecks the one-field Gnark public witness against `publicInputHash` before assembling the 368-byte verifier instruction-data tuple. This remains source/local drift prevention only; it is not production public-input binding evidence, not production proof-format evidence, and not verifier-adapter acceptance.

The current Sunspot route also records `blocked-local-nargo-version-mismatch-and-sunspot-missing`: Sunspot's upstream README requires Noir/Nargo `1.0.0-beta.18`, while the local workspace reports `nargo 1.0.0-beta.19`; reviewed artifact intake still needs a compatible pinned toolchain, Sunspot binary, `GNARK_VERIFIER_BIN`, setup mitigation, and reviewer acceptance.

The current verifier-adapter acceptance-test candidate packet is `ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json`, guarded by `npm run zk:c01-verifier-adapter-test-candidate-check`. It is blocked refs-only evidence for the missing adapter acceptance, `private-spend-public-input-hash` binding, valid-proof mutation, invalid-proof no-mutation, wrong-public-input no-mutation, and wrong-verifying-key no-mutation tests; it is not verifier acceptance.

The local fail-closed verifier adapter seam harness is guarded by `npm run zk:c01-verifier-adapter-seam-check`. It is drift-prevention for tag `3` only: default adapter rejection leaves accounts unchanged, the default adapter assembles the exact `gnarkProof || gnarkPublicWitness` verifier input tuple and prechecks public-witness binding, tag `3` reserves a dedicated read-only executable verifier-program account, the default adapter constructs the generated Solana verifier CPI instruction shape with no account metas and data equal to `gnarkProof || gnarkPublicWitness`, source has an on-chain-only verifier CPI hook that passes the verifier-program account while host-side Solana syscall stubs remain fail-closed, the public tag-3 account list is commit-capable after adapter success, and the verified-commit helper mutates only after an explicit accepted-adapter handoff. It is not production verifier-adapter acceptance, not tag-3 proof acceptance, not production proof-format evidence, and not production verifying-key evidence.

The local SBF verifier-CPI rejection harness is guarded by `npm run private-pool-v2:c01-sbf-verifier-cpi-rejection-check` and included in `npm run private-pool-v2:crucible-check`. It proves the spend SBF can reach an executable verifier-program CPI and leave accounts unchanged when that verifier rejects. This is rejection/no-mutation drift prevention only; it is not accepted verifier evidence, not valid production mutation, not production invalid/wrong-input/wrong-key no-mutation evidence, not SBF/live lineage, and not audit acceptance.

The local unsafe generated-verifier CPI harness is guarded by `npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check`. It loads the H6-preserving `/private/tmp` Sunspot/Gnark generated verifier SBF, proof, and public witness into the Crucible/TestContext lane and proves the Vanta spend SBF can CPI into that verifier, accept the local unsafe H6 proof/public-witness tuple, mutate nullifier/output state after verifier success, reject a tampered proof without mutation, reject a wrong public input hash without mutation, reject a wrong executable verifier program without mutation when the verifier-key record is bound to the correct generated verifier program id, and reject a wrong-verifying-key local unsafe path by registering the pre-H6 generated verifier SBF/key hash against the H6 proof/public witness. This is local unsafe Sunspot/Gnark evidence only; it is not production verifier-adapter acceptance, not production proof-format evidence, not production verifying-key evidence, not production wrong-verifying-key no-mutation evidence, not SBF/live lineage, and not audit acceptance.

The positive proof-verified claim gate is `ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json`, guarded by `npm run zk:c01-positive-proof-verified-claim-gate-check`. It keeps proof-verified spend wording fail-closed until tag `3` has real valid-proof success, accepted-proof mutation, invalid-proof no-mutation, wrong-public-input no-mutation, wrong-verifying-key no-mutation, SBF/live-lineage, and audit/reviewer evidence.

Focused commands:

```bash
npm run zk:feedback-loop-check
npm run zk:c01-onchain-proof-boundary-check
npm run zk:c01-verifier-backend-contract-check
npm run zk:c01-production-verifier-backend-candidate-check
npm run zk:c01-beta18-source-migration-candidate-check
npm run zk:c01-beta18-h6-migration-probe-check
npm run zk:c01-beta18-h6-source-migration-review-check
npm run zk:c01-beta18-h6-source-review-acceptance-gate-check
npm run zk:c01-production-output-manifest-check
npm run zk:c01-sunspot-groth16-dev-probe-check
npm run zk:c01-sunspot-gnark-artifact-acquisition-check
npm run zk:c01-production-artifact-acceptance-gate-check
npm run zk:c01-production-verifying-key-candidate-check
npm run zk:c01-sbf-live-lineage-candidate-check
npm run zk:c01-sbf-live-lineage-acceptance-gate-check
npm run zk:c01-verifier-evidence-closure-gate-check
npm run zk:c01-external-review-handoff-check
npm run zk:c01-verifier-adapter-test-candidate-check
npm run zk:c01-verifier-adapter-seam-check
npm run zk:c01-positive-proof-verified-claim-gate-check
npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check
npm run zk:c01-verifier-backend-decision-check
npm run private-pool-v2:remote-proof-artifact-boundary-check
```

## Operator review

Primary operator commands:

```bash
npm run operator:runbook-check
npm run mainnet:preflight
npm run mainnet:external-gates-check
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run storage:adapter-check
npm run mainnet:abuse-observability-check
npm run ops:rate-limit-check
npm run nullifier:replay-guard-check
npm run private-pool-v2:verify
npm run pay:verify
```

Reviewers should inspect:

- who the operator is trusted to be today
- what happens after restart
- how duplicate or conflicting requests are rejected
- what evidence is stored for settlement receipts
- which production database, migration, backup, and restore requirements are still incomplete
- whether abuse controls, rate limits, privacy-preserving telemetry, alerts, and audit events fail closed
- whether the external mainnet gates packet and references-only launch evidence are still honest
- whether `ops/mainnet/secret-references.manifest.json` names refs without storing secret values

## Browser and wallet review

Primary browser and wallet commands:

```bash
npm run protocol:browser-check
npm run pay:browser-check
npm run wallet:signing-safety-check
npm run wallet:transaction-safety-check
npm run truth:transaction-check
npm run mainnet:transaction-evidence-check
npm run mainnet:secret-handling-check
```

Reviewers should inspect:

- whether the user sees a clear summary before signing
- whether transactions simulate before signature
- whether blind signing is avoided
- whether the app avoids private keys, seed phrases, and keypair files
- whether live mainnet submission stays behind explicit gates
- whether Transaction Evidence v0.1 redacts private inputs and uses honest completion language
- whether secret-manager and rotation refs exist without exposing secret values

## Custody and key-management review

Vanta needs a dedicated custody and key-management review before real funds.

Reviewers should inspect:

- where secrets would live
- how keys would rotate
- how service-to-service authentication works
- how operator tokens are handled
- how relayer fee wallets are controlled
- what the incident response process is
- whether the repo still avoids private-key, seed-phrase, and keypair-file handling

## Known non-production boundaries

No audit claim is made today.

No mainnet funds should be used with this repo today.

Known beta limits and blockers:

- Private Pool v2 is a Render staging operator with Postgres snapshot persistence, but not a deployed shared anonymity set or audited mainnet privacy pool.
- Pay is a Render staging merchant API with Postgres snapshot persistence and Private Pool v2 operator wiring, but not a production payment processor.
- Strategy is a local planning/runtime lane, not live autonomous execution.
- The mainnet service manifest uses placeholders only and contains no real secrets.
- Secret-manager audit/rotation evidence was skipped by operator decision; this is not a secret-handling maturity claim.
- Audit and legal/compliance/custody review were skipped by operator decision; this is not audit, legal, compliance, or custody approval.
- Pay restore readback plus provider backup/PITR/encryption/access-audit/least-privilege evidence were skipped by operator decision.
- Production database adapters, migrations, backup jobs, and restore drills have partial evidence and operator-skipped controls, not full production recovery proof.
- Live mainnet submission mode can be enabled in bounded operator windows, but real-funds actions remain explicitly approval-gated and still do not make Vanta mainnet-ready.
- Legal, compliance, custody, and third-party security review remain incomplete.

## Required verification bundle

Run the single root handoff command before audit handoff:

```bash
npm run audit:handoff-check
```

It expands to the current canonical bundle:

```bash
npm run audit:package-check
npm run mainnet:preflight
npm run private-core:verify
npm run private-pool-v2:verify
npm run pay:verify
npm run build
```

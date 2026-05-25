# C01 Production Verifier Backend Decision

Status: `groth16-tag3-solana-v0` is selected as the C01 production verifier backend direction.

This packet exists so reviewers do not confuse backend selection with C01 closure. C01 remains partial until Vanta produces the matching production proof format, production verifying-key hash, verifier adapter acceptance, valid-proof mutation evidence, invalid/wrong-input/wrong-key/wrong-program no-mutation evidence, SBF/live lineage, and audit/reviewer acceptance for the exact deployed lineage.

H08 now has `selectedRuntimeDirection: remote-service-production-prover` as a local implementation direction, but that does not satisfy C01. The remote-service prover contract still needs a C01-compatible production proof format, production verifying-key or selected-backend equivalent evidence, verifier acceptance, valid/invalid proof evidence, SBF/live lineage where applicable, and audit/reviewer acceptance before any production prover or proof-enforced spend claim can promote.

Current refs-only candidate evidence packet: `ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json`. It is intentionally blocked and records `selectedBackend: "groth16-tag3-solana-v0"` only as a backend direction. It still names the exact proof-format, production verifying-key, verifier-adapter, positive/negative test, SBF/live-lineage, and audit/reviewer artifacts required before any `solana-c01-groth16-verifier-ready` claim can promote.

Backend Options Evidence packet: `ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json`. It is checked by `npm run zk:c01-verifier-backend-options-check` and records `groth16-tag3-solana-v0` as the selected direction while preserving `noir-bb-ultrahonk-adaptation` as not selected. This packet does not satisfy production proof-format evidence and does not promote local proof or verifier-key registry evidence.

Groth16 Proof-Format Candidate packet: `ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json`. It is checked by `npm run zk:c01-groth16-proof-format-candidate-check` and records `blocked-no-groth16-production-proof-format-artifact` for the current `groth16-tag3-solana-v0` path. This packet does not satisfy production proof-format evidence; it now records the selected Sunspot/Gnark verifier input format, `gnark-solana-native-proof-and-public-witness-v0`, as a 324-byte proof plus 44-byte public witness, 368 bytes total, with one generated verifier public input and zero commitment keys. The exact production artifact for `vanta_private_pool_v2_actual_private_spend_entry` is still absent.

Production Groth16 Toolchain Preflight packet: `ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json`. It is checked by `npm run zk:c01-production-groth16-toolchain-preflight-check` and records `blocked-local-toolchain-no-groth16-scheme` for the current local Noir/bb lane. This packet does not satisfy production proof-format or production verifying-key evidence; it records that the installed local `@aztec/bb.js` CLI exposes `chonk`, `avm`, and `ultra_honk` schemes, not the required Groth16 production artifact lane. The current-source Sunspot compile-attempt packet is `ops/mainnet/private-pool-v2-c01-current-source-sunspot-compile-attempt.evidence.json`, checked by `npm run zk:c01-current-source-sunspot-compile-attempt-check`; it records that both the local Sunspot beta18-era reader and latest observed upstream Sunspot main commit `e29fd6586f9a9f936ace0d71c103f5a4e9d9db76` panic on the current beta19 source ACIR bytecode format before CCS/proof/VK generation.

Sunspot/Gnark Route packet: `ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json`. It is checked by `npm run zk:c01-sunspot-groth16-route-check` and records `blocked-sunspot-toolchain-not-installed-and-no-production-trusted-setup` for `sunspot-noir-acir-gnark-groth16-solana-v0`. This is now the first-class route packet for investigating ACIR-to-Solana-Groth16 artifacts; it still does not satisfy production proof-format, production verifying-key, verifier-adapter, SBF/live lineage, or audit evidence. Its current-source blocker is reproducible with `VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-lane/bin/sunspot VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check`, and the latest-upstream check is reproducible with `VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-latest-e29fd658/go/sunspot VANTA_C01_SUNSPOT_COMPILE_ATTEMPT=latest VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check`.

C01 Sunspot/Gnark artifact acquisition packet: `ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json`. It is checked by `npm run zk:c01-sunspot-gnark-artifact-acquisition-check` and records the refs-only returned-artifact contract for the selected route. This packet keeps returned Sunspot/Gnark source/build/setup/proof-format/VK/public-witness/adapter/test/SBF/live/audit refs null until reviewed artifacts exist; it is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, and not C01 closure.

C01 beta18 source-migration candidate packet: `ops/mainnet/private-pool-v2-c01-beta18-source-migration-candidate.evidence.json`. It is checked by `npm run zk:c01-beta18-source-migration-candidate-check` and records `blocked-no-reviewed-beta18-source-migration`. The observed `/private/tmp` beta18 shim is pre-H6 and comparison-only: it preserves the public Poseidon11 binding shape over `context_hash`, but it omits the current H6 private context preimage fields and the in-circuit Poseidon6 assertion `computed_context_hash == context_hash`. A beta18-compatible route can promote only through a reviewed source migration that preserves the current H6 proof receipt public input and commitment, source lineage, deterministic production artifacts, adapter acceptance, SBF/live lineage, and audit/reviewer acceptance.

C01 beta18 H6 migration probe packet: `ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json`. It is checked by `npm run zk:c01-beta18-h6-migration-probe-check` and records `local-h6-beta18-migration-probe-succeeded-nonproduction-unsafe-setup`. This local probe preserves the current H6 context preimage fields and Poseidon6 assertion, runs Sunspot compile/setup/prove/verify, and produces a 44-byte public witness. The public witness matches the current H6 proof receipt; the generated verifier SBF passes standalone LiteSVM verification; and the Vanta local unsafe generated-verifier CPI harness passes. It is stronger local route evidence than the older pre-H6 shim, but it is not a reviewed source migration, not production source lineage, not production proof-format evidence, not production VK/hash evidence, not production verifier-adapter acceptance, not production mutation/no-mutation evidence, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

C01 beta18 H6 source-migration review packet: `ops/mainnet/private-pool-v2-c01-beta18-h6-source-migration-review.evidence.json`. It is checked by `npm run zk:c01-beta18-h6-source-migration-review-check` and records `reviewable-beta18-h6-source-migration-candidate-local-only`. The in-repo candidate source is `zk/noir/vanta_private_pool_v2_actual_private_spend_entry_sunspot_beta18_h6_candidate/src/main.nr`, and the guard proves the source normalizes to the current beta19 source after replacing the beta18-compatible `use dep::poseidon::poseidon::bn254;` import with the current `use ::poseidon::poseidon::bn254;` import. The compatibility delta is `poseidon-import-path-only`; this makes the migration reviewable, but it is not reviewed source migration, not production source lineage, not production setup, not production proof-format evidence, not production VK/hash evidence, not verifier-adapter acceptance, not SBF/live lineage, and not audit/reviewer acceptance.

C01 beta18 H6 source-review acceptance gate: `ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json`. It is checked by `npm run zk:c01-beta18-h6-source-review-acceptance-gate-check` and records `blocked-no-external-source-review-acceptance`. The refs-only acceptance template is `ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance.template.json`; an external source-review acceptance packet can be validated with `VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-beta18-h6-source-review-acceptance-gate-check`. This can only accept the beta18 H6 source-migration delta; it is not production source lineage, not production setup, not production proof/VK evidence, not adapter acceptance, not SBF/live lineage, not audit acceptance, and not C01 closure.

C01 deterministic production artifact build gate: `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json`. It is checked by `npm run zk:c01-deterministic-production-artifact-build-check` and records `blocked-no-deterministic-production-artifact-build-receipt`. The refs-only build receipt template is `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json`; an external reviewed build receipt can be validated with `VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=<reviewed-refs-only-json> npm run zk:c01-deterministic-production-artifact-build-check`. This gate requires a reviewed frozen source commit, reviewed source tree status or reviewed diff status, source-freeze review acceptance, source-review acceptance, pinned reviewed Sunspot/Gnark toolchain source, reviewed reproducible toolchain build, trusted setup or toxic-waste mitigation, deterministic output manifest, production proof/VK refs, current H6 public-input binding, and artifact producer/reviewer identity-scope attestation before proof/VK/public-witness artifacts can promote. It is not verifier-adapter acceptance, not mutation/no-mutation evidence, not SBF/live lineage, not audit acceptance, and not C01 closure.

C01 production output-manifest preflight: `ops/mainnet/private-pool-v2-c01-production-output-manifest-preflight.evidence.json`. It is checked by `npm run zk:c01-production-output-manifest-check` and records `blocked-no-reviewed-production-output-manifest`. A returned artifact directory can be shape-checked with `VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_ROOT=<returned-artifact-dir> npm run zk:c01-production-output-manifest-check`; a refs-only generated manifest can be revalidated with `VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_PATH=<refs-only-output-manifest-json> npm run zk:c01-production-output-manifest-check`. This preflight hashes and checks proof, public-witness, VK, source-ACIR, and generated verifier-SBF refs for the selected tuple, but it is not production proof-format evidence, not production verifying-key evidence, not deterministic build acceptance, not verifier-adapter acceptance, and not C01 closure.

C01 verifier-adapter acceptance gate: `ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json`. It is checked by `npm run zk:c01-verifier-adapter-acceptance-gate-check` and records `blocked-no-production-verifier-adapter-acceptance`. The refs-only adapter acceptance template is `ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json`; an external reviewed adapter acceptance packet can be validated with `VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-verifier-adapter-acceptance-gate-check`. This gate requires deterministic production artifact build evidence, production proof-format and VK refs, current H6 public-input binding, an accepted adapter/program boundary, valid-proof mutation, invalid/wrong-public-input/wrong-verifying-key/wrong-verifier-program no-mutation refs, and reviewer identity-scope attestation before adapter evidence can promote. The five mutation/no-mutation refs must be distinct so a single broad receipt cannot satisfy valid, invalid-proof, wrong-public-input, wrong-verifying-key, and wrong-verifier-program coverage. It is not tag-3 proof acceptance, not SBF/live lineage, not audit acceptance, and not C01 closure.

Production Artifact Acceptance Gate packet: `ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json`. It is checked by `npm run zk:c01-production-artifact-acceptance-gate-check` and records `blocked-no-reviewed-production-artifact-bundle` for the selected Sunspot/Gnark route. This packet defines the reviewed returned-artifact bundle required before local unsafe Sunspot/Gnark observations can be promoted, and now requires a reviewed frozen source commit, reviewed source tree status or reviewed diff status, source-freeze review acceptance, external source-review acceptance, production output-manifest preflight, returned artifacts to bind the reviewed beta18 H6 production source ACIR while preserving the reference current source ACIR hash for beta19 semantic equivalence, the returned public witness to bind to the current H6 proof receipt public input and commitment rather than passing by byte lengths alone, five trim-normalized distinct valid-mutation / invalid-proof / wrong-public-input / wrong-verifying-key / wrong-verifier-program evidence refs, and artifact producer/reviewer identity-scope attestation that cross-links output manifest, deterministic build, adapter, lineage, audit refs, and the verifier program upgrade-authority status ref. The refs-only external bundle template is `ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json`; a reviewer-returned bundle can be validated with `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-refs-only-json> npm run zk:c01-production-artifact-acceptance-gate-check`. It does not satisfy production proof-format evidence, production verifying-key evidence, verifier-adapter acceptance, mutation/no-mutation evidence, SBF/live lineage, audit evidence, or C01 closure.

C01 SBF/live lineage candidate packet: `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-candidate.evidence.json`. It is checked by `npm run zk:c01-sbf-live-lineage-candidate-check` and records `blocked-no-rebuilt-redeployed-reinitialized-live-lineage` for the selected tag-3 Groth16 path. This packet makes the required rebuilt spend SBF hash, accepted verifier SBF hash, deployed spend/verifier program ids, deployed verifier program upgrade-authority status ref, verifier-key registration, reinitialization/migration, live proof-enforced path receipt, and audit/reviewer acceptance refs explicit while keeping all current refs null. It also records `local-h6-sbf-lineage-rehearsal-only`, a refs-only local dry run binding the local spend SBF hash, H6 generated verifier SBF hash, local unsafe VK hash, and local mutation/no-mutation matrix. Local SBF ABI freshness, the local H6 rehearsal, and `/private/tmp` generated verifier SBF hashes are comparison/drift-prevention only; they are not SBF/live lineage.

C01 SBF/live lineage acceptance gate: `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json`. It is checked by `npm run zk:c01-sbf-live-lineage-acceptance-gate-check` and records `blocked-no-sbf-live-lineage-acceptance`. The refs-only lineage template is `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json`; an external reviewed lineage packet can be validated with `VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-sbf-live-lineage-acceptance-gate-check`. This gate requires reviewed production artifact bundle and verifier-adapter acceptance refs, rebuilt spend SBF hash, accepted verifier SBF hash, deployed spend/verifier program ids, verifier program upgrade-authority status ref, verifier-key record binding the production VK hash to verifier program id, deployment/migration/verifier-key registration refs, and a live proof-enforced tag-3 receipt or reviewer-accepted dry-run receipt. It is not SBF/live lineage by itself, not audit/reviewer acceptance, and not C01 closure.

C01 audit/reviewer acceptance gate: `ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json`. It is checked by `npm run zk:c01-audit-reviewer-acceptance-gate-check` and records `blocked-no-audit-reviewer-acceptance`. The refs-only audit/reviewer acceptance template is `ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json`; an external reviewed acceptance packet can be validated with `VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-refs-only-json> npm run zk:c01-audit-reviewer-acceptance-gate-check`. This gate requires the reviewed production artifact bundle, production verifier-adapter acceptance, valid mutation, invalid/wrong-input/wrong-key/wrong-program no-mutation, SBF/live lineage accepted through `npm run zk:c01-sbf-live-lineage-acceptance-gate-check`, reviewer identity/scope, and findings disposition refs before audit acceptance can promote; the valid and each negative case must be supported by distinct evidence refs. It is not audit/reviewer acceptance, not SBF/live lineage, not tag-3 proof acceptance, and not C01 closure.

C01 verifier evidence closure gate: `ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json`. It is checked by `npm run zk:c01-verifier-evidence-closure-gate-check` and records `blocked-no-complete-c01-verifier-evidence-chain`. The refs-only composite validator can be exercised with `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-bundle-json> VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-adapter-json> VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-lineage-json> VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-audit-json> npm run zk:c01-verifier-evidence-closure-gate-check`. It cross-checks that the reviewed production bundle, adapter acceptance, SBF/live lineage acceptance, and audit/reviewer acceptance packets all bind the same selected backend, route, frozen source commit, source-review acceptance and deterministic build/output-manifest prerequisite refs, reviewed beta18 H6 production source ACIR, reference current source ACIR hash, current H6 public input and adapter public-input binding flag, production verifying-key hash, verifier program upgrade-authority status ref, adapter refs, trim-normalized distinct mutation/no-mutation refs, lineage ref, audit ref, and required reviewer/producer attestations. Env-supplied C01 reviewed packets are also scanned for raw proof/VK/witness/key/secret/signed-transaction material before JSON promotion checks run. It is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

C01 external reviewer handoff packet: `ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json`. It is checked by `npm run zk:c01-external-review-handoff-check` and records `ready-for-external-c01-verifier-review-handoff-blocked`. This is the outbound refs-only package for source-review acceptance, production output-manifest preflight, deterministic production artifact build, production artifact bundle, verifier-adapter acceptance, SBF/live lineage acceptance, audit/reviewer acceptance, and composite evidence-chain closure. It names the templates, env-var validation commands, frozen source commit requirement, current H6 public input binding, the required reviewed beta18 H6 production source ACIR, the reference current source ACIR hash, the required verifier program upgrade-authority status ref, and comparison-only local evidence reviewers must not promote. It is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

C01 production verifier artifact request packet: `ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json`. It is checked by `npm run zk:c01-production-verifier-artifact-request-check` and records `ready-for-external-production-verifier-artifact-request-blocked`. This packet turns the handoff into an artifact producer request: it lists the frozen source commit requirement, current and candidate source refs, the current H6 public-input tuple, required production proof-format/VK/public-witness outputs, verifier-adapter acceptance, mutation/no-mutation outputs, deployed verifier program id/hash, verifier program upgrade-authority status ref, SBF/live lineage, audit/reviewer acceptance, and the validation commands for each returned refs-only packet. It is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not mutation/no-mutation evidence, not SBF/live lineage, not audit/reviewer acceptance, and not C01 closure.

C01 Sunspot/Gnark local dev probe: `ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json`. It is checked by `npm run zk:c01-sunspot-groth16-dev-probe-check` and records `local-dev-probe-succeeded-nonproduction-unsafe-setup-and-beta18-source-shim` for the selected route. The probe proves a temporary Noir/Nargo 1.0.0-beta.18 source copy can traverse Sunspot compile/setup/prove/verify, build a local Solana verifier SBF artifact, and pass the generated standalone Solana verifier in local LiteSVM with a 324-byte proof plus 44-byte public witness. It is still not production evidence: the current beta19 ACIR panics Sunspot compile, the repo source required a beta18-only import shim, Sunspot setup was unsafe and unaudited, the current spend-program tag-3 ABI now reserves the selected tuple fail-closed and rejects the legacy 256-byte proof-only shape, Sunspot compile output reported zero public and zero secret inputs while the generated verifier records one public input, and no Vanta spend-program verifier adapter, mutation/no-mutation, live lineage, or reviewer acceptance exists.

C01 local public-witness binding observation: `ops/mainnet/private-pool-v2-c01-public-witness-binding.evidence.json`. It is checked by `npm run zk:c01-public-witness-binding-check` and now records both the older `local-public-witness-decoded-stale-against-current-proof-receipt` observation and the `local-h6-public-witness-matches-current-proof-receipt-comparison-only` probe. The older 44-byte beta18 public witness uses a 12-byte Gnark header plus one 32-byte public input labeled `private-spend-public-input-hash`, but that decoded value is stale against the current H6 Noir/bb receipt. The H6-preserving beta18 probe witness decodes the same one-field layout and matches the current H6 proof receipt public input and commitment, but it remains local unsafe comparison-only evidence. This is not production public-input binding evidence, not production proof-format evidence, and not verifier-adapter acceptance.

C01 source public-witness binding precheck and commit-capable account seam: guarded by `npm run zk:c01-verifier-adapter-seam-check` and recorded in the public-witness binding / verifier-adapter candidate packets. The reserved tag `3` default adapter now assembles `gnarkProof || gnarkPublicWitness` as the 368-byte verifier instruction-data tuple, rejects a bad Gnark public-witness header or a one-field witness value that does not equal `publicInputHash` before the verifier boundary, reserves a dedicated read-only executable verifier-program account, constructs the generated Solana verifier CPI instruction with no account metas and data equal to `gnarkProof || gnarkPublicWitness`, has an on-chain-only verifier CPI hook that passes the verifier-program account while host-side Solana syscall stubs remain fail-closed, and carries the writable pool/output plus payer/system accounts a future accepted adapter needs to commit state. `npm run private-pool-v2:c01-sbf-verifier-cpi-rejection-check` proves a local SBF rejection/no-mutation lane: the spend SBF reaches an executable verifier-program CPI and leaves accounts unchanged when that verifier rejects. `npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check` now points at the H6-preserving `/private/tmp` Sunspot/Gnark artifacts and proves a local unsafe adapter lane: the Vanta spend SBF CPI-calls the generated verifier SBF, accepts the local unsafe H6 proof/public-witness tuple, mutates nullifier/output state after verifier success, rejects a tampered proof without mutation, rejects a wrong public input hash without mutation, rejects a wrong executable verifier program without mutation when the registered verifier-key record is bound to the correct generated verifier program id, and rejects a wrong-verifying-key local unsafe path by registering the pre-H6 generated verifier SBF/key hash against the H6 proof/public witness. These are local unsafe/source/SBF drift-prevention lanes only; they are not production public-input binding evidence, not verifier-adapter acceptance, not production proof-format or VK evidence, not production wrong-verifying-key or wrong-verifier-program no-mutation evidence, not SBF/live lineage, and not tag-3 production proof acceptance.

Sunspot/Gnark candidate artifact lane: the same preflight packet now records `sunspot-noir-acir-gnark-groth16-solana-v0` as the next candidate route from the current Noir ACIR artifact to a Solana Groth16 proof/VK artifact. Current local status is `blocked-sunspot-toolchain-not-installed-and-no-production-trusted-setup`: `go` is available, but `sunspot` and `GNARK_VERIFIER_BIN` are not configured locally. The sharper compatibility status is `blocked-local-nargo-version-mismatch-and-sunspot-missing`: Sunspot's upstream README requires Noir/Nargo `1.0.0-beta.18`, while the local workspace reports `nargo 1.0.0-beta.19`. This is an artifact-lane direction only. A default single-operator `sunspot setup` is not production verifying-key evidence; production acceptance still requires a compatible pinned/reviewed toolchain, trusted setup ceremony or equivalent toxic-waste mitigation, deterministic proof/VK artifacts, adapter tests, SBF/live lineage, and reviewer/audit acceptance.

Production Verifying-Key Candidate packet: `ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json`. It is checked by `npm run zk:c01-production-verifying-key-candidate-check` and records `blocked-no-production-verifying-key-hash-artifact` for the current `groth16-tag3-solana-v0` path. This packet does not satisfy production verifying-key evidence; it records that the exact production verifying-key hash artifact for the reserved tag-3 Groth16 path is still absent.

Verifier Adapter Acceptance-Test Candidate packet: `ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json`. It is checked by `npm run zk:c01-verifier-adapter-test-candidate-check` and records `blocked-no-verifier-adapter-acceptance-tests` for the current `groth16-tag3-solana-v0` path. The packet now also records the H6 local unsafe generated-verifier CPI harness guarded by `npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check`, including local unsafe valid mutation, invalid-proof no-mutation, wrong-public-input no-mutation, wrong-executable-program no-mutation, and wrong-verifying-key no-mutation. This packet does not satisfy verifier-adapter evidence and does not prove tag-3 production proof acceptance; production adapter acceptance, production `private-spend-public-input-hash` binding, production valid-proof mutation, production invalid-proof no-mutation, production wrong-public-input no-mutation, production wrong-verifying-key and wrong-verifier-program no-mutation, SBF/live lineage, and reviewer acceptance are still absent.

Positive Proof-Verified Claim Gate packet: `ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json`. It is checked by `npm run zk:c01-positive-proof-verified-claim-gate-check` and records `blocked-no-tag3-valid-proof-success` for source, copy, finding, receipt, and status surfaces that might otherwise imply proof-verified spend support. This packet does not satisfy tag-3 proof acceptance; it requires valid-proof success, accepted-proof mutation, invalid-proof no-mutation, wrong-public-input no-mutation, wrong-verifying-key no-mutation, wrong-verifier-program no-mutation, SBF/live-lineage, and audit/reviewer evidence before proof-verified wording can unlock.

## Current Truth

- The current Solana tag `3` path is a reserved `TAG_SPEND_WITH_PROOF` preflight, not proof support.
- Current source tag `3` is Groth16-shaped with the selected Gnark-native reserved payload: `verifierKeyHash:32`, `gnarkProof:324`, `gnarkPublicWitness:44`, and `onChainVerifierTarget: solana-c01-tag3-groth16-v0`.
- The legacy 256-byte proof-only tag `3` payload shape is now rejected before account inspection. This is fail-closed ABI alignment only, not accepted proof-format evidence.
- The selected production proof-format candidate for the Sunspot/Gnark route is `gnark-solana-native-proof-and-public-witness-v0`: 324 proof bytes plus 44 public-witness bytes, 368 verifier instruction-data bytes total, one generated verifier public input, and zero commitment keys.
- The older pre-H6 local public-witness binding observation decodes the 44-byte beta18 public witness to `private-spend-public-input-hash`, but it is stale against the current H6 local proof receipt and remains comparison-only. The H6 beta18 probe witness matches the current receipt but is still local unsafe comparison evidence only; production artifact acceptance still requires reviewed beta18 H6 production source ACIR lineage, source-review acceptance, and one returned public witness decoding to `private-spend-public-input-hash` equal to the current H6 proof receipt public input and commitment before production public-input binding can promote. Production public-input binding remains blocked until an accepted verifier adapter verifies that binding without mutation drift.
- The current source ABI now reserves the selected Gnark-native tuple, a dedicated verifier-program CPI account, and the generated verifier CPI instruction shape, locally prechecks the one-field Gnark public witness against `publicInputHash`, has local SBF rejection/no-mutation coverage for a verifier CPI failure, and has H6 local unsafe generated-verifier CPI acceptance coverage for the `/private/tmp` Sunspot proof/public-witness/verifier SBF lane. It now also has local unsafe wrong-executable-verifier-program and wrong-verifying-key no-mutation coverage. C01 still needs an accepted production spend-program adapter before tag `3` can consume this tuple as production proof evidence.
- Host/non-Solana tag `3` still returns custom error `14` / `ERR_PROOF_VERIFIER_NOT_WIRED` before mutation so syscall stubs cannot fake proof acceptance. SBF tag `3` can invoke a verifier program; current local evidence now proves rejection/no-mutation with an executable negative verifier stand-in and H6 local unsafe valid mutation / invalid-proof no-mutation / wrong-public-input no-mutation / wrong-executable-verifier-program no-mutation / wrong-verifying-key no-mutation with generated verifier SBFs. It does not prove production verifier acceptance, production wrong-verifying-key and wrong-verifier-program no-mutation, SBF/live lineage, or reviewer acceptance.
- Current bb.js / UltraHonk proof artifacts remain off-chain evidence only. Accepted remote proof-artifact receipts must stay `offchain-remote-proof-artifact-only`.
- Any `solana-c01-groth16-verifier-ready` request or receipt overclaim must fail closed until a real Solana tag-3 Groth16 verifier candidate exists.
- Any proof-verified spend wording must fail closed until `ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json` records positive tag-3 valid-proof success evidence and the matching negative no-mutation tests.
- Root provenance records at `["vanta2root", pool_state, acceptedRoot]` are lineage metadata, not proof that the root transition is correct, and not a program-owned shared Merkle tree.

## Local Proof-Format Observation

Local proof-format observation is now recorded at `ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json` and checked by `npm run zk:c01-local-proof-format-evidence-check`.

The packet records that the active local actual-private-spend proof receipt for `vanta_private_pool_v2_actual_private_spend_entry` is `noir-bb / barretenberg-ultrahonk`, carries one `private-spend-public-input-hash`, uses a 16000-byte local proof, and labels its verifying-key metadata as `local-acir-bytecode-hash-not-production-vk`.

That observation is useful for the backend decision because it makes the mismatch explicit: current local UltraHonk evidence is neither the reserved Gnark-native 324-byte proof plus 44-byte public witness tag-3 tuple nor `production-verifying-key-hash` evidence for `solana-c01-tag3-groth16-v0`. This is not backend selection, not production proof-format acceptance, not production verifying-key evidence, not tag-3 proof acceptance, and not on-chain proof verification.

## Verifier-Key Registry Scaffold

Source-only verifier-key registry evidence is now recorded at `ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json` and checked by `npm run zk:c01-verifier-key-registry-check`.

Tag `5` (`TAG_REGISTER_VERIFIER_KEY`) creates or idempotently verifies the program-owned verifier-key PDA derived from `["vanta2vkey", pool_state, verifierKeyHash]`. The 65-byte instruction records `verifierKeyHash` plus the bound `verifierProgramId`; the record stores pool, verifier-key hash, and verifier program id so reserved tag `3` can reject a different executable verifier program before returning `ERR_PROOF_VERIFIER_NOT_WIRED`.

This source-only verifier-key registry scaffold is useful because tag `3` no longer depends on tests hand-writing verifier-key accounts. It is still not backend selection, not production verifying-key evidence, not verifier-adapter acceptance, not tag-3 proof acceptance, and not on-chain proof verification.

## Production Verifying-Key Candidate

The blocked production verifying-key candidate packet is the human-review companion for the `production-verifying-key-hash` evidence gate.

Current candidate status: `blocked-no-production-verifying-key-hash-artifact`.

The required candidate shape is narrow: circuit `vanta_private_pool_v2_actual_private_spend_entry`, target `solana-c01-tag3-groth16-v0`, tag `3`, `proofSystem: "groth16"`, `proofFormatId: "gnark-solana-native-proof-and-public-witness-v0"`, 324 proof bytes, 44 public-witness bytes, 368 verifier instruction-data bytes, one `private-spend-public-input-hash`, and `verifyingKeyHashKind: "production-verifying-key-hash"`.

The current production verifying-key artifact is absent. The source-only tag `5` registry metadata records a caller-supplied `verifierKeyHash` PDA at `["vanta2vkey", pool_state, verifierKeyHash]` plus a bound verifier program id, and the current local proof observation still uses `local-acir-bytecode-hash-not-production-vk`. Therefore the packet is useful feasibility evidence, but it does not satisfy production verifying-key evidence, production proof-format evidence, verifier-adapter acceptance, tag-3 proof acceptance, or on-chain proof verification.

## Groth16 Proof-Format Candidate

The blocked Groth16 proof-format candidate packet is the human-review companion for the `groth16-tag3-solana-v0` option.

Current candidate status: `blocked-no-groth16-production-proof-format-artifact`.

The required candidate shape is narrow: circuit `vanta_private_pool_v2_actual_private_spend_entry`, target `solana-c01-tag3-groth16-v0`, tag `3`, `proofSystem: "groth16"`, `proofFormatId: "gnark-solana-native-proof-and-public-witness-v0"`, 324 proof bytes, 44 public-witness bytes, 368 verifier instruction-data bytes, one `private-spend-public-input-hash`, and `verifyingKeyHashKind: "production-verifying-key-hash"`.

The current artifact is absent. The current local proof observation is still `noir-bb / barretenberg-ultrahonk`, 16000 bytes, and `local-acir-bytecode-hash-not-production-vk`. Therefore the packet is useful feasibility evidence, but it does not satisfy production proof-format evidence, production verifying-key evidence, verifier-adapter acceptance, tag-3 proof acceptance, or on-chain proof verification.

## Production Groth16 Toolchain Preflight

The blocked production Groth16 toolchain preflight packet is the executable companion for the first artifact blocker.

Current preflight status: `blocked-local-toolchain-no-groth16-scheme`.

The installed local proof toolchain is `nargo 1.0.0-beta.19` plus `@aztec/bb.js 4.1.3`. The local `bb prove --help-extended` scheme list is `chonk`, `avm`, and `ultra_honk`; it does not expose a Groth16 generation scheme. That means the current local lane can continue to produce useful UltraHonk evidence for request/public-input binding, but it cannot generate the selected tag-3 production proof-format artifact or production verifying-key hash.

The preflight also names the candidate external artifact route: `sunspot-noir-acir-gnark-groth16-solana-v0`, using the current `target/vanta_private_pool_v2_actual_private_spend_entry.json` ACIR and compressed witness as inputs. The current local machine has Go, but not Sunspot or `GNARK_VERIFIER_BIN`. More importantly, a default `sunspot setup` is blocked as production evidence until Vanta has a reviewed setup ceremony or equivalent toxic-waste mitigation for the exact circuit.

The Sunspot route has an additional compatibility blocker before artifact generation: Sunspot's upstream README requires Noir/Nargo `1.0.0-beta.18`, while this workspace currently has `nargo 1.0.0-beta.19`. The machine-readable status is `blocked-local-nargo-version-mismatch-and-sunspot-missing`; installing Sunspot alone is not enough to produce C01 production proof/VK evidence without a compatible pinned toolchain and reviewer acceptance.

The first-class route packet for that investigation is `ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json` and the guard is `npm run zk:c01-sunspot-groth16-route-check`. It pins the current ACIR metadata by reference/hash, deliberately avoids storing witness values or witness hashes, and keeps all production acceptance outputs null until the route produces reviewed artifacts.

This preflight is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not tag-3 proof acceptance, and not on-chain proof verification.

## Verifier Adapter Acceptance-Test Candidate

The blocked verifier adapter acceptance-test candidate packet is the human-review companion for the verifier-adapter, public-input binding, valid-proof mutation, and invalid-proof no-mutation evidence gates.

Current candidate status: `blocked-no-verifier-adapter-acceptance-tests`.

The required candidate shape is narrow: circuit `vanta_private_pool_v2_actual_private_spend_entry`, target `solana-c01-tag3-groth16-v0`, tag `3`, `proofSystem: "groth16"`, `proofFormatId: "gnark-solana-native-proof-and-public-witness-v0"`, 324 proof bytes, 44 public-witness bytes, 368 verifier instruction-data bytes, one `private-spend-public-input-hash`, `verifyingKeyHashKind: "production-verifying-key-hash"`, and an in-program verifier or dedicated verifier CPI adapter.

The current adapter artifact is absent. Production acceptance-test evidence is also absent: no production valid-proof mutation test, no production invalid-proof no-mutation test, no production wrong-public-input-hash no-mutation test, and no production wrong-verifying-key and wrong-verifier-program no-mutation test. Host tag `3` still returns `ERR_PROOF_VERIFIER_NOT_WIRED` before mutation, while SBF tag `3` now has local rejection/no-mutation coverage for an executable verifier CPI failure. Therefore the packet is useful feasibility evidence, but it does not satisfy verifier-adapter evidence, public-input hash binding, proof acceptance, production proof-format evidence, production verifying-key evidence, tag-3 proof acceptance, or on-chain proof verification; it does not prove tag-3 proof acceptance.

The local fail-closed verifier adapter seam harness is guarded by `npm run zk:c01-verifier-adapter-seam-check`. It proves the source now has separate tag-3 preflight, default adapter rejection, and verified-commit helper boundaries, public tag-3 default rejection before mutation, 368-byte proof-plus-public-witness verifier instruction-data assembly, source public-witness binding precheck against `publicInputHash`, a dedicated read-only executable verifier-program account, a generated Solana verifier CPI instruction with no account metas and data equal to `gnarkProof || gnarkPublicWitness`, an on-chain-only verifier CPI hook that passes the verifier-program account while host-side Solana syscall stubs remain fail-closed, a commit-capable public tag-3 account list after accepted-adapter success, and test-only selected-Gnark valid-mutation / invalid-proof / wrong-public-input / wrong-verifying-key / wrong-verifier-program no-mutation shape coverage for the 324-byte proof plus 44-byte public-witness tuple. This is local drift-prevention only; it is not verifier-adapter acceptance, not tag-3 proof acceptance, not production proof-format evidence, and not production verifying-key evidence.

The local SBF verifier-CPI rejection harness is guarded by `npm run private-pool-v2:c01-sbf-verifier-cpi-rejection-check` and included in `npm run private-pool-v2:crucible-check`. It registers an executable SBF verifier-program stand-in, reaches verifier CPI from the spend SBF, and proves the outer spend leaves accounts unchanged when that verifier rejects. This is SBF CPI rejection/no-mutation evidence only; it is not valid production mutation, not invalid/wrong-input/wrong-key production no-mutation under an accepted verifier, not SBF/live lineage, and not verifier-adapter acceptance.

## Backend Options

The machine-readable options matrix lives in `ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json`; this section is its human review companion.

### Groth16 Tag-3 Solana Verifier Path

This is now the selected C01 backend direction because it targets Solana's BN254/Groth16 verifier surface and has a concrete Sunspot/Gnark-generated verifier input tuple to adapt into tag `3`.

Required positive evidence:

- Compile the active `vanta_private_pool_v2_actual_private_spend_entry` circuit to a Groth16-compatible proof/public-witness format.
- Commit a production verifying-key hash with `verifyingKeyHashKind: production-verifying-key-hash`.
- Replace the source-only tag `5` registry scaffold with reviewed production verifying-key evidence for the selected backend.
- Wire in-program verification or a dedicated verifier CPI for `solana-c01-tag3-groth16-v0`.
- Wire the accepted adapter for the current source-level `gnarkProof:324` plus `gnarkPublicWitness:44` payload so tag `3` can consume the selected `gnark-solana-native-proof-and-public-witness-v0` tuple as proof evidence.
- Replace custom error `14` only after positive verifier tests prove accepted proofs mutate state and invalid proofs leave accounts unchanged.

### Noir/bb.js/UltraHonk Adaptation Path

This path is not selected for C01. Reopening it would require replacing the current tag `3` target with a reviewed production verifier target or service boundary.

Required positive evidence:

- Define how `proofSystem: "noir-bb"` and `backend: "barretenberg-ultrahonk"` become production-verifiable for Solana, or explicitly change the on-chain target away from the current Groth16 tag-3 contract.
- Replace local ACIR metadata with production verifying-key evidence; `local-acir-bytecode-hash-not-production-vk` must not be promoted.
- Define the new proof byte layout, public input labels, verifier target, and acceptance tests before any receipt can claim on-chain verifier readiness.
- Preserve remote receipts as `offchain-remote-proof-artifact-only` until that production verifier evidence exists.

## H6 Circuit Change (2026-05-22)

The ActualPrivateSpend Noir circuit was updated on 2026-05-22 per
`docs/AUDIT_2026-05-22_findings.md` H6 to decompose `context_hash` in-circuit:
the circuit now takes five new private inputs
(`context_preimage_merchant_address_hi/lo`, `context_preimage_denomination`,
`context_preimage_settlement_epoch_hi/lo`) and a new
`derive_actual_private_spend_context_tag` helper asserts
`poseidon6(...preimage..., nullifier) == context_hash`. The matching
TypeScript fixture, Prover.toml, and an `invalid-context-hash-preimage`
mode landed in the same change.

Implications for C01:
- The ACIR for `vanta_private_pool_v2_actual_private_spend_entry` was
  recompiled on 2026-05-22 (`nargo compile`, workspace `nargo
  1.0.0-beta.19`). The reference `currentSourceAcirSha256` /
  `referenceCurrentSourceAcirSha256` in C01 artifact gates is
  `sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9`
  (1,840,868 bytes), while the accepted Sunspot/Gnark production route must
  use `productionSourceLineageMode: reviewed-beta18-h6-source-migration` and
  `sourceAcirSha256` / `requiredProductionSourceAcirSha256`
  `sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde`.
  The pre-H6 pin
  `sha256:fe130ad86bf0be9634404dd8b9a24bc14d28088809ffbc1ede4960dac8eb76ea`
  referred to a circuit shape that no longer exists.
- The Sunspot/Gnark trusted setup ceremony is invalidated and not yet
  re-run against the post-H6 ACIR. Any production VK candidate produced
  under the pre-H6 shape is invalidated.
- The verifier-adapter acceptance tests (valid mutation, invalid /
  wrong-public-input / wrong-VK no-mutation) must use proofs generated
  from the post-H6 circuit. The local-unsafe Sunspot harness lane
  needs the same source-update + rebuild.
- The off-circuit rail (`src/privacy/actualPrivateTransactionRail.ts`)
  currently still constructs `context_hash` as a SHA-256 receiptCommitment;
  see the TODO at the top of that file. Live proof flows do not work
  until that rail is wired to Poseidon6 with the preimage fields.

The C01 candidate packet remains
`blocked-selected-groth16-tag3-solana-v0-production-evidence` for the
reason "H6 circuit shape changed; pre-H6 production evidence is
invalidated and post-H6 ceremony/adapter evidence does not yet exist."

## Decision Gate

Do not mark C01 verified-local, production-ready, or `solana-c01-groth16-verifier-ready` until the selected backend has the matching proof format, verifying-key commitment, verifier adapter, positive tests, SBF/live evidence, and audit/reviewer acceptance.

The next implementation after this selection should produce the Groth16 production proof-format artifact and production verifying-key hash for `vanta_private_pool_v2_actual_private_spend_entry`, then wire verifier adapter tests before replacing `ERR_PROOF_VERIFIER_NOT_WIRED` for any accepted path.

## Reviewer Commands

```bash
npm run zk:c01-onchain-proof-boundary-check
npm run zk:c01-verifier-backend-contract-check
npm run zk:c01-production-verifier-backend-candidate-check
npm run zk:c01-verifier-backend-decision-check
npm run zk:c01-verifier-backend-options-check
npm run zk:c01-groth16-proof-format-candidate-check
npm run zk:c01-production-groth16-toolchain-preflight-check
npm run zk:c01-sunspot-groth16-route-check
npm run zk:c01-current-source-sunspot-compile-attempt-check
npm run zk:c01-beta18-source-migration-candidate-check
npm run zk:c01-beta18-h6-migration-probe-check
npm run zk:c01-beta18-h6-source-migration-review-check
npm run zk:c01-beta18-h6-source-review-acceptance-gate-check
npm run zk:c01-production-output-manifest-check
npm run zk:c01-deterministic-production-artifact-build-check
npm run zk:c01-sunspot-groth16-dev-probe-check
npm run zk:c01-sunspot-gnark-artifact-acquisition-check
npm run zk:c01-production-verifier-artifact-request-check
npm run zk:c01-production-artifact-acceptance-gate-check
npm run zk:c01-production-verifying-key-candidate-check
npm run zk:c01-public-witness-binding-check
npm run zk:c01-sbf-live-lineage-candidate-check
npm run zk:c01-sbf-live-lineage-acceptance-gate-check
npm run zk:c01-audit-reviewer-acceptance-gate-check
npm run zk:c01-verifier-evidence-closure-gate-check
npm run zk:c01-external-review-handoff-check
npm run zk:c01-verifier-adapter-test-candidate-check
npm run zk:c01-verifier-adapter-seam-check
npm run zk:c01-positive-proof-verified-claim-gate-check
npm run zk:c01-verifier-key-registry-check
npm run private-pool-v2:c01-sbf-verifier-cpi-rejection-check
npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check
npm run private-pool-v2:proof-backend-boundary-check
npm run private-pool-v2:remote-proof-artifact-boundary-check
```

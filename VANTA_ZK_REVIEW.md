# Vanta ZK / Shielded Pool Review

**Reviewer:** Claude (Cowork mode)
**Date:** 2026-05-09
**Scope:** ZK / shielded pool surface — `src/zk`, `src/privacy/privatePoolV2*`, `zk/noir/*`, `programs/vanta_private_pool_v2_spend`, plus the crypto modules used by the shield lane (`vantaShieldViewingKey.ts`, `ownerRecoveryPayloadCrypto.ts`, `privateVaultCrypto.ts`).
**Out of scope:** operator HTTP server, Pay product surfaces, frontend UX, infra/deploy scripts.
**Method:** static read of the repo + cross-referencing against `SECURITY_LIMITATIONS.md`. Historical live-site probing was initially blocked; the 2026-05-14 follow-up verified the public website deploy for commit `7635c9b` while preserving the no-live-SBF/no-proof-verifier/no-production-privacy boundary.

---

## Codex current local state - 2026-05-10

This review is now an active feedback-loop document, not only a point-in-time audit. The current branch has locally remediated several original findings while preserving the beta/non-production truth. The machine-readable handoff ledger for stable finding IDs, status, evidence, residual risk, Lumi hygiene, and stale-control is `VANTA_ZK_REVIEW.findings.json`, guarded by `npm run zk:review-findings-ledger-check` and included in `npm run zk:review-guards-check`. For a tighter ZK feedback-loop handoff that does not run the full audit package, use `npm run zk:feedback-loop-check`.

| Area | Current local state | Guard |
| --- | --- | --- |
| Solana spend authority/root history/nullifier/output-record PDAs | Spend evidence writes require the initialized operator authority signer; init is one-time, pool state binds the initialized nullifier/output-index/root-history accounts, spends reject unregistered accepted roots, replay truth now uses a deterministic nullifier marker PDA, and output evidence writes use deterministic output-record PDAs instead of fixed-capacity output slots. A source-only `TAG_REGISTER_PROVENANCED_ROOT = 4` path now creates a lineage-bound program-owned root provenance record at `["vanta2root", pool_state, acceptedRoot]`; reserved tag `3` proof-carrying spend and tag `6` Unshield preflights require that record before failing closed. Legacy tag `2` roots are not backfilled into this provenance lane. Tag `3` still only preflights the root/root-record/nullifier/output/verifier-key account contract, then fails closed with custom error `14` before proof verification or mutation; the current live builder still rejects tag `3`. The local SBF ABI has been rebuilt for this source and can be cited as local bytecode evidence only; reviewed mainnet evidence remains blocked until redeploy, reinit, and live verification. | `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`; `npm run private-pool-v2:root-provenance-check`; `npm run private-pool-v2:contract-check`; `npm run zk:c01-onchain-proof-boundary-check`; `npm run private-pool-v2:sbf-abi-status`; `npm run private-pool-v2:sbf-abi-check` |
| Actual-private Solana relayer byte binding | Serialized Private Pool v2 actual-private spend transaction bytes now decode to a single v0 spend instruction and are checked against expected public inputs plus the eight-account Solana spend refs, including derived nullifier-marker and output-record PDAs, before live signing/submission. Service-network and operator handoffs preserve expected bindings, and unshield cannot reuse the Send spend-byte path. | `npm run private-pool-v2:solana-spend-transaction-builder-check`; `npm run private-pool-v2:solana-relayer-submission-check`; `npm run private-pool-v2:service-network-check`; `npm run private-pool-v2:protocol-client-check` |
| Mainnet status/env truth surfaces | Mainnet private-settlement status, readiness checks, production service contract/topology, deployment manifest, operator packet, production setup docs, runbook, and `.env.example` now name the current output-record PDA eight-account spend ABI and require `VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_ROOT_HISTORY` alongside the spend program/pool/nullifier/output/authority refs. | `npm run mainnet:private-settlement-check`; `npm run mainnet:readiness-check`; `npm run mainnet:service-contract-check`; `npm run mainnet:service-topology-check`; `npm run mainnet:deployment-manifest-check`; `npm run mainnet:actual-private-settlement-operator-packet-check`; `npm run mainnet:production-service-setup-check`; `npm run operator:runbook-check` |
| Canonical note membership | Placeholder additive note/tree hashing was replaced with Poseidon note, leaf, and node hashing plus direction/leaf-index constraints; note amount limbs are now `u64` in the local circuit ABI. | `npm run zk:canonical-note-membership-check` |
| Canonical note proving commitment | `CanonicalNoteArtifacts` now carries both legacy SHA-256 display commitment and Poseidon/BN254 proof-facing `provingCommitment`; Live Shield records both and Live Send preserves the proof-facing commitment through redaction. | `npm run zk:canonical-note-proving-commitment-check` |
| Private Pool v2 entry circuits | Local fixed-depth lanes now prove input membership and path-based successor append roots for Shield, Send, Swap-to-shielded, Claim, and actual-private spend where applicable. | `npm run private-pool-v2:verify` |
| Private Pool v2 no-witness proof artifacts | Shield, Claim, Swap-to-shielded, Send, and actual-private-spend now emit local bb.js/UltraHonk fixture artifacts without witness or bytecode sidecars; artifact verifiers recompile the matching Noir circuit, check ACIR/verifying-key metadata, bind the single public-input hash label, and reject tampered proof bytes, public inputs, circuit/proof-system/backend/label relabeling, and witness aliases. Actual-private-spend and Send now also have strict local witness-input proof paths: the input builders require canonical BN254 fields, depth-20 Merkle/append paths, boolean direction bits, derived leaf indices, recomputed roots/nullifiers, unique outputs, and derived public-input hashes; the Node proof script can emit no-witness `local-bb-derived-artifact` receipts for those derived requests. Dev-only browser/Web Worker Send and actual-private-spend provers can take caller-provided compiled ACIR bytecode plus either compressed witness bytes or typed witness input, normalize witness input through the strict fixture builders, generate worker-side witnesses with NoirJS, run bb.js/UltraHonk with `threads: 1`, and return no-witness `local-bb-derived-artifact` receipts that verify against `send-public-input-hash` or `private-spend-public-input-hash`; they still do not replace the default local `mock` prover or route live Send/actual-private-spend execution. An opt-in browser-worker proof-result adapter can now wrap those Send and actual-private-spend worker artifacts into `VantaPrivatePoolV2ProofResult` values only for exact bound proof requests, requires `local-bb-derived-artifact`, rejects request transcript drift before invoking the worker client, and reuses the local bb proof-result validator. The operator no-witness route requires matching expected public-input hashes for Shield, Claim, Swap-to-shielded, Send, and actual-private-spend artifacts and rejects unbound extra `expectedPublicInputs` keys; the Shield route is read-only artifact verification only and does not append commitments, persist receipts, or accept Shield settlement. The opt-in actual-private-spend and Send local bb artifact adapter can convert verified local artifacts plus exact proof-request transcripts into `VantaPrivatePoolV2ProofResult` values with `proofSystem: "noir-bb"`, while keeping the default local prover on `mock` / `local-mock`. In production proof mode, remote-service proof artifacts hit a local production-mode verifier-handoff guard: relabelled local fixture metadata such as local verifying-key hash kinds or `local-acir-bytecode:` key ids rejects before delegation, returned remote receipts must match the submitted artifact transcript across circuit, ACIR hash, backend/runtime metadata, proof system/backend, proof bytes, public inputs/labels/commitment, and verifying-key fields, and accepted receipts are marked `offchain-remote-proof-artifact-only` with `onChainVerifierTarget: "none"`. Any `solana-c01-groth16-verifier-ready` overclaim is fail-closed unless a separate Solana tag `3` Groth16 verifier-ready evidence lane exists. The C01 adapter-test candidate remains blocked with current adapter/test refs null, so this remains local proof generation and local handoff hardening; local artifacts still reject in production proof mode and no production remote prover/verifier is proven. | `npm run private-pool-v2:local-verifier-check`; `npm run private-pool-v2:local-bb-fixture-prover-check`; `npm run private-pool-v2:actual-private-spend-witness-prover-check`; `npm run private-pool-v2:send-witness-prover-check`; `npm run private-pool-v2:browser-worker-prover-check`; `npm run private-pool-v2:actual-private-spend-browser-worker-prover-check`; `npm run private-pool-v2:browser-worker-proof-result-adapter-check`; `npm run private-pool-v2:remote-proof-artifact-boundary-check`; `npm run private-pool-v2:shield-proof-artifact-consistency-check`; `npm run private-pool-v2:shield-operator-no-witness-check`; `npm run private-pool-v2:claim-proof-artifact-consistency-check`; `npm run private-pool-v2:claim-operator-no-witness-check`; `npm run private-pool-v2:swap-to-shielded-proof-artifact-consistency-check`; `npm run private-pool-v2:swap-to-shielded-operator-no-witness-check`; `npm run private-pool-v2:send-proof-artifact-consistency-check`; `npm run private-pool-v2:actual-private-spend-proof-artifact-consistency-check`; `npm run private-pool-v2:send-operator-no-witness-check`; `npm run private-pool-v2:actual-private-spend-operator-no-witness-check`; `npm run private-pool-v2:proof-backend-boundary-check`; `npm run zk:c01-production-verifier-backend-candidate-check`; `npm run zk:c01-verifier-adapter-test-candidate-check` |
| Active proving-lane Merkle depth | Private Pool v2 Shield/Send/Swap-to-shielded/Claim/actual-private-spend and Private Core Send/Swap/Unshield now use `MERKLE_DEPTH = 20`; fixture builders emit 20-sibling paths with sparse depth-20 trees; the depth lint now fails closed if active lanes regress to depth 3. | `npm run zk:circuit-soundness-lint`; `npm run private-pool-v2:shield-circuit-check`; `npm run private-core:check` |
| Private Pool v2 Shield/Send/Claim amount range | Shield, Send, and Claim raw amount witnesses are constrained as `u128`; Send also proves a private economics commitment and checks `input_amount == recipient_amount + change_amount`; Claim relayer-fee is constrained as `u128`. | `npm run private-pool-v2:shield-circuit-check`; `npm run private-pool-v2:send-circuit-check`; `npm run private-pool-v2:claim-circuit-check` |
| Private Core tree hashing | Single-field membership paths and standard Poseidon node hashing are now guarded across send/swap/unshield. | `npm run zk:merkle-node-hash-contract-check` |
| Private Core Send/Swap/Unshield amount range | Send, Swap, and Unshield amount limbs are now `u64` in the local Noir lanes, with negative fixtures for out-of-range witnesses. | `npm run private-core:send-check`; `npm run private-core:swap-check`; `npm run private-core:check` |
| Private Core Send/Swap context-tag split | Send and Swap now use the same zero-high-limb context-tag encoding as Unshield; invalid split fixtures prove `context_tag_hi = 1` plus adjusted low limb is rejected, and the soundness lint rejects additive `hi + lo` context-tag comparisons. | `npm run private-core:send-check`; `npm run private-core:swap-check`; `npm run zk:circuit-soundness-lint` |
| Private Core single-note legacy-lane freeze | `vanta_private_core_single_note_send`, `swap`, and `unshield` remain active-v0 legacy compatibility lanes for current Private Core flows. Operator contract/status surfaces now expose the circuit family as `active-v0-legacy` and `deprecated-for-new-architecture`, with `vanta_private_pool_v2_entry` named as the replacement family for new architecture work. | `npm run private-core:single-note-freeze-check`; `npm run private-core:contract-smoke`; `npm run zk:review-guards-check` |
| Private Core Unshield proof-owner binding | Unshield now binds a Poseidon proof-owner key derived from the owner secret into the proving note commitment/nullifier while preserving source-layer X25519 owner auth as an off-circuit/operator precheck. | `npm run private-core:check`; `npm run private-core:prove`; `npm run private-core:consume-check` |
| Unshield custody truth surfaces | Unshield trust-contract and trust-packet surfaces now name the current release model as `operator-keypair-public-exit`, keep production custody false, expose `program-owned-vault-pda-not-deployed`, `tag-unshield-reserved-fail-closed`, and `tag-unshield-token-cpi-release-not-wired`, and point reviewers to the on-chain custody guard. A local source-only `TAG_UNSHIELD = 6` ABI now preflights the registered root, root-record PDA, nullifier marker, vault-authority PDA, source-only vault-asset registry, mint/token-program shape, and SPL token-account ownership, then fails closed before proof verification, nullifier consume, token/system CPI, custody transfer, or fund release. `TAG_REGISTER_VAULT_ASSET = 7` is only a disabled custody-registry scaffold with `releaseEnabled = 0`; this still does not ship program-owned vault custody or proof-verified release. | `npm run lanes:trust-contract-check`; `npm run unshield:trust-packet-check`; `npm run private-pool-v2:onchain-unshield-custody-check` |
| All-lane trust status strip | The app shell now derives a compact six-lane trust status strip from Shield, Send, Swap, Unshield, Strategy, and Pay contracts. It normalizes Pay's snake-case controls into the same claim-locked shape, keeps the beta/test-mode truth in one shared shell surface, enforces Strategy/Pay page-local claim copy from their contracts, and browser-checks the strip across Shield, Send, Swap, Unshield, Strategy, and Pay routes plus 1440/768/390/360/320 px overflow and header-overlap cases. | `npm run lanes:trust-contract-check`; `npm run truth:privacy-claim-gate`; `npm run product-ui:browser-check`; `npm run build` |
| Public anonymity-depth disclosure | The homepage now shows a truthful local anonymity disclosure sourced from `ops/mainnet/private-pool-v2-anonymity-set.evidence.json`: readiness is blocked, current reviewed spend evidence reports `2` distinct commitments toward the `1,024` minimum, and the copy says Vanta does not claim live anonymity or production-private mainnet settlement yet. This is not a live depth oracle and not shared-tree/audit acceptance. | `npm run private-pool-v2:public-depth-disclosure-check`; `npm run landing:anonymity-disclosure-check`; `npm run landing:browser-check`; `npm run truth:privacy-claim-gate` |
| Public audit discovery | `/.well-known/vanta-audit.json` now exists as a refs-only reviewer and counterparty discovery surface pointing to the audit package, security limitations, finding ledger, C01 verifier-backend decision, the C01 verifier candidate evidence packet, the blocked C01 verifier adapter acceptance-test candidate packet, intake templates, current public-depth blocker evidence, and the website deployment receipt for commit `7635c9b`. It preserves `auditClaimAllowed: false`, `productionReady: false`, `mainnetReady: false`, and `liveDeploymentVerified: false`; the website is live, but private-settlement/SBF/verifier deployment evidence remains blocked. It is not an audit report, third-party acceptance, production readiness, or private-settlement live evidence. The R16 positive proof-verified claim gate adds a blocked packet requiring tag-3 valid-proof success and matching no-mutation evidence before proof-verified spend wording can unlock. | `npm run public:audit-discovery-check`; `npm run audit:package-check`; `npm run zk:c01-production-verifier-backend-candidate-check`; `npm run zk:c01-verifier-adapter-test-candidate-check`; `npm run zk:c01-positive-proof-verified-claim-gate-check`; `npm run truth:privacy-claim-gate`; `npm run build` |
| Route fallback truth surface | Unknown site, docs, and app routes now render a truthful recovery surface instead of silently redirecting into `/app/shield` or `/docs`. App-scoped unknown routes keep the product shell and trust status visible; docs-scoped unknown routes keep the docs shell visible; the copy says nothing moved and production privacy is not enabled. A route error boundary resets by path and shows claim-safe recovery links. | `npm run route:fallback-browser-check`; `npm run product-ui:browser-check`; `npm run docs:browser-check`; `npm run mobile:browser-check`; `npm run performance:route-code-split-check`; `npm run truth:privacy-claim-gate`; `npm run build` |
| Feedback guard hardening | The ZK feedback loop now has stronger source-of-truth guards: route fallback has a cheap source-only contract guard wired into `truth:privacy-claim-gate`; the findings ledger checks repo-local refs and scans both the ledger and review doc for secret-shaped values or structured leak fields; public audit discovery validates ref-like fields schema-wide; stale browser-prover and push/live wording was corrected. | `npm run route:fallback-contract-check`; `npm run zk:review-findings-ledger-check`; `npm run public:audit-discovery-check`; `npm run mainnet:secret-exposure-check`; `npm run truth:privacy-claim-gate`; `npm run zk:feedback-loop-check`; `npm run build` |
| Action memo privacy | Send, Swap, Unshield, SOL-Unshield, and spent-marker helpers now fail closed into v2 viewing-key AEAD; v1 plaintext parsing remains only for historical chain memos. A local Send dual-AEAD scaffold can separately seal recipient/change discovery memos and expose `sha256:` ciphertext body hashes, and the Private Pool v2 Send proof-request/circuit lane now binds recipient/change body-hash fields into the Send public-input hash. External Send remains fail-closed until recipient viewing-key exchange or view-tag/indexer discovery is wired. | `npm run actions:memo-encryption-check`; `npm run send:discovery-migration-policy-check`; `npm run private-pool-v2:send-proof-request-check`; `npm run private-pool-v2:send-circuit-check`; `npm run private-pool-v2:public-input-hash-alignment-check` |
| Owner recovery payload | X25519 + HKDF-SHA256 + XChaCha20-Poly1305 replaced the hand-rolled XOR/SHA path. | `npm run zk:owner-recovery-payload-crypto-check` |
| Owner-context recovery evidence | New live Shield/Send/Swap records persist a non-secret owner recovery evidence classification (`wallet-derived-cross-device-candidate`, `legacy-random-local-only`, `redacted-legacy-unmigratable`, or `missing-owner-context-evidence`) instead of relying on ambiguous local owner hints. Existing browser-stored evidence is sanitized into a whitelisted class/source tuple before reuse, raw recovery material is stripped, malformed `sha256:` references are rehashed, lifecycle branch summaries expose the class, and the Shield balance recovery panel explains that wallet-derived evidence is only a candidate until an import/record-source path exists. | `npm run zk:owner-context-recovery-evidence-check`; `npm run zk:review-guards-check`; `npm run shield:verify`; `npm run product-ui:browser-check` |
| Owner-context record-source import/export UX | Wallet-derived records now keep `importRequiredForCrossDevice: true` so machine-readable evidence agrees with the UI truth. A non-secret record-source packet can be exported from local Shield/Send/Swap evidence and pasted on another browser for verification, while raw owner/note/viewing material is rejected and legacy local-only records remain unpromoted. | `npm run zk:owner-context-record-source-import-check`; `npm run shield:verify`; `npm run product-ui:browser-check` |
| Owner-context legacy quarantine policy | Record-source packets now carry explicit fail-closed policy fields for legacy owner-context records: automatic migration is false, cross-device recovery is false until proved, legacy/random/redacted/missing records stay local-only, and the Shield recovery panel tells users old random-seeded browser records are not promoted by import. | `npm run zk:owner-context-legacy-quarantine-policy-check`; `npm run zk:review-guards-check`; `npm run shield:verify` |

Still not solved: on-chain proof verification/verifying-key enforcement is not wired, the new program-owned root provenance record is not proof that the root transition is correct and is not a program-owned shared tree, recipient-grade Send discovery still needs viewing-key exchange or deployed view-tag/indexer discovery, no audit has accepted the boundary, and the current local SBF binary has not been redeployed/reinitialized/live-verified for this source. Website/audit-copy deployment evidence exists for commit `7635c9b`, but live SBF, private-settlement, verifier, custody, and anonymity evidence remains blocked. Historical v1 Send plaintext remains parse-compatible but is now excluded from production privacy claims unless migrated or segregated with reviewed evidence.

---

## Critical findings

### 1. The on-chain Solana program does not verify proofs at all

`programs/vanta_private_pool_v2_spend/src/lib.rs` — and its README literally says **"no proof verification"**. The current local `process_spend` instruction takes `[1, nullifier:32, output0:32, output1:32, acceptedRoot:32, publicInputHash:32]` and records it after operator authority, account-binding, deterministic nullifier-marker PDA, and fixed-slot root-history checks. The current 161-byte spend ABI carries no proof bytes; passing proof-like fields such as `onChainVerifier`, `proofBytes`, `proofArtifact`, `verifierProgramId`, or `verifyingKeyHash` into the transaction builder, relayer, service-network submitter, or operator packet is rejected or omitted rather than silently implying verifier support. A source-only `TAG_REGISTER_PROVENANCED_ROOT = 4` path now creates a lineage-bound program-owned root provenance record at `["vanta2root", pool_state, acceptedRoot]`, and reserved tag `3` plus tag `6` preflights require that record before failing closed. Legacy tag `2` roots cannot be backfilled through tag `4`; they require migration/reinitialization if they must enter the provenance lane. A source-only `TAG_REGISTER_VERIFIER_KEY = 5` path now creates or idempotently verifies the program-owned verifier-key registry PDA at `["vanta2vkey", pool_state, verifierKeyHash]`, but this is not production verifying-key evidence. A reserved tag `3` proof-carrying spend ABI now exists in source as `[3, nullifier, output0, output1, acceptedRoot, publicInputHash, verifierKeyHash, groth16Proof]`, but it only preflights the registered-root/root-record/nullifier/output-record contract plus that verifier-key PDA and then returns custom error `14` before proof verification, account creation, nullifier/output mutation, or spend acceptance. The current transaction builder still rejects tag `3`. It checks duplicate marker reuse and account ownership/bindings on tag `1`, but there is still no Groth16/PLONK/Honk verifier, no production verifying-key acceptance, no proof that the root transition is correct, and no on-chain Merkle tree that proves the accepted root came from a real shared commitment set.

This means the on-chain "evidence" account is **not enforcing privacy or soundness**. It is a public append-only log whose integrity rests entirely on the off-chain operator deciding what to submit. Older README language that called this "anchoring private spend evidence" overstated what the program does; the current README narrows it to proof-unverified, operator-submitted metadata.

**Codex status, 2026-05-10 / refreshed 2026-05-12:** partially remediated locally for the write authority, accepted-root scaffold, root-record provenance scaffold, nullifier replay boundary, and fixed output-slot boundary. `programs/vanta_private_pool_v2_spend/src/lib.rs` now stores an operator authority during one-time init, requires the matching writable signer on spend, binds the pool to initialized nullifier/output-index/root-history accounts, adds a legacy operator-authorized `register root` instruction, adds `TAG_REGISTER_PROVENANCED_ROOT = 4` to create a deterministic program-owned root provenance record from `["vanta2root", pool_state, acceptedRoot]`, binds the supplied `previousRoot` to the existing root-history lineage, rejects spends whose `acceptedRoot` is not present in the bound root-history account, keys duplicate replay off a deterministic nullifier-marker PDA, and writes output evidence into a deterministic output-record PDA derived from `["vanta2out", pool_state, publicInputHash]`. The reserved proof-carrying spend and Unshield preflight paths require the root-record PDA before failing closed. The transaction builder/relayer/operator surfaces still expect the current eight-account tag `1` spend ABI: pool, read-only nullifier-set header, output index, root history, nullifier marker, output record, writable operator signer, and System Program. This closes the stale "callable by any wallet", "any unregistered root", fixed/linear nullifier-scan, and fixed-capacity output-slot shapes for local source, and adds a program-owned provenance spine for future proof paths. It still does not add on-chain proof verification, verifying-key hash enforcement, proof-backed root transition correctness, a program-owned Merkle tree, production soundness, redeployed/reinitialized mainnet program evidence, or live verification.

Guard note: `npm run zk:c01-onchain-proof-boundary-check` and `npm run private-pool-v2:root-provenance-check` now fail closed if C01 stops saying `partial`, if the review/ledger stop naming the missing verifier/key/tree/no-proof-bytes boundary, if the provenanced-root source-only truth disappears, if the reserved proof-carrying ABI stops being fail-closed, if the transaction builder/relayer/service-network/operator-packet surfaces stop rejecting or omitting proof-like fields for the current no-verifier ABI, or if verifier-like artifacts appear without replacing this negative guard with positive proof-verifier and program-owned-tree checks.

### 2. The on-chain program is trivially DoS-able

Before the local authority/root-history/nullifier-PDA hardening, any wallet could call `process_spend` with any random 32-byte nullifier and permanently consume one slot in the fixed-size `nullifier_set` account. Current local source gates spend writes behind the initialized operator authority and bound child accounts, keeps the legacy `nullifier_set` as a read-only namespace/header account, and moves duplicate replay truth to a deterministic PDA marker derived from `["vanta2nul", pool_state, nullifier]`.

The previous duplicate-detection loop was O(n) (`for slot in nullifier_slots(...)`). The current local source no longer scans or appends the fixed nullifier set on spend; it creates or verifies the PDA marker and rejects duplicate marker reuse. The remaining risk is no longer fixed/linear nullifier lookup in source, but that this ABI is local-only until the SBF binary is rebuilt and redeployed, and the broader tree/root/proof design is still scaffolded.

**Codex status, 2026-05-10 / refreshed 2026-05-12:** remediated locally at the source/contract/harness level for the nullifier lookup and output-record storage shapes. The unauthenticated public slot-fill path is gated by the initialized operator signer, reinitialization is rejected, mixed account triplets are rejected by pool-state child-account bindings, `process_spend` requires a writable nullifier marker PDA, a writable output-record PDA, and the System Program account, and duplicate nullifiers/output-records reject before marker/count mutation. Guards: `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `cargo check --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml --features invariant_test`, `npm run private-pool-v2:solana-spend-transaction-builder-check`, `npm run private-pool-v2:solana-spend-transaction-check`, `npm run private-pool-v2:solana-relayer-submission-check`, `npm run private-pool-v2:anonymity-set-metrics-check`, `npm run private-pool-v2:contract-check`, `npm run private-pool-v2:sbf-abi-check`, `npm run private-pool-v2:crucible-check`, `npm run build`, and `git diff --check`. Residual caveat: the active-release Solana toolchain now rebuilds fresh local SBF bytecode for the eight-account output-record PDA ABI, but this remains local bytecode evidence only. It is not redeployed/reinitialized live program evidence and not proof-verifier enforcement.

**Recommended fixes** for a v2 spend program before any real deployment:

- Preserve the initialized operator/authority signer boundary and keep reviewed mainnet evidence blocked until the current ABI is rebuilt, redeployed, and reinitialized.
- Commit a verifying-key hash and verify a real proof against `publicInputHash` in-program (or via a dedicated verifier program / Light-Protocol-style verifier).
- Treat a proof-carrying spend as a new ABI, not an extra builder field; keep `proofBytes`, `proofArtifact`, and `verifyingKeyHash` rejected by live submitter surfaces until a verifier instruction and account layout exists. The reserved tag `3` ABI may preflight the future account contract, but it must keep returning custom error `14` before proof verification, account creation, nullifier/output mutation, or spend acceptance until the verifier is actually wired.
- Replace the operator-fed fixed-slot root-history scaffold with proof-backed program-owned tree state so a forged `input_root` from the proof can't be slipped in.
- Rebuild and redeploy the current PDA-keyed nullifier-marker/output-record ABI before citing live replay or output evidence; keep `private-pool-v2:sbf-abi-check` as the fail-closed gate.

### 3. `canonical_note_membership` circuit is non-cryptographic placeholder code

`zk/noir/canonical_note_membership/src/main.nr`:

```rust
fn hash_note(...) -> Field {
    version + asset_id_hi + asset_id_lo + ... + blinding + derivation_tag
}
fn merkle_root_from_path(...) {
    current = current + sibling + direction + leaf_index;
    // TODO: replace with Poseidon node hash
}
```

Both the "note hash" and the "Merkle node hash" are field addition. There is no preimage resistance, collision resistance, or binding. A prover can choose any commitment value they want and back-solve inputs; a prover can choose any root by choosing siblings. The comment admits both as placeholders. Either delete this circuit until it's real, or — at minimum — gate every code path that touches it behind a fail-closed check that refuses to ship if the placeholder is wired in.

**Codex status, 2026-05-09:** remediated locally. `canonical_note_membership` now uses Poseidon note hashing, Poseidon Merkle leaf/node hashing, boolean direction-bit constraints, and leaf-index binding. Guard: `npm run zk:canonical-note-membership-check`.

### 4. The "entry" circuits skip Merkle membership

The actual_private_spend circuit (`vanta_private_pool_v2_actual_private_spend_entry/src/main.nr`) is well-formed: it computes the Merkle root from the input commitment + path and asserts equality with `accepted_root`. **Good.**

But the `send_entry`, `claim_entry`, `shield_entry`, and `swap_to_shielded_entry` circuits each take `input_root` (or `output_root` / `previous_root`) as a witness without ever proving the input commitment is a member of that root. They just hash the public inputs together. Concretely in `vanta_private_pool_v2_send_entry/src/main.nr`:

- It computes `nullifier = poseidon(input_commitment, owner_secret)` — but `input_commitment` is unconstrained.
- It computes `output_root = poseidon3(previous_root, leaf, leaf_index)` — that is **not Merkle insertion**, it is a 3-input hash chain. The "tree root" updated by these circuits is meaningless as a tree.

A prover can spend any commitment they invent against any root they like. Use `vanta_private_pool_v2_actual_private_spend_entry` as the template and back-port real Merkle membership + an incremental-Merkle-tree append (e.g., zero-padded fixed-depth tree with Poseidon node hashing) into all four entry circuits.

**Codex status, 2026-05-09:** remediated locally for the fixed-depth Private Pool v2 circuit/fixture lane. Private Pool v2 `send_entry`, `claim_entry`, and `swap_to_shielded_entry` now prove input commitment membership under `input_root` and reject forged input-root fixtures; `shield_entry` now proves a path-based empty-leaf append to the output commitment; and `send_entry` / `swap_to_shielded_entry` now prove successor output roots from private append-path witnesses instead of transitional `hash_3(previous_root, output_commitment, leaf_index)` handles. Guards: `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:swap-to-shielded-circuit-check`, `npm run private-pool-v2:public-input-hash-alignment-check`, `npm run private-pool-v2:contract-check`, and `npm run zk:merkle-node-hash-contract-check`. Residual caveat: these are local Poseidon fixture/circuit append proofs, not a production shared tree, not the SHA-256 local indexer root scheme, not a populated/live/audited depth-20 anonymity set, and not on-chain verifier enforcement.

### 5. Anonymity-set depth is 3

Earlier production-shaped circuits (`vanta_private_core_single_note_*`, `vanta_private_pool_v2_*_entry`) declared `global MERKLE_DEPTH: u32 = 3;`, a maximum of **8 leaves per tree**. Tornado Cash uses depth 20–32 (1M–4B leaves). With depth 3 there is no anonymity set; even on the cleanest deployment, the recipient set is small enough to deanonymize trivially. The `canonical_note_membership` circuit was already depth 20; the active proving lanes needed the same migration.

**Codex status, 2026-05-09:** remediated locally for active fixed-depth proving lanes. Private Pool v2 Shield/Send/Swap-to-shielded/Claim/actual-private-spend and Private Core Send/Swap/Unshield now use `MERKLE_DEPTH = 20`; fixture builders emit 20-sibling paths using sparse depth-20 tree helpers; Private Core proof boundaries pad shorter source-layer proofs into the fixed depth-20 proving lane; operator contract/status expectations now report depth 20; and `npm run zk:circuit-soundness-lint` fails closed if any active Noir lane regresses to depth 3. Residual caveat: depth 20 is necessary but not sufficient for production privacy until the shared pool has real populated anonymity-set evidence, on-chain verifier enforcement, audit acceptance, and live deployment evidence.

---

## High findings

### 6. `ownerRecoveryPayloadCrypto.ts` is hand-rolled crypto

`src/zk/crypto/ownerRecoveryPayloadCrypto.ts` builds an "encrypt-then-MAC" out of XOR with `SHA-256(keyMaterial || counter)` keystream and `SHA-256(label || pubKey || recoverySecret || nonce || ciphertext)` as auth tag. Three distinct problems:

- **Not HMAC.** The MAC is raw `SHA-256` over a secret-containing message. Length extension is mitigated here only by the length-prefix on the ciphertext field; that is brittle defense compared to using `hmac` from `@noble/hashes/hmac` or — far better — the `xchacha20poly1305` AEAD that you already use in `vantaShieldViewingKey.ts`. There is no reason this module should look different from that one.
- **No key stretching.** `recoverySecret` flows in directly. If it's ever derived from a user-typed phrase, this is brute-forceable.
- **Catastrophic on nonce reuse.** XOR keystream + same key + same nonce reveals the XOR of both plaintexts. The function takes the nonce from the caller; there's no internal protection. Either generate the nonce inside `encrypt()` (like `vantaShieldViewingKey` does), or refuse to encrypt with a nonce already seen for that key.

**Fix:** replace the entire file with the same X25519+HKDF-SHA256+XChaCha20-Poly1305 pattern used by `vantaShieldViewingKey.ts`. There is no reason to maintain two crypto pipelines, and the stronger one is already in the repo.

**Codex status, 2026-05-09:** remediated locally. `ownerRecoveryPayloadCrypto.ts` now uses X25519 key agreement, HKDF-SHA256 key derivation, internally generated XChaCha nonces, and XChaCha20-Poly1305 AEAD. Guard: `npm run zk:owner-recovery-payload-crypto-check`. Residual caveat: if `recoverySecret` ever becomes user-typed/password-like input, the recovery flow still needs a password-hardening story.

### 7. PBKDF2-SHA256 at 120k iterations for the private vault

`src/privateVault/privateVaultCrypto.ts` used PBKDF2-SHA256 / 120,000 iterations. OWASP's 2023 PBKDF2-SHA256 baseline is 600,000 — and PBKDF2 is GPU-friendly. For a wallet/vault password derivation in 2026, the right primitive is Argon2id (memory-hard). Either bump iterations to ≥600k (cheap quick fix) or migrate to Argon2id with a proper `v2` envelope and decryption fallback for `v1`.

**Codex status, 2026-05-09:** quick-fix remediated locally without breaking existing vault decrypts. New private-vault encryptions now write `pbkdf2-aes-gcm-sha256.v2` envelopes with `kdfIterations: 600_000`; legacy `pbkdf2-aes-gcm-sha256.v1` payloads still decrypt with the old 120,000-iteration fallback. Guard: `npm run private-mode:contract-check`, which now round-trips a new v2 payload, decrypts legacy v1 fixtures with missing and explicit iteration metadata, rejects downgraded/mismatched iteration metadata, and checks wrong-password failure. Residual caveat: already-created v1 vault payloads remain at the old offline-guessing cost until unlocked and re-encrypted/migrated. Argon2id remains the stronger future migration target.

### 8. Local prover is not a prover, by design

`src/privacy/privatePoolV2LocalProver.ts` returns `proofBytes = SHA-256(scheme || provingKeyId || publicInputCommitment)` and `proofSystem: "mock"`. The `verify` method literally re-runs `prove` and compares hashes. The class disclaims this in `readiness().warnings` — credit there. But several upstream code paths consume its output as if it were a proof, so the trust boundary needs to be strict: any code that takes a `VantaPrivatePoolV2ProofResult` whose `proofSystem === "mock"` should refuse to advance to a settlement that touches real funds. Spot-check `vantaPrivateCoreOperatorClient.ts` and the `liveSendBridge.ts` / `liveSwapBridge.ts` paths against this rule.

**Codex status, 2026-05-09:** partially remediated for the Private Pool v2 operator/protocol boundary. Proof receipts now persist `proofSystem` and `proofBackend` through local verifier receipts, remote verifier service receipts, and protocol response types; operator status exposes `settlementPolicy.mockProofRealFundsBlocked`, `settlementPolicy.productionProofSystemRequired`, and `proofTrustBoundary` with accepted production proof systems and backends. Production startup now requires `VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services`, and real-funds / production-proof mode rejects local `proofSystem: "mock"` plus spoofed `proofSystem: "noir-bb"` receipts that still carry a local proof backend. Mainnet-adjacent actual-private relayer validation now rejects missing/mock proof systems, and SOL-to-shielded route receipts must expose an explicit proof system. The Jupiter SOL-to-shielded adapter now treats mock-proof acceptance as an explicit local/mock execution-mode choice, rejects remote `proofSystem: "mock"` receipts in live mode, and preflights the remote Private Pool proof-trust boundary before signing a live Jupiter swap. Guards: `npm run private-pool-v2:mock-proof-boundary-check`, `npm run private-pool-v2:proof-backend-boundary-check`, `npm run swap:jupiter-sol-to-shielded-adapter-check`, and `npm run swap:capability-check`. This does not replace the mock prover or make the lane live-funds ZK-ready; it makes mock proofs explicit local/no-real-funds evidence only.

**Codex status, 2026-05-10:** partially remediated further for the Private Pool v2 Send proof-artifact lane. The current local Send proof-artifact pass adds a no-witness operator verification route and focused artifact consistency guards, so Send artifacts can be checked without handing private witness material to the operator. The guard now rejects witness/source sidecars, witness aliases such as `witness`, `privateInputs`, `private_inputs`, and `noteSecret`, malformed proof hex, extra public inputs, tampered proof/public-input material, tampered local ACIR bytecode metadata, relabelled `remote-service` artifacts, and all production proof-mode requests to this local-only route. Guards: `npm run private-pool-v2:send-proof-artifact-consistency-check`, `npm run private-pool-v2:send-operator-no-witness-check`, and `npm run send:verify`. This still does not replace the mock/local prover boundary or make Send production-private.

**Codex status, 2026-05-11:** partially remediated further for the remote-services proof-boundary client. The remote prover client now rejects remote responses that return `proofSystem: "mock"` or any non-`remote-service` proof backend instead of normalizing them into production-looking remote proof metadata. Remote proof verification and verifier acceptance also reject local proof backends before sending, and remote proof calls reject witness sidecars such as `witnessPackage` / `noteSecret`. Guards: `npm run private-pool-v2:remote-services-check`, `npm run private-pool-v2:proof-backend-boundary-check`, `npm run private-pool-v2:mock-proof-boundary-check`, and `npm run private-pool-v2:protocol-client-check`. This still does not wire a real prover/verifier or make the role-service harness production ZK evidence.

---

## Medium findings

### 9. `membership_path_hi + membership_path_lo` adds no security

In `vanta_private_core_single_note_send/src/main.nr` and the swap variant, the sibling at each level is computed as `let sibling = membership_path_hi[i] + membership_path_lo[i];`. Many `(hi, lo)` pairs collapse to the same sum, so the split contributes nothing — it just doubles the witness size and adds surface area for a future bug. Either make `hi`/`lo` mean something (e.g., bit-decomposed with range checks) or use a single `Field` per level.

**Codex status, 2026-05-09:** remediated for `vanta_private_core_single_note_send`, `swap`, and `unshield` by replacing split `membership_path_hi` / `membership_path_lo` witnesses with a single `membership_path: [Field; MERKLE_DEPTH]`. The TypeScript witness builders now project source-layer 32-byte siblings into one proving-lane field with Poseidon before Merkle parent hashing.

### 10. Including `is_current_right` in `hash_merkle_node` is non-standard

`hash_merkle_node(left, right, is_current_right)` mixes the path bit into the parent hash. Once you separately enforce direction-correct ordering (which the code does via the `if is_current_right == 1`), the bit doesn't need to enter the hash. Including it changes the meaning of "tree root" — node at position `(L, R)` produces a different parent depending on whether the prover claims to be the left or the right child during the proof. This is unusual enough that I'd recommend either removing the bit from `hash_merkle_node` (matching standard incremental Merkle trees) or documenting why it's there and making sure the off-chain indexer matches bit-for-bit.

**Codex status, 2026-05-09:** remediated for `canonical_note_membership`, all Private Pool v2 entry circuits, and the Private Core single-note send/swap/unshield circuits by standardizing node hashing on `hash_2(left, right)` / `poseidon2([left, right])`. Direction bits now only select ordering and compute leaf-index consistency.

### 11. Off-chain nullifier replay guard relies on Node single-threading for atomicity

`src/privacy/nullifierReplayGuard.mjs` is correct under Node's event loop, but the comment around `productionReady: false` is right — for the Postgres adapter (`postgresNullifierReplayStore.mjs`), reservation must use `INSERT ... ON CONFLICT DO NOTHING RETURNING *` inside a transaction to be safe under concurrency, not a separate `SELECT` then `INSERT`. If the production guard is the source of truth (because the on-chain program isn't, see item 1), this race becomes the actual double-spend boundary.

**Codex status, 2026-05-09:** remediated for the durable Postgres operator store. `postgresNullifierReplayStore.mjs` now exposes `reservationMode: "postgres-transactional-insert-on-conflict"`, checks out a dedicated `pg.Pool` session when available, wraps reservation and acceptance mutation in `BEGIN` / `COMMIT` / `ROLLBACK`, and keeps duplicate classification reads on the same transaction client. `scripts/check-vanta-postgres-nullifier-replay-store.mjs` now asserts transaction markers, rollback/release behavior, pooled-client use, duplicate concurrent reservation behavior, idempotent duplicate requests, request-id conflicts, and the store's explicit global-nullifier uniqueness. Operator status surfaces the reservation mode and uniqueness scope while keeping `productionReady: false`; `npm run nullifier:replay-guard-check`, `npm run private-pool-v2:verify`, and `git diff --check` passed locally. No live deployment evidence was refreshed in this pass.

### 12. Shield circuit reveals economics in public inputs

`vanta_private_pool_v2_shield_entry/src/main.nr` exposes `source_mint`, `target_mint`, `target_asset_id`, `amount` in the public input bag. The README and `SECURITY_LIMITATIONS.md` already say shield isn't economic-private. The recommendation is to add a "committed shield" mode where the proof binds `economics_commitment = poseidon(asset, amount, blinding)` and the raw fields stay in the encrypted memo, mirroring how the send/swap/unshield entries do it.

**Codex status, 2026-05-09:** remediated for the local Private Pool v2 Shield circuit/request/operator boundary. `zk/noir/vanta_private_pool_v2_shield_entry/src/main.nr` now computes and asserts a private Poseidon economics commitment from source mint, target mint, target asset, amount, and blinding, then binds only that commitment plus owner/route/tree/output/root fields into the Shield public-input hash. The TS fixture/proof-request lane now uses hidden-economics sentinels, rejects blank economics commitments, includes an invalid-economics-commitment Noir fixture, and checks public-input hash alignment. The committed Shield protocol endpoint now builds through `createVantaPrivatePoolV2ShieldProofRequest` instead of an ad hoc hidden-economics request, and the typed client/protocol checks compare the expected local public-input commitment when tree witnesses are supplied. Operator/status/docs remain beta-truthful: `productionReady`, `privacyClaimAllowed`, `productionPrivateReady`, and current verified production privacy flags stay false, and operator/capability paths still carry locally generated commitment handles unless callers supply circuit-aligned field commitments. No live deployment evidence was refreshed in this pass.

### 13. Frontend exposes operator tokens through `VITE_*` envs

`SECURITY_LIMITATIONS.md` already calls this out: "any `VITE_...` token bundled into the app is suitable only for local or controlled test environments". Worth one more look — anything matching `VITE_OPERATOR_*` that ships in the production bundle should be removed before any mainnet operator action. A grep through the bundled JS at `vantaprivacy.xyz/assets/*.js` would be the next step (couldn't do from this environment — egress blocked).

**Codex status, 2026-05-09:** repo-local guard added for the production bundle. The browser swap route no longer reads `VITE_JUPITER_API_KEY`, and `npm run frontend:operator-env-exposure-check` now builds with forbidden browser-token canaries, rejects operator/auth-token/secret-shaped `VITE_...` source keys, and scans `dist/` for canary or forbidden env-key exposure. This does not prove the currently live website bundle; no live deployment probe or redeploy happened in this pass.

**Codex status, 2026-05-09:** lane trust contracts are now partially remediated locally for Shield, Send, Swap, and Unshield. The new `shieldTrustContract.ts`, `sendTrustContract.ts`, `swapTrustContract.ts`, and `unshieldTrustContract.ts` expose runtime `claimControls` with `productionPrivacyClaimsLocked: true`, and the four app pages render status copy from those objects instead of free-form production privacy copy. Guard: `npm run lanes:trust-contract-check`, now included in `npm run truth:privacy-claim-gate`.

**Codex status, 2026-05-12:** extended locally into a shared six-lane app-shell status surface and page-local Strategy/Pay claim gating. `src/trust/laneTrustStatus.ts` now normalizes Shield, Send, Swap, Unshield, Strategy, and Pay contracts into a single claim-locked status shape while preserving Pay's existing snake-case receipt privacy contract. `src/components/SystemStatusStrip.tsx` replaces the old standalone beta banner with a compact contract-derived strip that keeps all six lanes visible as `Claim locked`; Strategy and Pay now derive their page-local production-claim copy from `claimControls`; and `npm run product-ui:browser-check` now verifies the strip on Shield, Send, Swap, Unshield, Strategy, and Pay routes plus narrow mobile overflow/header overlap cases. This is UI and guard truth-surfacing only; it does not unlock production privacy claims or live deployment evidence.

---

## What's actually good

- `src/solana/vantaShieldViewingKey.ts` is textbook: X25519 + HKDF-SHA256 + XChaCha20-Poly1305 with random 24-byte nonce. **This is the template the rest of the crypto in the repo should be modeled on.**
- `vanta_private_pool_v2_actual_private_spend_entry/src/main.nr` is a real ZK circuit: real Poseidon, real Merkle membership check, real direction-bit-to-leaf-index check, public-input hash binding. The code shape proves the team can write circuits correctly when they choose to.
- `SECURITY_LIMITATIONS.md` is the most honest crypto-project security doc I've read on a project not yet audited. The repo's own readiness commands are largely fail-closed against the gaps above. The framing ("alpha", "not audited", "not mainnet ready") is appropriate. The work below is to make the code match that framing — i.e., refuse to *enable* live-funds paths until items 1–5 are fixed.

---

## Recommended order of operations

The prior feedback loops moved several early items from "recommended" to "locally guarded." From here, the highest-leverage order is:

1. **Keep the Solana authority boundary guarded and redeploy/reinit before citing live evidence.** The local branch has the signer gate, but the reviewed mainnet spend-program evidence is pre-authority-ABI and must remain blocked.
2. **Keep Merkle depth >=20 guarded across active proving lanes and fixtures.** The active Private Pool v2 and Private Core lanes now use depth 20 locally; keep `npm run zk:circuit-soundness-lint` and the focused circuit checks as fail-closed regression gates.
3. **Keep amount range constraints guarded while the proof lanes mature.** Canonical note membership, Private Pool v2 Shield/Send/Claim, and Private Core Send/Swap/Unshield now use typed amount ABIs with negative range fixtures; future lanes must keep this linted discipline before making production amount-proof claims.
4. **Finish recipient-grade memo/discovery semantics.** New Send/Swap/Unshield/SOL-Unshield action memos now fail closed into v2 viewing-key AEAD, external Send v2 now fails closed until recipient viewing-key exchange is wired, and a local Send dual-AEAD scaffold can separately seal recipient/change discovery memos with ciphertext body hashes. Recipient viewing-key exchange or view-tag/indexer discovery, production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces, and old v1 chain-history migration remain open.
5. **Rebuild/redeploy the Solana PDA-nullifier ABI before citing live replay evidence.** The local source now uses a deterministic nullifier marker PDA for O(1) duplicate rejection, but reviewed mainnet/SBF evidence is stale until rebuilt and redeployed.
6. **Wire real on-chain proof verification and replace the root-history scaffold with proof-backed tree state.** The local branch now has operator-authorized fixed-slot root-history rejection, but the bigger production piece remains: embed a Groth16/Honk verifier or CPI into a verifier program, commit the verifying-key hash, and make accepted roots come from program-owned shared tree state rather than an operator-fed list.

---

---

# Shield Lane — Deep Dive

This section walks the shield happy-path end-to-end, names each gap, and lays out a concrete build plan to turn shield from "custodial deposit + private side-database" into a real shielded-pool deposit lane.

## How shield works today

The trace, from the user clicking *Shield* to the final state:

1. **UI / wallet selection.** `src/solana/shieldAssetCapability.ts` decides one of four modes for the source asset: `direct-native-sol`, `direct-configured-token`, `route-to-configured-shield-token`, or `unsupported`. The "configured shield assets" come from `src/solana/shieldConfig.ts` (USDC, USDT, BONK, JUP, etc.) — each with a `mintAddress` and a `vaultOwner` resolved from `VITE_VANTA_MAINNET_VAULT_OWNER` or per-token env vars.
2. **Vault owner resolution.** `src/solana/userVaultOwner.ts` now either uses an explicitly configured `VITE_VANTA_MAINNET_VAULT_OWNER` or derives a blocked PDA preview from `VITE_VANTA_VAULT_DERIVATION_PROGRAM_ID` with seeds `["vanta", "shield-vault", walletPubkey]`. If no vault owner env is set, live deposits remain unavailable; the previous hard-coded regular-wallet fallback has been removed locally.
3. **On-chain transfer.** `src/solana/splShieldTransfer.ts` builds a plain SPL `transferChecked` from the user's ATA to the vault owner's ATA (or a `SystemProgram.transfer` for native SOL). User signs in their wallet. **There is no Vanta program in the loop here** — this is a regular Solana token transfer to a custodial address.
4. **Local note recording.** Once the deposit confirms, `src/zk/liveShieldBridge.ts:recordCanonicalShieldFromLiveShield` runs in the browser:
   - Creates a `CanonicalNoteV1` (asset, amount, ownerPublicKey, creationHint with depositSignature) via `src/zk/canonicalNote.ts`.
   - Generates `recoverySecret = randomHex32()` client-side. **There is no backup.**
   - Derives a SHA-256 commitment via `deriveCanonicalNoteArtifacts`.
   - Inserts the commitment into `AppendOnlyShieldedState` (a hash-chain, not a Merkle tree — see `src/zk/shieldedState.ts:deriveShieldedStateRoot`).
   - Persists the record list to `localStorage` under key `vanta.zk.phase1.live-shield-records.v1`.
5. **The Noir circuit is not executed.** `zk/noir/vanta_private_pool_v2_shield_entry/src/main.nr` exists and has fixtures, but no runtime path turns a live SPL deposit into a Noir-witnessed proof. The `src/privacy/privatePoolV2LocalProver.ts` is wired into protocol-shaped paths, but it returns a SHA-256 of the request bytes — not a real proof.
6. **The Solana program is not invoked.** `programs/vanta_private_pool_v2_spend` currently has a source-only local ABI for `TAG_INIT = 0`, hash-only `TAG_SPEND = 1`, legacy operator root registration `TAG_REGISTER_ROOT = 2`, fail-closed proof-carrying spend preflight `TAG_SPEND_WITH_PROOF = 3`, lineage-bound root provenance `TAG_REGISTER_PROVENANCED_ROOT = 4`, and fail-closed Unshield preflight `TAG_UNSHIELD = 6`. **There is still no shield instruction.** Even if there were, see items 1 and 2 in the main audit: the current local source has an operator-authority signer gate for spend, tag `3` returns custom error `14` before proof verification or mutation, tag `6` returns custom error `15` before release, the reviewed/live SBF evidence is stale, and the program still performs no production proof verification.

## What that adds up to

The shield lane today is, in plain terms:

> *A custodial SPL token transfer to an operator-controlled wallet, plus a browser-localStorage list of "private notes" that are only meaningful to the same browser that wrote them.*

The cryptographic objects that exist (canonical-note SHA-256 commitments, the Noir Poseidon circuits, the `vantaShieldViewingKey.ts` AEAD memos, the SHA-256 committed-settlement domain-tag scheme in `vantaShieldCommittedSettlement.ts`) are **disconnected**. They do not feed into a single end-to-end pipeline. None of them are anchored on-chain. None of them constrain what the operator can do with custodied funds.

This isn't a bug in any single file — it's the consequence of building each layer in isolation. The fix is to define one canonical shape for a shielded note and force every layer (circuit, on-chain program, off-chain indexer, browser client) to speak that shape.

## Trust assumptions to be honest about

- **The vaultOwner is custodial.** Whoever holds its private key can transfer the deposited funds anywhere. In the configured mode, that's a single wallet address. In the PDA mode, that's whatever program owns the PDA — and the source for that program is not in `programs/`.
- **Shield gives no privacy from the operator.** The operator can see (a) the depositor wallet, (b) the deposit amount, (c) the deposit asset, (d) the timing. The localStorage commitment is private to the user, but a chain observer can correlate it 1:1 with the deposit signature.
- **Shield gives no privacy from a chain observer.** Same reason. Public Solana transfer to a known vault is a public event.
- **There is no anonymity set.** No two users' shield commitments ever appear in the same on-chain tree, because there is no on-chain tree.
- **A user who clears their browser data loses access.** Recovery requires either a user-typed passphrase or a second-factor key — neither is implemented for live-shield notes today.

## What "shield actually works" needs to mean

Pick one of these as the concrete v1 target before building. They're not equivalent.

**Target A — "Real shielded pool, single asset, no swap."**
- One on-chain program that owns the vault. Funds enter via deposit, leave via unshield-with-proof. The operator never touches keys.
- One shared incremental Merkle tree of depth ≥20 over Poseidon. Every shield appends, every unshield consumes, every send/swap stays inside.
- Real Groth16 / UltraHonk proofs verified on-chain.
- Anonymity set is everyone using the pool for that asset.

**Target B — "Custodial mixer, real ZK off-chain, no on-chain verifier."**
- Operator still custodies funds, but maintains an off-chain Merkle tree and runs real proof verification before honoring withdrawals. Proofs are public and auditable; an external watcher can prove operator misbehavior post-hoc.
- Privacy from chain observers, not from operator.
- Strictly weaker than A, but a coherent product if explicitly framed.

**Target C — "Per-user encrypted notebook, no anonymity set."**
- Effectively what's deployed today. Honest framing: "your asset is held by Vanta; we keep an encrypted memo on chain so you can re-discover it from any device." This is a custodial wallet with backup, not privacy.

The current code is a confused mix of A's circuit shapes, B's operator-routed protocol, and C's actual deployed behavior. **The single most leveraged thing you can do is pick one** and mark every code path that doesn't fit it as either "advance to target" or "delete".

The rest of this document assumes you pick **Target A** because it is the only one of these that justifies the word "privacy" in the product name.

---

## Concrete build plan for Target A

Six workstreams. Numbered in the order I'd execute them.

### W1. Lock the note schema

This is the cheap upfront step that prevents every other layer from drifting.

A canonical Vanta note is one record:

```text
note := (asset_id, amount, owner_pubkey, blinding, derivation_tag)
```

- `asset_id`: 32-byte canonical asset id. For Solana SPL: `poseidon2([mint_high_128bit, mint_low_128bit])`. For native SOL: a fixed sentinel.
- `amount`: little-endian u128, split into two field elements `(amount_lo, amount_hi)` for circuit compatibility (BN254 field is ~254 bits).
- `owner_pubkey`: a single field element. `poseidon2([spending_pk_x, viewing_pk_x])` over the user's two derived public keys. Don't use the Solana wallet pubkey directly — it's an Ed25519 point, not field-friendly, and using it leaks the depositor's identity to anyone with the note commitment.
- `blinding`: 32 random bytes the user keeps. Required so the same `(asset, amount, owner)` produces different commitments.
- `derivation_tag`: a label field for forward-compat (`shield`, `change`, `swap-output`, `recipient-from-send`).

```text
commitment := poseidon(asset_id, amount_lo, amount_hi, owner_pubkey, blinding, derivation_tag)
```

The local branch now computes both surfaces in `canonicalNote.ts`: a legacy SHA-256 display/audit commitment and a Poseidon/BN254 `provingCommitment` with an explicit field encoding. Keep the SHA-256 hash for diagnostic display only — never confuse it with the circuit-facing commitment or future on-chain commitment.

**Codex status, 2026-05-09:** remediated locally for the canonical-note artifact boundary. `CanonicalNoteArtifacts` now carries `provingCommitment`, `liveShieldBridge.ts` records it through the shared artifact deriver, and `liveSendBridge.ts` preserves successor proving commitments while redacting encrypted payload bytes from browser storage. Guard: `npm run zk:canonical-note-proving-commitment-check`. Residual caveat: the local browser `AppendOnlyShieldedState` still inserts the legacy SHA-256 commitment and is not the production shared Poseidon tree.

### W2. Owner key hierarchy

Today's `liveShieldBridge.ts` does `recoverySecret: randomHex32()` and the user can never recover.

Replace with:

```text
master_seed := signMessage(walletKeypair, "vanta-shield-master-seed-v1")
                  // deterministic per-wallet, recoverable from any device
spending_secret := HKDF(master_seed, "spending-v1")
viewing_secret  := HKDF(master_seed, "viewing-v1")
spending_pk     := poseidon(spending_secret)         // field element
viewing_pk      := x25519.getPublicKey(viewing_secret)  // for memo decryption
nullifier(note) := poseidon(commitment, spending_secret, pool_id)
```

Re-use `vantaShieldViewingKey.ts` verbatim for the viewing-key crypto. The "spending" half is new, but it's just a Poseidon-friendly secret and a Poseidon-derived public key — small change.

The `signMessage(walletKeypair, ...)` step is what makes recovery work: any device with the same wallet can reconstruct the master seed without backing up a separate secret.

**Codex status, 2026-05-11:** first local W2 contract landed without changing live note recording or prompting wallets for a reusable seed signature. `src/zk/ownerKeyHierarchy.ts` now defines a deterministic `masterSeed -> recoverySecret / spendingSecret / viewingSecretKey` hierarchy scoped by wallet, cluster, app domain, and hierarchy version; derives a Poseidon spending public key; derives an X25519 viewing keypair through `vantaShieldViewingKey.ts`; and combines the spending/viewing public fields into a Poseidon owner public key for `CanonicalNoteOwnerContext`. Guard: `npm run zk:owner-key-hierarchy-contract-check`, wired into `npm run zk:review-guards-check`. The guard also verifies the current wallet message-intent safety allowlist does **not** accept `shield-master-seed`, because a reusable wallet-derived seed needs its own explicit UX/safety envelope before runtime adoption. Existing Shield/Send/Swap local records still use their random per-record `recoverySecret` and are not migrated or overwritten by this slice.

**Codex status, 2026-05-11 follow-up:** the dedicated Shield key-derivation safety envelope is now defined but still dormant. `src/solana/shieldKeyDerivationIntent.ts` formats a stable non-transactional `vanta:shield-key-derivation-intent:v1` message for recoverable seed derivation, while the per-approval request id / expiry / human-approval checks stay in the safety envelope passed to `signWalletMessageIntentWithSafety`. This preserves deterministic recovery semantics without allowing page-load signing or direct `walletSession.signMessage` calls from Shield. Guard: `npm run shield:key-derivation-intent-check`, now included in `npm run shield:verify`. Runtime Shield note recording still does not use this intent until a user-facing opt-in and migration plan exist.

**Codex status, 2026-05-12 runtime adoption:** new live Shield/Send/Swap canonical records no longer mint `recoverySecret: randomHex32()` in the bridge layer. `src/solana/useVantaShieldOwnerContext.ts` now derives `CanonicalNoteOwnerContext` through the dedicated Shield key-derivation safety envelope, and `src/pages/ShieldPage.tsx`, `src/pages/SendPage.tsx`, and `src/pages/SwapPage.tsx` pass that explicit owner context into the live bridge functions before canonical note recording. `src/zk/liveShieldBridge.ts`, `src/zk/liveSendBridge.ts`, and `src/zk/liveSwapBridge.ts` now require caller-provided `ownerContext: CanonicalNoteOwnerContext`; bridge files do not call wallet signing and do not synthesize random owner recovery secrets. Shield browser persistence also redacts `ownerContext.recoverySecret` into a reference hash before localStorage, so the in-memory derived secret is not written back as a raw persisted recovery secret. Guards updated: `npm run zk:owner-key-hierarchy-contract-check` and `npm run shield:key-derivation-intent-check`, both still wired into aggregate verification. Residual caveat: this does not migrate old local records, does not make old random-seeded records recoverable, and does not yet ship a complete cross-device recovery/import UX or live deployment.

**Codex status, 2026-05-12 evidence classification:** the runtime adoption slice now has a durable non-secret evidence layer. `src/zk/ownerContextRecoveryEvidence.ts` classifies records as wallet-derived cross-device candidates, legacy random local-only, redacted legacy, or missing evidence; sanitizes existing browser-stored evidence into a fresh whitelisted shape; rejects inconsistent class/source/cross-device tuples; and rehashes malformed `sha256:` references. Live Shield/Send/Swap diagnostics and lifecycle branch summaries propagate the class/source/candidate fields, and the internal lineage branch panel plus Shield balance recovery panel surface truthful copy rather than a bare owner hint. Guard: `npm run zk:owner-context-recovery-evidence-check`, wired into `npm run zk:review-guards-check`. Strong local verification also passed `npm run shield:verify`, `npm run product-ui:browser-check`, `npm run build`, and `git diff --check`. Residual caveat: this is classification and truth-surfacing, not a legacy-record migration, not a complete second-device import flow, not pushed, and not live-verified.

**Codex status, 2026-05-12 record-source import/export UX:** the owner-context evidence machine field now matches the UX truth: wallet-derived records remain cross-device candidates, but `importRequiredForCrossDevice` stays true until a non-secret record source is imported. `src/zk/ownerContextRecordSourceImport.ts` defines a sanitized import packet for Shield/Send/Swap record evidence, rejects raw owner context/recovery/spending/viewing material plus note-secret/blinding/encrypted-payload aliases, parses/summarizes pasted packets, verifies same-wallet second-device owner-context reconstruction against imported evidence hashes, and keeps legacy/random records local-only. The Shield balance recovery panel now exports a non-secret "Record source packet" from local Shield/Send/Swap evidence and verifies a pasted packet without writing localStorage or mutating balances; viewing-key backup remains a separate control. Guard: `npm run zk:owner-context-record-source-import-check`, wired into `npm run zk:review-guards-check` and `npm run shield:verify`; browser verification passed through `npm run product-ui:browser-check`. Residual caveat: this is a local product import/export verification UX, not legacy-record migration, not viewing-key memo discovery by itself, not pushed, and not live-verified.

**Codex status, 2026-05-12 legacy quarantine policy:** the remaining local-addressable legacy-record slice is now explicit instead of implied by UI copy. `src/zk/ownerContextLegacyQuarantinePolicy.ts` classifies wallet-derived records as record-source-required and legacy/random/redacted/missing records as local-only quarantine, with `automaticMigrationAllowed: false`, `crossDeviceRecoveryAllowedNow: false`, and `productionRecoveryReady: false`. `src/zk/ownerContextRecordSourceImport.ts` now carries those policy fields inside exported/imported record-source packets and fails closed if a packet tries to promote a legacy record, flip automatic migration on, or claim production recovery. The Shield balance recovery panel shows "Legacy quarantine policy / automatic migration off" and tells users old random-seeded browser-local records stay local-only. Guard: `npm run zk:owner-context-legacy-quarantine-policy-check`, wired into `npm run zk:review-guards-check` and `npm run shield:verify`. Residual caveat: this is quarantine policy and user guidance, not recovery of old random-seeded records, not viewing-key backup, not deletion/mutation of local browser records, not pushed, and not live-verified.

### W3. The Noir shield circuit

Replace `zk/noir/vanta_private_pool_v2_shield_entry/src/main.nr`. Public inputs constrain everything; private witnesses are what the prover knows but doesn't reveal.

```rust
// Public inputs (revealed to verifier):
//   pool_id              — distinguishes asset/version pools
//   deposit_asset_id     — must match the SPL mint of the deposited tokens
//   deposit_amount_lo, deposit_amount_hi — must match the deposited amount
//   previous_root        — the root before insertion (must be in recent-history set)
//   new_root             — root after insertion
//   new_leaf_index       — the position appended at
//   new_commitment       — the Poseidon note commitment
//   memo_ciphertext_hash — Poseidon hash of the encrypted memo bytes
//
// Private witnesses (hidden):
//   owner_pubkey, blinding, derivation_tag
//   merkle_path_siblings[depth], merkle_path_zero_subtree[depth]
//
// The circuit asserts:
//   1. new_commitment == poseidon(deposit_asset_id, deposit_amount_lo,
//                                  deposit_amount_hi, owner_pubkey,
//                                  blinding, derivation_tag)
//   2. The Merkle path provided is consistent with appending new_commitment
//      at new_leaf_index against previous_root, producing new_root.
//      (Standard incremental Merkle tree: the sibling at level k is either
//       the on-chain right-edge subtree OR a fixed zero-subtree constant
//       depending on the bit of new_leaf_index at level k.)
//   3. derivation_tag == DERIVATION_TAG_SHIELD
```

Use `MERKLE_DEPTH = 20`. Use `bn254::hash_2(left, right)` for node hashing — drop the `is_current_right` argument from `hash_merkle_node` (see audit item 10). Drop the `hi`/`lo` split for path siblings (audit item 9).

Note the circuit does *not* hide `deposit_amount` or `deposit_asset_id` — it can't, because the on-chain program needs to read the SPL transfer amount in the same transaction and check it. Privacy comes from the fact that nobody can correlate which `new_commitment` will later be spent.

### W4. The on-chain shield instruction

New instruction in `vanta_private_pool_v2_spend` (or a sibling program). Tag `2 — shield`. Account list:

```
0. pool_state                 (writable, program-owned)
1. tree_state                 (writable, program-owned, holds rolling roots + right-edge subtree)
2. memo_log                   (writable, program-owned, ring buffer of encrypted memos)
3. depositor                  (signer)
4. depositor_token_account    (writable)
5. vault_token_account        (writable; PDA owned by program)
6. token_mint                 (read-only, must match circuit deposit_asset_id)
7. spl_token_program          (read-only)
```

Instruction data: `[2, deposit_amount:u64, public_inputs_hash:32, proof_bytes:N, encrypted_memo:M]`.

Program logic:

1. Verify `tree_state.current_root` is the value committed in `public_inputs_hash` as `previous_root` and that `new_root, new_leaf_index, new_commitment` are also embedded.
2. Verify the proof against a hard-coded verifying key for the shield circuit (see W6).
3. CPI into the SPL token program: `transfer_checked(depositor_token_account → vault_token_account, deposit_amount, mint=token_mint)`. The signer is the depositor, not the program. (For native SOL, use `system_program::transfer` instead.)
4. Update `tree_state.current_root = new_root`, push to recent-roots ring buffer (size 64–256), increment `next_leaf_index`, update right-edge subtree.
5. Append `(encrypted_memo, new_leaf_index, new_root)` to `memo_log`.
6. Emit `ShieldEvent { commitment, leaf_index, root }` for indexers.

This eliminates custody risk: the vault is a PDA owned by the program, with no private key in the world. Funds can only leave via a verified unshield/send/swap proof (separate instructions, same shape).

### W5. The off-chain indexer / relayer

A small Node service that:

1. Subscribes to `ShieldEvent` from the on-chain program.
2. Maintains a mirror of the incremental Merkle tree so it can produce membership proofs (`leaf, leaf_index → siblings[depth]`) on demand.
3. Decrypts each memo against any registered viewing key — when a user signs in with a wallet, the client uploads `viewing_pk`; the indexer publishes a per-viewing-key memo feed.
4. Stores nothing privacy-sensitive (no spending keys, no proofs).

For Target A this can be a single replicated Postgres + websocket service. The existing `nullifierReplayGuard.mjs` is the wrong layer — that's a write-side pre-check, not an indexer.

### W6. The proof verifier on Solana

This is the hardest piece, but unavoidable for Target A.

Two real options:

- **Light Protocol's groth16-solana** verifier. Battle-tested, deployed, Solana-native. Compile your Noir circuits to Groth16 (Aztec recently regained support for this), generate a verifying key, embed its serialized form in the program, call `groth16_verify(vk, public_inputs, proof)` per shield. Compute-unit cost: ~250k CU per proof, well under Solana's 1.4M limit.
- **UltraHonk verifier on Solana.** Newer, less production-tested. Would require porting Aztec's verifier. More CU. Worth it only if you also need fast prover-side performance and want to stay on Noir's recommended backend.

Recommend Groth16 + Light for v1. Move to Honk later if circuits get bigger.

Current C01 correction: Groth16 + Light is now a blocked option, not a selected backend. The guarded decision packet is `docs/zk/c01-production-verifier-backend-decision.md`; it keeps `selectedBackend: null` while `ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json`, `ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json`, and `ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json` remain blocked. The current local proof metadata is still `local-acir-bytecode-hash-not-production-vk`, so it is not production proof-format evidence and not production verifying-key evidence.

The verifying key is a build artifact. Commit it to the repo, include its hash in the program, and have a script that fails CI if the verifying key's circuit hash drifts from the Noir build artifact in `zk/noir/vanta_private_pool_v2_shield_entry/target/*.json`.

### W7. Replace the local prover

`src/privacy/privatePoolV2LocalProver.ts` becomes a real prover backed by Barretenberg WASM (`@aztec/bb.js` or the `noir_wasm` toolchain). For the shield circuit at depth 20, browser-side proving will take ~5–30s on consumer hardware. Acceptable for a deposit flow.

For users who don't want to wait, offer a *prover relay* — they send the witness to a server which produces the proof. This is a privacy weakening (the relay sees private inputs) but acceptable as an opt-in. The shield circuit's witnesses include `blinding` and `owner_pubkey`, both of which the relay would learn — so a malicious relay could later watch the chain and link a particular commitment back to a particular shield. Document that, and let users pick.

---

## Order of operations and rough effort

Listed roughly small → big. First three can land without breaking the existing UI.

| # | Workstream | Effort | Unblocks |
|---|---|---|---|
| 1 | W1 (note schema, Poseidon variant added next to SHA-256) | 1–2 days | W2, W3 |
| 2 | W2 (key hierarchy + recovery via wallet signature) | 2–3 days | W3, W7 |
| 3 | W3 (rewrite shield circuit at depth 20, real Merkle) | 1 week | W6, W7 |
| 4 | W7 (real prover in browser, swap mock for bb.js) | 3–5 days | end-to-end demo |
| 5 | W4 (on-chain shield instruction + PDA vault + tree state) | 2 weeks | non-custodial |
| 6 | W5 (indexer/relayer service) | 1–2 weeks | recovery from any device |
| 7 | W6 (Groth16 verifier wired into program) | 1 week if Light's verifier slots in cleanly; 3+ weeks if it needs porting | live-funds Target A |

Total: roughly 8–10 calendar weeks of focused engineering for one developer to ship a credible Target A deposit lane for a single asset (USDC or SOL). Add 1–2 weeks per additional supported asset, mostly for asset-id schema and pool sharding decisions.

## What to delete or quarantine while building

While the above is in flight, the existing repo should:

- Mark `liveShieldBridge.ts:recordCanonicalShieldFromLiveShield` and `AppendOnlyShieldedState` as `legacy/` and stop letting them pretend to be a privacy primitive in user-facing copy. The localStorage hash chain is fine as a bookkeeping aid; it should not be called "shielded state".

  **Codex status, 2026-05-11:** remediated locally for the browser-local diagnostic boundary. `AppendOnlyShieldedState` now carries a legacy browser-local diagnostic marker, snapshots/roots expose `privacyPrimitive: false`, live Shield/Send/Swap/Unshield records persist `diagnosticStorage`, and `docs/privacy-model.md` says localStorage continuity records are not the production shared shielded-state tree or a privacy primitive. Guard: `npm run zk:local-shielded-state-diagnostics-check`.
- Gate every flow that consumes `proofSystem === "mock"` so it cannot reach a path that would call a production wallet for signature.
- Fail-closed any "anonymity-set readiness" surface until W3+W4+W6 are done.
- Add a CI check that the on-chain spend instruction requires a signer match against a configured operator authority (audit item 2). Even if the long-term answer is "anyone can spend with a valid proof", the short-term fix prevents the DoS.
- Strip `VITE_VANTA_MAINNET_VAULT_OWNER` from production deploys until W4 is shipped — the previous configured-fallback (`7yUfwUmZMYLg95xJGR762z4WpqfR6hBRqt9mcgNArtdi`) was a regular wallet whose private-key holder controls all deposited funds. If the live site has any TVL against this address, rotating to a program-owned PDA is a custody-risk reduction that should not wait for the rest of W4.

**Codex status, 2026-05-11:** partially remediated locally for the beta custody fallback. The browser Shield config and local Unshield operator no longer silently fall back to the hard-coded regular-wallet vault owner. Shield execution now requires an explicitly configured vault owner; configured wallet vaults are machine-marked as `operator-configured-wallet` with `productionCustodyReady: false`, while derived vault PDA paths stay blocked until a deployed vault init/release program exists. Guards: `npm run shield:user-vault-check`, `npm run shield:executability-claims-check`, `npm run unshield:sol-operator-endpoint-check`, and `npm run shield:production-assets-check`. This does not create a program-owned vault, migrate existing deployment env, rotate any live keys, or make Shield production-custodial-safe.

**Codex status, 2026-05-12:** added and then tightened a machine-readable Unshield custody truth guard. `npm run private-pool-v2:onchain-unshield-custody-check` now asserts that the current release model is blocked as an operator-keypair public exit, that `productionCustodyReady` remains false, and that `program-owned-vault-pda-not-deployed` / `tag-unshield-reserved-fail-closed` / `tag-unshield-token-cpi-release-not-wired` / `onchain-unshield-proof-verifier-not-wired` / `operator-vault-keypair-env-release-still-active` stay visible in Unshield production status. It also asserts that the local `TAG_UNSHIELD = 6` source ABI is a reserved fail-closed 457-byte preflight shape with `acceptedRoot`, `verifierKeyHash`, registered-root/root-record checks, verifier-key registry check, nullifier-marker availability check, and `["vanta2vault", pool_state, exitAssetId]` vault-authority PDA check, returning custom error `15` after root/root-record/verifier-key/nullifier/vault-asset/token-account preflight and before account mutation. This is a blocker guard, not the custody migration itself: there is still no proof verification, nullifier consume, token/system CPI, custody transfer, fund release, redeploy/reinit, audit acceptance, or live evidence.

**Codex status, 2026-05-14 Unshield custody-registry scaffold:** local source now includes `TAG_REGISTER_VAULT_ASSET = 7` as a source-level custody-registry scaffold for tag `6` preflight, committed as `460a62d`. The guarded truth is narrow: tag `7` can create or verify a program-owned vault-asset record at `["vanta2asset", pool_state, exitAssetId]` for SPL mint/token-account metadata and rejects non-canonical SPL token-program ids, but the record stores `releaseEnabled = 0`; tag `6` now preflights that registry plus mint, token-program, vault-token-account, and destination-token-account shape and still returns custom error `15` before proof verification, nullifier consume, token/system CPI, custody transfer, account mutation, or fund release. Trust-contract, trust-packet, production-status, limitations, setup docs, and findings-ledger guards keep production custody false/blocked and preserve `program-owned-vault-pda-not-deployed`, `tag-unshield-reserved-fail-closed`, `tag-unshield-token-cpi-release-not-wired`, and `onchain-unshield-proof-verifier-not-wired`. This is source-level registry visibility and fail-closed guard hardening only; it is not production custody, not proof-verified release, not token/system CPI release, not operator-keypair replacement, not redeployed/reinitialized/live SBF evidence, not audit acceptance, and not live deployment evidence.

**Codex status, 2026-05-14 Unshield vault-asset harness sync:** local Crucible/source guards now mirror the vault-asset registry layout in implementation commit `643535b`. The harness uses `VAULT_ASSET_ACCOUNT_LEN = HEADER_LEN + HASH_LEN * 6 + 2`, asserts the `releaseEnabled` byte at `VAULT_ASSET_KIND_OFFSET + 1` remains `0`, uses the canonical SPL Token program id for valid vault-asset records and Unshield payloads, and adds a corrupted `releaseEnabled = 1` Unshield preflight mode that must fail with `ERR_VAULT_ASSET_MISMATCH` before the reserved release-not-wired boundary. Guards now require those markers through `npm run private-pool-v2:onchain-unshield-custody-check`, `npm run private-pool-v2:contract-check`, `npm run private-pool-v2:sbf-abi-check`, and `npm run private-pool-v2:crucible-check`. This is local harness and drift-prevention hardening only; it is not program-owned production custody, not token/system CPI release, not proof-verified Unshield release, not operator-keypair replacement, not redeployed/reinitialized/live SBF evidence, not audit acceptance, not pushed, and not live deployment evidence.

## Files most directly impacted

For Codex (or any next agent) picking this up, here's where the work lands:

- **Circuit:** `zk/noir/vanta_private_pool_v2_shield_entry/src/main.nr` (rewrite), `zk/noir/canonical_note_membership/src/main.nr` (delete or repair), all four `*_entry` circuits get the same Merkle treatment for their respective inputs.
- **Note schema:** `src/zk/canonicalNote.ts` (add Poseidon variant), new file `src/zk/poseidonNoteCommitment.ts`.
- **Key hierarchy:** `src/solana/vantaShieldViewingKey.ts` (extend), new file `src/solana/vantaShieldSpendingKey.ts`.
- **Live bridge:** `src/zk/liveShieldBridge.ts` (replace `randomHex32()` recovery, replace `AppendOnlyShieldedState` with the on-chain mirror).
- **On-chain program:** `programs/vanta_private_pool_v2_spend/src/lib.rs` (or a new `vanta_private_pool_v2_shield/` crate). Add tree state, root history, vault PDA, proof verifier.
- **Prover:** `src/privacy/privatePoolV2LocalProver.ts` becomes `src/privacy/privatePoolV2BarretenbergProver.ts` backed by `@aztec/bb.js`.
- **Indexer:** new directory `operator/indexer/` with the websocket+Postgres mirror.
- **Verifier embedding:** `programs/vanta_private_pool_v2_spend/src/verifier.rs` (Light's `groth16-solana` integration), build script that copies the Noir-emitted `vk` into the Rust binary.

## Concrete first commit for Codex

If you want a single PR to start with that materially advances this without risking anything currently deployed:

> **Add a Poseidon-friendly canonical note commitment alongside the existing SHA-256 one, and wire `liveShieldBridge.ts` to record both in parallel. Land a deterministic round-trip test that proves the Poseidon commitment produced by the bridge equals the one expected by the shield circuit fixture.**

That single PR is W1 + a unit test that closes the gap between the live bridge and the circuit. It doesn't change any user-facing behavior, but it forces every downstream layer to commit to one note shape. Everything else is downstream of that one alignment.

---

# Send Lane — Deep Dive

The send lane is the most consequential one to get right. This is where users will form the mental model "I sent X privately to Y" — and right now the code does almost nothing of what that phrase implies.

## How send works today

The trace, end-to-end, when a user clicks *Send* on `/app/send`:

1. **Capability gate.** `src/solana/shieldedSendCapability.ts` only enables send for shielded USDC; every other asset is blocked with `executionMode: "unsupported-private-send-asset"`. SOL is explicitly excluded with the comment "shielded SOL can stay held here until the SOL send lane is implemented." So today, "private send" is a USDC-only feature.
2. **Note picking.** The browser picks a "predecessor" note from the user's local list (`vantaShieldState`-managed notes derived from on-chain memos the user previously emitted). It computes a `consumedNoteId` and a target `recipient` address.
3. **Memo construction.** Before the action-memo feedback loop, `src/solana/vantaShieldState.ts:createPreparedSendMemo` built a Solana **Memo program** instruction with prefix `"vanta:send-note:v1:"` followed by `JSON.stringify(payload)`. Fresh local helpers now require a Shield viewing public key and emit `vanta:send-note:v2:` AEAD ciphertext; v1 plaintext parsing remains only for historical chain records. The old helper shape was:
   ```ts
   function createMemoInstruction(prefix, payload) {
     const memoPayload = `${prefix}${JSON.stringify(payload)}`;
     return { accounts: [], data: new TextEncoder().encode(memoPayload), programAddress: VANTA_SHIELD_MEMO_PROGRAM };
   }
   ```
   That v1 shape was plaintext JSON to the SPL Memo program. Current fresh helpers fail closed into v2 viewing-key AEAD, `parseSendMemo` marks v1 reads as `legacy-v1-plaintext-history`, and `createPreparedSendDualAeadMemo` now scaffolds separate recipient/change encrypted discovery memos with ciphertext body hashes. Recipient-grade discovery still needs real recipient viewing-key exchange or view tags plus production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces. Production privacy claims are scoped to fresh v2 Send history unless legacy v1 plaintext history is migrated or segregated with reviewed evidence.
4. **Transaction signing.** The browser asks the user's wallet to sign a transaction whose only meaningful instruction is that memo, plus Helius priority-fee instructions. **No SPL transfer is included.** The vault's USDC ATA is unchanged.
5. **A second transaction — the "spent marker."** Before the action-memo feedback loop, `src/solana/vantaShieldState.ts:createSpentMarkerInstruction` wrote another plaintext memo with prefix `"vanta:spent-marker:..."` claiming `consumedNoteId` was now spent. Fresh spent-marker helpers now emit v2 AEAD ciphertext; legacy v1 spent markers remain parseable for old chain history.
6. **Off-chain operator notification.** The browser POSTs to the operator's `/private-core/send-proof` and `/private-core/send-transition` endpoints (see `operator/unshield-server.mjs:873–1190`). The operator:
   - Calls `assertPrivateCoreWitnessMaterialPolicy(body, { lane: "send" })` (a contract check, not a proof verification).
   - Resolves a "proof receipt" via `resolvePrivateCoreSendProofReceipt`. For witness-package mode this calls the local prover; for proof-artifact mode it parses public inputs and checks them against the operator's stored root.
   - Looks up the input root in `privateCoreRootStore`. Refuses if it's not the *latest* registered root.
   - Reserves the input nullifier in an in-memory `privateCoreSendStore`.
   - Persists the proof and send records to JSON files.
7. **Local bookkeeping.** `src/zk/liveSendBridge.ts:recordCanonicalSendFromLiveSend` writes a record to `localStorage["vanta.zk.phase1.live-send-records.v1"]`. Same shape as the shield bridge's localStorage — a list of canonical notes, indexed by transition signature, redacted on persistence.
8. **Recipient discovery.** Legacy v1 recipient discovery scanned the Solana memo program for plaintext entries whose `recipient` field matched the recipient pubkey. Fresh v2 memos stop exposing that plaintext field, and the local dual-AEAD scaffold can produce separate recipient/change discovery memo legs. Production-grade recipient discovery still needs recipient viewing-key exchange or a view-tag/indexer design before Send can claim recipient-private discovery.

That's the whole flow.

## What's actually private and what isn't

Honest accounting of where information leaks:

| Property | Visible on chain? | Visible to operator? |
|---|---|---|
| Sender wallet address | Yes (transaction signer) | Yes |
| Recipient wallet address | Legacy v1: yes. Fresh v2: not in plaintext memo. | Operator/status surfaces still see current transition metadata; recipient-grade discovery remains unfinished. |
| Asset (USDC mint) | Legacy v1: yes. Fresh v2: ciphertext memo plus signer/timing. | Yes in current operator/user state surfaces. |
| Send amount | Legacy v1: yes. Fresh v2: ciphertext memo plus signer/timing. | Yes in current operator/user state surfaces. |
| Change amount | Legacy v1: yes. Fresh v2: ciphertext memo plus signer/timing. | Yes in current operator/user state surfaces. |
| Predecessor note id | Legacy v1: yes. Fresh v2: ciphertext memo plus signer/timing. | Yes in current operator/user state surfaces. |
| Vault owner address | Legacy v1: yes. Fresh v2: ciphertext memo plus signer/timing. | Yes in current operator/user state surfaces. |
| Timing | Yes | Yes |

For legacy v1 memos, the information that is *not* on chain or at the operator was effectively **none that matters**: a passive observer could read the memo program, decode the JSON, and reconstruct the full transaction graph. Fresh local v2 action memos improve this by emitting ciphertext instead of raw action terms, and the dual-AEAD scaffold splits recipient/change memo bodies for future discovery work. That still does not make Send production-private: signer/timing remain public, operator/user state surfaces still carry transition metadata, recipient discovery is not solved, and the production wiring from locally proof-bound ciphertext body-hash fields to deployed memo/indexer surfaces is not live.

In short: the original reviewed "private send" was a Solana memo with the literal phrase `"recipient":"<address>","amount":"<value>"` written to chain in cleartext. The current local branch no longer emits that v1 plaintext shape for fresh Send action helpers and now has a local dual recipient/change AEAD scaffold, but the remaining production Send work is still substantial: recipient viewing-key exchange or view tags, production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces, real prover/verifier enforcement, and a production shared tree.

## What the operator actually does

The operator is the trust point. When a recipient eventually wants to "unshield" their balance to a real wallet, the operator must initiate an SPL transfer from the vault ATA. The operator's gating logic is:

- Track a registered "input root" (an opaque 32-byte handle, not a Merkle root the on-chain program ever sees).
- Track a list of consumed nullifiers.
- Track a list of accepted send/swap/unshield "proof receipts" from the local prover.
- On unshield, check the chain of proofs is consistent and release funds via a server-signed SPL transfer.

The proofs the operator inspects are produced by `src/privacy/privatePoolV2LocalProver.ts`, which is a **mock prover** that returns `proofSystem: "mock"` (audit item 8). The verification step is a hash comparison. So the operator's "proof checks" are deterministic agreement between two SHA-256s of the same input — that doesn't prove anything cryptographically. Anyone with operator access could mint a fresh "valid" send.

There is also a Noir circuit (`zk/noir/vanta_private_pool_v2_send_entry/src/main.nr` and `zk/noir/vanta_private_core_single_note_send/src/main.nr`) that, if executed, would constrain the transition to a real Poseidon Merkle membership + nullifier derivation. **Neither circuit is wired into the live send path.** They exist as fixtures and as targets the local prover claims to represent, but no Barretenberg WASM proof is generated, no UltraHonk verifier is invoked, no Groth16 verifying key is checked. The production code path silently treats the mock proof as if it were the Noir proof.

## Trust assumptions to be honest about

- **Conservation is local-proof-only today.** Private Pool v2 Send now proves `input_amount == recipient_amount + change_amount` with `u128` witnesses, and Private Core Send has amount-range/carry guards. This is still not production enforcement until the real prover/verifier and on-chain acceptance boundary are wired.
- **No proof of ownership.** The send memo is signed by the sender's Solana wallet. Owning that wallet is enough to *claim* you control any note attributed to it in the memo log. There is no spending-key separation; a leaked Solana wallet means leaked sends, regardless of whether the user has rotated their viewing key.
- **No proof the predecessor is unspent.** Nothing in the on-chain artifact prevents a sender from writing two sends against the same predecessor. The off-chain `privateCoreSendStore.reserveInputNullifier` is the only deduplication, and it's in-memory at the operator. If the operator restarts without the persistence file, the dedup state is gone.
- **The vault holds all the money.** Recipient receiving a send memo doesn't get USDC. They get a claim against the vault. If the vault key is lost, frozen, sanctioned, or rugged, every recipient loses everything.
- **No anonymity set.** Two senders' memos sit next to each other in the memo program, but nothing combines them into a cryptographic anonymity set. A recipient with a 100 USDC inbound and a sender with a 100 USDC outbound at the same minute are trivially linked by pattern matching.
- **Recipient privacy is improved but not complete.** Fresh v2 action memos no longer put `recipient` in plaintext, and a local dual-AEAD scaffold can separate recipient/change discovery memo legs. Recipient discovery is not production-grade until Vanta has recipient viewing-key exchange or view-tag/indexer discovery plus production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces.

## What "send actually works" needs to mean

Same exercise as the shield section. Pick the target before building.

**Target A — Shielded transfer in a shared anonymity set.** Send transitions the predecessor note to two new notes (recipient + change) inside the on-chain Merkle tree. A Groth16 proof verifies on-chain that (1) the predecessor commitment is a member of an accepted root, (2) the nullifier is correctly derived from the predecessor commitment and the sender's spending secret, (3) the recipient + change commitments are well-formed Poseidon hashes of the new notes, (4) `sendAmount + changeAmount = predecessorAmount`. The recipient never gets a token transfer — they just learn (via encrypted memo) the new commitment they own. They unshield later. **No on-chain fields reveal sender, recipient, asset, or amounts** beyond what's already in the shield/unshield boundaries.

**Target B — Operator-mediated transfer with real off-chain ZK.** Operator sees the send (so the recipient leak isn't fixed), but conservation of value, ownership, and double-spend are enforced by real proofs that the operator verifies before honoring later unshield requests. Vault is still custodial. Strictly weaker than A, but it's at least cryptographically auditable: anyone can re-verify the proofs. To get this you need to (1) replace the mock prover with bb.js, (2) make the operator actually verify the resulting proofs, and (3) commit a public proof log so observers can detect operator misbehavior.

**Target C — The current non-production shape.** Fresh local action memos are encrypted, but the lane still has custodial vault + mock/local proof boundaries + operator discretion + no on-chain verifier. The honest framing is "an internal ledger of who owes whom, with encrypted diagnostics and extra steps." This is not production private-send.

The current code is structured as if it's heading to A (the Noir circuits and `vantaPrivateCoreSendProof.ts`'s detailed encoding scheme are A-shaped) but still ships short of A (fresh memos encrypted, prover boundary local/mock in key paths, no on-chain verifier). The intermediate state - pretending you have A while shipping a custodial/operator-discretion lane - is the dangerous one because it's what loud product copy is built around.

The rest of this document assumes **Target A**. It is the only one of these three that earns the word "private" in the product name.

---

## Concrete build plan for Target A

Five workstreams. Numbered in execution order. Many depend on shield-lane workstreams already laid out above; the dependencies are called out inline.

### S1. Make the send circuit prove what it claims

Build new production-facing Send circuit work through `zk/noir/vanta_private_pool_v2_send_entry/src/main.nr` and treat `vanta_private_core_single_note_send` as an active-v0 legacy compatibility lane while current Private Core Send flows depend on it. Migrate or delete the single-note lane only after replacement coverage is reviewed. Public inputs must constrain:

```rust
// Public inputs:
//   pool_id
//   accepted_root              — must be in the program's recent-roots history
//   input_nullifier            — appended to on-chain nullifier set
//   recipient_commitment       — new note for recipient
//   change_commitment          — new note for sender's change (or zero-note)
//   new_root                   — root after both insertions
//   new_recipient_leaf_index   — position of recipient_commitment
//   new_change_leaf_index      — position of change_commitment
//   recipient_memo_ciphertext_body_hash_field
//   change_memo_ciphertext_body_hash_field
//
// Private witnesses:
//   input_note: (asset_id, amount, owner_pubkey, blinding, derivation_tag)
//   spending_secret
//   merkle_path: siblings[20], direction_bits[20]
//   recipient_note: (asset_id, send_amount, recipient_pubkey, recipient_blinding, ...)
//   change_note:    (asset_id, change_amount, owner_pubkey, change_blinding, ...)
//   recipient_path_siblings[20], recipient_path_direction_bits[20]
//   change_path_siblings[20],    change_path_direction_bits[20]
//
// Constraints:
//   1. input_commitment = poseidon(input_note fields)
//   2. Merkle membership of input_commitment under accepted_root.
//   3. input_nullifier = poseidon(input_commitment, spending_secret, pool_id)
//   4. recipient_commitment = poseidon(recipient_note fields)
//   5. change_commitment = poseidon(change_note fields) OR change_commitment == ZERO_COMMITMENT
//   6. recipient_note.asset_id == input_note.asset_id
//   7. change_note.asset_id == input_note.asset_id  (when present)
//   8. recipient_note.amount + change_note.amount == input_note.amount
//      (range-check both with bit decomposition; BN254 is ~254 bits, u128 amounts are safe)
//   9. The Merkle insertion of recipient_commitment at new_recipient_leaf_index against accepted_root
//      yields an intermediate root R_intermediate.
//   10. The Merkle insertion of change_commitment at new_change_leaf_index against R_intermediate
//       yields new_root.
```

Notes on the circuit:

- **Drop `MERKLE_DEPTH = 3`.** Use 20 to match shield (audit item 5).
- **Drop the `is_current_right` argument from `hash_merkle_node`.** Standard incremental Merkle uses `poseidon2(left, right)`, with the prover/verifier swapping inputs based on direction (audit item 10). Codex's 2026-05-09 third pass standardizes this in the Private Pool v2 entry circuits; copy that convention into remaining Private Core lanes.
- **Drop the `hi/lo` sibling split** (audit item 9). One field per sibling.
- **Bind the encrypted memo ciphertext hashes into the public inputs.** The circuit doesn't decrypt or verify the memo content — the recipient does that off-circuit. But the proof must commit to the exact ciphertext bytes the program will store, so an operator/relayer can't swap memos after the fact.
- **No `recipient_pubkey` in plain.** It's a witness, included only inside `recipient_commitment = poseidon(...recipient_pubkey...)`. The recipient's identity never leaks from the circuit.
- **Range checks on amounts.** Without them, modular wraparound in BN254 lets a prover build "negative" amounts. Use 128-bit range proofs (32 4-bit chunks via Noir's `assert(...)` over poseidon-friendly decomposition, or `std::field::bn254::assert_lt` on the appropriate constant).

Effort: 1 week of focused circuit work + fixture rewrite.

### S2. Replace the plaintext memo with an AEAD memo

Today: `vanta:send-note:v1:` followed by JSON. Replace with the same envelope already shipped for shield-viewing (`src/solana/vantaShieldViewingKey.ts`):

```text
memo := prefix || base64url(
   1 byte version
|| ephemeral_pubkey (X25519, 32 bytes)
|| nonce (XChaCha20-Poly1305, 24 bytes)
|| ciphertext = AEAD_seal(
       key = HKDF(ECDH(ephemeral_secret, recipient_viewing_pubkey),
                   info = "vanta:send-memo:v1"),
       nonce,
       plaintext = canonicalJSON({
            asset, amount, blinding, leaf_index,
            sender_owner_commitment_or_blank,
            free_form_memo
       })
   )
)
```

The memo content is the *new note's* secrets that only the recipient needs (asset, amount, blinding, the leaf index where the program appended the commitment). The recipient already has their viewing secret; they decrypt, validate against the on-chain commitment at `leaf_index`, and add the note to their wallet.

Two memos per send: one for recipient (sealed to recipient's viewing key), one for the sender's own change note (sealed to sender's own viewing key — same code path, recipient is self).

The pre-image of `recipient_memo_ciphertext_body_hash_field` (bound into the circuit at S1 step 11 in the current local Private Pool v2 Send lane) is the exact `sha256:` ciphertext body compressed from its two 128-bit digest halves into a single Poseidon/BN254 field. A future on-chain memo/indexer surface must write the matching opaque body bytes so chain observers see ciphertext only.

`vantaShieldViewingKey.ts` is already correct AEAD code. The only new work is wiring its `encryptVantaShieldMemoToViewingKey` into `createPreparedSendMemo` instead of the JSON stringify, and adding a parallel call for the change memo. Effort: 1–2 days.

### S3. Send instruction in the on-chain program

Adds `TAG_SEND = 3` to `programs/vanta_private_pool_v2_spend/src/lib.rs`. Account list:

```
0. pool_state                 (writable, program-owned)
1. tree_state                 (writable, program-owned, holds rolling roots + right-edge subtree)
2. nullifier_set              (writable, program-owned)
3. memo_log                   (writable, program-owned)
4. signer                     (signer, fee payer; not the noteholder, just whoever submits)
```

Instruction data (after `tag = 3`):

```
input_nullifier:32
recipient_commitment:32
change_commitment:32
new_recipient_leaf_index:8 (le u64)
new_change_leaf_index:8 (le u64)
new_root:32
public_inputs_hash:32
proof_bytes:N (Groth16: 256 bytes)
recipient_memo_len:2 (le u16)
recipient_memo:M
change_memo_len:2 (le u16)
change_memo:M'
```

Program logic:

1. Reconstruct `accepted_root` by reading `tree_state.recent_roots[]` at the index encoded in `public_inputs_hash`. Reject if not present.
2. Verify Groth16 proof against `public_inputs_hash` (see W6 from shield section — same verifier).
3. Read `nullifier_set` and reject if `input_nullifier` already present. Append it.
4. Verify the recipient and change ciphertext hashes match what's in `public_inputs_hash`.
5. Update `tree_state`: insert `recipient_commitment` at `new_recipient_leaf_index`, insert `change_commitment` at `new_change_leaf_index`, push `new_root` to recent-roots ring buffer, increment `next_leaf_index` by 2.
6. Append `(recipient_memo, recipient_leaf_index, new_root)` and `(change_memo, change_leaf_index, new_root)` to `memo_log`.
7. Emit `SendEvent` with the leaf indices and root for indexers. **No fields revealing asset, amount, or recipient.**

Critical: this instruction does **not move tokens**. The vault PDA (introduced in W4 from the shield section) is untouched. Token movement only happens at the shield (deposit) and unshield (withdraw) boundaries. Inside the pool — send and swap — only commitments and nullifiers move. This is what gives you a real anonymity set: every send adds two leaves to the same shared tree as everyone else's shield deposits and other sends. The recipient is just whoever can later prove ownership of the leaf at `new_recipient_leaf_index`.

Replace the current spend instruction (`TAG_SPEND = 1`) with this. The older reviewed spend path verified nothing and was unauthenticated; the current local source adds an operator-authority signer gate but still lacks on-chain proof verification and still has stale live/SBF evidence. Once `TAG_SEND` exists with real proof verification, the legacy spend tag should be removed entirely so there is no append-only fallback instruction reachable on the program.

Effort: 2–3 weeks, gated on the Groth16 verifier work from W6.

### S4. Get the prover and operator off mock and onto Noir-Barretenberg

The constants in `vantaPrivateCoreSendProof.ts` already declare `VANTA_PRIVATE_CORE_SEND_BACKEND_V0 = "noir-barretenberg"`. The actual prover (`privatePoolV2LocalProver.ts`) returns `proofSystem: "mock"`. Close the gap:

- **Browser proving** via `@aztec/bb.js`. Compile the new send circuit (S1) to UltraHonk or Groth16 — Groth16 if you're going on-chain via Light's verifier. Bundle the proving key as a static asset (~1–10 MB depending on circuit size; prefetch in the background while the user fills the form). Generation time: 5–30 s on a laptop for a depth-20 send; may need a Web Worker. Prove inside a worker, post the proof + public inputs back to the main thread.
- **Operator-side relay (optional).** For users who don't want to wait, an opt-in service that accepts the witness and returns a proof. Privacy-weakening — the relay sees the witness, including spending secret if you let it derive the nullifier. Better: the client computes the nullifier locally and ships only the merkle path + amounts, so the relay sees economics but not the spending key. Document the trade-off.
- **Operator verification.** When the operator's `/private-core/send-transition` accepts a proof artifact, replace the SHA-256 hash comparison with an actual Groth16 verification call against the published verifying key. Same call the on-chain program will make.
- **CI gate.** A test that compiles the Noir circuit, generates a known-witness proof, and verifies it with the same verifier the program embeds. If circuit and verifier drift, CI fails. Critical for upgrade safety once funds are live.

Effort: 1–2 weeks, mostly browser perf work + Web Worker plumbing.

### S5. Recipient discovery without scanning the world

Today recipients scan the memo program for matching `recipient` fields in plain JSON. After S2 those fields no longer exist in plaintext, so the scan model has to change.

Standard pattern: the recipient's wallet polls an indexer service that mirrors the program's `memo_log`, decrypts memos against the recipient's viewing key, and returns matches. Code:

```ts
// indexer: stores raw (memo_bytes, leaf_index, root) tuples
// client: provides viewing_pk, requests "give me memos addressed to me since cursor X"
// trial-decrypt happens client-side OR server-side (privacy trade-off)
```

**Decision point: trial-decrypt where?**

- *Client-side*: best privacy, worst battery. The indexer sends every memo bucket to the client; client tries each one. Acceptable up to ~100k memos.
- *Server-side, key-blinded*: indexer holds an "encrypted view tag" the user provides (`tag = HMAC(viewing_secret, "memo-tag-v1")`) and per-memo the sender includes a tag derived the same way. Server returns only matching memos. Acceptable middle ground.
- *Server-side, full-key trust*: indexer holds the user's viewing key. Worst privacy. Not recommended.

Recommend the encrypted-view-tag pattern. Aztec's sandbox uses something similar; Penumbra uses "fuzzy message detection" which is roughly the same idea.

Effort: 1–2 weeks for the indexer + tagging scheme + client wallet integration.

---

## Where the existing code helps

Don't rewrite from scratch. The following pieces are correct or close:

- `src/solana/vantaShieldViewingKey.ts` — production-quality AEAD memo crypto. S2 is mostly "wire this in".
- `vanta_private_pool_v2_actual_private_spend_entry/src/main.nr` — the only correct send-shaped circuit in the repo. S1 is largely "back-port two-output append + amount conservation onto this template".
- `src/zk/canonicalLifecycleLinkage.ts`, `src/zk/canonicalConsumption.ts` — solid bookkeeping types for tracking parent-child relationships of notes. These survive into the new model; they just stop being load-bearing for security.
- `operator/unshield-server.mjs:/private-core/send-transition` — the request-validation skeleton is the right shape. Replace the mock-proof check with a real Groth16 verify and reuse the rest.
- `src/zk/vantaPrivateCoreSendProof.ts` — the field encoding declarations (`Bytes32EncodingV0`, `U128EncodingV0`, etc.) are exactly the ones a real Noir circuit needs. The encoding is sound; the gap is that no real proof is ever produced over them.

## What to delete or quarantine

While S1–S5 are in flight:

- **Keep fresh Send memos on the v2 AEAD path.** The original v1 memo bytes were a public ledger of every send; fresh local helpers now fail closed into viewing-key AEAD, v1 reads are marked as historical/non-production-eligible, and a local dual-AEAD scaffold can separately seal recipient/change discovery memo legs. The remaining work is recipient-grade viewing-key exchange or view tags plus production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces.
- Mark `liveSendBridge.ts:recordCanonicalSendFromLiveSend` and the localStorage list as user-facing diagnostics only. Don't claim the JSON list is "shielded state".

  **Codex status, 2026-05-11:** remediated locally alongside the Shield diagnostic boundary. Live Send records now carry the same `diagnosticStorage` marker as Shield/Swap/Unshield, Send diagnostic summaries surface `storageRole = browser-local-diagnostics` with `privacyPrimitive: false`, and the shared guard `npm run zk:local-shielded-state-diagnostics-check` prevents the localStorage list from drifting back into a production shielded-state claim.
- Remove `TAG_SPEND = 1` from the on-chain program once `TAG_SEND = 3` exists; a public, unauthenticated append-only nullifier log accessible to any wallet is a denial-of-service that scales with rent (audit item 2).
- Block the SOL-send capability path with a real refusal: today it returns a soft `unsupported-private-send-asset` blocker; the user can't actually trigger it but the option appears in the asset list. Hide it until the SOL lane exists.

  **Codex status, 2026-05-11:** remediated locally for the current Send selector. `listShieldedSendAssetOptions()` no longer appends Shielded SOL, `getInitialSendAsset()` normalizes recent SOL shield context back to USDC on Send entry, and the `getShieldedSendAssetCapability("SOL")` branch remains as a defensive hard-block for stale callers until a real SOL send lane exists. Guard coverage now asserts both sides of the boundary through `npm run send:requires-shielded-state-check` and `npm run shielded-assets:visibility-check`.

## Order of operations and rough effort

| # | Workstream | Effort | Depends on |
|---|---|---|---|
| 1 | **Interim**: AEAD-wrap the existing send memo (no proof changes) | 1–2 days | nothing — ship today |
| 2 | S2 (production memo envelope w/ ephemeral X25519 + leaf index inside) | 2–3 days | shield W2 (key hierarchy) |
| 3 | S1 (rewrite send circuit at depth 20 with conservation + dual append) | 1 week | shield W1 (Poseidon note schema) |
| 4 | S4 (real prover in browser + operator verification) | 1–2 weeks | S1 done, shield W7 done |
| 5 | S3 (on-chain send instruction with proof verification) | 2–3 weeks | shield W4 (vault PDA + tree state) + shield W6 (Groth16 verifier) |
| 6 | S5 (indexer + view-tag discovery) | 1–2 weeks | S2 done |

Total: about 7–9 calendar weeks for one developer once shield W1+W2+W4+W6 land. Send re-uses every shield primitive. The order I'd actually take is: shield W1 → shield W2 → S1 + shield W3 in parallel → S4 → shield W4 + S3 in parallel → S2 + S5.

## Concrete first commit for Codex (send-side)

If you want a single PR to make on the send lane that materially advances this without breaking the existing UI:

> **Completed locally for the current browser helpers: fresh send memos now emit `vanta:send-note:v2:` AEAD ciphertext, recipient discovery attempts v2 decryption before falling back to historical v1 plaintext, and the later Private Pool v2 Send lane locally binds recipient/change ciphertext body-hash fields. Keep the guard, then finish recipient-grade discovery plus deployed memo/indexer handoff.**

This local change closes the largest fresh send memo privacy leak (the plaintext recipient/amount). It does not touch the proof or the trust model - those still need S1+S3+S4 - but it removes the fresh public broadcast of send economics while preserving historical v1 parsing.

Pair this with marking `liveSendBridge.ts` as a "diagnostics-only" path in user-facing copy until the proof lane is real.

## Files most directly impacted

- **Circuit:** `zk/noir/vanta_private_pool_v2_send_entry/src/main.nr` (new production-facing work), with `zk/noir/vanta_private_core_single_note_send/src/main.nr` kept as an active-v0 legacy compatibility lane while current Send flows depend on it. Migrate or delete only after replacement coverage is reviewed.
- **Memo:** `src/solana/vantaShieldState.ts:createPreparedSendMemo` (replace JSON with AEAD), `src/solana/vantaShieldState.ts:1340` (parse v2).
- **Live bridge:** `src/zk/liveSendBridge.ts` (reduce to diagnostics, drop the localStorage tree).
- **Proof boundary:** `src/zk/vantaPrivateCoreSendProof.ts` (already shaped right; flip `proofSystem` from `"mock"` → `"groth16-bn254"` once S4 lands).
- **Operator:** `operator/unshield-server.mjs` send endpoints (replace mock check with Groth16 verify, plus persistence-safe nullifier reservation per audit item 11).
- **On-chain:** `programs/vanta_private_pool_v2_spend/src/lib.rs` (add `TAG_SEND`, remove `TAG_SPEND`), share verifier embedding with shield instruction.
- **Indexer:** `operator/indexer/` (new — shared with shield W5; just adds a memo decrypt loop and a view-tag query API).

---

# Swap Lane — Deep Dive

Swap is the most layered of the three lanes because, unlike send, it has to interact with an external venue (Jupiter, Meteora) to actually exchange one asset for another. That extra hop is where the privacy story gets hardest, and where today's code makes the loosest claims.

## How swap works today

Two execution modes are gated live:

- `operator-usdc-sol`: shielded USDC → shielded SOL via Meteora DLMM. UI is hardcoded for this pair.
- `operator-sol-to-shielded`: shielded SOL → some shielded asset (USDC, PYUSD by default) via Jupiter aggregator. Routed through `operator/jupiter-sol-to-shielded-route-adapter.mjs`.

Everything else is `needs-private-route-adapter` — visible in the asset list but blocked.

The trace, end-to-end, when a user clicks *Swap*:

1. **Quote.** The browser fetches a quote for the source/target pair. For SOL→shielded, that's a Jupiter quote API call routed through the operator adapter; the adapter holds a `liquidityKeypair` and signs/submits the eventual on-chain swap. For USDC→SOL, the venue is Meteora DLMM via `operator/meteora-dlmm-context.mjs`. The quote includes `outputAmount`, `quoteId`, `quoteTimestamp`, `quoteExpiresAt`, `venueFamily`, `venueName`, `venuePoolAddress`.
2. **Memo construction.** Before the action-memo feedback loop, `src/solana/vantaShieldState.ts:createPreparedSwapMemo` built a Solana **Memo program** instruction with prefix `vanta:swap-note:v1:` followed by plaintext JSON. Fresh browser helpers now emit `vanta:swap-note:v2:` AEAD ciphertext and parsers retain v1 fallback for historical chain records. Remaining leakage is signed-intent/operator metadata plus the lack of proof-bound ciphertext commitments.
3. **Memo transaction.** Browser asks the wallet to sign a transaction whose only meaningful instruction is that memo + Helius priority-fee instructions. **No SPL transfer, no Jupiter or Meteora instruction is included in the user's transaction.**
4. **Spent marker.** A second transaction with `createSpentMarkerInstruction` claiming `consumedNoteId` is now spent (same pattern as send).
5. **Signed swap intent.** The browser signs an out-of-band intent message with the user's wallet (`vanta:swap-intent:v2`) and POSTs to the operator's `/private-core/swap-proof` and `/private-core/swap-transition` endpoints in `operator/unshield-server.mjs`. The intent contains `consumedNoteId`, `inputAmount`, `outputAmount`, `quoteId`, `venuePoolAddress`, etc., signed with Ed25519 by the user's Solana keypair.
6. **Operator validation.** `operator/swap-auth.mjs:parseSignedSwapIntent` validates the intent shape (must be exactly USDC→SOL Meteora-DLMM-Mainnet for `operator-usdc-sol`). The operator looks up the input root, checks input root linkage, reserves the input nullifier — same in-memory store as send.
7. **Venue execution.** This is where it gets interesting. The operator's `liquidityKeypair` (loaded from `VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_JSON` env) signs and submits the actual on-chain swap to Jupiter or Meteora. For the SOL→shielded path, `jupiter-sol-to-shielded-route-adapter.mjs` calls Jupiter's `/swap/v1/quote` and `/swap/v1/swap` REST APIs, gets the swap transaction, signs it with the liquidity keypair, sends it. **The swap is executed by the operator's wallet, not the user's.**
8. **Local bookkeeping.** `src/zk/liveSwapBridge.ts:recordCanonicalSwapFromLiveSwap` writes the transition to localStorage just like send.

## What's actually private and what isn't

Same accounting as the send section, with one wrinkle: the venue.

| Property | Visible on chain? | Visible to operator? | Visible to venue? |
|---|---|---|---|
| User wallet (sender) | Yes (memo signer + intent signer) | Yes (signed intent) | No |
| Venue used (Jupiter/Meteora) | Yes (memo + venue tx) | Yes | n/a |
| Input asset | Operator venue tx: yes. Fresh user memo: ciphertext. | Yes | Yes |
| Input amount | Operator venue tx: yes. Fresh user memo: ciphertext. | Yes | Yes |
| Output asset | Operator venue tx: yes. Fresh user memo: ciphertext. | Yes | Yes |
| Output amount | Operator venue tx: yes. Fresh user memo: ciphertext. | Yes | Yes |
| Slippage | Fresh user memo: ciphertext; venue tx/quote context still observable to operator. | Yes | Yes |
| Quote ID + timestamp | Fresh user memo: ciphertext plus transaction timing. | Yes | Yes |
| Linkability (user -> venue swap) | No longer via plaintext user memo; still plausible via timing, operator tx cadence, and amount/venue tx correlation. | Yes | Trivial via timing+amount |

The single privacy gain over a fully public swap: **the venue (Jupiter/Meteora) sees the operator's `liquidityKeypair` as the swapper, not the user's wallet.** That is real but limited. Fresh v2 memos remove the easiest user-memo term leak, but anyone correlating the user's memo timing with the public Jupiter/Meteora swap from the operator's wallet within the quote TTL window can still re-link the user to the venue swap in low-throughput conditions. Quote TTL is 30s by default (`VANTA_SOL_TO_SHIELDED_QUOTE_TTL_MS`); during that 30-second window the operator processes one swap intent at a time, so the matching can still be one-to-one.

In short: today's "private swap" buys limited venue unlinkability at the cost of full custody by the operator's liquidity wallet. Fresh memo ciphertext improves passive chain privacy, but the lane is not production-private because timing, operator custody, venue execution, and proof enforcement remain unresolved.

## What the operator actually does

Even more central here than for send. The operator:

- Holds a `liquidityKeypair` with real funds. **Whoever holds that key controls the liquidity.** If the keypair JSON leaks, every swap user's funds are at risk because the liquidity wallet is the one paying out the output asset to the vault.
- Calls Jupiter/Meteora APIs directly. The user's privacy from the venue depends on the operator's wallet not being a known Vanta wallet. Once the venue (or any arbitrageur) labels `7yUf...rtdi` (the fallback vault) or the liquidity keypair as Vanta-controlled, the privacy gain is zero.
- Decides whether to honor the swap intent. The `quoteExpiresAt` check is operator-side. There is no on-chain price-fairness check, no on-chain slippage bound, no on-chain proof that the output amount the operator ledgered matches the output amount the venue actually returned.
- Maintains the off-chain "you now own X SOL" ledger.

There are two real mechanisms in play (the on-chain Jupiter/Meteora swap is real and final on chain), so this is not a fully fake system. But the privacy layering on top is performative — the venue swap happens via the operator's wallet and the user's claim to the output is bookkeeping, not enforcement.

## The Noir circuits

Three swap-shaped circuits exist in `zk/noir/`:

1. `vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr` — same shape as the send_entry circuit. **No Merkle membership proof.** The "append root" is `poseidon3(previous_root, output_commitment, leaf_index)` — not a Merkle insertion (audit item 4). Has `economics_commitment, route_commitment, settlement_commitment` as opaque inputs that are hashed but never constrained. The circuit is performative — it binds public inputs into a hash, but doesn't enforce any of the things you'd want for a swap (membership of input, conservation across the venue trade, ownership).

2. `vanta_private_core_single_note_swap/src/main.nr` — the more mature variant. This one **does** have:
   - Real Poseidon Merkle membership proof of the input commitment under `state_root`
   - Real nullifier derivation `poseidon(secret, nonce, state_root, leaf)`
   - Output commitment construction with full note fields
   - An economic-terms hash binding `(input_asset, output_asset, input_amount, output_amount)`

   But it still has the recurring problems:
   - `MERKLE_DEPTH = 3` (audit item 5)
   - Sibling `(hi, lo)` split that adds no security (audit item 9)
   - `is_current_right` baked into the node hash (audit item 10)
   - The "I changed assets" check is `assert(input_asset_id_hi + input_asset_id_lo != output_asset_id_hi + output_asset_id_lo)` — additive, so a malicious prover could easily produce two distinct asset IDs that collapse to the same sum
   - A no-op constraint: `let sender_secret_stub = sender_secret_key_hi + sender_secret_key_lo; assert(sender_secret_stub == sender_secret_key_hi + sender_secret_key_lo);` — the sender secret key is taken as a witness but **the circuit never uses it for anything**. It's dead code that gives the impression of an ownership check without performing one.
   - **No price-fairness or value-conservation between input and output.** The circuit treats `input_amount` and `output_amount` as independent inputs. A prover with the input note can construct a swap that claims to receive any output amount they choose — the circuit will accept it. The economic-terms hash binds the (input_amount, output_amount) tuple into the public-input hash, but binding is not constraining. There is no "the venue actually returned at least this much" constraint, because the circuit can't observe the venue.

3. The older `vanta_private_core_single_note_unshield` — used for exits, mentioned for context.

Neither circuit is wired into the live swap path. The local prover (`privatePoolV2LocalProver.ts`) returns a SHA-256 mock proof; nothing UltraHonk/Groth16 runs. The on-chain program does no proof verification.

## Trust assumptions to be honest about

In addition to all the trust assumptions inherited from send (no proof of ownership, no proof of unspent, no anonymity set, no on-chain enforcement), swap adds these:

- **The operator's liquidity wallet is custodial AND active.** Unlike the deposit vault, which only needs to receive and (eventually) release, the liquidity wallet must hold liquid balances and execute trades on demand. If the liquidity wallet runs dry mid-execution, the operator might honor the user's "I sent USDC" memo without ever producing the SOL output. There is no on-chain atomic guarantee.
- **No fairness against the operator.** The operator can claim "the venue gave you 0.95 SOL" while the venue actually returned 1.0 SOL and pocket the difference. There is no MEV-resistant proof that the user got the venue's true output.
- **Quote expiry is enforced by the operator only.** A misbehaving operator could process a stale quote and pocket the price drift.
- **MEV exposure is total.** The user's `consumedNoteId` is in the public memo before the venue swap is even submitted. An MEV searcher can sandwich the venue trade with high confidence because they know the swap is coming, what amounts, and when.
- **Even the limited venue-side privacy is fragile.** Because every Vanta swap is signed by the same `liquidityKeypair`, after a few dozen swaps that wallet is publicly tagged as Vanta-controlled. From then on, the venue and any indexer can attribute every swap to Vanta with certainty.

## What "swap actually works" needs to mean

This is where Vanta has to make the architectural choice that send didn't force.

**Target A — Asset transitions live entirely inside the pool, with no external venue per swap.** The pool itself holds a portfolio across all supported assets, and "swap" is a re-allocation between commitments inside the same Merkle tree. Pricing is provided by an oracle (Pyth, switchboard) that the on-chain program reads. The swap circuit constrains `output_amount = oracle_price(input_asset, output_asset, slot) * input_amount` within a slippage band that's verified on-chain. The pool's per-asset balances rebalance over time via separate operator rebalancing actions that aren't tied to any user swap. **Privacy parity with send.** This is what Privacy Pools / Aztec model does for cross-asset.

**Target B — Per-swap external venue execution, with on-chain proof that the venue's reported output matches the on-chain Merkle update.** The circuit witnesses (a) the venue's quote response (signed by the venue or attested via a price oracle), (b) the user's input note membership, (c) the output commitment for the post-swap balance. The on-chain instruction (1) verifies the proof, (2) executes the venue swap via CPI in the same transaction, (3) confirms the venue's actual output equals what the proof committed to, and only then appends the output commitment. **No off-chain liquidity wallet.** Privacy from the venue still requires either many users batching through the same hot signer or zk-friendly direct CPI patterns. This is closer to what Light Protocol's `cToken` swap path does.

**Target C — What's deployed today.** Plaintext memo + signed intent + operator-custodial liquidity wallet that executes via Jupiter on the user's behalf. Honest framing is "we are a custodial DEX router with extra steps."

Targets A and B are roughly equally hard. A is cleaner architecturally; B preserves "the user picks any venue" UX but bolts a much harder atomic-CPI requirement onto the on-chain program.

The current code is shaped like B (note the `route_commitment` and `settlement_commitment` fields in the swap entry circuit, and the `quoteId / venuePoolAddress` plumbing), but ships like C. Pick one and commit.

The rest of this document assumes **Target A**. The reasoning is the same as send: A is the only one of these that actually delivers privacy. B's privacy is a function of how good the venue-side anonymity is, and Solana's venue ecosystem (Jupiter, Meteora, Raydium) is fully transparent — there is no anonymity to inherit. A starts with internal privacy and never sells it for venue routing flexibility.

---

## Concrete build plan for Target A

Six workstreams. The first three depend heavily on send and shield work; the last three are swap-specific.

### X1. Lock the swap circuit

Build new production-facing Swap circuit work through a reviewed `vanta_private_pool_v2_swap_entry` successor to `vanta_private_pool_v2_swap_to_shielded_entry`, while keeping `vanta_private_core_single_note_swap` as an active-v0 legacy compatibility lane for current Private Core Swap flows until replacement coverage is reviewed. Public inputs:

```rust
// Public inputs:
//   pool_id
//   accepted_root              — recent root of the pool's commitment tree
//   input_nullifier            — appended to nullifier set
//   output_commitment          — the user's new note (post-swap)
//   new_root                   — root after appending output_commitment
//   new_leaf_index             — position of output_commitment
//   memo_ciphertext_hash       — hash of the encrypted memo bytes the program will store
//   pricing_attestation_hash   — Poseidon hash of the on-chain oracle reading
//                                (slot, input_asset, output_asset, price_numerator, price_denominator)
//   slippage_bps               — user-permitted slippage; circuit enforces a one-sided bound
//
// Private witnesses:
//   input_note: (asset_id, input_amount, owner_pubkey, blinding, derivation_tag)
//   output_note: (output_asset_id, output_amount, owner_pubkey, output_blinding, ...)
//   spending_secret
//   merkle_path: siblings[20], direction_bits[20]
//   output_path: siblings[20], direction_bits[20]
//   price_numerator, price_denominator (range-checked u128)
//   oracle_slot
//
// Constraints:
//   1.  input_commitment = poseidon(input_note fields)
//   2.  Merkle membership of input_commitment under accepted_root
//   3.  input_nullifier = poseidon(input_commitment, spending_secret, pool_id)
//   4.  output_commitment = poseidon(output_note fields)
//   5.  Merkle insertion of output_commitment at new_leaf_index against accepted_root
//       yields new_root
//   6.  output_note.owner_pubkey == input_note.owner_pubkey
//       (the swap doesn't change ownership; only re-pricing happens here)
//   7.  output_note.asset_id != input_note.asset_id
//       (use multiplicative comparison: assert(diff * inverse == 1) where diff = output - input)
//   8.  pricing_attestation_hash == poseidon(oracle_slot, input_note.asset_id,
//                                              output_note.asset_id, price_numerator,
//                                              price_denominator)
//   9.  output_note.amount * price_denominator >= input_note.amount * price_numerator
//                                                  * (10000 - slippage_bps) / 10000
//       (one-sided bound: prover can't claim more output than the oracle price allows
//        within the user's slippage envelope; range-check all multiplicands)
//   10. output_note.amount * price_denominator <= input_note.amount * price_numerator
//                                                  * (10000 + slippage_bps) / 10000
//       (other-sided bound: prevents the operator from underpaying)
```

Notes:

- **No more `route_commitment` / `settlement_commitment` opaque blobs.** Pricing comes from a named oracle (Pyth, Switchboard) whose attestation is verified on-chain by the program before the proof is checked. Routing is gone — the pool internally rebalances via a separate, batched operator action that has nothing to do with user swap proofs.
- **Drop `MERKLE_DEPTH = 3` for 20.** Drop the hi/lo split. Drop the direction bit in the node hash.
- **Drop the `sender_secret_stub` no-op assertion.** The spending secret must actually be used — exactly once, in the nullifier derivation. If you keep it as a witness for some future use, range-check it; don't assert `x == x`.
- **Multiplicative != asset check** instead of additive. `(input_asset_id - output_asset_id) * inverse == 1` proves they differ in the field, not just under a sum collision.
- **Range checks on all amounts and prices.** BN254 field is 254-bit; u128 amounts and u64 prices are safe but only if you decompose-and-bit-check them. Without that, modular wraparound attacks let a prover construct overflowing amounts that pass the slippage band.

Effort: 1–2 weeks of circuit work. Slippage-band proofs over u128 multiplications are the slowest part.

### X2. Keep the encrypted swap memo guard

Same fix as send (S2 above), now completed locally for fresh helpers. `createPreparedSwapMemo` emits v2 AEAD sealed to the user's own viewing key. The output note is owned by the same user, so there's only one memo per swap (no recipient).

The v2 plaintext inside the sealed body is shaped around `{ output_asset, output_amount, output_blinding, leaf_index, swap_oracle_slot, free_form }`. On chain, the fresh memo bytes use prefix `vanta:swap-note:v2:` and are opaque without the viewing key. Keep parsing of v1 memos for backward compatibility until a migration policy is explicit.

Effort: 1–2 days.

### X3. On-chain swap instruction with oracle verification

Adds `TAG_SWAP = 4` to the program. Account list:

```
0. pool_state            (writable)
1. tree_state            (writable)
2. nullifier_set         (writable)
3. memo_log              (writable)
4. price_oracle_account  (readable; e.g. Pyth price feed PDA for the input/output pair)
5. signer                (signer, fee payer)
```

Instruction data:

```
input_nullifier:32
output_commitment:32
new_leaf_index:8
new_root:32
slippage_bps:2
public_inputs_hash:32
proof_bytes:N
memo_len:2
memo:M
```

Program logic:

1. Read the price oracle account, decode `(slot, price_numerator, price_denominator, input_mint, output_mint)`. Reject if oracle slot is more than `MAX_ORACLE_AGE_SLOTS` behind current slot.
2. Compute `pricing_attestation_hash = poseidon(slot, input_mint, output_mint, price_numerator, price_denominator)`.
3. Reconstruct `accepted_root` from `tree_state.recent_roots`. Reject if absent.
4. Verify Groth16 proof against `public_inputs_hash`, which encodes `(accepted_root, input_nullifier, output_commitment, new_leaf_index, new_root, memo_ciphertext_hash, pricing_attestation_hash, slippage_bps)`.
5. Reject if `input_nullifier` already in set; otherwise append.
6. Update tree state: insert output_commitment, push new_root.
7. Append memo to memo_log.
8. Emit `SwapEvent { leaf_index, root }`. **No fields revealing asset, amount, or even direction.**

The program does not move tokens at swap time. The pool's per-asset balance is in operator-controlled rebalancing accounts that drift over time, settled by a separate batched operation — see X4 below.

Effort: 2–3 weeks, depends on Groth16 verifier from shield-W6 and Pyth/Switchboard CPI integration.

### X4. Pool rebalancing — the operator's only on-chain swap

This is the hard architectural piece that makes Target A work. The pool is *a portfolio*, not a per-user wallet. Every user's note represents `(asset, amount)` claims against that portfolio. Real swaps with the venue happen at the *portfolio* level, not the user level, and not in lockstep with user actions.

Two-part design:

- **User swap (X3):** internal asset transition. Pool's USDC balance goes up by `input_amount`, pool's SOL balance goes down by `output_amount`. No external trade. User's note is updated.
- **Operator rebalance (X4):** when the pool's SOL balance gets too low (or USDC gets too high), the operator submits a separate `TAG_REBALANCE` instruction that:
  - Reads the on-chain oracle.
  - Submits a venue swap (Jupiter aggregator) via CPI in the same transaction.
  - Updates the pool's per-asset balances.
  - Verifies the venue's actual output is within `MAX_REBALANCE_SLIPPAGE_BPS` of the oracle price.

Privacy properties:

- Individual user swaps reveal nothing on chain — just `SwapEvent { leaf_index, root }`. No amount, no asset, no direction.
- Operator rebalances are public — they show "Vanta moved $50k USDC for SOL on Jupiter today" — but cannot be linked to any individual user. The rebalance is the sum of *many* user swaps over the rebalance window.
- The rebalance frequency is a privacy parameter. Rebalance every block: each rebalance ≈ each swap, and individual swaps leak through timing. Rebalance once a day: total privacy of individual swaps, but the pool needs enough buffer to never run dry within a day.

Operator MEV: the operator controls the timing and route of the rebalance, so they can capture some MEV. Not great but unavoidable for any operator-managed pool. Mitigation: give the rebalance a public schedule (e.g. every N slots), publish the route and signed pre-swap quote, and let watchers verify that the operator picked among the top-K Jupiter routes.

Effort: 2 weeks to design the rebalance contract + 1 week to implement + 1 week of bookkeeping (per-asset balance accounts).

### X5. Replace the mock prover and operator validation

Same as send-S4. Wire `@aztec/bb.js` (or a Groth16 prover via snarkjs) into the browser. Make the operator's `/private-core/swap-proof` and `/private-core/swap-transition` actually verify Groth16 instead of doing SHA-256 hash comparison. Same Groth16 verifier as shield/send, different verifying key per circuit.

Effort: shared with send-S4, no incremental cost.

### X6. Quote/route privacy in the rebalance

The rebalance is the only on-chain venue interaction. Two design knobs to keep it from leaking individual users:

- **Batch size and timing.** Configure rebalance frequency low enough that each rebalance is the aggregate of ≥ N user swaps. Publish the schedule.
- **Route obfuscation via Jupiter's "exact output" quoting.** The rebalance asks Jupiter for "give me X SOL for at most Y USDC" rather than "swap exactly Y USDC for SOL", so the venue sees a target amount that doesn't reveal which user-side amounts contributed.
- **Multiple liquidity wallets.** Rather than one `liquidityKeypair`, rotate among a pool of operator-controlled wallets so a chain observer can't trivially track Vanta's full footprint by watching one address.

These are operational mitigations, not cryptographic guarantees, but they're the right shape for a Target A pool. None of them exist today.

---

## Where the existing code helps

- `src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts` — the per-field encoding declarations are useful as scaffolding once the circuit is rewritten.
- `vanta_private_core_single_note_swap` — the Merkle membership + nullifier derivation portions are correct; lift them into the new `vanta_private_pool_v2_swap_entry` circuit. Drop the additive comparisons and the dead `sender_secret_stub` line.
- `operator/jupiter-sol-to-shielded-route-adapter.mjs` — the Jupiter API integration and quote storage are useful for the rebalance worker (X4). The user-facing route adapter goes away in Target A; the same code becomes the operator's batched rebalancer.
- `operator/swap-auth.mjs` — the Ed25519 signed-intent verification is the right shape for an operator-side authn boundary; just stop relying on the intent's economic terms (those move into the proof) and start using it only for rate limiting and abuse protection.
- `src/zk/canonicalLifecycleLinkage.ts` — same as send; useful diagnostics, stops being load-bearing for security.

## What to delete or quarantine

- **Keep fresh Swap memos on the v2 AEAD path.** The original plaintext swap memo issue is locally remediated for fresh helpers; keep the guard green while X1–X3 ship.
- **Disable the `operator-usdc-sol` and `operator-sol-to-shielded` execution modes** in `shieldedSwapCapability.ts` until X4 (the rebalance contract) is real, OR explicitly down-rank the product to Target C and remove the "private swap" framing from user-facing copy. Today the page says "swap" and the user can't tell whether their trade is operator-custodial or programmatic.

  **Codex status, 2026-05-11:** remediated locally through the Target C branch rather than disabling the beta routes. `shieldedSwapCapability.ts` now marks configured `operator-usdc-sol` and `operator-sol-to-shielded` routes as `target-c-operator-visible-beta` with `programmaticPrivateSwapReady: false`, `custodyModel: "operator-custodial-liquidity"`, and operator-visible route truth copy. The Swap page and token availability labels now surface that operator-visible/custodial status, `swapTrustContract.ts` names the lane `Target C operator-visible Swap beta`, and site roadmap copy no longer presents today's lane as broad `Private Swap`. Guard: `npm run swap:capability-check`.
- Keep the `sender_secret_stub` removal guarded. The local branch replaced the dead self-equality with a nonzero sender-secret witness liveness guard; final in-circuit owner auth remains open.
- Keep the additive asset-inequality bypass guarded. The local branch replaced the additive limb-sum check with limb comparison and added a sum-collision fixture; a fuller circuit rewrite should still use production-grade asset identity and ownership constraints.
- Lock down the `liquidityKeypair` env loading to refuse to start unless the keypair is wrapped (e.g., behind an HSM signer). A plain JSON keypair in env is the worst pattern for a wallet that holds liquidity for swaps.

  **Codex status, 2026-05-11:** remediated locally for the Jupiter SOL-to-shielded adapter's production boot boundary. `operator/jupiter-sol-to-shielded-route-adapter.mjs` now treats raw liquidity keypair JSON/path envs as local-only, refuses production startup when either raw keypair env is present, exposes `liquiditySignerMode` / signer-policy fields in `/health`, and documents `VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF` as the production boundary. Guard: `npm run swap:jupiter-sol-to-shielded-adapter-check`.

## Order of operations and rough effort

| # | Workstream | Effort | Depends on |
|---|---|---|---|
| 1 | **Interim**: AEAD-wrap the swap memo | 1–2 days | nothing |
| 2 | X2 (sealed swap memo with output-note plaintext) | 2–3 days | shield W2 |
| 3 | X1 (rewrite swap circuit at depth 20 with oracle attestation + range-checked slippage) | 1–2 weeks | shield W1, send S1 |
| 4 | X5 (real prover) | shared with send S4 | X1 done, shield W7 done |
| 5 | X3 (on-chain swap instruction) | 2–3 weeks | shield W4, shield W6 |
| 6 | X4 (rebalance instruction + per-asset accounting) | 4 weeks | X3 done |
| 7 | X6 (rebalance privacy operations) | 1 week | X4 done |

Total: about 10–12 calendar weeks for swap on top of the shield and send foundations. Realistically, swap is the last lane to ship — both because it depends on the others and because it is the lane where getting it wrong loses real money fastest (the liquidity wallet model is one operational mistake away from total loss).

## Concrete first commit for Codex (swap-side)

> **Completed locally for fresh helpers: `vanta:swap-note:v2:` memos are AEAD-sealed to the user's own viewing key, plaintext fields move into the sealed body, and `extractMemoPayload` callers attempt v2 decryption before falling back to historical v1. Keep the guard while X1/X3/X4 finish.**

This is the same one-day fix as the send-side first PR, applied to swap. It does not address the architectural problems, but it closes the largest fresh user-memo privacy leak: the plaintext broadcast of every swap's input/output asset, amount, venue, and quote ID.

Pair it with two small repairs:

- Delete the no-op `sender_secret_stub` assertion from `vanta_private_core_single_note_swap/src/main.nr` so the false ownership-check signal goes away.
- Add a CI check that fails if `liquidityKeypair` env vars are present in any production deployment manifest under `operator/render-*` until X3+X4 ship.

## Files most directly impacted

- **Circuit:** `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr` (new production-facing successor target: `vanta_private_pool_v2_swap_entry`), with `zk/noir/vanta_private_core_single_note_swap/src/main.nr` kept as an active-v0 legacy compatibility lane while current Swap flows depend on it. Migrate or delete only after replacement coverage is reviewed.
- **Memo:** `src/solana/vantaShieldState.ts:createPreparedSwapMemo` and `extractMemoPayload`-with-`VANTA_SWAP_MEMO_PREFIX`.
- **Live bridge:** `src/zk/liveSwapBridge.ts` — diagnostics-only, no security role.
- **Proof boundary:** `src/zk/vantaPrivateCoreSwapProof.ts` (already shaped right; flip `proofSystem` once X5 lands).
- **Operator:** `operator/unshield-server.mjs` swap endpoints (real Groth16 verify), `operator/swap-auth.mjs` (downgrade to authn-only), `operator/jupiter-sol-to-shielded-route-adapter.mjs` (re-cast as operator-internal rebalance worker).
- **On-chain:** `programs/vanta_private_pool_v2_spend/src/lib.rs` — add `TAG_SWAP = 4` and `TAG_REBALANCE = 5`, share the verifier with shield/send.
- **New:** `programs/.../oracle_view.rs` — Pyth/Switchboard CPI helper.

## Cross-lane summary

After all three deep dives, the unifying observation is that **none of the three lanes today produce or verify a real ZK proof on chain**. Fresh local action memos no longer leak full economic terms as plaintext Solana memo bytes, but historical v1 records, operator/status metadata, venue execution, recipient discovery, and production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces remain unresolved. The crypto, the circuits, and the on-chain program all exist, but they still are not wired together as a single end-to-end production pipeline.

The minimum repair that moves the project from "custodial app with privacy theming" to "alpha-but-real shielded pool" is:

1. **One canonical Poseidon note schema** used by every lane (shield W1).
2. **One key hierarchy** derived from the wallet (shield W2).
3. **One on-chain program** with a real Merkle tree, real Groth16 verifier, real PDA-owned vault — and three instructions (shield, send/swap, unshield) sharing the same verifier and tree (shield W4 + W6 + send S3 + swap X3).
4. **One indexer** that decrypts memos and provides Merkle paths for proof generation (shield W5).
5. **Real proofs in the browser** via `@aztec/bb.js` (shield W7).

Once those five blocks exist, all three lanes become small variations on the same template. Today they are five disconnected piles of code, each plausibly architected, none plumbed end-to-end.

---

# Unshield Lane — Deep Dive

Unshield is the exit boundary. It's where shielded notes turn back into liquid SPL tokens or SOL in a real wallet. It's also the place where the operator's full custody of every dollar deposited into Vanta is most clearly visible in the code, because release of funds is a signed SPL transfer authored by the operator's own keypair.

## How unshield works today

Two paths, both ending at `operator/unshield-server.mjs`:

- `POST /unshield` — for SPL tokens (USDC, USDT, etc.).
- `POST /unshield/sol` — for native SOL.

The trace, end-to-end, when a user clicks *Unshield*:

1. **Note picking.** The browser picks a shielded note (or chain of transitioned notes) the user owns. It computes a `consumedNoteId` and a `transitionNoteId`.
2. **Optional spent-marker memo.** Before the action-memo feedback loop, some flow shapes wrote a Memo program instruction with prefix `vanta:unshield-note:v1:` (and a `spent-marker` for the predecessor) using the same plaintext-JSON design as send and swap. Fresh local helpers now emit v2 AEAD ciphertext, but historical v1 records and the public exit transfer still reveal important linkage.
3. **Intent construction.** `src/solana/unshieldAuth.ts:createUnshieldIntentPayload` builds an `UnshieldIntentPayload` containing `amount, destinationOwner, mintAddress, owner, requester, vaultOwner, noteId, transitionNoteId, requestId, issuedAt`.
4. **Signing.** In the original review, the intent could be signed in two modes: `signUnshieldIntent` with a real Ed25519 signature, or `createTransitionAuthorizedUnshieldIntent` with the literal `signature: "transition-authorized"` sentinel. The local branch has since removed the sentinel path from browser and operator auth; public exits should now use wallet-signed intents.
5. **Operator submission.** Browser POSTs the signed intent to `/unshield` (or `/unshield/sol`). The handler in `operator/unshield-server.mjs:1738` runs through:
   - `parseSignedUnshieldIntent` validates the shape and version.
   - Asserts `intent.owner === intent.requester === intent.destinationOwner`. **The user can only unshield to themselves.** No "unshield to a different wallet" capability exists in this code path.
   - Asserts `intent.vaultOwner === vaultOwner` (the operator's configured single vault).
   - `assertFreshUnshieldIntent(intent)` — checks `issuedAt` is within `VANTA_UNSHIELD_INTENT_TTL_MS` (5 minutes).
   - `verifySignedUnshieldIntent(intent)` — Ed25519 verify against `intent.requester`; the old `"transition-authorized"` literal acceptance path has been removed locally.
   - Replay checks against in-memory sets and a JSON-backed `releaseRecords` store keyed by `requestId`, `noteId`, `transitionNoteId`.
6. **On-chain context check.** For the wallet-direct path, `fetchConstrainedOnchainUnshieldContext` reads the user's shield notes from chain memos (`VANTA_SHIELD_MEMO_PREFIX_V2`) and verifies the requested amount is consistent with what the user has shielded minus what they've already unshielded. The old transition-authorized polling path should be treated as historical review context, not the current authorization boundary.
7. **Vault keypair load.** `loadKeypairFromEnv(vaultSignerSecretKeyEnvName)` loads the **operator's vault keypair from environment variable**. The operator asserts `keypair.signer.address === vaultOwner` — confirming that the operator IS the vault custodian.
8. **Release transfer.** The operator builds and signs an SPL transfer from `vaultOwner` to `destinationOwner` for `intent.amount`, signed by the vault keypair. For SOL: `SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: new PublicKey(intent.destinationOwner), lamports })` followed by `sendAndConfirmTransaction`. For SPL: `client.helpers.splToken(...).sendTransfer({...})`.
9. **Release receipt.** Operator returns a typed receipt:
   ```ts
   {
     kind: "vanta-unshield-operator-release-receipt-v1",
     proofStatus: "not-provided-wallet-authorized-public-exit"
                | "not-provided-wallet-signed-transition-public-exit",
     replayStatus: "accepted-first-use",
     spendabilityBasis: "canonical-spendable-note-ledger",
     ...
   }
   ```
   The receipt openly declares **`proofStatus: "not-provided"`**. The operator is honest in code that no proof is verified for this release - the current public-exit boundary is the user's wallet signature on the intent text, not the removed literal `"transition-authorized"` sentinel.
10. **Local bookkeeping.** `src/zk/liveUnshieldBridge.ts:recordCanonicalUnshieldFromLiveUnshield` writes the unshield to localStorage, same redaction-on-persistence pattern as the send/swap bridges.

## What's actually private and what isn't

| Property | Visible on chain? | Visible to operator? |
|---|---|---|
| Sender's wallet | Yes (intent signer + memo signer + destination) | Yes |
| Destination wallet | Yes (always equal to sender) | Yes |
| Asset (USDC mint or SOL) | Yes | Yes |
| Amount | Yes | Yes |
| Linkage to original shield | Legacy v1: memo plaintext + amount + timing. Fresh v2: destination/self-exit, transfer amount, timing, and operator records still leak linkage. | Yes |
| Vault wallet | Yes (always the same address) | Yes |

The unshield lane is a regular SPL transfer from the operator's vault to the user's wallet. The destination wallet is constrained to be the user's *own* wallet — there is no "private exit to a fresh address" capability. So the chain shows: deposit from wallet X → operator vault → withdrawal to wallet X. **No anonymity at all.** Anyone with chain history can trivially link every deposit to every withdrawal.

This is by design in the current code: `intent.destinationOwner !== intent.requester` is rejected as "Invalid authenticated unshield request." The product copy might call this "private exit"; the code calls it "wallet-authorized public exit" in the receipt's `proofStatus` field. The code is telling the truth and the copy isn't.

## What the operator actually does

The operator is the entirety of the unshield lane's enforcement. Specifically:

- **Holds the vault keypair.** `vaultSignerSecretKeyEnvName` is loaded into memory at startup. The operator asserts that `signerAddress === vaultOwner`, so the operator IS the entity holding all deposited funds. There is no PDA, no on-chain program-owned vault. The `vaultOwner` configured in `shieldConfig.ts` is a regular Solana wallet whose private key is in operator env. Whoever has the env can drain the vault with a single SPL transfer.
- **Validates intent shape.** `parseSignedUnshieldIntent` enforces field types and version.
- **Validates intent freshness.** 5-minute TTL.
- **Verifies wallet signature.** Ed25519 over the human-readable intent text. This proves the requester's wallet authorized the message — but does NOT prove the requester owns the shielded note.
- **Tracks replay state.** In-memory `processedRequestIds`, `processedNoteIds`, `processedTransitionNoteIds` plus a `release-record-store.mjs` JSON file. If the operator restarts without that file, the dedup state is gone. **A replay window opens on every operator deploy.**
- **Validates eligibility.** Either via `fetchConstrainedOnchainUnshieldContext` (reads the user's shield memos and totals the un-unshielded balance) or via `waitForEligibleUnshieldTransition` (waits for the transition memo to settle).
- **Signs the SPL/SOL transfer.** With its own keypair.

There is **no Groth16 verifier**, **no Merkle root check**, **no on-chain program touched**. The unshield endpoint never reads from `programs/vanta_private_pool_v2_spend` or any other Vanta program. The Solana transaction it submits is a vanilla SPL transfer with no Vanta-program instruction at all.

## The Noir circuit

`zk/noir/vanta_private_core_single_note_unshield/src/main.nr` exists and is more substantial than the send/swap entry circuits:

- **Real Merkle membership.** `compute_root(leaf, membership_path, direction_bits) == state_root` is asserted. Good.
- **Real nullifier derivation.** The original reviewed state used `nullifier = poseidon(note_secret, note_nonce, state_root, leaf)`. The current local lane now also binds the Poseidon proof-owner key into that nullifier.
- **Leaf-index consistency check.** `compute_leaf_index(direction_bits) == leaf_index` — also good.
- **Bound consume-context tag and economics hash** in the public inputs.

At review time it inherited the recurring problems and added one of its own:

- `MERKLE_DEPTH = 3` (audit item 5 — the maximum 8 leaves per tree means no anonymity set).
- The `(hi, lo)` sibling split that contributes nothing (audit item 9).
- The `is_current_right` baked into the node hash (audit item 10).
- And, **like the swap circuit, a dead "owner auth" assertion**:
   ```rust
   let owner_auth_placeholder =
       owner_secret_key_hi + owner_secret_key_lo + owner_public_key_hi + owner_public_key_lo;
   assert(owner_auth_placeholder == owner_auth_placeholder);
   ```
   The comment is unusually candid: *"v0.1 assumption: owner authorization remains prechecked off-circuit. Keep the witness material live in the circuit surface for the later in-circuit owner-auth upgrade."*

   So the reviewed circuit took `owner_secret_key_hi/lo` as a witness, **did nothing with it**, and explicitly deferred ownership authorization to the operator's wallet-signature check. As a result, that reviewed version **did not prove note ownership.**

**Codex status, 2026-05-10:** locally remediated for the current Unshield proving lane. `vanta_private_core_single_note_unshield` now derives `owner_public_key_lo = poseidon2(owner_secret_key_hi, owner_secret_key_lo)`, requires `owner_public_key_hi = 0`, binds that proof-owner key into the proving note commitment and nullifier, and adds an `invalid-owner-secret` fixture that fails at the owner-key assertion. The app/operator witness path preserves the source X25519 owner key separately as `source_owner_public_key_*` and continues to precheck the X25519 source-owner relation off-circuit. Residual caveat: this is a Poseidon proof-owner binding, not an in-circuit proof of X25519 ownership; strict no-witness production owner authorization and on-chain release enforcement remain open.

The reviewed circuit was also not wired into the legacy/operator-direct `/unshield` path. The release-receipt's historical `proofStatus: "not-provided-..."` made that explicit. The current Private Core proof lane now has `/private-core/unshield-proof` and proof-backed consume checks; the remaining warning is narrower: the legacy direct `/unshield` custody/release path must not be described as the same thing as the Private Core verified proof lane.

## The "transition-authorized" path

This deserves special attention as historical context because it was an alternate authorization mode that bypassed Ed25519 signatures entirely. The local branch has since removed the browser and operator sentinel path.

`createTransitionAuthorizedUnshieldIntent` constructed an intent with `signature: "transition-authorized"` — the literal string, not a signature. The intent was accepted by the operator if it had a `transitionStateSignature` referencing a prior on-chain transition (a send memo, swap memo, or similar) where the user's wallet was the signer.

The reasoning behind this mode appeared to be: if you've already chained your notes through a series of operator-acknowledged transitions, your final unshield doesn't need a fresh wallet signature — your historical transitions stand in for it. From a UX standpoint that avoided one wallet popup. From a security standpoint it widened the trust boundary: the operator trusted that any prior transition record bound to the same wallet justified the release, and that nothing in the operator's records drifted between transitions.

The removed implementation had `assertEligibleDirectUnshieldRelease` (wallet-direct mode) and `waitForEligibleUnshieldTransition` (transition mode) taking different release decisions. A subtle bug in either eligibility check would have been a withdrawal-authorization bug. The current local code removes the literal transition-authorized branch; keep the guard because reintroducing two release authorization paths would reopen the same attack surface.

## Trust assumptions to be honest about

In addition to the trust assumptions inherited from shield (vault is custodial), send (fresh memos encrypted but no production proof/discovery boundary), and swap (operator is liquidity provider):

- **The vault keypair is the entire security model.** Every deposit ever made to Vanta sits in one wallet whose private key lives in an operator env var. If the env leaks, gets exfiltrated, gets sniffed by a CI logging accident, or the operator host is compromised, every dollar is gone. There is no on-chain program enforcement, no multi-sig, no PDA. (Audit item 13 cited the configured-fallback vault address `7yUf...rtdi`; this is the address whose private key the operator must hold.)
- **No proof of ownership.** The operator believes that the requester owns the note because the requester signed the intent with the same wallet that originally shielded the note. That's a chain-of-custody argument, not a cryptographic ownership proof. If a user's wallet is compromised, every note they ever shielded can be stolen even if the attacker never had access to any "viewing key" or "spending secret".
- **No replay protection at the protocol level.** Replay is enforced by an in-memory `Set` plus a JSON file (`release-record-store.mjs`). Operator restart + missing file = replay window. There's no on-chain nullifier set in this lane.
- **Destination is fixed to self.** Privacy of the exit is zero — every exit goes back to the original depositor. The `destinationOwner === requester` rule prevents unshielding to a fresh wallet, which is exactly what you'd need to break the chain-of-custody linkage. If product copy implies "exit privately to a new wallet," it's wrong.
- **`proofStatus: "not-provided"` is shipped to clients.** The operator's release receipt openly tells callers no proof was verified. This is the most honest field in the whole codebase. Any client validation logic that reads this field can refuse to treat it as production-private; the receipt sets a clear gate. Use it.

## What "unshield actually works" needs to mean

Three targets, same exercise as the other lanes.

**Target A — Real exit from a shielded pool with cryptographic ownership proof and on-chain release.** A shielded note is consumed via a Groth16 proof verified by the on-chain program. The proof binds (a) the nullifier, (b) Merkle membership of the note in an accepted root, (c) the destination wallet, (d) the exit amount, (e) ownership via the spending key. The on-chain program, not an operator keypair, signs the SPL transfer out of a program-owned PDA vault. The destination can be *any* fresh wallet, not just the original depositor. **Privacy parity with Tornado-style mixers.**

**Target B — Operator-mediated exit with real off-chain ZK.** Operator still custodies funds via a regular keypair, but the user must produce a real Groth16 proof against the off-chain commitment tree, including ownership, before the operator releases. Destination is allowed to be any wallet. The operator's role is reduced from "decides whether to release" to "executes a release that has already been authorized cryptographically". Operator can still rug, but at least the exit privacy is real and replay/double-spend are cryptographically guaranteed.

**Target C — What's deployed today.** Operator-signed SPL transfer to the user's own wallet, gated by an Ed25519 signature on a free-text intent and an in-memory dedup set. No proof. No anonymity.

The current code is shaped like A in the circuit and bookkeeping fields, but ships like C with the most candid `proofStatus: "not-provided"` admission in the receipt itself.

The rest of this section assumes **Target A**. Target B is interesting only as a bridge state — once you have Target A's circuit, going to A is mostly on-chain work; stopping at B is leaving custody risk in place permanently.

---

## Concrete build plan for Target A

Five workstreams. Mostly small once shield and send foundations exist.

### U1. Lock the unshield circuit

Replace `vanta_private_core_single_note_unshield/src/main.nr` with a circuit that actually proves what it needs to. Public inputs:

```rust
// Public inputs:
//   pool_id
//   accepted_root            — recent root of the pool's commitment tree
//   nullifier                — appended to nullifier set
//   exit_destination         — pubkey funds release to (any wallet, not just owner)
//   exit_asset_id            — must match the program's vault-asset registry
//   exit_amount              — released to destination
//
// Private witnesses:
//   note: (asset_id, amount, owner_pubkey, blinding, derivation_tag)
//   spending_secret
//   merkle_path: siblings[20], direction_bits[20]
//
// Constraints:
//   1. note.asset_id == exit_asset_id
//   2. note.amount == exit_amount   (full-note exit; partial exits split via send first)
//   3. note_commitment = poseidon(note fields)
//   4. Merkle membership of note_commitment under accepted_root
//   5. nullifier = poseidon(note_commitment, spending_secret, pool_id)
//   6. note.owner_pubkey == poseidon(spending_secret)  -- THIS IS THE OWNERSHIP PROOF
//      (the spending secret must derive the owner pubkey baked into the note;
//       this is what's missing today and what the dead `owner_auth_placeholder` line
//       was reserving space for)
//   7. exit_destination is bound into the public-input hash (so the on-chain
//      program can read it from instruction data and check it matches the proof)
```

Notes:

- **Drop `MERKLE_DEPTH = 3` for 20.** Drop the hi/lo sibling split. Drop the direction bit in the node hash (audit items 5, 9, 10).
- **Delete the `owner_auth_placeholder` line.** Locally done for the current proving lane with a Poseidon proof-owner key relation. The remaining Target A version still needs the final source/key-model decision and on-chain verifier/release enforcement.
- **Full-note exit only.** A note must be unshielded in full. Partial exits route through the send circuit first to split into (exit-portion, change-portion), then unshield the exit-portion. This mirrors UTXO design and keeps the unshield circuit minimal.
- **Bind `exit_destination` into public inputs.** The destination is part of the proof statement so it can't be swapped after the fact by anyone (operator, MEV bot, indexer). The on-chain program will read the destination from instruction data and check the proof's public-input hash includes it.

Effort: 1 week. The work is mostly back-porting the correct Merkle pattern from the actual_private_spend circuit, adding constraint #6, and updating the fixture.

### U2. On-chain unshield instruction
### U2.1 Native SOL TAG6 unshield proof request compatibility + wiring (2026-05-14 update)
Native SOL unshield proof request (VantaPrivatePoolV2UnshieldProofRequest) is asset-agnostic and accepts sentinel assetId in note; exitTermsCommitment + public input hash support lamports semantics (forward-compat for TAG6). See design doc Phase 3/4, native-sol-unshield-proof-request-check, sentinel-in-snapshot-check, tag6-wiring-check. Unified tree + sentinel commitments remain valid for future on-chain. No circuit changes. Strict fail-closed (productionCustodyReadyForSol false). Cross-ref 2026-05-14-native-sol-private-pool-v2-integration.md and status note.

Upgrades the current reserved fail-closed `TAG_UNSHIELD = 6` source ABI into a real release instruction. Target account list:

```
0. pool_state            (writable)
1. tree_state            (writable; provides recent_roots)
2. nullifier_set         (writable)
3. vault_token_account   (writable; PDA owned by the program)
4. destination_token_account  (writable; user-supplied)
5. destination_owner     (read-only; just used to verify the destination ATA)
6. mint                  (read-only)
7. token_program         (read-only)
8. signer                (signer; fee payer; can be ANYONE — typically a relayer)
```

Instruction data (after `tag = 6`):

```
nullifier:32
exit_destination:32
exit_asset_id:32
exit_amount:8 (le u64)
public_inputs_hash:32
proof_bytes:N (Groth16)
```

Program logic:

1. Reconstruct `accepted_root` from `tree_state.recent_roots[]` at the index encoded in `public_inputs_hash`. Reject if not present.
2. Verify Groth16 proof against `public_inputs_hash` (which encodes `accepted_root, nullifier, exit_destination, exit_asset_id, exit_amount`).
3. Verify `exit_asset_id` matches the program's registered asset for `vault_token_account.mint`.
4. Verify `destination_token_account.owner == exit_destination`.
5. Read `nullifier_set` and reject if `nullifier` already present. Append it.
6. CPI into the SPL Token program: signed by the program's PDA authority over `vault_token_account`, transfer `exit_amount` to `destination_token_account`. (For SOL: `system_program::transfer` from the SOL PDA.)
7. Emit `UnshieldEvent { nullifier, root }` for indexers. **No fields revealing destination, asset, or amount.** (Amount and asset are visible from the SPL transfer itself; that's unavoidable.)

Critical: **the signer is anyone.** A relayer can pay rent/fee for the unshield, which is the standard pattern for shielded pools. The relayer cannot grief because the proof is bound to `exit_destination`, so the relayer cannot redirect funds to themselves — they can only refuse to submit, which the user routes around by submitting themselves.

This eliminates the operator's vault keypair entirely. The vault is a PDA. There is no env-loaded private key in the unshield path.

Effort: 2 weeks, gated on shield W4 (vault PDA) and shield W6 (Groth16 verifier).

### U2-NS. Native SOL specifics for TAG6 (shield deposit into SOL PDA + unshield release from SOL PDA)

**Current vs Future (explicit per Future-Proofing & TAG6 Alignment subagent)**:
- Today: Native SOL shield = plain `SystemProgram.transfer` to operator `vaultOwner` wallet + `vanta:native-sol-shield-note:v2:` memo (kind="native_sol_shield"). Parallel non-v2 tracking. No program PDA. Unshield for SOL uses operator-signed path (still `operator-keypair-public-exit`).
- Future (real on-chain Private Pool v2 program): Native SOL uses program-owned SOL vault PDA (lamports holder). Shield deposits transfer directly into the PDA via SystemProgram (verified by future shield instruction). Unshield uses TAG_UNSHIELD=6 with PDA-signed `system_instruction::transfer`. Same commitment tree, proof model, indexer events, and nullifier semantics as SPL. Zero operator keypair in custody/release. "As private as possible": on-chain proof + program-owned custody.

**Data Model Assumptions (must match between current v2 integration and future on-chain)**:
- `asset_id` for native SOL = fixed sentinel (32 bytes, e.g. `[0u8; 32]` or `poseidon2(b"vanta-native-sol")`; **distinct** from SPL `poseidon2([mint_hi, mint_lo])`). Used in note commitments, vault asset PDA seeds `["vanta2asset", pool_state, sentinel]`, vault authority `["vanta2vault", pool_state, sentinel]`, unshield `exit_asset_id`, shield public inputs.
- Amount: lamports (u64), encoded as amount_lo/hi in circuit.
- Vault holding for SOL: dedicated SOL vault PDA (program-owned or authority-controlled; holds native lamports, not a Tokenkeg account). Registered with `asset_kind = VAULT_ASSET_KIND_SOL (=2)`.
- Note commitment, nullifier, owner_pubkey derivation, Merkle (depth 20, bn254 poseidon) identical to SPL path for unified tree (preferred for max anonymity set).
- Current integration (memo-based native SOL → v2 indexer commitment) **must** use the sentinel asset_id so produced commitments are valid in the future on-chain tree without migration.

**Future Shield Deposit into SOL PDA (complements W4 on-chain shield instruction)**:
- Future shield instruction (TAG_SHIELD or extension) account list (native SOL variant; generalized from SPL W4):
  ```
  0. pool_state (writable)
  1. tree_state (writable)
  2. memo_log (writable)
  3. depositor (signer)
  4. sol_vault_pda (writable; PDA ["vanta2solvault", pool_state, NATIVE_SOL_ASSET_ID_SENTINEL] or generalized vault authority; holds lamports)
  5. system_program (read-only)
  ```
- Instruction data includes deposit_amount (lamports), public_inputs_hash (binds asset_id=sentinel, amount, commitment, previous_root, new_root, leaf_index, memo_hash), proof, encrypted_memo.
- Program logic (SOL branch):
  1. Verify proof + root transition.
  2. Verify `SystemProgram.transfer` instruction (or post-lamports on sol_vault_pda) matches deposit_amount and targets the PDA.
  3. Append commitment, update tree, append to memo_log.
  4. Emit `ShieldEvent { commitment, leaf_index, root }` (minimal; indexer correlates with on-chain System transfer to known PDA for SOL).
- No SPL token CPI; pure system transfer. Custody: program-owned from the first lamport.

**Future Unshield Release from SOL PDA (TAG_UNSHIELD = 6 extension)**:
- Upgrade current reserved fail-closed `process_unshield` (returns ERR_UNSHIELD_RELEASE_NOT_WIRED after preflight) to full PDA-signed release.
- Generalized account list for TAG6 (SOL variant; see U2 base + asset_kind branch):
  ```
  0. pool_state (writable)
  1. tree_state / root_history (readonly for recent roots)
  2. root_record (readonly)
  3. nullifier_marker (writable PDA)
  4. vault_authority (PDA; signer for release; seeds ["vanta2vault", pool_state, exit_asset_id])
  5. vault_asset (readonly; registry record for sentinel, kind=SOL, releaseEnabled=1)
  6. sol_vault_pda (writable; the lamports-holding PDA, owned by program or authority)
  7. destination (writable system account; user's SOL wallet)
  8. system_program (read-only)
  9. verifier_key (readonly)
  ```
  (No mint, no token_program, no destination_token_account for SOL kind.)
- Instruction data (after tag=6): nullifier:32, exit_destination:32, exit_asset_id (=sentinel):32, exit_amount:8 (lamports le u64), public_inputs_hash:32, verifier_key_hash:32, proof: (Groth16).
- Program logic (in `process_unshield`, after common preflights; branch on `asset_kind` from vault_asset record or exit_asset_id == sentinel):
  1. Reconstruct/verify accepted_root from tree.
  2. Verify Groth16 proof against public_inputs_hash (binds nullifier, exit_asset_id=sentinel, exit_amount, exit_destination, root).
  3. Verify vault_asset record for sentinel + kind=SOL + releaseEnabled.
  4. Verify destination is valid system account (owner == system_program or rent-exempt check).
  5. Nullifier not present → mark consumed.
  6. **CPI release**: `system_instruction::transfer(sol_vault_pda, destination, exit_amount)` — PDA signs via seeds (vault_authority or sol_vault_pda seeds). No token CPI.
  7. Emit `UnshieldEvent { nullifier, root }` (identical for SOL/SPL; privacy-maximal, no asset/amount/dest in event. On-chain System transfer log makes amount public, unavoidable).
- `require_vault_asset_record`, `require_spl_release_accounts` (rename/generalize to `require_release_accounts`) must branch: SPL uses token CPI + mint/token_account checks; SOL uses system_program + PDA lamports check. Add `VAULT_ASSET_KIND_SOL: u8 = 2;`, `NATIVE_SOL_ASSET_ID_SENTINEL` consts, and `ERR_*_SOL_MISMATCH` errors.
- `TAG_REGISTER_VAULT_ASSET = 7` extended to support kind=SOL registration (no token_program validation, vault_holding_pda = sol_vault_pda, releaseEnabled flag).

**Indexer / Event / Store Implications**:
- Indexer (operator/private-pool-v2-indexer-server + role snapshot stores) listens for ShieldEvent/UnshieldEvent from program logs. For native SOL, correlates events with SystemProgram transfers to the known SOL vault PDA (derived from sentinel).
- `vantaPrivatePoolV2RoleSnapshotStore` stores native SOL commitments/nullifiers using sentinel asset_id (unified or SOL-partitioned tree; unified preferred).
- Client proof builders (Private Pool v2 entry circuits) already support asset_id; ensure native SOL unshield/send/swap requests pass sentinel.

**Forward-Compatibility Recommendations (small changes now)**:
- Define `VANTA_NATIVE_SOL_V2_ASSET_ID_SENTINEL` (or bytes constant) in `src/solana/vantaShieldState.ts` and operator/vanta-onchain-state.mjs; use it for v2 native SOL note ingestion/commitments (decouple from WSOL mint used in routing).
- In `programs/.../src/lib.rs`: add `const VAULT_ASSET_KIND_SOL: u8 = 2;`, `const NATIVE_SOL_ASSET_ID_SENTINEL: [u8;32] = [0;32];` (or spec value), TODO comments in process_unshield / require_* for SOL branch, and test harness entries. This makes the fail-closed preflight surface ready for the SOL kind without changing behavior today.
- In custody check script and unshield status: add native-SOL-specific blockers ("native-sol-program-owned-vault-pda-not-deployed", "tag-unshield-sol-kind-not-wired").
- Ensure v2 indexer/parser for native SOL memos (the current integration work) produces commitments using the sentinel so they are future-compatible.

**Guardrails**:
- Never promote `productionCustodyReady` or "programmatically private" for native SOL until on-chain TAG6 release + PDA + live proof-verified evidence + reviewed SBF for SOL kind.
- All status/trust surfaces must name the sentinel, the system CPI path, and the PDA derivation explicitly (current vs future).
- This subagent work ensures the native SOL v2 ingestion (per the 2026-05-14 integration plan) produces on-chain-compatible state.

This subsection extends the TAG6 wiring plan (U2 base + W4 shield) with the exact native SOL account shapes, CPI, branching logic, and data model required for "one program, one tree, one release mechanism" including native SOL.

### U3. Replace the plaintext unshield memo

Same fix as send-S2 and swap-X2. Before the action-memo feedback loop, `vanta:unshield-note:v1:` wrote plaintext JSON via the same `createMemoInstruction` helper. Fresh unshield and SOL-unshield helpers now emit v2 AEAD ciphertext sealed to the user's viewing key, while parsers keep v1 plaintext fallback for historical chain records.

In Target A, the memo is optional - the on-chain `UnshieldEvent` is enough for the indexer to track activity. But the memo is still useful because the viewing-key-encrypted body lets the user reconstruct their own exit history from chain alone. Keep fresh memos encrypted and add per-lane body-hash commitment discipline plus production discovery discipline before claiming more.

Effort: 1–2 days.

### U4. Delete the "transition-authorized" path

The literal `"transition-authorized"` alternate-auth path is now removed locally. Target A still needs the stronger end state: note ownership proven cryptographically (constraint #6 in U1), no historical-transition authorization shortcut, and the operator's `/unshield` endpoint becoming a thin relayer service rather than an authorization service.

Specifically:

- Delete `createTransitionAuthorizedUnshieldIntent` from `unshieldAuth.ts` and every call site.
- Delete the `isWalletDirectUnshieldIntent` / `assertEligibleDirectUnshieldRelease` vs. `waitForEligibleUnshieldTransition` branching in `operator/unshield-server.mjs`. Both become irrelevant.
- The `intent.signature` field can be dropped entirely — if the proof is real and the destination is bound into it, the operator doesn't need a separate wallet signature on the request.
- Remove the `intent.owner === intent.requester === intent.destinationOwner` constraint. With Target A, the destination is whatever the user proved into. No off-chain identity check needed.

Effort: 1–2 days, mostly deletion.

### U5. Operator becomes a relayer, not a custodian

The operator's role for unshield reduces to:

- Receive the user's signed transaction (which already contains the proof and the unshield instruction).
- Pay the priority fee / rent.
- Submit the transaction to Solana.
- Return the signature and a thin receipt.

That's it. The operator can also serve as a transaction-batcher (combining multiple users' unshields into one Solana transaction for compute-unit efficiency) or as a privacy-enhancing delay layer (queueing unshields and submitting them at randomized times to break timing correlation), but neither is custody.

The vault keypair env loading goes away. The `loadKeypairFromEnv(vaultSignerSecretKeyEnvName)` call is deleted. The release-record-store can stay as a metrics/audit log but stops being a security-critical replay guard (the on-chain nullifier set is the source of truth).

Effort: 3–5 days. The bulk of the work is rewriting `operator/unshield-server.mjs` from "custody server" to "relayer + audit log."

---

## Where the existing code helps

- `src/zk/vantaPrivateCoreUnshieldProof.ts` — extensive field encoding, identical pattern to the send proof. The current local branch now keeps source X25519 owner-key metadata separate from the Poseidon proof-owner key used by the Noir lane.
- `vanta_private_core_single_note_unshield/src/main.nr` — the local branch has deleted the dead `owner_auth_placeholder`, added the proof-owner key relation, fixed depth to 20, and uses standard Poseidon node hashing. Remaining Target A work is on-chain verifier/release enforcement and the final source-owner key model.
- `operator/release-record-store.mjs` — stays useful as an audit/metrics log, just stops being a security boundary.
- The `proofStatus: "not-provided"` field in the release receipt — KEEP this. After Target A, set it to `groth16-bn254-verified-onchain` or similar; clients can refuse anything other than the verified value. The fact that the field exists with self-disclaiming defaults is actually good practice that should survive.

## What to delete or quarantine

- **Keep fresh Unshield memos on the v2 AEAD path.** Same as send and swap: the original plaintext memo issue is locally remediated for fresh helpers, while per-lane proof-bound ciphertext discipline and production verifier enforcement remain open.
- **Keep the transition-authorized path removed.** The local branch removed the browser/operator sentinel path; every current public-exit request should require a real Ed25519 wallet signature until the real proof path replaces the custody model.
- **Mandate vault keypair rotation before launch.** As long as Target A isn't shipped, the configured `vaultOwner` private key is the entire security model. Rotate it on a schedule, never reuse keys across environments, and audit who has env access.
- **Add a safety check that refuses unshield if `proofStatus !== "verified"`** in user-facing copy. Today the field says "not-provided" and the UI renders the unshield as if it were a private exit. Make the copy match the field.
- **Refuse to start the operator** if `VANTA_VAULT_SIGNER_SECRET_KEY` (or whatever the env var is named) is set in a production deployment manifest, after Target A ships. The vault key in env is a Target C artifact; production should never have one.

## Order of operations and rough effort

| # | Workstream | Effort | Depends on |
|---|---|---|---|
| 1 | **Interim**: AEAD-wrap unshield memo + delete transition-auth path | 2 days | nothing |
| 2 | U1 (rewrite circuit at depth 20 with real ownership constraint) | 1 week | shield W1 (Poseidon note schema) |
| 3 | U3 (sealed unshield memo) | 1–2 days | shield W2 |
| 4 | U2 (on-chain unshield instruction with PDA-signed transfer) | 2 weeks | shield W4, shield W6 |
| 5 | U5 (operator → relayer transition) | 3–5 days | U2 done |
| 6 | U4 (delete transition-auth path) | 1–2 days | U2 done; can be done earlier as the interim |

Total: about 4–5 calendar weeks for unshield on top of the shield foundations. Notably, this is the *cheapest* of the four lanes to ship if you've already done shield W1+W4+W6, because the unshield circuit is the simplest (one input, no outputs in the tree, just a nullifier append) and the on-chain instruction is the simplest (one CPI to SPL Token).

The real reason to ship unshield first after shield is **that it removes the vault keypair from operator env**. As long as that keypair exists, every other privacy improvement is on top of a pile of TNT. Closing the custody hole is the highest-leverage single thing the project can do.

## Concrete first commit for Codex (unshield-side)

Two parallel one-day fixes that together close the largest practical issues without depending on anything else:

> **Completed locally: unshield/SOL-unshield memos now use v2 AEAD, and `createTransitionAuthorizedUnshieldIntent` plus the `"transition-authorized"` literal-signature acceptance branch were removed. Keep the regression guard so every unshield request requires a real Ed25519 signature.**

This closes the fresh plaintext leak and eliminates the alternate-authorization attack surface. It does not touch the proof path or the custody model - those still need U1 + U2 + U5 - but it removes the easiest exploits that a non-cryptographic attacker could go after today.

**Codex status, 2026-05-14 Unshield direct-release auth cleanup:** commit `de63608` locally closes the remaining operator-side alternate Unshield release branch without changing the current custody model. Token and SOL Unshield signed-message formats no longer carry `transitionStateSignature`; the operator parsers reject that obsolete field fail-closed; `/unshield` and `/unshield/sol` now require `transitionNoteId === direct:<consumed note>` before running the direct on-chain eligibility checks; and the operator-side `waitForEligibleUnshieldTransition`, `verifyUnshieldTransitionBySignature`, `assertEligibleUnshieldTransition`, `assertEligibleSolUnshieldTransition`, stale Unshield memo lookup, and `not-provided-wallet-signed-transition-public-exit` receipt branch are removed. New guard: `npm run unshield:direct-release-auth-check`, wired into `npm run truth:privacy-claim-gate` and `npm run zk:review-guards-check`. Red-first verification failed before the cleanup with `browser token unshield auth must not preserve transition-state-signature release authorization`; after implementation, verification passed locally with `npm run unshield:direct-release-auth-check`, `npm run unshield:public-exit-surface-check`, `npm run unshield:safe-send-adoption-check`, `npm run unshield:sol-operator-endpoint-check`, `npm run wallet:message-intent-adoption-check`, `npm run private-core:unshield-committed-settlement-check`, `npm run private-pool-v2:onchain-unshield-custody-check`, `npm run private-pool-v2:unshield-proof-request-check`, `npm run unshield:balance-ledger-check`, `npm run unshield:trust-packet-check`, `npm run mainnet:unshield-production-check`, `npm run private-core:operator-no-witness-check`, `npm run private-core:operator-status-endpoint-check`, `npx tsc --noEmit --pretty false`, `npm run build`, `npm run truth:privacy-claim-gate`, `npm run zk:review-guards-check`, and `git diff --check`. This is direct-release auth hardening and guard wiring only; it is not Target A, not proof-verified on-chain release, not program-owned vault custody, not operator-to-relayer migration, not destination-to-fresh-wallet support, not Unshield production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

Pair this with adding a CI assertion that fails the build if `vaultSignerSecretKeyEnvName` appears anywhere in `operator/render-*` deploy manifests after the U2 milestone — same pattern as the swap-side `liquidityKeypair` lockdown.

## Files most directly impacted

- **Circuit:** `zk/noir/vanta_private_core_single_note_unshield/src/main.nr` (rewrite at depth 20; add ownership constraint).
- **Memo:** `src/solana/vantaShieldState.ts:createPreparedUnshieldMemo` and `createPreparedSolUnshieldMemo` (replace JSON with AEAD), plus the matching `extractMemoPayload` callers at `vantaShieldState.ts:1488` and `:1543`.
- **Auth:** `src/solana/unshieldAuth.ts` (delete `createTransitionAuthorizedUnshieldIntent` and the version of the message format that references `transitionStateSignature`); `src/solana/solUnshieldAuth.ts` likewise.
- **Live bridge:** `src/zk/liveUnshieldBridge.ts` — diagnostics-only.
- **Proof boundary:** `src/zk/vantaPrivateCoreUnshieldProof.ts` (already shaped right; flip `proofSystem` once a real prover lands).
- **Operator:** `operator/unshield-server.mjs` (delete vault-keypair signing path; replace with Solana relayer that submits user-signed transactions; keep audit log only); `operator/sol-unshield-auth.mjs` (delete transition-auth path).
- **On-chain:** `programs/vanta_private_pool_v2_spend/src/lib.rs` — replace the reserved fail-closed `TAG_UNSHIELD = 6` preflight ABI with PDA-signed CPI to SPL Token / system program, nullifier consume, and proof-verifier enforcement.

---

# Putting it all together

After all four lane deep dives, the consolidated priority list:

1. **Keep fresh action memos encrypted** across shield, send, swap, unshield, and spent markers. The v2 AEAD prefix bump is now local, and the Private Pool v2 Send lane locally binds recipient/change ciphertext body-hash fields; remaining work is recipient-grade discovery, production memo/indexer handoff, historical v1 compatibility management, and verifier/on-chain enforcement.
2. **Keep the transition-authorized unshield bypass removed** and replace the remaining `vault keypair in env` custody model with a PDA-owned vault plus program-enforced release. The bypass removal is local; the custody migration is still the highest-leverage unshield fix.
3. **Lock the Poseidon note schema** (shield W1) and rebuild the four entry circuits on top of it (shield, send, swap, unshield) at depth 20 with real Merkle membership and ownership constraints. The actual_private_spend circuit is the template; everything else gets the same shape.
4. **Wire a real prover** (`@aztec/bb.js` or snarkjs) into the browser, replace the mock prover, and embed a Groth16 verifier in the on-chain program (Light's `groth16-solana` is the reference).
5. **Build the on-chain program** with one shared verifier, one shared incremental Merkle tree, one PDA vault per asset, and four instructions (shield, send, swap, unshield) that all reference the same tree state.
6. **Build the indexer** that mirrors the program's memo log and serves Merkle paths to clients for proof generation.

Once those six are done, Vanta has a real shielded pool. Until they're done, every claim about "private" anything in user-facing copy is more aspirational than the code supports. The good news is that the code already contains the right shapes for nearly all of this — the issue is plumbing, not invention. The actual_private_spend circuit, the shield viewing-key crypto, the canonical-note encoding, the operator's request-validation skeleton: these are all the right components. They need to be connected into one pipeline instead of seven parallel ones.

---

# Strategy Lane — Deep Dive

Strategy is the most product-shaped lane and, refreshingly, the most honest one in code. It's positioned as "Stealth DCA" and "Private TWAP" — automated, scheduled execution that breaks a large order into smaller child orders distributed over time. The framing is good. The implementation is — by the team's own runtime checks — explicitly preview-only. Live execution is fail-closed at boot.

That fail-closed posture is the right one. It means the strategy lane is not currently leaking funds. It also means there's nothing to fix urgently. What there is to fix is the design itself, because every architectural choice currently embedded in the code rides on the assumption that send and swap will eventually become real lanes — and from the deep dives above, those lanes are not currently real either.

## How strategy works today

The trace, end-to-end, when a user fills out the form on `/app/strategy` and clicks *Review strategy settings*:

1. **Form input.** `src/pages/StrategyPage.tsx` gathers a structured intent: `mode` ("Stealth DCA" or "Private TWAP"), `side` ("Buy" or "Sell"), `asset`, `totalSize`, `timeWindow`, `slicePolicy`, `timingPolicy`, `urgency`, `landingMode`, `maxSlippage`, `fundingSource`, `destination`. Form copy explicitly says: *"This screen shapes a local strategy preview. No funds move and no trades are submitted."*
2. **Plan creation.** `src/strategy/strategyPlanner.mjs:createStrategyPlan` builds a deterministic plan from the form. Slice count is computed from the time window and urgency; child weights and cadence jitter are seeded via a 32-bit FNV-1a + xorshift PRNG keyed off the form inputs (`seed:mode:side:pair:totalNotional:timeWindow:slicePolicy:timingPolicy`). Output: `id, childOrders[], routingPolicy, guardrails`.
3. **Execution preview.** `src/strategy/strategyExecutionAdapter.mjs:createStrategyExecutionPreview` decorates each child order with a `fallback` (defer/skip/execute), a `landing` mode (Jito vs. standard RPC), and a `settlement` destination. Notably this returns `liveSubmission: false` and `safety.requiresWalletApprovalBeforeLiveSubmit: true`. **No transaction is built.**
4. **Optional private-rail preview.** If the trading lab path is exercised, `src/strategy/strategyPrivateRail.ts` walks each child order through `buildVantaPrivateCoreSendTransition` and `buildVantaPrivateCoreSwapTransition` against an in-memory `VantaPrivateCoreLedger`, producing simulated commitments and proof-public-inputs. The output is a `StrategyPrivateRailPreview` with operator packets that contain only commitments and proof public inputs — not raw amounts or assets.
5. **Operator handoff (preview).** `src/strategy/strategyRuntime.mjs:createPrivateRailOperatorRun` accepts a redacted handoff and a list of committed-economics settlement requests. It refuses if any request contains a forbidden raw field (`amount`, `asset`, `destination`, `owner`, `pair`, `quote`, `quoteHandle`, `route`, `routeHandle`, `venue`); refuses if `liveSubmission !== false`; refuses if `operatorPlaintextStrategyShared !== false`. The accepted run is recorded in an in-memory `Map` keyed by request fingerprint. Status is `queued` with blockers `[live-strategy-scheduler-not-enabled, live-venue-route-quote-privacy-not-production-proven, production-anonymity-set-not-proven, audit-and-mainnet-gates-not-cleared]`.
6. **Operator runtime server.** `operator/strategy-runtime-server.mjs` exposes the runtime over HTTP. The first thing it does at boot is:
   ```js
   if (liveSubmission) {
     throw new Error("Strategy operator runtime keeps live submission disabled until privacy readiness gates pass.");
   }
   ```
   The server **refuses to start** if `VANTA_STRATEGY_OPERATOR_LIVE_SUBMISSION === "true"`. Production-mode startup also requires an auth token and a Private Pool v2 operator URL+token.
7. **No execution.** There is no code path from "queued operator run" to "submitted on-chain transaction". The scheduler `createPrivateRailSchedulerDrainPreview` returns `wouldSubmitLive: false` for every queued run, with the same blockers list.

## What's actually true today

The strategy lane is **a planning surface plus a redacted handoff queue, with no live execution path enabled in the deployed configuration.** That's the most accurate framing.

The product copy is cautiously consistent with this — *"Beta mode keeps Strategy visible while live execution stays locked"*, *"Preview DCA"*, *"Preview TWAP"*. Compare to the shield/send/swap pages, where the copy implies privacy that the code does not provide. The strategy page is the closest the project comes to matching code reality with user-facing language.

The `strategyPrivateRailTrustContract.ts` is the most useful artifact in this lane. It declares:

```ts
claimControls: {
  fullyPrivateStrategyClaim: false,
  liveProductionClaim: false,
  mainnetReady: false,
  productionPrivacyClaimsLocked: true,
},
```

These are runtime values, not just doc comments. Any UI surface that reads them and gates visibility on them is enforcing the honest framing in code. **This pattern should be lifted into the other lanes** — shield, send, swap, and unshield should each have a parallel trust-contract object with explicit `productionPrivacyClaimsLocked: true` until the work in this document ships, and the UI copy should be derived from those values rather than being free text in TSX.

## What strategy depends on

Strategy is a *composition* lane. It doesn't introduce new privacy primitives; it stitches together send and swap. Every privacy property strategy could plausibly claim is inherited from the lanes below it. So the analysis is short:

- **Stealth DCA** = N successive swaps, each followed by an optional settle-to-private. Inherits swap's privacy properties exactly.
- **Private TWAP** = N successive swaps spread over a longer window with smaller slice sizes. Same dependency.
- **Settle to private balance** = the final hop is a send-to-self into the shielded pool. Inherits send's privacy properties.
- **Settle to public destination** = the final hop is an unshield. Inherits unshield's privacy properties.

If send leaks plaintext memos with `amount, recipient, asset` (it did in the original v1 action-memo shape), then every Stealth DCA child order leaks the same information N times. Fresh v2 action memos and local Send body-hash proof binding improve that specific leak, and production Send privacy claims now exclude legacy v1 plaintext history unless it is migrated or segregated with reviewed evidence. Strategy still inherits Send's unfinished recipient discovery, production memo/indexer handoff, and verifier/on-chain enforcement work. If swap requires a custodial liquidity wallet (it does today), then every Strategy child swap goes through that same wallet. If unshield reveals the destination on chain and forces destination-equals-owner (it does today), then "settle to public destination" forces the entire strategy's output to land in the original initiator's wallet, defeating the strategy-level privacy framing entirely.

**Strategy cannot be more private than the sum of its child legs.** And the child legs today, as documented in the previous deep dives, are not private at all.

## Trust assumptions to be honest about

Adding to the assumptions inherited from send/swap/unshield:

- **Strategy intent is held in browser memory or operator memory only.** `strategyRuntime.mjs` uses an in-memory `Map`. The `LOCAL_DURABLE_STORAGE_STATUS` declares `productionReady: false, status: "local-in-memory-only"`. A page refresh, a server restart, or a browser tab close drops the strategy. There is no resumable state, no recovery, no audit log on the user side. This is fine for a preview; it is not fine for a live scheduled order that runs over hours or days.
- **The schedule is deterministic and reproducible from the form inputs.** The PRNG seed is `[input.seed, input.mode, input.side, input.pair, input.totalNotional, input.timeWindow, input.slicePolicy, input.timingPolicy].join(":")`. Anyone who can reproduce the same form inputs (a UI fingerprinter, an operator who logs the request, an MEV bot watching child cadence patterns) can predict the entire remaining schedule. For preview this is irrelevant; for live execution this is a leak. A live strategy needs unpredictable jitter — one that's seeded from a value the operator and the chain don't know (e.g., a fresh in-circuit witness).
- **The slice-policy and timing-policy choices are user-facing strings ("Randomized sizing", "Volatility-aware", "Liquidity-aware") that are not actually implemented.** The planner only branches on `slicePolicy === "Randomized sizing"` and `timingPolicy === "Randomized cadence"`. The other options ("Min/max child size", "Venue threshold", "Volatility-aware", "Liquidity-aware") fall through to the same default deterministic path. This is a UX-vs-implementation gap that's harmless today (preview only) but will be a correctness bug the moment live execution turns on.
- **Cross-strategy correlation.** Even if individual child orders were private (they aren't), a strategy that runs N child orders for the same pair, totalling the same notional, on a recognizable cadence, becomes a single identifiable strategy to anyone watching the chain. Vanta's anonymity set has to include enough other concurrent strategies for the pattern to be ambiguous. Today there is no such set; there's only the user.
- **The operator authorization model is a TODO.** `operator/strategy-runtime-server.mjs` accepts a Bearer token (`VANTA_STRATEGY_OPERATOR_AUTH_TOKEN`) for non-`/health` routes and validates the user's submitted strategy by structural fields only. There's no per-user signature, no rate-limit per requester, no abuse-detection wiring, no multi-tenant isolation. For preview this is fine; for live execution every queued strategy is identified solely by whoever submits it with the right Bearer token, which means the operator IS the user from a key-management standpoint.
- **`destination === Treasury wallet` cannot work under the current unshield rules.** The unshield endpoint requires `owner === requester === destinationOwner`. Routing strategy proceeds to a *different* address (a treasury, a counterparty, anything other than the initiator) is not implementable in the current unshield code path without a new authorization mode that the unshield deep dive explicitly recommended deleting. So one of strategy's user-visible options is wired to a destination the current code cannot serve.

## What "strategy actually works" needs to mean

Three targets again, sized by how much of the privacy story the strategy lane itself contributes versus inherits.

**Target A — A live strategy executor that produces no more public footprint than a single concurrent shield-pool participant.** Each child order is a real shielded swap (per swap-lane Target A) inside the same pool that thousands of unrelated participants are using. Schedule jitter is sampled inside the proof, not from a deterministic seed. Strategy state (in-flight child orders, schedule, completion log) is durable, encrypted, and kept off the operator. The operator's role reduces to "ordered queue submitter" — it has a list of opaque envelopes to submit on schedule, and it learns nothing about the strategy's pair, total, slice count, cadence, or destination beyond what's necessary to schedule envelope submission. **Privacy parity with the swap lane, plus operational durability.**

**Target B — Operator-mediated automation with clear discretion boundaries.** Operator sees the redacted handoff (commitments only), runs a real scheduler that drains child orders, and submits them as committed-economics settlement requests. Operator does not see raw amounts/asset/destination/quote, but sees timing, child count, and the handoff fingerprint. Strategy state is durable on the operator side. This is closer to the trust contract the current code already encodes — the gap is real proofs, real durability, and a real submission path. The operator still has more knowledge than Target A allows.

**Target C — What's deployed today.** Preview-only; live submission fail-closed at boot. UI does not mislead. Honest framing.

The current code is shaped like B (operator handoff with redacted fields, fingerprinted runs, blockers list, fail-closed gate) but ships C. **The right thing to do is to keep shipping C until the underlying lanes are at Target A.** The strategy lane should not advance ahead of swap. If swap goes from Target C → Target B → Target A, strategy advances with it — automatically, because the only thing strategy adds on top of swap is composition + scheduling.

The rest of this section assumes the project will eventually pursue **Target A**. The work below is what strategy specifically owns; the lane-level work is in the swap and shield sections above.

---

## Concrete build plan for Target A

Five workstreams. None of them are circuit work — strategy doesn't introduce new circuits, it composes existing ones. The work is durability, scheduling, randomness, and a clean operator boundary.

### Y1. Durable, encrypted strategy state

Replace `strategyRuntime.mjs`'s in-memory `Map` with a durable store. Two layers:

- **Client-side state** lives in the user's browser, encrypted at rest with a key derived from the wallet (via the same `signMessage` flow proposed in shield-W2). The state is a list of `(strategyId, planFingerprint, schedule, completionLog)` records that the user can recover from any device. This is the state that lets a user re-open Vanta two days into a 7-day TWAP and see exactly what's been executed and what's pending.
- **Operator-side state** is a queue of `(strategyId, scheduledSlot, envelopeBytes)` tuples. The operator has no idea what's in `envelopeBytes` — it's a sealed proof + on-chain instruction blob bound by the strategy's redacted handoff. Encrypted-at-rest in Postgres with a per-environment KMS key.

Two-sided durability is essential: the user must be able to recover; the operator must be able to drain on schedule even across deploys. Today neither side has it.

Effort: 1–2 weeks. Mostly schema design + handoff format.

### Y2. Inside-the-proof schedule jitter

Today: schedule jitter is sampled from a deterministic seed `[mode, side, pair, totalNotional, timeWindow, ...]`. Anyone with the form inputs predicts the schedule.

For Target A: the next child order's schedule slot is committed to inside the proof for the previous child. Specifically, the swap circuit (S1/X1 above) gains an additional public input `next_scheduled_slot_commitment = poseidon(slot, blinding)`, and the witness includes the unbinding slot value. The operator learns only the commitment. When the next child fires, its proof must reveal a slot whose hash matches the prior commitment. The operator can verify the schedule is honored without learning what the schedule was in advance.

Equivalent for randomized sizing: each child commits to the next child's notional via a hash, so the operator can verify the strategy's total without learning per-slice amounts in advance.

Effort: small circuit additions (one Poseidon + one assert per scheduled-next field), small client logic, 3–5 days total. Depends on swap-X1 landing first.

### Y3. Real scheduler with replay-safe drain

`createPrivateRailSchedulerDrainPreview` returns `wouldSubmitLive: false` for every entry today. Real scheduler:

- Wakes on a timer (not on user requests).
- Reads the durable queue from Y1.
- For each `scheduledSlot <= now`, atomically claims the entry (Postgres `UPDATE ... WHERE status = 'queued' RETURNING ...` with `SKIP LOCKED` for multi-worker safety), submits the envelope to the on-chain program, and records the result.
- Replay-safe: every envelope has a unique `(strategyId, childIndex)` key. Re-running the drain after a crash is idempotent.
- Telemetry: per-child latency, per-strategy progress, error categories. **No raw economics in logs.** This is enforced by the redacted-handoff invariant — the scheduler doesn't have raw values to log even if it tried.

The current `strategyRuntime.mjs` has the right shape (`schedulerDrainPreview` returns the queue with blockers); the work is filling in the actual submission step and the durability layer.

Effort: 1 week, depends on Y1 + a real on-chain program (shield W4) + the same Groth16 verifier (shield W6).

### Y4. Implement the slice and timing policies that the UI advertises

The UI offers `slicePolicies = ["Randomized sizing", "Fixed count", "Min/max child size", "Venue threshold"]` and `timingPolicies = ["Randomized cadence", "Evenly spaced", "Volatility-aware", "Liquidity-aware"]`. The planner only honors the first two of each. The rest fall through to the default deterministic path.

> **Completed locally for the interim UI/runtime boundary:** `src/pages/StrategyPage.tsx` now keeps the unimplemented policies visible only as disabled `Coming soon` options, and `src/strategy/strategyPlanner.mjs` rejects direct attempts to create plans with `Min/max child size`, `Venue threshold`, `Volatility-aware`, or `Liquidity-aware` until Y4 lands. `npm run strategy:page-state-check` covers both the UI lock and the planner fail-closed behavior.

For Target A:

- **Min/max child size** — clamp randomized weights between a configurable floor and ceiling.
- **Venue threshold** — adjust slice count based on the pair's typical liquidity-at-quote (parameter from the operator's quote oracle, not a private oracle).
- **Volatility-aware** — pull recent realized volatility from a price oracle (Pyth, Switchboard) and tighten/loosen slice cadence accordingly.
- **Liquidity-aware** — pull on-chain liquidity depth for the pair and bias slice timing toward windows of higher depth.

For volatility/liquidity awareness, the data feeding the policy decision is a privacy concern: if the *decision* depends on a public oracle reading, the timing of strategy child orders becomes correlated with public price moves, and an observer can narrow down which strategies were active by watching the oracle. Mitigation: bin oracle readings into wide buckets (e.g., low/medium/high), so many possible volatility regimes map to the same scheduling decision.

Effort: 2–3 days per policy = ~2 weeks total. Independent of circuit and on-chain work.

### Y5. Shape the operator boundary so it actually enforces what the trust contract claims

Today's `assertNoRawCommittedSettlementFields` in `strategyRuntime.mjs` rejects raw fields by name (`amount`, `asset`, `destination`, etc.) at the operator queueing API. That's a defensive check at the wrong layer — it's a structural check, not a cryptographic one. A misbehaving client could rename `amount` to `notional` and bypass the check, then the operator would happily store the raw value.

The right shape:

- The operator's API accepts only `(commitments[], proofPublicInputs, proofBytes, schedulerSlotCommitment)` per child. No JSON fields named anything else are accepted; extra fields are rejected.
- The operator validates the proof against the embedded verifying key. If it's a real Groth16 proof bound to commitments-only public inputs, the operator literally cannot read raw values out of it.
- The operator's audit log captures `(strategyId, childIndex, schedulerSlotCommitment, proofPublicInputs)` only. No raw payloads. Telemetry treats every other field as untrusted.

This narrows the operator's view to what the trust contract advertises. Currently the trust contract advertises a privacy property the runtime doesn't enforce — the runtime relies on clients to send redacted requests and rejects them by field name only. Make the proof system the enforcement, not the field-name allowlist.

Effort: 1 week, depends on swap-S4/X5 (real prover, real verifier).

---

## Where the existing code helps

A lot, in this lane.

- **`strategyPrivateRailTrustContract.ts`** is the cleanest piece of architectural copy in the project. It declares the trust posture as code-level values that other modules can gate on. Lift this pattern into shield, send, swap, and unshield as `*TrustContract.ts` modules. Every claim a UI surface makes should derive from one of these objects.
- **The fail-closed gate in `strategy-runtime-server.mjs`** (`if (liveSubmission) throw new Error(...)`) is the right pattern. It refuses to even start if a config flag would enable a not-ready feature. Replicate this for any operator service that handles funds — the unshield server should refuse to start without a real Groth16 verifier configured, the swap operator should refuse to start without an oracle attestation source, and so on.
- **The redacted handoff format** (`StrategyPrivateRailOperatorPacket`) is the right shape for what the operator should receive in *all* lanes. Send and swap should use the same structure: commitments + proof public inputs only.
- **The runtime's idempotency by request fingerprint** (`requestIndex.get(clientRequestId)` + `stableJson` fingerprint) is correct. Reuse for the eventual replay-safe scheduler in Y3.
- **The blockers list** (`live-strategy-scheduler-not-enabled, live-venue-route-quote-privacy-not-production-proven, production-anonymity-set-not-proven, audit-and-mainnet-gates-not-cleared`) is exactly the kind of explicit gate enumeration that should appear in every lane.

## What to delete or quarantine

- **The `Treasury wallet` destination option** in the StrategyPage form, until the unshield lane supports `destinationOwner !== requester`. Today the option exists in the UI but cannot be served.
- **The slice and timing policy strings that aren't implemented.** Current local branch quarantines them as disabled `Coming soon` entries and rejects direct planner calls with those values. Y4 still needs the real policy implementations before they become selectable.
- **The seeded PRNG for schedule jitter.** Mark it explicitly as "preview-only deterministic schedule" in code comments and refuse to use it for live scheduling. Replace with the in-proof commitment scheme (Y2) before any live execution.
- **The `localOperatorQueueReady: true, schedulerDrainPreviewReady: true` flags** in `createStatusPayload`. They're set unconditionally; they should reflect actual durable-storage health and actual queue depth.

## Order of operations and rough effort

| # | Workstream | Effort | Depends on |
|---|---|---|---|
| 1 | **Interim**: lift `strategyPrivateRailTrustContract` pattern into shield/send/swap/unshield | 2–3 days | nothing |
| 2 | Y4 (implement the slice/timing policies the UI advertises) | 2 weeks | nothing — independent of all the cryptographic work |
| 3 | Y1 (durable encrypted strategy state, both client and operator side) | 1–2 weeks | shield W2 (key hierarchy) |
| 4 | Y2 (in-proof schedule jitter) | 3–5 days | swap S1/X1 |
| 5 | Y3 (real scheduler with replay-safe drain) | 1 week | Y1 + on-chain program + Groth16 verifier |
| 6 | Y5 (operator boundary enforced by proof, not field names) | 1 week | real prover and verifier in swap S4/X5 |

Total: about 5–6 calendar weeks for strategy on top of the swap and shield foundations. Unlike the other lanes, every workstream here is *additive*. None of them have to delete or replace existing code — strategy's structure is already correct; it just needs the underlying lanes to become real and a few specific holes filled.

## Concrete first commit for Codex (strategy-side)

> **Lift the `strategyPrivateRailTrustContract.ts` pattern into the four other lanes. Add `shieldTrustContract.ts`, `sendTrustContract.ts`, `swapTrustContract.ts`, `unshieldTrustContract.ts`, each with a `claimControls` object mirroring the strategy version (`fullyPrivate*Claim: false`, `liveProductionClaim: false`, `mainnetReady: false`, `productionPrivacyClaimsLocked: true`) until the work in this document ships. Update the UI copy in `ShieldPage.tsx`, `SendPage.tsx`, `SwapPage.tsx`, and `UnshieldPage.tsx` to derive from these objects rather than from free TSX text.**

This is the cleanest immediately-executable change the strategy-lane analysis suggests, and it isn't really about strategy at all — it's about taking the one good architectural pattern that already exists in this lane and applying it to the lanes that today claim privacy properties the code does not deliver. The change is mechanical, low-risk, easy to review, and immediately removes a class of "the copy says X, the code does Y" gaps across the rest of the app.

Pair this with keeping the inert slice/timing policy options quarantined in the StrategyPage form so the UI doesn't offer choices that don't do anything.

## Files most directly impacted

- **Trust contracts:** `src/strategy/strategyPrivateRailTrustContract.ts` (template); new files `src/solana/shieldTrustContract.ts`, `src/solana/sendTrustContract.ts`, `src/solana/swapTrustContract.ts`, `src/solana/unshieldTrustContract.ts`.
- **UI:** `src/pages/ShieldPage.tsx`, `src/pages/SendPage.tsx`, `src/pages/SwapPage.tsx`, `src/pages/UnshieldPage.tsx`, `src/pages/StrategyPage.tsx` — derive copy from trust-contract objects.
- **Planner:** `src/strategy/strategyPlanner.mjs` — wire in real volatility/liquidity policies (Y4); replace deterministic seed with in-proof commitment (Y2).
- **Runtime:** `src/strategy/strategyRuntime.mjs` — replace in-memory Map with durable store (Y1); replace structural redaction check with proof-binding check (Y5).
- **Operator:** `operator/strategy-runtime-server.mjs` — add real submission path (Y3) gated on real verifier presence; add KMS-backed at-rest encryption for queue state.
- **Scheduler:** new file `operator/strategy-scheduler-worker.mjs` — the actual timer-driven drain worker (Y3).

---

# Final recap, all five lanes

After deep dives on shield, send, swap, unshield, and strategy, the consolidated story is this:

The four economic lanes (shield, send, swap, unshield) are positioned as private but ship as custodial-with-extra-steps. Their cryptographic primitives exist but are not connected to one another. The strategy lane is positioned as a preview, ships as a preview, and is the closest to honest in the codebase.

The single most leveraged sequence of fixes:

1. **Keep fresh action memos on v2 AEAD and finish recipient discovery.** Send, Swap, Unshield, SOL-Unshield, and spent-marker helpers now fail closed into viewing-key AEAD; Send v1 plaintext history is excluded from production privacy claims unless migrated or segregated with reviewed evidence. Recipient viewing-key exchange, view tags/indexer discovery, and production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces remain open.
2. **Keep the strategy/pay trust-contract pattern lifted into the other four lanes** — make UI copy derive from explicit `claimControls` objects so the product never claims more than the code can support.
3. **Migrate the vault from operator-keypair-in-env to a program-owned PDA** (shield W4, unshield U2). Removes the entire single-env-var custody risk.
4. **Lock the Poseidon note schema** (shield W1) and rebuild the four entry circuits on top of it (shield W3, send S1, swap X1, unshield U1) at depth 20 with real Merkle membership and real ownership constraints.
5. **Wire a real prover** (`@aztec/bb.js`) and embed a Groth16 verifier (Light's `groth16-solana`) so the on-chain program enforces the proofs the circuits already shape.
6. **Build the indexer + memo discovery + view-tag scheme** so users can find their notes from any device without scanning the full chain.

After those six are done, all four economic lanes become real, and strategy becomes a thin, durable composition layer on top of them. Until they're done, the most useful thing the project can do is keep the strategy-lane gating posture (fail-closed, explicit claim controls, redacted operator handoffs) and apply it everywhere — making the deployed app's claims match the code's actual reach.

---

# Pay Lane — Deep Dive

Pay is the merchant payments product — Vanta's answer to Stripe Checkout, but on Solana with privacy framing. It's the largest single body of code in the repo (`vantaPayRuntime.ts` is 1054 lines, `vantaPayPrivateSettlementAdapter.ts` is 926 lines, `operator/pay-server.mjs` is 828 lines), and the most product-shaped: idempotency keys, webhook signatures, balances, refunds, withdrawals, payment links, invoices. It looks like Stripe.

It also has the largest gap between what the API surface advertises and what the code actually executes. Let's walk through it.

## How Pay works today

The trace, from a merchant clicking *Create payment* to funds being delivered to the merchant's destination:

1. **Merchant creates a checkout session.** `POST /v1/checkout/sessions` to `operator/pay-server.mjs` calls `vantaPayRuntime.ts:createCheckoutSession`. The runtime constructs a session record with `id, checkoutUrl, clientToken, amount, currency, customerEmail, expiresAt, idempotencyKey, status: "open"`. The session is stored in a Node `Map`.
2. **Customer visits the hosted checkout URL** at `${checkoutBaseUrl}/cs/${id}`, OR the merchant uses an embedded/modal checkout via the same session. **What the customer does on the checkout page: not visible in this code path.** No customer wallet signs anything in `vantaPayRuntime.ts` or `pay-server.mjs`. There is no on-chain customer-to-merchant SPL transfer instruction anywhere in the Pay surface.
3. **The merchant (or merchant's server) calls `POST /v1/checkout/sessions/{id}/complete`.** Note: **the merchant is the one declaring the payment is complete**, not the customer signing. The handler:
   - Calls `settlementAdapter.settleCheckoutSession({ session })`, which:
     - Hashes the session into an `outputCommitment` via SHA-256: `hashHex(version, "checkout-output", session.id, session.clientToken, session.amount, session.currency)`.
     - Builds a `VantaPrivatePoolV2ShieldProofRequest` claiming this commitment is being shielded into a Private Pool v2 tree.
     - Calls the **local mock prover** (`prover.prove(request)` returns a SHA-256 hash, see audit item 8).
     - Calls the **mock verifier** (`verifierRegistry.acceptProof`) which trivially accepts.
     - Returns a `privateRailReceipt: { id, proofReceiptId, status: "confirmed" }`.
   - Marks the session as `completed` in memory.
   - Creates a `payment` record with `status: "completed"`, `railStatus: "settled"`, `privateRailReceiptId`.
   - Creates a `receipt` record with `auditDisclosureId` (a SHA-256 of session+receipt fields).
   - Records `checkout.session.completed`, `payment.created`, `payment.completed`, `receipt.created` events.
4. **Webhooks are signed with HMAC-SHA256.** `signWebhookEvent` produces `t={timestamp},v1={signature}` headers — same shape as Stripe's webhook signature. `deliverWebhookEvents` retries up to `maxAttempts` times. The signing primitive is correct: HMAC-SHA256 over `${timestamp}.${payload}` with the merchant's secret. **This is the only piece of crypto in the Pay lane that's properly implemented.**
5. **Merchant withdraws.** `POST /v1/withdrawals` calls `runtime.createWithdrawal` after `settlementAdapter.settleWithdrawal({ amount, asset, destination, merchantId })`. The settlement adapter:
   - First tries `settleCommittedWithdrawalThroughPrivatePoolOperator` (calls a configured private-pool operator URL if set).
   - Falls back to a local `claimProofRequest` flow with the local prover.
   - Returns `privateExitReceipt: { id, status: "confirmed" }`.
   - **No SPL transfer is made by `pay-server.mjs` directly.** Funds are presumed to flow through the same custodial-vault unshield path covered in the unshield deep dive.
6. **Refund.** `POST /v1/refunds` is bookkeeping-only. The runtime updates the payment's `refundedAmount` and emits `payment.refunded`. **No on-chain transfer to the customer.** A refund in this system is a journal entry, not a movement.
7. **Persistence.** `saveRuntimeSnapshot()` writes the runtime state to disk (referenced ~8 times across the request handlers). In production mode the operator requires `VANTA_PAY_DATABASE_URL` — production storage is presumably Postgres-backed but the in-memory `Map` is the source of truth at request-time and snapshots are best-effort durability.

## What's actually true today

The Pay lane today is **a Stripe-shaped API for a payment processor that does not actually move money**. There is no customer-side wallet flow, no on-chain customer-to-vault transfer, no on-chain merchant withdrawal proof verification. The "settlement" step is the local mock prover (SHA-256) marking the session as paid in an in-memory Map.

This is consistent with `getVantaPayMerchantTrustStatus().productionReady: false` and `getVantaPayReceiptPrivacyContract().claimControls.fully_private_pay_claim: false`. The trust contract pattern lifted from the strategy lane is in place. The framing in code is honest. The product copy on `/app/pay` and `/docs/pay` is the part to audit against this reality — anywhere it implies "merchant accepts on-chain stablecoin payments privately," the code is not delivering that today.

The actual customer-side payment flow — if it exists — must live somewhere outside `vantaPayRuntime.ts` and `operator/pay-server.mjs`. It would have to be: (a) a separate "checkout app" that asks the customer to sign an SPL transfer to a vault address with a memo containing the session ID, then (b) something polling the chain to detect that transfer and call `POST /v1/checkout/sessions/{id}/complete` on the merchant's behalf. There are hints of this in `splShieldTransfer.ts` and the various memo prefixes, but nothing in the Pay code itself wires customer wallet → checkout completion. The local branch has since locked `/complete` behind `VANTA_PAY_INTERNAL_SETTLEMENT_TOKEN`, so merchant Bearer auth alone is no longer enough; the remaining truth is that completion is an internal local/test harness until customer payment evidence is wired.

## What's actually private and what isn't

Same accounting exercise. Assuming the deployed system uses a custodial vault wallet (per the unshield deep dive) and the customer's wallet flow is the standard "send SPL tokens with a memo" pattern:

| Property | Visible on chain? | Visible to operator? | Visible to merchant? |
|---|---|---|---|
| Customer wallet address | Yes (memo signer of the customer-side SPL transfer) | Yes | Yes (if memo is read) |
| Merchant identity | Yes (vault address is well-known) | Yes | Yes |
| Customer email | No (not on chain) | Yes (in checkout session) | Yes |
| Payment amount | Yes (in customer's SPL transfer) | Yes | Yes |
| Asset (USDC, USDT, etc.) | Yes | Yes | Yes |
| Session ID, order ID, line items | Maybe (depends on memo content) | Yes | Yes |
| Audit disclosure ID | No (operator/merchant only) | Yes | Yes |

The "privacy" of Pay reduces to: customer email and order metadata don't go on chain. **That's the whole privacy gain.** The customer's wallet address, the amount, and the merchant's vault address are all public on-chain SPL transfers if a customer-side wallet flow exists at all. The merchant has zero unlinkability from their customers — every customer who pays a particular merchant sends to the same vault address, so the merchant's customer graph is fully visible.

If product copy implies "merchants accept private stablecoin payments," that's contradicted by the on-chain footprint of any customer SPL transfer. The receipt privacy contract correctly classifies `customer_email` as `merchant_internal: visible, buyer_shareable: selective_disclosure, operator_verification: redacted` — but there is no equivalent classification for `customer_wallet`, because wallet identity isn't a field the system controls.

## What the operator actually does

For Pay specifically, on top of all the assumptions inherited from shield/unshield (vault keypair in env, mock prover, etc.):

- **The operator runs the merchant lifecycle.** Merchant signups, API key issuance (via Bearer tokens — see `requireAuth` in pay-server.mjs), checkout session creation, refunds, withdrawals, and most merchant actions are server-side. Completion now has a separate internal settlement-token boundary, but there is still no merchant on-chain identity or merchant signing of session-completion/refund decisions.
- **The internal operator path decides when a checkout is "complete."** The endpoint `POST /v1/checkout/sessions/{id}/complete` now requires `VANTA_PAY_INTERNAL_SETTLEMENT_TOKEN` locally, so a leaked merchant Bearer token alone cannot mark a session complete. There is still no on-chain proof binding completion to a customer SPL transfer, and customer payment evidence is not wired for production.
- **The operator decides when refunds happen.** Refunds are bookkeeping; the operator could mark a refund without actually returning funds, or vice versa.
- **The operator delivers webhooks signed with the merchant's webhook secret.** The webhook secret is operator-stored. So while webhook signatures are cryptographically valid (HMAC-SHA256), their authenticity rests on the operator's storage of the secret being intact.
- **The operator IS the merchant's bank.** Merchant balances are operator-tracked. Merchant withdrawals are operator-signed transfers from the vault. The merchant has no direct on-chain claim against any program-owned escrow.

This is the Stripe-shape trust model. It's defensible for a regulated PSP. It is not consistent with privacy-first framing because the entire flow rests on operator discretion.

## The trust contract

Pay has the second-best trust contract in the repo, after strategy. `vantaPayReceiptPrivacyContract.ts` enumerates audiences (`merchant_internal`, `buyer_shareable`, `operator_verification`), per-field visibility, and explicit `claimControls.fully_private_pay_claim: false` and `production_privacy_claims_locked: true`. The packet-state model (`draft_request → checkout_issued → receipt_pending → receipt_packet_ready`) is the right shape for selective-disclosure receipts.

The `vantaPayPrivateSettlementAdapter.ts` summary object is even more explicit:

```ts
VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY = {
  hiddenEconomicsProductionPrivacyClaimAllowed: false,
  checkoutCompletionAuth: "internal-settlement-token-only",
  customerPaymentEvidenceRequiredForProduction: true,
  customerPaymentEvidenceWired: false,
  operatorSeesRawMerchantApiTerms: true,
  operatorSeesRawSettlementAdapterTerms: false,
  rawEconomicTermsInLiveCheckoutSettlement: false,
  rawEconomicTermsInLiveWithdrawalSettlement: false,
  ...
}
```

These are runtime values that gate behavior, but their scope has to stay precise. Current local status splits `operatorSeesRawMerchantApiTerms: true` from `operatorSeesRawSettlementAdapterTerms: false`: the in-memory merchant API/runtime still stores raw `amount, currency, customerEmail, lineItems`, while the settlement-adapter handoff uses commitments instead of raw settlement terms.

This is a different gap than the other lanes. In shield/send/swap, the gap is "the code is shaped like A but ships C" without explicit code-level claims. In Pay, the gap is "explicit code-level claims are made about a sub-component (the settlement adapter) that don't transfer to the larger system (the runtime that hosts the adapter)." The fix is to be more careful about what the trust-contract assertions cover.

## Trust assumptions to be honest about

- **Customer payments are not on-chain in this code path.** If the deployed system has a customer-side wallet flow, it lives outside the Pay code reviewed here. Without seeing it, the safest assumption is that customer-to-merchant payment is a separate concern that's bolted on, not something Pay's settlement adapter actually verifies.
- **No fraud/dispute model.** A real PSP needs chargebacks, dispute resolution, fraud signals, KYC pass-through. None of this exists in the codebase. The closest analog is `auditDisclosureId` for selective disclosure, which is a transparency tool, not a dispute tool.
- **No on-chain authorization for refunds.** A refund updates `payment.refundedAmount` in memory. Whether actual customer funds get returned depends entirely on the operator running a separate transfer transaction.
- **The merchant has no key.** Merchant identity is a Bearer token issued by the operator. If the merchant rotates the token, the operator does it. If the operator decides a merchant should no longer have access, the operator revokes. The merchant cannot prove their own identity to anyone except via the operator.
- **Webhooks can be spoofed if the merchant's webhook secret leaks.** This is the standard PSP risk; not Vanta-specific. But the webhook secret is operator-stored, so the threat surface includes operator compromise.
- **No abuse controls beyond Bearer auth.** The pay-server requires `VANTA_PAY_DATABASE_URL` in production "for durable storage and rate limiting", but the actual rate-limit middleware isn't visible in the request handlers I read. If the rate-limit middleware exists, it should be cited explicitly; if it doesn't, this is a denial-of-service surface.
- **Snapshot persistence is best-effort.** `saveRuntimeSnapshot()` is awaited after every mutation, but the in-memory `Map` is the source of truth between snapshots. A crash mid-mutation can leave the snapshot inconsistent with the next read. For a payments system this should be a transactional Postgres write, not a snapshot file.

## What "Pay actually works" needs to mean

Three targets, sized differently from the other lanes because Pay's privacy aspirations and Pay's product correctness are mostly orthogonal.

**Target A — Real on-chain customer payments with private merchant deposit.** Customer signs an SPL transfer in their wallet, but the transfer goes to a program-owned PDA escrow with an attached zk proof binding the payment to the checkout session. The merchant withdraws from the escrow via a real unshield proof (per unshield U2). The customer's wallet identity is unlinkable to the merchant from chain alone if the escrow is shared across many merchants and the link from session-id to merchant lives only inside encrypted memos. **Requires shield/unshield/program work to be done first.**

**Target B — Real on-chain customer payments with custodial deposit, plus a proper PSP product.** Customer pays into a vault. Merchant withdraws via the operator. No privacy claim beyond "customer email isn't on chain". This is what most real-world Solana payment processors look like. To ship this credibly: stop calling it private; build the actual PSP feature set (disputes, fraud signals, KYC, statements, reconciliation, chargebacks, reserve accounts).

**Target C — What's deployed today.** A Stripe-shaped API surface that doesn't have a working customer-side payment flow visible in the code. Honest framing: "merchant playground for the eventual API shape."

The current code is shaped like A in the settlement-adapter and trust-contract layers, like B in the runtime/withdrawal layers, and like C in actual end-to-end behavior. **The question Pay needs to answer before any other architectural choice is: is this a privacy product or a payments product?** Those are different builds. Privacy-first means accepting that some merchants won't onboard because compliance teams can't model the privacy claims. Payments-first means dropping the privacy framing and shipping the boring PSP feature set that real businesses use.

If the answer is privacy-first, Pay = Target A and you need everything the other deep dives recommend, plus the customer-side wallet flow.

If the answer is payments-first, Pay = Target B and you need to delete the privacy framing from the product surfaces and invest in the PSP feature set instead.

If the answer is "both eventually," Target C is the right place to be today, and what the project should ship is honest copy that names the current state. **Don't ship the framing of A while running C.**

The rest of this section assumes **Target A** because that's what the existing code structure suggests the team intended.

---

## Concrete build plan for Target A

Six workstreams. Most depend on prior lanes; two are Pay-specific.

### P1. Define the customer-side payment flow

The single biggest gap. Today the code path from "customer visits checkout page" to "session.status = completed" is missing.

For Target A:

- **Hosted checkout page** at `${checkoutBaseUrl}/cs/${id}` displays the merchant's request and asks the customer to connect a wallet.
- **Wallet builds a transaction** that includes (a) an SPL transfer from the customer's ATA to the program's escrow PDA for the right amount and asset, AND (b) a zk-proof instruction binding `(session_id, customer_owner_commitment, paid_amount, paid_asset, escrow_commitment)`. The two must be in the same transaction so the program can verify the SPL transfer amount matches the proof's `paid_amount`.
- **Customer signs and submits.** The transaction lands on Solana. The program emits a `CheckoutPaidEvent { session_id_hash, escrow_commitment, root }`.
- **The operator's pay-server** subscribes to `CheckoutPaidEvent` and, for each event, looks up `session_id_hash` in its index, verifies the proof's `paid_amount` matches the session's `amount`, and marks the session complete via the existing `completeCheckoutSession` flow.
- **Crucially: the customer's wallet address is not in any plaintext memo.** It's bound only inside `customer_owner_commitment` in the proof. The chain shows "someone deposited $X into the escrow PDA"; the linkage to "session-id Y" is committed via a Poseidon hash, not a plaintext lookup.

Effort: 3–4 weeks. Includes the checkout page UI, the transaction builder, the program instruction, and the operator's subscription/verification loop.

### P2. Program-owned escrow PDA per asset

Same shape as the shield-W4 vault PDA. New instruction `TAG_CHECKOUT_PAY = 7` in the program:

```
0. pool_state            (writable)
1. tree_state            (writable)
2. nullifier_set         (writable; for replay protection on (session_id, customer))
3. escrow_token_account  (writable; PDA, holds the deposit)
4. memo_log              (writable)
5. customer              (signer)
6. customer_token_account (writable; source of funds)
7. mint                  (read-only)
8. token_program         (read-only)

instruction data:
  session_id_hash:32
  paid_amount:8
  escrow_commitment:32   // commits to (session_id, customer_owner_commitment, amount, blinding)
  public_inputs_hash:32
  proof_bytes:N
```

Program logic:

1. Verify the customer's SPL transfer instruction is in the same transaction (Solana's `instructions` sysvar inspection pattern), with `to == escrow_token_account` and `amount == paid_amount`.
2. Verify the proof against `public_inputs_hash` (which encodes session_id_hash, paid_amount, escrow_commitment, current_root).
3. Append `escrow_commitment` to the tree.
4. Emit `CheckoutPaidEvent`.

The escrow is per-asset, program-owned. **No operator keypair holds these funds.**

Effort: 2 weeks once shield-W4 + W6 (Groth16 verifier) exist.

### P3. Merchant withdrawal as a real unshield

Today's merchant withdrawal calls `settleWithdrawal` which calls the local mock prover. For Target A, merchant withdrawals reuse the unshield U2 instruction directly — the merchant proves ownership of escrow commitments accumulated by their checkout sessions and withdraws to their payout destination.

This means each `CheckoutPaidEvent` produces a commitment that the merchant can later spend. The merchant's "withdrawable balance" is the sum of unspent escrow commitments owned by that merchant. The merchant signs the unshield proof; the operator submits the transaction (as a relayer, per unshield U5). Funds release from the program-owned escrow PDA.

This eliminates the operator-as-bank trust assumption for withdrawals. The merchant can prove their balance to anyone with the indexer state; the operator can't refuse a valid withdrawal.

Effort: 1 week once unshield U2 exists. Mostly wiring.

### P4. Refunds via dual-spend or memo-anchored reversal

Refunds today are journal entries with no on-chain effect. For Target A there are two options:

- **On-chain refund instruction** (`TAG_CHECKOUT_REFUND = 8`): the merchant proves ownership of an unspent escrow commitment and constructs a reverse transfer from the escrow PDA back to the customer's original wallet. Customer's wallet was committed inside the original `escrow_commitment`, so the proof can re-derive the destination without exposing it on the chain except as the receiver of the refund SPL transfer.
- **Off-chain reversal claim**: the merchant emits a refund commitment that the customer can later spend as a credit toward a different purchase. Doesn't return USDC to the customer's wallet but creates a private credit balance. Useful for partial refunds and store credit.

Most merchants will want option 1 for full refunds. Option 2 is a future feature.

Effort: 2 weeks for option 1.

### P5. Replace the in-memory Map with Postgres

Pay's runtime today is `Map`-backed with snapshot files. For a payments system this is wildly under-spec'd. Target A needs:

- Postgres tables for `merchants`, `checkout_sessions`, `payments`, `receipts`, `refunds`, `withdrawals`, `webhook_deliveries`, `events`.
- Transactional writes: every mutation is one Postgres transaction; no partial-state snapshots.
- Per-merchant rate limits backed by Redis or Postgres advisory locks.
- Proper indices for high-volume `checkout_sessions.merchant_id, status, created_at` queries.
- A queue table for webhook deliveries with retry/backoff/dead-letter handling that survives restarts.

The shape of this is standard PSP engineering. The current code's `Map` + `saveRuntimeSnapshot` is a prototype; the leap to durable storage is the bulk of the practical engineering work for production launch.

Effort: 3–4 weeks. Independent of cryptographic work.

### P6. Decide what "private" means in product copy and enforce it

Pay's biggest risk is not a code bug; it's a copy-vs-code mismatch. Specifically:

- If the deployed `/app/pay` says "Accept stablecoin payments privately" and the customer-side flow puts the customer's wallet on chain (inevitable for any SPL transfer), then "privately" is misleading.
- If product copy says "Vanta never sees your customer data" while the operator-hosted checkout session has plaintext `customerEmail` and plaintext line items in its database, that's also misleading.

The fix is to either (a) genuinely make customer wallets unlinkable on chain via the escrow PDA + proof shape in P1+P2, AND (b) genuinely keep customer email/PII off the operator by encrypting it at the merchant boundary with the merchant's key — OR (c) drop the privacy framing entirely.

Pick one of (a)+(b) or (c). Don't continue claim-without-do.

Effort: 1–2 weeks. Mostly a coordinated copy + code review across `/app/pay`, `/docs/pay`, `vantaPayMerchantTrustStatus.ts`, and `vantaPayReceiptPrivacyContract.ts`.

---

## Where the existing code helps

- **`vantaPayReceiptPrivacyContract.ts`** is the right shape — audiences, per-field visibility, claim controls. Survives Target A unchanged; just needs to be enforced by code rather than asserted in a static export.
- **`signWebhookEvent` and `deliverWebhookEvents`** — HMAC-SHA256 with `t={timestamp},v1={signature}` is correct. Stripe-compatible. Keep this.
- **Idempotency keys** in `createCheckoutSession`, `createWithdrawal`, `createRefund` — correctly implemented with conflict detection. Keep this pattern.
- **Webhook event types** (`checkout.session.completed`, `payment.completed`, etc.) — modeled after Stripe; standard and correct. Keep.
- **The settlement adapter's request shape** (`VantaPayCheckoutCommittedEconomicsSettlementRequest` with `economicsCommitment, settlementCommitment, ownerCommitment, routeCommitment, settlementId`) is exactly what a Target A flow needs at the boundary between the merchant API and the on-chain proof. The fields are right; the implementation behind them is the part to replace.
- **Hosted-checkout URL pattern** (`${checkoutBaseUrl}/cs/${id}` + `clientToken`) — standard pattern, fine to keep.

## What to delete or quarantine

- **Keep `/complete` locked behind the internal settlement token.** The local branch now requires `VANTA_PAY_INTERNAL_SETTLEMENT_TOKEN`, so merchant Bearer auth alone cannot complete sessions. The remaining production task is to let only the chain-event subscriber call this after customer payment evidence / `CheckoutPaidEvent` verification.
- **The local mock prover path** in `settleCheckoutSession` and `settleWithdrawal`. Replace with calls into the real prover/verifier from shield-W7. Until that lands, keep `operatorSeesRawMerchantApiTerms: true` and `operatorSeesRawSettlementAdapterTerms: false` scoped separately.
- **Refund endpoint as journal-only.** Either implement on-chain refunds (P4) or label refunds as "credit memos" rather than "refunds" until they actually return funds.
- **Keep the "fully_private_pay_claim: false" flag wired to user-facing copy.** The local branch now consumes the false production-privacy boundary in Pay/docs surfaces; keep forbidden-phrase and claim-control checks as the guard.
- **`saveRuntimeSnapshot` as the only durability layer.** Mark this as a development-mode artifact only. Production must use Postgres transactions.

## Order of operations and rough effort

| # | Workstream | Effort | Depends on |
|---|---|---|---|
| 1 | **Interim**: lock the `/complete` endpoint behind chain-event subscriber only, plus copy audit (P6 partial) | 3–5 days | nothing |
| 2 | P5 (Postgres-backed runtime, real durability, real rate limits) | 3–4 weeks | nothing — independent of cryptographic work |
| 3 | P1 (customer-side wallet flow, hosted checkout page wallet integration) | 3–4 weeks | shield W2 (key hierarchy), shield W7 (real prover) |
| 4 | P2 (escrow PDA + checkout-pay program instruction) | 2 weeks | shield W4 (PDA pattern), shield W6 (Groth16 verifier) |
| 5 | P3 (merchant withdrawal via unshield) | 1 week | unshield U2 done, P2 done |
| 6 | P4 (on-chain refund instruction) | 2 weeks | P2 done |
| 7 | P6 (full copy-vs-code enforcement) | 1–2 weeks | depends on which target chosen |

Total: about 10–12 calendar weeks for Pay-Target-A on top of the shield/unshield foundations. **Pay is the longest lane to ship privately because it has the most product surface area** — refunds, disputes, statements, reconciliation, line items, webhooks — that all need to be consistent with the privacy claims.

The honest answer for most teams in this position is to ship Pay-Target-B fast, drop the privacy framing, and earn merchant trust through PSP feature completeness rather than cryptography. Then add Target A privacy as a premium feature later. The privacy work is real and worth doing, but it's not what most merchants are buying when they pick a payment processor.

## Concrete first commit for Codex (pay-side)

Two parallel one-day fixes that materially close the worst gaps without depending on any of the cryptographic work:

> **Completed locally for the current Pay API/UI truth boundary: `POST /v1/checkout/sessions/{id}/complete` now uses the internal `VANTA_PAY_INTERNAL_SETTLEMENT_TOKEN` boundary instead of merchant Bearer auth, and Pay status/readiness/doc checks disclose that customer payment evidence is not production-wired. Keep UI copy tied to `claimControls.fully_private_pay_claim === false`.**

This closes the local "merchant API key compromise = mark sessions paid arbitrarily" hole for checkout completion and keeps deployed-copy claims subordinate to the code's actual claim controls. It does not touch the cryptographic primitives, customer-side payment evidence, or on-chain program. This older Pay loop did not refresh live deployment evidence; the 2026-05-14 website/audit-copy receipt supersedes only public website status, not cryptographic or Pay private-settlement evidence.

Pair this with a CI check that fails the build if any string matching `/private (payment|checkout|refund|settlement)/i` appears in a `.tsx` file under `src/pages/Pay*` or `src/pages/DocsPay*` while `claimControls.fully_private_pay_claim === false`.

## Files most directly impacted

- **Trust contracts:** `src/pay/vantaPayReceiptPrivacyContract.ts` (already correct shape; needs to be wired into UI) and `src/pay/vantaPayMerchantTrustStatus.ts` (same).
- **Runtime:** `src/pay/vantaPayRuntime.ts` (replace `Map` with Postgres-backed store; bind webhook secret rotation).
- **Settlement adapter:** `src/pay/vantaPayPrivateSettlementAdapter.ts` (replace mock prover with real prover; replace local SHA-256 commitments with Poseidon).
- **Operator:** `operator/pay-server.mjs` (lock `/complete` to internal token; add chain-event subscriber that drives session completion; wire Postgres transactions).
- **On-chain:** `programs/vanta_private_pool_v2_spend/src/lib.rs` (or sibling crate) — add `TAG_CHECKOUT_PAY` and `TAG_CHECKOUT_REFUND`; share verifier and tree state with the rest of the program.
- **Customer checkout UI:** new — a hosted page at `/cs/${id}` with wallet connect + transaction builder. This is currently a gap.
- **Indexer:** the same indexer planned for shield W5 / send S5 also serves the merchant withdrawal path — escrow commitments are tracked in the same tree as everything else.

---

# Final recap, all six lanes

After deep dives on shield, send, swap, unshield, strategy, and pay, the consolidated story is now complete:

The four economic lanes (shield, send, swap, unshield) now have better local honesty guards and fresh action-memo encryption, but they still ship short of production-private settlement because the cryptographic primitives are not connected end-to-end with an on-chain verifier, production tree state, relayer/indexer persistence, and audit acceptance. The strategy lane is positioned as a preview, ships as a preview, and remains the closest to honest in the codebase. The pay lane is positioned as a payment processor, ships as a Stripe-shaped API with no customer payment evidence wired for production in the reviewed code, and still needs operator/runtime data boundaries to stay distinct from settlement-adapter privacy claims.

The single most leveraged sequence of fixes, updated:

1. **Keep fresh action memos on v2 AEAD and finish recipient discovery.** Fresh Send, Swap, Unshield, SOL-Unshield, and spent-marker helpers no longer emit plaintext v1 memos; local Send proof requests/circuits now bind recipient/change ciphertext body-hash fields, and Send v1 plaintext history is excluded from production privacy claims unless migrated or segregated with reviewed evidence. View-tag/indexer discovery, recipient key exchange, and production memo/indexer handoff remain open.
2. **Keep the strategy-lane and pay-lane trust-contract pattern lifted into the other four lanes** — make UI copy derive from explicit `claimControls` objects so the product never claims more than the code can support. **Wire those claim-controls into UI gating, not just static returns.**
3. **Migrate the vault from operator-keypair-in-env to a program-owned PDA** (shield W4, unshield U2). Removes the entire single-env-var custody risk.
4. **Lock the Poseidon note schema** (shield W1) and rebuild the four entry circuits on top of it (shield W3, send S1, swap X1, unshield U1) at depth 20 with real Merkle membership and real ownership constraints.
5. **Wire a real prover** (`@aztec/bb.js`) and embed a Groth16 verifier (Light's `groth16-solana`) so the on-chain program enforces the proofs the circuits already shape.
6. **Build the indexer + memo discovery + view-tag scheme** so users can find their notes from any device without scanning the full chain.
7. **Decide whether Pay is privacy-first or payments-first** and align copy with the choice. Build the customer-side wallet flow if privacy-first; build the boring PSP feature set if payments-first.

After those seven are done, all six lanes become real, and the product catalog matches the code. Until they're done, the most useful thing the project can do is keep the strategy- and pay-lane gating posture (fail-closed flags, claim-controls), apply it everywhere, and audit user-facing copy against it on every release.

---

# Docs Pass

The docs are the pleasant surprise of this review. Read in isolation, the documentation set is the single most honest part of the project: explicit non-goals, fail-closed framing, careful word choice, repeated reminders that nothing here is audited or mainnet-ready. The team's own `MISSION.md` declares the rule that should govern every public surface:

> *Avoid anonymous, untraceable, fully private, production-ready, mainnet-private, or trustless-privacy claims unless the exact claim has been verified by the matching production, audit, operator, and mainnet gates.*

If that rule were enforced everywhere, the gap between code and copy this review keeps surfacing would mostly close. The work is making the rule actually binding instead of advisory.

## What's in scope

Three categories of documentation, all of which a reviewer or future operator will encounter:

**Top-level repository docs** (8 files, ~3.5k lines combined):
`README.md` (805 lines), `MISSION.md` (43), `DESIGN.md` (430), `SECURITY_LIMITATIONS.md` (136), `SUBMISSION.md` (783), `AGENTS.md` (290), `VANTA_VAULT.md` (23), and the new `VANTA_ZK_REVIEW.md` produced by this work.

**`docs/` folder** (18 markdown files plus 4 in `docs/architecture/` and 19 in `docs/zk/`, ~5k lines combined):
The most load-bearing files for reviewers are `docs/audit-package.md`, `docs/operator-runbook.md`, `docs/privacy-model.md`, `docs/privacy-rail-contract.md`, `docs/mvp-real.md`, `docs/mainnet-deployment-runbook.md`, `docs/mainnet-external-gates.md`, and the `docs/zk/` series describing canonical notes, Noir hash decisions, and per-lane proof boundaries.

**In-app `/docs` pages** (`src/pages/Docs*.tsx`):
`DocsHomePage`, `DocsPortalPage`, `DocsPayPage`, `DocsTrustPage`, `DocsSecurityPage`, `DocsRoadmapPage`. These render at `vantaprivacy.xyz/docs/*` and are the only docs most users will see. They are sourced from `src/docs/docsContent` (component-driven) rather than from the markdown files, which means the user-facing docs and the operator-facing docs evolve independently.

## What the docs do well

There's a pattern across the careful docs that's worth naming, because lifting it into the rest of the project closes most of the copy-vs-code gap.

- **`MISSION.md`** establishes a forbidden-phrase rule in plain language. The list ("anonymous, untraceable, fully private, production-ready, mainnet-private, trustless-privacy") is concrete enough to grep for.
- **`SECURITY_LIMITATIONS.md`** enumerates exactly what the project can claim today and what it cannot, by lane. The framing is excellent: every claim is paired with what would have to be true to upgrade it.
- **`docs/privacy-model.md`** scopes v1 narrowly — one asset, one environment, one shield, one send — and explicitly lists non-goals: "perfect privacy under all adversarial conditions, production-grade protocol completeness, comprehensive obfuscation of all metadata."
- **`docs/audit-package.md`** opens with *"This document is the starting handoff for future reviewers. It is not an audit report. It does not make Vanta mainnet-ready."* The Out-of-Scope list and Known Non-Production Boundaries section are correctly framed.
- **`docs/privacy-rail-contract.md`** introduces the `alpha-public-warning | umbra-mainnet | vanta-private-pool-v2` rail model and gates each rail's claim strength on the existence of named env refs. **This is the most architecturally important doc in the project.** It is the gating pattern I praised in the strategy and pay deep dives, applied to language: a claim like "production-private settlement" is allowed only after specific refs (capability, asset, signing-evidence, limitations) exist for the rail in question.
- **`DocsHomePage.tsx`** opens with: *"The beta truth is part of the product."* User-facing copy that names its own beta-ness is unusual and good.
- **`DocsSecurityPage.tsx`** glossary distinguishes "public wallet flow" / "private state" / "preview" — a tight three-term vocabulary that, if used consistently, would prevent most of the loose-language drift.

The repeated pattern across these docs is "name the limit, name the gate that would lift it, refuse to lift the claim until the gate is satisfied." When this pattern is followed, the docs are bulletproof. When it's not, the docs drift toward marketing.

## Where the docs and code disagree

Six specific gaps. Each is a place where the docs are accurate-ish in isolation but, read against the code, are misleading either by abstraction, by omission, or by phrasing.

### D1. The audit-package's prose checklist is not encoded as automated checks

`docs/audit-package.md` instructs reviewers to inspect, among other things:

- *"whether public inputs bind to the thing being proved"*
- *"whether nullifiers and replay checks prevent the same private state from being reused"*
- *"whether valid fixtures pass and invalid fixtures fail"*

These are exactly the questions whose answers, in this review, were "no" for several circuits — `vanta_private_pool_v2_send_entry` and `_swap_to_shielded_entry` and `_claim_entry` and `_shield_entry` have public inputs that don't bind Merkle membership; `vanta_private_core_single_note_swap` has an additive asset-difference check that's bypassable; the unshield circuit has a dead-code ownership assertion (`assert(x == x)`).

But the named verification commands — `npm run private-core:verify`, `npm run private-pool-v2:verify` — pass on these circuits because the fixtures are valid by construction. **The verification scripts check that fixtures compile and that they round-trip; they don't audit the circuit constraints.** A reviewer who follows only the scripts gets a green pass on circuits that have soundness issues; a reviewer who reads the audit-package's prose questions and actually inspects the Noir source will find what this review found.

The gap is: prose checklists are not enforcement. **Encode the audit checklist as static-analysis CI checks** — e.g., a Noir-source linter that fails the build if a circuit (a) takes a witness without using it in any constraint, (b) compares two field-element witnesses by additive sum rather than via difference-times-inverse, (c) declares a public input that's not constrained by any assertion. Three lints would catch every soundness issue this review surfaced.

### D2. `privacy-model.md` is so abstract it's compatible with both A and C

The privacy-model document carefully says:

> *Whether the underlying protocol uses notes / commitments / shielded account abstractions / UTXO-like objects is an implementation detail, but the product model must remain stable: public balance / shielded balance / private action from shielded balance.*

The honest reading is "we haven't picked a final cryptographic substrate yet, but the product model survives any of them." That's a reasonable place to be early.

The dishonest reading — and the one the deployed code currently fits — is "shielded state is whatever the operator says it is, including a custodial vault with browser-localStorage bookkeeping." This is *also* compatible with the doc, because "shielded balance" is left undefined.

A reader who ships in privacy mental models from Tornado / Aztec / Penumbra will assume "shielded state" means a shared on-chain commitment tree with cryptographic ownership, because that's what the term means in those systems. The doc does nothing to disabuse them. The deployed code is custodial-with-bookkeeping. **The privacy-model doc should explicitly disambiguate**: at minimum, add a "What 'shielded state' means in the deployed system today" section that names the gap between the abstract product model and the concrete current implementation.

### D3. The SHA-256 vs Poseidon split is documented in pieces but never together

Three docs touch the hash-contract question:

- `docs/zk/canonical-note-schema.md` describes the canonical note shape and says commitments derive from those fields, without specifying the hash.
- `docs/zk/noir-hash-contract-decision.md` decides Poseidon for the Noir proving lane and says *"existing TypeScript note/state machinery still uses transitional SHA-256-oriented seams in places."*
- The deployed live-shield bridge (`src/zk/liveShieldBridge.ts`) computes a SHA-256 commitment via `deriveCanonicalNoteArtifacts` and stores it in localStorage as the "shielded state."

A reader reading any *one* of these docs believes a different thing:

- canonical-note-schema reader: "there's one canonical commitment, derivation-tagged"
- noir-hash-contract-decision reader: "circuits use Poseidon, app uses SHA-256, they'll converge"
- liveShieldBridge code reader: "the shielded state I'm seeing in localStorage is a SHA-256 hash chain"

The three are mutually consistent only if you read all three. **The canonical-note-schema doc should land the Poseidon-vs-SHA-256 split as a labeled "Transitional Hash Surface Today" section** so a reader doesn't need the cross-reference graph to understand which commitments are circuit-bound and which are display-only.

### D4. The "trust packet" promise inherits unlanded gates

The "trust packet" concept appears in `MISSION.md` ("Trust packet is the growth artifact"), `docs/privacy-rail-contract.md`, the `DocsTrustPage`, and the npm scripts (`npm run shield:trust-packet-check`, `npm run send:trust-packet-check`, `npm run swap:trust-packet-check`, `npm run unshield:trust-packet-check`).

The product idea is solid: make private settlement useful to counterparties by producing a verifiable receipt for each action. The framing is the right one for a privacy product that wants real-world distribution.

But the trust packets are only as strong as the underlying circuits and proofs. With the lane-level gaps documented above, a "trust packet" today is: a redacted JSON object listing commitments computed off a mock prover's SHA-256, sealed inside a Stripe-shaped envelope. **The promise the docs make about trust packets is a future promise, not a current one** — and several places in the docs and product copy describe trust packets as if they're a working primitive ("Trust packet is the growth artifact").

The fix is small: every trust-packet-shaped doc surface should add a one-sentence honesty note: *"Today's trust packets bind to current operator-shaped commitments; full cryptographic verifiability requires the proof and verifier work tracked in the SECURITY_LIMITATIONS gate list."* Or equivalently: gate the noun "trust packet" itself behind the same claim-controls pattern the strategy and pay lanes use, so the term doesn't render in user-facing copy until the underlying proofs are real.

### D5. Operator runbook is comprehensive but un-actionable for new readers

`docs/operator-runbook.md` is 1400 lines listing ~50 readiness check commands. It's the right inventory of *what should exist*, but for a reviewer or new operator landing on it cold, there's no curated entry point. The same complaint applies to the README's "Demo-Day Proof Points" section: 6 commands with overlapping coverage, no clear "if you only run one thing" path.

A reviewer's first ten minutes with the project are spent figuring out which of the 50 commands actually matter today. **Add a top-of-runbook "If you have 10 minutes" section** with the three commands that produce the most informative single output. From the lane deep dives, those are likely:

- `npm run mainnet:readiness-json` — produces the structured readiness state in one JSON blob
- `npm run private-pool-v2:verify` — exercises the circuit fixtures and prover
- `npm run pay:verify` — exercises the merchant API contract

Anything beyond those three should be reachable from the runbook but not the entry point.

### D6. In-app `/docs` and `/docs/*.md` evolve independently

The user-facing `/docs` pages are React components that pull metadata from `src/docs/docsContent`; the operator-facing `/docs/*.md` files live in the repo and are read directly. A change to "what does shield mean" in the markdown doesn't propagate to the in-app page; a change to the in-app copy doesn't propagate to the markdown.

This is a minor risk today (the shipped copy is conservative on both surfaces), but it's a class of bug worth eliminating before the lanes get more complex. **Pick one as the source of truth** — either generate the in-app docs from the markdown (parse + render) or generate the markdown from the React components (export to file). Whichever path is simpler. Today the cost of having both is low; in 6 months when product copy needs to be edited under deadline, the cost will be a wrong claim shipped to one surface but not the other.

## Specific edits I would recommend

Smallest-first, pinned to specific files:

1. **Add a "Last validated" header to `SECURITY_LIMITATIONS.md`.** A single dated line at the top: `Last validated against deployed code: YYYY-MM-DD`. Bump on every release. Lets readers tell whether the limitations they're reading are current.

2. **Add a `LANE_STATUS.md` at the repo root.** A table — one row per lane (shield, send, swap, unshield, strategy, pay), columns for: current target (A/B/C from the lane deep dives), trust-contract `productionReady`, verifier present (mock/real), vault custody model (operator-key/PDA), claim-controls flags. This is the artifact a reviewer or product manager would most often want and that doesn't currently exist as a single page.

3. **Add a "What 'shielded state' means today" section to `docs/privacy-model.md`.** Two paragraphs: one describing the abstract model, one describing the deployed-implementation mapping (SPL transfer to vault + localStorage commitment list). Closes D2.

4. **Add a "Transitional Hash Surface" section to `docs/zk/canonical-note-schema.md`.** Lists which surfaces use SHA-256 today vs Poseidon. References `noir-hash-contract-decision.md` for the migration plan. Closes D3.

5. **Add an honesty note to every trust-packet doc/UI surface.** One sentence, copy-pasted: *"Trust packets bind to current operator-shaped commitments; cryptographic verifiability against an audited proof system is part of the readiness work tracked in `SECURITY_LIMITATIONS.md`."* Closes D4.

6. **Top-of-`operator-runbook.md` "If you have 10 minutes" section.** Three commands. Closes D5.

7. **Decide on a single docs source of truth.** Either parse `docs/*.md` into the in-app pages or export the in-app pages to markdown. Closes D6.

8. **Encode the audit-package prose checklist as Noir lints.** New CI step `npm run zk:circuit-soundness-lint` that walks every `zk/noir/**/main.nr` and fails if (a) a witness is unused in any constraint, (b) any equality check between two field elements is implemented as additive comparison, (c) any public input is not transitively bound by an assert. Closes D1.

9. **Add a CI check for forbidden-phrase usage.** Greps `src/pages/**.tsx`, `src/docs/**`, and `docs/*.md` for the phrase list in `MISSION.md` ("anonymous, untraceable, fully private, production-ready, mainnet-private, trustless-privacy") and fails the build if any appears outside an explicit "this is the thing we are NOT claiming" context. The existing claim-controls flags can drive a per-phrase allowlist.

10. **Hoist `MISSION.md`'s Definition of done to the README.** It's currently the most concise priority list in the project and it's buried in MISSION.md. Putting it under "What Works Today" in `README.md` would let any first-time reader see the actual readiness scorecard without hunting.

## What this review's own document should do

`VANTA_ZK_REVIEW.md` (this file) is now ~1900 lines and covers six lanes plus this docs pass. It should not be the canonical reference forever. Two suggestions for its long-term place in the repo:

- **Split it.** Each lane's deep-dive section becomes a sibling document under `docs/review/`: `docs/review/shield.md`, `docs/review/send.md`, etc. The cross-lane summary stays as `docs/review/README.md`. Easier to update one lane without re-touching the whole file.
- **Or freeze it as a dated snapshot.** Rename to `VANTA_ZK_REVIEW_2026_05_09.md` and treat it as a point-in-time audit. Future reviews land as new dated files. This is more honest about the temporal validity of the findings — every "today the code does X" statement in this document is a 2026-05-09 claim that may or may not still hold.

Either is fine. The current single-monolithic-file form is the worst long-term shape because it invites both partial updates that drift and full-file rewrites that lose history.

## Final assessment of docs

The docs are the part of this project I would change least. The framing is honest, the gating pattern (`privacy-rail-contract.md`'s ref-conditional claims) is correct, the disclaimers are explicit. The work isn't fixing the docs — it's:

- making the docs' gating pattern enforceable in CI (D1, recommendation #8 and #9),
- closing two specific abstraction-vs-implementation gaps (D2, D3),
- gating the "trust packet" noun like the strategy/pay lanes already gate their privacy claims (D4),
- and lowering the friction for a new reader (D5, D6, recommendations #2, #6, #7, #10).

After all six lane deep dives and this docs pass, my single most leveraged recommendation for the project, summarizing across all of them, is this: **the gating pattern that already lives in the strategy lane (claim-controls flags), the pay lane (receipt privacy contract), and the docs (`privacy-rail-contract.md`'s rail/ref model) is the right enforcement mechanism. Apply it everywhere, wire it into UI and CI, and let the gates carry the load that careful prose is currently carrying.** Every other recommendation in this document is a specific instance of that meta-recommendation.

The team has built the right framework for shipping a privacy product honestly. The remaining work is using it.

---

## Codex progress notes - 2026-05-09

First local hardening slice started:

- Added an operator-authority gate to `programs/vanta_private_pool_v2_spend`. Init stores the authority, spend requires the same read-only signer, and the pool state layout is now 152 bytes.
- Updated local transaction builder, printer, relayer submission checks, operator packet surfaces, service manifests, secret references, and production-review evidence to require `VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY`.
- Marked existing reviewed mainnet spend-program/account evidence as pre-authority-gate and therefore blocked/incompatible until redeploy/reinitialization.
- Updated the Crucible dry-run harness to include authority state and unsigned/wrong-authority spend attempts.
- Replaced the owner-recovery payload encryption construction with X25519 + HKDF-SHA256 + XChaCha20-Poly1305 and added `npm run zk:owner-recovery-payload-crypto-check`.

Verification passed locally: `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, Solana SBF build for the spend program, `npm run private-pool-v2:crucible-check`, `npm run private-pool-v2:verify`, `npm run zk:owner-recovery-payload-crypto-check`, `npm run build`, `npm run private-core:check`, and `git diff --check`.

At this earlier pass, still open from this review: real on-chain proof verification, real Private Pool v2 entry-circuit membership/append constraints, `canonical_note_membership` hash replacement, non-linear nullifier storage, and the plaintext memo/privacy architecture work.

### Second local ZK pass - 2026-05-09

- Repaired `zk/noir/canonical_note_membership` by switching it to the repo-standard `noir-lang/poseidon` dependency, replacing additive note hashing with `bn254::hash_10`, replacing additive Merkle root math with Poseidon leaf/node hashing, constraining direction bits, and binding direction bits to the declared leaf index.
- Added `npm run zk:canonical-note-membership-check` with valid and invalid fixtures for bad commitment, bad root, bad direction bit, and bad leaf index.
- Back-ported consume-membership constraints into `vanta_private_pool_v2_send_entry`, `claim_entry`, and `swap_to_shielded_entry`. Each now checks a fixed-depth Merkle path for the input commitment and rejects forged input roots.
- Replaced `shield_entry`'s fake append transition with a path-based empty-leaf-to-output-leaf transition. It now rejects the prior `poseidon3(previous_root, output_commitment, leaf_index)` forged append fixture.
- Strengthened `private-pool-v2:contract-check` markers so these membership/append guards stay visible in the contract surface.

Red-first failures observed locally: `zk:canonical-note-membership-check` failed on the old placeholder circuit, `private-pool-v2:send-circuit-check` / `claim-circuit-check` / `swap-to-shielded-circuit-check` failed because forged input roots unexpectedly solved, and `private-pool-v2:shield-circuit-check` failed because the fake append transition unexpectedly solved.

Verification passed locally: `npm run zk:canonical-note-membership-check`, `npm run private-pool-v2:shield-circuit-check`, `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:claim-circuit-check`, `npm run private-pool-v2:swap-to-shielded-circuit-check`, their matching prove commands, `npm run private-pool-v2:public-input-hash-alignment-check`, `npm run private-core:check`, full `npm run private-pool-v2:verify`, and `git diff --check`.

At this earlier pass, still open after the second pass: output append-path semantics for send/swap successors remain fake append hashes, all affected lanes are still depth 3 except the canonical membership target, real on-chain proof verification is not wired, nullifier storage is still linear/fixed-capacity, and plaintext memo/privacy architecture work remains.

### Third local ZK pass - 2026-05-09

- Standardized Private Pool v2 Merkle node hashing across `shield_entry`, `send_entry`, `claim_entry`, `swap_to_shielded_entry`, and `actual_private_spend_entry` by removing the direction bit from the parent hash.
- Updated the matching TypeScript fixtures to compute tree parents with `poseidon2([left, right])`, using direction bits only to order `(current, sibling)` and to bind the declared leaf index.
- Added `npm run zk:merkle-node-hash-contract-check`, a source-level guard that fails if the covered circuits reintroduce `hash_merkle_node(left, right, is_current_right)` / `hash_3([left, right, is_current_right])` or if the matching fixtures reintroduce direction-bit `poseidon3` parent hashing.

Red-first failure observed locally: `npm run zk:merkle-node-hash-contract-check` failed against the old Private Pool v2 direction-bit node helper before the circuit/fixture updates.

Verification passed locally: `npm run zk:merkle-node-hash-contract-check`, `npm run private-pool-v2:actual-private-spend-circuit-check`, `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:claim-circuit-check`, `npm run private-pool-v2:shield-circuit-check`, `npm run private-pool-v2:swap-to-shielded-circuit-check`, `npm run private-pool-v2:public-input-hash-alignment-check`, full `npm run private-pool-v2:verify`, `npm run zk:canonical-note-membership-check`, `npm run private-core:check`, and `git diff --check`.

At this earlier pass, still open after the third pass: the Private Core single-note send/swap/unshield circuits still carry the older hi/lo and direction-bit-oriented Merkle surfaces; output append-path semantics for send/swap successors still need real successor append proofs; most active lanes remain depth 3; on-chain proof verification is still not wired; nullifier storage remains fixed/linear; and plaintext memo/privacy architecture work remains.

### Fourth local ZK pass - 2026-05-09

- Extended `npm run zk:merkle-node-hash-contract-check` to cover the Private Core single-note send/swap/unshield circuits and their TypeScript witness builders.
- Replaced Private Core split Merkle sibling witnesses with single-field `membership_path` arrays across the Noir circuits, witness packages, fixture writers, and operator proof serializer.
- Projected source-layer 32-byte Merkle siblings into the proving lane with Poseidon before standard parent hashing, then used `hash_2(left, right)` / `poseidon2([left, right])` for every Private Core parent node.
- Added leaf-index binding to Private Core send and swap, matching the membership convention already present in unshield and the Private Pool v2 entry circuits.

Red-first failures observed locally: the expanded Merkle contract guard failed on the old Private Core send helper; the new send/swap invalid-leaf-index fixtures unexpectedly solved before the leaf-index constraints were added; and the first full `npm run private-core:verify` rerun caught the old operator proof serializer still expecting split sibling arrays.

Verification passed locally: `npm run zk:merkle-node-hash-contract-check`, `npm run private-core:check`, `npm run private-core:send-check`, `npm run private-core:swap-check`, `npm run private-core:prove`, `npm run private-core:send-prove`, `npm run private-core:swap-prove`, focused no-witness/proof-artifact checks, full `npm run private-core:verify`, and `git diff --check`.

Still open after this fourth pass: the proving lanes remain depth 3, source-layer note/tree hashes still carry transitional SHA-style semantics, owner auth remains off-circuit for v0.1, send/swap successor append semantics and Private Pool v2 production verifier wiring remain incomplete, on-chain proof verification is not wired, and this was not pushed or deployed/live.

### Fifth local ZK pass - 2026-05-09

- Replaced the remaining Private Pool v2 Send/Swap successor output-root shortcuts with private append-path witness constraints in the local fixed-depth Poseidon circuit lane.
- `vanta_private_pool_v2_send_entry` now proves that the recipient append path is empty under `input_root`, that the recipient output commitment produces `recipient_output_root`, that the change append path is empty under `recipient_output_root`, and that the change output commitment produces `change_output_root`. Both append-path direction-bit arrays are bound to their declared output leaf indices.
- `vanta_private_pool_v2_swap_to_shielded_entry` now proves that the output append path is empty under `input_root`, that the output commitment produces `output_root`, and that append-path direction bits bind `output_leaf_index`.
- The send/swap TypeScript fixtures now build coherent depth-3 Poseidon trees for input membership and successor output append paths, bump their fixture contract versions to `0.2`, serialize the new private append witnesses, and include forged recipient/change/output append-path negative fixtures.
- `npm run zk:merkle-node-hash-contract-check` now forbids reintroducing transitional `hash_3(previous_root, output_commitment, leaf_index)` successor append roots in the covered Send/Swap circuits and fixtures.

Red-first failures observed locally: after the fixtures emitted path-derived roots, `npm run private-pool-v2:send-circuit-check` and `npm run private-pool-v2:swap-to-shielded-circuit-check` failed against the old `hash_3` circuits on otherwise valid witnesses. The same checks passed after the Noir circuits were updated, including the new forged append-path negative fixtures.

Verification passed locally: `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:swap-to-shielded-circuit-check`, `npm run private-pool-v2:send-prove`, `npm run private-pool-v2:swap-to-shielded-prove`, `npm run private-pool-v2:public-input-hash-alignment-check`, `npm run private-pool-v2:contract-check`, `npm run zk:merkle-node-hash-contract-check`, `npm run security:limitations-check`, `npm run build`, full `npm run private-pool-v2:verify`, and `git diff --check`. Full Private Pool v2 verify still emits existing Crucible harness warnings (`mach_task_self` deprecation and unused mut), but the dry-run harness passed.

Still open after this fifth local ZK pass: active lanes remain `MERKLE_DEPTH = 3`, the operator/indexer SHA-256 local root scheme is not proven inside Noir, output append monotonicity still depends on operator/indexer state outside the circuit, on-chain proof verification is not wired, nullifier storage remains fixed/linear where applicable, no audit has accepted the boundary, and no live deployment evidence was refreshed.

### Sixth local ZK pass - 2026-05-09

- Added a Poseidon/BN254 canonical note proving commitment alongside the legacy SHA-256 display/audit commitment in `src/zk/canonicalNote.ts`.
- `CanonicalNoteArtifacts` now carries `provingCommitment`, `liveShieldBridge.ts` records it through the shared artifact deriver, and `liveSendBridge.ts` preserves successor proving commitments while redacting encrypted payload bytes from browser storage.
- Added `npm run zk:canonical-note-proving-commitment-check`, which independently checks the BN254 field encoding, Poseidon field vector, creation-hint exclusion, u128 amount bound, artifact persistence, and aggregate verification wiring.
- Added `npm run zk:review-guards-check` and wired it into both `npm run private-pool-v2:verify` and `npm run private-core:verify` so the canonical note membership, Merkle hash contract, owner-recovery crypto, and proving-commitment guards cannot drift out of the named verifier paths.
- Strengthened `private-pool-v2:contract-check` so Solana spend-authority evidence guards stay visible in the contract surface, including authority signer markers, transaction builder/printer/relayer markers, Crucible authority-negative fixtures, and verify-script inclusion.
- Updated mainnet private-settlement/readiness status to disclose that reviewed mainnet spend-program evidence predates the current authority-gated ABI and remains blocked until redeploy/reinit.
- Added Private Pool v2 Send amount-conservation constraints: the Send circuit now proves a private economics commitment and asserts `input_amount == recipient_amount + change_amount`; the fixture lane adds an `invalid-amount-conservation` negative case.
- Updated `SECURITY_LIMITATIONS.md` and `docs/zk/canonical-note-schema.md` with the current SHA-256-vs-Poseidon hash surface and the remaining beta truth.

Verification passed locally: `npm run zk:canonical-note-proving-commitment-check`, `npm run zk:review-guards-check`, `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:contract-check`, `npm run security:limitations-check`, `npm run mainnet:private-settlement-check`, `npm run mainnet:readiness-check`, `npm run build`, full `npm run private-pool-v2:verify`, full `npm run private-core:verify`, and `git diff --check`. Full Private Pool v2 verify still emits existing Crucible harness warnings (`mach_task_self` deprecation and unused mut), but the dry-run harness passed.

Still open after this sixth local ZK pass, before the later amount-range and root-history loops: active lanes remain `MERKLE_DEPTH = 3`, Send amount conservation is proven over field elements without range constraints, the operator/indexer SHA-256 local root scheme is not proven inside Noir, output append monotonicity still depends on operator/indexer state outside the circuit, on-chain proof verification/root-history enforcement is not wired, nullifier storage remains fixed/linear where applicable, no audit has accepted the boundary, and no live deployment evidence was refreshed.

### Seventh local ZK/review-guard pass - 2026-05-09

- Narrowed Private Pool v2 Send economics witnesses from `Field` to `u128` before Poseidon field encoding. The new `invalid-amount-range` fixture uses a `2^128` amount and now fails at Noir type validation instead of solving over the BN254 field.
- Added `npm run zk:circuit-soundness-lint` and wired it into `npm run zk:review-guards-check`. The lint forbids self-equality witness no-ops, additive membership path collapse, old placeholder hash TODOs, direction-bit Merkle parent hashes, and transitional `hash_3(previous_root, output_commitment, leaf_index)` successor roots. It reports the remaining depth-3 lanes as an open migration rather than pretending depth-20 is complete.
- Replaced two Private Core owner-auth no-op asserts with nonzero secret constraints while preserving the explicit v0.1 truth that owner/sender key authorization remains prechecked off-circuit.
- Hardened the Solana spend program locally: init now rejects reinitialization, `pool_state` stores the initialized nullifier-set and output-queue account keys, spend rejects mixed account triplets, duplicate scanning only covers initialized nullifier slots, and the local builder/printer/relayer checks required byte-packed `tag=1` / 129-byte spend data plus current-path `relayerFeePayer == operatorAuthority` until co-signing exists. This seventh-pass ABI was later superseded by the twelfth loop's 161-byte accepted-root payload and bound root-history account.
- Added review-handoff docs artifacts and checks: `LANE_STATUS.md`, `docs/docs-source-of-truth.md`, `npm run docs:source-of-truth-check`, a top-of-runbook "If You Have 10 Minutes" path, `SECURITY_LIMITATIONS.md` last-validation metadata, and README definition-of-done visibility.
- Trust-packet surfaces now include the shared honesty note that packets bind current operator-shaped commitments, not audited cryptographic verifiability. The Send packet now also discloses current legacy v1 public-chain memo leakage with `sendMemoMode` and `publicChainVisibleFields`.
- Product copy that implied Send privacy before AEAD successor discovery was demoted from "Private Send / Move value privately" language to guarded shielded-state Send language.

Red-first evidence observed locally: `npm run private-pool-v2:send-circuit-check` failed before the `u128` change because the `2^128` amount fixture solved successfully; after the circuit type change it failed as expected. `npm run private-core:send-check` then caught a bad attempted owner-key variable reference before the owner-auth placeholder cleanup was corrected.

Verification passed locally: `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:send-prove`, `npm run private-core:send-check`, `npm run private-core:consume-check`, `npm run zk:review-guards-check`, `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `npm run private-pool-v2:solana-spend-transaction-builder-check`, `npm run private-pool-v2:solana-spend-transaction-check`, `npm run private-pool-v2:solana-relayer-submission-check`, `npm run private-pool-v2:contract-check`, `npm run docs:source-of-truth-check`, `npm run security:limitations-check`, `npm run operator:runbook-check`, `npm run privacy-rail:contract-check`, `npm run send:trust-packet-check`, `npm run swap:trust-packet-check`, `npm run build`, full `npm run private-pool-v2:verify`, full `npm run private-core:verify`, `npm run docs:verify`, and `git diff --check`. Full Private Pool v2 verify rebuilt and dry-ran the Crucible fuzz harness successfully, with the existing `mach_task_self` deprecation and unused-mut warnings.

Verification caveat: `cargo-build-sbf` is not installed in this environment, so the Solana SBF `.so` was not rebuilt for the new 152-byte pool-state ABI during this pass.

Still open after this seventh local pass, before the later root-history and Private Core amount-range loops: active proving lanes remain `MERKLE_DEPTH = 3`, amount range/carry discipline beyond Private Pool v2 Send is incomplete, Send recipient discovery still needs the AEAD v2 recipient/change memo and view-tag/indexer design, on-chain proof verification/root-history enforcement is not wired, fixed-capacity/O(n) nullifier storage still needs PDA/sharded redesign, no audit has accepted the boundary, and no live deployment evidence was refreshed.

**Codex status, 2026-05-09:** partially remediated locally after the seventh pass for public-chain action memo leakage. New Send, Swap, Unshield, SOL-Unshield, and spent-marker action memo helpers now emit v2 viewing-key AEAD ciphertext and fail closed without a Shield viewing public key; `fetchVantaShieldAccountState` parses v2 first and falls back to legacy v1 plaintext so historical memos remain readable. Guard: `npm run actions:memo-encryption-check`, now included in `npm run truth:privacy-claim-gate` and `npm run send:verify`. Residual caveat: Send recipient discovery is still not fully solved because the live Send page currently only has the local sender viewing key; production-private Send still needs recipient viewing-key exchange or view-tag/indexer discovery, plus the standing live settlement, relayer, anonymity, replay, audit, and on-chain proof/root-history gates.

### Twelfth Codex feedback loop - Solana root-history ABI and SBF status guard

This local slice moved the Solana spend-program review item from "root history absent" to "root-history scaffold present, proof verifier still absent":

- `programs/vanta_private_pool_v2_spend/src/lib.rs` now carries the 184-byte pool-state ABI, `TAG_REGISTER_ROOT`, a bound `root_history` account, 161-byte spend payloads with `acceptedRoot`, and custom errors for full/duplicate/unknown roots.
- The spend path rejects an unregistered accepted root before mutating nullifier/output/pool state, while `process_register_root` lets only the initialized operator authority append roots to the bound root-history account.
- The Crucible harness now models root-history capacity, root registration, unknown-root rejection, root-history account bindings, and root count/content invariants.
- Transaction builder, printer, relayer-submission, README, mainnet-shaped smoke template, and `private-pool-v2:contract-check` surfaces now expect the root-history ABI.
- New local status surface: `npm run private-pool-v2:sbf-abi-status` reports whether the local SBF binary is fresh for the current 184-byte / 161-byte root-history ABI, and `npm run private-pool-v2:sbf-abi-check` fail-closes when the binary/toolchain is stale or unavailable.

Verification caveat: this is still not on-chain proof verification. The root-history list is operator-authorized and program-bound, but it is not yet proof-backed by a program-owned Merkle tree or a verifying-key hash. The local SBF `.so` is currently older than `src/lib.rs`, and `cargo-build-sbf` / `solana` CLI availability is a toolchain blocker for rebuild/deploy/reinit evidence.

Still open after this twelfth local pass, before the later depth-20, dual-AEAD, and body-hash binding loops: active proving lanes remain `MERKLE_DEPTH = 3`, amount range/carry discipline beyond Private Pool v2 Send and Private Core Send/Swap is incomplete, recipient-grade Send discovery still needs viewing-key exchange / dual recipient-change encryption / then-unwired ciphertext body-hash proof binding, on-chain proof verification/verifying-key enforcement is not wired, root-history is only a fixed-slot operator-fed scaffold, fixed-capacity/O(n) nullifier storage still needs PDA/sharded redesign, no audit has accepted the boundary, and no live deployment evidence was refreshed.

### Thirteenth Codex feedback loop - action memo, amount-range, Unshield auth, and Pay truth gates

This local slice closed the next review-loop footguns that could make beta surfaces sound more private or more payment-ready than they are:

- Send, Swap, Unshield, SOL-Unshield, and spent-marker action memo helpers now require a Shield viewing public key and emit `v2` AEAD ciphertext; fresh helpers no longer create plaintext `v1` memos, while parsers still fall back to `v1` for historical chain records.
- Send, Swap, and Unshield pages now pass the local viewing key into action memo builders, and `npm run actions:memo-encryption-check` verifies v2 prefixes, no raw term leakage, wrong-key rejection, fail-closed no-key creation, legacy parse compatibility, and UI viewing-key adoption.
- Private Core Send, Swap, and Unshield amount limbs are now constrained as `u64`; Send also uses carry-aware input amount reconstruction, with `invalid-amount-range`, `valid-amount-carry`, Swap invalid amount fixtures, and Unshield invalid amount fixtures covering the new boundaries.
- The Unshield `transition-authorized` sentinel path was removed from browser and operator auth, leaving wallet-signed message intents as the public-exit authorization boundary.
- Pay checkout completion is demoted to an internal local/test harness unless a customer payment evidence reference is supplied; `/v1/checkout/sessions/{id}/complete` now requires `VANTA_PAY_INTERNAL_SETTLEMENT_TOKEN`, and docs/status/readiness surfaces disclose that customer-side payment evidence is not wired for production.

Verification run during this slice so far: `npm run actions:memo-encryption-check`, `npm run truth:privacy-claim-gate`, `npm run lanes:trust-contract-check`, `npm run unshield:public-exit-surface-check`, `npm run private-core:send-check`, `npm run private-core:swap-check`, `npm run private-core:check`, `npm run zk:review-guards-check`, `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `npm run private-pool-v2:contract-check`, `npm run private-pool-v2:solana-spend-transaction-builder-check`, `npm run private-pool-v2:solana-spend-transaction-check`, `npm run private-pool-v2:solana-relayer-submission-check`, `npm run pay:merchant-api-check`, `npm run pay:production-readiness-contract-check`, `npm run pay:doc-truth-check`, and `npm run docs:source-of-truth-check`.

Still open after this thirteenth local pass: active proving lanes remain `MERKLE_DEPTH = 3`, recipient-grade Send discovery and production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces remain open, on-chain proof verification/verifying-key enforcement is not wired, root-history and nullifier storage remain fixed-slot local scaffolds, no audit has accepted the boundary, and no live deployment evidence was refreshed.

### Fourteenth Codex feedback loop - amount ranges, Send recipient fail-close, and Pay false-ready guard

This local slice closed the three actionable findings from the follow-up diff review:

- Canonical note membership now constrains amount limbs as `u64` and has an `invalid-amount-range` negative fixture.
- Private Pool v2 Shield now constrains the shield amount as `u128`, recomputes the economics commitment in its invalid-range fixture, and checks that the circuit rejects `2^128`.
- Private Pool v2 Claim now has an `invalid-amount-range` fixture wired through the fixture writer and circuit checker. `amount` and `relayer_fee` are constrained as `u128` at the Noir ABI and cast to `Field` only at the Poseidon hash boundary.
- `npm run zk:circuit-soundness-lint` now fail-closes if canonical-note, Shield, or Claim amount ABIs regress to raw `Field`.
- `pay:status-json` now includes customer payment evidence in its production-ready calculation. The production-readiness contract check runs a fully configured Pay status subprocess and asserts `productionReady: false` while `customerPaymentEvidenceWired` remains false.
- Live Send v2 now fails closed for non-self recipients before action memo creation, because the page only has the local sender viewing key. This preserves AEAD memo privacy until recipient viewing-key exchange, view tags, or another recipient-discovery design is actually wired.

Red-first checks observed during this slice: `npm run private-pool-v2:claim-circuit-check` initially allowed the `2^128` Claim amount; `npm run pay:production-readiness-contract-check` initially saw `pay:status-json` report `productionReady: true` with customer payment evidence unwired; and `npm run actions:memo-encryption-check` initially failed on the missing non-self Send fail-closed guard. The same three commands then passed after the patches. Additional range closure verified with `npm run zk:canonical-note-membership-check`, `npm run private-pool-v2:shield-circuit-check`, and `npm run zk:circuit-soundness-lint`.

Broader verification after this pass included `npm run private-core:check`, `npm run pay:verify`, `npm run send:verify`, `npm run private-pool-v2:contract-check`, `npm run private-pool-v2:solana-spend-transaction-builder-check`, `npm run private-pool-v2:sbf-abi-status-json`, and `git diff --check`. At that point the aggregate stopped at the strict SBF ABI gate. The 2026-05-12 readiness-hygiene loop found the installed Solana active-release toolchain, rebuilt the local SBF binary, and `npm run private-pool-v2:verify` now passes locally; this is still not redeploy/reinit, live settlement, or verifier-enforced evidence.

Still open after this fourteenth local pass: active proving lanes remain `MERKLE_DEPTH = 3`, recipient-grade Send discovery still needs real viewing-key exchange / view tags / dual recipient-change encryption / production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces, on-chain proof verification/verifying-key enforcement is not wired, root-history and nullifier storage remain fixed-slot local scaffolds, no audit has accepted the boundary, and no live deployment evidence was refreshed.

### Fifteenth Codex feedback loop - Send recipient privacy framing

This local slice tightened the Send page's product-truth contract from "v2 AEAD exists" to "what is visible today":

- `src/solana/sendTrustContract.ts` now tells users that fresh v2 Send memos still put ciphertext, signer, and timing on chain; current operator/status surfaces still see transition and proof metadata; and recipient-grade discovery plus production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces remain open.
- `npm run lanes:trust-contract-check` now guards that exact Send framing so future UI copy cannot regress back into a vague recipient-privacy claim.

Red-first check observed during this slice: `npm run lanes:trust-contract-check` initially failed on the missing Send visibility markers, then passed after the shared trust-contract copy was updated.

Still open after this fifteenth local pass, before the later Solana PDA-nullifier loop: active proving lanes remain `MERKLE_DEPTH = 3`, recipient-grade Send discovery still needs real viewing-key exchange / view tags / dual recipient-change encryption / production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces, on-chain proof verification/verifying-key enforcement is not wired, root-history and nullifier storage remain fixed-slot local scaffolds, no audit has accepted the boundary, and no live deployment evidence was refreshed.

### Sixteenth Codex feedback loop - Solana nullifier PDA ABI

This local slice moved the Solana spend-program DoS finding from "fixed/linear nullifier storage" to "PDA replay marker implemented locally, SBF/live evidence blocked":

- `programs/vanta_private_pool_v2_spend/src/lib.rs` now keeps `nullifier_set` as a read-only bound namespace/header account and derives replay truth from `NULLIFIER_MARKER_SEED = b"vanta2nul"` plus `(pool_state, nullifier)`.
- Spend accounts now require seven metas: writable `pool_state`, read-only `nullifier_set`, writable `output_queue`, read-only `root_history`, writable `nullifier_marker`, writable signer `operator_authority`, and read-only System Program.
- `process_spend` no longer scans or appends fixed nullifier slots. It creates a missing marker PDA by System Program CPI, writes `VNTA2NMK` marker bytes, and rejects duplicate marker reuse with error `1`.
- The transaction builder, printer, relayer-submission check, README, mainnet-shaped smoke template, SBF ABI status guard, contract check, and Crucible harness were updated in that loop for the then-current seven-account nullifier-marker PDA ABI and derived marker address. That historical shape was superseded by the twenty-third output-record PDA loop, which moved the current local ABI to eight spend accounts. `private-pool-v2:verify` now includes the fail-closed SBF ABI check so stale local binaries cannot hide behind green transaction/harness guards.
- Crucible invariant coverage belongs now and was updated: marker account bytes are part of failed-action snapshots, successful spends assert marker magic/pool/nullifier contents, duplicate marker reuse rejects without mutating pool/output/root/marker state, and the legacy fixed nullifier count remains zero.

Verification in this slice: `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `cargo check --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml`, `npm run private-pool-v2:solana-spend-transaction-builder-check`, `npm run private-pool-v2:solana-spend-transaction-check`, `npm run private-pool-v2:solana-relayer-submission-check`, `npm run private-pool-v2:contract-check`, `npm run private-pool-v2:sbf-abi-status`, `npm run private-pool-v2:crucible-check`, `npm run build`, and `git diff --check`. Refreshed 2026-05-12: the local SBF ABI gate now passes after rebuilding with the installed Solana active-release toolchain.

Still open after this sixteenth local pass, before the later output-record PDA loop: active proving lanes remain `MERKLE_DEPTH = 3`, recipient-grade Send discovery still needs real viewing-key exchange / view tags / dual recipient-change encryption / production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces, on-chain proof verification/verifying-key enforcement is not wired, root-history is still a fixed-slot operator-fed scaffold rather than proof-backed program-owned tree state, output records remain fixed-capacity, no audit has accepted the boundary, and no live deployment evidence was refreshed.

### Seventeenth Codex feedback loop - Pay evidence reference shape

This local slice closed the follow-up claim-drift gap where any non-empty string could label Pay checkout completion as `customer-payment-evidence`:

- `src/pay/vantaPayRuntime.ts` now requires evidence-based completion to carry a typed customer payment evidence reference with the current accepted shape `solana:signature:<base58-signature>`.
- `scripts/check-vanta-pay-merchant-api.mjs` now red-checks malformed evidence refs before accepting a valid typed Solana signature reference.
- `docs/pay-merchant-trust-surface.md`, `docs/operator-runbook.md`, and `SECURITY_LIMITATIONS.md` now say "typed customer payment evidence reference" instead of implying any arbitrary string is enough.
- `npm run pay:doc-truth-check` now guards the typed evidence wording in the merchant trust surface.

Red-first checks observed during this slice: `npm run pay:merchant-api-check` initially accepted `not-an-evidence-ref`, and `npm run pay:doc-truth-check` initially failed on the missing typed-evidence doc marker. Both passed after the runtime and docs were updated.

Still open after this seventeenth local pass, before the later depth-20 and output-record loops: customer-side wallet payment evidence is still not wired for production, the current typed reference is only a shape guard rather than chain-finality/session-binding verification, active proving lanes remain `MERKLE_DEPTH = 3`, recipient-grade Send discovery still needs real viewing-key exchange / view tags / dual recipient-change encryption / production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces, on-chain proof verification/verifying-key enforcement is not wired, root-history is still a fixed-slot operator-fed scaffold rather than proof-backed program-owned tree state, output records remain fixed-capacity, no audit has accepted the boundary, and no live deployment evidence was refreshed.

### Eighteenth Codex feedback loop - depth-20 active proving lanes

This local slice closed the active-lane toy-depth gap called out in finding 5 and the recommended order:

- Private Pool v2 Shield, Send, Swap-to-shielded, Claim, and actual-private-spend circuits now declare `MERKLE_DEPTH = 20`.
- Private Core Send, Swap, and Unshield circuits now declare `MERKLE_DEPTH = 20`; their proof-boundary builders pad shorter source-layer proofs into 20-sibling proving-lane witnesses instead of blocking on the source tree's current small demo height.
- Private Pool v2 fixture builders now use `privatePoolV2MerkleFixtureHelpers.ts` to emit coherent sparse depth-20 paths without allocating a full `2^20` leaf tree.
- Actual-private spend public-input binding now uses the compact `(accepted_root, input_commitment, leaf_index)` membership binding, while the 20 private direction bits remain circuit-checked against the supplied path and leaf index.
- Private Core operator contract/status expectations now advertise supported Send/Unshield depth 20.
- `npm run zk:circuit-soundness-lint` now fails closed if any active Noir lane regresses to `MERKLE_DEPTH = 3`; it reports `depth20MigrationStatus: "complete"` after this slice.

Verification in this slice: `npm run zk:circuit-soundness-lint`, `npm run zk:review-guards-check`, `npm run private-pool-v2:public-input-hash-alignment-check`, `npm run private-pool-v2:shield-circuit-check`, `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:swap-to-shielded-circuit-check`, `npm run private-pool-v2:actual-private-spend-circuit-check`, `npm run private-pool-v2:claim-circuit-check`, `npm run private-pool-v2:shield-prove`, `npm run private-pool-v2:send-prove`, `npm run private-pool-v2:swap-to-shielded-prove`, `npm run private-pool-v2:actual-private-spend-prove`, `npm run private-pool-v2:claim-prove`, `npm run private-core:check`, `npm run private-core:send-check`, `npm run private-core:swap-check`, `npm run private-core:swap-boundary-check`, `npm run private-core:prove`, `npm run private-core:send-prove`, `npm run private-core:swap-prove`, `npm run private-core:contract-smoke`, `npm run private-core:http-smoke`, `npm run private-pool-v2:actual-private-transaction-rail-check`, `npm run pay:committed-checkout-acceptance-check`, `npm run docs:source-of-truth-check`, `npm run operator:runbook-check`, `npm run security:limitations-check`, `npm run build`, and `git diff --check`. Refreshed 2026-05-12: `npm run private-pool-v2:sbf-abi-status-json` reports `status: "fresh"` locally after the active-release Solana toolchain rebuild.

Still open after this eighteenth local pass, before the later output-record PDA loop: depth 20 is locally guarded but not yet live/deployed/audited; recipient-grade Send discovery still needs real viewing-key exchange / view tags / dual recipient-change encryption / production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces; on-chain proof verification/verifying-key enforcement is not wired; root-history remains operator-fed fixed-slot scaffold rather than proof-backed program-owned tree state; output records remain fixed-capacity; customer-side wallet payment evidence is not production-wired; no audit has accepted the boundary; and no live deployment evidence was refreshed.

### Nineteenth Codex feedback loop - Send dual-AEAD discovery scaffold

This local slice advances the Send memo/discovery recommendation without upgrading the production privacy claim:

- `src/solana/vantaShieldState.ts` now exposes `createPreparedSendDualAeadMemo`, which creates separate recipient and change memo legs under the existing `vanta:send-note:v2:` AEAD envelope.
- The recipient leg decrypts only with the recipient viewing key, the change leg decrypts only with the sender/change viewing key, and each leg exposes a domain-separated `sha256:` ciphertext body hash for later proof/public-input binding.
- `parseSendRecipientDiscoveryMemo` and `parseSendChangeDiscoveryMemo` parse only the new discovery-leg payload shapes, so discovery memos do not masquerade as the legacy single Send payload.
- `/app/send` remains fail-closed for external recipients on both the live memo path and the private-core preview/execution path until real recipient viewing-key exchange or view-tag/indexer discovery exists.
- Send trust contracts, trust packets, security limitations, and the privacy-rail contract now distinguish the local dual-AEAD scaffold from production-grade recipient discovery. This was upgraded in the twenty-first local pass so the proof request/circuit locally binds the body-hash fields while deployed memo/indexer handoff remains open.

Verification in this slice: `npm run actions:memo-encryption-check` passed after adding wrong-key, no-raw-leak, missing-key, and dual-leg parser guards.

Still open after this nineteenth local pass, before the twenty-first local proof-binding patch: recipient viewing-key exchange or view-tag/indexer discovery was not wired; ciphertext body hashes were not yet bound into the Send proof/public-input transcript; historical v1 plaintext chain-history migration remained open; signer/timing and two-output structure remained public; operator/status surfaces still saw transition/proof metadata; and no live deployment or audit evidence was refreshed.

### Twentieth Codex feedback loop - actual-private Solana transaction byte binding

This local slice closes the next operator/relayer handoff gap from the feedback pass:

- `src/privacy/privatePoolV2SolanaSpendTransaction.mjs` now exposes `validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction`.
- The validator decodes the provided base64 serialized transaction, requires a v0 transaction with exactly one spend instruction and no address lookup tables, reuses the current eight-account spend layout checks, and compares instruction bytes against expected actual-private public inputs: nullifier, recipient/change output commitments, accepted root, and private-spend public-input hash.
- Operator submission now validates `relayerSerializedTransaction` before calling the runtime relayer, derives the expected nullifier-marker PDA from the accepted nullifier/root packet, and forwards expected public inputs/account refs to the relayer. When `VANTA_PRIVATE_POOL_V2_REQUIRE_RELAYER_SERIALIZED_TRANSACTION=true`, the operator also requires the configured Solana spend account refs before live relayer submission.
- The env-created live Solana relayer submitter now requires `expectedAccounts` and `expectedPublicInputs` before signing, simulating, or sending. The service-network `/v1/private-spends/submit` boundary preserves those expected bindings instead of dropping them.
- Serialized spend transactions are capped at Solana's 1232-byte transaction size, and `relayerSerializedTransaction` is Send-only until an explicit Unshield relayer byte path exists.
- Guard coverage now includes mismatched public-input hash/root rejection, mismatched program/account/nullifier-marker rejection, missing binding rejection in live mode, oversized serialized transaction rejection, service-network binding pass-through, Send-only relayer byte plan validation, and the existing printer/protocol/client/caller checks.

Verification in this slice: `npm run private-pool-v2:solana-spend-transaction-builder-check`, `npm run private-pool-v2:solana-spend-transaction-check`, `npm run private-pool-v2:solana-relayer-submission-check`, `npm run private-pool-v2:service-network-check`, `npm run private-pool-v2:protocol-client-check`, `npm run mainnet:actual-private-settlement-plan-check`, `npm run mainnet:actual-private-settlement-relayer-caller-check`, `npm run private-pool-v2:contract-check`, `npm run build`, and `git diff --check` passed locally. Refreshed 2026-05-12: aggregate `npm run private-pool-v2:verify` now passes locally after the active-release Solana toolchain rebuild, while redeploy/reinit and live verifier enforcement remain open.

Still open after this twentieth local pass: this validates transaction bytes before submission, but the Solana program still does not verify a production proof on-chain, the current SBF binary is still stale, live account refs/deployment evidence were not refreshed, and no auditor has accepted the relayer or custody boundary.

### Twenty-first Codex feedback loop - Send ciphertext body-hash proof binding

This local slice closes the proof/public-input half of the nineteenth Send dual-AEAD scaffold without upgrading the production privacy claim:

- `src/privacy/privatePoolV2ProofRequests.ts` now accepts raw `sha256:<64 lowercase hex>` recipient/change memo ciphertext body hashes, compresses each digest's two 128-bit halves into one Poseidon/BN254 field, emits two stable public-input labels after `change-output-root`, and uses a zero field only for an absent no-change memo.
- `src/privacy/privatePoolV2SendCircuitFixture.ts` and `zk/noir/vanta_private_pool_v2_send_entry/src/main.nr` now compute `poseidon4([recipient_hi, recipient_lo, change_hi, change_lo])` and include that memo binding in the outer Send `poseidon12` public-input hash.
- The negative Send circuit fixture now mutates a memo hash field while preserving the public hash from the unmutated proof request, so the failure proves the memo binding rather than recomputing around the mutation.
- Local runtime, restart, operator, protocol-client, trust-packet, security-limitations, mainnet status, programmatic privacy, and privacy-rail checks now understand that the body-hash binding is local proof-request/circuit evidence, not external recipient discovery or production-private Send.
- `send:verify` now includes `private-pool-v2:send-circuit-check` and `private-pool-v2:public-input-hash-alignment-check` alongside the Send proof-request check.

Verification in this slice: `npm run private-pool-v2:send-proof-request-check`, `npm run private-pool-v2:public-input-hash-alignment-check`, `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:send-prove`, `npm run private-pool-v2:local-runtime-check`, `npm run private-pool-v2:restart-check`, and `npm run private-pool-v2:protocol-client-check` passed locally before the broader truth/docs gates.

Still open after this twenty-first local pass: recipient viewing-key exchange or view-tag/indexer discovery is not wired; exact body-hash production handoff to a deployed memo/indexer surface is not live; historical v1 plaintext chain-history migration remains open; signer/timing and two-output structure remain public; operator/status surfaces still see transition/proof metadata; on-chain proof verification/verifying-key enforcement remains unwired; and no live deployment or audit evidence was refreshed.

### Twenty-second Codex feedback loop - Unshield proof-owner binding

- Replaced the Unshield circuit's owner-auth placeholder/liveness shape with a Poseidon proof-owner key relation: `owner_public_key_lo = poseidon2(owner_secret_key_hi, owner_secret_key_lo)` with `owner_public_key_hi = 0`.
- Bound the proof-owner key into the Unshield proving note commitment and nullifier so changing the owner secret breaks the proof lane instead of remaining a no-op witness.
- Preserved the source-layer X25519 owner public key as required separate witness-package metadata for app/operator source consistency checks; this keeps the current payload/source identity model honest without claiming Noir proves X25519.
- Kept `ownerAuthorizationMode = x25519-secret-prechecked-off-circuit` for source/operator status and added `provingOwnerKeyMode = poseidon-proof-owner-key-v0` for the Noir proof-owner relation, avoiding a contract-string fork where one field means two things.
- Added an `invalid-owner-secret` Noir fixture and extended `npm run private-core:check` plus `npm run zk:circuit-soundness-lint` coverage so owner-auth placeholders and nonzero-secret liveness regressions fail closed.
- Repaired stale Private Core roundtrip/restart harness requests that still asked the depth-20 Unshield circuit to prove 3-sibling witnesses, then guarded `circuitMerkleDepth: 3` from reappearing in Private Core harnesses.

Verification passed locally for this slice: `npm run private-core:check`, `npm run private-core:prove`, `npm run private-core:consume-check`, `npm run private-core:operator-no-witness-check`, `npm run private-core:contract-smoke`, `npm run private-core:http-smoke`, `npm run private-core:privacy-boundary-check`, `npm run private-core:unshield-committed-settlement-check`, `npm run private-core:economic-leak-check`, `npm run docs:source-of-truth-check`, `npm run security:limitations-check`, `npm run build`, `npm run zk:review-guards-check`, `npm run private-core:send-roundtrip-check`, full `npm run private-core:verify`, and `git diff --check`.

Still open after this twenty-second local pass: source-layer X25519 ownership is still prechecked outside Noir, strict no-witness owner-authorization artifacts remain blocked, on-chain proof verification and PDA/program-owned release enforcement are not wired, no audit has accepted the boundary, and no live deployment evidence was refreshed.

### Twenty-third Codex feedback loop - Solana output-record PDA ABI

This local slice closes the remaining fixed-capacity output-slot recommendation without upgrading the production privacy claim:

- `programs/vanta_private_pool_v2_spend/src/lib.rs` now treats `output_queue` as a 16-byte output index header and writes each accepted spend's output evidence into a deterministic output-record PDA derived from `["vanta2out", pool_state, publicInputHash]`.
- `process_spend` preflights both the nullifier-marker PDA and output-record PDA before creating either account, so wrong output-record, duplicate output-record, or duplicate nullifier failures leave pool/output-index/marker/record state unchanged.
- The Solana spend transaction ABI is now versioned as `vanta-private-pool-v2-solana-spend-transaction-0.3` and requires eight spend accounts: pool, nullifier-set header, output index, root history, nullifier marker, output record, operator authority, and System Program.
- Operator live-relayer expected account derivation, service-network pass-through, builder/printer/relayer checks, the mainnet-shaped smoke template, SBF ABI status, contract markers, README, and the Crucible source harness now all name the output-record PDA boundary.
- Anonymity-set metrics no longer parse 96-byte records out of `output_queue`; the migrated queue is an index header only, while output commitments must come from reviewed indexer/operator output-record evidence.
- Direct `npm run private-pool-v2:crucible-check` now starts with `npm run private-pool-v2:sbf-abi-check` so a stale pre-output-record `.so` cannot produce false-positive invariant confidence.

Verification in this slice: `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `cargo check --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml --features invariant_test`, `npm run private-pool-v2:solana-spend-transaction-builder-check`, `npm run private-pool-v2:solana-spend-transaction-check`, `npm run private-pool-v2:solana-relayer-submission-check`, `npm run private-pool-v2:service-network-check`, `npm run private-pool-v2:protocol-client-check`, `npm run private-pool-v2:anonymity-set-metrics-check`, `npm run private-pool-v2:anonymity-set-readiness-check`, `npm run private-pool-v2:anonymity-set-evidence-check`, `npm run mainnet:actual-private-settlement-plan-check`, `npm run mainnet:actual-private-settlement-relayer-caller-check`, `npm run private-pool-v2:contract-check`, `npm run private-core:check`, `npm run security:limitations-check`, `npm run operator:runbook-check`, `npm run build`, and `git diff --check` passed locally. Refreshed 2026-05-12: `npm run private-pool-v2:verify` passes locally after the active-release Solana toolchain rebuild, and `private-pool-v2:sbf-abi-status-json` reports the current ABI as `spendAccountCount: 8`, `status: "fresh"`, with no local SBF/toolchain blockers.

Still open after this twenty-third local pass: on-chain proof verification/verifying-key enforcement remains unwired; root history remained an operator-fed fixed-slot scaffold rather than proof-backed program-owned tree state at that point; redeploy/reinit, audit acceptance, live output-record evidence, and live deployment verification were not performed.

### Twenty-fourth Codex feedback loop - status-surface ABI truth

This local slice closed stale status/env/doc drift created by the output-record PDA migration:

- `src/readiness/mainnetPrivateSettlementStatus.mjs` and its readiness checks now report the current local ABI as `output-record-pda-eight-account-spend-v1` and block reviewed mainnet evidence as `pre-output-record-pda-abi`, rather than the older pre-authority wording.
- `mainnetReadiness`, `mainnet:private-settlement-check`, and the deployment truth text now preserve the current blocker: reviewed spend-program evidence predates the output-record PDA eight-account ABI and still cannot support live mainnet private settlement claims.
- Production service contract/topology, the Render services manifest, the actual-private operator packet, the production service setup doc, the operator runbook, and `.env.example` now require `VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_ROOT_HISTORY` wherever the spend program/pool/nullifier/output/authority refs are listed.
- The operator runbook now describes the spend authority as a writable signer and names the bound root-history account; it no longer suggests the authority account is read-only.
- `LANE_STATUS.md`, `SECURITY_LIMITATIONS.md`, and their guards were refreshed to the 2026-05-10 repo-local validation date.

Verification in this slice: `npm run mainnet:private-settlement-check`, `npm run mainnet:readiness-check`, `npm run mainnet:service-contract-check`, `npm run mainnet:service-topology-check`, `npm run mainnet:deployment-manifest-check`, `npm run mainnet:actual-private-settlement-operator-packet-check`, `npm run mainnet:production-service-setup-check`, `npm run docs:source-of-truth-check`, `npm run security:limitations-check`, `npm run operator:runbook-check`, `npm run private-pool-v2:contract-check`, and `npm run private-pool-v2:solana-spend-transaction-check` passed locally before the final ledger/build hygiene rerun.

Still open after this twenty-fourth local pass: this is status-surface and operator-handoff truth hardening only. It does not rebuild the SBF binary, deploy/reinitialize the current ABI, add on-chain proof verification, replace the operator-fed root-history scaffold, refresh live deployment evidence, or change the production-private claim boundary.

### Twenty-fifth Codex feedback loop - Private Pool v2 Send proof-artifact no-witness operator route

This local slice closes the H08 Send proof-artifact feedback-loop gap without upgrading the production privacy claim:

Commit scope: `Add Send proof artifact no-witness route` on `codex/vanta-zk-review-hardening`.

- The Private Pool v2 operator now has a Send proof-artifact verification route that accepts proof artifacts without private witness material.
- The route verifies the submitted artifact against the local Send circuit/proof-artifact boundary and rejects witness-package leakage, witness aliases, source sidecars, malformed proof hex, extra public inputs, relabelled local artifacts, and production proof-mode use on the operator no-witness path.
- Send proof-artifact consistency checks now guard that public inputs, proof metadata, proof system/backend metadata, local ACIR bytecode metadata, and proof-request commitments stay aligned across the local artifact route.
- The H08 mock/local proof boundary remains explicit: this is local proof-artifact evidence only, not a production prover, remote verifier, on-chain verifier, audited proof system, or real-funds settlement boundary.

Verification in this slice: `npm run private-pool-v2:send-proof-artifact-consistency-check`, `npm run private-pool-v2:send-operator-no-witness-check`, `npm run private-pool-v2:proof-backend-boundary-check`, `npm run private-pool-v2:mock-proof-boundary-check`, `npm run private-pool-v2:protocol-client-check`, `npm run private-pool-v2:contract-check`, and `npm run send:verify` passed locally before the final ledger/build hygiene rerun. Refreshed 2026-05-12: `npm run private-pool-v2:verify` now passes locally after the active-release Solana toolchain rebuild, while browser/runtime proving, deployed remote proof services, on-chain verifier enforcement, and live settlement evidence remain open.

Still open after this twenty-fifth local pass: the proof artifact route is local/operator evidence only. Production still needs remote prover/live verifier integration, on-chain proof verification or accepted verifier enforcement, live settlement evidence, relayer separation, anonymity-set evidence, SBF redeploy/reinit/live verification where relevant, and audit acceptance.

### Twenty-sixth Codex feedback loop - Send discovery/indexer handoff packet

This local slice advances the recipient-grade Send discovery recommendation without opening external Send or upgrading the production privacy claim:

- `src/solana/vantaShieldViewingKey.ts` now derives a local encrypted view tag from the X25519 memo shared secret and memo prefix. The recipient can derive the same tag from the memo body and viewing secret without decrypting the payload; the wrong viewing key derives a different tag.
- `src/solana/vantaShieldState.ts` now attaches a `vanta-send-discovery-handoff-0.1` object to each dual-AEAD Send memo leg. The handoff is commitment-only: audience, encrypted view tag, memo ciphertext body hash, memo prefix, proof-binding note, and `productionReady: false`.
- The separated Private Pool v2 indexer role now exposes `POST /v1/send-discovery-packets`, `GET /v1/send-discovery-packets`, and `GET /v1/send-discovery/status`. The packet validator rejects raw recipient, amount, asset, plaintext memo, wallet key, witness/private input, deposit signature, serialized transaction, malformed/mismatched body hashes, duplicate packets, and production-readiness overclaims.
- Send trust/status surfaces now include a machine-readable discovery handoff packet with the remaining blocker id `send-memo-indexer-body-hash-handoff-not-deployed`, plus a separate fresh-v2-only history scope showing legacy v1 plaintext history is parse-compatible but not production-privacy-eligible.
- A read-only review pass caught a future truth-drift path and validator gaps before commit. The final patch now includes deployed discovery handoff and legacy-v1 migration scope in the Send `productionReady` formula, makes the discovery packet schema allowlist-only, rejects raw-field aliases such as `amountBaseUnits`, `recipientAddress`, `ownerPubkey`, `vaultOwner`, `mintAddress`, and `changeAmount`, parses output leaf indices strictly, and restart-tests discovery packet persistence.
- External Send remains fail-closed until recipient viewing-key exchange or deployed view-tag/indexer discovery is wired; historical v1 plaintext Send history still needs migration or a fresh-v2-only production claim boundary.

Verification in this slice: `npm run actions:memo-encryption-check`, `npm run send:trust-packet-check`, `npm run send:discovery-migration-policy-check`, `npm run send:discovery-indexer-handoff-check`, `npm run mainnet:send-production-check`, `npm run send:production-privacy-claim-gate`, `npm run private-pool-v2:service-network-check`, `npm run private-pool-v2:send-proof-request-check`, `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:public-input-hash-alignment-check`, `npm run privacy-rail:contract-check`, `npm run security:limitations-check`, `npm run docs:source-of-truth-check`, `npm run lanes:trust-contract-check`, `npm run programmatic-privacy:contract-check`, `npm run zk:review-findings-ledger-check`, `npm run send:verify`, `npm run build`, and `git diff --check` passed locally before commit.

Still open after this twenty-sixth local pass: the encrypted view-tag/body-hash handoff is local indexer evidence only. Production still needs deployed memo/indexer handoff proving opaque memo bodies and view-tag packets match proof-bound `sha256:` body hashes, recipient viewing-key exchange or deployed discovery UX, live reviewed settlement evidence, relayer separation, anonymity evidence, production replay/idempotency evidence, and audit acceptance. The follow-up local scope now excludes legacy v1 plaintext Send history from production privacy claims unless migrated or segregated with reviewed evidence.

**Codex status, 2026-05-14 Send discovery verifier-mirror follow-up:** locally committed `2abfb94` to bind the separated verifier role to the existing Send discovery indexer handoff. `/v1/proofs/accept` now accepts optional `sendDiscoveryPackets` for stateful Private Pool v2 Send proofs, normalizes them through the same allowlist-only packet validator, and prevalidates recipient/change audience, output commitment, output root, output leaf index, input commitment tree id, proof receipt id, proof public-input commitment, Send public-input hash, and memo ciphertext body hash field against the accepted proof request before verifier receipt storage. Mismatched memo body hash, output commitment, or leaf index rejects before Send output commitments or discovery packets are mirrored. Accepted local receipts can report `sendDiscoveryMirroring` with `productionReady: false`, and Send status/trust-packet surfaces now expose `localVerifierMirroredDiscoveryHandoffCovered` while keeping `deployedMemoIndexerHandoffCovered: false` and the blocker `send-memo-indexer-body-hash-handoff-not-deployed`. Verification passed locally with `npm run private-pool-v2:service-network-check`, `npm run private-pool-v2:send-discovery-indexer-handoff-check`, `npm run send:discovery-migration-policy-check`, `npm run send:trust-packet-check`, `npm run mainnet:send-production-check`, `npm run send:verify`, `npm run truth:privacy-claim-gate`, `npm run private-pool-v2:verify`, `npm run build`, and `git diff --check`. This is local role-service verifier/indexer coupling only; it is not recipient viewing-key exchange, not deployed memo/indexer discovery, not production recipient discovery, not live settlement evidence, not idempotent production recovery evidence, not audit acceptance, and not production-private Send readiness.

---

# UI/UX Pass

I couldn't pull the deployed site down (network egress blocked from this environment), but I read every page component, the design system in `DESIGN.md`, all 9k lines of `src/styles.css`, and the shared components. Below is a page-by-page critique plus a cross-cutting plan for making Vanta the kind of site people enjoy spending time on.

The aesthetic foundation is genuinely good. The work is mostly about turning a careful, informational app into one that feels alive.

## Cross-cutting observations

Six observations that apply across the whole product surface and are worth naming before going page-by-page.

### CC1. The visual language is on-thesis but emotionally flat

The palette in `src/styles.css` is excellent: a near-black background (`#030406`) with two warm-cool accents (`#77f2d4` mint and `#e4c781` ledger gold), supported by `#9bbdff` for verified and `#ffc957` / `#ff8383` for warnings. Type pairs Syne (display) with Manrope (body), Space Grotesk for labels, Space Mono for code. This is the right starting point for a privacy/finance product — confident, dark, modern, restrained.

What's missing is *life*. The site has:
- one CSS-only background gradient (radial glows + 96px grid mask)
- one keyframe animation referenced (a pulse on the brand mark via `feGaussianBlur` filter)
- basically zero scroll-triggered, hover-driven, or stateful motion

For 2026, the bar for a flagship product website is "feels engineered, not just designed." Linear's keyboard cursor, Stripe's CSS-only iridescent gradients, Vercel's deploy-globe, Aztec's grid-warp on hover — these are all small interactions that signal craft. Vanta has the brand to support that level of polish but ships none of it.

### CC2. Every page leads with disclaimers

Open any app page and the first thing in the hero is a row of "beta state" / "no production funds" / "production privacy claims locked" badges. This is honest — and per the docs pass, the framing is correct. But emotionally it tells every visitor *the same warning over and over* before they've done anything. By the third page they tune it out, which defeats the warning's purpose.

The fix is not to remove the truth. It's to consolidate it once at the app shell level (a persistent thin "Beta" pill in the top-right that opens a dialog explaining the full claim contract) and let each page's hero say what the page is actually for. Today, "Shield" the page barely talks about shielding before it talks about what shielding isn't.

### CC3. Reviewer-facing language has leaked into user-facing surfaces

The dashboard's trust hero shows "Latest Trust Packet" / "Reviewer Verification" / "Operator-visible, beta-truthful, reproducible" / `npm run private-core:operator-status` command blocks above the fold. Strategy page shows "Hash-bound packet preview." Shield page has a "Wallet approval review" details accordion under the form. Send page has "Vanta send note: <signature prefix>...<suffix>" surfaces.

Most of this should be in a separate `/app/inspect` view for cryptography-curious users and reviewers. The default user view should never show a `npm run` command unless the user is on the developer surface.

### CC4. Density without rhythm

Every app page is a single long vertical scroll of dense `dl/dt/dd` rows, `<details>` accordions, and 4-7 horizontal info chips. There's no visual rhythm — no images, no diagrams, no color blocks, no breathing rooms. A new user landing on Send sees 8 sections of grey-on-grey text. The eye doesn't know where to go first.

The same content reorganized into a 2-column scroller (primary action on the left, contextual receipt on the right) with a visible flow indicator across the top would feel half as long without losing any information. The structure is there in code (`send-flow-indicator`, `module-page__hero`); it's just not given enough visual weight relative to the body content.

### CC5. The home page sells the idea; the app sells the limitation

There's a tone fork. `HomePage.tsx` says "Make supported Solana activity less public" — confident product framing. App pages say "Production privacy claims remain locked" — defensive engineering framing. The disconnect between landing and product is the moment a curious user realizes the gap, and it lands as a letdown rather than as honest disclosure.

The fix is to align the *tone gradient*. Landing should set up "this is what we're building"; the app should keep the same energy while being explicit about what's live today. Right now landing is upbeat and the app is hedged; visitors feel a vibe-shift on the first click into `/app`.

### CC6. The Solana-native context is invisible

This is a Solana product. There is no live block height, no shielded-pool TVL counter, no "X people are using Vanta right now" signal, no recent action ticker, no chain status header. A user lands on Vanta and has no proof of life beyond static copy. Even just a tiny "Solana mainnet · slot 312,584,221 · 401ms" widget in the top-right would change the entire feel from "marketing site" to "running system."

(Today's TVL is presumably zero or near zero, so a TVL counter has to wait. But block height and slot timing are public and free.)

---

## Page-by-page

### `/` — Home

**File:** `src/pages/HomePage.tsx`

The home page is the most polished surface in the project. Minimal nav, kicker → headline → subhead → two CTAs, then "What it does" (4 product points) and "Inside the app" (6 deep links). The `landing-minimal__grid` aria-hidden grid + two corner glows give it a clean tech-product feel.

The good: the structure is right. The headline is honest. The dual-CTA pattern (Enter App / Learn More) is correct. The fact that the same nav links go through to docs and X works.

What's weak:

- **The hero is static.** `<h1>Make supported Solana activity <span>less public.</span></h1>` is a single line of text with no kinetic interest. For comparison: Stripe's hero has a 5-color iridescent gradient that responds to scroll; Linear's has a parallax cursor; Aztec's has an animated mesh. Vanta has a kicker, a headline, two buttons, and one paragraph. **Add a hero visualization.** A subtle live demo of "wallet → shield → private state" as 3 nodes connected by a flowing particle line would be on-brand and move what is currently inert text. The brand mark already has a gradient glow that could pulse on a slow loop.
- **"What it does" is 4 text cards with no iconography.** The four cards are titled "Shield assets / Use private rails / Accept payments / Exit on your terms." They're just `<strong>` + `<p>`. Add small SVG glyphs (a shield, two arrows in a circle, a receipt, a door) — same color as the accent so they don't fight the type. Even minimal pictograms 3× the scannability.
- **"Inside the app" is just a link list.** It says "The constrained actions Vanta can show honestly." This is the moment a visitor decides whether to enter the app. Six text links is the minimum-effort answer. Replace with 6 hover-responsive cards, each with: action name, single-sentence outcome ("Lock USDC into Vanta's private area"), small status pill ("Live" / "Preview"), and an arrow that shifts on hover. Same data, vastly higher click-through intent.
- **No social proof.** No "powered by Solana" badge, no "deployed on mainnet" indicator, no version line, no GitHub link, no "what we shipped this week." For a tech-credibility-driven product, even a small footer reading "v0.1.0 — last deploy 2 days ago — Solana mainnet" buys huge trust.

**One concrete edit:** add a `landing-minimal__live-strip` between the hero and "What it does" — a single horizontal row showing real Solana mainnet block height (via `getBlockHeight` polled every 2s), the current slot's confirmation latency, and a small mint-colored dot that pulses each time the slot increments. Cost: 30 lines of code, one effect, one fetch loop. Effect: the page goes from "marketing site" to "this is plugged into something." This single change moves more conversion than any copy edit.

**Codex status, 2026-05-14 Landing action hierarchy slice:** commit `496b782` locally aligns the public landing-page action hierarchy with the already-guarded app navigation split. `src/pages/HomePage.tsx` now keeps Shield, Send, Swap, and Unshield as the primary wallet lanes, while Pay and Strategy move into a separate `Preview surfaces` group. The new Pay copy says payment requests create local receipt-backed records for merchant review; the Strategy copy says private-rail execution planning is a preview before live routing is enabled. `scripts/check-vanta-landing-browser.mjs` now fails if Pay or Strategy return to the primary wallet action list or if the preview cards lose their truthful preview copy, and the focused landing/browser checks passed with `npm run landing:browser-check`, `npm run product-ui:browser-check`, `npm run build`, and `git diff --check`. This is landing hierarchy and product-truth hardening only; it is not the live-strip recommendation, not a hero visualization, not removal of Pay or Strategy routes, not production-private wallet-lane readiness, not Pay/Strategy live production routing, not pushed, and not live-deployed.

**Codex status, 2026-05-14 Landing Solana liveness strip slice:** commit `77d79ee` locally closes the safe current subset of the `landing-minimal__live-strip` recommendation. `src/components/LandingLiveStrip.tsx` now renders a compact Solana mainnet proof-of-life strip between the hero and the public anonymity-depth disclosure, polling `getBlockHeight` every 2s through the shared browser-safe RPC resolver, showing block height, request latency, RPC status, and a mint liveness dot that pulses when the height advances. The strip says `Beta truth: Network liveness only; not private-settlement readiness`, and `src/solana/browserRpcEndpoint.ts` keeps the browser-blocked `api.mainnet-beta.solana.com` endpoint out of this landing flow while preserving the existing Helius-safe browser RPC precedence. `scripts/check-vanta-landing-browser.mjs` now guards the component, source hooks, non-flaky fallback behavior, reduced-motion CSS, and beta-truth copy, while `scripts/check-vanta-helius-rpc-config.mjs` follows the extracted resolver. Verification passed locally with red-first `npm run landing:browser-check`, then `npm run landing:browser-check`, `npm run landing:anonymity-disclosure-check`, `npm run solana:helius-rpc-config-check`, `npm run mainnet:external-gates-production-claim-check`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run build`, and `git diff --check`. This is public chain-liveness UI only; it is not TVL, not user-count or adoption evidence, not a live depth oracle, not live anonymity, not production-private settlement, not pushed, and not deployed/live.

**Codex status, 2026-05-14 Landing iconography and Inside the app cards slice:** commit `9e45f66` locally closes the safe current subset of the Home iconography and app-entry affordance recommendations. The `What it does` cards now include four small inline SVG glyphs (`shield`, `private-rails`, `receipt`, `exit`) that make the Shield assets / Use current lanes / Accept payments / Exit on your terms scan faster without adding new claims. The `Inside the app` links now render as hover-responsive cards with a beta-safe status pill, action outcome copy, and arrow affordance; Shield, Send, Swap, and Unshield remain the only primary `Wallet lane` cards, while Pay and Strategy remain clearly labeled preview cards. `scripts/check-vanta-landing-browser.mjs` now fails if the glyph set, route hierarchy, card outcomes, status pills, arrows, overflow, or hit-target guarantees drift. Verification passed locally with red-first `npm run landing:browser-check`, then `npm run landing:browser-check`, `npm run product-ui:browser-check`, `npm run truth:privacy-claim-gate`, `npm run build`, and `git diff --check`. This is public landing presentation and guard hardening only; it is not a hero visualization, not social proof, not TVL or user-count evidence, not route/proof/settlement behavior, not production-private wallet-lane readiness, not Pay or Strategy live production routing, not pushed, and not deployed/live.

**Codex status, 2026-05-14 Landing hero flow visualization slice:** commit `6ef36c9` locally closes the safe current subset of the hero visualization recommendation. `src/pages/HomePage.tsx` now keeps a page-local `LandingHeroFlowVisual` in the hero, showing a wallet -> Shield -> shielded state flow with a visible packet line and reduced-motion CSS fallback. The copy says `Local preview`, `Wallet to shielded state`, and `Illustrates the intended flow; not production-private proof`, while the existing public depth disclosure and liveness strip continue to carry the actual current-truth boundaries. `scripts/check-vanta-landing-browser.mjs` now guards the hero-flow source hooks, DOM placement before the liveness strip, required Wallet/Shield/Shielded state nodes, line/packet hooks, reduced-motion CSS, and banned privacy/readiness claim scan across the Home source. Verification passed locally with red-first `npm run landing:browser-check`, then `npm run landing:browser-check`, `npm run product-ui:browser-check`, `npm run truth:privacy-claim-gate`, `npm run mainnet:external-gates-production-claim-check`, `npm run build`, and `git diff --check`. This is public landing presentation and guard hardening only; it is not production-private settlement, not a live depth oracle, not live anonymity, not social proof, not TVL or user-count evidence, not route/proof/settlement behavior, not wallet-lane production readiness, not pushed, and not deployed/live.

### `/app/dashboard` — App dashboard

**File:** `src/pages/AppDashboardPage.tsx`

This is the most reviewer-coded page in the product. Above the fold:

- "Trust Status" hero with what-we-can-prove-right-now copy
- "Latest Trust Packet" panel with `Packet / Gate / Lineage / Boundary` rows
- "Current local state" stat row (Shielded USDC / Verified SOL shield state / Actionable notes)
- "Reviewer Verification" panel with `npm run` commands inline as `<code>`
- "Next Step" card
- "Reviewer Package" card
- A 4-card actions grid

A new user opening this page is hit with five different framings of "current state" before they see "what to do next." The Reviewer Verification panel literally lists shell commands.

**Recommendations:**

- **Two distinct dashboards.** Default `/app/dashboard` is a user dashboard: balance, last action, next-step CTA, the 4 action cards. A separate `/app/inspect` is the reviewer dashboard: trust packet, gates, lineage, npm commands, JSON dumps. Today's page is both at once, and that hurts both audiences.
- **Lead with balance, not status.** A wallet user lands and wants to see a number. "Shielded USDC: 0.00" or whatever is the right hero. The status copy can be a single line beneath the number, with a small "Why?" link that opens the full trust-packet drawer.
- **Drop the inline `npm run` commands from this view.** They belong on `/app/inspect` or in the docs. Having shell commands in the user-facing app is a category error.
- **The 4 action cards (Shield / Send / Unshield / Swap) need work.** They're currently uniform `dashboard-action-card--minimal` rectangles with a badge in the corner. Differentiate them: each card gets a unique illustration or pictogram, badge color reflects readiness (`Ready` is mint, `Needs notes` is muted, `Start` is gold), and hover triggers a small motion (icon rotates, border lights up). Make picking a lane feel like a choice, not a directory listing.
- **The "Next Step" card is good — keep it, but expand it.** When a user finishes a shield, the next step should be visually presented as a small celebratory state: confetti for ~600ms in the accent color, the next step CTA fades in, the action card for the lane they came from gets a green "Done" tick. Right now success is silent; users don't know if they completed anything.

### `/app/shield` — Shield

**File:** `src/pages/ShieldPage.tsx` (2157 lines)

The form is well-engineered: amount entry with Max button, asset selector (with public-route capability detection), shielded-balance preview, route helper, recovery panel, viewing-key panel, decoy-batcher option (presumably exposed somewhere), wallet approval review, route progress indicator. All correct.

The problem is purely UX. Above the form's submit button there are routinely **8–12 helper lines** depending on state: route label, route progress, validation messages, recovery hints, viewing-key state, transitional warnings, and so on. The shield-helper class is used 30+ times in this file. Earlier copy had "Choose what to shield", "Vanta will shield X directly so it remains X in shielded state", and "asset can enter shielded state as itself" — copy that was correct but felt machine-generated. The direct-route helper examples are now tightened locally; the remaining layout recommendations still stand.

**Recommendations:**

- **Collapse all helper text into a single "What happens" expandable block** below the submit button. Default-collapsed for first-time users, persistent if they expanded it before. The form itself should be: amount, from, to, a route summary line, submit. Everything else on demand.
- **Replace the asset dropdown with an asset picker grid.** A row of 6-12 pill-buttons showing token logos + symbol (USDC, USDT, SOL, BONK, etc.). Selected state lights up the accent border. Configured-but-not-loaded states show a subtle "loading" shimmer. Solana token logos are a public CDN; this is half a day of work and triples the visual interest of the page.
- **Make the route preview kinetic.** When a user picks `BONK → Shielded USDC`, the route helper should show a small animation: the source token icon, an arrow that travels left-to-right with a particle, the target shielded-USDC icon. Same idea Jupiter has on their swap aggregator. This is what "private rails" should *look* like, not just say.
- **Add a balance-after-shield preview.** "Shielded USDC: 100.00 → 250.00" with the new value pulsing in mint color. Banks have done this for 40 years; web3 forgot.
- **The wallet approval review accordion is buried.** The exact thing that should be most legible — what the user is about to sign — is in a `<details>` element under the submit button. Promote it to a side panel that's always visible during the awaiting-confirmation state, and make it look like a wallet's actual signing prompt. This is a **safety win**, not just a polish win — users who can pre-read the transaction are less likely to blind-sign hostile ones.

### `/app/send` — Send

**File:** `src/pages/SendPage.tsx` (2692 lines)

Same form pattern as Shield, scoped to USDC-only. The page leads with `[Shield] [Send] [Hold change]` flow indicator and a context banner that now uses the shorter Empty Vault / no spendable notes framing. Form follows: amount, recipient, send notes, plus the same family of helper text and approval review.

The flow indicator is excellent — exactly the kind of visual chunking the rest of the app needs. It's also currently the only good visual rhythm element on the page.

**Recommendations:**

- **The flow indicator is in the right place but only used here, on Swap, and on Pay.** Make it a shared `<LaneFlowIndicator>` component used by Shield, Send, Swap, and Unshield, with the current step animated (a subtle horizontal sweep light that moves left to right on the active step every 4 seconds).
- **Recipient input needs help.** Today it's a plain text input that takes a Solana base58 address. Real privacy products show: address validation as you type, optional ENS / .sol name resolution (Bonfida), recent-recipients dropdown, paste-detection that flips to checksum-validated state, QR-code scan button on mobile. Stripe handles "recipient" inputs better than Vanta does today, and Vanta is moving more sensitive data.
- **The "you send / they receive / your change" three-output pattern is the unique-selling-point of shielded send.** Today it's three labeled rows in a list. Make it a small visual: one input note splitting into two output notes via a Y-shape, with the amounts animated as you adjust. This is the only place in the entire product where the user sees the UTXO-style note model directly. Lean into it.
- **Recipient privacy framing is currently a footnote.** The note "Send and execute through private-state flows instead of exposing every product step to users" is on the home page, not on Send. Send itself doesn't tell the user what's actually private about the current beta Send lane. After the v2 AEAD memo work, safer copy should say: "Visible on chain for fresh v2 memos: ciphertext, signer, and timing. Visible to current operator/status surfaces: transition/proof metadata. Production recipient privacy still needs view-tag/indexer discovery and production wiring from locally proof-bound ciphertext body-hash fields to recipient discovery and deployed memo/indexer surfaces."

### `/app/swap` — Swap

**File:** `src/pages/SwapPage.tsx` (1667 lines)

Same form-card pattern, scoped to USDC ↔ SOL via Meteora DLMM. Visible state: input note picker, output amount preview, venue badge ("Meteora · DLMM · Mainnet"), quote expiry countdown, slippage indicator, route protection toggles.

The Swap page has the best concrete data in the product (real Jupiter/Meteora quotes), but the smallest visual budget for it.

**Recommendations:**

- **Show the quote as a number, not as a row in a list.** Pickup pattern from Jupiter: huge type for the input amount, equals sign, slightly less huge type for the output amount, route shown beneath as small icons (USDC → Meteora → SOL). Vanta has this content; it just doesn't visually privilege it.
- **The quote-expiry countdown is the page's only kinetic element.** Make it good: a thin progress bar across the top of the swap card that drains from accent-mint to warning-amber as the quote approaches expiry. Re-fetching the quote restarts the bar. This is the kind of small craft touch that makes a swap feel like a swap.
- **Add a price chart.** Even a lightweight 24h sparkline of the pair's price (USDC/SOL) gives the page an information-density boost without complexity. Chartjs or recharts is already in the project's react ecosystem; the Helius RPC fees fetch infrastructure already exists.
- **The "currently SOL only" message needs reframing.** Today the asset picker has 14+ assets and 12 of them are blocked. That's misleading and frustrating. Either show only the assets that work today (USDC ↔ SOL is the live pair), or label each visibly and make the disabled ones genuinely look disabled (greyed out, "coming soon" tag, no hover state). Users will pick one of the disabled ones first, and then feel the friction.

### `/app/unshield` — Unshield

**File:** `src/pages/UnshieldPage.tsx` (3268 lines — largest file in `pages/`)

The exit lane. Same form pattern, lots of edge cases (full vs partial unshield, transition vs wallet-direct authorization, USDC vs SOL exit, signed vs unsigned intents).

Two specific UX issues stood out from the code:

- **The old "transition-authorized" vs "wallet-authorized" distinction should stay gone.** Per the unshield deep dive, two ways to authorize the same release was both a security issue and confusing UX. The current local code has removed the literal transition-authorized path; keep the UI on the real-wallet-signature boundary and avoid reintroducing a mode choice.
- **Destination is forced to self.** This is unambiguous in the code: `intent.destinationOwner === intent.requester`. The UI today doesn't tell users this clearly enough. The destination field defaults to "your wallet" but visually looks like an editable text input. Make the destination explicit: a labeled card showing the user's connected wallet address with a "to your own wallet" pill, and a disabled "Send to a different wallet" toggle that says "Coming soon — needs unshield-to-fresh-wallet support" (which lines up with the unshield-lane recommendation U2).

  > **Completed locally (2026-05-12):** `/app/unshield` now renders the destination as a connected-wallet self-destination card with a "to your own wallet" pill, plus an ARIA-described disabled "Send to a different wallet" toggle with "Coming soon - needs unshield-to-fresh-wallet support" copy and a mobile-safe disabled toggle target. The payload semantics stayed self-bound; this is a UI truth and guard-hardening slice, not fresh-wallet support. Red-first `npm run unshield:public-exit-surface-check` failed on the missing card before the UI patch, then passed. Follow-up verification passed with `npm run unshield:public-exit-surface-check`, `npm run unshield:balance-ledger-check`, `npm run unshield:safe-send-adoption-check`, `npm run wallet:message-intent-safety-check`, `npm run wallet:message-intent-adoption-check`, `npm run build`, `npm run protocol:browser-check`, `npm run wallet:browser-signing-safety-check`, `npm run product-ui:browser-check`, `npm run mobile:browser-check`, and `npm run private-core:verify`.

**General recommendations:**

- **Lead with the visible exit consequence.** "You'll receive: 100.00 USDC in `7yU...rtdi`." Big and prominent. Everything else (proof receipt, audit disclosure, gate state) goes below the fold.
- **The "exit recipe" graphic.** Same idea as the Send Y-split: a single shielded note flowing back into a public wallet, with the user's own wallet address as the destination. Small animated pictogram showing the privacy boundary being crossed. Currently the page has no visual that shows what unshield actually means.

  > **Completed locally (2026-05-12):** `/app/unshield` now leads the exit ticket with a visible "You'll receive" consequence summary that only shows a concrete USDC amount when the requested amount is valid and not on the disallowed split path. It also renders a compact shielded-note-to-own-wallet recipe visual above the form, with source and browser guards keeping the preview before the controls and banning fresh-wallet/private-exit/anonymity overclaims from that preview. Verification passed with red-first then green `npm run unshield:public-exit-surface-check`, `npm run truth:privacy-claim-gate`, focused Unshield/wallet intent checks, `npm run build`, `npm run protocol:browser-check`, `npm run wallet:browser-signing-safety-check`, `npm run product-ui:browser-check`, `npm run mobile:browser-check`, and final `npm run private-core:verify`.

- **Confirmation states.** When the unshield completes, the page goes to a green "Complete" state with the SPL transfer signature linked to Solscan. Add a small celebratory transition (mint-colored radial pulse from the transfer signature outward) and offer next-step actions: "Shield more" / "Share receipt" / "View on Solscan." Today the success state is muted text.

  > **Completed locally (2026-05-12):** `/app/unshield` now turns the completion surface into a public-exit success panel with a mint radial pulse from the operator release signature card, a Solscan link when an operator release signature exists, and next-step actions for "Shield more" and "Share receipt." The copied receipt stays redacted and explicit that this is a public on-chain exit that still needs public transaction verification before treating funds as moved. Source and browser guards now require the completion action surface, Solscan URL builder, receipt fields, public-exit wording, and idle-state hidden checks for the success-only actions. Verification passed with red-first then green `npm run unshield:public-exit-surface-check`, `npm run truth:privacy-claim-gate`, focused Unshield/wallet checks, `npm run build`, `npm run protocol:browser-check`, `npm run wallet:browser-signing-safety-check`, `npm run product-ui:browser-check`, `npm run mobile:browser-check`, and `npm run private-core:verify`.

### `/app/strategy` — Strategy

**File:** `src/pages/StrategyPage.tsx` (570 lines)

Per the strategy-lane deep dive, this is preview-only. The form is good — the most product-like in the suite, with mode (Stealth DCA / Private TWAP), side (Buy / Sell), asset, total size, time window, slice/timing policies, urgency, landing mode, max slippage, funding source, destination. Lots of dropdowns.

**Recommendations:**

- **The form is the product, but it's not visually presented as one.** Imagine a strategy form that, as you adjust inputs, shows the resulting child-order schedule as a horizontal timeline with N tick marks across a bar — sized by notional, colored by readiness, with hover for per-child detail. As the user changes "Time window: 6h → 24h" the marks redistribute live. As they change "Slice policy: Fixed count → Randomized sizing" the mark heights vary. This single visualization makes Stealth DCA *feel* stealthy in a way no copy can.
  > **Completed locally:** `/app/strategy` now renders a `strategyPlan.childOrders`-driven child-order timeline with notional-sized marks and hover/focus detail for each preview child order.
- **Strategy mode toggle needs life.** Stealth DCA vs Private TWAP is a meaningful product choice. Today it's a `<select>` dropdown. Make it a 2-card toggle with explanatory copy on hover: Stealth DCA showing many small irregular ticks; Private TWAP showing many evenly-spaced small ticks. Visual difference makes the choice memorable.
  > **Completed locally:** the mode toggle now renders two visual mode cards with irregular DCA ticks, even TWAP ticks, and hover copy tied to the selected preview behavior.
- **Funding source is confusing.** The user picks "Connected wallet / Public wallet balance / Vanta private balance." Two of those mean essentially the same thing. Consolidate to "Public wallet" vs "Vanta private balance" with help text explaining the shield-first requirement.
  > **Completed locally:** Strategy funding choices are now only `Vanta private balance` and `Public wallet`; `createStrategyPlan` rejects stale direct `Connected wallet` / `Public wallet balance` funding-source inputs, and the public-wallet help text now names the shield-first requirement.
- **The unimplemented policies (Min/max child size, Venue threshold, Volatility-aware, Liquidity-aware) — per the strategy-lane deep dive — should not be selectable until Y4 lands.** Today they're typeable inert options. Show them as disabled "Coming soon" entries.
  > **Completed locally:** those four policies now render as disabled `Coming soon` options, and `createStrategyPlan` fails closed if a direct caller tries to pass them before Y4.
- **Add a strategy preview ledger.** As the user designs the strategy, a side panel shows: "This strategy will produce ~24 child trades over 24 hours, averaging $10,416 each, executed every 60 minutes ± 17 minutes of jitter, settling to your Vanta private balance." That's the "hash-bound packet preview" reframed as something a human actually wants to read.
  > **Completed locally:** the Strategy preview ledger now summarizes child count, average child size, cadence estimate, settlement target, and a human-readable one-line preview from the local plan.

### `/app/pay` — Pay

**File:** `src/pages/PayPage.tsx` (835 lines)

The 4-step flow indicator (`Create → Approve → Settle → Share receipt`) is the right structure. The split layout (request builder on the left, review card on the right, status panel below) maps well to a Stripe Checkout-shaped product.

What could be elevated:

- **The "Vanta Pay" hero is currently three side-by-side text blocks (eyebrow / title / body / badges + module-state demo card).** Compress to a single hero column with a hero illustration of a payment link / checkout flow on the right. The PayPage is the only place where Vanta has a concrete consumer-facing product moment; let it look like one.
- **The receipt packet panel is the unique product feature.** Today it's a `dl` of facts. Make it look like an actual receipt — a printable, shareable card with the merchant brand at the top, the amount in big type, the proof receipt as a verifiable QR code, "verify at vantaprivacy.xyz/receipt/<id>" link, and a "Copy share link" button that pulses on click. Trust packets are the project's distribution thesis (per `MISSION.md`); the receipt UI is where that thesis becomes tangible.
- **Add a hosted-checkout preview.** Show the merchant what their customer will see — a Stripe-style modal mockup with the merchant logo, line items, "Pay with Vanta" button. Update it live as the merchant edits the form. This is the #1 thing merchants want to see before integrating a checkout, and Stripe and Square both do it.
- **Test-mode badging is correct but everywhere.** "Test mode" / "No production funds moved" / "Production privacy claims remain locked" is three badges of the same idea. Pick one (Test Mode), make the other two a tooltip that opens a longer explanation. Reduces visual noise.

### `/app/launch` — Private Launch

**File:** `src/pages/LaunchPage.tsx` (21 lines, all delegated to `<ModulePage>`)

Pure roadmap placeholder. Currently the only acceptable surface in the app for "this is intentionally not built yet."

**Recommendation:**

- Lean into the placeholder. Right now it shows a generic ModulePage with summary text. Make this page something delightful — a horizontal roadmap visualization (timeline with milestones), a "subscribe for updates" form, a poll asking which feature to prioritize, a sketch of the future UI. A page that says "we'll build this someday" should at least be a fun page to land on.

### `/app/privacy-review` — Privacy Review

**File:** `src/pages/PrivacyReviewPage.tsx` (51 lines)

Reviewer-facing page showing Umbra benchmark approval samples. Honest, sparse, correct in scope.

**Recommendations:**

- This page is good as it is. It's clearly labeled "Review only" and serves a narrow audience.
- One small win: the `<dl>` of approval rows could become a code-style monospace box that visually communicates "this is the cryptographic prompt the user would see." Stylistically borrow from Aztec's `aztec.network` approval-prompt visualizations.

### `/app/actual-private-settlement` — Actual Private Settlement

**File:** `src/pages/ActualPrivateSettlementPage.tsx` (116 lines)

The "this is the real cryptographic settlement boundary" page. Per its name, it's a reviewer-leaning page showing what the real private-spend lane is doing.

**Recommendations:**

- Either fold this into `/app/inspect` per the dashboard recommendation, or keep it as a proudly-technical page that uses the visual treatment to signal "this is for engineers." Monospace fonts, terminal-style colors, the proof receipt rendered as a code block. Make it look and feel like a Wireshark for private settlement.

### `/docs/*` — Docs

**Files:** `DocsHomePage`, `DocsPortalPage`, `DocsPayPage`, `DocsTrustPage`, `DocsSecurityPage`, `DocsRoadmapPage`

The docs in-app surfaces are the cleanest pages in the product. They follow a `DocsPageTemplate` shell with eyebrow / title / next-step / step-grid structure. Copy is careful and consistent.

**Recommendations:**

- **Add a visible left-sidebar navigation** (most modern docs sites do — Stripe, Vercel, Solana docs itself). Today docs navigation is via top-nav links only; on the docs subpages there's no "where am I" affordance.
- **Inline diagrams.** The `DocsHomePage` `landing-minimal__plain-strip` (the 4-step "Start public / Shield into Vanta / Create a receipt / Let the counterparty verify") would benefit enormously from a single SVG diagram showing those 4 boxes connected by arrows. The Mermaid library is probably already available; even basic boxes-and-arrows would lift these pages.
- **Add searchability.** A `Cmd-K` search bar over the docs is table stakes. Algolia DocSearch is free for open-source projects.
- **Per-page "On this page" right-rail.** Standard docs pattern. With pages of this length it's overkill, but if pages grow to operator-runbook-length (1400 lines), they'll need it.

---

## A new visual & interaction system

Beyond the per-page recommendations, here's what would make Vanta the *best-looking* site in the privacy/payments space rather than just *a good-looking* one. Six concrete additions, in order of cost/impact ratio.

### V1. A cohesive motion vocabulary

Pick three motion primitives and use them everywhere:

- **Slow pulse** (1.6s ease-in-out, mint accent at 8% opacity → 24% → 8%) for active/healthy states. Brand mark, "live" indicators, active flow steps.
- **Particle line** (60-frame loop, 4-6 dots flowing along a path) for routes — Shield route, Send hop, Swap venue path, Strategy schedule.
- **Reveal-on-scroll** with a 12px Y-translate fade-in (200ms ease-out, IntersectionObserver-driven) for cards entering the viewport. Subtle but it makes long pages feel composed.

A `useReducedMotion()` hook respects the system preference.

### V2. A canonical 3D / WebGL hero element

The home page would benefit from one signature 3D asset. Two options:

- **Option A — Volumetric brand mark.** Take the current 2D `BrandMark` SVG and re-implement in Three.js as a glassy mint-tinted prism that slowly rotates with mouse parallax. ~150 lines of code, immediate "this site has motion" upgrade.
- **Option B — Ambient particle field.** A WebGL particle system in the hero that's dense in the center (representing public state) and sparse on the right (representing shielded state), with a visible "boundary" drawn between. Suggests the privacy thesis with no copy. Higher upfront cost (~400 lines) but harder to copy.

Either runs in `<canvas>` behind the existing hero copy, with `<canvas style="opacity:0.6">` so it never fights the foreground.

### V3. The shielded-state visualization that should exist throughout the app

The single biggest UX miss is that "shielded state" is a label, not an image. A canonical shielded-state visualization — a small grid of glyphs representing notes, with shielded notes glowing softly and unshielded notes flat — would be reused across:

- App dashboard ("Your shielded state" hero panel)
- Shield page (preview of the new note appearing in the user's grid)
- Send page (the input note's glow fading, two new output notes appearing)
- Unshield page (the consumed note dimming and its value flowing out as an SPL transfer)
- Pay page (merchant escrow as a shared shielded grid)

This is one component (`<ShieldedStateGrid />`) used five places. Build it once, instrument it with the user's actual notes (per the live-shield bridge), and every page benefits. **This is the single most leveraged piece of design work the project could do.**

### V4. Sound design (carefully)

Privacy products usually skip sound, but a single, optional, opt-in subtle audio cue on action confirmation (a single mint-toned chime, ~200ms, like Stripe's payment-success or Linear's done-toast) would make completing a Shield feel like an event. Default off; toggle in settings; tooltip explaining "celebratory chime only on successful actions, never on errors or load."

### V5. A persistent "system status" header strip

A 28-pixel-tall strip across the top of the app shell (above the page hero, beneath the nav) showing:

- Solana network status (operational / degraded / down) — pulled from a public RPC health endpoint
- Slot height, ticking up live
- Vanta operator status (color-coded green / amber / red, click for breakdown)
- Beta-mode pill linking to claim controls

This makes the entire app feel like a live system. ~80 lines of code; uses existing infrastructure.

### V6. Easter eggs that respect the theme

Privacy/finance is a serious topic, but not humorless. Two examples:

- **`vantaprivacy.xyz/.well-known/audit`** returns a JSON document with the current circuit hashes, vk hashes, deployed program IDs, and a signature from the project key. Cryptography people will share it.
- **Konami-code unlock**: typing `↑↑↓↓←→←→ba` on any app page reveals the developer-inspect view (`/app/inspect`) without needing to navigate to it. Unannounced; discoverable via the source.

These are small but they're the kind of detail people screenshot and post.

---

## Order of operations and rough effort

Listed by cost/impact ratio. The first three are weekend-scope and produce huge visual upgrades.

| # | Recommendation | Effort | Impact |
|---|---|---|---|
| 1 | Live system status strip (V5) + block-height ticker on home | 1 day | Very high — flips "marketing" to "running system" instantly |
| 2 | Single `<ShieldedStateGrid />` component used across 5 pages (V3) | 3–4 days | Highest — turns "shielded state" from word to image |
| 3 | Asset picker grid (replace dropdowns on Shield/Swap with token-logo pills) | 2 days | High — half the app's perceived complexity drops |
| 4 | Cohesive motion vocabulary (V1) — 3 primitives wired to existing components | 3 days | Medium-high — every page feels alive without redesign |
| 5 | Two-dashboard split — `/app/dashboard` user, `/app/inspect` reviewer | 2 days | High — fixes the largest tonal issue cross-cutting the app |
| 6 | Hero 3D / WebGL element on home (V2) | 1 week | High — makes the home page memorable |
| 7 | Lane flow indicator promoted to shared component, animated active step | 1 day | Medium — small win replicated 4 places |
| 8 | Receipt packet UI redesign (Pay) — printable receipt + share link + QR | 4 days | High for Pay specifically |
| 9 | Strategy timeline visualization (preview the schedule as you edit) | 1 week | High for Strategy lane |
| 10 | Sound design (optional, opt-in chime on success) | 1 day | Low cost, high delight if discovered |

Total to hit "best-looking site in the space": ~4–5 weeks of one designer/developer. The bulk of the cost is items 2 (`<ShieldedStateGrid />`), 6 (hero 3D), and 9 (strategy timeline) — the three set-pieces that make the site memorable.

## Concrete first commit for Codex (UI/UX)

Two parallel one-day fixes that make a visible dent:

> **(a) Add a `<SystemStatusStrip />` component above every `/app/*` page that polls Solana mainnet block height every 2s, shows network status, and includes a single Beta pill that opens a dialog with the four-lane claim-controls table. Replace the current "beta state" badge sprawl on every individual page with this single shared strip. (b) Replace the asset-selection `<select>` dropdowns on `ShieldPage` and `SwapPage` with a row of token-logo pill buttons (USDC, USDT, SOL, BONK, etc.) — selected state lights up the accent border, disabled assets show "Coming soon" tag, no dropdown.**

(a) collapses 5 pages worth of disclaimer chips into one canonical strip while making the entire app feel live. (b) makes the most-used input on the most-used page visually engaging. Neither change touches the cryptographic primitives or the on-chain program; both can ship today. Together they're maybe 250 lines of new TSX and 80 lines of CSS, and they'd transform the first-impression quality of the site.

Pair this with deleting the inline `npm run` command blocks from `AppDashboardPage` and pushing them to a future `/app/inspect` route, so the user-facing dashboard stops looking like a developer surface.

---

That ends the UI/UX pass. The aesthetic foundation is genuinely strong — the palette, the type, the architectural choices in `DESIGN.md` are all pointed in the right direction. What's missing is the layer of motion, illustration, and interactive delight that separates "good-looking app" from "the kind of site people screenshot and share." Six set-pieces (live status strip, shielded-state grid, hero 3D, motion vocabulary, lane flow visualizations, receipt packet UI) would close that gap and move Vanta from "carefully designed beta product" to "the privacy suite people want to use even when they don't have to."

---

# Final Pass — Becoming the Premier Privacy Suite

The lane deep dives covered the cryptography. The docs pass covered the framing. The UI/UX pass covered the surface. This final pass covers everything else — the strategic, operational, regulatory, ecosystem, and product moves that determine whether Vanta becomes a credible privacy suite that real businesses adopt or remains a well-engineered demo.

The framing question: **what would a head of compliance at a crypto-native merchant need to see to wire Vanta into a revenue stream?** That person is the actual customer. Most of what follows works backwards from their checklist.

## F1. Compliance posture as a product feature, not an afterthought

Privacy on Solana post-Tornado-Cash is a regulatory minefield. The path through it is well-established by recent academic work (Buterin, Heimbach et al. on Privacy Pools; the FATF Travel Rule guidance; OFAC's August 2022 sanctions) and Vanta has not yet committed to it architecturally. The blockers below are not optional for a US-deployed privacy product reaching real merchants:

- **Adopt the Privacy Pools pattern.** Every withdrawal proves not just "I own a valid note" but also "this note is in association set S," where S is a curated allowlist of deposits proven to come from non-sanctioned, non-stolen, non-mixed sources. Any merchant or exchange can choose which association sets to honor; users can choose which to be members of. This is the only known design that gives users meaningful privacy while letting compliance-conscious counterparties verifiably reject sanctioned funds. Without it, every Vanta deposit eventually correlates back to a sanctions exposure question.
- **Selective disclosure key escrow with a clear, public policy.** A user, voluntarily, can produce a viewing key for a specific transaction and share it with a counterparty (or under a specific court order, with law enforcement). The escrow is **per-user, opt-in, narrowly scoped** — there is no master key that decrypts all of Vanta. The policy is published verbatim on `vantaprivacy.xyz/legal/disclosure` and references specific statutes. This is what unlocks regulated counterparty integration (banks, exchanges, payroll).
- **Tiered KYC for merchants, not customers.** Customers paying merchants stay private. Merchants accepting funds at meaningful volume go through a one-time identity verification (Persona, Plaid Identity, or similar). Tier 0 ≤ $1k/mo no KYC; Tier 1 ≤ $50k/mo light KYC; Tier 2 above that full KYB with a registered legal entity. Most US PSP shapes look like this. Vanta's `getVantaPayMerchantTrustStatus` already has the type for this; it just needs the workflow.
- **Travel Rule integration where applicable.** When a merchant unshields above the $3k threshold, Vanta exposes the originator/beneficiary information to the merchant's compliance system via an API. This is mandatory in most jurisdictions; ignoring it is what got several mixers shut down.
- **A real legal entity and Terms.** Vanta needs a registered entity (likely a non-US foundation for the protocol layer + a US-incorporated entity for merchant services), published Terms of Service, a Privacy Policy, and a clear "what we will and won't do under legal pressure" document. The MISSION.md hints at this with "policy-safe private settlement" but the underlying legal structure isn't yet visible in the repo.
- **Sanctions screening at the deposit boundary.** Every deposit address gets checked against OFAC's SDN list and Chainalysis sanctions screening before the deposit is honored. A deposit from a flagged address is reverse-able to the depositor's wallet within a 24-hour window with no privacy claim. Cost: ~$0.10 per check via Chainalysis API; vendor integration is a one-week project.

None of this is happy work for a privacy product to do. But "privacy you can give to your accountant" is a 100x larger market than "privacy that reads as a sanctions evasion tool." Pick the larger market.

## F2. Anonymity-set bootstrapping — solving the empty-pool problem

A privacy pool with one user has anonymity set one — no privacy. Even after all the cryptographic work in the lane deep dives lands, Vanta has to ship to a market where no anonymity set exists yet. Three concurrent strategies:

- **Subsidized initial deposits.** For the first 90 days, Vanta refunds the network and protocol fees on shielded deposits to the first 1000 users. Cost: maybe $50k. Effect: a measurable anonymity set baseline before any organic flow arrives.
- **Anchor merchant partnerships.** Sign 3-5 launch merchants (e.g., a known DAO treasury, an OTC desk, a Solana-native subscription service) who commit to routing $1M+/month through Vanta in the first quarter. Their flow is the seed that grows the user-side pool. The trust packet pattern is exactly what these merchants need to integrate without depending on Vanta as a custodian for very long. Negotiate a rev-share or token-grant in exchange for the commitment.
- **Publish the anonymity-set "depth oracle" prominently.** A real-time gauge on the home page: "Current anonymity set: 1,247 active deposits across 8 assets." Make it the single most prominent number on the site. Privacy products that hide their anonymity set are hiding their weakest property; products that publish it are signaling strength as the number grows. The same gauge should fail-closed on the trust packet — a packet from an anonymity set < 100 is labeled "low-anonymity" with explicit copy.

The depth oracle infrastructure is also the right shape for the **decoy-batcher** code already partially in the repo (`shieldDecoyBatcher.ts`). Decoy deposits are a way to inflate the apparent anonymity set artificially; they're controversial. If used at all, they should be (a) cryptographically distinguishable from real deposits via a labeled-decoy circuit input, and (b) not counted in the public depth oracle. Otherwise the depth oracle is misleading and the privacy claim is hollow.

## F3. Distribution & go-to-market

The technical work of the previous sections gets Vanta to "production-ready cryptographic primitive." None of that wins users. Concrete distribution moves:

- **The 50-merchant design partner program.** Identify 50 crypto-native merchants in 2026 (DePIN projects, Solana-native SaaS, infrastructure providers, NFT marketplaces, content monetization platforms). Offer them: free integration support, white-glove onboarding, public case studies, and a token grant if Vanta launches one. Make the bar honest: "we are a beta product, your customers' transactions will be private once these specific gates clear, here's the roadmap." Most will say no. The 5–10 who say yes are the early-stage anchor flow.
- **A one-page "Why Vanta" deck targeting the merchant audience.** Today the home page is general-purpose. The merchant-specific version should answer: my customers don't want their wallet history public; my competitors and arbitrageurs can see my revenue flows on-chain; my international customers face tax/regulatory exposure from public payment trails. Vanta solves these without breaking my compliance posture. That's a 5-slide deck Vanta should ship next week.
- **Conference presence is the wrong play.** Vanta is at a stage where Solana Breakpoint booths don't move metrics; the merchant audience isn't there. Better: 1:1 outreach to the 50 highest-revenue Solana merchants directly, an active developer-relations presence on Twitter/X (the project has `@vantaprivacy`; needs to ship), and content (case studies, technical deep-dives, comparisons against Aztec/Penumbra/Railgun).
- **A "for treasuries" positioning track.** Solana foundation, prominent project treasuries, DAO multi-sigs — these are organizations that want their movements less public for legitimate reasons (acquisition negotiation, employee compensation, vendor payments). The product fits them especially well because they have legal teams who can evaluate the disclosure mechanism, and they have predictable monthly flow that bootstraps the anonymity set.
- **A "for payroll" positioning track.** Crypto payroll providers (Toku, Liquifi, Request) currently expose every employee's wallet on chain. Plug Vanta in and that exposure goes away. This is high-LTV, recurring, low-fraud, and structurally aligned with the privacy thesis.

## F4. Developer surface

Today a merchant integrating Vanta writes HTTP requests against `operator/pay-server.mjs` directly. That's a Stripe-shaped API but without Stripe's developer experience. To compete with Stripe-on-crypto (the implicit positioning), the developer surface needs:

- **A typed SDK.** TypeScript first (`@vanta/pay`), Python second (`vanta-pay`), Ruby/PHP/Go later. The TypeScript SDK should mirror Stripe's API ergonomics: `vanta.checkoutSessions.create({...})`, `vanta.refunds.create({...})`, idempotency-key support, automatic retries with exponential backoff, typed webhook event handlers.
- **A drop-in React component.** `<VantaCheckout sessionId={id} />` for embedded mode, `<VantaPaymentLink slug={...} />` for hosted mode. With Tailwind/CSS-variable theming so merchants can match their brand.
- **A wallet adapter library.** `@vanta/wallet-react` with `useVantaShieldedBalance()`, `useVantaPaymentSession()` hooks. Solves the integration problem for any wallet-connected dApp.
- **A webhook signing verifier.** Today merchants reverse-engineer the `t={timestamp},v1={signature}` header (Stripe-compatible). Ship `vanta.webhooks.constructEvent(rawBody, signatureHeader, secret)` so they don't have to.
- **Sandbox test mode.** A separate `test_*` API key tier that runs against a test-only operator with fake balances and fake wallets. Critical for merchant integration testing.
- **A public Postman / OpenAPI spec.** `vantaprivacy.xyz/api/openapi.json`. Generated from the type definitions in `vantaPayTypes.ts`, kept in sync via CI.
- **API reference docs at `docs.vantaprivacy.xyz`.** Auto-generated from the OpenAPI spec. Stripe-style three-column layout (nav, content, code samples in 4 languages).
- **A migration guide from Stripe.** Many candidate merchants currently use Stripe. A "your Stripe webhook handler, with these 3 line changes, accepts Vanta events too" guide is high-leverage.

This is 6–10 weeks of focused work for one developer-relations engineer. Without it, Vanta is competing on price and privacy alone; with it, Vanta is competing on developer experience too — which is what most merchant decisions actually optimize for.

## F5. Mobile reach

The entire UI/UX pass treated Vanta as a desktop web app because that's what `src/pages/*` ships. That's a market constraint. ~70% of consumer crypto activity happens on mobile (Phantom mobile, Solflare mobile, in-app browsers). A privacy payment product that's desktop-only excludes its largest customer segment.

Three options, ordered by effort:

- **Option A — PWA optimization.** Make the existing app a high-quality progressive web app. Mobile-first responsive design (current code has some mobile media queries but is not mobile-first), wallet connect via mobile wallet deeplinks (Phantom, Solflare, Backpack all support `solana:` URI schemes), home-screen install prompt. ~2–3 weeks, no new codebase.
- **Option B — Native iOS/Android via React Native.** A real mobile app published in app stores. Better push notifications, more reliable wallet integration via mobile-native SDKs (Mobile Wallet Adapter), better camera/biometrics access. ~10–12 weeks for a competent team. Higher long-term ceiling.
- **Option C — Mobile-first hosted checkout only.** Don't ship a full mobile app yet, but make sure the customer-facing checkout flow (per Pay-lane P1) is mobile-perfect. This is the pragmatic compromise: merchants integrate from desktop, customers pay from mobile, Vanta's own mobile app comes later. ~3–4 weeks.

Option C is the right default. Option A is the right second step. Option B should wait for product-market fit signals.

## F6. Wallet ecosystem integration breadth

Today the app uses a single wallet adapter path (visible in `src/data/context/WalletContext` and the various `useVantaSafeSendTransaction` hooks). For a Solana product in 2026, the supported-wallets list determines reach. Specific integrations to ship:

- **Phantom** — the default. Already presumably works.
- **Solflare** — second priority. Standard wallet adapter integration.
- **Backpack** — the rising third option. Has xNFT/native app surface that Vanta could integrate into directly.
- **Mobile Wallet Adapter (MWA)** — Solana Mobile / Saga support, which is also the default for in-app browsers in Phantom/Solflare mobile.
- **Squads multi-sig** — for DAO treasuries and corporate users. Squads' protocol supports executing arbitrary instructions via multi-sig; Vanta should integrate as a known Squads program ID.
- **Hardware wallets** (Ledger, Trezor) — required for treasury-scale users. Standard Solana wallet adapter has support; Vanta needs to test the signing UX specifically since shielded transactions have larger instruction data than typical SPL transfers.
- **Wallet connect for WalletConnect-based wallets** — out of scope for Solana specifically (WalletConnect is largely EVM), but mention here so it's not forgotten if Vanta cross-chains later.

## F7. Operational maturity

Stripe is at 99.999% uptime. Vanta has no published uptime, no SLO, no status page, no on-call rotation, no incident response runbook outside the operator-runbook.md (which is for operators, not customers). To be the premier *suite* — meaning something businesses depend on — Vanta needs:

- **`status.vantaprivacy.xyz`** — a public status page (Statuspage, Better Uptime, or similar). Lists the operational status of each component (operator API, webhook delivery, indexer, on-chain program). Updated automatically via health-check pings.
- **A published SLO.** "99.9% uptime on the merchant API" is the right opening number (~8.7 hours of allowed downtime per year). Anything stricter requires multi-region deployment and is overkill for the current operator architecture. 99.9% is achievable on a single Render region with thoughtful health checks.
- **Incident response runbook.** Operator on-call escalation, severity levels (Sev 0 = funds at risk, Sev 1 = service down, Sev 2 = degraded, Sev 3 = cosmetic), public communication templates. Stored at `ops/incident-response.md`.
- **24/7 monitoring with paging.** PagerDuty or Grafana On-Call. Tied to the same checks the status page reads. Founder-only initially, expanded to a small team as headcount allows.
- **Quarterly chaos drills.** Once per quarter, a planned outage of one component to verify (a) detection works, (b) escalation works, (c) recovery works. Public post-mortem after each drill.
- **A "transparency report"** published quarterly. How many shielded deposits, how many unshields, how many disclosure requests received from law enforcement, how many honored, how many declined and on what grounds. Cloudflare and Twitter and most major platforms publish these; for a privacy product it's a credibility multiplier.

## F8. Recovery, social key management, and loss prevention

Privacy products lose user funds in ways traditional products don't. Specifically:

- **Lost wallet → lost shielded balance.** New live Shield/Send/Swap canonical records now use wallet-derived owner context instead of bridge-local `randomHex32()`, but legacy local records remain unmigrated and there is not yet a full cross-device recovery/import UX. Lose the wallet, lose the funds; clear old browser state, and old random-seeded records are still unrecoverable.
- **Lost viewing key → lost ability to find your own notes.** Even if the wallet survives, an indexer-driven note discovery model needs the viewing key.
- **Lost spending key → lost ability to spend.** The actual unshield ZK proof requires the spending secret.

A premier privacy product needs a recovery story that doesn't compromise the privacy. Options:

- **Wallet-derived deterministic recovery (the shield-lane W2 recommendation).** Sign a fixed message with the wallet to derive the master seed; everything else is derived from there. Lose the wallet, lose the funds — but the recovery story is "use your wallet, again, on any device" which is what users already understand.
- **Encrypted backup to the user's choice of cloud provider.** Optional: an encrypted blob containing the master seed, encrypted to a passphrase, that the user uploads to iCloud / Google Drive / Dropbox. Standard pattern from Argent and Soul Wallet.
- **Social recovery via guardians.** Optional: the user designates 3 guardians (other wallets they trust); 2 of 3 can collectively initiate a recovery flow. The current `privateVaultCrypto.ts` (PBKDF2 + AES-GCM) is the wrong primitive for this — social recovery wants Shamir Secret Sharing or threshold ECDSA, which are well-supported by libraries.
- **Hardware-backed key for high-value users.** A Ledger app for Vanta that holds the spending key in the secure element. Much harder to lose. Standard implementation pattern; ~6 weeks of work.

The default path should be option 1 (wallet-derived); options 2 and 3 are progressive disclosure for users who want stronger guarantees. Option 4 is a v2 feature.

## F9. Tax, accounting, and B2B treasury features

Privacy doesn't exempt anyone from tax obligations. Most users will need to report shielded transactions to their accountant or tax software. Today there's no path for them to do this without breaking their privacy.

The opportunity: **Vanta produces a privacy-aware tax report that the user can hand to their accountant without exposing the on-chain details to anyone else.** Specifically:

- For each shielded action the user performed, the report contains: action type (shield / send / swap / unshield), amount, asset, USD value at time of action (from a price oracle), counterparty type (self / merchant / unknown), timestamp.
- The report is signed by Vanta's transparency key so a tax authority can verify it's authentic without Vanta needing to hold per-user data.
- The report is generated client-side from the user's local note history; Vanta's servers never see it.
- Standard tax-software export format (CSV, FBAR-compatible JSON, TurboTax-compatible 8949 schedule).

This is a one-month feature that turns Vanta from "thing my accountant doesn't understand" into "the only crypto privacy product my accountant actively prefers." It's a wedge into legitimacy that's still rare in the privacy space.

Adjacent B2B treasury features to follow:

- **Multi-signer shielded balances.** A 2-of-3 multi-sig over the spending key, similar to Squads. Required for corporate treasury use.
- **Role-based access.** A treasurer can spend; an accountant can view-only; a CEO can sign for amounts above a threshold. Maps to the existing viewing-key / spending-key split, plus a delegation-key concept.
- **Payroll batch shielded sends.** A single transaction shielded-sends to N employees at once. Currently each Send is one transaction; a batch send is ~50% cost reduction at scale.
- **Accounting export.** QuickBooks / Xero / Stripe Sigma-compatible. A merchant runs a monthly export and their books reconcile.
- **Subscription billing with privacy.** The repo has `private-pay-subscription-notes.md`. Subscriptions are the highest-LTV merchant feature in payments and a unique-and-defensible product for a privacy rail. Recurring billing on shielded balances, cancelable mid-month, refunded pro-rata — all the standard SaaS billing primitives, but customers don't expose their identity to each merchant they subscribe to.

## F10. The token, the product, and the relationship between them

A `$VANTA` token exists, launched on Bags at contract address `9yqv319Boij6kUfD6CAzXEGYk7pHUfda37ye6FQmBAGS`. The README's reference to "supply buybacks" is therefore backed by a real on-chain instrument, not aspirational framing. This is a constraint to factor into the rest of the review, not a strategic question to answer.

Three observations that follow from the token's existence, none of which should drive the technical or product roadmap:

- **The "Why Vanta exists" story stays product-first.** The premier-suite case is that Vanta is the credible private-settlement rail for Solana stablecoin flows. Merchants integrate because the product works and because trust packets are useful, not because they're token holders. Letting the token become the headline weakens the merchant pitch — most regulated counterparties evaluate "is there a token" as a *risk*, not a feature. The product copy on `/`, `/docs`, `/app/pay`, and merchant-facing collateral should treat the token as a public artifact of the project, not as a reason to use it.
- **The token enables specific moves the rest of this review proposes, when they make sense product-first.** Anonymity-set seeding subsidies (F2), anchor-merchant token grants (F3), buyback transparency as a trust signal (F11), governance over verifier upgrades (F12 Stage 4) — each of these has a token-aware version and a token-free version. Pick the version that's right for the product reason, then use the token where it actually adds clarity. Don't manufacture utility just to give the token a job.
- **The token launch venue carries connotation.** Bags is a Solana launchpad associated more with memecoin distribution than with infrastructure-protocol fundraising. That's not disqualifying — many serious projects launch via unconventional venues — but it means the token's framing in product copy and investor/merchant conversations needs to actively distinguish "$VANTA, the utility token of the privacy suite" from "$VANTA, a memecoin." A short tokenomics page at `/token` covering supply, distribution, the buyback formula, on-chain links to the contract, and any utility hooks (fee discounts, staking, governance) is the cheapest way to do this. It also lets the token live as one part of the product surface without colonizing the rest.

Concrete next moves, optional but available:

- **Make the buyback formula explicit and on-chain-verifiable.** Publish "X% of net protocol fees, executed monthly via on-chain swap from $USDC into $VANTA, transactions linked from `/token`." The buyback transactions can themselves run privately through Vanta — a flagship use of the product, demonstrating the privacy thesis on the project's own treasury operations. Privacy applied to a buyback is a story; transparency about the formula and the executed-tx links is the trust mechanism that lets a sophisticated holder verify it.
- **Token-paid fee discount as a soft utility hook.** Merchants paying the 0.25% fee in `$VANTA` get a discount (e.g., 0.20%). The discount is small enough that it doesn't drive merchant choice, large enough that it gives the token a non-speculative reason to be held. Implement only if it doesn't add operator complexity.
- **Reserve `$VANTA` for the eventual decentralization stages, not the current product.** Per F12, the path from "single operator" to "anyone-can-operate" to "trustless" is multi-year. Token-holder governance over verifier upgrades and operator selection is the natural fit *at that stage*, not earlier. Trying to ship governance now turns into a distraction from the cryptographic and product work that's actually blocking premier-suite status.

The default recommendation for the next 12 months: ship the technical and product work documented in this review, ignore the token's market price, treat `$VANTA` as a public artifact of the project that exists alongside the product rather than embedded in it. Revisit specific token-aware mechanisms (governance, staking, deeper utility) once the lane work has shipped and there's a non-custodial pool worth governing.

## F11. Trust signals worth investing in

For a privacy product, trust signals matter more than feature breadth. Specific trust investments:

- **Bug bounty.** Pre-mainnet, $250k–$1M critical-severity bounty on Cantina or Immunefi. Mid-tier ($25k high-severity, $5k medium) below that. Total annual budget: ~$50k expected payouts plus marketing benefit. Pre-mainnet bounties produce two outcomes: real bugs surface (good), or the program runs quiet for 90 days and that itself is a credibility signal (also good).
- **A `/security` page.** Published security policy, contact email (`security@vantaprivacy.xyz`), GPG key, scope and rules, hall-of-fame for past disclosures. Standard and missing.
- **A `/threat-model` page.** Public threat model document covering users, merchants, operators, relayers, counterparties, regulators, and adversaries (chain-analytic, network-level, side-channel, post-quantum). The MISSION.md already requires this for production-ready status; it should also exist as a public artifact.
- **Open-source the verifier and circuits.** The Noir source is in the repo but the verifier integration and the build pipeline that produces verifying keys should be Apache-2.0 / MIT. An auditor or a curious cryptographer should be able to clone, build, and verify that the deployed program matches the claimed circuits. This is what the audit-package.md should ship with.
- **Reproducible builds.** Every deployed Solana program has a published build script that anyone can re-run to produce the same on-chain bytecode. Cargo + a deterministic build environment (Docker pinned to a specific image hash). Required for any privacy product that asks users to trust the deployed code.
- **A "we will never" list.** Public document committing to specific things Vanta will not do: never hold a master decryption key, never sell user data, never accept SDN-listed wallets, never use customer funds for operator liquidity, etc. Concrete, narrow, falsifiable. Trust comes from constraining yourself in public.
- **An advisory board with names.** Two to four well-known names in cryptography or compliance willing to be publicly associated with Vanta. Even one is a step change in credibility. The names matter more than what they actually do.

## F12. The decentralization question

Today's Vanta is fully operator-controlled. Per the lane deep dives, this is the right place to be for v0 — the operator does most of the work, the user trusts them, the system functions. But every privacy protocol of meaningful size eventually faces: *can we run with no operator?*

The path to operator-optional, in order:

- **Stage 0** (today): single operator, full custody, mock cryptography.
- **Stage 1** (after the lane work in this review lands): single operator, on-chain proof verification, PDA-owned vault. The operator is a relayer + indexer, not a custodian. **This is the realistic 12-month target.**
- **Stage 2**: multi-operator. Anyone can run an operator; users pick which one to use; operators compete on UX, fee, and uptime. Requires the on-chain program to accept relayed transactions from any signer. Mostly already true after Stage 1 (per the unshield-lane U2 design).
- **Stage 3**: trustless indexer. The Merkle tree is reconstructible from chain state alone, so any client can run their own indexer and not depend on Vanta's. Requires the on-chain commitment events to carry enough data for full reconstruction (per shield-W4).
- **Stage 4**: governance over verifier upgrades. The verifying key embedded in the on-chain program can only be changed via on-chain governance with a public upgrade window. The natural mechanism is `$VANTA`-holder voting once the protocol is mature enough to merit it; until then, a foundation or multi-sig with a published upgrade policy is the safer interim.

Stages 1–3 are pure engineering and should be the project's 1–2 year target. Stage 4 depends on the token decision and probably belongs to year 3+.

The valuable thing about publishing this path early is that merchants and counterparties evaluating Vanta in 2026 can see "where this is going" — which makes integration commitments easier even at Stage 1.

## F13. The premier-suite synthesis

Across this entire review — six lane deep dives, the docs pass, the UI/UX pass, this final pass — what does it take for Vanta to actually become *the* premier privacy suite for Solana?

In one sentence: **a credible non-custodial shielded pool with verifiable trust packets, anchored merchant integrations, a Privacy Pools compliance layer, a real developer SDK, and an operational maturity the shipping rate already demonstrates the team can hit.**

In a longer form, the highest-leverage moves, ordered by leverage-per-week-of-work:

1. **Lift the strategy/pay trust-contract pattern into UI gating across all six lanes** (closes the framing-vs-code gap that makes everything else risky).
2. **Replace the operator-keypair-in-env vault with a program-owned PDA** (eliminates the single-env-leak custody risk that dwarfs every other operational concern).
3. **Keep fresh action memos on v2 AEAD and finish recipient discovery/proof binding** (fresh helpers no longer emit plaintext v1 action memos; local Send proof requests/circuits now bind recipient/change ciphertext body-hash fields, while view-tag/indexer discovery, recipient key exchange, production memo/indexer handoff, and legacy v1 migration remain).
4. **Lock the Poseidon canonical note schema and rebuild the four entry circuits at depth 20 with real ownership constraints** (turns the cryptographic story from "shaped right" to "actually right").
5. **Wire `@aztec/bb.js` as the real prover and Light's Groth16 verifier on-chain** (turns the cryptographic claims into cryptographic facts).
6. **Adopt Privacy Pools association sets and publish the compliance posture publicly** (unlocks merchant adoption that Tornado-shaped privacy can't reach).
7. **Ship the customer-side wallet flow for Pay** (gives merchants something real to integrate against).
8. **Sign 5 anchor merchant partners** (solves the empty-anonymity-set problem and the credibility problem at the same time).
9. **Publish a tokenomics page at `/token`** covering supply, distribution, the `9yqv319Boij6kUfD6CAzXEGYk7pHUfda37ye6FQmBAGS` contract, the buyback formula, and any utility hooks — a short factual artifact that lets `$VANTA` exist alongside the product without colonizing the merchant pitch.
10. **Build the developer SDK + sandbox + docs** (turns "privacy on Solana" from a research project into a payment processor).

Items 1–5 are technical and the lane deep dives have detailed plans. Item 6 is technical-meets-policy. Item 7 is product. Items 8–10 are go-to-market. They need to ship roughly in parallel — there's no order in which "ship the SDK" and "fix the proofs" can be sequential.

What makes a privacy suite *premier* is not having the most cryptographic features. It's: real merchants accept it, regulators don't shut it down, users can recover their funds, and the trust artifact (the receipt / packet / proof) is something a counterparty's lawyer signs off on. Vanta has built the architectural template for all four. The remaining 12 months are about turning that template into a system real businesses commit revenue flow to.

---

## Closing

This document started as a high-level audit of `vantaprivacy.xyz`. After six lane deep dives, a docs pass, a UI/UX pass, and this final strategic pass, the consolidated picture is clearer than I expected at the outset:

- **The team has good taste.** Every architectural choice in the repo — from the trust-contract pattern in strategy and pay, to the rail-conditional claims in `privacy-rail-contract.md`, to the explicit `proofStatus: "not-provided"` fields in the unshield receipt, to the `claimControls.fully_private_pay_claim: false` runtime values — points the same direction. The honesty is not accidental.
- **The framework outpaces the implementation.** The patterns required for Vanta to ship credibly already exist in the codebase. They're just not enforced everywhere they need to be.
- **The gap is plumbing, not invention.** The actual_private_spend circuit shows the team can write a real ZK circuit. The vantaShieldViewingKey shows they can build proper AEAD crypto. The strategy runtime shows they understand fail-closed gating. None of the work in this review's recommendations requires research-level cryptography or novel architecture. It requires connecting components that already exist into one pipeline that ships end-to-end.
- **The opportunity is real.** Solana lacks a credible privacy-preserving payment rail. Tornado Cash's sanctioning created a market vacuum that no Solana-native product has yet filled. The first product that ships a Privacy-Pools-shaped, merchant-friendly, compliance-aware shielded pool on Solana with a working SDK and 10 anchor merchants is the default choice for the next decade. There's a clear path to being that product, and most of it is in this document.

Vanta isn't there yet. After Codex's three local ZK passes (visible in the progress notes above) it's measurably closer than it was when this review started. The remaining work is substantial but bounded and well-scoped. Most of it is in the team's existing capability range. None of it requires a different team.

What I'd want to see in the next review pass, six months from now: this document's "still open" lists are mostly closed, the trust-contract pattern is wired into UI gating across all six lanes, the on-chain program owns the vaults, the proofs are real and verified on chain, and `vantaprivacy.xyz/.well-known/audit` returns a JSON document I can verify against the deployed program ID. If those things are true, Vanta is the premier privacy suite for Solana. The path to get there is plumbed in the recommendations above.

Good luck.

---

# Taste Pass — How to 20× It

The strategic, technical, and UI/UX passes above tell you what to *build*. This pass tells you what to build it *as*. They're different. A 2× improvement is "the buttons feel nicer." A 20× improvement is "people screenshot the receipt, not because it's pretty, but because they've never seen a payment artifact look like that before."

Taste in a product is the sum of small commitments most teams refuse to make: a specific aesthetic, a specific voice, a specific posture toward the user. Most products are designed by committee toward "good," which is why they all look the same. The privacy/payments space is currently a sea of dark Linear clones with mint accents. Vanta has the opportunity to break out of it, but only if the team commits to taste decisions that *exclude* things rather than include everything.

Twelve commitments, in order of leverage.

## T1. Pick an aesthetic that means something

The current visual language is "darker Linear with mint" — competently executed, perfectly forgettable. The product's name is *Vanta*, named after Vantablack, the darkest material ever made. The brand has been gifted the most distinctive aesthetic prompt in the privacy space and the site does not use it.

Four directions worth seriously considering:

- **The abyss.** Lean fully into Vantablack. The site's actual `#000` rather than `#030406`. Bioluminescent accents that glow against true black like deep-sea creatures. Particle motion that suggests being underwater. WebGL depth, parallax in 3D space, things that move slowly because they're heavy with water. **This is the obvious answer and the team should take it.** Nobody else in crypto is doing this and the brand name justifies it perfectly.
- **The vault.** Heavy materials. Brushed steel, brass, leather, riveted plates, embossed seals. Privacy as a Swiss bank from a future where Swiss banks are still a good idea. Tactile, weighty, slightly anachronistic.
- **The classical correspondence.** Wax seals, monogrammed letterhead, registered mail, stamped envelopes. Privacy as a return to a slower, more deliberate communication standard. Receipts that look like notarized documents.
- **The brutalist financial.** No ornament. Akzidenz Grotesk. Monospace numbers in a single column. Two grayscales and one color. The aesthetic of a Swiss bond prospectus from 1978. Nothing moves. Nothing decorates. The cryptography is the only ornamentation the product allows itself.

Pick one. Commit hard. The wrong choice committed-to is better than the right choice hedged-toward. Right now Vanta is hedged toward four directions at once and reads as none of them.

If forced: the abyss. The brand demands it.

## T2. Develop a voice the product actually speaks in

Read three sentences from the current product back-to-back:

> *"Production privacy claims remain locked."*
> *"Settlement preview controls."*
> *"Spendable shielded state available."*

This is the voice of a contract review, not the voice of a product. It's accurate but it's not anyone's voice. Compare:

- **Stripe's voice:** clear, precise, technical without apology. *"Charges are billed to the customer's payment method on a recurring schedule."*
- **Linear's voice:** direct, opinionated, slightly impatient. *"Don't write project briefs. Write Linear projects."*
- **Notion's voice:** warm, conversational, encouraging. *"You can always come back and edit this later."*

A privacy product's voice should be *quietly confident.* Not technical-defensive. Not marketing-warm. Confident, materially-aware, with a slight understatement that signals seriousness. Examples:

> *"Your USDC enters Vanta. The door closes behind it."*
> *"Future-state sample after verifier, shared-pool, relayer, and audit gates: Send privately. The chain sees that something happened. It does not see what."*
> *"Your trust packet is sealed. Counterparties verify it without opening it."*
> *"You can leave whenever you want. The door always opens from inside."*

Notice these don't say "production privacy claims remain locked." They say what is true, materially. The disclaimers belong in their own corner of the product (the claim controls dialog), not infused into every sentence on every page.

A voice spec should fit on one page. Go write it.

## T3. Commit to a vocabulary

The current product surface uses generic web3 vocabulary: *shield, unshield, send, swap, balance, nullifier, commitment, settlement, withdrawal, receipt.* Functional, accurate, undifferentiated. Every privacy product uses these words.

What if Vanta used different words?

- *Shield* → **seal** (or **stow**, **case**, **case in**, **tuck**)
- *Unshield* → **open** (or **release**, **uncase**, **draw**)
- *Send* → **pass** (or **convey**, **forward**)
- *Swap* → **exchange** (or **trade**, **convert in place**)
- *Balance* → **holding** (or **trust**)
- *Receipt* → **letter** (or **packet**, **stamp**, **seal**)
- *Nullifier* → **mark** (or **tally**)
- *Commitment* → **claim** (or **note**)
- *Withdrawal* → **drawdown**
- *Vault* → **the vault** (singular, definite — there is only one)

These aren't random. They're the vocabulary of a 19th-century banking house, filtered through cryptographic precision. They're also vocabulary nobody else in crypto uses. **Adopting a distinctive vocabulary is the fastest way to be quotable.** Aztec's "Noir" and "Barretenberg" are objectively weird names; they're also part of why Aztec gets talked about. Penumbra's "shielded zone" and "Halo 2" do the same work.

Don't rename everything at once. Start with two: rename the user-facing trust packet to the **Letter** (because that's what it is — a sealed, signed correspondence), and rename the on-chain vault PDA to the **Vault** (singular, definite; there is one Vault per asset). Two months later when the merchant community is saying "Vanta Letters" and "the Vanta Vault" of their own accord, expand.

## T4. Make privacy visible by making time visible

Every privacy product hides its weakest property: anonymity set size. Vanta should display it as the centerpiece. Not just "1,247 active deposits" as a static number, but a *time-aware* visualization that's the most prominent thing on the home page:

- A horizontal axis representing time, from now reaching into the past two weeks
- A density of dots representing the deposits in the pool at each moment
- A shaded band showing the user's "anonymity envelope" — the set of deposits they could plausibly be inside, growing wider as time passes
- A real-time ticker as new deposits arrive, the band visibly thickening

This is a visualization nobody has built. It would communicate the privacy property of the system in a way no copy ever could. It would also be *honest about weakness*: when the anonymity set is small, the band is narrow, and users see that. When it's large, they see that too. The system's privacy story would be quantifiable on the front page.

This is the single most leveraged taste move. It commits to the privacy thesis visually, it's unique to Vanta, it's a screenshot people share, and it requires nothing the team can't already build.

## T5. Build the receipt as an artifact, not a record

Today's trust packet is a JSON blob. The taste move: **the trust packet is a sealed letter.**

Specifically:

- A real PDF, served from `/letter/<id>`, with letterhead, a serial number (`VTA-2026-0xa1b...`), a date, an issuing operator signature, a recipient field, and a sealed-wax-style impression of the brand mark in the corner.
- A QR code in the bottom-right that resolves to a verification URL that reads the on-chain proof and confirms the letter is authentic.
- A "Letter received" page on the verification URL that mirrors the PDF visually — same letterhead, same serial — with a subtle "verified" stamp animation when the cryptographic checks pass.
- The on-screen receipt UI inside `/app/pay` looks like the PDF. Not styled-as-receipt; literally the same layout. So a merchant can hand the customer a printout and the email and the URL all show the same artifact.
- An optional API endpoint that returns the letter as a single inline-image PNG for easy embedding in invoicing software.

The Letter becomes the company's distribution artifact. Every merchant who uses Vanta puts a Vanta Letter in their customers' hands. Every counterparty verification produces a Vanta Letter URL. Every accountant audit references a Vanta Letter serial number. The artifact carries the brand into every conversation Vanta isn't in the room for.

Stripe doesn't have a Letter. Square doesn't have a Letter. PayPal doesn't have a Letter. This is the move that creates a *category*.

## T6. Make the threshold a real moment

When a user first shields, that's a moment. Today it's silent — a successful transaction signature appears, some text changes, and the user moves on. A tasteful product makes the moment feel like crossing a threshold:

- A 600ms animation when the shield confirms: the brand mark briefly fills the screen, fades to the page background, and the new note appears in the user's vault grid with a subtle settling motion.
- A single, unique mechanical sound — a heavy door closing, ~200ms, low-frequency, opt-in default-on.
- The user's first-ever shield gets a named entry in their history: "Your first seal: 2026-05-09." On-screen marker. Optional one-click "save commemorative receipt" that issues a special edition Letter.
- A subtle persistent change in the app shell: once the user has shielded for the first time, the brand mark in the nav corner glows mint instead of gray. Tiny. Permanent. Becomes part of the user's relationship with the product.

These are not features in any feature list. They're the texture of using the product. They're what makes a user say "I like Vanta" instead of "I use Vanta."

## T7. Errors are an opportunity

Most products treat errors as failures. Tasteful products treat errors as the most important UX moments — the user is already frustrated, and how the product responds determines whether they stay.

Three concrete moves:

- **A custom 404 page** that's specifically Vanta. A confused vault attendant. A returned-unopened envelope. The brand mark dimmed and uncertain. Page copy that's slightly self-aware: *"This isn't a place. The Vanta Vault has fewer rooms than the URL suggests."*
- **Network errors get specificity.** Not "Transaction failed." Instead: *"The Solana network rejected this transaction at slot 312,584,221. The cluster is operating with elevated latency. Your funds were not moved. Try again, or wait 30 seconds."* The user's frustration is addressed by precision.
- **Wallet-rejection errors get warmth.** *"You declined to sign. That's fine — your funds are still where you left them."* Not all errors are problems. Some are user choices. Treat them differently.

Error states are also where your voice (T2) gets tested. A panicked error voice undoes everything else. A composed error voice compounds with everything else.

## T8. Hide easter eggs that respect the topic

Privacy is serious. Humorless is a choice; it's not the only one. A handful of small, on-theme moments that 1% of users will notice:

- **Brand mark animation by time of day.** During market hours UTC, the mark pulses on a 4s cycle. After hours, slower (8s cycle). Discoverable only by people who watch.
- **Slot-parity background tint.** The home page's background hue shifts microscopically based on the current Solana slot height parity. Even slots = mint at 0.4% saturation; odd slots = mint at 0.6% saturation. Visually undetectable to anyone not looking for it. Visible if you look closely. A thing for cryptography people to spot.
- **A `well-known` document.** `vantaprivacy.xyz/.well-known/audit` returns a JSON file with current circuit hashes, verifying-key hashes, deployed program IDs, and a signature from the project key. Cryptographers find it. They share it. It costs nothing.
- **A discreet manifest.** `vantaprivacy.xyz/manifest` (or in the page source as a comment) contains a single-paragraph credo: *"Vanta is built by people who think privacy is a precondition for being a person, not a feature for being suspicious. We will close the door behind your transactions and we will not open it without your asking. We will tell you when we cannot do that yet. We will not pretend to do it when we cannot."* People screenshot manifestos.
- **The Konami code unlock**, mentioned in the UI/UX pass. Worth keeping.

Three discoverable easter eggs, none of which a casual user will notice. All of which signal craft to the people who do.

## T9. Onboarding is a story, not a tutorial

The first 90 seconds with a product are when taste lands or doesn't. Today's first 90 seconds with Vanta: read the home page, click "Enter App," see a form. Generic.

What if the first 90 seconds were:

- The home page, after a 2-second pause, gently begins to scroll on its own. As it scrolls, a single particle drifts from a labeled "Public Wallet" node on the left toward a "Vanta Vault" node on the right. Behind the particle, a faint trail. As it crosses an invisible boundary, the particle's color shifts from neutral to mint, and the trail behind it fades.
- The home page text fades in alongside this motion, sentence by sentence: *"Your wallet is public. Vanta closes the door behind it. Privacy starts at the threshold."*
- After 30 seconds, the auto-scroll stops. The user can scroll freely. A small "Begin" CTA appears.
- Clicking "Begin" doesn't take the user to a form. It takes them to the **Vault** — a visual metaphor for their soon-to-exist shielded balance — and prompts them to "Open your Vault" by connecting a wallet. The vault doors open. They see an empty interior. Now they're inside the product.

This is 200 lines of WebGL and 50 lines of copy. It would take a week to build well. It would be the most-talked-about onboarding in crypto.

## T10. Treat the docs as a publication, not a reference

The current docs are correctly framed but feel like documentation. What if they felt like a *publication*?

- Each doc page has a byline ("Written by the Vanta team, last reviewed 2026-05-09").
- Each major release ships with a long-form essay on `vantaprivacy.xyz/log`. Not a changelog. A piece of writing. *"What Privacy Pools means for Solana."* *"The decision to use Poseidon."* *"How Vanta runs its own buybacks privately."* These are the documents that get linked in cryptography Twitter and that build technical credibility over years.
- The newsletter is real. Monthly. One voice (preferably an actual named person on the team). Long-form, technical, opinionated. Substack or self-hosted. Subscribers measured in hundreds before launch, thousands after.
- A `/manifesto` page distinct from the docs. The principles. Updated rarely. The thing the founder would defend in writing.
- A `/people` page with the team. Real names, real photos, real backgrounds. Privacy is a trust product; trust comes from people users can identify.

Stripe's blog is a reason people trust Stripe. Vercel's blog is a reason people trust Vercel. The Linear blog is a reason people trust Linear. None of these companies are journalism shops; they all *publish*. Vanta should too.

## T11. Keep the operator visible until it isn't

A tasteful privacy product is honest about its current architecture. The current architecture has an operator. Most privacy products try to hide their operator behind decentralization theater. Vanta should do the opposite:

- A **public Operator page** at `vantaprivacy.xyz/operator`. Lists the current operator entity, the deployed program IDs, the operator's public key, the operator's published commitments ("we will not change the verifying key without 30 days' notice"), the operator's incident history.
- An **Operator Letter** signed monthly. A one-page document, signed cryptographically by the operator's key, containing: pool size, monthly throughput, any incidents, any policy changes, links to evidence. Published on the public page; signed so anyone can verify it later.
- A **decommissioning roadmap.** Public, dated milestones for moving from "single operator" to "anyone-can-operate" to "trustless." Updated quarterly. Treats the operator role as a temporary state the project is actively trying to retire.

This makes the trust model an asset rather than a liability. Yes, there's an operator. Yes, here's exactly who they are and what they can do. Yes, here's the path off them. **Honesty about the current trust model is taste.**

## T12. The artifact you leave behind

When a user stops using Vanta, what do they take with them? Today: nothing. The localStorage clears, the trust packets are operator-side, the wallet still works, the experience is gone.

A tasteful product gives the user something to keep:

- A **lifetime activity letter.** Generated at any time. PDF. Lists every action the user took (privacy-aware — no counterparty addresses unless they explicitly attached them), totals, the date range, the cryptographic signatures. It's the user's record of having used the product.
- A **commemorative edition** for milestones. First shield, 100th shield, one year as a user. Special-styled Letter. Optional: claimable as a free, non-financialized NFT for users who want one.
- A **data export.** Standard CSV/JSON of everything the user did, encrypted to their viewing key, downloadable. Compliant with GDPR's data portability requirement; also just kind to the user.
- A **goodbye page.** If a user explicitly chooses to delete their account, a final page that says: *"Your local data is gone. Your on-chain footprint remains; that's not ours to delete. Here's a final letter for your records."* Followed by a final downloaded Letter. People remember how products say goodbye.

These are not retention mechanisms. They're the opposite — they're respect for the user's right to leave. Products that respect that earn the kind of loyalty that retention mechanisms cannot.

---

## What 20× looks like in practice

If everything above lands, what does Vanta actually feel like in 12 months?

A user opens `vantaprivacy.xyz`. The screen is true black. A handful of bioluminescent points drift slowly. A single line of text fades in: *"Privacy starts at the threshold."* A particle crosses a faintly-rendered boundary; behind it, a depth-oracle gauge shows 12,847 sealed deposits over the last 14 days, the band thickening as the user watches.

They click "Open your Vault." Their wallet prompts. They sign. The Vault doors open visually. They are inside an interior that's specifically theirs — a small, dark, comfortable room with their assets arranged in a grid. They seal a USDC deposit; the door closes with a single low-frequency mechanical sound. A Letter is issued. It looks like nothing they've ever seen before — a PDF with a cryptographic seal, a serial number, an embossed brand mark, and a verification QR. They send it to their accountant. The accountant has never received an artifact like it. They mention it to a colleague. The colleague mentions it on Twitter. The serial number gets shared. People click through to verify. The verification page mirrors the artifact perfectly.

A merchant integrating Vanta gets a Letter with every payment. They configure their hosted checkout — the customer-facing flow uses the same Vault metaphor; the customer recognizes it from screenshots their friends shared. Settlement produces a Letter. The merchant receives the Letter via webhook with a verification URL. They forward it to their finance team without explanation. The finance team asks where it's from. The answer ("Vanta") becomes part of the company's vocabulary.

Six months in, "Letters" is what the community calls trust packets. "The Vault" is what they call the protocol. A monthly Operator Letter goes out and people read it. The newsletter has 4,000 subscribers. The cryptography essays get linked in Vitalik's digest. The home page's depth oracle shows 380,000 sealed deposits. The manifesto is screenshotted. Onboarding feels like a ritual. Errors feel composed. Easter eggs get found and shared.

None of this is more *features*. All of this is taste.

---

## How to start

Most of this is unbuildable in a hackathon and unfundable in a typical seed round. Both are fine. Taste is a long game. The starting moves are small, opinionated, and mostly free:

- **This week:** write the voice spec (T2). One page. Pin it to the engineering channel. Apply it to the next ten copy edits.
- **This week:** rename "trust packet" to "Letter" everywhere. The next time anyone in the team uses the old term, gently correct them. Two weeks later it'll have stuck.
- **This week:** ship the `/.well-known/audit` document and the `/manifesto` page. Both are 30 minutes of work. Both are taste signals that compound.
- **This month:** commit to the abyss aesthetic. Replace `#030406` with `#000`. Replace the hero with a WebGL particle field. Tell whoever's worried about it that the brand demanded it.
- **This month:** redesign the receipt as a Letter. PDF, sealed, serial-numbered, verifiable. Show one to ten people. Iterate. Ship.
- **This quarter:** build the depth-oracle visualization (T4). Put it on the home page. Make it the most prominent number on the site.
- **This quarter:** write the first long-form essay for the log. Pick a topic that the team has actually thought hard about (the Poseidon decision, the operator decommissioning roadmap, the choice not to use a token). Publish under a real byline. See who shares it.

The team that does these seven things in three months has shipped a product that *looks like Vanta*. The team that doesn't has shipped a product that looks like every other privacy app.

20× the taste is not 20× the polish. It's 20 specific commitments that exclude things, made in public, defended in writing, executed with care. Most teams don't make any of them. The ones that do are the ones we still talk about ten years later.

---

# Polish Pass — How to 20× It

If taste is what to *exclude*, polish is what to *complete*. They're orthogonal. A product can be tasteful without being polished (a beautiful demo with rough edges) or polished without being tasteful (a competently-built generic SaaS). Vanta is currently neither — it's *competent*. Becoming the premier suite means both.

Polish is the thousand small things that distinguish "ships" from "feels expensive." It's why iOS feels different from Android, why Linear feels different from a generic Trello clone, why Stripe Checkout feels different from a generic payment page. None of those products have features the others lack. They have *finish*.

Ten themes, each with concrete moves. None require new product features. All require the team to slow down and treat each interaction as a discrete artifact.

## P1. Performance

Polish that you can't measure is taste. Polish that you can measure is performance, and Vanta has not yet measured.

- **Set a Core Web Vitals budget.** LCP < 1.8s on a Moto G4 / 4G connection, INP < 200ms, CLS < 0.05. Fail CI on regression. Today: unmeasured.
- **Code-split aggressively.** `src/pages/SendPage.tsx` is 2,692 lines, ShieldPage is 2,157, UnshieldPage is 3,232. The full app bundle ships them on first load. Vite supports route-level lazy splits with `React.lazy()`; this is one afternoon of work and will halve the initial bundle.
- **Defer the wallet adapter.** Solana wallet adapters add ~150kB of compressed JS. Most users land on `/` first; they don't need wallet code until they click "Open App." Lazy-load it.
- **Audit the CSS.** 9,051 lines of `styles.css` is a lot. Some is necessary (a real design system) but PurgeCSS via Vite would shed at least 40% on first paint. Bonus: enables CSS-in-JS for component-scoped styles without doubling the bundle.
- **Image weight.** Token logos (per the asset-picker recommendation) need to be SVG or 2x WebP, lazy-loaded with `loading="lazy"`, sized via `width`/`height` attributes to prevent CLS.
- **Font loading.** The `@import` of Google Fonts at the top of `styles.css` blocks first paint until 4 font files arrive. Replace with `<link rel="preload">` + `font-display: swap`, or self-host the woff2s and inline a minimal subset for the hero.
- **Service worker for the app shell.** A small SW that caches the shell on first visit. Repeat visitors load the app offline-first; the only thing that needs the network is the wallet/RPC traffic.
- **Avoid layout thrash.** Audit every component for `getBoundingClientRect()` reads inside loops. Don't read after writing.
- **Real-user monitoring.** Beyond synthetic Lighthouse, ship `web-vitals` to a privacy-respecting analytics endpoint (Plausible, self-hosted Umami, or just a `POST` to your own endpoint). Aggregate; never per-user.

Target: home page Lighthouse mobile score ≥ 95 on every category. Today probably 60-75.

**Codex status, 2026-05-10:** first local P1 remediation landed for route-level code splitting and wallet-adapter deferral. `src/App.tsx` no longer statically imports `/app` pages, Solana wallet providers, or the app shell; `src/ProductAppRoot.tsx` now owns the product shell, wallet providers, and Solana client setup behind the lazy `/app` route. The app pages are lazy imports, and `src/components/AppLayout.tsx` keeps a local Suspense boundary around the route outlet so mobile tab taps do not drop or blank the shell while the next page chunk loads. New guard: `npm run performance:route-code-split-check`. Local verification for this slice: `npm run performance:route-code-split-check`, `npm run build`, `npm run product-ui:browser-check`, `npm run landing:browser-check`, `npm run docs:browser-check`, `npm run mobile:browser-check`, and `git diff --check`. Build output now shows a small `renderApp` entry chunk with separate ProductAppRoot, page, Solana vendor, and private-core chunks instead of one large first-load app bundle. Remaining P1 work: Core Web Vitals budget/Lighthouse CI, CSS purging, font loading, image weight, service worker, and real-user monitoring.

## P2. Type and numbers

This is a financial product. Numbers and type are the medium. Polish here is differentiation.

- **Tabular numerals everywhere.** `font-variant-numeric: tabular-nums` is in the root CSS — good. But fixed-width digits only matter when *aligned*; the codebase has lots of free-flowing balance text where this is wasted. Audit and right-align every numeric display in tables, cards, and stat rows.
- **Semantic decimal alignment.** `100.50` and `1,234.00` should align at the decimal, not the right edge. CSS Grid `subgrid` or `text-align-last: justify` handles this; today it's not done.
- **Locale-aware formatting that respects context.** USDC isn't `$1,234.56` — that's USD. It's `1,234.56 USDC` (American), `1.234,56 USDC` (European). The `toLocaleString` in the code uses `undefined` as locale, which delegates to the browser; this is correct but should be explicit and tested per locale.
- **Currency precision is asset-specific.** USDC: 6 decimals. SOL: 9. Show the right number of decimals based on the asset; never silently truncate. The `formatVantaSolAmount` function in the codebase does this for SOL specifically; generalize it.
- **Number transitions.** When a balance changes from `100.00` to `250.00`, the number should animate (count up, ~400ms). React-spring or framer-motion can do this in 5 lines. Today balances jump.
- **Type sizes follow a modular scale.** Pick a ratio (1.25 minor third, or 1.333 perfect fourth) and derive all sizes from it. Today the CSS has a mix of px values that probably don't snap to a scale. Audit and reduce to ~8 sizes total.
- **Line height proportional to size.** Body text wants 1.55–1.65 line-height; display wants 1.0–1.1. Today some headings probably have body line-heights — visual audit needed.
- **Optical sizing.** Manrope and Syne both support OpenType `opsz` — different glyph forms at different sizes. Enable via `font-optical-sizing: auto`. Most browsers ignore it but on Safari and modern Firefox it makes a visible difference.
- **Long-form readability.** Docs pages and the eventual `/log` essays need a max width of ~65 characters per line for comfortable reading. Today there's no such constraint visible. Add `max-width: 65ch` on prose blocks.
- **Hyphenation and orphan control.** Display headlines should use `text-wrap: balance` (Chrome 114+, Safari 17.4+) so the title doesn't end with a single dangling word. One CSS line, big perceived polish.

## P3. Interaction quality

The micro-feedback that separates "responsive" from "alive."

- **Every button has four hover cues.** Cursor change (already there), color shift, shadow change, micro-scale (≤ 1.02). Plus `:active` state with reverse-scale (0.98) for tactile press feedback. Today most buttons have one or two cues.
- **Focus rings that look intentional.** The current `:focus-visible` is a 2px mint outline — fine for default, generic for premium. Replace with a layered glow: `0 0 0 2px rgba(0,0,0,0.5), 0 0 0 4px var(--accent)` (inner darken plus outer accent) for a focus ring that pops on any background.
- **Click should feel cause-and-effect.** Every clickable surface acknowledges the click within 16ms — even before the actual state change. CSS `:active` + transform is the cheapest way; for higher-stakes actions, a brief loading state with optimistic UI.
- **Optimistic UI on writes.** When the user submits a Shield, the new note appears in the Vault grid *immediately*, in a "pending" visual state, then transitions to confirmed when the chain catches up. Today the UI waits for the chain. This is 3-second-feels-like-eternity territory; optimistic UI flips it to 0-second-feels-like-300ms.
- **Copy-paste affordances.** Every address/serial/signature has a one-click copy button. Click triggers: brief check icon (300ms), label changes to "Copied" (1.5s), then reverts. Today some copy buttons exist but the feedback isn't standardized.
- **Drag and drop where it fits.** Files (CSV merchant exports), addresses (drop a wallet address from another tab), recipient pictures (in the eventual contacts feature). Most apps don't bother with drag-drop; products that do feel premium.
- **Keyboard shortcuts that respect convention.** `Cmd-K` opens search. `Cmd-/` opens shortcuts panel. `Cmd-Shift-D` toggles dark mode (or in this case, an alternate theme). `g` then `s` jumps to Shield (Linear-style). Document them in a `?` modal.
- **Clipboard awareness.** When the recipient field is focused and the clipboard contains a Solana address, offer to paste it — Linear does this for issue links. `navigator.clipboard.readText()` requires permission, but you can detect when the user *paste*s and validate immediately.
- **Input format-on-blur.** Amount inputs currently re-format on every keystroke (or not at all, hard to tell from the code). Best practice: parse on blur, format on blur. Avoids fighting the user mid-type.
- **Idle state recovery.** If the user has been idle for 90 seconds with a quote on screen, refetch the quote silently and update with a subtle pulse. Don't make the user click "refresh."

## P4. Motion

Animation should be invisible when right and obvious when wrong. Vanta's animation today is mostly absent, which means there's nothing to be wrong yet — a clean slate.

- **A standard easing palette.** The CSS has two easing curves; expand to a real library:
  - `--ease-snappy: cubic-bezier(0.4, 0, 0.2, 1)` — material-style for taps and toggles
  - `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` — for entrances
  - `--ease-in: cubic-bezier(0.7, 0, 0.84, 0)` — for exits
  - `--ease-spring: linear(0, 0.5, 0.9, 1.05, 0.95, 1)` — for playful confirmations
  - `--ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1)` — for celebratory states
  - Each named, each documented, each used purposefully. Today every animation is `var(--ease-out)` regardless of context.
- **Animation duration scale.** 100ms (instant feedback), 200ms (state change), 400ms (page transition), 600ms (celebratory). Never go above 600ms unless it's intentional content (the onboarding cinematic). Audit existing transitions for off-scale values.
- **Hardware-accelerated transforms only.** Animate `transform` and `opacity`. Never `width`, `height`, `top`, `left`, `padding`, `margin`. The CSS today probably has at least a few of the wrong kind; lint with stylelint.
- **Reduced-motion respected everywhere.** `prefers-reduced-motion: reduce` should disable nonessential motion. Today this isn't visible in the code; add a `useReducedMotion()` hook and a `@media (prefers-reduced-motion: reduce) { transition: none !important }` block at the bottom of styles.css.
- **60fps or it didn't happen.** Profile every animation in DevTools Performance panel. Anything below 60fps gets fixed or cut. The mint-pulse on the brand mark, the slot-tick animation, the route particle line — all need to be hardware-accelerated.
- **Coordinated transitions.** When a page transitions, multiple elements move in sequence (header fade-out, content slide-up with stagger, new header slide-in, new content fade-in). Today's transitions are simultaneous; orchestration is what makes them feel composed.
- **Spring physics where appropriate.** For drag interactions, dropdowns, modal entries, use spring rather than linear easing. Framer Motion's `spring` config or react-spring does this in one prop.
- **Page transition system.** When navigating between `/app/*` routes, a coherent transition (slide, fade, or shared-element) instead of the default React Router instant swap. View Transitions API (Chrome 111+, Safari 18+) is now usable; one polyfill for older browsers.
- **Loading shimmers, not spinners.** A spinner is a UI giving up. A shimmer is a UI working. Card-shaped placeholders that pulse with a gradient sweep while data loads. The Vault grid, the balance row, the receipt list — all should shimmer-load, not spin-load.

## P5. States nobody designs but everyone hits

Polish lives in the states a product doesn't show on a happy-path screenshot.

- **Empty states with personality.** "No shielded notes yet" today is text. Make it an illustration of an empty Vault interior with a single "Seal your first deposit" CTA and a hint about what shows up next. Same for empty payment list, empty refunds, empty webhooks.
- **Loading skeletons everywhere.** Card-shaped pulses match the eventual layout. The user never sees blank space; never sees content jump in.
- **Error states with recovery.** Three things: what happened (in plain language), why it might have happened (likely causes), what to do next (specific button). Today's error display is mostly toast-style or buried in helper text.
- **Offline state.** Detect via `navigator.onLine` and `online`/`offline` events. Show a banner: "You're offline. Vanta is still showing your last-known state. Connect to refresh."
- **Slow-network state.** When a fetch is taking longer than expected (>3s), show a "Still working — Solana is slow right now" message. Set realistic expectations rather than letting the user wonder.
- **Zero-balance state.** A wallet with $0 still gets a Vault interior, just an empty one with an inviting "Try your first seal with as little as $1" CTA.
- **Locked state.** When a feature is gated (per the trust-contract pattern), show a locked-but-glanceable preview with a clear "What this needs to unlock" description.
- **Pending state.** Solana confirms in 400ms but the user's mental model includes "is this real yet?" Pending states should be visually distinct (slight desaturation, subtle pulse) and explicit ("Waiting for Solana to confirm...").
- **Stale state.** When data hasn't been refreshed in a while, indicate it. "Balance last updated 47 seconds ago" with a refresh button. Stripe does this; most apps don't.
- **Recovery flows.** What happens when a user lands mid-flow after a refresh? Restore the form state from URL or localStorage, never make them re-enter.

## P6. Accessibility

A11y is polish because doing it badly tells users you don't care; doing it well lets them do their work without friction.

- **WCAG-AA contrast minimum, AAA where possible.** The current palette has `--muted: #8b9997` against `--bg: #030406` — that's 5.6:1 contrast, AA but not AAA. Audit all text/background combinations with axe-core.
- **Keyboard navigation across every flow.** Tab through every page; every interactive element should be reachable. No keyboard traps in modals. Visible focus on every focusable element.
- **Screen reader testing.** Test with VoiceOver (Mac/iOS) and NVDA (Windows). The `aria-label`s in the code are a start; complete coverage requires actual testing.
- **Live regions for state changes.** When a transaction confirms, an `aria-live="polite"` region announces "Shield complete. 100 USDC sealed." Currently the success states are visual-only.
- **Form errors associated with fields.** `aria-describedby` linking inputs to their error messages. Today's `pay-field__error` uses `id` attributes which is good; verify it's done consistently.
- **Focus management in modals.** When a modal opens, focus moves to its first focusable element. When it closes, focus returns to the trigger. Use a library (Radix, Reach UI) rather than rolling this yourself.
- **`prefers-color-scheme` and `prefers-contrast`.** Today the app is dark-only. Even if you don't ship a light mode, respect `prefers-contrast: more` by increasing contrast and removing decorative gradients.
- **Skip-to-content link.** A keyboard-only `Tab`-revealed link that jumps past the navigation. One element, one rule, half a day of work.
- **Touch targets sized for thumbs.** Apple HIG: 44×44pt. Material: 48×48dp. Today some buttons are smaller; on mobile this matters.
- **Captions / alt text discipline.** Every illustration, icon, and image has either a useful `alt` or `aria-hidden="true"` if decorative. The brand mark's `aria-hidden` is correct; the rest needs an audit.

## P7. Mobile

Most stablecoin payments happen on mobile. The site is desktop-first. Even on the path to a real mobile app, the web app needs to be mobile-perfect.

- **Mobile-first responsive.** Today's CSS has media queries that adapt desktop down to mobile. The polish move is the inverse — design mobile, scale up. The visible CSS hints at desktop-first.
- **Touch interactions.** No hover states as the only feedback (touch devices don't hover). Use `:active` + `:focus-visible` for parity.
- **iOS Safari quirks.** `100vh` doesn't account for the address bar. Use `100dvh` (dynamic viewport height) which is now widely supported. Position-fixed bugs on iOS Safari need testing.
- **Safe-area insets.** `env(safe-area-inset-bottom)` for iOS notch / home indicator. Already a common pattern; should be in the global CSS.
- **Tap delay removal.** `touch-action: manipulation` on interactive elements eliminates the 300ms tap delay on mobile.
- **Haptic feedback.** On supported devices, `navigator.vibrate(10)` on critical interactions (Shield confirm, Send confirm). Subtle, opt-in default-on.
- **Mobile wallet deeplinks.** Phantom, Solflare, Backpack on iOS/Android use `solana:` URI schemes. Detect mobile, show appropriate connect flow.
- **Pull-to-refresh.** Standard mobile pattern. iOS Safari handles it natively; Android needs explicit handling.
- **Address bar resize handling.** When the user scrolls, the mobile address bar collapses. Layout should not jump. `min-height: 100dvh` on the main container.
- **Performance on a Moto G4.** Test on a real low-end Android, not just a desktop with throttled CPU. Many apps look fine in DevTools and crash on actual devices.

## P8. Asset craft

The icons, illustrations, sounds, and small artifacts that compound into "this product was designed by someone who cared."

- **Custom icon set.** Don't use Heroicons / Feather / Lucide. Commission or hand-draw an icon set specific to Vanta. ~30 icons, consistent stroke weight, 24px grid. Vanta-specific glyphs: vault, seal, letter, key, ledger, oracle.
- **Token logos with consistent treatment.** USDC, USDT, SOL etc. all have official logos but they're rendered at different sizes, with different padding, different baseline alignment. Polish: all token logos rendered at 24px in a 32px square, consistent padding, monochrome variant for low-emphasis use.
- **Hero illustration.** Per the taste pass, a custom WebGL hero. Polish here is making sure it loads under 100kB (compressed Three.js, gzipped textures), runs at 60fps on a 5-year-old MacBook, gracefully degrades on older devices.
- **Sound design.** Two sounds, mastered to broadcast standards (-14 LUFS, no clipping, single peak). One for action confirmation (low-frequency mechanical), one for receipt issuance (single high-frequency stamp). Loaded as small AAC or OGG files, not WAV.
- **PDF letterhead.** Per the taste pass, the trust packet is a Letter. Polish: typography in the PDF matches the web (Manrope/Syne embedded), the layout is precisely engineered (A4 and US Letter both supported, signing block aligned, QR code at exactly 1.5cm).
- **Email templates.** When Vanta sends a webhook receipt to a merchant or a Letter to a customer, the email itself should look designed. HTML email is its own cursed art form (Litmus/Email on Acid testing required); polish here means the email looks the same in Gmail desktop, Apple Mail, Outlook, and Yahoo.
- **Favicon + app icons.** A polished suite includes 16/32/48 favicon, 180px Apple Touch icon, 192/512 PNG for Android, an SVG for adaptive theming, and a `site.webmanifest` that ties them together. Today: probably one favicon, generic.
- **Open Graph cards.** When someone shares `vantaprivacy.xyz` on Twitter or Discord, the preview card matters. A custom-designed OG image, dynamically generated per page (Vercel OG, satori, or a static set of 6-8 cards). Today: probably no OG card or a default Vite one.
- **Loading screen identity.** Even the brief moment between page transitions should have visual identity. A subtle Vanta brand mark that fades during transitions, not a generic Vite splash.
- **404 / 500 / offline pages designed.** Each error page is a discrete design opportunity (per the taste pass).

## P9. Engineering quality

Polish that holds up over time is engineering polish. Without this, the visible polish degrades on every deploy.

- **Component decomposition.** A 3,232-line UnshieldPage is a polish risk because no one will refactor it carefully. Extract: `<UnshieldForm>`, `<UnshieldRecipient>`, `<UnshieldApprovalReview>`, `<UnshieldTransitionPicker>`. Each ≤ 200 lines.
- **Type-safety end to end.** TypeScript strict mode if not already. No `any`. No `as` casts unless commented. Audit and clean up.
- **Storybook for UI components.** Each shared component (`<Button>`, `<Card>`, `<FlowIndicator>`, `<AssetPickerGrid>`) has a Storybook story with all states. Catches visual regressions, makes polish review possible across states.
- **Visual regression testing.** Chromatic, Percy, or self-hosted Playwright + pixelmatch. Snapshot every page in every state on every PR. Flag any pixel diff for review.
- **Lighthouse CI.** Run Lighthouse on every PR; fail if Performance/Accessibility/Best Practices/SEO drop below thresholds.
- **Bundle analyzer in CI.** `vite-bundle-analyzer` runs on every build; PRs that increase the main bundle by more than X kB get a comment.
- **Source-map quality.** Production source maps are uploaded to error monitoring (Sentry-style) but not served to clients. Stack traces in error reports point to original TS source, not minified output.
- **Console hygiene.** Zero `console.log` in production. ESLint rule `no-console` with allowed `console.error` only.
- **Unhandled promise rejections.** Global handler that captures and reports them. Today they probably go silently to the browser console.
- **CSS quality.** Stylelint with strict rules: no `!important` outside specific allowlists, no animation of layout properties, color values must use design tokens.
- **Component prop deprecation flow.** When a prop changes, deprecate before removing. `console.warn` in dev when deprecated props are used. Migration paths documented.
- **Dependency hygiene.** `npm audit` clean, Dependabot enabled, `package-lock.json` regenerated regularly. Renovate-bot or similar for automated PRs.
- **Pre-commit hooks.** Format on commit (Prettier), lint-staged on changed files, type-check before push. Husky or lefthook. Eliminates entire categories of regression.

## P10. The quality machinery

Polish only stays polished if it's a system, not an event. Six structural moves:

- **Polish standups.** Once a week, one hour, the team reviews the last week's UI in detail. Hover every button. Tab through every form. Make a list. File the issues. Fix them next week. Linear and Stripe both do this; it's why their products feel different.
- **A polish backlog.** Distinct from the feature backlog. Items are small (≤ 1 day each). Anyone on the team can add to it. The backlog has its own priority and owner. Most teams kill polish work in feature reviews; a separate track protects it.
- **The 5% time rule.** Every engineer spends 5% of their time on polish from the polish backlog. That's two hours per week per engineer. With four engineers, ten hours of polish per week, every week, forever.
- **Definition of done includes polish.** A feature isn't done when it works. It's done when it works *and* the empty state is designed *and* the error states are handled *and* the loading state shimmers *and* the success state is celebrated *and* the keyboard navigation works *and* the screen reader announces correctly. Add this to the team's PR template.
- **A polish anti-feature list.** Things the team has decided not to do, with reasons. "We don't show toast notifications for routine actions because they create UI noise." Documented in the engineering wiki. Prevents drift.
- **A polish review per release.** Before any release goes to production, one team member spends 30 minutes using the product as a new user. Notes everything that feels off. Files issues. Fixes them or explicitly decides not to. Ship is gated on this.

The reason these systems matter: polish degrades. Every PR adds new affordances; some of them are unpolished. Without a system that *finds* unpolished things, the product asymptotically becomes worse over time. Stripe and Linear and Apple are exceptional not because they polish faster, but because they polish *constantly*.

---

## What 20× looks like in practice

The hover state on the home page's "Enter App" button now feels like pressing a key on a keyboard — there's a 12ms color shift, a 1px shadow change, a 1.5% scale, a near-imperceptible cursor change. None alone is noticeable. Together they make the button feel like an object you are pressing rather than a pixel you are clicking.

The Shield form's amount input now formats as you type. `1234` becomes `1,234`. `1234.5678` for USDC truncates at 2 decimals on blur and shows a small "USDC has 6 decimals" tooltip if you try to enter more. The Max button isn't a button — it's a label inside the field that lights up on focus.

When you submit a Shield, the new note appears in the Vault grid before the chain confirms. It's marked pending with a subtle desaturation and a tiny `Pending` badge. 400ms later when the chain confirms, the desaturation fades, the badge becomes a `✓`, and the brand mark in the nav flashes mint for 300ms.

The receipt page has one custom favicon variant — slightly more saturated — that signals "you are looking at a Letter." Print the page and the print stylesheet engages: the Letter renders cleanly in black-and-white at A4, the QR code stays sharp, the navigation chrome disappears.

A user's screen reader announces "Shield successful, 100 USDC now in your Vault" without the user knowing they enabled accessibility. A keyboard user navigates the entire app without touching the mouse. A user on a 3-year-old Android sees the home page in 1.2s and interacts within 200ms of any tap. A user on iOS Safari sees a fixed bottom nav that respects the safe area, with safe-area-aware padding.

None of this is a feature. All of this is what makes the product feel premium when no individual moment is exceptional.

---

## How to start

Polish is asymptotic. You will never finish. The work is making the curve slope upward continuously instead of flat.

Three immediate moves, smallest-to-largest:

- **This week:** add `vite-bundle-analyzer`, `web-vitals`, and Lighthouse CI to the project. Set baseline numbers. Now you can measure.
- **This week:** establish the polish backlog as a separate track. First entries: every "today's UI doesn't yet do X" item from this pass. Single owner. Single weekly review.
- **This month:** the polish standup. One hour, weekly, the whole team. Walk through the product. Note. File. Fix. Repeat. The cultural artifact that makes everything else stick.

Three thirty-day projects, one per week:

- **Week 1: code-split the page bundles** (P1). Halves the initial bundle. Immediate Lighthouse win.
- **Week 2: build the standardized motion primitives** (P4). Three named easings, three named durations. Refactor every existing transition to use them.
- **Week 3: add loading skeletons and empty states everywhere** (P5). Replace every spinner with a shimmer. Replace every blank state with a designed empty state.
- **Week 4: WCAG-AA audit + keyboard navigation + screen reader pass** (P6). One developer, four days, run axe-core, fix everything. Then four hours of manual testing. Then commit to the result.

After four weeks, the product feels measurably faster, the animations feel coordinated, the empty states feel designed, and every user can use the app regardless of input method. None of this requires new product work. It's all latent polish in the existing surface.

---

## Polish vs taste — the relationship

A useful model: taste decides *what* the product is. Polish executes *how* the product is. They feed each other. A tasteful product without polish is an unfulfilled promise — an aesthetic vision rendered roughly. A polished product without taste is a perfectly-machined commodity — a generic experience executed well.

The 20× version of Vanta is the rare combination: a specific aesthetic point of view (the abyss, the Letter, the Vault) executed with the precision of an iOS-grade app. Most teams hit one or the other. The teams who hit both are the teams whose products people copy for the next ten years.

Vanta's taste opportunity is unique because of the brand name and the architectural framework already in place. Vanta's polish opportunity is unique because the codebase is small enough to cover end-to-end and the product surface is small enough to hand-tune every interaction.

Both opportunities expire. As the codebase grows and the team grows, both decisions become harder to make. The right time is now, and "now" specifically means the next 90 days while the product is still small enough to remake. After that, every change costs more.

That's the closing argument of this entire review: ship the technical work, ship the trust-contract enforcement, ship the customer-side wallet flow — and while you're shipping all of that, commit to a specific aesthetic and a specific polish standard. The team that does both, in parallel, in the next ninety days, ships the premier privacy suite for Solana.

The team that does one without the other ships another also-ran. The team that does neither ships nothing memorable.

The choice is whose review I'm writing six months from now.

---

## Twenty-seventh Codex feedback loop - Fresh-v2-only Send history scope

This loop addressed the remaining local-addressable part of the Send memo/discovery finding after the encrypted view-tag/indexer handoff: historical v1 Send memos are still plaintext and parse-compatible, but future production-private Send language needed a machine-readable boundary that does not imply old chain history was migrated.

Implementation:

- `parseSendMemo` now marks decrypted v2 memos as `memoPrivacyScope: "fresh-v2-viewing-key-aead"` with `productionPrivacyScopeEligible: true`.
- Legacy v1 plaintext Send memo reads remain backward compatible, but are marked `memoPrivacyScope: "legacy-v1-plaintext-history"` with `productionPrivacyScopeEligible: false`.
- `getVantaSendHistoryPrivacyScopePolicy()` records the durable policy: production Send privacy claims are scoped to fresh v2 AEAD sends unless legacy v1 plaintext history is migrated or segregated with reviewed evidence.
- Send status, trust packet, operator status, and local Send discovery status now expose a separate `legacyHistoryScope` object instead of treating legacy history as an unresolved blocker.
- The remaining Send discovery blocker is now the deployed memo/indexer handoff: `send-memo-indexer-body-hash-handoff-not-deployed`.
- Docs and security limitations now say old v1 history is excluded from production privacy claims; they do not claim v1 history was migrated.

Verification run during the loop:

- `npm run actions:memo-encryption-check`
- `npm run send:discovery-migration-policy-check`
- `npm run send:discovery-indexer-handoff-check`
- `npm run mainnet:send-production-check`
- `npm run send:trust-packet-check`
- `npm run lanes:trust-contract-check`
- `npm run privacy-rail:contract-check`
- `npm run security:limitations-check`
- `npm run docs:source-of-truth-check`
- `npm run send:production-privacy-claim-gate`

Still open after this loop: this is scope control, not legacy-chain-history migration. Production-private Send still needs deployed recipient discovery/viewing-key exchange, deployed memo/indexer proof-bound handoff, live reviewed settlement evidence, relayer separation, anonymity evidence, production replay/idempotency evidence, on-chain verifier enforcement, SBF redeploy/reinit/live verification, and audit acceptance.

---

# Re-review — Updated Findings After Codex Iteration

This section was written *after* Codex shipped multiple passes against the original review findings. I re-walked the code (`zk/noir/*`, `programs/vanta_private_pool_v2_spend/src/lib.rs`, `src/zk/crypto/ownerRecoveryPayloadCrypto.ts`, `src/solana/vantaShieldState.ts`, the live bridges, and the v2 entry circuits) and compared the current state against every recommendation in the lane deep dives. The result: more is closed than I expected, and the still-open items have sharpened.

## Items closed since the initial review

Marking these as **resolved** in the audit. Each was a critical or high finding from the lane deep dives; each is now correctly addressed in the code.

- **The on-chain program now authority-gates spend and tracks a registered root history.** `programs/vanta_private_pool_v2_spend/src/lib.rs` now has `TAG_REGISTER_ROOT = 2`, a per-pool `POOL_AUTHORITY_OFFSET`, an `is_signer` requirement on the authority for every spend, and an `ERR_UNKNOWN_ACCEPTED_ROOT` rejection when the supplied `accepted_root` isn't in the registered history. This closes the unauthenticated-spend / arbitrary-writer portion of the original program findings, but it does not close on-chain proof verification or verifier-key enforcement; those remain still-open production blockers.
- **PDA-based nullifier markers and output records replace the linear-scan fixed-slot accounts.** Each nullifier becomes its own PDA, deterministic from `(NULLIFIER_MARKER_SEED, pool_id, nullifier)`; each output record likewise. Lookup is O(1), capacity is unbounded, and there's no scan that grows quadratic with pool size. This is a substantively *better* design than the standard fixed-slot model used elsewhere in Solana privacy work, and it should be called out as such — it's the kind of architectural choice that an auditor would highlight as careful.
- **The `canonical_note_membership` circuit is no longer placeholder math.** It now uses `bn254::hash_10` for the note hash, `bn254::hash_1`/`bn254::hash_2` for Merkle leaf/node hashing, depth 20, real direction-bit handling without baking the bit into the parent hash, and a proper leaf-index-from-direction-bits constraint. Closes critical finding #3.
- **The Private Pool v2 entry circuits (`shield_entry`, `send_entry`, `claim_entry`, `swap_to_shielded_entry`) now do real Merkle membership and real incremental append.** They use `MERKLE_DEPTH = 20`, drop the direction-bit-in-node-hash anti-pattern, drop the hi/lo sibling split, and use a real append-path-from-empty-leaf construction (`compute_root_from_leaf(0, path, dirs)`). For send, this is paired with the recipient + change two-output append in sequence against the same input root. Closes critical findings #4 (entry circuits skipped membership), #5 (depth 3), and medium #10 (direction-bit in node hash).
- **The send circuit now enforces value conservation.** `assert(input_amount == recipient_amount + change_amount)` is the constraint I flagged as the single most important missing one. The economics_commitment binds (input, recipient, change, blinding); the value-conservation assert closes the "send 100 against a 50-value input" attack at the circuit level. This is exactly the right shape.
- **The shield circuit hides economics behind a commitment.** Only `economics_commitment = poseidon(source_mint, target_mint, target_asset_id, amount, blinding)` enters the public-input hash. Raw amount/source_mint/target_mint are witnesses, not public inputs. Closes medium finding #12.
- **The owner-recovery payload crypto is now X25519 + HKDF-SHA256 + XChaCha20-Poly1305.** The hand-rolled XOR-keystream + raw-SHA256-MAC is gone. `src/zk/crypto/ownerRecoveryPayloadCrypto.ts` now uses the same `xchacha20poly1305` AEAD as `vantaShieldViewingKey.ts`, with HKDF-derived keys and a v2 scheme tag (`owner-recovery-x25519-xchacha20poly1305-v2`). Closes high finding #6.
- **Action memos (send, swap, unshield) now have v2 AEAD-wrapped variants.** `VANTA_SEND_MEMO_PREFIX_V2`, `VANTA_SWAP_MEMO_PREFIX_V2`, `VANTA_UNSHIELD_MEMO_PREFIX_V2`, `VANTA_SOL_UNSHIELD_MEMO_PREFIX_V2` all exist in `vantaShieldState.ts`, all encrypt via `encryptVantaShieldMemoToViewingKey`. The pages now emit v2 memos by default; v1 plaintext-extract paths remain only as backward-compat read-fallbacks. Closes the "plaintext memos across all lanes" gap that the send-, swap-, and unshield-lane deep dives all flagged.
- **`vanta_private_core_single_note_swap`'s additive asset-difference comparison is fixed.** The old `(a_hi + a_lo) != (b_hi + b_lo)` is replaced with `if input_asset_id_hi == output_asset_id_hi { assert(input_asset_id_lo != output_asset_id_lo) }` — which correctly asserts the full 256-bit asset IDs differ. Closes medium finding from the swap-lane deep dive.
- **The dead `sender_secret_stub` line in the swap circuit is gone.** Closes the misleading "ownership check" signal.
- **`vanta_private_core_single_note_unshield` now has a real ownership constraint.** `let computed_owner_public_key = derive_owner_public_key(owner_secret_key_hi, owner_secret_key_lo); assert(owner_public_key_lo == computed_owner_public_key)` replaces the `owner_auth_placeholder == owner_auth_placeholder` no-op. The unshield circuit now cryptographically proves the prover knows the spending key, not just that they hold the wallet that signed the request. Closes the largest single missing constraint in the unshield lane.

This list is substantively impressive. Eight critical/high findings closed, plus several mediums. The team moved fast and the fixes are correct.

## Items still open, with sharpened recommendations

The recommendations below are revised in light of the current code. Some are the same as before; some are smaller in scope because part of the work has landed; one is materially different because the trust model has shifted.

### Still open #1 — Embed a Groth16 verifier in the program

The on-chain program now accepts (nullifier, output0, output1, accepted_root, public_input_hash) and writes them to PDAs after the authority signs. **It does not yet verify a ZK proof.** The trust model has moved from "anyone can DoS" to "the operator authority key is the trust anchor." This is Target B from the lane deep dives, not Target A.

The original recommendation (shield W6 / send S3 / swap X3 / unshield U2) was: embed Light Protocol's `groth16-solana` verifier and check the proof against the existing public_input_hash. That recommendation is *unchanged* but its execution is now simpler because:

- The public_input_hash is already in the spend payload at byte offset 128-160.
- The accepted_root check already validates that the current spend payload's root field matches a registered root; a future proof-carrying ABI must bind that same root through verified public inputs.
- The circuit's public_input_hash is already correctly bound to all the things that need binding (Merkle roots, nullifiers, output commitments, economics commitments).

Adding the Groth16 verifier is now a new proof-carrying spend ABI/verifier slice, not an extra field on the existing 161-byte transaction builder. The current program has useful scaffolding for `public_input_hash`, accepted roots, authority, nullifier markers, and output records, but the verifier work still needs an explicit proof layout, verifying-key commitment, and in-program or verifier-CPI acceptance rule before any payload can be treated as proof-enforced. The guarded C01 decision packet is `docs/zk/c01-production-verifier-backend-decision.md`; it records that no production verifier backend is selected yet and keeps the Groth16 tag-3 Solana verifier path separate from any Noir/bb.js/UltraHonk adaptation path. The C01 verifier-backend contract is intentionally explicit about the backend mismatch: tag `3` targets a Groth16-compatible Solana verifier path with `verifierKeyHash:32` and `groth16Proof:256`, while local bb.js/UltraHonk artifacts are not on-chain verifier evidence and remain `noir-bb` / `barretenberg-ultrahonk` local evidence. Local `local-acir-bytecode-hash-not-production-vk` metadata is not on-chain verifier evidence; a positive lane needs `production-verifying-key-hash` evidence. The remote proof-artifact boundary now labels current receipts as `offchain-remote-proof-artifact-only` and rejects `solana-c01-groth16-verifier-ready` claims until Solana tag `3` Groth16 verifier-ready evidence exists for the actual-private-spend circuit, `private-spend-public-input-hash`, 256-byte proof layout, and production verifying-key hash. Guards: `npm run zk:c01-verifier-backend-contract-check`; `npm run zk:c01-production-verifier-backend-candidate-check`; `npm run zk:c01-verifier-backend-decision-check`.

**Codex status, 2026-05-13 C01 verifier candidate evidence packet:** locally added a refs-only blocked evidence packet at `ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json`. The packet does not select a backend and does not make C01 verifier-ready; it records the required positive artifacts for backend selection, actual-private-spend production proof format, `private-spend-public-input-hash` binding, `production-verifying-key-hash`, verifier adapter, valid-proof mutation test, invalid-proof no-mutation test, SBF/live lineage, and audit/reviewer acceptance. It preserves `offchain-remote-proof-artifact-only`, `local-acir-bytecode-hash-not-production-vk`, `selectedBackend: null`, `solanaC01Groth16VerifierReady: false`, and `privacyClaimAllowed: false`. Guards: `npm run zk:c01-production-verifier-backend-candidate-check`; `npm run public:audit-discovery-check`; `npm run audit:package-check`. This is not backend selection, not production proof format evidence, not production verifying-key evidence, not on-chain verifier execution, not live deployment evidence, not audit acceptance, and not real-funds readiness.

**Codex status, 2026-05-13 C01 local proof-format observation:** locally added `ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json` and `npm run zk:c01-local-proof-format-evidence-check`. The guard self-generates the actual-private-spend local proof with `npm run private-pool-v2:actual-private-spend-prove`, verifies the generated receipt shape, and records that the current `vanta_private_pool_v2_actual_private_spend_entry` proof is `noir-bb` / `barretenberg-ultrahonk`, `local-bb-fixture-artifact`, 16000 bytes / 500 fields, one `private-spend-public-input-hash`, `local-acir-bytecode-hash-not-production-vk`, and `offchain-remote-proof-artifact-only`. It also records the mismatch with the reserved Solana tag `3` target, which still expects `groth16`, 256 proof bytes, and `production-verifying-key-hash` evidence for `solana-c01-tag3-groth16-v0`. The C01 candidate packet now references this as intermediate evidence while keeping `selectedBackend: null`, all readiness booleans false, all required positive evidence entries blocked, and all `currentArtifactRef` fields null. Guard wiring: `npm run zk:c01-local-proof-format-evidence-check` is included in `npm run zk:review-guards-check`, `npm run zk:feedback-loop-check`, and therefore `npm run private-pool-v2:verify`. This is local proof-format observation only; it is not backend selection, not production proof-format acceptance, not production verifying-key evidence, not verifier-adapter acceptance, not tag-3 proof acceptance, not on-chain proof verification, not SBF/live redeploy or reinit evidence, not audit acceptance, not production-private readiness, and not real-funds readiness. Implementation commit: `28e07f6`.

**Codex status, 2026-05-13 C01 Verifier-Key Registry Scaffold:** locally added source-only `TAG_REGISTER_VERIFIER_KEY = 5`, `ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json`, and `npm run zk:c01-verifier-key-registry-check` in implementation commit `a2fa2f4`. Tag `5` is `[5, verifierKeyHash:32]`: it rejects zero verifier-key hashes, requires the initialized operator authority, verifies the `["vanta2vkey", pool_state, verifierKeyHash]` PDA, and creates or idempotently verifies a program-owned `VNTA2VKY` record containing the pool and verifier-key hash. Reserved tag `3` now has a real source instruction for the verifier-key account it preflights, but tag `3` still returns `ERR_PROOF_VERIFIER_NOT_WIRED` before proof verification, account creation, nullifier/output mutation, or spend acceptance. The C01 candidate packet references this registry scaffold as intermediate evidence while keeping `production-verifying-key-hash` blocked with `currentArtifactRef: null`. Guards: `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`; `npm run zk:c01-verifier-key-registry-check`; `npm run zk:c01-production-verifier-backend-candidate-check`. This is a source-only verifier-key registry scaffold, not backend selection, not production verifying-key evidence, not verifier-adapter acceptance, not tag-3 proof acceptance, not on-chain proof verification, not SBF/live redeploy or reinit evidence, not audit acceptance, not production-private readiness, and not real-funds readiness.

**Codex status, 2026-05-13 C01 Crucible harness hardening:** locally committed `4e640b1`, which keeps the source program unchanged and strengthens the defensive harness plus guards. `fuzz/vanta_private_pool_v2_spend/src/main.rs` now models legacy `TAG_REGISTER_ROOT = 2` roots separately from tag `4` root-record provenance, asserts legacy roots never acquire `VNTA2RRC` root-record metadata, exercises tag `5` verifier-key registration/idempotent replay/wrong-PDA rejection, forces provenanced roots for later verifier/nullifier/vault preflight checks, checks wrong root-record PDA rejection for reserved tag `3` and tag `6`, checks legacy tag `2` roots fail before proof-verifier or Unshield-release not-wired paths, and checks duplicate-nullifier Unshield rejection. Guard scripts now require these harness markers through `npm run zk:c01-verifier-key-registry-check`, `npm run private-pool-v2:root-provenance-check`, and `npm run private-pool-v2:contract-check`. Verification passed locally with `cargo check --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml --features invariant_test`, `npm run private-pool-v2:crucible-check`, `npm run zk:review-guards-check`, `npm run zk:feedback-loop-check`, and full `npm run private-pool-v2:verify`. This is local invariant-harness coverage only; it is not proof acceptance, not on-chain proof verification, not production verifying-key evidence, not proof that a root transition is correct, not exhaustive live fuzz evidence, not redeployed/reinitialized SBF evidence, not audit acceptance, not production-private readiness, and not real-funds readiness.

**Codex status, 2026-05-13 C01 Backend Options Matrix:** locally added `ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json` and `npm run zk:c01-verifier-backend-options-check` in implementation commit `1153f4e`. The packet records two blocked paths: `groth16-tag3-solana-v0`, which preserves the current tag `3` Groth16-shaped contract and requires production proof-format, production verifying-key hash, verifier adapter/CPI, valid-proof mutation, invalid-proof no-mutation, live SBF lineage, and audit/reviewer evidence; and `noir-bb-ultrahonk-adaptation`, which requires a new verifier target or production service boundary, production VK evidence that is not local ACIR metadata, a proof byte/service contract, public-input binding, acceptance/rejection evidence, live lineage, and audit/reviewer evidence. The C01 candidate packet now references this as blocked intermediate evidence while keeping `selectedBackend: null` and all positive evidence `currentArtifactRef` values null. Guards: `npm run zk:c01-verifier-backend-options-check`; `npm run zk:c01-production-verifier-backend-candidate-check`; `npm run zk:c01-verifier-backend-decision-check`. This matrix does not select a backend, does not satisfy production proof-format evidence, production verifying-key evidence, verifier-adapter acceptance, tag-3 proof acceptance, on-chain verification, live SBF redeploy/reinit evidence, audit acceptance, production-private readiness, or real-funds readiness.

**Codex status, 2026-05-13 C01 Groth16 Proof-Format Candidate:** locally added `ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json` and `npm run zk:c01-groth16-proof-format-candidate-check` in implementation commit `faead7b`. The packet records `blocked-no-groth16-production-proof-format-artifact` for `groth16-tag3-solana-v0`; the required candidate shape is actual-private-spend, tag `3`, target `solana-c01-tag3-groth16-v0`, `proofSystem: "groth16"`, `groth16Proof:256`, `private-spend-public-input-hash`, and `production-verifying-key-hash`. The current artifact is absent, and the current local observation remains `noir-bb` / `barretenberg-ultrahonk` / 16000 bytes / 500 fields / `local-acir-bytecode-hash-not-production-vk`. The C01 candidate and backend-options packets now reference this as blocked intermediate evidence while keeping `selectedBackend: null`, all readiness booleans false, and all positive evidence unsatisfied. Guard wiring: `npm run zk:c01-groth16-proof-format-candidate-check` is included in `npm run zk:review-guards-check`, `npm run zk:feedback-loop-check`, and `npm run private-pool-v2:verify`. This is not backend selection, not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not tag-3 proof acceptance, not on-chain proof verification, not SBF/live redeploy or reinit evidence, not audit acceptance, not production-private readiness, and not real-funds readiness.

**Codex status, 2026-05-13 C01 Production Verifying-Key Candidate:** locally added `ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json` and `npm run zk:c01-production-verifying-key-candidate-check` in implementation commit `c82b23d`. The packet records `blocked-no-production-verifying-key-hash-artifact` for `groth16-tag3-solana-v0`; the required shape is actual-private-spend, tag `3`, target `solana-c01-tag3-groth16-v0`, `proofSystem: "groth16"`, `groth16Proof:256`, `private-spend-public-input-hash`, and `verifyingKeyHashKind: "production-verifying-key-hash"`. The current production verifying-key artifact is absent, tag `5` registry metadata remains source-only at `["vanta2vkey", pool_state, verifierKeyHash]`, and the current local observation remains `local-acir-bytecode-hash-not-production-vk`. The guard is schema-closed for the packet, rejects proof/VK/witness byte-bearing fields, and keeps `production-verifying-key-hash` positive evidence at `currentArtifactRef: null`; the C01 candidate, backend-options, Groth16 proof-format, audit package, and operator runbook now reference it as blocked intermediate evidence. This is not backend selection, not production verifying-key evidence, not production proof-format evidence, not verifier-adapter acceptance, not tag-3 proof acceptance, not on-chain proof verification, not SBF/live redeploy or reinit evidence, not audit acceptance, not production-private readiness, and not real-funds readiness.

**Codex status, 2026-05-13 C01 Verifier Adapter Acceptance-Test Candidate:** locally added `ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json` and `npm run zk:c01-verifier-adapter-test-candidate-check` in implementation commit `c0831fe`. The packet records `blocked-no-verifier-adapter-acceptance-tests` for `groth16-tag3-solana-v0`; the required shape is actual-private-spend, tag `3`, target `solana-c01-tag3-groth16-v0`, `proofSystem: "groth16"`, `groth16Proof:256`, one `private-spend-public-input-hash`, `production-verifying-key-hash`, and an in-program verifier or dedicated verifier CPI adapter. Current adapter artifact refs are null, and the packet records absent evidence for private-spend public-input hash binding, valid-proof mutation, invalid-proof no-mutation, wrong-public-input-hash no-mutation, and wrong-verifying-key no-mutation. The C01 candidate and backend-options packets reference it as blocked intermediate evidence while keeping `selectedBackend: null`, all readiness booleans false, and all required positive evidence refs null. Guard wiring: `npm run zk:c01-verifier-adapter-test-candidate-check` is included in `npm run zk:review-guards-check` and `npm run zk:feedback-loop-check`, and the active finding ledger now pins this as `VANTA-ZK-FEEDBACK-2026-05-13-C01-VERIFIER-ADAPTER-TEST-CANDIDATE`. This is blocked feasibility evidence only; it is not backend selection, not verifier-adapter acceptance, not proof acceptance, not production proof-format evidence, not production verifying-key evidence, not tag-3 proof acceptance, not on-chain proof verification, not SBF/live redeploy or reinit evidence, not audit acceptance, not production-private readiness, and not real-funds readiness.

This is now **the single highest-leverage remaining technical lift.** Closing the verifier slice would close the C01 proof-enforcement gap, but Target A still also needs program-owned tree/vault state, rebuilt SBF/live evidence, audit acceptance, and deployed service evidence.

**Codex status, 2026-05-12 reserved proof-carrying/root-provenance ABI:** partially remediated locally for fail-closed verifier-boundary shape and source-only root provenance. `programs/vanta_private_pool_v2_spend/src/lib.rs` reserves tag `3` with an exact 449-byte payload that carries the existing spend transcript plus `verifierKeyHash` and a 256-byte Groth16-proof placeholder, rejects malformed/all-zero public transcript or verifier placeholders, preflights pool/nullifier-set/output-index/root-history/root-record/nullifier-marker/output-record accounts plus a read-only verifier-key PDA derived from `["vanta2vkey", pool_state, verifierKeyHash]`, and returns custom error `14` before proof verification, account creation, nullifier/output mutation, or spend acceptance. The same source reserves `TAG_REGISTER_PROVENANCED_ROOT = 4`, which creates a lineage-bound program-owned root provenance record from `["vanta2root", pool_state, acceptedRoot]`; reserved tag `3` and tag `6` require that record before failing closed, while legacy tag `2` roots remain outside that provenance lane unless migrated/reinitialized. The SBF ABI status surface reports this as `proofCarryingSpendReserved: true`, `rootRecordProvenanceReserved: true`, and `proofCarryingSpendStatus: "fail-closed-verifier-key-preflight-source-only"`, while the current transaction builder still requires tag `1` and 161-byte spend instruction data. `npm run zk:c01-verifier-backend-contract-check` keeps the Groth16-compatible verifier target, local bb.js/UltraHonk fixture boundary, and production verifying-key hash requirement distinct. This is not a verifier, not proof acceptance, not proof that the root transition is correct, not a program-owned shared tree, not deployed/live SBF program evidence, not audit acceptance, and not Target A.

**Codex status, 2026-05-14 tag-3 output-capacity preflight:** locally committed `7524a9c` to make reserved tag `3` reject a full output counter before the output-record PDA preflight. `process_spend_with_proof` now returns custom error `3` when `output_count == u32::MAX`, matching the existing tag `1` capacity boundary and preserving no-mutation behavior. The focused Rust test was red first while tag `3` still reached `ERR_PROOF_VERIFIER_NOT_WIRED`; it now passes with full-program Rust tests, C01 boundary/contract guards, fresh SBF ABI, Solana transaction guards, Crucible dry-run, and build. This is defensive preflight hardening only; it is not backend selection, not a production proof format, not production verifying-key evidence, not verifier-adapter acceptance, not tag-3 proof acceptance, not on-chain proof verification, not deployed/live SBF evidence, not audit acceptance, and not production-private readiness.

**Codex status, 2026-05-14 tag-3 duplicate-nullifier preflight:** locally committed `851d956` to give reserved tag `3` a focused duplicate-nullifier no-mutation test. `proof_carrying_spend_rejects_duplicate_nullifier_before_fail_closed_verifier` now preloads a consumed program-owned nullifier-marker and proves `process_spend_with_proof` returns `ERR_DUPLICATE_NULLIFIER` before the reserved proof-verifier-not-wired boundary while preserving pool, nullifier-set, output-index, root-history, root-record, marker, output-record, verifier-key bytes, and lamports. C01 boundary and private-pool contract guards require the focused test name and duplicate-nullifier assertion. This is defensive preflight coverage only; it is not backend selection, not a production proof format, not production verifying-key evidence, not verifier-adapter acceptance, not tag-3 proof acceptance, not on-chain proof verification, not deployed/live SBF evidence, not audit acceptance, and not production-private readiness.

### Still open #2 — Replace the mock prover with bb.js

`src/privacy/privatePoolV2LocalProver.ts` still returns `proofSystem: "mock"` and a SHA-256 of the request bytes. With the circuits now correctly shaped, this is the visible gap between "the circuit enforces value conservation" and "any proof of value conservation has actually been checked."

Recommendation unchanged from shield W7 at the prover level: wire `@aztec/bb.js` (or snarkjs for Groth16) as the real prover and generate witnesses from the canonical-note types already in `vantaPrivateCoreSendProof.ts`. The on-chain handoff should be treated as a new proof-carrying verifier ABI/instruction, not as proof bytes smuggled into the current 161-byte spend payload. Effort: 1-2 weeks of focused browser-perf work, depends on Web Worker plumbing.

**Codex status, 2026-05-12:** partially remediated locally at the fixture-artifact boundary for the exact Private Pool v2 circuit the on-chain spend program eventually needs to verify. `scripts/prove-vanta-private-pool-v2-circuit.mjs actual-private-spend` emits a no-witness `local-bb-fixture-artifact` with `private-spend-public-input-hash`; `operator/private-pool-v2-proof-artifact.mjs` verifies both Send and actual-private-spend artifacts by recompiling the matching Noir circuit with bb.js/UltraHonk; and `npm run private-pool-v2:actual-private-spend-proof-artifact-consistency-check` rejects tampered proof bytes, public inputs, verifying-key/ACIR metadata drift, relabelled backends, extra public inputs, and witness/private-input aliases. Residual caveat: this is still local fixture evidence, not the browser/runtime prover, not the remote service proof boundary, not an on-chain Groth16 verifier, and not production real-funds proof acceptance.

**Codex status, 2026-05-12 local witness input:** partially remediated locally beyond exact fixture replay for actual-private-spend. `src/privacy/privatePoolV2ActualPrivateSpendCircuitFixture.ts` now exposes a strict witness-input builder that requires canonical decimal BN254 fields, depth-20 membership paths, boolean direction bits, a derived leaf index, recomputed root/nullifier, unique outputs, and a derived `private-spend-public-input-hash`; `scripts/prove-vanta-private-pool-v2-circuit.mjs actual-private-spend --witness-json <path>` can prove that derived request with bb.js/UltraHonk and emit a no-witness `local-bb-derived-artifact`. Guard: `npm run private-pool-v2:actual-private-spend-witness-prover-check`, wired into local prover/verifier and Private Pool v2 verification lanes. Residual caveat: this is still a local Node proof path and artifact adapter, not browser/Web Worker prover plumbing, not remote-service production proof acceptance, not an on-chain verifier, not a production verifying-key registry, and not live-funds readiness.

**Codex status, 2026-05-12 Send witness input:** partially remediated locally beyond exact fixture replay for Send. `src/privacy/privatePoolV2SendCircuitFixture.ts` now exposes a strict witness-input builder that requires canonical decimal BN254 fields, depth-20 input/recipient/change paths, boolean direction bits, derived input/recipient/change leaf indices, recomputed input/recipient/change roots, nullifier, amount-conservation/economics commitment, memo ciphertext body-hash fields, unique outputs, and a derived `send-public-input-hash`; `scripts/prove-vanta-private-pool-v2-circuit.mjs send --witness-json <path>` can prove that derived request with bb.js/UltraHonk and emit a no-witness `local-bb-derived-artifact`. Guard: `npm run private-pool-v2:send-witness-prover-check`, wired into `send:verify`, local prover/verifier, and Private Pool v2 verification lanes. Residual caveat: this is still a local Node proof path and artifact adapter, not browser/Web Worker prover plumbing, not remote-service production proof acceptance, not an on-chain verifier, not a production verifying-key registry, and not live-funds readiness.

**Codex status, 2026-05-12 operator request binding:** partially remediated locally at the operator no-witness route. `/private-pool-v2/proof-artifacts/verify` now dispatches by proof-artifact circuit, verifies actual-private-spend artifacts with the same bb.js/UltraHonk local verifier, and accepts them only when `expectedPublicInputs.privateSpendPublicInputHash` matches the verified `private-spend-public-input-hash`. Send artifacts now match that stricter shape: missing `expectedPublicInputs.sendPublicInputHash` rejects, matching hashes accept, mismatches reject, and Send artifacts still cannot satisfy actual-private-spend expected inputs. All operator artifact branches now reject unbound extra `expectedPublicInputs` keys such as `unshieldPublicInputHash`. The artifact consistency guards now directly reject circuit, proof-system, backend, and public-input-label relabeling for both Send and actual-private-spend, and `private-pool-v2:local-verifier-check` includes the H08 proof-artifact/no-witness checks. Guards: `npm run private-pool-v2:local-verifier-check`, `npm run private-pool-v2:send-proof-artifact-consistency-check`, `npm run private-pool-v2:actual-private-spend-proof-artifact-consistency-check`, `npm run private-pool-v2:send-operator-no-witness-check`, `npm run private-pool-v2:actual-private-spend-operator-no-witness-check`, and `npm run private-pool-v2:proof-backend-boundary-check`. Residual caveat: this binds local operator evidence to the request shape; it is not browser/runtime prover wiring, not remote-service production proof acceptance, not an on-chain verifier, not a production verifying-key registry, and not live-funds readiness.

**Codex status, 2026-05-12 Shield artifact lane:** partially remediated locally for the Private Pool v2 Shield fixture-artifact boundary and read-only operator request binding. `scripts/prove-vanta-private-pool-v2-circuit.mjs shield` now emits a no-witness `local-bb-fixture-artifact` labeled `shield-public-input-hash`; `operator/private-pool-v2-proof-artifact.mjs` exports a Shield verifier that recompiles `vanta_private_pool_v2_shield_entry` and returns `verifiedPublicInputs.shieldPublicInputHash`; and `npm run private-pool-v2:shield-proof-artifact-consistency-check` mirrors the Send/actual-private tamper matrix for proof bytes, public inputs, circuit/proof-system/backend/label relabeling, VK/ACIR metadata drift, extra public inputs, malformed proof hex, and witness/private-input aliases. The operator no-witness route now also accepts Shield artifacts only when `expectedPublicInputs.shieldPublicInputHash` matches the verified `shield-public-input-hash`, rejects Claim/Send/Swap-to-shielded/actual-private expected-input mixups, rejects unbound extra expected-input keys such as `unshieldPublicInputHash`, rejects wrong-lane artifacts presented as Shield evidence, rejects relabelled artifacts, verifies the route leaves receipt/settlement counts unchanged, and still rejects local fixture artifacts in production proof mode. The Shield artifact and operator guards are now included in `shield:verify`, `private-pool-v2:local-verifier-check`, and `private-pool-v2:verify`; after the active-release Solana rebuild, the full Private Pool v2 verify path passes locally through the fresh SBF ABI and Crucible dry-run gates. Residual caveat: Shield is local no-witness fixture evidence and read-only local operator request binding only. It is not Shield settlement acceptance, not browser/runtime prover wiring, not remote-service production proof acceptance, not on-chain proof verification, not a production verifying-key registry, and not live-funds readiness.

**Codex status, 2026-05-12 Claim artifact lane:** partially remediated locally for the Private Pool v2 Claim fixture-artifact boundary. `scripts/prove-vanta-private-pool-v2-circuit.mjs claim` now emits a no-witness `local-bb-fixture-artifact` labeled `claim-public-input-hash`; `operator/private-pool-v2-proof-artifact.mjs` exports a Claim verifier that recompiles `vanta_private_pool_v2_claim_entry` and returns `verifiedPublicInputs.claimPublicInputHash`; and `npm run private-pool-v2:claim-proof-artifact-consistency-check` mirrors the Shield/Send/actual-private tamper matrix for proof bytes, public inputs, circuit/proof-system/backend/label relabeling, VK/ACIR metadata drift, extra public inputs, malformed proof hex, and witness/private-input aliases. The operator no-witness route now also accepts Claim artifacts only when `expectedPublicInputs.claimPublicInputHash` matches the verified `claim-public-input-hash`, rejects Send/actual-private expected-input mixups, rejects unbound extra expected-input keys, rejects Send/actual-private artifacts presented as Claim evidence, and still rejects local fixture artifacts in production proof mode. The Claim artifact and operator guards are now included in `private-pool-v2:local-verifier-check` and `private-pool-v2:verify`. Guards run locally for this slice: `npm run private-pool-v2:claim-proof-artifact-consistency-check`, `npm run private-pool-v2:claim-operator-no-witness-check`, `npm run private-pool-v2:claim-proof-request-check`, `npm run private-pool-v2:public-input-hash-alignment-check`, `npm run private-pool-v2:claim-circuit-check`, `npm run private-pool-v2:claim-prove`, `npm run private-pool-v2:proof-backend-boundary-check`, `npm run private-pool-v2:contract-check`, and `npm run private-pool-v2:local-verifier-check`. Residual caveat: Claim is local no-witness fixture evidence and local operator request binding only. It is not browser/runtime prover wiring, not remote-service production proof acceptance, not on-chain proof verification, not a production verifying-key registry, and not live-funds readiness.

**Codex status, 2026-05-12 Swap-to-shielded artifact lane:** partially remediated locally for the Private Pool v2 Swap-to-shielded fixture-artifact boundary. `scripts/prove-vanta-private-pool-v2-circuit.mjs swap-to-shielded` now emits a no-witness `local-bb-fixture-artifact` labeled `swap-public-input-hash`; `operator/private-pool-v2-proof-artifact.mjs` exports a Swap-to-shielded verifier that recompiles `vanta_private_pool_v2_swap_to_shielded_entry` and returns `verifiedPublicInputs.swapPublicInputHash`; and `npm run private-pool-v2:swap-to-shielded-proof-artifact-consistency-check` mirrors the Shield/Claim/Send/actual-private tamper matrix for proof bytes, public inputs, circuit/proof-system/backend/label relabeling, VK/ACIR metadata drift, extra public inputs, malformed proof hex, and witness/private-input aliases. The operator no-witness route accepts Swap-to-shielded artifacts only when `expectedPublicInputs.swapPublicInputHash` matches the verified `swap-public-input-hash`, rejects Claim/Send/actual-private expected-input mixups, rejects unbound extra expected-input keys, rejects Claim/Send/actual-private artifacts presented as Swap evidence, rejects relabelled artifacts, and still rejects local fixture artifacts in production proof mode. The Swap-to-shielded artifact and operator guards are now included in `private-pool-v2:local-verifier-check` and `private-pool-v2:verify`. Guards run locally for this slice: `npm run private-pool-v2:swap-to-shielded-proof-artifact-consistency-check`, `npm run private-pool-v2:swap-to-shielded-operator-no-witness-check`, `npm run private-pool-v2:proof-backend-boundary-check`, and `npm run private-pool-v2:contract-check`. Residual caveat: Swap-to-shielded is local no-witness fixture evidence and local operator request binding only. It is not browser/runtime prover wiring, not remote-service production proof acceptance, not on-chain proof verification, not a production verifying-key registry, not audit acceptance, and not live-funds readiness.

**Codex status, 2026-05-12 remote proof-artifact transcript binding:** partially remediated locally for the production-mode proof-artifact verifier-handoff guard. In production proof mode, `/private-pool-v2/proof-artifacts/verify` rejects local fixture artifacts unless `proofBackend=remote-service`, rejects relabelled local fixture metadata such as local verifying-key hash kinds and `local-acir-bytecode:` verifying-key ids before the remote call, delegates remote-service artifacts to `runtime.verifierRegistry.verifyProofArtifact`, and reuses the same expected-public-input binding on the returned verified receipt. `src/privacy/privatePoolV2RemoteServices.ts` now rejects mock proof systems, non-remote proof backends, non-production verifying-key hash kinds, local fixture key ids, witness material, and any C01 verifier-ready overclaim, then requires the remote verifier receipt transcript to match the submitted artifact across ACIR bytecode hash, circuit, backend, proof runtime package/version, proof system/backend, proof hex, public input commitment, public input labels, public inputs, verifying-key hash kind, verifying-key hash, and verifying-key id. Accepted remote-service artifact receipts are explicitly `offchain-remote-proof-artifact-only`; Solana tag `3` Groth16 verifier-ready evidence requires a separate `solana-c01-groth16-verifier-ready` candidate lane and currently fails closed. `npm run private-pool-v2:remote-proof-artifact-boundary-check` proves, in a local harness, that a remote Shield artifact can be verified by a configured verifier service, local and relabelled-local artifacts fail closed before delegation, remote receipt transcript drift fails closed, mock remote proof-system responses reject, local verifying-key responses reject, C01-ready request/receipt overclaims reject, witness aliases reject, and the route appends no verifier receipts, protocol settlements, Pay settlements, or shadow commitments. The guard is wired into `private-pool-v2:verify`, `private-pool-v2:proof-backend-boundary-check`, `private-pool-v2:contract-check`, and `npm run zk:c01-production-verifier-backend-candidate-check`. A full `npm run private-pool-v2:verify` now passes locally after the active-release Solana rebuild, including fresh SBF ABI, service-network, transaction, Crucible dry-run, HTTP, restart, security limitations, operator runbook, and build gates. Residual caveat: this is local verifier-handoff hardening, not a deployed remote verifier, not browser/runtime prover wiring, not on-chain proof verification, not a production verifying-key registry audit, not live settlement evidence, and not real-funds ZK readiness.

**Codex status, 2026-05-13 local bb artifact proof-result adapter lane completeness:** partially remediated locally for opt-in Shield, Claim, Swap-to-shielded, actual-private-spend, and Send runtime evidence lanes. `src/privacy/privatePoolV2LocalProver.ts` now exports `createVantaPrivatePoolV2LocalBbFixtureProver`, which can replay a verified local `local-bb-fixture-artifact` plus the exact fixture proof-request transcript for Shield, Claim, Swap-to-shielded, actual-private-spend, or Send into a `VantaPrivatePoolV2ProofResult` with `proofSystem: "noir-bb"` and `proofBackend: "local-bb-fixture-artifact"`; for Claim, actual-private-spend, and Send, it can also replay matching no-witness `local-bb-derived-artifact` evidence from strict dev-only proof paths. The adapter binds `shield-public-input-hash`, `claim-public-input-hash`, `swap-public-input-hash`, `private-spend-public-input-hash`, or `send-public-input-hash`, rejects missing/duplicated circuit public inputs, transition-field drift across each supported lane, request-metadata drift in the fixture transcript, cross-target artifacts, relabelled artifact circuit/backend/proof-system/public-input metadata, malformed local ACIR key metadata, disabled mode, unsupported runtime targets, and tampered proof-result verification. The focused guard also proves local verifier-registry receipt acceptance for Shield, Claim, and Swap-to-shielded fixture proofs, Shield appended-root mismatch rejection, replay rejection, and the default `createVantaPrivatePoolV2LocalProver` `mock` / `local-mock` boundary for every fixture lane. Guard: `npm run private-pool-v2:local-bb-fixture-prover-check`, with sibling coverage from the Shield/Claim/Swap artifact and operator no-witness guards, `private-pool-v2:local-prover-check`, `private-pool-v2:local-verifier-check`, and `npm run build`. Implementation commits: `308a1a8` and `84b8593`; Claim derived browser-worker evidence is tracked by commit `804be13`. Residual caveat: this is local no-real-funds proof generation and artifact replay for verifier receipt testing. It is not live routing, not production browser/Web Worker prover plumbing, not a remote proof service, not on-chain proof verification, not a production verifying-key registry, not audit acceptance, not live deployment evidence, and not real-funds readiness.

**Codex status, 2026-05-13 browser worker witness plumbing:** partially remediated locally for dev-only Send browser/Web Worker proof execution and worker-side witness generation. `src/privacy/privatePoolV2BrowserProverWorker.ts` exports a worker-safe `proveVantaPrivatePoolV2SendInBrowserWorker` path that accepts caller-provided compiled ACIR bytecode plus either compressed witness bytes or typed Send witness input, normalizes witness input through `createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput`, generates the compressed witness with NoirJS, runs `@aztec/bb.js` / `UltraHonkBackend` with `threads: 1`, verifies the generated proof, binds the expected `send-public-input-hash`, and returns a no-witness `local-bb-derived-artifact` with `local-acir-bytecode-hash-not-production-vk` metadata. `src/privacy/privatePoolV2BrowserProverClient.ts` constructs the worker with Vite's module-worker URL pattern without importing the heavy worker into the main bundle, copies compressed witness buffers before transfer, structured-clones typed witness input plus ABI without transfer buffers, and terminates/clears timers if `postMessage` throws. `npm run private-pool-v2:browser-worker-prover-check` compiles the protocol/client/worker/fixture helpers with DOM/WebWorker libs, proves both the compressed-witness and witness-input paths, verifies both artifacts through the Send proof-artifact verifier, asserts no witness leakage, checks fake-worker client transfer behavior, and checks worker-scope witness-input error sanitization. The default local prover still returns `mock` / `local-mock`, and `private-pool-v2:proof-backend-boundary-check` plus `private-pool-v2:local-prover-check` include this browser-worker guard. Residual caveat: this is not routed live Send execution, not a production browser runtime prover, not a production remote proof service, not an on-chain Groth16 verifier, not a production verifying-key registry, not audit acceptance, not live deployment evidence, and not real-funds readiness. Implementation commit: `1611ad4`.

**Codex status, 2026-05-13 actual-private-spend browser worker parity:** partially remediated locally for dev-only actual-private-spend browser/Web Worker proof execution and worker-side witness generation. `src/privacy/privatePoolV2BrowserProverProtocol.ts`, `src/privacy/privatePoolV2BrowserProverWorker.ts`, and `src/privacy/privatePoolV2BrowserProverClient.ts` now carry an actual-private-spend message/payload/client path beside Send. The worker accepts caller-provided compiled ACIR bytecode plus either compressed witness bytes or typed actual-private-spend witness input, normalizes witness input through `createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput`, derives NoirJS inputs with `createVantaPrivatePoolV2ActualPrivateSpendCircuitNoirInputs`, generates the compressed witness inside the worker, runs `@aztec/bb.js` / `UltraHonkBackend` with `threads: 1`, verifies the generated proof, binds the expected `private-spend-public-input-hash`, and returns a no-witness `local-bb-derived-artifact` with `local-acir-bytecode-hash-not-production-vk` metadata. `npm run private-pool-v2:actual-private-spend-browser-worker-prover-check` compiles the protocol/client/worker/fixture helpers with DOM/WebWorker libs, proves compressed-witness and witness-input paths, verifies both artifacts through the actual-private-spend proof-artifact verifier, checks no-witness leakage, checks client buffer transfer/structured-clone/timeout cleanup, checks `postMessage` failure cleanup, and checks worker-scope witness-input error sanitization. `private-pool-v2:proof-backend-boundary-check` and `private-pool-v2:local-prover-check` now include the actual-private-spend browser worker guard, while `private-pool-v2:verify` reaches it through the proof-backend boundary. Follow-up commit `21dd00d` updates `SECURITY_LIMITATIONS.md`, `README.md`, `npm run security:limitations-check`, and `npm run docs:source-of-truth-check` so source-of-truth docs cannot describe browser-worker evidence as Send-only. Residual caveat: this is not routed live actual-private-spend execution, not a production browser runtime prover, not a production remote proof service, not an on-chain Groth16 verifier, not production verifying-key evidence, not audit acceptance, not live deployment evidence, and not real-funds readiness. Implementation commits: `374dc21` and `21dd00d`.

**Codex status, 2026-05-13 browser-worker proof-result adapter:** partially remediated locally for the typed local prover interface around the initial Send and actual-private-spend browser worker artifacts. `src/privacy/privatePoolV2BrowserWorkerProofResultAdapter.ts` exported an opt-in browser-worker proof-result adapter implementing `VantaPrivatePoolV2Prover`: it delegated to `createVantaPrivatePoolV2BrowserProverClient`, supported `send` and `actual-private-spend`, injected the expected `send-public-input-hash` or `private-spend-public-input-hash` into the worker payload, rejected request transcript drift before invoking the worker client, required returned artifacts to be `noir-bb` / `local-bb-derived-artifact`, and then reused `createVantaPrivatePoolV2LocalBbFixtureProver` to convert the artifact into a `VantaPrivatePoolV2ProofResult` only when the bound proof request and artifact transcript matched. `npm run private-pool-v2:browser-worker-proof-result-adapter-check` compiled the adapter with DOM/WebWorker libs, used injected worker clients for Send and actual-private-spend, proved default `createVantaPrivatePoolV2LocalProver()` still returned `mock` / `local-mock`, and rejected unsupported targets, public-input mismatch, fixture-artifact returns, cross-target artifacts, pre-worker request drift, disabled mode, tampered proof results, and worker error messages that contain `owner_secret` or `note_secret`. Shield adapter parity is covered by the 2026-05-14 Shield browser worker status below. `private-pool-v2:proof-backend-boundary-check`, `private-pool-v2:local-prover-check`, and `private-pool-v2:contract-check` guard the adapter. Residual caveat: this is an opt-in dev-only bridge for local no-real-funds worker artifacts. It is not live Shield routing, not live Send routing, not routed live actual-private-spend execution, not a production browser runtime prover, not a production remote proof service, not on-chain proof verification, not production verifying-key evidence, not audit acceptance, not live deployment evidence, and not real-funds readiness. Implementation commit: `1ca9bfa`.

**Codex status, 2026-05-14 Shield browser worker parity:** partially remediated locally for dev-only Shield browser/Web Worker proof execution and worker-side witness generation. `src/privacy/privatePoolV2BrowserProverProtocol.ts`, `src/privacy/privatePoolV2BrowserProverWorker.ts`, and `src/privacy/privatePoolV2BrowserProverClient.ts` now carry a Shield message/payload/client path beside Send and actual-private-spend. The worker accepts caller-provided compiled ACIR bytecode plus either compressed witness bytes or typed Shield witness input, normalizes witness input through `createVantaPrivatePoolV2ShieldCircuitFixtureFromWitnessInput`, derives NoirJS inputs with `createVantaPrivatePoolV2ShieldCircuitNoirInputs`, generates the compressed witness inside the worker, runs `@aztec/bb.js` / `UltraHonkBackend` with `threads: 1`, verifies the generated proof, binds the expected `shield-public-input-hash`, and returns a no-witness `local-bb-derived-artifact` with `local-acir-bytecode-hash-not-production-vk` metadata. `src/privacy/privatePoolV2BrowserWorkerProofResultAdapter.ts` now supports Shield as an opt-in adapter target while preserving exact request-transcript binding, `local-bb-derived-artifact` enforcement, and the default `mock` / `local-mock` prover boundary. `npm run private-pool-v2:shield-browser-worker-prover-check` compiles the protocol/client/worker/fixture helpers with DOM/WebWorker libs, proves compressed-witness and typed-witness paths, verifies both artifacts through the Shield proof-artifact verifier, checks no-witness leakage, checks client buffer transfer/structured-clone/timeout cleanup, checks `postMessage` failure cleanup, and checks worker-scope witness-input error sanitization. H08 production-prover candidate and runtime-options packets now record current browser-worker coverage as Shield, Send, and actual-private-spend while keeping `selectedProverRuntime: null`, production browser readiness false, live route wiring absent, C01 verifier compatibility blocked, and audit/reviewer acceptance absent. Implementation commit: `96b7008`. Residual caveat: this is not live Shield routing, not a production browser runtime prover, not a production remote proof service, not on-chain proof verification, not production verifying-key evidence, not audit acceptance, not live deployment evidence, and not real-funds readiness.

**Codex status, 2026-05-14 Claim browser worker parity:** partially remediated locally for dev-only Claim browser/Web Worker proof execution and worker-side witness generation. `src/privacy/privatePoolV2ClaimCircuitFixture.ts` now exposes typed Claim witness input normalization that requires canonical decimal BN254 fields, u128 `amount` and `relayer_fee`, depth-20 membership paths, boolean direction bits, derived leaf index, recomputed input root, recomputed nullifier, and a bound `claim-public-input-hash`. `src/privacy/privatePoolV2BrowserProverProtocol.ts`, `src/privacy/privatePoolV2BrowserProverWorker.ts`, and `src/privacy/privatePoolV2BrowserProverClient.ts` now carry a Claim message/payload/client path beside Shield, Send, and actual-private-spend. The worker accepts caller-provided compiled ACIR bytecode plus either compressed witness bytes or typed Claim witness input, derives NoirJS inputs inside the worker, runs `@aztec/bb.js` / `UltraHonkBackend` with `threads: 1`, verifies the generated proof, binds the expected `claim-public-input-hash`, and returns a no-witness `local-bb-derived-artifact`. `src/privacy/privatePoolV2BrowserWorkerProofResultAdapter.ts` now supports Claim as an opt-in adapter target while preserving exact request-transcript binding, `local-bb-derived-artifact` enforcement, and the default `mock` / `local-mock` prover boundary. `npm run private-pool-v2:claim-browser-worker-prover-check` proves compressed-witness and typed-witness Claim paths, verifies both artifacts through the Claim proof-artifact verifier, checks no-witness leakage, checks client transfer/structured-clone cleanup, checks `postMessage` failure cleanup, and checks worker-scope witness-input error sanitization. H08 production-prover candidate and runtime-options packets now record current browser-worker coverage as Shield, Claim, Send, and actual-private-spend while keeping `selectedProverRuntime: null`, production browser readiness false, live route wiring absent, C01 verifier compatibility blocked, and audit/reviewer acceptance absent. Implementation commit: `804be13`. Residual caveat: this is not live Claim routing, not a production browser runtime prover, not a production remote proof service, not on-chain proof verification, not production verifying-key evidence, not audit acceptance, not live deployment evidence, and not real-funds readiness.

**Codex status, 2026-05-14 Swap-to-shielded browser worker parity:** partially remediated locally for dev-only Swap-to-shielded browser/Web Worker proof execution and worker-side witness generation. `src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts` now exposes typed Swap-to-shielded witness input normalization that requires canonical decimal BN254 fields, u128 input/output amounts, depth-20 membership and output append paths, boolean direction bits, derived leaf indices, recomputed input and output roots, recomputed nullifier/replay commitment, and a bound `swap-public-input-hash`. `src/privacy/privatePoolV2BrowserProverProtocol.ts`, `src/privacy/privatePoolV2BrowserProverWorker.ts`, and `src/privacy/privatePoolV2BrowserProverClient.ts` now carry a Swap-to-shielded message/payload/client path beside Shield, Claim, Send, and actual-private-spend. The worker accepts caller-provided compiled ACIR bytecode plus either compressed witness bytes or typed Swap-to-shielded witness input, derives NoirJS inputs inside the worker, runs `@aztec/bb.js` / `UltraHonkBackend` with `threads: 1`, verifies the generated proof, binds the expected `swap-public-input-hash`, and returns a no-witness `local-bb-derived-artifact`. `src/privacy/privatePoolV2BrowserWorkerProofResultAdapter.ts` now supports Swap-to-shielded as an opt-in adapter target while preserving exact request-transcript binding, `local-bb-derived-artifact` enforcement, and the default `mock` / `local-mock` prover boundary. `npm run private-pool-v2:swap-to-shielded-browser-worker-prover-check` proves compressed-witness and typed-witness Swap-to-shielded paths, verifies both artifacts through the Swap-to-shielded proof-artifact verifier, checks no-witness leakage, checks client transfer/structured-clone cleanup, checks `postMessage` failure cleanup, and checks worker-scope witness-input error sanitization. H08 production-prover candidate and runtime-options packets now record current browser-worker coverage as Shield, Claim, Swap-to-shielded, Send, and actual-private-spend while keeping `selectedProverRuntime: null`, production browser readiness false, live route wiring absent, C01 verifier compatibility blocked, and audit/reviewer acceptance absent. Implementation commit: `14e755b`. Residual caveat: this is not live Swap-to-shielded routing, not a production browser runtime prover, not a production remote proof service, not on-chain proof verification, not production verifying-key evidence, not audit acceptance, not live deployment evidence, and not real-funds readiness.

**Codex status, 2026-05-13 H08 production prover candidate packet:** locally added `ops/mainnet/private-pool-v2-h08-production-prover-candidate.evidence.json` and `npm run zk:h08-production-prover-candidate-check`. The packet records `blocked-no-production-prover-runtime-evidence`, keeps `selectedProverRuntime: null`, and keeps `mainnetReady`, `productionReady`, `privacyClaimAllowed`, `realFundsAllowed`, `h08ProductionProverReady`, `productionBrowserRuntimeProverReady`, and `productionRemoteProverReady` false. It separates current local `mock` / `local-mock`, local `noir-bb` fixture/derived artifacts, dev-only browser-worker Send/actual-private-spend proof execution, and the opt-in browser-worker proof-result adapter from the production-required shape: selected production prover runtime, production proof format, production verifying-key evidence, exact proof-request transcript binding, no-witness operator acceptance, deployed prover health, artifact-store/job-log refs, valid proof roundtrip, invalid proof rejection, live route wiring, C01 verifier compatibility, and audit/reviewer acceptance. Guard wiring: `npm run zk:h08-production-prover-candidate-check` is included in `npm run zk:review-guards-check` and `npm run zk:feedback-loop-check`. This is not production prover runtime selection, not production proof-format evidence, not production verifying-key evidence, not live route wiring, not a production browser runtime prover, not a production remote proof service, not C01 verifier compatibility, not deployed/live evidence, not audit acceptance, not production-private readiness, and not real-funds readiness.

**Codex status, 2026-05-14 H08 production prover runtime options checkpoint:** locally added `ops/mainnet/private-pool-v2-h08-production-prover-runtime-options.evidence.json` and `npm run zk:h08-production-prover-runtime-options-check` as a blocked production prover candidate packet companion. The options matrix compares `remote-service-production-prover` and `browser-worker-production-runtime`, keeps `selectedProverRuntime: null`, keeps remote/browser production readiness false, and records that C01 verifier compatibility is still blocked while C01 `selectedBackend` is null. The remote-service option still lacks deployed prover health, artifact-store refs, job-log refs, production proof-format contract, C01 verifier compatibility, and audit/reviewer acceptance. The browser-worker option now has dev-only Shield, Claim, Swap-to-shielded, Send, and actual-private-spend local coverage, but still lacks production route wiring, production browser-runtime acceptance, C01 verifier compatibility, and audit/reviewer acceptance. Guard wiring: `npm run zk:h08-production-prover-runtime-options-check` is included in `npm run zk:review-guards-check` and `npm run zk:feedback-loop-check`. This is not production prover runtime selection, not production proof-format evidence, not production verifying-key evidence, not live route wiring, not C01 verifier compatibility, not deployed/live evidence, not audit acceptance, not production-private readiness, and not real-funds readiness.

**Codex status, 2026-05-14 C01 verifier readiness boundary / H08 coupling slice:** locally committed `f0aa8a5` to harden the blocked C01/H08 handoff evidence. `ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json` now has `proofFormatVsProductionReadinessBoundary`, which references the local proof-format observation but explicitly keeps `satisfiesProductionVerifierReadiness`, `satisfiesProductionProofFormatEvidence`, and `satisfiesProductionVerifyingKeyEvidence` false. `ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json` now marks `intermediateEvidenceOnly.groth16ProofFormatCandidate: true`, and W6 now states that Groth16 + Light is a blocked option, not a selected backend. `ops/mainnet/private-pool-v2-h08-production-prover-candidate.evidence.json` now carries `c01VerifierCompatibilityRefs`, keeping H08 blocked while C01 `selectedBackend: null`, `selectedBackendStatus: "not-selected"`, `c01VerifierReady: false`, and `solanaC01Groth16VerifierReady: false`. Red-first guards failed before the evidence/docs existed, then passed locally with `npm run zk:c01-production-verifier-backend-candidate-check`, `npm run zk:c01-verifier-backend-options-check`, `npm run zk:c01-verifier-backend-decision-check`, `npm run zk:h08-production-prover-candidate-check`, `npm run zk:c01-groth16-proof-format-candidate-check`, `npm run zk:c01-production-verifying-key-candidate-check`, `npm run zk:c01-verifier-adapter-test-candidate-check`, `npm run zk:review-guards-check`, `npm run build`, and `git diff --check`. This is evidence/guard/doc hardening only; it is not backend selection, not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not H08 production prover runtime selection, not tag-3 proof acceptance, not on-chain verification, not SBF/live redeploy or reinit evidence, not audit acceptance, not production-private readiness, and not real-funds readiness.

After this and the on-chain verifier land, the system still needs program-owned tree/vault state, redeploy/reinit plus live SBF evidence, audit acceptance, and deployed service evidence before any production-private claim is safe. Everything else in this document either depends on that or is parallel polish.

### Partially remediated #3 — new live records use wallet-derived owner context, recovery evidence, and record-source import/export UX

New live Shield/Send/Swap canonical records now require an explicit wallet-derived `CanonicalNoteOwnerContext` from `useVantaShieldOwnerContext`; the bridge layer no longer generates `recoverySecret: randomHex32()`. The Shield persistence path redacts the derived recovery secret before localStorage. The current local branch also persists non-secret owner recovery evidence classification, sanitizes tainted existing evidence before reuse, propagates the evidence into lifecycle branch summaries, and exposes beta-truthful Shield/UI copy that distinguishes wallet-derived candidates from legacy local-only records. The follow-up record-source import/export UX keeps `importRequiredForCrossDevice: true` for wallet-derived candidates, exports only non-secret record references/evidence from local Shield/Send/Swap records, rejects raw owner/note/viewing material in import packets, and verifies same-wallet second-device reconstruction only when the imported record evidence matches. The latest feedback-loop slice makes the remaining legacy policy machine-readable: old random-seeded, redacted, or missing-evidence records are quarantined local-only, automatic migration is false, and import packets fail closed if they try to promote those records. This closes the new-record version of the highest-impact user-facing recovery bug and prevents ambiguous owner-hint UI from being mistaken for proven cross-device recovery.

Residual risk: old browser-local records are still not recovered; the local policy now quarantines them instead of migrating them. Viewing-key backup remains a separate memo-discovery need, nothing is pushed or live, and any real legacy recovery path would need a separate reviewed backup/source flow rather than silent promotion.

### Revalidated #4 — transition-authorized unshield path is already removed

The latest re-review claim was stale. The literal `"transition-authorized"` signature branch and browser minting path are already gone, and `scripts/check-vanta-unshield-public-exit-surface.mjs` guards against reintroducing the sentinel. `isWalletDirectUnshieldIntent` still exists, but it is now a wallet-signed public-exit shape check, not the removed alternate-auth sentinel path. Remaining Unshield work is the larger Target A custody/proof migration: program-owned vault, on-chain release enforcement, and real proof verification.

### Still open #5 — Vault custody is still operator-keypair-in-env

This is the biggest single change still needed for non-custodial operation. The operator loads `vaultSignerSecretKeyEnvName` and signs the SPL transfer for every unshield. Whoever holds the env can drain.

The fix (shield W4 — program-owned PDA vault + unshield U2 — on-chain `TAG_UNSHIELD` instruction with PDA-signed CPI) is bigger than items 1-4 (estimated 2-3 weeks) but it removes the entire category of "the operator gets compromised, everyone loses funds." After the Groth16 verifier from #1 lands, this is the natural next workstream because it can reuse the same verifier for the unshield proof.

**Codex status, 2026-05-12 custody preflight patch, updated 2026-05-14 for custody-registry and verifier-key preflight scaffolds:** still open for production implementation, but harder to misrepresent locally. `src/solana/unshieldTrustContract.ts` and `npm run unshield:trust-packet-check` now name `currentReleaseModel = operator-keypair-public-exit`, keep `productionCustodyReady`, `programOwnedVaultReady`, and `onchainUnshieldInstructionReady` false, expose `program-owned-vault-pda-not-deployed`, `tag-unshield-reserved-fail-closed`, and `tag-unshield-token-cpi-release-not-wired`, and cite `npm run private-pool-v2:onchain-unshield-custody-check`. The local `TAG_UNSHIELD = 6` source ABI is now a 457-byte source-only preflight: it validates payload shape, requires pool/root-history/root-record/nullifier-marker/vault-authority/vault-asset/mint/token-program/vault-token-account/destination-token-account/verifier-key accounts, checks the registered root, requires the program-owned root provenance record from `["vanta2root", pool_state, acceptedRoot]`, requires the program-owned verifier-key registry record from `["vanta2vkey", pool_state, verifierKeyHash]`, checks nullifier-marker availability, derives the vault authority from `["vanta2vault", pool_state, exitAssetId]`, requires a disabled source-level vault-asset registry record from `["vanta2asset", pool_state, exitAssetId]`, checks SPL account shape without token CPI, then returns custom error `15` before proof verification, nullifier consume, token/system CPI, custody transfer, fund release, or account mutation. Guards: `npm run lanes:trust-contract-check`, `npm run unshield:trust-packet-check`, `npm run private-pool-v2:onchain-unshield-custody-check`, and `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`. Residual caveat: this is preflight and drift prevention; it is not a program-owned vault, not on-chain proof-verified release, not proof that a root transition is correct, not redeployed/reinitialized/live SBF evidence, not pushed, and not live-verified.

### Still open #6 — Migrate or deprecate `vanta_private_core_single_note_*` circuits

The new `vanta_private_pool_v2_*_entry` circuits are now the correct template. A fresh dependency pass found that the older `vanta_private_core_single_note_send/swap/unshield` circuits still back active Private Core gates and some operator/UI flows, so deleting them immediately would break the current local product lane. Some older critique on these circuits is now stale: they are depth 20, use single-field Merkle siblings, use standard Poseidon node hashing, and now share the zero-high-limb context-tag encoding.

Sharpened recommendation: rather than rebuilding the single_note_* circuits as the long-term architecture, **freeze/deprecate them as active-v0 lanes** and migrate new flows through the v2 entry circuits as replacements cover the active surfaces. The team has already done the work of writing the correct v2 circuit family; maintaining both forever is wasted complexity.

**Codex status, 2026-05-12 single-note legacy-lane freeze:** locally remediated for the freeze/contract portion without deleting or renaming active lanes. The Private Core operator contract/status surfaces now expose `supportedPrivateCoreCircuitFamily = vanta_private_core_single_note`, `supportedPrivateCoreCircuitFamilyStatus = active-v0-legacy`, `supportedPrivateCoreCircuitFamilyNewArchitectureStatus = deprecated-for-new-architecture`, the three legacy circuit names, and `supportedPrivateCoreReplacementFamily = vanta_private_pool_v2_entry`. Guard: `npm run private-core:single-note-freeze-check`, wired into `npm run zk:review-guards-check`. Residual caveat: this is compatibility metadata and stale-claim prevention; it is not migration, deletion, proof ABI replacement, on-chain verifier enforcement, push, or live verification.

If any production flow currently routes through `single_note_*`, plan its migration through the Private Pool v2 entry family or an explicitly reviewed replacement. Delete or retire those active-v0 legacy lanes only after replacement coverage is reviewed and current Private Core flows no longer depend on them.

### Remediated locally #7 — Send/Swap context-tag additive comparisons

`vanta_private_core_single_note_send` and `vanta_private_core_single_note_swap` now reject non-canonical context-tag splits by requiring `*_context_tag_hi == 0` and comparing the computed context tag directly to `*_context_tag_lo`. New `invalid-context-split` fixtures prove the old `hi = 1, lo = tag - 1` additive bypass no longer solves, and `npm run zk:circuit-soundness-lint` rejects reintroduced additive context-tag comparisons.

## New observations from the re-walk

Things I missed in the initial review or that became visible only after the recent fixes:

- **The pool authority is per-pool, stored in pool_state.** `POOL_AUTHORITY_OFFSET = 24`. This supports multi-asset deployments (one pool per asset, separate authorities, separate root histories) and supports authority rotation. Good architectural choice. The lane deep dives assumed a single pool; the program is already shaped for multi-pool.
- **The PDA model for nullifier markers and output records is genuinely better than the fixed-slot model in most existing privacy-pool implementations.** This is worth writing up as a published essay (per the taste-pass T10 — "How Vanta uses PDA markers to avoid linear-scan nullifier checks"). It's a contribution to the Solana privacy literature, not just internal engineering.
- **Codex status, 2026-05-12:** remediated locally. The Send proof-request/circuit lane now derives one Poseidon/BN254 field per recipient/change `sha256:` memo ciphertext body hash and binds `recipient_memo_ciphertext_body_hash_field` plus `change_memo_ciphertext_body_hash_field` into the Send public-input hash. This removes the previous hi/lo public-input split while preserving the opaque memo-body binding. Guarded by `npm run private-pool-v2:send-proof-request-check`, `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:public-input-hash-alignment-check`, and `npm run private-pool-v2:contract-check`.
- **The unshield circuit's `assert(owner_public_key_hi == 0)`** constrains the owner public key to fit in the lower 128 bits. Whether this is intentional (key derivation guarantees < 2^128 by construction) or an artifact of the encoding split is unclear from the surrounding code. Worth a short comment in the circuit explaining the choice, so a future auditor doesn't flag it as a potentially redundant constraint.
  - **Codex status, 2026-05-14 proof-owner limb comment:** remediated locally and now guarded. `zk/noir/vanta_private_core_single_note_unshield/src/main.nr` already explains that the proof-owner key is a single Poseidon/BN254 field carried in the low limb while the source-layer X25519 owner key remains prechecked off-circuit. `npm run zk:owner-key-hierarchy-contract-check` now requires that explanation next to `assert(owner_public_key_hi == 0)` and `assert(owner_public_key_lo == computed_owner_public_key)`. This is auditor-context/guard hardening only; it is not an in-circuit X25519 ownership proof, not no-witness production owner authorization, not on-chain release enforcement, not audit acceptance, not production-private readiness, and not live deployment evidence.
- **The number of npm run gates referenced in operator-runbook.md has grown substantially** during the recent passes (the `private-pool-v2:contract-check` markers, the new circuit checks, the `merkle-node-hash-contract-check`, etc.). The audit-package's prose checklist (per docs-pass D1) is now better-aligned with the automated checks than before — many of the questions I said "need to be encoded as CI" are in fact now encoded. **Codex status, 2026-05-12 audit handoff root:** locally remediated for discoverability by adding `npm run audit:handoff-check`, wiring it into `docs/audit-package.md` and `docs/operator-runbook.md`, and guarding the handoff command with `npm run audit:package-check` plus `npm run operator:runbook-check`. This is a reviewer command bundle only; it is not an audit, not live deployment evidence, and not production readiness.
- **Codex status, 2026-05-13 public audit discovery:** locally remediated for public reviewer discovery by adding `public/.well-known/vanta-audit.json`, wiring `npm run public:audit-discovery-check` into `npm run audit:package-check`, and extending `docs/audit-package.md` to describe the refs-only public discovery boundary. The JSON preserves false readiness booleans, points only to repo-local refs/templates/evidence, includes the `public-anonymity-depth` blocker at `2` distinct commitments against the `1,024` minimum, and rejects audit/production overclaim phrases plus broader secret/report/witness/provider-content markers. A follow-up removed the JSON's own exclusion-policy prose so the public file stays refs/status only. This is a discovery surface only; it is not an audit report, not third-party acceptance, not production readiness, not pushed, and not live-verified. Implementation commits: `146f212` and `9f452a5`.
- **Codex status, 2026-05-13 route fallback truth surface:** locally remediated after a Full Blast scout flagged that unknown routes were being promoted into product routes. `src/App.tsx` now renders `NotFoundPage` for unknown global/docs/app routes, keeps `/app` index redirecting to `/app/shield`, adds `RouteErrorBoundary`, and guards browser behavior with `npm run route:fallback-browser-check`. The fallback copy says nothing moved and production privacy is not enabled, and app/docs scoped misses keep their shells visible. This is route-recovery and claim-truth hardening only; it is not a true static-host HTTP 404 claim, not production privacy, not pushed, and not live-verified. Implementation commit: `e8c25ce`.
- **Codex status, 2026-05-13 feedback guard hardening:** locally remediated after Full Blast guard/docs scouts found the review-loop guards were weaker than the public audit discovery guard. `npm run route:fallback-contract-check` now protects the source-only route fallback contract inside `truth:privacy-claim-gate`; the findings ledger guard validates repo-local refs across loop/finding refs, scans both `VANTA_ZK_REVIEW.findings.json` and this review doc for secret-shaped values or structured leak fields, and uses fragment-built self-tests so the repo secret scanner stays clean; the public audit discovery guard now validates ref-like JSON fields schema-wide; README now names the Send browser/Web Worker path as dev-only local evidence rather than saying no browser/runtime prover exists; and the public discovery JSON now says latest local feedback-loop changes, not the whole branch, remain unpushed/unlive. This is guard and wording hardening only; it is not production privacy, not pushed, and not live-verified. Implementation commit: `17e6539`.
- **Codex status, 2026-05-14 ZK ledger Lumi/pin hardening:** locally remediated after the verification scout found that the ZK findings ledger checker allowed vague baseline wording and only checked that Lumi push/live fields were non-empty. `scripts/check-vanta-zk-review-findings-ledger.mjs` now rejects vague `and earlier` / `earlier local` commit-pin language, the remaining `572c46e` baseline references are rewritten as a concrete local verified feedback-loop baseline pin, and `assertLumiPromotionBoundary` requires every non-pushed/non-live loop or finding to keep `lumiHygiene.pushed = not-pushed` and `lumiHygiene.deployedLive = not-live-verified`. Verified with `npm run zk:review-findings-ledger-check`, `npm run zk:feedback-loop-check`, `npm run public:audit-discovery-check`, `npm run mainnet:secret-exposure-check`, and `git diff --check`. This is feedback-ledger hygiene only; it is not a new proof lane, not production privacy, not accepted closure, not pushed, and not deployed/live. Implementation commit: `f899388`.
- **The `vanta_private_pool_v2_actual_private_spend_entry` circuit (which I praised as the only correct circuit in the original review) is now one of several correct circuits.** The shield/send/claim/swap_to_shielded entry circuits have caught up. The template propagated. This is the desired outcome.

## Updated priority list

The premier-suite synthesis in F13 listed 10 items. Several are now closed. The updated list, ordered by remaining-leverage-per-week:

1. **Choose and prove the production verifier backend, then wire the matching on-chain verifier** (still-open #1 + #2 together). 2-3 weeks. The current tag `3` shape targets a Groth16-compatible Solana verifier path, while local bb.js/UltraHonk artifacts remain non-production evidence; the next positive slice should first prove the actual circuit family can produce the matching production proof/public-witness format, then replace the fail-closed verifier boundary. This closes the largest remaining cryptographic gap, but it is still one slice of Target A rather than full production-private readiness.
2. **Program-owned PDA vault + wired proof-verified `TAG_UNSHIELD` release** (still-open #5). 2-3 weeks. Upgrades the current reserved fail-closed source ABI into real vault release enforcement and removes the operator's vault keypair as the trust anchor for funds at rest.
3. **Finish legacy-record recovery source work beyond quarantine** (follow-up to partially remediated #3). The quarantine policy is now local and guarded: old random-seeded/redacted/missing records remain local-only and cannot be promoted by import. Remaining work is any future reviewed recovery source/backup flow plus viewing-key memo discovery; do not silently migrate old browser records.
4. **Migrate `vanta_private_core_single_note_*` out once replacements cover active flows** (follow-up to locally guarded #6). The active-v0 legacy-lane freeze is now machine-readable, but actual migration/deletion still waits on replacement Send/Swap/Unshield dependencies.
5. **Keep the strategy/pay trust-contract pattern guarded across all six lanes** (locally remediated for shared strip and page-local Strategy/Pay claim copy). Future work is preservation, not a fresh implementation item, unless new lane pages bypass the contract-derived copy.
6. **Customer-side wallet flow for Pay** (Pay P1). 3-4 weeks. Gives merchants something real to integrate.
7. **Privacy Pools association sets** (F1). 2-4 weeks. Compliance unlock that determines how big the merchant TAM can ever be.
8. **Sign 5 anchor merchant partners** (F3). Calendar-bound. Solves anonymity-set bootstrapping.
9. **Developer SDK + sandbox + docs** (F4). 6-10 weeks of dev-rel work. Determines the merchant integration ceiling.

Items 1-4 are the remaining core engineering spine. After verifier/prover/custody/deprecation work, the protocol is much closer to fully non-custodial with real on-chain proof verification, but every cryptographic claim still needs the matching verifier, custody, SBF/live, audit, and deployment evidence. Items 5-9 are product/go-to-market and don't sequentially depend on the verifier/custody work, so they should run in parallel.

## What the closing argument now looks like

When the original review opened, "Vanta isn't there yet" was a fair summary. After the Codex iteration loops captured in the progress notes above, the right summary is different:

**Vanta now has Target-A-shaped local scaffolding, but C01 is still partial.** The circuits are materially stronger. The on-chain program is operator-authorized with deterministic nullifier and output-record state. The memos are AEAD-encrypted. The owner-recovery crypto is standard AEAD. The unshield circuit cryptographically proves ownership. The send circuit cryptographically enforces value conservation.

The two remaining cryptographic items (real production prover/backend, on-chain proof verifier) are now sharply scoped, but the verifier backend bridge is a real decision gate: tag `3` is Groth16-shaped while the local artifacts are bb.js/UltraHonk. The transition-authorized Unshield finding was stale and is already removed locally; the remaining recovery product work is migration/UX rather than the new-record seed derivation itself. The GTM items (Privacy Pools, anchor merchants, SDK) are parallel and not blocked on engineering.

This is the rare position where a project that was three months from credibility is now much closer to it. The path is clearer, but C01 still needs the verifier backend decision, proof enforcement, custody work, SBF/live evidence, audit, and deployment proof before production-private claims are safe.

The next review pass — whenever it happens — should be able to evaluate whether items 1-5 have actually closed and then start checking off the GTM items. At that point the document's "still open" lists should collapse only where the matching verifier, custody, SBF/live, audit, and deployment evidence exists, and the question becomes whether merchants and counterparties actually adopt. That's a product question, not an engineering one.

Good luck. The hard part is mostly done.

---

# Re-audit — 20× Taste and 20× Polish on the Current Website

I re-walked the website code (`src/pages/*`, `src/components/*`, `src/styles.css` now at 9,620 lines) to see what's landed against the original taste and polish passes, and to write a sharper, more concrete plan for what's left.

The first thing to acknowledge: real progress. Several recommendations from the original passes are now in code.

## What's landed

- **`SystemStatusStrip` component exists** at `src/components/SystemStatusStrip.tsx`. It consolidates the per-page beta disclaimers into a single shared strip that reads from `getLaneTrustStatuses()` — the trust-contract pattern from the strategy/pay lanes is now wired into UI gating across the app. This was the first commit recommendation from the UI/UX pass; it shipped.
- **`AppLayout` is a real shell** (`src/components/AppLayout.tsx`). Persistent nav, wallet picker, mobile-wallet prompts, peer onramp flow, tab refs that scroll-into-view on mobile. The layer between the home page and the per-lane pages is now well-structured.
- **`DocsSidebar` exists** at `src/components/DocsSidebar.tsx`. The "add a visible left-sidebar navigation" recommendation from the docs UI/UX pass landed — `docsSidebarGroups` provides grouped navigation with active-state tracking and per-page section anchoring.
- **Real motion was added.** `grep '@keyframes'` on `styles.css` now returns 9 named animations: `walletMenuIn`, `statusLoad`, `unshieldSuccessPulse`, `vanta-page-enter`, `vanta-panel-enter`, `landing-grid-shift`, `landing-breathe`, `landing-blink`, `landing-scroll-pulse`. The original review counted basically one. The landing-page motion (grid drift, glow breathing, scroll pulse) is exactly the "site feels alive instead of static" move I recommended.
- **`unshieldSuccessPulse` is the right kind of polish.** When an unshield completes, the page now has a celebratory pulse — exactly the "make the success state feel like an event" recommendation. Apply this pattern to shield and send too.

That's real progress. The baseline this audit is grading against is higher than the original review's.

## What's almost there

Three items are partially landed and need finishing:

- **The `SystemStatusStrip` is consolidated and now leads with safer affirmative beta framing.** The current copy is `Beta · receipts where available · 6 claim locks active` followed by per-lane `Claim locked` previews. This is better than the original disclaimer sprawl. The future taste move is to keep raising the affirmative evidence only as the matching lane-verification/live-evidence gates exist, not to imply `6 lanes verified` today.
- **The landing-page hero now has a first safe visualization.** Commit `6ef36c9` added a beta-safe Wallet -> Shield -> Shielded state visual with packet-line motion and explicit `not production-private proof` copy. Future work can still promote that visual language into a shared motif, but the original "no visualization" gap is closed for Home.
- **The DocsSidebar exists and the docs home now has its first inline diagram.** The docs-pass D-recommendation is partially closed by the DocsHomePage flow diagram below; broader per-page diagrams alongside the remaining docs step grids are still future visual-layer work.

**Codex status, 2026-05-14 Docs inline-diagram slice:** commit `5b2de61` locally closes the safe current subset of the DocsHomePage inline-diagram recommendation. `src/pages/DocsHomePage.tsx` now renders a beta-safe `DocsHomeFlowDiagram` with `data-docs-flow-diagram`, Public chain, Vanta shield, Trust packet, and Counterparty review nodes, three arrow markers, a mobile horizontal fallback, and visible `not production-private proof` copy. `scripts/check-vanta-docs-inline-diagram.mjs` and `scripts/check-vanta-docs-browser.mjs` guard the diagram markers, required labels, CSS fallback, package-script wiring, and unsupported-claim boundary; `docs:verify` and `zk:feedback-loop-check` now include `npm run docs:inline-diagram-check`. Verification passed locally with red-first `npm run docs:browser-check`, then `npm run docs:inline-diagram-check`, `npm run docs:source-of-truth-check`, `npm run docs:browser-check`, `npm run docs:verify`, `npm run truth:privacy-claim-gate`, `npm run mainnet:external-gates-production-claim-check`, `npm run build`, `npm run zk:review-findings-ledger-check`, `npm run zk:feedback-loop-check`, and `git diff --check`. This is docs presentation and guard hardening only; it is not production-private settlement, not a live depth oracle, not live anonymity, not social proof, not TVL or user-count evidence, not route/proof/settlement behavior, not audit acceptance, not pushed, and not deployed/live.

## The 20× taste audit, applied to current code

Twelve moves the original taste pass laid out; current status of each on the actual website:

| # | Taste move | Current status | Concrete next step |
|---|---|---|---|
| T1 | Pick an aesthetic that means something | Not done. `--bg: #030406` is still the base. | Replace with `#000` true black on the home page only first. Add `body.landing-body { background: #000 }` override (the class is already toggled in `HomePage.tsx:37`). Ship in one PR. See if the brand-mark glow against true black reads as more committed. If yes, propagate to the app shell next sprint. |
| T2 | Develop a voice the product speaks in | Partially done. The latest copy loops remove several defensive product-copy hedges and replace repeated claim-lock phrasing with beta receipt/readiness language, but the product still needs a durable one-page voice spec. | Write a one-page voice spec. Apply to the next ten copy edits while preserving beta-truth gates; avoid future-state samples like "The chain sees that something happened. It does not see what" until verifier, shared-pool, relayer, and live-evidence gates support them. |
| T3 | Commit to a vocabulary | Not done. App nav still says Shield / Send / Swap / Strategy / Unshield / Pay. | Rename "trust packet" to "Letter" in `vantaPayReceiptPrivacyContract.ts` and all UI copy. Rename "vault PDA" to "the Vault" everywhere in the on-chain program comments and operator docs. Two strings; ripple effect over months. |
| T4 | Make privacy visible by making time visible | Not done. No depth-oracle visualization exists. | Add a new `<DepthOracleStrip />` between the hero and the "What it does" section on the home page. Pulls live deposit counts from the operator's `private-pool-v2:state` endpoint, renders a horizontal time-axis with deposit density. ~2 days of work; ~150 lines of TSX + a small SVG sparkline. **Highest-leverage single addition.** |
| T5 | Build the receipt as an artifact | Not done. Trust packets are still JSON-shape. | Add a `<LetterPDF>` React component that renders the receipt to a PDF via `react-pdf` or `@react-pdf/renderer`. Letterhead, serial number, QR code, embossed brand-mark watermark. Add a `/letter/:id` route that mirrors the PDF layout. Ship in `src/pay/` first; extend to send/swap/unshield receipts in a second pass. |
| T6 | Make the threshold a real moment | Partially done. `unshieldSuccessPulse` exists. | Add `shieldSuccessPulse` and `sendSuccessPulse` to `styles.css`, matching the same 600ms accent-bloom pattern. First-shield commemoration: a single `localStorage` flag (`vanta.shield.firstSealConfirmedAt`), a special variant of the pulse animation, a one-time "Your first seal" marker that fades after 4 seconds. |
| T7 | Errors are an opportunity | Partially done. Unknown global/docs/app routes now render `NotFoundPage`, app/docs misses keep their shells visible, and `RouteErrorBoundary` catches route-level failures with claim-safe recovery copy. This is SPA route recovery, not a static-host HTTP 404 guarantee. | Future taste work can add a brand-specific visual treatment or a true host-level 404 once deployment routing is configured. Keep the existing “Nothing moved” / production-privacy-disabled copy and browser guard intact. |
| T8 | Hide easter eggs that respect the topic | Partially done locally. | Commit `7c7043a` ships `/manifesto` and the short `/.well-known/audit` alias as a beta-truthful public taste/discovery surface. Future verifier-key-hash generation can still add a generated `.well-known/audit.json` once production verifying-key evidence exists. |
| T9 | Onboarding is a story | Not done. `/` to `/app` is a direct nav with no narrative. | First-time-visitor detection via `localStorage` flag. New visitors get a 30-second auto-scrolling hero with sentence-by-sentence fade-in (using `IntersectionObserver` + the existing `vanta-page-enter` keyframe). Returning visitors get the static hero immediately. ~150 lines of code, one new component. |
| T10 | Treat the docs as a publication | Not done. Docs pages render but have no bylines, no `/log`, no `/people`. | Add `src/pages/LogPage.tsx` that lists essays from a markdown frontmatter directory. First essay: "How Vanta runs its own buybacks privately." Mid-priority — depends on having essays to publish. |
| T11 | Keep the operator visible | Not done. No `/operator` page exists. | Add `src/pages/OperatorPage.tsx` with: program IDs, authority pubkey, deployed verifier hash, monthly Operator Letter signed by the project key. Static content first; signed-letter cadence later. |
| T12 | The artifact you leave behind | Not done. No export/lifetime-letter feature. | Wait for shield W2 (wallet-derived recovery) to land; then a lifetime-activity letter is a natural follow-up because the note history will be reconstructable. ~1 week once the precondition lands. |

**Codex status, 2026-05-14 public manifesto and audit alias:** commit `7c7043a` locally ships `/manifesto` and the refs-only `/.well-known/audit` alias from the T8 recommendation. `src/pages/ManifestoPage.tsx` carries the one-paragraph credo, a visible `Production privacy is not enabled` / `not an audit report` boundary, and reviewer links to the audit alias and security limits. `public/.well-known/audit` points to `/.well-known/vanta-audit.json` while keeping audit, production, mainnet, live, privacy, and anonymity claim gates false. `npm run public:manifesto-check` is wired into `truth:privacy-claim-gate` and `zk:feedback-loop-check`, and `npm run product-ui:browser-check` now visits `/manifesto`. Verified locally with red-first `npm run public:manifesto-check`, then `npm run public:manifesto-check`, `npm run public:audit-discovery-check`, `npm run audit:package-check`, `npm run truth:privacy-claim-gate`, `npm run build`, `npm run product-ui:browser-check`, and `git diff --check`. This is public taste/discovery surface only; it is not an audit report, not third-party approval, not production privacy, not pushed, and not deployed/live.

The first commit recommendation from the original taste pass ("rename trust packet to Letter, ship `/.well-known/audit` and `/manifesto`") is now partially landed locally. The remaining lowest-cost taste signal is the vocabulary rename from "trust packet" to "Letter", with future generated audit JSON still blocked on production verifying-key evidence.

## The 20× polish audit, applied to current code

The original polish pass had 10 themes. Current code against each:

### P1 — Performance

Not measured. The `src/pages/*.tsx` files still total 13,404 lines and ship as one bundle. No code-splitting visible. No `web-vitals` import. No Lighthouse CI in the npm scripts.

**Concrete moves, in order:**
- Add `vite-bundle-analyzer` to `vite.config.ts`. Run once. Find the largest contributors. The wallet adapter is almost certainly top-3.
- Lazy-load every route component in `App.tsx`:
  ```tsx
  const ShieldPage = lazy(() => import("@/pages/ShieldPage").then(m => ({ default: m.ShieldPage })));
  ```
  Apply to all 12 page components. Wrap routes in `<Suspense fallback={<RouteSkeleton />}>`. One afternoon; halves the initial bundle.
- Add `web-vitals` library and a `reportWebVitals()` call in `main.tsx`. Send to a `/telemetry` endpoint that aggregates without per-user identification.
- Add Lighthouse CI as a GitHub Action with score floors: Performance 90, Accessibility 95, Best Practices 95, SEO 95.

### P2 — Type and numbers

`font-variant-numeric: tabular-nums` is set in `:root` — good. But the right-alignment of numeric columns in the dashboard's `dashboard-focus-card__stats` (per `AppDashboardPage.tsx:257-294`) isn't enforced. The `<strong>` containing the balance is left-aligned by default flow.

**Concrete moves:**
- Add `.dashboard-focus-card__stats strong { text-align: right; font-variant-numeric: tabular-nums; }` to `styles.css`.
- Add `text-wrap: balance` to `.landing-minimal__hero h1` and `.module-page__hero h1`/h2. One CSS line per selector; eliminates orphan words in headlines.
- Add number-transition animations to the dashboard balance. `react-spring`'s `<animated.span>` or a small `useCountUp(value)` hook. When a shield confirms, the balance counts up from old → new over ~400ms.
- Audit currency precision: `formatVantaSolAmount` is correct for SOL; the equivalent for USDC (6 decimals) shows 2 by default in some places, which truncates without warning. Wrap in a `<TokenAmount asset={"USDC"} value={...} />` component that picks the right precision per asset.

### P3 — Interaction quality

The wallet picker has `walletMenuIn` animation — good. Buttons have `:focus-visible` rules. But the bulk of buttons across the pages rely on default browser feedback only.

**Concrete moves:**
- Add a single `.button` base class with four hover cues: color shift, shadow lift, micro-scale 1.02, cursor. Apply to every `<button className="button button-*">` in the codebase. The CSS is already structured around `--shadow-lift`; just need to wire it into `:hover`.
- Add `transform: scale(0.98)` to `.button:active` for tactile press feedback.
- Replace the focus ring (`2px solid rgba(119, 242, 212, 0.62)`) with a layered version: inner darken + outer accent. One line in `:focus-visible`.
- Implement optimistic UI on the Shield form. When `sendNoteTransaction.send()` is called in `ShieldPage.tsx:2044`-ish area, immediately add a "pending" note to the local Vault grid view. Reconcile with the chain when confirmation arrives. Today the UI waits for the chain to confirm.
- Add a one-second "Copied" feedback on every address-copy button. The current state in some pages is "click and nothing visible happens."

### P4 — Motion

9 keyframes is good. The taxonomy isn't standardized — different animations use different durations and easings.

**Concrete moves:**
- Replace the two existing easing CSS variables (`--ease-out`, `--ease-smooth`) with a five-curve palette:
  ```css
  --ease-snappy: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:     cubic-bezier(0.7, 0, 0.84, 0);
  --ease-spring: linear(0, 0.5, 0.9, 1.05, 0.95, 1);
  --ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);
  ```
  Document where each is appropriate. Refactor existing animations to use them.
- Add a `--duration-instant: 100ms; --duration-state: 200ms; --duration-page: 400ms; --duration-celebrate: 600ms;` token scale.
- Add a global `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` block at the bottom of `styles.css`. Today reduced-motion isn't respected.
- Replace every spinner in the codebase with a shimmer skeleton. The closest existing surface is `statusLoad` keyframe; promote it to a general-purpose `.skeleton-shimmer` utility class used in every loading state.

### P5 — States nobody designs

Empty states across the app pages are mostly utilitarian text. Error states use `setFlowError` and render inline.

**Concrete moves:**
- Build a `<EmptyState illustration={...} title={...} body={...} cta={...} />` component. Use across all four lane pages plus the dashboard. Each variant gets a distinct illustration from a brand-mark-family icon set.
- Build a `<ErrorBanner severity="info|warning|critical" title body action />` component. Replace all the ad-hoc inline error displays in ShieldPage / SendPage / SwapPage / UnshieldPage. ~200 lines of TSX, ~80 lines of CSS, used 40+ times.
- Add an offline indicator. `window.navigator.onLine` + `online`/`offline` events. Render a thin banner: "You're offline. Vanta is showing your last-known state." Add to `AppLayout.tsx`.
- Add stale-data indicators. When the position summary hasn't refreshed in >60s, show "Balance last updated 73s ago" with a small refresh button.

### P6 — Accessibility

`aria-label`s exist in `HomePage.tsx`, `DocsSidebar.tsx`, etc. `:focus-visible` rules exist. No formal a11y audit visible.

**Concrete moves:**
- Add `axe-core` to the dev dependencies and the CI pipeline. Fail on any new violations.
- Audit contrast: current `--muted: #8b9997` against `--bg: #030406` is 5.6:1 (AA, not AAA). Bump `--muted` to `#a5b3b1` to clear AAA at 7.0:1.
- Add a `<SkipToContent />` link as the first focusable element in `AppLayout`. One link, jumps past the nav.
- Audit modal focus management. The wallet picker uses `walletPickerOpen` state but I didn't see focus trapping. Add `react-focus-lock` around the picker dialog.
- Add `aria-live="polite"` regions for state changes. When a shield confirms, announce "Shield complete. 100 USDC sealed." Currently the success states are visual-only.

### P7 — Mobile

`@media` queries number 12 across 9,620 lines — light coverage. The `AppLayout.tsx` has explicit mobile-tab-scroll handling and mobile-wallet-prompt detection, which is good.

**Concrete moves:**
- Replace `100vh` with `100dvh` everywhere it appears. iOS Safari address-bar handling.
- Add `env(safe-area-inset-bottom)` padding to the bottom of fixed-positioned mobile nav elements.
- Add `touch-action: manipulation` to every interactive element. Eliminates 300ms tap delay.
- Implement haptic feedback via `navigator.vibrate(10)` on Shield/Send/Unshield confirm. iOS only; degrade silently on Android.
- Test on a Moto G4 (or BrowserStack equivalent). Today the codebase is desktop-throttled-tested.

### P8 — Asset craft

No custom icon set. No token logos. No designed email templates. Default favicon almost certainly.

**Concrete moves:**
- Commission or hand-draw a 24px-grid icon set: Vault, Seal, Letter, Key, Ledger, Oracle, Shield, Send, Swap, Unshield, Strategy, Pay. ~12 icons. Output as SVG sprite. One week of design work or buy from a Solana-native illustrator.
- Add token-logo CDN integration: pull official USDC, USDT, SOL, BONK, JUP logos from `assets.coingecko.com` or `raw.githubusercontent.com/solana-labs/token-list`. Cache locally. Replace the `<select>` asset dropdown in `ShieldPage` and `SwapPage` with a logo-pill grid.
- Ship a custom favicon suite: 16/32/48 favicon, 180px Apple touch icon, 192/512 Android, `site.webmanifest` tying them together. ~2 hours of work.
- Generate Open Graph cards. Vercel's `@vercel/og` or `satori` produces per-page OG images at request time. One image per page (Home, Docs, Pay merchant landing, individual receipt URLs). Critical for sharing.

### P9 — Engineering quality

Page files are still large (`SendPage.tsx` 2692 lines, `UnshieldPage.tsx` 3232 lines). No Storybook visible. No visual regression testing visible.

**Concrete moves:**
- Decompose `UnshieldPage.tsx` into `<UnshieldForm>`, `<UnshieldRecipient>`, `<UnshieldApprovalReview>`, `<UnshieldTransitionPicker>`, `<UnshieldReceiptCard>`. Same for `SendPage.tsx` and `ShieldPage.tsx`. Target <300 lines per page-shell file.
- Add Storybook for the new shared components (`SystemStatusStrip`, `DocsSidebar`, the future `EmptyState`, `ErrorBanner`, `LetterPDF`, `DepthOracleStrip`). One story file per component. Three days of work; pays back in regression prevention.
- Add Playwright e2e tests for the four happy paths: shield SOL, shield USDC, send USDC, unshield USDC. Run on every PR. Failures gate merge.
- Add visual regression testing via Chromatic or `@playwright/test`'s snapshot mode. Catch CSS regressions automatically.

### P10 — Quality machinery

No polish standup visible. No separate polish backlog visible.

**Concrete moves:**
- Add a `POLISH_BACKLOG.md` at the repo root. Seed with every item from this audit. Owner = a named team member. Reviewed weekly.
- Define "5% time" as a team norm. Every engineer spends 2 hours per week working a polish-backlog item.
- Add a Definition of Done section to the PR template: empty state designed, error states handled, loading state shimmers, success state celebrated, keyboard nav works, screen reader announces.

## The single 90-day plan that combines both passes

If the goal is "ship 20× taste and 20× polish in 90 days alongside the cryptographic work," here's the order I'd take:

**Week 1 (taste, free wins):**
- True black on the home page (T1)
- Voice spec written + ten copy edits (T2)
- `.well-known/audit.json` + `/manifesto` page (T8)
- Rename trust packet to "Letter" everywhere (T3)

**Week 2 (polish foundation):**
- Lazy-load all route components (P1)
- Add `vite-bundle-analyzer`, `web-vitals`, Lighthouse CI (P1)
- Standardize easing/duration tokens (P4)
- Add `prefers-reduced-motion` block (P4)

**Weeks 3-4 (the centerpiece):**
- Build the `<DepthOracleStrip />` (T4) — single highest-leverage taste move
- Build the `<EmptyState>` and `<ErrorBanner>` components and roll out across all four lane pages (P5)
- Number-transition animations on the dashboard balance (P2)

**Weeks 5-6 (the Letter):**
- Build `<LetterPDF>` component (T5) — the artifact that makes Vanta quotable
- Add `/letter/:id` verification route that mirrors the PDF
- Ship the merchant-facing webhook with Letter PDF attached

**Weeks 7-8 (the threshold):**
- Build `shieldSuccessPulse` and `sendSuccessPulse` animations (T6)
- First-seal commemoration with localStorage marker (T6)
- Custom 404 + ErrorBoundary pages (T7)

**Weeks 9-10 (engineering polish):**
- Decompose the three giant page files (P9)
- Storybook stories for shared components (P9)
- Playwright e2e tests on happy paths (P9)

**Weeks 11-12 (asset craft + accessibility):**
- Token-logo asset picker grid (P8)
- Custom icon set begun (P8)
- axe-core audit + WCAG-AAA contrast bump (P6)
- Mobile audit on actual hardware (P7)
- `<OperatorPage />` and `<LogPage />` with first essay (T10, T11)

At the end of 90 days: the home page leads with a live depth-oracle visualization, the receipts are PDF Letters, the success states feel celebratory, the empty states have personality, the bundle is half the size, the docs have a real visual identity, mobile works, accessibility is real, and there's a public manifesto. The product looks like nothing else in the space because most of the moves above are not standard practice in privacy/payments UI.

## What this actually changes

A user opens `vantaprivacy.xyz` in week 13. The home page is true black. A live counter shows the current pool depth. They click "Open App." The page transition is a coordinated panel-in motion. The dashboard balance animates up from 0 to their actual balance over 400ms. They click Shield. The asset picker is a row of token-logo pills with a smooth selection state. They confirm. The pending note appears in the Vault grid immediately. 400ms later it transitions to confirmed with a mint-colored radial pulse. A Letter PDF is generated; they can copy a verification URL or download the PDF. The first-time-ever shield gets a special "Your first seal" marker that fades after 4 seconds.

None of this requires the cryptography to be at Target A yet. All of it can ship against the current Target-B-shaped backend. When the Groth16 verifier lands, the same UI becomes cryptographically backed.

Taste makes the product memorable. Polish makes the product trustworthy. The 90-day plan above ships both, layered on top of the cryptographic work that's already in flight. The team that ships both in parallel is the team that ends 2026 as the default Solana privacy suite.

Three things are non-negotiable for that outcome: (1) the depth-oracle visualization, (2) the Letter PDF artifact, (3) a single committed aesthetic. Everything else is multiplier. Without those three, the polish work makes a better generic privacy app. With them, the polish work makes Vanta.

---

# 20× Programmatic Privacy and 20× Copy Clarity

Two questions, one section:

1. **What actually has to change to make transactions cryptographically private** at the protocol level, not just labeled as private?
2. **What copy can be cut or rewritten** so a reader understands what Vanta does in one pass?

The first half is the wire format. The second half is the words on top of it. Both need work.

---

## Part 1 — How to make Vanta programmatically private

### The honest current state

A transaction in Vanta today is private along some axes and public along others:

| Privacy property | Status |
|---|---|
| Note ownership (proven via spending key) | ✓ Closed in unshield circuit; partial elsewhere |
| Note membership in the pool (Merkle proof) | ✓ Closed in all four v2 entry circuits |
| Nullifier uniqueness on chain | ✓ Closed (PDA-based markers) |
| Authority-gated state writes | ✓ Closed (operator authority signature) |
| Value conservation in send | ✓ Closed in send circuit |
| Economics hidden behind a commitment in shield | ✓ Closed |
| Memo ciphertexts (AEAD-encrypted) | ✓ Closed (v2 memo prefixes) |
| **Real ZK proof generated for each action** | ✗ Mock prover still in production path |
| **On-chain proof verification** | ✗ No Groth16 verifier in program |
| **Non-custodial vault (program-owned PDA)** | ✗ Operator keypair still holds funds |
| **Anonymity set ≥ k for meaningful k** | ✗ Effectively k = 1 (per-user localStorage state) |
| **Amount-distribution obfuscation** | ✗ Variable amounts cluster transactions by value |
| **Timing obfuscation** | ✗ Submit-and-settle is immediate, observable |
| **Relayer separation from wallet signer** | ✗ User wallet signs the on-chain transaction |
| **Forward secrecy on viewing keys** | ✗ Single long-lived viewing key per user |
| **Cross-asset linkability** | ✗ Swap input/output observable to operator |

Seven ✓ of real progress. Eight ✗ of real gaps. Each ✗ is a separate place an adversary breaks the privacy claim.

### Twelve programmatic-privacy moves

Concrete, scoped to current files, ordered by privacy-impact-per-week. None require new research.

**V1. Ship a real prover.** Replace `src/privacy/privatePoolV2LocalProver.ts` (returns `proofSystem: "mock"`) with `@aztec/bb.js` or `snarkjs`. Generate Groth16 proofs in a Web Worker. **1-2 weeks.** Without this, every privacy claim is unsubstantiated.

**V2. Embed a Groth16 verifier in the program.** `programs/vanta_private_pool_v2_spend/src/lib.rs:process_spend` accepts payloads without proof verification. Pull in Light Protocol's `groth16-solana`; commit the verifying key in `process_init`; call `groth16_verify(vk, public_inputs_hash, proof_bytes)` before accepting. **1 week.** Turns the operator's authority signature from "the trust anchor" into "a permissioning policy on top of cryptographic proof."

**V3. Program-owned vault PDA.** `operator/unshield-server.mjs` loads `vaultSignerSecretKeyEnvName` from env to sign release transfers. Replace: deposits go to a PDA; unshields invoke a CPI signed as the PDA. **2-3 weeks.** Removes the largest custody risk.

**V4. Shared on-chain anonymity tree.** The commitment tree currently lives in browser localStorage (`vanta.zk.phase1.live-shield-records.v1`). Each user has their own tree of size 1+. Move on chain: every shield appends to a single program-owned incremental Merkle tree. All users prove membership against the same tree. **2-3 weeks. The single biggest privacy multiplier.** Anonymity grows from k=1 to k=N where N is daily depositors. 100 active users = 100×. 10,000 = 10,000×.

**V5. Denomination obfuscation.** A 17.42 USDC shield and 17.42 USDC unshield are correlatable by amount alone. Fixed denominations (Tornado: 10/100/1000/10000) or amount splitting (Aztec/Penumbra: split deposits into standard sizes internally). **1-2 weeks (fixed) / 3-4 weeks (splitting).** Without this, amount-matching breaks every other privacy claim.

**V6. Relayer batching.** Submit-and-settle is immediate; observers correlate by timing. Add a batcher: hold proofs in a 5-30 second window, submit in randomized order at fixed cadence. **1-2 weeks.** `shieldDecoyBatcher.ts` is already shaped for this.

**V7. Relayer separation (signer ≠ wallet).** The user's wallet signs the on-chain transaction. Even with perfect proofs, the fee-payer is a permanent on-chain link. Add a relayer that submits on the user's behalf. User signs only the proof. **1 week.**

**V8. Customer-side ZK proof in Pay.** Today the customer's wallet SPL-transfers to the operator's vault — public link to the merchant. Required: customer signs one transaction that (a) transfers tokens to a program-owned escrow PDA AND (b) includes a ZK proof binding `(session_id, customer_owner_commitment, paid_amount)`. **3-4 weeks.** Requires V1 and V4.

**V9. Forward-secret viewing keys.** A single long-lived viewing key means a future compromise reveals all historical decryptions. Rotate ephemeral viewing keys per epoch (e.g., 24h). **1 week.** Builds on wallet-derived recovery seed.

**V10. Cross-asset privacy in swap.** Today the operator routes USDC into SOL via Jupiter — input/output linkage visible. Fix: asset transitions inside the pool with pricing from an on-chain oracle. The pool holds a portfolio and rebalances in aggregate. **4+ weeks.** Highest complexity.

**V11. Public depth oracle as privacy disclosure.** Show live anonymity set size on the home page. Users see "your deposit joins 1,247 deposits over 14 days" before they shield. Honest about weak privacy when k is small; self-strengthening when k is large. **2 days** once V4's events are indexed.

**Codex status, 2026-05-13 public-depth disclosure:** commit `2a6c7fa` locally implemented the safe current subset of V11 without claiming a live oracle. The homepage now renders an `Anonymity readiness: blocked` disclosure from a browser-safe module that derives the current `2` distinct commitments and `1,024` minimum from `ops/mainnet/private-pool-v2-anonymity-set.evidence.json`; the copy says Vanta does not claim live anonymity or production-private mainnet settlement yet. Guarded by `npm run private-pool-v2:public-depth-disclosure-check`, `npm run landing:anonymity-disclosure-check`, `npm run landing:browser-check`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run zk:review-guards-check`, and `npm run build`. Remaining V11 truth: the real live depth oracle still waits on the shared on-chain tree/indexed events/reviewer/audit gates.

**V12. Compliance-aware privacy via Privacy Pools.** Without association sets, Vanta's anonymity set includes sanctioned funds. Regulated counterparties (exchanges, payroll, banks) reject Vanta withdrawals as compliance-tainted; effective k drops back to 1 for compliance-aware users. Add the Buterin/Heimbach construction: at withdraw, prove "I'm in the pool AND my deposit is in association set S." **2-4 weeks.** This unlocks the merchant market.

### Twelve-move summary

| # | Move | Effort | Privacy multiplier |
|---|---|---|---|
| V1 | Real Barretenberg prover | 1-2 wk | Required for everything else |
| V2 | Groth16 verifier in program | 1 wk | Real cryptographic enforcement |
| V3 | Program-owned vault PDA | 2-3 wk | Removes custody risk |
| V4 | Shared on-chain anonymity tree | 2-3 wk | k=1 → k=N (~100×+) |
| V5 | Denomination obfuscation | 1-4 wk | Defeats amount-matching |
| V6 | Relayer batching | 1-2 wk | Defeats timing analysis |
| V7 | Relayer separation | 1 wk | Defeats wallet linkage |
| V8 | Customer-side ZK proof in Pay | 3-4 wk | Defeats merchant↔customer link |
| V9 | Forward-secret viewing keys | 1 wk | Limits compromise blast radius |
| V10 | Cross-asset privacy in swap | 4+ wk | Defeats input↔output linkage |
| V11 | Public depth oracle | 2 d | Privacy that users can verify |
| V12 | Privacy Pools association sets | 2-4 wk | Compliance-compatible privacy |

After V1-V4: **credibly** private (~50-100× current). After V5-V8: **robustly** private against standard attacks (200-1000× depending on volume). After V9-V12: **compliantly** private — usable by regulated counterparties.

### The single thing that 20× privacy more than anything else

If only one item ships: **V4 (shared on-chain anonymity tree)**.

- Today: k = 1 per user. Privacy = log₂(1) = 0 bits.
- 100 sharing depositors: k = 100. Privacy ≈ 6.6 bits.
- 1,000: ~10 bits. 10,000: ~13 bits. 100,000: ~16.6 bits.

V4 *creates* privacy. Everything else *protects* it from leakage. Without V4, the other eleven items protect nothing.

If two items: V4 + V1+V2 so privacy is cryptographically enforced rather than operator-attested.

---

## Part 2 — How to 20× the clarity of the copy

The current copy reads like an engineering changelog. Accurate, careful, exhausting. A new visitor needs four reads of the home page before understanding what Vanta does. That's a comprehension failure.

### Three diagnoses

**1. Defensive disclaimers infest product copy.** "Production privacy claims remain locked" or close variants appears in `HomePage.tsx`, `PayPage.tsx`, `SystemStatusStrip.tsx`, `DocsHomePage.tsx`, and `vantaPayReceiptPrivacyContract.ts`. Important once. Repeated everywhere, it becomes the loudest thing the product says. **Rule:** disclaimers live in one canonical surface (`SystemStatusStrip` + `SECURITY_LIMITATIONS.md`). Nowhere else.

**2. Tautological copy.** *"Vanta will shield X directly so it remains X in shielded state."* / *"asset can enter shielded state as itself"* / *"Use guarded shielded-state flows while production privacy claims stay locked behind evidence."* Grammatical without information. **Rule:** every sentence must pass "would a smart reader who hasn't seen the product before learn something from this sentence?" If no — cut.

**3. Jargon stacks.** *"This is the counterparty-facing truth surface: beta state, usable lane, receipt package, and the verification boundary before anyone trusts a private settlement."* Seven Vanta-specific terms in 27 words. **Rule:** any sentence using more than one Vanta-specific term is doing too much work.

### Six editorial rules

1. **Cut disclaimers from product copy.** They live in `SystemStatusStrip` and `SECURITY_LIMITATIONS.md`.
2. **One idea per sentence.** Current sentences chain 3-4 ideas with commas.
3. **No tautologies.** Say what's true.
4. **Active voice, concrete verbs.** Not "production claims remain locked" — "We're not yet ready for production funds."
5. **Numbers and names beat adjectives.** Not "constrained lane" — "USDC-only."
6. **Average sentence length ≤ 14 words.** Current is closer to 22.

### Concrete rewrites

**Home page hero.** Current: *"Make supported Solana activity less public."* (6) + *"Vanta helps users move supported assets out of public wallet trails, use supported private actions, and return to public wallets when needed."* (24). → *"Make your Solana wallet less public."* (6) + *"Vanta seals your assets in a private balance. Send, swap, and exit when you want to."* (16). "Supported" appears 3×; cut to zero.

**Home page product points.** Current 57 words across four bullets, hedge-laden. → 37 words:

- **Seal.** *"Move USDC, SOL, and stablecoins into the Vault."*
- **Send.** Future-state sample after verifier/shared-pool/relayer gates: *"Pay anyone without exposing the amount or your wallet history."*
- **Pay.** *"Accept stablecoin payments. Issue verifiable receipts."*
- **Exit.** Future-state sample after proof-authorized custody and exit-routing gates: *"Withdraw to any wallet when you choose to leave."*

**App dashboard trust hero.** Current 27 words with 7 Vanta-specific terms. → *"What Vanta can prove today"* (h2, 5 words) + *"You can shield, send, swap, and exit on test funds. Public mainnet support is gated on the trust contracts below."* (21).

**Pay page hero.** Current 18-word sentence + three redundant badges. → *"Pay"* + *"Accept stablecoin payments. Every payment issues a Letter — a receipt your customer and your accountant can verify without seeing the rest of your books."* (25) + single badge *"Test mode — no funds move."*

**Docs home.** Current 73 words across hero + beta note. → Future-state docs sample after verifier/shared-pool/relayer gates: *"Vanta is private settlement for Solana."* + *"Move stablecoins into the Vault. Send, swap, and exit privately. Give counterparties a receipt they can verify."* + *"Vanta is in beta. We label what's live and what isn't."*

**SystemStatusStrip.** Current leads with *"6/6 lane claims locked."* → Safe current framing: *"Beta · receipts where available · 6 claim locks active"*. The stronger *"Beta · receipt-backed · 6 lanes verified"* sample is future-state only until the lane-verification/live-evidence gates exist.

**Codex status, 2026-05-13 copy-clarity pushback:** the copy direction is accepted, but the broad sample rewrites above are not current product copy because they would overclaim today's privacy. Commit `8ac1586` replaces the home hero with "Make Solana settlement less public", rewrites the supporting copy around selected assets, current lanes, and verifiable receipts, changes the status strip to lead with "Beta · receipts where available · 6 claim locks active", and compresses repeated Pay disclaimers to "Test receipt only" / "production privacy not enabled". The stronger "pay anyone without exposing", "withdraw to any wallet", "exit privately", "chain sees not what/who", and "6 lanes verified" formulations remain future-state examples until the verifier, shared anonymity tree, relayer, custody, live evidence, and audit gates support them. Guards: `npm run truth:privacy-claim-gate`, `npm run landing:browser-check`, `npm run pay:browser-check`, `npm run product-ui:browser-check`, `npm run zk:feedback-loop-check`, and `npm run build`.

**Shield asset helpers.** *"Vanta will shield SOL directly so it remains SOL in shielded state."* (12, tautological) → *"Shield SOL into private SOL."* (5).

**Send empty state.** *"No shielded funds ready to send. Shield first, then send from the private balance."* → *"Empty Vault. You haven't sealed anything yet. Start with Shield."*

**Codex status, 2026-05-13 copy-clarity follow-up:** commit `f3d5135` locally implemented the safe current subset of the Shield helper and Send empty-state rewrites without adopting the future-state "private SOL" / "sealed" wording as a production privacy claim. Direct Shield route copy now says "Shield SOL directly into Vanta" / "Shield [asset] directly into Vanta", unsupported Shield targets say they need a configured Shield target first, Send's empty state says "Empty Vault" and "No send-ready balance yet", pricing names the current charged surfaces instead of "supported action", and Pay/Strategy/lane readiness labels avoid claim-lock jargon outside the canonical status strip. Final focused guards run locally: `npm run shield:capability-check`, `npm run shield:ui-claim-boundary-check`, `npm run send:requires-shielded-state-check`, `npm run send:production-privacy-claim-gate`, `npm run swap:capability-check`, `npm run lanes:trust-contract-check`, `npm run pricing:contract-check`, `npm run pay:doc-truth-check`, `npm run pay:contract-check`, `npm run pay-tab:copy-check`, `npm run strategy-tab:copy-check`, `npm run strategy:private-rail-trust-contract-check`, `npm run docs:source-of-truth-check`, `npm run docs:browser-check`, `npm run product-ui:browser-check`, `npm run truth:privacy-claim-gate`, `npm run zk:feedback-loop-check`, `npm run build`, and `git diff --check`.

### What 20× clarity looks like in aggregate

Home page sample:

| Section | Current | Rewritten | Reduction |
|---|---|---|---|
| Hero h1 + p | 30 | 22 | -27% |
| 4 product points | 57 | 37 | -35% |
| Subheading + 6 link labels | 28 | 14 | -50% |
| **Total** | **115** | **73** | **-37%** |

Estimated across the site: Home -37%, App dashboard -45%, Pay -40%, Docs -30%, Shield/Send/Swap/Unshield heroes -50%, SystemStatusStrip -40%. Average ~40% word reduction with no information loss — 1.7× more concise per page.

Applied to *every new line of copy* going forward, the effect compounds. Every page someone reads at 1.7× the comprehension speed leaves them more able to absorb the next.

### The single rule that does most of the work

**Delete the word "supported" wherever it appears as a vague product-copy hedge.**

Keep `supported` where it names a typed capability, status, operator contract field, or intentionally frozen lane. Delete it when it only means "things we have today" without telling the reader which thing.

`grep -rn "supported" src/pages/*.tsx` returns 30+ matches. In every case it's a defensive hedge — "supported assets," "supported lanes," "supported private actions," "supported destinations." Readers get no information from "supported"; they only get the apologetic tone.

Replace with specifics where the constraint matters ("USDC and SOL") or delete where context makes it clear. One regex, one cleanup pass, dramatic improvement.

Second-place rule: **delete every sentence using both "claim" and "locked" or "gated."** Those are disclaimer-in-product-copy; they belong only in `SystemStatusStrip` and `SECURITY_LIMITATIONS.md`.

---

## How privacy and clarity reinforce each other

The privacy work and the copy work are not separate. A product whose copy says "production privacy claims remain locked" needs that copy because the privacy isn't real yet. As the privacy work in Part 1 lands, the copy stops apologizing.

- After **V4** (shared anonymity tree): "anonymity set not proven" → "your privacy depends on N other users — live count on the home page."
- After **V2** (Groth16 verifier on chain): operator-trust disclaimers shrink to a footnote.
- After **V8** (customer-side ZK proof in Pay): the merchant page drops "test mode" framing for the customer flow, replaces it with "your customers' wallets are never linked to your merchant account."

End state: *"Vanta seals your assets into a private balance. Send, swap, pay, and exit privately. The chain sees that you moved, not what you moved or who you moved it to."* Every word cryptographically true.

## Order to ship in

**Week 1 — copy:** apply six editorial rules across all pages. Delete every defensive "supported." Collapse disclaimer chips into SystemStatusStrip. Rewrite home hero and product points. **2 days of focused editing, ships immediately.**

**Weeks 2-3 — V1 + V2:** prover + on-chain verifier. After this, "no proof verification" disclaimers become removable.

**Weeks 4-6 — V4:** the privacy multiplier. "Anonymity set not proven" becomes a live depth oracle.

**Weeks 7-9 — V5 + V6 + V7:** denominations + batching + relayer. After this, "Vanta transactions are privacy-preserving against chain-analytic adversaries" is defensible.

**Weeks 10-12 — V3 + V8:** PDA vault + customer-side Pay proof.

**Weeks 13-16 — V9 + V11 + V12:** forward secrecy + public oracle + Privacy Pools.

**Weeks 17+ — V10:** cross-asset swap privacy. Hardest; defer until rest lands.

By week 12: **credibly private** end-to-end. By week 16: **defensibly private** in compliance and resilience terms. By week 17+: **fully private** including cross-asset.

Paired with copy work front-loaded in week 1, by month 4 the deployed product has both the cryptographic substance and the editorial clarity that make it the obvious choice for merchants and users who actually care about privacy.

20× the privacy and 20× the clarity, shipped in 90-100 days against current velocity.

The hardest items remaining are V4 and V5 — the on-chain anonymity tree and denomination obfuscation. Both are bounded engineering work, not research.

---

# Pay and Strategy Redesign — Progressive Disclosure

The Pay and Strategy tabs in their current form are too dense for their target audiences. Both pages ask the user to make 8-11 decisions simultaneously, surface jargon ("slice policy," "timing policy," "settlement preview controls," "counterparty-facing truth surface"), and bury the primary action under panels of contextual information. A first-time merchant or first-time trader bounces before completing the form.

The fix is the same for both pages: **one decision per screen, opinionated defaults that work for 80% of users, an "Advanced" disclosure that exposes the rest.** Capability is preserved. Privacy is preserved. The dense form moves from the front door to a side panel.

## Why this matters

A product's front door should ask **one question**. Not eleven. The eleven exist; they live inside.

- Stripe's front door asks "How much do you want to charge?" Everything else is in the dashboard.
- Cash App asks "Pay or request?" Everything else is in settings.
- Robinhood asks "Buy or sell?" Every advanced order type is one tap away but invisible by default.

Vanta Pay's front door should ask "What are you charging?" Vanta Strategy's front door should ask "What are you trying to do?" The current pages ask all the questions at once, and the user — correctly — bounces.

## Pay redesign

### Current state

`src/pages/PayPage.tsx` (835 lines) renders six panels on first load: hero with three disclaimer badges, merchant demo card, request builder with 8+ fields, review card, status panel, next-actions workspace, record panel. A merchant takes ~25 taps to send their first payment link.

### Target state

A merchant takes 6 taps total. Three fields, one button:

```
[Thin merchant identity strip: merchant name, "Test mode" pill]

         What are you charging for?

         $  50.00      [USDC ▾]

         For (optional): _____________________

         [   Create payment link   ]
```

After clicking:

```
✓ Created

  Send this link to your customer:
  vantaprivacy.xyz/pay/cs_a1b2c3...
  [Copy]  [QR code]

  Status: Waiting for payment
```

### File-by-file changes

Split `src/pages/PayPage.tsx` into four files:

- **`src/pages/PayPage.tsx`** (~150 lines, replaces current). Renders only: merchant identity strip, three-field create form (amount, asset, optional description), single primary button. Shows a thin "Recent payments" strip below the fold with the last 5 transactions; clicking one opens `<PayReceiptModal>`. After creating a link, the form replaces with a confirmation card showing the link, a Copy button, and a QR code.
- **`src/pages/PaySettingsPage.tsx`** (~200 lines, new). Route: `/app/pay/settings`. Houses: line items configuration, checkout type (hosted/embedded/modal), success URL, cancel URL, branding, payout destination. Reuses the existing form-field components from PayPage.
- **`src/pages/PayDeveloperPage.tsx`** (~200 lines, new). Route: `/app/pay/developer`. Houses: API keys, webhook endpoints and signing secret, recent webhook deliveries, recent API calls. The existing webhook-signing logic in `vantaPayRuntime.ts` doesn't change; only its UI surface moves.
- **`src/components/PayReceiptModal.tsx`** (~150 lines, new). The receipt detail view, opened from the recent-payments list. Renders the receipt as the Letter PDF preview (per the taste pass T5). Eventually exports as a real PDF via `@react-pdf/renderer`.

Route additions in `src/App.tsx`:

```tsx
<Route path="/app/pay" element={<PayPage />} />
<Route path="/app/pay/settings" element={<PaySettingsPage />} />
<Route path="/app/pay/developer" element={<PayDeveloperPage />} />
```

A small in-page tab strip on the Pay route lets the merchant move between Create / Settings / Developer. Default tab is Create.

### What's preserved

- **Receipt privacy contract** (`vantaPayReceiptPrivacyContract.ts`): unchanged. The Letter is still generated with every settled payment.
- **Settlement adapter** (`vantaPayPrivateSettlementAdapter.ts`): unchanged. Economics commitments still hide raw values from the operator.
- **Customer-side ZK proof flow (V8)**: plugs in at `/pay/cs_...` on the customer's side. Invisible to the merchant.
- **Webhook signing** (HMAC-SHA256, `t=ts,v1=sig` header): unchanged. Lives in PayDeveloperPage now.
- **Idempotency keys**: unchanged.
- **All checkout types** (hosted/embedded/modal): exposed in Settings, configurable once.
- **Test-mode badging**: collapsed to a single pill in the merchant identity strip. The other two badges' content moves to the `SystemStatusStrip` (already shared across the app).

Effort: 3-5 days of focused work. Mostly file moves, route additions, and stripping disclaimer copy.

## Strategy redesign

### Current state

`src/pages/StrategyPage.tsx` (570 lines) renders a form with 11+ fields: mode (Stealth DCA / Private TWAP), side, asset, totalSize, timeWindow, slicePolicy (4 options), timingPolicy (4 options), urgency (3 options), landingMode (3 options), maxSlippage, fundingSource (3 options), destination (3 options). Plus a hash-bound packet preview panel and lane-disclaimer badges.

Each field uses jargon a non-trader won't recognize: "slice policy," "timing policy," "landing mode," "funding source." Even traders don't think in these terms.

### Target state

Three inline-form decisions. One sentence form. One button:

```
[Thin nav, test-mode pill]

         What are you trying to do?

         Buy  [SOL ▾]  worth  $ [10,000]  over  [24 hours ▾]

         Vanta splits this into smaller trades over the window
         and settles to your private balance.

         [   Preview strategy   ]

         ▸ Advanced settings (slippage, timing, destination)
```

After clicking Preview:

```
[Strategy preview]

  24 trades, ~$416 each
  Every ~60 minutes ± 17 minutes
  Completes by tomorrow 6:42 PM
  Settles to: Private balance

  [Horizontal timeline: 24 tick marks across the window,
   sized by notional, colored by readiness]

  [Cancel]   [Start strategy]
                ^ disabled in beta with a clear inline note
```

### File-by-file changes

- **`src/pages/StrategyPage.tsx`** (~100 lines, replaces current). The three-field inline form: side+asset, amount, time window. One explanatory sentence below the form. One primary button. A collapsed `<StrategyAdvancedPanel>` below.
- **`src/components/StrategyAdvancedPanel.tsx`** (~150 lines, new). Collapsible disclosure containing the remaining 8 fields. **Rename every label to plain English:**
  - `slicePolicy` → "Trade size variation" (currently displays "Randomized sizing / Fixed count / Min/max child size / Venue threshold")
  - `timingPolicy` → "Schedule pattern" (currently "Randomized cadence / Evenly spaced / Volatility-aware / Liquidity-aware")
  - `urgency` → "How fast to complete" (currently "Low footprint / Balanced / Fastest completion")
  - `landingMode` → "Submit method" (currently "Protected landing / Bundle-preferred / Standard")
  - `fundingSource` → "Pay from" (currently "Connected wallet / Public wallet balance / Vanta private balance")
  - `destination` → "Settle to" (currently "Vanta private balance / Connected wallet / Treasury wallet")
  - `maxSlippage` → "Max slippage"
- **`src/components/StrategyTimelinePreview.tsx`** (~150 lines, new). Renders the strategy as a horizontal timeline with one tick per child order, sized by notional, colored by readiness. Replaces the current "hash-bound packet preview" panel with a human-readable visualization. Same data, different surface.
- **Rename the user-facing labels** in `src/strategy/strategyPageState.ts`: keep the internal codenames (Stealth DCA / Private TWAP) but consider renaming the user-facing strings. The mode toggle can disappear from the front door entirely — infer mode from inputs, or show it only in Advanced.

### What's preserved

- **The planner** (`strategyPlanner.mjs`): unchanged. Same `createStrategyPlan(input)` API; the inputs come from Advanced if non-default.
- **The execution adapter** (`strategyExecutionAdapter.mjs`): unchanged.
- **The runtime** (`strategyRuntime.mjs`): unchanged, including the fail-closed gate on `liveSubmission`.
- **The trust contract** (`strategyPrivateRailTrustContract.ts`): unchanged. The redacted handoff still produces commitments-only operator packets.
- **All 11+ form fields**: still exist, in Advanced. Power users override every default. Default users never see them.
- **The hash-bound packet preview**: same data, rendered as the human-readable timeline + summary block. The `StrategyPrivateRailOperatorPacket` shape is unchanged.

Effort: 3-5 days of focused work, mostly UI restructuring and label rewriting.

## Navigation reorganization

A separate but related question: should Pay and Strategy be peer tabs in `AppLayout`'s primary nav today?

The honest answer is probably not. Current `AppLayout.tsx` renders Shield / Send / Swap / Strategy / Unshield / Pay as six peer tabs. The framing is "Vanta has six products." The reality is:

- Shield, Send, Swap, Unshield are the core wallet flows. Live (preview, cryptographic work in flight). These are the product today.
- Pay has a real API surface, but the in-app UI is currently a developer console; the customer-side flow (V8) doesn't exist yet.
- Strategy has a real planner, but the runtime fail-closes on `liveSubmission`. The in-app UI is genuinely preview-only.

Recommended change in `src/components/AppLayout.tsx`:

```tsx
const appLinks = [
  { to: "/app/shield", label: "Shield", action: "Add funds" },
  { to: "/app/send", label: "Send", action: "Send shielded" },
  { to: "/app/swap", label: "Swap", action: "Swap shielded" },
  { to: "/app/unshield", label: "Unshield", action: "Move out" },
];

const moreLinks = [
  { to: "/app/pay", label: "Pay", action: "Get paid" },
  { to: "/app/strategy", label: "Strategy", action: "Plan trades" },
  { to: "/app/launch", label: "Launch", action: "Coming soon" },
];
```

Renders four peer tabs (the wallet flows) and a "More" menu containing Pay, Strategy, Launch. Discoverable in one click. No implicit promise that Pay and Strategy are first-class user products in their current state.

When the customer-side Pay flow (V8) ships and Strategy's runtime actually executes live, both can be promoted back to peer tabs. That promotion becomes a real product moment — "Pay is live" / "Strategy is live" — instead of having both quietly disappoint users for months.

Effort: ~half a day. Add a `<MoreMenu>` component to `AppLayout`; move two entries from `appLinks` to `moreLinks`.

**Codex status, 2026-05-13 AppLayout nav reorganization:** locally implemented the first product-truth slice from this UX feedback. `src/components/AppLayout.tsx` now keeps Shield, Send, Swap, and Unshield as the primary app tabs while Pay, Strategy, and Launch live in an accessible More menu with active-route state, Escape/outside-click dismissal, and direct links to the existing routes. `scripts/check-vanta-app-layout-nav.mjs` and `npm run app:layout-nav-check` guard that Pay and Strategy stay out of the primary tabs until their production/user-facing gates justify promotion; the guard is also included in `npm run truth:privacy-claim-gate`. This does not claim Pay or Strategy readiness, does not change their underlying privacy/proof/runtime state, and does not promote any production-private claim.

**Codex status, 2026-05-13 Pay progressive-disclosure slice:** commit `7175dae` locally implements the next safe Pay front-door slice without the full route/file split. `src/pages/PayPage.tsx` now collapses the three hero beta badges into one compact `Test mode - no production funds moved - test receipt only` pill, keeps the first-load form to `Description`, `Amount`, `Asset`, and `Create payment request`, and moves `Customer email` plus hosted/embedded/modal `Checkout type` controls behind `Advanced payment settings`. `scripts/check-vanta-pay-browser.mjs` now proves the advanced controls are hidden before the disclosure opens, visible after opening, and still work through checkout creation and receipt generation. The Pay doc/copy guards were updated to treat the advanced disclosure as the preserved capability surface, and the stale committed-checkout acceptance guard now expects the current Solana spend account-ref gate before `npm run pay:verify` continues. Verified locally with `npm run pay-tab:copy-check`, `npm run pay:doc-truth-check`, `npm run app:layout-nav-check`, `npm run pay:browser-check`, `npm run product-ui:browser-check`, `npm run truth:privacy-claim-gate`, `npm run pay:contract-check`, `npm run pay:committed-checkout-acceptance-check`, `npm run pay:verify`, `npm run build`, and `git diff --check`. This improves Pay first-use ergonomics and guard coverage only; it is not Pay production readiness, not customer-side ZK Pay proof V8, not live mainnet private settlement, not a production private-rail launch, not pushed, and not live-deployed.

**Codex status, 2026-05-14 PayReceiptPacketCard slice:** commits `de0d4fb` and `5c32497` locally implement the receipt packet UI redesign as a dedicated `src/components/PayReceiptPacketCard.tsx` plus a beta-safe `/receipt/:receiptId` preview route. The card now uses only `VantaPayReceiptPublicView` plus the receipt privacy contract, shows the merchant brand, amount, status, redacted private-rail/audit references, buyer/merchant/privacy rows, `Copy share link`, `Print receipt`, a QR-preview block, and a local `/receipt/<id>` verifier path shaped for the future `vantaprivacy.xyz/receipt/<id>` public path without claiming that public verifier is deployed. `scripts/check-vanta-pay-browser.mjs` failed red-first on the missing component, then gained source guards and browser assertions for the card selectors, share/print controls, printable review text, redacted references, and beta claim boundary. The Pay receipt privacy, tab copy, and lane trust guards now follow the extracted card instead of requiring the receipt packet rows inline in `PayPage`. Verified locally with `npm run pay:receipt-public-view-check`, `npm run pay:receipt-privacy-contract-check`, `npm run pay-tab:copy-check`, `npm run pay:browser-check`, `npm run product-ui:browser-check`, `npm run pay:doc-truth-check`, `npm run pay:committed-checkout-acceptance-check`, `npm run truth:privacy-claim-gate`, `npm run build`, `npm run pay:verify`, and `git diff --check`. This is a shareable/printable local test receipt artifact and guard-hardening slice only; it is not Pay production readiness, not customer-side ZK Pay proof V8, not a live/public receipt verification deployment, not live mainnet private settlement, not a production private-rail launch, not pushed, and not live-deployed.

**Codex status, 2026-05-13 Strategy progressive-disclosure slice:** commit `cc99583` locally implements the next safe Strategy front-door slice without changing `createStrategyPlan`, the execution adapter, runtime, or private-rail trust packet shape. `src/pages/StrategyPage.tsx` now opens with `What are you trying to do?`, keeps the first-load form to side, asset, amount, and duration, changes the production CTA to `Preview strategy`, and moves the DCA/TWAP mode toggle plus policy/funding/destination controls behind `Advanced strategy settings`. The advanced controls keep the same state fields but now use plain-English labels: `Trade size variation`, `Schedule pattern`, `How fast to complete`, `Submit method`, `Pay from`, and `Settle to`. `scripts/check-vanta-strategy-tab-copy.mjs` and `scripts/check-vanta-strategy-browser.mjs` now prove those advanced controls are hidden before opening, visible after opening, and still usable when selecting `Public wallet`; `scripts/check-vanta-strategy-page-state.mjs` pins the `Preview strategy` CTA. Verified locally with `npm run strategy:page-state-check`, `npm run strategy-tab:copy-check`, `npm run strategy:browser-check`, `npm run strategy:private-rail-trust-contract-check`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run build`, `git diff --check`, and `npm run strategy:verify`. This improves Strategy first-use ergonomics and guard coverage only; it is not Strategy production readiness, not live strategy execution, not live mainnet private settlement, not a production private-rail launch, not pushed, and not live-deployed.

**Codex status, 2026-05-14 StrategyAdvancedPanel extraction:** commit `5480e0d` locally extracts the recommended `src/components/StrategyAdvancedPanel.tsx` while preserving Strategy-owned form state, planner/runtime inputs, preview ledger/timeline rendering, private-rail trust packet shape, and live-execution fail-closed boundaries. The component owns the `Advanced strategy settings` disclosure, DCA/TWAP visual mode toggle, disabled `Coming soon` option rendering, max-slippage field, and plain-English advanced labels; `StrategyPage` keeps the first-load strategy form and preview orchestration. `scripts/check-vanta-strategy-tab-copy.mjs` now fails if Strategy advanced controls move back inline or the stable `data-vanta-strategy-advanced-panel` selector disappears, and `scripts/check-vanta-strategy-page-state.mjs` follows the extracted select helper so disabled advanced options stay visible and disabled. Red-first verification failed before the component existed with `Strategy advanced controls must live in src/components/StrategyAdvancedPanel.tsx`; after implementation, verification passed locally with `npm run strategy:page-state-check`, `npm run strategy-tab:copy-check`, `npm run strategy:browser-check`, `npm run strategy:private-rail-trust-contract-check`, `npm run truth:privacy-claim-gate`, `npm run build`, `npm run strategy:verify`, `npm run zk:review-findings-ledger-check`, `npm run zk:feedback-loop-check`, and `git diff --check`. This is shared UI extraction and guard hardening only; it is not Strategy production readiness, not live strategy execution, not a scheduler/runtime change, not a production private-rail launch, not live mainnet private settlement, not pushed, and not live-deployed.

## The single rule

A product's front door asks one question. Not eleven.

For Pay: "What are you charging?" Three fields. One button.
For Strategy: "What are you trying to do?" Three fields. One button.

Everything else is real and exposed — in Settings, in Advanced, in Developer. The capability is the same. The privacy is the same. The first impression is completely different.

## Combined effort

| Change | Effort | Risk |
|---|---|---|
| Split PayPage into four files | 3-5 days | Low |
| Strip PayPage hero copy + badges | 0.5 day | Low |
| Build StrategyAdvancedPanel + rename labels | 2-3 days | Low |
| Build StrategyTimelinePreview component | 2 days | Low |
| Strip StrategyPage hero copy | 0.5 day | Low |
| Reorganize AppLayout nav (More menu) | 0.5 day | Low |
| **Total** | **~2 weeks for one developer** | **Low** |

No cryptography changes. No privacy regression. No capability loss. The dense forms still exist for the users who need them; they just stop being the first thing every new user sees.

## What this unblocks

After this work lands:

1. **First-time merchants** can take a test payment in 6 taps. They'll actually try it.
2. **First-time traders** can preview a Stealth DCA in 4 taps. They'll actually try it.
3. **Power users** still have every field they had before, one click away in Advanced or Settings.
4. **The main nav stops promising features that aren't yet real** for the user — Strategy and Pay live in More until they're ready to be promoted.
5. **The trust-contract and privacy work** is unaffected. Same code paths, same operator boundaries, same circuits.

This is one of the highest-leverage UX changes in the entire review. The fields exist because the product needs them; the front door doesn't have to show them.

---

# Shield, Send, Swap, Unshield Redesign — Same Pattern, All Four Lanes

The four wallet-flow pages have the same problem as Pay and Strategy: dense forms with too many simultaneously-visible fields, helper text that runs 8-12 lines deep, recovery/viewing-key/approval-review panels embedded in the main flow instead of separated out. The pages are large (Shield 2,157 lines, Send 2,692, Swap 1,667, Unshield 3,232) because they're trying to handle every state on one screen.

The fix is identical to the Pay/Strategy redesign: **one question on the front door, opinionated defaults, advanced fields in a side panel.** The shared shape across all four lanes lets us extract reusable components that get built once and used four places.

## What's distinctive about each lane

| Lane | Front-door question | Required fields |
|---|---|---|
| Shield | "What are you shielding?" | Amount + asset (target is inferred) |
| Send | "Send to whom?" | Recipient + amount (note picker via shared component) |
| Swap | "Swap what for what?" | From asset + to asset + amount (quote computed) |
| Unshield | "Withdraw how much?" | Amount (destination locked to self today; note picker shared) |

Two to three fields each. Today each page renders 8-12 visible fields on first load. The reduction is the same shape across all four.

## Cross-cutting components — build once, use four places

Before the per-lane work, six shared components emerge from the redesign. Each is built once and used across at least three lane pages. Building them first reduces per-lane effort substantially.

- **`<AssetPickerGrid>`** (~120 lines, new). Token-logo pill grid replacing every `<select>` for asset selection. Used in Shield (source + target), Swap (input + output). Disabled states for unsupported pairs. Loading shimmer for unloaded logos.
- **`<NotePicker>`** (~150 lines, new). Pick which input note to spend from the user's vault. Renders as a list of note cards with amount, age, asset. Used in Send, Swap, Unshield. Includes empty-state ("Empty Vault — start with Shield").
- **`<WalletApprovalSheet>`** (~200 lines, new). Slide-over that shows exactly what the user is about to sign — instructions, accounts, amounts, fee estimate. Replaces the inline `<details className="shield-approval-review">` accordion pattern in every lane. Used during the awaiting-confirmation state in Shield, Send, Swap, Unshield. Safety win: users pre-read what they're signing.
- **`<RecoveryPanel>`** (~180 lines, new). Viewing key creation, backup, import. The shared panel is now rendered through `RecoveryPanelController`, remains available in Shield for first-time setup, and is also surfaced at `/app/settings/recovery`.
- **`<LaneFlowIndicator>`** (~80 lines, promoted from per-page). The `Shield → Send → Hold change` indicator already exists inline on SendPage. Extract to a shared component used across all four lanes plus Pay. Animate the active step with a gentle horizontal sweep light.
- **`<TransactionStatusToast>`** (~150 lines, new). Pending → confirmed → complete states for any submitted transaction. Slide-in toast bottom-right, persistent until dismissed or 8s timeout. Used universally; replaces the per-page status banners that today live above the form.

Total shared-component effort: **~5-7 days** for one developer. After this, per-lane work compresses substantially.

**Codex status, 2026-05-13 shared NotePicker slice:** commit `fdf2fd8` locally implements the first shared component from this cross-cutting list. `src/components/NotePicker.tsx` now owns the common advanced note-selection control for Send, Swap, and Unshield, including a stable select, note cards with tabular amounts, and an `Empty Vault` state that points users to start with Shield. `src/pages/SendPage.tsx`, `src/pages/SwapPage.tsx`, and `src/pages/UnshieldPage.tsx` all use the shared picker inside their advanced disclosures while preserving the existing behavior: Send clears amount when the selected note changes, Swap still fills the exact source-note amount and requires exact-note execution, and Unshield still prefills USDC exits from the selected ledger-spendable note while preserving exact/split-note release rules. `scripts/check-vanta-shared-note-picker.mjs` and `npm run notes:shared-picker-check` guard the component, page usage, empty-state copy, CSS, and inclusion in `npm run truth:privacy-claim-gate`; the lane source guards now also require `NotePicker`. Verified locally with red-first `npm run notes:shared-picker-check` failure before the component existed, then `npm run notes:shared-picker-check`, `npm run send:requires-shielded-state-check`, `npm run swap:requires-shielded-state-check`, `npm run unshield:public-exit-surface-check`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run build`, `npm run send:verify`, `npm run swap:capability-check`, `npm run swap:committed-settlement-check`, `npm run private-core:swap-check`, `npm run unshield:balance-ledger-check`, `npm run unshield:trust-packet-check`, `npm run private-core:unshield-committed-settlement-check`, and `git diff --check`. This is shared UI/control extraction and guard hardening only; it is not the full four-lane redesign, not `AssetPickerGrid`, not `WalletApprovalSheet`, not `RecoveryPanel`, not `LaneFlowIndicator`, not `TransactionStatusToast`, not a receipt modal, not a new privacy guarantee, not production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-13 shared LaneFlowIndicator slice:** commit `9a9ed7f` locally implements the next shared component from this list. `src/components/LaneFlowIndicator.tsx` now owns the lane-step presenter, active-step state, accessible `aria-label` / `aria-current` surface, and active-step horizontal sweep animation with reduced-motion handling. `src/pages/ShieldPage.tsx`, `src/pages/SendPage.tsx`, `src/pages/SwapPage.tsx`, and `src/pages/UnshieldPage.tsx` use the shared component across the four core private-settlement lanes; Pay and Strategy also use it so their existing inline flow indicators do not remain a parallel pattern. Shield and Swap gained the missing visible flow rhythm without changing proof, quote, wallet approval, settlement, receipt, or operator behavior; Pay preserves its zero-active draft state and multi-active settlement-complete state. `scripts/check-vanta-shared-lane-flow-indicator.mjs` and `npm run lanes:shared-flow-indicator-check` guard the shared component, page adoption, CSS animation/reduced-motion markers, and inclusion in `npm run truth:privacy-claim-gate`; `scripts/check-vanta-product-ui-browser.mjs` now browser-checks the flow indicators on desktop and narrow mobile widths. Verified locally with red-first `npm run lanes:shared-flow-indicator-check` failure before the component existed, then `npm run lanes:shared-flow-indicator-check`, `npm run shield:viewing-key-custody-check`, `npm run shield:ui-claim-boundary-check`, `npm run send:requires-shielded-state-check`, `npm run swap:requires-shielded-state-check`, `npm run unshield:public-exit-surface-check`, `npm run pay:browser-check`, `npm run strategy:browser-check`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run build`, and `git diff --check`. This is shared UI/visual-rhythm extraction and guard hardening only; it is not the full four-lane redesign, not `AssetPickerGrid`, not `WalletApprovalSheet`, not `RecoveryPanel`, not `TransactionStatusToast`, not a receipt modal, not a new privacy guarantee, not production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-13 shared AssetPickerGrid slice:** commit `a5ceae5` locally implements the asset-selection component from this cross-cutting list. `src/components/AssetPickerGrid.tsx` now owns the token-logo fallback, loading shimmer, selected/disabled state, balance/status metadata, and disabled-reason surface for asset choices. `src/pages/ShieldPage.tsx` uses it for source asset selection and the read-only target asset preview while preserving universal target resolution, route truth, and the intentional no-manual-Shield-target-selection boundary. `src/pages/SwapPage.tsx` uses it for input/output shielded asset choices while preserving shielded-state source filtering, exact-note execution, quote clearing, operator-visible copy, unsupported-pair disabled states, and the `No shielded assets ready` empty state. `scripts/check-vanta-shared-asset-picker-grid.mjs` and `npm run assets:picker-grid-check` guard the shared component, Shield/Swap adoption, CSS, legacy asset-select removal, and inclusion in `npm run truth:privacy-claim-gate`; `scripts/check-vanta-product-ui-browser.mjs` now browser-checks the asset grids on desktop and narrow mobile widths. Verified locally with red-first `npm run assets:picker-grid-check` failure before the component existed, then `npm run assets:picker-grid-check`, `npm run shield:asset-labels-check`, `npm run shield:capability-check`, `npm run shield:universal-target-check`, `npm run shield:ui-claim-boundary-check`, `npm run swap:requires-shielded-state-check`, `npm run swap:capability-check`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run build`, `npm run swap:committed-settlement-check`, `npm run private-core:swap-check`, `npm run shield:verify`, and `git diff --check`. This is shared UI/control extraction and guard hardening only; it is not the full four-lane redesign, not manual Shield target selection, not `WalletApprovalSheet`, not `RecoveryPanel`, not `TransactionStatusToast`, not a receipt modal, not a new privacy guarantee, not production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-13 shared WalletApprovalSheet slice:** commit `3c597a8` locally implements the wallet approval review component from this cross-cutting list. `src/components/WalletApprovalSheet.tsx` now owns the consistent wallet-prompt review layout, signing-mode pill, bounded row list, notes, and truth-boundary copy for awaiting-confirmation states. `src/pages/ShieldPage.tsx` and `src/pages/UnshieldPage.tsx` replace the duplicated `<details className="shield-approval-review">` approval accordions with the shared sheet while preserving the Umbra-derived approval rows; `src/pages/SendPage.tsx` and `src/pages/SwapPage.tsx` now expose their local wallet-approval summaries during confirmation without changing safe-send, memo, spent-marker, operator, quote, proof, or settlement behavior. `scripts/check-vanta-wallet-approval-sheet.mjs` and `npm run wallet:approval-sheet-check` guard the component, all four lane usages, CSS markers, legacy inline approval-row removal, and inclusion in `npm run truth:privacy-claim-gate`. Verified locally with red-first `npm run wallet:approval-sheet-check` failure before the component existed, then `npm run wallet:approval-sheet-check`, `npm run shield:safe-send-adoption-check`, `npm run send:safe-send-adoption-check`, `npm run swap:safe-send-adoption-check`, `npm run unshield:safe-send-adoption-check`, `npm run wallet:browser-signing-safety-check`, `npm run build`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, and `git diff --check`. This is shared UI/safety-review extraction and guard hardening only; it is not the full four-lane redesign, not a wallet simulation engine, not a fee estimator, not `RecoveryPanel`, not `TransactionStatusToast`, not a receipt modal, not a new privacy guarantee, not production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 shared RecoveryPanel slice:** commit `6b3e79a` locally implements the recovery/viewing-key component from this cross-cutting list. `src/components/RecoveryPanel.tsx` now owns the advanced Shield recovery disclosure layout for viewing-key backup/restore/reset, non-secret record-source packet export/import verification, owner recovery evidence, record-source import proof, and legacy quarantine policy. `src/pages/ShieldPage.tsx` keeps the state, hooks, record-source handlers, and viewing-key mutations lane-owned while rendering the shared panel; the native SOL recovery strip remains intentionally inline and `/app/settings/recovery` remains a future route slice. `scripts/check-vanta-recovery-panel.mjs` and `npm run recovery:panel-check` guard the component, Shield adoption, legacy inline panel removal, CSS markers, truth-gate wiring, and `shield:verify` wiring; existing owner-context and viewing-key guards now follow the shared component. `scripts/check-vanta-product-ui-browser.mjs` opens the Shield recovery disclosure and checks recovery controls render without overflow. Verified locally with red-first `npm run recovery:panel-check` failure before the component existed, then `npm run recovery:panel-check`, `npm run shield:viewing-key-custody-check`, `npm run shield:viewing-key-ui-check`, `npm run zk:owner-context-record-source-import-check`, `npm run zk:owner-context-legacy-quarantine-policy-check`, `npm run shield:native-sol-check`, `npm run shield:ui-claim-boundary-check`, `npm run build`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run shield:verify`, and `git diff --check`. This is UI extraction and guard hardening only; it is not `/app/settings/recovery`, not native SOL recovery extraction, not production-private recovery, not automatic migration, not complete cross-device recovery, not a new privacy guarantee, not production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 Recovery settings route slice:** commit `3f376ba` locally implements the `/app/settings/recovery` follow-up without changing Shield routing, proof, settlement, memo encryption, native SOL recovery, viewing-key crypto, owner-context evidence semantics, or record-source import policy. `src/components/RecoveryPanelController.tsx` now owns the reusable viewing-key backup/restore/reset and non-secret record-source export/import/verify state that had lived directly in `ShieldPage`; `ShieldPage` still calls `useVantaShieldViewingKey()` for Shield memo construction and passes those controls into the controller so inline first-time setup stays in sync. `src/pages/RecoverySettingsPage.tsx` adds a dedicated beta-truthful settings route with the panel open by default, and `AppLayout` surfaces it from More as `Recovery · Keys & records`. New guard `npm run recovery:settings-route-check` is wired into `npm run truth:privacy-claim-gate` and `npm run shield:verify`; recovery, owner-context, nav, route-code-split, and product-browser guards now follow the controller/route boundary. Verified locally with red-first `node scripts/check-vanta-recovery-settings-route.mjs` before the controller/page existed, then `npm run recovery:settings-route-check`, `npm run recovery:panel-check`, `npm run shield:viewing-key-custody-check`, `npm run zk:owner-context-record-source-import-check`, `npm run zk:owner-context-recovery-evidence-check`, `npm run zk:owner-context-legacy-quarantine-policy-check`, `npm run app:layout-nav-check`, `npm run performance:route-code-split-check`, `npx tsc --noEmit --pretty false`, `npm run build`, `npm run product-ui:browser-check`, `npm run truth:privacy-claim-gate`, `npm run shield:verify`, and `git diff --check`. This is route surfacing and controller extraction only; it is not native SOL recovery extraction, not automatic migration, not complete cross-device recovery, not production-private recovery, not a new privacy guarantee, not production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 shared TransactionStatusToast slice:** commit `ceb6cbf` locally implements the transaction-status component from this cross-cutting list. `src/components/TransactionStatusToast.tsx` now owns the shared status shell for pending, submitted/confirmed, complete, failed, and action-required transaction states, with polite/assertive live-region semantics, optional dismissal/auto-dismiss support, progress affordance, floating bottom-right placement for active transaction flows, and tabular/overflow-safe detail rows. `src/pages/ShieldPage.tsx`, `src/pages/SendPage.tsx`, `src/pages/SwapPage.tsx`, and passive/progress/complete Unshield states render through the shared toast while preserving lane-owned state machines, wallet approval sheets, receipt/evidence details, proof/settlement calls, operator release, and action-required buttons. `src/pages/PayPage.tsx` uses the same component for the always-visible local transaction-status summary while leaving the receipt packet as the durable evidence surface. `scripts/check-vanta-transaction-status-toast.mjs` and `npm run transactions:status-toast-check` guard the component, page adoption, floating/mobile CSS markers, browser coverage, and truth-gate wiring; Shield/Send/Swap/Unshield/Pay lane guards also require the shared surface. Verified locally with red-first `npm run transactions:status-toast-check` failure before the component existed, then `npm run transactions:status-toast-check`, `npm run shield:ui-claim-boundary-check`, `npm run send:requires-shielded-state-check`, `npm run swap:requires-shielded-state-check`, `npm run unshield:public-exit-surface-check`, `npm run pay-tab:copy-check`, `npm run pay:browser-check`, `npm run product-ui:browser-check`, `npm run truth:privacy-claim-gate`, `npm run build`, and `git diff --check`. This is shared UI/status extraction and guard hardening only; it is not a toast queue/provider, not a receipt modal, not a wallet approval replacement, not a transaction executor, not a proof verifier, not a new privacy guarantee, not production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

## Shield page redesign

### Current state

`src/pages/ShieldPage.tsx` (2,157 lines) renders: hero with disclaimer badges, amount field with Max button, source asset `<select>`, target shielded asset preview, route helper, route progress label, validation messages, balance line, pending native-SOL evidence indicator, recovery panel (`<details>`), viewing-key panel (`<details>` with create/import/export sub-actions), shield form actions, wallet approval review (`<details>`), wallet warning note, route progress label (duplicate), submit button. The `shield-helper` class appears 30+ times in the file.

### Target state

Three fields. One button. Approval as a slide-over instead of an accordion.

```
[Top: page hero — one line]
  "Shield"
  "Move assets out of the public ledger and into your private balance."

[Center, large]
  Amount     $ [50.00]          Max
  From       [USDC ▾]           Balance: 1,247.50 USDC
  To         Shielded USDC      Balance: 0.00

  [   Shield USDC   ]

  Route: USDC → Shielded USDC

▸ Advanced settings
  └ Viewing key backup
  └ Decoy batch
  └ Custom route
```

After the user clicks Shield, `<WalletApprovalSheet>` slides in from the right showing the exact transaction. After confirm, the form is replaced with a `<TransactionStatusToast>` and the new note appears in the user's Vault grid with a "pending" badge.

### File-by-file changes

- **`src/pages/ShieldPage.tsx`** (~250 lines, replaces current). Renders the three-field form, one explanatory line, route helper, primary button. Wires in `<AssetPickerGrid>` for source selection. Wires in `<WalletApprovalSheet>` for the awaiting-confirmation state.
- **`src/components/ShieldAdvancedPanel.tsx`** (~150 lines, new). Collapsible disclosure containing viewing-key backup CTA (opens `<RecoveryPanel>`), decoy-batch toggle (today `runShieldWithDecoys`), custom route override.
- **`src/pages/RecoverySettingsPage.tsx`** (~250 lines, new). Route: `/app/settings/recovery`. Wraps `<RecoveryPanelController>` and `<RecoveryPanel>`. Houses viewing-key backup/restore/reset, non-secret record-source export/import verification, and future wallet-derived seed (shield W2) flow.
- **Delete from ShieldPage**: all 30+ `shield-helper` instances except the single "Route:" line; the route-progress duplicates; the `shield-wallet-warning-note` (move to the approval sheet); the inline viewing-key wiring (now in `RecoveryPanelController` while Shield still surfaces first-time setup).

### What's preserved

- All shield asset configurations and routing logic (`createShieldAssetCapability`, `selectUniversalShieldTarget`, etc.).
- The decoy batcher (`shieldDecoyBatcher.ts`), exposed as a toggle in Advanced.
- The native SOL vs SPL paths.
- The committed-economics settlement adapter.
- The recovery/viewing-key flows — they live in `RecoveryPanelController`, are surfaced at `/app/settings/recovery`, and remain available from Shield for first-time setup.
- The wallet approval review — promoted from an accordion to a side sheet, more visible than before. Safety win.

Effort: **3-4 days** of per-lane work, after the shared components land.

**Codex status, 2026-05-13 Shield advanced-disclosure slice:** commit `861fd1e` locally implements the smallest safe Shield front-door slice from this redesign without changing Shield routing, wallet approval, decoy execution, proof, settlement, recovery, or viewing-key behavior. `src/pages/ShieldPage.tsx` now changes the exposed `Balance recovery` disclosure into `Advanced shield settings`, keeps the recovery/export/import controls inside that closed disclosure, and adds a compact status grid for `Viewing key backup`, `Decoy batch`, and `Custom route` so the current power controls are named without pretending the future `RecoveryPanel`, decoy toggle, or custom route override exists yet. `scripts/check-vanta-shield-viewing-key-custody.mjs` now guards those advanced labels and the CSS container. Verified locally with `npm run shield:viewing-key-custody-check`, `npm run shield:decoy-batcher-check`, `npm run shield:ui-claim-boundary-check`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run build`, `npm run shield:verify`, and `git diff --check`. This improves Shield first-use framing and guard coverage only; it is not the full Shield redesign, not `/app/settings/recovery`, not a decoy toggle or custom route override, not Shield production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

## Send page redesign

### Current state

`src/pages/SendPage.tsx` (2,692 lines) renders: hero with disclaimer badges, send-flow indicator, context banner ("Syncing — deposit recorded" or "Start with Shield — no shielded funds"), amount field, recipient input (plain `<input>` with no validation feedback), asset display (USDC-only today), wallet approval review (`<details>`), release-package state panel, send-record diagnostics, spent-marker submission flow, multiple status banners.

### Target state

Two fields. The note picker handles "which input do you want to spend." Asset is inferred from the note.

```
[Top]
  "Send"
  "Send from shielded state with a clear privacy summary."

[Center]
  To       [Solana address or .sol name]
           ✓ valid recipient · USDC

  Amount   $ [25.00]          Max (from selected note)

  Spending: 50.00 USDC note from 2 days ago    [Change note]

  [   Send 25.00 USDC   ]

  Privacy summary:
  • Chain sees: a transaction happened
  • Recipient sees: amount, asset, optional memo
  • Operator sees: nothing

▸ Advanced
  └ Custom note selection
  └ Send memo (encrypted to recipient)
  └ Spent marker (auto)
```

The "Privacy summary" box is the move that converts a generic-looking send into a privacy-product send. Users see exactly what each party can observe — once the AEAD memos and customer-side flow land, this box becomes literally true.

After Send, `<WalletApprovalSheet>` slides in. After confirm, the receipt appears with a "Letter" badge linking to the verifiable receipt URL.

### File-by-file changes

- **`src/pages/SendPage.tsx`** (~300 lines, replaces current). Two-field form, default note selection (most recent / largest-fits), one-line privacy summary, primary button. Wires in `<NotePicker>` (collapsed by default, expands when user clicks "Change note") and `<WalletApprovalSheet>`.
- **`src/components/SendAdvancedPanel.tsx`** (~120 lines, new). Custom note selection, encrypted memo to recipient, spent-marker visibility toggle.
- **`src/components/PrivacySummary.tsx`** (~80 lines, new). The three-line "chain sees / recipient sees / operator sees" panel. Used by Send and Swap; eventually by Unshield.
- **`src/components/SendReceiptModal.tsx`** (~150 lines, new). Receipt detail opened from the recent-sends list. Renders the Letter (per taste pass T5). Replaces the inline release-package and send-record panels.
- **Delete from SendPage**: context banner (move to `<NotePicker>` empty state), send-record diagnostics (move to receipt modal), the spent-marker UI (auto-attached, no user interaction needed), the multiple status banners (replaced by `<TransactionStatusToast>`).
- **Add address validation**. The recipient `<input>` needs: live validation as the user types, .sol name resolution (Bonfida), recent-recipients dropdown, paste-detection that flips to checksum-validated state. ~50 lines of new logic in `<RecipientField>` (extract from the form).

### What's preserved

- The full send-transition logic (`createPreparedSendMemo`, `useVantaSafeSendTransaction`).
- The change-note accounting (input = recipient + change, enforced in the circuit).
- The encrypted memo via v2 `VANTA_SEND_MEMO_PREFIX_V2`.
- The spent-marker emission — runs automatically, no user-visible button.
- The release package + canonical lifecycle — moves to a per-send receipt modal.

Effort: **4-5 days** of per-lane work, after shared components.

**Codex status, 2026-05-13 Send progressive-disclosure slice:** commit `488f2e7` locally implements the next safe Send front-door slice without replacing the full page or changing send-transition, wallet approval, memo, proof, release-package, spent-marker, ledger-gate, or private-core operator behavior. `src/pages/SendPage.tsx` now leads with the two-field `To` / `Amount` form, exposes the selected spending note with a `Change note` affordance, uses a user-action primary label (`Send ...`) while preserving the beta disabled gate, and renders a reusable `src/components/PrivacySummary.tsx` panel. The privacy summary is current-truth safe: chain observers see a transaction plus encrypted memo packets, recipients see amount/asset/recovery data with the matched viewing key, and the operator sees proof/settlement status rather than witness values or plaintext memo contents. Custom note selection, encrypted recipient memo status, and automatic spent-marker status now live behind `Advanced send settings`; `scripts/check-vanta-send-requires-shielded-state.mjs` forbids the overclaim `Operator sees: nothing`, and `scripts/check-vanta-product-ui-browser.mjs` proves the privacy summary renders and advanced Send controls start collapsed then open. Verified locally with `npm run send:requires-shielded-state-check`, `npm run send:balance-ledger-check`, `npm run send:trust-packet-check`, `npm run send:production-privacy-claim-gate`, `npm run actions:memo-encryption-check`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run build`, `npm run send:verify`, and `git diff --check`. This improves Send first-use ergonomics and guard coverage only; it is not the full Send rewrite, not live address/.sol validation, not a receipt modal, not a WalletApprovalSheet replacement, not Send production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 SendReceiptModal slice:** commit `55109f4` locally implements the shared Send receipt modal recommendation without changing send-transition, safe-send, v2 memo, proof, spent-marker, ledger-gate, release-package, or private-core operator behavior. `src/components/SendReceiptModal.tsx` is presentational only and renders beta-safe receipt rows for recipient, amount, residual note, remaining balance, send note, spent marker, proof status, and release package; `src/pages/SendPage.tsx` still owns proof execution, wallet hooks, clipboard/export actions, Send state, and diagnostics. The modal now opens from the completed Send toast, the private-core verified Send panel, and the resumable private-core Send state panel, while the internal canonical send diagnostics are passed as children. New guard `npm run send:receipt-modal-check` is wired into `npm run truth:privacy-claim-gate`, and `scripts/check-vanta-product-ui-browser.mjs` proves the Send receipt modal, CTA, and title stay hidden before completion on `/app/send` at 1440px, 390px, and 320px. Verified locally with red-first `npm run send:receipt-modal-check` before the component existed, then `npm run send:receipt-modal-check`, `npm run send:requires-shielded-state-check`, `npm run send:balance-ledger-check`, `npm run send:trust-packet-check`, `npx tsc --noEmit --pretty false`, `npm run build`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run send:verify`, and `git diff --check`. This is a shared UI extraction and guard-hardening slice only; it is not live address validation, not `.sol` resolution, not a recent-recipients dropdown, not a full Send rewrite, not a focus-trapped shared modal primitive, not Send production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 Send recipient validation slice:** commit `cccff54` locally implements the next Send recipient recommendation without changing Send transition execution, safe-send, v2 memo encryption, proof artifacts, spent-marker behavior, release-package behavior, or private-core operator calls. New `src/solana/sendRecipientValidation.ts` fail-closes empty, overlong, malformed, off-curve, and unresolved `.sol` recipients; canonical base58 wallet addresses validate through `PublicKey`; pasted input records a paste-validated state; and `.sol` names now tell the user to paste the resolved Solana wallet address because name resolution is not enabled in the beta lane. New `src/components/RecipientField.tsx` owns the recipient input presentation, status copy, paste handling, recent-recipient buttons, and stable browser selectors while `src/pages/SendPage.tsx` keeps Send state ownership. The private-core self-send preview no longer hashes arbitrary text into a synthetic recipient key: it only builds a preview when the validated canonical address is the selected note owner and passes `recipientOwnerPublicKey: privateCoreOwner.publicKey`. New guard `npm run send:recipient-validation-check` is wired into `npm run truth:privacy-claim-gate` and `npm run send:verify`; `scripts/check-vanta-product-ui-browser.mjs` now proves the rendered Send route uses `Recipient wallet address`, rejects `clay.sol` with `.sol` resolution-required copy, keeps the beta primary action disabled, and exposes Send proof/ledger selectors without forbidden recipient-delivery claims at 1440px, 390px, and 320px. Verified locally with red-first `npm run send:recipient-validation-check` before the helper/component existed, then `npm run send:recipient-validation-check`, `npm run send:requires-shielded-state-check`, `npm run private-core:send-recipient-check`, `npm run send:receipt-modal-check`, `npx tsc --noEmit --pretty false`, `npm run build`, `npm run truth:privacy-claim-gate`, `node --check scripts/check-vanta-product-ui-browser.mjs`, `npm run product-ui:browser-check`, `npm run send:verify`, and `git diff --check`. This is validated-recipient UI and guard hardening only; it is not Bonfida `.sol` resolution, not external recipient viewing-key exchange, not QR scanning, not Send production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

## Swap page redesign

### Current state

`src/pages/SwapPage.tsx` (1,667 lines) renders: hero with disclaimer badges, swap-flow indicator, input note picker, output amount preview, venue badge ("Meteora · DLMM · Mainnet"), quote expiry countdown, slippage indicator, route protection toggles, last-swap summary, wallet approval review, spent-marker flow, helper text.

### Target state

Three fields. The quote is the visual centerpiece, not a row in a list.

```
[Top]
  "Swap"
  "Trade between assets inside your private balance."

[Center, large]
  From    [USDC ▾]   50.00
                       ↓
  To      [SOL  ▾]   ≈ 0.31

  Route: USDC → SOL via Meteora    Quote refreshes in 28s
  [───────────────|──────] (countdown bar)

  Privacy summary:
  • Chain sees: a transaction happened
  • Venue sees: an operator wallet swapped 50 USDC for SOL
  • You see: 0.31 SOL in your private balance

  [   Swap 50.00 USDC for 0.31 SOL   ]

▸ Advanced
  └ Max slippage
  └ Note selection
  └ Venue routing
```

Quote-expiry countdown becomes a thin progress bar at the top of the swap card (drains from accent-mint to warning-amber). When it hits zero, the quote refreshes automatically with a subtle pulse.

### File-by-file changes

- **`src/pages/SwapPage.tsx`** (~280 lines, replaces current). The from/to/amount form with auto-computed output, quote-expiry bar, route summary line, privacy summary, primary button. Uses `<AssetPickerGrid>` for both from and to. Note picker collapsed by default.
- **`src/components/SwapAdvancedPanel.tsx`** (~100 lines, new). Max slippage, custom note selection, venue routing override.
- **`src/components/QuoteCountdownBar.tsx`** (~80 lines, new). Thin progress bar across the top of the swap card. Drains color over the quote TTL. Resets on refresh.
- **`src/components/SwapReceiptModal.tsx`** (~150 lines, new). Last-swap summary as a modal opened from recent-swaps list.
- **Delete from SwapPage**: hero disclaimer badges (consolidated in `SystemStatusStrip`), the inline last-swap summary panel, the spent-marker UI (auto-attached), most helper text.

### What's preserved

- The Meteora DLMM and Jupiter SOL-to-Shielded routing paths.
- The signed swap intent (`signSwapIntent`) — runs identically.
- The operator's `/private-core/swap-proof` and `/swap-transition` endpoints — unchanged.
- The committed-economics settlement.
- The route privacy evidence module.

Effort: **3-4 days** of per-lane work after shared components.

**Codex status, 2026-05-13 Swap progressive-disclosure slice:** commit `a0c1664` locally implements the next safe Swap front-door slice without replacing the full page or changing the Meteora/Jupiter route adapters, signed swap intent, operator `/private-core/swap-proof` or `/swap-transition` endpoints, committed-economics settlement, spent-marker finalization, or route privacy evidence. `src/pages/SwapPage.tsx` now presents Swap as a trade surface with a `From` asset/amount row, `To` shielded output row, route summary, quote countdown progress bar, user-action primary label, reusable `PrivacySummary`, and a closed `Advanced swap settings` disclosure for max slippage, exact-note selection, and venue routing. The privacy summary stays current-truth safe: chain observers see a transaction plus encrypted swap memo packets, venues see operator-visible route settlement terms rather than a production-private route, and the user sees the shielded output note after settlement finalizes. `scripts/check-vanta-swap-requires-shielded-state.mjs` now requires these progressive-disclosure markers and forbids stale operator/venue invisibility and fully-private/anonymous/untraceable Swap overclaims, while `scripts/check-vanta-product-ui-browser.mjs` proves the summary, quote progress, and collapsed/opened advanced controls render. Verified locally with `npm run swap:requires-shielded-state-check`, `npm run swap:capability-check`, `npm run swap:committed-settlement-check`, `npm run swap:trust-packet-check`, `npm run swap:safe-send-adoption-check`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run private-core:swap-check`, `npm run private-core:swap-boundary-check`, `npm run private-core:swap-live-path-check`, `npm run build`, and `git diff --check`. This improves Swap first-use ergonomics and guard coverage only; it is not the full Swap rewrite, not new production-private routing, not a receipt modal, not a separate `SwapAdvancedPanel`/`QuoteCountdownBar` extraction, not Swap production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 QuoteCountdownBar extraction:** commit `4047164` locally extracts the recommended shared `src/components/QuoteCountdownBar.tsx` from the Swap quote rail while preserving Swap-owned quote clocking, auto-refresh nonce behavior, venue labels, route truth copy, Meteora/Jupiter adapters, signed swap intent, operator `/private-core/swap-proof` and `/swap-transition` calls, committed-economics settlement, spent-marker finalization, and route privacy evidence. The component is presentational only: it clamps `progressPercent`, exposes progressbar semantics with `aria-valuenow` / `aria-valuetext`, uses a stable `data-vanta-quote-countdown-bar` selector, supports `fresh` / `warning` / `refreshing` tones, and adds a reduced-motion-safe refresh pulse. `npm run swap:quote-countdown-check` was added and wired into `npm run truth:privacy-claim-gate`; `scripts/check-vanta-swap-requires-shielded-state.mjs` now requires the shared component; `scripts/check-vanta-product-ui-browser.mjs` proves the shared quote bar renders on `/app/swap` at 1440px, 390px, and 320px without overflow. Red-first verification failed before the component existed with `Shared QuoteCountdownBar component must exist`; after implementation, verification passed locally with `npm run swap:quote-countdown-check`, `npm run swap:requires-shielded-state-check`, `npm run truth:privacy-claim-gate`, `npm run build`, `npm run product-ui:browser-check`, and `git diff --check`. This is shared UI extraction and guard hardening only; it is not `SwapAdvancedPanel`, not `SwapReceiptModal`, not a new quote source, not new production-private routing, not Swap production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 SwapAdvancedPanel extraction:** commit `7dbce84` locally extracts the recommended shared `src/components/SwapAdvancedPanel.tsx` from the inline Swap advanced disclosure while preserving Swap-owned exact-note selection side effects, quote clearing, venue labels, route truth copy, Meteora/Jupiter adapters, signed swap intent, operator `/private-core/swap-proof` and `/swap-transition` calls, committed-economics settlement, spent-marker finalization, and route privacy evidence. The component is presentational only: it renders Max slippage, Note selection, and Venue routing with native `<details>/<summary>` semantics, keeps `send-advanced-panel swap-advanced-panel` styling, uses a stable `data-vanta-swap-advanced-panel` selector, and delegates note selection through `onSelectNote` back to `SwapPage`. `npm run swap:advanced-panel-check` was added and wired into `npm run truth:privacy-claim-gate`; `scripts/check-vanta-shared-note-picker.mjs` now understands that Swap's shared `NotePicker` lives inside `SwapAdvancedPanel`; `scripts/check-vanta-product-ui-browser.mjs` proves the shared disclosure is closed by default, opens, and still shows Max slippage, Note selection, and Venue routing. Red-first verification failed before the component existed with `Shared SwapAdvancedPanel component must exist`; after implementation, verification passed locally with `npm run swap:advanced-panel-check`, `npm run notes:shared-picker-check`, `npm run swap:requires-shielded-state-check`, `npm run build`, `npm run product-ui:browser-check`, `npm run truth:privacy-claim-gate`, `npm run swap:capability-check`, `npm run swap:committed-settlement-check`, `npm run swap:trust-packet-check`, `npm run private-core:swap-check`, `npm run private-core:swap-boundary-check`, `npm run private-core:swap-live-path-check`, `npm run zk:feedback-loop-check`, and `git diff --check`. This is shared UI extraction and guard hardening only; it is not `SwapReceiptModal`, not a venue-routing override implementation, not a new quote source, not new production-private routing, not Swap production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 SwapReceiptModal extraction:** commit `af6b14c` locally adds the recommended `src/components/SwapReceiptModal.tsx` as a shared presentational receipt dialog opened from the completed-swap status action rather than from a true recent-swaps list, because the current Swap page does not yet have a persistent recent-swaps UI or data model. The implementation preserves Swap-owned quote lifecycle, route adapters, signed swap intent, operator `/private-core/swap-proof` and `/swap-transition` calls, committed-economics settlement, spent-marker finalization, route-truth copy, and route privacy evidence. The component owns only receipt presentation: modal shell, close action, input/output/venue/operator/quote/note rows, route-truth display, bridge-warning display, stable `data-vanta-swap-receipt-modal` selector, and beta-safe copy stating that route settlement remains operator-visible and the receipt does not prove production-private routing. `npm run swap:receipt-modal-check` was added and wired into `npm run truth:privacy-claim-gate`; `scripts/check-vanta-swap-requires-shielded-state.mjs` now requires the shared receipt action/surface; `scripts/check-vanta-product-ui-browser.mjs` proves the receipt modal and `View swap receipt` action are hidden before a completed swap at 1440px, 390px, and 320px. Red-first verification failed before the component existed with `Shared SwapReceiptModal component must exist`; after implementation and record sync, verification passed locally with `npm run swap:receipt-modal-check`, `npm run swap:requires-shielded-state-check`, `npm run build`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run swap:capability-check`, `npm run swap:committed-settlement-check`, `npm run swap:trust-packet-check`, `npm run private-core:swap-check`, `npm run private-core:swap-boundary-check`, `npm run private-core:swap-live-path-check`, `npm run zk:feedback-loop-check`, and `git diff --check`. This is shared UI extraction and guard hardening only; it is not a persistent recent-swaps list, not a full counterparty-verifiable trust packet, not a focus-trapped modal primitive, not new production-private routing, not Swap production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 Swap recent receipt surface:** commit `b4261a2` locally adds the next safe receipt-revisitability slice by rendering a guarded `Recent swaps` panel on `SwapPage` with `data-vanta-swap-recent-list`, local-session empty-state copy, and an `Open receipt` action that reopens the existing `SwapReceiptModal` for the latest completed swap. The slice preserves Swap-owned quote lifecycle, route adapters, signed swap intent, operator `/private-core/swap-proof` and `/swap-transition` calls, committed-economics settlement, spent-marker finalization, route-truth copy, and route privacy evidence. The checker now requires `data-vanta-swap-recent-list`, `data-vanta-swap-recent-card`, `data-vanta-swap-recent-empty`, `Recent swaps`, `Local session history`, and `Open receipt`, so the page cannot silently drift back to a one-time completed-status-only receipt action. Red-first verification failed before the recent list existed with `SwapPage missing SwapReceiptModal marker: data-vanta-swap-recent-list`; after implementation, verification passed locally with `npm run swap:receipt-modal-check`, `npm run swap:requires-shielded-state-check`, `npm run swap:trust-packet-check`, `npm run private-core:swap-check`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run build`, and `git diff --check`. This is local-session receipt revisitability and guard hardening only; it is not persistent recent-swaps across reload, not a full counterparty-verifiable trust packet, not new route/proof/settlement behavior, not new production-private routing, not Swap production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 Swap persistent recent receipts:** commit `610e7b0` locally upgrades the previous local-session-only `Recent swaps` panel into a browser-local recent receipt history backed by the existing canonical `listCanonicalSwapRecords()` / `persistCanonicalSwapRecord()` storage. `SwapPage` now builds up to five `recentSwapSummaries` from persisted canonical swap records, dedupes in-flight local-session summaries against the persisted record, shows `Browser-local history` / `Stored in this browser` copy, and opens `SwapReceiptModal` for the selected persisted receipt while preserving the completed-status receipt action. The checker now requires `listCanonicalSwapRecords`, `buildRecentSwapReceiptSummaries`, `recentSwapSummaries`, `data-vanta-swap-recent-browser-local`, and browser-local copy so the page cannot regress to ephemeral session-only history. Red-first verification failed before the persistent history wiring existed with `SwapPage missing SwapReceiptModal marker: listCanonicalSwapRecords`; after implementation, verification passed locally with `npm run swap:receipt-modal-check`, `npx tsc --noEmit --pretty false`, `npm run swap:requires-shielded-state-check`, `npm run swap:trust-packet-check`, `npm run private-core:swap-check`, `npm run truth:privacy-claim-gate`, `npm run build`, `npm run product-ui:browser-check`, and `git diff --check`. This is browser-local receipt history and guard hardening only; it is not cross-device history, not a server/indexer recent-swaps API, not a full counterparty-verifiable trust packet, not new route/proof/settlement behavior, not production-private routing, not Swap production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

## Unshield page redesign

### Current state

`src/pages/UnshieldPage.tsx` (3,232 lines — largest file in `src/pages/`) renders the most complex form in the app. Today it exposes: full-vs-partial unshield, transition-vs-wallet-direct authorization toggle, USDC-vs-SOL split, destination field (locked to self), amount field, note picker, recovery hints, multiple approval review accordions, release-record diagnostics, multiple status banners.

### Target state

One field — amount. Destination is the user's wallet (locked, per the unshield-lane code). Asset and note come from context.

```
[Top]
  "Withdraw"
  "Move shielded funds back to your wallet."

[Center, large]
  Amount     $ [25.00]            Max (50.00 USDC available)

  To         Your wallet
             7yU...rtdi               [Locked to your wallet]

  From note  50.00 USDC · 2 days ago  [Change note]

  Privacy summary:
  • Chain sees: a transfer from Vanta to your wallet
  • Recipient (you) sees: full amount, asset
  • Operator sees: nothing about your shielded history

  [   Withdraw 25.00 USDC   ]

▸ Advanced
  └ Custom note selection
  └ Reference note for receipt
```

The destination field is now a labeled, non-editable card showing the user's connected wallet address with a "Locked to your wallet" pill. A future "Send to a different wallet" toggle is shown disabled with "Coming soon — needs unshield-to-fresh-wallet support" (this aligns with the unshield-lane U2 recommendation).

### File-by-file changes

- **`src/pages/UnshieldPage.tsx`** (~300 lines, replaces 3,232). One amount field, destination card (locked), note picker (collapsed by default), privacy summary, primary button. Auto-selects the most appropriate note for the amount.
- **`src/components/UnshieldAdvancedPanel.tsx`** (~100 lines, new). Custom note selection, reference note for receipt.
- **`src/components/UnshieldReceiptModal.tsx`** (~150 lines, new). Letter for the exit transaction. Links to the on-chain Solscan signature.
- **Delete from UnshieldPage**:
  - **Transition-authorized vs wallet-direct toggle entirely.** Aligns with unshield-lane U4 — remove the parallel authorization path. Every unshield uses the real Ed25519 signature path.
  - The multiple `<details>` accordions for approval review (replaced by `<WalletApprovalSheet>`).
  - Release-record diagnostics (move to receipt modal).
  - Helper text around the destination field (replaced by the locked card).
  - Most of the "full vs partial" branching UI — partial is the default, "Max" button gives full.

### What's preserved

- The signed unshield intent flow (`signUnshieldIntent`).
- The operator's `/unshield` and `/unshield/sol` endpoints.
- USDC and SOL unshield paths.
- The eligibility checks (`waitForEligibleUnshieldTransition`, `assertEligibleDirectUnshieldRelease` — though the latter goes away once transition-auth is deleted).
- The release receipts.

Effort: **5-6 days** of per-lane work, because UnshieldPage is the largest existing file. After this, the file is roughly 10% of its current size and substantially clearer.

**Codex status, 2026-05-13 Unshield progressive-disclosure slice:** commit `61f2582` locally implements the next safe Unshield front-door slice without deleting the transition/release machinery or changing signed unshield intents, operator `/unshield` and `/unshield/sol` endpoints, USDC/SOL paths, eligibility checks, release receipts, split-note flow, or safe-send behavior. `src/pages/UnshieldPage.tsx` now reuses `PrivacySummary`, changes the primary action to `Withdraw ...`, adds a Max affordance for USDC exits, and moves custom note selection plus receipt reference note into a closed `Advanced unshield settings` disclosure. The privacy summary is current-truth safe: chain observers see a public exit transaction to the connected wallet, the recipient sees full amount/asset/release receipt, and the operator sees exit terms and release status rather than the user's full shielded history. `scripts/check-vanta-unshield-public-exit-surface.mjs` now requires the progressive-disclosure markers and forbids stale `Operator sees: nothing`, fully-private, anonymous, or untraceable Unshield overclaims, while `scripts/check-vanta-product-ui-browser.mjs` proves the summary and collapsed/opened advanced controls render. Verified locally with `npm run unshield:public-exit-surface-check`, `npm run unshield:balance-ledger-check`, `npm run unshield:safe-send-adoption-check`, `npm run unshield:sol-operator-endpoint-check`, `npm run unshield:trust-packet-check`, `npm run private-core:unshield-committed-settlement-check`, `npm run private-pool-v2:unshield-proof-request-check`, `npm run private-pool-v2:onchain-unshield-custody-check`, `npm run truth:privacy-claim-gate`, `npm run private-core:check`, `npm run product-ui:browser-check`, `npm run build`, and `git diff --check`. This improves Unshield first-use ergonomics and guard coverage only; it is not the full Unshield rewrite, not removal of all transition/release detail, not a WalletApprovalSheet replacement, not a receipt modal, not program-owned on-chain release custody, not Unshield production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 UnshieldAdvancedPanel extraction:** commit `3664fb6` locally extracts the recommended shared `src/components/UnshieldAdvancedPanel.tsx` from the inline Unshield advanced disclosure while preserving Unshield-owned lane selection, note-selection side effects, amount resets, signed unshield intents, operator `/unshield` and `/unshield/sol` endpoints, release receipts, split-note flow, safe-send behavior, and public-exit evidence. The component is presentational only: it renders native `<details>/<summary>` disclosure semantics, custom note selection, shared `NotePicker`, receipt reference display, existing `send-advanced-panel unshield-advanced-panel` styling, and stable `data-vanta-unshield-advanced-panel` browser selector. `npm run unshield:advanced-panel-check` was added and wired into `npm run truth:privacy-claim-gate`; `scripts/check-vanta-shared-note-picker.mjs` now understands that Unshield's shared `NotePicker` lives inside `UnshieldAdvancedPanel`; `scripts/check-vanta-product-ui-browser.mjs` proves the shared disclosure is closed by default, opens, and still shows Custom note selection and Reference note for receipt. Red-first verification failed before the component existed with `Shared UnshieldAdvancedPanel component must exist`; after implementation, verification passed locally with `npm run unshield:advanced-panel-check`, `npm run notes:shared-picker-check`, `npm run unshield:public-exit-surface-check`, `npx tsc --noEmit --pretty false`, `npm run build`, `npm run truth:privacy-claim-gate`, `npm run product-ui:browser-check`, `npm run unshield:trust-packet-check`, `npm run private-core:unshield-committed-settlement-check`, `npm run private-pool-v2:onchain-unshield-custody-check`, `npm run unshield:balance-ledger-check`, `npm run unshield:safe-send-adoption-check`, `npm run unshield:sol-operator-endpoint-check`, `npm run private-pool-v2:unshield-proof-request-check`, and `git diff --check`. This is shared UI extraction and guard hardening only; it is not `UnshieldReceiptModal`, not release-record diagnostics migration, not deletion of remaining operator transition-eligibility branching, not program-owned on-chain release custody, not Unshield production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

**Codex status, 2026-05-14 UnshieldReceiptModal extraction:** commit `e7c301a` locally adds the recommended `src/components/UnshieldReceiptModal.tsx` and moves the completed Unshield receipt/release diagnostics behind a completed-flow modal action while preserving Unshield-owned signed intents, operator `/unshield` and `/unshield/sol` calls, release flow, split/finalization state, safe-send behavior, canonical record retention, and public-exit evidence. The component is presentational only: it renders the receipt dialog, close action, amount/evidence/operator/transition/settlement/exit-visibility rows, optional Solscan link, beta-safe public-exit boundary copy, and a stable `data-vanta-unshield-receipt-modal` selector. `npm run unshield:receipt-modal-check` was added and wired into `npm run truth:privacy-claim-gate`; `scripts/check-vanta-product-ui-browser.mjs` proves the receipt modal, `View receipt details`, `Latest unshield receipt`, and `View on Solscan` are hidden before completion at 1440px, 390px, and 320px. Red-first verification failed before the component existed with `Shared UnshieldReceiptModal component must exist`; after implementation, verification passed locally with `npm run unshield:receipt-modal-check`, `npm run unshield:public-exit-surface-check`, `npx tsc --noEmit --pretty false`, `npm run truth:privacy-claim-gate`, `npm run build`, `npm run product-ui:browser-check`, `npm run unshield:trust-packet-check`, `npm run private-core:unshield-committed-settlement-check`, `npm run private-pool-v2:onchain-unshield-custody-check`, `npm run private-pool-v2:unshield-proof-request-check`, and `git diff --check`. This is shared UI extraction and guard hardening only; it is not a full Unshield rewrite, not auth-path removal, not a new release flow, not a recent-unshields persistence surface, not a focus-trapped modal primitive, not program-owned on-chain release custody, not Unshield production privacy, not live mainnet private settlement, not pushed, and not live-deployed.

## Total effort across all four lanes

| Component | Effort | Reuses |
|---|---|---|
| **Shared (build once)** | | |
| `<AssetPickerGrid>` | 1 day | Shield, Swap |
| `<NotePicker>` | 1.5 days | Send, Swap, Unshield |
| `<WalletApprovalSheet>` | 2 days | All 4 lanes + Pay |
| `<RecoveryPanel>` | 1.5 days | Shield, Settings |
| `<LaneFlowIndicator>` | 0.5 day | All 4 lanes + Pay |
| `<TransactionStatusToast>` | 1 day | All 4 lanes + Pay |
| `<PrivacySummary>` | 0.5 day | Send, Swap, Unshield |
| **Subtotal shared** | **~8 days** | |
| **Per-lane work** | | |
| Shield redesign | 3-4 days | |
| Send redesign | 4-5 days | |
| Swap redesign | 3-4 days | |
| Unshield redesign | 5-6 days | |
| **Subtotal per-lane** | **~17 days** | |
| **Combined total** | **~5 weeks for one developer** | |

If two developers split shared + per-lane work, the wall-clock time drops to ~3 weeks. Add the Pay + Strategy redesigns (~2 weeks) and the nav reorganization (0.5 days) and the entire UX overhaul ships in **~4-5 weeks of focused work** across all six product surfaces.

## Cross-cutting wins from the redesign

Beyond the per-page improvements, the shared components produce structural wins:

- **One single approval-review surface.** `<WalletApprovalSheet>` is built once, used everywhere. A safety improvement (consistent, always-visible during signing) AND a polish improvement (one place to perfect the design).
- **`<NotePicker>` is the Vault metaphor made tangible.** Per the taste pass, a `<ShieldedStateGrid>` was the highest-leverage design move. `<NotePicker>` is a step toward it — the user sees their notes as discrete objects, not as a faceless balance. Build this carefully and it becomes the visual identity of the wallet side of the product.
- **`<PrivacySummary>`** appears on Send / Swap / Unshield with literal, accurate copy. Today the privacy claims are abstract; with this component, every page shows the user exactly what's visible to whom. After the V1-V8 cryptographic work lands, the copy becomes cryptographically true.
- **All 13,400 lines across the four lane pages collapse to ~1,150 lines of page-shell code** plus ~1,150 lines of shared components. ~80% reduction in page-level code with no capability loss.
- **Maintainability**: each page is now small enough that a new engineer can read it in one sitting and understand the flow. Today's 3,232-line UnshieldPage is unreadable.

## What this doesn't change

- All cryptographic surfaces (circuits, prover, on-chain program, settlement adapter, viewing-key crypto).
- All operator-side state and replay protection.
- All trust-contract / readiness-gate logic.
- All canonical-note / lifecycle bookkeeping (the `liveShieldBridge` / `liveSendBridge` / `liveSwapBridge` / `liveUnshieldBridge` modules) — these stay; they just stop being directly rendered as JSON in the UI.
- All v2 AEAD memo emission.
- All wallet-safe-send hook logic — the form just calls into it with cleaner inputs.

Privacy is identical. Capability is identical. The dense forms still exist for power users — they're in Advanced panels and Settings routes. The front door asks one question per page.

## Codex-actionable summary

If Codex is implementing this:

1. **Week 1**: Build the 7 shared components (`AssetPickerGrid`, `NotePicker`, `WalletApprovalSheet`, `RecoveryPanel`, `LaneFlowIndicator`, `TransactionStatusToast`, `PrivacySummary`). Each gets a Storybook story with all states. Each is exported from `src/components/` and used by zero pages yet.

2. **Week 2**: Redesign Shield + Swap (the two simpler lanes). Move the recovery flow to `/app/settings/recovery`. Strip helper text. Replace `<select>` with `<AssetPickerGrid>`. Strip disclaimer chips (consolidated in `SystemStatusStrip` already).

3. **Week 3**: Redesign Send. Add address validation + .sol name resolution. Wire `<PrivacySummary>`. Move release-package UI into `<SendReceiptModal>`.

4. **Week 4**: Redesign Unshield (the largest file). **Delete the transition-authorized auth path entirely** as part of this. Move release-record diagnostics into the receipt modal.

5. **Week 5**: Polish pass on all four pages. Add `<TransactionStatusToast>` everywhere. Add the `<LaneFlowIndicator>` animation. Audit copy against the editorial rules (no "supported" hedges, no disclaimer infestation).

After 5 weeks: six pages (Shield, Send, Swap, Unshield, Pay, Strategy) all using the same progressive-disclosure pattern, the same shared components, the same privacy framing, and the same plain-English copy. Every privacy guarantee preserved. Every capability preserved. The product looks like one product instead of six related forms.

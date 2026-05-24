# Vanta Mainnet-Readiness Roadmap — 2026-05-22

Companion to `AUDIT_2026-05-22_findings.md`. This file is roadmap-only, no findings.

## What "Fully Private Mainnet Ready" Means

Two readings:

**Maximal.** Every lane (Shield / Send / Swap / Unshield / Pay / Strategy) running through proof-verified paths, anonymity set ≥ N (1024 is the current packet threshold), no operator-trusted fallback anywhere, recipient discovery off the operator path, audit-accepted. Calendar: **8-14 months** from today.

**Minimum-viable.** One lane (Shield + actual-private-spend), one minimal claim ("audited proof-enforced shield-and-spend with anonymity ≥ 1024"), other lanes stay beta. Calendar: **6-9 months** from today.

Pick the reading before committing to a date. The phase plan below works for either; the difference is whether Phases 2-4 cover one lane or six.

The critical path is **Phase 1** (close C01 / verifier wiring). Phases 2/3/4 can run in parallel but cannot be promoted until Phase 1 is closed.

## Phase 0 — Cleanup (1 week, all internal)

Goal: clear the new findings before any external auditor sees the repo. None of this changes a privacy claim; all of it reduces the number of items an audit firm will list on first pass.

1. **Fix H6: decompose `context_hash` in the ActualPrivateSpend circuit.** Add `(merchant_hi, merchant_lo, denomination, settlement_epoch)` as private Field inputs; recompute `context_hash` in-circuit; assert equality. Mirror the `derive_consume_context_tag` pattern in `vanta_private_core_single_note_unshield`. Add fixture `invalid-context-hash-preimage` flipping one component byte. **This blocks Phase 1** if the trusted setup ceremony has not yet been started, because the circuit shape affects the verifying key.
2. **Fix M7: TAG_REGISTER_VAULT_ASSET idempotency.** Add `ERR_VAULT_ASSET_ALREADY_REGISTERED_WITH_DIFFERENT_PARAMS` rejection.
3. **Fix M8: sanitize operator error responses.** Replace `err.message` returns with `"validation failed"` / `"processing error"` strings; structured-log details server-side only.
4. **Fix M9: add HTTP security headers** on Cloudflare or Render: CSP, HSTS, Referrer-Policy, Permissions-Policy. See `AUDIT_2026-05-22_findings.md` for the exact header values.
5. **Fix M10: expand CI.** Add `npm ci && npm run build && npm run truth:privacy-claim-gate && npm run zk:review-guards-check` to `.github/workflows/privacy-audit.yml` for every PR and push to `main`.
6. **Land L6-L10 in one PR each.** Cheap and increases the surface that survives review.

## Phase 1 — Close C01 (8-16 weeks, mostly external)

This is the single biggest block of work. Five gates, in order:

### 1.1 Backend selection — done

`groth16-tag3-solana-v0` is committed in `docs/zk/c01-production-verifier-backend-decision.md`. Reserved tag-3 ABI matches the Gnark-native tuple (324-byte proof + 44-byte public witness, 368-byte verifier instruction data, one public input `private-spend-public-input-hash`).

### 1.2 Production proof-format artifact + production VK hash

For `vanta_private_pool_v2_actual_private_spend_entry`. Requires:

- Pin Sunspot's required Noir/Nargo version: currently the repo is on `1.0.0-beta.19`, Sunspot's upstream README requires `1.0.0-beta.18`. Either install a pinned `beta.18` toolchain in a reviewed build environment, or contribute a port of Sunspot to `beta.19`. Decision goes in `docs/zk/c01-production-verifier-backend-decision.md`.
- Install Sunspot + `GNARK_VERIFIER_BIN` in the reviewed build environment.
- Run a trusted setup ceremony with toxic-waste mitigation. Default `sunspot setup` is unsafe (single operator, no ceremony). Options: (a) a multi-party computation ceremony, (b) a universal/updateable setup like KZG-derived, (c) an equivalently reviewed mitigation explicitly accepted by the audit.
- Commit only refs (proof-format artifact SHA, VK artifact SHA, build review SHA). No raw key/proof/witness bytes in git per `private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json` policy.

External dependencies: ceremony participants, an audit-firm review of the build, and a reproducible toolchain pin.

### 1.3 Verifier-adapter acceptance tests

Inside the program, against the production (proof, public_witness, VK) tuple:

- **Valid proof → state mutates** (nullifier marker, output queue, output record, last_public_input_hash all change in the expected shape).
- **Invalid proof → state byte-identical.**
- **Wrong public-input hash → state byte-identical.**
- **Wrong VK hash → state byte-identical.**

The local-unsafe Sunspot harness now covers valid mutation plus invalid-proof, wrong-public-input, wrong-verifier-program, and wrong generated-verifier/key-hash no-mutation cases, all running against `/private/tmp` artifacts. The current command is `npm run private-pool-v2:c01-local-unsafe-h6-verifier-cpi-acceptance-check`, and the metadata lives in `private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json`.

That local lane still does **not** satisfy production adapter acceptance. The production acceptance gate deliberately requires refs for the reviewed production proof/VK/public-witness tuple and states that wrong-verifying-key no-mutation must bind to production verifying-key hash semantics, not only a wrong verifier-program id or a local unsafe generated verifier artifact.

**Next work Vanta can do before external review returns:** keep the local H6 unsafe harness green and keep the acceptance gate strict. The remaining C01 verifier-adapter promotion work is to run the same valid/invalid/wrong-input/wrong-key mutation matrix under the reviewed production verifier boundary after the deterministic production artifact build, production proof format, and production VK/hash refs exist.

### 1.4 SBF / live lineage

Rebuild the spend SBF, redeploy to mainnet, reinitialize state, capture transaction signatures for the proof-enforced path. Cannot be done without mainnet keys and operator approval. Capture into `private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json` under `sbfLiveLineageRef`.

### 1.5 Audit / reviewer acceptance

External. Engage an audit firm (see Phase 6). Output is a signed report that maps onto `auditReviewerAcceptanceRef` slots in the evidence packets.

## Phase 2 — Program-owned PDA vault (4-8 weeks, internal-heavy)

Today the operator keypair owns the Shield/Send/Swap/Unshield SOL vault. Architecture target (A2) is a program-owned PDA vault where the program signs releases via the verifier-checked path. The source already reserves `SOL_VAULT_SEED` and binds release to `sol_vault_pda + NATIVE_SOL_ASSET_ID_SENTINEL`.

Blockers:
- **(a)** Phase 1 must close so the verifier can sign-off the release.
- **(b)** M4 inverted `releaseEnabled` semantics must flip as the comment promises (`releaseEnabled != 0 → ok`).

Internal work:
- Implement runtime authority flip from `cfg!(test)` gating to `pool_state.verifier_wired: bool`. New `TAG_AUTHORITY_ENABLE_VERIFIER` instruction signed only after C01 audit acceptance.
- Remove `cfg!(test)` bypass in `require_vault_asset_record()` once production tests can rely on the same path.
- Crucible coverage for end-to-end `process_unshield` SOL release (currently SOL TAG6 scenarios are documented TODO in `fuzz/vanta_private_pool_v2_spend/src/main.rs`).

External: post-audit live vault deployment with operator-signed `TAG_AUTHORITY_ENABLE_VERIFIER`.

## Phase 3 — Program-owned shared Merkle tree (6-10 weeks, mostly internal)

Today root provenance lives in `["vanta2root", pool_state, acceptedRoot]` PDA records — lineage metadata, not a program-owned tree. Target (A3) is a program-owned Merkle tree where roots transition via verified state-update proofs, not operator-signed registrations.

Concretely:
- New circuit proving the append-only transition: `(old_root, new_root, appended_commitment, leaf_index)` are public inputs; the circuit asserts that appending `appended_commitment` at `leaf_index` in the tree with root `old_root` produces `new_root`.
- New on-chain `TAG_APPEND_LEAF` path consuming that proof.
- New evidence-packet shape for the tree-transition verifier (separate VK from spend).

Can run in parallel to Phase 1 but cannot be promoted (`live-verified`) until Phase 1 closes.

## Phase 4 — Real recipient discovery (4-8 weeks, internal)

R9B and R9C landed the local viewing-key + proof-owner-key exchange scaffolds (`src/zk/vantaShieldViewingKey.ts`). Live recipient discovery still routes through the operator.

Target: one of:
- **(a)** X25519-encrypted ciphertext-body discovery channel with on-chain commitment. Simplest if R9A's ciphertext-body-hash binding is already in place — verify, then ship.
- **(b)** Stealth-address protocol: recipients scan a public ephemeral key without a server roundtrip. Adds Diffie-Hellman key derivation.
- **(c)** Relayer-mediated PSI (private set intersection). More complex, better metadata properties.

Recommendation: ship (a) first as a non-stealth fallback, design (b) as the longer-term replacement.

## Phase 5 — Live anonymity set ≥ 1024 (volume-blocked)

`currentDistinctCommitments: 2` in the public manifest is the honest current state. No shortcut: this needs real volume of distinct commitments. The 1024 threshold is configurable but the right value is what an external auditor accepts as plausibly non-trivial. Until then, every claim must be "operator-trusted beta, no anonymity claim made."

What Vanta *can* do:
- Bootstrap-mode invitations (private invite list to seed the set before public launch).
- Synthetic-commitment policy (decoy commitments). Audit dependency: an audit needs to accept that decoys don't degrade anonymity.
- Cross-pool aggregation if multiple pools land.

What Vanta *should not* do:
- Promote the claim before the live count clears the threshold.
- Use commitment count alone — `distinctCommitments` ≠ "anonymity set," especially if many commitments share a recipient.

## Phase 6 — External audit (4-8 weeks, external-only)

Engage two audit firms — a Solana-program-aware firm and a ZK-circuit-aware firm — because the surfaces are different specialities. Candidates:
- **Solana program**: Cantina, OtterSec, Trail of Bits, Halborn, Sec3.
- **ZK circuits / ceremony**: zksecurity.xyz, Veridise, 0xPARC, ChainSafe.

Scope:
- Tag-3 verifier path (program + adapter + verifier program + CPI).
- All Noir circuits (Shield, PPv2 Send/Claim/Swap/ActualPrivateSpend, Private Core Send/Swap/Unshield).
- Trusted setup ceremony or equivalent mitigation.
- Program-owned vault custody (A2).
- Program-owned tree state (A3).
- Recipient discovery surface.

Output: signed reports that map directly onto `auditReviewerAcceptanceRef` slots in the evidence packets and onto a public `thirdPartyAuditAccepted: true` flip in `/.well-known/vanta-audit.json`.

## Phase 7 — Live mainnet with proof-enforced release (2 weeks, gated by Phases 1-3 and 6)

Only after Phases 1, 2, 3 close and Phase 6 returns acceptance:

1. Rebuild SBF, deploy, reinitialize state.
2. Capture lineage evidence: deploy tx, reinit tx, redeployed-binary SHA, ABI freeze.
3. Flip the `verifier_wired` runtime flag with the authority instruction.
4. Run a real-funds proof-enforced shield → spend → unshield cycle (operator dogfood account).
5. Capture transaction signatures, attest the audit manifest with the new commit and asset hash.
6. Drop "operator-trusted beta" copy across all promoted lanes; keep it everywhere else.

Then promote the ledger entries to `live-verified` per `docs/goals/2026-05-20-c01-h08-promotability/notes/promotability-map.md`.

## Sequencing Summary

```
Phase 0 (1 wk) ────┐
                   │
Phase 1 (8-16 wk) ─┼───── critical path
                   │
Phase 2 (4-8 wk) ──┤
                   │  (start in parallel, gate promotion on Phase 1)
Phase 3 (6-10 wk) ─┤
                   │
Phase 4 (4-8 wk) ──┤
                   │
Phase 5 (volume) ──┘
                   │
Phase 6 (4-8 wk) ─── runs over Phases 1-3 finish
                   │
Phase 7 (2 wk) ─── after Phases 1+2+3+6, sometimes 4
```

Minimum-viable target: 24-36 weeks (6-9 months). Maximal target: 36-60 weeks (8-14 months). Both assume no major audit findings that re-open Phase 1 — those add cycles.

## What This Roadmap Is Not

- **Not a budget.** The trusted setup ceremony, two audit firms, and the operator time required for Phase 5 bootstrapping are all real money. Approximate: ceremony ($20-60k), Solana audit ($60-150k), ZK audit ($80-200k), volume bootstrap operator time (negligible compared to the audits).
- **Not a marketing plan.** Every phase that promotes a claim must do so through the existing claim-gate machinery (`truth:privacy-claim-gate`, the C01 positive-claim-gate, the anonymity-set probe). Promotion is a code change with the matching evidence packet, not a press release.
- **Not a guarantee of zero rework.** Audit findings will return changes to circuits / program / adapter, and the trusted setup ceremony will need to be repeated if circuits change. Plan for one such cycle as the baseline; budget two.
- **Not the end of work.** Once live, monitoring (`scripts/scan-onchain-tag6-sol-releases.mjs`, `scripts/probe-production-native-sol-sentinel-snapshot.mjs`, the role-service replay barriers) becomes ongoing operational hygiene, not a one-time check.

## Verification Commands That Stay Green Across All Phases

Same set as the combined audit. Run before any promotion attempt:

```
npm run truth:privacy-claim-gate
npm run zk:c01-positive-proof-verified-claim-gate-check
npm run zk:review-findings-ledger-check
npm run public:audit-discovery-check
npm run mainnet:role-service-replay-evidence-check
npm run private-pool-v2:live-anonymity-set-probe-check
npm run build
```

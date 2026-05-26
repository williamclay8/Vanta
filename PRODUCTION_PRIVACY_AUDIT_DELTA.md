# Vanta Production-Privacy Audit — Delta vs 2026-05-24

**Re-audit date:** 2026-05-25
**Baseline:** `PRODUCTION_PRIVACY_AUDIT.md` (2026-05-24)
**Scope of work re-verified:** 56 commits landed on `main` since the original audit was filed, including circuit edits, ~6,000 LOC added to the on-chain program, and a major rewrite of the operator unshield path.

## TL;DR

Codex did substantially more than expected in one credit window. The single most important real-privacy delta is that **Band 1 (circuit fixes) is fully landed**: every Critical circuit-level finding in the original audit is now actually fixed in `zk/noir/**/main.nr`, not just tracked. The on-chain program also gained a real Poseidon/BN254 Merkle tree, a real `process_shield` instruction, a runtime `verifier_wired` flag (replacing the `cfg!(test)` gate), and **the operator-signed unshield path has been completely deleted** — the only unshield endpoint left in the operator returns HTTP 503 fail-closed.

That last item is the headline trade-off: the most acute *security* risk from the 2026-05-24 audit (the operator keypair holding all unshield funds) is gone, but in exchange **users currently cannot withdraw from Vanta at all**. The system is effectively shield-only until the on-chain Groth16 verifier ships.

What did not move: the Groth16 verifier program itself is not deployed (Band 3 is decision-made but ceremony-blocked), the anonymity set is still 2, Helius RPC and the Vanta-identifying shield memo are still public in the bundle, and the browser still uses the SHA-256 shadow tree even though the on-chain tree is now Poseidon.

At a band level:

| Band | Description | Status before | Status after |
|------|-------------|---------------|--------------|
| 1 | Circuit fixes | not started | **fully landed** |
| 2 | On-chain program | scaffolded | **major progress, verifier CPI still stubbed** |
| 3 | Verifier + ceremony | not started | **backend chosen, local probe works, production ceremony blocked** |
| 4 | Anonymity set bootstrap | 2 commitments | **2 commitments — unchanged** |
| 5 | Relayer maturity | none | **policy + queue + transport guards landed, deployment not** |
| 6 | Recipient discovery | none | **view-tag pull contract + guard landed, deployment not** |
| 7 | Audit + bug bounty | not started | **trackers opened, nothing contracted** |
| 8 | Compliance + ops | partial | **runbooks landed, OFAC decision still open** |

---

## Per-finding status

### Closed (the fix is in code, with a guard)

| ID | Item | Evidence |
|----|------|----------|
| PPA-UNSHIELD-001 | **Private Core unshield nullifier no longer binds `state_root`.** Now `derive_nullifier = bn254::hash_6([owner_pk_hi, owner_pk_lo, note_secret_hi, note_secret_lo, note_nonce_hi, note_nonce_lo])`. Double-spend-via-root-rotation vector closed. | `zk/noir/vanta_private_core_single_note_unshield/src/main.nr:97-113, 238-246`; guard: `npm run private-core:nullifier-binding-check` |
| PPA-SEND-001 (recipient) | **Send recipient output commitment is decomposed in-circuit.** New `compute_output_commitment` over `(recipient_owner_commitment, asset_id_commitment, recipient_amount, recipient_output_blinding, recipient_output_derivation_tag)` and asserted equal. | `vanta_private_pool_v2_send_entry/src/main.nr:29-43, 260-267` |
| PPA-SEND-001 (change) | **Send change output commitment is decomposed in-circuit** and bound to the sender's `owner_commitment` (so a malicious sender cannot make the change unspendable to themselves or attributable to a third party). | `:269-276` |
| PPA-SWAP-001 (output) | **Swap output commitment is decomposed in-circuit.** Bound to `(owner_commitment, output_asset_id_commitment, output_amount, output_blinding, output_derivation_tag)`. | `vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr:32-46, 246-253` |
| PPA-SWAP-001 (economics) | **Swap economics commitment is decomposed in-circuit.** New `compute_swap_economics_commitment(input_asset, output_asset, input_amount, output_amount, min_output_amount, slippage_bps, blinding)` with `assert(output_amount >= min_output_amount)`. | `:48-69, 233, 235-244` |
| PPA-SEND-CLAIM-001 | **Relayer fee bounded in Send and Claim.** Send asserts `relayer_fee <= input_amount` and `input_amount == recipient_amount + change_amount + relayer_fee`. Claim asserts `relayer_fee <= amount` and `amount == net_payout + relayer_fee`. | Send `:245-249`; Claim `vanta_private_pool_v2_claim_entry/src/main.nr:171-172`; `net_payout` is a new bound public input |
| PPA-SEND-SWAP-002 | **`valid_until_slot` bound in Send and Swap public-input hash.** Send wraps it into `economics_terms = hash_3([economics_commitment, relayer_fee, valid_until_slot])`. Swap binds it directly into the 12-field hash. | Send `:136, 156-160`; Swap `:149, 168` |
| PPA-PROGRAM-001 | **Program-owned Poseidon/BN254 Merkle tree.** `MERKLE_TREE_DEPTH = 20`, `TREE_CAPACITY = 2^20`, `solana_poseidon::hashv(Parameters::Bn254X5, Endianness::BigEndian, ...)`. New `TAG_APPEND_TREE_LEAF = 9` instruction validates `previous_root → new_root` transition against the program-owned tree_state, persists root history, creates `tree_leaf_marker` and `root_record` PDAs. | `programs/.../lib.rs:27, 145-147, 318, 378-507, 2269-2283`; guard: `npm run private-pool-v2:program-merkle-tree-check` |
| PPA-PROGRAM-002 (partial) | **`process_shield` (TAG_SHIELD = 8) is implemented** and moves funds into the PDA vault. For SOL: `invoke_signed(SystemProgram::transfer(depositor → sol_vault_holding))` where `sol_vault_holding` is the program-owned SOL vault PDA. For SPL: `spl_token::instruction::transfer_checked` into the vault token account owned by the vault authority PDA. | `lib.rs:1085-1190`; guard: `npm run private-pool-v2:pda-vault-custody-check` |
| PPA-PROGRAM-004 | **`cfg!(test)` gate replaced with runtime `pool_state.verifier_wired` flag.** `POOL_VERIFIER_WIRED_OFFSET` field, initialized to `POOL_VERIFIER_NOT_WIRED` by `TAG_INIT`, checked by `require_pool_verifier_wired` at every privacy-relevant entrypoint. | `:140-142, 366, 1762-1779`; tests assert init defaults to zero and that even setting it to 1 still rejects until the verifier itself is wired |
| H4 (operator-keypair custody) | **Operator-signed unshield release path completely removed.** `operator/unshield-server.mjs` no longer imports `Keypair.fromSecretKey`, `sendAndConfirmTransaction`, or `loadWeb3KeypairFromEnv`. Every unshield endpoint returns HTTP 503 with `{ "blocked": true, "releaseModel": "program-tag-unshield-pda-cpi-fail-closed" }`. | `operator/unshield-server.mjs:1640-1782` (the entire prior signing block deleted) |
| H1 (fictional client-side privacy) | **Misleading code and docs deleted.** `src/zk/indexerClient.ts`, `src/zk/clientProver.ts`, `FINAL_IMPLEMENTATION_SUMMARY.md`, `PRODUCTION_READINESS_CHECKLIST.md`, `PRODUCTION_SIGNOFF.md` all removed. The "client-side programmatic privacy" overclaim no longer exists. | filesystem grep returns no such paths |
| Relayer jitter/batching | **Local policy + queue primitive landed.** `src/privacy/privatePoolV2RelayerQueue.mjs` defines `DEFAULT_VANTA_RELAYER_SEND_JITTER_MIN_MS = 30_000`, `MAX_MS = 180_000`, unshield window `30_000 – 3_600_000`, `DEFAULT_BATCH_MAX_SIZE = 8`, plus a forbidden-field allowlist preventing IPs, bearer tokens, witnesses, blinding factors, and viewing keys from being persisted in the queue. | `src/privacy/privatePoolV2RelayerQueue.mjs:1-50`; guard: `npm run private-pool-v2:relayer-jitter-batching-check` |
| Relayer privacy transport contract | **Tor / blinded-token transport modes specified.** `privatePoolV2RelayerPrivacyTransport.mjs` enumerates `tor-onion` and `blinded-token`, with the explicit boundary: "local refs-only relayer privacy-transport contract; not live anonymity, audit, or production privacy evidence." | `src/privacy/privatePoolV2RelayerPrivacyTransport.mjs:1-30`; guard: `npm run private-pool-v2:relayer-privacy-transport-check` |
| Recipient discovery contract | **View-tag pull policy and indexer endpoint contract landed.** `operator/private-pool-v2-service-network.mjs` defines `viewTagPrefix` query format, prefix-only access (full encrypted tags forbidden), and explicit blockers: `view-tag-pull-service-not-deployed`, `view-tag-pull-retention-log-redaction-review-missing`. | `operator/private-pool-v2-service-network.mjs:42-65, 597-643`; guard: `npm run indexer:view-tag-pull-check` |
| Legacy v1 memo migration | **Migration tracker, guard, and policy landed.** Old v1 plaintext memos are explicitly quarantined; new sends must produce v2 AEAD. | guard: `npm run actions:legacy-v1-send-memo-migration-check` |
| Verifier backend decision | **`groth16-tag3-solana-v0` formally selected** as the production verifier backend via Sunspot/Gnark/Noir route. Local end-to-end probe (`private-pool-v2-c01-beta18-h6-migration-probe`) runs compile → setup → prove → verify and produces a 44-byte public witness whose generated verifier SBF passes standalone LiteSVM verification. | `docs/zk/c01-production-verifier-backend-decision.md:1-23` |
| Ops runbooks | `docs/key-custody-runbook.md` (137 lines), `docs/incident-response-runbook.md` (100 lines), `docs/mainnet-deployment-runbook.md` updates, `docs/threat-model.md` updates. Bound by `npm run band8-ops-publication-check`. | files exist and are gated |

### Still open (Critical / High)

The headline gap that remains: even with the circuits, tree, and PDA vault all in place, **no on-chain instruction actually verifies a proof yet**. Everything still returns `ERR_PROOF_VERIFIER_NOT_WIRED` / `ERR_UNSHIELD_NOT_WIRED` after the new runtime gate check. The verifier CPI scaffold is there, the backend is chosen, the local probe works — but the production ceremony has not been run and the verifier program has not been deployed to mainnet.

| Sev | Item | Where | Notes |
|-----|------|-------|-------|
| Critical | **TAG_SPEND_WITH_PROOF still stub-returns `ERR_PROOF_VERIFIER_NOT_WIRED`** outside `target_os = "solana"`. The CPI to a real Groth16 verifier program is not deployed because the verifier program itself is not deployed. | `lib.rs:539-562` (CPI scaffold) | Blocked on Band 3 |
| Critical | **TAG_UNSHIELD SOL release returns `ERR_UNSHIELD_NOT_WIRED`** even when `verifier_wired = 1`. The `invoke_sol_vault_transfer_reserved` helper exists as `#[allow(dead_code)]` but is unreachable. SPL release likewise returns `ERR_UNSHIELD_NOT_WIRED`. | `lib.rs:3078-3083, 3089-3114` | Blocked on Band 3 + a follow-up wiring commit |
| Critical | **No production Groth16 ceremony run.** Decision is `groth16-tag3-solana-v0`; local probe used `nonproduction-unsafe-setup`. Production VK does not exist; verifier program is not deployed. | `docs/zk/c01-production-verifier-backend-decision.md:13-23` | Band 3 step 2/3 |
| Critical | **Anonymity set still 2 commitments.** `currentDistinctCommitments: 2` everywhere; no closed-alpha bootstrap shields landed. The fail-closed gate at `npm run private-pool-v2:live-anonymity-set-probe-check` is correctly green-because-it's-honest. | `scripts/check-vanta-live-anonymity-set-probe.mjs:39-66` | Band 4 |
| Critical | **No independent audit contracted.** Trackers `PPA-AUDIT-001` (two-firm) and `PPA-AUDIT-002` (bug bounty) are open but the engagement is not signed. | tracker entries | Band 7 |
| Critical | **`process_shield` does not invoke the verifier or append the leaf in the same instruction.** It moves funds into the PDA, but the corresponding `TAG_APPEND_TREE_LEAF` is a separate, authority-signed instruction. Today the funds-in step and the tree-append step are not atomic, and the append requires operator authority. A reorg / operator failure between the two steps means a depositor's lamports can sit in the PDA while no commitment exists in the tree. | `lib.rs:1085-1190` (shield) vs `:378-507` (append) | Bundle them, or make TAG_SHIELD itself do the append, or document the recovery path |
| Critical | **The `TAG_APPEND_TREE_LEAF` instruction requires `authority.is_signer`** (`require_authority` at `lib.rs:426`). Until shielders themselves can append their own leaf (gated by a valid Shield proof CPI), the operator is in the trust loop for every commitment append. This is not yet a trustless tree. | `lib.rs:426` | Convert to "anyone with a valid Shield/Send/Swap/Claim proof can append, gated by verifier CPI" |
| High | **Browser SPA still uses the SHA-256 shadow tree.** `src/zk/shieldedState.ts:9` still exports `SHIELDED_STATE_ROOT_SCHEME_V1 = "sha256-append-only-commitment-list-v1"`. The on-chain Poseidon tree is correct but the SPA's local mirror has not been switched, so the user-facing record IDs and the on-chain commitments are still in different schemes. | `src/zk/shieldedState.ts:9` | Replace with a Poseidon mirror that reads from the indexer's `program-owned-tree-state` |
| High | **Shield memo `vanta:native-sol-shield-note:v1:` / `:v2:` still on chain.** Every deposit still tags itself for any chain analyst. | `src/solana/nativeSolShield.ts:51-54` | Drop the memo body entirely; deliver via view-tag channel |
| High | **Helius RPC URL hard-coded in production bundle** (AUDIT-2026-05-19 H5) — no evidence Codex moved this. | requires re-checking the deployed bundle | Proxy or runtime-config |
| High | **`liveShieldBridge.ts` still persists commitments to unencrypted localStorage.** L2 mitigation kept the real commitment (no longer `"redacted:commitment"` literal) but moved nothing to the Argon2id vault. | `src/zk/liveShieldBridge.ts:32, 306-318` | Route through `privateVaultStorage.ts` |
| High | **Live unshield is fully fail-closed.** Users cannot withdraw. This is correct security posture but is a real product-availability regression that needs a clear user-facing message and an ETA tied to Band 3 verifier ship. | `operator/unshield-server.mjs:1652-1665, 1740-1754` | Communicate; or run a small operator-bonded redemption pool in parallel as a stopgap, with explicit "we hold the keys for this one queue" disclosure |
| High | **Postgres-backed nullifier store not deployed.** Plan opened (`PPA-RELAYER-001`), guards in place, deployment not done. | tracker | Band 5 |
| High | **Tor / blinded-token relayer endpoint not deployed.** Contract landed, hidden service not. | `PPA-RELAYER-003` | Band 5 |
| High | **View-tag pull endpoint not deployed.** Indexer contract landed, real endpoint not. | `PPA-DISCOVERY-001` | Band 6 |
| High | **Legacy v1 memo backfill migration not run** — only the policy to refuse new v1 writes is enforced. Historical v1 memos remain decryptable by whoever holds the matching keys. | `PPA-DISCOVERY-002` | Band 6 |
| High | **OFAC sanctions decision not made.** Compliance tracker `PPA-COMPLY-001` is open. This is a launch-blocker for any US-tied operator. | tracker | Band 8 |
| Medium | **`settlement_commitment` and `route_commitment` are still opaque private inputs** in the Swap circuit (`swap_to_shielded_entry/main.nr:185-186`). They are bound into the public-input hash but not decomposed. Documented as acceptable for v1 in the original audit; flagging here so it isn't lost. | circuit | Defer to v2 unless Bonsol-style verifiable execution is on the table |
| Medium | **Per-fixture verifier-key registration is manual.** `TAG_REGISTER_VERIFIER_KEY = 5` PDA exists, but `TAG_SPEND_WITH_PROOF` reads `verifier_key_hash` from the *caller's* payload. The hash → PDA binding is enforced, but a future operator key-rotation path needs an explicit "retire old verifier key" instruction. | `lib.rs:441, 504-510` | Add `TAG_REVOKE_VERIFIER_KEY` |
| Medium | **Two tree-state surfaces exist concurrently** — the on-chain program tree (Poseidon) at `process_append_tree_leaf` and the legacy operator indexer JSON snapshot. Until the SPA reads root state from the on-chain tree, the two can drift. | `operator/private-pool-v2-service-network.mjs` indexer snapshot fields | Cut the operator indexer over to read-only mirror of the on-chain tree |
| Low | **Sentinel asset id (all-zero) for SOL is consistently used** but worth a fixture asserting that a non-SOL caller cannot pass `exit_asset_id == NATIVE_SOL_ASSET_ID_SENTINEL` to spoof the SOL branch. | `lib.rs:2377-2379` checks this; add a negative test fixture if not present | low risk |

### Already-fixed-but-marked-open in the original audit (corrections)

| Item | Reality |
|------|---------|
| TAG_UNSHIELD zero-nullifier check (AUDIT-2026-05-19 H3) | Present at `lib.rs:3033-3041`; was already correct in current `main` at original audit time. Re-confirmed. |
| `require_vault_asset_record` comment/code inversion (AUDIT-2026-05-19 M4) | The comment at `lib.rs:1440-1447` was updated in this cycle to clarify that the current `releaseEnabled == 0` rejection is the intended fail-closed posture *until* `TAG_REGISTER_VAULT_ASSET` is fully wired, after which the check flips to require `releaseEnabled == 1`. Not a code bug; a documentation gap that's now closed. |

### New observations introduced during this cycle

| Sev | Item | Notes |
|-----|------|-------|
| High | **The `process_shield` instruction takes `shield_public_input_hash` as a parameter but never verifies it.** The runtime `verifier_wired` gate exists but the actual verifier CPI is not in the shield code path. A future attacker who finds a way to flip `verifier_wired` to 1 without the corresponding CPI being deployed could call `process_shield` with arbitrary `output_commitment` and the funds would land in the PDA with no proof. | `lib.rs:1085-1190` — fold the verifier CPI into `process_shield` before allowing `verifier_wired = 1` |
| Medium | **`TAG_APPEND_TREE_LEAF` and `process_shield` are separate instructions.** A composed Shield therefore requires either two-tx or a fancy CPI sequence the SPA doesn't yet build. Document the intended call pattern, or merge into a single `process_shield` that does both. | `lib.rs:318, 378, 1085` |
| Medium | **`assert_eligible_direct_sol_unshield_release`-style JavaScript guards are gone** from `operator/unshield-server.mjs`, which is good — but every unshield call now produces an HTTP 503. Front-end copy in `src/pages/PayPage.tsx`, `src/pages/UnshieldPage.tsx` (if present) needs to surface "withdrawals are paused pending the on-chain verifier ship" rather than failing silently. Quick UX audit needed. | `src/pages/UnshieldPage.tsx` |
| Low | **`#[allow(dead_code)]` on `invoke_sol_vault_transfer_reserved` / `invoke_spl_vault_transfer_checked_reserved`.** Code rot risk: these helpers must stay byte-for-byte aligned with the verifier-wired payload once verifier ships. Add a unit test that exercises them via a `cfg(feature = "verifier-wired")` build. | `lib.rs:3089-3170` |

---

## Updated remediation order

Bands 1, 5-policy, 6-policy, 8-policy are essentially done. The critical path is now:

**Band 3 (verifier ceremony & deploy)** is the hard dependency for *all* user-visible privacy and for restoring unshield availability. Until it lands, Vanta is shield-only and the rest of the privacy story is theoretical. The local Sunspot/Gnark probe working is encouraging but the ceremony and the SBF verifier program audit are the real bottleneck.

**Band 2 follow-up — wire the verifier into the existing instructions.** Once a deployed verifier program exists, the diffs are small:
- `process_shield` → add a verifier CPI before the lamports transfer; consider merging in the tree-leaf append so the deposit is atomic.
- `process_spend_with_proof` → swap `verify_spend_with_proof_adapter`'s `#[cfg(not(target_os = "solana"))]` branch for the actual CPI.
- `process_unshield` (SOL + SPL) → uncomment the `invoke_sol_vault_transfer_reserved` and `invoke_spl_vault_transfer_checked_reserved` paths after the verifier acceptance check.

**Band 4 (anonymity set bootstrap)** can run in parallel with Band 3 — it doesn't need the verifier, just a closed-alpha cohort of operator-bonded shields landing into the same denomination pool. Critically, this requires the program-owned tree (already done) plus the `TAG_APPEND_TREE_LEAF` instruction (also done), so it is unblocked at the protocol layer.

**Band 7 (audit engagement)** should be initiated *now* — auditor engagement lead time is measured in months, and they can audit the current circuits + program even before the verifier wiring is done. The ceremony itself benefits from being audit-observed.

**Band 5/6 deployment items** (Postgres, Tor, view-tag pull endpoint) are independent of the verifier and can ship now; they don't degrade or improve privacy until the verifier is also live, but they prove out the operational shape.

The audit's seven TL;DR items now stand at: **#1 partially closed** (verifier infrastructure scaffolded; ceremony pending), **#2 partially closed** (PDA vault in code, CPI release path stubbed), **#3 fully closed in the on-chain layer, browser still on SHA-256**, **#4-7 unchanged**.

---

## Verification commands that exist and should stay green

The original audit's appendix list still applies; the following were added or hardened this cycle and should be in the pre-deploy suite:

```
npm run private-core:nullifier-binding-check
npm run private-pool-v2:program-merkle-tree-check
npm run private-pool-v2:pda-vault-custody-check
npm run private-pool-v2:runtime-verifier-wired-gate-check
npm run private-pool-v2:groth16-verifier-cpi-check
npm run private-pool-v2:relayer-jitter-batching-check
npm run private-pool-v2:relayer-privacy-transport-check
npm run indexer:view-tag-pull-check
npm run actions:legacy-v1-send-memo-migration-check
npm run band8-ops-publication-check
npm run zk:c01-beta18-h6-migration-probe-check
npm run zk:c01-beta18-h6-source-migration-review-check
```

Continue to keep these fail-closed and do not lift the privacy-claim gate until Band 3 ships and Band 4 anonymity is ≥ 1024.

---

## Bottom line

Codex got further in one credit cycle than the original audit's per-engineer-week estimates suggested for Band 1 (it landed all of Band 1 plus most of Band 2's scaffolding plus all the policy/contract work for Bands 5/6/8). The discipline was good: every circuit fix has a fixture, every new endpoint contract has a fail-closed guard, no privacy-claim language was lifted prematurely. The mismatch you should be aware of is that the tracker now contains a lot of "guard landed" entries that are *not* the same as "implementation deployed" — the difference between `"view-tag-pull-service-not-deployed"` being recorded as a blocker and an actual Tor-fronted indexer serving real users is a deployment cycle, not a code cycle.

The one trade-off worth deciding consciously: the live deployment is now **shield-only**. If that is a problem for the alpha user cohort, the choice is (a) tell them, set ETA, wait for Band 3; or (b) reopen a small bonded-vault unshield queue with explicit "we hold the keys for this queue" copy. Don't quietly revert the operator-signed path — that would undo the only Critical-severity fix this cycle delivered to the live system.

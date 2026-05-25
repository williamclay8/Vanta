# Vanta Production-Privacy Audit — Shield / Send / Swap / Unshield

**Audit date:** 2026-05-24
**Auditor:** Claude (Cowork)
**Branch:** `main` (live: `vantaprivacy.xyz`)
**Scope:** what must be true for each of the four lanes — Shield, Send, Swap, Unshield — to be honestly described as *production-private on Solana mainnet*.
**Prior reviews consulted and verified against current code:** `AUDIT_2026-05-19.md`, `SECURITY_LIMITATIONS.md`, `VANTA_ZK_REVIEW.findings.json` (13 findings, baseline 2026-05-09).

---

## Executive verdict

The current production deployment (`vantaprivacy.xyz`) is correctly described internally as **"operator-trusted beta"** and is **not** production-private. The Noir circuits, Solana program scaffolding, and role-service network are in genuinely advanced shape relative to most ZK projects at this stage, but **zero of the four lanes are presently end-to-end private on mainnet** because:

1. **There is no on-chain proof verification.** `TAG_SPEND_WITH_PROOF (= 3)` and `TAG_UNSHIELD (= 6)` both fail closed with `ERR_PROOF_VERIFIER_NOT_WIRED` / `ERR_UNSHIELD_NOT_WIRED` (`programs/vanta_private_pool_v2_spend/src/lib.rs:541-562, 2415-2417`). The Solana program is a preflight harness today — it never actually verifies a Groth16/UltraHonk proof.
2. **The vault is an operator-controlled regular Solana wallet, not a program-owned PDA.** Shield deposits go to `vaultOwner` via a plain `SystemProgram.transfer` (`src/solana/nativeSolShield.ts:212-225`); unshield releases are signed by an operator keypair loaded from env (`operator/unshield-server.mjs:1660-1685`). The funds are fully custodial and the operator can move them at will.
3. **The Merkle tree of commitments lives only in browser localStorage**, keyed `vanta.zk.phase1.live-shield-records.v1`, using SHA-256 not the Poseidon/BN254 tree the circuits prove against (`src/zk/liveShieldBridge.ts:32, src/zk/shieldedState.ts`). There is no shared anonymity set on chain; the live-anonymity-set probe reports `currentDistinctCommitments: 2`.
4. **Every shield, send, swap, and unshield is a 1:1 traceable Solana transaction** between known operator-controlled addresses and the user's wallet. Anything Vanta currently calls "private" relies on off-chain bookkeeping and on user trust in the operator.

The work needed to ship a real production-private system on each lane is summarized below, with severities and concrete file:line references. The patterns repeat across lanes, so cross-cutting items are pulled out at the end rather than copied four times.

---

## TL;DR — the seven things that gate every lane

If only these seven items are completed, *all four lanes* go from "operator-trusted beta" to credibly production-private. The lane-specific sections detail residual circuit/UX work after these are done.

| # | Item | Severity | Where today |
|---|------|----------|-------------|
| 1 | **Deploy a Groth16 (or UltraHonk-Solana) verifier program** and wire `TAG_SPEND_WITH_PROOF` + `TAG_UNSHIELD` to invoke it via `invoke_signed`. | Critical | `programs/.../lib.rs:539-562` (CPI scaffold) and `:2415-2417` (`cfg!(not(test))` short-circuit) |
| 2 | **Replace the operator-keypair vault with a program-owned PDA** under seeds `["vanta2solvault", pool_state, NATIVE_SOL_ASSET_ID_SENTINEL]` for SOL and `["vanta2vault", pool_state, asset_id]` for SPL. Move all custody flow into `process_unshield` `invoke_signed(...)` with the PDA bump. | Critical | scaffolded at `lib.rs:59-68, 2382-2455`; the real release at `operator/unshield-server.mjs:1660-1685` still uses an operator keypair |
| 3 | **Build a program-owned shared Merkle tree** (Poseidon/BN254, depth 20). Append a leaf in every Shield / Send / Swap / Claim path on-chain, validate the same root the proof was computed against, and persist root history on-chain (`root_history` already scaffolded). | Critical | tree currently in `localStorage` only (`src/zk/shieldedState.ts`, `src/zk/liveShieldBridge.ts:294-304`); browser tree is SHA-256, circuits expect Poseidon — the schemes do not match |
| 4 | **Grow the live anonymity set to ≥ 1024 distinct commitments** before lifting the privacy-claim gate. Today the live probe reports 2. | Critical | `npm run private-pool-v2:live-anonymity-set-probe-check` already fail-closed at `< 1024` |
| 5 | **Deploy a real public indexer** (not the dead `vanta-light-public-indexer.onrender.com`, see AUDIT_2026-05-19 H2), and route Merkle root + nullifier reads through it from the browser so the user does **not** have to trust the operator for note state. | High | `src/zk/indexerClient.ts` exists but is unwired (AUDIT_2026-05-19 H1); the deployed bundle has no Bearer for the real indexer (M6 in prior audit) |
| 6 | **Deploy a real recipient-discovery channel** for Send (encrypted memos delivered by view-tag-indexed pull, not posted by sender directly). The viewing-key packet scaffolding is in `vantaShieldViewingKey.ts` but not bound to any deployed discovery service. | High | local-only scaffolding |
| 7 | **Independent ZK + Solana program audit** (gated R20/R21 in the kanban tracker) with a published report. Without this Vanta cannot legitimately use the word "private" in user-facing surfaces. | Critical | not yet contracted |

These seven are common to all four lanes. After them, each lane still has lane-specific work, detailed next.

---

## SHIELD — production gap list

### What "shield" actually is today

A Shield is `SystemProgram.transfer(fromPubkey=owner, toPubkey=vaultOwner, lamports)` plus a memo of the form `vanta:native-sol-shield-note:v1:` or `:v2:` (`src/solana/nativeSolShield.ts:51-54, 212-225`). For SPL it is the analogous `splShieldTransfer.ts`. The "shielded note" the user thinks they own is a record persisted only in *their own browser's* localStorage under `vanta.zk.phase1.live-shield-records.v1` (`liveShieldBridge.ts:32, 109-162`). Nothing about the deposit is private on chain: an observer can see Alice's wallet send X SOL to `vaultOwner` with a Vanta-tagged memo.

The Noir Shield circuit (`zk/noir/vanta_private_pool_v2_shield_entry/src/main.nr`) is well-formed and N1 (output-commitment binding) is correctly closed; the circuit binds output_commitment to `(owner, asset, amount, blinding, derivation_tag)` at lines 99-113. But that proof never reaches any verifier in the live path.

### Shield production checklist

| Sev | Item | Owner | Concrete change |
|-----|------|-------|-----------------|
| Critical | **No on-chain shield instruction.** A `TAG_SHIELD` is reserved in comments (`lib.rs:58`) but not implemented. Until a `process_shield` exists that appends a commitment to the program-owned tree and locks the funds in the PDA vault, every shield is a plain transfer to an operator-controlled wallet. | program | Add `TAG_SHIELD = 8` (or fold into existing tag). Payload: `(amount, asset_id, output_commitment, output_leaf_index, previous_root, output_root, shield_public_input_hash, verifier_key_hash, proof, public_witness)`. Verify the Shield Noir proof via CPI. Move the lamports from `signer` to the SOL vault PDA (or SPL ATA owned by the vault authority PDA). Append `output_commitment` to `output_queue`, advance `root_history`. |
| Critical | **Vault is a regular wallet, not a PDA.** All inflows accumulate at one operator address that anyone can scrape. | program + ops | Migrate vault to PDA seeds shown above. Document a one-time funded sweep from the existing operator wallet to the new PDA so users with in-flight shields aren't stranded. |
| Critical | **The browser tree is SHA-256 and operator-trusted; circuits prove against Poseidon.** A user who proves a Shield against the browser-local tree is proving against a different commitment scheme than the verifier expects. Today this is invisible because there is no verifier. The moment one exists the discrepancy becomes a hard failure. | client + program | Standardize on Poseidon/BN254 everywhere. Drop SHA-256 `sha256-append-only-commitment-list-v1` from `shieldedState.ts`. Render the SPA tree off of indexer reads, not localStorage. |
| Critical | **Shield memo string is a deanonymization tag.** `vanta:native-sol-shield-note:v1:` (and v2) makes every Vanta deposit greppable from chain history forever. Even with full circuit privacy later, the historical record will let any analyst label every shielded address. | client + ops | Move the memo body off chain entirely (the recipient discovery channel above carries it). On-chain transactions should carry no Vanta-identifying string. Document this in the threat model. |
| Critical | **Anonymity set is 2.** Until ≥ 1024 distinct commitments exist in the same denomination cohort, any single user's shield is trivially linked to their unshield by amount + timing. | ops | Coordinate with launch — either prefund decoy shields, run a closed alpha with relayer-bonded shields, or gate the "private" claim behind an honest set-size threshold. |
| High | **Amount is not in a denomination cohort.** Circuits accept arbitrary u128 amounts, so the anonymity set fragments into "people who shielded 0.42138 SOL last Tuesday". Tornado-style fixed denominations or a confidential-amount range proof scheme is required. | circuits + product | Either (a) introduce fixed denominations (0.1, 1, 10, 100 SOL pools) — best privacy, worst UX, or (b) extend the Noir circuit with a confidential-amount Pedersen commitment + range proof. Both are major work. Start with (a) for the launch denomination of SOL. |
| High | **`asset_id_commitment` binding for SPL.** Shield circuit binds amount-and-asset; but on Solana the asset ID for SPL is the mint pubkey. The `economics_commitment` `bn254::hash_5([source_mint, target_mint, target_asset_id, amount, economics_blinding])` is good, but the on-chain `process_shield` must verify the lamports flow into the correct PDA *for that mint* (the vault_asset_record kind=SPL). Today there is no `process_shield`, so this is open work. | program | Pair `TAG_SHIELD` with the vault_asset_record PDA enforcement that already exists for unshield. Reject if `vault_asset_record.kind != SPL` for an SPL mint. |
| High | **No quote-expiry on Shield.** Once a user generates a Shield proof, an attacker who steals the proof bytes could replay it against a later state (different `previous_root`) until the witness-tagged root falls out of the verifier's accepted window. The circuit binds `previous_root` and `output_root` but does not bind a freshness anchor. | circuits | Add a `valid_until_slot` field to the public input hash and have the on-chain program reject `if Clock::get()?.slot > valid_until_slot`. Pattern is already in `claim_entry.nr:95, quote_expires_at_slot`. |
| Medium | **L2 (audit-2026-05-19) regression risk.** `liveShieldBridge.ts:320-362` correctly stopped storing literal `"redacted:commitment"`, but it still stores the real commitment in plaintext localStorage. On a shared / synced browser this is a forensic leak for the user. Persist commitments only in the encrypted vault (`privateVault/`), not unencrypted localStorage. | client | Wire shield records through `privateVaultStorage.ts` (already exists, Argon2id-AES-GCM). Add a migration path that re-encrypts existing v1 records. |
| Medium | **No simulate-before-sign on Shield.** Per `SECURITY_LIMITATIONS.md:75-76` ("future wallet signing paths must simulate before signature") — Shield currently goes from form submit → wallet popup without showing a parsed-readable summary. | client | Add a confirmation modal that decodes the simulated tx (amount → vault PDA, asset, fee) and requires explicit click-through. |
| Low | **Hard-coded RPC in bundle (Helius project URL)** carries over from AUDIT-2026-05-19 H5. Anyone scraping the bundle drains Vanta's Helius quota and watches user RPC patterns. | ops | Proxy via `/config` at runtime as recommended in the prior audit. |
| Low | **Memo prefix `v1`/`v2` migration**: legacy v1 memos must be quarantined per `actions:legacy-v1-memo-quarantine-check`. Confirm the quarantine policy is enforced before the deny-list rolls. | client | already running fail-closed via `npm run actions:legacy-v1-memo-quarantine-check`; just keep it green through the migration. |

### Acceptance criteria for Shield to be production-private

1. `process_shield` on-chain, CPI-verifies the Shield Noir proof, moves funds into the program-owned PDA, and appends a leaf to the program-owned Merkle tree.
2. No Vanta-identifying string in any on-chain shield transaction.
3. ≥ 1024 distinct commitments in the active denomination cohort the user is depositing into.
4. The encrypted note material (owner secret, blinding, amount preimage) is stored only in the Argon2id-encrypted vault, never in unencrypted localStorage.
5. The Solana program plus the Shield circuit have been independently audited and the audit report is public.

---

## SEND (private transfer) — production gap list

### What "send" actually is today

The PPv2 Send circuit (`zk/noir/vanta_private_pool_v2_send_entry/src/main.nr`) consumes one input note and produces two output notes (recipient + change). The N1/N2 hardening from the 2026-05-14 audit is in place: owner commitment is derived from owner_secret (line 186), input commitment is rebuilt from `(owner, asset, amount, blinding, derivation_tag)` (189-196), nullifier is `Poseidon(input_commitment, owner_secret)` (210-211), and amount conservation `input_amount == recipient_amount + change_amount` is asserted (213). Recipient and change output roots are constrained with Poseidon append paths (223-259). All real fixes — this is a good circuit.

But the *live* Send doesn't run this proof against any verifier. The SPA calls the operator's `private-pool-v2-server.mjs` `send` endpoint, the operator applies the consumption to its local snapshot, encrypts a v2 AEAD memo with the recipient's viewing key, and writes the discovery packet to its indexer snapshot. No on-chain transaction at all. The privacy story today is "the operator promises not to log who Alice sent to."

Current local source update (2026-05-25 / PPA-DISCOVERY-001): the Private Pool v2 indexer now exposes an authenticated `/v1/send-discovery/view-tags` prefix-bucket pull endpoint with recorded-slot cursor pagination, exact full-tag query rejection, packet/query redaction for wallet/amount/network/private-input fields, and `productionReady=false` status blockers. This is local endpoint evidence only. Production recipient discovery still requires deployed service evidence, retention/log-redaction evidence, public or anonymous read posture, reviewer acceptance, and legacy v1 memo migration or segregation.

### Send production checklist

| Sev | Item | Owner | Concrete change |
|-----|------|-------|-----------------|
| Critical | **`process_send` does not exist.** The on-chain `TAG_SPEND_WITH_PROOF = 3` path is the closest thing; it's reserved with `ERR_PROOF_VERIFIER_NOT_WIRED`. Until a `process_send` (or generalized `process_spend_with_proof`) consumes a nullifier, appends two outputs to the program-owned tree, and CPI-verifies the Send Noir proof, the "send" is purely a database edit. | program | Wire the verifier CPI. The instruction data layout is already defined (`lib.rs:411-537`). Add range checks: `relayer_fee <= input_amount`, `recipient_amount + change_amount + relayer_fee == input_amount` in-circuit (currently the circuit only asserts `input_amount == recipient_amount + change_amount` and does not account for fee at all). |
| Critical | **Output commitments are not decomposed in-circuit.** Lines 159-280 of `send_entry/main.nr` use `recipient_output_commitment` and `change_output_commitment` as opaque private inputs and only check that their leaves are correctly appended. A malicious sender could produce a valid proof where `recipient_output_commitment` is a commitment to (owner=attacker, asset=USDC, amount=enormous, blinding=42). In the operator-trusted model this is masked because the operator constructs the output; in a trustless model it lets a sender create unspendable / fraudulent notes. | circuits | Add: `compute_recipient_output_commitment = bn254::hash_5([recipient_owner_commitment, asset_id_commitment, recipient_amount, recipient_blinding, recipient_derivation_tag])`; `assert(computed == recipient_output_commitment)`. Same for change_output_commitment with `owner_commitment` (sender's). Add `recipient_owner_commitment`, `recipient_blinding`, `recipient_derivation_tag`, `change_blinding`, `change_derivation_tag` as new private inputs. |
| Critical | **Fee not bound in-circuit.** Send circuit has no `relayer_fee` field. Without it, on a real on-chain relayer model, nothing stops a malicious operator from claiming a 100% fee. (Claim/unshield circuit `claim_entry.nr` does have `relayer_fee` at line 94 but never asserts `relayer_fee <= amount`.) | circuits | Add `relayer_fee: u128` as a public input. Assert `relayer_fee <= input_amount` and `input_amount == recipient_amount + change_amount + relayer_fee`. Bind into the public-input hash. |
| Critical | **Recipient discovery is local-only.** Today `private-pool-v2-service-network.mjs` writes "send discovery packets" to its indexer JSON snapshot. Anyone with the operator's filesystem can correlate sender → recipient by storage timestamp ordering. The encrypted memo body is opaque, but the *fact* that recipient X received a packet is observable. | ops + protocol | Local source now has a view-tag prefix pull endpoint guarded by `npm run indexer:view-tag-pull-check`, but it is not deployed query-private discovery. Next: deploy/review the discovery service, retention/log-redaction policy, public or anonymous read posture, reviewer acceptance, and legacy v1 memo migration or segregation. |
| Critical | **No replay protection on quote expiry.** Send circuit has no `quote_expires_at_slot` (Claim has it). A proof generated under root R1 stays valid against R1 forever; if the indexer ever accepts old roots in a window, an attacker who captures the proof bytes can replay until the root falls out of history. | circuits | Add `valid_until_slot` public input to Send and enforce on chain. |
| High | **Nullifier set live storage is JSON file**, not a database. `private-pool-v2-store.mjs` writes JSON via tempfile-rename (M11 fix from 2026-05-09 review applied). Under crash + concurrent send the rename is atomic, but on a Render free-tier replica with multiple instances state divergence is possible. | ops | Move nullifier set + indexer state to Postgres with `BEGIN; SELECT ... FOR UPDATE; INSERT; COMMIT;` for the nullifier-mark step. Baseline migration is required (`SECURITY_LIMITATIONS.md:90`). |
| High | **The operator can rewrite the nullifier file out-of-band.** Even after Postgres migration, the operator can `UPDATE nullifiers SET spent_at = NULL WHERE nullifier = ...` and double-spend. The only protection is on-chain enforcement. | program | The `nullifier_marker` PDA (`lib.rs:35, 119-120`) already exists; it just needs the proof-verified spend path to use it. Once `TAG_SPEND_WITH_PROOF` is wired this becomes a non-issue. |
| High | **Memo plaintext leakage risk on legacy v1.** Live Send writes v2 AEAD (`SECURITY_LIMITATIONS.md:55`) but legacy v1 memos are still readable. Anyone with historic vault state can read them. | client + ops | Force-migrate v1 → v2 with re-encryption (the quarantine policy currently fail-closes new writes but does not back-migrate). Schedule a one-time migration job. |
| High | **Send target wallet is the operator vault.** Even when an on-chain send circuit is in place, the *settlement* is two new commitments inside the same vault. The recipient cannot receive Send proceeds at a separate address — they receive a new note that must be redeemed via Unshield. This is correct for ZK pools, but the SPA must surface that the recipient is *not getting funds in their wallet*, they're getting a private balance. Today's copy in `SendPage.tsx` is ambiguous on this. | client | Add an explicit "your recipient receives a private note inside Vanta; they need a viewing key to claim or unshield" disclosure. |
| Medium | **No batching / cover-traffic.** `private-pool-v2-relayer-server.mjs` processes each request immediately. Timing correlation between Alice's submit and Bob's discovery packet write is trivial. | ops | Introduce a small randomized delay (e.g., 30-180s) and batch multiple sends per on-chain transaction. The Solana program already supports a single tx with multiple `TAG_SPEND_WITH_PROOF` invocations — exploit this. |
| Medium | **No IP/Tor protection on relayer.** The relayer logs the requesting IP by default in nginx-style access logs (no log redaction in service-network.mjs). | ops | Either deploy behind a Tor hidden service / Privacy Pass-style blinded tokens, or strip the IP at the load balancer. At minimum, document the relayer log retention policy in the threat model. |
| Medium | **`memo_discovery` is two ciphertext-body hashes in the public input.** Lines 132-135 of `send_entry/main.nr`. Anyone who learns the body hash can confirm a specific memo was sent; this is fine if the body hash is over the AEAD ciphertext (which it should be) and the recipient's discovery tag is separate. Verify this is the case and add a fuzz test. | circuits | Add a Crucible fixture that proves two different recipients with the same plaintext memo content produce different body hashes. |
| Low | **`request_version` is a private input** in Send but a public-input-hash component. Make it a `pub Field` so the verifier can pin protocol version directly. | circuits | one-line change in `main.nr:154`. |

### Acceptance criteria for Send to be production-private

1. On-chain `process_send` (or generalized spend) CPI-verifies the Send Noir proof, consumes the nullifier marker, and appends two leaves to the program-owned Merkle tree.
2. Output commitments are decomposed in-circuit and bound to `(owner_commitment, asset_id_commitment, amount, blinding, derivation_tag)`.
3. Relayer fee is in-circuit and bounded by `input_amount`.
4. Recipient discovery runs through a view-tag indexer; the operator cannot link sender to recipient from its local state.
5. ≥ 1024 distinct commitments per active denomination cohort.
6. Relayer batches and adds randomized delay; IP and timing log retention documented.
7. Audited.

---

## SWAP — production gap list

### What "swap" actually is today

The Swap circuit `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr` consumes one input note and produces one output note, with `settlement_commitment`, `route_commitment`, `economics_commitment` as opaque private fields (lines 99-125). The live path goes:

1. SPA calls operator's swap endpoint with a quote.
2. Operator's `jupiter-sol-to-shielded-route-adapter.mjs` requests a Jupiter quote (`api.jup.ag/swap/v1/quote`, `:25-28`) using the operator's Jupiter API key.
3. The operator's *liquidity signer* (a Turnkey-managed keypair, `operator/turnkey-sol-to-shielded-live-signer.mjs`) signs the Jupiter swap tx.
4. The new shielded note is registered in the operator's indexer snapshot.

This means: **the swap counterparty on Jupiter is the operator's liquidity wallet, not the user's wallet**. That's good for unlinkability between Vanta and the user's wallet. But the swap is observable to Jupiter / the routing venues / MEV searchers as "Vanta's liquidity wallet swapped X SOL → Y USDC" with a known signer. Repeated swaps from the same signer build a fingerprint.

### Swap production checklist

| Sev | Item | Owner | Concrete change |
|-----|------|-------|-----------------|
| Critical | **Swap circuit has zero binding to the economics or output preimage.** `output_commitment`, `economics_commitment`, `route_commitment`, `settlement_commitment` are all opaque private inputs. There is no in-circuit check that `output_commitment` corresponds to `(owner, output_asset, output_amount, blinding, derivation_tag)`, no check that `economics_commitment = H(input_asset, output_asset, input_amount, output_amount, slippage, …)`. A malicious operator who controls the prover can construct a valid proof that hands the user a smaller output than the swap actually returned, and skim the difference. | circuits | Add `compute_output_commitment(output_owner, output_asset_id, output_amount, output_blinding, output_derivation_tag)` and an `economics_commitment` derivation function mirroring Send. Add `input_amount`, `output_amount`, `output_asset_id_commitment`, `slippage_bps`, `min_output_amount`, `output_blinding`, `output_derivation_tag` as private inputs. Bind them. |
| Critical | **No on-chain swap settlement.** Today the swap tx hits Jupiter; the user's note transition is a database write. There is no on-chain proof that the Jupiter swap actually produced the claimed output. | program + ops | Two reasonable options: (a) `process_swap_to_shielded` that consumes the input nullifier on chain and uses a verifiable post-state attestation (Jupiter's confirmed signature read by the program via a CPI to a recorder program); (b) two-phase: shielded-note → public swap → re-shield, where each leg is on chain and the link is broken by a fixed delay. (b) is closer to deployable; (a) needs a Jupiter-attestation oracle. |
| Critical | **Liquidity wallet is identifiable on chain.** Jupiter sees the operator's liquidity wallet sign every Vanta swap. Any external observer can list every shielded swap by filtering Jupiter txs by signer. | ops | Rotate the liquidity wallet on a schedule (e.g., per-day or per-batch). Use multiple signers and rotate randomly. Long-term, integrate a venue that supports anonymous taker fills (limit orders posted from rotating signers; or RFQ via a privacy-preserving router). |
| Critical | **MEV / sandwich exposure.** The operator's swap tx is a normal Jupiter tx. Searchers can sandwich it. The user has no protection — and crucially, the *output amount* that gets bound into the shielded note is whatever Jupiter returned, which a sandwich can degrade arbitrarily up to the slippage tolerance. | ops + product | Route via a private mempool (Jito bundles), use slippage tolerance ≤ 0.5% with retry-on-failure, or use an RFQ venue (e.g., 0x RFQ-style). Document the worst-case loss vs. the disclosed slippage. |
| Critical | **`route_commitment` and `settlement_commitment` are operator-trusted.** Even with the binding fixes above, the *route* (which venue, which pool, which liquidity provider) is whatever the operator says it is. There is no in-circuit check that the route is sane. | product + circuits | This may be fine to leave operator-trusted at v1 as long as the SPA *commits to the route off-chain* and shows it to the user before they sign. Long-term consider Bonsol-style verifiable execution. |
| High | **Slippage is not in-circuit-asserted against the disclosed quote.** A user signs a proof to "swap 10 SOL for ≥ 290 USDC". The Noir circuit needs `min_output_amount` bound to the public input hash, and the on-chain settlement needs to verify `actual_output_amount ≥ min_output_amount` before appending the output commitment. | circuits + program | Add `min_output_amount` to the Swap circuit's public input. The on-chain `process_swap` reads Jupiter's confirmed output (via a confirmed-tx oracle or post-trade attestation) and rejects if below threshold. |
| High | **No quote-expiry on Swap.** Same issue as Send. | circuits | Add `valid_until_slot`. |
| High | **Quote leakage in operator logs.** `requestJupiterQuote` logs to operator-side console; the Jupiter API key is in operator env (`VANTA_JUPITER_QUOTE_URL`, `JUPITER_API_KEY` at adapter lines 25-28). Any operator-side log subpoena reveals the full quote trail for every user. | ops | Adopt the `safe-logging-check` policy (already exists in `npm run mainnet:secret-handling-check`) and redact: never log full quote, never log input amount, only log redacted handles per the existing `committed-economics` discipline. |
| High | **Fee not in-circuit-bounded.** Same as Send. Add explicit relayer/protocol fee fields with `fee ≤ input_amount` and `input_amount = output_amount_equivalent + fee` (in some price-anchored representation). | circuits | New private inputs. |
| Medium | **Turnkey signer dependency is a single trust point.** `turnkey-sol-to-shielded-live-signer.mjs` delegates signing to Turnkey. If Turnkey is compromised, the liquidity wallet drains. | ops | Multi-sig the liquidity wallet via Squads or similar. Document the fallback path. |
| Medium | **Concurrent quote ↔ execute race.** If two swaps share the same input note (e.g., user double-clicks), both quotes can be requested. The operator-side nullifier check serializes but not before the Jupiter quote burns API quota. | ops | Per-note quote lock with idempotency key. |
| Medium | **Output asset registry is fixed.** `swapAssetCatalog.ts` enumerates supported output assets. Anything outside is rejected. Fine, but the SPA should make clear that "any Solana asset" is overclaim. | client | already covered by `SECURITY_LIMITATIONS.md:66-67`. Keep `truth:privacy-claim-gate` green. |
| Low | **Jupiter API URL `https://api.jup.ag/swap/v1/quote` is fine, but check rate-limit handling.** A 429 from Jupiter during a high-traffic event will fail the swap silently. | ops | add `isSolanaRpcRateLimitError`-style retry and surface to user. |

### Acceptance criteria for Swap to be production-private

1. Swap circuit binds output_commitment to its preimage and economics_commitment to `(input_asset, output_asset, input_amount, min_output_amount, slippage_bps, blinding)`.
2. On-chain swap settlement reads the actual Jupiter (or other venue) output amount and rejects if below `min_output_amount`.
3. Liquidity wallet rotated frequently enough that no single wallet is a fingerprint.
4. Swaps routed via Jito bundles (private mempool) or RFQ.
5. Per-user quote expiry on chain.
6. Audited.

---

## UNSHIELD — production gap list

### What "unshield" actually is today

Two paths exist and they don't agree:

- **PPv2 Claim circuit** (`zk/noir/vanta_private_pool_v2_claim_entry/src/main.nr`) — well-formed, binds `(asset_id, amount, owner, destination, relayer_id, relayer_fee, quote_expires_at_slot)` to the public-input hash. This is what *would* run if `TAG_UNSHIELD = 6` were verifier-wired.
- **Private Core single-note Unshield circuit** (`zk/noir/vanta_private_core_single_note_unshield/src/main.nr`) — also unwired on chain, and has a **critical nullifier construction bug**: `derive_nullifier(..., state_root, leaf)` at lines 97-117 binds the nullifier to the state_root. The same note proves to a *different nullifier* under each historic root, so once the verifier is wired, the same note can be spent multiple times by re-proving against different roots.

Current local source update (2026-05-25 / PPA-PROGRAM-002): `operator/unshield-server.mjs` no longer loads a vault keypair or sends direct SOL/SPL transfers for Unshield release. It now returns a fail-closed `TAG_UNSHIELD` relay receipt shape with `programTxSignature = null` until a real program transaction exists. This is not live proof-verified custody yet: deployed/live status still must be checked separately, and production release remains blocked until the on-chain verifier/root/public-input/nullifier path is real.

### Unshield production checklist

| Sev | Item | Owner | Concrete change |
|-----|------|-------|-----------------|
| Critical | **Private Core unshield nullifier binds to `state_root`.** `vanta_private_core_single_note_unshield/main.nr:97-117`. This is a double-spend vector the moment any verifier accepts proofs against multiple historic roots — which any normal anonymity-preserving system does. | circuits | Remove `state_root` and `merkle_leaf` from the nullifier preimage. Use `bn254::hash_3([owner_secret, note_secret, note_nonce])` or `bn254::hash_2([owner_secret, leaf_index])` — the canonical Tornado/ZCash shape. Add a Crucible fixture that proves a note generates the same nullifier against two different historic roots. |
| Critical | **`TAG_UNSHIELD` SOL release path was missing zero-nullifier rejection** (AUDIT-2026-05-19 H3). Per code review the check has since been added at `lib.rs:2368-2374`. **Verify** this fix is in the live deploy. | program | grep `is_zero_hash(&nullifier)` in `process_unshield` — verified present in current `main`. Keep as regression test. |
| Critical | **No on-chain proof verification, today.** Same root cause as Send/Swap — `cfg!(not(test)) => ERR_UNSHIELD_NOT_WIRED` at `lib.rs:2415-2417`. The current SOL release path returns success only in cargo test. | program | Wire the verifier CPI. The instruction shape is already defined (`UNSHIELD_PAYLOAD_LEN`). Add the verifier CPI between preflight and the system_transfer. |
| Critical | **Vault release must be PDA-signed, not operator-keypair-signed.** Local PPA-PROGRAM-002 source removed direct operator keypair release behavior and added fail-closed TAG_UNSHIELD relay receipt shape. Program source now carries SOL PDA system CPI and SPL PDA `transfer_checked` release shapes, but production release still fails closed before fund movement. | program + ops | Complete the real on-chain verifier/root/public-input/nullifier path, then allow PDA-signed release only after proof verification and nullifier consume. Do not flip `releaseEnabled` to production-required `1` until that path is real and reviewed. Verify deployed/live source separately before treating the operator-keypair path as removed in production. |
| Critical | **`cfg!(test)` gates safety, not runtime state.** AUDIT-2026-05-19 H4. An accidental build with `--cfg test` flips production into the helper success path. | program | Replace with `pool_state.verifier_wired: bool`, set by an authority-signed init instruction post-audit. |
| Critical | **`require_vault_asset_record` semantics may be inverted.** AUDIT-2026-05-19 M4: the comment says "must require `releaseEnabled`", the code rejects when the byte is non-zero. Pick one before TAG_REGISTER_VAULT_ASSET ships. | program | trivial fix; add a unit test asserting the intended direction. |
| Critical | **Destination reveal on unshield is total.** Even with the proof wired, the system_transfer goes `vault PDA → destination` in a single Solana tx. Anyone watching the vault PDA can see the destination and exact amount. This **is the fundamental privacy boundary**: the only way to break the destination-link is via fresh-address exit (relayer-paid gas to a never-used destination) or a delay-mix. | protocol | Enforce that `destination` must be a fresh address (no prior on-chain history) — verify in-circuit via a witness that the destination has been part of zero confirmed txs at proof-time. Pair with a relayer that pays the destination's first lamports so the user doesn't have to pre-fund it. R6A proof-bound destination commitment scaffolding is in place; complete the binding. |
| Critical | **Anonymity-set timing trivial-link.** If only Alice unshielded 5 SOL in the last 10 minutes, and the vault sends 5 SOL out 30 seconds later, the link is trivial. | protocol | Mandate a randomized exit-delay window (e.g., 30s-1h) and batch multiple unshield exits per block. Document the delay-window distribution in the threat model. |
| Critical | **Anonymity set is 2.** Same point as Shield. Without ≥ 1024 distinct in-pool commitments, unshield privacy is purely theoretical. | ops | gate. |
| High | **Claim circuit does not assert `relayer_fee ≤ amount`.** A user can sign a proof where relayer_fee > amount; off-chain code happens to reject but the circuit doesn't. | circuits | one-line assert. |
| High | **No range checks on `amount`, `relayer_fee` arithmetic.** Both are u128. In Noir u128 is checked on construction but the operation `amount - relayer_fee` happens off-circuit. The circuit should compute and bind `net_payout = amount - relayer_fee` with `relayer_fee ≤ amount`. | circuits | new public input `net_payout` plus the constraint. |
| High | **Refund handling missing.** If the on-chain release fails mid-flight (e.g., destination ATA rent-exempt fails), the nullifier marker has already been created and the funds are locked. | program | Move nullifier mark *after* the successful CPI transfer, or implement a `process_unshield_revert` instruction that requires a `releaseFailed` attestation and re-credits the user's commitment. |
| High | **SPL unshield remains fail-closed.** Local PPA-PROGRAM-002 source now carries a reserved `spl_token::instruction::transfer_checked` CPI shape signed by the vault authority PDA, but production still returns `ERR_UNSHIELD_NOT_WIRED` before release because proof/root/nullifier verification is not real. | program | Wire the verifier/root/nullifier path first, then add a reviewed Crucible fixture for SPL release end-to-end before enabling production release. |
| High | **Rate-limiting / dust attacks.** A spammer can submit thousands of tiny unshield requests, costing the operator gas and bloating the relayer's nullifier-mark queue. | ops | Implement per-IP and per-recipient rate limits (Redis-backed, not in-memory). Document the per-block cap. |
| Medium | **Operator-side guard `assertEligibleDirectSolUnshieldRelease` is JavaScript.** The release path's only safety today is this guard, which can be bypassed by anyone with the keypair (subpoena, breach, malicious insider). | ops | Move to a multi-sig + HSM for the keypair until on-chain release is live. Even better: drop the operator-signed path the day the verifier ships. |
| Medium | **Audit manifest at `/.well-known/vanta-audit.json` stale.** AUDIT-2026-05-19 M3. Live SPA asset hash drift vs. attested commit. | ops | re-attest as part of pre-deploy checklist. |
| Low | **`Bearer` token absent in browser** so SPA cannot independently verify roots. AUDIT-2026-05-19 M6. | ops | the deployed indexer must expose a public read endpoint after launch. |

### Acceptance criteria for Unshield to be production-private

1. `process_unshield` CPI-verifies the Claim Noir proof and `invoke_signed`s the transfer from the PDA. Operator keypair is removed from the release path entirely.
2. Private Core unshield nullifier is fixed (no state_root binding) OR the Private Core unshield circuit is deleted in favor of the PPv2 Claim circuit.
3. Destination is proof-bound and required to be a fresh address.
4. Randomized exit-delay window enforced by the relayer.
5. SPL unshield wired end-to-end with vault authority PDA CPI.
6. Audited.

---

## Cross-cutting items

These apply to all four lanes; addressing them once removes the issue from each.

### Trusted setup / verifying key

- **Status today.** Noir circuits compile locally via NoirJS bb.js / UltraHonk. The proof artifact comes back labelled `local-bb-derived-artifact` (per `SECURITY_LIMITATIONS.md:52`). No production verifying-key ceremony has been run; no production verifier-key has been registered on chain. `TAG_REGISTER_VERIFIER_KEY = 5` creates the verifier-key PDA but it is unused by any live tx.
- **Required.**
  - Choose a production proof system. The reserved on-chain ABI assumes Gnark Groth16 (`SPEND_WITH_PROOF_GNARK_PROOF_LEN = 324`, `SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN = 44`, `lib.rs:95-97`), but circuits are written in Noir and run UltraHonk locally. Either (a) re-prove via a Noir → Gnark adapter (gnark-solana verifier exists for Groth16 only — large work), or (b) deploy an UltraHonk verifier (Light protocol / Aztec have published variants). Pick one. Today's repo claims direction (a) (`c01-production-verifier-backend-candidate-check`); confirm the decision is final before launch.
  - If Groth16: run a public, multi-participant powers-of-tau ceremony for each of the five production circuits (Shield, Send, Swap-to-shielded, Claim/Unshield, Actual-private-spend). Publish all transcripts and the final verifier-key hashes. Register each via `TAG_REGISTER_VERIFIER_KEY` on chain.
  - If UltraHonk: deploy a verified UltraHonk verifier program (Light protocol's is the most mature option in 2026). No ceremony needed but the verifier program itself needs an audit.

### Key custody and secrets

- **Status today.** Operator keypair is loaded from env (`VANTA_UNSHIELD_OPERATOR_KEYPAIR`). Liquidity signing is Turnkey. Vault funds depend entirely on the operator wallet's secret.
- **Required.**
  - Remove the operator keypair from the unshield release path (item 2 in the TL;DR).
  - Move the remaining operator-signed flows (init, register-root, register-verifier-key, register-vault-asset) to a multi-sig (Squads) with rotating signers. Document the threshold.
  - Document key rotation runbook and incident response in `docs/key-custody-runbook.md`. Today only `docs/threat-model.md` exists.
  - Audit Turnkey integration for the liquidity wallet — verify the policy locks prevent withdrawals to non-allowlisted destinations.

### Relayer infrastructure

- **Status today.** `private-pool-v2-relayer-server.mjs` is a 9-line shim around `private-pool-v2-service-network.mjs`. Bearer-token auth works. In-memory rate-limit (M2 in prior audit). No batching, no Tor, no cover traffic, no per-IP redaction, no jitter.
- **Required.**
  - Postgres-backed rate limit + idempotency table.
  - Randomized jitter on submission (30-180s window for sends, 30s-1h for unshields).
  - Multi-tx batching per Solana block when load allows.
  - At least one relayer endpoint behind a Tor hidden service or accepting blinded-token submissions.
  - IP log retention policy ≤ 7 days, documented.

### Frontend / SPA

- **Status today.** Live bundle has `VITE_USE_INDEXER` flag but no working integration (AUDIT-2026-05-19 H1, H2). The SPA falls through to the operator for every read. Helius RPC project URL is in the bundle (H5).
- **Required.**
  - Either delete `src/zk/indexerClient.ts`, `src/zk/clientProver.ts`, `scripts/verify-client-side-proving.mjs`, `scripts/check-vanta-indexer-client-integration.mjs`, `FINAL_IMPLEMENTATION_SUMMARY.md`, `PRODUCTION_READINESS_CHECKLIST.md`, `PRODUCTION_SIGNOFF.md` (the cleanest move) or finish the integration. Today these files claim things that aren't true.
  - Proxy or runtime-config the Helius URL out of the bundle (H5).
  - Implement simulate-before-sign with a parsed-readable summary modal on every wallet signature.
  - Move all shield/send/swap/unshield records into the Argon2id-encrypted vault. Stop persisting commitments + ownerPublicKey in unencrypted localStorage.

### Threat model

- **Status today.** `docs/threat-model.md` exists, gated by `docs:source-of-truth-check`.
- **Required.** Threat model must cover:
  - Operator compromise (full keypair theft) — what's the worst case.
  - Indexer compromise — read-only leak of viewing-key-tagged packets.
  - Relayer compromise — censorship, replay, timing-correlation.
  - Jupiter / routing-venue MEV.
  - Browser localStorage forensics (shared devices).
  - Legal: subpoena response, KYC/AML stance, OFAC sanctions filtering (the unshield endpoint today does no sanctions screening on `destinationOwner` — this is a launch-blocker for any US-tied operator).

### Audit

- **Status today.** Not contracted. R20/R21 in the kanban tracker are correctly marked blocked.
- **Required.** Independent ZK-circuit audit (must include the Send and Swap output-commitment binding gap before they're fixed, then re-audit). Independent Solana-program audit (must include the cfg-test → runtime-flag migration and the PDA vault transition). Published reports. Bug bounty open from launch day.

---

## Recommended remediation order

This is the order that maximizes "real privacy delta per week" given the dependency graph. Items in each band can run in parallel.

**Band 1 — circuit fixes (no infra dependencies).** 1-2 engineer-weeks each.
1. Fix Private Core unshield nullifier (drop state_root binding).
2. Bind output commitments in Send and Swap circuits.
3. Add `relayer_fee ≤ amount` and net-payout enforcement in Send and Claim.
4. Add `valid_until_slot` to Send and Swap circuits.
5. Add output_amount / min_output_amount / slippage binding to Swap circuit.

**Band 2 — on-chain program (after band 1 stabilizes).** 4-8 engineer-weeks total.
6. Implement program-owned Poseidon Merkle tree (depth 20, in-program append, root history). Local source/SBF implementation added 2026-05-25 for a tag `9` one-leaf append lane; still not deployed/live/audited and still not wired to Shield deposits, Send two-output appends, verifier acceptance, or production privacy claims.
7. Implement `process_shield` for SOL and SPL with PDA vault.
8. Wire `TAG_SPEND_WITH_PROOF` to invoke the chosen verifier program (after verifier program is itself deployed).
9. Wire `TAG_UNSHIELD` SPL path. Wire SOL path's proof verification.
10. Replace `cfg!(test)` gates with `pool_state.verifier_wired` flag.

**Band 3 — verifier + ceremony (gates band 2 step 8).** 2-4 weeks.
11. Pick Groth16 vs UltraHonk-on-Solana once and for all. Document.
12. If Groth16: run public powers-of-tau ceremony, ≥ 50 contributors. Register verifier keys.
13. Deploy and audit the verifier program.

**Band 4 — anonymity set bootstrap.** Continuous, gated on bands 1-3 having externally accepted production evidence.
14. Closed alpha with operator-bonded shield deposits in one fixed-denomination cohort (e.g., 1 SOL). Drive `currentDistinctCommitments` ≥ 1024.
15. Public beta gated on anonymity-set probe staying ≥ 1024.

**Band 5 — relayer maturity.** 2 engineer-weeks.
16. Postgres-backed nullifier + rate-limit.
17. Randomized jitter + batching.
18. Tor / blinded-token relayer path.

**Band 6 — recipient discovery.** 2-3 engineer-weeks.
19. View-tag pull API on the indexer.
20. Force-migrate legacy v1 memos.

**Band 7 — audit + launch.** 6-12 weeks calendar.
21. Contract two independent audit firms (one ZK-specialist, one Solana-program-specialist).
22. Bug bounty live from launch.
23. Lift the privacy-claim gate only after audits + anonymity ≥ 1024.

**Band 8 — compliance + ops.**
24. OFAC sanctions screening on unshield destinations (decision: implement or accept jurisdiction limits).
25. Threat model published. Incident-response runbook published. Key-custody runbook published.

---

## What is genuinely production-quality today

To finish on what's working, since the gaps above are not the whole story:

- **N1/N2 circuit hardening is correct.** Shield/Send/Swap-to-shielded/Claim/actual-private-spend all decompose the input commitment and bind owner_commitment to owner_secret in-circuit. This was the headline finding from the 2026-05-09 review and it is genuinely fixed.
- **The on-chain program's preflight discipline is good.** Every TAG path validates account count, payload length, PDA derivation, root-record provenance, nullifier-marker freshness, and the verifier-key binding before any state mutation, and fails closed. The hard work for a future verifier wiring is already done.
- **The role-service network does proper Bearer-token auth** and requires `NODE_ENV=production` to enforce token presence (`service-network.mjs:549-574`). It refuses local JSON snapshot stores in production mode.
- **Argon2id vault migration (R14) is implemented correctly** with v1/v2 readback compatibility — exactly the right way to migrate KDFs (`privateVault/privateVaultCrypto.ts`).
- **The kanban tracker is unusually honest.** `docs/goals/2026-05-14-claude-privacy-audit-tracker/` correctly marks all the items above as blocked rather than overclaimed. The truth-claim gate (`npm run truth:privacy-claim-gate`) is a real piece of governance discipline.

The work that remains is large but well-scoped. None of it is hand-waving; every item above has a concrete owner, file, and acceptance criterion.

---

## Appendix — verification commands that should stay green pre-deploy

```
npm run truth:privacy-claim-gate
npm run zk:circuit-soundness-lint
npm run private-pool-v2:shield-circuit-check
npm run private-pool-v2:send-circuit-check
npm run private-pool-v2:claim-circuit-check
npm run private-pool-v2:swap-to-shielded-circuit-check
npm run private-pool-v2:actual-private-spend-circuit-check
npm run private-core:send-check
npm run private-core:swap-check
npm run zk:c01-positive-proof-verified-claim-gate-check
npm run private-pool-v2:onchain-unshield-custody-check
npm run private-pool-v2:root-provenance-check
npm run private-pool-v2:service-network-check
npm run private-pool-v2:role-storage-check
npm run mainnet:role-service-replay-evidence-check
npm run mainnet:secret-handling-check
npm run public:live-meta-description-check
npm run private-pool-v2:live-anonymity-set-probe-check
npm run public:audit-discovery-check
npm run frontend:operator-env-exposure-check
npm run unshield:public-exit-surface-check
npm run send:direct-viewing-key-exchange-check
npm run actions:legacy-v1-memo-quarantine-check
npm run private-vault:crypto-check
npm run docs:source-of-truth-check
npm run build
```

Add (new):

```
# After band 1
npm run send:output-commitment-binding-check        # new
npm run swap:output-commitment-binding-check        # new
npm run swap:economics-binding-check                # new
npm run private-core-unshield:nullifier-binding-fixture-check   # new — proves same note yields same nullifier under N different roots
npm run claim:relayer-fee-bound-check               # new

# After band 2/3
npm run private-pool-v2:groth16-verifier-cpi-check  # new
npm run private-pool-v2:pda-vault-custody-check     # replaces operator-keypair gate
npm run private-pool-v2:program-merkle-tree-check   # new

# After band 5/6
npm run relayer:jitter-and-batching-check
npm run indexer:view-tag-pull-check
```

# Vanta ZK / Shielded Pool Review

**Reviewer:** Claude (Cowork mode)
**Date:** 2026-05-09
**Scope:** ZK / shielded pool surface — `src/zk`, `src/privacy/privatePoolV2*`, `zk/noir/*`, `programs/vanta_private_pool_v2_spend`, plus the crypto modules used by the shield lane (`vantaShieldViewingKey.ts`, `ownerRecoveryPayloadCrypto.ts`, `privateVaultCrypto.ts`).
**Out of scope:** operator HTTP server, Pay product surfaces, frontend UX, infra/deploy scripts.
**Method:** static read of the repo + cross-referencing against `SECURITY_LIMITATIONS.md`. The live deployment at `vantaprivacy.xyz` could not be probed from this environment (network allowlist).

---

## Critical findings

### 1. The on-chain Solana program does not verify proofs at all

`programs/vanta_private_pool_v2_spend/src/lib.rs` — and its README literally says **"no proof verification"**. The `process_spend` instruction takes `[1, nullifier:32, output0:32, output1:32, publicInputHash:32]` and writes it to fixed-slot accounts. It checks duplicates and account ownership, but there is no Groth16/PLONK/Honk verifier, no signature check, no authority gate, no Merkle-root anchoring. The instruction is callable by any wallet that pays rent.

This means the on-chain "evidence" account is **not enforcing privacy or soundness**. It is a public append-only log whose integrity rests entirely on the off-chain operator deciding what to submit. The README in `programs/.../README.md` calling this "anchoring private spend evidence" overstates what the program does.

### 2. The on-chain program is trivially DoS-able

Because there's no signer/authority check (item 1), anyone can call `process_spend` with any random 32-byte nullifier. Each call permanently consumes one slot in the fixed-size `nullifier_set` account. When `ERR_NULLIFIER_SET_FULL` triggers, the pool is bricked — no legitimate spend can ever be accepted. Cost to brick: roughly one transaction's compute fee per slot. This is independent of any ZK property and applies right now to anything you deploy.

The duplicate-detection loop is also O(n) (`for slot in nullifier_slots(...)`). Long before the account fills, the linear scan will exceed Solana's compute-unit budget per call, freezing the pool earlier than the explicit "full" error.

**Recommended fixes** for a v2 spend program before any real deployment:

- Require a signer key whose pubkey matches a configured operator/authority.
- Commit a verifying-key hash and verify a real proof against `publicInputHash` in-program (or via a dedicated verifier program / Light-Protocol-style verifier).
- Anchor `accepted_root` to a stored historical root set so a forged `input_root` from the proof can't be slipped in.
- Replace the linear nullifier scan with a sharded or PDA-keyed nullifier-existence account so capacity scales and lookup is O(1).

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

### 4. The "entry" circuits skip Merkle membership

The actual_private_spend circuit (`vanta_private_pool_v2_actual_private_spend_entry/src/main.nr`) is well-formed: it computes the Merkle root from the input commitment + path and asserts equality with `accepted_root`. **Good.**

But the `send_entry`, `claim_entry`, `shield_entry`, and `swap_to_shielded_entry` circuits each take `input_root` (or `output_root` / `previous_root`) as a witness without ever proving the input commitment is a member of that root. They just hash the public inputs together. Concretely in `vanta_private_pool_v2_send_entry/src/main.nr`:

- It computes `nullifier = poseidon(input_commitment, owner_secret)` — but `input_commitment` is unconstrained.
- It computes `output_root = poseidon3(previous_root, leaf, leaf_index)` — that is **not Merkle insertion**, it is a 3-input hash chain. The "tree root" updated by these circuits is meaningless as a tree.

A prover can spend any commitment they invent against any root they like. Use `vanta_private_pool_v2_actual_private_spend_entry` as the template and back-port real Merkle membership + an incremental-Merkle-tree append (e.g., zero-padded fixed-depth tree with Poseidon node hashing) into all four entry circuits.

### 5. Anonymity-set depth is 3

All the production-shaped circuits (`vanta_private_core_single_note_*`, `vanta_private_pool_v2_actual_private_spend_entry`) declare `global MERKLE_DEPTH: u32 = 3;`. That is a maximum of **8 leaves per tree**. Tornado Cash uses depth 20–32 (1M–4B leaves). With depth 3 there is no anonymity set; even on the cleanest deployment, the recipient set is small enough to deanonymize trivially. The `canonical_note_membership` circuit is depth 20, but its hash is broken (item 3). Decide on a real depth (≥20) and migrate.

---

## High findings

### 6. `ownerRecoveryPayloadCrypto.ts` is hand-rolled crypto

`src/zk/crypto/ownerRecoveryPayloadCrypto.ts` builds an "encrypt-then-MAC" out of XOR with `SHA-256(keyMaterial || counter)` keystream and `SHA-256(label || pubKey || recoverySecret || nonce || ciphertext)` as auth tag. Three distinct problems:

- **Not HMAC.** The MAC is raw `SHA-256` over a secret-containing message. Length extension is mitigated here only by the length-prefix on the ciphertext field; that is brittle defense compared to using `hmac` from `@noble/hashes/hmac` or — far better — the `xchacha20poly1305` AEAD that you already use in `vantaShieldViewingKey.ts`. There is no reason this module should look different from that one.
- **No key stretching.** `recoverySecret` flows in directly. If it's ever derived from a user-typed phrase, this is brute-forceable.
- **Catastrophic on nonce reuse.** XOR keystream + same key + same nonce reveals the XOR of both plaintexts. The function takes the nonce from the caller; there's no internal protection. Either generate the nonce inside `encrypt()` (like `vantaShieldViewingKey` does), or refuse to encrypt with a nonce already seen for that key.

**Fix:** replace the entire file with the same X25519+HKDF-SHA256+XChaCha20-Poly1305 pattern used by `vantaShieldViewingKey.ts`. There is no reason to maintain two crypto pipelines, and the stronger one is already in the repo.

### 7. PBKDF2-SHA256 at 120k iterations for the private vault

`src/privateVault/privateVaultCrypto.ts` uses PBKDF2-SHA256 / 120,000 iterations. OWASP's 2023 PBKDF2-SHA256 baseline is 600,000 — and PBKDF2 is GPU-friendly. For a wallet/vault password derivation in 2026, the right primitive is Argon2id (memory-hard). Either bump iterations to ≥600k (cheap quick fix) or migrate to Argon2id with a proper `v2` envelope and decryption fallback for `v1`.

### 8. Local prover is not a prover, by design

`src/privacy/privatePoolV2LocalProver.ts` returns `proofBytes = SHA-256(scheme || provingKeyId || publicInputCommitment)` and `proofSystem: "mock"`. The `verify` method literally re-runs `prove` and compares hashes. The class disclaims this in `readiness().warnings` — credit there. But several upstream code paths consume its output as if it were a proof, so the trust boundary needs to be strict: any code that takes a `VantaPrivatePoolV2ProofResult` whose `proofSystem === "mock"` should refuse to advance to a settlement that touches real funds. Spot-check `vantaPrivateCoreOperatorClient.ts` and the `liveSendBridge.ts` / `liveSwapBridge.ts` paths against this rule.

---

## Medium findings

### 9. `membership_path_hi + membership_path_lo` adds no security

In `vanta_private_core_single_note_send/src/main.nr` and the swap variant, the sibling at each level is computed as `let sibling = membership_path_hi[i] + membership_path_lo[i];`. Many `(hi, lo)` pairs collapse to the same sum, so the split contributes nothing — it just doubles the witness size and adds surface area for a future bug. Either make `hi`/`lo` mean something (e.g., bit-decomposed with range checks) or use a single `Field` per level.

### 10. Including `is_current_right` in `hash_merkle_node` is non-standard

`hash_merkle_node(left, right, is_current_right)` mixes the path bit into the parent hash. Once you separately enforce direction-correct ordering (which the code does via the `if is_current_right == 1`), the bit doesn't need to enter the hash. Including it changes the meaning of "tree root" — node at position `(L, R)` produces a different parent depending on whether the prover claims to be the left or the right child during the proof. This is unusual enough that I'd recommend either removing the bit from `hash_merkle_node` (matching standard incremental Merkle trees) or documenting why it's there and making sure the off-chain indexer matches bit-for-bit.

**Codex status, 2026-05-09:** remediated for `canonical_note_membership` and all Private Pool v2 entry circuits by standardizing node hashing on `hash_2(left, right)` / `poseidon2([left, right])`. Direction bits now only select ordering and compute leaf-index consistency. The Private Core single-note send/swap/unshield circuits still need the same convention update.

### 11. Off-chain nullifier replay guard relies on Node single-threading for atomicity

`src/privacy/nullifierReplayGuard.mjs` is correct under Node's event loop, but the comment around `productionReady: false` is right — for the Postgres adapter (`postgresNullifierReplayStore.mjs`), reservation must use `INSERT ... ON CONFLICT DO NOTHING RETURNING *` inside a transaction to be safe under concurrency, not a separate `SELECT` then `INSERT`. If the production guard is the source of truth (because the on-chain program isn't, see item 1), this race becomes the actual double-spend boundary.

### 12. Shield circuit reveals economics in public inputs

`vanta_private_pool_v2_shield_entry/src/main.nr` exposes `source_mint`, `target_mint`, `target_asset_id`, `amount` in the public input bag. The README and `SECURITY_LIMITATIONS.md` already say shield isn't economic-private. The recommendation is to add a "committed shield" mode where the proof binds `economics_commitment = poseidon(asset, amount, blinding)` and the raw fields stay in the encrypted memo, mirroring how the send/swap/unshield entries do it.

### 13. Frontend exposes operator tokens through `VITE_*` envs

`SECURITY_LIMITATIONS.md` already calls this out: "any `VITE_...` token bundled into the app is suitable only for local or controlled test environments". Worth one more look — anything matching `VITE_OPERATOR_*` that ships in the production bundle should be removed before any mainnet operator action. A grep through the bundled JS at `vantaprivacy.xyz/assets/*.js` would be the next step (couldn't do from this environment — egress blocked).

---

## What's actually good

- `src/solana/vantaShieldViewingKey.ts` is textbook: X25519 + HKDF-SHA256 + XChaCha20-Poly1305 with random 24-byte nonce. **This is the template the rest of the crypto in the repo should be modeled on.**
- `vanta_private_pool_v2_actual_private_spend_entry/src/main.nr` is a real ZK circuit: real Poseidon, real Merkle membership check, real direction-bit-to-leaf-index check, public-input hash binding. The code shape proves the team can write circuits correctly when they choose to.
- `SECURITY_LIMITATIONS.md` is the most honest crypto-project security doc I've read on a project not yet audited. The repo's own readiness commands are largely fail-closed against the gaps above. The framing ("alpha", "not audited", "not mainnet ready") is appropriate. The work below is to make the code match that framing — i.e., refuse to *enable* live-funds paths until items 1–5 are fixed.

---

## Recommended order of operations

If you're going to fix anything, the priority I'd suggest is:

1. **Solana program signer/authority gate.** Blocks the DoS today, costs a single field of state and an `is_signer` check, and doesn't depend on any ZK work. (item 2)
2. **Replace `ownerRecoveryPayloadCrypto.ts`** with the same X25519+XChaCha20-Poly1305 pattern as `vantaShieldViewingKey.ts`. One file, removes a class of bugs. (item 6)
3. **Real Merkle membership + incremental-tree append in the four "entry" circuits**, using `actual_private_spend_entry` as the template. (item 4)
4. **Bump Merkle depth to ≥20** across all production circuits and update fixtures. (item 5)
5. **Delete or repair `canonical_note_membership`.** (item 3)
6. **On-chain proof verification.** Biggest piece of work. Either embed a Groth16/Honk verifier (Light Protocol's `groth16-solana` is the usual reference), or have the program accept proofs and CPI into a verifier program. Pair this with anchoring `accepted_root` against a stored history. (item 1)

---

---

# Shield Lane — Deep Dive

This section walks the shield happy-path end-to-end, names each gap, and lays out a concrete build plan to turn shield from "custodial deposit + private side-database" into a real shielded-pool deposit lane.

## How shield works today

The trace, from the user clicking *Shield* to the final state:

1. **UI / wallet selection.** `src/solana/shieldAssetCapability.ts` decides one of four modes for the source asset: `direct-native-sol`, `direct-configured-token`, `route-to-configured-shield-token`, or `unsupported`. The "configured shield assets" come from `src/solana/shieldConfig.ts` (USDC, USDT, BONK, JUP, etc.) — each with a `mintAddress` and a `vaultOwner` resolved from `VITE_VANTA_MAINNET_VAULT_OWNER` or per-token env vars.
2. **Vault owner resolution.** `src/solana/userVaultOwner.ts` falls back to deriving a PDA from `VITE_VANTA_VAULT_DERIVATION_PROGRAM_ID` with seeds `["vanta", "shield-vault", walletPubkey]`. If the env is unset, the vault owner is just a hard-coded address (`MAINNET_SHIELD_VAULT_OWNER_FALLBACK = "7yUfwUmZMYLg95xJGR762z4WpqfR6hBRqt9mcgNArtdi"`).
3. **On-chain transfer.** `src/solana/splShieldTransfer.ts` builds a plain SPL `transferChecked` from the user's ATA to the vault owner's ATA (or a `SystemProgram.transfer` for native SOL). User signs in their wallet. **There is no Vanta program in the loop here** — this is a regular Solana token transfer to a custodial address.
4. **Local note recording.** Once the deposit confirms, `src/zk/liveShieldBridge.ts:recordCanonicalShieldFromLiveShield` runs in the browser:
   - Creates a `CanonicalNoteV1` (asset, amount, ownerPublicKey, creationHint with depositSignature) via `src/zk/canonicalNote.ts`.
   - Generates `recoverySecret = randomHex32()` client-side. **There is no backup.**
   - Derives a SHA-256 commitment via `deriveCanonicalNoteArtifacts`.
   - Inserts the commitment into `AppendOnlyShieldedState` (a hash-chain, not a Merkle tree — see `src/zk/shieldedState.ts:deriveShieldedStateRoot`).
   - Persists the record list to `localStorage` under key `vanta.zk.phase1.live-shield-records.v1`.
5. **The Noir circuit is not executed.** `zk/noir/vanta_private_pool_v2_shield_entry/src/main.nr` exists and has fixtures, but no runtime path turns a live SPL deposit into a Noir-witnessed proof. The `src/privacy/privatePoolV2LocalProver.ts` is wired into protocol-shaped paths, but it returns a SHA-256 of the request bytes — not a real proof.
6. **The Solana program is not invoked.** `programs/vanta_private_pool_v2_spend` only exposes `TAG_INIT` and `TAG_SPEND`. **There is no shield instruction.** Even if there were, see items 1 and 2 in the main audit — the program performs no proof verification and has no signer gate.

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

Today this is computed via SHA-256 in `canonicalNote.ts` (good for browser display, useless to the circuit). Put a Poseidon variant alongside the SHA-256 one and wire it through. Keep the SHA-256 hash for diagnostic display only — never confuse it with the on-chain commitment.

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
- Gate every flow that consumes `proofSystem === "mock"` so it cannot reach a path that would call a production wallet for signature.
- Fail-closed any "anonymity-set readiness" surface until W3+W4+W6 are done.
- Add a CI check that the on-chain spend instruction requires a signer match against a configured operator authority (audit item 2). Even if the long-term answer is "anyone can spend with a valid proof", the short-term fix prevents the DoS.
- Strip `VITE_VANTA_MAINNET_VAULT_OWNER` from production deploys until W4 is shipped — the current configured-fallback (`7yUfwUmZMYLg95xJGR762z4WpqfR6hBRqt9mcgNArtdi`) is a regular wallet whose private-key holder controls all deposited funds. If the live site has any TVL against this address, rotating to a program-owned PDA is a custody-risk reduction that should not wait for the rest of W4.

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
3. **Memo construction.** `src/solana/vantaShieldState.ts:createPreparedSendMemo` builds a Solana **Memo program** instruction with prefix `"vanta:send-note:v1:"` followed by `JSON.stringify(payload)`. The payload contains: `kind: "send"`, `amount`, `changeAmount`, `asset: "USDC"`, `mintAddress`, `owner`, `recipient`, `vaultOwner`, `consumedNoteId`, `createdAt`, `noteId`, `changeNoteId`. Look at `src/solana/vantaShieldState.ts:388-396`:
   ```ts
   function createMemoInstruction(prefix, payload) {
     const memoPayload = `${prefix}${JSON.stringify(payload)}`;
     return { accounts: [], data: new TextEncoder().encode(memoPayload), programAddress: VANTA_SHIELD_MEMO_PROGRAM };
   }
   ```
   **This is plaintext JSON to the SPL Memo program.** No encryption, no AEAD, no viewing-key. Anyone scanning the chain reads the full send.
4. **Transaction signing.** The browser asks the user's wallet to sign a transaction whose only meaningful instruction is that memo, plus Helius priority-fee instructions. **No SPL transfer is included.** The vault's USDC ATA is unchanged.
5. **A second transaction — the "spent marker."** `src/solana/vantaShieldState.ts:createSpentMarkerInstruction` writes another plaintext memo with prefix `"vanta:spent-marker:..."` claiming `consumedNoteId` is now spent. This too is signed by the user, also has no asset transfer.
6. **Off-chain operator notification.** The browser POSTs to the operator's `/private-core/send-proof` and `/private-core/send-transition` endpoints (see `operator/unshield-server.mjs:873–1190`). The operator:
   - Calls `assertPrivateCoreWitnessMaterialPolicy(body, { lane: "send" })` (a contract check, not a proof verification).
   - Resolves a "proof receipt" via `resolvePrivateCoreSendProofReceipt`. For witness-package mode this calls the local prover; for proof-artifact mode it parses public inputs and checks them against the operator's stored root.
   - Looks up the input root in `privateCoreRootStore`. Refuses if it's not the *latest* registered root.
   - Reserves the input nullifier in an in-memory `privateCoreSendStore`.
   - Persists the proof and send records to JSON files.
7. **Local bookkeeping.** `src/zk/liveSendBridge.ts:recordCanonicalSendFromLiveSend` writes a record to `localStorage["vanta.zk.phase1.live-send-records.v1"]`. Same shape as the shield bridge's localStorage — a list of canonical notes, indexed by transition signature, redacted on persistence.
8. **Recipient discovery.** The recipient's browser, when they sign in with their wallet, scans the Solana memo program for entries whose `recipient` field matches their pubkey. Since the memo is plain JSON, this is a public scan. They then add the implied note to their own localStorage.

That's the whole flow.

## What's actually private and what isn't

Honest accounting of where information leaks:

| Property | Visible on chain? | Visible to operator? |
|---|---|---|
| Sender wallet address | Yes (transaction signer) | Yes |
| Recipient wallet address | Yes (in memo JSON) | Yes |
| Asset (USDC mint) | Yes | Yes |
| Send amount | Yes | Yes |
| Change amount | Yes | Yes |
| Predecessor note id | Yes | Yes |
| Vault owner address | Yes | Yes |
| Timing | Yes | Yes |

The information that is *not* on chain or at the operator: **none that matters.** A passive observer with no Vanta knowledge can read the memo program, decode the JSON, and reconstruct the full transaction graph. The only "privacy" that exists is that the SPL token vault's balance doesn't change, so a casual observer who only watches token flows wouldn't see the send. But anyone who indexes the memo program — which Solscan and Solana FM and Helius all do — sees everything.

In short: today's "private send" is a Solana memo with the literal phrase `"recipient":"<address>","amount":"<value>"` written to chain in cleartext. The code is more honest than the product copy here — `vantaShieldState.ts:446-458` has a `deriveShieldMemoSymmetricKey` placeholder with the comment *"replace this owner-derived placeholder with a proper ECDH(owner_viewing_key, ephemeral_pubkey) key agreement before mainnet"*. That replacement hasn't happened, and it isn't even applied to the send memo — only shield memos use the placeholder, and the send memo skips encryption entirely.

## What the operator actually does

The operator is the trust point. When a recipient eventually wants to "unshield" their balance to a real wallet, the operator must initiate an SPL transfer from the vault ATA. The operator's gating logic is:

- Track a registered "input root" (an opaque 32-byte handle, not a Merkle root the on-chain program ever sees).
- Track a list of consumed nullifiers.
- Track a list of accepted send/swap/unshield "proof receipts" from the local prover.
- On unshield, check the chain of proofs is consistent and release funds via a server-signed SPL transfer.

The proofs the operator inspects are produced by `src/privacy/privatePoolV2LocalProver.ts`, which is a **mock prover** that returns `proofSystem: "mock"` (audit item 8). The verification step is a hash comparison. So the operator's "proof checks" are deterministic agreement between two SHA-256s of the same input — that doesn't prove anything cryptographically. Anyone with operator access could mint a fresh "valid" send.

There is also a Noir circuit (`zk/noir/vanta_private_pool_v2_send_entry/src/main.nr` and `zk/noir/vanta_private_core_single_note_send/src/main.nr`) that, if executed, would constrain the transition to a real Poseidon Merkle membership + nullifier derivation. **Neither circuit is wired into the live send path.** They exist as fixtures and as targets the local prover claims to represent, but no Barretenberg WASM proof is generated, no UltraHonk verifier is invoked, no Groth16 verifying key is checked. The production code path silently treats the mock proof as if it were the Noir proof.

## Trust assumptions to be honest about

- **No proof of conservation of value.** Nothing constrains `sendAmount + changeAmount = inputNoteAmount`. A malicious sender could write a memo with `sendAmount = 1000, changeAmount = 1000` against a `predecessorNote` of value `100`, and nothing in the on-chain or operator code would notice. The operator only stores nullifier records keyed by an opaque "input commitment", not the input amount.
- **No proof of ownership.** The send memo is signed by the sender's Solana wallet. Owning that wallet is enough to *claim* you control any note attributed to it in the memo log. There is no spending-key separation; a leaked Solana wallet means leaked sends, regardless of whether the user has rotated their viewing key.
- **No proof the predecessor is unspent.** Nothing in the on-chain artifact prevents a sender from writing two sends against the same predecessor. The off-chain `privateCoreSendStore.reserveInputNullifier` is the only deduplication, and it's in-memory at the operator. If the operator restarts without the persistence file, the dedup state is gone.
- **The vault holds all the money.** Recipient receiving a send memo doesn't get USDC. They get a claim against the vault. If the vault key is lost, frozen, sanctioned, or rugged, every recipient loses everything.
- **No anonymity set.** Two senders' memos sit next to each other in the memo program, but nothing combines them into a cryptographic anonymity set. A recipient with a 100 USDC inbound and a sender with a 100 USDC outbound at the same minute are trivially linked by pattern matching.
- **The recipient's address leaks.** Even ignoring the rest, putting `recipient` in a plaintext memo means the social graph is fully visible. Anyone watching for a particular wallet can see who they're sending to and how much.

## What "send actually works" needs to mean

Same exercise as the shield section. Pick the target before building.

**Target A — Shielded transfer in a shared anonymity set.** Send transitions the predecessor note to two new notes (recipient + change) inside the on-chain Merkle tree. A Groth16 proof verifies on-chain that (1) the predecessor commitment is a member of an accepted root, (2) the nullifier is correctly derived from the predecessor commitment and the sender's spending secret, (3) the recipient + change commitments are well-formed Poseidon hashes of the new notes, (4) `sendAmount + changeAmount = predecessorAmount`. The recipient never gets a token transfer — they just learn (via encrypted memo) the new commitment they own. They unshield later. **No on-chain fields reveal sender, recipient, asset, or amounts** beyond what's already in the shield/unshield boundaries.

**Target B — Operator-mediated transfer with real off-chain ZK.** Operator sees the send (so the recipient leak isn't fixed), but conservation of value, ownership, and double-spend are enforced by real proofs that the operator verifies before honoring later unshield requests. Vault is still custodial. Strictly weaker than A, but it's at least cryptographically auditable: anyone can re-verify the proofs. To get this you need to (1) replace the mock prover with bb.js, (2) make the operator actually verify the resulting proofs, and (3) commit a public proof log so observers can detect operator misbehavior.

**Target C — What's deployed today.** Plaintext memos + custodial vault + mock proofs + operator discretion. The honest framing is "an internal ledger of who owes whom, with extra steps." This isn't private-send; it's an off-the-books accounting system.

The current code is structured as if it's heading to A (the Noir circuits and `vantaPrivateCoreSendProof.ts`'s detailed encoding scheme are A-shaped) but ships as C (memos plaintext, prover mock, no on-chain verifier). The intermediate state — pretending you have A while shipping C — is the dangerous one because it's what loud product copy is built around.

The rest of this document assumes **Target A**. It is the only one of these three that earns the word "private" in the product name.

---

## Concrete build plan for Target A

Five workstreams. Numbered in execution order. Many depend on shield-lane workstreams already laid out above; the dependencies are called out inline.

### S1. Make the send circuit prove what it claims

Replace `zk/noir/vanta_private_pool_v2_send_entry/src/main.nr` (and consolidate with `vanta_private_core_single_note_send` — having two send circuits is dead weight). Public inputs must constrain:

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
//   recipient_memo_ciphertext_hash
//   change_memo_ciphertext_hash
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

The pre-image of `recipient_memo_ciphertext_hash` (bound into the circuit at S1 step 11) is the entire base64url body. The on-chain program writes this body to the program's `memo_log` account, so chain observers see opaque bytes only.

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

Replace the current spend instruction (`TAG_SPEND = 1`) with this. The current one (audit item 1) verifies nothing and is callable by anyone; once `TAG_SEND` exists with real proof verification, the legacy spend tag should be removed entirely so there is no "unauthenticated append" instruction reachable on the program.

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

- **Stop emitting plaintext send memos.** The current memo bytes are a public ledger of every send. If the live site has any traffic against this, the social graph is leaking right now. Lowest-effort interim fix: bolt `vantaShieldViewingKey.ts`-style AEAD onto the existing send memo (same code, replace `JSON.stringify` with `encryptVantaShieldMemoToViewingKey`). This still has all the trust problems above, but it stops the bleeding while the rest of the plan ships.
- Mark `liveSendBridge.ts:recordCanonicalSendFromLiveSend` and the localStorage list as user-facing diagnostics only. Don't claim the JSON list is "shielded state".
- Remove `TAG_SPEND = 1` from the on-chain program once `TAG_SEND = 3` exists; a public, unauthenticated append-only nullifier log accessible to any wallet is a denial-of-service that scales with rent (audit item 2).
- Block the SOL-send capability path with a real refusal: today it returns a soft `unsupported-private-send-asset` blocker; the user can't actually trigger it but the option appears in the asset list. Hide it until the SOL lane exists.

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

> **Stop writing send memos as plaintext JSON. Wrap the payload in `encryptVantaShieldMemoToViewingKey` (sealed to the recipient's viewing key, with a parallel sealed-to-self change memo). Keep the prefix `vanta:send-note:v2:` so old clients can still parse v1 memos for backward compat. Update the recipient discovery in `vantaShieldState.ts:1340` to attempt v2 decryption first and fall back to v1 plaintext.**

This single PR closes the largest privacy leak in the send lane today (the plaintext recipient/amount). It does not touch the proof or the trust model — those still need S1+S3+S4 — but it removes the public broadcast of every send's economics.

Pair this with marking `liveSendBridge.ts` as a "diagnostics-only" path in user-facing copy until the proof lane is real.

## Files most directly impacted

- **Circuit:** `zk/noir/vanta_private_pool_v2_send_entry/src/main.nr` (rewrite), `zk/noir/vanta_private_core_single_note_send/src/main.nr` (delete; consolidate into the v2 circuit).
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
2. **Memo construction.** `src/solana/vantaShieldState.ts:createPreparedSwapMemo` builds a Solana **Memo program** instruction with prefix `vanta:swap-note:v1:` followed by JSON. Same shape as send — plaintext JSON with `inputAmount`, `outputAmount`, `inputAsset`, `outputAsset`, `mintAddress`, `owner`, `vaultOwner`, `consumedNoteId`, `quoteId`, `venueName`, `venuePoolAddress`. **All economic terms in cleartext on chain.**
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
| Input asset | Yes | Yes | Yes |
| Input amount | Yes | Yes | Yes |
| Output asset | Yes | Yes | Yes |
| Output amount | Yes | Yes | Yes |
| Slippage | Yes (memo) | Yes | Yes |
| Quote ID + timestamp | Yes | Yes | Yes |
| Linkability (user → venue swap) | Yes (memo plaintext + identical timestamps + matching amounts) | Yes | Trivial via timing+amount |

The single privacy gain over a fully public swap: **the venue (Jupiter/Meteora) sees the operator's `liquidityKeypair` as the swapper, not the user's wallet.** That is real but limited. Anyone correlating the public memo's `inputAmount, outputAmount, quoteId, quoteTimestamp` with the public Jupiter swap from the operator's wallet within the quote TTL window can re-link the user to the venue swap deterministically. Quote TTL is 30s by default (`VANTA_SOL_TO_SHIELDED_QUOTE_TTL_MS`); during that 30-second window the operator processes one swap intent at a time, so the matching is one-to-one.

In short: today's "private swap" buys you about 30 seconds of weak unlinkability against the venue at the cost of full custody by the operator's liquidity wallet, and reveals everything to a chain observer.

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

Replace both `vanta_private_pool_v2_swap_to_shielded_entry` and `vanta_private_core_single_note_swap` with a single `vanta_private_pool_v2_swap_entry` circuit that proves an asset transition inside the pool. Public inputs:

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

### X2. Replace the plaintext swap memo

Same fix as send (S2 above). `createPreparedSwapMemo` currently writes plain JSON via `createMemoInstruction`. Replace with `encryptVantaShieldMemoToViewingKey` sealed to the user's own viewing key. The output note is owned by the same user, so there's only one memo per swap (no recipient).

Memo plaintext: `{ output_asset, output_amount, output_blinding, leaf_index, swap_oracle_slot, free_form }`. Memo prefix: `vanta:swap-note:v2:`. Keep parsing of v1 memos for backward compat for one release, then drop.

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

- **Stop emitting plaintext swap memos.** Same as send — wrap in AEAD as an interim fix while X1–X3 ship.
- **Disable the `operator-usdc-sol` and `operator-sol-to-shielded` execution modes** in `shieldedSwapCapability.ts` until X4 (the rebalance contract) is real, OR explicitly down-rank the product to Target C and remove the "private swap" framing from user-facing copy. Today the page says "swap" and the user can't tell whether their trade is operator-custodial or programmatic.
- Remove the dead `sender_secret_stub` line from `vanta_private_core_single_note_swap/src/main.nr` — it gives a false impression of an ownership constraint.
- Replace the `assert(input_asset_id_hi + input_asset_id_lo != output_asset_id_hi + output_asset_id_lo)` check with a real "fields differ" constraint (`(a - b) * inv == 1`), or delete the circuit entirely until it's rewritten. The current check passes for any two distinct (hi, lo) splits that sum to the same value.
- Lock down the `liquidityKeypair` env loading to refuse to start unless the keypair is wrapped (e.g., behind an HSM signer). A plain JSON keypair in env is the worst pattern for a wallet that holds liquidity for swaps.

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

> **Replace the plaintext `vanta:swap-note:v1:` memo with `vanta:swap-note:v2:` AEAD-sealed to the user's own viewing key. Plaintext fields move into the sealed body; the on-chain memo bytes become opaque to chain observers. Update `extractMemoPayload` callers in `vantaShieldState.ts:1603` to attempt v2 decryption first and fall back to v1.**

This is the same one-day fix as the send-side first PR, applied to swap. It does not address the architectural problems but immediately closes the largest privacy leak — the plaintext broadcast of every swap's input/output asset, amount, venue, and quote ID.

Pair it with two small repairs:

- Delete the no-op `sender_secret_stub` assertion from `vanta_private_core_single_note_swap/src/main.nr` so the false ownership-check signal goes away.
- Add a CI check that fails if `liquidityKeypair` env vars are present in any production deployment manifest under `operator/render-*` until X3+X4 ship.

## Files most directly impacted

- **Circuit:** `zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr` (rewrite into `vanta_private_pool_v2_swap_entry`), `zk/noir/vanta_private_core_single_note_swap/src/main.nr` (delete; consolidated).
- **Memo:** `src/solana/vantaShieldState.ts:createPreparedSwapMemo` and `extractMemoPayload`-with-`VANTA_SWAP_MEMO_PREFIX`.
- **Live bridge:** `src/zk/liveSwapBridge.ts` — diagnostics-only, no security role.
- **Proof boundary:** `src/zk/vantaPrivateCoreSwapProof.ts` (already shaped right; flip `proofSystem` once X5 lands).
- **Operator:** `operator/unshield-server.mjs` swap endpoints (real Groth16 verify), `operator/swap-auth.mjs` (downgrade to authn-only), `operator/jupiter-sol-to-shielded-route-adapter.mjs` (re-cast as operator-internal rebalance worker).
- **On-chain:** `programs/vanta_private_pool_v2_spend/src/lib.rs` — add `TAG_SWAP = 4` and `TAG_REBALANCE = 5`, share the verifier with shield/send.
- **New:** `programs/.../oracle_view.rs` — Pyth/Switchboard CPI helper.

## Cross-lane summary

After all three deep dives, the unifying observation is that **none of the three lanes today produce or verify a real ZK proof on chain**, and **all three lanes leak full economic terms in plaintext via Solana memos.** The crypto, the circuits, and the on-chain program all exist, but they exist in parallel — never wired together as a single end-to-end pipeline.

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
2. **Optional spent-marker memo.** For some flow shapes, the browser writes a Memo program instruction with prefix `vanta:unshield-note:v1:` (and a `spent-marker` for the predecessor) — same plaintext-JSON design as send and swap. Anyone scanning the chain reads `amount`, `destinationOwner`, `consumedNoteId`, `vaultOwner`, etc., in cleartext.
3. **Intent construction.** `src/solana/unshieldAuth.ts:createUnshieldIntentPayload` builds an `UnshieldIntentPayload` containing `amount, destinationOwner, mintAddress, owner, requester, vaultOwner, noteId, transitionNoteId, requestId, issuedAt`.
4. **Signing.** The intent is signed in one of two modes:
   - `signUnshieldIntent` — real Ed25519 signature from the user's wallet over the human-readable `formatUnshieldIntentMessage` text.
   - `createTransitionAuthorizedUnshieldIntent` — returns `signature: "transition-authorized"` literally, with no cryptographic signature. Authorized solely by the existence of a prior transition Solana signature.
5. **Operator submission.** Browser POSTs the signed intent to `/unshield` (or `/unshield/sol`). The handler in `operator/unshield-server.mjs:1738` runs through:
   - `parseSignedUnshieldIntent` validates the shape and version.
   - Asserts `intent.owner === intent.requester === intent.destinationOwner`. **The user can only unshield to themselves.** No "unshield to a different wallet" capability exists in this code path.
   - Asserts `intent.vaultOwner === vaultOwner` (the operator's configured single vault).
   - `assertFreshUnshieldIntent(intent)` — checks `issuedAt` is within `VANTA_UNSHIELD_INTENT_TTL_MS` (5 minutes).
   - `verifySignedUnshieldIntent(intent)` — Ed25519 verify against `intent.requester`, OR accepts the `"transition-authorized"` literal if the path is wallet-direct.
   - Replay checks against in-memory sets and a JSON-backed `releaseRecords` store keyed by `requestId`, `noteId`, `transitionNoteId`.
6. **On-chain context check.** For the wallet-direct path, `fetchConstrainedOnchainUnshieldContext` reads the user's shield notes from chain memos (`VANTA_SHIELD_MEMO_PREFIX_V2`) and verifies the requested amount is consistent with what the user has shielded minus what they've already unshielded. For the transition-authorized path, `waitForEligibleUnshieldTransition` polls the chain for the transition memo to settle.
7. **Vault keypair load.** `loadKeypairFromEnv(vaultSignerSecretKeyEnvName)` loads the **operator's vault keypair from environment variable**. The operator asserts `keypair.signer.address === vaultOwner` — confirming that the operator IS the vault custodian.
8. **Release transfer.** The operator builds and signs an SPL transfer from `vaultOwner` to `destinationOwner` for `intent.amount`, signed by the vault keypair. For SOL: `SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: new PublicKey(intent.destinationOwner), lamports })` followed by `sendAndConfirmTransaction`. For SPL: `client.helpers.splToken(...).sendTransfer({...})`.
9. **Release receipt.** Operator returns a typed receipt:
   ```ts
   {
     kind: "vanta-unshield-operator-release-receipt-v1",
     proofStatus: "not-provided-wallet-authorized-public-exit"
                | "not-provided-transition-authorized-public-exit",
     replayStatus: "accepted-first-use",
     spendabilityBasis: "canonical-spendable-note-ledger",
     ...
   }
   ```
   The receipt openly declares **`proofStatus: "not-provided"`**. The operator is honest in code that no proof is verified for this release — the only check is the user's wallet signature on the intent text.
10. **Local bookkeeping.** `src/zk/liveUnshieldBridge.ts:recordCanonicalUnshieldFromLiveUnshield` writes the unshield to localStorage, same redaction-on-persistence pattern as the send/swap bridges.

## What's actually private and what isn't

| Property | Visible on chain? | Visible to operator? |
|---|---|---|
| Sender's wallet | Yes (intent signer + memo signer + destination) | Yes |
| Destination wallet | Yes (always equal to sender) | Yes |
| Asset (USDC mint or SOL) | Yes | Yes |
| Amount | Yes | Yes |
| Linkage to original shield | Yes (via memo plaintext + amount + timing) | Yes |
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
- **Real nullifier derivation.** `nullifier = poseidon(note_secret, note_nonce, state_root, leaf)`. Good.
- **Leaf-index consistency check.** `compute_leaf_index(direction_bits) == leaf_index` — also good.
- **Bound consume-context tag and economics hash** in the public inputs.

But it inherits the recurring problems and adds one of its own:

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

   So the circuit takes `owner_secret_key_hi/lo` as a witness, **does nothing with it**, and explicitly defers ownership authorization to the operator's wallet-signature check. As a result: **the circuit does not prove note ownership.** A prover who has sniffed someone else's note material (e.g., from chain memos) can construct a perfectly valid unshield proof for that note. Note ownership is enforced exclusively by `intent.requester == intent.owner` plus the Ed25519 signature in the intent — both off-chain, both at the operator's discretion.

The circuit is also not wired into the live unshield path. The release-receipt's `proofStatus: "not-provided-..."` makes that explicit. Even though the circuit exists and produces fixtures, the operator's `/unshield` endpoint never calls a Noir verifier or a Groth16 verifier. The Noir code is decoration.

## The "transition-authorized" path

This deserves special attention because it's an alternate authorization mode that bypasses Ed25519 signatures entirely.

`createTransitionAuthorizedUnshieldIntent` constructs an intent with `signature: "transition-authorized"` — the literal string, not a signature. The intent is accepted by the operator if it has a `transitionStateSignature` referencing a prior on-chain transition (a send memo, swap memo, or similar) where the user's wallet was the signer.

The reasoning behind this mode appears to be: if you've already chained your notes through a series of operator-acknowledged transitions, your final unshield doesn't need a fresh wallet signature — your historical transitions stand in for it. From a UX standpoint that avoids one wallet popup. From a security standpoint it widens the trust boundary: the operator is now trusting that any prior transition record bound to the same wallet justifies the release, and that nothing in the operator's records has drifted between transitions.

`assertEligibleDirectUnshieldRelease` (wallet-direct mode) has a different shape than `waitForEligibleUnshieldTransition` (transition mode), and the two paths take different release decisions. A subtle bug in either eligibility check is a withdrawal-authorization bug. **Two ways to authorize the same release is two attack surfaces.**

## Trust assumptions to be honest about

In addition to the trust assumptions inherited from shield (vault is custodial), send (memos plaintext, no proofs), and swap (operator is liquidity provider):

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
- **Delete the `owner_auth_placeholder` line.** Replace it with constraint #6 above. This is the single most important change in this circuit — it converts ownership from "operator trusts the wallet signature" to "the proof demonstrates knowledge of the spending secret that defines this note."
- **Full-note exit only.** A note must be unshielded in full. Partial exits route through the send circuit first to split into (exit-portion, change-portion), then unshield the exit-portion. This mirrors UTXO design and keeps the unshield circuit minimal.
- **Bind `exit_destination` into public inputs.** The destination is part of the proof statement so it can't be swapped after the fact by anyone (operator, MEV bot, indexer). The on-chain program will read the destination from instruction data and check the proof's public-input hash includes it.

Effort: 1 week. The work is mostly back-porting the correct Merkle pattern from the actual_private_spend circuit, adding constraint #6, and updating the fixture.

### U2. On-chain unshield instruction

Adds `TAG_UNSHIELD = 6` to the program. Account list:

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

### U3. Replace the plaintext unshield memo

Same fix as send-S2 and swap-X2. The current `vanta:unshield-note:v1:` memo writes plaintext JSON via the same `createMemoInstruction` helper. Replace with `encryptVantaShieldMemoToViewingKey` sealed to the user's own viewing key (the user is exiting to themselves, so there's no recipient to seal to externally — the memo just records "this nullifier corresponds to this exit" for the user's own future reference).

In Target A, the memo is optional — the on-chain `UnshieldEvent` is enough for the indexer to track activity. But the memo is still useful because the viewing-key-encrypted body lets the user reconstruct their own exit history from chain alone. Just stop writing it in cleartext.

Effort: 1–2 days.

### U4. Delete the "transition-authorized" path

In Target A this entire authorization mode goes away. Note ownership is proven cryptographically (constraint #6 in U1), so there's no need for a "you signed an earlier transition" alternate-auth path. The operator's `/unshield` endpoint becomes a thin relayer service, not an authorization service.

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

- `src/zk/vantaPrivateCoreUnshieldProof.ts` — extensive field encoding, identical pattern to the send proof. The encoding is fine; what's missing is a real prover and verifier. Survives U1 with minor edits.
- `vanta_private_core_single_note_unshield/src/main.nr` — about 80% of the circuit is correct. Delete the dead `owner_auth_placeholder` line, add ownership constraint #6, fix Merkle depth and node hash, and you're done.
- `operator/release-record-store.mjs` — stays useful as an audit/metrics log, just stops being a security boundary.
- The `proofStatus: "not-provided"` field in the release receipt — KEEP this. After Target A, set it to `groth16-bn254-verified-onchain` or similar; clients can refuse anything other than the verified value. The fact that the field exists with self-disclaiming defaults is actually good practice that should survive.

## What to delete or quarantine

- **Stop emitting plaintext unshield memos.** Same as send and swap — wrap in AEAD.
- **Stop the transition-authorized path now, regardless of Target A timing.** Two ways to authorize the same release is one too many; remove the bypass mode and require a real Ed25519 signature on every unshield request. This is a one-day fix that eliminates a class of authentication-confusion bugs while you build the real proof path.
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

> **(a) AEAD-wrap the unshield memo using `encryptVantaShieldMemoToViewingKey` (same change pattern as send and swap), and (b) remove `createTransitionAuthorizedUnshieldIntent` plus the `"transition-authorized"` literal-signature acceptance branch in `operator/unshield-server.mjs`. Every unshield request now requires a real Ed25519 signature.**

(a) closes the plaintext leak; (b) eliminates the alternate-authorization attack surface. Neither touches the proof path or the custody model — those need U1 + U2 + U5. But these two together remove the easiest exploits that a non-cryptographic attacker could go after today.

Pair this with adding a CI assertion that fails the build if `vaultSignerSecretKeyEnvName` appears anywhere in `operator/render-*` deploy manifests after the U2 milestone — same pattern as the swap-side `liquidityKeypair` lockdown.

## Files most directly impacted

- **Circuit:** `zk/noir/vanta_private_core_single_note_unshield/src/main.nr` (rewrite at depth 20; add ownership constraint).
- **Memo:** `src/solana/vantaShieldState.ts:createPreparedUnshieldMemo` and `createPreparedSolUnshieldMemo` (replace JSON with AEAD), plus the matching `extractMemoPayload` callers at `vantaShieldState.ts:1488` and `:1543`.
- **Auth:** `src/solana/unshieldAuth.ts` (delete `createTransitionAuthorizedUnshieldIntent` and the version of the message format that references `transitionStateSignature`); `src/solana/solUnshieldAuth.ts` likewise.
- **Live bridge:** `src/zk/liveUnshieldBridge.ts` — diagnostics-only.
- **Proof boundary:** `src/zk/vantaPrivateCoreUnshieldProof.ts` (already shaped right; flip `proofSystem` once a real prover lands).
- **Operator:** `operator/unshield-server.mjs` (delete vault-keypair signing path; replace with Solana relayer that submits user-signed transactions; keep audit log only); `operator/sol-unshield-auth.mjs` (delete transition-auth path).
- **On-chain:** `programs/vanta_private_pool_v2_spend/src/lib.rs` — add `TAG_UNSHIELD = 6` with PDA-signed CPI to SPL Token / system program.

---

# Putting it all together

After all four lane deep dives, the consolidated priority list:

1. **Stop emitting plaintext memos** across all four lanes (shield, send, swap, unshield). One AEAD function, one prefix bump per lane. ~1 week of work; closes the largest privacy leak in the deployed app today.
2. **Remove the transition-authorized unshield bypass** and the `vault keypair in env` security model expectation. Move toward a PDA-owned vault and program-enforced release. This is the highest-leverage custody fix.
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

If send leaks plaintext memos with `amount, recipient, asset` (it does today), then every Stealth DCA child order leaks the same information N times. If swap requires a custodial liquidity wallet (it does today), then every Strategy child swap goes through that same wallet. If unshield reveals the destination on chain and forces destination-equals-owner (it does today), then "settle to public destination" forces the entire strategy's output to land in the original initiator's wallet, in plaintext, defeating the strategy-level privacy framing entirely.

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
- **The slice and timing policy strings that aren't implemented.** Either implement them (Y4) or remove them from the UI. Today they're typeable but inert.
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

Pair this with deleting the inert slice/timing policy options from the StrategyPage form so the UI doesn't offer choices that don't do anything.

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

1. **Stop emitting plaintext memos** across shield, send, swap, unshield — wrap everything in the AEAD pattern that already works in `vantaShieldViewingKey.ts`. Closes the largest privacy leak in the deployed app.
2. **Lift the strategy-lane trust-contract pattern into the other four lanes** — make UI copy derive from explicit `claimControls` objects so the product never claims more than the code can support.
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

The actual customer-side payment flow — if it exists — must live somewhere outside `vantaPayRuntime.ts` and `operator/pay-server.mjs`. It would have to be: (a) a separate "checkout app" that asks the customer to sign an SPL transfer to a vault address with a memo containing the session ID, then (b) something polling the chain to detect that transfer and call `POST /v1/checkout/sessions/{id}/complete` on the merchant's behalf. There are hints of this in `splShieldTransfer.ts` and the various memo prefixes, but nothing in the Pay code itself wires customer wallet → checkout completion. The current `complete` endpoint is open-input — anyone with the session ID and merchant credentials can declare a session complete.

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

- **The operator runs the entire merchant lifecycle.** Merchant signups, API key issuance (via Bearer tokens — see `requireAuth` in pay-server.mjs), checkout session creation, completion, refunds, withdrawals — all server-side, all gated by Bearer tokens. There's no merchant on-chain identity, no merchant signing of session-completion or refund decisions. The operator IS the merchant from a key-management standpoint.
- **The operator decides when a checkout is "complete."** The endpoint `POST /v1/checkout/sessions/{id}/complete` accepts a request and trusts whoever calls it. There's no on-chain proof binding the completion to a customer SPL transfer. If the operator's API key leaks, anyone can mark any session complete.
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
  operatorSeesRawSettlementTerms: false,
  rawEconomicTermsInLiveCheckoutSettlement: false,
  rawEconomicTermsInLiveWithdrawalSettlement: false,
  ...
}
```

These are runtime values that gate behavior. **They claim properties the code below them does not yet enforce.** Specifically: `operatorSeesRawSettlementTerms: false` is asserted, but the in-memory `Map` storing the checkout session has the raw `amount, currency, customerEmail, lineItems` fields fully visible to the operator that runs the server. The "operator-doesn't-see-raw-terms" claim only applies to the *settlement-adapter handoff* (where commitments replace amounts), not to the merchant-API surface (where everything is in plaintext).

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

- **The `complete` endpoint as currently shaped** (`POST /v1/checkout/sessions/{id}/complete` accepting a Bearer-authed call from the merchant) needs to be locked down so it can only be called by the operator's chain-event subscriber after a `CheckoutPaidEvent`. Today it's reachable from any caller with the merchant's API token; an attacker with the merchant's API key can mark sessions complete without any actual customer payment.
- **The local mock prover path** in `settleCheckoutSession` and `settleWithdrawal`. Replace with calls into the real prover/verifier from shield-W7. Until that lands, the trust-contract claim `operatorSeesRawSettlementTerms: false` is contradicted by the in-memory checkout-session state.
- **Refund endpoint as journal-only.** Either implement on-chain refunds (P4) or label refunds as "credit memos" rather than "refunds" until they actually return funds.
- **The "fully_private_pay_claim: false" flag** should be wired to gate user-facing copy. Today it's a returned value with no consumer; some component of the merchant UI should read it and refuse to render "private payments" framing while it's `false`.
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

> **(a) Lock the `POST /v1/checkout/sessions/{id}/complete` endpoint so it only accepts requests from the operator's internal chain-event subscriber, not from arbitrary callers with the merchant's Bearer token. Add a service-account separator: `VANTA_PAY_INTERNAL_SETTLEMENT_TOKEN` is required in addition to (or instead of) the merchant Bearer token for the `/complete` route. (b) Wire the `claimControls.fully_private_pay_claim` flag from `vantaPayReceiptPrivacyContract.ts` into the `/app/pay` and `/docs/pay` UI surfaces so any "privately" / "private payments" copy is hidden while the flag is `false`.**

(a) closes the trivial "merchant API key compromise = mark sessions paid arbitrarily" hole. (b) makes the deployed copy match the code's actual claims — the same pattern as the strategy-lane first commit, applied to Pay. Neither change touches the cryptographic primitives or the on-chain program; both can ship today.

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

The four economic lanes (shield, send, swap, unshield) are positioned as private but ship as custodial-with-extra-steps. Their cryptographic primitives exist but are not connected to one another. The strategy lane is positioned as a preview, ships as a preview, and is the closest to honest in the codebase. The pay lane is positioned as a payment processor, ships as a Stripe-shaped API with no actual customer payment flow visible in the code reviewed, and contradicts its own privacy claims through plaintext checkout-session storage at the operator.

The single most leveraged sequence of fixes, updated:

1. **Stop emitting plaintext memos** across shield, send, swap, unshield — wrap everything in the AEAD pattern that already works in `vantaShieldViewingKey.ts`.
2. **Lift the strategy-lane and pay-lane trust-contract pattern into the other four lanes** — make UI copy derive from explicit `claimControls` objects so the product never claims more than the code can support. **Wire those claim-controls into UI gating, not just static returns.**
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

- Added an operator-authority gate to `programs/vanta_private_pool_v2_spend`. Init stores the authority, spend requires the same read-only signer, and the pool state layout is now 88 bytes.
- Updated local transaction builder, printer, relayer submission checks, operator packet surfaces, service manifests, secret references, and production-review evidence to require `VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY`.
- Marked existing reviewed mainnet spend-program/account evidence as pre-authority-gate and therefore blocked/incompatible until redeploy/reinitialization.
- Updated the Crucible dry-run harness to include authority state and unsigned/wrong-authority spend attempts.
- Replaced the owner-recovery payload encryption construction with X25519 + HKDF-SHA256 + XChaCha20-Poly1305 and added `npm run zk:owner-recovery-payload-crypto-check`.

Verification passed locally: `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, `cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`, Solana SBF build for the spend program, `npm run private-pool-v2:crucible-check`, `npm run private-pool-v2:verify`, `npm run zk:owner-recovery-payload-crypto-check`, `npm run build`, `npm run private-core:check`, and `git diff --check`.

Still open from this review: real on-chain proof verification, real Private Pool v2 entry-circuit membership/append constraints, `canonical_note_membership` hash replacement, non-linear nullifier storage, and the plaintext memo/privacy architecture work.

### Second local ZK pass - 2026-05-09

- Repaired `zk/noir/canonical_note_membership` by switching it to the repo-standard `noir-lang/poseidon` dependency, replacing additive note hashing with `bn254::hash_10`, replacing additive Merkle root math with Poseidon leaf/node hashing, constraining direction bits, and binding direction bits to the declared leaf index.
- Added `npm run zk:canonical-note-membership-check` with valid and invalid fixtures for bad commitment, bad root, bad direction bit, and bad leaf index.
- Back-ported consume-membership constraints into `vanta_private_pool_v2_send_entry`, `claim_entry`, and `swap_to_shielded_entry`. Each now checks a fixed-depth Merkle path for the input commitment and rejects forged input roots.
- Replaced `shield_entry`'s fake append transition with a path-based empty-leaf-to-output-leaf transition. It now rejects the prior `poseidon3(previous_root, output_commitment, leaf_index)` forged append fixture.
- Strengthened `private-pool-v2:contract-check` markers so these membership/append guards stay visible in the contract surface.

Red-first failures observed locally: `zk:canonical-note-membership-check` failed on the old placeholder circuit, `private-pool-v2:send-circuit-check` / `claim-circuit-check` / `swap-to-shielded-circuit-check` failed because forged input roots unexpectedly solved, and `private-pool-v2:shield-circuit-check` failed because the fake append transition unexpectedly solved.

Verification passed locally: `npm run zk:canonical-note-membership-check`, `npm run private-pool-v2:shield-circuit-check`, `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:claim-circuit-check`, `npm run private-pool-v2:swap-to-shielded-circuit-check`, their matching prove commands, `npm run private-pool-v2:public-input-hash-alignment-check`, `npm run private-core:check`, full `npm run private-pool-v2:verify`, and `git diff --check`.

Still open after this second pass: output append-path semantics for send/swap successors remain fake append hashes, all affected lanes are still depth 3 except the canonical membership target, real on-chain proof verification is not wired, nullifier storage is still linear/fixed-capacity, and plaintext memo/privacy architecture work remains.

### Third local ZK pass - 2026-05-09

- Standardized Private Pool v2 Merkle node hashing across `shield_entry`, `send_entry`, `claim_entry`, `swap_to_shielded_entry`, and `actual_private_spend_entry` by removing the direction bit from the parent hash.
- Updated the matching TypeScript fixtures to compute tree parents with `poseidon2([left, right])`, using direction bits only to order `(current, sibling)` and to bind the declared leaf index.
- Added `npm run zk:merkle-node-hash-contract-check`, a source-level guard that fails if the covered circuits reintroduce `hash_merkle_node(left, right, is_current_right)` / `hash_3([left, right, is_current_right])` or if the matching fixtures reintroduce direction-bit `poseidon3` parent hashing.

Red-first failure observed locally: `npm run zk:merkle-node-hash-contract-check` failed against the old Private Pool v2 direction-bit node helper before the circuit/fixture updates.

Verification passed locally: `npm run zk:merkle-node-hash-contract-check`, `npm run private-pool-v2:actual-private-spend-circuit-check`, `npm run private-pool-v2:send-circuit-check`, `npm run private-pool-v2:claim-circuit-check`, `npm run private-pool-v2:shield-circuit-check`, `npm run private-pool-v2:swap-to-shielded-circuit-check`, `npm run private-pool-v2:public-input-hash-alignment-check`, full `npm run private-pool-v2:verify`, `npm run zk:canonical-note-membership-check`, `npm run private-core:check`, and `git diff --check`.

Still open after this third pass: the Private Core single-note send/swap/unshield circuits still carry the older hi/lo and direction-bit-oriented Merkle surfaces; output append-path semantics for send/swap successors still need real successor append proofs; most active lanes remain depth 3; on-chain proof verification is still not wired; nullifier storage remains fixed/linear; and plaintext memo/privacy architecture work remains.

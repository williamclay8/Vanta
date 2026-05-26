# PPA-PQC-001 - Hybrid X25519 + ML-KEM-768 viewing-key memo plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT_DELTA.md`
- Cycle: 2026-05-25 post-merge follow-up (Origin Pilot OS analysis surfaced PQC as a long-horizon residual)
- Band: cross-cutting cryptographic hardening (not in Band 1-8; tracked separately as long-horizon residual)
- Item: hybrid PQC wrapper for `src/solana/vantaShieldViewingKey.ts` AEAD construction
- Threat model section: "Post-Quantum Cryptographic Exposure" in `docs/threat-model.md`

## Status

`design-contract-only-refs-only-no-implementation-yet`

This tracker is **refs-only**. The actual hybrid construction is not implemented in this cycle. What this cycle ships:

- A design-contract module (`src/privacy/vantaShieldViewingKeyPqcHybridContract.mjs`) enumerating the required hybrid KEM contract surface, forbidden persistence fields, and the explicit boundary claim that the path is not live, not audited, not anonymity-set evidence, and not a production-private signal.
- A fail-closed CI guard (`npm run pqc:hybrid-viewing-key-contract-check`) that asserts the contract surface stays present and prevents the path from being silently promoted to "wired" without an explicit setter diff that updates this guard.
- A threat-model entry that documents the HNDL exposure on the current X25519-only path and pins the migration order.
- This tracker note.

The contract module is **not wired into the live `vantaShieldViewingKey.ts` path**. Live Send / Swap / Unshield discovery memos continue to use the existing X25519 + AEAD construction. Promoting to "implementation" requires the deliverables below.

## Why this matters

X25519-only viewing-key encryption is HNDL-vulnerable: any adversary who records today's recipient-discovery ciphertexts can decrypt them when a cryptographically relevant quantum computer (CRQC) exists. NIST and major standards bodies place CRQC arrival in a 10-20 year horizon, but the exposure accumulates from the day the first encrypted memo is written.

This is the single most exposed PQC surface in Vanta today because:

- the ciphertext is intentionally persisted (operator indexer snapshot, future view-tag pull endpoint, on-chain SOL memo in some shield variants); and
- the recipient's classical X25519 key is long-lived; and
- there is no built-in forward-secrecy ratchet at the memo layer that would limit the blast radius of a future key compromise.

Groth16 and Ed25519 exposure are explicitly excluded from this tracker — those are Solana-platform-wide concerns that don't move forward with a Vanta-only diff. Lattice-based SNARK migration is tracked separately under `PPA-PQC-002`.

## Planned construction (when implementation is approved)

The construction matches the Signal PQXDH / Apple iMessage PQ3 / Cloudflare TLS-PQ hybrid pattern:

1. Recipient publishes two long-term public keys:
   - `viewing_key_x25519_pub` (existing surface)
   - `viewing_key_mlkem768_pub` (new — ML-KEM-768 / FIPS 203 Kyber-768 KEM encapsulation key)
2. Sender, on creating a discovery memo:
   - generates an ephemeral X25519 keypair, computes the X25519 shared secret `ss_classical = x25519(eph_priv, viewing_key_x25519_pub)`;
   - encapsulates an ML-KEM-768 shared secret `ss_pq = ML-KEM-768.Encaps(viewing_key_mlkem768_pub)`, producing `(ct_pq, ss_pq)`;
   - combines `seed = HKDF-SHA256(salt = "vanta.viewing-key.hybrid.v1", ikm = ss_classical || ss_pq, info = recipient_view_tag_prefix || ephemeral_x25519_pub || ct_pq)`;
   - derives `aead_key = HKDF-Expand(seed, label = "aead-key", L = 32)` and `view_tag = HKDF-Expand(seed, label = "view-tag", L = view-tag-byte-length)`.
3. AEAD seal under the existing v2 envelope, but with a new `keySchemeVersion = "vanta-shield-viewing-key-hybrid-x25519-mlkem768-v1"` field.
4. On the wire / in the indexer, the memo carries `(eph_x25519_pub, ct_pq, view_tag, aead_ciphertext)`.
5. Recipient runs the mirrored decapsulation and AEAD open.

Forward-secrecy is preserved via the ephemeral X25519 (`eph_priv` is discarded by the sender immediately after sealing). The ML-KEM-768 keypair is long-lived; rotation is operator-driven and tracked through the existing viewing-key fingerprint binding.

## Planned files

- `src/privacy/vantaShieldViewingKeyPqcHybridContract.mjs` — design-contract module (this cycle, refs-only).
- `src/solana/vantaShieldViewingKey.ts` — extended `v3` AEAD envelope adding `keySchemeVersion` and the `eph_x25519_pub` + `ct_pq` ciphertext header (future implementation cycle).
- `src/solana/vantaShieldViewingKeyMlKem.ts` — new wrapper around the chosen ML-KEM-768 implementation. Library selection candidates: `@aws-crypto/post-quantum-mlkem`, `@noble/post-quantum`, `liboqs-node`, or a vendored Rust→WASM build of `pqclean`. Library selection is itself a sub-task and must produce a reviewer-acceptance evidence packet before vendoring.
- `src/privateVault/privateVaultPqcHybridKeyMaterial.ts` — Argon2id-encrypted storage of the recipient's long-term ML-KEM-768 private key, with a v2/v3 readback migration mirroring the existing PBKDF2 → Argon2id pattern in `privateVaultCrypto.ts`.
- `scripts/check-vanta-pqc-hybrid-viewing-key-contract.mjs` — fail-closed guard (this cycle).
- `scripts/check-vanta-pqc-hybrid-viewing-key-library-acceptance.mjs` — future cycle, fails closed until the chosen ML-KEM-768 library has a vendored audit-acceptance evidence packet under `ops/mainnet/`.
- `docs/threat-model.md` — already updated this cycle.
- `SECURITY_LIMITATIONS.md` — future cycle, references the hybrid construction once it lands.
- `package.json` — wire the new guards.

## Planned fixtures

- Contract-shape fixture: `vantaShieldViewingKeyPqcHybridContract.mjs` exports the required `KEY_SCHEME_VERSION`, `FORBIDDEN_PERSISTENCE_FIELDS` (must include `mlkem768PrivateKey`, `mlkem768Decapsulation`, `ephemeralX25519PrivateKey`, `hybridSharedSecret`, `aeadKey`, `seed`, raw KDF input), `HYBRID_BOUNDARY` (must include the strings `not-live`, `not-audited`, `harvest-now-decrypt-later-mitigation-design-contract-only`).
- No-live-wiring fixture: `vantaShieldViewingKey.ts` does not import the hybrid contract module yet, and no live encryption path references `KEY_SCHEME_VERSION` (acknowledged-design-only).
- Forbidden-field fixture: the contract module's forbidden-persistence list cannot shrink without an explicit reviewer evidence ref.
- Boundary-language fixture: contract module must keep the negative-claim language present so that grepping for `harvest-now-decrypt-later` always lands on it.

## Planned script

`npm run pqc:hybrid-viewing-key-contract-check`

Wired into `truth:privacy-claim-gate` so the contract surface can't be removed without explicit reviewer intent.

## Planned test cases

- Default state: the contract module reports `live = false`, `audited = false`, `keySchemeVersion = "vanta-shield-viewing-key-hybrid-x25519-mlkem768-v1"`, `hndlMitigation = "design-contract-only-no-implementation"`.
- Forbidden-persistence rejection: any caller that tries to serialize a record containing an ML-KEM-768 private key, decapsulation secret, ephemeral X25519 private key, or raw shared-secret is rejected by the contract's validator.
- Boundary-language preservation: the literal strings `not-live`, `not-audited`, `not-anonymity-set-evidence`, `harvest-now-decrypt-later-mitigation-design-contract-only` remain present in the module source.
- No live wiring: a grep for the contract's `KEY_SCHEME_VERSION` in `src/solana/` and `operator/` returns zero matches (the contract is design-only).
- Library acceptance gap: the `check-vanta-pqc-hybrid-viewing-key-library-acceptance.mjs` script (future) records that no ML-KEM-768 library has yet been reviewed.

## Verification (this cycle)

- `npm run pqc:hybrid-viewing-key-contract-check` → `PASS-design-contract-only`
- `npm run truth:privacy-claim-gate` → unchanged from prior state (the new guard runs but does not unlock or block anything).
- `npm run docs:source-of-truth-check` → unchanged.

## Promotion criteria (when this moves from design to implementation)

The next cycle that promotes this to implementation must:

1. Produce a reviewed library-acceptance evidence packet under `ops/mainnet/private-pool-v2-pqc-mlkem768-library-acceptance.evidence.json` recording: library name, version, SHA-256 of the vendored artifact, FIPS 203 conformance evidence, third-party audit ref (if any), and reviewer acceptance.
2. Add `vantaShieldViewingKeyMlKem.ts` with deterministic test vectors (FIPS 203 KAT vectors) under `crucible/`.
3. Add the `v3` AEAD envelope to `vantaShieldViewingKey.ts` with a backward-compatible v2 readback for legacy memos.
4. Extend `privateVaultCrypto.ts` Argon2id storage to hold the ML-KEM-768 long-term private key, with v2→v3 migration.
5. Extend `vantaShieldViewingKeyPqcHybridContract.mjs` so `live = true`, `audited = false` is reflected, and the boundary language updates accordingly.
6. Flip the guard mode from `PASS-design-contract-only` to `PASS-implementation-not-yet-audited`.
7. Audit acceptance: independent review of the hybrid construction is required before flipping to `PASS-implementation-audited`. This is in scope of the broader Band 7 audit engagement (`PPA-AUDIT-001`).

## Out of scope

- Ed25519 → ML-DSA / SLH-DSA migration for Solana signatures. That's a Solana-platform-wide migration; tracked here only for documentation completeness.
- Groth16 → lattice-SNARK migration. See `PPA-PQC-002`.
- Symmetric-primitive review for AES-GCM, Poseidon, SHA-256. Grover-safe at current key sizes.

## References

- NIST FIPS 203 (Module-Lattice-Based Key-Encapsulation Mechanism / ML-KEM, formerly Kyber)
- Signal PQXDH protocol specification, 2023
- Apple iMessage PQ3 announcement, 2024
- Cloudflare hybrid post-quantum TLS deployment, 2022-2024
- `docs/threat-model.md` "Post-Quantum Cryptographic Exposure" section
- `docs/zk/c01-production-verifier-backend-decision.md` (verifier backend choice — Groth16 over BN254, quantum-vulnerable)

# R14 Argon2id Vault KDF - 2026-05-14

Status: local implemented.

## What Changed

- `src/privateVault/privateVaultCrypto.ts` now writes new private-vault payloads with `argon2id-aes-gcm-sha256.v3`.
- New Argon2id parameters are recorded in the envelope: memory `65_536` KiB, time cost `3`, parallelism `1`, derived key bytes `32`, version `19`.
- PBKDF2 payloads remain decryptable through legacy schemes:
  - `pbkdf2-aes-gcm-sha256.v2` with `600_000` iterations.
  - `pbkdf2-aes-gcm-sha256.v1` with absent or `120_000` iterations.
- Added package alias `npm run private-vault:crypto-check` to the existing private-mode crypto contract guard.

## Boundary

This migrates new password-derived private-vault material to Argon2id while preserving read compatibility for existing PBKDF2 vault envelopes. It does not re-encrypt already-stored local vault records until the user saves or recreates a vault under the new writer.

## Verification

- Red-first: `npm run private-mode:contract-check` failed before implementation because `PRIVATE_VAULT_PAYLOAD_SCHEME_V2` / Argon2id v3 were missing.
- `npm run private-vault:crypto-check`

This is a local vault KDF hardening slice only. It is not production-private proof, not custody migration, not recipient discovery, and not deployment evidence.

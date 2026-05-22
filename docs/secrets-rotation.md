# Vanta Secrets Rotation Cadence

This document records the rotation cadence for shared credentials used by
local devnet and operator-trusted-beta paths. None of these keys are
committed to git (every entry below is in `.gitignore` via `env*.local`
patterns), but the same value across multiple developer machines means
rotation is an operational action rather than something that happens
automatically.

Track rotations in the team's secrets manager (Doppler / 1Password /
equivalent) and update the `Last rotated` column when a key is replaced.
Anything past its `Rotate every` interval should be considered overdue.

## Active Secrets

| Secret | Where it lives | Rotate every | Last rotated | Rationale |
| --- | --- | --- | --- | --- |
| Helius devnet API key | `.env.operator.local` (`api-key=...` query string), Doppler `dev` config | 90 days | 2026-04-15 | Shared across developer machines. Devnet only — no real-funds risk, but a leaked key burns Helius quota and exposes which addresses devnet test traffic queries. |
| Helius mainnet API key | Doppler `prd` config, operator service env | 60 days | 2026-04-15 | Server-side only. Never lives in a VITE_* var (would land in the public bundle). Operator service reads `SOLANA_RPC_URL` at startup. |
| VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN | Doppler `prd`, role-service env | 30 days | 2026-04-15 | Indexer Bearer token. Rotating cuts off any leaked client immediately. |
| VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN | Doppler `prd`, role-service env | 30 days | 2026-04-15 | Prover Bearer token. |
| VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN | Doppler `prd`, role-service env | 30 days | 2026-04-15 | Relayer Bearer token. |
| VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN | Doppler `prd`, role-service env | 30 days | 2026-04-15 | Verifier Bearer token (placeholder until C01 wires in). |
| Operator funding keypair (devnet) | `.env.operator.local`, local keypair files | 180 days | 2026-04-15 | Devnet only. |
| Operator funding keypair (mainnet) | Doppler `prd`, sealed in hardware-wallet flow | After every TAG_AUTHORITY_ENABLE_VERIFIER flip, or 365 days | n/a (not yet deployed) | Mainnet authority. See `docs/mainnet-deployment-runbook.md` for the rotation procedure. |
| Render service deploy hooks | Render dashboard | 180 days | 2026-04-15 | If exposed, lets an attacker trigger deploys. |
| Cloudflare API token | Cloudflare dashboard, ops macbook keychain | 90 days | 2026-04-15 | Used for DNS / cache purges; scope kept to single zone. |

## Rotation Procedure

1. **Generate the replacement** in the provider's dashboard or via CLI.
2. **Update Doppler** for every environment that uses the secret. Trigger
   a `doppler secrets download` smoke check on a local dev machine to
   confirm the new value is readable.
3. **Roll the running services.** For Render, this is a redeploy via the
   service dashboard. For local dev, ask developers to re-run their
   `npm run` scripts.
4. **Revoke the old value** in the provider's dashboard after a 24-hour
   overlap window. Do not skip the overlap — a half-rotated key locks
   out machines that haven't restarted yet.
5. **Update this file's `Last rotated` column** in the same PR that
   touches Doppler.

## What NOT to Do

- Do not commit a new secret value to git. The git-grep audit
  (`AUDIT_2026-05-19.md` H5, `AUDIT_2026-05-22_findings.md` H5 closed
  status) verified externally that no Helius URL is currently in the
  live JS bundle. Keep it that way.
- Do not put any of the above in a `VITE_*` env var. Vite inlines
  `VITE_*` values into the public JS bundle at build time, so the secret
  would be world-readable. The `.env.example` file documents this rule
  explicitly.
- Do not rotate the mainnet operator funding keypair without following
  the full procedure in `docs/mainnet-deployment-runbook.md`. The wrong
  rotation sequence locks the program out of its own custody.

## Where This Started

`AUDIT_2026-05-22_findings.md` L10 flagged that the Helius devnet key in
`.env.operator.local` is shared across machines and has no rotation
cadence documented. This file is the rotation cadence. L10 closes when
the first row of the active-secrets table is rotated and the
`Last rotated` cell here is updated.

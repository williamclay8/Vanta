# PPA-RELAYER-001 - Postgres Nullifier And Rate Limit Evidence

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 5 - relayer maturity
- Recommended remediation order: 16
- Item: Postgres-backed nullifier + rate-limit

## Status

`accepted-noop-evidence-local`

The current source already has the local/source-level Postgres nullifier replay and rate-limit controls required by this item.

## Evidence

- `operator/private-pool-v2-server.mjs` requires `VANTA_PRIVATE_POOL_V2_DATABASE_URL` in production mode before startup.
- `operator/private-pool-v2-server.mjs` uses `createPostgresRateLimiterFromDatabaseUrl` when `databaseUrl` is present and reports `postgres-durable-shared-window`.
- `operator/private-pool-v2-server.mjs` uses `createPostgresNullifierReplayStoreFromDatabaseUrl` when `databaseUrl` is present.
- `src/privacy/postgresNullifierReplayStore.mjs` uses transactional reservation, `ON CONFLICT DO NOTHING`, and unique indexes for durable nullifier and request idempotency enforcement.
- `src/ops/vantaRateLimit.mjs` exposes the Postgres-backed rate limiter and marks the in-memory fallback as not production-ready.

## Verification

- `npm run nullifier:replay-guard-check`: PASS
- `npm run ops:rate-limit-check`: PASS
- `npm run mainnet:nullifier-replay-evidence-check`: PASS
- `npm run private-pool-v2:role-storage-check`: PASS

## Truth Boundary

This accepted-noop is source/local/evidence-packet coverage only. It does not prove live production settlement, multi-replica relayer behavior, provider-side rate limiting, Tor/blinded-token protection, timing privacy, anonymity, or audit acceptance.

## Lumi

- Local: tracker-only accepted-noop evidence entry added and verified locally.
- Committed: latest branch head after this tracker-only slice; use `git log` for the exact commit.
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` after this tracker-only slice; use `git status` for sync.
- Deployed/live: not deployed/live.

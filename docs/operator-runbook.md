# Vanta Operator Runbook

This runbook describes the current local operator surfaces for Vanta Pay, Private Pool v2, and the protocol tabs. It is intentionally conservative: these commands are for verified local/operator harnesses, not production deployment.

## Readiness Truth

Current Pay and Private Pool v2 status surfaces report `productionReady: false`.

That means the local verification gates can pass while Vanta still remains below mainnet-production readiness. Do not represent these operators as audited, trustless, custody-safe, or ready for real user funds.

The top-level readiness surface is:

```bash
npm run mainnet:readiness
npm run mainnet:readiness-json
npm run mainnet:preflight
npm run mainnet:readiness-check
npm run mainnet:external-gates-check
npm run mainnet:service-contract-check
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run storage:adapter-check
npm run mainnet:abuse-observability-check
npm run ops:rate-limit-check
npm run nullifier:replay-guard-check
npm run mainnet:deployment-manifest-check
npm run wallet:signing-safety-check
npm run wallet:transaction-safety-check
npm run mainnet:secret-handling-check
npm run audit:package-check
```

This surface is intentionally conservative. It must continue to report `mainnetReady: false` and `productionReady: false` until the deployed private-settlement, durable-service, audit, key-management, wallet-safety, and legal/custody blockers are actually resolved.

## Required Local Checks

Run the relevant gate before claiming an operator surface is healthy:

```bash
npm run pay:verify
npm run private-pool-v2:verify
npm run private-core:verify
npm run mainnet:preflight
npm run mainnet:readiness-check
npm run mainnet:external-gates-check
npm run mainnet:service-contract-check
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run storage:adapter-check
npm run mainnet:abuse-observability-check
npm run ops:rate-limit-check
npm run nullifier:replay-guard-check
npm run mainnet:deployment-manifest-check
npm run wallet:signing-safety-check
npm run wallet:transaction-safety-check
npm run mainnet:secret-handling-check
npm run audit:package-check
```

The current service manifest is:

```text
ops/mainnet/private-pool-v2-services.manifest.json
```

It intentionally stores environment variable names and image placeholders only. Do not put real secrets, RPC credentials, private keys, or wallet material in the manifest.

The external mainnet gates packet is:

```text
ops/mainnet/external-gates.packet.json
```

The human handoff is:

```text
docs/mainnet-external-gates.md
```

It intentionally stores references and required evidence only. Do not paste secrets into chat, commit raw credentials, or store private keys, seed phrases, wallet keypair files, raw database URLs, raw API tokens, or raw bearer tokens in the repo.

The audit handoff document is:

```text
docs/audit-package.md
```

The production storage contract is:

```text
src/readiness/productionStorageContract.mjs
```

It requires durable database tables, unique indexes, forward-only migrations, point-in-time recovery, encrypted backups, restore drills, least-privilege users, and no secret values in manifests before any production storage claim.

The checked baseline Postgres migration is:

```text
ops/storage/postgres/001_vanta_mainnet_storage.sql
```

It defines the first forward-only schema for Pay, Private Pool v2, Strategy, and Operator state, including replay-safe nullifier uniqueness, idempotency keys, webhook delivery retry state, strategy child-order uniqueness, and operator deployment locks.

The abuse and observability contract is:

```text
src/readiness/abuseObservabilityContract.mjs
```

It requires production rate limits, structured JSON logs, privacy-preserving telemetry, no secret/private-input logging, metrics, alerts, audit events, operator alert routing, and an abuse-response runbook before any production operations claim.

Pay and Private Pool v2 also have a shared in-process rate-limit seam at:

```text
src/ops/vantaRateLimit.mjs
```

The current limiter is intentionally marked `productionReady: false`; it provides a fail-closed operator control point but must be replaced or backed by distributed production rate limiting before mainnet.

The reusable nullifier replay guard is:

```text
src/privacy/nullifierReplayGuard.mjs
```

Private Pool v2 uses it for claim preflight and accepted-claim reservation in the local operator. It is intentionally marked `productionReady: false`; before mainnet it must move behind durable production storage and the final deployed protocol enforcement layer.

For a faster focused check:

```bash
npm run pay:merchant-api-check
npm run private-pool-v2:http-smoke
npm run protocol:browser-check
```

## Private Pool v2 Operator

Start the local Private Pool v2 operator:

```bash
npm run private-pool-v2:operator
```

Important environment variables:

```bash
VANTA_PRIVATE_POOL_V2_OPERATOR_PORT=8797
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=
VANTA_PRIVATE_POOL_V2_STORE_PATH=.vanta-private-pool-v2-receipts.json
VANTA_PRIVATE_POOL_V2_DATABASE_URL=
```

Production mode guardrails:

```bash
NODE_ENV=production
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=<operator-token>
VANTA_PRIVATE_POOL_V2_STORE_PATH=<durable-store-path-if-using-json-store>
VANTA_PRIVATE_POOL_V2_DATABASE_URL=<postgres-url-if-using-managed-postgres>
```

When `NODE_ENV=production`, the operator refuses to boot without `VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN` and either `VANTA_PRIVATE_POOL_V2_STORE_PATH` or `VANTA_PRIVATE_POOL_V2_DATABASE_URL`.

For free Render staging, prefer `VANTA_PRIVATE_POOL_V2_DATABASE_URL` from a free Render Postgres database because free web services cannot attach persistent disks and lose local filesystem writes on restart/redeploy. Treat free Render Postgres as staging-only because free databases expire.

## Pay Operator

Start the local Pay merchant API operator:

```bash
npm run pay:operator
```

Important environment variables:

```bash
VANTA_PAY_OPERATOR_PORT=8798
VANTA_PAY_SECRET_KEY=sk_test_vanta
VANTA_PAY_WEBHOOK_SECRET=whsec_test_vanta
VANTA_PAY_STORE_PATH=.vanta-pay-store.json
VANTA_PAY_DATABASE_URL=
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL=http://127.0.0.1:8797
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=
```

Production mode guardrails:

```bash
NODE_ENV=production
VANTA_PAY_SECRET_KEY=<live-secret-key>
VANTA_PAY_WEBHOOK_SECRET=<live-webhook-secret>
VANTA_PAY_STORE_PATH=<durable-store-path-if-using-json-store>
VANTA_PAY_DATABASE_URL=<postgres-url-if-using-managed-postgres>
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL=<private-pool-v2-url>
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=<operator-token-if-required>
```

When `NODE_ENV=production`, Pay refuses to boot without `VANTA_PAY_SECRET_KEY`, `VANTA_PAY_WEBHOOK_SECRET`, and either `VANTA_PAY_STORE_PATH` or `VANTA_PAY_DATABASE_URL`.

For free Render staging, prefer `VANTA_PAY_DATABASE_URL` from a free Render Postgres database because free web services cannot attach persistent disks and lose local filesystem writes on restart/redeploy. Treat free Render Postgres as staging-only because free databases expire.

Production webhook delivery also requires HTTPS merchant endpoints.

## Render Staging References

Current secrets-safe staging refs:

- Pay Render service id: `srv-d7j3ggqqqhas739for80`
- Pay URL: `https://vanta-0wwi.onrender.com`
- Pay start command: `npm run pay:operator`
- Pay storage: `postgres-jsonb-snapshot-store` through `VANTA_PAY_DATABASE_URL`
- Private Pool v2 Render service id: `srv-d7j4aod7vvec73ahsqlg`
- Private Pool v2 URL: `https://vanta-staging-private-pool-v2.onrender.com`
- Private Pool v2 start command: `npm run private-pool-v2:operator`
- Private Pool v2 storage: `postgres-jsonb-snapshot-store` through `VANTA_PRIVATE_POOL_V2_DATABASE_URL`

These refs are staging evidence only. They do not clear production secret-manager, monitoring, audit, legal, custody, or mainnet-funds gates.

## Browser Client Operator Settings

For local or controlled test environments only:

```bash
VITE_VANTA_PRIVATE_POOL_V2_OPERATOR_URL=http://127.0.0.1:8797
VITE_VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=
```

Do not use browser-exposed operator tokens as production secrets.

Any `VITE_...` value is bundled into the client and must be treated as public or test-only.

## Wallet Signing Safety

Never request, store, or handle private keys, seed phrases, or keypair files.

Before any future live transaction path can request a wallet signature, it must:

- default to devnet or localnet unless mainnet is explicitly selected and approved
- simulate the transaction before signature
- show cluster, fee payer, recipient, amount, asset, estimated fees, instructions, recent blockhash, and simulation result
- require explicit human approval before signature
- block blind signing and mutation after the summary is shown
- keep live mainnet submission disabled until the mainnet readiness gate is updated truthfully

The executable transaction safety summary boundary is:

```text
src/wallet/transactionSafetySummary.mjs
```

It requires cluster, fee payer, recipient, amount, asset, estimated fees, instructions, recent blockhash, simulation result, and explicit mainnet approval before a mainnet summary can be accepted for wallet approval.

## Secret Handling

The checked secret-handling contract is:

```text
src/readiness/secretHandlingContract.mjs
```

It requires a production secret manager, least-privilege service identities, no secrets in the repo, no secrets in client bundles, names-only manifests, rotation runbooks, incident revocation, and audit logs for secret access. Vanta must never request, store, or load private keys, seed phrases, or keypair files.

## Startup Order

For local Pay + Private Pool integration:

1. Start Private Pool v2:

```bash
npm run private-pool-v2:operator
```

2. Start Pay with `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL` pointed at the Private Pool operator:

```bash
npm run pay:operator
```

3. Run app/browser checks separately:

```bash
npm run pay:browser-check
npm run protocol:browser-check
```

## Current Persistent State

The current local operators use JSON-backed durable stores:

- Private Pool v2: `VANTA_PRIVATE_POOL_V2_STORE_PATH`
- Pay: `VANTA_PAY_STORE_PATH`

These stores prove restart-safe local behavior in the verifier, but they are not a production database, replicated log, or on-chain source of truth.

Pay and Private Pool v2 currently use the shared local JSON snapshot-store seam at `src/storage/vantaJsonSnapshotStore.mjs`. That seam is intentionally marked `productionReady: false`; it exists to make the future production database adapter swap explicit and testable.

Before mainnet, Pay, Private Pool v2, Strategy, and Operator state must move behind the checked production storage contract and pass:

```bash
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run storage:adapter-check
npm run nullifier:replay-guard-check
```

## Before Mainnet

Do not move this runbook to mainnet operation until Vanta has:

- deployed durable operator/indexer/relayer/prover services
- completed external-gates packet with references-only evidence
- final append/nullifier enforcement for the chosen architecture
- secret storage and key rotation
- observability, backups, migrations, and incident runbooks
- rate limits, metrics, alerts, audit events, and abuse-response controls
- third-party security review and audit signoff
- legal, compliance, and custody review where applicable
- `npm run mainnet:readiness-check` updated to prove those blockers are resolved instead of truthfully blocking launch

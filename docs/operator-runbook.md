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
npm run mainnet:backup-restore-check
npm run storage:adapter-check
npm run mainnet:abuse-observability-check
npm run ops:rate-limit-check
npm run ops:safe-telemetry-check
npm run mainnet:observability-sink-check
npm run nullifier:replay-guard-check
npm run mainnet:deployment-manifest-check
npm run private-pool-v2:service-network-check
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
npm run mainnet:backup-restore-check
npm run storage:adapter-check
npm run mainnet:abuse-observability-check
npm run ops:rate-limit-check
npm run ops:safe-telemetry-check
npm run mainnet:observability-sink-check
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

The production service entries in that manifest must stay aligned with the checked service-network start commands:

```bash
npm run private-pool-v2:indexer
npm run private-pool-v2:prover
npm run private-pool-v2:relayer
npm run private-pool-v2:verifier
npm run private-pool-v2:operator
```

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

The production backup/restore template is:

```text
ops/mainnet/production-backup-restore.template.json
```

It records references for production database refs, backup policies, point-in-time recovery, encrypted backup evidence, restore drill evidence, restore runbooks, access audit logs, and least-privilege database users without storing raw database URLs, credential values, backup decryption material, provider API tokens, wallet keys, or private user inputs. It is a setup contract, not evidence that production backup/restore has already passed.

The production DB refs handoff is:

```text
docs/production-db-refs-runbook.md
npm run mainnet:production-db-refs-check
npm run mainnet:production-db-migration-harness-check
npm run mainnet:production-db-migration-dry-run
npm run mainnet:production-db-migration-apply
ops/mainnet/production-migration-evidence.manifest.json
npm run mainnet:production-migration-evidence-check
ops/mainnet/staging-smoke-evidence.manifest.json
npm run mainnet:staging-smoke-evidence-check
```

It lists the exact Doppler database secret names needed for Pay, Private Pool v2 operator storage, Private Pool v2 role-service storage, Strategy, and Operator control-plane storage. The migration evidence manifest records operator-reported schema application refs for the eight production database targets without storing raw URLs. The staging smoke evidence manifest records public `/health` checks for the current Render staging services only. These are not backup/restore, audit, legal/custody, production role-service smoke, or mainnet funds approval evidence.

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

The current staging monitoring manifest is:

```text
ops/mainnet/staging-monitoring.manifest.json
```

It records Better Stack public `/health` uptime monitors for Pay and Private Pool v2. It must not contain Better Stack API keys, webhook URLs, alert-provider credentials, or authenticated status tokens. This is staging uptime evidence only, not production observability.

The production observability template is:

```text
ops/mainnet/production-observability.template.json
```

It records references for Better Stack production log sources, metrics dashboards, alert policies, incident runbooks, and retention policies without storing provider tokens, webhook URLs, source tokens, raw database URLs, bearer tokens, or other secrets. It is a setup contract, not evidence that production observability is already live.

Pay and Private Pool v2 also have a shared in-process rate-limit seam at:

```text
src/ops/vantaRateLimit.mjs
```

The current limiter is intentionally marked `productionReady: false`; it provides a fail-closed operator control point but must be replaced or backed by distributed production rate limiting before mainnet.

Pay and Private Pool v2 also emit shared privacy-safe JSON telemetry through:

```text
src/ops/vantaSafeTelemetry.mjs
```

The helper records startup and HTTP request envelopes with service name, method, path, status code, duration, request id, query-present flag, and a short hash of the remote address. It intentionally excludes request bodies, response bodies, query values, raw IP addresses, auth headers, cookies, API keys, database URLs, tokens, private keys, seed phrases, and mnemonic material. This stdout JSON is staging/operator evidence only; before mainnet it must be connected to a production log sink, metrics, alert routing, audit-event retention, and incident-response workflow.

The reusable nullifier replay guard is:

```text
src/privacy/nullifierReplayGuard.mjs
src/privacy/postgresNullifierReplayStore.mjs
```

Private Pool v2 uses the in-process guard for local claim preflight and accepted-claim reservation. When `VANTA_PRIVATE_POOL_V2_DATABASE_URL` is configured, the operator now prefers the Postgres nullifier replay store, which reserves nullifiers behind the checked `pool_nullifiers` unique indexes. It is still marked `productionReady: false` until the final deployed protocol enforcement layer, production database refs, backup/restore evidence, and audit gates are complete.

For a faster focused check:

```bash
npm run pay:merchant-api-check
npm run private-pool-v2:http-smoke
npm run private-pool-v2:service-network-check
npm run nullifier:replay-guard-check
npm run protocol:browser-check
```

## Private Pool v2 Operator

Start the local Private Pool v2 operator:

```bash
npm run private-pool-v2:operator
```

Start the separated Private Pool v2 service-network entrypoints:

```bash
npm run private-pool-v2:indexer
npm run private-pool-v2:prover
npm run private-pool-v2:relayer
npm run private-pool-v2:verifier
npm run private-pool-v2:service-network-check
npm run private-pool-v2:role-storage-check
```

These services expose the deployable remote-service contract for `remote-services` mode. They still report `productionReady: false` and `mainnetReady: false`; the current implementation is deterministic no-real-funds harness infrastructure until audited production proving, durable production storage, secret-manager-backed refs, production smoke evidence, and mainnet approvals exist.

`npm run private-pool-v2:service-network-check` also starts the operator in `remote-services` mode against the four local role services and routes a deterministic no-real-funds Pay settlement through the network. The local-only flag for this smoke is:

```bash
VANTA_PRIVATE_POOL_V2_ALLOW_INSECURE_LOOPBACK_REMOTE_SERVICES=true
```

Do not use that flag for production. Production remote services must stay HTTPS-only.

The role services have local/staging restart-safe snapshot paths:

```bash
VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH=<local-json-snapshot-path>
VANTA_PRIVATE_POOL_V2_PROVER_STORE_PATH=<local-json-snapshot-path>
VANTA_PRIVATE_POOL_V2_RELAYER_STORE_PATH=<local-json-snapshot-path>
VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH=<local-json-snapshot-path>
```

`npm run private-pool-v2:service-network-check` verifies that accepted commitments, proof artifacts, relayer quotes, and verifier receipts survive role-service restarts through these paths. Treat this as local/staging evidence only; production still requires managed durable database storage and restore evidence.

The per-role production storage adapter check is:

```bash
npm run private-pool-v2:role-storage-check
```

It verifies the role snapshot boundary can use a role-specific database URL such as `VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL`, or the shared fallback `VANTA_PRIVATE_POOL_V2_DATABASE_URL`, as a `postgres-jsonb-snapshot-store` and refuses local JSON snapshot stores in production. This is a code-level contract, not production evidence that the external database refs, backup/restore drills, or audit gates are complete.

When `NODE_ENV=production`, every role service refuses to boot without its role bearer token and restart storage configuration. This prevents accidental stateless or unauthenticated production startup, but does not replace the production database/restore evidence gate.

Important environment variables:

```bash
VANTA_PRIVATE_POOL_V2_OPERATOR_PORT=8797
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=
VANTA_PRIVATE_POOL_V2_STORE_PATH=.vanta-private-pool-v2-receipts.json
VANTA_PRIVATE_POOL_V2_DATABASE_URL=
VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=local-benchmark
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

The deployed-service client boundary is:

```text
src/privacy/privatePoolV2RemoteServices.ts
```

It defines HTTPS clients for the Private Pool v2 indexer, relayer, prover, verifier registry, and remote runtime assembly. Verify it with:

```bash
npm run private-pool-v2:remote-services-check
npm run mainnet:private-pool-v2-production-smoke-check
```

This is the replacement seam for moving away from the local benchmark runtime once real deployed service URLs, mutual-auth credentials, production smoke targets, audit, and mainnet approval exist.

The references-only smoke target template is:

```text
ops/mainnet/private-pool-v2-production-smoke.template.json
```

The production service setup guide is:

```text
docs/production-private-pool-v2-service-setup.md
```

It records the current Render inventory and the deployed production indexer, prover, relayer, verifier, and operator services. Verify the references-only contract with:

```bash
npm run mainnet:production-service-setup-check
npm run mainnet:private-pool-v2-production-smoke-check
```

When the role-service URLs and auth tokens are present in the shell from the secret manager, run the live no-real-funds production smoke with:

```bash
npm run mainnet:private-pool-v2-production-smoke-live
```

The sanitized production smoke evidence manifest is:

```text
ops/mainnet/private-pool-v2-production-smoke.evidence.json
npm run mainnet:production-smoke-evidence-check
```

To select deployed services in an approved non-mainnet or production-like environment, set:

```bash
VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services
VANTA_PRIVATE_POOL_V2_INDEXER_URL=<https-indexer-url>
VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN=<secret-manager-value>
VANTA_PRIVATE_POOL_V2_PROVER_URL=<https-prover-url>
VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN=<secret-manager-value>
VANTA_PRIVATE_POOL_V2_RELAYER_URL=<https-relayer-url>
VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN=<secret-manager-value>
VANTA_PRIVATE_POOL_V2_VERIFIER_URL=<https-verifier-url>
VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN=<secret-manager-value>
```

Store the token values only in the secret manager or deployment environment, never in Git or chat.

The external approval template is:

```text
ops/mainnet/mainnet-approval-gates.template.json
```

Verify it with:

```bash
npm run mainnet:approval-gates-check
```

It stores refs for secret-manager-backed credentials, production smoke evidence, third-party audit, legal/compliance/custody review, and explicit mainnet funds approval. It must never store legal advice text, under-NDA audit contents, exploit details, credential values, wallet keys, or signed transactions.

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

The browser-backed safe-environment signing gate is:

```bash
npm run wallet:browser-signing-safety-check
```

It starts the app with devnet configuration, verifies the Shield/Send browser surfaces do not expose mainnet submission or secret-key language, and verifies the Shield action does not advance into wallet-confirmation state when no wallet is connected.

## Secret Handling

The checked secret-handling contract is:

```text
src/readiness/secretHandlingContract.mjs
```

The checked secret-reference manifest is:

```text
ops/mainnet/secret-references.manifest.json
```

It stores reference names only. It must never contain raw secret values, raw database URLs, bearer tokens, webhook secrets, private keys, seed phrases, or wallet keypair files.

Current staging refs use `render-env-var-staging` for the verified Render Pay and Private Pool v2 services. Production refs remain blocked behind `production-secret-manager-required` until a real secret manager, service identities, rotation runbook, revocation runbook, and access audit logs exist.

Doppler has been selected as the production secret-manager target. The checked Doppler mapping template is:

```text
ops/mainnet/production-secret-manager.template.json
```

The template is references-only. It records the intended Doppler project/config refs, service identities, secret names, owners, rotation cadence, revocation runbook refs, and access-log refs. It must not contain Doppler service tokens or secret values.

Before production, an operator still needs to create least-privilege Doppler service tokens outside git, verify Doppler access logs, and wire deployment services to read from Doppler rather than staging Render env vars.

The beginner-safe staging Doppler guide is:

```text
docs/doppler-staging-setup.md
```

If the existing operator token cannot be found, create a new strong token and put the same value into `VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN` and `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN`, then redeploy Pay and Private Pool v2 together.

Secret handling is checked by:

```bash
npm run mainnet:secret-handling-check
```

The contract requires a production secret manager, least-privilege service identities, no secrets in the repo, no secrets in client bundles, names-only manifests, rotation runbooks, incident revocation, and audit logs for secret access. Vanta must never request, store, or load private keys, seed phrases, or keypair files.

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

The current local/staging operators can use JSON-backed durable stores:

- Private Pool v2: `VANTA_PRIVATE_POOL_V2_STORE_PATH`
- Pay: `VANTA_PAY_STORE_PATH`
- Private Pool v2 role services: `VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH`, `VANTA_PRIVATE_POOL_V2_PROVER_STORE_PATH`, `VANTA_PRIVATE_POOL_V2_RELAYER_STORE_PATH`, `VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH`

These stores prove restart-safe local behavior in the verifier, but they are not a production database, replicated log, or on-chain source of truth.

Pay, Private Pool v2, and the Private Pool v2 role services now use checked snapshot-store seams that can select `postgres-jsonb-snapshot-store` when database URL refs are configured. Local JSON remains supported for local/staging restart checks only, and every storage seam stays `productionReady: false` until real production database refs, backup/restore evidence, and approval gates exist.

The local JSON and Private Pool v2 role seams live at:

```text
src/storage/vantaJsonSnapshotStore.mjs
src/storage/vantaPrivatePoolV2RoleSnapshotStore.mjs
```

Before mainnet, Pay, Private Pool v2, Strategy, and Operator state must be attached to production database refs behind the checked production storage contract and pass:

```bash
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run mainnet:backup-restore-check
npm run storage:adapter-check
npm run nullifier:replay-guard-check
npm run private-pool-v2:role-storage-check
```

## Production Backup/Restore Drill

Do not treat the production storage gate as cleared until every store in `ops/mainnet/production-backup-restore.template.json` has references-only evidence for backup policy, point-in-time recovery, encrypted backup evidence, restore-drill evidence, restore runbook, access audit logs, and least-privilege database users.

Safe evidence to record:

- database reference name
- backup policy reference
- point-in-time recovery reference
- restore-drill result reference
- access audit log reference
- least-privilege database user reference

Never paste or commit:

- raw database URLs
- credential values
- backup decryption material
- provider API tokens
- wallet keys
- private user inputs

Minimum restore-drill flow:

1. Create a disposable restore target outside production.
2. Restore from the most recent encrypted backup or point-in-time recovery target.
3. Run schema and state readback checks against the restored target.
4. Verify nullifier uniqueness, Pay idempotency keys, webhook retry state, strategy child-order uniqueness, and operator deployment locks survive restore.
5. Destroy the disposable restore target after recording references-only evidence.
6. Update `ops/mainnet/production-backup-restore.template.json` refs without adding secret material.

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

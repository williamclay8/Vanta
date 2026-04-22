# Production DB Refs Runbook

This runbook is the safe handoff for moving Vanta from staging database references toward production database references.

It does not make Vanta mainnet-ready. Keep `mainnetReady: false` and `productionReady: false` until the real production database refs, migrations, backup/restore evidence, production smoke evidence, audit, legal/custody review, and explicit mainnet funds approval are complete.

## Safety Rule

Do not paste raw database URLs into chat or git. Do not paste credential values, provider tokens, backup keys, wallet material, private keys, seed phrases, or customer private inputs.

Codex should receive reference names and evidence IDs only.

## Required Database Secret Names

Create these in Doppler production config after the production databases exist:

- `VANTA_PAY_DATABASE_URL`
- `VANTA_PRIVATE_POOL_V2_DATABASE_URL`
- `VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL`
- `VANTA_PRIVATE_POOL_V2_PROVER_DATABASE_URL`
- `VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL`
- `VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL`
- `VANTA_STRATEGY_DATABASE_URL`
- `VANTA_OPERATOR_DATABASE_URL`

These map to refs in:

- `ops/mainnet/secret-references.manifest.json`
- `ops/mainnet/production-secret-manager.template.json`
- `ops/mainnet/private-pool-v2-services.manifest.json`
- `ops/mainnet/production-backup-restore.template.json`

## Render Postgres Path

Use Render Postgres or a production-equivalent managed Postgres provider.

Minimum production expectations:

- Paid production database, not expiring free staging database.
- Private/internal connection where supported.
- Point-in-time recovery enabled.
- Encrypted backups enabled.
- Least-privilege database user for each service or service group.
- Restore drill completed before mainnet.
- Access audit trail available by reference.

## Doppler Path

Use Doppler production config for runtime database URLs.

Do this in the Doppler dashboard:

1. Open the Vanta project.
2. Open the production config.
3. Add the database secret names listed above.
4. Paste each value only into Doppler.
5. Create or confirm service tokens for the runtime services.
6. Record only reference names or evidence IDs in the repo, never values.

## Migration

The forward-only baseline migration is:

```bash
ops/storage/postgres/001_vanta_mainnet_storage.sql
```

Before mainnet, apply it to the production database target and record only migration evidence refs.

Required local checks:

```bash
npm run mainnet:storage-migration-check
npm run mainnet:production-db-migration-harness-check
npm run mainnet:production-db-migration-dry-run
npm run mainnet:backup-restore-check
npm run mainnet:backup-restore-evidence-check
npm run mainnet:production-restore-drill-evidence-check
npm run mainnet:secret-handling-check
npm run mainnet:preflight
```

## Safe Migration Harness

The checked harness is:

```bash
scripts/apply-vanta-production-postgres-migration.mjs
```

It runs in dry-run mode by default and refuses to print raw database URLs.

Use this local preflight command before touching a database:

```bash
npm run mainnet:production-db-migration-dry-run
```

When the production database refs are present in Doppler, run the apply command through Doppler so the raw database URL never enters chat, git, or shell history:

```bash
doppler run --config prd --project vanta -- \
  sh -lc 'export DATABASE_URL="$VANTA_PAY_DATABASE_URL"; \
  VANTA_PRODUCTION_DB_TARGET=VANTA_PAY_DATABASE_URL_REF \
  VANTA_ALLOW_PRODUCTION_DB_MIGRATION=true \
  npm run mainnet:production-db-migration-apply'
```

For a role-specific database, keep the same command shape but set `DATABASE_URL` from the intended Doppler secret inside a controlled shell, and change `VANTA_PRODUCTION_DB_TARGET` to the reference name being migrated. For example, set it from `VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL` and use `VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL_REF` as the target ref. The database mutation is intentionally not part of `npm run mainnet:preflight`.

The migration harness enables SSL/TLS by default for Render external Postgres URLs. Use `VANTA_POSTGRES_SSL=disable` only for local non-SSL test databases.

## Restore Drill Evidence

The restore drill evidence file is:

```bash
ops/mainnet/production-restore-drill.evidence.json
```

It records only reference names. A restored database being created is not enough by itself; the restored database must also pass readback before it can count as recovery evidence.

The current evidence records operator/control-plane restore readback for `VANTA_OPERATOR_DATABASE_URL_REF` and Private Pool v2 core restore readback for `VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF`. It does not clear backup policy, PITR, encrypted backup, access audit, or least-privilege restore gates.

Run this references-only evidence check:

```bash
npm run mainnet:production-restore-drill-evidence-check
```

To verify the restored Private Pool v2 operator database locally, set the restored database URL only in your terminal or secret manager, then run:

```bash
DATABASE_URL="<restored-db-url-from-provider>" \
VANTA_RESTORE_DRILL_TARGET_REF=VANTA_OPERATOR_DATABASE_URL_REF \
npm run mainnet:production-restore-drill-readback
```

Do not paste the restored database URL into chat, docs, git, screenshots, or issue trackers. The readback command refuses to print the URL and checks schema version, Private Pool v2 tables, and replay/settlement indexes.

## Backup/Restore Evidence Status

The current backup/restore evidence file is:

```bash
ops/mainnet/production-backup-restore.evidence.json
npm run mainnet:backup-restore-evidence-check
npm run mainnet:backup-restore-status
npm run mainnet:backup-restore-status-json
```

It records the current truth in one place:

- schema migrations are operator-reported across the required production database refs
- restore readback has passed for `VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF`
- restore readback has passed for `VANTA_OPERATOR_DATABASE_URL_REF`
- Pay, Private Pool v2 role-service storage, and Strategy restore readbacks remain pending
- backup policy, PITR, encrypted backup, access audit, and least-privilege restore-user evidence remain pending

This file is intentionally not a greenlight for mainnet. It is the checklist that prevents us from confusing partial restore proof with a complete production backup/restore program.

## Evidence To Capture

For each database ref, capture reference-only evidence:

- database ref name
- migration applied evidence ref
- backup policy ref
- point-in-time recovery ref
- restore drill ref
- least-privilege user ref
- access audit log ref

Store evidence refs in the checked ops templates, not raw provider values.

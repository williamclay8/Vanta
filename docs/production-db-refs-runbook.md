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
npm run mainnet:backup-restore-check
npm run mainnet:secret-handling-check
npm run mainnet:preflight
```

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

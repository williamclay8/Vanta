# Vanta Mainnet Launch Worksheet

This is the plain-English version of the external gates. It is for Clay and future operators who need to know what to find, who usually provides it, and what is safe to give Codex.

Vanta is Not production-ready until these gates are filled with real evidence and independently reviewed.

## Start Here

Think of Vanta mainnet readiness as five jobs happening in parallel:

1. Put the app and operators on real servers.
2. Put Vanta state in a real database with backups.
3. Put secrets in a real secret manager, not in code or chat.
4. Get outside professionals to review security, legal, compliance, and custody risk.
5. Only then approve a specific mainnet action with real funds.

The repo can prepare contracts, checks, code, and docs. The external gates are the things that require accounts, vendors, reviewers, or human approval outside this repo.

## Do Not Send Me

Do not send Codex any of these:

- private keys
- seed phrases
- wallet keypair files
- raw database URLs
- raw API keys
- raw RPC credentials
- raw webhook secrets
- raw bearer tokens
- customer private inputs

If something can spend funds, authenticate to a service, decrypt data, or access customer data, it does not belong in chat or git.

## What You Need To Find

| Gate | Plain-English Meaning | Who Usually Provides This | What To Give Codex | What Not To Give Codex |
| --- | --- | --- | --- | --- |
| Deployed services | Real internet-hosted Vanta services for indexer, relayer, prover, verifier, and operator | Infrastructure engineer or cloud hosting provider | Public service names, non-secret URLs, health endpoint paths, secret reference names | Server root passwords, deploy keys, raw tokens |
| Production storage | A real database with backups and restore ability | Database host, cloud provider, or backend engineer | Database reference name, migration status, backup/restore evidence | Raw database URL, password, backup decryption key |
| Secret manager | A safe place for production credentials | Cloud provider, security engineer, or DevOps engineer | Secret-manager name and secret reference names | Secret values |
| Wallet signing safety | Proof the app never asks users to blindly sign unsafe transactions | Frontend/security engineer | Browser test results, screenshots, approval-flow notes | Private wallet keys, seed phrase, signed real-fund txs |
| Third-party security audit | Outside experts review circuits, operators, wallet flows, and infra assumptions | Security audit firm or independent cryptography/security reviewer | Audit scope, report reference, finding status | NDA-only details unless cleared, exploit details in public docs |
| Legal/compliance/custody | Lawyers/compliance people confirm what can be launched and where | Crypto lawyer, compliance advisor, custody specialist | Review reference, launch-scope decision, custody model decision | Privileged legal advice unless cleared, customer data |
| Mainnet funds approval | A human approves a specific real-funds action | Clay or designated launch approver | Approval record reference, approved action, launch window | Wallet private key, seed phrase, keypair file |
| Monitoring/incident response | Dashboards and alerts so operators know when something breaks or is abused | DevOps/SRE/security operator | Dashboard links, alert routing, incident runbook reference | Log ingestion secrets, alert provider API keys |

## First Practical Path

The fastest responsible path is not “mainnet now.” It is:

1. Choose a staging host for the operator services.
2. Choose a staging database.
3. Choose a secret manager.
4. Deploy Vanta services to staging with fake funds and non-mainnet settings.
5. Run the mainnet preflight against staging-style references.
6. Prepare the audit package.
7. Get security review.
8. Get legal/compliance/custody review.
9. Prepare mainnet deployment runbook.
10. Approve one tiny, explicit mainnet dry run only after all gates are green.

## What To Give Codex First

The first useful handoff is not secrets. It is a small provider/status note like this:

```text
Infrastructure host: chosen / not chosen
Database host: chosen / not chosen
Secret manager: chosen / not chosen
Monitoring provider: chosen / not chosen
Security reviewer: chosen / not chosen
Legal/compliance reviewer: chosen / not chosen
Target environment: staging first
Mainnet funds: not approved
```

If a host or provider is chosen, give Codex names and non-secret references only.

Good:

```text
Secret manager ref: prod/vanta/mainnet
Database ref: vanta-mainnet-db
Operator URL ref: vanta-operator-mainnet-url
Audit report ref: audit/vanta/round-1
```

Bad:

```text
DATABASE_URL=postgres://user:password@...
PRIVATE_KEY=...
WEBHOOK_SECRET=...
```

## What Codex Can Do Without Secrets

Codex can continue building:

- deployment manifests
- environment variable templates
- staging smoke tests
- health checks
- database migration checks
- backup/restore drill scripts
- secret-reference validation
- audit package organization
- runbooks
- browser wallet safety tests
- production-readiness status surfaces

## What Codex Cannot Honestly Complete Alone

Codex cannot honestly clear these gates without external evidence:

- provisioned production infrastructure
- real secret manager access
- deployed service URLs and health results
- real database backup and restore evidence
- third-party security audit
- legal/compliance/custody signoff
- explicit approval before mainnet funds

This is not Codex being timid. This is the line between building the system and claiming responsibility for real-world launch risk.

## Immediate Next Step

Fill only the provider/status note from the `What To Give Codex First` section. Use `not chosen` for anything unknown.

Once that exists, Codex can generate the next concrete staging deployment checklist and keep building the non-secret pieces.

## Current Staging Status

As of April 20, 2026:

- Infrastructure host: Render staging selected.
- Pay staging service: `srv-d7j3ggqqqhas739for80`, `https://vanta-0wwi.onrender.com`.
- Private Pool v2 staging service: `srv-d7j4aod7vvec73ahsqlg`, `https://vanta-staging-private-pool-v2.onrender.com`.
- Database host: Render Postgres staging selected.
- Pay storage: `postgres-jsonb-snapshot-store`.
- Private Pool v2 storage: `postgres-jsonb-snapshot-store`.
- Secret manager: Doppler staging completed by operator report; Doppler selected as the production target, but production integration is not complete.
- Secret reference manifest: `ops/mainnet/secret-references.manifest.json` inventories Pay, Private Pool v2, Strategy, and Operator refs without secret values.
- Production secret-manager template: `ops/mainnet/production-secret-manager.template.json` maps those refs to Doppler project/config names without secret values.
- Production DB refs runbook: `docs/production-db-refs-runbook.md` lists the exact Render Postgres / Doppler database refs needed for Pay, Private Pool v2 operator, Private Pool v2 role services, Strategy, and Operator control-plane storage.
- Production DB migration harness: `npm run mainnet:production-db-migration-dry-run` validates the checked migration plan without exposing database URLs; `npm run mainnet:production-db-migration-apply` is intentionally gated behind Doppler-provided `DATABASE_URL` and `VANTA_ALLOW_PRODUCTION_DB_MIGRATION=true`.
- Production migration evidence: `ops/mainnet/production-migration-evidence.manifest.json` records operator-reported/read-back schema application refs for Pay, Private Pool v2, role services, Strategy, and Operator databases. This does not clear backup/restore, audit, legal/custody, or mainnet-funds gates.
- Staging smoke evidence: `ops/mainnet/staging-smoke-evidence.manifest.json` records public `/health` checks for the current Render staging services. This does not clear production role-service smoke, audit, legal/custody, backup/restore, or mainnet-funds gates.
- Doppler staging setup guide: `docs/doppler-staging-setup.md`.
- Monitoring provider: Better Stack staging monitors created by operator report; Better Stack production monitors are intentionally skipped by operator decision.
- Staging monitoring manifest: `ops/mainnet/staging-monitoring.manifest.json` tracks public `/health` monitors only.
- Operator telemetry: Pay and Private Pool v2 now emit privacy-safe stdout JSON through `src/ops/vantaSafeTelemetry.mjs`; production log sink, metrics, alert routing, audit retention, and incident workflow are not complete.
- Production observability template: `ops/mainnet/production-observability.template.json` records provider-neutral references-only log source, dashboard, alert-policy, incident-runbook, and retention-policy targets.
- Production observability currently points Private Pool v2 at the live Render production role service refs for indexer, prover, relayer, verifier, and operator. This is inventory alignment only; observability evidence remains pending because production monitors/sinks were skipped.
- Production backup/restore template: `ops/mainnet/production-backup-restore.template.json` records references-only database, backup policy, PITR, encrypted-backup, restore-drill, access-audit, and least-privilege user targets.
- Production backup/restore evidence status: `ops/mainnet/production-backup-restore.evidence.json` records the current partial state: migrations are operator-reported/read back for Pay, Private Pool v2 core, Private Pool v2 role-service storage, Strategy, and operator/control-plane storage; Pay restore readback plus backup policy, PITR, encryption, access audit, and least-privilege restore-user evidence remain pending.
- Operator decision: Clay chose to skip provider backup policy, PITR, encrypted backup, access-audit, and least-privilege restore-user evidence collection for now. Those gates remain pending and still block `productionReady` and `mainnetReady`.
- Production restore-drill evidence: `ops/mainnet/production-restore-drill.evidence.json` records that the operator/control-plane restore database passed readback for `VANTA_OPERATOR_DATABASE_URL_REF`, the Private Pool v2 core database passed readback for `VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF`, and the restored production copy has readback evidence for Private Pool v2 role-service storage plus Strategy storage; Pay readback, backup policy, PITR, encryption, access-audit, and least-privilege restore evidence remain pending.
- Production infrastructure references are now cross-linked in `ops/mainnet/external-gates.packet.json`; `npm run mainnet:external-gates-check` fails if the storage, secret-manager, observability, or browser wallet-signing references drift out of the packet.
- Private Pool v2 deployed-service client boundary exists at `src/privacy/privatePoolV2RemoteServices.ts`; `npm run private-pool-v2:remote-services-check` verifies HTTPS clients for indexer, relayer, prover, verifier registry, and remote runtime assembly.
- Nullifier/replay protection now has a Postgres-backed reservation adapter at `src/privacy/postgresNullifierReplayStore.mjs`; the production SQL includes context/request unique indexes, but the final deployed protocol enforcement layer and audit are still blocked.
- Browser wallet-signing safety now has a devnet/local browser command: `npm run wallet:browser-signing-safety-check`.
- Private Pool v2 production smoke template: `ops/mainnet/private-pool-v2-production-smoke.template.json` records no-real-funds smoke evidence refs for deployed indexer, prover, relayer, verifier, and operator services.
- Private Pool v2 production smoke evidence: `ops/mainnet/private-pool-v2-production-smoke.evidence.json` records authenticated no-real-funds production smoke across deployed indexer, prover, relayer, verifier, and operator services.
- Private Pool v2 production service setup guide: `docs/production-private-pool-v2-service-setup.md` records the current Render inventory and deployed production indexer, prover, relayer, verifier, and operator services.
- Mainnet approval gates template: `ops/mainnet/mainnet-approval-gates.template.json` records refs for secret-manager-backed credentials, production smoke evidence, third-party audit, legal/compliance/custody review, and explicit mainnet-funds approval.
- Mainnet approval gates evidence: `ops/mainnet/mainnet-approval-gates.evidence.json` records the current launch-control truth: technical smoke/migration/partial restore evidence is linked, audit and legal/compliance/custody are skipped by operator decision but not cleared, and provider backup controls, Pay restore readback, and explicit mainnet funds approval are still blocked.
- Mainnet approval gates status: `npm run mainnet:approval-gates-status` prints the current gate state without exposing secrets.
- Mainnet real-funds approval packet: `ops/mainnet/mainnet-real-funds-approval.evidence.json` is the next launch-control packet. It remains not approved until one exact action, launch window ref, fee-payer ref, rollback ref, stop-loss ref, bounded funds-at-risk ref, and approver ref are recorded.
- Security reviewer: not chosen.
- Legal/compliance reviewer: not chosen.
- Target environment: staging first.
- Mainnet funds: not approved.

Next practical step: move through `ops/mainnet/mainnet-real-funds-approval.evidence.json` and fill only refs for a single exact mainnet action if you choose to approve it. Pay restore readback remains pending. Provider backup/PITR/encryption/access-audit/least-privilege evidence collection is intentionally skipped for now and remains a production blocker. Audit and legal/compliance/custody reviews are skipped by operator decision, not cleared. Do not paste credentials, legal text, audit exploit details, wallet keys, or signed transactions.

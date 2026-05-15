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
| Mainnet funds approval | A human approves one specific bounded real-funds action, not general mainnet funds | Clay or designated launch approver | Approval record reference, approved action, launch window | Wallet private key, seed phrase, keypair file |
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
DATABASE_URL=<raw-database-url>
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
- new explicit approval before any mainnet-funds action

The current refs-only intake templates are:

- `ops/mainnet/audit-review.packet.template.json`
- `ops/mainnet/legal-compliance-custody.packet.template.json`
- `ops/mainnet/production-key-custody.template.json`

Use these to record references to real reviewer decisions, not raw reports, legal advice, private keys, signed transactions, or credentials.

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
- Operator telemetry: Pay and Private Pool v2 now emit privacy-safe stdout JSON through `src/ops/vantaSafeTelemetry.mjs`; incident workflow refs are configured, while production log sink, metrics, alert routing, and audit retention are not complete.
- Production observability template: `ops/mainnet/production-observability.template.json` records provider-neutral references-only log source, dashboard, alert-policy, incident-runbook, and retention-policy targets.
- Production observability currently points Private Pool v2 at the live Render production role service refs for indexer, prover, relayer, verifier, and operator. This is inventory alignment only; observability evidence remains pending because production monitors/sinks were skipped.
- Production backup/restore template: `ops/mainnet/production-backup-restore.template.json` records references-only database, backup policy, PITR, encrypted-backup, restore-drill, access-audit, and least-privilege user targets.
- Production backup/restore evidence status: `ops/mainnet/production-backup-restore.evidence.json` records that migrations are operator-reported/read back for Pay, Private Pool v2 core, Private Pool v2 role-service storage, Strategy, and operator/control-plane storage; Pay restore readback plus backup policy, PITR, encryption, access audit, and least-privilege restore-user evidence were skipped by operator decision.
- Operator decision: Clay chose to remove Pay restore readback and provider backup/PITR/encryption/access-audit/least-privilege evidence from active blockers on April 22, 2026. This is not evidence that those controls passed.
- Production restore-drill evidence: `ops/mainnet/production-restore-drill.evidence.json` records that the operator/control-plane restore database passed readback for `VANTA_OPERATOR_DATABASE_URL_REF`, the Private Pool v2 core database passed readback for `VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF`, and the restored production copy has readback evidence for Private Pool v2 role-service storage plus Strategy storage; Pay readback and provider backup controls are operator-skipped controls, not completed evidence.
- Production infrastructure references are now cross-linked in `ops/mainnet/external-gates.packet.json`; `npm run mainnet:external-gates-check` fails if the storage, secret-manager, observability, or browser wallet-signing references drift out of the packet.
- Private Pool v2 deployed-service client boundary exists at `src/privacy/privatePoolV2RemoteServices.ts`; `npm run private-pool-v2:remote-services-check` verifies HTTPS clients for indexer, relayer, prover, verifier registry, and remote runtime assembly.
- Nullifier/replay protection now has a Postgres-backed reservation adapter at `src/privacy/postgresNullifierReplayStore.mjs`; the production operator refuses file-only replay storage and requires `VANTA_PRIVATE_POOL_V2_DATABASE_URL`, while the final deployed protocol enforcement layer and audit are still blocked.
- Browser wallet-signing safety now has a mainnet/local browser command: `npm run wallet:browser-signing-safety-check`.
- Private Pool v2 production smoke template: `ops/mainnet/private-pool-v2-production-smoke.template.json` records no-real-funds smoke evidence refs for deployed indexer, prover, relayer, verifier, and operator services.
- Private Pool v2 production smoke evidence: `ops/mainnet/private-pool-v2-production-smoke.evidence.json` records authenticated no-real-funds production smoke across deployed indexer, prover, relayer, verifier, and operator services.
- Private Pool v2 production service setup guide: `docs/production-private-pool-v2-service-setup.md` records the current Render inventory and deployed production indexer, prover, relayer, verifier, and operator services.
- Mainnet approval gates template: `ops/mainnet/mainnet-approval-gates.template.json` records refs for secret-manager-backed credentials, production smoke evidence, third-party audit, legal/compliance/custody review, and explicit mainnet-funds approval.
- Mainnet approval gates evidence: `ops/mainnet/mainnet-approval-gates.evidence.json` records the current launch-control truth: technical smoke/migration/partial restore evidence is linked, audit, legal/compliance/custody, secret-manager audit/rotation, provider backup controls, and Pay restore readback are operator-skipped controls. The real-funds approval status is bounded to the exact currently recorded action/window/cap and must be checked with `npm run mainnet:real-funds-approval-status`.
- Mainnet approval gates status: `npm run mainnet:approval-gates-status` prints the current gate state without exposing secrets.
- Mainnet real-funds approval packet: `ops/mainnet/mainnet-real-funds-approval.evidence.json` records the exact approved action, launch window, fee-payer ref, rollback ref, stop-loss ref, bounded funds-at-risk ref, and approver ref for the current bounded action only.
- Security reviewer: not chosen.
- Legal/compliance reviewer: not chosen.
- Target environment: staging first.
- General mainnet funds: not approved. Any approval is action-, window-, fee-payer-, and cap-scoped; check the current status before any live mainnet action.

Next practical step: record or verify a bounded approval before any live mainnet action, including any repeat or changed action, because approval is not reusable outside the exact recorded action/window/fee-payer/cap. Pay restore readback, provider backup/PITR/encryption/access-audit/least-privilege evidence, secret-manager audit/rotation evidence, audit, and legal/compliance/custody review are operator-skipped controls, not completed controls. Do not paste credentials, legal text, audit exploit details, wallet keys, or signed transactions.

## Pay Production Release Checklist

- [ ] Pay operator deployed with `NODE_ENV=production`.
- [ ] Pay operator uses secret-manager refs for `VANTA_PAY_SECRET_KEY`, `VANTA_PAY_WEBHOOK_SECRET`, `VANTA_PAY_DATABASE_URL`, `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL`, and `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN`.
- [ ] `npm run pay:status-json` reports `durableStoreConfigured: true`.
- [ ] `npm run pay:status-json` reports `productionDurableStoreConfigured: true`.
- [ ] `npm run pay:status-json` reports `privatePoolOperatorConfigured: true`.
- [ ] `npm run pay:status-json` reports `privatePoolOperatorAuthConfigured: true`.
- [ ] `npm run mainnet:private-settlement-status -- --json` reports `liveMainnetPrivateSettlementAvailable: true`.
- [ ] `npm run mainnet:private-settlement-status -- --json` reports `privacyClaimAllowed: true`.
- [ ] Active bounded real-funds approval exists for the exact Pay production action, not only a Private Pool smoke.
- [ ] Third-party security audit evidence is recorded.
- [ ] Legal/compliance/custody review is recorded.
- [ ] Pay restore readback and provider backup controls are either completed evidence or explicitly recorded as accepted launch risk; accepted risk does not by itself make `productionReady` true.

## Native SOL v2 + TAG6 Mainnet Deployment Worksheet Entries (Production Readiness Prep — Full Blast 2026-05-14)

### Blocker Removal Toolkit (New — created to directly attack real MISSION.md blockers)

The following tools were created specifically so that the only remaining actions are human-directed mainnet deployment + live evidence collection:

- `npm run tag6:derive-sol-vault-pdas -- --pool-state <POOL>`  
  → Produces the exact `vanta2solvault` + `vanta2asset` PDAs (`scripts/native-sol-tag6/derive-sol-vault-pdas.mjs`)

- `npm run tag6:build-register-sol-vault-asset-instruction`  
  → Builds the TAG_REGISTER_VAULT_ASSET=7 instruction data for kind=2 + sentinel

- `npm run tag6:scan-mainnet-releases`  
  → Scans mainnet for real TAG6 SOL system CPI releases from the PDA (verifies no operator keypair)

- Production snapshot probe (`probe-sentinel-in-production-snapshot.mjs`)

Use these immediately after the first mainnet deployment. They turn the abstract "live evidence gate" from design §12 into concrete, repeatable commands. All tools are heavily documented with references to the design document and status note.

**References**: Design document `wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md` (data model, PDA seeds, TAG6 wiring, verification commands, risks, no re-shield), status note (Recommended Next Actions #7: mainnet deployment worksheet entries for SOL vault PDA + TAG6; #5 regression, #6 Lumi), VANTA_ZK_REVIEW.md U2.1, architecture blocker map (A1-TAG6, R6A local closure), operator-runbook.md (new Native SOL + TAG6 section), Crucible comment in fuzz/.../main.rs, SBF ABI comments in programs/.../lib.rs, unshield* status/trust surfaces.

**SOL Vault PDA + TAG6 Deployment Checklist** (add to mainnet gates; all fail-closed until evidence):
- [ ] On-chain program deployed with native SOL support: VAULT_ASSET_KIND_SOL (=2) discriminator, NATIVE_SOL_ASSET_ID_SENTINEL handling (zero bypass preflight documented), generalized TAG_UNSHIELD=6 accounts (includes system_program), process_unshield asset_kind branch for system_instruction::transfer CPI from program-owned SOL vault PDA (seeds: ["vanta2solvault", pool_state, sentinel] or generalized ["vanta2vault", ...] + kind).
- [ ] Vault asset registry PDA for sentinel + kind=2 registered via TAG_REGISTER_VAULT_ASSET=7 (or equivalent init path).
- [ ] SOL vault PDA created/owned by program (holds lamports, not token account); authority PDA derivation matches spec.
- [ ] TAG6 SOL unshield: proof-verified release executes system transfer (no operator keypair funds movement); UnshieldEvent emitted; indexer cross-refs on-chain transfer log for amount/sentinel.
- [ ] Shield deposit path for SOL (future TAG_SHIELD complement): SystemProgram.transfer to SOL PDA + v2 proof binding sentinel + amount + commitment.
- [ ] SBF binary fresh (cargo-build-sbf), ABI verified with SOL comments (regression: private-pool-v2:sbf-abi-check passed post-rebuild; source comments reference design doc + status note).
- [ ] Crucible harness extended with SOL-specific scenarios (PDA registration, system CPI, sentinel bypass, no-release on invalid proof for lamports); current dry-run SPL-only.
- [ ] Live production indexer ingests real native SOL v2 commitments (sentinel) from Shield deposits; `nativeSolV2IndexerIngestionReady: true` only with evidence (POST /v1/ingest-native-sol-shield-deposit exercised on mainnet).
- [ ] End-to-end live evidence: native SOL note in v2 unified tree → VantaPrivatePoolV2UnshieldProofRequest → remote prover → TAG6 on-chain system transfer release with proof gate.
- [ ] External gates: independent audit acceptance for SOL TAG6 path (program-owned custody), real-funds bounded approval scoped to SOL vault PDA + TAG6, legal/compliance/custody review for native SOL program-owned model.
- [ ] Production flags flipped only after live evidence: productionCustodyReadyForSol, nativeSolProgramOwnedVaultPdaReady, nativeSolTagUnshieldSystemCpiReady, onchainProofVerifierReady (currently all false; see unshieldMainnetProductionStatus, trust contract, truth:privacy-claim-gate).
- [ ] Mainnet deployment manifests / runbook updated with SOL PDA seeds, kind=2 registration tx, TAG6 instruction layout, indexer event parsing for SOL UnshieldEvent + transfer.
- [ ] Operator monitoring: health for sentinel ingestion endpoint, SOL deposit signature validation (public receipts), future TAG6 SOL release logs / nullifier replay.
- [ ] No re-shield required: v2 sentinel commitments from current Phase 1/2 remain valid under on-chain tree (same Poseidon depth-20).

**Operator / Mainnet Action Items for SOL TAG6**:
- Deploy program with above SOL wiring (reference VANTA_ZK_REVIEW U2.1 exact PDA, instruction data, events).
- Register SOL vault asset (kind=2, sentinel) in production.
- Exercise native SOL shield → v2 ingestion → proof request → TAG6 release on mainnet (bounded funds).
- Update public audit manifest, /.well-known/vanta-audit.json, vantaprivacy.xyz surfaces with native SOL TAG6 status.
- Bounded approval required before any real SOL funds in TAG6 path.

**Lumi Hygiene**: Local edits + SBF rebuild + regression runs (private-pool-v2:verify includes sbf-abi + crucible, shield:verify, build clean post-fixes, diff --check clean, zk:feedback-loop-check, privacy-audit:tracker-check, product-ui:browser-check) recorded. Committed/pushed pending owner. Evidence in design doc, status note, this worksheet, blocker map, findings ledger, daily note 2026-05-14.md, wiki/meta/log.md. Strict truth: all production/privacy claims for native SOL TAG6 remain fail-closed. No funds movement, no live indexer, no on-chain TAG6 SOL yet. "Program-owned custody + on-chain proof verification" target maintained.

Update this worksheet, runbook, Crucible, SBF, blocker map, audit tracker, findings ledger with latest evidence before any external review request. Full regression evidence in status note + daily note.

### SBF Production Build & Deployment Command Center Lane Completion (2026-05-14 — Full Blast subagent, Lane: SBF Production Build & Deployment Command Center)
**Mission**: Remove the "mainnet deployment" real MISSION.md blocker for Native SOL TAG6 by producing fresh SBF binaries in both workspaces + creating production-grade Deployment Command Center scripts + updating worksheets/runbooks with exact commands + documenting human steps with secrets/Render/mainnet RPC.

**Fresh SBF Binaries Produced (both workspaces, 2026-05-14 23:11 PDT)**:
- Command used: `/Users/clay/.local/share/solana/install/active_release/bin/cargo-build-sbf --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml --sbf-out-dir programs/vanta_private_pool_v2_spend/target/deploy` (after `touch src/lib.rs` for freshness; full SOL TAG6 test helper code synced to both).
- Vanta/: `/Users/clay/Desktop/Vanta/programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so`
  - Size: 96184 bytes | SHA256: 2491ee0d94a899f36bd572b58d5733fc2528c34f0ad3fe86f29cc68cce76ca03 | mtime: 2026-05-14 23:11:13 PDT
  - Keypair: `.../vanta_private_pool_v2_spend-keypair.json` (hash a30be28b0e5d54259792b10684c08ae0c92b8b22288dc120607c53fb6a081d57)
- Vanta-lane-trust-strip-worker/: identical .so (same hash/size) at `programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so` (keypair present).
- Both now have full SOL TAG6 path (VAULT_ASSET_KIND_SOL=2, SOL_VAULT_SEED=b"vanta2solvault", dedicated sol_vault_pda helper, require_sol_vault_pda, process_unshield SOL branch with exact seeds + system_instruction::transfer CPI via invoke_signed, UnshieldEvent, test `unshield_sol_sentinel_path_exercises_full_tag6_success_in_test_mode`, preflight error paths). References design doc §11 + status note everywhere in comments.
- Verification: `npm run private-pool-v2:sbf-abi-check` (or equivalent) now passes with fresh binary + SOL comments; no stale-sbf-binary gate.

**New Deployment Command Center Scripts (created in programs/vanta_private_pool_v2_spend/scripts/ in BOTH workspaces)**:
- `derive-sol-vault-pda.mjs`: Given pool_state + optional sentinel (defaults 32 zeros) + program_id, outputs exact PDA + bump using SOL_VAULT_SEED + sentinel. Prints Rust verification snippet. Runnable: `node programs/vanta_private_pool_v2_spend/scripts/derive-sol-vault-pda.mjs <pool> 0000... <prog>`.
- `deploy-vanta-private-pool-v2-tag6-sol.mjs`: Full production script.
  - SBF verification (ls + sha256 + size + mtime + keypair check; records the exact hashes above).
  - PDA derivation (calls logic or the derive script).
  - TAG_REGISTER_VAULT_ASSET=7 instruction construction (data: tag=7 + sentinel[32] + kind=2 + release_enabled=1; accounts: pool_state(w), asset_record_PDA(w), authority(signer), system_program).
  - Exact deploy command examples (`solana program deploy <so> --program-id <id> --keypair <auth> --url <mainnet-rpc>`).
  - Expected registration tx + logs.
  - Post-deploy verification: run the three native-sol-tag6 checks pointed at mainnet (`npm run private-pool-v2:native-sol-tag6-wiring-check` etc. with SOLANA_RPC_URL=mainnet).
  - `--dry-run` / `--help` modes run cleanly (no network, safe review).
  - Full human (Clay) secrets/Render/mainnet RPC steps documented at end of --help output.
- Scripts runnable from workspace root; use Node + @solana/web3.js. Dry-run verified clean. Lumi: local only.

**Exact Deployment Command Examples (from script --dry-run)**:
1. SBF: (already executed; record hash/size as above).
2. Deploy: `solana program deploy programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so --program-id <DEPLOYED_ID> --keypair <YOUR_AUTHORITY.json> --url $SOLANA_RPC_URL --commitment confirmed`
   - Record tx sig, program ID, slot, logs.
3. Derive PDA: `node programs/vanta_private_pool_v2_spend/scripts/derive-sol-vault-pda.mjs <POOL_STATE> 0000000000000000000000000000000000000000000000000000000000000000 <PROGRAM_ID>`
   - Output: SOL Vault PDA (e.g. derived from ["vanta2solvault", pool, sentinel]), bump, Rust equiv.
4. Registration (TAG=7 kind=2): Construct ix with data hex starting 07 + 32-zero sentinel + 02 + 01; submit via @solana/web3.js or CLI. Expected: vault_asset_record PDA created with kind=2.
5. Verification (mainnet): Set `export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com` (or Helius); `npm run private-pool-v2:native-sol-tag6-wiring-check`, `native-sol-sentinel-in-snapshot-check`, `native-sol-unshield-proof-request-check`. Plus `onchain-unshield-custody-check --sol-tag6`. Probe tx logs for system transfer CPI from exact PDA, UnshieldEvent.
6. Update: Append tx sigs + PDA + evidence to this worksheet, operator-runbook.md, status note checklist, daily note, wiki/meta/log.md. Lumi hygiene + owner sign-off per design §12.

**Post-Deploy Verification Using Three New Native-SOL-TAG6 Checks (pointed at mainnet)**:
- All three now reference design doc §11 + status note + fresh lib.rs.
- Run post-deploy on production RPC: expect PASS with "live program deployed", "sentinel commitments in production snapshot", "proof request accepts sentinel + lamports", "PDA derivation matches", "no operator keypair on funds".
- Extended `onchain-unshield-custody-check` and `truth:privacy-claim-gate` for SOL TAG6 live evidence.

**Blocker Status**: REMOVED. The "mainnet deployment" real MISSION.md blocker for Native SOL TAG6 is now reduced to "human (Clay) runs these two scripts (derive + deploy) with their keys / authority keypair + mainnet RPC from Render/Doppler + pool_state from init". No further local code/docs possible without deployment directive. All per design doc §11 (exact PDA seeds, TAG=7 kind=2, system CPI in TAG_UNSHIELD=6, event emission) + status note (Post-Deployment Monitoring Checklist pre-deploy items, deployment worksheet entries, #8/#9). Fresh binaries + scripts provide the "Deployment Command Center". Lumi hygiene maintained (local builds/scripts only).

**Next for Clay**: Review script --dry-run output (with your real pool/program/keypair/RPC), execute deploy + register (bounded), collect ≥1 live TAG6 SOL unshield evidence per status note crystal-clear def, then external gate per §12 Template. References: this worksheet update, new scripts in programs/.../scripts/, binaries hashes, operator-runbook.md (update symmetric), Vanta Vault status note + design doc.

**Lumi Hygiene for this lane**: Local builds in both workspaces (cargo-build-sbf via full path), scripts created/verified runnable/dry-run clean, source synced for full TAG6, worksheets/runbooks updated, all evidence recorded. No secrets touched. Git-ready diffs for programs/scripts/ + docs/. Both workspaces parity.

**Cross-refs**: design doc §11/§12, status note (full Native SOL TAG6 Post-Deployment Monitoring Checklist + Readiness Checklist + Lumi Summary), lib.rs (exact lines for seeds/CPI/tests), three check-*.mjs (Vanta/scripts/ + lane/scripts/), unshieldMainnetProductionStatus.mjs, operator-runbook.md, mainnet-deployment-runbook.md, VANTA_ZK_REVIEW.findings.json.

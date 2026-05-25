# PPA-DISCOVERY-002 - Legacy V1 Send Memo Migration

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 6 - recipient discovery
- Recommended remediation order: 20
- Item: Force-migrate legacy v1 memos

## Status

`implemented-verified-local`

This is the Band 6 item after `PPA-DISCOVERY-001`. The current repo already quarantines legacy v1 plaintext memo history and keeps it outside production privacy claims, but the production audit calls out that quarantine alone does not back-migrate historical v1 Send memos.

## Current Repo Truth

- `src/solana/vantaShieldState.ts` parses legacy `vanta:send-note:v1:` memos as `legacy-v1-plaintext-history` and marks them ineligible for production privacy scope.
- `getVantaLegacyV1MemoQuarantinePolicy()` keeps all legacy v1 action memo prefixes parse-compatible but excluded from production privacy, anonymity, proof-verified, and mainnet-private claims unless migrated or segregated with reviewed evidence.
- Fresh Send memo builders already require v2 viewing-key AEAD and fail closed without viewing-key material.
- `PPA-DISCOVERY-001` added a local view-tag prefix pull endpoint, but production recipient discovery still lacks deployed service, retention/log-redaction, anonymous/public read posture, reviewer acceptance, and legacy v1 migration/segregation evidence.

## Planned Files

- `src/solana/vantaShieldState.ts`
- `src/readiness/sendMainnetProductionStatus.mjs`
- `scripts/print-vanta-protocol-trust-packet.mjs`
- `scripts/check-vanta-send-discovery-migration-policy.mjs`
- `scripts/check-vanta-legacy-v1-memo-quarantine.mjs`
- `scripts/check-vanta-legacy-v1-send-memo-migration.mjs`
- `package.json`
- `PRODUCTION_PRIVACY_AUDIT.md`
- `SECURITY_LIMITATIONS.md`
- `docs/threat-model.md`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-discovery-002-legacy-v1-send-memo-migration-plan.md`

## Planned Design

1. Add a red-first `npm run actions:legacy-v1-send-memo-migration-check`; current red-first evidence is `Missing script: "actions:legacy-v1-send-memo-migration-check"`.
2. Add a local one-time migration packet helper for legacy v1 Send memos that:
   - accepts only parse-compatible `vanta:send-note:v1:` Send history,
   - requires recipient viewing-key material and change viewing-key material when change exists,
   - re-encrypts eligible history into v2 viewing-key AEAD recipient/change discovery memos using the existing dual-AEAD helper,
   - emits only ciphertext body hashes, encrypted view tags, migrated refs, and review metadata,
   - marks source v1 history as migrated-or-segregated evidence pending rather than production-private.
3. Add a segregation result for unsafe or incomplete migration cases, such as missing viewing-key material, malformed legacy payloads, or non-Send legacy prefixes.
4. Keep on-chain history truth explicit: historical plaintext memos cannot be rewritten; the helper creates reviewed local migration packets and/or segregation records only.
5. Keep Send status, trust packet, threat model, and security limitations fail-closed until reviewed migration or segregation evidence exists alongside deployed recipient discovery and reviewer acceptance.

## Planned Fixtures

- Red-first: `npm run actions:legacy-v1-send-memo-migration-check` fails before the package script and helper markers exist.
- Eligible v1 Send memo with recipient/change viewing keys returns a v2 migration packet with recipient/change ciphertext body hashes and encrypted view-tag handoff metadata.
- Missing recipient viewing key returns a segregation-required result and does not emit a v2 packet.
- Missing change viewing key when `changeAmount > 0` returns a segregation-required result and does not emit a partial migration.
- Fresh v2 Send memo is not re-migrated.
- Malformed legacy v1 memo is segregated, not promoted.
- Status/trust surfaces keep `productionReady=false`, `privacyClaimAllowed=false`, `legacyV1EligibleForProductionPrivacyClaims=false`, and `reviewedMigrationOrSegregationEvidence=false`.

## Planned Script

- `npm run actions:legacy-v1-send-memo-migration-check`

The script will be wired into:

- `npm run actions:memo-encryption-check`
- `npm run truth:privacy-claim-gate`
- `npm run zk:feedback-loop-check`
- `npm run send:discovery-migration-policy-check` coverage expectations

## Delivered

- Added `createLegacyV1SendMemoMigrationPacket` in `src/solana/vantaShieldState.ts`.
- Eligible parse-compatible legacy v1 Send memos can produce sanitized v2 recipient/change discovery metadata when recipient and change viewing-key material is present.
- Missing recipient viewing-key material, missing change viewing-key material for nonzero change, malformed legacy payloads, fresh v2 memos, and non-Send memos produce not-applicable or segregation-required results instead of claim promotion.
- Send production status, the Send trust packet, lane trust contract copy, security limitations, threat model, and tracker state now keep reviewed legacy v1 migration/segregation evidence as an explicit blocker.
- The implementation does not rewrite historical on-chain memos, deploy recipient discovery, or lift production privacy claims.

## Verification After Approval

- `npm run actions:legacy-v1-send-memo-migration-check`
- `npm run actions:legacy-v1-memo-quarantine-check`
- `npm run actions:memo-encryption-check`
- `npm run send:discovery-migration-policy-check`
- `npm run send:direct-viewing-key-exchange-check`
- `npm run indexer:view-tag-pull-check`
- `npm run truth:privacy-claim-gate`
- `npm run privacy-audit:tracker-check`
- `npm run build`
- `git diff --check`

## Verified Evidence

- 2026-05-25: `npm run actions:legacy-v1-send-memo-migration-check`: PASS
- 2026-05-25: `npm run actions:legacy-v1-memo-quarantine-check`: PASS
- 2026-05-25: `npm run mainnet:send-production-check`: PASS
- 2026-05-25: `npm run actions:memo-encryption-check`: PASS
- 2026-05-25: `npm run send:discovery-migration-policy-check`: PASS
- 2026-05-25: `npm run send:trust-packet-check`: PASS
- 2026-05-25: `npm run lanes:trust-contract-check`: PASS
- 2026-05-25: `npm run send:direct-viewing-key-exchange-check`: PASS
- 2026-05-25: `npm run indexer:view-tag-pull-check`: PASS
- 2026-05-25: `npm run security:limitations-check`: PASS
- 2026-05-25: `npm run privacy-audit:tracker-check`: PASS
- 2026-05-25: `npm run truth:privacy-claim-gate`: PASS
- 2026-05-25: `npm run docs:source-of-truth-check`: PASS after aligning the guard to the threat-model 2026-05-25 validation marker
- 2026-05-25: `npm run build`: PASS
- 2026-05-25: `git diff --check`: PASS

## Truth Boundary

This implemented slice is local migration/segregation tooling and executable claim-boundary guards. It does not rewrite historical on-chain memos, deploy recipient discovery, provide query privacy, prove anonymity, provide reviewer acceptance, or make Send production-private/mainnet-ready.

## Lumi

- Local: local migration/segregation tooling, guard, docs, and tracker updates are implemented in the working tree.
- Committed: not committed.
- Pushed: not pushed.
- Deployed/live: not deployed/live.

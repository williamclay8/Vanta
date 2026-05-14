# R12 Legacy V1 Memo Quarantine - 2026-05-14

Status: local implemented.

## What Changed

- Added `getVantaLegacyV1MemoQuarantinePolicy()` in `src/solana/vantaShieldState.ts`.
- Added `npm run actions:legacy-v1-memo-quarantine-check` through `scripts/check-vanta-legacy-v1-memo-quarantine.mjs`.
- Wired the guard into `actions:memo-encryption-check`, `truth:privacy-claim-gate`, and `zk:feedback-loop-check`.
- Updated `docs/threat-model.md` with the explicit legacy v1 plaintext memo quarantine boundary.

## Boundary

Legacy v1 plaintext memo chain history remains parse-compatible history only. It is not migrated, not production-ready, not eligible for production privacy claims, and excluded from production privacy, anonymity, proof-verified, and mainnet-private claims unless migrated or segregated with reviewed evidence.

This slice does not remove v1 parsing and does not rewrite historical chain data. Fresh action memo builders still emit v2 AEAD memo prefixes and require viewing-key material where action memo encryption is required.

## Verification

- `npm run actions:legacy-v1-memo-quarantine-check`
- `npm run actions:memo-encryption-check`
- `npm run send:discovery-migration-policy-check`
- `npm run send:production-privacy-claim-gate`
- `npm run privacy-audit:tracker-check`

This is a quarantine and claim-boundary closure only. It is not memo migration, not recipient discovery deployment, not production privacy, and not live deployment evidence.

# Full Codebase + Website Audit Receipt

Date: 2026-05-20

## Result

Completed a local Full Blast audit pass over the Grok kanban / Claude audit work, the current dirty tree, the protocol/operator boundary, and website beta-truth surfaces.

## Accepted From Claude/Grok

- Kept the fail-closed cleanup direction: removed broken/overclaiming client proving and public indexer artifacts, stale production signoff docs, and related scripts.
- Kept the public audit-manifest direction and tightened checks so unsupported claim fields stay explicit.
- Kept Helius/provider exposure cleanup direction and made the browser bundle ignore paid/provider RPC env names.

## Additional Fixes Applied

- Fixed TAG6 native SOL zero-sentinel handling so `exit_asset_id == 0x00..00` is valid only for `VAULT_ASSET_KIND_SOL`, while zero nullifier, amount, public input hash, and SPL zero asset ids are rejected.
- Rebuilt the private-core source artifact verifier around Poseidon note commitment, Merkle leaf, and source nullifier derivations instead of stale SHA derivations.
- Tightened Home, Manifesto, Send, Swap, and Unshield copy to beta-safe, receipt/status-oriented language.
- Added/rewired TAG6 evidence wrapper scripts and refreshed deterministic Noir valid fixtures produced by the canonical proof/check writers.

## Verification

- `npm run private-core:verify` passed.
- `npm run build` passed.
- `npm run public:audit-discovery-check` passed.
- `npm run solana:helius-rpc-config-check` passed.
- `npm run public:manifesto-check` passed.
- `npm run security:limitations-check` passed.
- `npm run audit:package-check` passed.
- `npm run privacy-audit:tracker-check` passed.
- `npm run frontend:operator-env-exposure-check` passed.
- `npm run truth:privacy-claim-gate` passed.
- `npm run private-pool-v2:tag6-full-predeploy-checklist -- --json` passed.
- `npm run private-pool-v2:sbf-abi-check` passed after rebuilding the local SBF artifact.
- `npm run private-pool-v2:crucible-check` passed.
- `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml` passed.
- `git diff --check` and `git diff --cached --check` passed.
- Built asset scan for `yoko-lx0bix`, `helius-rpc.com`, and `api-key` returned no matches.

## Lumi Status

- Local: yes, dirty tree contains staged Claude/Grok changes plus unstaged audit fixes.
- Committed: no.
- Pushed: no.
- Deployed/live: no.

## Remaining Truth

- This is a verified local audit receipt, not a production-readiness or mainnet-readiness claim.
- H08 still reports `blocked-no-production-prover-runtime-evidence`.
- ZK review ledger still reports `liveVerifiedCount: 0`.
- The local SBF artifact was rebuilt and ABI-checked, but it was not deployed.

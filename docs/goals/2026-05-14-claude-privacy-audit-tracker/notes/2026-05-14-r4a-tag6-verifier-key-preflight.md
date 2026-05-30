# R4A TAG_UNSHIELD verifier-key preflight

Date: 2026-05-14

## Decision

Use the next local, additive hardening seam in the audit backlog: bind the reserved `TAG_UNSHIELD = 6` source preflight to a registered verifier-key record before any future release path can pass vault/nullifier checks. This keeps the release lane fail-closed while making the future proof-verified ABI shape more explicit.

## Local implementation

- `TAG_UNSHIELD` instruction data is now a 569-byte shape (569-byte reserved SPL proof-verified release ABI):
  `[6, nullifier:32, acceptedRoot:32, exitDestination:32, exitAssetId:32, exitAmountLeU64:8, publicInputHash:32, verifierKeyHash:32, gnarkProof:324, gnarkPublicWitness:44]`.
- The source rejects the legacy 457-byte / 256-byte-proof-only payload shape and all-zero `verifierKeyHash`.
- The reserved SPL account list now includes read-only `verifier_program`, writable `relayer`, and read-only `system_program` after the verifier-key PDA.
- The verifier-key PDA must match `["vanta2vkey", pool_state, verifierKeyHash]` and the program-owned registry record created or verified by `TAG_REGISTER_VERIFIER_KEY = 5`.
- Source now separates tag `6` preflight, default adapter rejection, and a verified-commit helper; host-side adapter returns `ERR_PROOF_VERIFIER_NOT_WIRED` before nullifier consume or SPL CPI, and commit remains `ERR_UNSHIELD_RELEASE_NOT_WIRED` while `releaseEnabled = 0`.
- Truth/status surfaces now expose `sourceOnlyVerifierKeyPreflightReady: true` while keeping production custody/readiness false.

## What this proves

This proves only a local source/SBF ABI preflight shape: malformed or unregistered verifier-key metadata cannot glide through the reserved Unshield release preflight before the intentionally unwired release boundary.

## What this does not prove

This is not proof verification, not a production verifying key, not nullifier consume, not token/system CPI, not program-owned custody, not proof-verified Unshield release, not deployed/live bytecode evidence, not audit acceptance, and not production privacy.

## Verification

- `cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`
- `npm run private-pool-v2:onchain-unshield-custody-check`
- `npm run private-pool-v2:sbf-abi-check`
- `npm run private-pool-v2:crucible-check`
- `npm run private-pool-v2:root-provenance-check`
- `npm run private-pool-v2:contract-check`
- `npm run lanes:trust-contract-check`
- `npm run unshield:trust-packet-check`
- `npm run mainnet:unshield-production-status-check`
- **TAG6 toolkit for §12 gates (pre-deploy + live evidence per design §12 + status note Post-Deployment Monitoring Checklist)**: `npm run private-pool-v2:tag6-full-predeploy-checklist` (master: scripts/native-sol-tag6/run-tag6-full-predeploy-checklist.mjs), `npm run private-pool-v2:native-sol-tag6-full-verify` (verifier: scripts/verify-full-tag6-release-evidence.mjs), probe/scanner/generator as registered in package.json; see blocker map R6A/A1-TAG6 Post-Deployment Phase for exact paths + evidence bundles in scripts/native-sol-tag6/examples/
- `npm run privacy-audit:tracker-check`

## Lumi hygiene

- Local: implemented in source, docs, status surfaces, and guards. **TAG6 toolkit (scripts/native-sol-tag6/run-tag6-full-predeploy-checklist.mjs master checklist + verifier/probe/scanner/generator) now canonical for §12 gates in audit surfaces (blocker map, tracker state/completion-audit/R notes, findings.json, unshieldMainnetProductionStatus.mjs + unshieldTrustContract.ts nativeSol* + monitoringRefs/visibleStatusCopy updated to point to toolkit paths)**.
- Committed: `7635c9b` (`Add TAG_UNSHIELD verifier key preflight`).
- Pushed: `7635c9b641a505379b82e74a6679986dbabc55fe` is on `origin/codex/vanta-zk-review-hardening` and `origin/main`.
- Deployed/live: website/audit-copy surfaces are live on `https://vantaprivacy.xyz` through Render deploy `dep-d834ce4vikkc73fb2ep0`; the spend program SBF bytecode is not redeployed/live-verified, so this remains source/local-SBF preflight evidence only. Note implications for public/.well-known/vanta-audit.json (TAG6 toolkit as official §12 implementation).

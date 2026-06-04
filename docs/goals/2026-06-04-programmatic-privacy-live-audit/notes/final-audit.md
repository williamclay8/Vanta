# Programmatic Privacy and Live Website Audit - 2026-06-04

Scope: full-codebase and live-website audit focused on what is required before website actions can be honestly described as fully programmatically private and live.

## Current conclusion

Vanta is not fully programmatically private on the live webpage today.

The repo has strong local proof, operator, receipt, and fail-closed readiness surfaces. The live website is reachable and exposes beta truth in the meta description, public audit manifest, and proof route. However, production privacy claims remain blocked because there is no accepted production verifier/on-chain proof enforcement, no live shared anonymity set, no active bounded real-funds approval window, no live proof-verified private settlement evidence, and the live landing bundle still serves stale overbroad copy.

## Live website observations

- `https://vantaprivacy.xyz/` returned HTTP 200 on 2026-06-04.
- The live HTML served `/assets/index-CY3LzZVB.js` and route bundle `/assets/renderApp-CDM6GOiU.js`.
- The live public audit manifest at `https://vantaprivacy.xyz/.well-known/vanta-audit.json` returned HTTP 200 and reports:
  - `productionReady: false`
  - `mainnetReady: false`
  - `privacyClaimAllowed: false`
  - `anonymityClaimAllowed: false`
  - `liveDeploymentVerified: false`
  - `currentDistinctCommitments: 2`
  - `minimumDistinctCommitments: 1024`
- The live manifest attests commit `bf3ee40a034e0bbb3550c07532b6c96bddfcc7dc` and asset `assets/index-C0Eqol52.js`, but the live HTML serves `assets/index-CY3LzZVB.js`. Treat website deployment evidence as stale until re-attested after deploy.
- The live proof route bundle keeps lane claim locks and explicitly says production privacy is not enabled.
- The live home route bundle still contains old copy: "No one watching.", "private balance", and Pay "Settle privately." Local source was tightened in this audit, but this is not live until committed, pushed, deployed, and re-verified.

## Local audit changes made

- Tightened landing copy in `src/pages/HomePage.tsx` to shield-first and shielded-state language.
- Fixed checker source maps for moved UI surfaces across Send, Swap, Unshield, approval sheet, recovery, message-intent, transaction truth, and transaction evidence guards.
- Fixed `security:limitations-check` to match the current `SECURITY_LIMITATIONS.md` validation date.
- Strengthened the Private Pool v2 TAG6 fail-closed Rust test so the verifier-wired-zero path asserts no marker data, vault, or destination mutation before returning error `15`.
- Fixed Unshield viewing-secret typing so split follow-up recovery options pass the hex viewing secret key instead of a byte array.

## Verification run

Passed:

- `npm run mainnet:preflight` under escalation for network and localhost evidence probes.
- `npm run truth:privacy-claim-gate`.
- `npm run private-pool-v2:status-json` with `productionReady: false`, `privacyClaimAllowed: false`, and all current verified privacy flags false.
- `cargo test unshield_sol_verifier_wired --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml`.
- Live HTTP checks for `https://vantaprivacy.xyz/`, `/app`, `/app/proof`, and `/.well-known/vanta-audit.json`.

Failed:

- `npm run private-pool-v2:verify` still fails in `zk:c01-local-proof-format-evidence-check` because `nargo compile` cannot resolve `use ::poseidon::poseidon::bn254;` in `src/main.nr`. This preserves the C01 proof-format/verifier blocker.

## Required work before website actions are fully programmatically private and live

1. Fix C01 proof-format/toolchain compatibility and select an accepted production verifier backend.
2. Wire on-chain verifier enforcement for the actual production proof format, including verifying-key hash evidence and invalid/wrong-key no-mutation tests.
3. Promote `TAG_SHIELD` and `TAG_UNSHIELD` only after verifier/root/nullifier acceptance exists; keep `verifier_wired` without a live setter until then.
4. Replace local/mock or offchain-only proof acceptance with deployed prover/verifier services and receipts that bind accepted public inputs without raw private witness exposure.
5. Deploy durable indexer/relayer/operator storage with replay/nullifier uniqueness, safe logs, observability, rate limits, backups, and restore evidence.
6. Build a live shared anonymity set meeting the current threshold, then re-run and publish anonymity evidence.
7. Prove live mainnet private settlement with relayer-submitted transaction refs and replay rejection evidence inside a fresh bounded approval window.
8. Deploy the local landing-copy fixes, re-attest the website bundle and public audit manifest, and verify the live app route bundles no longer contain overbroad privacy copy.
9. Keep production/private claims locked until the public manifest, proof route, JSON status surfaces, operator receipts, and live webpage all report the same evidence-backed state.

## Lumi status

These audit fixes are local only. They are not committed, pushed, or deployed/live. The live website still serves the older bundle and must not be treated as updated until Render deployment and live bundle verification are complete.

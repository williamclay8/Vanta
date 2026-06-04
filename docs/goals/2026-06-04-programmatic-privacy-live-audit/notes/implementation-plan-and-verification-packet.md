# Programmatic Privacy Live Audit - Implementation Plan And Verification Packet

Generated: 2026-06-04T19:08:56Z

## Current Truth

Vanta is still not production-private and not live-private. The local proof/operator/readiness surfaces are stronger after this pass, but production privacy remains blocked by accepted production verifier evidence, on-chain proof/root/nullifier enforcement, live shared anonymity-set evidence, live mainnet private-settlement evidence, and a fresh bounded real-funds approval window.

The live website is also still stale as of this packet. The deployed homepage route serves a bundle containing overbroad copy, while the local source and local build have been tightened.

## Execution Plan

1. Public truth first.
   - Keep beta-truthful local landing copy.
   - Deploy the corrected static bundle.
   - Re-attest `public/.well-known/vanta-audit.json` only after the live homepage, `/app`, `/app/proof`, and manifest all match the deployed bundle state.

2. C01 toolchain/proof lane.
   - Use Nargo `1.0.0-beta.19` for the current circuit verification lane.
   - Preserve beta18-compatible `dep::poseidon::poseidon::bn254` imports until the migration lane is deliberately moved to the beta19 native `::poseidon` import path.
   - Keep the local unsafe verifier adapter labelled non-production.

3. Production verifier path.
   - Do not expose a live `verifier_wired` setter yet.
   - Require accepted production proof format, verifying-key hash evidence, valid mutation evidence, invalid/wrong-input no-mutation evidence, and wrong-key no-mutation evidence before lifting C01.

4. On-chain enforcement.
   - Keep `TAG_SHIELD` and `TAG_UNSHIELD` fail-closed until verifier/root/nullifier acceptance is wired and reviewed.
   - Preserve no-nullifier-consume, no-release, and no-marker-mutation checks before verifier acceptance.

5. Production services and live evidence.
   - Require durable indexer/relayer/operator stores, replay/nullifier uniqueness, safe logs, observability, backups, restore evidence, relayer-submitted tx refs, and fresh bounded approval before any live fund movement.

## Local Fixes

- Tightened `src/pages/HomePage.tsx` to remove stale landing overclaims such as private-balance language and broad private-settlement framing.
- Added `scripts/check-vanta-live-website-truth.mjs` plus package scripts for live website truth/deployment matching.
- Unblocked the C01 local proof lane with Nargo `1.0.0-beta.19` while retaining beta18-compatible Poseidon imports.
- Updated C01 source hashes, evidence markers, and docs/scripts to reflect the current circuit source hash.
- Corrected local unsafe verifier evidence to avoid claiming the optional wrong-verifying-key leg ran when the transient wrong verifier SBF is absent.
- Rebuilt the local spend SBF and updated expected SBF lineage hashes.

## Verification Packet

Passed:

- `nargo --version` -> `nargo version = 1.0.0-beta.19`.
- `npm run zk:c01-local-proof-format-evidence-check`.
- `npm run private-pool-v2:c01-local-unsafe-h6-verifier-cpi-acceptance-check`.
  - Note: valid mutation / invalid proof / wrong public input / wrong verifier executable no-mutation coverage passed.
  - Note: optional wrong-verifying-key leg was skipped because `/private/tmp/vanta-c01-sunspot-lane/work/beta18-circuit/target/vanta_private_pool_v2_actual_private_spend_entry.so` was absent.
- `npm run private-pool-v2:sbf-abi-check`.
  - Fresh SBF hash: `sha256:ff128d4a8169c95a67cf25cd895d8b328cff4607704ee0dc3d57276f10bca91d`.
- `npm run private-pool-v2:verify`.
- `npm run mainnet:preflight`.
  - Required localhost/browser checks were run outside the network sandbox after the sandboxed run failed to observe its own Vite server.
- `npm run truth:privacy-claim-gate`.
  - `privacyClaimsAllowed:false`.
  - `unguardedClaimCount:0`.
  - `mainnetReady:false`.
  - `productionReady:false`.
- `npm run private-pool-v2:status-json`.
  - `productionReady:false`.
  - `privacyClaimAllowed:false`.
  - `productionPrivateReady:false`.

Failed / still blocked:

- `npm run public:live-website-truth-check`.
  - Failure: live `/assets/HomePage-DiTajxPu.js` still contains `No one watching`.
  - Live deployment is therefore not re-attested.

## Remaining Blockers

- No accepted production verifier/on-chain proof enforcement.
- No production wrong-verifying-key no-mutation evidence in the accepted verifier path.
- No live shared anonymity set; public manifest still reports `currentDistinctCommitments: 2` below `minimumDistinctCommitments: 1024`.
- No active bounded real-funds approval window.
- Live website deployment drift remains: live bundle is stale and the public manifest remains `liveDeploymentVerified:false`.
- No live deployment receipt from this pass; Render workspace selection was not performed.

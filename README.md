# Vanta

**Shield first. Move privately.**

Vanta is a shield-first beta privacy app for supported Solana assets.

The simple version:

- Normal Solana wallets are public.
- Vanta lets supported assets move into a more private Vanta area through Shield.
- From there, the app exposes constrained private-core lanes: Send, Swap, and Unshield.
- Additional preview lanes include Pay (merchant checkout and settlement records), Strategy (planning), Proof (trust packets), and product workbenches on `/products`.

The honest status:

- Some parts are real and verifiable today.
- Some parts are still narrow demos or previews.
- Vanta is not production-ready or mainnet-ready yet.
- Do not use this repo as an audited payment processor, custody system, or final privacy network.

If you only read one thing, read this mental model:

```text
Public Wallet -> Shield -> Private Vanta Area -> Send / Swap / Unshield
                                              -> Pay / Strategy / Proof (preview lanes)
```

---

## What Normal People Should Know

The app at `/app` is shield-first. Primary tabs are **Shield**, **Send**, **Swap**, and **Unshield**. The **More** menu adds **Pay**, **Strategy**, **Proof**, **Recovery**, and **Launch** preview surfaces.

- **Shield / Send / Swap / Unshield** are the core private-settlement lanes. They move supported assets into Vanta, act inside shielded state, and exit again when needed.
- **Pay** is one bounded merchant lane among several — a preview for payment requests, checkout modes, settlement records, and verifiable receipts. It is not the headline product.
- **Strategy**, **Proof**, **`/products`**, and **`/receipt/:receiptId`** are additional beta or reviewer surfaces for planning, trust packets, product workbenches, and counterparty receipt checks.

Docs at `/docs` explain the same lanes in plainer language. `/docs/portal` is a docs track name for the shield-first wallet flow — not a separate app users open instead of `/app`.

Reviewer and operator surfaces stay separate from normal user copy. They exist so claims can be checked, not so every user learns protocol vocabulary.

Vanta grows when private actions produce receipts or trust packets that counterparties can inspect — not when privacy stays abstract.

## What Works Today

Today, Vanta is a constrained development system, not a finished network.

Working or inspectable today:

- wallet connection and public balance detection
- shield flows for supported mainnet assets and shielded state inside Vanta
- constrained send, swap, and unshield paths backed by the narrow private-core operator lane
- proof and operator checks for that private-core lane, plus Private Pool v2 benchmark seams
- app tabs for Shield, Send, Swap, Unshield, Strategy preview, Proof/trust packets, recovery settings, and dashboard diagnostics
- `/products` workbench surfaces (Compliance Gateway, Private Perps Engine, Shielded RWA Tokenization, Privacy SDK marketplace, Private Velocity Intelligence) with redacted trust-packet generation
- public receipt verification at `/receipt/:receiptId`
- a `/app/pay` merchant preview lane: payment creation, checkout modes, settlement records, refunds, withdrawals, reconciliation, receipt preview, and beta/no-funds disclosure — verifiable through Pay commands, but still preview-only
- repo-local proof-artifact handoff checks that reject relabelled local metadata and remote verifier receipt transcript drift without claiming a live proof service
- verification commands that keep the repo honest about what is still unfinished

Still not live or final:

- audited production privacy
- broad multi-asset support
- final proof and nullifier architecture
- production Pay processor semantics
- live autonomous Strategy execution
- mainnet private settlement
- production custody, compliance, and incident-response guarantees

Vanta is not production-ready until it has real mainnet-compatible private settlement, audited proof/circuit boundaries, persistent operator/indexer/relayer services, secure key/secret handling, replay/nullifier protection, browser-verified UX, production deployment docs, and a truthful security limitations page.

## Pricing

- `0 monthly fee`
- `0.25%` only when Pay, Shield, Send, Swap, or Unshield completes successfully
- network, off-ramp, and third-party execution costs stay separate when they apply

Pricing only applies when Vanta is actually providing a completed Pay, Shield, Send, Swap, or Unshield action. Preview-only surfaces must not imply a fee is already active.

Net Vanta-collected fees are reserved for ecosystem growth, including supply buybacks, marketing, operator infrastructure, security, and product development. This excludes network, off-ramp, and third-party pass-through costs.

## Important Privacy Clarification

Shielding does not make an ordinary wallet magically private.

It means supported assets leave the normal public-wallet flow and enter Vanta's private flow. Privacy claims only start there, and only for the specific lanes Vanta currently supports.

## Where To Start

- App shell (Shield first): `/app` → `/app/shield`
- Product docs: `/docs` (shield-first wallet flow at `/docs/portal`; Pay docs at `/docs/pay`)
- Product workbenches: `/products`
- Merchant Pay preview: `/app/pay`
- Trust and receipt checks: `/app/proof`, `/receipt/:receiptId`
- Security limits: `SECURITY_LIMITATIONS.md`
- Audit handoff: `docs/audit-package.md`
- Operator runbook: `docs/operator-runbook.md`

The detailed command lists below are for engineers and reviewers.

---

## Stack

- Vite
- React 18
- TypeScript
- React Router
- custom CSS design system

---

## Routes

- `/` marketing homepage
- `/manifesto`
- `/products` and `/products/:productSlug`
- `/docs`, `/docs/portal`, `/docs/pay`, `/docs/trust`, `/docs/security`, `/docs/roadmap`
- `/app` app shell (defaults to Shield)
- `/app/dashboard`
- `/app/shield`, `/app/send`, `/app/swap`, `/app/unshield` (primary tabs)
- `/app/pay`, `/app/strategy`, `/app/proof`, `/app/launch` (More menu / preview lanes)
- `/app/settings/recovery`, `/app/privacy-review`, `/app/actual-private-settlement`
- `/receipt/:receiptId`

---

## Project structure

```text
.
├── index.html
├── package.json
├── src
│ ├── App.tsx
│ ├── components
│ ├── context
│ ├── data
│ ├── main.tsx
│ ├── pages
│ └── styles.css
├── tsconfig.app.json
├── tsconfig.json
└── vite.config.ts
```

---

## Local development

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

---

## Build

```bash
npm run build
npm run preview
```

## Reviewer proof points

If you need the shortest honest command set for a reviewer, operator, or design partner, use:

```bash
npm run build
npm run protocol:browser-check
npm run private-core:demo-preflight
npm run pay:verify
npm run truth:transaction-check
npm run mainnet:transaction-evidence-check
npm run mainnet:readiness-check
```

These commands prove the current app compiles, primary and preview user surfaces render, the private-core proof lane is demo-ready, Pay preview contracts stay aligned with trust surfaces where implemented, transaction language is bounded by current implementation truth, and the repo is still honest about not being production-ready yet.

`Transaction Evidence v0.1` is a reviewer-facing trace for current mainnet, local, preview, and operator-harness flows. It can name transaction summaries, simulation/approval requirements, signatures or operator request ids when present, confirmation status when present, and proof/root/nullifier or settlement receipt linkage when present. It is not mainnet finality, audit approval, custody proof, live privacy proof, or production settlement.

## Private Core verification

```bash
npm run mainnet:readiness
npm run mainnet:readiness-json
npm run mainnet:preflight
npm run mainnet:readiness-check
npm run mainnet:external-gates-check
npm run mainnet:service-contract-check
npm run mainnet:service-topology-check
npm run mainnet:service-deployment-status
npm run mainnet:service-deployment-evidence-check
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run mainnet:backup-restore-check
npm run storage:adapter-check
npm run mainnet:abuse-observability-check
npm run mainnet:abuse-observability-status
npm run mainnet:abuse-observability-runtime-status
npm run mainnet:abuse-observability-evidence-check
npm run ops:rate-limit-check
npm run ops:safe-telemetry-check
npm run mainnet:observability-sink-check
npm run nullifier:replay-guard-check
npm run mainnet:deployment-manifest-check
npm run mainnet:private-rail-route-status-check
npm run mainnet:private-rail-route-health
npm run mainnet:private-rail-route-health-auth
npm run mainnet:private-rail-route-health-evidence-check
npm run mainnet:wallet-signing-status
npm run mainnet:wallet-production-browser-check
npm run mainnet:wallet-signing-evidence-check
npm run wallet:signing-safety-check
npm run wallet:transaction-safety-check
npm run wallet:backed-simulation-check
npm run wallet:message-intent-safety-check
npm run wallet:message-intent-adoption-check
npm run umbra:wallet-adapter-gate-check
npm run umbra:operation-gate-adoption-check
npm run umbra:operation-summary-check
npm run umbra:operation-client-summary-gate-check
npm run umbra:operation-summary-builders-check
npm run umbra:operation-summary-display-check
npm run umbra:benchmark-approval-samples-check
npm run umbra:approval-review-page-check
npm run umbra:approval-review-page-browser-check
npm run umbra:shield-action-review-check
npm run umbra:unshield-action-review-check
npm run wallet:live-send-inventory-check
npm run wallet:safe-send-boundary-check
npm run wallet:safe-send-hook-check
npm run shield:safe-send-adoption-check
npm run send:safe-send-adoption-check
npm run swap:safe-send-adoption-check
npm run unshield:safe-send-adoption-check
npm run mainnet:secret-handling-check
npm run audit:package-check
npm run private-core:check
npm run private-core:send-check
npm run private-core:swap-check
npm run private-core:send-apply-check
npm run private-core:swap-apply-check
npm run private-core:send-continuity-check
npm run private-core:send-recipient-check
npm run private-core:send-chain-check
npm run private-core:send-roundtrip-check
npm run private-core:send-unshield-roundtrip-check
npm run private-core:send-change-unshield-check
npm run private-core:send-chain-unshield-check
npm run private-core:send-chain-http-smoke
npm run private-core:restart-check
npm run private-core:send-chain-restart-check
npm run private-core:send-unshield-restart-check
npm run private-core:send-change-unshield-restart-check
npm run private-core:send-chain-unshield-restart-check
npm run private-core:prove
npm run private-core:send-prove
npm run private-core:swap-prove
npm run strategy:planner-check
npm run strategy:execution-adapter-check
npm run strategy:runtime-check
npm run strategy-tab:copy-check
npm run private-core:swap-boundary-check
npm run private-core:swap-live-path-check
npm run private-core:swap-unshield-roundtrip-check
npm run private-core:contract-smoke
npm run private-core:send-http-smoke
npm run private-core:swap-http-smoke
npm run private-core:swap-transition-http-smoke
npm run private-core:swap-restart-check
npm run private-core:swap-unshield-restart-check
npm run protocol:browser-check
npm run private-core:verify
npm run private-core:demo-readiness
npm run private-core:demo-preflight
npm run private-core:operator-contract
npm run private-core:operator-status
npm run private-core:operator-snapshot
npm run private-core:operator-status-check
npm run private-core:operator-status-check-json
npm run private-core:operator-snapshot-json
npm run private-core:operator-snapshot-check
npm run private-core:operator-snapshot-check-json
npm run private-core:shipping-artifact
npm run private-core:shipping-artifact-json
npm run private-core:shipping-artifact-check
npm run private-core:shipping-artifact-check-json
npm run private-core:release-candidate
npm run private-core:release-candidate-json
npm run private-core:release-candidate-check
npm run private-core:release-candidate-check-json
npm run private-core:release-package
npm run private-core:release-package-json
npm run private-core:release-package-check
npm run private-core:release-package-check-json
npm run private-core:shipping-status
npm run private-core:shipping-check
```

These commands cover:
- fixed-depth Noir circuit regression
- fixed-depth send-circuit regression
- fixed-depth swap-circuit regression
- live held-note plus live-quote swap-path readiness and fallback regression
- in-app swap live-path truth surfaces now show:
  - ready vs blocked vs fixture fallback
  - primary blocker when blocked
  - persisted execution venue and quote reference for the last applied shared swap handoff
- source-layer send transition application and change-note recovery
- send-to-hold-to-unshield continuity after a private send
- recipient-side note recovery and spendability after a private send
- chained private-send continuity from one recipient into a second private send
- operator-backed private send roundtrip from verified send transition to recipient recovery
- operator-backed private send to recipient unshield roundtrip
- operator-backed private send to sender-change unshield roundtrip
- operator-backed chained private send to recipient unshield roundtrip
- operator-backed chained private-send continuity across two verified send transitions
- operator-backed private send now requires the current input root to be registered before transition
- operator-backed private send now requires that current input root to remain linked to its registration proof
- operator-backed private send transitions now require an explicit canonical resulting root that differs from the input root
- operator-backed send state now marks resulting roots honestly as `client-declared` until later root registration proves continuity
- downstream root registration now records whether continuity was proven through a send recipient output, a send change output, or a swap output
- operator-backed chained private-send persistence across operator restart
- operator-backed private send to recipient unshield persistence across operator restart
- operator-backed private send to sender-change unshield persistence across operator restart
- operator-backed chained private send to recipient unshield persistence across operator restart
- valid and invalid witness behavior
- local unshield proof generation and verification
- local send proof generation and verification
- local swap proof generation and verification
- operator-backed constrained swap to recipient-unshield roundtrip
- operator-backed constrained swap to recipient-unshield persistence across operator restart
- dedicated operator-contract endpoint coverage
- operator-backed send proof HTTP smoke coverage and persisted send-proof state
- operator-backed swap proof HTTP smoke coverage and persisted swap-proof state
- operator-backed proof-backed swap-transition HTTP smoke coverage and persisted swap-transition state
- swap proof and swap-transition persistence across operator restart
- operator-backed consume and HTTP smoke coverage
- operator state persistence across restart, including send-proof state
- proof-backed send-transition state persistence across restart
- replay rejection after operator restart
- operator contract and summary snapshot coherence across app, CLI, and regression surfaces
- dedicated operator shipping decision endpoint and CLI/check surfaces
- frozen operator contract surface:
  - `contractVersion = 23`
  - `summaryVersion = 47`
  - `supportedSendV1Decision = accepted-narrow-v1-path`
  - `supportedUnshieldV1Decision = accepted-narrow-v1-path`
  - `supportedReleaseV1Decision = accepted-narrow-v1-path`
  - `supportedSwapV1Decision = accepted-narrow-v1-path`
  - `supportedShippingDecisionKind = narrow-private-core-zk-v1-shipping`
  - `supportedOperatorSnapshotKind = contract-status-shipping-bundle`
  - `supportedSwapLaneKind = single-input-usdc-to-allowlisted-shielded-output`
  - `supportedSwapVenue = meteora-dlmm-mainnet-and-operator-token-output`
  - `supportedPrivateCoreCircuitFamily = vanta_private_core_single_note`
  - `supportedPrivateCoreCircuitFamilyStatus = active-v0-legacy`
  - `supportedPrivateCoreCircuitFamilyNewArchitectureStatus = deprecated-for-new-architecture`
  - `supportedPrivateCoreReplacementFamily = vanta_private_pool_v2_entry`

The `vanta_private_core_single_note_*` family is an active-v0 legacy compatibility surface for current flows, not the new architecture target; new circuit work should route through the Private Pool v2 entry family or an explicitly reviewed replacement.

## Private Pool v2 / Option B verification

```bash
npm run mainnet:preflight
npm run mainnet:external-gates-check
npm run mainnet:service-contract-check
npm run mainnet:service-topology-check
npm run mainnet:service-deployment-status
npm run mainnet:service-deployment-evidence-check
npm run mainnet:storage-contract-check
npm run mainnet:storage-migration-check
npm run mainnet:backup-restore-check
npm run storage:adapter-check
npm run mainnet:abuse-observability-check
npm run mainnet:abuse-observability-status
npm run mainnet:abuse-observability-runtime-status
npm run mainnet:abuse-observability-evidence-check
npm run ops:rate-limit-check
npm run ops:safe-telemetry-check
npm run mainnet:observability-sink-check
npm run nullifier:replay-guard-check
npm run mainnet:deployment-manifest-check
npm run mainnet:wallet-signing-status
npm run mainnet:wallet-production-browser-check
npm run mainnet:wallet-signing-evidence-check
npm run wallet:signing-safety-check
npm run wallet:transaction-safety-check
npm run wallet:backed-simulation-check
npm run wallet:message-intent-safety-check
npm run wallet:message-intent-adoption-check
npm run umbra:wallet-adapter-gate-check
npm run umbra:operation-gate-adoption-check
npm run umbra:operation-summary-check
npm run umbra:operation-client-summary-gate-check
npm run umbra:operation-summary-builders-check
npm run umbra:operation-summary-display-check
npm run umbra:benchmark-approval-samples-check
npm run umbra:approval-review-page-check
npm run umbra:approval-review-page-browser-check
npm run umbra:shield-action-review-check
npm run umbra:unshield-action-review-check
npm run wallet:live-send-inventory-check
npm run wallet:safe-send-boundary-check
npm run wallet:safe-send-hook-check
npm run shield:safe-send-adoption-check
npm run send:safe-send-adoption-check
npm run swap:safe-send-adoption-check
npm run unshield:safe-send-adoption-check
npm run mainnet:secret-handling-check
npm run audit:package-check
npm run pay-tab:copy-check
npm run pay:status
npm run pay:status-json
npm run pay:operator
npm run pay:merchant-api-check
npm run pay:production-private-rail-guard-check
npm run pay:browser-check
npm run protocol:browser-check
npm run pay:verify
npm run security:limitations-check
npm run zk:c01-local-proof-format-evidence-check
npm run private-pool-v2:contract-check
npm run private-pool-v2:root-provenance-check
npm run private-pool-v2:local-runtime-check
npm run private-pool-v2:local-bb-fixture-prover-check
npm run private-pool-v2:browser-worker-proof-result-adapter-check
npm run private-pool-v2:send-witness-prover-check
npm run private-pool-v2:proof-backend-boundary-check
npm run private-pool-v2:remote-proof-artifact-boundary-check
npm run private-pool-v2:shield-proof-request-check
npm run private-pool-v2:claim-proof-request-check
npm run private-pool-v2:send-proof-artifact-consistency-check
npm run private-pool-v2:actual-private-spend-proof-artifact-consistency-check
npm run private-pool-v2:send-operator-no-witness-check
npm run private-pool-v2:actual-private-spend-operator-no-witness-check
npm run private-pool-v2:shield-circuit-check
npm run private-pool-v2:claim-circuit-check
npm run private-pool-v2:shield-prove
npm run private-pool-v2:claim-prove
npm run private-pool-v2:status
npm run private-pool-v2:status-json
npm run private-pool-v2:operator
npm run private-pool-v2:http-smoke
npm run private-pool-v2:protocol-client-check
npm run private-pool-v2:postgres-store-check
npm run private-pool-v2:restart-check
npm run private-pool-v2:verify
```

These commands cover the current Vanta-owned Private Pool v2 benchmark lane:
- typed indexer, relayer, prover, protocol, shield proof request, and claim proof request surfaces
- a checked external-gates packet for deployed service refs, secret-manager refs, audit/legal/custody refs, monitoring refs, and explicit mainnet-funds approval refs without committing secrets
- a checked production service topology for the indexer, relayer, prover, verifier, and operator service graph, including mutual-auth edges, fail-closed policies, required storage surfaces, health endpoints, and readiness endpoints
- a checked production private-rail route-status contract that proves Pay and the production operator route through expected Private Pool v2 URL/token refs without committing token values
- a sanitized production private-rail route-health status surface that can probe public health and optionally authenticated readiness without printing token values
- a checked sanitized route-health evidence file for preserving public/authenticated route status without storing credentials
- local append-only commitment indexing and Merkle proof lookup
- local prover public-input commitment verification plus tamper rejection
- an opt-in Shield, Claim, Swap-to-shielded, actual-private-spend, and Send local bb artifact-backed proof-result adapter that returns `noir-bb` / `local-bb-fixture-artifact` for exact verified fixture transcripts binding `shield-public-input-hash`, `claim-public-input-hash`, `swap-public-input-hash`, `private-spend-public-input-hash`, or `send-public-input-hash`; Shield, Claim, Swap-to-shielded, actual-private-spend, and Send can also return `noir-bb` / `local-bb-derived-artifact` from strict local witness inputs whose derived requests bind `shield-public-input-hash`, `claim-public-input-hash`, `swap-public-input-hash`, `private-spend-public-input-hash`, or `send-public-input-hash`; actual-private-spend and Send also have dev-only browser/Web Worker proof execution plus worker-side witness generation from typed witness input, Shield has the same dev-only browser/Web Worker proof execution plus worker-side witness generation from typed witness input, Claim has dev-only Claim browser/Web Worker proof execution plus worker-side witness generation from typed Claim witness input, and Swap-to-shielded now has dev-only Swap-to-shielded browser/Web Worker proof execution plus worker-side witness generation from typed Swap-to-shielded witness input, with Shield binding `shield-public-input-hash`, Claim binding `claim-public-input-hash`, Swap-to-shielded binding `swap-public-input-hash`, actual-private-spend binding `private-spend-public-input-hash`, and Send binding `send-public-input-hash`. An opt-in browser-worker proof-result adapter can wrap those Shield, Claim, Swap-to-shielded, Send, and actual-private-spend worker artifacts into `VantaPrivatePoolV2ProofResult` values only for exact bound proof requests, requires `local-bb-derived-artifact`, and leaves the default local prover on `mock` / `local-mock`. C01 local proof-format observation records the current actual-private-spend local proof as `noir-bb` / `barretenberg-ultrahonk`, 16000 bytes, `local-acir-bytecode-hash-not-production-vk`, and mismatched with the reserved 256-byte Groth16 tag-3 target. H08 now records `selectedRuntimeDirection: remote-service-production-prover` as a local implementation direction, while `selectedProverRuntime` remains null until C01 compatibility, production proof-format/verifying-key evidence, deployed prover health, job-log/artifact refs, valid/invalid proof evidence, no-witness operator acceptance, and audit acceptance exist. These remain local no-real-funds evidence, not live Shield routing, not live Claim routing, not live Swap-to-shielded routing, not live Send or actual-private-spend routing, not production browser-runtime proving, remote proof service, on-chain verifier, production proof-format acceptance, or production proof acceptance
- local relayer claim submission plus replay rejection
- local source-only Private Pool v2 root provenance records via `TAG_REGISTER_PROVENANCED_ROOT = 4`, guarded as lineage-bound program-owned metadata for reserved proof/unshield preflights and not as proof that the root transition is correct
- the first Noir-backed shield-entry circuit with valid, invalid-binding, and invalid-root fixtures
- the first Noir-backed claim/spend circuit with valid, invalid-binding, and invalid-nullifier fixtures
- local Barretenberg UltraHonk proof generation and verification for Shield, Claim, Swap-to-shielded, Send, and actual-private-spend fixture lanes
- a local verifier/receipt registry that accepts verified shield/claim proofs, records receipts, registers claim nullifiers, and rejects replay
- human and JSON Private Pool v2 status surfaces showing local indexer, prover, relayer, verifier-registry readiness, an explicit fail-closed `productionGate`, and `productionReady: false`
- a local HTTP operator seam with status, receipt listing, proof submission, shield/claim receipt acceptance, and claim replay rejection
- deterministic legacy shield/claim shadow commitments on proof receipts and status for reviewer/audit comparison, plus a local committed-Shield boundary where the Noir circuit/fixture binds source/target/amount economics to a Poseidon commitment while operator/capability request paths carry `economics-commitment` handles and hidden-economics sentinels instead of raw proof inputs; this still does not make Shield audited, live-mainnet private, or production-ready
- operator-owned settlement endpoints for Pay checkout/withdrawal and protocol Shield/Send/Swap/Unshield settlement receipts
- optional bearer-token protection for the Private Pool v2 operator through `VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN`, plus production startup guards requiring it and either `VANTA_PRIVATE_POOL_V2_STORE_PATH` or `VANTA_PRIVATE_POOL_V2_DATABASE_URL` when `NODE_ENV=production`
- idempotent settlement endpoints that return existing Pay checkout or protocol settlement receipts for identical repeated settlement IDs, and reject conflicting replays with changed settlement inputs
- explicit settlement request validation so missing checkout/session, asset, owner, destination, or settlement identifiers fail closed before proof state changes
- typed shared settlement policy in `src/privacy/privatePoolV2SettlementPolicy.ts`, surfaced on the operator/status contract for validation, idempotency, conflict rejection, restart-safe settlement receipts, and production durable-store requirements
- machine-readable protocol action proof modes that distinguish current shield/claim circuit request coverage from local send/swap operator proof-request harnesses
- settlement fingerprints on Pay checkout, Pay withdrawal, and protocol settlement responses for auditability and replay/conflict comparison
- local operator store schema v2, including persisted settlement policy and persisted settlement fingerprints
- typed app-side operator-status, protected protocol-settlement, settlement-status, and browser-safe Shield receipt clients when the relevant Private Pool v2 endpoint is configured
- browser Shield receipts use `VITE_VANTA_PRIVATE_POOL_V2_RECEIPT_API_URL`, default production builds to the public production receipt API, require production native-SOL deposit evidence before receipt issuance, never require a browser-exposed operator bearer token, and are guarded by `npm run frontend:operator-env-exposure-check` against operator/auth-token-shaped `VITE_...` bundle exposure
- app context state for Private Pool v2 protocol settlement health without exposing protocol vocabulary to normal users
- a durable local operator store with restart-safe shield/claim receipt restoration, Pay/protocol settlement receipt restoration, shield commitment-tree restoration, and post-restart claim replay rejection
- optional Private Pool v2 Postgres JSONB snapshot persistence through `VANTA_PRIVATE_POOL_V2_DATABASE_URL`, verified by `npm run private-pool-v2:postgres-store-check`
- a checked `SECURITY_LIMITATIONS.md` surface that prevents the local benchmark from being described as audited, trustless, or mainnet-production ready

This is still a benchmark/private-pool-v2 construction lane, not a production deployed mixer. It exists to move Vanta from the Umbra comparison into a Vanta-owned privacy-core target with explicit replaceable seams.

Current staging deployment refs:

- Pay is deployed on Render as service `srv-d7j3ggqqqhas739for80` at `https://vanta-0wwi.onrender.com`.
- Pay uses `postgres-jsonb-snapshot-store` through `VANTA_PAY_DATABASE_URL`.
- Private Pool v2 is deployed on Render as service `srv-d7j4aod7vvec73ahsqlg` at `https://vanta-staging-private-pool-v2.onrender.com`.
- Private Pool v2 uses `postgres-jsonb-snapshot-store` through `VANTA_PRIVATE_POOL_V2_DATABASE_URL`.
- Secret refs are inventoried in `ops/mainnet/secret-references.manifest.json` with reference names only.
- Doppler is selected as the production secret-manager target in `ops/mainnet/production-secret-manager.template.json`; the template contains refs only and no secret values.
- The checked deployment and rollback handoff is `docs/mainnet-deployment-runbook.md`.
- The deployed operator replay-status surface is `npm run mainnet:nullifier-replay-status`. Run `npm run mainnet:nullifier-replay-status-auth` from a Doppler-backed shell when you want authenticated live operator status, and use `ops/mainnet/private-pool-v2-nullifier-replay.evidence.json` as the checked evidence file.
- That replay evidence also keeps the layered truth explicit: deployed operator reservation, verified role-service duplicate receipt/nullifier rejection, and no-real-funds production smoke replay rejection.
- Local code now makes the Postgres replay reservation boundary explicit as a transaction-backed `INSERT ... ON CONFLICT DO NOTHING RETURNING ...` path, with global nullifier uniqueness plus context-scoped idempotent request uniqueness. This hardens the operator primitive but does not by itself make Vanta mainnet-production ready.
- That replay evidence now freezes the current protocol enforcement truth as `operator-claim-preflight-plus-verifier-receipt-idempotency-plus-indexer-nullifier-registration` with the final protocol layer explicitly implemented while production readiness still remains blocked by the missing live private-settlement conditions.
- The role-service replay barrier now also has its own checked surface:
  - `npm run mainnet:role-service-replay-status`
  - `npm run mainnet:role-service-replay-evidence-check`
  - `ops/mainnet/private-pool-v2-role-service-replay.evidence.json`
- The bounded real-funds approval record now also has a live status surface:
  - `npm run mainnet:real-funds-approval-status`
  - `npm run mainnet:real-funds-approval-status-check`
  It distinguishes `approval recorded` from `approval window active now` so historical beta approvals do not get mistaken for currently active live-action permission.
- The bounded real-funds approval packet can now be refreshed through a refs-only writer instead of hand-editing JSON:
  - preview: `npm run mainnet:real-funds-approval-preview`
  - write: `npm run mainnet:real-funds-approval-write`
  Set only refs-only shell values such as `VANTA_MAINNET_APPROVAL_ACTION_REF`, `VANTA_MAINNET_APPROVAL_ACTION_SUMMARY`, `VANTA_MAINNET_APPROVAL_LAUNCH_WINDOW_REF`, `VANTA_MAINNET_APPROVAL_FEE_PAYER_REF`, `VANTA_MAINNET_APPROVAL_ROLLBACK_PLAN_REF`, `VANTA_MAINNET_APPROVAL_STOP_LOSS_PLAN_REF`, `VANTA_MAINNET_APPROVAL_MAX_FUNDS_REF`, and `VANTA_MAINNET_APPROVAL_APPROVED_BY_REF`. The writer refuses secrets, database URLs, bearer values, and malformed launch-window refs.
- Better Stack staging monitors for Pay and Private Pool v2 public `/health` endpoints are recorded in `ops/mainnet/staging-monitoring.manifest.json`.
- Pay and Private Pool v2 emit privacy-safe stdout JSON request telemetry through `src/ops/vantaSafeTelemetry.mjs`.
- Pay and Private Pool v2 now also share a privacy-safe append-only operator event sink through `src/ops/vantaOperatorEventSink.mjs`, with startup, auth rejection, and rate-limit rejection events written to `pool_operator_events` whenever a Postgres-backed operator database is configured.
- Production observability refs are templated in `ops/mainnet/production-observability.template.json` without provider tokens, webhook URLs, source tokens, or raw secrets.
- These are staging refs only; they do not clear production secret-manager, monitoring, audit, legal, custody, or mainnet-funds gates.

## Vanta Pay merchant integration

Vanta Pay is the merchant preview for test checkout and settlement records. It
helps a business understand payment requests, checkout, settlement
status, refunds, withdrawals, receipts, and reconciliation without learning the
privacy system first.

`npm run pay:verify` is the current Pay product gate. It checks the Pay status surfaces, merchant trust surface, payment approval packet, Pay tab copy contract, the local merchant API, Private Pool v2-backed settlement receipts, signed webhook delivery, browser-backed Pay navigation, security limitations, and the production build.

For the public docs route family, `npm run docs:verify` is the reviewer-facing gate. It runs the docs browser check and the build.

The merchant trust surface is documented in `docs/pay-merchant-trust-surface.md`.

The current Pay layer covers:
- commerce-only Pay tab copy with no protocol vocabulary in the merchant/buyer flow
- the real `/app/pay` tab is a merchant preview: payment creation first, then checkout modes, payment links, invoices, refunds, withdrawals, reconciliation, developer controls, route preview, receipt preview, transaction evidence, trust rail, beta/no-funds disclosure, privacy-readiness limitation, and read-only operations context
- static Pay contract check through `npm run pay:contract-check`
- human and JSON Pay status surfaces through `npm run pay:status` and `npm run pay:status-json`, including `productionReady: false`
- merchant trust status through `npm run pay:merchant-trust-status` and `npm run pay:merchant-trust-status-check`, freezing `controlled-privacy` plus `legible-trust` as the current merchant-facing trust model
- payment approval packet contract through `npm run pay:approval-packet-check`, freezing `preview -> approve -> execute -> settle` as the current Pay action boundary
- local Pay merchant API operator entrypoint through `npm run pay:operator`
- hosted checkout session creation with `client_token` and `checkout_url`
- idempotency-key support for checkout session creation, including conflict rejection for mutated retry inputs
- idempotent checkout completion retries that return the existing payment and receipt without duplicating lifecycle events
- internal privacy routes on checkout sessions
- payment completion gated by a Private Pool v2-backed private-rail receipt from `src/pay/vantaPayPrivateSettlementAdapter.ts`
- merchant-visible settlement lifecycle state exposed consistently across the adapter, merchant API status, Pay status surface, and checkout UI:
  - `lifecycleModel = preview-approve-execute-settle`
  - `refundState = merchant-visible`
  - `withdrawalState = merchant-visible`
  - `reconciliationState = merchant-visible`
- shared UI demo copy through `src/pay/vantaPayMerchantDemoContent.ts` for the real Pay page panel: `Design partner preview`, `Merchant pilot`, and `Settlement control-plane preview without protocol overhead.`
- production startup guard requiring Private Pool v2 operator settlement via `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL`
- production startup guard requiring bearer-token forwarding to the Private Pool v2 operator via `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN`
- receipt creation with selective audit-disclosure references
- balances derived only from privately settled payments
- withdrawals gated by a Private Pool v2-backed private-exit receipt, with withdrawal idempotency keys for retry-safe settlement
- payment links and invoices in the local Pay runtime
- local merchant API endpoints for checkout sessions, payments, receipts, balances, withdrawals, invoices, payment links, and webhook events
- fail-closed merchant API request validation so missing checkout, withdrawal, invoice, payment-link, or webhook-delivery fields cannot become durable `"undefined"` state
- machine-readable Pay operator status at `GET /v1/status`, including contract version, store schema version, durable-store configuration, private-settlement flags, idempotency coverage, production guard capabilities, and supported endpoints
- payment and receipt detail lookup endpoints for merchant reconciliation
- payment-link creation through the local merchant HTTP API
- refund creation/listing through the local merchant HTTP API, including refund idempotency keys, refund-adjusted balances, merchant-visible `refundedAmount` on payment details, and `payment.refunded` webhook events
- signed webhook payloads and retrying webhook delivery records for session, payment, receipt, and withdrawal lifecycle events
- webhook signature verification with optional timestamp tolerance to reject stale signed payload replays
- production webhook delivery guard requiring HTTPS merchant endpoints when `NODE_ENV=production`
- schema-versioned optional JSON persistence for the local merchant operator via `VANTA_PAY_STORE_PATH`, including restart-safe refund and withdrawal idempotency evidence
- production private-rail guard through `npm run pay:production-private-rail-guard-check`
- production startup guard requiring explicit `VANTA_PAY_SECRET_KEY`, `VANTA_PAY_WEBHOOK_SECRET`, durable storage, and Private Pool v2 operator URL/auth when `NODE_ENV=production`
- browser-backed Pay checks for landing, checkout, payment-link, and withdrawal screens via `npm run pay:browser-check`, including a checkout assertion that the `Pay with Vanta` CTA stays present-but-disabled in beta mode and completion remains absent

This is still a local MVP harness, not a deployed payment processor. It gives
Vanta Pay the familiar integration shape: create a session, show checkout, and
receive a webhook when a payment completes. Internally, completed Pay states
now require private settlement receipts so privacy is part of the state machine
rather than only product copy. The current check starts the local Private Pool
v2 operator and proves Pay settlement receipts are accepted through the
operator-owned `/private-pool-v2/pay-settlements` endpoint when the operator
URL is configured.

The commands below are reviewer and operator surfaces. They are intentionally
detailed; normal users should not need them to understand what Vanta does.

`private-core:demo-readiness` is the friendliest single entrypoint when you just want to know whether the current proof/demo lane is stage-ready.

`private-core:demo-preflight` combines the full verification pass with the current operator contract surface, the full operator status summary, the compact shipping summary, the human-readable bundled snapshot, and the human-readable shipping artifact.

`private-core:operator-contract` gives the static narrow zk-v1 contract the operator currently supports: send lane, unshield lane, release lane, swap lane, the canonical shipping-decision contract, supported flow, supported asset/environment, note contract, recipient/release-destination models, proof system, fixed circuit ids, fixed Merkle depth, owner-auth mode, nullifier-key mode, proving hash lane, root-registration provenance, send input-root policy, send output-registration policy, the current send resulting-root basis, and the currently supported constrained swap venue/output/root-policy model.

`private-core:operator-contract-json` prints that same frozen operator contract as machine-readable JSON, including the static shipping-decision and bundled operator-snapshot contract fields, the dedicated snapshot transport, and the dedicated `/state/private-core-snapshot` endpoint path, so automation can pin the frozen support surface directly instead of scraping the long-form text output.

`private-core:operator-status` gives reviewers a live readout of what the
current private-core operator can prove. In plain terms, it answers:

- what private-core state the operator currently sees
- whether the latest proof, send, swap, consume, and release records are linked
- whether a root is current, stale, unregistered, consumed, or released
- whether the release path was authorized and recorded in the local operator lane
- whether the constrained send and swap lanes are still inside the narrow v1 rules

The command reads the dedicated `/state/private-core-status` endpoint. The
longer field names remain in the machine-readable output for automation, but
the purpose is simple: help reviewers check the current demo lane without
mistaking it for final production privacy.

`private-core:operator-status-json` prints the live operator summary plus the canonical shipping decision as machine-readable JSON, so automation can consume the full operator-backed state surface without scraping the long-form text dump.

If no operator is reachable, `private-core:operator-status-json` prints a machine-readable `operatorReachable: false` surface (plus `operatorError`) instead of failing with an unparseable fetch error. Use this for offline status snapshots. The strict `private-core:operator-status-check-json` command still fails when the operator is unreachable, but now remains machine-readable.

`private-core:operator-status-check` is the ready-gated human-readable form of that same long operator-status surface: it now reads the dedicated `/state/private-core-status-check` endpoint, exits zero only when the live operator status says the frozen narrow lane is ready to ship, and on blocked paths fails with structured `Operator status decision status:` / `Operator status decision note:` lines. The frozen contract now treats that gate as its own operator-owned transport via `supportedOperatorStatusGateTransport = dedicated-endpoint` and `supportedOperatorStatusGateEndpoint = /state/private-core-status-check`.

`private-core:operator-status-check-json` is the ready-gated machine-readable form of that same long operator-status surface: it now reads the dedicated `/state/private-core-status-check` endpoint, exits zero only when the live operator status says the frozen narrow lane is ready to ship, prints the full operator-status JSON on success, and on blocked paths emits the full operator-status JSON to stderr before structured `Operator status decision status:` / `Operator status decision note:` lines.

`private-core:operator-snapshot` prints that same bundled operator snapshot in a human-readable form, including the snapshot identity, dedicated transport/endpoint, contract version, summary version, decision status, and the supporting shipping / finish-line / required-lanes / release-boundary / contract-mirror / boundary summaries.

`private-core:operator-snapshot-json` prints one bundled machine-readable operator snapshot from the dedicated `/state/private-core-snapshot` endpoint, containing the frozen contract, the live summary/status surface, and the canonical shipping decision surface together, so external tooling can consume one coherent artifact instead of stitching together multiple commands. The shared app runtime now also hydrates its operator contract, summary, and shipping decision state from that bundled snapshot endpoint rather than rebuilding the same bundle from three separate fetches. That bundled artifact is now also part of the frozen contract surface itself via `supportedOperatorSnapshotVersion = 1`, `supportedOperatorSnapshotKind = contract-status-shipping-bundle`, `supportedOperatorSnapshotTransport = dedicated-endpoint`, and `supportedOperatorSnapshotEndpoint = /state/private-core-snapshot`.

`private-core:operator-snapshot-check` is the ready-gated human-readable form of that same bundled artifact: it exits zero only when the bundled snapshot says the frozen narrow lane is ready to ship, and on blocked paths fails with structured `Snapshot decision status:` / `Snapshot decision note:` lines. The frozen contract now treats that bundled ready gate as its own operator transport too via `supportedOperatorSnapshotGateTransport = dedicated-endpoint` and `supportedOperatorSnapshotGateEndpoint = /state/private-core-snapshot-check`.

`private-core:operator-snapshot-check-json` is the ready-gated machine-readable form of that same bundled artifact: it exits zero only when the bundled snapshot says the frozen narrow lane is ready to ship, prints the bundled JSON on success, and on blocked paths emits the full snapshot JSON to stderr before structured `Snapshot decision status:` / `Snapshot decision note:` lines.

`private-core:shipping-artifact` prints the release-grade human-readable artifact from the dedicated `/state/private-core-shipping-artifact` endpoint, including the artifact identity, shipping decision identity, bundled snapshot identity, dedicated transports/endpoints, contract version, summary version, the current registered root lineage, the latest proof/send/consume/release lineage, and the supporting shipping / finish-line / required-lanes / release-boundary / contract-mirror / boundary summaries.

`private-core:shipping-artifact-json` prints that same release-grade artifact as machine-readable JSON from the dedicated `/state/private-core-shipping-artifact` endpoint. It now gives automation one canonical operator-owned handoff object containing the shipping decision, current-root lineage, latest proof/send/consume/release lineage, and the bundled contract/status/shipping snapshot, rather than requiring tooling to join those surfaces itself.

`private-core:shipping-artifact-check` is the ready-gated human-readable form of that artifact: it exits zero only when the artifact says the frozen narrow lane is ready to ship, and on blocked paths fails with structured `Artifact decision status:` / `Artifact decision note:` lines. The frozen contract now carries that ready-gated release artifact transport explicitly via `supportedShippingArtifactGateTransport = dedicated-endpoint` and `supportedShippingArtifactGateEndpoint = /state/private-core-shipping-artifact-check`.

`private-core:shipping-artifact-check-json` is the ready-gated machine-readable form of that artifact: it exits zero only when the artifact says the frozen narrow lane is ready to ship, prints the full artifact JSON on success, and on blocked paths emits the full artifact JSON to stderr before structured `Artifact decision status:` / `Artifact decision note:` lines.

`private-core:release-candidate` prints the exact narrow private-core send -> consume -> release candidate from the dedicated `/state/private-core-release-candidate` endpoint in human-readable form. It is the first operator-owned surface that binds one concrete `releaseCandidateId` to the current send, consume, and release lineage instead of only describing the latest operator state generically, and that exact-run candidate surface is now frozen into the operator contract as its own artifact family. The frozen contract also states that this exact-run candidate is canonical only for the primary `send -> unshield` path; `send-change` and `send-chain` downstream release variants remain valid release paths but are outside the exact candidate lineage contract.

`private-core:release-candidate-json` prints that same exact-run candidate as machine-readable JSON from the dedicated `/state/private-core-release-candidate` endpoint so tooling can pin the concrete candidate id and lineage directly.

`private-core:release-candidate-check` is the ready-gated human-readable form of that exact-run candidate: it exits zero only when the exact candidate is coherent and ready for the frozen narrow lane, and on blocked paths fails with structured `Release candidate decision status:` / `Release candidate decision note:` lines.

`private-core:release-candidate-check-json` is the ready-gated machine-readable form of that same exact-run candidate: it exits zero only when the candidate is coherent and ready, prints the candidate JSON on success, and on blocked paths emits the full candidate JSON to stderr before structured `Release candidate decision status:` / `Release candidate decision note:` lines.

`private-core:release-package` prints the final operator-owned downloadable release package from the dedicated `/state/private-core-release-package` endpoint. It packages the exact candidate id, shipping decision identity, current root, and latest proof/send/consume/release lineage into one review-ready artifact for the canonical primary `send -> unshield` lane.

`private-core:release-package-json` prints that same release package as machine-readable JSON from `/state/private-core-release-package`.

`private-core:release-package-check` is the ready-gated human-readable form of that release package: it exits zero only when the primary exact candidate is coherent and otherwise fails with structured `Release package decision status:` / `Release package decision note:` lines.

`private-core:release-package-check-json` is the machine-readable ready-gated form of that same release package: it exits zero only when the primary exact candidate is coherent, prints the release package JSON on success, and on blocked paths emits the full package JSON to stderr before structured release-package decision status/note lines.

`private-core:release-readiness` is the final reviewer-facing release judgment for the canonical primary `send -> unshield` lane. It bundles the compact shipping decision, exact release-candidate surface, and operator-owned release package into one final human-readable readiness summary for the frozen narrow zk v1 finish line.

`private-core:release-readiness-json` prints that same final reviewer-facing readiness summary as machine-readable JSON.

`private-core:release-readiness-check` is the strict ready-gated human-readable form of that final readiness summary: it exits zero only when the primary exact candidate, shipping decision, and release package are all coherent enough for final handoff, and otherwise fails with structured `Release readiness status:` / `Release readiness note:` lines.

`private-core:release-readiness-check-json` is the machine-readable ready-gated form of that same final readiness summary: it exits zero only when the primary exact candidate is handoff-ready and otherwise emits the full readiness JSON to stderr before structured release-readiness status/note lines.

`private-core:demo-preflight` now self-hosts a temporary local operator when no `--base-url` or `VANTA_PRIVATE_CORE_OPERATOR_BASE_URL` is provided. That makes the full reviewer/demo preflight turnkey again: it runs the canonical verifier, boots an isolated operator, and prints the frozen contract, long-form status, compact shipping, bundled snapshot, shipping artifact, exact release-candidate, release package, and final release-readiness surfaces against that temporary operator instead of failing on a missing live server.

The current repo truth should now be read this way:
- the narrow private-core `zk v1` lane is the accepted shipping definition of `zk v1`
- the broader Vanta privacy/product vision is still larger than that shipped narrow lane

The canonical decision note is:
- [docs/zk/vanta-zk-v1-shipping-decision.md](docs/zk/vanta-zk-v1-shipping-decision.md)

The app now also treats the canonical primary `send -> unshield` lane as an explicit release handoff workflow instead of only as operator diagnostics. Shared runtime state derives a first-class exact release handoff from the release-candidate plus shipping-artifact surfaces, and the primary `Send` and `Unshield` pages now show:
- prepare
- check
- ship
- handoff status
- next recommended action
- release package status
- release package identity

The app now also treats that operator-owned release package as a true review artifact:
- `Send` and `Unshield` expose:
  - `Copy operator package summary`
  - `Copy operator package JSON`
  - `Download package summary`
  - `Download package JSON`
- `Dashboard` now shows a first-class exact release review card so the final narrow-lane handoff status is visible before drilling into the primary flow pages.
- `Dashboard` and the shared private-core diagnostics now point directly at the canonical final reviewer commands:
  - `npm run private-core:release-readiness`
  - `npm run private-core:release-readiness-check`

`private-core:shipping-status` is the compact operator-backed answer to the narrow zk-v1 question: whether the frozen private-core lane is actually ship-ready right now, and if not, which live blocker is preventing that. It now reads the dedicated `/state/private-core-shipping-decision` endpoint, which is the canonical ship/no-ship contract for the frozen narrow private-core lane, and prints the decision version/kind/status/note plus the current summary-state version, mirrored contract version, summary generation time, and the supporting shipping, finish-line, required-lanes, release-boundary, contract-mirror, and boundary summaries without the rest of the larger operator-status dump.

`private-core:shipping-status-json` prints that same compact readiness surface as machine-readable JSON, including the canonical decision fields and both raw enum values and humanized labels for shipping, finish-line, required-lanes, release-boundary, contract-mirror, and boundary state.

If no operator is reachable, `private-core:shipping-status-json` now prints a machine-readable `operatorReachable: false` surface instead of a raw fetch failure. The strict `private-core:shipping-check*` commands still fail when the operator is unreachable.

`private-core:shipping-check` runs the same operator-backed shipping summary but exits non-zero unless the current summary says `Ready narrow v1`. It now reads the dedicated `/state/private-core-shipping-decision-check` gate endpoint directly, and on blocked paths fails with structured `Shipping status:` and `Shipping note:` stderr lines instead of a note-only message.

`private-core:shipping-check-json` is the machine-readable ready-gate form of that same command: it exits zero only for `Ready narrow v1`, prints the compact readiness JSON on success, and on blocked paths emits the JSON surface to stderr before the structured `Shipping status:` / `Shipping note:` lines.

The operator contract now freezes the narrow zk-v1 contract surface explicitly:
- `contractVersion = 23`
- `summaryVersion = 47`
- `supportedShippingDecisionVersion = 1`
- `supportedShippingDecisionKind = narrow-private-core-zk-v1-shipping`
- `supportedOperatorSnapshotVersion = 1`
- `supportedOperatorSnapshotKind = contract-status-shipping-bundle`
- `supportedOperatorSnapshotTransport = dedicated-endpoint`
- `supportedOperatorSnapshotEndpoint = /state/private-core-snapshot`
- `supportedUnshieldLaneVersion = 1`
- `supportedUnshieldLaneKind = single-note-proof-backed-consume`
- `supportedUnshieldLaneStatus = supported`
- `supportedReleaseLaneVersion = 1`
- `supportedReleaseLaneKind = proof-backed-consume-latest-registered-root`
- `supportedReleaseLaneStatus = supported`
- `supportedReleaseV1Decision = accepted-narrow-v1-path`
- `supportedSwapV1Decision = accepted-narrow-v1-path`
- `supportedSwapLaneVersion = 1`
- `supportedSwapLaneKind = single-input-usdc-to-allowlisted-shielded-output`
- `supportedSwapLaneStatus = supported`
- `supportedSwapVenue = meteora-dlmm-mainnet-and-operator-token-output`
- `supportedSwapOutputModel = allowlisted-shielded-output-note`
- `supportedSwapResultingRootBasis = client-declared`
- `supportedSwapInputRootPolicy = latest-registered-root-with-linked-registration-proof`
- `supportedSwapOutputRegistrationPolicy = resulting-root-must-register-as-swap-output`
- `supportedPrivateCoreCircuitFamily = vanta_private_core_single_note`
- `supportedPrivateCoreCircuitFamilyStatus = active-v0-legacy`
- `supportedPrivateCoreCircuitFamilyNewArchitectureStatus = deprecated-for-new-architecture`
- `supportedPrivateCoreReplacementFamily = vanta_private_pool_v2_entry`

These single-note lanes are active-v0 legacy compatibility lanes while current flows still depend on them. They should not be expanded into new production architecture; use the Private Pool v2 entry family or an explicitly reviewed replacement for new circuit work.
- `supportedFlowVersion = 1`
- `supportedFlowKind = shield-hold-send-unshield-replay-guard`
- `supportedFlowStatus = supported`
- `supportedAssetSymbol = USDC`
- `supportedEnvironment = solana-mainnet`
- `supportedNoteSchema = note-v0`
- `supportedNoteVersion = 0`
- `supportedRootRegistrationProvenance = shield-input|send-recipient-output|send-change-output|swap-output`
- `supportedSendResultingRootBasis = client-declared`
- `supportedSendInputRootPolicy = latest-registered-root-with-linked-registration-proof`
- `supportedSendOutputRegistrationPolicy = resulting-root-must-register-as-recipient-or-change-output`
- `supportedRecipientModel = hashed-reference-to-owner-key`
- `supportedReleaseDestinationModel = 32-byte-release-destination-field`
- `supportedProofSystem = noir-acir-ultrahonk-bbjs`
- `supportedUnshieldCircuit = vanta_private_core_single_note_unshield`
- `supportedSendCircuit = vanta_private_core_single_note_send`
- `supportedUnshieldMerkleDepth = 20`
- `supportedSendMerkleDepth = 20`
- `supportedReleaseAuthorizationBasis = proof-backed-consume`
- `supportedReleaseRootPolicy = latest-registered-root`
- `supportedReleaseExecutionModel = operator-recorded-mainnet-release`
- `supportedReleaseAtomicityModel = operator-local-atomic-consume-and-release-record`
- `supportedReleasePersistenceModel = json-store-v1`
- `supportedReleaseV1Decision = accepted-narrow-v1-path`
- `supportedOwnerAuthorizationMode = x25519-secret-prechecked-off-circuit`
- `ownerAuthorizationDecision = accepted-v1-off-circuit-precheck`
- `supportedUnshieldProofOwnerKeyMode = poseidon-proof-owner-key-v0`
- `sourceArtifactTruthBasis = source-layer-artifact-bundle`
- `provingArtifactTruthBasis = verified-proving-public-input-vector`
- `sourceProvingRelationship = explicit-split-no-implicit-equality`
- `nullifierKeyDecision = accepted-v1-temporary-note-secret-key`
- `supportedNullifierKeyMode = note-secret-temporary-v0-1`
- `supportedProvingHashLane = poseidon-bn254-proving-lane-v0`

The live operator summary layers dynamic verifier-side state on top of that contract:
- current root / current root record
- latest proof / send proof / send transition / consume / release
- proof-send / proof-consume / proof-release / registration link status
- send boundary status / note
- send continuity status / note
- contract-mirror status / note
- latest send resulting-root continuity and registration status
- boundary status / boundary note
- summary generation time
- `supportedUnshieldMerkleDepth = 20`
- `supportedSendMerkleDepth = 20`
- `supportedReleaseAuthorizationBasis = proof-backed-consume`
- `supportedReleaseRootPolicy = latest-registered-root`
- `supportedReleaseExecutionModel = operator-recorded-mainnet-release`
- `supportedReleaseAtomicityModel = operator-local-atomic-consume-and-release-record`
- `supportedReleasePersistenceModel = json-store-v1`
- `supportedOwnerAuthorizationMode = x25519-secret-prechecked-off-circuit`
- `ownerAuthorizationDecision = accepted-v1-off-circuit-precheck`
- `supportedUnshieldProofOwnerKeyMode = poseidon-proof-owner-key-v0`
- `sourceArtifactTruthBasis = source-layer-artifact-bundle`
- `provingArtifactTruthBasis = verified-proving-public-input-vector`
- `sourceProvingRelationship = explicit-split-no-implicit-equality`
- `nullifierKeyDecision = accepted-v1-temporary-note-secret-key`

---

## What's in this repository

This repository currently contains:
- a polished landing page, manifesto, and `/products` catalog
- a modular app shell with Shield-first primary tabs and preview lanes in More
- Shield, Send, Swap, and Unshield as the core private-settlement workflow
- shared app-level continuity between Shield, Send, Swap, and Unshield
- a constrained real mainnet protocol path for `USDC`
- direct native SOL shield entry into shielded SOL state
- authenticated operator-backed Unshield for `USDC` and `SOL`
- a constrained one-way live `USDC -> SOL` swap lane
- a standalone Vanta Private Core proof lane with operator-backed verification
- Private Pool v2 benchmark seams, Proof/trust-packet surfaces, and Pay/Strategy preview lanes

The current implementation is intentionally product-led. It focuses on:
- clear user understanding of shield-first private lanes
- coherent privacy flow and counterparty-verifiable receipts where implemented
- strong visual system
- extensible structure for stronger future protocol integration

---

## Notes for future integration

- app module pages already reserve space for wallet connection, protocol state, proving lifecycle, and transaction status
- Shield and Send share app-level privacy flow context
- real wallet-connected state now grounds the live `USDC` path
- no fake wallet logic is included
- content and structure are organized for extension into real Solana privacy workflows

---

## Additional materials

- Private-core demo runbook: `docs/zk/vanta-private-core-demo-runbook.md`
- ZK v1 shipping decision: `docs/zk/vanta-zk-v1-shipping-decision.md`

---

## Internal product rule

If someone asks what Vanta is, the shortest correct answer is:

> Vanta is a shield-first beta privacy app for Solana. Users move supported assets out of public wallet flows, use them through constrained private lanes (Send, Swap, Unshield), and can share verifiable receipts where implemented. Pay is one preview lane among several — not the whole product.

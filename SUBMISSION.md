# Vanta - Hackathon Submission Package

## Project name

**Vanta**

## Tagline

**Shield first. Move privately.**

## Short description

Vanta is a shield-first privacy app for supported Solana assets. It helps users move assets out of fully public wallet flows, use supported private actions, and return to a public wallet when needed.

## Medium description

Vanta starts with one simple idea: normal Solana wallet activity is public, so privacy needs a clear entry point.

That entry point is **Shield**. A user moves supported assets into Vanta, uses supported private actions, then exits when they need to return to a public wallet.

The current demo has three parts:

- a wallet app for Shield, Send, Swap, and Unshield
- Vanta Pay, a merchant preview for checkout, settlement status, payment links, invoices, refunds, withdrawals, webhooks, and receipts
- a reviewer-facing proof lane that shows the first private-core boundary is executable

The Pay demo focuses on a simple merchant question: can I create and review a payment request, see the records around it, and understand what is still a preview? Deeper merchant API and settlement contracts remain verifiable behind the tab.

Vanta is intentionally honest about its status: it has real mainnet and local verification lanes, but it is not production-ready, audited, or mainnet-ready yet.

## Full description

Solana is fast and cheap, but it is public by default. Wallet balances, transfers, counterparties, and behavior patterns are easy to trace.

Vanta exists to close that gap.

Vanta starts with a product loop normal people can understand:

```text
Public Wallet -> Shield -> Private Vanta Area -> Send / Swap -> Unshield
```

Shielding does not make a normal wallet magically private. It means supported assets leave the normal public-wallet flow and enter Vanta's private flow. From there, Vanta can support private actions with clearer boundaries.

For this hackathon, the strongest story is not "Vanta has every privacy feature." It is:

- the app has a real early shielded-state product loop
- the Pay surface explains private payment work in plain merchant language
- the proof lane shows the cryptographic boundary is executable, not only a slide

The premium merchant wedge is already visible in the live demo:

- checkout preview
- clear approval boundaries
- merchant-visible settlement, refund, withdrawal, and reconciliation states
- runtime-backed empty-state console cards for balances, refund queue, withdrawal queue, and reconciliation export
- design-partner-facing merchant pilot framing on the real Pay surface

Vanta is designed for users, traders, teams, builders, and merchants who need more than speed and low fees. They need discretion, simple approvals, and records they can understand.

### Pricing

Vanta is designed to be easy to try:

- `0 monthly fee`
- `0.25%` only when a supported action completes successfully
- pass-through network, off-ramp, and third-party execution costs remain separate

The `$VANTA` roadmap remains utility-first rather than token-first.

Net Vanta-collected fees are reserved for ecosystem growth, including supply buybacks, marketing, operator infrastructure, security, and product development. Pass-through costs are excluded from that base.

The long-term vision is to make private value movement on Solana feel like a product, not a cryptography demo: user flows stay simple, merchant settlement stays policy-legible, and reviewer trust stays machine-checkable through explicit status and verification surfaces.

---

## Problem statement

Solana is transparent by default. Holdings, transfers, counterparties, and behavioral patterns are easy to trace across transparent onchain systems. That creates real problems for users, traders, teams, and businesses that need basic financial privacy and operational discretion.

## Solution statement

Vanta introduces a privacy-preserving layer for Solana that starts by letting users shield supported assets out of public wallet flows and into shielded state. From there, users can access private workflows beginning with send, while merchants get payment flows with clear records, approvals, and settlement status without needing to understand the protocol internals.

## Why now

As Solana matures into a serious environment for finance, applications, and commerce, privacy becomes a missing piece of infrastructure. Users do not stop needing discretion simply because they move onchain. Vanta is being built to make privacy feel usable, structured, and native to the next era of Solana activity.

## Why this hackathon

This hackathon is the right environment to show Vanta's wedge clearly: a product-led Solana privacy layer with a real early protocol loop, a merchant demo that makes private settlement understandable, and a meaningful first zk boundary that can be verified live.

---

## Product thesis

Vanta is a privacy-first Solana app that pairs shielded user flows with merchant-facing private payment tools.

## Product truth

The first complete Vanta loop is:

**Public Wallet -> Shield -> Shielded State -> Send / Swap -> Unshield**

This is the core mental model of the product.

The current demo story adds a second mental model on top of that loop:

**Merchant checkout -> Preview -> Approve -> Execute -> Settle**

## Important clarification

Shielding does **not** mean standard wallet balances magically become invisible. It means supported assets move out of ordinary transparent wallet flows and into a privacy-preserving Vanta layer designed for more private actions.

---

## MVP

The MVP is **Shield + Private Send**:
- shield supported assets into the Vanta privacy layer
- maintain shielded state
- use that state through the first private workflow: send

For demo day, the product is bigger than that MVP wedge:
- Pay shows merchant payment and settlement records
- Private Core shows the first executable proof boundary

## Current implementation status

Vanta currently supports a constrained real mainnet lifecycle for `USDC` plus a direct native SOL shield-entry lane.

### Live now
- real wallet connection
- real public wallet balance detection for `USDC`
- contextual fresh-wallet and wallet-picker recovery surfaces
- feature-flagged Peer desktop top-up recovery in the wallet picker for disconnected or effectively unfunded users
- real native SOL shield transfer into shielded SOL state, so SOL remains SOL when shielding
- real shield deposits into a Vanta-controlled path
- real onchain shield notes
- real onchain native SOL shield-state notes
- real onchain send notes
- real constrained `USDC -> SOL` Meteora mainnet swap
- real shielded `SOL` output notes
- operator-backed constrained unshield back to Public Wallet
- operator-backed constrained shielded `SOL` unshield back to Public Wallet
- explicit note identity
- explicit spent-marker semantics
- residual/change-note evolution
- shielded balance resolved from the current spendable note set
- authenticated wallet-linked Unshield intent
- operator-side verification of referenced onchain transition state before release
- persistent completed release records across operator restarts
- a real `/app/pay` merchant demo surface with Payment Link, Invoice, Checkout, and Withdraw views
- merchant operations, approval-boundary copy, refund / withdrawal / reconciliation detail states, and settlement console cards for balances, payout queue, receipts, and reconciliation export on the Pay surface
- merchant trust status and approval-packet surfaces that freeze `preview -> approve -> execute -> settle`
- Pay staging deployment on Render with Postgres-backed persistence and a staging Private Pool v2 operator connection
- an early Strategy planning and execution-preview surface for Stealth DCA and Private TWAP
- Vanta Private Core shield -> hold -> unshield -> replay-rejection demo loop
- first executable fixed-depth Noir single-note unshield circuit
- local proof generation and verification for the current private-core lane
- operator-backed proof execution and proof-backed root registration for the current narrow private-core consume lane
- explicit narrow-v1 acceptance decisions for the current private-core:
  - send lane
  - unshield lane
  - release lane

### Still constrained / not final
- no final zk proof system yet
- no final nullifier design yet
- no broad recipient-private send product semantics yet
- no generalized multi-asset support yet
- no symmetric two-way market proof yet
- Strategy is still planning/runtime only and does not submit live Jupiter, Jito, or private-settlement transactions yet
- Pay is a merchant-product harness and staging demo, not a production processor or mainnet-ready settlement system

The current Unshield path is operator-backed and intentionally constrained, but it now requires authenticated wallet intent, verifies referenced onchain transition state before release, and persists completed release records to prevent duplicate execution across restarts.

The current Vanta Private Core lane is also intentionally constrained. It proves the first real single-note unshield boundary and operator-backed verifier path, but it is not yet the full final Vanta privacy protocol.

This means Vanta should be understood as a real early protocol around USDC plus native SOL shield entry with constrained note-based state transitions, rather than only as a front-end prototype.

## Why Shield comes first

Privacy needs a coherent entrypoint.

Shielding is the action that creates private state. Once that shielded state exists, Private Send becomes the first natural workflow. This makes the product easier to understand, more coherent architecturally, and more extensible into swaps, payments, and future ecosystem modules.

## Why not make Send the whole MVP?

Because send alone lacks a clean product foundation. Shield + Private Send forms a complete privacy loop and makes the rest of the suite easier to understand.

---

## Current product surfaces

### Marketing site
- product thesis
- privacy gap framing
- explanation of shielded state
- product suite overview
- roadmap
- Vanta hackathon positioning

### Application
- Shield as the primary entrypoint
- Send as the first workflow unlocked by shielded state
- Swap as a constrained route today
- Pay as a merchant-product harness and design-partner-facing payment record surface backed by the shared private-settlement lane
- Strategy as a minimal Stealth DCA / Private TWAP creation surface with a deterministic child-order planner
- contextual Peer top-up recovery inside the wallet picker instead of a separate funding page
- shared app-level continuity between Shield and Send
- internal Vanta Private Core diagnostics and proof-boundary views for the first zk lane

### Current live flow
**Public Wallet -> Shield -> Shielded State -> Send / Swap -> Unshield**

### Merchant demo flow
**Checkout -> Preview -> Approve -> Execute -> Settle**

### What the demo proves
- Vanta can present a merchant-facing private settlement story without burying users in protocol language
- approval boundaries are fixed and explicit, not hand-wavy
- merchant-visible refund, withdrawal, and reconciliation states can live beside the buyer checkout
- the repo has a real proof lane and reviewer commands behind the product story
- the current build is honest about remaining constraints, with `productionReady: false` and beta-mode truth surfaces preserved

---

## Technical checkpoints

If a reviewer only runs a few things, these are the highest-signal commands:

```bash
npm run build
npm run protocol:browser-check
npm run pay:verify
npm run private-core:demo-preflight
npm run mainnet:readiness-check
```

Together, they prove the app builds, the visible product surfaces render, the simplified Pay tab stays aligned with its trust model, the private-core proof lane is demo-ready, and the repo is still honest about remaining production blockers.

The repo now includes a **Vanta Pay merchant integration** verification lane:

- `npm run pay-tab:copy-check`
  verifies the Pay tab uses commerce-first language and rejects banned merchant-flow protocol vocabulary.
- `npm run pay:contract-check`
  verifies the static Pay contract surface for runtime versioning, store schema versioning, status surfaces, checkout idempotency, checkout-completion retry idempotency, refund idempotency, withdrawal idempotency, merchant-visible refund amount tracking, refund API coverage, webhook timestamp-tolerance verification, production HTTPS webhook delivery guardrails, Private Pool v2 settlement auth-token forwarding, production secret guards, payment-link API coverage, and canonical `pay:verify` inclusion.
- `npm run pay:status` / `npm run pay:status-json`
  print human and machine-readable Pay status, including private-settlement, idempotency, webhook, durable-store, production-guard, browser-checkout, and `productionReady: false` fields.
- `npm run pay:operator`
  starts the Vanta Pay merchant API operator.
- `npm run pay:merchant-api-check`
  verifies the typed Pay runtime and local merchant API for production guards, durable-store configuration, idempotency, hosted checkout sessions, checkout completion, refunds, withdrawals, signed webhook delivery/retry records, payment links, invoices, private-settlement-derived balances, and restart-safe persistence behavior.
- `npm run pay:browser-check`
  starts the Vanta app locally and runs browser-backed assertions across the Pay checkout flow.
- `npm run pay:verify`
  runs the Pay status surfaces, merchant trust status check, approval packet check, copy check, merchant API check, browser-backed Pay check, security limitations check, operator runbook check, and production app build.

The Pay layer is designed as the merchant product surface for private payment work: create a checkout session, render checkout, create payment links and invoices, preview subscriptions, handle refunds and withdrawals, reconcile records, and receive signed webhook events when paid. Completed Pay states now require private settlement receipts from `src/pay/vantaPayPrivateSettlementAdapter.ts`, which can route through the Vanta Private Pool v2 operator-owned `/private-pool-v2/pay-settlements` endpoint through `VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL`. Merchant copy remains commerce-first.

The real `/app/pay` demo surface is intentionally beta-framed: payment creation first, then checkout modes, payment links, invoices, subscriptions, refunds, withdrawals, reconciliation, developer controls, route preview, receipt preview, transaction evidence, and beta disabled state.

Staging deployment truth:

- Pay is deployed on Render at `https://vanta-0wwi.onrender.com`.
- Pay uses Render Postgres through `VANTA_PAY_DATABASE_URL` and reports `storage.kind: postgres-jsonb-snapshot-store`.
- Pay is wired to the staging Private Pool v2 operator at `https://vanta-staging-private-pool-v2.onrender.com`.
- Authenticated Pay status reports `privatePoolOperatorConfigured: true` and `durableStoreConfigured: true`.
- Private Pool v2 is deployed on Render at `https://vanta-staging-private-pool-v2.onrender.com`.
- Private Pool v2 uses Render Postgres through `VANTA_PRIVATE_POOL_V2_DATABASE_URL` and reports `storage.kind: postgres-jsonb-snapshot-store`.
- The secrets-safe staging refs are recorded in `ops/mainnet/private-pool-v2-services.manifest.json` and `ops/mainnet/external-gates.packet.json`.
- Secret refs are inventoried in `ops/mainnet/secret-references.manifest.json` with reference names only, including rotation, revocation, and access-log refs.
- Doppler is selected as the production secret-manager target in `ops/mainnet/production-secret-manager.template.json`; this records mappings only and does not include secret values or service tokens.
- Better Stack staging monitors for Pay and Private Pool v2 public `/health` endpoints are recorded in `ops/mainnet/staging-monitoring.manifest.json`.
- Pay and Private Pool v2 emit privacy-safe stdout JSON request telemetry through `src/ops/vantaSafeTelemetry.mjs`; bodies, query values, raw IPs, auth headers, cookies, API keys, database URLs, tokens, private keys, seed phrases, and mnemonics are intentionally excluded.
- Production observability refs are templated in `ops/mainnet/production-observability.template.json` without provider tokens, webhook URLs, source tokens, or raw secrets.
- This is staging-only. It is not a mainnet processor, audited settlement system, custody-safe service, or production privacy claim.

Production deployment truth:

This section is for reviewers. These services and checks do not mean Vanta is
production-ready; they record deployed infrastructure evidence while
`mainnetReady` and `productionReady` remain `false`.

- The production Private Pool v2 role-service network is deployed on Render with separate indexer, prover, relayer, verifier, and operator services recorded in `ops/mainnet/private-pool-v2-services.manifest.json`.
- The repo now carries a sanitized production route-health surface:
  - `npm run mainnet:private-rail-route-health`
  - `npm run mainnet:private-rail-route-health-auth`
  - `npm run mainnet:private-rail-route-health-evidence-check`
- The repo now carries a sanitized production nullifier-replay surface:
  - `npm run mainnet:nullifier-replay-status`
  - `npm run mainnet:nullifier-replay-status-auth`
  - `npm run mainnet:nullifier-replay-evidence-check`
- The repo now carries a sanitized production wallet-signing surface:
  - `npm run mainnet:wallet-signing-status`
  - `npm run mainnet:wallet-signing-evidence-check`
- Fresh no-real-funds production smoke evidence is recorded in `ops/mainnet/private-pool-v2-production-smoke.evidence.json`.
- Current production truth is intentionally narrow:
  - the deployed operator exposes durable Postgres-backed replay reservation
  - the verified role-service network rejects duplicate verifier receipts and conflicting nullifier registration
  - real private mainnet settlement is still not complete
  - the deployed operator now reports the preferred Postgres durable shared-window rate limiter
  - `mainnetReady` and `productionReady` remain `false`

The repo now includes an early **Vanta Strategy** verification lane:

- `npm run strategy:planner-check`
  verifies deterministic Stealth DCA / Private TWAP planning, randomized child-order sizing, total-notional reconciliation, private-balance funding behavior, public-balance move-to-private behavior, RFQ allowance for Private TWAP, protected landing policy, and invalid-notional rejection.
- `npm run strategy:execution-adapter-check`
  verifies Strategy plans become non-live execution previews with private-funding preparation, Jupiter quote/build/submit job shape, Jito protected landing, private destination settlement, route-quality deferral, slippage skipping, and protected-landing downgrade/retry behavior.
- `npm run strategy:runtime-check`
  verifies local Strategy create/list/start/pause/cancel semantics, idempotent create retries, conflict rejection for mutated retries, runtime-backed execution previews, waiting status for poor-route deferral, and canceled-strategy start rejection.
- `npm run strategy-tab:copy-check`
  verifies the Strategy tab copy, `/app/strategy` route, central tab placement, and banned advanced/protocol vocabulary exclusions.
- `npm run protocol:browser-check`
  runs browser-backed assertions across Shield, Send, Swap, Strategy, and Unshield action surfaces.

The Strategy surface is an execution-console product layer today. It does not submit live Jupiter swaps, Jito bundles, or private-settlement transactions yet. The important progress is that Strategy intent now crosses typed planner, execution-preview, and local runtime boundaries before future adapters touch funds.

The repo now includes a **mainnet readiness** gate:

- `npm run mainnet:readiness` / `npm run mainnet:readiness-json`
  prints human and machine-readable readiness status across Pay, Private Core, Private Pool v2, protocol tabs, and Strategy.
- `npm run mainnet:readiness-check`
  verifies Vanta remains truthfully blocked while real private settlement, deployed-service hardening, final replay enforcement, wallet-signing evidence, and other remaining operator gates remain.
- `npm run mainnet:external-gates-check`
  verifies the secrets-safe external-gates packet and beginner-facing launch worksheet remain present.
- `npm run mainnet:secret-handling-check`
  verifies the secret-handling contract and references-only manifest for Pay, Private Pool v2, Strategy, and Operator scopes while keeping production secret management blocked.
- `npm run mainnet:service-contract-check`
  verifies the required production service contracts for indexer, relayer, prover, verifier, and operator surfaces.
- `npm run mainnet:storage-contract-check`
  verifies the production storage contract for Pay, Private Pool v2, Strategy, and Operator state, including durable tables, unique indexes, forward-only migrations, point-in-time recovery, encrypted backups, restore drills, idempotent writes, replay-safe uniqueness, least-privilege database users, and no secret values in manifests.
- `npm run mainnet:backup-restore-check`
  verifies the references-only production backup/restore template for database refs, backup policies, point-in-time recovery, encrypted backup evidence, restore drill evidence, restore runbooks, access audit logs, and least-privilege database users.
- `npm run storage:adapter-check`
  verifies the reusable snapshot-store adapter seam, including the Postgres JSONB snapshot store used by the Render Pay and Private Pool v2 staging services.
- `npm run mainnet:preflight`
  runs the current readiness, external-gates, service-contract, storage-contract, storage-migration, storage-adapter, abuse/observability, rate-limit, safe-telemetry, production-observability-sink, nullifier-replay, deployment-manifest, wallet-safety, transaction-safety, secret-handling, audit-package, security-limitations, and operator-runbook gates together.

This does not make Vanta mainnet-ready by itself. It makes the remaining blockers explicit, checked, and harder to accidentally bypass.

The repo now also includes an early **Vanta Private Pool v2 / Option B** verification lane for the Umbra-inspired, Vanta-owned privacy-core expansion:

- `npm run private-pool-v2:contract-check`
  verifies the typed benchmark contract, capability profile, mock runtime, local indexer, local relayer, local prover, local verifier registry, proof request surfaces, settlement policy, and operator contract markers.
- `npm run private-pool-v2:local-runtime-check`
  exercises the local Option B runtime by appending a commitment, resolving a Merkle proof, proving and verifying shield/claim requests, rejecting a tampered proof, registering a nullifier, rejecting duplicate nullifiers, submitting a relayer claim, and rejecting relayer quote replay.
- `npm run private-pool-v2:shield-circuit-check` / `npm run private-pool-v2:claim-circuit-check`
  run the first Noir-backed Private Pool v2 shield-entry and claim/spend circuit checks.
- `npm run private-pool-v2:shield-prove` / `npm run private-pool-v2:claim-prove`
  generate and verify local Barretenberg UltraHonk proofs for the current shield and claim circuits.
- `npm run private-pool-v2:http-smoke`
  starts the local Private Pool v2 operator, verifies auth/durable-store guardrails, status and receipt endpoints, settlement policy, malformed request rejection, Pay settlement receipts, protocol settlement receipts, idempotency, and replay rejection.
- `npm run private-pool-v2:protocol-client-check`
  verifies the typed browser/app client can fetch operator policy, fetch settlement status, submit a protocol Shield settlement, and read the resulting proof-backed settlement receipt.
- `npm run private-pool-v2:restart-check`
  verifies proof and settlement receipts survive operator restart and replay rejection remains enforced.
- `npm run private-pool-v2:verify`
  runs the current end-to-end Option B benchmark gate across contracts, local runtime, proof requests, circuits, proof generation, proof verification, status surfaces, HTTP operator smoke, typed protocol client check, restart smoke, security limitations check, operator runbook check, and app build.

This is not yet a production deployed mixer. It is the current Vanta-owned benchmark lane for building toward a broader shared private pool without hardwiring the product to one external SDK.

The repo now includes concrete verification commands for the Vanta Private Core proof lane:

- `npm run private-core:check`
  verifies the fixed-depth Noir circuit with:
  - one valid witness that succeeds
  - one invalid-direction witness that fails
- `npm run private-core:send-check`
  verifies the first fixed-depth private-send circuit with:
  - one valid send witness that succeeds
  - one invalid-direction witness that fails
- `npm run private-core:prove`
  generates and verifies a real local proof for the current single-note unshield lane
- `npm run private-core:send-prove`
  generates and verifies a real local proof for the current single-note private-send lane
- `npm run private-core:swap-apply-check`
  proves the constrained swap lane can be applied locally as a source-layer state transition, including recipient output recovery, resulting-root coherence, and sender privacy failure on the output payload
- `npm run private-core:swap-prove`
  generates and verifies a real local proof for the current single-note constrained swap lane
- `npm run private-core:swap-unshield-roundtrip-check`
  proves one operator-backed constrained swap can hand off into proof-backed root registration, operator-backed recipient unshield, linked release state, and replay rejection
- `npm run private-core:swap-unshield-restart-check`
  proves that same constrained swap-to-recipient-unshield handoff survives operator restart
- `npm run private-core:send-http-smoke`
  proves the operator rejects unregistered send input roots, requires the current input root to stay linked to its registration proof, rejects missing / malformed / non-transitioning resulting roots, accepts proof-backed root registration, verifies the current send witness package over HTTP, persists explicit send-proof state, and preserves the expected shared root-registration proof state
- `npm run private-core:swap-http-smoke`
  proves the operator verifies the current constrained swap witness package over HTTP, persists explicit swap-proof state, and keeps the unshield/send verifier state untouched because this first seam is proof-only
- `npm run private-core:swap-transition-http-smoke`
  proves the operator enforces current registered-root gating for the constrained swap input note, verifies the current constrained swap witness package over HTTP, persists explicit swap-transition state, and links that transition to its swap proof
- `npm run private-core:swap-restart-check`
  proves the constrained swap proof + swap-transition state survive operator restart with coherent summary-backed proof/swap linkage
- `npm run private-core:send-roundtrip-check`
  proves one operator-backed private-send roundtrip from verified send transition through sender residual-change recovery, recipient note recovery, recipient spendability, and sender privacy failure
- `npm run private-core:send-unshield-roundtrip-check`
  proves one operator-backed private send can hand off into proof-backed root registration, operator-backed recipient unshield, linked release state, and replay rejection
- `npm run private-core:send-change-unshield-check`
  proves one operator-backed private send can also hand off into proof-backed change-note root registration, operator-backed sender-change unshield, linked release state, and replay rejection
- `npm run private-core:send-chain-unshield-check`
  proves two operator-backed private send transitions can hand off into final-recipient root registration, operator-backed recipient unshield, linked release state, and replay rejection
- `npm run private-core:send-unshield-restart-check`
  proves that same operator-backed send-to-recipient-unshield roundtrip survives operator restart with coherent persisted summary state and replay rejection
- `npm run private-core:send-change-unshield-restart-check`
  proves the operator-backed send-to-change-unshield roundtrip also survives operator restart with coherent persisted summary state, replay rejection, and tampered-continuity detection
- `npm run private-core:send-chain-unshield-restart-check`
  proves that chained operator-backed send-to-recipient-unshield roundtrip also survives operator restart with coherent persisted summary state and replay rejection
- `npm run private-core:send-chain-check`
  proves a received private note can become the input to a second private send, with coherent chained nullifier use, output recovery, and privacy preservation
- `npm run private-core:send-chain-http-smoke`
  proves the operator can verify two private send transitions in sequence on evolving private state and keep the latest send summary linked coherently
- the `Send` page now includes an app-path `Verify private send proof` action that exercises the same operator-backed send witness lane from the product UI
- `npm run private-core:verify`
  runs the full stack:
  - app build
  - unshield circuit regression
  - send circuit regression
  - chained private-send regression
  - operator-backed private-send roundtrip regression
  - operator-backed private-send to recipient-unshield regression
  - operator-backed private-send to change-unshield regression
  - operator-backed chained private-send to recipient-unshield regression
  - operator-backed chained private-send regression
  - operator-backed chained private-send restart regression
  - operator-backed private-send to recipient-unshield restart regression
  - operator-backed private-send to change-unshield restart regression
  - operator-backed chained private-send to recipient-unshield restart regression
  - operator consume regression
  - operator contract smoke test
  - operator HTTP smoke test
  - operator send-proof HTTP smoke test
  - operator swap-proof HTTP smoke test
  - operator swap-transition HTTP smoke test
  - operator swap restart persistence check
  - operator restart persistence check
  - persisted send-proof state across restart
  - persisted send-transition state across restart
  - replay rejection after restart
  - real unshield proof generation and verification
  - real send proof generation and verification
  - real swap proof generation and verification
- `npm run private-core:demo-readiness`
  aliases the same full verification pass with a more reviewer-friendly name
- `npm run private-core:demo-preflight`
  runs the full verification pass and then prints the current operator-side contract, status, and compact shipping summaries
- `npm run private-core:operator-contract`
  prints the static operator-side private-core contract surface for the current narrow zk-v1 lane
- `npm run private-core:operator-contract-json`
  prints that same static operator-side contract as machine-readable JSON, including the frozen shipping-decision contract fields plus the dedicated operator-snapshot transport and endpoint path
- `npm run private-core:operator-status`
  prints the current operator-side root, proof, send-proof, send-transition, consume, and release state when the operator server is running, including proof/send, proof/consume, proof/release, and root-registration proof linkage plus send resulting-root continuity status, resulting-root provenance, and the matched resulting-root record when available; it now reads the dedicated `/state/private-core-status` artifact for the long-form live status surface instead of reconstructing that bundle client-side, and the frozen contract now explicitly covers that status surface via `supportedOperatorStatusVersion = 1` / `supportedOperatorStatusKind = long-form-live-status` plus the ready-gated form via `supportedOperatorStatusGateVersion = 1` / `supportedOperatorStatusGateKind = ready-gated-long-form-live-status` and the dedicated transport via `supportedOperatorStatusTransport = dedicated-endpoint` / `supportedOperatorStatusEndpoint = /state/private-core-status`
- `npm run private-core:operator-status-json`
  prints the live operator summary plus the canonical shipping decision as machine-readable JSON
- `npm run private-core:operator-status-check`
  runs the ready-gated human-readable form of that long operator-status surface from the dedicated `/state/private-core-status-check` endpoint and fails with structured `Operator status decision status:` / `Operator status decision note:` lines on blocked paths; the frozen contract now treats that gate as its own operator transport via `supportedOperatorStatusGateTransport = dedicated-endpoint` / `supportedOperatorStatusGateEndpoint = /state/private-core-status-check`
- `npm run private-core:operator-status-check-json`
  runs the ready-gated machine-readable form of that same long operator-status surface from `/state/private-core-status-check`; it succeeds only when the frozen narrow lane is ready and otherwise fails with full operator-status JSON plus structured operator-status decision status/note stderr
- `npm run private-core:operator-snapshot`
  prints the bundled operator snapshot as a human-readable contract + status + shipping artifact from the dedicated snapshot endpoint
- `npm run private-core:operator-snapshot-json`
  prints one bundled machine-readable operator snapshot from the dedicated `/state/private-core-snapshot` endpoint, containing the frozen contract, the live summary, and the canonical shipping decision together; the shared app runtime now hydrates its operator contract/summary/shipping state from that same bundled endpoint
- `npm run private-core:operator-snapshot-check`
  runs the ready-gated human-readable form of that bundled snapshot and fails with structured `Snapshot decision status:` / `Snapshot decision note:` lines on blocked paths; the frozen contract now treats that bundled ready gate as its own operator transport via `supportedOperatorSnapshotGateTransport = dedicated-endpoint` / `supportedOperatorSnapshotGateEndpoint = /state/private-core-snapshot-check`
- `npm run private-core:operator-snapshot-check-json`
  runs the ready-gated form of that bundled snapshot; it succeeds only when the frozen narrow lane is ready and otherwise fails with the bundled snapshot JSON plus structured snapshot decision status/note stderr
- `npm run private-core:shipping-artifact`
  prints the release-grade human-readable operator artifact from the dedicated `/state/private-core-shipping-artifact` endpoint, including the shipping decision, current-root lineage, latest proof/send/consume/release lineage, and the bundled contract/status/shipping snapshot in one handoff surface
- `npm run private-core:shipping-artifact-json`
  prints that same release-grade operator artifact as machine-readable JSON from the dedicated `/state/private-core-shipping-artifact` endpoint
- `npm run private-core:shipping-artifact-check`
  runs the ready-gated human-readable form of that release artifact and fails with structured `Artifact decision status:` / `Artifact decision note:` lines on blocked paths; the frozen contract now carries that ready-gated release artifact transport explicitly via `supportedShippingArtifactGateTransport = dedicated-endpoint` / `supportedShippingArtifactGateEndpoint = /state/private-core-shipping-artifact-check`
- `npm run private-core:shipping-artifact-check-json`
  runs the machine-readable ready-gated form of that release artifact; it succeeds only when the frozen narrow lane is ready and otherwise fails with the full artifact JSON plus structured artifact decision status/note stderr
- `npm run private-core:release-candidate`
  prints the exact narrow private-core send -> consume -> release candidate from the dedicated `/state/private-core-release-candidate` endpoint, including the bound `releaseCandidateId`, send lineage, consume lineage, release lineage, and the bundled snapshot identity behind that exact run. The frozen contract now also states that this exact-run candidate is canonical only for the primary `send -> unshield` path; `send-change` and `send-chain` downstream release variants remain valid release paths but sit outside the exact candidate lineage contract.
- `npm run private-core:release-candidate-json`
  prints that same exact-run candidate as machine-readable JSON from `/state/private-core-release-candidate`
- `npm run private-core:release-candidate-check`
  runs the ready-gated human-readable form of that exact-run candidate and fails with structured `Release candidate decision status:` / `Release candidate decision note:` lines on blocked paths
- `npm run private-core:release-candidate-check-json`
  runs the machine-readable ready-gated form of that same exact-run candidate; it succeeds only when the exact candidate is coherent and otherwise fails with the full candidate JSON plus structured release-candidate decision status/note stderr
- `npm run private-core:release-package`
  prints the final operator-owned downloadable release package from the dedicated `/state/private-core-release-package` endpoint, including the exact candidate id, shipping decision identity, current root, and the latest proof/send/consume/release lineage for the canonical primary `send -> unshield` lane
- `npm run private-core:release-package-json`
  prints that same release package as machine-readable JSON from `/state/private-core-release-package`
- `npm run private-core:release-package-check`
  runs the ready-gated human-readable form of that release package and fails with structured `Release package decision status:` / `Release package decision note:` lines on blocked paths
- `npm run private-core:release-package-check-json`
  runs the machine-readable ready-gated form of that same release package; it succeeds only when the primary exact candidate is coherent and otherwise fails with the full package JSON plus structured release-package decision status/note stderr
- `npm run private-core:release-readiness`
  prints the final reviewer-facing release-readiness summary for the canonical primary `send -> unshield` lane by bundling the compact shipping decision, exact release-candidate surface, and operator-owned release package into one final human-readable judgment
- `npm run private-core:release-readiness-json`
  prints that same final reviewer-facing readiness summary as machine-readable JSON
- `npm run private-core:release-readiness-check`
  runs the strict ready-gated human-readable form of that final readiness summary and fails with structured `Release readiness status:` / `Release readiness note:` lines on blocked paths
- `npm run private-core:release-readiness-check-json`
  runs the machine-readable ready-gated form of that same final readiness summary; it succeeds only when the primary exact candidate is handoff-ready and otherwise fails with the full readiness JSON plus structured release-readiness status/note stderr
- `npm run private-core:demo-preflight`
  now self-hosts a temporary local operator when no `--base-url` or `VANTA_PRIVATE_CORE_OPERATOR_BASE_URL` is provided, so the full reviewer/demo preflight can run end to end without depending on a separately managed live operator process
- current repo truth is now explicit:
  - the narrow private-core `zk v1` lane is the accepted shipping definition of `zk v1`
  - the broader Vanta privacy/product vision is still larger than that shipped narrow lane
  - canonical decision note:
    - [docs/zk/vanta-zk-v1-shipping-decision.md](/Users/clay/Desktop/Vanta/docs/zk/vanta-zk-v1-shipping-decision.md)
- the app now also surfaces that same exact primary lane as a first-class release handoff workflow in-product:
  - prepare
  - check
  - ship
  - handoff status
  - next recommended action
  - release package status
  - release package identity
- the app now also treats that operator-owned package like a real reviewer handoff:
  - `Send` and `Unshield` expose:
    - `Copy operator package summary`
    - `Copy operator package JSON`
    - `Download package summary`
    - `Download package JSON`
  - `Dashboard` now shows a dedicated exact release review card for the canonical primary lane
  - `Dashboard` and the shared private-core diagnostics now point directly at:
    - `npm run private-core:release-readiness`
    - `npm run private-core:release-readiness-check`
- `npm run private-core:shipping-status`
  prints the compact operator-backed shipping summary for the frozen narrow zk-v1 lane from the dedicated `/state/private-core-shipping-decision` endpoint, which now serves as the canonical ship/no-ship contract for that frozen lane, including the decision version/kind/status/note, summary-state version, mirrored contract version, current summary generation time, and the supporting finish-line, required-lanes, release-boundary, contract-mirror, and boundary summaries; `private-core:shipping-check` now reads the dedicated `/state/private-core-shipping-decision-check` gate endpoint directly and fails with structured shipping status/note lines on blocked paths
- `npm run private-core:shipping-status-json`
  prints that same compact readiness surface as JSON for automation and external tooling, including the canonical decision fields
- `npm run private-core:shipping-check-json`
  runs the machine-readable ready-gate form of the same compact shipping surface; it succeeds only when the frozen narrow lane is ready and otherwise fails with the JSON surface plus structured status/note stderr

The current frozen operator-backed private-core contract now states the narrow accepted `v1` path explicitly:
- `contractVersion = 21`
- `summaryVersion = 45`
- `supportedShippingDecisionVersion = 1`
- `supportedShippingDecisionKind = narrow-private-core-zk-v1-shipping`
- `supportedOperatorSnapshotVersion = 1`
- `supportedOperatorSnapshotKind = contract-status-shipping-bundle`
- `supportedOperatorSnapshotTransport = dedicated-endpoint`
- `supportedOperatorSnapshotEndpoint = /state/private-core-snapshot`
- `supportedReleaseCandidateVersion = 1`
- `supportedReleaseCandidateKind = exact-run-send-consume-release-candidate`
- `supportedReleaseCandidateScope = primary-send-unshield-only`
- `supportedSendV1Decision = accepted-narrow-v1-path`
- `supportedUnshieldV1Decision = accepted-narrow-v1-path`
- `supportedReleaseV1Decision = accepted-narrow-v1-path`
- `supportedSwapV1Decision = accepted-narrow-v1-path`
- `supportedSwapLaneKind = single-input-usdc-to-shielded-sol`
- `supportedSwapVenue = meteora-dlmm-mainnet`

These commands do not make the protocol finished, but they do make the current first zk boundary concrete and repeatable.

For the current live demo order and fallback path, see:

`docs/zk/vanta-private-core-demo-runbook.md`

---

## Roadmap

### Phase 1 - Shield + Private Send
Build the first complete privacy loop:
- shield supported assets
- represent shielded balances
- support the first private workflow: send
- create a coherent transition from public wallet state to shielded state

### Phase 2 - Private Swap
Extend shielded state into privacy-preserving asset exchange flows.

### Phase 3 - Private Pay
Support merchant-oriented and commerce-facing payment flows built on shielded balances.

### Phase 4 - Vanta Network
Expand into developer tooling, APIs, broader ecosystem integrations, and long-term privacy-native Solana infrastructure.

---

## Target users

Vanta is being designed for:
- users who want more discretion around the assets they hold and move
- traders who do not want every position and transfer publicly legible
- teams who need more confidential treasury and operational flows
- builders who want privacy-preserving primitives they can integrate into applications
- commerce operators who may eventually need private payment rails and shielded settlement flows

---

## What makes Vanta different

Vanta does not present privacy as an isolated feature or vague promise. It starts with shielded asset state as the foundation, making the system easier to understand, more coherent architecturally, and more extensible into swaps, payments, and future Solana workflows.

The project is intentionally product-led:
- clear user journey
- serious visual design
- honest MVP scope
- credible long-term expansion path

---

## Demo script - 30 seconds

Vanta is a privacy layer for Solana that makes private value movement feel like a product instead of a cryptography demo. Today, the app already supports a constrained mainnet shielded-state loop for `USDC` and native SOL, and the real `/app/pay` surface now opens on a Vanta Pay Suite preview with payment creation, checkout modes, payment links, invoices, subscriptions, refunds, withdrawals, reconciliation, developer controls, route preview, receipt preview, transaction evidence, and beta disabled state. Underneath that, the repo includes a real Private Core proof lane, so the zk boundary is executable, not hypothetical.

## Demo script - 60 seconds

Solana is fast and accessible, but it is transparent by default. Vanta is our answer: a privacy layer that starts with shielding, because shielded state is the cleanest entrypoint for useful private workflows. Today, Vanta already supports a constrained real mainnet lifecycle for `USDC` and direct native SOL shield entry: users can connect a wallet, shield into Vanta, evolve note-based state through Send and a constrained `USDC -> SOL` swap lane, and unshield through authenticated operator-backed flows that verify the referenced transition before release and persist release records across restarts. The wallet picker also includes a contextual Peer top-up recovery path for disconnected or unfunded users.

The demo wedge goes further than the wallet flow. The real `/app/pay` surface is now a Vanta Pay Suite preview: payment creation, checkout modes, payment links, invoices, subscriptions, refunds, withdrawals, reconciliation, developer controls, route preview, receipt preview, transaction evidence, and beta disabled state. That keeps the private-settlement story legible while showing the embedded merchant surface Vanta is growing toward.

Underneath the product, the repo also includes a standalone Vanta Private Core proof lane with a fixed-depth Noir single-note unshield circuit, local proof generation and verification, operator-backed consume and release checks, and replay rejection. It is still narrow and still not production-ready, but it proves the first zk boundary is real today rather than just roadmap copy.

---

## Judge FAQ

### Does Vanta actually work today?

Yes, in a constrained mainnet form. Users can connect a wallet, shield `USDC` into Vanta's note-based state, shield native SOL directly into shielded SOL state, execute constrained Send transitions, swap through a constrained one-way `USDC -> SOL` lane, and unshield both `USDC` and shielded `SOL` back to Public Wallet through authenticated operator-backed flows with onchain transition verification. The app also includes a merchant-demo Pay surface and a contextual Peer top-up recovery path in the wallet picker. The implementation is still early and does not yet provide final zk privacy semantics.

Separately, the repo also contains a real standalone private-core proof lane for the first single-note unshield consume boundary.

### Is this just a front-end prototype?

No. The current app is still product-led and intentionally narrow, but it already uses real wallet-connected asset detection, real onchain note records, explicit note identity, spent-marker semantics, authenticated Unshield intent, operator-side onchain verification, persistent release records for the current constrained `USDC` / `SOL` lanes, and real Pay trust/status/API/browser verification surfaces.

It also includes a real executable Noir circuit and local/operator-backed proof verification path for the first Vanta Private Core unshield lane.

The operator-backed lane is now also summary-driven across the app, CLI, and regression commands, so the current verifier-side state is inspected through one coherent snapshot rather than ad hoc endpoint reads.

### Is the protocol complete?

No. The current system is an early constrained protocol loop around USDC plus direct native SOL shield entry. It still lacks final zk proofs, final nullifier design, broad recipient privacy semantics, generalized direct multi-asset private pools, and broader protocol generalization.

The private-core proof lane makes the first zk boundary real, but it should still be understood as a narrow v0.1 proving lane rather than a complete finished privacy protocol.

### Do you have a real zk circuit today?

Yes. The repo includes a fixed-depth Noir single-note unshield circuit for the standalone Vanta Private Core lane, plus:
- valid/invalid circuit regression checks
- source-layer send application regression checks
- send-to-unshield continuity regression checks
- recipient-side send recovery regression checks
- local proof generation and verification
- operator-backed proof execution
- replay rejection and operator-state smoke coverage

The best concrete verification command is:

```bash
npm run private-core:demo-readiness
```

If the operator is already running, the quickest live status readout is:

```bash
npm run private-core:operator-contract
npm run private-core:operator-status
```

The contract readout gives the static narrow-zk-v1 support contract:
- `contractVersion = 17`
- `summaryVersion = 41`
- supported shipping-decision contract
- supported send / unshield / release / swap lanes
- supported product flow
- supported asset / environment
- supported note schema / version
- supported root-registration provenance
- supported send resulting-root basis
- supported send input-root policy
- supported send output-registration policy
- supported swap resulting-root basis
- supported swap input-root policy
- supported swap output-registration policy
- supported constrained swap venue / output model
- supported recipient / release-destination models
- supported proof system
- supported unshield / send circuits
- supported fixed Merkle depths
- supported release authorization / root policy
- supported release execution / atomicity / persistence
- owner-auth mode
- nullifier-key mode
- proving hash lane

The status readout now includes proof/send, proof/consume, and proof/release linkage across the operator summary boundary, the supported send-lane version and identity carried by the operator summary, explicit release authorization / root-policy fields for the current unshield lane, persisted swap execution venue / quote-reference context for the latest constrained swap transition, plus explicit downstream root-registration provenance (`shield-input`, `send-recipient-output`, `send-change-output`, or `swap-output`) when continuity has been established.
It now also includes explicit contract-mirror status so the live summary says whether it is still mirroring the frozen private-core operator contract surface.
It now also includes explicit send-boundary status so the private-send lane reads as one operator-owned health summary instead of only a bundle of lower-level linkage rows.
It now also includes explicit send-continuity status so the downstream send path reads as one live verifier-state summary instead of only a bundle of lower-level root and registration rows.

The same operator contract now also versions the supported narrow unshield lane:
- `supportedUnshieldLaneVersion = 1`
- `supportedUnshieldLaneKind = single-note-proof-backed-consume`
- `supportedUnshieldLaneStatus = supported`
- `supportedReleaseLaneVersion = 1`
- `supportedReleaseLaneKind = proof-backed-consume-latest-registered-root`
- `supportedReleaseLaneStatus = supported`
- `supportedReleaseV1Decision = accepted-narrow-v1-path`
- `supportedSwapV1Decision = accepted-narrow-v1-path`
- `supportedSwapLaneVersion = 1`
- `supportedSwapLaneKind = single-input-usdc-to-shielded-sol`
- `supportedSwapLaneStatus = supported`
- `supportedSwapVenue = meteora-dlmm-mainnet`
- `supportedSwapOutputModel = shielded-sol-output-note`
- `supportedSwapResultingRootBasis = client-declared`
- `supportedSwapInputRootPolicy = latest-registered-root-with-linked-registration-proof`
- `supportedSwapOutputRegistrationPolicy = resulting-root-must-register-as-swap-output`
- `supportedFlowVersion = 1`
- `supportedFlowKind = shield-hold-send-unshield-replay-guard`
- `supportedFlowStatus = supported`
- `supportedAssetSymbol = USDC`
- `supportedEnvironment = solana-mainnet`
- `supportedNoteSchema = note-v0`
- `supportedNoteVersion = 0`
- `supportedRootRegistrationProvenance = shield-input|send-recipient-output|send-change-output|swap-output`
- `supportedSendResultingRootBasis = client-declared`
- `supportedRecipientModel = hashed-reference-to-owner-key`
- `supportedReleaseDestinationModel = 32-byte-release-destination-field`
- `supportedProofSystem = noir-acir-ultrahonk-bbjs`
- `supportedUnshieldCircuit = vanta_private_core_single_note_unshield`
- `supportedSendCircuit = vanta_private_core_single_note_send`
- `supportedUnshieldMerkleDepth = 3`
- `supportedSendMerkleDepth = 3`
- `supportedReleaseAuthorizationBasis = proof-backed-consume`
- `supportedReleaseRootPolicy = latest-registered-root`
- `supportedReleaseExecutionModel = operator-recorded-mainnet-release`
- `supportedReleaseAtomicityModel = operator-local-atomic-consume-and-release-record`
- `supportedReleasePersistenceModel = json-store-v1`
- `supportedOwnerAuthorizationMode = off-circuit-prechecked-v0-1`
- `ownerAuthorizationDecision = accepted-v1-off-circuit-precheck`
- `sourceArtifactTruthBasis = source-layer-artifact-bundle`
- `provingArtifactTruthBasis = verified-proving-public-input-vector`
- `sourceProvingRelationship = explicit-split-no-implicit-equality`
- `nullifierKeyDecision = accepted-v1-temporary-note-secret-key`
- `supportedNullifierKeyMode = note-secret-temporary-v0-1`
- `supportedProvingHashLane = poseidon-bn254-proving-lane-v0`

If you want one demo-operator command that does the full verification pass, prints the live operator summary, and then prints the compact shipping summary, use:

```bash
npm run private-core:demo-preflight
```

If you want the shortest operator-backed answer to whether the frozen narrow lane is actually ship-ready right now, use:

```bash
npm run private-core:shipping-status
```

### Is shielding the same as hiding assets in a normal wallet?

No. Vanta's model is that supported assets move out of ordinary transparent wallet flows and into a privacy-preserving Vanta layer. The product should be understood as creating shielded state, not making normal public wallet accounts invisible.

### Why is Shield the first product?

Because privacy needs a coherent entrypoint. Shielding is the action that creates private state, and Private Send becomes the first natural workflow from there.

### Why not make Send the whole MVP?

Because send alone lacks a clean product foundation. Shield + Private Send forms a complete privacy loop and makes the rest of the suite easier to understand.

### What is live now versus roadmap?

The current implementation supports a constrained real mainnet lifecycle for `USDC` with real wallet connection, real deposit-backed Shield, note-based state evolution through Send, a constrained one-way `USDC -> SOL` swap lane, direct native SOL shield entry into shielded SOL state, constrained operator-backed `USDC` and `SOL` unshield, Strategy planning/runtime surfaces, a wallet-picker Peer recovery path, and a real Pay merchant harness with trust-status surfaces, approval-packet checks, signed webhooks, browser checks, Postgres-backed staging persistence, and a Render staging connection to the Private Pool v2 operator. What is still roadmap is the broader version of all of that: final zk/privacy semantics, generalized assets, production merchant settlement, and mainnet-ready private infrastructure.

The repo also includes the first Vanta Private Core proof lane with local proof generation, operator-backed verification, and replay rejection, but broader zk product completion remains future work.

### Is Vanta just a privacy-themed concept?

No. Vanta is being built as a product-led privacy layer with a clear user journey, coherent app flow, and constrained but real early protocol loops around USDC, direct native SOL shield entry, and staging Pay settlement today.

### Why is this relevant to Solana commerce?

Commerce requires discretion. As Solana grows into a platform for payments, products, and real economic activity, privacy-preserving holding and transaction flows become more important. Vanta Pay is the first concrete step toward making that privacy legible and usable for commerce operators instead of leaving it as protocol theory.

---

## One-line internal rule

If someone asks what Vanta is, the shortest correct answer is:

> Vanta is a shield-first privacy app for Solana that lets users move supported assets out of public wallet flows and use them through private workflows beginning with send.

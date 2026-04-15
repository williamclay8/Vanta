# Vanta - Hackathon Submission Package

## Project name

**Vanta**

## Tagline

**Shield first. Move privately.**

## Short description

Vanta is a zk-powered privacy layer for Solana that lets users shield supported assets from public wallet flows and use them through private workflows beginning with send.

## Medium description

Vanta is building a practical privacy layer for Solana. The project starts with the first complete Vanta loop: **Shield + Private Send**, allowing users to move supported assets out of transparent wallet flows and into a shielded state designed for more private activity. From that foundation, Vanta expands toward private swaps, private payments, and broader privacy-native workflows for users, traders, teams, builders, and commerce.

Vanta currently supports a constrained real devnet lifecycle for one supported asset, VUSD, including wallet-connected Shield, note-based shielded state, constrained Send transitions, a constrained one-way `VUSD -> SOL` Meteora-backed swap lane, and operator-backed `VUSD` and `SOL` unshield with authenticated request intent and operator-side verification of referenced onchain transition state. The current implementation is intentionally narrow and does not yet provide final zk privacy semantics, but it is no longer only a front-end prototype.

The repo also now contains a standalone **Vanta Private Core** zk lane for the first real single-note unshield proof boundary, including a fixed-depth Noir circuit, local proof generation and verification, replay rejection, and an operator-backed proof/registration/consume path.

## Full description

Solana has become one of the most important execution layers in crypto, but one thing remains missing: practical privacy. Wallet balances, asset holdings, transfers, counterparties, and behavior patterns are easy to trace across transparent onchain systems.

Vanta exists to close that gap.

Rather than treating privacy as a single isolated transaction feature, Vanta begins at the right entrypoint: **shielding**. Users move supported assets from ordinary transparent wallet flows into a privacy-preserving Vanta layer, where those assets can be held in shielded state and used through private workflows. The first complete product loop is **Shield + Private Send**, which provides the foundation for future **Private Swap**, **Private Pay**, and broader privacy-native Solana applications.

For the hackathon, Vanta is presented as a focused but ambitious privacy suite:
- a polished website and product application
- a coherent product architecture
- a strong MVP wedge built around shielded state
- a real first zk proof lane for the standalone private-state core
- a clear roadmap from private transfer infrastructure to broader Solana commerce and ecosystem workflows

Vanta is designed for users, traders, teams, builders, and eventually merchants who need more than speed and low fees; they need discretion.

---

## Problem statement

Solana is transparent by default. Holdings, transfers, counterparties, and behavioral patterns are easy to trace across transparent onchain systems. That creates real problems for users, traders, teams, and businesses that need basic financial privacy and operational discretion.

## Solution statement

Vanta introduces a privacy-preserving layer for Solana that starts by allowing users to shield supported assets out of public wallet flows and into shielded state. From there, users can access private workflows beginning with send, with swap and payment functionality extending naturally from the same foundation.

## Why now

As Solana matures into a serious environment for finance, applications, and commerce, privacy becomes a missing piece of infrastructure. Users do not stop needing discretion simply because they move onchain. Vanta is being built to make privacy feel usable, structured, and native to the next era of Solana activity.

## Why this hackathon

This hackathon is the right environment to show Vanta’s wedge clearly: a product-led Solana privacy layer with a real early protocol loop, a meaningful first zk boundary, and a credible path from shielded state into broader private transfer, swap, and payment workflows.

---

## Product thesis

Vanta is a zk-powered privacy layer for Solana that lets users shield assets from public wallet flows and use them through private send, swap, and payment workflows.

## Product truth

The first complete Vanta loop is:

**Public Wallet -> Shield -> Shielded State -> Send -> Unshield**

This is the core mental model of the product.

## Important clarification

Shielding does **not** mean standard wallet balances magically become invisible. It means supported assets move out of ordinary transparent wallet flows and into a privacy-preserving Vanta layer designed for more private actions.

---

## MVP

The MVP is **Shield + Private Send**:
- shield supported assets into the Vanta privacy layer
- maintain shielded state
- use that state through the first private workflow: send

## Current implementation status

Vanta currently supports a constrained real devnet lifecycle for one supported asset, `VUSD`.

### Live now
- real wallet connection
- real public wallet balance detection for `VUSD`
- real shield deposits into a Vanta-controlled path
- real onchain shield notes
- real onchain send notes
- real constrained `VUSD -> SOL` Meteora devnet swap
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
- pay remains future work

The current Unshield path is operator-backed and intentionally constrained, but it now requires authenticated wallet intent, verifies referenced onchain transition state before release, and persists completed release records to prevent duplicate execution across restarts.

The current Vanta Private Core lane is also intentionally constrained. It proves the first real single-note unshield boundary and operator-backed verifier path, but it is not yet the full final Vanta privacy protocol.

This means Vanta should be understood as a real early protocol for one asset with constrained note-based state transitions, rather than only as a front-end prototype.

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
- Swap and Pay as future-facing modules
- shared app-level continuity between Shield and Send
- internal Vanta Private Core diagnostics and proof-boundary views for the first zk lane

### Current live flow
**Public Wallet -> Shield -> Shielded State -> Send / Swap -> Unshield**

---

## Technical checkpoints

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
  runs the full verification pass and then prints the current operator-side contract and status summaries
- `npm run private-core:operator-contract`
  prints the static operator-side private-core contract surface for the current narrow zk-v1 lane
- `npm run private-core:operator-status`
  prints the current operator-side root, proof, send-proof, send-transition, consume, and release state when the operator server is running, including proof/send, proof/consume, proof/release, and root-registration proof linkage plus send resulting-root continuity status, resulting-root provenance, and the matched resulting-root record when available

The current frozen operator-backed private-core contract now states the narrow accepted `v1` path explicitly:
- `contractVersion = 9`
- `summaryVersion = 28`
- `supportedSendV1Decision = accepted-narrow-v1-path`
- `supportedUnshieldV1Decision = accepted-narrow-v1-path`
- `supportedReleaseV1Decision = accepted-narrow-v1-path`
- `supportedSwapV1Decision = accepted-narrow-v1-path`
- `supportedSwapLaneKind = single-input-vusd-to-shielded-sol`
- `supportedSwapVenue = meteora-dlmm-devnet`

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

Vanta is a zk-powered privacy layer for Solana that starts with the right first primitive: shielding. Today, Vanta already supports a constrained real devnet lifecycle for one supported asset, VUSD, where users can connect a wallet, Shield into Vanta’s note-based state, move value through constrained Send transitions, swap through a constrained one-way `VUSD -> SOL` lane, and Unshield both `VUSD` and shielded `SOL` back to Public Wallet through authenticated operator-backed flows. It is intentionally narrow, but it proves the core architecture is becoming real.

Alongside that, the repo now includes the first executable Vanta Private Core unshield circuit and operator-backed proof lane, so the zk boundary is no longer only hypothetical.

## Demo script - 60 seconds

Solana is fast and accessible, but holding and moving assets on it is public by default. Vanta is our answer: a privacy layer for Solana that begins with shielding supported assets into a separate Vanta state system. Today, the project already supports a constrained real devnet lifecycle for one asset, VUSD: users can connect a wallet, Shield into Vanta, create and evolve note-based shielded state, execute constrained Send transitions, swap through a constrained one-way `VUSD -> SOL` Meteora-backed lane, and Unshield both `VUSD` and shielded `SOL` back to Public Wallet through authenticated operator-backed flows that verify the referenced onchain transition before release and persist completed release records across restarts. It is not yet the final zk privacy system, but it is no longer just a front-end concept - it is an early protocol loop with real state transitions and a meaningfully hardened operator boundary.

The repo also now includes a standalone Vanta Private Core proof lane with a fixed-depth Noir single-note unshield circuit, local proof generation and verification, operator-backed consume and release checks, and replay rejection. That lane is still narrow, but it makes the first real zk boundary concrete today instead of leaving it as future architecture only.

---

## Judge FAQ

### Does Vanta actually work today?

Yes, in a constrained devnet form for one supported asset, VUSD. Users can connect a wallet, Shield the asset into Vanta’s note-based state, execute constrained Send transitions, swap through a constrained one-way `VUSD -> SOL` lane, and Unshield both `VUSD` and shielded `SOL` back to Public Wallet through authenticated operator-backed flows with onchain transition verification. The implementation is still early and does not yet provide final zk privacy semantics.

Separately, the repo also contains a real standalone private-core proof lane for the first single-note unshield consume boundary.

### Is this just a front-end prototype?

No. The current app is still product-led and intentionally narrow, but it already uses real wallet-connected asset detection, real onchain note records, explicit note identity, spent-marker semantics, authenticated Unshield intent, operator-side onchain verification, and persistent release records for one asset.

It also includes a real executable Noir circuit and local/operator-backed proof verification path for the first Vanta Private Core unshield lane.

The operator-backed lane is now also summary-driven across the app, CLI, and regression commands, so the current verifier-side state is inspected through one coherent snapshot rather than ad hoc endpoint reads.

### Is the protocol complete?

No. The current system is an early constrained protocol loop for one supported asset. It still lacks final zk proofs, nullifiers, recipient privacy, multi-asset support, and broader protocol generalization.

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
- `contractVersion = 8`
- `summaryVersion = 27`
- supported send / unshield / release / swap lanes
- supported product flow
- supported asset / environment
- supported note schema / version
- supported root-registration provenance
- supported send resulting-root basis
- supported send input-root policy
- supported send output-registration policy
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

The status readout now includes proof/send, proof/consume, and proof/release linkage across the operator summary boundary, the supported send-lane version and identity carried by the operator summary, explicit release authorization / root-policy fields for the current unshield lane, plus explicit send-root registration provenance (`shield-input`, `send-recipient-output`, or `send-change-output`) when downstream continuity has been established.
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
- `supportedSwapLaneKind = single-input-vusd-to-shielded-sol`
- `supportedSwapLaneStatus = supported`
- `supportedSwapVenue = meteora-dlmm-devnet`
- `supportedSwapOutputModel = shielded-sol-output-note`
- `supportedFlowVersion = 1`
- `supportedFlowKind = shield-hold-send-unshield-replay-guard`
- `supportedFlowStatus = supported`
- `supportedAssetSymbol = VUSD`
- `supportedEnvironment = solana-devnet`
- `supportedNoteSchema = note-v0`
- `supportedNoteVersion = 0`
- `supportedRootRegistrationProvenance = shield-input|send-recipient-output|send-change-output`
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
- `supportedReleaseExecutionModel = operator-recorded-devnet-release`
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

If you want one demo-operator command that does both the full verification pass and the live operator summary, use:

```bash
npm run private-core:demo-preflight
```

### Is shielding the same as hiding assets in a normal wallet?

No. Vanta's model is that supported assets move out of ordinary transparent wallet flows and into a privacy-preserving Vanta layer. The product should be understood as creating shielded state, not making normal public wallet accounts invisible.

### Why is Shield the first product?

Because privacy needs a coherent entrypoint. Shielding is the action that creates private state, and Private Send becomes the first natural workflow from there.

### Why not make Send the whole MVP?

Because send alone lacks a clean product foundation. Shield + Private Send forms a complete privacy loop and makes the rest of the suite easier to understand.

### What is live now versus roadmap?

The current implementation supports a constrained real devnet lifecycle for `VUSD` with real wallet connection, real deposit-backed Shield, note-based state evolution through Send, a constrained one-way `VUSD -> SOL` swap lane, and constrained operator-backed `VUSD` and `SOL` unshield. Pay and broader generalization remain future work.

The repo also includes the first Vanta Private Core proof lane with local proof generation, operator-backed verification, and replay rejection, but broader zk product completion remains future work.

### Is Vanta just a privacy-themed concept?

No. Vanta is being built as a product-led privacy layer with a clear user journey, coherent app flow, and a constrained but real early protocol loop for one asset today.

### Why is this relevant to Solana commerce?

Commerce requires discretion. As Solana grows into a platform for payments, products, and real economic activity, privacy-preserving holding and transaction flows become more important. Vanta is designed to become that missing privacy layer.

---

## One-line internal rule

If someone asks what Vanta is, the shortest correct answer is:

> Vanta is a zk-powered privacy layer for Solana that lets users shield assets from public wallet flows and use them through private workflows beginning with send.

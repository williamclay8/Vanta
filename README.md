# Vanta

**Shield first. Move privately.**

Vanta is a zk-powered privacy layer for Solana that lets users shield assets from public wallet flows and use them through private workflows beginning with send.

Vanta currently supports a constrained real devnet lifecycle for one supported asset, VUSD, including wallet-connected Shield, note-based shielded state, constrained Send transitions, a constrained one-way `VUSD -> SOL` Meteora-backed swap lane, and operator-backed `VUSD` and `SOL` unshield with authenticated request intent and operator-side verification of referenced onchain transition state. The current implementation is intentionally narrow and does not yet provide final zk privacy semantics, but it is no longer only a front-end prototype.

The repo also now includes a standalone **Vanta Private Core** lane for the first shield-hold-unshield proof boundary:
- canonical `NoteV0`
- deterministic commitments, Merkle paths, nullifiers, and replay rejection
- a fixed-depth Noir single-note unshield circuit
- local proof generation and verification
- operator-backed proof, root-registration, consume, and release-state checks

---

## What is Vanta?

Solana made onchain activity fast, cheap, and accessible. It did not make it private.

Wallet balances, transfers, counterparties, and behavioral patterns are easy to trace across transparent onchain systems. Vanta exists to close that gap.

Rather than treating privacy as a one-off transaction feature, Vanta begins at the right entrypoint: **shielding**. Supported assets move from ordinary transparent wallet flows into the Vanta privacy layer, where they can be held in shielded state and used through private workflows.

The first complete Vanta loop is:

**Public Wallet -> Shield -> Shielded State -> Send / Swap -> Unshield**

That foundation later expands into:
- **Private Swap**
- **Private Pay**
- broader privacy-native Solana workflows

### Important clarification

Shielding does **not** mean standard wallet balances magically become invisible. It means supported assets move out of ordinary transparent wallet flows and into a privacy-preserving Vanta layer designed for more private actions.

---

## Current MVP direction

The current MVP is centered on **Shield + Private Send**:
- shield supported assets into the Vanta privacy layer
- maintain shielded state
- use shielded balance through the first private workflow: send

This is the first meaningful product behavior in the Vanta suite and now exists as a constrained real devnet protocol flow for one supported asset.

## What's live today

Vanta currently supports a constrained real devnet lifecycle for one supported asset, `VUSD`.

### Live now
- real Solana wallet connection
- real `VUSD` balance detection in public wallet state
- real shield deposits into a Vanta-controlled devnet path
- real onchain shield notes
- real onchain send notes
- real constrained `VUSD -> SOL` Meteora devnet swap
- real shielded `SOL` outputs resolved inside Vanta
- operator-backed constrained unshield back to Public Wallet
- operator-backed constrained SOL unshield back to Public Wallet
- explicit note identity
- explicit spent-marker semantics
- derived change-note evolution
- shielded balance resolved from the current spendable note set
- authenticated Unshield intent tied to the connected wallet
- operator-side verification of referenced onchain transition state before release
- persistent completed release records across operator restarts
- a connected Shield -> Swap -> Unshield flow grounded in Vanta-recognized state
- Vanta Private Core shield -> hold -> unshield -> replay-rejection demo flow
- first executable fixed-depth Noir unshield circuit for Vanta Private Core
- local proof generation via `npm run private-core:prove`
- full-stack private-core verification via `npm run private-core:verify`
- operator-backed proof execution for the current narrow private-core consume lane
- proof-backed private-core root registration
- explicit narrow-v1 acceptance decisions for the current private-core:
  - send lane
  - unshield lane
  - release lane

### Not live yet
- final zk proof system
- final nullifier architecture
- broader recipient-private send product semantics
- generalized multi-asset support
- pay
- production-grade protocol guarantees
- symmetric two-way market proof

The current implementation should be understood as a constrained but real early protocol for one asset, not just a mock interface and not yet the final privacy system.

The current private-core proof lane should be understood the same way: real and executable, but still intentionally narrow. It proves the first single-note unshield boundary and an operator-backed verifier path, not the full eventual Vanta privacy protocol.

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
- `/app` app shell entry
- `/app/shield`
- `/app/send`
- `/app/swap`
- `/app/unshield`
- `/app/pay`
- `/app/launch`

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

## Private Core verification

```bash
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
npm run private-core:swap-boundary-check
npm run private-core:swap-live-path-check
npm run private-core:swap-unshield-roundtrip-check
npm run private-core:contract-smoke
npm run private-core:send-http-smoke
npm run private-core:swap-http-smoke
npm run private-core:swap-transition-http-smoke
npm run private-core:swap-restart-check
npm run private-core:swap-unshield-restart-check
npm run private-core:verify
npm run private-core:demo-readiness
npm run private-core:demo-preflight
npm run private-core:operator-contract
npm run private-core:operator-status
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
  - `contractVersion = 15`
  - `summaryVersion = 39`
  - `supportedSendV1Decision = accepted-narrow-v1-path`
  - `supportedUnshieldV1Decision = accepted-narrow-v1-path`
  - `supportedReleaseV1Decision = accepted-narrow-v1-path`
  - `supportedSwapV1Decision = accepted-narrow-v1-path`
  - `supportedShippingDecisionKind = narrow-private-core-zk-v1-shipping`
  - `supportedSwapLaneKind = single-input-vusd-to-shielded-sol`
  - `supportedSwapVenue = meteora-dlmm-devnet`

`private-core:demo-readiness` is the friendliest single entrypoint when you just want to know whether the current proof/demo lane is stage-ready.

`private-core:demo-preflight` combines the full verification pass with the current operator contract surface, the full operator status summary, and the compact shipping summary.

`private-core:operator-contract` gives the static narrow zk-v1 contract the operator currently supports: send lane, unshield lane, release lane, swap lane, the canonical shipping-decision contract, supported flow, supported asset/environment, note contract, recipient/release-destination models, proof system, fixed circuit ids, fixed Merkle depth, owner-auth mode, nullifier-key mode, proving hash lane, root-registration provenance, send input-root policy, send output-registration policy, the current send resulting-root basis, and the currently supported constrained swap venue/output/root-policy model.

`private-core:operator-contract-json` prints that same frozen operator contract as machine-readable JSON, including the static shipping-decision contract fields, so automation can pin the frozen support surface directly instead of scraping the long-form text output.

`private-core:operator-status` gives a quick readout of the current operator root, proof, send-proof, swap-proof, send-transition, swap-transition, consume, and release state when the operator server is running, including proof/send, proof/swap, proof/consume, proof/release, and root-registration proof linkage. It now also prints the canonical shipping decision block directly from `/state/private-core-shipping-decision`, so the long-form operator dump explicitly includes the decision version, kind, status, and note behind the current ship/no-ship answer. It also reports the supported send-lane version and identity carried by the operator summary, plus the latest send resulting-root continuity status and the concrete registered root record behind that resulting root when one exists, so you can see whether the newest private-send root is still unregistered, current, stale, or already consumed/released downstream. The current private-core release lane now also carries explicit release authorization, root-policy, execution, atomicity, and persistence fields, so the operator summary says not just that a release was recorded, but that it was authorized by `proof-backed-consume` under the `latest-registered-root` policy, executed as an operator-recorded devnet release, atomically recorded with consume state in the local operator lane, and persisted in the current JSON store. The send lane still requires the current input root to stay linked to its registration proof before the operator will accept a transition, the resulting root remains explicitly `client-declared` until later registration proves continuity, and registered roots now carry explicit provenance as `shield-input`, `send-recipient-output`, `send-change-output`, or `swap-output`. The constrained swap lane now also has a proof-backed transition seam that requires the current input root to be registered and latest before the operator will persist swap state, keeps the latest swap proof and latest swap transition in the canonical operator summary, now preserves the latest swap execution venue and quote reference across summary reloads and restart, and proves that summary-backed swap state survives operator restart, while the resulting swap root remains explicitly `client-declared` in the current narrow lane.

`private-core:shipping-status` is the compact operator-backed answer to the narrow zk-v1 question: whether the frozen private-core lane is actually ship-ready right now, and if not, which live blocker is preventing that. It now reads the dedicated `/state/private-core-shipping-decision` endpoint, which is the canonical ship/no-ship contract for the frozen narrow private-core lane, and prints the decision version/kind/status/note plus the current summary-state version, mirrored contract version, summary generation time, and the supporting shipping, finish-line, required-lanes, release-boundary, contract-mirror, and boundary summaries without the rest of the larger operator-status dump.

`private-core:shipping-status-json` prints that same compact readiness surface as machine-readable JSON, including the canonical decision fields and both raw enum values and humanized labels for shipping, finish-line, required-lanes, release-boundary, contract-mirror, and boundary state.

`private-core:shipping-check` runs the same operator-backed shipping summary but exits non-zero unless the current summary says `Ready narrow v1`. On blocked paths it now fails with structured `Shipping status:` and `Shipping note:` stderr lines instead of a note-only message.

`private-core:shipping-check-json` is the machine-readable ready-gate form of that same command: it exits zero only for `Ready narrow v1`, prints the compact readiness JSON on success, and on blocked paths emits the JSON surface to stderr before the structured `Shipping status:` / `Shipping note:` lines.

The operator contract now freezes the narrow zk-v1 contract surface explicitly:
- `contractVersion = 15`
- `summaryVersion = 39`
- `supportedShippingDecisionVersion = 1`
- `supportedShippingDecisionKind = narrow-private-core-zk-v1-shipping`
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
- `supportedSwapResultingRootBasis = client-declared`
- `supportedSwapInputRootPolicy = latest-registered-root-with-linked-registration-proof`
- `supportedSwapOutputRegistrationPolicy = resulting-root-must-register-as-swap-output`
- `supportedFlowVersion = 1`
- `supportedFlowKind = shield-hold-send-unshield-replay-guard`
- `supportedFlowStatus = supported`
- `supportedAssetSymbol = VUSD`
- `supportedEnvironment = solana-devnet`
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
- `supportedUnshieldMerkleDepth = 3`
- `supportedSendMerkleDepth = 3`
- `supportedReleaseAuthorizationBasis = proof-backed-consume`
- `supportedReleaseRootPolicy = latest-registered-root`
- `supportedReleaseExecutionModel = operator-recorded-devnet-release`
- `supportedReleaseAtomicityModel = operator-local-atomic-consume-and-release-record`
- `supportedReleasePersistenceModel = json-store-v1`
- `supportedReleaseV1Decision = accepted-narrow-v1-path`
- `supportedOwnerAuthorizationMode = off-circuit-prechecked-v0-1`
- `ownerAuthorizationDecision = accepted-v1-off-circuit-precheck`
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
- `supportedUnshieldMerkleDepth = 3`
- `supportedSendMerkleDepth = 3`
- `supportedReleaseAuthorizationBasis = proof-backed-consume`
- `supportedReleaseRootPolicy = latest-registered-root`
- `supportedReleaseExecutionModel = operator-recorded-devnet-release`
- `supportedReleaseAtomicityModel = operator-local-atomic-consume-and-release-record`
- `supportedReleasePersistenceModel = json-store-v1`
- `ownerAuthorizationDecision = accepted-v1-off-circuit-precheck`
- `sourceArtifactTruthBasis = source-layer-artifact-bundle`
- `provingArtifactTruthBasis = verified-proving-public-input-vector`
- `sourceProvingRelationship = explicit-split-no-implicit-equality`
- `nullifierKeyDecision = accepted-v1-temporary-note-secret-key`

---

## What's in this repository

This repository currently contains:
- a polished landing page
- a modular application experience
- Shield as the primary entrypoint into the suite
- Send as the first workflow unlocked by shielded state
- an app-path Vanta Private Core send-proof check inside the Send experience
- shared app-level continuity between Shield and Send
- a constrained real devnet protocol path for `VUSD`
- authenticated operator-backed Unshield for `VUSD` and `SOL`
- a constrained one-way live `VUSD -> SOL` swap lane
- a standalone Vanta Private Core proof lane with operator-backed verification
- roadmap framing for Swap, Pay, and broader Vanta expansion

The current implementation is intentionally product-led. It focuses on:
- clear user understanding
- coherent privacy flow
- strong visual system
- extensible structure for stronger future protocol integration

---

## Notes for future integration

- app module pages already reserve space for wallet connection, protocol state, proving lifecycle, and transaction status
- Shield and Send share app-level privacy flow context
- real wallet-connected state now grounds the live `VUSD` path
- no fake wallet logic is included
- content and structure are organized for extension into real Solana privacy workflows

---

## Additional materials

For hackathon positioning, proof records, demo scripts, FAQ, and submission-ready descriptions, see:

`SUBMISSION.md`

For the current private-core proof/demo lane runbook, see:

`docs/zk/vanta-private-core-demo-runbook.md`

---

## Internal product rule

If someone asks what Vanta is, the shortest correct answer is:

> Vanta is a zk-powered privacy layer for Solana that lets users shield assets from public wallet flows and use them through private workflows beginning with send.

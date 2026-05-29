---
version: "vanta-design-contract-0.1"
name: "Vanta"
description: "Persistent product, trust, and interface contract for Vanta's merchant-first private-settlement surfaces."
scope:
  - "website"
  - "app-shell"
  - "wallet surfaces"
  - "merchant trust surfaces"
stability: "draft"
canonical_commands:
  build: "npm run build"
  design_contract_check: "npm run design:contract-check"
  private_core_verify: "npm run private-core:verify"
  pay_verify: "npm run pay:verify"
  wallet_signing_safety: "npm run wallet:browser-signing-safety-check"
  mainnet_readiness: "npm run mainnet:readiness-check"
colors:
  bg: "#020305"
  bgElevated: "rgba(8, 13, 20, 0.92)"
  bgSoft: "rgba(5, 8, 15, 0.96)"
  surface: "rgba(0, 229, 200, 0.04)"
  surfaceStrong: "rgba(0, 229, 200, 0.08)"
  border: "rgba(0, 229, 200, 0.11)"
  text: "#e8faf8"
  muted: "#6a8a92"
  mutedStrong: "rgba(232, 250, 248, 0.74)"
  accent: "#77f2d4"
  accentSoft: "rgba(119, 242, 212, 0.12)"
  success: "#77f2d4"
typography:
  display:
    fontFamily: "Syne"
    fontWeight: 700
    letterSpacing: "-0.04em"
  heading:
    fontFamily: "Syne"
    fontWeight: 700
  body:
    fontFamily: "Manrope"
    fontWeight: 500
  label:
    fontFamily: "Space Grotesk"
    fontWeight: 500
    letterSpacing: "0.12em"
  mono:
    fontFamily: "Space Mono"
    fontWeight: 400
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
actors:
  user: "End user interacting with wallet, checkout, and settlement surfaces."
  merchant: "Merchant/operator reading settlement, refund, withdrawal, and reconciliation state."
  operator: "Vanta-controlled service/operator surface exposing machine-readable status and evidence."
  reviewer: "Engineer, auditor, or partner verifying what Vanta proves and what it does not."
state_names:
  deployment:
    - "beta"
    - "production"
  wallet:
    - "disconnected"
    - "connected_unfunded"
    - "connected_funded"
  peer_onramp:
    - "hidden"
    - "disabled"
    - "install_required"
    - "connection_required"
    - "available"
    - "opened"
    - "fulfilled_pending_bridge"
    - "fulfilled"
    - "error"
  pay_settlement:
    - "preview"
    - "approve"
    - "execute"
    - "settle"
typed_invariants:
  - "No product surface may claim production readiness while readiness surfaces still report productionReady: false."
  - "Beta mode must not imply that live funds move."
  - "User-facing trust language must stay simple while underlying operator and verification surfaces remain typed and explicit."
  - "Private-settlement correctness outranks UI expansion."
  - "Verification commands are part of the product contract, not optional implementation detail."
allowed_claims:
  - "private"
  - "policy-legible"
  - "merchant-first"
  - "simulation before signing"
  - "controlled privacy"
  - "machine-checkable trust"
forbidden_claims:
  - "fully production-ready"
  - "audited"
  - "mainnet-ready"
  - "no funds move in beta mode" # only when beta mode is actually active
  - "trustless"
  - "unlimited privacy"
surface_contracts:
  wallet_picker:
    placement: "Contextual recovery and safety surface inside the existing wallet menu."
    truth: "Funding affordances are secondary, not primary navigation."
  pay_merchant:
    placement: "Merchant-facing control plane for settlement lifecycle and trust status."
    truth: "Lifecycle, refund, withdrawal, and reconciliation states must be legible without protocol jargon."
  signing_safety:
    placement: "Visible guardrail near wallet approval surfaces."
    truth: "Simulation before signing must be legible in both UI copy and machine-checked policy surfaces."
---

## Overview

Vanta is not a generic wallet and not a vague privacy brand. It is a merchant-first interface layer for private stablecoin settlement, with simple user-facing language and explicit, machine-checkable trust surfaces underneath.

This file adapts the `DESIGN.md` pattern to Vanta's real product problem: keeping UI style, product claims, state machines, verification commands, and operator truth aligned as the repo evolves. The visual system matters, but it is subordinate to the trust contract.

The dominant feeling should be premium, restrained, and operationally serious. Vanta should feel precise rather than playful, controlled rather than noisy, and legible rather than magical.

## Colors

The current visual identity is a dark control-plane palette with a single neon-mint accent (`#77f2d4`).

- `bg` is the canonical black-ink foundation.
- `accent` is reserved for action, success, and strategic emphasis.
- `muted` and `mutedStrong` should carry metadata, secondary explanation, and system texture rather than primary calls to action.
- Elevated surfaces should rely on contrast, depth, and sparse glow rather than many competing hues.

Do not introduce colorful feature-by-feature palettes that make protocol surfaces feel like unrelated products.

## Typography

Typography carries role separation:

- `Syne` is for high-confidence product framing, hero headlines, and decisive section titles.
- `Manrope` is for readable operational copy.
- `Space Grotesk` is for labels, eyebrows, and machine-adjacent metadata.
- `Space Mono` is for hashes, commands, amounts in technical contexts, and typed/runtime evidence.

This mix should make Vanta feel editorial and premium without losing terminal-grade precision.

## Layout

Vanta should prefer structured panels, clear information hierarchy, and generous negative space around important actions. Dense protocol state can exist, but it should be grouped behind calm surface boundaries rather than dumped into a single noisy pane.

Default layout rules:

- one primary task per panel
- one dominant CTA per surface
- supporting metadata visually quieter than the action path
- recovery paths integrated contextually instead of promoted as primary flows

The wallet picker rule from the Peer top-up design is canonical: recovery/funding actions belong in the existing control surface, not in a new top-level product area.

## Elevation & Depth

Depth should signal trust and focus, not decoration. Use elevated panels, soft glows, and restrained borders to distinguish control surfaces from background atmosphere.

Heavy skeuomorphic effects, playful glass tricks, or dramatic motion that obscures state changes are out of character. If depth does not improve legibility, remove it.

## Shapes

Rounded corners should stay consistent and modest. Vanta is not boxy-brutal and not bubbly-soft. Shapes should support a polished operations console aesthetic.

Prefer:

- `rounded.sm` for buttons and small controls
- `rounded.md` for cards and compact panels
- `rounded.lg` only for major framing containers when needed

## Components

Core component families are:

- app shell navigation
- wallet picker and wallet safety surfaces
- status panels
- merchant settlement cards
- preview and approval packets
- operator/reviewer evidence surfaces
- proof surface (`/app/proof`) for lane locks, trust packets, anonymity readiness, and verification commands

Trader-facing surfaces (dashboard and action lanes) lead with balances, next actions, and plain-language progress. Reviewer material lives on the Proof surface, linked from a calm beta status chip in the app header.

Each component must answer three questions quickly:

1. What action is available here?
2. What state is Vanta currently in?
3. What does this surface prove, and what does it not prove?

Primary buttons should feel decisive and scarce. Secondary actions should not visually compete with the main path. Status panels should distinguish `processing`, `success`, `warning`, and `failed` states clearly and truthfully.

## Trust & Claims

Vanta's interface is part of its trust model. UI copy, JSON status surfaces, docs, and verification commands must tell the same story.

Persistent trust rules:

- never overstate readiness
- never hide an important policy boundary behind optimistic copy
- keep merchant and user language simple even when the underlying mechanism is complex
- prefer explicit state names over implication
- separate what Vanta proves from what Vanta hopes, plans, or infers

Allowed framing includes:

- merchant-first
- controlled privacy
- private settlement
- policy-legible
- simulation before signing
- machine-checkable trust

Forbidden framing includes:

- audited, unless true and linked to real evidence
- production-ready, unless the readiness contract says so
- trustless, because Vanta intentionally includes operator and policy surfaces
- unlimited privacy, because Vanta is building bounded, controlled privacy

## Workflows & State

The stable workflows to preserve are:

- wallet connect or fresh-wallet recovery
- contextual Peer top-up only when the wallet is disconnected or effectively unfunded
- preview -> approve -> execute -> settle on merchant payment surfaces
- simulation before signing on wallet approval paths
- explicit pending/error/success messaging that does not overclaim settlement finality

State machines should be represented explicitly in docs, code, and tests. If a state matters to the user or merchant, it should have:

- a stable name
- clear display conditions
- defined copy
- a verification path

Do not let important states live only in implementation details.

### Wallet Picker State Table

| State | Display condition | UI behavior | Verification |
| --- | --- | --- | --- |
| `disconnected` | No connected wallet | Show wallet connect and fresh-wallet paths. Show funding recovery only if Peer display rules pass. | `npm run build`, wallet-menu browser checks |
| `connected_unfunded` | Wallet connected with no native SOL and no positive public asset balance | Keep the existing wallet surface. Show the contextual funding recovery block when Peer display rules pass. | `npm run build`, wallet-menu browser checks |
| `connected_funded` | Wallet connected with positive native SOL or at least one positive public asset balance | Hide the Peer funding recovery block. Keep safety copy visible. | `npm run build`, wallet-menu browser checks |

Machine-readable mapping:

- `walletAddress`, `walletConnected`, `walletReady`, and `solBalance` come from `useWalletState()` in `src/data/context/WalletContext.tsx`.
- `hasUsableBalance`, `walletPublicAssetsLoading`, and `walletPublicAssetsError` are derived in `src/components/AppLayout.tsx` from `useWalletPublicAssets()`.
- Signing-safety truth should stay aligned with `npm run mainnet:wallet-signing-status -- --json`, especially:
  - `requiresSimulationBeforeSignature`
  - `requiresExplicitHumanApproval`
  - `mainnetSubmissionExplicitlyBlocked`
  - `productionDeploymentModeBannerVisible`
  - `productionSettlementOfflineBannerVisible`

### Wallet Picker Copy Table

| Surface element | Canonical copy | Notes |
| --- | --- | --- |
| Safety note title | `Simulation before signing` | Must remain visible near wallet approval surfaces. |
| Safety note body | `Live actions are simulated before wallet approval.` | Do not replace with softer or more magical wording. |
| Funding recovery title | `No wallet funds detected` | Use only when the wallet is disconnected or effectively unfunded. |
| Funding recovery body | `Connect, create a fresh wallet, or top up with Peer on desktop.` | Keep merchant-safe and non-technical. |
| Funding CTA | `Top up with Peer` | Only when the live CTA is actually allowed. |

### Peer Top-Up State Table

| State | Display condition | UI behavior | Verification |
| --- | --- | --- | --- |
| `hidden` | Peer feature off, unsupported/mobile surface, or funded wallet | Render nothing. | `npm run build`, wallet-menu browser checks, mobile browser checks |
| `disabled` | Beta mode without explicit live-funding enablement | Suppress the live CTA or render disabled truthfully. | `npm run build`, beta-mode wallet-menu checks |
| `install_required` | Peer enabled and eligible, but extension missing | CTA opens install flow instead of failing. | wallet-menu browser checks |
| `connection_required` | Extension present but not connected | CTA requests connection before onramp launch. | wallet-menu browser checks |
| `available` | Desktop-capable, feature enabled, live funding allowed, and wallet is disconnected or unfunded | CTA is enabled and opens the Peer route. | wallet-menu browser checks |
| `opened` | Peer onramp launch has been handed off successfully | Keep wallet menu messaging compact and avoid implying settlement completion. | wallet-menu browser checks |
| `fulfilled_pending_bridge` | Peer callback reports fulfillment with bridge pending | Acknowledge initiation/fulfillment while clearly marking settlement as pending. | wallet-menu browser checks |
| `fulfilled` | Peer callback reports fulfillment without bridge pending | Show compact success copy without implying broader protocol completion. | wallet-menu browser checks |
| `error` | Connection rejected, callback malformed, or launch failed softly | Keep the wallet picker open and show concise inline error state. | wallet-menu browser checks |

Machine-readable mapping:

- Availability is currently typed, local, and explicit rather than exposed through a standalone JSON printer.
- The source-of-truth availability boundary is:
  - `getPeerOnrampAvailability()` in `src/peer/peerConfig.ts`
  - `PeerOnrampAvailability` in `src/peer/peerOnrampTypes.ts`
- Current availability values:
  - `disabled`
  - `beta_blocked`
  - `unsupported_surface`
  - `needs_wallet`
  - `available`
- Current launch/result values:
  - `idle`
  - `install_required`
  - `connection_required`
  - `launching`
  - `opened`
  - `fulfilled`
  - `error`
- Current fulfillment payload fields:
  - `intentHash`
  - `bridgeStatus`
  - `trackingUrl`
- Contract verification for this boundary is currently `npm run peer:onramp-contract-check`.
- Important truth note: the design contract includes a conceptual `fulfilled_pending_bridge` state because the UI should distinguish bridge-pending fulfillment, but the machine-readable anchor today is `bridgeStatus: "pending"` inside `PeerOnrampFulfillment`, not a separate launch-state enum member.

### Peer Top-Up Copy Table

| State | Title | Body | CTA / status text |
| --- | --- | --- | --- |
| `disabled` | `No wallet funds detected` | Preserve beta truth. Do not imply that live funds move in beta mode. | `Beta mode` |
| `install_required` | `No wallet funds detected` | `Connect, create a fresh wallet, or top up with Peer on desktop.` | `Install Peer` if the install-first path is exposed; otherwise `Top up with Peer` may open install flow directly. |
| `connection_required` | `No wallet funds detected` | `Connect, create a fresh wallet, or top up with Peer on desktop.` | `Connect Peer` if the connection step is explicit; otherwise `Top up with Peer` may request connection directly. |
| `available` | `No wallet funds detected` | `Connect, create a fresh wallet, or top up with Peer on desktop.` | `Top up with Peer` |
| `opened` | `Peer top-up started` | `Finish the top-up flow in Peer. Vanta will keep this as a funding step, not a settlement claim.` | Status only, no second primary CTA |
| `fulfilled_pending_bridge` | `Top-up in progress` | `Funding was initiated. Final delivery may still be pending.` | Status only |
| `fulfilled` | `Top-up started` | `Funding was initiated from Peer.` | Status only |
| `error` | `Peer top-up unavailable` | `Vanta could not start Peer top-up right now.` | Allow retry via the same surface if the underlying state becomes eligible again. |

### Pay Merchant Settlement State Table

| State | Meaning | UI behavior | Verification |
| --- | --- | --- | --- |
| `preview` | Merchant can inspect what will happen before approval | Show the approval boundary and keep trust language explicit. | `npm run pay:approval-packet-check`, `npm run pay:verify` |
| `approve` | Approval decision is in scope and policy-bound | Present the approval packet and avoid hiding the action boundary. | `npm run pay:approval-packet-check`, `npm run pay:verify` |
| `execute` | Payment execution is in progress or has just moved beyond approval | Show active lifecycle state without implying settlement is final. | `npm run pay:merchant-api-check`, `npm run pay:verify` |
| `settle` | Settlement state is available for merchant review | Keep settlement, refund, withdrawal, and reconciliation language legible and merchant-facing. | `npm run pay:merchant-trust-status-check`, `npm run pay:merchant-api-check`, `npm run pay:verify` |

Machine-readable mapping:

- Merchant trust summary fields come from `getVantaPayMerchantTrustStatus()` in `src/pay/vantaPayMerchantTrustStatus.ts`.
- Verify them through `npm run pay:merchant-trust-status -- --json`.
- Canonical trust fields:
  - `version`
  - `checkoutSurface`
  - `settlementModel`
  - `refundSupport`
  - `withdrawalSupport`
  - `privacyMode`
  - `policyMode`
  - `productionReady`
- Approval-boundary fields come from `VantaPayApprovalPacket` in `src/pay/vantaPayTypes.ts` and are checked by `npm run pay:approval-packet-check`.
- Canonical approval fields:
  - `phaseOrder`
  - `policyMode`
  - `simulationRequired`
  - `walletApprovalRequired`
- Settlement lifecycle fields come from `VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY` in `src/pay/vantaPayPrivateSettlementAdapter.ts`.
- Canonical settlement fields:
  - `lifecycleModel`
  - `refundState`
  - `withdrawalState`
  - `reconciliationState`
- When the UI says `preview`, `approve`, `execute`, or `settle`, those words should stay aligned with:
  - `phaseOrder: ["preview", "approve", "execute", "settle"]`
  - `lifecycleModel: "preview-approve-execute-settle"`

### Pay Merchant Settlement Copy Table

| Surface element | Canonical copy | Notes |
| --- | --- | --- |
| Design-partner eyebrow | `Design partner preview` | Keep this preview framing while `productionReady: false`. |
| Merchant heading | `Merchant pilot` | Do not upgrade to production-grade wording early. |
| Merchant body | `Private settlement without protocol overhead.` | Keep simple and outcome-focused. |
| Lifecycle label | `settlement lifecycle` | This label should stay aligned with status surfaces and browser checks. |
| Lifecycle sequence | `preview`, `approve`, `execute`, `settle` | Do not rename casually; these are contract words now. |
| Detail labels | `refunds`, `withdrawals`, `reconciliation` | Prefer plain merchant language over protocol jargon. |

## Verification & Checks

Vanta's design is only real when it is verifiable.

Minimum contract:

- `npm run build` for any user-facing change
- `npm run design:contract-check` when changing this contract or any high-risk mapped truth surface
- browser-backed checks when visible app behavior changes
- canonical private-core, Pay, wallet-signing, or readiness commands when those boundaries move

Important surface mappings:

- wallet picker and Peer top-up behavior should map to wallet-menu and mobile browser checks
- Pay merchant lifecycle and trust copy should map to `pay:merchant-trust-status`, `pay:merchant-api-check`, and browser assertions
- signing-safety copy should stay aligned with `wallet:browser-signing-safety-check`
- if a surface has no standalone JSON/status printer yet, point to its typed code boundary and contract check explicitly instead of inventing a fake machine-readable surface

Design drift is not just visual drift. It also includes:

- copy drift between docs and UI
- claim drift between UI and status JSON
- lifecycle drift between runtime and browser checks
- readiness drift between product framing and actual command output

## Do's and Don'ts

Do:

- make the safest truthful path the clearest path
- keep recovery flows contextual
- preserve one product voice across docs, UI, and machine-readable surfaces
- use verification commands as reviewer-facing product artifacts
- treat trust language as part of the implementation

Don't:

- add new primary surfaces when an existing one can absorb the job
- use protocol jargon where merchant-safe language works
- imply final settlement when the state is still pending
- ship optimistic copy that outruns status or readiness truth
- let a visually polished surface hide a weak control boundary

## Change Policy

This file is a draft contract and should evolve carefully.

When changing it:

1. Prefer additive clarification over churn.
2. Update related repo specs and vault notes when a durable rule changes.
3. Record contradictions explicitly if the codebase temporarily diverges.
4. Add or update verification commands when a new contract surface becomes important.

If a future Vanta linter or contract checker is added, this file should become one of its inputs.

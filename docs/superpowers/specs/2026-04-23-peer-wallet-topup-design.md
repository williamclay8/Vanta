# Peer Wallet Top-Up Design

**Date:** 2026-04-23

## Goal

Add a Peer-powered wallet top-up entry point to Vanta without bloating the main application interface.

The top-up affordance should behave like a recovery path inside the existing wallet menu, not like a new product surface. It should appear only when:

- no connected wallet is present, or
- a connected wallet has effectively no usable public balance

## Product constraints

- The feature must fit inside the existing app shell and wallet picker instead of introducing a new top-level tab, page, or always-visible card.
- The current Vanta deployment contract still serves a beta banner that says no funds move in beta mode. The Peer integration therefore needs an explicit feature gate in addition to any desktop or extension gating.
- Peer redirect onramp is a desktop extension flow. Mobile should not accidentally show a broken entry point.
- Vanta should continue to prefer simple, merchant-safe, and reviewer-legible language over protocol language.

## Non-goals

- Building a new standalone funding page
- Exposing Peer inside the Pay page as a primary user flow
- Generalizing Vanta into a multi-provider onramp marketplace
- Claiming live mainnet readiness or changing existing beta-mode truth surfaces

## User experience

### Placement

The Peer entry point lives inside the existing wallet picker in `src/components/AppLayout.tsx`.

It renders as a compact contextual funding block between the wallet safety note and the existing wallet/fresh-wallet sections. In the steady state, the wallet picker looks unchanged.

### Display rules

Show the contextual funding block only when all of the following are true:

1. Peer onramp is enabled by Vanta feature flag
2. the session is desktop-capable for the Peer extension flow
3. either:
   - no wallet is connected, or
   - a wallet is connected but Vanta detects no usable public balance

Hide the block in all other cases.

### Usable balance rule

Treat a connected wallet as having usable balance when either of the following is true:

- native SOL balance is greater than zero
- `useWalletPublicAssets()` returns at least one public asset with positive balance

This is intentionally simple and transparent. The first version should not introduce asset-specific minimums, gas heuristics, or product-policy thresholds.

### Copy

Primary state:

- title: `No wallet funds detected`
- body: `Connect, create a fresh wallet, or top up with Peer on desktop.`
- CTA: `Top up with Peer`

Secondary detail states:

- Peer disabled by feature flag: no funding block rendered
- mobile or unsupported browser: no funding block rendered
- Peer extension not installed: CTA opens install flow
- Peer extension installed but not connected: CTA requests connection before opening onramp
- beta deployment mode with Peer enabled but live funding still disallowed: CTA is rendered disabled with `Beta mode`-style truth copy or the block is suppressed entirely

Recommended beta behavior for the first implementation:

- suppress the live CTA in beta mode unless the product owner explicitly enables a second live-funding flag
- preserve the current banner truth that no funds move in beta mode

## Interaction flow

1. User opens wallet picker.
2. Vanta reads wallet connection state from `useWalletState()`.
3. If a wallet is connected, Vanta reads public balances via `useWalletPublicAssets({ walletAddress, solBalance })`.
4. If the display rules pass, Vanta renders the contextual funding block.
5. On click:
   - if Peer extension is missing, open Peer install page
   - if Peer extension is present but not connected, request connection
   - if ready, open `peerExtensionSdk.onramp(...)`
6. On intent fulfillment, Vanta records lightweight client state so the wallet menu can acknowledge that funding was initiated or fulfilled without implying protocol settlement beyond what Peer actually reports.

## Technical design

### New integration boundary

Create a small Peer-specific integration layer instead of embedding extension logic directly in `AppLayout`.

Recommended files:

- `src/peer/peerConfig.ts`
  - Reads Vite feature flags and deployment gating
- `src/peer/peerOnramp.ts`
  - Wraps `@zkp2p/sdk` state checks, install flow, connection request, and `onramp()` call
- `src/peer/peerOnrampTypes.ts`
  - Typed local param/result shapes used by the UI

### Existing UI boundary

Modify `src/components/AppLayout.tsx` to:

- read wallet connection and balance state
- decide whether the contextual funding block should render
- trigger the Peer integration wrapper on click
- show compact pending/error/success messaging inside the wallet picker

### Wallet and balance inputs

Use existing app seams rather than inventing new ones:

- `useWalletState()` from `src/data/context/WalletContext.tsx`
  - `walletConnected`
  - `walletAddress`
  - `solBalance`
  - connector readiness state
- `useWalletPublicAssets()` from `src/solana/useWalletPublicAssets.ts`
  - determines whether any public assets exist

### Peer param mapping

The first version should keep the onramp opinionated and minimal.

Recommended initial mapping:

- `referrer`: `Vanta`
- `inputCurrency`: omit and let Peer infer local currency
- `paymentPlatform`: omit
- `toToken`: Solana SOL default for the first version
- `recipientAddress`: connected wallet address when present, otherwise omit until the user connects/imports a wallet

Important constraint:

- do not map Vanta Pay asset symbols directly into Peer token parameters
- use real chain/token-address mappings owned by the Peer wrapper

For the first version, defaulting to Solana native SOL keeps the flow honest with Vanta's current wallet shell and avoids pretending the existing Pay symbol model is a safe onramp token contract.

## Error handling

- Missing feature flag: render nothing
- beta mode without explicit live-funding enablement: render nothing or render disabled truthfully
- no recipient wallet available: render the funding block only if the product wants install/connect-first behavior; otherwise suppress and require connection first
- Peer install required: direct user to install flow, do not throw uncaught errors
- Peer connection rejected: show compact inline status, keep wallet picker open
- Peer callback fulfilled with bridge pending: acknowledge fulfillment and expose pending bridge language without overstating final delivery
- Peer callback missing or unexpected: fail softly in UI and keep Vanta state unchanged

## Verification

Minimum verification for the implementation:

- `npm run build`
- a wallet-menu browser check that covers:
  - disconnected wallet shows the Peer contextual funding block on desktop when enabled
  - connected wallet with positive balance hides the block
  - connected wallet with no usable balance shows the block
  - beta mode preserves truthful disabled/hidden behavior
- a lightweight contract check for Peer feature-flag/env wiring

## Risks and limitations

- Peer is desktop-extension-based while Vanta supports mobile browsing, so the UI must fail closed on unsupported surfaces.
- Vanta currently operates in beta mode by default. The design must not silently create a live-funds contradiction.
- Solana public-balance detection is a heuristic, not a proof that the user can complete every downstream action.
- The first version should not attempt merchant/onramp reconciliation, Pay checkout coupling, or cross-chain asset selection.

## Recommendation

Ship the first integration as a desktop-only, feature-flagged, contextual wallet-menu recovery path with a single default SOL top-up route. Keep the UI hidden unless the user is disconnected or effectively unfunded. Preserve beta truth explicitly, then expand later only if Vanta decides to support live funding beyond the current beta posture.

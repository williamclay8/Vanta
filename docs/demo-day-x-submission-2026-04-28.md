# Vanta Demo Day X Submission - 2026-04-28

## Submission Goal

Publish a short demo video plus X thread that explains Vanta's product idea, current proof/traction, and roadmap without overclaiming production privacy.

Core message:

> Vanta is building policy-safe private settlement for Solana stablecoin flows: shield value, use supported private actions, and give counterparties proof-backed receipts instead of asking them to trust vague privacy claims.

## Safe Claim Boundary

Use:

- bounded mainnet demo
- beta
- proof-backed where implemented
- operator-verifiable where implemented
- authenticated production services
- receipt-backed private settlement direction
- policy-safe private settlement

Avoid:

- fully private
- anonymous
- untraceable
- production-ready
- audited
- trustless
- live mainnet private settlement
- compliance-safe
- production payment processor

## Current Demo Facts

- Approved action: bounded mainnet demo for Shield, Send, Swap, and Unshield.
- Approved window: 2026-04-28 07:30-12:00 America/Los_Angeles.
- Maximum funds at risk: 0.05 SOL.
- Production role services passed authenticated readiness in the bounded demo run.
- `npm run mainnet:preflight` passed before the demo approval update.
- Vanta remains not production-ready and not fully private on mainnet.

## 75-90 Second Video Script

### 0-4s - Hook

Visual: Vanta app on `/app/shield`.

Caption:

> Vanta: Shield -> Send -> Swap -> Unshield

Voiceover:

> Here is the Vanta loop: public wallet in, supported private actions, public exit.

### 4-16s - Shield

Visual: Enter a small amount, choose a supported asset, click Shield.

Caption:

> Shield: public wallet value enters Vanta's supported private flow.

Voiceover:

> First, value moves from a public wallet into Vanta. The public wallet is still public; privacy starts only after the asset enters a supported private lane.

### 16-30s - Proof / State

Visual: Show private note, commitment, receipt, root, or state panel.

Caption:

> Private state with proof/operator evidence.

Voiceover:

> The important artifact is not a vague success toast. Vanta creates private state that can be checked through proof and operator surfaces.

### 30-48s - Send

Visual: Open `/app/send`, show private note, verify/send supported path.

Caption:

> Send: private note -> recipient note + residual change.

Voiceover:

> Now send from shielded state. The supported path creates recipient state and preserves residual balance for the next action.

### 48-64s - Swap

Visual: Open `/app/swap`, show route/quote/readiness, execute only if stable.

Caption:

> Swap: constrained supported route from shielded state.

Voiceover:

> Swap stays constrained and explicit. The demo shows the supported route and its readiness instead of pretending every route is finished.

Fallback caption if live swap is not stable:

> Swap lane is constrained today; this screen shows the supported route and readiness gate.

### 64-80s - Unshield

Visual: Open `/app/unshield`, show release boundary and completion/status.

Caption:

> Unshield: consume one private note and exit once.

Voiceover:

> Finally, unshield. Vanta consumes one private note and releases value back to the public wallet with replay and release boundaries visible.

### 80-92s - Truth Boundary

Visual: Open `/docs/security` or a final status panel.

Caption:

> Beta truth: narrow lanes, proof-backed where implemented, not production-ready privacy yet.

Voiceover:

> Today's truth: this is a bounded beta demo, not a production-ready or fully audited privacy protocol. The goal is proof-backed private settlement with visible limitations.

### 92-100s - Close

Visual: App dashboard or final success.

Caption:

> Private action -> trustworthy receipt -> counterparty verification.

Voiceover:

> Vanta is about proving enough to transact without exposing everything.

## X Thread Draft

1/

Demo day for Vanta.

Most crypto privacy products pitch invisibility.

Vanta is taking a different angle: private settlement that is useful to the counterparty too.

A user should not expose more than needed. A merchant or recipient still needs proof, status, receipts, and reconciliation.

2/

The product idea:

Vanta is a shield-first privacy app for Solana stablecoin flows.

Public wallet -> Shield -> supported private actions -> Unshield.

The first loop I am showing today is Shield, Send, Swap, and Unshield.

3/

The growth loop I care about:

private action -> trustworthy receipt -> counterparty verification -> invited use -> repeated private action

The receipt/trust packet is the product artifact.

Not "trust us, it was private."

More like: here is what happened, what was proven, what stayed private, and what can be verified.

4/

Current demo truth:

Vanta is in beta.

Today I have a bounded mainnet demo window for Shield, Send, Swap, and Unshield, capped at 0.05 SOL.

Production role services are deployed and passed authenticated readiness.

This is not a production privacy launch.

5/

What is real today:

- shield-first app flow
- constrained Send, Swap, and Unshield paths
- proof/operator surfaces for the narrow private-core lane
- Private Pool v2 role services
- wallet-signing safety gates
- transaction evidence surfaces
- no-overclaiming claim gates

6/

What I am explicitly not claiming:

- not anonymous payments
- not untraceable settlement
- not fully private mainnet
- not audited
- not production-ready
- not a production payment processor

Privacy products lose trust when the marketing gets ahead of the proof.

7/

Where Vanta goes next:

Turn the internal proof/status/evidence surfaces into merchant-facing trust packets.

Then harden production private settlement: durable storage, relayer separation, anonymity-set evidence, audit, custody/ops controls, and live settlement evidence.

8/

The wedge:

Crypto-native merchants, OTC desks, and treasury operators need stablecoin settlement with less unnecessary exposure and more verifiable confidence.

Vanta is building toward policy-safe private settlement: proof-backed where implemented, operator-verifiable where implemented, and honest about the remaining gates.

9/

The demo loop:

Shield -> Send -> Swap -> Unshield.

The bigger idea:

Prove enough to transact without exposing everything.

## Short Single-Post Option

Vanta demo day:

Shield -> Send -> Swap -> Unshield.

Vanta is building policy-safe private settlement for Solana stablecoin flows: private actions with proof-backed receipts and operator-verifiable status.

Today is a bounded beta demo, capped at 0.05 SOL. Not production-ready privacy yet. The goal is simple: prove enough to transact without exposing everything.

## Recording Checklist

- Browser zoom 110-125%.
- Hide bookmarks and unrelated tabs.
- Use 16:9, 1080p or 1440p.
- Keep wallet addresses, balances, and signatures cropped unless intentionally shown.
- Burn captions into the video.
- Stop recording if a wallet prompt shows unexpected destination, amount, or authority.
- Do not approve anything outside the 0.05 SOL bounded demo.


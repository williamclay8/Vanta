# Vanta - Hackathon Submission Package

## Project name

**Vanta**

## Tagline

**Shield first. Move privately.**

## Short description

Vanta is a zk-powered privacy layer for Solana that lets users shield supported assets from public wallet flows and use them through private workflows beginning with send.

## Medium description

Vanta is building a practical privacy layer for Solana. The project starts with the first complete Vanta loop: **Shield + Private Send**, allowing users to move supported assets out of transparent wallet flows and into a shielded state designed for more private activity. From that foundation, Vanta expands toward private swaps, private payments, and broader privacy-native workflows for users, traders, teams, builders, and commerce.

Vanta currently supports a constrained devnet protocol flow for one supported asset, VUSD. Users can connect a real wallet, shield VUSD into Vanta through a real deposit-backed flow, create onchain shield notes, and execute constrained send transitions that consume and evolve shielded note state. The current implementation is intentionally narrow and does not yet provide final zk privacy semantics, but it is no longer only a front-end prototype.

## Full description

Solana has become one of the most important execution layers in crypto, but one thing remains missing: practical privacy. Wallet balances, asset holdings, transfers, counterparties, and behavior patterns are easy to trace across transparent onchain systems.

Vanta exists to close that gap.

Rather than treating privacy as a single isolated transaction feature, Vanta begins at the right entrypoint: **shielding**. Users move supported assets from ordinary transparent wallet flows into a privacy-preserving Vanta layer, where those assets can be held in shielded state and used through private workflows. The first complete product loop is **Shield + Private Send**, which provides the foundation for future **Private Swap**, **Private Pay**, and broader privacy-native Solana applications.

For the hackathon, Vanta is presented as a focused but ambitious privacy suite:
- a polished website and product application
- a coherent product architecture
- a strong MVP wedge built around shielded state
- a clear roadmap from private transfer infrastructure to broader Solana commerce and ecosystem workflows

Vanta is designed for users, traders, teams, builders, and eventually merchants who need more than speed and low fees; they need discretion.

---

## Problem statement

Solana is transparent by default. Holdings, transfers, counterparties, and behavioral patterns are easy to trace across transparent onchain systems. That creates real problems for users, traders, teams, and businesses that need basic financial privacy and operational discretion.

## Solution statement

Vanta introduces a privacy-preserving layer for Solana that starts by allowing users to shield supported assets out of public wallet flows and into shielded state. From there, users can access private workflows beginning with send, with swap and payment functionality extending naturally from the same foundation.

## Why now

As Solana matures into a serious environment for finance, applications, and commerce, privacy becomes a missing piece of infrastructure. Users do not stop needing discretion simply because they move onchain. Vanta is being built to make privacy feel usable, structured, and native to the next era of Solana activity.

## Why Bags

Bags sits close to the world of Solana-native products, tokenized ecosystems, and onchain commerce. Vanta complements that world by focusing on the privacy layer that can eventually support more discreet transfers, payment flows, and broader ecosystem participation across Solana. The hackathon is the right place to present that wedge: a privacy-native product suite with clear utility and expansion potential.

---

## Product thesis

Vanta is a zk-powered privacy layer for Solana that lets users shield assets from public wallet flows and use them through private send, swap, and payment workflows.

## Product truth

The first complete Vanta loop is:

**Public Wallet -> Shield -> Shielded State -> Send**

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

Vanta currently supports a constrained devnet implementation for one supported asset, `VUSD`.

### Live now
- real wallet connection
- real public wallet balance detection for `VUSD`
- real shield deposits into a Vanta-controlled path
- real onchain shield notes
- real onchain send notes
- explicit note identity
- explicit spent-marker semantics
- residual/change-note evolution
- shielded balance resolved from the current spendable note set

### Still constrained / not final
- no final zk proof system yet
- no final nullifier design yet
- no recipient-private send semantics yet
- no generalized multi-asset support yet
- swap and pay remain future modules

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
- Bags hackathon positioning

### Application
- Shield as the primary entrypoint
- Send as the first workflow unlocked by shielded state
- Swap and Pay as future-facing modules
- shared app-level continuity between Shield and Send

### Current live flow
**Public Wallet -> Shield -> Shielded State -> Send**

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

Vanta is a zk-powered privacy layer for Solana that starts with the right first primitive: shielding. Today, Vanta already supports a constrained devnet flow for one supported asset, VUSD, where users can connect a wallet, shield into Vanta’s onchain note state, and execute a constrained send that updates spendable shielded balance. It is intentionally narrow, but it proves the core architecture is becoming real.

## Demo script - 60 seconds

Solana is fast and accessible, but holding and moving assets on it is public by default. Vanta is our answer: a privacy layer for Solana that begins with shielding supported assets into a separate Vanta state system. Today, the project already supports a constrained real devnet flow for one asset, VUSD: users can connect a wallet, deposit into Vanta, create shield notes, execute constrained send transitions, and see shielded balance resolved from the current spendable note set. It is not yet the final zk privacy system, but it is no longer just a front-end concept - it is an early protocol loop with real state transitions. That is the foundation we will build outward from into stronger privacy, swaps, and payments.

---

## Judge FAQ

### Does Vanta actually work today?

Yes, in a constrained devnet form for one supported asset, VUSD. Users can connect a wallet, shield the asset into Vanta’s onchain note-based state, and execute constrained send transitions that update spendable shielded balance. The implementation is still early and does not yet provide final zk privacy semantics.

### Is this just a front-end prototype?

No. The current app is still product-led and intentionally narrow, but it already uses real wallet-connected asset detection, real onchain note records, explicit note identity, spent-marker semantics, and note-based shielded balance resolution for one asset.

### Is the protocol complete?

No. The current system is an early constrained protocol loop for one supported asset. It still lacks final zk proofs, nullifiers, recipient privacy, multi-asset support, and broader protocol generalization.

### Is shielding the same as hiding assets in a normal wallet?

No. Vanta's model is that supported assets move out of ordinary transparent wallet flows and into a privacy-preserving Vanta layer. The product should be understood as creating shielded state, not making normal public wallet accounts invisible.

### Why is Shield the first product?

Because privacy needs a coherent entrypoint. Shielding is the action that creates private state, and Private Send becomes the first natural workflow from there.

### Why not make Send the whole MVP?

Because send alone lacks a clean product foundation. Shield + Private Send forms a complete privacy loop and makes the rest of the suite easier to understand.

### What is live now versus roadmap?

The current implementation supports a constrained devnet flow for `VUSD` with real wallet connection, real deposit-backed Shield, real onchain note state, and constrained Send transitions. Swap and Pay are still future modules built on top of that foundation.

### Is Vanta just a privacy-themed concept?

No. Vanta is being built as a product-led privacy layer with a clear user journey, coherent app flow, and a constrained but real early protocol loop for one asset today.

### Why is this relevant to Solana commerce?

Commerce requires discretion. As Solana grows into a platform for payments, products, and real economic activity, privacy-preserving holding and transaction flows become more important. Vanta is designed to become that missing privacy layer.

---

## One-line internal rule

If someone asks what Vanta is, the shortest correct answer is:

> Vanta is a zk-powered privacy layer for Solana that lets users shield assets from public wallet flows and use them through private workflows beginning with send.

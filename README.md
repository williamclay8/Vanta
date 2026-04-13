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

### Not live yet
- final zk proof system
- final nullifier architecture
- recipient-private send semantics
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
npm run private-core:restart-check
npm run private-core:prove
npm run private-core:verify
npm run private-core:demo-readiness
npm run private-core:demo-preflight
npm run private-core:operator-status
```

These commands cover:
- fixed-depth Noir circuit regression
- valid and invalid witness behavior
- local proof generation and verification
- operator-backed consume and HTTP smoke coverage
- operator state persistence across restart

`private-core:demo-readiness` is the friendliest single entrypoint when you just want to know whether the current proof/demo lane is stage-ready.

`private-core:demo-preflight` combines the full verification pass with the current operator status summary.

`private-core:operator-status` gives a quick readout of the current operator root, proof, consume, and release state when the operator server is running.

---

## What's in this repository

This repository currently contains:
- a polished landing page
- a modular application experience
- Shield as the primary entrypoint into the suite
- Send as the first workflow unlocked by shielded state
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

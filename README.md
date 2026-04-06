# Vanta

**Shield first. Move privately.**

Vanta is a zk-powered privacy layer for Solana that lets users shield assets from public wallet flows and use them through private workflows beginning with send.

Vanta currently supports a constrained devnet protocol flow for one supported asset, VUSD. Users can connect a real wallet, shield VUSD into Vanta through a real deposit-backed flow, create onchain shield notes, and execute constrained send transitions that consume and evolve shielded note state. The current implementation is intentionally narrow and does not yet provide final zk privacy semantics, but it is no longer only a front-end prototype.

---

## What is Vanta?

Solana made onchain activity fast, cheap, and accessible. It did not make it private.

Wallet balances, transfers, counterparties, and behavioral patterns are easy to trace across transparent onchain systems. Vanta exists to close that gap.

Rather than treating privacy as a one-off transaction feature, Vanta begins at the right entrypoint: **shielding**. Supported assets move from ordinary transparent wallet flows into the Vanta privacy layer, where they can be held in shielded state and used through private workflows.

The first complete Vanta loop is:

**Public Wallet -> Shield -> Shielded State -> Send**

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

Vanta currently supports a constrained devnet protocol flow for one supported asset, `VUSD`.

### Live now
- real Solana wallet connection
- real `VUSD` balance detection in public wallet state
- real shield deposits into a Vanta-controlled devnet path
- real onchain shield notes
- real onchain send notes
- explicit note identity
- explicit spent-marker semantics
- derived change-note evolution
- shielded balance resolved from the current spendable note set
- a connected Shield -> Send flow grounded in Vanta-recognized state

### Not live yet
- final zk proof system
- final nullifier architecture
- recipient-private send semantics
- generalized multi-asset support
- swap
- pay
- production-grade protocol guarantees

The current implementation should be understood as a constrained but real early protocol for one asset, not just a mock interface and not yet the final privacy system.

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

---

## What's in this repository

This repository currently contains:
- a polished landing page
- a modular application experience
- Shield as the primary entrypoint into the suite
- Send as the first workflow unlocked by shielded state
- shared app-level continuity between Shield and Send
- a constrained real devnet protocol path for `VUSD`
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

For hackathon positioning, demo scripts, FAQ, and submission-ready descriptions, see:

`SUBMISSION.md`

---

## Internal product rule

If someone asks what Vanta is, the shortest correct answer is:

> Vanta is a zk-powered privacy layer for Solana that lets users shield assets from public wallet flows and use them through private workflows beginning with send.

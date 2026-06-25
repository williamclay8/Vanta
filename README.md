# Vanta

**Shield first. Move privately.**

Vanta is a shield-first privacy protocol for Solana. It enables users to move supported assets out of public wallet flows into a private Vanta area, where private actions such as send, swap, and unshield become available. Vanta Pay extends the same privacy model to merchants with verifiable payment requests, settlement, refunds, and receipts.

**Current Status**: Alpha-stage development and research. Not production-ready or mainnet-ready. Some components are functional previews or constrained demos. Do not use this repository as an audited payment processor, custody system, or final privacy network. See `SECURITY_LIMITATIONS.md` for full details.

---

## Mission

Vanta builds a mature, verifiable privacy layer for the Solana ecosystem. The protocol prioritizes user privacy through shielding and zero-knowledge techniques while maintaining strong auditability, merchant usability, and transparent limitations disclosure.

---

## Features

### Core Privacy Suite
- **Shielding**: Move supported mainnet assets (USDC, SOL) from public wallets into shielded private state
- **Private Send**: Constrained private transfers within the shielded state with proof-backed continuity
- **Private Swap**: One-way constrained swaps (e.g., USDC → SOL) with shielded outputs
- **Unshield**: Authenticated operator-backed exit back to public wallets

### Vanta Pay Merchant Suite
- Payment request creation, hosted/embedded/modal checkout
- Payment links, invoices, and subscriptions
- Settlement, refund, withdrawal, and reconciliation flows
- Verifiable receipts and transaction evidence
- Privacy-preserving settlement via Private Pool v2

### Verifiability & Operations
- Operator-backed proofs, receipts, and status surfaces
- Replay protection and nullifier management
- Production-grade startup guards, idempotency, and fail-closed validation
- Comprehensive local verification commands for reviewers and auditors

### Additional Highlights
- Zero monthly fees; 0.25% success fee only on completed Pay, Shield, Send, Swap, or Unshield actions
- Clear privacy boundaries: shielding initiates privacy claims only for supported lanes
- Browser-verified surfaces and production build checks

---

## Important Disclaimers

- Vanta is **not** production-ready until it achieves audited mainnet-compatible private settlement, persistent operator/indexer/relayer services, secure key handling, and a full security limitations page.
- Privacy claims apply only after assets enter the supported private flows.
- All current deployments and proofs are benchmark/demo lanes.

---

## Getting Started

### Prerequisites
- Node.js 22.x
- npm (or compatible package manager)

### Local Development
```bash
npm install
npm run dev
```
Open the local Vite URL shown in the terminal.

### Build & Preview
```bash
npm run build
npm run preview
```

### Where to Start Exploring
- App shell: `/app`
- Shield flows: `/app/shield`
- Vanta Pay preview: `/app/pay`
- Documentation: `/docs`
- Security limits: `SECURITY_LIMITATIONS.md`
- Operator runbook: `docs/operator-runbook.md`

---

## Architecture Overview

Vanta consists of:

- **Frontend**: Vite + React 18 + TypeScript + React Router + custom design system. Routes include marketing homepage, docs, app shell (`/app`), Shield, Send, Swap, Unshield, Pay, and Launch.
- **Privacy Core (Private Pool v2)**: Noir circuits, Barretenberg UltraHonk proofs, local and operator-backed proving, indexer/relayer/verifier services. Supports shield, claim, send, swap, and unshield with replay guards.
- **Vanta Pay Layer**: Merchant API, checkout sessions, settlement adapters backed by Private Pool v2, webhook delivery, idempotency, and receipt management.
- **Operator Services**: Status, snapshot, shipping decision, and release candidate endpoints. Supports Postgres snapshot store and production secret management patterns (refs-only manifests).
- **Deployment**: Staging on Render; production targets include Doppler for secrets, Postgres for durable state, and explicit mainnet funds approval gates.

The architecture emphasizes fail-closed policies, explicit production readiness gates (`productionReady: false` until gates pass), and reviewer/audit surfaces that keep the repo honest about current limitations.

---

## Project Structure
```
.
├── index.html
├── package.json
├── src/
│   ├── App.tsx
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── main.tsx
│   ├── pages/
│   └── styles.css
├── tsconfig*.json
└── vite.config.ts
```

---

## Documentation & Resources

- Product documentation: `/docs`
- Security limitations: `SECURITY_LIMITATIONS.md`
- Operator runbook: `docs/operator-runbook.md`
- Mainnet deployment runbook: `docs/mainnet-deployment-runbook.md`
- Audit package: `docs/audit-package.md`

For developers and reviewers, detailed verification commands and operator contract surfaces are available via `npm run` scripts (see `package.json`). These are intended for engineering and audit workflows, not end users.

---

## Links

- **Website**: [vantaprivacy.xyz](https://vantaprivacy.xyz)
- **Token**: [$VANTA](https://vantaprivacy.xyz/token) (Solana)
- **Documentation**: [docs.vantaprivacy.xyz](https://docs.vantaprivacy.xyz)
- **GitHub**: This repository
- **Status & Audits**: See `SECURITY_LIMITATIONS.md` and `/.well-known/vanta-audit.json`

---

## Contributing

Contributions are welcome. Please review `SECURITY_LIMITATIONS.md` and the operator runbooks before submitting changes. All PRs should maintain the repo's commitment to honest status reporting and fail-closed design.

---

*Vanta — Building serious privacy infrastructure for Solana.*

# Vanta

**Shield first. Move privately.**

Vanta is a shield-first beta privacy app for supported Solana assets. Users move assets out of public wallet flows into a private Vanta area, then act inside constrained lanes (Send, Swap, Unshield). Some surfaces are real and verifiable today; others are narrow previews. **Vanta is not production-ready or mainnet-ready.**

```text
Public Wallet -> Shield -> Private Vanta Area -> Send / Swap / Unshield
                                              -> Pay / Strategy / Proof (preview)
```

---

## Who it's for

- **Users** who want a clearer path from public balances into shielded state and back.
- **Counterparties** who need receipts or trust packets they can inspect — not abstract privacy claims.
- **Reviewers and design partners** who want bounded, command-verifiable behavior without learning protocol vocabulary first.

---

## Core lanes

Primary app tabs at `/app` (defaults to Shield):

| Lane | Role |
|------|------|
| **Shield** | Move supported assets into Vanta's private flow |
| **Send** | Act on shielded state |
| **Swap** | Constrained swap inside shielded state |
| **Unshield** | Exit back to public flows |

**More menu (preview lanes):** Pay, Strategy, Proof, Recovery, Launch. These are bounded beta or reviewer surfaces — not the headline product.

**Also:** `/products` workbenches (Compliance Gateway, Private Perps, Shielded RWA, Privacy SDK, Velocity Intelligence), public receipt checks at `/receipt/:receiptId`, and docs at `/docs`. `/docs/portal` is a docs track name for the shield-first wallet flow — not a separate app.

---

## What works vs. what doesn't

**Inspectable today:** wallet connection, shield flows for supported assets, constrained Send/Swap/Unshield paths, proof and operator checks for the narrow private-core lane, app tabs and diagnostics, receipt verification, and verification commands that keep claims honest.

**Not live or final:** audited production privacy, broad multi-asset support, final proof/nullifier architecture, production Pay processor semantics, live Strategy execution, mainnet private settlement, or production custody/compliance guarantees.

See `SECURITY_LIMITATIONS.md` for the full boundary list.

---

## Pricing

- `0` monthly fee
- `0.25%` only when Pay, Shield, Send, Swap, or Unshield completes successfully
- Network, off-ramp, and third-party costs stay separate

Preview-only surfaces must not imply fees are active.

---

## Where to start

- **App:** `/app` → `/app/shield`
- **Docs:** `/docs` (wallet flow at `/docs/portal`, Pay at `/docs/pay`)
- **Pay preview:** `/app/pay`
- **Trust / receipts:** `/app/proof`, `/receipt/:receiptId`
- **Security limits:** `SECURITY_LIMITATIONS.md`
- **Reviewer handoff:** `docs/audit-package.md`, `docs/operator-runbook.md`

---

## Local development

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

**Stack:** Vite, React 18, TypeScript, React Router, custom CSS.

---

## Verification

Shortest honest reviewer set:

```bash
npm run build
npm run protocol:browser-check
npm run private-core:demo-preflight
npm run pay:verify
npm run truth:transaction-check
npm run mainnet:transaction-evidence-check
npm run mainnet:readiness-check
```

Private-core lane:

```bash
npm run private-core:check
npm run private-core:verify
npm run private-core:demo-preflight
npm run private-core:operator-contract
npm run private-core:operator-status
npm run private-core:operator-status-check
```

Private Pool v2 benchmark lane:

```bash
npm run private-pool-v2:verify
npm run private-pool-v2:status
```

Pay preview:

```bash
npm run pay:verify
npm run pay:status
```

Full command inventory lives in `package.json`. Deep operator, shipping, and release-readiness surfaces are documented in `docs/operator-runbook.md`, `docs/zk/vanta-private-core-demo-runbook.md`, and `docs/zk/vanta-zk-v1-shipping-decision.md`.

---

## Pay preview

Pay is one bounded merchant preview lane — payment requests, checkout modes, settlement records, and verifiable receipts. It is not the headline product and not a deployed payment processor. `npm run pay:verify` is the current Pay gate. Merchant integration details: `docs/pay-merchant-trust-surface.md`, `/docs/pay`.

---

## Links

- **Website:** [vantaprivacy.xyz](https://vantaprivacy.xyz)
- **Token:** [$VANTA](https://vantaprivacy.xyz/token) `9yqv319Boij6kUfD6CAzXEGYk7pHUfda37ye6FQmBAGS` (Solana)
- **Documentation:** [docs.vantaprivacy.xyz](https://docs.vantaprivacy.xyz)
- **Status / audits:** `SECURITY_LIMITATIONS.md`, `/.well-known/vanta-audit.json`

---

## Short answer

> Vanta is a shield-first beta privacy app for Solana. Users move supported assets out of public wallet flows, use them through constrained private lanes (Send, Swap, Unshield), and can share verifiable receipts where implemented. Pay is one preview lane among several — not the whole product.

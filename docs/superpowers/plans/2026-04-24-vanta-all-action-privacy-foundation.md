# Vanta All-Action Privacy Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the first truthful foundation for fully private all-action Vanta by formalizing privacy disclosures, unifying token availability, and hardening all-action Private Pool v2 settlement smoke.

**Architecture:** Add pure contract/catalog modules first, then wire narrow checks and existing operator smoke behavior around them. Keep execution semantics unchanged and fail closed wherever the current repo cannot honestly support hidden economic terms.

**Tech Stack:** TypeScript modules, Node check scripts, existing Private Core and Private Pool v2 operators, existing npm verification scripts.

---

### Task 1: Privacy Boundary Contract

**Files:**
- Create: `src/privacy/vantaPrivacyBoundary.ts`
- Create: `scripts/check-vanta-private-core-privacy-boundary.mjs`
- Modify: `package.json`

- [ ] Add the privacy boundary contract with lane descriptors for Private Core send/swap/unshield and Private Pool v2 shield/claim.
- [ ] Add a checker that imports the compiled TypeScript module and asserts current disclosures include asset/amount/destination where they are still public.
- [ ] Add `private-core:privacy-boundary-check` to `package.json`.
- [ ] Run `npm run private-core:privacy-boundary-check`.

### Task 2: Unified Token Availability

**Files:**
- Create: `src/tokens/vantaTokenCatalog.ts`
- Create: `src/pay/vantaPayAssets.ts`
- Create: `src/solana/tokenAvailability.ts`
- Create: `scripts/check-vanta-token-availability.mjs`
- Modify: `src/pay/vantaPayTypes.ts`
- Modify: `src/pay/vantaPayRuntime.ts`
- Modify: `operator/pay-server.mjs`
- Modify: `package.json`

- [ ] Add a server-safe catalog containing VUSD, USDC, JTO, BONK, JUP, PYUSD, WIF, KMNO, SOL, and USDT.
- [ ] Add a Pay asset helper that owns accepted Pay assets and decimals.
- [ ] Derive `VantaPayAsset` from the Pay helper instead of a standalone union.
- [ ] Replace Pay runtime decimal and accepted-asset duplication with the helper.
- [ ] Update the Pay operator runtime compilation list and supported asset validation to use the helper.
- [ ] Add an app availability adapter layered on `shieldConfig`.
- [ ] Add `token-availability:check` to `package.json`.
- [ ] Run `npm run token-availability:check`.

### Task 3: All-Action Private Pool v2 Protocol Smoke

**Files:**
- Modify: `scripts/check-vanta-private-pool-v2-protocol-client.mjs`
- Modify: `operator/private-pool-v2-server.mjs` only if the red test proves current behavior is insufficient.

- [ ] Extend the protocol client check to submit `shield`, `send`, `swap`, and `unshield`.
- [ ] Assert idempotent repeat for every action.
- [ ] Assert conflicting replay is rejected.
- [ ] Assert proof receipts exist for every action and status reports all protocol settlements.
- [ ] Run `npm run private-pool-v2:protocol-client-check`.

### Task 4: Verification And Memory

**Files:**
- Modify: `/Users/clay/Desktop/Vanta Vault/02 Projects/Vanta ZK Phase 1.md`
- Modify: `/Users/clay/Desktop/Vanta Vault/01 Daily/2026-04-24.md`
- Modify: `/Users/clay/Desktop/Vanta Vault/wiki/meta/log.md`

- [ ] Run `npm run private-core:privacy-boundary-check`.
- [ ] Run `npm run token-availability:check`.
- [ ] Run `npm run private-pool-v2:protocol-client-check`.
- [ ] Run `npm run private-core:contract-smoke`.
- [ ] Run `npm run privacy-rail:contract-check`.
- [ ] Run `npm run truth:transaction-check`.
- [ ] Run `npm run build`.
- [ ] Record exactly what changed and what remains untrue about full privacy in the vault.

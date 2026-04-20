# Vanta Security Limitations

This page is the truthful security boundary for the current Vanta repo.

## Not mainnet-production ready

Vanta is not mainnet-production ready today. The current repo contains real verification lanes, executable proof circuits, operator smoke tests, browser checks, and persistent local operator harnesses, but it is still a development system.

Do not represent this repository as audited, trustless, custody-safe, or ready for real user funds.

## Current private-settlement truth

The strongest current private-settlement lane is the Vanta Private Pool v2 benchmark path:

- local append-only commitment indexing
- local nullifier tracking
- local relayer-shaped claim submission
- local prover/verifier-shaped proof receipts
- Noir-backed shield and claim circuit checks
- operator-owned Pay and protocol settlement receipt endpoints
- restart-safe local JSON persistence for proof and settlement receipts
- idempotent settlement IDs for repeated Pay checkout and protocol settlement requests

This is a useful production-shaped harness. It is not a deployed shared anonymity set.

The checked privacy-rail contract is `docs/privacy-rail-contract.md` and `src/readiness/privacyRailContract.mjs`. Its current active rail is `alpha-public-warning`, which means Vanta must not claim meaningful privacy until Umbra mainnet evidence or Vanta Private Pool v2 production evidence is filled.

## Known limitations

- No audit claim: Vanta has not received an independent third-party cryptographic, smart-contract, infrastructure, or application audit.
- No custody claim: Vanta does not yet have production custody architecture, key-management policy, incident response, or legal review.
- No anonymity-set claim: the current local Private Pool v2 lane does not provide a live mainnet anonymity set or production mixer privacy.
- Render does not create privacy: paid hosting can improve uptime, but privacy requires a real selected rail with live mainnet evidence, relayer separation, nullifier/replay enforcement, safe logging, and reviewed limitations.
- The current Private Pool v2 prover is still local benchmark infrastructure, even though the repo also includes Noir circuit checks and local proof generation.
- The current operator uses local JSON persistence for benchmark receipts, not a production database, replicated log, or on-chain source of truth.
- The current protocol settlement endpoint is a local operator seam, not a deployed Solana program enforcing append/nullifier rules.
- The current Pay product is a local merchant API and checkout harness, not a deployed payment processor.
- The current Strategy product is a local intent and child-order planning surface, not a live autonomous trading engine.
- Strategy planning/runtime does not yet submit live Jupiter swaps, Jito bundles, or private-settlement transactions.
- Current route support is constrained and should not be described as arbitrary private movement of every Solana asset.
- Status surfaces report productionReady: false for local Pay and Private Pool v2 lanes, even when their local verification gates are passing.
- Browser-exposed operator tokens are not production secrets: any `VITE_...` token bundled into the app is suitable only for local or controlled test environments, not as a mainnet operator access-control model.
- Browser UX checks prove navigation and rendering behavior, not wallet security, relayer safety, or cryptographic privacy.
- Live mainnet submission remains disabled.
- Never request, store, or handle private keys, seed phrases, or keypair files.
- Future live transaction paths must simulate before signature, show a human-readable transaction summary, and require explicit human approval before requesting a wallet signature.
- Future wallet signing paths must pass the executable transaction safety summary boundary before requesting approval.

## Operator and infrastructure risks

Before mainnet, Vanta needs production replacements for every local harness boundary:

- deployed indexer service with durable commitment-tree state
- deployed relayer service with quote expiry, replay protection, rate limits, and monitoring
- deployed prover/verifier-key boundary with reproducible build artifacts
- on-chain append/nullifier enforcement where required by the final architecture
- secure API authentication, key rotation, secret storage, and operator access controls
- production secret manager, least-privilege service identities, rotation runbooks, incident revocation, and audit logging
- durable databases, backups, migrations, observability, and incident runbooks
- checked production storage adapters with point-in-time recovery, encrypted backups, restore drills, idempotent writes, and replay-safe uniqueness
- baseline forward-only Postgres migrations applied and restore-tested against production-like infrastructure
- abuse controls for hosted checkout, webhooks, withdrawal flows, proof requests, strategy execution, and operator actions
- privacy-preserving telemetry, structured logs, alerts, audit events, and no secret/private-input logging

## User-facing language rule

Protocol complexity should stay internal. User and merchant surfaces should use simple product language.

Allowed commerce-facing language includes Pay, Invoice, Payment Link, Checkout, Balance, Withdraw, Receipt, Refund, Pending, and Paid.

Avoid exposing terms like shield, unshield, note commitment, ZK, UTXO, private state, obfuscation, and confidential execution inside normal merchant Pay flows.

Strategy surfaces should use trader language such as Strategy, Stealth DCA, Private TWAP, protected landing, private destination, execution quality, and reduced on-chain observability. Do not describe Strategy as completely invisible whale buying.

## Required before mainnet

Vanta is not production-ready until at least the following are complete:

- real mainnet-compatible private settlement
- audited proof and circuit boundaries
- persistent operator, indexer, relayer, and prover services
- secure key and secret handling
- replay and nullifier protection at the final enforcement layer
- durable nullifier replay guard storage and deployed protocol enforcement for all private exits
- browser-verified wallet and checkout UX
- production deployment docs
- legal, compliance, custody, and audit review where applicable
- documented incident response and operational runbooks
- a final threat model covering users, merchants, relayers, operators, and counterparties

## What can be claimed today

It is fair to say:

- Vanta has a production-shaped local Private Pool v2 benchmark lane.
- Vanta has executable Noir-backed shield and claim circuit checks.
- Vanta has local proof generation and proof verification commands.
- Vanta has operator-owned Pay and protocol settlement receipt endpoints.
- Vanta has restart-safe local persistence for proof and settlement receipts.
- Vanta has verification commands that make current limitations visible.

It is not fair to say:

- Vanta is audited.
- Vanta is mainnet ready.
- Vanta is trustless.
- Vanta safely custodies user funds.
- Vanta provides a live production anonymity set.
- Vanta provides final privacy guarantees for arbitrary Solana assets.

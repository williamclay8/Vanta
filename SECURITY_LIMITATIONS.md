# Vanta Security Limitations

Last validated against repo-local code: 2026-05-10. Live deployment evidence was not refreshed for this branch.

This page says what Vanta is allowed to claim today.

Plain-English summary:

- Vanta has real local and mainnet verification work.
- Vanta is still a development system.
- Vanta is not audited.
- Vanta is not mainnet-production ready.
- Vanta should not be used with real user funds unless a bounded operator approval explicitly allows that specific action.

## Not mainnet-production ready

Vanta is not mainnet-production ready today.

The current repo contains real verification lanes, executable proof circuits, operator smoke tests, browser checks, and persistent local operator harnesses. That is meaningful progress, but it is not the same as a finished private settlement network.

Do not represent this repository as audited, trustless, custody-safe, or ready for real user funds.

## Current private-settlement truth

The strongest current private-settlement lane is the Vanta Private Pool v2 benchmark path.

In normal language, it proves that Vanta can exercise the shape of a private settlement system locally:

- local append-only commitment indexing
- local nullifier tracking
- local relayer-shaped claim submission
- local prover/verifier-shaped proof receipts
- Noir-backed Shield, Send, Swap-to-shielded, Claim, and actual-private spend circuit checks/proves
- operator-owned Pay and protocol settlement receipt endpoints
- restart-safe local JSON persistence for proof and settlement receipts
- idempotent settlement IDs for repeated Pay checkout and protocol settlement requests

This is a useful production-shaped harness. It is not a deployed shared anonymity set, not audited privacy, and not a final mainnet rail.

alpha-public-warning: Vanta is an alpha public beta surface today. It is not production private, not audited, and not mainnet-ready for real user funds.

The checked privacy-rail contract is `docs/privacy-rail-contract.md` and `src/readiness/privacyRailContract.mjs`. Current Swap production-status surfaces select Vanta Private Pool v2 for the constrained Swap lane, but meaningful privacy and production-private Swap claims remain blocked until live mainnet settlement, quote/route privacy, live venue privacy, relayer separation, audit, and anonymity-set evidence are reviewed.

## Known limitations

- No audit claim: Vanta has not received an independent third-party cryptographic, smart-contract, infrastructure, or application audit.
- No custody claim: Vanta does not yet have production custody architecture, key-management policy, incident response, or legal review.
- No anonymity-set claim: the current local Private Pool v2 lane does not provide a live mainnet anonymity set or production mixer privacy.
- Private Pool v2 anonymity-set readiness is now a checked fail-closed operator/readiness surface. It remains blocked until Vanta has audited shared-anonymity-set evidence, production anonymity-set metrics, relayer-separation evidence, and reviewed limitations.
- Shield privacy readiness is now a checked fail-closed surface at `npm run shield:privacy-readiness-check`. The local Shield lane has committed settlement packets, viewing-key encrypted memos, beta backup/restore custody, native/SPL entry support, route evidence, and decoy writes, but it must not claim fully private, live private, production, or mainnet-ready Shield until production anonymity-set evidence, durable services, relayer separation, independent audit, live mainnet settlement, and production key-custody evidence are complete.
- Render does not create privacy: paid hosting can improve uptime, but privacy requires a real selected rail with live mainnet evidence, relayer separation, nullifier/replay enforcement, safe logging, and reviewed limitations.
- The current Private Pool v2 prover is still local benchmark infrastructure, even though the repo also includes Noir circuit checks and local proof generation.
- Canonical notes now derive both a legacy SHA-256 display/audit commitment and a Poseidon/BN254 proof-facing commitment. Live Shield records carry both, and Live Send successor persistence preserves the proof-facing commitment after redaction. The local browser shielded-state index still inserts the legacy SHA-256 commitment and is not the production shared Poseidon tree.
- Private Pool v2 legacy shield/claim shadow commitments are deterministic SHA-256 audit handles over operator-visible terms. The current local Shield Noir circuit/fixture additionally binds source mint, target mint, target asset, and amount to a Poseidon economics commitment; operator/capability request paths carry `economics-commitment` handles and hidden-economics sentinels instead of raw proof inputs. This removes raw Shield economics from the typed proof/public-input boundary, but it is still local benchmark infrastructure and must not be described as audited hidden-economic-terms privacy, a live shared anonymity set, or mainnet-production private Shield.
- Private Pool v2 Send now has a local proof-request boundary, executable circuit fixture/check, checked local verifier/indexer mutation, and checked role-service deterministic private-send mutation that bind input root, input commitment, nullifier, recipient/change commitments, recipient/change leaf indices, recipient/change output roots, asset commitment, economics commitment, owner commitment, and send context tag while using hidden-economics sentinels for raw asset/amount. The local Noir fixture lane now constrains recipient/change output roots with private Poseidon append-path witnesses instead of transitional 3-input root handles, proves private amount conservation as `input_amount == recipient_amount + change_amount` behind an economics commitment, constrains Send economics witnesses to `u128` before Poseidon field encoding, and binds recipient/change memo ciphertext body hash fields into the Send public-input hash. New live Send action memos fail closed without a Shield viewing key and write v2 AEAD ciphertext with legacy v1 parsing retained for historical memos; legacy v1 plaintext history is explicitly excluded from production privacy claims unless migrated or segregated with reviewed evidence. A local dual-AEAD scaffold can separately seal recipient and change discovery memos and expose `sha256:` ciphertext body hashes for that local proof-request/circuit binding. The separated local indexer now accepts commitment-only encrypted view-tag/body-hash discovery packets and rejects raw recipient, amount, plaintext memo, wallet key, witness, and serialized transaction fields; this is local handoff evidence, not deployed recipient discovery. The current local operator path can verify Send proof artifacts without receiving private witness material, but that route remains local proof-artifact evidence and does not create a production prover/verifier or mainnet-private Send claim. This is not yet production private Send because deployed recipient viewing-key discovery/exchange or view tags, deployed memo/indexer handoff, live production transition evidence, relayer separation, anonymity evidence, audit, and production evidence remain blocked.
- Private Pool v2 Swap now has a local proof-request boundary, executable circuit fixture/check, checked committed protocol settlement path, and checked local verifier/indexer atomic mutation that bind input root, input commitment, nullifier/replay commitment, settlement commitment, route commitment, economics commitment, output commitment, output leaf index, output root, owner commitment, swap context tag, and swap public-input hash while keeping raw input asset, output asset, input amount, and output amount out of the typed proof-request disclosure. The local Noir fixture lane now constrains the successor output root with a private Poseidon append-path witness instead of a transitional 3-input root handle. New live Swap action memos fail closed without a Shield viewing key and write v2 AEAD ciphertext with legacy v1 parsing retained for historical memos. This is not yet production private Swap because quote and route privacy before operator settlement, relayer separation, anonymity-set evidence, audit, production evidence, and live venue privacy remain blocked.
- Private Pool v2 Unshield now has a local proof-request boundary, committed-economics protocol/operator acceptance, and checked local verifier/indexer atomic exit mutation that bind input root, input commitment, nullifier/replay commitment, settlement commitment, route commitment, exit-terms commitment, economics commitment, owner commitment, and unshield context tag while rejecting raw destination/asset/amount/owner on that committed path. New live Unshield/SOL-Unshield/spent-marker action memos fail closed without a Shield viewing key and write v2 AEAD ciphertext with legacy v1 parsing retained for historical memos. This is not a production private exit rail, because relayer-separated execution, safe logging, anonymity-set evidence, audit, and production evidence remain blocked.
- Private Pool v2 protocol Send/Swap/Unshield can use committed-economics settlement requests and receipts in the local operator path. In that mode the operator request/receipt carries commitments instead of raw amount, asset, destination, or owner fields, but this is still a local benchmark boundary and not audited hidden-economic-terms privacy, relayer-separated production privacy, or a live anonymity set.
- Pay checkout now routes operator-backed live checkout settlement through the Private Pool v2 committed `send` protocol endpoint with stateful private-send commitments. Pay withdrawal now routes the configured-operator path through committed `unshield` protocol settlement with commitment-only economics/route/exit handles instead of raw `/pay-settlements`, and the legacy raw Pay settlement endpoint is fail-closed by default. The `/v1/checkout/sessions/{id}/complete` endpoint is still a local test-harness completion unless it carries explicit typed customer payment evidence such as a `solana:signature:<base58-signature>` reference; customer-side wallet payment evidence is not wired for production. This is still not production payment privacy: the lane remains local benchmark infrastructure without audited anonymity-set evidence, relayer-separated production execution, live mainnet settlement, or production readiness.
- Private Core send, swap, and unshield proof ABIs now expose economic-terms hashes instead of raw proof-public asset/amount/destination terms where applicable, but the operator/request and exit-settlement layers still see those terms. This is hash-bound proof privacy, not hidden-economic-terms privacy.
- Private Core Unshield now constrains a Poseidon proof-owner key derived from the owner secret and binds that key into the proving note commitment and nullifier. The source-layer owner key remains X25519 and is prechecked outside Noir, so this must not be described as an in-circuit X25519 ownership proof or final no-witness owner authorization.
- The current operator uses local JSON persistence for benchmark receipts, not a production database, replicated log, or on-chain source of truth.
- The current protocol settlement endpoint is a local operator seam, not a deployed Solana program enforcing append/nullifier rules.
- The current Pay product is a local merchant API and checkout harness, not a deployed payment processor.
- The current Strategy product is a local intent and child-order planning surface, not a live autonomous trading engine.
- Strategy planning/runtime can derive a redacted private-rail handoff, committed-economics request packet, and commitment-only route/quote handles for local verification, and the local Strategy operator runtime can queue and drain-preview those packets behind a fail-closed live-submission gate. Strategy now has a checked production-service readiness packet for required env refs, durable tables, scheduler replay evidence, telemetry, audit events, and live-submission approval, but those refs are not live production evidence. It does not yet submit live Jupiter swaps, Jito bundles, or private-settlement transactions, and it does not prove live venue route/quote privacy.
- Current route support is constrained and should not be described as arbitrary private movement of every Solana asset.
- Shield beta deposits require an explicit configured vault owner. The app and operator no longer fall back to a hard-coded mainnet regular-wallet vault owner; if an operator-wallet vault owner is configured, that remains beta custodial infrastructure, not production key custody or a program-owned pool vault. The current Unshield release path is an operator-keypair public exit: the operator signs SPL/SOL transfers from the configured vault owner until a program-owned vault PDA plus on-chain `TAG_UNSHIELD` proof-verified release path replaces it.
- Status surfaces report productionReady: false for local Pay and Private Pool v2 lanes, even when their local verification gates are passing.
- Browser-exposed operator tokens are not production secrets: any `VITE_...` token bundled into the app is suitable only for local or controlled test environments, not as a mainnet operator access-control model. `npm run frontend:operator-env-exposure-check` builds with forbidden token canaries and scans the production bundle for operator/auth-token-shaped browser env exposure.
- Browser UX checks prove navigation and rendering behavior, not wallet security, relayer safety, or cryptographic privacy.
- Live mainnet submission mode can be enabled in bounded operator windows, but real-funds actions still require explicit approval and must not be presented as production-ready private settlement.
- Transaction Evidence v0.1 is evidence of the current transaction or receipt trace only; it may include mainnet signatures, local/operator receipt ids, and redacted linkage fields, but it does not prove mainnet finality, production settlement, or privacy guarantees. It must not store private inputs, secrets, seed phrases, raw customer data, signed transaction material, or credential-bearing URLs.
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
- Vanta has executable Noir-backed Shield, Send, Swap-to-shielded, Claim, and actual-private spend circuit checks/proves.
- Vanta has local proof generation and proof verification commands.
- Vanta has a guarded Poseidon/BN254 canonical-note proving commitment alongside the legacy SHA-256 display commitment.
- Vanta has operator-owned Pay and protocol settlement receipt endpoints.
- Vanta has local Private Pool v2 committed-economics protocol settlement coverage for Shield, Send, Swap, and Unshield receipts.
- Vanta has local Private Pool v2 proof-request boundaries for Shield, Send, Swap, and Unshield that replace raw economics with commitments at that typed request layer.
- Vanta has a machine-readable Private Pool v2 anonymity-set readiness status that blocks live-anonymity and audited-privacy claims.
- Vanta has restart-safe local persistence for proof and settlement receipts.
- Vanta has verification commands that make current limitations visible.

It is not fair to say:

- Vanta is audited.
- Vanta is mainnet ready.
- Vanta is trustless.
- Vanta safely custodies user funds.
- Vanta provides a live production anonymity set.
- Vanta provides final privacy guarantees for arbitrary Solana assets.

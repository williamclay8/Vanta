# Vanta Privacy Rail Contract

This contract protects Vanta's user-facing privacy claims while the infrastructure path is being finalized.

Render does not create privacy. Render can host services, improve uptime, and make staging or production operators reachable, but privacy comes from the selected rail: an external protocol such as Umbra, or Vanta's own deployed Private Pool v2.

Current status:

- `mainnetReady: false`
- `productionReady: false`
- meaningful privacy claims are blocked

## Trust packets (counterparty artifacts)

Vanta’s privacy posture is only useful when it produces a shareable, bounded artifact a counterparty can verify.

These action-specific trust packets are the canonical machine-readable surfaces for “what happened, what can be proven, what remains private, and what is still blocked”:

- `npm run shield:trust-packet-check` (JSON: `npm run shield:trust-packet-json`)
- `npm run send:trust-packet-check` (JSON: `npm run send:trust-packet-json`)
- `npm run swap:trust-packet-check` (JSON: `npm run swap:trust-packet-json`)
- `npm run unshield:trust-packet-check` (JSON: `npm run unshield:trust-packet-json`)

These commands must remain fail-closed: they should never imply “production-private”, “fully private”, “anonymity”, “audited”, or “mainnet-ready” unless the matching gates are actually satisfied.

Trust packets bind to current operator-shaped commitments; cryptographic verifiability against an audited proof system is part of the readiness work tracked in `SECURITY_LIMITATIONS.md`.

The 2026-06-06 Twitter intelligence pass adds three required trust-packet dimensions: local proving evidence, usage velocity evidence, and institutional disclosure scope. In current beta state these fields are red-first and fail-closed. They should show whether private inputs stayed client-side by default, whether an action has reviewer-verifiable usage metrics, and whether any selective disclosure is explicit, time and scope limited, and counterparty-verifiable. They must not imply live institutional volume, regulatory approval, anonymity, production privacy, or mainnet readiness.

## Institutional selective-disclosure receipt

Vanta Pay now carries a narrow institutional selective-disclosure receipt primitive:

- schema: `vanta-pay-institutional-disclosure-receipt-v0.1`
- command: `npm run pay:institutional-disclosure-receipt-check`
- purpose: receipt-scoped, counterparty-verifiable private settlement
- default scope: time-and-scope-limited and `receipt_only`
- redactions: no customer email value, full private rail receipt id, full audit disclosure id, private inputs, witness data, or full transaction history
- claim controls: `productionReady: false`, regulator approval claim blocked, compliance assurance claim blocked, anonymity claim blocked

This is a receipt/trust-packet boundary. It does not create real regulator access controls, live institutional volume, legal approval, production privacy, or mainnet readiness.

## Receipt growth loop

Vanta Pay now carries a counterparty-verifiable receipt growth loop:

- schema: `vanta-pay-receipt-growth-loop-v0.1`
- evidence schema: `vanta-pay-growth-loop-evidence-v0.1`
- command: `npm run pay:growth-loop-check`
- loop: private action -> trust packet ready -> counterparty verification -> invited use -> repeated private action
- verifier route: `/receipt/:receiptId`
- local fixture events: `receipt_generated`, `share_link_copied`, `counterparty_verifier_opened`, and `next_private_settlement_requested`
- usage velocity: local fixture counters can be derived for 7d/30d volume, transaction, invited-counterparty, counterparty-verifier-open, next-private-settlement-request, and repeated-action counts
- claim controls: production readiness, adoption, regulator approval, compliance assurance, and anonymity claims remain blocked

This turns the receipt into the growth artifact without claiming live adoption. The current surface proves the beta trust-packet shape, counterparty verifier path, and fixture-only measurement contract. Live adoption claims remain blocked until reviewer-verifiable live evidence exists.

## Rails

### `alpha-public-warning`

This is the current safe fallback. It allows self-custody testing and possible mainnet-alpha wallet flows, but it cannot claim meaningful privacy.

Required stance:

- tell users this is experimental
- do not describe transactions as private
- require explicit wallet approval
- avoid Pay/Strategy production claims

Current checked refs:

- `SECURITY_LIMITATIONS.md`
- `npm run mainnet:readiness-check`
- `npm run privacy-rail:contract-check`

### `umbra-mainnet`

This rail is for an Umbra-backed mainnet integration if Vanta can prove the supported assets, wallet flows, mixer or encrypted-balance route, relayer assumptions, and limitations.

It cannot claim meaningful privacy until Vanta has refs for:

- `VANTA_UMBRA_MAINNET_CAPABILITY_REF`
- `VANTA_UMBRA_SUPPORTED_ASSET_REF`
- `VANTA_UMBRA_WALLET_SIGNING_EVIDENCE_REF`
- `VANTA_UMBRA_PRIVACY_LIMITATIONS_REF`

Current checked refs:

- `npm run mainnet:wallet-signing-status`
- `npm run mainnet:wallet-signing-evidence-check`
- `docs/privacy-rail-contract.md`

### `vanta-private-pool-v2`

This rail is for Vanta-operated private settlement.

Current local shield/claim shadow commitments are deterministic audit handles
over operator-visible terms. They are useful for receipt comparison and future
circuit plumbing, but they do not satisfy the meaningful-privacy refs below and
do not hide asset, amount, route, destination, relayer, or nullifier terms from
the current operator.

Current local protocol Send/Swap/Unshield committed-economics settlement requests move
raw amount, asset, destination, and owner fields out of the operator
request/receipt shape when callers supply settlement, route, replay, owner, and
economics commitments. This is a useful typed operator boundary, but it still
does not satisfy the meaningful-privacy refs below and must not be described as
audited production privacy or a live anonymity set.

Current local Pay checkout proof requests can use a hidden-economics boundary
that exposes commitment-only settlement, route, replay/nullifier, owner,
economics, and output handles. Operator-backed live Pay checkout now routes
through the Private Pool v2 committed protocol `send` endpoint: the checker
starts the local operator, runs `settleCheckoutSession`, verifies no raw
`/pay-settlements` checkout record is created, and confirms the committed
protocol settlement id is recorded. The committed request/receipt omits raw
checkout amount, asset, destination, owner, session, client token, email, and
merchant id. The configured-operator Pay withdrawal path now routes through
committed protocol `unshield` settlement with commitment-only economics, route,
exit, owner, input, and nullifier handles instead of raw `/pay-settlements`.
The legacy raw Pay settlement endpoint is fail-closed by default and is not a
production readiness endpoint.
This is not a completed private payment processor: production privacy claims
remain blocked until live mainnet settlement, audited anonymity-set evidence,
relayer-separated production execution, durable production services, and the
strict readiness gate are satisfied.

Current actual-private Private Pool v2 Send proof requests bind a pool id, asset
cohort, asset-id commitment, accepted root, nullifier, output commitments,
context hash, and proof public-input hash while using hidden-economics
asset/amount sentinels. The local
verifier/indexer and separated role-service harness now accept that stricter
request shape by registering the nullifier and appending output commitments
without source wallet, merchant settlement address, raw amount, note secret,
input commitment, input leaf index, deposit signature, plaintext memo, or
same-fee-payer linkage. The older stateful Send request remains as a
compatibility fallback, not the target privacy lane. A local dual-AEAD Send
memo scaffold can separately seal recipient and change discovery memos and
emit `sha256:` ciphertext body hashes. The local Private Pool v2 Send proof
request and circuit bind recipient/change ciphertext body hash fields into the
Send public-input hash, and the separated local indexer now accepts
commitment-only encrypted view-tag/body-hash discovery packets while rejecting
raw recipient, amount, plaintext memo, wallet key, witness, and serialized
transaction fields. External Send remains blocked until recipient viewing-key
exchange or deployed view-tag/indexer discovery is wired. Legacy v1 plaintext
Send history remains parse-compatible but is excluded from production privacy
claims unless migrated or segregated with reviewed evidence. This is still not
a completed production private Send rail: live production transition evidence,
deployed memo/indexer handoff, relayer separation, anonymity evidence, audit,
and production evidence are still missing.

Current local Private Pool v2 Swap proof requests, executable circuit fixture,
committed protocol settlement path, and local verifier/indexer acceptance bind
an input root, input commitment, nullifier/replay commitment, settlement
commitment, route commitment, economics commitment, output commitment, output
leaf index, output root, owner commitment, swap context tag, and swap
public-input hash without raw input/output asset or amount fields in the typed
proof-request disclosure. The local verifier/indexer applies the
swap-to-shielded nullifier registration and output append atomically. This is
still not a completed production private Swap rail: quote and route privacy
before operator settlement, relayer separation, live venue privacy, anonymity-set
evidence, audit, and production evidence remain missing.

Current local Strategy private-rail packets can derive a redacted Private Core
send/swap handoff from a scratch shield simulation and map that handoff into
committed-economics Private Pool v2 Send and Swap request packets. Those packets
carry roots, nullifiers, commitments, proof-public hashes, and context tags, not
raw pair, total notional, child notional, schedule, private witness material, or
ciphertexts. The checked route/quote evidence gate requires commitment-only
route and quote handles on the local committed request shape. The local Strategy
operator runtime can accept, queue, and drain-preview those redacted packets
while keeping `liveSubmission: false`; it also rejects raw
amount/asset/destination/owner/route/quote fields on the committed request path.
The checked Strategy production-service readiness packet names the required
production env refs, durable tables, scheduler replay evidence, telemetry,
audit-event sink, and live-submission approval before live execution claims can
move. This is still a local request/trust-packet boundary: Strategy does not yet
submit live private execution, run a production scheduler, prove live venue
route/quote privacy, prove an anonymity set, or satisfy audit/mainnet gates.

Current local Private Pool v2 Unshield proof requests and committed protocol
settlement acceptance bind an input root, input commitment, nullifier/replay
commitment, settlement commitment, route commitment, exit-terms commitment,
economics commitment, owner commitment, and unshield context tag while using
hidden-economics sentinels for raw destination/asset/amount. The committed
operator path rejects raw destination, asset, amount, and owner fields and emits
commitment-only Unshield receipts. The local verifier/indexer applies the
unshield replay/nullifier registration and exit transition atomically. This is
still not a completed private Unshield rail: relayer-separated execution, safe
logging, anonymity-set evidence, audit, and production evidence remain missing.

The checked Private Pool v2 anonymity-set readiness surface is fail-closed. It
requires at least 1024 distinct production commitments per asset cohort, excludes
test fixtures and no-real-funds smoke receipts from cohort metrics, and keeps
live-anonymity, audited hidden-economics privacy, and production mainnet privacy
claims blocked until the required evidence refs are filled and reviewed.

The checked Shield privacy readiness surface is fail-closed. Local Shield can
claim committed settlement packets, viewing-key encrypted memos, beta
backup/restore custody, native/SPL entry support, route evidence, and decoy
writes. It still cannot claim fully private, live private, production, or
mainnet-ready Shield until production anonymity-set evidence, durable services,
relayer separation, independent audit, live mainnet settlement, and production key-custody evidence are complete. The human and JSON readiness surfaces expose
local capabilities, production gate blockers, external gate blockers, required
evidence refs, `strictReady: false`, and `claimAllowed: false`; they must not be
used as a Shield-ready signal.

It cannot claim meaningful privacy until Vanta has refs for:

- `VANTA_PRIVATE_POOL_V2_PRODUCTION_SMOKE_EVIDENCE_REF`
- `VANTA_PRIVATE_POOL_V2_AUDIT_REF`
- `VANTA_PRIVATE_POOL_V2_ANONYMITY_SET_REF`
- `VANTA_PRIVATE_POOL_V2_PRODUCTION_ANONYMITY_METRICS_REF`
- `VANTA_PRIVATE_POOL_V2_RELAYER_SEPARATION_REF`
- `VANTA_PRIVATE_POOL_V2_NULLIFIER_ENFORCEMENT_REF`
- `VANTA_SHIELD_PRODUCTION_KEY_CUSTODY_REF`

Current checked refs:

- `npm run private-pool-v2:hidden-economics-request-check`
- `npm run private-pool-v2:send-proof-request-check`
- `npm run private-pool-v2:swap-to-shielded-proof-request-check`
- `npm run private-pool-v2:unshield-proof-request-check`
- `npm run private-pool-v2:send-circuit-check`
- `npm run private-pool-v2:swap-to-shielded-circuit-check`
- `npm run private-pool-v2:swap-to-shielded-prove`
- `npm run private-pool-v2:anonymity-set-readiness-check`
- `npm run shield:privacy-readiness`
- `npm run shield:privacy-readiness-json`
- `npm run shield:privacy-readiness-check`
- `npm run private-pool-v2:protocol-client-check`
- `npm run private-pool-v2:http-smoke`
- `npm run strategy:private-rail-check`
- `npm run strategy:committed-settlement-check`
- `npm run strategy:route-quote-privacy-check`
- `npm run strategy:production-service-readiness-check`
- `npm run strategy:operator-runtime-check`
- `npm run strategy:privacy-readiness-check`
- `ops/mainnet/private-pool-v2-production-smoke.evidence.json`
- `ops/mainnet/private-pool-v2-nullifier-replay.evidence.json`
- `ops/mainnet/private-pool-v2-role-service-replay.evidence.json`
- `ops/mainnet/private-pool-v2-route-health.evidence.json`
- `ops/mainnet/service-deployment.evidence.json`

## User-Facing Rule

Do not claim meaningful privacy unless the selected rail has live mainnet evidence, relayer separation, nullifier/replay enforcement, safe logging, and reviewed limitations.

Use `createVantaPrivacyClaimDecision` before future UI/operator surfaces describe a transaction as private. The helper fails closed and returns user-safe copy plus the missing evidence for the selected rail.

## Verification

Run:

```bash
npm run privacy-rail:contract-check
npm run mainnet:wallet-signing-evidence-check
npm run mainnet:nullifier-replay-evidence-check
npm run mainnet:private-rail-route-health-evidence-check
npm run mainnet:production-smoke-evidence-check
npm run mainnet:preflight
```

# Twitter Intelligence Requirements - 2026-06-06

This file turns the 2026-06-06 SuperGrok/Hermes Twitter research pass into repo-local product gates. It is a claim-control artifact, not a marketing page.

## Current Scope

The research pass identified five product requirements:

1. Usage velocity must become a first-class success metric.
2. Local/client-side proving must remain the default privacy direction.
3. Institutional settlement needs a dedicated lane for selective disclosure and audit trails.
4. Vanta must describe hybrid ZK honestly: ZK proofs plus non-ZK mechanisms, not pure-ZK magic.
5. HeliusPrivacy must be tracked as the primary Solana-native privacy benchmark before major releases.

## Product Interpretation

The right product direction is counterparty-verifiable private settlement. Vanta should make a private action useful to another party through a receipt or trust packet that names:

- what happened;
- what can be verified;
- what stayed private;
- what local proving protected;
- what claim gates remain locked;
- what usage velocity or institutional velocity the action can eventually contribute to.

This keeps the product aligned with the receipt growth loop without implying live anonymity, production privacy, or mainnet readiness.

The first implemented receipt growth loop is Pay-scoped:

- schema: `vanta-pay-receipt-growth-loop-v0.1`
- evidence schema: `vanta-pay-growth-loop-evidence-v0.1`
- live measurement schema: `vanta-pay-live-growth-loop-measurement-v0.1`
- measured loop implementation schema: `vanta-pay-measured-loop-implementation-v0.1`
- command: `npm run pay:growth-loop-check`
- implementation command: `npm run pay:measured-loop-implementation-check`
- live measurement endpoints: `GET /v1/growth-loop/status`, `POST /v1/growth-loop/events`
- verifier route: `/receipt/:receiptId`
- loop: private action -> trust packet ready -> counterparty verification -> invited use -> repeated private action
- fixture events: `receipt_generated`, `share_link_copied`, `counterparty_verifier_opened`, and `next_private_settlement_requested`
- metric posture: local fixture counters derive 7d/30d volume, transaction count, invited counterparties, counterparty verifier opens, next-private-settlement requests, and repeated private actions; the Pay operator can additionally retain redacted first-party live events for the same loop while live claim lift remains blocked

The receipt growth loop is a beta trust-packet, verifier-surface, fixture-measurement primitive, claim-blocked live redacted measurement surface, and measured loop implementation packet. The implementation packet ties together runtime event capture, redacted operator intake, status discovery, public discovery, and claim controls. It is not a claim of adoption, live institutional volume, production privacy, or legal/compliance approval.

## Usage Velocity Gate

Usage velocity means measurable on-chain activity directly enabled by Vanta primitives. Every tracked primitive must carry:

- 7d and 30d volume placeholders;
- user and transaction count placeholders;
- DeFi flow attribution;
- trend;
- red-first evidence status;
- institutional sub-metrics for future institutional velocity.

Claim lift stays blocked until the metrics are backed by reviewer-verifiable on-chain data. Zero placeholder values are allowed only as fail-closed tracking state.

## Local Proving Gate

Local proving means private inputs and witnesses stay on the client device by default. Any server-side proving route must be explicit, consented, audit-labeled, and visible in receipts or status surfaces.

The current repo-local implementation remains beta/local evidence. This gate does not claim production prover readiness.

## Institutional Lane

The institutional lane starts with selective disclosure, audit trails, jurisdiction-aware unshield design, and regulator access controls. These are time and scope limited by default. The first narrow primitive should prove one attribute, such as amount threshold or window membership, without exposing the full transaction history.

Institutional velocity is a tracked metric family, not a claim that Vanta has institutional customers or live institutional volume.

The first implemented Pay primitive is a receipt-scoped selective-disclosure receipt:

- schema: `vanta-pay-institutional-disclosure-receipt-v0.1`
- command: `npm run pay:institutional-disclosure-receipt-check`
- disclosed scope: one Pay receipt, its status, amount/asset, invoice reference, redacted settlement/audit prefixes, claim boundary, and verification commands
- redacted scope: customer email value, full private rail receipt id, full audit disclosure id, private inputs, witness data, and full transaction history

This keeps the institutional lane concrete while preserving beta truth: it is a trust-packet primitive, not live institutional adoption, production privacy, or legal/compliance approval.

## Hybrid ZK Direction

ZK proves validity, but it does not by itself provide selective regulator access, revocation, relayer network privacy, identity policy, or usage attribution. Vanta's design must combine ZK proofs with scoped viewing keys, revocation lists, blinded-token relayer access, policy allowlists, operator runbooks, and explicit claim gates where those mechanisms are the actual boundary.

## Benchmark Cadence

HeliusPrivacy remains the primary Solana-native privacy benchmark. Before a major Vanta release, run the watch process and decide whether the latest movement should be copied, countered, ignored, or deep-read.

## Verification

Run:

```bash
npm run twitter-intelligence:check
npm run truth:privacy-claim-gate
npm run privacy-audit:tracker-check
```

These commands verify wiring and claim discipline only. They do not prove live usage, production privacy, audit acceptance, or mainnet readiness.

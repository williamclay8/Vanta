# R9 Recipient Discovery Decision Blocker - 2026-05-14

## Status

Blocked product/protocol design.

Superseded by the approved path note after Clay approved hybrid discovery on 2026-05-14:

- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-14-r9-recipient-discovery-approved-path.md`

## What This Clarifies

R9 is not an unscoped TODO. production recipient discovery requires an owner product/protocol decision before implementation should proceed.

The local R9A body-hash handoff is implemented, but production recipient discovery still needs a chosen discovery model, deployed service behavior, UX, and auditable privacy boundaries.

## Current Local Evidence

- `src/solana/vantaShieldViewingKey.ts` supports X25519/XChaCha20 memo packets and encrypted view tags.
- `src/solana/vantaShieldState.ts` builds local Send discovery handoff packets with encrypted view tags and `memoCiphertextBodyHash`.
- `src/privacy/privatePoolV2ProofRequests.ts` binds recipient/change memo ciphertext body hashes into Send proof public-input fields.
- `operator/private-pool-v2-service-network.mjs` validates `proofBoundMemoCiphertextBodyHash` against `memoCiphertextBodyHash` before local verifier-mirrored packet storage.
- `scripts/check-vanta-private-pool-v2-send-discovery-indexer-handoff.mjs` guards the local indexer handoff and keeps `productionReady: false`.

## Owner Decision Required

Choose one production discovery model before implementing R9:

1. Direct viewing-key exchange.
   - Best for known merchants, OTC desks, treasury counterparties, and high-trust payment relationships.
   - Smaller indexing surface, but requires explicit key exchange and recovery UX.

2. Indexed encrypted view tags.
   - Best for async wallet-style discovery and scalable recipient lookup.
   - Requires deployed indexer semantics, query privacy decisions, anti-scraping/rate-limit policy, and metadata leakage review.

3. Hybrid discovery.
   - Direct viewing-key exchange for known counterparties plus indexed encrypted view tags for async discovery.
   - Most flexible, but has the largest implementation and audit surface.

## Recommended Default

The current Vanta Distribution Ethos points toward hybrid discovery, with direct viewing-key exchange first for merchant/OTC/treasury design partners and indexed encrypted view tags only after the service/indexer privacy boundary is reviewed.

Clay approved this recommendation as the product/protocol direction on 2026-05-14. Do not treat the approval as implemented protocol behavior.

## Remaining Production Requirements

- Deployed viewing-key exchange or view-tag/indexer protocol.
- external-recipient discovery UX.
- Query privacy and rate-limit policy.
- Recovery behavior for lost local keys.
- Service health/readiness receipts.
- Reviewer-facing threat model update for indexer/counterparty visibility.
- Explicit resolution of blocker `send-memo-indexer-body-hash-handoff-not-deployed`.

## Verification

- `npm run private-pool-v2:send-discovery-indexer-handoff-check`
- `npm run private-pool-v2:service-network-check`
- `npm run send:discovery-migration-policy-check`
- `npm run mainnet:send-production-check`

## Truth Boundary

This note is not production recipient discovery, not external-recipient UX, not deployed viewing-key exchange, not deployed view-tag indexing, not audit acceptance, not production privacy, and not real-funds readiness.

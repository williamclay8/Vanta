# R9 Recipient Discovery Approved Path - 2026-05-14

## Status

Approved owner decision.

Clay approved hybrid discovery on 2026-05-14.

## Approved Direction

Use hybrid discovery:

1. direct viewing-key exchange first for merchant/OTC/treasury design partners.
2. indexed encrypted view tags after service/indexer privacy review.

This turns the earlier R9 product/protocol blocker into an approved implementation path. The first local direct-key scaffold now exists, but it does not make recipient discovery production ready.

## Current Local Evidence

- `src/solana/vantaShieldViewingKey.ts` already supports X25519/XChaCha20 memo packets and encrypted view tags.
- `src/solana/vantaShieldViewingKey.ts` now exports direct viewing-key exchange packet helpers with `productionReady: false`, `direct-known-counterparty` scope, and private-field rejection.
- `src/solana/vantaRecipientViewingKeyExchange.ts` stores direct viewing-key exchange packets locally by recipient and fingerprint.
- `src/pages/SendPage.tsx` detects local direct viewing-key exchange packets, but external Private Core Send remains blocked until proof-owner exchange is available.
- `src/components/RecipientField.tsx` describes external delivery as direct-key beta only and not deployed recipient discovery.
- `src/solana/vantaShieldState.ts` builds Send discovery handoff packets with `memoCiphertextBodyHash`.
- `src/privacy/privatePoolV2ProofRequests.ts` binds recipient/change memo ciphertext body hashes into Send proof public-input fields.
- `operator/private-pool-v2-service-network.mjs` checks `proofBoundMemoCiphertextBodyHash == memoCiphertextBodyHash` before local verifier-mirrored packet storage.
- `scripts/check-vanta-private-pool-v2-send-discovery-indexer-handoff.mjs` keeps `productionReady: false` and blocker `send-memo-indexer-body-hash-handoff-not-deployed`.

## Implementation Requirements

- Production direct viewing-key exchange UX for known counterparties.
- Recipient key registration or exchange packet distribution beyond browser-local registry.
- Indexed encrypted view tags only after service/indexer privacy review.
- Deployed discovery/indexer service behavior.
- external-recipient discovery UX.
- Query privacy, anti-scraping, and rate-limit policy.
- Recovery behavior for lost local keys.
- Service health/readiness receipts.
- Threat-model update for indexer/counterparty visibility.

## Verification

- `npm run private-pool-v2:send-discovery-indexer-handoff-check`
- `npm run private-pool-v2:service-network-check`
- `npm run send:direct-viewing-key-exchange-check`
- `npm run send:discovery-migration-policy-check`
- `npm run mainnet:send-production-check`

## Truth Boundary

This note records an approved design direction and a local direct viewing-key exchange scaffold. It is not production recipient discovery, not external-recipient execution, not deployed viewing-key exchange service behavior, not deployed view-tag indexing, not audit acceptance, not production privacy, and not real-funds readiness.

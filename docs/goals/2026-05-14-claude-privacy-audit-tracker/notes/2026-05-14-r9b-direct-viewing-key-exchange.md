# R9B Direct Viewing-Key Exchange - 2026-05-14

## Status

Local implemented, local-only.

This is the first approved hybrid discovery phase for known counterparties. It is not production recipient discovery.

## What Changed

- `src/solana/vantaShieldViewingKey.ts` defines `VantaShieldRecipientViewingKeyExchangePacket` helpers with `productionReady: false`, `direct-known-counterparty` scope, fingerprint validation, and forbidden plaintext/private field rejection.
- `src/solana/vantaRecipientViewingKeyExchange.ts` stores direct viewing-key exchange packets in browser-local storage by recipient and fingerprint.
- `src/pages/SendPage.tsx` detects a local direct viewing-key exchange packet, but external Private Core Send still stays blocked until proof-owner exchange is available.
- `src/components/RecipientField.tsx` labels external recipient delivery as direct-key beta only and not deployed recipient discovery.
- `package.json` wires `npm run send:direct-viewing-key-exchange-check` into `send:verify` and `truth:privacy-claim-gate`.

## Verification

- Red-first: `npm run send:direct-viewing-key-exchange-check` failed before the registry/helper implementation existed.
- `npm run send:direct-viewing-key-exchange-check`
- `npm run send:recipient-validation-check`
- `npm run send:discovery-migration-policy-check`
- `npm run private-pool-v2:send-discovery-indexer-handoff-check`
- `npm run mainnet:send-production-check`

## Truth Boundary

This is browser-local direct-key beta only. It is not indexed encrypted view tags, not deployed recipient discovery, not external-recipient execution, not query-private indexer behavior, not production privacy, and not real-funds readiness.

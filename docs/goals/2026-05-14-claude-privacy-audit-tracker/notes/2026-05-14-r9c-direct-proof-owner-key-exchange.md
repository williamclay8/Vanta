# R9C Direct Proof-Owner Key Exchange - 2026-05-14

## Status

Local implemented, local-only.

This extends the approved direct-key beta packet so known counterparties can publish both the viewing public key needed for memo encryption and the recipient proof-owner public key needed by the future external Private Core Send proof path.

## What Changed

- `src/solana/vantaShieldViewingKey.ts` now requires `recipientOwnerPublicKey` in `VantaShieldRecipientViewingKeyExchangePacket`.
- The packet fingerprint includes `recipientOwnerPublicKey`, so a viewing key cannot be silently rebound to a different proof-owner public key.
- The packet validator rejects malformed proof-owner public keys and continues rejecting private fields such as `secretKey`, `ownerSecret`, `privateInputs`, and `witness`.
- `src/pages/SendPage.tsx` detects the local proof-owner public key but keeps external Private Core Send blocked until the external Send proof path is enabled.
- `scripts/check-vanta-send-direct-viewing-key-exchange.mjs` now guards the public proof-owner key field, fingerprint binding, malformed-key rejection, and fail-closed Send copy.

## Verification

- Red-first: `npm run send:direct-viewing-key-exchange-check` failed on missing `recipientOwnerPublicKey`.
- `npm run send:direct-viewing-key-exchange-check`
- `npx tsc --noEmit --pretty false`

## Truth Boundary

This is public-key exchange only. It is not recipient authentication, not a signature scheme, not external-recipient execution, not production recipient discovery, not query-private indexer behavior, not production privacy, and not real-funds readiness.

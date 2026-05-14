# R9A Ciphertext Body-Hash Discovery Binding - 2026-05-14

## Status

Local implemented, local-only.

## What This Closes

This closes the local proof-bound ciphertext body-hash discovery-binding part of R9A from the Claude privacy audit: Vanta already carries proof-bound ciphertext body-hash fields into the local verifier-mirrored discovery handoff, and the tracker now records that evidence.

## Files

- `src/solana/vantaShieldViewingKey.ts`
- `src/solana/vantaShieldState.ts`
- `src/privacy/privatePoolV2ProofRequests.ts`
- `operator/private-pool-v2-service-network.mjs`
- `scripts/check-vanta-private-pool-v2-send-discovery-indexer-handoff.mjs`
- `scripts/check-vanta-private-pool-v2-service-network.mjs`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-14-completion-audit.md`

## Guarded Content

- Fresh Send memo discovery packets carry `memoCiphertextBodyHash` and encrypted view-tag material without raw recipient, amount, asset, witness, or plaintext memo fields.
- Send proof request construction binds recipient/change memo ciphertext body hashes into BN254/Poseidon-compatible public input fields.
- The local verifier/indexer handoff requires `proofBoundMemoCiphertextBodyHash` to equal `memoCiphertextBodyHash`.
- The local verifier mirror checks the discovery packet against the accepted proof request, proof receipt id, public-input commitment, Send public-input hash, tree id, output commitment, output root, output leaf index, and memo body-hash field before mirroring packets.
- The indexer reports `send-memo-indexer-body-hash-handoff-not-deployed` and every local discovery surface keeps `productionReady: false`.

## Verification

- `npm run private-pool-v2:send-discovery-indexer-handoff-check`
- `npm run private-pool-v2:service-network-check`
- `npm run send:discovery-migration-policy-check`
- `npm run mainnet:send-production-check`

## Truth Boundary

This is a local verifier-mirrored discovery handoff only. It is not production recipient discovery, not a deployed viewing-key exchange, not a live memo/indexer service guarantee, not external-recipient UX completion, not audit acceptance, not production privacy, and not real-funds readiness.

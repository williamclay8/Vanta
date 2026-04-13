# Vanta Private Pay Subscription Notes

## Subscription NFT idea

Future Private Pay idea to preserve:

- if there is not a better subscription model, Vanta can mint an NFT for the subscriber
- the NFT should carry an expiration date matching the subscription expiry

## Feasibility

Yes, this is feasible, with one important constraint:

- the NFT itself does not magically expire on Solana just because it contains an expiry date

That means the expiration date must be enforced by the Vanta app, merchant backend, operator, or any onchain program that treats the NFT as an access credential.

## Practical interpretation

The NFT should be treated as:

- a subscription receipt
- an entitlement pass
- a merchant-facing membership token

not as a self-enforcing primitive by default.

## Recommended v0 implementation shape

If Vanta uses this idea in Private Pay, the narrowest practical version is:

1. mint a subscription NFT to the payer wallet
2. store `expiresAt` in metadata and in Vanta-controlled subscription state
3. check:
   - token ownership
   - current time against `expiresAt`
   - subscription status
4. deny access or renewal benefits once expired

## Important design cautions

### 1. Transferability

If the NFT is freely transferable, subscription rights become transferable too.

That may be acceptable for some products, but not for most subscription models.

If Vanta wants non-transferable subscriptions, prefer:

- a non-transferable / soulbound-style membership token
- or merchant/operator enforcement that binds the entitlement to the original wallet

### 2. Privacy

A normal NFT membership pass is publicly visible.

That may be acceptable for the first merchant/pay implementation, but it is not a privacy-native end state.

Longer term, Vanta may want:

- a private subscription receipt
- a shielded entitlement note
- or a merchant-verified private membership credential derived from shielded state

### 3. Renewal model

There are at least two reasonable renewal paths:

- update the existing entitlement state and metadata
- mint a new NFT per billing period

For a first implementation, updating a canonical subscription record while keeping one stable NFT is probably cleaner than minting a new NFT every cycle.

## Current recommendation

Keep this idea as a valid Private Pay implementation option.

If Private Pay needs a practical first subscription primitive, the best first version is:

- one subscription NFT
- one explicit `expiresAt`
- one canonical subscription status record
- app/operator/merchant enforcement of expiry

If Vanta later wants a more privacy-native commerce model, this can evolve into a shielded entitlement design instead of staying a plain public NFT forever.

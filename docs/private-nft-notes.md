# Vanta Private NFT Notes

## Future product requirement

Preserve this as a future Vanta capability:

- mint NFTs privately
- send NFTs privately
- buy NFTs privately
- sell NFTs privately

## Feasibility

Yes, this is feasible in principle, but not as a trivial extension of ordinary public NFT flows.

The hard part is not minting an NFT on Solana. The hard part is making:

- ownership
- transfer intent
- sale intent
- purchase settlement
- listing visibility

private enough to be meaningfully different from normal public NFT activity.

## Practical interpretation

For Vanta, “private NFT” should usually mean one of two things:

### 1. Public NFT with private control flow

The NFT still exists as a normal onchain asset, but Vanta makes parts of the lifecycle less publicly legible through:

- shielded custody
- private sale intent
- operator/escrow coordination
- private settlement notes

This is the easier first version.

### 2. Private ownership representation

The canonical ownership or transferability signal is represented inside Vanta shielded state rather than only through ordinary public wallet ownership.

This is closer to a privacy-native end state, but it is a larger protocol design step.

## Narrowest realistic first version

If Vanta wants a practical first NFT privacy wedge later, the easiest implementation path is probably:

1. support one NFT collection or one constrained NFT asset class
2. let users shield custody or sale intent through Vanta
3. support private transfer authorization between known counterparties
4. support private purchase flow where:
   - listing terms are not broadcast broadly
   - settlement happens through Vanta state
   - final public transfer is minimized or delayed where possible

That would not be perfect privacy, but it would be a credible first step.

## Capability notes by workflow

### Private mint

Feasible if Vanta controls how mint authorization and recipient assignment are handled.

Questions to solve later:

- does minting happen to a public wallet first, then get shielded?
- or does minting create a Vanta-side private ownership representation first?

### Private send

Feasible as a private transfer of NFT control or entitlement between participants.

This likely looks more like:

- shielded ownership note transfer

than a plain public wallet-to-wallet NFT transfer.

### Private buy

Feasible, but depends on how Vanta wants to handle:

- listing visibility
- counterparty privacy
- price privacy
- escrow / custody
- final settlement

### Private sell

Feasible if Vanta eventually supports:

- seller-side private listings
- controlled reveal to buyers or operator
- settlement rules tied to shielded payment flow

## Important cautions

### 1. Public NFT metadata is still public

Even if the transfer or sale flow is partially privatized, collection metadata and many mint details may still remain public.

### 2. Public ownership may still leak

If the NFT ultimately sits in an ordinary public wallet account, ownership visibility is still a problem.

### 3. Marketplaces are usually transparency-heavy

Normal NFT marketplace rails are optimized for public listings, public bids, and public settlement. A private NFT flow may need a Vanta-specific marketplace pattern or operator-assisted path.

### 4. This is likely a later-phase product

Private NFT flows are likely better treated as:

- a later Private Pay / commerce extension
- or a dedicated Vanta collectibles / marketplace module

not as an immediate near-term addition to the current narrow private-core lane.

## Current recommendation

Keep private NFT support as an explicit future Vanta capability target.

If Vanta implements it, the best first wedge is probably:

- constrained NFT support
- private transfer between known parties
- private purchase/sale settlement through Vanta notes
- careful framing about what remains public vs private

Longer term, the stronger version is a true shielded NFT ownership model rather than just private coordination around a public NFT.

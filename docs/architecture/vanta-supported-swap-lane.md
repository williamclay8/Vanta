# Vanta Supported Swap Lane

This note freezes the current constrained swap lane that Vanta exposes in the narrow zk v1 operator contract.

## Supported lane

- `supportedSwapLaneVersion = 1`
- `supportedSwapLaneKind = single-input-vusd-to-shielded-sol`
- `supportedSwapLaneStatus = supported`
- `supportedSwapVenue = meteora-dlmm-devnet`
- `supportedSwapOutputModel = shielded-sol-output-note`

## What this means today

The current supported swap path is deliberately narrow:

- one private VUSD input note
- one operator-backed Meteora-aware quote/execution path
- one shielded SOL output note

This is not a claim that arbitrary private swaps are already supported. It is a freeze of the one constrained swap lane the current product/operator contract is willing to describe as supported.

## Why the contract says this explicitly

Vanta now freezes send, unshield, release, and swap support separately in the operator contract so the app, CLI, docs, and regression stack can all describe the same narrow truth surface.

For the swap lane specifically, the operator contract needs to say:

- what lane shape is supported
- what venue assumption is currently frozen
- what output model the lane produces

That keeps the product honest while the broader swap work remains intentionally constrained.

## Practical interpretation

When the operator contract reports the current narrow zk v1 support surface, the swap fields should be read as:

- Vanta currently supports one specific `VUSD -> shielded SOL` swap lane
- that lane is operator-backed and venue-constrained
- the output remains private-state oriented rather than a plain public SOL payout

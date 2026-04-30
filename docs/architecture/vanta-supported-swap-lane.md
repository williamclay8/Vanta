# Vanta Supported Swap Lane

This note freezes the current constrained swap lane that Vanta exposes in the narrow zk v1 operator contract.

## Supported lane

- `supportedSwapLaneVersion = 1`
- `supportedSwapLaneKind = single-input-usdc-to-shielded-sol`
- `supportedSwapLaneStatus = supported`
- `supportedSwapV1Decision = accepted-narrow-v1-path`
- `supportedSwapV1Role = adjacent-supported-not-required-for-finish-line`
- `supportedSwapVenue = meteora-dlmm-devnet`
- `supportedSwapOutputModel = shielded-sol-output-note`
- `supportedSwapResultingRootBasis = client-declared`
- `supportedSwapInputRootPolicy = latest-registered-root-with-linked-registration-proof`
- `supportedSwapOutputRegistrationPolicy = resulting-root-must-register-as-swap-output`

## What this means today

The current supported swap path is deliberately narrow:

- one private USDC input note
- one operator-backed Meteora-aware quote/execution path
- one shielded SOL output note

This is not a claim that arbitrary private swaps are already supported. It is a freeze of the one constrained swap lane the current product/operator contract is willing to describe as supported.

The operator contract now also says two things at once, explicitly:

- this constrained lane is a real supported operator-backed swap path in the repo
- it is not required for the minimum `zk v1` finish line

## Why the contract says this explicitly

Vanta now freezes send, unshield, release, and swap support separately in the operator contract so the app, CLI, docs, and regression stack can all describe the same narrow truth surface.

For the swap lane specifically, the operator contract needs to say:

- what lane shape is supported
- whether that lane is part of the minimum `zk v1` finish line or only adjacent supported infrastructure
- what venue assumption is currently frozen
- what output model the lane produces
- what resulting-root basis is currently accepted
- what input-root policy the operator enforces
- what output-registration rule downstream continuity requires

That keeps the product honest while the broader swap work remains intentionally constrained.

## Practical interpretation

When the operator contract reports the current narrow zk v1 support surface, the swap fields should be read as:

- Vanta currently supports one specific `USDC -> shielded SOL` swap lane
- that lane is adjacent supported infrastructure, not a minimum blocker for calling the narrow `zk v1` finish line done
- that lane is operator-backed and venue-constrained
- the output remains private-state oriented rather than a plain public SOL payout
- the resulting root remains explicitly client-declared until downstream registration proves continuity
- the input root must be the latest registered root and stay linked to its registration proof
- the resulting root must later register as a `swap-output` root before downstream release can stay coherent

# Vanta ZK v1 Supported Unshield Lane

## Purpose

This note freezes the currently supported `zk v1` unshield lane for Vanta.

The repo already has:

- an executable single-note unshield circuit
- local proof generation for that circuit
- operator-backed proof verification
- operator-backed consume state
- operator-backed release state
- replay rejection

What this note adds is the product/runtime freeze for the current narrow exit path.

## Supported v1 lane

The supported `zk v1` unshield path is:

`Hold private note -> Verify proof -> Consume one note -> Record one release -> Reject replay`

This is the current lane backed by:

- `src/zk/vantaPrivateCore.ts`
- `src/zk/vantaPrivateCoreUnshieldProof.ts`
- `zk/noir/vanta_private_core_single_note_unshield`
- `operator/unshield-server.mjs`
- `src/data/context/PrivacyFlowContext.tsx`
- `src/pages/UnshieldPage.tsx`

## Narrow product contract

For the supported `v1` lane, Vanta currently supports:

- one input note
- one nullifier
- one current registered root
- one release destination bound in the proving boundary
- one operator-backed release record
- one replay rejection path

## Current operator truth

The supported unshield lane is currently expressed in operator/runtime terms as:

- proof-backed consume
- latest-registered-root policy
- explicit release recording
- explicit replay rejection from both consume state and release state

The operator summary contract should describe this lane through:

- `supportedUnshieldLaneVersion = 1`
- `supportedUnshieldLaneKind = single-note-proof-backed-consume`
- `supportedUnshieldLaneStatus = supported`

## Canonical verification command

The canonical regression command for the supported lane is:

- `npm run private-core:verify`

That command already covers:

- unshield circuit regression
- local unshield proof generation
- operator consume regression
- operator HTTP smoke
- operator restart persistence
- downstream send-to-unshield roundtrips

## Supported-lane assumptions

The supported unshield lane still keeps these assumptions explicit:

- source-layer X25519 owner authorization remains off-circuit
- the Unshield Noir lane binds a Poseidon proof-owner key derived from the owner secret
- proving-lane truth remains distinct from broader source-layer artifacts
- root validity/currentness still comes from the narrow operator-backed state model
- release recording is operator truth, not yet a final-form product settlement rail

## Not part of the supported lane

The following are still outside the supported unshield lane:

- multi-note consume
- generalized release assets
- decentralized relayer semantics
- final-form product settlement semantics
- full source-layer/X25519 owner authorization inside Noir

## Practical interpretation

The repo should now describe unshield as:

- real in narrow `v1` form
- proof-backed
- operator-backed
- replay-protected
- intentionally constrained

It should not describe unshield as:

- purely modeled
- already final-form

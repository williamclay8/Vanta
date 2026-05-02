# Vanta ZK v1 Supported Release Lane

## Purpose

This note freezes the currently supported `zk v1` release lane for Vanta.

The repo already has:

- operator-backed proof verification
- operator-backed consume state
- operator-backed release state
- explicit release authorization metadata
- replay rejection from both consume state and release state

What this note adds is the product/runtime freeze for the current narrow release contract.

## Supported v1 lane

The supported `zk v1` release path is:

`Verify proof -> Consume one note -> Record one release -> Persist release state -> Reject replay`

This is the current lane backed by:

- `src/zk/vantaPrivateCore.ts`
- `src/zk/vantaPrivateCoreUnshieldProof.ts`
- `operator/unshield-server.mjs`
- `src/zk/vantaPrivateCoreOperatorClient.ts`
- `src/data/context/PrivacyFlowContext.tsx`
- `src/pages/UnshieldPage.tsx`

## Narrow product contract

For the supported `v1` lane, Vanta currently supports:

- one proof-backed consume action
- one latest-registered-root policy
- one operator-recorded release outcome
- one operator-local atomic consume-and-release record
- one persisted JSON-backed release store
- one replay rejection path after release

## Current operator truth

The supported release lane is currently expressed in operator/runtime terms as:

- `supportedReleaseLaneVersion = 1`
- `supportedReleaseLaneKind = proof-backed-consume-latest-registered-root`
- `supportedReleaseLaneStatus = supported`
- `supportedReleaseV1Decision = accepted-narrow-v1-path`
- `supportedZkV1RequiredLanes = send|unshield|release`
- `supportedReleaseAuthorizationBasis = proof-backed-consume`
- `supportedReleaseRootPolicy = latest-registered-root`
- `supportedReleaseExecutionModel = operator-recorded-mainnet-release`
- `supportedReleaseAtomicityModel = operator-local-atomic-consume-and-release-record`
- `supportedReleasePersistenceModel = json-store-v1`

## Canonical verification command

The canonical regression command for the supported lane is:

- `npm run private-core:verify`

That command already covers:

- operator consume regression
- operator contract smoke
- operator HTTP smoke
- operator restart persistence
- send-to-unshield roundtrips
- replay rejection after release

## Supported-lane assumptions

The supported release lane still keeps these assumptions explicit:

- release truth is operator-backed state, not a final settlement rail
- root validity/currentness comes from the narrow operator-backed state model
- owner authorization remains off-circuit
- proving-lane truth remains distinct from broader source-layer artifacts

## Not part of the supported lane

The following are still outside the supported release lane:

- final-form settlement semantics
- generalized release assets
- decentralized relayer semantics
- in-circuit owner authorization
- non-operator-backed release execution

## Practical interpretation

The repo should now describe release as:

- real in narrow `v1` form
- proof-backed
- operator-recorded
- replay-protected
- intentionally constrained

It should not describe release as:

- purely modeled
- fully production-final

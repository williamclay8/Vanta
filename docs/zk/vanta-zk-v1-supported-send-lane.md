# Vanta ZK v1 Supported Send Lane

## Purpose

This note freezes the currently supported `zk v1` private-send lane for Vanta.

The repo already has multiple narrow send-lane building blocks:

- source-layer send boundary
- zk-facing send proof boundary
- executable fixed-depth send circuit
- local send proof generation
- operator-backed send proof execution
- downstream recipient-output and change-output continuity

What this note adds is the product-level freeze:

- which send path is the supported `v1` lane
- what that lane promises
- what remains intentionally outside the supported lane

## Supported v1 lane

The supported `zk v1` send path is:

`Public Wallet -> Shield -> Hold -> Private Send -> Register Resulting Root -> Recover Recipient Or Change Note -> Unshield`

This is the lane currently backed by:

- `src/zk/vantaPrivateCore.ts`
- `src/zk/vantaPrivateCoreSendProof.ts`
- `zk/noir/vanta_private_core_single_note_send`
- `operator/unshield-server.mjs`
- `src/data/context/PrivacyFlowContext.tsx`
- `src/pages/SendPage.tsx`

## Narrow product contract

For the supported `v1` lane, Vanta currently supports:

- one asset
- one environment
- one input note
- one recipient output note
- optional one change output note
- one current input root
- one explicit resulting root
- one operator-backed proof verification path
- one operator-backed root-registration path
- one operator-backed downstream unshield path

## What the supported lane now proves in practice

The current repo and regression stack now prove that this lane can:

- verify one private-send proof over the frozen witness package
- apply one proof-backed send transition
- bind the send transition to the latest registered input root
- require a canonical resulting root
- require resulting-root registration to stay linked to the send output it claims to represent
- let the recipient recover and spend the sent note
- let the sender recover and spend the residual change note
- reject replay on downstream unshield
- survive operator restart across:
  - proofs
  - root registrations
  - sends
  - consumes
  - releases

## Canonical verification command

The canonical regression command for the supported lane is:

- `npm run private-core:verify`

That command now covers:

- unshield circuit regression
- send circuit regression
- local unshield proof generation
- local send proof generation
- operator-backed consume regression
- operator-backed send regression
- recipient-output downstream roundtrip and restart persistence
- change-output downstream roundtrip and restart persistence
- chained send continuity

## Supported-lane assumptions

The supported `v1` lane currently keeps these assumptions explicit:

- owner authorization remains off-circuit
- proving-lane truth remains distinct from source-layer artifacts
- root validity/currentness is enforced by the narrow operator-backed state model
- resulting-root provenance is still explicit operator state, not an in-circuit transition proof

These assumptions are allowed for the narrow `v1` lane only because they are stated openly in code, UI, and docs.

## Not part of the supported lane

The following are still outside the currently supported `v1` lane:

- multi-input send
- arbitrary fan-out
- private swap
- private pay
- generalized marketplace semantics
- recursive proofs
- in-circuit owner authorization
- decentralized relayer architecture

## Practical interpretation

The repo should now describe private send as:

- real in narrow `v1` form
- operator-backed
- proof-backed
- intentionally constrained

It should not describe private send as:

- still absent
- purely modeled
- already final-form

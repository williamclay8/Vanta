# Vanta Private Core Send Boundary v0.1

## Purpose

This note freezes the first narrow private-send boundary for Vanta Private Core.

It is the next build step after the first real unshield proof lane.

The goal is not to solve final-form send.
The goal is to make the first `v1` send target concrete enough to implement against.

## Scope

This boundary is intentionally narrow:

- one input note
- one recipient output note
- optional one change output note
- one asset
- one environment
- one source-layer envelope contract
- one later proving boundary to match it

It does **not** yet attempt:

- batching
- joins
- splits beyond recipient plus optional change
- swaps
- recursive proof composition
- final in-circuit owner authorization

## Product role

This boundary exists because `docs/privacy-model.md` defines `v1` around:

`Public Wallet -> Shield -> Shielded State -> Send`

The repo already has a real unshield lane.
What `v1` still lacks is a production-private Send lane; the repo now has the first narrow, operator-backed private-send lane from shielded state.

## Narrow send statement

The first send target should establish that:

1. one canonical input `NoteV0` exists in committed shielded state
2. its commitment and nullifier recompute correctly
3. the input note is authorized for spend under the current `v1` owner-auth assumption
4. one recipient output note is created with the declared asset and send amount
5. optional change output note is created with the remainder
6. value is conserved across the transition
7. the transition is bound to one specific send action

## Source-layer boundary artifacts

The source-layer contract now lives in `src/zk/vantaPrivateCore.ts` as:

- `SendRecipientOutputV0`
- `SendChangeOutputV0`
- `SendTransitionV0`
- `SendPublicInputsV0`
- `SendPrivateInputsV0`
- `SendProofEnvelopeV0`

Current helper entry points:

- `buildVantaPrivateCoreSendTransition(...)`
- `buildVantaPrivateCoreSendProofEnvelope(...)`
- `verifyVantaPrivateCoreSendProofEnvelope(...)`

Current summary helpers:

- `summarizeVantaPrivateCoreSendProofEnvelope(...)`
- `summarizeVantaPrivateCoreSendProofEnvelopeVerification(...)`
- `summarizeVantaPrivateCoreSendProofEnvelopeConsistency(...)`

## Public-input shape

The current narrow source-layer send public inputs are:

- `inputCommitment`
- `inputRoot`
- `inputNullifier`
- `recipientCommitment`
- `changeCommitment`
- `assetId`
- `sendAmount`
- `changeAmount`
- `inputLeafIndex`
- `noteVersion`

This is intentionally close to the unshield source contract while adding the first output-commitment binding needed for send.

## Current assumptions

For `v0.1` / narrow `v1` planning:

- owner authorization may remain off-circuit, as already frozen for unshield
- the send boundary is source-layer today, not yet a Noir circuit
- the source/proving split remains explicit rather than hidden

## Next implementation target

The next real zk step after this freeze should be:

1. define `vantaPrivateCoreSendProof.ts`
2. freeze the first fixed send proving lane
3. choose the first one-input / recipient-plus-change witness package
4. implement the matching Noir circuit path

## Practical interpretation

This note does **not** mean private send is final-form.

It means the repo now has:

- a real unshield lane
- a real narrow send lane
- a frozen first send boundary target

That is the right foundation for actually freezing the supported `v1` send lane instead of letting “send” remain abstract.

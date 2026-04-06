# Vanta Privacy Model (v1)

## Purpose

This document defines the privacy model for the first real version of Vanta.

The goal is not to describe the final form of the full Vanta network. The goal is to define the minimum privacy model required to make the first complete Vanta loop real:

**Public Wallet → Shield → Shielded State → Send**

This document should keep product, protocol, and frontend decisions aligned.

---

## Scope of v1

Vanta v1 is intentionally narrow.

It aims to support:
- one environment
- one supported asset
- one shield flow
- one shielded balance model
- one private send flow

It does **not** attempt to solve:
- multi-asset generality
- private swap
- merchant payments
- production-scale relayer networks
- full anonymity guarantees across every edge case
- final-form protocol architecture

The purpose of v1 is to make the first loop real and coherent.

---

## Product truth

Vanta is a zk-powered privacy layer for Solana that lets users shield assets from public wallet flows and use them through private workflows beginning with send.

The first product truth is:

1. users begin with assets in transparent wallet state
2. users shield supported assets into the Vanta privacy layer
3. those assets are represented in shielded state
4. shielded state enables private send
5. users may later unshield back into ordinary public wallet flows

This is the conceptual spine of the system.

---

## Important clarification

Shielding does **not** mean ordinary public wallet balances become invisible.

In v1, shielding means:
- supported assets move out of ordinary transparent wallet flows
- the protocol creates a new privacy-preserving representation of that value
- the app treats that value as shielded state
- future actions operate from shielded state, not from the original public wallet balance

This distinction must remain true across product, protocol, and docs.

---

## v1 privacy goals

The goals of v1 are practical and product-oriented.

### Primary goals
- create a real transition from transparent wallet state into shielded state
- enable a real send flow from shielded state
- reduce direct public traceability compared with ordinary wallet-to-wallet flows
- make shielded state understandable to users

### Secondary goals
- establish a reusable architecture for future swap and pay modules
- create a coherent state model for private value handling
- provide a credible privacy foundation for the Vanta suite

### Non-goals
- perfect privacy under all adversarial conditions
- production-grade protocol completeness
- comprehensive obfuscation of all metadata
- solving every future commerce/privacy use case in v1

---

## v1 asset model

Vanta v1 should support **one asset** in one environment.

This asset should be treated as:
- shieldable from public wallet state
- representable in shielded state
- spendable through the first send flow

Whether the underlying protocol uses:
- notes
- commitments
- shielded account abstractions
- UTXO-like objects

is an implementation detail, but the product model must remain stable:
- public balance
- shielded balance
- private action from shielded balance

---

## v1 user-visible states

The user should be able to reason about the system using the following states:

### 1. Public wallet state
The asset exists in ordinary transparent Solana wallet flow.

### 2. Shielding
The user is moving the asset into the Vanta privacy layer.

### 3. Shielded state
The asset is now represented inside the Vanta privacy system and is available for private workflows.

### 4. Sending
The user is acting from shielded state through the first private workflow.

### 5. Optional exit / unshield
The user may later return value to an ordinary public wallet flow.

These states are both product states and protocol states.

---

## What v1 attempts to protect

Vanta v1 is designed to improve privacy around:
- how users hold supported value after shielding
- how value is moved through the first private workflow
- direct public linkage between ordinary wallet balance and later private action

At a high level, the system is meant to reduce public legibility relative to default transparent flows.

---

## What v1 does not claim to protect completely

Vanta v1 should not claim to provide perfect or absolute privacy.

It does **not** automatically solve:
- all metadata leakage
- all timing analysis
- all network-layer observation
- all user operational security failures
- all possible linkage vectors outside the intended protocol boundary

Product language must remain careful here.

---

## v1 trust model questions

The following questions must be answered clearly by implementation, even if the answers evolve later:

### 1. Where does shielded state live?
Examples:
- onchain commitments
- protocol-managed notes
- hybrid state model

### 2. How is spend authorization proven?
Examples:
- zk proof generated client-side
- delegated prover
- hybrid proving flow

### 3. How is double spend prevented?
Examples:
- nullifiers
- spent-note tracking
- protocol state transitions

### 4. What assumptions exist?
Examples:
- trusted setup or no trusted setup
- operator or relayer trust assumptions
- indexer availability assumptions
- client honesty assumptions

These do not all need final answers immediately, but v1 implementation cannot proceed blindly.

---

## v1 protocol boundary

The privacy boundary for v1 should be described in plain English as:

- value begins in transparent wallet state
- value enters the Vanta privacy layer through shielding
- value is represented as shielded state
- value is used through private workflows from inside that system

That is the boundary that matters.

The app should not describe privacy as something that happens “inside the normal wallet.” It should describe privacy as beginning once value enters the Vanta layer.

---

## v1 frontend truth requirements

The frontend must always reflect the protocol honestly.

It must:
- distinguish public wallet balance from shielded balance
- make shielding feel like a real state transition
- make send feel like a workflow from shielded state
- avoid implying fake guarantees
- clearly indicate when behavior is modeled vs live

The frontend is part of the privacy model because it teaches the user what the system is.

---

## v1 send model

Private Send is the first workflow unlocked by shielded state.

At minimum, v1 Send should mean:
- a user has a valid shielded balance
- a user can initiate a send from that shielded balance
- the protocol can authorize and execute that send
- the app can reflect the resulting state transition clearly

This is sufficient for the first complete loop.

---

## v1 success condition

The privacy model is good enough for v1 if the following is true:

A user can connect a real wallet, shield one supported asset into real protocol-recognized shielded state, see that state in the app, and send from it through a real protocol flow.

If this is possible, Vanta has crossed from concept/prototype into the first real product milestone.

---

## Future expansion

Once v1 is real, the same privacy foundation can expand into:
- private swap
- private pay
- richer state/history surfaces
- broader developer integration
- ecosystem and commerce workflows

But none of those should distort the clarity of v1.

---

## Internal product rule

If anyone asks what Vanta privacy means in v1, the shortest correct answer is:

> Vanta privacy begins when supported assets leave transparent wallet flows and enter the Vanta privacy layer as shielded state.

# Vanta MVP-Real

## Purpose

This document defines the minimum real milestone that makes Vanta cross from polished prototype into actual product.

The goal is not to make the whole Vanta suite real at once.

The goal is to make the first complete loop real:

**Public Wallet → Shield → Shielded State → Send**

---

## Definition of MVP-Real

Vanta becomes real when a user can:

1. connect a real wallet
2. shield one supported asset into real protocol state
3. see that shielded state reflected in the app
4. send from that shielded state through a real protocol flow

That is the threshold.

Everything else is downstream.

---

## Scope

### Included in MVP-Real
- one environment
- one supported asset
- real wallet integration
- real shield flow
- real shielded balance/state display
- real send from shielded state
- clear frontend status and success/failure handling

### Not required yet
- private swap
- private pay
- multiple assets
- token utility
- production-scale relayer systems
- broad analytics/history
- merchant tooling
- final-form protocol architecture
- polished governance or ecosystem systems

This is intentionally narrow.

---

## Why this is the right milestone

This milestone proves all the important things:
- the product thesis is real
- shielding is a real entrypoint, not just marketing
- the app is connected to actual protocol behavior
- send is grounded in real shielded state
- future modules like swap and pay now have a believable foundation

This is the smallest milestone that makes Vanta genuinely credible.

---

## Required components

## 1. Real wallet connection

### Goal
The app can connect to a real Solana wallet and read actual wallet state.

### Minimum requirements
- connect/disconnect wallet
- display wallet state in app
- read balance for the first supported asset
- use real wallet context on Shield

### Why it matters
Without real wallet state, the rest of the loop is still fiction.

---

## 2. Real Shield flow

### Goal
A user can move one supported asset from transparent wallet state into real Vanta protocol state.

### Minimum requirements
- select supported asset
- choose amount
- initiate real shield action
- handle in-progress, success, and failure states
- produce real protocol-recognized shielded state

### Why it matters
Shield is the product entrypoint. This is the first real protocol milestone.

---

## 3. Real shielded state display

### Goal
The app can show actual shielded value after shielding completes.

### Minimum requirements
- fetch or derive shielded balance/state
- display shielded value in app
- distinguish shielded state from public wallet balance
- maintain continuity into Send

### Why it matters
If the app cannot reflect shielded state honestly, the user does not know whether Vanta is real.

---

## 4. Real Send flow

### Goal
A user can send from actual shielded state.

### Minimum requirements
- use shielded balance as source state
- specify recipient and amount
- initiate real send action
- reflect progress and result
- update state after send

### Why it matters
This completes the first real Vanta loop.

---

## Recommended environment

Vanta MVP-Real should begin in:
- mainnet
- or another controlled test environment

It should **not** begin on mainnet.

The first goal is correctness, understanding, and repeatability — not production risk.

---

## Recommended asset strategy

Vanta MVP-Real should support exactly **one asset** first.

Preferred approach:
- controlled test asset
- or one simple mainnet-supported asset

Do not expand to multiple assets until the first loop is stable.

---

## Frontend requirements

The frontend must:
- distinguish Public Wallet from Shielded State
- make Shield feel like a real state transition
- make Send feel like the first workflow unlocked by Shield
- surface status clearly
- remain honest about what is real vs modeled

The frontend should support the mental model:

**Public Wallet → Shield → Shielded State → Send**

This is not optional. It is the user-facing definition of the product.

---

## Protocol/backend requirements

The protocol/backend must provide at minimum:
- a real shield/deposit primitive
- a real representation of shielded state
- a real send primitive from shielded state
- protection against invalid or repeated spend
- clear failure handling

The exact architecture can evolve, but these capabilities must exist for MVP-Real.

---

## What can stay mocked

The following can remain mocked or roadmap-level while MVP-Real is being built:
- Swap
- Pay
- Launch
- token coordination/utility
- advanced analytics
- merchant tooling
- historical activity surfaces beyond what is needed for the first loop
- production-scale protocol optimizations

These are not required to make Vanta real.

---

## First real demo

The first real demo should prove:

1. wallet connects
2. supported asset is detected
3. user shields asset
4. shielded state appears
5. user continues to Send
6. user sends from shielded state
7. resulting state updates correctly

If that flow works, Vanta is no longer just a concept or a front-end prototype.

---

## Success criteria

Vanta MVP-Real is achieved when all of the following are true:

- a real wallet can connect
- one supported asset can be shielded
- shielding produces real shielded state
- shielded state is visible in the app
- a send can be initiated from shielded state
- the app reflects success/failure honestly
- the entire loop is demoable end to end

---

## Non-goal reminders

Do not expand scope before MVP-Real works.

Specifically do not prioritize:
- Swap
- Pay
- Launch
- multiple assets
- token design
- broader ecosystem mechanics
- speculative commerce modules

These only matter after the first loop is real.

---

## Immediate next build order

### Phase A
Define the privacy model for v1.

### Phase B
Integrate real wallet connection.

### Phase C
Implement the real Shield flow for one asset.

### Phase D
Display real shielded state in the app.

### Phase E
Implement real Send from shielded state.

### Phase F
Stabilize the loop for repeatable demos.

This is the path.

---

## Internal rule

Until a real user can shield one real asset and send from shielded state, Vanta is still pre-product.

Once that loop is real, everything changes.

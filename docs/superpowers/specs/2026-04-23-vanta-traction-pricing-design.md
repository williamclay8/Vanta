# Vanta Traction Pricing Design

**Date:** 2026-04-23

## Goal

Define a simple launch-stage pricing model for the full Vanta suite that maximizes adoption and keeps the product easy to explain while preserving room for later premium expansion.

The primary product goal is not short-term monetization optimization.

It is:

- reduce pricing friction
- align revenue with successful product usage
- make Vanta feel fair to first users and merchants
- keep the pricing contract consistent across Pay, private flows, and future execution surfaces

## Product thesis

Vanta should not compete primarily as the cheapest crypto app.

The stronger wedge is:

- private stablecoin settlement
- policy-legible control surfaces
- merchant-grade trust and operational clarity

Pricing should reinforce that wedge by being simple and affordable, not by turning Vanta into a commodity processor race.

## Recommended launch pricing

### Headline rule

Vanta should launch with one public pricing rule:

- `0 monthly fee`
- `0.25%` fee only when a supported product action completes successfully

Canonical public phrasing:

`Vanta charges 0.25% only when a supported action completes successfully. No monthly fee. Network, off-ramp, and third-party execution costs are shown separately when they apply.`

### Why this rule

This pricing shape is the best fit for Vanta's current stage because it:

- lowers activation friction for low-volume users and design partners
- keeps the offer easy to repeat in product copy and outreach
- aligns Vanta revenue with actual usage instead of speculative account creation
- avoids premature segmentation between merchants, traders, and other early users
- makes the app feel fair while Vanta is still proving its product wedge

## Non-goals

- competing on absolute lowest all-in cost in the market
- charging monthly SaaS fees before the dashboard and control surfaces clearly justify them
- monetizing preview-only or local-only product behavior
- hiding external costs inside one blended fee
- framing the launch model around token extraction instead of product usage

## Core pricing contract

### What Vanta charges for

Vanta should charge `0.25%` only when it provides real execution, settlement, routing, or private-state transition value and the action completes successfully.

### What Vanta does not charge for

Vanta should not charge for:

- previews
- local-only planning
- failed transactions
- read-only dashboards
- account setup
- passive browsing of balances, receipts, or status surfaces

### Pass-through costs

The following costs should remain itemized and separate from the `0.25%` Vanta fee:

- network / gas fees
- off-ramp or fiat settlement fees
- external venue or routing fees
- third-party refund or reversal costs
- partner or infrastructure fees that Vanta does not control

The product should not market these costs as part of the Vanta fee.

## Product-by-product fee map

### Pay

Charge `0.25%` of successful settled payment volume.

Why:

- Pay is the clearest current merchant-facing value surface
- successful settlement is easy to explain and audit
- the fee aligns with Vanta's merchant-first strategy

Do not charge on:

- failed checkout attempts
- abandoned payment intents
- preview states

### Shield

Charge `0.25%` only when Vanta is providing real service-backed private-state entry or settlement value.

Do not charge when the flow is only:

- local preview
- passive wallet interaction
- unsupported or failed execution

### Send

Charge `0.25%` only on successful service-backed private sends or policy-mediated execution paths where Vanta is doing meaningful work beyond local UI.

### Swap

Charge `0.25%` on completed swaps routed through Vanta.

Venue, routing, and network costs should stay separate when they apply.

### Unshield

Charge `0.25%` on successful exits only when Vanta's operator or service layer is part of the completed execution path.

### Strategy

Do not charge while Strategy remains planning-only or preview-only.

Charge `0.25%` only once live execution exists and an actual strategy step executes successfully.

### Dashboard and control surfaces

Do not charge monthly or access fees during the traction phase for:

- merchant dashboard usage
- reconciliation views
- trust/readiness views
- controls or reports that do not themselves trigger a metered action

## Operating rules

### Success-based billing

The fee should attach to completed action states, not intent creation.

The pricing system should prefer:

- `settled`
- `executed`
- `completed`

over softer states such as:

- `queued`
- `submitted`
- `requested`
- `previewed`

### Product truth

Pricing copy must stay consistent with actual runtime truth.

If an action is preview-only, local-only, or not yet live, the product must not imply that the `0.25%` fee is available for that surface yet.

### Simplicity over optimization

The launch model should not introduce:

- volume tiers
- monthly plans
- enterprise contracts
- token-gated price tables

unless real usage proves that complexity is needed.

Internally, Vanta may keep room for those later, but the launch pricing contract should remain simple.

## Economics snapshot

At `0.25%`, Vanta's direct fee revenue would be:

- `$10,000` monthly processed volume -> `$25`
- `$100,000` monthly processed volume -> `$250`
- `$1,000,000` monthly processed volume -> `$2,500`

This is intentionally adoption-friendly rather than margin-maximizing.

It is acceptable at launch because the goal is traction, not full monetization of advanced operations on day one.

## Expansion path

### Near-term rule

Treat `0.25%` and `no monthly fee` as the launch pricing contract.

### Later optional additions

If Vanta gains sustained usage, the product may later add:

- premium merchant controls
- enterprise support contracts
- partner/API packages
- negotiated large-volume deals

These additions should not break the starter rule unless the product has clearly earned more complex packaging.

## $VANTA utility and fee policy

### Recommended token stance

Vanta should not lead with:

- `all fees buy back the token`
- implied revenue share
- token-first monetization framing

The stronger and more defensible roadmap is:

- product utility first
- buyback policy second

### Recommended utility direction

`$VANTA` can later become useful through:

- fee discounts
- premium control features
- partner/API access
- priority settlement or execution features
- governance over network parameters

### Recommended buyback policy

If Vanta adds buybacks later, the buyback base should be:

- a defined share of `Vanta-collected net transaction fees`

The buyback base should exclude:

- network / gas fees
- off-ramp fees
- external venue fees
- other pass-through costs

The product should preserve room for:

- supply buybacks
- marketing
- security spending
- support
- growth
- operator infrastructure
- compliance and operational needs

This keeps the token roadmap aligned with sustainability rather than performative price support.

Public allocation phrasing should stay careful:

`Net Vanta-collected fees are reserved for ecosystem growth, including supply buybacks, marketing, operator infrastructure, security, and product development. Pass-through costs are excluded from that base.`

## UX copy contract

Preferred pricing language:

- `0 monthly fee`
- `0.25% on successful completed actions`
- `No hidden platform fee`
- `Pay only when you use Vanta successfully`
- `Network and third-party costs shown separately when they apply`

Avoid as primary copy:

- `ultra-cheap`
- `lowest fees in crypto`
- `all fees go to the token`
- `free unless gas`
- `revenue-share token`

## Risks

### Unit economics risk

At low volume, `0.25%` may not support high-touch operations, support, or enterprise workflows.

That is acceptable in the traction phase, but it should be monitored honestly.

### Scope drift risk

If Vanta starts charging `0.25%` on weak-value or preview-only actions, the simplicity and fairness of the pricing contract will erode.

### Messaging risk

If Vanta leads with affordability alone, the product may weaken its stronger premium-trust positioning.

## Recommendation

Vanta should launch with:

- one pricing rule
- no monthly fee
- `0.25%` on successful supported actions
- separate pass-through external costs
- restrained `$VANTA` roadmap language focused on utility first

This is the best pricing shape for a traction-stage Vanta that needs adoption, clarity, and consistency more than early monetization complexity.

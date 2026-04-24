# Strategy User Flow Design

**Date:** 2026-04-23

## Goal

Improve the existing `/app/strategy` experience so it is genuinely useful to the intended end user without changing Vanta's broader product positioning.

The product goal is to keep the current simple, action-first Strategy setup while making the page truthful about what is and is not live, clearer about prerequisites and next steps, and safer when users provide invalid input.

## Positioning constraints

- Strategy remains a secondary Vanta surface, not the primary merchant wedge.
- Pay remains the main merchant-first control-plane story for Vanta.
- Strategy should stay trader-facing and action-first rather than protocol-heavy.
- Strategy must use bounded privacy language such as `reduced on-chain observability` rather than magical claims.
- The page must not imply live autonomous execution when the runtime is still preview-only or local-only.

## Non-goals

- Repositioning Strategy as Vanta's primary product story
- Building live autonomous strategy execution
- Turning the page into a dense operator dashboard
- Exposing protocol jargon as primary user-facing copy
- Claiming production readiness, audit status, or mainnet live-trading readiness

## Current repo truth

### Product truth

- Strategy is an in-app execution-planning surface for `Stealth DCA` and `Private TWAP`.
- The intended user is a trader or private-execution operator, not the primary merchant buyer.
- Durable project memory already chose a simplified intent-first flow with four default inputs and advanced controls behind disclosure.

### Runtime truth

- The Strategy planner is deterministic and typed.
- The execution adapter produces a preview-oriented execution envelope.
- The local runtime supports create/list/start/pause/cancel semantics in memory.
- The current experience is not a live execution service.

### UX truth

- In beta mode, the primary action is disabled.
- The current page does not explain a useful next step when live execution is unavailable.
- The current page overstates progress with labels like `Create strategy` and `Strategy queued`.
- Invalid amount, slippage, and custom duration values are silently normalized instead of clearly surfaced to the user.

## Product design

### Primary design direction

Keep the current simple front-half of the Strategy flow:

1. strategy mode
2. buy or sell intent
3. asset
4. amount
5. duration

Keep advanced execution controls hidden behind `Advanced settings`.

Change the rest of the experience so the user sees a truthful sequence:

1. define intent
2. understand prerequisites
3. inspect preview
4. understand whether the page is preview-only or execution-capable
5. take the next truthful action

The page should feel like a usable planning and decision surface, not a mock control panel that stops at the CTA.

### Recommended page order

The best end-user flow for the existing Strategy page is:

1. header with bounded value proposition
2. simple strategy form
3. prerequisite guidance
4. execution preview
5. optional advanced settings
6. truthful primary CTA
7. resulting state / next-step panel

This preserves the simplification work already done while fixing the current dead-end and overclaim problems.

### Header framing

The header should explain what the page actually helps with:

- private accumulation planning
- execution broken into smaller orders
- reduced on-chain observability
- truthful boundaries around preview-only versus live execution

The header should not imply that orders are already running, guaranteed, or production-backed.

### Prerequisite guidance

The page should show a compact prerequisite block before or beside the CTA.

This block should answer:

- where funds need to come from
- where resulting assets will land
- whether private balance is required before execution
- whether the current environment is preview-only

The page should not make the user infer these requirements from internal planner phrases.

Example direction:

- `Fund from: Private balance`
- `Before the first order, move funds into your private balance.`
- `Destination: Public wallet`
- `This environment is currently preview-only.`

### Preview framing

The preview panel should remain central, but it should be reframed as a planning surface rather than a fake-live execution console.

It should communicate:

- pair
- total amount
- duration
- estimated child order count
- average child order size
- funding prerequisite
- route / landing preference
- execution availability state

Where the system only knows a simulated or local answer, it should say so directly.

### CTA behavior

The CTA should reflect actual capability.

If the environment is preview-only:

- primary CTA should be something like `Review strategy plan` or `Save local strategy plan`
- supporting copy should explain that live execution is unavailable in the current environment

If execution becomes truly available later:

- CTA may become `Create strategy`
- supporting copy should explain what becomes persisted or scheduled

Do not use `Create strategy` while the flow is still only generating a local preview or in-memory record.

### Resulting-state panel

After the user submits, the resulting panel should explain what happened in plain language.

For preview-only mode:

- `Strategy plan ready`
- `This plan was created locally for review. Live execution is still off.`

For a future real runtime:

- `Strategy scheduled`
- `Vanta saved the strategy and will wait for eligible execution conditions.`

The panel should not say `queued` unless something is truly queued in a durable or service-backed execution system.

## State contract

### User-visible Strategy capability states

| State | Meaning | UI behavior |
| --- | --- | --- |
| `preview_only` | Strategy planning is available, but live execution is not | Keep planning and preview visible. Use preview-local CTA and explicit explanatory copy. |
| `eligible_to_create` | Strategy runtime can persist or schedule a strategy | Allow creation-oriented CTA and describe what persistence means. |
| `requires_private_funding` | The selected setup requires private balance before execution | Show prerequisite guidance before CTA and in preview. |
| `invalid_input` | User input cannot be interpreted truthfully | Block submit and show field-level guidance. |
| `plan_ready` | A valid plan has been generated for review | Show clear planning summary and next step. |

The first spec target is `preview_only`, because that is the honest current repo truth.

### Input-validation rules

The user should never be surprised by silent fallback behavior.

Required rules:

- empty or invalid amount must show an inline error
- empty or invalid slippage must show an inline error
- invalid custom duration must show an inline error with accepted examples
- submit should stay disabled while required fields are invalid
- the preview should never silently convert invalid user intent into a different plan

### Funding and destination truth

The page must describe funding and destination in user language.

Examples:

- `Funds come from your private balance.`
- `Completed orders land in your treasury vault.`
- `Move funds into private balance before this strategy can execute.`

Avoid machine-ish phrasing like:

- `move to private before execution`
- `destination: private`

especially when the selected destination is actually `Public wallet` or `Treasury vault`.

## UX copy contract

Preferred primary labels:

- `Strategy`
- `Stealth DCA`
- `Private TWAP`
- `You want to`
- `Asset`
- `Amount`
- `Duration`
- `Advanced settings`
- `Execution preview`
- `Review strategy plan`
- `Strategy plan ready`
- `Live execution is unavailable in this environment.`
- `Move funds into your private balance before execution.`

Preferred supporting language:

- `Break a larger trade into smaller steps with reduced on-chain observability.`
- `Preview routing, funding, and landing behavior before any live execution is available.`
- `This plan is local to the current environment.`

Avoid as primary copy:

- `Strategy queued`
- `Create strategy` when only local preview exists
- `ready` without context
- `destination: private`
- `completely invisible whale buying`
- `ZK`
- `UTXO`
- other protocol-heavy explanations as the main user-facing framing

## Technical design

### Recommended UI boundary

The page should expose one product-facing capability summary derived from the current environment and selected inputs.

Suggested shape:

```ts
type StrategyCapabilityState = {
  mode: "preview_only" | "eligible_to_create";
  requiresPrivateFunding: boolean;
  destinationLabel: "Private balance" | "Public wallet" | "Treasury vault";
  fundingLabel: "Private balance" | "Public balance" | "External wallet";
  blockingIssues: string[];
};
```

This type should drive:

- CTA label
- CTA disabled state
- prerequisite copy
- resulting-state copy

### Recommended result boundary

The page should stop using a single ambiguous success state.

Suggested direction:

```ts
type StrategySubmissionResult =
  | {
      kind: "local_plan_ready";
      summary: string;
    }
  | {
      kind: "scheduled_strategy";
      strategyId: string;
      summary: string;
    };
```

This keeps the UX honest across preview-only and future execution-capable modes.

## Verification

Minimum verification for this spec when implemented:

- `npm run build`
- `npm run strategy-tab:copy-check`
- `npm run protocol:browser-check`

Recommended verification additions:

- strengthen `scripts/check-vanta-strategy-tab-copy.mjs` so it protects truthful CTA and result-state wording
- strengthen `scripts/check-vanta-protocol-browser.mjs` so it checks real Strategy flow outcomes instead of loose string presence
- add a narrow Strategy-specific browser check if the existing protocol browser check remains too broad

## Open implementation notes

- The existing simplification work is correct and should be preserved.
- The main changes should happen in the truthful-state layer around the form, preview, CTA, and result panel.
- If future live execution lands, the copy and state machine should expand from this spec instead of replacing it.

## Summary

The right next design move is not to make Strategy bigger. It is to make the current Strategy page honest, useful, and legible.

Keep the simple intent-first flow. Add prerequisite guidance, explicit preview-only truth, better validation, and a result state that tells the user what actually happened.

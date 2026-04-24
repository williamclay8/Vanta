# Strategy Layout Alignment Design

**Date:** 2026-04-24

## Goal

Make `/app/strategy` visually match the existing in-app tab pattern used by the other primary product tabs without changing Strategy's current product truth, validation behavior, or preview-first execution model.

## Problem

Today the Strategy route uses a bespoke outer shell and styling language that makes it feel like a separate product surface rather than one member of the same application tab set.

This mismatch comes from:

- custom `strategy-page` / `strategy-shell` framing
- custom header proportions and card treatment
- no participation in the shared app-shell compression and spacing rules that already shape `Send`, `Shield`, and adjacent flows

The result is that the Strategy tab looks visually inconsistent even though it lives inside the same app header and tab rail.

## Product constraints

- Keep current Strategy copy and product positioning intact.
- Keep the current preview-only truth intact.
- Do not imply live execution, durable scheduling, or production readiness.
- Do not rewrite Strategy into a different workflow.
- Do not broaden this change into a general tab-system redesign.

## Non-goals

- Rebuilding Strategy around shared component abstractions
- Changing Strategy planner or runtime logic
- Rewriting field order, validation rules, or CTA semantics
- Bringing all other tabs forward to the Strategy visual style
- Introducing new product copy beyond what layout alignment requires

## Current repo truth

- The shared app chrome is rendered from `src/components/AppLayout.tsx`.
- Strategy already participates in the shared tab rail, but its page body is custom.
- `Send`, `Shield`, and `Unshield` benefit from app-shell and page-level layout rules that compress spacing and simplify the top-of-page presentation.
- Strategy has its own isolated CSS block and therefore keeps a different visual posture.

## Recommended approach

Use CSS-first alignment with minimal markup changes.

The implementation should:

1. keep `StrategyPage` behavior intact
2. keep Strategy-specific internals such as the form, preview, and result surfaces intact
3. update the outer page structure only where needed to align with the shared tab rhythm
4. extend shared shell/layout rules to include `strategy-page`
5. reduce or remove the bespoke top-level treatment that makes Strategy read like a standalone landing surface

This is the smallest change that directly solves the user-visible inconsistency.

## Layout design

### Top-level behavior

`strategy-page` should behave like an existing app tab page, not like an isolated showcase.

The page should:

- align with the same shell spacing expectations as adjacent tabs
- avoid oversized standalone-hero treatment
- keep content density and edge spacing close to the surrounding app surfaces

### Header treatment

Strategy should still have a title and explanatory copy, but the header should feel like the top section of a tab workflow.

The header should:

- read as a compact module intro
- sit naturally within the shared app content rhythm
- stop visually overpowering the form below it

The header should not:

- dominate the page like a landing hero
- use proportions that make Strategy feel like a separate product

### Content structure

The existing content order remains valid:

1. title / framing
2. strategy setup form
3. prerequisites
4. preview / result surfaces

If any markup moves are required, they should be structural only and should preserve the current user-facing flow.

### Styling direction

The main consistency target is shared posture, not pixel-perfect duplication.

That means:

- match app-shell participation
- match spacing rhythm
- match top-section scale expectations
- preserve Strategy-specific controls where they support the current workflow

It does not require:

- deleting all Strategy-specific classes
- forcing Strategy to literally reuse every Send/Shield card style

## Verification design

This change should use a small red/green verification loop before implementation:

1. add a targeted check that fails when Strategy is excluded from the shared shell/layout conventions
2. make the minimal code change to satisfy that check
3. run `npm run build`

The targeted check should prove the intended contract, not just snapshot arbitrary CSS text.

Useful contract assertions include:

- shared shell/layout selectors include `strategy-page`
- Strategy no longer relies solely on isolated top-level layout behavior for its page posture

## Risks

- Over-aligning Strategy could accidentally remove useful spacing or readability from its form.
- Pulling Strategy too far toward Send/Shield internals could create a larger refactor than intended.
- A CSS-only change can appear correct on desktop while still feeling off on mobile if responsive rules are not updated alongside the base rules.

## Mitigations

- Keep the change scoped to outer layout and header posture.
- Prefer additive inclusion in shared rules over broad replacement of Strategy internals.
- Verify responsive behavior through the existing responsive CSS paths and app build.

## Definition of done

This work is done when:

- Strategy visually reads as part of the same tab family as the other app surfaces
- the Strategy route no longer stands out because of a bespoke shell posture
- Strategy behavior, validation, and preview-only truth remain unchanged
- a targeted verification check passes
- `npm run build` passes

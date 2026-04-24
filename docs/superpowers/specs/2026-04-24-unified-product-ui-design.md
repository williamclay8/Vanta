# Unified Product UI Design

**Date:** 2026-04-24

## Goal

Align the full Vanta product surface around the new home-page visual language so `/`, `/docs/*`, and `/app/*` feel like one intentional product system rather than separate experiences.

This pass should make the application and docs feel dramatically more branded and cohesive without reducing clarity inside high-intent execution flows.

## Problem

The home page now has the strongest visual identity in the product, but the rest of the site still reads as multiple adjacent systems:

- `/` uses the most confident branded language and atmosphere
- `/docs/*` is partially aligned, but still feels like a distinct handbook product
- `/app/*` has a related shell, but many routes still feel more utilitarian than intentionally unified with the new landing direction

The result is that the user can move from the home page into docs or app routes and feel like they have entered a different product family.

## Product constraints

- Keep the current route structure intact.
- Keep current application behavior intact.
- Do not rewrite send, shield, swap, strategy, unshield, pay, or docs logic as part of this effort.
- Do not make utility-heavy flows less legible or slower to scan.
- Preserve truthful product language and current readiness posture.
- Favor shared visual contracts over large component refactors where the smaller change achieves the same result.

## Non-goals

- Rebuilding the router or app information architecture
- Converting the app into a marketing-first experience
- Replacing every route with one identical layout
- Changing protocol, wallet, operator, or verification behavior
- Broad copy rewrites unrelated to top-level framing and UI consistency

## Recommended approach

Use a shell-first alignment strategy with strong landing-page energy at the top of the experience and protected utility density inside the core task workspaces.

This means:

1. unify the top-level brand shell across home, docs, and app
2. introduce a shared branded intro pattern for docs pages and app routes
3. align cards, panels, navigation, and CTA treatments around one surface system
4. keep execution zones inside app task routes tighter and more operational

This is the best balance between dramatic visual improvement and product usability.

## Design direction

### Primary direction

Adopt the user's selected `Option C` energy across the product, but apply it asymmetrically.

The shell, navigation, route intros, and supporting surfaces should feel bold, cinematic, and unmistakably Vanta.

The task workspaces should feel premium and immersive, but still behave like instruments rather than hero sections.

### Visual contract

The home page should become the visual source of truth for:

- typography personality
- glow and grid atmosphere
- premium pill navigation
- CTA treatment
- section spacing rhythm
- branded surface depth and motion

Docs and app should inherit this contract so they feel like the same product, not merely adjacent pages that share colors.

## Architecture

### Shared brand shell

`HomePage`, `DocsLayout`, and `AppLayout` should participate in one shared shell language.

This does not require a full component merge in the first pass, but it does require shared rules for:

- topbar posture
- brand lockup treatment
- navigation pills and active states
- page-level atmosphere and background behavior
- shared CTA look and interaction rhythm

### Shared branded intro pattern

Docs pages and app routes should expose a common top-of-page structure with:

- eyebrow or kicker
- large branded title
- short lede
- optional truth or status callout

This intro pattern is where the full landing-page energy should show up most strongly.

It should create a consistent emotional entry into each route without forcing the route body into one identical structure.

### Shared surface system

The product should converge around one system for:

- card backgrounds
- border radii
- border and shadow language
- section wrappers
- sidebar and support-panel styling
- hover and motion treatment

This is the main consistency mechanism for making home, docs, and app feel like one designed system.

### Protected execution zones

Core app task routes must preserve tighter work areas once the user moves below the branded intro.

The execution zone for `Shield`, `Send`, `Swap`, `Strategy`, `Unshield`, and `Pay` should:

- prioritize scanability
- keep forms and previews compact enough for repeated use
- avoid oversized hero spacing once the task begins
- use restrained motion compared with the shell and intro areas

The intended feel is: premium frame, focused instrument.

## Repo boundaries

### Primary files likely to change

- `src/styles.css`
- `src/pages/HomePage.tsx`
- `src/components/AppLayout.tsx`
- `src/components/DocsLayout.tsx`
- docs page modules under `src/pages/Docs*.tsx`
- app route pages including `ShieldPage`, `SendPage`, `SwapPage`, `StrategyPage`, `UnshieldPage`, and `PayPage`

### Scope discipline

This pass should prefer:

- shared CSS contracts
- small markup adjustments at route tops
- reusable intro wrappers where helpful
- minimal or no logic changes

This pass should avoid:

- route behavior changes
- large context/provider changes
- deep component decomposition unless clearly required for consistency

## Route-level design guidance

### Home

`/` remains the strongest expression of Vanta's visual identity and the source of truth for the rest of the system.

### Docs

`/docs/*` should feel like the editorial and explanatory extension of the same product language.

Docs can stay reading-oriented, but their shell, section spacing, cards, and calls to action should feel visibly closer to the home page and app shell.

### App

`/app/*` should feel like the operational side of the same product system.

The app shell should inherit more landing-page personality at the chrome level, and each route should gain a stronger branded intro. But the actual task areas should remain denser and more utilitarian than the marketing and docs layers.

## Verification design

This effort touches broad visual behavior, so verification should combine structural checks with real rendering checks.

Minimum verification:

1. `npm run build`
2. route-specific browser checks where they already exist and remain relevant
3. at least one browser-backed verification sweep covering home, docs, and representative app routes after the visual alignment lands

The verification goal is not pixel snapshots. It is to prove that:

- the shared shell still renders
- navigation still works
- key routes still load
- the stronger branded framing does not break core task surfaces

## Risks

- Over-applying landing-page spacing could hurt usability in task-heavy app routes.
- Docs and app may converge visually but still drift if the shared rules remain too implicit.
- A CSS-heavy pass could fix desktop presentation while leaving mobile rhythm uneven.
- In a dirty tree, broad style edits can accidentally collide with adjacent in-flight work.

## Mitigations

- Keep the boldest changes concentrated in shell, intro, and shared surface layers.
- Protect execution zones with route-specific compact rules where needed.
- Verify both desktop and mobile behavior for representative routes.
- Favor scoped markup and CSS edits over broad rewrites.

## Definition of done

This design is satisfied when:

- home, docs, and app clearly read as one Vanta product family
- app and docs inherit the home page's stronger personality at the shell and intro level
- core task routes still feel efficient and legible once the user enters the execution workspace
- no route behavior or product truth is accidentally changed
- verification commands demonstrate the updated shell still loads and works across representative routes

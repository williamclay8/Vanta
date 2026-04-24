# Vanta Docs Site Design

**Date:** 2026-04-23

## Goal

Create a dedicated docs site inside the existing Vanta app that explains what Vanta is, how its two product paths relate, and why its trust posture matters, using simple user language without overstating current readiness.

The product goal is to make Vanta legible to first-time readers while preserving the repo's truth-first discipline.

The first version should help a new visitor understand:

- what Vanta does
- what `Vanta Portal` is
- what `Vanta Pay` is
- what is live today
- what is still preview, constrained, or forward-looking

## Product constraints

- The docs site must live inside the existing Vite React app, not as a new external docs stack.
- The docs site must be a new public route family at `/docs/*`, not another tab inside the wallet-heavy `/app` shell.
- The docs homepage must use simple user language first and defer protocol-heavy language until deeper pages.
- The docs experience must present one Vanta thesis with two guided paths, not two unrelated products.
- `Vanta Portal` should represent the crypto-native side of Vanta.
- `Vanta Pay` should be framed as the forward-looking flagship direction, with today's demo and control-plane surfaces labeled clearly and honestly.
- The docs must not imply production readiness, audited final privacy guarantees, or live merchant adoption that the repo cannot prove.
- Shared truth pages should centralize sensitive claims so docs copy does not drift across multiple pages.

## Non-goals

- Introducing Docusaurus, Nextra, MDX, or another full docs framework for the first version
- Turning the docs homepage into a generic landing page with no real documentation structure
- Making the docs feel like a raw protocol reference before readers understand the product
- Splitting Vanta into two separate sites, brands, or disconnected navigation systems
- Rewriting the existing `/app` product shell as part of this docs work
- Claiming that all Vanta surfaces are live, production-ready, or mainnet-ready

## Current repo truth

### App architecture truth

- The repo already uses a single Vite React app with centralized routing.
- The current `/app` shell is built for product interaction, wallet state, and beta/runtime surfaces rather than public docs reading.
- Unknown routes currently redirect away from undeclared paths, so docs routes must be added explicitly to support deep-linking and browsing.

### Product narrative truth

- The strongest current product story is Vanta as a premium interface layer for private, policy-legible stablecoin settlement.
- The crypto-native system story still begins with shielded state and private movement.
- The clearest merchant-facing wedge today is the Pay control-plane and trust-surface direction.
- The repo already has strong language and artifacts around trust, approval boundaries, operator truth, and verification commands.

### Readiness truth

- Vanta is not production-ready today.
- Current private and merchant flows are constrained, narrow, or design-partner/demo oriented depending on the surface.
- The docs should make the product feel ambitious and coherent without hiding those constraints.

## Audience

### Primary audience

- merchants and design partners evaluating whether Vanta's payment and settlement direction is credible and understandable

### Secondary audiences

- crypto-native users who need to understand the `Shield -> private state -> Send / Swap -> Unshield` system model
- integrators and partners who need a clean mental model for Vanta's control-plane direction
- reviewers and technical evaluators who need explicit trust, verification, and limitations pages

## Product design

### Primary design direction

The docs site should be a product handbook first and a technical reference second.

The homepage should explain Vanta in simple language, then guide readers into one of two product paths:

1. `Vanta Portal`
2. `Vanta Pay`

Once a user enters a path, the layout should become more docs-like with persistent navigation, cross-links, and deeper trust material.

This preserves a premium, product-led first impression while still supporting serious documentation behavior once the user is oriented.

### Core product thesis

The docs should present one coherent Vanta system:

- Vanta helps users move, send, and pay with more privacy.
- `Vanta Portal` is the crypto-native surface for entering private state and using private flows.
- `Vanta Pay` is the merchant-facing settlement direction built on the same system.

The homepage should not make the two paths feel unrelated.

The bridge between them is:

- shared privacy entry through shielded state
- shared emphasis on policy-legible trust
- shared truth around what is live, preview-only, or forward-looking

### Homepage design

The docs homepage should be a narrative explainer page rather than a sidebar-first index.

Recommended homepage order:

1. hero in simple user language
2. short explanation of what Vanta is
3. two guided path cards for `Vanta Portal` and `Vanta Pay`
4. section showing how the two paths connect
5. trust-and-boundaries section
6. what-is-live-today section
7. footer links into deeper docs

The hero should prefer user language such as:

- `Move, send, and pay with more privacy.`
- `Vanta helps people move supported assets into private state, use private flows, and access a new merchant payment experience without forcing them to think like protocol engineers.`

The hero should avoid leading with:

- `control plane`
- `settlement orchestration`
- protocol-heavy jargon that makes the category harder to grasp

### Guided path framing

The two homepage path cards should be framed as product surfaces, not market segments.

Recommended labels:

- `Vanta Portal`
- `Vanta Pay`

`Vanta Portal` should explain:

- private-state entry
- private movement
- crypto-native flows
- the current system path from public wallet to shielded state and back

`Vanta Pay` should explain:

- private payments as the flagship direction
- merchant-facing settlement and trust surfaces
- forward-looking product ambition with today's demo/control-plane truth clearly labeled

### Information architecture

The first-release docs IA should be small, high-signal, and product-led.

Recommended top-level pages:

- `Docs Home`
- `Vanta Portal`
- `Vanta Pay`
- `Trust`
- `Security`
- `Pricing`
- `Roadmap`

Recommended `Vanta Portal` section structure:

- `What Vanta Portal is`
- `How privacy works`
- `Shield`
- `Send`
- `Swap`
- `Unshield`
- `Strategy`
- `Current limitations`

Recommended `Vanta Pay` section structure:

- `What Vanta Pay is`
- `Why private payments`
- `Checkout flow`
- `Settlement lifecycle`
- `Refunds and withdrawals`
- `Reconciliation`
- `Design-partner preview status`

Recommended `Trust` section structure:

- `Approval boundaries`
- `Operator truth`
- `Verification surfaces`
- `What is live today`

Recommended `Security` section structure:

- `Privacy model`
- `What Vanta does not promise`
- `Current constraints`
- `Production-readiness status`

Recommended `Pricing` section structure:

- launch pricing summary
- success-based billing explanation
- pass-through costs explanation
- explicit wording that keeps pricing copy aligned with current product truth

Recommended `Roadmap` section structure:

- merchant-first roadmap
- why `Vanta Pay` is the flagship direction
- how `Vanta Portal` and `Vanta Pay` connect

### Tone and copy contract

The docs voice should be:

- clear
- premium
- simple
- honest
- never magical

Preferred copy behavior:

- explain privacy in user language first
- qualify privacy claims when needed
- explain shielding plainly
- label preview and demo surfaces clearly
- make trust explicit rather than implied

Avoid as primary docs behavior:

- implying that transparent wallet balances become private automatically
- using `production-ready`, `mainnet-ready`, or `fully private` as broad product labels
- hiding caveats in tiny disclaimers after expansive claims
- turning every explanation into protocol internals

### Page layout and navigation

The docs site should use two layout modes:

1. narrative homepage layout for `/docs`
2. docs shell layout for deeper pages

The docs shell should include:

- left sidebar for section navigation
- central reading column
- right-side local table of contents on larger screens

Top-level navigation should remain lightweight and product-led.

Recommended global nav items:

- `Docs`
- `Portal`
- `Pay`
- `Trust`
- `Pricing`
- `Open App`

The deeper docs pages should feel guided rather than static.

Every major page should include:

- a short intro
- a `Why it matters` block
- a `How it works` block where relevant
- a `Current status` block
- a `Limits and caveats` block where relevant
- a next-step block at the bottom

### Reality badges

The docs should use explicit status badges to keep product truth visible inside the reading flow.

Recommended badge set:

- `Live now`
- `Preview`
- `Design-partner surface`
- `Forward-looking`

Badges should appear near titles or key modules rather than hidden at the end of pages.

### Cross-linking behavior

Cross-links should reinforce that Vanta is one system.

Recommended cross-link rules:

- `Vanta Portal` pages should link to `Vanta Pay` when merchant settlement becomes relevant
- `Vanta Pay` pages should link back to `Vanta Portal` when shielding or the privacy model needs explanation
- `Trust`, `Security`, and `Pricing` should be shared truth pages reachable from both tracks

This reduces duplication and lowers the risk of narrative drift.

## Technical design

### Route architecture

The docs site should be implemented as a new public route family inside the existing app:

- `/docs`
- `/docs/portal`
- `/docs/pay`
- `/docs/trust`
- `/docs/security`
- `/docs/pricing`
- `/docs/roadmap`

The docs routes should sit outside `/app`.

The docs site should not reuse the current `AppLayout`, because that shell is tuned for wallet interactions, beta banners, wallet picker flows, and app tabs.

Instead, the docs work should introduce a dedicated `DocsLayout` with docs-specific navigation and reading structure.

### Content architecture

The first version should use typed TS/TSX content modules and page components rather than a new markdown system.

Reasons:

- the repo already uses React and typed UI patterns
- the first release only needs a small set of high-signal pages
- avoiding a new content framework keeps scope tight and reversible
- the team can add MDX or another authoring system later if docs scale requires it

Recommended content split:

- shared page metadata and navigation config
- typed content modules for section copy and badge state
- focused React page components for each docs page

### Visual direction

The docs should reuse the Vanta brand language and tokens but feel calmer and more editorial than the app shell.

Recommended visual qualities:

- premium but readable
- stronger typographic hierarchy than the app
- restrained motion
- clear spacing and section rhythm
- visual emphasis on guided reading rather than transaction control

The docs should not feel like:

- a dashboard
- a wallet surface
- a generic open-source docs portal

## State and content contract

### DocsTrack

```ts
type DocsTrack = "portal" | "pay" | "shared";
```

### DocsBadge

```ts
type DocsBadge = "live-now" | "preview" | "design-partner-surface" | "forward-looking";
```

### DocsPageMeta

```ts
type DocsPageMeta = {
  slug: string;
  title: string;
  summary: string;
  track: DocsTrack;
  badge?: DocsBadge;
  section: "home" | "portal" | "pay" | "trust" | "security" | "pricing" | "roadmap";
};
```

### DocsNextStep

```ts
type DocsNextStep = {
  label: string;
  href: string;
  description: string;
};
```

These types are intentionally product-facing and editorially useful. The first version should avoid coupling docs state directly to runtime wallet or protocol state.

## Verification design

### Baseline verification

The minimum verification for the first docs release should be:

- `npm run build`

### Browser-backed verification

Once the docs routes exist, the repo should add a browser-backed docs check that verifies:

- `/docs` renders
- the homepage shows `Vanta Portal` and `Vanta Pay`
- trust/status badge language appears where expected
- shared pages such as `Trust` and `Pricing` are reachable
- the docs shell navigation works on representative routes

### Copy-truth verification

The docs implementation should be checked for explicit truth constraints:

- no broad `production-ready` claim
- no magical privacy claim
- `Vanta Pay` preview/control-plane wording is visible
- live versus preview status is explicit on relevant pages

## Risks and mitigation

### Risk: docs drift from runtime truth

Mitigation:

- centralize sensitive claims in shared trust/security pages
- reuse existing repo language where it is already the strongest truthful wording
- add docs-focused browser assertions for key phrases and route presence

### Risk: docs feel like marketing, not documentation

Mitigation:

- keep deeper pages in a real docs shell with sidebar navigation
- include structured modules such as `How it works`, `Current status`, and `Limits and caveats`
- make verification and limitation pages first-class

### Risk: docs become too technical too early

Mitigation:

- keep the homepage and top-level path pages in simple user language
- move protocol and operator detail into deeper pages
- use `Vanta Portal` and `Vanta Pay` as guided entry points rather than expecting readers to self-sort from a dense index

### Risk: overbuilding the content system

Mitigation:

- start with typed TS/TSX content modules
- defer markdown/MDX adoption until the docs footprint clearly demands it
- keep the first release bounded to a small set of high-signal pages

## Implementation phases

### Phase 1: docs shell and core narrative

- add `/docs/*` routing
- create `DocsLayout`
- build the docs homepage
- add the first `Vanta Portal` and `Vanta Pay` pages

### Phase 2: shared trust pages

- add `Trust`
- add `Security`
- add `Pricing`
- add `Roadmap`

### Phase 3: verification hardening

- add browser-backed docs checks
- tighten copy-truth assertions
- align docs copy with existing README and trust surfaces where needed

## Success criteria

The first docs release succeeds when:

- a first-time reader can understand what Vanta is without reading source code or protocol notes
- the relationship between `Vanta Portal` and `Vanta Pay` feels intentional and coherent
- the site feels product-led and premium rather than generic or over-technical
- trust, readiness, and limitations are explicit and easy to find
- the docs can be verified with real commands rather than judged only by taste

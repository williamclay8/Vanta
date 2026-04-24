# Unified Product UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home page, docs routes, and app routes feel like one bold Vanta product system while preserving compact, legible execution zones inside the core task flows.

**Architecture:** Start by locking the intended visual contract with browser-backed checks for landing and docs plus one app route. Then align the shared shell rules in `src/styles.css`, `AppLayout`, and `DocsLayout` so navigation, atmosphere, and CTA treatments read as one family. After that, add a reusable branded intro posture to the docs and app route tops, and finish by tuning route-specific execution zones so the task workspaces stay efficient instead of inheriting full landing-page spacing.

**Tech Stack:** React 18, TypeScript, React Router, Vite, repo-native `.mjs` browser checks, `gsd-browser`, CSS

---

## File Structure

### Files to modify

- `src/styles.css`
  - Extend the landing visual contract into shared shell, intro, and surface rules used by home, docs, and app.
- `src/components/AppLayout.tsx`
  - Align the app topbar and shell posture with the landing/docs system without changing wallet behavior.
- `src/components/DocsLayout.tsx`
  - Align docs chrome with the same shared shell language as home and app.
- `src/pages/DocsHomePage.tsx`
  - Strengthen the docs intro posture so docs feels like the editorial wing of the same product.
- `src/pages/ShieldPage.tsx`
  - Add branded route-intro framing while preserving the existing task layout.
- `src/pages/SendPage.tsx`
  - Add branded route-intro framing while preserving the existing task layout.
- `src/pages/SwapPage.tsx`
  - Add branded route-intro framing while preserving the existing task layout.
- `src/pages/StrategyPage.tsx`
  - Keep current Strategy logic intact while moving its top-of-page treatment into the shared intro system.
- `src/pages/UnshieldPage.tsx`
  - Add branded route-intro framing while preserving the existing task layout.
- `src/pages/PayPage.tsx`
  - Add branded route-intro framing while preserving the existing task layout.
- `scripts/check-vanta-landing-browser.mjs`
  - Assert the landing page remains the visual source of truth and the app/docs entry points still exist.
- `scripts/check-vanta-docs-browser.mjs`
  - Assert docs chrome and docs-home framing match the upgraded product posture.
- `scripts/check-vanta-strategy-browser.mjs`
  - Assert at least one representative app route participates in the new branded-intro contract without losing task usability.
- `package.json`
  - Add one umbrella verification command if a dedicated product-UI check script name is needed.

### Files to create

- `scripts/check-vanta-product-ui-browser.mjs`
  - Browser sweep across `/`, `/docs`, and representative `/app/*` routes to prove shell continuity and route usability after the alignment lands.

---

### Task 1: Lock the Product-UI Contract With Failing Browser Checks

**Files:**
- Modify: `scripts/check-vanta-landing-browser.mjs`
- Modify: `scripts/check-vanta-docs-browser.mjs`
- Modify: `scripts/check-vanta-strategy-browser.mjs`
- Create: `scripts/check-vanta-product-ui-browser.mjs`
- Modify: `package.json`

- [ ] **Step 1: Extend the landing browser contract with shell-continuity assertions**

Add these fields inside the `JSON.stringify` block in `scripts/check-vanta-landing-browser.mjs`:

```js
        hasSharedBrandWordmark: document.querySelector(".landing-nav__wordmark")?.textContent?.trim() === "VANTA",
        hasSharedAtmosphere: Boolean(
          document.querySelector(".landing-minimal__grid") &&
            document.querySelector(".landing-minimal__glow--left") &&
            document.querySelector(".landing-minimal__glow--right"),
        ),
        hasDocsAndAppPrimaryPaths: ["/docs", "/app/send"].every((href) =>
          [...document.querySelectorAll("a")].some((link) => link.getAttribute("href") === href),
        ),
```

Then add these assertions below the existing CTA checks:

```js
  if (!result.hasSharedBrandWordmark) {
    throw new Error("Landing page must keep the VANTA wordmark in the primary nav.");
  }

  if (!result.hasSharedAtmosphere) {
    throw new Error("Landing page must keep the branded atmosphere grid and glow contract.");
  }

  if (!result.hasDocsAndAppPrimaryPaths) {
    throw new Error("Landing page must keep direct paths into docs and the app.");
  }
```

- [ ] **Step 2: Run the landing browser check to verify the repo is still green before tightening docs/app checks**

Run: `node scripts/check-vanta-landing-browser.mjs`

Expected: PASS with `vanta landing browser check: PASS`

- [ ] **Step 3: Tighten the docs browser check to require the stronger shared shell and hero posture**

Add these assertions to the `/docs` batch block in `scripts/check-vanta-docs-browser.mjs`:

```js
        { kind: "selector_visible", selector: ".docs-shell" },
        { kind: "selector_visible", selector: ".docs-home__hero" },
        { kind: "selector_visible", selector: ".docs-home__hero-note" },
        { kind: "selector_visible", selector: ".docs-path-card" },
        { kind: "text_visible", text: "Start here if you want the product story first." },
```

Then add one route-shell continuity assertion to a deep page block:

```js
        { kind: "selector_visible", selector: "[data-docs-header]" },
        { kind: "selector_visible", selector: ".docs-shell__content" },
```

- [ ] **Step 4: Run the docs browser check to capture the current baseline**

Run: `node scripts/check-vanta-docs-browser.mjs`

Expected: PASS with `vanta docs browser check: PASS`

- [ ] **Step 5: Tighten the representative app-route check around the branded intro contract**

Add these assertions to the first Strategy scenario in `scripts/check-vanta-strategy-browser.mjs` before clicking the primary action:

```js
          { kind: "selector_visible", selector: ".strategy-page" },
          { kind: "selector_visible", selector: ".strategy-header" },
          { kind: "selector_visible", selector: ".strategy-kicker" },
          { kind: "text_visible", text: "Strategy" },
          { kind: "text_visible", text: "Preview routing, funding, and landing behavior while live strategy execution remains preview-only." },
```

- [ ] **Step 6: Add one cross-route product UI browser sweep**

Create `scripts/check-vanta-product-ui-browser.mjs`:

```js
import { execFileSync, spawn } from "node:child_process";

const port = 5630 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForVite() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still booting.
    }

    await sleep(250);
  }

  throw new Error("Vanta dev server did not become ready for product UI browser verification.");
}

function runBrowserBatch() {
  const steps = [
    { action: "navigate", url: baseUrl },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/" },
        { kind: "selector_visible", selector: ".landing-nav" },
        { kind: "text_visible", text: "Privacy rails for" },
        { kind: "text_visible", text: "Docs" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/docs` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: "[data-docs-header]" },
        { kind: "selector_visible", selector: ".docs-home__hero" },
        { kind: "text_visible", text: "Move, send, and pay with more privacy." },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/send` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: ".app-header" },
        { kind: "text_visible", text: "Send" },
        { kind: "no_console_errors" },
      ],
    },
  ];

  execFileSync("gsd-browser", ["batch", "--steps", JSON.stringify(steps), "--summary-only"], {
    stdio: "pipe",
  });
}

const vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  env: {
    ...process.env,
    VITE_VANTA_DEPLOYMENT_MODE: "beta",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitForVite();
  runBrowserBatch();
  console.log("vanta product ui browser check: PASS");
} finally {
  if (vite.exitCode === null) {
    await new Promise((resolvePromise) => {
      vite.once("close", resolvePromise);
      vite.kill("SIGTERM");
    });
  }
}
```

- [ ] **Step 7: Register the new browser check**

Add this script to `package.json`:

```json
    "product-ui:browser-check": "node scripts/check-vanta-product-ui-browser.mjs",
```

- [ ] **Step 8: Run the new product-ui check to verify the baseline**

Run: `npm run product-ui:browser-check`

Expected: PASS with `vanta product ui browser check: PASS`

- [ ] **Step 9: Commit the verification-contract checkpoint**

```bash
git add scripts/check-vanta-landing-browser.mjs scripts/check-vanta-docs-browser.mjs scripts/check-vanta-strategy-browser.mjs scripts/check-vanta-product-ui-browser.mjs package.json
git commit -m "test: lock unified product ui contract"
```

### Task 2: Align the Shared Home, Docs, and App Shell Language

**Files:**
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/components/DocsLayout.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add explicit shared-shell data hooks without changing behavior**

Update the top-level wrappers in `src/components/AppLayout.tsx`:

```tsx
    <div className="app-shell app-shell--minimal" data-product-shell="app">
```

```tsx
      <header className="app-header" data-product-topbar>
```

```tsx
          <nav className="app-header__tabs" aria-label="Primary" data-product-nav>
```

And update the docs shell in `src/components/DocsLayout.tsx`:

```tsx
    <div className="docs-shell" data-product-shell="docs">
```

```tsx
      <header className="docs-shell__topbar" data-docs-header data-product-topbar>
```

```tsx
          <nav
            className="docs-shell__nav"
            aria-label="Docs primary navigation"
            data-docs-header-nav
            data-product-nav
          >
```

- [ ] **Step 2: Run the build to verify the markup-only hooks compile**

Run: `npm run build`

Expected: PASS

- [ ] **Step 3: Add a shared shell rule set in `src/styles.css`**

Insert a new block near the existing shell styles:

```css
[data-product-shell] {
  position: relative;
}

[data-product-topbar] {
  width: min(1180px, calc(100vw - 36px));
  margin-inline: auto;
  border-radius: 24px;
  border: 1px solid rgba(0, 229, 200, 0.12);
  background: rgba(8, 13, 20, 0.78);
  backdrop-filter: blur(26px);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.34);
}

[data-product-nav] {
  border-radius: 999px;
  border: 1px solid rgba(0, 229, 200, 0.08);
  background: rgba(0, 229, 200, 0.03);
}
```

- [ ] **Step 4: Move docs-shell chrome closer to the app/home chrome**

Replace the current docs-shell topbar basics in `src/styles.css` with:

```css
.docs-shell {
  min-height: 100vh;
  padding: 18px 18px 40px;
  display: grid;
  gap: 18px;
  background:
    radial-gradient(circle at 12% 40%, rgba(0, 229, 200, 0.08), transparent 26%),
    radial-gradient(circle at 86% 24%, rgba(0, 229, 200, 0.05), transparent 22%),
    linear-gradient(180deg, #020305 0%, #05080f 100%);
}

.docs-shell__topbar {
  position: relative;
  z-index: 10;
  padding: 10px 12px;
  gap: 16px;
}
```

- [ ] **Step 5: Align docs navigation and CTA posture with the landing/app pill language**

Replace the docs navigation and CTA shell styles with:

```css
.docs-shell__nav-link {
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.docs-shell__nav-link--active {
  color: #020305;
  background: var(--accent);
  box-shadow: 0 0 0 1px rgba(0, 229, 200, 0.12), 0 12px 28px rgba(0, 229, 200, 0.18);
}

.docs-shell__app-cta {
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 0.76rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
```

- [ ] **Step 6: Run the build and browser checks after the shell alignment**

Run:

```bash
npm run build
npm run product-ui:browser-check
node scripts/check-vanta-docs-browser.mjs
```

Expected: all PASS

- [ ] **Step 7: Commit the shared-shell alignment**

```bash
git add src/components/AppLayout.tsx src/components/DocsLayout.tsx src/styles.css
git commit -m "feat: align shared product shell styling"
```

### Task 3: Add the Shared Branded Intro Pattern to Docs and App Routes

**Files:**
- Modify: `src/pages/DocsHomePage.tsx`
- Modify: `src/pages/ShieldPage.tsx`
- Modify: `src/pages/SendPage.tsx`
- Modify: `src/pages/SwapPage.tsx`
- Modify: `src/pages/StrategyPage.tsx`
- Modify: `src/pages/UnshieldPage.tsx`
- Modify: `src/pages/PayPage.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create shared intro utility classes in `src/styles.css`**

Add this block near the page-level layout rules:

```css
.product-intro {
  display: grid;
  gap: 14px;
  padding: 20px 22px;
  border-radius: 28px;
  border: 1px solid rgba(0, 229, 200, 0.14);
  background:
    radial-gradient(circle at top right, rgba(0, 229, 200, 0.1), transparent 28%),
    linear-gradient(180deg, rgba(8, 13, 20, 0.92), rgba(8, 13, 20, 0.76));
  box-shadow:
    0 24px 56px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.product-intro__eyebrow {
  font-size: 0.76rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(232, 250, 248, 0.66);
}

.product-intro h1 {
  margin: 0;
  font-family: "Syne", sans-serif;
  font-size: clamp(2.6rem, 6vw, 4rem);
  line-height: 0.96;
  letter-spacing: -0.04em;
}

.product-intro p {
  max-width: 58ch;
  margin: 0;
}
```

- [ ] **Step 2: Upgrade the docs home hero to use the shared intro contract**

Update the first section in `src/pages/DocsHomePage.tsx`:

```tsx
      <section className="docs-home__hero product-intro">
        <span className="docs-home__eyebrow product-intro__eyebrow">Vanta Docs</span>
        <h1 className="docs-home__title">Move, send, and pay with more privacy.</h1>
        <p className="docs-home__lede">
          Vanta helps people move supported assets into private state, use private flows,
          and understand the merchant-facing path without forcing them to think like protocol engineers first.
        </p>
        <div className="docs-home__hero-note">
```

- [ ] **Step 3: Wrap the Strategy header in the shared intro posture**

In `src/pages/StrategyPage.tsx`, change the route top to:

```tsx
    <section className="strategy-page" aria-labelledby="strategy-title">
      <div className="strategy-shell">
        <header className="strategy-header product-intro">
          <div className="strategy-header__copy">
            <span className="strategy-kicker product-intro__eyebrow">Execution</span>
            <h1 id="strategy-title">Strategy</h1>
            <p>{modeCopy}</p>
          </div>
        </header>
```

- [ ] **Step 4: Mirror the branded-intro posture onto the other app routes**

For each route file, wrap the existing top section in the same pattern:

```tsx
      <div className="module-page__hero send-page__hero product-intro">
```

Use the existing route copy; do not change product truth. Apply the same class extension in:

```tsx
// src/pages/ShieldPage.tsx
<div className="module-page__hero send-page__hero product-intro">

// src/pages/SendPage.tsx
<div className="module-page__hero send-page__hero product-intro">

// src/pages/SwapPage.tsx
<div className="module-page__hero send-page__hero product-intro">

// src/pages/UnshieldPage.tsx
<div className="module-page__hero send-page__hero product-intro">

// src/pages/PayPage.tsx
<header className="pay-page__hero product-intro">
```

- [ ] **Step 5: Run the targeted Strategy and docs checks after the intro alignment**

Run:

```bash
node scripts/check-vanta-strategy-browser.mjs
node scripts/check-vanta-docs-browser.mjs
```

Expected: both PASS

- [ ] **Step 6: Commit the branded-intro alignment**

```bash
git add src/pages/DocsHomePage.tsx src/pages/ShieldPage.tsx src/pages/SendPage.tsx src/pages/SwapPage.tsx src/pages/StrategyPage.tsx src/pages/UnshieldPage.tsx src/pages/PayPage.tsx src/styles.css
git commit -m "feat: add branded route intros across docs and app"
```

### Task 4: Protect the Execution Zones and Finish Full Verification

**Files:**
- Modify: `src/styles.css`
- Test: `scripts/check-vanta-product-ui-browser.mjs`
- Test: `scripts/check-vanta-landing-browser.mjs`
- Test: `scripts/check-vanta-docs-browser.mjs`
- Test: `scripts/check-vanta-strategy-browser.mjs`

- [ ] **Step 1: Add compact execution-zone overrides so task surfaces do not become hero-heavy**

Append this block below the shared intro styles in `src/styles.css`:

```css
.send-page > .send-layout,
.shield-page .shield-layout,
.unshield-page > .send-layout,
.strategy-main,
.pay-page__grid {
  margin-top: 14px;
}

.send-page > .send-layout > .send-card,
.shield-page .shield-card,
.unshield-page > .send-layout > .send-card,
.strategy-card--primary,
.pay-page__panel {
  border-radius: 24px;
}

.send-page .product-intro + *,
.shield-page .product-intro + *,
.unshield-page .product-intro + *,
.strategy-page .product-intro + *,
.pay-page .product-intro + * {
  margin-top: 14px;
}
```

- [ ] **Step 2: Add one responsive safeguard for mobile**

Inside the existing mobile media block in `src/styles.css`, add:

```css
  .product-intro {
    padding: 18px 16px;
    border-radius: 24px;
  }

  .product-intro h1 {
    font-size: clamp(2.1rem, 10vw, 3rem);
  }
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run build
node scripts/check-vanta-landing-browser.mjs
node scripts/check-vanta-docs-browser.mjs
node scripts/check-vanta-strategy-browser.mjs
npm run product-ui:browser-check
```

Expected: all PASS

- [ ] **Step 4: Review the diff for accidental copy or behavior drift**

Run:

```bash
git diff -- src/components/AppLayout.tsx src/components/DocsLayout.tsx src/pages/HomePage.tsx src/pages/DocsHomePage.tsx src/pages/ShieldPage.tsx src/pages/SendPage.tsx src/pages/SwapPage.tsx src/pages/StrategyPage.tsx src/pages/UnshieldPage.tsx src/pages/PayPage.tsx src/styles.css scripts/check-vanta-landing-browser.mjs scripts/check-vanta-docs-browser.mjs scripts/check-vanta-strategy-browser.mjs scripts/check-vanta-product-ui-browser.mjs package.json
```

Expected: only shell, intro, surface, and verification changes; no product-truth drift.

- [ ] **Step 5: Commit the protected execution-zone finish**

```bash
git add src/styles.css scripts/check-vanta-product-ui-browser.mjs scripts/check-vanta-landing-browser.mjs scripts/check-vanta-docs-browser.mjs scripts/check-vanta-strategy-browser.mjs package.json
git commit -m "feat: complete unified product ui rollout"
```

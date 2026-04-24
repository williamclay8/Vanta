# Vanta Docs Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `/docs/*` product-handbook surface inside the existing Vite app that explains Vanta through `Vanta Portal`, `Vanta Pay`, and shared trust pages using truthful, simple language.

**Architecture:** Add a new public docs route family parallel to `/app`, backed by a dedicated `DocsLayout`, typed docs metadata/content modules, and a small first-release page set. Keep docs outside the wallet-heavy `AppLayout`, preserve the existing app shell, and add a browser-backed regression that asserts the docs homepage, path cards, shared pages, and truth badges.

**Tech Stack:** React 18, TypeScript, React Router, existing Vite app, existing CSS file, Node `.mjs` browser check scripts, `gsd-browser`, npm build verification.

---

## File Structure

### New files

- `src/components/DocsLayout.tsx`
  - Public docs shell with top nav, sidebar, content column, and next-step footer.
- `src/components/DocsSidebar.tsx`
  - Sidebar navigation for docs sections and per-track page groups.
- `src/components/DocsPageTemplate.tsx`
  - Shared docs content wrapper for hero, badge, summary, and section blocks.
- `src/components/DocsStatusBadge.tsx`
  - Truth badge renderer for `Live now`, `Preview`, `Design-partner surface`, and `Forward-looking`.
- `src/docs/docsContent.ts`
  - Typed page metadata, navigation, badges, summaries, and next-step definitions.
- `src/pages/DocsHomePage.tsx`
  - Narrative docs homepage with the `Vanta Portal` and `Vanta Pay` path cards.
- `src/pages/DocsPortalPage.tsx`
  - First product track page for the crypto-native side.
- `src/pages/DocsPayPage.tsx`
  - First product track page for the flagship merchant settlement direction.
- `src/pages/DocsTrustPage.tsx`
  - Shared truth page for approval boundaries, operator truth, and verification surfaces.
- `src/pages/DocsSecurityPage.tsx`
  - Shared limitations page for privacy model, constraints, and readiness honesty.
- `src/pages/DocsPricingPage.tsx`
  - Shared pricing page for launch pricing direction.
- `src/pages/DocsRoadmapPage.tsx`
  - Shared roadmap page connecting `Vanta Portal` and `Vanta Pay`.
- `scripts/check-vanta-docs-browser.mjs`
  - Browser-backed docs regression for `/docs` and representative deep routes.

### Files to modify

- `src/App.tsx`
  - Add the `/docs/*` route family and docs pages before the catch-all redirect.
- `src/main.tsx`
  - Refactor provider composition so docs routes can render without initializing the full Solana/private-vault app stack.
- `src/styles.css`
  - Add docs-specific layout, typography, nav, and badge styling.
- `package.json`
  - Add `docs:browser-check` and `docs:verify` scripts.
- `README.md`
  - Add the docs route and docs verification command to the route and verification sections.

---

### Task 1: Split Public Docs Routing From The Wallet-Heavy App Shell

**Files:**
- Create: `src/components/DocsLayout.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Test: `npm run build`

- [ ] **Step 1: Add a failing route assertion plan to the build task**

```tsx
// src/App.tsx
<Route path="/docs" element={<DocsLayout />}>
  <Route index element={<DocsHomePage />} />
  <Route path="portal" element={<DocsPortalPage />} />
  <Route path="pay" element={<DocsPayPage />} />
  <Route path="trust" element={<DocsTrustPage />} />
  <Route path="security" element={<DocsSecurityPage />} />
  <Route path="pricing" element={<DocsPricingPage />} />
  <Route path="roadmap" element={<DocsRoadmapPage />} />
</Route>
```

- [ ] **Step 2: Run the build to verify the docs routes do not exist yet**

Run: `npm run build`
Expected: FAIL once the new imports are referenced, because `DocsLayout` and the docs page modules do not exist yet.

- [ ] **Step 3: Add the dedicated docs shell**

```tsx
// src/components/DocsLayout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { DocsSidebar } from "@/components/DocsSidebar";

export function DocsLayout() {
  return (
    <div className="docs-shell">
      <header className="docs-shell__topbar">
        <NavLink to="/docs" className="docs-shell__brand" aria-label="Vanta Docs">
          <BrandMark />
          <div>
            <strong>Vanta Docs</strong>
            <span>Move, send, and pay with more privacy.</span>
          </div>
        </NavLink>
        <nav className="docs-shell__topnav" aria-label="Docs primary">
          <NavLink to="/docs/portal">Portal</NavLink>
          <NavLink to="/docs/pay">Pay</NavLink>
          <NavLink to="/docs/trust">Trust</NavLink>
          <NavLink to="/docs/pricing">Pricing</NavLink>
          <NavLink to="/app/send">Open App</NavLink>
        </nav>
      </header>
      <div className="docs-shell__body">
        <DocsSidebar />
        <main className="docs-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the `/docs/*` route family before the catch-all**

```tsx
// src/App.tsx
const DocsLayout = lazy(() =>
  import("@/components/DocsLayout").then((m) => ({ default: m.DocsLayout })),
);
const DocsHomePage = lazy(() =>
  import("@/pages/DocsHomePage").then((m) => ({ default: m.DocsHomePage })),
);

// ...

<Route path="/docs" element={<DocsLayout />}>
  <Route index element={<DocsHomePage />} />
  <Route path="portal" element={<DocsPortalPage />} />
  <Route path="pay" element={<DocsPayPage />} />
  <Route path="trust" element={<DocsTrustPage />} />
  <Route path="security" element={<DocsSecurityPage />} />
  <Route path="pricing" element={<DocsPricingPage />} />
  <Route path="roadmap" element={<DocsRoadmapPage />} />
</Route>
```

- [ ] **Step 5: Move Solana/private-vault providers under a public-app root instead of wrapping docs**

```tsx
// src/main.tsx
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SolanaRootProvider>
      <PrivateVaultProvider>{children}</PrivateVaultProvider>
    </SolanaRootProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>,
);
```
Replace this with:
```tsx
// src/main.tsx
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

```tsx
// src/App.tsx
function ProductAppRoot() {
  return (
    <SolanaRootProvider>
      <PrivateVaultProvider>
        <WalletProvider>
          <PrivacyFlowProvider>
            <AppLayout />
          </PrivacyFlowProvider>
        </WalletProvider>
      </PrivateVaultProvider>
    </SolanaRootProvider>
  );
}
```

- [ ] **Step 6: Run verification**

Run: `npm run build`
Expected: PASS, with `/docs/*` declared and no docs route wrapped by the product-only providers.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/main.tsx src/components/DocsLayout.tsx
git commit -m "feat: add public docs route shell"
```

---

### Task 2: Add Typed Docs Metadata, Sidebar Navigation, And Shared Page Template

**Files:**
- Create: `src/docs/docsContent.ts`
- Create: `src/components/DocsSidebar.tsx`
- Create: `src/components/DocsPageTemplate.tsx`
- Create: `src/components/DocsStatusBadge.tsx`
- Modify: `src/components/DocsLayout.tsx`
- Test: `npm run build`

- [ ] **Step 1: Write the typed docs metadata module**

```ts
// src/docs/docsContent.ts
export type DocsTrack = "portal" | "pay" | "shared";
export type DocsBadge = "live-now" | "preview" | "design-partner-surface" | "forward-looking";

export type DocsPageMeta = {
  slug: string;
  title: string;
  summary: string;
  track: DocsTrack;
  section: "home" | "portal" | "pay" | "trust" | "security" | "pricing" | "roadmap";
  badge?: DocsBadge;
  nextStep?: {
    label: string;
    href: string;
    description: string;
  };
};

export const docsPages: DocsPageMeta[] = [
  {
    slug: "/docs/portal",
    title: "Vanta Portal",
    summary: "Enter private state, move privately, and understand the crypto-native side of Vanta.",
    track: "portal",
    section: "portal",
    badge: "preview",
    nextStep: {
      label: "See how Vanta Pay builds on Portal",
      href: "/docs/pay",
      description: "Follow the merchant-facing settlement story.",
    },
  },
  {
    slug: "/docs/pay",
    title: "Vanta Pay",
    summary: "The forward-looking merchant settlement direction, with today's demo and control-plane truth made explicit.",
    track: "pay",
    section: "pay",
    badge: "forward-looking",
    nextStep: {
      label: "Review trust surfaces",
      href: "/docs/trust",
      description: "See approval boundaries, operator truth, and verification commands.",
    },
  },
];
```

- [ ] **Step 2: Add the shared truth badge component**

```tsx
// src/components/DocsStatusBadge.tsx
import type { DocsBadge } from "@/docs/docsContent";

const badgeLabel: Record<DocsBadge, string> = {
  "live-now": "Live now",
  preview: "Preview",
  "design-partner-surface": "Design-partner surface",
  "forward-looking": "Forward-looking",
};

export function DocsStatusBadge({ badge }: { badge: DocsBadge }) {
  return <span className={`docs-badge docs-badge--${badge}`}>{badgeLabel[badge]}</span>;
}
```

- [ ] **Step 3: Add the shared docs page template**

```tsx
// src/components/DocsPageTemplate.tsx
import type { ReactNode } from "react";
import { DocsStatusBadge } from "@/components/DocsStatusBadge";
import type { DocsBadge } from "@/docs/docsContent";

export function DocsPageTemplate({
  title,
  summary,
  badge,
  children,
  nextStep,
}: {
  title: string;
  summary: string;
  badge?: DocsBadge;
  children: ReactNode;
  nextStep?: ReactNode;
}) {
  return (
    <article className="docs-page">
      <header className="docs-page__header">
        {badge ? <DocsStatusBadge badge={badge} /> : null}
        <h1>{title}</h1>
        <p>{summary}</p>
      </header>
      <div className="docs-page__body">{children}</div>
      {nextStep ? <footer className="docs-page__next-step">{nextStep}</footer> : null}
    </article>
  );
}
```

- [ ] **Step 4: Add the docs sidebar**

```tsx
// src/components/DocsSidebar.tsx
import { NavLink } from "react-router-dom";

const groups = [
  {
    label: "Start here",
    links: [
      { href: "/docs", label: "Docs Home" },
      { href: "/docs/portal", label: "Vanta Portal" },
      { href: "/docs/pay", label: "Vanta Pay" },
    ],
  },
  {
    label: "Shared truth",
    links: [
      { href: "/docs/trust", label: "Trust" },
      { href: "/docs/security", label: "Security" },
      { href: "/docs/pricing", label: "Pricing" },
      { href: "/docs/roadmap", label: "Roadmap" },
    ],
  },
];

export function DocsSidebar() {
  return (
    <aside className="docs-sidebar" aria-label="Docs sections">
      {groups.map((group) => (
        <section key={group.label} className="docs-sidebar__group">
          <span className="docs-sidebar__label">{group.label}</span>
          {group.links.map((link) => (
            <NavLink key={link.href} to={link.href}>
              {link.label}
            </NavLink>
          ))}
        </section>
      ))}
    </aside>
  );
}
```

- [ ] **Step 5: Wire the sidebar into the docs layout**

```tsx
// src/components/DocsLayout.tsx
<div className="docs-shell__body">
  <DocsSidebar />
  <main className="docs-shell__content">
    <Outlet />
  </main>
</div>
```

- [ ] **Step 6: Run verification**

Run: `npm run build`
Expected: PASS, with typed docs metadata and reusable docs shell components compiling cleanly.

- [ ] **Step 7: Commit**

```bash
git add src/docs/docsContent.ts src/components/DocsSidebar.tsx src/components/DocsPageTemplate.tsx src/components/DocsStatusBadge.tsx src/components/DocsLayout.tsx
git commit -m "feat: add docs metadata and shared docs components"
```

---

### Task 3: Build The Narrative Docs Homepage And First Two Product Pages

**Files:**
- Create: `src/pages/DocsHomePage.tsx`
- Create: `src/pages/DocsPortalPage.tsx`
- Create: `src/pages/DocsPayPage.tsx`
- Modify: `src/docs/docsContent.ts`
- Modify: `src/styles.css`
- Test: `npm run build`

- [ ] **Step 1: Add the docs homepage with guided path cards**

```tsx
// src/pages/DocsHomePage.tsx
import { Link } from "react-router-dom";

export function DocsHomePage() {
  return (
    <main className="docs-home">
      <section className="docs-home__hero">
        <span className="docs-home__eyebrow">Vanta Docs</span>
        <h1>Move, send, and pay with more privacy.</h1>
        <p>
          Vanta helps people move supported assets into private state, use private flows,
          and access a new merchant payment experience without forcing them to think like protocol engineers.
        </p>
      </section>

      <section className="docs-home__paths" aria-label="Docs paths">
        <Link className="docs-path-card" to="/docs/portal">
          <span>Vanta Portal</span>
          <strong>Enter private state and use crypto-native private flows.</strong>
        </Link>
        <Link className="docs-path-card" to="/docs/pay">
          <span>Vanta Pay</span>
          <strong>See the flagship private settlement direction and today's control-plane truth.</strong>
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add the first `Vanta Portal` page**

```tsx
// src/pages/DocsPortalPage.tsx
import { Link } from "react-router-dom";
import { DocsPageTemplate } from "@/components/DocsPageTemplate";

export function DocsPortalPage() {
  return (
    <DocsPageTemplate
      title="Vanta Portal"
      summary="The crypto-native side of Vanta starts by moving supported assets into private state before sending, swapping, or exiting."
      badge="preview"
      nextStep={
        <Link to="/docs/pay">
          See how Vanta Pay turns the same system into a merchant-facing settlement direction.
        </Link>
      }
    >
      <section>
        <h2>Why it matters</h2>
        <p>Vanta begins at the privacy entry point instead of pretending transparent wallet balances are private by default.</p>
      </section>
      <section>
        <h2>How it works</h2>
        <p>Public Wallet -&gt; Shield -&gt; Shielded State -&gt; Send / Swap -&gt; Unshield.</p>
      </section>
      <section>
        <h2>Current status</h2>
        <p>Today's product is constrained but real, with narrow live and preview surfaces depending on the flow.</p>
      </section>
    </DocsPageTemplate>
  );
}
```

- [ ] **Step 3: Add the first `Vanta Pay` page**

```tsx
// src/pages/DocsPayPage.tsx
import { Link } from "react-router-dom";
import { DocsPageTemplate } from "@/components/DocsPageTemplate";

export function DocsPayPage() {
  return (
    <DocsPageTemplate
      title="Vanta Pay"
      summary="Vanta Pay is the forward-looking merchant settlement direction, with today's demo and control-plane surfaces labeled clearly."
      badge="forward-looking"
      nextStep={
        <Link to="/docs/trust">
          Review the trust surfaces that make the current direction legible.
        </Link>
      }
    >
      <section>
        <h2>Why it matters</h2>
        <p>Vanta Pay makes settlement, approval, refunds, withdrawals, and reconciliation easier to understand.</p>
      </section>
      <section>
        <h2>Current status</h2>
        <p>Today's Pay surface is a design-partner preview and merchant control-plane surface, not a finished production payments network.</p>
      </section>
    </DocsPageTemplate>
  );
}
```

- [ ] **Step 4: Add docs-specific editorial styles**

```css
/* src/styles.css */
.docs-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(92, 242, 168, 0.14), transparent 32%),
    linear-gradient(180deg, #081019 0%, #0d1520 100%);
  color: #ecf6f0;
}

.docs-shell__body {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 2rem;
  padding: 1.5rem 2rem 3rem;
}

.docs-home__paths {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.docs-path-card {
  border: 1px solid rgba(236, 246, 240, 0.12);
  border-radius: 24px;
  padding: 1.25rem;
  text-decoration: none;
  color: inherit;
}
```

- [ ] **Step 5: Run verification**

Run: `npm run build`
Expected: PASS, with the docs homepage and the two guided product pages rendering and styled.

- [ ] **Step 6: Commit**

```bash
git add src/pages/DocsHomePage.tsx src/pages/DocsPortalPage.tsx src/pages/DocsPayPage.tsx src/docs/docsContent.ts src/styles.css
git commit -m "feat: add docs home and product track pages"
```

---

### Task 4: Add Shared Trust, Security, Pricing, And Roadmap Pages

**Files:**
- Create: `src/pages/DocsTrustPage.tsx`
- Create: `src/pages/DocsSecurityPage.tsx`
- Create: `src/pages/DocsPricingPage.tsx`
- Create: `src/pages/DocsRoadmapPage.tsx`
- Modify: `src/docs/docsContent.ts`
- Modify: `README.md`
- Test: `npm run build`

- [ ] **Step 1: Add the `Trust` page**

```tsx
// src/pages/DocsTrustPage.tsx
import { DocsPageTemplate } from "@/components/DocsPageTemplate";

export function DocsTrustPage() {
  return (
    <DocsPageTemplate
      title="Trust"
      summary="Vanta makes approval boundaries, operator truth, and verification surfaces explicit."
      badge="live-now"
    >
      <section>
        <h2>Approval boundaries</h2>
        <p>Vanta emphasizes preview, approval, execution, and settlement as explicit steps rather than hidden transitions.</p>
      </section>
      <section>
        <h2>Verification surfaces</h2>
        <p>Reviewer-facing commands, status surfaces, and browser-backed checks are part of the product truth.</p>
      </section>
    </DocsPageTemplate>
  );
}
```

- [ ] **Step 2: Add the `Security` page**

```tsx
// src/pages/DocsSecurityPage.tsx
import { DocsPageTemplate } from "@/components/DocsPageTemplate";

export function DocsSecurityPage() {
  return (
    <DocsPageTemplate
      title="Security"
      summary="What Vanta protects, what remains visible, and what is still constrained today."
      badge="preview"
    >
      <section>
        <h2>Privacy model</h2>
        <p>Shielding moves supported assets into Vanta's private state. Transparent wallet balances do not become private automatically.</p>
      </section>
      <section>
        <h2>Current constraints</h2>
        <p>Vanta is not production-ready today, and the current private and merchant surfaces remain narrow or preview-oriented.</p>
      </section>
    </DocsPageTemplate>
  );
}
```

- [ ] **Step 3: Add the `Pricing` and `Roadmap` pages**

```tsx
// src/pages/DocsPricingPage.tsx
import { DocsPageTemplate } from "@/components/DocsPageTemplate";

export function DocsPricingPage() {
  return (
    <DocsPageTemplate
      title="Pricing"
      summary="Vanta's launch-stage pricing direction is simple: no monthly fee and 0.25% only when a supported action completes successfully."
      badge="forward-looking"
    >
      <section>
        <h2>Launch pricing</h2>
        <p>Network, off-ramp, and third-party execution costs remain itemized separately when they apply.</p>
      </section>
    </DocsPageTemplate>
  );
}
```

```tsx
// src/pages/DocsRoadmapPage.tsx
import { DocsPageTemplate } from "@/components/DocsPageTemplate";

export function DocsRoadmapPage() {
  return (
    <DocsPageTemplate
      title="Roadmap"
      summary="Vanta is moving merchant-first, with private settlement and trust surfaces ahead of broad expansion."
      badge="forward-looking"
    >
      <section>
        <h2>Merchant-first direction</h2>
        <p>Vanta Pay is the flagship direction, with trust packaging and premium settlement UX ahead of broader wallet expansion.</p>
      </section>
    </DocsPageTemplate>
  );
}
```

- [ ] **Step 4: Update the README route and verification sections**

```md
<!-- README.md -->
- `/docs`
- `/docs/portal`
- `/docs/pay`
- `/docs/trust`
- `/docs/security`
- `/docs/pricing`
- `/docs/roadmap`

```bash
npm run docs:verify
```
```

- [ ] **Step 5: Run verification**

Run: `npm run build`
Expected: PASS, with all first-release shared docs pages reachable through the docs route family.

- [ ] **Step 6: Commit**

```bash
git add src/pages/DocsTrustPage.tsx src/pages/DocsSecurityPage.tsx src/pages/DocsPricingPage.tsx src/pages/DocsRoadmapPage.tsx src/docs/docsContent.ts README.md
git commit -m "feat: add shared docs truth pages"
```

---

### Task 5: Add Browser-Backed Docs Verification And Package Scripts

**Files:**
- Create: `scripts/check-vanta-docs-browser.mjs`
- Modify: `package.json`
- Test: `npm run docs:browser-check`
- Test: `npm run docs:verify`

- [ ] **Step 1: Write the docs browser regression**

```js
// scripts/check-vanta-docs-browser.mjs
import { execFileSync, spawn } from "node:child_process";

const port = 4530 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForVite() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/docs`);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still booting.
    }
    await sleep(250);
  }
  throw new Error("Vanta docs dev server did not become ready for browser verification.");
}

function runBrowserBatch() {
  const steps = [
    { action: "navigate", url: `${baseUrl}/docs` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/docs" },
        { kind: "text_visible", text: "Move, send, and pay with more privacy." },
        { kind: "text_visible", text: "Vanta Portal" },
        { kind: "text_visible", text: "Vanta Pay" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/docs/pay` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Vanta Pay" },
        { kind: "text_visible", text: "Forward-looking" },
        { kind: "text_visible", text: "design-partner preview" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/docs/security` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Security" },
        { kind: "text_visible", text: "not production-ready today" },
        { kind: "text_visible", text: "do not become private automatically" },
        { kind: "no_console_errors" },
      ],
    },
  ];

  execFileSync("gsd-browser", ["batch", "--steps", JSON.stringify(steps), "--summary-only"], {
    stdio: "pipe",
  });
}
```

- [ ] **Step 2: Add package scripts**

```json
// package.json
{
  "scripts": {
    "docs:browser-check": "node scripts/check-vanta-docs-browser.mjs",
    "docs:verify": "npm run docs:browser-check && npm run build"
  }
}
```

- [ ] **Step 3: Run the browser regression**

Run: `npm run docs:browser-check`
Expected: PASS, with the homepage, `Vanta Pay`, and `Security` pages reachable and truth language visible.

- [ ] **Step 4: Run the full docs verification**

Run: `npm run docs:verify`
Expected: PASS, with browser-backed route assertions and the production build both succeeding.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-vanta-docs-browser.mjs package.json
git commit -m "test: add docs browser verification"
```

---

### Task 6: Final Truth Alignment Review Across Docs Copy And Navigation

**Files:**
- Modify: `src/pages/DocsHomePage.tsx`
- Modify: `src/pages/DocsPortalPage.tsx`
- Modify: `src/pages/DocsPayPage.tsx`
- Modify: `src/pages/DocsTrustPage.tsx`
- Modify: `src/pages/DocsSecurityPage.tsx`
- Modify: `src/pages/DocsPricingPage.tsx`
- Modify: `src/pages/DocsRoadmapPage.tsx`
- Modify: `src/styles.css`
- Test: `npm run docs:verify`

- [ ] **Step 1: Review copy against the approved docs spec**

```md
Checklist:
- homepage uses simple user language
- `Vanta Portal` and `Vanta Pay` feel like one system
- `Vanta Pay` is ambitious but not overstated
- preview/demo/control-plane truth is explicit
- no page claims production readiness or magical privacy
```

- [ ] **Step 2: Tighten any copy that drifts from repo truth**

```tsx
// Example adjustment
<p>
  Today's Pay surface is a design-partner preview and merchant control-plane surface,
  not a finished production payments network.
</p>
```

- [ ] **Step 3: Tighten any layout or badge styling that obscures status**

```css
/* src/styles.css */
.docs-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

- [ ] **Step 4: Run final verification**

Run: `npm run docs:verify`
Expected: PASS, with docs copy, navigation, badges, and truth constraints all verified through the browser regression and build.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DocsHomePage.tsx src/pages/DocsPortalPage.tsx src/pages/DocsPayPage.tsx src/pages/DocsTrustPage.tsx src/pages/DocsSecurityPage.tsx src/pages/DocsPricingPage.tsx src/pages/DocsRoadmapPage.tsx src/styles.css
git commit -m "chore: polish docs truth and presentation"
```

---

## Self-Review

### Spec coverage

- `Docs Home`, `Vanta Portal`, `Vanta Pay`, `Trust`, `Security`, `Pricing`, and `Roadmap` are all covered in Tasks 3 and 4.
- The `/docs/*` route family and dedicated `DocsLayout` are covered in Task 1.
- Typed content modules, badges, and shared docs shell behavior are covered in Task 2.
- Browser-backed verification and truthful copy checks are covered in Tasks 5 and 6.

### Placeholder scan

- No `TBD`, `TODO`, or deferred “implement later” plan steps remain.
- Every task includes explicit file paths, commands, and example code.

### Type consistency

- `DocsTrack`, `DocsBadge`, and `DocsPageMeta` are defined once in `src/docs/docsContent.ts` and reused across components and pages.
- `DocsLayout`, `DocsSidebar`, `DocsPageTemplate`, and `DocsStatusBadge` are referenced consistently across the route and page tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-23-vanta-docs-site.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

# Strategy Layout Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/app/strategy` visually align with the existing in-app tab shell without changing Strategy behavior, validation, or preview-only truth.

**Architecture:** Keep Strategy's current planner, form, and result logic intact. Add one targeted contract check in the existing Strategy verification script, then make the smallest markup and CSS changes needed so Strategy participates in the shared shell/layout conventions that already shape adjacent tabs.

**Tech Stack:** React, TypeScript, Vite, repo-native Node verification scripts, CSS

---

### Task 1: Lock the Layout Contract with a Failing Verification Check

**Files:**
- Modify: `scripts/check-vanta-strategy-tab-copy.mjs`
- Test: `scripts/check-vanta-strategy-tab-copy.mjs`

- [ ] **Step 1: Write the failing check for shared Strategy shell participation**

Add these assertions near the existing `failures` collection in `scripts/check-vanta-strategy-tab-copy.mjs`:

```js
const stylesSource = readFileSync(resolve(repoRoot, "src/styles.css"), "utf8");

if (
  !stylesSource.includes(".app-shell:has(.strategy-page)") ||
  !stylesSource.includes(".app-content:has(.strategy-page)") ||
  !stylesSource.includes(".strategy-page,\n.send-page")
) {
  failures.push("Strategy page must participate in the shared app shell layout selectors.");
}

if (stylesSource.includes(".strategy-page {\n  padding: 22px 0 44px;\n}")) {
  failures.push("Strategy page must not keep the bespoke standalone page padding contract.");
}
```

Also add the source load near the top of the file:

```js
const stylesSource = readFileSync(resolve(repoRoot, "src/styles.css"), "utf8");
```

- [ ] **Step 2: Run the targeted check to verify it fails**

Run: `npm run strategy-tab:copy-check`

Expected: FAIL with a message that Strategy is missing shared shell layout participation or is still using bespoke standalone page padding.

- [ ] **Step 3: Commit the failing-test checkpoint**

```bash
git add scripts/check-vanta-strategy-tab-copy.mjs
git commit -m "test: require strategy shared shell layout"
```

### Task 2: Align Strategy Markup and CSS with the Existing Tab Rhythm

**Files:**
- Modify: `src/pages/StrategyPage.tsx`
- Modify: `src/styles.css`
- Test: `scripts/check-vanta-strategy-tab-copy.mjs`

- [ ] **Step 1: Make the Strategy header read like a module intro instead of a standalone hero**

Update the top-level Strategy markup in `src/pages/StrategyPage.tsx` so the header content is structurally grouped and easier to style like the other tab tops:

```tsx
<section className="strategy-page" aria-labelledby="strategy-title">
  <div className="strategy-shell">
    <header className="strategy-header">
      <div className="strategy-header__copy">
        <span className="strategy-kicker">Execution</span>
        <h1 id="strategy-title">Strategy</h1>
        <p>{modeCopy}</p>
      </div>
    </header>

    <div className="strategy-main">
```

This replaces the current two-column header block:

```tsx
<header className="strategy-header">
  <div>
    <span className="strategy-kicker">Execution</span>
    <h1 id="strategy-title">Strategy</h1>
  </div>
  <p>{modeCopy}</p>
</header>
```

- [ ] **Step 2: Extend the shared shell selectors to include Strategy**

Update the existing shared shell selectors in `src/styles.css` so Strategy is included anywhere Send/Shield already compress the app frame:

```css
.app-shell:has(.shield-page),
.app-shell:has(.send-page),
.app-shell:has(.strategy-page) {
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 20px;
}

.app-shell:has(.shield-page) .app-sidebar,
.app-shell:has(.send-page) .app-sidebar,
.app-shell:has(.strategy-page) .app-sidebar {
  gap: 14px;
  justify-content: flex-start;
  padding: 14px 10px;
}

.app-shell:has(.shield-page) .app-sidebar__nav,
.app-shell:has(.send-page) .app-sidebar__nav,
.app-shell:has(.strategy-page) .app-sidebar__nav {
  gap: 8px;
}

.app-shell:has(.shield-page) .app-link,
.app-shell:has(.send-page) .app-link,
.app-shell:has(.strategy-page) .app-link {
  min-height: 56px;
  padding: 10px 8px;
  justify-content: center;
  text-align: center;
}

.app-shell:has(.shield-page) .app-link small,
.app-shell:has(.send-page) .app-link small,
.app-shell:has(.strategy-page) .app-link small {
  display: none;
}

.app-shell:has(.shield-page) .app-link span,
.app-shell:has(.send-page) .app-link span,
.app-shell:has(.strategy-page) .app-link span {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1.25;
}

.app-content:has(.shield-page),
.app-content:has(.send-page),
.app-content:has(.strategy-page) {
  padding-top: 0;
}

.shield-page,
.send-page,
.strategy-page {
  padding-top: 0;
}
```

- [ ] **Step 3: Remove the bespoke Strategy top-level posture**

Replace the top-level Strategy-only layout rules in `src/styles.css` with a more compact module-style version:

```css
.strategy-page {
  padding: 0 0 44px;
}

.strategy-shell {
  display: grid;
  gap: 14px;
}

.strategy-header {
  display: block;
  padding: 18px 20px;
  border-radius: 24px;
}

.strategy-header__copy {
  display: grid;
  gap: 10px;
  max-width: 720px;
}

.strategy-header h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 0.96;
}

.strategy-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.strategy-card--primary {
  gap: 18px;
  max-width: none;
  margin: 0;
  width: 100%;
}
```

Keep the existing Strategy-specific form, card, and preview styles below these rules unless they directly conflict with the new shell posture.

- [ ] **Step 4: Run the targeted check to verify it now passes**

Run: `npm run strategy-tab:copy-check`

Expected: PASS

- [ ] **Step 5: Commit the layout alignment change**

```bash
git add src/pages/StrategyPage.tsx src/styles.css scripts/check-vanta-strategy-tab-copy.mjs
git commit -m "feat: align strategy layout with app tabs"
```

### Task 3: Run Honest App-Level Verification

**Files:**
- Test: `package.json`
- Test: `scripts/check-vanta-strategy-tab-copy.mjs`
- Test: `src/pages/StrategyPage.tsx`
- Test: `src/styles.css`

- [ ] **Step 1: Re-run the focused Strategy verification**

Run: `npm run strategy-tab:copy-check`

Expected: PASS

- [ ] **Step 2: Run the app build**

Run: `npm run build`

Expected: PASS with Vite production build output and no TypeScript errors.

- [ ] **Step 3: Review the diff for accidental product or copy changes**

Run: `git diff -- src/pages/StrategyPage.tsx src/styles.css scripts/check-vanta-strategy-tab-copy.mjs`

Expected: only layout-structure and CSS selector changes, plus the new layout contract assertions in the check script.

- [ ] **Step 4: Commit the verification checkpoint**

```bash
git add src/pages/StrategyPage.tsx src/styles.css scripts/check-vanta-strategy-tab-copy.mjs
git commit -m "test: verify strategy layout alignment"
```

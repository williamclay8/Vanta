import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const appLayout = read("src/components/AppLayout.tsx");
const styles = read("src/styles.css");
const packageJson = JSON.parse(read("package.json"));
const review = read("VANTA_ZK_REVIEW.md");

const failures = [];

function requireIncludes(source, marker, message) {
  if (!source.includes(marker)) {
    failures.push(message);
  }
}

function requireMatches(source, pattern, message) {
  if (!pattern.test(source)) {
    failures.push(message);
  }
}

function requireSectionIncludes(source, sectionPattern, marker, message) {
  const match = source.match(sectionPattern);
  if (!match?.[0]?.includes(marker)) {
    failures.push(message);
  }
}

function requireSectionExcludes(source, sectionPattern, marker, message) {
  const match = source.match(sectionPattern);
  if (!match?.[0] || match[0].includes(marker)) {
    failures.push(message);
  }
}

requireIncludes(
  review,
  "Strategy and Pay live in More until they're ready to be promoted",
  "VANTA_ZK_REVIEW.md must retain the AppLayout More-menu recommendation.",
);

requireIncludes(
  appLayout,
  "const appLinks = [",
  "AppLayout must keep a primary appLinks list.",
);
requireIncludes(
  appLayout,
  "const moreAppLinks = [",
  "AppLayout must keep a separate moreAppLinks list for preview/developer surfaces.",
);

for (const marker of [
  '{ to: "/app/shield", label: "Shield", action: "Add funds", end: false }',
  '{ to: "/app/send", label: "Send", action: "Send shielded", end: false }',
  '{ to: "/app/swap", label: "Swap", action: "Swap shielded", end: false }',
  '{ to: "/app/unshield", label: "Unshield", action: "Move out", end: false }',
]) {
  requireSectionIncludes(
    appLayout,
    /const appLinks = \[[\s\S]*?\];/u,
    marker,
    `Primary appLinks must include ${marker}.`,
  );
}

for (const marker of [
  '{ to: "/app/pay", label: "Pay", action: "Get paid", end: false }',
  '{ to: "/app/strategy", label: "Strategy", action: "Plan trades", end: false }',
  '{ to: "/app/settings/recovery", label: "Recovery", action: "Keys & records", end: false }',
  '{ to: "/app/launch", label: "Launch", action: "Coming soon", end: false }',
]) {
  requireSectionIncludes(
    appLayout,
    /const moreAppLinks = \[[\s\S]*?\];/u,
    marker,
    `moreAppLinks must include ${marker}.`,
  );
}

requireSectionExcludes(
  appLayout,
  /const appLinks = \[[\s\S]*?\];/u,
  "/app/pay",
  "Pay must not be a primary appLink.",
);
requireSectionExcludes(
  appLayout,
  /const appLinks = \[[\s\S]*?\];/u,
  "/app/strategy",
  "Strategy must not be a primary appLink.",
);
requireIncludes(
  appLayout,
  "activeMoreLink ? \"app-header__tab--active\" : null",
  "More trigger must expose active state when Pay, Strategy, or Launch is current.",
);
requireIncludes(
  appLayout,
  'role="menu"',
  "More flyout must expose menu semantics.",
);
requireIncludes(
  appLayout,
  'role="menuitem"',
  "More flyout links must expose menuitem semantics.",
);
requireIncludes(
  appLayout,
  'aria-haspopup="menu"',
  "More trigger must advertise menu behavior.",
);
requireIncludes(
  appLayout,
  'aria-expanded={moreMenuOpen}',
  "More trigger must expose expanded state.",
);
requireIncludes(
  appLayout,
  'event.key === "Escape"',
  "More menu must close on Escape.",
);

for (const marker of [
  ".app-header__more",
  ".app-header__more-menu",
  ".app-header__more-item",
  ".app-header__more-item--active",
  "grid-template-columns: repeat(5, minmax(0, 1fr))",
]) {
  requireIncludes(styles, marker, `styles.css must include ${marker}.`);
}

requireIncludes(
  packageJson.scripts?.["app:layout-nav-check"] ?? "",
  "node scripts/check-vanta-app-layout-nav.mjs",
  "package.json must expose app:layout-nav-check.",
);
requireIncludes(
  packageJson.scripts?.["truth:privacy-claim-gate"] ?? "",
  "npm run app:layout-nav-check",
  "truth:privacy-claim-gate must include the AppLayout nav truth guard.",
);

if (failures.length > 0) {
  console.error("Vanta AppLayout nav guard: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta AppLayout nav guard: PASS");

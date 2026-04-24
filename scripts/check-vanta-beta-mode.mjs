import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const files = {
  appLayout: read("src/components/AppLayout.tsx"),
  betaMode: read("src/config/deploymentMode.ts"),
  docs: read("docs/beta-mode-deployment.md"),
  pay: read("src/pages/PayPage.tsx"),
  suspendScript: read("scripts/suspend-vanta-render-production-services.mjs"),
  send: read("src/pages/SendPage.tsx"),
  shield: read("src/pages/ShieldPage.tsx"),
  strategy: read("src/pages/StrategyPage.tsx"),
  styles: read("src/styles.css"),
  swap: read("src/pages/SwapPage.tsx"),
  unshield: read("src/pages/UnshieldPage.tsx"),
};

const failures = [];

function requireIncludes(fileKey, needle, message) {
  if (!files[fileKey].includes(needle)) {
    failures.push(message);
  }
}

function requirePattern(fileKey, pattern, message) {
  if (!pattern.test(files[fileKey])) {
    failures.push(message);
  }
}

requireIncludes(
  "betaMode",
  "VITE_VANTA_DEPLOYMENT_MODE",
  "deploymentMode.ts must read VITE_VANTA_DEPLOYMENT_MODE.",
);
requireIncludes(
  "betaMode",
  'deploymentMode === "beta"',
  "deploymentMode.ts must expose beta mode detection.",
);
requireIncludes(
  "appLayout",
  "Vanta Beta",
  "AppLayout must render a global Vanta Beta banner.",
);
requireIncludes(
  "appLayout",
  "No funds move in this mode",
  "Beta banner must clearly say no funds move.",
);
requireIncludes(
  "styles",
  ".beta-mode-banner",
  "styles.css must include beta banner styling.",
);
requireIncludes(
  "docs",
  "VITE_VANTA_DEPLOYMENT_MODE=beta",
  "Beta deployment docs must include the beta environment flag.",
);
requireIncludes(
  "docs",
  "POST /v1/services/{serviceId}/suspend",
  "Beta deployment docs must record the Render suspend endpoint.",
);
requireIncludes(
  "docs",
  "npm run mainnet:private-pool-v2-production-smoke-live",
  "Beta deployment docs must require production smoke before production mode.",
);
requireIncludes(
  "suspendScript",
  "srv-d7jfqru7r5hc73b6oelg",
  "Render suspend helper must include the production indexer service.",
);
requireIncludes(
  "suspendScript",
  "https://api.render.com/v1/services",
  "Render suspend helper must call the Render service API.",
);
requireIncludes(
  "suspendScript",
  "--apply",
  "Render suspend helper must default away from mutating services unless --apply is present.",
);

for (const page of ["shield", "send", "swap", "strategy", "unshield", "pay"]) {
  requireIncludes(
    page,
    "isBetaMode",
    `${page} page must import/use isBetaMode for live-action gating.`,
  );
  requireIncludes(
    page,
    "Beta mode",
    `${page} page must show beta-mode action copy instead of silently failing.`,
  );
}

for (const page of ["shield", "send", "swap", "strategy", "unshield"]) {
  requirePattern(
    page,
    /disabled=\{\s*isBetaMode/u,
    `${page} primary action must be disabled in beta mode.`,
  );
}

for (const needle of ["Pay with Vanta"]) {
  if (!files.pay.includes(`isBetaMode ? "Beta mode"`)) {
    failures.push("Pay page primary actions must render beta-mode button copy.");
    break;
  }

  if (!files.pay.includes(needle)) {
    failures.push(`Pay page must preserve ${needle} copy for production mode.`);
  }
}

if (failures.length > 0) {
  console.error("vanta beta mode check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("vanta beta mode check: PASS");

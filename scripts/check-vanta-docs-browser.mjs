import { execFileSync, spawn } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const port = 5530 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const repoRoot = path.resolve(import.meta.dirname, "..");
const expectedPrimaryNavSections = [
  "portal",
  "pay",
  "trust",
  "security",
  "roadmap",
];

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function assertDocsHomeFlowDiagramSource() {
  const docsHomeSource = readFileSync(path.join(repoRoot, "src/pages/DocsHomePage.tsx"), "utf8");
  const stylesSource = readFileSync(path.join(repoRoot, "src/styles.css"), "utf8");

  for (const requiredSnippet of [
    "data-docs-flow-diagram",
    'data-docs-flow-node="start-public"',
    'data-docs-flow-node="shield-into-vanta"',
    'data-docs-flow-node="create-receipt"',
    'data-docs-flow-node="counterparty-verify"',
    'data-docs-flow-arrow="start-to-shield"',
    'data-docs-flow-arrow="shield-to-receipt"',
    'data-docs-flow-arrow="receipt-to-verify"',
    "Public chain",
    "Trust packet",
    "Counterparty review",
  ]) {
    assert.ok(
      docsHomeSource.includes(requiredSnippet),
      `Docs home source must include inline flow diagram snippet: ${requiredSnippet}`,
    );
  }

  for (const requiredSnippet of [
    ".docs-home__flow-diagram",
    ".docs-home__flow-node",
    ".docs-home__flow-arrow",
    ".docs-home__flow-path",
  ]) {
    assert.ok(
      stylesSource.includes(requiredSnippet),
      `Docs CSS must include inline flow diagram style snippet: ${requiredSnippet}`,
    );
  }
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

  throw new Error("Vanta dev server did not become ready for docs browser verification.");
}

function runBrowserBatch() {
  const steps = [
    { action: "navigate", url: `${baseUrl}/docs` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/docs" },
        { kind: "selector_visible", selector: ".docs-shell" },
        { kind: "selector_visible", selector: "[data-docs-header]" },
        { kind: "selector_visible", selector: '[data-docs-header-nav]' },
        { kind: "selector_visible", selector: '[data-docs-header-cta]' },
        { kind: "selector_visible", selector: '[data-docs-open-app-cta]' },
        { kind: "selector_visible", selector: ".docs-home__hero" },
        { kind: "selector_visible", selector: ".docs-home__hero-note" },
        { kind: "selector_visible", selector: "[data-docs-plain-strip]" },
        { kind: "selector_visible", selector: "[data-docs-flow-diagram]" },
        { kind: "selector_visible", selector: '[data-docs-flow-node="start-public"]' },
        { kind: "selector_visible", selector: '[data-docs-flow-node="shield-into-vanta"]' },
        { kind: "selector_visible", selector: '[data-docs-flow-node="create-receipt"]' },
        { kind: "selector_visible", selector: '[data-docs-flow-node="counterparty-verify"]' },
        { kind: "selector_visible", selector: '[data-docs-flow-arrow="start-to-shield"]' },
        { kind: "selector_visible", selector: '[data-docs-flow-arrow="shield-to-receipt"]' },
        { kind: "selector_visible", selector: '[data-docs-flow-arrow="receipt-to-verify"]' },
        { kind: "selector_visible", selector: ".docs-path-card" },
        { kind: "text_visible", text: "Vanta makes Solana activity less public." },
        { kind: "text_visible", text: "Start public" },
        { kind: "text_visible", text: "Shield into Vanta" },
        { kind: "text_visible", text: "Create a receipt" },
        { kind: "text_visible", text: "Let the counterparty verify" },
        { kind: "text_visible", text: "Public chain" },
        { kind: "text_visible", text: "Trust packet" },
        { kind: "text_visible", text: "Counterparty review" },
        { kind: "text_visible", text: "Who it helps" },
        { kind: "text_visible", text: "The same privacy idea serves users and merchants." },
        { kind: "text_visible", text: "Vanta Portal" },
        { kind: "text_visible", text: "Vanta Pay" },
        { kind: "text_visible", text: "Trust pages" },
        { kind: "text_visible", text: "The useful part is simple." },
        ...expectedPrimaryNavSections.map((section) => ({
          kind: "selector_visible",
          selector: `[data-docs-topnav-link="${section}"]`,
        })),
        { kind: "selector_hidden", selector: '[data-docs-topnav-link="pricing"]' },
        { kind: "selector_hidden", selector: '[data-docs-sidebar-link="pricing"]' },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: '[data-docs-topnav-link="portal"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/docs/portal" },
        { kind: "selector_visible", selector: '[data-docs-topnav-link="portal"]' },
        { kind: "selector_visible", selector: '[data-docs-sidebar-link="portal"]' },
        { kind: "selector_visible", selector: '[data-docs-badge="preview"]' },
        { kind: "selector_visible", selector: "[data-docs-read-first]" },
        { kind: "text_visible", text: "Start here" },
        { kind: "text_visible", text: "Preview" },
        { kind: "text_visible", text: "Vanta Portal" },
        { kind: "text_visible", text: "What Vanta Portal is" },
        { kind: "text_visible", text: "Current status" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: '[data-docs-topnav-link="pay"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/docs/pay" },
        { kind: "selector_visible", selector: '[data-docs-badge="forward-looking"]' },
        { kind: "text_visible", text: "Forward-looking" },
        { kind: "text_visible", text: "Vanta Pay" },
        { kind: "text_visible", text: "What Vanta Pay is" },
        { kind: "text_visible", text: "Payment work in one place" },
        { kind: "text_visible", text: "Clear payment records" },
        { kind: "text_visible", text: "Today, Pay is a preview." },
        { kind: "text_visible", text: "payment request path" },
        { kind: "selector_hidden", selector: '[data-docs-topnav-link="pricing"]' },
        { kind: "selector_hidden", selector: '[data-docs-sidebar-link="pricing"]' },
        { kind: "text_hidden", text: "0 monthly fee" },
        { kind: "text_hidden", text: "0.25%" },
        { kind: "text_hidden", text: "Success fee" },
        { kind: "text_hidden", text: "Monthly fee" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: '[data-docs-topnav-link="trust"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/docs/trust" },
        { kind: "selector_visible", selector: '[data-docs-badge="live-now"]' },
        { kind: "text_visible", text: "Truth surface" },
        { kind: "text_visible", text: "Trust" },
        { kind: "text_visible", text: "Trust comes from legibility, not overclaiming." },
        { kind: "text_visible", text: "Read the security limits" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: '[data-docs-topnav-link="security"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/docs/security" },
        { kind: "selector_visible", selector: '[data-docs-badge="live-now"]' },
        { kind: "text_visible", text: "Truth surface" },
        { kind: "text_visible", text: "Security" },
        { kind: "text_visible", text: "Privacy model" },
        { kind: "text_visible", text: "Current constraints" },
        { kind: "text_visible", text: "production-ready" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: '[data-docs-topnav-link="roadmap"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/docs/roadmap" },
        { kind: "selector_visible", selector: "[data-docs-header]" },
        { kind: "selector_visible", selector: '[data-docs-header-nav]' },
        { kind: "selector_visible", selector: ".docs-shell__content" },
        { kind: "selector_visible", selector: '[data-docs-sidebar-link="roadmap"]' },
        { kind: "selector_visible", selector: '[data-docs-badge="forward-looking"]' },
        { kind: "text_visible", text: "Forward-looking" },
        { kind: "text_visible", text: "Roadmap" },
        { kind: "text_visible", text: "Merchant-first direction" },
        { kind: "text_visible", text: "How Portal and Pay connect" },
        { kind: "no_console_errors" },
      ],
    },
  ];

  execFileSync("gsd-browser", ["batch", "--steps", JSON.stringify(steps), "--summary-only"], {
    stdio: "pipe",
  });
}

function cleanupBrowserLock() {
  try {
    execFileSync("pkill", ["-f", "Google Chrome for Testing"], {
      stdio: "ignore",
    });
  } catch {
    // Chrome may already be stopped.
  }

  try {
    rmSync(path.join(os.tmpdir(), "chromiumoxide-runner"), {
      force: true,
      recursive: true,
    });
  } catch {
    // The temp runner directory may already be gone.
  }

  try {
    execFileSync("gsd-browser", ["daemon", "stop"], { stdio: "ignore" });
  } catch {
    // The daemon may already be stopped.
  }
}

function runBrowserBatchWithRetry() {
  try {
    runBrowserBatch();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes("daemon exited during startup")) {
      throw error;
    }

    cleanupBrowserLock();
    runBrowserBatch();
  }
}

const vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  env: {
    ...process.env,
    VITE_VANTA_DEPLOYMENT_MODE: "beta",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let stdout = "";
let stderr = "";
vite.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
vite.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

try {
  assertDocsHomeFlowDiagramSource();
  await waitForVite();
  runBrowserBatchWithRetry();
  console.log("vanta docs browser check: PASS");
} catch (error) {
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (vite.exitCode === null) {
    await new Promise((resolvePromise) => {
      vite.once("close", resolvePromise);
      vite.kill("SIGTERM");
    });
  }

  try {
    execFileSync("gsd-browser", ["daemon", "stop"], { stdio: "ignore" });
  } catch {
    // The daemon may already be stopped.
  }
}

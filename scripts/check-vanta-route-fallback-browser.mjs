import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const port = 5730 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;

function readRepoFile(relativePath) {
  return readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

const appSource = readRepoFile("src/App.tsx");
const notFoundSource = readRepoFile("src/pages/NotFoundPage.tsx");
const errorBoundarySource = readRepoFile("src/components/RouteErrorBoundary.tsx");
const stylesSource = readRepoFile("src/styles.css");
const packageJson = JSON.parse(readRepoFile("package.json"));

assert.equal(
  packageJson.scripts["route:fallback-browser-check"],
  "node scripts/check-vanta-route-fallback-browser.mjs",
  "package.json must expose route:fallback-browser-check.",
);
assert.ok(appSource.includes("RouteErrorBoundary"), "App must wrap routes in RouteErrorBoundary.");
assert.ok(appSource.includes("NotFoundPage"), "App must import the truthful NotFoundPage.");
assert.ok(
  !appSource.includes('<Route path="*" element={<Navigate to="/app/shield" replace />} />'),
  "Unknown global routes must not redirect users into /app/shield.",
);
assert.ok(
  appSource.includes('<Route path="*" element={<NotFoundPage surface="docs" />} />'),
  "Unknown docs routes must render a truthful docs NotFoundPage.",
);
assert.ok(
  appSource.includes('<Route path="*" element={<NotFoundPage surface="app" />} />'),
  "Unknown app routes must render a truthful app NotFoundPage.",
);
assert.ok(
  appSource.includes('<Route path="*" element={<NotFoundPage surface="site" />} />'),
  "Unknown global routes must render a truthful site NotFoundPage.",
);
assert.ok(
  errorBoundarySource.includes("Something went wrong") &&
    errorBoundarySource.includes("production privacy is not enabled") &&
    errorBoundarySource.includes("componentDidCatch") &&
    errorBoundarySource.includes("useLocation"),
  "Route error boundary must expose claim-safe recovery copy and reset by location.",
);

for (const phrase of [
  "Page not found",
  "Nothing moved",
  "Beta routes are visible, but production privacy is not enabled.",
  "/docs/security",
  "/docs/trust",
  "/app/shield",
]) {
  assert.ok(notFoundSource.includes(phrase), `NotFoundPage must include phrase/ref: ${phrase}`);
}

for (const banned of ["anonymous", "untraceable", "fully private", "production-ready"]) {
  assert.ok(!notFoundSource.toLowerCase().includes(banned), `NotFoundPage must not include ${banned}.`);
  assert.ok(!errorBoundarySource.toLowerCase().includes(banned), `RouteErrorBoundary must not include ${banned}.`);
}

for (const selector of [
  ".route-fallback",
  ".route-fallback__actions",
  ".route-error-boundary",
]) {
  assert.ok(stylesSource.includes(selector), `src/styles.css must include ${selector}.`);
}

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

  throw new Error("Vanta dev server did not become ready for route fallback verification.");
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

function runBrowserBatch() {
  const steps = [
    { action: "navigate", url: `${baseUrl}/unknown-vanta-route` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/unknown-vanta-route" },
        { kind: "selector_visible", selector: ".route-fallback" },
        { kind: "text_visible", text: "Page not found" },
        { kind: "text_visible", text: "Nothing moved" },
        { kind: "text_visible", text: "Read security limits" },
        { kind: "text_visible", text: "Start with Shield" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/not-a-real-lane` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/not-a-real-lane" },
        { kind: "selector_visible", selector: ".app-header" },
        { kind: "selector_visible", selector: ".system-status-strip" },
        { kind: "selector_visible", selector: ".route-fallback" },
        { kind: "text_visible", text: "Page not found" },
        { kind: "text_visible", text: "Beta routes are visible, but production privacy is not enabled." },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/docs/not-a-real-page` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/docs/not-a-real-page" },
        { kind: "selector_visible", selector: ".docs-shell" },
        { kind: "selector_visible", selector: ".route-fallback" },
        { kind: "text_visible", text: "Page not found" },
        { kind: "text_visible", text: "Read security limits" },
        { kind: "no_console_errors" },
      ],
    },
  ];

  execFileSync("gsd-browser", ["batch", "--steps", JSON.stringify(steps), "--summary-only"], {
    stdio: "pipe",
  });
}

function runBrowserBatchWithRetry() {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      runBrowserBatch();
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);

      if (
        !message.includes("daemon exited during startup") &&
        !message.includes("daemon did not start within")
      ) {
        throw error;
      }

      cleanupBrowserLock();
      execFileSync("sleep", [String(0.5 + attempt * 0.5)], { stdio: "ignore" });
    }
  }

  throw lastError;
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
  await waitForVite();
  runBrowserBatchWithRetry();
  console.log("vanta route fallback browser check: PASS");
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

import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const port = 5630 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const browserSession = `vanta-product-ui-check-${process.pid}-${Date.now()}`;

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
    { action: "navigate", url: baseUrl },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/" },
        { kind: "selector_visible", selector: ".landing-nav" },
        { kind: "selector_visible", selector: ".landing-minimal__grid" },
        { kind: "text_visible", text: "Privacy rails for" },
        { kind: "text_visible", text: "Docs" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/docs` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: ".docs-shell" },
        { kind: "selector_visible", selector: "[data-docs-header]" },
        { kind: "selector_visible", selector: ".docs-home__hero" },
        { kind: "text_visible", text: "Move, send, and pay with more privacy." },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/send` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: ".app-header" },
        { kind: "selector_visible", selector: ".app-header__tabs[data-product-nav]" },
        { kind: "selector_visible", selector: ".app-sidebar" },
        { kind: "text_visible", text: "Send" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/app/shield"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/shield" },
        { kind: "text_visible", text: "Shield" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/app/swap"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/swap" },
        { kind: "text_visible", text: "Private Swap" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/app/strategy"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/strategy" },
        { kind: "text_visible", text: "Strategy" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/app/unshield"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/unshield" },
        { kind: "text_visible", text: "Unshield" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/app/pay"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/pay" },
        { kind: "text_visible", text: "Pay" },
        { kind: "no_console_errors" },
      ],
    },
  ];

  execFileSync("gsd-browser", ["--session", browserSession, "batch", "--steps", JSON.stringify(steps), "--summary-only"], {
    stdio: "pipe",
  });

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
  await waitForVite();
  runBrowserBatchWithRetry();
  console.log("vanta product ui browser check: PASS");
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

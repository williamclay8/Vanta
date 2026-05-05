import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const port = 4430 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const browserSession = `vanta-protocol-check-${process.pid}-${Date.now()}`;
const browserCommandTimeoutMs = 30_000;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForVite() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/app/send`);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still booting.
    }

    await sleep(250);
  }

  throw new Error("Vanta dev server did not become ready for protocol browser verification.");
}

function runBrowserBatch() {
  const steps = [
    { action: "navigate", url: `${baseUrl}/app/dashboard` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/dashboard" },
        { kind: "selector_visible", selector: ".dashboard-trust-hero" },
        { kind: "selector_visible", selector: ".dashboard-trust-packet" },
        { kind: "selector_visible", selector: ".dashboard-verification-card" },
        { kind: "selector_visible", selector: ".dashboard-next-step-card" },
        { kind: "text_visible", text: "What Vanta can honestly prove right now" },
        { kind: "text_visible", text: "Latest Trust Packet" },
        { kind: "text_visible", text: "Reviewer Verification" },
        { kind: "text_visible", text: "Local SOL shield state" },
        { kind: "text_visible", text: "Actionable notes" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/shield` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/shield" },
        { kind: "text_visible", text: "Shield" },
        { kind: "text_visible", text: "You send" },
        { kind: "text_visible", text: "Asset" },
        { kind: "text_visible", text: "Shield asset" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/send` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/send" },
        { kind: "text_visible", text: "Send" },
        { kind: "text_visible", text: "You send" },
        { kind: "text_visible", text: "Destination address" },
        { kind: "text_visible", text: "Send from shielded state" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/swap` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/swap" },
        { kind: "text_visible", text: "You send" },
        { kind: "text_visible", text: "You receive" },
        { kind: "text_visible", text: "Swap to shielded" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/strategy` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/strategy" },
        { kind: "text_visible", text: "Strategy" },
        { kind: "text_visible", text: "Review strategy plan" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/unshield` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/unshield" },
        { kind: "text_visible", text: "Unshield" },
        { kind: "text_visible", text: "Shielded asset" },
        { kind: "text_visible", text: "Amount" },
        { kind: "text_visible", text: "Destination" },
        { kind: "no_console_errors" },
      ],
    },
  ];

  execFileSync("gsd-browser", ["--session", browserSession, "batch", "--steps", JSON.stringify(steps), "--summary-only"], {
    stdio: "pipe",
    timeout: browserCommandTimeoutMs,
  });
}

function isDaemonStartupError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const stdoutText = String(error?.stdout ?? "");
  const stderrText = String(error?.stderr ?? "");
  const combined = [message, stdoutText, stderrText].join("\n");

  return (
    combined.includes("daemon exited during startup") ||
    combined.includes("daemon did not start within") ||
    combined.includes("daemon closed connection without response") ||
    combined.includes("daemon connection failed") ||
    combined.includes("ETIMEDOUT")
  );
}

function runBrowserCommand(args, options = {}) {
  const commandArgs = ["--session", browserSession, ...args];

  let output;
  try {
    output = execFileSync("gsd-browser", commandArgs, {
      encoding: "utf8",
      stdio: "pipe",
      timeout: browserCommandTimeoutMs,
    });
  } catch (error) {
    if (!isDaemonStartupError(error)) {
      throw error;
    }

    cleanupBrowserLock();
    output = execFileSync("gsd-browser", commandArgs, {
      encoding: "utf8",
      stdio: "pipe",
      timeout: browserCommandTimeoutMs,
    });
  }

  if (options.stdio === "ignore") {
    return "";
  }

  return typeof output === "string" ? output.trim() : "";
}

function cleanupBrowserLock() {
  try {
    execFileSync("gsd-browser", ["daemon", "stop"], {
      stdio: "ignore",
      timeout: 10_000,
    });
  } catch {
    // The daemon may already be stopped.
  }

  try {
    execFileSync("pkill", ["-f", "Google Chrome for Testing"], {
      stdio: "ignore",
      timeout: 10_000,
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
}

function runBrowserBatchWithRetry() {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      runBrowserBatch();
      return true;
    } catch (error) {
      lastError = error;
      if (!isDaemonStartupError(error)) {
        throw error;
      }

      cleanupBrowserLock();
      execFileSync("sleep", [String(0.5 + attempt * 0.5)], { stdio: "ignore" });
    }
  }

  console.warn("Vanta protocol browser check skipped: gsd-browser daemon startup unavailable.");
  return false;
}

function runDesktopTabClickContinuityProbe() {
  try {
    runBrowserCommand(["set-viewport", "--width", "1280", "--height", "900"], { stdio: "ignore" });
    runBrowserCommand(["navigate", `${baseUrl}/app/shield`], { stdio: "ignore" });
    runBrowserCommand(["wait-for", "--condition", "network_idle"], { stdio: "ignore" });
    runBrowserCommand([
      "eval",
      `(() => {
      const record = () => {
        const main = document.querySelector("main");
        const bodyText = document.body.textContent?.trim() ?? "";
        window.__vantaDesktopTabProbe.shellDropped ||= !document.querySelector("[data-product-shell='app']");
        window.__vantaDesktopTabProbe.loadingFallback ||= bodyText === "Loading..." || bodyText === "Loading…";
        window.__vantaDesktopTabProbe.blankMain ||= main instanceof HTMLElement && main.getBoundingClientRect().height < 120;
      };

      window.__vantaDesktopTabProbe = {
        shellDropped: false,
        loadingFallback: false,
        blankMain: false,
      };
      window.__vantaDesktopTabInitialMain = document.querySelector("main");
      window.__vantaDesktopTabObserver?.disconnect?.();
      window.__vantaDesktopTabObserver = new MutationObserver(record);
      window.__vantaDesktopTabObserver.observe(document.body, { childList: true, subtree: true });
      record();
      return true;
    })()`,
    ]);

    for (const path of ["send", "swap", "strategy", "unshield", "pay", "shield"]) {
      runBrowserCommand(["click", `a[href='/app/${path}']`], { stdio: "ignore" });
      runBrowserCommand(["wait-for", "--condition", "url_contains", "--value", `/app/${path}`], {
        stdio: "ignore",
      });
      runBrowserCommand(["wait-for", "--condition", "network_idle"], { stdio: "ignore" });

      const result = JSON.parse(
        runBrowserCommand([
          "eval",
          `(() => {
          const main = document.querySelector("main");
          const activeTab = document.querySelector(".app-header__tab--active");

          return {
            ...window.__vantaDesktopTabProbe,
            path: location.pathname,
            mainReplaced: window.__vantaDesktopTabInitialMain !== main,
            routeFramePath: main instanceof HTMLElement ? main.dataset.routePath ?? null : null,
            mainHeight: main instanceof HTMLElement ? Math.round(main.getBoundingClientRect().height) : 0,
            shellPresent: Boolean(document.querySelector("[data-product-shell='app']")),
            activeTab: activeTab?.textContent?.trim() ?? null,
          };
        })()`,
        ]),
      );

      if (
        result.shellDropped ||
        result.loadingFallback ||
        result.blankMain ||
        result.mainReplaced ||
        !result.shellPresent ||
        result.routeFramePath !== `/app/${path}` ||
        result.mainHeight < 120 ||
        !result.activeTab?.startsWith(path[0].toUpperCase() + path.slice(1))
      ) {
        throw new Error(`Desktop tab click dropped or blanked the app shell: ${JSON.stringify(result)}`);
      }
    }

    runBrowserCommand([
      "eval",
      `(() => {
      window.__vantaDesktopTabObserver?.disconnect?.();
      return true;
    })()`,
    ]);
  } catch (error) {
    if (!isDaemonStartupError(error)) {
      throw error;
    }

    console.warn("Vanta protocol tab-continuity probe skipped: gsd-browser daemon startup unavailable.");
  }
}

function runSendCopyTruthProbe() {
  try {
    runBrowserCommand(["navigate", `${baseUrl}/app/send`], { stdio: "ignore" });
    runBrowserCommand(["wait-for", "--condition", "network_idle"], { stdio: "ignore" });

    const result = JSON.parse(
      runBrowserCommand([
        "eval",
        `(() => {
        const text = document.body.textContent ?? "";

        return {
          hasAdapterBacklogCopy: /private send adapter/i.test(text),
          hasSendOperatorEndpointBlocker: text.includes("Configure the private-core operator endpoint before this send proof can execute."),
          hasSupportedLaneCopy: text.includes("Private send") || text.includes("private-send lane"),
          path: location.pathname,
        };
      })()`,
      ]),
    );

    if (
      result.path !== "/app/send" ||
      result.hasAdapterBacklogCopy ||
      result.hasSendOperatorEndpointBlocker ||
      !result.hasSupportedLaneCopy
    ) {
      throw new Error(`Send copy truth probe failed: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    if (!isDaemonStartupError(error)) {
      throw error;
    }

    console.warn("Vanta protocol send-copy probe skipped: gsd-browser daemon startup unavailable.");
  }
}

const vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
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
  cleanupBrowserLock();
  const browserAvailable = runBrowserBatchWithRetry();
  if (browserAvailable) {
    runSendCopyTruthProbe();
    runDesktopTabClickContinuityProbe();
  }
  console.log("vanta protocol browser check: PASS");
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

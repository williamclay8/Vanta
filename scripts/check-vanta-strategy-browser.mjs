import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const port = 4730 + Math.floor(Math.random() * 200);
const selectAllShortcut = process.platform === "darwin" ? "Meta+A" : "Control+A";

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForVite(baseUrl) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/app/strategy`);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still booting.
    }

    await sleep(250);
  }

  throw new Error("Vanta dev server did not become ready for Strategy browser verification.");
}

function runBrowserBatch(baseUrl, steps) {
  const fullSteps = [
    { action: "navigate", url: `${baseUrl}/app/strategy` },
    { action: "wait_for", condition: "network_idle" },
    ...steps,
  ];

  execFileSync("gsd-browser", ["batch", "--steps", JSON.stringify(fullSteps), "--summary-only"], {
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

function runBrowserBatchWithRetry(baseUrl, steps) {
  try {
    runBrowserBatch(baseUrl, steps);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes("daemon exited during startup")) {
      throw error;
    }

    cleanupBrowserLock();
    runBrowserBatch(baseUrl, steps);
  }
}

async function runScenario({
  deploymentMode,
  portOffset,
  steps,
}) {
  const scenarioPort = port + portOffset;
  const baseUrl = `http://127.0.0.1:${scenarioPort}`;
  const vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(scenarioPort), "--strictPort"], {
    env: {
      ...process.env,
      VITE_VANTA_DEPLOYMENT_MODE: deploymentMode,
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
    await waitForVite(baseUrl);
    runBrowserBatchWithRetry(baseUrl, steps);
  } catch (error) {
    if (stdout) {
      console.error(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }
    throw error;
  } finally {
    if (vite.exitCode === null) {
      await new Promise((resolvePromise) => {
        vite.once("close", resolvePromise);
        vite.kill("SIGTERM");
      });
    }
  }
}

try {
  await runScenario({
    deploymentMode: "beta",
    portOffset: 0,
    steps: [
      {
        action: "assert",
        checks: [
          { kind: "url_contains", text: "/app/strategy" },
          { kind: "selector_visible", selector: ".strategy-page" },
          { kind: "selector_visible", selector: ".strategy-header" },
          { kind: "selector_visible", selector: ".strategy-kicker" },
          { kind: "text_visible", text: "Strategy" },
          { kind: "text_visible", text: "Beta mode" },
          { kind: "selector_visible", selector: ".strategy-primary-action:disabled" },
          { kind: "selector_hidden", selector: ".strategy-primary-action:not(:disabled)" },
          { kind: "text_visible", text: "Live execution is unavailable in this environment." },
          { kind: "text_visible", text: "No fee while Strategy remains preview-only." },
          {
            kind: "text_visible",
            text: "If live execution ships later, external execution costs should stay separate.",
          },
          { kind: "text_hidden", text: "0.25% on successful strategy execution" },
          { kind: "text_hidden", text: "Execution preview" },
          {
            kind: "text_visible",
            text: "Beta mode keeps Strategy visible but prevents live execution while production services are offline.",
          },
          { kind: "text_visible", text: "Use funds from" },
          { kind: "text_visible", text: "Proceeds go to" },
          { kind: "text_visible", text: "No wallet connected" },
          { kind: "text_visible", text: "Uses shielded funds under Vanta private owner" },
          { kind: "text_visible", text: "Keeps proceeds under Vanta private owner" },
          { kind: "text_visible", text: "Private rail packet" },
          { kind: "text_visible", text: "Hash-bound proof-public Strategy preview" },
          { kind: "text_visible", text: "Operator plaintext strategy shared" },
          { kind: "text_visible", text: "No" },
          { kind: "text_visible", text: "Shielded private-core note required" },
          { kind: "text_hidden", text: "Fully private Strategy" },
          { kind: "text_hidden", text: "Live private strategy execution" },
          { kind: "text_visible", text: "Funding source" },
          { kind: "text_visible", text: "Proceeds destination" },
          {
            kind: "text_visible",
            text: "These choices shape a local plan only. No funds move and no trades are submitted from this screen.",
          },
          { kind: "no_console_errors" },
        ],
      },
    ],
  });
  await runScenario({
    deploymentMode: "production",
    portOffset: 1,
    steps: [
      {
        action: "assert",
        checks: [
          { kind: "url_contains", text: "/app/strategy" },
          { kind: "text_visible", text: "Strategy" },
          { kind: "text_visible", text: "Review strategy settings" },
          { kind: "text_hidden", text: "Live execution is unavailable in this environment." },
          { kind: "text_visible", text: "No fee while Strategy remains preview-only." },
          {
            kind: "text_visible",
            text: "If live execution ships later, external execution costs should stay separate.",
          },
          { kind: "text_hidden", text: "0.25% on successful strategy execution" },
          { kind: "text_hidden", text: "Execution preview" },
          {
            kind: "text_visible",
            text: "Keep settings editable while live strategy execution remains unavailable.",
          },
          { kind: "text_visible", text: "Use funds from" },
          { kind: "text_visible", text: "Proceeds go to" },
          { kind: "text_visible", text: "No wallet connected" },
          { kind: "text_visible", text: "Uses shielded funds under Vanta private owner" },
          { kind: "text_visible", text: "Keeps proceeds under Vanta private owner" },
          { kind: "text_visible", text: "Private rail packet" },
          { kind: "text_visible", text: "Hash-bound proof-public Strategy preview" },
          { kind: "text_visible", text: "Operator plaintext strategy shared" },
          { kind: "text_visible", text: "No" },
          { kind: "text_visible", text: "Shielded private-core note required" },
          { kind: "text_hidden", text: "Fully private Strategy" },
          { kind: "text_hidden", text: "Live private strategy execution" },
          { kind: "text_visible", text: "Funding source" },
          { kind: "text_visible", text: "Proceeds destination" },
          {
            kind: "text_visible",
            text: "These choices shape a local plan only. No funds move and no trades are submitted from this screen.",
          },
          { kind: "no_console_errors" },
        ],
      },
      { action: "select_option", selector: 'select[aria-label="Use funds from"]', value: "Public wallet balance" },
      {
        action: "assert",
        checks: [
          { kind: "text_visible", text: "Review strategy settings" },
          { kind: "text_visible", text: "Shield funds into your Vanta private balance before live execution." },
          { kind: "text_visible", text: "Connect a wallet to choose which public balance funds this strategy." },
          { kind: "text_hidden", text: "Live execution is unavailable in this environment." },
          {
            kind: "text_visible",
            text: "Keep settings editable while live strategy execution remains unavailable.",
          },
          { kind: "no_console_errors" },
        ],
      },
      { action: "click", selector: ".strategy-primary-action" },
      {
        action: "assert",
        checks: [
          { kind: "text_hidden", text: "Strategy plan ready" },
          { kind: "text_hidden", text: "Ready for your review" },
          { kind: "text_hidden", text: "Execution preview" },
          { kind: "text_visible", text: "Shield funds into your Vanta private balance before live execution." },
          { kind: "text_hidden", text: "Strategy settings saved" },
          { kind: "no_console_errors" },
        ],
      },
    ],
  });
  await runScenario({
    deploymentMode: "production",
    portOffset: 2,
    steps: [
      {
        action: "assert",
        checks: [
          { kind: "url_contains", text: "/app/strategy" },
          { kind: "text_visible", text: "Strategy" },
          { kind: "text_visible", text: "Review strategy settings" },
          { kind: "text_hidden", text: "Live execution is unavailable in this environment." },
          { kind: "text_visible", text: "No fee while Strategy remains preview-only." },
          {
            kind: "text_visible",
            text: "If live execution ships later, external execution costs should stay separate.",
          },
          { kind: "text_hidden", text: "0.25% on successful strategy execution" },
          { kind: "text_hidden", text: "Execution preview" },
          {
            kind: "text_visible",
            text: "Keep settings editable while live strategy execution remains unavailable.",
          },
          { kind: "text_visible", text: "Use funds from" },
          { kind: "text_visible", text: "Proceeds go to" },
          { kind: "text_visible", text: "No wallet connected" },
          { kind: "text_visible", text: "Funding source" },
          { kind: "text_visible", text: "Proceeds destination" },
          {
            kind: "text_visible",
            text: "These choices shape a local plan only. No funds move and no trades are submitted from this screen.",
          },
          { kind: "no_console_errors" },
        ],
      },
      { action: "select_option", selector: 'select[aria-label="Use funds from"]', value: "Connected wallet" },
      {
        action: "assert",
        checks: [
          { kind: "text_visible", text: "Connect a wallet so Vanta knows which public wallet this choice means." },
          { kind: "text_hidden", text: "Live execution is unavailable in this environment." },
          { kind: "text_visible", text: "Review strategy settings" },
          { kind: "no_console_errors" },
        ],
      },
    ],
  });
  await runScenario({
    deploymentMode: "production",
    portOffset: 3,
    steps: [
      {
        action: "click",
        selector: 'input[aria-label="Amount"]',
      },
      {
        action: "key_press",
        key: selectAllShortcut,
      },
      {
        action: "key_press",
        key: "Backspace",
      },
      {
        action: "assert",
        checks: [
          { kind: "text_visible", text: "Enter an amount to review this strategy." },
          { kind: "selector_visible", selector: ".strategy-primary-action:disabled" },
          { kind: "selector_hidden", selector: ".strategy-primary-action:not(:disabled)" },
          { kind: "no_console_errors" },
        ],
      },
      {
        action: "select_option",
        selector: 'select[aria-label="Duration"]',
        value: "Custom",
      },
      {
        action: "click",
        selector: 'input[aria-label="Custom duration"]',
      },
      {
        action: "key_press",
        key: selectAllShortcut,
      },
      {
        action: "key_press",
        key: "Backspace",
      },
      {
        action: "type",
        selector: 'input[aria-label="Custom duration"]',
        text: "soon",
      },
      {
        action: "click",
        selector: ".strategy-advanced summary",
      },
      {
        action: "click",
        selector: 'input[aria-label="Max slippage"]',
      },
      {
        action: "key_press",
        key: selectAllShortcut,
      },
      {
        action: "key_press",
        key: "Backspace",
      },
      {
        action: "type",
        selector: 'input[aria-label="Max slippage"]',
        text: "oops",
      },
      {
        action: "assert",
        checks: [
          { kind: "text_visible", text: "Use a duration like 12 hours or 3 days." },
          { kind: "text_visible", text: "Enter a valid max slippage percentage." },
          { kind: "selector_visible", selector: ".strategy-primary-action:disabled" },
          { kind: "no_console_errors" },
        ],
      },
    ],
  });
  console.log("vanta strategy browser check: PASS");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  try {
    execFileSync("gsd-browser", ["daemon", "stop"], { stdio: "ignore" });
  } catch {
    // The daemon may already be stopped.
  }
}

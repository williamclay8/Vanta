import { execFileSync, spawn } from "node:child_process";

const port = 4230 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForVite() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/app/pay`);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still booting.
    }

    await sleep(250);
  }

  throw new Error("Vanta dev server did not become ready for browser verification.");
}

function runBrowserBatch() {
  const steps = [
    { action: "navigate", url: `${baseUrl}/app/pay` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/pay" },
        { kind: "text_visible", text: "Create payment link" },
        { kind: "text_visible", text: "Vanta Beta" },
        { kind: "text_visible", text: "No funds move in this mode" },
        { kind: "text_visible", text: "Payment Link" },
        { kind: "text_visible", text: "Invoice" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: ".app-header__account-trigger" },
    { action: "wait_for", condition: "text_visible", value: "Wallet" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Detected wallets" },
        { kind: "text_visible", text: "Create fresh wallet" },
        { kind: "text_hidden", text: "Top up with Peer" },
        { kind: "text_hidden", text: "No wallet funds detected" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'button[aria-label="Close wallet picker"]' },
    { action: "click", selector: 'button[aria-label="Checkout"]' },
    { action: "wait_for", condition: "selector_visible", value: 'form[aria-label="Checkout form"]' },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Beta mode" },
        { kind: "text_visible", text: "Privacy rail in review" },
        { kind: "text_visible", text: "Receipt path preview" },
        { kind: "text_visible", text: "Pay with Vanta" },
        { kind: "text_visible", text: "Merchant operations" },
        { kind: "text_visible", text: "Policy-legible settlement" },
        { kind: "text_visible", text: "Private checkout" },
        { kind: "text_visible", text: "Approval boundary" },
        { kind: "text_visible", text: "preview -> approve -> execute -> settle" },
        { kind: "text_visible", text: "Merchant control plane" },
        { kind: "text_visible", text: "Available balances" },
        { kind: "text_visible", text: "Refund queue" },
        { kind: "text_visible", text: "Withdrawal queue" },
        { kind: "text_visible", text: "Reconciliation export" },
        { kind: "text_visible", text: "0 receipt records" },
        { kind: "text_visible", text: "Today · 16:00 UTC" },
        { kind: "text_visible", text: "2026-04-23 · 00:00-12:00 UTC" },
        { kind: "text_visible", text: "No available balances" },
        { kind: "text_visible", text: "No refunds queued" },
        { kind: "text_visible", text: "No withdrawals queued" },
        { kind: "selector_visible", selector: '[data-pay-surface="merchant-control-plane"][data-approval-phase="preview"]' },
        { kind: "selector_visible", selector: '[data-control-plane-section="balances"]' },
        { kind: "selector_visible", selector: '[data-control-plane-section="refunds"]' },
        { kind: "selector_visible", selector: '[data-control-plane-section="withdrawals"]' },
        { kind: "selector_visible", selector: '[data-control-plane-section="reconciliation"]' },
        { kind: "selector_visible", selector: ".pay-trust-line" },
        { kind: "selector_visible", selector: 'form[aria-label="Checkout form"] .button-primary:disabled' },
        { kind: "selector_hidden", selector: ".pay-checkout-card .button-primary:not(:disabled)" },
        { kind: "selector_hidden", selector: ".pay-success-card" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'button[aria-label="Payment Link"]' },
    { action: "wait_for", condition: "text_visible", value: "Create payment link" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Link name" },
        { kind: "text_visible", text: "Amount" },
        { kind: "text_visible", text: "Asset" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'button[aria-label="Withdraw"]' },
    { action: "wait_for", condition: "selector_visible", value: 'form[aria-label="Withdraw form"]' },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Destination" },
        { kind: "text_visible", text: "Address" },
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
    VITE_VANTA_ENABLE_PEER_ONRAMP: "true",
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
  runBrowserBatch();
  console.log("vanta-pay browser check: PASS");
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

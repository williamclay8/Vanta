import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

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
        { kind: "text_visible", text: "Vanta Pay" },
        { kind: "text_visible", text: "Test mode" },
        { kind: "text_visible", text: "No production funds moved." },
        { kind: "text_visible", text: "Production privacy claims remain locked." },
        { kind: "text_visible", text: "Request builder" },
        { kind: "text_visible", text: "Payment details" },
        { kind: "text_visible", text: "Create a test checkout session before any live approval or settlement." },
        { kind: "text_visible", text: "Description" },
        { kind: "text_visible", text: "Amount" },
        { kind: "text_visible", text: "Asset" },
        { kind: "text_visible", text: "Customer email" },
        { kind: "text_visible", text: "Checkout type" },
        { kind: "text_visible", text: "Hosted checkout" },
        { kind: "text_visible", text: "Embedded checkout" },
        { kind: "text_visible", text: "Modal checkout" },
        { kind: "text_visible", text: "Create checkout session" },
        { kind: "text_visible", text: "Creates a test checkout session. Completion requires a confirmed private rail receipt." },
        { kind: "text_visible", text: "Review payment" },
        { kind: "text_visible", text: "Test link" },
        { kind: "text_visible", text: "Draft" },
        { kind: "text_visible", text: "Transaction status" },
        { kind: "text_visible", text: "Approval, execution, and settlement are locked in beta." },
        { kind: "text_visible", text: "Local operator harness" },
        { kind: "text_visible", text: "Payment record" },
        { kind: "text_visible", text: "Next actions" },
        { kind: "text_visible", text: "Copy test link" },
        { kind: "text_visible", text: "Preview checkout" },
        { kind: "text_visible", text: "View receipt" },
        { kind: "text_visible", text: "Prepare refund" },
        { kind: "text_visible", text: "Prepare withdrawal" },
        { kind: "text_visible", text: "Payment records" },
        { kind: "text_visible", text: "No test checkout session created yet." },
        { kind: "text_visible", text: "Payment links" },
        { kind: "text_visible", text: "Invoices" },
        { kind: "text_visible", text: "Operations" },
        { kind: "text_visible", text: "Trust rail" },
        { kind: "text_visible", text: "Vanta Pay is in test mode." },
        { kind: "selector_visible", selector: 'form[aria-label="Payment form"]' },
        { kind: "selector_visible", selector: 'form[aria-label="Payment form"] .button-primary:not(:disabled)' },
        { kind: "selector_hidden", selector: ".pay-pricing-card" },
        { kind: "selector_hidden", selector: '[data-pay-surface="merchant-control-plane"]' },
        { kind: "text_hidden", text: "Pricing" },
        { kind: "text_hidden", text: "fee" },
        { kind: "text_hidden", text: "fees" },
        { kind: "text_hidden", text: "0 monthly fee" },
        { kind: "text_hidden", text: "0.25%" },
        { kind: "text_hidden", text: "No billing starts from checkout preview alone." },
        { kind: "text_hidden", text: "Merchant settlement operations" },
        { kind: "text_hidden", text: "Merchant control plane" },
        { kind: "text_hidden", text: "Trust packet" },
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
    { action: "type", selector: 'input[name="payment-title"]', text: "Design retainer" },
    { action: "type", selector: 'input[name="payment-amount"]', text: "2400" },
    { action: "type", selector: 'input[name="customer-email"]', text: "customer@example.com" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Design retainer" },
        { kind: "text_visible", text: "2400 USDC" },
        { kind: "text_visible", text: "customer@example.com" },
        { kind: "text_visible", text: "Create checkout session" },
        { kind: "text_visible", text: "Local operator harness" },
        { kind: "text_visible", text: "Trust rail" },
        { kind: "text_visible", text: "Production privacy claims remain locked." },
        { kind: "text_visible", text: "Operations" },
        { kind: "selector_hidden", selector: ".pay-pricing-card" },
        { kind: "text_hidden", text: "Pricing" },
        { kind: "text_hidden", text: "fee" },
        { kind: "text_hidden", text: "fees" },
        { kind: "text_hidden", text: "0 monthly fee" },
        { kind: "text_hidden", text: "0.25%" },
        { kind: "text_hidden", text: "No billing starts from checkout preview alone." },
        { kind: "text_hidden", text: "Merchant operations" },
        { kind: "text_hidden", text: "Approval boundary" },
        { kind: "selector_visible", selector: ".pay-trust-line" },
        { kind: "selector_visible", selector: 'form[aria-label="Payment form"] .button-primary:not(:disabled)' },
        { kind: "selector_visible", selector: ".pay-success-card--truth" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'form[aria-label="Payment form"] .button-primary' },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Checkout session created" },
        { kind: "text_visible", text: "checkout_session" },
        { kind: "text_visible", text: "client_token" },
        { kind: "text_visible", text: "Complete test settlement" },
        { kind: "selector_visible", selector: ".pay-record-list" },
        { kind: "selector_visible", selector: '.pay-path-steps span[data-state="active"]' },
        { kind: "selector_visible", selector: ".pay-workflow-action:not(:disabled)" },
        { kind: "selector_hidden", selector: ".pay-command-card-grid" },
        { kind: "text_hidden", text: "Pay with Vanta" },
        { kind: "text_hidden", text: "Payment submitted" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'button[data-pay-action="complete-test-settlement"]' },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Payment record completed" },
        { kind: "text_visible", text: "Private rail receipt confirmed" },
        { kind: "text_visible", text: "receipt_" },
        { kind: "text_visible", text: "private_rail_" },
        { kind: "text_visible", text: "audit_disclosure_" },
        { kind: "text_visible", text: "No production funds moved." },
        { kind: "text_visible", text: "Production privacy claims remain locked." },
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
  runBrowserBatchWithRetry();
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

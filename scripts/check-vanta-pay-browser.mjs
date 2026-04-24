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
    { action: "click", selector: ".pay-subnav__item:nth-child(3)" },
    { action: "wait_for", condition: "text_visible", value: "Complete your payment" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Beta mode" },
        { kind: "text_visible", text: "Privacy rail in review" },
        { kind: "text_visible", text: "Receipt included" },
        { kind: "text_visible", text: "Merchant operations" },
        { kind: "text_visible", text: "Policy-legible settlement" },
        { kind: "text_visible", text: "Private checkout" },
        { kind: "text_visible", text: "Approval boundary" },
        { kind: "text_visible", text: "Refund review" },
        { kind: "text_visible", text: "Merchant-visible refund state" },
        { kind: "text_visible", text: "Withdrawal review" },
        { kind: "text_visible", text: "Merchant-visible withdrawal state" },
        { kind: "text_visible", text: "Reconciliation snapshot" },
        { kind: "text_visible", text: "Merchant-visible reconciliation state" },
        { kind: "text_visible", text: "Design partner preview" },
        { kind: "text_visible", text: "Merchant pilot" },
        { kind: "text_visible", text: "Private settlement without protocol overhead" },
        { kind: "text_visible", text: "No funds move" },
        { kind: "selector_hidden", selector: ".pay-checkout-card .button-primary:not(:disabled)" },
        { kind: "selector_hidden", selector: ".pay-success-card" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: ".pay-subnav__item:nth-child(1)" },
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
    { action: "click", selector: ".pay-subnav__item:nth-child(4)" },
    { action: "wait_for", condition: "text_visible", value: "Withdraw" },
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

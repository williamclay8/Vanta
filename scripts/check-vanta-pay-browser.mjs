import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";

const repoRoot = path.resolve(import.meta.dirname, "..");
const port = 4230 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const chromeForTestingPath = path.join(
  os.homedir(),
  ".gsd-browser/chromium/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);

function requireSourceMarkers(relativePath, markers) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing ${relativePath}`);
  }

  const source = readFileSync(absolutePath, "utf8");
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length > 0) {
    throw new Error(`Missing ${relativePath} marker(s): ${missing.join(", ")}`);
  }
}

function forbidSourceMarkers(relativePath, markers) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing ${relativePath}`);
  }

  const source = readFileSync(absolutePath, "utf8");
  const present = markers.filter((marker) => source.includes(marker));
  if (present.length > 0) {
    throw new Error(`Forbidden ${relativePath} marker(s): ${present.join(", ")}`);
  }
}

function verifyReceiptPacketCardSource() {
  requireSourceMarkers("src/components/PayReceiptPacketCard.tsx", [
    "PayReceiptPacketCard",
    "data-vanta-pay-receipt-packet-card",
    "data-vanta-pay-receipt-amount",
    "data-vanta-pay-receipt-verify-link",
    "data-vanta-pay-receipt-qr",
    "data-vanta-pay-receipt-merchant",
    "data-vanta-pay-receipt-printable",
    "data-vanta-pay-growth-loop",
    "data-vanta-pay-growth-loop-evidence",
    "data-vanta-pay-counterparty-activation",
    "data-vanta-pay-committed-checkout-acceptance",
    "data-vanta-pay-institutional-disclosure",
    'data-pay-action="copy-receipt-share-link"',
    'data-pay-action="print-receipt-packet"',
    "publicView.verification.claimBoundary",
    "publicView.institutionalDisclosure.receiptSchemaVersion",
    "publicView.growthLoop.counterpartyVerification.verificationCommand",
    "Selective disclosure receipt",
    "Growth loop",
    "Local evidence ledger",
    "Counterparty verification",
    "Counterparty verifier opens 7d",
    "Next private settlement requests 7d",
    "pay:measured-loop-implementation-check",
    "pay:counterparty-activation-check",
    "pay:committed-checkout-acceptance-check",
    "Counterparty activation",
    "Committed checkout acceptance",
    "Request private settlement",
    "Accept committed checkout",
    "next_settlement_intent_created",
    "committed_checkout_acceptance_created",
    "Invited use",
    "Repeated private action",
    "Disclosure expires",
    "Private inputs disclosed",
    "Witness disclosed",
    "...redacted",
  ]);
  requireSourceMarkers("src/pages/PayPage.tsx", [
    "PayReceiptPacketCard",
    "receiptPublicView",
    "receiptPrivacyContract",
  ]);
  requireSourceMarkers("src/App.tsx", [
    "ReceiptVerificationPage",
    "/receipt/:receiptId",
  ]);
  requireSourceMarkers("src/pages/ReceiptVerificationPage.tsx", [
    "data-vanta-pay-receipt-verify-page",
    "data-vanta-pay-counterparty-verifier",
    "data-vanta-pay-growth-loop-counterparty-event",
    "data-vanta-pay-counterparty-activation",
    "data-vanta-pay-committed-checkout-acceptance",
    "Receipt verification preview",
    "counterparty_verifier_opened",
    "counterparty_invite_opened",
    "next_settlement_intent_created",
    "committed_checkout_acceptance_created",
    "pay:counterparty-activation-check",
    "pay:committed-checkout-acceptance-check",
    "pay:measured-loop-implementation-check",
    "Next private settlement",
    "Receipt-backed test settlement; production privacy is not enabled.",
    "Production privacy is not enabled",
    "No production funds moved. Test receipt only.",
    "npm run pay:verify",
  ]);
  forbidSourceMarkers("src/components/PayReceiptPacketCard.tsx", [
    "customerEmail",
    "clientToken",
    "privateRailReceiptId",
    "auditDisclosureId",
  ]);
}

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

function buildPayBrowserSteps() {
  return [
    { action: "navigate", url: `${baseUrl}/app/pay` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/pay" },
        { kind: "text_visible", text: "Vanta Pay" },
        { kind: "text_visible", text: "Design partner preview" },
        { kind: "text_visible", text: "Merchant pilot" },
        { kind: "text_visible", text: "Settlement control-plane preview without protocol overhead." },
        { kind: "text_visible", text: "Test mode" },
        { kind: "text_visible", text: "No production funds moved." },
        { kind: "text_visible", text: "Test receipt only." },
        { kind: "text_visible", text: "Request builder" },
        { kind: "text_visible", text: "Payment details" },
        { kind: "text_visible", text: "Create a test payment request before live approval or production settlement." },
        { kind: "text_visible", text: "Description" },
        { kind: "text_visible", text: "Amount" },
        { kind: "text_visible", text: "Asset" },
        { kind: "text_visible", text: "Advanced payment settings" },
        { kind: "text_hidden", text: "Customer email" },
        { kind: "text_hidden", text: "Checkout type" },
        { kind: "text_hidden", text: "Hosted checkout" },
        { kind: "text_hidden", text: "Embedded checkout" },
        { kind: "text_hidden", text: "Modal checkout" },
        { kind: "text_visible", text: "Create payment request" },
        { kind: "text_visible", text: "Creates a test payment request. Completion generates a local receipt packet for review." },
        { kind: "text_visible", text: "Review payment" },
        { kind: "text_visible", text: "Buyer preview link" },
        { kind: "text_visible", text: "Draft" },
        { kind: "text_visible", text: "Transaction status" },
        { kind: "selector_visible", selector: ".transaction-status-toast" },
        { kind: "text_visible", text: "Live approval and execution are locked in beta." },
        { kind: "text_visible", text: "Local operator harness" },
        { kind: "text_visible", text: "Payment record" },
        { kind: "text_visible", text: "Next actions" },
        { kind: "text_visible", text: "Copy test link" },
        { kind: "text_visible", text: "Preview checkout" },
        { kind: "text_visible", text: "View receipt" },
        { kind: "text_visible", text: "Issue test refund" },
        { kind: "text_visible", text: "Create test withdrawal" },
        { kind: "text_visible", text: "Payment records" },
        { kind: "text_visible", text: "No test payment request created yet." },
        { kind: "text_visible", text: "Settlement lifecycle" },
        { kind: "text_visible", text: "Privacy readiness" },
        { kind: "text_visible", text: "production privacy not enabled" },
        { kind: "text_visible", text: "Operator status" },
        { kind: "text_visible", text: "Settlement queue" },
        { kind: "text_visible", text: "Refunds: merchant-visible" },
        { kind: "text_visible", text: "Withdrawals: merchant-visible" },
        { kind: "text_visible", text: "Reconciliation: merchant-visible" },
        { kind: "text_visible", text: "Buyer preview links" },
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
    { action: "click", selector: ".pay-advanced-settings summary" },
    { action: "wait_for", condition: "text_visible", value: "Customer email" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Checkout type" },
        { kind: "text_visible", text: "Hosted checkout" },
        { kind: "text_visible", text: "Embedded checkout" },
        { kind: "text_visible", text: "Modal checkout" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "type", selector: 'input[name="customer-email"]', text: "customer@example.com" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Design retainer" },
        { kind: "text_visible", text: "2400 USDC" },
        { kind: "text_visible", text: "customer@example.com" },
        { kind: "text_visible", text: "Create payment request" },
        { kind: "text_visible", text: "Local operator harness" },
        { kind: "text_visible", text: "Trust rail" },
        { kind: "text_visible", text: "production privacy not enabled" },
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
        { kind: "selector_visible", selector: ".transaction-status-toast" },
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
        { kind: "text_visible", text: "vcs_" },
        { kind: "text_visible", text: "vtok_1...redacted" },
        { kind: "text_visible", text: "Generate test receipt" },
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
        { kind: "text_visible", text: "Local test private-rail receipt generated" },
        { kind: "text_visible", text: "Receipt packet" },
        { kind: "text_visible", text: "Receipt packet ready" },
        { kind: "text_visible", text: "Verify receipt" },
        { kind: "text_visible", text: "Copy share link" },
        { kind: "text_visible", text: "Print receipt" },
        { kind: "text_visible", text: "Vanta Studio" },
        { kind: "text_visible", text: "Printable receipt packet" },
        { kind: "text_visible", text: "receipt-backed test settlement" },
        { kind: "text_visible", text: "production privacy not enabled" },
        { kind: "text_visible", text: "Visible to merchant" },
        { kind: "text_visible", text: "Visible to buyer" },
        { kind: "text_visible", text: "Kept private" },
        { kind: "text_visible", text: "Verified by" },
        { kind: "text_visible", text: "Growth loop" },
        { kind: "text_visible", text: "Local evidence ledger" },
        { kind: "text_visible", text: "Counterparty verification" },
        { kind: "text_visible", text: "Counterparty verifier opens 7d" },
        { kind: "text_visible", text: "Next private settlement requests 7d" },
        { kind: "text_visible", text: "Counterparty activation" },
        { kind: "text_visible", text: "Committed checkout acceptance" },
        { kind: "text_visible", text: "Request private settlement" },
        { kind: "text_visible", text: "Accept committed checkout" },
        { kind: "text_visible", text: "next_settlement_intent_created" },
        { kind: "text_visible", text: "committed_checkout_acceptance_created" },
        { kind: "text_visible", text: "Invited use" },
        { kind: "text_visible", text: "Repeated private action" },
        { kind: "text_visible", text: "npm run pay:growth-loop-check" },
        { kind: "text_visible", text: "npm run pay:measured-loop-implementation-check" },
        { kind: "text_visible", text: "npm run pay:counterparty-activation-check" },
        { kind: "text_visible", text: "npm run pay:committed-checkout-acceptance-check" },
        { kind: "text_visible", text: "Institutional disclosure" },
        { kind: "text_visible", text: "Selective disclosure receipt" },
        { kind: "text_visible", text: "vanta-pay-institutional-disclosure-receipt-v0.1" },
        { kind: "text_visible", text: "Disclosure expires" },
        { kind: "text_visible", text: "Private inputs disclosed: false" },
        { kind: "text_visible", text: "Witness disclosed: false" },
        { kind: "text_visible", text: "Proof receipt ID" },
        { kind: "text_visible", text: "...redacted" },
        { kind: "text_visible", text: "receipt-backed-test-settlement-not-production-private" },
        { kind: "selector_visible", selector: "[data-vanta-pay-receipt-packet-card]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-receipt-amount]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-receipt-verify-link]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-receipt-qr]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-receipt-merchant]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-receipt-printable]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-growth-loop]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-growth-loop-evidence]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-counterparty-activation]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-committed-checkout-acceptance]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-institutional-disclosure]" },
        {
          kind: "selector_visible",
          selector: 'button[data-pay-action="copy-receipt-share-link"]:not(:disabled)',
        },
        {
          kind: "selector_visible",
          selector: 'button[data-pay-action="print-receipt-packet"]:not(:disabled)',
        },
        { kind: "text_visible", text: "rcpt_" },
        { kind: "text_visible", text: "prail_" },
        { kind: "text_visible", text: "aud_" },
        { kind: "text_visible", text: "No production funds moved." },
        { kind: "text_visible", text: "Test receipt only." },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'button[data-pay-action="create-test-withdrawal"]' },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "wdr_" },
        { kind: "text_visible", text: "pexit_" },
        { kind: "text_visible", text: "Local test withdrawal prepared" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: "[data-vanta-pay-receipt-verify-link]" },
    { action: "wait_for", condition: "url_contains", value: "/receipt/" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/receipt/" },
        { kind: "text_visible", text: "Counterparty verifier" },
        { kind: "text_visible", text: "Verify receipt" },
        { kind: "text_visible", text: "Receipt verification preview" },
        { kind: "text_visible", text: "shareable Pay trust-packet" },
        { kind: "text_visible", text: "Receipt" },
        { kind: "text_visible", text: "Growth-loop event" },
        { kind: "text_visible", text: "counterparty_verifier_opened" },
        { kind: "text_visible", text: "POST /v1/growth-loop/events" },
        { kind: "text_visible", text: "Next private settlement" },
        { kind: "text_visible", text: "Counterparty activation" },
        { kind: "text_visible", text: "Committed checkout acceptance" },
        { kind: "text_visible", text: "Request private settlement" },
        { kind: "text_visible", text: "Accept committed checkout" },
        { kind: "text_visible", text: "counterparty_invite_opened" },
        { kind: "text_visible", text: "next_settlement_intent_created" },
        { kind: "text_visible", text: "committed_checkout_acceptance_created" },
        { kind: "text_visible", text: "local fixture counters" },
        { kind: "text_visible", text: "GET /v1/growth-loop/status" },
        { kind: "text_visible", text: "Usage-velocity and adoption claims stay blocked" },
        { kind: "text_visible", text: "npm run pay:growth-loop-check" },
        { kind: "text_visible", text: "npm run pay:measured-loop-implementation-check" },
        { kind: "text_visible", text: "npm run pay:counterparty-activation-check" },
        { kind: "text_visible", text: "npm run pay:committed-checkout-acceptance-check" },
        { kind: "text_visible", text: "npm run pay:verify" },
        { kind: "text_visible", text: "Production privacy is not enabled" },
        { kind: "text_visible", text: "No production funds moved. Test receipt only." },
        { kind: "selector_visible", selector: "[data-vanta-pay-counterparty-verifier]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-receipt-verify-page]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-growth-loop-counterparty-event]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-counterparty-activation]" },
        { kind: "selector_visible", selector: "[data-vanta-pay-committed-checkout-acceptance]" },
        { kind: "no_console_errors" },
      ],
    },
  ];
}

function runBrowserBatch() {
  const steps = buildPayBrowserSteps();
  execFileSync("gsd-browser", ["batch", "--steps", JSON.stringify(steps), "--summary-only"], {
    stdio: "pipe",
  });
}

function isDaemonStartupError(error) {
  const message = [
    error instanceof Error ? error.message : String(error),
    String(error?.stdout ?? ""),
    String(error?.stderr ?? ""),
  ].join("\n");

  return (
    message.includes("daemon exited during startup") ||
    message.includes("daemon did not start within 10s") ||
    message.includes("Timeout while resolving websocket URL")
  );
}

function delay(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function withTimeout(promise, ms, label) {
  let timeout;
  return Promise.race([
    promise.finally(() => {
      clearTimeout(timeout);
    }),
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

function describeStep(step) {
  if (step.action === "assert") {
    return `${step.action}(${step.checks.length} checks)`;
  }
  if (step.selector) {
    return `${step.action}(${step.selector})`;
  }
  if (step.value) {
    return `${step.action}(${step.condition}:${step.value})`;
  }
  if (step.url) {
    return `${step.action}(${step.url})`;
  }

  return step.action;
}

function launchCdpChrome() {
  if (!existsSync(chromeForTestingPath)) {
    throw new Error(`Missing Chrome for Testing binary at ${chromeForTestingPath}`);
  }

  const userDataDir = mkdtempSync(path.join(os.tmpdir(), "vanta-pay-cdp-"));
  const browser = spawn(
    chromeForTestingPath,
    [
      "--headless=new",
      "--disable-crash-reporter",
      "--disable-crashpad",
      "--disable-breakpad",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      "--mute-audio",
      "--remote-debugging-port=0",
      "--remote-allow-origins=*",
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  browser.unref();

  return { browser, userDataDir };
}

async function waitForDevtoolsPort(userDataDir) {
  const devtoolsFile = path.join(userDataDir, "DevToolsActivePort");

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const [port] = readFileSync(devtoolsFile, "utf8").trim().split(/\n/);
      if (port) {
        return port;
      }
    } catch {
      // Chrome has not written the DevToolsActivePort file yet.
    }

    await delay(100);
  }

  throw new Error("Chrome CDP fallback did not expose DevToolsActivePort.");
}

async function readChromeJson(url, options, label) {
  const response = await withTimeout(fetch(url, options), 5000, label);
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }

  return response.json();
}

async function createCdpPageWebSocketUrl(cdpPort) {
  const targetUrl = `http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent("about:blank")}`;
  let pageTarget;

  try {
    pageTarget = await readChromeJson(targetUrl, { method: "PUT" }, "Chrome CDP page target");
  } catch {
    pageTarget = await readChromeJson(targetUrl, undefined, "Chrome CDP page target");
  }

  if (!pageTarget.webSocketDebuggerUrl) {
    throw new Error("Chrome CDP page target did not return a websocket URL.");
  }

  return pageTarget.webSocketDebuggerUrl;
}

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 1;
  const pending = new Map();
  const consoleErrors = [];

  function rejectPending(error) {
    for (const { reject } of pending.values()) {
      reject(error);
    }
    pending.clear();
  }

  socket.on("message", async (data) => {
    let payload = data;
    if (payload instanceof ArrayBuffer) {
      payload = new TextDecoder().decode(payload);
    } else if (Buffer.isBuffer(payload)) {
      payload = payload.toString("utf8");
    } else if (Array.isArray(payload)) {
      payload = Buffer.concat(payload).toString("utf8");
    } else if (ArrayBuffer.isView(payload)) {
      payload = new TextDecoder().decode(payload);
    } else if (typeof Blob !== "undefined" && payload instanceof Blob) {
      payload = await payload.text();
    }

    let message;
    try {
      message = JSON.parse(String(payload));
    } catch (error) {
      rejectPending(error);
      return;
    }

    if (message.id && pending.has(message.id)) {
      const { reject, resolve } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
      } else {
        resolve(message.result ?? {});
      }
      return;
    }

    if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
      consoleErrors.push("console.error");
    }
    if (message.method === "Runtime.exceptionThrown") {
      consoleErrors.push(message.params?.exceptionDetails?.text ?? "Runtime exception");
    }
    if (message.method === "Log.entryAdded" && message.params?.entry?.level === "error") {
      consoleErrors.push(message.params.entry.text ?? "Log error");
    }
  });

  return new Promise((resolvePromise, rejectPromise) => {
    let opened = false;

    socket.once("open", () => {
      opened = true;
      resolvePromise({
        close() {
          socket.close();
        },
        consoleErrors,
        send(method, params = {}, sessionId = undefined) {
          const id = nextId;
          nextId += 1;
          const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };

          const commandPromise = new Promise((resolve, reject) => {
            pending.set(id, { reject, resolve });
            if (socket.readyState !== WebSocket.OPEN) {
              pending.delete(id);
              reject(new Error(`CDP websocket is not open for ${method}.`));
              return;
            }

            socket.send(JSON.stringify(payload), (error) => {
              if (error) {
                pending.delete(id);
                reject(error);
              }
            });
          }).finally(() => {
            pending.delete(id);
          });

          return withTimeout(commandPromise, 5000, `CDP ${method}`);
        },
      });
    });
    socket.on("error", () => {
      const error = new Error("Could not open Chrome CDP websocket.");
      if (!opened) {
        rejectPromise(error);
      }
      rejectPending(error);
    });
    socket.on("close", () => {
      rejectPending(new Error("Chrome CDP websocket closed before command completed."));
    });
  });
}

async function enableCdpPage(cdp) {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Log.enable");
}

async function evaluateCdp(cdp, sessionId, expression, awaitPromise = false) {
  const result = await cdp.send(
    "Runtime.evaluate",
    {
      awaitPromise,
      expression,
      returnByValue: true,
    },
    sessionId,
  );

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "CDP evaluation failed.");
  }

  return result.result?.value;
}

async function waitForCdpPredicate(cdp, sessionId, predicateExpression, label, timeoutMs = 5000) {
  const startedAt = Date.now();
  let lastValue = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await evaluateCdp(cdp, sessionId, predicateExpression);
    if (lastValue) {
      return;
    }

    await delay(100);
  }

  throw new Error(`CDP fallback timed out waiting for ${label}; last value: ${String(lastValue)}`);
}

function visibleSelectorExpression(selector) {
  return `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  })()`;
}

function bodyTextIncludesExpression(text) {
  return `document.body.innerText.includes(${JSON.stringify(text)})`;
}

async function runCdpCheck(cdp, sessionId, check) {
  if (check.kind === "url_contains") {
    await waitForCdpPredicate(
      cdp,
      sessionId,
      `location.href.includes(${JSON.stringify(check.text)})`,
      `URL containing ${check.text}`,
    );
    return;
  }
  if (check.kind === "text_visible") {
    await waitForCdpPredicate(cdp, sessionId, bodyTextIncludesExpression(check.text), check.text);
    return;
  }
  if (check.kind === "text_hidden") {
    const visible = await evaluateCdp(cdp, sessionId, bodyTextIncludesExpression(check.text));
    if (visible) {
      throw new Error(`Text should be hidden in CDP fallback: ${check.text}`);
    }
    return;
  }
  if (check.kind === "selector_visible") {
    await waitForCdpPredicate(
      cdp,
      sessionId,
      visibleSelectorExpression(check.selector),
      check.selector,
    );
    return;
  }
  if (check.kind === "selector_hidden") {
    const visible = await evaluateCdp(cdp, sessionId, visibleSelectorExpression(check.selector));
    if (visible) {
      throw new Error(`Selector should be hidden in CDP fallback: ${check.selector}`);
    }
    return;
  }
  if (check.kind === "no_console_errors") {
    if (cdp.consoleErrors.length > 0) {
      throw new Error(`Console errors in CDP fallback: ${cdp.consoleErrors.join("; ")}`);
    }
    return;
  }

  throw new Error(`Unsupported CDP fallback check: ${JSON.stringify(check)}`);
}

async function runCdpStep(cdp, sessionId, step) {
  if (step.action === "navigate") {
    await cdp.send("Page.navigate", { url: step.url }, sessionId);
    await waitForCdpPredicate(
      cdp,
      sessionId,
      `document.readyState === "complete" || document.readyState === "interactive"`,
      `navigation to ${step.url}`,
      10000,
    );
    await delay(350);
    return;
  }
  if (step.action === "wait_for") {
    if (step.condition === "network_idle") {
      await delay(750);
      return;
    }
    if (step.condition === "text_visible") {
      await waitForCdpPredicate(cdp, sessionId, bodyTextIncludesExpression(step.value), step.value);
      return;
    }
    if (step.condition === "url_contains") {
      await waitForCdpPredicate(
        cdp,
        sessionId,
        `location.href.includes(${JSON.stringify(step.value)})`,
        `URL containing ${step.value}`,
      );
      return;
    }
  }
  if (step.action === "assert") {
    for (const check of step.checks) {
      await runCdpCheck(cdp, sessionId, check);
    }
    return;
  }
  if (step.action === "click") {
    await waitForCdpPredicate(cdp, sessionId, visibleSelectorExpression(step.selector), step.selector);
    await evaluateCdp(
      cdp,
      sessionId,
      `(() => {
        const element = document.querySelector(${JSON.stringify(step.selector)});
        element.scrollIntoView({ block: "center", inline: "center" });
        element.click();
        return true;
      })()`,
    );
    await delay(250);
    return;
  }
  if (step.action === "type") {
    await waitForCdpPredicate(cdp, sessionId, visibleSelectorExpression(step.selector), step.selector);
    await evaluateCdp(
      cdp,
      sessionId,
      `(() => {
        const element = document.querySelector(${JSON.stringify(step.selector)});
        element.focus();
        element.value = String(element.value ?? "") + ${JSON.stringify(step.text)};
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`,
    );
    await delay(150);
    return;
  }

  throw new Error(`Unsupported CDP fallback step: ${JSON.stringify(step)}`);
}

async function runBrowserBatchWithCdpFallback() {
  const { browser, userDataDir } = launchCdpChrome();
  let cdp = null;

  try {
    const cdpPort = await waitForDevtoolsPort(userDataDir);
    const webSocketUrl = await createCdpPageWebSocketUrl(cdpPort);
    cdp = await withTimeout(
      connectCdp(webSocketUrl),
      10000,
      "Chrome CDP websocket open",
    );
    await withTimeout(enableCdpPage(cdp), 15000, "CDP page enable");

    const steps = buildPayBrowserSteps();
    for (const [index, step] of steps.entries()) {
      const label = `CDP fallback step ${index + 1}/${steps.length} ${describeStep(step)}`;
      try {
        await withTimeout(runCdpStep(cdp, undefined, step), 20000, label);
      } catch (error) {
        throw new Error(`${label} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    cdp?.close();
    try {
      process.kill(-browser.pid, "SIGTERM");
    } catch {
      // Chrome may already be stopped.
    }
    await delay(500);
    try {
      process.kill(-browser.pid, "SIGKILL");
    } catch {
      // Chrome may already be stopped.
    }
    rmSync(userDataDir, { force: true, recursive: true });
  }
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

async function runBrowserBatchWithRetry() {
  let lastStartupError = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    cleanupBrowserLock();

    try {
      runBrowserBatch();
      return;
    } catch (error) {
      if (!isDaemonStartupError(error)) {
        throw error;
      }

      lastStartupError = error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
    }
  }

  console.warn(
    `vanta-pay browser check: gsd-browser daemon startup unavailable; using direct Chrome CDP fallback. ${lastStartupError instanceof Error ? lastStartupError.message : ""}`,
  );
  await runBrowserBatchWithCdpFallback();
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
  verifyReceiptPacketCardSource();
  await waitForVite();
  await runBrowserBatchWithRetry();
  console.log("vanta-pay browser check: PASS");
} catch (error) {
  const errorStdout = String(error?.stdout ?? "");
  const errorStderr = String(error?.stderr ?? "");
  if (errorStdout) {
    console.error(errorStdout);
  }
  if (errorStderr) {
    console.error(errorStderr);
  }
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

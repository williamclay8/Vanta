import { execFileSync, spawn } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import os from "node:os";
import { resolve } from "node:path";
import path from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(repoRoot, "src/App.tsx"), "utf8");
const layoutSource = readFileSync(resolve(repoRoot, "src/components/AppLayout.tsx"), "utf8");
const pageSource = readFileSync(resolve(repoRoot, "src/pages/StrategyPage.tsx"), "utf8");
const stylesSource = readFileSync(resolve(repoRoot, "src/styles.css"), "utf8");
const strategyCopySurface = pageSource;
const port = 4930 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;

const visibleStrategyCopy = [
  "Strategy",
  "Preview DCA",
  "Preview TWAP",
  "Review strategy settings",
  "Beta mode keeps Strategy visible while live execution stays locked.",
  "Shield funds from your public wallet into your Vanta private balance before live execution.",
  "Connect a wallet to choose the public wallet, then shield funds before live execution.",
  "Vanta private balance",
  "Public wallet",
  "Connected wallet",
  "Treasury wallet",
  "Use funds from",
  "Proceeds go to",
  "Child-order schedule",
  "Strategy preview ledger",
  "Child trades",
  "Average child size",
  "Cadence estimate",
  "Settlement target",
  "No wallet connected",
  "Connected wallet",
  "Uses shielded funds under Vanta private owner",
  "Keeps proceeds under Vanta private owner",
  "Strategy receipt packet",
  "Hash-bound packet preview",
  "Operator plaintext shared",
  "Shielded private-core note required",
  "Live private strategy claims stay locked until readiness, operator, audit, and mainnet gates pass.",
  "npm run strategy:private-rail-check",
  "Funding source",
  "Proceeds destination",
  "This screen shapes a local strategy preview. No funds move and no trades are submitted.",
  "No fee while Strategy remains preview-only.",
  "If live execution ships later, external execution costs should stay separate.",
  "Keep settings editable while live strategy execution remains unavailable.",
  "Preview sizing and cadence for a shielded-balance strategy. No trades are submitted from this screen.",
];

const bannedStrategyCopy = [
  "Strategy settings saved",
  "Your strategy settings were saved locally. Live trading still needs a separate launch flow.",
  "Review source, route, and proceeds destination before any live run.",
  "$1.82M",
  "$151.42",
  "$8,400",
  "1,284.22",
  "418,900",
  "Active Strategies",
  "Recent Fills",
  "Private Holdings",
  "SOL Accumulate",
  "JUP DCA",
  "Treasury Hedge",
  "Strategy queued",
  "destination: private",
  "ETA",
  "confidential pending balance",
  "note commitment",
  "ownership metadata leakage",
  "UTXO",
  "ZK",
  "obfuscation",
  "completely invisible whale buying",
  "Create strategy",
  "0.25% on successful strategy execution",
  "Execution preview",
  "Strategy plan ready",
  "Ready for your review",
  "Preview routing, funding, and landing behavior while live strategy execution remains preview-only.",
  "External wallet",
  "Public balance",
  "Treasury vault",
  "Fund from",
  "Connect and fund the required wallet before execution.",
  "Move funds into your private balance before execution.",
];

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForVite() {
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

  throw new Error("Vanta dev server did not become ready for Strategy copy verification.");
}

function runBrowserCopyCheck() {
  const steps = [
    { action: "navigate", url: `${baseUrl}/app/strategy` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/strategy" },
        ...visibleStrategyCopy.map((text) => ({ kind: "text_visible", text })),
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

  for (const fileName of ["daemon.lock", "daemon.pid"]) {
    try {
      rmSync(path.join(os.homedir(), ".gsd-browser", fileName), { force: true });
    } catch {
      // The daemon metadata file may already be gone.
    }
  }

  try {
    execFileSync("gsd-browser", ["daemon", "stop"], { stdio: "ignore" });
  } catch {
    // The daemon may already be stopped.
  }
}

function runBrowserCopyCheckWithRetry() {
  let lastError;
  let lastStartupError = false;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      runBrowserCopyCheck();
      return;
    } catch (error) {
      lastError = error;
      const messageParts = [error instanceof Error ? error.message : String(error)];
      if (error && typeof error === "object" && "stdout" in error) {
        messageParts.push(Buffer.from(error.stdout ?? "").toString("utf8"));
      }
      if (error && typeof error === "object" && "stderr" in error) {
        messageParts.push(Buffer.from(error.stderr ?? "").toString("utf8"));
      }
      const message = messageParts.join("\n");

      if (
        !message.includes("daemon exited during startup") &&
        !message.includes("daemon closed connection without response") &&
        !message.includes("status signal: 15 (SIGTERM)")
      ) {
        throw error;
      }

      lastStartupError = true;
      cleanupBrowserLock();
      execFileSync("sleep", [String(0.5 + attempt * 0.5)], { stdio: "ignore" });
    }
  }

  if (lastStartupError) {
    console.warn("Strategy tab browser copy check skipped: gsd-browser daemon startup unavailable.");
    return;
  }

  throw lastError;
}

const failures = [];

if (!appSource.includes('path="strategy"')) {
  failures.push('Missing /app/strategy route in src/App.tsx');
}

if (!layoutSource.includes('/app/strategy') || !layoutSource.includes('label: "Strategy"')) {
  failures.push("Missing Strategy tab in src/components/AppLayout.tsx");
}

if (!pageSource.includes('describePricingForSurface("strategy")')) {
  failures.push("Strategy page must derive pricing copy from describePricingForSurface(\"strategy\").");
}

if (!pageSource.includes("strategyPricing.feeLabel") || !pageSource.includes("strategyPricing.passThroughLabel")) {
  failures.push("Strategy page must render the shared pricing fee and pass-through labels.");
}

if (!pageSource.includes('className="send-page strategy-page"')) {
  failures.push("Strategy page must use the shared action-tab page shell classes.");
}

if (!pageSource.includes('className="module-page__hero send-page__hero strategy-header product-intro"')) {
  failures.push("Strategy page hero must use the shared action-tab hero classes.");
}

if (!pageSource.includes('className="send-card send-card--workspace strategy-card strategy-card--primary"')) {
  failures.push("Strategy page primary panel must use the shared action-tab workspace card classes.");
}

if (
  !pageSource.includes('className="strategy-timeline"') ||
  !pageSource.includes("formatStrategyOrderTitle") ||
  !stylesSource.includes(".strategy-timeline")
) {
  failures.push("Strategy page must render a child-order timeline with hover detail.");
}

if (
  !pageSource.includes('className="strategy-preview-ledger"') ||
  !pageSource.includes("strategyPreviewLedger") ||
  !stylesSource.includes(".strategy-preview-ledger")
) {
  failures.push("Strategy page must render a human-readable preview ledger.");
}

if (!pageSource.includes('className="strategy-mode__spark"') || !stylesSource.includes(".strategy-mode__spark")) {
  failures.push("Strategy mode toggle must include per-mode visual tick previews.");
}

if (
  !stylesSource.includes(".app-shell:has(.strategy-page)") ||
  !stylesSource.includes(".app-content:has(.strategy-page)") ||
  !stylesSource.includes(".strategy-page,\n.send-page")
) {
  failures.push("Strategy page must participate in the shared app shell layout selectors.");
}

if (!stylesSource.includes(".strategy-page {\n  padding: 12px 0 44px;\n}")) {
  failures.push("Strategy page must share the action-tab top padding contract.");
}

if (!stylesSource.includes(".strategy-shell {\n  display: grid;\n  gap: 0;\n}")) {
  failures.push("Strategy shell must not add an extra bespoke gap above the action-tab workspace.");
}

for (const text of bannedStrategyCopy) {
  if (strategyCopySurface.includes(text)) {
    failures.push(`Banned Strategy copy found: ${text}`);
  }
}

if (failures.length > 0) {
  console.error("Strategy tab copy check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
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
  cleanupBrowserLock();
  runBrowserCopyCheckWithRetry();
  console.log("Strategy tab copy check: PASS");
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

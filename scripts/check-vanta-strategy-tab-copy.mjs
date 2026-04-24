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
  "Stealth DCA",
  "Private TWAP",
  "Review strategy plan",
  "Strategy plan ready",
  "Live execution is unavailable in this environment.",
  "Move funds into your private balance before execution.",
  "Connect and fund the required wallet before execution.",
  "Private balance",
  "No fee while Strategy remains preview-only.",
  "If live execution ships later, external execution costs should stay separate.",
  "Preview routing, funding, and landing behavior while live strategy execution remains preview-only.",
  "reduced on-chain observability",
];

const bannedStrategyCopy = [
  "Schedule strategy",
  "Strategy scheduled",
  "Your strategy was scheduled locally and is ready for execution.",
  "Review routing, funding, and landing behavior before you schedule live execution.",
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

  try {
    execFileSync("gsd-browser", ["daemon", "stop"], { stdio: "ignore" });
  } catch {
    // The daemon may already be stopped.
  }
}

function runBrowserCopyCheckWithRetry() {
  try {
    runBrowserCopyCheck();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes("daemon exited during startup")) {
      throw error;
    }

    cleanupBrowserLock();
    runBrowserCopyCheck();
  }
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

import { execFileSync, spawn } from "node:child_process";

const port = 4630 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

async function waitForVite() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/app/shield`);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still booting.
    }

    await sleep(250);
  }

  throw new Error("Vanta dev server did not become ready for wallet browser signing safety verification.");
}

function runSafeBrowserSigningBatch() {
  const steps = [
    { action: "navigate", url: `${baseUrl}/app/shield` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/shield" },
        { kind: "text_visible", text: "Shield asset" },
        { kind: "text_visible", text: "Connect a wallet to shield assets." },
        { kind: "text_hidden", text: "Awaiting wallet confirmation" },
        { kind: "text_hidden", text: "mainnet-beta" },
        { kind: "text_hidden", text: "seed phrase" },
        { kind: "text_hidden", text: "private key" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: ".app-header__account-trigger" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Simulation before signing" },
        { kind: "text_visible", text: "Live actions are simulated before wallet approval." },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: "button[aria-label='Close wallet picker']" },
    { action: "click", selector: ".shield-form__actions .button-primary" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Connect a wallet to shield assets." },
        { kind: "text_hidden", text: "Awaiting wallet confirmation" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/send` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/send" },
        { kind: "text_hidden", text: "mainnet-beta" },
        { kind: "text_hidden", text: "seed phrase" },
        { kind: "text_hidden", text: "private key" },
        { kind: "no_console_errors" },
      ],
    },
  ];

  execFileSync("gsd-browser", ["batch", "--steps", JSON.stringify(steps), "--summary-only"], {
    stdio: "pipe",
  });
}

function assertBrowserClusterGuard() {
  const browserProbe = `(async () => {
    return {
      mainnetTextVisible: document.body.innerText.includes("mainnet-beta"),
      awaitingWallet: document.body.innerText.includes("Awaiting wallet confirmation"),
      safeOrigin: location.origin === ${JSON.stringify(baseUrl)}
    };
  })()`;
  const output = execFileSync(
    "zsh",
    [
      "-lc",
      [
        `gsd-browser navigate ${shellQuote(`${baseUrl}/app/shield`)}`,
        `gsd-browser wait-for --condition network_idle`,
        `gsd-browser eval ${shellQuote(browserProbe)}`,
      ].join(" >/dev/null && "),
    ],
    { encoding: "utf8" },
  ).trim();
  const result = JSON.parse(output);

  if (!result.safeOrigin || result.mainnetTextVisible || result.awaitingWallet) {
    throw new Error(`Unexpected browser wallet signing safety state: ${output}`);
  }
}

function assertWalletSimulationSurface() {
  const browserProbe = `(async () => {
    const button = document.querySelector(".app-header__account-trigger");
    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      simulationTitleVisible: document.body.innerText.includes("Simulation before signing"),
      simulationCopyVisible: document.body.innerText.includes("Live actions are simulated before wallet approval."),
      secretCopyVisible:
        document.body.innerText.includes("seed phrase") ||
        document.body.innerText.includes("private key")
    };
  })()`;
  const output = execFileSync(
    "zsh",
    [
      "-lc",
      [
        `gsd-browser navigate ${shellQuote(`${baseUrl}/app/shield`)}`,
        `gsd-browser wait-for --condition network_idle`,
        `gsd-browser eval ${shellQuote(browserProbe)}`,
      ].join(" >/dev/null && "),
    ],
    { encoding: "utf8" },
  ).trim();
  const result = JSON.parse(output);

  if (!result.simulationTitleVisible || !result.simulationCopyVisible || result.secretCopyVisible) {
    throw new Error(`Unexpected wallet simulation surface state: ${output}`);
  }
}

const vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  env: {
    ...process.env,
    VITE_SOLANA_CLUSTER: "devnet",
    VITE_SOLANA_RPC_URL: "https://api.devnet.solana.com",
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
  assertBrowserClusterGuard();
  assertWalletSimulationSurface();
  runSafeBrowserSigningBatch();
  console.log("Vanta wallet browser signing safety check: PASS");
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

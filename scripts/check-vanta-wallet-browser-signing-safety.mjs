import { execFileSync, spawn } from "node:child_process";

const port = 4630 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
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
        { kind: "text_visible", text: "Funding" },
        { kind: "text_visible", text: "No wallet funds detected" },
        { kind: "text_visible", text: "Connect, create a fresh wallet, or top up with Peer on desktop." },
        { kind: "text_visible", text: "Top up with Peer" },
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
        { kind: "text_visible", text: "Private send" },
        { kind: "text_hidden", text: "mainnet-beta" },
        { kind: "text_hidden", text: "seed phrase" },
        { kind: "text_hidden", text: "private key" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/swap` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/swap" },
        { kind: "text_visible", text: "Connect a wallet to swap." },
        { kind: "text_hidden", text: "Awaiting wallet confirmation" },
        { kind: "text_hidden", text: "mainnet-beta" },
        { kind: "text_hidden", text: "seed phrase" },
        { kind: "text_hidden", text: "private key" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: ".shield-form__actions .button-primary" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Connect a wallet to swap." },
        { kind: "text_hidden", text: "Awaiting wallet confirmation" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/unshield` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/unshield" },
        { kind: "text_visible", text: "Connect a wallet to use Public Wallet as the exit destination." },
        { kind: "text_hidden", text: "Awaiting wallet confirmation" },
        { kind: "text_hidden", text: "mainnet-beta" },
        { kind: "text_hidden", text: "seed phrase" },
        { kind: "text_hidden", text: "private key" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: ".shield-form__actions .button-primary" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Connect a wallet to use Public Wallet as the exit destination." },
        { kind: "text_hidden", text: "Awaiting wallet confirmation" },
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
    VITE_VANTA_DEPLOYMENT_MODE: "production",
    VITE_VANTA_ENABLE_PEER_ONRAMP: "true",
    VITE_VANTA_ENABLE_LIVE_PEER_FUNDING: "true",
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

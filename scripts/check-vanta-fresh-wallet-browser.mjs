import { execFileSync, spawn } from "node:child_process";

const port = 4850 + Math.floor(Math.random() * 200);
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

  throw new Error("Vanta dev server did not become ready for fresh wallet browser verification.");
}

function runFreshWalletBrowserBatch() {
  const steps = [
    { action: "navigate", url: `${baseUrl}/app/shield` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/shield" },
        { kind: "text_visible", text: "Create wallet" },
        { kind: "text_hidden", text: "secretKey" },
        { kind: "text_hidden", text: "seed phrase" },
        { kind: "text_hidden", text: "private key" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", text: "Create wallet" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Create fresh wallet" },
        { kind: "text_visible", text: "Generated in this browser" },
        { kind: "text_visible", text: "Import it into Phantom or Solflare to sign live actions" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", text: "Create" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Download recovery file" },
        { kind: "text_hidden", text: "secretKey" },
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
  runFreshWalletBrowserBatch();
  console.log("Vanta fresh wallet browser check: PASS");
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

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const args = process.argv.slice(2);
const explicitBaseUrl = resolveBaseUrl(args);

function randomPort() {
  return 11200 + Math.floor(Math.random() * 200);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/state/private-core-summary`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until server is ready.
    }

    await sleep(250);
  }

  throw new Error("operator server did not become ready in time");
}

function printSection(title) {
  process.stdout.write(`\n# ${title}\n`);
}

function runNpmScript(scriptName, baseUrl) {
  const command = ["run", "--silent", scriptName];
  if (baseUrl) {
    command.push("--", "--base-url", baseUrl);
  }
  execFileSync("npm", command, {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

function createOperatorEnv(tempRoot, port) {
  return {
    ...process.env,
    PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
    VANTA_UNSHIELD_OPERATOR_PORT: String(port),
    VANTA_DEVNET_TOKEN_MINT:
      process.env.VANTA_DEVNET_TOKEN_MINT ??
      "8j9mJY4hPW4N1pQ6XJk4oL9bQ4u8sF3o6T2jW7vF6dEm",
    VANTA_DEVNET_VAULT_OWNER:
      process.env.VANTA_DEVNET_VAULT_OWNER ??
      "Gk7m3rV2Q5uH4pL9sW8xD1nB6cT3yF7kJ2qR5mN8pZ1",
    VANTA_PRIVATE_CORE_CONSUME_STORE_PATH: join(tempRoot, "consumes.json"),
    VANTA_PRIVATE_CORE_PROOF_STORE_PATH: join(tempRoot, "proofs.json"),
    VANTA_PRIVATE_CORE_SEND_PROOF_STORE_PATH: join(tempRoot, "send-proofs.json"),
    VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(tempRoot, "sends.json"),
    VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, "private-core-releases.json"),
    VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, "roots.json"),
    VANTA_RELEASE_RECORD_STORE_PATH: join(tempRoot, "releases.json"),
    VANTA_SWAP_RECORD_STORE_PATH: join(tempRoot, "swaps.json"),
    VANTA_SOL_UNSHIELD_RECORD_STORE_PATH: join(tempRoot, "sol-unshields.json"),
  };
}

async function stopServer(server) {
  server.kill("SIGTERM");
  await new Promise((resolvePromise) => {
    server.once("exit", () => resolvePromise(undefined));
    setTimeout(() => resolvePromise(undefined), 1000);
  });
}

let tempRoot = null;
let server = null;

try {
  printSection("Demo Readiness");
  runNpmScript("private-core:demo-readiness");

  let baseUrl = explicitBaseUrl;

  if (!baseUrl) {
    mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
    tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-demo-preflight-"));
    const port = randomPort();
    baseUrl = `http://127.0.0.1:${port}`;
    server = spawn("node", ["operator/unshield-server.mjs"], {
      cwd: repoRoot,
      env: createOperatorEnv(tempRoot, port),
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForHealth(baseUrl);
    printSection(`Temporary Operator (${baseUrl})`);
    process.stdout.write(
      "Demo preflight is using a temporary local operator because no --base-url was provided.\n",
    );
  }

  const surfaces = [
    "private-core:operator-contract",
    "private-core:operator-status",
    "private-core:shipping-status",
    "private-core:operator-snapshot",
    "private-core:shipping-artifact",
    "private-core:release-candidate",
    "private-core:release-package",
    "private-core:release-readiness",
  ];

  for (const scriptName of surfaces) {
    printSection(scriptName);
    runNpmScript(scriptName, baseUrl);
  }
} finally {
  if (server) {
    await stopServer(server);
  }
  if (tempRoot) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function resolveBaseUrl(cliArgs) {
  const explicitIndex = cliArgs.indexOf("--base-url");
  if (explicitIndex !== -1 && typeof cliArgs[explicitIndex + 1] === "string") {
    return cliArgs[explicitIndex + 1];
  }

  return process.env.VANTA_PRIVATE_CORE_OPERATOR_BASE_URL ?? null;
}

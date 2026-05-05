import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const args = process.argv.slice(2);
const explicitBaseUrl = resolveBaseUrl(args);
const jsonMode = args.includes("--json");

function randomPort() {
  return 11300 + Math.floor(Math.random() * 200);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function requestJson(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  let parsed = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return { ok: response.ok, parsed, status: response.status, text };
}

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await requestJson(baseUrl, "/state/private-core-status");
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the temporary operator is listening.
    }

    await sleep(250);
  }

  throw new Error("operator status endpoint did not become ready in time");
}

function createOperatorEnv(tempRoot, port) {
  return {
    ...process.env,
    PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
    VANTA_UNSHIELD_OPERATOR_PORT: String(port),
    VANTA_MAINNET_TOKEN_MINT:
      process.env.VANTA_MAINNET_TOKEN_MINT ??
      "8j9mJY4hPW4N1pQ6XJk4oL9bQ4u8sF3o6T2jW7vF6dEm",
    VANTA_MAINNET_VAULT_OWNER:
      process.env.VANTA_MAINNET_VAULT_OWNER ??
      "Gk7m3rV2Q5uH4pL9sW8xD1nB6cT3yF7kJ2qR5mN8pZ1",
    SOLANA_RPC_URL: "https://solana-rpc.publicnode.com",
    SOLANA_WS_URL: "wss://solana-rpc.publicnode.com",
    VITE_SOLANA_BROWSER_RPC_URL: "https://solana-rpc.publicnode.com",
    VITE_SOLANA_BROWSER_WS_URL: "wss://solana-rpc.publicnode.com",
    VITE_SOLANA_READ_RPC_FALLBACK_URLS: "",
    VITE_SOLANA_RPC_URL: "https://solana-rpc.publicnode.com",
    VITE_SOLANA_WS_URL: "wss://solana-rpc.publicnode.com",
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

function startOperator(tempRoot, port) {
  const server = spawn("node", ["operator/unshield-server.mjs"], {
    cwd: repoRoot,
    env: createOperatorEnv(tempRoot, port),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";

  server.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  return {
    server,
    output() {
      return [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
    },
  };
}

async function stopServer(server) {
  server.kill("SIGTERM");
  await new Promise((resolvePromise) => {
    server.once("exit", () => resolvePromise(undefined));
    setTimeout(() => resolvePromise(undefined), 1000);
  });
}

function assertStatusShape({ baseUrl, status }) {
  const summary = status?.summary ?? {};
  const shippingDecision = status?.shippingDecision ?? {};

  if (status?.statusVersion !== 1) {
    throw new Error("Operator status endpoint must expose statusVersion 1.");
  }
  if (status?.statusKind !== "long-form-live-status") {
    throw new Error("Operator status endpoint must expose long-form-live-status.");
  }
  if (summary.contractVersion !== 22 || summary.summaryVersion !== 46) {
    throw new Error("Operator status endpoint must expose the current contract and summary versions.");
  }
  if (summary.supportedOperatorStatusEndpoint !== "/state/private-core-status") {
    throw new Error("Operator status endpoint metadata must name /state/private-core-status.");
  }
  if (summary.supportedOperatorStatusGateEndpoint !== "/state/private-core-status-check") {
    throw new Error("Operator status gate metadata must name /state/private-core-status-check.");
  }
  if (summary.supportedProofSystem !== "noir-acir-ultrahonk-bbjs") {
    throw new Error("Operator status endpoint must expose the UltraHonk proof-system contract.");
  }
  if (summary.contractMirrorStatus !== "mirrors-contract") {
    throw new Error("Operator status endpoint must mirror the frozen private-core contract.");
  }
  if (!shippingDecision.decisionStatus) {
    throw new Error("Operator status endpoint must include shipping decision state.");
  }

  return {
    endpoint: "/state/private-core-status",
    gateEndpoint: "/state/private-core-status-check",
    operator: baseUrl,
    proofSystem: summary.supportedProofSystem,
    statusKind: status.statusKind,
    statusVersion: status.statusVersion,
    summaryVersion: summary.summaryVersion,
    contractVersion: summary.contractVersion,
    contractMirrorStatus: summary.contractMirrorStatus,
    shippingDecisionStatus: shippingDecision.decisionStatus,
    shippingDecisionNote: shippingDecision.decisionNote ?? null,
    readyGateNote:
      "Endpoint check proves reachability and contract shape only; use private-core:operator-status-check-json for ready-to-ship state.",
  };
}

let tempRoot = null;
let operator = null;

try {
  let baseUrl = explicitBaseUrl;

  if (!baseUrl) {
    mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
    tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-status-endpoint-"));
    const port = randomPort();
    baseUrl = `http://127.0.0.1:${port}`;
    operator = startOperator(tempRoot, port);
    await waitForHealth(baseUrl);
  }

  const response = await requestJson(baseUrl, "/state/private-core-status");
  if (!response.ok) {
    throw new Error(response.text || `Operator status endpoint returned ${response.status}.`);
  }

  const result = assertStatusShape({ baseUrl, status: response.parsed });

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("Vanta private-core operator status endpoint check: PASS");
    console.log(`- operator: ${result.operator}`);
    console.log(`- endpoint: ${result.endpoint}`);
    console.log(`- gate endpoint: ${result.gateEndpoint}`);
    console.log(`- proof system: ${result.proofSystem}`);
    console.log(`- contract mirror: ${result.contractMirrorStatus}`);
    console.log(`- shipping decision status: ${result.shippingDecisionStatus}`);
    console.log(`- note: ${result.readyGateNote}`);
  }
} catch (error) {
  if (operator?.output()) {
    console.error(operator.output());
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (operator) {
    await stopServer(operator.server);
  }
  if (tempRoot) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function resolveBaseUrl(cliArgs) {
  const explicitIndex = cliArgs.indexOf("--base-url");
  if (explicitIndex !== -1 && typeof cliArgs[explicitIndex + 1] === "string") {
    return cliArgs[explicitIndex + 1].replace(/\/$/, "");
  }

  const envValue = process.env.VANTA_PRIVATE_CORE_OPERATOR_BASE_URL;
  return typeof envValue === "string" && envValue.trim()
    ? envValue.trim().replace(/\/$/, "")
    : null;
}

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function printStatus(message) {
  console.log(message);
}

function randomPort() {
  return 10100 + Math.floor(Math.random() * 200);
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
      // Retry until server is listening.
    }

    await sleep(250);
  }

  throw new Error("operator server did not become ready in time");
}

async function stopServer(server) {
  server.kill("SIGTERM");
  await new Promise((resolvePromise) => {
    server.once("exit", () => resolvePromise(undefined));
    setTimeout(() => resolvePromise(undefined), 1000);
  });
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return {
    ok: response.ok,
    parsed,
    status: response.status,
    text,
  };
}

async function loadFixture() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-operator-http-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    const privateCoreSource = readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8");
    const swapProofSource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreSwapProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');

    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(join(tempTsDir, "vantaPrivateCore.ts"), privateCoreSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreSwapProof.ts"), swapProofSource);

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "vantaPrivateCore.ts"),
        join(tempTsDir, "vantaPrivateCoreSwapProof.ts"),
        "--target",
        "ES2022",
        "--module",
        "ESNext",
        "--moduleResolution",
        "Bundler",
        "--lib",
        "ES2022,DOM",
        "--skipLibCheck",
        "--outDir",
        tempJsDir,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );

    const compiledPath = join(tempJsDir, "vantaPrivateCoreSwapProof.js");
    writeFileSync(
      compiledPath,
      readFileSync(compiledPath, "utf8").replace(
        /from "\.\/vantaPrivateCore"/g,
        'from "./vantaPrivateCore.js"',
      ),
    );

    const compiledModule = await import(pathToFileURL(compiledPath).href);
    return compiledModule.getVantaPrivateCoreFixedDepthSwapFixtureV0();
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const fixture = await loadFixture();
const witnessPackage = fixture.validBoundary.noirWitnessPackage;
mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-operator-http-server-"));
const port = randomPort();
const baseUrl = `http://127.0.0.1:${port}`;

let stderr = "";
let stdout = "";
let server = startServer();

function startServer() {
  const child = spawn("node", ["operator/unshield-server.mjs"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
      VANTA_UNSHIELD_OPERATOR_PORT: String(port),
      VANTA_MAINNET_TOKEN_MINT:
        process.env.VANTA_MAINNET_TOKEN_MINT ??
        "8j9mJY4hPW4N1pQ6XJk4oL9bQ4u8sF3o6T2jW7vF6dEm",
      VANTA_MAINNET_VAULT_OWNER:
        process.env.VANTA_MAINNET_VAULT_OWNER ??
        "Gk7m3rV2Q5uH4pL9sW8xD1nB6cT3yF7kJ2qR5mN8pZ1",
      VANTA_PRIVATE_CORE_CONSUME_STORE_PATH: join(tempRoot, "consumes.json"),
      VANTA_PRIVATE_CORE_PROOF_STORE_PATH: join(tempRoot, "proofs.json"),
      VANTA_PRIVATE_CORE_SEND_PROOF_STORE_PATH: join(tempRoot, "send-proofs.json"),
      VANTA_PRIVATE_CORE_SWAP_PROOF_STORE_PATH: join(tempRoot, "swap-proofs.json"),
      VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(tempRoot, "sends.json"),
      VANTA_PRIVATE_CORE_SWAP_STORE_PATH: join(tempRoot, "private-core-swaps.json"),
      VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, "private-core-releases.json"),
      VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, "roots.json"),
      VANTA_RELEASE_RECORD_STORE_PATH: join(tempRoot, "releases.json"),
      VANTA_SWAP_RECORD_STORE_PATH: join(tempRoot, "swaps.json"),
      VANTA_SOL_UNSHIELD_RECORD_STORE_PATH: join(tempRoot, "sol-unshields.json"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  return child;
}

try {
  await waitForHealth(baseUrl);

  const initialProofState = await requestJson(baseUrl, "/state/private-core-proofs", {
    method: "GET",
  });
  if (
    !initialProofState.ok ||
    initialProofState.parsed?.stateVersion !== 1 ||
    initialProofState.parsed?.latestProof !== null ||
    !Array.isArray(initialProofState.parsed?.records) ||
    initialProofState.parsed.records.length !== 0
  ) {
    throw new Error(initialProofState.text || "operator proof state did not start empty");
  }
  printStatus("operator swap http empty proof state: PASS");

  const initialSwapProofState = await requestJson(baseUrl, "/state/private-core-swap-proofs", {
    method: "GET",
  });
  if (
    !initialSwapProofState.ok ||
    initialSwapProofState.parsed?.stateVersion !== 1 ||
    initialSwapProofState.parsed?.latestProof !== null ||
    !Array.isArray(initialSwapProofState.parsed?.records) ||
    initialSwapProofState.parsed.records.length !== 0
  ) {
    throw new Error(initialSwapProofState.text || "operator swap proof state did not start empty");
  }
  printStatus("operator swap http empty swap-proof state: PASS");

  const proofResponse = await requestJson(baseUrl, "/private-core/swap-proof", {
    body: JSON.stringify({ witnessPackage }),
    method: "POST",
  });

  if (
    !proofResponse.ok ||
    proofResponse.parsed?.verified !== true ||
    proofResponse.parsed?.circuit !== "vanta_private_core_single_note_swap" ||
    proofResponse.parsed?.publicInputCount !== 8
  ) {
    throw new Error(proofResponse.text || "operator swap proof endpoint failed");
  }
  printStatus(
    `operator swap http proof: PASS (${proofResponse.parsed.proofFieldCount} fields / ${proofResponse.parsed.publicInputCount} public inputs)`,
  );

  const swapProofState = await requestJson(baseUrl, "/state/private-core-swap-proofs", {
    method: "GET",
  });
  if (
    !swapProofState.ok ||
    swapProofState.parsed?.stateVersion !== 1 ||
    !swapProofState.parsed?.latestProof ||
    swapProofState.parsed.latestProof?.action !== "swap-proof" ||
    swapProofState.parsed.latestProof?.circuit !== "vanta_private_core_single_note_swap" ||
    !Array.isArray(swapProofState.parsed?.records) ||
    swapProofState.parsed.records.length !== 1
  ) {
    throw new Error(swapProofState.text || "swap proof endpoint did not persist swap-proof state");
  }
  printStatus("operator swap http swap-proof state: PASS");

  const proofState = await requestJson(baseUrl, "/state/private-core-proofs", {
    method: "GET",
  });
  if (
    !proofState.ok ||
    proofState.parsed?.stateVersion !== 1 ||
    proofState.parsed?.latestProof !== null ||
    !Array.isArray(proofState.parsed?.records) ||
    proofState.parsed.records.length !== 0
  ) {
    throw new Error(proofState.text || "swap proof endpoint mutated unshield proof state");
  }
  printStatus("operator swap http proof-state isolation: PASS");

  const summaryState = await requestJson(baseUrl, "/state/private-core-summary", { method: "GET" });
  if (
    !summaryState.ok ||
    summaryState.parsed?.stateVersion !== 1 ||
    typeof summaryState.parsed?.summaryVersion !== "number" ||
    summaryState.parsed?.proofRecordCount !== 0 ||
    summaryState.parsed?.sendProofRecordCount !== 0 ||
    summaryState.parsed?.swapProofRecordCount !== 1 ||
    summaryState.parsed?.sendRecordCount !== 0 ||
    summaryState.parsed?.swapRecordCount !== 0 ||
    summaryState.parsed?.consumeRecordCount !== 0 ||
    summaryState.parsed?.releaseRecordCount !== 0 ||
    summaryState.parsed?.rootRecordCount !== 0 ||
    summaryState.parsed?.latestSwapProof?.proofId !== swapProofState.parsed?.latestProof?.proofId ||
    summaryState.parsed?.latestSwapLinkedProof !== null ||
    summaryState.parsed?.latestSwap !== null ||
    summaryState.parsed?.proofSwapLinkStatus !== "unavailable" ||
    summaryState.parsed?.boundaryStatus !== "awaiting-current-root"
  ) {
    throw new Error(summaryState.text || "operator summary drifted after swap proof execution");
  }
  printStatus("operator swap http summary isolation: PASS");
} catch (error) {
  console.error(stdout);
  console.error(stderr);
  throw error;
} finally {
  await stopServer(server);
  rmSync(tempRoot, { recursive: true, force: true });
}

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
  return 10750 + Math.floor(Math.random() * 150);
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
      // Retry until operator is ready.
    }

    await sleep(250);
  }

  throw new Error("operator server did not become ready in time");
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

async function stopServer(server) {
  server.kill("SIGTERM");
  await new Promise((resolvePromise) => {
    server.once("exit", () => resolvePromise(undefined));
    setTimeout(() => resolvePromise(undefined), 1000);
  });
}

async function loadFixtures() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-restart-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    const privateCoreSource = readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8");
    const swapProofSource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreSwapProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');
    const unshieldProofSource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreUnshieldProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');

    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(join(tempTsDir, "vantaPrivateCore.ts"), privateCoreSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreSwapProof.ts"), swapProofSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"), unshieldProofSource);

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "vantaPrivateCore.ts"),
        join(tempTsDir, "vantaPrivateCoreSwapProof.ts"),
        join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"),
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

    const swapProofPath = join(tempJsDir, "vantaPrivateCoreSwapProof.js");
    const unshieldProofPath = join(tempJsDir, "vantaPrivateCoreUnshieldProof.js");
    writeFileSync(
      swapProofPath,
      readFileSync(swapProofPath, "utf8").replace(
        /from "\.\/vantaPrivateCore"/g,
        'from "./vantaPrivateCore.js"',
      ),
    );
    writeFileSync(
      unshieldProofPath,
      readFileSync(unshieldProofPath, "utf8").replace(
        /from "\.\/vantaPrivateCore"/g,
        'from "./vantaPrivateCore.js"',
      ),
    );

    const swapModule = await import(pathToFileURL(swapProofPath).href);
    const unshieldModule = await import(pathToFileURL(unshieldProofPath).href);

    return {
      swap: swapModule.getVantaPrivateCoreFixedDepthSwapFixtureV0(),
      unshield: unshieldModule.getVantaPrivateCoreFixedDepthUnshieldFixtureV0(),
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
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
    VANTA_PRIVATE_CORE_SWAP_PROOF_STORE_PATH: join(tempRoot, "swap-proofs.json"),
    VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(tempRoot, "sends.json"),
    VANTA_PRIVATE_CORE_SWAP_STORE_PATH: join(tempRoot, "private-core-swaps.json"),
    VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, "private-core-releases.json"),
    VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, "roots.json"),
    VANTA_RELEASE_RECORD_STORE_PATH: join(tempRoot, "releases.json"),
    VANTA_SWAP_RECORD_STORE_PATH: join(tempRoot, "live-swaps.json"),
    VANTA_SOL_UNSHIELD_RECORD_STORE_PATH: join(tempRoot, "sol-unshields.json"),
  };
}

function startServer(tempRoot, port) {
  const server = spawn("node", ["operator/unshield-server.mjs"], {
    cwd: repoRoot,
    env: createOperatorEnv(tempRoot, port),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  let stdout = "";
  server.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  return {
    server,
    getOutput() {
      return [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
    },
  };
}

const fixtures = await loadFixtures();
const swapWitnessPackage = fixtures.swap.validBoundary.noirWitnessPackage;
const resultingRoot = fixtures.swap.validResultingRoot;
const rootWitnessPackage = fixtures.unshield.validBoundary.noirWitnessPackage;
const rootSourceArtifacts = fixtures.unshield.validSourceArtifacts;
const executionVenueLabel = "Meteora DLMM (Devnet)";
const executionQuoteReference = "quote-live-path-restart-check";

if (swapWitnessPackage.sourcePublicInputs.stateRoot !== rootWitnessPackage.sourcePublicInputs.stateRoot) {
  throw new Error("Swap restart fixture root does not match the root-registration fixture root.");
}

mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-restart-server-"));
const port = randomPort();
const baseUrl = `http://127.0.0.1:${port}`;

let liveServer = null;
let serverOutput = "";

try {
  let started = startServer(tempRoot, port);
  liveServer = started.server;
  await waitForHealth(baseUrl);

  const registerRoot = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: rootSourceArtifacts,
      witnessPackage: rootWitnessPackage,
    }),
    method: "POST",
  });
  if (!registerRoot.ok || registerRoot.parsed?.known !== true) {
    throw new Error(registerRoot.text || "swap restart setup could not register the input root");
  }
  printStatus("private-core swap restart input root registration: PASS");

  const transitionResponse = await requestJson(baseUrl, "/private-core/swap-transition", {
    body: JSON.stringify({
      executionQuoteReference,
      executionVenueLabel,
      resultingRoot,
      witnessPackage: swapWitnessPackage,
    }),
    method: "POST",
  });
  if (
    !transitionResponse.ok ||
    transitionResponse.parsed?.verified !== true ||
    transitionResponse.parsed?.swapRecorded !== true ||
    transitionResponse.parsed?.resultingRoot !== resultingRoot
  ) {
    throw new Error(transitionResponse.text || "swap restart setup could not record the swap");
  }
  printStatus("private-core swap restart setup transition: PASS");

  const preRestartSwapState = await requestJson(baseUrl, "/state/private-core-swaps", {
    method: "GET",
  });
  const preRestartSwapProofState = await requestJson(baseUrl, "/state/private-core-swap-proofs", {
    method: "GET",
  });
  const preRestartSummary = await requestJson(baseUrl, "/state/private-core-summary", {
    method: "GET",
  });

  if (
    !preRestartSwapState.ok ||
    preRestartSwapState.parsed?.latestSwap?.executionQuoteReference !== executionQuoteReference ||
    preRestartSwapState.parsed?.latestSwap?.executionVenueLabel !== executionVenueLabel ||
    preRestartSwapState.parsed?.latestSwap?.swapId !== transitionResponse.parsed?.swapId ||
    !preRestartSwapProofState.ok ||
    preRestartSwapProofState.parsed?.latestProof?.proofId !== transitionResponse.parsed?.proofId ||
    !preRestartSummary.ok ||
    preRestartSummary.parsed?.latestSwap?.executionQuoteReference !== executionQuoteReference ||
    preRestartSummary.parsed?.latestSwap?.executionVenueLabel !== executionVenueLabel ||
    preRestartSummary.parsed?.latestSwap?.swapId !== transitionResponse.parsed?.swapId ||
    preRestartSummary.parsed?.latestSwapProof?.proofId !== transitionResponse.parsed?.proofId ||
    preRestartSummary.parsed?.latestSwapLinkedProof?.proofId !== transitionResponse.parsed?.proofId ||
    preRestartSummary.parsed?.proofSwapLinkStatus !== "linked"
  ) {
    throw new Error(preRestartSummary.text || "swap restart pre-shutdown state was incoherent");
  }
  printStatus("private-core swap restart pre-shutdown state: PASS");

  await stopServer(liveServer);
  liveServer = null;
  serverOutput += `\n${started.getOutput()}`;

  started = startServer(tempRoot, port);
  liveServer = started.server;
  await waitForHealth(baseUrl);

  const postRestartSwapState = await requestJson(baseUrl, "/state/private-core-swaps", {
    method: "GET",
  });
  const postRestartSwapProofState = await requestJson(baseUrl, "/state/private-core-swap-proofs", {
    method: "GET",
  });
  const postRestartSummary = await requestJson(baseUrl, "/state/private-core-summary", {
    method: "GET",
  });

  if (
    !postRestartSwapState.ok ||
    postRestartSwapState.parsed?.latestSwap?.executionQuoteReference !== executionQuoteReference ||
    postRestartSwapState.parsed?.latestSwap?.executionVenueLabel !== executionVenueLabel ||
    postRestartSwapState.parsed?.latestSwap?.swapId !== transitionResponse.parsed?.swapId ||
    postRestartSwapState.parsed?.latestSwap?.proofId !== transitionResponse.parsed?.proofId ||
    postRestartSwapState.parsed?.latestSwap?.resultingRoot !== resultingRoot ||
    !postRestartSwapProofState.ok ||
    postRestartSwapProofState.parsed?.latestProof?.proofId !== transitionResponse.parsed?.proofId ||
    !postRestartSummary.ok ||
    postRestartSummary.parsed?.latestSwap?.executionQuoteReference !== executionQuoteReference ||
    postRestartSummary.parsed?.latestSwap?.executionVenueLabel !== executionVenueLabel ||
    postRestartSummary.parsed?.latestSwap?.swapId !== transitionResponse.parsed?.swapId ||
    postRestartSummary.parsed?.latestSwapProof?.proofId !== transitionResponse.parsed?.proofId ||
    postRestartSummary.parsed?.latestSwapLinkedProof?.proofId !== transitionResponse.parsed?.proofId ||
    postRestartSummary.parsed?.swapRecordCount !== 1 ||
    postRestartSummary.parsed?.swapProofRecordCount !== 1 ||
    postRestartSummary.parsed?.proofSwapLinkStatus !== "linked"
  ) {
    throw new Error(postRestartSummary.text || "swap restart persisted state was incoherent");
  }
  printStatus("private-core swap restart persisted state: PASS");
} catch (error) {
  console.error(serverOutput);
  if (liveServer) {
    console.error("Operator server was still running when the check failed.");
  }
  throw error;
} finally {
  if (liveServer) {
    await stopServer(liveServer);
  }
  rmSync(tempRoot, { force: true, recursive: true });
}

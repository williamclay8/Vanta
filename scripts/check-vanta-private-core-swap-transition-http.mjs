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
  return 10550 + Math.floor(Math.random() * 200);
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

async function loadFixtures() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-transition-http-"));
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

const fixtures = await loadFixtures();
const swapWitnessPackage = fixtures.swap.validBoundary.noirWitnessPackage;
const resultingRoot = fixtures.swap.validResultingRoot;
const rootWitnessPackage = fixtures.unshield.validBoundary.noirWitnessPackage;
const rootSourceArtifacts = fixtures.unshield.validSourceArtifacts;
const executionVenueLabel = "Meteora DLMM (Mainnet)";
const executionQuoteReference = "quote-live-path-http-check";

if (swapWitnessPackage.sourcePublicInputs.stateRoot !== rootWitnessPackage.sourcePublicInputs.stateRoot) {
  throw new Error("Swap fixture root does not match the root-registration fixture root.");
}

mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-transition-http-server-"));
const port = randomPort();
const baseUrl = `http://127.0.0.1:${port}`;

let stderr = "";
let stdout = "";
const server = spawn("node", ["operator/unshield-server.mjs"], {
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
    VANTA_PRIVATE_CORE_SWAP_PROOF_STORE_PATH: join(tempRoot, "swap-proofs.json"),
    VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(tempRoot, "sends.json"),
    VANTA_PRIVATE_CORE_SWAP_STORE_PATH: join(tempRoot, "swaps.json"),
    VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, "private-core-releases.json"),
    VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, "roots.json"),
    VANTA_RELEASE_RECORD_STORE_PATH: join(tempRoot, "releases.json"),
    VANTA_SWAP_RECORD_STORE_PATH: join(tempRoot, "live-swaps.json"),
    VANTA_SOL_UNSHIELD_RECORD_STORE_PATH: join(tempRoot, "sol-unshields.json"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
server.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

try {
  await waitForHealth(baseUrl);

  const initialSwapState = await requestJson(baseUrl, "/state/private-core-swaps", { method: "GET" });
  if (
    !initialSwapState.ok ||
    initialSwapState.parsed?.stateVersion !== 1 ||
    initialSwapState.parsed?.latestSwap !== null ||
    !Array.isArray(initialSwapState.parsed?.records) ||
    initialSwapState.parsed.records.length !== 0
  ) {
    throw new Error(initialSwapState.text || "operator swap transition state did not start empty");
  }
  printStatus("operator swap transition empty state: PASS");

  const missingRootResponse = await requestJson(baseUrl, "/private-core/swap-transition", {
    body: JSON.stringify({
      resultingRoot,
      witnessPackage: swapWitnessPackage,
    }),
    method: "POST",
  });
  if (
    missingRootResponse.ok ||
    !missingRootResponse.text.includes("input root is not registered")
  ) {
    throw new Error(missingRootResponse.text || "swap transition root gate did not fire");
  }
  printStatus("operator swap transition root gate: PASS");

  const rootRegistration = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: rootSourceArtifacts,
      witnessPackage: rootWitnessPackage,
    }),
    method: "POST",
  });
  if (!rootRegistration.ok || rootRegistration.parsed?.known !== true) {
    throw new Error(rootRegistration.text || "swap transition root registration failed");
  }
  printStatus("operator swap transition root registration: PASS");

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
    transitionResponse.parsed?.executionQuoteReference !== executionQuoteReference ||
    transitionResponse.parsed?.executionVenueLabel !== executionVenueLabel ||
    transitionResponse.parsed?.resultingRoot !== resultingRoot ||
    transitionResponse.parsed?.resultingRootBasis !== "client-declared" ||
    transitionResponse.parsed?.circuit !== "vanta_private_core_single_note_swap"
  ) {
    throw new Error(transitionResponse.text || "operator swap transition endpoint failed");
  }
  printStatus(
    `operator swap transition: PASS (${transitionResponse.parsed.proofFieldCount} fields / ${transitionResponse.parsed.publicInputCount} public inputs)`,
  );

  const duplicateTransitionResponse = await requestJson(baseUrl, "/private-core/swap-transition", {
    body: JSON.stringify({
      executionQuoteReference: `${executionQuoteReference}-duplicate`,
      executionVenueLabel,
      resultingRoot,
      witnessPackage: swapWitnessPackage,
    }),
    method: "POST",
  });
  if (
    duplicateTransitionResponse.ok ||
    !duplicateTransitionResponse.text.includes(
      "Duplicate private-core swap input nullifier is already registered.",
    )
  ) {
    throw new Error(
      duplicateTransitionResponse.text ||
        "operator swap transition duplicate nullifier guard did not fire",
    );
  }
  printStatus("operator swap transition duplicate input guard: PASS");

  const swapState = await requestJson(baseUrl, "/state/private-core-swaps", { method: "GET" });
  if (
    !swapState.ok ||
    swapState.parsed?.stateVersion !== 1 ||
    !swapState.parsed?.latestSwap ||
    swapState.parsed.latestSwap?.executionQuoteReference !== executionQuoteReference ||
    swapState.parsed.latestSwap?.executionVenueLabel !== executionVenueLabel ||
    swapState.parsed.latestSwap?.swapId !== transitionResponse.parsed?.swapId ||
    swapState.parsed.latestSwap?.proofId !== transitionResponse.parsed?.proofId ||
    swapState.parsed.latestSwap?.resultingRoot !== resultingRoot ||
    !Array.isArray(swapState.parsed?.records) ||
    swapState.parsed.records.length !== 1
  ) {
    throw new Error(swapState.text || "operator swap transition state was not persisted");
  }
  printStatus("operator swap transition state: PASS");

  const swapProofState = await requestJson(baseUrl, "/state/private-core-swap-proofs", { method: "GET" });
  if (
    !swapProofState.ok ||
    swapProofState.parsed?.stateVersion !== 1 ||
    !swapProofState.parsed?.latestProof ||
    swapProofState.parsed.latestProof?.proofId !== transitionResponse.parsed?.proofId ||
    swapProofState.parsed.latestProof?.action !== "swap-proof"
  ) {
    throw new Error(swapProofState.text || "operator swap transition did not persist swap-proof state");
  }
  printStatus("operator swap transition proof state: PASS");

  const summaryState = await requestJson(baseUrl, "/state/private-core-summary", { method: "GET" });
  if (
    !summaryState.ok ||
    summaryState.parsed?.stateVersion !== 1 ||
    typeof summaryState.parsed?.summaryVersion !== "number" ||
    summaryState.parsed?.latestSwap?.executionQuoteReference !== executionQuoteReference ||
    summaryState.parsed?.latestSwap?.executionVenueLabel !== executionVenueLabel ||
    summaryState.parsed?.latestSwap?.swapId !== transitionResponse.parsed?.swapId ||
    summaryState.parsed?.latestSwap?.proofId !== transitionResponse.parsed?.proofId ||
    summaryState.parsed?.latestSwap?.resultingRoot !== resultingRoot ||
    summaryState.parsed?.latestSwapProof?.proofId !== transitionResponse.parsed?.proofId ||
    summaryState.parsed?.latestSwapLinkedProof?.proofId !== transitionResponse.parsed?.proofId ||
    summaryState.parsed?.swapRecordCount !== 1 ||
    summaryState.parsed?.swapProofRecordCount !== 1 ||
    summaryState.parsed?.proofSwapLinkStatus !== "linked"
  ) {
    throw new Error(summaryState.text || "operator summary did not capture swap transition state");
  }
  printStatus("operator swap transition summary state: PASS");

  const operatorStatusOutput = execFileSync("node", [
    "scripts/print-vanta-private-core-operator-status.mjs",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (
    !operatorStatusOutput.includes(`Latest swap execution venue: ${executionVenueLabel}`) ||
    !operatorStatusOutput.includes(`Latest swap quote reference: ${executionQuoteReference}`) ||
    !operatorStatusOutput.includes("Latest swap transition:") ||
    !operatorStatusOutput.includes("Latest swap linked proof:")
  ) {
    throw new Error(
      operatorStatusOutput || "operator swap transition operator-status surface was not coherent",
    );
  }
  printStatus("operator swap transition operator-status: PASS");
} catch (error) {
  console.error(stdout);
  console.error(stderr);
  throw error;
} finally {
  await stopServer(server);
  rmSync(tempRoot, { recursive: true, force: true });
}

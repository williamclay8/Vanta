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
  return 9900 + Math.floor(Math.random() * 100);
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
      // Keep retrying until server is ready.
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

async function loadFixtures() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-operator-restart-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    const privateCoreSource = readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8");
    const unshieldProofBoundarySource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreUnshieldProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');
    const sendProofBoundarySource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreSendProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');

    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(join(tempTsDir, "vantaPrivateCore.ts"), privateCoreSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"), unshieldProofBoundarySource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreSendProof.ts"), sendProofBoundarySource);

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "vantaPrivateCore.ts"),
        join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"),
        join(tempTsDir, "vantaPrivateCoreSendProof.ts"),
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

    const compiledProofBoundaryPath = join(tempJsDir, "vantaPrivateCoreUnshieldProof.js");
    writeFileSync(
      compiledProofBoundaryPath,
      readFileSync(compiledProofBoundaryPath, "utf8").replace(
        /from "\.\/vantaPrivateCore"/g,
        'from "./vantaPrivateCore.js"',
      ),
    );
    const compiledSendProofBoundaryPath = join(tempJsDir, "vantaPrivateCoreSendProof.js");
    writeFileSync(
      compiledSendProofBoundaryPath,
      readFileSync(compiledSendProofBoundaryPath, "utf8").replace(
        /from "\.\/vantaPrivateCore"/g,
        'from "./vantaPrivateCore.js"',
      ),
    );

    const unshieldModule = await import(pathToFileURL(compiledProofBoundaryPath).href);
    const sendModule = await import(pathToFileURL(compiledSendProofBoundaryPath).href);
    return {
      send: sendModule.getVantaPrivateCoreFixedDepthSendFixtureV0(),
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
    VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(tempRoot, "sends.json"),
    VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, "private-core-releases.json"),
    VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, "roots.json"),
    VANTA_RELEASE_RECORD_STORE_PATH: join(tempRoot, "releases.json"),
    VANTA_SWAP_RECORD_STORE_PATH: join(tempRoot, "swaps.json"),
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

async function stopServer(server) {
  server.kill("SIGTERM");
  await new Promise((resolvePromise) => {
    server.once("exit", () => resolvePromise(undefined));
    setTimeout(() => resolvePromise(undefined), 1000);
  });
}

const fixtures = await loadFixtures();
const witnessPackage = fixtures.unshield.validBoundary.noirWitnessPackage;
const sourceArtifacts = fixtures.unshield.validSourceArtifacts;
const sendWitnessPackage = fixtures.send.validBoundary.noirWitnessPackage;
mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-operator-restart-server-"));
const port = randomPort();
const baseUrl = `http://127.0.0.1:${port}`;

let liveServer = null;
let serverOutput = "";

try {
  let started = startServer(tempRoot, port);
  liveServer = started.server;
  await waitForHealth(baseUrl);

  const registerRoot = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({ sourceArtifacts, witnessPackage }),
    method: "POST",
  });
  if (!registerRoot.ok || registerRoot.parsed?.known !== true) {
    throw new Error(registerRoot.text || "operator restart setup could not register the root");
  }

  const consumeResponse = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({ sourceArtifacts, witnessPackage }),
    method: "POST",
  });
  if (
    !consumeResponse.ok ||
    consumeResponse.parsed?.verified !== true ||
    typeof consumeResponse.parsed?.proofId !== "string" ||
    consumeResponse.parsed?.releaseRecorded !== true
  ) {
    throw new Error(consumeResponse.text || "operator restart setup could not consume the note");
  }
  printStatus("operator restart setup consume: PASS");

  const sendTransitionResponse = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({
      resultingRoot: fixtures.send.validResultingRoot,
      witnessPackage: sendWitnessPackage,
    }),
    method: "POST",
  });
  if (
    !sendTransitionResponse.ok ||
    sendTransitionResponse.parsed?.verified !== true ||
    sendTransitionResponse.parsed?.sendRecorded !== true ||
    sendTransitionResponse.parsed?.circuit !== "vanta_private_core_single_note_send"
  ) {
    throw new Error(
      sendTransitionResponse.text || "operator restart setup could not record the send lane",
    );
  }
  printStatus("operator restart setup send transition: PASS");

  const preRestartRoots = await requestJson(baseUrl, "/state/private-core-roots", { method: "GET" });
  const preRestartSendProofs = await requestJson(baseUrl, "/state/private-core-send-proofs", {
    method: "GET",
  });
  const preRestartSends = await requestJson(baseUrl, "/state/private-core-sends", {
    method: "GET",
  });
  const preRestartSummary = await requestJson(baseUrl, "/state/private-core-summary", {
    method: "GET",
  });

  if (
    !preRestartRoots.ok ||
    preRestartRoots.parsed?.currentRoot !== witnessPackage.sourcePublicInputs.stateRoot ||
    !preRestartSendProofs.ok ||
    preRestartSendProofs.parsed?.stateVersion !== 1 ||
    preRestartSendProofs.parsed?.latestProof?.action !== "send-proof" ||
    preRestartSendProofs.parsed?.latestProof?.circuit !== "vanta_private_core_single_note_send" ||
    !Array.isArray(preRestartSendProofs.parsed?.records) ||
    preRestartSendProofs.parsed.records.length < 1 ||
    !preRestartSends.ok ||
    preRestartSends.parsed?.stateVersion !== 1 ||
    preRestartSends.parsed?.latestSend?.sendId !== sendTransitionResponse.parsed.sendId ||
    preRestartSends.parsed?.latestSend?.proofId !== sendTransitionResponse.parsed.proofId ||
    !Array.isArray(preRestartSends.parsed?.records) ||
    preRestartSends.parsed.records.length < 1 ||
    !preRestartSummary.ok ||
    preRestartSummary.parsed?.stateVersion !== 1 ||
    preRestartSummary.parsed?.summaryVersion !== 6 ||
    preRestartSummary.parsed?.supportedSendLaneVersion !== 1 ||
    preRestartSummary.parsed?.supportedSendLaneKind !== "single-input-single-recipient-optional-change" ||
    preRestartSummary.parsed?.supportedSendLaneStatus !== "supported" ||
    typeof preRestartSummary.parsed?.generatedAt !== "number" ||
    preRestartSummary.parsed?.currentRoot !== witnessPackage.sourcePublicInputs.stateRoot ||
    preRestartSummary.parsed?.latestSendProof?.action !== "send-proof" ||
    preRestartSummary.parsed?.latestSendProof?.circuit !== "vanta_private_core_single_note_send" ||
    preRestartSummary.parsed?.sendProofRecordCount < 1 ||
    preRestartSummary.parsed?.latestSend?.sendId !== sendTransitionResponse.parsed.sendId ||
    preRestartSummary.parsed?.sendRecordCount < 1 ||
    preRestartSummary.parsed?.latestConsume?.proofId !== consumeResponse.parsed.proofId ||
    preRestartSummary.parsed?.latestConsumeProof?.proofId !== consumeResponse.parsed.proofId ||
    preRestartSummary.parsed?.latestRelease?.proofId !== consumeResponse.parsed.proofId ||
    preRestartSummary.parsed?.latestReleaseProof?.proofId !== consumeResponse.parsed.proofId ||
    preRestartSummary.parsed?.currentRootLinkedProof?.proofId !== preRestartSummary.parsed?.currentRecord?.proofId ||
    preRestartSummary.parsed?.currentRootProofLinkStatus !== "linked" ||
    preRestartSummary.parsed?.boundaryStatus !== "coherent" ||
    preRestartSummary.parsed?.boundaryNote !==
      "Current root, consume, release, and linked proofs agree." ||
    preRestartSummary.parsed?.proofConsumeLinkStatus !== "linked" ||
    preRestartSummary.parsed?.proofReleaseLinkStatus !== "linked"
  ) {
    throw new Error("operator restart setup did not produce the expected persisted state");
  }
  printStatus("operator restart pre-shutdown state: PASS");

  await stopServer(liveServer);
  liveServer = null;
  serverOutput = started.getOutput();

  started = startServer(tempRoot, port);
  liveServer = started.server;
  await waitForHealth(baseUrl);

  const postRestartSummary = await requestJson(baseUrl, "/state/private-core-summary", {
    method: "GET",
  });
  const postRestartSendProofs = await requestJson(baseUrl, "/state/private-core-send-proofs", {
    method: "GET",
  });
  const postRestartSends = await requestJson(baseUrl, "/state/private-core-sends", {
    method: "GET",
  });

  if (
    !postRestartSummary.ok ||
    postRestartSummary.parsed?.stateVersion !== 1 ||
    postRestartSummary.parsed?.summaryVersion !== 6 ||
    postRestartSummary.parsed?.supportedSendLaneVersion !== 1 ||
    postRestartSummary.parsed?.supportedSendLaneKind !== "single-input-single-recipient-optional-change" ||
    postRestartSummary.parsed?.supportedSendLaneStatus !== "supported" ||
    typeof postRestartSummary.parsed?.generatedAt !== "number" ||
    postRestartSummary.parsed?.currentRoot !== witnessPackage.sourcePublicInputs.stateRoot ||
    postRestartSummary.parsed?.rootRecordCount < 1
  ) {
    throw new Error(postRestartSummary.text || "operator restart lost root state");
  }

  if (
    !postRestartSendProofs.ok ||
    postRestartSendProofs.parsed?.stateVersion !== 1 ||
    postRestartSendProofs.parsed?.latestProof?.action !== "send-proof" ||
    postRestartSendProofs.parsed?.latestProof?.circuit !== "vanta_private_core_single_note_send" ||
    !Array.isArray(postRestartSendProofs.parsed?.records) ||
    postRestartSendProofs.parsed.records.length < 1
  ) {
    throw new Error(postRestartSendProofs.text || "operator restart lost send-proof state");
  }

  if (
    !postRestartSends.ok ||
    postRestartSends.parsed?.stateVersion !== 1 ||
    postRestartSends.parsed?.latestSend?.sendId !== sendTransitionResponse.parsed.sendId ||
    postRestartSends.parsed?.latestSend?.proofId !== sendTransitionResponse.parsed.proofId ||
    !Array.isArray(postRestartSends.parsed?.records) ||
    postRestartSends.parsed.records.length < 1
  ) {
    throw new Error(postRestartSends.text || "operator restart lost send-transition state");
  }

  if (
    postRestartSummary.parsed?.latestSendProof?.action !== "send-proof" ||
    postRestartSummary.parsed?.latestSendProof?.circuit !== "vanta_private_core_single_note_send" ||
    postRestartSummary.parsed?.sendProofRecordCount < 1 ||
    postRestartSummary.parsed?.latestSend?.sendId !== sendTransitionResponse.parsed.sendId ||
    postRestartSummary.parsed?.sendRecordCount < 1
  ) {
    throw new Error(postRestartSummary.text || "operator restart summary lost send lane state");
  }

  if (
    postRestartSummary.parsed?.latestConsume?.proofId !== consumeResponse.parsed.proofId ||
    postRestartSummary.parsed?.latestConsumeProof?.proofId !== consumeResponse.parsed.proofId ||
    postRestartSummary.parsed?.latestRelease?.proofId !== consumeResponse.parsed.proofId ||
    postRestartSummary.parsed?.latestReleaseProof?.proofId !== consumeResponse.parsed.proofId ||
    postRestartSummary.parsed?.proofRecordCount < 2 ||
    postRestartSummary.parsed?.currentRootLinkedProof?.proofId !== postRestartSummary.parsed?.currentRecord?.proofId ||
    postRestartSummary.parsed?.currentRootProofLinkStatus !== "linked" ||
    postRestartSummary.parsed?.boundaryStatus !== "coherent" ||
    postRestartSummary.parsed?.boundaryNote !==
      "Current root, consume, release, and linked proofs agree." ||
    postRestartSummary.parsed?.proofConsumeLinkStatus !== "linked" ||
    postRestartSummary.parsed?.proofReleaseLinkStatus !== "linked"
  ) {
    throw new Error(postRestartSummary.text || "operator restart lost linked proof/consume/release state");
  }
  printStatus("operator restart persisted state: PASS");

  const replayAfterRestart = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({ sourceArtifacts, witnessPackage }),
    method: "POST",
  });
  if (!replayAfterRestart.text.includes("has already been consumed")) {
    throw new Error(replayAfterRestart.text || "operator restart lost replay rejection state");
  }
  printStatus("operator restart replay rejection: PASS");

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
    !operatorStatusOutput.includes("Summary version: 6") ||
    !operatorStatusOutput.includes("Supported send lane version: 1") ||
    !operatorStatusOutput.includes("Supported send lane status: Supported") ||
    !operatorStatusOutput.includes("Latest proof action: consume") ||
    !operatorStatusOutput.includes("Latest send proof action: send-proof") ||
    !operatorStatusOutput.includes("Latest send transition:") ||
    !operatorStatusOutput.includes("Latest send resulting root:") ||
    !operatorStatusOutput.includes("Summary generated:") ||
    !operatorStatusOutput.includes("Latest consume proof:") ||
    !operatorStatusOutput.includes("Latest release proof:") ||
    !operatorStatusOutput.includes("Boundary status: Operator boundary coherent")
  ) {
    throw new Error(operatorStatusOutput || "operator restart status output did not reflect persisted state");
  }
  printStatus("operator restart operator-status: PASS");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  if (serverOutput) {
    console.error(serverOutput);
  }
  process.exitCode = 1;
} finally {
  if (liveServer) {
    await stopServer(liveServer);
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

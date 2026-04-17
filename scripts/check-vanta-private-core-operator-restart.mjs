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
    preRestartSummary.parsed?.summaryVersion !== 42 ||
    preRestartSummary.parsed?.contractMirrorStatus !== "mirrors-contract" ||
    preRestartSummary.parsed?.contractMirrorNote !==
      "Operator summary mirrors the frozen private-core contract across all supported static fields." ||
    preRestartSummary.parsed?.supportedSendLaneVersion !== 1 ||
    preRestartSummary.parsed?.supportedSendLaneKind !== "single-input-single-recipient-optional-change" ||
    preRestartSummary.parsed?.supportedSendLaneStatus !== "supported" ||
    preRestartSummary.parsed?.supportedSendV1Decision !== "accepted-narrow-v1-path" ||
    preRestartSummary.parsed?.supportedUnshieldLaneVersion !== 1 ||
    preRestartSummary.parsed?.supportedUnshieldLaneKind !== "single-note-proof-backed-consume" ||
    preRestartSummary.parsed?.supportedUnshieldLaneStatus !== "supported" ||
    preRestartSummary.parsed?.supportedUnshieldV1Decision !== "accepted-narrow-v1-path" ||
    preRestartSummary.parsed?.supportedReleaseLaneVersion !== 1 ||
    preRestartSummary.parsed?.supportedReleaseLaneKind !==
      "proof-backed-consume-latest-registered-root" ||
    preRestartSummary.parsed?.supportedReleaseLaneStatus !== "supported" ||
    typeof preRestartSummary.parsed?.supportedReleaseLaneNote !== "string" ||
    preRestartSummary.parsed?.supportedSwapLaneVersion !== 1 ||
    preRestartSummary.parsed?.supportedSwapLaneKind !== "single-input-vusd-to-shielded-sol" ||
    preRestartSummary.parsed?.supportedSwapLaneStatus !== "supported" ||
    typeof preRestartSummary.parsed?.supportedSwapLaneNote !== "string" ||
    preRestartSummary.parsed?.supportedSwapV1Decision !== "accepted-narrow-v1-path" ||
    typeof preRestartSummary.parsed?.supportedSwapV1DecisionNote !== "string" ||
    preRestartSummary.parsed?.supportedSwapV1Role !==
      "adjacent-supported-not-required-for-finish-line" ||
    typeof preRestartSummary.parsed?.supportedSwapV1RoleNote !== "string" ||
    preRestartSummary.parsed?.supportedSwapVenue !== "meteora-dlmm-devnet" ||
    preRestartSummary.parsed?.supportedSwapOutputModel !== "shielded-sol-output-note" ||
    preRestartSummary.parsed?.supportedSwapResultingRootBasis !== "client-declared" ||
    preRestartSummary.parsed?.supportedSwapInputRootPolicy !==
      "latest-registered-root-with-linked-registration-proof" ||
    preRestartSummary.parsed?.supportedSwapOutputRegistrationPolicy !==
      "resulting-root-must-register-as-swap-output" ||
    preRestartSummary.parsed?.supportedFlowVersion !== 1 ||
    preRestartSummary.parsed?.supportedFlowKind !== "shield-hold-send-unshield-replay-guard" ||
    preRestartSummary.parsed?.supportedFlowStatus !== "supported" ||
    typeof preRestartSummary.parsed?.supportedFlowNote !== "string" ||
    preRestartSummary.parsed?.supportedZkV1ScopeDecision !==
      "accepted-narrow-private-core-v1-scope" ||
    typeof preRestartSummary.parsed?.supportedZkV1ScopeNote !== "string" ||
    preRestartSummary.parsed?.supportedZkV1RequiredLanes !== "send|unshield|release" ||
    typeof preRestartSummary.parsed?.supportedZkV1RequiredLanesNote !== "string" ||
    preRestartSummary.parsed?.supportedAssetSymbol !== "VUSD" ||
    preRestartSummary.parsed?.supportedEnvironment !== "solana-devnet" ||
    preRestartSummary.parsed?.supportedNoteSchema !== "note-v0" ||
    preRestartSummary.parsed?.supportedNoteVersion !== 0 ||
    preRestartSummary.parsed?.supportedRootRegistrationProvenance !==
      "shield-input|send-recipient-output|send-change-output|swap-output" ||
    preRestartSummary.parsed?.supportedSendResultingRootBasis !== "client-declared" ||
    preRestartSummary.parsed?.supportedRecipientModel !== "hashed-reference-to-owner-key" ||
    preRestartSummary.parsed?.supportedReleaseDestinationModel !==
      "32-byte-release-destination-field" ||
    preRestartSummary.parsed?.supportedProofSystem !== "noir-acir-ultrahonk-bbjs" ||
    preRestartSummary.parsed?.supportedUnshieldCircuit !==
      "vanta_private_core_single_note_unshield" ||
    preRestartSummary.parsed?.supportedSendCircuit !== "vanta_private_core_single_note_send" ||
    preRestartSummary.parsed?.supportedUnshieldMerkleDepth !== 3 ||
    preRestartSummary.parsed?.supportedSendMerkleDepth !== 3 ||
    preRestartSummary.parsed?.supportedReleaseAuthorizationBasis !== "proof-backed-consume" ||
    preRestartSummary.parsed?.supportedReleaseRootPolicy !== "latest-registered-root" ||
    preRestartSummary.parsed?.ownerAuthorizationMode !== "x25519-secret-prechecked-off-circuit" ||
    preRestartSummary.parsed?.nullifierKeyMode !== "note-secret-as-nullifier-key-v0" ||
    preRestartSummary.parsed?.provingHashLane !== "poseidon-bn254-proving-lane-v0" ||
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
    preRestartSummary.parsed?.sendBoundaryStatus !== "awaiting-registration" ||
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
    postRestartSummary.parsed?.summaryVersion !== 42 ||
    postRestartSummary.parsed?.contractMirrorStatus !== "mirrors-contract" ||
    postRestartSummary.parsed?.contractMirrorNote !==
      "Operator summary mirrors the frozen private-core contract across all supported static fields." ||
    postRestartSummary.parsed?.supportedSendLaneVersion !== 1 ||
    postRestartSummary.parsed?.supportedSendLaneKind !== "single-input-single-recipient-optional-change" ||
    postRestartSummary.parsed?.supportedSendLaneStatus !== "supported" ||
    postRestartSummary.parsed?.supportedSendV1Decision !== "accepted-narrow-v1-path" ||
    postRestartSummary.parsed?.supportedUnshieldLaneVersion !== 1 ||
    postRestartSummary.parsed?.supportedUnshieldLaneKind !== "single-note-proof-backed-consume" ||
    postRestartSummary.parsed?.supportedUnshieldLaneStatus !== "supported" ||
    postRestartSummary.parsed?.supportedUnshieldV1Decision !== "accepted-narrow-v1-path" ||
    postRestartSummary.parsed?.supportedReleaseLaneVersion !== 1 ||
    postRestartSummary.parsed?.supportedReleaseLaneKind !==
      "proof-backed-consume-latest-registered-root" ||
    postRestartSummary.parsed?.supportedReleaseLaneStatus !== "supported" ||
    typeof postRestartSummary.parsed?.supportedReleaseLaneNote !== "string" ||
    postRestartSummary.parsed?.supportedSwapLaneVersion !== 1 ||
    postRestartSummary.parsed?.supportedSwapLaneKind !== "single-input-vusd-to-shielded-sol" ||
    postRestartSummary.parsed?.supportedSwapLaneStatus !== "supported" ||
    typeof postRestartSummary.parsed?.supportedSwapLaneNote !== "string" ||
    postRestartSummary.parsed?.supportedSwapV1Decision !== "accepted-narrow-v1-path" ||
    typeof postRestartSummary.parsed?.supportedSwapV1DecisionNote !== "string" ||
    postRestartSummary.parsed?.supportedSwapV1Role !==
      "adjacent-supported-not-required-for-finish-line" ||
    typeof postRestartSummary.parsed?.supportedSwapV1RoleNote !== "string" ||
    postRestartSummary.parsed?.supportedSwapVenue !== "meteora-dlmm-devnet" ||
    postRestartSummary.parsed?.supportedSwapOutputModel !== "shielded-sol-output-note" ||
    postRestartSummary.parsed?.supportedSwapResultingRootBasis !== "client-declared" ||
    postRestartSummary.parsed?.supportedSwapInputRootPolicy !==
      "latest-registered-root-with-linked-registration-proof" ||
    postRestartSummary.parsed?.supportedSwapOutputRegistrationPolicy !==
      "resulting-root-must-register-as-swap-output" ||
    postRestartSummary.parsed?.supportedFlowVersion !== 1 ||
    postRestartSummary.parsed?.supportedFlowKind !== "shield-hold-send-unshield-replay-guard" ||
    postRestartSummary.parsed?.supportedFlowStatus !== "supported" ||
    typeof postRestartSummary.parsed?.supportedFlowNote !== "string" ||
    postRestartSummary.parsed?.supportedZkV1ScopeDecision !==
      "accepted-narrow-private-core-v1-scope" ||
    typeof postRestartSummary.parsed?.supportedZkV1ScopeNote !== "string" ||
    postRestartSummary.parsed?.supportedZkV1RequiredLanes !== "send|unshield|release" ||
    typeof postRestartSummary.parsed?.supportedZkV1RequiredLanesNote !== "string" ||
    postRestartSummary.parsed?.supportedAssetSymbol !== "VUSD" ||
    postRestartSummary.parsed?.supportedEnvironment !== "solana-devnet" ||
    postRestartSummary.parsed?.supportedNoteSchema !== "note-v0" ||
    postRestartSummary.parsed?.supportedNoteVersion !== 0 ||
    postRestartSummary.parsed?.supportedRootRegistrationProvenance !==
      "shield-input|send-recipient-output|send-change-output|swap-output" ||
    postRestartSummary.parsed?.supportedSendResultingRootBasis !== "client-declared" ||
    postRestartSummary.parsed?.supportedRecipientModel !== "hashed-reference-to-owner-key" ||
    postRestartSummary.parsed?.supportedReleaseDestinationModel !==
      "32-byte-release-destination-field" ||
    postRestartSummary.parsed?.supportedProofSystem !== "noir-acir-ultrahonk-bbjs" ||
    postRestartSummary.parsed?.supportedUnshieldCircuit !==
      "vanta_private_core_single_note_unshield" ||
    postRestartSummary.parsed?.supportedSendCircuit !== "vanta_private_core_single_note_send" ||
    postRestartSummary.parsed?.supportedUnshieldMerkleDepth !== 3 ||
    postRestartSummary.parsed?.supportedSendMerkleDepth !== 3 ||
    postRestartSummary.parsed?.supportedReleaseAuthorizationBasis !== "proof-backed-consume" ||
    postRestartSummary.parsed?.supportedReleaseRootPolicy !== "latest-registered-root" ||
    postRestartSummary.parsed?.ownerAuthorizationMode !== "x25519-secret-prechecked-off-circuit" ||
    postRestartSummary.parsed?.nullifierKeyMode !== "note-secret-as-nullifier-key-v0" ||
    postRestartSummary.parsed?.provingHashLane !== "poseidon-bn254-proving-lane-v0" ||
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
    postRestartSummary.parsed?.sendBoundaryStatus !== "awaiting-registration" ||
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
    !operatorStatusOutput.includes("Summary version: 42") ||
    !operatorStatusOutput.includes("Required lanes status: Send lane mismatch") ||
    !operatorStatusOutput.includes(
      "Required lanes note: Latest send resulting root still needs operator registration before downstream continuity is established.",
    ) ||
    !operatorStatusOutput.includes("zk v1 shipping status: Required lanes mismatch") ||
    !operatorStatusOutput.includes(
      "zk v1 shipping note: Latest send resulting root still needs operator registration before downstream continuity is established.",
    ) ||
    !operatorStatusOutput.includes("Mirrored contract version: 18") ||
    !operatorStatusOutput.includes("zk v1 finish line status: Coherent minimum v1 lane") ||
    !operatorStatusOutput.includes(
      "zk v1 finish line note: Frozen minimum zk v1 send/unshield/release lane is coherent at the operator boundary.",
    ) ||
    !operatorStatusOutput.includes("Release boundary status: Release recorded") ||
    !operatorStatusOutput.includes(
      "Release boundary note: Latest private-core release is recorded, proof-linked, and consistent with the frozen release contract.",
    ) ||
    !operatorStatusOutput.includes("Supported operator snapshot version: 1") ||
    !operatorStatusOutput.includes(
      "Supported operator snapshot kind: contract-status-shipping-bundle",
    ) ||
    !operatorStatusOutput.includes(
      "Supported operator snapshot note: Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together.",
    ) ||
    !operatorStatusOutput.includes(
      "Supported swap v1 role: adjacent-supported-not-required-for-finish-line",
    ) ||
    !operatorStatusOutput.includes(
      "Supported swap v1 role note: Current constrained swap lane is supported operator-backed infrastructure in the repo, but it is not required for the minimum zk v1 finish line.",
    ) ||
    !operatorStatusOutput.includes(
      "Supported zk v1 scope decision: accepted-narrow-private-core-v1-scope",
    ) ||
    !operatorStatusOutput.includes(
      "Supported zk v1 scope note: Current zk v1 finish line is the narrow private-core lane frozen in this repo, not the broader long-term privacy product surface.",
    ) ||
    !operatorStatusOutput.includes("Supported zk v1 required lanes: send|unshield|release") ||
    !operatorStatusOutput.includes(
      "Supported zk v1 required lanes note: Minimum zk v1 finish line requires the narrow private-core send, unshield, and release lanes; constrained swap remains adjacent supported infrastructure.",
    ) ||
    !operatorStatusOutput.includes("Supported send v1 decision: Accepted narrow v1 path") ||
    !operatorStatusOutput.includes("Supported unshield v1 decision: Accepted narrow v1 path") ||
    !operatorStatusOutput.includes("Supported swap lane version: 1") ||
    !operatorStatusOutput.includes("Supported swap lane kind: Single input VUSD to shielded SOL") ||
    !operatorStatusOutput.includes("Supported swap lane status: Supported") ||
    !operatorStatusOutput.includes("Supported swap v1 decision: Accepted narrow v1 path") ||
    !operatorStatusOutput.includes("Supported swap venue: Meteora DLMM devnet") ||
    !operatorStatusOutput.includes("Supported swap output model: Shielded SOL output note") ||
    !operatorStatusOutput.includes("Supported swap root basis: Client-declared") ||
    !operatorStatusOutput.includes(
      "Supported swap input-root policy: Latest registered root with linked registration proof",
    ) ||
    !operatorStatusOutput.includes(
      "Supported swap output registration: Resulting root must register as swap output",
    ) ||
    !operatorStatusOutput.includes(
      "Supported send input-root policy: Latest registered root with linked registration proof",
    ) ||
    !operatorStatusOutput.includes(
      "Supported send output registration: Resulting root must register as recipient or change output",
    ) ||
    !operatorStatusOutput.includes("Supported release v1 decision: Accepted narrow v1 path") ||
    !operatorStatusOutput.includes("Supported release execution: Operator-recorded devnet release") ||
    !operatorStatusOutput.includes(
      "Supported release atomicity: Operator-local atomic consume + release record",
    ) ||
    !operatorStatusOutput.includes("Snapshot version: 1") ||
    !operatorStatusOutput.includes("Snapshot kind: contract-status-shipping-bundle") ||
    !operatorStatusOutput.includes("Supported operator snapshot transport: dedicated-endpoint") ||
    !operatorStatusOutput.includes(
      "Supported operator snapshot endpoint: /state/private-core-snapshot",
    ) ||
    !operatorStatusOutput.includes("Supported shipping artifact version: 1") ||
    !operatorStatusOutput.includes(
      "Supported shipping artifact kind: shipping-decision-checked-snapshot-bundle",
    ) ||
    !operatorStatusOutput.includes(
      "Supported shipping artifact transport: dedicated-endpoint",
    ) ||
    !operatorStatusOutput.includes(
      "Supported shipping artifact endpoint: /state/private-core-shipping-artifact",
    ) ||
    !operatorStatusOutput.includes("Supported release persistence: JSON store v1") ||
    !operatorStatusOutput.includes(
      "Owner authorization decision: Accepted v1 off-circuit precheck",
    ) ||
    !operatorStatusOutput.includes("Source artifact truth: Source-layer artifact bundle") ||
    !operatorStatusOutput.includes(
      "Proving artifact truth: Verified proving public-input vector",
    ) ||
    !operatorStatusOutput.includes(
      "Source/proving relationship: Explicit split / no implicit equality",
    ) ||
    !operatorStatusOutput.includes(
      "Nullifier key decision: Accepted v1 temporary note-secret key",
    ) ||
    !operatorStatusOutput.includes("Supported send lane version: 1") ||
    !operatorStatusOutput.includes("Supported unshield lane version: 1") ||
    !operatorStatusOutput.includes("Supported proof system: Noir ACIR / UltraHonk / bb.js") ||
    !operatorStatusOutput.includes("Latest proof action: consume") ||
    !operatorStatusOutput.includes("Latest send proof action: send-proof") ||
    !operatorStatusOutput.includes("Latest send transition:") ||
    !operatorStatusOutput.includes("Latest send resulting root:") ||
    !operatorStatusOutput.includes("Latest swap execution venue: Unavailable") ||
    !operatorStatusOutput.includes("Latest swap quote reference: Unavailable") ||
    !operatorStatusOutput.includes("Send continuity status: Awaiting registration") ||
    !operatorStatusOutput.includes("Send boundary status: Awaiting registration") ||
    !operatorStatusOutput.includes("Proof/send link: linked") ||
    !operatorStatusOutput.includes("Proof/consume link: linked") ||
    !operatorStatusOutput.includes("Proof/release link: linked") ||
    !operatorStatusOutput.includes("Contract mirror status: Summary mirrors frozen contract") ||
    !operatorStatusOutput.includes("Boundary status: Operator boundary coherent")
  ) {
    throw new Error(operatorStatusOutput || "operator restart status output did not reflect persisted state");
  }
  printStatus("operator restart operator-status: PASS");

  const operatorStatusJsonOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:operator-status-json",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const operatorStatusJson = JSON.parse(operatorStatusJsonOutput);
  if (
    operatorStatusJson.operator !== baseUrl ||
    operatorStatusJson.snapshotVersion !== 1 ||
    operatorStatusJson.snapshotKind !== "contract-status-shipping-bundle" ||
    operatorStatusJson.summary?.stateVersion !== 1 ||
    operatorStatusJson.summary?.contractVersion !== 18 ||
    operatorStatusJson.summary?.summaryVersion !== 42 ||
    operatorStatusJson.summary?.requiredLanesStatus !== "send-lane-mismatch" ||
    operatorStatusJson.summary?.zkV1ShippingStatus !== "required-lanes-mismatch" ||
    operatorStatusJson.summary?.releaseBoundaryStatus !== "release-recorded" ||
    operatorStatusJson.summary?.contractMirrorStatus !== "mirrors-contract" ||
    operatorStatusJson.summary?.boundaryStatus !== "coherent" ||
    operatorStatusJson.shippingDecision?.decisionVersion !== 1 ||
    operatorStatusJson.shippingDecision?.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    operatorStatusJson.shippingDecision?.decisionStatus !== "blocked" ||
    operatorStatusJson.shippingDecision?.contractVersion !== 18 ||
    operatorStatusJson.shippingDecision?.summaryVersion !== 42
  ) {
    throw new Error(
      `Unexpected operator-status JSON output after restart\n${JSON.stringify(operatorStatusJson, null, 2)}`,
    );
  }
  printStatus("operator restart operator-status json: PASS");

  const shippingStatusOutput = execFileSync("node", [
    "scripts/print-vanta-private-core-shipping-status.mjs",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (
    !shippingStatusOutput.includes("Summary state version: 1") ||
    !shippingStatusOutput.includes("Mirrored contract version: 18") ||
    !shippingStatusOutput.includes("Summary version: 42") ||
    !shippingStatusOutput.includes("Summary generated:") ||
    !shippingStatusOutput.includes("Shipping status: Required lanes mismatch") ||
    !shippingStatusOutput.includes(
      "Shipping note: Latest send resulting root still needs operator registration before downstream continuity is established.",
    ) ||
    !shippingStatusOutput.includes("Finish line status: Coherent minimum v1 lane") ||
    !shippingStatusOutput.includes(
      "Finish line note: Frozen minimum zk v1 send/unshield/release lane is coherent at the operator boundary.",
    ) ||
    !shippingStatusOutput.includes("Required lanes status: Send lane mismatch") ||
    !shippingStatusOutput.includes("Release boundary status: Release recorded") ||
    !shippingStatusOutput.includes("Contract mirror status: Summary mirrors frozen contract") ||
    !shippingStatusOutput.includes("Boundary status: Operator boundary coherent")
  ) {
    throw new Error(`Unexpected restart shipping-status output\n${shippingStatusOutput}`);
  }
  printStatus("operator restart shipping-status: PASS");

  const operatorShippingDecisionStatusOutput = execFileSync("node", [
    "scripts/print-vanta-private-core-operator-status.mjs",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (
    !operatorShippingDecisionStatusOutput.includes("Shipping decision version: 1") ||
    !operatorShippingDecisionStatusOutput.includes("Shipping decision kind: narrow-private-core-zk-v1-shipping") ||
    !operatorShippingDecisionStatusOutput.includes("Shipping decision status: Blocked") ||
    !operatorShippingDecisionStatusOutput.includes(
      "Shipping decision note: Latest send resulting root still needs operator registration before downstream continuity is established.",
    )
  ) {
    throw new Error(
      `Unexpected operator restart shipping-decision status output\n${operatorShippingDecisionStatusOutput}`,
    );
  }
  printStatus("operator restart operator-status shipping decision: PASS");

  const shippingStatusJsonOutput = execFileSync("node", [
    "scripts/print-vanta-private-core-shipping-status.mjs",
    "--base-url",
    baseUrl,
    "--json",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const shippingStatusJson = JSON.parse(shippingStatusJsonOutput);
  if (
    shippingStatusJson.decisionVersion !== 1 ||
    shippingStatusJson.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    shippingStatusJson.decisionStatusRaw !== "blocked" ||
    shippingStatusJson.decisionStatus !== "Blocked" ||
    shippingStatusJson.decisionNote !==
      "Latest send resulting root still needs operator registration before downstream continuity is established." ||
    shippingStatusJson.summaryStateVersion !== 1 ||
    shippingStatusJson.mirroredContractVersion !== 18 ||
    shippingStatusJson.summaryVersion !== 42 ||
    typeof shippingStatusJson.summaryGenerated !== "number" ||
    shippingStatusJson.shippingStatusRaw !== "required-lanes-mismatch" ||
    shippingStatusJson.shippingStatus !== "Required lanes mismatch" ||
    shippingStatusJson.shippingNote !==
      "Latest send resulting root still needs operator registration before downstream continuity is established." ||
    shippingStatusJson.finishLineStatusRaw !== "coherent-minimum-v1-lane" ||
    shippingStatusJson.requiredLanesStatusRaw !== "send-lane-mismatch" ||
    shippingStatusJson.releaseBoundaryStatusRaw !== "release-recorded" ||
    shippingStatusJson.contractMirrorStatusRaw !== "mirrors-contract" ||
    shippingStatusJson.boundaryStatusRaw !== "coherent"
  ) {
    throw new Error(
      `Unexpected restart shipping-status JSON output\n${JSON.stringify(shippingStatusJson, null, 2)}`,
    );
  }
  printStatus("operator restart shipping-status json: PASS");

  const shippingDecisionState = await requestJson(baseUrl, "/state/private-core-shipping-decision", {
    method: "GET",
  });
  if (
    !shippingDecisionState.ok ||
    shippingDecisionState.parsed?.stateVersion !== 1 ||
    shippingDecisionState.parsed?.decisionVersion !== 1 ||
    shippingDecisionState.parsed?.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    shippingDecisionState.parsed?.decisionStatus !== "blocked" ||
    shippingDecisionState.parsed?.decisionNote !==
      "Latest send resulting root still needs operator registration before downstream continuity is established." ||
    shippingDecisionState.parsed?.contractVersion !== 18 ||
    shippingDecisionState.parsed?.summaryVersion !== 42 ||
    typeof shippingDecisionState.parsed?.generatedAt !== "number" ||
    shippingDecisionState.parsed?.shippingStatus !== "required-lanes-mismatch" ||
    shippingDecisionState.parsed?.finishLineStatus !== "coherent-minimum-v1-lane" ||
    shippingDecisionState.parsed?.requiredLanesStatus !== "send-lane-mismatch" ||
    shippingDecisionState.parsed?.releaseBoundaryStatus !== "release-recorded" ||
    shippingDecisionState.parsed?.contractMirrorStatus !== "mirrors-contract" ||
    shippingDecisionState.parsed?.boundaryStatus !== "coherent"
  ) {
    throw new Error(
      shippingDecisionState.text ||
        `Unexpected restart shipping-decision state\n${JSON.stringify(shippingDecisionState.parsed, null, 2)}`,
    );
  }
  printStatus("operator restart shipping-decision state: PASS");

  let blockedShippingCheckJson = null;
  try {
    execFileSync(
      "npm",
      ["run", "--silent", "private-core:shipping-check-json", "--", "--base-url", baseUrl],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: "pipe",
      },
    );
  } catch (error) {
    blockedShippingCheckJson = error;
  }
  const blockedShippingCheckJsonOutput =
    blockedShippingCheckJson &&
    typeof blockedShippingCheckJson === "object" &&
    "stderr" in blockedShippingCheckJson &&
    typeof blockedShippingCheckJson.stderr === "string"
      ? blockedShippingCheckJson.stderr
      : "";
  const blockedShippingCheckJsonStart = blockedShippingCheckJsonOutput.indexOf("{");
  const blockedShippingCheckJsonEnd = blockedShippingCheckJsonOutput.lastIndexOf("}");
  if (
    !blockedShippingCheckJson ||
    blockedShippingCheckJsonStart === -1 ||
    blockedShippingCheckJsonEnd === -1 ||
    !blockedShippingCheckJsonOutput.includes("Shipping status: Required lanes mismatch") ||
    !blockedShippingCheckJsonOutput.includes(
      "Shipping note: Latest send resulting root still needs operator registration before downstream continuity is established.",
    )
  ) {
    throw new Error(
      blockedShippingCheckJsonOutput ||
        "operator restart shipping-check-json did not fail with structured output",
    );
  }
  const blockedShippingCheckJsonSurface = JSON.parse(
    blockedShippingCheckJsonOutput.slice(
      blockedShippingCheckJsonStart,
      blockedShippingCheckJsonEnd + 1,
    ),
  );
  if (
    blockedShippingCheckJsonSurface.decisionVersion !== 1 ||
    blockedShippingCheckJsonSurface.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    blockedShippingCheckJsonSurface.decisionStatusRaw !== "blocked" ||
    blockedShippingCheckJsonSurface.decisionStatus !== "Blocked" ||
    blockedShippingCheckJsonSurface.decisionNote !==
      "Latest send resulting root still needs operator registration before downstream continuity is established." ||
    blockedShippingCheckJsonSurface.summaryStateVersion !== 1 ||
    blockedShippingCheckJsonSurface.mirroredContractVersion !== 18 ||
    blockedShippingCheckJsonSurface.summaryVersion !== 42 ||
    typeof blockedShippingCheckJsonSurface.summaryGenerated !== "number" ||
    blockedShippingCheckJsonSurface.shippingStatusRaw !== "required-lanes-mismatch" ||
    blockedShippingCheckJsonSurface.finishLineStatusRaw !== "coherent-minimum-v1-lane" ||
    blockedShippingCheckJsonSurface.requiredLanesStatusRaw !== "send-lane-mismatch" ||
    blockedShippingCheckJsonSurface.releaseBoundaryStatusRaw !== "release-recorded" ||
    blockedShippingCheckJsonSurface.contractMirrorStatusRaw !== "mirrors-contract" ||
    blockedShippingCheckJsonSurface.boundaryStatusRaw !== "coherent"
  ) {
    throw new Error(
      `Unexpected operator restart shipping-check-json output\n${JSON.stringify(
        blockedShippingCheckJsonSurface,
        null,
        2,
      )}`,
    );
  }
  printStatus("operator restart shipping-check-json surface: PASS");

  let blockedOperatorSnapshotCheckJson = null;
  try {
    execFileSync(
      "npm",
      ["run", "--silent", "private-core:operator-snapshot-check-json", "--", "--base-url", baseUrl],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: "pipe",
      },
    );
  } catch (error) {
    blockedOperatorSnapshotCheckJson = error;
  }
  const blockedOperatorSnapshotCheckJsonOutput =
    blockedOperatorSnapshotCheckJson &&
    typeof blockedOperatorSnapshotCheckJson === "object" &&
    "stderr" in blockedOperatorSnapshotCheckJson &&
    typeof blockedOperatorSnapshotCheckJson.stderr === "string"
      ? blockedOperatorSnapshotCheckJson.stderr
      : "";
  const blockedOperatorSnapshotCheckJsonStart =
    blockedOperatorSnapshotCheckJsonOutput.indexOf("{");
  const blockedOperatorSnapshotCheckJsonEnd =
    blockedOperatorSnapshotCheckJsonOutput.lastIndexOf("}");
  if (
    !blockedOperatorSnapshotCheckJson ||
    blockedOperatorSnapshotCheckJsonStart === -1 ||
    blockedOperatorSnapshotCheckJsonEnd === -1 ||
    !blockedOperatorSnapshotCheckJsonOutput.includes("Snapshot decision status: Blocked") ||
    !blockedOperatorSnapshotCheckJsonOutput.includes(
      "Snapshot decision note: Latest send resulting root still needs operator registration before downstream continuity is established.",
    )
  ) {
    throw new Error(
      blockedOperatorSnapshotCheckJsonOutput ||
        "operator restart operator-snapshot-check json did not fail with structured output",
    );
  }
  const blockedOperatorSnapshotCheckJsonSurface = JSON.parse(
    blockedOperatorSnapshotCheckJsonOutput.slice(
      blockedOperatorSnapshotCheckJsonStart,
      blockedOperatorSnapshotCheckJsonEnd + 1,
    ),
  );
  if (
    blockedOperatorSnapshotCheckJsonSurface.snapshotVersion !== 1 ||
    blockedOperatorSnapshotCheckJsonSurface.snapshotKind !== "contract-status-shipping-bundle" ||
    blockedOperatorSnapshotCheckJsonSurface.contract?.contractVersion !== 18 ||
    blockedOperatorSnapshotCheckJsonSurface.contract?.summaryVersion !== 42 ||
    blockedOperatorSnapshotCheckJsonSurface.shipping?.decisionStatusRaw !== "blocked" ||
    blockedOperatorSnapshotCheckJsonSurface.shipping?.shippingStatusRaw !==
      "required-lanes-mismatch"
  ) {
    throw new Error(
      `Unexpected operator restart operator-snapshot-check json output\n${JSON.stringify(
        blockedOperatorSnapshotCheckJsonSurface,
        null,
        2,
      )}`,
    );
  }
  printStatus("operator restart operator-snapshot-check json: PASS");

  const operatorSnapshotState = await requestJson(baseUrl, "/state/private-core-snapshot", {
    method: "GET",
  });
  if (
    !operatorSnapshotState.ok ||
    operatorSnapshotState.parsed?.operator !== baseUrl ||
    operatorSnapshotState.parsed?.snapshotVersion !== 1 ||
    operatorSnapshotState.parsed?.snapshotKind !== "contract-status-shipping-bundle" ||
    operatorSnapshotState.parsed?.contract?.contractVersion !== 18 ||
    operatorSnapshotState.parsed?.contract?.summaryVersion !== 42 ||
    operatorSnapshotState.parsed?.contract?.supportedOperatorSnapshotTransport !==
      "dedicated-endpoint" ||
    operatorSnapshotState.parsed?.contract?.supportedOperatorSnapshotEndpoint !==
      "/state/private-core-snapshot" ||
    operatorSnapshotState.parsed?.status?.summary?.contractVersion !== 18 ||
    operatorSnapshotState.parsed?.status?.summary?.summaryVersion !== 42 ||
    operatorSnapshotState.parsed?.status?.shippingDecision?.decisionVersion !== 1 ||
    operatorSnapshotState.parsed?.shipping?.decisionVersion !== 1 ||
    operatorSnapshotState.parsed?.shipping?.decisionKind !==
      "narrow-private-core-zk-v1-shipping"
  ) {
    throw new Error(
      operatorSnapshotState.text ||
        "operator restart snapshot endpoint returned invalid data after restart",
    );
  }
  printStatus("operator restart snapshot endpoint: PASS");

  const operatorSnapshotJsonOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:operator-snapshot-json",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const operatorSnapshotJson = JSON.parse(operatorSnapshotJsonOutput);
  if (
    operatorSnapshotJson.operator !== baseUrl ||
    operatorSnapshotJson.snapshotVersion !== 1 ||
    operatorSnapshotJson.snapshotKind !== "contract-status-shipping-bundle" ||
    operatorSnapshotJson.contract?.contractVersion !== 18 ||
    operatorSnapshotJson.contract?.summaryVersion !== 42 ||
    operatorSnapshotJson.contract?.supportedOperatorSnapshotVersion !== 1 ||
    operatorSnapshotJson.contract?.supportedOperatorSnapshotKind !==
      "contract-status-shipping-bundle" ||
    operatorSnapshotJson.status?.summary?.stateVersion !== 1 ||
    operatorSnapshotJson.status?.summary?.contractVersion !== 18 ||
    operatorSnapshotJson.status?.summary?.summaryVersion !== 42 ||
    operatorSnapshotJson.status?.summary?.supportedOperatorSnapshotVersion !== 1 ||
    operatorSnapshotJson.status?.summary?.supportedOperatorSnapshotKind !==
      "contract-status-shipping-bundle" ||
    operatorSnapshotJson.status?.shippingDecision?.decisionVersion !== 1 ||
    operatorSnapshotJson.status?.shippingDecision?.decisionKind !==
      "narrow-private-core-zk-v1-shipping" ||
    operatorSnapshotJson.shipping?.decisionVersion !== 1 ||
    operatorSnapshotJson.shipping?.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    operatorSnapshotJson.shipping?.decisionStatusRaw !== "blocked" ||
    operatorSnapshotJson.shipping?.shippingStatusRaw !== "required-lanes-mismatch"
  ) {
    throw new Error(
      `Unexpected operator snapshot JSON output after restart\n${JSON.stringify(operatorSnapshotJson, null, 2)}`,
    );
  }
  printStatus("operator restart operator-snapshot json: PASS");

  const operatorSnapshotOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:operator-snapshot",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (
    !operatorSnapshotOutput.includes("Snapshot version: 1") ||
    !operatorSnapshotOutput.includes("Snapshot kind: contract-status-shipping-bundle") ||
    !operatorSnapshotOutput.includes("Snapshot transport: dedicated-endpoint") ||
    !operatorSnapshotOutput.includes("Snapshot endpoint: /state/private-core-snapshot") ||
    !operatorSnapshotOutput.includes("Contract version: 18") ||
    !operatorSnapshotOutput.includes("Decision status: Blocked") ||
    !operatorSnapshotOutput.includes("Shipping status: Required lanes mismatch")
  ) {
    throw new Error(
      operatorSnapshotOutput ||
        "operator restart operator-snapshot surface returned unexpected output",
    );
  }
  printStatus("operator restart operator-snapshot surface: PASS");

  let blockedShippingArtifactCheckJson = null;
  try {
    execFileSync(
      "npm",
      ["run", "--silent", "private-core:shipping-artifact-check-json", "--", "--base-url", baseUrl],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: "pipe",
      },
    );
  } catch (error) {
    blockedShippingArtifactCheckJson = error;
  }
  const blockedShippingArtifactCheckJsonOutput =
    blockedShippingArtifactCheckJson &&
    typeof blockedShippingArtifactCheckJson === "object" &&
    "stderr" in blockedShippingArtifactCheckJson &&
    typeof blockedShippingArtifactCheckJson.stderr === "string"
      ? blockedShippingArtifactCheckJson.stderr
      : "";
  const blockedShippingArtifactCheckJsonStart =
    blockedShippingArtifactCheckJsonOutput.indexOf("{");
  const blockedShippingArtifactCheckJsonEnd =
    blockedShippingArtifactCheckJsonOutput.lastIndexOf("}");
  if (
    !blockedShippingArtifactCheckJson ||
    blockedShippingArtifactCheckJsonStart === -1 ||
    blockedShippingArtifactCheckJsonEnd === -1 ||
    !blockedShippingArtifactCheckJsonOutput.includes("Artifact decision status: Blocked") ||
    !blockedShippingArtifactCheckJsonOutput.includes(
      "Artifact decision note: Latest send resulting root still needs operator registration before downstream continuity is established.",
    )
  ) {
    throw new Error(
      blockedShippingArtifactCheckJsonOutput ||
        "operator restart shipping-artifact-check-json did not fail with structured output",
    );
  }
  const blockedShippingArtifactCheckJsonSurface = JSON.parse(
    blockedShippingArtifactCheckJsonOutput.slice(
      blockedShippingArtifactCheckJsonStart,
      blockedShippingArtifactCheckJsonEnd + 1,
    ),
  );
  if (
    blockedShippingArtifactCheckJsonSurface.artifactVersion !== 1 ||
    blockedShippingArtifactCheckJsonSurface.artifactKind !==
      "shipping-decision-checked-snapshot-bundle" ||
    blockedShippingArtifactCheckJsonSurface.decisionVersion !== 1 ||
    blockedShippingArtifactCheckJsonSurface.decisionKind !==
      "narrow-private-core-zk-v1-shipping" ||
    blockedShippingArtifactCheckJsonSurface.decisionStatus !== "blocked" ||
    blockedShippingArtifactCheckJsonSurface.decisionNote !==
      "Latest send resulting root still needs operator registration before downstream continuity is established." ||
    blockedShippingArtifactCheckJsonSurface.snapshotVersion !== 1 ||
    blockedShippingArtifactCheckJsonSurface.snapshotKind !==
      "contract-status-shipping-bundle" ||
    blockedShippingArtifactCheckJsonSurface.contractVersion !== 18 ||
    blockedShippingArtifactCheckJsonSurface.summaryVersion !== 42 ||
    blockedShippingArtifactCheckJsonSurface.snapshot?.shipping?.shippingStatusRaw !==
      "required-lanes-mismatch"
  ) {
    throw new Error(
      `Unexpected operator restart shipping-artifact-check-json output\n${JSON.stringify(
        blockedShippingArtifactCheckJsonSurface,
        null,
        2,
      )}`,
    );
  }
  printStatus("operator restart shipping-artifact-check-json surface: PASS");

  const shippingArtifactJsonOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:shipping-artifact-json",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const shippingArtifactJson = JSON.parse(shippingArtifactJsonOutput);
  if (
    shippingArtifactJson.operator !== baseUrl ||
    shippingArtifactJson.artifactVersion !== 1 ||
    shippingArtifactJson.artifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    shippingArtifactJson.decisionVersion !== 1 ||
    shippingArtifactJson.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    shippingArtifactJson.decisionStatus !== "blocked" ||
    shippingArtifactJson.snapshotVersion !== 1 ||
    shippingArtifactJson.snapshotKind !== "contract-status-shipping-bundle" ||
    shippingArtifactJson.contractVersion !== 18 ||
    shippingArtifactJson.summaryVersion !== 42 ||
    shippingArtifactJson.snapshot?.contract?.supportedShippingArtifactVersion !== 1 ||
    shippingArtifactJson.snapshot?.contract?.supportedShippingArtifactTransport !==
      "dedicated-endpoint" ||
    shippingArtifactJson.snapshot?.contract?.supportedShippingArtifactEndpoint !==
      "/state/private-core-shipping-artifact" ||
    shippingArtifactJson.snapshot?.shipping?.shippingStatusRaw !== "required-lanes-mismatch"
  ) {
    throw new Error(
      `Unexpected operator restart shipping artifact JSON output\n${JSON.stringify(
        shippingArtifactJson,
        null,
        2,
      )}`,
    );
  }
  printStatus("operator restart shipping-artifact json: PASS");

  const shippingArtifactOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:shipping-artifact",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (
    !shippingArtifactOutput.includes("Artifact version: 1") ||
    !shippingArtifactOutput.includes(
      "Artifact kind: shipping-decision-checked-snapshot-bundle",
    ) ||
    !shippingArtifactOutput.includes("Shipping artifact transport: dedicated-endpoint") ||
    !shippingArtifactOutput.includes(
      "Shipping artifact endpoint: /state/private-core-shipping-artifact",
    ) ||
    !shippingArtifactOutput.includes("Contract version: 18") ||
    !shippingArtifactOutput.includes("Decision status: Blocked") ||
    !shippingArtifactOutput.includes("Shipping status: Required lanes mismatch")
  ) {
    throw new Error(
      shippingArtifactOutput ||
        "operator restart shipping-artifact surface returned unexpected output",
    );
  }
  printStatus("operator restart shipping-artifact surface: PASS");
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

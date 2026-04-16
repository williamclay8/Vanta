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
  return 9900 + Math.floor(Math.random() * 200);
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
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-operator-http-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    const privateCoreSource = readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8");
    const sendProofSource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreSendProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');
    const unshieldProofSource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreUnshieldProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');

    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(join(tempTsDir, "vantaPrivateCore.ts"), privateCoreSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreSendProof.ts"), sendProofSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"), unshieldProofSource);

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "vantaPrivateCore.ts"),
        join(tempTsDir, "vantaPrivateCoreSendProof.ts"),
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

    const compiledPath = join(tempJsDir, "vantaPrivateCoreSendProof.js");
    const compiledUnshieldPath = join(tempJsDir, "vantaPrivateCoreUnshieldProof.js");
    writeFileSync(
      compiledPath,
      readFileSync(compiledPath, "utf8").replace(
        /from "\.\/vantaPrivateCore"/g,
        'from "./vantaPrivateCore.js"',
      ),
    );
    writeFileSync(
      compiledUnshieldPath,
      readFileSync(compiledUnshieldPath, "utf8").replace(
        /from "\.\/vantaPrivateCore"/g,
        'from "./vantaPrivateCore.js"',
      ),
    );

    const compiledModule = await import(pathToFileURL(compiledPath).href);
    const unshieldModule = await import(pathToFileURL(compiledUnshieldPath).href);
    return {
      send: compiledModule.getVantaPrivateCoreFixedDepthSendFixtureV0(),
      unshield: unshieldModule.getVantaPrivateCoreFixedDepthUnshieldFixtureV0(),
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const fixture = await loadFixture();
const witnessPackage = fixture.send.validBoundary.noirWitnessPackage;
const rootWitnessPackage = fixture.unshield.validBoundary.noirWitnessPackage;
const rootSourceArtifacts = fixture.unshield.validSourceArtifacts;
mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-operator-http-server-"));
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
  printStatus("operator send http empty proof state: PASS");

  const initialSendProofState = await requestJson(baseUrl, "/state/private-core-send-proofs", {
    method: "GET",
  });
  if (
    !initialSendProofState.ok ||
    initialSendProofState.parsed?.stateVersion !== 1 ||
    initialSendProofState.parsed?.latestProof !== null ||
    !Array.isArray(initialSendProofState.parsed?.records) ||
    initialSendProofState.parsed.records.length !== 0
  ) {
    throw new Error(initialSendProofState.text || "operator send proof state did not start empty");
  }
  printStatus("operator send http empty send-proof state: PASS");

  const initialSendState = await requestJson(baseUrl, "/state/private-core-sends", {
    method: "GET",
  });
  if (
    !initialSendState.ok ||
    initialSendState.parsed?.stateVersion !== 1 ||
    initialSendState.parsed?.latestSend !== null ||
    !Array.isArray(initialSendState.parsed?.records) ||
    initialSendState.parsed.records.length !== 0
  ) {
    throw new Error(initialSendState.text || "operator send state did not start empty");
  }
  printStatus("operator send http empty send state: PASS");

  const proofResponse = await requestJson(baseUrl, "/private-core/send-proof", {
    body: JSON.stringify({ witnessPackage }),
    method: "POST",
  });

  if (
    !proofResponse.ok ||
    proofResponse.parsed?.verified !== true ||
    proofResponse.parsed?.circuit !== "vanta_private_core_single_note_send" ||
    proofResponse.parsed?.publicInputCount !== 13
  ) {
    throw new Error(proofResponse.text || "operator send proof endpoint failed");
  }
  printStatus(
    `operator send http proof: PASS (${proofResponse.parsed.proofFieldCount} fields / ${proofResponse.parsed.publicInputCount} public inputs)`,
  );

  const sendProofState = await requestJson(baseUrl, "/state/private-core-send-proofs", {
    method: "GET",
  });
  if (
    !sendProofState.ok ||
    sendProofState.parsed?.stateVersion !== 1 ||
    !sendProofState.parsed?.latestProof ||
    sendProofState.parsed.latestProof?.action !== "send-proof" ||
    sendProofState.parsed.latestProof?.circuit !== "vanta_private_core_single_note_send" ||
    !Array.isArray(sendProofState.parsed?.records) ||
    sendProofState.parsed.records.length !== 1
  ) {
    throw new Error(sendProofState.text || "send proof endpoint did not persist send-proof state");
  }
  printStatus("operator send http send-proof state: PASS");

  const summaryState = await requestJson(baseUrl, "/state/private-core-summary", { method: "GET" });
  if (
    !summaryState.ok ||
    summaryState.parsed?.stateVersion !== 1 ||
    summaryState.parsed?.summaryVersion !== 41 ||
    summaryState.parsed?.contractMirrorStatus !== "mirrors-contract" ||
    summaryState.parsed?.contractMirrorNote !==
      "Operator summary mirrors the frozen private-core contract across all supported static fields." ||
    summaryState.parsed?.supportedSendLaneVersion !== 1 ||
    summaryState.parsed?.supportedSendLaneKind !== "single-input-single-recipient-optional-change" ||
    summaryState.parsed?.supportedSendLaneStatus !== "supported" ||
    summaryState.parsed?.supportedSendV1Decision !== "accepted-narrow-v1-path" ||
    summaryState.parsed?.supportedUnshieldLaneVersion !== 1 ||
    summaryState.parsed?.supportedUnshieldLaneKind !== "single-note-proof-backed-consume" ||
    summaryState.parsed?.supportedUnshieldLaneStatus !== "supported" ||
    summaryState.parsed?.supportedUnshieldV1Decision !== "accepted-narrow-v1-path" ||
    summaryState.parsed?.supportedReleaseLaneVersion !== 1 ||
    summaryState.parsed?.supportedReleaseLaneKind !==
      "proof-backed-consume-latest-registered-root" ||
    summaryState.parsed?.supportedReleaseLaneStatus !== "supported" ||
    typeof summaryState.parsed?.supportedReleaseLaneNote !== "string" ||
    summaryState.parsed?.supportedSwapLaneVersion !== 1 ||
    summaryState.parsed?.supportedSwapLaneKind !== "single-input-vusd-to-shielded-sol" ||
    summaryState.parsed?.supportedSwapLaneStatus !== "supported" ||
    typeof summaryState.parsed?.supportedSwapLaneNote !== "string" ||
    summaryState.parsed?.supportedSwapV1Decision !== "accepted-narrow-v1-path" ||
    typeof summaryState.parsed?.supportedSwapV1DecisionNote !== "string" ||
    summaryState.parsed?.supportedSwapV1Role !==
      "adjacent-supported-not-required-for-finish-line" ||
    typeof summaryState.parsed?.supportedSwapV1RoleNote !== "string" ||
    summaryState.parsed?.supportedSwapVenue !== "meteora-dlmm-devnet" ||
    summaryState.parsed?.supportedSwapOutputModel !== "shielded-sol-output-note" ||
    summaryState.parsed?.supportedFlowVersion !== 1 ||
    summaryState.parsed?.supportedFlowKind !== "shield-hold-send-unshield-replay-guard" ||
    summaryState.parsed?.supportedFlowStatus !== "supported" ||
    typeof summaryState.parsed?.supportedFlowNote !== "string" ||
    summaryState.parsed?.supportedZkV1ScopeDecision !==
      "accepted-narrow-private-core-v1-scope" ||
    typeof summaryState.parsed?.supportedZkV1ScopeNote !== "string" ||
    summaryState.parsed?.supportedZkV1RequiredLanes !== "send|unshield|release" ||
    typeof summaryState.parsed?.supportedZkV1RequiredLanesNote !== "string" ||
    summaryState.parsed?.supportedAssetSymbol !== "VUSD" ||
    summaryState.parsed?.supportedEnvironment !== "solana-devnet" ||
    summaryState.parsed?.supportedNoteSchema !== "note-v0" ||
    summaryState.parsed?.supportedNoteVersion !== 0 ||
    summaryState.parsed?.supportedRootRegistrationProvenance !==
      "shield-input|send-recipient-output|send-change-output|swap-output" ||
    summaryState.parsed?.supportedSendResultingRootBasis !== "client-declared" ||
    summaryState.parsed?.supportedRecipientModel !== "hashed-reference-to-owner-key" ||
    summaryState.parsed?.supportedReleaseDestinationModel !==
      "32-byte-release-destination-field" ||
    summaryState.parsed?.supportedProofSystem !== "noir-acir-ultrahonk-bbjs" ||
    summaryState.parsed?.supportedUnshieldCircuit !==
      "vanta_private_core_single_note_unshield" ||
    summaryState.parsed?.supportedSendCircuit !== "vanta_private_core_single_note_send" ||
    summaryState.parsed?.supportedUnshieldMerkleDepth !== 3 ||
    summaryState.parsed?.supportedSendMerkleDepth !== 3 ||
    summaryState.parsed?.supportedReleaseAuthorizationBasis !== "proof-backed-consume" ||
    summaryState.parsed?.supportedReleaseRootPolicy !== "latest-registered-root" ||
    summaryState.parsed?.ownerAuthorizationMode !== "x25519-secret-prechecked-off-circuit" ||
    summaryState.parsed?.nullifierKeyMode !== "note-secret-as-nullifier-key-v0" ||
    summaryState.parsed?.provingHashLane !== "poseidon-bn254-proving-lane-v0" ||
    summaryState.parsed?.latestSendProof?.action !== "send-proof" ||
    summaryState.parsed?.latestSendProof?.circuit !== "vanta_private_core_single_note_send" ||
    summaryState.parsed?.sendProofRecordCount !== 1 ||
    summaryState.parsed?.sendResultingRootRecord !== null ||
    summaryState.parsed?.sendResultingRootStatus !== "unavailable" ||
    summaryState.parsed?.sendBoundaryStatus !== "unavailable"
  ) {
    throw new Error(summaryState.text || "operator summary did not reflect send-proof state");
  }
  printStatus("operator send http summary send-proof state: PASS");

  const missingRootTransition = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({ resultingRoot: fixture.send.validResultingRoot, witnessPackage }),
    method: "POST",
  });
  if (!missingRootTransition.text.includes("input root is not registered")) {
    throw new Error(
      missingRootTransition.text || "send transition unexpectedly succeeded without registered input root",
    );
  }
  printStatus("operator send http root gate: PASS");

  const registerRootResponse = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: rootSourceArtifacts,
      witnessPackage: rootWitnessPackage,
    }),
    method: "POST",
  });
  if (!registerRootResponse.ok || registerRootResponse.parsed?.known !== true) {
    throw new Error(registerRootResponse.text || "send http input root registration failed");
  }
  printStatus("operator send http root registration: PASS");

  const rootStorePath = join(tempRoot, "roots.json");
  const tamperedRootStore = JSON.parse(readFileSync(rootStorePath, "utf8"));
  tamperedRootStore.roots[rootWitnessPackage.sourcePublicInputs.stateRoot].proofId =
    "private-core-proof:tampered";
  writeFileSync(rootStorePath, `${JSON.stringify(tamperedRootStore, null, 2)}\n`, "utf8");

  await stopServer(server);
  server = startServer();
  await waitForHealth(baseUrl);

  const unlinkedRootTransition = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({ witnessPackage }),
    method: "POST",
  });
  if (
    !unlinkedRootTransition.text.includes("input root does not match its linked registration proof") &&
    !unlinkedRootTransition.text.includes(
      "input root registration proof linkage is unavailable",
    )
  ) {
    throw new Error(
      unlinkedRootTransition.text ||
        "send transition unexpectedly succeeded with a tampered root registration proof link",
    );
  }
  printStatus("operator send http root proof linkage gate: PASS");

  const restoreRootResponse = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: rootSourceArtifacts,
      witnessPackage: rootWitnessPackage,
    }),
    method: "POST",
  });
  if (!restoreRootResponse.ok || restoreRootResponse.parsed?.known !== true) {
    throw new Error(restoreRootResponse.text || "send http root registration restore failed");
  }
  printStatus("operator send http root proof linkage restore: PASS");

  const missingResultingRootTransition = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({ witnessPackage }),
    method: "POST",
  });
  if (!missingResultingRootTransition.text.includes("Private-core send resulting root is missing.")) {
    throw new Error(
      missingResultingRootTransition.text ||
        "send transition unexpectedly accepted a missing resulting root",
    );
  }
  printStatus("operator send http resulting-root required gate: PASS");

  const sameRootTransition = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({
      resultingRoot: witnessPackage.sourcePublicInputs.stateRoot,
      witnessPackage,
    }),
    method: "POST",
  });
  if (!sameRootTransition.text.includes("resulting root must differ from the input root")) {
    throw new Error(
      sameRootTransition.text ||
        "send transition unexpectedly accepted a non-transitioning resulting root",
    );
  }
  printStatus("operator send http resulting-root change gate: PASS");

  const malformedRootTransition = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({ resultingRoot: "0x1234", witnessPackage }),
    method: "POST",
  });
  if (!malformedRootTransition.text.includes("resulting root must be a canonical 32-byte hex value")) {
    throw new Error(
      malformedRootTransition.text ||
        "send transition unexpectedly accepted a malformed resulting root",
    );
  }
  printStatus("operator send http resulting-root format gate: PASS");

  const transitionResponse = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({ resultingRoot: fixture.send.validResultingRoot, witnessPackage }),
    method: "POST",
  });
  if (
    !transitionResponse.ok ||
    transitionResponse.parsed?.verified !== true ||
    transitionResponse.parsed?.sendRecorded !== true ||
    transitionResponse.parsed?.resultingRootBasis !== "client-declared" ||
    typeof transitionResponse.parsed?.sendId !== "string" ||
    typeof transitionResponse.parsed?.proofId !== "string"
  ) {
    throw new Error(transitionResponse.text || "operator send transition endpoint failed");
  }
  printStatus("operator send http transition: PASS");

  const sendState = await requestJson(baseUrl, "/state/private-core-sends", { method: "GET" });
  if (
    !sendState.ok ||
    sendState.parsed?.stateVersion !== 1 ||
    !sendState.parsed?.latestSend ||
    sendState.parsed.latestSend?.sendId !== transitionResponse.parsed.sendId ||
    sendState.parsed.latestSend?.proofId !== transitionResponse.parsed.proofId ||
    sendState.parsed.latestSend?.resultingRootBasis !== "client-declared" ||
    sendState.parsed.latestSend?.resultingRoot !== transitionResponse.parsed.resultingRoot ||
    !Array.isArray(sendState.parsed?.records) ||
    sendState.parsed.records.length !== 1
  ) {
    throw new Error(sendState.text || "send transition endpoint did not persist send state");
  }
  printStatus("operator send http send state: PASS");

  const summaryAfterTransition = await requestJson(baseUrl, "/state/private-core-summary", {
    method: "GET",
  });
  if (
    !summaryAfterTransition.ok ||
    summaryAfterTransition.parsed?.sendProofRecordCount !== 2 ||
    summaryAfterTransition.parsed?.sendRecordCount !== 1 ||
    summaryAfterTransition.parsed?.latestSend?.resultingRootBasis !== "client-declared" ||
    summaryAfterTransition.parsed?.boundaryStatus !== "coherent" ||
    summaryAfterTransition.parsed?.sendResultingRootRecord !== null ||
    summaryAfterTransition.parsed?.latestSend?.sendId !== transitionResponse.parsed.sendId ||
    summaryAfterTransition.parsed?.sendResultingRootStatus !== "unregistered" ||
    summaryAfterTransition.parsed?.sendResultingRootRegistrationStatus !== "unavailable" ||
    summaryAfterTransition.parsed?.sendContinuityStatus !== "awaiting-registration" ||
    summaryAfterTransition.parsed?.sendBoundaryStatus !== "awaiting-registration"
  ) {
    throw new Error(
      summaryAfterTransition.text || "operator summary did not reflect transition-backed send proof state",
    );
  }
  printStatus("operator send http summary after transition: PASS");

  const proofState = await requestJson(baseUrl, "/state/private-core-proofs", { method: "GET" });
  if (
    !proofState.ok ||
    proofState.parsed?.stateVersion !== 1 ||
    proofState.parsed?.latestProof?.action !== "register-root" ||
    proofState.parsed?.latestProof?.root !== rootWitnessPackage.sourcePublicInputs.stateRoot ||
    !Array.isArray(proofState.parsed?.records) ||
    proofState.parsed.records.length < 1
  ) {
    throw new Error(proofState.text || "send proof path did not preserve the expected shared root-registration proof state");
  }
  printStatus("operator send http shared proof state: PASS");
} finally {
  await stopServer(server);
  rmSync(tempRoot, { recursive: true, force: true });
}

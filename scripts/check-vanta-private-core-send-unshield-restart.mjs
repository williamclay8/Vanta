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
  return 10760 + Math.floor(Math.random() * 120);
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
      // Retry until ready.
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

async function loadModules() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-unshield-restart-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    mkdirSync(tempTsDir, { recursive: true });
    const privateCoreSource = readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8");
    const sendProofSource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreSendProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');
    const unshieldProofSource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreUnshieldProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');

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

    for (const compiledPath of [
      join(tempJsDir, "vantaPrivateCoreSendProof.js"),
      join(tempJsDir, "vantaPrivateCoreUnshieldProof.js"),
    ]) {
      writeFileSync(
        compiledPath,
        readFileSync(compiledPath, "utf8").replace(
          /from "\.\/vantaPrivateCore"/g,
          'from "./vantaPrivateCore.js"',
        ),
      );
    }

    return {
      privateCore: await import(pathToFileURL(join(tempJsDir, "vantaPrivateCore.js")).href),
      sendProof: await import(pathToFileURL(join(tempJsDir, "vantaPrivateCoreSendProof.js")).href),
      unshieldProof: await import(
        pathToFileURL(join(tempJsDir, "vantaPrivateCoreUnshieldProof.js")).href
      ),
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

const { privateCore, sendProof, unshieldProof } = await loadModules();

const entries = [
  { secretKey: "0x1010101010101010101010101010101010101010101010101010101010101010", amount: 11_000_000n },
  { secretKey: "0x2020202020202020202020202020202020202020202020202020202020202020", amount: 22_000_000n },
  { secretKey: "0x3030303030303030303030303030303030303030303030303030303030303030", amount: 33_000_000n },
  { secretKey: "0x4040404040404040404040404040404040404040404040404040404040404040", amount: 44_000_000n },
  { secretKey: "0x5050505050505050505050505050505050505050505050505050505050505050", amount: 55_000_000n },
];
const assetId = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const owners = entries.map((entry) => privateCore.createVantaPrivateCoreOwnerKeypair(entry.secretKey));
const sender = owners[2];
const recipient = owners[4];
const releaseDestination =
  "0x9999999999999999999999999999999999999999999999999999999999999999";
const ledger = new privateCore.VantaPrivateCoreLedger();

const shields = entries.map((entry, index) =>
  ledger.shield({
    assetId,
    amount: entry.amount,
    ownerPublicKey: owners[index].publicKey,
    noteNonce: toRepeatedByteHex(index + 1),
    noteSecret: toRepeatedByteHex(index + 11),
    blinding: toRepeatedByteHex(index + 21),
    derivationTag: toRepeatedByteHex(index + 31),
    senderEphemeralSecretKey: toRepeatedByteHex(index + 41),
    payloadNonce: toRepeatedByteHex12(index + 51),
  }),
);

const heldInput = ledger.hold({
  encryptedPayload: shields[2].encryptedPayload,
  ownerSecretKey: sender.secretKey,
});

const transition = privateCore.buildVantaPrivateCoreSendTransition({
  input: heldInput,
  recipientOwnerPublicKey: recipient.publicKey,
  recipientNoteNonce: "0x6161616161616161616161616161616161616161616161616161616161616161",
  recipientNoteSecret: "0x7171717171717171717171717171717171717171717171717171717171717171",
  recipientBlinding: "0x8181818181818181818181818181818181818181818181818181818181818181",
  recipientDerivationTag: "0x9191919191919191919191919191919191919191919191919191919191919191",
  recipientSenderEphemeralSecretKey:
    "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1",
  changeNoteNonce: "0xb1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1",
  changeNoteSecret: "0xc1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1",
  changeBlinding: "0xd1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1",
  changeDerivationTag: "0xe1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1",
  changeSenderEphemeralSecretKey:
    "0xf1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1",
  sendAmount: 13_000_000n,
});
const sendBoundary = sendProof.buildVantaPrivateCoreSendProofBoundary({
  transition,
  senderSecretKey: sender.secretKey,
  circuitMerkleDepth: 3,
  requireNontrivialMerklePath: true,
});

mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-unshield-restart-server-"));
const port = randomPort();
const baseUrl = `http://127.0.0.1:${port}`;

let liveServer = null;
let serverOutput = "";

try {
  let started = startServer(tempRoot, port);
  liveServer = started.server;
  await waitForHealth(baseUrl);

  const inputRootBoundary = unshieldProof.buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote: heldInput,
    ownerSecretKey: sender.secretKey,
    releaseDestination,
    circuitMerkleDepth: 3,
    requireNontrivialMerklePath: true,
  });
  const inputSourceArtifacts =
    privateCore.deriveVantaPrivateCoreSourceArtifactsFromHeldNote(heldInput);
  const inputRegisterRootResponse = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: inputSourceArtifacts,
      witnessPackage: inputRootBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!inputRegisterRootResponse.ok || inputRegisterRootResponse.parsed?.known !== true) {
    throw new Error(inputRegisterRootResponse.text || "operator-backed send input root registration failed");
  }
  printStatus("private-core send->unshield restart input root registration: PASS");

  const previewResult = ledger.previewSend(transition);

  const sendTransitionResponse = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({
      resultingRoot: previewResult.resultingRoot,
      witnessPackage: sendBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (
    !sendTransitionResponse.ok ||
    sendTransitionResponse.parsed?.verified !== true ||
    sendTransitionResponse.parsed?.sendRecorded !== true ||
    typeof sendTransitionResponse.parsed?.proofId !== "string"
  ) {
    throw new Error(sendTransitionResponse.text || "operator-backed send transition failed");
  }

  const sendResult = ledger.send(transition);
  const heldRecipient = ledger.hold({
    encryptedPayload: sendResult.recipient.encryptedPayload,
    ownerSecretKey: recipient.secretKey,
  });

  const recipientUnshieldBoundary = unshieldProof.buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote: heldRecipient,
    ownerSecretKey: recipient.secretKey,
    releaseDestination,
    circuitMerkleDepth: 3,
    requireNontrivialMerklePath: true,
  });
  const recipientSourceArtifacts =
    privateCore.deriveVantaPrivateCoreSourceArtifactsFromHeldNote(heldRecipient);

  const registerRootResponse = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: recipientSourceArtifacts,
      witnessPackage: recipientUnshieldBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!registerRootResponse.ok || registerRootResponse.parsed?.known !== true) {
    throw new Error(registerRootResponse.text || "operator-backed recipient root registration failed");
  }

  const consumeResponse = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({
      sourceArtifacts: recipientSourceArtifacts,
      witnessPackage: recipientUnshieldBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (
    !consumeResponse.ok ||
    consumeResponse.parsed?.verified !== true ||
    consumeResponse.parsed?.releaseRecorded !== true ||
    typeof consumeResponse.parsed?.proofId !== "string"
  ) {
    throw new Error(consumeResponse.text || "operator-backed recipient unshield consume failed");
  }
  printStatus("private-core send->unshield restart setup: PASS");

  const preRestartSummary = await requestJson(baseUrl, "/state/private-core-summary", {
    method: "GET",
  });
  if (
    !preRestartSummary.ok ||
    preRestartSummary.parsed?.currentRoot !== heldRecipient.witness.root ||
    preRestartSummary.parsed?.latestSend?.proofId !== sendTransitionResponse.parsed.proofId ||
    preRestartSummary.parsed?.latestConsume?.proofId !== consumeResponse.parsed.proofId ||
    preRestartSummary.parsed?.latestRelease?.proofId !== consumeResponse.parsed.proofId ||
    preRestartSummary.parsed?.sendResultingRootRecord?.root !== heldRecipient.witness.root ||
    typeof preRestartSummary.parsed?.sendResultingRootRecord?.proofId !== "string" ||
    preRestartSummary.parsed?.sendResultingRootProofLinkStatus !== "linked" ||
    preRestartSummary.parsed?.proofSendLinkStatus !== "linked" ||
    preRestartSummary.parsed?.proofConsumeLinkStatus !== "linked" ||
    preRestartSummary.parsed?.proofReleaseLinkStatus !== "linked" ||
    preRestartSummary.parsed?.sendResultingRootStatus !== "downstream-released" ||
    preRestartSummary.parsed?.boundaryStatus !== "coherent"
  ) {
    throw new Error(preRestartSummary.text || "pre-restart send->unshield summary mismatch");
  }
  printStatus("private-core send->unshield restart pre-shutdown state: PASS");

  await stopServer(liveServer);
  liveServer = null;
  serverOutput = started.getOutput();

  started = startServer(tempRoot, port);
  liveServer = started.server;
  await waitForHealth(baseUrl);

  const postRestartSummary = await requestJson(baseUrl, "/state/private-core-summary", {
    method: "GET",
  });
  if (
    !postRestartSummary.ok ||
    postRestartSummary.parsed?.currentRoot !== heldRecipient.witness.root ||
    postRestartSummary.parsed?.latestSend?.proofId !== sendTransitionResponse.parsed.proofId ||
    postRestartSummary.parsed?.latestConsume?.proofId !== consumeResponse.parsed.proofId ||
    postRestartSummary.parsed?.latestRelease?.proofId !== consumeResponse.parsed.proofId ||
    postRestartSummary.parsed?.sendResultingRootRecord?.root !== heldRecipient.witness.root ||
    typeof postRestartSummary.parsed?.sendResultingRootRecord?.proofId !== "string" ||
    postRestartSummary.parsed?.sendResultingRootProofLinkStatus !== "linked" ||
    postRestartSummary.parsed?.proofSendLinkStatus !== "linked" ||
    postRestartSummary.parsed?.proofConsumeLinkStatus !== "linked" ||
    postRestartSummary.parsed?.proofReleaseLinkStatus !== "linked" ||
    postRestartSummary.parsed?.sendResultingRootStatus !== "downstream-released" ||
    postRestartSummary.parsed?.boundaryStatus !== "coherent"
  ) {
    throw new Error(postRestartSummary.text || "post-restart send->unshield summary mismatch");
  }
  printStatus("private-core send->unshield restart persisted state: PASS");

  const replay = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({
      sourceArtifacts: recipientSourceArtifacts,
      witnessPackage: recipientUnshieldBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!replay.text.includes("has already been consumed")) {
    throw new Error(replay.text || "send->unshield replay rejection did not survive restart");
  }
  printStatus("private-core send->unshield restart replay rejection: PASS");
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

function toRepeatedByteHex(byte) {
  return `0x${byte.toString(16).padStart(2, "0").repeat(32)}`;
}

function toRepeatedByteHex12(byte) {
  return `0x${byte.toString(16).padStart(2, "0").repeat(12)}`;
}

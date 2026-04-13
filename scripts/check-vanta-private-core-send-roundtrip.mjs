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

async function loadPrivateCoreModule() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-roundtrip-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(
      join(tempTsDir, "vantaPrivateCore.ts"),
      readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8"),
    );
    writeFileSync(
      join(tempTsDir, "vantaPrivateCoreSendProof.ts"),
      readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCoreSendProof.ts"), "utf8").replace(
        /from "@\/zk\/vantaPrivateCore"/g,
        'from "./vantaPrivateCore"',
      ),
    );
    writeFileSync(
      join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"),
      readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCoreUnshieldProof.ts"), "utf8").replace(
        /from "@\/zk\/vantaPrivateCore"/g,
        'from "./vantaPrivateCore"',
      ),
    );

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

    const sendProofPath = join(tempJsDir, "vantaPrivateCoreSendProof.js");
    const unshieldProofPath = join(tempJsDir, "vantaPrivateCoreUnshieldProof.js");
    writeFileSync(
      sendProofPath,
      readFileSync(sendProofPath, "utf8").replace(
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

    const privateCore = await import(pathToFileURL(join(tempJsDir, "vantaPrivateCore.js")).href);
    const sendProof = await import(pathToFileURL(sendProofPath).href);
    const unshieldProof = await import(pathToFileURL(unshieldProofPath).href);
    return { privateCore, sendProof, unshieldProof };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const { privateCore, sendProof, unshieldProof } = await loadPrivateCoreModule();

const entries = [
  {
    secretKey: "0x1010101010101010101010101010101010101010101010101010101010101010",
    amount: 11_000_000n,
  },
  {
    secretKey: "0x2020202020202020202020202020202020202020202020202020202020202020",
    amount: 22_000_000n,
  },
  {
    secretKey: "0x3030303030303030303030303030303030303030303030303030303030303030",
    amount: 33_000_000n,
  },
  {
    secretKey: "0x4040404040404040404040404040404040404040404040404040404040404040",
    amount: 44_000_000n,
  },
  {
    secretKey: "0x5050505050505050505050505050505050505050505050505050505050505050",
    amount: 55_000_000n,
  },
];
const owners = entries.map((entry) =>
  privateCore.createVantaPrivateCoreOwnerKeypair(entry.secretKey),
);
const sender = owners[2];
const recipient = owners[4];
const assetId = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
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
const witnessPackage = sendProof.getVantaPrivateCoreFixedDepthSendFixtureV0().validBoundary.noirWitnessPackage;

mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-roundtrip-server-"));
const port = randomPort();
const baseUrl = `http://127.0.0.1:${port}`;

const server = spawn("node", ["operator/unshield-server.mjs"], {
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

let stderr = "";
let stdout = "";
server.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
server.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

try {
  await waitForHealth(baseUrl);

  const inputRootBoundary = unshieldProof.buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote: heldInput,
    ownerSecretKey: sender.secretKey,
    releaseDestination:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    circuitMerkleDepth: 3,
    requireNontrivialMerklePath: true,
  });
  const inputSourceArtifacts = privateCore.deriveVantaPrivateCoreSourceArtifactsFromHeldNote(heldInput);
  const registerRootResponse = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: inputSourceArtifacts,
      witnessPackage: inputRootBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!registerRootResponse.ok || registerRootResponse.parsed?.known !== true) {
    throw new Error(registerRootResponse.text || "operator-backed send input root registration failed");
  }
  printStatus("private-core send roundtrip input root registration: PASS");

  const previewResult = ledger.previewSend(transition);

  const transitionResponse = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({ resultingRoot: previewResult.resultingRoot, witnessPackage }),
    method: "POST",
  });

  if (
    !transitionResponse.ok ||
    transitionResponse.parsed?.verified !== true ||
    transitionResponse.parsed?.sendRecorded !== true ||
    typeof transitionResponse.parsed?.sendId !== "string" ||
    typeof transitionResponse.parsed?.proofId !== "string"
  ) {
    throw new Error(transitionResponse.text || "operator send transition endpoint failed");
  }

  printStatus("private-core send roundtrip operator proof-backed transition: PASS");

  const summaryState = await requestJson(baseUrl, "/state/private-core-summary", { method: "GET" });

  if (
    !summaryState.ok ||
    summaryState.parsed?.latestSend?.sendId !== transitionResponse.parsed.sendId ||
    summaryState.parsed?.latestSendProof?.proofId !== transitionResponse.parsed.proofId ||
    summaryState.parsed?.latestSendLinkedProof?.proofId !== transitionResponse.parsed.proofId ||
    summaryState.parsed?.proofSendLinkStatus !== "linked"
  ) {
    throw new Error(summaryState.text || "operator summary did not reflect the send transition");
  }

  printStatus("private-core send roundtrip operator summary linkage: PASS");

  const sendResult = ledger.send(transition);

  if (!ledger.isNullifierConsumed(sendResult.inputNullifier.value)) {
    throw new Error("operator-backed send did not mark the sender input nullifier consumed locally");
  }

  printStatus("private-core send roundtrip sender state advance: PASS");

  const heldChange = ledger.hold({
    encryptedPayload: sendResult.change?.encryptedPayload ?? (() => {
      throw new Error("operator-backed roundtrip expected a residual change note");
    })(),
    ownerSecretKey: sender.secretKey,
  });

  if (
    heldChange.note.amount !== 20_000_000n ||
    heldChange.witness.root !== sendResult.resultingRoot
  ) {
    throw new Error("sender residual change note did not recover coherently after send");
  }

  printStatus("private-core send roundtrip residual change recovery: PASS");

  const heldRecipient = ledger.hold({
    encryptedPayload: sendResult.recipient.encryptedPayload,
    ownerSecretKey: recipient.secretKey,
  });

  if (
    heldRecipient.note.amount !== 13_000_000n ||
    heldRecipient.note.ownerPublicKey !== recipient.publicKey ||
    heldRecipient.witness.root !== sendResult.resultingRoot
  ) {
    throw new Error("recipient note did not recover coherently after operator-backed send");
  }

  printStatus("private-core send roundtrip recipient recovery: PASS");

  const recipientUnshield = ledger.unshield(heldRecipient);

  if (
    recipientUnshield.releasedAmount !== 13_000_000n ||
    recipientUnshield.root !== sendResult.resultingRoot ||
    !ledger.isNullifierConsumed(recipientUnshield.nullifier.value)
  ) {
    throw new Error("recipient could not spend the sent note after operator-backed send");
  }

  printStatus("private-core send roundtrip recipient spend: PASS");

  try {
    ledger.hold({
      encryptedPayload: sendResult.recipient.encryptedPayload,
      ownerSecretKey: sender.secretKey,
    });
    throw new Error("sender unexpectedly decrypted recipient payload after send");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Recipient secret key does not match")) {
      throw error;
    }
  }

  printStatus("private-core send roundtrip recipient privacy gate: PASS");
} finally {
  server.kill("SIGTERM");
  await new Promise((resolvePromise) => server.once("exit", resolvePromise));
  rmSync(tempRoot, { recursive: true, force: true });
}

function toRepeatedByteHex(byte) {
  return `0x${byte.toString(16).padStart(2, "0").repeat(32)}`;
}

function toRepeatedByteHex12(byte) {
  return `0x${byte.toString(16).padStart(2, "0").repeat(12)}`;
}

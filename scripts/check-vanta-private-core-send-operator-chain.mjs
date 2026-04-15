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
  return 10350 + Math.floor(Math.random() * 200);
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

async function loadModules() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-operator-chain-"));
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

    return {
      privateCore: await import(pathToFileURL(join(tempJsDir, "vantaPrivateCore.js")).href),
      sendProof: await import(pathToFileURL(sendProofPath).href),
      unshieldProof: await import(pathToFileURL(unshieldProofPath).href),
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
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
const firstSender = owners[2];
const firstRecipient = owners[4];
const finalRecipient = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x6666666666666666666666666666666666666666666666666666666666666666",
);
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

const firstHeldSender = ledger.hold({
  encryptedPayload: shields[2].encryptedPayload,
  ownerSecretKey: firstSender.secretKey,
});
const firstTransition = privateCore.buildVantaPrivateCoreSendTransition({
  input: firstHeldSender,
  recipientOwnerPublicKey: firstRecipient.publicKey,
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
const firstBoundary = sendProof.buildVantaPrivateCoreSendProofBoundary({
  transition: firstTransition,
  senderSecretKey: firstSender.secretKey,
  circuitMerkleDepth: 3,
  requireNontrivialMerklePath: true,
});

mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-operator-chain-server-"));
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

try {
  await waitForHealth(baseUrl);

  const firstInputRootBoundary = unshieldProof.buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote: firstHeldSender,
    ownerSecretKey: firstSender.secretKey,
    releaseDestination:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    circuitMerkleDepth: 3,
    requireNontrivialMerklePath: true,
  });
  const firstInputSourceArtifacts =
    privateCore.deriveVantaPrivateCoreSourceArtifactsFromHeldNote(firstHeldSender);
  const firstRegisterRootResponse = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: firstInputSourceArtifacts,
      witnessPackage: firstInputRootBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!firstRegisterRootResponse.ok || firstRegisterRootResponse.parsed?.known !== true) {
    throw new Error(firstRegisterRootResponse.text || "first send input root registration failed");
  }
  printStatus("private-core send operator chain first input root registration: PASS");

  const firstPreviewResult = ledger.previewSend(firstTransition);

  const firstTransitionResponse = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({
      resultingRoot: firstPreviewResult.resultingRoot,
      witnessPackage: firstBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!firstTransitionResponse.ok || firstTransitionResponse.parsed?.verified !== true) {
    throw new Error(firstTransitionResponse.text || "first operator-backed send failed");
  }

  const firstResult = ledger.send(firstTransition);
  const heldFirstRecipient = ledger.hold({
    encryptedPayload: firstResult.recipient.encryptedPayload,
    ownerSecretKey: firstRecipient.secretKey,
  });

  printStatus("private-core send operator chain first transition: PASS");

  const secondTransition = privateCore.buildVantaPrivateCoreSendTransition({
    input: heldFirstRecipient,
    recipientOwnerPublicKey: finalRecipient.publicKey,
    sendAmount: 4_000_000n,
  });
  const secondBoundary = sendProof.buildVantaPrivateCoreSendProofBoundary({
    transition: secondTransition,
    senderSecretKey: firstRecipient.secretKey,
    circuitMerkleDepth: 3,
    requireNontrivialMerklePath: true,
  });

  const secondInputRootBoundary = unshieldProof.buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote: heldFirstRecipient,
    ownerSecretKey: firstRecipient.secretKey,
    releaseDestination:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    circuitMerkleDepth: 3,
    requireNontrivialMerklePath: true,
  });
  const secondInputSourceArtifacts =
    privateCore.deriveVantaPrivateCoreSourceArtifactsFromHeldNote(heldFirstRecipient);
  const secondRegisterRootResponse = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: secondInputSourceArtifacts,
      witnessPackage: secondInputRootBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!secondRegisterRootResponse.ok || secondRegisterRootResponse.parsed?.known !== true) {
    throw new Error(secondRegisterRootResponse.text || "second send input root registration failed");
  }
  printStatus("private-core send operator chain second input root registration: PASS");

  const secondPreviewResult = ledger.previewSend(secondTransition);

  const staleFirstTransitionResponse = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({
      resultingRoot: firstPreviewResult.resultingRoot,
      witnessPackage: firstBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!staleFirstTransitionResponse.text.includes("not the latest registered root")) {
    throw new Error(
      staleFirstTransitionResponse.text || "stale first send input root was not rejected",
    );
  }
  printStatus("private-core send operator chain stale-root gate: PASS");

  const secondTransitionResponse = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({
      resultingRoot: secondPreviewResult.resultingRoot,
      witnessPackage: secondBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!secondTransitionResponse.ok || secondTransitionResponse.parsed?.verified !== true) {
    throw new Error(secondTransitionResponse.text || "second operator-backed send failed");
  }

  const secondResult = ledger.send(secondTransition);
  const finalHeldRecipient = ledger.hold({
    encryptedPayload: secondResult.recipient.encryptedPayload,
    ownerSecretKey: finalRecipient.secretKey,
  });
  const heldRecipientChange = ledger.hold({
    encryptedPayload: secondResult.change?.encryptedPayload ?? (() => {
      throw new Error("expected chained recipient change note");
    })(),
    ownerSecretKey: firstRecipient.secretKey,
  });

  if (
    finalHeldRecipient.note.amount !== 4_000_000n ||
    heldRecipientChange.note.amount !== 9_000_000n
  ) {
    throw new Error("operator-backed send chain outputs did not recover with expected amounts");
  }
  if (
    !ledger.isNullifierConsumed(firstResult.inputNullifier.value) ||
    !ledger.isNullifierConsumed(secondResult.inputNullifier.value)
  ) {
    throw new Error("operator-backed send chain nullifier tracking mismatch");
  }

  printStatus("private-core send operator chain local recovery: PASS");

  const summary = await requestJson(baseUrl, "/state/private-core-summary", { method: "GET" });
  if (
    !summary.ok ||
    summary.parsed?.sendRecordCount !== 2 ||
    summary.parsed?.sendProofRecordCount !== 2 ||
    summary.parsed?.sendBoundaryStatus !== "awaiting-registration" ||
    summary.parsed?.boundaryStatus !== "coherent" ||
    summary.parsed?.proofSendLinkStatus !== "linked" ||
    summary.parsed?.latestSend?.sendId !== secondTransitionResponse.parsed.sendId ||
    summary.parsed?.latestSend?.resultingRootBasis !== "client-declared" ||
    summary.parsed?.latestSendLinkedProof?.proofId !== secondTransitionResponse.parsed.proofId
  ) {
    throw new Error(summary.text || "operator summary did not reflect chained private sends");
  }

  printStatus("private-core send operator chain summary linkage: PASS");
} finally {
  await stopServer(server);
  rmSync(tempRoot, { recursive: true, force: true });
}

function toRepeatedByteHex(byte) {
  return `0x${byte.toString(16).padStart(2, "0").repeat(32)}`;
}

function toRepeatedByteHex12(byte) {
  return `0x${byte.toString(16).padStart(2, "0").repeat(12)}`;
}

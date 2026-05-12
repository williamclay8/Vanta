import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const releaseCandidateId = "private-core-release-candidate:send-change-unshield-roundtrip";

function printStatus(message) {
  console.log(message);
}

function randomPort() {
  return 10680 + Math.floor(Math.random() * 150);
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
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Connection: "close",
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch (error) {
    const cause = error && typeof error === "object" && "cause" in error ? error.cause : null;
    const causeMessage =
      cause && typeof cause === "object" && "message" in cause ? `: ${cause.message}` : "";
    throw new Error(
      `request failed for ${path}${causeMessage}`,
      error instanceof Error ? { cause: error } : undefined,
    );
  }

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
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-change-unshield-roundtrip-"));
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
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
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
  circuitMerkleDepth: 20,
  requireNontrivialMerklePath: true,
});

mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-change-unshield-roundtrip-server-"));
const port = randomPort();
const baseUrl = `http://127.0.0.1:${port}`;

const server = spawn("node", ["operator/unshield-server.mjs"], {
  cwd: repoRoot,
  env: createOperatorEnv(tempRoot, port),
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
let stdout = "";
let serverExit = null;
server.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
server.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});
server.once("exit", (code, signal) => {
  serverExit = { code, signal };
});

try {
  await waitForHealth(baseUrl);

  const inputRootBoundary = unshieldProof.buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote: heldInput,
    ownerSecretKey: sender.secretKey,
    releaseDestination,
    circuitMerkleDepth: 20,
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
  printStatus("private-core send-change->unshield input root registration: PASS");

  const previewResult = ledger.previewSend(transition);

  const sendTransitionResponse = await requestJson(baseUrl, "/private-core/send-transition", {
    body: JSON.stringify({
      releaseCandidateId,
      resultingRoot: previewResult.resultingRoot,
      witnessPackage: sendBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (
    !sendTransitionResponse.ok ||
    sendTransitionResponse.parsed?.verified !== true ||
    sendTransitionResponse.parsed?.sendRecorded !== true ||
    sendTransitionResponse.parsed?.resultingRootBasis !== "proof-linked-input-expected-root" ||
    typeof sendTransitionResponse.parsed?.proofId !== "string"
  ) {
    throw new Error(sendTransitionResponse.text || "operator-backed send transition failed");
  }
  printStatus("private-core send-change->unshield operator send transition: PASS");

  const sendResult = ledger.send(transition);
  const heldChange = ledger.hold({
    encryptedPayload: sendResult.change?.encryptedPayload ?? (() => {
      throw new Error("expected a residual change note from private send");
    })(),
    ownerSecretKey: sender.secretKey,
  });
  if (
    heldChange.note.amount !== 20_000_000n ||
    heldChange.note.ownerPublicKey !== sender.publicKey ||
    heldChange.witness.root !== sendResult.resultingRoot
  ) {
    throw new Error("change note did not recover coherently after send transition");
  }
  printStatus("private-core send-change->unshield change recovery: PASS");

  const changeUnshieldBoundary = unshieldProof.buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote: heldChange,
    ownerSecretKey: sender.secretKey,
    releaseDestination,
    circuitMerkleDepth: 20,
    requireNontrivialMerklePath: true,
  });
  const changeSourceArtifacts =
    privateCore.deriveVantaPrivateCoreSourceArtifactsFromHeldNote(heldChange);

  const registerRootResponse = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: changeSourceArtifacts,
      witnessPackage: changeUnshieldBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!registerRootResponse.ok || registerRootResponse.parsed?.known !== true) {
    throw new Error(registerRootResponse.text || "operator-backed change root registration failed");
  }
  printStatus("private-core send-change->unshield change root registration: PASS");

  const consumeResponse = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({
      sourceArtifacts: changeSourceArtifacts,
      witnessPackage: changeUnshieldBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (
    !consumeResponse.ok ||
    consumeResponse.parsed?.verified !== true ||
    consumeResponse.parsed?.releaseRecorded !== true ||
    consumeResponse.parsed?.releasedAmount !== "20000000" ||
    consumeResponse.parsed?.releaseDestination !== releaseDestination
  ) {
    throw new Error(consumeResponse.text || "operator-backed change unshield consume failed");
  }
  printStatus("private-core send-change->unshield operator change consume: PASS");

  const summary = await requestJson(baseUrl, "/state/private-core-summary", { method: "GET" });
  if (
    !summary.ok ||
    summary.parsed?.currentRoot !== heldChange.witness.root ||
    summary.parsed?.latestSend?.proofId !== sendTransitionResponse.parsed.proofId ||
    summary.parsed?.latestSend?.resultingRootBasis !== "proof-linked-input-expected-root" ||
    summary.parsed?.latestConsume?.proofId !== consumeResponse.parsed.proofId ||
    summary.parsed?.latestRelease?.proofId !== consumeResponse.parsed.proofId ||
    summary.parsed?.latestRelease?.releasedAmount !== "20000000" ||
    summary.parsed?.sendResultingRootLinkedProof?.proofId !==
      summary.parsed?.sendResultingRootRecord?.proofId ||
    summary.parsed?.sendResultingRootRecord?.root !== heldChange.witness.root ||
    summary.parsed?.sendResultingRootRecord?.registrationBasis !== "send-change-output" ||
    typeof summary.parsed?.sendResultingRootRecord?.proofId !== "string" ||
    summary.parsed?.sendResultingRootRegistrationStatus !== "linked-change-output" ||
    summary.parsed?.sendResultingRootProofLinkStatus !== "linked" ||
    summary.parsed?.proofSendLinkStatus !== "linked" ||
    summary.parsed?.proofConsumeLinkStatus !== "linked" ||
    summary.parsed?.proofReleaseLinkStatus !== "linked" ||
    summary.parsed?.sendResultingRootStatus !== "downstream-released" ||
    summary.parsed?.sendBoundaryStatus !== "downstream-released" ||
    summary.parsed?.sendBoundaryNote !==
      "Latest send resulting root has already been released downstream." ||
    summary.parsed?.boundaryStatus !== "coherent"
  ) {
    throw new Error(summary.text || "operator summary did not reflect send-change->unshield roundtrip");
  }
  printStatus("private-core send-change->unshield operator summary linkage: PASS");

  const operatorStatusOutput = execFileSync("node", [
    "scripts/print-vanta-private-core-operator-status.mjs",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const expectedStatusLines = [
    "Summary state version: 1",
    "Mirrored contract version: 23",
    "Summary version: 47",
    "Summary generated:",
    "Shipping decision version: 1",
    "Shipping decision kind: narrow-private-core-zk-v1-shipping",
    "Supported shipping decision note: Canonical operator ship/no-ship decision surface for the frozen narrow private-core zk v1 lane.",
    "Shipping decision status: Ready to ship",
    "Shipping decision note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    "Required lanes status: Coherent required lanes",
    "Required lanes note: Minimum zk v1 required lanes are coherent: send boundary is healthy, release boundary is recorded, and the finish line remains coherent.",
    "zk v1 shipping status: Ready narrow v1",
    "zk v1 shipping note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    "zk v1 finish line status: Coherent minimum v1 lane",
    "zk v1 finish line note: Frozen minimum zk v1 send/unshield/release lane is coherent at the operator boundary.",
    "Release boundary status: Release recorded",
    "Release boundary note: Latest private-core release is recorded, proof-linked, and consistent with the frozen release contract.",
    "Supported send lane version: 1",
    "Supported send lane kind: Single input / recipient / optional change",
    "Supported send lane status: Supported",
    "Supported send lane note: Current narrow zk v1 send lane is supported for one input note, one recipient output, and optional change.",
    "Supported unshield lane version: 1",
    "Supported unshield lane note: Current narrow zk v1 unshield lane is supported for one note consume with proof-backed release recording.",
    "Supported release lane note: Current narrow zk v1 release lane is supported for proof-backed consume-authorized release under the latest registered root policy.",
    "Supported swap lane note: Current constrained swap lane supports one USDC input note into one allowlisted shielded output note through operator-backed execution, including Meteora-aware shielded SOL and direct shielded token output lanes.",
    "Supported swap venue: Meteora DLMM mainnet + operator token output",
    "Supported flow version: 1",
    "Supported flow kind: Shield / hold / send / unshield / replay guard",
    "Supported flow status: Supported",
    "Supported flow note: Current narrow zk v1 product flow is shield, hold, private send, unshield, and replay guard on the resulting consume path.",
    "Supported swap v1 role: adjacent-supported-not-required-for-finish-line",
    "Supported swap v1 role note: Current constrained swap lane is supported operator-backed infrastructure in the repo, but it is not required for the minimum zk v1 finish line.",
    "Supported zk v1 scope decision: accepted-narrow-private-core-v1-scope",
    "Supported zk v1 scope note: Current zk v1 finish line is the narrow private-core lane frozen in this repo, not the broader long-term privacy product surface.",
    "Supported zk v1 required lanes: send|unshield|release",
    "Supported zk v1 required lanes note: Minimum zk v1 finish line requires the narrow private-core send, unshield, and release lanes; constrained swap remains adjacent supported infrastructure.",
    "Supported asset: USDC",
    "Supported environment: solana-mainnet",
    "Supported proof system: Noir ACIR / UltraHonk / bb.js",
    "Supported operator status note: Canonical long-form live operator-status surface composed from the bundled snapshot plus the dedicated shipping artifact.",
    "Supported operator snapshot note: Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together.",
    "Supported shipping artifact note: Canonical release-grade machine-readable operator artifact containing the shipping decision plus the bundled contract, live status summary, and canonical shipping surfaces together.",
    "Supported shipping decision gate note: Compact shipping decision surface can act as a strict ready gate for the frozen narrow lane.",
    "Supported operator status gate note: Long-form operator-status surface can act as a strict ready gate for the frozen narrow lane.",
    "Supported operator snapshot gate note: Bundled operator snapshot surface can act as a strict ready gate for the frozen narrow lane.",
    "Supported shipping artifact gate note: Release-grade shipping artifact surface can act as a strict ready gate for the frozen narrow lane.",
    "Owner authorization mode: X25519 secret prechecked off-circuit",
    "Nullifier key mode: Note secret as nullifier key v0",
    "Proving hash lane: poseidon-bn254-proving-lane-v0",
    "Shipping artifact version: 1",
    "Shipping artifact kind: shipping-decision-checked-snapshot-bundle",
    "Current root:",
    "Current root proof:",
    "Current root linked proof:",
    "Current root registration: Send change output",
    "Current root proof link: linked",
    "Root records: 2",
    "Latest consume:",
    "Latest consume proof:",
    "Latest consume linked proof:",
    "Consume records: 1",
    "Latest proof:",
    "Latest proof action: consume",
    "Proof records: 3",
    "Latest send proof:",
    "Latest send proof action: send-proof",
    "Latest send proof link:",
    "Send proof records: 1",
    "Latest send transition:",
    "Latest send linked proof:",
    "Latest send resulting-root basis: proof-linked-input-expected-root",
    "Latest send resulting root:",
    "Latest release nullifier:",
    "Latest release proof:",
    "Latest release linked proof:",
    "Release authorization: Proof-backed consume",
    "Release root policy: Latest registered root",
    "Latest release request:",
    "Latest release root:",
    "Release records: 1",
    "Proof/send link: linked",
    "Proof/consume link: linked",
    "Proof/release link: linked",
    "Send boundary status: Downstream released",
    "Send resulting root note: Latest private send resulting root has already been released downstream.",
    "Send resulting root status: Released downstream",
    "Send resulting root registration: Linked to change output",
    "Send resulting root registration basis: Send change output",
    "Send continuity note: Latest send resulting root has already been released downstream.",
    "Send boundary note: Latest send resulting root has already been released downstream.",
    "Send resulting root record:",
    "Send resulting root proof:",
    "Send resulting root linked proof:",
    "Send resulting root proof link: linked",
    "Send resulting root bundle: Complete v1",
    "Latest send recipient commitment:",
    "Send records: 1",
    "Contract mirror status: Summary mirrors frozen contract",
    "Contract mirror note: Operator summary mirrors the frozen private-core contract across all supported static fields.",
    "Boundary status: Operator boundary coherent",
    "Boundary note: Current root, consume, release, and linked proofs agree.",
  ];
  const missingStatusLines = expectedStatusLines.filter(
    (line) => !operatorStatusOutput.includes(line),
  );
  if (missingStatusLines.length > 0) {
    throw new Error(
      `Missing operator-status lines: ${missingStatusLines.join(", ")}\n${operatorStatusOutput}`,
    );
  }
  printStatus("private-core send-change->unshield operator-status: PASS");

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
    operatorStatusJson.shippingArtifactVersion !== 1 ||
    operatorStatusJson.shippingArtifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    operatorStatusJson.summary?.stateVersion !== 1 ||
    operatorStatusJson.summary?.contractVersion !== 23 ||
    operatorStatusJson.summary?.summaryVersion !== 47 ||
    operatorStatusJson.summary?.requiredLanesStatus !== "coherent-required-lanes" ||
    operatorStatusJson.summary?.zkV1ShippingStatus !== "ready-narrow-v1" ||
    operatorStatusJson.summary?.releaseBoundaryStatus !== "release-recorded" ||
    operatorStatusJson.summary?.boundaryStatus !== "coherent" ||
    operatorStatusJson.summary?.supportedShippingDecisionNote !==
      "Canonical operator ship/no-ship decision surface for the frozen narrow private-core zk v1 lane." ||
    operatorStatusJson.summary?.supportedOperatorStatusNote !==
      "Canonical long-form live operator-status surface composed from the bundled snapshot plus the dedicated shipping artifact." ||
    operatorStatusJson.summary?.supportedOperatorSnapshotNote !==
      "Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together." ||
    operatorStatusJson.summary?.supportedShippingArtifactNote !==
      "Canonical release-grade machine-readable operator artifact containing the shipping decision plus the bundled contract, live status summary, and canonical shipping surfaces together." ||
    operatorStatusJson.summary?.supportedShippingDecisionGateNote !==
      "Compact shipping decision surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorStatusJson.summary?.supportedOperatorStatusGateNote !==
      "Long-form operator-status surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorStatusJson.summary?.supportedOperatorSnapshotGateNote !==
      "Bundled operator snapshot surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorStatusJson.summary?.supportedShippingArtifactGateNote !==
      "Release-grade shipping artifact surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorStatusJson.summary?.latestSend?.sendAmount !== "13000000" ||
    operatorStatusJson.summary?.latestRelease?.releasedAmount !== "20000000" ||
    operatorStatusJson.shippingDecision?.decisionStatus !== "ready-to-ship" ||
    operatorStatusJson.shippingDecision?.contractVersion !== 23 ||
    operatorStatusJson.shippingDecision?.summaryVersion !== 47
  ) {
    throw new Error(
      `Unexpected send-change->unshield operator-status JSON output\n${JSON.stringify(operatorStatusJson, null, 2)}`,
    );
  }
  printStatus("private-core send-change->unshield operator-status json: PASS");

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
    operatorSnapshotJson.contract?.contractVersion !== 23 ||
    operatorSnapshotJson.contract?.summaryVersion !== 47 ||
    operatorSnapshotJson.contract?.supportedShippingDecisionNote !==
      "Canonical operator ship/no-ship decision surface for the frozen narrow private-core zk v1 lane." ||
    operatorSnapshotJson.contract?.supportedOperatorStatusNote !==
      "Canonical long-form live operator-status surface composed from the bundled snapshot plus the dedicated shipping artifact." ||
    operatorSnapshotJson.contract?.supportedOperatorSnapshotNote !==
      "Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together." ||
    operatorSnapshotJson.contract?.supportedShippingArtifactNote !==
      "Canonical release-grade machine-readable operator artifact containing the shipping decision plus the bundled contract, live status summary, and canonical shipping surfaces together." ||
    operatorSnapshotJson.contract?.supportedShippingDecisionGateNote !==
      "Compact shipping decision surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorSnapshotJson.contract?.supportedOperatorStatusGateNote !==
      "Long-form operator-status surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorSnapshotJson.contract?.supportedOperatorSnapshotGateNote !==
      "Bundled operator snapshot surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorSnapshotJson.contract?.supportedShippingArtifactGateNote !==
      "Release-grade shipping artifact surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorSnapshotJson.status?.summary?.requiredLanesStatus !== "coherent-required-lanes" ||
    operatorSnapshotJson.status?.summary?.zkV1ShippingStatus !== "ready-narrow-v1" ||
    operatorSnapshotJson.status?.summary?.latestSend?.sendAmount !== "13000000" ||
    operatorSnapshotJson.status?.summary?.latestRelease?.releasedAmount !== "20000000" ||
    operatorSnapshotJson.shipping?.decisionStatusRaw !== "ready-to-ship" ||
    operatorSnapshotJson.shipping?.shippingStatusRaw !== "ready-narrow-v1"
  ) {
    throw new Error(
      `Unexpected send-change->unshield operator snapshot JSON output\n${JSON.stringify(operatorSnapshotJson, null, 2)}`,
    );
  }
  printStatus("private-core send-change->unshield operator-snapshot json: PASS");

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
    !operatorSnapshotOutput.includes(`Operator: ${baseUrl}`) ||
    !operatorSnapshotOutput.includes("Snapshot version: 1") ||
    !operatorSnapshotOutput.includes("Snapshot kind: contract-status-shipping-bundle") ||
    !operatorSnapshotOutput.includes("Snapshot transport: dedicated-endpoint") ||
    !operatorSnapshotOutput.includes("Snapshot endpoint: /state/private-core-snapshot") ||
    !operatorSnapshotOutput.includes("Snapshot gate transport: dedicated-endpoint") ||
    !operatorSnapshotOutput.includes("Snapshot gate endpoint: /state/private-core-snapshot-check") ||
    !operatorSnapshotOutput.includes("Contract version: 23") ||
    !operatorSnapshotOutput.includes("Contract summary version: 47") ||
    !operatorSnapshotOutput.includes(
      "Supported shipping decision note: Canonical operator ship/no-ship decision surface for the frozen narrow private-core zk v1 lane.",
    ) ||
    !operatorSnapshotOutput.includes(
      "Supported operator status note: Canonical long-form live operator-status surface composed from the bundled snapshot plus the dedicated shipping artifact.",
    ) ||
    !operatorSnapshotOutput.includes(
      "Supported operator snapshot note: Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together.",
    ) ||
    !operatorSnapshotOutput.includes(
      "Supported shipping artifact note: Canonical release-grade machine-readable operator artifact containing the shipping decision plus the bundled contract, live status summary, and canonical shipping surfaces together.",
    ) ||
    !operatorSnapshotOutput.includes(
      "Supported shipping decision gate note: Compact shipping decision surface can act as a strict ready gate for the frozen narrow lane.",
    ) ||
    !operatorSnapshotOutput.includes(
      "Supported operator status gate note: Long-form operator-status surface can act as a strict ready gate for the frozen narrow lane.",
    ) ||
    !operatorSnapshotOutput.includes(
      "Supported operator snapshot gate note: Bundled operator snapshot surface can act as a strict ready gate for the frozen narrow lane.",
    ) ||
    !operatorSnapshotOutput.includes(
      "Supported shipping artifact gate note: Release-grade shipping artifact surface can act as a strict ready gate for the frozen narrow lane.",
    ) ||
    !operatorSnapshotOutput.includes("Summary state version: 1") ||
    !operatorSnapshotOutput.includes("Summary version: 47") ||
    !operatorSnapshotOutput.includes("Summary generated:") ||
    !operatorSnapshotOutput.includes("Decision version: 1") ||
    !operatorSnapshotOutput.includes("Decision kind: narrow-private-core-zk-v1-shipping") ||
    !operatorSnapshotOutput.includes("Decision status: Ready to ship") ||
    !operatorSnapshotOutput.includes(
      "Decision note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    ) ||
    !operatorSnapshotOutput.includes("Shipping status: Ready narrow v1") ||
    !operatorSnapshotOutput.includes(
      "Shipping note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    ) ||
    !operatorSnapshotOutput.includes("Finish line status: Coherent minimum v1 lane") ||
    !operatorSnapshotOutput.includes(
      "Finish line note: Frozen minimum zk v1 send/unshield/release lane is coherent at the operator boundary.",
    ) ||
    !operatorSnapshotOutput.includes("Required lanes status: Coherent required lanes") ||
    !operatorSnapshotOutput.includes(
      "Required lanes note: Minimum zk v1 required lanes are coherent: send boundary is healthy, release boundary is recorded, and the finish line remains coherent.",
    ) ||
    !operatorSnapshotOutput.includes("Release boundary status: Release recorded") ||
    !operatorSnapshotOutput.includes(
      "Release boundary note: Latest private-core release is recorded, proof-linked, and consistent with the frozen release contract.",
    ) ||
    !operatorSnapshotOutput.includes("Contract mirror status: Summary mirrors frozen contract") ||
    !operatorSnapshotOutput.includes(
      "Contract mirror note: Operator summary mirrors the frozen private-core contract across all supported static fields.",
    ) ||
    !operatorSnapshotOutput.includes("Boundary status: Operator boundary coherent") ||
    !operatorSnapshotOutput.includes(
      "Boundary note: Current root, consume, release, and linked proofs agree.",
    )
  ) {
    throw new Error(
      `Unexpected send-change->unshield operator snapshot output\n${operatorSnapshotOutput}`,
    );
  }
  printStatus("private-core send-change->unshield operator-snapshot: PASS");

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
    !shippingStatusOutput.includes(`Operator: ${baseUrl}`) ||
    !shippingStatusOutput.includes("Summary state version: 1") ||
    !shippingStatusOutput.includes("Decision version: 1") ||
    !shippingStatusOutput.includes("Decision kind: narrow-private-core-zk-v1-shipping") ||
    !shippingStatusOutput.includes("Decision status: Ready to ship") ||
    !shippingStatusOutput.includes(
      "Decision note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    ) ||
    !shippingStatusOutput.includes("Mirrored contract version: 23") ||
    !shippingStatusOutput.includes("Summary version: 47") ||
    !shippingStatusOutput.includes("Summary generated:") ||
    !shippingStatusOutput.includes("Shipping status: Ready narrow v1") ||
    !shippingStatusOutput.includes(
      "Shipping note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    ) ||
    !shippingStatusOutput.includes("Finish line status: Coherent minimum v1 lane") ||
    !shippingStatusOutput.includes(
      "Finish line note: Frozen minimum zk v1 send/unshield/release lane is coherent at the operator boundary.",
    ) ||
    !shippingStatusOutput.includes("Required lanes status: Coherent required lanes") ||
    !shippingStatusOutput.includes(
      "Required lanes note: Minimum zk v1 required lanes are coherent: send boundary is healthy, release boundary is recorded, and the finish line remains coherent.",
    ) ||
    !shippingStatusOutput.includes("Release boundary status: Release recorded") ||
    !shippingStatusOutput.includes(
      "Release boundary note: Latest private-core release is recorded, proof-linked, and consistent with the frozen release contract.",
    ) ||
    !shippingStatusOutput.includes("Contract mirror status: Summary mirrors frozen contract") ||
    !shippingStatusOutput.includes(
      "Contract mirror note: Operator summary mirrors the frozen private-core contract across all supported static fields.",
    ) ||
    !shippingStatusOutput.includes("Boundary status: Operator boundary coherent") ||
    !shippingStatusOutput.includes(
      "Boundary note: Current root, consume, release, and linked proofs agree.",
    )
  ) {
    throw new Error(`Unexpected send-change->unshield shipping-status output\n${shippingStatusOutput}`);
  }
  printStatus("private-core send-change->unshield shipping-status: PASS");

  const shippingStatusJsonOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:shipping-check-json",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const shippingStatusJson = JSON.parse(shippingStatusJsonOutput);
  if (
    shippingStatusJson.decisionVersion !== 1 ||
    shippingStatusJson.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    shippingStatusJson.decisionStatusRaw !== "ready-to-ship" ||
    shippingStatusJson.decisionStatus !== "Ready to ship" ||
    shippingStatusJson.decisionNote !==
      "Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane." ||
    shippingStatusJson.summaryStateVersion !== 1 ||
    shippingStatusJson.mirroredContractVersion !== 23 ||
    shippingStatusJson.summaryVersion !== 47 ||
    typeof shippingStatusJson.summaryGenerated !== "number" ||
    shippingStatusJson.shippingStatusRaw !== "ready-narrow-v1" ||
    shippingStatusJson.shippingStatus !== "Ready narrow v1" ||
    shippingStatusJson.finishLineStatusRaw !== "coherent-minimum-v1-lane" ||
    shippingStatusJson.requiredLanesStatusRaw !== "coherent-required-lanes" ||
    shippingStatusJson.releaseBoundaryStatusRaw !== "release-recorded" ||
    shippingStatusJson.contractMirrorStatusRaw !== "mirrors-contract" ||
    shippingStatusJson.boundaryStatusRaw !== "coherent"
  ) {
    throw new Error(
      `Unexpected send-change->unshield shipping-status JSON output\n${JSON.stringify(shippingStatusJson, null, 2)}`,
    );
  }
  printStatus("private-core send-change->unshield shipping-status json: PASS");

  const shippingCheckOutput = execFileSync("node", ["scripts/print-vanta-private-core-shipping-status.mjs", "--base-url", baseUrl, "--check-ready"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (
    !shippingCheckOutput.includes(`Operator: ${baseUrl}`) ||
    !shippingCheckOutput.includes("Summary state version: 1") ||
    !shippingCheckOutput.includes("Decision version: 1") ||
    !shippingCheckOutput.includes("Decision kind: narrow-private-core-zk-v1-shipping") ||
    !shippingCheckOutput.includes("Decision status: Ready to ship") ||
    !shippingCheckOutput.includes(
      "Decision note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    ) ||
    !shippingCheckOutput.includes("Mirrored contract version: 23") ||
    !shippingCheckOutput.includes("Summary version: 47") ||
    !shippingCheckOutput.includes("Summary generated:") ||
    !shippingCheckOutput.includes("Shipping status: Ready narrow v1") ||
    !shippingCheckOutput.includes(
      "Shipping note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    ) ||
    !shippingCheckOutput.includes("Finish line status: Coherent minimum v1 lane") ||
    !shippingCheckOutput.includes(
      "Finish line note: Frozen minimum zk v1 send/unshield/release lane is coherent at the operator boundary.",
    ) ||
    !shippingCheckOutput.includes("Required lanes status: Coherent required lanes") ||
    !shippingCheckOutput.includes(
      "Required lanes note: Minimum zk v1 required lanes are coherent: send boundary is healthy, release boundary is recorded, and the finish line remains coherent.",
    ) ||
    !shippingCheckOutput.includes("Release boundary status: Release recorded") ||
    !shippingCheckOutput.includes(
      "Release boundary note: Latest private-core release is recorded, proof-linked, and consistent with the frozen release contract.",
    ) ||
    !shippingCheckOutput.includes("Contract mirror status: Summary mirrors frozen contract") ||
    !shippingCheckOutput.includes(
      "Contract mirror note: Operator summary mirrors the frozen private-core contract across all supported static fields.",
    ) ||
    !shippingCheckOutput.includes("Boundary status: Operator boundary coherent") ||
    !shippingCheckOutput.includes(
      "Boundary note: Current root, consume, release, and linked proofs agree.",
    )
  ) {
    throw new Error(
      `Unexpected send-change->unshield shipping-check output\n${shippingCheckOutput}`,
    );
  }
  printStatus("private-core send-change->unshield shipping-check: PASS");

  const shippingArtifactJsonOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:shipping-artifact-check-json",
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
    shippingArtifactJson.artifactVersion !== 1 ||
    shippingArtifactJson.artifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    shippingArtifactJson.decisionVersion !== 1 ||
    shippingArtifactJson.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    shippingArtifactJson.decisionStatus !== "ready-to-ship" ||
    shippingArtifactJson.decisionNote !==
      "Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane." ||
    shippingArtifactJson.snapshotVersion !== 1 ||
    shippingArtifactJson.snapshotKind !== "contract-status-shipping-bundle" ||
    shippingArtifactJson.contractVersion !== 23 ||
    shippingArtifactJson.summaryVersion !== 47 ||
    shippingArtifactJson.snapshot?.shipping?.shippingStatusRaw !== "ready-narrow-v1"
  ) {
    throw new Error(
      `Unexpected send-change->unshield shipping-artifact-check json output\n${JSON.stringify(shippingArtifactJson, null, 2)}`,
    );
  }
  printStatus("private-core send-change->unshield shipping-artifact-check json: PASS");

  const shippingArtifactOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:shipping-artifact-check",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (
    !shippingArtifactOutput.includes(`Operator: ${baseUrl}`) ||
    !shippingArtifactOutput.includes("Artifact version: 1") ||
    !shippingArtifactOutput.includes("Artifact kind: shipping-decision-checked-snapshot-bundle") ||
    !shippingArtifactOutput.includes("Decision version: 1") ||
    !shippingArtifactOutput.includes("Decision kind: narrow-private-core-zk-v1-shipping") ||
    !shippingArtifactOutput.includes("Decision status: Ready to ship") ||
    !shippingArtifactOutput.includes(
      "Decision note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    ) ||
    !shippingArtifactOutput.includes("Snapshot version: 1") ||
    !shippingArtifactOutput.includes("Snapshot kind: contract-status-shipping-bundle") ||
    !shippingArtifactOutput.includes("Contract version: 23") ||
    !shippingArtifactOutput.includes("Summary version: 47") ||
    !shippingArtifactOutput.includes("Snapshot transport: dedicated-endpoint") ||
    !shippingArtifactOutput.includes("Snapshot endpoint: /state/private-core-snapshot") ||
    !shippingArtifactOutput.includes("Shipping artifact transport: dedicated-endpoint") ||
    !shippingArtifactOutput.includes(
      "Shipping artifact endpoint: /state/private-core-shipping-artifact",
    ) ||
    !shippingArtifactOutput.includes("Shipping artifact gate transport: dedicated-endpoint") ||
    !shippingArtifactOutput.includes(
      "Shipping artifact gate endpoint: /state/private-core-shipping-artifact-check",
    ) ||
    !shippingArtifactOutput.includes("Summary generated:") ||
    !shippingArtifactOutput.includes("Shipping status: Ready narrow v1") ||
    !shippingArtifactOutput.includes(
      "Shipping note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    ) ||
    !shippingArtifactOutput.includes("Finish line status: Coherent minimum v1 lane") ||
    !shippingArtifactOutput.includes(
      "Finish line note: Frozen minimum zk v1 send/unshield/release lane is coherent at the operator boundary.",
    ) ||
    !shippingArtifactOutput.includes("Required lanes status: Coherent required lanes") ||
    !shippingArtifactOutput.includes(
      "Required lanes note: Minimum zk v1 required lanes are coherent: send boundary is healthy, release boundary is recorded, and the finish line remains coherent.",
    ) ||
    !shippingArtifactOutput.includes("Release boundary status: Release recorded") ||
    !shippingArtifactOutput.includes(
      "Release boundary note: Latest private-core release is recorded, proof-linked, and consistent with the frozen release contract.",
    ) ||
    !shippingArtifactOutput.includes("Contract mirror status: Summary mirrors frozen contract") ||
    !shippingArtifactOutput.includes(
      "Contract mirror note: Operator summary mirrors the frozen private-core contract across all supported static fields.",
    ) ||
    !shippingArtifactOutput.includes("Boundary status: Operator boundary coherent") ||
    !shippingArtifactOutput.includes(
      "Boundary note: Current root, consume, release, and linked proofs agree.",
    )
  ) {
    throw new Error(
      shippingArtifactOutput ||
        "send-change->unshield shipping-artifact-check returned unexpected output",
    );
  }
  printStatus("private-core send-change->unshield shipping-artifact-check: PASS");

  const shippingArtifactSurfaceJsonOutput = execFileSync("npm", [
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
  const shippingArtifactSurfaceJson = JSON.parse(shippingArtifactSurfaceJsonOutput);
  if (
    shippingArtifactSurfaceJson.operator !== baseUrl ||
    shippingArtifactSurfaceJson.artifactVersion !== 1 ||
    shippingArtifactSurfaceJson.artifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    shippingArtifactSurfaceJson.decisionVersion !== 1 ||
    shippingArtifactSurfaceJson.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    shippingArtifactSurfaceJson.decisionStatus !== "ready-to-ship" ||
    shippingArtifactSurfaceJson.snapshotVersion !== 1 ||
    shippingArtifactSurfaceJson.snapshotKind !== "contract-status-shipping-bundle" ||
    shippingArtifactSurfaceJson.contractVersion !== 23 ||
    shippingArtifactSurfaceJson.summaryVersion !== 47 ||
    shippingArtifactSurfaceJson.snapshot?.shipping?.shippingStatusRaw !== "ready-narrow-v1"
  ) {
    throw new Error(
      `Unexpected send-change->unshield shipping-artifact json output\n${JSON.stringify(shippingArtifactSurfaceJson, null, 2)}`,
    );
  }
  printStatus("private-core send-change->unshield shipping-artifact json: PASS");

  const shippingArtifactSurfaceOutput = execFileSync("npm", [
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
    !shippingArtifactSurfaceOutput.includes(`Operator: ${baseUrl}`) ||
    !shippingArtifactSurfaceOutput.includes("Artifact version: 1") ||
    !shippingArtifactSurfaceOutput.includes("Artifact kind: shipping-decision-checked-snapshot-bundle") ||
    !shippingArtifactSurfaceOutput.includes("Decision version: 1") ||
    !shippingArtifactSurfaceOutput.includes("Decision kind: narrow-private-core-zk-v1-shipping") ||
    !shippingArtifactSurfaceOutput.includes("Decision status: Ready to ship") ||
    !shippingArtifactSurfaceOutput.includes(
      "Decision note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    ) ||
    !shippingArtifactSurfaceOutput.includes("Snapshot version: 1") ||
    !shippingArtifactSurfaceOutput.includes("Snapshot kind: contract-status-shipping-bundle") ||
    !shippingArtifactSurfaceOutput.includes("Contract version: 23") ||
    !shippingArtifactSurfaceOutput.includes("Summary version: 47") ||
    !shippingArtifactSurfaceOutput.includes("Snapshot transport: dedicated-endpoint") ||
    !shippingArtifactSurfaceOutput.includes("Snapshot endpoint: /state/private-core-snapshot") ||
    !shippingArtifactSurfaceOutput.includes("Shipping artifact transport: dedicated-endpoint") ||
    !shippingArtifactSurfaceOutput.includes(
      "Shipping artifact endpoint: /state/private-core-shipping-artifact",
    ) ||
    !shippingArtifactSurfaceOutput.includes("Shipping artifact gate transport: dedicated-endpoint") ||
    !shippingArtifactSurfaceOutput.includes(
      "Shipping artifact gate endpoint: /state/private-core-shipping-artifact-check",
    ) ||
    !shippingArtifactSurfaceOutput.includes("Summary generated:") ||
    !shippingArtifactSurfaceOutput.includes("Shipping status: Ready narrow v1") ||
    !shippingArtifactSurfaceOutput.includes(
      "Shipping note: Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
    ) ||
    !shippingArtifactSurfaceOutput.includes("Finish line status: Coherent minimum v1 lane") ||
    !shippingArtifactSurfaceOutput.includes(
      "Finish line note: Frozen minimum zk v1 send/unshield/release lane is coherent at the operator boundary.",
    ) ||
    !shippingArtifactSurfaceOutput.includes("Required lanes status: Coherent required lanes") ||
    !shippingArtifactSurfaceOutput.includes(
      "Required lanes note: Minimum zk v1 required lanes are coherent: send boundary is healthy, release boundary is recorded, and the finish line remains coherent.",
    ) ||
    !shippingArtifactSurfaceOutput.includes("Release boundary status: Release recorded") ||
    !shippingArtifactSurfaceOutput.includes(
      "Release boundary note: Latest private-core release is recorded, proof-linked, and consistent with the frozen release contract.",
    ) ||
    !shippingArtifactSurfaceOutput.includes("Contract mirror status: Summary mirrors frozen contract") ||
    !shippingArtifactSurfaceOutput.includes(
      "Contract mirror note: Operator summary mirrors the frozen private-core contract across all supported static fields.",
    ) ||
    !shippingArtifactSurfaceOutput.includes("Boundary status: Operator boundary coherent") ||
    !shippingArtifactSurfaceOutput.includes(
      "Boundary note: Current root, consume, release, and linked proofs agree.",
    )
  ) {
    throw new Error(
      shippingArtifactSurfaceOutput ||
        "send-change->unshield shipping-artifact returned unexpected output",
    );
  }
  printStatus("private-core send-change->unshield shipping-artifact: PASS");

  let blockedReleaseCandidateCheckJson = null;
  try {
    execFileSync("npm", [
      "run",
      "--silent",
      "private-core:release-candidate-check-json",
      "--",
      "--base-url",
      baseUrl,
    ], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    blockedReleaseCandidateCheckJson = error;
  }
  const blockedReleaseCandidateCheckJsonOutput =
    blockedReleaseCandidateCheckJson &&
    typeof blockedReleaseCandidateCheckJson === "object" &&
    "stderr" in blockedReleaseCandidateCheckJson &&
    typeof blockedReleaseCandidateCheckJson.stderr === "string"
      ? blockedReleaseCandidateCheckJson.stderr
      : "";
  const blockedReleaseCandidateJsonStart =
    blockedReleaseCandidateCheckJsonOutput.indexOf("{");
  const blockedReleaseCandidateJsonEnd =
    blockedReleaseCandidateCheckJsonOutput.lastIndexOf("}");
  if (
    blockedReleaseCandidateJsonStart === -1 ||
    blockedReleaseCandidateJsonEnd === -1 ||
    !blockedReleaseCandidateCheckJsonOutput.includes(
      "Release candidate decision status: Blocked",
    ) ||
    !blockedReleaseCandidateCheckJsonOutput.includes(
      "Release candidate decision note: Latest operator consume state does not match the release candidate bound to this release path.",
    )
  ) {
    throw new Error(
      blockedReleaseCandidateCheckJsonOutput ||
        "send-change->unshield release-candidate-check-json did not fail with structured output",
    );
  }
  const releaseCandidateJson = JSON.parse(
    blockedReleaseCandidateCheckJsonOutput.slice(
      blockedReleaseCandidateJsonStart,
      blockedReleaseCandidateJsonEnd + 1,
    ),
  );
  if (
    releaseCandidateJson.candidateVersion !== 1 ||
    releaseCandidateJson.candidateKind !== "private-core-send-consume-release-candidate" ||
    releaseCandidateJson.releaseCandidateId !== releaseCandidateId ||
    releaseCandidateJson.lineageStatus !== "consume-mismatch" ||
    releaseCandidateJson.sendId !== shippingArtifactSurfaceJson.latestSendId ||
    releaseCandidateJson.releaseRequestId !== shippingArtifactSurfaceJson.latestReleaseRequestId ||
    releaseCandidateJson.releasedAmount !== shippingArtifactSurfaceJson.latestReleasedAmount
  ) {
    throw new Error(
      `Unexpected send-change->unshield release-candidate json output\n${JSON.stringify(releaseCandidateJson, null, 2)}`,
    );
  }
  printStatus("private-core send-change->unshield release-candidate json: PASS");

  let blockedReleaseCandidateCheck = null;
  try {
    execFileSync("npm", [
      "run",
      "--silent",
      "private-core:release-candidate-check",
      "--",
      "--base-url",
      baseUrl,
    ], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    blockedReleaseCandidateCheck = error;
  }
  const releaseCandidateOutput =
    blockedReleaseCandidateCheck &&
    typeof blockedReleaseCandidateCheck === "object" &&
    "stderr" in blockedReleaseCandidateCheck &&
    typeof blockedReleaseCandidateCheck.stderr === "string"
      ? blockedReleaseCandidateCheck.stderr
      : "";
  if (
    !releaseCandidateOutput.includes(`Release candidate: ${releaseCandidateId}`) ||
    !releaseCandidateOutput.includes("Lineage status: Candidate/consume mismatch") ||
    !releaseCandidateOutput.includes(
      `Send: ${shippingArtifactSurfaceJson.latestSendId ?? "Unavailable"}`,
    ) ||
    !releaseCandidateOutput.includes(
      `Release request: ${shippingArtifactSurfaceJson.latestReleaseRequestId ?? "Unavailable"}`,
    ) ||
    !releaseCandidateOutput.includes(
      "Release candidate decision status: Blocked",
    ) ||
    !releaseCandidateOutput.includes(
      "Release candidate decision note: Latest operator consume state does not match the release candidate bound to this release path.",
    )
  ) {
    throw new Error(
      releaseCandidateOutput ||
        "send-change->unshield release-candidate returned unexpected output",
    );
  }
  printStatus("private-core send-change->unshield release-candidate: PASS");

  const operatorSnapshotCheckJsonOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:operator-snapshot-check-json",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const operatorSnapshotCheckJson = JSON.parse(operatorSnapshotCheckJsonOutput);
  if (
    operatorSnapshotCheckJson.snapshotVersion !== 1 ||
    operatorSnapshotCheckJson.snapshotKind !== "contract-status-shipping-bundle" ||
    operatorSnapshotCheckJson.contract?.contractVersion !== 23 ||
    operatorSnapshotCheckJson.contract?.summaryVersion !== 47 ||
    operatorSnapshotCheckJson.contract?.supportedShippingDecisionNote !==
      "Canonical operator ship/no-ship decision surface for the frozen narrow private-core zk v1 lane." ||
    operatorSnapshotCheckJson.contract?.supportedOperatorStatusNote !==
      "Canonical long-form live operator-status surface composed from the bundled snapshot plus the dedicated shipping artifact." ||
    operatorSnapshotCheckJson.contract?.supportedOperatorSnapshotNote !==
      "Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together." ||
    operatorSnapshotCheckJson.contract?.supportedShippingArtifactNote !==
      "Canonical release-grade machine-readable operator artifact containing the shipping decision plus the bundled contract, live status summary, and canonical shipping surfaces together." ||
    operatorSnapshotCheckJson.contract?.supportedShippingDecisionGateNote !==
      "Compact shipping decision surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorSnapshotCheckJson.contract?.supportedOperatorStatusGateNote !==
      "Long-form operator-status surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorSnapshotCheckJson.contract?.supportedOperatorSnapshotGateNote !==
      "Bundled operator snapshot surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorSnapshotCheckJson.contract?.supportedShippingArtifactGateNote !==
      "Release-grade shipping artifact surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorSnapshotCheckJson.shipping?.decisionStatusRaw !== "ready-to-ship" ||
    operatorSnapshotCheckJson.shipping?.shippingStatusRaw !== "ready-narrow-v1"
  ) {
    throw new Error(
      `Unexpected send-change->unshield operator-snapshot-check json output\n${JSON.stringify(operatorSnapshotCheckJson, null, 2)}`,
    );
  }
  printStatus("private-core send-change->unshield operator-snapshot-check json: PASS");

  const operatorStatusCheckJsonOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:operator-status-check-json",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const operatorStatusCheckJson = JSON.parse(operatorStatusCheckJsonOutput);
  if (
    operatorStatusCheckJson.snapshotVersion !== 1 ||
    operatorStatusCheckJson.snapshotKind !== "contract-status-shipping-bundle" ||
    operatorStatusCheckJson.shippingArtifactVersion !== 1 ||
    operatorStatusCheckJson.shippingArtifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    operatorStatusCheckJson.summary?.contractVersion !== 23 ||
    operatorStatusCheckJson.summary?.summaryVersion !== 47 ||
    operatorStatusCheckJson.summary?.supportedShippingDecisionNote !==
      "Canonical operator ship/no-ship decision surface for the frozen narrow private-core zk v1 lane." ||
    operatorStatusCheckJson.summary?.supportedOperatorStatusNote !==
      "Canonical long-form live operator-status surface composed from the bundled snapshot plus the dedicated shipping artifact." ||
    operatorStatusCheckJson.summary?.supportedOperatorSnapshotNote !==
      "Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together." ||
    operatorStatusCheckJson.summary?.supportedShippingArtifactNote !==
      "Canonical release-grade machine-readable operator artifact containing the shipping decision plus the bundled contract, live status summary, and canonical shipping surfaces together." ||
    operatorStatusCheckJson.summary?.supportedShippingDecisionGateNote !==
      "Compact shipping decision surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorStatusCheckJson.summary?.supportedOperatorStatusGateNote !==
      "Long-form operator-status surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorStatusCheckJson.summary?.supportedOperatorSnapshotGateNote !==
      "Bundled operator snapshot surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorStatusCheckJson.summary?.supportedShippingArtifactGateNote !==
      "Release-grade shipping artifact surface can act as a strict ready gate for the frozen narrow lane." ||
    operatorStatusCheckJson.shippingDecision?.decisionStatus !== "ready-to-ship"
  ) {
    throw new Error(
      `Unexpected send-change->unshield operator-status-check json output\n${JSON.stringify(operatorStatusCheckJson, null, 2)}`,
    );
  }
  printStatus("private-core send-change->unshield operator-status-check json: PASS");

  const operatorStatusCheckOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:operator-status-check",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (
    !operatorStatusCheckOutput.includes(
      "Supported shipping decision note: Canonical operator ship/no-ship decision surface for the frozen narrow private-core zk v1 lane.",
    ) ||
    !operatorStatusCheckOutput.includes(
      "Supported operator status note: Canonical long-form live operator-status surface composed from the bundled snapshot plus the dedicated shipping artifact.",
    ) ||
    !operatorStatusCheckOutput.includes(
      "Supported operator snapshot note: Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together.",
    ) ||
    !operatorStatusCheckOutput.includes(
      "Supported shipping artifact note: Canonical release-grade machine-readable operator artifact containing the shipping decision plus the bundled contract, live status summary, and canonical shipping surfaces together.",
    ) ||
    !operatorStatusCheckOutput.includes(
      "Supported shipping decision gate note: Compact shipping decision surface can act as a strict ready gate for the frozen narrow lane.",
    ) ||
    !operatorStatusCheckOutput.includes(
      "Supported operator status gate note: Long-form operator-status surface can act as a strict ready gate for the frozen narrow lane.",
    ) ||
    !operatorStatusCheckOutput.includes(
      "Supported operator snapshot gate note: Bundled operator snapshot surface can act as a strict ready gate for the frozen narrow lane.",
    ) ||
    !operatorStatusCheckOutput.includes(
      "Supported shipping artifact gate note: Release-grade shipping artifact surface can act as a strict ready gate for the frozen narrow lane.",
    )
  ) {
    throw new Error(
      `Unexpected send-change->unshield operator-status-check output\n${operatorStatusCheckOutput}`,
    );
  }
  printStatus("private-core send-change->unshield operator-status-check: PASS");

  const operatorSnapshotCheckOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:operator-snapshot-check",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (
    !operatorSnapshotCheckOutput.includes(
      "Supported shipping decision note: Canonical operator ship/no-ship decision surface for the frozen narrow private-core zk v1 lane.",
    ) ||
    !operatorSnapshotCheckOutput.includes(
      "Supported operator status note: Canonical long-form live operator-status surface composed from the bundled snapshot plus the dedicated shipping artifact.",
    ) ||
    !operatorSnapshotCheckOutput.includes(
      "Supported operator snapshot note: Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together.",
    ) ||
    !operatorSnapshotCheckOutput.includes(
      "Supported shipping artifact note: Canonical release-grade machine-readable operator artifact containing the shipping decision plus the bundled contract, live status summary, and canonical shipping surfaces together.",
    ) ||
    !operatorSnapshotCheckOutput.includes(
      "Supported shipping decision gate note: Compact shipping decision surface can act as a strict ready gate for the frozen narrow lane.",
    ) ||
    !operatorSnapshotCheckOutput.includes(
      "Supported operator status gate note: Long-form operator-status surface can act as a strict ready gate for the frozen narrow lane.",
    ) ||
    !operatorSnapshotCheckOutput.includes(
      "Supported operator snapshot gate note: Bundled operator snapshot surface can act as a strict ready gate for the frozen narrow lane.",
    ) ||
    !operatorSnapshotCheckOutput.includes(
      "Supported shipping artifact gate note: Release-grade shipping artifact surface can act as a strict ready gate for the frozen narrow lane.",
    )
  ) {
    throw new Error(
      `Unexpected send-change->unshield operator-snapshot-check output\n${operatorSnapshotCheckOutput}`,
    );
  }
  printStatus("private-core send-change->unshield operator-snapshot-check: PASS");

  const replay = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({
      sourceArtifacts: changeSourceArtifacts,
      witnessPackage: changeUnshieldBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!replay.text.includes("has already been consumed")) {
    throw new Error(replay.text || "change replay rejection failed after send-change->unshield roundtrip");
  }
  printStatus("private-core send-change->unshield replay rejection: PASS");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
  if (output) {
    console.error(output);
  }
  if (serverExit) {
    console.error(`operator server exited early: ${JSON.stringify(serverExit)}`);
  }
  process.exitCode = 1;
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

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
  circuitMerkleDepth: 3,
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
  printStatus("private-core send-change->unshield input root registration: PASS");

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
    sendTransitionResponse.parsed?.resultingRootBasis !== "client-declared" ||
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
    circuitMerkleDepth: 3,
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
    summary.parsed?.latestSend?.resultingRootBasis !== "client-declared" ||
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
    "Mirrored contract version: 14",
    "Summary version: 38",
    "Summary generated:",
    "Shipping decision version: 1",
    "Shipping decision kind: narrow-private-core-zk-v1-shipping",
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
    "Supported swap lane note: Current constrained swap lane supports one VUSD input note into one shielded SOL output through an operator-backed Meteora-aware quote and execution path.",
    "Supported swap venue: Meteora DLMM devnet",
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
    "Supported asset: VUSD",
    "Supported environment: solana-devnet",
    "Supported proof system: Noir ACIR / UltraHonk / bb.js",
    "Owner authorization mode: X25519 secret prechecked off-circuit",
    "Nullifier key mode: Note secret as nullifier key v0",
    "Proving hash lane: poseidon-bn254-proving-lane-v0",
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
    "Latest send resulting-root basis: client-declared",
    "Latest send resulting root:",
    "Latest release:",
    "Latest release proof:",
    "Latest release linked proof:",
    "Release authorization: Proof-backed consume",
    "Release root policy: Latest registered root",
    "Release destination: 0xaaaaaaaa...aaaaaa",
    "Released value: 20000000 / 0xaaaaaaaa...aaaaaa",
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
    "Latest send amount: 13000000",
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
    !shippingStatusOutput.includes("Mirrored contract version: 14") ||
    !shippingStatusOutput.includes("Summary version: 38") ||
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
    !shippingStatusOutput.includes("Release boundary status: Release recorded") ||
    !shippingStatusOutput.includes("Contract mirror status: Summary mirrors frozen contract") ||
    !shippingStatusOutput.includes("Boundary status: Operator boundary coherent")
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
    shippingStatusJson.mirroredContractVersion !== 14 ||
    shippingStatusJson.summaryVersion !== 38 ||
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

  execFileSync("node", ["scripts/print-vanta-private-core-shipping-status.mjs", "--base-url", baseUrl, "--check-ready"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  printStatus("private-core send-change->unshield shipping-check: PASS");

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

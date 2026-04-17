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
  return 10880 + Math.floor(Math.random() * 100);
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
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-chain-unshield-"));
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
const firstSender = owners[2];
const firstRecipient = owners[4];
const finalRecipient = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x6666666666666666666666666666666666666666666666666666666666666666",
);
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
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-chain-unshield-server-"));
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

  const firstInputRootBoundary = unshieldProof.buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote: firstHeldSender,
    ownerSecretKey: firstSender.secretKey,
    releaseDestination,
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
    throw new Error(firstRegisterRootResponse.text || "first operator-backed send input root registration failed");
  }
  printStatus("private-core send-chain->unshield first input root registration: PASS");

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
  printStatus("private-core send-chain->unshield first transition: PASS");

  const secondTransition = privateCore.buildVantaPrivateCoreSendTransition({
    input: heldFirstRecipient,
    recipientOwnerPublicKey: finalRecipient.publicKey,
    sendAmount: 13_000_000n,
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
    releaseDestination,
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
    throw new Error(secondRegisterRootResponse.text || "second operator-backed send input root registration failed");
  }
  printStatus("private-core send-chain->unshield second input root registration: PASS");

  const secondPreviewResult = ledger.previewSend(secondTransition);

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
  printStatus("private-core send-chain->unshield second transition: PASS");

  const finalUnshieldBoundary = unshieldProof.buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote: finalHeldRecipient,
    ownerSecretKey: finalRecipient.secretKey,
    releaseDestination,
    circuitMerkleDepth: 3,
    requireNontrivialMerklePath: true,
  });
  const finalSourceArtifacts =
    privateCore.deriveVantaPrivateCoreSourceArtifactsFromHeldNote(finalHeldRecipient);

  const registerRootResponse = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: finalSourceArtifacts,
      witnessPackage: finalUnshieldBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!registerRootResponse.ok || registerRootResponse.parsed?.known !== true) {
    throw new Error(registerRootResponse.text || "final recipient root registration failed");
  }

  const consumeResponse = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({
      sourceArtifacts: finalSourceArtifacts,
      witnessPackage: finalUnshieldBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (
    !consumeResponse.ok ||
    consumeResponse.parsed?.verified !== true ||
    consumeResponse.parsed?.releaseRecorded !== true ||
    consumeResponse.parsed?.releasedAmount !== "13000000"
  ) {
    throw new Error(consumeResponse.text || "final recipient unshield failed");
  }
  printStatus("private-core send-chain->unshield final recipient consume: PASS");

  const summary = await requestJson(baseUrl, "/state/private-core-summary", { method: "GET" });
  if (
    !summary.ok ||
    summary.parsed?.sendRecordCount !== 2 ||
    summary.parsed?.sendProofRecordCount !== 2 ||
    summary.parsed?.latestSend?.sendId !== secondTransitionResponse.parsed.sendId ||
    summary.parsed?.latestSendLinkedProof?.proofId !== secondTransitionResponse.parsed.proofId ||
    summary.parsed?.latestConsume?.proofId !== consumeResponse.parsed.proofId ||
    summary.parsed?.latestRelease?.proofId !== consumeResponse.parsed.proofId ||
    summary.parsed?.latestRelease?.releasedAmount !== "13000000" ||
    summary.parsed?.sendResultingRootRecord?.registrationBasis !== "send-recipient-output" ||
    summary.parsed?.sendResultingRootRegistrationStatus !== "linked-recipient-output" ||
    summary.parsed?.proofSendLinkStatus !== "linked" ||
    summary.parsed?.proofConsumeLinkStatus !== "linked" ||
    summary.parsed?.proofReleaseLinkStatus !== "linked" ||
    summary.parsed?.sendBoundaryStatus !== "downstream-released" ||
    summary.parsed?.sendBoundaryNote !==
      "Latest send resulting root has already been released downstream." ||
    summary.parsed?.boundaryStatus !== "coherent"
  ) {
    throw new Error(summary.text || "operator summary did not reflect chained send -> unshield roundtrip");
  }
  printStatus("private-core send-chain->unshield summary linkage: PASS");

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
    "Mirrored contract version: 19",
    "Summary version: 43",
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
    "Shipping artifact version: 1",
    "Shipping artifact kind: shipping-decision-checked-snapshot-bundle",
    "Current root:",
    "Current root proof:",
    "Current root linked proof:",
    "Current root registration: Send recipient output",
    "Current root proof link: linked",
    "Latest consume:",
    "Latest consume proof:",
    "Latest consume linked proof:",
    "Consume records: 1",
    "Latest proof:",
    "Latest proof action: consume",
    "Latest send proof:",
    "Latest send proof action: send-proof",
    "Latest send proof link:",
    "Latest send transition:",
    "Latest send linked proof:",
    "Latest send resulting-root basis: client-declared",
    "Latest send resulting root:",
    "Latest release:",
    "Latest release proof:",
    "Latest release linked proof:",
    "Release authorization: Proof-backed consume",
    "Release root policy: Latest registered root",
    "Release destination: 0x99999999...999999",
    "Released value: 13000000 / 0xaaaaaaaa...aaaaaa",
    "Release records: 1",
    "Proof/send link: linked",
    "Proof/consume link: linked",
    "Proof/release link: linked",
    "Send boundary status: Downstream released",
    "Send resulting root note: Latest private send resulting root has already been released downstream.",
    "Send resulting root registration basis: Send recipient output",
    "Send continuity note: Latest send resulting root has already been released downstream.",
    "Send boundary note: Latest send resulting root has already been released downstream.",
    "Send resulting root record:",
    "Send resulting root proof:",
    "Send resulting root linked proof:",
    "Send resulting root proof link: linked",
    "Send resulting root bundle: Complete v1",
    "Latest send amount: 13000000",
    "Send proof records: 2",
    "Send records: 2",
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
  printStatus("private-core send-chain->unshield operator-status: PASS");

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
    operatorStatusJson.summary?.contractVersion !== 19 ||
    operatorStatusJson.summary?.summaryVersion !== 43 ||
    operatorStatusJson.summary?.requiredLanesStatus !== "coherent-required-lanes" ||
    operatorStatusJson.summary?.zkV1ShippingStatus !== "ready-narrow-v1" ||
    operatorStatusJson.summary?.releaseBoundaryStatus !== "release-recorded" ||
    operatorStatusJson.summary?.boundaryStatus !== "coherent" ||
    operatorStatusJson.summary?.latestSend?.sendAmount !== "13000000" ||
    operatorStatusJson.summary?.latestRelease?.releasedAmount !== "13000000" ||
    operatorStatusJson.shippingDecision?.decisionStatus !== "ready-to-ship" ||
    operatorStatusJson.shippingDecision?.contractVersion !== 19 ||
    operatorStatusJson.shippingDecision?.summaryVersion !== 43
  ) {
    throw new Error(
      `Unexpected send-chain->unshield operator-status JSON output\n${JSON.stringify(operatorStatusJson, null, 2)}`,
    );
  }
  printStatus("private-core send-chain->unshield operator-status json: PASS");

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
    operatorSnapshotJson.contract?.contractVersion !== 19 ||
    operatorSnapshotJson.contract?.summaryVersion !== 43 ||
    operatorSnapshotJson.status?.summary?.requiredLanesStatus !== "coherent-required-lanes" ||
    operatorSnapshotJson.status?.summary?.zkV1ShippingStatus !== "ready-narrow-v1" ||
    operatorSnapshotJson.status?.summary?.latestSend?.sendAmount !== "13000000" ||
    operatorSnapshotJson.status?.summary?.latestRelease?.releasedAmount !== "13000000" ||
    operatorSnapshotJson.shipping?.decisionStatusRaw !== "ready-to-ship" ||
    operatorSnapshotJson.shipping?.shippingStatusRaw !== "ready-narrow-v1"
  ) {
    throw new Error(
      `Unexpected send-chain->unshield operator snapshot JSON output\n${JSON.stringify(operatorSnapshotJson, null, 2)}`,
    );
  }
  printStatus("private-core send-chain->unshield operator-snapshot json: PASS");

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
    !operatorSnapshotOutput.includes("Decision status: Ready to ship") ||
    !operatorSnapshotOutput.includes("Shipping status: Ready narrow v1")
  ) {
    throw new Error(
      `Unexpected send-chain->unshield operator snapshot output\n${operatorSnapshotOutput}`,
    );
  }
  printStatus("private-core send-chain->unshield operator-snapshot: PASS");

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
    !shippingStatusOutput.includes("Mirrored contract version: 19") ||
    !shippingStatusOutput.includes("Summary version: 43") ||
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
    throw new Error(`Unexpected send-chain->unshield shipping-status output\n${shippingStatusOutput}`);
  }
  printStatus("private-core send-chain->unshield shipping-status: PASS");

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
    shippingStatusJson.mirroredContractVersion !== 19 ||
    shippingStatusJson.summaryVersion !== 43 ||
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
      `Unexpected send-chain->unshield shipping-status JSON output\n${JSON.stringify(shippingStatusJson, null, 2)}`,
    );
  }
  printStatus("private-core send-chain->unshield shipping-status json: PASS");

  execFileSync("node", ["scripts/print-vanta-private-core-shipping-status.mjs", "--base-url", baseUrl, "--check-ready"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  printStatus("private-core send-chain->unshield shipping-check: PASS");

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
    shippingArtifactJson.contractVersion !== 19 ||
    shippingArtifactJson.summaryVersion !== 43 ||
    shippingArtifactJson.snapshot?.shipping?.shippingStatusRaw !== "ready-narrow-v1"
  ) {
    throw new Error(
      `Unexpected send-chain->unshield shipping-artifact-check json output\n${JSON.stringify(shippingArtifactJson, null, 2)}`,
    );
  }
  printStatus("private-core send-chain->unshield shipping-artifact-check json: PASS");

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
    !shippingArtifactOutput.includes("Artifact version: 1") ||
    !shippingArtifactOutput.includes("Artifact kind: shipping-decision-checked-snapshot-bundle") ||
    !shippingArtifactOutput.includes("Decision status: Ready to ship") ||
    !shippingArtifactOutput.includes("Shipping status: Ready narrow v1")
  ) {
    throw new Error(
      shippingArtifactOutput ||
        "send-chain->unshield shipping-artifact-check returned unexpected output",
    );
  }
  printStatus("private-core send-chain->unshield shipping-artifact-check: PASS");

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
    shippingArtifactSurfaceJson.contractVersion !== 19 ||
    shippingArtifactSurfaceJson.summaryVersion !== 43 ||
    shippingArtifactSurfaceJson.snapshot?.shipping?.shippingStatusRaw !== "ready-narrow-v1"
  ) {
    throw new Error(
      `Unexpected send-chain->unshield shipping-artifact json output\n${JSON.stringify(shippingArtifactSurfaceJson, null, 2)}`,
    );
  }
  printStatus("private-core send-chain->unshield shipping-artifact json: PASS");

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
    !shippingArtifactSurfaceOutput.includes("Artifact version: 1") ||
    !shippingArtifactSurfaceOutput.includes("Artifact kind: shipping-decision-checked-snapshot-bundle") ||
    !shippingArtifactSurfaceOutput.includes("Decision status: Ready to ship") ||
    !shippingArtifactSurfaceOutput.includes("Shipping status: Ready narrow v1")
  ) {
    throw new Error(
      shippingArtifactSurfaceOutput ||
        "send-chain->unshield shipping-artifact returned unexpected output",
    );
  }
  printStatus("private-core send-chain->unshield shipping-artifact: PASS");

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
    operatorSnapshotCheckJson.contract?.contractVersion !== 19 ||
    operatorSnapshotCheckJson.contract?.summaryVersion !== 43 ||
    operatorSnapshotCheckJson.shipping?.decisionStatusRaw !== "ready-to-ship" ||
    operatorSnapshotCheckJson.shipping?.shippingStatusRaw !== "ready-narrow-v1"
  ) {
    throw new Error(
      `Unexpected send-chain->unshield operator-snapshot-check json output\n${JSON.stringify(operatorSnapshotCheckJson, null, 2)}`,
    );
  }
  printStatus("private-core send-chain->unshield operator-snapshot-check json: PASS");

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
    operatorStatusCheckJson.summary?.contractVersion !== 19 ||
    operatorStatusCheckJson.summary?.summaryVersion !== 43 ||
    operatorStatusCheckJson.shippingDecision?.decisionStatus !== "ready-to-ship"
  ) {
    throw new Error(
      `Unexpected send-chain->unshield operator-status-check json output\n${JSON.stringify(operatorStatusCheckJson, null, 2)}`,
    );
  }
  printStatus("private-core send-chain->unshield operator-status-check json: PASS");

  execFileSync("npm", [
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
  printStatus("private-core send-chain->unshield operator-status-check: PASS");

  execFileSync("npm", [
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
  printStatus("private-core send-chain->unshield operator-snapshot-check: PASS");

  const replay = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({
      sourceArtifacts: finalSourceArtifacts,
      witnessPackage: finalUnshieldBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!replay.text.includes("has already been consumed")) {
    throw new Error(replay.text || "final recipient replay rejection failed");
  }
  printStatus("private-core send-chain->unshield replay rejection: PASS");
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

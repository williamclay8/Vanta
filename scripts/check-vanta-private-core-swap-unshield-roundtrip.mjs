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
  return 10850 + Math.floor(Math.random() * 150);
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
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-unshield-roundtrip-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    mkdirSync(tempTsDir, { recursive: true });
    const privateCoreSource = readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8");
    const swapProofSource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreSwapProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');
    const unshieldProofSource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreUnshieldProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');

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

    for (const compiledPath of [
      join(tempJsDir, "vantaPrivateCoreSwapProof.js"),
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
      swapProof: await import(pathToFileURL(join(tempJsDir, "vantaPrivateCoreSwapProof.js")).href),
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
    VANTA_PRIVATE_CORE_SWAP_PROOF_STORE_PATH: join(tempRoot, "swap-proofs.json"),
    VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(tempRoot, "sends.json"),
    VANTA_PRIVATE_CORE_SWAP_STORE_PATH: join(tempRoot, "private-core-swaps.json"),
    VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, "private-core-releases.json"),
    VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, "roots.json"),
    VANTA_RELEASE_RECORD_STORE_PATH: join(tempRoot, "releases.json"),
    VANTA_SWAP_RECORD_STORE_PATH: join(tempRoot, "live-swaps.json"),
    VANTA_SOL_UNSHIELD_RECORD_STORE_PATH: join(tempRoot, "sol-unshields.json"),
  };
}

const { privateCore, swapProof, unshieldProof } = await loadModules();

const entries = [
  { secretKey: "0x1010101010101010101010101010101010101010101010101010101010101010", amount: 11_000_000n },
  { secretKey: "0x2020202020202020202020202020202020202020202020202020202020202020", amount: 22_000_000n },
  { secretKey: "0x3030303030303030303030303030303030303030303030303030303030303030", amount: 33_000_000n },
  { secretKey: "0x4040404040404040404040404040404040404040404040404040404040404040", amount: 44_000_000n },
  { secretKey: "0x5050505050505050505050505050505050505050505050505050505050505050", amount: 55_000_000n },
];
const inputAssetId = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const outputAssetId = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const owners = entries.map((entry) => privateCore.createVantaPrivateCoreOwnerKeypair(entry.secretKey));
const sender = owners[2];
const recipient = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x6060606060606060606060606060606060606060606060606060606060606060",
);
const releaseDestination =
  "0x9999999999999999999999999999999999999999999999999999999999999999";
const ledger = new privateCore.VantaPrivateCoreLedger();

const shields = entries.map((entry, index) =>
  ledger.shield({
    assetId: inputAssetId,
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

const transition = privateCore.buildVantaPrivateCoreSwapTransition({
  input: heldInput,
  outputAssetId,
  outputAmount: 1_250_000_000n,
  recipientOwnerPublicKey: recipient.publicKey,
  outputNoteNonce: "0x6161616161616161616161616161616161616161616161616161616161616161",
  outputNoteSecret: "0x7171717171717171717171717171717171717171717171717171717171717171",
  outputBlinding: "0x8181818181818181818181818181818181818181818181818181818181818181",
  outputDerivationTag: "0x9191919191919191919191919191919191919191919191919191919191919191",
  outputSenderEphemeralSecretKey:
    "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1",
});
const swapBoundary = swapProof.buildVantaPrivateCoreSwapProofBoundary({
  transition,
  senderSecretKey: sender.secretKey,
  circuitMerkleDepth: 3,
  requireNontrivialMerklePath: true,
});

mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-unshield-roundtrip-server-"));
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
  const inputSourceArtifacts = privateCore.deriveVantaPrivateCoreSourceArtifactsFromHeldNote(heldInput);
  const inputRegisterRootResponse = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: inputSourceArtifacts,
      witnessPackage: inputRootBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!inputRegisterRootResponse.ok || inputRegisterRootResponse.parsed?.known !== true) {
    throw new Error(inputRegisterRootResponse.text || "operator-backed swap input root registration failed");
  }
  printStatus("private-core swap->unshield input root registration: PASS");

  const swapTransitionResponse = await requestJson(baseUrl, "/private-core/swap-transition", {
    body: JSON.stringify({
      resultingRoot: ledger.previewSwap(transition).resultingRoot,
      witnessPackage: swapBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (
    !swapTransitionResponse.ok ||
    swapTransitionResponse.parsed?.verified !== true ||
    swapTransitionResponse.parsed?.swapRecorded !== true
  ) {
    throw new Error(swapTransitionResponse.text || "operator-backed swap transition failed");
  }
  printStatus("private-core swap->unshield operator swap transition: PASS");

  const swapResult = ledger.swap(transition);
  const heldOutput = ledger.hold({
    encryptedPayload: swapResult.output.encryptedPayload,
    ownerSecretKey: recipient.secretKey,
  });
  if (heldOutput.note.assetId !== outputAssetId) {
    throw new Error("Recovered swap output note did not preserve the output asset.");
  }
  printStatus("private-core swap->unshield output recovery: PASS");

  const outputBoundary = unshieldProof.buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote: heldOutput,
    ownerSecretKey: recipient.secretKey,
    releaseDestination,
    circuitMerkleDepth: 3,
    requireNontrivialMerklePath: true,
  });
  const outputSourceArtifacts = privateCore.deriveVantaPrivateCoreSourceArtifactsFromHeldNote(heldOutput);
  const outputRegisterRootResponse = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: outputSourceArtifacts,
      witnessPackage: outputBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (!outputRegisterRootResponse.ok || outputRegisterRootResponse.parsed?.known !== true) {
    throw new Error(outputRegisterRootResponse.text || "operator-backed swap output root registration failed");
  }
  printStatus("private-core swap->unshield output root registration: PASS");

  const consumeResponse = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({
      sourceArtifacts: outputSourceArtifacts,
      witnessPackage: outputBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (
    !consumeResponse.ok ||
    consumeResponse.parsed?.verified !== true ||
    consumeResponse.parsed?.releaseRecorded !== true
  ) {
    throw new Error(consumeResponse.text || "operator-backed swap output consume failed");
  }
  printStatus("private-core swap->unshield operator consume: PASS");

  const summaryState = await requestJson(baseUrl, "/state/private-core-summary", { method: "GET" });
  if (
    !summaryState.ok ||
    summaryState.parsed?.latestSwap?.swapId !== swapTransitionResponse.parsed?.swapId ||
    summaryState.parsed?.currentRecord?.registrationBasis !== "swap-output" ||
    summaryState.parsed?.latestRelease?.proofId !== consumeResponse.parsed?.proofId ||
    summaryState.parsed?.proofSwapLinkStatus !== "linked"
  ) {
    throw new Error(summaryState.text || "operator-backed swap->unshield summary linkage failed");
  }
  printStatus("private-core swap->unshield summary linkage: PASS");

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
    "Mirrored contract version: 16",
    "Summary version: 40",
    "Summary generated:",
    "Shipping decision version: 1",
    "Shipping decision kind: narrow-private-core-zk-v1-shipping",
    "Shipping decision status: Blocked",
    "Shipping decision note: No private send transition is available for boundary checks yet.",
    "Required lanes status: Send lane mismatch",
    "Required lanes note: No private send transition is available for boundary checks yet.",
    "zk v1 shipping status: Required lanes mismatch",
    "zk v1 shipping note: No private send transition is available for boundary checks yet.",
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
    "Current root registration: Swap output",
    "Current root proof link: linked",
    "Root records: 2",
    "Latest consume:",
    "Latest consume proof:",
    "Latest consume linked proof:",
    "Consume records: 1",
    "Latest proof:",
    "Latest proof action: consume",
    "Proof records: 3",
    "Latest swap proof:",
    "Latest swap proof action: swap-proof",
    "Swap proof records: 1",
    "Latest swap transition:",
    "Latest swap proof link:",
    "Latest swap linked proof:",
    "Latest swap execution venue: Unavailable",
    "Latest swap quote reference: Unavailable",
    "Latest swap output: 1250000000 / 0xbbbbbbbb...bbbbbb",
    "Latest swap resulting-root basis: client-declared",
    "Latest swap resulting root:",
    "Latest release:",
    "Latest release proof:",
    "Latest release linked proof:",
    "Release authorization: Proof-backed consume",
    "Release root policy: Latest registered root",
    "Release destination: 0x99999999...999999",
    "Released value: 1250000000 / 0xbbbbbbbb...bbbbbb",
    "Release records: 1",
    "Proof/swap link: linked",
    "Proof/consume link: linked",
    "Proof/release link: linked",
    "Swap boundary status: Released downstream",
    "Swap resulting root note: Latest private swap resulting root has already been released downstream.",
    "Swap resulting root registration basis: Swap output",
    "Swap continuity note: Latest swap resulting root has already been released downstream.",
    "Swap boundary note: Latest swap resulting root has already been released downstream.",
    "Swap resulting root record:",
    "Swap resulting root proof:",
    "Swap resulting root linked proof:",
    "Swap resulting root proof link: linked",
    "Swap resulting root bundle: Complete v1",
    "Swap records: 1",
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
  printStatus("private-core swap->unshield operator-status: PASS");

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
    operatorStatusJson.summary?.stateVersion !== 1 ||
    operatorStatusJson.summary?.contractVersion !== 16 ||
    operatorStatusJson.summary?.summaryVersion !== 40 ||
    operatorStatusJson.summary?.requiredLanesStatus !== "send-lane-mismatch" ||
    operatorStatusJson.summary?.zkV1ShippingStatus !== "required-lanes-mismatch" ||
    operatorStatusJson.summary?.releaseBoundaryStatus !== "release-recorded" ||
    operatorStatusJson.summary?.boundaryStatus !== "coherent" ||
    operatorStatusJson.summary?.latestSwap?.outputAmount !== "1250000000" ||
    operatorStatusJson.summary?.latestRelease?.releasedAmount !== "1250000000" ||
    operatorStatusJson.shippingDecision?.decisionStatus !== "blocked" ||
    operatorStatusJson.shippingDecision?.contractVersion !== 16 ||
    operatorStatusJson.shippingDecision?.summaryVersion !== 40
  ) {
    throw new Error(
      `Unexpected swap->unshield operator-status JSON output\n${JSON.stringify(operatorStatusJson, null, 2)}`,
    );
  }
  printStatus("private-core swap->unshield operator-status json: PASS");

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
    operatorSnapshotJson.contract?.contractVersion !== 16 ||
    operatorSnapshotJson.contract?.summaryVersion !== 40 ||
    operatorSnapshotJson.status?.summary?.requiredLanesStatus !== "send-lane-mismatch" ||
    operatorSnapshotJson.status?.summary?.zkV1ShippingStatus !== "required-lanes-mismatch" ||
    operatorSnapshotJson.status?.summary?.latestSwap?.outputAmount !== "1250000000" ||
    operatorSnapshotJson.status?.summary?.latestRelease?.releasedAmount !== "1250000000" ||
    operatorSnapshotJson.shipping?.decisionStatusRaw !== "blocked" ||
    operatorSnapshotJson.shipping?.shippingStatusRaw !== "required-lanes-mismatch"
  ) {
    throw new Error(
      `Unexpected swap->unshield operator snapshot JSON output\n${JSON.stringify(operatorSnapshotJson, null, 2)}`,
    );
  }
  printStatus("private-core swap->unshield operator-snapshot json: PASS");

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
    !shippingStatusOutput.includes("Mirrored contract version: 16") ||
    !shippingStatusOutput.includes("Summary version: 40") ||
    !shippingStatusOutput.includes("Summary generated:") ||
    !shippingStatusOutput.includes("Shipping status: Required lanes mismatch") ||
    !shippingStatusOutput.includes(
      "Shipping note: No private send transition is available for boundary checks yet.",
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
    throw new Error(`Unexpected swap->unshield shipping-status output\n${shippingStatusOutput}`);
  }
  printStatus("private-core swap->unshield shipping-status: PASS");

  let blockedShippingCheck = null;
  try {
    execFileSync("node", ["scripts/print-vanta-private-core-shipping-status.mjs", "--base-url", baseUrl, "--check-ready"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    blockedShippingCheck = error;
  }
  const blockedShippingOutput =
    blockedShippingCheck &&
    typeof blockedShippingCheck === "object" &&
    "stderr" in blockedShippingCheck &&
    typeof blockedShippingCheck.stderr === "string"
      ? blockedShippingCheck.stderr
      : "";
  if (
    !blockedShippingCheck ||
    !blockedShippingOutput.includes("Shipping status: Required lanes mismatch") ||
    !blockedShippingOutput.includes(
      "Shipping note: No private send transition is available for boundary checks yet.",
    ) ||
    !blockedShippingOutput.includes("No private send transition is available for boundary checks yet.")
  ) {
    throw new Error(
      blockedShippingOutput || "swap->unshield shipping-check did not fail with the expected blocker",
    );
  }
  printStatus("private-core swap->unshield shipping-check: PASS");

  let blockedShippingJsonCheck = null;
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
    blockedShippingJsonCheck = error;
  }
  const blockedShippingJsonOutput =
    blockedShippingJsonCheck &&
    typeof blockedShippingJsonCheck === "object" &&
    "stderr" in blockedShippingJsonCheck &&
    typeof blockedShippingJsonCheck.stderr === "string"
      ? blockedShippingJsonCheck.stderr
      : "";
  const blockedShippingJsonStart = blockedShippingJsonOutput.indexOf("{");
  const blockedShippingJsonEnd = blockedShippingJsonOutput.lastIndexOf("}");
  if (!blockedShippingJsonCheck || blockedShippingJsonStart === -1 || blockedShippingJsonEnd === -1) {
    throw new Error(
      blockedShippingJsonOutput || "swap->unshield shipping-check json did not fail with structured output",
    );
  }
  const blockedShippingJson = JSON.parse(
    blockedShippingJsonOutput.slice(blockedShippingJsonStart, blockedShippingJsonEnd + 1),
  );
  if (
    blockedShippingJson.decisionVersion !== 1 ||
    blockedShippingJson.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    blockedShippingJson.decisionStatusRaw !== "blocked" ||
    blockedShippingJson.decisionStatus !== "Blocked" ||
    blockedShippingJson.decisionNote !==
      "No private send transition is available for boundary checks yet." ||
    blockedShippingJson.shippingStatusRaw !== "required-lanes-mismatch" ||
    blockedShippingJson.shippingStatus !== "Required lanes mismatch" ||
    blockedShippingJson.shippingNote !==
      "No private send transition is available for boundary checks yet."
  ) {
    throw new Error(
      `Unexpected swap->unshield shipping-check json failure\n${JSON.stringify(blockedShippingJson, null, 2)}`,
    );
  }
  printStatus("private-core swap->unshield shipping-check json: PASS");

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
      "Snapshot decision note: No private send transition is available for boundary checks yet.",
    )
  ) {
    throw new Error(
      blockedOperatorSnapshotCheckJsonOutput ||
        "swap->unshield operator-snapshot-check json did not fail with structured output",
    );
  }
  const blockedOperatorSnapshotJson = JSON.parse(
    blockedOperatorSnapshotCheckJsonOutput.slice(
      blockedOperatorSnapshotCheckJsonStart,
      blockedOperatorSnapshotCheckJsonEnd + 1,
    ),
  );
  if (
    blockedOperatorSnapshotJson.snapshotVersion !== 1 ||
    blockedOperatorSnapshotJson.snapshotKind !== "contract-status-shipping-bundle" ||
    blockedOperatorSnapshotJson.contract?.contractVersion !== 16 ||
    blockedOperatorSnapshotJson.contract?.summaryVersion !== 40 ||
    blockedOperatorSnapshotJson.shipping?.decisionStatusRaw !== "blocked" ||
    blockedOperatorSnapshotJson.shipping?.shippingStatusRaw !== "required-lanes-mismatch"
  ) {
    throw new Error(
      `Unexpected swap->unshield operator-snapshot-check json failure\n${JSON.stringify(blockedOperatorSnapshotJson, null, 2)}`,
    );
  }
  printStatus("private-core swap->unshield operator-snapshot-check json: PASS");

  const replayResponse = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({
      sourceArtifacts: outputSourceArtifacts,
      witnessPackage: outputBoundary.noirWitnessPackage,
    }),
    method: "POST",
  });
  if (
    replayResponse.ok ||
    !(
      replayResponse.text.includes("already been consumed") ||
      replayResponse.text.includes("is not the latest registered private-core state")
    )
  ) {
    throw new Error(replayResponse.text || "swap output replay rejection did not fire");
  }
  printStatus("private-core swap->unshield replay rejection: PASS");
} catch (error) {
  console.error(stdout);
  console.error(stderr);
  throw error;
} finally {
  await stopServer(server);
  rmSync(tempRoot, { recursive: true, force: true });
}

function toRepeatedByteHex(byte) {
  const normalizedByte = byte & 0xff;
  const pair = normalizedByte.toString(16).padStart(2, "0");
  return `0x${pair.repeat(32)}`;
}

function toRepeatedByteHex12(byte) {
  const normalizedByte = byte & 0xff;
  const pair = normalizedByte.toString(16).padStart(2, "0");
  return `0x${pair.repeat(12)}`;
}

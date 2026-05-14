import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial,
  verifyVantaPrivatePoolV2SendProofArtifact,
} from "../operator/private-pool-v2-proof-artifact.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const circuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_send_entry");
const compiledProgramPath = resolve(circuitDir, "target/vanta_private_pool_v2_send_entry.json");
const witnessPath = resolve(circuitDir, "target/vanta_private_pool_v2_send_entry.gz");
const proofArtifactPath = resolve(circuitDir, "target/vanta_private_pool_v2_send_entry.proof.json");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-browser-worker-prover-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2MerkleFixtureHelpers.ts",
  "privatePoolV2ActualPrivateSpendCircuitFixture.ts",
  "privatePoolV2ClaimCircuitFixture.ts",
  "privatePoolV2SendCircuitFixture.ts",
  "privatePoolV2ShieldCircuitFixture.ts",
  "privatePoolV2BrowserProverProtocol.ts",
  "privatePoolV2BrowserProverWorker.ts",
  "privatePoolV2BrowserProverClient.ts",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
}

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function copySource(relativePath) {
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src/privacy", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/u, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "\.\/([A-Za-z0-9]+)"/g,
    'from "./$1.js"',
  );
  writeFileSync(filePath, source);
}

function normalizeFieldString(value, label) {
  const input = String(value).trim();
  const parsed = /^0x[0-9a-f]+$/u.test(input)
    ? BigInt(input)
    : /^(0|[1-9][0-9]*)$/u.test(input)
      ? BigInt(input)
      : null;

  assert(parsed !== null, `${label} must be a field string.`);
  return parsed.toString(10);
}

function sendWitnessInputFromFixture(fixture) {
  const { witness } = fixture;
  const stringify = (value) => value.toString(10);

  return {
    asset_id_commitment: stringify(witness.asset_id_commitment),
    change_amount: stringify(witness.change_amount),
    change_append_path: witness.change_append_path.map(stringify),
    change_append_path_direction_bits: witness.change_append_path_direction_bits.map(stringify),
    change_leaf_index: stringify(witness.change_leaf_index),
    change_memo_ciphertext_body_hash: `sha256:${"22".repeat(32)}`,
    change_memo_ciphertext_body_hash_field: stringify(
      witness.change_memo_ciphertext_body_hash_field,
    ),
    change_output_commitment: stringify(witness.change_output_commitment),
    change_output_root: stringify(witness.change_output_root),
    economics_blinding: stringify(witness.economics_blinding),
    economics_commitment: stringify(witness.economics_commitment),
    input_amount: stringify(witness.input_amount),
    input_commitment: stringify(witness.input_commitment),
    input_leaf_index: stringify(witness.input_leaf_index),
    input_root: stringify(witness.input_root),
    membership_path: witness.membership_path.map(stringify),
    membership_path_direction_bits: witness.membership_path_direction_bits.map(stringify),
    nullifier: stringify(witness.nullifier),
    owner_commitment: stringify(witness.owner_commitment),
    owner_secret: stringify(witness.owner_secret),
    recipient_amount: stringify(witness.recipient_amount),
    recipient_append_path: witness.recipient_append_path.map(stringify),
    recipient_append_path_direction_bits:
      witness.recipient_append_path_direction_bits.map(stringify),
    recipient_leaf_index: stringify(witness.recipient_leaf_index),
    recipient_memo_ciphertext_body_hash: `sha256:${"11".repeat(32)}`,
    recipient_memo_ciphertext_body_hash_field: stringify(
      witness.recipient_memo_ciphertext_body_hash_field,
    ),
    recipient_output_commitment: stringify(witness.recipient_output_commitment),
    recipient_output_root: stringify(witness.recipient_output_root),
    request_version: stringify(witness.request_version),
    send_context_tag: stringify(witness.send_context_tag),
  };
}

async function expectRejection(action, expectedMessage) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(
      message.includes(expectedMessage),
      `Expected rejection containing "${expectedMessage}", received "${message}".`,
    );
    return;
  }

  throw new Error(`Expected rejection containing "${expectedMessage}".`);
}

function assertBrowserSafeSource(relativePath, source) {
  for (const forbidden of [
    "node:",
    "child_process",
    "readFileSync",
    "writeFileSync",
    "Buffer.",
    "process.",
    "nargo",
  ]) {
    assert(
      !source.includes(forbidden),
      `${relativePath} must stay browser/Web Worker safe and avoid ${forbidden}.`,
    );
  }
}

async function withWindowTimerHarness(action) {
  const previousWindow = globalThis.window;
  const activeTimeouts = new Set();

  globalThis.window = {
    clearTimeout(timeout) {
      activeTimeouts.delete(timeout);
      clearTimeout(timeout);
    },
    setTimeout(handler, timeoutMs) {
      const timeout = setTimeout(handler, timeoutMs);
      activeTimeouts.add(timeout);
      return timeout;
    },
  };

  try {
    await action({ activeTimeouts });
    assert(activeTimeouts.size === 0, "browser prover client must clear pending timeouts.");
  } finally {
    for (const timeout of activeTimeouts) {
      clearTimeout(timeout);
    }
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
}

async function waitForWorkerResponse(responses) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (responses.length > 0) {
      return responses[0];
    }
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 5));
  }

  throw new Error("Expected browser worker response.");
}

try {
  const packageJson = JSON.parse(read("package.json"));
  assert(
    packageJson.scripts?.["private-pool-v2:browser-worker-prover-check"] ===
      "node scripts/check-vanta-private-pool-v2-browser-worker-prover.mjs",
    "package.json must expose private-pool-v2:browser-worker-prover-check.",
  );
  assert(
    packageJson.scripts?.["private-pool-v2:local-prover-check"]?.includes(
      "npm run private-pool-v2:browser-worker-prover-check",
    ),
    "private-pool-v2:local-prover-check must include the browser worker prover check.",
  );
  assert(
    packageJson.scripts?.["private-pool-v2:proof-backend-boundary-check"]?.includes(
      "npm run private-pool-v2:browser-worker-prover-check",
    ),
    "private-pool-v2:proof-backend-boundary-check must include the browser worker prover check.",
  );

  const protocolSource = read("src/privacy/privatePoolV2BrowserProverProtocol.ts");
  const workerSource = read("src/privacy/privatePoolV2BrowserProverWorker.ts");
  const clientSource = read("src/privacy/privatePoolV2BrowserProverClient.ts");

  for (const [relativePath, source] of [
    ["src/privacy/privatePoolV2BrowserProverProtocol.ts", protocolSource],
    ["src/privacy/privatePoolV2BrowserProverWorker.ts", workerSource],
    ["src/privacy/privatePoolV2BrowserProverClient.ts", clientSource],
    ["src/privacy/privatePoolV2ProofRequests.ts", read("src/privacy/privatePoolV2ProofRequests.ts")],
    [
      "src/privacy/privatePoolV2MerkleFixtureHelpers.ts",
      read("src/privacy/privatePoolV2MerkleFixtureHelpers.ts"),
    ],
    [
      "src/privacy/privatePoolV2SendCircuitFixture.ts",
      read("src/privacy/privatePoolV2SendCircuitFixture.ts"),
    ],
    [
      "src/privacy/privatePoolV2ActualPrivateSpendCircuitFixture.ts",
      read("src/privacy/privatePoolV2ActualPrivateSpendCircuitFixture.ts"),
    ],
  ]) {
    assertBrowserSafeSource(relativePath, source);
  }

  assert(workerSource.includes("@aztec/bb.js"), "worker must use @aztec/bb.js.");
  assert(workerSource.includes("@noir-lang/noir_js"), "worker must use NoirJS for witness generation.");
  assert(workerSource.includes("new Noir"), "worker must execute NoirJS in the worker.");
  assert(workerSource.includes(".execute("), "worker must call NoirJS execute for witness inputs.");
  assert(
    workerSource.includes("createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput"),
    "worker must normalize Send witness input through the typed fixture builder.",
  );
  assert(
    workerSource.includes("createVantaPrivatePoolV2SendCircuitNoirInputs"),
    "worker must derive Send Noir inputs from the normalized fixture.",
  );
  assert(
    workerSource.includes("requires exactly one Send witness source"),
    "worker must reject ambiguous compressedWitness/witnessInput payloads.",
  );
  assert(
    workerSource.includes("browserWorkerErrorMessage"),
    "worker must sanitize witness-input errors before posting responses.",
  );
  assert(
    clientSource.includes("try") &&
      clientSource.includes("worker.postMessage") &&
      clientSource.includes("cleanup()"),
    "client must clean up workers and timers when postMessage throws.",
  );
  assert(workerSource.includes("Barretenberg.new({ threads: 1 })"), "worker must force bb.js threads: 1.");
  assert(workerSource.includes("UltraHonkBackend"), "worker must use UltraHonkBackend.");
  assert(
    workerSource.includes("local-bb-derived-artifact"),
    "worker artifacts must stay on the local-bb-derived-artifact backend.",
  );
  assert(
    workerSource.includes("local-acir-bytecode-hash-not-production-vk"),
    "worker artifacts must stay on local ACIR bytecode hash evidence.",
  );
  assert(
    workerSource.includes("addEventListener") && workerSource.includes("postMessage"),
    "worker must expose a Web Worker message handler.",
  );
  assert(
    clientSource.includes("new Worker(new URL(\"./privatePoolV2BrowserProverWorker.ts\", import.meta.url)"),
    "client must construct the browser worker via Vite's worker URL pattern.",
  );
  assert(
    !clientSource.includes("from \"./privatePoolV2BrowserProverWorker\""),
    "client must not import the heavy worker module into the main bundle.",
  );

  mkdirSync(tempTsDir, { recursive: true });
  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM,WebWorker",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "send"]);

  const compiledProgram = JSON.parse(readFileSync(compiledProgramPath, "utf8"));
  const compressedWitness = readFileSync(witnessPath);
  const existingArtifact = JSON.parse(readFileSync(proofArtifactPath, "utf8"));
  const packageVersion =
    packageJson.dependencies?.["@aztec/bb.js"] ??
    packageJson.devDependencies?.["@aztec/bb.js"] ??
    "unknown";

  const [
    { proveVantaPrivatePoolV2SendInBrowserWorker },
    { createVantaPrivatePoolV2SendCircuitFixture },
    { createVantaPrivatePoolV2BrowserProverClient },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2BrowserProverWorker.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2SendCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2BrowserProverClient.js")).href),
  ]);

  const compressedWitnessProofArtifact = await proveVantaPrivatePoolV2SendInBrowserWorker({
    circuit: "vanta_private_pool_v2_send_entry",
    compiledProgramBytecode: compiledProgram.bytecode,
    compressedWitness,
    expectedPublicInputHash: existingArtifact.publicInputs[0],
    proofRuntimeVersion: packageVersion,
    target: "send",
  });

  assert(
    compressedWitnessProofArtifact.circuit === "vanta_private_pool_v2_send_entry",
    "artifact must stay on Send circuit.",
  );
  assert(
    compressedWitnessProofArtifact.proofBackend === "local-bb-derived-artifact",
    "artifact must use local-bb-derived-artifact.",
  );
  assert(compressedWitnessProofArtifact.proofSystem === "noir-bb", "artifact must use noir-bb.");
  assert(
    compressedWitnessProofArtifact.verifyingKeyHashKind ===
      "local-acir-bytecode-hash-not-production-vk",
    "artifact must not claim production verifying-key evidence.",
  );
  assert(
    normalizeFieldString(
      compressedWitnessProofArtifact.publicInputs[0],
      "browser worker artifact public input",
    ) ===
      normalizeFieldString(existingArtifact.publicInputs[0], "existing Send public input"),
    "browser worker artifact must bind the Send public-input hash.",
  );
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
    compressedWitnessProofArtifact,
    "Private Pool v2 Send browser worker compressed-witness proof artifact",
  );

  const compressedWitnessReceipt = await verifyVantaPrivatePoolV2SendProofArtifact({
    proofArtifact: compressedWitnessProofArtifact,
  });
  assert(compressedWitnessReceipt.verified === true, "browser worker proof artifact must verify.");
  assert(
    normalizeFieldString(
      compressedWitnessReceipt.verifiedPublicInputs.sendPublicInputHash,
      "browser worker verified Send public input",
    ) === normalizeFieldString(existingArtifact.publicInputs[0], "existing Send public input"),
    "browser worker verified receipt must bind the Send public-input hash.",
  );

  const sendFixture = createVantaPrivatePoolV2SendCircuitFixture({ mode: "valid" });
  const sendWitnessInput = sendWitnessInputFromFixture(sendFixture);
  const witnessInputProofArtifact = await proveVantaPrivatePoolV2SendInBrowserWorker({
    circuit: "vanta_private_pool_v2_send_entry",
    compiledProgramAbi: compiledProgram.abi,
    compiledProgramBytecode: compiledProgram.bytecode,
    expectedPublicInputHash: existingArtifact.publicInputs[0],
    proofRuntimeVersion: packageVersion,
    target: "send",
    witnessInput: sendWitnessInput,
  });

  assert(
    witnessInputProofArtifact.proofBackend === "local-bb-derived-artifact",
    "witness-input worker artifact must use local-bb-derived-artifact.",
  );
  assert(
    witnessInputProofArtifact.verifyingKeyHashKind === "local-acir-bytecode-hash-not-production-vk",
    "witness-input worker artifact must not claim production verifying-key evidence.",
  );
  assert(
    normalizeFieldString(
      witnessInputProofArtifact.publicInputs[0],
      "browser worker witness-input artifact public input",
    ) === normalizeFieldString(existingArtifact.publicInputs[0], "existing Send public input"),
    "browser worker witness-input artifact must bind the Send public-input hash.",
  );
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
    witnessInputProofArtifact,
    "Private Pool v2 Send browser worker witness-input proof artifact",
  );

  const witnessInputReceipt = await verifyVantaPrivatePoolV2SendProofArtifact({
    proofArtifact: witnessInputProofArtifact,
  });
  assert(witnessInputReceipt.verified === true, "browser worker witness-input proof artifact must verify.");
  assert(
    normalizeFieldString(
      witnessInputReceipt.verifiedPublicInputs.sendPublicInputHash,
      "browser worker witness-input verified Send public input",
    ) === normalizeFieldString(existingArtifact.publicInputs[0], "existing Send public input"),
    "browser worker witness-input receipt must bind the Send public-input hash.",
  );

  await expectRejection(
    () =>
      proveVantaPrivatePoolV2SendInBrowserWorker({
        circuit: "vanta_private_pool_v2_send_entry",
        compiledProgramBytecode: compiledProgram.bytecode,
        expectedPublicInputHash: existingArtifact.publicInputs[0],
        proofRuntimeVersion: packageVersion,
        target: "send",
      }),
    "requires exactly one Send witness source",
  );
  await expectRejection(
    () =>
      proveVantaPrivatePoolV2SendInBrowserWorker({
        circuit: "vanta_private_pool_v2_send_entry",
        compiledProgramAbi: compiledProgram.abi,
        compiledProgramBytecode: compiledProgram.bytecode,
        compressedWitness,
        expectedPublicInputHash: existingArtifact.publicInputs[0],
        proofRuntimeVersion: packageVersion,
        target: "send",
        witnessInput: sendWitnessInput,
      }),
    "requires exactly one Send witness source",
  );
  await expectRejection(
    () =>
      proveVantaPrivatePoolV2SendInBrowserWorker({
        circuit: "vanta_private_pool_v2_send_entry",
        compiledProgramBytecode: compiledProgram.bytecode,
        expectedPublicInputHash: existingArtifact.publicInputs[0],
        proofRuntimeVersion: packageVersion,
        target: "send",
        witnessInput: sendWitnessInput,
      }),
    "requires the compiled Noir program ABI",
  );

  await withWindowTimerHarness(async ({ activeTimeouts }) => {
    const fakeWorkers = [];
    class FakeWorker {
      constructor(artifact) {
        this.artifact = artifact;
        this.requests = [];
        this.terminated = false;
        this.transferLists = [];
      }

      postMessage(request, transferList = []) {
        const responseId = request.id;
        const clonedRequest = structuredClone(request, { transfer: transferList });
        this.requests.push(clonedRequest);
        this.transferLists.push(transferList);
        queueMicrotask(() => {
          this.onmessage?.({
            data: {
              artifact: this.artifact,
              id: responseId,
              kind: "vanta-private-pool-v2-browser-worker-prove-send-response",
              ok: true,
            },
          });
        });
      }

      terminate() {
        this.terminated = true;
      }
    }

    const client = createVantaPrivatePoolV2BrowserProverClient({
      timeoutMs: 1_000,
      workerFactory: () => {
        const worker = new FakeWorker(witnessInputProofArtifact);
        fakeWorkers.push(worker);
        return worker;
      },
    });

    await client.proveSend({
      circuit: "vanta_private_pool_v2_send_entry",
      compiledProgramBytecode: compiledProgram.bytecode,
      compressedWitness,
      expectedPublicInputHash: existingArtifact.publicInputs[0],
      proofRuntimeVersion: packageVersion,
      target: "send",
    });
    const compressedWorker = fakeWorkers[0];
    assert(compressedWorker.terminated === true, "client must terminate the compressed-witness worker.");
    assert(
      compressedWorker.transferLists[0]?.length === 1,
      "client must transfer one copied compressed-witness buffer.",
    );
    assert(
      compressedWorker.requests[0]?.payload?.compressedWitness?.byteLength ===
        compressedWitness.byteLength,
      "client fake worker must receive the copied compressed witness.",
    );

    await client.proveSend({
      circuit: "vanta_private_pool_v2_send_entry",
      compiledProgramAbi: compiledProgram.abi,
      compiledProgramBytecode: compiledProgram.bytecode,
      expectedPublicInputHash: existingArtifact.publicInputs[0],
      proofRuntimeVersion: packageVersion,
      target: "send",
      witnessInput: sendWitnessInput,
    });
    const witnessWorker = fakeWorkers[1];
    assert(witnessWorker.terminated === true, "client must terminate the witness-input worker.");
    assert(
      witnessWorker.transferLists[0]?.length === 0,
      "client must not transfer buffers for structured-cloned witness-input payloads.",
    );
    assert(
      witnessWorker.requests[0]?.payload?.witnessInput?.owner_secret ===
        sendWitnessInput.owner_secret,
      "client fake worker must structured-clone the witness input payload.",
    );
    assert(
      witnessWorker.requests[0]?.payload?.compiledProgramAbi?.parameters?.length > 0,
      "client fake worker must structured-clone the compiled program ABI.",
    );

    let throwingWorker = null;
    const throwingClient = createVantaPrivatePoolV2BrowserProverClient({
      timeoutMs: 1_000,
      workerFactory: () => {
        throwingWorker = {
          onerror: null,
          onmessage: null,
          terminated: false,
          postMessage() {
            throw new Error("structured clone boom");
          },
          terminate() {
            this.terminated = true;
          },
        };
        return throwingWorker;
      },
    });

    await expectRejection(
      () =>
        throwingClient.proveSend({
          circuit: "vanta_private_pool_v2_send_entry",
          compiledProgramAbi: compiledProgram.abi,
          compiledProgramBytecode: compiledProgram.bytecode,
          expectedPublicInputHash: existingArtifact.publicInputs[0],
          proofRuntimeVersion: packageVersion,
          target: "send",
          witnessInput: sendWitnessInput,
        }),
      "structured clone boom",
    );
    assert(throwingWorker?.terminated === true, "client must terminate the worker when postMessage throws.");
    assert(activeTimeouts.size === 0, "client must clear the timeout when postMessage throws.");
  });

  const previousAddEventListener = globalThis.addEventListener;
  const previousPostMessage = globalThis.postMessage;
  let workerListener = null;
  const workerResponses = [];
  globalThis.addEventListener = (type, listener) => {
    if (type === "message") {
      workerListener = listener;
    }
  };
  globalThis.postMessage = (response) => {
    workerResponses.push(response);
  };

  try {
    await import(
      `${pathToFileURL(join(tempJsDir, "privatePoolV2BrowserProverWorker.js")).href}?worker-scope-error-sanitizer`
    );
    assert(workerListener !== null, "worker module must register a message listener in worker scope.");
    workerListener({
      data: {
        id: "witness-input-error",
        kind: "vanta-private-pool-v2-browser-worker-prove-send",
        payload: {
          circuit: "vanta_private_pool_v2_send_entry",
          compiledProgramAbi: compiledProgram.abi,
          compiledProgramBytecode: compiledProgram.bytecode,
          expectedPublicInputHash: existingArtifact.publicInputs[0],
          proofRuntimeVersion: packageVersion,
          target: "send",
          witnessInput: {
            ...sendWitnessInput,
            owner_secret: (BigInt(sendWitnessInput.owner_secret) + 1n).toString(10),
          },
        },
      },
    });
    const errorResponse = await waitForWorkerResponse(workerResponses);
    assert(errorResponse.ok === false, "worker must return a failed response for invalid witness input.");
    assert(
      errorResponse.error ===
        "Private Pool v2 browser worker prover rejected the Send witness input.",
      "worker must sanitize invalid witness-input errors.",
    );
    assert(
      !errorResponse.error.includes(sendWitnessInput.owner_secret),
      "worker witness-input errors must not echo owner_secret values.",
    );
  } finally {
    if (previousAddEventListener === undefined) {
      delete globalThis.addEventListener;
    } else {
      globalThis.addEventListener = previousAddEventListener;
    }
    if (previousPostMessage === undefined) {
      delete globalThis.postMessage;
    } else {
      globalThis.postMessage = previousPostMessage;
    }
  }

  console.log("Vanta Private Pool v2 browser worker prover check: PASS");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

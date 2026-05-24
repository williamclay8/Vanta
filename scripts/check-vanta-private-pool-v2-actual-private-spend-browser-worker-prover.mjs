import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial,
  verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact,
} from "../operator/private-pool-v2-proof-artifact.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const circuitDir = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry",
);
const compiledProgramPath = resolve(
  circuitDir,
  "target/vanta_private_pool_v2_actual_private_spend_entry.json",
);
const witnessPath = resolve(
  circuitDir,
  "target/vanta_private_pool_v2_actual_private_spend_entry.gz",
);
const proofArtifactPath = resolve(
  circuitDir,
  "target/vanta_private_pool_v2_actual_private_spend_entry.proof.json",
);
const tempRoot = mkdtempSync(
  resolve(repoRoot, ".tmp/vanta-private-pool-v2-actual-private-spend-browser-worker-prover-"),
);
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2MerkleFixtureHelpers.ts",
  "privatePoolV2ClaimCircuitFixture.ts",
  "privatePoolV2SendCircuitFixture.ts",
  "privatePoolV2ActualPrivateSpendCircuitFixture.ts",
  "privatePoolV2ShieldCircuitFixture.ts",
  "privatePoolV2SwapToShieldedCircuitFixture.ts",
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

function actualPrivateSpendWitnessInputFromFixture(fixture) {
  const { witness } = fixture;
  const stringify = (value) => value.toString(10);

  return {
    accepted_root: stringify(witness.accepted_root),
    asset_cohort: stringify(witness.asset_cohort),
    context_hash: stringify(witness.context_hash),
    context_preimage_merchant_address_hi: stringify(
      witness.context_preimage_merchant_address_hi,
    ),
    context_preimage_merchant_address_lo: stringify(
      witness.context_preimage_merchant_address_lo,
    ),
    context_preimage_denomination: stringify(witness.context_preimage_denomination),
    context_preimage_settlement_epoch_hi: stringify(
      witness.context_preimage_settlement_epoch_hi,
    ),
    context_preimage_settlement_epoch_lo: stringify(
      witness.context_preimage_settlement_epoch_lo,
    ),
    input_blinding: stringify(witness.input_blinding),
    input_commitment: stringify(witness.input_commitment),
    input_derivation_tag: stringify(witness.input_derivation_tag),
    leaf_index: stringify(witness.leaf_index),
    membership_path: witness.membership_path.map(stringify),
    membership_path_direction_bits: witness.membership_path_direction_bits.map(stringify),
    nullifier: stringify(witness.nullifier),
    note_secret: stringify(witness.note_secret),
    output_commitment_0: stringify(witness.output_commitment_0),
    output_commitment_1: stringify(witness.output_commitment_1),
    pool_id: stringify(witness.pool_id),
    request_version: stringify(witness.request_version),
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
    packageJson.scripts?.["private-pool-v2:actual-private-spend-browser-worker-prover-check"] ===
      "node scripts/check-vanta-private-pool-v2-actual-private-spend-browser-worker-prover.mjs",
    "package.json must expose private-pool-v2:actual-private-spend-browser-worker-prover-check.",
  );
  assert(
    packageJson.scripts?.["private-pool-v2:local-prover-check"]?.includes(
      "npm run private-pool-v2:actual-private-spend-browser-worker-prover-check",
    ),
    "private-pool-v2:local-prover-check must include the actual-private-spend browser worker prover check.",
  );
  assert(
    packageJson.scripts?.["private-pool-v2:proof-backend-boundary-check"]?.includes(
      "npm run private-pool-v2:actual-private-spend-browser-worker-prover-check",
    ),
    "private-pool-v2:proof-backend-boundary-check must include the actual-private-spend browser worker prover check.",
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
      "src/privacy/privatePoolV2ActualPrivateSpendCircuitFixture.ts",
      read("src/privacy/privatePoolV2ActualPrivateSpendCircuitFixture.ts"),
    ],
    [
      "src/privacy/privatePoolV2SendCircuitFixture.ts",
      read("src/privacy/privatePoolV2SendCircuitFixture.ts"),
    ],
    [
      "src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts",
      read("src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts"),
    ],
  ]) {
    assertBrowserSafeSource(relativePath, source);
  }

  assert(
    protocolSource.includes("VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_MESSAGE"),
    "protocol must define the actual-private-spend browser worker request kind.",
  );
  assert(
    protocolSource.includes("VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload"),
    "protocol must define an actual-private-spend browser worker payload.",
  );
  assert(
    workerSource.includes("ACTUAL_PRIVATE_SPEND_CIRCUIT"),
    "worker must pin the actual-private-spend circuit name.",
  );
  assert(
    workerSource.includes("createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput"),
    "worker must normalize actual-private-spend witness input through the typed fixture builder.",
  );
  assert(
    workerSource.includes("createVantaPrivatePoolV2ActualPrivateSpendCircuitNoirInputs"),
    "worker must derive actual-private-spend Noir inputs from the normalized fixture.",
  );
  assert(
    workerSource.includes("requires exactly one actual-private-spend witness source"),
    "worker must reject ambiguous actual-private-spend compressedWitness/witnessInput payloads.",
  );
  assert(
    workerSource.includes("private-spend-public-input-hash"),
    "worker actual-private-spend artifacts must label the private-spend public input.",
  );
  assert(
    workerSource.includes("proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorker"),
    "worker must export the actual-private-spend browser prover.",
  );
  assert(
    workerSource.includes("Private Pool v2 browser worker prover rejected the actual-private-spend witness input."),
    "worker must sanitize actual-private-spend witness-input errors.",
  );
  assert(
    clientSource.includes("proveActualPrivateSpend"),
    "client must expose proveActualPrivateSpend.",
  );
  assert(
    clientSource.includes("try") &&
      clientSource.includes("worker.postMessage") &&
      clientSource.includes("cleanup()"),
    "client must clean up workers and timers when postMessage throws.",
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

  run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "actual-private-spend"]);

  const compiledProgram = JSON.parse(readFileSync(compiledProgramPath, "utf8"));
  const compressedWitness = readFileSync(witnessPath);
  const existingArtifact = JSON.parse(readFileSync(proofArtifactPath, "utf8"));
  const packageVersion =
    packageJson.dependencies?.["@aztec/bb.js"] ??
    packageJson.devDependencies?.["@aztec/bb.js"] ??
    "unknown";

  const [
    { proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorker },
    { createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture },
    { createVantaPrivatePoolV2BrowserProverClient },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2BrowserProverWorker.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ActualPrivateSpendCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2BrowserProverClient.js")).href),
  ]);

  const compressedWitnessProofArtifact =
    await proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorker({
      circuit: "vanta_private_pool_v2_actual_private_spend_entry",
      compiledProgramBytecode: compiledProgram.bytecode,
      compressedWitness,
      expectedPublicInputHash: existingArtifact.publicInputs[0],
      proofRuntimeVersion: packageVersion,
      target: "actual-private-spend",
    });

  assert(
    compressedWitnessProofArtifact.circuit === "vanta_private_pool_v2_actual_private_spend_entry",
    "artifact must stay on actual-private-spend circuit.",
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
    compressedWitnessProofArtifact.publicInputLabels[0] === "private-spend-public-input-hash",
    "artifact must label the actual-private-spend public input.",
  );
  assert(
    normalizeFieldString(
      compressedWitnessProofArtifact.publicInputs[0],
      "browser worker artifact public input",
    ) ===
      normalizeFieldString(
        existingArtifact.publicInputs[0],
        "existing actual-private-spend public input",
      ),
    "browser worker artifact must bind the private-spend public-input hash.",
  );
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
    compressedWitnessProofArtifact,
    "Private Pool v2 actual-private-spend browser worker compressed-witness proof artifact",
  );

  const compressedWitnessReceipt =
    await verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({
      proofArtifact: compressedWitnessProofArtifact,
    });
  assert(compressedWitnessReceipt.verified === true, "browser worker proof artifact must verify.");
  assert(
    normalizeFieldString(
      compressedWitnessReceipt.verifiedPublicInputs.privateSpendPublicInputHash,
      "browser worker verified actual-private-spend public input",
    ) ===
      normalizeFieldString(
        existingArtifact.publicInputs[0],
        "existing actual-private-spend public input",
      ),
    "browser worker verified receipt must bind the private-spend public-input hash.",
  );

  const fixture = createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture({ mode: "valid" });
  const witnessInput = actualPrivateSpendWitnessInputFromFixture(fixture);
  const witnessInputProofArtifact =
    await proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorker({
      circuit: "vanta_private_pool_v2_actual_private_spend_entry",
      compiledProgramAbi: compiledProgram.abi,
      compiledProgramBytecode: compiledProgram.bytecode,
      expectedPublicInputHash: existingArtifact.publicInputs[0],
      proofRuntimeVersion: packageVersion,
      target: "actual-private-spend",
      witnessInput,
    });

  assert(
    witnessInputProofArtifact.proofBackend === "local-bb-derived-artifact",
    "witness-input worker artifact must use local-bb-derived-artifact.",
  );
  assert(
    witnessInputProofArtifact.verifyingKeyHashKind ===
      "local-acir-bytecode-hash-not-production-vk",
    "witness-input worker artifact must not claim production verifying-key evidence.",
  );
  assert(
    normalizeFieldString(
      witnessInputProofArtifact.publicInputs[0],
      "browser worker witness-input artifact public input",
    ) ===
      normalizeFieldString(
        existingArtifact.publicInputs[0],
        "existing actual-private-spend public input",
      ),
    "browser worker witness-input artifact must bind the private-spend public-input hash.",
  );
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
    witnessInputProofArtifact,
    "Private Pool v2 actual-private-spend browser worker witness-input proof artifact",
  );

  const witnessInputReceipt =
    await verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({
      proofArtifact: witnessInputProofArtifact,
    });
  assert(witnessInputReceipt.verified === true, "browser worker witness-input proof artifact must verify.");
  assert(
    normalizeFieldString(
      witnessInputReceipt.verifiedPublicInputs.privateSpendPublicInputHash,
      "browser worker witness-input verified actual-private-spend public input",
    ) ===
      normalizeFieldString(
        existingArtifact.publicInputs[0],
        "existing actual-private-spend public input",
      ),
    "browser worker witness-input receipt must bind the private-spend public-input hash.",
  );

  await expectRejection(
    () =>
      proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorker({
        circuit: "vanta_private_pool_v2_actual_private_spend_entry",
        compiledProgramBytecode: compiledProgram.bytecode,
        expectedPublicInputHash: existingArtifact.publicInputs[0],
        proofRuntimeVersion: packageVersion,
        target: "actual-private-spend",
      }),
    "requires exactly one actual-private-spend witness source",
  );
  await expectRejection(
    () =>
      proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorker({
        circuit: "vanta_private_pool_v2_actual_private_spend_entry",
        compiledProgramAbi: compiledProgram.abi,
        compiledProgramBytecode: compiledProgram.bytecode,
        compressedWitness,
        expectedPublicInputHash: existingArtifact.publicInputs[0],
        proofRuntimeVersion: packageVersion,
        target: "actual-private-spend",
        witnessInput,
      }),
    "requires exactly one actual-private-spend witness source",
  );
  await expectRejection(
    () =>
      proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorker({
        circuit: "vanta_private_pool_v2_actual_private_spend_entry",
        compiledProgramBytecode: compiledProgram.bytecode,
        expectedPublicInputHash: existingArtifact.publicInputs[0],
        proofRuntimeVersion: packageVersion,
        target: "actual-private-spend",
        witnessInput,
      }),
    "requires the compiled Noir program ABI",
  );
  await expectRejection(
    () =>
      proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorker({
        circuit: "vanta_private_pool_v2_actual_private_spend_entry",
        compiledProgramBytecode: compiledProgram.bytecode,
        compressedWitness,
        expectedPublicInputHash: (
          BigInt(existingArtifact.publicInputs[0]) + 1n
        ).toString(10),
        proofRuntimeVersion: packageVersion,
        target: "actual-private-spend",
      }),
    "does not match the expected actual-private-spend public-input hash",
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
              kind: "vanta-private-pool-v2-browser-worker-prove-actual-private-spend-response",
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

    await client.proveActualPrivateSpend({
      circuit: "vanta_private_pool_v2_actual_private_spend_entry",
      compiledProgramBytecode: compiledProgram.bytecode,
      compressedWitness,
      expectedPublicInputHash: existingArtifact.publicInputs[0],
      proofRuntimeVersion: packageVersion,
      target: "actual-private-spend",
    });
    const compressedWorker = fakeWorkers[0];
    assert(
      compressedWorker.terminated === true,
      "client must terminate the compressed-witness actual-private-spend worker.",
    );
    assert(
      compressedWorker.transferLists[0]?.length === 1,
      "client must transfer one copied actual-private-spend compressed-witness buffer.",
    );
    assert(
      compressedWorker.requests[0]?.payload?.compressedWitness?.byteLength ===
        compressedWitness.byteLength,
      "client fake worker must receive the copied actual-private-spend compressed witness.",
    );

    await client.proveActualPrivateSpend({
      circuit: "vanta_private_pool_v2_actual_private_spend_entry",
      compiledProgramAbi: compiledProgram.abi,
      compiledProgramBytecode: compiledProgram.bytecode,
      expectedPublicInputHash: existingArtifact.publicInputs[0],
      proofRuntimeVersion: packageVersion,
      target: "actual-private-spend",
      witnessInput,
    });
    const witnessWorker = fakeWorkers[1];
    assert(
      witnessWorker.terminated === true,
      "client must terminate the witness-input actual-private-spend worker.",
    );
    assert(
      witnessWorker.transferLists[0]?.length === 0,
      "client must not transfer buffers for structured-cloned actual-private-spend witness input.",
    );
    assert(
      witnessWorker.requests[0]?.payload?.witnessInput?.note_secret === witnessInput.note_secret,
      "client fake worker must structured-clone the actual-private-spend witness input payload.",
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
            throw new Error("actual-private-spend structured clone boom");
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
        throwingClient.proveActualPrivateSpend({
          circuit: "vanta_private_pool_v2_actual_private_spend_entry",
          compiledProgramAbi: compiledProgram.abi,
          compiledProgramBytecode: compiledProgram.bytecode,
          expectedPublicInputHash: existingArtifact.publicInputs[0],
          proofRuntimeVersion: packageVersion,
          target: "actual-private-spend",
          witnessInput,
        }),
      "actual-private-spend structured clone boom",
    );
    assert(
      throwingWorker?.terminated === true,
      "client must terminate the actual-private-spend worker when postMessage throws.",
    );
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
      `${pathToFileURL(join(tempJsDir, "privatePoolV2BrowserProverWorker.js")).href}?actual-private-spend-worker-scope-error-sanitizer`
    );
    assert(workerListener !== null, "worker module must register a message listener in worker scope.");
    workerListener({
      data: {
        id: "actual-private-spend-witness-input-error",
        kind: "vanta-private-pool-v2-browser-worker-prove-actual-private-spend",
        payload: {
          circuit: "vanta_private_pool_v2_actual_private_spend_entry",
          compiledProgramAbi: compiledProgram.abi,
          compiledProgramBytecode: compiledProgram.bytecode,
          expectedPublicInputHash: existingArtifact.publicInputs[0],
          proofRuntimeVersion: packageVersion,
          target: "actual-private-spend",
          witnessInput: {
            ...witnessInput,
            note_secret: (BigInt(witnessInput.note_secret) + 1n).toString(10),
          },
        },
      },
    });
    const errorResponse = await waitForWorkerResponse(workerResponses);
    assert(errorResponse.ok === false, "worker must return a failed response for invalid witness input.");
    assert(
      errorResponse.kind ===
        "vanta-private-pool-v2-browser-worker-prove-actual-private-spend-response",
      "worker must return the actual-private-spend response kind.",
    );
    assert(
      errorResponse.error ===
        "Private Pool v2 browser worker prover rejected the actual-private-spend witness input.",
      "worker must sanitize invalid actual-private-spend witness-input errors.",
    );
    assert(
      !errorResponse.error.includes(witnessInput.note_secret),
      "worker witness-input errors must not echo note_secret values.",
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

  console.log("Vanta Private Pool v2 actual-private-spend browser worker prover check: PASS");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

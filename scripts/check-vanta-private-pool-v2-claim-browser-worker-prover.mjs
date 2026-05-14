import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial,
  verifyVantaPrivatePoolV2ClaimProofArtifact,
} from "../operator/private-pool-v2-proof-artifact.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const circuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_claim_entry");
const compiledProgramPath = resolve(circuitDir, "target/vanta_private_pool_v2_claim_entry.json");
const witnessPath = resolve(circuitDir, "target/vanta_private_pool_v2_claim_entry.gz");
const proofArtifactPath = resolve(circuitDir, "target/vanta_private_pool_v2_claim_entry.proof.json");
const tempRoot = mkdtempSync(
  resolve(repoRoot, ".tmp/vanta-private-pool-v2-claim-browser-worker-prover-"),
);
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2MerkleFixtureHelpers.ts",
  "privatePoolV2ActualPrivateSpendCircuitFixture.ts",
  "privatePoolV2SendCircuitFixture.ts",
  "privatePoolV2ShieldCircuitFixture.ts",
  "privatePoolV2ClaimCircuitFixture.ts",
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

function claimWitnessInputFromFixture(fixture) {
  const { witness } = fixture;
  const stringify = (value) => value.toString(10);

  return {
    amount: stringify(witness.amount),
    asset_id: stringify(witness.asset_id),
    destination: stringify(witness.destination),
    input_commitment: stringify(witness.input_commitment),
    input_root: stringify(witness.input_root),
    leaf_index: stringify(witness.leaf_index),
    membership_path: witness.membership_path.map(stringify),
    membership_path_direction_bits: witness.membership_path_direction_bits.map(stringify),
    nullifier: stringify(witness.nullifier),
    owner_commitment: stringify(witness.owner_commitment),
    owner_secret: stringify(witness.owner_secret),
    quote_expires_at_slot: stringify(witness.quote_expires_at_slot),
    relayer_fee: stringify(witness.relayer_fee),
    relayer_id: stringify(witness.relayer_id),
    request_version: stringify(witness.request_version),
    tree_id: stringify(witness.tree_id),
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
    return message;
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
    packageJson.scripts?.["private-pool-v2:claim-browser-worker-prover-check"] ===
      "node scripts/check-vanta-private-pool-v2-claim-browser-worker-prover.mjs",
    "package.json must expose private-pool-v2:claim-browser-worker-prover-check.",
  );
  assert(
    packageJson.scripts?.["private-pool-v2:local-prover-check"]?.includes(
      "npm run private-pool-v2:claim-browser-worker-prover-check",
    ),
    "private-pool-v2:local-prover-check must include the Claim browser worker prover check.",
  );
  assert(
    packageJson.scripts?.["private-pool-v2:proof-backend-boundary-check"]?.includes(
      "npm run private-pool-v2:claim-browser-worker-prover-check",
    ),
    "private-pool-v2:proof-backend-boundary-check must include the Claim browser worker prover check.",
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
      "src/privacy/privatePoolV2ClaimCircuitFixture.ts",
      read("src/privacy/privatePoolV2ClaimCircuitFixture.ts"),
    ],
  ]) {
    assertBrowserSafeSource(relativePath, source);
  }

  assert(
    protocolSource.includes("VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_CLAIM_MESSAGE"),
    "protocol must define the Claim browser worker request kind.",
  );
  assert(
    protocolSource.includes("VantaPrivatePoolV2BrowserWorkerClaimProverPayload"),
    "protocol must define a Claim browser worker payload.",
  );
  assert(workerSource.includes("CLAIM_CIRCUIT"), "worker must pin the Claim circuit name.");
  assert(
    workerSource.includes("createVantaPrivatePoolV2ClaimCircuitFixtureFromWitnessInput"),
    "worker must normalize Claim witness input through the typed fixture builder.",
  );
  assert(
    workerSource.includes("createVantaPrivatePoolV2ClaimCircuitNoirInputs"),
    "worker must derive Claim Noir inputs from the normalized fixture.",
  );
  assert(
    workerSource.includes("requires exactly one Claim witness source"),
    "worker must reject ambiguous Claim compressedWitness/witnessInput payloads.",
  );
  assert(
    workerSource.includes("claim-public-input-hash"),
    "worker Claim artifacts must label the Claim public input.",
  );
  assert(
    workerSource.includes("proveVantaPrivatePoolV2ClaimInBrowserWorker"),
    "worker must export the Claim browser prover.",
  );
  assert(
    workerSource.includes("Private Pool v2 browser worker prover rejected the Claim witness input."),
    "worker must sanitize Claim witness-input errors.",
  );
  assert(clientSource.includes("proveClaim"), "client must expose proveClaim.");
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
    { cwd: repoRoot, stdio: "inherit" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "claim"]);

  const compiledProgram = JSON.parse(readFileSync(compiledProgramPath, "utf8"));
  const compressedWitness = readFileSync(witnessPath);
  const existingArtifact = JSON.parse(readFileSync(proofArtifactPath, "utf8"));
  const packageVersion =
    packageJson.dependencies?.["@aztec/bb.js"] ??
    packageJson.devDependencies?.["@aztec/bb.js"] ??
    "unknown";

  const [
    { proveVantaPrivatePoolV2ClaimInBrowserWorker },
    { createVantaPrivatePoolV2ClaimCircuitFixture },
    { createVantaPrivatePoolV2BrowserProverClient },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2BrowserProverWorker.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ClaimCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2BrowserProverClient.js")).href),
  ]);

  const compressedWitnessProofArtifact = await proveVantaPrivatePoolV2ClaimInBrowserWorker({
    circuit: "vanta_private_pool_v2_claim_entry",
    compiledProgramBytecode: compiledProgram.bytecode,
    compressedWitness,
    expectedPublicInputHash: existingArtifact.publicInputs[0],
    proofRuntimeVersion: packageVersion,
    target: "claim",
  });

  assert(
    compressedWitnessProofArtifact.circuit === "vanta_private_pool_v2_claim_entry",
    "artifact must stay on Claim circuit.",
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
    compressedWitnessProofArtifact.publicInputLabels[0] === "claim-public-input-hash",
    "artifact must label the Claim public input.",
  );
  assert(
    normalizeFieldString(
      compressedWitnessProofArtifact.publicInputs[0],
      "browser worker artifact public input",
    ) === normalizeFieldString(existingArtifact.publicInputs[0], "existing Claim public input"),
    "browser worker artifact must bind the Claim public-input hash.",
  );
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
    compressedWitnessProofArtifact,
    "Private Pool v2 Claim browser worker compressed-witness proof artifact",
  );

  const compressedWitnessReceipt = await verifyVantaPrivatePoolV2ClaimProofArtifact({
    proofArtifact: compressedWitnessProofArtifact,
  });
  assert(compressedWitnessReceipt.verified === true, "browser worker proof artifact must verify.");
  assert(
    normalizeFieldString(
      compressedWitnessReceipt.verifiedPublicInputs.claimPublicInputHash,
      "browser worker verified Claim public input",
    ) === normalizeFieldString(existingArtifact.publicInputs[0], "existing Claim public input"),
    "browser worker verified receipt must bind the Claim public-input hash.",
  );

  const claimFixture = createVantaPrivatePoolV2ClaimCircuitFixture({ mode: "valid" });
  const claimWitnessInput = claimWitnessInputFromFixture(claimFixture);
  const witnessInputProofArtifact = await proveVantaPrivatePoolV2ClaimInBrowserWorker({
    circuit: "vanta_private_pool_v2_claim_entry",
    compiledProgramAbi: compiledProgram.abi,
    compiledProgramBytecode: compiledProgram.bytecode,
    expectedPublicInputHash: existingArtifact.publicInputs[0],
    proofRuntimeVersion: packageVersion,
    target: "claim",
    witnessInput: claimWitnessInput,
  });

  assert(
    witnessInputProofArtifact.proofBackend === "local-bb-derived-artifact",
    "witness-input worker artifact must use local-bb-derived-artifact.",
  );
  assert(
    normalizeFieldString(
      witnessInputProofArtifact.publicInputs[0],
      "browser worker witness-input artifact public input",
    ) === normalizeFieldString(existingArtifact.publicInputs[0], "existing Claim public input"),
    "browser worker witness-input artifact must bind the Claim public-input hash.",
  );
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
    witnessInputProofArtifact,
    "Private Pool v2 Claim browser worker witness-input proof artifact",
  );

  const witnessInputReceipt = await verifyVantaPrivatePoolV2ClaimProofArtifact({
    proofArtifact: witnessInputProofArtifact,
  });
  assert(witnessInputReceipt.verified === true, "browser worker witness-input proof artifact must verify.");
  assert(
    normalizeFieldString(
      witnessInputReceipt.verifiedPublicInputs.claimPublicInputHash,
      "browser worker witness-input verified Claim public input",
    ) === normalizeFieldString(existingArtifact.publicInputs[0], "existing Claim public input"),
    "browser worker witness-input receipt must bind the Claim public-input hash.",
  );

  await expectRejection(
    () =>
      proveVantaPrivatePoolV2ClaimInBrowserWorker({
        circuit: "vanta_private_pool_v2_claim_entry",
        compiledProgramBytecode: compiledProgram.bytecode,
        expectedPublicInputHash: existingArtifact.publicInputs[0],
        proofRuntimeVersion: packageVersion,
        target: "claim",
      }),
    "requires exactly one Claim witness source",
  );
  await expectRejection(
    () =>
      proveVantaPrivatePoolV2ClaimInBrowserWorker({
        circuit: "vanta_private_pool_v2_claim_entry",
        compiledProgramAbi: compiledProgram.abi,
        compiledProgramBytecode: compiledProgram.bytecode,
        compressedWitness,
        expectedPublicInputHash: existingArtifact.publicInputs[0],
        proofRuntimeVersion: packageVersion,
        target: "claim",
        witnessInput: claimWitnessInput,
      }),
    "requires exactly one Claim witness source",
  );
  await expectRejection(
    () =>
      proveVantaPrivatePoolV2ClaimInBrowserWorker({
        circuit: "vanta_private_pool_v2_claim_entry",
        compiledProgramBytecode: compiledProgram.bytecode,
        expectedPublicInputHash: existingArtifact.publicInputs[0],
        proofRuntimeVersion: packageVersion,
        target: "claim",
        witnessInput: claimWitnessInput,
      }),
    "requires the compiled Noir program ABI",
  );
  await expectRejection(
    () =>
      proveVantaPrivatePoolV2ClaimInBrowserWorker({
        circuit: "vanta_private_pool_v2_claim_entry",
        compiledProgramBytecode: compiledProgram.bytecode,
        compressedWitness,
        expectedPublicInputHash: (BigInt(existingArtifact.publicInputs[0]) + 1n).toString(10),
        proofRuntimeVersion: packageVersion,
        target: "claim",
      }),
    "does not match the expected Claim public-input hash",
  );

  await withWindowTimerHarness(async () => {
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
              kind: "vanta-private-pool-v2-browser-worker-prove-claim-response",
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

    await client.proveClaim({
      circuit: "vanta_private_pool_v2_claim_entry",
      compiledProgramBytecode: compiledProgram.bytecode,
      compressedWitness,
      expectedPublicInputHash: existingArtifact.publicInputs[0],
      proofRuntimeVersion: packageVersion,
      target: "claim",
    });
    const compressedWorker = fakeWorkers[0];
    assert(
      compressedWorker.terminated === true,
      "client must terminate the compressed-witness Claim worker.",
    );
    assert(
      compressedWorker.transferLists[0]?.length === 1,
      "client must transfer one copied Claim compressed-witness buffer.",
    );

    await client.proveClaim({
      circuit: "vanta_private_pool_v2_claim_entry",
      compiledProgramAbi: compiledProgram.abi,
      compiledProgramBytecode: compiledProgram.bytecode,
      expectedPublicInputHash: existingArtifact.publicInputs[0],
      proofRuntimeVersion: packageVersion,
      target: "claim",
      witnessInput: claimWitnessInput,
    });
    const witnessWorker = fakeWorkers[1];
    assert(witnessWorker.terminated === true, "client must terminate the witness-input Claim worker.");
    assert(
      witnessWorker.transferLists[0]?.length === 0,
      "client must not transfer Claim witness-input payload buffers.",
    );
    assert(
      witnessWorker.requests[0]?.payload?.witnessInput?.owner_secret === claimWitnessInput.owner_secret,
      "client fake worker must receive structured-cloned Claim witness input.",
    );
  });

  await withWindowTimerHarness(async () => {
    class ThrowingWorker {
      postMessage() {
        throw new Error("Claim structured clone boom");
      }

      terminate() {
        this.terminated = true;
      }
    }

    const client = createVantaPrivatePoolV2BrowserProverClient({
      timeoutMs: 1_000,
      workerFactory: () => new ThrowingWorker(),
    });
    await expectRejection(
      () =>
        client.proveClaim({
          circuit: "vanta_private_pool_v2_claim_entry",
          compiledProgramBytecode: compiledProgram.bytecode,
          compressedWitness,
          expectedPublicInputHash: existingArtifact.publicInputs[0],
          proofRuntimeVersion: packageVersion,
          target: "claim",
        }),
      "Claim structured clone boom",
    );
  });

  const previousAddEventListener = globalThis.addEventListener;
  const previousPostMessage = globalThis.postMessage;
  let workerListener = null;
  const responses = [];
  globalThis.addEventListener = (type, listener) => {
    if (type === "message") {
      workerListener = listener;
    }
  };
  globalThis.postMessage = (message) => {
    responses.push(message);
  };
  try {
    await import(
      `${pathToFileURL(join(tempJsDir, "privatePoolV2BrowserProverWorker.js")).href}?claim-worker-scope-error-sanitizer`
    );
    assert(workerListener !== null, "worker module must register a message listener in worker scope.");
    workerListener({
      data: {
        id: "claim-witness-input-error",
        kind: "vanta-private-pool-v2-browser-worker-prove-claim",
        payload: {
          circuit: "vanta_private_pool_v2_claim_entry",
          compiledProgramAbi: compiledProgram.abi,
          compiledProgramBytecode: compiledProgram.bytecode,
          expectedPublicInputHash: existingArtifact.publicInputs[0],
          proofRuntimeVersion: packageVersion,
          target: "claim",
          witnessInput: {
            ...claimWitnessInput,
            membership_path_direction_bits: [
              "2",
              ...claimWitnessInput.membership_path_direction_bits.slice(1),
            ],
          },
        },
      },
    });
    const response = await waitForWorkerResponse(responses);
    assert(response.ok === false, "invalid Claim witness input must return an error response.");
    assert(
      response.error.includes(
        "Private Pool v2 browser worker prover rejected the Claim witness input.",
      ),
      "Claim witness-input errors must be sanitized.",
    );
    assert(!response.error.includes("owner_secret"), "Claim witness-input error must not echo owner_secret.");
    assert(!response.error.includes(claimWitnessInput.owner_secret), "Claim witness-input error must not echo secret values.");
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

  console.log("Vanta Private Pool v2 Claim browser worker prover check: PASS");
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}

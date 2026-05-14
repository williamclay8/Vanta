import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const sendCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_send_entry");
const shieldCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_shield_entry");
const claimCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_claim_entry");
const swapToShieldedCircuitDir = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry",
);
const actualPrivateSpendCircuitDir = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry",
);
const sendProofArtifactPath = resolve(sendCircuitDir, "target/vanta_private_pool_v2_send_entry.proof.json");
const shieldProofArtifactPath = resolve(
  shieldCircuitDir,
  "target/vanta_private_pool_v2_shield_entry.proof.json",
);
const claimProofArtifactPath = resolve(
  claimCircuitDir,
  "target/vanta_private_pool_v2_claim_entry.proof.json",
);
const swapToShieldedProofArtifactPath = resolve(
  swapToShieldedCircuitDir,
  "target/vanta_private_pool_v2_swap_to_shielded_entry.proof.json",
);
const actualPrivateSpendProofArtifactPath = resolve(
  actualPrivateSpendCircuitDir,
  "target/vanta_private_pool_v2_actual_private_spend_entry.proof.json",
);
const tempRoot = mkdtempSync(
  resolve(repoRoot, ".tmp/vanta-private-pool-v2-browser-worker-proof-result-adapter-"),
);
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
  "privatePoolV2SwapToShieldedCircuitFixture.ts",
  "privatePoolV2BrowserProverProtocol.ts",
  "privatePoolV2BrowserProverClient.ts",
  "privatePoolV2LocalProver.ts",
  "privatePoolV2BrowserWorkerProofResultAdapter.ts",
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

function readArtifact(path) {
  return JSON.parse(readFileSync(path, "utf8"));
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

function readCircuitPublicInput(request, label) {
  const prefix = `${label}:`;
  return request.circuitPublicInputs?.find((input) => input.startsWith(prefix))?.slice(prefix.length);
}

function normalizeFieldString(value, label) {
  const trimmed = String(value).trim();
  const parsed = /^0x[0-9a-f]+$/u.test(trimmed)
    ? BigInt(trimmed)
    : /^(0|[1-9][0-9]*)$/u.test(trimmed)
      ? BigInt(trimmed)
      : null;

  assert(parsed !== null, `${label} must be a field string.`);
  return parsed.toString(10);
}

function mutateRequest(request, patch) {
  return {
    ...request,
    publicInputs: [...request.publicInputs],
    circuitPublicInputs: request.circuitPublicInputs ? [...request.circuitPublicInputs] : undefined,
    ...patch,
  };
}

function tamperProofBytes(proofBytes) {
  const tampered = new Uint8Array(proofBytes);
  tampered[tampered.length - 1] ^= 1;
  return tampered;
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

function assertProofResultHasNoWitnessMaterial(proofResult) {
  const serialized = JSON.stringify({
    ...proofResult,
    proofBytes: Array.from(proofResult.proofBytes),
  });

  for (const marker of [
    "owner_secret",
    "note_secret",
    "compressedWitness",
    "witnessInput",
    "privateWitness",
    "noirWitness",
    "compiledProgramBytecode",
  ]) {
    assert(!serialized.includes(marker), `proof result must not expose ${marker}.`);
  }
}

function ensureProofArtifact(path, target) {
  if (!existsSync(path)) {
    run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", target]);
  }
}

try {
  const packageJson = JSON.parse(read("package.json"));
  assert(
    packageJson.scripts?.["private-pool-v2:browser-worker-proof-result-adapter-check"] ===
      "node scripts/check-vanta-private-pool-v2-browser-worker-proof-result-adapter.mjs",
    "package.json must expose private-pool-v2:browser-worker-proof-result-adapter-check.",
  );
  assert(
    packageJson.scripts?.["private-pool-v2:local-prover-check"]?.includes(
      "npm run private-pool-v2:browser-worker-proof-result-adapter-check",
    ),
    "private-pool-v2:local-prover-check must include the browser-worker proof-result adapter check.",
  );
  assert(
    packageJson.scripts?.["private-pool-v2:proof-backend-boundary-check"]?.includes(
      "npm run private-pool-v2:browser-worker-proof-result-adapter-check",
    ),
    "private-pool-v2:proof-backend-boundary-check must include the browser-worker proof-result adapter check.",
  );

  const adapterSource = read("src/privacy/privatePoolV2BrowserWorkerProofResultAdapter.ts");
  assertBrowserSafeSource(
    "src/privacy/privatePoolV2BrowserWorkerProofResultAdapter.ts",
    adapterSource,
  );
  assert(
    adapterSource.includes("createVantaPrivatePoolV2BrowserProverClient"),
    "adapter must delegate to the browser prover client.",
  );
  assert(
    adapterSource.includes("createVantaPrivatePoolV2LocalBbFixtureProver"),
    "adapter must reuse the local bb proof-result binding.",
  );
  assert(
    adapterSource.includes("local no-real-funds evidence"),
    "adapter readiness must preserve local no-real-funds truth.",
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

  ensureProofArtifact(sendProofArtifactPath, "send");
  ensureProofArtifact(shieldProofArtifactPath, "shield");
  ensureProofArtifact(claimProofArtifactPath, "claim");
  ensureProofArtifact(swapToShieldedProofArtifactPath, "swap-to-shielded");
  ensureProofArtifact(actualPrivateSpendProofArtifactPath, "actual-private-spend");

  const [
    {
      createVantaPrivatePoolV2BrowserWorkerProofResultAdapter,
      VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROOF_RESULT_ADAPTER_SCHEME,
    },
    { createVantaPrivatePoolV2SendCircuitFixture },
    { createVantaPrivatePoolV2ShieldCircuitFixture },
    { createVantaPrivatePoolV2ClaimCircuitFixture },
    { createVantaPrivatePoolV2SwapToShieldedCircuitFixture },
    { createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture },
    { createVantaPrivatePoolV2LocalProver },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2BrowserWorkerProofResultAdapter.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2SendCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ShieldCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ClaimCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2SwapToShieldedCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ActualPrivateSpendCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalProver.js")).href),
  ]);

  assert(
    VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROOF_RESULT_ADAPTER_SCHEME ===
      "vanta-private-pool-v2-browser-worker-proof-result-adapter-0.1",
    "adapter scheme must be stable.",
  );

  const sendFixture = createVantaPrivatePoolV2SendCircuitFixture({ mode: "valid" });
  const shieldFixture = createVantaPrivatePoolV2ShieldCircuitFixture({ mode: "valid" });
  const claimFixture = createVantaPrivatePoolV2ClaimCircuitFixture({ mode: "valid" });
  const swapToShieldedFixture = createVantaPrivatePoolV2SwapToShieldedCircuitFixture({
    mode: "valid",
  });
  const actualPrivateSpendFixture = createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture({
    mode: "valid",
  });
  const sendArtifact = readArtifact(sendProofArtifactPath);
  const shieldArtifact = readArtifact(shieldProofArtifactPath);
  const claimArtifact = readArtifact(claimProofArtifactPath);
  const swapToShieldedArtifact = readArtifact(swapToShieldedProofArtifactPath);
  const actualPrivateSpendArtifact = readArtifact(actualPrivateSpendProofArtifactPath);
  const sendDerivedArtifact = {
    ...sendArtifact,
    proofBackend: "local-bb-derived-artifact",
  };
  const shieldDerivedArtifact = {
    ...shieldArtifact,
    proofBackend: "local-bb-derived-artifact",
  };
  const claimDerivedArtifact = {
    ...claimArtifact,
    proofBackend: "local-bb-derived-artifact",
  };
  const swapToShieldedDerivedArtifact = {
    ...swapToShieldedArtifact,
    proofBackend: "local-bb-derived-artifact",
  };
  const actualPrivateSpendDerivedArtifact = {
    ...actualPrivateSpendArtifact,
    proofBackend: "local-bb-derived-artifact",
  };
  const sendPublicInputHash = normalizeFieldString(
    readCircuitPublicInput(sendFixture.proofRequest, "send-public-input-hash"),
    "send public input hash",
  );
  const shieldPublicInputHash = normalizeFieldString(
    readCircuitPublicInput(shieldFixture.proofRequest, "shield-public-input-hash"),
    "Shield public input hash",
  );
  const claimPublicInputHash = normalizeFieldString(
    readCircuitPublicInput(claimFixture.proofRequest, "claim-public-input-hash"),
    "Claim public input hash",
  );
  const swapToShieldedPublicInputHash = normalizeFieldString(
    readCircuitPublicInput(
      swapToShieldedFixture.proofRequest,
      "swap-public-input-hash",
    ),
    "Swap-to-shielded public input hash",
  );
  const actualPrivateSpendPublicInputHash = normalizeFieldString(
    readCircuitPublicInput(
      actualPrivateSpendFixture.proofRequest,
      "private-spend-public-input-hash",
    ),
    "private-spend public input hash",
  );

  const defaultLocalProof = await createVantaPrivatePoolV2LocalProver().prove(
    sendFixture.proofRequest,
  );
  assert(defaultLocalProof.proofSystem === "mock", "default local prover must remain mock.");
  assert(
    defaultLocalProof.proofBackend === "local-mock",
    "default local prover must remain local-mock.",
  );

  const calls = [];
  const client = {
    async proveActualPrivateSpend(payload) {
      calls.push({ payload, target: "actual-private-spend" });
      return actualPrivateSpendDerivedArtifact;
    },
    async proveClaim(payload) {
      calls.push({ payload, target: "claim" });
      return claimDerivedArtifact;
    },
    async proveSend(payload) {
      calls.push({ payload, target: "send" });
      return sendDerivedArtifact;
    },
    async proveShield(payload) {
      calls.push({ payload, target: "shield" });
      return shieldDerivedArtifact;
    },
    async proveSwapToShielded(payload) {
      calls.push({ payload, target: "swap-to-shielded" });
      return swapToShieldedDerivedArtifact;
    },
  };

  const sendAdapter = createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
    client,
    fixtureProofRequest: sendFixture.proofRequest,
    payload: {
      circuit: "vanta_private_pool_v2_send_entry",
      compiledProgramBytecode: "fixture-bytecode",
      compressedWitness: new Uint8Array([1, 2, 3]),
      expectedPublicInputHash: sendPublicInputHash,
      proofRuntimeVersion: "fixture-bb",
      target: "send",
    },
    target: "send",
  });
  assert(sendAdapter.scheme === VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROOF_RESULT_ADAPTER_SCHEME);
  assert(sendAdapter.readiness().ready, "enabled adapter must be ready.");
  assert(
    sendAdapter.readiness().warnings.join(" ").includes("local no-real-funds evidence"),
    "adapter readiness must warn about local no-real-funds evidence.",
  );

  const sendProof = await sendAdapter.prove(sendFixture.proofRequest);
  assert(calls.length === 1 && calls[0]?.target === "send", "Send adapter must call proveSend.");
  assert(
    calls[0]?.payload.expectedPublicInputHash === sendPublicInputHash,
    "Send adapter must bind send-public-input-hash into the worker payload.",
  );
  assert(sendProof.proofSystem === "noir-bb", "Send adapter proof system must be noir-bb.");
  assert(
    sendProof.proofBackend === "local-bb-derived-artifact",
    "Send adapter proof backend must be local-bb-derived-artifact.",
  );
  assertProofResultHasNoWitnessMaterial(sendProof);
  assert(
    await sendAdapter.verify?.({ proof: sendProof, request: sendFixture.proofRequest }),
    "Send adapter verify() must accept its own proof result.",
  );
  assert(
    !(await sendAdapter.verify?.({
      proof: { ...sendProof, proofBytes: tamperProofBytes(sendProof.proofBytes) },
      request: sendFixture.proofRequest,
    })),
    "Send adapter verify() must reject tampered proof bytes.",
  );

  await expectRejection(
    () =>
      createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
        client: {
          async proveActualPrivateSpend() {
            return actualPrivateSpendDerivedArtifact;
          },
          async proveSend() {
            return sendArtifact;
          },
        },
        fixtureProofRequest: sendFixture.proofRequest,
        payload: {
          circuit: "vanta_private_pool_v2_send_entry",
          compiledProgramBytecode: "fixture-bytecode",
          compressedWitness: new Uint8Array([7]),
          expectedPublicInputHash: sendPublicInputHash,
          proofRuntimeVersion: "fixture-bb",
          target: "send",
        },
        target: "send",
      }).prove(sendFixture.proofRequest),
    "requires local-bb-derived-artifact evidence",
  );

  const callsBeforeDriftCheck = calls.length;
  await expectRejection(
    () =>
      sendAdapter.prove(
        mutateRequest(sendFixture.proofRequest, {
          amountBaseUnits: sendFixture.proofRequest.amountBaseUnits + 1n,
        }),
      ),
    "request transcript must match bound proof request",
  );
  assert(
    calls.length === callsBeforeDriftCheck,
    "request transcript drift must reject before invoking the worker client.",
  );

  const actualPrivateSpendAdapter = createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
    client,
    fixtureProofRequest: actualPrivateSpendFixture.proofRequest,
    payload: {
      circuit: "vanta_private_pool_v2_actual_private_spend_entry",
      compiledProgramBytecode: "fixture-bytecode",
      compressedWitness: new Uint8Array([4, 5, 6]),
      expectedPublicInputHash: actualPrivateSpendPublicInputHash,
      proofRuntimeVersion: "fixture-bb",
      target: "actual-private-spend",
    },
    target: "actual-private-spend",
  });
  const actualPrivateSpendProof = await actualPrivateSpendAdapter.prove(
    actualPrivateSpendFixture.proofRequest,
  );
  assert(
    calls.at(-1)?.target === "actual-private-spend",
    "Actual-private-spend adapter must call proveActualPrivateSpend.",
  );
  assert(
    calls.at(-1)?.payload.expectedPublicInputHash === actualPrivateSpendPublicInputHash,
    "Actual-private-spend adapter must bind private-spend-public-input-hash into the worker payload.",
  );
  assert(
    actualPrivateSpendProof.proofSystem === "noir-bb",
    "Actual-private-spend adapter proof system must be noir-bb.",
  );
  assert(
    actualPrivateSpendProof.proofBackend === "local-bb-derived-artifact",
    "Actual-private-spend adapter proof backend must be local-bb-derived-artifact.",
  );
  assertProofResultHasNoWitnessMaterial(actualPrivateSpendProof);

  const shieldAdapter = createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
    client,
    fixtureProofRequest: shieldFixture.proofRequest,
    payload: {
      circuit: "vanta_private_pool_v2_shield_entry",
      compiledProgramBytecode: "fixture-bytecode",
      compressedWitness: new Uint8Array([8, 9, 10]),
      expectedPublicInputHash: shieldPublicInputHash,
      proofRuntimeVersion: "fixture-bb",
      target: "shield",
    },
    target: "shield",
  });
  const shieldProof = await shieldAdapter.prove(shieldFixture.proofRequest);
  assert(calls.at(-1)?.target === "shield", "Shield adapter must call proveShield.");
  assert(
    calls.at(-1)?.payload.expectedPublicInputHash === shieldPublicInputHash,
    "Shield adapter must bind shield-public-input-hash into the worker payload.",
  );
  assert(shieldProof.proofSystem === "noir-bb", "Shield adapter proof system must be noir-bb.");
  assert(
    shieldProof.proofBackend === "local-bb-derived-artifact",
    "Shield adapter proof backend must be local-bb-derived-artifact.",
  );
  assertProofResultHasNoWitnessMaterial(shieldProof);
  assert(
    await shieldAdapter.verify?.({ proof: shieldProof, request: shieldFixture.proofRequest }),
    "Shield adapter verify() must accept its own proof result.",
  );
  assert(
    !(await shieldAdapter.verify?.({
      proof: { ...shieldProof, proofBytes: tamperProofBytes(shieldProof.proofBytes) },
      request: shieldFixture.proofRequest,
    })),
    "Shield adapter verify() must reject tampered proof bytes.",
  );

  const claimAdapter = createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
    client,
    fixtureProofRequest: claimFixture.proofRequest,
    payload: {
      circuit: "vanta_private_pool_v2_claim_entry",
      compiledProgramBytecode: "fixture-bytecode",
      compressedWitness: new Uint8Array([11, 12, 13]),
      expectedPublicInputHash: claimPublicInputHash,
      proofRuntimeVersion: "fixture-bb",
      target: "claim",
    },
    target: "claim",
  });
  const claimProof = await claimAdapter.prove(claimFixture.proofRequest);
  assert(calls.at(-1)?.target === "claim", "Claim adapter must call proveClaim.");
  assert(
    calls.at(-1)?.payload.expectedPublicInputHash === claimPublicInputHash,
    "Claim adapter must bind claim-public-input-hash into the worker payload.",
  );
  assert(claimProof.proofSystem === "noir-bb", "Claim adapter proof system must be noir-bb.");
  assert(
    claimProof.proofBackend === "local-bb-derived-artifact",
    "Claim adapter proof backend must be local-bb-derived-artifact.",
  );
  assertProofResultHasNoWitnessMaterial(claimProof);
  assert(
    await claimAdapter.verify?.({ proof: claimProof, request: claimFixture.proofRequest }),
    "Claim adapter verify() must accept its own proof result.",
  );
  assert(
    !(await claimAdapter.verify?.({
      proof: { ...claimProof, proofBytes: tamperProofBytes(claimProof.proofBytes) },
      request: claimFixture.proofRequest,
    })),
    "Claim adapter verify() must reject tampered proof bytes.",
  );

  const swapToShieldedAdapter = createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
    client,
    fixtureProofRequest: swapToShieldedFixture.proofRequest,
    payload: {
      circuit: "vanta_private_pool_v2_swap_to_shielded_entry",
      compiledProgramBytecode: "fixture-bytecode",
      compressedWitness: new Uint8Array([14, 15, 16]),
      expectedPublicInputHash: swapToShieldedPublicInputHash,
      proofRuntimeVersion: "fixture-bb",
      target: "swap-to-shielded",
    },
    target: "swap-to-shielded",
  });
  const swapToShieldedProof = await swapToShieldedAdapter.prove(
    swapToShieldedFixture.proofRequest,
  );
  assert(
    calls.at(-1)?.target === "swap-to-shielded",
    "Swap-to-shielded adapter must call proveSwapToShielded.",
  );
  assert(
    calls.at(-1)?.payload.expectedPublicInputHash === swapToShieldedPublicInputHash,
    "Swap-to-shielded adapter must bind swap-public-input-hash into the worker payload.",
  );
  assert(
    swapToShieldedProof.proofSystem === "noir-bb",
    "Swap-to-shielded adapter proof system must be noir-bb.",
  );
  assert(
    swapToShieldedProof.proofBackend === "local-bb-derived-artifact",
    "Swap-to-shielded adapter proof backend must be local-bb-derived-artifact.",
  );
  assertProofResultHasNoWitnessMaterial(swapToShieldedProof);
  assert(
    await swapToShieldedAdapter.verify?.({
      proof: swapToShieldedProof,
      request: swapToShieldedFixture.proofRequest,
    }),
    "Swap-to-shielded adapter verify() must accept its own proof result.",
  );
  assert(
    !(await swapToShieldedAdapter.verify?.({
      proof: {
        ...swapToShieldedProof,
        proofBytes: tamperProofBytes(swapToShieldedProof.proofBytes),
      },
      request: swapToShieldedFixture.proofRequest,
    })),
    "Swap-to-shielded adapter verify() must reject tampered proof bytes.",
  );

  await expectRejection(
    () =>
      createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
        client: {
          async proveActualPrivateSpend() {
            return actualPrivateSpendDerivedArtifact;
          },
          async proveClaim() {
            return claimDerivedArtifact;
          },
          async proveSend() {
            return sendDerivedArtifact;
          },
          async proveShield() {
            return shieldArtifact;
          },
        },
        fixtureProofRequest: shieldFixture.proofRequest,
        payload: {
          circuit: "vanta_private_pool_v2_shield_entry",
          compiledProgramBytecode: "fixture-bytecode",
          compressedWitness: new Uint8Array([7]),
          expectedPublicInputHash: shieldPublicInputHash,
          proofRuntimeVersion: "fixture-bb",
          target: "shield",
        },
        target: "shield",
      }).prove(shieldFixture.proofRequest),
    "requires local-bb-derived-artifact evidence",
  );

  await expectRejection(
    () =>
      createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
        client,
        fixtureProofRequest: sendFixture.proofRequest,
        payload: {
          circuit: "vanta_private_pool_v2_send_entry",
          compiledProgramBytecode: "fixture-bytecode",
          compressedWitness: new Uint8Array([7]),
          expectedPublicInputHash: "1",
          proofRuntimeVersion: "fixture-bb",
          target: "send",
        },
        target: "send",
      }).prove(sendFixture.proofRequest),
    "expected public input hash",
  );

  await expectRejection(
    () =>
      createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
        client: {
          async proveActualPrivateSpend() {
            return actualPrivateSpendArtifact;
          },
          async proveSend() {
            return actualPrivateSpendDerivedArtifact;
          },
        },
        fixtureProofRequest: sendFixture.proofRequest,
        payload: {
          circuit: "vanta_private_pool_v2_send_entry",
          compiledProgramBytecode: "fixture-bytecode",
          compressedWitness: new Uint8Array([7]),
          expectedPublicInputHash: sendPublicInputHash,
          proofRuntimeVersion: "fixture-bb",
          target: "send",
        },
        target: "send",
      }).prove(sendFixture.proofRequest),
    "requires a Send artifact",
  );

  await expectRejection(
    () =>
      createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
        client,
        fixtureProofRequest: sendFixture.proofRequest,
        payload: {
          circuit: "vanta_private_pool_v2_send_entry",
          compiledProgramBytecode: "fixture-bytecode",
          compressedWitness: new Uint8Array([7]),
          proofRuntimeVersion: "fixture-bb",
          target: "swap-to-shielded",
        },
        target: "swap-to-shielded",
      }).prove(sendFixture.proofRequest),
    "payload target is unsupported",
  );

  const disabledAdapter = createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
    client,
    enabled: false,
    fixtureProofRequest: sendFixture.proofRequest,
    payload: {
      circuit: "vanta_private_pool_v2_send_entry",
      compiledProgramBytecode: "fixture-bytecode",
      compressedWitness: new Uint8Array([7]),
      expectedPublicInputHash: sendPublicInputHash,
      proofRuntimeVersion: "fixture-bb",
      target: "send",
    },
    target: "send",
  });
  assert(!disabledAdapter.readiness().ready, "disabled adapter must not be ready.");
  await expectRejection(
    () => disabledAdapter.prove(sendFixture.proofRequest),
    "browser-worker proof-result adapter is disabled",
  );

  const sanitizedMessage = await expectRejection(
    () =>
      createVantaPrivatePoolV2BrowserWorkerProofResultAdapter({
        client: {
          async proveActualPrivateSpend() {
            throw new Error("note_secret leaked");
          },
          async proveSend() {
            throw new Error("owner_secret leaked");
          },
          async proveShield() {
            throw new Error("shield witness leaked");
          },
        },
        fixtureProofRequest: sendFixture.proofRequest,
        payload: {
          circuit: "vanta_private_pool_v2_send_entry",
          compiledProgramBytecode: "fixture-bytecode",
          compressedWitness: new Uint8Array([7]),
          expectedPublicInputHash: sendPublicInputHash,
          proofRuntimeVersion: "fixture-bb",
          target: "send",
        },
        target: "send",
      }).prove(sendFixture.proofRequest),
    "browser-worker proof-result adapter failed",
  );
  assert(!sanitizedMessage.includes("owner_secret"), "adapter errors must sanitize owner_secret.");
  assert(!sanitizedMessage.includes("note_secret"), "adapter errors must sanitize note_secret.");

  console.log("Vanta Private Pool v2 browser-worker proof-result adapter check passed.");
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}

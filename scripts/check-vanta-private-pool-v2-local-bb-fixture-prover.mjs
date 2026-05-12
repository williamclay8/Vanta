import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const actualPrivateSpendArtifactPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json",
);
const sendArtifactPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_send_entry/target/vanta_private_pool_v2_send_entry.proof.json",
);
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-local-bb-fixture-prover-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2MerkleFixtureHelpers.ts",
  "privatePoolV2ActualPrivateSpendCircuitFixture.ts",
  "privatePoolV2SendCircuitFixture.ts",
  "privatePoolV2LocalProver.ts",
  "privatePoolV2LocalVerifierRegistry.ts",
];

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

function readArtifact(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalizeFieldString(value, label) {
  const trimmed = String(value).trim();
  const parsed = /^0x[0-9a-f]+$/u.test(trimmed)
    ? BigInt(trimmed)
    : /^(0|[1-9][0-9]*)$/u.test(trimmed)
      ? BigInt(trimmed)
      : null;

  assert(parsed !== null, `${label} must be a BN254 field string.`);
  assert(parsed < BN254_SCALAR_FIELD, `${label} must fit in BN254.`);
  return parsed.toString(10);
}

function readPublicInput(request, prefix) {
  return request.publicInputs.find((input) => input.startsWith(prefix))?.slice(prefix.length);
}

function readCircuitPublicInput(request, label) {
  const prefix = `${label}:`;
  return request.circuitPublicInputs?.find((input) => input.startsWith(prefix))?.slice(prefix.length);
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
    return;
  }

  throw new Error(`Expected rejection containing "${expectedMessage}".`);
}

function createRecordingActualPrivateSpendIndexer() {
  const nullifiers = new Map();
  const transitions = [];

  return {
    transitions,
    async getNullifier(nullifier) {
      return nullifiers.get(nullifier) ?? null;
    },
    async listCommitments() {
      return [];
    },
    async applyActualPrivateSpendTransition(args) {
      if (nullifiers.has(args.nullifier)) {
        throw new Error(`Private-pool nullifier ${args.nullifier} is already registered.`);
      }

      transitions.push(args);
      const nullifier = {
        nullifier: args.nullifier,
        spentAtSlot: args.spentAtSlot ?? null,
      };
      nullifiers.set(args.nullifier, nullifier);

      return {
        nullifier,
        outputCommitments: args.outputCommitments.map((commitment, index) => ({
          assetId: args.assetCohort,
          commitment,
          leafIndex: index,
          merkleRoot: `fixture-output-root:${index}`,
          treeId: args.poolId,
        })),
      };
    },
  };
}

function createRecordingPrivateSendIndexer() {
  const nullifiers = new Map();
  const transitions = [];

  return {
    transitions,
    async getNullifier(nullifier) {
      return nullifiers.get(nullifier) ?? null;
    },
    async listCommitments() {
      return [];
    },
    registerNullifier({ nullifier, spentAtSlot }) {
      if (nullifiers.has(nullifier)) {
        throw new Error(`Private-pool nullifier ${nullifier} is already registered.`);
      }

      nullifiers.set(nullifier, {
        nullifier,
        spentAtSlot: spentAtSlot ?? null,
      });
    },
    async appendCommitment() {
      throw new Error("Private-send fixture should use the atomic transition indexer.");
    },
    async applyPrivateSendTransition(args) {
      if (nullifiers.has(args.nullifier)) {
        throw new Error(`Private-pool nullifier ${args.nullifier} is already registered.`);
      }

      transitions.push(args);
      nullifiers.set(args.nullifier, {
        nullifier: args.nullifier,
        spentAtSlot: args.spentAtSlot ?? null,
      });

      return {
        changeOutput: {
          commitment: args.changeOutputCommitment,
          leafIndex: args.changeLeafIndex,
          merkleRoot: args.changeOutputRoot,
          treeId: "private-send-fixture-tree",
        },
        nullifier: {
          nullifier: args.nullifier,
          spentAtSlot: args.spentAtSlot ?? null,
        },
        recipientOutput: {
          commitment: args.recipientOutputCommitment,
          leafIndex: args.recipientLeafIndex,
          merkleRoot: args.recipientOutputRoot,
          treeId: "private-send-fixture-tree",
        },
      };
    },
  };
}

try {
  execFileSync("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "actual-private-spend"], {
    cwd: repoRoot,
    stdio: "pipe",
  });
  execFileSync("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "send"], {
    cwd: repoRoot,
    stdio: "pipe",
  });

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
      "ES2022,DOM",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  const [
    { createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture },
    { createVantaPrivatePoolV2SendCircuitFixture },
    { createVantaPrivatePoolV2LocalBbFixtureProver, createVantaPrivatePoolV2LocalProver },
    { createVantaPrivatePoolV2LocalVerifierRegistry },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ActualPrivateSpendCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2SendCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalProver.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalVerifierRegistry.js")).href),
  ]);

  const proofArtifact = readArtifact(actualPrivateSpendArtifactPath);
  const sendProofArtifact = readArtifact(sendArtifactPath);
  const fixture = createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture({ mode: "valid" });
  const sendFixture = createVantaPrivatePoolV2SendCircuitFixture({ mode: "valid" });
  const requestPublicInput = readCircuitPublicInput(
    fixture.proofRequest,
    "private-spend-public-input-hash",
  );
  const sendRequestPublicInput = readCircuitPublicInput(
    sendFixture.proofRequest,
    "send-public-input-hash",
  );

  assert(
    normalizeFieldString(requestPublicInput, "fixture request public input") ===
      normalizeFieldString(proofArtifact.publicInputs[0], "artifact public input"),
    "The fixture proof request must match the generated Actual Private Spend proof artifact.",
  );
  assert(
    normalizeFieldString(sendRequestPublicInput, "Send fixture request public input") ===
      normalizeFieldString(sendProofArtifact.publicInputs[0], "Send artifact public input"),
    "The Send fixture proof request must match the generated Send proof artifact.",
  );

  const defaultLocalProof = await createVantaPrivatePoolV2LocalProver().prove(fixture.proofRequest);
  assert(defaultLocalProof.proofSystem === "mock", "Default local prover must stay mock.");
  assert(defaultLocalProof.proofBackend === "local-mock", "Default local prover must stay local-mock.");
  const defaultSendLocalProof = await createVantaPrivatePoolV2LocalProver().prove(sendFixture.proofRequest);
  assert(defaultSendLocalProof.proofSystem === "mock", "Default Send local prover must stay mock.");
  assert(defaultSendLocalProof.proofBackend === "local-mock", "Default Send local prover must stay local-mock.");
  console.log("private-pool-v2 default local prover mock boundary: PASS");

  const prover = createVantaPrivatePoolV2LocalBbFixtureProver({
    fixtureProofRequest: fixture.proofRequest,
    proofArtifact,
    target: "actual-private-spend",
  });
  const readiness = prover.readiness();
  assert(readiness.ready === true, "Fixture prover should be opt-in ready when enabled.");
  assert(
    readiness.warnings.some((warning) =>
      warning.includes("Neither is a production ZK proof service"),
    ),
    "Fixture prover must warn that local artifacts are not production proof service evidence.",
  );

  const proof = await prover.prove(fixture.proofRequest);
  assert(proof.proofBackend === "local-bb-fixture-artifact", "Expected local bb fixture proof backend.");
  assert(proof.proofSystem === "noir-bb", "Expected Noir/bb proof system.");
  assert(proof.publicInputCommitment === proofArtifact.publicInputCommitment, "Expected artifact public input commitment.");
  assert(proof.verifyingKeyId === proofArtifact.verifyingKeyId, "Expected artifact verifying key id.");
  assert(proof.proofBytes.length > 0, "Expected non-empty proof bytes.");
  assert(await prover.verify({ proof, request: fixture.proofRequest }), "Expected fixture proof result to verify.");
  console.log("private-pool-v2 local bb fixture proof result: PASS");

  const indexer = createRecordingActualPrivateSpendIndexer();
  const registry = createVantaPrivatePoolV2LocalVerifierRegistry({
    indexer,
    prover,
  });
  const receipt = await registry.acceptProof({
    proof,
    request: fixture.proofRequest,
  });
  assert(receipt.proofSystem === "noir-bb", "Expected verifier receipt to preserve noir-bb proof system.");
  assert(
    receipt.proofBackend === "local-bb-fixture-artifact",
    "Expected verifier receipt to preserve local-bb-fixture-artifact proof backend.",
  );
  assert(
    receipt.replayKey === `private-send:${readPublicInput(fixture.proofRequest, "nullifier:")}`,
    "Expected receipt replay key to bind the Actual Private Spend nullifier.",
  );
  assert(indexer.transitions.length === 1, "Expected one Actual Private Spend transition.");
  assert(
    indexer.transitions[0]?.acceptedRoot === readPublicInput(fixture.proofRequest, "accepted-root:"),
    "Expected transition acceptedRoot to come from the request public inputs.",
  );
  assert(
    JSON.stringify(indexer.transitions[0]?.outputCommitments) ===
      JSON.stringify([
        readPublicInput(fixture.proofRequest, "output-commitment-0:"),
        readPublicInput(fixture.proofRequest, "output-commitment-1:"),
      ]),
    "Expected transition outputs to come from the request public inputs.",
  );
  console.log("private-pool-v2 local bb fixture verifier receipt: PASS");

  const sendProver = createVantaPrivatePoolV2LocalBbFixtureProver({
    fixtureProofRequest: sendFixture.proofRequest,
    proofArtifact: sendProofArtifact,
    target: "send",
  });
  const sendProof = await sendProver.prove(sendFixture.proofRequest);
  assert(sendProof.proofBackend === "local-bb-fixture-artifact", "Expected Send local bb fixture proof backend.");
  assert(sendProof.proofSystem === "noir-bb", "Expected Send Noir/bb proof system.");
  assert(
    sendProof.publicInputCommitment === sendProofArtifact.publicInputCommitment,
    "Expected Send artifact public input commitment.",
  );
  assert(await sendProver.verify({ proof: sendProof, request: sendFixture.proofRequest }), "Expected Send fixture proof result to verify.");
  console.log("private-pool-v2 Send local bb fixture proof result: PASS");

  const sendIndexer = createRecordingPrivateSendIndexer();
  const sendRegistry = createVantaPrivatePoolV2LocalVerifierRegistry({
    indexer: sendIndexer,
    prover: sendProver,
  });
  const sendReceipt = await sendRegistry.acceptProof({
    proof: sendProof,
    request: sendFixture.proofRequest,
  });
  assert(sendReceipt.proofSystem === "noir-bb", "Expected Send verifier receipt to preserve noir-bb proof system.");
  assert(
    sendReceipt.proofBackend === "local-bb-fixture-artifact",
    "Expected Send verifier receipt to preserve local-bb-fixture-artifact proof backend.",
  );
  assert(
    sendReceipt.replayKey === `private-send:${readPublicInput(sendFixture.proofRequest, "nullifier:")}`,
    "Expected Send receipt replay key to bind the Send nullifier.",
  );
  assert(sendIndexer.transitions.length === 1, "Expected one Send transition.");
  assert(
    sendIndexer.transitions[0]?.inputRoot === readPublicInput(sendFixture.proofRequest, "input-root:"),
    "Expected Send transition inputRoot to come from the request public inputs.",
  );
  assert(
    sendIndexer.transitions[0]?.recipientOutputCommitment ===
      readPublicInput(sendFixture.proofRequest, "recipient-output-commitment:"),
    "Expected Send transition recipient output to come from the request public inputs.",
  );
  assert(
    sendIndexer.transitions[0]?.changeOutputCommitment ===
      readPublicInput(sendFixture.proofRequest, "change-output-commitment:"),
    "Expected Send transition change output to come from the request public inputs.",
  );
  console.log("private-pool-v2 Send local bb fixture verifier receipt: PASS");

  await expectRejection(
    () =>
      sendRegistry.acceptProof({
        proof: sendProof,
        request: sendFixture.proofRequest,
      }),
    "has already been accepted",
  );
  console.log("private-pool-v2 Send local bb fixture replay rejection: PASS");

  await expectRejection(
    () =>
      sendProver.prove({
        ...sendFixture.proofRequest,
        circuitPublicInputs: ["send-public-input-hash:1"],
      }),
    "artifact public input must match the request public input",
  );
  console.log("private-pool-v2 Send local bb fixture request mismatch rejection: PASS");

  await expectRejection(
    () =>
      sendProver.prove({
        ...sendFixture.proofRequest,
        circuitPublicInputs: undefined,
      }),
    "requires request.circuitPublicInputs.send-public-input-hash",
  );
  await expectRejection(
    () =>
      sendProver.prove({
        ...sendFixture.proofRequest,
        circuitPublicInputs: [
          ...sendFixture.proofRequest.circuitPublicInputs,
          `send-public-input-hash:${sendProofArtifact.publicInputs[0]}`,
        ],
      }),
    "requires request.circuitPublicInputs.send-public-input-hash",
  );
  await expectRejection(
    () =>
      sendProver.prove({
        ...sendFixture.proofRequest,
        publicInputs: sendFixture.proofRequest.publicInputs.filter(
          (input) => !input.startsWith("vanta-private-pool-v2-send-proof-request-0.1:version"),
        ),
      }),
    "Send proof request version",
  );
  console.log("private-pool-v2 Send local bb fixture request-shape rejection: PASS");

  for (const label of [
    "input-root",
    "input-commitment",
    "nullifier",
    "recipient-output-commitment",
    "recipient-leaf-index",
    "recipient-output-root",
    "change-output-commitment",
    "change-leaf-index",
    "change-output-root",
    "recipient-memo-ciphertext-body-hash-field",
    "change-memo-ciphertext-body-hash-field",
    "asset-id-commitment",
    "economics-commitment",
    "owner-commitment",
    "send-context-tag",
  ]) {
    await expectRejection(
      () =>
        sendProver.prove({
          ...sendFixture.proofRequest,
          publicInputs: sendFixture.proofRequest.publicInputs.map((input) =>
            input.startsWith(`${label}:`) ? `${label}:${BigInt(input.slice(label.length + 1)) + 17n}` : input,
          ),
        }),
      "request public inputs must match the fixture proof request",
    );
  }
  console.log("private-pool-v2 Send local bb fixture transition-field drift rejection: PASS");

  for (const mutatedRequest of [
    { ...sendFixture.proofRequest, amountBaseUnits: sendFixture.proofRequest.amountBaseUnits + 1n },
    { ...sendFixture.proofRequest, assetId: "spoofed-send-asset-id" },
    {
      ...sendFixture.proofRequest,
      operatorVisibleTerms: ["spoofed-send-operator-visible-term"],
    },
    {
      ...sendFixture.proofRequest,
      shadowCommitments: {
        ...sendFixture.proofRequest.shadowCommitments,
        operatorVisibleTermsCommitment: "0xspoofed-send-operator-visible-terms",
      },
    },
  ]) {
    await expectRejection(
      () => sendProver.prove(mutatedRequest),
      "request transcript must match the fixture proof request",
    );
  }
  console.log("private-pool-v2 Send local bb fixture request-transcript drift rejection: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: sendFixture.proofRequest,
        proofArtifact,
        target: "send",
      }).prove(sendFixture.proofRequest),
    "requires a Send artifact",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: fixture.proofRequest,
        proofArtifact: sendProofArtifact,
        target: "actual-private-spend",
      }).prove(fixture.proofRequest),
    "actual-private-spend artifact",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: sendFixture.proofRequest,
        proofArtifact: {
          ...sendProofArtifact,
          circuit: "vanta_private_pool_v2_actual_private_spend_entry",
        },
        target: "send",
      }).prove(sendFixture.proofRequest),
    "requires a Send artifact",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: sendFixture.proofRequest,
        proofArtifact: {
          ...sendProofArtifact,
          proofBackend: "remote-service",
        },
        target: "send",
      }).prove(sendFixture.proofRequest),
    "local-bb-fixture-artifact evidence",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: sendFixture.proofRequest,
        proofArtifact: {
          ...sendProofArtifact,
          proofSystem: "mock",
        },
        target: "send",
      }).prove(sendFixture.proofRequest),
    "noir-bb proof evidence",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: sendFixture.proofRequest,
        proofArtifact: {
          ...sendProofArtifact,
          publicInputLabels: ["private-spend-public-input-hash"],
        },
        target: "send",
      }).prove(sendFixture.proofRequest),
    "send-public-input-hash",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: sendFixture.proofRequest,
        proofArtifact: {
          ...sendProofArtifact,
          verifyingKeyId: "production-vk:vanta_private_pool_v2_send_entry",
        },
        target: "send",
      }).prove(sendFixture.proofRequest),
    "local ACIR bytecode key metadata",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: sendFixture.proofRequest,
        proofArtifact: {
          ...sendProofArtifact,
          publicInputCommitment: "sha256:00",
        },
        target: "send",
      }).prove(sendFixture.proofRequest),
    "publicInputCommitment mismatch",
  );
  console.log("private-pool-v2 Send local bb fixture artifact relabel rejection: PASS");

  await expectRejection(
    () =>
      registry.acceptProof({
        proof,
        request: fixture.proofRequest,
      }),
    "has already been accepted",
  );
  console.log("private-pool-v2 local bb fixture replay rejection: PASS");

  await expectRejection(
    () =>
      prover.prove({
        ...fixture.proofRequest,
        circuitPublicInputs: ["private-spend-public-input-hash:1"],
      }),
    "artifact public input must match the request public input",
  );
  console.log("private-pool-v2 local bb fixture request mismatch rejection: PASS");

  await expectRejection(
    () =>
      prover.prove({
        ...fixture.proofRequest,
        circuitPublicInputs: undefined,
      }),
    "requires request.circuitPublicInputs.private-spend-public-input-hash",
  );
  await expectRejection(
    () =>
      prover.prove({
        ...fixture.proofRequest,
        circuitPublicInputs: [
          ...fixture.proofRequest.circuitPublicInputs,
          `private-spend-public-input-hash:${proofArtifact.publicInputs[0]}`,
        ],
      }),
    "requires request.circuitPublicInputs.private-spend-public-input-hash",
  );
  await expectRejection(
    () =>
      prover.prove({
        ...fixture.proofRequest,
        publicInputs: fixture.proofRequest.publicInputs.filter(
          (input) =>
            !input.startsWith("vanta-private-pool-v2-actual-private-spend-proof-request-0.1:version"),
        ),
      }),
    "actual-private-spend proof request version",
  );
  console.log("private-pool-v2 local bb fixture request-shape rejection: PASS");

  for (const label of [
    "pool-id",
    "asset-cohort",
    "accepted-root",
    "nullifier",
    "output-commitment-0",
    "output-commitment-1",
    "context-hash",
  ]) {
    await expectRejection(
      () =>
        prover.prove({
          ...fixture.proofRequest,
          publicInputs: fixture.proofRequest.publicInputs.map((input) =>
            input.startsWith(`${label}:`) ? `${label}:${BigInt(input.slice(label.length + 1)) + 17n}` : input,
          ),
        }),
      "request public inputs must match the fixture proof request",
    );
  }
  console.log("private-pool-v2 local bb fixture transition-field drift rejection: PASS");

  for (const mutatedRequest of [
    { ...fixture.proofRequest, amountBaseUnits: fixture.proofRequest.amountBaseUnits + 1n },
    { ...fixture.proofRequest, assetId: "spoofed-asset-id" },
    {
      ...fixture.proofRequest,
      shadowCommitments: {
        ...fixture.proofRequest.shadowCommitments,
        operatorVisibleTermsCommitment: "0xspoofed-operator-visible-terms",
      },
    },
  ]) {
    await expectRejection(
      () => prover.prove(mutatedRequest),
      "request transcript must match the fixture proof request",
    );
  }
  console.log("private-pool-v2 local bb fixture request-transcript drift rejection: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        enabled: false,
        fixtureProofRequest: fixture.proofRequest,
        proofArtifact,
        target: "actual-private-spend",
      }).prove(fixture.proofRequest),
    "disabled",
  );
  console.log("private-pool-v2 local bb fixture disabled rejection: PASS");

  assert(
    !(await prover.verify({
      proof: {
        ...proof,
        proofBackend: "local-mock",
      },
      request: fixture.proofRequest,
    })),
    "Expected spoofed local-mock backend to fail verifier equality.",
  );
  assert(
    !(await prover.verify({
      proof: {
        ...proof,
        proofBytes: tamperProofBytes(proof.proofBytes),
      },
      request: fixture.proofRequest,
    })),
    "Expected tampered proof bytes to fail verifier equality.",
  );
  console.log("private-pool-v2 local bb fixture proof-result tamper rejection: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: fixture.proofRequest,
        proofArtifact: {
          ...proofArtifact,
          proofBackend: "remote-service",
        },
        target: "actual-private-spend",
      }).prove(fixture.proofRequest),
    "local-bb-fixture-artifact or local-bb-derived-artifact evidence",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: fixture.proofRequest,
        proofArtifact: {
          ...proofArtifact,
          publicInputLabels: ["send-public-input-hash"],
        },
        target: "actual-private-spend",
      }).prove(fixture.proofRequest),
    "private-spend-public-input-hash",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: fixture.proofRequest,
        proofArtifact: {
          ...proofArtifact,
          verifyingKeyId: "production-vk:vanta_private_pool_v2_actual_private_spend_entry",
        },
        target: "actual-private-spend",
      }).prove(fixture.proofRequest),
    "local ACIR bytecode key metadata",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: fixture.proofRequest,
        proofArtifact: {
          ...proofArtifact,
          publicInputCommitment: "sha256:00",
        },
        target: "actual-private-spend",
      }).prove(fixture.proofRequest),
    "publicInputCommitment mismatch",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: fixture.proofRequest,
        proofArtifact: {
          ...proofArtifact,
          acirBytecodeHash: "sha256:00",
          verifyingKeyHash: "sha256:00",
          verifyingKeyId:
            "local-acir-bytecode:vanta_private_pool_v2_actual_private_spend_entry:sha256:00",
        },
        target: "actual-private-spend",
      }).prove(fixture.proofRequest),
    "local ACIR bytecode key metadata",
  );
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalBbFixtureProver({
        fixtureProofRequest: fixture.proofRequest,
        proofArtifact: {
          ...proofArtifact,
          acirBytecodeHash: proofArtifact.verifyingKeyHash,
          verifyingKeyHash: "sha256:00",
          verifyingKeyId: proofArtifact.verifyingKeyId,
        },
        target: "actual-private-spend",
      }).prove(fixture.proofRequest),
    "local ACIR bytecode key metadata",
  );
  console.log("private-pool-v2 local bb fixture artifact relabel rejection: PASS");

  console.log("Vanta Private Pool v2 local bb fixture prover check: PASS");
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}

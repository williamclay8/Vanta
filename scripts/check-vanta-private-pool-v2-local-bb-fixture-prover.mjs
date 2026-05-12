import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const artifactPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json",
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

function readArtifact() {
  return JSON.parse(readFileSync(artifactPath, "utf8"));
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

try {
  execFileSync("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "actual-private-spend"], {
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
    { createVantaPrivatePoolV2LocalBbFixtureProver, createVantaPrivatePoolV2LocalProver },
    { createVantaPrivatePoolV2LocalVerifierRegistry },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ActualPrivateSpendCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalProver.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalVerifierRegistry.js")).href),
  ]);

  const proofArtifact = readArtifact();
  const fixture = createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture({ mode: "valid" });
  const requestPublicInput = readCircuitPublicInput(
    fixture.proofRequest,
    "private-spend-public-input-hash",
  );

  assert(
    normalizeFieldString(requestPublicInput, "fixture request public input") ===
      normalizeFieldString(proofArtifact.publicInputs[0], "artifact public input"),
    "The fixture proof request must match the generated Actual Private Spend proof artifact.",
  );

  const defaultLocalProof = await createVantaPrivatePoolV2LocalProver().prove(fixture.proofRequest);
  assert(defaultLocalProof.proofSystem === "mock", "Default local prover must stay mock.");
  assert(defaultLocalProof.proofBackend === "local-mock", "Default local prover must stay local-mock.");
  console.log("private-pool-v2 default local prover mock boundary: PASS");

  const prover = createVantaPrivatePoolV2LocalBbFixtureProver({
    fixtureProofRequest: fixture.proofRequest,
    proofArtifact,
    target: "actual-private-spend",
  });
  const readiness = prover.readiness();
  assert(readiness.ready === true, "Fixture prover should be opt-in ready when enabled.");
  assert(
    readiness.warnings.some((warning) => warning.includes("not a witness-driven runtime prover")),
    "Fixture prover must warn that it is not a witness-driven runtime prover.",
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
    "local-bb-fixture-artifact evidence",
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

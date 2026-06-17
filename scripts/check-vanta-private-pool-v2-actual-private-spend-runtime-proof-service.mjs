import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact } from "../operator/private-pool-v2-proof-artifact.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const circuitDir = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry",
);
const artifactPath = resolve(
  circuitDir,
  "target/vanta_private_pool_v2_actual_private_spend_entry.proof.json",
);
const tempRoot = mkdtempSync(
  resolve(repoRoot, ".tmp/vanta-private-pool-v2-actual-private-spend-runtime-proof-service-"),
);
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const witnessJsonPath = join(tempRoot, "actual-private-spend-witness.json");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2MerkleFixtureHelpers.ts",
  "privatePoolV2ActualPrivateSpendCircuitFixture.ts",
  "privatePoolV2LocalProver.ts",
  "privatePoolV2ActualPrivateSpendRuntimeProofService.ts",
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

function toWitnessJson(witness) {
  return {
    accepted_root: witness.accepted_root.toString(10),
    asset_cohort: witness.asset_cohort.toString(10),
    context_hash: witness.context_hash.toString(10),
    context_preimage_merchant_address_hi:
      witness.context_preimage_merchant_address_hi.toString(10),
    context_preimage_merchant_address_lo:
      witness.context_preimage_merchant_address_lo.toString(10),
    context_preimage_denomination: witness.context_preimage_denomination.toString(10),
    context_preimage_settlement_epoch_hi:
      witness.context_preimage_settlement_epoch_hi.toString(10),
    context_preimage_settlement_epoch_lo:
      witness.context_preimage_settlement_epoch_lo.toString(10),
    input_blinding: witness.input_blinding.toString(10),
    input_commitment: witness.input_commitment.toString(10),
    input_derivation_tag: witness.input_derivation_tag.toString(10),
    leaf_index: witness.leaf_index.toString(10),
    membership_path: witness.membership_path.map((entry) => entry.toString(10)),
    membership_path_direction_bits: witness.membership_path_direction_bits.map((entry) =>
      entry.toString(10),
    ),
    nullifier: witness.nullifier.toString(10),
    note_secret: witness.note_secret.toString(10),
    output_commitment_0: witness.output_commitment_0.toString(10),
    output_commitment_1: witness.output_commitment_1.toString(10),
    pool_id: witness.pool_id.toString(10),
    request_version: witness.request_version.toString(10),
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

function readArtifact() {
  return JSON.parse(readFileSync(artifactPath, "utf8"));
}

function tamperProofHex(proofHex) {
  const last = proofHex.at(-1);
  return `${proofHex.slice(0, -1)}${last === "0" ? "1" : "0"}`;
}

let checkCompleted = false;
let restoreDefaultProofArtifact = false;

try {
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
    { createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService },
    {
      VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
      VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    },
    { createVantaPrivatePoolV2LocalProver },
  ] = await Promise.all([
    import(
      pathToFileURL(join(tempJsDir, "privatePoolV2ActualPrivateSpendCircuitFixture.js")).href
    ),
    import(
      pathToFileURL(
        join(tempJsDir, "privatePoolV2ActualPrivateSpendRuntimeProofService.js"),
      ).href
    ),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalProver.js")).href),
  ]);

  const fixture = createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture({
    mode: "valid",
  });
  const witnessJson = toWitnessJson(fixture.witness);
  writeFileSync(witnessJsonPath, `${JSON.stringify(witnessJson, null, 2)}\n`);

  run("node", [
    "scripts/prove-vanta-private-pool-v2-circuit.mjs",
    "actual-private-spend",
    "--witness-json",
    witnessJsonPath,
  ]);
  restoreDefaultProofArtifact = true;

  const proofArtifact = readArtifact();
  const expectedPublicInputHash = fixture.privateSpendPublicInputHash.toString(10);
  assert(
    proofArtifact.proofBackend === "local-bb-derived-artifact",
    "Runtime proof-service fixture must use local-bb-derived-artifact.",
  );
  assert(
    normalizeFieldString(proofArtifact.publicInputs[0], "artifact public input") ===
      expectedPublicInputHash,
    "Runtime proof-service artifact must bind the expected private-spend-public-input-hash.",
  );

  let producerCalls = 0;
  let verifierCalls = 0;
  const service = createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService({
    artifactProducer: ({ expectedPublicInputHash: requestedPublicInputHash, request }) => {
      producerCalls += 1;
      assert(
        requestedPublicInputHash === expectedPublicInputHash,
        "Runtime proof service must pass the expected public input hash to the producer.",
      );
      assert(
        request === fixture.proofRequest,
        "Runtime proof service must pass the original request to the producer.",
      );
      return {
        proofArtifact,
        proofRequest: fixture.proofRequest,
      };
    },
    artifactVerifier: async ({ expectedPublicInputHash: requestedPublicInputHash, proofArtifact: artifact }) => {
      verifierCalls += 1;
      assert(
        requestedPublicInputHash === expectedPublicInputHash,
        "Runtime proof service must pass the expected public input hash to the verifier.",
      );
      const receipt = await verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({
        proofArtifact: artifact,
      });
      assert(receipt.verified === true, "Runtime proof service verifier must use real proof verification.");
      return receipt;
    },
  });

  const proof = await service.prove(fixture.proofRequest);
  assert(producerCalls === 1, "Runtime proof service must call the artifact producer once.");
  assert(verifierCalls === 1, "Runtime proof service must call the artifact verifier once.");
  assert(
    proof.proofBackend === "local-bb-derived-artifact",
    "Runtime proof service must preserve local-bb-derived-artifact.",
  );
  assert(proof.proofSystem === "noir-bb", "Runtime proof service must return noir-bb proof results.");
  assert(
    await service.verify({ proof, request: fixture.proofRequest }),
    "Runtime proof service must verify its proof result.",
  );
  console.log("private-pool-v2 actual-private-spend runtime proof service happy path: PASS");

  const defaultLocalProof = await createVantaPrivatePoolV2LocalProver().prove(
    fixture.proofRequest,
  );
  assert(defaultLocalProof.proofSystem === "mock", "Default local prover must stay mock.");
  assert(
    defaultLocalProof.proofBackend === "local-mock",
    "Default local prover must stay local-mock.",
  );

  await expectRejection(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService({
        artifactProducer: () => ({
          proofArtifact: {
            ...proofArtifact,
            proofBackend: "local-mock",
            proofSystem: "mock",
          },
          proofRequest: fixture.proofRequest,
        }),
        artifactVerifier: ({ proofArtifact: artifact }) =>
          verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({ proofArtifact: artifact }),
      }).prove(fixture.proofRequest),
    "requires local-bb-derived-artifact evidence",
  );
  console.log("private-pool-v2 actual-private-spend runtime proof service mock rejection: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService({
        artifactProducer: () => ({
          proofArtifact: {
            ...proofArtifact,
            proofBackend: "local-bb-fixture-artifact",
          },
          proofRequest: fixture.proofRequest,
        }),
        artifactVerifier: ({ proofArtifact: artifact }) =>
          verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({ proofArtifact: artifact }),
      }).prove(fixture.proofRequest),
    "requires local-bb-derived-artifact evidence",
  );
  console.log("private-pool-v2 actual-private-spend runtime proof service fixture replay rejection: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService({
        artifactProducer: () => ({
          proofArtifact: {
            ...proofArtifact,
            circuit: "vanta_private_pool_v2_send_entry",
            publicInputLabels: ["send-public-input-hash"],
          },
          proofRequest: fixture.proofRequest,
        }),
        artifactVerifier: ({ proofArtifact: artifact }) =>
          verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({ proofArtifact: artifact }),
      }).prove(fixture.proofRequest),
    "requires the actual-private-spend circuit artifact",
  );
  console.log("private-pool-v2 actual-private-spend runtime proof service wrong target rejection: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService({
        artifactProducer: () => ({
          proofArtifact: {
            ...proofArtifact,
            privateInputs: {
              noteSecret: witnessJson.note_secret,
            },
          },
          proofRequest: fixture.proofRequest,
        }),
        artifactVerifier: ({ proofArtifact: artifact }) =>
          verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({ proofArtifact: artifact }),
      }).prove(fixture.proofRequest),
    "forbidden no-witness field",
  );
  console.log("private-pool-v2 actual-private-spend runtime proof service witness leakage rejection: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService({
        artifactProducer: () => ({
          proofArtifact: {
            ...proofArtifact,
            proofHex: tamperProofHex(proofArtifact.proofHex),
          },
          proofRequest: fixture.proofRequest,
        }),
        artifactVerifier: ({ proofArtifact: artifact }) =>
          verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({ proofArtifact: artifact }),
      }).prove(fixture.proofRequest),
    "verification returned false",
  );
  console.log("private-pool-v2 actual-private-spend runtime proof service proof-byte tamper rejection: PASS");

  const verifiedReceipt = await verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({
    proofArtifact,
  });
  await expectRejection(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService({
        artifactProducer: () => ({
          proofArtifact: {
            ...proofArtifact,
            proofHex: tamperProofHex(proofArtifact.proofHex),
          },
          proofRequest: fixture.proofRequest,
        }),
        artifactVerifier: () => verifiedReceipt,
      }).prove(fixture.proofRequest),
    "verification receipt must match the proof artifact",
  );
  console.log("private-pool-v2 actual-private-spend runtime proof service verification-receipt mismatch rejection: PASS");

  const tamperedRequest = {
    ...fixture.proofRequest,
    publicInputs: fixture.proofRequest.publicInputs.map((input) =>
      input.startsWith("context-hash:")
        ? `context-hash:${(BigInt(witnessJson.context_hash) + 1n).toString(10)}`
        : input,
    ),
  };
  await expectRejection(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService({
        artifactProducer: () => ({
          proofArtifact,
          proofRequest: fixture.proofRequest,
        }),
        artifactVerifier: ({ proofArtifact: artifact }) =>
          verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({ proofArtifact: artifact }),
      }).prove(tamperedRequest),
    "producer proof request must match the requested transcript",
  );
  console.log("private-pool-v2 actual-private-spend runtime proof service transcript tamper rejection: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService({
        artifactProducer: () => ({
          proofArtifact,
          proofRequest: fixture.proofRequest,
        }),
        artifactVerifier: ({ proofArtifact: artifact }) =>
          verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({ proofArtifact: artifact }),
      }).prove({
        ...fixture.proofRequest,
        amountBaseUnits: VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS + 1n,
      }),
    "hidden-economics amount sentinel",
  );
  console.log("private-pool-v2 actual-private-spend runtime proof service amount sentinel rejection: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService({
        artifactProducer: () => ({
          proofArtifact,
          proofRequest: fixture.proofRequest,
        }),
        artifactVerifier: ({ proofArtifact: artifact }) =>
          verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({ proofArtifact: artifact }),
      }).prove({
        ...fixture.proofRequest,
        assetId: `${VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID}:tampered`,
      }),
    "hidden-economics asset sentinel",
  );
  console.log("private-pool-v2 actual-private-spend runtime proof service asset sentinel rejection: PASS");

  const disabled = createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService({
    artifactProducer: () => ({
      proofArtifact,
      proofRequest: fixture.proofRequest,
    }),
    artifactVerifier: ({ proofArtifact: artifact }) =>
      verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({ proofArtifact: artifact }),
    enabled: false,
  });
  assert(disabled.readiness().ready === false, "Disabled runtime proof service must not be ready.");
  await expectRejection(
    () => disabled.prove(fixture.proofRequest),
    "Actual-private-spend runtime proof service is disabled.",
  );
  console.log("private-pool-v2 actual-private-spend runtime proof service disabled rejection: PASS");

  checkCompleted = true;
} finally {
  if (restoreDefaultProofArtifact) {
    run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "actual-private-spend"]);
  }
  rmSync(tempRoot, { recursive: true, force: true });
  if (checkCompleted) {
    console.log("private-pool-v2 actual-private-spend runtime proof service fixture restore: PASS");
    console.log("Vanta Private Pool v2 actual-private-spend runtime proof service check: PASS");
  }
}

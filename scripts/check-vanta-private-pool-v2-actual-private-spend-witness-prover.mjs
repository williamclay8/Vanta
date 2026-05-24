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
const proverTomlPath = resolve(circuitDir, "Prover.toml");
const artifactPath = resolve(
  circuitDir,
  "target/vanta_private_pool_v2_actual_private_spend_entry.proof.json",
);
const tempRoot = mkdtempSync(
  resolve(repoRoot, ".tmp/vanta-private-pool-v2-actual-private-spend-witness-prover-"),
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

function readArtifact() {
  return JSON.parse(readFileSync(artifactPath, "utf8"));
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

function expectThrow(action, expectedMessage) {
  try {
    action();
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
    {
      buildVantaPrivatePoolV2SparseMerkleTree,
      directionBitsForLeafIndex,
    },
    {
      computeVantaPrivatePoolV2ActualPrivateSpendContextHash,
      computeVantaPrivatePoolV2ActualPrivateSpendNullifier,
      computeVantaPrivatePoolV2ActualPrivateSpendInputCommitment,
      createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture,
      createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput,
    },
    {
      createVantaPrivatePoolV2LocalBbFixtureProver,
      createVantaPrivatePoolV2LocalProver,
    },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2MerkleFixtureHelpers.js")).href),
    import(
      pathToFileURL(join(tempJsDir, "privatePoolV2ActualPrivateSpendCircuitFixture.js")).href
    ),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalProver.js")).href),
  ]);

  const witnessBase = {
    asset_cohort: 1202n,
    context_preimage_merchant_address_hi: 0n,
    context_preimage_merchant_address_lo: 17700n,
    context_preimage_denomination: 1909n,
    context_preimage_settlement_epoch_hi: 0n,
    context_preimage_settlement_epoch_lo: 84n,
    input_blinding: 9404n,
    input_derivation_tag: 9405n,
    leaf_index: 42n,
    note_secret: 3303n,
    output_commitment_0: 91001n,
    output_commitment_1: 91002n,
    pool_id: 1101n,
    request_version: 1701n,
  };
  const witnessBaseWithInputCommitment = {
    ...witnessBase,
    input_commitment:
      computeVantaPrivatePoolV2ActualPrivateSpendInputCommitment(witnessBase),
  };
  const tree = buildVantaPrivatePoolV2SparseMerkleTree({
    leaves: [
      {
        leafIndex: witnessBaseWithInputCommitment.leaf_index,
        leafValue: witnessBaseWithInputCommitment.input_commitment,
      },
    ],
  });
  const witnessWithRoot = {
    ...witnessBaseWithInputCommitment,
    accepted_root: tree.root,
    membership_path: tree.pathForLeaf(witnessBaseWithInputCommitment.leaf_index),
    membership_path_direction_bits: directionBitsForLeafIndex(
      witnessBaseWithInputCommitment.leaf_index,
    ),
  };
  const witness = {
    ...witnessWithRoot,
    nullifier: computeVantaPrivatePoolV2ActualPrivateSpendNullifier(witnessWithRoot),
  };
  witness.context_hash = computeVantaPrivatePoolV2ActualPrivateSpendContextHash(witness);
  const witnessJson = toWitnessJson(witness);
  const fixture =
    createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput(witnessJson);
  const defaultFixture = createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture({
    mode: "valid",
  });

  assert(
    fixture.privateSpendPublicInputHash !== defaultFixture.privateSpendPublicInputHash,
    "Custom witness must not reuse the default fixture public-input hash.",
  );
  assert(
    fixture.proofRequest.circuitPublicInputs?.[0] ===
      `private-spend-public-input-hash:${fixture.privateSpendPublicInputHash.toString(10)}`,
    "Custom witness proof request must bind the derived circuit public input.",
  );
  console.log("private-pool-v2 actual-private-spend witness input builder: PASS");

  expectThrow(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        pool_id: `0${witnessJson.pool_id}`,
      }),
    "canonical decimal",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        membership_path_direction_bits: [
          "2",
          ...witnessJson.membership_path_direction_bits.slice(1),
        ],
      }),
    "must be 0 or 1",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        note_secret: (BigInt(witnessJson.note_secret) + 1n).toString(10),
      }),
    "input_commitment",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        input_blinding: (BigInt(witnessJson.input_blinding) + 1n).toString(10),
      }),
    "input_commitment",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        context_preimage_merchant_address_lo: (
          BigInt(witnessJson.context_preimage_merchant_address_lo) + 1n
        ).toString(10),
      }),
    "context_hash",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        membership_path: witnessJson.membership_path.slice(1),
      }),
    "must contain 20",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        leaf_index: (BigInt(witnessJson.leaf_index) + 1n).toString(10),
      }),
    "leaf_index",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        output_commitment_1: witnessJson.output_commitment_0,
      }),
    "unique",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        inputCommitment: witnessJson.input_commitment,
      }),
    "unexpected field inputCommitment",
  );
  console.log("private-pool-v2 actual-private-spend witness input rejection matrix: PASS");

  writeFileSync(witnessJsonPath, `${JSON.stringify(witnessJson, null, 2)}\n`);
  run("node", [
    "scripts/prove-vanta-private-pool-v2-circuit.mjs",
    "actual-private-spend",
    "--witness-json",
    witnessJsonPath,
  ]);

  const proofArtifact = readArtifact();
  assert(
    proofArtifact.proofBackend === "local-bb-derived-artifact",
    "Witness-input proof artifact must use local-bb-derived-artifact.",
  );
  assert(
    normalizeFieldString(proofArtifact.publicInputs[0], "artifact public input") ===
      fixture.privateSpendPublicInputHash.toString(10),
    "Witness-input proof artifact must use the derived public-input hash.",
  );
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
    proofArtifact,
    "Actual-private-spend witness-input proof artifact",
  );

  const verifiedReceipt = await verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({
    proofArtifact,
  });
  assert(verifiedReceipt.verified === true, "Witness-input proof artifact must verify.");
  assert(
    normalizeFieldString(
      verifiedReceipt.verifiedPublicInputs.privateSpendPublicInputHash,
      "verified receipt public input",
    ) === fixture.privateSpendPublicInputHash.toString(10),
    "Witness-input receipt must bind the derived private-spend-public-input-hash.",
  );
  console.log("private-pool-v2 actual-private-spend witness-input artifact verification: PASS");

  const defaultLocalProof = await createVantaPrivatePoolV2LocalProver().prove(fixture.proofRequest);
  assert(defaultLocalProof.proofSystem === "mock", "Default local prover must stay mock.");
  assert(defaultLocalProof.proofBackend === "local-mock", "Default local prover must stay local-mock.");

  const prover = createVantaPrivatePoolV2LocalBbFixtureProver({
    fixtureProofRequest: fixture.proofRequest,
    proofArtifact,
    target: "actual-private-spend",
  });
  const proof = await prover.prove(fixture.proofRequest);
  assert(
    proof.proofBackend === "local-bb-derived-artifact",
    "Local adapter must preserve local-bb-derived-artifact.",
  );
  assert(proof.proofSystem === "noir-bb", "Local adapter must preserve noir-bb.");
  assert(
    await prover.verify({ proof, request: fixture.proofRequest }),
    "Local adapter must verify the derived witness proof result.",
  );
  await expectRejection(
    () =>
      prover.prove({
        ...fixture.proofRequest,
        circuitPublicInputs: [
          `private-spend-public-input-hash:${defaultFixture.privateSpendPublicInputHash.toString(
            10,
          )}`,
        ],
      }),
    "artifact public input must match the request public input",
  );
  await expectRejection(
    () =>
      prover.prove({
        ...fixture.proofRequest,
        publicInputs: fixture.proofRequest.publicInputs.map((input) =>
          input.startsWith("context-hash:")
            ? `context-hash:${(BigInt(witnessJson.context_hash) + 1n).toString(10)}`
            : input,
        ),
      }),
    "request public inputs must match the fixture proof request",
  );
  console.log("private-pool-v2 actual-private-spend derived local adapter guard: PASS");

  run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "actual-private-spend"]);
  const restoredArtifact = readArtifact();
  assert(
    restoredArtifact.proofBackend === "local-bb-fixture-artifact",
    "Default restore proof artifact must return to local-bb-fixture-artifact.",
  );
  assert(
    normalizeFieldString(restoredArtifact.publicInputs[0], "restored artifact public input") ===
      defaultFixture.privateSpendPublicInputHash.toString(10),
    "Default restore proof artifact must return to the default fixture public input.",
  );
  assert(
    readFileSync(proverTomlPath, "utf8").includes(
      `private_spend_public_input_hash = "${defaultFixture.privateSpendPublicInputHash.toString(
        10,
      )}"`,
    ),
    "Prover.toml must be restored to the default valid fixture.",
  );
  console.log("private-pool-v2 actual-private-spend fixture restore after witness input: PASS");

  console.log("Vanta Private Pool v2 actual-private-spend witness prover check: PASS");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

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
const proverTomlPath = resolve(circuitDir, "Prover.toml");
const artifactPath = resolve(
  circuitDir,
  "target/vanta_private_pool_v2_send_entry.proof.json",
);
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-send-witness-prover-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const witnessJsonPath = join(tempRoot, "send-witness.json");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2MerkleFixtureHelpers.ts",
  "privatePoolV2SendCircuitFixture.ts",
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

function toWitnessJson(witness, memoCiphertextBodyHashes) {
  return {
    asset_id_commitment: witness.asset_id_commitment.toString(10),
    change_amount: witness.change_amount.toString(10),
    change_append_path: witness.change_append_path.map((entry) => entry.toString(10)),
    change_append_path_direction_bits: witness.change_append_path_direction_bits.map((entry) =>
      entry.toString(10),
    ),
    change_leaf_index: witness.change_leaf_index.toString(10),
    change_memo_ciphertext_body_hash:
      memoCiphertextBodyHashes.changeMemoCiphertextBodyHash,
    change_memo_ciphertext_body_hash_field:
      witness.change_memo_ciphertext_body_hash_field.toString(10),
    change_output_blinding: witness.change_output_blinding.toString(10),
    change_output_commitment: witness.change_output_commitment.toString(10),
    change_output_derivation_tag: witness.change_output_derivation_tag.toString(10),
    change_output_root: witness.change_output_root.toString(10),
    economics_blinding: witness.economics_blinding.toString(10),
    economics_commitment: witness.economics_commitment.toString(10),
    input_amount: witness.input_amount.toString(10),
    input_blinding: witness.input_blinding.toString(10),
    input_commitment: witness.input_commitment.toString(10),
    input_derivation_tag: witness.input_derivation_tag.toString(10),
    input_leaf_index: witness.input_leaf_index.toString(10),
    input_root: witness.input_root.toString(10),
    membership_path: witness.membership_path.map((entry) => entry.toString(10)),
    membership_path_direction_bits: witness.membership_path_direction_bits.map((entry) =>
      entry.toString(10),
    ),
    nullifier: witness.nullifier.toString(10),
    owner_commitment: witness.owner_commitment.toString(10),
    owner_secret: witness.owner_secret.toString(10),
    relayer_fee: witness.relayer_fee.toString(10),
    recipient_amount: witness.recipient_amount.toString(10),
    recipient_append_path: witness.recipient_append_path.map((entry) => entry.toString(10)),
    recipient_append_path_direction_bits: witness.recipient_append_path_direction_bits.map(
      (entry) => entry.toString(10),
    ),
    recipient_leaf_index: witness.recipient_leaf_index.toString(10),
    recipient_memo_ciphertext_body_hash:
      memoCiphertextBodyHashes.recipientMemoCiphertextBodyHash,
    recipient_memo_ciphertext_body_hash_field:
      witness.recipient_memo_ciphertext_body_hash_field.toString(10),
    recipient_owner_commitment: witness.recipient_owner_commitment.toString(10),
    recipient_output_blinding: witness.recipient_output_blinding.toString(10),
    recipient_output_commitment: witness.recipient_output_commitment.toString(10),
    recipient_output_derivation_tag: witness.recipient_output_derivation_tag.toString(10),
    recipient_output_root: witness.recipient_output_root.toString(10),
    request_version: witness.request_version.toString(10),
    send_context_tag: witness.send_context_tag.toString(10),
    valid_until_slot: witness.valid_until_slot.toString(10),
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
      deriveVantaPrivatePoolV2MemoCiphertextBodyHashField,
    },
    {
      buildVantaPrivatePoolV2SparseMerkleTree,
      directionBitsForLeafIndex,
    },
    {
      computeVantaPrivatePoolV2SendEconomicsCommitment,
      computeVantaPrivatePoolV2SendInputCommitment,
      computeVantaPrivatePoolV2SendNullifier,
      computeVantaPrivatePoolV2SendOwnerCommitment,
      computeVantaPrivatePoolV2SendOutputCommitment,
      createVantaPrivatePoolV2SendCircuitFixture,
      createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput,
    },
    {
      createVantaPrivatePoolV2LocalBbFixtureProver,
      createVantaPrivatePoolV2LocalProver,
    },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2MerkleFixtureHelpers.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2SendCircuitFixture.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalProver.js")).href),
  ]);

  const memoCiphertextBodyHashes = {
    changeMemoCiphertextBodyHash: `sha256:${"44".repeat(32)}`,
    recipientMemoCiphertextBodyHash: `sha256:${"33".repeat(32)}`,
  };
  const ownerSecret = 3333n;
  const ownerCommitment = computeVantaPrivatePoolV2SendOwnerCommitment({
    owner_secret: ownerSecret,
  });
  const inputCommitmentPreimage = {
    asset_id_commitment: 5505n,
    input_amount: 7000n,
    input_blinding: 8808n,
    input_derivation_tag: 8809n,
    owner_commitment: ownerCommitment,
  };
  const recipientAmount = 4300n;
  const changeAmount = 2400n;
  const relayerFee = 300n;
  const recipientOutputPreimage = {
    asset_id_commitment: inputCommitmentPreimage.asset_id_commitment,
    output_amount: recipientAmount,
    output_blinding: 9701n,
    output_derivation_tag: 9702n,
    owner_commitment: 4404n,
  };
  const changeOutputPreimage = {
    asset_id_commitment: inputCommitmentPreimage.asset_id_commitment,
    output_amount: changeAmount,
    output_blinding: 9801n,
    output_derivation_tag: 9802n,
    owner_commitment: ownerCommitment,
  };
  const witnessBase = {
    asset_id_commitment: inputCommitmentPreimage.asset_id_commitment,
    change_amount: changeAmount,
    change_leaf_index: 44n,
    change_memo_ciphertext_body_hash_field: BigInt(
      deriveVantaPrivatePoolV2MemoCiphertextBodyHashField(
        memoCiphertextBodyHashes.changeMemoCiphertextBodyHash,
        "change memo ciphertext body hash",
      ),
    ),
    change_output_blinding: changeOutputPreimage.output_blinding,
    change_output_commitment: computeVantaPrivatePoolV2SendOutputCommitment(
      changeOutputPreimage,
    ),
    change_output_derivation_tag: changeOutputPreimage.output_derivation_tag,
    economics_blinding: 2222n,
    input_amount: inputCommitmentPreimage.input_amount,
    input_blinding: inputCommitmentPreimage.input_blinding,
    input_commitment: computeVantaPrivatePoolV2SendInputCommitment(
      inputCommitmentPreimage,
    ),
    input_derivation_tag: inputCommitmentPreimage.input_derivation_tag,
    input_leaf_index: 42n,
    membership_path: [],
    membership_path_direction_bits: [],
    owner_commitment: ownerCommitment,
    owner_secret: ownerSecret,
    relayer_fee: relayerFee,
    recipient_amount: recipientAmount,
    recipient_leaf_index: 43n,
    recipient_memo_ciphertext_body_hash_field: BigInt(
      deriveVantaPrivatePoolV2MemoCiphertextBodyHashField(
        memoCiphertextBodyHashes.recipientMemoCiphertextBodyHash,
        "recipient memo ciphertext body hash",
      ),
    ),
    recipient_owner_commitment: recipientOutputPreimage.owner_commitment,
    recipient_output_blinding: recipientOutputPreimage.output_blinding,
    recipient_output_commitment: computeVantaPrivatePoolV2SendOutputCommitment(
      recipientOutputPreimage,
    ),
    recipient_output_derivation_tag: recipientOutputPreimage.output_derivation_tag,
    request_version: 1702n,
    send_context_tag: 6606n,
    valid_until_slot: 1000300n,
  };
  const economicsWitness = {
    ...witnessBase,
    economics_commitment: computeVantaPrivatePoolV2SendEconomicsCommitment(witnessBase),
  };
  const inputTree = buildVantaPrivatePoolV2SparseMerkleTree({
    leaves: [
      {
        leafIndex: economicsWitness.input_leaf_index,
        leafValue: economicsWitness.input_commitment,
      },
    ],
  });
  const recipientTree = buildVantaPrivatePoolV2SparseMerkleTree({
    leaves: [
      {
        leafIndex: economicsWitness.input_leaf_index,
        leafValue: economicsWitness.input_commitment,
      },
      {
        leafIndex: economicsWitness.recipient_leaf_index,
        leafValue: economicsWitness.recipient_output_commitment,
      },
    ],
  });
  const changeTree = buildVantaPrivatePoolV2SparseMerkleTree({
    leaves: [
      {
        leafIndex: economicsWitness.input_leaf_index,
        leafValue: economicsWitness.input_commitment,
      },
      {
        leafIndex: economicsWitness.recipient_leaf_index,
        leafValue: economicsWitness.recipient_output_commitment,
      },
      {
        leafIndex: economicsWitness.change_leaf_index,
        leafValue: economicsWitness.change_output_commitment,
      },
    ],
  });
  const witnessWithRoots = {
    ...economicsWitness,
    change_append_path: recipientTree.pathForLeaf(economicsWitness.change_leaf_index),
    change_append_path_direction_bits: directionBitsForLeafIndex(
      economicsWitness.change_leaf_index,
    ),
    change_output_root: changeTree.root,
    input_root: inputTree.root,
    membership_path: inputTree.pathForLeaf(economicsWitness.input_leaf_index),
    membership_path_direction_bits: directionBitsForLeafIndex(
      economicsWitness.input_leaf_index,
    ),
    recipient_append_path: inputTree.pathForLeaf(economicsWitness.recipient_leaf_index),
    recipient_append_path_direction_bits: directionBitsForLeafIndex(
      economicsWitness.recipient_leaf_index,
    ),
    recipient_output_root: recipientTree.root,
  };
  const witness = {
    ...witnessWithRoots,
    nullifier: computeVantaPrivatePoolV2SendNullifier(witnessWithRoots),
  };
  const witnessJson = toWitnessJson(witness, memoCiphertextBodyHashes);
  const duplicateOutputAmount = (witness.input_amount - witness.relayer_fee) / 2n;
  const duplicateOutputPreimage = {
    asset_id_commitment: witness.asset_id_commitment,
    output_amount: duplicateOutputAmount,
    output_blinding: 9901n,
    output_derivation_tag: 9902n,
    owner_commitment: witness.owner_commitment,
  };
  const duplicateOutputCommitment = computeVantaPrivatePoolV2SendOutputCommitment(
    duplicateOutputPreimage,
  );
  const duplicateEconomicsWitness = {
    ...witness,
    change_amount: duplicateOutputAmount,
    change_output_blinding: duplicateOutputPreimage.output_blinding,
    change_output_commitment: duplicateOutputCommitment,
    change_output_derivation_tag: duplicateOutputPreimage.output_derivation_tag,
    recipient_amount: duplicateOutputAmount,
    recipient_owner_commitment: duplicateOutputPreimage.owner_commitment,
    recipient_output_blinding: duplicateOutputPreimage.output_blinding,
    recipient_output_commitment: duplicateOutputCommitment,
    recipient_output_derivation_tag: duplicateOutputPreimage.output_derivation_tag,
  };
  const duplicateWithEconomics = {
    ...duplicateEconomicsWitness,
    economics_commitment: computeVantaPrivatePoolV2SendEconomicsCommitment(
      duplicateEconomicsWitness,
    ),
  };
  const duplicateRecipientTree = buildVantaPrivatePoolV2SparseMerkleTree({
    leaves: [
      {
        leafIndex: duplicateWithEconomics.input_leaf_index,
        leafValue: duplicateWithEconomics.input_commitment,
      },
      {
        leafIndex: duplicateWithEconomics.recipient_leaf_index,
        leafValue: duplicateWithEconomics.recipient_output_commitment,
      },
    ],
  });
  const duplicateChangeOutputTree = buildVantaPrivatePoolV2SparseMerkleTree({
    leaves: [
      {
        leafIndex: duplicateWithEconomics.input_leaf_index,
        leafValue: duplicateWithEconomics.input_commitment,
      },
      {
        leafIndex: duplicateWithEconomics.recipient_leaf_index,
        leafValue: duplicateWithEconomics.recipient_output_commitment,
      },
      {
        leafIndex: duplicateWithEconomics.change_leaf_index,
        leafValue: duplicateWithEconomics.change_output_commitment,
      },
    ],
  });
  const duplicateWithRoots = {
    ...duplicateWithEconomics,
    change_append_path: duplicateRecipientTree.pathForLeaf(
      duplicateWithEconomics.change_leaf_index,
    ),
    change_append_path_direction_bits: directionBitsForLeafIndex(
      duplicateWithEconomics.change_leaf_index,
    ),
    change_output_root: duplicateChangeOutputTree.root,
    recipient_output_root: duplicateRecipientTree.root,
  };
  const duplicateOutputWitnessJson = toWitnessJson(
    {
      ...duplicateWithRoots,
      nullifier: computeVantaPrivatePoolV2SendNullifier(duplicateWithRoots),
    },
    memoCiphertextBodyHashes,
  );
  const fixture = createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput(witnessJson);
  const defaultFixture = createVantaPrivatePoolV2SendCircuitFixture({ mode: "valid" });

  assert(
    fixture.sendPublicInputHash !== defaultFixture.sendPublicInputHash,
    "Custom Send witness must not reuse the default fixture public-input hash.",
  );
  assert(
    fixture.proofRequest.circuitPublicInputs?.[0] ===
      `send-public-input-hash:${fixture.sendPublicInputHash.toString(10)}`,
    "Custom Send witness proof request must bind the derived circuit public input.",
  );
  assert(
    fixture.proofRequest.publicInputs.includes(
      `valid-until-slot:${witness.valid_until_slot.toString(10)}`,
    ),
    "Custom Send witness proof request must expose the bound valid-until slot.",
  );
  console.log("private-pool-v2 Send witness input builder: PASS");

  expectThrow(
    () =>
      createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        input_commitment: `0${witnessJson.input_commitment}`,
      }),
    "canonical decimal",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput({
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
      createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        owner_secret: (BigInt(witnessJson.owner_secret) + 1n).toString(10),
      }),
    "owner_commitment",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        input_blinding: (BigInt(witnessJson.input_blinding) + 1n).toString(10),
      }),
    "input_commitment",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        membership_path: witnessJson.membership_path.slice(1),
      }),
    "must contain 20",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        recipient_leaf_index: (BigInt(witnessJson.recipient_leaf_index) + 1n).toString(10),
      }),
    "recipient_leaf_index",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        change_amount: (BigInt(witnessJson.change_amount) + 1n).toString(10),
      }),
    "amount conservation",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        recipient_memo_ciphertext_body_hash: `sha256:${"55".repeat(32)}`,
      }),
    "recipient memo ciphertext body hash field mismatch",
  );
  expectThrow(
    () => createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput(duplicateOutputWitnessJson),
    "unique",
  );
  expectThrow(
    () =>
      createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput({
        ...witnessJson,
        inputCommitment: witnessJson.input_commitment,
      }),
    "unexpected field inputCommitment",
  );
  console.log("private-pool-v2 Send witness input rejection matrix: PASS");

  let witnessProofTouchedCircuitFiles = false;
  try {
    writeFileSync(witnessJsonPath, `${JSON.stringify(witnessJson, null, 2)}\n`);
    witnessProofTouchedCircuitFiles = true;
    run("node", [
      "scripts/prove-vanta-private-pool-v2-circuit.mjs",
      "send",
      "--witness-json",
      witnessJsonPath,
    ]);

    const proofArtifact = readArtifact();
    assert(
      proofArtifact.proofBackend === "local-bb-derived-artifact",
      "Send witness-input proof artifact must use local-bb-derived-artifact.",
    );
    assert(
      normalizeFieldString(proofArtifact.publicInputs[0], "artifact public input") ===
        fixture.sendPublicInputHash.toString(10),
      "Send witness-input proof artifact must use the derived public-input hash.",
    );
    assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
      proofArtifact,
      "Send witness-input proof artifact",
    );

    const verifiedReceipt = await verifyVantaPrivatePoolV2SendProofArtifact({
      proofArtifact,
    });
    assert(verifiedReceipt.verified === true, "Send witness-input proof artifact must verify.");
    assert(
      normalizeFieldString(
        verifiedReceipt.verifiedPublicInputs.sendPublicInputHash,
        "verified receipt public input",
      ) === fixture.sendPublicInputHash.toString(10),
      "Send witness-input receipt must bind the derived send-public-input-hash.",
    );
    console.log("private-pool-v2 Send witness-input artifact verification: PASS");

    const defaultLocalProof = await createVantaPrivatePoolV2LocalProver().prove(
      fixture.proofRequest,
    );
    assert(defaultLocalProof.proofSystem === "mock", "Default local prover must stay mock.");
    assert(
      defaultLocalProof.proofBackend === "local-mock",
      "Default local prover must stay local-mock.",
    );

    const prover = createVantaPrivatePoolV2LocalBbFixtureProver({
      fixtureProofRequest: fixture.proofRequest,
      proofArtifact,
      target: "send",
    });
    const proof = await prover.prove(fixture.proofRequest);
    assert(
      proof.proofBackend === "local-bb-derived-artifact",
      "Send local adapter must preserve local-bb-derived-artifact.",
    );
    assert(proof.proofSystem === "noir-bb", "Send local adapter must preserve noir-bb.");
    assert(
      await prover.verify({ proof, request: fixture.proofRequest }),
      "Send local adapter must verify the derived witness proof result.",
    );
    await expectRejection(
      () =>
        prover.prove({
          ...fixture.proofRequest,
          circuitPublicInputs: [
            `send-public-input-hash:${defaultFixture.sendPublicInputHash.toString(10)}`,
          ],
        }),
      "artifact public input must match the request public input",
    );
    await expectRejection(
      () =>
        prover.prove({
          ...fixture.proofRequest,
          publicInputs: fixture.proofRequest.publicInputs.map((input) =>
            input.startsWith("send-context-tag:")
              ? `send-context-tag:${(BigInt(witnessJson.send_context_tag) + 1n).toString(10)}`
              : input,
          ),
        }),
      "request public inputs must match the fixture proof request",
    );
    console.log("private-pool-v2 Send derived local adapter guard: PASS");
  } finally {
    if (witnessProofTouchedCircuitFiles) {
      run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "send"]);
    }
  }

  const restoredArtifact = readArtifact();
  assert(
    restoredArtifact.proofBackend === "local-bb-fixture-artifact",
    "Default restore proof artifact must return to local-bb-fixture-artifact.",
  );
  assert(
    normalizeFieldString(restoredArtifact.publicInputs[0], "restored artifact public input") ===
      defaultFixture.sendPublicInputHash.toString(10),
    "Default restore proof artifact must return to the default fixture public input.",
  );
  assert(
    readFileSync(proverTomlPath, "utf8").includes(
      `send_public_input_hash = "${defaultFixture.sendPublicInputHash.toString(10)}"`,
    ),
    "Send Prover.toml must be restored to the default valid fixture.",
  );
  console.log("private-pool-v2 Send fixture restore after witness input: PASS");

  console.log("Vanta Private Pool v2 Send witness prover check: PASS");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

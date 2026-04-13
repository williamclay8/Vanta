import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { sha256 } from "@noble/hashes/sha2.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const canonicalCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_core_single_note_unshield");
const canonicalSendCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_core_single_note_send");

const nargoEnv = {
  ...process.env,
  PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
};

export async function proveAndVerifyVantaPrivateCoreUnshield(args) {
  const witnessPackage = normalizeVantaPrivateCoreWitnessPackage(args.witnessPackage);
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-core-operator-proof-"));
  const tempCircuitDir = join(tempRoot, "circuit");

  try {
    mkdirSync(tempCircuitDir, { recursive: true });
    cpSync(join(canonicalCircuitDir, "Nargo.toml"), join(tempCircuitDir, "Nargo.toml"));
    cpSync(join(canonicalCircuitDir, "src"), join(tempCircuitDir, "src"), { recursive: true });
    writeFileSync(
      join(tempCircuitDir, "Prover.toml"),
      `${serializeWitnessPackageToToml(witnessPackage)}\n`,
    );

    runNargo(["compile"], tempCircuitDir);
    runNargo(["execute"], tempCircuitDir);

    const compiledProgram = JSON.parse(
      readFileSync(
        join(tempCircuitDir, "target", "vanta_private_core_single_note_unshield.json"),
        "utf8",
      ),
    );
    const compressedWitness = readFileSync(
      join(tempCircuitDir, "target", "vanta_private_core_single_note_unshield.gz"),
    );

    const api = await Barretenberg.new({ threads: 1 });
    try {
      const backend = new UltraHonkBackend(compiledProgram.bytecode, api);
      const proofData = await backend.generateProof(compressedWitness);
      const verified = await backend.verifyProof(proofData);

      if (!verified) {
        throw new Error("Operator-side proof verification returned false.");
      }

      assertProofPublicInputsMatchWitnessPackage({
        expectedPublicInputs: extractExpectedProofPublicInputs(witnessPackage),
        proofPublicInputs: proofData.publicInputs,
      });

      return {
        backend: "barretenberg-ultrahonk",
        circuit: witnessPackage.circuit,
        proofVersion: witnessPackage.proofVersion,
        provingHashLane: witnessPackage.provingHashLane,
        proofByteLength: proofData.proof.length,
        proofFieldCount: Math.floor(proofData.proof.length / 32),
        publicInputCount: proofData.publicInputs.length,
        publicInputs: proofData.publicInputs,
        verifiedPublicInputs: decodeVerifiedProofPublicInputs(proofData.publicInputs),
        verified: true,
      };
    } finally {
      await api.destroy();
    }
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
}

export async function proveAndVerifyVantaPrivateCoreSend(args) {
  const witnessPackage = normalizeVantaPrivateCoreSendWitnessPackage(args.witnessPackage);
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-core-operator-send-proof-"));
  const tempCircuitDir = join(tempRoot, "circuit");

  try {
    mkdirSync(tempCircuitDir, { recursive: true });
    cpSync(join(canonicalSendCircuitDir, "Nargo.toml"), join(tempCircuitDir, "Nargo.toml"));
    cpSync(join(canonicalSendCircuitDir, "src"), join(tempCircuitDir, "src"), {
      recursive: true,
    });
    writeFileSync(
      join(tempCircuitDir, "Prover.toml"),
      `${serializeSendWitnessPackageToToml(witnessPackage)}\n`,
    );

    runNargo(["compile"], tempCircuitDir);
    runNargo(["execute"], tempCircuitDir);

    const compiledProgram = JSON.parse(
      readFileSync(
        join(tempCircuitDir, "target", "vanta_private_core_single_note_send.json"),
        "utf8",
      ),
    );
    const compressedWitness = readFileSync(
      join(tempCircuitDir, "target", "vanta_private_core_single_note_send.gz"),
    );

    const api = await Barretenberg.new({ threads: 1 });
    try {
      const backend = new UltraHonkBackend(compiledProgram.bytecode, api);
      const proofData = await backend.generateProof(compressedWitness);
      const verified = await backend.verifyProof(proofData);

      if (!verified) {
        throw new Error("Operator-side send proof verification returned false.");
      }

      assertSendProofPublicInputsMatchWitnessPackage({
        expectedPublicInputs: extractExpectedSendProofPublicInputs(witnessPackage),
        proofPublicInputs: proofData.publicInputs,
      });

      return {
        backend: "barretenberg-ultrahonk",
        circuit: witnessPackage.circuit,
        proofVersion: witnessPackage.proofVersion,
        provingHashLane: witnessPackage.provingHashLane,
        proofByteLength: proofData.proof.length,
        proofFieldCount: Math.floor(proofData.proof.length / 32),
        publicInputCount: proofData.publicInputs.length,
        publicInputs: proofData.publicInputs,
        verifiedPublicInputs: decodeVerifiedSendProofPublicInputs(proofData.publicInputs),
        verified: true,
      };
    } finally {
      await api.destroy();
    }
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
}

function runNargo(args, cwd) {
  return execFileSync("nargo", args, {
    cwd,
    env: nargoEnv,
    stdio: "pipe",
    encoding: "utf8",
  });
}

export function normalizeVantaPrivateCoreWitnessPackage(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Expected a private-core witness package object.");
  }

  const witnessPackage = input;

  if (witnessPackage.circuit !== "vanta_private_core_single_note_unshield") {
    throw new Error("Unsupported private-core proof circuit.");
  }

  if (!witnessPackage.publicInputs || !witnessPackage.privateWitness) {
    throw new Error("Private-core witness package is missing required sections.");
  }

  assertWitnessPackagePublicInputConsistency(witnessPackage);

  return witnessPackage;
}

export function normalizeVantaPrivateCoreSendWitnessPackage(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Expected a private-core send witness package object.");
  }

  const witnessPackage = input;

  if (witnessPackage.circuit !== "vanta_private_core_single_note_send") {
    throw new Error("Unsupported private-core send proof circuit.");
  }

  if (!witnessPackage.publicInputs || !witnessPackage.privateWitness) {
    throw new Error("Private-core send witness package is missing required sections.");
  }

  assertSendWitnessPackagePublicInputConsistency(witnessPackage);

  return witnessPackage;
}

export function assertVantaPrivateCoreSourceArtifactConsistency(sourceArtifacts, witnessPackage) {
  if (!sourceArtifacts || typeof sourceArtifacts !== "object") {
    throw new Error("Private-core source artifacts are required.");
  }

  if (typeof sourceArtifacts.noteCommitment !== "string") {
    throw new Error("Private-core source artifacts are missing a note commitment.");
  }

  if (typeof sourceArtifacts.merkleLeaf !== "string") {
    throw new Error("Private-core source artifacts are missing a Merkle leaf.");
  }

  if (typeof sourceArtifacts.witnessRoot !== "string") {
    throw new Error("Private-core source artifacts are missing a witness root.");
  }

  const expectedNoteCommitment = deriveSourceNoteCommitmentFromWitnessPackage(witnessPackage);
  const expectedMerkleLeaf = deriveSourceMerkleLeaf(expectedNoteCommitment);
  const expectedWitnessRoot = normalizeHex32(witnessPackage.sourcePublicInputs.stateRoot);

  if (normalizeHex32(sourceArtifacts.noteCommitment) !== expectedNoteCommitment) {
    throw new Error("Private-core source artifacts have a mismatched note commitment.");
  }

  if (normalizeHex32(sourceArtifacts.merkleLeaf) !== expectedMerkleLeaf) {
    throw new Error("Private-core source artifacts have a mismatched Merkle leaf.");
  }

  if (normalizeHex32(sourceArtifacts.witnessRoot) !== expectedWitnessRoot) {
    throw new Error("Private-core source artifacts have a mismatched witness root.");
  }
}

function serializeWitnessPackageToToml(witnessPackage) {
  const publicInputs = witnessPackage.publicInputs;
  const privateWitness = witnessPackage.privateWitness;

  return [
    `state_root = "${publicInputs.state_root}"`,
    `nullifier = "${publicInputs.nullifier}"`,
    `release_destination_hi = "${publicInputs.release_destination_hi}"`,
    `release_destination_lo = "${publicInputs.release_destination_lo}"`,
    `asset_id_hi = "${publicInputs.asset_id_hi}"`,
    `asset_id_lo = "${publicInputs.asset_id_lo}"`,
    `amount_lo = "${publicInputs.amount_lo}"`,
    `amount_hi = "${publicInputs.amount_hi}"`,
    `note_version = "${publicInputs.note_version}"`,
    `consume_context_tag_hi = "${publicInputs.consume_context_tag_hi ?? "0"}"`,
    `consume_context_tag_lo = "${publicInputs.consume_context_tag_lo ?? "0"}"`,
    `note_type_code = "${privateWitness.note_type_code}"`,
    `owner_public_key_hi = "${privateWitness.owner_public_key_hi}"`,
    `owner_public_key_lo = "${privateWitness.owner_public_key_lo}"`,
    `owner_secret_key_hi = "${privateWitness.owner_secret_key_hi}"`,
    `owner_secret_key_lo = "${privateWitness.owner_secret_key_lo}"`,
    `note_nonce_hi = "${privateWitness.note_nonce_hi}"`,
    `note_nonce_lo = "${privateWitness.note_nonce_lo}"`,
    `note_secret_hi = "${privateWitness.note_secret_hi}"`,
    `note_secret_lo = "${privateWitness.note_secret_lo}"`,
    `blinding_hi = "${privateWitness.blinding_hi}"`,
    `blinding_lo = "${privateWitness.blinding_lo}"`,
    `derivation_tag_hi = "${privateWitness.derivation_tag_hi}"`,
    `derivation_tag_lo = "${privateWitness.derivation_tag_lo}"`,
    `leaf_index = "${privateWitness.leaf_index}"`,
    `membership_path_hi = ${serializeTomlArray(privateWitness.membership_path_hi)}`,
    `membership_path_lo = ${serializeTomlArray(privateWitness.membership_path_lo)}`,
    `membership_path_direction_bits = ${serializeTomlArray(privateWitness.membership_path_direction_bits)}`,
  ].join("\n");
}

function serializeSendWitnessPackageToToml(witnessPackage) {
  const publicInputs = witnessPackage.publicInputs;
  const privateWitness = witnessPackage.privateWitness;

  return [
    `state_root = "${publicInputs.state_root}"`,
    `input_nullifier = "${publicInputs.input_nullifier}"`,
    `recipient_commitment = "${publicInputs.recipient_commitment}"`,
    `change_commitment = "${publicInputs.change_commitment}"`,
    `asset_id_hi = "${publicInputs.asset_id_hi}"`,
    `asset_id_lo = "${publicInputs.asset_id_lo}"`,
    `send_amount_lo = "${publicInputs.send_amount_lo}"`,
    `send_amount_hi = "${publicInputs.send_amount_hi}"`,
    `change_amount_lo = "${publicInputs.change_amount_lo}"`,
    `change_amount_hi = "${publicInputs.change_amount_hi}"`,
    `note_version = "${publicInputs.note_version}"`,
    `send_context_tag_hi = "${publicInputs.send_context_tag_hi ?? "0"}"`,
    `send_context_tag_lo = "${publicInputs.send_context_tag_lo ?? "0"}"`,
    `input_note_type_code = "${privateWitness.input_note_type_code}"`,
    `sender_public_key_hi = "${privateWitness.sender_public_key_hi}"`,
    `sender_public_key_lo = "${privateWitness.sender_public_key_lo}"`,
    `sender_secret_key_hi = "${privateWitness.sender_secret_key_hi}"`,
    `sender_secret_key_lo = "${privateWitness.sender_secret_key_lo}"`,
    `input_note_nonce_hi = "${privateWitness.input_note_nonce_hi}"`,
    `input_note_nonce_lo = "${privateWitness.input_note_nonce_lo}"`,
    `input_note_secret_hi = "${privateWitness.input_note_secret_hi}"`,
    `input_note_secret_lo = "${privateWitness.input_note_secret_lo}"`,
    `input_blinding_hi = "${privateWitness.input_blinding_hi}"`,
    `input_blinding_lo = "${privateWitness.input_blinding_lo}"`,
    `input_derivation_tag_hi = "${privateWitness.input_derivation_tag_hi}"`,
    `input_derivation_tag_lo = "${privateWitness.input_derivation_tag_lo}"`,
    `input_leaf_index = "${privateWitness.input_leaf_index}"`,
    `membership_path_hi = ${serializeTomlArray(privateWitness.membership_path_hi)}`,
    `membership_path_lo = ${serializeTomlArray(privateWitness.membership_path_lo)}`,
    `membership_path_direction_bits = ${serializeTomlArray(privateWitness.membership_path_direction_bits)}`,
    `recipient_note_type_code = "${privateWitness.recipient_note_type_code}"`,
    `recipient_owner_public_key_hi = "${privateWitness.recipient_owner_public_key_hi}"`,
    `recipient_owner_public_key_lo = "${privateWitness.recipient_owner_public_key_lo}"`,
    `recipient_note_nonce_hi = "${privateWitness.recipient_note_nonce_hi}"`,
    `recipient_note_nonce_lo = "${privateWitness.recipient_note_nonce_lo}"`,
    `recipient_note_secret_hi = "${privateWitness.recipient_note_secret_hi}"`,
    `recipient_note_secret_lo = "${privateWitness.recipient_note_secret_lo}"`,
    `recipient_blinding_hi = "${privateWitness.recipient_blinding_hi}"`,
    `recipient_blinding_lo = "${privateWitness.recipient_blinding_lo}"`,
    `recipient_derivation_tag_hi = "${privateWitness.recipient_derivation_tag_hi}"`,
    `recipient_derivation_tag_lo = "${privateWitness.recipient_derivation_tag_lo}"`,
    `change_note_type_code = "${privateWitness.change_note_type_code}"`,
    `change_owner_public_key_hi = "${privateWitness.change_owner_public_key_hi}"`,
    `change_owner_public_key_lo = "${privateWitness.change_owner_public_key_lo}"`,
    `change_note_nonce_hi = "${privateWitness.change_note_nonce_hi}"`,
    `change_note_nonce_lo = "${privateWitness.change_note_nonce_lo}"`,
    `change_note_secret_hi = "${privateWitness.change_note_secret_hi}"`,
    `change_note_secret_lo = "${privateWitness.change_note_secret_lo}"`,
    `change_blinding_hi = "${privateWitness.change_blinding_hi}"`,
    `change_blinding_lo = "${privateWitness.change_blinding_lo}"`,
    `change_derivation_tag_hi = "${privateWitness.change_derivation_tag_hi}"`,
    `change_derivation_tag_lo = "${privateWitness.change_derivation_tag_lo}"`,
  ].join("\n");
}

function serializeTomlArray(values) {
  if (!Array.isArray(values)) {
    throw new Error("Expected a witness-package array field.");
  }

  return `[${values.map((value) => `"${value}"`).join(", ")}]`;
}

function assertWitnessPackagePublicInputConsistency(witnessPackage) {
  const sourcePublicInputs = witnessPackage.sourcePublicInputs;
  const publicInputs = witnessPackage.publicInputs;

  if (!sourcePublicInputs || typeof sourcePublicInputs !== "object") {
    throw new Error("Private-core witness package is missing source public inputs.");
  }

  const decodedReleaseDestination = decodeBytes32FromTwoU128Be(
    publicInputs.release_destination_hi,
    publicInputs.release_destination_lo,
  );
  if (normalizeHex32(sourcePublicInputs.releaseDestination) !== decodedReleaseDestination) {
    throw new Error("Private-core witness package has mismatched release destination public inputs.");
  }

  const decodedAssetId = decodeBytes32FromTwoU128Be(
    publicInputs.asset_id_hi,
    publicInputs.asset_id_lo,
  );
  if (normalizeHex32(sourcePublicInputs.assetId) !== decodedAssetId) {
    throw new Error("Private-core witness package has mismatched asset public inputs.");
  }

  const decodedAmount = decodeU128FromTwoU64Le(publicInputs.amount_lo, publicInputs.amount_hi);
  if (String(sourcePublicInputs.amount) !== decodedAmount) {
    throw new Error("Private-core witness package has mismatched amount public inputs.");
  }

  if (String(sourcePublicInputs.noteVersion) !== String(publicInputs.note_version)) {
    throw new Error("Private-core witness package has mismatched note-version public inputs.");
  }
}

function assertSendWitnessPackagePublicInputConsistency(witnessPackage) {
  const sourcePublicInputs = witnessPackage.sourcePublicInputs;
  const publicInputs = witnessPackage.publicInputs;

  if (!sourcePublicInputs || typeof sourcePublicInputs !== "object") {
    throw new Error("Private-core send witness package is missing source public inputs.");
  }

  const decodedAssetId = decodeBytes32FromTwoU128Be(
    publicInputs.asset_id_hi,
    publicInputs.asset_id_lo,
  );
  if (normalizeHex32(sourcePublicInputs.assetId) !== decodedAssetId) {
    throw new Error("Private-core send witness package has mismatched asset public inputs.");
  }

  const decodedSendAmount = decodeU128FromTwoU64Le(
    publicInputs.send_amount_lo,
    publicInputs.send_amount_hi,
  );
  if (String(sourcePublicInputs.sendAmount) !== decodedSendAmount) {
    throw new Error("Private-core send witness package has mismatched send-amount public inputs.");
  }

  const decodedChangeAmount = decodeU128FromTwoU64Le(
    publicInputs.change_amount_lo,
    publicInputs.change_amount_hi,
  );
  if (String(sourcePublicInputs.changeAmount) !== decodedChangeAmount) {
    throw new Error("Private-core send witness package has mismatched change-amount public inputs.");
  }

  if (String(sourcePublicInputs.noteVersion) !== String(publicInputs.note_version)) {
    throw new Error("Private-core send witness package has mismatched note-version public inputs.");
  }
}

function extractExpectedProofPublicInputs(witnessPackage) {
  const publicInputs = witnessPackage.publicInputs;

  return [
    publicInputs.state_root,
    publicInputs.nullifier,
    publicInputs.release_destination_hi,
    publicInputs.release_destination_lo,
    publicInputs.asset_id_hi,
    publicInputs.asset_id_lo,
    publicInputs.amount_lo,
    publicInputs.amount_hi,
    publicInputs.note_version,
    publicInputs.consume_context_tag_hi ?? "0",
    publicInputs.consume_context_tag_lo ?? "0",
  ].map((value) => encodeFieldElement(String(value)));
}

function extractExpectedSendProofPublicInputs(witnessPackage) {
  const publicInputs = witnessPackage.publicInputs;

  return [
    publicInputs.state_root,
    publicInputs.input_nullifier,
    publicInputs.recipient_commitment,
    publicInputs.change_commitment,
    publicInputs.asset_id_hi,
    publicInputs.asset_id_lo,
    publicInputs.send_amount_lo,
    publicInputs.send_amount_hi,
    publicInputs.change_amount_lo,
    publicInputs.change_amount_hi,
    publicInputs.note_version,
    publicInputs.send_context_tag_hi ?? "0",
    publicInputs.send_context_tag_lo ?? "0",
  ].map((value) => encodeFieldElement(String(value)));
}

function assertProofPublicInputsMatchWitnessPackage(args) {
  if (!Array.isArray(args.proofPublicInputs)) {
    throw new Error("Operator-side proof output did not include a public input array.");
  }

  const normalizedProofPublicInputs = args.proofPublicInputs.map((value) => String(value));

  if (normalizedProofPublicInputs.length !== args.expectedPublicInputs.length) {
    throw new Error("Operator-side proof output returned an unexpected public input count.");
  }

  for (let index = 0; index < args.expectedPublicInputs.length; index += 1) {
    if (normalizedProofPublicInputs[index] !== args.expectedPublicInputs[index]) {
      throw new Error("Operator-side proof output did not match the expected witness public inputs.");
    }
  }
}

function assertSendProofPublicInputsMatchWitnessPackage(args) {
  if (!Array.isArray(args.proofPublicInputs)) {
    throw new Error("Operator-side send proof output did not include a public input array.");
  }

  const normalizedProofPublicInputs = args.proofPublicInputs.map((value) => String(value));

  if (normalizedProofPublicInputs.length !== args.expectedPublicInputs.length) {
    throw new Error("Operator-side send proof output returned an unexpected public input count.");
  }

  for (let index = 0; index < args.expectedPublicInputs.length; index += 1) {
    if (normalizedProofPublicInputs[index] !== args.expectedPublicInputs[index]) {
      throw new Error("Operator-side send proof output did not match the expected witness public inputs.");
    }
  }
}

function encodeFieldElement(value) {
  const normalized = BigInt(value);
  return `0x${normalized.toString(16).padStart(64, "0")}`;
}

function decodeVerifiedProofPublicInputs(publicInputs) {
  if (!Array.isArray(publicInputs) || publicInputs.length !== 11) {
    throw new Error("Operator-side proof output returned an unexpected public input shape.");
  }

  return {
    provingStateRoot: normalizeHex32(publicInputs[0]),
    provingNullifier: normalizeHex32(publicInputs[1]),
    releaseDestination: decodeBytes32FromTwoFieldHexBe(publicInputs[2], publicInputs[3]),
    assetId: decodeBytes32FromTwoFieldHexBe(publicInputs[4], publicInputs[5]),
    amount: decodeU128FromTwoU64Le(publicInputs[6], publicInputs[7]),
    noteVersion: Number(BigInt(publicInputs[8])),
    provingConsumeContextTag: normalizeHex32(publicInputs[10]),
  };
}

function decodeVerifiedSendProofPublicInputs(publicInputs) {
  if (!Array.isArray(publicInputs) || publicInputs.length !== 13) {
    throw new Error("Operator-side send proof output returned an unexpected public input shape.");
  }

  return {
    provingStateRoot: normalizeHex32(publicInputs[0]),
    provingInputNullifier: normalizeHex32(publicInputs[1]),
    provingRecipientCommitment: normalizeHex32(publicInputs[2]),
    provingChangeCommitment: normalizeHex32(publicInputs[3]),
    assetId: decodeBytes32FromTwoFieldHexBe(publicInputs[4], publicInputs[5]),
    sendAmount: decodeU128FromTwoU64Le(publicInputs[6], publicInputs[7]),
    changeAmount: decodeU128FromTwoU64Le(publicInputs[8], publicInputs[9]),
    noteVersion: Number(BigInt(publicInputs[10])),
    provingSendContextTag: normalizeHex32(publicInputs[12]),
  };
}

function decodeBytes32FromTwoFieldHexBe(hi, lo) {
  const hiHex = BigInt(hi).toString(16).padStart(32, "0");
  const loHex = BigInt(lo).toString(16).padStart(32, "0");
  return normalizeHex32(`0x${hiHex}${loHex}`);
}

function deriveSourceNoteCommitmentFromWitnessPackage(witnessPackage) {
  const sourcePublicInputs = witnessPackage.sourcePublicInputs;
  const publicInputs = witnessPackage.publicInputs;
  const privateWitness = witnessPackage.privateWitness;

  const encodedNote = concatBytes(
    encodeDomain("vanta.private-core.note.v0"),
    encodeU8(Number(publicInputs.note_version)),
    encodeU8(Number(privateWitness.note_type_code)),
    hexToBytes(normalizeHex32(sourcePublicInputs.assetId)),
    encodeU128(BigInt(String(sourcePublicInputs.amount))),
    hexToBytes(
      decodeBytes32FromTwoU128Be(
        privateWitness.owner_public_key_hi,
        privateWitness.owner_public_key_lo,
      ),
    ),
    hexToBytes(decodeBytes32FromTwoU128Be(privateWitness.note_nonce_hi, privateWitness.note_nonce_lo)),
    hexToBytes(decodeBytes32FromTwoU128Be(privateWitness.note_secret_hi, privateWitness.note_secret_lo)),
    hexToBytes(decodeBytes32FromTwoU128Be(privateWitness.blinding_hi, privateWitness.blinding_lo)),
    hexToBytes(
      decodeBytes32FromTwoU128Be(privateWitness.derivation_tag_hi, privateWitness.derivation_tag_lo),
    ),
  );

  return normalizeHex32(
    `0x${Buffer.from(
      sha256(concatBytes(encodeDomain("vanta.private-core.note-commitment.v0"), encodedNote)),
    ).toString("hex")}`,
  );
}

function deriveSourceMerkleLeaf(noteCommitment) {
  return normalizeHex32(
    `0x${Buffer.from(
      sha256(concatBytes(encodeDomain("vanta.private-core.merkle-leaf.v0"), hexToBytes(noteCommitment))),
    ).toString("hex")}`,
  );
}

function decodeBytes32FromTwoU128Be(hi, lo) {
  const hiHex = BigInt(hi).toString(16).padStart(32, "0");
  const loHex = BigInt(lo).toString(16).padStart(32, "0");
  return normalizeHex32(`0x${hiHex}${loHex}`);
}

function decodeU128FromTwoU64Le(lo, hi) {
  const value = (BigInt(hi) << 64n) + BigInt(lo);
  return value.toString(10);
}

function normalizeHex32(value) {
  if (typeof value !== "string") {
    throw new Error("Expected a 32-byte hex string.");
  }

  const normalized = value.toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("Expected a normalized 32-byte hex string.");
  }

  return normalized;
}

function encodeDomain(value) {
  const bytes = new TextEncoder().encode(value);
  return concatBytes(encodeU32(bytes.length), bytes);
}

function encodeU8(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0 || normalized > 0xff) {
    throw new Error(`Expected an unsigned 8-bit integer, received ${String(value)}.`);
  }
  return Uint8Array.of(normalized);
}

function encodeU128(value) {
  const normalized = BigInt(value);
  if (normalized < 0n || normalized > (1n << 128n) - 1n) {
    throw new Error(`Expected an unsigned 128-bit integer, received ${String(value)}.`);
  }
  const output = new Uint8Array(16);
  let cursor = normalized;
  for (let index = 15; index >= 0; index -= 1) {
    output[index] = Number(cursor & 0xffn);
    cursor >>= 8n;
  }
  return output;
}

function encodeU32(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0 || normalized > 0xffffffff) {
    throw new Error(`Expected an unsigned 32-bit integer, received ${String(value)}.`);
  }
  const output = new Uint8Array(4);
  new DataView(output.buffer).setUint32(0, normalized, false);
  return output;
}

function hexToBytes(value) {
  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  return Uint8Array.from(Buffer.from(normalized, "hex"));
}

function concatBytes(...parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

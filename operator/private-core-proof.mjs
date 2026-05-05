import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { poseidon8 } from "poseidon-lite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const canonicalCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_core_single_note_unshield");
const canonicalSendCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_core_single_note_send");
const canonicalSwapCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_core_single_note_swap");

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
        proofHex: Buffer.from(proofData.proof).toString("hex"),
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

export async function verifyVantaPrivateCoreUnshieldProofArtifact(args) {
  const proofArtifact = normalizeVantaPrivateCoreUnshieldProofArtifact(args.proofArtifact);

  runNargo(["compile"], canonicalCircuitDir);
  const compiledProgram = JSON.parse(
    readFileSync(
      join(canonicalCircuitDir, "target", "vanta_private_core_single_note_unshield.json"),
      "utf8",
    ),
  );

  const api = await Barretenberg.new({ threads: 1 });
  try {
    const backend = new UltraHonkBackend(compiledProgram.bytecode, api);
    const proofData = {
      proof: Buffer.from(proofArtifact.proofHex, "hex"),
      publicInputs: proofArtifact.publicInputs,
    };
    const verified = await backend.verifyProof(proofData);

    if (!verified) {
      throw new Error("Private-core proof artifact verification returned false.");
    }

    assertProofPublicInputsMatchWitnessPackage({
      expectedPublicInputs: extractExpectedProofPublicInputs({
        publicInputs: proofArtifact.circuitPublicInputs,
      }),
      proofPublicInputs: proofArtifact.publicInputs,
    });

    return {
      backend: proofArtifact.backend,
      circuit: proofArtifact.circuit,
      proofVersion: proofArtifact.proofVersion,
      provingHashLane: proofArtifact.provingHashLane,
      proofByteLength: proofData.proof.length,
      proofFieldCount: Math.floor(proofData.proof.length / 32),
      proofHex: proofArtifact.proofHex,
      publicInputCount: proofArtifact.publicInputs.length,
      publicInputs: proofArtifact.publicInputs,
      verifiedPublicInputs: decodeVerifiedProofPublicInputs(proofArtifact.publicInputs),
      verified: true,
    };
  } finally {
    await api.destroy();
  }
}

export async function verifyVantaPrivateCoreSendProofArtifact(args) {
  const proofArtifact = normalizeVantaPrivateCoreSendProofArtifact(args.proofArtifact);

  runNargo(["compile"], canonicalSendCircuitDir);
  const compiledProgram = JSON.parse(
    readFileSync(
      join(canonicalSendCircuitDir, "target", "vanta_private_core_single_note_send.json"),
      "utf8",
    ),
  );

  const api = await Barretenberg.new({ threads: 1 });
  try {
    const backend = new UltraHonkBackend(compiledProgram.bytecode, api);
    const proofData = {
      proof: Buffer.from(proofArtifact.proofHex, "hex"),
      publicInputs: proofArtifact.publicInputs,
    };
    const verified = await backend.verifyProof(proofData);

    if (!verified) {
      throw new Error("Private-core Send proof artifact verification returned false.");
    }

    assertSendProofPublicInputsMatchWitnessPackage({
      expectedPublicInputs: extractExpectedSendProofPublicInputs({
        publicInputs: proofArtifact.circuitPublicInputs,
      }),
      proofPublicInputs: proofArtifact.publicInputs,
    });

    return {
      backend: proofArtifact.backend,
      circuit: proofArtifact.circuit,
      proofVersion: proofArtifact.proofVersion,
      provingHashLane: proofArtifact.provingHashLane,
      proofByteLength: proofData.proof.length,
      proofFieldCount: Math.floor(proofData.proof.length / 32),
      proofHex: proofArtifact.proofHex,
      publicInputCount: proofArtifact.publicInputs.length,
      publicInputs: proofArtifact.publicInputs,
      verifiedPublicInputs: decodeVerifiedSendProofPublicInputs(proofArtifact.publicInputs),
      verified: true,
    };
  } finally {
    await api.destroy();
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
        proofHex: Buffer.from(proofData.proof).toString("hex"),
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

export async function proveAndVerifyVantaPrivateCoreSwap(args) {
  const witnessPackage = normalizeVantaPrivateCoreSwapWitnessPackage(args.witnessPackage);
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-core-operator-swap-proof-"));
  const tempCircuitDir = join(tempRoot, "circuit");

  try {
    mkdirSync(tempCircuitDir, { recursive: true });
    cpSync(join(canonicalSwapCircuitDir, "Nargo.toml"), join(tempCircuitDir, "Nargo.toml"));
    cpSync(join(canonicalSwapCircuitDir, "src"), join(tempCircuitDir, "src"), {
      recursive: true,
    });
    writeFileSync(
      join(tempCircuitDir, "Prover.toml"),
      `${serializeSwapWitnessPackageToToml(witnessPackage)}\n`,
    );

    runNargo(["compile"], tempCircuitDir);
    runNargo(["execute"], tempCircuitDir);

    const compiledProgram = JSON.parse(
      readFileSync(
        join(tempCircuitDir, "target", "vanta_private_core_single_note_swap.json"),
        "utf8",
      ),
    );
    const compressedWitness = readFileSync(
      join(tempCircuitDir, "target", "vanta_private_core_single_note_swap.gz"),
    );

    const api = await Barretenberg.new({ threads: 1 });
    try {
      const backend = new UltraHonkBackend(compiledProgram.bytecode, api);
      const proofData = await backend.generateProof(compressedWitness);
      const verified = await backend.verifyProof(proofData);

      if (!verified) {
        throw new Error("Operator-side swap proof verification returned false.");
      }

      assertSwapProofPublicInputsMatchWitnessPackage({
        expectedPublicInputs: extractExpectedSwapProofPublicInputs(witnessPackage),
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
        verifiedPublicInputs: decodeVerifiedSwapProofPublicInputs(proofData.publicInputs),
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

export function normalizeVantaPrivateCoreUnshieldProofArtifact(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Expected a private-core unshield proof artifact object.");
  }

  const proofArtifact = input;

  if (proofArtifact.circuit !== "vanta_private_core_single_note_unshield") {
    throw new Error("Unsupported private-core unshield proof artifact circuit.");
  }

  if (proofArtifact.backend !== "barretenberg-ultrahonk") {
    throw new Error("Unsupported private-core unshield proof artifact backend.");
  }

  if (proofArtifact.provingHashLane !== "poseidon-bn254-proving-lane-v0") {
    throw new Error("Unsupported private-core unshield proof artifact hash lane.");
  }

  if (!proofArtifact.sourcePublicInputs || typeof proofArtifact.sourcePublicInputs !== "object") {
    throw new Error("Private-core unshield proof artifact is missing source public inputs.");
  }

  if (!Array.isArray(proofArtifact.publicInputs)) {
    throw new Error("Private-core unshield proof artifact is missing ordered public inputs.");
  }

  if (!proofArtifact.circuitPublicInputs || typeof proofArtifact.circuitPublicInputs !== "object") {
    throw new Error("Private-core unshield proof artifact is missing circuit public inputs.");
  }

  if (!proofArtifact.sourceArtifacts || typeof proofArtifact.sourceArtifacts !== "object") {
    throw new Error("Private-core unshield proof artifact is missing source artifacts.");
  }

  if (
    typeof proofArtifact.proofHex !== "string" ||
    !/^[0-9a-f]+$/i.test(proofArtifact.proofHex) ||
    proofArtifact.proofHex.length % 2 !== 0
  ) {
    throw new Error("Private-core unshield proof artifact is missing canonical proof hex.");
  }

  const normalized = {
    backend: proofArtifact.backend,
    circuit: proofArtifact.circuit,
    circuitPublicInputs: proofArtifact.circuitPublicInputs,
    proofHex: proofArtifact.proofHex.toLowerCase(),
    proofVersion: Number(proofArtifact.proofVersion),
    provingHashLane: proofArtifact.provingHashLane,
    publicInputs: proofArtifact.publicInputs.map((value) => String(value)),
    sourceArtifacts: {
      noteCommitment: proofArtifact.sourceArtifacts.noteCommitment,
      merkleLeaf: proofArtifact.sourceArtifacts.merkleLeaf,
      witnessRoot: proofArtifact.sourceArtifacts.witnessRoot,
      nullifier: proofArtifact.sourceArtifacts.nullifier,
    },
    sourcePublicInputs: proofArtifact.sourcePublicInputs,
  };

  assertProofPublicInputsMatchWitnessPackage({
    expectedPublicInputs: extractExpectedProofPublicInputs({
      publicInputs: normalized.circuitPublicInputs,
    }),
    proofPublicInputs: normalized.publicInputs,
  });
  assertUnshieldProofArtifactSourcePublicInputConsistency(normalized);

  return normalized;
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

export function normalizeVantaPrivateCoreSendProofArtifact(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Expected a private-core Send proof artifact object.");
  }

  const proofArtifact = input;

  if (proofArtifact.circuit !== "vanta_private_core_single_note_send") {
    throw new Error("Unsupported private-core Send proof artifact circuit.");
  }

  if (proofArtifact.backend !== "barretenberg-ultrahonk") {
    throw new Error("Unsupported private-core Send proof artifact backend.");
  }

  if (proofArtifact.provingHashLane !== "poseidon-bn254-proving-lane-v0") {
    throw new Error("Unsupported private-core Send proof artifact hash lane.");
  }

  if (proofArtifact.privateWitness || proofArtifact.witnessPackage) {
    throw new Error("Private-core Send proof artifact must not include private witness material.");
  }

  if (proofArtifact.sourcePublicInputs) {
    throw new Error("Private-core Send proof artifact must not include raw source public inputs.");
  }

  if (!Array.isArray(proofArtifact.publicInputs)) {
    throw new Error("Private-core Send proof artifact is missing ordered public inputs.");
  }

  if (!proofArtifact.circuitPublicInputs || typeof proofArtifact.circuitPublicInputs !== "object") {
    throw new Error("Private-core Send proof artifact is missing circuit public inputs.");
  }

  if (
    typeof proofArtifact.proofHex !== "string" ||
    !/^[0-9a-f]+$/i.test(proofArtifact.proofHex) ||
    proofArtifact.proofHex.length % 2 !== 0
  ) {
    throw new Error("Private-core Send proof artifact is missing canonical proof hex.");
  }

  const normalized = {
    backend: proofArtifact.backend,
    circuit: proofArtifact.circuit,
    circuitPublicInputs: {
      state_root: String(proofArtifact.circuitPublicInputs.state_root),
      input_nullifier: String(proofArtifact.circuitPublicInputs.input_nullifier),
      recipient_commitment: String(proofArtifact.circuitPublicInputs.recipient_commitment),
      change_commitment: String(proofArtifact.circuitPublicInputs.change_commitment),
      send_economic_terms_hash: String(
        proofArtifact.circuitPublicInputs.send_economic_terms_hash,
      ),
      note_version: String(proofArtifact.circuitPublicInputs.note_version),
      send_context_tag_hi: String(proofArtifact.circuitPublicInputs.send_context_tag_hi ?? "0"),
      send_context_tag_lo: String(proofArtifact.circuitPublicInputs.send_context_tag_lo ?? "0"),
    },
    proofHex: proofArtifact.proofHex.toLowerCase(),
    proofVersion: Number(proofArtifact.proofVersion),
    provingHashLane: proofArtifact.provingHashLane,
    publicInputs: proofArtifact.publicInputs.map((value) => String(value)),
  };

  if (String(normalized.circuitPublicInputs.send_context_tag_hi) !== "0") {
    throw new Error("Private-core Send proof artifact context high public input must be zero.");
  }

  assertSendProofPublicInputsMatchWitnessPackage({
    expectedPublicInputs: extractExpectedSendProofPublicInputs({
      publicInputs: normalized.circuitPublicInputs,
    }),
    proofPublicInputs: normalized.publicInputs,
  });

  return normalized;
}

export function normalizeVantaPrivateCoreSwapWitnessPackage(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Expected a private-core swap witness package object.");
  }

  const witnessPackage = input;

  if (witnessPackage.circuit !== "vanta_private_core_single_note_swap") {
    throw new Error("Unsupported private-core swap proof circuit.");
  }

  if (!witnessPackage.publicInputs || !witnessPackage.privateWitness) {
    throw new Error("Private-core swap witness package is missing required sections.");
  }

  assertSwapWitnessPackagePublicInputConsistency(witnessPackage);

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

  if (typeof sourceArtifacts.nullifier !== "string") {
    throw new Error("Private-core source artifacts are missing a nullifier.");
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

  const expectedSourceNullifier = deriveSourceNullifierFromUnshieldWitnessPackage(witnessPackage);
  if (normalizeHex32(sourceArtifacts.nullifier) !== expectedSourceNullifier) {
    throw new Error("Private-core source artifacts have a mismatched source nullifier.");
  }
}

export function assertVantaPrivateCoreSourceArtifactShapeConsistency(
  sourceArtifacts,
  sourcePublicInputs,
  proofArtifact = null,
) {
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

  if (normalizeHex32(sourceArtifacts.witnessRoot) !== normalizeHex32(sourcePublicInputs.stateRoot)) {
    throw new Error("Private-core source artifacts have a mismatched witness root.");
  }

  if (normalizeHex32(sourceArtifacts.nullifier) !== normalizeHex32(sourcePublicInputs.nullifier)) {
    throw new Error("Private-core source artifacts have a mismatched source nullifier.");
  }

  if (!proofArtifact?.sourceArtifacts) {
    throw new Error("Private-core proof artifact is missing source artifacts.");
  }

  const artifactSourceArtifacts = proofArtifact.sourceArtifacts;
  if (
    normalizeHex32(sourceArtifacts.noteCommitment) !==
    normalizeHex32(artifactSourceArtifacts.noteCommitment)
  ) {
    throw new Error("Private-core source artifacts have a mismatched proof-artifact note commitment.");
  }

  if (normalizeHex32(sourceArtifacts.merkleLeaf) !== normalizeHex32(artifactSourceArtifacts.merkleLeaf)) {
    throw new Error("Private-core source artifacts have a mismatched proof-artifact Merkle leaf.");
  }

  if (
    normalizeHex32(sourceArtifacts.witnessRoot) !==
    normalizeHex32(artifactSourceArtifacts.witnessRoot)
  ) {
    throw new Error("Private-core source artifacts have a mismatched proof-artifact witness root.");
  }

  if (
    normalizeHex32(sourceArtifacts.nullifier) !==
    normalizeHex32(artifactSourceArtifacts.nullifier)
  ) {
    throw new Error("Private-core source artifacts have a mismatched proof-artifact source nullifier.");
  }
}

export function deriveVantaPrivateCoreSendInputArtifactsFromWitnessPackage(witnessPackage) {
  const normalizedWitnessPackage = normalizeVantaPrivateCoreSendWitnessPackage(witnessPackage);
  const sourcePublicInputs = normalizedWitnessPackage.sourcePublicInputs;
  const publicInputs = normalizedWitnessPackage.publicInputs;
  const privateWitness = normalizedWitnessPackage.privateWitness;
  const inputAmount = BigInt(String(sourcePublicInputs.sendAmount)) + BigInt(String(sourcePublicInputs.changeAmount));

  const encodedNote = concatBytes(
    encodeDomain("vanta.private-core.note.v0"),
    encodeU8(Number(publicInputs.note_version)),
    encodeU8(Number(privateWitness.input_note_type_code)),
    hexToBytes(normalizeHex32(sourcePublicInputs.assetId)),
    encodeU128(inputAmount),
    hexToBytes(
      decodeBytes32FromTwoU128Be(
        privateWitness.sender_public_key_hi,
        privateWitness.sender_public_key_lo,
      ),
    ),
    hexToBytes(
      decodeBytes32FromTwoU128Be(
        privateWitness.input_note_nonce_hi,
        privateWitness.input_note_nonce_lo,
      ),
    ),
    hexToBytes(
      decodeBytes32FromTwoU128Be(
        privateWitness.input_note_secret_hi,
        privateWitness.input_note_secret_lo,
      ),
    ),
    hexToBytes(decodeBytes32FromTwoU128Be(privateWitness.input_blinding_hi, privateWitness.input_blinding_lo)),
    hexToBytes(
      decodeBytes32FromTwoU128Be(
        privateWitness.input_derivation_tag_hi,
        privateWitness.input_derivation_tag_lo,
      ),
    ),
  );

  const noteCommitment = normalizeHex32(
    `0x${Buffer.from(
      sha256(concatBytes(encodeDomain("vanta.private-core.note-commitment.v0"), encodedNote)),
    ).toString("hex")}`,
  );
  const merkleLeaf = deriveSourceMerkleLeaf(noteCommitment);
  const witnessRoot = normalizeHex32(sourcePublicInputs.stateRoot);

  return {
    amount: inputAmount.toString(10),
    assetId: normalizeHex32(sourcePublicInputs.assetId),
    merkleLeaf,
    noteCommitment,
    witnessRoot,
  };
}

export function deriveVantaPrivateCoreSwapInputArtifactsFromWitnessPackage(witnessPackage) {
  const normalizedWitnessPackage = normalizeVantaPrivateCoreSwapWitnessPackage(witnessPackage);
  const sourcePublicInputs = normalizedWitnessPackage.sourcePublicInputs;
  const publicInputs = normalizedWitnessPackage.publicInputs;
  const privateWitness = normalizedWitnessPackage.privateWitness;

  const encodedNote = concatBytes(
    encodeDomain("vanta.private-core.note.v0"),
    encodeU8(Number(publicInputs.input_note_version)),
    encodeU8(Number(privateWitness.input_note_type_code)),
    hexToBytes(normalizeHex32(sourcePublicInputs.inputAssetId)),
    encodeU128(BigInt(String(sourcePublicInputs.inputAmount))),
    hexToBytes(
      decodeBytes32FromTwoU128Be(
        privateWitness.sender_public_key_hi,
        privateWitness.sender_public_key_lo,
      ),
    ),
    hexToBytes(
      decodeBytes32FromTwoU128Be(
        privateWitness.input_note_nonce_hi,
        privateWitness.input_note_nonce_lo,
      ),
    ),
    hexToBytes(
      decodeBytes32FromTwoU128Be(
        privateWitness.input_note_secret_hi,
        privateWitness.input_note_secret_lo,
      ),
    ),
    hexToBytes(
      decodeBytes32FromTwoU128Be(privateWitness.input_blinding_hi, privateWitness.input_blinding_lo),
    ),
    hexToBytes(
      decodeBytes32FromTwoU128Be(
        privateWitness.input_derivation_tag_hi,
        privateWitness.input_derivation_tag_lo,
      ),
    ),
  );

  const noteCommitment = normalizeHex32(
    `0x${Buffer.from(
      sha256(concatBytes(encodeDomain("vanta.private-core.note-commitment.v0"), encodedNote)),
    ).toString("hex")}`,
  );
  const merkleLeaf = deriveSourceMerkleLeaf(noteCommitment);
  const witnessRoot = normalizeHex32(sourcePublicInputs.stateRoot);

  return {
    amount: String(sourcePublicInputs.inputAmount),
    assetId: normalizeHex32(sourcePublicInputs.inputAssetId),
    merkleLeaf,
    noteCommitment,
    witnessRoot,
  };
}

function serializeWitnessPackageToToml(witnessPackage) {
  const publicInputs = witnessPackage.publicInputs;
  const privateWitness = witnessPackage.privateWitness;

  return [
    `state_root = "${publicInputs.state_root}"`,
    `nullifier = "${publicInputs.nullifier}"`,
    `unshield_economic_terms_hash = "${publicInputs.unshield_economic_terms_hash}"`,
    `note_version = "${publicInputs.note_version}"`,
    `consume_context_tag_hi = "${publicInputs.consume_context_tag_hi ?? "0"}"`,
    `consume_context_tag_lo = "${publicInputs.consume_context_tag_lo ?? "0"}"`,
    `release_destination_hi = "${privateWitness.release_destination_hi}"`,
    `release_destination_lo = "${privateWitness.release_destination_lo}"`,
    `asset_id_hi = "${privateWitness.asset_id_hi}"`,
    `asset_id_lo = "${privateWitness.asset_id_lo}"`,
    `amount_lo = "${privateWitness.amount_lo}"`,
    `amount_hi = "${privateWitness.amount_hi}"`,
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
    `send_economic_terms_hash = "${publicInputs.send_economic_terms_hash}"`,
    `note_version = "${publicInputs.note_version}"`,
    `send_context_tag_hi = "${publicInputs.send_context_tag_hi ?? "0"}"`,
    `send_context_tag_lo = "${publicInputs.send_context_tag_lo ?? "0"}"`,
    `asset_id_hi = "${privateWitness.asset_id_hi}"`,
    `asset_id_lo = "${privateWitness.asset_id_lo}"`,
    `send_amount_lo = "${privateWitness.send_amount_lo}"`,
    `send_amount_hi = "${privateWitness.send_amount_hi}"`,
    `change_amount_lo = "${privateWitness.change_amount_lo}"`,
    `change_amount_hi = "${privateWitness.change_amount_hi}"`,
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

function serializeSwapWitnessPackageToToml(witnessPackage) {
  const publicInputs = witnessPackage.publicInputs;
  const privateWitness = witnessPackage.privateWitness;

  return [
    `state_root = "${publicInputs.state_root}"`,
    `input_nullifier = "${publicInputs.input_nullifier}"`,
    `output_commitment = "${publicInputs.output_commitment}"`,
    `swap_economic_terms_hash = "${publicInputs.swap_economic_terms_hash}"`,
    `input_note_version = "${publicInputs.input_note_version}"`,
    `output_note_version = "${publicInputs.output_note_version}"`,
    `swap_context_tag_hi = "${publicInputs.swap_context_tag_hi ?? "0"}"`,
    `swap_context_tag_lo = "${publicInputs.swap_context_tag_lo ?? "0"}"`,
    `input_asset_id_hi = "${privateWitness.input_asset_id_hi}"`,
    `input_asset_id_lo = "${privateWitness.input_asset_id_lo}"`,
    `output_asset_id_hi = "${privateWitness.output_asset_id_hi}"`,
    `output_asset_id_lo = "${privateWitness.output_asset_id_lo}"`,
    `input_amount_lo = "${privateWitness.input_amount_lo}"`,
    `input_amount_hi = "${privateWitness.input_amount_hi}"`,
    `output_amount_lo = "${privateWitness.output_amount_lo}"`,
    `output_amount_hi = "${privateWitness.output_amount_hi}"`,
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
    `output_note_type_code = "${privateWitness.output_note_type_code}"`,
    `output_owner_public_key_hi = "${privateWitness.output_owner_public_key_hi}"`,
    `output_owner_public_key_lo = "${privateWitness.output_owner_public_key_lo}"`,
    `output_note_nonce_hi = "${privateWitness.output_note_nonce_hi}"`,
    `output_note_nonce_lo = "${privateWitness.output_note_nonce_lo}"`,
    `output_note_secret_hi = "${privateWitness.output_note_secret_hi}"`,
    `output_note_secret_lo = "${privateWitness.output_note_secret_lo}"`,
    `output_blinding_hi = "${privateWitness.output_blinding_hi}"`,
    `output_blinding_lo = "${privateWitness.output_blinding_lo}"`,
    `output_derivation_tag_hi = "${privateWitness.output_derivation_tag_hi}"`,
    `output_derivation_tag_lo = "${privateWitness.output_derivation_tag_lo}"`,
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
  const privateWitness = witnessPackage.privateWitness;
  const ownerPublicKey = decodeBytes32FromTwoU128Be(
    privateWitness.owner_public_key_hi,
    privateWitness.owner_public_key_lo,
  );
  const ownerSecretKey = decodeBytes32FromTwoU128Be(
    privateWitness.owner_secret_key_hi,
    privateWitness.owner_secret_key_lo,
  );
  const derivedOwnerPublicKey = deriveX25519PublicKey(ownerSecretKey);

  if (ownerPublicKey !== derivedOwnerPublicKey) {
    throw new Error("Private-core witness package owner secret does not derive the note owner public key.");
  }

  const decodedReleaseDestination = decodeBytes32FromTwoU128Be(
    privateWitness.release_destination_hi,
    privateWitness.release_destination_lo,
  );
  if (normalizeHex32(sourcePublicInputs.releaseDestination) !== decodedReleaseDestination) {
    throw new Error("Private-core witness package has mismatched private release destination inputs.");
  }

  const decodedAssetId = decodeBytes32FromTwoU128Be(
    privateWitness.asset_id_hi,
    privateWitness.asset_id_lo,
  );
  if (normalizeHex32(sourcePublicInputs.assetId) !== decodedAssetId) {
    throw new Error("Private-core witness package has mismatched private asset inputs.");
  }

  const decodedAmount = decodeU128FromTwoU64Le(privateWitness.amount_lo, privateWitness.amount_hi);
  if (String(sourcePublicInputs.amount) !== decodedAmount) {
    throw new Error("Private-core witness package has mismatched private amount inputs.");
  }

  const expectedEconomicTermsHash = poseidon8([
    BigInt(privateWitness.release_destination_hi),
    BigInt(privateWitness.release_destination_lo),
    BigInt(privateWitness.asset_id_hi),
    BigInt(privateWitness.asset_id_lo),
    BigInt(privateWitness.amount_lo),
    BigInt(privateWitness.amount_hi),
    BigInt(publicInputs.note_version),
    0n,
  ]).toString(10);
  if (String(publicInputs.unshield_economic_terms_hash) !== expectedEconomicTermsHash) {
    throw new Error("Private-core witness package has mismatched unshield economic-terms hash.");
  }

  if (String(sourcePublicInputs.noteVersion) !== String(publicInputs.note_version)) {
    throw new Error("Private-core witness package has mismatched note-version public inputs.");
  }

  const expectedSourceNullifier = deriveSourceNullifierFromUnshieldWitnessPackage(witnessPackage);
  if (normalizeHex32(sourcePublicInputs.nullifier) !== expectedSourceNullifier) {
    throw new Error("Private-core witness package has mismatched source nullifier.");
  }

  assertUnshieldSourcePublicInputsMatchCircuitPublicInputs({
    circuitPublicInputs: publicInputs,
    sourcePublicInputs,
  });
}

function assertUnshieldProofArtifactSourcePublicInputConsistency(proofArtifact) {
  assertUnshieldSourcePublicInputsMatchCircuitPublicInputs({
    circuitPublicInputs: proofArtifact.circuitPublicInputs,
    sourcePublicInputs: proofArtifact.sourcePublicInputs,
  });
  assertVantaPrivateCoreSourceArtifactShapeConsistency(
    proofArtifact.sourceArtifacts,
    proofArtifact.sourcePublicInputs,
    proofArtifact,
  );
}

function assertUnshieldSourcePublicInputsMatchCircuitPublicInputs(args) {
  const sourcePublicInputs = args.sourcePublicInputs;
  const circuitPublicInputs = args.circuitPublicInputs;

  if (!sourcePublicInputs || typeof sourcePublicInputs !== "object") {
    throw new Error("Private-core unshield source public inputs are missing.");
  }

  const releaseDestination = encodeHex32ToTwoU128Be(sourcePublicInputs.releaseDestination);
  const assetId = encodeHex32ToTwoU128Be(sourcePublicInputs.assetId);
  const amount = encodeU128ToTwoU64Le(BigInt(String(sourcePublicInputs.amount)));
  const noteVersion = String(sourcePublicInputs.noteVersion);
  const expectedEconomicTermsHash = poseidon8([
    BigInt(releaseDestination.hi),
    BigInt(releaseDestination.lo),
    BigInt(assetId.hi),
    BigInt(assetId.lo),
    BigInt(amount.lo),
    BigInt(amount.hi),
    BigInt(noteVersion),
    0n,
  ]).toString(10);

  if (String(circuitPublicInputs.unshield_economic_terms_hash) !== expectedEconomicTermsHash) {
    throw new Error("Private-core unshield source public inputs do not match the proof economic terms.");
  }

  if (String(circuitPublicInputs.note_version) !== noteVersion) {
    throw new Error("Private-core unshield source public inputs do not match the proof note version.");
  }

  const expectedConsumeContext = poseidon8([
    BigInt(releaseDestination.hi),
    BigInt(releaseDestination.lo),
    BigInt(assetId.hi),
    BigInt(assetId.lo),
    BigInt(amount.lo),
    BigInt(amount.hi),
    BigInt(noteVersion),
    BigInt(String(circuitPublicInputs.nullifier)),
  ]).toString(10);

  if (String(circuitPublicInputs.consume_context_tag_hi ?? "0") !== "0") {
    throw new Error("Private-core unshield consume context high public input must be zero.");
  }

  if (String(circuitPublicInputs.consume_context_tag_lo ?? "0") !== expectedConsumeContext) {
    throw new Error("Private-core unshield source public inputs do not match the proof consume context.");
  }

  if (
    sourcePublicInputs.consumeContextTag !== undefined &&
    normalizeHex32(sourcePublicInputs.consumeContextTag) !== fieldElementToHex32(expectedConsumeContext)
  ) {
    throw new Error("Private-core unshield source public inputs have a mismatched consume context tag.");
  }
}

function assertSendWitnessPackagePublicInputConsistency(witnessPackage) {
  const sourcePublicInputs = witnessPackage.sourcePublicInputs;
  const publicInputs = witnessPackage.publicInputs;
  const privateWitness = witnessPackage.privateWitness;

  if (!sourcePublicInputs || typeof sourcePublicInputs !== "object") {
    throw new Error("Private-core send witness package is missing source public inputs.");
  }

  const decodedAssetId = decodeBytes32FromTwoU128Be(
    privateWitness.asset_id_hi,
    privateWitness.asset_id_lo,
  );
  if (normalizeHex32(sourcePublicInputs.assetId) !== decodedAssetId) {
    throw new Error("Private-core send witness package has mismatched private asset inputs.");
  }

  const decodedSendAmount = decodeU128FromTwoU64Le(
    privateWitness.send_amount_lo,
    privateWitness.send_amount_hi,
  );
  if (String(sourcePublicInputs.sendAmount) !== decodedSendAmount) {
    throw new Error("Private-core send witness package has mismatched private send-amount inputs.");
  }

  const decodedChangeAmount = decodeU128FromTwoU64Le(
    privateWitness.change_amount_lo,
    privateWitness.change_amount_hi,
  );
  if (String(sourcePublicInputs.changeAmount) !== decodedChangeAmount) {
    throw new Error("Private-core send witness package has mismatched private change-amount inputs.");
  }

  const expectedEconomicTermsHash = poseidon8([
    BigInt(privateWitness.asset_id_hi),
    BigInt(privateWitness.asset_id_lo),
    BigInt(privateWitness.send_amount_lo),
    BigInt(privateWitness.send_amount_hi),
    BigInt(privateWitness.change_amount_lo),
    BigInt(privateWitness.change_amount_hi),
    BigInt(publicInputs.note_version),
    0n,
  ]).toString(10);
  if (String(publicInputs.send_economic_terms_hash) !== expectedEconomicTermsHash) {
    throw new Error("Private-core send witness package has mismatched economic-terms hash.");
  }

  if (String(sourcePublicInputs.noteVersion) !== String(publicInputs.note_version)) {
    throw new Error("Private-core send witness package has mismatched note-version public inputs.");
  }
}

function assertSwapWitnessPackagePublicInputConsistency(witnessPackage) {
  const sourcePublicInputs = witnessPackage.sourcePublicInputs;
  const publicInputs = witnessPackage.publicInputs;
  const privateWitness = witnessPackage.privateWitness;

  if (!sourcePublicInputs || typeof sourcePublicInputs !== "object") {
    throw new Error("Private-core swap witness package is missing source public inputs.");
  }

  const decodedInputAssetId = decodeBytes32FromTwoU128Be(
    privateWitness.input_asset_id_hi,
    privateWitness.input_asset_id_lo,
  );
  if (normalizeHex32(sourcePublicInputs.inputAssetId) !== decodedInputAssetId) {
    throw new Error("Private-core swap witness package has mismatched private input-asset inputs.");
  }

  const decodedOutputAssetId = decodeBytes32FromTwoU128Be(
    privateWitness.output_asset_id_hi,
    privateWitness.output_asset_id_lo,
  );
  if (normalizeHex32(sourcePublicInputs.outputAssetId) !== decodedOutputAssetId) {
    throw new Error("Private-core swap witness package has mismatched private output-asset inputs.");
  }

  const decodedInputAmount = decodeU128FromTwoU64Le(
    privateWitness.input_amount_lo,
    privateWitness.input_amount_hi,
  );
  if (String(sourcePublicInputs.inputAmount) !== decodedInputAmount) {
    throw new Error("Private-core swap witness package has mismatched private input-amount inputs.");
  }

  const decodedOutputAmount = decodeU128FromTwoU64Le(
    privateWitness.output_amount_lo,
    privateWitness.output_amount_hi,
  );
  if (String(sourcePublicInputs.outputAmount) !== decodedOutputAmount) {
    throw new Error("Private-core swap witness package has mismatched private output-amount inputs.");
  }

  const expectedEconomicTermsHash = poseidon8([
    BigInt(privateWitness.input_asset_id_hi),
    BigInt(privateWitness.input_asset_id_lo),
    BigInt(privateWitness.output_asset_id_hi),
    BigInt(privateWitness.output_asset_id_lo),
    BigInt(privateWitness.input_amount_lo),
    BigInt(privateWitness.input_amount_hi),
    BigInt(privateWitness.output_amount_lo),
    BigInt(privateWitness.output_amount_hi),
  ]).toString(10);
  if (String(publicInputs.swap_economic_terms_hash) !== expectedEconomicTermsHash) {
    throw new Error("Private-core swap witness package has mismatched economic-terms hash.");
  }

  if (String(sourcePublicInputs.inputNoteVersion) !== String(publicInputs.input_note_version)) {
    throw new Error("Private-core swap witness package has mismatched input-note-version public inputs.");
  }

  if (String(sourcePublicInputs.outputNoteVersion) !== String(publicInputs.output_note_version)) {
    throw new Error("Private-core swap witness package has mismatched output-note-version public inputs.");
  }
}

function extractExpectedProofPublicInputs(witnessPackage) {
  const publicInputs = witnessPackage.publicInputs;

  return [
    publicInputs.state_root,
    publicInputs.nullifier,
    publicInputs.unshield_economic_terms_hash,
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
    publicInputs.send_economic_terms_hash,
    publicInputs.note_version,
    publicInputs.send_context_tag_hi ?? "0",
    publicInputs.send_context_tag_lo ?? "0",
  ].map((value) => encodeFieldElement(String(value)));
}

function extractExpectedSwapProofPublicInputs(witnessPackage) {
  const publicInputs = witnessPackage.publicInputs;

  return [
    publicInputs.state_root,
    publicInputs.input_nullifier,
    publicInputs.output_commitment,
    publicInputs.swap_economic_terms_hash,
    publicInputs.input_note_version,
    publicInputs.output_note_version,
    publicInputs.swap_context_tag_hi ?? "0",
    publicInputs.swap_context_tag_lo ?? "0",
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

function assertSwapProofPublicInputsMatchWitnessPackage(args) {
  if (!Array.isArray(args.proofPublicInputs)) {
    throw new Error("Operator-side swap proof output did not include a public input array.");
  }

  const normalizedProofPublicInputs = args.proofPublicInputs.map((value) => String(value));

  if (normalizedProofPublicInputs.length !== args.expectedPublicInputs.length) {
    throw new Error("Operator-side swap proof output returned an unexpected public input count.");
  }

  for (let index = 0; index < args.expectedPublicInputs.length; index += 1) {
    if (normalizedProofPublicInputs[index] !== args.expectedPublicInputs[index]) {
      throw new Error("Operator-side swap proof output did not match the expected witness public inputs.");
    }
  }
}

function encodeFieldElement(value) {
  const normalized = BigInt(value);
  return `0x${normalized.toString(16).padStart(64, "0")}`;
}

function decodeVerifiedProofPublicInputs(publicInputs) {
  if (!Array.isArray(publicInputs) || publicInputs.length !== 6) {
    throw new Error("Operator-side proof output returned an unexpected public input shape.");
  }

  return {
    provingStateRoot: normalizeHex32(publicInputs[0]),
    provingNullifier: normalizeHex32(publicInputs[1]),
    unshieldEconomicTermsHash: normalizeHex32(publicInputs[2]),
    noteVersion: Number(BigInt(publicInputs[3])),
    provingConsumeContextTag: normalizeHex32(publicInputs[5]),
  };
}

function decodeVerifiedSendProofPublicInputs(publicInputs) {
  if (!Array.isArray(publicInputs) || publicInputs.length !== 8) {
    throw new Error("Operator-side send proof output returned an unexpected public input shape.");
  }

  return {
    provingStateRoot: normalizeHex32(publicInputs[0]),
    provingInputNullifier: normalizeHex32(publicInputs[1]),
    provingRecipientCommitment: normalizeHex32(publicInputs[2]),
    provingChangeCommitment: normalizeHex32(publicInputs[3]),
    sendEconomicTermsHash: normalizeHex32(publicInputs[4]),
    noteVersion: Number(BigInt(publicInputs[5])),
    provingSendContextTag: normalizeHex32(publicInputs[7]),
  };
}

function decodeVerifiedSwapProofPublicInputs(publicInputs) {
  if (!Array.isArray(publicInputs) || publicInputs.length !== 8) {
    throw new Error("Operator-side swap proof output returned an unexpected public input shape.");
  }

  return {
    provingStateRoot: normalizeHex32(publicInputs[0]),
    provingInputNullifier: normalizeHex32(publicInputs[1]),
    provingOutputCommitment: normalizeHex32(publicInputs[2]),
    swapEconomicTermsHash: normalizeHex32(publicInputs[3]),
    inputNoteVersion: Number(BigInt(publicInputs[4])),
    outputNoteVersion: Number(BigInt(publicInputs[5])),
    provingSwapContextTag: normalizeHex32(publicInputs[7]),
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

function deriveSourceNullifierFromUnshieldWitnessPackage(witnessPackage) {
  const privateWitness = witnessPackage.privateWitness;
  const noteCommitment = deriveSourceNoteCommitmentFromWitnessPackage(witnessPackage);
  const merkleLeaf = deriveSourceMerkleLeaf(noteCommitment);

  return normalizeHex32(
    `0x${Buffer.from(
      sha256(
        concatBytes(
          encodeDomain("vanta.private-core.nullifier.v0"),
          hexToBytes(decodeBytes32FromTwoU128Be(privateWitness.note_secret_hi, privateWitness.note_secret_lo)),
          hexToBytes(decodeBytes32FromTwoU128Be(privateWitness.note_nonce_hi, privateWitness.note_nonce_lo)),
          hexToBytes(noteCommitment),
          hexToBytes(normalizeHex32(witnessPackage.sourcePublicInputs.stateRoot)),
          hexToBytes(merkleLeaf),
        ),
      ),
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

function encodeHex32ToTwoU128Be(value) {
  const normalized = normalizeHex32(value).slice(2);
  return {
    hi: BigInt(`0x${normalized.slice(0, 32)}`).toString(10),
    lo: BigInt(`0x${normalized.slice(32, 64)}`).toString(10),
  };
}

function encodeU128ToTwoU64Le(value) {
  const normalized = BigInt(value);
  if (normalized < 0n || normalized > (1n << 128n) - 1n) {
    throw new Error(`Expected an unsigned 128-bit integer, received ${String(value)}.`);
  }
  return {
    lo: (normalized & ((1n << 64n) - 1n)).toString(10),
    hi: (normalized >> 64n).toString(10),
  };
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

function fieldElementToHex32(value) {
  const normalized = BigInt(value);
  if (normalized < 0n) {
    throw new Error("Expected a non-negative field element.");
  }
  return normalizeHex32(`0x${normalized.toString(16).padStart(64, "0")}`);
}

function deriveX25519PublicKey(secretKey) {
  return normalizeHex32(`0x${Buffer.from(x25519.getPublicKey(hexToBytes(secretKey))).toString("hex")}`);
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

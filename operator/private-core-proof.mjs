import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const canonicalCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_core_single_note_unshield");

const nargoEnv = {
  ...process.env,
  PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
};

export async function proveAndVerifyVantaPrivateCoreUnshield(args) {
  const witnessPackage = normalizeWitnessPackage(args.witnessPackage);
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

      return {
        backend: "barretenberg-ultrahonk",
        circuit: witnessPackage.circuit,
        proofVersion: witnessPackage.proofVersion,
        provingHashLane: witnessPackage.provingHashLane,
        proofByteLength: proofData.proof.length,
        proofFieldCount: Math.floor(proofData.proof.length / 32),
        publicInputCount: proofData.publicInputs.length,
        publicInputs: proofData.publicInputs,
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

function normalizeWitnessPackage(input) {
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

  return witnessPackage;
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

function serializeTomlArray(values) {
  if (!Array.isArray(values)) {
    throw new Error("Expected a witness-package array field.");
  }

  return `[${values.map((value) => `"${value}"`).join(", ")}]`;
}

import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const sendCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_send_entry");
const sendCircuitName = "vanta_private_pool_v2_send_entry";
const nargoEnv = {
  ...process.env,
  PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
};

const forbiddenNoWitnessNormalizedKeys = new Set([
  "bytecodesource",
  "notesecret",
  "privateinput",
  "privateinputs",
  "privatewitness",
  "provertoml",
  "secret",
  "secrets",
  "sourceartifact",
  "sourceartifacts",
  "sourcepublicinput",
  "sourcepublicinputs",
  "witness",
  "witnesspackage",
  "witnesssource",
]);
const forbiddenNoWitnessNormalizedFragments = [
  "notesecret",
  "privateinput",
  "privatewitness",
  "sourceartifact",
  "sourcepublicinput",
  "witness",
];
const forbiddenStringFragments = [
  "Prover.toml",
  "privateInputs",
  "private_inputs",
  "privateWitness",
  "noteSecret",
  "secret",
  "sourcePublicInputs",
  "sourceArtifacts",
  "witness",
  "witnessPackage",
  "vanta_private_pool_v2_send_entry.gz",
];

function normalizeVantaPrivatePoolV2NoWitnessKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function sha256Hex(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  return createHash("sha256").update(input).digest("hex");
}

export function createVantaPrivatePoolV2ProofArtifactPublicInputCommitment(publicInputs) {
  return `sha256:${sha256Hex(JSON.stringify(publicInputs))}`;
}

export function createVantaPrivatePoolV2ProofArtifactVerifyingKeyMetadata(
  compiledProgram,
  circuitName = sendCircuitName,
) {
  const acirBytecodeHash = `sha256:${sha256Hex(compiledProgram.bytecode)}`;
  const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
  const proofRuntimeVersion =
    packageJson.dependencies?.["@aztec/bb.js"] ??
    packageJson.devDependencies?.["@aztec/bb.js"] ??
    "unknown";
  return {
    acirBytecodeHash,
    proofRuntimePackage: "@aztec/bb.js",
    proofRuntimeVersion,
    verifyingKeyHash: acirBytecodeHash,
    verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk",
    verifyingKeyId: `local-acir-bytecode:${circuitName}:${acirBytecodeHash}`,
  };
}

export function assertVantaPrivatePoolV2SendProofArtifactHasNoWitnessMaterial(value) {
  function visit(node, path = []) {
    if (node === null || node === undefined) {
      return;
    }

    if (typeof node === "string") {
      const normalizedValue = normalizeVantaPrivatePoolV2NoWitnessKey(node);
      for (const fragment of forbiddenStringFragments) {
        if (
          node.includes(fragment) ||
          normalizedValue.includes(normalizeVantaPrivatePoolV2NoWitnessKey(fragment))
        ) {
          throw new Error(`Private Pool v2 Send proof artifact exposes forbidden no-witness value ${fragment}.`);
        }
      }
      return;
    }

    if (typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, [...path, String(index)]));
      return;
    }

    for (const [key, entry] of Object.entries(node)) {
      const normalizedKey = normalizeVantaPrivatePoolV2NoWitnessKey(key);
      if (
        forbiddenNoWitnessNormalizedKeys.has(normalizedKey) ||
        forbiddenNoWitnessNormalizedFragments.some((fragment) => normalizedKey.includes(fragment))
      ) {
        throw new Error(`Private Pool v2 Send proof artifact exposes forbidden no-witness field ${[...path, key].join(".")}.`);
      }
      visit(entry, [...path, key]);
    }
  }

  visit(value);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFieldString(value, label) {
  assert(
    typeof value === "string" && (/^\d+$/u.test(value) || /^0x[0-9a-f]+$/u.test(value)),
    `${label} must be a field string.`,
  );
}

export function normalizeVantaPrivatePoolV2SendProofArtifact(proofArtifact) {
  assert(proofArtifact && typeof proofArtifact === "object", "proofArtifact is required.");
  assertVantaPrivatePoolV2SendProofArtifactHasNoWitnessMaterial(proofArtifact);
  assert(proofArtifact.circuit === sendCircuitName, "Private Pool v2 Send proof artifact must name the Send circuit.");
  assert(proofArtifact.backend === "barretenberg-ultrahonk", "Private Pool v2 Send proof artifact must use barretenberg-ultrahonk.");
  assert(proofArtifact.proofSystem === "noir-bb", "Private Pool v2 Send proof artifact must use proofSystem noir-bb.");
  assert(
    proofArtifact.proofBackend === "local-bb-fixture-artifact",
    "Private Pool v2 Send proof artifact verification currently accepts only local-bb-fixture-artifact evidence.",
  );
  assert(
    typeof proofArtifact.proofHex === "string" &&
      proofArtifact.proofHex.length > 0 &&
      proofArtifact.proofHex.length % 2 === 0 &&
      /^[0-9a-f]+$/u.test(proofArtifact.proofHex),
    "Private Pool v2 Send proof artifact must carry lowercase hex proofHex.",
  );
  assert(Array.isArray(proofArtifact.publicInputs), "Private Pool v2 Send proof artifact must carry publicInputs.");
  assert(proofArtifact.publicInputs.length === 1, "Private Pool v2 Send proof artifact must expose exactly one public input.");
  assertFieldString(proofArtifact.publicInputs[0], "send-public-input-hash");
  assert(
    JSON.stringify(proofArtifact.publicInputLabels) === JSON.stringify(["send-public-input-hash"]),
    "Private Pool v2 Send proof artifact must label the public input as send-public-input-hash.",
  );
  assert(
    proofArtifact.publicInputCommitment ===
      createVantaPrivatePoolV2ProofArtifactPublicInputCommitment(proofArtifact.publicInputs),
    "Private Pool v2 Send proof artifact publicInputCommitment mismatch.",
  );
  assert(
    typeof proofArtifact.verifyingKeyHash === "string" &&
      proofArtifact.verifyingKeyHash.startsWith("sha256:"),
    "Private Pool v2 Send proof artifact must carry verifyingKeyHash.",
  );
  assert(
    typeof proofArtifact.verifyingKeyId === "string" &&
      proofArtifact.verifyingKeyId.includes(sendCircuitName),
    "Private Pool v2 Send proof artifact must carry verifyingKeyId.",
  );
  assert(
    typeof proofArtifact.acirBytecodeHash === "string" &&
      proofArtifact.acirBytecodeHash.startsWith("sha256:"),
    "Private Pool v2 Send proof artifact must carry acirBytecodeHash.",
  );
  assert(
    proofArtifact.verifyingKeyHashKind === "local-acir-bytecode-hash-not-production-vk",
    "Private Pool v2 Send proof artifact must label verifyingKeyHash as local ACIR bytecode metadata.",
  );
  assert(
    proofArtifact.proofRuntimePackage === "@aztec/bb.js",
    "Private Pool v2 Send proof artifact must name the proof runtime package.",
  );

  return {
    acirBytecodeHash: proofArtifact.acirBytecodeHash,
    backend: proofArtifact.backend,
    circuit: proofArtifact.circuit,
    proofBackend: proofArtifact.proofBackend,
    proofHex: proofArtifact.proofHex,
    proofSystem: proofArtifact.proofSystem,
    publicInputCommitment: proofArtifact.publicInputCommitment,
    publicInputLabels: proofArtifact.publicInputLabels,
    publicInputs: proofArtifact.publicInputs,
    verifyingKeyHash: proofArtifact.verifyingKeyHash,
    verifyingKeyHashKind: proofArtifact.verifyingKeyHashKind,
    verifyingKeyId: proofArtifact.verifyingKeyId,
    proofRuntimePackage: proofArtifact.proofRuntimePackage,
    proofRuntimeVersion: proofArtifact.proofRuntimeVersion,
  };
}

function runNargoCompile() {
  execFileSync("nargo", ["compile"], {
    cwd: sendCircuitDir,
    env: nargoEnv,
    stdio: "pipe",
  });
}

export async function verifyVantaPrivatePoolV2SendProofArtifact(args) {
  const proofArtifact = normalizeVantaPrivatePoolV2SendProofArtifact(args.proofArtifact);
  runNargoCompile();

  const compiledProgram = JSON.parse(
    readFileSync(resolve(sendCircuitDir, `target/${sendCircuitName}.json`), "utf8"),
  );
  const verifyingKeyMetadata = createVantaPrivatePoolV2ProofArtifactVerifyingKeyMetadata(
    compiledProgram,
    sendCircuitName,
  );
  assert(
    proofArtifact.verifyingKeyHash === verifyingKeyMetadata.verifyingKeyHash,
    "Private Pool v2 Send proof artifact verifyingKeyHash mismatch.",
  );
  assert(
    proofArtifact.acirBytecodeHash === verifyingKeyMetadata.acirBytecodeHash,
    "Private Pool v2 Send proof artifact acirBytecodeHash mismatch.",
  );
  assert(
    proofArtifact.verifyingKeyId === verifyingKeyMetadata.verifyingKeyId,
    "Private Pool v2 Send proof artifact verifyingKeyId mismatch.",
  );

  const api = await Barretenberg.new({ threads: 1 });
  try {
    const backend = new UltraHonkBackend(compiledProgram.bytecode, api);
    const proofData = {
      proof: Buffer.from(proofArtifact.proofHex, "hex"),
      publicInputs: proofArtifact.publicInputs,
    };
    let verified = false;
    try {
      verified = await backend.verifyProof(proofData);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Private Pool v2 Send proof artifact verification returned false: ${message}`);
    }

    if (!verified) {
      throw new Error("Private Pool v2 Send proof artifact verification returned false.");
    }

    return {
      acirBytecodeHash: proofArtifact.acirBytecodeHash,
      backend: proofArtifact.backend,
      circuit: proofArtifact.circuit,
      proofBackend: proofArtifact.proofBackend,
      proofByteLength: proofData.proof.length,
      proofFieldCount: Math.floor(proofData.proof.length / 32),
      proofHex: proofArtifact.proofHex,
      proofSystem: proofArtifact.proofSystem,
      publicInputCommitment: proofArtifact.publicInputCommitment,
      publicInputCount: proofArtifact.publicInputs.length,
      publicInputLabels: proofArtifact.publicInputLabels,
      publicInputs: proofArtifact.publicInputs,
      verified: true,
      verifiedPublicInputs: {
        sendPublicInputHash: proofArtifact.publicInputs[0],
      },
      verifyingKeyHash: proofArtifact.verifyingKeyHash,
      verifyingKeyHashKind: proofArtifact.verifyingKeyHashKind,
      verifyingKeyId: proofArtifact.verifyingKeyId,
      proofRuntimePackage: proofArtifact.proofRuntimePackage,
      proofRuntimeVersion: proofArtifact.proofRuntimeVersion,
    };
  } finally {
    await api.destroy();
  }
}

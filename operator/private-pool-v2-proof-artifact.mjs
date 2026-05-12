import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const shieldCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_shield_entry");
const shieldCircuitName = "vanta_private_pool_v2_shield_entry";
const claimCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_claim_entry");
const claimCircuitName = "vanta_private_pool_v2_claim_entry";
const sendCircuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_send_entry");
const sendCircuitName = "vanta_private_pool_v2_send_entry";
const swapToShieldedCircuitDir = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry",
);
const swapToShieldedCircuitName = "vanta_private_pool_v2_swap_to_shielded_entry";
const actualPrivateSpendCircuitDir = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry",
);
const actualPrivateSpendCircuitName = "vanta_private_pool_v2_actual_private_spend_entry";
const proofArtifactCircuitProfiles = {
  [shieldCircuitName]: {
    circuitDir: shieldCircuitDir,
    circuitName: shieldCircuitName,
    label: "Private Pool v2 Shield",
    publicInputLabels: ["shield-public-input-hash"],
    verifiedPublicInputKey: "shieldPublicInputHash",
  },
  [claimCircuitName]: {
    circuitDir: claimCircuitDir,
    circuitName: claimCircuitName,
    label: "Private Pool v2 Claim",
    publicInputLabels: ["claim-public-input-hash"],
    verifiedPublicInputKey: "claimPublicInputHash",
  },
  [sendCircuitName]: {
    circuitDir: sendCircuitDir,
    circuitName: sendCircuitName,
    label: "Private Pool v2 Send",
    publicInputLabels: ["send-public-input-hash"],
    verifiedPublicInputKey: "sendPublicInputHash",
  },
  [swapToShieldedCircuitName]: {
    circuitDir: swapToShieldedCircuitDir,
    circuitName: swapToShieldedCircuitName,
    label: "Private Pool v2 Swap-to-shielded",
    publicInputLabels: ["swap-public-input-hash"],
    verifiedPublicInputKey: "swapPublicInputHash",
  },
  [actualPrivateSpendCircuitName]: {
    circuitDir: actualPrivateSpendCircuitDir,
    circuitName: actualPrivateSpendCircuitName,
    label: "Private Pool v2 Actual Private Spend",
    publicInputLabels: ["private-spend-public-input-hash"],
    verifiedPublicInputKey: "privateSpendPublicInputHash",
  },
};
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
  "vanta_private_pool_v2_shield_entry.gz",
  "vanta_private_pool_v2_claim_entry.gz",
  "vanta_private_pool_v2_send_entry.gz",
  "vanta_private_pool_v2_swap_to_shielded_entry.gz",
  "vanta_private_pool_v2_actual_private_spend_entry.gz",
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

export function assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
  value,
  artifactLabel = "Private Pool v2 proof artifact",
) {
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
          throw new Error(`${artifactLabel} exposes forbidden no-witness value ${fragment}.`);
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
        throw new Error(`${artifactLabel} exposes forbidden no-witness field ${[...path, key].join(".")}.`);
      }
      visit(entry, [...path, key]);
    }
  }

  visit(value);
}

export function assertVantaPrivatePoolV2SendProofArtifactHasNoWitnessMaterial(value) {
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
    value,
    "Private Pool v2 Send proof artifact",
  );
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

function normalizeVantaPrivatePoolV2ProofArtifact(proofArtifact, profile) {
  assert(proofArtifact && typeof proofArtifact === "object", "proofArtifact is required.");
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
    proofArtifact,
    `${profile.label} proof artifact`,
  );
  assert(
    proofArtifact.circuit === profile.circuitName,
    `${profile.label} proof artifact must name the ${profile.circuitName} circuit.`,
  );
  assert(proofArtifact.backend === "barretenberg-ultrahonk", `${profile.label} proof artifact must use barretenberg-ultrahonk.`);
  assert(proofArtifact.proofSystem === "noir-bb", `${profile.label} proof artifact must use proofSystem noir-bb.`);
  assert(
    proofArtifact.proofBackend === "local-bb-fixture-artifact",
    `${profile.label} proof artifact verification currently accepts only local-bb-fixture-artifact evidence.`,
  );
  assert(
    typeof proofArtifact.proofHex === "string" &&
      proofArtifact.proofHex.length > 0 &&
      proofArtifact.proofHex.length % 2 === 0 &&
      /^[0-9a-f]+$/u.test(proofArtifact.proofHex),
    `${profile.label} proof artifact must carry lowercase hex proofHex.`,
  );
  assert(Array.isArray(proofArtifact.publicInputs), `${profile.label} proof artifact must carry publicInputs.`);
  assert(proofArtifact.publicInputs.length === 1, `${profile.label} proof artifact must expose exactly one public input.`);
  assertFieldString(proofArtifact.publicInputs[0], profile.publicInputLabels[0]);
  assert(
    JSON.stringify(proofArtifact.publicInputLabels) === JSON.stringify(profile.publicInputLabels),
    `${profile.label} proof artifact must label the public input as ${profile.publicInputLabels[0]}.`,
  );
  assert(
    proofArtifact.publicInputCommitment ===
      createVantaPrivatePoolV2ProofArtifactPublicInputCommitment(proofArtifact.publicInputs),
    `${profile.label} proof artifact publicInputCommitment mismatch.`,
  );
  assert(
    typeof proofArtifact.verifyingKeyHash === "string" &&
      proofArtifact.verifyingKeyHash.startsWith("sha256:"),
    `${profile.label} proof artifact must carry verifyingKeyHash.`,
  );
  assert(
    typeof proofArtifact.verifyingKeyId === "string" &&
      proofArtifact.verifyingKeyId.includes(profile.circuitName),
    `${profile.label} proof artifact must carry verifyingKeyId.`,
  );
  assert(
    typeof proofArtifact.acirBytecodeHash === "string" &&
      proofArtifact.acirBytecodeHash.startsWith("sha256:"),
    `${profile.label} proof artifact must carry acirBytecodeHash.`,
  );
  assert(
    proofArtifact.verifyingKeyHashKind === "local-acir-bytecode-hash-not-production-vk",
    `${profile.label} proof artifact must label verifyingKeyHash as local ACIR bytecode metadata.`,
  );
  assert(
    proofArtifact.proofRuntimePackage === "@aztec/bb.js",
    `${profile.label} proof artifact must name the proof runtime package.`,
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

export function normalizeVantaPrivatePoolV2SendProofArtifact(proofArtifact) {
  return normalizeVantaPrivatePoolV2ProofArtifact(
    proofArtifact,
    proofArtifactCircuitProfiles[sendCircuitName],
  );
}

export function normalizeVantaPrivatePoolV2ShieldProofArtifact(proofArtifact) {
  return normalizeVantaPrivatePoolV2ProofArtifact(
    proofArtifact,
    proofArtifactCircuitProfiles[shieldCircuitName],
  );
}

export function normalizeVantaPrivatePoolV2ClaimProofArtifact(proofArtifact) {
  return normalizeVantaPrivatePoolV2ProofArtifact(
    proofArtifact,
    proofArtifactCircuitProfiles[claimCircuitName],
  );
}

export function normalizeVantaPrivatePoolV2SwapToShieldedProofArtifact(proofArtifact) {
  return normalizeVantaPrivatePoolV2ProofArtifact(
    proofArtifact,
    proofArtifactCircuitProfiles[swapToShieldedCircuitName],
  );
}

export function normalizeVantaPrivatePoolV2ActualPrivateSpendProofArtifact(proofArtifact) {
  return normalizeVantaPrivatePoolV2ProofArtifact(
    proofArtifact,
    proofArtifactCircuitProfiles[actualPrivateSpendCircuitName],
  );
}

function runNargoCompile(profile) {
  execFileSync("nargo", ["compile"], {
    cwd: profile.circuitDir,
    env: nargoEnv,
    stdio: "pipe",
  });
}

async function verifyVantaPrivatePoolV2ProofArtifact(args, profile) {
  const proofArtifact = normalizeVantaPrivatePoolV2ProofArtifact(args.proofArtifact, profile);
  runNargoCompile(profile);

  const compiledProgram = JSON.parse(
    readFileSync(resolve(profile.circuitDir, `target/${profile.circuitName}.json`), "utf8"),
  );
  const verifyingKeyMetadata = createVantaPrivatePoolV2ProofArtifactVerifyingKeyMetadata(
    compiledProgram,
    profile.circuitName,
  );
  assert(
    proofArtifact.verifyingKeyHash === verifyingKeyMetadata.verifyingKeyHash,
    `${profile.label} proof artifact verifyingKeyHash mismatch.`,
  );
  assert(
    proofArtifact.acirBytecodeHash === verifyingKeyMetadata.acirBytecodeHash,
    `${profile.label} proof artifact acirBytecodeHash mismatch.`,
  );
  assert(
    proofArtifact.verifyingKeyId === verifyingKeyMetadata.verifyingKeyId,
    `${profile.label} proof artifact verifyingKeyId mismatch.`,
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
      throw new Error(`${profile.label} proof artifact verification returned false: ${message}`);
    }

    if (!verified) {
      throw new Error(`${profile.label} proof artifact verification returned false.`);
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
        [profile.verifiedPublicInputKey]: proofArtifact.publicInputs[0],
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

export async function verifyVantaPrivatePoolV2SendProofArtifact(args) {
  return await verifyVantaPrivatePoolV2ProofArtifact(
    args,
    proofArtifactCircuitProfiles[sendCircuitName],
  );
}

export async function verifyVantaPrivatePoolV2ShieldProofArtifact(args) {
  return await verifyVantaPrivatePoolV2ProofArtifact(
    args,
    proofArtifactCircuitProfiles[shieldCircuitName],
  );
}

export async function verifyVantaPrivatePoolV2ClaimProofArtifact(args) {
  return await verifyVantaPrivatePoolV2ProofArtifact(
    args,
    proofArtifactCircuitProfiles[claimCircuitName],
  );
}

export async function verifyVantaPrivatePoolV2SwapToShieldedProofArtifact(args) {
  return await verifyVantaPrivatePoolV2ProofArtifact(
    args,
    proofArtifactCircuitProfiles[swapToShieldedCircuitName],
  );
}

export async function verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact(args) {
  return await verifyVantaPrivatePoolV2ProofArtifact(
    args,
    proofArtifactCircuitProfiles[actualPrivateSpendCircuitName],
  );
}

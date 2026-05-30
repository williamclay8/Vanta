import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export const GROTH16_VERIFIER_ADAPTER_MANIFEST_VERSION =
  "vanta-private-pool-v2-groth16-verifier-adapter-manifest-0.1";

export const GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT =
  "ops/fixtures/groth16-verifier-adapter-local-unsafe";

export const GROTH16_VERIFIER_ADAPTER_MANIFEST_FILENAME = "manifest.json";

export const GROTH16_VERIFIER_ADAPTER_ARTIFACT_ROOT_ENV =
  "VANTA_GROTH16_VERIFIER_ADAPTER_ARTIFACT_ROOT";

export const GROTH16_VERIFIER_ADAPTER_CIRCUIT =
  "vanta_private_pool_v2_actual_private_spend_entry";

export const GROTH16_VERIFIER_ADAPTER_PROOF_FORMAT_ID =
  "gnark-solana-native-proof-and-public-witness-v0";

export const GROTH16_VERIFIER_ADAPTER_TARGET = "solana-c01-tag3-groth16-v0";

export const GROTH16_VERIFIER_ADAPTER_PROOF_BYTE_LENGTH = 324;
export const GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_BYTE_LENGTH = 44;
export const GROTH16_VERIFIER_ADAPTER_VERIFIER_INSTRUCTION_DATA_BYTE_LENGTH = 368;
export const GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_HEADER_HEX =
  "000000010000000000000001";

export const GROTH16_VERIFIER_ADAPTER_H6_PUBLIC_INPUT_VALUE =
  "0x2580f5460c06b9ad43e7274530ba99f6e41a91925c0c15d0f944ac5935eb6a7b";

export const GROTH16_VERIFIER_ADAPTER_H6_PUBLIC_INPUT_COMMITMENT =
  "sha256:f17c1da9af65f0811244af3f7c695f2800134019e143f8c03ac40f3fd81222c2";

export const GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256 = {
  proof: "sha256:afde2c07683c4262b5b9ae72c66e559e857a9fd7a529b980b34a45bf2374d186",
  publicWitness: "sha256:19e42b6e34a5861d8804565476d72f8835c81d30cfc66bd598a236d26e1baa60",
  verifyingKey: "sha256:5e0a6f08503f534cbb462f43fbf0b247e8aa2ce75d1fa58c2350f815817948b4",
  verifierSbf: "sha256:91fc2db5e06ebfb72bee120ebbcd51698684216598ec50f046d62fcf64928ac0",
};

export const GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_VERIFIER_KEY_HASH_HEX =
  "0x5e0a6f08503f534cbb462f43fbf0b247e8aa2ce75d1fa58c2350f815817948b4";

export const GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES = {
  proof: `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.proof`,
  publicWitness: `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.pw`,
  verifyingKey: `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.vk`,
  verifierSbf: `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.so`,
};

function sha256(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

function normalizeHex32(value, fieldName = "hex32") {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Groth16 verifier adapter requires ${fieldName}.`);
  }
  const text = value.trim();
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`Groth16 verifier adapter requires 32-byte hex ${fieldName}.`);
  }
  return `0x${hex.toLowerCase()}`;
}

function readOptionalEnv(name) {
  return process.env[name]?.trim() ?? "";
}

function resolveArtifactRoot(inputRoot) {
  const configured =
    inputRoot
    || readOptionalEnv(GROTH16_VERIFIER_ADAPTER_ARTIFACT_ROOT_ENV)
    || GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT;
  return resolve(configured.startsWith("/") ? configured : join(process.cwd(), configured));
}

function readArtifactFile(root, filename, label) {
  const path = join(root, filename);
  if (!existsSync(path)) {
    throw new Error(`Groth16 verifier adapter ${label} missing at ${path}.`);
  }
  const stat = statSync(path);
  if (!stat.isFile()) {
    throw new Error(`Groth16 verifier adapter ${label} must be a file at ${path}.`);
  }
  return readFileSync(path);
}

function decodePublicWitness(buffer) {
  if (buffer.length !== GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_BYTE_LENGTH) {
    throw new Error(
      `Groth16 verifier adapter public witness must be ${GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_BYTE_LENGTH} bytes.`,
    );
  }
  const headerHex = buffer.subarray(0, 12).toString("hex");
  if (headerHex !== GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_HEADER_HEX) {
    throw new Error("Groth16 verifier adapter public witness header mismatch.");
  }
  return normalizeHex32(`0x${buffer.subarray(12).toString("hex")}`, "decodedPublicInputValue");
}

function assertManifestShape(manifest, root) {
  if (manifest.version !== GROTH16_VERIFIER_ADAPTER_MANIFEST_VERSION) {
    throw new Error("Groth16 verifier adapter manifest version mismatch.");
  }
  if (manifest.proofFormatId !== GROTH16_VERIFIER_ADAPTER_PROOF_FORMAT_ID) {
    throw new Error("Groth16 verifier adapter manifest proofFormatId mismatch.");
  }
  if (manifest.target !== GROTH16_VERIFIER_ADAPTER_TARGET) {
    throw new Error("Groth16 verifier adapter manifest target mismatch.");
  }
  if (manifest.circuit !== GROTH16_VERIFIER_ADAPTER_CIRCUIT) {
    throw new Error("Groth16 verifier adapter manifest circuit mismatch.");
  }
  if (!manifest.files || typeof manifest.files !== "object") {
    throw new Error("Groth16 verifier adapter manifest missing files.");
  }

  const proof = readArtifactFile(root, manifest.files.proof.path, "proof");
  const publicWitness = readArtifactFile(root, manifest.files.publicWitness.path, "public witness");
  const verifyingKey = readArtifactFile(root, manifest.files.verifyingKey.path, "verifying key");
  const verifierSbf = readArtifactFile(root, manifest.files.verifierSbf.path, "verifier SBF");

  if (proof.length !== GROTH16_VERIFIER_ADAPTER_PROOF_BYTE_LENGTH) {
    throw new Error("Groth16 verifier adapter proof byte length mismatch.");
  }
  if (publicWitness.length !== GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_BYTE_LENGTH) {
    throw new Error("Groth16 verifier adapter public witness byte length mismatch.");
  }

  const observed = {
    proof: sha256(proof),
    publicWitness: sha256(publicWitness),
    verifyingKey: sha256(verifyingKey),
    verifierSbf: sha256(verifierSbf),
  };

  for (const field of ["proof", "publicWitness", "verifyingKey", "verifierSbf"]) {
    const expected = manifest.files[field]?.sha256;
    if (expected && expected !== observed[field]) {
      throw new Error(`Groth16 verifier adapter manifest ${field} sha256 mismatch.`);
    }
  }

  const decodedPublicInputValue = decodePublicWitness(publicWitness);
  const expectedPublicInputValue = normalizeHex32(
    manifest.publicInputBinding?.value ?? GROTH16_VERIFIER_ADAPTER_H6_PUBLIC_INPUT_VALUE,
    "publicInputBinding.value",
  );
  if (decodedPublicInputValue !== expectedPublicInputValue) {
    throw new Error("Groth16 verifier adapter public witness public-input binding mismatch.");
  }

  const verifierKeyHashHex = normalizeHex32(
    manifest.verifierKeyHashHex ?? observed.verifyingKey.slice("sha256:".length),
    "verifierKeyHashHex",
  );
  if (verifierKeyHashHex !== `0x${observed.verifyingKey.slice("sha256:".length)}`) {
    throw new Error("Groth16 verifier adapter verifier key hash must match verifying key sha256.");
  }

  if (
    observed.publicWitness !== GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256.publicWitness
  ) {
    throw new Error("Groth16 verifier adapter public witness sha256 mismatch against H6 probe reference.");
  }

  return {
    artifactRoot: root,
    manifest,
    proof,
    publicWitness,
    verifyingKey,
    verifierSbf,
    decodedPublicInputValue,
    verifierKeyHashHex,
    observedSha256: observed,
  };
}

export function loadGroth16VerifierAdapterArtifact(input = {}) {
  const root = resolveArtifactRoot(input.artifactRoot);
  const manifestPath = join(root, GROTH16_VERIFIER_ADAPTER_MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) {
    throw new Error(`Groth16 verifier adapter manifest missing at ${manifestPath}.`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const loaded = assertManifestShape(manifest, root);

  return {
    ...loaded,
    gnarkProofBase64: `base64:${loaded.proof.toString("base64")}`,
    gnarkPublicWitnessBase64: `base64:${loaded.publicWitness.toString("base64")}`,
    unshieldPublicInputHashHex: loaded.decodedPublicInputValue,
    adapterKind: manifest.adapterKind ?? "dedicated-verifier-cpi-gnark-tuple",
    status: manifest.status ?? "local-unsafe-not-production",
    productionReady: false,
    satisfiesProductionVerifierAdapterAcceptance: false,
  };
}

export function tryLoadGroth16VerifierAdapterArtifact(input = {}) {
  try {
    return loadGroth16VerifierAdapterArtifact(input);
  } catch {
    return null;
  }
}

export function resolveGroth16VerifierAdapterRelayBindings(input = {}) {
  const loaded = tryLoadGroth16VerifierAdapterArtifact(input);
  if (!loaded) {
    return {};
  }

  return {
    gnarkProofBase64: loaded.gnarkProofBase64,
    gnarkPublicWitnessBase64: loaded.gnarkPublicWitnessBase64,
    unshieldPublicInputHashHex: loaded.unshieldPublicInputHashHex,
    verifierKeyHashHex: loaded.verifierKeyHashHex,
    groth16VerifierAdapterArtifactRoot: loaded.artifactRoot,
    groth16VerifierAdapterStatus: loaded.status,
    source: "groth16-verifier-adapter-artifact",
  };
}

export function resolveDefaultGroth16VerifierAdapterArtifactRoot(startDir = process.cwd()) {
  return resolve(startDir, GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT);
}

export function summarizeGroth16VerifierAdapterRelayBindings(bindings = {}) {
  const summary = {
    groth16VerifierAdapterStatus: bindings.groth16VerifierAdapterStatus ?? "absent",
    groth16VerifierAdapterArtifactRoot: bindings.groth16VerifierAdapterArtifactRoot ?? null,
    gnarkProofSource: "absent",
    gnarkProofSha256: null,
    gnarkPublicWitnessSha256: null,
    gnarkUsesScaffoldProof: null,
    satisfiesProductionVerifierAdapterAcceptance: false,
  };

  if (!bindings.gnarkProofBase64 || !bindings.gnarkPublicWitnessBase64) {
    return summary;
  }

  const proof = Buffer.from(
    bindings.gnarkProofBase64.startsWith("base64:")
      ? bindings.gnarkProofBase64.slice("base64:".length)
      : bindings.gnarkProofBase64,
    "base64",
  );
  const publicWitness = Buffer.from(
    bindings.gnarkPublicWitnessBase64.startsWith("base64:")
      ? bindings.gnarkPublicWitnessBase64.slice("base64:".length)
      : bindings.gnarkPublicWitnessBase64,
    "base64",
  );

  summary.gnarkProofSha256 = sha256(proof);
  summary.gnarkPublicWitnessSha256 = sha256(publicWitness);
  summary.gnarkUsesScaffoldProof = proof.length === GROTH16_VERIFIER_ADAPTER_PROOF_BYTE_LENGTH
    && proof.every((byte) => byte === 0x06);
  summary.gnarkProofSource = summary.gnarkUsesScaffoldProof
    ? "scaffold-0x06"
    : bindings.source ?? "groth16-verifier-adapter-artifact";
  if (bindings.groth16VerifierAdapterStatus) {
    summary.groth16VerifierAdapterStatus = bindings.groth16VerifierAdapterStatus;
  }
  if (bindings.groth16VerifierAdapterArtifactRoot) {
    summary.groth16VerifierAdapterArtifactRoot = GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT;
  }
  return summary;
}

export function describeGroth16VerifierAdapterForOperator(input = {}) {
  const loaded = tryLoadGroth16VerifierAdapterArtifact(input);
  if (!loaded) {
    return {
      status: "absent",
      artifactRoot: null,
      manifestRef: null,
      proofSha256: null,
      publicWitnessSha256: null,
      verifierKeyHashHex: null,
      satisfiesProductionVerifierAdapterAcceptance: false,
    };
  }

  return {
    status: loaded.status,
    artifactRoot: GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
    manifestRef: `${GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT}/${GROTH16_VERIFIER_ADAPTER_MANIFEST_FILENAME}`,
    proofSha256: loaded.observedSha256.proof,
    publicWitnessSha256: loaded.observedSha256.publicWitness,
    verifyingKeySha256: loaded.observedSha256.verifyingKey,
    verifierSbfSha256: loaded.observedSha256.verifierSbf,
    verifierKeyHashHex: loaded.verifierKeyHashHex,
    publicInputHashHex: loaded.unshieldPublicInputHashHex,
    satisfiesProductionVerifierAdapterAcceptance: false,
  };
}

export function buildGroth16VerifierAdapterManifestObserved(root, options = {}) {
  const proof = readArtifactFile(root, GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.proof, "proof");
  const publicWitness = readArtifactFile(
    root,
    GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.publicWitness,
    "public witness",
  );
  const verifyingKey = readArtifactFile(
    root,
    GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.verifyingKey,
    "verifying key",
  );
  const verifierSbf = readArtifactFile(
    root,
    GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.verifierSbf,
    "verifier SBF",
  );
  const decodedPublicInputValue = decodePublicWitness(publicWitness);
  const verifyingKeyHash = sha256(verifyingKey);

  return {
    version: GROTH16_VERIFIER_ADAPTER_MANIFEST_VERSION,
    status: options.status ?? "local-unsafe-h6-beta18-sunspot-not-production",
    adapterKind: "dedicated-verifier-cpi-gnark-tuple",
    target: GROTH16_VERIFIER_ADAPTER_TARGET,
    tag: 3,
    circuit: GROTH16_VERIFIER_ADAPTER_CIRCUIT,
    proofSystem: "groth16",
    proofFormatId: GROTH16_VERIFIER_ADAPTER_PROOF_FORMAT_ID,
    proofByteLength: GROTH16_VERIFIER_ADAPTER_PROOF_BYTE_LENGTH,
    publicWitnessByteLength: GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_BYTE_LENGTH,
    verifierInstructionDataByteLength:
      GROTH16_VERIFIER_ADAPTER_VERIFIER_INSTRUCTION_DATA_BYTE_LENGTH,
    generatedVerifierNrPubinputs: 1,
    generatedVerifierCommitmentKeys: 0,
    publicInputBinding: {
      label: "private-spend-public-input-hash",
      value: decodedPublicInputValue,
      commitment: GROTH16_VERIFIER_ADAPTER_H6_PUBLIC_INPUT_COMMITMENT,
    },
    verifierKeyHashHex: `0x${verifyingKeyHash.slice("sha256:".length)}`,
    verifyingKeyHashKind: "local-unsafe-h6-beta18-sunspot-vk-hash-not-production",
    productionReady: false,
    satisfiesProductionVerifierAdapterAcceptance: false,
    sourceLineageRef:
      "zk/noir/vanta_private_pool_v2_actual_private_spend_entry_sunspot_beta18_h6_candidate",
    probeEvidenceRef: "ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json",
    truthBoundary:
      "Local-unsafe H6 beta18 Sunspot Groth16 adapter artifact only. Not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, and not audit acceptance.",
    files: {
      proof: {
        path: GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.proof,
        byteLength: proof.length,
        sha256: sha256(proof),
      },
      publicWitness: {
        path: GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.publicWitness,
        byteLength: publicWitness.length,
        sha256: sha256(publicWitness),
        headerHex: GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_HEADER_HEX,
      },
      verifyingKey: {
        path: GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.verifyingKey,
        byteLength: verifyingKey.length,
        sha256: sha256(verifyingKey),
      },
      verifierSbf: {
        path: GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.verifierSbf,
        byteLength: verifierSbf.length,
        sha256: sha256(verifierSbf),
      },
    },
  };
}

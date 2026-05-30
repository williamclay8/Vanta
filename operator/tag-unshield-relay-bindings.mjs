import { normalizeVantaPrivateCoreUnshieldProofArtifact } from "./private-core-proof.mjs";
import { resolveGroth16VerifierAdapterRelayBindings } from "../src/privacy/privatePoolV2Groth16VerifierAdapter.mjs";

const PLACEHOLDER_HASH = "0x" + "00".repeat(32);

function normalizeHex32(value, fieldName = "hex32") {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`TAG_UNSHIELD relay bindings require ${fieldName}.`);
  }
  const text = value.trim();
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`TAG_UNSHIELD relay bindings require 32-byte hex ${fieldName}.`);
  }
  return `0x${hex.toLowerCase()}`;
}

function isPlaceholderHash(value) {
  return normalizeHex32(value) === PLACEHOLDER_HASH;
}

function encodeDecimalAmountToLeU64Hex(amount, fieldName = "amount") {
  if (typeof amount !== "string" || amount.trim().length === 0) {
    throw new Error(`TAG_UNSHIELD relay bindings require ${fieldName}.`);
  }
  let parsed;
  try {
    parsed = BigInt(amount.trim());
  } catch {
    throw new Error(`TAG_UNSHIELD relay bindings require numeric ${fieldName}.`);
  }
  if (parsed < 0n || parsed > 0xffff_ffff_ffff_ffffn) {
    throw new Error(`TAG_UNSHIELD relay bindings require ${fieldName} to fit u64.`);
  }
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(parsed);
  return `0x${bytes.toString("hex")}`;
}

function normalizeUnshieldPublicInputHash(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error("TAG_UNSHIELD relay bindings require unshieldPublicInputHash.");
  }
  if (/^0x[0-9a-fA-F]{64}$/.test(text)) {
    return normalizeHex32(text, "unshieldPublicInputHashHex");
  }
  if (/^sha256:[0-9a-f]{64}$/.test(text)) {
    return normalizeHex32(`0x${text.slice("sha256:".length)}`, "unshieldPublicInputHashHex");
  }
  throw new Error(
    "TAG_UNSHIELD relay bindings require unshieldPublicInputHash as 0x<64 hex> or sha256:<64 hex>.",
  );
}

function readOptionalEnv(name) {
  return process.env[name]?.trim() ?? "";
}

function mergeBindingSources(...sources) {
  const merged = {};
  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined && value !== null && value !== "") {
        merged[key] = value;
      }
    }
  }
  return merged;
}

function bindingsFromProofArtifact(proofArtifact) {
  const artifact = normalizeVantaPrivateCoreUnshieldProofArtifact(proofArtifact);
  const sourcePublicInputs = artifact.sourcePublicInputs;
  return {
    acceptedRootHex: normalizeHex32(sourcePublicInputs.stateRoot, "acceptedRootHex"),
    exitAmountLeHex: encodeDecimalAmountToLeU64Hex(sourcePublicInputs.amount, "exitAmountLeHex"),
    exitAssetIdHex: normalizeHex32(sourcePublicInputs.assetId, "exitAssetIdHex"),
    exitDestinationHex: normalizeHex32(sourcePublicInputs.releaseDestination, "exitDestinationHex"),
    nullifierHex: normalizeHex32(sourcePublicInputs.nullifier, "nullifierHex"),
    source: "private-core-unshield-proof-artifact",
  };
}

export function resolveTagUnshieldRelayBindings(input = {}) {
  const directBindings = mergeBindingSources(
    input.tagUnshieldRelayBindings,
    input.bindings,
    {
      acceptedRootHex: input.acceptedRootHex,
      exitAmountLeHex: input.exitAmountLeHex,
      exitAssetIdHex: input.exitAssetIdHex,
      exitDestinationHex: input.exitDestinationHex,
      gnarkProofBase64: input.gnarkProofBase64,
      gnarkPublicWitnessBase64: input.gnarkPublicWitnessBase64,
      nullifierHex: input.nullifierHex,
      unshieldPublicInputHashHex: input.unshieldPublicInputHashHex,
      verifierKeyHashHex: input.verifierKeyHashHex,
    },
  );

  const artifactBindings = input.proofArtifact ? bindingsFromProofArtifact(input.proofArtifact) : {};
  const adapterBindings = resolveGroth16VerifierAdapterRelayBindings(input);
  const bindings = mergeBindingSources(artifactBindings, adapterBindings, directBindings);

  if (input.unshieldPublicInputHash) {
    bindings.unshieldPublicInputHashHex = normalizeUnshieldPublicInputHash(input.unshieldPublicInputHash);
  } else if (typeof input.unshieldPublicInputHashHex === "string" && input.unshieldPublicInputHashHex.trim()) {
    bindings.unshieldPublicInputHashHex = normalizeHex32(
      input.unshieldPublicInputHashHex,
      "unshieldPublicInputHashHex",
    );
  }

  const envVerifierKeyHash = readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_VERIFIER_KEY_HASH");
  if (bindings.verifierKeyHashHex) {
    bindings.verifierKeyHashHex = normalizeHex32(bindings.verifierKeyHashHex, "verifierKeyHashHex");
  } else if (envVerifierKeyHash) {
    bindings.verifierKeyHashHex = normalizeHex32(envVerifierKeyHash, "verifierKeyHashHex");
  }

  const hashFields = [
    "nullifierHex",
    "acceptedRootHex",
    "exitDestinationHex",
    "exitAssetIdHex",
    "unshieldPublicInputHashHex",
    "verifierKeyHashHex",
  ];
  const resolvedHashFields = hashFields.filter((field) => bindings[field]);
  const placeholderHashFields = resolvedHashFields.filter((field) => isPlaceholderHash(bindings[field]));
  const hasRealNullifierBinding = Boolean(bindings.nullifierHex) && !isPlaceholderHash(bindings.nullifierHex);
  const hasRealRootBinding =
    Boolean(bindings.acceptedRootHex) && !isPlaceholderHash(bindings.acceptedRootHex);
  const usesPlaceholderHashes =
    resolvedHashFields.length < hashFields.length || placeholderHashFields.length > 0;

  let bindingSource = "placeholder-scaffold";
  if (artifactBindings.source && hasRealNullifierBinding && hasRealRootBinding) {
    bindingSource = artifactBindings.source;
  } else if (hasRealNullifierBinding && hasRealRootBinding) {
    bindingSource = "explicit-tag-unshield-relay-bindings";
  } else if (adapterBindings.source && bindings.gnarkProofBase64 && bindings.gnarkPublicWitnessBase64) {
    bindingSource = adapterBindings.source;
  } else if (resolvedHashFields.length > 0) {
    bindingSource = "partial-explicit-bindings";
  }

  return {
    bindingSource,
    bindings,
    hasRealNullifierBinding,
    hasRealRootBinding,
    placeholderHashFields,
    resolvedHashFields,
    usesPlaceholderHashes,
  };
}

export function assertTagUnshieldRelayBindingsComplete(resolved) {
  const missing = [
    "nullifierHex",
    "acceptedRootHex",
    "exitDestinationHex",
    "exitAssetIdHex",
    "exitAmountLeHex",
    "unshieldPublicInputHashHex",
    "verifierKeyHashHex",
  ].filter((field) => !resolved.bindings[field]);
  if (missing.length > 0) {
    throw new Error(
      `TAG_UNSHIELD relay bindings are incomplete; missing ${missing.join(", ")}.`,
    );
  }
  if (resolved.usesPlaceholderHashes) {
    throw new Error(
      `TAG_UNSHIELD relay bindings still use placeholder hashes: ${resolved.placeholderHashFields.join(", ")}.`,
    );
  }
}

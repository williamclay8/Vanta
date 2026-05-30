import { createHash } from "node:crypto";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildUnshieldInstructionDataBase64FromBindings } from "../src/privacy/privatePoolV2SolanaUnshieldTransaction.mjs";
import {
  assertTagUnshieldRelayBindingsComplete,
  resolveTagUnshieldRelayBindings,
} from "../operator/tag-unshield-relay-bindings.mjs";
import {
  GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256,
  loadGroth16VerifierAdapterArtifact,
} from "../src/privacy/privatePoolV2Groth16VerifierAdapter.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const programSource = readFileSync(
  resolve(repoRoot, "programs/vanta_private_pool_v2_spend/src/lib.rs"),
  "utf8",
);
const deploySource = readFileSync(
  resolve(repoRoot, "programs/vanta_private_pool_v2_spend/scripts/deploy-vanta-private-pool-v2-tag6-sol.mjs"),
  "utf8",
);
const relaySource = readFileSync(resolve(repoRoot, "operator/unshield-program-relay-transaction.mjs"), "utf8");
const relayBindingsSource = readFileSync(resolve(repoRoot, "operator/tag-unshield-relay-bindings.mjs"), "utf8");

const explicitBindings = {
  acceptedRootHex: "0x" + "44".repeat(32),
  exitAmountLeHex: "0x0100000000000000",
  exitAssetIdHex: "0x" + "33".repeat(32),
  exitDestinationHex: "0x" + "22".repeat(32),
  nullifierHex: "0x" + "11".repeat(32),
  unshieldPublicInputHashHex: "0x" + "55".repeat(32),
  verifierKeyHashHex: "0x" + "66".repeat(32),
};

const resolved = resolveTagUnshieldRelayBindings({
  tagUnshieldRelayBindings: explicitBindings,
});

assert.equal(resolved.bindingSource, "explicit-tag-unshield-relay-bindings");
assert.equal(resolved.bindings.nullifierHex, explicitBindings.nullifierHex);
assert.equal(resolved.bindings.acceptedRootHex, explicitBindings.acceptedRootHex);
assert.equal(resolved.hasRealNullifierBinding, true);
assert.equal(resolved.hasRealRootBinding, true);
assert.equal(resolved.usesPlaceholderHashes, false);
assertTagUnshieldRelayBindingsComplete(resolved);

const placeholderResolved = resolveTagUnshieldRelayBindings({});
assert.equal(placeholderResolved.bindingSource, "groth16-verifier-adapter-artifact");
assert.equal(placeholderResolved.usesPlaceholderHashes, true);
assert.ok(placeholderResolved.bindings.gnarkProofBase64);
assert.ok(placeholderResolved.bindings.gnarkPublicWitnessBase64);

assert.throws(
  () => assertTagUnshieldRelayBindingsComplete(placeholderResolved),
  /(still use placeholder hashes|are incomplete)/,
);

const partialResolved = resolveTagUnshieldRelayBindings({
  tagUnshieldRelayBindings: {
    nullifierHex: "0x" + "11".repeat(32),
  },
});
assert.equal(partialResolved.bindingSource, "groth16-verifier-adapter-artifact");
assert.equal(partialResolved.hasRealNullifierBinding, true);
assert.equal(partialResolved.hasRealRootBinding, false);
assert.equal(partialResolved.usesPlaceholderHashes, true);

assert.ok(
  programSource.includes("data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] = 0;"),
  "program registration must write releaseEnabled=0",
);
assert.ok(
  programSource.includes("if asset_data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] != 1"),
  "commit path must require releaseEnabled=1",
);
assert.ok(
  programSource.includes("if asset_data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] != 0"),
  "preflight path must stay fail-closed on releaseEnabled until audit gates pass",
);
assert.ok(
  deploySource.includes("VANTA_PRIVATE_POOL_V2_UNSHIELD_RELEASE_ENABLED_AUDIT_GATE_ACK"),
  "deploy helper must gate releaseEnabled flip behind audit ACK",
);
assert.ok(
  deploySource.includes("releaseEnabled = 0 by default"),
  "deploy helper must document default releaseEnabled=0",
);
assert.ok(
  relaySource.includes("resolveTagUnshieldRelayBindings"),
  "relay builder must resolve real proof/nullifier bindings",
);
assert.ok(
  relaySource.includes("allowPlaceholderHashes"),
  "relay builder must keep placeholder scaffold behind explicit allow flag",
);

assert.ok(
  relayBindingsSource.includes("resolveGroth16VerifierAdapterRelayBindings"),
  "relay bindings must wire Groth16 verifier adapter artifact resolver",
);

const adapterLoaded = loadGroth16VerifierAdapterArtifact();
const adapterResolved = resolveTagUnshieldRelayBindings({
  tagUnshieldRelayBindings: explicitBindings,
});
assert.equal(adapterResolved.bindings.gnarkProofBase64, adapterLoaded.gnarkProofBase64);
assert.equal(adapterResolved.bindings.gnarkPublicWitnessBase64, adapterLoaded.gnarkPublicWitnessBase64);
assert.equal(adapterResolved.bindings.unshieldPublicInputHashHex, explicitBindings.unshieldPublicInputHashHex);
assert.equal(adapterResolved.bindings.verifierKeyHashHex, explicitBindings.verifierKeyHashHex);

const adapterInstructionData = Buffer.from(
  buildUnshieldInstructionDataBase64FromBindings(adapterResolved.bindings),
  "base64",
);
const gnarkProof = adapterInstructionData.subarray(201, 201 + 324);
const gnarkPublicWitness = adapterInstructionData.subarray(525, 525 + 44);
const observedProofSha256 = `sha256:${createHash("sha256").update(gnarkProof).digest("hex")}`;
const observedPublicWitnessSha256 = `sha256:${createHash("sha256").update(gnarkPublicWitness).digest("hex")}`;
assert.notEqual(gnarkProof[0], 0x06, "relay gnark proof must not use scaffold filler byte");
assert.equal(observedProofSha256, adapterLoaded.observedSha256.proof);
assert.equal(
  observedPublicWitnessSha256,
  GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256.publicWitness,
);
assert.equal(observedPublicWitnessSha256, adapterLoaded.observedSha256.publicWitness);

console.log("Vanta Private Pool v2 TAG_UNSHIELD relay bindings check: PASS");

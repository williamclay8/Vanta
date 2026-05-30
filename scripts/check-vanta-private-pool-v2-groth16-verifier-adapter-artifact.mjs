import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
  GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256,
  GROTH16_VERIFIER_ADAPTER_MANIFEST_VERSION,
  GROTH16_VERIFIER_ADAPTER_PROOF_BYTE_LENGTH,
  GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_BYTE_LENGTH,
  GROTH16_VERIFIER_ADAPTER_TARGET,
  loadGroth16VerifierAdapterArtifact,
} from "../src/privacy/privatePoolV2Groth16VerifierAdapter.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = "ops/mainnet/private-pool-v2-groth16-verifier-adapter-artifact.evidence.json";
const buildScriptPath = "scripts/run-vanta-private-pool-v2-groth16-verifier-adapter-artifact-build.mjs";
const adapterModulePath = "src/privacy/privatePoolV2Groth16VerifierAdapter.mjs";
const relayBindingsPath = "operator/tag-unshield-relay-bindings.mjs";
const probeEvidencePath = "ops/mainnet/private-pool-v2-c01-beta18-h6-migration-probe.evidence.json";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 Groth16 verifier adapter artifact check: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function includes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const evidence = JSON.parse(read(evidencePath));
const buildScript = read(buildScriptPath);
const adapterModule = read(adapterModulePath);
const relayBindings = read(relayBindingsPath);
const probeEvidence = JSON.parse(read(probeEvidencePath));

assert(
  scripts["private-pool-v2:groth16-verifier-adapter-artifact-build"] ===
    `node ${buildScriptPath}`,
  "package.json must expose private-pool-v2:groth16-verifier-adapter-artifact-build",
);
assert(
  scripts["private-pool-v2:groth16-verifier-adapter-artifact-check"] ===
    "node scripts/check-vanta-private-pool-v2-groth16-verifier-adapter-artifact.mjs",
  "package.json must expose private-pool-v2:groth16-verifier-adapter-artifact-check",
);
assert(
  scripts["private-pool-v2:groth16-verifier-adapter-live-receipt-smoke"] ===
    "node scripts/run-vanta-private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.mjs",
  "package.json must expose private-pool-v2:groth16-verifier-adapter-live-receipt-smoke",
);
assert(
  scripts["private-pool-v2:groth16-verifier-adapter-live-receipt-smoke-check"] ===
    "node scripts/check-vanta-private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.mjs",
  "package.json must expose private-pool-v2:groth16-verifier-adapter-live-receipt-smoke-check",
);
assert(
  evidence.canonicalCommands.includes(
    "npm run private-pool-v2:groth16-verifier-adapter-live-receipt-smoke",
  ),
  "evidence canonicalCommands must include live receipt smoke",
);

includes(buildScript, "buildGroth16VerifierAdapterManifestObserved", buildScriptPath);
includes(buildScript, "runSunspotPipeline", buildScriptPath);
includes(adapterModule, "loadGroth16VerifierAdapterArtifact", adapterModulePath);
includes(adapterModule, "resolveGroth16VerifierAdapterRelayBindings", adapterModulePath);
includes(relayBindings, "resolveGroth16VerifierAdapterRelayBindings", relayBindingsPath);

assert(
  evidence.version === "vanta-private-pool-v2-groth16-verifier-adapter-artifact-evidence-0.1",
  "evidence version mismatch",
);
assert(
  evidence.status === "local-unsafe-artifact-materialized-not-production",
  "evidence status mismatch",
);
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "satisfiesProductionVerifierAdapterAcceptance",
]) {
  assert(evidence[field] === false, `${field} must remain false`);
}

assert(
  evidence.artifactRoot === GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
  "evidence artifactRoot mismatch",
);
assert(
  evidence.manifestRef === `${GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT}/manifest.json`,
  "evidence manifestRef mismatch",
);
assert(evidence.probeEvidenceRef === probeEvidencePath, "evidence probeEvidenceRef mismatch");
assert(
  evidence.expectedArtifactSha256.publicWitness ===
    GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256.publicWitness,
  "evidence public witness sha256 mismatch",
);
assert(
  evidence.probeReferenceArtifactSha256.proof ===
    GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256.proof,
  "evidence probe reference proof sha256 mismatch",
);

const loaded = loadGroth16VerifierAdapterArtifact({
  artifactRoot: resolve(repoRoot, evidence.artifactRoot),
});
assert(loaded.manifest.version === GROTH16_VERIFIER_ADAPTER_MANIFEST_VERSION, "manifest version mismatch");
assert(loaded.manifest.target === GROTH16_VERIFIER_ADAPTER_TARGET, "manifest target mismatch");
assert(loaded.proof.length === GROTH16_VERIFIER_ADAPTER_PROOF_BYTE_LENGTH, "loaded proof length mismatch");
assert(
  loaded.publicWitness.length === GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_BYTE_LENGTH,
  "loaded public witness length mismatch",
);
assert(
  loaded.observedSha256.publicWitness ===
    GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256.publicWitness,
  "loaded public witness sha256 mismatch",
);
assert(
  loaded.observedSha256.proof === evidence.expectedArtifactSha256.proof,
  "loaded proof sha256 mismatch against evidence",
);
assert(
  loaded.observedSha256.verifyingKey === evidence.expectedArtifactSha256.verifyingKey,
  "loaded verifying key sha256 mismatch against evidence",
);
assert(
  loaded.observedSha256.verifierSbf === evidence.expectedArtifactSha256.verifierSbf,
  "loaded verifier SBF sha256 mismatch against evidence",
);
assert(
  loaded.verifierKeyHashHex === evidence.verifierKeyHashHex,
  "loaded verifier key hash mismatch against evidence",
);
assert(
  probeEvidence.observedArtifacts?.proof?.sha256 ===
    GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256.proof,
  "probe evidence proof sha256 mismatch",
);

console.log("private-pool-v2 Groth16 verifier adapter artifact check: PASS");
console.log(`- artifactRoot: ${loaded.artifactRoot}`);
console.log(`- status: ${loaded.status}`);
console.log(`- proofSha256: ${loaded.observedSha256.proof}`);
console.log(`- publicWitnessSha256: ${loaded.observedSha256.publicWitness}`);
console.log(`- verifierKeyHashHex: ${loaded.verifierKeyHashHex}`);

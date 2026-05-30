import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_COMMAND,
  C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_CHECK_COMMAND,
  C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_FILENAME,
  C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_RECEIPT_FILENAME,
  C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_RECEIPT_VERSION,
  C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_VERSION,
  C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT,
  buildC01DeterministicProductionArtifactBuildManifestObserved,
  buildC01DeterministicProductionArtifactBuildReceiptObserved,
  requiredC01DeterministicProductionArtifactFilesPresent,
  resolveC01DeterministicProductionArtifactLocalPrepRoot,
} from "../src/privacy/privatePoolV2C01DeterministicProductionArtifactBuild.mjs";
import {
  GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256,
} from "../src/privacy/privatePoolV2Groth16VerifierAdapter.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const gateEvidencePath = "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json";
const buildScriptPath = "scripts/run-vanta-private-pool-v2-c01-deterministic-production-artifact-build.mjs";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 C01 deterministic production artifact build check: FAIL - ${message}`);
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
const gateEvidence = JSON.parse(read(gateEvidencePath));
const buildScript = read(buildScriptPath);
const outputRoot = resolveC01DeterministicProductionArtifactLocalPrepRoot(repoRoot);

assert(
  scripts["private-pool-v2:c01-deterministic-production-artifact-build"] ===
    `node ${buildScriptPath}`,
  "package.json must expose private-pool-v2:c01-deterministic-production-artifact-build",
);
assert(
  scripts["private-pool-v2:c01-deterministic-production-artifact-build-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-deterministic-production-artifact-build-output.mjs",
  "package.json must expose private-pool-v2:c01-deterministic-production-artifact-build-check",
);
assert(
  gateEvidence.canonicalCommands.includes("npm run private-pool-v2:c01-deterministic-production-artifact-build"),
  "gate evidence canonicalCommands must include local prep build command",
);
assert(
  gateEvidence.canonicalCommands.includes("npm run private-pool-v2:c01-deterministic-production-artifact-build-check"),
  "gate evidence canonicalCommands must include local prep build check command",
);

includes(buildScript, "buildC01DeterministicProductionArtifactBuildReceiptObserved", buildScriptPath);
includes(buildScript, "private-pool-v2:groth16-verifier-adapter-artifact-build", buildScriptPath);
includes(buildScript, "C01 deterministic production artifact build: PASS", buildScriptPath);

assert(
  requiredC01DeterministicProductionArtifactFilesPresent(outputRoot),
  `missing required local prep artifacts under ${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT}; run ${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_COMMAND}`,
);

const manifest = JSON.parse(read(`${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT}/${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_FILENAME}`));
const receipt = JSON.parse(read(`${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT}/${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_RECEIPT_FILENAME}`));
const observedManifest = buildC01DeterministicProductionArtifactBuildManifestObserved(outputRoot);
const observedReceipt = buildC01DeterministicProductionArtifactBuildReceiptObserved(outputRoot);

assert(manifest.version === C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_VERSION, "manifest version mismatch");
assert(receipt.version === C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_RECEIPT_VERSION, "receipt version mismatch");
assert(manifest.status === "local-prep-not-reviewed-deterministic-build", "manifest status mismatch");
assert(receipt.status === "local-prep-not-reviewed-deterministic-build", "receipt status mismatch");
assert(manifest.productionReady === false, "manifest productionReady must remain false");
assert(receipt.satisfiesRequiredPositiveEvidence?.deterministicArtifactBuild === false, "receipt must not claim deterministic build acceptance");
assert(
  manifest.files.publicWitness.sha256 === GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256.publicWitness,
  "manifest public witness sha256 mismatch",
);
assert(
  observedManifest.files.proof.sha256 === manifest.files.proof.sha256,
  "manifest proof sha256 drift",
);
assert(
  observedReceipt.productionOutputs.productionVerifyingKeyHash === receipt.productionOutputs.productionVerifyingKeyHash,
  "receipt verifying key hash drift",
);

console.log("private-pool-v2 C01 deterministic production artifact build check: PASS");
console.log(`- artifactRoot: ${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT}`);
console.log(`- proofSha256: ${manifest.files.proof.sha256}`);
console.log(`- publicWitnessSha256: ${manifest.files.publicWitness.sha256}`);

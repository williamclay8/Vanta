import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_FILENAME,
  C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_RECEIPT_FILENAME,
  C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT,
  buildC01DeterministicProductionArtifactBuildManifestObserved,
  buildC01DeterministicProductionArtifactBuildReceiptObserved,
  requiredC01DeterministicProductionArtifactFilesPresent,
  resolveC01DeterministicProductionArtifactLocalPrepRoot,
} from "../src/privacy/privatePoolV2C01DeterministicProductionArtifactBuild.mjs";
import {
  GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES,
  GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
} from "../src/privacy/privatePoolV2Groth16VerifierAdapter.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const groth16FixtureRoot = resolve(repoRoot, GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT);

function fail(message) {
  console.error(`private-pool-v2 C01 deterministic production artifact build: FAIL - ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`+ ${command} ${args.join(" ")}`);
  execFileSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: "inherit",
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
  });
}

function copyArtifacts(sourceRoot, outputRoot) {
  mkdirSync(outputRoot, { recursive: true });
  for (const filename of Object.values(GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES)) {
    copyFileSync(join(sourceRoot, filename), join(outputRoot, filename));
  }
}

function writeObservedReceipts(outputRoot) {
  const manifest = buildC01DeterministicProductionArtifactBuildManifestObserved(outputRoot);
  const receipt = buildC01DeterministicProductionArtifactBuildReceiptObserved(outputRoot);
  writeFileSync(
    join(outputRoot, C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_FILENAME),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(outputRoot, C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_RECEIPT_FILENAME),
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
  return { manifest, receipt };
}

function materializeFrom(sourceRoot, outputRoot) {
  if (!requiredC01DeterministicProductionArtifactFilesPresent(sourceRoot)) {
    fail(`source artifact root missing required files at ${sourceRoot}`);
  }
  copyArtifacts(sourceRoot, outputRoot);
  const { manifest, receipt } = writeObservedReceipts(outputRoot);
  console.log("private-pool-v2 C01 deterministic production artifact build: PASS");
  console.log(`- outputRoot: ${outputRoot}`);
  console.log(`- sourceRoot: ${sourceRoot}`);
  console.log(`- buildReceipt: ${join(outputRoot, C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_RECEIPT_FILENAME)}`);
  console.log(`- proofSha256: ${manifest.files.proof.sha256}`);
  console.log(`- publicWitnessSha256: ${manifest.files.publicWitness.sha256}`);
}

function main() {
  const outputRoot = resolveC01DeterministicProductionArtifactLocalPrepRoot(repoRoot);

  if (requiredC01DeterministicProductionArtifactFilesPresent(outputRoot)) {
    writeObservedReceipts(outputRoot);
    console.log("private-pool-v2 C01 deterministic production artifact build: PASS (existing artifacts refreshed)");
    console.log(`- outputRoot: ${outputRoot}`);
    return;
  }

  if (requiredC01DeterministicProductionArtifactFilesPresent(groth16FixtureRoot)) {
    materializeFrom(groth16FixtureRoot, outputRoot);
    return;
  }

  console.log("Local prep artifacts missing; invoking Groth16 verifier adapter artifact build...");
  run("npm", ["run", "private-pool-v2:groth16-verifier-adapter-artifact-build"], {
    env: {
      VANTA_GROTH16_VERIFIER_ADAPTER_ARTIFACT_OUTPUT_ROOT: GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
    },
  });

  if (!requiredC01DeterministicProductionArtifactFilesPresent(groth16FixtureRoot)) {
    fail(`Groth16 adapter build did not materialize required artifacts at ${groth16FixtureRoot}`);
  }

  materializeFrom(groth16FixtureRoot, outputRoot);
}

main();

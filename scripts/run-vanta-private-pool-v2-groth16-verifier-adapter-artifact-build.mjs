import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  buildGroth16VerifierAdapterManifestObserved,
  GROTH16_VERIFIER_ADAPTER_CIRCUIT,
  GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
  GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES,
} from "../src/privacy/privatePoolV2Groth16VerifierAdapter.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const sourceRootEnv = "VANTA_GROTH16_VERIFIER_ADAPTER_ARTIFACT_SOURCE_ROOT";
const outputRootEnv = "VANTA_GROTH16_VERIFIER_ADAPTER_ARTIFACT_OUTPUT_ROOT";
const sunspotLaneRoot = "/private/tmp/vanta-c01-sunspot-lane";
const defaultSourceRoot = join(sunspotLaneRoot, "work/beta18-h6-circuit/target");
const h6CandidateSource = join(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry_sunspot_beta18_h6_candidate",
);
const h6WorkDir = join(sunspotLaneRoot, "work/beta18-h6-circuit");

function fail(message) {
  console.error(`private-pool-v2 Groth16 verifier adapter artifact build: FAIL - ${message}`);
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

function readOptionalEnv(name) {
  return process.env[name]?.trim() ?? "";
}

function resolveOutputRoot() {
  const configured = readOptionalEnv(outputRootEnv) || GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT;
  return resolve(configured.startsWith("/") ? configured : join(repoRoot, configured));
}

function resolveSourceRoot() {
  const configured = readOptionalEnv(sourceRootEnv);
  if (configured) {
    return resolve(configured.startsWith("/") ? configured : join(repoRoot, configured));
  }
  return defaultSourceRoot;
}

function requiredArtifactsPresent(root) {
  return Object.values(GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES).every((filename) =>
    existsSync(join(root, filename)),
  );
}

function copyArtifacts(sourceRoot, outputRoot) {
  mkdirSync(outputRoot, { recursive: true });
  for (const filename of Object.values(GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES)) {
    copyFileSync(join(sourceRoot, filename), join(outputRoot, filename));
  }
}

function writeManifest(outputRoot) {
  const manifest = buildGroth16VerifierAdapterManifestObserved(outputRoot);
  writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function materializeFrom(sourceRoot, outputRoot) {
  if (!requiredArtifactsPresent(sourceRoot)) {
    fail(`source artifact root missing required files at ${sourceRoot}`);
  }
  copyArtifacts(sourceRoot, outputRoot);
  const manifest = writeManifest(outputRoot);
  console.log(`private-pool-v2 Groth16 verifier adapter artifact build: PASS`);
  console.log(`- outputRoot: ${outputRoot}`);
  console.log(`- sourceRoot: ${sourceRoot}`);
  console.log(`- manifest: ${join(outputRoot, "manifest.json")}`);
}

function ensureSunspotLane() {
  mkdirSync(join(sunspotLaneRoot, "bin"), { recursive: true });
  mkdirSync(join(sunspotLaneRoot, "work"), { recursive: true });
  const sunspotRepo = join(sunspotLaneRoot, "sunspot");
  if (!existsSync(sunspotRepo)) {
    run("git", ["clone", "--depth", "1", "https://github.com/reilabs/sunspot", sunspotRepo]);
  }
  const sunspotBin = join(sunspotLaneRoot, "bin/sunspot");
  if (!existsSync(sunspotBin)) {
    run("go", ["build", "-o", sunspotBin, "."], { cwd: join(sunspotRepo, "go") });
  }
  return sunspotBin;
}

function prepareH6WorkDir() {
  mkdirSync(h6WorkDir, { recursive: true });
  run("rsync", ["-a", "--delete", `${h6CandidateSource}/`, `${h6WorkDir}/`]);
}

function runSunspotPipeline(sunspotBin) {
  const targetDir = join(h6WorkDir, "target");
  mkdirSync(targetDir, { recursive: true });

  run("bash", ["-lc", "noirup -v 1.0.0-beta.18 >/dev/null 2>&1 || true; nargo --version"], {
    cwd: h6WorkDir,
  });
  run("nargo", ["check"], { cwd: h6WorkDir });
  run("nargo", ["compile"], { cwd: h6WorkDir });
  run("nargo", ["execute"], { cwd: h6WorkDir });

  const acirJson = join(targetDir, `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.json`);
  const witnessGz = join(targetDir, `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.gz`);
  const ccs = join(targetDir, `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.ccs`);
  const pk = join(targetDir, `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.pk`);
  const vk = join(targetDir, `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.vk`);
  const proof = join(targetDir, `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.proof`);
  const pw = join(targetDir, `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.pw`);
  const so = join(targetDir, `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.so`);

  run(sunspotBin, ["compile", `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.json`], { cwd: targetDir });
  run(sunspotBin, ["setup", `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.ccs`], { cwd: targetDir });
  run(sunspotBin, [
    "prove",
    `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.json`,
    `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.gz`,
    `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.ccs`,
    `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.pk`,
  ], { cwd: targetDir });
  run(sunspotBin, [
    "verify",
    `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.vk`,
    `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.proof`,
    `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.pw`,
  ], { cwd: targetDir });

  const gnarkVerifierBin = join(sunspotLaneRoot, "sunspot/gnark-solana/crates/verifier-bin");
  const solanaBin = process.env.SOLANA_BIN ?? "solana";
  run(sunspotBin, ["deploy", `${GROTH16_VERIFIER_ADAPTER_CIRCUIT}.vk`], {
    cwd: targetDir,
    env: {
      GNARK_VERIFIER_BIN: gnarkVerifierBin,
      PATH: `${process.env.HOME}/.local/share/solana/install/active_release/bin:${process.env.PATH ?? ""}`,
      SOLANA_BIN: solanaBin,
    },
  });

  for (const path of [proof, pw, vk, so]) {
    if (!existsSync(path)) {
      fail(`Sunspot pipeline did not produce ${path}`);
    }
  }
}

function main() {
  const outputRoot = resolveOutputRoot();
  const sourceRoot = resolveSourceRoot();

  if (requiredArtifactsPresent(sourceRoot)) {
    materializeFrom(sourceRoot, outputRoot);
    return;
  }

  console.log("Source artifacts missing; attempting local Sunspot H6 pipeline build...");
  const sunspotBin = ensureSunspotLane();
  prepareH6WorkDir();
  runSunspotPipeline(sunspotBin);
  materializeFrom(defaultSourceRoot, outputRoot);
}

main();

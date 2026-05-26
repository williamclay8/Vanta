import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json";
const preflightPath =
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const devProbePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json";
const currentSourceCompileAttemptPath =
  "ops/mainnet/private-pool-v2-c01-current-source-sunspot-compile-attempt.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const circuitPath = "zk/noir/vanta_private_pool_v2_actual_private_spend_entry";
const compiledAcirPath = `${circuitPath}/target/vanta_private_pool_v2_actual_private_spend_entry.json`;
const compressedWitnessPath = `${circuitPath}/target/vanta_private_pool_v2_actual_private_spend_entry.gz`;
const bbPath = resolve(repoRoot, "node_modules/.bin/bb");
const sunspotSourceRef = "https://github.com/reilabs/sunspot";
const sunspotRequiredNargoVersion = "1.0.0-beta.18";
const localObservedNargoVersion = "1.0.0-beta.19";
const sunspotCompatibilityStatus = "blocked-local-nargo-version-mismatch-and-sunspot-missing";
const expectedCurrentAcirSha256 =
  "sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9";
const expectedCurrentAcirBytecodeHash =
  "sha256:6ab8f6a90eb551bf02e1b313ede919a6e4aefd8740e70728cce641fdfc2c8d04";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fail(message) {
  console.error(`private-pool-v2 C01 Sunspot Groth16 route: FAIL - ${message}`);
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

function run(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
    },
    stdio: "pipe",
  });
}

function runOptional(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
    },
    stdio: "pipe",
  });

  if (result.error?.code === "ENOENT") {
    return {
      available: false,
      status: null,
      stdout: "",
      stderr: "",
    };
  }

  if (result.error) {
    throw result.error;
  }

  return {
    available: true,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function sha256String(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function acirBytecodeHash(path) {
  const acir = readJson(path);
  assert(typeof acir.bytecode === "string" && acir.bytecode.length > 0, "compiled ACIR bytecode must be present");
  return sha256String(acir.bytecode);
}

function assertStringArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  for (const [index, entry] of value.entries()) {
    assert(typeof entry === "string", `${label}[${index}] must be a string`);
  }
}

function assertSunspotCompatibility(value, label) {
  assert(value && typeof value === "object", `${label} must be an object`);
  assert(value.sourceRef === sunspotSourceRef, `${label} sourceRef mismatch`);
  assert(
    value.sourceRequirement === "Sunspot README requires Noir 1.0.0-beta.18",
    `${label} source requirement mismatch`,
  );
  assert(value.requiredNoirVersion === sunspotRequiredNargoVersion, `${label} Noir version mismatch`);
  assert(value.requiredNargoVersion === sunspotRequiredNargoVersion, `${label} nargo version mismatch`);
  assert(value.observedNargoVersion === localObservedNargoVersion, `${label} observed nargo mismatch`);
  assert(
    nargoVersion.includes(value.observedNargoVersion),
    `${label} observed nargo version must match local nargo --version`,
  );
  assert(value.status === sunspotCompatibilityStatus, `${label} status mismatch`);
  assert(value.sunspotInstalled === false, `${label} must record Sunspot as not installed`);
  assert(value.gnarkVerifierBinConfigured === false, `${label} must record GNARK_VERIFIER_BIN as unconfigured`);
  assert(
    value.satisfiesProductionArtifactGeneration === false,
    `${label} must not satisfy production artifact generation`,
  );
  for (const marker of [
    "cannot produce reviewed production Groth16 proof/VK artifacts",
    "required Noir/Nargo version",
    "Sunspot binary",
    "GNARK verifier binary",
    "reviewer acceptance",
  ]) {
    includes(value.truthBoundary ?? "", marker, `${label} truthBoundary`);
  }
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const preflight = readJson(preflightPath);
const acquisition = readJson(acquisitionPath);
const currentSourceCompileAttempt = readJson(currentSourceCompileAttemptPath);
const decision = read(decisionPath);

assert(
  scripts["zk:c01-sunspot-groth16-route-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sunspot-groth16-route.mjs",
  "package.json must expose zk:c01-sunspot-groth16-route-check",
);
assert(
  scripts["zk:c01-sunspot-gnark-artifact-acquisition-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sunspot-gnark-artifact-acquisition.mjs",
  "package.json must expose zk:c01-sunspot-gnark-artifact-acquisition-check",
);
assert(
  scripts["zk:c01-sunspot-groth16-dev-probe-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sunspot-groth16-dev-probe.mjs",
  "package.json must expose zk:c01-sunspot-groth16-dev-probe-check",
);
assert(
  scripts["zk:c01-current-source-sunspot-compile-attempt-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-current-source-sunspot-compile-attempt.mjs",
  "package.json must expose zk:c01-current-source-sunspot-compile-attempt-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sunspot-groth16-route-check"),
    `${aggregate} must include the Sunspot Groth16 route guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sunspot-gnark-artifact-acquisition-check"),
    `${aggregate} must include the Sunspot/Gnark artifact acquisition guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sunspot-groth16-dev-probe-check"),
    `${aggregate} must include the Sunspot Groth16 dev-probe guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-current-source-sunspot-compile-attempt-check"),
    `${aggregate} must include the current-source Sunspot compile-attempt guard`,
  );
}

assert(existsSync(bbPath), "local @aztec/bb.js CLI shim must exist at node_modules/.bin/bb");
assert(existsSync(resolve(repoRoot, compiledAcirPath)), "compiled actual-private-spend ACIR artifact must exist");
assert(
  existsSync(resolve(repoRoot, compressedWitnessPath)),
  "compressed actual-private-spend witness artifact ref must exist",
);

const nargoVersion = run("nargo", ["--version"]);
const bbVersion = run(bbPath, ["--version"]).trim();
const bbProveHelp = run(bbPath, ["prove", "--help-extended"]);
const goVersion = run("go", ["version"]).trim();
const sunspotProbe = runOptional("sunspot", ["--help"]);
const gnarkVerifierBin = process.env.GNARK_VERIFIER_BIN ?? "";
const currentAcirBytecodeHash = acirBytecodeHash(compiledAcirPath);

assert(packet.version === "vanta-private-pool-v2-c01-sunspot-groth16-route-evidence-0.1", "schema mismatch");
assert(
  packet.status === "blocked-sunspot-toolchain-not-installed-and-no-production-trusted-setup",
  "packet must remain blocked until Sunspot and production setup acceptance exist",
);
assert(packet.backendOptionId === "groth16-tag3-solana-v0", "packet backend option mismatch");
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "packet selected backend mismatch");
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "packet route id mismatch");
assertSunspotCompatibility(packet.sunspotCompatibility, "route sunspotCompatibility");
assertSunspotCompatibility(preflight.sunspotCompatibility, "preflight sunspotCompatibility");
for (const field of [
  "mainnetReady",
  "productionReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]) {
  assert(packet[field] === false, `packet ${field} must remain false`);
}
assert(
  packet.secretPolicy ===
    "references-and-metadata-only-no-verifying-key-bytes-no-proof-bytes-no-witness-values",
  "packet secret policy mismatch",
);
for (const phrase of [
  "verifyingKeyBytes",
  "verifying_key_bytes",
  "vkBytes",
  "proofBytes",
  "proofHex",
  "rawProof",
  "raw proof",
  "witnessBytes",
  "raw witness",
  "private key",
  "seed phrase",
  "bearer ",
  "database url",
  "signed transaction",
]) {
  assert(!packetText.includes(phrase), `packet must not contain byte-bearing or secret-bearing phrase ${phrase}`);
}

assert(
  packet.productionGroth16ToolchainPreflightRef?.artifactRef === preflightPath,
  "packet must reference the production Groth16 toolchain preflight",
);
assert(
  packet.productionGroth16ToolchainPreflightRef?.command ===
    "npm run zk:c01-production-groth16-toolchain-preflight-check",
  "packet must record the preflight guard command",
);
assert(packet.decisionPacketRef === decisionPath, "packet decision ref mismatch");
assert(packet.artifactAcquisitionPacketRef === acquisitionPath, "packet acquisition ref mismatch");
assert(
  packet.currentSourceSunspotCompileAttemptRef === currentSourceCompileAttemptPath,
  "packet current-source compile-attempt ref mismatch",
);
assert(packet.localSunspotGroth16DevProbeRef === devProbePath, "packet dev-probe ref mismatch");
assert(
  preflight.sunspotGroth16RouteRef === packetPath,
  "production Groth16 toolchain preflight must reference the first-class Sunspot route packet",
);
assert(acquisition.routePacketRef === packetPath, "artifact acquisition packet must reference route packet");
assert(acquisition.routeId === packet.routeId, "artifact acquisition route id must match route packet");
assert(
  acquisition.currentSourceSunspotCompileAttemptRef === currentSourceCompileAttemptPath,
  "artifact acquisition current-source compile-attempt ref mismatch",
);
assert(acquisition.localSunspotGroth16DevProbeRef === devProbePath, "artifact acquisition dev-probe ref mismatch");
assert(
  currentSourceCompileAttempt.routePacketRef === packetPath,
  "current-source compile-attempt packet must reference route packet",
);
assert(
  currentSourceCompileAttempt.status ===
    "blocked-current-beta19-acir-bytecode-format-unsupported-by-sunspot-beta18-reader",
  "current-source compile-attempt status mismatch",
);
assert(
  acquisition.status === "blocked-awaiting-reviewed-external-artifact-intake",
  "artifact acquisition packet must remain blocked until reviewed artifacts are returned",
);
assert(
  preflight.candidateProductionArtifactLane?.id === packet.routeId,
  "preflight embedded candidate lane must match the route packet",
);
assert(
  preflight.candidateProductionArtifactLane?.status === packet.status,
  "preflight embedded candidate lane status must match the route packet",
);
assert(preflight.localSunspotGroth16DevProbeRef === devProbePath, "preflight dev-probe ref mismatch");
assert(
  preflight.currentSourceSunspotCompileAttemptRef === currentSourceCompileAttemptPath,
  "preflight current-source compile-attempt ref mismatch",
);
assert(
  packet.localDevProbeSummary?.status ===
    "local-dev-probe-succeeded-nonproduction-unsafe-setup-and-beta18-source-shim",
  "local dev-probe summary status mismatch",
);
assert(packet.localDevProbeSummary?.routeFeasibilityLocalDevProbe === true, "dev probe must record route feasibility");
for (const marker of [
  "temporary beta18 source shim",
  "generated standalone Solana verifier",
  "324-byte proof plus 44-byte public witness",
  "stale against the current H6 local proof receipt",
  "rejects the legacy 256-byte proof-only shape",
  "spend-program adapter",
  "zero public/secret inputs",
  "one public input",
  "no production proof/VK/spend-program adapter/live/audit evidence",
]) {
  includes(packet.localDevProbeSummary?.truthBoundary ?? "", marker, "local dev-probe summary truth boundary");
}

const required = packet.requiredProductionArtifactShape ?? {};
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["proofFormatId", "gnark-solana-native-proof-and-public-witness-v0"],
  ["expectedProofByteLength", 324],
  ["expectedPublicWitnessByteLength", 44],
  ["expectedVerifierInstructionDataByteLength", 368],
  ["expectedGeneratedVerifierNrPubinputs", 1],
  ["expectedGeneratedVerifierCommitmentKeys", 0],
  ["publicInputLabel", "private-spend-public-input-hash"],
  ["verifyingKeyHashKind", "production-verifying-key-hash"],
  ["currentProgramReservedProofByteLength", 324],
  ["currentProgramReservedPublicWitnessByteLength", 44],
  ["currentProgramReservedVerifierInputByteLength", 368],
  [
    "adapterBoundaryStatus",
    "spend-program-tag3-abi-reserves-selected-gnark-tuple-and-dedicated-verifier-cpi-account-fail-closed",
  ],
  ["status", "required-before-verifier-adapter-acceptance"],
]) {
  assert(required[field] === expected, `required artifact shape ${field} mismatch`);
}

const sourceCircuit = packet.sourceCircuit ?? {};
assert(sourceCircuit.path === circuitPath, "packet must bind to the actual-private-spend circuit");
assert(sourceCircuit.compiledAcirRef === compiledAcirPath, "compiled ACIR ref mismatch");
assert(sourceCircuit.compiledAcirByteLength === 1840868, "recorded compiled ACIR byte length mismatch");
assert(
  sourceCircuit.compiledAcirSha256 === expectedCurrentAcirSha256,
  "recorded compiled ACIR sha256 mismatch",
);
assert(
  sourceCircuit.compiledAcirBytecodeHash === expectedCurrentAcirBytecodeHash,
  "compiled ACIR bytecode hash mismatch",
);
assert(
  currentAcirBytecodeHash === sourceCircuit.compiledAcirBytecodeHash,
  "current compiled ACIR bytecode hash mismatch",
);
assert(sourceCircuit.compressedWitnessRef === compressedWitnessPath, "compressed witness ref mismatch");
assert(
  sourceCircuit.compressedWitnessByteLength === 563801,
  "recorded compressed witness byte length mismatch",
);
assert(sourceCircuit.compressedWitnessHashStored === false, "packet must not store compressed witness hash");
assert(sourceCircuit.compressedWitnessValuesStored === false, "packet must not store witness values");
assert(sourceCircuit.poseidonDependency === "noir-lang/poseidon#v0.1.1", "poseidon dependency mismatch");
assert(sourceCircuit.publicInputLabel === "private-spend-public-input-hash", "public-input label mismatch");

const circuitToml = read(`${circuitPath}/Nargo.toml`);
const circuitSource = read(`${circuitPath}/src/main.nr`);
includes(circuitToml, "noir-lang/poseidon", "actual-private-spend Nargo.toml");
includes(circuitSource, "private_spend_public_input_hash: pub Field", "actual-private-spend circuit");

assert(packet.observedLocalTools?.go?.available === true, "Go must be locally available");
assert(
  /^go version go\d+\.\d+(?:\.\d+)? \S+\/\S+$/u.test(packet.observedLocalTools?.go?.version ?? ""),
  "packet must record a well-formed Go version",
);
assert(/^go version go\d+\.\d+(?:\.\d+)? \S+\/\S+$/u.test(goVersion), "current Go version must be readable");
assert(packet.observedLocalTools?.nargo?.available === true, "nargo must be locally available");
assert(nargoVersion.includes(packet.observedLocalTools?.nargo?.version), "nargo version mismatch");
assert(packet.observedLocalTools?.bb?.available === true, "bb must be locally available");
assert(packet.observedLocalTools?.bb?.version === bbVersion, "bb version mismatch");
includes(bbProveHelp, "Options: {chonk, avm, ultra_honk}", "bb prove scheme help");
assert(
  JSON.stringify(packet.observedLocalTools?.bb?.availableSchemes) ===
    JSON.stringify(["chonk", "avm", "ultra_honk"]),
  "packet bb available schemes mismatch",
);
assert(packet.observedLocalTools?.bb?.missingRequiredScheme === "groth16", "packet must keep Groth16 missing");
assert(
  !bbProveHelp.toLowerCase().includes("groth16"),
  "route packet must be updated if local bb starts exposing Groth16",
);
assert(packet.observedLocalTools?.sunspot?.available === false, "Sunspot must be recorded unavailable");
assert(sunspotProbe.available === false, "route packet must be updated if Sunspot becomes locally available");
assert(
  JSON.stringify(packet.observedLocalTools?.sunspot?.expectedCommands) ===
    JSON.stringify(["compile", "setup", "prove", "verify", "deploy"]),
  "packet Sunspot command set mismatch",
);
assert(packet.observedLocalTools?.gnarkVerifierBinEnv?.name === "GNARK_VERIFIER_BIN", "GNARK env name mismatch");
assert(packet.observedLocalTools?.gnarkVerifierBinEnv?.configured === false, "GNARK env must be unconfigured");
assert(packet.observedLocalTools?.gnarkVerifierBinEnv?.value === null, "GNARK env value must not be stored");
assert(gnarkVerifierBin === "", "route packet must be updated if GNARK_VERIFIER_BIN becomes configured");

for (const commandShape of [
  "nargo compile",
  "nargo execute",
  "sunspot compile <actual-private-spend-acir-json>",
  "sunspot setup <actual-private-spend-ccs>",
  "sunspot prove <actual-private-spend-acir-json> <compressed-witness> <ccs> <proving-key>",
  "sunspot verify <verifying-key> <proof> <public-witness>",
  "sunspot deploy <verifying-key>",
]) {
  assert(packet.requiredArtifactFlow?.includes(commandShape), `missing artifact flow command ${commandShape}`);
}
assert(
  packet.unsafeDefaultSetupBoundary?.status ===
    "blocked-no-production-ceremony-or-toxic-waste-mitigation",
  "default setup boundary status mismatch",
);
for (const marker of [
  "not production verifying-key evidence",
  "toxic-waste mitigation",
  "exact actual-private-spend circuit",
]) {
  includes(packet.unsafeDefaultSetupBoundary?.truthBoundary ?? "", marker, "default setup boundary");
}

for (const [field, expected] of [
  ["groth16ProofFormatArtifactRef", null],
  ["productionVerifyingKeyArtifactRef", null],
  ["productionVerifyingKeyHashArtifactRef", null],
  ["publicWitnessArtifactRef", null],
  ["solanaVerifierProgramOrAdapterRef", null],
  ["artifactPinningManifestRef", null],
  ["satisfiesProductionProofFormatEvidence", false],
  ["satisfiesProductionVerifyingKeyEvidence", false],
  ["satisfiesVerifierAdapterEvidence", false],
]) {
  assert(packet.expectedProductionOutputs?.[field] === expected, `production output ${field} mismatch`);
}
assert(
  packet.verifierAdapterAcceptanceTarget?.kind ===
    "dedicated-solana-groth16-verifier-program-or-in-program-light-style-adapter",
  "verifier adapter target kind mismatch",
);
for (const [field, expected] of [
  ["expectedProofSystem", "groth16"],
  ["proofFormatId", "gnark-solana-native-proof-and-public-witness-v0"],
  ["expectedProofByteLength", 324],
  ["expectedPublicWitnessByteLength", 44],
  ["expectedVerifierInstructionDataByteLength", 368],
  ["expectedVerifierSurface", "Solana altbn254 Groth16 verifier"],
  ["expectedVerifierKeyHashKind", "production-verifying-key-hash"],
]) {
  assert(packet.verifierAdapterAcceptanceTarget?.[field] === expected, `verifier adapter target ${field} mismatch`);
}
assert(
  packet.verifierAdapterAcceptanceTarget?.requiredFailureEvidence?.includes(
    "wrong verifying key leaves accounts unchanged",
  ),
  "verifier adapter target must require wrong-key no-mutation evidence",
);
assert(
  packet.verifierAdapterAcceptanceTarget?.satisfiesVerifierAdapterEvidence === false,
  "route must not satisfy verifier adapter evidence",
);

for (const requirement of [
  "pinned and reviewed Sunspot/Gnark toolchain source or release",
  "production trusted setup ceremony or equivalent toxic-waste mitigation for the exact actual-private-spend circuit",
  "deterministic production Groth16 proof-format artifact with public witness separated from private witness values",
  "production verifying-key artifact hash and tag-5 registry commitment for the exact selected backend",
  "Solana verifier adapter or verifier CPI acceptance for the exact proof/VK/public-input tuple",
  "valid-proof mutation test and invalid/wrong-public-input/wrong-verifying-key no-mutation tests",
  "rebuilt SBF, redeploy/reinit/live lineage, and audit/reviewer acceptance",
]) {
  assert(packet.productionAcceptanceRequires?.includes(requirement), `missing production requirement ${requirement}`);
}
for (const blocker of [
  "Sunspot is not installed locally",
  "local Sunspot beta18 reader panics on the current beta19 source ACIR bytecode format before CCS generation",
  "latest observed upstream Sunspot main e29fd6586f9a9f936ace0d71c103f5a4e9d9db76 still uses the beta18 function-count ACIR reader and panics on the current beta19 source ACIR before CCS generation",
  "GNARK_VERIFIER_BIN is not configured",
  "Sunspot README requires Noir/Nargo 1.0.0-beta.18 but local nargo is 1.0.0-beta.19",
  "no production trusted setup ceremony or toxic-waste mitigation exists for the exact actual-private-spend circuit",
  "host-side reserved tag 3 still returns ERR_PROOF_VERIFIER_NOT_WIRED before mutation while SBF has an unaccepted verifier CPI hook",
]) {
  assert(packet.blockedBy?.includes(blocker), `missing blocker ${blocker}`);
}

for (const [field, expected] of [
  ["backendSelection", true],
  ["actualPrivateSpendProductionProofFormat", false],
  ["privateSpendPublicInputHashBinding", false],
  ["productionVerifyingKeyHash", false],
  ["verifierAdapter", false],
  ["acceptedProofMutatesStateTest", false],
  ["invalidProofLeavesAccountsUnchangedTest", false],
  ["wrongPublicInputHashLeavesAccountsUnchangedTest", false],
  ["wrongVerifyingKeyLeavesAccountsUnchangedTest", false],
  ["sbfLiveLineage", false],
  ["auditReviewerAcceptance", false],
]) {
  assert(packet.satisfiesRequiredPositiveEvidence?.[field] === expected, `${field} must remain ${expected}`);
}
assertStringArray(packet.forbiddenPromotions, "packet forbiddenPromotions");
assertStringArray(packet.canonicalCommands, "packet canonicalCommands");
for (const command of [
  "npm run zk:c01-sunspot-groth16-route-check",
  "npm run zk:c01-current-source-sunspot-compile-attempt-check",
  "VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-latest-e29fd658/go/sunspot VANTA_C01_SUNSPOT_COMPILE_ATTEMPT=latest VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check",
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "npm run zk:c01-production-groth16-toolchain-preflight-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-production-verifying-key-candidate-check",
]) {
  assert(packet.canonicalCommands.includes(command), `packet must record canonical command ${command}`);
}
for (const ref of [
  "https://github.com/reilabs/sunspot",
  "https://github.com/solana-foundation/noir-examples",
  "https://github.com/Lightprotocol/groth16-solana",
  "https://docs.rs/groth16-solana/latest/groth16_solana/",
]) {
  assert(packet.sourceRefs?.includes(ref), `packet missing source ref ${ref}`);
}
for (const marker of [
  "fail-closed candidate route packet",
  "not production proof-format evidence",
  "not production verifying-key evidence",
  "not verifier-adapter acceptance",
]) {
  includes(packet.truthBoundary ?? "", marker, "route truth boundary");
}

for (const marker of [
  "Sunspot/Gnark Route packet",
  "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json",
  "npm run zk:c01-sunspot-groth16-route-check",
  "sunspot-noir-acir-gnark-groth16-solana-v0",
  "blocked-sunspot-toolchain-not-installed-and-no-production-trusted-setup",
]) {
  includes(decision, marker, decisionPath);
}

console.log("private-pool-v2 C01 Sunspot Groth16 route: PASS");

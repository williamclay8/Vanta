import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath =
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json";
const candidatePath = "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json";
const optionsPath = "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json";
const proofFormatPath = "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json";
const productionVkPath = "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json";
const localProofPath = "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json";
const sunspotRoutePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json";
const devProbePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json";
const decisionPath = "docs/zk/c01-production-verifier-backend-decision.md";
const bbPath = resolve(repoRoot, "node_modules/.bin/bb");
const circuitPath = "zk/noir/vanta_private_pool_v2_actual_private_spend_entry";
const sunspotSourceRef = "https://github.com/reilabs/sunspot";
const sunspotRequiredNargoVersion = "1.0.0-beta.18";
const localObservedNargoVersion = "1.0.0-beta.19";
const sunspotCompatibilityStatus = "blocked-local-nargo-version-mismatch-and-sunspot-missing";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fail(message) {
  console.error(`private-pool-v2 C01 production Groth16 toolchain preflight: FAIL - ${message}`);
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
const candidate = readJson(candidatePath);
const options = readJson(optionsPath);
const proofFormat = readJson(proofFormatPath);
const productionVk = readJson(productionVkPath);
const localProof = readJson(localProofPath);
const sunspotRoute = readJson(sunspotRoutePath);
const decision = read(decisionPath);

assert(
  scripts["zk:c01-production-groth16-toolchain-preflight-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-production-groth16-toolchain-preflight.mjs",
  "package.json must expose zk:c01-production-groth16-toolchain-preflight-check",
);
assert(
  scripts["zk:c01-sunspot-groth16-route-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sunspot-groth16-route.mjs",
  "package.json must expose zk:c01-sunspot-groth16-route-check",
);
assert(
  scripts["zk:c01-sunspot-groth16-dev-probe-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-sunspot-groth16-dev-probe.mjs",
  "package.json must expose zk:c01-sunspot-groth16-dev-probe-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-production-groth16-toolchain-preflight-check"),
    `${aggregate} must include the production Groth16 toolchain preflight guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sunspot-groth16-route-check"),
    `${aggregate} must include the Sunspot Groth16 route guard`,
  );
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-sunspot-groth16-dev-probe-check"),
    `${aggregate} must include the Sunspot Groth16 dev-probe guard`,
  );
}

assert(existsSync(bbPath), "local @aztec/bb.js CLI shim must exist at node_modules/.bin/bb");
const nargoVersion = run("nargo", ["--version"]);
const bbVersion = run(bbPath, ["--version"]).trim();
const bbProveHelp = run(bbPath, ["prove", "--help-extended"]);
const goVersion = run("go", ["version"]).trim();
const sunspotProbe = runOptional("sunspot", ["--help"]);
const gnarkVerifierBin = process.env.GNARK_VERIFIER_BIN ?? "";

assert(
  nargoVersion.includes(packet.observedToolchain?.nargo?.version),
  "observed nargo version must match the packet",
);
assert(bbVersion === packet.observedToolchain?.bb?.version, "observed bb version must match the packet");
includes(bbProveHelp, "Options: {chonk, avm, ultra_honk}", "bb prove scheme help");
assert(
  !bbProveHelp.toLowerCase().includes("groth16"),
  "current blocked toolchain preflight must fail if bb exposes Groth16",
);

assert(
  packet.version ===
    "vanta-private-pool-v2-c01-production-groth16-toolchain-preflight-evidence-0.1",
  "packet must use the checked schema",
);
assert(
  packet.status === "blocked-local-toolchain-no-groth16-scheme",
  "packet must remain blocked while the local toolchain cannot generate Groth16 artifacts",
);
assertSunspotCompatibility(packet.sunspotCompatibility, "packet sunspotCompatibility");
assertSunspotCompatibility(sunspotRoute.sunspotCompatibility, "Sunspot route sunspotCompatibility");
assert(packet.backendOptionId === "groth16-tag3-solana-v0", "packet must bind to the selected backend");
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "packet selectedBackend mismatch");
assert(
  packet.selectedBackendStatus === "selected-pending-production-evidence",
  "packet selectedBackendStatus mismatch",
);
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]) {
  assert(packet[field] === false, `packet ${field} must be false`);
}
assert(
  packet.secretPolicy ===
    "references-and-metadata-only-no-proof-bytes-no-verifying-key-bytes-no-witness-values",
  "packet must forbid raw proof/VK/witness values",
);
for (const phrase of [
  "proofBytes",
  "proofHex",
  "rawProof",
  "raw proof",
  "verifyingKeyBytes",
  "verifying_key_bytes",
  "vkBytes",
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

for (const [field, expected] of [
  ["candidatePacketRef", candidatePath],
  ["backendOptionsRef", optionsPath],
  ["groth16ProofFormatCandidateRef", proofFormatPath],
  ["productionVerifyingKeyCandidateRef", productionVkPath],
  ["localProofFormatRef", localProofPath],
  ["sunspotGroth16RouteRef", sunspotRoutePath],
  ["localSunspotGroth16DevProbeRef", devProbePath],
  ["decisionPacketRef", decisionPath],
]) {
  assert(packet[field] === expected, `packet ${field} mismatch`);
}

const required = packet.requiredProductionArtifactShape ?? {};
for (const [field, expected] of [
  ["target", "solana-c01-tag3-groth16-v0"],
  ["tag", 3],
  ["circuit", "vanta_private_pool_v2_actual_private_spend_entry"],
  ["proofSystem", "groth16"],
  ["proofFormatId", "gnark-solana-native-proof-and-public-witness-v0"],
  ["proofByteLength", 324],
  ["publicWitnessByteLength", 44],
  ["verifierInstructionDataByteLength", 368],
  ["generatedVerifierNrPubinputs", 1],
  ["generatedVerifierCommitmentKeys", 0],
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

const bb = packet.observedToolchain?.bb ?? {};
assert(bb.command === "./node_modules/.bin/bb --version", "packet must record the local bb command");
assert(bb.package === "@aztec/bb.js", "packet must record @aztec/bb.js");
assert(bb.packageVersion === packageJson.dependencies?.["@aztec/bb.js"], "packet bb packageVersion mismatch");
assert(
  JSON.stringify(bb.availableSchemes) === JSON.stringify(["chonk", "avm", "ultra_honk"]),
  "packet must record the currently exposed bb schemes",
);
assert(bb.missingRequiredScheme === "groth16", "packet must name Groth16 as the missing required scheme");
assert(
  bb.satisfiesGroth16ProductionArtifactGeneration === false,
  "current bb toolchain must not satisfy Groth16 artifact generation",
);

const lane = packet.candidateProductionArtifactLane ?? {};
assert(
  lane.id === "sunspot-noir-acir-gnark-groth16-solana-v0",
  "packet must identify the Sunspot/Gnark Groth16 Solana candidate artifact lane",
);
assert(
  lane.status === "blocked-sunspot-toolchain-not-installed-and-no-production-trusted-setup",
  "candidate production artifact lane must remain blocked until Sunspot and production setup are accepted",
);
assert(sunspotRoute.routeId === lane.id, "Sunspot route packet route id must match the preflight lane");
assert(sunspotRoute.status === lane.status, "Sunspot route packet status must match the preflight lane");
assert(sunspotRoute.localSunspotGroth16DevProbeRef === devProbePath, "Sunspot route dev-probe ref mismatch");
assert(
  sunspotRoute.productionGroth16ToolchainPreflightRef?.artifactRef === packetPath,
  "Sunspot route packet must reference the toolchain preflight",
);
assert(
  packet.localDevProbeSummary?.status ===
    "local-dev-probe-succeeded-nonproduction-unsafe-setup-and-beta18-source-shim",
  "local dev-probe summary status mismatch",
);
assert(packet.localDevProbeSummary?.routeFeasibilityLocalDevProbe === true, "dev probe must record route feasibility");
for (const marker of [
  "temporary beta18 source shim",
  "standalone Solana verifier accepts",
  "324-byte proof plus 44-byte public witness",
  "not satisfy production proof-format",
  "production VK",
  "Vanta spend-program verifier-adapter",
  "public-input binding",
]) {
  includes(packet.localDevProbeSummary?.truthBoundary ?? "", marker, "local dev-probe summary truth boundary");
}
for (const marker of [
  "Candidate route",
  "Groth16 proof-format",
  "verifying-key artifact",
  "does not accept the lane for production",
]) {
  includes(lane.purpose ?? "", marker, "candidate production artifact lane purpose");
}
assert(lane.sourceCircuit?.path === circuitPath, "candidate lane must bind to the actual-private-spend circuit");
assert(
  lane.sourceCircuit?.compiledAcirRef ===
    `${circuitPath}/target/vanta_private_pool_v2_actual_private_spend_entry.json`,
  "candidate lane must name the compiled ACIR JSON ref",
);
assert(
  lane.sourceCircuit?.compressedWitnessRef ===
    `${circuitPath}/target/vanta_private_pool_v2_actual_private_spend_entry.gz`,
  "candidate lane must name the compressed witness ref without embedding witness values",
);
assert(
  lane.sourceCircuit?.poseidonDependency === "noir-lang/poseidon#v0.1.1",
  "candidate lane must record the Noir poseidon dependency",
);
assert(
  lane.sourceCircuit?.publicInputLabel === "private-spend-public-input-hash",
  "candidate lane must preserve the private-spend public-input label",
);
const circuitToml = read(`${circuitPath}/Nargo.toml`);
const circuitSource = read(`${circuitPath}/src/main.nr`);
includes(circuitToml, "noir-lang/poseidon", "actual-private-spend Nargo.toml");
includes(circuitSource, "private_spend_public_input_hash: pub Field", "actual-private-spend circuit");
assert(lane.observedLocalTools?.go?.available === true, "candidate lane must observe Go as locally available");
assert(lane.observedLocalTools?.go?.version === goVersion, "candidate lane Go version mismatch");
assert(
  lane.observedLocalTools?.sunspot?.available === false,
  "candidate lane must record Sunspot as not locally installed",
);
assert(
  sunspotProbe.available === false,
  "candidate lane packet must be updated if Sunspot becomes locally available",
);
assert(
  JSON.stringify(lane.observedLocalTools?.sunspot?.expectedCommands) ===
    JSON.stringify(["compile", "setup", "prove", "verify", "deploy"]),
  "candidate lane must record the expected Sunspot command set",
);
assert(
  lane.observedLocalTools?.gnarkVerifierBinEnv?.name === "GNARK_VERIFIER_BIN",
  "candidate lane must name GNARK_VERIFIER_BIN",
);
assert(
  lane.observedLocalTools?.gnarkVerifierBinEnv?.configured === false,
  "candidate lane must record GNARK_VERIFIER_BIN as not configured",
);
assert(
  lane.observedLocalTools?.gnarkVerifierBinEnv?.value === null,
  "candidate lane must not store a GNARK_VERIFIER_BIN path while it is unconfigured",
);
assert(
  gnarkVerifierBin === "",
  "candidate lane packet must be updated if GNARK_VERIFIER_BIN becomes configured",
);
for (const commandShape of [
  "nargo compile",
  "nargo execute",
  "sunspot compile <actual-private-spend-acir-json>",
  "sunspot setup <actual-private-spend-ccs>",
  "sunspot prove <actual-private-spend-acir-json> <compressed-witness> <ccs> <proving-key>",
  "sunspot verify <verifying-key> <proof> <public-witness>",
  "sunspot deploy <verifying-key>",
]) {
  assert(
    lane.requiredArtifactFlow?.includes(commandShape),
    `candidate lane must record artifact flow command shape ${commandShape}`,
  );
}
assert(
  lane.unsafeDefaultSetupBoundary?.status ===
    "blocked-no-production-ceremony-or-toxic-waste-mitigation",
  "candidate lane must keep default setup blocked for production",
);
assert(
  lane.unsafeDefaultSetupBoundary?.unsafeCommandShape === "sunspot setup <actual-private-spend-ccs>",
  "candidate lane must name the unsafe default setup command shape",
);
for (const marker of [
  "not production verifying-key evidence",
  "toxic-waste mitigation",
  "reviewer acceptance",
]) {
  includes(lane.unsafeDefaultSetupBoundary?.truthBoundary ?? "", marker, "candidate lane setup boundary");
}
assert(
  lane.verifierAdapterTarget?.kind ===
    "dedicated-solana-groth16-verifier-program-or-in-program-light-style-adapter",
  "candidate lane verifier adapter target mismatch",
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
  assert(lane.verifierAdapterTarget?.[field] === expected, `candidate lane verifier adapter ${field} mismatch`);
}
assert(
  lane.verifierAdapterTarget?.satisfiesVerifierAdapterEvidence === false,
  "candidate lane must not satisfy verifier-adapter evidence",
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
  assert(
    lane.productionAcceptanceRequires?.includes(requirement),
    `candidate lane missing production acceptance requirement: ${requirement}`,
  );
}
for (const [field, expected] of [
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
  assert(lane.satisfiesRequiredPositiveEvidence?.[field] === expected, `candidate lane ${field} mismatch`);
}
for (const ref of [
  "https://github.com/reilabs/sunspot",
  "https://github.com/solana-foundation/noir-examples",
  "https://github.com/Lightprotocol/groth16-solana",
  "https://docs.rs/groth16-solana/latest/groth16_solana/",
]) {
  assert(lane.sourceRefs?.includes(ref), `candidate lane missing source ref ${ref}`);
}

const local = packet.currentLocalGenerationCapability ?? {};
const localObserved = localProof.localProofObservation ?? {};
for (const [field, expected] of [
  ["proofSystem", localObserved.proofSystem],
  ["backend", localObserved.backend],
  ["proofByteLength", localObserved.proofByteLength],
  ["proofFieldCount", localObserved.proofFieldCount],
  ["publicInputLabel", "private-spend-public-input-hash"],
  ["verifyingKeyHashKind", localObserved.verifyingKeyHashKind],
]) {
  assert(local[field] === expected, `current local capability ${field} mismatch`);
}
assert(local.canGenerateRequiredGroth16ProofFormat === false, "local toolchain must not satisfy Groth16 proof format");
assert(local.canGenerateProductionVerifyingKeyHash === false, "local toolchain must not satisfy production VK");

for (const field of [
  "groth16ProofFormatArtifactRef",
  "productionVerifyingKeyHashArtifactRef",
  "verifierAdapterAcceptanceArtifactRef",
  "validProofMutationArtifactRef",
  "invalidProofNoMutationArtifactRef",
  "wrongPublicInputNoMutationArtifactRef",
  "wrongVerifyingKeyNoMutationArtifactRef",
]) {
  assert(packet.missingProductionArtifacts?.[field] === null, `missing production artifact ${field} must stay null`);
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
assertStringArray(packet.blockedBy, "packet blockedBy");
for (const blocker of [
  "Sunspot README requires Noir/Nargo 1.0.0-beta.18 but local nargo is 1.0.0-beta.19",
  "candidate Sunspot/Gnark Groth16 artifact lane is identified but not installed locally and not production-accepted",
]) {
  assert(packet.blockedBy.includes(blocker), `packet missing blocker ${blocker}`);
}
assertStringArray(packet.forbiddenPromotions, "packet forbiddenPromotions");
assertStringArray(packet.canonicalCommands, "packet canonicalCommands");

assert(candidate.selectedBackend === "groth16-tag3-solana-v0", "candidate must keep selected backend");
assert(
  candidate.selectedBackendStatus === "selected-pending-production-evidence",
  "candidate must keep selected backend status",
);
assert(proofFormat.status === "blocked-no-groth16-production-proof-format-artifact", "proof-format must stay blocked");
assert(
  proofFormat.productionGroth16ToolchainPreflightRef?.artifactRef === packetPath,
  "proof-format packet must reference the toolchain preflight",
);
assert(
  productionVk.status === "blocked-no-production-verifying-key-hash-artifact",
  "production VK must stay blocked",
);
assert(
  productionVk.productionGroth16ToolchainPreflightRef?.artifactRef === packetPath,
  "production VK packet must reference the toolchain preflight",
);
const groth16Option = options.backendOptions?.find((entry) => entry.id === "groth16-tag3-solana-v0");
assert(groth16Option?.toolchainPreflightRef?.artifactRef === packetPath, "backend option must reference preflight");
for (const marker of [
  "Production Groth16 Toolchain Preflight packet",
  "Sunspot/Gnark candidate artifact lane",
  "Sunspot/Gnark Route packet",
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json",
  "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json",
  "npm run zk:c01-production-groth16-toolchain-preflight-check",
  "npm run zk:c01-sunspot-groth16-route-check",
  "blocked-local-toolchain-no-groth16-scheme",
]) {
  includes(decision, marker, decisionPath);
}

for (const command of [
  "npm run zk:c01-sunspot-groth16-route-check",
  "npm run zk:c01-production-groth16-toolchain-preflight-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
]) {
  assert(packet.canonicalCommands.includes(command), `packet must record canonical command ${command}`);
}
for (const phrase of [
  "fail-closed local toolchain preflight",
  "does not generate the required Groth16 proof-format",
  "not production proof-format evidence",
  "not production verifying-key evidence",
]) {
  includes(packet.truthBoundary ?? "", phrase, "packet truth boundary");
}

console.log("private-pool-v2 C01 production Groth16 toolchain preflight: PASS");

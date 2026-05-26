import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { unpack } from "msgpackr";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath =
  "ops/mainnet/private-pool-v2-c01-current-source-sunspot-compile-attempt.evidence.json";
const routePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-route.evidence.json";
const preflightPath =
  "ops/mainnet/private-pool-v2-c01-production-groth16-toolchain-preflight.evidence.json";
const acquisitionPath = "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json";
const devProbePath = "ops/mainnet/private-pool-v2-c01-sunspot-groth16-dev-probe.evidence.json";
const currentSourceAcirPath =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.json";
const expectedCurrentAcirSha256 =
  "sha256:a55defde42c5afba61a9cd7e96f350a407a88417312ce811a7c9bb97279b74f9";
const expectedCurrentAcirBytecodeHash =
  "sha256:6ab8f6a90eb551bf02e1b313ede919a6e4aefd8740e70728cce641fdfc2c8d04";
const liveProbeEnvVar = "VANTA_C01_SUNSPOT_COMPILE_LIVE";
const sunspotBinEnvVar = "VANTA_C01_SUNSPOT_BIN";
const sunspotCompileAttemptEnvVar = "VANTA_C01_SUNSPOT_COMPILE_ATTEMPT";

function fail(message) {
  console.error(`private-pool-v2 C01 current-source Sunspot compile attempt: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function includes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

function sha256String(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function assertStringArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  for (const [index, entry] of value.entries()) {
    assert(typeof entry === "string", `${label}[${index}] must be a string`);
  }
}

function decodeCurrentBytecodeObservation() {
  const acir = readJson(currentSourceAcirPath);
  const bytes = gunzipSync(Buffer.from(acir.bytecode, "base64"));
  const msgpackValue = unpack(bytes.subarray(1));
  const firstFunction = msgpackValue?.[0]?.[0];

  return {
    noirVersion: acir.noir_version,
    acirBytecodeHash: sha256String(acir.bytecode),
    decompressedByteLength: bytes.byteLength,
    first32Hex: bytes.subarray(0, 32).toString("hex"),
    firstByteHex: bytes.subarray(0, 1).toString("hex"),
    firstEightBytesAsSunspotBeta18FunctionCount: bytes.readBigUInt64LE(0).toString(),
    messagePackTopLevelShape: Array.isArray(msgpackValue) ? `array[${msgpackValue.length}]` : typeof msgpackValue,
    mainFunctionName: firstFunction?.[0],
    mainCurrentWitnessIndex: firstFunction?.[1],
  };
}

function runOptionalLiveCompile(packet) {
  if (process.env[liveProbeEnvVar] !== "1") {
    return;
  }

  const sunspotBin = process.env[sunspotBinEnvVar];
  assert(sunspotBin, `${sunspotBinEnvVar} must be set when ${liveProbeEnvVar}=1`);
  assert(existsSync(sunspotBin), `${sunspotBinEnvVar} does not exist: ${sunspotBin}`);

  const attemptId = process.env[sunspotCompileAttemptEnvVar] ?? "local";
  assert(["local", "latest"].includes(attemptId), `${sunspotCompileAttemptEnvVar} must be local or latest`);
  const attempt =
    attemptId === "latest" ? packet.latestUpstreamSunspotCompileAttempt : packet.sunspotCompileAttempt;

  const workDir = attempt?.workDir;
  assert(typeof workDir === "string" && workDir.startsWith("/private/tmp/"), "live probe workDir must be under /private/tmp");
  mkdirSync(workDir, { recursive: true });
  copyFileSync(resolve(repoRoot, currentSourceAcirPath), resolve(workDir, "current-source-acir.json"));

  const result = spawnSync(sunspotBin, ["compile", "current-source-acir.json"], {
    cwd: workDir,
    encoding: "utf8",
    stdio: "pipe",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  assert(result.status === attempt?.exitCode, "live Sunspot compile exit code mismatch");
  includes(output, attempt.failure, "live Sunspot compile output");
  includes(output, "go/acir/program.go:27", "live Sunspot compile stack");
}

const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const route = readJson(routePath);
const preflight = readJson(preflightPath);
const acquisition = readJson(acquisitionPath);
const devProbe = readJson(devProbePath);
const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};

assert(
  scripts["zk:c01-current-source-sunspot-compile-attempt-check"] ===
    "node scripts/check-vanta-private-pool-v2-c01-current-source-sunspot-compile-attempt.mjs",
  "package.json must expose zk:c01-current-source-sunspot-compile-attempt-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:c01-current-source-sunspot-compile-attempt-check"),
    `${aggregate} must include the current-source Sunspot compile-attempt guard`,
  );
}

assert(packet.version === "vanta-private-pool-v2-c01-current-source-sunspot-compile-attempt-0.1", "schema mismatch");
assert(
  packet.status === "blocked-current-beta19-acir-bytecode-format-unsupported-by-sunspot-beta18-reader",
  "status mismatch",
);
assert(packet.selectedBackend === "groth16-tag3-solana-v0", "selected backend mismatch");
assert(packet.selectedBackendStatus === "selected-pending-production-evidence", "selected backend status mismatch");
assert(packet.routeId === "sunspot-noir-acir-gnark-groth16-solana-v0", "route id mismatch");
for (const marker of [
  "local beta18-era Sunspot reader",
  "latest observed upstream Sunspot main commit",
  "cannot compile it into CCS/proof/VK artifacts",
]) {
  includes(packet.purpose ?? "", marker, "packet purpose");
}
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(
  packet.secretPolicy ===
    "metadata-only-no-raw-proof-vk-witness-pk-keypair-secret-or-signed-transaction-bytes",
  "secret policy mismatch",
);
for (const forbidden of [
  "proofBytes",
  "proofHex",
  "verifyingKeyBytes",
  "vkBytes",
  "witnessBytes",
  "provingKeyBytes",
  "keypairBytes",
  "signedTransactionBytes",
  "-----BEGIN",
  "bearer ",
  "postgres://",
  "postgresql://",
]) {
  assert(!packetText.includes(forbidden), `packet must not contain forbidden marker ${forbidden}`);
}

assert(packet.routePacketRef === routePath, "route ref mismatch");
assert(packet.productionGroth16ToolchainPreflightRef === preflightPath, "preflight ref mismatch");
assert(packet.artifactAcquisitionPacketRef === acquisitionPath, "acquisition ref mismatch");
assert(packet.localSunspotGroth16DevProbeRef === devProbePath, "dev-probe ref mismatch");
assert(route.currentSourceSunspotCompileAttemptRef === packetPath, "route packet must reference current-source compile attempt");
assert(preflight.currentSourceSunspotCompileAttemptRef === packetPath, "preflight packet must reference current-source compile attempt");
assert(acquisition.currentSourceSunspotCompileAttemptRef === packetPath, "acquisition packet must reference current-source compile attempt");
assert(devProbe.routeId === packet.routeId, "dev-probe route mismatch");

const observed = decodeCurrentBytecodeObservation();
const sourceCircuit = packet.sourceCircuit ?? {};
assert(sourceCircuit.repoPath === "zk/noir/vanta_private_pool_v2_actual_private_spend_entry", "source repoPath mismatch");
assert(sourceCircuit.compiledAcirRef === currentSourceAcirPath, "source ACIR ref mismatch");
assert(sourceCircuit.compiledAcirByteLength === 1840868, "recorded source ACIR byte length mismatch");
assert(sourceCircuit.compiledAcirSha256 === expectedCurrentAcirSha256, "recorded source ACIR hash mismatch");
assert(sourceCircuit.compiledAcirBytecodeHash === expectedCurrentAcirBytecodeHash, "source ACIR bytecode hash mismatch");
assert(observed.acirBytecodeHash === sourceCircuit.compiledAcirBytecodeHash, "current source ACIR bytecode hash mismatch");
assert(sourceCircuit.noirVersion === "1.0.0-beta.19", "source Noir version mismatch");
assert(sourceCircuit.publicInputLabel === "private-spend-public-input-hash", "source public input label mismatch");
for (const marker of ["current repo source ACIR", "beta18 shim artifacts", "do not match"]) {
  includes(sourceCircuit.truthBoundary ?? "", marker, "sourceCircuit truth boundary");
}

const currentObservation = packet.currentSourceBytecodeObservation ?? {};
assert(currentObservation.encoding === "base64-gzip-bytecode", "current bytecode encoding mismatch");
assert(currentObservation.decompressedByteLength === observed.decompressedByteLength, "current bytecode decompressed length mismatch");
assert(currentObservation.first32Hex === observed.first32Hex, "current bytecode first32 mismatch");
assert(currentObservation.firstByteHex === observed.firstByteHex, "current bytecode first byte mismatch");
assert(currentObservation.messagePackPayloadOffset === 1, "MessagePack payload offset mismatch");
assert(currentObservation.messagePackTopLevelShape === observed.messagePackTopLevelShape, "MessagePack shape mismatch");
assert(currentObservation.mainFunctionName === observed.mainFunctionName, "main function name mismatch");
assert(currentObservation.mainCurrentWitnessIndex === observed.mainCurrentWitnessIndex, "main witness index mismatch");
assert(
  currentObservation.firstEightBytesAsSunspotBeta18FunctionCount ===
    observed.firstEightBytesAsSunspotBeta18FunctionCount,
  "Sunspot beta18 function-count interpretation mismatch",
);
for (const marker of [
  "version-prefixed MessagePack-like data",
  "old binary layout",
  "little-endian function count",
]) {
  includes(currentObservation.formatBoundary ?? "", marker, "current bytecode format boundary");
}

const beta18 = packet.beta18ComparisonBytecodeObservation ?? {};
assert(beta18.compiledAcirSha256 === "sha256:5e0e27752ff1c0f01d318323083b168c1309c0c84521401531b42d07033c68bf", "beta18 ACIR hash mismatch");
assert(beta18.decompressedByteLength === 6276628, "beta18 decompressed byte length mismatch");
assert(
  beta18.first32Hex === "010000000000000004000000000000006d61696eca8a0100d03b000000000000",
  "beta18 first32 mismatch",
);
assert(beta18.firstEightBytesAsSunspotBeta18FunctionCount === "1", "beta18 function count mismatch");
assert(beta18.matchesRequiredCurrentSourceAcir === false, "beta18 comparison must not match current source");
assert(beta18.satisfiesProductionSourceLineage === false, "beta18 comparison must not satisfy source lineage");
for (const marker of [
  "bytecode layout Sunspot can parse",
  "does not match the current required source ACIR hash",
  "cannot satisfy production source lineage",
]) {
  includes(beta18.truthBoundary ?? "", marker, "beta18 comparison truth boundary");
}

const attempt = packet.sunspotCompileAttempt ?? {};
assert(attempt.toolchainSourceRef === "https://github.com/reilabs/sunspot", "Sunspot source ref mismatch");
assert(attempt.sunspotCommit === "3a260ebe4edb36ab52e497aa383a2bac71525577", "Sunspot commit mismatch");
assert(attempt.localBinaryRef === "/private/tmp/vanta-c01-sunspot-lane/bin/sunspot", "Sunspot local binary ref mismatch");
assert(attempt.workDir === "/private/tmp/vanta-c01-current-sunspot-probe", "Sunspot workDir mismatch");
assert(attempt.command === "/private/tmp/vanta-c01-sunspot-lane/bin/sunspot compile current-source-acir.json", "Sunspot command mismatch");
assert(
  attempt.optionalLiveValidationCommand ===
    "VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-lane/bin/sunspot VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check",
  "optional live validation command mismatch",
);
assert(attempt.status === "failed-expected-current-source", "Sunspot attempt status mismatch");
assert(attempt.exitCode === 2, "Sunspot attempt exit code mismatch");
includes(attempt.failure ?? "", "makeslice: len out of range", "Sunspot attempt failure");
includes(attempt.stackTop ?? "", "program.go:27", "Sunspot attempt stack top");
for (const marker of [
  "first eight decompressed bytecode bytes",
  "beta18 little-endian function count",
  "current beta19 ACIR bytecode",
  "version-prefixed MessagePack-like data",
]) {
  includes(attempt.rootCause ?? "", marker, "Sunspot attempt root cause");
}
assert(attempt.satisfiesProductionArtifactGeneration === false, "Sunspot attempt must not satisfy production generation");

const latestAttempt = packet.latestUpstreamSunspotCompileAttempt ?? {};
assert(latestAttempt.toolchainSourceRef === "https://github.com/reilabs/sunspot", "latest Sunspot source ref mismatch");
assert(
  latestAttempt.upstreamHeadObservedBy === "git ls-remote https://github.com/reilabs/sunspot.git HEAD",
  "latest Sunspot upstream observation command mismatch",
);
assert(
  latestAttempt.sunspotCommit === "e29fd6586f9a9f936ace0d71c103f5a4e9d9db76",
  "latest Sunspot commit mismatch",
);
assert(latestAttempt.commitSubject === "recursive agregation/ecdsa/msm fixes", "latest Sunspot commit subject mismatch");
assert(latestAttempt.sourceReadmeRequiresNoir === "1.0.0-beta.18", "latest Sunspot README Noir requirement mismatch");
assert(
  latestAttempt.sourceProgramReaderMode === "little-endian uint64 function-count before circuits",
  "latest Sunspot reader mode mismatch",
);
includes(latestAttempt.sourceProgramReaderStackRef ?? "", "program.go:27", "latest Sunspot reader stack ref");
assert(latestAttempt.localCloneRef === "/private/tmp/vanta-c01-sunspot-latest-e29fd658", "latest Sunspot clone ref mismatch");
assert(
  latestAttempt.localBinaryRef === "/private/tmp/vanta-c01-sunspot-latest-e29fd658/go/sunspot",
  "latest Sunspot binary ref mismatch",
);
assert(
  latestAttempt.localBinarySha256 === "sha256:a286c16b3be9339934f6af350726df29a77af0f34d4c84aeb00d962d690e08d5",
  "latest Sunspot binary hash mismatch",
);
assert(latestAttempt.goVersion === "go version go1.26.2 darwin/arm64", "latest Sunspot build Go version mismatch");
assert(latestAttempt.workDir === "/private/tmp/vanta-c01-latest-sunspot-probe", "latest Sunspot workDir mismatch");
assert(
  latestAttempt.command ===
    "/private/tmp/vanta-c01-sunspot-latest-e29fd658/go/sunspot compile current-source-acir.json",
  "latest Sunspot command mismatch",
);
assert(
  latestAttempt.optionalLiveValidationCommand ===
    "VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-latest-e29fd658/go/sunspot VANTA_C01_SUNSPOT_COMPILE_ATTEMPT=latest VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check",
  "latest Sunspot optional live validation command mismatch",
);
assert(
  latestAttempt.status === "failed-expected-current-source-latest-upstream",
  "latest Sunspot attempt status mismatch",
);
assert(latestAttempt.exitCode === 2, "latest Sunspot attempt exit code mismatch");
includes(latestAttempt.failure ?? "", "makeslice: len out of range", "latest Sunspot attempt failure");
includes(latestAttempt.stackTop ?? "", "program.go:27", "latest Sunspot attempt stack top");
for (const marker of [
  "latest observed upstream Sunspot main commit",
  "first eight decompressed bytecode bytes",
  "beta18 little-endian function count",
  "current beta19 ACIR bytecode",
  "version-prefixed MessagePack-like data",
]) {
  includes(latestAttempt.rootCause ?? "", marker, "latest Sunspot attempt root cause");
}
assert(
  latestAttempt.satisfiesProductionArtifactGeneration === false,
  "latest Sunspot attempt must not satisfy production generation",
);

assertStringArray(packet.requiredResolutionBeforeProductionArtifactAcceptance, "requiredResolutionBeforeProductionArtifactAcceptance");
for (const requirement of [
  "reviewed Sunspot/Gnark toolchain that supports the current Noir 1.0.0-beta.19 ACIR bytecode format; latest observed upstream Sunspot main e29fd6586f9a9f936ace0d71c103f5a4e9d9db76 still does not",
  "or reviewed/pinned source migration that keeps the production circuit ACIR hash consistent with the accepted bundle",
  "deterministic CCS/proof/public-witness/VK artifacts generated from the accepted current source ACIR",
  "reviewed production trusted setup ceremony or equivalent toxic-waste mitigation",
  "reviewer acceptance of the public-input binding and generated verifier adapter boundary",
]) {
  assert(
    packet.requiredResolutionBeforeProductionArtifactAcceptance.includes(requirement),
    `missing required resolution ${requirement}`,
  );
}

assert(packet.satisfiesRequiredPositiveEvidence?.backendSelection === true, "backend selection must remain true");
assert(
  packet.satisfiesRequiredPositiveEvidence?.currentSourceSunspotCompileAttempt === true,
  "current-source compile attempt must be recorded",
);
for (const field of [
  "actualPrivateSpendProductionProofFormat",
  "privateSpendPublicInputHashBinding",
  "productionVerifyingKeyHash",
  "verifierAdapter",
  "acceptedProofMutatesStateTest",
  "invalidProofLeavesAccountsUnchangedTest",
  "wrongPublicInputHashLeavesAccountsUnchangedTest",
  "wrongVerifyingKeyLeavesAccountsUnchangedTest",
  "sbfLiveLineage",
  "auditReviewerAcceptance",
]) {
  assert(packet.satisfiesRequiredPositiveEvidence?.[field] === false, `${field} must remain false`);
}
assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:c01-current-source-sunspot-compile-attempt-check",
  "VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-lane/bin/sunspot VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check",
  "VANTA_C01_SUNSPOT_BIN=/private/tmp/vanta-c01-sunspot-latest-e29fd658/go/sunspot VANTA_C01_SUNSPOT_COMPILE_ATTEMPT=latest VANTA_C01_SUNSPOT_COMPILE_LIVE=1 npm run zk:c01-current-source-sunspot-compile-attempt-check",
  "npm run zk:c01-sunspot-groth16-route-check",
  "npm run zk:c01-sunspot-gnark-artifact-acquisition-check",
  "npm run zk:c01-production-artifact-acceptance-gate-check",
]) {
  assert(packet.canonicalCommands.includes(command), `missing canonical command ${command}`);
}
for (const marker of [
  "current-source blocker evidence",
  "local Sunspot beta18-era reader and the latest observed upstream Sunspot main commit cannot compile the current beta19 source ACIR",
  "not production proof-format evidence",
  "not production VK/hash evidence",
  "not verifier-adapter acceptance",
  "not SBF/live lineage",
  "not audit/reviewer acceptance",
  "not C01 closure",
]) {
  includes(packet.truthBoundary ?? "", marker, "packet truth boundary");
}

runOptionalLiveCompile(packet);

console.log("private-pool-v2 C01 current-source Sunspot compile attempt: PASS");

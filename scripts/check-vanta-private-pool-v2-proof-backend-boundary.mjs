import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 proof backend boundary: FAIL - ${message}`);
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
const types = read("src/privacy/privatePoolV2Types.ts");
const localProver = read("src/privacy/privatePoolV2LocalProver.ts");
const localVerifier = read("src/privacy/privatePoolV2LocalVerifierRegistry.ts");
const remoteServices = read("src/privacy/privatePoolV2RemoteServices.ts");
const protocolClient = read("src/privacy/privatePoolV2ProtocolSettlementClient.ts");
const operatorServer = read("operator/private-pool-v2-server.mjs");
const serviceNetwork = read("operator/private-pool-v2-service-network.mjs");
const proofArtifact = read("operator/private-pool-v2-proof-artifact.mjs");
const proofScript = read("scripts/prove-vanta-private-pool-v2-circuit.mjs");
const sendArtifactCheck = read("scripts/check-vanta-private-pool-v2-send-proof-artifact-consistency.mjs");
const actualPrivateSpendArtifactCheck = read(
  "scripts/check-vanta-private-pool-v2-actual-private-spend-proof-artifact-consistency.mjs",
);
const sendNoWitnessCheck = read("scripts/check-vanta-private-pool-v2-send-operator-no-witness.mjs");
const mockBoundary = read("scripts/check-vanta-private-pool-v2-mock-proof-boundary.mjs");

for (const backend of ["local-mock", "local-bb-fixture-artifact", "remote-service"]) {
  includes(types, `"${backend}"`, "privatePoolV2Types proof backend union");
}
includes(types, "proofBackend?: VantaPrivatePoolV2ProofBackend", "privatePoolV2Types proof result/receipt contracts");
includes(types, "VantaPrivatePoolV2SendProofArtifact", "privatePoolV2Types Send proof artifact contract");
includes(
  types,
  "VantaPrivatePoolV2ActualPrivateSpendProofArtifact",
  "privatePoolV2Types Actual Private Spend proof artifact contract",
);
includes(types, "VantaPrivatePoolV2ProofArtifactVerificationReceipt", "privatePoolV2Types proof artifact receipt contract");

includes(localProver, 'VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_BACKEND =\n  "local-mock"', "local prover");
includes(localProver, "proof.proofBackend === expected.proofBackend", "local prover verification");
includes(localVerifier, "proofBackend?: VantaPrivatePoolV2ProofBackend", "local verifier receipt type");
includes(localVerifier, "proofBackend: proof.proofBackend", "local verifier receipt write");

includes(remoteServices, "VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_BACKEND", "remote services");
includes(remoteServices, "normalizeRemoteProofBackend", "remote services proof backend normalization");
includes(remoteServices, "normalizeRemoteProofSystem", "remote services production proof-system normalization");
includes(remoteServices, "assertRemoteProductionProofResult", "remote services verifier proof backend guard");
includes(remoteServices, "assertNoRemoteProofWitnessMaterial", "remote services no-witness request guard");
includes(remoteServices, "Private Pool v2 remote services require proofBackend=remote-service.", "remote services local backend rejection");
includes(remoteServices, "Private Pool v2 remote services require a production proof system", "remote services mock proof-system rejection");

includes(protocolClient, 'proofBackend === "remote-service"', "protocol client production validation");
includes(
  protocolClient,
  "Private Pool v2 production settlement validation requires a remote proof backend.",
  "protocol client production validation message",
);

includes(operatorServer, "productionProofBackendSet", "operator production backend set");
includes(operatorServer, "requires a remote production proof backend", "operator production backend rejection");
includes(operatorServer, "acceptedProductionProofBackends", "operator status proof trust boundary");
includes(operatorServer, "/private-pool-v2/proof-artifacts/verify", "operator Send proof artifact no-witness route");
includes(operatorServer, "strict no-witness proof-artifact mode rejects", "operator Send proof artifact no-witness rejection");
includes(serviceNetwork, "proofBackend", "service network proof metadata");
includes(proofArtifact, "verifyVantaPrivatePoolV2SendProofArtifact", "Private Pool v2 Send proof artifact verifier");
includes(
  proofArtifact,
  "verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact",
  "Private Pool v2 Actual Private Spend proof artifact verifier",
);
includes(proofArtifact, "assertVantaPrivatePoolV2SendProofArtifactHasNoWitnessMaterial", "Private Pool v2 Send no-witness guard");
includes(
  proofArtifact,
  "assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial",
  "Private Pool v2 generic no-witness guard",
);
includes(proofArtifact, "forbiddenNoWitnessNormalizedKeys", "Private Pool v2 Send no-witness alias guard");
includes(proofArtifact, "publicInputCommitment mismatch", "Private Pool v2 Send public-input binding guard");
includes(proofArtifact, "acirBytecodeHash mismatch", "Private Pool v2 Send ACIR bytecode hash guard");
includes(proofArtifact, "verifyingKeyHash mismatch", "Private Pool v2 Send verifying-key hash guard");
includes(proofScript, 'proofBackend: "local-bb-fixture-artifact"', "local bb fixture proof artifact metadata");
includes(proofScript, 'proofSystem: "noir-bb"', "local bb fixture proof system metadata");
includes(proofScript, "noWitnessProofArtifact", "no-witness proof artifact sidecar condition");
includes(proofScript, "witnessSource", "legacy non-Send proof sidecar marker");
includes(proofScript, "bytecodeSource", "legacy non-Send bytecode sidecar marker");
includes(proofScript, "private-spend-public-input-hash", "Actual Private Spend proof artifact public input label");
includes(sendArtifactCheck, "tampered public input rejection", "Send proof artifact tampered public input guard");
includes(sendArtifactCheck, "verifyingKeyHash tamper rejection", "Send proof artifact verifying-key tamper guard");
includes(sendArtifactCheck, "privateInputs alias rejection", "Send proof artifact no-witness alias guard");
includes(sendArtifactCheck, "witness sidecar rejection", "Send proof artifact witness sidecar guard");
includes(
  actualPrivateSpendArtifactCheck,
  "tampered public input rejection",
  "Actual Private Spend proof artifact tampered public input guard",
);
includes(
  actualPrivateSpendArtifactCheck,
  "public input label relabel rejection",
  "Actual Private Spend proof artifact public input label guard",
);
includes(
  actualPrivateSpendArtifactCheck,
  "verifyingKeyHash tamper rejection",
  "Actual Private Spend proof artifact verifying-key tamper guard",
);
includes(
  actualPrivateSpendArtifactCheck,
  "privateInputs alias rejection",
  "Actual Private Spend proof artifact no-witness alias guard",
);
includes(
  actualPrivateSpendArtifactCheck,
  "witness sidecar rejection",
  "Actual Private Spend proof artifact witness sidecar guard",
);
includes(sendNoWitnessCheck, "mixed witnessPackage rejection", "Send proof artifact operator mixed witness guard");
includes(sendNoWitnessCheck, "nested witness alias rejection", "Send proof artifact operator nested witness alias guard");
includes(sendNoWitnessCheck, "production local artifact rejection", "Send proof artifact production backend guard");
includes(mockBoundary, "spoofed-local-backend-proof-boundary", "mock boundary spoofed proof-backend case");
includes(
  read("scripts/check-vanta-private-pool-v2-remote-services.mjs"),
  "remote prover local proofBackend response",
  "remote services proof-backend rejection test",
);
includes(
  read("scripts/check-vanta-private-pool-v2-remote-services.mjs"),
  "remote prover witness sidecar request",
  "remote services no-witness request test",
);
includes(
  read("scripts/check-vanta-private-pool-v2-remote-services.mjs"),
  "remote proof verification local proofBackend request",
  "remote services proof verification backend rejection test",
);
includes(
  read("scripts/check-vanta-private-pool-v2-remote-services.mjs"),
  "remote verifier local proofBackend response",
  "remote services verifier response backend rejection test",
);

assert(
  scripts["private-pool-v2:proof-backend-boundary-check"] ===
    "node scripts/check-vanta-private-pool-v2-proof-backend-boundary.mjs",
  "package.json must expose private-pool-v2:proof-backend-boundary-check",
);
assert(
  scripts["private-pool-v2:send-proof-artifact-consistency-check"] ===
    "node scripts/check-vanta-private-pool-v2-send-proof-artifact-consistency.mjs",
  "package.json must expose private-pool-v2:send-proof-artifact-consistency-check",
);
assert(
  scripts["private-pool-v2:actual-private-spend-proof-artifact-consistency-check"] ===
    "node scripts/check-vanta-private-pool-v2-actual-private-spend-proof-artifact-consistency.mjs",
  "package.json must expose private-pool-v2:actual-private-spend-proof-artifact-consistency-check",
);
assert(
  scripts["private-pool-v2:send-operator-no-witness-check"] ===
    "node scripts/check-vanta-private-pool-v2-send-operator-no-witness.mjs",
  "package.json must expose private-pool-v2:send-operator-no-witness-check",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:proof-backend-boundary-check"),
  "private-pool-v2:verify must include the proof backend boundary guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:send-proof-artifact-consistency-check"),
  "private-pool-v2:verify must include the Send proof artifact consistency guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes(
    "npm run private-pool-v2:actual-private-spend-proof-artifact-consistency-check",
  ),
  "private-pool-v2:verify must include the Actual Private Spend proof artifact consistency guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:send-operator-no-witness-check"),
  "private-pool-v2:verify must include the Send operator no-witness guard",
);

console.log("private-pool-v2 proof backend boundary: PASS");

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
const proofScript = read("scripts/prove-vanta-private-pool-v2-circuit.mjs");
const mockBoundary = read("scripts/check-vanta-private-pool-v2-mock-proof-boundary.mjs");

for (const backend of ["local-mock", "local-bb-fixture-artifact", "remote-service"]) {
  includes(types, `"${backend}"`, "privatePoolV2Types proof backend union");
}
includes(types, "proofBackend?: VantaPrivatePoolV2ProofBackend", "privatePoolV2Types proof result/receipt contracts");

includes(localProver, 'VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_BACKEND =\n  "local-mock"', "local prover");
includes(localProver, "proof.proofBackend === expected.proofBackend", "local prover verification");
includes(localVerifier, "proofBackend?: VantaPrivatePoolV2ProofBackend", "local verifier receipt type");
includes(localVerifier, "proofBackend: proof.proofBackend", "local verifier receipt write");

includes(remoteServices, "VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_BACKEND", "remote services");
includes(remoteServices, "proofBackend: VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_BACKEND", "remote services proof normalization");

includes(protocolClient, 'proofBackend === "remote-service"', "protocol client production validation");
includes(
  protocolClient,
  "Private Pool v2 production settlement validation requires a remote proof backend.",
  "protocol client production validation message",
);

includes(operatorServer, "productionProofBackendSet", "operator production backend set");
includes(operatorServer, "requires a remote production proof backend", "operator production backend rejection");
includes(operatorServer, "acceptedProductionProofBackends", "operator status proof trust boundary");
includes(serviceNetwork, "proofBackend", "service network proof metadata");
includes(proofScript, 'proofBackend: "local-bb-fixture-artifact"', "local bb fixture proof artifact metadata");
includes(mockBoundary, "spoofed-local-backend-proof-boundary", "mock boundary spoofed proof-backend case");

assert(
  scripts["private-pool-v2:proof-backend-boundary-check"] ===
    "node scripts/check-vanta-private-pool-v2-proof-backend-boundary.mjs",
  "package.json must expose private-pool-v2:proof-backend-boundary-check",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:proof-backend-boundary-check"),
  "private-pool-v2:verify must include the proof backend boundary guard",
);

console.log("private-pool-v2 proof backend boundary: PASS");

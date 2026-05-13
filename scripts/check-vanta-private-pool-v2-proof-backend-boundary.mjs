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
const shieldArtifactCheck = read("scripts/check-vanta-private-pool-v2-shield-proof-artifact-consistency.mjs");
const shieldNoWitnessCheck = read("scripts/check-vanta-private-pool-v2-shield-operator-no-witness.mjs");
const claimArtifactCheck = read("scripts/check-vanta-private-pool-v2-claim-proof-artifact-consistency.mjs");
const swapToShieldedArtifactCheck = read(
  "scripts/check-vanta-private-pool-v2-swap-to-shielded-proof-artifact-consistency.mjs",
);
const sendArtifactCheck = read("scripts/check-vanta-private-pool-v2-send-proof-artifact-consistency.mjs");
const actualPrivateSpendArtifactCheck = read(
  "scripts/check-vanta-private-pool-v2-actual-private-spend-proof-artifact-consistency.mjs",
);
const claimNoWitnessCheck = read("scripts/check-vanta-private-pool-v2-claim-operator-no-witness.mjs");
const swapToShieldedNoWitnessCheck = read(
  "scripts/check-vanta-private-pool-v2-swap-to-shielded-operator-no-witness.mjs",
);
const sendNoWitnessCheck = read("scripts/check-vanta-private-pool-v2-send-operator-no-witness.mjs");
const actualPrivateSpendNoWitnessCheck = read(
  "scripts/check-vanta-private-pool-v2-actual-private-spend-operator-no-witness.mjs",
);
const localBbFixtureProverCheck = read(
  "scripts/check-vanta-private-pool-v2-local-bb-fixture-prover.mjs",
);
const actualPrivateSpendWitnessProverCheck = read(
  "scripts/check-vanta-private-pool-v2-actual-private-spend-witness-prover.mjs",
);
const sendWitnessProverCheck = read(
  "scripts/check-vanta-private-pool-v2-send-witness-prover.mjs",
);
const remoteProofArtifactBoundary = read(
  "scripts/check-vanta-private-pool-v2-remote-proof-artifact-boundary.mjs",
);
const mockBoundary = read("scripts/check-vanta-private-pool-v2-mock-proof-boundary.mjs");

for (const backend of [
  "local-mock",
  "local-bb-fixture-artifact",
  "local-bb-derived-artifact",
  "remote-service",
]) {
  includes(types, `"${backend}"`, "privatePoolV2Types proof backend union");
}
includes(types, "proofBackend?: VantaPrivatePoolV2ProofBackend", "privatePoolV2Types proof result/receipt contracts");
includes(types, "VantaPrivatePoolV2ShieldProofArtifact", "privatePoolV2Types Shield proof artifact contract");
includes(types, "VantaPrivatePoolV2ClaimProofArtifact", "privatePoolV2Types Claim proof artifact contract");
includes(
  types,
  "VantaPrivatePoolV2SwapToShieldedProofArtifact",
  "privatePoolV2Types Swap-to-shielded proof artifact contract",
);
includes(types, "VantaPrivatePoolV2SendProofArtifact", "privatePoolV2Types Send proof artifact contract");
includes(
  types,
  "VantaPrivatePoolV2ActualPrivateSpendProofArtifact",
  "privatePoolV2Types Actual Private Spend proof artifact contract",
);
includes(types, "VantaPrivatePoolV2ProofArtifactVerificationReceipt", "privatePoolV2Types proof artifact receipt contract");
includes(types, "VantaPrivatePoolV2OnChainVerifierEvidence", "privatePoolV2Types proof artifact on-chain verifier evidence contract");
includes(
  types,
  "onChainVerifierTarget: VantaPrivatePoolV2OnChainVerifierTarget",
  "privatePoolV2Types proof artifact on-chain verifier target contract",
);

includes(localProver, 'VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_BACKEND =\n  "local-mock"', "local prover");
includes(localProver, "proof.proofBackend === expected.proofBackend", "local prover verification");
includes(localProver, "VantaPrivatePoolV2LocalBbFixtureProver", "local bb fixture prover");
includes(localProver, "createVantaPrivatePoolV2LocalBbFixtureProver", "local bb fixture prover factory");
includes(localProver, "local-bb-fixture-artifact", "local bb fixture proof backend");
includes(localProver, "local-bb-derived-artifact", "local bb derived proof backend");
includes(localProver, "private-spend-public-input-hash", "local bb fixture public input binding");
includes(localProver, "send-public-input-hash", "local bb fixture Send public input binding");
includes(localProver, "fixtureProofRequest", "local bb fixture proof request binding");
includes(localProver, "request transcript must match the fixture proof request", "local bb fixture full request transcript binding");
includes(
  localProver,
  "derived actual-private-spend and Send artifacts are generated by the local Node proof script",
  "local bb derived artifact truth warning",
);
includes(localVerifier, "proofBackend?: VantaPrivatePoolV2ProofBackend", "local verifier receipt type");
includes(localVerifier, "proofBackend: proof.proofBackend", "local verifier receipt write");

includes(remoteServices, "VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_BACKEND", "remote services");
includes(remoteServices, "normalizeRemoteProofBackend", "remote services proof backend normalization");
includes(remoteServices, "normalizeRemoteProofSystem", "remote services production proof-system normalization");
includes(remoteServices, "assertRemoteProductionProofResult", "remote services verifier proof backend guard");
includes(
  remoteServices,
  "assertRemoteProductionVerifyingKeyId",
  "remote services production verifying-key id guard",
);
includes(
  remoteServices,
  "assertRemoteProofArtifactReceiptMatchesRequest",
  "remote services proof-artifact receipt transcript binding guard",
);
includes(
  remoteServices,
  "VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_ARTIFACT_TRANSCRIPT_FIELDS",
  "remote services proof-artifact transcript field list",
);
includes(
  remoteServices,
  "assertNoC01VerifierReadyOverclaim",
  "remote services C01 verifier-ready overclaim guard",
);
includes(
  remoteServices,
  "offchain-remote-proof-artifact-only",
  "remote services offchain-only proof-artifact evidence marker",
);
includes(
  remoteServices,
  "solana-c01-groth16-verifier-ready",
  "remote services Solana C01 verifier-ready evidence marker",
);
includes(
  remoteServices,
  "wire the Solana tag3 Groth16 verifier adapter before enabling this claim",
  "remote services C01 verifier-ready fail-closed message",
);
includes(
  remoteServices,
  "local-acir-bytecode:",
  "remote services relabelled local fixture key-id rejection",
);
includes(
  remoteServices,
  "verifyProofArtifact",
  "remote services proof-artifact verifier method",
);
includes(
  remoteServices,
  "production-verifying-key-hash",
  "remote services production verifying-key hash guard",
);
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
includes(operatorServer, "/private-pool-v2/proof-artifacts/verify", "operator proof artifact no-witness route");
includes(operatorServer, "strict no-witness proof-artifact mode rejects", "operator proof artifact no-witness rejection");
includes(
  operatorServer,
  "requires proofBackend=remote-service",
  "operator production proof-artifact remote backend guard",
);
includes(
  operatorServer,
  "runtime.verifierRegistry?.verifyProofArtifact",
  "operator remote proof-artifact verifier delegation",
);
includes(
  operatorServer,
  "verifyPrivatePoolV2ProofArtifactForOperator",
  "operator proof artifact circuit dispatcher",
);
includes(
  operatorServer,
  "verifyVantaPrivatePoolV2ShieldProofArtifact",
  "operator Shield proof artifact verifier",
);
includes(
  operatorServer,
  "verifyVantaPrivatePoolV2SwapToShieldedProofArtifact",
  "operator Swap-to-shielded proof artifact verifier",
);
includes(
  operatorServer,
  "expectedPublicInputs.shieldPublicInputHash",
  "operator Shield expected public-input binding",
);
includes(
  operatorServer,
  "rejects unexpected expectedPublicInputs",
  "operator proof artifact expected public-input allowlist",
);
includes(
  operatorServer,
  "expectedPublicInputs.privateSpendPublicInputHash",
  "operator Actual Private Spend expected public-input binding",
);
includes(
  operatorServer,
  "expectedPublicInputs.sendPublicInputHash",
  "operator Send expected public-input binding",
);
includes(
  operatorServer,
  "expectedPublicInputs.claimPublicInputHash",
  "operator Claim expected public-input binding",
);
includes(
  operatorServer,
  "expectedPublicInputs.swapPublicInputHash",
  "operator Swap-to-shielded expected public-input binding",
);
includes(operatorServer, "sendPublicInputHash mismatch", "operator Send expected public-input mismatch guard");
includes(operatorServer, "shieldPublicInputHash mismatch", "operator Shield expected public-input mismatch guard");
includes(operatorServer, "claimPublicInputHash mismatch", "operator Claim expected public-input mismatch guard");
includes(
  operatorServer,
  "swapPublicInputHash mismatch",
  "operator Swap-to-shielded expected public-input mismatch guard",
);
includes(serviceNetwork, "proofBackend", "service network proof metadata");
includes(proofArtifact, "verifyVantaPrivatePoolV2ShieldProofArtifact", "Private Pool v2 Shield proof artifact verifier");
includes(proofArtifact, "verifyVantaPrivatePoolV2ClaimProofArtifact", "Private Pool v2 Claim proof artifact verifier");
includes(
  proofArtifact,
  "verifyVantaPrivatePoolV2SwapToShieldedProofArtifact",
  "Private Pool v2 Swap-to-shielded proof artifact verifier",
);
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
includes(
  proofArtifact,
  'onChainVerifierEvidence: "offchain-remote-proof-artifact-only"',
  "Private Pool v2 local proof artifact offchain-only evidence marker",
);
includes(
  proofArtifact,
  'onChainVerifierTarget: "none"',
  "Private Pool v2 local proof artifact no on-chain target marker",
);
includes(proofArtifact, "forbiddenNoWitnessNormalizedKeys", "Private Pool v2 Send no-witness alias guard");
includes(proofArtifact, "publicInputCommitment mismatch", "Private Pool v2 Send public-input binding guard");
includes(proofArtifact, "acirBytecodeHash mismatch", "Private Pool v2 Send ACIR bytecode hash guard");
includes(proofArtifact, "verifyingKeyHash mismatch", "Private Pool v2 Send verifying-key hash guard");
includes(proofScript, 'proofBackend =\n  witnessJsonPath === null ? "local-bb-fixture-artifact" : "local-bb-derived-artifact"', "local bb proof artifact metadata");
includes(proofScript, "--witness-json", "actual-private-spend witness input proof option");
includes(proofScript, 'proofSystem: "noir-bb"', "local bb fixture proof system metadata");
includes(proofScript, "noWitnessProofArtifact", "no-witness proof artifact sidecar condition");
includes(proofScript, "witnessSource", "legacy non-Send proof sidecar marker");
includes(proofScript, "bytecodeSource", "legacy non-Send bytecode sidecar marker");
includes(proofScript, "shield-public-input-hash", "Shield proof artifact public input label");
includes(proofScript, "claim-public-input-hash", "Claim proof artifact public input label");
includes(proofScript, "swap-public-input-hash", "Swap-to-shielded proof artifact public input label");
includes(proofScript, "send-public-input-hash", "Send proof artifact public input label");
includes(proofScript, "private-spend-public-input-hash", "Actual Private Spend proof artifact public input label");
includes(shieldArtifactCheck, "tampered public input rejection", "Shield proof artifact tampered public input guard");
includes(shieldArtifactCheck, "circuit relabel rejection", "Shield proof artifact circuit relabel guard");
includes(shieldArtifactCheck, "proofSystem relabel rejection", "Shield proof artifact proof-system relabel guard");
includes(shieldArtifactCheck, "backend relabel rejection", "Shield proof artifact backend relabel guard");
includes(shieldArtifactCheck, "public input label relabel rejection", "Shield proof artifact public-input label guard");
includes(shieldArtifactCheck, "verifyingKeyHash tamper rejection", "Shield proof artifact verifying-key tamper guard");
includes(shieldArtifactCheck, "privateInputs alias rejection", "Shield proof artifact no-witness alias guard");
includes(shieldArtifactCheck, "witness sidecar rejection", "Shield proof artifact witness sidecar guard");
includes(
  shieldNoWitnessCheck,
  "Shield proof artifact no-witness acceptance",
  "Shield proof artifact operator acceptance guard",
);
includes(
  shieldNoWitnessCheck,
  "Shield proof artifact read-only receipt state",
  "Shield proof artifact read-only receipt guard",
);
includes(
  shieldNoWitnessCheck,
  "Shield missing expected public input rejection",
  "Shield proof artifact expected public-input required guard",
);
includes(
  shieldNoWitnessCheck,
  "Shield mismatched expected public input rejection",
  "Shield proof artifact expected public-input mismatch guard",
);
includes(
  shieldNoWitnessCheck,
  "Shield mixed Shield and Send expected input rejection",
  "Shield proof artifact mixed expected-input guard",
);
includes(
  shieldNoWitnessCheck,
  "Shield unknown expected public input rejection",
  "Shield proof artifact unknown expected-input guard",
);
includes(
  shieldNoWitnessCheck,
  "Send artifact cannot satisfy Shield expected input",
  "Shield proof artifact Send relabel guard",
);
includes(
  shieldNoWitnessCheck,
  "production local artifact rejection",
  "Shield proof artifact production backend guard",
);
includes(claimArtifactCheck, "tampered public input rejection", "Claim proof artifact tampered public input guard");
includes(claimArtifactCheck, "circuit relabel rejection", "Claim proof artifact circuit relabel guard");
includes(claimArtifactCheck, "proofSystem relabel rejection", "Claim proof artifact proof-system relabel guard");
includes(claimArtifactCheck, "backend relabel rejection", "Claim proof artifact backend relabel guard");
includes(claimArtifactCheck, "public input label relabel rejection", "Claim proof artifact public-input label guard");
includes(claimArtifactCheck, "verifyingKeyHash tamper rejection", "Claim proof artifact verifying-key tamper guard");
includes(claimArtifactCheck, "privateInputs alias rejection", "Claim proof artifact no-witness alias guard");
includes(claimArtifactCheck, "witness sidecar rejection", "Claim proof artifact witness sidecar guard");
includes(
  swapToShieldedArtifactCheck,
  "tampered public input rejection",
  "Swap-to-shielded proof artifact tampered public input guard",
);
includes(
  swapToShieldedArtifactCheck,
  "circuit relabel rejection",
  "Swap-to-shielded proof artifact circuit relabel guard",
);
includes(
  swapToShieldedArtifactCheck,
  "proofSystem relabel rejection",
  "Swap-to-shielded proof artifact proof-system relabel guard",
);
includes(
  swapToShieldedArtifactCheck,
  "backend relabel rejection",
  "Swap-to-shielded proof artifact backend relabel guard",
);
includes(
  swapToShieldedArtifactCheck,
  "public input label relabel rejection",
  "Swap-to-shielded proof artifact public-input label guard",
);
includes(
  swapToShieldedArtifactCheck,
  "verifyingKeyHash tamper rejection",
  "Swap-to-shielded proof artifact verifying-key tamper guard",
);
includes(
  swapToShieldedArtifactCheck,
  "privateInputs alias rejection",
  "Swap-to-shielded proof artifact no-witness alias guard",
);
includes(
  swapToShieldedArtifactCheck,
  "witness sidecar rejection",
  "Swap-to-shielded proof artifact witness sidecar guard",
);
includes(sendArtifactCheck, "tampered public input rejection", "Send proof artifact tampered public input guard");
includes(sendArtifactCheck, "circuit relabel rejection", "Send proof artifact circuit relabel guard");
includes(sendArtifactCheck, "proofSystem relabel rejection", "Send proof artifact proof-system relabel guard");
includes(sendArtifactCheck, "backend relabel rejection", "Send proof artifact backend relabel guard");
includes(sendArtifactCheck, "public input label relabel rejection", "Send proof artifact public-input label guard");
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
  "circuit relabel rejection",
  "Actual Private Spend proof artifact circuit relabel guard",
);
includes(
  actualPrivateSpendArtifactCheck,
  "proofSystem relabel rejection",
  "Actual Private Spend proof artifact proof-system relabel guard",
);
includes(
  actualPrivateSpendArtifactCheck,
  "backend relabel rejection",
  "Actual Private Spend proof artifact backend relabel guard",
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
includes(
  claimNoWitnessCheck,
  "Claim proof artifact no-witness acceptance",
  "Claim proof artifact operator acceptance guard",
);
includes(
  claimNoWitnessCheck,
  "Claim mismatched expected public input rejection",
  "Claim proof artifact expected public-input mismatch guard",
);
includes(
  claimNoWitnessCheck,
  "Claim unknown expected public input rejection",
  "Claim proof artifact unknown expected-input guard",
);
includes(
  claimNoWitnessCheck,
  "Send artifact cannot satisfy Claim expected input",
  "Claim proof artifact Send relabel guard",
);
includes(
  claimNoWitnessCheck,
  "production local artifact rejection",
  "Claim proof artifact production backend guard",
);
includes(
  swapToShieldedNoWitnessCheck,
  "Swap-to-shielded proof artifact no-witness acceptance",
  "Swap-to-shielded proof artifact operator acceptance guard",
);
includes(
  swapToShieldedNoWitnessCheck,
  "Swap-to-shielded mismatched expected public input rejection",
  "Swap-to-shielded proof artifact expected public-input mismatch guard",
);
includes(
  swapToShieldedNoWitnessCheck,
  "Swap-to-shielded unknown expected public input rejection",
  "Swap-to-shielded proof artifact unknown expected-input guard",
);
includes(
  swapToShieldedNoWitnessCheck,
  "Send artifact cannot satisfy Swap-to-shielded expected input",
  "Swap-to-shielded proof artifact Send relabel guard",
);
includes(
  swapToShieldedNoWitnessCheck,
  "production local artifact rejection",
  "Swap-to-shielded proof artifact production backend guard",
);
includes(sendNoWitnessCheck, "mixed witnessPackage rejection", "Send proof artifact operator mixed witness guard");
includes(
  sendNoWitnessCheck,
  "Send missing expected public input rejection",
  "Send proof artifact expected public-input required guard",
);
includes(
  sendNoWitnessCheck,
  "Send mismatched expected public input rejection",
  "Send proof artifact expected public-input mismatch guard",
);
includes(
  sendNoWitnessCheck,
  "Send unknown expected public input rejection",
  "Send proof artifact unknown expected-input guard",
);
includes(sendNoWitnessCheck, "nested witness alias rejection", "Send proof artifact operator nested witness alias guard");
includes(sendNoWitnessCheck, "production local artifact rejection", "Send proof artifact production backend guard");
includes(
  actualPrivateSpendNoWitnessCheck,
  "Actual Private Spend proof artifact no-witness acceptance",
  "Actual Private Spend proof artifact operator acceptance guard",
);
includes(
  actualPrivateSpendNoWitnessCheck,
  "mismatched public input rejection",
  "Actual Private Spend proof artifact expected public-input mismatch guard",
);
includes(
  actualPrivateSpendNoWitnessCheck,
  "actual-private unknown expected public input rejection",
  "Actual Private Spend proof artifact unknown expected-input guard",
);
includes(
  actualPrivateSpendNoWitnessCheck,
  "send artifact cannot satisfy actual-private expected input",
  "Actual Private Spend proof artifact Send relabel guard",
);
includes(
  actualPrivateSpendNoWitnessCheck,
  "production local artifact rejection",
  "Actual Private Spend proof artifact production backend guard",
);
includes(
  actualPrivateSpendNoWitnessCheck,
  "production local derived artifact rejection",
  "Actual Private Spend proof artifact production derived backend guard",
);
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
includes(
  read("scripts/check-vanta-private-pool-v2-remote-services.mjs"),
  "remote verifier local derived proofBackend request",
  "remote services verifier local derived backend rejection test",
);
includes(
  remoteProofArtifactBoundary,
  "production remote Shield proof artifact acceptance",
  "remote proof-artifact acceptance guard",
);
includes(
  remoteProofArtifactBoundary,
  "production remote proof artifact read-only receipt state",
  "remote proof-artifact read-only receipt guard",
);
includes(
  remoteProofArtifactBoundary,
  "Expected offchain-only verifier evidence for remote proof-artifact handoff.",
  "remote proof-artifact offchain-only evidence guard",
);
includes(
  remoteProofArtifactBoundary,
  "production local proof artifact rejection",
  "remote proof-artifact local rejection guard",
);
includes(
  remoteProofArtifactBoundary,
  "production local derived proof artifact rejection",
  "remote proof-artifact local derived rejection guard",
);
includes(
  remoteProofArtifactBoundary,
  "production relabelled local proof artifact key-id rejection",
  "remote proof-artifact relabelled local key-id rejection guard",
);
includes(
  remoteProofArtifactBoundary,
  "production C01-ready request overclaim rejection",
  "remote proof-artifact C01-ready request overclaim guard",
);
includes(
  remoteProofArtifactBoundary,
  "production C01-ready remote receipt overclaim rejection",
  "remote proof-artifact C01-ready receipt overclaim guard",
);
includes(
  remoteProofArtifactBoundary,
  '{ field: "acirBytecodeHash", publicInput: "229" }',
  "remote proof-artifact ACIR transcript binding guard",
);
includes(
  remoteProofArtifactBoundary,
  '{ field: "proofSystem", publicInput: "239" }',
  "remote proof-artifact proof-system transcript binding guard",
);
includes(
  remoteProofArtifactBoundary,
  '{ field: "publicInputs", publicInput: "234" }',
  "remote proof-artifact public-input transcript binding guard",
);
includes(
  remoteProofArtifactBoundary,
  '{ field: "publicInputCommitment", publicInput: "235" }',
  "remote proof-artifact public-input commitment transcript binding guard",
);
includes(
  remoteProofArtifactBoundary,
  '{ field: "proofHex", publicInput: "236" }',
  "remote proof-artifact proof payload transcript binding guard",
);
includes(
  remoteProofArtifactBoundary,
  '{ field: "publicInputLabels", publicInput: "241" }',
  "remote proof-artifact public-input labels transcript binding guard",
);
includes(
  remoteProofArtifactBoundary,
  '{ field: "verifyingKeyHash", publicInput: "237" }',
  "remote proof-artifact verifying-key hash transcript binding guard",
);
includes(
  remoteProofArtifactBoundary,
  '{ field: "verifyingKeyId", publicInput: "238" }',
  "remote proof-artifact verifying-key id transcript binding guard",
);
includes(
  remoteProofArtifactBoundary,
  "production remote mock proofSystem response rejection",
  "remote proof-artifact mock proof-system rejection guard",
);
includes(
  remoteProofArtifactBoundary,
  "production remote local verifying-key response rejection",
  "remote proof-artifact production verifying-key rejection guard",
);
includes(
  remoteProofArtifactBoundary,
  "production remote proof artifact witness alias rejection",
  "remote proof-artifact witness rejection guard",
);
includes(
  localBbFixtureProverCheck,
  "createVantaPrivatePoolV2LocalBbFixtureProver",
  "local bb fixture prover check factory use",
);
includes(
  localBbFixtureProverCheck,
  'proof.proofBackend === "local-bb-fixture-artifact"',
  "local bb fixture prover check proof backend assertion",
);
includes(
  localBbFixtureProverCheck,
  'receipt.proofSystem === "noir-bb"',
  "local bb fixture prover check receipt proof-system assertion",
);
includes(
  localBbFixtureProverCheck,
  "artifact public input must match the request public input",
  "local bb fixture prover check mismatch rejection",
);
includes(
  localBbFixtureProverCheck,
  "request-transcript drift rejection",
  "local bb fixture prover check request metadata drift rejection",
);
includes(
  localBbFixtureProverCheck,
  'target: "send"',
  "local bb fixture prover check Send target",
);
includes(
  localBbFixtureProverCheck,
  "Default Send local prover must stay mock.",
  "local bb fixture prover check Send default mock boundary",
);
includes(
  localBbFixtureProverCheck,
  "send-public-input-hash",
  "local bb fixture prover check Send public input binding",
);
includes(
  localBbFixtureProverCheck,
  "Send local bb fixture request-transcript drift rejection",
  "local bb fixture prover check Send transcript drift rejection",
);
includes(
  localBbFixtureProverCheck,
  "Send local bb fixture artifact relabel rejection",
  "local bb fixture prover check Send artifact relabel rejection",
);
includes(
  localBbFixtureProverCheck,
  "requires a Send artifact",
  "local bb fixture prover check cross-target rejection",
);
includes(
  localBbFixtureProverCheck,
  "createVantaPrivatePoolV2LocalProver",
  "local bb fixture prover check default mock boundary",
);
includes(
  actualPrivateSpendWitnessProverCheck,
  "createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput",
  "actual-private-spend witness prover check input builder",
);
includes(
  actualPrivateSpendWitnessProverCheck,
  'proofArtifact.proofBackend === "local-bb-derived-artifact"',
  "actual-private-spend witness prover check derived backend",
);
includes(
  actualPrivateSpendWitnessProverCheck,
  "assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial",
  "actual-private-spend witness prover check no-witness artifact guard",
);
includes(
  actualPrivateSpendWitnessProverCheck,
  "Default local prover must stay mock.",
  "actual-private-spend witness prover check default mock boundary",
);
includes(
  actualPrivateSpendWitnessProverCheck,
  "artifact public input must match the request public input",
  "actual-private-spend witness prover check request/artifact mismatch rejection",
);
includes(
  sendWitnessProverCheck,
  "createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput",
  "Send witness prover check input builder",
);
includes(
  sendWitnessProverCheck,
  'proofArtifact.proofBackend === "local-bb-derived-artifact"',
  "Send witness prover check derived backend",
);
includes(
  sendWitnessProverCheck,
  "assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial",
  "Send witness prover check no-witness artifact guard",
);
includes(
  sendWitnessProverCheck,
  "Default local prover must stay mock.",
  "Send witness prover check default mock boundary",
);
includes(
  sendWitnessProverCheck,
  "artifact public input must match the request public input",
  "Send witness prover check request/artifact mismatch rejection",
);

assert(
  scripts["private-pool-v2:proof-backend-boundary-check"] ===
    "node scripts/check-vanta-private-pool-v2-proof-backend-boundary.mjs && npm run private-pool-v2:browser-worker-prover-check",
  "package.json must expose private-pool-v2:proof-backend-boundary-check",
);
assert(
  scripts["private-pool-v2:local-bb-fixture-prover-check"] ===
    "node scripts/check-vanta-private-pool-v2-local-bb-fixture-prover.mjs",
  "package.json must expose private-pool-v2:local-bb-fixture-prover-check",
);
assert(
  scripts["private-pool-v2:actual-private-spend-witness-prover-check"] ===
    "node scripts/check-vanta-private-pool-v2-actual-private-spend-witness-prover.mjs",
  "package.json must expose private-pool-v2:actual-private-spend-witness-prover-check",
);
assert(
  scripts["private-pool-v2:send-witness-prover-check"] ===
    "node scripts/check-vanta-private-pool-v2-send-witness-prover.mjs",
  "package.json must expose private-pool-v2:send-witness-prover-check",
);
assert(
  scripts["private-pool-v2:browser-worker-prover-check"] ===
    "node scripts/check-vanta-private-pool-v2-browser-worker-prover.mjs",
  "package.json must expose private-pool-v2:browser-worker-prover-check",
);
assert(
  scripts["private-pool-v2:local-prover-check"]?.includes(
    "npm run private-pool-v2:local-bb-fixture-prover-check",
  ),
  "package.json private-pool-v2:local-prover-check must include private-pool-v2:local-bb-fixture-prover-check",
);
assert(
  scripts["private-pool-v2:local-prover-check"]?.includes(
    "npm run private-pool-v2:actual-private-spend-witness-prover-check",
  ),
  "package.json private-pool-v2:local-prover-check must include private-pool-v2:actual-private-spend-witness-prover-check",
);
assert(
  scripts["private-pool-v2:local-prover-check"]?.includes(
    "npm run private-pool-v2:send-witness-prover-check",
  ),
  "package.json private-pool-v2:local-prover-check must include private-pool-v2:send-witness-prover-check",
);
assert(
  scripts["private-pool-v2:local-prover-check"]?.includes(
    "npm run private-pool-v2:browser-worker-prover-check",
  ),
  "package.json private-pool-v2:local-prover-check must include private-pool-v2:browser-worker-prover-check",
);
assert(
  scripts["private-pool-v2:remote-proof-artifact-boundary-check"] ===
    "node scripts/check-vanta-private-pool-v2-remote-proof-artifact-boundary.mjs",
  "package.json must expose private-pool-v2:remote-proof-artifact-boundary-check",
);
assert(
  scripts["private-pool-v2:shield-proof-artifact-consistency-check"] ===
    "node scripts/check-vanta-private-pool-v2-shield-proof-artifact-consistency.mjs",
  "package.json must expose private-pool-v2:shield-proof-artifact-consistency-check",
);
assert(
  scripts["private-pool-v2:shield-operator-no-witness-check"] ===
    "node scripts/check-vanta-private-pool-v2-shield-operator-no-witness.mjs",
  "package.json must expose private-pool-v2:shield-operator-no-witness-check",
);
assert(
  scripts["private-pool-v2:claim-proof-artifact-consistency-check"] ===
    "node scripts/check-vanta-private-pool-v2-claim-proof-artifact-consistency.mjs",
  "package.json must expose private-pool-v2:claim-proof-artifact-consistency-check",
);
assert(
  scripts["private-pool-v2:swap-to-shielded-proof-artifact-consistency-check"] ===
    "node scripts/check-vanta-private-pool-v2-swap-to-shielded-proof-artifact-consistency.mjs",
  "package.json must expose private-pool-v2:swap-to-shielded-proof-artifact-consistency-check",
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
  scripts["private-pool-v2:claim-operator-no-witness-check"] ===
    "node scripts/check-vanta-private-pool-v2-claim-operator-no-witness.mjs",
  "package.json must expose private-pool-v2:claim-operator-no-witness-check",
);
assert(
  scripts["private-pool-v2:swap-to-shielded-operator-no-witness-check"] ===
    "node scripts/check-vanta-private-pool-v2-swap-to-shielded-operator-no-witness.mjs",
  "package.json must expose private-pool-v2:swap-to-shielded-operator-no-witness-check",
);
assert(
  scripts["private-pool-v2:send-operator-no-witness-check"] ===
    "node scripts/check-vanta-private-pool-v2-send-operator-no-witness.mjs",
  "package.json must expose private-pool-v2:send-operator-no-witness-check",
);
for (const command of [
  "private-pool-v2:proof-backend-boundary-check",
  "private-pool-v2:local-bb-fixture-prover-check",
  "private-pool-v2:actual-private-spend-witness-prover-check",
  "private-pool-v2:send-witness-prover-check",
  "private-pool-v2:shield-proof-artifact-consistency-check",
  "private-pool-v2:shield-operator-no-witness-check",
  "private-pool-v2:claim-proof-artifact-consistency-check",
  "private-pool-v2:claim-operator-no-witness-check",
  "private-pool-v2:swap-to-shielded-proof-artifact-consistency-check",
  "private-pool-v2:swap-to-shielded-operator-no-witness-check",
  "private-pool-v2:send-proof-artifact-consistency-check",
  "private-pool-v2:actual-private-spend-proof-artifact-consistency-check",
  "private-pool-v2:send-operator-no-witness-check",
  "private-pool-v2:actual-private-spend-operator-no-witness-check",
]) {
  assert(
    scripts["private-pool-v2:local-verifier-check"]?.includes(`npm run ${command}`),
    `package.json private-pool-v2:local-verifier-check must include ${command}`,
  );
}
assert(
  scripts["private-pool-v2:actual-private-spend-operator-no-witness-check"] ===
    "node scripts/check-vanta-private-pool-v2-actual-private-spend-operator-no-witness.mjs",
  "package.json must expose private-pool-v2:actual-private-spend-operator-no-witness-check",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:proof-backend-boundary-check"),
  "private-pool-v2:verify must include the proof backend boundary guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:remote-proof-artifact-boundary-check"),
  "private-pool-v2:verify must include the remote proof-artifact boundary guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:local-bb-fixture-prover-check"),
  "private-pool-v2:verify must include the local bb fixture prover guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:actual-private-spend-witness-prover-check"),
  "private-pool-v2:verify must include the actual-private-spend witness prover guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:send-witness-prover-check"),
  "private-pool-v2:verify must include the Send witness prover guard",
);
assert(
  scripts["send:verify"]?.includes("npm run private-pool-v2:local-bb-fixture-prover-check"),
  "send:verify must include the local bb fixture prover guard",
);
assert(
  scripts["send:verify"]?.includes("npm run private-pool-v2:send-witness-prover-check"),
  "send:verify must include the Send witness prover guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:shield-proof-artifact-consistency-check"),
  "private-pool-v2:verify must include the Shield proof artifact consistency guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:shield-operator-no-witness-check"),
  "private-pool-v2:verify must include the Shield operator no-witness guard",
);
assert(
  scripts["shield:verify"]?.includes("npm run private-pool-v2:shield-operator-no-witness-check"),
  "shield:verify must include the Shield operator no-witness guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:claim-proof-artifact-consistency-check"),
  "private-pool-v2:verify must include the Claim proof artifact consistency guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes("npm run private-pool-v2:claim-operator-no-witness-check"),
  "private-pool-v2:verify must include the Claim operator no-witness guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes(
    "npm run private-pool-v2:swap-to-shielded-proof-artifact-consistency-check",
  ),
  "private-pool-v2:verify must include the Swap-to-shielded proof artifact consistency guard",
);
assert(
  scripts["private-pool-v2:verify"]?.includes(
    "npm run private-pool-v2:swap-to-shielded-operator-no-witness-check",
  ),
  "private-pool-v2:verify must include the Swap-to-shielded operator no-witness guard",
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
assert(
  scripts["private-pool-v2:verify"]?.includes(
    "npm run private-pool-v2:actual-private-spend-operator-no-witness-check",
  ),
  "private-pool-v2:verify must include the Actual Private Spend operator no-witness guard",
);

console.log("private-pool-v2 proof backend boundary: PASS");

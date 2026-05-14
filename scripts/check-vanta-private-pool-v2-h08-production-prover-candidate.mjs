import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-h08-production-prover-candidate.evidence.json";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 H08 production prover candidate: FAIL - ${message}`);
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

function assertAllowedKeys(value, label, allowedKeys) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  const allowed = new Set(allowedKeys);

  for (const key of Object.keys(value)) {
    assert(allowed.has(key), `${label} has unexpected key ${key}`);
  }

  for (const key of allowedKeys) {
    assert(Object.hasOwn(value, key), `${label} missing key ${key}`);
  }
}

function assertStringArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  for (const [index, entry] of value.entries()) {
    assert(typeof entry === "string" && entry.length > 0, `${label}[${index}] must be a non-empty string`);
  }
}

function findById(entries, id, label) {
  const entry = entries.find((candidate) => candidate?.id === id);
  assert(entry, `${label} missing id ${id}`);
  return entry;
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const c01VerifierCandidate = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json"),
);
const c01BackendOptions = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json"),
);
const review = read("VANTA_ZK_REVIEW.md");
const readme = read("README.md");
const securityLimitations = read("SECURITY_LIMITATIONS.md");
const localProver = read("src/privacy/privatePoolV2LocalProver.ts");
const browserWorker = read("src/privacy/privatePoolV2BrowserProverWorker.ts");
const browserAdapter = read("src/privacy/privatePoolV2BrowserWorkerProofResultAdapter.ts");
const remoteServices = read("src/privacy/privatePoolV2RemoteServices.ts");

assert(
  scripts["zk:h08-production-prover-candidate-check"] ===
    "node scripts/check-vanta-private-pool-v2-h08-production-prover-candidate.mjs",
  "package.json must expose zk:h08-production-prover-candidate-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:h08-production-prover-candidate-check"),
    `${aggregate} must include the H08 production prover candidate guard`,
  );
}

assert(
  packet.version === "vanta-private-pool-v2-h08-production-prover-candidate-evidence-0.1",
  "H08 production prover packet must use the checked schema",
);
assert(
  packet.status === "blocked-no-production-prover-runtime-evidence",
  "H08 production prover packet must stay blocked until production prover runtime evidence exists",
);
for (const field of [
  "mainnetReady",
  "productionReady",
  "privacyClaimAllowed",
  "realFundsAllowed",
  "h08ProductionProverReady",
  "productionBrowserRuntimeProverReady",
  "productionRemoteProverReady",
]) {
  assert(packet[field] === false, `H08 production prover packet ${field} must be false`);
}
assert(packet.selectedProverRuntime === null, "H08 production prover packet must not select a prover runtime");
assert(
  packet.selectedProverRuntimeStatus === "not-selected",
  "H08 production prover packet must mark selected prover runtime as not-selected",
);
assert(
  packet.secretPolicy === "references-and-metadata-only-no-proof-bytes-no-witness-values-no-service-secrets",
  "H08 production prover packet must forbid proof bytes, witness values, and secrets",
);
assertAllowedKeys(packet, "H08 production prover packet", [
  "version",
  "checkedAt",
  "status",
  "findingId",
  "mainnetReady",
  "productionReady",
  "privacyClaimAllowed",
  "realFundsAllowed",
  "h08ProductionProverReady",
  "productionBrowserRuntimeProverReady",
  "productionRemoteProverReady",
  "selectedProverRuntime",
  "selectedProverRuntimeStatus",
  "secretPolicy",
  "purpose",
  "sourceReviewRefs",
  "productionRequiredShape",
  "c01VerifierCompatibilityRefs",
  "currentProductionProverArtifact",
  "currentLocalObservations",
  "intermediateEvidenceRefs",
  "requiredPositiveEvidence",
  "blockedBy",
  "forbiddenPromotions",
  "canonicalCommands",
  "truthBoundary",
]);

for (const phrase of [
  "proofBytes",
  "proofHex",
  "rawProof",
  "raw proof",
  "witnessBytes",
  "compressedWitness",
  "witnessInput",
  "owner_secret",
  "note_secret",
  "privateKey",
  "seedPhrase",
  "raw witness",
  "private key",
  "seed phrase",
  "bearer ",
  "database url",
  "signed transaction",
]) {
  assert(!packetText.includes(phrase), `packet must not contain secret-bearing or byte-bearing phrase ${phrase}`);
}

assert(packet.findingId === "VANTA-ZK-2026-05-09-H08", "packet must bind to H08");
assertStringArray(packet.sourceReviewRefs, "sourceReviewRefs");
for (const ref of [
  "VANTA_ZK_REVIEW.md#still-open-2--replace-the-mock-prover-with-bbjs",
  "VANTA_ZK_REVIEW.findings.json",
  "SECURITY_LIMITATIONS.md",
  "README.md",
]) {
  assert(packet.sourceReviewRefs.includes(ref), `sourceReviewRefs missing ${ref}`);
}

const requiredShape = packet.productionRequiredShape ?? {};
assertAllowedKeys(requiredShape, "production required shape", [
  "target",
  "supportedTargets",
  "allowedCandidateRuntimes",
  "selectedRuntime",
  "proofSystem",
  "proofBackend",
  "productionProofFormat",
  "productionVerifyingKeyHash",
  "mustReplaceDefaultLocalProver",
  "mustBindPublicInputLabels",
  "mustRejectLocalBackends",
  "mustBindExactProofRequestTranscript",
  "witnessPolicy",
  "runtimeEvidenceRequired",
  "c01CompatibilityRequirement",
  "auditRequirement",
]);
assert(requiredShape.target === "private-pool-v2-production-prover-v1", "required prover target mismatch");
assert(requiredShape.selectedRuntime === null, "required prover selected runtime must remain null");
assert(requiredShape.productionProofFormat === null, "production proof format must remain null");
assert(requiredShape.productionVerifyingKeyHash === null, "production verifying-key hash must remain null");
assert(requiredShape.mustReplaceDefaultLocalProver === true, "production prover must replace the default mock prover");
assert(
  requiredShape.mustBindExactProofRequestTranscript === true,
  "production prover must bind exact proof request transcripts",
);
for (const target of ["shield", "claim", "swap-to-shielded", "send", "actual-private-spend"]) {
  assert(requiredShape.supportedTargets?.includes(target), `required production prover missing target ${target}`);
}
for (const runtime of ["remote-service-production-prover", "browser-worker-production-runtime"]) {
  assert(
    requiredShape.allowedCandidateRuntimes?.includes(runtime),
    `required production prover missing candidate runtime ${runtime}`,
  );
}
for (const label of [
  "shield-public-input-hash",
  "claim-public-input-hash",
  "swap-public-input-hash",
  "send-public-input-hash",
  "private-spend-public-input-hash",
]) {
  assert(requiredShape.mustBindPublicInputLabels?.includes(label), `required production prover missing ${label}`);
}
for (const backend of ["local-mock", "local-bb-fixture-artifact", "local-bb-derived-artifact"]) {
  assert(requiredShape.mustRejectLocalBackends?.includes(backend), `required production prover must reject ${backend}`);
}
includes(requiredShape.witnessPolicy, "must not appear in operator receipts", "required production prover witness policy");
includes(requiredShape.c01CompatibilityRequirement, "selected C01 verifier backend", "required production prover C01 compatibility");
includes(requiredShape.auditRequirement, "external reviewer or audit acceptance", "required production prover audit requirement");
for (const evidence of [
  "deployed prover health",
  "artifact-store refs",
  "job-log refs",
  "valid proof roundtrip",
  "invalid proof rejection",
  "live route wiring",
]) {
  assert(requiredShape.runtimeEvidenceRequired?.includes(evidence), `runtime evidence missing ${evidence}`);
}

const c01Refs = packet.c01VerifierCompatibilityRefs ?? {};
assertAllowedKeys(c01Refs, "C01 verifier compatibility refs", [
  "status",
  "decisionPacketRef",
  "backendOptionsRef",
  "verifierCandidateRef",
  "selectedBackend",
  "selectedBackendStatus",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "requiredBeforeH08Production",
  "truthBoundary",
]);
assert(c01Refs.status === "blocked-c01-backend-unselected", "H08 C01 refs status must stay blocked");
assert(
  c01Refs.decisionPacketRef === "docs/zk/c01-production-verifier-backend-decision.md",
  "H08 C01 refs must point at the decision packet",
);
assert(
  c01Refs.backendOptionsRef === "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json",
  "H08 C01 refs must point at backend options",
);
assert(
  c01Refs.verifierCandidateRef === "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
  "H08 C01 refs must point at the verifier candidate packet",
);
assert(c01Refs.selectedBackend === null, "H08 C01 refs must keep selectedBackend null");
assert(c01Refs.selectedBackendStatus === "not-selected", "H08 C01 refs backend status must be not-selected");
assert(c01Refs.c01VerifierReady === false, "H08 C01 refs must keep c01VerifierReady false");
assert(
  c01Refs.solanaC01Groth16VerifierReady === false,
  "H08 C01 refs must keep Solana C01 Groth16 readiness false",
);
includes(
  c01Refs.requiredBeforeH08Production,
  "production proof format",
  "H08 C01 compatibility required evidence",
);
includes(
  c01Refs.truthBoundary,
  "H08 cannot claim production prover compatibility while C01 selectedBackend is null",
  "H08 C01 compatibility truth boundary",
);
assert(c01VerifierCandidate.selectedBackend === null, "C01 verifier candidate must keep selectedBackend null");
assert(
  c01VerifierCandidate.selectedBackendStatus === "not-selected",
  "C01 verifier candidate must keep backend status not-selected",
);
assert(c01BackendOptions.selectedBackend === null, "C01 backend options must keep selectedBackend null");
assert(
  c01BackendOptions.selectedBackendStatus === "not-selected",
  "C01 backend options must keep backend status not-selected",
);

const currentProductionArtifact = packet.currentProductionProverArtifact ?? {};
assertAllowedKeys(currentProductionArtifact, "current production prover artifact", [
  "status",
  "runtime",
  "artifactRef",
  "proofSystem",
  "proofBackend",
  "productionProofFormatRef",
  "productionVerifyingKeyHash",
  "serviceHealthRef",
  "artifactStoreRef",
  "jobLogRef",
  "validProofRoundtripRef",
  "invalidProofRejectionRef",
  "liveRoutingRef",
  "auditReviewerAcceptanceRef",
  "satisfiesProductionProverEvidence",
]);
assert(currentProductionArtifact.status === "absent", "current production prover artifact must be absent");
for (const field of [
  "runtime",
  "artifactRef",
  "proofSystem",
  "proofBackend",
  "productionProofFormatRef",
  "productionVerifyingKeyHash",
  "serviceHealthRef",
  "artifactStoreRef",
  "jobLogRef",
  "validProofRoundtripRef",
  "invalidProofRejectionRef",
  "liveRoutingRef",
  "auditReviewerAcceptanceRef",
]) {
  assert(currentProductionArtifact[field] === null, `current production prover artifact ${field} must be null`);
}
assert(
  currentProductionArtifact.satisfiesProductionProverEvidence === false,
  "absent production prover artifact must not satisfy production evidence",
);

const observations = packet.currentLocalObservations ?? {};
assertAllowedKeys(observations, "current local observations", [
  "defaultLocalProver",
  "localBbFixtureAdapter",
  "localWitnessInputProvers",
  "browserWorkerProofExecution",
  "browserWorkerProofResultAdapter",
  "remoteServiceBoundary",
]);

const defaultLocalProver = observations.defaultLocalProver ?? {};
assert(defaultLocalProver.status === "still-default-mock-local-mock", "default prover status mismatch");
assert(defaultLocalProver.sourceRef === "src/privacy/privatePoolV2LocalProver.ts", "default prover source mismatch");
assert(defaultLocalProver.proofSystem === "mock", "default prover proof system must remain mock");
assert(defaultLocalProver.proofBackend === "local-mock", "default prover proof backend must remain local-mock");
assert(defaultLocalProver.satisfiesProductionProverEvidence === false, "default prover must not satisfy production evidence");

const fixtureAdapter = observations.localBbFixtureAdapter ?? {};
assert(fixtureAdapter.status === "opt-in-local-fixture-replay", "local bb fixture adapter status mismatch");
assert(fixtureAdapter.guard === "npm run private-pool-v2:local-bb-fixture-prover-check", "fixture adapter guard mismatch");
assert(fixtureAdapter.proofSystem === "noir-bb", "fixture adapter proof system mismatch");
for (const backend of ["local-bb-fixture-artifact", "local-bb-derived-artifact"]) {
  assert(fixtureAdapter.proofBackends?.includes(backend), `fixture adapter missing backend ${backend}`);
}
for (const target of ["shield", "claim", "swap-to-shielded", "actual-private-spend", "send"]) {
  assert(fixtureAdapter.supportedTargets?.includes(target), `fixture adapter missing target ${target}`);
}
for (const label of [
  "shield-public-input-hash",
  "claim-public-input-hash",
  "swap-public-input-hash",
  "private-spend-public-input-hash",
  "send-public-input-hash",
]) {
  assert(fixtureAdapter.publicInputLabels?.includes(label), `fixture adapter missing ${label}`);
}
assert(fixtureAdapter.satisfiesProductionProverEvidence === false, "fixture adapter must not satisfy production evidence");

const witnessInput = observations.localWitnessInputProvers ?? {};
assert(witnessInput.status === "local-node-derived-artifacts", "local witness-input status mismatch");
assert(witnessInput.proofBackend === "local-bb-derived-artifact", "local witness-input backend mismatch");
for (const command of [
  "npm run private-pool-v2:actual-private-spend-witness-prover-check",
  "npm run private-pool-v2:send-witness-prover-check",
]) {
  assert(witnessInput.guards?.includes(command), `local witness-input guards missing ${command}`);
}
assert(witnessInput.satisfiesProductionProverEvidence === false, "local witness-input path must not satisfy production evidence");
for (const label of ["private-spend-public-input-hash", "send-public-input-hash"]) {
  assert(witnessInput.publicInputLabels?.includes(label), `local witness-input path missing ${label}`);
}

const worker = observations.browserWorkerProofExecution ?? {};
assert(worker.status === "dev-only-browser-worker-local-evidence", "browser worker status mismatch");
assert(worker.runtime === "@aztec/bb.js / UltraHonkBackend with threads: 1", "browser worker runtime mismatch");
assert(worker.liveRouting === false, "browser worker must not claim live routing");
for (const command of [
  "npm run private-pool-v2:browser-worker-prover-check",
  "npm run private-pool-v2:actual-private-spend-browser-worker-prover-check",
]) {
  assert(worker.guards?.includes(command), `browser worker guards missing ${command}`);
}
assert(worker.satisfiesProductionProverEvidence === false, "browser worker path must not satisfy production evidence");

const adapter = observations.browserWorkerProofResultAdapter ?? {};
assert(adapter.status === "opt-in-dev-only-proof-result-interface", "browser-worker adapter status mismatch");
assert(adapter.implementsInterface === "VantaPrivatePoolV2Prover", "browser-worker adapter interface mismatch");
assert(adapter.guard === "npm run private-pool-v2:browser-worker-proof-result-adapter-check", "browser-worker adapter guard mismatch");
assert(adapter.requiresProofBackend === "local-bb-derived-artifact", "browser-worker adapter backend mismatch");
assert(adapter.replacesDefaultLocalProver === false, "browser-worker adapter must not replace default local prover");
assert(adapter.satisfiesProductionProverEvidence === false, "browser-worker adapter must not satisfy production evidence");

const remote = observations.remoteServiceBoundary ?? {};
assert(remote.status === "production-mode-handoff-guard-only", "remote service boundary status mismatch");
assert(remote.currentOnChainVerifierEvidence === "offchain-remote-proof-artifact-only", "remote verifier evidence mismatch");
assert(remote.requiresProofBackend === "remote-service", "remote proof backend mismatch");
assert(remote.rejectsLocalBackendsInProductionMode === true, "remote boundary must reject local backends in production mode");
assert(remote.satisfiesProductionProverEvidence === false, "remote handoff guard must not satisfy production evidence");

const intermediateEvidence = packet.intermediateEvidenceRefs ?? [];
assert(Array.isArray(intermediateEvidence), "intermediateEvidenceRefs must be an array");
for (const id of [
  "local-bb-fixture-proof-result-adapter",
  "send-and-actual-private-local-witness-input-provers",
  "browser-worker-proof-execution",
  "browser-worker-proof-result-adapter",
  "blocked-production-prover-runtime-options-matrix",
  "production-services-manifest",
  "production-smoke-template",
]) {
  const entry = findById(intermediateEvidence, id, "intermediateEvidenceRefs");
  assert(entry.satisfiesProductionProverEvidence === false, `${id} must not satisfy production evidence`);
  assert(typeof entry.artifactRef === "string" && entry.artifactRef.length > 0, `${id} must record artifactRef`);
  assert(entry.command?.startsWith("npm run "), `${id} must record npm command`);
  includes(entry.truthBoundary, "not", `${id} truth boundary`);
}

const requiredEvidence = packet.requiredPositiveEvidence ?? [];
assert(Array.isArray(requiredEvidence), "requiredPositiveEvidence must be an array");
for (const id of [
  "production-prover-runtime-selection",
  "production-proof-format-contract",
  "production-verifying-key-evidence",
  "live-routing-evidence",
  "runtime-reliability-and-performance-evidence",
  "operator-no-witness-production-acceptance",
  "c01-verifier-compatibility",
  "deployed-prover-health-and-job-log-evidence",
  "valid-proof-roundtrip-and-invalid-proof-rejection",
  "sbf-live-lineage",
  "audit-reviewer-acceptance",
]) {
  const entry = findById(requiredEvidence, id, "requiredPositiveEvidence");
  assert(entry.status === "blocked", `${id} must remain blocked`);
  assert(entry.currentArtifactRef === null, `${id} currentArtifactRef must remain null`);
  includes(entry.truthBoundary, "not", `${id} truth boundary`);
}
assert(
  requiredEvidence.every((entry) => entry.status === "blocked" && entry.currentArtifactRef === null),
  "all required positive evidence must remain blocked with null refs",
);

assertStringArray(packet.blockedBy, "blockedBy");
for (const phrase of [
  "no production prover runtime is selected",
  "default local prover remains mock / local-mock",
  "browser-worker proof execution is dev-only",
  "C01 production verifier backend and proof-format compatibility are still blocked",
]) {
  assert(packet.blockedBy.some((entry) => entry.includes(phrase)), `blockedBy missing ${phrase}`);
}
assertStringArray(packet.forbiddenPromotions, "forbiddenPromotions");
for (const phrase of [
  "production prover accepted",
  "production-private",
  "mainnet-private",
  "real-funds ZK readiness",
  "proof-enforced spend",
]) {
  assert(packet.forbiddenPromotions.includes(phrase), `forbiddenPromotions missing ${phrase}`);
}
assertStringArray(packet.canonicalCommands, "canonicalCommands");
for (const command of [
  "npm run zk:h08-production-prover-candidate-check",
  "npm run zk:h08-production-prover-runtime-options-check",
  "npm run private-pool-v2:local-bb-fixture-prover-check",
  "npm run private-pool-v2:browser-worker-proof-result-adapter-check",
  "npm run zk:c01-verifier-backend-decision-check",
  "npm run zk:c01-verifier-backend-options-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "npm run private-pool-v2:service-network-check",
  "npm run mainnet:private-pool-v2-production-smoke-check",
]) {
  assert(packet.canonicalCommands.includes(command), `canonicalCommands missing ${command}`);
}
for (const command of packet.canonicalCommands) {
  if (!command.startsWith("npm run ")) {
    continue;
  }
  const scriptName = command.slice("npm run ".length).split(/\s/u)[0];
  assert(Object.hasOwn(scripts, scriptName), `canonicalCommands references missing package script ${scriptName}`);
}
for (const phrase of [
  "blocked H08 production prover candidate packet only",
  "do not satisfy production prover runtime selection",
  "deployed prover health",
  "C01 verifier compatibility",
  "audit acceptance",
  "real-funds readiness",
]) {
  includes(packet.truthBoundary, phrase, "H08 packet truth boundary");
}

for (const marker of [
  'proofBackend: VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_BACKEND',
  'proofSystem: "mock"',
  "VANTA_PRIVATE_POOL_V2_LOCAL_BB_FIXTURE_PROOF_BACKEND",
  "VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND",
  "createVantaPrivatePoolV2LocalBbFixtureProver",
]) {
  includes(localProver, marker, "local prover H08 source truth");
}
for (const marker of [
  "UltraHonkBackend",
  "threads: 1",
  "proveVantaPrivatePoolV2SendInBrowserWorker",
  "proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorker",
  "local-bb-derived-artifact",
]) {
  includes(browserWorker, marker, "browser worker H08 source truth");
}
for (const marker of [
  "VantaPrivatePoolV2Prover",
  "requires local-bb-derived-artifact evidence",
  "default local prover remains mock / local-mock",
  "not live Send routing",
  "not routed live actual-private-spend execution",
]) {
  includes(browserAdapter, marker, "browser-worker adapter H08 source truth");
}
for (const marker of [
  "VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_BACKEND = \"remote-service\"",
  "Private Pool v2 remote services require proofBackend=remote-service.",
  "offchain-remote-proof-artifact-only",
  "production-verifying-key-hash",
]) {
  includes(remoteServices, marker, "remote-service H08 boundary truth");
}

for (const marker of [
  "not live Send or actual-private-spend routing",
  "not production browser-runtime proving",
  "remote proof service",
  "production proof-format acceptance",
]) {
  includes(readme, marker, "README H08 truth boundary");
}
for (const marker of [
  "not a production browser runtime prover",
  "remote proof service",
  "on-chain verifier",
  "mainnet-private settlement",
]) {
  includes(securityLimitations, marker, "security limitations H08 truth boundary");
}
for (const marker of [
  "Codex status, 2026-05-13 H08 production prover candidate packet",
  packetPath,
  "npm run zk:h08-production-prover-candidate-check",
  "selectedProverRuntime: null",
  "not production prover runtime selection",
  "not live route wiring",
]) {
  includes(review, marker, "VANTA_ZK_REVIEW H08 production prover candidate status");
}

console.log("private-pool-v2 H08 production prover candidate: PASS");
console.log(
  JSON.stringify(
    {
      status: packet.status,
      selectedProverRuntime: packet.selectedProverRuntime,
      productionReady: packet.productionReady,
      mainnetReady: packet.mainnetReady,
      requiredPositiveEvidence: requiredEvidence.length,
      blockedBy: packet.blockedBy.length,
    },
    null,
    2,
  ),
);

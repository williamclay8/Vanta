import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = "ops/mainnet/private-pool-v2-h08-production-prover-runtime-options.evidence.json";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 H08 production prover runtime options: FAIL - ${message}`);
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

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const h08Candidate = JSON.parse(read("ops/mainnet/private-pool-v2-h08-production-prover-candidate.evidence.json"));
const c01Candidate = JSON.parse(read("ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json"));
const c01Options = JSON.parse(read("ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json"));
const review = read("VANTA_ZK_REVIEW.md");
const browserWorkerAdapter = read("src/privacy/privatePoolV2BrowserWorkerProofResultAdapter.ts");
const localProver = read("src/privacy/privatePoolV2LocalProver.ts");
const remoteServices = read("src/privacy/privatePoolV2RemoteServices.ts");
const proverRelayTradeoffs = read("docs/zk/prover-relay-privacy-tradeoffs.md");

assert(
  scripts["zk:h08-production-prover-runtime-options-check"] ===
    "node scripts/check-vanta-private-pool-v2-h08-production-prover-runtime-options.mjs",
  "package.json must expose zk:h08-production-prover-runtime-options-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:h08-production-prover-runtime-options-check"),
    `${aggregate} must include the H08 production prover runtime options guard`,
  );
}

assert(
  packet.version === "vanta-private-pool-v2-h08-production-prover-runtime-options-evidence-0.1",
  "runtime options packet must use the checked schema",
);
assert(packet.findingId === "VANTA-ZK-2026-05-09-H08", "runtime options packet must bind to H08");
assert(packet.status === "blocked-runtime-options-unselected", "runtime options packet must stay blocked");
assert(packet.selectedProverRuntime === null, "runtime options packet must not select a prover runtime");
assert(
  packet.selectedProverRuntimeStatus === "not-selected",
  "runtime options packet must mark selected runtime as not-selected",
);
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "realFundsAllowed",
  "h08ProductionProverReady",
  "productionBrowserRuntimeProverReady",
  "productionRemoteProverReady",
]) {
  assert(packet[field] === false, `runtime options packet ${field} must be false`);
}
assert(
  packet.secretPolicy === "references-and-metadata-only-no-proof-bytes-no-witness-values-no-service-secrets",
  "runtime options packet must forbid proof bytes, witness values, and secrets",
);
assertAllowedKeys(packet, "runtime options packet", [
  "version",
  "checkedAt",
  "status",
  "findingId",
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "realFundsAllowed",
  "h08ProductionProverReady",
  "productionBrowserRuntimeProverReady",
  "productionRemoteProverReady",
  "selectedProverRuntime",
  "selectedProverRuntimeStatus",
  "secretPolicy",
  "purpose",
  "candidatePacketRef",
  "c01VerifierCompatibilityRefs",
  "runtimeOptions",
  "currentLocalEvidenceRefs",
  "intermediateEvidenceOnly",
  "satisfiesRequiredPositiveEvidence",
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
  "bearer ",
  "database url",
  "signed transaction",
]) {
  assert(!packetText.includes(phrase), `runtime options packet must not contain byte/secret phrase ${phrase}`);
}

assert(
  packet.candidatePacketRef === "ops/mainnet/private-pool-v2-h08-production-prover-candidate.evidence.json",
  "runtime options packet must point at the H08 candidate packet",
);

const c01Refs = packet.c01VerifierCompatibilityRefs ?? {};
assertAllowedKeys(c01Refs, "runtime options C01 refs", [
  "status",
  "decisionPacketRef",
  "backendOptionsRef",
  "verifierCandidateRef",
  "selectedBackend",
  "selectedBackendStatus",
  "c01VerifierReady",
  "solanaC01Groth16VerifierReady",
  "truthBoundary",
]);
assert(c01Refs.status === "blocked-c01-backend-unselected", "runtime options C01 refs must stay blocked");
assert(c01Refs.selectedBackend === null, "runtime options C01 refs must keep selectedBackend null");
assert(c01Refs.selectedBackendStatus === "not-selected", "runtime options C01 refs must mark backend not-selected");
assert(c01Refs.c01VerifierReady === false, "runtime options C01 refs must keep c01VerifierReady false");
assert(
  c01Refs.solanaC01Groth16VerifierReady === false,
  "runtime options C01 refs must keep Solana C01 Groth16 readiness false",
);
includes(
  c01Refs.truthBoundary,
  "H08 runtime selection cannot be production-compatible while C01 selectedBackend is null",
  "runtime options C01 truth boundary",
);
assert(c01Candidate.selectedBackend === null, "C01 candidate must keep selectedBackend null");
assert(c01Options.selectedBackend === null, "C01 options must keep selectedBackend null");

const optionById = new Map((packet.runtimeOptions ?? []).map((entry) => [entry.id, entry]));
const remoteService = optionById.get("remote-service-production-prover");
const browserRuntime = optionById.get("browser-worker-production-runtime");
assert(remoteService, "runtime options must include remote-service-production-prover");
assert(browserRuntime, "runtime options must include browser-worker-production-runtime");

for (const [label, option] of [
  ["remote-service-production-prover", remoteService],
  ["browser-worker-production-runtime", browserRuntime],
]) {
  assertAllowedKeys(option, label, [
    "id",
    "status",
    "selectsProductionRuntime",
    "runtimeBoundary",
    "supportedTargetsRequired",
    "currentCoverage",
    "proofBackendContract",
    "requires",
    "currentBlockedBy",
    "truthBoundary",
  ]);
  assert(option.status === "blocked", `${label} must stay blocked`);
  assert(option.selectsProductionRuntime === false, `${label} must not select production runtime`);
  for (const target of ["shield", "claim", "swap-to-shielded", "send", "actual-private-spend"]) {
    assert(option.supportedTargetsRequired?.includes(target), `${label} missing required target ${target}`);
  }
  includes(option.truthBoundary, "not production prover readiness", `${label} truth boundary`);
}

assert(remoteService.proofBackendContract === "remote-service", "remote-service option must require remote-service proof backend");
for (const required of [
  "deployed prover health",
  "artifact-store refs",
  "job-log refs",
  "exact proof-request transcript binding",
  "no-witness operator acceptance",
  "valid proof roundtrip",
  "invalid proof rejection",
  "C01 verifier compatibility",
  "audit-or-reviewer acceptance",
]) {
  assert(remoteService.requires?.includes(required), `remote-service option missing requirement ${required}`);
}
includes(remoteService.currentBlockedBy.join(" "), "no deployed prover health", "remote-service blocked-by list");

assert(
  browserRuntime.proofBackendContract === "explicitly-accepted-production-browser-runtime",
  "browser-runtime option must require an explicit production browser runtime contract",
);
for (const target of ["shield", "claim", "swap-to-shielded", "send", "actual-private-spend"]) {
  assert(browserRuntime.currentCoverage?.includes(target), `browser runtime must record current ${target} coverage`);
}
assert(
  !browserRuntime.currentBlockedBy?.some((entry) => entry.includes("coverage is absent")),
  "browser runtime must not preserve stale missing-coverage blockers once all local targets have dev-only worker coverage",
);
for (const required of [
  "production browser runtime contract",
  "compiled circuit distribution policy",
  "device and timeout coverage",
  "route wiring",
  "no-witness operator acceptance",
  "C01 verifier compatibility",
  "audit-or-reviewer acceptance",
]) {
  assert(browserRuntime.requires?.includes(required), `browser-runtime option missing requirement ${required}`);
}
includes(browserRuntime.currentBlockedBy.join(" "), "dev-only", "browser-runtime blocked-by list");

for (const ref of packet.currentLocalEvidenceRefs ?? []) {
  assert(ref.satisfiesProductionProverEvidence === false, `${ref.id} must not satisfy production prover evidence`);
  includes(ref.truthBoundary, "not production", `${ref.id} truth boundary`);
}
for (const id of [
  "default-local-mock-prover",
  "local-bb-fixture-adapter",
  "browser-worker-proof-execution",
  "browser-worker-proof-result-adapter",
  "remote-service-handoff-guard",
]) {
  assert(
    packet.currentLocalEvidenceRefs?.some((entry) => entry.id === id),
    `runtime options current local evidence refs missing ${id}`,
  );
}

for (const [field, expected] of [
  ["localBbFixtureAdapter", true],
  ["browserWorkerProofExecution", true],
  ["browserWorkerProofResultAdapter", true],
  ["remoteServiceHandoffGuard", true],
  ["h08ProductionProverCandidate", true],
]) {
  assert(packet.intermediateEvidenceOnly?.[field] === expected, `${field} must be intermediate-only`);
}
for (const [field, expected] of [
  ["productionProverRuntimeSelection", false],
  ["productionProofFormatContract", false],
  ["productionVerifyingKeyEvidence", false],
  ["liveRouteWiring", false],
  ["operatorNoWitnessProductionAcceptance", false],
  ["c01VerifierCompatibility", false],
  ["auditReviewerAcceptance", false],
]) {
  assert(packet.satisfiesRequiredPositiveEvidence?.[field] === expected, `${field} must be ${expected}`);
}
for (const blocker of [
  "selected-prover-runtime-null",
  "c01-selected-backend-null",
  "production-proof-format-absent",
  "production-verifying-key-evidence-absent",
  "live-route-wiring-absent",
  "deployed-prover-health-absent",
  "audit-reviewer-acceptance-absent",
]) {
  assert(packet.blockedBy?.includes(blocker), `runtime options blockedBy missing ${blocker}`);
}
for (const phrase of [
  "production prover selected",
  "browser worker production ready",
  "remote prover production ready",
  "production-private",
  "mainnet-private",
  "real-funds-ready",
]) {
  assert(packet.forbiddenPromotions?.includes(phrase), `runtime options forbiddenPromotions missing ${phrase}`);
}
for (const command of [
  "npm run zk:h08-production-prover-runtime-options-check",
  "npm run zk:h08-production-prover-candidate-check",
  "npm run private-pool-v2:browser-worker-proof-result-adapter-check",
  "npm run private-pool-v2:browser-worker-prover-check",
  "npm run private-pool-v2:actual-private-spend-browser-worker-prover-check",
  "npm run private-pool-v2:shield-browser-worker-prover-check",
  "npm run private-pool-v2:claim-browser-worker-prover-check",
  "npm run private-pool-v2:swap-to-shielded-browser-worker-prover-check",
  "npm run private-pool-v2:proof-backend-boundary-check",
  "npm run zk:c01-verifier-backend-decision-check",
  "npm run zk:c01-verifier-backend-options-check",
]) {
  assert(packet.canonicalCommands?.includes(command), `runtime options canonicalCommands missing ${command}`);
}
for (const phrase of [
  "not production prover runtime selection",
  "not production proof-format evidence",
  "not production verifying-key evidence",
  "not live route wiring",
  "not C01 verifier compatibility",
]) {
  includes(packet.truthBoundary, phrase, "runtime options truth boundary");
}

const runtimeOptionsRef = h08Candidate.intermediateEvidenceRefs?.find(
  (entry) => entry.id === "blocked-production-prover-runtime-options-matrix",
);
assert(
  runtimeOptionsRef?.artifactRef === packetPath,
  "H08 candidate packet must reference runtime options packet",
);
assert(
  runtimeOptionsRef?.command === "npm run zk:h08-production-prover-runtime-options-check",
  "H08 candidate packet must record runtime options guard",
);
assert(
  runtimeOptionsRef?.satisfiesProductionProverEvidence === false,
  "H08 runtime options ref must not satisfy production prover evidence",
);
assert(
  h08Candidate.canonicalCommands?.includes("npm run zk:h08-production-prover-runtime-options-check"),
  "H08 candidate canonical commands must include runtime options guard",
);

includes(
  localProver,
  "\"local-mock\" satisfies VantaPrivatePoolV2ProofBackend",
  "local prover default mock boundary",
);
includes(browserWorkerAdapter, "dev-only", "browser worker adapter dev-only boundary");
includes(remoteServices, "offchain-remote-proof-artifact-only", "remote service handoff truth");
for (const marker of [
  "blocked production prover candidate packet",
  "selectedProverRuntime: null",
  "C01 verifier compatibility",
]) {
  includes(review, marker, "VANTA_ZK_REVIEW H08 status");
}

for (const marker of [
  "Prover Relay Privacy Trade-Offs",
  "Vanta production privacy is not enabled.",
  "`selectedProverRuntime` is `null`.",
  "A remote prover or prover relay must be explicit opt-in.",
  "The product must not silently move witness generation or proof construction from the user's device to a remote service.",
  "A remote prover can receive sensitive proof inputs needed to construct the proof",
  "note secrets",
  "ownership witnesses",
  "amount or asset witnesses",
  "blinding material",
  "Browser-worker proving can keep witness material on the user's device, but the current implementation is dev-only evidence.",
  "Separation alone is not anonymity",
  "users can choose local proving vs remote proving with clear trade-off copy",
  "not production-private proof infrastructure",
]) {
  includes(proverRelayTradeoffs, marker, "prover relay privacy trade-off doc");
}

console.log("private-pool-v2 H08 production prover runtime options: PASS");

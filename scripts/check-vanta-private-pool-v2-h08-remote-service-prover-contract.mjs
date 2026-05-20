import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath =
  "ops/mainnet/private-pool-v2-h08-remote-service-production-prover-contract.evidence.json";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(`private-pool-v2 H08 remote-service prover contract: FAIL - ${message}`);
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

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packetText = read(packetPath);
const packet = JSON.parse(packetText);
const h08Candidate = JSON.parse(
  read("ops/mainnet/private-pool-v2-h08-production-prover-candidate.evidence.json"),
);
const runtimeOptions = JSON.parse(
  read("ops/mainnet/private-pool-v2-h08-production-prover-runtime-options.evidence.json"),
);
const c01Options = JSON.parse(
  read("ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json"),
);
const review = read("VANTA_ZK_REVIEW.md");
const findings = read("VANTA_ZK_REVIEW.findings.json");
const readme = read("README.md");
const securityLimitations = read("SECURITY_LIMITATIONS.md");
const tradeoffs = read("docs/zk/prover-relay-privacy-tradeoffs.md");

assert(
  scripts["zk:h08-remote-service-prover-contract-check"] ===
    "node scripts/check-vanta-private-pool-v2-h08-remote-service-prover-contract.mjs",
  "package.json must expose zk:h08-remote-service-prover-contract-check",
);
for (const aggregate of ["zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert(
    scripts[aggregate]?.includes("npm run zk:h08-remote-service-prover-contract-check"),
    `${aggregate} must include the H08 remote-service prover contract guard`,
  );
}

assertAllowedKeys(packet, "remote-service contract packet", [
  "version",
  "checkedAt",
  "status",
  "findingId",
  "selectedRuntimeDirection",
  "selectedRuntimeDirectionStatus",
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "realFundsAllowed",
  "h08ProductionProverReady",
  "secretPolicy",
  "purpose",
  "candidatePacketRef",
  "runtimeOptionsPacketRef",
  "c01DecisionPacketRef",
  "proverRelayTradeoffRef",
  "contract",
  "requiredBeforePromotion",
  "currentPositiveEvidence",
  "forbiddenPromotions",
  "canonicalCommands",
  "truthBoundary",
]);
assert(
  packet.version === "vanta-private-pool-v2-h08-remote-service-production-prover-contract-evidence-0.1",
  "packet version mismatch",
);
assert(
  packet.status === "local-runtime-direction-selected-production-evidence-blocked",
  "packet must remain a blocked local direction contract",
);
assert(packet.findingId === "VANTA-ZK-2026-05-09-H08", "packet must bind to H08");
assert(
  packet.selectedRuntimeDirection === "remote-service-production-prover",
  "packet must select the remote service direction",
);
assert(
  packet.selectedRuntimeDirectionStatus ===
    "local-architecture-direction-not-production-runtime-acceptance",
  "packet must mark the selection as local direction only",
);
for (const field of [
  "productionReady",
  "mainnetReady",
  "privacyClaimAllowed",
  "realFundsAllowed",
  "h08ProductionProverReady",
]) {
  assert(packet[field] === false, `${field} must remain false`);
}
assert(
  packet.secretPolicy === "references-and-metadata-only-no-proof-bytes-no-witness-values-no-service-secrets",
  "packet secret policy mismatch",
);

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
  assert(!packetText.includes(phrase), `packet must not contain byte/secret phrase ${phrase}`);
}

const contract = packet.contract ?? {};
assertAllowedKeys(contract, "remote-service contract", [
  "id",
  "proofBackend",
  "supportedTargets",
  "publicInputLabels",
  "requestTranscriptMustBind",
  "responseMustExpose",
  "witnessPolicy",
  "operatorReceiptPolicy",
]);
assert(contract.id === "remote-service-production-prover-contract-v0", "contract id mismatch");
assert(contract.proofBackend === "remote-service", "contract must use remote-service backend");
for (const target of ["shield", "claim", "swap-to-shielded", "send", "actual-private-spend"]) {
  assert(contract.supportedTargets?.includes(target), `contract missing target ${target}`);
}
for (const label of [
  "shield-public-input-hash",
  "claim-public-input-hash",
  "swap-public-input-hash",
  "send-public-input-hash",
  "private-spend-public-input-hash",
]) {
  assert(contract.publicInputLabels?.includes(label), `contract missing public input label ${label}`);
}
for (const marker of [
  "target",
  "public-input-hash",
  "prover-runtime-id",
  "production-verifying-key-hash-or-selected-backend-equivalent",
]) {
  assert(contract.requestTranscriptMustBind?.includes(marker), `contract missing request bind ${marker}`);
}
for (const marker of [
  "artifact-store-ref",
  "job-log-ref",
  "service-health-ref",
  "valid-proof-roundtrip-ref",
  "invalid-proof-rejection-ref",
  "operator-no-witness-acceptance-ref",
  "c01-compatibility-ref",
  "audit-or-reviewer-acceptance-ref",
]) {
  assert(contract.responseMustExpose?.includes(marker), `contract missing response ref ${marker}`);
}
includes(contract.witnessPolicy, "explicit opt-in", "contract witness policy");
includes(contract.operatorReceiptPolicy, "no witness material", "contract operator receipt policy");

assert(packet.currentPositiveEvidence?.runtimeDirectionSelected === true, "direction selected evidence missing");
for (const field of [
  "productionProofFormatContract",
  "productionVerifyingKeyEvidence",
  "c01VerifierCompatibility",
  "deployedProverHealth",
  "artifactStoreRefs",
  "jobLogRefs",
  "validProofRoundtrip",
  "invalidProofRejection",
  "liveRouteWiring",
  "operatorNoWitnessProductionAcceptance",
  "auditReviewerAcceptance",
]) {
  assert(packet.currentPositiveEvidence?.[field] === false, `${field} must remain false`);
}

assert(h08Candidate.selectedProverRuntime === null, "H08 candidate must not promote production runtime");
assert(
  h08Candidate.selectedRuntimeDirection === "remote-service-production-prover",
  "H08 candidate must reference selected remote-service direction",
);
assert(
  h08Candidate.selectedRuntimeDirectionRef === packetPath,
  "H08 candidate must reference remote-service contract packet",
);
assert(runtimeOptions.selectedProverRuntime === null, "runtime options must not promote production runtime");
assert(
  runtimeOptions.selectedRuntimeDirection === "remote-service-production-prover",
  "runtime options must reference selected remote-service direction",
);
assert(
  runtimeOptions.selectedRuntimeDirectionRef === packetPath,
  "runtime options must reference remote-service contract packet",
);
const remoteOption = runtimeOptions.runtimeOptions?.find(
  (option) => option.id === "remote-service-production-prover",
);
const browserOption = runtimeOptions.runtimeOptions?.find(
  (option) => option.id === "browser-worker-production-runtime",
);
assert(remoteOption?.selectedAsLocalDirection === true, "remote option must be selected locally");
assert(browserOption?.selectedAsLocalDirection === false, "browser option must not be selected locally");
assert(c01Options.selectedBackend === null, "C01 backend must remain unselected");

for (const command of [
  "npm run zk:h08-remote-service-prover-contract-check",
  "npm run zk:h08-production-prover-runtime-options-check",
  "npm run zk:h08-production-prover-candidate-check",
  "npm run zk:c01-verifier-backend-decision-check",
  "npm run private-pool-v2:proof-backend-boundary-check",
]) {
  assert(packet.canonicalCommands?.includes(command), `packet canonical commands missing ${command}`);
  assert(h08Candidate.canonicalCommands?.includes(command), `H08 candidate canonical commands missing ${command}`);
  assert(runtimeOptions.canonicalCommands?.includes(command), `runtime options canonical commands missing ${command}`);
}

for (const source of [review, findings, readme, securityLimitations, tradeoffs]) {
  includes(source, "remote-service-production-prover", "H08 remote service docs");
  includes(source, "selectedRuntimeDirection", "H08 selected direction docs");
}
for (const marker of [
  "not a production prover runtime",
  "C01 verifier compatibility",
  "deployed prover health",
  "audit",
]) {
  includes(tradeoffs, marker, "prover tradeoff truth");
}

console.log("private-pool-v2 H08 remote-service prover contract: PASS");

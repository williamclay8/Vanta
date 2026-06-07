#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  VANTA_PHASE2_PRODUCT_PROOF_REQUEST_CLAIM_BOUNDARY,
  VANTA_PHASE2_PRODUCT_PROOF_RESULT_CLAIM_BOUNDARY,
  assertNoPrivateProofRequestLeak,
  assertNoPrivateProofResultLeak,
  createSelectiveDisclosureBrowserProofResultPacket,
  createSelectiveDisclosureBrowserProofRequest,
  createVantaPhase2ProductProofResultPacket,
  createVelocityAggregateBrowserProofResultPacket,
  createVelocityAggregateBrowserProofRequest,
} from "../src/zk/vantaPhase2ProductProofRequests.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];

function sourceOf(path) {
  const absolutePath = resolve(repoRoot, path);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${path}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requireMarkers(path, markers) {
  const source = sourceOf(path);
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(`Missing marker "${marker}" in ${path}`);
    }
  }
  return source;
}

const selectiveRequest = createSelectiveDisclosureBrowserProofRequest({
  amount_commitment: "poseidon:amount-commitment-redacted-demo",
  expected_jurisdiction: "US",
  threshold: "100",
});

const velocityRequest = createVelocityAggregateBrowserProofRequest({
  expected_accredited: true,
  expected_jurisdiction: "US",
  period_end: "1767225600",
  period_start: "1767139200",
  threshold: "300000",
  velocity_commitment: "poseidon:velocity-commitment-redacted-demo",
});

assert.equal(selectiveRequest.adapterId, "selectiveDisclosure");
assert.equal(selectiveRequest.circuitPath, "zk/noir/vanta_selective_disclosure");
assert.equal(selectiveRequest.browserWorkerMessage.payload.witnessInput, null);
assert.equal(selectiveRequest.browserWorkerMessage.payload.compressedWitness, null);
assert.equal(selectiveRequest.privateInputsDisclosed, false);
assert.equal(selectiveRequest.witnessDisclosed, false);
assert.equal(selectiveRequest.claimBoundary, VANTA_PHASE2_PRODUCT_PROOF_REQUEST_CLAIM_BOUNDARY);
assert.ok(
  selectiveRequest.verificationCommands.includes("npm run zk:selective-disclosure-circuit-check"),
  "selective disclosure proof request must link its circuit check",
);

assert.equal(velocityRequest.adapterId, "velocityAggregate");
assert.equal(velocityRequest.circuitPath, "zk/noir/vanta_velocity_aggregate");
assert.equal(velocityRequest.browserWorkerMessage.payload.witnessInput, null);
assert.equal(velocityRequest.browserWorkerMessage.payload.compressedWitness, null);
assert.equal(velocityRequest.privateInputsDisclosed, false);
assert.equal(velocityRequest.witnessDisclosed, false);
assert.ok(
  velocityRequest.verificationCommands.includes("npm run zk:velocity-aggregate-circuit-check"),
  "velocity aggregate proof request must link its circuit check",
);

assertNoPrivateProofRequestLeak(selectiveRequest, [
  "150.00",
  "buyer@institution.example",
  "opening-blinding-secret",
]);
assertNoPrivateProofRequestLeak(velocityRequest, [
  "250000",
  "50000",
  "75000",
  "475000",
  "velocity-secret-2026",
]);

const selectiveResult = createVantaPhase2ProductProofResultPacket(selectiveRequest, {
  kind: "dev-only-noir-worker-result-summary",
  ok: true,
  proofResultId: "selective-disclosure-dev-result-demo",
  publicOutputs: {
    amountAboveThreshold: true,
    jurisdictionMatched: true,
  },
});

const velocityResult = createVelocityAggregateBrowserProofResultPacket(
  velocityRequest.publicInputs,
  {
    kind: "dev-only-noir-worker-result-summary",
    ok: true,
    proofResultId: "velocity-aggregate-dev-result-demo",
    publicOutputs: {
      accreditedMatched: true,
      jurisdictionMatched: true,
      velocityAboveThreshold: true,
    },
  },
  { request: velocityRequest },
);

const selectiveResultViaHelper = createSelectiveDisclosureBrowserProofResultPacket(
  selectiveRequest.publicInputs,
  {
    ok: true,
    publicOutputs: {
      amountAboveThreshold: true,
      jurisdictionMatched: true,
    },
  },
  { request: selectiveRequest },
);

assert.equal(selectiveResult.requestId, selectiveRequest.requestId);
assert.equal(selectiveResult.publicInputHash, selectiveRequest.publicInputHash);
assert.equal(selectiveResult.proofStatus, "dev-result-shaped-proof-not-generated");
assert.equal(selectiveResult.claimBoundary, VANTA_PHASE2_PRODUCT_PROOF_RESULT_CLAIM_BOUNDARY);
assert.equal(selectiveResult.privateInputsDisclosed, false);
assert.equal(selectiveResult.witnessDisclosed, false);
assert.equal(selectiveResult.proofBytesPubliclyDisclosed, false);
assert.equal(selectiveResult.generatedProofClaimAllowed, false);
assert.equal(selectiveResult.productionReady, false);
assert.ok(selectiveResult.publicOutputHash.startsWith("sha256:"));
assert.equal(selectiveResultViaHelper.requestId, selectiveRequest.requestId);

assert.equal(velocityResult.requestId, velocityRequest.requestId);
assert.equal(velocityResult.publicInputHash, velocityRequest.publicInputHash);
assert.equal(velocityResult.claimBoundary, VANTA_PHASE2_PRODUCT_PROOF_RESULT_CLAIM_BOUNDARY);
assert.ok(
  velocityResult.verificationCommands.includes("npm run zk:velocity-aggregate-circuit-check"),
  "velocity aggregate proof result must link its circuit check",
);

assertNoPrivateProofResultLeak(selectiveResult, [
  "150.00",
  "buyer@institution.example",
  "opening-blinding-secret",
]);
assertNoPrivateProofResultLeak(velocityResult, [
  "250000",
  "50000",
  "75000",
  "475000",
  "velocity-secret-2026",
]);

assert.throws(
  () =>
    createVantaPhase2ProductProofResultPacket(selectiveRequest, {
      ok: true,
      proofBytes: "0xdeadbeef",
    }),
  /must not include proofBytes/,
);
assert.throws(
  () =>
    createVantaPhase2ProductProofResultPacket(velocityRequest, {
      ok: true,
      witnessInput: { amount: "475000" },
    }),
  /must not include witnessInput/,
);

requireMarkers("src/zk/vantaPhase2ProductProofRequests.mjs", [
  "VANTA_PHASE2_PRODUCT_PROOF_REQUEST_SCHEMA_VERSION",
  "VANTA_PHASE2_PRODUCT_PROOF_RESULT_SCHEMA_VERSION",
  "createVantaPhase2ProductProofRequest",
  "createVantaPhase2ProductProofResultPacket",
  "createSelectiveDisclosureBrowserProofRequest",
  "createSelectiveDisclosureBrowserProofResultPacket",
  "createVelocityAggregateBrowserProofRequest",
  "createVelocityAggregateBrowserProofResultPacket",
  "assertNoPrivateProofRequestLeak",
  "assertNoPrivateProofResultLeak",
  "browser-worker-noir-js-candidate",
  "request-shaped-proof-not-generated",
  "dev-result-shaped-proof-not-generated",
  "generatedProofClaimAllowed",
  "beta-real-noir-proof-result-adapter-dev-only-not-generated-proof-or-production-private",
  "witnessInput: null",
  "compressedWitness: null",
  "beta-real-noir-proof-request-shape-not-proof-generation-or-production-private",
]);

requireMarkers("package.json", [
  "zk:phase2-product-proof-requests-check",
]);

if (failures.length > 0) {
  console.error("Vanta Phase 2 product proof requests check: FAIL");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Vanta Phase 2 product proof requests check: PASS");
console.log("Selective disclosure and velocity aggregate browser-worker request/result shapes are claim-blocked, witnessless, and package-wired.");

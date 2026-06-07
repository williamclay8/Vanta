#!/usr/bin/env node
/**
 * Vanta Shielded RWA Tokenization Suite Check (Product 3 Full MVP TDD Harness)
 * Executes the demo, asserts end-to-end success, private flows (commitments hide values),
 * ownership proof, selective disclosure (accredited + amount threshold),
 * settlement hooks to Pay/Pool/compliance, no leaks, claim boundaries, markers, banned claims.
 * Mirrors perps + compliance gateway pattern exactly for consistency.
 * Run: node scripts/check-vanta-shielded-rwa-mvp.mjs
 */

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  VANTA_SHIELDED_RWA_CLAIM_BOUNDARY,
  buildShieldedRWAFlow,
} from "../src/rwa/vantaShieldedRWA.mjs";

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

// Run the demo and capture output (functional verification)
console.log("Running demo-vanta-shielded-rwa-mvp.mjs for end-to-end verification...");
let demoOutput = "";
try {
  demoOutput = execSync("node scripts/demo-vanta-shielded-rwa-mvp.mjs", {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 15000
  });
  console.log(demoOutput);
} catch (e) {
  failures.push(`Demo execution failed: ${e.message}`);
  if (e.stdout) console.error(e.stdout);
}

// Basic assertions on demo success (TDD-style, adapted from perps/compliance)
assert.ok(demoOutput.includes("DEMO COMPLETE: SUCCESS"), "Demo must report SUCCESS");
assert.ok(demoOutput.includes("Private Ownership Proof:"), "Ownership proof section must be present");
assert.ok(demoOutput.includes("Owns: true"), "Private ownership must verify as true");
assert.ok(demoOutput.includes("Proofs: 2"), "Selective disclosure must produce 2 proofs (accredited + amount threshold)");
assert.ok(demoOutput.includes("beta-shielded-rwa-not-production-private-rwa-or-tokenization"), "Claim boundary must be present and correct");
assert.ok(demoOutput.includes("Settlement ref:"), "Pay/Private Pool + compliance settlement hook must be present");
assert.ok(demoOutput.includes("Commitment:"), "RWA issuance commitment must be demonstrated");

const privateRWA = {
  issuanceAmount: "250000",
  assetClass: "REAL_ESTATE_TOKEN",
  ownerSecret: "rwa-owner-secret-2026-xxx",
  jurisdiction: "US",
  accredited: true,
};
const publicFlow = buildShieldedRWAFlow(privateRWA);
const publicFlowJson = JSON.stringify(publicFlow);
assert.equal(publicFlow.object, "shielded_rwa_public_flow_packet", "RWA flow must use reusable src/rwa public packet");
assert.equal(publicFlow.claimBoundary, VANTA_SHIELDED_RWA_CLAIM_BOUNDARY, "RWA module claim boundary must match demo");
assert.equal(publicFlow.selectiveDisclosure.selectiveProofs.length, 2, "RWA module must produce 2 selective proofs");
assert.equal(
  publicFlow.selectiveDisclosure.realNoirAdapters[0].circuitPath,
  "zk/noir/vanta_selective_disclosure",
  "RWA disclosure must point at the selective disclosure Noir adapter"
);
assert.equal(publicFlow.settlement.hooks.privacySDK, "vantaPrivacySDK", "RWA settlement must route through SDK primitives");

// No leak checks on demo output (critical private RWA values only - not descriptive words)
const bannedLeaks = ["250000", "rwa-owner-secret-2026-xxx", "ownerSecret", "privateWitness"];
for (const leak of bannedLeaks) {
  assert.ok(!demoOutput.includes(leak), `Leak detected in demo output: ${leak}`);
  assert.ok(!publicFlowJson.includes(leak), `Leak detected in module public flow: ${leak}`);
}

// File and marker checks (extend the RWA + prior patterns)
requireMarkers("scripts/demo-vanta-shielded-rwa-mvp.mjs", [
  "Vanta Shielded RWA Tokenization Suite Demo",
  "issuePrivateRWA",
  "provePrivateOwnership",
  "createSelectiveDisclosureForRWA",
  "createRWASettlementStub",
  "DEMO COMPLETE: SUCCESS",
  "claimBoundary",
]);

requireMarkers("src/rwa/vantaShieldedRWA.mjs", [
  "VANTA_SHIELDED_RWA_SCHEMA_VERSION",
  "VANTA_SHIELDED_RWA_CLAIM_BOUNDARY",
  "issuePrivateRWA",
  "toPublicRWACommitmentPacket",
  "provePrivateOwnership",
  "createSelectiveDisclosureForRWA",
  "createRWASettlementStub",
  "buildShieldedRWAFlow",
  "assertNoPrivateRWALeaks",
  "VANTA_REAL_NOIR_ADAPTERS.selectiveDisclosure",
  "accreditedInvestor",
  "amountAboveThreshold",
  "privateWitness",
  "beta-shielded-rwa-not-production-private-rwa-or-tokenization",
]);

requireMarkers("src/sdk/vantaPrivacySDK.mjs", [
  "buildPrivatePositionOrRWAWithSDK",
  "toPublicCommitmentPacket",
  "VANTA_REAL_NOIR_ADAPTERS",
  "accreditedInvestor",
  "amountAboveThreshold",
]);

requireMarkers("package.json", [
  "shielded-rwa:check",
  "npm run shielded-rwa:check",
  "zk:selective-disclosure-circuit-check",
  "zk:phase2-product-proof-requests-check",
]);

// Banned claim checks (Vanta culture - same as perps + compliance)
const bannedClaims = [
  "Fully private",
  "Regulator-approved",
  "Compliance-safe",
  "Production private",
  "Live mainnet private settlement",
  "Production-ready private RWA",
  "Fully shielded RWA",
  "Fully private tokenization",
];
for (const sourcePath of [
  "scripts/demo-vanta-shielded-rwa-mvp.mjs",
  "src/rwa/vantaShieldedRWA.mjs",
]) {
  const src = sourceOf(sourcePath);
  for (const banned of bannedClaims) {
    if (src.includes(banned)) {
      failures.push(`Banned claim in ${sourcePath}: ${banned}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Vanta Shielded RWA Tokenization Suite check: FAIL");
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}

console.log("Vanta Shielded RWA Tokenization Suite check: PASS");
console.log("All functional flows, no leaks, claims fail-closed, markers present, Pay/Pool/compliance integration hooks verified.");

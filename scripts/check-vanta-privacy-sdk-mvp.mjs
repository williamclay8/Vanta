#!/usr/bin/env node
/**
 * Vanta Privacy SDK & Primitives Marketplace Check (Product 4 FULL MVP TDD Harness)
 * Executes the demo, asserts composable SDK flows (RWA + perp + velocity + composer + marketplace acquisition),
 * commitments hide values, ownership/velocity proofs, selective disclosures, marketplace (6 primitives + use),
 * settlement hooks, no leaks, claim boundaries, markers, banned claims.
 * Mirrors perps/RWA/compliance pattern. Full expansion from starter.
 * Run: node scripts/check-vanta-privacy-sdk-mvp.mjs
 */

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  buildPrivatePositionOrRWAWithSDK,
  buildVelocityFlowWithSDK,
  getRealNoirAdapter,
} from "../src/sdk/vantaPrivacySDK.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];

function assertPublicPacketNoLeak(label, packet, bannedValues) {
  const serialized = JSON.stringify(packet);
  for (const leak of bannedValues) {
    assert.ok(!serialized.includes(leak), `${label} leaked private value or witness marker: ${leak}`);
  }
}

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
console.log("Running demo-vanta-privacy-sdk-mvp.mjs for end-to-end verification...");
let demoOutput = "";
try {
  demoOutput = execSync("/usr/local/bin/node scripts/demo-vanta-privacy-sdk-mvp.mjs", {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 15000
  });
  console.log(demoOutput);
} catch (e) {
  failures.push(`Demo execution failed: ${e.message}`);
  if (e.stdout) console.error(e.stdout);
}

// Basic assertions on demo success (TDD-style) - expanded for FULL
assert.ok(demoOutput.includes("DEMO COMPLETE: SUCCESS"), "Demo must report SUCCESS");
assert.ok(demoOutput.includes("SDK-composed Shielded RWA:"), "RWA composable flow must be present");
assert.ok(demoOutput.includes("SDK-composed Private Position"), "Perp/position composable flow must be present");
assert.ok(demoOutput.includes("SDK-composed Velocity Intelligence Flow"), "Velocity composable flow must be present (Product 5 bridge)");
assert.ok(demoOutput.includes("Privacy Primitives Marketplace (FULL - 6 composable primitives)"), "Enhanced marketplace (6 primitives) must be demonstrated");
assert.ok(demoOutput.includes("Marketplace Acquisition Example:"), "Marketplace use/acquisition helper must be demonstrated");
assert.ok(demoOutput.includes("Composed Predicates (accredited + velocity):"), "Predicate composer must be demonstrated");
assert.ok(demoOutput.includes("beta-privacy-sdk-not-production-private-or-audited-primitives"), "Claim boundary must be present and correct");
assert.ok(demoOutput.includes("Verification commands: npm run privacy-sdk:check"), "SDK check command must be referenced");

// No leak checks (private values from examples)
const bannedLeaks = ["250000", "50000", "125000", "sdk-rwa-owner-2026", "sdk-perp-owner-2026"];
for (const leak of bannedLeaks) {
  assert.ok(!demoOutput.includes(leak), `Leak detected in demo output: ${leak}`);
}

const sdkRwaFlow = buildPrivatePositionOrRWAWithSDK({
  amount: "250000",
  asset: "REAL_ESTATE_TOKEN",
  ownerSecret: "sdk-rwa-owner-2026",
  accredited: true,
}, "rwa");
const sdkVelocityFlow = buildVelocityFlowWithSDK(["250000", "50000", "125000"], 300000);
assertPublicPacketNoLeak("SDK RWA public flow", sdkRwaFlow, [
  "250000",
  "sdk-rwa-owner-2026",
  "privateWitness",
  "totalHidden",
]);
assertPublicPacketNoLeak("SDK velocity public flow", sdkVelocityFlow, [
  "250000",
  "50000",
  "125000",
  "425000",
  "privateWitness",
  "totalHidden",
]);
assert.equal(
  getRealNoirAdapter("selectiveDisclosure").circuitPath,
  "zk/noir/vanta_selective_disclosure",
);
assert.equal(
  getRealNoirAdapter("selectiveDisclosure").verificationCommand,
  "npm run zk:selective-disclosure-circuit-check",
);
assert.equal(
  getRealNoirAdapter("velocityAggregate").circuitPath,
  "zk/noir/vanta_velocity_aggregate",
);
assert.equal(
  getRealNoirAdapter("velocityAggregate").verificationCommand,
  "npm run zk:velocity-aggregate-circuit-check",
);

// File and marker checks - expanded
requireMarkers("scripts/demo-vanta-privacy-sdk-mvp.mjs", [
  "Vanta Privacy SDK & Primitives Marketplace Demo",
  "buildPrivatePositionOrRWAWithSDK",
  "buildVelocityFlowWithSDK",
  "getMarketplacePrimitives",
  "useMarketplacePrimitive",
  "composePredicates",
  "DEMO COMPLETE: SUCCESS",
  "claimBoundary",
  "beta-privacy-sdk-not-production-private-or-audited-primitives",
]);

requireMarkers("src/sdk/vantaPrivacySDK.mjs", [
  "VANTA_PRIVACY_SDK_SCHEMA_VERSION",
  "createCommitment",
  "createNullifier",
  "createSelectiveDisclosure",
  "createSettlementStub",
  "createVelocityCommitment",
  "proveVelocityAboveThreshold",
  "composePredicates",
  "getMarketplacePrimitives",
  "useMarketplacePrimitive",
  "buildPrivatePositionOrRWAWithSDK",
  "buildVelocityFlowWithSDK",
  "VANTA_REAL_NOIR_ADAPTERS",
  "toPublicCommitmentPacket",
  "npm run zk:selective-disclosure-circuit-check",
  "npm run zk:velocity-aggregate-circuit-check",
  "beta-privacy-sdk-not-production-private-or-audited-primitives",
]);

requireMarkers("package.json", [
  "privacy-sdk:check",
  "zk:selective-disclosure-circuit-check",
  "zk:velocity-aggregate-circuit-check",
  "zk:phase2-product-circuits-check",
  "zk:phase2-product-proof-requests-check",
]);

// Banned claim checks (Vanta culture)
const bannedClaims = [
  "Fully private",
  "Regulator-approved",
  "Compliance-safe",
  "Production private",
  "Live mainnet private settlement",
  "Production-ready private SDK",
  "Fully audited primitives",
  "Production SDK",
];
for (const sourcePath of [
  "scripts/demo-vanta-privacy-sdk-mvp.mjs",
  "src/sdk/vantaPrivacySDK.mjs",
]) {
  const src = sourceOf(sourcePath);
  for (const banned of bannedClaims) {
    if (src.includes(banned)) {
      failures.push(`Banned claim in ${sourcePath}: ${banned}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Vanta Privacy SDK & Primitives Marketplace check: FAIL");
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}

console.log("Vanta Privacy SDK & Primitives Marketplace check: PASS");
console.log("All composable flows (incl. velocity + composer), marketplace (6 primitives + acquisition), no leaks, claims fail-closed, markers present, integration hooks verified.");

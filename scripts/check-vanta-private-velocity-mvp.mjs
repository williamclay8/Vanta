#!/usr/bin/env node
/**
 * Vanta Private Velocity Intelligence Check (Product 5 FULL MVP TDD Harness)
 * Executes the demo, asserts private velocity flows (commitments, predicates, selective disclosures incl. compliance, dashboard, settlement, SDK marketplace + composer integration, nullifiers/rollovers),
 * hidden aggregates, threshold proofs, no leaks, claim boundaries, markers, banned claims.
 * Mirrors SDK/RWA/perps pattern. Uses Product 4 SDK primitives + composer.
 * Run: node scripts/check-vanta-private-velocity-mvp.mjs
 */

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  buildPrivateVelocityIntelligenceFlow,
} from "../src/velocity/vantaPrivateVelocityIntelligence.mjs";

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
console.log("Running demo-vanta-private-velocity-mvp.mjs for end-to-end verification...");
let demoOutput = "";
try {
  demoOutput = execSync("/usr/local/bin/node scripts/demo-vanta-private-velocity-mvp.mjs", {
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
assert.ok(demoOutput.includes("Private Velocity Commitment (aggregate from shielded sources, hidden, with period):"), "Velocity commitment section (with period) must be present");
assert.ok(demoOutput.includes("Private Velocity Predicates (prove above thresholds without revealing sum):"), "Velocity predicates must be demonstrated");
assert.ok(demoOutput.includes("Selective Disclosure (institutional velocity facts + compliance: jurisdiction, accredited):"), "Selective institutional + compliance disclosure must be present");
assert.ok(demoOutput.includes("Public Dashboard Stub (predicates + redacted insights only):"), "Dashboard stub must be demonstrated (with redactedRange, complianceFactsIncluded)");
assert.ok(demoOutput.includes("SDK Marketplace Integration (velocity primitive):"), "SDK marketplace integration must be shown");
assert.ok(demoOutput.includes("Composed Predicates (velocity + compliance via SDK composer):"), "SDK predicate composer integration must be demonstrated");
assert.ok(demoOutput.includes("Velocity Nullifier + Private Rollover/Update (FULL feature):"), "Velocity nullifier + rollover must be demonstrated");
assert.ok(demoOutput.includes("beta-private-velocity-not-production-private-analytics-or-dashboards"), "Claim boundary must be present and correct");
assert.ok(demoOutput.includes("Verification commands: npm run velocity-intelligence:check"), "Check command must be referenced");

// No leak checks (private velocity values) - updated banned
const bannedLeaks = ["250000", "50000", "75000", "475000", "sdk-rwa-owner-2026", "sdk-perp-owner-2026", "velocity-secret-2026"];
for (const leak of bannedLeaks) {
  assert.ok(!demoOutput.includes(leak), `Leak detected in demo output: ${leak}`);
}

const velocityPublicFlow = buildPrivateVelocityIntelligenceFlow(
  [["250000"], ["50000", "75000"], ["100000"]],
  [100000, 300000],
  [
    { kind: "jurisdictionMatch", value: "US", predicate: "jurisdiction == US", result: true },
    { kind: "accreditedInvestor", value: "true", predicate: "accredited == true", result: true },
  ],
);
assertPublicPacketNoLeak("Velocity public flow", velocityPublicFlow, [
  "250000",
  "50000",
  "75000",
  "475000",
  "velocity-secret-2026",
  "privateWitness",
  "totalHidden",
]);
assert.equal(
  velocityPublicFlow.dashboard.realNoirAdapter.circuitPath,
  "zk/noir/vanta_velocity_aggregate",
);

// File and marker checks - expanded for FULL
requireMarkers("scripts/demo-vanta-private-velocity-mvp.mjs", [
  "Vanta Private Velocity Intelligence Demo",
  "buildPrivateVelocityIntelligenceFlow",
  "DEMO COMPLETE: SUCCESS",
  "claimBoundary",
  "beta-private-velocity-not-production-private-analytics-or-dashboards",
  "jurisdictionMatch",
  "accreditedInvestor",
  "nullifier",
  "rollover",
]);

requireMarkers("src/velocity/vantaPrivateVelocityIntelligence.mjs", [
  "VANTA_PRIVATE_VELOCITY_SCHEMA_VERSION",
  "computePrivateVelocity",
  "provePrivateVelocityAboveThreshold",
  "createVelocitySelectiveDisclosure",
  "createVelocityDashboardStub",
  "createVelocityNullifier",
  "updateVelocityWithNullifier",
  "buildPrivateVelocityIntelligenceFlow",
  "beta-private-velocity-not-production-private-analytics-or-dashboards",
  "composePredicates",
  "disclosureSummary",
  "realNoirAdapter",
]);

requireMarkers("package.json", [
  "velocity-intelligence:check",
  "zk:velocity-aggregate-circuit-check",
  "zk:phase2-product-circuits-check",
  "zk:phase2-product-proof-requests-check",
]);
const packageJson = JSON.parse(sourceOf("package.json"));
assert.equal(
  packageJson.scripts?.["velocity-intelligence:check"],
  "node scripts/check-vanta-private-velocity-mvp.mjs",
);
assert.ok(
  packageJson.scripts?.["pay:verify"]?.includes("npm run velocity-intelligence:check"),
  "pay:verify must include the private velocity intelligence gate",
);
assert.equal(
  packageJson.scripts?.["zk:velocity-aggregate-circuit-check"],
  "node scripts/check-vanta-phase2-product-noir-circuit.mjs velocity-aggregate",
);

// Banned claim checks (Vanta culture)
const bannedClaims = [
  "Fully private",
  "Regulator-approved",
  "Compliance-safe",
  "Production private",
  "Live mainnet private settlement",
  "Production-ready private velocity",
  "Fully private analytics",
  "Production dashboards",
];
for (const sourcePath of [
  "scripts/demo-vanta-private-velocity-mvp.mjs",
  "src/velocity/vantaPrivateVelocityIntelligence.mjs",
]) {
  const src = sourceOf(sourcePath);
  for (const banned of bannedClaims) {
    if (src.includes(banned)) {
      failures.push(`Banned claim in ${sourcePath}: ${banned}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Vanta Private Velocity Intelligence check: FAIL");
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}

console.log("Vanta Private Velocity Intelligence check: PASS");
console.log("All private velocity flows (incl. compliance facts, composer, nullifiers/rollovers), predicates, disclosures, dashboard, marketplace integration, no leaks, claims fail-closed, markers present, hooks verified.");

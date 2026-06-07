#!/usr/bin/env node
/**
 * Vanta Private Velocity Intelligence Demo (Product 5 FULL MVP)
 * Private velocity tracking across shielded sources (RWA + perps + transfers).
 * Uses Product 4 SDK velocity primitives for commitments + predicates + composer.
 * Prove above thresholds, selective disclosure for institutional + compliance facts (jurisdiction, accredited).
 * Public dashboard stub (predicates + redacted insights).
 * Velocity nullifiers for private rollovers/updates.
 * Marketplace integration via SDK.
 * Pre-circuit. Builds on SDK + prior products (1-4).
 * Run: node scripts/demo-vanta-private-velocity-mvp.mjs
 */

import { strict as assert } from "node:assert";
import {
  VANTA_PRIVATE_VELOCITY_SCHEMA_VERSION,
  buildPrivateVelocityIntelligenceFlow,
} from "../src/velocity/vantaPrivateVelocityIntelligence.mjs";

console.log("=== Vanta Private Velocity Intelligence Demo (Product 5 FULL MVP) ===");
console.log("Schema:", VANTA_PRIVATE_VELOCITY_SCHEMA_VERSION);

const volumeSources = [
  ["250000"], // RWA
  ["50000", "75000"], // Perps
  ["100000"], // Transfers/other shielded
]; // Total hidden: 475000

const thresholds = [100000, 300000];

// FULL: extra compliance facts for selective (jurisdiction, accredited)
const extraFacts = [
  { kind: "jurisdictionMatch", value: "US", predicate: "jurisdiction == US", result: true },
  { kind: "accreditedInvestor", value: "true", predicate: "accredited == true", result: true },
];

const velocityFlow = buildPrivateVelocityIntelligenceFlow(volumeSources, thresholds, extraFacts);

console.log("\n1. Private Velocity Commitment (aggregate from shielded sources, hidden, with period):");
console.log("   Commitment:", velocityFlow.velocityCommitment.commitment);
console.log("   Period:", velocityFlow.velocityCommitment.period || "24h");
console.log("   Sources:", velocityFlow.velocityCommitment.count || "aggregated");

console.log("\n2. Private Velocity Predicates (prove above thresholds without revealing sum):");
velocityFlow.proofs.forEach((proof, i) => {
  console.log(`   Threshold ${thresholds[i]}: above=${proof.aboveThreshold}, predicate=${proof.predicate}, period=${proof.period || "24h"}`);
});

console.log("\n3. Selective Disclosure (institutional velocity facts + compliance: jurisdiction, accredited):");
console.log("   Disclosures:", velocityFlow.disclosure.selectiveProofs.length);
velocityFlow.disclosure.selectiveProofs.forEach(p => {
  console.log(`   - ${p.attribute.kind}: result=${p.publicInputs.result}`);
});

console.log("\n4. Public Dashboard Stub (predicates + redacted insights only):");
console.log("   Period:", velocityFlow.dashboard.publicInsights.period);
console.log("   Above thresholds:", velocityFlow.dashboard.publicInsights.aboveThresholds);
console.log("   Sources:", velocityFlow.dashboard.publicInsights.sources);
console.log("   Redacted range:", velocityFlow.dashboard.publicInsights.redactedRange);
console.log("   Compliance facts included:", velocityFlow.dashboard.publicInsights.complianceFactsIncluded);
console.log("   Claim boundary:", velocityFlow.dashboard.claimBoundary);

console.log("\n5. Settlement Stub (Pay + Pool + Compliance hooks):");
console.log("   Settlement ref:", velocityFlow.settlement.settlementRef);
console.log("   Hooks:", Object.keys(velocityFlow.settlement.hooks));

console.log("\n6. SDK Marketplace Integration (velocity primitive):");
console.log("   Acquired:", velocityFlow.velocityPrimitive.primitive.name);
console.log("   Marketplace primitives available:", velocityFlow.marketplace.length);

console.log("\n7. Composed Predicates (velocity + compliance via SDK composer):");
console.log("   Composed count:", velocityFlow.composedPredicates.count);
console.log("   Combined results:", velocityFlow.composedPredicates.results);

console.log("\n8. Velocity Nullifier + Private Rollover/Update (FULL feature):");
console.log("   Nullifier (private rollover):", velocityFlow.nullifier.nullifier);
console.log("   Updated velocity (new period 7d, reduced volumes hidden):", velocityFlow.updatedVelocity.newCommitment.commitment.slice(0, 16) + "...");
console.log("   New period:", velocityFlow.updatedVelocity.period);

assert.ok(velocityFlow.velocityCommitment.commitment.length === 64);
assert.ok(velocityFlow.proofs.length === 2);
assert.ok(velocityFlow.disclosure.selectiveProofs.length >= 4); // velocity + 2 compliance
assert.ok(velocityFlow.dashboard.publicInsights.aboveThresholds.length === 2);
assert.ok(velocityFlow.dashboard.publicInsights.redactedRange);
assert.ok(velocityFlow.dashboard.claimBoundary.includes("beta-private-velocity-not-production-private-analytics-or-dashboards"));
assert.ok(velocityFlow.velocityPrimitive.primitive.id === "velocity-v0.1");
assert.ok(velocityFlow.marketplace.length >= 6);
assert.ok(velocityFlow.composedPredicates.count >= 4);
assert.ok(velocityFlow.nullifier);
assert.ok(velocityFlow.updatedVelocity.newCommitment);

console.log("\n=== DEMO COMPLETE: SUCCESS (Private Velocity Intelligence FULL MVP) ===");
console.log("Private aggregate velocity from shielded sources (1-4 products). Threshold predicates proven privately. Selective institutional + compliance facts (jurisdiction, accredited) disclosed only. Dashboard stub with redacted + composer. Velocity nullifiers for private rollovers. Settlement hooks ready. SDK marketplace + composer integration.");
console.log("Verification commands: npm run velocity-intelligence:check , npm run privacy-sdk:check , npm run pay:verify , npm run compliance:gateway-check");
console.log("Next: Real aggregate ZK circuits (sum proofs), on-chain velocity oracles, full public dashboards, full institutional API.");

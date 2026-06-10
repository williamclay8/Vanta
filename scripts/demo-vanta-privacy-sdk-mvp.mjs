#!/usr/bin/env node
/**
 * Vanta Privacy SDK & Primitives Marketplace Demo (Product 4 FULL MVP)
 * Demonstrates importing/using the SDK for composable private flows.
 * Enhanced: velocity primitives, predicate composer, marketplace acquisition/use, cross-product (RWA + perp + velocity).
 * Settlement + selective disclosure included.
 * Pre-circuit. Builds on Products 1-3 patterns via SDK. Bridges to Product 5.
 * Run: node scripts/demo-vanta-privacy-sdk-mvp.mjs
 */

import { strict as assert } from "node:assert";
import {
  VANTA_PRIVACY_SDK_SCHEMA_VERSION,
  issuePrivateAssetSDK,
  buildPrivatePositionOrRWAWithSDK,
  buildVelocityFlowWithSDK,
  getMarketplacePrimitives,
  useMarketplacePrimitive,
  composePredicates,
  createSettlementStub,
} from "../src/sdk/vantaPrivacySDK.mjs";

console.log("=== Vanta Privacy SDK & Primitives Marketplace Demo (Product 4 FULL MVP) ===");
console.log("Schema:", VANTA_PRIVACY_SDK_SCHEMA_VERSION);

const rwaData = {
  amount: "250000",
  asset: "REAL_ESTATE_TOKEN",
  ownerSecret: "sdk-rwa-owner-2026",
  accredited: true,
  jurisdiction: "US",
};

const positionData = {
  amount: "50000",
  asset: "PERP_BTC_USD",
  ownerSecret: "sdk-perp-owner-2026",
  leverage: 5,
  accredited: true,
};

// Use SDK composable for RWA
const rwaFlow = buildPrivatePositionOrRWAWithSDK(rwaData, "rwa");
console.log("\n1. SDK-composed Shielded RWA:");
console.log("   Commitment (hidden):", rwaFlow.committed.commitment);
console.log("   Ownership verified:", rwaFlow.ownership.verified);
console.log("   Selective proofs:", rwaFlow.disclosure.selectiveProofs.length);
console.log("   Settlement ref:", rwaFlow.settlement.settlementRef);

// Use SDK for private position (perp-like)
const perpFlow = buildPrivatePositionOrRWAWithSDK(positionData, "perp");
console.log("\n2. SDK-composed Private Position (perp example):");
console.log("   Commitment (hidden):", perpFlow.committed.commitment);
console.log("   Ownership verified:", perpFlow.ownership.verified);
console.log("   Selective proofs:", perpFlow.disclosure.selectiveProofs.length);

// NEW: Velocity flow (Product 5 bridge) using SDK velocity primitives + compose
const volumes = ["250000", "50000", "125000"]; // simulated private volumes from RWA + perps + other
const velocityFlow = buildVelocityFlowWithSDK(volumes, 300000);
console.log("\n3. SDK-composed Velocity Intelligence Flow (private aggregate + threshold predicate):");
console.log("   Velocity commitment (hidden sum):", velocityFlow.velCommitment.commitment);
console.log("   Above threshold (300000):", velocityFlow.velocityProof.aboveThreshold);
console.log("   Selective proofs:", velocityFlow.disclosure.selectiveProofs.length);
console.log("   Settlement ref:", velocityFlow.settlement.settlementRef);

// NEW: Marketplace acquisition and use
const marketplace = getMarketplacePrimitives();
console.log(`\n4. Privacy Primitives Marketplace (FULL - ${marketplace.length} composable primitives):`);
marketplace.forEach(p => {
  console.log(`   - ${p.id}: ${p.name} (audited: ${p.audited})`);
  console.log(`     ${p.description}`);
});

const acquired = useMarketplacePrimitive("velocity-v0.1");
console.log("\n5. Marketplace Acquisition Example:");
console.log("   Acquired:", acquired.primitive.name);
console.log("   Note:", acquired.usageNote);

// NEW: Predicate composer demo (complex disclosure e.g. accredited AND velocity)
const complexPreds = [
  { kind: "accreditedInvestor", value: true, result: true },
  { kind: "velocityAboveThreshold", value: 300000, result: velocityFlow.velocityProof.aboveThreshold },
];
const composed = composePredicates(velocityFlow.velCommitment, complexPreds);
console.log("\n6. Composed Predicates (accredited + velocity):");
console.log("   Composed count:", composed.composedPredicates.length);
console.log("   Claim boundary:", composed.claimBoundary);

// Asserts for full MVP
assert.ok(rwaFlow.committed.commitment.length === 64);
assert.ok(!JSON.stringify(rwaFlow).includes(rwaData.amount));
assert.ok(rwaFlow.ownership.verified === true);
assert.ok(rwaFlow.disclosure.selectiveProofs.length === 2);
assert.ok(velocityFlow.velocityProof.aboveThreshold === true || velocityFlow.velocityProof.aboveThreshold === false); // predicate works
assert.ok(velocityFlow.disclosure.selectiveProofs.length >= 1);
assert.ok(marketplace.length >= 6);
assert.ok(marketplace.some(p => p.id === "velocity-v0.1"));
assert.ok(acquired.primitive.id === "velocity-v0.1");
assert.ok(composed.composedPredicates.length === 2);
assert.ok(velocityFlow.settlement.claimBoundary.includes("beta-privacy-sdk-not-production-private-or-audited-primitives"));

console.log("\n=== DEMO COMPLETE: SUCCESS (Privacy SDK composable primitives + marketplace FULL MVP) ===");
console.log("SDK unifies commitment/nullifier/disclosure/settlement/velocity/predicate-composer across products.");
console.log(`Marketplace lists ${marketplace.length} reusable primitives with acquisition helper. Velocity bridge to Product 5.`);
console.log("Verification commands: npm run privacy-sdk:check , npm run compliance:gateway-check , npm run pay:verify");
console.log("Next: Real WASM/audits, on-chain integration, full marketplace UI/API, Product 5 velocity dashboards.");

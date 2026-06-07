#!/usr/bin/env node
/**
 * Vanta Shielded RWA Tokenization Suite Demo (Product 3 Starter MVP)
 * Private RWA issuance with commitment-hiding amount/owner/details.
 * Private ownership proofs + nullifier for transfers.
 * Selective disclosure for compliance (accredited + amount threshold).
 * Settlement stub with Pay/Private Pool + compliance gateway hooks.
 * Pre-circuit crypto commitments (no leaks, verifiable predicates).
 * Builds on Product 1 disclosure + Product 2 perps patterns.
 * Run: node scripts/demo-vanta-shielded-rwa-mvp.mjs
 */

import { strict as assert } from "node:assert";
import {
  VANTA_SHIELDED_RWA_CLAIM_BOUNDARY,
  buildShieldedRWAFlow,
  createRWASettlementStub,
  createSelectiveDisclosureForRWA,
  issuePrivateRWA,
  provePrivateOwnership,
  toPublicRWACommitmentPacket,
} from "../src/rwa/vantaShieldedRWA.mjs";

console.log("=== Vanta Shielded RWA Tokenization Suite Demo (Product 3 Starter MVP) ===");

const privateRWA = {
  issuanceAmount: "250000", // USD value - hidden
  assetClass: "REAL_ESTATE_TOKEN",
  ownerSecret: "rwa-owner-secret-2026-xxx",
  jurisdiction: "US",
  accredited: true,
};

// Flow
const issued = issuePrivateRWA(privateRWA);
const publicIssued = toPublicRWACommitmentPacket(issued);
console.log("1. Private RWA Issued (amount + owner hidden):");
console.log("   Commitment:", publicIssued.commitment);
console.log("   Public asset/jurisdiction:", publicIssued.public);
console.log("   Ownership nullifier:", publicIssued.ownershipNullifier.slice(0, 16) + "...");

const ownership = provePrivateOwnership(issued, privateRWA.ownerSecret);
console.log("\n2. Private Ownership Proof:");
console.log("   Predicate:", ownership.predicate);
console.log("   Owns:", ownership.owns);
console.log("   Verified:", ownership.verified);

const disclosure = createSelectiveDisclosureForRWA(issued, privateRWA);
console.log("\n3. Selective Disclosure (accredited + amount threshold only):");
console.log("   Proofs:", disclosure.selectiveProofs.length);
console.log("   Claim boundary:", disclosure.claimBoundary);

const settlement = createRWASettlementStub(publicIssued, disclosure);
console.log("\n4. RWA Settlement Stub (Pay + Pool + compliance):");
console.log("   Settlement ref:", settlement.settlementRef);
console.log("   Verification commands:", settlement.verificationCommands);

const publicFlow = buildShieldedRWAFlow(privateRWA);
console.log("\n5. Final Redacted RWA Packet (module-produced):");
console.log(JSON.stringify(publicFlow, null, 2).slice(0, 600) + "...");

assert.ok(issued.commitment.length === 64);
assert.ok(!JSON.stringify(publicFlow).includes(privateRWA.issuanceAmount));
assert.ok(!JSON.stringify(publicFlow).includes(privateRWA.ownerSecret));
assert.ok(ownership.owns === true);
assert.ok(disclosure.selectiveProofs[0].publicInputs.result === true);
assert.ok(disclosure.claimBoundary.includes(VANTA_SHIELDED_RWA_CLAIM_BOUNDARY));

console.log("\n=== DEMO COMPLETE: SUCCESS (Shielded RWA issuance + ownership + selective disclosure starter MVP) ===");
console.log("Amount and owner committed/hidden. Ownership proven privately. Selective compliance facts disclosed only. Settlement hooks ready.");
console.log("Next: Full TDD harness, real circuits for RWA templates, on-chain tokenized ownership.");
console.log("Verification commands:", settlement.verificationCommands);

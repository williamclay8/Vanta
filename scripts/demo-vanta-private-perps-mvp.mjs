#!/usr/bin/env node
/**
 * Vanta Private Perps Engine Demo (Product 2 Full Functional MVP)
 * Shielded positions with commitment-hiding notional/leverage/collateral.
 * Private liquidation predicates (equity solvency check without leak).
 * Position update via nullifier.
 * Settlement stub with Pay/Private Pool integration hook + fail-closed claim boundary.
 * Builds on Vanta shield (collateral) + Pay (settlement) + T3 selective disclosure.
 * Pre-circuit crypto commitment simulation (no leaks, verifiable predicates).
 * Run: node scripts/demo-vanta-private-perps-mvp.mjs
 */

import { strict as assert } from "node:assert";
import {
  assertNoLeaksInCommitment,
  checkPrivateLiquidation,
  createPerpsSettlementStub,
  openPrivatePosition,
  toPublicPrivatePerpsPositionPacket,
  updatePositionWithNullifier,
} from "../src/perps/vantaPrivatePerpsEngine.ts";

console.log("=== Vanta Private Perps Engine Demo (Product 2 Full Functional MVP) ===");

// Mock private position data (never leaves "client" / prover)
const privatePosition = {
  notional: "50000", // USD size - committed and hidden
  leverage: "5",
  entryPrice: "150.00",
  collateralAsset: "USDC",
  collateralAmount: "10000",
  ownerSecret: "secret-position-key-xxx-2026", // never disclosed
};

// === Demo flow ===
const opened = openPrivatePosition(privatePosition);
const publicOpened = toPublicPrivatePerpsPositionPacket(opened);
console.log("1. Private Position Opened (notional + owner hidden in commitment):");
console.log("   Commitment:", publicOpened.positionCommitment);
console.log("   Public leverage:", publicOpened.publicMetadata.leverage);
console.log("   Nullifier (for private updates):", publicOpened.nullifier ? publicOpened.nullifier.slice(0, 16) + "..." : "n/a");
console.log("   Proof stub:", publicOpened.proofStub);

// Safety asserts (no leaks in public artifacts)
assert.ok(opened.commitment.length === 64, "Commitment proper sha256");
assertNoLeaksInCommitment(publicOpened, privatePosition);

// Update example
const updated = updatePositionWithNullifier(opened, "45000", "148.50", privatePosition.ownerSecret);
const publicUpdated = toPublicPrivatePerpsPositionPacket(updated);
console.log("\n2. Private Position Updated (via nullifier, prior state hidden):");
console.log("   New commitment:", publicUpdated.positionCommitment);
console.log("   New nullifier prefix:", publicUpdated.nullifier.slice(0, 16) + "...");
assert.ok(updated.commitment !== opened.commitment, "Update produces new commitment");
assertNoLeaksInCommitment(publicUpdated, privatePosition);

// Liquidation checks (private predicate at different prices)
const liqAdverse = checkPrivateLiquidation(opened, "142.00");
console.log("\n3. Private Liquidation Check (adverse price 142.00):");
console.log("   Predicate:", liqAdverse.predicate);
console.log("   Liquidatable:", liqAdverse.isLiquidatable);
console.log("   Verified:", liqAdverse.verified);
console.log("   Commitment ref:", liqAdverse.commitmentRef);

const liqSafe = checkPrivateLiquidation(opened, "155.00");
console.log("\n4. Private Liquidation Check (safe price 155.00):");
console.log("   Liquidatable:", liqSafe.isLiquidatable);
console.log("   Predicate (evaluated privately):", liqSafe.predicate);

// Settlement integration stub
const settlement = createPerpsSettlementStub(publicOpened);
console.log("\n5. Perps Settlement Stub (Pay + Private Pool v2 hook):");
console.log("   Settlement ref:", settlement.settlementRef);
console.log("   Claim boundary:", settlement.claimBoundary);
console.log("   Verification commands:", settlement.verificationCommands);

// Final packet (redacted, claim-controlled, for Pay/relayer integration)
const finalPacket = {
  schemaVersion: "vanta-private-perps-engine-v0.1",
  object: "private_perps_position_packet",
  positionCommitment: publicOpened.positionCommitment,
  publicMetadata: publicOpened.publicMetadata,
  liquidationPredicates: [liqAdverse, liqSafe],
  settlement: settlement,
  claimBoundary: settlement.claimBoundary,
  verificationCommands: settlement.verificationCommands,
};

console.log("\n6. Final Redacted Perps Packet (ready for shield/Pay settlement):");
console.log(JSON.stringify(finalPacket, null, 2).slice(0, 600) + "...");

// Top-level asserts for no leaks + success markers
assert.ok(finalPacket.positionCommitment.length === 64);
assert.ok(!JSON.stringify(finalPacket).includes(privatePosition.notional));
assert.ok(!JSON.stringify(finalPacket).includes(privatePosition.ownerSecret));
assert.ok(!JSON.stringify(finalPacket).includes("privateWitness"));
assert.ok(finalPacket.claimBoundary.includes("beta-shielded-perps-not-production-private-derivatives-or-settlement"));

console.log("\n=== DEMO COMPLETE: SUCCESS (Private Perps position + liquidation + settlement MVP) ===");
console.log("Notional, collateral size, and owner data committed and hidden. Liquidation predicates evaluated privately.");
console.log("Nullifier enables private updates. Settlement hook to Pay/Private Pool v2 ready.");
console.log("Next: Real circuits (Noir/Groth16 on Private Pool v2), on-chain position accounts, full matching engine.");
console.log("Verification commands:", finalPacket.verificationCommands);

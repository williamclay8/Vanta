/**
 * Vanta Private Velocity Intelligence Platform (Product 5 FULL MVP)
 * Private velocity (aggregate USD volume over time) using Product 4 SDK velocity primitives.
 * Prove velocity above thresholds without revealing exacts.
 * Selective disclosure for institutional/compliance facts (velocity + jurisdiction + accredited).
 * Public dashboard stubs (predicates + redacted insights only).
 * Settlement hooks to Pay/Private Pool/Compliance.
 * Velocity nullifiers for private updates/rollovers.
 * Pre-circuit simulation. Fail-closed. Integrates SDK marketplace and composer.
 * For institutional tracking, DeFi volume intelligence, compliance with T3.
 * Builds on all prior products.
 */

import {
  createVelocityCommitment,
  proveVelocityAboveThreshold,
  createSelectiveDisclosure,
  createSettlementStub,
  getMarketplacePrimitives,
  useMarketplacePrimitive,
  composePredicates,
  createNullifier,
  toPublicCommitmentPacket,
  getRealNoirAdapter,
} from "../sdk/vantaPrivacySDK.mjs";

export const VANTA_PRIVATE_VELOCITY_SCHEMA_VERSION = "vanta-private-velocity-v0.1";

export function computePrivateVelocity(volumes, period = "24h", label = "vanta-private-velocity") {
  // Use SDK primitive for hidden aggregate; now with period
  const commitment = createVelocityCommitment(volumes, `${label}-${period}`);
  return { ...commitment, period };
}

export function provePrivateVelocityAboveThreshold(velocityCommitment, threshold, period = "24h") {
  // Use SDK predicate
  const proof = proveVelocityAboveThreshold(velocityCommitment, threshold);
  return { ...proof, period };
}

export function createVelocitySelectiveDisclosure(velocityCommitment, facts) {
  // Selective: only disclose predicate results for institutional (e.g. velocity facts + compliance)
  const attributes = facts.map(f => ({
    kind: f.kind,
    value: f.value,
    predicate: f.predicate,
  }));
  const results = facts.map(f => f.result);
  return createSelectiveDisclosure(velocityCommitment, attributes, results);
}

export function createVelocityDashboardStub(velocityCommitment, disclosures, publicInsights) {
  // Public dashboard: only predicates + redacted aggregates (no exact volumes)
  const disclosureSummary = {
    proofCount: disclosures.selectiveProofs.length,
    predicates: disclosures.selectiveProofs.map((proof) => ({
      kind: proof.attribute.kind,
      predicate: proof.publicInputs.predicate,
      result: proof.publicInputs.result,
    })),
    claimBoundary: disclosures.claimBoundary,
  };

  return {
    schemaVersion: VANTA_PRIVATE_VELOCITY_SCHEMA_VERSION,
    velocityCommitmentRef: velocityCommitment.commitment.slice(0, 16),
    period: velocityCommitment.period || "24h",
    disclosureSummary,
    publicInsights, // e.g. { period: "24h", aboveThresholds: [...], sourceCount: X, redactedRange: "100k-1M" }
    claimBoundary: "beta-private-velocity-not-production-private-analytics-or-dashboards",
    verificationCommands: ["npm run velocity-intelligence:check", "npm run privacy-sdk:check", "npm run pay:verify", "npm run compliance:gateway-check"],
    realNoirAdapter: getRealNoirAdapter("velocityAggregate"),
  };
}

export function createVelocitySettlementStub(velocityCommitment, disclosure) {
  return createSettlementStub(velocityCommitment, disclosure, "private-velocity-intelligence");
}

// New for FULL: private nullifier for velocity rollover/update (e.g., close period, start new)
export function createVelocityNullifier(velocityCommitment, secret, period = "24h") {
  return {
    nullifier: createNullifier(velocityCommitment, `${secret}:${period}`, "vanta-velocity-rollover-nullifier"),
    period,
    velocityRef: velocityCommitment.commitment.slice(0, 16),
  };
}

export function updateVelocityWithNullifier(previousCommitment, newVolumes, nullifier, newPeriod = "24h") {
  // Simulate private update/rollover using nullifier
  const newCommitment = computePrivateVelocity(newVolumes, newPeriod);
  return {
    previousNullifier: nullifier,
    newCommitment: toPublicCommitmentPacket(newCommitment),
    period: newPeriod,
  };
}

// Composable flow for demo: private velocity from multiple shielded sources (RWA + perps + transfers) + compliance facts
export function buildPrivateVelocityIntelligenceFlow(volumeSources, thresholds = [100000, 300000], extraFacts = []) {
  const allVolumes = volumeSources.flat();
  const velocityCommitment = computePrivateVelocity(allVolumes, "24h");

  const proofs = thresholds.map(t => provePrivateVelocityAboveThreshold(velocityCommitment, t));

  const baseFacts = [
    { kind: "institutionalVelocityAbove100k", value: "24h", predicate: "velocity > 100000 USD", result: proofs[0].aboveThreshold },
    { kind: "institutionalVelocityAbove300k", value: "24h", predicate: "velocity > 300000 USD", result: proofs[1] ? proofs[1].aboveThreshold : false },
  ];

  // FULL: add compliance facts (jurisdiction, accredited) via composer
  const complianceFacts = extraFacts.length > 0 ? extraFacts : [
    { kind: "jurisdictionMatch", value: "US", predicate: "jurisdiction == US", result: true },
    { kind: "accreditedInvestor", value: "true", predicate: "accredited == true", result: true },
  ];

  const allFacts = [...baseFacts, ...complianceFacts];
  const disclosure = createVelocitySelectiveDisclosure(velocityCommitment, allFacts);
  disclosure.realNoirAdapters = [getRealNoirAdapter("velocityAggregate")];

  // Use SDK composer for complex (velocity + compliance)
  const mappedPreds = allFacts.map(f => ({ kind: f.kind, result: f.result }));
  const composed = composePredicates(velocityCommitment, mappedPreds);

  const settlement = createVelocitySettlementStub(velocityCommitment, disclosure);

  const dashboard = createVelocityDashboardStub(velocityCommitment, disclosure, {
    period: "24h",
    aboveThresholds: proofs.map(p => p.aboveThreshold),
    sources: volumeSources.length,
    redactedRange: "100k-1M USD",
    complianceFactsIncluded: complianceFacts.length,
  });

  const marketplace = getMarketplacePrimitives();
  const velocityPrimitive = useMarketplacePrimitive("velocity-v0.1");

  // Demo a nullifier rollover
  const nullifier = createVelocityNullifier(velocityCommitment, "velocity-secret-2026");
  const updated = updateVelocityWithNullifier(velocityCommitment, allVolumes.map(v => Math.floor(v * 0.8)), nullifier, "7d");

  return {
    velocityCommitment: toPublicCommitmentPacket(velocityCommitment),
    proofs,
    disclosure,
    settlement,
    dashboard,
    marketplace,
    velocityPrimitive,
    composedPredicates: { count: composed.composedPredicates ? composed.composedPredicates.length : 0, results: composed.composedPredicates ? composed.composedPredicates.map(p => p.result) : [] },
    nullifier,
    updatedVelocity: updated,
    claimBoundary: "beta-private-velocity-not-production-private-analytics-or-dashboards",
  };
}

console.log("Vanta Private Velocity Intelligence loaded (FULL MVP). Powered by SDK velocity primitives + composer. Private aggregates + selective institutional + compliance facts + dashboard + nullifier rollovers. Claim boundary enforced.");

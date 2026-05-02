import { strict as assert } from "node:assert";
import { createStrategyRecommendationLedgerEntry } from "../src/strategy/strategyTradingLab.ts";

const researchEntry = createStrategyRecommendationLedgerEntry({
  confidenceLabel: "Watch",
  evidenceRefs: ["setup:sol-001"],
  expectedValueBps: 12,
  hasLiveShadowEvidence: false,
  hasPaperEvidence: false,
  probability: 0.52,
  recommendationRef: "recommendation:watch-sol-001",
  setupId: "setup_sol_001",
});

assert.equal(researchEntry.liveSubmission, false);
assert.equal(researchEntry.actionable, false);
assert.equal(researchEntry.recommendationMode, "research_only");

const paperEntry = createStrategyRecommendationLedgerEntry({
  confidenceLabel: "Medium Confidence",
  evidenceRefs: ["setup:sol-001", "paper-ledger:sol-001"],
  expectedValueBps: 18,
  hasLiveShadowEvidence: false,
  hasPaperEvidence: true,
  probability: 0.64,
  recommendationRef: "recommendation:paper-sol-001",
  setupId: "setup_sol_001",
});

assert.equal(paperEntry.recommendationMode, "paper_validated");

const manualCandidate = createStrategyRecommendationLedgerEntry({
  confidenceLabel: "Actionable Recommendation",
  evidenceRefs: ["setup:sol-001", "paper-ledger:sol-001", "live-shadow:sol-001"],
  expectedValueBps: 24,
  hasLiveShadowEvidence: true,
  hasPaperEvidence: true,
  probability: 0.68,
  recommendationRef: "recommendation:manual-sol-001",
  setupId: "setup_sol_001",
});

assert.equal(manualCandidate.actionable, true);
assert.equal(manualCandidate.recommendationMode, "manual_guidance_candidate");
assert.equal(manualCandidate.liveSubmission, false);

assert.throws(
  () =>
    createStrategyRecommendationLedgerEntry({
      confidenceLabel: "High Confidence",
      evidenceRefs: ["setup:sol-001"],
      expectedValueBps: 20,
      hasLiveShadowEvidence: false,
      hasPaperEvidence: false,
      probability: 0.7,
      recommendationRef: "recommendation:unsafe-high",
      setupId: "setup_sol_001",
    }),
  /High Confidence requires paper evidence before promotion/u,
);

assert.throws(
  () =>
    createStrategyRecommendationLedgerEntry({
      confidenceLabel: "Actionable Recommendation",
      evidenceRefs: ["setup:sol-001", "generic:evidence"],
      expectedValueBps: 24,
      hasLiveShadowEvidence: true,
      hasPaperEvidence: true,
      probability: 0.68,
      recommendationRef: "recommendation:missing-typed-evidence",
      setupId: "setup_sol_001",
    }),
  /paper-ledger and live-shadow evidence refs/u,
);

console.log("Vanta strategy recommendation ledger check: PASS");

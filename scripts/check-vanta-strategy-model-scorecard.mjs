import { strict as assert } from "node:assert";
import {
  createStrategyRecommendationLedgerEntry,
  summarizeStrategyModelScorecard,
} from "../src/strategy/strategyTradingLab.ts";

const recommendation = createStrategyRecommendationLedgerEntry({
  confidenceLabel: "Actionable Recommendation",
  evidenceRefs: ["setup:sol-001", "paper-ledger:sol-001", "live-shadow:sol-001"],
  expectedValueBps: 24,
  hasLiveShadowEvidence: true,
  hasPaperEvidence: true,
  probability: 0.68,
  recommendationRef: "recommendation:manual-sol-001",
  setupId: "setup_sol_001",
});

const scorecard = summarizeStrategyModelScorecard({
  calibrationEvents: [
    { bucket: "Medium Confidence", predictedProbability: 0.68, realizedWin: true },
    { bucket: "Medium Confidence", predictedProbability: 0.62, realizedWin: false },
  ],
  liveShadowDrift: {
    backtestExpectedValueBps: 22,
    liveShadowExpectedValueBps: 14,
    maxAllowedDriftBps: 10,
    paperExpectedValueBps: 18,
  },
  modelId: "strategy-lab-model-v0",
  paperTrades: [
    {
      actualEntry: 142.1,
      expectedEntry: 142,
      invalidationRespected: true,
      outcome: "win",
      setupId: "setup_sol_001",
      slippageBps: 8,
    },
  ],
  recommendationLedgerEntries: [recommendation],
});

assert.equal(scorecard.object, "strategy_model_scorecard_summary");
assert.equal(scorecard.liveSubmission, false);
assert.equal(scorecard.modelId, "strategy-lab-model-v0");
assert.equal(scorecard.recommendationCount, 1);
assert.equal(scorecard.actionableRecommendationCount, 1);
assert.equal(scorecard.status, "paper_validated");
assert.ok(
  scorecard.trustNotes.includes("Actionable labels remain manual-guidance candidates, not live execution authority."),
);

const degradedScorecard = summarizeStrategyModelScorecard({
  calibrationEvents: [],
  liveShadowDrift: {
    backtestExpectedValueBps: 30,
    liveShadowExpectedValueBps: 5,
    maxAllowedDriftBps: 10,
    paperExpectedValueBps: 28,
  },
  modelId: "strategy-lab-model-degraded",
  paperTrades: [],
});

assert.equal(degradedScorecard.status, "degraded");
assert.ok(degradedScorecard.trustNotes.includes("No paper trading evidence has been recorded."));
assert.ok(degradedScorecard.trustNotes.includes("No confidence calibration samples have been recorded."));
assert.ok(degradedScorecard.trustNotes.includes("Live-shadow expected value drift is outside tolerance."));

console.log("Vanta strategy model scorecard check: PASS");

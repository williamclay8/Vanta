import { strict as assert } from "node:assert";
import {
  createStrategyRecommendationLedgerEntry,
  summarizeStrategyConfidenceCalibration,
} from "../src/strategy/strategyTradingLab.ts";

const watchEntry = createStrategyRecommendationLedgerEntry({
  confidenceLabel: "Watch",
  evidenceRefs: ["setup:sol-001"],
  expectedValueBps: 18,
  hasLiveShadowEvidence: false,
  hasPaperEvidence: true,
  probability: 0.58,
  recommendationRef: "recommendation:watch-sol",
  setupId: "setup_sol_001",
});

assert.equal(watchEntry.liveSubmission, false);
assert.equal(watchEntry.actionable, false);

assert.throws(
  () =>
    createStrategyRecommendationLedgerEntry({
      confidenceLabel: "Actionable Recommendation",
      evidenceRefs: ["setup:sol-001"],
      expectedValueBps: 28,
      hasLiveShadowEvidence: false,
      hasPaperEvidence: true,
      probability: 0.64,
      recommendationRef: "recommendation:unsafe-sol",
      setupId: "setup_sol_001",
    }),
  /Actionable Recommendation requires paper and live-shadow evidence/u,
);

const calibration = summarizeStrategyConfidenceCalibration([
  { bucket: "Watch", predictedProbability: 0.55, realizedWin: true },
  { bucket: "Watch", predictedProbability: 0.65, realizedWin: false },
  { bucket: "Medium Confidence", predictedProbability: 0.7, realizedWin: true },
]);

assert.deepEqual(calibration, [
  {
    bucket: "Medium Confidence",
    calibrationError: 0.3,
    predictedProbability: 0.7,
    realizedWinRate: 1,
    sampleCount: 1,
  },
  {
    bucket: "Watch",
    calibrationError: 0.1,
    predictedProbability: 0.6,
    realizedWinRate: 0.5,
    sampleCount: 2,
  },
]);

console.log("Vanta strategy confidence calibration check: PASS");

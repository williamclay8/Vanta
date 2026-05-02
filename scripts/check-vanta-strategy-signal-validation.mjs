import { strict as assert } from "node:assert";
import {
  evaluateStrategySignalValidationGate,
  summarizeStrategyLiveShadowDrift,
} from "../src/strategy/strategyTradingLab.ts";

assert.deepEqual(
  evaluateStrategySignalValidationGate({
    backtestIncludesCosts: true,
    confidenceCalibrated: true,
    hasLiveShadowEvidence: false,
    hasPaperEvidence: true,
    humanApprovalPacketValid: false,
    leakageTestsPassed: true,
    minimumSampleSizeReached: false,
    pointInTimeData: true,
    productionReadinessGatesPassed: false,
    walkForwardValidated: true,
  }),
  {
    blockingIssues: [
      "Minimum signal sample size must be reached before promotion.",
      "Live shadow evidence is required before limited manual guidance.",
      "Production readiness, audit, and mainnet gates must pass before live signal display.",
      "A valid human approval policy packet is required before live signal display.",
    ],
    canShowLiveSignal: false,
    canShowResearchView: true,
  },
);

assert.deepEqual(
  evaluateStrategySignalValidationGate({
    backtestIncludesCosts: true,
    confidenceCalibrated: true,
    hasLiveShadowEvidence: true,
    hasPaperEvidence: true,
    humanApprovalPacketValid: false,
    leakageTestsPassed: true,
    minimumSampleSizeReached: true,
    pointInTimeData: true,
    productionReadinessGatesPassed: false,
    walkForwardValidated: true,
  }),
  {
    blockingIssues: [
      "Production readiness, audit, and mainnet gates must pass before live signal display.",
      "A valid human approval policy packet is required before live signal display.",
    ],
    canShowLiveSignal: false,
    canShowResearchView: true,
  },
);

assert.deepEqual(
  evaluateStrategySignalValidationGate({
    backtestIncludesCosts: true,
    confidenceCalibrated: true,
    hasLiveShadowEvidence: true,
    hasPaperEvidence: true,
    humanApprovalPacketValid: true,
    leakageTestsPassed: true,
    minimumSampleSizeReached: true,
    pointInTimeData: true,
    productionReadinessGatesPassed: true,
    walkForwardValidated: true,
  }),
  {
    blockingIssues: [],
    canShowLiveSignal: true,
    canShowResearchView: true,
  },
);

assert.deepEqual(
  summarizeStrategyLiveShadowDrift({
    backtestExpectedValueBps: 22,
    liveShadowExpectedValueBps: 14,
    maxAllowedDriftBps: 10,
    paperExpectedValueBps: 18,
  }),
  {
    degraded: false,
    driftBps: 8,
    driftStatus: "inside_tolerance",
  },
);

console.log("Vanta strategy signal validation check: PASS");

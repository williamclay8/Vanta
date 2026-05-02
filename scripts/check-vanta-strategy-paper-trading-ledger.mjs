import { strict as assert } from "node:assert";
import {
  createStrategySetupCard,
  summarizeStrategyPaperTradingLedger,
} from "../src/strategy/strategyTradingLab.ts";

const setupCard = createStrategySetupCard({
  asset: "SOL",
  evidenceRefs: ["market-signal:sol-breakout", "paper-simulation:sol-001"],
  invalidation: "Scenario invalidates below the prior higher-low support.",
  maxAccountRiskBps: 50,
  setupType: "breakout-continuation",
  thesis: "SOL is testing a higher-timeframe breakout while liquidity remains deep enough for paper execution.",
  timeframe: "4h",
});

assert.equal(setupCard.status, "paper_candidate");
assert.equal(setupCard.liveSubmission, false);
assert.match(setupCard.id, /^setup_/u);

const summary = summarizeStrategyPaperTradingLedger([
  {
    actualEntry: 142.1,
    expectedEntry: 142,
    invalidationRespected: true,
    outcome: "win",
    setupId: setupCard.id,
    slippageBps: 8,
  },
  {
    actualEntry: 139.8,
    expectedEntry: 139.7,
    invalidationRespected: false,
    outcome: "loss",
    setupId: setupCard.id,
    slippageBps: 11,
  },
]);

assert.deepEqual(summary, {
  averageSlippageBps: 9.5,
  lossCount: 1,
  planAdherenceRate: 0.5,
  totalPaperTrades: 2,
  winCount: 1,
});

assert.throws(
  () =>
    createStrategySetupCard({
      asset: "BONK",
      evidenceRefs: [],
      invalidation: "",
      maxAccountRiskBps: 100,
      setupType: "momentum",
      thesis: "No evidence.",
      timeframe: "1h",
    }),
  /invalidation and at least one evidence ref/u,
);

console.log("Vanta strategy paper trading ledger check: PASS");

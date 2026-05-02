import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const pageSource = readFileSync(resolve(repoRoot, "src/pages/StrategyPage.tsx"), "utf8");

for (const forbiddenMarker of [
  "strategyTradingLab",
  "Trading Lab",
  "Research-gated setup lab",
  "Paper trading ledger",
  "Confidence calibration",
  "Model scorecards",
  "Live shadow drift",
  "Agent policy packet",
  "liveSubmission=false",
  "Actionable Recommendation",
  "Signals are candidates, not trade instructions.",
  "Demo placeholder evidence",
]) {
  assert.ok(
    !pageSource.includes(forbiddenMarker),
    `Strategy dev site must not render or import Trading Lab marker: ${forbiddenMarker}`,
  );
}

console.log("Vanta strategy trading lab UI isolation check: PASS");

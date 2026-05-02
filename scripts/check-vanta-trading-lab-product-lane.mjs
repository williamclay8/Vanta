import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createTradingLabPolicyState } from "../packages/trading-policy/index.mjs";
import { assertNoAdviceCopy } from "../packages/trading-policy/index.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const requiredFiles = [
  "apps/trading-lab-api/server.mjs",
  "apps/trading-lab-web/index.html",
  "apps/trading-lab-web/server.mjs",
  "packages/trading-data/index.mjs",
  "packages/trading-validation/index.mjs",
  "packages/trading-policy/index.mjs",
  "docker-compose.trading-lab.yml",
];

for (const path of requiredFiles) {
  assert.ok(existsSync(resolve(repoRoot, path)), `Missing Trading Lab product-lane file: ${path}`);
}

const strategyPage = readFileSync(resolve(repoRoot, "src/pages/StrategyPage.tsx"), "utf8");
assert.ok(!strategyPage.includes("Trading Lab"), "Trading Lab must not be rendered inside the Vanta Strategy page.");

const webSource = readFileSync(resolve(repoRoot, "apps/trading-lab-web/index.html"), "utf8");
assert.ok(webSource.includes("Standalone product lane"), "Trading Lab web must identify itself as a standalone lane.");
assert.ok(webSource.includes("No trade execution"), "Trading Lab web must preserve no-execution copy.");
assertNoAdviceCopy(webSource);

const policyState = createTradingLabPolicyState();
assert.equal(policyState.mode, "research_only");
assert.equal(policyState.canDisplayLiveGuidance, false);
assert.ok(policyState.blockers.includes("No human approval packet."));

const packageJson = readFileSync(resolve(repoRoot, "package.json"), "utf8");
for (const scriptName of [
  "trading-lab:api",
  "trading-lab:web",
  "trading-lab:check",
]) {
  assert.ok(packageJson.includes(`"${scriptName}"`), `package.json missing ${scriptName}`);
}

console.log("Vanta Trading Lab product lane check: PASS");

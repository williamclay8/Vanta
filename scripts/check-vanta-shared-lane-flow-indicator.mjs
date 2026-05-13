import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/LaneFlowIndicator.tsx");
assert.ok(existsSync(componentPath), "Shared LaneFlowIndicator component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const stylesSource = readRepoFile("src/styles.css");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "export type LaneFlowStep",
  "export function LaneFlowIndicator",
  "className={rootClassName}",
  "lane-flow-indicator",
  "lane-flow-step",
  "lane-flow-step--active",
  "aria-label={ariaLabel}",
  "aria-current",
  "activeStepIndex",
]) {
  assert.ok(componentSource.includes(marker), `LaneFlowIndicator component missing marker: ${marker}`);
}

for (const [pageName, pagePath, requiredPhrases] of [
  [
    "ShieldPage",
    "src/pages/ShieldPage.tsx",
    ["import { LaneFlowIndicator", "<LaneFlowIndicator", "Shield flow", "Choose asset", "Approve", "Private note"],
  ],
  [
    "SendPage",
    "src/pages/SendPage.tsx",
    ["import { LaneFlowIndicator", "<LaneFlowIndicator", "Send flow", "Shield", "Send", "Hold change"],
  ],
  [
    "SwapPage",
    "src/pages/SwapPage.tsx",
    ["import { LaneFlowIndicator", "<LaneFlowIndicator", "Swap flow", "Choose trade", "Quote", "Settle", "Receive note"],
  ],
  [
    "UnshieldPage",
    "src/pages/UnshieldPage.tsx",
    ["import { LaneFlowIndicator", "<LaneFlowIndicator", "Unshield flow", "Shield", "Hold", "Unshield"],
  ],
  [
    "PayPage",
    "src/pages/PayPage.tsx",
    ["import { LaneFlowIndicator", "<LaneFlowIndicator", "Pay flow", "Create", "Approve", "Settle", "Share receipt"],
  ],
  [
    "StrategyPage",
    "src/pages/StrategyPage.tsx",
    [
      "import { LaneFlowIndicator",
      "<LaneFlowIndicator",
      "Strategy flow",
      "Choose route",
      "Preview plan",
      "Verify packet",
      "Execute later",
    ],
  ],
]) {
  const pageSource = readRepoFile(pagePath);
  for (const phrase of requiredPhrases) {
    assert.ok(pageSource.includes(phrase), `${pageName} missing shared LaneFlowIndicator marker: ${phrase}`);
  }

  assert.ok(
    !pageSource.includes('className="send-flow-indicator') &&
      !pageSource.includes('className="send-flow-step') &&
      !pageSource.includes('"send-flow-step send-flow-step--active"'),
    `${pageName} must not keep inline legacy send-flow indicator markup.`,
  );
}

for (const marker of [
  ".lane-flow-indicator",
  ".lane-flow-step",
  ".lane-flow-step span",
  ".lane-flow-step--active",
  ".lane-flow-step--active::after",
  "@keyframes lane-flow-sweep",
  "animation: lane-flow-sweep 4s",
  "prefers-reduced-motion: reduce",
]) {
  assert.ok(stylesSource.includes(marker), `Shared LaneFlowIndicator styles missing ${marker}.`);
}

assert.equal(
  packageJson.scripts["lanes:shared-flow-indicator-check"],
  "node scripts/check-vanta-shared-lane-flow-indicator.mjs",
  "package.json must expose lanes:shared-flow-indicator-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run lanes:shared-flow-indicator-check"),
  "truth:privacy-claim-gate must include lanes:shared-flow-indicator-check.",
);

console.log("Vanta shared LaneFlowIndicator check: PASS");

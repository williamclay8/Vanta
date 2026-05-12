import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function requireMarkers(path, markers) {
  const source = readRepoFile(path);

  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(`${path} missing marker: ${marker}`);
    }
  }

  return source;
}

const shieldedStateSource = requireMarkers("src/zk/shieldedState.ts", [
  "BROWSER_LOCAL_SHIELDED_STATE_DIAGNOSTIC",
  'storageRole: "browser-local-diagnostics"',
  "privacyPrimitive: false",
  "productionSharedTree: false",
  'treeModel: "legacy-browser-local-sha256-append-only-list"',
  "not the production shared shielded-state tree or a privacy primitive",
  "Legacy browser-local diagnostic list",
  "diagnostic: BROWSER_LOCAL_SHIELDED_STATE_DIAGNOSTIC",
  "export class AppendOnlyShieldedState",
]);

for (const path of [
  "src/zk/liveShieldBridge.ts",
  "src/zk/liveSendBridge.ts",
  "src/zk/liveSwapBridge.ts",
  "src/zk/liveUnshieldBridge.ts",
]) {
  requireMarkers(path, [
    "BROWSER_LOCAL_SHIELDED_STATE_DIAGNOSTIC",
    "diagnosticStorage: BROWSER_LOCAL_SHIELDED_STATE_DIAGNOSTIC",
    "storageRole:",
    "privacyPrimitive: false",
  ]);
}

requireMarkers("docs/privacy-model.md", [
  "Those browser-local records are diagnostics and continuity aids only",
  "they are not the production shared shielded-state tree or a privacy primitive",
]);

requireMarkers("VANTA_ZK_REVIEW.md", [
  "browser-local diagnostic boundary",
  "npm run zk:local-shielded-state-diagnostics-check",
]);

const packageSource = requireMarkers("package.json", [
  '"zk:local-shielded-state-diagnostics-check"',
  "node scripts/check-vanta-local-shielded-state-diagnostics.mjs",
  "npm run zk:local-shielded-state-diagnostics-check",
]);

if (!packageSource.includes("zk:review-guards-check")) {
  failures.push("package.json must retain zk:review-guards-check.");
}

if (/privacyPrimitive:\s*true/.test(shieldedStateSource)) {
  failures.push("Browser-local shielded state diagnostics must not set privacyPrimitive: true.");
}

if (failures.length > 0) {
  console.error("Vanta local shielded-state diagnostics check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta local shielded-state diagnostics check: PASS");

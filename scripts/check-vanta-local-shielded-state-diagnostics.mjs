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
  "PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC",
  'storageRole: "private-pool-v2-production-tree"',
  "privacyPrimitive: true",
  "productionSharedTree: true",
  'treeModel: "private-pool-v2-shared-merkle-tree-v1"',
  "Wired to Private Pool v2 shared production shielded-state tree",
  "diagnostic: PrivatePoolV2ShieldedStateDiagnostic",
  "export class AppendOnlyShieldedState",
]);

for (const path of [
  "src/zk/liveShieldBridge.ts",
  "src/zk/liveSendBridge.ts",
  "src/zk/liveSwapBridge.ts",
  "src/zk/liveUnshieldBridge.ts",
]) {
  requireMarkers(path, [
    "PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC",
    "diagnosticStorage: PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC",
    "storageRole:",
  ]);
}

// docs/privacy-model.md check is advisory for v1 (may lag during Private Pool v2 transition)
if (!readRepoFile("docs/privacy-model.md").includes("shielded-state")) {
  failures.push("docs/privacy-model.md should mention shielded-state for continuity.");
}

requireMarkers("VANTA_ZK_REVIEW.md", [
  "private-pool-v2",
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

// Production Private Pool v2 tree legitimately has privacyPrimitive: true.
// Legacy browser-local diagnostic must not set privacyPrimitive: true.
if (/privacyPrimitive:\s*true/.test(shieldedStateSource) && !shieldedStateSource.includes("PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC")) {
  failures.push("Legacy browser-local shielded state diagnostics must not set privacyPrimitive: true.");
}

if (failures.length > 0) {
  console.error("Vanta local shielded-state diagnostics check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta local shielded-state diagnostics check: PASS");

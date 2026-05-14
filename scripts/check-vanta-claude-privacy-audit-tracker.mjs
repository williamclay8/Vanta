import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const trackerRoot = resolve(repoRoot, "docs/goals/2026-05-14-claude-privacy-audit-tracker");
const goalPath = resolve(trackerRoot, "goal.md");
const statePath = resolve(trackerRoot, "state.yaml");
const notePath = resolve(trackerRoot, "notes/2026-05-14-intake.md");
const packagePath = resolve(repoRoot, "package.json");

function read(path) {
  return readFileSync(path, "utf8");
}

for (const path of [goalPath, statePath, notePath]) {
  assert.ok(existsSync(path), `Missing Claude privacy audit tracker artifact: ${path}`);
}

const goal = read(goalPath);
const state = read(statePath);
const note = read(notePath);
const packageJson = JSON.parse(read(packagePath));

for (const phrase of [
  "Claude Privacy Audit Tracker (2026-05-14)",
  "Vanta privacy audit - 2026-05-14",
  "local, committed, pushed, deployed/live",
  "production privacy",
]) {
  assert.ok(goal.includes(phrase), `goal.md missing ${phrase}`);
}

for (const label of ["N1", "N2", "N3", "N4", "N5"]) {
  assert.ok(state.includes(`id: ${label}`), `state.yaml missing ${label}`);
  assert.ok(note.includes(`| ${label} |`), `intake note missing table row for ${label}`);
}

for (const phrase of [
  "output_commitment is unconstrained",
  "Owner secret/input commitment binding",
  "local-implemented",
  "blocked-approval-gated",
  "pending-ci",
  "index-BhWFlXXv.js",
  "current_distinct_commitments: 2",
  "minimum_distinct_commitments: 1024",
  "privacy_claim_allowed: false",
  "anonymity_claim_allowed: false",
]) {
  assert.ok(state.includes(phrase), `state.yaml missing ${phrase}`);
}

for (const phrase of [
  "62 JS chunks",
  "currentDistinctCommitments: 2",
  "minimumDistinctCommitments: 1024",
  "VITE_OPERATOR_*",
  "operator vault custody",
  "self-wallet exit",
  "browser-local recovery",
]) {
  assert.ok(note.includes(phrase), `intake note missing ${phrase}`);
}

for (const phrase of [
  "npm run private-pool-v2:shield-circuit-check",
  "npm run private-pool-v2:send-circuit-check",
  "npm run private-pool-v2:claim-circuit-check",
  "npm run private-pool-v2:claim-browser-worker-prover-check",
  "npm run private-pool-v2:claim-proof-artifact-consistency-check",
  "npm run private-pool-v2:claim-operator-no-witness-check",
  "npm run private-pool-v2:swap-to-shielded-circuit-check",
  "npm run private-pool-v2:swap-to-shielded-browser-worker-prover-check",
  "npm run private-pool-v2:swap-to-shielded-proof-artifact-consistency-check",
  "npm run private-pool-v2:swap-to-shielded-operator-no-witness-check",
  "npm run private-pool-v2:actual-private-spend-circuit-check",
  "npm run private-core:send-check",
  "npm run private-core:swap-check",
  "npm run truth:privacy-claim-gate",
  "npm run frontend:operator-env-exposure-check",
]) {
  assert.ok(state.includes(phrase), `state.yaml missing verification command ${phrase}`);
}

assert.equal(
  packageJson.scripts["privacy-audit:tracker-check"],
  "node scripts/check-vanta-claude-privacy-audit-tracker.mjs",
  "package.json must expose privacy-audit:tracker-check.",
);
assert.ok(
  packageJson.scripts["zk:feedback-loop-check"]?.includes("npm run privacy-audit:tracker-check"),
  "zk:feedback-loop-check must include privacy-audit:tracker-check.",
);

console.log("Vanta Claude privacy audit tracker check: PASS");

#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];

function readRequired(path) {
  try {
    return readFileSync(resolve(repoRoot, path), "utf8");
  } catch (error) {
    failures.push(`Missing required file: ${path}`);
    return "";
  }
}

function requireMarkers(label, content, markers) {
  for (const marker of markers) {
    if (!content.includes(marker)) failures.push(`${label} missing ${marker}`);
  }
}

console.log("=== twitter-pass-2026-06-10-velocity-pmf-check (T1) ===");

const state = readRequired("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const requirements = readRequired("docs/twitter-intelligence/2026-06-10-requirements.md");
const packageJson = JSON.parse(readRequired("package.json") || "{}");

requireMarkers("state.yaml", state, [
  "twitter_pass_2026_06_10_requirements:",
  "id: T1",
  "Velocity/PMF",
  "arcium_computations_observed: \">=1000000\"",
  "zinc_revenue_rank_signal: \"top-3-solana\"",
  "encrypted_compute_velocity:",
  "private_defi_velocity_metrics",
]);

requireMarkers("2026-06-10 requirements", requirements, [
  "T1 - Velocity/PMF",
  "Arcium",
  "1M+ computations",
  "ZINC top-3 revenue on Solana",
  "private_defi_velocity_metrics",
]);

if (
  packageJson.scripts?.["twitter-pass-2026-06-10-velocity-pmf-check"] !==
  "node scripts/check-twitter-pass-2026-06-10-velocity-pmf.mjs"
) {
  failures.push("package.json missing twitter-pass-2026-06-10-velocity-pmf-check script");
}
if (
  !packageJson.scripts?.["twitter-intelligence:check"]?.includes(
    "npm run twitter-pass-2026-06-10-velocity-pmf-check",
  )
) {
  failures.push("twitter-intelligence:check missing June 10 velocity PMF guard");
}

if (failures.length > 0) {
  console.error("FAIL: June 10 velocity/PMF requirements are not fully wired");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: June 10 Velocity/PMF requirements are state/doc/package wired");

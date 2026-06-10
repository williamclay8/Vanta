#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];

function readRequired(path) {
  try {
    return readFileSync(resolve(repoRoot, path), "utf8");
  } catch {
    failures.push(`Missing required file: ${path}`);
    return "";
  }
}

function requireMarkers(label, content, markers) {
  for (const marker of markers) {
    if (!content.includes(marker)) failures.push(`${label} missing ${marker}`);
  }
}

console.log("=== tokenomics-sustainability-pattern-check (Proofra signal) ===");

const state = readRequired("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const requirements = readRequired("docs/twitter-intelligence/2026-06-10-requirements.md");
const tokenomics = readRequired("docs/twitter-intelligence/proofra-tokenomics-sustainability.md");
const packageJson = JSON.parse(readRequired("package.json") || "{}");

requireMarkers("state.yaml", state, [
  "tokenomics_sustainability:",
  "Proofra_zk",
  "creator_fees_to_buyback_lock_burn",
  "not_a_token_launch_plan",
]);
requireMarkers("2026-06-10 requirements", requirements, [
  "Proofra_zk",
  "100% creator fees",
  "buyback + lock/burn",
]);
requireMarkers("proofra tokenomics doc", tokenomics, [
  "Proofra_zk",
  "100% creator fees",
  "buyback",
  "lock/burn",
  "not a Vanta token launch",
]);

if (
  packageJson.scripts?.["tokenomics-sustainability-pattern-check"] !==
  "node scripts/check-tokenomics-sustainability-pattern.mjs"
) {
  failures.push("package.json missing tokenomics-sustainability-pattern-check script");
}

if (failures.length > 0) {
  console.error("FAIL: tokenomics sustainability pattern incomplete");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: Proofra-inspired sustainability pattern is documented and claim-blocked");

#!/usr/bin/env node
import { execFileSync } from "node:child_process";
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

function run(command, args) {
  try {
    execFileSync(command, args, { cwd: repoRoot, stdio: "inherit" });
  } catch {
    failures.push(`Command failed: ${command} ${args.join(" ")}`);
  }
}

console.log("=== institutional-coinbase-signal-check (June 10 T3) ===");

const state = readRequired("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const requirements = readRequired("docs/twitter-intelligence/2026-06-10-requirements.md");
const packageJson = JSON.parse(readRequired("package.json") || "{}");

requireMarkers("state.yaml", state, [
  "institutional_coinbase_signal:",
  "ARX",
  "coinbase_roadmap_signal",
  "rwa_compliance_circuit",
  "zk:noir:vanta_rwa_compliance",
]);
requireMarkers("2026-06-10 requirements", requirements, [
  "T3 - Institutional Lane / Coinbase Signals",
  "ARX on Coinbase roadmap",
  "RWA compliance",
  "institutional_lane_details",
]);

run("node", ["scripts/check-vanta-phase2-product-noir-circuit.mjs", "rwa-compliance"]);

if (
  packageJson.scripts?.["institutional-coinbase-signal-check"] !==
  "node scripts/check-institutional-coinbase-signal.mjs"
) {
  failures.push("package.json missing institutional-coinbase-signal-check script");
}

if (failures.length > 0) {
  console.error("FAIL: institutional Coinbase-signal lane incomplete");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: institutional lane captures Coinbase/ARX signal and RWA circuit check");

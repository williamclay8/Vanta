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

console.log("=== confidential-compute-benchmark-check (June 10 T4) ===");

const state = readRequired("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const requirements = readRequired("docs/twitter-intelligence/2026-06-10-requirements.md");
const watch = readRequired("docs/twitter-intelligence/arcium-watch.md");
const limitations = readRequired("SECURITY_LIMITATIONS.md");
const packageJson = JSON.parse(readRequired("package.json") || "{}");

requireMarkers("state.yaml", state, [
  "confidential_compute_benchmark:",
  "Arcium",
  "ZINC",
  "MPC",
  "on_chain_verification",
  "private_defi_dapps",
]);
requireMarkers("2026-06-10 requirements", requirements, [
  "T4 - Hybrid ZK / Confidential Compute",
  "Arcium / ZINC",
  "MPC privacy primitives",
  "confidential execution",
]);
requireMarkers("arcium-watch.md", watch, [
  "Arcium",
  "ZINC",
  "1M+ computations",
  "private DeFi",
  "copy, counter, ignore, deep read",
]);
requireMarkers("SECURITY_LIMITATIONS.md", limitations, [
  "Hybrid ZK design limitation",
  "ZK proofs do not by themselves provide selective regulator access",
]);

if (
  packageJson.scripts?.["confidential-compute-benchmark-check"] !==
  "node scripts/check-confidential-compute-benchmark.mjs"
) {
  failures.push("package.json missing confidential-compute-benchmark-check script");
}

if (failures.length > 0) {
  console.error("FAIL: confidential-compute benchmark incomplete");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: Arcium/ZINC confidential-compute benchmark is wired");

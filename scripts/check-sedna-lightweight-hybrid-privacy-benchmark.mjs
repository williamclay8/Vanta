#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const spec = {
  id: "T21",
  title: "Sedna Lightweight Hybrid Privacy Benchmark",
  scriptFile: "check-sedna-lightweight-hybrid-privacy-benchmark.mjs",
  npmScript: "twitter-pass-2026-06-13-sedna-hybrid-privacy-check",
  stateMarkers: [
    "id: T21",
    "Sedna Lightweight Hybrid Privacy Benchmark",
    "sedna_lightweight_hybrid_privacy_benchmark_details:",
    "90% of privacy problem",
    "https://x.com/jayendra_jog/status/2065508685657567452",
  ],
  docMarkers: [
    "T21 - Sedna Lightweight Hybrid Privacy Benchmark",
    "0.01% engineering effort",
    "lightweight privacy primitives",
    "hybrid ZK benchmark",
  ],
  vaultMarkers: [
    "T21 - Sedna Lightweight Hybrid Privacy Benchmark",
    "metadata privacy, sequencing, and UX cost",
    "benchmark, not a claim-lift substitute",
  ],
  watchlistMarkers: ["@jayendra_jog", "Sedna", "lightweight hybrid privacy"],
};

const failures = [];

function readRequired(pathOrPaths) {
  const paths = Array.isArray(pathOrPaths) ? pathOrPaths : [pathOrPaths];
  for (const path of paths) {
    const fullPath = path.startsWith("/") ? path : resolve(repoRoot, path);
    try {
      return readFileSync(fullPath, "utf8");
    } catch {}
  }
  failures.push(`Missing required file: ${paths.join(" or ")}`);
  return "";
}

function requireMarkers(label, content, markers) {
  for (const marker of markers) {
    if (!content.includes(marker)) failures.push(`${label} missing ${marker}`);
  }
}

console.log(`=== ${spec.npmScript} (${spec.id}) ===`);

const state = readRequired("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const requirements = readRequired("docs/twitter-intelligence/2026-06-13-requirements.md");
const integration = readRequired([
  "docs/twitter-intelligence/2026-06-13-integration.md",
  "/Users/clay/Desktop/Vanta Vault/02 Projects/Twitter-Pass-Integration-2026-06-13.md"
]);
const watchlists = readRequired([
  "docs/twitter-intelligence/2026-06-13-integration.md",
  "/Users/clay/.hermes/skills/supergrok-research/references/watchlists.md"
]);
const packageJson = JSON.parse(readRequired("package.json") || "{}");

requireMarkers("state.yaml", state, spec.stateMarkers);
requireMarkers("2026-06-13 requirements", requirements, spec.docMarkers);
requireMarkers("Twitter-Pass-Integration-2026-06-13", integration, spec.vaultMarkers);
requireMarkers("watchlists.md", watchlists, spec.watchlistMarkers);

if (packageJson.scripts?.[spec.npmScript] !== `node scripts/${spec.scriptFile}`) {
  failures.push(`package.json missing ${spec.npmScript} script`);
}
if (!packageJson.scripts?.["twitter-intelligence:check"]?.includes(`npm run ${spec.npmScript}`)) {
  failures.push(`twitter-intelligence:check missing ${spec.npmScript}`);
}

if (failures.length > 0) {
  console.error(`FAIL: ${spec.title} is not fully wired`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS: ${spec.title} is state/doc/vault/watchlist/package wired with fail-closed claim boundary`);

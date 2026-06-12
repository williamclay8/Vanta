#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const spec = {
  "id": "T11",
  "title": "Arcium Confidential AI Benchmark and C-SPL",
  "scriptFile": "check-arcium-confidential-ai-benchmark-and-c-spl.mjs",
  "npmScript": "twitter-pass-2026-06-12-arcium-confidential-ai-check",
  "watchPath": "/Users/clay/Desktop/Vanta Vault/02 Projects/Arcium-Watch-Item.md",
  "stateMarkers": [
    "id: T11",
    "Arcium Confidential AI Benchmark and C-SPL",
    "arcium_confidential_ai_benchmark_and_c_spl_details:",
    "C-SPL",
    "https://x.com/i/status/2065404370645340213"
  ],
  "docMarkers": [
    "T11 - Arcium Confidential AI Benchmark and C-SPL",
    ">1.1M confidential computations",
    "C-SPL",
    "confidential AI"
  ],
  "vaultMarkers": [
    "T11 - Arcium Confidential AI Benchmark and C-SPL",
    "C-SPL",
    "https://x.com/i/status/2065404370645340213"
  ],
  "watchMarkers": [
    "June 12 update",
    ">1.1M confidential computations",
    "Inpher",
    "C-SPL"
  ]
};
const failures = [];

function readRequired(path) {
  const fullPath = path.startsWith("/") ? path : resolve(repoRoot, path);
  try {
    return readFileSync(fullPath, "utf8");
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

console.log(`=== ${spec.npmScript} (${spec.id}) ===`);

const state = readRequired("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const requirements = readRequired("docs/twitter-intelligence/2026-06-12-requirements.md");
const integration = readRequired("/Users/clay/Desktop/Vanta Vault/02 Projects/Twitter-Pass-Integration-2026-06-12.md");
const watch = readRequired(spec.watchPath);
const packageJson = JSON.parse(readRequired("package.json") || "{}");

requireMarkers("state.yaml", state, spec.stateMarkers);
requireMarkers("2026-06-12 requirements", requirements, spec.docMarkers);
requireMarkers("Twitter-Pass-Integration-2026-06-12", integration, spec.vaultMarkers);
requireMarkers("watch item", watch, spec.watchMarkers);

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

console.log(`PASS: ${spec.title} is state/doc/vault/package wired with fail-closed claim boundary`);

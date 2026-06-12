#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const spec = {
  "id": "T15",
  "title": "TrustBoostAI Agent Privacy Layer",
  "scriptFile": "check-trustboostai-agent-privacy-layer.mjs",
  "npmScript": "twitter-pass-2026-06-12-trustboostai-agent-privacy-check",
  "watchPath": "/Users/clay/Desktop/Vanta Vault/02 Projects/TrustBoostAI-Agent-Privacy-Watch-Item.md",
  "stateMarkers": [
    "id: T15",
    "TrustBoostAI Agent Privacy Layer",
    "trustboostai_agent_privacy_layer_details:",
    "PII redaction before LLMs",
    "https://x.com/i/status/2065436902371541288"
  ],
  "docMarkers": [
    "T15 - TrustBoostAI Agent Privacy Layer",
    "PII redaction before LLMs",
    "on-chain verification",
    "Mastercard Agent Pay"
  ],
  "vaultMarkers": [
    "T15 - TrustBoostAI Agent Privacy Layer",
    "PII redaction before LLMs",
    "https://x.com/i/status/2065436902371541288"
  ],
  "watchMarkers": [
    "TrustBoostAI",
    "@TrustBoostAI",
    "PII redaction",
    "Mastercard Agent Pay"
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

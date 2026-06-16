#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const spec = {
  id: "T18",
  title: "Midnight Selective Disclosure for Agents and Compliance",
  scriptFile: "check-midnight-selective-disclosure-patterns.mjs",
  npmScript: "twitter-pass-2026-06-13-midnight-selective-disclosure-check",
  stateMarkers: [
    "id: T18",
    "Midnight Selective Disclosure for Agents and Compliance",
    "midnight_selective_disclosure_agent_compliance_details:",
    "rational/selective disclosure",
    "https://x.com/CardanoAftrDark/status/2065576650461659270",
  ],
  docMarkers: [
    "T18 - Midnight Selective Disclosure for Agents and Compliance",
    "private-by-default on-chain AI agent interactions",
    "user data and agent behavior disclosure scopes",
    "compliance-aware proof packets",
  ],
  vaultMarkers: [
    "T18 - Midnight Selective Disclosure for Agents and Compliance",
    "policy-scoped, time-bound disclosure packets",
    "private-by-default on-chain AI agent interactions",
  ],
  watchlistMarkers: ["@CardanoAftrDark", "Midnight", "selective disclosure"],
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
const requirements = readRequired("docs/twitter-intelligence/2026-06-13-requirements.md");
const integration = readRequired("/Users/clay/Desktop/Vanta Vault/02 Projects/Twitter-Pass-Integration-2026-06-13.md");
const watchlists = readRequired("/Users/clay/.hermes/skills/supergrok-research/references/watchlists.md");
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

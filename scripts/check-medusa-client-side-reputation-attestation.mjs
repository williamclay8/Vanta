#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const spec = {
  id: "T17",
  title: "Medusa Client-Side Reputation Attestation",
  scriptFile: "check-medusa-client-side-reputation-attestation.mjs",
  npmScript: "twitter-pass-2026-06-13-medusa-reputation-check",
  stateMarkers: [
    "id: T17",
    "Medusa Client-Side Reputation Attestation",
    "medusa_client_side_reputation_attestation_details:",
    "Generate proof -> Verify on-chain -> Keep wallet private",
    "https://x.com/ZkMedusa/status/2065551465771585854",
  ],
  docMarkers: [
    "T17 - Medusa Client-Side Reputation Attestation",
    "private eligibility gating",
    "wallet reputation without exposing full transaction history",
    "passport-style claim wallet pattern",
  ],
  vaultMarkers: [
    "T17 - Medusa Client-Side Reputation Attestation",
    "Medusa is the strongest new local-proving signal",
    "Generate proof -> Verify on-chain -> Keep wallet private",
  ],
  watchlistMarkers: ["@ZkMedusa", "Medusa", "client-side reputation ZK"],
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
